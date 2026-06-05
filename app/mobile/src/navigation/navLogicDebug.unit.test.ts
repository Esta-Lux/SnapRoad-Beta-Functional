import assert from 'node:assert/strict';
import test from 'node:test';
import { logNavTransition, resetNavTransitionTraceForTests } from './navLogicDebug';

test('logNavTransition emits structured NavVerify payload when debug is enabled', () => {
  const prev = process.env.EXPO_PUBLIC_NAV_LOGIC_DEBUG;
  const logs: unknown[][] = [];
  const original = console.log;
  process.env.EXPO_PUBLIC_NAV_LOGIC_DEBUG = '1';
  resetNavTransitionTraceForTests();
  console.log = (...args: unknown[]) => logs.push(args);
  try {
    logNavTransition('route_change', {
      tripId: 'trip-1',
      instructionSource: 'sdk',
      stepIndex: 2,
      distanceToManeuverM: 120,
      instruction: 'Turn right',
    });
  } finally {
    console.log = original;
    if (prev == null) delete process.env.EXPO_PUBLIC_NAV_LOGIC_DEBUG;
    else process.env.EXPO_PUBLIC_NAV_LOGIC_DEBUG = prev;
    resetNavTransitionTraceForTests();
  }

  assert.equal(logs.length, 1);
  assert.equal(logs[0]?.[0], '[NavVerify]');
  const payload = JSON.parse(String(logs[0]?.[1]));
  assert.equal(payload.channel, 'transition.route_change');
  assert.equal(payload.seq, 1);
  assert.equal(payload.tripId, 'trip-1');
  assert.equal(payload.instructionSource, 'sdk');
  assert.equal(payload.stepIndex, 2);
});

test('logNavTransition throttles high-frequency sdk ingest traces by channel', () => {
  const prev = process.env.EXPO_PUBLIC_NAV_LOGIC_DEBUG;
  const logs: unknown[][] = [];
  const original = console.log;
  process.env.EXPO_PUBLIC_NAV_LOGIC_DEBUG = '1';
  resetNavTransitionTraceForTests();
  console.log = (...args: unknown[]) => logs.push(args);
  try {
    logNavTransition('sdk_ingest', { sdkEvent: 'progress' });
    logNavTransition('sdk_ingest', { sdkEvent: 'progress' });
  } finally {
    console.log = original;
    if (prev == null) delete process.env.EXPO_PUBLIC_NAV_LOGIC_DEBUG;
    else process.env.EXPO_PUBLIC_NAV_LOGIC_DEBUG = prev;
    resetNavTransitionTraceForTests();
  }

  assert.equal(logs.length, 1);
});
