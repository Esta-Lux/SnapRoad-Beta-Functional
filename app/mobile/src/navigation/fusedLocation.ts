/**
 * Fused navigation display state: smooth GPS, route snapping, heading blend, off-route hints.
 * Used as the single progress basis for puck, route split, ETA, and reroute when navigating.
 */

export type Coordinate = {
  lat: number;
  lng: number;
  heading?: number | null;
  speedMps?: number | null;
  accuracy?: number | null;
  timestamp?: number | null;
};

export type RoutePoint = {
  lat: number;
  lng: number;
};

export type QualityState =
  | 'stationary'
  | 'slow_maneuvering'
  | 'driving_on_route'
  | 'gps_weak'
  | 'off_route';

export type FusedNavState = {
  rawCoord: Coordinate;
  trustedCoord: Coordinate | null;
  displayCoord: Coordinate | null;
  displayHeading: number;
  snappedCoord: Coordinate | null;
  snappedSegmentIndex: number;
  distanceToRouteMeters: number;
  confidence: number;
  qualityState: QualityState;
  isMapMatched: boolean;
  isOffRoute: boolean;
};

export type SnapResult = {
  point: RoutePoint;
  segmentIndex: number;
  distanceMeters: number;
  progressAlongSegment: number;
};

const EARTH_RADIUS_M = 6371000;

function toRad(v: number) {
  return (v * Math.PI) / 180;
}

function distanceMeters(a: RoutePoint, b: RoutePoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function normalizeHeading(deg: number): number {
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}

function shortestHeadingDelta(a: number, b: number): number {
  let d = normalizeHeading(b) - normalizeHeading(a);
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

function blendHeading(current: number, target: number, alpha: number): number {
  return normalizeHeading(current + shortestHeadingDelta(current, target) * alpha);
}

function projectPointToSegment(
  p: RoutePoint,
  a: RoutePoint,
  b: RoutePoint,
): Omit<SnapResult, 'segmentIndex'> {
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
  const point: RoutePoint = {
    lat: ay + aby * t,
    lng: ax + abx * t,
  };
  return {
    point,
    distanceMeters: distanceMeters({ lat: p.lat, lng: p.lng }, point),
    progressAlongSegment: t,
  };
}

export function snapToRemainingRoute(
  raw: Coordinate,
  route: RoutePoint[],
  startIndex: number,
  maxSegmentsLookahead = 25,
): SnapResult | null {
  if (!route || route.length < 2) return null;
  const p = { lat: raw.lat, lng: raw.lng };
  let best: SnapResult | null = null;
  const from = Math.max(0, startIndex);
  const to = Math.min(route.length - 2, from + maxSegmentsLookahead);
  for (let i = from; i <= to; i++) {
    const a = route[i]!;
    const b = route[i + 1]!;
    const s = projectPointToSegment(p, a, b);
    const candidate: SnapResult = { ...s, segmentIndex: i };
    if (!best || candidate.distanceMeters < best.distanceMeters) {
      best = candidate;
    }
  }
  return best;
}

function confidenceFromSignal(raw: Coordinate, distanceToRoute: number): number {
  const acc = raw.accuracy ?? 999;
  let c = 1;
  if (acc > 10) c -= 0.1;
  if (acc > 20) c -= 0.15;
  if (acc > 40) c -= 0.2;
  if (acc > 70) c -= 0.25;
  if (distanceToRoute > 8) c -= 0.08;
  if (distanceToRoute > 15) c -= 0.12;
  if (distanceToRoute > 25) c -= 0.18;
  if (distanceToRoute > 40) c -= 0.22;
  return Math.max(0, Math.min(1, c));
}

export function nextFusedNavState(args: {
  prev: FusedNavState | null;
  raw: Coordinate;
  route: RoutePoint[] | null;
  isNavigating: boolean;
}): FusedNavState {
  const { prev, raw, route, isNavigating } = args;
  const prevDisplay = prev?.displayCoord ?? raw;
  const prevHeading =
    prev?.displayHeading ?? normalizeHeading(raw.heading ?? 0);
  const speed = raw.speedMps ?? 0;
  const isStationary = speed < 0.8;
  const isSlow = speed < 5;
  const gpsWeak = (raw.accuracy ?? 999) > 45;

  let snappedCoord: Coordinate | null = null;
  let snappedSegmentIndex = prev?.snappedSegmentIndex ?? 0;
  let distanceToRouteMeters = 999;
  let isMapMatched = false;

  if (isNavigating && route && route.length >= 2) {
    const snap = snapToRemainingRoute(raw, route, snappedSegmentIndex);
    if (snap) {
      distanceToRouteMeters = snap.distanceMeters;
      snappedSegmentIndex = Math.max(snappedSegmentIndex, snap.segmentIndex);
      snappedCoord = {
        lat: snap.point.lat,
        lng: snap.point.lng,
        heading: raw.heading ?? prevHeading,
        speedMps: raw.speedMps ?? 0,
        accuracy: raw.accuracy ?? null,
        timestamp: raw.timestamp ?? Date.now(),
      };
      isMapMatched = snap.distanceMeters <= 35;
    }
  }

  const confidence = confidenceFromSignal(raw, distanceToRouteMeters);
  const isOffRoute = Boolean(isNavigating && distanceToRouteMeters > 35 && confidence < 0.65);

  let target: Coordinate = raw;
  if (isNavigating && snappedCoord && !isOffRoute) {
    target = snappedCoord;
  }

  let alpha = 0.25;
  if (isStationary) alpha = 0.12;
  else if (isSlow) alpha = 0.18;
  else alpha = 0.3;
  if (gpsWeak) alpha *= 0.7;
  if (isNavigating && isMapMatched) alpha *= 1.15;

  const displayCoord: Coordinate = {
    lat: lerp(prevDisplay.lat, target.lat, alpha),
    lng: lerp(prevDisplay.lng, target.lng, alpha),
    heading: null,
    speedMps: raw.speedMps ?? prevDisplay.speedMps ?? 0,
    accuracy: raw.accuracy ?? prevDisplay.accuracy ?? null,
    timestamp: raw.timestamp ?? Date.now(),
  };

  const targetHeading =
    typeof raw.heading === 'number' && Number.isFinite(raw.heading)
      ? raw.heading
      : prevHeading;
  const displayHeading = blendHeading(prevHeading, targetHeading, isStationary ? 0.1 : 0.2);

  let qualityState: QualityState = 'driving_on_route';
  if (isOffRoute) qualityState = 'off_route';
  else if (gpsWeak) qualityState = 'gps_weak';
  else if (isStationary) qualityState = 'stationary';
  else if (isSlow) qualityState = 'slow_maneuvering';

  return {
    rawCoord: raw,
    trustedCoord: target,
    displayCoord,
    displayHeading,
    snappedCoord,
    snappedSegmentIndex,
    distanceToRouteMeters,
    confidence,
    qualityState,
    isMapMatched,
    isOffRoute,
  };
}

/** Split polyline at snap point — traveled ends at split, remaining starts at split (same point). */
export function splitRouteAtIndexAndPoint(
  route: RoutePoint[],
  segmentIndex: number,
  splitPoint: RoutePoint,
): { traveled: RoutePoint[]; remaining: RoutePoint[] } {
  const traveled = [...route.slice(0, segmentIndex + 1), splitPoint];
  const remaining = [splitPoint, ...route.slice(segmentIndex + 1)];
  return { traveled, remaining };
}
