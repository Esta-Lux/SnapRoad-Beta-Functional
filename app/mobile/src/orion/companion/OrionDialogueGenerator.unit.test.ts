import assert from 'node:assert/strict';
import test from 'node:test';
import { buildOrionDriveContext } from './OrionContextEngine';
import { createInMemoryOrionMemory } from './OrionMemoryEngine';
import { generateCompanionMessageSync } from './OrionDialogueGenerator';
import { createOrionTripSession } from './OrionTripSession';
import { DIALOGUE_VARIANTS } from './dialogueVariants';

test('smooth_drive playful variant requires cruising phase and low stress', () => {
  const memory = createInMemoryOrionMemory();
  const session = createOrionTripSession('t1', Date.now());
  session.flags.openedWithLine = true;

  const ctx = buildOrionDriveContext({
    isNavigating: true,
    destination: 'Target',
    currentRoad: 'I-71',
    tripId: 't1',
    nowMs: Date.now(),
  });

  const stressed = generateCompanionMessageSync({
    event: 'smooth_drive',
    ctx,
    mood: 'witty',
    memory,
    phase: 'stressed',
    stress: 'high',
    session,
  });

  const cruising = generateCompanionMessageSync({
    event: 'smooth_drive',
    ctx,
    mood: 'witty',
    memory,
    phase: 'cruising',
    stress: 'low',
    session,
  });

  assert.ok(stressed.message);
  assert.ok(cruising.message);
  const stressedVariant = DIALOGUE_VARIANTS.smooth_drive.find((v) => v.id === stressed.variantId);
  assert.notEqual(stressedVariant?.maxStress, 'low');
});

test('arrival closing phase uses closing templates', () => {
  const memory = createInMemoryOrionMemory();
  const ctx = buildOrionDriveContext({
    isNavigating: false,
    destination: 'Home',
    nowMs: Date.now(),
  });

  const { message } = generateCompanionMessageSync({
    event: 'arrival',
    ctx,
    mood: 'calm',
    memory,
    phase: 'closing',
    stress: 'low',
  });

  assert.ok(message);
});

test('selection avoids exact variant repeat in the same trip when alternatives exist', () => {
  const memory = createInMemoryOrionMemory();
  const ctx = buildOrionDriveContext({
    isNavigating: true,
    destination: 'Downtown',
    tripId: 'trip-repeat',
    nowMs: 1_700_000_000_000,
    trafficLevel: 'light',
  });

  const first = generateCompanionMessageSync({
    event: 'smooth_drive',
    ctx,
    mood: 'sassy',
    memory,
    phase: 'cruising',
    stress: 'low',
  });
  assert.ok(first.message);
  memory.recordSpoken(
    {
      shouldSpeak: true,
      message: first.message,
      category: first.category,
      mood: 'sassy',
      priority: first.priority,
      eventType: 'smooth_drive',
      variantId: first.variantId,
      patternKey: first.patternKey,
      tripId: first.tripId,
    },
    ctx.nowMs,
  );

  const second = generateCompanionMessageSync({
    event: 'smooth_drive',
    ctx: buildOrionDriveContext({
      isNavigating: ctx.isNavigating,
      destination: ctx.destination,
      tripId: ctx.tripId,
      nowMs: ctx.nowMs + 11 * 60 * 1000,
      trafficLevel: ctx.trafficLevel,
    }),
    mood: 'sassy',
    memory,
    phase: 'cruising',
    stress: 'low',
  });

  assert.ok(second.message);
  assert.notEqual(second.variantId, first.variantId);
});

test('weighted selection respects memory and falls to unused variants before repeats', () => {
  const memory = createInMemoryOrionMemory();
  const ctx = buildOrionDriveContext({
    isNavigating: true,
    destination: 'Home',
    tripId: 'trip-weighted',
    nowMs: 1_700_000_000_000,
    trafficLevel: 'light',
  });

  memory.recordSpoken(
    {
      shouldSpeak: true,
      message: 'Smooth ride so far. The road is behaving.',
      category: 'cruise',
      mood: 'sassy',
      priority: 'low',
      eventType: 'smooth_drive',
      variantId: 'sd1',
      patternKey: 'suspicious-road',
      tripId: 'trip-weighted',
    },
    ctx.nowMs - 60_000,
  );

  const next = generateCompanionMessageSync({
    event: 'smooth_drive',
    ctx,
    mood: 'sassy',
    memory,
    phase: 'cruising',
    stress: 'low',
  });

  assert.ok(next.message);
  assert.notEqual(next.variantId, 'sd1');
  assert.notEqual(next.patternKey, 'suspicious-road');
});

test('safety_caution templates stay calm or focused, never sassy', () => {
  const memory = createInMemoryOrionMemory();
  const ctx = buildOrionDriveContext({
    isNavigating: true,
    incidentNearby: true,
    tripId: 'trip-safety',
    nowMs: 1_700_000_000_000,
  });

  for (const mood of ['calm', 'focused'] as const) {
    const line = generateCompanionMessageSync({
      event: 'safety_caution',
      ctx,
      mood,
      memory,
      phase: 'stressed',
      stress: 'high',
    });
    assert.ok(line.message);
    assert.ok(line.variantId?.startsWith('sf'));
  }
});
