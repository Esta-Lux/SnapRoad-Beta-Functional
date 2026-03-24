import Constants from 'expo-constants';
import type { Coordinate, DrivingMode } from '../types';

const MAPBOX_TOKEN =
  process.env.EXPO_PUBLIC_MAPBOX_TOKEN ||
  (Constants.expoConfig?.extra?.mapboxPublicToken as string) ||
  '';
const DIRECTIONS_BASE = 'https://api.mapbox.com/directions/v5/mapbox';
const GEOCODING_BASE = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

export type DirectionsProfile = 'driving' | 'driving-traffic';

export interface DirectionsStep {
  instruction: string;
  distance: string;
  distanceMeters: number;
  duration: string;
  maneuver: string;
  lanes?: string;
  lat: number;
  lng: number;
}

export interface DirectionsResult {
  polyline: Coordinate[];
  steps: DirectionsStep[];
  distance: number;
  duration: number;
  distanceText: string;
  durationText: string;
  routeType?: 'best' | 'eco';
}

export interface GeocodeResult {
  name: string;
  address?: string;
  lat: number;
  lng: number;
  placeType?: string;
}

function formatDistance(meters: number): string {
  const miles = meters / 1609.344;
  return miles < 0.1 ? `${Math.round(meters * 3.281)} ft` : `${miles.toFixed(1)} mi`;
}

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs} hr ${rem} min` : `${hrs} hr`;
}

function mapboxManeuverToSimple(modifier?: string, type?: string): string {
  if (type === 'arrive') return 'arrive';
  if (type === 'depart') return 'depart';
  if (type === 'roundabout' || type === 'rotary') return 'roundabout';
  if (type === 'merge') return 'merge';
  if (modifier === 'uturn') return 'u-turn';
  if (modifier === 'sharp left') return 'sharp-left';
  if (modifier === 'left') return 'left';
  if (modifier === 'slight left') return 'slight-left';
  if (modifier === 'sharp right') return 'sharp-right';
  if (modifier === 'right') return 'right';
  if (modifier === 'slight right') return 'slight-right';
  if (modifier === 'straight') return 'straight';
  return type || 'straight';
}

interface RawRoute {
  geometry: { coordinates: [number, number][] };
  legs: Array<{
    steps: Array<{
      maneuver?: { instruction?: string; modifier?: string; type?: string; location?: [number, number] };
      distance: number;
      duration: number;
      intersections?: Array<{ lanes?: unknown }>;
    }>;
  }>;
  distance: number;
  duration: number;
}

function parseRoute(route: RawRoute, routeType?: DirectionsResult['routeType']): DirectionsResult {
  const polyline: Coordinate[] = route.geometry.coordinates.map(
    (coord) => ({ lat: coord[1], lng: coord[0] }),
  );
  const steps: DirectionsStep[] = [];
  for (const leg of route.legs) {
    for (const step of leg.steps) {
      steps.push({
        instruction: step.maneuver?.instruction || '',
        distance: formatDistance(step.distance),
        distanceMeters: step.distance,
        duration: formatDuration(step.duration),
        maneuver: mapboxManeuverToSimple(step.maneuver?.modifier, step.maneuver?.type),
        lanes: step.intersections?.[0]?.lanes ? JSON.stringify(step.intersections[0].lanes) : undefined,
        lat: step.maneuver?.location?.[1] ?? 0,
        lng: step.maneuver?.location?.[0] ?? 0,
      });
    }
  }
  return {
    polyline,
    steps,
    distance: route.distance,
    duration: route.duration,
    distanceText: formatDistance(route.distance),
    durationText: formatDuration(route.duration),
    routeType,
  };
}

export async function forwardGeocode(
  query: string,
  proximity?: Coordinate,
  limit = 8,
): Promise<GeocodeResult[]> {
  if (!MAPBOX_TOKEN || !query.trim()) return [];
  const params = new URLSearchParams({
    access_token: MAPBOX_TOKEN,
    limit: String(limit),
    language: 'en',
    types: 'address,place,poi',
  });
  if (proximity) params.set('proximity', `${proximity.lng},${proximity.lat}`);
  try {
    const res = await fetch(`${GEOCODING_BASE}/${encodeURIComponent(query)}.json?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.features ?? []).map((f: { text?: string; place_name?: string; center?: [number, number]; place_type?: string[] }) => ({
      name: f.text ?? f.place_name ?? query,
      address: f.place_name,
      lng: f.center?.[0] ?? 0,
      lat: f.center?.[1] ?? 0,
      placeType: f.place_type?.[0],
    }));
  } catch {
    return [];
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeocodeResult | null> {
  if (!MAPBOX_TOKEN) return null;
  try {
    const res = await fetch(
      `${GEOCODING_BASE}/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&types=address,place,poi&limit=1`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const f = data.features?.[0];
    if (!f?.place_name) return null;
    return {
      name: f.text ?? f.place_name,
      address: f.place_name,
      lat: f.center?.[1] ?? lat,
      lng: f.center?.[0] ?? lng,
      placeType: f.place_type?.[0],
    };
  } catch {
    return null;
  }
}

interface DirectionsOptions {
  profile?: DirectionsProfile;
  alternatives?: boolean;
  maxHeightMeters?: number;
  exclude?: string;
}

export async function getMapboxDirections(
  origin: Coordinate,
  destination: Coordinate,
  options?: DirectionsOptions,
): Promise<DirectionsResult> {
  const profile = options?.profile ?? 'driving';
  const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const params = new URLSearchParams({
    access_token: MAPBOX_TOKEN,
    geometries: 'geojson',
    overview: 'full',
    steps: 'true',
    alternatives: String(options?.alternatives ?? false),
    language: 'en',
  });
  if (options?.exclude) params.set('exclude', options.exclude);
  if (typeof options?.maxHeightMeters === 'number' && Number.isFinite(options.maxHeightMeters)) {
    params.set('max_height', String(Math.max(0, Math.min(10, options.maxHeightMeters))));
  }

  const response = await fetch(`${DIRECTIONS_BASE}/${profile}/${coords}?${params}`);
  if (!response.ok) {
    throw new Error(`Mapbox Directions error ${response.status}`);
  }
  const data = await response.json();
  if (!data.routes?.length) throw new Error('No routes found');
  return parseRoute(data.routes[0]);
}

export function getModeDirectionsConfig(mode: DrivingMode): { profile: DirectionsProfile; exclude?: string } {
  switch (mode) {
    case 'calm':
      return { profile: 'driving', exclude: 'motorway' };
    case 'sport':
      return { profile: 'driving-traffic' };
    case 'adaptive':
    default:
      return { profile: 'driving-traffic' };
  }
}

export async function getMapboxRouteOptions(
  origin: Coordinate,
  destination: Coordinate,
  options?: { maxHeightMeters?: number; mode?: DrivingMode },
): Promise<DirectionsResult[]> {
  const modeConfig = getModeDirectionsConfig(options?.mode ?? 'adaptive');
  const maxHeightParam =
    typeof options?.maxHeightMeters === 'number' && Number.isFinite(options.maxHeightMeters)
      ? `&max_height=${Math.max(0, Math.min(10, options.maxHeightMeters))}`
      : '';
  const excludeParam = modeConfig.exclude ? `&exclude=${modeConfig.exclude}` : '';
  const results: DirectionsResult[] = [];

  try {
    const [drivingRes, trafficRes] = await Promise.all([
      fetch(
        `${DIRECTIONS_BASE}/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?access_token=${MAPBOX_TOKEN}&geometries=geojson&overview=full&steps=true&alternatives=true&language=en${maxHeightParam}${excludeParam}`,
      ).then((r) => (r.ok ? r.json() : { routes: [] })),
      fetch(
        `${DIRECTIONS_BASE}/${modeConfig.profile}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?access_token=${MAPBOX_TOKEN}&geometries=geojson&overview=full&steps=true&alternatives=false&language=en${maxHeightParam}${excludeParam}`,
      ).then((r) => (r.ok ? r.json() : { routes: [] })),
    ]);

    const drivingRoutes = (drivingRes.routes ?? []) as RawRoute[];
    const trafficRoutes = (trafficRes.routes ?? []) as RawRoute[];

    if (trafficRoutes.length > 0) {
      results.push(parseRoute(trafficRoutes[0], 'best'));
    }
    if (drivingRoutes.length > 0) {
      const byDist = [...drivingRoutes].sort((a, b) => a.distance - b.distance);
      const candidate = byDist[0];
      const existing = results.find((r) => r.duration === candidate.duration && r.distance === candidate.distance);
      if (!existing) {
        results.push(parseRoute(candidate, 'eco'));
      }
    }
  } catch {
    const single = await getMapboxDirections(origin, destination, {
      profile: modeConfig.profile,
      maxHeightMeters: options?.maxHeightMeters,
      exclude: modeConfig.exclude,
    });
    single.routeType = 'best';
    return [single];
  }

  if (results.length === 0) {
    const single = await getMapboxDirections(origin, destination, {
      profile: modeConfig.profile,
      maxHeightMeters: options?.maxHeightMeters,
      exclude: modeConfig.exclude,
    });
    single.routeType = 'best';
    return [single];
  }
  return results.slice(0, 2);
}
