import { haversineMeters } from '../../utils/distance';
import type { GasPriceMapPoint } from './GasPriceMarkers';

const OHIO_CENTROID = { state: 'Ohio', lat: 40.3888, lng: -82.7649 };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function arrayFromRecord(o: Record<string, unknown>, key: string): unknown[] | null {
  const v = o[key];
  return Array.isArray(v) ? v : null;
}

function peelRows(envelope: unknown): unknown[] {
  if (Array.isArray(envelope)) return envelope;
  const root = asRecord(envelope);
  if (!root) return [];

  const localRows =
    arrayFromRecord(root, 'nearby_stations') ||
    arrayFromRecord(root, 'stations') ||
    arrayFromRecord(root, 'data');
  if (localRows) return localRows;

  const inner = asRecord(root.data);
  if (inner) {
    const innerRows =
      arrayFromRecord(inner, 'nearby_stations') ||
      arrayFromRecord(inner, 'stations') ||
      arrayFromRecord(inner, 'data') ||
      arrayFromRecord(inner, 'result') ||
      arrayFromRecord(inner, 'records');
    if (innerRows) return innerRows;
  }

  return arrayFromRecord(root, 'result') || arrayFromRecord(root, 'records') || [];
}

function numericOrNull(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function priceString(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s ? s : null;
}

function pointId(prefix: string, label: string, lat: number, lng: number): string {
  const safeLabel = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${prefix}-${safeLabel || 'station'}-${lat.toFixed(4)}-${lng.toFixed(4)}`;
}

/**
 * Normalizes local `/api/fuel/prices` station rows, while keeping legacy
 * `/api/map/gas-prices` state-average envelopes readable during rollout.
 */
export function gasPricePointsFromApiEnvelope(apiRoot: unknown): GasPriceMapPoint[] {
  const rows = peelRows(apiRoot);
  const out: GasPriceMapPoint[] = [];
  for (const row of rows) {
    const r = asRecord(row);
    if (!r) continue;

    const stationName = String(r.name ?? r.station_name ?? '').trim();
    const address = String(r.address ?? r.brand ?? '').trim();
    const rawLat = numericOrNull(r.lat ?? r.latitude);
    const rawLng = numericOrNull(r.lng ?? r.lon ?? r.longitude);
    const regular = priceString(r.regular ?? r.price ?? r.gasoline ?? r.gas);
    const mid = priceString(r.midGrade ?? r.midgrade ?? r.mid_grade);
    const premium = priceString(r.premium);
    const diesel = priceString(r.diesel);

    if (stationName && rawLat != null && rawLng != null) {
      out.push({
        id: String(r.id ?? pointId('gas', stationName, rawLat, rawLng)).trim(),
        name: stationName,
        address: address || undefined,
        lat: rawLat,
        lng: rawLng,
        currency: typeof r.currency === 'string' ? r.currency : undefined,
        regular,
        midGrade: mid,
        premium,
        diesel,
        distance_miles: numericOrNull(r.distance_miles),
        source: typeof r.source === 'string' ? r.source : undefined,
        is_estimated: r.is_estimated === true || r.estimated === true,
      });
      continue;
    }

    const stateRaw = String(r.state ?? r.stateCode ?? r.state_code ?? '').trim();
    const state = /^(oh|ohio)$/i.test(stateRaw) ? OHIO_CENTROID.state : stateRaw;
    const fallbackCoord = state === OHIO_CENTROID.state ? OHIO_CENTROID : null;
    const lat = rawLat ?? fallbackCoord?.lat;
    const lng = rawLng ?? fallbackCoord?.lng;
    if (!state || lat == null || lng == null) continue;
    out.push({
      id: String(r.id ?? `gas-${state.toLowerCase().replace(/\s+/g, '-')}`).trim(),
      state,
      name: state,
      lat,
      lng,
      currency: typeof r.currency === 'string' ? r.currency : undefined,
      regular,
      midGrade: mid,
      premium,
      diesel,
      source: typeof r.source === 'string' ? r.source : 'state_average',
      is_estimated: r.is_estimated === true || r.estimated === true,
    });
  }
  return out;
}

/** Rows from `/api/fuel/prices` `nearby_stations` carry `distance_miles`; statewide CollectAPI rows do not. */
export function isLocalStationGasRow(p: GasPriceMapPoint): boolean {
  return typeof p.distance_miles === 'number' && Number.isFinite(p.distance_miles);
}

/** Short chip string — lowest-priced regular among local station snapshots (fuel API). */
export function cheapestLocalRegularChip(rows: GasPriceMapPoint[]): string | null {
  let best: number | undefined;
  let bestChip: string | null = null;
  for (const p of rows) {
    if (!isLocalStationGasRow(p)) continue;
    const chip = formatUsdPerGalChip(p.regular);
    const n = parseUsdPerGallonNumber(p.regular);
    if (chip == null || n == null) continue;
    if (best === undefined || n < best) {
      best = n;
      bestChip = chip;
    }
  }
  return bestChip;
}

/**
 * Match an on-map / Google station to our fuel-price snapshot by proximity (names often differ slightly).
 */
export function matchGasStationNearPlace(
  placeLat: number,
  placeLng: number,
  rows: GasPriceMapPoint[],
  maxMeters = 320,
): GasPriceMapPoint | null {
  if (!Number.isFinite(placeLat) || !Number.isFinite(placeLng)) return null;
  let best: GasPriceMapPoint | null = null;
  let bestD = Infinity;
  for (const p of rows) {
    if (!isLocalStationGasRow(p)) continue;
    if (!formatUsdPerGalChip(p.regular)) continue;
    const d = haversineMeters(placeLat, placeLng, p.lat, p.lng);
    if (d <= maxMeters && d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

/** Closest gas price pin to the user. */
export function nearestGasPricePointByLocation(
  userLat: number,
  userLng: number,
  pts: GasPriceMapPoint[],
): GasPriceMapPoint | null {
  if (!pts.length || !Number.isFinite(userLat) || !Number.isFinite(userLng)) return null;
  let best = pts[0];
  let bestD = haversineMeters(userLat, userLng, best.lat, best.lng);
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i];
    const d = haversineMeters(userLat, userLng, p.lat, p.lng);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

/** One-line summary for explore / empty states. */
export function formatLocalGasRegularSummary(p: GasPriceMapPoint): string {
  const label = p.name || p.state || 'Nearby station';
  const raw = p.regular;
  if (raw == null || String(raw).trim() === '') {
    return `${label}: regular price unavailable.`;
  }
  const n = parseFloat(String(raw).replace(/[^0-9.]/g, ''));
  const reg = Number.isFinite(n) ? `$${n.toFixed(2)}` : String(raw).trim().slice(0, 10);
  const distance =
    typeof p.distance_miles === 'number' && Number.isFinite(p.distance_miles)
      ? ` (${p.distance_miles.toFixed(1)} mi)`
      : '';
  const note = p.is_estimated
    ? 'estimated — prices vary by station'
    : isLocalStationGasRow(p)
      ? 'CollectAPI station listing'
      : 'state fuel index — station prices may differ';
  return `${label}${distance}: ${reg}/gal regular (${note}).`;
}

/** Backward-compatible export for older callers/tests during rollout. */
export const formatStateGasRegularSummary = formatLocalGasRegularSummary;

/** Compact `$/gal` for the Gas category chip; null when unknown. */
export function formatUsdPerGalChip(raw: string | null | undefined): string | null {
  if (raw == null || String(raw).trim() === '') return null;
  const n = parseFloat(String(raw).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : null;
}

/** Numeric regular price per gallon for trip fuel math; ignores impossible values. */
export function parseUsdPerGallonNumber(raw: string | null | undefined): number | undefined {
  if (raw == null || String(raw).trim() === '') return undefined;
  const n = parseFloat(String(raw).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0 && n < 50 ? n : undefined;
}
