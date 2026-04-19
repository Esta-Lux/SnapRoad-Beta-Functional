import { useEffect, useRef, useCallback } from 'react';
import { api } from '../api/client';
import type { Coordinate } from '../types';

const MIN_SPEED_MPH = 4;
const STATIONARY_MS = 120_000;
const MIN_ODOM_M = 200;
const MIN_DURATION_SEC = 45;
const COOLDOWN_AFTER_NAV_MS = 90_000;
const SUBMIT_COOLDOWN_MS = 15_000;

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

type UserLite = { isPremium?: boolean } | null | undefined;

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
    user,
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

  const finalizeSegment = useCallback(async () => {
    const start = segmentStartMs.current;
    if (start == null) return;
    const now = Date.now();
    const odom = odomRef.current;
    const durationSec = Math.round((now - start) / 1000);

    segmentStartMs.current = null;
    odomRef.current = 0;
    prevLl.current = null;

    if (durationSec < MIN_DURATION_SEC || odom < MIN_ODOM_M) return;
    if (now < passiveCooldownUntil.current) return;
    if (now - lastSubmitAt.current < SUBMIT_COOLDOWN_MS) return;
    lastSubmitAt.current = now;

    const distMi = odom / 1609.34;
    const roundedDist = Math.max(0, Math.round(distMi * 100) / 100);
    const durationMin = Math.max(0, Math.round(durationSec / 60));

    try {
      const res = await api.post<Record<string, unknown>>('/api/trips/complete', {
        distance_miles: roundedDist,
        duration_seconds: durationSec,
        safety_score: 85,
        started_at: new Date(start).toISOString(),
        ended_at: new Date(now).toISOString(),
        hard_braking_events: 0,
        speeding_events: 0,
        incidents_reported: 0,
      });
      if (!res.success || !res.data) return;
      const body = res.data as Record<string, unknown>;
      const d = (body.data as Record<string, unknown> | undefined) ?? body;
      const inner = (d?.data as Record<string, unknown> | undefined) ?? d;
      const apiCounted = inner?.counted !== false && inner?.trip_id != null;
      if (!apiCounted) return;
      applyTripCompleteToUser(updateUser, inner);
      await refreshUserFromServer();
      bumpStatsVersion();
    } catch {
      /* offline */
    }
  }, [user?.isPremium, updateUser, refreshUserFromServer, bumpStatsVersion]);

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
      }
      return;
    }

    const now = Date.now();
    if (now < passiveCooldownUntil.current) return;

    const moving = speedMph >= MIN_SPEED_MPH;
    if (moving) {
      if (segmentStartMs.current == null) segmentStartMs.current = now;
      lastMoveMs.current = now;
      const prev = prevLl.current;
      if (prev && Math.abs(prev.lat) > 1e-6 && Math.abs(location.lat) > 1e-6) {
        const d = haversineMeters(prev, location);
        if (d > 0 && d < 500) odomRef.current += d;
      }
      prevLl.current = location;
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
    finalizeSegment,
  ]);
}
