import { useEffect, useRef, useState, useCallback } from 'react';
import * as Location from 'expo-location';
import { storage } from '../utils/storage';
import type { Coordinate } from '../types';

const LAST_LOC_KEY = 'last_location_v1';

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

function persistLocation(lat: number, lng: number) {
  storage.set(LAST_LOC_KEY, JSON.stringify({ lat, lng, t: Date.now() }));
}

const DEFAULT_LOCATION: Coordinate = { lat: 39.9612, lng: -82.9988 };
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

export function useLocation() {
  const cached = readCachedLocation();
  const [state, setState] = useState<LocationState>({
    location: cached ?? DEFAULT_LOCATION,
    heading: 0,
    speed: 0,
    accuracy: null,
    isLocating: true,
    permissionDenied: false,
  });

  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const headingSubRef = useRef<Location.LocationSubscription | null>(null);
  const smoothedRef = useRef(0);

  const startWatching = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setState((prev) => ({ ...prev, isLocating: false, permissionDenied: true }));
      return;
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

    watchRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 2,
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
  }, []);

  useEffect(() => {
    startWatching();
    return () => {
      watchRef.current?.remove();
      headingSubRef.current?.remove();
    };
  }, [startWatching]);

  return state;
}
