/**
 * `useSmoothedNavFraction` — dead-reckoning coverage.
 *
 * During the `routeProgress` silence that happens at ~1 Hz gaps (Android) or
 * whenever the matcher stalls (tunnels, overpasses, GPS outage), Apple Maps
 * keeps the puck moving by extrapolating along the last-known course + speed.
 * Mapbox Navigation Android ships the same idea as a `ConstantVelocityInterpolator`
 * on the puck. This test file exercises the pure `stepSmoothedFractionWithDeadReckoning`
 * helper — the same logic the hook runs every RAF tick.
 *
 * Cases:
 *   1. No dead-reckoning when the target is still changing (ease dominates).
 *   2. Dead-reckoning triggers only after `staleThresholdMs` of target stillness.
 *   3. Displacement per frame matches `speed × dt / polylineLengthMeters`.
 *   4. Dead-reckoning stops at `maxStaleMs` (never extrapolates forever).
 *   5. Never overshoots fraction 1.0 even if extrapolation would run past end.
 *   6. near-stationary speeds hold the puck still (red-light behaviour).
 *   7. When a new external target lands during silence, ease re-engages
 *      (verified by returning to ease-branch output when delta ≠ 0).
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { stepSmoothedFractionWithDeadReckoning } from './useSmoothedNavFraction';

const POLYLINE_LEN_M = 10_000; // 10 km route

test('1. no dead-reckoning while target is still changing (ease branch wins)', () => {
  const out = stepSmoothedFractionWithDeadReckoning({
    current: 0.10,
    target: 0.12,
    dtMs: 16,
    staleMs: 10_000, // far past threshold, but target !== current so ease fires
    speedMps: 25,
    polylineLengthMeters: POLYLINE_LEN_M,
  });
  assert.ok(out > 0.10 && out < 0.12, `expected ease toward 0.12, got ${out}`);
});

test('2. dead-reckoning does NOT fire before staleThresholdMs', () => {
  const out = stepSmoothedFractionWithDeadReckoning({
    current: 0.50,
    target: 0.50,
    dtMs: 16,
    staleMs: 200, // below default 350 ms
    speedMps: 25,
    polylineLengthMeters: POLYLINE_LEN_M,
  });
  assert.strictEqual(out, 0.50, `expected hold at 0.50, got ${out}`);
});

test('3. dead-reckoning displacement = speed × dt / polylineLength', () => {
  const speed = 25; // m/s (~56 mph)
  const dt = 100; // ms
  const expected = 0.50 + (speed * dt) / 1000 / POLYLINE_LEN_M;
  const out = stepSmoothedFractionWithDeadReckoning({
    current: 0.50,
    target: 0.50,
    dtMs: dt,
    staleMs: 1000,
    speedMps: speed,
    polylineLengthMeters: POLYLINE_LEN_M,
  });
  assert.ok(
    Math.abs(out - expected) < 1e-9,
    `expected ${expected}, got ${out}`,
  );
});

test('4. dead-reckoning stops at maxStaleMs (never runs forever)', () => {
  const out = stepSmoothedFractionWithDeadReckoning({
    current: 0.50,
    target: 0.50,
    dtMs: 16,
    staleMs: 5000, // past default 1400 ms cap
    speedMps: 25,
    polylineLengthMeters: POLYLINE_LEN_M,
  });
  assert.strictEqual(out, 0.50, `expected hold at 0.50 after cap, got ${out}`);
});

test('5. dead-reckoning never overshoots fraction 1.0', () => {
  const out = stepSmoothedFractionWithDeadReckoning({
    current: 0.999,
    target: 0.999,
    dtMs: 1000, // full second at highway speed would run past 1.0
    staleMs: 1000,
    speedMps: 30,
    polylineLengthMeters: 100, // very short route, so 30 m/s × 1 s = 30% of route
    maxStaleMs: 10_000,
  });
  assert.ok(out <= 1.0, `overshot: ${out}`);
  assert.strictEqual(out, 1.0, `expected clamp to 1.0, got ${out}`);
});

test('6. near-stationary speed holds the puck still (red-light guarantee)', () => {
  const out = stepSmoothedFractionWithDeadReckoning({
    current: 0.50,
    target: 0.50,
    dtMs: 16,
    staleMs: 3000,
    speedMps: 0.8,
    polylineLengthMeters: POLYLINE_LEN_M,
  });
  assert.strictEqual(out, 0.50, `stopped car drifted: ${out}`);
});

test('7. when a new target lands during silence, ease re-engages', () => {
  /**
   * Simulates the scenario: 2 s of SDK silence → the hook has dead-reckoned
   * forward a bit → a fresh tick lands with target ahead of displayed. The
   * next frame should be ease, not extrapolation.
   */
  const extrapolated = stepSmoothedFractionWithDeadReckoning({
    current: 0.50,
    target: 0.50,
    dtMs: 2000,
    staleMs: 2000,
    speedMps: 25,
    polylineLengthMeters: POLYLINE_LEN_M,
    maxStaleMs: 3000,
  });
  assert.ok(extrapolated > 0.50, `dead-reckoning did not fire: ${extrapolated}`);

  const eased = stepSmoothedFractionWithDeadReckoning({
    current: extrapolated,
    target: extrapolated + 0.003, // fresh target above displayed
    dtMs: 16,
    staleMs: 0, // just landed
    speedMps: 25,
    polylineLengthMeters: POLYLINE_LEN_M,
  });
  assert.ok(
    eased > extrapolated && eased < extrapolated + 0.003,
    `ease did not re-engage: ${eased}`,
  );
});

test('8. sub-threshold speed (≤ 1.2 m/s) freezes (avoids crawl-drift)', () => {
  const out = stepSmoothedFractionWithDeadReckoning({
    current: 0.50,
    target: 0.50,
    dtMs: 1000,
    staleMs: 1000,
    speedMps: 1.2, // GPS-level crawl/noise, not committed vehicle motion
    polylineLengthMeters: POLYLINE_LEN_M,
  });
  assert.strictEqual(out, 0.50, `crawl-drift triggered: ${out}`);
});

test('9. polylineLengthMeters <= 1 short-circuits dead-reckoning', () => {
  const out = stepSmoothedFractionWithDeadReckoning({
    current: 0.50,
    target: 0.50,
    dtMs: 16,
    staleMs: 1000,
    speedMps: 25,
    polylineLengthMeters: 0,
  });
  assert.strictEqual(out, 0.50, `degenerate polyline triggered DR: ${out}`);
});

test('10. explicit stationary freeze ignores a creeping target', () => {
  const out = stepSmoothedFractionWithDeadReckoning({
    current: 0.50,
    target: 0.505,
    dtMs: 1000,
    staleMs: 0,
    speedMps: 0,
    polylineLengthMeters: POLYLINE_LEN_M,
    freezeWhenStationary: true,
  });
  assert.strictEqual(out, 0.50, `stationary freeze allowed target creep: ${out}`);
});
