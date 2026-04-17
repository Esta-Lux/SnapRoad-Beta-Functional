import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { DirectionsStep } from '../lib/directions';
import { directionsStepFromSdkProgress } from './navSdkUiAdapter';
import { resolveManeuverFieldsForTurnCard } from './turnCardModel';
import type { NavBannerModel, NavStep } from './navModel';

const banner: NavBannerModel = {
  primaryInstruction: 'Turn right onto Oak Ave',
  primaryDistanceMeters: 120,
  primaryStreet: 'Oak Ave',
  secondaryInstruction: null,
};

function navStep(partial: Partial<NavStep> & Pick<NavStep, 'index' | 'kind'>): NavStep {
  return {
    index: partial.index,
    segmentIndex: partial.segmentIndex ?? 0,
    kind: partial.kind,
    rawType: partial.rawType ?? 'turn',
    rawModifier: partial.rawModifier ?? 'right',
    bearingAfter: partial.bearingAfter ?? 0,
    displayInstruction: partial.displayInstruction ?? 'Turn right',
    secondaryInstruction: partial.secondaryInstruction ?? null,
    subInstruction: partial.subInstruction ?? null,
    instruction: partial.instruction ?? 'Turn right',
    streetName: partial.streetName ?? 'Oak Ave',
    destinationRoad: partial.destinationRoad ?? null,
    shields: partial.shields ?? [],
    signal: partial.signal ?? { kind: 'none', label: '' },
    lanes: partial.lanes ?? [],
    roundaboutExitNumber: partial.roundaboutExitNumber ?? null,
    distanceMetersFromStart: partial.distanceMetersFromStart ?? 0,
    distanceMeters: partial.distanceMeters ?? 200,
    distanceMetersToNext: partial.distanceMetersToNext ?? 120,
    durationSeconds: partial.durationSeconds ?? 30,
    voiceAnnouncement: partial.voiceAnnouncement ?? null,
    nextManeuverKind: partial.nextManeuverKind ?? null,
    nextManeuverStreet: partial.nextManeuverStreet ?? null,
    nextManeuverDistanceMeters: partial.nextManeuverDistanceMeters ?? null,
  };
}

test('directionsStepFromSdkProgress uses route maneuver anchor and mapboxManeuver', () => {
  const next = navStep({ index: 2, kind: 'turn_right', distanceMetersToNext: 88 });
  const routeStep: DirectionsStep = {
    instruction: 'Turn right onto Oak Ave',
    distance: '',
    distanceMeters: 200,
    duration: '',
    durationSeconds: 30,
    maneuver: 'turn',
    name: 'Oak Ave',
    lat: 40.758,
    lng: -73.9855,
    mapboxManeuver: { type: 'turn', modifier: 'right' },
  };
  const at = { lat: 40.757, lng: -73.9865 };
  const ds = directionsStepFromSdkProgress({ nextStep: next, banner, at, routeStep });
  assert.ok(ds);
  assert.equal(ds.lat, 40.758);
  assert.equal(ds.lng, -73.9855);
  assert.equal(ds.mapboxManeuver?.type, 'turn');
  assert.equal(ds.mapboxManeuver?.modifier, 'right');
  assert.equal(ds.distanceMeters, 88);
});

test('directionsStepFromSdkProgress falls back to puck when no route step', () => {
  const next = navStep({ index: 0, kind: 'continue', distanceMetersToNext: 400 });
  const at = { lat: 40.7, lng: -73.9 };
  const ds = directionsStepFromSdkProgress({ nextStep: next, banner, at });
  assert.ok(ds);
  assert.equal(ds.lat, at.lat);
  assert.equal(ds.lng, at.lng);
});

test('resolveManeuverFieldsForTurnCard prefers synthetic maneuver string over stale progNext', () => {
  const synthetic = directionsStepFromSdkProgress({
    nextStep: navStep({ index: 1, kind: 'turn_left', rawType: 'continue', rawModifier: 'straight', distanceMetersToNext: 50 }),
    banner,
    at: { lat: 40, lng: -74 },
  });
  assert.ok(synthetic);
  const staleProg = navStep({
    index: 0,
    kind: 'straight',
    rawType: 'continue',
    rawModifier: 'straight',
    distanceMetersToNext: 0,
  });
  const fields = resolveManeuverFieldsForTurnCard({
    nextManeuverCoord: synthetic,
    progNext: staleProg,
  });
  assert.equal(fields.kind, 'turn_left');
  assert.equal(fields.rawType, 'turn');
  assert.equal(fields.rawModifier, 'left');
});

test('directionsStepFromSdkProgress does not let stale route step override SDK maneuver', () => {
  const next = navStep({
    index: 3,
    kind: 'turn_left',
    rawType: 'turn',
    rawModifier: 'left',
    displayInstruction: 'Turn left onto Pine St',
    streetName: 'Pine St',
    distanceMetersToNext: 42,
  });
  const staleRouteStep: DirectionsStep = {
    instruction: 'Turn right onto Oak Ave',
    distance: '',
    distanceMeters: 100,
    duration: '',
    durationSeconds: 20,
    maneuver: 'turn',
    name: 'Oak Ave',
    lat: 40.758,
    lng: -73.9855,
    mapboxManeuver: { type: 'turn', modifier: 'right' },
  };
  const ds = directionsStepFromSdkProgress({
    nextStep: next,
    banner: {
      ...banner,
      primaryInstruction: 'Turn left onto Pine St',
      primaryStreet: 'Pine St',
    },
    at: { lat: 40.7, lng: -73.9 },
    routeStep: staleRouteStep,
  });
  assert.ok(ds);
  assert.equal(ds.mapboxManeuver?.type, 'turn');
  assert.equal(ds.mapboxManeuver?.modifier, 'left');
  assert.equal(ds.lat, 40.7);
  assert.equal(ds.lng, -73.9);
});
