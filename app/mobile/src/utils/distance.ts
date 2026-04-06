import type { Coordinate } from '../types';

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

  const aheadRaw: [number, number][] = [];
  for (let k = segIdx + 1; k < n; k++) {
    aheadRaw.push(toPair(polyline[k]!));
  }
  const aheadDeduped = dedupeCoordRing(aheadRaw);
  aheadDeduped.unshift(splitPair);

  return {
    passedLngLat: passedDeduped.length >= 2 ? passedDeduped : [],
    aheadLngLat: aheadDeduped.length >= 2 ? aheadDeduped : [],
    firstAheadEdgeIndex: segIdx,
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
