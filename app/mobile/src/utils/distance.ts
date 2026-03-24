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
 * Split a route polyline into passed and ahead segments based on user position.
 */
export function splitRouteByNearestPoint(
  pts: Coordinate[],
  user: Coordinate,
): { passed: [number, number][]; ahead: [number, number][]; splitIndex: number } {
  if (pts.length < 2) {
    return { passed: [], ahead: pts.map((p) => [p.lng, p.lat] as [number, number]), splitIndex: 0 };
  }
  const { index: bestIdx } = nearestPointOnPolyline(user, pts);
  const toCoord = (p: Coordinate): [number, number] => [p.lng, p.lat];
  const passed = pts.slice(0, bestIdx + 1).map(toCoord);
  const ahead = pts.slice(Math.max(0, bestIdx)).map(toCoord);
  return { passed, ahead, splitIndex: bestIdx };
}
