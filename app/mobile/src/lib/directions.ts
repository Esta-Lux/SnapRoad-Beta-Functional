import type { Coordinate, DrivingMode } from '../types';
import { getMapboxPublicToken, isMapboxPublicTokenConfigured } from '../config/mapbox';
import { api } from '../api/client';
import { routeSummaryFromMapboxMetersSeconds } from '../utils/routeDisplay';

/** True when Mapbox Directions / Geocoding can run (token present in env or Expo extra). */
export function isMapboxDirectionsConfigured(): boolean {
  return isMapboxPublicTokenConfigured();
}
const DIRECTIONS_BASE = 'https://api.mapbox.com/directions/v5/mapbox';
const GEOCODING_BASE = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

export type DirectionsProfile = 'driving' | 'driving-traffic';

export interface StepIntersection {
  classes?: string[];
  lanes?: Array<{
    valid?: boolean;
    active?: boolean;
    indications?: string[];
    valid_indication?: string;
  }>;
  traffic_signal?: boolean;
  stop_sign?: boolean;
  yield_sign?: boolean;
  railway_crossing?: boolean;
  toll_collection?: unknown;
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
    indications?: string[];
    active?: boolean;
    valid_indication?: string;
    validIndication?: string;
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
  /** Raw Mapbox step duration (seconds), used for navigation ETA. */
  durationSeconds: number;
  maneuver: string;
  /** Original Mapbox maneuver fields for rich NavStep (optional). */
  mapboxManeuver?: {
    type?: string;
    modifier?: string;
    bearing_after?: number;
    exit?: number;
  };
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

/** Preview / navigation route classification — all strategies use `driving-traffic`. */
export type RouteKind = 'fastest' | 'no_highways' | 'avoid_tolls' | 'eco' | 'alt';

export interface RouteParseMeta {
  routeType: RouteKind;
  routeLabel: string;
  routeReason: string;
}

const ROUTE_DEFAULTS: Record<RouteKind, { label: string; reason: string }> = {
  fastest: { label: 'Fastest', reason: 'Fastest with live traffic' },
  no_highways: { label: 'No Highways', reason: 'Avoids motorways & highways' },
  avoid_tolls: { label: 'Avoid Tolls', reason: 'No toll roads' },
  eco: { label: 'Eco', reason: 'Shorter distance, less fuel' },
  alt: { label: 'Alternate', reason: 'Alternative route' },
};

export interface DirectionsResult {
  polyline: Coordinate[];
  steps: DirectionsStep[];
  distance: number;
  duration: number;
  distanceText: string;
  durationText: string;
  routeType: RouteKind;
  routeLabel: string;
  routeReason: string;
  /** 0–1 density of heavy/severe/moderate congestion along annotated edges. */
  congestionScore: number;
  /** Versus slowest option in the preview set (seconds); filled after scoring. */
  timeSavedSeconds: number;
  congestion?: CongestionLevel[];
  /** Count of Mapbox closure annotations on this route (driving-traffic only). */
  closureEdgeCount?: number;
  maxspeeds?: (number | null)[];
  /** Per-edge typical (Mapbox `annotations.speed`) in km/h when aligned to polyline edges. */
  edgeSpeedsKmh?: (number | null)[];
  /** Per-edge duration in seconds when Mapbox `annotations.duration` aligns to edges. */
  edgeDurationSec?: number[] | undefined;
}

type ParseMetaInput = RouteKind | 'best' | RouteParseMeta | undefined;

function congestionDensityScoreFromLevels(levels: CongestionLevel[]): number {
  if (!levels.length) return 0;
  let bad = 0;
  for (const c of levels) {
    if (c === 'heavy') bad += 1;
    else if (c === 'severe') bad += 2;
    else if (c === 'moderate') bad += 0.3;
  }
  return Math.min(1, bad / levels.length);
}

function closureEdgeCountFromAnnotation(values: unknown[] | undefined): number {
  if (!Array.isArray(values) || !values.length) return 0;
  let count = 0;
  for (const v of values) {
    if (v == null || v === false || v === 0 || v === '0' || v === '') continue;
    count += 1;
  }
  return count;
}

function resolveParseMeta(input?: ParseMetaInput): RouteParseMeta {
  if (input == null) {
    const d = ROUTE_DEFAULTS.fastest;
    return { routeType: 'fastest', routeLabel: d.label, routeReason: d.reason };
  }
  if (typeof input === 'string') {
    const k: RouteKind = input === 'best' ? 'fastest' : (input as RouteKind);
    const d = ROUTE_DEFAULTS[k];
    return { routeType: k, routeLabel: d.label, routeReason: d.reason };
  }
  const d = ROUTE_DEFAULTS[input.routeType ?? 'fastest'];
  return {
    routeType: input.routeType ?? 'fastest',
    routeLabel: input.routeLabel ?? d.label,
    routeReason: input.routeReason ?? d.reason,
  };
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
  /** When `open_now` was last observed (details API or search response); used for TTL in Recent list. */
  open_now_last_updated_at?: number;
  price_level?: number;
  /**
   * Server-supplied distance from the user's location (meters). Google
   * autocomplete returns this on every prediction even when no `lat/lng`
   * is included in the response. The mobile sort + row label fall back
   * to it whenever the row's lat/lng is missing or set to (0, 0).
   */
  distance_meters?: number;
  /** Google Places rating (0–5). Surfaced in card rows when present. */
  rating?: number;
  /** Total number of reviews backing `rating`. */
  user_ratings_total?: number;
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

/** Per-step duration line (step-level seconds → text). Whole-route labels use `routeSummaryFromMapboxMetersSeconds`. */
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
export interface RawRoute {
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
      closure?: unknown[];
      maxspeed?: Array<{ speed?: number; unit?: string; unknown?: boolean }>;
      /** km/h per route segment when present. */
      speed?: number[];
      /** seconds per route segment when present. */
      duration?: number[];
    };
  }>;
  distance: number;
  duration: number;
}

type MapboxLegStep = RawRoute['legs'][number]['steps'][number];

/**
 * Mapbox often leaves `maneuver.instruction` empty; banner + voice carry the real turn text.
 */
export function mapboxStepPrimaryInstruction(step: MapboxLegStep): string {
  const direct = step.maneuver?.instruction?.trim();
  if (direct) return direct;
  const banners = step.bannerInstructions ?? step.banner_instructions ?? [];
  for (const b of banners) {
    const p = b?.primary;
    if (p?.text?.trim()) return p.text.trim();
    if (p?.components?.length) {
      const joined = p.components
        .map((c) => (typeof c?.text === 'string' ? c.text : ''))
        .join('')
        .trim();
      if (joined) return joined;
    }
  }
  const voice = step.voiceInstructions ?? step.voice_instructions ?? [];
  for (const v of voice) {
    const a = v?.announcement?.trim();
    if (a) return a.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  return '';
}

/** Match intersection lane extraction: prefer the last intersection that carries lane arrays (decision point). */
function lanesJsonFromIntersections(step: {
  intersections?: Array<{ lanes?: unknown }>;
}): string | undefined {
  const ixns = step.intersections;
  if (!Array.isArray(ixns) || !ixns.length) return undefined;
  for (let i = ixns.length - 1; i >= 0; i--) {
    const lanes = ixns[i]?.lanes;
    if (Array.isArray(lanes) && lanes.length) return JSON.stringify(lanes);
  }
  return undefined;
}

export function parseMapboxDirectionsRoute(
  route: RawRoute,
  metaInput?: ParseMetaInput,
): DirectionsResult {
  const meta = resolveParseMeta(metaInput);
  const polyline: Coordinate[] = route.geometry.coordinates.map(
    (coord) => ({ lat: coord[1], lng: coord[0] }),
  );
  const steps: DirectionsStep[] = [];
  const allCongestion: CongestionLevel[] = [];
  const allMaxspeeds: (number | null)[] = [];
  const allSpeedKmh: (number | null)[] = [];
  const allDurationSec: number[] = [];
  let closureEdgeCount = 0;

  for (const leg of route.legs) {
    for (const step of leg.steps) {
      const g = step.geometry?.coordinates;
      const mv = step.maneuver;
      steps.push({
        instruction: mapboxStepPrimaryInstruction(step),
        distance: formatDistance(step.distance),
        distanceMeters: step.distance,
        duration: formatDuration(step.duration),
        durationSeconds: Math.max(0, step.duration ?? 0),
        maneuver: mapboxManeuverToSimple(mv?.modifier, mv?.type),
        mapboxManeuver: mv
          ? {
              type: mv.type,
              modifier: mv.modifier,
              bearing_after: (mv as { bearing_after?: number }).bearing_after,
              exit: (mv as { exit?: number }).exit,
            }
          : undefined,
        name: typeof step.name === 'string' && step.name ? step.name : undefined,
        lanes: lanesJsonFromIntersections(step),
        lat: step.maneuver?.location?.[1] ?? 0,
        lng: step.maneuver?.location?.[0] ?? 0,
        geometryCoordinates: Array.isArray(g) && g.length >= 2 ? g : undefined,
        intersections: Array.isArray(step.intersections)
          ? step.intersections.map((int: unknown) => {
              const r = int as Record<string, unknown>;
              return {
                classes: Array.isArray(r.classes) ? r.classes : [],
                lanes: r.lanes as StepIntersection['lanes'],
                traffic_signal: r.traffic_signal as boolean | undefined,
                stop_sign: r.stop_sign as boolean | undefined,
                yield_sign: r.yield_sign as boolean | undefined,
                railway_crossing: r.railway_crossing as boolean | undefined,
                toll_collection: r.toll_collection,
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
    if (Array.isArray(leg.annotation?.speed)) {
      for (const sk of leg.annotation.speed) {
        if (typeof sk === 'number' && Number.isFinite(sk)) {
          allSpeedKmh.push(sk);
        } else {
          allSpeedKmh.push(null);
        }
      }
    }
    if (Array.isArray(leg.annotation?.duration)) {
      for (const d of leg.annotation.duration) {
        allDurationSec.push(typeof d === 'number' && Number.isFinite(d) && d >= 0 ? d : 0);
      }
    }
    closureEdgeCount += closureEdgeCountFromAnnotation(leg.annotation?.closure);
  }
  const edgeCount = Math.max(0, polyline.length - 1);
  const congestionAligned =
    allCongestion.length > 0 && edgeCount > 0 && allCongestion.length === edgeCount
      ? allCongestion
      : undefined;
  const speedsAligned =
    allSpeedKmh.length > 0 && edgeCount > 0 && allSpeedKmh.length === edgeCount ? allSpeedKmh : undefined;
  const durationAligned =
    allDurationSec.length > 0 && edgeCount > 0 && allDurationSec.length === edgeCount
      ? allDurationSec
      : undefined;

  const summary = routeSummaryFromMapboxMetersSeconds(route.distance, route.duration);
  return {
    polyline,
    steps,
    distance: route.distance,
    duration: route.duration,
    distanceText: summary.distanceText,
    durationText: summary.durationText,
    routeType: meta.routeType,
    routeLabel: meta.routeLabel,
    routeReason: meta.routeReason,
    congestionScore: congestionDensityScoreFromLevels(allCongestion),
    timeSavedSeconds: 0,
    congestion: congestionAligned,
    closureEdgeCount,
    maxspeeds: allMaxspeeds.length > 0 ? allMaxspeeds : undefined,
    edgeSpeedsKmh: speedsAligned,
    edgeDurationSec: durationAligned,
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
  const profile = options?.profile ?? 'driving-traffic';
  const MAPBOX_TOKEN = getMapboxPublicToken();
  const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const params = new URLSearchParams({
    access_token: MAPBOX_TOKEN,
    geometries: 'geojson',
    overview: 'full',
    steps: 'true',
    alternatives: String(options?.alternatives ?? false),
    language: 'en',
    annotations: 'congestion,maxspeed,speed,duration',
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
  return parseMapboxDirectionsRoute(data.routes[0], 'fastest');
}

export function getModeDirectionsConfig(_mode: DrivingMode): { profile: DirectionsProfile; exclude?: string } {
  return { profile: 'driving-traffic' };
}

type MapboxDirectionsJson = { routes?: RawRoute[]; message?: string };

const ECO_TIME_FACTOR = 1.2;
const MAX_PREVIEW_ROUTES = 6;
const MAX_FASTEST_ROUTE_VARIANTS = 4;

interface RouteStrategy {
  type: RouteKind;
  exclude?: string;
  alternatives: boolean;
  preferShortest: boolean;
}

function routeRankingPenalty(route: Pick<DirectionsResult, 'duration' | 'distance' | 'congestionScore' | 'closureEdgeCount'>): number {
  const closurePenalty = (route.closureEdgeCount ?? 0) * 9000;
  const congestionPenalty = route.congestionScore * 180;
  const distancePenalty = route.distance / 1609.34;
  return route.duration + closurePenalty + congestionPenalty + distancePenalty;
}

const ROUTE_STRATEGIES: RouteStrategy[] = [
  { type: 'fastest', alternatives: true, preferShortest: false },
  { type: 'no_highways', exclude: 'motorway', alternatives: false, preferShortest: false },
  { type: 'avoid_tolls', exclude: 'toll', alternatives: false, preferShortest: false },
  { type: 'eco', alternatives: true, preferShortest: true },
];

function buildClientDirectionsUrl(
  origin: Coordinate,
  destination: Coordinate,
  opts: { exclude?: string; alternatives: boolean; maxHeightMeters?: number },
): string {
  const MAPBOX_TOKEN = getMapboxPublicToken();
  const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const params = new URLSearchParams({
    access_token: MAPBOX_TOKEN,
    geometries: 'geojson',
    overview: 'full',
    steps: 'true',
    language: 'en',
    annotations: 'congestion,maxspeed,speed,duration',
    banner_instructions: 'true',
    voice_instructions: 'true',
    voice_units: 'imperial',
    roundabout_exits: 'true',
    alternatives: String(opts.alternatives),
  });
  if (opts.exclude) params.set('exclude', opts.exclude);
  if (typeof opts.maxHeightMeters === 'number' && Number.isFinite(opts.maxHeightMeters)) {
    params.set('max_height', String(Math.max(0, Math.min(10, opts.maxHeightMeters))));
  }
  return `${DIRECTIONS_BASE}/driving-traffic/${coords}?${params.toString()}`;
}

/** Prefer backend proxy (MAPBOX_ACCESS_TOKEN on API) so preview + active nav share identical geometry. */
async function fetchMapboxTrafficRoutesFromBackend(
  origin: Coordinate,
  destination: Coordinate,
  options?: {
    maxHeightMeters?: number;
    mode?: DrivingMode;
    fastSingleRoute?: boolean;
    exclude?: string | null;
    alternatives?: boolean;
  },
): Promise<RawRoute[] | null> {
  try {
    const modeConfig = getModeDirectionsConfig(options?.mode ?? 'adaptive');
    const alt =
      options?.alternatives !== undefined ? options.alternatives : !options?.fastSingleRoute;
    const excl = options?.exclude !== undefined ? options.exclude : modeConfig.exclude;
    const res = await api.post<MapboxDirectionsJson>('/api/navigation/mapbox-routes', {
      origin_lat: origin.lat,
      origin_lng: origin.lng,
      dest_lat: destination.lat,
      dest_lng: destination.lng,
      profile: modeConfig.profile,
      exclude: excl || undefined,
      max_height_m:
        typeof options?.maxHeightMeters === 'number' && Number.isFinite(options.maxHeightMeters)
          ? Math.max(0, Math.min(10, options.maxHeightMeters))
          : undefined,
      alternatives: alt,
      cache_bust_ms: Date.now(),
    });
    const routes = res.success && res.data && Array.isArray(res.data.routes) ? res.data.routes : null;
    if (!routes?.length) return null;
    return routes as RawRoute[];
  } catch {
    return null;
  }
}

async function fetchMapboxTrafficRoutesRaw(
  origin: Coordinate,
  destination: Coordinate,
  options: {
    exclude?: string;
    alternatives: boolean;
    maxHeightMeters?: number;
    mode?: DrivingMode;
    timeoutMs?: number;
  },
): Promise<RawRoute[]> {
  const backend = await fetchMapboxTrafficRoutesFromBackend(origin, destination, {
    maxHeightMeters: options.maxHeightMeters,
    mode: options.mode,
    exclude: options.exclude,
    alternatives: options.alternatives,
    fastSingleRoute: !options.alternatives,
  });
  if (backend?.length) return backend;
  if (!isMapboxDirectionsConfigured()) return [];
  const url = buildClientDirectionsUrl(origin, destination, {
    exclude: options.exclude,
    alternatives: options.alternatives,
    maxHeightMeters: options.maxHeightMeters,
  });
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 12000;
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    const json = (await res.json().catch(() => ({}))) as MapboxDirectionsJson;
    if (!res.ok) return [];
    return (json.routes ?? []) as RawRoute[];
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }
}

function routeGeometryHash(route: DirectionsResult): string {
  const pts = route.polyline;
  if (pts.length < 4) return `${route.distance}`;
  const step = Math.max(1, Math.floor(pts.length / 8));
  let hash = '';
  for (let i = 0; i < pts.length; i += step) {
    hash += `${pts[i]!.lat.toFixed(4)},${pts[i]!.lng.toFixed(4)};`;
  }
  return hash;
}

function isDuplicateDirectionsResult(route: DirectionsResult, existing: DirectionsResult[]): boolean {
  const hash = routeGeometryHash(route);
  for (const e of existing) {
    if (routeGeometryHash(e) === hash) return true;
    const timeDiff = Math.abs(route.duration - e.duration) / Math.max(1, e.duration);
    const distDiff = Math.abs(route.distance - e.distance) / Math.max(1, e.distance);
    if (timeDiff < 0.03 && distDiff < 0.03) return true;
  }
  return false;
}

async function executeRouteStrategy(
  origin: Coordinate,
  destination: Coordinate,
  strategy: RouteStrategy,
  maxHeightMeters: number | undefined,
  mode: DrivingMode | undefined,
): Promise<DirectionsResult[]> {
  const rawRoutes = await fetchMapboxTrafficRoutesRaw(origin, destination, {
    exclude: strategy.exclude,
    alternatives: strategy.alternatives,
    maxHeightMeters,
    mode,
    timeoutMs: 10000,
  });
  if (!rawRoutes.length) return [];
  const parsedRoutes = rawRoutes.map((raw, idx) =>
    parseMapboxDirectionsRoute(raw, {
      routeType:
        strategy.type === 'fastest' && idx > 0
          ? 'alt'
          : strategy.type,
      routeLabel:
        strategy.type === 'fastest' && idx > 0
          ? `Alternate ${idx}`
          : ROUTE_DEFAULTS[strategy.type].label,
      routeReason:
        strategy.type === 'fastest' && idx > 0
          ? ROUTE_DEFAULTS.alt.reason
          : ROUTE_DEFAULTS[strategy.type].reason,
    }),
  );
  parsedRoutes.sort((a, b) => routeRankingPenalty(a) - routeRankingPenalty(b));

  if (strategy.type === 'eco' && strategy.preferShortest) {
    const fastest = parsedRoutes[0]!;
    const maxDur = fastest.duration * ECO_TIME_FACTOR;
    const candidates = parsedRoutes
      .filter((r) => r.duration <= maxDur)
      .sort((a, b) => a.distance - b.distance);
    const best = candidates[0] ?? fastest;
    return [
      { ...best, routeType: 'eco', routeLabel: ROUTE_DEFAULTS.eco.label, routeReason: ROUTE_DEFAULTS.eco.reason },
    ];
  }

  if (strategy.type === 'fastest') {
    const out: DirectionsResult[] = [];
    for (const route of parsedRoutes) {
      const candidate: DirectionsResult = out.length === 0
        ? { ...route, routeType: 'fastest', routeLabel: ROUTE_DEFAULTS.fastest.label, routeReason: ROUTE_DEFAULTS.fastest.reason }
        : route;
      if (!isDuplicateDirectionsResult(candidate, out)) out.push(candidate);
      if (out.length >= MAX_FASTEST_ROUTE_VARIANTS) break;
    }
    return out;
  }

  const primary = parsedRoutes[0]!;
  const d = ROUTE_DEFAULTS[strategy.type];
  return [
    { ...primary, routeType: strategy.type, routeLabel: d.label, routeReason: d.reason } as DirectionsResult,
  ];
}

function scoreAndRankRoutes(routes: DirectionsResult[]): DirectionsResult[] {
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
    const penaltyDiff = routeRankingPenalty(a) - routeRankingPenalty(b);
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
    best.routeLabel = ROUTE_DEFAULTS.fastest.label;
    best.routeReason = ROUTE_DEFAULTS.fastest.reason;
  }
  return scored;
}

function enrichRouteReasons(routes: DirectionsResult[]): DirectionsResult[] {
  if (routes.length <= 1) return routes;
  const fastest = routes.find((r) => r.routeType === 'fastest');
  if (!fastest) return routes;

  return routes.map((r) => {
    if (r.routeType === 'fastest') {
      const cong = r.congestionScore;
      if (cong < 0.05) return { ...r, routeReason: 'Fastest · Clear roads' };
      if (cong < 0.15) return { ...r, routeReason: 'Fastest · Light traffic' };
      if (cong < 0.35) return { ...r, routeReason: 'Fastest · Moderate traffic' };
      return { ...r, routeReason: 'Fastest · Heavy traffic ahead' };
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

    return r;
  });
}

export async function getMapboxRouteOptions(
  origin: Coordinate,
  destination: Coordinate,
  options?: { maxHeightMeters?: number; mode?: DrivingMode; fastSingleRoute?: boolean },
): Promise<DirectionsResult[]> {
  const maxH =
    typeof options?.maxHeightMeters === 'number' && Number.isFinite(options.maxHeightMeters)
      ? options.maxHeightMeters
      : undefined;

  if (options?.fastSingleRoute) {
    const raw = await fetchMapboxTrafficRoutesRaw(origin, destination, {
      exclude: undefined,
      alternatives: false,
      maxHeightMeters: maxH,
      mode: options?.mode,
      timeoutMs: 8000,
    });
    if (!raw.length) return [];
    const r = parseMapboxDirectionsRoute(raw[0]!, 'fastest');
    return enrichRouteReasons(scoreAndRankRoutes([r]));
  }

  const settled = await Promise.allSettled(
    ROUTE_STRATEGIES.map((strategy) =>
      executeRouteStrategy(origin, destination, strategy, maxH, options?.mode),
    ),
  );

  const allRoutes: DirectionsResult[] = [];
  for (const s of settled) {
    if (s.status === 'fulfilled') {
      for (const route of s.value) {
        if (!isDuplicateDirectionsResult(route, allRoutes)) allRoutes.push(route);
      }
    }
  }

  if (!allRoutes.length) return [];

  const ranked = scoreAndRankRoutes(allRoutes);
  const enriched = enrichRouteReasons(ranked);
  return enriched.slice(0, MAX_PREVIEW_ROUTES);
}
