import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldSkipOrionBuddyTail } from './buddyTailPolicy';

test('skips all buddy tails when companion v1 is enabled', () => {
  const prev = process.env.EXPO_PUBLIC_ORION_COMPANION_V1;
  process.env.EXPO_PUBLIC_ORION_COMPANION_V1 = '1';
  try {
    assert.equal(shouldSkipOrionBuddyTail('preparatory'), true);
    assert.equal(shouldSkipOrionBuddyTail('advance'), true);
    assert.equal(shouldSkipOrionBuddyTail('imminent'), true);
  } finally {
    if (prev === undefined) delete process.env.EXPO_PUBLIC_ORION_COMPANION_V1;
    else process.env.EXPO_PUBLIC_ORION_COMPANION_V1 = prev;
  }
});

test('does not skip when companion is off', () => {
  const prev = process.env.EXPO_PUBLIC_ORION_COMPANION_V1;
  process.env.EXPO_PUBLIC_ORION_COMPANION_V1 = '0';
  try {
    assert.equal(shouldSkipOrionBuddyTail('preparatory'), false);
  } finally {
    if (prev === undefined) delete process.env.EXPO_PUBLIC_ORION_COMPANION_V1;
    else process.env.EXPO_PUBLIC_ORION_COMPANION_V1 = prev;
  }
});
