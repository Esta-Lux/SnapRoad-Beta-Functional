import { useState, useRef, useCallback, useEffect, useMemo, useLayoutEffect } from 'react';
import type { Coordinate, DrivingMode } from '../types';
import type { DirectionsResult, DirectionsStep, GeocodeResult } from '../lib/directions';
import { getMapboxRouteOptions, isMapboxDirectionsConfigured, mapboxManeuverToSimple } from '../lib/directions';
import { getMapboxPublicToken } from '../config/mapbox';

export type FetchDirectionsResult =
  | { ok: true }
  | { ok: false; reason: 'invalid_input' | 'no_mapbox' | 'route_failed'; message?: string };
import {
  alongRouteDistanceMeters,
  bearingDeg,
  computeNavigationRouteProgress,
  haversineMeters,
  remainingDistanceOnPolyline,
  segmentAndTFromCumAlongPolyline,
  type NavigationRouteProgress,
  type RouteSplitForOverlay,
} from '../utils/distance';
import { speak, formatTurnInstruction, stopSpeaking, configureAudioSession } from '../utils/voice';
import { primaryInstructionText, primaryVoiceAnnouncement } from '../lib/navigationInstructions';
import { api } from '../api/client';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../contexts/AuthContext';
import { tripGemsFromDurationMinutes } from '../utils/tripGems';
import type { User } from '../types';

function navRoutePolylineId(poly: Coordinate[]): string {
  if (poly.length < 2) return '';
  const a = poly[0]!;
  const b = poly[poly.length - 1]!;
  return `${poly.length}:${a.lat.toFixed(6)}:${a.lng.toFixed(6)}:${b.lat.toFixed(6)}:${b.lng.toFixed(6)}`;
}

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
  const hasAnnouncedArrivalRef = useRef(false);
  /** Prevents double auto-end when arrival conditions flicker on successive GPS ticks. */
  const autoEndNavTriggeredRef = useRef(false);
  const liveEtaSmoothRef = useRef<number | null>(null);
  const earlyWarningRef = useRef<{ stepIdx: number; spoke500: boolean; spoke150: boolean }>({
    stepIdx: -1,
    spoke500: false,
    spoke150: false,
  });

  /** Monotonic cumulative progress for route overlay; reset per polyline id (true reroute). */
  const routeSplitCumRef = useRef<{ routeKey: string; maxCum: number }>({ routeKey: '', maxCum: 0 });

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
      return {
        ok: false,
        reason: 'no_mapbox',
        message: 'Add EXPO_PUBLIC_MAPBOX_TOKEN (.env / EAS env) or rebuild so extra.mapboxPublicToken is set.',
      };
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
        lastSpokenStepRef.current = -1;
        hasAnnouncedArrivalRef.current = false;
        autoEndNavTriggeredRef.current = false;
        liveEtaSmoothRef.current = null;
        earlyWarningRef.current = { stepIdx: -1, spoke500: false, spoke150: false };
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
    lastSpokenStepRef.current = -1;
    hasAnnouncedArrivalRef.current = false;
    autoEndNavTriggeredRef.current = false;
    liveEtaSmoothRef.current = null;
    earlyWarningRef.current = { stepIdx: -1, spoke500: false, spoke150: false };
    tripStartTimeRef.current = Date.now();
    setShowRoutePreview(false);
    routeSplitCumRef.current = { routeKey: '', maxCum: 0 };
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
    /** Match route-preview stats on first frame (polyline projection can_clip the first segment). */
    const initialMiles = navigationData.distance / 1609.34;
    liveEtaSmoothRef.current = etaMin;
    setLiveEta({ distanceMiles: Math.max(0, initialMiles), etaMinutes: etaMin });
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
      hasAnnouncedArrivalRef.current = false;
      autoEndNavTriggeredRef.current = false;
      liveEtaSmoothRef.current = null;
      earlyWarningRef.current = { stepIdx: -1, spoke500: false, spoke150: false };
      offRouteSinceRef.current = null;
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
      const remainMeters = remainingDistanceOnPolyline(userLocation, navigationData.polyline);
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

  /** Single projection + traveled/remaining: drives step index, ETA, voice, reroute, and route split in MapScreen. */
  const routeProgress = useMemo((): NavigationRouteProgress | null => {
    if (!isNavigating || !navigationData?.polyline || navigationData.polyline.length < 2) return null;
    return computeNavigationRouteProgress(
      userLocation,
      navigationData.polyline,
      navigationData.distance ?? 0,
    );
  }, [isNavigating, navigationData?.polyline, navigationData?.distance, userLocation.lat, userLocation.lng]);

  /** Keep odometry in sync with monotonic route progress (GPS integration can lag in urban canyons). */
  useEffect(() => {
    if (!isNavigating || !routeProgress) return;
    const rt = routeProgress.traveledRouteMeters;
    if (rt > traveledRef.current) {
      traveledRef.current = rt;
      setTraveledDistanceMeters(rt);
    }
  }, [isNavigating, routeProgress?.traveledRouteMeters]);

  const progressAlongRouteMeters =
    isNavigating && routeProgress
      ? routeProgress.traveledRouteMeters
      : traveledDistanceMeters;

  /** Synchronous route split — computed in the same render as routeProgress so the
   *  passed/ahead boundary never lags behind the native location puck. */
  const routeSplitForOverlay = useMemo((): RouteSplitForOverlay | null => {
    if (!isNavigating) {
      routeSplitCumRef.current = { routeKey: '', maxCum: 0 };
      return null;
    }
    if (!routeProgress || !navigationData?.polyline?.length) return null;
    const poly = navigationData.polyline;
    if (poly.length < 2) return null;

    const key = navRoutePolylineId(poly);
    const ref = routeSplitCumRef.current;
    if (key !== ref.routeKey) {
      routeSplitCumRef.current = { routeKey: key, maxCum: 0 };
    }
    const cur = routeSplitCumRef.current;
    cur.maxCum = Math.max(cur.maxCum, routeProgress.cumFromStartMeters);

    return segmentAndTFromCumAlongPolyline(cur.maxCum, poly) ?? null;
  }, [isNavigating, routeProgress, navigationData?.polyline]);

  /** Route-snapped coordinate for the navigation puck (null when off-route or not navigating). */
  const MAX_SNAP_DISTANCE = 40;
  const navDisplayCoord = useMemo((): Coordinate | null => {
    if (!isNavigating || !routeProgress) return null;
    if (routeProgress.distanceToRouteMeters > MAX_SNAP_DISTANCE) return null;
    return routeProgress.snapCoord;
  }, [isNavigating, routeProgress]);

  const navHeadingRef = useRef(0);
  const navDisplayHeading = useMemo((): number => {
    if (!navDisplayCoord || !routeProgress || !navigationData?.polyline) return navHeadingRef.current;
    const poly = navigationData.polyline;
    const idx = routeProgress.segmentIndex;
    if (idx >= poly.length - 1) return navHeadingRef.current;
    const target = bearingDeg(poly[idx], poly[idx + 1]);
    const prev = navHeadingRef.current;
    const delta = ((target - prev + 540) % 360) - 180;
    const smoothed = (prev + delta * 0.45 + 360) % 360;
    navHeadingRef.current = smoothed;
    return smoothed;
  }, [navDisplayCoord, routeProgress, navigationData?.polyline]);

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
    const voiceCue = primaryVoiceAnnouncement(step).trim();
    const instructText = primaryInstructionText(step).trim();
    if (!voiceCue && !instructText) return;

    const followingStep = navigationData.steps[stepIndex + 1] ?? null;
    const liveDistToThisManeuver =
      isFinite(step.lat) && isFinite(step.lng)
        ? haversineMeters(userLocation.lat, userLocation.lng, step.lat, step.lng)
        : (step.distanceMeters ?? 400);

    const phrase = voiceCue
      ? voiceCue
      : formatTurnInstruction(
          instructText,
          liveDistToThisManeuver,
          step.maneuver,
          drivingMode,
          step.intersections,
          followingStep ? { maneuver: followingStep.maneuver, distanceMeters: followingStep.distanceMeters } : null,
        );
    if (!phrase) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navSpeak(phrase, 'normal', drivingMode);
  }, [isNavigating, navigationData?.steps, currentStepIndex, drivingMode, userLocation, navSpeak]);

  // --- Early turn warnings (500ft and 150ft before next step) ---
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
    const nextBanner = nextStep ? primaryInstructionText(nextStep).trim() : '';
    const nextVoice = nextStep ? primaryVoiceAnnouncement(nextStep).trim() : '';
    if (!nextBanner && !nextVoice) return;
    if (!isFinite(nextStep.lat) || !isFinite(nextStep.lng)) return;

    const poly = navigationData.polyline;
    const distToNext =
      poly && poly.length >= 2
        ? alongRouteDistanceMeters(poly, userLocation, { lat: nextStep.lat, lng: nextStep.lng })
        : haversineMeters(userLocation.lat, userLocation.lng, nextStep.lat, nextStep.lng);

    const FEET_500 = 152;
    const FEET_150 = 46;

    if (distToNext <= FEET_500 && distToNext > FEET_150 && !w.spoke500 && nextBanner) {
      w.spoke500 = true;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      navSpeak(`In five hundred feet, ${nextBanner}`, 'high', drivingMode);
    } else if (distToNext <= FEET_150 && !w.spoke150) {
      w.spoke150 = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const nowCue = nextVoice || nextBanner;
      if (nowCue) navSpeak(nowCue, 'high', drivingMode);
    }
  }, [isNavigating, navigationData?.steps, currentStepIndex, drivingMode, userLocation, navSpeak]);

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
        ? haversineMeters(userLocation.lat, userLocation.lng, dest.lat, dest.lng)
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
    userLocation.lat,
    userLocation.lng,
    drivingMode,
    navSpeak,
  ]);

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

    const sessionAgeMs = Date.now() - navSessionStartRef.current;
    /** Early GPS often projects onto the first leg, understating distance vs route preview. */
    if (sessionAgeMs < 30000 && remainingMeters < totalMeters * 0.9) {
      remainingMeters = Math.max(remainingMeters, totalMeters * 0.965);
    }

    const remainingMiles = Math.max(0, remainingMeters / 1609.34);
    const fraction = Math.min(1, Math.max(0, remainingMeters / totalMeters));
    /** Route-duration progress is primary; blend a little live speed only at highway-ish speeds. */
    const etaMinutesLinear = (durationSeconds / 60) * fraction;
    const speedMph = Math.max(0, speed);
    const etaFromSpeed = speedMph > 3 ? (remainingMiles / speedMph) * 60 : etaMinutesLinear;
    let speedBlend =
      speedMph >= 28 && remainingMiles > 0.35 ? 0.14 : speedMph >= 18 && remainingMiles > 0.2 ? 0.08 : 0;
    if (sessionAgeMs < 25000) {
      speedBlend = Math.min(speedBlend, 0.04);
    }
    let etaRaw =
      etaMinutesLinear * (1 - speedBlend) + Math.min(etaFromSpeed, etaMinutesLinear * 2.2) * speedBlend;
    etaRaw = Math.max(0, etaRaw);

    const prev = liveEtaSmoothRef.current;
    const dampedMinutes =
      prev != null && Number.isFinite(prev)
        ? prev + Math.max(-2.8, Math.min(2.8, etaRaw - prev))
        : etaRaw;
    const clamped = Math.max(0, dampedMinutes);
    liveEtaSmoothRef.current = clamped;
    const etaMinutes = Math.max(0, Math.round(clamped));

    setLiveEta({ distanceMiles: remainingMiles, etaMinutes });
  }, [
    isNavigating,
    navigationData?.distance,
    navigationData?.duration,
    navigationData?.polyline,
    routeProgress?.remainingRouteMeters,
    userLocation.lat,
    userLocation.lng,
    speed,
    traveledDistanceMeters,
  ]);

  // --- Auto end at destination: arrival voice did not call stopNavigation before; users were stuck "navigating". ---
  useEffect(() => {
    if (!isNavigating || !navigationData?.destination) return;
    if (autoEndNavTriggeredRef.current) return;
    const dest = navigationData.destination;
    if (!Number.isFinite(dest.lat) || !Number.isFinite(dest.lng)) return;

    const crow = haversineMeters(userLocation.lat, userLocation.lng, dest.lat, dest.lng);
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
    userLocation.lat,
    userLocation.lng,
    liveEta?.distanceMiles,
    stopNavigation,
  ]);

  // --- Off-route detection + auto-reroute ---
  useEffect(() => {
    if (!isNavigating || !navigationData?.destination || !navigationData?.polyline?.length) {
      offRouteSinceRef.current = null;
      rerouteInFlightRef.current = false;
      return;
    }
    const speedMps = speed * 0.44704;
    /** Corridor width: tighter at low speed (urban), wider at highway speed to tolerate GPS drift. */
    const thresholdM =
      speedMps > 13 ? 76 + Math.min(14, speedMps * 0.35) : speedMps > 7 ? 60 + speedMps * 0.5 : 46;
    const dist = routeProgress?.distanceToRouteMeters ?? Number.POSITIVE_INFINITY;
    const offRoute = Number.isFinite(dist) && dist > thresholdM;
    /** Clear miss: far enough off the line that we should not wait on long debounce. */
    const severeOffRoute =
      Number.isFinite(dist) && (dist > thresholdM * 1.42 || dist > 112 || (speedMps > 12 && dist > 95));

    if (!offRoute || speedMps < 0.85) {
      offRouteSinceRef.current = null;
      return;
    }
    const now = Date.now();
    if (offRouteSinceRef.current == null) {
      offRouteSinceRef.current = now;
      return;
    }
    const elapsed = now - offRouteSinceRef.current;
    const debounceMs = severeOffRoute ? 2400 : speedMps > 10 ? 4800 : 5200;
    if (elapsed < debounceMs) return;
    if (rerouteInFlightRef.current) return;
    const cooldownMs = lastRerouteAtRef.current ? (severeOffRoute ? 3200 : 5500) : 0;
    if (cooldownMs > 0 && now - lastRerouteAtRef.current < cooldownMs) return;

    rerouteInFlightRef.current = true;
    setIsRerouting(true);
    const rerouteMsg = drivingMode === 'calm' ? 'Let me find you a new route.' : 'Rerouting.';
    navSpeak(rerouteMsg, 'high', drivingMode);

    const reroute = async () => {
      try {
        const dest = navigationData.destination;
        const res = await fetchDirections(dest, userLocation);
        if (res.ok) {
          lastRerouteAtRef.current = Date.now();
        }
      } finally {
        rerouteInFlightRef.current = false;
        offRouteSinceRef.current = null;
        setIsRerouting(false);
      }
    };
    reroute();
  }, [
    userLocation.lat,
    userLocation.lng,
    speed,
    isNavigating,
    navigationData?.destination,
    navigationData?.polyline,
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
        lastSpokenStepRef.current = -1;
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

  return {
    navigationData,
    isNavigating,
    isRerouting,
    routeProgress,
    routeSplitForOverlay,
    navDisplayCoord,
    navDisplayHeading,
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
