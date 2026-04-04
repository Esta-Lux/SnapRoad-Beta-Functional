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

export function formatDistance(miles: number): string {
  if (miles < 0.1) return `${Math.round(miles * 5280)} ft`;
  return `${miles.toFixed(1)} mi`;
}

/**
 * Project a point onto a polyline and return the minimum distance in meters.
 * Uses flat-earth approximation (accurate enough for distances < 1km).
 */
export function distanceToPolyline(point: Coordinate, polyline: Coordinate[]): number {
  if (!polyline.length || polyline.length < 2) return Infinity;
  const latScale = 111320;
  const lngScale = 111320 * Math.cos((point.lat * Math.PI) / 180);
  const px = point.lng * lngScale;
  const py = point.lat * latScale;
  let best = Number.POSITIVE_INFINITY;

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
    const t = ab2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / ab2)) : 0;
    const qx = ax + abx * t;
    const qy = ay + aby * t;
    const d = Math.hypot(px - qx, py - qy);
    if (d < best) best = d;
  }
  return best;
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
  if (polyline.length < 2) return 0;

  const latScale = 111320;
  const lngScale = 111320 * Math.cos((user.lat * Math.PI) / 180);
  const px = user.lng * lngScale;
  const py = user.lat * latScale;

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
  let remaining = (1 - bestT) * segLen;
  for (let j = bestI + 1; j < polyline.length - 1; j++) {
    const p = polyline[j];
    const q = polyline[j + 1];
    remaining += haversineMeters(p.lat, p.lng, q.lat, q.lng);
  }
  return Math.max(0, remaining);
}

/** Minimum spacing so duplicate vertices don't break LineString validity. */
const ROUTE_SPLIT_MIN_M = 1.5;

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

/**
 * Split a route into "passed" vs "ahead" for map styling (grey trail + active color).
 * Projects the user onto the closest **segment** (not just the nearest vertex) so the
 * split point moves smoothly along the polyline — matches {@link remainingDistanceOnPolyline}
 * and avoids jumps / half-line popping when GPS moves between dense vertices.
 */
export function splitRouteByNearestPoint(
  pts: Coordinate[],
  user: Coordinate,
): { passed: [number, number][]; ahead: [number, number][]; splitIndex: number } {
  if (pts.length < 2) {
    return { passed: [], ahead: pts.map((p) => [p.lng, p.lat] as [number, number]), splitIndex: 0 };
  }

  const latScale = 111320;
  const lngScale = 111320 * Math.cos((user.lat * Math.PI) / 180);
  const px = user.lng * lngScale;
  const py = user.lat * latScale;

  let bestDist = Number.POSITIVE_INFINITY;
  let bestI = 0;
  let bestT = 0;

  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
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

  const a = pts[bestI];
  const b = pts[bestI + 1];
  const split: Coordinate = {
    lat: a.lat + bestT * (b.lat - a.lat),
    lng: a.lng + bestT * (b.lng - a.lng),
  };

  const toPair = (p: Coordinate): [number, number] => [p.lng, p.lat];

  const passed: [number, number][] = [];
  for (let k = 0; k <= bestI; k++) {
    passed.push(toPair(pts[k]));
  }
  if (haversineMeters(split.lat, split.lng, pts[bestI].lat, pts[bestI].lng) >= ROUTE_SPLIT_MIN_M) {
    passed.push([split.lng, split.lat]);
  }

  const ahead: [number, number][] = [];
  const splitNearNextVertex =
    haversineMeters(split.lat, split.lng, b.lat, b.lng) < ROUTE_SPLIT_MIN_M;
  if (splitNearNextVertex && bestI + 1 < pts.length) {
    for (let k = bestI + 1; k < pts.length; k++) {
      ahead.push(toPair(pts[k]));
    }
  } else {
    ahead.push([split.lng, split.lat]);
    for (let k = bestI + 1; k < pts.length; k++) {
      ahead.push(toPair(pts[k]));
    }
  }

  const passedOut = dedupeCoordRing(passed);
  const aheadOut = dedupeCoordRing(ahead);

  return {
    passed: passedOut.length >= 2 ? passedOut : [],
    ahead: aheadOut.length >= 2 ? aheadOut : [],
    splitIndex: bestI,
  };
}
