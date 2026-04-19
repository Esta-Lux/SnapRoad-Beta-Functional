/**
 * Pure-function tests for `stepSmoothedFraction` — the exponential-decay
 * step helper that powers `useSmoothedNavFraction`. The hook itself drives
 * this via `requestAnimationFrame` for the Apple-Maps style puck slide; we
 * test the core ease in isolation so the invariants are locked in without
 * mocking RAF / DOM.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { stepSmoothedFraction } from './useSmoothedNavFraction';

test('returns current when diff is effectively zero', () => {
  const out = stepSmoothedFraction(0.5, 0.5, 16);
  assert.equal(out, 0.5);
});

test('moves toward target exponentially over one 16 ms frame (~9% at tc=180ms)', () => {
  // Use a sub-snap-threshold delta so the ease path runs (big deltas snap).
  const out = stepSmoothedFraction(0, 0.01, 16, 180);
  assert.ok(out > 0);
  assert.ok(out < 0.01);
  // 1 - exp(-16/180) ≈ 0.085, so ~0.00085 of the 0.01 gap
  assert.ok(out > 0.0005 && out < 0.002, `unexpected ease step: ${out}`);
});

test('snaps to target when delta exceeds snapDeltaFraction (reroute / teleport)', () => {
  // Big jump — must snap instantly, otherwise the puck would visibly
  // scrub across the whole route on off-route or route replacement.
  const out = stepSmoothedFraction(0.1, 0.5, 16, 180, 0.02);
  assert.equal(out, 0.5);
});

test('converges to target when iterated many frames (within snap threshold)', () => {
  let f = 0;
  const target = 0.015; // under snap threshold so the ease path runs
  for (let i = 0; i < 400; i++) {
    f = stepSmoothedFraction(f, target, 16, 180);
  }
  assert.ok(Math.abs(f - target) < 1e-4, `did not converge: ${f}`);
});

test('clamps both inputs and output to [0, 1]', () => {
  assert.equal(stepSmoothedFraction(-0.1, 2, 16), 1);
  // From a current=1 with target=1 (clamped from 2), diff is 0 → returns current.
  const out = stepSmoothedFraction(0.9, 2, 16);
  assert.ok(out >= 0.9 && out <= 1);
});

test('larger dt applies more ease per call (within snap threshold)', () => {
  const smallDt = stepSmoothedFraction(0, 0.01, 16, 180);
  const largeDt = stepSmoothedFraction(0, 0.01, 80, 180);
  assert.ok(largeDt > smallDt, 'longer frame should move further toward target');
});

test('longer timeConstant applies less ease per call (smoother)', () => {
  const shortTc = stepSmoothedFraction(0, 0.01, 16, 80);
  const longTc = stepSmoothedFraction(0, 0.01, 16, 400);
  assert.ok(shortTc > longTc, 'short tc should respond faster');
});
