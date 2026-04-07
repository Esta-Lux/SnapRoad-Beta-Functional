import type { DirectionsStep } from '../lib/directions';
import type { Coordinate } from '../types';
import type { ManeuverKind, NavStep } from './navModel';
import { nearestSegmentIndex } from './navGeometry';

function maneuverToKind(maneuver: string): ManeuverKind {
  const m = maneuver.toLowerCase().replace(/\s+/g, '-');
  switch (m) {
    case 'slight-left':
      return 'slight_left';
    case 'left':
      return 'left';
    case 'sharp-left':
      return 'sharp_left';
    case 'slight-right':
      return 'slight_right';
    case 'right':
      return 'right';
    case 'sharp-right':
      return 'sharp_right';
    case 'u-turn':
    case 'uturn':
      return 'uturn';
    case 'merge':
      return 'merge';
    case 'fork':
      return 'fork';
    case 'arrive':
      return 'arrive';
    case 'roundabout':
    case 'rotary':
      return 'fork';
    case 'depart':
      return 'straight';
    default:
      return 'straight';
  }
}

/**
 * Build {@link NavStep} list for {@link useNavigationProgress} from Mapbox-parsed steps + full polyline.
 */
export function buildNavStepsFromDirections(steps: DirectionsStep[], polyline: Coordinate[]): NavStep[] {
  const route = polyline.map((p) => ({ lat: p.lat, lng: p.lng }));
  let cumulativeFromStart = 0;

  return steps.map((step, index) => {
    const stepLen = step.distanceMeters ?? 0;
    const distanceMetersFromStart = cumulativeFromStart;
    cumulativeFromStart += stepLen;

    const next = steps[index + 1];
    const fallbackToNext = next?.distanceMeters ?? stepLen;

    const ptOk =
      Number.isFinite(step.lat) &&
      Number.isFinite(step.lng) &&
      (Math.abs(step.lat) > 1e-5 || Math.abs(step.lng) > 1e-5);
    const pt = ptOk && route.length >= 2 ? { lat: step.lat, lng: step.lng } : route[0]!;

    const segmentIndex = route.length >= 2 ? nearestSegmentIndex(route, pt) : 0;

    return {
      index,
      segmentIndex,
      distanceMetersFromStart,
      distanceMetersToNext: fallbackToNext,
      kind: maneuverToKind(step.maneuver),
      modifier: step.maneuver,
      streetName: step.name ?? null,
      instruction: step.instruction || null,
    };
  });
}
