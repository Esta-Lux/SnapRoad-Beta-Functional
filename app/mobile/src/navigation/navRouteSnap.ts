/**
 * `navRouteSnap` — pure helpers that **glue the puck to the route polyline**.
 *
 * The previous puck pipeline took the SDK's matched coordinate (or the
 * smoothed polyline-arc-length point from `useSmoothedNavFraction`) and
 * leashed it toward raw GPS when the two diverged. That kept the puck
 * close to the user's true location, but it also meant the puck was
 * frequently *off* the drawn route line — at standstill the matched
 * point would creep, GPS noise would tug it, and the chevron visibly
 * floated.
 *
 * This module fixes that by collapsing the candidate down to a single,
 * deterministic source: the **closest point on the route polyline** to
 * the truth signal (matched if available, else GPS). When the lateral
 * distance is small (we're "on the corridor"), the puck is *pinned* to
 * the route line — it cannot drift sideways. When lateral distance is
 * large (we're truly off-route — phantom snap, parallel road), the
 * caller is told and falls back to its existing leash.
 *
 * Outputs:
 *
 *   - `snappedCoord` — closest point on the polyline (always finite)
 *   - `lateralMeters` — orthogonal distance from candidate to the line
 *   - `cumFromStartMeters` — arc length from polyline[0] to the snap
 *   - `tangentDeg` — route bearing at the snap (puck arrow target when moving)
 *   - `withinCorridor` — true iff lateral distance is inside the "glue" band
 *
 * Everything is pure (no React, no `Date.now()`, no module state) so the
 * upstream `MapScreen` puck `useMemo` and the unit tests share the same
 * contract.
 */

import type { Coordinate } from '../types';
import { projectOntoPolyline, tangentBearingAlongPolyline } from '../utils/distance';

/**
 * Lateral distance (meters) at which we **pin** the puck to the route
 * line. Below this it visibly rides the polyline regardless of GPS jitter.
 * 22 m comfortably contains a divided road's gutter-to-gutter width plus
 * 5–10 m of typical urban GPS noise on a good fix.
 */
export const ROUTE_GLUE_LATERAL_M = 22;

/**
 * Above this lateral distance we treat the user as "really off the
 * corridor" and stop pinning. This is *not* the reroute trigger (that's
 * higher and dwell-gated in {@link useDriveNavigation}); this just hands
 * the puck back to the GPS-leash.
 */
export const ROUTE_RELEASE_LATERAL_M = 90;

/**
 * Per-meter loosening of the glue band when GPS accuracy is poor (HAcc).
 * A 50 m HAcc fix should not be force-pinned to a tiny corridor.
 */
const ACCURACY_LOOSEN_FACTOR = 0.55;
const ACCURACY_LOOSEN_CAP_M = 36;

/**
 * The minimum sample speed (m/s) at which a snapped tangent is a stronger
 * heading signal than the SDK's GPS course. Below this we generally hold
 * the prior heading via the stabilizer.
 */
export const TANGENT_PREFERRED_SPEED_MPS = 1.4;

export type RouteSnap = {
  snappedCoord: Coordinate;
  lateralMeters: number;
  cumFromStartMeters: number;
  tangentDeg: number | null;
  /** True when the lateral distance is inside the glue band given accuracy. */
  withinCorridor: boolean;
  /** True when the candidate is far enough that the route-snap should be released. */
  shouldRelease: boolean;
};

function isFiniteCoord(c: Coordinate | null | undefined): c is Coordinate {
  return (
    !!c &&
    Number.isFinite(c.lat) &&
    Number.isFinite(c.lng) &&
    !(Math.abs(c.lat) < 1e-7 && Math.abs(c.lng) < 1e-7)
  );
}

function corridorThresholdM(accuracyM: number | null | undefined): number {
  if (typeof accuracyM !== 'number' || !Number.isFinite(accuracyM) || accuracyM <= 0) {
    return ROUTE_GLUE_LATERAL_M;
  }
  return ROUTE_GLUE_LATERAL_M + Math.min(ACCURACY_LOOSEN_CAP_M, accuracyM * ACCURACY_LOOSEN_FACTOR);
}

function releaseThresholdM(accuracyM: number | null | undefined): number {
  if (typeof accuracyM !== 'number' || !Number.isFinite(accuracyM) || accuracyM <= 0) {
    return ROUTE_RELEASE_LATERAL_M;
  }
  return ROUTE_RELEASE_LATERAL_M + Math.min(60, accuracyM * 0.6);
}

/**
 * Snap `candidate` to its closest point on `polyline` and return the
 * full snap descriptor. Returns `null` for degenerate inputs (no
 * polyline, no candidate). The decision of whether to *use* the snap
 * (vs falling back to leash/GPS) is left to {@link shouldGluePuckToRoute}.
 */
export function snapPuckToRoute(
  candidate: Coordinate | null | undefined,
  polyline: Coordinate[] | null | undefined,
  opts?: { accuracyM?: number | null; tangentLookAheadM?: number },
): RouteSnap | null {
  if (!isFiniteCoord(candidate)) return null;
  if (!polyline || polyline.length < 2) return null;
  const proj = projectOntoPolyline(candidate, polyline);
  if (!proj) return null;

  const lookAhead = opts?.tangentLookAheadM ?? 18;
  const tangent = tangentBearingAlongPolyline(polyline, proj.cumFromStartMeters, lookAhead);

  const corridor = corridorThresholdM(opts?.accuracyM);
  const release = releaseThresholdM(opts?.accuracyM);
  const lateral = proj.distanceToRouteMeters;

  return {
    snappedCoord: proj.snapCoord,
    lateralMeters: lateral,
    cumFromStartMeters: proj.cumFromStartMeters,
    tangentDeg:
      typeof tangent === 'number' && Number.isFinite(tangent)
        ? ((tangent % 360) + 360) % 360
        : null,
    withinCorridor: lateral <= corridor,
    shouldRelease: lateral >= release,
  };
}

/**
 * Boolean predicate: is the puck close enough to the polyline that we
 * should *pin* to it (publish `snappedCoord` instead of the candidate)?
 */
export function shouldGluePuckToRoute(snap: RouteSnap | null): boolean {
  if (!snap) return false;
  return snap.withinCorridor;
}

/**
 * Resolve the heading the upstream stabilizer should consume. We prefer
 * the route tangent when:
 *   - we are within the corridor (so the road direction is meaningful),
 *   - and we are moving fast enough that course-over-ground is reliable.
 *
 * Otherwise we hand back the SDK course, which the stabilizer will hold
 * / rate-limit / freeze as appropriate.
 */
export function resolveHeadingCandidate(input: {
  snap: RouteSnap | null;
  sdkCourseDeg: number | null;
  speedMps: number | null;
}): number | null {
  const { snap, sdkCourseDeg, speedMps } = input;
  const course =
    typeof sdkCourseDeg === 'number' && Number.isFinite(sdkCourseDeg) && sdkCourseDeg >= 0
      ? ((sdkCourseDeg % 360) + 360) % 360
      : null;
  const moving =
    typeof speedMps === 'number' && Number.isFinite(speedMps) && speedMps >= TANGENT_PREFERRED_SPEED_MPS;

  if (snap?.withinCorridor && snap.tangentDeg != null && moving) {
    if (course == null) return snap.tangentDeg;
    // When SDK course agrees with tangent (within ±35°), use SDK to keep
    // micro-fluctuations natural. When they disagree (matcher cross-talk
    // at a fork), trust the route tangent — the user is on this route.
    const delta = Math.abs(((course - snap.tangentDeg + 540) % 360) - 180);
    if (delta <= 35) return course;
    return snap.tangentDeg;
  }

  if (course != null) return course;
  if (snap?.tangentDeg != null) return snap.tangentDeg;
  return null;
}
