import { useEffect, useRef, useState, useCallback } from 'react';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { loadCachedLocation, persistCachedLocation } from '../utils/locationCache';
import type { Coordinate } from '../types';

interface LocationState {
  location: Coordinate;
  heading: number;
  speed: number;
  accuracy: number | null;
  isLocating: boolean;
  permissionDenied: boolean;
}

const UNKNOWN_LOCATION: Coordinate = { lat: 0, lng: 0 };
const HEADING_SMOOTHING = 0.2;
/** Nav + slow: stronger compass damping to prevent spin/wobble (< ~5 mph). */
const HEADING_SMOOTHING_SLOW_NAV = 0.1;
const SPEED_SMOOTHING = 0.25;
const LOW_SPEED_JUMP_METERS = 120;
/** Max MPH change accepted per ~1s navigation tick (dampens GPS speed spikes). */
const NAV_SPEED_MAX_STEP_MPH = 18;

function haversineMeters(a: Coordinate, b: Coordinate): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function smoothHeading(current: number, raw: number, alpha = HEADING_SMOOTHING): number {
  let delta = raw - current;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  let result = current + delta * alpha;
  if (result < 0) result += 360;
  if (result >= 360) result -= 360;
  return result;
}

export type UseLocationOptions = {
  /**
   * When true, tear down GPS / heading subscriptions (e.g. tab blurred).
   * Keeps last known coordinates in state so UI stays coherent when returning.
   */
  paused?: boolean;
};

export function useLocation(isNavigating = false, opts?: UseLocationOptions) {
  const paused = opts?.paused ?? false;
  const [state, setState] = useState<LocationState>({
    location: UNKNOWN_LOCATION,
    heading: 0,
    speed: 0,
    accuracy: null,
    isLocating: true,
    permissionDenied: false,
  });

  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const headingSubRef = useRef<Location.LocationSubscription | null>(null);
  const smoothedRef = useRef(0);
  const hasHeadingRef = useRef(false);
  const bgPermRequested = useRef(false);

  useEffect(() => {
    let cancelled = false;
    loadCachedLocation().then((cached) => {
      if (cancelled || !cached) return;
      setState((prev) => (
        prev.location.lat === UNKNOWN_LOCATION.lat && prev.location.lng === UNKNOWN_LOCATION.lng
          ? { ...prev, location: cached }
          : prev
      ));
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

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
      } catch { /* foreground-only nav */ }
    }

    try {
      const coarse = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const lat = coarse.coords.latitude;
      const lng = coarse.coords.longitude;
      persistCachedLocation(lat, lng);
      setState((prev) => ({
        ...prev,
        location: { lat, lng },
        speed: Math.max(0, (coarse.coords.speed ?? 0) * 2.237),
        accuracy: coarse.coords.accuracy ?? null,
        isLocating: false,
      }));
    } catch {}

    /** Non-nav used Balanced + 5s — speed readout lagged vs dashboard; High + 2s matches nav feel better. */
    const accuracy = isNavigating
      ? Location.Accuracy.BestForNavigation
      : Location.Accuracy.Highest;
    /** Nav: faster fixes so puck / progress / turn card stay aligned (still OS-throttled). */
    const timeInterval = isNavigating ? 750 : 2000;
    const distanceInterval = isNavigating ? 1 : 8;

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
        const acc = loc.coords.accuracy;
        let speedMph = Math.max(0, (loc.coords.speed ?? 0) * 2.237);
        const gpsHeading = loc.coords.heading;
        const nextCoord = { lat, lng };

        persistCachedLocation(lat, lng);

        /** Above ~5 mph, course-over-ground is usually stabler than magnetometer for map bearing. */
        const useGpsCourse =
          typeof gpsHeading === 'number' && Number.isFinite(gpsHeading) && gpsHeading >= 0 && speedMph > 5;

        setState((prev) => {
          const movedMeters = haversineMeters(prev.location, nextCoord);
          if (
            prev.location.lat !== UNKNOWN_LOCATION.lat &&
            prev.location.lng !== UNKNOWN_LOCATION.lng &&
            prev.speed < 8 &&
            speedMph < 8 &&
            movedMeters > LOW_SPEED_JUMP_METERS
          ) {
            return { ...prev, isLocating: false, accuracy: acc ?? prev.accuracy };
          }

          let newHeading = prev.heading;
          if (useGpsCourse) {
            const hAlpha =
              speedMph < 12 ? 0.22 : speedMph < 35 ? 0.32 : 0.42;
            if (!hasHeadingRef.current) {
              smoothedRef.current = gpsHeading;
              hasHeadingRef.current = true;
            } else {
              smoothedRef.current = smoothHeading(smoothedRef.current, gpsHeading, hAlpha);
            }
            newHeading = smoothedRef.current;
          } else if (isNavigating && prev.speed < 5) {
            /** Below course-lock speed: keep last bearing; magnetometer updates heading subscription only. */
            newHeading = prev.heading;
          }

          const accuracyPoor = typeof acc === 'number' && acc > 72;
          const accuracyWeak = typeof acc === 'number' && acc > 42;
          const alpha =
            !isNavigating
              ? SPEED_SMOOTHING
              : accuracyPoor
                ? 0.08
                : accuracyWeak
                  ? 0.14
                  : SPEED_SMOOTHING;

          if (isNavigating && accuracyPoor && speedMph > prev.speed + 25) {
            speedMph = prev.speed + 8;
          }

          let nextSpeed = prev.speed + (speedMph - prev.speed) * alpha;
          if (prev.location.lat !== UNKNOWN_LOCATION.lat) {
            const delta = nextSpeed - prev.speed;
            const cap = isNavigating
              ? (accuracyPoor ? 10 : NAV_SPEED_MAX_STEP_MPH)
              : accuracyPoor
                ? 12
                : 24;
            const maxSlow = isNavigating ? -28 : -32;
            const clampedDelta = Math.max(maxSlow, Math.min(cap, delta));
            nextSpeed = Math.max(0, prev.speed + clampedDelta);
          }

          return {
            ...prev,
            location: nextCoord,
            speed: nextSpeed,
            accuracy: acc ?? null,
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
        /** Same threshold as GPS course: above this, COG drives bearing; ignore compass jitter. */
        if (prev.speed > 5) return prev;
        const compassAlpha =
          isNavigating && prev.speed < 2.5
            ? 0.07
            : isNavigating && prev.speed < 5
              ? HEADING_SMOOTHING_SLOW_NAV
              : HEADING_SMOOTHING;
        if (!hasHeadingRef.current) {
          smoothedRef.current = deg;
          hasHeadingRef.current = true;
        } else {
          smoothedRef.current = smoothHeading(smoothedRef.current, deg, compassAlpha);
        }
        return { ...prev, heading: smoothedRef.current };
      });
    });
  }, [isNavigating]);

  useEffect(() => {
    if (paused) {
      watchRef.current?.remove();
      watchRef.current = null;
      headingSubRef.current?.remove();
      headingSubRef.current = null;
      return;
    }
    void startWatching();
    return () => {
      watchRef.current?.remove();
      watchRef.current = null;
      headingSubRef.current?.remove();
      headingSubRef.current = null;
    };
  }, [paused, startWatching]);

  return state;
}
