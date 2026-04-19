/**
 * `clampBearingToTangentDeg` — guards the camera bearing against course noise.
 *
 * Background: `location.course` from the Navigation SDK is a direction-of-
 * motion estimate. In practice it can drift 30–90° away from the actual
 * road direction during:
 *   - ramp pickup / merge (course briefly follows the previous road)
 *   - urban canyons (multipath fools the Doppler estimator)
 *   - low-speed crawl (course converges on noise)
 *   - matched-location overshoot (snaps to the next segment's heading a tick
 *     before the user physically enters it)
 *
 * Feeding an unfiltered course to `FollowWithCourse` manifests as the user's
 * reported complaint: "the camera tracks me sideways." Apple Maps and Mapbox's
 * own `NavigationCamera` both solve this by clamping the rendered bearing to
 * within ±45° of the forward route tangent (see
 * `BearingSmoothing.maximumBearingSmoothingAngle`). The route tangent is
 * always the "correct" direction in which to frame the road ahead.
 *
 * Invariants covered here:
 *
 *   1. Null / NaN tangent → pass-through (we can't clamp without a reference).
 *   2. Bearing within the cap → pass-through unchanged (cap never over-clamps).
 *   3. Bearing beyond the cap → clamped to exactly `tangent ± maxDeviation`.
 *   4. Shortest-angle semantics across the 0°/360° seam.
 *   5. `maxDeviation === 0` collapses bearing to tangent (degenerate but well-defined).
 *   6. Output always in `[0, 360)`.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clampBearingToTangentDeg } from './navSdkProgressAdapter';

test('1a. null tangent → pass-through (wrapped)', () => {
  const out = clampBearingToTangentDeg(120, null);
  assert.strictEqual(out, 120);
});

test('1b. NaN tangent → pass-through', () => {
  const out = clampBearingToTangentDeg(120, NaN);
  assert.strictEqual(out, 120);
});

test('1c. NaN bearing + valid tangent → returns tangent', () => {
  const out = clampBearingToTangentDeg(NaN, 90);
  assert.strictEqual(out, 90);
});

test('2. small deviation (<45°) passes through', () => {
  const out = clampBearingToTangentDeg(60, 90); // 30° off
  assert.strictEqual(out, 60);
});

test('3a. large positive deviation clamps to tangent + 45', () => {
  // bearing 180, tangent 90 → +90° off → clamp to 90 + 45 = 135
  const out = clampBearingToTangentDeg(180, 90);
  assert.strictEqual(out, 135);
});

test('3b. large negative deviation clamps to tangent − 45', () => {
  // bearing 0, tangent 90 → −90° off → clamp to 90 − 45 = 45
  const out = clampBearingToTangentDeg(0, 90);
  assert.strictEqual(out, 45);
});

test('4. wrap across 0°/360° seam uses shortest angle', () => {
  // tangent 5°, bearing 340° → shortest delta −25° (well within cap) → pass-through
  const a = clampBearingToTangentDeg(340, 5);
  assert.strictEqual(a, 340);

  // tangent 5°, bearing 200° → shortest delta +165° off, cap clamps to 5 − 45 = -40° → wrap to 320°
  const b = clampBearingToTangentDeg(200, 5);
  assert.strictEqual(b, 320);
});

test('5. maxDeviation = 0 collapses to tangent when out of bounds', () => {
  const out = clampBearingToTangentDeg(120, 90, 0);
  assert.strictEqual(out, 90);
});

test('6. output always in [0, 360)', () => {
  for (let tan = 0; tan < 360; tan += 13) {
    for (let bear = -720; bear <= 720; bear += 37) {
      const out = clampBearingToTangentDeg(bear, tan);
      assert.ok(
        out >= 0 && out < 360,
        `out of range for tan=${tan} bear=${bear}: ${out}`,
      );
    }
  }
});

test('7. custom maxDeviation honoured', () => {
  const out = clampBearingToTangentDeg(120, 90, 10);
  assert.strictEqual(out, 100); // clamp to 90 + 10
});
