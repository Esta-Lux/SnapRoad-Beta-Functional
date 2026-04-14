import React, { useRef, useState, useCallback, useEffect, useLayoutEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList,
  Platform, Keyboard, Alert, Switch, Pressable, Image, Dimensions,
  AppState,
} from 'react-native';
import Animated, {
  FadeIn, FadeOut, SlideInDown, SlideOutDown,
  useSharedValue, useAnimatedStyle, withTiming, Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapboxGL, { isMapAvailable } from '../utils/mapbox';
import * as Battery from 'expo-battery';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { useLocation } from '../hooks/useLocation';
import { useDriveNavigation } from '../hooks/useDriveNavigation';
import { usePassiveDriveGems } from '../hooks/usePassiveDriveGems';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useMapLayers } from '../hooks/useMapLayers';
import { DRIVING_MODES } from '../constants/modes';
import {
  forwardGeocode,
  prepareMapSearchQuery,
  reverseGeocode,
  type GeocodeResult,
} from '../lib/directions';
import {
  migratePersistedRecentSearch,
  parseOpenNowBooleanFromDetailsPayload,
  withOpenNowObservation,
  isOpenNowFresh,
} from '../utils/placeHours';
import {
  emitAgentMapboxOtaSnapshot,
  getMapboxPublicToken,
  getMapboxTokenPublicPrefix,
  isMapboxPublicTokenConfigured,
  logMapboxAccessDiagnostics,
} from '../config/mapbox';
import {
  effectiveNavRouteColors,
  getDrivingLightPreset,
  standardBasemapStyleImportConfig,
  usesStandardStyleConfiguration,
} from '../lib/mapboxDrivingStyle';
import { clampStepTowardDeg } from '../navigation/bearingSmoothing';
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
import NearbyOffersPickerSheet from '../components/map/NearbyOffersPickerSheet';
import BuildingsLayer from '../components/map/BuildingsLayer';
import PhotoReportMarkers, { type PhotoReport } from '../components/map/PhotoReportMarkers';
import TrafficSafetyLayer, { type TrafficSafetyZone } from '../components/map/TrafficSafetyLayer';
import PhotoReportDetailModal from '../components/map/PhotoReportDetailModal';
import { isTrafficSafetyLayerEnabled, trafficSafetyRegionQuery } from '../config/restrictedRegions';
import MapCategoryExploreSheet from '../components/map/MapCategoryExploreSheet';
import PhotoReportSheet from '../components/map/PhotoReportSheet';
import MapSearchTopBar from '../components/map/MapSearchTopBar';
import IncidentReportCard from '../components/map/IncidentReportCard';
import TrafficCongestionBanner from '../components/map/TrafficCongestionBanner';
import RoutePreviewPanel from '../components/map/RoutePreviewPanel';
import { projectAhead, getCameraConfig } from '../navigation/navigationCamera';
import { getDistanceToUpcomingManeuverMeters, getUpcomingManeuverStep } from '../navigation/routeGeometry';
import { useNavigationSpeech } from '../hooks/useNavigationSpeech';
import { repeatLastTurnByTurn } from '../navigation/navigationGuidanceMemory';
import TurnInstructionCard from '../components/navigation/TurnInstructionCard';
import { getRoutePolylineStyle } from '../lib/routePolylineStyle';
import NavigationStatusStrip, { MAP_NAV_BOTTOM_INSET } from '../components/navigation/NavigationStatusStrip';
import { getNavigationFollowPaddingFallback } from '../navigation/cameraPresets';
import NavigationDebugHud from '../components/navigation/NavigationDebugHud';
import { labelAnchorLayerIdForStyleUrl } from '../map/mapLayerRegistry';
import {
  getPrimaryBannerText,
  getSecondaryBannerText,
  isActionableGuidanceStep,
  mergeLaneSources,
  pickGuidanceStep,
} from '../navigation/bannerInstructions';
import { isLiveShareFresh } from '../lib/friendPresence';
import type { MapFocusFriendParams, NavigateToFriendParams } from '../types';
import {
  formatTurnDistanceForCard,
  resolveTurnCardState,
  buildActivePrimary,
  buildPreviewPrimarySecondary,
  buildConfirmPrimary,
  buildCruisePrimary,
  buildChainInstruction,
  iconManeuverForState,
  iconManeuverKindForState,
  resolveManeuverFieldsForTurnCard,
  shouldShowRoadDisambiguation,
} from '../navigation/turnCardModel';
import { useTurnConfirmationUntil } from '../hooks/useTurnConfirmationWindow';
import { useMapWeather, weatherOverlayFactor } from '../hooks/useMapWeather';
import MapWeatherOverlay from '../components/map/MapWeatherOverlay';
import GemOverlay from '../components/gamification/GemOverlay';
import TripShare from '../components/gamification/TripShare';
import HamburgerMenu from '../components/profile/HamburgerMenu';
import ConvoyMode from '../components/social/ConvoyMode';
// Crash detection hook removed (no SOS backend); friend locations handled inline via Supabase realtime
import {
  alongRouteDistanceMeters,
  formatDistance,
  haversineMeters,
  type RouteSplitForOverlay,
} from '../utils/distance';
import { formatDuration } from '../utils/format';
import { speak, stopSpeaking } from '../utils/voice';
import { api, API_BASE_URL } from '../api/client';
import {
  parseNearbyOffers,
  parseRedeemOfferPayload,
  unwrapApiData as unwrapOffersApiData,
} from '../api/dto/offers';
import { parseLiveLocationUpdate } from '../api/dto/realtime';
import OrionChat, { type OrionPlaceSuggestion } from '../components/orion/OrionChat';
import OrionQuickMic from '../components/orion/OrionQuickMic';
import TripSummaryModal from '../components/common/Modal';
import { useNavigationMode } from '../contexts/NavigatingContext';
import { useCameraController } from '../hooks/useCameraController';
import {
  navLaneGuidanceUiEnabled,
  navLogicDebugEnabled,
  navLogicSdkEnabled,
  navNativeFullScreenEnabled,
} from '../navigation/navFeatureFlags';
import {
  ingestSdkLocation,
  ingestSdkProgress,
  ingestSdkRouteChangedEvent,
  ingestSdkRoutePolyline,
  ingestSdkVoiceSubtitle,
} from '../navigation/navEngine';
import { directionsStepFromSdkProgress } from '../navigation/navSdkUiAdapter';
import type { SdkLocationPayload, SdkProgressPayload } from '../navigation/navSdkStore';
import { polylineFromSdkRoutes, type SdkRoutesNative } from '../navigation/navSdkGeometry';
import { MapboxNavigationView, type MapboxNavigationViewRef } from '@badatgil/expo-mapbox-navigation';
import { routeProfileForPlatform } from '../hooks/useNativeNavBridge';
import { normalizeNativeNavParams } from '../navigation/nativeNavGuard';
import type { TripSummary } from '../hooks/useDriveNavigation';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation as useRNNavigation, useRoute, useIsFocused } from '@react-navigation/native';
import type { MapStackParamList, MapStackScreenNavigationProp } from '../navigation/types';
import { storage } from '../utils/storage';
import { logMapDataIssue } from '../utils/mapApiDiagnostics';
import { supabase, supabaseConfigured } from '../lib/supabase';
import type { DrivingMode, Incident, SavedLocation, Offer, FriendLocation } from '../types';
import {
  mapFriendsApiToLocations,
  mergeLiveLocationUpdate,
} from '../hooks/useMapFriendPresence';
import { dedupeGeocodeResults, localMatchesForSearchQuery } from '../hooks/useMapSearchSession';
import { useNearbyOffersOnMap } from '../hooks/useNearbyOffersOnMap';
import { usePublicAppConfig } from '../hooks/usePublicAppConfig';

// ─── Constants ───────────────────────────────────────────────────────────────

const SHARE_LOC_STORAGE_KEY = 'snaproad_share_location';
const MAP_SHARE_INVITE_BANNER_DISMISS_KEY = 'snaproad_map_share_banner_dismissed';


function placePhotoThumbUri(photoRef?: string, maxWidth = 96): string | undefined {
  if (!photoRef || !API_BASE_URL) return undefined;
  return `${API_BASE_URL}/api/places/photo?ref=${encodeURIComponent(photoRef)}&maxwidth=${maxWidth}`;
}

function searchResultPriceHint(item: GeocodeResult): string | null {
  const raw = `${item.placeType || ''}`.toLowerCase();
  const isGas = raw.includes('gas') || raw.includes('fuel');
  if (isGas) {
    if (typeof item.price_level === 'number' && item.price_level >= 1 && item.price_level <= 4) {
      return `Typical cost tier ${'$'.repeat(item.price_level)} · $/gal not shown — confirm at pump`;
    }
    return '$/gal not shown — confirm at pump or station signage';
  }
  if (typeof item.price_level === 'number' && item.price_level >= 1 && item.price_level <= 4) {
    return 'Typical cost: ' + '$'.repeat(item.price_level);
  }
  return null;
}

function placeCardFuelHint(place: {
  category?: string;
  maki?: string;
  placeType?: string;
  price_level?: number;
}): string | undefined {
  const t = `${place.category || ''} ${place.maki || ''} ${place.placeType || ''}`.toLowerCase();
  if (!t.includes('gas') && !t.includes('fuel')) return undefined;
  if (typeof place.price_level === 'number' && place.price_level >= 1 && place.price_level <= 4) {
    return `Typical cost tier ${'$'.repeat(place.price_level)}. Live $/gal not shown — confirm at pump.`;
  }
  return 'Live $/gal not shown — confirm at pump before fueling.';
}

/** Traffic cams hide when zoomed out (less map clutter). */
/** Show traffic / camera POIs once the user is zoomed in enough (lower = visible sooner). */
const TRAFFIC_CAM_MIN_ZOOM = 12;

const INCIDENT_COLORS: Record<string, string> = {
  police: '#4A90D9', accident: '#D04040', hazard: '#E07830',
  construction: '#F59E0B', closure: '#D04040', pothole: '#F97316',
};

/** Mapbox Standard (+ optional Satellite). Driving modes control lighting via `StyleImport` only — no classic dark/streets URLs. */
const MAP_STYLES = [
  { key: 'standard', label: 'Standard', url: 'mapbox://styles/mapbox/standard', icon: 'cube-outline' as const },
  { key: 'satellite', label: 'Satellite', url: 'mapbox://styles/mapbox/standard-satellite', icon: 'earth-outline' as const },
] as const;

/**
 * Android RNMBXCameraManager.setFollowPadding calls asMap() — undefined breaks Fabric (ClassCastException).
 * Non-navigation fallback is zero; during navigation, use {@link getNavigationFollowPaddingFallback}
 * so the puck clears the same top/bottom chrome as `useCameraController` on the first frame.
 */
const MAPBOX_DEFAULT_FOLLOW_PADDING = {
  paddingTop: 0,
  paddingRight: 0,
  paddingBottom: 0,
  paddingLeft: 0,
} as const;

const REPORT_TYPES = [
  { type: 'police', label: 'Police', icon: 'shield-outline' as const },
  { type: 'accident', label: 'Accident', icon: 'warning-outline' as const },
  { type: 'hazard', label: 'Hazard', icon: 'warning-outline' as const },
  { type: 'construction', label: 'Construction', icon: 'construct-outline' as const },
  { type: 'closure', label: 'Closure', icon: 'close-circle-outline' as const },
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

/**
 * Check whether any of the upcoming congestion edges (within ~`lookAheadEdges` of
 * the current segment) are heavy or severe. Used to boost turn card preview distance.
 */
function hasSevereCongestionAhead(
  congestion: string[] | undefined,
  currentSegIdx: number,
  lookAheadEdges = 12,
): boolean {
  if (!congestion || congestion.length === 0) return false;
  const from = Math.max(0, currentSegIdx);
  const to = Math.min(congestion.length, from + lookAheadEdges);
  for (let i = from; i < to; i++) {
    if (congestion[i] === 'heavy' || congestion[i] === 'severe') return true;
  }
  return false;
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

type CategoryExploreState = {
  title: string;
  subtitle?: string;
  results: {
    name: string;
    address: string;
    lat: number;
    lng: number;
    place_id?: string;
    rating?: number;
    placeType?: string;
    photo_reference?: string;
    open_now?: boolean | null;
    price_level?: number | null;
    business_status?: string;
  }[];
  error: string | null;
  loading: boolean;
};

/** GET /api/offers/nearby uses km; ~20 mi driving radius cap for fetches (~32.2 km). */
const OFFERS_NEARBY_RADIUS_KM = 32.2;
/** Map + “nearby” sheet only recommend offers within this distance (meters). */
const RECOMMENDED_OFFER_MAX_METERS = 20 * 1609.34;

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const rnNav = useRNNavigation<MapStackScreenNavigationProp>();
  const mapTabFocused = useIsFocused();
  const { isNavigating: ctxNavigating, setIsNavigating: setNavCtx } = useNavigationMode();
  const [isNavActive, setIsNavActive] = useState(false);
  const { isLight, colors } = useTheme();
  const route = useRoute<RouteProp<MapStackParamList, 'MapMain' | 'MapRedeem'>>();
  const { user, updateUser, refreshUserFromServer, bumpStatsVersion } = useAuth();
  /** Keep GPS alive on other tabs when logged in so passive + profile miles stay accurate (battery tradeoff). */
  const { location, heading, speed, accuracy, isLocating, permissionDenied } = useLocation(isNavActive, {
    paused: !mapTabFocused && !ctxNavigating && !user?.id,
  });

  // ── Driving mode ──
  const [drivingMode, setDrivingMode] = useState<DrivingMode>('adaptive');
  const modeConfig = DRIVING_MODES[drivingMode];

  const [navVoiceMuted, setNavVoiceMuted] = useState(false);
  useEffect(() => {
    const v = storage.getString('snaproad_nav_voice_muted');
    setNavVoiceMuted(v === '1');
  }, []);
  useEffect(() => {
    storage.set('snaproad_nav_voice_muted', navVoiceMuted ? '1' : '0');
  }, [navVoiceMuted]);

  const [friendLocations, setFriendLocations] = useState<FriendLocation[]>([]);
  const [friendFollowSession, setFriendFollowSession] = useState<{
    friendId: string;
    name: string;
    mode: 'live' | 'last_known';
    startedLive: boolean;
    engine: 'sdk_snapshot' | 'js_live' | 'js_snapshot';
  } | null>(null);
  const friendFollowLastDestRef = useRef<{ lat: number; lng: number } | null>(null);
  const friendFollowLastRerouteRef = useRef(0);
  const friendFollowRerouteBusyRef = useRef(false);
  const friendFollowSessionRef = useRef<typeof friendFollowSession>(null);
  useEffect(() => {
    friendFollowSessionRef.current = friendFollowSession;
  }, [friendFollowSession]);
  // Explicit per-session engine choice. Launch-safe default:
  // - normal trips: SDK authoritative when enabled
  // - friend-follow: SDK routes to a snapshot destination at start; JS-only sessions can do
  //   live moving-destination reroutes when the whole app is already running JS navigation.
  const navLogicSdkSessionEnabled =
    navLogicSdkEnabled() &&
    friendFollowSession?.engine !== 'js_live' &&
    friendFollowSession?.engine !== 'js_snapshot';

  const { friendTrackingEnabled, liveLocationPublishingEnabled, refresh: refreshPublicAppConfig } =
    usePublicAppConfig(mapTabFocused);
  const [shareLocEpoch, setShareLocEpoch] = useState(0);
  const [livePublishPaused503, setLivePublishPaused503] = useState(false);
  const [shareInviteBannerDismissed, setShareInviteBannerDismissed] = useState(
    () => storage.getString(MAP_SHARE_INVITE_BANNER_DISMISS_KEY) === '1',
  );

  const shareLocationStorageOn = useMemo(() => {
    void shareLocEpoch;
    return storage.getString(SHARE_LOC_STORAGE_KEY) === '1';
  }, [shareLocEpoch]);

  const mapCoordsOk = useMemo(() => {
    const rLat = Math.round(location.lat * 1000);
    const rLng = Math.round(location.lng * 1000);
    return !(rLat === 0 && rLng === 0);
  }, [location.lat, location.lng]);

  const canPublishFriendLocation = Boolean(
    user?.isPremium &&
      friendTrackingEnabled &&
      liveLocationPublishingEnabled &&
      !livePublishPaused503,
  );

  useEffect(() => {
    if (liveLocationPublishingEnabled) setLivePublishPaused503(false);
  }, [liveLocationPublishingEnabled]);

  const refreshFriendLocations = useCallback(() => {
    if (!user?.isPremium) {
      setFriendLocations([]);
      return;
    }
    api
      .get('/api/friends/list')
      .then((r) => {
        if (!r.success) {
          logMapDataIssue('GET /api/friends/list', r.error);
          return;
        }
        setFriendLocations(mapFriendsApiToLocations(unwrapOffersApiData(r.data)));
      })
      .catch((e) => logMapDataIssue('GET /api/friends/list', e));
  }, [user?.isPremium]);

  const friendLocationsVisible = friendTrackingEnabled ? friendLocations : [];

  // ── Navigation hook ──
  const nav = useDriveNavigation({
    userLocation: location,
    speed,
    heading,
    gpsAccuracy: accuracy,
    drivingMode,
    voiceMuted: navVoiceMuted,
    dynamicDestinationFollow:
      friendFollowSession?.engine === 'js_live' &&
      Boolean(friendFollowSession?.startedLive) &&
      friendFollowSession?.mode === 'live',
    navSdkHeadless: navLogicSdkSessionEnabled,
  });
  useNavigationSpeech({
    progress: nav.navigationProgress,
    enabled: !navVoiceMuted && nav.isNavigating && !navLogicSdkSessionEnabled,
    drivingMode,
    routeSteps: nav.navigationData?.steps,
    routePolyline: nav.navigationData?.polyline,
    currentStepIndex: nav.currentStepIndex,
    userCoord: nav.navigationProgressCoord,
    navigationSteps: nav.navigationSteps,
  });

  const enableShareLocationFromMap = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      /* optional */
    }
    storage.set(SHARE_LOC_STORAGE_KEY, '1');
    setShareLocEpoch((n) => n + 1);
    try {
      await api.put('/api/friends/location/sharing', {
        is_sharing: true,
        lat: location.lat,
        lng: location.lng,
      });
    } catch {
      /* offline — local preference still on */
    }
    let battery_pct: number | undefined;
    try {
      const lvl = await Battery.getBatteryLevelAsync();
      battery_pct = Math.round(Math.max(0, Math.min(1, lvl)) * 100);
    } catch {
      /* optional */
    }
    const res = await api.post('/api/friends/location/update', {
      lat: location.lat,
      lng: location.lng,
      heading,
      speed_mph: speed,
      is_navigating: nav.isNavigating,
      destination_name: nav.selectedDestination?.name ?? undefined,
      is_sharing: true,
      battery_pct,
    });
    if (!res.success && res.statusCode === 503) setLivePublishPaused503(true);
  }, [location.lat, location.lng, heading, speed, nav.isNavigating, nav.selectedDestination?.name]);

  const navLogicRef = useRef<MapboxNavigationViewRef | null>(null);
  const [navLogicCoords, setNavLogicCoords] = useState<Array<{ latitude: number; longitude: number }>>([]);
  // Prevents navLogicCoords from being updated on every GPS tick once set for a session.
  // Updating coordinates on each GPS update restarts the native SDK session → replays the
  // start announcement alongside the ongoing voice → the "two voices" bug.
  const navLogicCoordsSetRef = useRef(false);
  const navLogicFollowingZoom = useMemo(() => {
    switch (drivingMode) {
      case 'calm':
        return 16.5;
      case 'sport':
        return 17.5;
      default:
        return 17.0;
    }
  }, [drivingMode]);

  useEffect(() => {
    if (!navLogicSdkSessionEnabled || !nav.isNavigating || !nav.navigationData || !location) {
      setNavLogicCoords([]);
      navLogicCoordsSetRef.current = false;
      return;
    }
    // Only set coords ONCE per nav session — the native SDK tracks the user's GPS
    // position internally. Passing new coordinates on every GPS tick (location.lat/lng
    // changing) causes the SDK to restart the session and replay the start announcement,
    // which is heard on top of ongoing voice guidance → two voices.
    if (navLogicCoordsSetRef.current) return;
    navLogicCoordsSetRef.current = true;
    setNavLogicCoords([
      { latitude: location.lat, longitude: location.lng },
      {
        latitude: nav.navigationData.destination.lat,
        longitude: nav.navigationData.destination.lng,
      },
    ]);
  }, [
    navLogicSdkSessionEnabled,
    nav.isNavigating,
    nav.navigationData?.destination?.lat,
    nav.navigationData?.destination?.lng,
    location?.lat,
    location?.lng,
  ]);

  useEffect(() => {
    if (!nav.isNavigating) {
      setNavLogicCoords([]);
      navLogicCoordsSetRef.current = false;
    }
  }, [nav.isNavigating]);

  const handleSdkRoutesLoaded = useCallback(
    (event: { nativeEvent: { routes: SdkRoutesNative } }) => {
      const routes = event.nativeEvent.routes;
      const poly = polylineFromSdkRoutes(routes);
      const mr = routes.mainRoute;
      if (poly.length >= 2 && mr && typeof mr.distance === 'number' && typeof mr.expectedTravelTime === 'number') {
        ingestSdkRoutePolyline(poly);
        nav.applySdkRouteGeometry(poly, mr.distance, mr.expectedTravelTime, routes);
      }
    },
    [nav.applySdkRouteGeometry],
  );

  const handleSdkRouteChanged = useCallback(
    (event: { nativeEvent: { routes?: SdkRoutesNative } }) => {
      ingestSdkRouteChangedEvent();
      const routes = event.nativeEvent.routes;
      if (!routes?.mainRoute) return;
      const poly = polylineFromSdkRoutes(routes);
      const mr = routes.mainRoute;
      if (poly.length >= 2 && typeof mr.distance === 'number' && typeof mr.expectedTravelTime === 'number') {
        ingestSdkRoutePolyline(poly);
        nav.applySdkRouteGeometry(poly, mr.distance, mr.expectedTravelTime, routes);
      }
    },
    [nav.applySdkRouteGeometry],
  );

  /** During nav: fused coord for puck/camera (`navigationProgressCoord` → snapped display when JS on-route). */
  const navDisplayCoord = nav.isNavigating ? nav.navigationProgressCoord : location;
  const navDisplayHeading = nav.isNavigating ? nav.navigationDisplayHeading : heading;
  /** Passed / ahead route styling while navigating — same snap as turn/ETA (`navigationProgress`). */
  const navigationRouteSplit = useMemo((): RouteSplitForOverlay | null => {
    if (!nav.isNavigating) return null;
    const s = nav.navigationProgress?.routeSplitSnap;
    if (!s) return null;
    return { segmentIndex: s.segmentIndex, tOnSegment: s.t };
  }, [
    nav.isNavigating,
    nav.navigationProgress?.routeSplitSnap?.segmentIndex,
    nav.navigationProgress?.routeSplitSnap?.t,
  ]);
  const displaySpeedMph = nav.isNavigating
    ? Math.max(0, (nav.fusedNavState?.displayCoord?.speedMps ?? speed * 0.44704) * 2.236936)
    : speed;
  const markerFocusCoordinate = useMemo(
    () =>
      nav.isNavigating
        ? navDisplayCoord
        : location,
    [nav.isNavigating, navDisplayCoord.lat, navDisplayCoord.lng, location.lat, location.lng],
  );

  /**
   * LocationPuck beam: with CustomLocationProvider we pass a single `heading` — native `course` mode
   * reads GPS COG and fights that value. Use `heading` whenever custom coords are injected.
   */
  const locationPuckBearing = useMemo((): 'heading' | 'course' => {
    const sdkNav = navLogicSdkSessionEnabled;
    const customLocationActive =
      nav.isNavigating && ((sdkNav && nav.sdkNavLocation) || !sdkNav);
    if (customLocationActive) return 'heading';
    return displaySpeedMph > 10 ? 'course' : 'heading';
  }, [nav.isNavigating, nav.sdkNavLocation, displaySpeedMph, navLogicSdkSessionEnabled]);

  const fusedSpeedMpsNav =
    nav.isNavigating
      ? Math.max(0, nav.fusedNavState?.displayCoord?.speedMps ?? speed * 0.44704)
      : null;
  usePassiveDriveGems({
    enabled: Boolean(user?.id),
    mapFocused: true,
    isNavigating: nav.isNavigating,
    location,
    speedMph: speed,
    user,
    updateUser,
    refreshUserFromServer,
    bumpStatsVersion,
  });

  // Sync nav.isNavigating → useLocation accuracy
  useEffect(() => { setIsNavActive(nav.isNavigating); }, [nav.isNavigating]);

  /** Full Orion chat is explore-only; voice FAB stays on the map during navigation. */
  useEffect(() => {
    if (nav.isNavigating) setShowOrion(false);
  }, [nav.isNavigating]);

  const wasNavigatingRef = useRef(false);

  useLayoutEffect(() => {
    logMapboxAccessDiagnostics('MapScreen mount');
    const t = getMapboxPublicToken();
    if (MapboxGL && t) {
      MapboxGL.setAccessToken(t);
    }
  }, []);

  // Stable ref for latest location (avoids re-running interval effects on every GPS tick)
  const locationRef = useRef(location);
  useEffect(() => { locationRef.current = location; }, [location.lat, location.lng]);

  // ── Search ──
  const [searchQuery, setSearchQuery] = useState('');
  const searchQueryRef = useRef('');
  useEffect(() => {
    searchQueryRef.current = searchQuery;
  }, [searchQuery]);
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [routePreviewHeight, setRoutePreviewHeight] = useState(0);
  const [routePreviewDetails, setRoutePreviewDetails] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchGenRef = useRef(0);

  // ── Camera ──
  const mapRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const [cameraLocked, setCameraLocked] = useState(true);
  const [isExploring, setIsExploring] = useState(false);
  const [compassMode, setCompassMode] = useState(false);
  const [followMode, setFollowMode] = useState<'free' | 'follow' | 'heading'>('follow');
  /** Bumps when a nav session starts so Mapbox Camera remounts (clears preview fitBounds stuck state). */
  const [navCameraSessionKey, setNavCameraSessionKey] = useState(0);
  /** Single distance field for maneuver-aware presets (must match banner/speech). */
  const nextManeuverDistanceMeters = useMemo(() => {
    const d = nav.navigationProgress?.nextStepDistanceMeters;
    if (nav.isNavigating && d != null && Number.isFinite(d)) return d;
    return getDistanceToUpcomingManeuverMeters(
      nav.navigationData?.steps,
      nav.currentStepIndex,
      navDisplayCoord,
      nav.navigationData?.polyline,
    );
  }, [
    nav.isNavigating,
    nav.navigationProgress?.nextStepDistanceMeters,
    nav.navigationData?.steps,
    nav.navigationData?.polyline,
    nav.currentStepIndex,
    navDisplayCoord.lat,
    navDisplayCoord.lng,
  ]);

  const camCtrl = useCameraController({
    speedMph: speed,
    fusedSpeedMps: fusedSpeedMpsNav,
    drivingMode,
    isNavigating: nav.isNavigating,
    cameraLocked,
    nextManeuverDistanceMeters,
    safeAreaTop: insets.top,
    safeAreaBottom: insets.bottom,
  });

  const userInteracting = useRef(false);
  const lastCameraUpdate = useRef({ lat: 0, lng: 0, heading: 0 });
  const wasNavigatingForOdomRef = useRef(false);
  useEffect(() => {
    if (nav.isNavigating && !wasNavigatingForOdomRef.current) {
      lastCameraUpdate.current = {
        lat: navDisplayCoord.lat,
        lng: navDisplayCoord.lng,
        heading: navDisplayHeading,
      };
    }
    wasNavigatingForOdomRef.current = nav.isNavigating;
  }, [nav.isNavigating, navDisplayCoord.lat, navDisplayCoord.lng, navDisplayHeading]);

  const navDisplayCoordRef = useRef(navDisplayCoord);
  const navDisplayHeadingRef = useRef(navDisplayHeading);
  useEffect(() => {
    navDisplayCoordRef.current = navDisplayCoord;
    navDisplayHeadingRef.current = navDisplayHeading;
  }, [navDisplayCoord.lat, navDisplayCoord.lng, navDisplayHeading]);

  const camCtrlRef = useRef(camCtrl);
  camCtrlRef.current = camCtrl;

  // ── Reports ──
  const [nearbyIncidents, setNearbyIncidents] = useState<Incident[]>([]);
  const [activeReportCard, setActiveReportCard] = useState<Incident | null>(null);
  const [confirmIncident, setConfirmIncident] = useState<Incident | null>(null);
  const [showReportPicker, setShowReportPicker] = useState(false);
  const [showCommunitySheet, setShowCommunitySheet] = useState(false);
  const reportPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const announcedRef = useRef<Set<string>>(new Set());
  const announcedOfferNavRef = useRef<Set<string>>(new Set());
  const trackedOfferViewsRef = useRef<Set<string>>(new Set());
  const trackedOfferVisitsRef = useRef<Set<string>>(new Set());
  const confirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reportCardTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigationTripIdRef = useRef<string>('');
  const lastLivePublishRef = useRef(0);
  const mapLivePublishCoordsRef = useRef({ lat: 0, lng: 0, heading: 0, speed: 0 });
  const mapLiveNavRef = useRef({ isNavigating: false, destinationName: undefined as string | undefined });
  const [ephemeralTurnHint, setEphemeralTurnHint] = useState<string | null>(null);
  const ephemeralHintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceHintFiredStepRef = useRef<number>(-1);

  // ── Map style (index into MAP_STYLES; 0 = default Standard) ──
  const [styleOverride, setStyleOverride] = useState(0);
  const [showStylePicker, setShowStylePicker] = useState(false);
  useLayoutEffect(() => {
    if (styleOverride >= MAP_STYLES.length) setStyleOverride(0);
  }, [styleOverride]);

  // ── Data ──
  const [savedPlaces, setSavedPlaces] = useState<SavedLocation[]>([]);
  const [activeChip, setActiveChip] = useState<string>('favorites');
  const [nearbyOffers, setNearbyOffers] = useState<Offer[]>([]);
  const recommendedNearbyOffers = useNearbyOffersOnMap(
    nearbyOffers,
    location,
    RECOMMENDED_OFFER_MAX_METERS,
    haversineMeters,
  );

  const [cameraLocations, setCameraLocations] = useState<CameraLocation[]>([]);
  const [selectedTrafficCamera, setSelectedTrafficCamera] = useState<CameraLocation | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<{
    name: string;
    address?: string;
    category?: string;
    maki?: string;
    placeType?: string;
    price_level?: number;
    open_now?: boolean;
    lat: number;
    lng: number;
  } | null>(null);
  const [mapZoomLevel, setMapZoomLevel] = useState(15);
  const mapZoomDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [nearbyOffersPickerOpen, setNearbyOffersPickerOpen] = useState(false);
  useEffect(() => {
    if (nav.isNavigating && !wasNavigatingRef.current) {
      setSelectedPlaceId(null);
      setSelectedPlace(null);
    }
    wasNavigatingRef.current = nav.isNavigating;
  }, [nav.isNavigating]);
  const handledRedeemRouteRef = useRef<string | null>(null);
  const [showOrion, setShowOrion] = useState(false);
  const [orionPendingSuggestions, setOrionPendingSuggestions] = useState<OrionPlaceSuggestion[]>([]);
  const [orionQuickReply, setOrionQuickReply] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showConvoy, setShowConvoy] = useState(false);
  const [currentAddress, setCurrentAddress] = useState<string>('');
  const [recentSearches, setRecentSearches] = useState<GeocodeResult[]>([]);
  const recentSearchesRef = useRef<GeocodeResult[]>([]);
  recentSearchesRef.current = recentSearches;

  // ── Layers ──
  const { showTraffic, showIncidents, showCameras, setShowTraffic, setShowIncidents, setShowCameras,
    showConstruction, setShowConstruction,
    showPhotoReports, setShowPhotoReports, showTrafficSafety, setShowTrafficSafety } = useMapLayers();

  // ── New layer data ──
  const [photoReports, setPhotoReports] = useState<PhotoReport[]>([]);
  const [trafficSafetyZones, setTrafficSafetyZones] = useState<TrafficSafetyZone[]>([]);
  /** User-visible status when speed-camera layer is on but empty / limited */
  const [trafficSafetyHint, setTrafficSafetyHint] = useState<string | null>(null);
  const [selectedPhotoReport, setSelectedPhotoReport] = useState<PhotoReport | null>(null);
  const [categoryExplore, setCategoryExplore] = useState<CategoryExploreState | null>(null);
  const exploreRestoreRef = useRef<CategoryExploreState | null>(null);
  const restoreExploreList = useCallback(() => {
    if (exploreRestoreRef.current) {
      setCategoryExplore(exploreRestoreRef.current);
      exploreRestoreRef.current = null;
    }
  }, []);
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
  // crashDetected / dismissCrash removed — re-enable when SOS endpoints are built

  // ── Truck ──
  const [avoidLowClearances, setAvoidLowClearances] = useState(false);
  const vehicleHeight = user?.vehicle_height_meters;
  const hasTallVehicle = typeof vehicleHeight === 'number' && vehicleHeight > 0;

  // ── Sync nav state to tab bar ──
  useEffect(() => { setNavCtx(nav.isNavigating); }, [nav.isNavigating, setNavCtx]);

  // ── Native navigation return handling ──
  const [nativeNavTripSummary, setNativeNavTripSummary] = useState<TripSummary | null>(null);
  const lastNativeNavNonceRef = useRef<string | null>(null);

  useEffect(() => {
    const result = route.params?.nativeNavResult as
      | { tripSummary: TripSummary; arrived: boolean }
      | undefined;
    if (!result?.tripSummary) return;
    const nonce = JSON.stringify(result.tripSummary.date + result.tripSummary.distance);
    if (lastNativeNavNonceRef.current === nonce) return;
    lastNativeNavNonceRef.current = nonce;
    rnNav.setParams({ nativeNavResult: undefined } as never);
    setNativeNavTripSummary(result.tripSummary);
  }, [route.params?.nativeNavResult, rnNav]);

  const activeTripSummary = nav.tripSummary ?? nativeNavTripSummary;
  const dismissActiveTripSummary = useCallback(() => {
    nav.dismissTripSummary();
    setNativeNavTripSummary(null);
  }, [nav]);

  // ─── Derived values ────────────────────────────────────────────────────────

  const mapStyleIndex = Math.min(styleOverride, MAP_STYLES.length - 1);
  const activeStyleURL = MAP_STYLES[mapStyleIndex]?.url ?? MAP_STYLES[0].url;
  const mapStylePickerHighlightIndex = mapStyleIndex;

  /** Calm→dawn, Adaptive→day, Sport→dusk; app dark theme → night (Mapbox Standard basemap). */
  const mapLightPreset = useMemo(
    () => getDrivingLightPreset(drivingMode, isLight),
    [drivingMode, isLight],
  );
  const isSatelliteStyle = activeStyleURL.includes('standard-satellite');
  const navRouteColors = useMemo(
    () => effectiveNavRouteColors(modeConfig, mapLightPreset, isSatelliteStyle, drivingMode),
    [modeConfig, mapLightPreset, isSatelliteStyle, drivingMode],
  );
  const standardStyleImportsEnabled = usesStandardStyleConfiguration(activeStyleURL);

  const standardBasemapImportConfig = useMemo(
    () =>
      standardBasemapStyleImportConfig(mapLightPreset, isSatelliteStyle, drivingMode, nav.isNavigating),
    [mapLightPreset, isSatelliteStyle, drivingMode, nav.isNavigating],
  );

  /** Keeps 3D extrusions and route line under label layers where the style exposes anchors. */
  const buildingsBelowLayerId = useMemo(
    () => labelAnchorLayerIdForStyleUrl(activeStyleURL),
    [activeStyleURL],
  );

  const isCalm = drivingMode === 'calm';
  const isSport = drivingMode === 'sport';

  /** Smooth ~800ms+ transitions when switching driving modes (explore); nav keeps snappy follow. */
  const animDuration = nav.isNavigating
    ? (isCalm
        ? 1000
        : isSport
          ? (speed > 25 ? 200 : speed > 10 ? 350 : 600)
          : speed > 15 ? 300 : speed > 5 ? 500 : 800)
    : Math.max(
        800,
        isCalm ? 1200 : isSport ? (speed > 25 ? 450 : speed > 10 ? 600 : 700) : speed > 15 ? 500 : 800,
      );

  /** ~500m grid so place cards / detail distance text do not jitter every GPS tick */
  const placeCardAnchor = nav.isNavigating ? nav.navigationProgressCoord : location;
  const placeCardLocGridLat = Math.round(placeCardAnchor.lat * 200) / 200;
  const placeCardLocGridLng = Math.round(placeCardAnchor.lng * 200) / 200;
  const placeCardDistanceMeters = useMemo(() => {
    if (!selectedPlace) return undefined;
    return haversineMeters(placeCardAnchor.lat, placeCardAnchor.lng, selectedPlace.lat, selectedPlace.lng);
  }, [placeCardLocGridLat, placeCardLocGridLng, selectedPlace?.lat, selectedPlace?.lng, nav.isNavigating, nav.navigationProgressCoord.lat, nav.navigationProgressCoord.lng]);

  const refreshSavedPlaces = useCallback(() => {
    api
      .get<any>('/api/locations')
      .then((r) => {
        if (!r.success) {
          logMapDataIssue('GET /api/locations', r.error);
          return;
        }
        const d = (r.data as any)?.data ?? r.data;
        if (Array.isArray(d)) setSavedPlaces(d);
      })
      .catch((e) => logMapDataIssue('GET /api/locations', e));
  }, []);

  const selectedPlaceFavoriteMatch = useMemo(() => {
    if (!selectedPlace?.lat || !selectedPlace?.lng) return { id: null as number | null, isFavorite: false };
    for (const p of savedPlaces) {
      if (p.lat == null || p.lng == null) continue;
      if (haversineMeters(selectedPlace.lat, selectedPlace.lng, p.lat, p.lng) < 85) {
        const c = (p.category || '').toLowerCase();
        if (c === 'favorite' || (c !== 'home' && c !== 'work')) {
          return { id: p.id, isFavorite: true };
        }
      }
    }
    return { id: null, isFavorite: false };
  }, [selectedPlace, savedPlaces]);

  const placeDetailUserLocation = useMemo(() => {
    const src = nav.isNavigating ? nav.navigationProgressCoord : location;
    if (Math.abs(src.lat) <= 1e-5 && Math.abs(src.lng) <= 1e-5) return undefined;
    return { lat: src.lat, lng: src.lng };
  }, [nav.isNavigating, nav.navigationProgressCoord.lat, nav.navigationProgressCoord.lng, placeCardLocGridLat, placeCardLocGridLng, location.lat, location.lng]);

  /** Stable object for PlaceDetailSheet so effects are not keyed off new references each render. */
  const placeDetailSummary = useMemo(
    () =>
      selectedPlace
        ? { name: selectedPlace.name, lat: selectedPlace.lat, lng: selectedPlace.lng }
        : undefined,
    [selectedPlace?.name, selectedPlace?.lat, selectedPlace?.lng],
  );

  const stableCenterRef = useRef<[number, number]>([location.lng, location.lat]);
  const [stableCenter, setStableCenter] = useState<[number, number]>([location.lng, location.lat]);
  const headingRef = useRef(heading);
  useEffect(() => { headingRef.current = heading; }, [heading]);
  const speedRef = useRef(speed);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  /** Explore compass: damped bearing so Mapbox camera does not spin on noisy magnetometer. */
  const compassSmoothedHeadingRef = useRef(heading);
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

  useEffect(() => {
    if (compassMode && !nav.isNavigating && !isExploring) {
      compassSmoothedHeadingRef.current = headingRef.current;
    }
  }, [compassMode, nav.isNavigating, isExploring]);

  // Compass mode: clamped-step bearing toward device heading (not raw 8fps feed — avoids wobble/spin).
  useEffect(() => {
    if (!compassMode || nav.isNavigating || isExploring) return;
    const id = setInterval(() => {
      const raw = headingRef.current;
      const mph = speedRef.current;
      const maxStep = mph < 2.5 ? 2.2 : mph < 12 ? 5.5 : mph < 45 ? 9 : 14;
      compassSmoothedHeadingRef.current = clampStepTowardDeg(compassSmoothedHeadingRef.current, raw, maxStep);
      cameraRef.current?.setCamera({
        heading: compassSmoothedHeadingRef.current,
        animationDuration: mph < 4 ? 240 : 160,
        animationMode: 'easeTo',
      });
    }, 175);
    return () => clearInterval(id);
  }, [compassMode, nav.isNavigating, isExploring]);

  const currentStep = nav.navigationData?.steps?.[nav.currentStepIndex];
  const upcomingGuidanceStep = useMemo(
    () => getUpcomingManeuverStep(nav.navigationData?.steps, nav.currentStepIndex),
    [nav.navigationData?.steps, nav.currentStepIndex],
  );
  const confirmUntil = useTurnConfirmationUntil(nav.isNavigating, nav.currentStepIndex, drivingMode);
  const inConfirmWindow = Date.now() < confirmUntil;
  /** Tracks when turn-card state last entered 'active' for minimum dwell enforcement. */
  const turnCardActiveEnteredAtRef = useRef<number | undefined>(undefined);
  const isAmbient = !nav.isNavigating && speed > 6.7;
  const hasNativeMapbox = isMapAvailable() && MapboxGL !== null;
  const mapboxTokenOk = isMapboxPublicTokenConfigured();
  /** Native Mapbox without a plausibly valid pk. token often crashes loading styles — gate the MapView. */
  const mapOk = hasNativeMapbox && mapboxTokenOk;

  const agentMapboxOtaLoggedRef = useRef(false);
  useEffect(() => {
    if (agentMapboxOtaLoggedRef.current) return;
    agentMapboxOtaLoggedRef.current = true;
    emitAgentMapboxOtaSnapshot({
      hypothesisId: 'H-OTA-MAPBOX',
      hasNativeMapbox,
      mapboxTokenOk,
      mapOk,
      runId: 'pre-fix',
    });
  }, [hasNativeMapbox, mapboxTokenOk, mapOk]);

  /** Explore: green “locate” = north-up follow; blue compass = rotate with heading (same as Mapbox tracking modes). */
  const exploreTracksUser =
    !nav.isNavigating &&
    !nav.showRoutePreview &&
    !isExploring &&
    (followMode === 'follow' || followMode === 'heading');

  const mapWeather = useMapWeather(location.lat, location.lng, {
    enabled: mapTabFocused && mapOk,
  });
  const weatherOverlayModeFactor = useMemo(
    () => weatherOverlayFactor(drivingMode, isLight),
    [drivingMode, isLight],
  );

  // ─── Effects ───────────────────────────────────────────────────────────────

  // Fix 6: Load persisted driving mode + recent searches on mount
  useEffect(() => {
    const saved = storage.getString('snaproad_driving_mode');
    if (saved === 'calm' || saved === 'adaptive' || saved === 'sport') setDrivingMode(saved as DrivingMode);
    const recent = storage.getString('snaproad_recent_searches');
    if (recent) {
      try {
        const parsed = JSON.parse(recent) as unknown;
        const arr = Array.isArray(parsed) ? parsed : [];
        setRecentSearches(arr.map((x) => migratePersistedRecentSearch(x as GeocodeResult)));
      } catch {
        /* ignore */
      }
    }
  }, []);

  // Fix 6: Persist driving mode on change
  useEffect(() => { storage.set('snaproad_driving_mode', drivingMode); }, [drivingMode]);

  // Fetch saved places + friends (Premium); list also refreshes on Map focus + interval (see below).
  useEffect(() => {
    refreshSavedPlaces();
    if (!user?.isPremium) {
      setFriendLocations([]);
      return;
    }
    refreshFriendLocations();
  }, [refreshSavedPlaces, user?.isPremium, refreshFriendLocations]);

  useEffect(() => {
    if (!mapTabFocused || !user?.isPremium) return;
    refreshFriendLocations();
  }, [mapTabFocused, user?.isPremium, refreshFriendLocations]);

  useEffect(() => {
    if (!mapTabFocused || !user?.isPremium) return;
    const id = setInterval(refreshFriendLocations, 60_000);
    return () => clearInterval(id);
  }, [mapTabFocused, user?.isPremium, refreshFriendLocations]);

  /** If local share preference was never set, align with server so Map publishing matches Dashboard / API. */
  useEffect(() => {
    if (!mapTabFocused || !user?.isPremium) return;
    const raw = storage.getString(SHARE_LOC_STORAGE_KEY);
    if (raw === '1' || raw === '0') return;
    let cancelled = false;
    void (async () => {
      try {
        const r = await api.get('/api/friends/location/sharing');
        if (cancelled || !r.success) return;
        const inner = unwrapOffersApiData(r.data) as { is_sharing?: boolean } | null;
        const v = inner && typeof inner.is_sharing === 'boolean' ? inner.is_sharing : null;
        if (v == null) return;
        storage.set(SHARE_LOC_STORAGE_KEY, v ? '1' : '0');
        setShareLocEpoch((n) => n + 1);
      } catch {
        /* offline */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mapTabFocused, user?.isPremium]);

  // Fix 8: Offers refresh on significant location change (~1km)
  useEffect(() => {
    const rLat = Math.round(location.lat * 100);
    const rLng = Math.round(location.lng * 100);
    if (rLat === 0 && rLng === 0) return;
    api
      .get(`/api/offers/nearby?lat=${location.lat}&lng=${location.lng}&radius=${OFFERS_NEARBY_RADIUS_KM}`)
      .then((r) => {
        if (!r.success) {
          logMapDataIssue('GET /api/offers/nearby', r.error);
          return;
        }
        setNearbyOffers(parseNearbyOffers(r.data));
      })
      .catch((e) => logMapDataIssue('GET /api/offers/nearby', e));
  }, [Math.round(location.lat * 100), Math.round(location.lng * 100)]);

  useEffect(() => {
    if (!recommendedNearbyOffers.length) return;
    for (const offer of recommendedNearbyOffers) {
      const key = String(offer.id);
      if (trackedOfferViewsRef.current.has(key)) continue;
      trackedOfferViewsRef.current.add(key);
      api
        .post(`/api/offers/${offer.id}/view`, {
          lat: location.lat,
          lng: location.lng,
        })
        .catch((e) => logMapDataIssue(`POST /api/offers/${offer.id}/view`, e));
    }
  }, [recommendedNearbyOffers, location.lat, location.lng]);

  useEffect(() => {
    if (!recommendedNearbyOffers.length) return;
    for (const offer of recommendedNearbyOffers) {
      const key = String(offer.id);
      if (trackedOfferVisitsRef.current.has(key)) continue;
      const distance = haversineMeters(location.lat, location.lng, offer.lat ?? 0, offer.lng ?? 0);
      if (distance > 500) continue;
      trackedOfferVisitsRef.current.add(key);
      api
        .post(`/api/offers/${offer.id}/visit`, {
          lat: location.lat,
          lng: location.lng,
          trip_id: navigationTripIdRef.current || undefined,
        })
        .catch((e) => logMapDataIssue(`POST /api/offers/${offer.id}/visit`, e));
      api
        .post('/api/driver/location-visit', {
          lat: location.lat,
          lng: location.lng,
          business_name: offer.business_name,
          business_type: offer.business_type,
        })
        .catch((e) => logMapDataIssue('POST /api/driver/location-visit', e));
    }
  }, [location.lat, location.lng, nearbyOffers]);

  useEffect(() => {
    const rawOfferId = route.params?.offerId;
    const offerId = Number(rawOfferId);
    if (!Number.isFinite(offerId) || offerId <= 0 || nearbyOffers.length === 0) return;
    const routeKey = String(rawOfferId);
    if (handledRedeemRouteRef.current === routeKey) return;

    const match = nearbyOffers.find((offer) => offer.id === offerId);
    if (!match) return;

    handledRedeemRouteRef.current = routeKey;
    setSelectedOffer(match);
  }, [nearbyOffers, route.params?.offerId]);

  const handleRedeemOffer = useCallback(async (offer: Offer) => {
    try {
      const res = await api.post(`/api/offers/${offer.id}/redeem`);
      if (!res.success) {
        Alert.alert('Redeem Offer', res.error || 'Could not redeem this offer right now.');
        return;
      }

      const redeemPayload = parseRedeemOfferPayload(res.data);
      const gemCost = Number(
        Number.isFinite(redeemPayload.gem_cost ?? NaN)
          ? redeemPayload.gem_cost
          : offer.gem_cost ?? offer.gems_reward ?? 0,
      );
      const newGemTotal = Number(redeemPayload.new_gem_total ?? NaN);
      setNearbyOffers((prev) => prev.map((item) => (item.id === offer.id ? { ...item, redeemed: true } : item)));
      setSelectedOffer((prev) => (prev?.id === offer.id ? { ...offer, redeemed: true } : prev));
      if (user) {
        const fallbackTotal = Math.max(0, user.gems - gemCost);
        const safeTotal = Number.isFinite(newGemTotal) ? Math.min(newGemTotal, fallbackTotal) : fallbackTotal;
        updateUser({ gems: safeTotal });
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Offer Redeemed', `Your offer has been redeemed for ${gemCost} gems.`);
    } catch {
      Alert.alert('Redeem Offer', 'Could not redeem this offer right now.');
    }
  }, [updateUser, user]);

  // Reverse geocode for Orion context (throttled to ~1km moves)
  useEffect(() => {
    const rLat = Math.round(location.lat * 100);
    const rLng = Math.round(location.lng * 100);
    if (rLat === 0 && rLng === 0) return;
    reverseGeocode(location.lat, location.lng)
      .then((r) => {
        if (r?.address) setCurrentAddress(r.address);
        else if (r?.name) setCurrentAddress(r.name);
      })
      .catch((e) => logMapDataIssue('reverseGeocode', e));
  }, [Math.round(location.lat * 100), Math.round(location.lng * 100)]);

  useEffect(() => {
    if (!user?.isPremium) {
      if (showCameras) setShowCameras(false);
      setCameraLocations([]);
      return;
    }
    if (!showCameras) {
      setCameraLocations([]);
      return;
    }
    const rLat = Math.round(location.lat * 100);
    const rLng = Math.round(location.lng * 100);
    if (rLat === 0 && rLng === 0) return;
    api
      .get<any>(`/api/map/cameras?lat=${location.lat}&lng=${location.lng}&radius=80`)
      .then((r) => {
        if (!r.success || r.data == null) {
          if (!r.success) logMapDataIssue('GET /api/map/cameras', r.error);
          return;
        }
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
      })
      .catch((e) => logMapDataIssue('GET /api/map/cameras', e));
  }, [showCameras, user?.isPremium, setShowCameras, Math.round(location.lat * 100), Math.round(location.lng * 100)]);

  const refreshPhotoReportsNearby = useCallback(() => {
    if (!showPhotoReports) return;
    api
      .get<{ photos?: unknown[] }>(`/api/photo-reports/nearby?lat=${location.lat}&lng=${location.lng}&radius=5`)
      .then((r) => {
        if (!r.success) {
          logMapDataIssue('GET /api/photo-reports/nearby', r.error);
          return;
        }
        const raw = r.data as { photos?: unknown[] };
        const d = raw?.photos;
        if (!Array.isArray(d)) return;
        setPhotoReports(
          d.map((p: any) => ({
            id: String(p.id),
            lat: p.lat,
            lng: p.lng,
            type: p.type ?? 'photo',
            description: p.description,
            created_at: p.created_at ?? new Date().toISOString(),
            photo_url: typeof p.photo_url === 'string' ? p.photo_url : undefined,
            thumbnail_url: typeof p.thumbnail_url === 'string' ? p.thumbnail_url : undefined,
            upvotes: typeof p.upvotes === 'number' ? p.upvotes : 0,
          })),
        );
      })
      .catch((e) => logMapDataIssue('GET /api/photo-reports/nearby', e));
  }, [showPhotoReports, location.lat, location.lng]);

  // Fetch photo reports when layer enabled (API returns only active, public blurred URLs)
  useEffect(() => {
    refreshPhotoReportsNearby();
  }, [refreshPhotoReportsNearby, Math.round(location.lat * 100), Math.round(location.lng * 100)]);

  useEffect(() => {
    if (!showTrafficSafety) {
      setTrafficSafetyHint(null);
    }
  }, [showTrafficSafety]);

  // Traffic safety POIs (Overpass via API; hidden in restricted regions)
  useEffect(() => {
    const rLat = Math.round(location.lat * 100);
    const rLng = Math.round(location.lng * 100);
    if (rLat === 0 && rLng === 0) {
      setTrafficSafetyZones([]);
      setTrafficSafetyHint(null);
      return;
    }
    if (!showTrafficSafety || !isTrafficSafetyLayerEnabled(location.lat, location.lng)) {
      setTrafficSafetyZones([]);
      setTrafficSafetyHint(null);
      return;
    }
    const region = trafficSafetyRegionQuery(location.lat, location.lng);
    api
      .get<Record<string, unknown>>(
        `/api/traffic-safety/zones?lat=${location.lat}&lng=${location.lng}&radius_km=12&region=${encodeURIComponent(region)}`,
      )
      .then((r) => {
        if (!r.success || r.data == null) {
          setTrafficSafetyZones([]);
          setTrafficSafetyHint('Could not load speed camera data. Try again later.');
          return;
        }
        const raw = r.data as Record<string, unknown>;
        const payload =
          raw && typeof raw === 'object' && 'zones' in raw
            ? raw
            : (raw.data as Record<string, unknown> | undefined) ?? raw;
        if (payload?.disabled) {
          setTrafficSafetyZones([]);
          setTrafficSafetyHint(null);
          return;
        }
        const zl = payload?.zones;
        if (!Array.isArray(zl)) {
          setTrafficSafetyZones([]);
          setTrafficSafetyHint('Unexpected response from traffic safety service.');
          return;
        }
        const mapped = zl
          .map((z: any) => ({
            id: String(z?.id ?? ''),
            lat: Number(z?.lat),
            lng: Number(z?.lng),
            kind: typeof z?.kind === 'string' ? z.kind : 'speed_camera',
            maxspeed: z?.maxspeed ?? null,
          }))
          .filter((z: TrafficSafetyZone) => z.id && isFinite(z.lat) && isFinite(z.lng));
        setTrafficSafetyZones(mapped);

        if (mapped.length > 0) {
          setTrafficSafetyHint(null);
          return;
        }
        if (payload?.reason === 'rate_limited') {
          const sec = typeof payload.retry_after_seconds === 'number' ? payload.retry_after_seconds : 60;
          setTrafficSafetyHint(`Rate limited — try again in ~${sec}s.`);
          return;
        }
        if (payload?.limited) {
          setTrafficSafetyHint('No mapped speed cameras in this area (OpenStreetMap). Zoom out or move to try again.');
          return;
        }
        setTrafficSafetyHint('No speed camera POIs returned in this area yet.');
      })
      .catch((e) => {
        logMapDataIssue('GET /api/traffic-safety/zones', e);
        setTrafficSafetyZones([]);
        setTrafficSafetyHint('Network error loading speed cameras.');
      });
  }, [showTrafficSafety, Math.round(location.lat * 100), Math.round(location.lng * 100)]);

  // Crash detection removed — SOS endpoints (/api/family/sos, /api/concerns/submit) do not exist.
  // Will be re-implemented when family/emergency features are built with real backend support.

  // Fix 7: Supabase realtime for friend locations (INSERT + UPDATE — first share often INSERTs a row).
  useEffect(() => {
    if (!friendTrackingEnabled || !supabaseConfigured) return;
    const applyRealtimeRow = (payload: { new?: unknown }) => {
      const upd = parseLiveLocationUpdate(payload?.new);
      if (!upd) return;
      setFriendLocations((prev) => mergeLiveLocationUpdate(prev, {
        friend_id: upd.friendId,
        lat: upd.lat,
        lng: upd.lng,
        speed_mph: upd.speedMph,
        heading: upd.heading,
        is_sharing: upd.isSharing,
        is_navigating: upd.isNavigating,
        destination_name: upd.destinationName,
        battery_pct: upd.batteryPct,
        last_updated: upd.lastUpdated,
      }));
    };
    const channel = supabase.channel('friend-locations')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'live_locations' }, applyRealtimeRow)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_locations' }, applyRealtimeRow)
      .subscribe();
    /** Re-subscribe after app returns from background — the websocket may have gone stale. */
    const mapAppRef = { prev: AppState.currentState };
    const appSub = AppState.addEventListener('change', (next) => {
      if (mapAppRef.prev.match(/inactive|background/) && next === 'active') {
        try { channel.subscribe(); } catch { /* safe */ }
      }
      mapAppRef.prev = next;
    });
    return () => { appSub.remove(); supabase.removeChannel(channel); };
  }, [friendTrackingEnabled, supabaseConfigured]);

  // Fix 14: Camera tick + odometry. `navDisplayCoord` is SDK-matched when `navLogicSdkEnabled` (single engine); else JS snap.
  useEffect(() => {
    const moveThresholdM = nav.isNavigating ? 0.45 : 1.5;
    const moved = haversineMeters(lastCameraUpdate.current.lat, lastCameraUpdate.current.lng, navDisplayCoord.lat, navDisplayCoord.lng) > moveThresholdM;
    const turned = Math.abs(navDisplayHeading - lastCameraUpdate.current.heading) > 1;
    if (moved || turned) {
      lastCameraUpdate.current = { lat: navDisplayCoord.lat, lng: navDisplayCoord.lng, heading: navDisplayHeading };
      if (moved) nav.updatePosition(navDisplayCoord.lat, navDisplayCoord.lng);
    }
  }, [navDisplayCoord.lat, navDisplayCoord.lng, navDisplayHeading, nav.isNavigating, nav.updatePosition]);

  mapLivePublishCoordsRef.current = { lat: location.lat, lng: location.lng, heading, speed };
  mapLiveNavRef.current = {
    isNavigating: nav.isNavigating,
    destinationName: nav.selectedDestination?.name,
  };

  useEffect(() => {
    if (!user?.isPremium || !canPublishFriendLocation) return;
    const sharingOn = storage.getString(SHARE_LOC_STORAGE_KEY) === '1';
    if (!sharingOn) return;
    const rLat = Math.round(location.lat * 1000);
    const rLng = Math.round(location.lng * 1000);
    if (rLat === 0 && rLng === 0) return;
    const now = Date.now();
    if (now - lastLivePublishRef.current < 25000) return;
    lastLivePublishRef.current = now;

    let cancelled = false;
    (async () => {
      let battery_pct: number | undefined;
      try {
        const lvl = await Battery.getBatteryLevelAsync();
        if (cancelled) return;
        battery_pct = Math.round(Math.max(0, Math.min(1, lvl)) * 100);
      } catch {
        /* optional */
      }
      if (cancelled) return;
      const res = await api.post('/api/friends/location/update', {
        lat: location.lat,
        lng: location.lng,
        heading,
        speed_mph: speed,
        is_navigating: nav.isNavigating,
        destination_name: nav.selectedDestination?.name ?? undefined,
        is_sharing: true,
        battery_pct,
      });
      if (!res.success && res.statusCode === 503) setLivePublishPaused503(true);
    })();
    return () => { cancelled = true; };
  }, [
    user?.isPremium,
    canPublishFriendLocation,
    shareLocEpoch,
    location.lat,
    location.lng,
    heading,
    speed,
    nav.isNavigating,
    nav.selectedDestination?.name,
  ]);

  useEffect(() => {
    if (!user?.isPremium || !canPublishFriendLocation) return;
    let cancelled = false;
    const tick = () => {
      const sharingOn = storage.getString(SHARE_LOC_STORAGE_KEY) === '1';
      if (!sharingOn) return;
      const { lat, lng, heading: h, speed: sp } = mapLivePublishCoordsRef.current;
      const { isNavigating, destinationName } = mapLiveNavRef.current;
      const rLat = Math.round(lat * 1000);
      const rLng = Math.round(lng * 1000);
      if (rLat === 0 && rLng === 0) return;
      const now = Date.now();
      if (now - lastLivePublishRef.current < 25000) return;
      lastLivePublishRef.current = now;
      void (async () => {
        let battery_pct: number | undefined;
        try {
          const lvl = await Battery.getBatteryLevelAsync();
          if (cancelled) return;
          battery_pct = Math.round(Math.max(0, Math.min(1, lvl)) * 100);
        } catch {
          /* optional */
        }
        if (cancelled) return;
        const res = await api.post('/api/friends/location/update', {
          lat,
          lng,
          heading: h,
          speed_mph: sp,
          is_navigating: isNavigating,
          destination_name: destinationName ?? undefined,
          is_sharing: true,
          battery_pct,
        });
        if (!res.success && res.statusCode === 503) setLivePublishPaused503(true);
      })();
    };
    const id = setInterval(tick, 28_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [user?.isPremium, canPublishFriendLocation, shareLocEpoch]);

  // Fix 1: On nav start (false→true), force follow + remount Camera (preview fitBounds leaves native
  // camera stuck until follow re-binds). useLayoutEffect bumps session key before paint; imperative
  // flyTo runs after interactions so it does not race the preview bounds animation.
  const prevIsNavigatingForCameraRef = useRef(false);
  useLayoutEffect(() => {
    if (!nav.isNavigating) {
      prevIsNavigatingForCameraRef.current = false;
      return;
    }
    const enteringNav = !prevIsNavigatingForCameraRef.current;
    prevIsNavigatingForCameraRef.current = true;
    if (!enteringNav) return;

    setNavCameraSessionKey((k) => k + 1);
    setIsExploring(false);
    setTrafficBannerDismissed(false);
    setCameraLocked(true);
    userInteracting.current = false;
    setFollowMode('follow');
  }, [nav.isNavigating]);

  useEffect(() => {
    if (!nav.isNavigating) return;

    let cancelled = false;

    // Single rAF is enough to flush the current render cycle. The previous
    // InteractionManager + double-rAF + 700ms flyTo chain was causing ~1s lag
    // because it waited for the preview sheet dismiss animation to drain the
    // interaction queue before flying to the user's position.
    // defaultSettings now starts the remounted Camera at navDisplayCoordRef so
    // even if this flyTo is slightly late the camera is already at the right spot.
    requestAnimationFrame(() => {
      if (cancelled) return;
      const pad =
        camCtrlRef.current?.followPadding ??
        getNavigationFollowPaddingFallback(drivingMode, insets.top, insets.bottom);
      const zoom = camCtrlRef.current?.followZoomLevel ?? modeConfig.navZoom;
      const pitch = camCtrlRef.current?.followPitch ?? modeConfig.navPitch;
      const c = navDisplayCoordRef.current;
      const h = navDisplayHeadingRef.current;
      cameraRef.current?.setCamera({
        centerCoordinate: [c.lng, c.lat],
        heading: h,
        zoomLevel: zoom,
        pitch,
        padding: pad,
        animationMode: 'flyTo',
        // defaultSettings already centers on the puck at remount; 0ms avoids an extra ~350ms
        // fly competing with followUserLocation when starting navigation from route preview.
        animationDuration: 0,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [nav.isNavigating, navCameraSessionKey]);

  // Trip end: show summary card directly (no gem bounce animation)
  useEffect(() => {
    if (activeTripSummary) {
      setShowGemOverlay(false);
    }
  }, [activeTripSummary]);

  useEffect(() => {
    if (nav.showRoutePreview) {
      setRoutePreviewDetails(false);
      setRoutePreviewHeight(0);
    }
  }, [nav.showRoutePreview]);

  // Fit camera to route on preview — padding from safe area + measured sheet (avoid huge fixed bottom inset).
  useEffect(() => {
    if (!nav.showRoutePreview || !nav.navigationData?.polyline?.length) return;
    const coords = nav.navigationData.polyline;
    const lngs = coords.map((c) => c.lng);
    const lats = coords.map((c) => c.lat);
    const winH = Dimensions.get('window').height;
    const topPad = insets.top + 96;
    const sidePad = 44;
    const fallbackBottom = Math.round(winH * 0.4);
    const bottomPad =
      routePreviewHeight > 48
        ? routePreviewHeight + Math.max(insets.bottom, 12) + 12
        : Math.min(fallbackBottom + Math.max(insets.bottom, 8), Math.round(winH * 0.46));
    cameraRef.current?.fitBounds(
      [Math.max(...lngs), Math.max(...lats)],
      [Math.min(...lngs), Math.min(...lats)],
      [topPad, sidePad, bottomPad, sidePad],
      600,
    );
  }, [nav.showRoutePreview, nav.navigationData?.polyline, routePreviewHeight, insets.top, insets.bottom]);

  // Fix 5: Reroute when driving mode changes during active nav
  useEffect(() => {
    if (!nav.isNavigating || !nav.selectedDestination) return;
    if (navLogicSdkSessionEnabled) return;
    void nav.fetchDirections(nav.selectedDestination).then((r) => {
      if (!r.ok && r.reason === 'route_failed') {
        Alert.alert('Could not refresh route', r.message ?? 'Driving mode changed but directions failed. Try stopping navigation and starting again.');
      }
    });
  }, [drivingMode, nav, navLogicSdkSessionEnabled]);

  // Animate report card timer whenever a new report card shows
  useEffect(() => {
    if (activeReportCard) {
      reportTimerProg.value = 1;
      reportTimerProg.value = withTiming(0, { duration: 8000 });
    }
  }, [activeReportCard?.id]);

  const fetchNearbyIncidents = useCallback(async () => {
    const loc = locationRef.current;
    if (!loc || (Math.abs(loc.lat) < 1e-5 && Math.abs(loc.lng) < 1e-5)) return;
    try {
      const res = await api.get<{ success?: boolean; data?: Incident[] }>(
        `/api/incidents/nearby?lat=${loc.lat}&lng=${loc.lng}&radius_miles=2`,
      );
      if (!res.success || res.data == null) return;
      const d = (res.data as { data?: Incident[] }).data;
      if (Array.isArray(d)) setNearbyIncidents(d);
    } catch { /* offline / tunnel */ }
  }, []);

  /** Lets backend notify other drivers within ~1 mi when incidents are confirmed (migration 039). */
  useEffect(() => {
    const ping = () => {
      const loc = locationRef.current;
      if (!loc || Math.abs(loc.lat) < 1e-5) return;
      void api.post('/api/user/location-ping', { lat: loc.lat, lng: loc.lng }).catch(() => {});
    };
    ping();
    const id = setInterval(ping, 90_000);
    return () => clearInterval(id);
  }, []);

  // Incident polling — faster while incidents layer is on so pins appear quickly
  useEffect(() => {
    void fetchNearbyIncidents();
    const ms = showIncidents ? (nav.isNavigating ? 8000 : 10000) : nav.isNavigating ? 15000 : 45000;
    reportPollRef.current = setInterval(() => void fetchNearbyIncidents(), ms);
    return () => {
      if (reportPollRef.current) clearInterval(reportPollRef.current);
    };
  }, [nav.isNavigating, fetchNearbyIncidents, showIncidents]);

  useEffect(() => {
    if (!nav.isNavigating) announcedOfferNavRef.current.clear();
  }, [nav.isNavigating]);

  /** Voice offer hints during navigation (same TTS stack as turn-by-turn). */
  useEffect(() => {
    if (!nav.isNavigating || !recommendedNearbyOffers.length) return;
    const ordered = [...recommendedNearbyOffers].sort((a, b) => {
      const da = haversineMeters(location.lat, location.lng, a.lat ?? 0, a.lng ?? 0);
      const db = haversineMeters(location.lat, location.lng, b.lat ?? 0, b.lng ?? 0);
      return da - db;
    });
    for (const o of ordered) {
      if (o.lat == null || o.lng == null) continue;
      const d = haversineMeters(location.lat, location.lng, o.lat, o.lng);
      if (d < 80 || d > 1800) continue;
      const id = String(o.id);
      if (announcedOfferNavRef.current.has(id)) continue;
      announcedOfferNavRef.current.add(id);
      const name = o.business_name || 'Partner offer';
      speak(`Orion: SnapRoad offer nearby — ${name}.`, 'normal', drivingMode);
      break;
    }
  }, [nav.isNavigating, recommendedNearbyOffers, location.lat, location.lng, drivingMode]);

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
      const voiceTypes = ['accident', 'police', 'crash', 'hazard', 'construction', 'closure', 'weather'];
      if (voiceTypes.includes(nearest.type)) {
        const dist = (haversineMeters(location.lat, location.lng, nearest.lat, nearest.lng) / 1609.34).toFixed(1);
        speak(`Caution, ${nearest.title || nearest.type} reported ${dist} miles ahead.`, 'high', drivingMode);
      }
      if (reportCardTimeoutRef.current) clearTimeout(reportCardTimeoutRef.current);
      reportCardTimeoutRef.current = setTimeout(() => setActiveReportCard(null), 10000);
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
        if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
        confirmTimeoutRef.current = setTimeout(() => setConfirmIncident(null), 10000);
        break;
      }
    }
  }, [nav.isNavigating, isAmbient, location.lat, location.lng, nearbyIncidents]);

  // Offer voice announcements during navigation (max 2 per trip, 1-2 miles)
  const offerAnnouncementCount = useRef(0);
  const announcedOfferIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!nav.isNavigating) {
      offerAnnouncementCount.current = 0;
      announcedOfferIds.current.clear();
      navigationTripIdRef.current = '';
      return;
    }
    if (!navigationTripIdRef.current) {
      navigationTripIdRef.current = `trip-${Date.now()}`;
    }
  }, [nav.isNavigating]);
  useEffect(() => {
    if (!nav.isNavigating || offerAnnouncementCount.current >= 2 || !navigationTripIdRef.current) return;
    api.get<any>(`/api/navigation/nearby-offers?lat=${location.lat}&lng=${location.lng}&trip_id=${encodeURIComponent(navigationTripIdRef.current)}`)
      .then((res) => {
        if (!res.success) return;
        const items = (res.data as any)?.data ?? res.data ?? [];
        if (!Array.isArray(items) || items.length === 0) return;
        const offer = items[0] as Offer & { distance_miles?: number };
        const oid = String(offer.id);
        if (announcedOfferIds.current.has(oid)) return;
        announcedOfferIds.current.add(oid);
        offerAnnouncementCount.current += 1;
        const name = offer.business_name || 'a nearby store';
        const distance = typeof offer.distance_miles === 'number' ? offer.distance_miles : 0.5;
        speak(`There's a ${offer.discount_percent}% off offer at ${name}, about ${distance.toFixed(1)} miles ahead. Would you like me to add a stop?`, 'normal', drivingMode);
      })
      .catch((e) => logMapDataIssue('GET /api/navigation/nearby-offers', e));
  }, [nav.isNavigating, location.lat, location.lng, drivingMode]);

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
      if (reportCardTimeoutRef.current) clearTimeout(reportCardTimeoutRef.current);
      reportCardTimeoutRef.current = setTimeout(() => setActiveReportCard(null), 8000);
    }
  }, [isAmbient, nearbyIncidents, drivingMode, heading, location.lat, location.lng]);

  // ─── Callbacks ─────────────────────────────────────────────────────────────

  const sortGeocodeByProximity = useCallback((rows: GeocodeResult[], loc: { lat: number; lng: number }) => {
    const hasLoc = Math.abs(loc.lat) > 1e-5 || Math.abs(loc.lng) > 1e-5;
    if (!hasLoc) return rows;
    return [...rows].sort((a, b) => {
      const da =
        a.lat !== 0 && a.lng !== 0
          ? haversineMeters(loc.lat, loc.lng, a.lat, a.lng)
          : Number.POSITIVE_INFINITY;
      const db =
        b.lat !== 0 && b.lng !== 0
          ? haversineMeters(loc.lat, loc.lng, b.lat, b.lng)
          : Number.POSITIVE_INFINITY;
      return da - db;
    });
  }, []);

  /** Re-align Recent open/closed with `/api/places/details` (same source as PlaceDetailSheet). */
  const refreshRecentOpenStatus = useCallback(async () => {
    const list = recentSearchesRef.current;
    if (list.length === 0) return;
    const indices = list
      .map((r, i) => ({ r, i }))
      .filter(
        ({ r }) =>
          Boolean(r.place_id) &&
          (!isOpenNowFresh(r.open_now_last_updated_at) || typeof r.open_now !== 'boolean'),
      )
      .slice(0, 15)
      .map((x) => x.i);
    if (indices.length === 0) return;

    const next = [...list];
    const concurrency = 4;
    for (let k = 0; k < indices.length; k += concurrency) {
      const batch = indices.slice(k, k + concurrency);
      await Promise.all(
        batch.map(async (i) => {
          const r = next[i];
          const pid = r.place_id;
          if (!pid) return;
          try {
            const res = await api.get<Record<string, unknown>>(`/api/places/details/${pid}`);
            if (!res.success || res.data == null) return;
            const outer = res.data as { data?: Record<string, unknown> };
            const d = outer.data ?? (res.data as Record<string, unknown>);
            if (!d || typeof d !== 'object') return;
            const open = parseOpenNowBooleanFromDetailsPayload(d);
            next[i] = {
              ...next[i],
              open_now: open === null ? undefined : open,
              open_now_last_updated_at: Date.now(),
            };
          } catch {
            /* offline / quota */
          }
        }),
      );
    }
    setRecentSearches(next);
    storage.set('snaproad_recent_searches', JSON.stringify(next));
  }, []);

  useEffect(() => {
    if (!mapTabFocused) return;
    const t = setTimeout(() => {
      void refreshRecentOpenStatus();
    }, 700);
    return () => clearTimeout(t);
  }, [mapTabFocused, recentSearches.length, refreshRecentOpenStatus]);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!text.trim() || text.trim().length < 2) { setSearchResults([]); setIsSearching(false); return; }
    setIsSearching(true);
    const gen = ++searchGenRef.current;
    searchTimerRef.current = setTimeout(async () => {
      const loc = locationRef.current;
      const hasLoc = Math.abs(loc.lat) > 1e-5 || Math.abs(loc.lng) > 1e-5;
      const prep = prepareMapSearchQuery(text.trim());
      const localFirst = localMatchesForSearchQuery(prep.query, savedPlaces, recentSearches);
      if (prep.query.length < 2) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      // Text Search returns photo_reference + price_level; Autocomplete does not (fixes short queries like "kro" with no thumbnail).
      const looksLikeStreetAddress = /^\d+\s+\S/.test(prep.query.trim());
      const useTextSearch =
        prep.preferTextSearch
        || (hasLoc && prep.query.length >= 2 && prep.query.length <= 28 && !looksLikeStreetAddress);
      const biasQs = hasLoc
        ? `&lat=${loc.lat}&lng=${loc.lng}&radius=${prep.radiusM}${prep.openNow ? '&open_now=true' : ''}${useTextSearch ? '&textsearch=true' : ''}`
        : '';
      try {
        const res = await api.get<any>(
          `/api/places/autocomplete?q=${encodeURIComponent(prep.query)}${biasQs}`,
        );
        if (searchGenRef.current !== gen) return;
        const root = res.data as any;
        const predictions = root?.data ?? root?.predictions ?? [];
        if (Array.isArray(predictions) && predictions.length > 0) {
          const mapped: GeocodeResult[] = predictions.map((p: any) =>
            withOpenNowObservation({
              name: p.name || p.description || prep.query,
              address: p.address || p.description || '',
              lat: p.lat ?? 0,
              lng: p.lng ?? 0,
              placeType: p.types?.[0] ?? 'poi',
              place_id: p.place_id,
              photo_reference: typeof p.photo_reference === 'string' ? p.photo_reference : undefined,
              open_now: typeof p.open_now === 'boolean' ? p.open_now : undefined,
              price_level: typeof p.price_level === 'number' ? p.price_level : undefined,
            }),
          );
          const merged = dedupeGeocodeResults([...localFirst, ...mapped]);
          setSearchResults(sortGeocodeByProximity(merged, loc));
          setIsSearching(false);
          return;
        }
      } catch {}
      if (searchGenRef.current !== gen) return;
      const mbResults = await forwardGeocode(prep.query, hasLoc ? loc : undefined);
      if (searchGenRef.current !== gen) return;
      const filtered =
        hasLoc
          ? mbResults.filter((r) => haversineMeters(loc.lat, loc.lng, r.lat, r.lng) <= 50000)
          : mbResults;
      const merged = dedupeGeocodeResults([...localFirst, ...filtered]);
      setSearchResults(sortGeocodeByProximity(merged, loc));
      setIsSearching(false);
    }, 200);
  }, [sortGeocodeByProximity, savedPlaces, recentSearches]);

  /** Enter key: forced text search + nearby merge + Mapbox forward geocode, deduped and distance-sorted. */
  const commitSearch = useCallback(async () => {
    const raw = searchQueryRef.current.trim();
    if (raw.length < 2) {
      Keyboard.dismiss();
      setIsSearchFocused(false);
      return;
    }
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    setIsSearching(true);
    const gen = ++searchGenRef.current;
    const loc = locationRef.current;
    const hasLoc = Math.abs(loc.lat) > 1e-5 || Math.abs(loc.lng) > 1e-5;
    const prep = prepareMapSearchQuery(raw);
    if (prep.query.length < 2) {
      setIsSearching(false);
      Keyboard.dismiss();
      return;
    }
    const localFirst = localMatchesForSearchQuery(prep.query, savedPlaces, recentSearches);
    const mapPred = (p: any): GeocodeResult =>
      withOpenNowObservation({
        name: p.name || p.description || prep.query,
        address: p.address || p.description || '',
        lat: p.lat ?? 0,
        lng: p.lng ?? 0,
        placeType: p.types?.[0] ?? 'poi',
        place_id: p.place_id,
        photo_reference: typeof p.photo_reference === 'string' ? p.photo_reference : undefined,
        open_now: typeof p.open_now === 'boolean' ? p.open_now : undefined,
        price_level: typeof p.price_level === 'number' ? p.price_level : undefined,
      });

    const bucket: GeocodeResult[] = [...localFirst];

    try {
      const biasQs = hasLoc
        ? `&lat=${loc.lat}&lng=${loc.lng}&radius=${prep.radiusM}${prep.openNow ? '&open_now=true' : ''}&textsearch=true`
        : '';
      const res = await api.get<any>(
        `/api/places/autocomplete?q=${encodeURIComponent(prep.query)}${biasQs}`,
      );
      if (searchGenRef.current !== gen) return;
      const root = res.data as any;
      const predictions = root?.data ?? root?.predictions ?? [];
      if (Array.isArray(predictions) && predictions.length > 0) {
        bucket.push(...predictions.map(mapPred));
      }
    } catch {
      /* offline */
    }

    if (hasLoc) {
      try {
        const nr = await api.get<any>(
          `/api/places/nearby?lat=${loc.lat}&lng=${loc.lng}&radius=${Math.min(prep.radiusM, 12000)}&limit=20`,
        );
        if (searchGenRef.current !== gen) return;
        const root = nr.data as Record<string, unknown> | undefined;
        const payload = root?.data ?? root;
        const arr = Array.isArray(payload) ? payload : [];
        for (const p of arr) {
          const rec = p as Record<string, unknown>;
          bucket.push(
            withOpenNowObservation({
              name: String(rec.name ?? ''),
              address: String(rec.address ?? ''),
              lat: Number(rec.lat) || 0,
              lng: Number(rec.lng) || 0,
              place_id: rec.place_id != null ? String(rec.place_id) : undefined,
              placeType: Array.isArray(rec.types) && rec.types[0] ? String(rec.types[0]) : undefined,
              photo_reference: rec.photo_reference != null ? String(rec.photo_reference) : undefined,
              open_now: typeof rec.open_now === 'boolean' ? rec.open_now : undefined,
              price_level: typeof rec.price_level === 'number' ? rec.price_level : undefined,
            }),
          );
        }
      } catch {
        /* offline */
      }
    }

    if (searchGenRef.current !== gen) return;

    let merged = dedupeGeocodeResults(bucket);
    const mbResults = await forwardGeocode(prep.query, hasLoc ? loc : undefined);
    if (searchGenRef.current !== gen) return;
    const filtered = hasLoc
      ? mbResults.filter((r) => haversineMeters(loc.lat, loc.lng, r.lat, r.lng) <= 50000)
      : mbResults;
    merged = dedupeGeocodeResults([...merged, ...filtered]);
    setSearchResults(sortGeocodeByProximity(merged, loc));
    setIsSearching(false);
    if (merged.length > 0) {
      setIsSearchFocused(true);
    }
    Keyboard.dismiss();
  }, [savedPlaces, recentSearches, sortGeocodeByProximity]);

  const openSearchResultsSheet = useCallback(() => {
    const q = searchQuery.trim();
    if (!q || searchResults.length === 0) return;
    const mapped = searchResults.map((r) => ({
      name: r.name,
      address: r.address || '',
      lat: r.lat,
      lng: r.lng,
      place_id: r.place_id,
      placeType: r.placeType,
      photo_reference: r.photo_reference,
      open_now: r.open_now === undefined ? null : r.open_now,
      price_level: r.price_level ?? null,
    }));
    setCategoryExplore({
      title: `“${q}”`,
      subtitle: `${mapped.length} place${mapped.length === 1 ? '' : 's'} — tap one for full details and directions.`,
      results: mapped,
      error: null,
      loading: false,
    });
    Keyboard.dismiss();
    setIsSearchFocused(false);
  }, [searchQuery, searchResults]);

  const handleSelectResult = useCallback(async (result: GeocodeResult & { place_id?: string }) => {
    Keyboard.dismiss();
    setSearchQuery('');
    setSearchResults([]);
    setIsSearchFocused(false);
    setIsExploring(false);

    const buildRecentRow = (
      base: GeocodeResult,
      detail: Record<string, unknown> | null,
      observedAt: number,
    ): GeocodeResult => {
      if (!detail) {
        return { ...base, open_now: undefined, open_now_last_updated_at: undefined };
      }
      const open = parseOpenNowBooleanFromDetailsPayload(detail);
      return {
        ...base,
        open_now: open === null ? undefined : open,
        open_now_last_updated_at: observedAt,
      };
    };

    if (result.place_id) {
      let lat = Number(result.lat);
      let lng = Number(result.lng);
      let detailRecord: Record<string, unknown> | null = null;
      try {
        const details = await api.get<any>(`/api/places/details/${result.place_id}`);
        const d = details.data?.data ?? details.data;
        if (d && typeof d === 'object') detailRecord = d as Record<string, unknown>;
      } catch {
        detailRecord = null;
      }

      const hasCoords = () =>
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        (Math.abs(lat) > 1e-6 || Math.abs(lng) > 1e-6);

      if (detailRecord) {
        const dlat = Number(
          detailRecord.lat ?? (detailRecord.geometry as { location?: { lat?: number } })?.location?.lat,
        );
        const dlng = Number(
          detailRecord.lng ?? (detailRecord.geometry as { location?: { lng?: number } })?.location?.lng,
        );
        if (!hasCoords() && Number.isFinite(dlat) && Number.isFinite(dlng)) {
          lat = dlat;
          lng = dlng;
        }
      } else if (!hasCoords()) {
        lat = NaN;
        lng = NaN;
      }

      const observedAt = Date.now();
      const recentRow = buildRecentRow(result, detailRecord, observedAt);
      const updated = [recentRow, ...recentSearches.filter((r) => r.name !== result.name)].slice(0, 10);
      setRecentSearches(updated);
      storage.set('snaproad_recent_searches', JSON.stringify(updated));

      if (hasCoords()) {
        cameraRef.current?.setCamera({ centerCoordinate: [lng, lat], zoomLevel: 16, pitch: 45, animationDuration: 800 });
      } else {
        Alert.alert(
          'Location unavailable',
          'Could not load coordinates for this place. Try another search result or open the listing again in a moment.',
        );
      }

      const summaryOpen = detailRecord ? parseOpenNowBooleanFromDetailsPayload(detailRecord) : null;
      setSelectedPlace({
        name: result.name,
        address: result.address,
        lat: hasCoords() ? lat : 0,
        lng: hasCoords() ? lng : 0,
        placeType: result.placeType,
        category: result.placeType ?? result.category,
        price_level: result.price_level,
        open_now: summaryOpen === null ? undefined : summaryOpen,
      });
      setSelectedPlaceId(result.place_id);
      return;
    }

    const recentRowNoPid: GeocodeResult = {
      ...result,
      open_now: undefined,
      open_now_last_updated_at: undefined,
    };
    const updatedNo = [recentRowNoPid, ...recentSearches.filter((r) => r.name !== result.name)].slice(0, 10);
    setRecentSearches(updatedNo);
    storage.set('snaproad_recent_searches', JSON.stringify(updatedNo));

    setSelectedPlace({
      name: result.name,
      address: result.address,
      category: result.category,
      maki: result.maki,
      placeType: result.placeType,
      price_level: result.price_level,
      open_now: undefined,
      lat: result.lat,
      lng: result.lng,
    });
    cameraRef.current?.setCamera({
      centerCoordinate: [result.lng, result.lat],
      zoomLevel: 16,
      pitch: 45,
      animationDuration: 800,
    });
  }, [recentSearches]);

  const openCategoryExplore = useCallback((chipKey: string) => {
    setActiveChip(chipKey);
    if (chipKey === 'favorites') {
      const favs = savedPlaces.filter(
        (p) => (p.category || '').toLowerCase() === 'favorite',
      );
      const withCoords = favs.filter((p) => p.lat != null && p.lng != null);
      if (withCoords.length === 0) {
        Alert.alert('No favorites', 'Use the heart on a place card to add favorites, or save a place in Profile.');
        return;
      }
      setCategoryExplore({
        title: 'Your favorites',
        subtitle: 'Tap a place for full details and directions.',
        results: withCoords.map((p) => ({
          name: p.name,
          address: p.address ?? '',
          lat: Number(p.lat),
          lng: Number(p.lng),
          placeType: p.category,
        })),
        error: null,
        loading: false,
      });
      return;
    }
    const EXPLORE: Record<string, { title: string; subtitle?: string; type?: string; radius: number; limit: number }> = {
      nearby: { title: 'Nearby', subtitle: 'Places around your location', radius: 1200, limit: 15 },
      gas: {
        title: 'Gas',
        subtitle:
          'Stations near you (typical cost tier when Google provides it). Live $/gal is not shown — confirm at the pump.',
        type: 'gas_station',
        radius: 15000,
        limit: 20,
      },
      food: { title: 'Restaurants', type: 'restaurant', radius: 5000, limit: 18 },
      coffee: { title: 'Coffee & cafés', type: 'cafe', radius: 5000, limit: 18 },
      parking: { title: 'Parking', type: 'parking', radius: 5000, limit: 18 },
      ev: {
        title: 'EV charging',
        subtitle: 'Nearby + text search combined for real public chargers. Tap a row for details.',
        type: 'electric_vehicle_charging_station',
        radius: 15000,
        limit: 18,
      },
      grocery: { title: 'Grocery stores', type: 'supermarket', radius: 8000, limit: 18 },
    };
    const cfg = EXPLORE[chipKey];
    if (!cfg) return;
    setCategoryExplore({ title: cfg.title, subtitle: cfg.subtitle, results: [], error: null, loading: true });
    const lat0 = location.lat;
    const lng0 = location.lng;
    const typeQs = cfg.type ? `&type=${encodeURIComponent(cfg.type)}` : '';
    void api
      .get<any>(`/api/places/nearby?lat=${lat0}&lng=${lng0}&radius=${cfg.radius}${typeQs}&limit=${cfg.limit}`)
      .then((r) => {
        if (!r.success) {
          setCategoryExplore((prev) =>
            prev ? { ...prev, loading: false, error: r.error || 'Could not load places.', results: [] } : null,
          );
          return;
        }
        const root = r.data as Record<string, unknown> | undefined;
        if (root && root.success === false) {
          const err = String((root as { error?: string }).error || 'Could not load places.');
          setCategoryExplore((prev) => (prev ? { ...prev, loading: false, error: err, results: [] } : null));
          return;
        }
        const payload = root?.data ?? root;
        const arr = Array.isArray(payload) ? payload : [];
        const mapped = arr.map((p: Record<string, unknown>) => ({
          name: String(p.name ?? ''),
          address: String(p.address ?? ''),
          lat: Number(p.lat) || 0,
          lng: Number(p.lng) || 0,
          place_id: p.place_id != null ? String(p.place_id) : undefined,
          rating: typeof p.rating === 'number' ? p.rating : undefined,
          placeType: Array.isArray(p.types) && p.types[0] ? String(p.types[0]) : undefined,
          photo_reference: p.photo_reference != null ? String(p.photo_reference) : undefined,
          open_now: typeof p.open_now === 'boolean' ? p.open_now : null,
          price_level: typeof p.price_level === 'number' ? p.price_level : null,
          business_status: p.business_status != null ? String(p.business_status) : undefined,
        }));
        mapped.sort(
          (a, b) => haversineMeters(lat0, lng0, a.lat, a.lng) - haversineMeters(lat0, lng0, b.lat, b.lng),
        );
        setCategoryExplore((prev) =>
          prev ? { ...prev, loading: false, error: null, results: mapped } : null,
        );
      });
  }, [location.lat, location.lng, savedPlaces]);

  const orionFavoriteSummary = useMemo(
    () =>
      savedPlaces
        .filter((p) => (p.category || '').toLowerCase() === 'favorite')
        .slice(0, 8)
        .map((p) => p.name)
        .join(', '),
    [savedPlaces],
  );

  const orionCurrentRoute = useMemo(() => {
    if (!nav.navigationData) return undefined;
    const steps = nav.navigationData.steps;
    const idx = nav.currentStepIndex;
    const prog = nav.navigationProgress;
    return {
      destination: nav.navigationData.destination?.name ?? '',
      distanceMiles:
        prog != null
          ? Math.max(0, prog.distanceRemainingMeters / 1609.34)
          : nav.liveEta?.distanceMiles ?? (nav.navigationData.distance || 0) / 1609.34,
      remainingMinutes:
        prog != null
          ? Math.max(0, prog.durationRemainingSeconds / 60)
          : nav.liveEta?.etaMinutes ?? Math.round((nav.navigationData.duration || 0) / 60),
      currentStep: steps?.[idx]?.instruction ?? '',
      nextStep: steps?.[idx + 1]?.instruction ?? '',
    };
  }, [
    nav.navigationData,
    nav.currentStepIndex,
    nav.navigationProgress,
    nav.liveEta?.distanceMiles,
    nav.liveEta?.etaMinutes,
  ]);

  useEffect(() => {
    if (!orionQuickReply) return;
    const t = setTimeout(() => setOrionQuickReply(null), nav.isNavigating ? 5500 : 4200);
    return () => clearTimeout(t);
  }, [orionQuickReply, nav.isNavigating]);

  const orionContext = useMemo(() => ({
    lat: location.lat,
    lng: location.lng,
    isNavigating: nav.isNavigating,
    drivingMode,
    destination: nav.navigationData?.destination?.name,
    speed,
    speedMph: speed,
    currentAddress,
    userName: user?.name || user?.email,
    totalTrips: user?.totalTrips,
    totalMiles: user?.totalMiles,
    gems: user?.gems,
    level: user?.level,
    safetyScore: user?.safetyScore,
    snapRoadScore: user?.snapRoadScore,
    snapRoadTier: user?.snapRoadTier,
    isPremium: user?.isPremium,
    favoritePlacesSummary: orionFavoriteSummary || undefined,
    currentRoute: orionCurrentRoute,
    nearbyOffers: recommendedNearbyOffers.slice(0, 5).map((o) => ({
      id: o.id,
      title: o.business_name,
      partner_name: o.business_name,
      lat: o.lat,
      lng: o.lng,
    })),
    weather: mapWeather.summary ?? undefined,
    pendingOrionSuggestions: orionPendingSuggestions,
  }), [
    location.lat,
    location.lng,
    nav.isNavigating,
    nav.navigationData?.destination?.name,
    speed,
    currentAddress,
    user?.name,
    user?.email,
    user?.totalTrips,
    user?.totalMiles,
    user?.gems,
    user?.level,
    user?.safetyScore,
    user?.snapRoadScore,
    user?.snapRoadTier,
    user?.isPremium,
    drivingMode,
    orionFavoriteSummary,
    orionCurrentRoute,
    recommendedNearbyOffers,
    mapWeather.summary,
    orionPendingSuggestions,
  ]);

  const handleStartDirections = useCallback(
    async (
      place: { name: string; address?: string; lat: number; lng: number },
      opts?: { preserveFriendFollow?: boolean },
    ) => {
      if (
        !Number.isFinite(place.lat) ||
        !Number.isFinite(place.lng) ||
        (Math.abs(place.lat) < 1e-5 && Math.abs(place.lng) < 1e-5)
      ) {
        Alert.alert(
          'Directions unavailable',
          'This place does not have a valid location yet. Wait for details to load, search again, or pick another result.',
        );
        return;
      }
      const origin = locationRef.current;
      const originOk =
        Number.isFinite(origin.lat) &&
        Number.isFinite(origin.lng) &&
        (Math.abs(origin.lat) > 1e-5 || Math.abs(origin.lng) > 1e-5);
      if (!originOk) {
        if (permissionDenied) {
          Alert.alert(
            'Location needed',
            'SnapRoad needs your location to build a route. Enable location services for SnapRoad in Settings.',
          );
        } else if (isLocating) {
          Alert.alert('Getting your location', 'Wait a moment for GPS, then try Directions again.');
        } else {
          Alert.alert(
            'Location needed',
            'We could not determine your current location. Open the Map tab and wait for the blue dot, or check permissions.',
          );
        }
        return;
      }
      if (!opts?.preserveFriendFollow) {
        setFriendFollowSession(null);
        friendFollowLastDestRef.current = null;
        friendFollowLastRerouteRef.current = 0;
        friendFollowRerouteBusyRef.current = false;
      }
      setSelectedPlace(null);
      setSelectedPlaceId(null);
      nav.setSelectedDestination({ name: place.name, address: place.address ?? '', lat: place.lat, lng: place.lng });
      nav.resetRoutePlanningState();
      const tripJustEnded = nav.lastTripEndedAtMs > 0 && Date.now() - nav.lastTripEndedAtMs < 120_000;
      if (tripJustEnded) {
        await new Promise<void>((r) => setTimeout(r, 1500));
      }
      const routeResult = await nav.fetchDirections(
        { name: place.name, address: place.address ?? '', lat: place.lat, lng: place.lng },
        origin,
        { maxHeightMeters: avoidLowClearances ? vehicleHeight : undefined },
      );
      if (routeResult.ok) {
        nav.clearLastTripEndedMark();
      }
      if (!routeResult.ok) {
        const detail = routeResult.message ?? 'Try again in a moment.';
        if (routeResult.reason === 'no_mapbox') {
          Alert.alert(
            'Navigation setup',
            'SnapRoad needs a Mapbox public token to compute routes. Set EXPO_PUBLIC_MAPBOX_TOKEN in app/mobile/.env (or EAS env) and restart Metro / rebuild the app.',
          );
        } else if (routeResult.reason === 'invalid_input') {
          Alert.alert('Directions unavailable', detail);
        } else {
          Alert.alert('Could not plan route', detail);
        }
      }
    },
    [nav, avoidLowClearances, vehicleHeight, permissionDenied, isLocating],
  );

  const beginFriendFollowNavigation = useCallback(
    (p: { friendId: string; name: string; lat: number; lng: number; isLiveFresh: boolean }) => {
      if (!p.friendId) {
        void handleStartDirections({ name: p.name, address: `Meet ${p.name}`, lat: p.lat, lng: p.lng });
        return;
      }
      const engine: 'sdk_snapshot' | 'js_live' | 'js_snapshot' =
        navLogicSdkEnabled()
          ? 'sdk_snapshot'
          : p.isLiveFresh
            ? 'js_live'
            : 'js_snapshot';
      setFriendFollowSession({
        friendId: p.friendId,
        name: p.name,
        mode: engine === 'js_live' ? 'live' : 'last_known',
        startedLive: p.isLiveFresh,
        engine,
      });
      friendFollowLastDestRef.current = { lat: p.lat, lng: p.lng };
      friendFollowLastRerouteRef.current = Date.now();
      friendFollowRerouteBusyRef.current = false;
      void handleStartDirections(
        { name: p.name, address: `Meet ${p.name}`, lat: p.lat, lng: p.lng },
        { preserveFriendFollow: true },
      );
    },
    [handleStartDirections],
  );

  const lastNavigateFriendNonceRef = useRef<number | null>(null);
  useEffect(() => {
    const p = route.params?.navigateToFriend as NavigateToFriendParams | undefined;
    if (!p?.nonce || !p.name || p.lat == null || p.lng == null) return;
    if (!isFinite(p.lat) || !isFinite(p.lng) || (Math.abs(p.lat) < 1e-6 && Math.abs(p.lng) < 1e-6)) return;
    if (lastNavigateFriendNonceRef.current === p.nonce) return;
    lastNavigateFriendNonceRef.current = p.nonce;
    rnNav.setParams({ navigateToFriend: undefined } as never);
    const fid = p.friendId ?? '';
    const fresh =
      typeof p.isLiveFresh === 'boolean'
        ? p.isLiveFresh
        : isLiveShareFresh(true, p.lastUpdated, p.lat, p.lng);
    beginFriendFollowNavigation({
      friendId: fid,
      name: p.name,
      lat: p.lat,
      lng: p.lng,
      isLiveFresh: fresh,
    });
  }, [route.params?.navigateToFriend?.nonce, beginFriendFollowNavigation, rnNav]);

  const lastMapFocusFriendNonceRef = useRef<number | null>(null);
  useEffect(() => {
    const p = route.params?.mapFocusFriend as MapFocusFriendParams | undefined;
    if (!p?.friendId || p.nonce == null) return;
    if (lastMapFocusFriendNonceRef.current === p.nonce) return;
    lastMapFocusFriendNonceRef.current = p.nonce;
    rnNav.setParams({ mapFocusFriend: undefined } as never);
    const fl = friendLocations.find((f) => String(f.id) === String(p.friendId));
    let lat: number | undefined;
    let lng: number | undefined;
    if (fl && Number.isFinite(fl.lat) && Number.isFinite(fl.lng) && !(Math.abs(fl.lat) < 1e-6 && Math.abs(fl.lng) < 1e-6)) {
      lat = fl.lat;
      lng = fl.lng;
    } else if (
      p.lat != null &&
      p.lng != null &&
      Number.isFinite(p.lat) &&
      Number.isFinite(p.lng) &&
      !(Math.abs(p.lat) < 1e-6 && Math.abs(p.lng) < 1e-6)
    ) {
      lat = p.lat;
      lng = p.lng;
    }
    if (lat == null || lng == null) return;
    cameraRef.current?.setCamera({
      centerCoordinate: [lng, lat],
      zoomLevel: 15,
      pitch: 45,
      animationDuration: 650,
      animationMode: 'flyTo',
    } as any);
  }, [route.params?.mapFocusFriend?.nonce, friendLocations, rnNav]);

  const friendFollowNavActiveRef = useRef(false);
  useEffect(() => {
    const active = nav.isNavigating || nav.showRoutePreview;
    const wasActive = friendFollowNavActiveRef.current;
    friendFollowNavActiveRef.current = active;
    if (wasActive && !active) {
      setFriendFollowSession(null);
      friendFollowLastDestRef.current = null;
      friendFollowLastRerouteRef.current = 0;
      friendFollowRerouteBusyRef.current = false;
    }
  }, [nav.isNavigating, nav.showRoutePreview]);

  useEffect(() => {
    const sess = friendFollowSessionRef.current;
    if (!sess || !nav.isNavigating) return;
    const fl = friendLocations.find((x) => String(x.id) === String(sess.friendId));
    if (!fl) return;
    const fresh = isLiveShareFresh(fl.isSharing, fl.lastUpdated || undefined, fl.lat, fl.lng);
    setFriendFollowSession((prev) => {
      if (!prev) return prev;
      const mode: 'live' | 'last_known' =
        prev.engine === 'js_live' && prev.startedLive && fresh && fl.isSharing
          ? 'live'
          : 'last_known';
      return prev.mode === mode ? prev : { ...prev, mode };
    });
  }, [friendLocations, nav.isNavigating]);

  useEffect(() => {
    const sess = friendFollowSessionRef.current;
    if (!sess || !nav.isNavigating) return;
    if (sess.engine !== 'js_live' || sess.mode !== 'live') return;
    const fl = friendLocations.find((x) => String(x.id) === String(sess.friendId));
    if (!fl) return;
    const fresh = isLiveShareFresh(fl.isSharing, fl.lastUpdated || undefined, fl.lat, fl.lng);
    if (!fresh || !fl.isSharing) return;

    const last = friendFollowLastDestRef.current;
    if (!last) return;
    const moved = haversineMeters(last.lat, last.lng, fl.lat, fl.lng);
    const now = Date.now();
    if (moved < 125) return;
    if (now - friendFollowLastRerouteRef.current < 52_000) return;
    if (friendFollowRerouteBusyRef.current) return;

    friendFollowRerouteBusyRef.current = true;
    friendFollowLastRerouteRef.current = now;
    friendFollowLastDestRef.current = { lat: fl.lat, lng: fl.lng };
    const place = { name: sess.name, address: `Meet ${sess.name}`, lat: fl.lat, lng: fl.lng };
    nav.setSelectedDestination({ name: place.name, address: place.address, lat: place.lat, lng: place.lng });
    void nav.fetchDirections(
      place,
      locationRef.current,
      { maxHeightMeters: avoidLowClearances ? vehicleHeight : undefined },
    ).finally(() => {
      friendFollowRerouteBusyRef.current = false;
    });
  }, [friendLocations, nav, nav.isNavigating, avoidLowClearances, vehicleHeight]);

  /** Copy for live friend follow; trips do not earn gems (`dynamicDestination` on route). */
  const friendFollowContextLine = useMemo(() => {
    if (!nav.isNavigating || !friendFollowSession) return null;
    const fl = friendLocations.find((x) => String(x.id) === String(friendFollowSession.friendId));
    const fresh = fl
      ? isLiveShareFresh(fl.isSharing, fl.lastUpdated || undefined, fl.lat, fl.lng)
      : false;
    const name = friendFollowSession.name;
    if (friendFollowSession.engine === 'sdk_snapshot') {
      if (fl && fresh && fl.isSharing && friendFollowSession.startedLive) {
        return `Routing to ${name}'s latest live location snapshot`;
      }
      return `Routing to ${name}'s latest known location`;
    }
    if (fl && fresh && fl.isSharing && friendFollowSession.mode === 'live') {
      return `Following ${name} live`;
    }
    if (fl && !fl.isSharing) {
      return `Routing to last known location · ${name}`;
    }
    if (fl && fl.isSharing && !fresh) {
      return `Last known location (stale) · ${name}`;
    }
    return `Routing to ${name}`;
  }, [nav.isNavigating, friendFollowSession, friendLocations]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    nav.setSelectedDestination(null);
    nav.setShowRoutePreview(false);
  }, [nav]);

  const dismissRoutePreview = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    nav.cancelRoutePreview();
  }, [nav]);

  const routePreviewHandlePan = useMemo(
    () =>
      Gesture.Pan()
        .onEnd((e) => {
          if (e.translationY > 72 || e.velocityY > 380) {
            runOnJS(dismissRoutePreview)();
          }
        }),
    [dismissRoutePreview],
  );

  const handleMapCameraChanged = useCallback((state: { properties?: { zoom?: number } }) => {
    const z = state?.properties?.zoom;
    if (typeof z !== 'number' || !isFinite(z)) return;
    if (mapZoomDebounceRef.current) clearTimeout(mapZoomDebounceRef.current);
    mapZoomDebounceRef.current = setTimeout(() => {
      mapZoomDebounceRef.current = null;
      setMapZoomLevel(z);
    }, 120);
  }, []);

  const autoRelockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleMapTouch = useCallback(() => {
    if (nav.isNavigating) {
      userInteracting.current = true;
      setCameraLocked(false);
      setFollowMode('free');
      if (autoRelockTimer.current) clearTimeout(autoRelockTimer.current);
      autoRelockTimer.current = setTimeout(() => {
        if (nav.isNavigating) { setCameraLocked(true); userInteracting.current = false; setFollowMode('follow'); }
      }, 10000);
    } else { setIsExploring(true); setFollowMode('free'); }
  }, [nav.isNavigating]);

  const handleRecenter = useCallback(() => {
    if (nav.isNavigating) {
      setCameraLocked(true);
      userInteracting.current = false;
      setIsExploring(false);
      setFollowMode('follow');
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
      const res = await api.post<{ success?: boolean; data?: Incident }>('/api/incidents/report', {
        type,
        lat: location.lat,
        lng: location.lng,
      });
      if (res.success) {
        void fetchNearbyIncidents();
        const payload = res.data as { data?: Incident } | undefined;
        const created = payload?.data;
        if (created && created.id != null) {
          setNearbyIncidents((prev) => {
            const idStr = String(created.id);
            if (prev.some((p) => String(p.id) === idStr)) return prev;
            return [{ ...created, title: created.title || type }, ...prev];
          });
        }
      }
      Alert.alert('Report Submitted', 'Thanks for keeping roads safe!');
    } catch { /* silent -- don't interrupt driving */ }
  }, [location.lat, location.lng, fetchNearbyIncidents]);

  const handleConfirm = useCallback(async (confirmed: boolean) => {
    if (!confirmIncident) return;
    setConfirmIncident(null);
    if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
    try { await api.post('/api/incidents/confirm', { incident_id: confirmIncident.id, confirmed }); } catch {}
  }, [confirmIncident]);

  const handleUpvote = useCallback(async (inc: Incident) => {
    try {
      const res = await api.post<{ upvotes?: number; downvotes?: number }>(`/api/incidents/${inc.id}/upvote`);
      if (!res.success) throw new Error(res.error || 'Failed');
      const data = res.data as { upvotes?: number; downvotes?: number } | undefined;
      const up = typeof data?.upvotes === 'number' ? data.upvotes : (inc.upvotes || 0) + 1;
      const down = typeof data?.downvotes === 'number' ? data.downvotes : (inc.downvotes ?? 0);
      setNearbyIncidents((prev) =>
        prev.map((i) => (String(i.id) === String(inc.id) ? { ...i, upvotes: up, downvotes: down } : i)),
      );
      setActiveReportCard((prev) =>
        prev && String(prev.id) === String(inc.id) ? { ...prev, upvotes: up, downvotes: down } : prev,
      );
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e: any) { Alert.alert('Failed', e?.message || 'Please try again.'); }
  }, []);

  const handleDownvote = useCallback(async (inc: Incident) => {
    try {
      const res = await api.post<{ upvotes?: number; downvotes?: number; removed?: boolean }>(
        `/api/incidents/${inc.id}/downvote`,
      );
      if (!res.success) throw new Error(res.error || 'Failed');
      const data = res.data as { upvotes?: number; downvotes?: number; removed?: boolean };
      if (data?.removed) {
        setNearbyIncidents((prev) => prev.filter((i) => String(i.id) !== String(inc.id)));
        setActiveReportCard(null);
      } else {
        const up = typeof data?.upvotes === 'number' ? data.upvotes : inc.upvotes ?? 0;
        const down = typeof data?.downvotes === 'number' ? data.downvotes : (inc.downvotes ?? 0) + 1;
        setNearbyIncidents((prev) =>
          prev.map((i) => (String(i.id) === String(inc.id) ? { ...i, upvotes: up, downvotes: down } : i)),
        );
        setActiveReportCard((prev) =>
          prev && String(prev.id) === String(inc.id) ? { ...prev, upvotes: up, downvotes: down } : prev,
        );
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e: any) {
      Alert.alert('Could not record vote', e?.message || 'Try again.');
    }
  }, []);

  const lngLatFromPressGeometry = useCallback((geometry: any): { lng: number; lat: number } | null => {
    try {
      if (!geometry?.coordinates) return null;
      const c = geometry.coordinates;
      const t = geometry.type;
      if (t === 'Point' && Array.isArray(c) && c.length >= 2) {
        const lng = Number(c[0]);
        const lat = Number(c[1]);
        return Number.isFinite(lng) && Number.isFinite(lat) ? { lng, lat } : null;
      }
      if (t === 'LineString' && Array.isArray(c[0]) && c[0].length >= 2) {
        const lng = Number(c[0][0]);
        const lat = Number(c[0][1]);
        return Number.isFinite(lng) && Number.isFinite(lat) ? { lng, lat } : null;
      }
      if (t === 'Polygon' && Array.isArray(c[0]) && Array.isArray(c[0][0]) && c[0][0].length >= 2) {
        const lng = Number(c[0][0][0]);
        const lat = Number(c[0][0][1]);
        return Number.isFinite(lng) && Number.isFinite(lat) ? { lng, lat } : null;
      }
    } catch {
      return null;
    }
    return null;
  }, []);

  const handleMapPress = useCallback(async (e: any) => {
    try {
      // During turn-by-turn, pan/zoom is handled via onTouchStart (handleMapPress would still fire on rnmapbox
      // and could receive non-Point geometries from vector tiles — destructuring crashed the app).
      if (nav.isNavigating) return;

      const asFeatures = Array.isArray(e?.features) ? e.features : e?.type === 'Feature' ? [e] : [];
      for (const f of asFeatures) {
        const name = f?.properties?.name || f?.properties?.name_en;
        const pos = lngLatFromPressGeometry(f?.geometry);
        if (name && pos) {
          const nextName = String(name);
          if (
            selectedPlace
            && !selectedPlaceId
            && selectedPlace.name === nextName
            && haversineMeters(selectedPlace.lat, selectedPlace.lng, pos.lat, pos.lng) < 15
          ) {
            return;
          }
          setSelectedPlaceId(null);
          setSelectedPlace({
            name: nextName,
            address: f.properties?.address ?? '',
            category: f.properties?.category,
            lat: pos.lat,
            lng: pos.lng,
          });
          return;
        }
      }

      const tap = lngLatFromPressGeometry(e?.geometry);
      if (!tap) return;
      const { lng: tapLng, lat: tapLat } = tap;

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
            setSelectedPlace({
              name: p.name,
              address: p.address ?? p.vicinity ?? '',
              lat: pLat,
              lng: pLng,
              placeType: Array.isArray(p.types) && p.types[0] ? String(p.types[0]) : undefined,
              price_level: typeof p.price_level === 'number' ? p.price_level : undefined,
              open_now: typeof p.open_now === 'boolean' ? p.open_now : undefined,
            });
            if (p.place_id) setSelectedPlaceId(p.place_id);
            return;
          }
        }
      } catch { /* ignore */ }
      const { reverseGeocode } = await import('../lib/directions');
      const geo = await reverseGeocode(tapLat, tapLng);
      if (geo) {
        setSelectedPlaceId(null);
        setSelectedPlace({ name: geo.name, address: geo.address, lat: tapLat, lng: tapLng });
        return;
      }
      setSelectedPlaceId(null);
      setSelectedPlace({
        name: 'Dropped Pin',
        address: `${tapLat.toFixed(5)}, ${tapLng.toFixed(5)}`,
        lat: tapLat,
        lng: tapLng,
      });
    } catch (err) {
      console.warn('[MapScreen] handleMapPress', err);
    }
  }, [nav.isNavigating, lngLatFromPressGeometry, selectedPlace, selectedPlaceId]);

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
      {isSearchFocused && !nav.isNavigating && !nav.showRoutePreview && (
        <Pressable
          style={[StyleSheet.absoluteFillObject, { zIndex: 14, backgroundColor: 'transparent' }]}
          onPress={() => { Keyboard.dismiss(); setIsSearchFocused(false); }}
        />
      )}

      {navLogicSdkSessionEnabled && nav.isNavigating && navLogicCoords.length >= 2 ? (
        // Headless native session: this module has no separate “createSession” API — the hidden view drives logic + voice.
        <MapboxNavigationView
          ref={navLogicRef}
          style={{ position: 'absolute', width: 2, height: 2, opacity: 0, bottom: 0, right: 0, zIndex: -1 }}
          pointerEvents="none"
          navigationLogicOnly
          coordinates={navLogicCoords}
          mute={navVoiceMuted}
          routeProfile={routeProfileForPlatform()}
          drivingMode={drivingMode}
          followingZoom={navLogicFollowingZoom}
          disableAlternativeRoutes
          vehicleMaxHeight={avoidLowClearances && hasTallVehicle ? vehicleHeight : undefined}
          onRoutesLoaded={handleSdkRoutesLoaded}
          onRouteProgressChanged={(e: { nativeEvent: SdkProgressPayload }) => ingestSdkProgress(e.nativeEvent)}
          onVoiceInstruction={(e: { nativeEvent: { text?: string } }) =>
            ingestSdkVoiceSubtitle(e.nativeEvent.text)
          }
          onNavigationLocationUpdate={(e: { nativeEvent: SdkLocationPayload }) =>
            ingestSdkLocation(e.nativeEvent)
          }
          // @ts-expect-error Patched native module emits `{ reason, routes }`; published `.d.ts` still types `onRouteChanged` as no-arg.
          onRouteChanged={handleSdkRouteChanged}
          onFinalDestinationArrival={() => nav.stopNavigation()}
          onCancelNavigation={() => nav.stopNavigation()}
        />
      ) : null}

      {/* ═══ MAP ═══════════════════════════════════════════════════════════ */}
      {mapOk && MapboxGL ? (
        <MapboxGL.MapView
          ref={mapRef}
          style={s.map}
          styleURL={activeStyleURL}
          projection={activeStyleURL.includes('standard-satellite') ? 'mercator' : 'globe'}
          logoEnabled={false}
          attributionEnabled={false}
          compassEnabled
          onCameraChanged={handleMapCameraChanged}
          onTouchStart={handleMapTouch}
          onPress={handleMapPress}
        >
          {nav.isNavigating && navLogicSdkSessionEnabled ? (
            <MapboxGL.CustomLocationProvider
              coordinate={[navDisplayCoord.lng, navDisplayCoord.lat]}
              heading={
                nav.sdkNavLocation && nav.sdkNavLocation.course >= 0
                  ? nav.sdkNavLocation.course
                  : navDisplayHeading
              }
            />
          ) : nav.isNavigating && !navLogicSdkSessionEnabled ? (
            <MapboxGL.CustomLocationProvider
              coordinate={[navDisplayCoord.lng, navDisplayCoord.lat]}
              heading={navDisplayHeading}
            />
          ) : null}
          {standardStyleImportsEnabled && MapboxGL.StyleImport ? (
            <MapboxGL.StyleImport
              key={`basemap-${mapLightPreset}-${isSatelliteStyle ? 'sat' : 'std'}`}
              id="basemap"
              existing
              config={standardBasemapImportConfig}
            />
          ) : null}
          {/* Camera: Mapbox follow + useCameraController (single owner — no parallel setCamera nav hook). */}
          <MapboxGL.Camera
            key={nav.isNavigating ? `nav-follow-${navCameraSessionKey}` : 'map-camera-explore'}
            ref={cameraRef}
            defaultSettings={
              nav.isNavigating
                ? {
                    // Start the remounted nav camera AT the user's current position so there
                    // is no lag before followUserLocation kicks in or the flyTo resolves.
                    centerCoordinate: [navDisplayCoordRef.current.lng, navDisplayCoordRef.current.lat],
                    zoomLevel: camCtrlRef.current?.followZoomLevel ?? modeConfig.navZoom,
                    pitch: camCtrlRef.current?.followPitch ?? modeConfig.navPitch,
                  }
                : {
                    centerCoordinate: stableCenter,
                    zoomLevel: modeConfig.exploreZoom,
                    pitch: modeConfig.explorePitch,
                  }
            }
            centerCoordinate={
              nav.isNavigating || isExploring || compassMode || exploreTracksUser ? undefined : stableCenter
            }
            zoomLevel={
              nav.isNavigating || compassMode || exploreTracksUser ? undefined : modeConfig.exploreZoom
            }
            pitch={
              nav.isNavigating || compassMode || exploreTracksUser ? undefined : modeConfig.explorePitch
            }
            animationMode="easeTo"
            animationDuration={
              nav.isNavigating && cameraLocked
                ? 0  // Native followUserLocation handles smooth tracking; zero-duration prevents
                     // followZoom/Pitch/Padding prop updates from firing competing animations.
                : (camCtrl ? camCtrl.animationDuration : animDuration)
            }
            followUserLocation={(nav.isNavigating && cameraLocked) || compassMode || exploreTracksUser}
            followUserMode={
              nav.isNavigating && cameraLocked
                ? MapboxGL.UserTrackingMode.FollowWithCourse
                : compassMode || followMode === 'heading'
                  ? MapboxGL.UserTrackingMode.FollowWithHeading
                  : exploreTracksUser && followMode === 'follow'
                    ? MapboxGL.UserTrackingMode.Follow
                    : undefined
            }
            followPitch={
              camCtrl
                ? camCtrl.followPitch
                : nav.isNavigating && cameraLocked
                  ? modeConfig.navPitch
                  : exploreTracksUser
                    ? modeConfig.explorePitch
                    : compassMode
                      ? 45
                      : undefined
            }
            followZoomLevel={
              camCtrl
                ? camCtrl.followZoomLevel
                : nav.isNavigating && cameraLocked
                  ? modeConfig.navZoom
                  : exploreTracksUser
                    ? modeConfig.exploreZoom
                    : compassMode
                      ? 15
                      : undefined
            }
            followPadding={
              camCtrl
                ? camCtrl.followPadding
                : nav.isNavigating && cameraLocked
                  ? getNavigationFollowPaddingFallback(drivingMode, insets.top, insets.bottom)
                  : MAPBOX_DEFAULT_FOLLOW_PADDING
            }
          />

          {/* Terrain: Standard + Satellite (classic streets/dark URLs removed). */}
          {MapboxGL.RasterDemSource && MapboxGL.Terrain && standardStyleImportsEnabled && (
            <MapboxGL.RasterDemSource id="mapbox-dem" url="mapbox://mapbox.mapbox-terrain-dem-v1" tileSize={514} maxZoomLevel={14}>
              <MapboxGL.Terrain style={{ exaggeration: modeConfig.terrainExaggeration }} />
            </MapboxGL.RasterDemSource>
          )}

          <BuildingsLayer
            drivingMode={drivingMode}
            isLight={isLight}
            isNavigating={nav.isNavigating}
            activeStyleURL={activeStyleURL}
            belowLayerID={buildingsBelowLayerId}
          />
          {showTraffic && <TrafficLayer belowLayerID={buildingsBelowLayerId} />}
          <IncidentHeatmap incidents={nearbyIncidents} visible={showIncidents} />
          {showPhotoReports && (
            <PhotoReportMarkers reports={photoReports} onReportTap={(r) => setSelectedPhotoReport(r)} />
          )}
          {showTrafficSafety && isTrafficSafetyLayerEnabled(location.lat, location.lng) && !nav.isNavigating && !nav.showRoutePreview && mapZoomLevel >= TRAFFIC_CAM_MIN_ZOOM && (
            <TrafficSafetyLayer
              zones={trafficSafetyZones}
              onZoneTap={(z) =>
                Alert.alert(
                  'Traffic safety zone',
                  `Community-sourced map data (speed camera location). Coverage may be incomplete; verify with posted signs.\n\nAlways obey posted speed limits.${z.maxspeed ? `\n\nOSM maxspeed tag: ${z.maxspeed}` : ''}`,
                )}
            />
          )}

          {nav.showRoutePreview && !nav.isNavigating && MapboxGL && (() => {
            const MGL = MapboxGL!;
            return nav.availableRoutes.map((route, idx) => {
              if (idx === nav.selectedRouteIndex) return null;
              if (!route.polyline || route.polyline.length < 2) return null;
              const pl = getRoutePolylineStyle(route.routeType, false);
              const lineOpacity = Math.min(
                0.85,
                pl.opacity * (isSatelliteStyle || mapLightPreset === 'night' ? 1.35 : 1.15),
              );
              const geo: GeoJSON.FeatureCollection = {
                type: 'FeatureCollection',
                features: [{
                  type: 'Feature',
                  properties: {},
                  geometry: {
                    type: 'LineString',
                    coordinates: route.polyline.map((p) => [p.lng, p.lat]),
                  },
                }],
              };
              return (
                <MGL.ShapeSource
                  key={`alt-route-${idx}`}
                  id={`alt-route-${idx}`}
                  shape={geo}
                  onPress={() => nav.handleRouteSelect(idx)}
                  hitbox={{ width: 30, height: 30 }}
                >
                  <MGL.LineLayer
                    id={`alt-route-line-${idx}`}
                    style={{
                      lineColor: pl.color,
                      lineWidth: pl.width,
                      lineOpacity,
                      lineCap: 'round',
                      lineJoin: 'round',
                    }}
                  />
                </MGL.ShapeSource>
              );
            });
          })()}

          {nav.navigationData?.polyline && (
            <RouteOverlay
              key={`route-${nav.routeModelRefreshKey}-${nav.navigationData.polyline.length}`}
              polyline={
                nav.navigationProgress?.routePolyline?.length &&
                nav.navigationProgress.routePolyline.length >= 2
                  ? nav.navigationProgress.routePolyline
                  : nav.navigationData.polyline
              }
              isNavigating={nav.isNavigating}
              routeSplit={navigationRouteSplit}
              routeColor={navRouteColors.routeColor}
              casingColor={navRouteColors.routeCasing}
              passedColor={navRouteColors.passedColor}
              routeWidth={modeConfig.routeWidth}
              glowColor={navRouteColors.routeGlowColor}
              glowOpacity={navRouteColors.routeGlowOpacity}
              congestion={nav.navigationData.congestion}
              showCongestion={
                modeConfig.showCongestion && (nav.showRoutePreview || nav.isNavigating)
              }
              isRerouting={nav.isRerouting}
              belowLayerID={buildingsBelowLayerId}
            />
          )}

          {!nav.isNavigating && (
            <OfferMarkers
              offers={recommendedNearbyOffers}
              zoomLevel={mapZoomLevel}
              referenceCoordinate={markerFocusCoordinate}
              onOfferTap={setSelectedOffer}
            />
          )}
          {showIncidents && (
            <ReportMarkers
              incidents={nearbyIncidents.filter((inc) => {
                if ((inc.upvotes ?? 0) < 0) return false;
                if (inc.type === 'construction') return showConstruction;
                return true;
              })}
              zoomLevel={mapZoomLevel}
              referenceCoordinate={markerFocusCoordinate}
              onIncidentTap={setActiveReportCard}
            />
          )}
          {user?.isPremium && showCameras && !nav.isNavigating && !nav.showRoutePreview && mapZoomLevel >= TRAFFIC_CAM_MIN_ZOOM && (
            <CameraMarkers
              cameras={cameraLocations}
              zoomLevel={mapZoomLevel}
              referenceCoordinate={markerFocusCoordinate}
              onCameraTap={(cam) => setSelectedTrafficCamera(cam)}
            />
          )}
          <FriendMarkers
            friends={friendLocationsVisible}
            zoomLevel={mapZoomLevel}
            referenceCoordinate={markerFocusCoordinate}
            onFriendTap={(f) => {
              const fresh = isLiveShareFresh(f.isSharing, f.lastUpdated || undefined, f.lat, f.lng);
              Alert.alert(f.name, 'What would you like to do?', [
                {
                  text: 'Navigate to',
                  onPress: () =>
                    beginFriendFollowNavigation({
                      friendId: f.id,
                      name: f.name,
                      lat: f.lat,
                      lng: f.lng,
                      isLiveFresh: fresh,
                    }),
                },
                { text: 'Cancel', style: 'cancel' },
              ]);
            }}
          />

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

          <MapboxGL.LocationPuck
            visible
            androidRenderMode={Platform.OS === 'android' && nav.isNavigating ? 'gps' : 'normal'}
            puckBearingEnabled
            puckBearing={locationPuckBearing}
            pulsing={
              nav.isNavigating
                ? { isEnabled: true, color: navRouteColors.routeColor, radius: 'accuracy' }
                : { isEnabled: true }
            }
            scale={nav.isNavigating ? 1.68 : 1.55}
          />
        </MapboxGL.MapView>
      ) : (
        <View style={[s.map, s.placeholder]}>
          <Ionicons name="map-outline" size={48} color="#3B82F6" />
          {!hasNativeMapbox ? (
            <>
              <Text style={s.phTitle}>Map requires Dev Build</Text>
              <Text style={s.phSub}>Run: npx expo run:ios / npx expo run:android</Text>
            </>
          ) : (
            <>
              <Text style={s.phTitle}>Mapbox token missing</Text>
              <Text style={s.phSub}>
                Set EXPO_PUBLIC_MAPBOX_TOKEN in app/mobile/.env and restart Metro, or in Expo → Environment variables for your
                EAS profile. Native builds embed extra.mapboxPublicToken; OTA updates use the token from the update bundle env
                if set, otherwise the value from the last store/binary build. Map style/load errors are separate — if the map
                stays blank with a valid pk. token, check the device logs, not this screen.
              </Text>
            </>
          )}
          {typeof __DEV__ !== 'undefined' && __DEV__ ? (
            <Text style={[s.phSub, { fontSize: 11, opacity: 0.7, marginTop: 4, paddingHorizontal: 16 }]}>
              dbg: native={hasNativeMapbox ? 'yes' : 'no'} · token={getMapboxTokenPublicPrefix(getMapboxPublicToken())} ·
              reload Metro after editing .env
            </Text>
          ) : null}
          <Text style={s.phCoord}>{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</Text>
        </View>
      )}

      <MapWeatherOverlay
        precipitation={mapWeather.precipitation}
        intensity={mapWeather.intensity}
        modeFactor={weatherOverlayModeFactor}
        isLight={isLight}
        isDay={mapWeather.isDay}
      />

      {/* ═══ PLACE CARD (simple card for Mapbox results / map taps) ═══════ */}
      {selectedPlace && !selectedPlaceId && !nav.isNavigating && !nav.showRoutePreview && (
        <PlaceCard
          name={selectedPlace.name}
          address={selectedPlace.address}
          category={selectedPlace.category}
          maki={selectedPlace.maki}
          detailHint={placeCardFuelHint(selectedPlace)}
          distanceMeters={placeCardDistanceMeters}
          isLight={isLight}
          isFavorite={selectedPlaceFavoriteMatch.isFavorite}
          onDirections={() => handleStartDirections(selectedPlace)}
          onToggleFavorite={async () => {
            try {
              if (selectedPlaceFavoriteMatch.id != null) {
                const res = await api.delete(`/api/locations/${selectedPlaceFavoriteMatch.id}`);
                if (!res.success) {
                  Alert.alert('Error', res.error ?? 'Could not remove favorite.');
                  return;
                }
                refreshSavedPlaces();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                return;
              }
              const res = await api.post('/api/locations', {
                name: selectedPlace.name,
                address: selectedPlace.address ?? '',
                category: 'favorite',
                lat: selectedPlace.lat,
                lng: selectedPlace.lng,
              });
              if (!res.success) {
                Alert.alert('Error', res.error ?? 'Could not add favorite.');
                return;
              }
              refreshSavedPlaces();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {
              Alert.alert('Error', 'Could not update favorites.');
            }
          }}
          onDismiss={() => {
            setSelectedPlace(null);
            restoreExploreList();
          }}
        />
      )}

      {/* ═══ PLACE DETAIL SHEET (Google Places - reviews, photos, hours) ═ */}
      {selectedPlaceId && !nav.isNavigating && (
        <PlaceDetailSheet
          placeId={selectedPlaceId}
          summary={placeDetailSummary}
          userLocation={placeDetailUserLocation}
          drivingMode={drivingMode}
          maxHeightMeters={avoidLowClearances ? vehicleHeight : undefined}
          isLight={isLight}
          savedPlaces={savedPlaces}
          onFavoritesChange={refreshSavedPlaces}
          onClose={() => {
            setSelectedPlaceId(null);
            setSelectedPlace(null);
            restoreExploreList();
          }}
          onDirections={(place) => {
            setSelectedPlaceId(null);
            setSelectedPlace(null);
            exploreRestoreRef.current = null;
            handleStartDirections(place);
          }}
          onSave={async (p) => {
            const res = await api.post('/api/locations', {
              name: p.name,
              address: p.address ?? '',
              category: 'favorite',
              lat: p.lat,
              lng: p.lng,
            });
            if (!res.success) {
              Alert.alert('Could not save', res.error ?? 'Try again later.');
              throw new Error(res.error ?? 'Save failed');
            }
            refreshSavedPlaces();
          }}
        />
      )}

      {/* ═══ OFFER SHEET ═══════════════════════════════════════════════════ */}
      {selectedOffer && !nav.isNavigating && (
        <OfferRedemptionSheet
          offer={selectedOffer}
          onDismiss={() => setSelectedOffer(null)}
          onRedeem={handleRedeemOffer}
          userLocation={location}
          onNavigate={(o) => { setSelectedOffer(null); if (o.lat && o.lng) handleSelectResult({ name: o.business_name, address: '', lat: o.lat, lng: o.lng }); }}
        />
      )}

      <NearbyOffersPickerSheet
        visible={nearbyOffersPickerOpen}
        offers={recommendedNearbyOffers}
        userLat={location.lat}
        userLng={location.lng}
        onClose={() => setNearbyOffersPickerOpen(false)}
        onSelectOffer={(o) => setSelectedOffer(o)}
      />

      <TrafficCameraSheet
        visible={Boolean(user?.isPremium && selectedTrafficCamera)}
        camera={selectedTrafficCamera}
        onClose={() => setSelectedTrafficCamera(null)}
      />

      <MapSearchTopBar
        visible={!nav.isNavigating && !nav.showRoutePreview}
        topInset={insets.top}
        colors={colors}
        styles={s}
        showMenu={showMenu}
        setShowMenu={setShowMenu}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        isSearchFocused={isSearchFocused}
        setIsSearchFocused={setIsSearchFocused}
        onSubmitSearch={() => {
          void commitSearch();
        }}
        onClearSearch={handleClearSearch}
        onOpenOrion={() => setShowOrion(true)}
        activeChip={activeChip}
        onSelectChip={openCategoryExplore}
        savedPlaces={savedPlaces}
        onSelectSavedPlace={(item) => {
          if (item.lat && item.lng) {
            handleSelectResult({ name: item.name, address: item.address, lat: item.lat, lng: item.lng });
          }
        }}
        isSearching={isSearching}
        searchResults={searchResults}
        recentSearches={recentSearches}
        location={location}
        onSelectResult={handleSelectResult}
        haversineMeters={haversineMeters}
        placePhotoThumbUri={placePhotoThumbUri}
        searchResultPriceHint={searchResultPriceHint}
      />

      {/* ═══ TURN CARD — distance, glyph, banner, and rich fields share one reconciled maneuver (JS + SDK). ═ */}
      {nav.isNavigating && nav.navigationProgress && (() => {
        const prog = nav.navigationProgress!;
        const instructionSrc = prog.instructionSource;
        const laneUi = navLaneGuidanceUiEnabled();

        if (instructionSrc === 'sdk_waiting') {
          return (
            <View style={[s.turnWrap, { top: insets.top }]} key="nav-sdk-waiting">
              <TurnInstructionCard
                mode={drivingMode}
                modeConfig={modeConfig}
                state="preview"
                distanceValue="—"
                distanceUnit=""
                primaryInstruction={prog.banner?.primaryInstruction ?? 'Starting navigation…'}
                secondaryInstruction={undefined}
                maneuverForIcon="straight"
                maneuverKind="straight"
                isMuted={navVoiceMuted}
                onMutePress={() => {
                  setNavVoiceMuted((m) => {
                    if (!m) stopSpeaking();
                    return !m;
                  });
                }}
                lanesJson={undefined}
                step={undefined}
                roadDisambiguationLabel={null}
                isSportBorder={isSport}
                speedMph={displaySpeedMph}
              />
            </View>
          );
        }

        const logicSdkAuthoritativeUi = navLogicSdkSessionEnabled && instructionSrc === 'sdk';
        const useSdkTurnUi =
          navLogicSdkSessionEnabled && instructionSrc === 'sdk' && prog.nextStep;
        const sdkNavStepForSynthetic =
          useSdkTurnUi
            ? prog.nextStep
            : null;
        const sdkRouteStepForSynthetic =
          sdkNavStepForSynthetic != null && nav.navigationData?.steps?.length
            ? (nav.navigationData.steps[sdkNavStepForSynthetic.index] ?? null)
            : null;
        const sdkSyntheticStep =
          useSdkTurnUi && prog && sdkNavStepForSynthetic
            ? directionsStepFromSdkProgress({
                nextStep: sdkNavStepForSynthetic,
                banner: prog.banner,
                at: navDisplayCoord,
                routeStep: sdkRouteStepForSynthetic,
              })
            : null;
        const nextManeuverCoord =
          useSdkTurnUi && sdkSyntheticStep
            ? sdkSyntheticStep
            : logicSdkAuthoritativeUi
              ? null
              : prog?.nextStep?.index != null && nav.navigationData?.steps
                ? nav.navigationData.steps[prog.nextStep.index] ?? upcomingGuidanceStep
                : upcomingGuidanceStep;
        const turnCurrentStep = useSdkTurnUi
          ? sdkSyntheticStep ?? currentStep
          : logicSdkAuthoritativeUi
            ? null
            : currentStep;
        const poly = nav.navigationData?.polyline;
        const anchorToUserM =
          nextManeuverCoord != null &&
          Number.isFinite(nextManeuverCoord.lat) &&
          Number.isFinite(nextManeuverCoord.lng)
            ? haversineMeters(
                navDisplayCoord.lat,
                navDisplayCoord.lng,
                nextManeuverCoord.lat,
                nextManeuverCoord.lng,
              )
            : Number.POSITIVE_INFINITY;
        /** Synthetic SDK rows used to use puck lat/lng — along-route to self is ~0; fall back to SDK distance. */
        const maneuverAnchorDegenerate = anchorToUserM < 12;
        const sdkDistToNextManeuver =
          useSdkTurnUi && sdkNavStepForSynthetic != null && Number.isFinite(sdkNavStepForSynthetic.distanceMetersToNext)
            ? Math.max(0, sdkNavStepForSynthetic.distanceMetersToNext)
            : null;
        let liveDistMeters: number;
        if (useSdkTurnUi && sdkDistToNextManeuver != null) {
          liveDistMeters = sdkDistToNextManeuver;
        } else if (prog != null && Number.isFinite(prog.nextStepDistanceMeters)) {
          liveDistMeters = prog.nextStepDistanceMeters;
        } else if (
          poly &&
          poly.length >= 2 &&
          nextManeuverCoord != null &&
          Number.isFinite(nextManeuverCoord.lat) &&
          Number.isFinite(nextManeuverCoord.lng) &&
          !maneuverAnchorDegenerate
        ) {
          liveDistMeters = alongRouteDistanceMeters(poly, navDisplayCoord, {
            lat: nextManeuverCoord.lat,
            lng: nextManeuverCoord.lng,
          });
        } else if (sdkDistToNextManeuver != null && maneuverAnchorDegenerate) {
          liveDistMeters = sdkDistToNextManeuver;
        } else if (
          nextManeuverCoord != null &&
          Number.isFinite(nextManeuverCoord.lat) &&
          Number.isFinite(nextManeuverCoord.lng) &&
          !maneuverAnchorDegenerate
        ) {
          liveDistMeters = haversineMeters(
            navDisplayCoord.lat,
            navDisplayCoord.lng,
            nextManeuverCoord.lat,
            nextManeuverCoord.lng,
          );
        } else {
          liveDistMeters = Math.max(0, turnCurrentStep?.distanceMeters ?? 0);
        }

        const turnCardNow = Date.now();
        const cardState = resolveTurnCardState({
          distanceToNextManeuverM: liveDistMeters,
          speedMph: displaySpeedMph,
          mode: drivingMode,
          inConfirmationWindow: inConfirmWindow,
          nextStep: nextManeuverCoord,
          congestionNearManeuver: hasSevereCongestionAhead(
            nav.navigationData?.congestion,
            nav.navigationProgress?.snapped?.segmentIndex ?? 0,
          ),
          activeEnteredAtMs: turnCardActiveEnteredAtRef.current,
          nowMs: turnCardNow,
        });
        /* Update the dwell-tracking ref: record the moment we first enter
         * 'active'; clear it when we leave so the next entry starts fresh. */
        if (cardState === 'active') {
          if (turnCardActiveEnteredAtRef.current == null) {
            turnCardActiveEnteredAtRef.current = turnCardNow;
          }
        } else {
          turnCardActiveEnteredAtRef.current = undefined;
        }

        const distParts = formatTurnDistanceForCard(liveDistMeters);
        const destinationName = nav.navigationData?.destination?.name ?? null;
        const banner = prog?.banner ?? null;
        const progressNavStepForRich =
          useSdkTurnUi ? prog.nextStep : prog.nextStep;
        const maneuverFields = resolveManeuverFieldsForTurnCard({
          nextManeuverCoord,
          progNext: progressNavStepForRich ?? prog.nextStep,
        });
        const chainStepForBuild =
          useSdkTurnUi ? prog.followingStep : prog.nextStep;
        const useBannerCopy =
          !!banner && (!!nextManeuverCoord || (instructionSrc === 'sdk' && !!prog.nextStep));

        let primary: string;
        let secondary: string | undefined;
        if (useBannerCopy) {
          switch (cardState) {
            case 'cruise':
              primary =
                nextManeuverCoord
                  ? buildCruisePrimary(nextManeuverCoord, destinationName)
                  : banner!.primaryInstruction;
              secondary = undefined;
              break;
            case 'confirm':
              primary = turnCurrentStep ? buildConfirmPrimary(turnCurrentStep) : banner!.primaryInstruction;
              secondary = banner!.secondaryInstruction ?? undefined;
              if (drivingMode === 'sport' && displaySpeedMph > 50) secondary = undefined;
              break;
            case 'preview':
            case 'active':
            default: {
              if (useSdkTurnUi) {
                primary = banner!.primaryInstruction;
                secondary = banner!.secondaryInstruction ?? undefined;
              } else if (nextManeuverCoord) {
                const fromStep = getPrimaryBannerText(nextManeuverCoord).trim();
                primary = fromStep || banner!.primaryInstruction;
                secondary =
                  getSecondaryBannerText(nextManeuverCoord) ?? banner!.secondaryInstruction ?? undefined;
              } else {
                primary = banner!.primaryInstruction;
                secondary = banner!.secondaryInstruction ?? undefined;
              }
              if (drivingMode === 'sport' && displaySpeedMph > 50) secondary = undefined;
              break;
            }
          }
        } else {
          switch (cardState) {
            case 'active':
              primary = buildActivePrimary(nextManeuverCoord, destinationName) || turnCurrentStep?.instruction || '';
              secondary = undefined;
              break;
            case 'preview': {
              const p = buildPreviewPrimarySecondary(turnCurrentStep, nextManeuverCoord, destinationName);
              primary = p.primary;
              secondary = p.secondary;
              if (drivingMode === 'sport' && displaySpeedMph > 50) secondary = undefined;
              break;
            }
            case 'confirm':
              primary = buildConfirmPrimary(turnCurrentStep);
              secondary =
                (drivingMode === 'calm' || drivingMode === 'adaptive') &&
                nextManeuverCoord &&
                nextManeuverCoord.maneuver !== 'arrive'
                  ? `Then ${buildActivePrimary(nextManeuverCoord, destinationName, prog.nextStep)}`
                  : undefined;
              break;
            case 'cruise':
              primary = buildCruisePrimary(nextManeuverCoord, destinationName);
              secondary = undefined;
              break;
            default:
              primary =
                buildActivePrimary(nextManeuverCoord, destinationName, prog.nextStep) ||
                turnCurrentStep?.instruction ||
                '';
              secondary = undefined;
          }
        }

        const maneuverIconKey = iconManeuverForState(cardState, turnCurrentStep, nextManeuverCoord);
        const chainInstruction = buildChainInstruction(chainStepForBuild);
        const maneuverKindResolved =
          nextManeuverCoord != null
            ? maneuverFields.kind
            : banner?.maneuverKind ?? iconManeuverKindForState(cardState, prog.nextStep);
        const signalResolved = banner?.signal ?? progressNavStepForRich?.signal;
        const lanesResolved = !laneUi
          ? undefined
          : useSdkTurnUi && progressNavStepForRich?.lanes?.length
            ? progressNavStepForRich.lanes
            : banner?.lanes?.length
              ? banner.lanes
              : prog.nextStep?.lanes?.length
                ? prog.nextStep.lanes
                : undefined;
        const shieldsResolved =
          useSdkTurnUi && progressNavStepForRich?.shields?.length
            ? progressNavStepForRich.shields
            : banner?.shields?.length
              ? banner.shields
              : prog.nextStep?.shields?.length
                ? prog.nextStep.shields
                : undefined;
        const roundaboutExitResolved =
          useSdkTurnUi && progressNavStepForRich?.roundaboutExitNumber != null
            ? progressNavStepForRich.roundaboutExitNumber
            : banner?.roundaboutExitNumber ?? prog.nextStep?.roundaboutExitNumber ?? null;
        const disambigName =
          shouldShowRoadDisambiguation(turnCurrentStep?.name) ? (turnCurrentStep?.name ?? null) :
          shouldShowRoadDisambiguation(nextManeuverCoord?.name) ? (nextManeuverCoord?.name ?? null) :
          null;

        /** Align banner/lanes/icons with Mapbox step geometry (see `currentStepIndexAlongRoute`). */
        const guidanceStep = pickGuidanceStep(cardState, turnCurrentStep, nextManeuverCoord);
        const actionableGuidanceStep =
          isActionableGuidanceStep(guidanceStep, true) ? guidanceStep : (isActionableGuidanceStep(nextManeuverCoord, true) ? nextManeuverCoord : undefined);

        return (
          <View
            style={[s.turnWrap, { top: insets.top }]}
            key={
              useSdkTurnUi
                ? `sdk-${prog.nextStep?.index ?? -1}-${banner?.primaryInstruction ?? ''}`
                : `js-${nav.currentStepIndex}`
            }
          >
            <TurnInstructionCard
              mode={drivingMode}
              modeConfig={modeConfig}
              state={cardState}
              distanceValue={distParts.value}
              distanceUnit={distParts.unit}
              primaryInstruction={primary}
              secondaryInstruction={secondary}
              maneuverForIcon={maneuverIconKey}
              maneuverKind={maneuverKindResolved}
              maneuverType={maneuverFields.rawType}
              maneuverModifier={maneuverFields.rawModifier}
              signal={signalResolved}
              lanes={lanesResolved}
              shields={shieldsResolved}
              roundaboutExitNumber={roundaboutExitResolved}
              chainInstruction={chainInstruction}
              isMuted={navVoiceMuted}
              onMutePress={() => {
                setNavVoiceMuted((m) => {
                  if (!m) stopSpeaking();
                  return !m;
                });
              }}
              lanesJson={
                logicSdkAuthoritativeUi || !laneUi
                  ? undefined
                  : mergeLaneSources(
                      actionableGuidanceStep,
                      nextManeuverCoord,
                      cardState === 'confirm' ? turnCurrentStep : undefined,
                    )
              }
              step={
                logicSdkAuthoritativeUi
                  ? sdkSyntheticStep ?? undefined
                  : actionableGuidanceStep ?? nextManeuverCoord ?? (cardState === 'confirm' ? turnCurrentStep : undefined)
              }
              roadDisambiguationLabel={disambigName}
              isSportBorder={isSport}
              speedMph={displaySpeedMph}
            />
          </View>
        );
      })()}

      <IncidentReportCard
        activeReportCard={activeReportCard}
        insetsTop={insets.top}
        isNavigating={nav.isNavigating}
        styles={s}
        incidentColors={INCIDENT_COLORS}
        location={location}
        haversineMeters={haversineMeters}
        timeAgo={timeAgo}
        onDismiss={() => setActiveReportCard(null)}
        onUpvote={handleUpvote}
        onDownvote={handleDownvote}
        reportTimerStyle={reportTimerStyle}
      />

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
            {isCalm ? 'Recalculating your route…' : 'Recalculating…'}
          </Text>
        </Animated.View>
      )}

      {(navLogicDebugEnabled() || (typeof __DEV__ !== 'undefined' && __DEV__)) &&
      nav.isNavigating &&
      !nav.showRoutePreview ? (
        <NavigationDebugHud
          progress={nav.navigationProgress ?? null}
          currentStepIndex={nav.currentStepIndex}
          topInset={insets.top}
          logicSdk={navLogicSdkEnabled()}
          sdkDiag={nav.sdkNavDiag}
          extendedDiag={navLogicDebugEnabled()}
        />
      ) : null}

      <TrafficCongestionBanner
        visible={modeConfig.showTrafficBar && nav.isNavigating && !nav.isRerouting && !trafficBannerDismissed}
        topInset={insets.top + (nav.isNavigating ? 150 : 100)}
        congestion={nav.navigationData?.congestion}
        analyzeCongestion={analyzeCongestion}
        setDismissed={setTrafficBannerDismissed}
        fetchReroute={async () => {
          if (navLogicSdkEnabled()) return { ok: false, message: 'Reroute is handled by Navigation SDK.' };
          if (!nav.navigationData?.destination) return { ok: false, message: 'Missing destination.' };
          return nav.fetchDirections(nav.navigationData.destination);
        }}
        styles={s}
      />

      {!nav.isNavigating && !nav.showRoutePreview && user?.isPremium && friendTrackingEnabled && (!liveLocationPublishingEnabled || livePublishPaused503) ? (
        <View style={[s.friendMapBanner, { top: insets.top + 54, left: 12, right: 12, zIndex: 14 }]}>
          <Ionicons name="pause-circle-outline" size={18} color="#FBBF24" style={{ marginRight: 8 }} />
          <Text style={s.friendMapBannerText} numberOfLines={3}>
            Live location sharing is paused. Friends may not see your position until this is restored.
          </Text>
          <TouchableOpacity
            onPress={() => {
              void refreshPublicAppConfig();
              setLivePublishPaused503(false);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={s.friendMapBannerLink}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {!nav.isNavigating && !nav.showRoutePreview && user?.isPremium && friendTrackingEnabled && liveLocationPublishingEnabled && !livePublishPaused503 && mapCoordsOk && !shareLocationStorageOn && !shareInviteBannerDismissed ? (
        <View style={[s.friendMapBanner, s.friendMapBannerInvite, { top: insets.top + 54, left: 12, right: 12, zIndex: 14 }]}>
          <Ionicons name="people-outline" size={18} color="#A78BFA" style={{ marginRight: 8 }} />
          <Text style={s.friendMapBannerText} numberOfLines={3}>
            Share your location so friends can see you on the map.
          </Text>
          <TouchableOpacity onPress={() => { void enableShareLocationFromMap(); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={s.friendMapBannerLink}>Enable</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              storage.set(MAP_SHARE_INVITE_BANNER_DISMISS_KEY, '1');
              setShareInviteBannerDismissed(true);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ marginLeft: 4 }}
          >
            <Text style={s.friendMapBannerMuted}>Later</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {nav.isNavigating && ephemeralTurnHint ? (
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(180)}
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: MAP_NAV_BOTTOM_INSET + insets.bottom + 12,
            zIndex: 24,
            backgroundColor: 'rgba(15,23,42,0.92)',
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.08)',
          }}
        >
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', textAlign: 'center' }}>
            {ephemeralTurnHint}
          </Text>
        </Animated.View>
      ) : null}

      {/* ═══ NAV STATUS — slim strip (ETA · dist · arrive) + separated End button ═ */}
      {nav.isNavigating && nav.liveEta && (
        <NavigationStatusStrip
          drivingMode={drivingMode}
          modeConfig={modeConfig}
          isLight={isLight}
          liveEta={nav.liveEta}
          arrivalEpochMs={nav.navigationProgress?.etaEpochMs ?? null}
          progressDistanceMiles={
            nav.navigationProgress
              ? Math.max(0, nav.navigationProgress.distanceRemainingMeters / 1609.34)
              : null
          }
          progressDurationMinutes={
            nav.navigationProgress
              ? Math.max(0, nav.navigationProgress.durationRemainingSeconds / 60)
              : null
          }
          speedMph={displaySpeedMph}
          isRerouting={nav.isRerouting}
          onEndNavigation={nav.stopNavigation}
          bottomInset={insets.bottom}
          voiceMuted={navVoiceMuted}
          drivenMiles={nav.traveledDistanceMeters / 1609.34}
          onVoiceToggle={() => {
            setNavVoiceMuted((m) => {
              if (!m) stopSpeaking();
              return !m;
            });
          }}
          onVoiceRepeat={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            repeatLastTurnByTurn(drivingMode, navVoiceMuted);
          }}
        />
      )}

      <RoutePreviewPanel
        visible={nav.showRoutePreview && !!nav.navigationData && !nav.isNavigating}
        navData={nav.navigationData ? { destination: nav.navigationData.destination } : null}
        availableRoutes={nav.availableRoutes}
        selectedRouteIndex={nav.selectedRouteIndex}
        onSelectRoute={nav.handleRouteSelect}
        detailsExpanded={routePreviewDetails}
        onToggleDetails={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setRoutePreviewDetails((d) => !d);
        }}
        handlePanGesture={routePreviewHandlePan}
        onDismiss={dismissRoutePreview}
        onLayoutHeight={setRoutePreviewHeight}
        insetsBottom={insets.bottom}
        colors={colors}
        isLight={isLight}
        drivingMode={drivingMode}
        modeConfig={modeConfig}
        currentAddress={currentAddress}
        selectedDestinationAddress={nav.selectedDestination?.address}
        hasTallVehicle={hasTallVehicle}
        vehicleHeight={vehicleHeight}
        avoidLowClearances={avoidLowClearances}
        setAvoidLowClearances={setAvoidLowClearances}
        analyzeCongestion={analyzeCongestion}
        onStartNavigationPress={() => {
          setSelectedPlaceId(null);
          setSelectedPlace(null);
          if (navNativeFullScreenEnabled() && nav.navigationData && location) {
            const nearestIncident = nearbyIncidents.reduce<Incident | null>((best, inc) => {
              const incDist = haversineMeters(location.lat, location.lng, inc.lat, inc.lng);
              if (!best) return inc;
              const bestDist = haversineMeters(location.lat, location.lng, best.lat, best.lng);
              return incDist < bestDist ? inc : best;
            }, null);
            const nearestIncidentMiles = nearestIncident
              ? haversineMeters(location.lat, location.lng, nearestIncident.lat, nearestIncident.lng) / 1609.34
              : null;
            const reportHint =
              nearestIncident && nearestIncidentMiles != null && nearestIncidentMiles <= 2.5
                ? `${nearestIncident.title || nearestIncident.type} reported about ${nearestIncidentMiles.toFixed(1)} mi away.`
                : undefined;
            const nativeParams = normalizeNativeNavParams({
              origin: { lat: location.lat, lng: location.lng },
              destination: {
                lat: nav.navigationData.destination.lat,
                lng: nav.navigationData.destination.lng,
                name: nav.navigationData.destination.name,
              },
              voiceMuted: navVoiceMuted,
              drivingMode,
            });
            if (nativeParams) {
              rnNav.navigate('NativeNavigation', {
                ...nativeParams,
                ...(reportHint ? { reportHint } : {}),
              });
              nav.setShowRoutePreview(false);
            } else {
              nav.startNavigation();
            }
          } else {
            nav.startNavigation();
          }
        }}
        styles={s}
      />

      {/* ═══ TRIP SUMMARY ═════════════════════════════════════════════════ */}
      <TripSummaryModal visible={!!activeTripSummary} onClose={dismissActiveTripSummary}>
        {activeTripSummary ? (
          <>
            <Text style={[s.tripTitle, { color: colors.text }]}>
              {activeTripSummary.arrivedAtDestination ? "You've arrived" : 'Trip Summary'}
            </Text>
            <Text style={[s.tripRoute, { color: colors.textTertiary }]}>{activeTripSummary.origin} → {activeTripSummary.destination}</Text>
            {activeTripSummary.arrivedAtDestination && activeTripSummary.counted !== false ? (
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 14,
                  fontWeight: '600',
                  textAlign: 'center',
                  marginBottom: 10,
                }}
              >
                Here’s how this trip looks in SnapRoad.
              </Text>
            ) : null}
            {activeTripSummary.counted === false && (
              <View style={{ backgroundColor: isLight ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.15)', borderRadius: 12, padding: 12, marginBottom: 12 }}>
                <Text style={{ color: isLight ? '#92400E' : '#FBBF24', fontSize: 13, fontWeight: '600', textAlign: 'center' }}>
                  This drive didn’t meet the minimum to count for gems or trip history. You need about 0.15 miles on the route, at
                  least 45 seconds of driving, and about 200 meters of real GPS movement. Try a slightly longer trip next time.
                </Text>
              </View>
            )}
            <View style={s.tripGrid}>
              {[
                { l: 'Distance', v: `${(activeTripSummary.distance ?? 0).toFixed(1)} mi`, c: colors.text },
                { l: 'Time', v: formatDuration(activeTripSummary.duration), c: colors.text },
                { l: 'Safety', v: String(activeTripSummary.safety_score), c: colors.success },
                { l: 'Gems', v: `+${activeTripSummary.gems_earned}`, c: colors.warning },
                { l: 'XP', v: `+${activeTripSummary.xp_earned}`, c: '#4f46e5' },
              ].map((stat) => (
                <View key={stat.l} style={[s.tripStat, { backgroundColor: colors.surfaceSecondary }]}>
                  <Text style={[s.tripStatL, { color: colors.textTertiary }]}>{stat.l}</Text>
                  <Text style={[s.tripStatV, { color: stat.c }]}>{stat.v}</Text>
                </View>
              ))}
            </View>
            {activeTripSummary.profile_totals &&
            (activeTripSummary.profile_totals.total_miles != null ||
              activeTripSummary.profile_totals.gems != null) ? (
              <Text
                style={{
                  color: colors.textTertiary,
                  fontSize: 12,
                  fontWeight: '600',
                  textAlign: 'center',
                  marginTop: 10,
                  lineHeight: 17,
                }}
              >
                {activeTripSummary.profile_totals.total_miles != null
                  ? `Lifetime miles: ${Number(activeTripSummary.profile_totals.total_miles).toFixed(1)} mi`
                  : ''}
                {activeTripSummary.profile_totals.total_miles != null &&
                activeTripSummary.profile_totals.gems != null
                  ? ' · '
                  : ''}
                {activeTripSummary.profile_totals.gems != null
                  ? `Gems balance: ${activeTripSummary.profile_totals.gems}`
                  : ''}
              </Text>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <TouchableOpacity style={[s.tripDone, { backgroundColor: 'rgba(59,130,246,0.12)', flex: 1 }]} onPress={() => setShowTripShare(true)}>
                <Text style={[s.tripDoneT, { color: colors.primary }]}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.tripDone, { backgroundColor: colors.primary, flex: 2 }]} onPress={dismissActiveTripSummary}>
                <Text style={s.tripDoneT}>Done</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : null}
      </TripSummaryModal>

      {/* ═══ FLOATING BUTTONS (navigation) ════════════════════════════════ */}

      {nav.isNavigating && !nav.showRoutePreview && !activeTripSummary && (
        <View style={[s.navFabCol, { bottom: MAP_NAV_BOTTOM_INSET + insets.bottom + 10 }]}>
          {!cameraLocked && (
            <TouchableOpacity
              style={[s.navFab, { backgroundColor: '#3B82F6' }]}
              onPress={handleRecenter}
              accessibilityLabel="Recenter"
            >
              <Ionicons name="navigate" size={20} color="#fff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[s.navFab, {
              backgroundColor: isLight ? 'rgba(255,255,255,0.94)' : 'rgba(30,41,59,0.94)',
              borderWidth: 1,
              borderColor: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)',
            }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowReportPicker(true);
            }}
            accessibilityLabel="Report incident"
          >
            <Ionicons name="warning-outline" size={20} color="#F59E0B" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.navFab, {
              backgroundColor: isLight ? 'rgba(255,255,255,0.94)' : 'rgba(30,41,59,0.94)',
              borderWidth: 1,
              borderColor: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)',
            }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowPhotoReport(true);
            }}
            accessibilityLabel="Photo report"
          >
            <Ionicons name="camera-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {!nav.isNavigating && !nav.showRoutePreview && !activeTripSummary && !selectedPlace && !selectedPlaceId && (
        <TouchableOpacity style={[s.reportFab, {
          bottom: 40 + insets.bottom,
          right: 20,
          backgroundColor: isLight ? 'rgba(255,255,255,0.94)' : 'rgba(30,41,59,0.94)',
          borderColor: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)',
        }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowReportPicker(true); }}
          onLongPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); setShowPhotoReport(true); }}>
          <Ionicons name="camera-outline" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      )}

      {!nav.showRoutePreview && !activeTripSummary && !nav.isNavigating && !selectedPlace && !selectedPlaceId && (
        <TouchableOpacity
          style={[s.communityBtn, {
            bottom: 108 + insets.bottom,
            left: 16,
            backgroundColor: isLight ? 'rgba(255,255,255,0.92)' : 'rgba(30,30,46,0.92)',
            borderColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
          }]}
          onPress={() => setShowCommunitySheet(true)}
        >
          <Ionicons name="people-outline" size={18} color={colors.text} /><Text style={[s.communityT, { color: colors.text }]}>Community</Text>
        </TouchableOpacity>
      )}

      {!nav.isNavigating && isExploring && !isSearchFocused && !nav.showRoutePreview && !activeTripSummary && (
        <TouchableOpacity style={[s.recenter, { top: insets.top + 88 }]} onPress={handleRecenter}>
          <Ionicons name="navigate" size={14} color="#fff" style={{ marginRight: 6 }} />
          <Text style={s.recenterT}>Recenter</Text>
        </TouchableOpacity>
      )}

      {!nav.showRoutePreview && !activeTripSummary && (
        <View
          style={[s.orionFab, { top: insets.top + 236, right: 20 }]}
        >
          <OrionQuickMic
            visible
            interactionMode={nav.isNavigating ? 'navigation' : 'explore'}
            isPremium={Boolean(user?.isPremium)}
            context={orionContext}
            onOpenChat={() => setShowOrion(true)}
            onSuggestions={(items) => setOrionPendingSuggestions(items)}
            onReply={(text) => setOrionQuickReply(text)}
            onAction={(action: {
              type: string;
              name?: string;
              lat?: number;
              lng?: number;
              address?: string;
            }) => {
              if (action.type === 'navigate' && action.lat != null && action.lng != null) {
                const dest = {
                  name: action.name ?? 'Destination',
                  address: typeof action.address === 'string' ? action.address : '',
                  lat: action.lat,
                  lng: action.lng,
                };
                handleStartDirections(dest);
              } else if (action.type === 'add_stop' && action.lat && action.lng) {
                nav.addWaypoint({ lat: action.lat, lng: action.lng, name: action.name ?? 'Stop' });
              } else if (action.type === 'mode' && action.name) {
                const m = action.name.toLowerCase();
                if (m === 'calm' || m === 'adaptive' || m === 'sport') setDrivingMode(m as DrivingMode);
              }
            }}
          />
          {!user?.isPremium && nav.isNavigating && (
            <View style={{ position: 'absolute', top: -2, right: -2, backgroundColor: '#3B82F6', borderRadius: 8, width: 16, height: 16, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="navigate" size={8} color="#fff" />
            </View>
          )}
        </View>
      )}

      {nav.isNavigating && !!orionQuickReply && (
        <View
          style={[
            s.orionReplyStrip,
            {
              top: insets.top + 188,
              backgroundColor: isLight ? 'rgba(255,255,255,0.94)' : 'rgba(15,23,42,0.9)',
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name="sparkles" size={14} color={colors.primary} />
          <Text style={[s.orionReplyStripText, { color: colors.text }]} numberOfLines={2}>
            {orionQuickReply}
          </Text>
        </View>
      )}

      {!nav.isNavigating && !nav.showRoutePreview && !selectedPlace && !selectedPlaceId && recommendedNearbyOffers.length > 0 && (
        <TouchableOpacity
          style={[s.offerPill, { bottom: 50 + insets.bottom, backgroundColor: isLight ? 'rgba(255,255,255,0.92)' : 'rgba(30,30,46,0.92)', borderColor: colors.border }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (recommendedNearbyOffers.length === 1) {
              setSelectedOffer(recommendedNearbyOffers[0]);
            } else {
              setNearbyOffersPickerOpen(true);
            }
          }}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel={`${recommendedNearbyOffers.length} gem offers within 20 miles, open list`}
        >
          <Ionicons name="diamond-outline" size={15} color={colors.warning} />
          <Text style={[s.offerPillT, { color: colors.text }]}>{recommendedNearbyOffers.length} offers within 20 mi</Text>
          <View style={[s.offerBadge, { backgroundColor: colors.success }]}>
            <Text style={s.offerBadgeT}>{recommendedNearbyOffers.length}</Text>
          </View>
          <Ionicons name="chevron-up" size={16} color={colors.textSecondary} style={{ marginLeft: 2 }} />
        </TouchableOpacity>
      )}

      {!nav.isNavigating && !nav.showRoutePreview && !selectedPlace && !selectedPlaceId && (
        <View style={[s.modeRow, { bottom: insets.bottom + 16 }]}>
          {(Object.entries(DRIVING_MODES) as [DrivingMode, typeof modeConfig][]).map(([mode, cfg]) => {
            const sel = drivingMode === mode;
            const modeIcon = cfg.icon ?? 'pulse-outline';
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
        const rawLimit =
          nav.isNavigating && nav.navigationData?.maxspeeds
            ? nav.navigationData.maxspeeds[Math.min(nav.currentStepIndex, nav.navigationData.maxspeeds.length - 1)]
            : null;
        const currentSpeedLimit =
          typeof rawLimit === 'number' && Number.isFinite(rawLimit) ? rawLimit : null;
        const hasLimit = nav.isNavigating && currentSpeedLimit != null;
        const isOverSpeed = hasLimit && speed > (currentSpeedLimit as number);
        return (
          <View
            style={{
              position: 'absolute',
              left: 14,
              bottom: (nav.isNavigating ? MAP_NAV_BOTTOM_INSET : 40) + insets.bottom,
              alignItems: 'center',
            }}
          >
            <View
              style={[
                s.speedBadge,
                hasLimit && s.speedBadgeWithLimit,
                {
                  borderColor: isOverSpeed ? '#FF3B30' : modeConfig.etaAccentColor,
                  backgroundColor: isLight ? 'rgba(255,255,255,0.95)' : 'rgba(15,23,42,0.92)',
                },
              ]}
            >
              <Text
                style={[
                  s.speedVal,
                  hasLimit && s.speedValCompact,
                  { color: isOverSpeed ? '#FF3B30' : modeConfig.speedColor },
                ]}
              >
                {Math.round(speed)}
              </Text>
              <Text style={[s.speedUnit, { color: colors.textTertiary }]}>mph</Text>
              {hasLimit ? (
                <Text
                  style={[
                    s.speedLimitInline,
                    { color: isOverSpeed ? '#FF3B30' : colors.textTertiary },
                  ]}
                >
                  LIMIT {currentSpeedLimit}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })()}

      {!nav.isNavigating && !nav.showRoutePreview && (
        <>
          <TouchableOpacity style={[s.layerBtn, { top: insets.top + 116, backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowStylePicker(true); }}>
            <Ionicons name="layers-outline" size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.layerBtn, { top: insets.top + 170, backgroundColor: followMode === 'heading' ? '#3B82F6' : followMode === 'follow' ? '#10B981' : colors.surface, borderColor: followMode !== 'free' ? 'transparent' : colors.border }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setFollowMode((prev) => {
                const next = prev === 'free' ? 'follow' : prev === 'follow' ? 'heading' : 'free';
                if (next === 'follow') { setIsExploring(false); setCompassMode(false); setCameraLocked(true); }
                else if (next === 'heading') { setIsExploring(false); setCompassMode(true); setCameraLocked(true); }
                else { setCompassMode(false); }
                return next;
              });
            }}>
            <Ionicons name={followMode === 'heading' ? 'navigate' : followMode === 'follow' ? 'locate' : 'compass-outline'} size={20} color={followMode !== 'free' ? '#fff' : colors.text} />
          </TouchableOpacity>
        </>
      )}

      {isLocating && <View style={[s.locBanner, { top: insets.top + 84 }]}><Text style={s.locT}>Finding your location...</Text></View>}

      {showTrafficSafety &&
        isTrafficSafetyLayerEnabled(location.lat, location.lng) &&
        trafficSafetyHint &&
        !nav.isNavigating && (
          <View
            style={[
              s.mapLayerHint,
              {
                bottom: 96 + insets.bottom,
                backgroundColor: isLight ? 'rgba(255,255,255,0.94)' : 'rgba(30,30,46,0.94)',
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons name="information-circle-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={[s.mapLayerHintT, { color: colors.textSecondary }]}>{trafficSafetyHint}</Text>
          </View>
        )}

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
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TouchableOpacity style={s.ciVote} onPress={() => handleUpvote(item)}>
                        <Ionicons name="thumbs-up-outline" size={14} color="#fff" /><Text style={s.ciVoteT}>{item.upvotes}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.ciVote, { backgroundColor: 'rgba(239,68,68,0.85)' }]} onPress={() => handleDownvote(item)}>
                        <Ionicons name="thumbs-down-outline" size={14} color="#fff" />
                      </TouchableOpacity>
                    </View>
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
              {MAP_STYLES.map((ms, i) => {
                const sel = mapStylePickerHighlightIndex === i;
                return (
                  <TouchableOpacity
                    key={ms.key}
                    style={s.sheetItem}
                    onPress={() => {
                      setStyleOverride(i);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setShowStylePicker(false);
                    }}
                  >
                    <View style={[s.sheetIcon, sel && { borderWidth: 2, borderColor: colors.primary }]}>
                      <Ionicons name={ms.icon} size={22} color={sel ? colors.primary : colors.textSecondary} />
                    </View>
                    <Text style={[s.sheetLbl, { color: sel ? colors.primary : colors.textSecondary }]}>{ms.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={[s.layerSectionT, { color: colors.text }]}>Layers</Text>
            {[
              { k: 'traffic', l: 'Traffic', ic: 'car-outline' as const, v: showTraffic, t: setShowTraffic },
              { k: 'incidents', l: 'Incidents', ic: 'warning-outline' as const, v: showIncidents, t: setShowIncidents },
              {
                k: 'cameras',
                l: 'Cameras',
                ic: 'videocam-outline' as const,
                v: showCameras,
                t: setShowCameras,
                sub: user?.isPremium ? undefined : 'Premium — tap to upgrade and enable',
              },
              { k: 'construction', l: 'Construction', ic: 'construct-outline' as const, v: showConstruction, t: setShowConstruction },
              {
                k: 'trafficSafety',
                l: 'Traffic safety (speed cameras)',
                ic: 'speedometer-outline' as const,
                v: showTrafficSafety,
                t: setShowTrafficSafety,
                disabled: !isTrafficSafetyLayerEnabled(location.lat, location.lng),
                sub: !isTrafficSafetyLayerEnabled(location.lat, location.lng) ? 'Not available in your region' : undefined,
              },
              { k: 'photos', l: 'Photo reports', ic: 'camera-outline' as const, v: showPhotoReports, t: setShowPhotoReports },
            ].map((ly) => (
              <View key={ly.k} style={s.layerRow}>
                <Ionicons name={ly.ic} size={18} color={colors.textSecondary} />
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[s.layerLbl, { color: colors.text }]}>{ly.l}</Text>
                  {'sub' in ly && ly.sub ? (
                    <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 2 }}>{ly.sub}</Text>
                  ) : null}
                </View>
                <Switch
                  value={ly.k === 'cameras' ? Boolean(user?.isPremium && ly.v) : ly.v}
                  disabled={'disabled' in ly && ly.disabled}
                  onValueChange={(v) => {
                    if (ly.k === 'cameras') {
                      if (!user?.isPremium) {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        Alert.alert(
                          'Premium feature',
                          'Traffic cameras on the map are included with SnapRoad Premium. Upgrade to enable this layer.',
                          [
                            { text: 'Not now', style: 'cancel' },
                            { text: 'Upgrade', onPress: () => rnNav.navigate('Profile', { screen: 'ProfileMain' }) },
                          ],
                        );
                        return;
                      }
                      setShowCameras(v);
                      return;
                    }
                    ly.t(v);
                  }}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#fff"
                />
              </View>
            ))}
          </View>
        </View>
      )}

      <PhotoReportSheet
        visible={showPhotoReport}
        lat={location.lat}
        lng={location.lng}
        onClose={() => setShowPhotoReport(false)}
        isLight={isLight}
        speedMph={speed}
      />
      <PhotoReportDetailModal
        visible={!!selectedPhotoReport}
        report={selectedPhotoReport}
        onVotesChanged={refreshPhotoReportsNearby}
        onClose={() => setSelectedPhotoReport(null)}
      />
      <HamburgerMenu
        visible={showMenu}
        onClose={() => setShowMenu(false)}
        isLight={isLight}
        onNavigate={(screen) => {
          /* Menu already closed by HamburgerMenu before this runs (deferred). */
          if (screen === 'Profile' || screen === 'Help') {
            rnNav.navigate('Profile', { screen: 'ProfileMain' });
          } else if (screen === 'PlaceAlerts') {
            (rnNav as { navigate: (name: string, params?: object) => void }).navigate('Profile', {
              screen: 'ProfileMain',
              params: { openPlaceAlerts: true },
            });
          } else if (screen === 'CommuteAlerts') {
            (rnNav as { navigate: (name: string, params?: object) => void }).navigate('Profile', {
              screen: 'ProfileMain',
              params: { openCommuteReminders: true },
            });
          } else if (screen === 'Convoy') {
            if (!user?.isPremium) {
              Alert.alert('Premium feature', 'Convoy and friend meetups require SnapRoad Premium.', [
                { text: 'Not now', style: 'cancel' },
                { text: 'Upgrade', onPress: () => rnNav.navigate('Profile', { screen: 'ProfileMain' }) },
              ]);
              return;
            }
            setShowConvoy(true);
          } else if (screen === 'Social') {
            if (!user?.isPremium) {
              Alert.alert('Premium feature', 'Friends and live location require SnapRoad Premium.', [
                { text: 'Not now', style: 'cancel' },
                { text: 'Upgrade', onPress: () => rnNav.navigate('Profile', { screen: 'ProfileMain' }) },
              ]);
              return;
            }
            rnNav.navigate('Dashboards', { screen: 'DashboardMain' });
          }
        }}
      />
      <ConvoyMode
        visible={showConvoy}
        onClose={() => setShowConvoy(false)}
        members={friendLocationsVisible.map((f) => ({ id: f.id, name: f.name, lat: f.lat, lng: f.lng }))}
        onStartConvoy={(dest) => {
          setShowConvoy(false);
          void handleSelectResult({ name: dest.name, address: '', lat: dest.lat, lng: dest.lng });
        }}
      />
      {showGemOverlay && <GemOverlay visible={showGemOverlay} gemsEarned={gemOverlayAmount} onDone={() => setShowGemOverlay(false)} />}
      <MapCategoryExploreSheet
        visible={categoryExplore != null}
        onClose={() => {
          exploreRestoreRef.current = null;
          setCategoryExplore(null);
        }}
        title={categoryExplore?.title ?? ''}
        subtitle={categoryExplore?.subtitle}
        loading={categoryExplore?.loading ?? false}
        error={categoryExplore?.error ?? null}
        results={categoryExplore?.results ?? []}
        userLat={location.lat}
        userLng={location.lng}
        colors={{
          surface: colors.surfaceSecondary,
          text: colors.text,
          textSecondary: colors.textSecondary,
          textTertiary: colors.textTertiary,
          border: colors.border,
          primary: colors.primary,
        }}
        onPick={(row) => {
          if (categoryExplore) exploreRestoreRef.current = categoryExplore;
          setCategoryExplore(null);
          void handleSelectResult({
            name: row.name,
            address: row.address,
            lat: row.lat,
            lng: row.lng,
            place_id: row.place_id,
            placeType: row.placeType,
            photo_reference: row.photo_reference,
            open_now: row.open_now === null || row.open_now === undefined ? undefined : row.open_now,
            price_level: row.price_level ?? undefined,
          });
        }}
      />
      <TripShare visible={showTripShare} onClose={() => setShowTripShare(false)} trip={activeTripSummary ?? null} />

      {showOrion && !nav.isNavigating && (
        <OrionChat
          visible={showOrion}
          onClose={() => setShowOrion(false)}
          isPremium={user?.isPremium ?? false}
          context={orionContext}
          onSuggestions={(items) => setOrionPendingSuggestions(items)}
          onAction={(action: {
            type: string;
            name?: string;
            lat?: number;
            lng?: number;
            address?: string;
          }) => {
            if (action.type === 'navigate' && action.lat != null && action.lng != null) {
              setShowOrion(false);
              const dest = {
                name: action.name ?? 'Destination',
                address: typeof action.address === 'string' ? action.address : '',
                lat: action.lat,
                lng: action.lng,
              };
              handleStartDirections(dest);
            } else if (action.type === 'add_stop' && action.lat && action.lng) {
              setShowOrion(false);
              nav.addWaypoint({ lat: action.lat, lng: action.lng, name: action.name ?? 'Stop' });
            } else if (action.type === 'mode' && action.name) {
              const m = action.name.toLowerCase();
              if (m === 'calm' || m === 'adaptive' || m === 'sport') setDrivingMode(m as DrivingMode);
            }
          }}
        />
      )}
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

  turnWrap: { position: 'absolute', left: 0, right: 0, zIndex: 25 },

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

  friendMapBanner: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.92)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 4,
    ...shadow(10, 0.2),
  },
  friendMapBannerInvite: {
    borderColor: 'rgba(167,139,250,0.35)',
  },
  friendMapBannerText: { flex: 1, color: '#f8fafc', fontSize: 13, fontWeight: '600' },
  friendMapBannerLink: { color: '#60a5fa', fontWeight: '800', fontSize: 13 },
  friendMapBannerMuted: { color: '#94a3b8', fontWeight: '600', fontSize: 13 },

  // ─── Unified ETA bar: single compact row ────────────────────────────────
  etaBarUnified: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 10, paddingTop: 6,
    flexDirection: 'row',
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
  etaUniLbl: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.9 },
  etaUniValAccent: { fontSize: 24, fontWeight: '900', marginTop: 4, letterSpacing: -0.5 },
  etaUniVal: { fontSize: 21, fontWeight: '800', marginTop: 4 },
  etaUniDiv: { width: 1, height: 40 },
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
  previewTitle: { fontSize: 19, fontWeight: '800', marginBottom: 8, letterSpacing: -0.3 },
  previewRouteLbl: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  previewRouteVal: { fontSize: 14, fontWeight: '600', marginTop: 2, lineHeight: 19 },
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
  tripStat: { width: '47%' as any, borderRadius: 16, padding: 16 },
  tripStatL: { fontSize: 13, fontWeight: '600' },
  tripStatV: { fontSize: 22, fontWeight: '800', marginTop: 4 },
  tripDone: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', ...shadow(12, 0.3) },
  tripDoneT: { color: '#fff', fontSize: 16, fontWeight: '800' },

  // Floating buttons
  navFabCol: { position: 'absolute', right: 16, zIndex: 12, gap: 12, alignItems: 'center' as const },
  navFab: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center' as const, alignItems: 'center' as const, ...shadow(8, 0.18) },
  reportFab: { position: 'absolute', width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.94)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', ...shadow(8, 0.12) },
  communityBtn: { position: 'absolute', minHeight: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.94)', paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', ...shadow(8, 0.12) },
  communityT: { fontSize: 12, fontWeight: '700' },
  recenter: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)', paddingHorizontal: 22, paddingVertical: 10, borderRadius: 22, zIndex: 12 },
  recenterT: { color: '#fff', fontSize: 13, fontWeight: '700' },
  orionFab: { position: 'absolute', right: 16, zIndex: 12 },
  orionReplyStrip: {
    position: 'absolute',
    left: 16,
    right: 78,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 13,
  },
  orionReplyStripText: { fontSize: 12, fontWeight: '600', marginLeft: 6, flexShrink: 1 },
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
  speedBadge: { minWidth: 58, minHeight: 58, borderRadius: 29, borderWidth: 2.5, justifyContent: 'center', alignItems: 'center', ...shadow(10, 0.15) },
  speedBadgeWithLimit: { minWidth: 64, minHeight: 80, borderRadius: 32, paddingVertical: 10, paddingHorizontal: 8 },
  speedVal: { fontSize: 17, fontWeight: '800' },
  speedValCompact: { fontSize: 16 },
  speedUnit: { fontSize: 9, fontWeight: '600', marginTop: -1 },
  speedLimitInline: { fontSize: 8, fontWeight: '800', letterSpacing: 0.4, marginTop: 4, textTransform: 'uppercase' as const },
  layerBtn: { position: 'absolute', right: 16, width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1, ...shadow(8, 0.15), zIndex: 12 },
  locBanner: { position: 'absolute', alignSelf: 'center', backgroundColor: 'rgba(59,130,246,0.92)', paddingHorizontal: 18, paddingVertical: 9, borderRadius: 22 },
  mapLayerHint: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 11,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    ...shadow(10, 0.12),
  },
  mapLayerHintT: { flex: 1, fontSize: 12, lineHeight: 16, fontWeight: '600' },
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
