/**
 * Eager location warm-up at app launch — runs before MapScreen mounts so the
 * puck and route origin are ready when the user opens the Drive tab.
 */
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { loadCachedLocation, persistCachedLocation } from '../utils/locationCache';

let inflight: Promise<void> | null = null;

async function seedFromLastKnown(): Promise<boolean> {
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    if (!perm.granted) return false;
    const fix = await Location.getLastKnownPositionAsync({ maxAge: 120_000, requiredAccuracy: 120 });
    if (!fix) return false;
    const lat = fix.coords.latitude;
    const lng = fix.coords.longitude;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
    persistCachedLocation(lat, lng);
    return true;
  } catch {
    return false;
  }
}

async function seedFromBalancedFix(): Promise<void> {
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    if (!perm.granted) return;
    const fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const lat = fix.coords.latitude;
    const lng = fix.coords.longitude;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    persistCachedLocation(lat, lng);
  } catch {
    /* optional */
  }
}

/**
 * Non-blocking warm-up: hydrate SecureStore cache, then OS last-known / Balanced fix.
 * Safe to call from App mount while auth bootstrap runs in parallel.
 */
export function warmLocationOnAppLaunch(): Promise<void> {
  if (Platform.OS === 'web') return Promise.resolve();
  if (inflight) return inflight;
  inflight = (async () => {
    await loadCachedLocation().catch(() => null);
    const seeded = await seedFromLastKnown();
    if (!seeded) {
      await seedFromBalancedFix();
    }
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}
