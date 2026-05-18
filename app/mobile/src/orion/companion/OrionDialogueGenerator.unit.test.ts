import assert from 'node:assert/strict';
import test from 'node:test';
import { buildOrionDriveContext } from './OrionContextEngine';
import { createInMemoryOrionMemory } from './OrionMemoryEngine';
import { generateCompanionMessageSync } from './OrionDialogueGenerator';
import { createOrionTripSession } from './OrionTripSession';

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
  assert.notEqual(stressed.message, cruising.message);
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

  assert.ok(message?.includes('Home') || message?.includes('destination'));
});
