/**
 * Per-surface single-authority predicates for the hybrid Mapbox Navigation SDK.
 *
 * These protect the architecture rule in `docs/NATIVE_NAVIGATION.md#single-authority-matrix`:
 *   - Puck, route polyline, and turn banner each have their own `is*Authoritative` guard
 *     so the map never shows a half-native / half-JS frame during the first ~150 ms of a
 *     trip (before the matching native payload lands).
 *   - Each guard returns false when the logic SDK flag is off (JS-only trips).
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import Module from 'node:module';

process.env.EXPO_PUBLIC_NAV_LOGIC_SDK = '1';

// `navFeatureFlags` transitively imports `expo-constants`, which pulls in `react-native`.
// Stub both the same way `navSingleAuthority.unit.test.ts` does so node:test can load
// the module under tsx without esbuild tripping on Flow-typed RN sources.
const moduleStubs: Record<string, unknown> = {
  'expo-constants': {
    default: {
      expoConfig: { extra: { EXPO_PUBLIC_NAV_LOGIC_SDK: '1' } },
      executionEnvironment: 'standalone',
    },
  },
  'react-native': {
    Platform: { OS: 'ios', select: (o: Record<string, unknown>) => o.ios ?? o.default },
  },
};
const modProto = Module as unknown as {
  _load: (req: string, parent: unknown, isMain: boolean) => unknown;
};
const origLoad = modProto._load;
modProto._load = function patched(request: string, parent: unknown, isMain: boolean) {
  if (Object.prototype.hasOwnProperty.call(moduleStubs, request)) {
    return moduleStubs[request];
  }
  return origLoad.call(this, request, parent, isMain);
};

// eslint-disable-next-line @typescript-eslint/no-var-requires
const store = require('./navSdkStore') as typeof import('./navSdkStore');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const authority = require('./navSdkAuthority') as typeof import('./navSdkAuthority');

const {
  resetNavSdkState,
  ingestSdkProgress,
  ingestSdkLocation,
  ingestSdkRoutePolyline,
} = store;
const {
  isSdkTripAuthoritative,
  isSdkPuckAuthoritative,
  isSdkRouteAuthoritative,
  isSdkBannerAuthoritative,
} = authority;

function ingestBaseProgress(extra: Partial<Parameters<typeof ingestSdkProgress>[0]> = {}) {
  ingestSdkProgress({
    distanceRemaining: 1000,
    distanceTraveled: 0,
    durationRemaining: 60,
    fractionTraveled: 0,
    ...extra,
  });
}

test('trip is not authoritative before first progress tick', () => {
  resetNavSdkState();
  assert.equal(isSdkTripAuthoritative(), false);
  assert.equal(isSdkPuckAuthoritative(), false);
  assert.equal(isSdkRouteAuthoritative(), false);
  assert.equal(isSdkBannerAuthoritative(), false);
});

test('first progress tick makes trip authoritative but not puck/route/banner yet', () => {
  resetNavSdkState();
  ingestBaseProgress();
  assert.equal(isSdkTripAuthoritative(), true, 'trip is active on first progress');
  assert.equal(isSdkPuckAuthoritative(), false, 'puck waits for matched location');
  assert.equal(isSdkRouteAuthoritative(), false, 'route waits for ingested polyline');
  assert.equal(isSdkBannerAuthoritative(), false, 'banner waits for native text');
});

test('matched location flips only the puck authority bit', () => {
  resetNavSdkState();
  ingestBaseProgress();
  ingestSdkLocation({
    latitude: 37.77,
    longitude: -122.42,
    course: 90,
    speed: 12,
    horizontalAccuracy: 5,
    timestamp: Date.now(),
  });
  assert.equal(isSdkPuckAuthoritative(), true, 'puck authority follows matched location');
  assert.equal(isSdkRouteAuthoritative(), false, 'route still waiting for polyline');
  assert.equal(isSdkBannerAuthoritative(), false, 'banner still waiting for native text');
});

test('ingested polyline (>= 2 points) flips only the route authority bit', () => {
  resetNavSdkState();
  ingestBaseProgress();
  ingestSdkRoutePolyline([
    { lat: 37.77, lng: -122.42 },
    { lat: 37.78, lng: -122.41 },
  ]);
  assert.equal(isSdkRouteAuthoritative(), true, 'route authority follows polyline');
  assert.equal(isSdkPuckAuthoritative(), false, 'puck still waiting for matched location');
});

test('ingested polyline with < 2 points does NOT flip route authority', () => {
  resetNavSdkState();
  ingestBaseProgress();
  ingestSdkRoutePolyline([{ lat: 37.77, lng: -122.42 }]);
  assert.equal(
    isSdkRouteAuthoritative(),
    false,
    'a one-point polyline cannot render a route line',
  );
});

test('banner authority flips when progress carries primaryInstruction', () => {
  resetNavSdkState();
  ingestBaseProgress({ primaryInstruction: 'Turn right onto Main St' });
  assert.equal(isSdkBannerAuthoritative(), true);
});

test('banner authority flips when progress carries currentStepInstruction (Android fallback)', () => {
  resetNavSdkState();
  ingestBaseProgress({ currentStepInstruction: 'Continue on Oak Ave' });
  assert.equal(isSdkBannerAuthoritative(), true);
});

test('banner authority does NOT flip on whitespace-only text', () => {
  resetNavSdkState();
  ingestBaseProgress({ primaryInstruction: '   ' });
  assert.equal(isSdkBannerAuthoritative(), false);
});

test('all predicates return false when logic SDK flag is off', () => {
  resetNavSdkState();
  ingestBaseProgress({ primaryInstruction: 'Turn left' });
  ingestSdkLocation({
    latitude: 37.77,
    longitude: -122.42,
    course: 0,
    speed: 0,
    horizontalAccuracy: 5,
    timestamp: Date.now(),
  });
  ingestSdkRoutePolyline([
    { lat: 37.77, lng: -122.42 },
    { lat: 37.78, lng: -122.41 },
  ]);
  // Flip the flag off and re-require the modules (envBool is pure) so the
  // predicates re-read the env value.
  process.env.EXPO_PUBLIC_NAV_LOGIC_SDK = '0';
  delete require.cache[require.resolve('./navFeatureFlags')];
  delete require.cache[require.resolve('./navSdkAuthority')];
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fresh = require('./navSdkAuthority') as typeof import('./navSdkAuthority');
  try {
    assert.equal(fresh.isSdkTripAuthoritative(), false);
    assert.equal(fresh.isSdkPuckAuthoritative(), false);
    assert.equal(fresh.isSdkRouteAuthoritative(), false);
    assert.equal(fresh.isSdkBannerAuthoritative(), false);
  } finally {
    process.env.EXPO_PUBLIC_NAV_LOGIC_SDK = '1';
    delete require.cache[require.resolve('./navFeatureFlags')];
    delete require.cache[require.resolve('./navSdkAuthority')];
  }
});
