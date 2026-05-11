import type { Coordinate } from '../types';
import { bearingDeg, projectOntoPolyline, type PolylineProjection } from '../utils/distance';

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function angleDeltaDeg(a: number, b: number): number {
  const d = Math.abs(((a - b + 540) % 360) - 180);
  return Number.isFinite(d) ? d : 180;
}

function tangentAtProjection(polyline: Coordinate[], projection: PolylineProjection): number | null {
  const a = polyline[projection.segmentIndex];
  const b = polyline[projection.segmentIndex + 1];
  if (!a || !b) return null;
  return bearingDeg(a, b);
}

export type RerouteCandidateInput = {
  current: Coordinate;
  previous: Coordinate | null;
  route: Coordinate[];
  lateralMeters: number;
  thresholdMeters: number;
  speedMps: number;
  courseDeg: number | null | undefined;
};

/**
 * Exit ramps and highway forks often produce one or two samples that are
 * laterally far from the selected highway segment but still moving in a
 * compatible direction. Treat those as candidate drift, not an immediate
 * reroute, unless the lateral miss is clearly severe or getting worse.
 */
export function shouldCountRerouteCandidate({
  current,
  previous,
  route,
  lateralMeters,
  thresholdMeters,
  speedMps,
  courseDeg,
}: RerouteCandidateInput): boolean {
  if (!finite(lateralMeters) || lateralMeters < thresholdMeters) return false;
  if (lateralMeters >= thresholdMeters * 1.55) return true;
  if (!previous || route.length < 2 || !finite(speedMps) || speedMps < 8) return true;

  const projection = projectOntoPolyline(current, route);
  if (!projection) return true;
  const routeBearing = tangentAtProjection(route, projection);
  const travelBearing = bearingDeg(previous, current);
  const heading = finite(courseDeg) && courseDeg >= 0 ? courseDeg : travelBearing;
  if (routeBearing == null) return true;

  const headingMismatch = angleDeltaDeg(heading, routeBearing);
  const travelMismatch = angleDeltaDeg(travelBearing, routeBearing);
  return headingMismatch >= 35 || travelMismatch >= 42;
}
