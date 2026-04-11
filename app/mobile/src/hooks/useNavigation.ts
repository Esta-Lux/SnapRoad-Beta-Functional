import { useState, useRef, useCallback, useEffect, useMemo, useLayoutEffect, useSyncExternalStore } from 'react';
import type { Coordinate, DrivingMode } from '../types';
import type {
  CongestionLevel,
  DirectionsResult,
  DirectionsStep,
  GeocodeResult,
  RawRoute,
} from '../lib/directions';
import {
  getMapboxRouteOptions,
  isMapboxDirectionsConfigured,
  parseMapboxDirectionsRoute,
} from '../lib/directions';
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
import { speak, stopSpeaking, configureAudioSessionForSpeechOutput } from '../utils/voice';
import { setNavigationGuidanceSuppressedUntil } from '../navigation/navigationGuidanceMemory';
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
import { offRouteTuningForMode } from '../navigation/offRouteTuning';
import { navEdgeEtaEnabled, navEtaBlendEnabled, navRefreshV2Enabled } from '../navigation/navFeatureFlags';
import {
  enterSdkGuidanceWaiting,
  getNavSdkState,
  getSdkMatchedCoordinate,
  getSdkNavigationProgress,
  getSdkWaitingNavigationProgress,
  resetNavSdkState,
  subscribeNavSdk,
} from '../navigation/navSdkStore';
import { setNavLogicSdkTripActive } from '../navigation/navVoiceGate';
import { logNavLogicSnapshot } from '../navigation/navLogicDebug';
import { routeSummaryFromMapboxMetersSeconds } from '../utils/routeDisplay';
import {
  DEFAULT_REFRESH_POLICY,
  decideTrafficRefresh,
  naiveRemainingSeconds,
  passesRefreshGates,
  pickRefreshCandidate,
  congestionRank,
  congestionWorsenedEdgeFraction,
  updateDriftSustained,
  updateMismatchSustained,
} from '../navigation/routeRefreshPolicy';
import { resolveEdgeDurationSec } from '../navigation/navigationEtaEdges';
import * as Haptics from 'expo-haptics';

/** Aligned voice + auto-end: "near destination" along remaining route (`navStepsFromDirections` maps `arrive`). */
const ARRIVAL_NEAR_ROUTE_MI = 0.08;
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
  edgeSpeedsKmh?: (number | null)[] | undefined;
  edgeDurationSec?: number[] | undefined;
  /** Live-updating destination (e.g. friend follow); suppresses gems / trip-complete API. */
  dynamicDestination?: boolean;
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
  /** Auto-ended at destination — show “You’ve arrived” hero in trip sheet. */
  arrivedAtDestination?: boolean;
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
  /** Live friend destination — marks routes as non-qualifying for gems. */
  dynamicDestinationFollow?: boolean;
  /**
   * When true (`EXPO_PUBLIC_NAV_LOGIC_SDK`), native Navigation SDK supplies progress, puck, and voice;
   * JS reroute/refresh and progress math are bypassed during `isNavigating`.
   */
  navSdkHeadless?: boolean;
}) {
  const {
    userLocation,
    speed,
    heading,
    gpsAccuracy = null,
    drivingMode,
    voiceMuted = false,
    dynamicDestinationFollow = false,
    navSdkHeadless = false,
  } = params;
  const voiceMutedRef = useRef(voiceMuted);
  useLayoutEffect(() => {
    voiceMutedRef.current = voiceMuted;
  }, [voiceMuted]);

  const navSdkHeadlessRef = useRef(navSdkHeadless);
  useLayoutEffect(() => {
    navSdkHeadlessRef.current = navSdkHeadless;
  }, [navSdkHeadless]);

  const navSpeak = useCallback(
    (phrase: string, priority: 'high' | 'normal' = 'normal', mode: DrivingMode = drivingMode) => {
      if (voiceMutedRef.current || !phrase.trim()) return;
      if (navSdkHeadlessRef.current && isNavigatingRef.current) return;
      speak(phrase, priority, mode, { rateSource: 'navigation_fixed' });
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
  const sdkActive = navSdkHeadless && isNavigating;
  const navSdkSnapshot = useSyncExternalStore(subscribeNavSdk, getNavSdkState, getNavSdkState);

  useEffect(() => {
    setNavLogicSdkTripActive(sdkActive);
    return () => setNavLogicSdkTripActive(false);
  }, [sdkActive]);

  useEffect(() => {
    logNavLogicSnapshot('mount');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot on mount
  }, []);
  const navQualityEmitRef = useRef<{ atMs: number; progressBucket: number }>({ atMs: 0, progressBucket: -1 });
  /** Congestion snapshot before a directions request (nav); used after fetch for compare telemetry. */
  const congestionBeforeDirectionsRef = useRef<CongestionLevel[] | null>(null);

  const isNavigatingRef = useRef(false);
  const traveledRef = useRef(0);
  const prevLocationRef = useRef<Coordinate | null>(null);
  /** Latest route progress (for trip-end distance; avoids stale useCallback closure). */
  const routeProgressRef = useRef<NavigationRouteProgress | null>(null);
  const tripStartTimeRef = useRef<number | null>(null);
  const rerouteInFlightRef = useRef(false);
  const lastRerouteAtRef = useRef(0);
  const navSessionStartRef = useRef<number>(0);
  const hasAnnouncedArrivalRef = useRef(false);
  /** Prevents double auto-end when arrival conditions flicker on successive GPS ticks. */
  const autoEndNavTriggeredRef = useRef(false);
  /** Set only when auto-end fires so trip summary can show arrival hero. */
  const autoEndFromArrivalRef = useRef(false);
  /** Consecutive ticks with `navigationProgress.isOffRoute` before reroute. */
  const offRouteStreakRef = useRef(0);
  /** Require consecutive arrival samples before auto-end (GPS flicker). */
  const arrivalNearStreakRef = useRef(0);

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

  const routeModelRefreshedAtRef = useRef(Date.now());
  const [routeModelRefreshKey, setRouteModelRefreshKey] = useState(0);

  const edgeDurationResolved = useMemo(() => {
    if (!navigationData?.polyline?.length || !navStepsBuilt.length) return null;
    return resolveEdgeDurationSec({
      polyline: navigationData.polyline,
      navSteps: navStepsBuilt,
      mapboxEdgeDurationSec: navigationData.edgeDurationSec,
    });
  }, [navigationData?.polyline, navigationData?.edgeDurationSec, navStepsBuilt]);

  const rawForNavigationProgress = useMemo(() => {
    if (!isNavigating || routePoints.length < 2 || sdkActive) return null;
    return {
      lat: userLocation.lat,
      lng: userLocation.lng,
      heading,
      speedMps: speed * 0.44704,
      accuracy: gpsAccuracy,
      timestamp: Date.now(),
    };
  }, [isNavigating, routePoints.length, sdkActive, userLocation.lat, userLocation.lng, heading, speed, gpsAccuracy]);

  const offRouteTuning = useMemo(() => offRouteTuningForMode(drivingMode), [drivingMode]);

  const jsNavigationProgress = useNavigationProgress({
    rawLocation: rawForNavigationProgress,
    route: sdkActive ? [] : routePoints,
    steps: navStepsBuilt,
    routeDurationSeconds: navigationData?.duration ?? 0,
    routeDistanceMeters: navigationData?.distance ?? 0,
    offRouteTuning,
    edgeDurationSec: edgeDurationResolved,
    routeModelTick: routeModelRefreshKey,
    routeModelRefreshedAtMs: routeModelRefreshedAtRef.current,
    navEdgeEtaEnabled: navEdgeEtaEnabled(),
    navEtaBlendEnabled: navEtaBlendEnabled(),
  });

  const sdkBuiltNavigationProgress = useMemo((): NavigationProgress | null => {
    if (!sdkActive || !navigationData) return null;
    const fromSdk = getSdkNavigationProgress(navigationData);
    if (fromSdk) return fromSdk;
    /** Do not fall back to JS Directions progress while native session is starting or between ticks. */
    if (navSdkSnapshot.sdkGuidancePhase === 'idle') return null;
    return getSdkWaitingNavigationProgress(navigationData);
  }, [sdkActive, navigationData, navSdkSnapshot]);

  const navigationProgress: NavigationProgress | null = sdkActive
    ? sdkBuiltNavigationProgress
    : jsNavigationProgress;

  const navigationProgressCoord: Coordinate = useMemo(() => {
    if (sdkActive) {
      const c = getSdkMatchedCoordinate();
      if (c) return c;
    }

    if (
      isNavigating &&
      !sdkActive &&
      navigationProgress?.snapped &&
      !navigationProgress.isOffRoute &&
      navigationProgress.snapped.distanceMeters < 45
    ) {
      const dc = navigationProgress.displayCoord;
      if (dc && Number.isFinite(dc.lat) && Number.isFinite(dc.lng)) {
        return { lat: dc.lat, lng: dc.lng };
      }
      return {
        lat: navigationProgress.snapped.point.lat,
        lng: navigationProgress.snapped.point.lng,
      };
    }

    return { lat: userLocation.lat, lng: userLocation.lng };
  }, [
    sdkActive,
    isNavigating,
    userLocation.lat,
    userLocation.lng,
    navSdkSnapshot.location,
    navigationProgress?.snapped?.point?.lat,
    navigationProgress?.snapped?.point?.lng,
    navigationProgress?.snapped?.distanceMeters,
    navigationProgress?.displayCoord?.lat,
    navigationProgress?.displayCoord?.lng,
    navigationProgress?.isOffRoute,
  ]);

  const navigationDisplayHeading = useMemo(() => {
    if (sdkActive && navSdkSnapshot.location && navSdkSnapshot.location.course >= 0) {
      return navSdkSnapshot.location.course;
    }
    return heading;
  }, [sdkActive, navSdkSnapshot.location, heading]);

  const liveEta = useMemo((): { distanceMiles: number; etaMinutes: number } | null => {
    if (!isNavigating) return null;
    if (navigationProgress) {
      return {
        distanceMiles: Math.max(0, navigationProgress.distanceRemainingMeters / 1609.34),
        etaMinutes: Math.max(0, navigationProgress.durationRemainingSeconds / 60),
      };
    }
    if (sdkActive && navigationData) {
      return {
        distanceMiles: Math.max(0, navigationData.distance / 1609.34),
        etaMinutes: Math.max(0, navigationData.duration / 60),
      };
    }
    return null;
  }, [
    isNavigating,
    navigationProgress?.distanceRemainingMeters,
    navigationProgress?.durationRemainingSeconds,
    sdkActive,
    navigationData?.distance,
    navigationData?.duration,
  ]);

  const navigationDataRef = useRef(navigationData);
  useEffect(() => {
    navigationDataRef.current = navigationData;
  }, [navigationData]);

  const navigationProgressRef = useRef(navigationProgress);
  useEffect(() => {
    navigationProgressRef.current = navigationProgress;
  }, [navigationProgress]);

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

    if (isNavigatingRef.current && navigationDataRef.current?.congestion?.length) {
      congestionBeforeDirectionsRef.current = [...navigationDataRef.current.congestion];
    } else {
      congestionBeforeDirectionsRef.current = null;
    }

    if (navSdkHeadlessRef.current && isNavigatingRef.current) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[Nav] fetchDirections skipped: Logic SDK owns routing during active navigation.');
      }
      return {
        ok: false,
        reason: 'route_failed',
        message: 'Route updates are handled by the Navigation SDK.',
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
      const preCongestion = congestionBeforeDirectionsRef.current;
      congestionBeforeDirectionsRef.current = null;

      const preserveDynamic =
        Boolean(dynamicDestinationFollow) ||
        (isNavigatingRef.current && Boolean(navigationDataRef.current?.dynamicDestination));

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
        edgeSpeedsKmh: first.edgeSpeedsKmh,
        edgeDurationSec: first.edgeDurationSec,
        ...(preserveDynamic ? { dynamicDestination: true } : {}),
      };

      if (
        isNavigatingRef.current &&
        preCongestion?.length &&
        first.congestion?.length
      ) {
        const pol = DEFAULT_REFRESH_POLICY;
        const worsenedFrac = congestionWorsenedEdgeFraction(
          preCongestion,
          first.congestion,
          0,
          pol.congestionJumpMinDelta,
        );
        const navp = navigationProgressRef.current;
        const navD = navigationDataRef.current;
        const offM = navp?.snapped?.distanceMeters ?? 999;
        const distRem = navp?.distanceRemainingMeters ?? 0;
        const totalD = Math.max(1, navD?.distance ?? 1);
        const traveled01 = Math.max(0, Math.min(1, (totalD - distRem) / totalD));
        trackNavigationQualityEvent(
          {
            event: 'navigation_congestion_compare',
            accuracyBand: bucketAccuracyBand(gpsAccuracy),
            offsetBand: bucketOffsetBand(Number.isFinite(offM) ? offM : 999),
            progressBucket: bucketProgress(traveled01),
            speedBand: bucketSpeedBand(speed),
            osBucket: deviceOsBucket(),
            qualityState: Number.isFinite(offM) && offM < 40 ? 'on_route' : 'off_route',
            snapped: Number.isFinite(offM) && offM < 35 ? 1 : 0,
            confidenceBucket: bucketConfidence(
              Math.max(0, Math.min(1, navp?.confidence ?? 0.5)),
            ),
          },
          { congestion_worsened_frac: worsenedFrac },
        );
      }

      setNavigationData(nav);
      routeModelRefreshedAtRef.current = Date.now();
      setRouteModelRefreshKey((k) => k + 1);
      setCurrentStepIndex(0);

      if (isNavigatingRef.current) {
        offRouteStreakRef.current = 0;
        if (!opts?.fastSingleRoute) {
          traveledRef.current = 0;
          setTraveledDistanceMeters(0);
          prevLocationRef.current = null;
          hasAnnouncedArrivalRef.current = false;
          autoEndNavTriggeredRef.current = false;
        }
      } else {
        setShowRoutePreview(true);
      }
      return { ok: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not load directions.';
      console.warn('fetchDirections error:', e);
      return { ok: false, reason: 'route_failed', message: msg };
    }
  }, [userLocation, drivingMode, gpsAccuracy, speed, dynamicDestinationFollow]);

  const fetchDirectionsRef = useRef(fetchDirections);
  useEffect(() => {
    fetchDirectionsRef.current = fetchDirections;
  }, [fetchDirections]);

  const speedMphNavRef = useRef(speed);
  const userLocNavRef = useRef(userLocation);
  const navDestRef = useRef(navigationData?.destination ?? null);
  useEffect(() => {
    speedMphNavRef.current = speed;
  }, [speed]);
  useEffect(() => {
    userLocNavRef.current = userLocation;
  }, [userLocation]);
  useEffect(() => {
    navDestRef.current = navigationData?.destination ?? null;
  }, [navigationData?.destination]);

  const lastTrafficRefreshAtRef = useRef(0);

  const navStepsBuiltRef = useRef(navStepsBuilt);
  useEffect(() => {
    navStepsBuiltRef.current = navStepsBuilt;
  }, [navStepsBuilt]);

  const currentStepIndexRef = useRef(currentStepIndex);
  useEffect(() => {
    currentStepIndexRef.current = currentStepIndex;
  }, [currentStepIndex]);

  const driftMsRef = useRef(0);
  const mismatchMsRef = useRef(0);
  const lastPolicyTickMsRef = useRef(Date.now());
  const lastDebouncedTrafficAttemptMsRef = useRef(0);
  const trafficRefreshHistoryRef = useRef<number[]>([]);

  /** Legacy: fixed ~3 min Mapbox refresh when policy v2 flag is off. */
  useEffect(() => {
    if (navRefreshV2Enabled()) return undefined;
    if (!isNavigating || !navigationData?.destination) return undefined;
    if (navSdkHeadless) return undefined;

    const INTERVAL_MS = 180_000;
    const MIN_BETWEEN_MS = 150_000;

    const id = setInterval(() => {
      if (!isNavigatingRef.current || rerouteInFlightRef.current) return;
      if (speedMphNavRef.current * 0.44704 < 1.5) return;
      const now = Date.now();
      if (now - lastTrafficRefreshAtRef.current < MIN_BETWEEN_MS) return;
      const dest = navDestRef.current;
      if (!dest || !Number.isFinite(dest.lat) || !Number.isFinite(dest.lng)) return;
      lastTrafficRefreshAtRef.current = now;
      void fetchDirectionsRef.current(dest, userLocNavRef.current, { fastSingleRoute: true });
    }, INTERVAL_MS);

    return () => clearInterval(id);
  }, [isNavigating, navigationData?.destination?.lat, navigationData?.destination?.lng, navSdkHeadless]);

  /** Policy-driven refresh: drift, long-step, model speed mismatch, staleness — capped + debounced. */
  useEffect(() => {
    if (!navRefreshV2Enabled()) return undefined;
    if (!isNavigating || !navigationData?.destination) return undefined;
    if (navSdkHeadless) return undefined;

    const pol = DEFAULT_REFRESH_POLICY;
    const id = setInterval(() => {
      if (!isNavigatingRef.current) return;
      const now = Date.now();
      const lastTick = lastPolicyTickMsRef.current;
      lastPolicyTickMsRef.current = now;

      const navp = navigationProgressRef.current;
      const navData = navigationDataRef.current;
      if (!navp?.snapped || !navData?.destination) return;

      const speedMps = speedMphNavRef.current * 0.44704;
      const gates = passesRefreshGates({
        speedMps,
        rerouteInFlight: rerouteInFlightRef.current,
        gpsAccuracyM: gpsAccuracy,
        navConfidence: navp.confidence,
        stallSpeedMps: pol.stallSpeedMps,
        poorGpsAccuracyM: pol.poorGpsAccuracyM,
        minNavConfidence: pol.minNavConfidence,
      });

      /** Match turn-card ETA when blend is on (see `navModel.durationRemainingSeconds`). */
      const policyRemainingSec = navEtaBlendEnabled()
        ? navp.durationRemainingSeconds
        : navp.modelDurationRemainingSeconds;
      const modelSec = navp.modelDurationRemainingSeconds;
      const distRem = navp.distanceRemainingMeters;
      const naive = naiveRemainingSeconds(distRem, speedMps, pol.vMinMps);
      const gap = Math.abs(policyRemainingSec - naive);
      driftMsRef.current = updateDriftSustained(
        driftMsRef.current,
        now,
        lastTick,
        gap,
        pol.driftGapSec,
      );

      const seg = navp.snapped.segmentIndex;
      const edgesKmh = navData.edgeSpeedsKmh;
      const cong = navData.congestion;
      let mismatchActive = false;
      if (edgesKmh?.length && cong?.length) {
        const ei = Math.min(seg, edgesKmh.length - 1, cong.length - 1);
        const expected = edgesKmh[ei];
        const userKmh = speedMps * 3.6;
        if (
          typeof expected === 'number'
          && Number.isFinite(expected)
          && expected >= 12
          && congestionRank(cong[ei]!) >= 2
        ) {
          mismatchActive = userKmh < expected * pol.modelSpeedMismatchRatio;
        }
      }
      mismatchMsRef.current = updateMismatchSustained(
        mismatchMsRef.current,
        now,
        lastTick,
        mismatchActive,
      );

      const idx = currentStepIndexRef.current;
      const built = navStepsBuiltRef.current;
      let currentStepLengthM = 0;
      if (built.length && idx < built.length) {
        const cur = built[idx]!;
        if (idx + 1 < built.length) {
          currentStepLengthM = built[idx + 1]!.distanceMetersFromStart - cur.distanceMetersFromStart;
        } else {
          currentStepLengthM = Math.max(0, (navData.distance ?? 0) - cur.distanceMetersFromStart);
        }
      }

      const candidate = pickRefreshCandidate({
        nowMs: now,
        lastRefreshAtMs: lastTrafficRefreshAtRef.current,
        periodicStaleMs: pol.periodicStaleMs,
        driftSustainMs: driftMsRef.current,
        driftSustainThresholdMs: pol.driftSustainMs,
        driftGapSec: pol.driftGapSec,
        modelRemainingSec: modelSec,
        distanceRemainingM: distRem,
        speedMps,
        vMinMps: pol.vMinMps,
        currentStepLengthM,
        nextStepDistanceMeters: navp.nextStepDistanceMeters,
        longStepMeters: pol.longStepMeters,
        timeToManeuverMaxMin: pol.timeToManeuverMaxMin,
        snapSegmentIndex: seg,
        congestionCurrent: cong,
        edgeSpeedsKmh: edgesKmh,
        edgeMismatchSustainMs: mismatchMsRef.current,
        modelSpeedMismatchSustainMs: pol.modelSpeedMismatchSustainMs,
        userSpeedKmh: speedMps * 3.6,
        modelSpeedMismatchRatio: pol.modelSpeedMismatchRatio,
        congestionStressMinFraction: pol.congestionStressMinFraction,
        congestionStressMinEdges: pol.congestionStressMinEdges,
        congestionStressMinRefreshAgeMs: pol.congestionStressMinRefreshAgeMs,
      });

      const decision = decideTrafficRefresh({
        nowMs: now,
        lastRefreshAtMs: lastTrafficRefreshAtRef.current,
        lastDebouncedAttemptMs: lastDebouncedTrafficAttemptMsRef.current,
        refreshHistoryMs: trafficRefreshHistoryRef.current,
        candidate,
        gates,
        minCooldownMs: pol.minCooldownMs,
        maxRefreshesPerHour: pol.maxRefreshesPerHour,
        debounceMs: pol.debounceMs,
      });

      const offM = navp.snapped?.distanceMeters ?? 999;
      const totalD = Math.max(1, navData.distance ?? 1);
      const traveled01 = Math.max(0, Math.min(1, (totalD - distRem) / totalD));

      if (decision.action === 'skip') {
        if (decision.reason !== 'no_candidate' && decision.reason !== 'debounced') {
          trackNavigationQualityEvent(
            {
              event: 'traffic_refresh_skipped',
              accuracyBand: bucketAccuracyBand(gpsAccuracy),
              offsetBand: bucketOffsetBand(Number.isFinite(offM) ? offM : 999),
              progressBucket: bucketProgress(traveled01),
              speedBand: bucketSpeedBand(speedMphNavRef.current),
              osBucket: deviceOsBucket(),
              qualityState: Number.isFinite(offM) && offM < 40 ? 'on_route' : 'off_route',
              snapped: Number.isFinite(offM) && offM < 35 ? 1 : 0,
              confidenceBucket: bucketConfidence(navp.confidence),
            },
            { skip_reason: decision.reason, drift_gap_sec: Math.round(gap) },
          );
        }
        return;
      }

      const dest = navDestRef.current;
      if (!dest || !Number.isFinite(dest.lat) || !Number.isFinite(dest.lng)) return;

      lastDebouncedTrafficAttemptMsRef.current = now;
      lastTrafficRefreshAtRef.current = now;
      trafficRefreshHistoryRef.current.push(now);
      const cutoff = now - 3600_000;
      trafficRefreshHistoryRef.current = trafficRefreshHistoryRef.current.filter((t) => t >= cutoff);

      trackNavigationQualityEvent(
        {
          event: 'traffic_refresh_requested',
          accuracyBand: bucketAccuracyBand(gpsAccuracy),
          offsetBand: bucketOffsetBand(Number.isFinite(offM) ? offM : 999),
          progressBucket: bucketProgress(traveled01),
          speedBand: bucketSpeedBand(speedMphNavRef.current),
          osBucket: deviceOsBucket(),
          qualityState: Number.isFinite(offM) && offM < 40 ? 'on_route' : 'off_route',
          snapped: Number.isFinite(offM) && offM < 35 ? 1 : 0,
          confidenceBucket: bucketConfidence(navp.confidence),
        },
        { refresh_trigger: decision.trigger, drift_gap_sec: Math.round(gap) },
      );

      void fetchDirectionsRef.current(dest, userLocNavRef.current, { fastSingleRoute: true });
    }, pol.policyEvalIntervalMs);

    return () => clearInterval(id);
  }, [isNavigating, navigationData?.destination?.lat, navigationData?.destination?.lng, gpsAccuracy, navSdkHeadless]);

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
      edgeSpeedsKmh: r.edgeSpeedsKmh,
      edgeDurationSec: r.edgeDurationSec,
    });
    routeModelRefreshedAtRef.current = Date.now();
    setRouteModelRefreshKey((k) => k + 1);
  }, [availableRoutes, navigationData]);

  /** Apply geometry + length/time from native Navigation SDK after `onRoutesLoaded` / reroute. */
  const applySdkRouteGeometry = useCallback(
    (polyline: Coordinate[], distanceMeters: number, durationSeconds: number) => {
      const sum = routeSummaryFromMapboxMetersSeconds(distanceMeters, durationSeconds);
      setNavigationData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          polyline,
          distance: distanceMeters,
          duration: durationSeconds,
          durationText: sum.durationText,
          distanceText: sum.distanceText,
        };
      });
      routeModelRefreshedAtRef.current = Date.now();
      setRouteModelRefreshKey((k) => k + 1);
    },
    [],
  );

  // --- Start / Stop navigation ---
  const startNavigation = useCallback(() => {
    if (!navigationData) return;
    void configureAudioSessionForSpeechOutput();
    stopSpeaking();
    navSessionStartRef.current = Date.now();
    lastRerouteAtRef.current = 0;
    setNavigationGuidanceSuppressedUntil(Date.now() + 8500);
    setIsNavigating(true);
    isNavigatingRef.current = true;
    traveledRef.current = 0;
    setTraveledDistanceMeters(0);
    prevLocationRef.current = null;
    setCurrentStepIndex(0);
    hasAnnouncedArrivalRef.current = false;
    autoEndNavTriggeredRef.current = false;
    tripStartTimeRef.current = Date.now();
    setShowRoutePreview(false);
    offRouteStreakRef.current = 0;
    arrivalNearStreakRef.current = 0;
    autoEndFromArrivalRef.current = false;
    if (navSdkHeadless) {
      resetNavSdkState();
      enterSdkGuidanceWaiting();
    }
    driftMsRef.current = 0;
    mismatchMsRef.current = 0;
    lastPolicyTickMsRef.current = Date.now();
    trafficRefreshHistoryRef.current = [];
    routeModelRefreshedAtRef.current = Date.now();
    setRouteModelRefreshKey((k) => k + 1);
    const dest = navigationData.destination.name ?? 'your destination';
    const etaMin = Math.round(navigationData.duration / 60);
    const firstStep = navigationData.steps?.[0];
    const firstCue = firstStep
      ? (primaryVoiceAnnouncement(firstStep) || primaryInstructionText(firstStep))
      : '';
    const firstInstr = firstCue ? ` ${firstCue.replace(/\s+$/, '')}${/[.!?]$/.test(firstCue) ? '' : '.'}` : '';
    if (!navSdkHeadless) {
      if (drivingMode === 'sport') {
        navSpeak(`${dest}. ${etaMin} minutes.${firstInstr}`, 'high', drivingMode);
      } else if (drivingMode === 'calm') {
        const etaStr = etaMin < 60 ? `about ${etaMin} minutes` : `about ${Math.floor(etaMin / 60)} hours`;
        navSpeak(`Navigating to ${dest}, ${etaStr} away.${firstInstr}`, 'high', drivingMode);
      } else {
        navSpeak(`Starting navigation to ${dest}. ${etaMin} minutes.${firstInstr}`, 'high', drivingMode);
      }
    }
  }, [navigationData, drivingMode, navSpeak, navSdkHeadless]);

  const stopNavigation = useCallback(() => {
    const sessionAge = Date.now() - navSessionStartRef.current;
    if (sessionAge < 3000) {
      resetNavSdkState();
      setIsNavigating(false);
      isNavigatingRef.current = false;
      stopSpeaking();
      setNavigationData(null);
      setAvailableRoutes([]);
      setSelectedDestination(null);
      tripStartTimeRef.current = null;
      prevLocationRef.current = null;
      hasAnnouncedArrivalRef.current = false;
      autoEndNavTriggeredRef.current = false;
      autoEndFromArrivalRef.current = false;
      arrivalNearStreakRef.current = 0;
      offRouteStreakRef.current = 0;
      rerouteInFlightRef.current = false;
      lastRerouteAtRef.current = 0;
      return;
    }
    resetNavSdkState();
    setIsNavigating(false);
    isNavigatingRef.current = false;
    stopSpeaking();

    /** Must match backend /api/trips/complete gates (distance + duration + real GPS movement). */
    const MIN_QUALIFYING_MI = 0.15;
    const MIN_QUALIFYING_SEC = 45;
    /** ~200 m of real movement (GPS + route projection) — stops instant-end inflation */
    const MIN_GPS_METERS = 200;

    const now = Date.now();
    const durationSec = tripStartTimeRef.current
      ? Math.round((now - tripStartTimeRef.current) / 1000)
      : 0;
    const durationMin = Math.max(0, Math.round(durationSec / 60));

    const routeTraveledM = routeProgressRef.current?.traveledRouteMeters ?? 0;
    const odoMeters = Math.max(traveledRef.current, routeTraveledM);

    let polyMiles = 0;
    if (navigationData?.polyline && navigationData.polyline.length >= 2) {
      const remainMeters = remainingDistanceOnPolyline(navigationProgressCoord, navigationData.polyline);
      const drivenMeters = Math.max(0, (navigationData.distance ?? 0) - remainMeters);
      polyMiles = drivenMeters / 1609.34;
    }
    const odoMiles = odoMeters / 1609.34;
    const totalRouteMi = (navigationData?.distance ?? 0) / 1609.34;
    const blendedMi = Math.max(polyMiles, odoMiles);
    const distMiles =
      totalRouteMi > 0
        ? Math.max(0, Math.min(blendedMi, totalRouteMi + 0.12))
        : Math.max(0, blendedMi);
    const roundedDist = Math.max(0, Math.round(distMiles * 100) / 100);

    const originName = navigationData?.origin?.name ?? 'Start';
    const destName = navigationData?.destination?.name ?? 'End';
    const tripStartMs = tripStartTimeRef.current;
    const dynamicDest = navigationData?.dynamicDestination === true;

    setNavigationData(null);
    setAvailableRoutes([]);
    setSelectedDestination(null);
    offRouteStreakRef.current = 0;
    rerouteInFlightRef.current = false;
    tripStartTimeRef.current = null;
    prevLocationRef.current = null;

    const qualifiesTrip =
      !dynamicDest
      && odoMeters >= MIN_GPS_METERS
      && durationSec >= MIN_QUALIFYING_SEC
      && roundedDist >= MIN_QUALIFYING_MI;

    const arrivedAtDestination = autoEndFromArrivalRef.current;
    autoEndFromArrivalRef.current = false;
    arrivalNearStreakRef.current = 0;

    const summaryPayload: TripSummary = {
      distance: roundedDist,
      duration: Math.max(1, durationMin || 1),
      safety_score: 85,
      gems_earned: qualifiesTrip
        ? tripGemsFromDurationMinutes(Math.max(1, durationMin || 1), Boolean(user?.isPremium))
        : 0,
      xp_earned: qualifiesTrip ? 100 : 0,
      origin: originName,
      destination: destName,
      date: new Date().toLocaleDateString(),
      counted: qualifiesTrip,
      arrivedAtDestination,
    };

    queueMicrotask(() => setTripSummary(summaryPayload));

    if (dynamicDest) {
      return;
    }

    if (!qualifiesTrip) {
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

  /** Leave route preview: clears directions overlay (distinct from starting or stopping active navigation). */
  const cancelRoutePreview = useCallback(() => {
    setShowRoutePreview(false);
    setNavigationData(null);
    setAvailableRoutes([]);
    setSelectedRouteIndex(0);
    setSelectedDestination(null);
  }, []);

  // --- Update position (called by MapScreen on each GPS tick) ---
  const updatePosition = useCallback((lat: number, lng: number) => {
    if (!isNavigatingRef.current || !navigationDataRef.current) return;
    const prev = prevLocationRef.current;
    if (prev) {
      const dist = haversineMeters(prev.lat, prev.lng, lat, lng);
      if (dist > 0 && dist < 500) {
        traveledRef.current += dist;
        setTraveledDistanceMeters(traveledRef.current);
      }
    }
    prevLocationRef.current = { lat, lng };
  }, []);

  /** Single projection + traveled/remaining: drives step index, ETA, voice, reroute, and route split in MapScreen. */
  const routeProgress = useMemo((): NavigationRouteProgress | null => {
    if (isNavigating && navSdkHeadless) return null;
    if (!isNavigating || !navigationData?.polyline || navigationData.polyline.length < 2) return null;
    return computeNavigationRouteProgress(
      navigationProgressCoord,
      navigationData.polyline,
      navigationData.distance ?? 0,
    );
  }, [
    isNavigating,
    navSdkHeadless,
    navigationData?.polyline,
    navigationData?.distance,
    navigationProgressCoord.lat,
    navigationProgressCoord.lng,
  ]);

  useEffect(() => {
    routeProgressRef.current = routeProgress;
  }, [routeProgress]);

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
    if (navSdkHeadless && navigationProgress?.instructionSource === 'sdk_waiting') {
      return;
    }
    if (navSdkHeadless && navigationProgress?.instructionSource === 'sdk' && navigationProgress.nextStep) {
      const si = navigationProgress.nextStep.index;
      setCurrentStepIndex(Math.min(Math.max(0, si), navigationData.steps.length - 1));
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
    navSdkHeadless,
    navigationProgress?.nextStep?.index,
  ]);

  // --- Arrival announcement ---
  useEffect(() => {
    if (!isNavigating || !navigationData?.destination) {
      hasAnnouncedArrivalRef.current = false;
      return;
    }
    if (navSdkHeadless) return;
    if (hasAnnouncedArrivalRef.current) return;
    if (navigationProgress?.nextStep?.kind !== 'arrive') return;
    const dest = navigationData.destination;
    const rm = liveEta?.distanceMiles;
    const crow =
      Number.isFinite(dest.lat) && Number.isFinite(dest.lng)
        ? haversineMeters(navigationProgressCoord.lat, navigationProgressCoord.lng, dest.lat, dest.lng)
        : Number.POSITIVE_INFINITY;
    const near = (rm != null && rm <= ARRIVAL_NEAR_ROUTE_MI) || crow <= 55;
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
    navigationProgress?.nextStep?.kind,
    navigationProgressCoord.lat,
    navigationProgressCoord.lng,
    drivingMode,
    navSpeak,
  ]);

  // --- Auto end at destination: arrival voice did not call stopNavigation before; users were stuck "navigating". ---
  useEffect(() => {
    if (navSdkHeadless) return;
    if (!isNavigating || !navigationData?.destination) return;
    if (autoEndNavTriggeredRef.current) return;
    if (navigationProgress?.nextStep?.kind !== 'arrive') {
      arrivalNearStreakRef.current = 0;
      return;
    }
    const speedMps = speed * 0.44704;
    if (speedMps >= 2.2) {
      arrivalNearStreakRef.current = 0;
      return;
    }
    const dest = navigationData.destination;
    if (!Number.isFinite(dest.lat) || !Number.isFinite(dest.lng)) return;

    const crow = haversineMeters(navigationProgressCoord.lat, navigationProgressCoord.lng, dest.lat, dest.lng);
    const remainMi = liveEta?.distanceMiles;
    const withinRoute = remainMi != null && remainMi <= ARRIVAL_NEAR_ROUTE_MI;
    const withinCrow = crow <= 55;
    if (!withinRoute && !withinCrow) {
      arrivalNearStreakRef.current = 0;
      return;
    }

    arrivalNearStreakRef.current += 1;
    if (arrivalNearStreakRef.current < 2) return;

    const sessionAge = Date.now() - navSessionStartRef.current;
    if (sessionAge < 4000) return;

    autoEndNavTriggeredRef.current = true;
    autoEndFromArrivalRef.current = true;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
    navigationProgress?.nextStep?.kind,
    speed,
    stopNavigation,
  ]);

  // --- Off-route detection + auto-reroute (`streakRequired` from mode tuning; sport=3, calm/adaptive=4) ---
  useEffect(() => {
    if (navSdkHeadless) {
      offRouteStreakRef.current = 0;
      return;
    }
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

    const streakNeeded = offRouteTuning.streakRequired;
    if (offRouteStreakRef.current < streakNeeded) return;
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
          const t = Date.now();
          lastRerouteAtRef.current = t;
          lastTrafficRefreshAtRef.current = t;
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
    offRouteTuning,
    navSdkHeadless,
  ]);

  const addWaypoint = useCallback(async (waypoint: Coordinate & { name?: string }) => {
    if (!isNavigatingRef.current || !navigationData?.destination) return;
    if (navSdkHeadless) {
      console.warn('addWaypoint: not supported while EXPO_PUBLIC_NAV_LOGIC_SDK trip is active');
      return;
    }
    navSpeak('Adding a stop. Rerouting.', 'high', drivingMode);
    setIsRerouting(true);
    try {
      const coords = `${userLocation.lng},${userLocation.lat};${waypoint.lng},${waypoint.lat};${navigationData.destination.lng},${navigationData.destination.lat}`;
      const token = getMapboxPublicToken();
      const res = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coords}?access_token=${encodeURIComponent(token)}&geometries=geojson&overview=full&steps=true&language=en&annotations=congestion,maxspeed,speed,duration`,
      );
      const json = await res.json();
      const route = json?.routes?.[0];
      if (route?.geometry?.coordinates?.length) {
        const dr = parseMapboxDirectionsRoute(route as RawRoute);
        traveledRef.current = 0;
        setTraveledDistanceMeters(0);
        prevLocationRef.current = null;
        setCurrentStepIndex(0);
        autoEndNavTriggeredRef.current = false;
        setNavigationData({
          ...navigationData,
          steps: dr.steps,
          polyline: dr.polyline,
          duration: dr.duration,
          distance: dr.distance,
          durationText: dr.durationText,
          distanceText: dr.distanceText,
          congestion: dr.congestion,
          maxspeeds: dr.maxspeeds,
          edgeSpeedsKmh: dr.edgeSpeedsKmh,
          edgeDurationSec: dr.edgeDurationSec,
        });
        routeModelRefreshedAtRef.current = Date.now();
        setRouteModelRefreshKey((k) => k + 1);
      }
    } catch (e) {
      console.warn('addWaypoint error:', e);
    } finally {
      setIsRerouting(false);
    }
  }, [navigationData, userLocation, drivingMode, navSpeak, navSdkHeadless]);

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
    if (navSdkHeadless) return;
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
    navSdkHeadless,
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
    cancelRoutePreview,
    tripSummary,
    selectedDestination,
    setSelectedDestination,
    fetchDirections,
    handleRouteSelect,
    applySdkRouteGeometry,
    startNavigation,
    stopNavigation,
    dismissTripSummary,
    updatePosition,
    addWaypoint,
    /** Single navigation core: puck, split, ETA, turn — null when not navigating. */
    navigationProgress,
    /** Same as {@link navigationProgress} — kept for callers expecting `fusedNavState`. */
    fusedNavState: navigationProgress,
    /** Raw GPS while navigating (matches native puck / route progress). */
    navigationProgressCoord,
    /** Device heading (matches native course/heading follow). */
    navigationDisplayHeading,
    /**
     * Single object for UI alignment: map puck, route split, ETA strip, turn/orion context.
     * Prefer this over raw GPS + separate `liveEta` when showing navigation truth.
     */
    navigationProgressSnapshot,
    /** Headless SDK diagnostics (Expo env + native ingest). Dev HUD only. */
    sdkNavDiag: navSdkHeadless
      ? {
          lastProgressIngestAtMs: navSdkSnapshot.lastProgressIngestAtMs,
          lastVoiceInstructionText: navSdkSnapshot.lastVoiceInstructionText,
          lastNavVoiceSource: navSdkSnapshot.lastNavVoiceSource,
          sdkGuidancePhase: navSdkSnapshot.sdkGuidancePhase,
          telemetry: navSdkSnapshot.telemetry,
        }
      : null,
    /** Native matched location for map puck (`CustomLocationProvider`) — null when not in logic SDK mode. */
    sdkNavLocation: navSdkHeadless ? navSdkSnapshot.location : null,
  };
}
