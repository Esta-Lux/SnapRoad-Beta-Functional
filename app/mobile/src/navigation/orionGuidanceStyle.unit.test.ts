import assert from 'node:assert/strict';
import test from 'node:test';
import type { NavStep } from './navModel';
import { getOrionCompanionMemory, resetOrionTripSession } from '../orion/companion/orionCompanionShared';
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

test('keeps imminent guidance directional with short Orion character', () => {
  const phrase = 'Take the exit on the right.';
  const out = orionizeNavigationUtterance(phrase, { bucket: 'imminent', step, distanceMeters: 45 });
  assert.match(out, /^Take the exit on the right\. /);
  assert.ok(out.length < 120);
});

test('adds a short Orion buddy tail to preparatory ramp guidance', () => {
  const phrase = 'In half a mile, take the exit on the right.';
  const out = orionizeNavigationUtterance(phrase, { bucket: 'preparatory', step, distanceMeters: 900 });
  assert.match(out, /^In half a mile, take the exit on the right\. /);
  assert.ok(out.length < 120);
});

test('adds clean personalized flavor to advance turn cues only', () => {
  const turnStep: NavStep = { ...step, kind: 'turn_right', rawType: 'turn', displayInstruction: 'Turn right', instruction: 'Turn right' };
  const out = orionizeNavigationUtterance('In 500 feet, turn right.', {
    bucket: 'advance',
    step: turnStep,
    distanceMeters: 150,
    drivingMode: 'sport',
    userName: 'Ryan Ahmed',
  });

  assert.match(out, /^In 500 feet, turn right\. /);
  assert.ok(out.length < 150);
  assert.doesNotMatch(out, /crash|police|idiot|stupid|damn|hell/i);
});

test('skips buddy tail when companion spoke recently', () => {
  const prev = process.env.EXPO_PUBLIC_ORION_COMPANION_V1;
  process.env.EXPO_PUBLIC_ORION_COMPANION_V1 = '1';
  resetOrionTripSession();
  const memory = getOrionCompanionMemory();
  memory.clear();
  memory.recordSpoken(
    {
      shouldSpeak: true,
      message: 'Trip on. About 12 min if traffic behaves.',
      category: 'trip',
      mood: 'focused',
      priority: 'normal',
      eventType: 'drive_started',
    },
    Date.now(),
  );

  const turnStep: NavStep = {
    ...step,
    kind: 'turn_right',
    rawType: 'turn',
    displayInstruction: 'Turn right',
    instruction: 'Turn right',
  };
  const phrase = 'In 500 feet, turn right.';
  const out = orionizeNavigationUtterance(phrase, {
    bucket: 'advance',
    step: turnStep,
    distanceMeters: 150,
    drivingMode: 'adaptive',
  });

  assert.equal(out, phrase);
  if (prev === undefined) delete process.env.EXPO_PUBLIC_ORION_COMPANION_V1;
  else process.env.EXPO_PUBLIC_ORION_COMPANION_V1 = prev;
});
