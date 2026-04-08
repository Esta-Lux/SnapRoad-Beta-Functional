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
    durationSeconds: 300,
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
    durationSeconds: 300,
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
    routeDistanceMeters: 222,
    offRouteTuning: OFF_ROUTE_CONSERVATIVE,
    previous: null,
  });
  assert.ok(a);
  assert.equal(a.isOffRoute, false);
  assert.ok(typeof a.modelDurationRemainingSeconds === 'number');
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
    routeDistanceMeters: 222,
    offRouteTuning: OFF_ROUTE_AGGRESSIVE,
    previous: null,
  });
  assert.ok(a);
  assert.equal(a.isOffRoute, true);
});

test('computeNavigationProgressFrame: tryGlobalReanchor corrects snap when local window misses true corridor', () => {
  const routePts: Coordinate[] = [];
  for (let i = 0; i < 120; i++) {
    routePts.push({ lat: 40 + i * 0.0001, lng: -83.0 });
  }
  const navSteps = buildNavStepsFromDirections(
    [
      {
        instruction: 'Drive',
        distance: '5 mi',
        distanceMeters: 9000,
        duration: '10 min',
        durationSeconds: 600,
        maneuver: 'straight',
        name: 'Road',
        lat: routePts[0]!.lat,
        lng: routePts[0]!.lng,
      },
    ],
    routePts,
  );
  const route = routePts.map((p) => ({ lat: p.lat, lng: p.lng }));
  const fakePrevious = computeNavigationProgressFrame({
    rawLocation: {
      lat: route[15]!.lat,
      lng: route[15]!.lng,
      speedMps: 8,
      accuracy: 10,
      timestamp: Date.now(),
    },
    route,
    steps: navSteps,
    routeDurationSeconds: 600,
    routeDistanceMeters: 9000,
    offRouteTuning: OFF_ROUTE_CONSERVATIVE,
    previous: null,
  });
  assert.ok(fakePrevious?.snapped);
  const stuckPrevious = computeNavigationProgressFrame({
    rawLocation: {
      lat: route[15]!.lat,
      lng: route[15]!.lng,
      speedMps: 8,
      accuracy: 10,
      timestamp: Date.now(),
    },
    route,
    steps: navSteps,
    routeDurationSeconds: 600,
    routeDistanceMeters: 9000,
    offRouteTuning: OFF_ROUTE_CONSERVATIVE,
    previous: fakePrevious,
  });
  assert.ok(stuckPrevious?.snapped);
  const jumped = {
    lat: 40 + 95 * 0.0001,
    lng: -83.0,
    speedMps: 8,
    accuracy: 10,
    timestamp: Date.now() + 1,
  };
  const localOnly = computeNavigationProgressFrame({
    rawLocation: jumped,
    route,
    steps: navSteps,
    routeDurationSeconds: 600,
    routeDistanceMeters: 9000,
    offRouteTuning: OFF_ROUTE_CONSERVATIVE,
    previous: stuckPrevious,
    tryGlobalReanchor: false,
  });
  const withGlobal = computeNavigationProgressFrame({
    rawLocation: jumped,
    route,
    steps: navSteps,
    routeDurationSeconds: 600,
    routeDistanceMeters: 9000,
    offRouteTuning: OFF_ROUTE_CONSERVATIVE,
    previous: stuckPrevious,
    tryGlobalReanchor: true,
  });
  assert.ok(localOnly?.snapped && withGlobal?.snapped);
  assert.ok(withGlobal!.snapped.segmentIndex > localOnly!.snapped.segmentIndex + 5);
});
