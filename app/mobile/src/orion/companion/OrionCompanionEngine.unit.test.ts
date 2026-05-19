import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateOrionCompanionSync } from './OrionCompanionEngine';
import { createInMemoryOrionMemory } from './OrionMemoryEngine';

test('evaluate returns message when cadence allows', () => {
  const memory = createInMemoryOrionMemory();
  const result = evaluateOrionCompanionSync(
    'drive_started',
    {
      isNavigating: true,
      destination: 'Target',
      etaMinutes: 12,
      tripId: 'trip-1',
      nowMs: Date.now(),
    },
    {
      memory,
      speakRoll: 0,
      navVoice: {
        guidanceSuppressed: false,
        msSinceLastSdkVoice: 50_000,
        advisorySdkHoldoffMs: 3000,
        imminentManeuver: false,
      },
    },
  );
  assert.equal(result.shouldSpeak, true);
  assert.ok(result.message && result.message.length > 5);
  assert.equal(result.eventType, 'drive_started');
});

test('second identical evaluate often blocked by duplicate after record', () => {
  const memory = createInMemoryOrionMemory();
  const navVoice = {
    guidanceSuppressed: false,
    msSinceLastSdkVoice: 50_000,
    advisorySdkHoldoffMs: 3000,
    imminentManeuver: false,
  };
  const raw = {
    isNavigating: true,
    destination: 'Costco',
    etaMinutes: 8,
    tripId: 'trip-dup',
    nowMs: 1_700_000_000_000,
  };
  const first = evaluateOrionCompanionSync('arrival', raw, { memory, speakRoll: 0, navVoice });
  if (first.shouldSpeak && first.message) {
    memory.recordSpoken(first, raw.nowMs);
  }
  const second = evaluateOrionCompanionSync('arrival', raw, { memory, speakRoll: 0, navVoice });
  assert.equal(second.shouldSpeak, false);
});

test('smooth_drive frequently silent via probability gate', () => {
  const memory = createInMemoryOrionMemory();
  const result = evaluateOrionCompanionSync(
    'smooth_drive',
    { isNavigating: true, tripId: 't-quiet', nowMs: Date.now() },
    {
      memory,
      speakRoll: 0.99,
      navVoice: {
        guidanceSuppressed: false,
        msSinceLastSdkVoice: 50_000,
        advisorySdkHoldoffMs: 3000,
        imminentManeuver: false,
      },
    },
  );
  assert.equal(result.shouldSpeak, false);
});

test('smooth_drive can reappear on long trips without repeating the same variant', () => {
  const memory = createInMemoryOrionMemory();
  const navVoice = {
    guidanceSuppressed: false,
    msSinceLastSdkVoice: 50_000,
    advisorySdkHoldoffMs: 3000,
    imminentManeuver: false,
  };
  const first = evaluateOrionCompanionSync(
    'smooth_drive',
    {
      isNavigating: true,
      tripId: 'trip-long-cruise',
      destination: 'Home',
      trafficLevel: 'light',
      driveDurationMinutes: 6,
      nextStepDistanceMeters: 500,
      nowMs: 1_700_000_000_000,
    },
    { memory, speakRoll: 0, navVoice },
  );
  assert.equal(first.shouldSpeak, true);
  memory.recordSpoken(first, 1_700_000_000_000);

  const second = evaluateOrionCompanionSync(
    'smooth_drive',
    {
      isNavigating: true,
      tripId: 'trip-long-cruise',
      destination: 'Home',
      trafficLevel: 'light',
      driveDurationMinutes: 17,
      nextStepDistanceMeters: 500,
      nowMs: 1_700_000_000_000 + 11 * 60 * 1000,
    },
    { memory, speakRoll: 0, navVoice },
  );

  assert.equal(second.shouldSpeak, true);
  assert.notEqual(second.variantId, first.variantId);
});
