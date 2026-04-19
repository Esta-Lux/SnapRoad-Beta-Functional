import type { Coordinate } from '../types';
import type { DirectionsStep } from '../lib/directions';

export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function metersBetween(a: Coordinate, b: Coordinate): number {
  return haversineMeters(a.lat, a.lng, b.lat, b.lng);
}

/** Forward azimuth from `from` to `to` in degrees (0 = north, 90 = east). */
export function bearingDeg(from: Coordinate, to: Coordinate): number {
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const x = Math.sin(dLng) * Math.cos(lat2);
  const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(x, y) * 180) / Math.PI + 360) % 360;
}

export function formatDistance(miles: number): string {
  if (miles < 0.1) return `${Math.round(miles * 5280)} ft`;
  return `${miles.toFixed(1)} mi`;
}

/** Full orthogonal projection of a point onto a route polyline — single source for nav progress, split, and ETA. */
export type PolylineProjection = {
  segmentIndex: number;
  tOnSegment: number;
  snapCoord: Coordinate;
  /** Shortest distance from the raw point to the polyline (meters). */
  distanceToRouteMeters: number;
  /** Distance along the polyline from the first vertex to the snap point. */
  cumFromStartMeters: number;
  /** Distance along the polyline from the snap point to the last vertex. */
  remainingToEndMeters: number;
};

export type HysteresisMatchState = {
  segmentIndex: number;
  cumFromStartMeters: number;
};

export type PolylineMapMatch = PolylineProjection & {
  score: number;
  headingDeltaDeg: number | null;
  usedHysteresis: boolean;
};

function angularDeltaDeg(a: number, b: number): number {
  return Math.abs(((a - b + 540) % 360) - 180);
}

function projectOntoSegment(
  point: Coordinate,
  polyline: Coordinate[],
  prefixMeters: number[],
  segmentIndex: number,
): PolylineProjection {
  const a = polyline[segmentIndex]!;
  const b = polyline[segmentIndex + 1]!;
  const latScale = 111320;
  const lngScale = 111320 * Math.cos((point.lat * Math.PI) / 180);
  const px = point.lng * lngScale;
  const py = point.lat * latScale;
  const ax = a.lng * lngScale;
  const ay = a.lat * latScale;
  const bx = b.lng * lngScale;
  const by = b.lat * latScale;
  const abx = bx - ax;
  const aby = by - ay;
  const ab2 = abx * abx + aby * aby;
  const t = ab2 > 1e-10 ? Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / ab2)) : 0;
  const qx = ax + abx * t;
  const qy = ay + aby * t;
  const distanceToRouteMeters = Math.hypot(px - qx, py - qy);
  const segLen = haversineMeters(a.lat, a.lng, b.lat, b.lng);
  const cumFromStartMeters = prefixMeters[segmentIndex]! + segLen * t;
  const totalMeters = prefixMeters[prefixMeters.length - 1] ?? 0;

  return {
    segmentIndex,
    tOnSegment: t,
    snapCoord: {
      lat: a.lat + t * (b.lat - a.lat),
      lng: a.lng + t * (b.lng - a.lng),
    },
    distanceToRouteMeters,
    cumFromStartMeters,
    remainingToEndMeters: Math.max(0, totalMeters - cumFromStartMeters),
  };
}

function buildPrefixMeters(polyline: Coordinate[]): number[] {
  const prefix: number[] = [0];
  let total = 0;
  for (let i = 0; i < polyline.length - 1; i++) {
    total += haversineMeters(polyline[i]!.lat, polyline[i]!.lng, polyline[i + 1]!.lat, polyline[i + 1]!.lng);
    prefix.push(total);
  }
  return prefix;
}

function scoreProjectedCandidate(
  projection: PolylineProjection,
  polyline: Coordinate[],
  prevMatch: HysteresisMatchState | null | undefined,
  headingDeg?: number | null,
  maxBackwardMeters = 10,
): PolylineMapMatch {
  const segStart = polyline[projection.segmentIndex]!;
  const segEnd = polyline[projection.segmentIndex + 1]!;
  const segBearing = bearingDeg(segStart, segEnd);
  const headingDeltaDeg =
    headingDeg != null && Number.isFinite(headingDeg) ? angularDeltaDeg(segBearing, headingDeg) : null;
  const backwardMeters =
    prevMatch != null
      ? Math.max(0, prevMatch.cumFromStartMeters - projection.cumFromStartMeters)
      : 0;
  const distancePenalty = projection.distanceToRouteMeters;
  const headingPenalty =
    headingDeltaDeg == null
      ? 0
      : headingDeltaDeg > 100
        ? 44
        : headingDeltaDeg > 75
          ? 24
          : headingDeltaDeg > 50
            ? 10
            : headingDeltaDeg > 30
              ? 4
              : 0;
  const backwardPenalty =
    backwardMeters > maxBackwardMeters
      ? 90 + (backwardMeters - maxBackwardMeters) * 1.9
      : backwardMeters * 2.2;
  return {
    ...projection,
    score: distancePenalty + headingPenalty + backwardPenalty,
    headingDeltaDeg,
    usedHysteresis: false,
  };
}

export function projectOntoPolylineWithHysteresis(
  point: Coordinate,
  polyline: Coordinate[],
  opts?: {
    prevMatch?: HysteresisMatchState | null;
    headingDeg?: number | null;
    maxBackwardMeters?: number;
    hysteresisMeters?: number;
    segmentWindow?: number;
  },
): PolylineMapMatch | null {
  if (polyline.length < 2) return null;

  const prevMatch = opts?.prevMatch ?? null;
  const maxBackwardMeters = opts?.maxBackwardMeters ?? 10;
  const hysteresisMeters = opts?.hysteresisMeters ?? 9;
  const segmentWindow = opts?.segmentWindow ?? 10;
  const prefixMeters = buildPrefixMeters(polyline);
  const lastSeg = polyline.length - 2;

  let start = 0;
  let end = lastSeg;
  if (prevMatch) {
    start = Math.max(0, prevMatch.segmentIndex - 2);
    end = Math.min(lastSeg, prevMatch.segmentIndex + segmentWindow);
  }

  let best: PolylineMapMatch | null = null;
  for (let i = start; i <= end; i++) {
    const candidate = scoreProjectedCandidate(
      projectOntoSegment(point, polyline, prefixMeters, i),
      polyline,
      prevMatch,
      opts?.headingDeg,
      maxBackwardMeters,
    );
    if (!best || candidate.score < best.score) best = candidate;
  }

  if (!best) return null;
  if (!prevMatch) return best;

  const holdStart = Math.max(0, prevMatch.segmentIndex - 1);
  const holdEnd = Math.min(lastSeg, prevMatch.segmentIndex + 1);
  let holdBest: PolylineMapMatch | null = null;
  for (let i = holdStart; i <= holdEnd; i++) {
    const candidate = scoreProjectedCandidate(
      projectOntoSegment(point, polyline, prefixMeters, i),
      polyline,
      prevMatch,
      opts?.headingDeg,
      maxBackwardMeters,
    );
    if (!holdBest || candidate.score < holdBest.score) holdBest = candidate;
  }

  if (
    holdBest &&
    holdBest.cumFromStartMeters + maxBackwardMeters >= prevMatch.cumFromStartMeters &&
    holdBest.score <= best.score + hysteresisMeters
  ) {
    return { ...holdBest, usedHysteresis: holdBest.segmentIndex !== best.segmentIndex };
  }

  return best;
}

/**
 * Project `point` onto `polyline` (closest segment, clamped). All navigation consumers should use this
 * instead of duplicating flat-earth segment loops.
 */
export function projectOntoPolyline(point: Coordinate, polyline: Coordinate[]): PolylineProjection | null {
  if (!polyline.length || polyline.length < 2) return null;

  const latScale = 111320;
  const lngScale = 111320 * Math.cos((point.lat * Math.PI) / 180);
  const px = point.lng * lngScale;
  const py = point.lat * latScale;

  let bestDist = Number.POSITIVE_INFINITY;
  let bestI = 0;
  let bestT = 0;

  for (let i = 0; i < polyline.length - 1; i++) {
    const a = polyline[i];
    const b = polyline[i + 1];
    const ax = a.lng * lngScale;
    const ay = a.lat * latScale;
    const bx = b.lng * lngScale;
    const by = b.lat * latScale;
    const abx = bx - ax;
    const aby = by - ay;
    const ab2 = abx * abx + aby * aby;
    const t = ab2 > 1e-10 ? Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / ab2)) : 0;
    const qx = ax + abx * t;
    const qy = ay + aby * t;
    const d = Math.hypot(px - qx, py - qy);
    if (d < bestDist) {
      bestDist = d;
      bestI = i;
      bestT = t;
    }
  }

  const a = polyline[bestI];
  const b = polyline[bestI + 1];
  const segLen = haversineMeters(a.lat, a.lng, b.lat, b.lng);

  let cumFromStart = bestT * segLen;
  for (let i = 0; i < bestI; i++) {
    const p = polyline[i];
    const q = polyline[i + 1];
    cumFromStart += haversineMeters(p.lat, p.lng, q.lat, q.lng);
  }

  let remainingToEnd = (1 - bestT) * segLen;
  for (let j = bestI + 1; j < polyline.length - 1; j++) {
    const p = polyline[j];
    const q = polyline[j + 1];
    remainingToEnd += haversineMeters(p.lat, p.lng, q.lat, q.lng);
  }

  const snapCoord: Coordinate = {
    lat: a.lat + bestT * (b.lat - a.lat),
    lng: a.lng + bestT * (b.lng - a.lng),
  };

  return {
    segmentIndex: bestI,
    tOnSegment: bestT,
    snapCoord,
    distanceToRouteMeters: bestDist,
    cumFromStartMeters: Math.max(0, cumFromStart),
    remainingToEndMeters: Math.max(0, remainingToEnd),
  };
}

export function distanceToPolyline(point: Coordinate, polyline: Coordinate[]): number {
  const p = projectOntoPolyline(point, polyline);
  return p ? p.distanceToRouteMeters : Infinity;
}

/**
 * Closest point on the polyline (orthogonal projection onto segments) and distance in meters.
 * Uses the same projection as {@link distanceToPolyline}.
 */
export function closestPointOnPolyline(
  point: Coordinate,
  polyline: Coordinate[],
): { coord: Coordinate; distanceMeters: number } {
  const p = projectOntoPolyline(point, polyline);
  if (!p) return { coord: point, distanceMeters: Number.POSITIVE_INFINITY };
  return { coord: p.snapCoord, distanceMeters: p.distanceToRouteMeters };
}

/**
 * While on-route, snap the user position to the polyline for **display only** (route ahead/behind split).
 * Prefer {@link projectOntoPolyline} / nav `routeProgress` so puck split and progress share one projection.
 */
export function snapUserToRouteForDisplay(
  user: Coordinate,
  polyline: Coordinate[] | null | undefined,
  maxDistanceMeters: number,
): Coordinate {
  if (!polyline || polyline.length < 2) return user;
  const p = projectOntoPolyline(user, polyline);
  if (!p || !Number.isFinite(p.distanceToRouteMeters) || p.distanceToRouteMeters > maxDistanceMeters) {
    return user;
  }
  return p.snapCoord;
}

/**
 * Find the nearest vertex on a polyline to a given point.
 * Returns the index and distance.
 */
export function nearestPointOnPolyline(
  point: Coordinate,
  polyline: Coordinate[],
): { index: number; distance: number } {
  let bestIdx = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < polyline.length; i++) {
    const d = haversineMeters(point.lat, point.lng, polyline[i].lat, polyline[i].lng);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return { index: bestIdx, distance: bestDist };
}

/**
 * Compute the remaining distance along a polyline from the closest point on the route to the end.
 * Projects the user onto the best-matching segment (not just nearest vertex) for stable ETA/distance.
 * Returns meters.
 */
export function remainingDistanceOnPolyline(
  user: Coordinate,
  polyline: Coordinate[],
): number {
  const p = projectOntoPolyline(user, polyline);
  return p ? p.remainingToEndMeters : 0;
}

/**
 * Distance along the polyline from `from`’s projection to `to`’s projection (meters).
 * Falls back to haversine if projections reorder (e.g. target behind user along line).
 */
export function alongRouteDistanceMeters(
  polyline: Coordinate[],
  from: Coordinate,
  to: Coordinate,
): number {
  if (polyline.length < 2) {
    return haversineMeters(from.lat, from.lng, to.lat, to.lng);
  }
  const a = projectOntoPolyline(from, polyline);
  const b = projectOntoPolyline(to, polyline);
  if (!a || !b) return haversineMeters(from.lat, from.lng, to.lat, to.lng);
  const d = b.cumFromStartMeters - a.cumFromStartMeters;
  if (d >= -2) return Math.max(0, d);
  return haversineMeters(from.lat, from.lng, to.lat, to.lng);
}

/** Single progress snapshot for turn-by-turn: ties ETA, split, off-route, and maneuver distances together. */
export type NavigationRouteProgress = PolylineProjection & {
  remainingRouteMeters: number;
  traveledRouteMeters: number;
};

/**
 * Combine Mapbox `route.distance` with polyline projection. Traveled/remaining for step indexing follow
 * `duration`/`distance` totals; split/ETA/voice use the same projection as `remainingToEndMeters`.
 */
export function computeNavigationRouteProgress(
  user: Coordinate,
  polyline: Coordinate[] | null | undefined,
  routeDistanceMetersApi: number,
): NavigationRouteProgress | null {
  if (!polyline || polyline.length < 2) return null;
  const base = projectOntoPolyline(user, polyline);
  if (!base) return null;
  const total = routeDistanceMetersApi;
  const traveledRouteMeters =
    total > 0
      ? Math.max(0, Math.min(total, total - base.remainingToEndMeters))
      : base.cumFromStartMeters;
  return {
    ...base,
    remainingRouteMeters: base.remainingToEndMeters,
    traveledRouteMeters,
  };
}

/** Total path length of the route polyline (meters). */
export function polylineLengthMeters(polyline: Coordinate[]): number {
  if (polyline.length < 2) return 0;
  let len = 0;
  for (let i = 0; i < polyline.length - 1; i++) {
    const a = polyline[i]!;
    const b = polyline[i + 1]!;
    len += haversineMeters(a.lat, a.lng, b.lat, b.lng);
  }
  return len;
}

/**
 * Forward-looking tangent bearing at a point along a polyline, expressed in
 * degrees (0 = north, 90 = east). This is what Mapbox Navigation's own
 * NavigationCamera uses for the camera bearing when the driver is stationary
 * or `location.course` is unreliable (e.g. start of trip, red light,
 * pedestrian-mode pause): the direction the upcoming road segment points,
 * *not* the noisy device compass.
 *
 * We average over a small look-ahead window (default 12 m ≈ one car length)
 * so that vertex-adjacent segments don't flip the bearing by ±30°. When the
 * look-ahead falls off the end of the route we reuse the last segment so the
 * arrival arrow still points along the final leg.
 *
 * Returns `null` only when the polyline has <2 points.
 */
export function tangentBearingAlongPolyline(
  polyline: Coordinate[],
  cumMeters: number,
  lookAheadMeters = 12,
): number | null {
  if (polyline.length < 2) return null;
  const total = polylineLengthMeters(polyline);
  if (!Number.isFinite(total) || total <= 0) return bearingDeg(polyline[0]!, polyline[1]!);
  const startCum = Math.max(0, Math.min(total, cumMeters));
  const endCum = Math.max(0, Math.min(total, startCum + Math.max(1, lookAheadMeters)));
  const startPt = coordinateAtCumulativeMeters(polyline, startCum);
  const endPt = coordinateAtCumulativeMeters(polyline, endCum);
  if (!startPt || !endPt) return bearingDeg(polyline[0]!, polyline[1]!);
  if (haversineMeters(startPt.lat, startPt.lng, endPt.lat, endPt.lng) < 1e-3) {
    const seg = segmentAndTFromCumAlongPolyline(startCum, polyline);
    if (seg) {
      const a = polyline[seg.segmentIndex]!;
      const b = polyline[Math.min(polyline.length - 1, seg.segmentIndex + 1)]!;
      if (haversineMeters(a.lat, a.lng, b.lat, b.lng) > 1e-3) return bearingDeg(a, b);
    }
    return bearingDeg(polyline[polyline.length - 2]!, polyline[polyline.length - 1]!);
  }
  return bearingDeg(startPt, endPt);
}

/**
 * Cumulative distance at the end of each Mapbox step, using per-step geometry when present
 * (aligned with the same route polyline as projection), else `distanceMeters`.
 */
export function stepEndCumulativeMeters(steps: DirectionsStep[]): number[] {
  const ends: number[] = [];
  let cum = 0;
  for (const step of steps) {
    const g = step.geometryCoordinates;
    let len = 0;
    if (g && g.length >= 2) {
      for (let i = 0; i < g.length - 1; i++) {
        len += haversineMeters(g[i]![1], g[i]![0], g[i + 1]![1], g[i + 1]![0]);
      }
    }
    if (len < 0.5 && (step.distanceMeters ?? 0) > 0) {
      len = step.distanceMeters ?? 0;
    }
    cum += len;
    ends.push(cum);
  }
  return ends;
}

/**
 * Current step index from distance along the polyline (`cumFromStartMeters` from {@link projectOntoPolyline}),
 * keeping turn cards / lanes in sync with the rendered route.
 *
 * When `prevStepIndex` is supplied the function applies forward-only hysteresis:
 * the index can only regress if the user is more than `hysteresisBackM` meters
 * before the previous step boundary. This prevents oscillation at maneuver points
 * caused by ±10 m GPS jitter.
 *
 * @param steps Mapbox directions steps for the active route.
 * @param cumAlongPolylineMeters Cumulative meters along the polyline (from route start).
 * @param polyline Full route polyline coordinates.
 * @param prevStepIndex Previous step index to apply hysteresis against. Omit on first call.
 * @param hysteresisBackM Meters behind the previous step boundary before allowing regression (default 30).
 */
export function currentStepIndexAlongRoute(
  steps: DirectionsStep[],
  cumAlongPolylineMeters: number,
  polyline: Coordinate[],
  prevStepIndex?: number,
  hysteresisBackM = 30,
): number {
  if (!steps.length) return 0;
  const ends = stepEndCumulativeMeters(steps);
  const gTotal = ends[ends.length - 1] ?? 0;
  const pLen = polylineLengthMeters(polyline);
  let u = Math.max(0, cumAlongPolylineMeters);
  if (gTotal > 2 && pLen > 2 && Math.abs(gTotal - pLen) / pLen > 0.04) {
    u = (u / pLen) * gTotal;
  }
  const EPS = 5;
  let idx = Math.max(0, ends.length - 1);
  for (let i = 0; i < ends.length; i++) {
    if (u < ends[i]! - EPS) {
      idx = i;
      break;
    }
  }

  // Hysteresis: don't regress to an earlier step unless clearly behind its boundary.
  if (prevStepIndex != null && idx < prevStepIndex) {
    // Boundary of the step we want to regress to — the maneuver point user supposedly hasn't reached.
    const prevBoundary = prevStepIndex > 0 ? (ends[prevStepIndex - 1] ?? 0) : 0;
    if (u >= prevBoundary - hysteresisBackM) {
      return prevStepIndex;
    }
  }

  return idx;
}

/** Passed into {@link buildRouteSplitRingsFromProgress} from navigation (monotonic cumulative progress). */
export type RouteSplitForOverlay = {
  segmentIndex: number;
  tOnSegment: number;
};

/**
 * Map cumulative meters along the polyline to the segment index and interpolation t (same basis as {@link projectOntoPolyline}).
 */
export function segmentAndTFromCumAlongPolyline(
  cumMeters: number,
  polyline: Coordinate[],
): { segmentIndex: number; tOnSegment: number } | null {
  if (polyline.length < 2) return null;
  const lastSeg = polyline.length - 2;
  let remaining = Math.max(0, cumMeters);
  const EPS = 1e-6;

  for (let i = 0; i <= lastSeg; i++) {
    const p = polyline[i]!;
    const q = polyline[i + 1]!;
    const len = haversineMeters(p.lat, p.lng, q.lat, q.lng);
    if (i === lastSeg) {
      const t = len > 1e-9 ? Math.min(1, remaining / len) : 1;
      return { segmentIndex: lastSeg, tOnSegment: t };
    }
    if (remaining < len - EPS) {
      const t = len > 1e-9 ? Math.max(0, Math.min(1, remaining / len)) : 0;
      return { segmentIndex: i, tOnSegment: t };
    }
    remaining -= len;
  }
  return { segmentIndex: lastSeg, tOnSegment: 1 };
}

/** Point on the polyline at `cumMeters` from the start (same basis as {@link segmentAndTFromCumAlongPolyline}). */
export function coordinateAtCumulativeMeters(
  polyline: Coordinate[],
  cumMeters: number,
): Coordinate | null {
  const st = segmentAndTFromCumAlongPolyline(cumMeters, polyline);
  if (!st) return null;
  const { segmentIndex, tOnSegment } = st;
  const pa = polyline[segmentIndex]!;
  const pb = polyline[segmentIndex + 1]!;
  return {
    lat: pa.lat + tOnSegment * (pb.lat - pa.lat),
    lng: pa.lng + tOnSegment * (pb.lng - pa.lng),
  };
}

/** Tiny spacing to remove only near-identical duplicate vertices at split boundaries. */
const ROUTE_SPLIT_MIN_M = 0.05;

function dedupeCoordRing(coords: [number, number][]): [number, number][] {
  if (coords.length < 2) return coords;
  const out: [number, number][] = [coords[0]];
  for (let i = 1; i < coords.length; i++) {
    const prev = out[out.length - 1];
    const cur = coords[i];
    if (haversineMeters(prev[1], prev[0], cur[1], cur[0]) >= ROUTE_SPLIT_MIN_M) {
      out.push(cur);
    }
  }
  return out;
}

export type RouteSplitRings = {
  passedLngLat: [number, number][];
  aheadLngLat: [number, number][];
  /** Index of the Mapbox congestion entry for ahead edge 0 (aligned to full-route `congestion`). */
  firstAheadEdgeIndex: number;
};

/**
 * Build passed/ahead LineString rings from authoritative progress (no GPS projection).
 * Uses the same ring rules as the legacy nearest-point split for visual parity.
 */
export function buildRouteSplitRingsFromProgress(
  polyline: Coordinate[],
  segmentIndex: number,
  tOnSegment: number,
): RouteSplitRings | null {
  if (polyline.length < 2) return null;
  const n = polyline.length;
  const lastSeg = n - 2;
  const segIdx = Math.min(Math.max(0, segmentIndex), lastSeg);
  const t = Math.min(1, Math.max(0, tOnSegment));
  const pa = polyline[segIdx]!;
  const pb = polyline[segIdx + 1]!;
  const split: Coordinate = {
    lat: pa.lat + t * (pb.lat - pa.lat),
    lng: pa.lng + t * (pb.lng - pa.lng),
  };

  const toPair = (p: Coordinate): [number, number] => [p.lng, p.lat];
  const splitPair: [number, number] = [split.lng, split.lat];

  const passedRaw: [number, number][] = [];
  for (let k = 0; k <= segIdx; k++) {
    passedRaw.push(toPair(polyline[k]!));
  }
  const passedDeduped = dedupeCoordRing(passedRaw);
  passedDeduped.push(splitPair);

  // Ahead ring starts one vertex BEFORE the split so glow/casing
  // overlaps the passed line end — eliminates the visible seam.
  const aheadRaw: [number, number][] = [toPair(polyline[segIdx]!)];
  aheadRaw.push(splitPair);
  for (let k = segIdx + 1; k < n; k++) {
    aheadRaw.push(toPair(polyline[k]!));
  }
  const aheadDeduped = dedupeCoordRing(aheadRaw);

  return {
    passedLngLat: passedDeduped.length >= 2 ? passedDeduped : [],
    aheadLngLat: aheadDeduped.length >= 2 ? aheadDeduped : [],
    firstAheadEdgeIndex: Math.max(0, segIdx - 1),
  };
}

/**
 * Split a route into "passed" vs "ahead" for map styling (legacy helper; prefers {@link buildRouteSplitRingsFromProgress} with nav progress in the hook).
 */
export function splitRouteByNearestPoint(
  pts: Coordinate[],
  user: Coordinate,
): { passed: [number, number][]; ahead: [number, number][]; splitIndex: number } {
  if (pts.length < 2) {
    return { passed: [], ahead: pts.map((p) => [p.lng, p.lat] as [number, number]), splitIndex: 0 };
  }
  const proj = projectOntoPolyline(user, pts);
  if (!proj) {
    return { passed: [], ahead: pts.map((p) => [p.lng, p.lat] as [number, number]), splitIndex: 0 };
  }
  const rings = buildRouteSplitRingsFromProgress(pts, proj.segmentIndex, proj.tOnSegment);
  if (!rings) {
    return { passed: [], ahead: pts.map((p) => [p.lng, p.lat] as [number, number]), splitIndex: 0 };
  }
  return {
    passed: rings.passedLngLat,
    ahead: rings.aheadLngLat,
    splitIndex: rings.firstAheadEdgeIndex,
  };
}
