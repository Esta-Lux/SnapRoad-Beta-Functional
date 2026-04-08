import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  congestionWorsenedEdgeFraction,
  countRefreshesSince,
  decideTrafficRefresh,
  naiveRemainingSeconds,
  passesRefreshGates,
  pickRefreshCandidate,
  updateDriftSustained,
} from '../routeRefreshPolicy';
import type { CongestionLevel } from '../../lib/directions';

test('naiveRemainingSeconds uses speed floor', () => {
  const n = naiveRemainingSeconds(1000, 0, 2);
  assert.ok(Math.abs(n - 500) < 1e-6);
});

test('countRefreshesSince respects window', () => {
  const now = 1_000_000;
  assert.equal(countRefreshesSince([now - 1000, now - 500, now - 100], now, 3600_000), 3);
  assert.equal(countRefreshesSince([now - 7200_000], now, 3600_000), 0);
});

test('congestionWorsenedEdgeFraction', () => {
  const prev: CongestionLevel[] = ['low', 'low', 'moderate', 'heavy'];
  const curr: CongestionLevel[] = ['low', 'heavy', 'severe', 'heavy'];
  const f = congestionWorsenedEdgeFraction(prev, curr, 0, 2);
  assert.ok(f != null && f >= 0.4);
});

test('pickRefreshCandidate: periodic stale', () => {
  const now = 500_000;
  const c = pickRefreshCandidate({
    nowMs: now,
    lastRefreshAtMs: now - 400_000,
    periodicStaleMs: 300_000,
    driftSustainMs: 0,
    driftSustainThresholdMs: 45_000,
    driftGapSec: 120,
    modelRemainingSec: 600,
    distanceRemainingM: 10_000,
    speedMps: 20,
    vMinMps: 2,
    currentStepLengthM: 100,
    nextStepDistanceMeters: 500,
    longStepMeters: 8000,
    timeToManeuverMaxMin: 12,
    snapSegmentIndex: 0,
    congestionCurrent: undefined,
    edgeSpeedsKmh: undefined,
    edgeMismatchSustainMs: 0,
    modelSpeedMismatchSustainMs: 35_000,
    userSpeedKmh: 72,
    modelSpeedMismatchRatio: 0.52,
  });
  assert.equal(c?.trigger, 'periodic_stale');
});

test('pickRefreshCandidate: sustained drift', () => {
  const now = 200_000;
  const c = pickRefreshCandidate({
    nowMs: now,
    lastRefreshAtMs: now - 30_000,
    periodicStaleMs: 300_000,
    driftSustainMs: 50_000,
    driftSustainThresholdMs: 45_000,
    driftGapSec: 120,
    modelRemainingSec: 800,
    distanceRemainingM: 500,
    speedMps: 25,
    vMinMps: 2,
    currentStepLengthM: 100,
    nextStepDistanceMeters: 400,
    longStepMeters: 8000,
    timeToManeuverMaxMin: 12,
    snapSegmentIndex: 0,
    congestionCurrent: undefined,
    edgeSpeedsKmh: undefined,
    edgeMismatchSustainMs: 0,
    modelSpeedMismatchSustainMs: 35_000,
    userSpeedKmh: 90,
    modelSpeedMismatchRatio: 0.52,
  });
  assert.equal(c?.trigger, 'eta_drift');
});

test('decideTrafficRefresh respects cooldown', () => {
  const now = 1_000_000;
  const d = decideTrafficRefresh({
    nowMs: now,
    lastRefreshAtMs: now - 30_000,
    lastDebouncedAttemptMs: 0,
    refreshHistoryMs: [],
    candidate: { trigger: 'eta_drift' },
    gates: passesRefreshGates({
      speedMps: 10,
      rerouteInFlight: false,
      gpsAccuracyM: 12,
      navConfidence: 0.9,
      stallSpeedMps: 1.5,
      poorGpsAccuracyM: 62,
      minNavConfidence: 0.22,
    }),
    minCooldownMs: 100_000,
    maxRefreshesPerHour: 20,
    debounceMs: 4000,
  });
  assert.equal(d.action, 'skip');
  if (d.action === 'skip') assert.equal(d.reason, 'cooldown');
});

test('updateDriftSustained accumulates only when gap above threshold', () => {
  assert.equal(updateDriftSustained(5000, 10_000, 5000, 50, 120), 0);
  const b = updateDriftSustained(5000, 11_000, 10_000, 130, 120);
  assert.equal(b, 6000);
  assert.equal(updateDriftSustained(3000, 20_000, 19_000, 30, 120), 0);
});
