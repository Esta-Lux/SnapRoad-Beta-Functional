import type { MutableRefObject } from 'react';
import { useEffect, useRef, useCallback } from 'react';
import { api } from '../api/client';
import {
  estimateFuelCostUsd,
  estimateFuelGallons,
  estimateMileageDeductionUsd,
  DEFAULT_FUEL_MPG,
  DEFAULT_FUEL_PRICE_PER_GALLON,
} from '../utils/driveMetrics';
import type { Coordinate } from '../types';
import { unwrapTripCompleteData } from '../lib/tripComplete';
import {
  emptyDriveSafetyState,
  processDriveSafetySample,
  tripSafetyScoreFromEventCounts,
} from '../utils/driveSafetyEvents';

const MIN_SPEED_MPH = 4;
const STATIONARY_MS = 120_000;
const MIN_ODOM_M = 160;
const MIN_DURATION_SEC = 30;
const COOLDOWN_AFTER_NAV_MS = 90_000;
const SUBMIT_COOLDOWN_MS = 15_000;
/** Above this we ignore the speed sample as a likely GPS outlier. */
const MAX_PLAUSIBLE_SPEED_MPH = 160;

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

type UserLite = { isPremium?: boolean; safetyScore?: number } | null | undefined;

function applyTripCompleteToUser(
  updateUser: (p: {
    gems?: number;
    totalMiles?: number;
    totalTrips?: number;
    xp?: number;
  }) => void,
  inner: Record<string, unknown>,
) {
  const profRaw = inner?.profile as Record<string, unknown> | undefined;
  if (profRaw && typeof profRaw === 'object') {
    updateUser({
      gems: profRaw.gems != null ? Number(profRaw.gems) : undefined,
      totalMiles: profRaw.total_miles != null ? Number(profRaw.total_miles) : undefined,
      totalTrips: profRaw.total_trips != null ? Number(profRaw.total_trips) : undefined,
      xp: profRaw.xp != null ? Number(profRaw.xp) : undefined,
    });
  }
}

/**
 * When not in turn-by-turn navigation, accumulate real movement and call POST /api/trips/complete
 * after ~2 min stopped (same backend gates as nav trips).
 */
export function usePassiveDriveGems(opts: {
  enabled: boolean;
  mapFocused: boolean;
  isNavigating: boolean;
  location: Coordinate;
  speedMph: number;
  gpsAccuracyM?: number | null;
  tripFuelContextRef?: MutableRefObject<{ stateLabel?: string; priceUsdPerGal?: number } | null>;
  user: UserLite;
  updateUser: (p: {
    gems?: number;
    totalMiles?: number;
    totalTrips?: number;
    xp?: number;
  }) => void;
  refreshUserFromServer: () => Promise<boolean>;
  bumpStatsVersion: () => void;
}) {
  const {
    enabled,
    mapFocused,
    isNavigating,
    location,
    speedMph,
    gpsAccuracyM = null,
    tripFuelContextRef,
    user: _userIgnored,
    updateUser,
    refreshUserFromServer,
    bumpStatsVersion,
  } = opts;

  const segmentStartMs = useRef<number | null>(null);
  const lastMoveMs = useRef<number>(0);
  const odomRef = useRef(0);
  const prevLl = useRef<Coordinate | null>(null);
  const passiveCooldownUntil = useRef(0);
  const lastSubmitAt = useRef(0);
  const wasNavigating = useRef(false);
  /** Smoothed peak speed across the passive segment. Sent as `max_speed_mph`. */
  const maxSpeedMphRef = useRef(0);
  /** Hard-braking-only telemetry (passive drives have no speed-limit context). */
  const passiveSafetyRef = useRef(emptyDriveSafetyState());

  const finalizeSegment = useCallback(async () => {
    const start = segmentStartMs.current;
    if (start == null) return;
    const now = Date.now();
    const odom = odomRef.current;
    const durationSec = Math.round((now - start) / 1000);
    const maxSpeedSeen = maxSpeedMphRef.current;
    const safetySnap = passiveSafetyRef.current;

    segmentStartMs.current = null;
    odomRef.current = 0;
    prevLl.current = null;
    maxSpeedMphRef.current = 0;
    passiveSafetyRef.current = emptyDriveSafetyState();

    if (durationSec < MIN_DURATION_SEC || odom < MIN_ODOM_M) return;
    if (now < passiveCooldownUntil.current) return;
    if (now - lastSubmitAt.current < SUBMIT_COOLDOWN_MS) return;
    lastSubmitAt.current = now;

    const distMi = odom / 1609.34;
    const roundedDist = Math.max(0, Math.round(distMi * 100) / 100);
    const durationMin = Math.max(0, Math.round(durationSec / 60));
    const avgSpeed =
      durationSec > 0
        ? Math.round((roundedDist / (durationSec / 3600)) * 10) / 10
        : 0;
    const maxSpeed = Math.round(Math.max(avgSpeed, maxSpeedSeen) * 10) / 10;
    const fuelGal = Math.round(estimateFuelGallons(roundedDist) * 1000) / 1000;
    const tripSafety = tripSafetyScoreFromEventCounts(safetySnap.hardBrakingEvents, safetySnap.speedingEvents);
    const fuelCtx = tripFuelContextRef?.current;
    const regionalPrice = fuelCtx?.priceUsdPerGal;
    const fuelCost =
      Math.round(
        estimateFuelCostUsd(
          roundedDist,
          DEFAULT_FUEL_MPG,
          regionalPrice ?? DEFAULT_FUEL_PRICE_PER_GALLON,
        ) * 100,
      ) / 100;

    try {
      const res = await api.post<Record<string, unknown>>('/api/trips/complete', {
        distance_miles: roundedDist,
        duration_seconds: durationSec,
        safety_score: tripSafety,
        started_at: new Date(start).toISOString(),
        ended_at: new Date(now).toISOString(),
        origin: 'Background drive',
        destination: 'Ended here',
        avg_speed_mph: avgSpeed,
        max_speed_mph: maxSpeed,
        fuel_used_gallons: fuelGal,
        fuel_cost_estimate: fuelCost,
        mileage_value_estimate: Math.round(estimateMileageDeductionUsd(roundedDist) * 100) / 100,
        hard_braking_events: safetySnap.hardBrakingEvents,
        speeding_events: safetySnap.speedingEvents,
        incidents_reported: 0,
        region_state: fuelCtx?.stateLabel,
      });
      if (!res.success || !res.data) return;
      const payload = unwrapTripCompleteData(res.data);
      const apiCounted = payload.counted !== false && payload.trip_id != null;
      if (!apiCounted) return;
      applyTripCompleteToUser(updateUser, payload as Record<string, unknown>);
      await refreshUserFromServer();
      bumpStatsVersion();
    } catch {
      /* offline */
    }
  }, [tripFuelContextRef, updateUser, refreshUserFromServer, bumpStatsVersion]);

  useEffect(() => {
    if (wasNavigating.current && !isNavigating) {
      passiveCooldownUntil.current = Date.now() + COOLDOWN_AFTER_NAV_MS;
    }
    wasNavigating.current = isNavigating;
  }, [isNavigating]);

  useEffect(() => {
    if (!enabled || !mapFocused || isNavigating) {
      if (!isNavigating && segmentStartMs.current != null) {
        const idleMs = Date.now() - lastMoveMs.current;
        if (idleMs > STATIONARY_MS) void finalizeSegment();
      }
      if (isNavigating) {
        segmentStartMs.current = null;
        odomRef.current = 0;
        prevLl.current = null;
        passiveSafetyRef.current = emptyDriveSafetyState();
      }
      return;
    }

    const now = Date.now();
    if (now < passiveCooldownUntil.current) return;

    const moving = speedMph >= MIN_SPEED_MPH;
    if (moving) {
      if (segmentStartMs.current == null) {
        segmentStartMs.current = now;
        passiveSafetyRef.current = emptyDriveSafetyState();
      }
      lastMoveMs.current = now;
      const prev = prevLl.current;
      if (prev && Math.abs(prev.lat) > 1e-6 && Math.abs(location.lat) > 1e-6) {
        const d = haversineMeters(prev, location);
        if (d > 0 && d < 500) odomRef.current += d;
      }
      prevLl.current = location;
      if (
        Number.isFinite(speedMph) &&
        speedMph > 0 &&
        speedMph <= MAX_PLAUSIBLE_SPEED_MPH &&
        speedMph > maxSpeedMphRef.current
      ) {
        maxSpeedMphRef.current = speedMph;
      }
      passiveSafetyRef.current = processDriveSafetySample(passiveSafetyRef.current, {
        atMs: now,
        speedMph,
        gpsAccuracyM: typeof gpsAccuracyM === 'number' && Number.isFinite(gpsAccuracyM) ? gpsAccuracyM : null,
        isNavigating: true,
      });
    } else {
      prevLl.current = location;
      if (segmentStartMs.current != null && now - lastMoveMs.current > STATIONARY_MS) {
        void finalizeSegment();
      }
    }
  }, [
    enabled,
    mapFocused,
    isNavigating,
    location.lat,
    location.lng,
    speedMph,
    gpsAccuracyM,
    finalizeSegment,
  ]);
}
