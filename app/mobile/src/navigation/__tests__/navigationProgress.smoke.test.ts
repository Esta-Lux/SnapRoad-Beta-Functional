import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeNavigationProgressFrame } from '../navigationProgressCore';
import { OFF_ROUTE_AGGRESSIVE, OFF_ROUTE_CONSERVATIVE } from '../offRouteTuning';
import { buildNavStepsFromDirections } from '../navStepsFromDirections';
import type { DirectionsStep } from '../../lib/directions';
import type { Coordinate } from '../../types';

const poly: Coordinate[] = [
  { lat: 40.0, lng: -83.0 },
  { lat: 40.001, lng: -83.0 },
  { lat: 40.002, lng: -83.0 },
  { lat: 40.003, lng: -83.0 },
];

const steps: DirectionsStep[] = [
  {
    instruction: 'Head north',
    distance: '0.1 mi',
    distanceMeters: 111,
    duration: '1 min',
    maneuver: 'straight',
    name: 'Main St',
    lat: 40.0,
    lng: -83.0,
  },
  {
    instruction: 'Turn right',
    distance: '0.1 mi',
    distanceMeters: 111,
    duration: '1 min',
    maneuver: 'right',
    name: 'Oak',
    lat: 40.003,
    lng: -83.0,
  },
];

test('computeNavigationProgressFrame: on route yields banner and sane next-step distance', () => {
  const navSteps = buildNavStepsFromDirections(steps, poly);
  const route = poly.map((p) => ({ lat: p.lat, lng: p.lng }));
  const raw = {
    lat: 40.0005,
    lng: -83.0,
    heading: 0,
    speedMps: 5,
    accuracy: 10,
    timestamp: Date.now(),
  };
  const a = computeNavigationProgressFrame({
    rawLocation: raw,
    route,
    steps: navSteps,
    routeDurationSeconds: 600,
    offRouteTuning: OFF_ROUTE_CONSERVATIVE,
    previous: null,
  });
  assert.ok(a);
  assert.equal(a.isOffRoute, false);
  assert.ok(a.nextStepDistanceMeters >= 0);
  assert.ok(a.banner?.primaryInstruction);
});

test('computeNavigationProgressFrame: far from polyline flags off-route under aggressive tuning', () => {
  const navSteps = buildNavStepsFromDirections(steps, poly);
  const route = poly.map((p) => ({ lat: p.lat, lng: p.lng }));
  const raw = {
    lat: 40.5,
    lng: -83.0,
    heading: 0,
    speedMps: 10,
    accuracy: 15,
    timestamp: Date.now(),
  };
  const a = computeNavigationProgressFrame({
    rawLocation: raw,
    route,
    steps: navSteps,
    routeDurationSeconds: 600,
    offRouteTuning: OFF_ROUTE_AGGRESSIVE,
    previous: null,
  });
  assert.ok(a);
  assert.equal(a.isOffRoute, true);
});
