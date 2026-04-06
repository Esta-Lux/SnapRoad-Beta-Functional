import type { Coordinate, DrivingMode } from '../types';
import { getMapboxPublicToken, isMapboxPublicTokenConfigured } from '../config/mapbox';
import { api } from '../api/client';

/** True when Mapbox Directions / Geocoding can run (token present in env or Expo extra). */
export function isMapboxDirectionsConfigured(): boolean {
  return isMapboxPublicTokenConfigured();
}
const DIRECTIONS_BASE = 'https://api.mapbox.com/directions/v5/mapbox';
const GEOCODING_BASE = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

export type DirectionsProfile = 'driving' | 'driving-traffic';

export interface StepIntersection {
  classes?: string[];  // e.g. ['traffic_signal'], ['stop_sign']
}

export interface BannerInstructionItem {
  text?: string;
  type?: string;
  modifier?: string;
  components?: Array<{
    type?: string;
    text?: string;
    imageBaseURL?: string;
    directions?: string[];
    active?: boolean;
  }>;
}

export interface BannerInstruction {
  distanceAlongGeometry?: number;
  primary?: BannerInstructionItem;
  secondary?: BannerInstructionItem | null;
  sub?: BannerInstructionItem | null;
}

export interface VoiceInstruction {
  distanceAlongGeometry?: number;
  announcement?: string;
  ssmlAnnouncement?: string;
}

export interface DirectionsStep {
  instruction: string;
  distance: string;
  distanceMeters: number;
  duration: string;
  maneuver: string;
  /** Road name of this step (from Mapbox `step.name`). */
  name?: string;
  lanes?: string;
  lat: number;
  lng: number;
  /**
   * Per-step line from Mapbox (`geometry.coordinates`), [lng, lat] pairs.
   * Present when directions are fetched with `geometries=geojson`.
   */
  geometryCoordinates?: [number, number][];
  /** Intersections along this step. First entry is usually the turn point. */
  intersections?: StepIntersection[];
  bannerInstructions?: BannerInstruction[];
  voiceInstructions?: VoiceInstruction[];
}

export type CongestionLevel = 'low' | 'moderate' | 'heavy' | 'severe' | 'unknown';

export interface DirectionsResult {
  polyline: Coordinate[];
  steps: DirectionsStep[];
  distance: number;
  duration: number;
  distanceText: string;
  durationText: string;
  routeType?: 'best' | 'eco' | 'alt';
  congestion?: CongestionLevel[];
  maxspeeds?: (number | null)[];
}

export interface GeocodeResult {
  name: string;
  address?: string;
  lat: number;
  lng: number;
  placeType?: string;
  category?: string;
  maki?: string;
  place_id?: string;
  /** Google Places photo ref — use `/api/places/_photo?ref=` */
  photo_reference?: string;
  open_now?: boolean;
  price_level?: number;
}

/** Parsed search box query: strips intent phrases and sets flags for local-first / open-now behavior. */
export interface PreparedMapSearch {
  /** Query sent to `/api/places/autocomplete` or Mapbox forward geocode */
  query: string;
  /** Request Google Text Search with `opennow` when lat/lng present (backend). */
  openNow: boolean;
  /** Prefer Google Text Search (distance-ranked in backend) vs Autocomplete. */
  preferTextSearch: boolean;
  /** Location bias radius in meters for backend. */
  radiusM: number;
}

const RE_OPEN_NOW = /\b(open\s+now|open\s+right\s+now|currently\s+open)\b/i;
const RE_NEAR_ME = /\b(near\s+me|nearby|around\s+me|close\s+to\s+me)\b/i;
const RE_CLOSEST = /\b(closest|nearest)\b/i;
/** Maps to plain POI search (no price claims). Includes legacy "cheap gas" phrasing. */
const RE_NEARBY_GAS = /\b(nearby\s+gas|gas\s+near\s*me|cheap\s+gas(?:\s+near)?)\b/i;
const RE_NEARBY_COFFEE = /\b(nearby\s+coffee|coffee\s+near\s*me)\b/i;

/**
 * Normalize natural-language map search for driving: local bias, optional open-now, POI shortcuts.
 * Backend must support `open_now` + `textsearch` query params; Mapbox fallback is proximity-biased + sorted by distance.
 */
export function prepareMapSearchQuery(raw: string): PreparedMapSearch {
  const original = raw.trim();
  let q = original;
  let openNow = false;
  let preferTextSearch = false;
  let radiusM = 14000;

  if (RE_NEARBY_GAS.test(original)) {
    return {
      query: 'gas station',
      openNow: false,
      preferTextSearch: true,
      radiusM: 18000,
    };
  }
  if (RE_NEARBY_COFFEE.test(original)) {
    return {
      query: 'coffee',
      openNow: false,
      preferTextSearch: true,
      radiusM: 12000,
    };
  }

  if (RE_OPEN_NOW.test(q)) {
    openNow = true;
    preferTextSearch = true;
    q = q.replace(RE_OPEN_NOW, ' ').replace(/\s+/g, ' ').trim();
  }

  const localIntent = RE_NEAR_ME.test(q) || RE_CLOSEST.test(q);
  if (localIntent) {
    preferTextSearch = true;
    radiusM = 12000;
    q = q.replace(RE_NEAR_ME, ' ').replace(RE_CLOSEST, ' ').replace(/\s+/g, ' ').trim();
  }

  if (openNow && q.length < 2) {
    q = 'restaurants';
  }
  if (localIntent && q.length < 2) {
    q = 'restaurants';
  }

  return {
    query: q.trim(),
    openNow,
    preferTextSearch,
    radiusM,
  };
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

export function mapboxManeuverToSimple(modifier?: string, type?: string): string {
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

/** Raw Mapbox `routes[]` entry — shared by client and `/api/navigation/mapbox-routes` proxy. */
interface RawRoute {
  geometry: { coordinates: [number, number][] };
  legs: Array<{
    steps: Array<{
      geometry?: { coordinates?: [number, number][]; type?: string };
      maneuver?: { instruction?: string; modifier?: string; type?: string; location?: [number, number] };
      name?: string;
      distance: number;
      duration: number;
      intersections?: Array<{ lanes?: unknown; classes?: string[] }>;
      bannerInstructions?: BannerInstruction[];
      banner_instructions?: BannerInstruction[];
      voiceInstructions?: VoiceInstruction[];
      voice_instructions?: VoiceInstruction[];
    }>;
    annotation?: {
      congestion?: string[];
      maxspeed?: Array<{ speed?: number; unit?: string; unknown?: boolean }>;
    };
  }>;
  distance: number;
  duration: number;
}

function parseRoute(route: RawRoute, routeType?: DirectionsResult['routeType']): DirectionsResult {
  const polyline: Coordinate[] = route.geometry.coordinates.map(
    (coord) => ({ lat: coord[1], lng: coord[0] }),
  );
  const steps: DirectionsStep[] = [];
  const allCongestion: CongestionLevel[] = [];
  const allMaxspeeds: (number | null)[] = [];

  for (const leg of route.legs) {
    for (const step of leg.steps) {
      const g = step.geometry?.coordinates;
      steps.push({
        instruction: step.maneuver?.instruction || '',
        distance: formatDistance(step.distance),
        distanceMeters: step.distance,
        duration: formatDuration(step.duration),
        maneuver: mapboxManeuverToSimple(step.maneuver?.modifier, step.maneuver?.type),
        name: typeof step.name === 'string' && step.name ? step.name : undefined,
        lanes: step.intersections?.[0]?.lanes ? JSON.stringify(step.intersections[0].lanes) : undefined,
        lat: step.maneuver?.location?.[1] ?? 0,
        lng: step.maneuver?.location?.[0] ?? 0,
        geometryCoordinates: Array.isArray(g) && g.length >= 2 ? g : undefined,
        intersections: Array.isArray(step.intersections)
          ? step.intersections.map((int: unknown) => {
              const intRec = int as { classes?: string[] };
              return {
                classes: Array.isArray(intRec.classes) ? intRec.classes : [],
              };
            })
          : undefined,
        bannerInstructions: step.bannerInstructions ?? step.banner_instructions ?? [],
        voiceInstructions: step.voiceInstructions ?? step.voice_instructions ?? [],
      });
    }
    if (leg.annotation?.congestion) {
      for (const c of leg.annotation.congestion) {
        allCongestion.push(
          c === 'low' || c === 'moderate' || c === 'heavy' || c === 'severe' ? c : 'unknown',
        );
      }
    }
    if (leg.annotation?.maxspeed) {
      for (const ms of leg.annotation.maxspeed) {
        if (ms.unknown || typeof ms.speed !== 'number') {
          allMaxspeeds.push(null);
        } else {
          allMaxspeeds.push(ms.unit === 'km/h' ? Math.round(ms.speed * 0.621371) : ms.speed);
        }
      }
    }
  }
  const edgeCount = Math.max(0, polyline.length - 1);
  const congestionAligned =
    allCongestion.length > 0 && edgeCount > 0 && allCongestion.length === edgeCount
      ? allCongestion
      : undefined;

  return {
    polyline,
    steps,
    distance: route.distance,
    duration: route.duration,
    distanceText: formatDistance(route.distance),
    durationText: formatDuration(route.duration),
    routeType,
    congestion: congestionAligned,
    maxspeeds: allMaxspeeds.length > 0 ? allMaxspeeds : undefined,
  };
}

export async function forwardGeocode(
  query: string,
  proximity?: Coordinate,
  limit = 10,
  opts?: { bbox?: string },
): Promise<GeocodeResult[]> {
  const MAPBOX_TOKEN = getMapboxPublicToken();
  if (!MAPBOX_TOKEN || !query.trim()) return [];
  const params = new URLSearchParams({
    access_token: MAPBOX_TOKEN,
    limit: String(limit),
    language: 'en',
    autocomplete: 'true',
    fuzzyMatch: 'true',
    types: 'poi,address,place,locality,neighborhood',
  });
  if (proximity) params.set('proximity', `${proximity.lng},${proximity.lat}`);
  if (opts?.bbox) params.set('bbox', opts.bbox);
  try {
    const res = await fetch(`${GEOCODING_BASE}/${encodeURIComponent(query)}.json?${params}`);
    if (!res.ok) {
      if (__DEV__) console.warn('[geocode] HTTP', res.status, await res.text().catch(() => ''));
      return [];
    }
    const data = await res.json();
    return (data.features ?? []).map((f: any) => {
      const contextParts: string[] = [];
      if (Array.isArray(f.context)) {
        for (const ctx of f.context) {
          if (ctx.id?.startsWith('place.') || ctx.id?.startsWith('region.'))
            contextParts.push(ctx.text);
        }
      }
      const shortAddress = contextParts.length > 0
        ? `${f.address ? f.address + ' ' : ''}${f.text ?? ''}${contextParts.length ? ', ' + contextParts.join(', ') : ''}`
        : f.place_name ?? '';
      return {
        name: f.text ?? f.place_name ?? query,
        address: shortAddress,
        lng: f.center?.[0] ?? 0,
        lat: f.center?.[1] ?? 0,
        placeType: f.place_type?.[0],
        category: Array.isArray(f.properties?.category) ? f.properties.category[0] : f.properties?.category,
        maki: f.properties?.maki,
      };
    });
  } catch (err) {
    if (__DEV__) console.warn('[geocode] error', err);
    return [];
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeocodeResult | null> {
  const MAPBOX_TOKEN = getMapboxPublicToken();
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

const DIRECTIONS_BANNER_VOICE_PARAMS =
  'banner_instructions=true&voice_instructions=true&voice_units=imperial';

export async function getMapboxDirections(
  origin: Coordinate,
  destination: Coordinate,
  options?: DirectionsOptions,
): Promise<DirectionsResult> {
  const profile = options?.profile ?? 'driving';
  const MAPBOX_TOKEN = getMapboxPublicToken();
  const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const params = new URLSearchParams({
    access_token: MAPBOX_TOKEN,
    geometries: 'geojson',
    overview: 'full',
    steps: 'true',
    alternatives: String(options?.alternatives ?? false),
    language: 'en',
    annotations: 'congestion,maxspeed,speed',
    banner_instructions: 'true',
    voice_instructions: 'true',
    voice_units: 'imperial',
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
      return { profile: 'driving-traffic', exclude: 'motorway' };
    case 'sport':
      return { profile: 'driving-traffic' };
    case 'adaptive':
    default:
      return { profile: 'driving-traffic' };
  }
}

type MapboxDirectionsJson = { routes?: RawRoute[]; message?: string };

/** Prefer backend proxy (MAPBOX_ACCESS_TOKEN on API) so preview + active nav share identical geometry. */
async function fetchMapboxTrafficRoutesFromBackend(
  origin: Coordinate,
  destination: Coordinate,
  options?: { maxHeightMeters?: number; mode?: DrivingMode; fastSingleRoute?: boolean },
): Promise<RawRoute[] | null> {
  try {
    const modeConfig = getModeDirectionsConfig(options?.mode ?? 'adaptive');
    const res = await api.post<MapboxDirectionsJson>('/api/navigation/mapbox-routes', {
      origin_lat: origin.lat,
      origin_lng: origin.lng,
      dest_lat: destination.lat,
      dest_lng: destination.lng,
      profile: modeConfig.profile,
      exclude: modeConfig.exclude ?? undefined,
      max_height_m:
        typeof options?.maxHeightMeters === 'number' && Number.isFinite(options.maxHeightMeters)
          ? Math.max(0, Math.min(10, options.maxHeightMeters))
          : undefined,
      alternatives: !options?.fastSingleRoute,
    });
    const routes = res.success && res.data && Array.isArray(res.data.routes) ? res.data.routes : null;
    if (!routes?.length) return null;
    return routes as RawRoute[];
  } catch {
    return null;
  }
}

export async function getMapboxRouteOptions(
  origin: Coordinate,
  destination: Coordinate,
  options?: { maxHeightMeters?: number; mode?: DrivingMode; fastSingleRoute?: boolean },
): Promise<DirectionsResult[]> {
  const modeConfig = getModeDirectionsConfig(options?.mode ?? 'adaptive');
  const maxHeightParam =
    typeof options?.maxHeightMeters === 'number' && Number.isFinite(options.maxHeightMeters)
      ? `&max_height=${Math.max(0, Math.min(10, options.maxHeightMeters))}`
      : '';
  const excludeParam = modeConfig.exclude ? `&exclude=${encodeURIComponent(modeConfig.exclude)}` : '';
  const coordsPath = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;

  let trafficRoutes =
    (await fetchMapboxTrafficRoutesFromBackend(origin, destination, options)) ?? [];

  if (!trafficRoutes.length) {
    if (!isMapboxDirectionsConfigured()) {
      throw new Error(
        'No route source available. Configure MAPBOX_ACCESS_TOKEN on the API, or set EXPO_PUBLIC_MAPBOX_TOKEN in the app.',
      );
    }
    const MAPBOX_TOKEN = getMapboxPublicToken();
    const tokenQS = `access_token=${encodeURIComponent(MAPBOX_TOKEN)}`;
    const commonQS =
      `${tokenQS}&geometries=geojson&overview=full&steps=true&language=en&annotations=congestion,maxspeed,speed&${DIRECTIONS_BANNER_VOICE_PARAMS}${maxHeightParam}${excludeParam}`;
    const trafficUrl = `${DIRECTIONS_BASE}/${modeConfig.profile}/${coordsPath}?${commonQS}&alternatives=${options?.fastSingleRoute ? 'false' : 'true'}`;
    const trafficRes = await fetch(trafficUrl);
    const trafficJson = (await trafficRes.json().catch(() => ({}))) as MapboxDirectionsJson;
    if (!trafficRes.ok) {
      const msg = trafficJson?.message || `HTTP ${trafficRes.status}`;
      throw new Error(`Mapbox Directions: ${msg}`);
    }
    trafficRoutes = (trafficJson.routes ?? []) as RawRoute[];
    if (!trafficRoutes.length) {
      throw new Error('No route found between these locations.');
    }
  }

  const MAPBOX_TOKEN = isMapboxDirectionsConfigured() ? getMapboxPublicToken() : '';
  const tokenQS = MAPBOX_TOKEN ? `access_token=${encodeURIComponent(MAPBOX_TOKEN)}` : '';
  const commonQS =
    tokenQS &&
    `${tokenQS}&geometries=geojson&overview=full&steps=true&language=en&annotations=congestion,maxspeed,speed&${DIRECTIONS_BANNER_VOICE_PARAMS}${maxHeightParam}${excludeParam}`;

  const results: DirectionsResult[] = [parseRoute(trafficRoutes[0]!, 'best')];
  for (let i = 1; i < trafficRoutes.length && !options?.fastSingleRoute && results.length < 3; i++) {
    results.push(parseRoute(trafficRoutes[i]!, 'alt'));
  }

  if (!options?.fastSingleRoute && results.length < 3 && commonQS) {
    try {
      const drivingUrl = `${DIRECTIONS_BASE}/driving/${coordsPath}?${commonQS}&alternatives=true`;
      const drivingRes = await fetch(drivingUrl);
      if (drivingRes.ok) {
        const drivingJson = (await drivingRes.json()) as { routes?: RawRoute[] };
        const drivingRoutes = (drivingJson.routes ?? []) as RawRoute[];
        if (drivingRoutes.length > 0) {
          const byDist = [...drivingRoutes].sort((a, b) => a.distance - b.distance);
          for (const candidate of byDist) {
            if (results.length >= 3) break;
            const dup = results.find(
              (r) =>
                Math.abs(r.duration - candidate.duration) < 30 && Math.abs(r.distance - candidate.distance) < 200,
            );
            if (!dup) {
              results.push(parseRoute(candidate, 'eco'));
            }
          }
        }
      }
    } catch {
      /* Eco alternative is optional */
    }
  }

  return results.slice(0, 3);
}
