import type { DirectionsStep } from '../lib/directions';
import { alongRouteDistanceMeters, metersBetween } from '../utils/distance';
import type { Coordinate } from '../types';

/** Lat/lng vertex — same shape as {@link Coordinate}; used for navigation route slicing. */
export type RoutePoint = {
  lat: number;
  lng: number;
};

export type RouteSplit = {
  traveled: RoutePoint[];
  remaining: RoutePoint[];
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/**
 * Split the polyline at the snapped point on segment `segmentIndex` with interpolation `t` ∈ [0,1].
 * Aligns with {@link buildRouteSplitRingsFromProgress} / {@link projectOntoPolyline} segment basis.
 */
export function splitRouteAtSnapPoint(
  route: RoutePoint[],
  segmentIndex: number,
  t: number,
): RouteSplit {
  if (!route.length || route.length < 2) {
    return { traveled: route, remaining: route };
  }
  const i = Math.max(0, Math.min(segmentIndex, route.length - 2));
  const a = route[i]!;
  const b = route[i + 1]!;
  const splitPoint: RoutePoint = {
    lat: lerp(a.lat, b.lat, t),
    lng: lerp(a.lng, b.lng, t),
  };
  const traveled = [...route.slice(0, i + 1), splitPoint];
  const remaining = [splitPoint, ...route.slice(i + 1)];
  return { traveled, remaining };
}

/**
 * Next vertices along the polyline starting at vertex index `startVertexIndex` (inclusive).
 * `vertexCount` is a vertex budget, not meters.
 */
export function sliceRouteAhead(
  route: RoutePoint[],
  startVertexIndex: number,
  vertexCount = 10,
): RoutePoint[] {
  if (!route.length || route.length < 2) return [];
  const from = Math.max(0, startVertexIndex);
  const to = Math.min(route.length - 1, from + vertexCount);
  return route.slice(from, to + 1);
}

/**
 * Small chevron in geographic space for a LineLayer “arrowhead” (two strokes, no icons).
 */
export function buildArrowHead(end: RoutePoint, prev: RoutePoint, scale = 0.00008): RoutePoint[] {
  const dx = end.lng - prev.lng;
  const dy = end.lat - prev.lat;
  const len = Math.sqrt(dx * dx + dy * dy) || 1e-9;
  const ux = dx / len;
  const uy = dy / len;
  const leftX = end.lng - ux * scale - uy * scale * 0.65;
  const leftY = end.lat - uy * scale + ux * scale * 0.65;
  const rightX = end.lng - ux * scale + uy * scale * 0.65;
  const rightY = end.lat - uy * scale - ux * scale * 0.65;
  return [
    { lat: leftY, lng: leftX },
    end,
    { lat: rightY, lng: rightX },
  ];
}

function hasLaneGuidance(step: DirectionsStep | null | undefined): boolean {
  const banner = step?.bannerInstructions?.[0];
  const sub = banner?.sub;
  return !!(
    step?.lanes ||
    (Array.isArray(sub?.components) && sub.components.some((c) => c?.type === 'lane'))
  );
}

function isActionableGuidanceStep(step: DirectionsStep | null | undefined, allowArrival = false): boolean {
  if (!step || !Number.isFinite(step.lat) || !Number.isFinite(step.lng)) return false;
  if (step.maneuver === 'depart') return false;
  if (step.maneuver === 'arrive') return allowArrival;
  if (step.maneuver === 'straight') return hasLaneGuidance(step);
  return true;
}

/** Next maneuver step for banners / distance — prefers the active step index when it is actionable. */
export function getUpcomingManeuverStep(
  steps: DirectionsStep[] | undefined,
  currentStepIndex: number,
): DirectionsStep | null {
  if (!steps?.length) return null;
  const safeIdx = Math.max(0, Math.min(currentStepIndex, steps.length - 1));
  const current = steps[safeIdx];
  if (isActionableGuidanceStep(current, false)) return current;

  const rest = steps.slice(safeIdx + 1);
  const actionable = rest.find((s) => isActionableGuidanceStep(s, false));
  if (actionable) return actionable;
  const arrival = rest.find((s) => isActionableGuidanceStep(s, true));
  return arrival ?? null;
}

export function getDistanceToUpcomingManeuverMeters(
  steps: DirectionsStep[] | undefined,
  currentStepIndex: number,
  user: Coordinate,
  polyline?: Coordinate[],
): number {
  const step = getUpcomingManeuverStep(steps, currentStepIndex);
  if (!step || !Number.isFinite(step.lng) || !Number.isFinite(step.lat)) {
    return Number.POSITIVE_INFINITY;
  }
  if (polyline && polyline.length >= 2) {
    return alongRouteDistanceMeters(polyline, user, { lat: step.lat, lng: step.lng });
  }
  return metersBetween(user, { lat: step.lat, lng: step.lng });
}
