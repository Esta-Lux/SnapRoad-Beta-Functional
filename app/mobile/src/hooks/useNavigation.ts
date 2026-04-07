import { useState, useRef, useCallback, useEffect, useMemo, useLayoutEffect } from 'react';
import type { Coordinate, DrivingMode } from '../types';
import type { DirectionsResult, DirectionsStep, GeocodeResult } from '../lib/directions';
import { getMapboxRouteOptions, isMapboxDirectionsConfigured, mapboxManeuverToSimple } from '../lib/directions';
import { getMapboxPublicToken } from '../config/mapbox';

export type FetchDirectionsResult =
  | { ok: true }
  | { ok: false; reason: 'invalid_input' | 'no_mapbox' | 'route_failed'; message?: string };
import {
  bearingDeg,
  computeNavigationRouteProgress,
  currentStepIndexAlongRoute,
  haversineMeters,
  remainingDistanceOnPolyline,
  type NavigationRouteProgress,
} from '../utils/distance';
import { speak, stopSpeaking, configureAudioSession } from '../utils/voice';
import { primaryInstructionText, primaryVoiceAnnouncement } from '../lib/navigationInstructions';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { tripGemsFromDurationMinutes } from '../utils/tripGems';
import type { User } from '../types';
import {
  bucketAccuracyBand,
  bucketConfidence,
  bucketOffsetBand,
  bucketProgress,
  bucketSpeedBand,
  deviceOsBucket,
  trackNavigationQualityEvent,
  trackNavigationQualitySample,
} from '../utils/navigationQualityTelemetry';
import { useNavigationProgress } from './useNavigationProgress';
import { buildNavStepsFromDirections } from '../navigation/navStepsFromDirections';
import type { NavigationProgress } from '../navigation/navModel';
function applyTripCompleteProfileToUser(updateUser: (u: Partial<User>) => void, profile: unknown) {
  if (!profile || typeof profile !== 'object') return;
  const p = profile as Record<string, unknown>;
  const patch: Partial<User> = {};
  if (p.gems != null) patch.gems = Number(p.gems);
  if (p.level != null) patch.level = Number(p.level);
  if (p.total_trips != null) patch.totalTrips = Number(p.total_trips);
  if (p.total_miles != null) patch.totalMiles = Number(p.total_miles);
  if (p.xp != null) patch.xp = Number(p.xp);
  if (p.safety_score != null) patch.safetyScore = Number(p.safety_score);
  if (Object.keys(patch).length) updateUser(patch);
}

export interface NavigationData {
  origin: Coordinate & { name?: string };
  destination: Coordinate & { name?: string; address?: string };
  steps: DirectionsStep[];
  polyline: Coordinate[];
  duration: number;
  distance: number;
  durationText: string;
  distanceText: string;
  congestion?: import('../lib/directions').CongestionLevel[];
  maxspeeds?: (number | null)[];
}

export interface TripSummary {
  distance: number;
  /** Minutes */
  duration: number;
  safety_score: number;
  gems_earned: number;
  xp_earned: number;
  origin: string;
  destination: string;
  date: string;
  /** False = trip sheet still shows, but drive did not meet min distance/time for rewards. */
  counted?: boolean;
  /** Authoritative profile totals after /api/trips/complete (when returned). */
  profile_totals?: {
    total_miles?: number;
    total_trips?: number;
    gems?: number;
    xp?: number;
  };
}

export function useNavigation(params: {
  userLocation: Coordinate;
  speed: number;
  heading: number;
  gpsAccuracy?: number | null;
  drivingMode: DrivingMode;
  /** When true, suppress turn-by-turn speech (user preference; persists in MapScreen). */
  voiceMuted?: boolean;
}) {
  const { userLocation, speed, heading, gpsAccuracy = null, drivingMode, voiceMuted = false } = params;
  const voiceMutedRef = useRef(voiceMuted);
  useLayoutEffect(() => {
    voiceMutedRef.current = voiceMuted;
  }, [voiceMuted]);

  const navSpeak = useCallback(
    (phrase: string, priority: 'high' | 'normal' = 'normal', mode: DrivingMode = drivingMode) => {
      if (voiceMutedRef.current || !phrase.trim()) return;
      void configureAudioSession();
      speak(phrase, priority, mode);
    },
    [drivingMode],
  );
  const { user, updateUser, refreshUserFromServer, bumpStatsVersion } = useAuth();
  const updateUserRef = useRef(updateUser);
  const refreshUserFromServerRef = useRef(refreshUserFromServer);
  const bumpStatsVersionRef = useRef(bumpStatsVersion);
  useEffect(() => {
    updateUserRef.current = updateUser;
    refreshUserFromServerRef.current = refreshUserFromServer;
    bumpStatsVersionRef.current = bumpStatsVersion;
  }, [updateUser, refreshUserFromServer, bumpStatsVersion]);

  const [navigationData, setNavigationData] = useState<NavigationData | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [traveledDistanceMeters, setTraveledDistanceMeters] = useState(0);
  const [availableRoutes, setAvailableRoutes] = useState<DirectionsResult[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [showRoutePreview, setShowRoutePreview] = useState(false);
  const [tripSummary, setTripSummary] = useState<TripSummary | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<GeocodeResult | null>(null);
  const [isRerouting, setIsRerouting] = useState(false);
  const navQualityEmitRef = useRef<{ atMs: number; progressBucket: number }>({ atMs: 0, progressBucket: -1 });

  const isNavigatingRef = useRef(false);
  const traveledRef = useRef(0);
  const prevLocationRef = useRef<Coordinate | null>(null);
  const tripStartTimeRef = useRef<number | null>(null);
  const rerouteInFlightRef = useRef(false);
  const lastRerouteAtRef = useRef(0);
  const navSessionStartRef = useRef<number>(0);
  const hasAnnouncedArrivalRef = useRef(false);
  /** Prevents double auto-end when arrival conditions flicker on successive GPS ticks. */
  const autoEndNavTriggeredRef = useRef(false);
  /** Phase 1: consecutive ticks with `navigationProgress.isOffRoute` before reroute. */
  const offRouteStreakRef = useRef(0);

  const routePoints = useMemo(
    () =>
      navigationData?.polyline && navigationData.polyline.length >= 2
        ? navigationData.polyline.map((p) => ({ lat: p.lat, lng: p.lng }))
        : [],
    [navigationData?.polyline],
  );

  const navStepsBuilt = useMemo(
    () =>
      navigationData?.steps?.length && navigationData.polyline?.length
        ? buildNavStepsFromDirections(navigationData.steps, navigationData.polyline)
        : [],
    [navigationData?.steps, navigationData?.polyline],
  );

  const rawForNavigationProgress = useMemo(() => {
    if (!isNavigating || routePoints.length < 2) return null;
    return {
      lat: userLocation.lat,
      lng: userLocation.lng,
      heading,
      speedMps: speed * 0.44704,
      accuracy: gpsAccuracy,
      timestamp: Date.now(),
    };
  }, [isNavigating, routePoints.length, userLocation.lat, userLocation.lng, heading, speed, gpsAccuracy]);

  const navigationProgress: NavigationProgress | null = useNavigationProgress({
    rawLocation: rawForNavigationProgress,
    route: routePoints,
    steps: navStepsBuilt,
    routeDurationSeconds: navigationData?.duration ?? 0,
  });

  /** Single display fix for route progress, ETA, split, turn distances — from {@link navigationProgress}. */
  const navigationProgressCoord: Coordinate = useMemo(() => {
    if (isNavigating && navigationProgress?.displayCoord) {
      return {
        lat: navigationProgress.displayCoord.lat,
        lng: navigationProgress.displayCoord.lng,
      };
    }
    return userLocation;
  }, [isNavigating, navigationProgress, userLocation.lat, userLocation.lng]);

  const navigationDisplayHeading = useMemo(() => {
    if (isNavigating && navigationProgress?.displayCoord?.heading != null) {
      return navigationProgress.displayCoord.heading;
    }
    return heading;
  }, [isNavigating, navigationProgress, heading]);

  const liveEta = useMemo((): { distanceMiles: number; etaMinutes: number } | null => {
    if (!isNavigating || !navigationProgress) return null;
    return {
      distanceMiles: Math.max(0, navigationProgress.distanceRemainingMeters / 1609.34),
      etaMinutes: Math.max(1, Math.round(navigationProgress.durationRemainingSeconds / 60)),
    };
  }, [isNavigating, navigationProgress]);

  // --- Fetch directions ---
  const fetchDirections = useCallback(async (
    destination: Coordinate & { name?: string; address?: string },
    origin?: Coordinate,
    opts?: { maxHeightMeters?: number; fastSingleRoute?: boolean },
  ): Promise<FetchDirectionsResult> => {
    const o = origin ?? userLocation;
    const destOk =
      Number.isFinite(destination.lat) &&
      Number.isFinite(destination.lng) &&
      (Math.abs(destination.lat) > 1e-6 || Math.abs(destination.lng) > 1e-6);
    const originOk =
      Number.isFinite(o.lat) &&
      Number.isFinite(o.lng) &&
      (Math.abs(o.lat) > 1e-6 || Math.abs(o.lng) > 1e-6);
    if (!originOk || !destOk) {
      return { ok: false, reason: 'invalid_input', message: 'Invalid start or destination coordinates.' };
    }

    if (!isMapboxDirectionsConfigured()) {
      return {
        ok: false,
        reason: 'no_mapbox',
        message: 'Add EXPO_PUBLIC_MAPBOX_TOKEN (.env / EAS env) or rebuild so extra.mapboxPublicToken is set.',
      };
    }

    try {
      const options = await getMapboxRouteOptions(o, destination, {
        mode: drivingMode,
        maxHeightMeters: opts?.maxHeightMeters,
        fastSingleRoute: opts?.fastSingleRoute,
      });
      if (!options.length || !options[0].polyline.length) {
        return { ok: false, reason: 'route_failed', message: 'No route could be computed.' };
      }

      setAvailableRoutes(options);
      setSelectedRouteIndex(0);

      const first = options[0];
      const nav: NavigationData = {
        origin: { ...o, name: 'Current Location' },
        destination: { ...destination, name: destination.name ?? 'Destination' },
        steps: first.steps,
        polyline: first.polyline,
        duration: first.duration,
        distance: first.distance,
        durationText: first.durationText,
        distanceText: first.distanceText,
        congestion: first.congestion,
        maxspeeds: first.maxspeeds,
      };
      setNavigationData(nav);
      setCurrentStepIndex(0);

      if (isNavigatingRef.current) {
        traveledRef.current = 0;
        setTraveledDistanceMeters(0);
        hasAnnouncedArrivalRef.current = false;
        autoEndNavTriggeredRef.current = false;
        offRouteStreakRef.current = 0;
      } else {
        setShowRoutePreview(true);
      }
      return { ok: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not load directions.';
      console.warn('fetchDirections error:', e);
      return { ok: false, reason: 'route_failed', message: msg };
    }
  }, [userLocation, drivingMode]);

  const handleRouteSelect = useCallback((routeTypeOrIndex: 'best' | 'eco' | 'alt' | number) => {
    if (!availableRoutes.length || !navigationData) return;
    const index = typeof routeTypeOrIndex === 'number'
      ? Math.max(0, Math.min(routeTypeOrIndex, availableRoutes.length - 1))
      : Math.max(0, availableRoutes.findIndex((r) => r.routeType === routeTypeOrIndex));
    setSelectedRouteIndex(index);
    const r = availableRoutes[index];
    if (!r?.polyline?.length || !navigationData) return;
    setNavigationData({
      ...navigationData,
      steps: r.steps,
      polyline: r.polyline,
      duration: r.duration,
      distance: r.distance,
      durationText: r.durationText,
      distanceText: r.distanceText,
      congestion: r.congestion,
      maxspeeds: r.maxspeeds,
    });
  }, [availableRoutes, navigationData]);

  // --- Start / Stop navigation ---
  const startNavigation = useCallback(() => {
    if (!navigationData) return;
    configureAudioSession();
    stopSpeaking();
    navSessionStartRef.current = Date.now();
    lastRerouteAtRef.current = 0;
    setIsNavigating(true);
    isNavigatingRef.current = true;
    traveledRef.current = 0;
    setTraveledDistanceMeters(0);
    setCurrentStepIndex(0);
    hasAnnouncedArrivalRef.current = false;
    autoEndNavTriggeredRef.current = false;
    tripStartTimeRef.current = Date.now();
    setShowRoutePreview(false);
    offRouteStreakRef.current = 0;
    const dest = navigationData.destination.name ?? 'your destination';
    const etaMin = Math.round(navigationData.duration / 60);
    const firstStep = navigationData.steps?.[0];
    const firstCue = firstStep
      ? (primaryVoiceAnnouncement(firstStep) || primaryInstructionText(firstStep))
      : '';
    const firstInstr = firstCue ? ` ${firstCue.replace(/\s+$/, '')}${/[.!?]$/.test(firstCue) ? '' : '.'}` : '';
    if (drivingMode === 'sport') {
      navSpeak(`${dest}. ${etaMin} minutes.${firstInstr}`, 'high', drivingMode);
    } else if (drivingMode === 'calm') {
      const etaStr = etaMin < 60 ? `about ${etaMin} minutes` : `about ${Math.floor(etaMin / 60)} hours`;
      navSpeak(`Navigating to ${dest}, ${etaStr} away.${firstInstr}`, 'high', drivingMode);
    } else {
      navSpeak(`Starting navigation to ${dest}. ${etaMin} minutes.${firstInstr}`, 'high', drivingMode);
    }
  }, [navigationData, drivingMode, navSpeak]);

  const stopNavigation = useCallback(() => {
    const sessionAge = Date.now() - navSessionStartRef.current;
    if (sessionAge < 3000) {
      setIsNavigating(false);
      isNavigatingRef.current = false;
      stopSpeaking();
      setNavigationData(null);
      setAvailableRoutes([]);
      setSelectedDestination(null);
      tripStartTimeRef.current = null;
      hasAnnouncedArrivalRef.current = false;
      autoEndNavTriggeredRef.current = false;
      offRouteStreakRef.current = 0;
      rerouteInFlightRef.current = false;
      lastRerouteAtRef.current = 0;
      return;
    }
    setIsNavigating(false);
    isNavigatingRef.current = false;
    stopSpeaking();

    /** Must match backend /api/trips/complete gates (distance + duration + real GPS movement). */
    const MIN_QUALIFYING_MI = 0.15;
    const MIN_QUALIFYING_SEC = 45;
    /** ~200 m of actual GPS path — stops "start nav → instant end" from inflating polyline progress */
    const MIN_GPS_METERS = 200;

    const now = Date.now();
    const durationSec = tripStartTimeRef.current
      ? Math.round((now - tripStartTimeRef.current) / 1000)
      : 0;
    const durationMin = Math.max(0, Math.round(durationSec / 60));

    let polyMiles = 0;
    if (navigationData?.polyline && navigationData.polyline.length >= 2) {
      const remainMeters = remainingDistanceOnPolyline(navigationProgressCoord, navigationData.polyline);
      const drivenMeters = Math.max(0, (navigationData.distance ?? 0) - remainMeters);
      polyMiles = drivenMeters / 1609.34;
    }
    const gpsMiles = traveledRef.current / 1609.34;
    const totalRouteMi = (navigationData?.distance ?? 0) / 1609.34;
    // Use the better of polyline progress vs GPS odometry (min() under-credited real drives).
    const blendedMi = Math.max(polyMiles, gpsMiles);
    const distMiles =
      totalRouteMi > 0
        ? Math.max(0, Math.min(blendedMi, totalRouteMi + 0.12))
        : Math.max(0, blendedMi);
    const roundedDist = Math.max(0, Math.round(distMiles * 100) / 100);

    const originName = navigationData?.origin?.name ?? 'Start';
    const destName = navigationData?.destination?.name ?? 'End';
    const tripStartMs = tripStartTimeRef.current;

    setNavigationData(null);
    setAvailableRoutes([]);
    setSelectedDestination(null);
    offRouteStreakRef.current = 0;
    rerouteInFlightRef.current = false;
    tripStartTimeRef.current = null;

    const qualifies =
      traveledRef.current >= MIN_GPS_METERS
      && durationSec >= MIN_QUALIFYING_SEC
      && roundedDist >= MIN_QUALIFYING_MI;

    const summaryPayload: TripSummary = {
      distance: roundedDist,
      duration: Math.max(1, durationMin || 1),
      safety_score: 85,
      gems_earned: qualifies
        ? tripGemsFromDurationMinutes(Math.max(1, durationMin || 1), Boolean(user?.isPremium))
        : 0,
      xp_earned: qualifies ? 100 : 0,
      origin: originName,
      destination: destName,
      date: new Date().toLocaleDateString(),
      counted: qualifies,
    };

    queueMicrotask(() => setTripSummary(summaryPayload));

    if (!qualifies) {
      setTimeout(
        () =>
          navSpeak(
            'Trip summary saved. Drive at least about two tenths of a mile for forty seconds to earn gems next time.',
            'normal',
            drivingMode,
          ),
        400,
      );
      return;
    }

    setTimeout(() => navSpeak(`Trip ended. You drove ${roundedDist} miles.`, 'normal', drivingMode), 500);

    const startedAt = tripStartMs
      ? new Date(tripStartMs).toISOString()
      : new Date(now - durationSec * 1000).toISOString();

    api.post('/api/trips/complete', {
      distance_miles: roundedDist,
      duration_seconds: durationSec,
      safety_score: 85,
      started_at: startedAt,
      ended_at: new Date(now).toISOString(),
      hard_braking_events: 0,
      speeding_events: 0,
      incidents_reported: 0,
    }).then(async (res) => {
      if (!res.success || !res.data) return;
      const body = res.data as Record<string, unknown>;
      const d = (body?.data as Record<string, unknown> | undefined) ?? body;
      const apiCounted = d?.counted !== false && d?.trip_id != null;
      const profRaw = d?.profile as Record<string, unknown> | undefined;
      const profileSnap =
        profRaw && typeof profRaw === 'object'
          ? {
              total_miles:
                profRaw.total_miles != null ? Number(profRaw.total_miles) : undefined,
              total_trips:
                profRaw.total_trips != null ? Number(profRaw.total_trips) : undefined,
              gems: profRaw.gems != null ? Number(profRaw.gems) : undefined,
              xp: profRaw.xp != null ? Number(profRaw.xp) : undefined,
            }
          : undefined;

      setTripSummary((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          gems_earned: Number(d?.gems_earned ?? prev.gems_earned),
          xp_earned: Number(d?.xp_earned ?? prev.xp_earned),
          safety_score: Number(d?.safety_score ?? prev.safety_score),
          counted: apiCounted,
          profile_totals: profileSnap ?? prev.profile_totals,
        };
      });
      if (!apiCounted) return;
      applyTripCompleteProfileToUser(updateUserRef.current, d?.profile);
      await refreshUserFromServerRef.current();
      bumpStatsVersionRef.current();
    }).catch(() => { /* offline — summary already shown */ });
  }, [navigationData, drivingMode, navigationProgressCoord, user?.isPremium, navSpeak]);

  const dismissTripSummary = useCallback(() => setTripSummary(null), []);

  // --- Update position (called by MapScreen on each GPS tick) ---
  const updatePosition = useCallback((lat: number, lng: number) => {
    if (!isNavigatingRef.current || !navigationData) return;
    const prev = prevLocationRef.current;
    if (prev) {
      const dist = haversineMeters(prev.lat, prev.lng, lat, lng);
      if (dist > 0 && dist < 100) {
        traveledRef.current += dist;
        setTraveledDistanceMeters(traveledRef.current);
      }
    }
    prevLocationRef.current = { lat, lng };
  }, [navigationData]);

  /** Single projection + traveled/remaining: drives step index, ETA, voice, reroute, and route split in MapScreen. */
  const routeProgress = useMemo((): NavigationRouteProgress | null => {
    if (!isNavigating || !navigationData?.polyline || navigationData.polyline.length < 2) return null;
    return computeNavigationRouteProgress(
      navigationProgressCoord,
      navigationData.polyline,
      navigationData.distance ?? 0,
    );
  }, [isNavigating, navigationData?.polyline, navigationData?.distance, navigationProgressCoord.lat, navigationProgressCoord.lng]);

  /** Keep odometry in sync with monotonic route progress (GPS integration can lag in urban canyons). */
  useEffect(() => {
    if (!isNavigating || !routeProgress) return;
    const rt = routeProgress.traveledRouteMeters;
    if (rt > traveledRef.current) {
      traveledRef.current = rt;
      setTraveledDistanceMeters(rt);
    }
  }, [isNavigating, routeProgress?.traveledRouteMeters]);

  // --- Step index tracking (polyline-aligned; matches Mapbox geometry + turn cards) ---
  useEffect(() => {
    if (!isNavigating || !navigationData?.steps?.length || !navigationData.polyline?.length) {
      return;
    }
    const cumAlong =
      navigationProgress?.snapped?.cumulativeMeters ?? routeProgress?.cumFromStartMeters;
    if (cumAlong == null) return;
    const idx = currentStepIndexAlongRoute(
      navigationData.steps,
      cumAlong,
      navigationData.polyline,
    );
    setCurrentStepIndex(Math.min(idx, navigationData.steps.length - 1));
  }, [
    isNavigating,
    navigationData?.steps,
    navigationData?.polyline,
    navigationProgress?.snapped?.cumulativeMeters,
    routeProgress?.cumFromStartMeters,
  ]);

  // --- Arrival announcement ---
  useEffect(() => {
    if (!isNavigating || !navigationData?.destination) {
      hasAnnouncedArrivalRef.current = false;
      return;
    }
    if (hasAnnouncedArrivalRef.current) return;
    const dest = navigationData.destination;
    const rm = liveEta?.distanceMiles;
    const crow =
      Number.isFinite(dest.lat) && Number.isFinite(dest.lng)
        ? haversineMeters(navigationProgressCoord.lat, navigationProgressCoord.lng, dest.lat, dest.lng)
        : Number.POSITIVE_INFINITY;
    const near = (rm != null && rm <= 0.05) || crow <= 55;
    if (!near) return;
    hasAnnouncedArrivalRef.current = true;
    const destLabel = dest.name ?? 'your destination';
    const arrivalMsg = drivingMode === 'calm'
      ? `You've arrived at ${destLabel}. Hope you had a nice drive.`
      : drivingMode === 'sport'
        ? `You've arrived at ${destLabel}.`
        : `You've arrived at ${destLabel}. Have a great day!`;
    navSpeak(arrivalMsg, 'high', drivingMode);
  }, [
    isNavigating,
    liveEta?.distanceMiles,
    navigationData?.destination,
    navigationProgressCoord.lat,
    navigationProgressCoord.lng,
    drivingMode,
    navSpeak,
  ]);

  // --- Auto end at destination: arrival voice did not call stopNavigation before; users were stuck "navigating". ---
  useEffect(() => {
    if (!isNavigating || !navigationData?.destination) return;
    if (autoEndNavTriggeredRef.current) return;
    const dest = navigationData.destination;
    if (!Number.isFinite(dest.lat) || !Number.isFinite(dest.lng)) return;

    const crow = haversineMeters(navigationProgressCoord.lat, navigationProgressCoord.lng, dest.lat, dest.lng);
    const remainMi = liveEta?.distanceMiles;
    const withinRoute = remainMi != null && remainMi <= 0.1;
    const withinCrow = crow <= 55;
    if (!withinRoute && !withinCrow) return;

    const sessionAge = Date.now() - navSessionStartRef.current;
    if (sessionAge < 4000) return;

    autoEndNavTriggeredRef.current = true;
    queueMicrotask(() => {
      stopNavigation();
    });
  }, [
    isNavigating,
    navigationData?.destination?.lat,
    navigationData?.destination?.lng,
    navigationProgressCoord.lat,
    navigationProgressCoord.lng,
    liveEta?.distanceMiles,
    stopNavigation,
  ]);

  // --- Off-route detection + auto-reroute (Phase 1: 3 consecutive progress ticks isOffRoute) ---
  useEffect(() => {
    if (!isNavigating || !navigationData?.destination || !navigationData?.polyline?.length || !navigationProgress) {
      offRouteStreakRef.current = 0;
      return;
    }

    const speedMps = speed * 0.44704;
    if (speedMps < 0.85) {
      offRouteStreakRef.current = 0;
      return;
    }

    if (navigationProgress.isOffRoute) {
      offRouteStreakRef.current += 1;
    } else {
      offRouteStreakRef.current = 0;
    }

    if (offRouteStreakRef.current < 3) return;
    if (rerouteInFlightRef.current) return;

    const now = Date.now();
    const cooldownMs = lastRerouteAtRef.current ? 2600 : 0;
    if (cooldownMs > 0 && now - lastRerouteAtRef.current < cooldownMs) return;

    offRouteStreakRef.current = 0;
    rerouteInFlightRef.current = true;
    setIsRerouting(true);
    const rerouteMsg = drivingMode === 'calm' ? 'Let me find you a new route.' : 'Rerouting.';
    navSpeak(rerouteMsg, 'high', drivingMode);
    const offM = navigationProgress.snapped?.distanceMeters ?? routeProgress?.distanceToRouteMeters;
    trackNavigationQualityEvent({
      event: 'reroute',
      accuracyBand: bucketAccuracyBand(gpsAccuracy),
      offsetBand: bucketOffsetBand(Number.isFinite(offM as number) ? (offM as number) : 999),
      progressBucket: bucketProgress((routeProgress?.traveledRouteMeters ?? 0) / Math.max(1, navigationData?.distance ?? 1)),
      speedBand: bucketSpeedBand(speed),
      osBucket: deviceOsBucket(),
      qualityState: Number.isFinite(offM as number) && (offM as number) < 40 ? 'on_route' : 'off_route',
      snapped: Number.isFinite(offM as number) && (offM as number) < 35 ? 1 : 0,
      confidenceBucket: bucketConfidence(
        Math.max(0, Math.min(1, navigationProgress.confidence)),
      ),
    });

    const reroute = async () => {
      try {
        const dest = navigationData.destination;
        const timeout = new Promise<FetchDirectionsResult>((resolve) =>
          setTimeout(() => resolve({ ok: false, reason: 'route_failed', message: 'Reroute timed out.' }), 8000),
        );
        const res = await Promise.race([
          fetchDirections(dest, userLocation, { fastSingleRoute: true }),
          timeout,
        ]);
        if (res.ok) {
          lastRerouteAtRef.current = Date.now();
        }
      } finally {
        rerouteInFlightRef.current = false;
        setIsRerouting(false);
      }
    };
    reroute();
  }, [
    userLocation.lat,
    userLocation.lng,
    speed,
    gpsAccuracy,
    isNavigating,
    navigationData?.destination,
    navigationData?.polyline,
    navigationData?.distance,
    navigationProgress,
    routeProgress?.traveledRouteMeters,
    routeProgress?.distanceToRouteMeters,
    drivingMode,
    fetchDirections,
    navSpeak,
  ]);

  const addWaypoint = useCallback(async (waypoint: Coordinate & { name?: string }) => {
    if (!isNavigatingRef.current || !navigationData?.destination) return;
    navSpeak('Adding a stop. Rerouting.', 'high', drivingMode);
    setIsRerouting(true);
    try {
      const coords = `${userLocation.lng},${userLocation.lat};${waypoint.lng},${waypoint.lat};${navigationData.destination.lng},${navigationData.destination.lat}`;
      const token = getMapboxPublicToken();
      const res = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coords}?access_token=${encodeURIComponent(token)}&geometries=geojson&overview=full&steps=true&language=en&annotations=congestion,maxspeed,speed`,
      );
      const json = await res.json();
      const route = json?.routes?.[0];
      if (route?.geometry?.coordinates?.length) {
        const polyline = route.geometry.coordinates.map((c: number[]) => ({ lat: c[1], lng: c[0] }));
        const steps = (route.legs ?? []).flatMap((leg: any) =>
          (leg.steps ?? []).map((s: any) => {
            const g = s.geometry?.coordinates;
            const durSec = s.duration ?? 0;
            return {
              instruction: s.maneuver?.instruction ?? '',
              distance: `${(s.distance / 1609.34).toFixed(1)} mi`,
              distanceMeters: s.distance ?? 0,
              duration: durSec < 3600 ? `${Math.max(1, Math.round(durSec / 60))} min` : `${Math.floor(durSec / 3600)} hr ${Math.round((durSec % 3600) / 60)} min`,
              maneuver: mapboxManeuverToSimple(s.maneuver?.modifier, s.maneuver?.type),
              name: typeof s.name === 'string' ? s.name : '',
              lat: s.maneuver?.location?.[1] ?? 0,
              lng: s.maneuver?.location?.[0] ?? 0,
              geometryCoordinates: Array.isArray(g) && g.length >= 2 ? g : undefined,
              intersections: Array.isArray(s.intersections)
                ? s.intersections.map((int: unknown) => {
                    const intRec = int as { classes?: string[] };
                    return { classes: Array.isArray(intRec.classes) ? intRec.classes : [] };
                  })
                : undefined,
              bannerInstructions: s.bannerInstructions ?? s.banner_instructions ?? [],
              voiceInstructions: s.voiceInstructions ?? s.voice_instructions ?? [],
              lanes: s.intersections?.[0]?.lanes ? JSON.stringify(s.intersections[0].lanes) : undefined,
            };
          }),
        );
        traveledRef.current = 0;
        setTraveledDistanceMeters(0);
        setCurrentStepIndex(0);
        autoEndNavTriggeredRef.current = false;
        const totalDuration = route.duration ?? 0;
        const totalDistance = route.distance ?? 0;
        setNavigationData({
          ...navigationData,
          steps,
          polyline,
          duration: totalDuration,
          distance: totalDistance,
          durationText: totalDuration < 3600 ? `${Math.round(totalDuration / 60)} min` : `${Math.floor(totalDuration / 3600)}h ${Math.round((totalDuration % 3600) / 60)}min`,
          distanceText: `${(totalDistance / 1609.34).toFixed(1)} mi`,
        });
      }
    } catch (e) {
      console.warn('addWaypoint error:', e);
    } finally {
      setIsRerouting(false);
    }
  }, [navigationData, userLocation, drivingMode, navSpeak]);

  useEffect(() => {
    if (!isNavigating || !navigationData?.distance || !routeProgress) return;
    const totalDistance = Math.max(1, navigationData.distance);
    const progressBucket = bucketProgress(routeProgress.traveledRouteMeters / totalDistance);
    const now = Date.now();
    const prev = navQualityEmitRef.current;
    if (progressBucket === prev.progressBucket && now - prev.atMs < 25000) return;
    navQualityEmitRef.current = { atMs: now, progressBucket };
    const offM = routeProgress.distanceToRouteMeters;
    trackNavigationQualitySample({
      accuracyBand: bucketAccuracyBand(gpsAccuracy),
      offsetBand: bucketOffsetBand(Number.isFinite(offM) ? offM : 999),
      progressBucket,
      speedBand: bucketSpeedBand(speed),
      osBucket: deviceOsBucket(),
      qualityState: Number.isFinite(offM) && offM < 40 ? 'on_route' : 'off_route',
      snapped: Number.isFinite(offM) && offM < 35 ? 1 : 0,
      confidenceBucket: bucketConfidence(
        Math.max(0, Math.min(1, 1 - (Number.isFinite(offM) ? offM : 80) / 80)),
      ),
    });
  }, [
    gpsAccuracy,
    isNavigating,
    navigationData?.distance,
    routeProgress?.traveledRouteMeters,
    routeProgress?.distanceToRouteMeters,
    speed,
    navigationProgressCoord.lat,
    navigationProgressCoord.lng,
  ]);

  useEffect(() => {
    if (!isNavigating || !routeProgress) return;
    const speedMps = speed * 0.44704;
    const thresholdM =
      speedMps > 13 ? 76 + Math.min(14, speedMps * 0.35) : speedMps > 7 ? 60 + speedMps * 0.5 : 46;
    const dist = routeProgress.distanceToRouteMeters;
    const severe = Number.isFinite(dist) && (dist > thresholdM * 1.42 || dist > 112 || (speedMps > 12 && dist > 95));
    if (!severe) return;
    trackNavigationQualityEvent({
      event: 'severe_off_route',
      accuracyBand: bucketAccuracyBand(gpsAccuracy),
      offsetBand: bucketOffsetBand(Number.isFinite(dist) ? dist : 999),
      progressBucket: bucketProgress(routeProgress.traveledRouteMeters / Math.max(1, navigationData?.distance ?? 1)),
      speedBand: bucketSpeedBand(speed),
      osBucket: deviceOsBucket(),
      qualityState: Number.isFinite(dist) && dist < 40 ? 'on_route' : 'off_route',
      snapped: Number.isFinite(dist) && dist < 35 ? 1 : 0,
      confidenceBucket: bucketConfidence(
        Math.max(0, Math.min(1, 1 - (Number.isFinite(dist) ? dist : 80) / 80)),
      ),
    });
  }, [
    gpsAccuracy,
    isNavigating,
    navigationData?.distance,
    routeProgress,
    speed,
    navigationProgressCoord.lat,
    navigationProgressCoord.lng,
  ]);

  const navigationProgressSnapshot = useMemo(
    () => ({
      progressCoord: navigationProgressCoord,
      displayHeading: navigationDisplayHeading,
      liveEta,
      routeProgress,
      navigationProgress,
    }),
    [
      navigationProgressCoord.lat,
      navigationProgressCoord.lng,
      navigationDisplayHeading,
      liveEta?.distanceMiles,
      liveEta?.etaMinutes,
      routeProgress?.cumFromStartMeters,
      routeProgress?.remainingRouteMeters,
      navigationProgress,
    ],
  );

  return {
    navigationData,
    isNavigating,
    isRerouting,
    routeProgress,
    /** @deprecated Phase 1 — use `navigationProgress` for route split; kept null while navigating. */
    routeSplitForOverlay: null as null,
    currentStepIndex,
    traveledDistanceMeters,
    availableRoutes,
    selectedRouteIndex,
    liveEta,
    showRoutePreview,
    setShowRoutePreview,
    tripSummary,
    selectedDestination,
    setSelectedDestination,
    fetchDirections,
    handleRouteSelect,
    startNavigation,
    stopNavigation,
    dismissTripSummary,
    updatePosition,
    addWaypoint,
    /** Single navigation core: puck, split, ETA, turn — null when not navigating. */
    navigationProgress,
    /** @deprecated Use `navigationProgress` (displayCoord, snapped, confidence). */
    fusedNavState: navigationProgress,
    /** Authoritative map/ETA coordinate while navigating (smoothed toward route). */
    navigationProgressCoord,
    /** Heading aligned with fused display (turn with map during nav). */
    navigationDisplayHeading,
    /**
     * Single object for UI alignment: map puck, route split, ETA strip, turn/orion context.
     * Prefer this over raw GPS + separate `liveEta` when showing navigation truth.
     */
    navigationProgressSnapshot,
  };
}
