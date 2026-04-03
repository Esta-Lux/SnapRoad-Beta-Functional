import type { Feature, FeatureCollection, LineString, Point, Position } from 'geojson';
import type { DirectionsStep } from '../lib/directions';
import { metersBetween } from '../utils/distance';
import type { Coordinate } from '../types';

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
  const step = rest.find(
    (s) =>
      s.maneuver !== 'arrive' &&
      s.maneuver !== 'depart' &&
      Number.isFinite(s.lat) &&
      Number.isFinite(s.lng),
  );
  return step ?? null;
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
): number {
  const step = getUpcomingManeuverStep(steps, currentStepIndex);
  if (!step || !Number.isFinite(step.lng) || !Number.isFinite(step.lat)) {
    return Number.POSITIVE_INFINITY;
  }
  return metersBetween(user, { lat: step.lat, lng: step.lng });
}
