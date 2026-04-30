import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getCameraPreset, getNavigationFollowPaddingFallback } from '../cameraPresets';

test('getCameraPreset: symmetric horizontal padding; faster travel adds top look-ahead', () => {
  const low = getCameraPreset({
    mode: 'adaptive',
    speedMps: 8,
    nextManeuverDistanceMeters: 400,
    safeAreaTop: 0,
    safeAreaBottom: 0,
  });
  const high = getCameraPreset({
    mode: 'adaptive',
    speedMps: 35,
    nextManeuverDistanceMeters: 400,
    safeAreaTop: 0,
    safeAreaBottom: 0,
  });
  assert.equal(high.padding.paddingRight, high.padding.paddingLeft);
  assert.equal(low.padding.paddingRight, low.padding.paddingLeft);
  assert.ok(high.padding.paddingTop > low.padding.paddingTop);
});

test('getCameraPreset: maneuver approach increases top padding', () => {
  const cruise = getCameraPreset({
    mode: 'sport',
    speedMps: 15,
    nextManeuverDistanceMeters: 400,
    safeAreaTop: 0,
    safeAreaBottom: 0,
  });
  const near = getCameraPreset({
    mode: 'sport',
    speedMps: 15,
    nextManeuverDistanceMeters: 40,
    safeAreaTop: 0,
    safeAreaBottom: 0,
  });
  assert.ok(near.zoom >= cruise.zoom);
  assert.ok(near.padding.paddingBottom > cruise.padding.paddingBottom);
});

test('getCameraPreset: long roads pull back and show more road ahead', () => {
  const shortAdaptive = getCameraPreset({
    mode: 'adaptive',
    speedMps: 22,
    nextManeuverDistanceMeters: 140,
    safeAreaTop: 0,
    safeAreaBottom: 0,
  });
  const longAdaptive = getCameraPreset({
    mode: 'adaptive',
    speedMps: 22,
    nextManeuverDistanceMeters: 1200,
    safeAreaTop: 0,
    safeAreaBottom: 0,
  });
  assert.ok(longAdaptive.zoom < shortAdaptive.zoom);
  assert.ok(longAdaptive.pitch > shortAdaptive.pitch);
  assert.ok(longAdaptive.padding.paddingTop > shortAdaptive.padding.paddingTop);
  assert.ok(longAdaptive.padding.paddingBottom < shortAdaptive.padding.paddingBottom);
});

test('getCameraPreset: sport open-road framing is the most advanced follow camera', () => {
  const calm = getCameraPreset({
    mode: 'calm',
    speedMps: 31,
    nextManeuverDistanceMeters: 1400,
    safeAreaTop: 0,
    safeAreaBottom: 0,
  });
  const adaptive = getCameraPreset({
    mode: 'adaptive',
    speedMps: 31,
    nextManeuverDistanceMeters: 1400,
    safeAreaTop: 0,
    safeAreaBottom: 0,
  });
  const sport = getCameraPreset({
    mode: 'sport',
    speedMps: 31,
    nextManeuverDistanceMeters: 1400,
    safeAreaTop: 0,
    safeAreaBottom: 0,
  });
  assert.ok(sport.zoom < adaptive.zoom);
  assert.ok(adaptive.zoom < calm.zoom);
  assert.ok(sport.pitch >= 58);
  assert.ok(sport.pitch <= adaptive.pitch);
  assert.ok(sport.padding.paddingTop > adaptive.padding.paddingTop);
});

test('getCameraPreset: near turns lower the forward look-ahead and tighten framing', () => {
  const cruiseAdaptive = getCameraPreset({
    mode: 'adaptive',
    speedMps: 20,
    nextManeuverDistanceMeters: 900,
    safeAreaTop: 0,
    safeAreaBottom: 0,
  });
  const nearAdaptive = getCameraPreset({
    mode: 'adaptive',
    speedMps: 20,
    nextManeuverDistanceMeters: 35,
    safeAreaTop: 0,
    safeAreaBottom: 0,
  });
  assert.ok(nearAdaptive.zoom > cruiseAdaptive.zoom);
  assert.ok(nearAdaptive.padding.paddingBottom > cruiseAdaptive.padding.paddingBottom);
});

test('getNavigationFollowPaddingFallback matches getCameraPreset for initial nav frame', () => {
  const preset = getCameraPreset({
    mode: 'adaptive',
    speedMps: 0,
    nextManeuverDistanceMeters: 400,
    safeAreaTop: 47,
    safeAreaBottom: 34,
  });
  const fb = getNavigationFollowPaddingFallback('adaptive', 47, 34);
  assert.deepEqual(fb, preset.padding);
});
