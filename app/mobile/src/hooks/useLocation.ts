import { useEffect, useRef, useState, useCallback } from 'react';
import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';
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
  const magnetoSubRef = useRef<{ remove: () => void } | null>(null);
  const headingRef = useRef(0);

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

        setState((prev) => ({
          ...prev,
          location: { lat, lng },
          speed: speedMph,
          accuracy: loc.coords.accuracy ?? null,
          isLocating: false,
          heading:
            typeof gpsHeading === 'number' && gpsHeading >= 0 && speedMph > 2
              ? gpsHeading
              : prev.heading,
        }));
      },
    );

    Magnetometer.setUpdateInterval(100);
    magnetoSubRef.current = Magnetometer.addListener((data) => {
      const { x, y } = data;
      let angle = Math.atan2(y, x) * (180 / Math.PI);
      angle = (angle + 360) % 360;
      headingRef.current = angle;
      setState((prev) => {
        if (prev.speed > 2) return prev;
        return { ...prev, heading: angle };
      });
    });
  }, []);

  useEffect(() => {
    startWatching();
    return () => {
      watchRef.current?.remove();
      magnetoSubRef.current?.remove();
    };
  }, [startWatching]);

  return state;
}
