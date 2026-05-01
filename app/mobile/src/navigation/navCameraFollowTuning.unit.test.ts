import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getNavCameraFollowTuning } from './navCameraFollowTuning';

test('stopped vehicle uses conservative camera cadence to avoid red-light jitter', () => {
  const calm = getNavCameraFollowTuning('calm', 0.2, 300);
  const sport = getNavCameraFollowTuning('sport', 0.2, 300);

  assert.equal(calm.minUpdateIntervalMs, 440);
  assert.ok(calm.minMoveMeters >= 2);
  assert.ok(calm.minHeadingDeltaDeg >= 8);
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
  assert.ok(near.minUpdateIntervalMs >= 54);
  assert.ok(near.animationDurationMs >= 105);
});
