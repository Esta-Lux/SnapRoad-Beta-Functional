import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { DirectionsStep } from '../lib/directions';
import { buildNavigationProgressFromSdk } from './navSdkProgressAdapter';

function baseStep(overrides: Partial<DirectionsStep> & Pick<DirectionsStep, 'instruction'>): DirectionsStep {
  return {
    instruction: overrides.instruction,
    distance: '',
    distanceMeters: overrides.distanceMeters ?? 100,
    duration: '',
    durationSeconds: overrides.durationSeconds ?? 20,
    maneuver: overrides.maneuver ?? 'straight',
    lat: overrides.lat ?? 37.77,
    lng: overrides.lng ?? -122.42,
    name: overrides.name,
    mapboxManeuver: overrides.mapboxManeuver,
    bannerInstructions: overrides.bannerInstructions,
  };
}

const poly: Array<{ lat: number; lng: number }> = [
  { lat: 37.77, lng: -122.42 },
  { lat: 37.771, lng: -122.419 },
  { lat: 37.772, lng: -122.418 },
];

test('buildNavigationProgressFromSdk sets followingStep from Directions when stepIndex + 1 exists', () => {
  const steps: DirectionsStep[] = [
    baseStep({
      instruction: 'Head north on Mission St',
      name: 'Mission St',
      mapboxManeuver: { type: 'depart', modifier: '' },
      distanceMeters: 200,
    }),
    baseStep({
      instruction: 'Turn left onto Valencia St',
      name: 'Valencia St',
      lat: 37.771,
      lng: -122.419,
      mapboxManeuver: { type: 'turn', modifier: 'left' },
      distanceMeters: 80,
    }),
  ];
  const prog = buildNavigationProgressFromSdk({
    progress: {
      distanceRemaining: 5000,
      distanceTraveled: 10,
      durationRemaining: 600,
      fractionTraveled: 0.01,
      stepIndex: 0,
      primaryInstruction: 'Continue on Mission St',
      maneuverType: 'continue',
      maneuverDirection: 'straight',
      distanceToNextManeuverMeters: 150,
    },
    location: null,
    polyline: poly,
    steps,
  });
  assert.ok(prog);
  assert.ok(prog.followingStep);
  assert.equal(prog.followingStep.index, 1);
  assert.equal(prog.followingStep.kind, 'turn_left');
  assert.equal(prog.followingStep.streetName, 'Valencia St');
  assert.equal(prog.nextStep?.nextManeuverKind, 'turn_left');
  assert.equal(prog.nextStep?.nextManeuverStreet, 'Valencia St');
  assert.equal(prog.nextStep?.nextManeuverDistanceMeters, 150);
});

test('buildNavigationProgressFromSdk leaves followingStep null on last step', () => {
  const steps: DirectionsStep[] = [
    baseStep({
      instruction: 'Arrive at destination',
      mapboxManeuver: { type: 'arrive', modifier: '' },
      distanceMeters: 10,
    }),
  ];
  const prog = buildNavigationProgressFromSdk({
    progress: {
      distanceRemaining: 10,
      distanceTraveled: 9000,
      durationRemaining: 0,
      fractionTraveled: 0.99,
      stepIndex: 0,
      primaryInstruction: 'Arrive at destination',
      maneuverType: 'arrive',
      maneuverDirection: '',
      distanceToNextManeuverMeters: 0,
    },
    location: null,
    polyline: poly,
    steps,
  });
  assert.ok(prog);
  assert.equal(prog.followingStep, null);
});
