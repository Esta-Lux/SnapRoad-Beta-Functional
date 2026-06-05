import assert from 'node:assert/strict';
import test from 'node:test';
import { buildOrionDriveContext } from './OrionContextEngine';
import { createInMemoryOrionMemory } from './OrionMemoryEngine';
import { shouldSpeakNow } from './OrionCadenceEngine';

const baseCtx = () =>
  buildOrionDriveContext({
    isNavigating: true,
    nowMs: 1_700_000_000_000,
    tripId: 'trip-a',
    nextStepDistanceMeters: 500,
  });

test('cadence blocks imminent maneuver', () => {
  const ctx = buildOrionDriveContext({
    isNavigating: true,
    nowMs: Date.now(),
    nextStepDistanceMeters: 40,
  });
  const decision = shouldSpeakNow({
    event: 'smooth_drive',
    ctx,
    mood: 'witty',
    priority: 'low',
    memory: createInMemoryOrionMemory(),
    navVoice: {
      guidanceSuppressed: false,
      msSinceLastSdkVoice: 10_000,
      advisorySdkHoldoffMs: 3000,
      imminentManeuver: false,
    },
    category: 'traffic_humor',
    candidateMessage: 'Easy miles.',
    speakRoll: 0,
  });
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'imminent_maneuver');
});

test('cadence blocks when guidance suppressed', () => {
  const decision = shouldSpeakNow({
    event: 'drive_started',
    ctx: baseCtx(),
    mood: 'focused',
    priority: 'normal',
    memory: createInMemoryOrionMemory(),
    navVoice: {
      guidanceSuppressed: true,
      msSinceLastSdkVoice: 10_000,
      advisorySdkHoldoffMs: 3000,
      imminentManeuver: false,
    },
    category: 'trip',
    candidateMessage: 'Trip on.',
    speakRoll: 0,
  });
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'guidance_suppressed');
});

test('cadence blocks sdk voice holdoff', () => {
  const decision = shouldSpeakNow({
    event: 'drive_started',
    ctx: baseCtx(),
    mood: 'focused',
    priority: 'normal',
    memory: createInMemoryOrionMemory(),
    navVoice: {
      guidanceSuppressed: false,
      msSinceLastSdkVoice: 500,
      advisorySdkHoldoffMs: 3000,
      imminentManeuver: false,
    },
    category: 'trip',
    candidateMessage: 'Trip on.',
    speakRoll: 0,
  });
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'sdk_voice_holdoff');
});

test('urgent safety can pass cadence with speakRoll 0', () => {
  const mem = createInMemoryOrionMemory();
  const ctx = baseCtx();
  const decision = shouldSpeakNow({
    event: 'safety_caution',
    ctx,
    mood: 'calm',
    priority: 'urgent',
    memory: mem,
    navVoice: {
      guidanceSuppressed: false,
      msSinceLastSdkVoice: 10_000,
      advisorySdkHoldoffMs: 3000,
      imminentManeuver: false,
    },
    category: 'safety',
    candidateMessage: 'Heads up — hazard reported ahead.',
    speakRoll: 0,
  });
  assert.equal(decision.allowed, true);
});

test('critical turn transition blocks normal companion chatter', () => {
  const decision = shouldSpeakNow({
    event: 'reward_earned',
    ctx: buildOrionDriveContext({
      isNavigating: true,
      nowMs: 1_700_000_000_000,
      nextStepDistanceMeters: 500,
      criticalTurnTransition: true,
    }),
    mood: 'hype',
    priority: 'normal',
    memory: createInMemoryOrionMemory(),
    navVoice: {
      guidanceSuppressed: false,
      msSinceLastSdkVoice: 10_000,
      advisorySdkHoldoffMs: 3000,
      imminentManeuver: false,
    },
    category: 'reward',
    candidateMessage: 'Nice, gems earned.',
    speakRoll: 0,
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'critical_turn_transition');
});

test('urgent safety can pass when critical transition is the only blocker', () => {
  const decision = shouldSpeakNow({
    event: 'safety_caution',
    ctx: buildOrionDriveContext({
      isNavigating: true,
      nowMs: 1_700_000_000_000,
      nextStepDistanceMeters: 500,
      criticalTurnTransition: true,
    }),
    mood: 'focused',
    priority: 'urgent',
    memory: createInMemoryOrionMemory(),
    navVoice: {
      guidanceSuppressed: false,
      msSinceLastSdkVoice: 10_000,
      advisorySdkHoldoffMs: 3000,
      imminentManeuver: false,
    },
    category: 'safety',
    candidateMessage: 'Hazard reported ahead.',
    speakRoll: 0,
  });

  assert.equal(decision.allowed, true);
});

test('traffic humor cooldown keeps traffic jokes from repeating too often', () => {
  const mem = createInMemoryOrionMemory();
  const t0 = 1_700_000_000_000;
  mem.recordSpoken(
    {
      shouldSpeak: true,
      message: 'Ah yes, the brake-light parade.',
      category: 'traffic_humor',
      mood: 'focused',
      priority: 'normal',
      eventType: 'heavy_traffic',
    },
    t0,
  );

  const decision = shouldSpeakNow({
    event: 'heavy_traffic',
    ctx: buildOrionDriveContext({
      isNavigating: true,
      nowMs: t0 + 5 * 60 * 1000,
      trafficLevel: 'heavy',
      nextStepDistanceMeters: 500,
    }),
    mood: 'focused',
    priority: 'normal',
    memory: mem,
    navVoice: {
      guidanceSuppressed: false,
      msSinceLastSdkVoice: 10_000,
      advisorySdkHoldoffMs: 3000,
      imminentManeuver: false,
    },
    category: 'traffic_humor',
    candidateMessage: 'Traffic chose group project energy.',
    speakRoll: 0,
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'category_cooldown');
});

test('smooth cruise can pass after cruise cooldown with a fresh line', () => {
  const mem = createInMemoryOrionMemory();
  const t0 = 1_700_000_000_000;
  mem.recordSpoken(
    {
      shouldSpeak: true,
      message: 'Smooth ride so far.',
      category: 'cruise',
      mood: 'sassy',
      priority: 'low',
      eventType: 'smooth_drive',
      variantId: 'sd1',
      patternKey: 'suspicious-road',
      tripId: 'trip-cruise',
    },
    t0,
  );

  const decision = shouldSpeakNow({
    event: 'smooth_drive',
    ctx: buildOrionDriveContext({
      isNavigating: true,
      nowMs: t0 + 11 * 60 * 1000,
      trafficLevel: 'light',
      nextStepDistanceMeters: 500,
      tripId: 'trip-cruise',
    }),
    mood: 'sassy',
    priority: 'low',
    memory: mem,
    navVoice: {
      guidanceSuppressed: false,
      msSinceLastSdkVoice: 10_000,
      advisorySdkHoldoffMs: 3000,
      imminentManeuver: false,
    },
    category: 'cruise',
    candidateMessage: 'Different smooth-drive line.',
    speakRoll: 0,
  });

  assert.equal(decision.allowed, true);
});

test('sassy smooth-drive stays quiet during complex road state', () => {
  const decision = shouldSpeakNow({
    event: 'smooth_drive',
    ctx: buildOrionDriveContext({
      isNavigating: true,
      nowMs: 1_700_000_000_000,
      trafficLevel: 'heavy',
      nextStepDistanceMeters: 500,
    }),
    mood: 'sassy',
    priority: 'low',
    memory: createInMemoryOrionMemory(),
    navVoice: {
      guidanceSuppressed: false,
      msSinceLastSdkVoice: 10_000,
      advisorySdkHoldoffMs: 3000,
      imminentManeuver: false,
    },
    category: 'cruise',
    candidateMessage: 'Smooth ride.',
    speakRoll: 0,
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'complex_road_state');
});
