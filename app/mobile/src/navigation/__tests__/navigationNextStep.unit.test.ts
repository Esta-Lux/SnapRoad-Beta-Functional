import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickNextNavStepAlongRoute, isNavStepActionableForBanner } from '../navigationProgressCore';
import type { NavStep } from '../navModel';

function step(
  index: number,
  kind: NavStep['kind'],
  fromStart: number,
  len: number,
  extra?: Partial<NavStep>,
): NavStep {
  return {
    index,
    segmentIndex: 0,
    kind,
    rawType: '',
    rawModifier: '',
    bearingAfter: 0,
    displayInstruction: '',
    secondaryInstruction: null,
    subInstruction: null,
    instruction: '',
    streetName: null,
    destinationRoad: null,
    shields: [],
    signal: { kind: 'none', label: '' },
    lanes: [],
    roundaboutExitNumber: null,
    distanceMetersFromStart: fromStart,
    distanceMeters: len,
    distanceMetersToNext: len,
    durationSeconds: 0,
    voiceAnnouncement: null,
    nextManeuverKind: null,
    nextManeuverStreet: null,
    nextManeuverDistanceMeters: null,
    ...extra,
  };
}

test('pickNextNavStepAlongRoute: mid-segment uses current step, not the following one', () => {
  const steps: NavStep[] = [
    step(0, 'depart', 0, 100),
    step(1, 'turn_left', 100, 50),
    step(2, 'turn_right', 150, 80),
  ];
  const midFirstTurn = pickNextNavStepAlongRoute(steps, 120);
  assert.ok(midFirstTurn);
  assert.equal(midFirstTurn!.kind, 'turn_left');
  assert.equal(midFirstTurn!.index, 1);
});

test('pickNextNavStepAlongRoute: skips depart to first real maneuver', () => {
  const steps: NavStep[] = [
    step(0, 'depart', 0, 100),
    step(1, 'turn_right', 100, 40),
  ];
  const early = pickNextNavStepAlongRoute(steps, 20);
  assert.ok(early);
  assert.equal(early!.kind, 'turn_right');
  assert.equal(early!.index, 1);
});

test('isNavStepActionableForBanner: continue without lanes is skipped', () => {
  const s = step(0, 'continue', 0, 50);
  assert.equal(isNavStepActionableForBanner(s), false);
  const withLanes = {
    ...s,
    lanes: [{ indications: ['straight' as const], active: true, preferred: false }],
  };
  assert.equal(isNavStepActionableForBanner(withLanes), true);
});
