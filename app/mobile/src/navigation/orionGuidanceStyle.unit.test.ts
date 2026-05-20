import assert from 'node:assert/strict';
import test from 'node:test';
import type { NavStep } from './navModel';
import { orionizeNavigationUtterance } from './orionGuidanceStyle';

const step: NavStep = {
  index: 4,
  segmentIndex: 0,
  kind: 'off_ramp_right',
  rawType: 'off ramp',
  rawModifier: 'right',
  bearingAfter: 90,
  displayInstruction: 'Take the exit on the right',
  secondaryInstruction: null,
  subInstruction: null,
  instruction: 'Take the exit on the right',
  streetName: null,
  destinationRoad: null,
  shields: [],
  signal: { kind: 'none', label: '' },
  lanes: [],
  roundaboutExitNumber: null,
  distanceMetersFromStart: 1000,
  distanceMeters: 400,
  distanceMetersToNext: 400,
  durationSeconds: 40,
  voiceAnnouncement: null,
  nextManeuverKind: null,
  nextManeuverStreet: null,
  nextManeuverDistanceMeters: null,
};

function withCompanionFlag<T>(companionOn: boolean, fn: () => T): T {
  const prevCompanion = process.env.EXPO_PUBLIC_ORION_COMPANION_V1;
  const prevBuddy = process.env.EXPO_PUBLIC_ORION_NAV_BUDDY;
  if (companionOn) {
    process.env.EXPO_PUBLIC_ORION_COMPANION_V1 = '1';
  } else {
    process.env.EXPO_PUBLIC_ORION_COMPANION_V1 = '0';
    process.env.EXPO_PUBLIC_ORION_NAV_BUDDY = '1';
  }
  try {
    return fn();
  } finally {
    if (prevCompanion === undefined) delete process.env.EXPO_PUBLIC_ORION_COMPANION_V1;
    else process.env.EXPO_PUBLIC_ORION_COMPANION_V1 = prevCompanion;
    if (prevBuddy === undefined) delete process.env.EXPO_PUBLIC_ORION_NAV_BUDDY;
    else process.env.EXPO_PUBLIC_ORION_NAV_BUDDY = prevBuddy;
  }
}

test('with companion on, turn cues stay instruction-only (no buddy tail)', () => {
  withCompanionFlag(true, () => {
    const phrase = 'In half a mile, take the exit on the right.';
    const out = orionizeNavigationUtterance(phrase, { bucket: 'preparatory', step, distanceMeters: 900 });
    assert.equal(out, phrase);

    const imminent = 'Take the exit on the right.';
    assert.equal(orionizeNavigationUtterance(imminent, { bucket: 'imminent', step, distanceMeters: 45 }), imminent);
  });
});

test('with companion off, adds buddy tail to preparatory guidance', () => {
  withCompanionFlag(false, () => {
    const phrase = 'In half a mile, take the exit on the right.';
    const out = orionizeNavigationUtterance(phrase, { bucket: 'preparatory', step, distanceMeters: 900 });
    assert.ok(out.length > phrase.length);
    assert.match(out, /take the exit on the right\.$/i);
  });
});

test('with companion off, imminent turn cues stay instruction-only', () => {
  withCompanionFlag(false, () => {
    const imminent = 'Take the exit on the right.';
    assert.equal(orionizeNavigationUtterance(imminent, { bucket: 'imminent', step, distanceMeters: 45 }), imminent);
  });
});

test('with companion off, advance turn cues include personality once', () => {
  withCompanionFlag(false, () => {
    const turnStep: NavStep = {
      ...step,
      kind: 'turn_right',
      rawType: 'turn',
      displayInstruction: 'Turn right',
      instruction: 'Turn right',
    };
    const out = orionizeNavigationUtterance('In 500 feet, turn right.', {
      bucket: 'advance',
      step: turnStep,
      distanceMeters: 150,
      drivingMode: 'sport',
      userName: 'Ryan Ahmed',
    });
    assert.ok(out.length > 'In 500 feet, turn right.'.length);
    assert.match(out, /In 500 feet, turn right\.$/);
    assert.doesNotMatch(out, /crash|police|idiot|stupid|damn|hell/i);
  });
});
