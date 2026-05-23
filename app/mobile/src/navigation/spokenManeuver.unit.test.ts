import assert from 'node:assert/strict';
import test from 'node:test';
import { hudPhraseForStep } from './spokenManeuver';
import type { NavStep } from './navModel';

function step(overrides: Partial<NavStep>): NavStep {
  return {
    index: 0,
    segmentIndex: 0,
    kind: 'fork_right',
    rawType: 'fork',
    rawModifier: 'right',
    bearingAfter: 0,
    displayInstruction: '',
    secondaryInstruction: null,
    subInstruction: null,
    instruction: '',
    streetName: 'Roberts Road',
    destinationRoad: null,
    exitNumber: null,
    shields: [],
    signal: { kind: 'none', label: '' },
    lanes: [],
    roundaboutExitNumber: null,
    distanceMetersFromStart: 0,
    distanceMeters: 0,
    distanceMetersToNext: 0,
    durationSeconds: 0,
    voiceAnnouncement: null,
    nextManeuverKind: null,
    nextManeuverStreet: null,
    nextManeuverDistanceMeters: null,
    ...overrides,
  };
}

test('hudPhraseForStep downgrades fork/ramp wording on normal streets', () => {
  assert.equal(hudPhraseForStep(step({ kind: 'fork_right', rawType: 'fork' })), 'Turn right');
  assert.equal(hudPhraseForStep(step({ kind: 'off_ramp_left', rawType: 'off ramp' })), 'Turn left');
  assert.equal(hudPhraseForStep(step({ kind: 'slight_right', rawType: 'turn' })), 'Turn right');
});

test('hudPhraseForStep keeps highway wording for true exits and shields', () => {
  assert.equal(
    hudPhraseForStep(step({
      kind: 'fork_right',
      rawType: 'fork',
      exitNumber: '55B',
      shields: [{ network: 'us-interstate', ref: '71', displayRef: '71' }],
      streetName: 'I-71',
    })),
    'Keep right at the fork',
  );
  assert.equal(
    hudPhraseForStep(step({
      kind: 'off_ramp_right',
      rawType: 'off ramp',
      exitNumber: '93',
      shields: [{ network: 'us-interstate', ref: '270', displayRef: '270' }],
      streetName: 'I-270',
    })),
    'Take the exit on the right',
  );
});
