import type { Feature, FeatureCollection, LineString, Point, Position } from 'geojson';
import type { DirectionsStep } from '../lib/directions';
import { alongRouteDistanceMeters, metersBetween } from '../utils/distance';
import type { Coordinate } from '../types';

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

function featureCollection(
  features: Array<Feature<LineString | Point>>,
): FeatureCollection {
  return { type: 'FeatureCollection', features };
}

function lineFeature(
  coordinates: Position[],
  properties: Record<string, unknown> = {},
): Feature<LineString> {
  return {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates },
    properties,
  };
}

function pointFeature(
  coordinates: Position,
  properties: Record<string, unknown> = {},
): Feature<Point> {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates },
    properties,
  };
}

/** Next step used for on-map maneuver highlight (matches prior TurnSignal “upcoming” set). */
export function getUpcomingManeuverStep(
  steps: DirectionsStep[] | undefined,
  currentStepIndex: number,
): DirectionsStep | null {
  if (!steps?.length) return null;
  const rest = steps.slice(currentStepIndex + 1);
  const actionable = rest.find((s) => isActionableGuidanceStep(s, false));
  if (actionable) return actionable;
  const arrival = rest.find((s) => isActionableGuidanceStep(s, true));
  return arrival ?? null;
}

function bearingBetween(a: Position, b: Position): number {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const y = Math.sin(toRad(lng2 - lng1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lng2 - lng1));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function buildManeuverSegmentFeatureCollection(
  step: DirectionsStep | null,
): FeatureCollection {
  if (!step?.geometryCoordinates?.length) return featureCollection([]);

  const coords = step.geometryCoordinates as Position[];
  const shortSegment = coords.slice(0, Math.min(coords.length, 8));
  if (shortSegment.length < 2) return featureCollection([]);

  return featureCollection([
    lineFeature(shortSegment, {
      maneuverType: step.maneuver ?? 'turn',
    }),
  ]);
}

export function buildManeuverArrowPointFeatureCollection(
  step: DirectionsStep | null,
): FeatureCollection {
  if (!step?.geometryCoordinates?.length) return featureCollection([]);
  const coords = step.geometryCoordinates as Position[];
  if (coords.length < 2) return featureCollection([]);

  const a = coords[Math.min(1, coords.length - 2)];
  const b = coords[Math.min(2, coords.length - 1)];
  const bearing = bearingBetween(a, b);

  return featureCollection([pointFeature(b, { bearing })]);
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
