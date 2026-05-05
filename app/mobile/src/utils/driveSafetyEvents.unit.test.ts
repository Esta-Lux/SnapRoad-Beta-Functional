import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  emptyDriveSafetyState,
  processDriveSafetySample,
  speedLimitMpsToMph,
} from './driveSafetyEvents';

test('processDriveSafetySample counts one hard brake with cooldown', () => {
  let state = emptyDriveSafetyState();
  state = processDriveSafetySample(state, {
    atMs: 1000,
    speedMph: 45,
    gpsAccuracyM: 10,
    isNavigating: true,
  });
  state = processDriveSafetySample(state, {
    atMs: 3000,
    speedMph: 20,
    gpsAccuracyM: 10,
    isNavigating: true,
  });
  assert.equal(state.hardBrakingEvents, 1);
  state = processDriveSafetySample(state, {
    atMs: 5000,
    speedMph: 0,
    gpsAccuracyM: 10,
    isNavigating: true,
  });
  assert.equal(state.hardBrakingEvents, 1);
});

test('processDriveSafetySample counts sustained speeding episode', () => {
  let state = emptyDriveSafetyState();
  for (const atMs of [0, 5000, 10000, 11000]) {
    state = processDriveSafetySample(state, {
      atMs,
      speedMph: 70,
      speedLimitMph: 55,
      gpsAccuracyM: 8,
      isNavigating: true,
    });
  }
  assert.equal(state.speedingEvents, 1);
});

test('processDriveSafetySample ignores poor accuracy spikes', () => {
  let state = emptyDriveSafetyState();
  state = processDriveSafetySample(state, {
    atMs: 1000,
    speedMph: 50,
    gpsAccuracyM: 10,
    isNavigating: true,
  });
  state = processDriveSafetySample(state, {
    atMs: 2000,
    speedMph: 0,
    gpsAccuracyM: 120,
    isNavigating: true,
  });
  assert.equal(state.hardBrakingEvents, 0);
});

test('speedLimitMpsToMph converts and filters invalid values', () => {
  assert.equal(Math.round(speedLimitMpsToMph(24.5872) ?? 0), 55);
  assert.equal(speedLimitMpsToMph(0), null);
  assert.equal(speedLimitMpsToMph(null), null);
});
