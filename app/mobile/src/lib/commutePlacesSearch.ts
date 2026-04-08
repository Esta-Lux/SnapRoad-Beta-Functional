/**
 * Commute / place-alert address entry: same pipeline as map search —
 * saved places + recent map searches first, then `/api/places/autocomplete`, then Mapbox.
 */
import { api } from '../api/client';
import type { SavedLocation } from '../types';
import { forwardGeocode, prepareMapSearchQuery, type GeocodeResult } from './directions';
import { haversineMeters } from '../utils/distance';

export type CommuteGeocodeHit = GeocodeResult & { fromSavedPlaces?: boolean };

function dedupeGeocodeResults(rows: CommuteGeocodeHit[]): CommuteGeocodeHit[] {
  const seen = new Set<string>();
  const out: CommuteGeocodeHit[] = [];
  for (const r of rows) {
    const pid = r.place_id;
    const k = pid
      ? `pid:${pid}`
      : `xy:${(r.name || '').toLowerCase()}:${Number(r.lat).toFixed(4)}:${Number(r.lng).toFixed(4)}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

/** Profile saved places whose name or address matches the query (address book). */
export function buildLocalCommuteHits(
  rawQuery: string,
  places: SavedLocation[],
  recent: GeocodeResult[],
): CommuteGeocodeHit[] {
  const trimmed = rawQuery.trim();
  if (!trimmed) return [];
  return dedupeGeocodeResults([
    ...savedPlacesSearchHits(trimmed, places),
    ...recentSearchHits(trimmed, recent),
  ]).slice(0, 12);
}

export function savedPlacesSearchHits(q: string, places: SavedLocation[]): CommuteGeocodeHit[] {
  const ql = q.trim().toLowerCase();
  if (!ql) return [];
  const out: CommuteGeocodeHit[] = [];
  for (const p of places) {
    if (p.lat == null || p.lng == null || !Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue;
    if (Math.abs(p.lat) < 1e-6 && Math.abs(p.lng) < 1e-6) continue;
    const nm = (p.name || '').toLowerCase();
    const ad = (p.address || '').toLowerCase();
    if (!nm.includes(ql) && !ad.includes(ql)) continue;
    out.push({
      name: p.name,
      address: p.address || '',
      lat: Number(p.lat),
      lng: Number(p.lng),
      placeType: p.category,
      fromSavedPlaces: true,
    });
  }
  return out;
}

function recentSearchHits(q: string, recent: GeocodeResult[]): CommuteGeocodeHit[] {
  const ql = q.trim().toLowerCase();
  if (!ql) return [];
  const out: CommuteGeocodeHit[] = [];
  for (const r of recent) {
    const nm = (r.name || '').toLowerCase();
    const ad = (r.address || '').toLowerCase();
    if (!nm.includes(ql) && !ad.includes(ql)) continue;
    out.push({ ...r, fromSavedPlaces: false });
  }
  return out;
}

function sortByProximity(rows: CommuteGeocodeHit[], loc: { lat: number; lng: number }): CommuteGeocodeHit[] {
  const hasLoc = Math.abs(loc.lat) > 1e-5 || Math.abs(loc.lng) > 1e-5;
  if (!hasLoc) return rows;
  return [...rows].sort((a, b) => {
    const da =
      a.lat !== 0 && a.lng !== 0 ? haversineMeters(loc.lat, loc.lng, a.lat, a.lng) : Number.POSITIVE_INFINITY;
    const db =
      b.lat !== 0 && b.lng !== 0 ? haversineMeters(loc.lat, loc.lng, b.lat, b.lng) : Number.POSITIVE_INFINITY;
    return da - db;
  });
}

/**
 * Live suggestions for commute / alert address fields.
 * @param recent - optional map recent searches (same storage key as MapScreen).
 */
export async function fetchCommuteAddressSuggestions(
  rawQuery: string,
  proximity: { lat: number; lng: number } | undefined,
  savedPlaces: SavedLocation[],
  recent: GeocodeResult[] = [],
): Promise<CommuteGeocodeHit[]> {
  const trimmed = rawQuery.trim();
  if (!trimmed) return [];

  const prep = prepareMapSearchQuery(trimmed);
  const q = prep.query;
  if (q.length < 2) {
    return dedupeGeocodeResults([
      ...savedPlacesSearchHits(trimmed, savedPlaces),
      ...recentSearchHits(trimmed, recent),
    ]).slice(0, 12);
  }

  const localFirst = dedupeGeocodeResults([
    ...savedPlacesSearchHits(q, savedPlaces),
    ...recentSearchHits(q, recent),
  ]);

  const hasLoc =
    proximity != null &&
    (Math.abs(proximity.lat) > 1e-5 || Math.abs(proximity.lng) > 1e-5);

  const looksLikeStreetAddress = /^\d+\s+\S/.test(q.trim());
  const useTextSearch =
    prep.preferTextSearch ||
    (Boolean(hasLoc) && q.length >= 2 && q.length <= 28 && !looksLikeStreetAddress);

  const biasQs = hasLoc
    ? `&lat=${proximity!.lat}&lng=${proximity!.lng}&radius=${prep.radiusM}${
        prep.openNow ? '&open_now=true' : ''
      }${useTextSearch ? '&textsearch=true' : ''}`
    : '';

  try {
    const res = await api.get<Record<string, unknown>>(
      `/api/places/autocomplete?q=${encodeURIComponent(q)}${biasQs}`,
    );
    if (res.success && res.data) {
      const root = res.data as Record<string, unknown>;
      const predictions = (root.data ?? root.predictions) as unknown[] | undefined;
      if (Array.isArray(predictions) && predictions.length > 0) {
        const mapped: CommuteGeocodeHit[] = predictions.map((raw: unknown) => {
          const p = raw as Record<string, unknown>;
          const types = p.types;
          return {
            name: String(p.name || p.description || q),
            address: String(p.address || p.description || ''),
            lat: Number(p.lat ?? 0),
            lng: Number(p.lng ?? 0),
            placeType: Array.isArray(types) ? String(types[0]) : 'poi',
            place_id: typeof p.place_id === 'string' ? p.place_id : undefined,
            photo_reference: typeof p.photo_reference === 'string' ? p.photo_reference : undefined,
            open_now: typeof p.open_now === 'boolean' ? p.open_now : undefined,
            price_level: typeof p.price_level === 'number' ? p.price_level : undefined,
          };
        });
        const merged = dedupeGeocodeResults([...localFirst, ...mapped]);
        if (hasLoc) return sortByProximity(merged, proximity!).slice(0, 14);
        return merged.slice(0, 14);
      }
    }
  } catch {
    /* Mapbox fallback */
  }

  const mb = await forwardGeocode(q, hasLoc ? proximity : undefined, 12);
  let filtered = mb;
  if (hasLoc) {
    filtered = mb.filter((r) => haversineMeters(proximity!.lat, proximity!.lng, r.lat, r.lng) <= 50_000);
  }
  const mbHits: CommuteGeocodeHit[] = filtered.map((m) => ({ ...m }));
  const merged = dedupeGeocodeResults([...localFirst, ...mbHits]);
  if (hasLoc) return sortByProximity(merged, proximity!).slice(0, 14);
  return merged.slice(0, 14);
}

/** Resolve Google place_id to lat/lng when autocomplete omitted coordinates. */
export async function resolveCommutePlaceCoords(hit: GeocodeResult): Promise<GeocodeResult> {
  const ok =
    Number.isFinite(hit.lat) &&
    Number.isFinite(hit.lng) &&
    (Math.abs(hit.lat) > 1e-6 || Math.abs(hit.lng) > 1e-6);
  if (ok) return hit;
  if (!hit.place_id) return hit;
  try {
    const details = await api.get<Record<string, unknown>>(`/api/places/details/${hit.place_id}`);
    if (!details.success || !details.data) return hit;
    const raw = details.data as Record<string, unknown>;
    const d = (raw.data as Record<string, unknown> | undefined) ?? raw;
    const geom = d.geometry as { location?: { lat?: number; lng?: number } } | undefined;
    const lat = Number(d.lat ?? geom?.location?.lat);
    const lng = Number(d.lng ?? geom?.location?.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { ...hit, lat, lng };
  } catch {
    /* noop */
  }
  return hit;
}

export const COMMUTE_RECENT_SEARCHES_KEY = 'snaproad_recent_searches';
