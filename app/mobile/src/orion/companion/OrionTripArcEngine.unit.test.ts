import assert from 'node:assert/strict';
import test from 'node:test';
import { buildOrionDriveContext } from './OrionContextEngine';
import { deriveTripPhase, updateSessionPhase } from './OrionTripArcEngine';
import { createOrionTripSession } from './OrionTripSession';

test('reroute event moves session to stressed', () => {
  const session = createOrionTripSession('t1', 1_000);
  const ctx = buildOrionDriveContext({ isNavigating: true, rerouteDetected: true, nowMs: 2_000 });
  const phase = deriveTripPhase(ctx, 'high', 'reroute', session);
  updateSessionPhase(session, phase, ctx.nowMs);
  assert.equal(session.phase, 'stressed');
});

test('arrival moves to closing and sticks', () => {
  const session = createOrionTripSession('t1', 1_000);
  session.phase = 'stressed';
  const ctx = buildOrionDriveContext({ isNavigating: false, nowMs: 5_000 });
  updateSessionPhase(session, deriveTripPhase(ctx, 'low', 'arrival', session), ctx.nowMs);
  assert.equal(session.phase, 'closing');
  updateSessionPhase(session, 'cruising', ctx.nowMs);
  assert.equal(session.phase, 'closing');
});

test('opening phase for first minutes of drive', () => {
  const session = createOrionTripSession('t1', Date.now() - 60_000);
  const ctx = buildOrionDriveContext({
    isNavigating: true,
    driveDurationMinutes: 2,
    nowMs: Date.now(),
  });
  const phase = deriveTripPhase(ctx, 'low', 'smooth_drive', session);
  assert.equal(phase, 'opening');
});
