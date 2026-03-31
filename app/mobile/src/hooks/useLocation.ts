import { useEffect, useRef, useState, useCallback } from 'react';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { storage } from '../utils/storage';
import type { Coordinate } from '../types';

const LAST_LOC_KEY = 'last_location_v1';
const PERSIST_THROTTLE_MS = 30_000;

interface LocationState {
  location: Coordinate;
  heading: number;
  speed: number;
  accuracy: number | null;
  isLocating: boolean;
  permissionDenied: boolean;
}

function readCachedLocation(): Coordinate | null {
  const raw = storage.getString(LAST_LOC_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { lat?: number; lng?: number; t?: number };
    const lat = Number(parsed.lat);
    const lng = Number(parsed.lng);
    const ts = Number(parsed.t);
    const isFresh = !Number.isFinite(ts) || Date.now() - ts < 24 * 60 * 60 * 1000;
    if (Number.isFinite(lat) && Number.isFinite(lng) && isFresh) return { lat, lng };
  } catch {}
  return null;
}

let lastPersistAt = 0;
function persistLocation(lat: number, lng: number) {
  const now = Date.now();
  if (now - lastPersistAt < PERSIST_THROTTLE_MS) return;
  lastPersistAt = now;
  storage.set(LAST_LOC_KEY, JSON.stringify({ lat, lng, t: now }));
}

/** Sentinel until first GPS fix or persisted last location — avoids biasing places/search to a dev default. */
const UNKNOWN_LOCATION: Coordinate = { lat: 0, lng: 0 };
const HEADING_SMOOTHING = 0.2;

function smoothHeading(current: number, raw: number): number {
  let delta = raw - current;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  let result = current + delta * HEADING_SMOOTHING;
  if (result < 0) result += 360;
  if (result >= 360) result -= 360;
  return result;
}

export function useLocation(isNavigating = false) {
  const cached = readCachedLocation();
  const [state, setState] = useState<LocationState>({
    location: cached ?? UNKNOWN_LOCATION,
    heading: 0,
    speed: 0,
    accuracy: null,
    isLocating: true,
    permissionDenied: false,
  });

  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const headingSubRef = useRef<Location.LocationSubscription | null>(null);
  const smoothedRef = useRef(0);
  const bgPermRequested = useRef(false);

  const startWatching = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setState((prev) => ({ ...prev, isLocating: false, permissionDenied: true }));
      return;
    }

    if (isNavigating && !bgPermRequested.current) {
      bgPermRequested.current = true;
      try {
        await Location.requestBackgroundPermissionsAsync();
      } catch { /* user denied — foreground-only nav still works */ }
    }

    try {
      const coarse = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const lat = coarse.coords.latitude;
      const lng = coarse.coords.longitude;
      persistLocation(lat, lng);
      setState((prev) => ({
        ...prev,
        location: { lat, lng },
        speed: Math.max(0, (coarse.coords.speed ?? 0) * 2.237),
        accuracy: coarse.coords.accuracy ?? null,
        isLocating: false,
      }));
    } catch {}

    const accuracy = isNavigating
      ? Location.Accuracy.BestForNavigation
      : Location.Accuracy.Balanced;
    const timeInterval = isNavigating ? 1000 : 5000;
    const distanceInterval = isNavigating ? 2 : 20;

    watchRef.current = await Location.watchPositionAsync(
      {
        accuracy,
        timeInterval,
        distanceInterval,
        ...(Platform.OS === 'ios' && isNavigating && {
          activityType: Location.ActivityType.AutomotiveNavigation,
        }),
      },
      (loc) => {
        const lat = loc.coords.latitude;
        const lng = loc.coords.longitude;
        const speedMph = Math.max(0, (loc.coords.speed ?? 0) * 2.237);
        const gpsHeading = loc.coords.heading;

        persistLocation(lat, lng);

        const useGpsCourse = typeof gpsHeading === 'number' && gpsHeading >= 0 && speedMph > 3;

        setState((prev) => {
          let newHeading = prev.heading;
          if (useGpsCourse) {
            smoothedRef.current = smoothHeading(smoothedRef.current, gpsHeading);
            newHeading = smoothedRef.current;
          }
          return {
            ...prev,
            location: { lat, lng },
            speed: speedMph,
            accuracy: loc.coords.accuracy ?? null,
            isLocating: false,
            heading: newHeading,
          };
        });
      },
    );

    headingSubRef.current = await Location.watchHeadingAsync((h) => {
      const deg = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
      if (typeof deg !== 'number' || !Number.isFinite(deg)) return;
      setState((prev) => {
        if (prev.speed > 3) return prev;
        smoothedRef.current = smoothHeading(smoothedRef.current, deg);
        return { ...prev, heading: smoothedRef.current };
      });
    });
  }, [isNavigating]);

  useEffect(() => {
    startWatching();
    return () => {
      watchRef.current?.remove();
      watchRef.current = null;
      headingSubRef.current?.remove();
      headingSubRef.current = null;
    };
  }, [startWatching]);

  return state;
}
