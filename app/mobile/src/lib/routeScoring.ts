import type { DrivingMode } from '../types';
import type { DirectionsResult } from './directions';

const FASTEST_LABEL = 'Fastest';
const FASTEST_REASON = 'Fastest clear route';
const ALT_REASON = 'Alternative route';

export function fastestLabelForMode(mode?: DrivingMode): string {
  return mode === 'sport' ? 'SnapRoad' : FASTEST_LABEL;
}

export function fastestBaseReasonForMode(mode?: DrivingMode): string {
  return mode === 'sport' ? 'SnapRoad · fastest clear road' : FASTEST_REASON;
}

export function routeRankingPenalty(
  route: Pick<DirectionsResult, 'duration' | 'distance' | 'congestionScore' | 'closureEdgeCount'>,
  mode?: DrivingMode,
): number {
  const closurePenalty = (route.closureEdgeCount ?? 0) * 9000;
  const congestionPenaltySec =
    mode === 'sport'
      ? 300
      : mode === 'calm'
        ? 420
        : 360;
  const distancePenaltySecPerMi = mode === 'sport' ? 0.35 : mode === 'calm' ? 1.4 : 0.9;
  const congestionPenalty = route.congestionScore * congestionPenaltySec;
  const distancePenalty = (route.distance / 1609.34) * distancePenaltySecPerMi;
  return route.duration + closurePenalty + congestionPenalty + distancePenalty;
}

function scoreAndRankRoutes(routes: DirectionsResult[], mode?: DrivingMode): DirectionsResult[] {
  if (routes.length === 0) return [];
  let slowestDuration = 0;
  for (const r of routes) {
    if (r.duration > slowestDuration) slowestDuration = r.duration;
  }
  const scored = routes.map((r) => ({
    ...r,
    timeSavedSeconds: Math.round(slowestDuration - r.duration),
  }));
  scored.sort((a, b) => {
    const penaltyDiff = routeRankingPenalty(a, mode) - routeRankingPenalty(b, mode);
    if (Math.abs(penaltyDiff) > 1e-6) return penaltyDiff;
    const timeDiff = a.duration - b.duration;
    if (Math.abs(timeDiff) > 5) return timeDiff;
    const distDiff = a.distance - b.distance;
    if (Math.abs(distDiff) > 25) return distDiff;
    return a.congestionScore - b.congestionScore;
  });
  const best = scored[0];
  if (best) {
    best.routeType = 'fastest';
    best.routeLabel = fastestLabelForMode(mode);
    best.routeReason = fastestBaseReasonForMode(mode);
  }
  return scored;
}

function enrichRouteReasons(routes: DirectionsResult[], mode?: DrivingMode): DirectionsResult[] {
  if (routes.length <= 1) return routes;
  const fastest = routes.find((r) => r.routeType === 'fastest');
  if (!fastest) return routes;

  return routes.map((r) => {
    if (r.routeType === 'fastest') {
      const cong = r.congestionScore;
      const label = mode === 'sport' ? 'SnapRoad' : FASTEST_LABEL;
      if (cong < 0.05) return { ...r, routeReason: `${label} · Clear roads` };
      if (cong < 0.15) return { ...r, routeReason: `${label} · Light traffic` };
      if (cong < 0.35) return { ...r, routeReason: `${label} · Moderate traffic` };
      return { ...r, routeReason: `${label} · Heavy traffic ahead` };
    }

    if (r.routeType === 'no_highways') {
      const timeDiffMin = Math.round((r.duration - fastest.duration) / 60);
      if (timeDiffMin <= 0) return { ...r, routeReason: 'No highways · Same travel time' };
      return { ...r, routeReason: `No highways · ${timeDiffMin} min longer` };
    }

    if (r.routeType === 'avoid_tolls') {
      const timeDiffMin = Math.round((r.duration - fastest.duration) / 60);
      if (timeDiffMin <= 0) return { ...r, routeReason: 'No tolls · Same travel time' };
      return { ...r, routeReason: `No tolls · ${timeDiffMin} min longer` };
    }

    if (r.routeType === 'eco') {
      const distSavedMi = Math.round(((fastest.distance - r.distance) / 1609.34) * 10) / 10;
      const timeDiffMin = Math.round((r.duration - fastest.duration) / 60);
      if (distSavedMi > 0.5 && timeDiffMin <= 2) {
        return {
          ...r,
          routeReason:
            `${distSavedMi} mi shorter · ${timeDiffMin <= 0 ? 'same time' : `${timeDiffMin} min longer`}`,
        };
      }
      if (timeDiffMin <= 0) return { ...r, routeReason: 'Shortest distance · Same time' };
      return { ...r, routeReason: `Shorter distance · ${timeDiffMin} min longer` };
    }

    if (r.routeType === 'alt') {
      const timeDiffMin = Math.round((r.duration - fastest.duration) / 60);
      if (r.congestionScore < fastest.congestionScore * 0.7 && timeDiffMin <= 3) {
        return {
          ...r,
          routeReason: `Less congestion · ${timeDiffMin <= 0 ? 'same time' : `${timeDiffMin} min longer`}`,
        };
      }
      if (timeDiffMin <= 0) return { ...r, routeReason: 'Alternative · Same travel time' };
      return { ...r, routeReason: `Alternative · ${timeDiffMin} min longer` };
    }

    return { ...r, routeReason: r.routeReason || ALT_REASON };
  });
}

export function rankDirectionsRoutesForMode(
  routes: DirectionsResult[],
  mode?: DrivingMode,
): DirectionsResult[] {
  return enrichRouteReasons(scoreAndRankRoutes(routes, mode), mode);
}
