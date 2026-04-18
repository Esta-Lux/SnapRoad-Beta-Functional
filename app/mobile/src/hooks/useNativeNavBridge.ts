import { useCallback, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { tripGemsFromDurationMinutes } from '../utils/tripGems';
import type { TripSummary } from './useDriveNavigation';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import type { User } from '../types';
import {
  mergeTripCompleteResponse,
  raceWithTimeout,
  unwrapTripCompleteData,
  type TripCompleteApiData,
} from '../lib/tripComplete';

export { mergeTripCompleteResponse } from '../lib/tripComplete';
export type { TripCompleteApiData } from '../lib/tripComplete';

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

/** Minimum qualifying drive — matches `useDriveNavigation` thresholds so gem/XP rules stay consistent. */
export const NATIVE_NAV_MIN_QUALIFYING_MI = 0.15;
export const NATIVE_NAV_MIN_QUALIFYING_SEC = 45;
export const NATIVE_NAV_MIN_QUALIFYING_METERS = 200;

/** Max time we'll wait for `/api/trips/complete` before falling back to the local summary. */
export const NATIVE_NAV_TRIP_POST_TIMEOUT_MS = 2500;

/** Shared with `useDriveNavigation` so native-SDK-driven trips patch the local User the same way. */
function applyTripCompleteProfileToUser(
  updateUser: (u: Partial<User>) => void,
  profile: TripCompleteApiData['profile'],
) {
  if (!profile || typeof profile !== 'object') return;
  const patch: Partial<User> = {};
  if (profile.gems != null) patch.gems = Number(profile.gems);
  if (profile.level != null) patch.level = Number(profile.level);
  if (profile.total_trips != null) patch.totalTrips = Number(profile.total_trips);
  if (profile.total_miles != null) patch.totalMiles = Number(profile.total_miles);
  if (profile.xp != null) patch.xp = Number(profile.xp);
  if (profile.safety_score != null) patch.safetyScore = Number(profile.safety_score);
  if (Object.keys(patch).length) updateUser(patch);
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
 * and builds a TripSummary compatible with the existing trip-end flow. On completion
 * it mirrors `useDriveNavigation.endNavigation` so the trip summary card, rewards,
 * and profile totals all update after a native-SDK drive.
 */
export function useNativeNavBridge(params: {
  destination: NativeNavDestination;
  originName?: string;
  isPremium?: boolean;
}) {
  const { destination, originName, isPremium } = params;
  const { updateUser, refreshUserFromServer, bumpStatsVersion } = useAuth();
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
    const qualifiesTrip =
      distanceMiles >= NATIVE_NAV_MIN_QUALIFYING_MI &&
      durationSec >= NATIVE_NAV_MIN_QUALIFYING_SEC &&
      distanceMeters >= NATIVE_NAV_MIN_QUALIFYING_METERS;
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

  /** Build the local summary payload (no server call). Used for the initial hand-off + as fallback if the API is offline. */
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

  /**
   * Completes the trip end-to-end: posts to `/api/trips/complete`, merges server totals
   * into the summary, patches the local User, refreshes dashboards, and bumps stats.
   * Returns the (possibly server-augmented) summary so MapScreen can display accurate rewards.
   */
  const completeTripWithServer = useCallback(
    async (arrived: boolean): Promise<TripSummary> => {
      const base = buildTripSummary(arrived);
      if (!base.counted) {
        // Drive too short — trip card still shows locally but no server credit / stats bump.
        return base;
      }
      const metrics = getTripMetrics();
      try {
        const postPromise = api.post<unknown>('/api/trips/complete', {
          distance_miles: base.distance,
          duration_seconds: metrics.durationSec,
          safety_score: base.safety_score,
          started_at: metrics.startedAtIso,
          ended_at: metrics.endedAtIso,
          hard_braking_events: 0,
          speeding_events: 0,
          incidents_reported: 0,
        });
        // Race the network call against a timeout so the trip-end UI never blocks on a slow
        // backend. If the timeout wins, the POST keeps running; we just surface the local
        // summary immediately. `refreshUserFromServer` (fire-and-forget below) will reconcile
        // the dashboard/wallet on the next successful read.
        const raced = await raceWithTimeout(postPromise, NATIVE_NAV_TRIP_POST_TIMEOUT_MS);
        if (!raced || !raced.success || raced.data == null) return base;
        const merged = mergeTripCompleteResponse(base, raced.data);
        if (merged.counted) {
          const d = unwrapTripCompleteData(raced.data);
          applyTripCompleteProfileToUser(updateUser, d.profile);
          bumpStatsVersion();
          // Fire-and-forget; the summary card re-renders from the returned snapshot immediately.
          void refreshUserFromServer();
        }
        return merged;
      } catch {
        // Backend offline / network flap — show the locally computed summary so the user still sees their trip.
        return base;
      }
    },
    [buildTripSummary, getTripMetrics, updateUser, refreshUserFromServer, bumpStatsVersion],
  );

  const handleArrival = useCallback(() => {
    setArrivedAtDestination(true);
  }, []);

  return {
    handleProgressChanged,
    handleArrival,
    buildTripSummary,
    getTripMetrics,
    completeTripWithServer,
    arrivedAtDestination,
    routeProfile: routeProfileForPlatform(),
  };
}
