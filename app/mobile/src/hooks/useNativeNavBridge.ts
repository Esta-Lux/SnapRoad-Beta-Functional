import { useCallback, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { tripGemsFromDurationMinutes } from '../utils/tripGems';
import type { TripSummary } from './useNavigation';

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

  const buildTripSummary = useCallback(
    (arrived: boolean): TripSummary => {
      const progress = lastProgressRef.current;
      const durationMin = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 60_000));
      const distanceMeters = progress?.distanceTraveled ?? 0;
      const distanceMiles = distanceMeters / 1609.34;
      const roundedDist = Math.round(distanceMiles * 10) / 10;

      const qualifiesTrip = distanceMiles >= 0.15 && durationMin >= 1;

      return {
        distance: roundedDist,
        duration: durationMin,
        safety_score: 85,
        gems_earned: qualifiesTrip ? tripGemsFromDurationMinutes(durationMin, Boolean(isPremium)) : 0,
        xp_earned: qualifiesTrip ? 100 : 0,
        origin: originName ?? 'Current Location',
        destination: destination.name ?? 'Destination',
        date: new Date().toLocaleDateString(),
        counted: qualifiesTrip,
        arrivedAtDestination: arrived,
      };
    },
    [destination.name, originName, isPremium],
  );

  const handleArrival = useCallback(() => {
    setArrivedAtDestination(true);
  }, []);

  return {
    handleProgressChanged,
    handleArrival,
    buildTripSummary,
    arrivedAtDestination,
    routeProfile: routeProfileForPlatform(),
  };
}
