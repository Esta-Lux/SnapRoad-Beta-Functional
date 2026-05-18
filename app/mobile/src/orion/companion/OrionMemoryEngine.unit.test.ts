import assert from 'node:assert/strict';
import test from 'node:test';
import { CATEGORY_COOLDOWN_MS } from './constants';
import { createInMemoryOrionMemory } from './OrionMemoryEngine';
import type { OrionCompanionResult } from './types';

test('memory caps at 20 entries', () => {
  const mem = createInMemoryOrionMemory();
  const now = Date.now();
  for (let i = 0; i < 25; i += 1) {
    mem.recordSpoken(
      {
        shouldSpeak: true,
        message: `line ${i}`,
        category: 'trip',
        mood: 'calm',
        priority: 'normal',
        eventType: 'smooth_drive',
      },
      now + i,
    );
  }
  assert.equal(mem.getEntries().length, 20);
  assert.equal(mem.getEntries()[0]?.message, 'line 5');
});

test('isDuplicateMessage blocks exact repeats', () => {
  const mem = createInMemoryOrionMemory();
  mem.recordSpoken(
    {
      shouldSpeak: true,
      message: 'Cruise mode. The road is being suspiciously cooperative.',
      category: 'traffic_humor',
      mood: 'witty',
      priority: 'low',
      eventType: 'smooth_drive',
    },
    Date.now(),
  );
  assert.equal(
    mem.isDuplicateMessage('Cruise mode. The road is being suspiciously cooperative.'),
    true,
  );
  assert.equal(mem.isDuplicateMessage('Different line entirely.'), false);
});

test('category cooldown blocks traffic_humor within 20 minutes', () => {
  const mem = createInMemoryOrionMemory();
  const t0 = 1_700_000_000_000;
  mem.recordSpoken(
    {
      shouldSpeak: true,
      message: 'Traffic joke',
      category: 'traffic_humor',
      mood: 'witty',
      priority: 'low',
      eventType: 'smooth_drive',
    },
    t0,
  );
  assert.equal(mem.canUseCategory('traffic_humor', t0 + 5 * 60 * 1000), false);
  assert.equal(
    mem.canUseCategory('traffic_humor', t0 + CATEGORY_COOLDOWN_MS.traffic_humor + 1),
    true,
  );
});

test('urgent bypasses category cooldown', () => {
  const mem = createInMemoryOrionMemory();
  const t0 = Date.now();
  mem.recordSpoken(
    {
      shouldSpeak: true,
      message: 'Safety ping',
      category: 'safety',
      mood: 'calm',
      priority: 'urgent',
      eventType: 'safety_caution',
    } satisfies OrionCompanionResult,
    t0,
  );
  assert.equal(mem.canUseCategory('safety', t0 + 1000, true), true);
});
