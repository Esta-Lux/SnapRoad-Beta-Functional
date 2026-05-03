import { haversineMeters } from '../../utils/distance';
import type { GasPriceMapPoint } from './GasPriceMarkers';

function peelRows(envelope: unknown): unknown[] {
  if (Array.isArray(envelope)) return envelope;
  if (!envelope || typeof envelope !== 'object') return [];
  const o = envelope as Record<string, unknown>;
  if (Array.isArray(o.data)) return o.data;
  const inner = o.data;
  if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
    const nested = (inner as Record<string, unknown>).data;
    if (Array.isArray(nested)) return nested;
  }
  if (Array.isArray(o.result)) return o.result;
  if (Array.isArray(o.records)) return o.records;
  return [];
}

/**
 * Normalizes `GET /api/map/gas-prices` (and similar nested envelopes) into map rows.
 */
export function gasPricePointsFromApiEnvelope(apiRoot: unknown): GasPriceMapPoint[] {
  const rows = peelRows(apiRoot);
  const out: GasPriceMapPoint[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const state = String(r.state ?? r.name ?? '').trim();
    const id = String(r.id ?? (state ? `gas-${state.toLowerCase().replace(/\s+/g, '-')}` : '')).trim();
    const lat = Number(r.lat);
    const lng = Number(r.lng);
    const mid = r.midGrade ?? r.midgrade ?? r.mid_grade;
    if (!id || !state || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    out.push({
      id,
      state,
      lat,
      lng,
      currency: typeof r.currency === 'string' ? r.currency : undefined,
      regular: r.regular != null ? String(r.regular) : null,
      midGrade: mid != null ? String(mid) : null,
      premium: r.premium != null ? String(r.premium) : null,
      diesel: r.diesel != null ? String(r.diesel) : null,
    });
  }
  return out;
}

/** Closest statewide-average pin to the user (by centroid distance). */
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

/** One-line summary for explore / empty states (statewide average, not pump price). */
export function formatStateGasRegularSummary(p: GasPriceMapPoint): string {
  const raw = p.regular;
  if (raw == null || String(raw).trim() === '') {
    return `Statewide avg (${p.state}): price unavailable from feed.`;
  }
  const n = parseFloat(String(raw).replace(/[^0-9.]/g, ''));
  const reg = Number.isFinite(n) ? `$${n.toFixed(2)}` : String(raw).trim().slice(0, 10);
  return `Statewide avg (${p.state}): ${reg}/gal regular — not pump price; confirm at station.`;
}

/** Compact `$/gal` for the Gas category chip (statewide avg nearest the user); null when unknown. */
export function formatUsdPerGalChip(raw: string | null | undefined): string | null {
  if (raw == null || String(raw).trim() === '') return null;
  const n = parseFloat(String(raw).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : null;
}
