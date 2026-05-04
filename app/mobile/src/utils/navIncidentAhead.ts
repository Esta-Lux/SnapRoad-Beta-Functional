import type { Coordinate } from '../types';
import { aheadMetersAlongDrivingRoute, haversineMeters } from './distance';

const HEADING_AHEAD_HALF_DEG = 68;

/** True when target is reasonably forward relative to compass (no polyline preview). */
function aheadByHeading(user: Coordinate, target: Coordinate, headingDeg: number): boolean {
  const bearingRad = Math.atan2(target.lng - user.lng, target.lat - user.lat);
  const bearingDeg = bearingRad * (180 / Math.PI);
  const diff = Math.abs(((bearingDeg - headingDeg + 540) % 360) - 180);
  return diff < HEADING_AHEAD_HALF_DEG;
}

/**
 * Whether `target` counts as ahead of `user`: along active route projection when geometry exists,
 * else a forward cone vs device heading only.
 */
export function isIncidentAheadSnapshot(
  routePolyline: Coordinate[] | null | undefined,
  user: Coordinate,
  target: Coordinate,
  headingDeg: number,
): boolean {
  if (routePolyline && routePolyline.length >= 2) {
    return aheadMetersAlongDrivingRoute(routePolyline, user, target) != null;
  }
  return aheadByHeading(user, target, headingDeg);
}

/** Ahead distance in meters along route when available; otherwise haversine if forward cone matches. */
export function distanceAheadEffectiveMeters(
  routePolyline: Coordinate[] | null | undefined,
  user: Coordinate,
  target: Coordinate,
  headingDeg: number,
): number | null {
  if (routePolyline && routePolyline.length >= 2) {
    return aheadMetersAlongDrivingRoute(routePolyline, user, target);
  }
  if (!aheadByHeading(user, target, headingDeg)) return null;
  return haversineMeters(user.lat, user.lng, target.lat, target.lng);
}
