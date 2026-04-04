import { useState, useRef, useCallback, useEffect, useMemo, useLayoutEffect } from 'react';
import type { Coordinate, DrivingMode } from '../types';
import type { DirectionsResult, DirectionsStep, GeocodeResult } from '../lib/directions';
import { getMapboxRouteOptions, isMapboxDirectionsConfigured } from '../lib/directions';
import { getMapboxPublicToken } from '../lib/mapboxToken';

export type FetchDirectionsResult =
  | { ok: true }
  | { ok: false; reason: 'invalid_input' | 'no_mapbox' | 'route_failed'; message?: string };
import { distanceToPolyline, haversineMeters, remainingDistanceOnPolyline } from '../utils/distance';
import { speak, formatTurnInstruction, stopSpeaking, configureAudioSession } from '../utils/voice';
import { api } from '../api/client';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../contexts/AuthContext';
import { tripGemsFromDurationMinutes } from '../utils/tripGems';
import type { User } from '../types';

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
}

export function useNavigation(params: {
  userLocation: Coordinate;
  speed: number;
  heading: number;
  drivingMode: DrivingMode;
  /** When true, suppress turn-by-turn speech (user preference; persists in MapScreen). */
  voiceMuted?: boolean;
}) {
  const { userLocation, speed, heading, drivingMode, voiceMuted = false } = params;
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
  const [liveEta, setLiveEta] = useState<{ distanceMiles: number; etaMinutes: number } | null>(null);
  const [showRoutePreview, setShowRoutePreview] = useState(false);
  const [tripSummary, setTripSummary] = useState<TripSummary | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<GeocodeResult | null>(null);
  const [isRerouting, setIsRerouting] = useState(false);

  const isNavigatingRef = useRef(false);
  const traveledRef = useRef(0);
  const prevLocationRef = useRef<Coordinate | null>(null);
  const lastSpokenStepRef = useRef(-1);
  const tripStartTimeRef = useRef<number | null>(null);
  const offRouteSinceRef = useRef<number | null>(null);
  const rerouteInFlightRef = useRef(false);
  const lastRerouteAtRef = useRef(0);
  const navSessionStartRef = useRef<number>(0);

  // --- Fetch directions ---
  const fetchDirections = useCallback(async (
    destination: Coordinate & { name?: string; address?: string },
    origin?: Coordinate,
    opts?: { maxHeightMeters?: number },
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
      return { ok: false, reason: 'no_mapbox', message: 'Add EXPO_PUBLIC_MAPBOX_TOKEN to your environment and rebuild.' };
    }

    try {
      const options = await getMapboxRouteOptions(o, destination, { mode: drivingMode, maxHeightMeters: opts?.maxHeightMeters });
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

  // --- Route select (best/eco) ---
  const handleRouteSelect = useCallback((routeType: 'best' | 'eco') => {
    if (!availableRoutes.length || !navigationData) return;
    const taggedIdx = availableRoutes.findIndex((r) => r.routeType === routeType);
    const index = taggedIdx >= 0 ? taggedIdx : 0;
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
    setIsNavigating(true);
    isNavigatingRef.current = true;
    traveledRef.current = 0;
    setTraveledDistanceMeters(0);
    setCurrentStepIndex(0);
    lastSpokenStepRef.current = -1;
    tripStartTimeRef.current = Date.now();
    setShowRoutePreview(false);
    const dest = navigationData.destination.name ?? 'your destination';
    const etaMin = Math.round(navigationData.duration / 60);
    const firstStep = navigationData.steps?.[0];
    const firstInstr = firstStep?.instruction ? ` ${firstStep.instruction}.` : '';
    if (drivingMode === 'sport') {
      navSpeak(`${dest}. ${etaMin} minutes.${firstInstr}`, 'high', drivingMode);
    } else if (drivingMode === 'calm') {
      const etaStr = etaMin < 60 ? `about ${etaMin} minutes` : `about ${Math.floor(etaMin / 60)} hours`;
      navSpeak(`Navigating to ${dest}, ${etaStr} away.${firstInstr}`, 'high', drivingMode);
    } else {
      navSpeak(`Starting navigation to ${dest}. ${etaMin} minutes.${firstInstr}`, 'high', drivingMode);
    }
    // Skip duplicate step-0 cue from the step-change effect (already covered above).
    lastSpokenStepRef.current = 0;
  }, [navigationData, drivingMode, navSpeak]);

  const stopNavigation = useCallback(() => {
    const sessionAge = Date.now() - navSessionStartRef.current;
    if (sessionAge < 3000) {
      setIsNavigating(false);
      isNavigatingRef.current = false;
      stopSpeaking();
      setNavigationData(null);
      setAvailableRoutes([]);
      setLiveEta(null);
      setSelectedDestination(null);
      tripStartTimeRef.current = null;
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
      const remainMeters = remainingDistanceOnPolyline(userLocation, navigationData.polyline);
      const drivenMeters = Math.max(0, (navigationData.distance ?? 0) - remainMeters);
      polyMiles = drivenMeters / 1609.34;
    }
    const gpsMiles = traveledRef.current / 1609.34;
    // Credit the lower of route progress and GPS odometry (tiny slack for drift)
    const distMiles = Math.max(0, Math.min(polyMiles, gpsMiles + 0.03));
    const roundedDist = Math.max(0, Math.round(distMiles * 100) / 100);

    const originName = navigationData?.origin?.name ?? 'Start';
    const destName = navigationData?.destination?.name ?? 'End';
    const tripStartMs = tripStartTimeRef.current;

    setNavigationData(null);
    setAvailableRoutes([]);
    setLiveEta(null);
    setSelectedDestination(null);
    offRouteSinceRef.current = null;
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
      setTripSummary((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          gems_earned: Number(d?.gems_earned ?? prev.gems_earned),
          xp_earned: Number(d?.xp_earned ?? prev.xp_earned),
          safety_score: Number(d?.safety_score ?? prev.safety_score),
          counted: apiCounted,
        };
      });
      if (!apiCounted) return;
      applyTripCompleteProfileToUser(updateUserRef.current, d?.profile);
      await refreshUserFromServerRef.current();
      bumpStatsVersionRef.current();
    }).catch(() => { /* offline — summary already shown */ });
  }, [navigationData, drivingMode, userLocation, user?.isPremium, navSpeak]);

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

  const progressAlongRouteMeters = useMemo(() => {
    if (!isNavigating || !navigationData?.polyline?.length || navigationData.polyline.length < 2) {
      return traveledDistanceMeters;
    }
    const total = navigationData.distance ?? 0;
    if (total <= 0) return traveledDistanceMeters;
    const rem = remainingDistanceOnPolyline(userLocation, navigationData.polyline);
    const along = total - rem;
    return Math.max(0, Math.min(total, along));
  }, [isNavigating, navigationData?.polyline, navigationData?.distance, userLocation.lat, userLocation.lng, traveledDistanceMeters]);

  // --- Step index tracking ---
  useEffect(() => {
    if (!isNavigating || !navigationData?.steps?.length) return;
    let cumulative = 0;
    let nextIndex = 0;
    for (let i = 0; i < navigationData.steps.length; i++) {
      const stepDist = navigationData.steps[i].distanceMeters ?? 0;
      if (progressAlongRouteMeters < cumulative + stepDist) {
        nextIndex = i;
        break;
      }
      cumulative += stepDist;
      nextIndex = i + 1;
    }
    setCurrentStepIndex(Math.min(nextIndex, navigationData.steps.length - 1));
  }, [isNavigating, navigationData?.steps, progressAlongRouteMeters]);

  // --- Voice announcements on step change ---
  useEffect(() => {
    if (!isNavigating || !navigationData?.steps?.length) {
      if (!isNavigating) lastSpokenStepRef.current = -1;
      return;
    }
    const stepIndex = Math.min(currentStepIndex, navigationData.steps.length - 1);
    if (stepIndex < 0 || stepIndex === lastSpokenStepRef.current) return;
    lastSpokenStepRef.current = stepIndex;
    const step = navigationData.steps[stepIndex];
    if (!step?.instruction) return;
    const nextStep = navigationData.steps[stepIndex + 1] ?? null;
    const nextManeuver = navigationData.steps[stepIndex + 1];
    const liveDistToNext = nextManeuver && isFinite(nextManeuver.lat) && isFinite(nextManeuver.lng)
      ? haversineMeters(userLocation.lat, userLocation.lng, nextManeuver.lat, nextManeuver.lng)
      : step.distanceMeters;
    const phrase = formatTurnInstruction(
      step.instruction,
      liveDistToNext,
      step.maneuver,
      drivingMode,
      step.intersections,
      nextStep ? { maneuver: nextStep.maneuver, distanceMeters: nextStep.distanceMeters } : null,
    );
    if (!phrase) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navSpeak(phrase, 'normal', drivingMode);
  }, [isNavigating, navigationData?.steps, currentStepIndex, drivingMode, userLocation, navSpeak]);

  // --- Early turn warnings (500ft and 150ft before next step) ---
  const earlyWarningRef = useRef<{ stepIdx: number; spoke500: boolean; spoke150: boolean }>({ stepIdx: -1, spoke500: false, spoke150: false });
  useEffect(() => {
    if (!isNavigating || !navigationData?.steps?.length) return;
    const steps = navigationData.steps;
    const nextIdx = currentStepIndex + 1;
    if (nextIdx >= steps.length) return;

    if (earlyWarningRef.current.stepIdx !== nextIdx) {
      earlyWarningRef.current = { stepIdx: nextIdx, spoke500: false, spoke150: false };
    }
    const w = earlyWarningRef.current;
    const nextStep = steps[nextIdx];
    if (!nextStep?.instruction) return;
    if (!isFinite(nextStep.lat) || !isFinite(nextStep.lng)) return;

    const distToNext = haversineMeters(userLocation.lat, userLocation.lng, nextStep.lat, nextStep.lng);

    const FEET_500 = 152;
    const FEET_150 = 46;

    if (distToNext <= FEET_500 && distToNext > FEET_150 && !w.spoke500) {
      w.spoke500 = true;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      navSpeak(`In five hundred feet, ${nextStep.instruction}`, 'high', drivingMode);
    } else if (distToNext <= FEET_150 && !w.spoke150) {
      w.spoke150 = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navSpeak(nextStep.instruction, 'high', drivingMode);
    }
  }, [isNavigating, navigationData?.steps, currentStepIndex, drivingMode, userLocation, navSpeak]);

  // --- Arrival announcement ---
  const hasAnnouncedArrival = useRef(false);
  useEffect(() => {
    if (!isNavigating || !navigationData?.destination) {
      hasAnnouncedArrival.current = false;
      return;
    }
    const remaining = liveEta?.distanceMiles ?? 0;
    if (remaining > 0.05 || hasAnnouncedArrival.current) return;
    hasAnnouncedArrival.current = true;
    const dest = navigationData.destination.name ?? 'your destination';
    const arrivalMsg = drivingMode === 'calm'
      ? `You've arrived at ${dest}. Hope you had a nice drive.`
      : drivingMode === 'sport'
        ? `You've arrived at ${dest}.`
        : `You've arrived at ${dest}. Have a great day!`;
    navSpeak(arrivalMsg, 'high', drivingMode);
  }, [isNavigating, liveEta?.distanceMiles, navigationData?.destination, drivingMode, navSpeak]);

  // --- ETA from route-snapped remaining distance ---
  useEffect(() => {
    if (!isNavigating || !navigationData) return;
    const totalMeters = navigationData.distance;
    const durationSeconds = navigationData.duration;
    if (totalMeters <= 0 || durationSeconds <= 0) return;

    const polyline = navigationData.polyline;
    let remainingMeters: number;
    if (polyline && polyline.length >= 2) {
      remainingMeters = remainingDistanceOnPolyline(userLocation, polyline);
    } else {
      remainingMeters = Math.max(0, totalMeters - traveledDistanceMeters);
    }

    const remainingMiles = Math.max(0, remainingMeters / 1609.34);
    const fraction = Math.min(1, Math.max(0, remainingMeters / totalMeters));
    const etaMinutesLinear = (durationSeconds / 60) * fraction;
    const speedMph = Math.max(0, speed);
    const etaFromSpeed = speedMph > 3 ? (remainingMiles / speedMph) * 60 : etaMinutesLinear;
    const etaMinutes = speedMph > 3
      ? Math.max(0, Math.round(0.5 * etaMinutesLinear + 0.5 * etaFromSpeed))
      : Math.max(0, Math.round(etaMinutesLinear));
    setLiveEta({ distanceMiles: remainingMiles, etaMinutes });
  }, [isNavigating, navigationData?.distance, navigationData?.duration, navigationData?.polyline, userLocation.lat, userLocation.lng, speed, traveledDistanceMeters]);

  // --- Off-route detection + auto-reroute ---
  useEffect(() => {
    if (!isNavigating || !navigationData?.destination || !navigationData?.polyline?.length) {
      offRouteSinceRef.current = null;
      rerouteInFlightRef.current = false;
      return;
    }
    const speedMps = speed * 0.44704;
    const threshold = speedMps > 13 ? 85 : speedMps > 7 ? 70 : 58;
    const dist = distanceToPolyline(userLocation, navigationData.polyline);
    const offRoute = Number.isFinite(dist) && dist > threshold;

    if (!offRoute || speedMps < 1) {
      offRouteSinceRef.current = null;
      return;
    }
    const now = Date.now();
    if (offRouteSinceRef.current == null) {
      offRouteSinceRef.current = now;
      return;
    }
    const debounce = speedMps > 10 ? 1800 : 2200;
    if (now - offRouteSinceRef.current < debounce) return;
    if (rerouteInFlightRef.current) return;
    const cooldown = speedMps > 10 ? 7000 : 9000;
    if (now - lastRerouteAtRef.current < cooldown) return;

    rerouteInFlightRef.current = true;
    lastRerouteAtRef.current = now;
    setIsRerouting(true);
    const rerouteMsg = drivingMode === 'calm' ? 'Let me find you a new route.' : 'Rerouting.';
    navSpeak(rerouteMsg, 'high', drivingMode);

    const reroute = async () => {
      try {
        await Promise.race([
          fetchDirections(navigationData.destination, userLocation),
          new Promise<void>((resolve) => setTimeout(resolve, 8000)),
        ]);
      } finally {
        rerouteInFlightRef.current = false;
        offRouteSinceRef.current = null;
        setIsRerouting(false);
      }
    };
    reroute();
  }, [userLocation.lat, userLocation.lng, speed, isNavigating, navigationData?.destination, navigationData?.polyline, drivingMode, fetchDirections, navSpeak]);

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
          (leg.steps ?? []).map((s: any) => ({
            instruction: s.maneuver?.instruction ?? '',
            distance: `${(s.distance / 1609.34).toFixed(1)} mi`,
            distanceMeters: s.distance ?? 0,
            maneuver: s.maneuver?.type ?? 'turn',
            name: s.name ?? '',
            intersections: s.intersections,
            lanes: s.intersections?.[0]?.lanes,
          })),
        );
        traveledRef.current = 0;
        setTraveledDistanceMeters(0);
        setCurrentStepIndex(0);
        lastSpokenStepRef.current = -1;
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

  return {
    navigationData,
    isNavigating,
    isRerouting,
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
  };
}
