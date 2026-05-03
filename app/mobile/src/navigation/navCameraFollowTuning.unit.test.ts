import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getNavCameraFollowTuning } from './navCameraFollowTuning';

test('stopped vehicle uses conservative camera cadence to avoid red-light jitter', () => {
  const calm = getNavCameraFollowTuning('calm', 0.2, 300);
  const sport = getNavCameraFollowTuning('sport', 0.2, 300);

  assert.equal(calm.minUpdateIntervalMs, 560);
  assert.ok(calm.minMoveMeters >= 3);
  assert.ok(calm.minHeadingDeltaDeg >= 12);
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
  assert.ok(near.minUpdateIntervalMs >= 38);
  assert.ok(near.animationDurationMs >= 72);
});

test('moving camera cadence stays low-latency enough to track the puck', () => {
  const sport = getNavCameraFollowTuning('sport', 18, 260);
  const adaptiveNear = getNavCameraFollowTuning('adaptive', 13, 70);

  assert.ok(sport.minUpdateIntervalMs <= 48);
  assert.ok(sport.animationDurationMs <= 96);
  assert.ok(sport.minMoveMeters <= 0.32);
  assert.ok(adaptiveNear.animationDurationMs <= 122);
});
