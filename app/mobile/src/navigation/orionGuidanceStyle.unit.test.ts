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

test('keeps imminent guidance direct and unchanged', () => {
  const phrase = 'Take the exit on the right.';
  assert.equal(orionizeNavigationUtterance(phrase, { bucket: 'imminent', step, distanceMeters: 45 }), phrase);
});

test('adds a short Orion buddy tail to preparatory ramp guidance', () => {
  const phrase = 'In half a mile, take the exit on the right.';
  const out = orionizeNavigationUtterance(phrase, { bucket: 'preparatory', step, distanceMeters: 900 });
  assert.match(out, /^In half a mile, take the exit on the right\. /);
  assert.ok(out.length < 120);
});
