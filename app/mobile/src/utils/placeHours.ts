import type { GeocodeResult } from '../lib/directions';

/** How long we trust a cached open/closed boolean before re-validating (details API). */
export const OPEN_NOW_DISPLAY_TTL_MS = 5 * 60 * 1000;

export type PlaceOpenKind = 'open' | 'closed' | 'unknown';

/**
 * Parse open/closed from Places Details (or similar) payload.
 * Aligns with PlaceDetailSheet `normalizeDetail` — single source of truth.
 */
export function parseOpenNowBooleanFromDetailsPayload(
  d: Record<string, unknown> | null | undefined,
): boolean | null {
  if (!d || typeof d !== 'object') return null;
  const bs = String(d.business_status ?? '').toUpperCase();
  if (bs.includes('CLOSED_PERMANENTLY') || bs.includes('CLOSED_TEMPORARILY')) return false;
  const opening = (d.opening_hours as Record<string, unknown>) || {};
  const raw = d.open_now ?? opening.open_now;
  if (typeof raw === 'boolean') return raw;
  return null;
}

export function openBooleanToKind(value: boolean | null | undefined): PlaceOpenKind {
  if (value === true) return 'open';
  if (value === false) return 'closed';
  return 'unknown';
}

export function isOpenNowFresh(
  lastUpdatedAt: number | undefined | null,
  now = Date.now(),
): boolean {
  return (
    typeof lastUpdatedAt === 'number' &&
    Number.isFinite(lastUpdatedAt) &&
    now - lastUpdatedAt >= 0 &&
    now - lastUpdatedAt <= OPEN_NOW_DISPLAY_TTL_MS
  );
}

/**
 * Strip unverified hours from items rehydrated from disk (TTL expired or missing).
 */
export function migratePersistedRecentSearch(r: GeocodeResult): GeocodeResult {
  if (!r.place_id) {
    return { ...r, open_now: undefined, open_now_last_updated_at: undefined };
  }
  if (!isOpenNowFresh(r.open_now_last_updated_at)) {
    return { ...r, open_now: undefined, open_now_last_updated_at: undefined };
  }
  return r;
}

/** Stamp autocomplete / nearby rows at query time (best-effort; details still authoritative for recents after refresh). */
export function withOpenNowObservation(row: GeocodeResult, observedAt = Date.now()): GeocodeResult {
  if (typeof row.open_now !== 'boolean') {
    return { ...row, open_now_last_updated_at: undefined };
  }
  return { ...row, open_now_last_updated_at: observedAt };
}

export type OpenSearchRowLabel = {
  label: string;
  variant: 'open' | 'closed' | 'neutral' | 'none';
};

/**
 * Recent list: never show “Open now” unless `open_now` was confirmed within TTL (details-backed).
 * Live search: show Open/Closed only when observation timestamp is fresh (set when results return).
 */
export function formatOpenLabelForSearchRow(
  item: GeocodeResult,
  isRecentList: boolean,
): OpenSearchRowLabel {
  if (!item.place_id) return { label: '', variant: 'none' };

  const fresh = isOpenNowFresh(item.open_now_last_updated_at);
  if (!fresh) {
    if (isRecentList) return { label: 'Check hours', variant: 'neutral' };
    if (typeof item.open_now === 'boolean') return { label: 'Check hours', variant: 'neutral' };
    return { label: '', variant: 'none' };
  }

  if (item.open_now === true) return { label: 'Open now', variant: 'open' };
  if (item.open_now === false) return { label: 'Closed', variant: 'closed' };
  if (isRecentList) return { label: 'Check hours', variant: 'neutral' };
  return { label: '', variant: 'none' };
}
