/**
 * Heading-smoothing invariants for `navSdkProgressAdapter.smoothCourseDeg`.
 *
 * The "Apple Maps single frame" refactor feeds both the `NavSdkPuck` MarkerView
 * and Mapbox's `CustomLocationProvider` from the adapter's
 * `displayCoord.heading` — which is now the smoothed course (shortest-angle
 * EWMA). These tests lock in the invariants relied on by the presentation
 * layer:
 *
 *   1. First sample seeds the smoother; its output equals the raw input.
 *   2. At cruise speed (~20 m/s) a small delta is mostly absorbed (new value
 *      close to raw), so the puck tracks turns without lag.
 *   3. At slow speed (≤ 4 m/s) a small delta is heavily damped so the puck
 *      does not twitch on stationary GPS noise.
 *   4. A sharp turn (|Δ| ≥ 25°) bypasses damping — lane changes / U-turns
 *      apply instantly.
 *   5. Wrap-around near 0°/360° takes the shortest angle (359° → 1° should
 *      become ~0°, not ~180°).
 *   6. `resetHeadingSmoothing()` clears state so the next trip starts fresh.
 *
 * We exercise the *internal* smoother via the adapter's public output.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildNavigationProgressFromSdk,
  resetHeadingSmoothing,
} from './navSdkProgressAdapter';
import type { DirectionsStep } from '../lib/directions';

function step(instruction: string, lat = 37.77, lng = -122.42): DirectionsStep {
  return {
    instruction,
    distance: '',
    distanceMeters: 100,
    duration: '',
    durationSeconds: 20,
    maneuver: 'straight',
    lat,
    lng,
    name: 'Main St',
  };
}

const poly = [
  { lat: 37.77, lng: -122.42 },
  { lat: 37.771, lng: -122.419 },
];

function runTick(courseDeg: number, speedMps: number) {
  const prog = buildNavigationProgressFromSdk({
    progress: {
      distanceRemaining: 1000,
      distanceTraveled: 10,
      durationRemaining: 120,
      fractionTraveled: 0.05,
      stepIndex: 0,
      primaryInstruction: 'Continue',
      distanceToNextManeuverMeters: 100,
    },
    location: {
      latitude: 37.7701,
      longitude: -122.4199,
      course: courseDeg,
      speed: speedMps,
      horizontalAccuracy: 5,
      timestamp: Date.now(),
    },
    polyline: poly,
    steps: [step('Head north')],
  });
  assert.ok(prog, 'adapter returned null');
  assert.ok(prog.displayCoord, 'displayCoord missing');
  return prog.displayCoord;
}

test('first heading tick passes through (seeds the smoother)', () => {
  resetHeadingSmoothing();
  const out = runTick(42, 18);
  assert.ok(out.heading != null);
  assert.ok(Math.abs((out.heading as number) - 42) < 0.001);
});

test('cruise-speed small delta (~5°) is mostly passed through', () => {
  resetHeadingSmoothing();
  runTick(40, 20); // seed
  const out = runTick(45, 20);
  // At 20 m/s alpha ≈ 0.85, so heading moves ~4.25° toward 45
  const h = out.heading as number;
  assert.ok(h > 43.5 && h < 45, `cruise delta not pass-through: ${h}`);
});

test('slow-speed small delta (~5°) is heavily damped', () => {
  resetHeadingSmoothing();
  runTick(40, 2); // seed at walking pace
  const out = runTick(45, 2);
  // At ≤ 4 m/s alpha = 0.35 — heading should barely move
  const h = out.heading as number;
  assert.ok(h > 41 && h < 42.5, `slow delta not damped: ${h}`);
});

test('sharp turn (|Δ| ≥ 25°) bypasses damping at any speed', () => {
  resetHeadingSmoothing();
  runTick(0, 2);
  const sharp = runTick(30, 2); // 30° > 25° threshold
  const h = sharp.heading as number;
  assert.ok(Math.abs(h - 30) < 0.001, `sharp turn not instant: ${h}`);
});

test('wrap-around near 0°/360° uses shortest angle', () => {
  resetHeadingSmoothing();
  runTick(359, 20); // seed near north, going clockwise
  const out = runTick(1, 20); // raw delta looks -358°, shortest is +2°
  const h = out.heading as number;
  // Expected: wrap through 0°, land close to 1°, NOT ~180° or ~359°
  // With alpha ≈ 0.85 and shortest delta +2°, new heading ≈ 359 + 1.7 = 360.7 → 0.7°
  assert.ok(h < 3 || h > 358, `wrap-around failed — heading jumped to ${h}`);
});

test('resetHeadingSmoothing() forces the next tick to pass through', () => {
  resetHeadingSmoothing();
  runTick(90, 20); // seed east
  resetHeadingSmoothing();
  const out = runTick(180, 5);
  // After reset, 180° with no previous sample should seed → pass through
  const h = out.heading as number;
  assert.ok(Math.abs(h - 180) < 0.001, `reset did not clear state: ${h}`);
});

test('stale previous sample (> 2 s) bypasses damping', async () => {
  resetHeadingSmoothing();
  runTick(0, 2); // slow pace so small delta would normally damp
  // Spoof time by letting 2.1 s pass (node:test supports real timers cleanly here)
  await new Promise((r) => setTimeout(r, 2100));
  const out = runTick(10, 2);
  const h = out.heading as number;
  // Stale path seeds fresh → pass-through
  assert.ok(Math.abs(h - 10) < 0.001, `stale sample not flushed: ${h}`);
});

test('negative course (unknown) leaves heading undefined and does not update smoother', () => {
  resetHeadingSmoothing();
  runTick(90, 20); // seed
  const out = runTick(-1, 20); // negative course = unknown
  assert.equal(out.heading, undefined);
  // Next valid tick should still be damped against 90, proving smoother state held
  const after = runTick(95, 20);
  const h = after.heading as number;
  assert.ok(h > 90 && h < 95, `smoother state was lost across unknown tick: ${h}`);
});
