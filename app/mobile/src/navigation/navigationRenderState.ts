import type { DirectionsStep } from '../lib/directions';
import type { Coordinate } from '../types';
import {
  polylineLengthMeters,
  segmentAndTFromCumAlongPolyline,
  stepEndCumulativeMeters,
} from '../utils/distance';
import { getUpcomingManeuverStep, sliceRouteAhead, splitRouteAtSnapPoint, type RoutePoint } from './routeGeometry';

export type NavigationRouteRenderState = {
  traveledRoute: RoutePoint[];
  remainingRoute: RoutePoint[];
  maneuverRoute: RoutePoint[];
};

/**
 * Map cumulative distance at the start of the upcoming maneuver step onto a polyline segment index
 * (same scaling as {@link currentStepIndexAlongRoute}).
 */
function upcomingManeuverStartSegmentIndex(
  steps: DirectionsStep[],
  currentStepIndex: number,
  polyline: Coordinate[],
): number | null {
  const upcoming = getUpcomingManeuverStep(steps, currentStepIndex);
  if (!upcoming || polyline.length < 2) return null;
  const upcomingIndex = steps.indexOf(upcoming);
  if (upcomingIndex < 0) return null;

  const ends = stepEndCumulativeMeters(steps);
  const gTotal = ends[ends.length - 1] ?? 0;
  const pLen = polylineLengthMeters(polyline);
  let cumStart = upcomingIndex > 0 ? ends[upcomingIndex - 1]! : 0;
  if (gTotal > 2 && pLen > 2 && Math.abs(gTotal - pLen) / pLen > 0.04) {
    cumStart = (cumStart / gTotal) * pLen;
  }
  const st = segmentAndTFromCumAlongPolyline(cumStart, polyline);
  return st ? st.segmentIndex : null;
}

/**
 * Single render model for route casing, traveled, remaining, and short maneuver highlight — all from
 * the same snap split as {@link useNavigation}'s `routeSplitForOverlay` / {@link computeNavigationRouteProgress}.
 */
export function buildNavigationRenderState(args: {
  route: RoutePoint[];
  snappedSegmentIndex: number;
  snappedT: number;
  steps?: DirectionsStep[];
  currentStepIndex: number;
}): NavigationRouteRenderState {
  const { route, snappedSegmentIndex, snappedT, steps, currentStepIndex } = args;
  const split = splitRouteAtSnapPoint(route, snappedSegmentIndex, snappedT);

  let maneuverRoute: RoutePoint[] = [];
  if (steps?.length) {
    const segIdx = upcomingManeuverStartSegmentIndex(steps, currentStepIndex, route);
    if (segIdx != null) {
      const startVertex = Math.max(snappedSegmentIndex, segIdx - 2);
      maneuverRoute = sliceRouteAhead(route, startVertex, 8);
    }
  }

  return {
    traveledRoute: split.traveled,
    remainingRoute: split.remaining,
    maneuverRoute,
  };
}
