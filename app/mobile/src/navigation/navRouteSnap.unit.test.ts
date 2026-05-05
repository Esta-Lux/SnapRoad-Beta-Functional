/**
 * Tests for the pure route-snap helpers behind the upgraded puck pipeline.
 * These pin down the contract that:
 *   - the snapped coord lands on the polyline,
 *   - the corridor gate scales with GPS accuracy,
 *   - heading candidate is vehicle-first when moving (course vs tangent fork),
 *   - degenerate inputs return null without throwing.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ROUTE_GLUE_LATERAL_M,
  ROUTE_RELEASE_LATERAL_M,
  resolveHeadingCandidate,
  shouldGluePuckToRoute,
  snapPuckToRoute,
} from './navRouteSnap';
import type { Coordinate } from '../types';

/** Build a synthetic east-pointing polyline ~`segments` * 50m long, starting at SF. */
function eastPolyline(segments: number = 6): Coordinate[] {
  const lat0 = 37.7749;
  const lng0 = -122.4194;
  const dLngPerMeter = 1 / (111320 * Math.cos((lat0 * Math.PI) / 180));
  const stride = 50; // meters per segment
  const out: Coordinate[] = [];
  for (let i = 0; i <= segments; i += 1) {
    out.push({ lat: lat0, lng: lng0 + i * stride * dLngPerMeter });
  }
  return out;
}

/* ── snapPuckToRoute ─────────────────────────────────────────────────── */

test('snapPuckToRoute: degenerate inputs return null', () => {
  assert.equal(snapPuckToRoute(null, eastPolyline()), null);
  assert.equal(snapPuckToRoute({ lat: 37.77, lng: -122.42 }, null), null);
  assert.equal(snapPuckToRoute({ lat: 37.77, lng: -122.42 }, [{ lat: 0, lng: 0 }]), null);
  assert.equal(snapPuckToRoute({ lat: 0, lng: 0 }, eastPolyline()), null); // null-island guard
});

test('snapPuckToRoute: candidate ON the line snaps to itself with ~0 lateral', () => {
  const poly = eastPolyline(4);
  const candidate = { lat: poly[2]!.lat, lng: poly[2]!.lng + 1e-7 };
  const snap = snapPuckToRoute(candidate, poly)!;
  assert.ok(snap, 'snap is defined');
  assert.ok(snap.lateralMeters < 1, `lateral very small (got ${snap.lateralMeters}m)`);
  assert.equal(snap.withinCorridor, true);
  assert.equal(snap.shouldRelease, false);
  assert.ok(typeof snap.tangentDeg === 'number');
  // East-pointing tangent ≈ 90°
  assert.ok(Math.abs(snap.tangentDeg! - 90) < 5, `tangent ~90°, got ${snap.tangentDeg}`);
});

test('snapPuckToRoute: 12m off → still inside corridor (default 22m)', () => {
  const poly = eastPolyline(4);
  // Move ~12m north from a vertex on the line.
  const offNorth = 12 / 111320;
  const candidate = { lat: poly[2]!.lat + offNorth, lng: poly[2]!.lng };
  const snap = snapPuckToRoute(candidate, poly)!;
  assert.ok(Math.abs(snap.lateralMeters - 12) < 2);
  assert.equal(snap.withinCorridor, true);
});

test('snapPuckToRoute: 60m off → outside corridor, not yet released', () => {
  const poly = eastPolyline(4);
  const offNorth = 60 / 111320;
  const candidate = { lat: poly[2]!.lat + offNorth, lng: poly[2]!.lng };
  const snap = snapPuckToRoute(candidate, poly)!;
  assert.ok(snap.lateralMeters >= 50 && snap.lateralMeters <= 70);
  assert.equal(snap.withinCorridor, false);
  assert.equal(snap.shouldRelease, false);
});

test('snapPuckToRoute: 120m off → released', () => {
  const poly = eastPolyline(4);
  const offNorth = 120 / 111320;
  const candidate = { lat: poly[2]!.lat + offNorth, lng: poly[2]!.lng };
  const snap = snapPuckToRoute(candidate, poly)!;
  assert.equal(snap.shouldRelease, true);
});

test('snapPuckToRoute: poor GPS accuracy widens the corridor', () => {
  const poly = eastPolyline(4);
  const offNorth = 35 / 111320; // outside default 22m, inside accuracy-loose
  const candidate = { lat: poly[2]!.lat + offNorth, lng: poly[2]!.lng };
  const tight = snapPuckToRoute(candidate, poly)!;
  assert.equal(tight.withinCorridor, false, 'tight HAcc → outside default corridor');
  const loose = snapPuckToRoute(candidate, poly, { accuracyM: 50 })!;
  assert.equal(loose.withinCorridor, true, '50m HAcc widens corridor enough to glue');
});

test('shouldGluePuckToRoute: handles null', () => {
  assert.equal(shouldGluePuckToRoute(null), false);
});

/* ── resolveHeadingCandidate ─────────────────────────────────────────── */

test('resolveHeadingCandidate: on-corridor, moving, course agrees → use SDK course', () => {
  const poly = eastPolyline();
  const snap = snapPuckToRoute({ lat: poly[1]!.lat, lng: poly[1]!.lng }, poly)!;
  const out = resolveHeadingCandidate({ snap, sdkCourseDeg: 92, speedMps: 8 });
  assert.equal(out, 92);
});

test('resolveHeadingCandidate: on-corridor, moving, course disagrees → use route tangent', () => {
  const poly = eastPolyline();
  const snap = snapPuckToRoute({ lat: poly[1]!.lat, lng: poly[1]!.lng }, poly)!;
  // SDK reports 200° (south-westish) but the road is going east — trust route.
  const out = resolveHeadingCandidate({ snap, sdkCourseDeg: 200, speedMps: 8 });
  assert.ok(out != null && Math.abs(out - 90) < 6, `expected ~90° tangent, got ${out}`);
});

test('resolveHeadingCandidate: stopped (no course, slow speed) returns null when no fallback', () => {
  const out = resolveHeadingCandidate({ snap: null, sdkCourseDeg: -1, speedMps: 0 });
  assert.equal(out, null);
});

test('resolveHeadingCandidate: stopped on-corridor falls back to tangent if course missing', () => {
  const poly = eastPolyline();
  const snap = snapPuckToRoute({ lat: poly[1]!.lat, lng: poly[1]!.lng }, poly)!;
  const out = resolveHeadingCandidate({ snap, sdkCourseDeg: null, speedMps: 0.2 });
  assert.ok(out != null && Math.abs(out - 90) < 6);
});

test('thresholds are sensible (regression guard)', () => {
  assert.ok(ROUTE_GLUE_LATERAL_M < ROUTE_RELEASE_LATERAL_M);
  assert.ok(ROUTE_GLUE_LATERAL_M >= 12 && ROUTE_GLUE_LATERAL_M <= 30);
  assert.ok(ROUTE_RELEASE_LATERAL_M >= 70 && ROUTE_RELEASE_LATERAL_M <= 130);
});
