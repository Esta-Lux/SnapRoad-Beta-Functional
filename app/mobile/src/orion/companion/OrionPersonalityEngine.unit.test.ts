import assert from 'node:assert/strict';
import test from 'node:test';
import { buildOrionDriveContext } from './OrionContextEngine';
import { selectMood } from './OrionPersonalityEngine';

test('high stress reroute selects focused', () => {
  const ctx = buildOrionDriveContext({
    isNavigating: true,
    rerouteDetected: true,
    incidentNearby: true,
    nextStepDistanceMeters: 50,
  });
  assert.equal(selectMood(ctx, 'reroute', 'high'), 'focused');
});

test('safety_caution under high stress stays calm or focused', () => {
  const ctx = buildOrionDriveContext({ incidentNearby: true, rerouteDetected: true });
  assert.ok(['calm', 'focused'].includes(selectMood(ctx, 'safety_caution', 'high')));
});

test('smooth_drive low stress can be witty, sassy, hype, or quiet', () => {
  const ctx = buildOrionDriveContext({ isNavigating: true, tripId: 't1' });
  const mood = selectMood(ctx, 'smooth_drive', 'low');
  assert.ok(['witty', 'sassy', 'hype', 'quiet'].includes(mood));
});
