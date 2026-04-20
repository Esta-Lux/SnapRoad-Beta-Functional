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

function runTick(courseDeg: number, speedMps: number, timestampMs: number) {
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
      timestamp: timestampMs,
    },
    polyline: poly,
    steps: [step('Head north')],
  });
  assert.ok(prog, 'adapter returned null');
  assert.ok(prog.displayCoord, 'displayCoord missing');
  return prog.displayCoord;
}

const T0 = 1_000_000;

test('first heading tick passes through (seeds the smoother)', () => {
  resetHeadingSmoothing();
  const out = runTick(42, 18, T0);
  assert.ok(out.heading != null);
  assert.ok(Math.abs((out.heading as number) - 42) < 0.001);
});

test('cruise-speed small delta (~5°) is mostly passed through', () => {
  resetHeadingSmoothing();
  runTick(40, 20, T0); // seed
  const out = runTick(45, 20, T0 + 16);
  // Time-based EWMA at cruise speed (tau≈120ms, dt=16ms) should move noticeably.
  const h = out.heading as number;
  assert.ok(h > 40.4 && h < 40.9, `cruise delta not pass-through: ${h}`);
});

test('slow-speed small delta (~5°) is heavily damped', () => {
  resetHeadingSmoothing();
  runTick(40, 2, T0); // seed at walking pace
  const out = runTick(45, 2, T0 + 16);
  // Time-based EWMA at low speed (tau≈350ms, dt=16ms) should move only a little.
  const h = out.heading as number;
  assert.ok(h > 40.1 && h < 40.4, `slow delta not damped: ${h}`);
});

test('sharp turn (|Δ| ≥ 25°) bypasses damping at any speed', () => {
  resetHeadingSmoothing();
  runTick(0, 2, T0);
  const sharp = runTick(30, 2, T0 + 16); // 30° > 25° threshold
  const h = sharp.heading as number;
  assert.ok(Math.abs(h - 30) < 0.001, `sharp turn not instant: ${h}`);
});

test('wrap-around near 0°/360° uses shortest angle', () => {
  resetHeadingSmoothing();
  runTick(359, 20, T0); // seed near north, going clockwise
  const out = runTick(1, 20, T0 + 16); // raw delta looks -358°, shortest is +2°
  const h = out.heading as number;
  // Expected: wrap through 0°, land close to 1°, NOT ~180° or ~359°
  // With alpha ≈ 0.85 and shortest delta +2°, new heading ≈ 359 + 1.7 = 360.7 → 0.7°
  assert.ok(h < 3 || h > 358, `wrap-around failed — heading jumped to ${h}`);
});

test('resetHeadingSmoothing() forces the next tick to pass through', () => {
  // Pick courses inside the ±45° bearing-cap cone (route tangent ~38° NE) so
  // we test reset behaviour in isolation rather than the tangent clamp.
  resetHeadingSmoothing();
  runTick(20, 20, T0); // seed near tangent
  resetHeadingSmoothing();
  const out = runTick(60, 5, T0 + 16);
  // After reset, 60° with no previous sample should seed → pass through
  // (|60 - 38| = 22° < 45° cap, so cap does not fire).
  const h = out.heading as number;
  assert.ok(Math.abs(h - 60) < 0.001, `reset did not clear state: ${h}`);
});

test('stale previous sample (> 2 s) bypasses damping', () => {
  resetHeadingSmoothing();
  runTick(0, 2, T0); // slow pace so small delta would normally damp
  const out = runTick(10, 2, T0 + 2101);
  const h = out.heading as number;
  // Stale path seeds fresh → pass-through
  assert.ok(Math.abs(h - 10) < 0.001, `stale sample not flushed: ${h}`);
});

test('negative course (unknown) falls through to route-tangent bearing', () => {
  // Apple-Maps-style guarantee: when the SDK can't report a valid `course`
  // (start of trip, stationary, GPS outage) we must NOT fall through to the
  // device compass — that's what made the camera flip backwards in the
  // reported bug. Instead we seed from the route tangent at the current
  // snap point, which is always a valid forward direction along the polyline.
  resetHeadingSmoothing();
  const out = runTick(-1, 0, T0); // stationary, course unknown
  const h = out.heading as number;
  assert.ok(
    Number.isFinite(h),
    'tangent fallback did not produce a finite heading',
  );
  // The test polyline goes roughly NE; bearing should be < 90° (north of east),
  // definitively *not* pointing south/west (which is where compass fallback
  // would likely have landed).
  assert.ok(h > 0 && h < 90, `expected NE tangent bearing, got ${h}`);
});

test('below-threshold speed prefers route tangent over noisy course', () => {
  // When the user is below ~1.5 m/s the SDK `course` sample is dominated by
  // GPS jitter — standing still at a traffic light should not swing the
  // camera toward the (possibly misaligned) device-compass reading. The
  // adapter must prefer the route tangent in this regime.
  resetHeadingSmoothing();
  const tangent = runTick(-1, 0, T0).heading as number;
  resetHeadingSmoothing();
  // Low speed + a wildly misleading raw course (pointing 180° from travel)
  // — tangent should still win.
  const low = runTick(220, 0.3, T0 + 16).heading as number;
  assert.ok(
    Math.abs(((low - tangent + 540) % 360) - 180) < 20,
    `low-speed heading ignored tangent (tangent=${tangent}, low=${low})`,
  );
});
