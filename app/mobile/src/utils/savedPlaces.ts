import type { SavedLocation } from '../types';
import { haversineMeters } from './distance';

export function normalizeSavedCategory(category: string | undefined | null): string {
  return (category || 'favorite').trim().toLowerCase() || 'favorite';
}

export function hasSavedPlaceCoords(
  lat: number | null | undefined,
  lng: number | null | undefined,
): boolean {
  const la = Number(lat);
  const ln = Number(lng);
  return Number.isFinite(la) && Number.isFinite(ln) && !(Math.abs(la) < 1e-6 && Math.abs(ln) < 1e-6);
}

export function isFavoriteCategory(category: string | undefined | null): boolean {
  return normalizeSavedCategory(category) === 'favorite';
}

export function isQuickAccessSavedPlace(place: SavedLocation): boolean {
  const c = normalizeSavedCategory(place.category);
  return c === 'home' || c === 'work' || c === 'favorite';
}

export function normalizeSavedLocation(raw: unknown): SavedLocation | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const id = Number(row.id);
  if (!Number.isFinite(id)) return null;
  const latRaw = row.lat;
  const lngRaw = row.lng;
  const lat = latRaw == null ? undefined : Number(latRaw);
  const lng = lngRaw == null ? undefined : Number(lngRaw);
  return {
    id,
    name: String(row.name ?? '').trim() || 'Saved place',
    address: String(row.address ?? ''),
    category: normalizeSavedCategory(typeof row.category === 'string' ? row.category : 'favorite'),
    lat: Number.isFinite(lat) ? lat : undefined,
    lng: Number.isFinite(lng) ? lng : undefined,
  };
}

export function parseSavedLocationsPayload(payload: unknown): SavedLocation[] {
  if (!payload) return [];
  const root = payload as { data?: unknown };
  const list = Array.isArray(payload) ? payload : Array.isArray(root.data) ? root.data : [];
  return list
    .map((item) => normalizeSavedLocation(item))
    .filter((item): item is SavedLocation => item != null);
}

export function unwrapSavedLocationFromWriteResponse(payload: unknown): SavedLocation | null {
  if (!payload) return null;
  const root = payload as { data?: unknown };
  const candidate = root.data ?? payload;
  return normalizeSavedLocation(candidate);
}

export function findSavedPlaceNearCoords(
  savedPlaces: SavedLocation[],
  lat: number,
  lng: number,
  opts?: { favoriteOnly?: boolean },
): SavedLocation | null {
  if (!hasSavedPlaceCoords(lat, lng)) return null;
  for (const place of savedPlaces) {
    if (!hasSavedPlaceCoords(place.lat, place.lng)) continue;
    const category = normalizeSavedCategory(place.category);
    if (opts?.favoriteOnly && category !== 'favorite') continue;
    if (
      !opts?.favoriteOnly &&
      category !== 'favorite' &&
      (category === 'home' || category === 'work')
    ) {
      continue;
    }
    if (haversineMeters(lat, lng, Number(place.lat), Number(place.lng)) < 85) {
      return place;
    }
  }
  return null;
}

export function sortQuickAccessSavedPlaces(places: SavedLocation[]): SavedLocation[] {
  const rank = (category: string) => {
    if (category === 'home') return 0;
    if (category === 'work') return 1;
    return 2;
  };
  return [...places].sort((a, b) => {
    const ra = rank(normalizeSavedCategory(a.category));
    const rb = rank(normalizeSavedCategory(b.category));
    if (ra !== rb) return ra - rb;
    return a.id - b.id;
  });
}
