import { useCallback, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { tripGemsFromDurationMinutes } from '../utils/tripGems';
import type { TripSummary } from './useDriveNavigation';

export interface NativeNavDestination {
  lat: number;
  lng: number;
  name?: string;
}

export interface NativeNavParams {
  origin: { lat: number; lng: number };
  destination: NativeNavDestination;
  voiceMuted?: boolean;
  drivingMode?: string;
}

export interface NativeNavProgressEvent {
  distanceRemaining: number;
  distanceTraveled: number;
  durationRemaining: number;
  fractionTraveled: number;
}

export interface NativeNavTripMetrics {
  durationSec: number;
  distanceMeters: number;
  distanceMiles: number;
  roundedDistanceMiles: number;
  qualifiesTrip: boolean;
  startedAtIso: string;
  endedAtIso: string;
}

/**
 * Adapts `routeProfile` for the native Navigation SDK.
 * Android omits the `mapbox/` prefix; iOS uses the full form.
 */
export function routeProfileForPlatform(): string {
  return Platform.OS === 'android' ? 'driving-traffic' : 'mapbox/driving-traffic';
}

/**
 * Thin hook that accumulates progress data from the native Mapbox Navigation SDK
 * and builds a TripSummary compatible with the existing trip-end flow.
 */
export function useNativeNavBridge(params: {
  destination: NativeNavDestination;
  originName?: string;
  isPremium?: boolean;
}) {
  const { destination, originName, isPremium } = params;
  const startTimeRef = useRef(Date.now());
  const lastProgressRef = useRef<NativeNavProgressEvent | null>(null);
  const [arrivedAtDestination, setArrivedAtDestination] = useState(false);

  const handleProgressChanged = useCallback((event: { nativeEvent: NativeNavProgressEvent }) => {
    lastProgressRef.current = event.nativeEvent;
  }, []);

  const getTripMetrics = useCallback((): NativeNavTripMetrics => {
    const progress = lastProgressRef.current;
    const nowMs = Date.now();
    const durationSec = Math.max(1, Math.round((nowMs - startTimeRef.current) / 1000));
    const distanceMeters = Math.max(0, progress?.distanceTraveled ?? 0);
    const distanceMiles = distanceMeters / 1609.34;
    const roundedDistanceMiles = Math.round(distanceMiles * 10) / 10;
    const qualifiesTrip = distanceMiles >= 0.15 && durationSec >= 45 && distanceMeters >= 200;
    return {
      durationSec,
      distanceMeters,
      distanceMiles,
      roundedDistanceMiles,
      qualifiesTrip,
      startedAtIso: new Date(startTimeRef.current).toISOString(),
      endedAtIso: new Date(nowMs).toISOString(),
    };
  }, []);

  const buildTripSummary = useCallback(
    (arrived: boolean): TripSummary => {
      const metrics = getTripMetrics();
      const durationMin = Math.max(1, Math.round(metrics.durationSec / 60));

      return {
        distance: metrics.roundedDistanceMiles,
        duration: durationMin,
        safety_score: 85,
        gems_earned: metrics.qualifiesTrip ? tripGemsFromDurationMinutes(durationMin, Boolean(isPremium)) : 0,
        xp_earned: metrics.qualifiesTrip ? 100 : 0,
        origin: originName ?? 'Current Location',
        destination: destination.name ?? 'Destination',
        date: new Date().toLocaleDateString(),
        counted: metrics.qualifiesTrip,
        arrivedAtDestination: arrived,
      };
    },
    [destination.name, getTripMetrics, originName, isPremium],
  );

  const handleArrival = useCallback(() => {
    setArrivedAtDestination(true);
  }, []);

  return {
    handleProgressChanged,
    handleArrival,
    buildTripSummary,
    getTripMetrics,
    arrivedAtDestination,
    routeProfile: routeProfileForPlatform(),
  };
}
