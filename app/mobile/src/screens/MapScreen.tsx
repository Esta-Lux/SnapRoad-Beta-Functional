import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList,
  Platform, Keyboard, Alert, Switch,
} from 'react-native';
import Animated, {
  FadeIn, FadeOut, SlideInDown, SlideOutDown,
  useSharedValue, useAnimatedStyle, withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapboxGL, { isMapAvailable } from '../utils/mapbox';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { useLocation } from '../hooks/useLocation';
import { useNavigation as useNav } from '../hooks/useNavigation';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useMapLayers } from '../hooks/useMapLayers';
import { DRIVING_MODES } from '../constants/modes';
import { forwardGeocode, type GeocodeResult } from '../lib/directions';
import RouteOverlay from '../components/map/RouteOverlay';
import OfferMarkers from '../components/map/OfferMarkers';
import ReportMarkers from '../components/map/ReportMarkers';
import FriendMarkers from '../components/map/FriendMarkers';
import CameraMarkers from '../components/map/CameraMarkers';
import type { CameraLocation, CameraViewFeed } from '../components/map/CameraMarkers';
import TrafficCameraSheet from '../components/map/TrafficCameraSheet';
import TrafficLayer from '../components/map/TrafficLayer';
import IncidentHeatmap from '../components/map/IncidentHeatmap';
import PlaceCard from '../components/map/PlaceCard';
import PlaceDetailSheet from '../components/map/PlaceDetailSheet';
import OfferRedemptionSheet from '../components/map/OfferRedemptionSheet';
import BuildingsLayer from '../components/map/BuildingsLayer';
import PhotoReportMarkers from '../components/map/PhotoReportMarkers';
import FuelStationMarkers from '../components/map/FuelStationMarkers';
import PhotoReportSheet from '../components/map/PhotoReportSheet';
import LaneGuide from '../components/navigation/LaneGuide';
import GemOverlay from '../components/gamification/GemOverlay';
import TripShare from '../components/gamification/TripShare';
import HamburgerMenu from '../components/profile/HamburgerMenu';
import { useCrashDetection } from '../hooks/useCrashDetection';
import { formatDistance, haversineMeters } from '../utils/distance';
import { formatDuration } from '../utils/format';
import { speak, stopSpeaking } from '../utils/voice';
import { api } from '../api/client';
import OrionChat from '../components/orion/OrionChat';
import { useNavigatingState } from '../contexts/NavigatingContext';
import { storage } from '../utils/storage';
import { supabase } from '../lib/supabase';
import type { DrivingMode, Incident, SavedLocation, Offer, FriendLocation } from '../types';

// ─── Constants ───────────────────────────────────────────────────────────────

const MAPBOX_TOKEN =
  process.env.EXPO_PUBLIC_MAPBOX_TOKEN ||
  (Constants.expoConfig?.extra?.mapboxPublicToken as string) ||
  '';
if (MapboxGL && MAPBOX_TOKEN) MapboxGL.setAccessToken(MAPBOX_TOKEN);

const INCIDENT_COLORS: Record<string, string> = {
  police: '#4A90D9', accident: '#D04040', hazard: '#E07830',
  construction: '#F59E0B', closure: '#D04040', pothole: '#F97316',
};

const MAP_STYLES = [
  { key: 'standard', label: 'Standard', url: 'mapbox://styles/mapbox/standard', icon: 'cube-outline' as const },
  { key: 'satellite', label: 'Satellite', url: 'mapbox://styles/mapbox/standard-satellite', icon: 'earth-outline' as const },
  { key: 'streets', label: 'Streets', url: 'mapbox://styles/mapbox/streets-v12', icon: 'map-outline' as const },
  { key: 'dark', label: 'Dark', url: 'mapbox://styles/mapbox/dark-v11', icon: 'moon-outline' as const },
] as const;

// Calm: warm golden morning — airy, peaceful, sunrise feel
// Adaptive: clear daylight, balanced commute sky
// Sport: blue-hour dusk — intense but visible, performance driving feel
const ATMOSPHERE: Record<DrivingMode, { color: string; highColor: string; horizonBlend: number; spaceColor: string; starIntensity: number }> = {
  calm: { color: 'rgb(255, 228, 196)', highColor: 'rgb(255, 200, 150)', horizonBlend: 0.08, spaceColor: 'rgb(220, 235, 250)', starIntensity: 0 },
  adaptive: { color: 'rgb(186, 210, 235)', highColor: 'rgb(36, 92, 223)', horizonBlend: 0.04, spaceColor: 'rgb(187, 214, 237)', starIntensity: 0 },
  sport: { color: 'rgb(22, 30, 60)', highColor: 'rgb(45, 55, 120)', horizonBlend: 0.06, spaceColor: 'rgb(12, 18, 45)', starIntensity: 0.35 },
};

const REPORT_TYPES = [
  { type: 'police', label: 'Police', icon: 'shield-outline' as const },
  { type: 'accident', label: 'Accident', icon: 'warning-outline' as const },
  { type: 'hazard', label: 'Hazard', icon: 'warning-outline' as const },
  { type: 'construction', label: 'Construction', icon: 'construct-outline' as const },
  { type: 'closure', label: 'Closure', icon: 'close-circle-outline' as const },
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTurnIcon(maneuver?: string) {
  const sz = 32;
  const c = '#fff';
  if (!maneuver) return <Ionicons name="arrow-up" size={sz} color={c} />;
  if (maneuver === 'arrive') return <Ionicons name="flag" size={sz} color={c} />;
  if (maneuver === 'depart') return <Ionicons name="navigate" size={sz} color={c} />;
  if (maneuver === 'u-turn') return <Ionicons name="return-up-back-outline" size={sz} color={c} />;
  if (maneuver === 'roundabout') return <Ionicons name="sync-outline" size={sz} color={c} />;
  if (maneuver === 'merge') return <Ionicons name="git-merge-outline" size={sz} color={c} />;
  if (maneuver.includes('sharp-left')) return <Ionicons name="arrow-undo" size={sz} color={c} />;
  if (maneuver.includes('sharp-right')) return <Ionicons name="arrow-redo" size={sz} color={c} />;
  if (maneuver.includes('left')) return <Ionicons name="arrow-back" size={sz} color={c} />;
  if (maneuver.includes('right')) return <Ionicons name="arrow-forward" size={sz} color={c} />;
  return <Ionicons name="arrow-up" size={sz} color={c} />;
}

/** Analyse congestion array and return a simple traffic summary. */
function analyzeCongestion(congestion?: string[]): {
  level: 'heavy' | 'moderate' | 'low';
  delayMin: number;
  heavyRatio: number;
} | null {
  if (!congestion || congestion.length === 0) return null;
  const heavy  = congestion.filter((c) => c === 'heavy' || c === 'severe').length;
  const mod    = congestion.filter((c) => c === 'moderate').length;
  const total  = congestion.length;
  const heavyRatio = heavy / total;
  const modRatio   = mod / total;
  if (heavyRatio > 0.25) return { level: 'heavy',    delayMin: Math.max(2, Math.round(heavyRatio * 14)), heavyRatio };
  if (heavyRatio > 0.08 || modRatio > 0.35)
                          return { level: 'moderate', delayMin: Math.max(1, Math.round((heavyRatio * 10) + (modRatio * 4))), heavyRatio };
  return { level: 'low', delayMin: 0, heavyRatio };
}

function timeAgo(iso: string): string {
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return 'just now';
  if (diff < 60) return `${diff}m ago`;
  return `${Math.round(diff / 60)}h ago`;
}

function parseCameraViewsFromTraffic(raw: unknown): CameraViewFeed[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const list: CameraViewFeed[] = raw
    .map((v: any) => ({
      id: String(v?.id ?? ''),
      small_url: String(v?.small_url ?? v?.smallUrl ?? '').trim(),
      large_url: String(v?.large_url ?? v?.largeUrl ?? '').trim(),
      direction: String(v?.direction ?? '').trim(),
    }))
    .map((v) => ({
      ...v,
      small_url: v.small_url || v.large_url,
      large_url: v.large_url || v.small_url,
    }))
    .filter((v) => v.large_url.length > 0);
  return list.length ? list : undefined;
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { location, heading, speed, isLocating, permissionDenied } = useLocation();
  const { isLight, colors } = useTheme();
  const { user } = useAuth();

  // ── Driving mode ──
  const [drivingMode, setDrivingMode] = useState<DrivingMode>('adaptive');
  const modeConfig = DRIVING_MODES[drivingMode];

  // ── Navigation hook ──
  const nav = useNav({ userLocation: location, speed, heading, drivingMode });

  // ── Search ──
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchGenRef = useRef(0);

  // ── Camera ──
  const mapRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const [cameraLocked, setCameraLocked] = useState(true);
  const [isExploring, setIsExploring] = useState(false);
  const [compassMode, setCompassMode] = useState(false);
  const userInteracting = useRef(false);
  const lastCameraUpdate = useRef({ lat: 0, lng: 0, heading: 0 });

  // ── Reports ──
  const [nearbyIncidents, setNearbyIncidents] = useState<Incident[]>([]);
  const [activeReportCard, setActiveReportCard] = useState<Incident | null>(null);
  const [confirmIncident, setConfirmIncident] = useState<Incident | null>(null);
  const [showReportPicker, setShowReportPicker] = useState(false);
  const [showCommunitySheet, setShowCommunitySheet] = useState(false);
  const reportPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const announcedRef = useRef<Set<string>>(new Set());
  const confirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Map style ──
  const [styleOverride, setStyleOverride] = useState(0);
  const [showStylePicker, setShowStylePicker] = useState(false);

  // ── Data ──
  const [savedPlaces, setSavedPlaces] = useState<SavedLocation[]>([]);
  const [activeChip, setActiveChip] = useState<'favorites' | 'nearby'>('favorites');
  const [nearbyOffers, setNearbyOffers] = useState<Offer[]>([]);
  const [friendLocations, setFriendLocations] = useState<FriendLocation[]>([]);
  const [cameraLocations, setCameraLocations] = useState<CameraLocation[]>([]);
  const [selectedTrafficCamera, setSelectedTrafficCamera] = useState<CameraLocation | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<{ name: string; address?: string; category?: string; maki?: string; lat: number; lng: number } | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [showOrion, setShowOrion] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [recentSearches, setRecentSearches] = useState<GeocodeResult[]>([]);

  // ── Layers ──
  const { showTraffic, showIncidents, showCameras, setShowTraffic, setShowIncidents, setShowCameras,
    showConstruction, setShowConstruction, showFuel, setShowFuel,
    showPhotoReports, setShowPhotoReports } = useMapLayers();

  // ── New layer data ──
  const [photoReports, setPhotoReports] = useState<{id: string; lat: number; lng: number; type: string; description?: string; created_at: string}[]>([]);
  const [fuelStations, setFuelStations] = useState<{id: string; name?: string; lat: number; lng: number; price?: number}[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [showPhotoReport, setShowPhotoReport] = useState(false);
  const [showGemOverlay, setShowGemOverlay] = useState(false);
  const [gemOverlayAmount, setGemOverlayAmount] = useState(0);
  const [showTripShare, setShowTripShare] = useState(false);
  const [trafficBannerDismissed, setTrafficBannerDismissed] = useState(false);

  // ── Report card timer progress (Reanimated) ──
  const reportTimerProg = useSharedValue(1);
  const reportTimerStyle = useAnimatedStyle(() => ({
    width: `${reportTimerProg.value * 100}%` as any,
  }));

  // ── Crash detection ──
  const { crashDetected, dismissCrash } = useCrashDetection();

  // ── Truck ──
  const [avoidLowClearances, setAvoidLowClearances] = useState(false);
  const vehicleHeight = user?.vehicle_height_meters;
  const hasTallVehicle = typeof vehicleHeight === 'number' && vehicleHeight > 0;

  // ── Sync nav state to tab bar ──
  const { setIsNavigating: setNavCtx } = useNavigatingState();
  useEffect(() => { setNavCtx(nav.isNavigating); }, [nav.isNavigating, setNavCtx]);

  // ─── Derived values ────────────────────────────────────────────────────────

  // Calm → streets-v12 (shows everything: labels, POIs, cameras, road features, building names)
  // Sport → navigation-night-v1 (dusk/blue-hour, navigation-optimised, fully featured)
  // Adaptive → standard (default)
  // styleOverride 0 means "mode default"; higher indexes are explicit user picks
  const activeStyleURL = (drivingMode === 'calm' && styleOverride === 0)
    ? 'mapbox://styles/mapbox/streets-v12'
    : (drivingMode === 'sport' && styleOverride === 0)
      ? 'mapbox://styles/mapbox/navigation-night-v1'
      : (MAP_STYLES[styleOverride]?.url ?? MAP_STYLES[0].url);
  /** streets-v12 and navigation-night-v1 support heading indicator; Standard omits it. */
  const userLocationHeadingOk = /streets-v\d+|navigation-/.test(activeStyleURL);
  const atmosphereStyle = ATMOSPHERE[drivingMode];
  const isCalm = drivingMode === 'calm';
  const isAdaptive = drivingMode === 'adaptive';
  const isSport = drivingMode === 'sport';
  const animDuration = isCalm
    ? (nav.isNavigating ? 1000 : 1200)         // slow, smooth calm
    : isSport
      ? (speed > 25 ? 200 : speed > 10 ? 350 : 600)   // snappy sport
      : speed > 15 ? 300 : speed > 5 ? 500 : 800;     // adaptive standard

  const stableCenterRef = useRef<[number, number]>([location.lng, location.lat]);
  const [stableCenter, setStableCenter] = useState<[number, number]>([location.lng, location.lat]);
  const headingRef = useRef(heading);
  useEffect(() => { headingRef.current = heading; }, [heading]);
  useEffect(() => {
    const [prevLng, prevLat] = stableCenterRef.current;
    const dLat = location.lat - prevLat;
    const dLng = location.lng - prevLng;
    const approxMeters = Math.sqrt(dLat * dLat + dLng * dLng) * 111320;
    if (approxMeters > 5) {
      stableCenterRef.current = [location.lng, location.lat];
      setStableCenter([location.lng, location.lat]);
    }
  }, [location.lat, location.lng]);

  // Compass mode: smooth real-time heading follow at ~12fps
  useEffect(() => {
    if (!compassMode || nav.isNavigating || isExploring) return;
    const id = setInterval(() => {
      cameraRef.current?.setCamera({
        heading: headingRef.current,
        animationDuration: 80,
        animationMode: 'easeTo',
      });
    }, 80);
    return () => clearInterval(id);
  }, [compassMode, nav.isNavigating, isExploring]);

  const currentStep = nav.navigationData?.steps?.[nav.currentStepIndex];
  const nextStep = nav.navigationData?.steps?.[nav.currentStepIndex + 1];
  const isAmbient = !nav.isNavigating && speed > 6.7;
  const mapOk = isMapAvailable() && MapboxGL !== null;

  // ─── Effects ───────────────────────────────────────────────────────────────

  // Fix 6: Load persisted driving mode + recent searches on mount
  useEffect(() => {
    const saved = storage.getString('snaproad_driving_mode');
    if (saved === 'calm' || saved === 'adaptive' || saved === 'sport') setDrivingMode(saved as DrivingMode);
    const recent = storage.getString('snaproad_recent_searches');
    if (recent) { try { setRecentSearches(JSON.parse(recent)); } catch {} }
  }, []);

  // Fix 6: Persist driving mode on change
  useEffect(() => { storage.set('snaproad_driving_mode', drivingMode); }, [drivingMode]);

  // Fetch saved places + friends on mount
  useEffect(() => {
    api.get<any>('/api/locations').then((r) => {
      const d = (r.data as any)?.data ?? r.data;
      if (Array.isArray(d)) setSavedPlaces(d);
    }).catch(() => {});
    api.get<any>('/api/social/friends/locations').then((r) => {
      const d = (r.data as any)?.data ?? r.data;
      if (Array.isArray(d)) setFriendLocations(d);
    }).catch(() => {});
  }, []);

  // Fix 8: Offers refresh on significant location change (~1km)
  useEffect(() => {
    const rLat = Math.round(location.lat * 100);
    const rLng = Math.round(location.lng * 100);
    if (rLat === 0 && rLng === 0) return;
    api.get<any>(`/api/offers/nearby?lat=${location.lat}&lng=${location.lng}&radius=5`).then((r) => {
      const d = (r.data as any)?.data ?? r.data;
      if (Array.isArray(d)) setNearbyOffers(d);
    }).catch(() => {});
  }, [Math.round(location.lat * 100), Math.round(location.lng * 100)]);

  useEffect(() => {
    if (!showCameras) return;
    api.get<any>(`/api/map/cameras?lat=${location.lat}&lng=${location.lng}&radius=80`).then((r) => {
      if (!r.success || r.data == null) return;
      const raw = r.data;
      const items = (raw as any)?.data ?? raw;
      if (Array.isArray(items)) {
        const cams = items
          .map((rpt: any) => ({
            id: String(rpt.id ?? Math.random()),
            name: typeof rpt.title === 'string' ? rpt.title : 'Camera',
            description: typeof rpt.description === 'string' ? rpt.description : undefined,
            lat: Number(rpt.lat),
            lng: Number(rpt.lng),
            camera_views: parseCameraViewsFromTraffic(rpt.camera_views),
          }))
          .filter((c: CameraLocation) => isFinite(c.lat) && isFinite(c.lng));
        setCameraLocations(cams);
      }
    }).catch(() => {});
  }, [showCameras, Math.round(location.lat * 100), Math.round(location.lng * 100)]);

  // Fetch photo reports when layer enabled
  useEffect(() => {
    if (!showPhotoReports) return;
    api.get<any>(`/api/photo-reports/nearby?lat=${location.lat}&lng=${location.lng}&radius=5`).then((r) => {
      const d = (r.data as any)?.data ?? r.data;
      if (Array.isArray(d)) setPhotoReports(d.map((p: any) => ({ id: String(p.id), lat: p.lat, lng: p.lng, type: p.type ?? 'photo', description: p.description, created_at: p.created_at ?? new Date().toISOString() })));
    }).catch(() => {});
  }, [showPhotoReports, Math.round(location.lat * 100), Math.round(location.lng * 100)]);

  useEffect(() => {
    if (!showFuel) return;
    api.get<any>(`/api/places/autocomplete?q=gas+station&lat=${location.lat}&lng=${location.lng}`).then((r) => {
      const predictions = (r.data as any)?.data ?? [];
      if (!Array.isArray(predictions) || predictions.length === 0) return;
      const resolved = predictions.slice(0, 8).map(async (p: any) => {
        if (!p.place_id) return null;
        try {
          const det = await api.get<any>(`/api/places/details/${p.place_id}`);
          const d = det.data?.data ?? det.data;
          if (d?.lat && d?.lng) return { id: String(p.place_id), name: d.name ?? p.name, lat: d.lat, lng: d.lng };
        } catch {}
        return null;
      });
      Promise.all(resolved).then((results) => {
        setFuelStations(results.filter(Boolean) as any[]);
      });
    }).catch(() => {});
  }, [showFuel, Math.round(location.lat * 100), Math.round(location.lng * 100)]);

  // Crash detection → SOS alert
  useEffect(() => {
    if (!crashDetected) return;
    Alert.alert(
      'Crash Detected',
      'A sudden impact was detected. Do you need help?',
      [
        { text: "I'm OK", onPress: dismissCrash },
        { text: 'Send SOS', style: 'destructive', onPress: async () => {
          try { await api.post('/api/family/sos', { lat: location.lat, lng: location.lng, type: 'crash' }); } catch {}
          try { await api.post('/api/concerns/submit', { type: 'crash_detected', lat: location.lat, lng: location.lng }); } catch {}
          dismissCrash();
          Alert.alert('SOS Sent', 'Emergency contacts have been notified.');
        }},
      ],
      { cancelable: false },
    );
  }, [crashDetected, dismissCrash, location.lat, location.lng]);

  // Fix 7: Supabase realtime for friend locations
  useEffect(() => {
    const channel = supabase.channel('friend-locations')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'live_locations' }, (payload: any) => {
        if (!payload?.new) return;
        setFriendLocations((prev) => prev.map((f) =>
          String(f.id) === String(payload.new.user_id)
            ? { ...f, lat: payload.new.lat ?? f.lat, lng: payload.new.lng ?? f.lng, speedMph: payload.new.speed_mph ?? f.speedMph, heading: payload.new.heading ?? f.heading }
            : f
        ));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Fix 14: GPS feed with jitter threshold
  useEffect(() => {
    const moved = haversineMeters(lastCameraUpdate.current.lat, lastCameraUpdate.current.lng, location.lat, location.lng) > 1.5;
    const turned = Math.abs(heading - lastCameraUpdate.current.heading) > 1;
    if (moved || turned) {
      lastCameraUpdate.current = { lat: location.lat, lng: location.lng, heading };
      nav.updatePosition(location.lat, location.lng);
    }
  }, [location.lat, location.lng, heading]);

  // Fix 1: Reset exploring state + traffic banner + camera lock when nav starts
  useEffect(() => {
    if (nav.isNavigating) {
      setIsExploring(false);
      setTrafficBannerDismissed(false);
      setCameraLocked(true);   // re-lock camera each time navigation begins
    }
  }, [nav.isNavigating]);

  // Show gem overlay when trip ends
  useEffect(() => {
    if (nav.tripSummary && nav.tripSummary.gems_earned > 0) {
      setGemOverlayAmount(nav.tripSummary.gems_earned);
      setShowGemOverlay(true);
    }
  }, [nav.tripSummary]);

  // Fix 4: Fit camera to route on preview
  useEffect(() => {
    if (!nav.showRoutePreview || !nav.navigationData?.polyline?.length) return;
    const coords = nav.navigationData.polyline;
    const lngs = coords.map((c) => c.lng);
    const lats = coords.map((c) => c.lat);
    cameraRef.current?.fitBounds(
      [Math.max(...lngs), Math.max(...lats)],
      [Math.min(...lngs), Math.min(...lats)],
      80, 1000,
    );
  }, [nav.showRoutePreview, nav.navigationData?.polyline]);

  // Fix 5: Reroute when driving mode changes during active nav
  useEffect(() => {
    if (!nav.isNavigating || !nav.selectedDestination) return;
    nav.fetchDirections(nav.selectedDestination);
  }, [drivingMode]);

  // Animate report card timer whenever a new report card shows
  useEffect(() => {
    if (activeReportCard) {
      reportTimerProg.value = 1;
      reportTimerProg.value = withTiming(0, { duration: 8000 });
    }
  }, [activeReportCard?.id]);

  // Incident polling
  useEffect(() => {
    const poll = async () => {
      const res = await api.get<{ data?: Incident[] }>(`/api/incidents/nearby?lat=${location.lat}&lng=${location.lng}&radius_miles=2`);
      const d = (res.data as { data?: Incident[] })?.data;
      if (Array.isArray(d)) setNearbyIncidents(d);
    };
    poll();
    const ms = nav.isNavigating ? 30000 : 60000;
    reportPollRef.current = setInterval(poll, ms);
    return () => { if (reportPollRef.current) clearInterval(reportPollRef.current); };
  }, [nav.isNavigating, location.lat, location.lng]);

  // Report cards during navigation
  useEffect(() => {
    if (!nav.isNavigating || !nearbyIncidents.length) { setActiveReportCard(null); return; }
    const ahead = nearbyIncidents.filter((inc) => {
      if (announcedRef.current.has(`a:${inc.id}`)) return false;
      const d = haversineMeters(location.lat, location.lng, inc.lat, inc.lng) / 1609.34;
      return d > 0.1 && d < 1.0;
    });
    if (ahead.length > 0) {
      const nearest = ahead[0];
      announcedRef.current.add(`a:${nearest.id}`);
      setActiveReportCard(nearest);
      if (nearest.type === 'accident' || nearest.type === 'police') {
        const dist = (haversineMeters(location.lat, location.lng, nearest.lat, nearest.lng) / 1609.34).toFixed(1);
        speak(`${nearest.title} reported ${dist} miles ahead.`, 'high', drivingMode);
      }
      setTimeout(() => setActiveReportCard(null), 10000);
    }
  }, [nav.isNavigating, nearbyIncidents, location.lat, location.lng, drivingMode]);

  // Fix 13: Confirmation prompt when passing a report (nav + ambient)
  useEffect(() => {
    if (!nav.isNavigating && !isAmbient) return;
    for (const inc of nearbyIncidents) {
      const d = haversineMeters(location.lat, location.lng, inc.lat, inc.lng);
      if (d < 200 && !announcedRef.current.has(`c:${inc.id}`)) {
        announcedRef.current.add(`c:${inc.id}`);
        setConfirmIncident(inc);
        confirmTimeoutRef.current = setTimeout(() => setConfirmIncident(null), 10000);
        break;
      }
    }
  }, [nav.isNavigating, isAmbient, location.lat, location.lng, nearbyIncidents]);

  // Fix 13: Ambient mode with direction-based filtering
  useEffect(() => {
    if (!isAmbient || !nearbyIncidents.length) return;
    const hp = nearbyIncidents.filter((inc) => {
      if (inc.type !== 'accident' && inc.type !== 'police') return false;
      if (announcedRef.current.has(`amb:${inc.id}`)) return false;
      const bearing = Math.atan2(inc.lng - location.lng, inc.lat - location.lat) * 180 / Math.PI;
      const diff = Math.abs(((bearing - heading + 540) % 360) - 180);
      return diff < 30;
    });
    if (hp.length > 0) {
      const n = hp[0];
      announcedRef.current.add(`amb:${n.id}`);
      setActiveReportCard(n);
      speak(`Caution: ${n.title} reported ahead.`, 'normal', drivingMode);
      setTimeout(() => setActiveReportCard(null), 8000);
    }
  }, [isAmbient, nearbyIncidents, drivingMode, heading, location.lat, location.lng]);

  // ─── Callbacks ─────────────────────────────────────────────────────────────

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!text.trim() || text.trim().length < 2) { setSearchResults([]); setIsSearching(false); return; }
    setIsSearching(true);
    const gen = ++searchGenRef.current;
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await api.get<any>(`/api/places/autocomplete?q=${encodeURIComponent(text)}&lat=${location.lat}&lng=${location.lng}`);
        if (searchGenRef.current !== gen) return;
        const predictions = res.data?.data ?? [];
        if (Array.isArray(predictions) && predictions.length > 0) {
          setSearchResults(predictions.map((p: any) => ({
            name: p.name || p.description || text,
            address: p.address || p.description || '',
            lat: p.lat ?? 0,
            lng: p.lng ?? 0,
            placeType: p.types?.[0] ?? 'poi',
            place_id: p.place_id,
          })));
          setIsSearching(false);
          return;
        }
      } catch {}
      if (searchGenRef.current !== gen) return;
      const mbResults = await forwardGeocode(text, location);
      if (searchGenRef.current !== gen) return;
      setSearchResults(mbResults);
      setIsSearching(false);
    }, 200);
  }, [location]);

  const handleSelectResult = useCallback(async (result: GeocodeResult & { place_id?: string }) => {
    Keyboard.dismiss();
    setSearchQuery('');
    setSearchResults([]);
    setIsSearchFocused(false);
    setIsExploring(false);

    const updated = [result, ...recentSearches.filter((r) => r.name !== result.name)].slice(0, 10);
    setRecentSearches(updated);
    storage.set('snaproad_recent_searches', JSON.stringify(updated));

    if (result.place_id) {
      let lat = result.lat;
      let lng = result.lng;
      if (!lat || !lng) {
        try {
          const details = await api.get<any>(`/api/places/details/${result.place_id}`);
          const d = details.data?.data ?? details.data;
          lat = d?.lat ?? 0;
          lng = d?.lng ?? 0;
        } catch {}
      }
      if (lat && lng) {
        cameraRef.current?.setCamera({ centerCoordinate: [lng, lat], zoomLevel: 16, pitch: 45, animationDuration: 800 });
      }
      setSelectedPlace({ name: result.name, address: result.address, lat: lat || 0, lng: lng || 0 });
      setSelectedPlaceId(result.place_id);
      return;
    }

    setSelectedPlace({ name: result.name, address: result.address, category: result.category, maki: result.maki, lat: result.lat, lng: result.lng });
    cameraRef.current?.setCamera({
      centerCoordinate: [result.lng, result.lat],
      zoomLevel: 16,
      pitch: 45,
      animationDuration: 800,
    });
  }, [recentSearches]);

  const handleStartDirections = useCallback(async (place: { name: string; address?: string; lat: number; lng: number }) => {
    setSelectedPlace(null);
    nav.setSelectedDestination({ name: place.name, address: place.address ?? '', lat: place.lat, lng: place.lng });
    await nav.fetchDirections(
      { name: place.name, address: place.address ?? '', lat: place.lat, lng: place.lng },
      undefined,
      { maxHeightMeters: avoidLowClearances ? vehicleHeight : undefined },
    );
  }, [nav, avoidLowClearances, vehicleHeight]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    nav.setSelectedDestination(null);
    nav.setShowRoutePreview(false);
  }, [nav]);

  const handleMapTouch = useCallback(() => {
    // Fix 1: set exploring when user drags (nav or not)
    if (nav.isNavigating) { userInteracting.current = true; setCameraLocked(false); }
    else { setIsExploring(true); }
  }, [nav.isNavigating]);

  const handleRecenter = useCallback(() => {
    if (nav.isNavigating) {
      setCameraLocked(true);
      userInteracting.current = false;
      setIsExploring(false);
    } else {
      stableCenterRef.current = [location.lng, location.lat];
      setStableCenter([location.lng, location.lat]);
      setIsExploring(false);
      setCompassMode(false);
      cameraRef.current?.setCamera({
        centerCoordinate: [location.lng, location.lat],
        zoomLevel: 15,
        pitch: 45,
        heading: 0,
        animationMode: 'easeTo',
        animationDuration: 600,
      });
    }
  }, [location.lat, location.lng, nav.isNavigating]);

  const handleSubmitReport = useCallback(async (type: string) => {
    setShowReportPicker(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await api.post('/api/incidents/report', { type, lat: location.lat, lng: location.lng });
      Alert.alert('Report Submitted', 'Thanks for keeping roads safe!');
    } catch { /* silent -- don't interrupt driving */ }
  }, [location]);

  const handleConfirm = useCallback(async (confirmed: boolean) => {
    if (!confirmIncident) return;
    setConfirmIncident(null);
    if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
    try { await api.post('/api/incidents/confirm', { incident_id: confirmIncident.id, confirmed }); } catch {}
  }, [confirmIncident]);

  const handleUpvote = useCallback(async (inc: Incident) => {
    try {
      const res = await api.post<{ upvotes?: number }>(`/api/incidents/${inc.id}/upvote`);
      if (!res.success) throw new Error(res.error || 'Failed');
      const votes = typeof res.data?.upvotes === 'number' ? res.data.upvotes : (inc.upvotes || 0) + 1;
      setNearbyIncidents((prev) => prev.map((i) => (String(i.id) === String(inc.id) ? { ...i, upvotes: votes } : i)));
      setActiveReportCard((prev) => prev && String(prev.id) === String(inc.id) ? { ...prev, upvotes: votes } : prev);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e: any) { Alert.alert('Failed', e?.message || 'Please try again.'); }
  }, []);

  const handleDownvote = useCallback(async (inc: Incident) => {
    try {
      await api.post('/api/incidents/confirm', { incident_id: inc.id, confirmed: false });
      setActiveReportCard(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch { setActiveReportCard(null); }
  }, []);

  const handleMapPress = useCallback(async (e: any) => {
    const features = e.features;
    if (features?.length > 0) {
      const f = features[0];
      const name = f.properties?.name || f.properties?.name_en;
      if (name && f.geometry?.coordinates) {
        const [lng, lat] = f.geometry.coordinates;
        setSelectedPlace({ name, address: f.properties?.address ?? '', category: f.properties?.category, lat, lng });
        return;
      }
    }
    const coords = e.geometry?.coordinates;
    if (coords) {
      const [tapLng, tapLat] = coords;
      try {
        const res = await api.get<any>(`/api/places/nearby?lat=${tapLat}&lng=${tapLng}&radius=40`);
        const nearby = (res.data as any)?.data ?? res.data;
        if (Array.isArray(nearby) && nearby.length > 0) {
          const p = nearby[0];
          const pLat = p.lat ?? tapLat;
          const pLng = p.lng ?? tapLng;
          const dx = (pLat - tapLat) * 111320;
          const dy = (pLng - tapLng) * 111320 * Math.cos(tapLat * Math.PI / 180);
          const distM = Math.sqrt(dx * dx + dy * dy);
          if (distM < 60) {
            setSelectedPlace({ name: p.name, address: p.address ?? p.vicinity ?? '', lat: pLat, lng: pLng });
            if (p.place_id) setSelectedPlaceId(p.place_id);
            return;
          }
        }
      } catch {}
      const { reverseGeocode } = await import('../lib/directions');
      const geo = await reverseGeocode(tapLat, tapLng);
      if (geo) { setSelectedPlace({ name: geo.name, address: geo.address, lat: tapLat, lng: tapLng }); return; }
      setSelectedPlace({ name: 'Dropped Pin', address: `${tapLat.toFixed(5)}, ${tapLng.toFixed(5)}`, lat: tapLat, lng: tapLng });
    }
  }, []);

  // ─── Permission denied ─────────────────────────────────────────────────────

  if (permissionDenied) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <Ionicons name="location-outline" size={48} color={colors.textTertiary} />
        <Text style={{ color: colors.text, fontSize: 16, textAlign: 'center', paddingHorizontal: 32, marginTop: 16 }}>
          Location permission is required.{'\n'}Enable it in your device settings.
        </Text>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <View style={s.root}>

      {/* ═══ MAP ═══════════════════════════════════════════════════════════ */}
      {mapOk && MapboxGL ? (
        <MapboxGL.MapView
          ref={mapRef}
          style={s.map}
          styleURL={activeStyleURL}
          // streets-v12, navigation-night-v1, dark-v11, light-v11 are classic styles — use mercator
          projection={(isCalm || isSport || activeStyleURL.includes('dark-v') || activeStyleURL.includes('navigation-')) ? 'mercator' : 'globe'}
          logoEnabled={false}
          attributionEnabled={false}
          compassEnabled
          onTouchStart={handleMapTouch}
          onPress={handleMapPress}
        >
          <MapboxGL.Camera
            ref={cameraRef}
            defaultSettings={{
              centerCoordinate: stableCenter,
              zoomLevel: isCalm ? 14 : isSport ? 15.5 : 15,
              pitch: isCalm ? 35 : isSport ? 50 : 45,
            }}
            centerCoordinate={nav.isNavigating || isExploring || compassMode ? undefined : stableCenter}
            zoomLevel={nav.isNavigating || compassMode ? undefined : (isCalm ? 14 : isSport ? 15.5 : 15)}
            pitch={nav.isNavigating || compassMode ? undefined : (isCalm ? 35 : isSport ? 50 : 45)}
            animationMode="easeTo"
            animationDuration={animDuration}
            followUserLocation={(nav.isNavigating && cameraLocked) || compassMode}
            followPitch={(nav.isNavigating && cameraLocked) ? (isCalm ? 55 : isSport ? 65 : 60) : compassMode ? 45 : undefined}
            followZoomLevel={(nav.isNavigating && cameraLocked) ? (isCalm ? 16 : isSport ? 17.5 : 17) : compassMode ? 15 : undefined}
            followPadding={nav.isNavigating && cameraLocked ? { paddingBottom: isCalm ? 290 : 260, paddingTop: 0, paddingLeft: 0, paddingRight: 0 } : undefined}
          />

          {/* Terrain only on Standard/Satellite — classic styles don't reliably support it */}
          {MapboxGL.RasterDemSource && MapboxGL.Terrain &&
           !activeStyleURL.includes('streets-v') &&
           !activeStyleURL.includes('navigation-') &&
           !activeStyleURL.includes('dark-v') &&
           !activeStyleURL.includes('light-v') && (
            <MapboxGL.RasterDemSource id="mapbox-dem" url="mapbox://mapbox.mapbox-terrain-dem-v1" tileSize={514} maxZoomLevel={14}>
              <MapboxGL.Terrain style={{ exaggeration: modeConfig.terrainExaggeration }} />
            </MapboxGL.RasterDemSource>
          )}

          <BuildingsLayer
            drivingMode={drivingMode}
            isLight={isLight}
            isNavigating={nav.isNavigating}
            activeStyleURL={activeStyleURL}
          />
          {showTraffic && <TrafficLayer />}
          <IncidentHeatmap incidents={nearbyIncidents} visible={showIncidents} />
          {showPhotoReports && <PhotoReportMarkers reports={photoReports} onReportTap={(r) => Alert.alert('Photo Report', r.description || r.type)} />}
          {showFuel && <FuelStationMarkers stations={fuelStations} visible={showFuel} onStationTap={(s) => Alert.alert(s.name || 'Gas Station', s.price ? `$${s.price.toFixed(2)}/gal` : 'Tap for directions')} />}

          {nav.navigationData?.polyline && (
            <RouteOverlay
              polyline={nav.navigationData.polyline}
              userLocation={location}
              isNavigating={nav.isNavigating}
              routeColor="#3B82F6"
              casingColor="#1E40AF"
              passedColor="#93C5FD"
              routeWidth={modeConfig.routeWidth}
              useGradient={false}
              congestion={nav.navigationData.congestion}
              showCongestion={false}
              isCalm={isCalm}
              isRerouting={nav.isRerouting}
            />
          )}

          {/* ── Turn-point dots: white circles at upcoming turn locations ── */}
          {nav.isNavigating && nav.navigationData?.steps && (() => {
            const upcomingSteps = nav.navigationData!.steps
              .slice(nav.currentStepIndex + 1, nav.currentStepIndex + 4)
              .filter((st) => isFinite(st.lat) && isFinite(st.lng) && st.maneuver !== 'arrive');
            if (!upcomingSteps.length || !MapboxGL) return null;
            const turnDots: GeoJSON.FeatureCollection = {
              type: 'FeatureCollection',
              features: upcomingSteps.map((st) => ({
                type: 'Feature' as const,
                properties: {},
                geometry: { type: 'Point' as const, coordinates: [st.lng, st.lat] },
              })),
            };
            return (
              <MapboxGL.ShapeSource id="sr-turn-dots" shape={turnDots}>
                {/* Shadow/blur ring for depth */}
                <MapboxGL.CircleLayer
                  id="sr-turn-dots-shadow"
                  style={{
                    circleRadius: 11,
                    circleColor: '#000000',
                    circleOpacity: 0.18,
                    circleBlur: 1.2,
                    circlePitchAlignment: 'map',
                  }}
                />
                {/* White fill — clean junction marker like the reference image */}
                <MapboxGL.CircleLayer
                  id="sr-turn-dots-white"
                  style={{
                    circleRadius: 8,
                    circleColor: '#ffffff',
                    circleOpacity: 0.95,
                    circlePitchAlignment: 'map',
                  }}
                />
                {/* Mode-color inner dot for identity */}
                <MapboxGL.CircleLayer
                  id="sr-turn-dots-color"
                  style={{
                    circleRadius: 4,
                    circleColor: modeConfig.routeColor,
                    circleOpacity: 1,
                    circlePitchAlignment: 'map',
                  }}
                />
              </MapboxGL.ShapeSource>
            );
          })()}

          <OfferMarkers offers={nearbyOffers} onOfferTap={setSelectedOffer} />
          {showIncidents && <ReportMarkers incidents={nearbyIncidents.filter((inc) => {
            if (inc.type === 'construction') return showConstruction;
            return true;
          })} onIncidentTap={setActiveReportCard} />}
          {showCameras && (
            <CameraMarkers cameras={cameraLocations} onCameraTap={(cam) => setSelectedTrafficCamera(cam)} />
          )}
          <FriendMarkers friends={friendLocations} onFriendTap={(f) => Alert.alert(f.name, 'What would you like to do?', [
            { text: 'Navigate to', onPress: () => handleSelectResult({ name: f.name, address: '', lat: f.lat, lng: f.lng }) },
            { text: 'Cancel', style: 'cancel' },
          ])} />

          {/* User location puck — same default arrow for all modes/styles */}
          <MapboxGL.UserLocation
            visible={true}
            showsUserHeadingIndicator={userLocationHeadingOk}
            androidRenderMode="compass"
            animated={true}
            minDisplacement={1}
          />

          {MapboxGL.Atmosphere && <MapboxGL.Atmosphere style={atmosphereStyle} />}

          {(nav.selectedDestination || selectedPlace) && (
            <MapboxGL.MarkerView
              id="dest-pin"
              coordinate={[
                (nav.selectedDestination?.lng ?? selectedPlace?.lng ?? 0),
                (nav.selectedDestination?.lat ?? selectedPlace?.lat ?? 0),
              ]}
              anchor={{ x: 0.5, y: 1 }}
            >
              <View style={s.destPinWrap}>
                <View style={s.destPin}><Ionicons name="location-sharp" size={20} color="#fff" /></View>
                <View style={s.destPinTail} />
              </View>
            </MapboxGL.MarkerView>
          )}
        </MapboxGL.MapView>
      ) : (
        <View style={[s.map, s.placeholder]}>
          <Ionicons name="map-outline" size={48} color="#3B82F6" />
          <Text style={s.phTitle}>Map requires Dev Build</Text>
          <Text style={s.phSub}>Run: npx expo run:ios / npx expo run:android</Text>
          <Text style={s.phCoord}>{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</Text>
        </View>
      )}

      {/* ═══ PLACE CARD (simple card for Mapbox results / map taps) ═══════ */}
      {selectedPlace && !selectedPlaceId && !nav.isNavigating && !nav.showRoutePreview && (
        <PlaceCard
          name={selectedPlace.name}
          address={selectedPlace.address}
          category={selectedPlace.category}
          maki={selectedPlace.maki}
          distanceMeters={haversineMeters(location.lat, location.lng, selectedPlace.lat, selectedPlace.lng)}
          isLight={isLight}
          onDirections={() => handleStartDirections(selectedPlace)}
          onSave={async () => {
            try {
              await api.post('/api/locations', { name: selectedPlace.name, address: selectedPlace.address ?? '', category: 'favorite', lat: selectedPlace.lat, lng: selectedPlace.lng });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Saved', `${selectedPlace.name} added to your places.`);
            } catch { Alert.alert('Error', 'Could not save place.'); }
          }}
          onDismiss={() => setSelectedPlace(null)}
        />
      )}

      {/* ═══ PLACE DETAIL SHEET (Google Places - reviews, photos, hours) ═ */}
      {selectedPlaceId && !nav.isNavigating && (
        <PlaceDetailSheet
          placeId={selectedPlaceId}
          summary={selectedPlace ? { name: selectedPlace.name, lat: selectedPlace.lat, lng: selectedPlace.lng } : undefined}
          isLight={isLight}
          onClose={() => { setSelectedPlaceId(null); setSelectedPlace(null); }}
          onDirections={(place) => {
            setSelectedPlaceId(null);
            setSelectedPlace(null);
            handleStartDirections(place);
          }}
        />
      )}

      {/* ═══ OFFER SHEET ═══════════════════════════════════════════════════ */}
      {selectedOffer && !nav.isNavigating && (
        <OfferRedemptionSheet
          offer={selectedOffer}
          onDismiss={() => setSelectedOffer(null)}
          onRedeem={() => {}}
          onNavigate={(o) => { setSelectedOffer(null); if (o.lat && o.lng) handleSelectResult({ name: o.business_name, address: '', lat: o.lat, lng: o.lng }); }}
        />
      )}

      <TrafficCameraSheet
        visible={selectedTrafficCamera != null}
        camera={selectedTrafficCamera}
        onClose={() => setSelectedTrafficCamera(null)}
      />

      {/* ═══ TOP BAR (not navigating, not previewing) ═════════════════════ */}
      {!nav.isNavigating && !nav.showRoutePreview && (
        <View style={[s.topBar, { top: insets.top + 8 }]}>
          <View style={s.searchRow}>
            <TouchableOpacity style={[s.menuBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setShowMenu(!showMenu)}>
              <Ionicons name="menu" size={18} color={colors.text} />
            </TouchableOpacity>
            <View style={[s.searchPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="search-outline" size={15} color={colors.textTertiary} />
              <TextInput
                style={[s.searchInput, { color: colors.text }]}
                placeholder="Where to?"
                placeholderTextColor={colors.textTertiary}
                value={searchQuery}
                onChangeText={handleSearchChange}
                onFocus={() => setIsSearchFocused(true)}
                returnKeyType="search"
              />
              {searchQuery.length > 0 ? (
                <TouchableOpacity onPress={handleClearSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => setShowOrion(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="mic-outline" size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {!isSearchFocused && (
            <FlatList
              horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}
              data={[
                { key: 'favorites', label: 'Favorites', icon: 'star-outline' as const, query: '' },
                { key: 'nearby', label: 'Nearby', icon: 'location-outline' as const, query: '' },
                { key: 'gas', label: 'Gas', icon: 'flash-outline' as const, query: 'gas station' },
                { key: 'food', label: 'Food', icon: 'restaurant-outline' as const, query: 'restaurant' },
                { key: 'coffee', label: 'Coffee', icon: 'cafe-outline' as const, query: 'coffee' },
                { key: 'parking', label: 'Parking', icon: 'car-outline' as const, query: 'parking' },
                { key: 'ev', label: 'EV', icon: 'battery-charging-outline' as const, query: 'ev charging' },
                { key: 'grocery', label: 'Grocery', icon: 'cart-outline' as const, query: 'grocery' },
              ]}
              keyExtractor={(c) => c.key}
              renderItem={({ item: chip }) => {
                const sel = activeChip === chip.key;
                return (
                  <TouchableOpacity style={[s.chip, { backgroundColor: sel ? colors.primary : colors.surface, borderColor: sel ? 'transparent' : colors.border }]}
                    onPress={() => {
                      setActiveChip(chip.key as any);
                      if (chip.query) { handleSearchChange(chip.query); setIsSearchFocused(true); }
                      else if (chip.key === 'nearby') {
                        api.get<any>(`/api/places/nearby?lat=${location.lat}&lng=${location.lng}&radius=1000`).then((r) => {
                          const d = (r.data as any)?.data ?? r.data;
                          if (Array.isArray(d)) setSearchResults(d.map((p: any) => ({ name: p.name, address: p.address ?? '', lat: p.lat ?? 0, lng: p.lng ?? 0, placeType: p.types?.[0], place_id: p.place_id })));
                          setIsSearchFocused(true);
                        }).catch(() => {});
                      }
                    }}>
                    <Ionicons name={chip.icon} size={13} color={sel ? '#fff' : colors.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={{ color: sel ? '#fff' : colors.text, fontSize: 12, fontWeight: '600' }}>{chip.label}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          )}

          {!isSearchFocused && savedPlaces.length > 0 && (
            <FlatList
              horizontal showsHorizontalScrollIndicator={false}
              style={{ marginTop: 8 }}
              data={savedPlaces.filter((p) => ['home', 'work', 'favorite'].includes(p.category)).slice(0, 5)}
              keyExtractor={(p) => String(p.id)}
              renderItem={({ item }) => (
                <TouchableOpacity style={[s.quickPlace, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => { if (item.lat && item.lng) handleSelectResult({ name: item.name, address: item.address, lat: item.lat, lng: item.lng }); }}>
                  <Ionicons name={item.category === 'home' ? 'home-outline' : item.category === 'work' ? 'briefcase-outline' : 'star-outline'} size={14} color={colors.textTertiary} />
                  <View><Text style={[s.qpTitle, { color: colors.text }]}>{item.name}</Text><Text style={[s.qpSub, { color: colors.textSecondary }]} numberOfLines={1}>{item.address}</Text></View>
                </TouchableOpacity>
              )}
            />
          )}

          {isSearchFocused && (
            <View style={[s.results, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {!searchQuery.trim() && recentSearches.length > 0 && <Text style={[s.recentHeader, { color: colors.textTertiary }]}>Recent</Text>}
              {isSearching && searchQuery.trim() ? (
                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                  <Text style={{ color: colors.textTertiary, fontSize: 13 }}>Searching...</Text>
                </View>
              ) : searchQuery.trim() && searchResults.length === 0 ? (
                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                  <Ionicons name="search-outline" size={22} color={colors.textTertiary} />
                  <Text style={{ color: colors.textTertiary, fontSize: 13, marginTop: 6 }}>
                    {searchQuery.length < 3 ? 'Keep typing to search...' : 'No results found'}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={searchQuery.trim() ? searchResults : recentSearches}
                  keyExtractor={(item, i) => `${(item as any).place_id || item.name}-${i}`}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => {
                    const pt = item.placeType || '';
                    const icon: keyof typeof Ionicons.glyphMap =
                      pt.includes('restaurant') || pt.includes('food') || pt.includes('cafe') ? 'restaurant-outline'
                      : pt.includes('gas') || pt.includes('fuel') ? 'flash-outline'
                      : pt.includes('lodging') || pt.includes('hotel') ? 'bed-outline'
                      : pt.includes('store') || pt.includes('shop') || pt.includes('grocery') ? 'cart-outline'
                      : pt.includes('park') ? 'leaf-outline'
                      : pt.includes('hospital') || pt.includes('pharmacy') || pt.includes('health') ? 'medkit-outline'
                      : pt.includes('school') || pt.includes('university') ? 'school-outline'
                      : (item as any).place_id ? 'business-outline'
                      : pt === 'address' ? 'location-outline'
                      : 'location-outline';
                    const hasCoords = item.lat !== 0 && item.lng !== 0;
                    const dist = hasCoords ? haversineMeters(location.lat, location.lng, item.lat, item.lng) : null;
                    const distText = dist != null ? (dist < 160 ? `${Math.round(dist * 3.281)} ft` : `${(dist / 1609.344).toFixed(1)} mi`) : '';
                    return (
                      <TouchableOpacity style={[s.resultRow, { borderBottomColor: colors.border }]} onPress={() => handleSelectResult(item)}>
                        <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: colors.surfaceSecondary, justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                          <Ionicons name={icon} size={15} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[s.resultName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                          <Text style={[s.resultAddr, { color: colors.textSecondary }]} numberOfLines={1}>{item.address}</Text>
                        </View>
                        {distText ? <Text style={{ color: colors.textTertiary, fontSize: 11, fontWeight: '600', marginLeft: 8 }}>{distText}</Text> : null}
                      </TouchableOpacity>
                    );
                  }}
                />
              )}
            </View>
          )}
        </View>
      )}

      {/* ═══ TURN CARD — unified premium HUD, mode-specific gradient ════════ */}
      {nav.isNavigating && currentStep && (() => {
        // Each mode keeps its exact gradient colors — only the layout is unified
        const tcGrad: [string, string] = isCalm
          ? ['#5B9FD8', '#3E7DC4']
          : isAdaptive
            ? ['#3B82F6', '#1E40AF']
            : isSport
              ? ['#DC2626', '#991B1B']
              : [colors.gradientStart as string, colors.gradientEnd as string];

        const tcRadius = isCalm ? 26 : isSport ? 16 : 20;
        const tcShadowColor = isCalm ? '#3E7DC4' : isAdaptive ? '#1D4ED8' : isSport ? '#DC2626' : '#000';
        const distParts = (currentStep.distance ?? '').split(' ');
        // Road we're currently on = next step's name (Mapbox gives the name of the road you're on next)
        const currentRoad = currentStep.name ?? null;

        return (
          <View style={[s.turnWrap, { top: insets.top }]}>
            <Animated.View
              entering={FadeIn.duration(350)}
              style={[
                s.tcPremWrap,
                {
                  borderRadius: tcRadius,
                  ...Platform.select({
                    ios: { shadowColor: tcShadowColor, shadowOpacity: 0.55, shadowRadius: 20, shadowOffset: { width: 0, height: 6 } },
                    android: { elevation: 16 },
                    default: {},
                  }),
                },
              ]}
            >
              <LinearGradient colors={tcGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.tcPremGrad, { borderRadius: tcRadius }]}>
                {/* ── Row 1: dist | icon | instruction | mute ── */}
                <View style={s.tcPremRow}>
                  {/* Distance — large, left */}
                  <View style={s.tcPremDistBlock}>
                    <Text style={s.tcPremDistVal} numberOfLines={1}>{distParts[0] ?? ''}</Text>
                    <Text style={s.tcPremDistUnit}>{distParts[1] ?? ''}</Text>
                  </View>
                  {/* Turn icon */}
                  <View style={s.tcPremIconBox}>
                    {getTurnIcon(currentStep.maneuver)}
                  </View>
                  {/* Instruction + next step */}
                  <View style={s.tcPremInstrBlock}>
                    <Text style={s.tcPremInstr} numberOfLines={2}>{currentStep.instruction}</Text>
                    {nextStep && (
                      <View style={s.tcPremThenRow}>
                        <Ionicons name="return-down-forward-outline" size={12} color="rgba(255,255,255,0.65)" />
                        <Text style={s.tcPremThen} numberOfLines={1}> {nextStep.instruction}</Text>
                      </View>
                    )}
                  </View>
                  {/* Mute */}
                  <TouchableOpacity
                    style={s.tcPremMute}
                    onPress={() => { setIsMuted((m) => !m); if (!isMuted) stopSpeaking(); }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={17} color="rgba(255,255,255,0.7)" />
                  </TouchableOpacity>
                </View>

                {/* ── Row 2: Lane guidance — inside the card so arrows sit on the gradient ── */}
                {currentStep.lanes && (
                  <LaneGuide
                    lanes={currentStep.lanes}
                    activeColor="#ffffff"
                    inactiveColor="rgba(255,255,255,0.25)"
                  />
                )}

                {/* ── Row 3: Current road with shield ── */}
                {currentRoad && (
                  <View style={s.tcPremRoadStrip}>
                    <View style={s.tcRoadShield}>
                      <Text style={s.tcRoadShieldTxt} numberOfLines={1}>
                        {currentRoad.replace(/\s+/g, ' ').substring(0, 8)}
                      </Text>
                    </View>
                    <Text style={s.tcPremRoadTxt} numberOfLines={1}> {currentRoad}</Text>
                  </View>
                )}
              </LinearGradient>
            </Animated.View>
          </View>
        );
      })()}

      {/* ═══ REPORT CARD (all modes — large, clean, with timer + vote) ══ */}
      {activeReportCard && (
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(250)}
          style={[
            s.reportCardNew,
            { top: nav.isNavigating ? insets.top + 130 : insets.top + 90 },
          ]}
        >
          {/* Main content */}
          <View style={s.rcNewContent}>
            {/* Icon badge */}
            <View style={[s.rcNewIcon, { backgroundColor: (INCIDENT_COLORS[activeReportCard.type] ?? '#F59E0B') + '22' }]}>
              <Ionicons
                name={activeReportCard.type === 'police' ? 'shield' : activeReportCard.type === 'accident' ? 'car-sport' : activeReportCard.type === 'construction' ? 'construct' : 'warning'}
                size={22}
                color={INCIDENT_COLORS[activeReportCard.type] ?? '#F59E0B'}
              />
            </View>
            {/* Text */}
            <View style={s.rcNewTextBlock}>
              <Text style={s.rcNewTitle} numberOfLines={1}>
                {activeReportCard.title}
              </Text>
              <Text style={s.rcNewSub}>
                {((haversineMeters(location.lat, location.lng, activeReportCard.lat, activeReportCard.lng) / 1609.34)).toFixed(1)} mi ahead · {timeAgo(activeReportCard.created_at)}
              </Text>
              <Text style={s.rcNewVotes}>
                {activeReportCard.upvotes ?? 0} confirmed
              </Text>
            </View>
            {/* Dismiss */}
            <TouchableOpacity
              style={s.rcNewDismiss}
              onPress={() => setActiveReportCard(null)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color="rgba(255,255,255,0.55)" />
            </TouchableOpacity>
          </View>
          {/* Vote row */}
          <View style={s.rcNewVoteRow}>
            <TouchableOpacity style={[s.rcNewVoteBtn, s.rcUpvote]} onPress={() => handleUpvote(activeReportCard)} activeOpacity={0.85}>
              <Ionicons name="thumbs-up" size={15} color="#fff" />
              <Text style={s.rcNewVoteBtnT}>Still there</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.rcNewVoteBtn, s.rcDownvote]} onPress={() => handleDownvote(activeReportCard)} activeOpacity={0.85}>
              <Ionicons name="thumbs-down" size={15} color="#fff" />
              <Text style={s.rcNewVoteBtnT}>Gone</Text>
            </TouchableOpacity>
          </View>
          {/* Timer progress bar */}
          <View style={s.rcNewTimerTrack}>
            <Animated.View style={[s.rcNewTimerBar, { backgroundColor: INCIDENT_COLORS[activeReportCard.type] ?? '#F59E0B' }, reportTimerStyle]} />
          </View>
        </Animated.View>
      )}

      {/* ═══ CONFIRM PROMPT ═══════════════════════════════════════════════ */}
      {confirmIncident && (
        <View style={[s.confirmCard, { bottom: insets.bottom + 60 }]}>
          <Text style={s.confirmTitle}>Is the {confirmIncident.type} still there?</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TouchableOpacity style={[s.confirmBtn, { backgroundColor: '#22C55E' }]} onPress={() => handleConfirm(true)}><Text style={s.confirmBtnT}>Yes</Text></TouchableOpacity>
            <TouchableOpacity style={[s.confirmBtn, { backgroundColor: '#EF4444' }]} onPress={() => handleConfirm(false)}><Text style={s.confirmBtnT}>No</Text></TouchableOpacity>
          </View>
        </View>
      )}

      {/* ═══ AMBIENT BADGE ════════════════════════════════════════════════ */}
      {isAmbient && !nav.isRerouting && (
        <View style={[s.ambientBadge, { top: insets.top + 8 }]}>
          <Ionicons name="eye-outline" size={14} color="#60a5fa" /><Text style={s.ambientText}>Watching the road ahead</Text>
        </View>
      )}

      {/* ═══ REROUTING BANNER ═════════════════════════════════════════════ */}
      {nav.isRerouting && nav.isNavigating && (
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(250)}
          style={[
            s.reroutingBanner,
            { top: insets.top + (isCalm ? 4 : 6) },
            isCalm && s.reroutingBannerCalm,
          ]}
        >
          <Ionicons name="refresh-outline" size={14} color={isCalm ? '#4A7BBF' : '#fff'} style={{ marginRight: 6 }} />
          <Text style={[s.reroutingText, isCalm && { color: '#2C5F9E' }]}>
            {isCalm ? 'Finding a new route for you…' : 'Rerouting…'}
          </Text>
        </Animated.View>
      )}

      {/* ═══ TRAFFIC CONGESTION BANNER (during navigation) ══════════════ */}
      {nav.isNavigating && !nav.isRerouting && !trafficBannerDismissed && (() => {
        const traffic = analyzeCongestion(nav.navigationData?.congestion);
        if (!traffic || traffic.level === 'low') return null;
        const isHeavy = traffic.level === 'heavy';
        return (
          <Animated.View
            entering={FadeIn.duration(400)}
            exiting={FadeOut.duration(300)}
            style={[
              s.trafficBanner,
              { top: insets.top + (nav.isNavigating ? 150 : 100) },
              { backgroundColor: isHeavy ? '#FEF2F2' : '#FFFBEB',
                borderColor: isHeavy ? '#FECACA' : '#FDE68A' },
            ]}
          >
            <View style={s.trafficBannerLeft}>
              <Ionicons
                name={isHeavy ? 'warning' : 'information-circle'}
                size={20}
                color={isHeavy ? '#DC2626' : '#D97706'}
                style={{ marginRight: 10 }}
              />
              <View>
                <Text style={[s.trafficBannerTitle, { color: isHeavy ? '#991B1B' : '#92400E' }]}>
                  {isHeavy ? 'Heavy traffic ahead' : 'Moderate traffic ahead'}
                </Text>
                <Text style={[s.trafficBannerSub, { color: isHeavy ? '#DC2626' : '#D97706' }]}>
                  {traffic.delayMin > 0 ? `~${traffic.delayMin} min delay on your route` : 'Congestion on your route'}
                </Text>
              </View>
            </View>
            <View style={s.trafficBannerActions}>
              <TouchableOpacity
                style={[s.trafficRerouteBtn, { backgroundColor: isHeavy ? '#DC2626' : '#D97706' }]}
                onPress={() => {
                  setTrafficBannerDismissed(true);
                  if (nav.navigationData?.destination) {
                    nav.fetchDirections(nav.navigationData.destination);
                  }
                }}
                activeOpacity={0.85}
              >
                <Text style={s.trafficRerouteBtnT}>Reroute</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.trafficDismissBtn}
                onPress={() => setTrafficBannerDismissed(true)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        );
      })()}

      {/* ═══ ETA BAR — stats row + End button row below ════════════════════ */}
      {nav.isNavigating && nav.liveEta && (() => {
        const etaAccent = isCalm ? '#5B9FD8' : isAdaptive ? '#3B82F6' : isSport ? '#EF4444' : colors.primary;
        const etaBg = isSport
          ? 'rgba(12,12,30,0.97)'
          : isLight ? 'rgba(255,255,255,0.97)' : 'rgba(10,14,35,0.97)';
        const arrivalTime = new Date(Date.now() + nav.liveEta.etaMinutes * 60000)
          .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        const textPrimary = isSport ? '#f1f5f9' : colors.text;
        const textSec = isSport ? 'rgba(241,245,249,0.5)' : colors.textTertiary;
        const distLabel = formatDistance(nav.liveEta.distanceMiles * 1609.34);

        return (
          <Animated.View
            entering={FadeIn.duration(150)}
            exiting={FadeOut.duration(150)}
            style={[
              s.etaBarUnified,
              {
                paddingBottom: Math.max(insets.bottom, 8) + 4,
                backgroundColor: etaBg,
                borderTopColor: etaAccent + '33',
              },
            ]}
          >
            {/* ── Single row: stats + compact End button ── */}
            <View style={s.etaStatsRow}>
              {isSport && (
                <>
                  <View style={s.etaUniSpeedBlock}>
                    <Text style={[s.etaUniSpeedVal, { color: etaAccent }]}>{Math.round(speed)}</Text>
                    <Text style={[s.etaUniSpeedUnit, { color: etaAccent + '99' }]}>mph</Text>
                  </View>
                  <View style={[s.etaUniDiv, { backgroundColor: etaAccent + '33' }]} />
                </>
              )}
              <View style={s.etaUniCol}>
                <Text style={[s.etaUniLbl, { color: textSec }]}>ETA</Text>
                <Text style={[s.etaUniValAccent, { color: etaAccent }]}>{formatDuration(nav.liveEta.etaMinutes)}</Text>
              </View>
              <View style={[s.etaUniDiv, { backgroundColor: etaAccent + '33' }]} />
              <View style={s.etaUniCol}>
                <Text style={[s.etaUniLbl, { color: textSec }]}>DIST</Text>
                <Text style={[s.etaUniVal, { color: textPrimary }]}>{distLabel}</Text>
              </View>
              <View style={[s.etaUniDiv, { backgroundColor: etaAccent + '33' }]} />
              <View style={s.etaUniCol}>
                <Text style={[s.etaUniLbl, { color: textSec }]}>ARRIVE</Text>
                <Text style={[s.etaUniVal, { color: '#22C55E' }]}>{arrivalTime}</Text>
              </View>
              <View style={[s.etaUniDiv, { backgroundColor: etaAccent + '33' }]} />
              {/* Compact End button inline with stats — minimal vertical space */}
              <TouchableOpacity
                style={[s.etaEndInline, { backgroundColor: '#EF4444' }]}
                onPress={nav.stopNavigation}
                activeOpacity={0.85}
              >
                <Ionicons name="close" size={16} color="#fff" />
                <Text style={s.etaEndInlineT}>End</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        );
      })()}

      {/* ═══ ROUTE PREVIEW ════════════════════════════════════════════════ */}
      {nav.showRoutePreview && nav.navigationData && !nav.isNavigating && (() => {
        const fastestRoute = nav.availableRoutes.find((r) => r.routeType === 'best') ?? nav.availableRoutes[0];
        const ecoRoute     = nav.availableRoutes.find((r) => r.routeType === 'eco')  ?? nav.availableRoutes[nav.availableRoutes.length - 1];
        const fastestTraffic = fastestRoute ? analyzeCongestion(fastestRoute.congestion) : null;
        const ecoTraffic     = ecoRoute     ? analyzeCongestion(ecoRoute.congestion)     : null;
        const selectedRoute  = nav.availableRoutes[nav.selectedRouteIndex];
        const isFastestSel   = selectedRoute?.routeType === 'best' || nav.selectedRouteIndex === 0;

        const timeSaving = (fastestRoute && ecoRoute)
          ? Math.max(0, Math.round((ecoRoute.duration - fastestRoute.duration) / 60))
          : 0;

        return (
        <Animated.View entering={SlideInDown.duration(320).easing((t) => 1 - Math.pow(1 - t, 3))} exiting={SlideOutDown.duration(220)} style={[s.preview, { paddingBottom: Math.max(insets.bottom, 20) + 16, backgroundColor: isLight ? 'rgba(255,255,255,0.97)' : 'rgba(15,23,42,0.97)', borderColor: colors.border }]}>
          <View style={[s.handle, { backgroundColor: colors.border }]} />
          {/* Destination header */}
          <Text style={[s.previewTitle, { color: colors.text }]} numberOfLines={1}>
            {nav.navigationData!.destination.name ?? 'Destination'}
          </Text>

          {/* ── Fastest / Eco route cards ── */}
          <View style={s.routeOpts}>
            {/* FASTEST card */}
            {fastestRoute && (
              <TouchableOpacity
                style={[s.routeCardNew, isFastestSel && s.routeCardNewSel, { backgroundColor: colors.surfaceSecondary, borderColor: isFastestSel ? '#3B82F6' : colors.border }]}
                onPress={() => nav.handleRouteSelect('best')}
                activeOpacity={0.85}
              >
                <View style={s.routeCardHeader}>
                  <View style={[s.routeCardIcon, { backgroundColor: '#EFF6FF' }]}>
                    <Ionicons name="flash" size={16} color="#2563EB" />
                  </View>
                  <Text style={[s.routeCardType, { color: isFastestSel ? '#2563EB' : colors.textSecondary }]}>Fastest</Text>
                  {isFastestSel && <View style={s.routeCardCheck}><Ionicons name="checkmark" size={12} color="#fff" /></View>}
                </View>
                <Text style={[s.routeCardDuration, { color: colors.text }]}>{fastestRoute.durationText}</Text>
                <Text style={[s.routeCardDist, { color: colors.textSecondary }]}>{fastestRoute.distanceText}</Text>
                {fastestTraffic && fastestTraffic.level !== 'low' && (
                  <View style={[s.routeTrafficBadge, { backgroundColor: fastestTraffic.level === 'heavy' ? '#FEF2F2' : '#FFFBEB' }]}>
                    <Ionicons name="warning" size={10} color={fastestTraffic.level === 'heavy' ? '#DC2626' : '#D97706'} />
                    <Text style={[s.routeTrafficTxt, { color: fastestTraffic.level === 'heavy' ? '#DC2626' : '#D97706' }]}>
                      {fastestTraffic.level === 'heavy' ? 'Heavy' : 'Moderate'} traffic
                      {fastestTraffic.delayMin > 0 ? ` +${fastestTraffic.delayMin} min` : ''}
                    </Text>
                  </View>
                )}
                {(!fastestTraffic || fastestTraffic.level === 'low') && (
                  <View style={[s.routeTrafficBadge, { backgroundColor: '#F0FDF4' }]}>
                    <Ionicons name="checkmark-circle" size={10} color="#16A34A" />
                    <Text style={[s.routeTrafficTxt, { color: '#16A34A' }]}>Clear roads</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}

            {/* ECO card */}
            {ecoRoute && ecoRoute !== fastestRoute && (
              <TouchableOpacity
                style={[s.routeCardNew, !isFastestSel && s.routeCardNewSel, { backgroundColor: colors.surfaceSecondary, borderColor: !isFastestSel ? '#16A34A' : colors.border }]}
                onPress={() => nav.handleRouteSelect('eco')}
                activeOpacity={0.85}
              >
                <View style={s.routeCardHeader}>
                  <View style={[s.routeCardIcon, { backgroundColor: '#F0FDF4' }]}>
                    <Ionicons name="leaf" size={16} color="#16A34A" />
                  </View>
                  <Text style={[s.routeCardType, { color: !isFastestSel ? '#16A34A' : colors.textSecondary }]}>Eco Save</Text>
                  {!isFastestSel && <View style={[s.routeCardCheck, { backgroundColor: '#16A34A' }]}><Ionicons name="checkmark" size={12} color="#fff" /></View>}
                </View>
                <Text style={[s.routeCardDuration, { color: colors.text }]}>{ecoRoute.durationText}</Text>
                <Text style={[s.routeCardDist, { color: colors.textSecondary }]}>{ecoRoute.distanceText}</Text>
                <View style={[s.routeTrafficBadge, { backgroundColor: '#F0FDF4' }]}>
                  <Ionicons name="leaf" size={10} color="#16A34A" />
                  <Text style={[s.routeTrafficTxt, { color: '#16A34A' }]}>
                    Saves fuel{timeSaving > 0 ? ` · ${timeSaving} min longer` : ''}
                  </Text>
                </View>
                {ecoTraffic && ecoTraffic.level !== 'low' && (
                  <View style={[s.routeTrafficBadge, { backgroundColor: '#FFFBEB', marginTop: 3 }]}>
                    <Ionicons name="warning" size={10} color="#D97706" />
                    <Text style={[s.routeTrafficTxt, { color: '#D97706' }]}>{ecoTraffic.level === 'heavy' ? 'Heavy' : 'Moderate'} traffic</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>

          {hasTallVehicle && (
            <View style={s.truckRow}>
              <Ionicons name="car-outline" size={16} color={colors.primary} />
              <Text style={[s.truckLbl, { color: colors.primary }]}>Avoid low clearances ({vehicleHeight?.toFixed(1)}m)</Text>
              <Switch value={avoidLowClearances} onValueChange={setAvoidLowClearances} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
            </View>
          )}
          <TouchableOpacity onPress={() => {
            if (isCalm) {
              // Cinematic calm sequence:
              // 1. Pull back to show the route overview
              cameraRef.current?.setCamera({
                centerCoordinate: [location.lng, location.lat],
                zoomLevel: 12, pitch: 20, heading: 0,
                animationDuration: 600, animationMode: 'flyTo',
              });
              // 2. Start nav, then swoop in to 3D follow camera
              setTimeout(() => {
                nav.startNavigation();
                cameraRef.current?.setCamera({
                  centerCoordinate: [location.lng, location.lat],
                  zoomLevel: 16, pitch: 55, heading: headingRef.current,
                  animationDuration: 1400, animationMode: 'easeTo',
                });
              }, 700);
            } else if (isSport) {
              // Sport: instant snap into aggressive racing view
              nav.startNavigation();
              cameraRef.current?.setCamera({
                centerCoordinate: [location.lng, location.lat],
                zoomLevel: 17.5, pitch: 65, heading: headingRef.current,
                animationDuration: 400, animationMode: 'easeTo',
              });
            } else {
              cameraRef.current?.setCamera({
                centerCoordinate: [location.lng, location.lat],
                zoomLevel: 13, pitch: 30, heading: 0, animationDuration: 300,
              });
              setTimeout(() => {
                nav.startNavigation();
                cameraRef.current?.setCamera({
                  centerCoordinate: [location.lng, location.lat],
                  zoomLevel: 17, pitch: 60, heading: headingRef.current,
                  animationDuration: 800,
                });
              }, 350);
            }
          }} activeOpacity={0.85}>
            <LinearGradient
              colors={isFastestSel ? ['#2563EB', '#1D4ED8'] : ['#16A34A', '#15803D']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={s.startBtn}
            >
              <Ionicons name={isFastestSel ? 'flash-outline' : 'leaf-outline'} size={18} color="#fff" />
              <Text style={s.startBtnT}>
                Start {isFastestSel ? 'Fastest' : 'Eco'} Route
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
        );
      })()}

      {/* ═══ TRIP SUMMARY ═════════════════════════════════════════════════ */}
      {nav.tripSummary && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={s.tripOverlay}>
          <Animated.View entering={SlideInDown.springify().damping(22).stiffness(200)} style={[s.tripCard, { paddingBottom: Math.max(insets.bottom, 20) + 16, backgroundColor: isLight ? 'rgba(255,255,255,0.97)' : 'rgba(15,23,42,0.97)' }]}>
            <Text style={[s.tripTitle, { color: colors.text }]}>Trip Summary</Text>
            <Text style={[s.tripRoute, { color: colors.textTertiary }]}>{nav.tripSummary.origin} → {nav.tripSummary.destination}</Text>
            <View style={s.tripGrid}>
              {[
                { l: 'Distance', v: `${nav.tripSummary.distance.toFixed(1)} mi`, c: colors.text },
                { l: 'Time', v: formatDuration(nav.tripSummary.duration), c: colors.text },
                { l: 'Safety', v: String(nav.tripSummary.safety_score), c: colors.success },
                { l: 'Gems', v: `+${nav.tripSummary.gems_earned}`, c: colors.warning },
                { l: 'XP', v: `+${nav.tripSummary.xp_earned}`, c: '#4f46e5' },
              ].map((stat) => (
                <View key={stat.l} style={[s.tripStat, { backgroundColor: colors.surfaceSecondary }]}>
                  <Text style={[s.tripStatL, { color: colors.textTertiary }]}>{stat.l}</Text>
                  <Text style={[s.tripStatV, { color: stat.c }]}>{stat.v}</Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={[s.tripDone, { backgroundColor: 'rgba(59,130,246,0.12)', flex: 1 }]} onPress={() => setShowTripShare(true)}>
                <Text style={[s.tripDoneT, { color: colors.primary }]}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.tripDone, { backgroundColor: colors.primary, flex: 2 }]} onPress={nav.dismissTripSummary}>
                <Text style={s.tripDoneT}>Done</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      )}

      {/* ═══ FLOATING BUTTONS ═════════════════════════════════════════════ */}

      {!nav.showRoutePreview && !nav.tripSummary && !selectedPlace && !selectedPlaceId && (
        <TouchableOpacity style={[s.reportFab, { bottom: (nav.isNavigating ? 100 : 40) + insets.bottom, right: 16 }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowReportPicker(true); }}
          onLongPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); setShowPhotoReport(true); }}>
          <Ionicons name="camera-outline" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      )}

      {!nav.showRoutePreview && !nav.tripSummary && !nav.isNavigating && !selectedPlace && !selectedPlaceId && (
        <TouchableOpacity style={[s.communityBtn, { bottom: 40 + insets.bottom, left: 16 }]} onPress={() => setShowCommunitySheet(true)}>
          <Ionicons name="people-outline" size={18} color={colors.text} /><Text style={[s.communityT, { color: colors.text }]}>Community</Text>
        </TouchableOpacity>
      )}

      {((nav.isNavigating && !cameraLocked) || (!nav.isNavigating && isExploring && !isSearchFocused && !nav.showRoutePreview && !nav.tripSummary)) && (
        <TouchableOpacity style={[s.recenter, { top: insets.top + 88 }]} onPress={handleRecenter}>
          <Text style={s.recenterT}>Recenter</Text>
        </TouchableOpacity>
      )}

      {!nav.isNavigating && !nav.showRoutePreview && (
        <TouchableOpacity style={[s.orionFab, { top: insets.top + 210 }]} onPress={() => setShowOrion(true)} activeOpacity={0.8}>
          <LinearGradient colors={user?.isPremium ? ['#7C3AED', '#5B21B6'] : ['#94a3b8', '#64748b']} style={s.orionGrad}>
            <Ionicons name="mic-outline" size={22} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      )}

      {!nav.isNavigating && !nav.showRoutePreview && !selectedPlace && !selectedPlaceId && nearbyOffers.length > 0 && (
        <View style={[s.offerPill, { bottom: 50 + insets.bottom, backgroundColor: isLight ? 'rgba(255,255,255,0.92)' : 'rgba(30,30,46,0.92)', borderColor: colors.border }]}>
          <Text style={{ fontSize: 14 }}>💎</Text><Text style={[s.offerPillT, { color: colors.text }]}>{nearbyOffers.length} offers nearby</Text>
          <View style={[s.offerBadge, { backgroundColor: colors.success }]}><Text style={s.offerBadgeT}>{nearbyOffers.length}</Text></View>
        </View>
      )}

      {!nav.isNavigating && !nav.showRoutePreview && !selectedPlace && !selectedPlaceId && (
        <View style={[s.modeRow, { bottom: insets.bottom + 16 }]}>
          {(Object.entries(DRIVING_MODES) as [DrivingMode, typeof modeConfig][]).map(([mode, cfg]) => {
            const sel = drivingMode === mode;
            const modeIcon = mode === 'calm' ? 'leaf-outline' : mode === 'sport' ? 'flash-outline' : 'pulse-outline';
            return (
              <TouchableOpacity
                key={mode}
                style={[
                  s.modePill,
                  { backgroundColor: sel ? cfg.color : isLight ? 'rgba(255,255,255,0.92)' : 'rgba(30,30,46,0.92)' },
                  sel && mode === 'calm' && s.modePillCalmSel,
                ]}
                onPress={() => setDrivingMode(mode)}
                activeOpacity={0.7}
              >
                <Ionicons name={modeIcon as any} size={14} color={sel ? '#fff' : colors.textSecondary} style={{ marginRight: 4 }} />
                <Text style={[s.modeT, { color: sel ? '#fff' : colors.textSecondary, fontWeight: sel ? '700' : '500' }]}>{cfg.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {speed > 1 && !selectedPlace && !selectedPlaceId && (() => {
        const currentSpeedLimit = nav.isNavigating && nav.navigationData?.maxspeeds
          ? nav.navigationData.maxspeeds[Math.min(nav.currentStepIndex, nav.navigationData.maxspeeds.length - 1)]
          : null;
        const isOverSpeed = typeof currentSpeedLimit === 'number' && speed > currentSpeedLimit;
        return (
          <View style={{ position: 'absolute', left: 14, bottom: (nav.isNavigating ? 100 : 40) + insets.bottom, alignItems: 'center', gap: 6 }}>
            {currentSpeedLimit !== null && currentSpeedLimit !== undefined && nav.isNavigating && (
              <View style={[s.speedLimitSign, isOverSpeed && { borderColor: '#FF3B30' }]}>
                <Text style={s.speedLimitNum}>{currentSpeedLimit}</Text>
                <Text style={s.speedLimitUnit}>LIMIT</Text>
              </View>
            )}
            <View style={[s.speedBadge, { borderColor: isOverSpeed ? '#FF3B30' : drivingMode === 'calm' ? '#60a5fa' : drivingMode === 'sport' ? '#ef4444' : colors.border, backgroundColor: isLight ? 'rgba(255,255,255,0.95)' : 'rgba(15,23,42,0.92)' }]}>
              <Text style={[s.speedVal, { color: isOverSpeed ? '#FF3B30' : drivingMode === 'sport' ? '#ef4444' : drivingMode === 'calm' ? '#3b82f6' : colors.text }]}>{Math.round(speed)}</Text>
              <Text style={[s.speedUnit, { color: colors.textTertiary }]}>mph</Text>
            </View>
          </View>
        );
      })()}

      {!nav.isNavigating && !nav.showRoutePreview && (
        <>
          <TouchableOpacity style={[s.layerBtn, { top: insets.top + 100, backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowStylePicker(true); }}>
            <Ionicons name="layers-outline" size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.layerBtn, { top: insets.top + 152, backgroundColor: compassMode ? colors.primary : colors.surface, borderColor: compassMode ? colors.primary : colors.border }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setCompassMode((prev) => {
                if (!prev) setIsExploring(false);
                return !prev;
              });
            }}>
            <Ionicons name="compass-outline" size={20} color={compassMode ? '#fff' : colors.text} />
          </TouchableOpacity>
        </>
      )}

      {isLocating && <View style={[s.locBanner, { top: insets.top + 84 }]}><Text style={s.locT}>Finding your location...</Text></View>}

      {/* ═══ SHEETS / OVERLAYS ════════════════════════════════════════════ */}

      {showReportPicker && (
        <View style={s.overlay}>
          <TouchableOpacity style={s.overlayBg} onPress={() => setShowReportPicker(false)} activeOpacity={1} />
          <View style={[s.sheet, { backgroundColor: colors.surface }]}>
            <Text style={[s.sheetTitle, { color: colors.text }]}>Report on road</Text>
            <View style={s.sheetGrid}>
              {REPORT_TYPES.map((rt) => (
                <TouchableOpacity key={rt.type} style={s.sheetItem} onPress={() => handleSubmitReport(rt.type)}>
                  <View style={s.sheetIcon}><Ionicons name={rt.icon} size={22} color="#fff" /></View>
                  <Text style={[s.sheetLbl, { color: colors.textSecondary }]}>{rt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}

      {showCommunitySheet && (
        <View style={s.overlay}>
          <TouchableOpacity style={s.overlayBg} onPress={() => setShowCommunitySheet(false)} activeOpacity={1} />
          <View style={[s.communitySheet, { backgroundColor: colors.surface }]}>
            <View style={s.communityHdr}><Text style={[s.communityHdrT, { color: colors.text }]}>Community Reports</Text><TouchableOpacity onPress={() => setShowCommunitySheet(false)}><Ionicons name="close" size={18} color={colors.textTertiary} /></TouchableOpacity></View>
            {nearbyIncidents.length === 0 ? <Text style={[s.communityEmpty, { color: colors.textTertiary }]}>No nearby reports yet.</Text> : (
              <FlatList data={nearbyIncidents.slice(0, 30)} keyExtractor={(i) => String(i.id)} contentContainerStyle={{ paddingBottom: 12 }}
                renderItem={({ item }) => (
                  <View style={[s.communityItem, { backgroundColor: colors.surfaceSecondary }]}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={[s.ciTitle, { color: colors.text }]}>{item.title}</Text>
                      <Text style={[s.ciSub, { color: colors.textTertiary }]}>{typeof item.distance_miles === 'number' ? `${item.distance_miles.toFixed(1)} mi` : 'Nearby'} · {timeAgo(item.created_at)}</Text>
                    </View>
                    <TouchableOpacity style={s.ciVote} onPress={() => handleUpvote(item)}>
                      <Ionicons name="thumbs-up-outline" size={14} color="#fff" /><Text style={s.ciVoteT}>{item.upvotes}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      )}

      {showStylePicker && (
        <View style={s.overlay}>
          <TouchableOpacity style={s.overlayBg} onPress={() => setShowStylePicker(false)} activeOpacity={1} />
          <View style={[s.sheet, { backgroundColor: colors.surface }]}>
            <Text style={[s.sheetTitle, { color: colors.text }]}>Map Style</Text>
            <View style={s.sheetGrid}>
              {MAP_STYLES.map((ms, i) => (
                <TouchableOpacity key={ms.key} style={s.sheetItem} onPress={() => { setStyleOverride(i); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                  <View style={[s.sheetIcon, styleOverride === i && { borderWidth: 2, borderColor: colors.primary }]}>
                    <Ionicons name={ms.icon} size={22} color={styleOverride === i ? colors.primary : colors.textSecondary} />
                  </View>
                  <Text style={[s.sheetLbl, { color: styleOverride === i ? colors.primary : colors.textSecondary }]}>{ms.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[s.layerSectionT, { color: colors.text }]}>Layers</Text>
            {[
              { k: 'traffic', l: 'Traffic', ic: 'car-outline' as const, v: showTraffic, t: setShowTraffic },
              { k: 'incidents', l: 'Incidents', ic: 'warning-outline' as const, v: showIncidents, t: setShowIncidents },
              { k: 'cameras', l: 'Cameras', ic: 'videocam-outline' as const, v: showCameras, t: setShowCameras },
              { k: 'construction', l: 'Construction', ic: 'construct-outline' as const, v: showConstruction, t: setShowConstruction },
              { k: 'fuel', l: 'Gas Stations', ic: 'flash-outline' as const, v: showFuel, t: setShowFuel },
              { k: 'photos', l: 'Photo Reports', ic: 'camera-outline' as const, v: showPhotoReports, t: setShowPhotoReports },
            ].map((ly) => (
              <View key={ly.k} style={s.layerRow}>
                <Ionicons name={ly.ic} size={18} color={colors.textSecondary} />
                <Text style={[s.layerLbl, { color: colors.text }]}>{ly.l}</Text>
                <Switch value={ly.v} onValueChange={ly.t} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
              </View>
            ))}
          </View>
        </View>
      )}

      <PhotoReportSheet visible={showPhotoReport} lat={location.lat} lng={location.lng} onClose={() => setShowPhotoReport(false)} isLight={isLight} />
      <HamburgerMenu visible={showMenu} onClose={() => setShowMenu(false)} isLight={isLight} onNavigate={() => setShowMenu(false)} />
      {showGemOverlay && <GemOverlay visible={showGemOverlay} gemsEarned={gemOverlayAmount} onDone={() => setShowGemOverlay(false)} />}
      <TripShare visible={showTripShare} onClose={() => setShowTripShare(false)} trip={nav.tripSummary ?? null} />

      <OrionChat
        visible={showOrion}
        onClose={() => setShowOrion(false)}
        isPremium={user?.isPremium ?? false}
        context={{ lat: location.lat, lng: location.lng, isNavigating: nav.isNavigating, drivingMode, destination: nav.navigationData?.destination?.name, speed }}
        onAction={(action) => {
          if (action.type === 'navigate' && action.lat && action.lng) {
            setShowOrion(false);
            handleSelectResult({ name: action.name ?? 'Destination', address: '', lat: action.lat, lng: action.lng });
          } else if (action.type === 'mode' && action.name) {
            const m = action.name.toLowerCase();
            if (m === 'calm' || m === 'adaptive' || m === 'sport') setDrivingMode(m as DrivingMode);
          }
        }}
      />
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// STYLES
// ═════════════════════════════════════════════════════════════════════════════

const shadow = (r = 8, o = 0.12) => Platform.select({
  ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: o, shadowRadius: r } as const,
  android: { elevation: Math.round(r / 2) } as const,
  default: {} as const,
});

const s = StyleSheet.create({
  root: { flex: 1 },
  map: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Placeholder
  placeholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f17', gap: 8 },
  phTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 8 },
  phSub: { color: '#888', fontSize: 13, textAlign: 'center', paddingHorizontal: 40 },
  phCoord: { color: '#3B82F6', fontSize: 12, fontWeight: '600', marginTop: 8 },

  // Top bar
  topBar: { position: 'absolute', left: 16, right: 16, zIndex: 15 },
  searchRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  menuBtn: { width: 44, height: 44, borderRadius: 13, justifyContent: 'center', alignItems: 'center', borderWidth: 1, ...shadow(8) },
  searchPill: { flex: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, ...shadow(12, 0.15) },
  searchInput: { flex: 1, fontSize: 16 },
  chipRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1, flexDirection: 'row' as const, alignItems: 'center' as const, ...shadow(6, 0.1) },
  quickPlace: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginRight: 8, minWidth: 110, borderWidth: 1, ...shadow(6, 0.1) },
  qpTitle: { fontSize: 14, fontWeight: '600' },
  qpSub: { fontSize: 11, maxWidth: 100 },
  results: { marginTop: 6, borderRadius: 16, maxHeight: 280, overflow: 'hidden', borderWidth: 1, ...shadow(16, 0.18) },
  recentHeader: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
  resultRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  resultName: { fontSize: 15, fontWeight: '600' },
  resultAddr: { fontSize: 12, marginTop: 3 },

  // ─── Unified premium turn card (larger, Google Maps–inspired) ───────────
  turnWrap: { position: 'absolute', left: 0, right: 0, zIndex: 25 },
  tcPremWrap: {
    marginHorizontal: 10,
    marginTop: Platform.OS === 'ios' ? 4 : 8,
    overflow: 'hidden',
  },
  // Larger padding for a more premium feel
  tcPremGrad: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  tcPremRow: { flexDirection: 'row', alignItems: 'center' },
  // Distance block: bigger numbers
  tcPremDistBlock: { alignItems: 'center', minWidth: 60, flexShrink: 0 },
  tcPremDistVal: { color: '#fff', fontSize: 32, fontWeight: '900', letterSpacing: -1.5, lineHeight: 34 },
  tcPremDistUnit: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '700', marginTop: -2, textTransform: 'uppercase', letterSpacing: 0.5 },
  // Icon box: larger
  tcPremIconBox: {
    width: 60, height: 60, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.32)',
    justifyContent: 'center', alignItems: 'center',
    marginHorizontal: 14, flexShrink: 0,
  },
  tcPremInstrBlock: { flex: 1, minWidth: 0 },
  // Instruction: slightly larger
  tcPremInstr: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: -0.3, lineHeight: 24 },
  tcPremThenRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  tcPremThen: { color: 'rgba(255,255,255,0.70)', fontSize: 13, fontWeight: '600', flex: 1 },
  tcPremMute: { paddingLeft: 12, paddingTop: 2, flexShrink: 0 },
  // Road strip: slightly more visible
  tcPremRoadStrip: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 8, paddingTop: 7,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.16)',
  },
  tcPremRoadTxt: { color: 'rgba(255,255,255,0.62)', fontSize: 12, fontWeight: '500', flex: 1 },
  // Road shield badge (mimics highway markers)
  tcRoadShield: {
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.30)',
    flexShrink: 0,
  },
  tcRoadShieldTxt: { color: '#fff', fontSize: 10, fontWeight: '700' },

  // Legacy turn card refs (kept so old styles don't crash)
  turnCard: { margin: 12, marginTop: Platform.OS === 'ios' ? 8 : 12, borderRadius: 20, flexDirection: 'row', padding: 16, alignItems: 'center', ...shadow(24, 0.5) },
  turnIcon: { width: 52, height: 52, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' },
  turnText: { flex: 1 },
  turnInstr: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  turnThen: { color: 'rgba(255,255,255,0.72)', fontSize: 13, marginTop: 4 },
  turnDist: { color: '#fff', fontSize: 22, fontWeight: '800', marginLeft: 8 },

  // Report card
  reportCard: { position: 'absolute', left: 16, right: 16, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', zIndex: 20, borderLeftWidth: 4, backgroundColor: 'rgba(15,23,42,0.92)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', ...shadow(16, 0.35) },
  rcTitle: { color: '#f8fafc', fontSize: 14, fontWeight: '700' },
  rcSub: { color: '#94a3b8', fontSize: 11, marginTop: 3 },
  rcVote: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#2563EB', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, marginLeft: 10 },
  rcVoteT: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // Confirm card
  confirmCard: { position: 'absolute', left: 16, right: 16, backgroundColor: 'rgba(15,23,42,0.92)', borderRadius: 18, padding: 18, zIndex: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', ...shadow(16, 0.35) },
  confirmTitle: { color: '#f8fafc', fontSize: 15, fontWeight: '700' },
  confirmBtn: { borderRadius: 12, paddingHorizontal: 28, paddingVertical: 11 },
  confirmBtnT: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Ambient
  ambientBadge: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(15,23,42,0.88)', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 22, zIndex: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  ambientText: { color: '#60a5fa', fontSize: 12, fontWeight: '700' },

  // Rerouting banner
  reroutingBanner: {
    position: 'absolute', alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.88)',
    paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 22, zIndex: 25,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    ...shadow(12, 0.3),
  },
  reroutingBannerCalm: {
    backgroundColor: 'rgba(235,245,255,0.96)',
    borderColor: 'rgba(107,164,232,0.3)',
    ...Platform.select({
      ios: { shadowColor: '#6BA4E8', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 6 },
      default: {},
    }),
  },
  reroutingText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // ─── Unified ETA bar: single compact row ────────────────────────────────
  etaBarUnified: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 12, paddingTop: 10,
    flexDirection: 'row',              // single row — stats + End button inline
    borderTopWidth: 1.5,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 14, shadowOffset: { width: 0, height: -3 } },
      android: { elevation: 12 },
      default: {},
    }),
  },
  etaStatsRow: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  etaEndInline: {
    flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8, marginLeft: 8,
    gap: 2,
    ...Platform.select({
      ios: { shadowColor: '#EF4444', shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 6 },
      default: {},
    }),
  },
  etaEndInlineT: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  etaUniCol: { flex: 1, alignItems: 'center' },
  etaUniLbl: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.9 },
  etaUniValAccent: { fontSize: 21, fontWeight: '900', marginTop: 3, letterSpacing: -0.5 },
  etaUniVal: { fontSize: 18, fontWeight: '800', marginTop: 3 },
  etaUniDiv: { width: 1, height: 38 },
  etaUniSpeedBlock: { alignItems: 'center', minWidth: 48 },
  etaUniSpeedVal: { fontSize: 28, fontWeight: '900', letterSpacing: -1, lineHeight: 30 },
  etaUniSpeedUnit: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: -2 },
  // End button: full-width row below stats
  etaEndRowBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 16, paddingVertical: 14,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#EF4444', shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
      android: { elevation: 8 },
      default: {},
    }),
  },
  etaEndRowBtnT: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },
  // Legacy refs kept to avoid style-sheet crashes
  etaUniEnd: {
    backgroundColor: '#EF4444', borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 13, marginLeft: 12,
  },
  etaUniEndT: { color: '#fff', fontSize: 14, fontWeight: '800' },

  // Legacy ETA refs (kept so StyleSheet.create doesn't crash on old refs)
  etaBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, ...shadow(12, 0.08) },
  etaCol: { flex: 1, alignItems: 'center' },
  etaLbl: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  etaVal: { fontSize: 17, fontWeight: '800', marginTop: 2 },
  etaDiv: { width: 1, height: 28 },
  endBtn: { backgroundColor: '#FF3B30', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 11, marginLeft: 12, ...shadow(8, 0.3) },
  endBtnT: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // ─── Traffic congestion banner ──────────────────────────────────────────
  trafficBanner: {
    position: 'absolute', left: 14, right: 14,
    borderRadius: 16, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
    zIndex: 22,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
      android: { elevation: 10 },
      default: {},
    }),
  },
  trafficBannerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  trafficBannerTitle: { fontSize: 13, fontWeight: '800', marginBottom: 2 },
  trafficBannerSub: { fontSize: 11, fontWeight: '600' },
  trafficBannerActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 10 },
  trafficRerouteBtn: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  trafficRerouteBtnT: { color: '#fff', fontSize: 12, fontWeight: '800' },
  trafficDismissBtn: { padding: 4 },

  // ─── Route preview ───────────────────────────────────────────────────────
  preview: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, borderTopWidth: 1, ...shadow(20, 0.18) },
  handle: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 14 },
  previewTitle: { fontSize: 19, fontWeight: '800', marginBottom: 16, letterSpacing: -0.3 },
  routeOpts: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  // Legacy routeBtn kept for compatibility
  routeBtn: { flex: 1, padding: 14, borderRadius: 16, alignItems: 'center', borderWidth: 1 },
  routeLbl: { fontSize: 15, fontWeight: '700' },
  routeSub: { fontSize: 12, marginTop: 3 },
  // New Fastest / Eco route cards
  routeCardNew: {
    flex: 1, borderRadius: 18, padding: 14, borderWidth: 2,
    borderColor: 'transparent',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 3 },
      default: {},
    }),
  },
  routeCardNewSel: Platform.select({
    ios: { shadowOpacity: 0.18, shadowRadius: 12 },
    android: { elevation: 6 },
    default: {},
  }),
  routeCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
  routeCardIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  routeCardType: { fontSize: 12, fontWeight: '700', flex: 1, textTransform: 'uppercase', letterSpacing: 0.5 },
  routeCardCheck: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' },
  routeCardDuration: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5, lineHeight: 24 },
  routeCardDist: { fontSize: 12, fontWeight: '500', marginTop: 2, marginBottom: 8 },
  routeTrafficBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
  routeTrafficTxt: { fontSize: 10, fontWeight: '700' },
  truckRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14, paddingHorizontal: 4 },
  truckLbl: { flex: 1, fontSize: 13, fontWeight: '600' },
  startBtn: { borderRadius: 18, paddingVertical: 16, height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, ...shadow(16, 0.4) },
  startBtnT: { color: '#fff', fontSize: 16, fontWeight: '800' },

  // Trip summary
  tripOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  tripCard: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24 },
  tripTitle: { fontSize: 22, fontWeight: '800', marginBottom: 4, letterSpacing: -0.3 },
  tripRoute: { fontSize: 13, marginBottom: 18 },
  tripGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 22 },
  tripStat: { width: '47%' as any, borderRadius: 16, padding: 14 },
  tripStatL: { fontSize: 12, fontWeight: '500' },
  tripStatV: { fontSize: 20, fontWeight: '800', marginTop: 2 },
  tripDone: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', ...shadow(12, 0.3) },
  tripDoneT: { color: '#fff', fontSize: 16, fontWeight: '800' },

  // Floating buttons
  reportFab: { position: 'absolute', width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.94)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', ...shadow(8, 0.12) },
  communityBtn: { position: 'absolute', minHeight: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.94)', paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', ...shadow(8, 0.12) },
  communityT: { fontSize: 12, fontWeight: '700' },
  recenter: { position: 'absolute', alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.8)', paddingHorizontal: 22, paddingVertical: 10, borderRadius: 22, zIndex: 12 },
  recenterT: { color: '#fff', fontSize: 13, fontWeight: '700' },
  orionFab: { position: 'absolute', right: 16, zIndex: 12 },
  orionGrad: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', ...shadow(16, 0.5) },
  offerPill: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 22, borderWidth: 1, ...shadow(10, 0.15), zIndex: 10 },
  offerPillT: { fontSize: 13, fontWeight: '700' },
  offerBadge: { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  offerBadgeT: { color: '#fff', fontSize: 10, fontWeight: '800' },
  modeRow: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', gap: 8, zIndex: 10 },
  modePill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 11, borderRadius: 22, ...shadow(8, 0.18) },
  modePillCalmSel: Platform.select({
    ios: { shadowColor: '#6BA4E8', shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
    android: { elevation: 6 },
    default: {},
  }),
  modeT: { fontSize: 13, letterSpacing: 0.2 },

  // ─── Adaptive turn card ─────────────────────────────────────────────────
  turnCardAdaptive: {
    margin: 12,
    marginTop: Platform.OS === 'ios' ? 8 : 12,
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#1D4ED8', shadowOpacity: 0.45, shadowRadius: 18, shadowOffset: { width: 0, height: 5 } },
      android: { elevation: 12 },
      default: {},
    }),
  },
  tcAdaptiveRow: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  tcAdaptiveIcon: {
    width: 50, height: 50, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12, flexShrink: 0,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)',
  },
  tcAdaptiveText: { flex: 1 },
  tcAdaptiveInstr: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: -0.4, lineHeight: 22 },
  tcAdaptiveThen: { color: 'rgba(255,255,255,0.70)', fontSize: 12, marginTop: 3 },
  tcAdaptiveRight: { alignItems: 'flex-end', marginLeft: 10 },
  tcAdaptiveDist: { color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },

  // ─── Adaptive ETA bar ───────────────────────────────────────────────────
  etaBarAdaptive: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 12,
    flexDirection: 'row', alignItems: 'center',
    borderTopWidth: 1.5,
    ...Platform.select({
      ios: { shadowColor: '#3B82F6', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: -2 } },
      android: { elevation: 8 },
      default: {},
    }),
  },
  etaAdaptiveMain: { alignItems: 'center', minWidth: 72 },
  etaAdaptiveLbl: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  etaAdaptiveVal: { fontSize: 22, fontWeight: '900', color: '#3B82F6', marginTop: 2, letterSpacing: -0.6 },
  etaAdaptiveSec: { flex: 1, alignItems: 'center' },
  etaAdaptiveSecLbl: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  etaAdaptiveSecVal: { fontSize: 16, fontWeight: '700', marginTop: 2 },
  endBtnAdaptive: { borderRadius: 14, marginLeft: 14 },

  // ─── Calm user location puck ────────────────────────────────────────────
  calmPuckOuter: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  calmPuckRing: {
    position: 'absolute',
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 2.5, borderColor: 'rgba(74,222,128,0.55)',
    backgroundColor: 'rgba(74,222,128,0.12)',
  },
  calmPuckArrow: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#22C55E',
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#16A34A', shadowOpacity: 0.55, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 8 },
      default: {},
    }),
  },

  // ─── Calm turn card ─────────────────────────────────────────────────────
  turnCardCalmWrap: {
    margin: 14,
    marginTop: Platform.OS === 'ios' ? 6 : 10,
    borderRadius: 28,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#2563EB', shadowOpacity: 0.32, shadowRadius: 20, shadowOffset: { width: 0, height: 6 } },
      android: { elevation: 14 },
      default: {},
    }),
  },
  turnCardCalmGrad: { borderRadius: 28, padding: 20, paddingBottom: 16 },
  tcCalmTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  tcCalmIconBox: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)',
    flexShrink: 0,
  },
  tcCalmInstr: { color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: -0.4, lineHeight: 26 },
  tcCalmDistBox: { alignItems: 'center', marginLeft: 12, flexShrink: 0 },
  tcCalmDistVal: { color: '#fff', fontSize: 32, fontWeight: '900', lineHeight: 34, letterSpacing: -1 },
  tcCalmDistUnit: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600', marginTop: -2 },
  tcCalmNext: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.12)', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 8,
    marginBottom: 4,
  },
  tcCalmNextT: { color: 'rgba(255,255,255,0.82)', fontSize: 13, fontWeight: '600', flex: 1 },
  tcCalmMute: { position: 'absolute', top: 14, right: 14 },

  // ─── Calm ETA bar (pill cards) ──────────────────────────────────────────
  etaBarCalm: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(240,248,255,0.97)',
    paddingTop: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(107,164,232,0.2)',
    ...Platform.select({
      ios: { shadowColor: '#6BA4E8', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: -2 } },
      android: { elevation: 8 },
      default: {},
    }),
  },
  etaCalmRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  etaCalmPill: {
    flex: 1, alignItems: 'center',
    backgroundColor: 'rgba(107,164,232,0.14)',
    borderRadius: 18, paddingVertical: 10, paddingHorizontal: 8,
    borderWidth: 1, borderColor: 'rgba(107,164,232,0.22)',
  },
  etaCalmLbl: { fontSize: 9, fontWeight: '700', color: '#6B8FB5', textTransform: 'uppercase', letterSpacing: 0.9 },
  etaCalmVal: { fontSize: 19, fontWeight: '800', color: '#2C5F9E', marginTop: 2, letterSpacing: -0.5 },
  etaCalmEnd: {
    backgroundColor: '#E05252', borderRadius: 18,
    paddingHorizontal: 18, paddingVertical: 14,
    ...shadow(8, 0.28),
  },
  etaCalmEndT: { color: '#fff', fontSize: 14, fontWeight: '800' },

  // ─── Sport turn card ────────────────────────────────────────────────────
  turnCardSport: {
    margin: 10,
    marginTop: Platform.OS === 'ios' ? 6 : 10,
    borderRadius: 16,       // sharper than calm/adaptive
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    ...Platform.select({
      ios: { shadowColor: '#DC2626', shadowOpacity: 0.6, shadowRadius: 20, shadowOffset: { width: 0, height: 6 } },
      android: { elevation: 14 },
      default: {},
    }),
  },
  tcSportIcon: {
    width: 46, height: 46, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 11, flexShrink: 0,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  tcSportInstr: { color: '#fff', fontSize: 17, fontWeight: '900', letterSpacing: -0.3, lineHeight: 21, flex: 1 },
  tcSportThen: { color: 'rgba(255,255,255,0.60)', fontSize: 11, marginTop: 3, flex: 1 },
  tcSportDist: { color: '#fff', fontSize: 21, fontWeight: '900', letterSpacing: -0.5, marginLeft: 8 },

  // ─── Sport ETA bar ───────────────────────────────────────────────────────
  etaBarSport: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(15,15,35,0.96)',
    paddingHorizontal: 18, paddingTop: 12,
    flexDirection: 'row', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: 'rgba(239,68,68,0.35)',
    ...Platform.select({
      ios: { shadowColor: '#EF4444', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: -3 } },
      android: { elevation: 12 },
      default: {},
    }),
  },
  etaSportSpeed: { alignItems: 'center', minWidth: 60 },
  etaSportSpeedVal: { fontSize: 30, fontWeight: '900', color: '#EF4444', letterSpacing: -1 },
  etaSportSpeedUnit: { fontSize: 10, fontWeight: '700', color: 'rgba(239,68,68,0.7)', marginTop: -4, textTransform: 'uppercase', letterSpacing: 0.5 },
  etaSportCol: { flex: 1, alignItems: 'center' },
  etaSportLbl: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 0.8 },
  etaSportVal: { fontSize: 17, fontWeight: '800', color: '#fff', marginTop: 2 },
  etaSportValRed: { fontSize: 17, fontWeight: '800', color: '#EF4444', marginTop: 2 },
  etaSportEnd: {
    backgroundColor: '#EF4444',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 11, marginLeft: 10,
    ...Platform.select({
      ios: { shadowColor: '#EF4444', shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 8 },
      default: {},
    }),
  },

  // ─── Report card (new — all modes) ──────────────────────────────────────
  reportCardNew: {
    position: 'absolute', left: 16, right: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(10,16,38,0.95)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    zIndex: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 18, shadowOffset: { width: 0, height: 6 } },
      android: { elevation: 14 },
      default: {},
    }),
  },
  rcNewContent: { flexDirection: 'row', alignItems: 'center', padding: 14, paddingBottom: 10 },
  rcNewIcon: {
    width: 48, height: 48, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12, flexShrink: 0,
  },
  rcNewTextBlock: { flex: 1 },
  rcNewTitle: { color: '#f1f5f9', fontSize: 15, fontWeight: '800' },
  rcNewSub: { color: '#94a3b8', fontSize: 11, marginTop: 3 },
  rcNewVotes: { color: '#64748b', fontSize: 10, marginTop: 2, fontWeight: '600' },
  rcNewDismiss: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.07)',
    justifyContent: 'center', alignItems: 'center',
    marginLeft: 8, flexShrink: 0,
  },
  rcNewVoteRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 14, paddingBottom: 12,
  },
  rcNewVoteBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, borderRadius: 12, paddingVertical: 9,
  },
  rcNewVoteBtnT: { color: '#fff', fontSize: 13, fontWeight: '700' },
  rcUpvote: { backgroundColor: '#16A34A' },
  rcDownvote: { backgroundColor: '#475569' },
  rcNewTimerTrack: { height: 3, backgroundColor: 'rgba(255,255,255,0.08)' },
  rcNewTimerBar: { height: 3, borderRadius: 2 },

  // ─── Legacy calm overrides (kept for compatibility) ──────────────────────
  turnCardCalm: { borderRadius: 24 },
  turnIconCalm: { backgroundColor: 'rgba(255,255,255,0.2)' },
  endBtnCalm: { backgroundColor: '#E05252', borderRadius: 16 },
  speedLimitSign: { width: 44, height: 44, borderRadius: 22, borderWidth: 3, borderColor: '#DC2626', backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', ...shadow(6, 0.2) },
  speedLimitNum: { fontSize: 15, fontWeight: '900', color: '#000', lineHeight: 17 },
  speedLimitUnit: { fontSize: 7, fontWeight: '700', color: '#666', letterSpacing: 0.5 },
  speedBadge: { width: 58, height: 58, borderRadius: 29, borderWidth: 2.5, justifyContent: 'center', alignItems: 'center', ...shadow(10, 0.15) },
  speedVal: { fontSize: 17, fontWeight: '800' },
  speedUnit: { fontSize: 9, fontWeight: '600', marginTop: -1 },
  layerBtn: { position: 'absolute', right: 16, width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1, ...shadow(8, 0.15), zIndex: 12 },
  locBanner: { position: 'absolute', alignSelf: 'center', backgroundColor: 'rgba(59,130,246,0.92)', paddingHorizontal: 18, paddingVertical: 9, borderRadius: 22 },
  locT: { color: '#fff', fontSize: 13, fontWeight: '700' },
  destPinWrap: { alignItems: 'center' },
  destPin: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#DC2626', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff', ...shadow(12, 0.5) },
  destPinTail: { width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#DC2626', marginTop: -1 },

  // Sheets
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 50, justifyContent: 'flex-end' },
  overlayBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 40, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  sheetTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 16 },
  sheetGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16 },
  sheetItem: { alignItems: 'center', width: 70 },
  sheetIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: 'rgba(51,65,85,0.6)', justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  sheetLbl: { fontSize: 11, fontWeight: '600' },
  layerSectionT: { fontSize: 16, fontWeight: '800', marginTop: 20, marginBottom: 12 },
  layerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 4 },
  layerLbl: { flex: 1, fontSize: 15, fontWeight: '600' },
  communitySheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 18, maxHeight: '55%', borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  communityHdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  communityHdrT: { fontSize: 18, fontWeight: '800' },
  communityEmpty: { fontSize: 13, paddingVertical: 20, textAlign: 'center' },
  communityItem: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8 },
  ciTitle: { fontSize: 14, fontWeight: '700' },
  ciSub: { fontSize: 11, marginTop: 3 },
  ciVote: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#2563EB', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  ciVoteT: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
