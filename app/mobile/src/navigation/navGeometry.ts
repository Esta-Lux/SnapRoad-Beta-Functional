import { RoutePoint, RawLocation, SnapPoint } from './navModel';

const EARTH_RADIUS_M = 6371000;

const toRad = (d: number) => (d * Math.PI) / 180;

export function haversineMeters(a: RoutePoint, b: RoutePoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export function cumulativeRouteMeters(route: RoutePoint[]): number[] {
  const out = [0];
  for (let i = 1; i < route.length; i++) {
    out.push(out[i - 1]! + haversineMeters(route[i - 1]!, route[i]!));
  }
  return out;
}

export function interpolatePoint(a: RoutePoint, b: RoutePoint, t: number): RoutePoint {
  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lng: a.lng + (b.lng - a.lng) * t,
  };
}

function projectToSegment(p: RoutePoint, a: RoutePoint, b: RoutePoint) {
  const ax = a.lng;
  const ay = a.lat;
  const bx = b.lng;
  const by = b.lat;
  const px = p.lng;
  const py = p.lat;
  const abx = bx - ax;
  const aby = by - ay;
  const ab2 = abx * abx + aby * aby || 1e-12;
  let t = ((px - ax) * abx + (py - ay) * aby) / ab2;
  t = Math.max(0, Math.min(1, t));
  const point = {
    lat: ay + aby * t,
    lng: ax + abx * t,
  };
  return { point, t };
}

export function snapToRoute(
  raw: RawLocation,
  route: RoutePoint[],
  cumulative: number[],
  fromSegment = 0,
  lookaheadSegments = 30,
): SnapPoint | null {
  if (route.length < 2) return null;
  const start = Math.max(0, fromSegment);
  const end = Math.min(route.length - 2, start + lookaheadSegments);
  let best: SnapPoint | null = null;
  for (let i = start; i <= end; i++) {
    const a = route[i]!;
    const b = route[i + 1]!;
    const proj = projectToSegment(raw, a, b);
    const distanceMeters = haversineMeters(raw, proj.point);
    const segLen = haversineMeters(a, b);
    const cumulativeMeters = cumulative[i]! + segLen * proj.t;
    const candidate: SnapPoint = {
      point: proj.point,
      segmentIndex: i,
      t: proj.t,
      distanceMeters,
      cumulativeMeters,
    };
    if (!best || candidate.distanceMeters < best.distanceMeters) {
      best = candidate;
    }
  }
  return best;
}

export function splitRouteAtSnap(route: RoutePoint[], snap: SnapPoint) {
  const i = snap.segmentIndex;
  const split = interpolatePoint(route[i]!, route[i + 1]!, snap.t);
  const traveled = [...route.slice(0, i + 1), split];
  const remaining = [split, ...route.slice(i + 1)];
  return { traveled, remaining };
}

export function sliceRouteWindow(
  route: RoutePoint[],
  startSegmentIndex: number,
  segmentCount = 8,
): RoutePoint[] {
  const from = Math.max(0, startSegmentIndex);
  const to = Math.min(route.length - 1, from + segmentCount);
  return route.slice(from, to + 1);
}

export function bearingDegrees(a: RoutePoint, b: RoutePoint): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  let brng = (Math.atan2(y, x) * 180) / Math.PI;
  brng = (brng + 360) % 360;
  return brng;
}

export function arrowHeadPoints(end: RoutePoint, prev: RoutePoint, scale = 0.00009) {
  const dx = end.lng - prev.lng;
  const dy = end.lat - prev.lat;
  const len = Math.sqrt(dx * dx + dy * dy) || 1e-9;
  const ux = dx / len;
  const uy = dy / len;
  return [
    {
      lat: end.lat - uy * scale + ux * scale * 0.65,
      lng: end.lng - ux * scale - uy * scale * 0.65,
    },
    end,
    {
      lat: end.lat - uy * scale - ux * scale * 0.65,
      lng: end.lng - ux * scale + uy * scale * 0.65,
    },
  ];
}

/** Segment index on `route` closest to `p` (full polyline search). */
export function nearestSegmentIndex(route: RoutePoint[], p: RoutePoint): number {
  if (route.length < 2) return 0;
  const cumulative = cumulativeRouteMeters(route);
  const raw: RawLocation = { lat: p.lat, lng: p.lng };
  const snap = snapToRoute(raw, route, cumulative, 0, route.length + 10);
  return snap?.segmentIndex ?? 0;
}
