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
