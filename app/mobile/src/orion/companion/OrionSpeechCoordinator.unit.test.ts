import assert from 'node:assert/strict';
import test from 'node:test';
import { passesAdvisorySpeechGates } from './advisorySpeechGates';
import { buildOrionDriveContext } from './OrionContextEngine';
import { createInMemoryOrionMemory } from './OrionMemoryEngine';

test('blocks advisory when voice muted', () => {
  const memory = createInMemoryOrionMemory();
  const ctx = buildOrionDriveContext({ isNavigating: true, nowMs: Date.now() });
  const gate = passesAdvisorySpeechGates({
    ctx,
    message: 'Offer nearby.',
    category: 'offer',
    priority: 'normal',
    memory,
    navVoice: {
      guidanceSuppressed: false,
      msSinceLastSdkVoice: 99_000,
      advisorySdkHoldoffMs: 3000,
      imminentManeuver: false,
    },
    voiceMuted: true,
  });
  assert.equal(gate.allowed, false);
  assert.equal(gate.reason, 'voice_muted');
});

test('blocks advisory during imminent maneuver', () => {
  const memory = createInMemoryOrionMemory();
  const ctx = buildOrionDriveContext({
    isNavigating: true,
    nextStepDistanceMeters: 40,
    nowMs: Date.now(),
  });
  const gate = passesAdvisorySpeechGates({
    ctx,
    message: 'Police reported ahead.',
    category: 'police',
    priority: 'urgent',
    memory,
    navVoice: {
      guidanceSuppressed: false,
      msSinceLastSdkVoice: 99_000,
      advisorySdkHoldoffMs: 3000,
      imminentManeuver: true,
    },
  });
  assert.equal(gate.allowed, false);
  assert.equal(gate.reason, 'turn_voice_window');
});

test('urgent police bypasses category cooldown in gates', () => {
  const memory = createInMemoryOrionMemory();
  const now = 1_700_000_000_000;
  memory.recordSpoken(
    {
      shouldSpeak: true,
      message: 'Police reported ahead.',
      category: 'police',
      mood: 'calm',
      priority: 'urgent',
      eventType: 'safety_caution',
    },
    now,
  );
  const ctx = buildOrionDriveContext({ isNavigating: true, nowMs: now + 1000 });
  const gate = passesAdvisorySpeechGates({
    ctx,
    message: 'Police reported about two miles ahead.',
    category: 'police',
    priority: 'urgent',
    memory,
    navVoice: {
      guidanceSuppressed: false,
      msSinceLastSdkVoice: 99_000,
      advisorySdkHoldoffMs: 3000,
      imminentManeuver: false,
    },
  });
  assert.equal(gate.allowed, true);
});

test('critical turn transition blocks normal preapproved companion speech', () => {
  const memory = createInMemoryOrionMemory();
  const ctx = buildOrionDriveContext({
    isNavigating: true,
    nowMs: Date.now(),
    nextStepDistanceMeters: 500,
    criticalTurnTransition: true,
  });
  const gate = passesAdvisorySpeechGates({
    ctx,
    message: 'You earned gems.',
    category: 'reward',
    priority: 'normal',
    memory,
    navVoice: {
      guidanceSuppressed: false,
      msSinceLastSdkVoice: 99_000,
      advisorySdkHoldoffMs: 3000,
      imminentManeuver: false,
    },
    preApproved: true,
  });
  assert.equal(gate.allowed, false);
  assert.equal(gate.reason, 'critical_turn_transition');
});

test('urgent safety can pass critical transition gate when turn voice window is clear', () => {
  const memory = createInMemoryOrionMemory();
  const ctx = buildOrionDriveContext({
    isNavigating: true,
    nowMs: Date.now(),
    nextStepDistanceMeters: 500,
    criticalTurnTransition: true,
  });
  const gate = passesAdvisorySpeechGates({
    ctx,
    message: 'Hazard reported ahead.',
    category: 'safety',
    priority: 'urgent',
    memory,
    navVoice: {
      guidanceSuppressed: false,
      msSinceLastSdkVoice: 99_000,
      advisorySdkHoldoffMs: 3000,
      imminentManeuver: false,
    },
  });
  assert.equal(gate.allowed, true);
});

test('preApproved skips min gap after recent speech', () => {
  const memory = createInMemoryOrionMemory();
  const now = Date.now();
  memory.recordSpoken(
    {
      shouldSpeak: true,
      message: 'Trip on.',
      category: 'trip',
      mood: 'calm',
      priority: 'normal',
      eventType: 'drive_started',
    },
    now,
  );
  const ctx = buildOrionDriveContext({ isNavigating: true, nowMs: now + 5000 });
  const gate = passesAdvisorySpeechGates({
    ctx,
    message: 'Almost there.',
    category: 'trip',
    priority: 'normal',
    memory,
    navVoice: {
      guidanceSuppressed: false,
      msSinceLastSdkVoice: 99_000,
      advisorySdkHoldoffMs: 3000,
      imminentManeuver: false,
    },
    preApproved: true,
  });
  assert.equal(gate.allowed, true);
});
