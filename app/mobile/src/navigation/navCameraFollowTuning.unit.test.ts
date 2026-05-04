import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  getNavCameraFollowTuning,
  shouldIssueNavCameraFollowCommand,
} from './navCameraFollowTuning';

test('stopped vehicle uses conservative camera cadence to avoid red-light jitter', () => {
  const calm = getNavCameraFollowTuning('calm', 0.2, 300);
  const sport = getNavCameraFollowTuning('sport', 0.2, 300);

  assert.equal(calm.minUpdateIntervalMs, 920);
  assert.ok(calm.minMoveMeters >= 5);
  assert.ok(calm.minHeadingDeltaDeg >= 18);
  assert.ok(sport.animationDurationMs < calm.animationDurationMs);
});

test('sport updates faster than calm while moving', () => {
  const calm = getNavCameraFollowTuning('calm', 12, 500);
  const adaptive = getNavCameraFollowTuning('adaptive', 12, 500);
  const sport = getNavCameraFollowTuning('sport', 12, 500);

  assert.ok(sport.minUpdateIntervalMs < adaptive.minUpdateIntervalMs);
  assert.ok(adaptive.minUpdateIntervalMs < calm.minUpdateIntervalMs);
  assert.ok(sport.animationDurationMs < adaptive.animationDurationMs);
  assert.ok(adaptive.animationDurationMs < calm.animationDurationMs);
});

test('near maneuvers tighten camera cadence without going below safety floors', () => {
  const far = getNavCameraFollowTuning('adaptive', 10, 600);
  const near = getNavCameraFollowTuning('adaptive', 10, 55);

  assert.ok(near.minUpdateIntervalMs < far.minUpdateIntervalMs);
  assert.ok(near.animationDurationMs < far.animationDurationMs);
  assert.ok(near.minUpdateIntervalMs >= 260);
  assert.ok(near.animationDurationMs >= 200);
});

test('moving camera cadence stays smooth enough to avoid animation churn', () => {
  const sport = getNavCameraFollowTuning('sport', 18, 260);
  const adaptiveNear = getNavCameraFollowTuning('adaptive', 13, 70);

  assert.ok(sport.minUpdateIntervalMs >= 260);
  assert.ok(sport.animationDurationMs >= 200);
  assert.ok(sport.animationDurationMs <= sport.minUpdateIntervalMs);
  assert.ok(sport.minMoveMeters >= 8);
  assert.ok(adaptiveNear.animationDurationMs <= adaptiveNear.minUpdateIntervalMs);
});

test('camera command gate holds normal motion until cadence elapses', () => {
  const tuning = getNavCameraFollowTuning('sport', 18, 260);
  const issue = shouldIssueNavCameraFollowCommand({
    isNewSession: false,
    elapsedMs: tuning.minUpdateIntervalMs - 12,
    movedMeters: tuning.minMoveMeters + 1,
    headingDeltaDeg: tuning.minHeadingDeltaDeg + 1,
    zoomDelta: 0,
    pitchDelta: 0,
    stopped: false,
    tuning,
  });

  assert.equal(issue, false);
});

test('camera command gate lets reroute-scale jumps through early', () => {
  const tuning = getNavCameraFollowTuning('adaptive', 12, 500);
  const issue = shouldIssueNavCameraFollowCommand({
    isNewSession: false,
    elapsedMs: 20,
    movedMeters: 28,
    headingDeltaDeg: 0,
    zoomDelta: 0,
    pitchDelta: 0,
    stopped: false,
    tuning,
  });

  assert.equal(issue, true);
});
