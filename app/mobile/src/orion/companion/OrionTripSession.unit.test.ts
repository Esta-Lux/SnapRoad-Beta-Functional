import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createOrionTripSession,
  resetOrionTripSessionState,
  type OrionTripSession,
} from './OrionTripSession';
import { markDriveStarted, markSmoothDriveMentioned } from './OrionTripArcEngine';

test('reset clears session fields', () => {
  const session = createOrionTripSession('trip-a', 1000);
  markDriveStarted(session);
  markSmoothDriveMentioned(session);
  resetOrionTripSessionState(session);
  assert.equal(session.tripId, null);
  assert.equal(session.flags.openedWithLine, false);
  assert.equal(session.flags.mentionedSmoothDrive, false);
});
