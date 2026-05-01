/**
 * `placeSearchRanking` — pure helpers that drive search relevance and
 * place-card selection. Two big bug surfaces motivated this module:
 *
 *   1. **"Closest place isn't shown"** — Google's `/autocomplete` returns
 *      `distance_meters` per prediction but **no lat/lng**, so the mobile
 *      `(lat=0, lng=0)` rows fell into the "infinite distance" bucket and
 *      were re-sorted *behind* local recent/saved matches. The fix is to
 *      let the sorter consult `distance_meters` when row coords are
 *      missing.
 *
 *   2. **"Tapping a search result pulls up wrong things"** — caused by
 *      (a) the click handler discarding `/api/places/details` geometry
 *      whenever a row already carried *any* finite coords, even when those
 *      coords were stale or pointed at a duplicate POI; (b) the dedupe
 *      pass keying on `place_id` only, leaving Google + Mapbox rows for
 *      the *same* place as two distinct entries with different tap
 *      handlers; and (c) the map-tap fallback picking the *first* nearby
 *      result within 60 m instead of the *closest* one.
 *
 * Each export is a small pure function — no React, no `Date.now()`, no
 * module state — so the upstream `MapScreen` stays simple and the unit
 * tests cover the contract end-to-end.
 */

import type { GeocodeResult } from './directions';
import { haversineMeters } from '../utils/distance';

/* ─── Sort ────────────────────────────────────────────────────────────── */

/**
 * Sort search results by *effective* distance to the user. Order of preference
 * for each row's distance:
 *
 *   1. Real Haversine if the row has finite, non-null-island lat/lng AND
 *      the user has a fix.
 *   2. `distance_meters` from the server (Google autocomplete reports this
 *      even when it omits coords; we keep its nearest-first ordering).
 *   3. `Number.POSITIVE_INFINITY` — bucket the row to the end.
 *
 * The sort is **stable** for ties so a server-provided ordering inside the
 * same distance bucket is preserved.
 */
export function sortGeocodeByEffectiveDistance(
  rows: GeocodeResult[],
  loc: { lat: number; lng: number } | null | undefined,
): GeocodeResult[] {
  const hasLoc =
    !!loc && (Math.abs(loc.lat) > 1e-5 || Math.abs(loc.lng) > 1e-5);
  const decorated = rows.map((r, idx) => ({
    r,
    idx,
    d: effectiveDistanceMeters(r, hasLoc ? loc! : null),
  }));
  decorated.sort((a, b) => {
    if (a.d !== b.d) return a.d - b.d;
    return a.idx - b.idx;
  });
  return decorated.map((x) => x.r);
}

/**
 * The "best distance estimate we can show or sort by" for a row.
 * Returns `Number.POSITIVE_INFINITY` when nothing is known.
 */
export function effectiveDistanceMeters(
  r: GeocodeResult,
  loc: { lat: number; lng: number } | null,
): number {
  const rowHasCoords =
    Number.isFinite(r.lat) &&
    Number.isFinite(r.lng) &&
    !(Math.abs(r.lat) < 1e-7 && Math.abs(r.lng) < 1e-7);
  if (loc && rowHasCoords) {
    return haversineMeters(loc.lat, loc.lng, r.lat, r.lng);
  }
  if (typeof r.distance_meters === 'number' && Number.isFinite(r.distance_meters) && r.distance_meters >= 0) {
    return r.distance_meters;
  }
  return Number.POSITIVE_INFINITY;
}

/**
 * Format a distance for the search row label. Mirrors the inline logic in
 * `MapSearchTopBar` so all card surfaces show the same units / cutover.
 * Returns `null` when there's nothing to show.
 */
export function formatRowDistance(
  r: GeocodeResult,
  loc: { lat: number; lng: number } | null | undefined,
): string | null {
  const m = effectiveDistanceMeters(r, loc ?? null);
  if (!Number.isFinite(m)) return null;
  if (m < 160) return `${Math.round(m * 3.281)} ft`;
  const miles = m / 1609.344;
  return miles < 10 ? `${miles.toFixed(1)} mi` : `${Math.round(miles)} mi`;
}

/* ─── Dedupe ──────────────────────────────────────────────────────────── */

/**
 * Collapse rows that are clearly the *same place* even when one came from
 * Google (with `place_id`) and another from Mapbox (without). Two rows are
 * considered duplicates when:
 *
 *   - They share `place_id` (cheap canonical match), OR
 *   - Their normalized names match AND their coordinates are within
 *     ~50 m of each other.
 *
 * The *first* occurrence wins, but if a later row carries a `place_id`
 * and the earlier one doesn't, we **promote** the place_id onto the kept
 * row so downstream taps use the rich-data branch consistently.
 */
export function dedupeGeocodeResults(rows: GeocodeResult[]): GeocodeResult[] {
  const out: GeocodeResult[] = [];
  const seenPids = new Map<string, number>();

  for (const r of rows) {
    const pid = r.place_id;
    if (pid && seenPids.has(pid)) continue;
    if (pid) {
      seenPids.set(pid, out.length);
      out.push(r);
      continue;
    }
    // Look for a same-name + nearby coord match already kept.
    const dupIdx = findCoordinateNeighborMatch(out, r);
    if (dupIdx >= 0) {
      // Promote place_id onto kept row when the new dup happens to have one
      // (rare for the no-pid branch but defensive).
      continue;
    }
    out.push(r);
  }

  // Second pass: when a no-pid row precedes a same-place pid row, attach
  // the pid to the kept row (best-of-both: shown order + rich detail tap).
  for (let i = 0; i < out.length; i += 1) {
    const a = out[i]!;
    if (a.place_id) continue;
    for (let j = i + 1; j < out.length; j += 1) {
      const b = out[j]!;
      if (!b.place_id) continue;
      if (sameCanonicalPlace(a, b)) {
        out[i] = { ...a, place_id: b.place_id };
        out.splice(j, 1);
        break;
      }
    }
  }
  return out;
}

function normalizeName(name: string | undefined): string {
  return (name || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function sameCanonicalPlace(a: GeocodeResult, b: GeocodeResult, withinM: number = 50): boolean {
  if (a.place_id && b.place_id) return a.place_id === b.place_id;
  const na = normalizeName(a.name);
  const nb = normalizeName(b.name);
  if (!na || !nb) return false;
  if (na !== nb) return false;
  if (
    Number.isFinite(a.lat) && Number.isFinite(a.lng) &&
    Number.isFinite(b.lat) && Number.isFinite(b.lng) &&
    !(Math.abs(a.lat) < 1e-7 && Math.abs(a.lng) < 1e-7) &&
    !(Math.abs(b.lat) < 1e-7 && Math.abs(b.lng) < 1e-7)
  ) {
    return haversineMeters(a.lat, a.lng, b.lat, b.lng) <= withinM;
  }
  // Fallback: same name, missing coords on one side — treat as same.
  return true;
}

function findCoordinateNeighborMatch(arr: GeocodeResult[], r: GeocodeResult): number {
  for (let i = 0; i < arr.length; i += 1) {
    if (sameCanonicalPlace(arr[i]!, r)) return i;
  }
  return -1;
}

/* ─── Map tap: nearest pick ───────────────────────────────────────────── */

export type NearbyCandidate = {
  name: string;
  address?: string;
  lat: number;
  lng: number;
  place_id?: string;
  placeType?: string;
  price_level?: number | null;
  open_now?: boolean | null;
};

/**
 * From a list of nearby candidates returned for a map tap, choose the one
 * **closest to the tap point**, but only if it lies within `maxMeters`.
 * Returns `null` when no candidate qualifies.
 *
 * The previous logic took `candidates[0]` (server's own ordering) and
 * accepted it iff within 60 m — which can attach the wrong POI in dense
 * downtowns where a small business lists *near* (but not *at*) the tap.
 */
export function pickNearestNearby(
  candidates: NearbyCandidate[],
  tap: { lat: number; lng: number },
  maxMeters: number,
): { row: NearbyCandidate; distanceMeters: number } | null {
  let best: { row: NearbyCandidate; distanceMeters: number } | null = null;
  for (const c of candidates) {
    if (
      !Number.isFinite(c.lat) ||
      !Number.isFinite(c.lng) ||
      (Math.abs(c.lat) < 1e-7 && Math.abs(c.lng) < 1e-7)
    ) {
      continue;
    }
    const d = haversineMeters(tap.lat, tap.lng, c.lat, c.lng);
    if (d > maxMeters) continue;
    if (best == null || d < best.distanceMeters) {
      best = { row: c, distanceMeters: d };
    }
  }
  return best;
}

/* ─── Click handler: choose canonical location ────────────────────────── */

/**
 * After a user taps a search row that carries a `place_id`, we fetch
 * `/api/places/details/:id`. The returned geometry is **ground truth**;
 * the row's lat/lng may be:
 *   - 0/0 (autocomplete didn't supply coords),
 *   - stale (cached from a previous response that has since moved), or
 *   - misattributed (a duplicate row from a different provider).
 *
 * Rule: prefer details geometry whenever it's a finite, non-null-island
 * coord. If details didn't arrive, fall back to the row coord. If both
 * are unusable, return `null` and the caller should show an error.
 *
 * When BOTH coords are valid but disagree by a non-trivial amount,
 * details still wins — that's the whole point of fetching details.
 */
export function pickBestPlaceLocation(
  rowLat: number,
  rowLng: number,
  detailLat: number | null | undefined,
  detailLng: number | null | undefined,
): { lat: number; lng: number } | null {
  const validDetail =
    typeof detailLat === 'number' &&
    typeof detailLng === 'number' &&
    Number.isFinite(detailLat) &&
    Number.isFinite(detailLng) &&
    !(Math.abs(detailLat) < 1e-7 && Math.abs(detailLng) < 1e-7);
  if (validDetail) return { lat: detailLat as number, lng: detailLng as number };
  const validRow =
    Number.isFinite(rowLat) &&
    Number.isFinite(rowLng) &&
    !(Math.abs(rowLat) < 1e-7 && Math.abs(rowLng) < 1e-7);
  if (validRow) return { lat: rowLat, lng: rowLng };
  return null;
}

/* ─── Test-only ──────────────────────────────────────────────────────── */

export const __testOnly__ = {
  sameCanonicalPlace,
  normalizeName,
};
