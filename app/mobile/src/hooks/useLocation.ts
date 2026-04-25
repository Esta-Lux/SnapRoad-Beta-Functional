import { useEffect, useRef, useState, useCallback } from 'react';
import * as Location from 'expo-location';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import { loadCachedLocation, persistCachedLocation } from '../utils/locationCache';
import {
  accuracyQualityFactor,
  coordinateSeparationMeters,
  extrapolateForDisplay,
  plausibleMaxStepMeters,
  shouldHoldBlendForOutlierStep,
} from '../utils/locationAccuracy';
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
/** Smoothed speed (mph) below which the puck position freezes to suppress GPS wander. */
const STATIONARY_SPEED_THRESHOLD_MPH = 1.0;
/** Raw speed (mph) below which the puck position freezes to suppress GPS wander. */
const STATIONARY_RAW_SPEED_THRESHOLD_MPH = 1.5;
/** Distance (m) below which GPS drift is ignored when the device is near-stationary. */
const STATIONARY_DISTANCE_THRESHOLD_M = 5;
/** Speed (mph) below which compass heading is completely frozen during navigation. */
const COMPASS_FREEZE_SPEED_MPH = 2;

const HEADING_SMOOTHING = 0.2;
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

/**
 * Adaptive EMA toward raw GPS — higher alpha at speed, speed-proportional max-jump,
 * tighter anti-wander when nearly stopped.
 */
function blendTowardGps(
  prev: Coordinate,
  raw: Coordinate,
  accuracyM: number | null,
  speedMph: number,
  smoothedSpeedMph: number,
  isNavigating: boolean,
  dtSec: number,
  qualityScale: number,
): Coordinate {
  const dist = haversineMeters(prev, raw);

  /* ── Dead zone: freeze position when effectively stationary ────────────
   * GPS wanders 2–5 m even at standstill.  When both smoothed and raw
   * speed are near-zero AND the device hasn't moved significantly, keep
   * the previous coordinate to eliminate puck jitter at traffic lights,
   * parking, etc.
   */
  if (smoothedSpeedMph < STATIONARY_SPEED_THRESHOLD_MPH && speedMph < STATIONARY_RAW_SPEED_THRESHOLD_MPH && dist < STATIONARY_DISTANCE_THRESHOLD_M) {
    return prev;
  }

  const speedMps = Math.max(0, speedMph) / 2.237;
  const vRegime = Math.max(smoothedSpeedMph, speedMph * 0.9);

  let base = isNavigating
    ? 3.0 + speedMps * dtSec * 2.6
    : 2.0 + speedMps * dtSec * 2.75;
  const accExtra = typeof accuracyM === 'number' ? Math.min(50, accuracyM * 0.45) : 15;
  let maxJump = Math.min(220, base + accExtra);

  if (vRegime < 2.5 && speedMph < 4) {
    maxJump = Math.min(maxJump, 18 + (typeof accuracyM === 'number' ? accuracyM * 0.55 : 12));
  }
  if (vRegime > 42) {
    maxJump = Math.min(280, maxJump + speedMps * dtSec * 0.6);
  }
  if (vRegime > 60) {
    maxJump = Math.min(350, maxJump + speedMps * dtSec * 0.4);
  }

  if (dist > maxJump && speedMph < 6) {
    return prev;
  }
  if (dist > maxJump * 1.22 && speedMph < 26) {
    const t = 0.14;
    return {
      lat: prev.lat + (raw.lat - prev.lat) * t,
      lng: prev.lng + (raw.lng - prev.lng) * t,
    };
  }

  let a: number;
  if (vRegime < 1.4 && speedMph < 2.8) {
    a = 0.048;
  } else if (vRegime < 5) {
    a = isNavigating ? 0.2 : 0.16;
  } else if (vRegime < 15) {
    a = isNavigating ? 0.42 : 0.32;
  } else if (vRegime < 30) {
    a = isNavigating ? 0.62 : 0.45;
  } else if (vRegime < 48) {
    a = isNavigating ? 0.78 : 0.55;
  } else if (vRegime < 65) {
    a = isNavigating ? 0.88 : 0.65;
  } else {
    a = isNavigating ? 0.92 : 0.72;
  }

  if (typeof accuracyM === 'number') {
    if (accuracyM > 62) a *= vRegime > 38 ? 0.85 : 0.48;
    else if (accuracyM > 36) a *= vRegime > 38 ? 0.92 : 0.7;
    else if (accuracyM < 12 && vRegime > 18) a = Math.min(0.94, a * 1.08);
    else if (accuracyM < 8 && vRegime > 40) a = Math.min(0.95, a * 1.1);
  }

  if (smoothedSpeedMph < 1.8 && speedMph < 3 && dist < Math.max(2.0, (accuracyM ?? 12) * 0.35)) {
    a *= 0.38;
  }

  a *= qualityScale;
  a = Math.min(0.95, Math.max(0.028, a));

  let lat = prev.lat + (raw.lat - prev.lat) * a;
  let lng = prev.lng + (raw.lng - prev.lng) * a;
  const stepAfter = haversineMeters(prev, { lat, lng });

  if (smoothedSpeedMph < 2.2 && speedMph < 5 && dist < 14) {
    const maxStep = Math.min(2.8, Math.max(0.45, (accuracyM ?? 14) * 0.18));
    if (stepAfter > maxStep) {
      const t = maxStep / stepAfter;
      lat = prev.lat + (lat - prev.lat) * t;
      lng = prev.lng + (lng - prev.lng) * t;
    }
  }

  return { lat, lng };
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
  /** First `watchPositionAsync` sample — skip applying slower "quick seed" if watch already fired. */
  const watchDeliveredRef = useRef(false);
  const headingSubRef = useRef<Location.LocationSubscription | null>(null);
  const smoothedRef = useRef(0);
  const hasHeadingRef = useRef(false);
  const bgPermRequested = useRef(false);
  /** Low-pass filtered fix — drives map + nav (not raw GPS). */
  const positionBlendRef = useRef<Coordinate | null>(null);
  const lastGpsFixAtRef = useRef<number>(Date.now());
  /** Previous raw GPS sample — outlier step detection between fixes. */
  const prevRawFixRef = useRef<Coordinate | null>(null);
  /** Prior published heading — suppress display extrapolation during sharp turns. */
  const displayHeadingPrevRef = useRef<number | null>(null);

  const prevNavigatingRef = useRef(isNavigating);
  useEffect(() => {
    if (prevNavigatingRef.current !== isNavigating) {
      displayHeadingPrevRef.current = null;
      prevNavigatingRef.current = isNavigating;
    }
  }, [isNavigating]);

  useEffect(() => {
    let cancelled = false;
    loadCachedLocation().then((cached) => {
      if (cancelled || !cached) return;
      positionBlendRef.current = cached;
      prevRawFixRef.current = cached;
      lastGpsFixAtRef.current = Date.now();
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

    watchDeliveredRef.current = false;

    const applyQuickSeed = (
      lat: number,
      lng: number,
      acc: number | null | undefined,
      speedMph: number,
    ) => {
      if (watchDeliveredRef.current) return;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      persistCachedLocation(lat, lng);
      const initCoord = { lat, lng };
      positionBlendRef.current = initCoord;
      prevRawFixRef.current = initCoord;
      lastGpsFixAtRef.current = Date.now();
      setState((prev) => ({
        ...prev,
        location: initCoord,
        speed: speedMph,
        accuracy: acc ?? null,
        isLocating: false,
      }));
    };

    /**
     * Cold open: do **not** block `watchPositionAsync` on `Highest` — that often waits several
     * seconds while the map shows 0,0 or stale cache. Balanced usually returns within ~1s; the
     * watch stream then refines with BestForNavigation/Highest.
     */
    void (async () => {
      try {
        const fix = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const lat = fix.coords.latitude;
        const lng = fix.coords.longitude;
        applyQuickSeed(
          lat,
          lng,
          fix.coords.accuracy,
          Math.max(0, (fix.coords.speed ?? 0) * 2.237),
        );
      } catch {
        /* seed optional */
      }
    })();

    const accuracy = isNavigating
      ? Location.Accuracy.BestForNavigation
      : Location.Accuracy.Highest;
    const timeInterval = isNavigating ? 500 : 2000;
    const distanceInterval = isNavigating ? 0.5 : 8;

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
        watchDeliveredRef.current = true;
        const lat = loc.coords.latitude;
        const lng = loc.coords.longitude;
        const acc = loc.coords.accuracy;
        let speedMph = Math.max(0, (loc.coords.speed ?? 0) * 2.237);
        const gpsHeading = loc.coords.heading;
        const rawCoord = { lat, lng };
        const now = Date.now();
        const dtSec = Math.min(3.5, Math.max(0.07, (now - lastGpsFixAtRef.current) / 1000));

        persistCachedLocation(lat, lng);

        /** Above ~5 mph, course-over-ground is usually stabler than magnetometer for map bearing. */
        const useGpsCourse =
          typeof gpsHeading === 'number' && Number.isFinite(gpsHeading) && gpsHeading >= 0 && speedMph > 5;

        setState((prev) => {
          const movedMeters = haversineMeters(prev.location, rawCoord);
          /**
           * Large move at low reported speed: user relocated, first fix after cache, or
           * app resumed in a new place — do **not** freeze the puck on the old coordinate.
           * (Previously we dropped the update and kept stale location → "GPS stuck" reports.)
           */
          if (
            prev.location.lat !== UNKNOWN_LOCATION.lat &&
            prev.location.lng !== UNKNOWN_LOCATION.lng &&
            prev.speed < 8 &&
            speedMph < 8 &&
            movedMeters > LOW_SPEED_JUMP_METERS
          ) {
            prevRawFixRef.current = rawCoord;
            positionBlendRef.current = rawCoord;
            lastGpsFixAtRef.current = now;
            return {
              ...prev,
              location: rawCoord,
              isLocating: false,
              accuracy: acc ?? prev.accuracy,
            };
          }

          const prevRaw = prevRawFixRef.current;
          const stepFromPrev =
            prevRaw != null ? coordinateSeparationMeters(prevRaw, rawCoord) : 0;
          prevRawFixRef.current = rawCoord;

          lastGpsFixAtRef.current = now;

          const maxStep = plausibleMaxStepMeters(speedMph, dtSec, isNavigating, acc ?? null);
          const holdOutlier = shouldHoldBlendForOutlierStep(stepFromPrev, speedMph, maxStep);
          const qualityScale = accuracyQualityFactor(acc ?? null);

          const baseCoord =
            positionBlendRef.current ??
            (prev.location.lat !== UNKNOWN_LOCATION.lat ? prev.location : null);
          const nextCoord =
            holdOutlier && baseCoord != null
              ? baseCoord
              : baseCoord != null
                ? blendTowardGps(
                    baseCoord,
                    rawCoord,
                    acc ?? null,
                    speedMph,
                    prev.speed,
                    isNavigating,
                    dtSec,
                    qualityScale,
                  )
                : rawCoord;
          positionBlendRef.current = nextCoord;

          let newHeading = prev.heading;
          if (useGpsCourse) {
            const hAlpha =
              speedMph < 12 ? 0.22 : speedMph < 25 ? 0.3 : speedMph < 45 ? 0.4 : 0.52;
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
          let alpha =
            !isNavigating
              ? SPEED_SMOOTHING
              : accuracyPoor
                ? 0.08
                : accuracyWeak
                  ? 0.14
                  : SPEED_SMOOTHING;

          if (holdOutlier) alpha *= 0.42;

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

          let published = nextCoord;
          if (isNavigating && !holdOutlier) {
            published = extrapolateForDisplay(
              nextCoord,
              newHeading,
              nextSpeed,
              dtSec,
              true,
              displayHeadingPrevRef.current,
              acc ?? null,
            );
            displayHeadingPrevRef.current = newHeading;
          } else {
            displayHeadingPrevRef.current = newHeading;
          }

          return {
            ...prev,
            location: published,
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
        /** Freeze heading entirely when nearly stopped — compass is too noisy to be useful. */
        if (isNavigating && prev.speed < COMPASS_FREEZE_SPEED_MPH) return prev;
        const compassAlpha =
          isNavigating && prev.speed < 5
            ? 0.07
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

  /**
   * Every time the app returns to the foreground, take a fresh fix so the map does not
   * sit on an old blended coordinate after driving / flying / poor offline caching.
   */
  useEffect(() => {
    const onAppState = (next: AppStateStatus) => {
      if (next !== 'active' || paused) return;
      void (async () => {
        try {
          const { status } = await Location.getForegroundPermissionsAsync();
          if (status !== 'granted') return;
          const fix = await Location.getCurrentPositionAsync({
            accuracy: isNavigating
              ? Location.Accuracy.BestForNavigation
              : Location.Accuracy.Highest,
          });
          const lat = fix.coords.latitude;
          const lng = fix.coords.longitude;
          const acc = fix.coords.accuracy;
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
          const initCoord = { lat, lng };
          const speedMph = Math.max(0, (fix.coords.speed ?? 0) * 2.237);
          persistCachedLocation(lat, lng);
          positionBlendRef.current = initCoord;
          prevRawFixRef.current = initCoord;
          lastGpsFixAtRef.current = Date.now();
          setState((prev) => ({
            ...prev,
            location: initCoord,
            speed: speedMph,
            accuracy: acc ?? null,
            isLocating: false,
          }));
        } catch {
          /* network-independent — ignore */
        }
      })();
    };
    const sub = AppState.addEventListener('change', onAppState);
    return () => sub.remove();
  }, [paused, isNavigating]);

  return state;
}
