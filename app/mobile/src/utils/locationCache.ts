import * as SecureStore from 'expo-secure-store';
import type { Coordinate } from '../types';

const LAST_LOC_KEY = 'snaproad_last_location_v2';
const PERSIST_THROTTLE_MS = 30_000;

let lastPersistAt = 0;

export async function loadCachedLocation(): Promise<Coordinate | null> {
  try {
    const raw = await SecureStore.getItemAsync(LAST_LOC_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { lat?: number; lng?: number; t?: number };
    const lat = Number(parsed.lat);
    const lng = Number(parsed.lng);
    const ts = Number(parsed.t);
    const isFresh = !Number.isFinite(ts) || Date.now() - ts < 24 * 60 * 60 * 1000;
    if (Number.isFinite(lat) && Number.isFinite(lng) && isFresh) {
      return { lat, lng };
    }
  } catch {
    // Ignore corrupted or unavailable secure storage.
  }
  return null;
}

export function persistCachedLocation(lat: number, lng: number) {
  const now = Date.now();
  if (now - lastPersistAt < PERSIST_THROTTLE_MS) return;
  lastPersistAt = now;
  SecureStore.setItemAsync(
    LAST_LOC_KEY,
    JSON.stringify({ lat, lng, t: now }),
  ).catch(() => {});
}
