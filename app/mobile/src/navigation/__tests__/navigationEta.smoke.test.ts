import { test } from 'node:test';
import assert from 'node:assert/strict';
import { remainingDurationSecondsFromNavSteps } from '../navigationEta';
import type { NavStep } from '../navModel';

const steps: NavStep[] = [
  {
    index: 0,
    segmentIndex: 0,
    distanceMetersFromStart: 0,
    distanceMetersToNext: 1000,
    durationSeconds: 120,
    kind: 'straight',
    streetName: null,
    instruction: null,
  },
  {
    index: 1,
    segmentIndex: 1,
    distanceMetersFromStart: 1000,
    distanceMetersToNext: 500,
    durationSeconds: 180,
    kind: 'right',
    streetName: null,
    instruction: null,
  },
];

test('remainingDuration: at start equals sum of step durations', () => {
  const sec = remainingDurationSecondsFromNavSteps({
    snapCumulativeMetersAlongPolyline: 0,
    polylineTotalMeters: 1500,
    routeDistanceMetersApi: 1500,
    steps,
    routeDurationSecondsFallback: 400,
  });
  assert.equal(sec, 300);
});

test('remainingDuration: halfway through first step prorates', () => {
  const sec = remainingDurationSecondsFromNavSteps({
    snapCumulativeMetersAlongPolyline: 500,
    polylineTotalMeters: 1500,
    routeDistanceMetersApi: 1500,
    steps,
    routeDurationSecondsFallback: 400,
  });
  assert.equal(sec, 240);
});

test('remainingDuration: no step durations falls back to proportional', () => {
  const bare: NavStep[] = steps.map((s) => ({ ...s, durationSeconds: 0 }));
  const sec = remainingDurationSecondsFromNavSteps({
    snapCumulativeMetersAlongPolyline: 750,
    polylineTotalMeters: 1500,
    routeDistanceMetersApi: 1500,
    steps: bare,
    routeDurationSecondsFallback: 300,
  });
  assert.equal(sec, 150);
});
