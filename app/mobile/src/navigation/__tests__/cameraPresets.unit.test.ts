import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getCameraPreset } from '../cameraPresets';

test('getCameraPreset: faster travel adds right padding nudge (RHD forward view)', () => {
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
  assert.ok(high.padding.paddingRight > low.padding.paddingRight);
  assert.equal(low.padding.paddingLeft, high.padding.paddingLeft);
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
