import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  type SdkNavProgressEvent,
  nativeFormattedDistanceFromProgressPayload,
  nativeMirrorFormattedDistanceOrNull,
  sdkManeuverDisplayDistanceFromProgress,
} from './sdkNavBridgePayload';

test('nativeFormatted: formattedDistance + unit wins over primaryDistanceFormatted', () => {
  const r = nativeFormattedDistanceFromProgressPayload({
    formattedDistance: '500',
    formattedDistanceUnit: 'ft',
    primaryDistanceFormatted: '0.1 mi',
  });
  assert.deepEqual(r, { value: '500', unit: 'ft' });
});

test('nativeFormatted: uses primaryDistanceFormatted when split fields absent', () => {
  const r = nativeFormattedDistanceFromProgressPayload({
    primaryDistanceFormatted: '0.2 mi',
  });
  assert.deepEqual(r, { value: '0.2 mi', unit: '' });
});

test('nativeFormatted: trims value; empty/missing returns null', () => {
  assert.deepEqual(
    nativeFormattedDistanceFromProgressPayload({ formattedDistance: '  500  ', formattedDistanceUnit: ' ft ' }),
    { value: '500', unit: 'ft' },
  );
  assert.equal(nativeFormattedDistanceFromProgressPayload({}), null);
  assert.equal(
    nativeFormattedDistanceFromProgressPayload({ primaryDistanceFormatted: '   ' }),
    null,
  );
  assert.equal(nativeFormattedDistanceFromProgressPayload({ formattedDistance: '   ' }), null);
});

test('nativeFormatted: primary with empty string formattedDistance falls through to primary', () => {
  const r = nativeFormattedDistanceFromProgressPayload({
    formattedDistance: '',
    primaryDistanceFormatted: '1/4 mi',
  });
  assert.deepEqual(r, { value: '1/4 mi', unit: '' });
});

test('nativeMirror: drops formatted when distanceToNextManeuverMeters missing (iOS mirror bug)', () => {
  const r = nativeMirrorFormattedDistanceOrNull({
    primaryDistanceFormatted: '5.0 mi',
    distanceToNextManeuverMeters: undefined,
  } as { primaryDistanceFormatted: string; distanceToNextManeuverMeters?: number });
  assert.equal(r, null);
});

test('nativeMirror: keeps formatted when numeric distance is present', () => {
  const r = nativeMirrorFormattedDistanceOrNull({
    primaryDistanceFormatted: '800 ft',
    distanceToNextManeuverMeters: 240,
  });
  assert.deepEqual(r, { value: '800 ft', unit: '' });
});

test('sdkManeuverDisplay: always formats from meters (US), ignores native locale strings', () => {
  const r = sdkManeuverDisplayDistanceFromProgress({
    distanceToNextManeuverMeters: 400,
    formattedDistance: '0,25',
    formattedDistanceUnit: 'MI',
    primaryDistanceFormatted: '000,25 miles',
  } as SdkNavProgressEvent);
  assert.deepEqual(r, { value: '0.2', unit: 'MI' });
});

test('sdkManeuverDisplay: feet for short leg', () => {
  const r = sdkManeuverDisplayDistanceFromProgress({ distanceToNextManeuverMeters: 75 });
  assert.deepEqual(r, { value: '245', unit: 'FT' });
});

test('sdkManeuverDisplay: null when distance missing', () => {
  assert.equal(sdkManeuverDisplayDistanceFromProgress({}), null);
});
