import { useState, useRef, useCallback, useEffect } from 'react';
import type { Coordinate, DrivingMode } from '../types';
import type { DirectionsResult, DirectionsStep, GeocodeResult } from '../lib/directions';
import { getMapboxRouteOptions } from '../lib/directions';
import { distanceToPolyline, haversineMeters } from '../utils/distance';
import { speak, formatTurnInstruction, stopSpeaking } from '../utils/voice';

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
  duration: number;
  safety_score: number;
  gems_earned: number;
  xp_earned: number;
  origin: string;
  destination: string;
  date: string;
}

export function useNavigation(params: {
  userLocation: Coordinate;
  speed: number;
  heading: number;
  drivingMode: DrivingMode;
}) {
  const { userLocation, speed, heading, drivingMode } = params;

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

  // --- Fetch directions ---
  const fetchDirections = useCallback(async (
    destination: Coordinate & { name?: string; address?: string },
    origin?: Coordinate,
    opts?: { maxHeightMeters?: number },
  ) => {
    const o = origin ?? userLocation;
    if (!Number.isFinite(o.lat) || !Number.isFinite(destination.lat)) return;

    try {
      const options = await getMapboxRouteOptions(o, destination, { mode: drivingMode, maxHeightMeters: opts?.maxHeightMeters });
      if (!options.length || !options[0].polyline.length) return;

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
    } catch (e) {
      console.warn('fetchDirections error:', e);
    }
  }, [userLocation, drivingMode]);

  // --- Route select (best/eco) ---
  const handleRouteSelect = useCallback((routeType: 'best' | 'eco') => {
    if (!availableRoutes.length || !navigationData) return;
    let index = 0;
    if (routeType === 'eco') {
      index = availableRoutes.reduce((best, r, i) => (r.distance < availableRoutes[best].distance ? i : best), 0);
    } else {
      index = availableRoutes.reduce((best, r, i) => (r.duration < availableRoutes[best].duration ? i : best), 0);
    }
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
    const etaStr = etaMin < 60 ? `About ${etaMin} minutes` : `About ${Math.floor(etaMin / 60)} hours and ${etaMin % 60} minutes`;
    speak(`Starting navigation to ${dest}. ${etaStr}.`, 'high', drivingMode);
  }, [navigationData, drivingMode]);

  const stopNavigation = useCallback(() => {
    setIsNavigating(false);
    isNavigatingRef.current = false;
    stopSpeaking();

    const durationMin = tripStartTimeRef.current
      ? Math.round((Date.now() - tripStartTimeRef.current) / 60000)
      : 5;
    const distMiles = navigationData?.distance
      ? navigationData.distance / 1609.34
      : durationMin * 0.5;
    const roundedDist = Math.round(distMiles * 10) / 10;

    setTimeout(() => speak(`Trip ended. You drove ${roundedDist} miles.`, 'normal', drivingMode), 500);

    setTripSummary({
      distance: roundedDist,
      duration: durationMin,
      safety_score: 85,
      gems_earned: 5,
      xp_earned: 1000,
      origin: navigationData?.origin?.name ?? 'Start',
      destination: navigationData?.destination?.name ?? 'End',
      date: new Date().toLocaleDateString(),
    });

    setNavigationData(null);
    setAvailableRoutes([]);
    setLiveEta(null);
    setSelectedDestination(null);
    offRouteSinceRef.current = null;
    rerouteInFlightRef.current = false;
    tripStartTimeRef.current = null;
  }, [navigationData, drivingMode]);

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

  // --- Step index tracking ---
  useEffect(() => {
    if (!isNavigating || !navigationData?.steps?.length) return;
    let cumulative = 0;
    let nextIndex = 0;
    for (let i = 0; i < navigationData.steps.length; i++) {
      const stepDist = navigationData.steps[i].distanceMeters ?? 0;
      if (traveledDistanceMeters < cumulative + stepDist) {
        nextIndex = i;
        break;
      }
      cumulative += stepDist;
      nextIndex = i + 1;
    }
    setCurrentStepIndex(Math.min(nextIndex, navigationData.steps.length - 1));
  }, [isNavigating, navigationData?.steps, traveledDistanceMeters]);

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
    const phrase = formatTurnInstruction(
      step.instruction,
      step.distanceMeters,
      step.maneuver,
      drivingMode,
      step.intersections,
      nextStep ? { maneuver: nextStep.maneuver, distanceMeters: nextStep.distanceMeters } : null,
    );
    if (!phrase) return;

    if (stepIndex === 0) {
      setTimeout(() => speak(phrase, 'normal', drivingMode), 2500);
    } else {
      speak(phrase, 'normal', drivingMode);
    }
  }, [isNavigating, navigationData?.steps, currentStepIndex, drivingMode]);

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
      : `You've arrived at ${dest}. Have a great day!`;
    speak(arrivalMsg, 'high', drivingMode);
  }, [isNavigating, liveEta?.distanceMiles, navigationData?.destination, drivingMode]);

  // --- ETA from route distance ---
  useEffect(() => {
    if (!isNavigating || !navigationData) return;
    const totalMeters = navigationData.distance;
    const durationSeconds = navigationData.duration;
    if (totalMeters <= 0 || durationSeconds <= 0) return;
    const totalMiles = totalMeters / 1609.34;
    const traveledMiles = traveledDistanceMeters / 1609.34;
    const remainingMiles = Math.max(0, totalMiles - traveledMiles);
    const initialDurationMin = durationSeconds / 60;
    const etaMinutes = totalMiles > 0 ? (remainingMiles / totalMiles) * initialDurationMin : 0;
    setLiveEta({ distanceMiles: remainingMiles, etaMinutes: Math.max(0, Math.round(etaMinutes)) });
  }, [isNavigating, navigationData?.distance, navigationData?.duration, traveledDistanceMeters]);

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
    const rerouteMsg = drivingMode === 'calm' ? 'Let me find you a new route.' : 'Rerouting.';
    speak(rerouteMsg, 'high', drivingMode);

    const reroute = async () => {
      try {
        await Promise.race([
          fetchDirections(navigationData.destination, userLocation),
          new Promise<void>((resolve) => setTimeout(resolve, 8000)),
        ]);
      } finally {
        rerouteInFlightRef.current = false;
        offRouteSinceRef.current = null;
      }
    };
    reroute();
  }, [userLocation.lat, userLocation.lng, speed, isNavigating, navigationData?.destination, navigationData?.polyline, drivingMode, fetchDirections]);

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
  };
}
