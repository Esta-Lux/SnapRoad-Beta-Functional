import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  composeOrionTurnCue,
  imminentInstructionFromKind,
  orionNavBuddyEnabled,
} from './orionNavScript';

function withBuddyEnv(buddyOn: boolean, fn: () => void) {
  const prevBuddy = process.env.EXPO_PUBLIC_ORION_NAV_BUDDY;
  const prevCompanion = process.env.EXPO_PUBLIC_ORION_COMPANION_V1;
  process.env.EXPO_PUBLIC_ORION_COMPANION_V1 = '0';
  process.env.EXPO_PUBLIC_ORION_NAV_BUDDY = buddyOn ? '1' : '0';
  try {
    fn();
  } finally {
    if (prevBuddy === undefined) delete process.env.EXPO_PUBLIC_ORION_NAV_BUDDY;
    else process.env.EXPO_PUBLIC_ORION_NAV_BUDDY = prevBuddy;
    if (prevCompanion === undefined) delete process.env.EXPO_PUBLIC_ORION_COMPANION_V1;
    else process.env.EXPO_PUBLIC_ORION_COMPANION_V1 = prevCompanion;
  }
}

test('imminent cues are instruction-only (no personality repeat)', () => {
  withBuddyEnv(true, () => {
    const out = composeOrionTurnCue({
      bucket: 'imminent',
      instruction: 'In 200 feet, turn left onto Main Street.',
      seed: '0|3|imminent',
      kind: 'turn_left',
    });
    assert.equal(out, 'Turn left.');
    assert.doesNotMatch(out, /villain|drama|gems|main character/i);
  });
});

test('advance cues prepend Orion personality once', () => {
  withBuddyEnv(true, () => {
    const out = composeOrionTurnCue({
      bucket: 'advance',
      instruction: 'In 800 feet, turn left onto Main Street.',
      seed: '0|3|advance',
      kind: 'turn_left',
      userName: 'Ryan Ahmed',
    });
    assert.ok(out.length > 'In 800 feet, turn left onto Main Street.'.length);
    assert.match(out, /In 800 feet, turn left onto Main Street\.$/);
    assert.doesNotMatch(out, /Don't miss it now|refunds/i);
  });
});

test('orionNavBuddyEnabled is false when companion v1 is on', () => {
  const prevCompanion = process.env.EXPO_PUBLIC_ORION_COMPANION_V1;
  process.env.EXPO_PUBLIC_ORION_COMPANION_V1 = '1';
  try {
    assert.equal(orionNavBuddyEnabled(), false);
  } finally {
    if (prevCompanion === undefined) delete process.env.EXPO_PUBLIC_ORION_COMPANION_V1;
    else process.env.EXPO_PUBLIC_ORION_COMPANION_V1 = prevCompanion;
  }
});

test('imminentInstructionFromKind strips SDK distance prefix', () => {
  assert.equal(
    imminentInstructionFromKind('turn_right', 'In 200 feet, turn right onto Oak Avenue.'),
    'Turn right.',
  );
});
