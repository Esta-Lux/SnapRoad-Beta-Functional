import type { GeocodeResult } from '../lib/directions';
import type { SavedLocation } from '../types';

export function dedupeGeocodeResults(rows: GeocodeResult[]): GeocodeResult[] {
  const seen = new Set<string>();
  const out: GeocodeResult[] = [];
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

/** Saved places + recent searches matching the query (shown before remote autocomplete). */
export function localMatchesForSearchQuery(
  q: string,
  savedPlaces: SavedLocation[],
  recent: GeocodeResult[],
): GeocodeResult[] {
  const ql = q.trim().toLowerCase();
  if (ql.length < 2) return [];
  const fromSaved: GeocodeResult[] = [];
  for (const p of savedPlaces) {
    if (p.lat == null || p.lng == null) continue;
    const nm = (p.name || '').toLowerCase();
    const ad = (p.address || '').toLowerCase();
    if (!nm.includes(ql) && !ad.includes(ql)) continue;
    fromSaved.push({
      name: p.name,
      address: p.address || '',
      lat: Number(p.lat),
      lng: Number(p.lng),
      placeType: p.category,
    });
  }
  const fromRecent: GeocodeResult[] = [];
  for (const r of recent) {
    const nm = (r.name || '').toLowerCase();
    const ad = (r.address || '').toLowerCase();
    if (!nm.includes(ql) && !ad.includes(ql)) continue;
    fromRecent.push({ ...r });
  }
  return dedupeGeocodeResults([...fromSaved, ...fromRecent]);
}
