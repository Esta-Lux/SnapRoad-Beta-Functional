import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  blendModelWithObservedEta,
  etaObservedBlendWeight,
  naiveRemainingSecFromDistance,
} from '../etaObservedBlend';

test('naiveRemainingSecFromDistance', () => {
  assert.ok(Math.abs(naiveRemainingSecFromDistance(2000, 10, 2) - 200) < 1e-6);
});

test('etaObservedBlendWeight is bounded', () => {
  const w = etaObservedBlendWeight({
    confidence: 1,
    msSinceModelRefresh: 300_000,
    speedStability01: 1,
  });
  assert.ok(w >= 0 && w <= 1);
});

test('blendModelWithObservedEta caps swing vs previous', () => {
  const a = blendModelWithObservedEta({
    modelRemainingSec: 500,
    distanceRemainingM: 50_000,
    smoothedSpeedMps: 15,
    confidence: 0.8,
    msSinceModelRefresh: 60_000,
    speedStability01: 0.7,
    prevBlendedSec: 500,
    dtMs: 1000,
    maxSwingSecPerTick: 15,
  });
  assert.ok(a.blendedSec >= 0);
  assert.ok(Math.abs(a.blendedSec - 500) <= 16);
});
