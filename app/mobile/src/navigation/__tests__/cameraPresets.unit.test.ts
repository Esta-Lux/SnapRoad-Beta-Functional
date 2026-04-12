import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getCameraPreset } from '../cameraPresets';

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
  assert.ok(near.padding.paddingTop > cruise.padding.paddingTop);
  assert.ok(near.zoom >= cruise.zoom);
});
