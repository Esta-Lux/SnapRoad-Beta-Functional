import React, { useRef, useState, useCallback, useEffect, useLayoutEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Platform,
  Keyboard,
  Alert,
  Switch,
  Pressable,
  Image,
  Dimensions,
  AppState,
  InteractionManager,
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
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useLocation } from '../hooks/useLocation';
import { useDriveNavigation } from '../hooks/useDriveNavigation';
import { useNavigationRuntimeProtection } from '../hooks/useNavigationRuntimeProtection';
import { useOfflineMaps } from '../hooks/useOfflineMaps';
import { useSdkStepGapDisplay } from '../hooks/useSdkStepGapDisplay';
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
import {
  FRIEND_FOLLOW_REROUTE_LONG_JUMP_M,
  FRIEND_FOLLOW_REROUTE_LONG_JUMP_MIN_INTERVAL_MS,
  FRIEND_FOLLOW_REROUTE_MIN_INTERVAL_MS,
  FRIEND_FOLLOW_REROUTE_MIN_MOVE_M,
} from '../navigation/friendFollowConfig';
import RouteOverlay from '../components/map/RouteOverlay';
import {
  startFriendLiveShareBackgroundUpdates,
  stopFriendLiveShareBackgroundUpdates,
} from '../location/friendLiveShareBackgroundTask';
import {
  FRIEND_LIVE_LAST_NAV_KEY,
  FRIEND_LIVE_SHARE_MODE_KEY,
  FRIEND_LIVE_SHARE_PUBLISH_INTERVAL_MS,
  FRIEND_LIVE_SHARE_STORAGE_KEY,
  isAlwaysFollowMode,
} from '../location/friendLiveShareConfig';
import { nudgeBackgroundLocationAfterEnablingShare } from '../location/friendLocationPermissionUx';
import OfferMarkers from '../components/map/OfferMarkers';
import ReportMarkers from '../components/map/ReportMarkers';
import FriendMarkers from '../components/map/FriendMarkers';
import CameraMarkers from '../components/map/CameraMarkers';
import GasPriceMarkers from '../components/map/GasPriceMarkers';
import type { CameraLocation, CameraViewFeed } from '../components/map/CameraMarkers';
import type { GasPriceMapPoint } from '../components/map/GasPriceMarkers';
import {
  cheapestLocalRegularChip,
  formatLocalGasRegularSummary,
  gasPricePointsFromApiEnvelope,
  isLocalStationGasRow,
  matchGasStationNearPlace,
  nearestGasPricePointByLocation,
  formatStateGasRegularSummary,
  formatUsdPerGalChip,
  parseUsdPerGallonNumber,
} from '../components/map/gasPricesFromApi';
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
import { SpotlightTarget } from '../components/onboarding/SpotlightCoachTour';
import IncidentReportCard from '../components/map/IncidentReportCard';
import TrafficCongestionBanner from '../components/map/TrafficCongestionBanner';
import RoutePreviewPanel from '../components/map/RoutePreviewPanel';
import { projectAhead, getCameraConfig, getLookAheadMeters } from '../navigation/navigationCamera';
import { getDistanceToUpcomingManeuverMeters, getUpcomingManeuverStep } from '../navigation/routeGeometry';
import { useNavigationSpeech } from '../hooks/useNavigationSpeech';
import { repeatLastTurnByTurn } from '../navigation/navigationGuidanceMemory';
import TurnInstructionCard from '../components/navigation/TurnInstructionCard';
import NavigationStatusStrip, { MAP_NAV_BOTTOM_INSET } from '../components/navigation/NavigationStatusStrip';
import { labelAnchorLayerIdForStyleUrl } from '../map/mapLayerRegistry';
import { getPrimaryBannerText, isActionableGuidanceStep, mergeLaneSources, pickGuidanceStep } from '../navigation/bannerInstructions';
import { isLiveShareFresh } from '../lib/friendPresence';
import type { Coordinate, MapFocusFriendParams, NavigateToFriendParams } from '../types';
import {
  formatImperialManeuverDistance,
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
import { sdkGuidanceStabilityKey } from '../navigation/sdkGuidanceUiKeys';
import { sdkManeuverDisplayDistanceFromProgress } from '../navigation/sdkNavBridgePayload';
import { useTurnConfirmationUntil } from '../hooks/useTurnConfirmationWindow';
import { useMapWeather, weatherOverlayFactor } from '../hooks/useMapWeather';
import MapWeatherOverlay from '../components/map/MapWeatherOverlay';
import GemOverlay from '../components/gamification/GemOverlay';
import TripShare from '../components/gamification/TripShare';
import HamburgerMenu from '../components/profile/HamburgerMenu';
// Crash detection hook removed (no SOS backend); friend locations handled inline via Supabase realtime
import {
  alongRouteDistanceMeters,
  coordinateAtCumulativeMeters,
  formatDistance,
  haversineMeters,
  polylineLengthMeters,
  segmentAndTFromCumAlongPolyline,
  tangentBearingAlongPolyline,
  type RouteSplitForOverlay,
} from '../utils/distance';
import { distanceAheadEffectiveMeters, isIncidentAheadSnapshot } from '../utils/navIncidentAhead';
import { useSmoothedNavFraction } from '../hooks/useSmoothedNavFraction';
import { formatDuration } from '../utils/format';
import { formatUsd } from '../utils/driveMetrics';
import { speak, stopSpeaking } from '../utils/voice';
import { api, API_BASE_URL } from '../api/client';
import { absolutizeMediaUrl } from '../utils/mediaUrl';
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
import { navLogicDebugEnabled, navLogicSdkEnabled, navNativeFullScreenEnabled } from '../navigation/navFeatureFlags';
import { logNavVerify } from '../navigation/navLogicDebug';
import {
  ingestSdkCameraState,
  ingestSdkLaneAssets,
  ingestSdkLocation,
  ingestSdkProgress,
  ingestSdkRouteChangedEvent,
  ingestSdkRoutePolyline,
  ingestSdkVoiceSubtitle,
  resetNavSdkState,
} from '../navigation/navEngine';
import type { NativeFormattedDistance, NativeLaneAsset, SdkCameraPayload } from '../navigation/navSdkMirrorTypes';
import type { SdkLocationPayload, SdkProgressPayload } from '../navigation/navSdkStore';
import { polylineFromSdkRoutes, type SdkRoutesNative } from '../navigation/navSdkGeometry';
import {
  isSdkBannerAuthoritative,
  isSdkPuckAuthoritative,
  isSdkRouteAuthoritative,
} from '../navigation/navSdkAuthority';
import { bucketSpeedMpsTo5Mph, maneuverDistanceBucketMeters } from '../navigation/cameraPresets';
import { getNativeHeadlessFollowingPitch, getNativeHeadlessFollowingZoom } from '../navigation/nativeNavCameraMirror';
import {
  getNavCameraFollowTuning,
  shouldIssueNavCameraFollowCommand,
} from '../navigation/navCameraFollowTuning';
import NavSdkPuck from '../components/map/NavSdkPuck';
import {
  INITIAL_DISPLAY_POSITION_STATE,
  INITIAL_STATIONARY_LOCK,
  stabilizeDisplayPosition,
  resolvePuckCoord as resolvePuckCoordSync,
  resolvePuckHeading as resolvePuckHeadingSync,
  updateStationaryLock,
} from '../navigation/navPuckSync';
import {
  resolveHeadingCandidate as resolveRouteHeadingCandidate,
  shouldGluePuckToRoute,
  snapPuckToRoute,
} from '../navigation/navRouteSnap';
import { MapboxNavigationView, type MapboxNavigationViewRef } from '@badatgil/expo-mapbox-navigation';
import { routeProfileForPlatform } from '../hooks/useNativeNavBridge';
import { normalizeNativeNavParams } from '../navigation/nativeNavGuard';
import type { TripSummary } from '../hooks/useDriveNavigation';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation as useRNNavigation, useRoute, useIsFocused, useFocusEffect } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import type { MapStackParamList, MapStackScreenNavigationProp } from '../navigation/types';
import { extractLocationSharingState, getApiErrorMessage } from '../features/social/locationSharing';
import { storage } from '../utils/storage';
import { logMapDataIssue } from '../utils/mapApiDiagnostics';
import { supabase, supabaseConfigured } from '../lib/supabase';
import type { DrivingMode, Incident, SavedLocation, Offer, FriendLocation } from '../types';
import {
  mapFriendsApiToLocations,
  mergeLiveLocationUpdate,
} from '../hooks/useMapFriendPresence';
import { localMatchesForSearchQuery } from '../hooks/useMapSearchSession';
import {
  dedupeGeocodeResults,
  pickBestPlaceLocation,
  pickNearestNearby,
  sortGeocodeByEffectiveDistance,
} from '../lib/placeSearchRanking';
import { useNearbyOffersOnMap } from '../hooks/useNearbyOffersOnMap';
import { usePublicAppConfig } from '../hooks/usePublicAppConfig';

// ─── Constants ───────────────────────────────────────────────────────────────

const MAP_SHARE_INVITE_BANNER_DISMISS_KEY = 'snaproad_map_share_banner_dismissed';


function placePhotoThumbUri(photoRef?: string, maxWidth = 96): string | undefined {
  if (!photoRef || !API_BASE_URL) return undefined;
  return `${API_BASE_URL}/api/places/photo?ref=${encodeURIComponent(photoRef)}&maxwidth=${maxWidth}`;
}

/** Subtitle line for Nearby Gas sheet when we have `/api/fuel/prices` snapshots. */
function exploreGasFuelPricesSubtitle(userLat: number, userLng: number, fuelRows: GasPriceMapPoint[]): string | null {
  const priced = fuelRows.filter((row) => formatUsdPerGalChip(row.regular));
  if (!priced.length) return null;
  let pick = priced[0];
  let bestD = haversineMeters(userLat, userLng, pick.lat, pick.lng);
  for (let i = 1; i < priced.length; i += 1) {
    const row = priced[i];
    const d = haversineMeters(userLat, userLng, row.lat, row.lng);
    if (d < bestD) {
      bestD = d;
      pick = row;
    }
  }
  return formatLocalGasRegularSummary(pick);
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

function placeCardFuelHint(
  place: {
    category?: string;
    maki?: string;
    placeType?: string;
    price_level?: number;
  },
  matchedRegular?: GasPriceMapPoint | null,
): string | undefined {
  const t = `${place.category || ''} ${place.maki || ''} ${place.placeType || ''}`.toLowerCase();
  if (!t.includes('gas') && !t.includes('fuel')) return undefined;
  const chip = matchedRegular?.regular ? formatUsdPerGalChip(matchedRegular.regular) : null;
  if (chip) {
    const note =
      matchedRegular?.is_estimated === true ? ' Estimated — confirm at pump if needed.' : ' CollectAPI.';
    return `Regular ${chip}/gal.${note}`;
  }
  if (typeof place.price_level === 'number' && place.price_level >= 1 && place.price_level <= 4) {
    return `Typical cost tier ${'$'.repeat(place.price_level)}. No live pump price for this listing — confirm at pump.`;
  }
  return 'No live pump price for this listing — confirm at pump or open Nearby Gas.';
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
 * Non-navigation fallback is zero; during navigation, use {@link navFallbackFollowPadding} so the puck
 * sits at the bottom third even before the first `useCameraController` tick.
 */
const MAPBOX_DEFAULT_FOLLOW_PADDING = {
  paddingTop: 0,
  paddingRight: 0,
  paddingBottom: 0,
  paddingLeft: 0,
} as const;

const NAV_ORIGIN_REFRESH_TIMEOUT_MS = 1200;
const NAV_ORIGIN_REROUTE_DISTANCE_M = 22;

function isUsableCoordinate(coord: Coordinate | null | undefined): coord is Coordinate {
  return (
    coord != null &&
    Number.isFinite(coord.lat) &&
    Number.isFinite(coord.lng) &&
    (Math.abs(coord.lat) > 1e-6 || Math.abs(coord.lng) > 1e-6)
  );
}

async function getFreshNavigationOrigin(fallback: Coordinate): Promise<Coordinate> {
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    if (perm.status !== 'granted') return fallback;

    const lastKnown = await Location.getLastKnownPositionAsync({
      maxAge: 2500,
      requiredAccuracy: 35,
    });
    if (
      lastKnown &&
      Number.isFinite(lastKnown.coords.latitude) &&
      Number.isFinite(lastKnown.coords.longitude)
    ) {
      return { lat: lastKnown.coords.latitude, lng: lastKnown.coords.longitude };
    }

    const fix = await Promise.race<Location.LocationObject | null>([
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), NAV_ORIGIN_REFRESH_TIMEOUT_MS)),
    ]);
    if (fix && Number.isFinite(fix.coords.latitude) && Number.isFinite(fix.coords.longitude)) {
      return { lat: fix.coords.latitude, lng: fix.coords.longitude };
    }
  } catch {
    // Route start should remain usable when the fresh one-shot fix is unavailable.
  }
  return fallback;
}

/**
 * Mode-aware follow-padding used when the puck-follow camera is active but
 * `useCameraController` has not yet produced a preset (e.g. first render frame
 * after navigation starts). Uses the mode's `cameraPaddingBottom` so the puck
 * sits at the bottom third from the very first frame.
 */
function navFallbackFollowPadding(
  mc: { cameraPaddingBottom: number },
  safeBottom: number,
): {
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
} {
  return {
    paddingTop: 330,
    paddingBottom: mc.cameraPaddingBottom > 0 ? mc.cameraPaddingBottom + safeBottom : 90 + safeBottom,
    paddingLeft: 28,
    paddingRight: 28,
  };
}

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

/** Normalize vertices from REST Directions, sticky SDK geometry, or `navLogicCoords`. */
function coerceRouteOverviewPoint(p: {
  lat?: unknown;
  lng?: unknown;
  latitude?: unknown;
  longitude?: unknown;
}): Coordinate | null {
  const lat = typeof p.lat === 'number' ? p.lat : typeof p.latitude === 'number' ? p.latitude : NaN;
  const lng = typeof p.lng === 'number' ? p.lng : typeof p.longitude === 'number' ? p.longitude : NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function firstPolylineUsableForOverview(
  candidates: (readonly unknown[] | Coordinate[] | null | undefined)[],
): Coordinate[] | null {
  for (const raw of candidates) {
    if (!raw || raw.length < 2) continue;
    const out: Coordinate[] = [];
    for (const pt of raw) {
      const c = coerceRouteOverviewPoint(pt as {
        lat?: unknown;
        lng?: unknown;
        latitude?: unknown;
        longitude?: unknown;
      });
      if (c) out.push(c);
    }
    if (out.length >= 2) return out;
  }
  return null;
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

  /** Translucent slate HUD — avoids white “pill box” over the map. */
  const hudChromeGlass = useMemo(
    () => ({
      tileFill: isLight ? 'rgba(51,65,85,0.46)' : 'rgba(30,41,59,0.62)',
      tileBorder: isLight ? 'rgba(15,23,42,0.32)' : 'rgba(226,232,240,0.24)',
      clusterFill: isLight ? 'rgba(51,65,85,0.30)' : 'rgba(15,23,42,0.46)',
      clusterBorder: isLight ? 'rgba(15,23,42,0.22)' : 'rgba(148,163,184,0.22)',
    }),
    [isLight],
  );

  const [navVoiceMuted, setNavVoiceMuted] = useState(false);
  const [navLogicRuntimeDisabled, setNavLogicRuntimeDisabled] = useState(false);
  const navLogicEffective = navLogicSdkEnabled() && !navLogicRuntimeDisabled;
  useEffect(() => {
    const v = storage.getString('snaproad_nav_voice_muted');
    setNavVoiceMuted(v === '1');
  }, []);
  useEffect(() => {
    storage.set('snaproad_nav_voice_muted', navVoiceMuted ? '1' : '0');
  }, [navVoiceMuted]);

  /** Unmuting is always safe. Muting clears JS TTS only — on headless SDK, native owns audio; avoid Speech.stop + session restore fighting Mapbox voice. */
  const handleNavVoiceToggle = useCallback(() => {
    setNavVoiceMuted((m) => {
      if (!m && !navLogicEffective) {
        stopSpeaking();
      }
      return !m;
    });
  }, [navLogicEffective]);

  const [friendLocations, setFriendLocations] = useState<FriendLocation[]>([]);
  const [friendFollowSession, setFriendFollowSession] = useState<{
    friendId: string;
    name: string;
    mode: 'live' | 'last_known';
    startedLive: boolean;
  } | null>(null);
  const friendFollowLastDestRef = useRef<{ lat: number; lng: number } | null>(null);
  const friendFollowLastRerouteRef = useRef(0);
  const friendFollowRerouteBusyRef = useRef(false);
  const friendFollowSessionRef = useRef<typeof friendFollowSession>(null);
  useEffect(() => {
    friendFollowSessionRef.current = friendFollowSession;
  }, [friendFollowSession]);

  const { friendTrackingEnabled, liveLocationPublishingEnabled, refresh: refreshPublicAppConfig } =
    usePublicAppConfig(mapTabFocused);
  const [shareLocEpoch, setShareLocEpoch] = useState(0);
  const [livePublishPaused503, setLivePublishPaused503] = useState(false);
  const [shareInviteBannerDismissed, setShareInviteBannerDismissed] = useState(
    () => storage.getString(MAP_SHARE_INVITE_BANNER_DISMISS_KEY) === '1',
  );

  const shareLocationStorageOn = useMemo(() => {
    void shareLocEpoch;
    return storage.getString(FRIEND_LIVE_SHARE_STORAGE_KEY) === '1';
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

  useFocusEffect(
    useCallback(() => {
      if (user?.isPremium && friendTrackingEnabled) {
        refreshFriendLocations();
      }
    }, [user?.isPremium, friendTrackingEnabled, refreshFriendLocations]),
  );

  const friendLocationsVisible = friendTrackingEnabled ? friendLocations : [];

  const tabBarHeight = useBottomTabBarHeight();
  /** Nearest state's regular $/gal for trip-end fuel estimates + server `region_state`. */
  const tripFuelContextRef = useRef<{ stateLabel?: string; priceUsdPerGal?: number } | null>(null);

  // ── Navigation hook ──
  const nav = useDriveNavigation({
    userLocation: location,
    speed,
    heading,
    gpsAccuracy: accuracy,
    drivingMode,
    voiceMuted: navVoiceMuted,
    dynamicDestinationFollow: friendFollowSession?.mode === 'live',
    navSdkHeadless: navLogicEffective,
    tripFuelContextRef,
  });
  useNavigationRuntimeProtection(nav.isNavigating, nav.navigationProgress);
  const offlineMaps = useOfflineMaps();

  const promptOfflineMapDownload = useCallback(() => {
    if (!isMapAvailable()) {
      Alert.alert('Offline maps', 'Downloads need the native Mapbox build (not Expo Go).');
      return;
    }
    const loc = locationRef.current;
    if (!isUsableCoordinate(loc)) {
      Alert.alert('Location needed', 'Wait until your position appears on the map, then try again.');
      return;
    }
    const pad = 0.07;
    Alert.alert(
      'Save this area for offline',
      'Downloads street tiles around your current view (~6 km). Use Wi‑Fi when possible. Open the map once while online before going offline.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Download',
          onPress: () => {
            const name = `snaproad-${Date.now()}`;
            void offlineMaps
              .downloadRegion(name, {
                ne: [loc.lng + pad, loc.lat + pad],
                sw: [loc.lng - pad, loc.lat - pad],
              })
              .then(() => {
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Offline map', 'This area is saved on device.');
              })
              .catch((e: unknown) => {
                Alert.alert('Download failed', e instanceof Error ? e.message : 'Try again on Wi‑Fi.');
              });
          },
        },
      ],
    );
  }, [offlineMaps]);
  useNavigationSpeech({
    progress: nav.navigationProgress,
    enabled: !navVoiceMuted && nav.isNavigating && !navLogicEffective,
    drivingMode,
    routeSteps: nav.navigationData?.steps,
    routePolyline: nav.navigationData?.polyline,
    currentStepIndex: nav.currentStepIndex,
    userCoord: nav.navigationProgressCoord,
    navigationSteps: nav.navigationSteps,
  });
  const sdkStepGap = useSdkStepGapDisplay(nav.isNavigating, nav.navigationProgress);

  const navLogicRef = useRef<MapboxNavigationViewRef | null>(null);
  const [navLogicCoords, setNavLogicCoords] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const handleNavLogicFailure = useCallback((message?: string) => {
    console.warn('[NavLogicSDK] disabling hidden navigation engine for this trip', message ?? 'unknown error');
    try {
      navLogicRef.current?.stopNavigation?.();
    } catch (error) {
      console.warn('[NavLogicSDK] stopNavigation after failure failed', error);
    }
    resetNavSdkState();
    setNavLogicRuntimeDisabled(true);
    setNavLogicCoords([]);
  }, []);

  /**
   * `navLogicCoords` is the `coordinates` prop on the hidden
   * `MapboxNavigationView`. A new `coordinates` value is an instruction to
   * the native engine to re-seed the trip, so if we re-push on every GPS
   * tick the route churns, progress resets, and the map line “blinks”.
   * Once `onRoutesLoaded` runs, `ingestSdkRoutePolyline` fills
   * `nav.sdkRoutePolyline` and the SDK tracks the user via
   * `onNavigationLocationUpdate` / `onRouteProgressChanged` without new
   * waypoints.
   *
   * While **waiting for the first native route** (`sdkRoutePolyline` still
   * empty), a stale or cached origin would otherwise leave headless nav
   * stuck in “acquiring route” with the wrong start — we **do** re-read
   * live `location` until the native polyline exists, then we stop
   * coupling the effect to GPS (origin comes from the ref for session /
   * destination-only updates).
   */
  // Stable ref for latest location — read inside effects that MUST NOT
  // rebuild on every GPS tick (see `navLogicCoords` effect below and
  // various search / place helpers later in the file).
  const locationRef = useRef(location);
  useEffect(() => {
    locationRef.current = location;
  }, [location?.lat, location?.lng]);
  const trackOriginForNavLogic = useMemo(
    () => navLogicEffective && nav.isNavigating && (nav.sdkRoutePolyline?.length ?? 0) < 2,
    [navLogicEffective, nav.isNavigating, nav.sdkRoutePolyline.length],
  );
  useEffect(() => {
    if (!navLogicEffective || !nav.isNavigating || !nav.navigationData) {
      setNavLogicCoords([]);
      return;
    }
    const loc = trackOriginForNavLogic ? location : locationRef.current;
    if (!loc || !Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) return;
    setNavLogicCoords([
      { latitude: loc.lat, longitude: loc.lng },
      {
        latitude: nav.navigationData.destination.lat,
        longitude: nav.navigationData.destination.lng,
      },
    ]);
  }, [
    nav.isNavigating,
    nav.navigationData?.destination?.lat,
    nav.navigationData?.destination?.lng,
    navLogicEffective,
    trackOriginForNavLogic,
    trackOriginForNavLogic ? location?.lat : null,
    trackOriginForNavLogic ? location?.lng : null,
  ]);

  useEffect(() => {
    if (!nav.isNavigating) {
      setNavLogicCoords([]);
      setNavLogicRuntimeDisabled(false);
    }
  }, [nav.isNavigating]);

  const handleSdkRoutesLoaded = useCallback(
    (event: { nativeEvent: { routes: SdkRoutesNative } }) => {
      const routes = event.nativeEvent.routes;
      const poly = polylineFromSdkRoutes(routes);
      const mr = routes.mainRoute;
      if (poly.length >= 2 && mr && typeof mr.distance === 'number' && typeof mr.expectedTravelTime === 'number') {
        ingestSdkRoutePolyline(poly);
        // Pass the native routes payload through so `applySdkRouteGeometry`
        // can seed synthetic steps and kick off a background REST-Directions
        // hydration, restoring real maneuver types / lanes to the turn card
        // after an SDK reroute (native payload only carries geometry).
        nav.applySdkRouteGeometry(poly, mr.distance, mr.expectedTravelTime, routes);
      }
    },
    [nav.applySdkRouteGeometry],
  );

  /**
   * SDK `RouteVoiceController` plays turn-by-turn (Mapbox prosody on components like street names).
   * We only ingest for HUD / repeat-last; do not mirror with Expo `Speech.speak` — that doubled voices.
   */
  const handleSdkVoiceInstruction = useCallback((text?: string) => {
    const t = (text ?? '').trim();
    if (!t) return;
    ingestSdkVoiceSubtitle(t);
  }, []);

  const handleSdkFinalDestinationArrival = useCallback(() => {
    const dest = nav.navigationData?.destination;
    const progress = nav.navigationProgress;
    const sdkProgress = nav.sdkNavProgress;
    const remainingSec =
      progress?.durationRemainingSeconds ??
      sdkProgress?.durationRemaining ??
      null;
    const remainingMeters =
      progress?.distanceRemainingMeters ??
      sdkProgress?.distanceRemaining ??
      null;
    const matched = nav.sdkNavLocation;
    const lat =
      matched && Number.isFinite(matched.latitude)
        ? matched.latitude
        : nav.navigationProgressCoord.lat;
    const lng =
      matched && Number.isFinite(matched.longitude)
        ? matched.longitude
        : nav.navigationProgressCoord.lng;
    const crow =
      dest && Number.isFinite(dest.lat) && Number.isFinite(dest.lng) && Number.isFinite(lat) && Number.isFinite(lng)
        ? haversineMeters(lat, lng, dest.lat, dest.lng)
        : Number.POSITIVE_INFINITY;
    const timeNear =
      typeof remainingSec === 'number' &&
      Number.isFinite(remainingSec) &&
      remainingSec <= 180;
    const distanceNear =
      typeof remainingMeters === 'number' &&
      Number.isFinite(remainingMeters) &&
      remainingMeters <= 260;
    const physicallyAtDestination = crow <= 55;
    if (!physicallyAtDestination && (!timeNear || !distanceNear)) {
      if (__DEV__) {
        console.warn('[MapScreen] Ignored early SDK arrival callback', {
          remainingSec,
          remainingMeters,
          crow,
        });
      }
      return;
    }
    nav.completeNavigationAtDestination();
  }, [
    nav.navigationData?.destination?.lat,
    nav.navigationData?.destination?.lng,
    nav.navigationProgress,
    nav.sdkNavProgress,
    nav.sdkNavLocation,
    nav.navigationProgressCoord.lat,
    nav.navigationProgressCoord.lng,
    nav.completeNavigationAtDestination,
  ]);

  const sdkRouteHandoffTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sdkRouteHandoffUi, setSdkRouteHandoffUi] = useState(false);
  const handleSdkRouteChanged = useCallback(
    (event: { nativeEvent: { routes?: SdkRoutesNative } }) => {
      if (sdkRouteHandoffTimerRef.current) {
        clearTimeout(sdkRouteHandoffTimerRef.current);
        sdkRouteHandoffTimerRef.current = null;
      }
      setSdkRouteHandoffUi(true);
      ingestSdkRouteChangedEvent();
      const routes = event.nativeEvent.routes;
      if (!routes?.mainRoute) {
        sdkRouteHandoffTimerRef.current = setTimeout(() => {
          setSdkRouteHandoffUi(false);
          sdkRouteHandoffTimerRef.current = null;
        }, 1400);
        return;
      }
      const poly = polylineFromSdkRoutes(routes);
      const mr = routes.mainRoute;
      if (poly.length >= 2 && typeof mr.distance === 'number' && typeof mr.expectedTravelTime === 'number') {
        ingestSdkRoutePolyline(poly);
        nav.applySdkRouteGeometry(poly, mr.distance, mr.expectedTravelTime, routes);
      }
      sdkRouteHandoffTimerRef.current = setTimeout(() => {
        setSdkRouteHandoffUi(false);
        sdkRouteHandoffTimerRef.current = null;
      }, 1400);
    },
    [nav.applySdkRouteGeometry],
  );
  useEffect(
    () => () => {
      if (sdkRouteHandoffTimerRef.current) clearTimeout(sdkRouteHandoffTimerRef.current);
    },
    [],
  );

  /** During nav: single fused coord from `useDriveNavigation` (native matcher when logic SDK; JS snap otherwise). */
  const navDisplayCoordRaw = nav.isNavigating ? nav.navigationProgressCoord : location;
  const navDisplayHeading = nav.isNavigating ? nav.navigationDisplayHeading : heading;

  /**
   * Apple-Maps-style puck / route-split smoothing.
   *
   * The native SDK emits progress + matched-location samples at discrete
   * intervals (iOS ≈ 6–7 Hz throttled, Android roughly 1 Hz for
   * `routeProgress`). Feeding those samples straight into `MarkerView`
   * coordinates + `lineTrimOffset` produces a **stepped** puck and a
   * **visible snap** on the route polyline every tick. Apple Maps avoids
   * both by interpolating the along-route fraction at 60 fps between SDK
   * ticks — which is exactly what `useSmoothedNavFraction` does (RAF ease
   * with a ~180 ms time constant, snaps on reroute / off-route deltas).
   *
   * With the smoothed fraction in hand:
   *   - `RouteOverlay.fractionTraveled` drives the GPU-side
   *     `lineTrimOffset` → the polyline **slides** under the puck instead
   *     of rebuilding its GeoJSON.
   *   - `navDisplayCoord` is projected onto the polyline at the smoothed
   *     fraction → the puck / camera anchor / `CustomLocationProvider`
   *     point all ride on a single continuously-interpolated coordinate,
   *     matching the same physical point the route split uses.
   */
  /** Polyline for JS-only smoothing / tangents. Logic SDK trips: native store line only (no REST preview line). */
  const navPolylineForSmoothing = useMemo((): Coordinate[] | null => {
    if (navLogicEffective && nav.isNavigating) {
      const fromStore = nav.sdkRoutePolyline;
      if (fromStore.length >= 2) return fromStore;
      const fromProg = nav.navigationProgress?.routePolyline;
      if (fromProg && fromProg.length >= 2) return fromProg;
      return null;
    }
    const sdk = nav.navigationProgress?.routePolyline;
    if (sdk && sdk.length >= 2) return sdk;
    const rest = nav.navigationData?.polyline;
    if (rest && rest.length >= 2) return rest;
    return null;
  }, [
    navLogicEffective,
    nav.isNavigating,
    nav.sdkRoutePolyline,
    nav.navigationProgress?.routePolyline,
    nav.navigationData?.polyline,
  ]);
  const navPolylineLenMetersRaw = useMemo(
    () => (navPolylineForSmoothing && navPolylineForSmoothing.length >= 2 ? polylineLengthMeters(navPolylineForSmoothing) : 0),
    [navPolylineForSmoothing],
  );
  /** Headless SDK path targets native `fractionTraveled`; JS eases that scalar between native ticks. */
  const nativeFractionTraveled = nav.navigationProgress?.nativeFractionTraveled;
  const isNativeSdkPassThrough =
    nav.isNavigating &&
    nav.navigationProgress?.instructionSource === 'sdk' &&
    typeof nativeFractionTraveled === 'number';
  const navSnapshotCumMeters = nav.isNavigating
    ? nav.navigationProgress?.routeSplitSnap?.cumulativeMeters ??
      nav.navigationProgress?.displayCumulativeMeters ??
      0
    : 0;
  const targetFractionDerived =
    navPolylineLenMetersRaw > 1
      ? Math.max(0, Math.min(1, navSnapshotCumMeters / navPolylineLenMetersRaw))
      : 0;
  const targetFraction = isNativeSdkPassThrough
    ? Math.max(0, Math.min(1, nativeFractionTraveled))
    : targetFractionDerived;
  const stableNavTargetFractionRef = useRef(targetFraction);
  const navSpeedMpsForSmoothing =
    nav.sdkNavLocation?.speed ??
    nav.navigationProgress?.displayCoord?.speedMps ??
    speed * 0.44704;
  /** Matcher / NAV speed thinks we're creeping or stopped (~2.8 mph cutoff). */
  const stoppedForPuckSmoothing = navSpeedMpsForSmoothing < 1.25;
  /** Tight stationary band + raw GPS sanity — freezes eased fraction + suppresses phantom DR. */
  const freezeNavSmoothing =
    nav.isNavigating &&
    Number.isFinite(navSpeedMpsForSmoothing) &&
    navSpeedMpsForSmoothing <= 0.95 &&
    speed <= 2.5;
  /**
   * When we're slow/stopped, hold the NAV target arc-length unless the matcher
   * jumps a lot at once (geometry refresh / reroute). The old `< 6 m` gate let
   * phantom forward creep stack across ticks and drive the eased puck toward
   * the destination while the car was parked.
   */
  const NAV_STATIONARY_HOLD_MAX_DELTA_M = 60;
  const stabilizedTargetFraction = useMemo(() => {
    if (!nav.isNavigating || navPolylineLenMetersRaw <= 1) {
      stableNavTargetFractionRef.current = targetFraction;
      return targetFraction;
    }
    const prev = stableNavTargetFractionRef.current;
    const deltaMeters = Math.abs(targetFraction - prev) * navPolylineLenMetersRaw;
    const holdStoppedTarget =
      stoppedForPuckSmoothing &&
      deltaMeters < NAV_STATIONARY_HOLD_MAX_DELTA_M;
    if (freezeNavSmoothing || holdStoppedTarget) {
      return prev;
    }
    stableNavTargetFractionRef.current = targetFraction;
    return targetFraction;
  }, [nav.isNavigating, navPolylineLenMetersRaw, stoppedForPuckSmoothing, freezeNavSmoothing, targetFraction]);
  /**
   * Scale the "teleport" threshold by route length so it's always bounded
   * in *meters*, not percent. A fixed 2% threshold on a 100-mile route is
   * a 2-mile jump before we consider the delta big enough to snap — that's
   * a visible teleport. Conversely, on a 0.5 mile route 2% is 50 ft and
   * even normal reroute deltas snap.
   *
   * Policy: always snap on deltas ≥ 100 m of arc, but clamp the fraction
   * to [0.5%, 5%] so very short and very long routes stay sane.
   */
  const snapDeltaFraction =
    navPolylineLenMetersRaw > 1
      ? Math.max(0.005, Math.min(0.05, 100 / navPolylineLenMetersRaw))
      : 0.02;
  const smoothedFraction = useSmoothedNavFraction(stabilizedTargetFraction, nav.isNavigating, {
    /** Longer τ reduces polyline “creep” between matcher updates; Sport still settles fastest. */
    timeConstantMs: drivingMode === 'calm' ? 215 : drivingMode === 'sport' ? 168 : 195,
    snapDeltaFraction,
    enabled: true,
    freezeWhenStationary: freezeNavSmoothing || stoppedForPuckSmoothing,
  });
  /**
   * Has the nav pipeline actually produced real progress yet? Used to gate
   * `smoothedNavPuckCoord` below — without this check the smoothed fraction
   * is pinned to 0 during the pre-progress waiting window (SDK 'idle' /
   * first JS tick) and the puck teleports to `polyline[0]` (= the origin
   * coord that was sampled when the user tapped Navigate). If the user has
   * shifted even a few meters between preview and tapping Start, the puck
   * visibly moves to the stale origin instead of their live position.
   *
   * We consider progress "real" once *either* (a) we have a
   * `routeSplitSnap.cumulativeMeters` from the SDK / JS progress that's
   * non-trivial relative to GPS noise (> 1 m), or (b) we've already seen
   * at least one displayCoord update (the progress object itself is not
   * null and has a valid displayCoord). Before that, we pass through the
   * raw navigation progress coord (which already falls back to the
   * smoothed GPS from `useLocation`).
   */
  const hasRealNavProgress = useMemo(() => {
    if (!nav.isNavigating) return false;
    const p = nav.navigationProgress;
    if (!p) return false;
    // SDK-waiting is a pre-location stub: displayCoord = polyline[0], cum = 0.
    // Don't let the smoothed puck fall into the origin vertex until a real
    // match arrives from either the SDK ('sdk') or the JS pipeline ('js').
    if (p.instructionSource === 'sdk_waiting') return false;
    return true;
  }, [nav.isNavigating, nav.navigationProgress?.instructionSource]);
  const smoothedNavPuckCoord = useMemo(() => {
    if (!nav.isNavigating) return null;
    if (!hasRealNavProgress) return null;
    if (!navPolylineForSmoothing || navPolylineForSmoothing.length < 2) return null;
    if (navPolylineLenMetersRaw <= 0) return null;
    return coordinateAtCumulativeMeters(
      navPolylineForSmoothing,
      smoothedFraction * navPolylineLenMetersRaw,
    );
  }, [
    nav.isNavigating,
    hasRealNavProgress,
    navPolylineForSmoothing,
    navPolylineLenMetersRaw,
    smoothedFraction,
  ]);

  /**
   * Pre-stabilizer candidate. The published {@link navDisplayCoord} below
   * runs this through {@link resolvePuckCoordSync} which:
   *   - holds the last anchor when the device is stationary (red light,
   *     parking) so native matched-coord wobble can't visibly drift the
   *     puck while the car is parked,
   *   - leashes the matched coord to the user's smoothed GPS so a
   *     phantom snap to a parallel road can never carry the puck off the
   *     user's true position.
   */
  const navDisplayCoordCandidate = smoothedNavPuckCoord ?? navDisplayCoordRaw;

  /**
   * Route-snap input for the render path. This intentionally uses the
   * already-selected display candidate instead of raw SDK lat/lng so the
   * visible puck/camera/route split do not alternate between uneased matcher
   * ticks and the RAF-smoothed along-route point.
   */
  const navMatchedRaw = useMemo<Coordinate | null>(() => {
    if (
      navDisplayCoordCandidate &&
      Number.isFinite(navDisplayCoordCandidate.lat) &&
      Number.isFinite(navDisplayCoordCandidate.lng)
    ) {
      return { lat: navDisplayCoordCandidate.lat, lng: navDisplayCoordCandidate.lng };
    }
    return null;
  }, [navDisplayCoordCandidate.lat, navDisplayCoordCandidate.lng]);

  /**
   * Snap the matched coord onto the active route polyline. When inside
   * the corridor we publish the **snapped** point — the puck visibly
   * rides the drawn line. When outside we keep the matched coord and
   * let the GPS-leash inside `resolvePuckCoordSync` handle phantom
   * snaps. `null` means we have no usable polyline yet (pre-route or
   * waiting state).
   */
  const navRouteSnap = useMemo(() => {
    if (!nav.isNavigating) return null;
    if (!navPolylineForSmoothing || navPolylineForSmoothing.length < 2) return null;
    if (!navMatchedRaw) return null;
    return snapPuckToRoute(navMatchedRaw, navPolylineForSmoothing, {
      accuracyM: accuracy ?? null,
      tangentLookAheadM: 10,
    });
  }, [nav.isNavigating, navPolylineForSmoothing, navMatchedRaw, accuracy]);

  /**
   * Stationary lock + true-location leash. Refs hold cross-render state
   * for {@link updateStationaryLock}; the published values below come
   * from pure `resolvePuckCoordSync` / `resolvePuckHeadingSync` calls.
   */
  const stationaryLockRef = useRef(INITIAL_STATIONARY_LOCK);
  const lastPublishedPuckCoordRef = useRef<Coordinate | null>(null);
  const lastPublishedPuckHeadingRef = useRef<number | null>(null);
  /** Cross-render state for {@link stabilizeDisplayPosition} (final puck/camera point). */
  const navDisplayPositionRef = useRef(INITIAL_DISPLAY_POSITION_STATE);

  const navStablePuck = useMemo(() => {
    const nowMs = Date.now();
    const speedMphSmoothed = Number.isFinite(speed) ? speed : 0;
    const sdkSpeedMps =
      typeof nav.sdkNavLocation?.speed === 'number' && Number.isFinite(nav.sdkNavLocation.speed)
        ? nav.sdkNavLocation.speed
        : nav.navigationProgress?.displayCoord?.speedMps ?? speedMphSmoothed * 0.44704;
    const trueLoc =
      Number.isFinite(location.lat) && Number.isFinite(location.lng)
        ? { lat: location.lat, lng: location.lng }
        : null;

    /**
     * Route-snapped point if available, else the smoothed/raw candidate.
     * The snap is the *only* way to publish a coord that lies on the
     * drawn polyline; falling through to candidate handles the brief
     * pre-match window before the SDK reports its first matched fix.
     */
    const routeGlued = shouldGluePuckToRoute(navRouteSnap);
    const offRoute = Boolean(nav.navigationProgress?.isOffRoute);
    /**
     * When glued, prefer the **smoothed along-route** point (same arc length
     * basis as `fractionTraveled` / `lineTrimOffset`). Orthogonal GPS→polyline
     * snap can sit several meters “aside” of that arc on curves, which makes
     * the puck drift from the colored/gray seam and feel laggy.
     */
    const smoothedOnRoute =
      Boolean(smoothedNavPuckCoord) &&
      !offRoute &&
      Number.isFinite(smoothedNavPuckCoord!.lat) &&
      Number.isFinite(smoothedNavPuckCoord!.lng);
    const matched: Coordinate | null =
      routeGlued && smoothedOnRoute && smoothedNavPuckCoord
        ? smoothedNavPuckCoord
        : routeGlued
          ? navRouteSnap!.snappedCoord
          : navMatchedRaw ??
            (navDisplayCoordCandidate &&
            Number.isFinite(navDisplayCoordCandidate.lat) &&
            Number.isFinite(navDisplayCoordCandidate.lng)
              ? { lat: navDisplayCoordCandidate.lat, lng: navDisplayCoordCandidate.lng }
              : null);

    /**
     * Heading: vehicle course first (chevron tracks real yaw). Route tangent is
     * consulted inside {@link resolveRouteHeadingCandidate} only when course and
     * geometry disagree sharply (fork / matcher confusion).
     */
    const sdkCourseDeg =
      typeof navDisplayHeading === 'number' && Number.isFinite(navDisplayHeading)
        ? navDisplayHeading
        : null;
    const snapForHeading =
      smoothedOnRoute && navPolylineForSmoothing && smoothedNavPuckCoord
        ? snapPuckToRoute(smoothedNavPuckCoord, navPolylineForSmoothing, {
            accuracyM: accuracy ?? null,
            tangentLookAheadM: 10,
          })
        : navRouteSnap;
    const headingCandidate = nav.isNavigating
      ? resolveRouteHeadingCandidate({
          snap: snapForHeading,
          sdkCourseDeg,
          speedMps: sdkSpeedMps,
        })
      : sdkCourseDeg;

    const nextLock = nav.isNavigating
      ? updateStationaryLock(stationaryLockRef.current, {
          speedMph: speedMphSmoothed,
          rawSpeedMps: sdkSpeedMps,
          matched,
          trueLoc,
          heading: typeof headingCandidate === 'number' && Number.isFinite(headingCandidate)
            ? headingCandidate
            : null,
          nowMs,
          /**
           * When we have a route-snapped point, freeze to *that* — the
           * exact spot on the line — not whatever the upstream candidate
           * happens to be. This is what makes the parked puck stay
           * pinned on the polyline instead of creeping during dwell.
           */
          anchorOverride:
            routeGlued && smoothedOnRoute && smoothedNavPuckCoord
              ? smoothedNavPuckCoord
              : routeGlued
                ? navRouteSnap!.snappedCoord
                : null,
        })
      : INITIAL_STATIONARY_LOCK;
    stationaryLockRef.current = nextLock;

    const stabilizedCoord = resolvePuckCoordSync({
      matched,
      trueLoc,
      prevPublished: lastPublishedPuckCoordRef.current,
      lock: nextLock,
      accuracyM: accuracy ?? null,
      lockToMatched: routeGlued && !offRoute,
    });

    const stabilizedHeading = nav.isNavigating
      ? resolvePuckHeadingSync({
          candidate:
            typeof headingCandidate === 'number' && Number.isFinite(headingCandidate)
              ? headingCandidate
              : null,
          prevHeading: lastPublishedPuckHeadingRef.current,
          speedMph: speedMphSmoothed,
          lock: nextLock,
        })
      : typeof headingCandidate === 'number' && Number.isFinite(headingCandidate)
        ? headingCandidate
        : null;

    if (stabilizedCoord) lastPublishedPuckCoordRef.current = stabilizedCoord;
    if (typeof stabilizedHeading === 'number' && Number.isFinite(stabilizedHeading)) {
      lastPublishedPuckHeadingRef.current = stabilizedHeading;
    }

    return {
      coord: stabilizedCoord ?? navDisplayCoordCandidate,
      heading:
        typeof stabilizedHeading === 'number' && Number.isFinite(stabilizedHeading)
          ? stabilizedHeading
          : navDisplayHeading,
      locked: nextLock.locked,
      /** True when the upstream candidate came from a route projection. */
      glued: routeGlued,
    };
  }, [
    nav.isNavigating,
    navDisplayCoordCandidate.lat,
    navDisplayCoordCandidate.lng,
    navDisplayHeading,
    navMatchedRaw,
    navRouteSnap,
    smoothedNavPuckCoord?.lat,
    smoothedNavPuckCoord?.lng,
    nav.navigationProgress?.isOffRoute,
    location.lat,
    location.lng,
    speed,
    accuracy,
    nav.sdkNavLocation?.speed,
    nav.navigationProgress?.displayCoord?.speedMps,
  ]);

  /** Fused ground speed for nav camera + display-position filter (matches `useCameraController` input). */
  const fusedSpeedMpsNav =
    nav.isNavigating
      ? Math.max(0, nav.fusedNavState?.displayCoord?.speedMps ?? speed * 0.44704)
      : null;

  useEffect(() => {
    if (!nav.isNavigating) {
      navDisplayPositionRef.current = INITIAL_DISPLAY_POSITION_STATE;
    }
  }, [nav.isNavigating]);

  /**
   * Single display position for puck, camera anchor, and route overlay while navigating:
   * {@link navStablePuck} (leash + stationary lock) then {@link stabilizeDisplayPosition}
   * (sub‑5 m dead zone + short ease + reroute snap). Browse mode uses the stable puck path
   * which already tracks smoothed `useLocation`.
   */
  const navDisplayCoord = useMemo((): Coordinate => {
    const fromStable =
      navStablePuck.coord &&
      Number.isFinite(navStablePuck.coord.lat) &&
      Number.isFinite(navStablePuck.coord.lng)
        ? { lat: navStablePuck.coord.lat, lng: navStablePuck.coord.lng }
        : navDisplayCoordCandidate &&
            Number.isFinite(navDisplayCoordCandidate.lat) &&
            Number.isFinite(navDisplayCoordCandidate.lng)
          ? { lat: navDisplayCoordCandidate.lat, lng: navDisplayCoordCandidate.lng }
          : null;

    if (!nav.isNavigating) {
      if (fromStable) return fromStable;
      return { lat: location.lat, lng: location.lng };
    }

    if (
      !fromStable ||
      !Number.isFinite(fromStable.lat) ||
      !Number.isFinite(fromStable.lng) ||
      (Math.abs(fromStable.lat) < 1e-7 && Math.abs(fromStable.lng) < 1e-7)
    ) {
      return { lat: Number.NaN, lng: Number.NaN };
    }

    const spd =
      fusedSpeedMpsNav != null && Number.isFinite(fusedSpeedMpsNav) ? fusedSpeedMpsNav : 0;
    const next = stabilizeDisplayPosition({
      candidate: fromStable,
      prev: navDisplayPositionRef.current,
      speedMps: spd,
      accuracyM: accuracy ?? null,
      nowMs: Date.now(),
    });
    navDisplayPositionRef.current = next;
    return next.coord ?? fromStable;
  }, [
    nav.isNavigating,
    navStablePuck.coord?.lat,
    navStablePuck.coord?.lng,
    navDisplayCoordCandidate.lat,
    navDisplayCoordCandidate.lng,
    fusedSpeedMpsNav,
    accuracy,
    location.lat,
    location.lng,
  ]);
  /** True iff the stationary lock is currently engaged (frozen puck). */
  const navPuckStationary = navStablePuck.locked;

  /** POI / offers / incidents fetches use route-snapped position while navigating so pins stay near the corridor. */
  const poiSearchCoord = useMemo(() => {
    if (nav.isNavigating && navLogicEffective) {
      if (
        Number.isFinite(navDisplayCoord.lat) &&
        Number.isFinite(navDisplayCoord.lng) &&
        !(Math.abs(navDisplayCoord.lat) < 1e-6 && Math.abs(navDisplayCoord.lng) < 1e-6)
      ) {
        return { lat: navDisplayCoord.lat, lng: navDisplayCoord.lng };
      }
      if (nav.sdkNavLocation) {
        return { lat: nav.sdkNavLocation.latitude, lng: nav.sdkNavLocation.longitude };
      }
      if (nav.sdkRoutePolyline.length >= 2) {
        const o = nav.sdkRoutePolyline[0]!;
        return { lat: o.lat, lng: o.lng };
      }
    }
    if (
      nav.isNavigating &&
      Number.isFinite(navDisplayCoord.lat) &&
      Number.isFinite(navDisplayCoord.lng) &&
      !(Math.abs(navDisplayCoord.lat) < 1e-6 && Math.abs(navDisplayCoord.lng) < 1e-6)
    ) {
      return { lat: navDisplayCoord.lat, lng: navDisplayCoord.lng };
    }
    return { lat: location.lat, lng: location.lng };
  }, [
    navLogicEffective,
    nav.isNavigating,
    nav.sdkNavLocation,
    nav.sdkRoutePolyline,
    navDisplayCoord.lat,
    navDisplayCoord.lng,
    location.lat,
    location.lng,
  ]);

  /**
   * Chevron / camera bearing during navigation. The stabilizer above
   * ({@link navStablePuck.heading}) is now the single source of truth on
   * **all** nav paths — it consumes a tangent-aware candidate via
   * `resolveHeadingCandidate`, holds frozen during the stationary lock,
   * and rate-limits any single-tick flip. We keep the JS-only blend as
   * a belt-and-suspenders fallback for legacy mode where the route-snap
   * may be skipped (e.g. polyline temporarily missing).
   */
  const navPuckHeading = useMemo(() => {
    if (!nav.isNavigating) return navDisplayHeading;
    if (navLogicEffective) return navStablePuck.heading;
    if (isNativeSdkPassThrough) return navStablePuck.heading;
    if (navStablePuck.glued) return navStablePuck.heading;
    const poly = navPolylineForSmoothing;
    const cum = navSnapshotCumMeters;
    if (!poly || poly.length < 2) return navStablePuck.heading;
    const tangent = tangentBearingAlongPolyline(poly, cum, 22);
    if (tangent == null || !Number.isFinite(tangent)) return navStablePuck.heading;
    const spd =
      nav.fusedNavState?.displayCoord?.speedMps ??
      nav.navigationProgress?.displayCoord?.speedMps ??
      (typeof nav.sdkNavLocation?.speed === 'number' ? nav.sdkNavLocation.speed : -1);
    const sdkH = navDisplayHeading;
    const stepped =
      spd >= 0 && spd < 0.65
        ? clampStepTowardDeg(sdkH, tangent, 22)
        : clampStepTowardDeg(sdkH, tangent, 52);
    return navPuckStationary ? navStablePuck.heading : stepped;
  }, [
    nav.isNavigating,
    navPolylineForSmoothing,
    navSnapshotCumMeters,
    navDisplayHeading,
    navLogicEffective,
    nav.fusedNavState?.displayCoord?.speedMps,
    nav.navigationProgress?.displayCoord?.speedMps,
    nav.sdkNavLocation?.speed,
    isNativeSdkPassThrough,
    navStablePuck.heading,
    navStablePuck.glued,
    navPuckStationary,
  ]);

  const poiSearchCoordRef = useRef(poiSearchCoord);
  useEffect(() => {
    poiSearchCoordRef.current = poiSearchCoord;
  }, [poiSearchCoord.lat, poiSearchCoord.lng]);

  /**
   * Single-authority predicates for the three UI surfaces the native Mapbox Navigation
   * SDK owns during a hybrid trip: puck, route polyline, and turn banner. They flip on
   * only after the corresponding native payload has landed (matched location, route
   * geometry, banner text) so the UI never shows a half-native / half-JS frame during
   * the first ~150 ms of a trip. `useDriveNavigation` uses `useSyncExternalStore(subscribeNavSdk, …)`;
   * high-frequency progress/location ingests are coalesced in `navSdkStore` to one React update
   * per frame so the map shell is not thrashed on every native tick.
   */
  const sdkPuckOwns = nav.isNavigating && isSdkPuckAuthoritative();
  const sdkRouteOwns = nav.isNavigating && isSdkRouteAuthoritative();
  const sdkBannerOwns = nav.isNavigating && isSdkBannerAuthoritative();

  /** Holds last ≥2-point route through transient SDK/REST handoffs (state updates, not render). */
  const [stickyRoutePolyline, setStickyRoutePolyline] = useState<Coordinate[] | null>(null);
  useEffect(() => {
    if (!nav.isNavigating) {
      setStickyRoutePolyline(null);
      return;
    }
    if (navLogicEffective) {
      const fromStore = nav.sdkRoutePolyline;
      const fromProg = nav.navigationProgress?.routePolyline;
      const next =
        fromStore.length >= 2 ? fromStore : fromProg && fromProg.length >= 2 ? fromProg : null;
      if (next) setStickyRoutePolyline(next);
      return;
    }
    const sdk = nav.navigationProgress?.routePolyline;
    const rest = nav.navigationData?.polyline;
    const next = sdk && sdk.length >= 2 ? sdk : rest && rest.length >= 2 ? rest : null;
    if (next) setStickyRoutePolyline(next);
  }, [
    navLogicEffective,
    nav.isNavigating,
    nav.sdkRoutePolyline,
    nav.navigationProgress?.routePolyline,
    nav.navigationData?.polyline,
  ]);

  const polylineToRender = useMemo((): Coordinate[] | null => {
    if (navLogicEffective && nav.isNavigating) {
      const fromStore = nav.sdkRoutePolyline;
      if (fromStore.length >= 2) return fromStore;
      const fromProg = nav.navigationProgress?.routePolyline;
      if (fromProg && fromProg.length >= 2) return fromProg;
      return stickyRoutePolyline;
    }
    const sdk = nav.navigationProgress?.routePolyline;
    const rest = nav.navigationData?.polyline;
    if (isNativeSdkPassThrough) {
      if (sdk && sdk.length >= 2) return sdk;
      return stickyRoutePolyline;
    }
    if (sdkRouteOwns) {
      if (sdk && sdk.length >= 2) return sdk;
      return stickyRoutePolyline;
    }
    if (sdk && sdk.length >= 2) return sdk;
    if (rest && rest.length >= 2) return rest;
    return stickyRoutePolyline;
  }, [
    navLogicEffective,
    nav.isNavigating,
    nav.sdkRoutePolyline,
    isNativeSdkPassThrough,
    sdkRouteOwns,
    nav.navigationProgress?.routePolyline,
    nav.navigationData?.polyline,
    stickyRoutePolyline,
  ]);

  /**
   * `routeModelRefreshKey` bumps on many JS-only model updates; including it in
   * `RouteOverlay`'s React `key` remounts the whole line every time → visible
   * flicker. While navigating, key only by this trip's destination; preview
   * still uses the refresh key so alternate routes re-mount correctly.
   */
  const routeOverlayLineKey = useMemo(() => {
    if (nav.isNavigating && nav.navigationData?.destination) {
      const d = nav.navigationData.destination;
      if (Number.isFinite(d.lat) && Number.isFinite(d.lng)) {
        return `line-${d.lat.toFixed(4)}-${d.lng.toFixed(4)}`;
      }
    }
    return `line-rmk-${nav.routeModelRefreshKey}`;
  }, [
    nav.isNavigating,
    nav.navigationData?.destination?.lat,
    nav.navigationData?.destination?.lng,
    nav.routeModelRefreshKey,
  ]);

  /**
   * Route split geometry consumes the **same smoothed arc position** as the
   * puck. This avoids the dot riding one point while the blue/gray seam uses
   * another, and also keeps the line visible on native builds where
   * `lineTrimOffset` can intermittently hide the whole route after Start.
   *
   * Native ShapeSource updates are expensive, so the split sent to RouteOverlay
   * is decimated below the visible puck radius while the puck/camera keep reading the
   * full RAF-smoothed fraction. That keeps the gray trail visually attached
   * to the puck without a visible break at the seam.
   */
  const polylineToRenderLenMeters = useMemo(
    () => (polylineToRender && polylineToRender.length >= 2 ? polylineLengthMeters(polylineToRender) : 0),
    [polylineToRender],
  );
  const routeOverlayCumMeters = useMemo(() => {
    if (!nav.isNavigating || !polylineToRender || polylineToRenderLenMeters <= 1) return 0;
    const stepM = drivingMode === 'sport' ? 0.45 : drivingMode === 'adaptive' ? 0.55 : 0.65;
    const rawMeters = smoothedFraction * polylineToRenderLenMeters;
    const meters = Math.max(0, Math.min(polylineToRenderLenMeters, rawMeters));
    return Math.max(0, Math.min(polylineToRenderLenMeters, Math.round(meters / stepM) * stepM));
  }, [nav.isNavigating, polylineToRender, polylineToRenderLenMeters, drivingMode, smoothedFraction]);
  const navigationRouteSplit = useMemo((): RouteSplitForOverlay | null => {
    if (!nav.isNavigating) return null;
    if (polylineToRender && polylineToRender.length >= 2) {
      const st = polylineToRenderLenMeters > 1
        ? segmentAndTFromCumAlongPolyline(routeOverlayCumMeters, polylineToRender)
        : null;
      if (st) return { segmentIndex: st.segmentIndex, tOnSegment: st.tOnSegment };
    }
    const s = nav.navigationProgress?.routeSplitSnap ?? nav.navigationProgress?.snapped;
    if (!s) return null;
    return { segmentIndex: s.segmentIndex, tOnSegment: s.t };
  }, [
    nav.isNavigating,
    polylineToRender,
    polylineToRenderLenMeters,
    routeOverlayCumMeters,
    nav.navigationProgress?.routeSplitSnap?.segmentIndex,
    nav.navigationProgress?.routeSplitSnap?.t,
    nav.navigationProgress?.snapped?.segmentIndex,
    nav.navigationProgress?.snapped?.t,
  ]);
  const displaySpeedMph = useMemo(() => {
    if (!nav.isNavigating) return speed;
    if (navLogicEffective) {
      const mps =
        nav.sdkNavLocation?.speed ?? nav.navigationProgress?.displayCoord?.speedMps ?? null;
      if (typeof mps === 'number' && Number.isFinite(mps) && mps >= 0) {
        return Math.max(0, mps * 2.236936);
      }
      return 0;
    }
    return Math.max(0, (nav.fusedNavState?.displayCoord?.speedMps ?? speed * 0.44704) * 2.236936);
  }, [
    nav.isNavigating,
    nav.sdkNavLocation?.speed,
    nav.navigationProgress?.displayCoord?.speedMps,
    nav.fusedNavState?.displayCoord?.speedMps,
    speed,
    navLogicEffective,
  ]);

  /**
   * LocationPuck beam: with CustomLocationProvider we pass a single `heading` — native `course` mode
   * reads GPS COG and fights that value. Use `heading` whenever custom coords are injected.
   */
  const locationPuckBearing = useMemo((): 'heading' | 'course' => {
    const sdkNav = navLogicEffective;
    const customLocationActive =
      nav.isNavigating && ((sdkNav && nav.sdkNavLocation) || !sdkNav);
    if (customLocationActive) return 'heading';
    return displaySpeedMph > 10 ? 'course' : 'heading';
  }, [nav.isNavigating, nav.sdkNavLocation, displaySpeedMph, navLogicEffective]);

  const navFetchRef = useRef(nav.fetchDirections);
  const navSetDestRef = useRef(nav.setSelectedDestination);
  useEffect(() => {
    navFetchRef.current = nav.fetchDirections;
    navSetDestRef.current = nav.setSelectedDestination;
  }, [nav.fetchDirections, nav.setSelectedDestination]);

  usePassiveDriveGems({
    enabled: Boolean(user?.id),
    mapFocused: true,
    isNavigating: nav.isNavigating,
    location,
    speedMph: speed,
    gpsAccuracyM: accuracy ?? null,
    tripFuelContextRef,
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
  /** User tapped recenter — forces the next follow `setCamera` even if follow was already locked. */
  const [navFollowKick, setNavFollowKick] = useState(0);
  /** Single distance field for maneuver-aware presets (must match banner/speech). */
  const nextManeuverDistanceMeters = useMemo(() => {
    if (isNativeSdkPassThrough) {
      const d = nav.navigationProgress?.nextStepDistanceMeters;
      if (d != null && Number.isFinite(d)) return d;
      return Math.max(0, nav.navigationProgress?.banner?.primaryDistanceMeters ?? 0);
    }
    const d = nav.navigationProgress?.nextStepDistanceMeters;
    if (nav.isNavigating && d != null && Number.isFinite(d)) return d;
    return getDistanceToUpcomingManeuverMeters(
      nav.navigationData?.steps,
      nav.currentStepIndex,
      navDisplayCoord,
      nav.navigationData?.polyline,
    );
  }, [
    isNativeSdkPassThrough,
    nav.isNavigating,
    nav.navigationProgress?.nextStepDistanceMeters,
    nav.navigationProgress?.banner?.primaryDistanceMeters,
    nav.navigationData?.steps,
    nav.navigationData?.polyline,
    nav.currentStepIndex,
    navDisplayCoord.lat,
    navDisplayCoord.lng,
  ]);

  const headlessNavSpeedMps = useMemo(
    () =>
      nav.isNavigating && fusedSpeedMpsNav != null && Number.isFinite(fusedSpeedMpsNav)
        ? fusedSpeedMpsNav
        : Math.max(0, speed * 0.44704),
    [nav.isNavigating, fusedSpeedMpsNav, speed],
  );
  const headlessNativeFollowFraming = useMemo(
    () => ({
      sp: bucketSpeedMpsTo5Mph(headlessNavSpeedMps),
      d: maneuverDistanceBucketMeters(nextManeuverDistanceMeters),
    }),
    [headlessNavSpeedMps, nextManeuverDistanceMeters],
  );
  const navLogicFollowingZoom = useMemo(
    () => getNativeHeadlessFollowingZoom(drivingMode, headlessNativeFollowFraming.sp, headlessNativeFollowFraming.d),
    [drivingMode, headlessNativeFollowFraming.sp, headlessNativeFollowFraming.d],
  );
  const navLogicFollowingPitch = useMemo(
    () => getNativeHeadlessFollowingPitch(drivingMode, headlessNativeFollowFraming.sp, headlessNativeFollowFraming.d),
    [drivingMode, headlessNativeFollowFraming.sp, headlessNativeFollowFraming.d],
  );

  /**
   * Follow-camera anchor: slightly ahead of the puck along course (`CustomLocationProvider`).
   * RN `Camera` is always JS-led; native Navigation SDK still owns reroute + matcher + voice.
   */
  const cameraLeadCoord = useMemo(() => {
    if (!nav.isNavigating || !Number.isFinite(navDisplayCoord.lat) || !Number.isFinite(navDisplayCoord.lng)) {
      return null;
    }
    const sp = fusedSpeedMpsNav ?? 0;
    const ahead = getLookAheadMeters(drivingMode, sp, nextManeuverDistanceMeters);
    if (ahead < 4) return null;
    if (
      navPolylineForSmoothing &&
      navPolylineForSmoothing.length >= 2 &&
      navPolylineLenMetersRaw > 0 &&
      Number.isFinite(smoothedFraction)
    ) {
      const p = coordinateAtCumulativeMeters(
        navPolylineForSmoothing,
        Math.min(navPolylineLenMetersRaw, smoothedFraction * navPolylineLenMetersRaw + ahead),
      );
      if (p && Number.isFinite(p.lat) && Number.isFinite(p.lng)) return p;
    }
    const h = Number.isFinite(navPuckHeading) ? navPuckHeading : heading;
    if (!Number.isFinite(h)) return null;
    const p = projectAhead(navDisplayCoord.lat, navDisplayCoord.lng, h, ahead);
    return { lat: p.latitude, lng: p.longitude };
  }, [
    nav.isNavigating,
    drivingMode,
    fusedSpeedMpsNav,
    nextManeuverDistanceMeters,
    navPolylineForSmoothing,
    navPolylineLenMetersRaw,
    smoothedFraction,
    navDisplayCoord.lat,
    navDisplayCoord.lng,
    navPuckHeading,
    heading,
  ]);

  const camCtrlForNav = useCameraController({
    speedMph: speed,
    fusedSpeedMps: fusedSpeedMpsNav,
    drivingMode,
    isNavigating: nav.isNavigating,
    cameraLocked,
    nextManeuverDistanceMeters,
    safeAreaTop: insets.top,
    safeAreaBottom: insets.bottom,
    /** Native camera mirror fights JS `setCamera` follow; keep matcher/reroute native, framing RN-only. */
    nativeCameraState: null,
    isNativeMirror: false,
  });

  const userInteracting = useRef(false);
  const lastCameraUpdate = useRef({ lat: 0, lng: 0, heading: 0 });
  const wasNavigatingForOdomRef = useRef(false);
  useEffect(() => {
    if (
      nav.isNavigating &&
      !wasNavigatingForOdomRef.current &&
      Number.isFinite(navDisplayCoord.lat) &&
      Number.isFinite(navDisplayCoord.lng)
    ) {
      lastCameraUpdate.current = {
        lat: navDisplayCoord.lat,
        lng: navDisplayCoord.lng,
        heading: navPuckHeading,
      };
    }
    wasNavigatingForOdomRef.current = nav.isNavigating;
  }, [nav.isNavigating, navDisplayCoord.lat, navDisplayCoord.lng, navPuckHeading]);

  const camCtrlRef = useRef(camCtrlForNav);
  camCtrlRef.current = camCtrlForNav;
  const navCameraAnchorLat = cameraLeadCoord?.lat ?? navDisplayCoord.lat;
  const navCameraAnchorLng = cameraLeadCoord?.lng ?? navDisplayCoord.lng;
  const navFollowZoomLevel = camCtrlForNav?.followZoomLevel;
  const navFollowPitch = camCtrlForNav?.followPitch;
  const navFollowPadTop = camCtrlForNav?.followPadding?.paddingTop;
  const navFollowPadBottom = camCtrlForNav?.followPadding?.paddingBottom;
  const navFollowPadLeft = camCtrlForNav?.followPadding?.paddingLeft;
  const navFollowPadRight = camCtrlForNav?.followPadding?.paddingRight;
  const navCameraAnimationDuration = camCtrlForNav?.animationDuration;
  const navCameraFollowTuning = useMemo(
    () => getNavCameraFollowTuning(drivingMode, fusedSpeedMpsNav ?? 0, nextManeuverDistanceMeters),
    [drivingMode, fusedSpeedMpsNav, nextManeuverDistanceMeters],
  );
  const navFallbackPad = useMemo(
    () => navFallbackFollowPadding(modeConfig, insets.bottom),
    [modeConfig, insets.bottom],
  );
  /** One instant snap per `navCameraSessionKey` — avoids ease fighting the remounted Camera + duplicate flyTo. */
  const lastNavCamSessionBootstrappedRef = useRef(-1);
  const lastNavCameraCommandRef = useRef<{
    lat: number;
    lng: number;
    heading: number | null;
    zoom: number;
    pitch: number;
    at: number;
  } | null>(null);
  /**
   * While navigating, `followUserLocation` uses Mapbox's internal GPS — not
   * `CustomLocationProvider` — which fights the snapped puck (camera feels offset).
   * JS `useCameraController` + lookahead drives **camera center only** (`setCamera`); the
   * provider + `NavSdkPuck` stay on `navDisplayCoord`. Native SDK keeps reroute, matcher, voice.
   */
  useEffect(() => {
    if (!nav.isNavigating || !cameraLocked || navFollowZoomLevel == null || navFollowPitch == null) return;
    const cam = cameraRef.current;
    if (!cam?.setCamera) return;
    const anchor = { lat: navCameraAnchorLat, lng: navCameraAnchorLng };
    if (!Number.isFinite(anchor.lat) || !Number.isFinite(anchor.lng)) return;
    const last = lastNavCameraCommandRef.current;
    const stoppedForCamera = (fusedSpeedMpsNav ?? 0) < 1.05;
    const h =
      stoppedForCamera && last?.heading != null
        ? last.heading
        : Number.isFinite(navPuckHeading)
          ? navPuckHeading
          : heading;
    const headingDeg = Number.isFinite(h) ? ((h % 360) + 360) % 360 : null;
    const zoom = Math.max(3, Math.min(22, Number.isFinite(navFollowZoomLevel) ? navFollowZoomLevel! : modeConfig.navZoom));
    const pitch = Math.max(0, Math.min(80, Number.isFinite(navFollowPitch) ? navFollowPitch! : modeConfig.navPitch));
    const pad = {
      paddingTop: navFollowPadTop ?? navFallbackPad.paddingTop,
      paddingBottom: navFollowPadBottom ?? navFallbackPad.paddingBottom,
      paddingLeft: navFollowPadLeft ?? navFallbackPad.paddingLeft,
      paddingRight: navFollowPadRight ?? navFallbackPad.paddingRight,
    };
    const cleanPad = {
      paddingTop: Math.max(0, Math.min(900, Number.isFinite(pad.paddingTop) ? pad.paddingTop : 0)),
      paddingBottom: Math.max(0, Math.min(900, Number.isFinite(pad.paddingBottom) ? pad.paddingBottom : 0)),
      paddingLeft: Math.max(0, Math.min(240, Number.isFinite(pad.paddingLeft) ? pad.paddingLeft : 0)),
      paddingRight: Math.max(0, Math.min(240, Number.isFinite(pad.paddingRight) ? pad.paddingRight : 0)),
    };
    const isNewNavSession = lastNavCamSessionBootstrappedRef.current !== navCameraSessionKey;
    if (isNewNavSession) lastNavCamSessionBootstrappedRef.current = navCameraSessionKey;
    const now = Date.now();
    const movedM = last ? haversineMeters(last.lat, last.lng, anchor.lat, anchor.lng) : Infinity;
    const headingDelta =
      last?.heading != null && headingDeg != null
        ? Math.abs(((headingDeg - last.heading + 540) % 360) - 180)
        : Infinity;
    const shouldIssueCameraCommand = shouldIssueNavCameraFollowCommand({
      isNewSession: isNewNavSession,
      elapsedMs: last ? now - last.at : Number.POSITIVE_INFINITY,
      movedMeters: movedM,
      headingDeltaDeg: headingDelta,
      zoomDelta: last ? Math.abs(last.zoom - zoom) : Number.POSITIVE_INFINITY,
      pitchDelta: last ? Math.abs(last.pitch - pitch) : Number.POSITIVE_INFINITY,
      stopped: stoppedForCamera,
      tuning: navCameraFollowTuning,
    });
    if (!shouldIssueCameraCommand) return;
    const animationDuration = isNewNavSession
      ? 0
      : Math.max(
          stoppedForCamera ? 180 : 95,
          Math.min(
            stoppedForCamera ? 380 : 260,
            Math.min(
              Number.isFinite(navCameraAnimationDuration) ? navCameraAnimationDuration! : 420,
              navCameraFollowTuning.animationDurationMs,
            ),
          ),
        );
    lastNavCameraCommandRef.current = {
      lat: anchor.lat,
      lng: anchor.lng,
      heading: headingDeg,
      zoom,
      pitch,
      at: now,
    };
    const cameraCommand = {
      centerCoordinate: [anchor.lng, anchor.lat],
      zoomLevel: zoom,
      pitch,
      ...(headingDeg != null ? { heading: headingDeg } : {}),
      padding: cleanPad,
      animationMode: 'easeTo',
      animationDuration,
    };
    try {
      cam.setCamera(cameraCommand);
    } catch (err) {
      if (__DEV__) console.warn('[MapScreen] Navigation camera update failed', err);
    }
  }, [
    nav.isNavigating,
    cameraLocked,
    navCameraSessionKey,
    navFollowKick,
    navDisplayCoord.lat,
    navDisplayCoord.lng,
    navPuckHeading,
    heading,
    navCameraAnchorLat,
    navCameraAnchorLng,
    fusedSpeedMpsNav,
    navFollowZoomLevel,
    navFollowPitch,
    navFollowPadTop,
    navFollowPadBottom,
    navFollowPadLeft,
    navFollowPadRight,
    navCameraAnimationDuration,
    navCameraFollowTuning,
    navFallbackPad.paddingTop,
    navFallbackPad.paddingBottom,
    navFallbackPad.paddingLeft,
    navFallbackPad.paddingRight,
    modeConfig.navPitch,
    modeConfig.navZoom,
  ]);

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
  const enableShareLocationFromMap = useCallback(async () => {
    const { lat, lng, heading: h, speed: sp } = mapLivePublishCoordsRef.current;
    const { isNavigating, destinationName } = mapLiveNavRef.current;
    const coordsValid =
      Number.isFinite(lat) && Number.isFinite(lng) && !((Math.abs(lat) < 1e-6) && (Math.abs(lng) < 1e-6));
    if (!coordsValid) {
      Alert.alert('Location sharing', 'Waiting for a valid GPS fix. Try again in a moment.');
      return;
    }
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      /* optional */
    }
    storage.set(FRIEND_LIVE_SHARE_STORAGE_KEY, '1');
    storage.set(FRIEND_LIVE_SHARE_MODE_KEY, 'while_using');
    setShareLocEpoch((n) => n + 1);
    const setShareRes = await api.put('/api/friends/location/sharing', {
      is_sharing: true,
      sharing_mode: 'while_using',
      lat,
      lng,
    });
    const setShareErr = getApiErrorMessage(setShareRes, 'Could not enable location sharing right now.');
    if (setShareErr) {
      storage.set(FRIEND_LIVE_SHARE_STORAGE_KEY, '0');
      storage.set(FRIEND_LIVE_SHARE_MODE_KEY, 'off');
      setShareLocEpoch((n) => n + 1);
      Alert.alert('Location sharing', setShareErr);
      return;
    }
    let battery_pct: number | undefined;
    try {
      const lvl = await Battery.getBatteryLevelAsync();
      battery_pct = Math.round(Math.max(0, Math.min(1, lvl)) * 100);
    } catch {
      /* optional */
    }
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
    const updateErr = getApiErrorMessage(res, 'Could not publish your current location yet.');
    if (updateErr) {
      if (res.statusCode === 503) setLivePublishPaused503(true);
      Alert.alert('Location sharing', updateErr);
      return;
    }
    nudgeBackgroundLocationAfterEnablingShare();
  }, [setShareLocEpoch]);
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
  /** Cheapest nearby regular (~$/gal chip) — local stations preferred, then statewide CollectAPI. */
  const [gasChipAvgRegularShort, setGasChipAvgRegularShort] = useState<string | null>(null);
  const [gasChipPriceSource, setGasChipPriceSource] = useState<'nearby_station' | 'state_index' | null>(null);
  /** Stations from `/api/fuel/prices` for badges + correlation with Google-place rows (map markers). */
  const [localStationGasMarkers, setLocalStationGasMarkers] = useState<GasPriceMapPoint[]>([]);
  const [selectedTrafficCamera, setSelectedTrafficCamera] = useState<CameraLocation | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<{
    name: string;
    address?: string;
    category?: string;
    maki?: string;
    placeType?: string;
    price_level?: number;
    open_now?: boolean;
    rating?: number;
    /** Google Places `photo_reference` — used to render the place card hero photo before details load. */
    photo_reference?: string;
    lat: number;
    lng: number;
  } | null>(null);
  const selectedPlaceGasSnap = useMemo(() => {
    if (!selectedPlace) return null;
    const t = `${selectedPlace.category || ''} ${selectedPlace.maki || ''} ${selectedPlace.placeType || ''}`.toLowerCase();
    if (!t.includes('gas') && !t.includes('fuel')) return null;
    return matchGasStationNearPlace(selectedPlace.lat, selectedPlace.lng, localStationGasMarkers, 360);
  }, [selectedPlace, localStationGasMarkers]);
  const [mapZoomLevel, setMapZoomLevel] = useState(15);
  /** Map camera bearing (° CW from north) — drives nav puck screen rotation vs absolute course. */
  const [mapCameraHeadingDeg, setMapCameraHeadingDeg] = useState(0);
  const mapZoomDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMapCameraHeadingRef = useRef<{ value: number; at: number }>({ value: 0, at: 0 });
  /**
   * While the navigation follow camera is locked, use the commanded bearing
   * for puck compensation instead of the delayed `onCameraChanged` callback.
   * That keeps the chevron visually normalized during turns: puck, HUD and
   * camera all agree on the same heading target every frame.
   */
  const navPuckMapBearingDeg = useMemo(() => {
    if (nav.isNavigating && cameraLocked && Number.isFinite(navPuckHeading)) {
      return ((navPuckHeading % 360) + 360) % 360;
    }
    return mapCameraHeadingDeg;
  }, [nav.isNavigating, cameraLocked, navPuckHeading, mapCameraHeadingDeg]);
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
  const [currentAddress, setCurrentAddress] = useState<string>('');
  const [recentSearches, setRecentSearches] = useState<GeocodeResult[]>([]);
  const recentSearchesRef = useRef<GeocodeResult[]>([]);
  recentSearchesRef.current = recentSearches;

  // ── Layers ──
  const { showTraffic, showIncidents, showCameras, setShowTraffic, setShowIncidents, setShowCameras,
    showConstruction, setShowConstruction,
    showPhotoReports, setShowPhotoReports, showTrafficSafety, setShowTrafficSafety,
  } = useMapLayers();
  /** Apple Maps baseline: safety cameras should be visible during active nav even if the explore layer is off. */
  const trafficSafetyWanted = showTrafficSafety || nav.isNavigating;
  /** Camera POIs are a premium browse layer, but active navigation should still populate safety context. */
  const cameraPoisWanted = (Boolean(user?.isPremium) && showCameras) || nav.isNavigating;

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
  const [tripSharePayload, setTripSharePayload] = useState<TripSummary | null>(null);
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
  const navLogicVehicleMaxHeight =
    avoidLowClearances && hasTallVehicle && Number.isFinite(vehicleHeight) ? vehicleHeight : undefined;

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
    // Native SDK drives bypass `useDriveNavigation.endNavigation`, so nudge the rest of
    // the app (dashboards, wallet badges, profile totals) the same way a JS drive would.
    if (result.tripSummary.counted !== false) {
      bumpStatsVersion();
      void refreshUserFromServer();
    }
  }, [route.params?.nativeNavResult, rnNav, bumpStatsVersion, refreshUserFromServer]);

  const activeTripSummary = nav.tripSummary ?? nativeNavTripSummary;
  const dismissActiveTripSummary = useCallback(() => {
    nav.dismissTripSummary();
    setNativeNavTripSummary(null);
  }, [nav]);
  const openTripShare = useCallback(() => {
    if (!activeTripSummary) return;
    // Snapshot summary first, then close the recap sheet so share UI is unambiguous.
    setTripSharePayload(activeTripSummary);
    dismissActiveTripSummary();
    requestAnimationFrame(() => setShowTripShare(true));
  }, [activeTripSummary, dismissActiveTripSummary]);

  // ─── Derived values ────────────────────────────────────────────────────────

  const mapStyleIndex = Math.min(styleOverride, MAP_STYLES.length - 1);
  const activeStyleURL = MAP_STYLES[mapStyleIndex]?.url ?? MAP_STYLES[0].url;
  const mapStylePickerHighlightIndex = mapStyleIndex;

  /** Calm/Adaptive: time-of-day preset; Sport: always `night` on Standard in light app theme; dark app → night. */
  const mapLightPreset = useMemo(
    () => getDrivingLightPreset(drivingMode, isLight, { sportBasemapAlwaysDark: true }),
    [drivingMode, isLight],
  );
  const isSatelliteStyle = activeStyleURL.includes('standard-satellite');
  const navRouteColors = useMemo(
    () => effectiveNavRouteColors(modeConfig, mapLightPreset, isSatelliteStyle, drivingMode, { speedMphForRoute: displaySpeedMph }),
    [modeConfig, mapLightPreset, isSatelliteStyle, drivingMode, displaySpeedMph],
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
  const useModeHudBorder = Boolean(modeConfig.turnCardBorderColor);

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

  /** Mapbox must not use built-in GPS follow while navigating — `setCamera` + matched coords own the frame. */
  const cameraFollowsDeviceGps = !nav.isNavigating && (compassMode || exploreTracksUser);

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

  /** Premium friends list: faster poll while Map is focused so shared locations stay current. */
  useEffect(() => {
    if (!user?.isPremium || !friendTrackingEnabled) return;
    const ms = mapTabFocused ? 12_000 : 45_000;
    const id = setInterval(refreshFriendLocations, ms);
    return () => clearInterval(id);
  }, [user?.isPremium, friendTrackingEnabled, mapTabFocused, refreshFriendLocations]);

  /** After backgrounding, REST + markers catch up even if realtime lagged. */
  useEffect(() => {
    if (!user?.isPremium || !friendTrackingEnabled) return;
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') refreshFriendLocations();
    });
    return () => sub.remove();
  }, [user?.isPremium, friendTrackingEnabled, refreshFriendLocations]);

  /** If local share preference was never set, align with server so Map publishing matches Dashboard / API. */
  useEffect(() => {
    if (!mapTabFocused || !user?.isPremium) return;
    const raw = storage.getString(FRIEND_LIVE_SHARE_STORAGE_KEY);
    if (raw === '1' || raw === '0') return;
    let cancelled = false;
    void (async () => {
      try {
        const r = await api.get('/api/friends/location/sharing');
        if (cancelled || !r.success) return;
        const state = extractLocationSharingState(unwrapOffersApiData(r.data));
        if (!state) return;
        storage.set(FRIEND_LIVE_SHARE_STORAGE_KEY, state.isSharing ? '1' : '0');
        storage.set(FRIEND_LIVE_SHARE_MODE_KEY, state.sharingMode);
        setShareLocEpoch((n) => n + 1);
      } catch {
        /* offline */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mapTabFocused, user?.isPremium]);

  // Fix 8: Offers refresh on significant location change (~1km); during nav use snapped corridor position.
  useEffect(() => {
    const rLat = Math.round(poiSearchCoord.lat * 100);
    const rLng = Math.round(poiSearchCoord.lng * 100);
    if (rLat === 0 && rLng === 0) return;
    api
      .get(`/api/offers/nearby?lat=${poiSearchCoord.lat}&lng=${poiSearchCoord.lng}&radius=${OFFERS_NEARBY_RADIUS_KM}`)
      .then((r) => {
        if (!r.success) {
          logMapDataIssue('GET /api/offers/nearby', r.error);
          return;
        }
        setNearbyOffers(parseNearbyOffers(r.data));
      })
      .catch((e) => logMapDataIssue('GET /api/offers/nearby', e));
  }, [Math.round(poiSearchCoord.lat * 100), Math.round(poiSearchCoord.lng * 100)]);

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
    if (!cameraPoisWanted) {
      setCameraLocations([]);
      return;
    }
    // Focus gate: when `NativeNavigationScreen` (opt-in) is on top of the MapStack
    // it runs its own OHGO fetcher at a different cadence. Pausing this effect on
    // blur prevents double /api/map/cameras requests fighting for the same data.
    if (!mapTabFocused) return;
    const rLat = Math.round(poiSearchCoord.lat * 100);
    const rLng = Math.round(poiSearchCoord.lng * 100);
    if (rLat === 0 && rLng === 0) return;
    api
      .get<any>(`/api/map/cameras?lat=${poiSearchCoord.lat}&lng=${poiSearchCoord.lng}&radius=80`)
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
  }, [cameraPoisWanted, mapTabFocused, Math.round(poiSearchCoord.lat * 100), Math.round(poiSearchCoord.lng * 100)]);

  useEffect(() => {
    if (!mapTabFocused) {
      setGasChipAvgRegularShort(null);
      setGasChipPriceSource(null);
      setLocalStationGasMarkers([]);
      tripFuelContextRef.current = null;
      return;
    }
    const lat0 = location.lat;
    const lng0 = location.lng;
    if (!Number.isFinite(lat0) || !Number.isFinite(lng0)) {
      setLocalStationGasMarkers([]);
      setGasChipAvgRegularShort(null);
      setGasChipPriceSource(null);
      return;
    }

    Promise.all([
      api.get<Record<string, unknown>>(`/api/fuel/prices?lat=${lat0}&lng=${lng0}`),
      api.get<Record<string, unknown>>('/api/map/gas-prices'),
    ])
      .then(([fuelRes, collectRes]) => {
        let localRows: GasPriceMapPoint[] = [];
        if (fuelRes.success && fuelRes.data != null) {
          localRows = gasPricePointsFromApiEnvelope(fuelRes.data).filter(isLocalStationGasRow);
          setLocalStationGasMarkers(localRows);
        } else {
          setLocalStationGasMarkers([]);
          if (!fuelRes.success) {
            logMapDataIssue('GET /api/fuel/prices', fuelRes.error);
          }
        }

        const localChip = cheapestLocalRegularChip(localRows);
        const localUsd = localChip ? parseUsdPerGallonNumber(localChip) : undefined;

        if (localChip != null && localUsd != null) {
          setGasChipAvgRegularShort(localChip);
          setGasChipPriceSource('nearby_station');
          tripFuelContextRef.current = {
            stateLabel: 'Nearby',
            priceUsdPerGal: localUsd,
          };
          return;
        }

        tripFuelContextRef.current = null;
        setGasChipAvgRegularShort(null);
        setGasChipPriceSource(null);

        if (!collectRes.success || collectRes.data == null) {
          if (!collectRes.success) logMapDataIssue('GET /api/map/gas-prices', collectRes.error);
          return;
        }
        const stateRows = gasPricePointsFromApiEnvelope(collectRes.data);
        const env = collectRes.data && typeof collectRes.data === 'object' && !Array.isArray(collectRes.data)
          ? (collectRes.data as Record<string, unknown>)
          : {};
        if (stateRows.length === 0 && typeof env.detail === 'string') {
          logMapDataIssue('GET /api/map/gas-prices empty', env.detail as string);
        }
        const nearestState = nearestGasPricePointByLocation(lat0, lng0, stateRows);
        const stateChip = nearestState ? formatUsdPerGalChip(nearestState.regular) : null;
        setGasChipAvgRegularShort(stateChip);
        setGasChipPriceSource(nearestState && stateChip ? 'state_index' : null);
        if (nearestState && parseUsdPerGallonNumber(nearestState.regular) != null) {
          tripFuelContextRef.current = {
            stateLabel: nearestState.state || nearestState.name || 'Regional',
            priceUsdPerGal: parseUsdPerGallonNumber(nearestState.regular),
          };
        }
      })
      .catch((e) => {
        logMapDataIssue('GET /api/fuel/prices batch', e);
        setGasChipAvgRegularShort(null);
        setGasChipPriceSource(null);
        setLocalStationGasMarkers([]);
        tripFuelContextRef.current = null;
      });
  }, [
    mapTabFocused,
    Math.round(location.lat * 50),
    Math.round(location.lng * 50),
  ]);

  const refreshPhotoReportsNearby = useCallback(() => {
    if (!showPhotoReports) return;
    const pc = poiSearchCoordRef.current;
    api
      .get<{ photos?: unknown[] }>(`/api/photo-reports/nearby?lat=${pc.lat}&lng=${pc.lng}&radius=5`)
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
            photo_url:
              typeof p.photo_url === 'string' ? absolutizeMediaUrl(p.photo_url) : undefined,
            thumbnail_url:
              typeof p.thumbnail_url === 'string' ? absolutizeMediaUrl(p.thumbnail_url) : undefined,
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
    if (!trafficSafetyWanted) {
      setTrafficSafetyHint(null);
    }
  }, [trafficSafetyWanted]);

  // Traffic safety POIs (Overpass via API; hidden in restricted regions)
  useEffect(() => {
    const rLat = Math.round(poiSearchCoord.lat * 100);
    const rLng = Math.round(poiSearchCoord.lng * 100);
    if (rLat === 0 && rLng === 0) {
      setTrafficSafetyZones([]);
      setTrafficSafetyHint(null);
      return;
    }
    if (!trafficSafetyWanted || !isTrafficSafetyLayerEnabled(poiSearchCoord.lat, poiSearchCoord.lng)) {
      setTrafficSafetyZones([]);
      setTrafficSafetyHint(null);
      return;
    }
    const region = trafficSafetyRegionQuery(poiSearchCoord.lat, poiSearchCoord.lng);
    api
      .get<Record<string, unknown>>(
        `/api/traffic-safety/zones?lat=${poiSearchCoord.lat}&lng=${poiSearchCoord.lng}&radius_km=12&region=${encodeURIComponent(region)}`,
      )
      .then((r) => {
        if (!r.success || r.data == null) {
          setTrafficSafetyZones([]);
          setTrafficSafetyHint(showTrafficSafety ? 'Could not load speed camera data. Try again later.' : null);
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
          setTrafficSafetyHint(showTrafficSafety ? 'Unexpected response from traffic safety service.' : null);
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
          setTrafficSafetyHint(showTrafficSafety ? `Rate limited — try again in ~${sec}s.` : null);
          return;
        }
        if (payload?.limited) {
          setTrafficSafetyHint(showTrafficSafety ? 'No mapped speed cameras in this area (OpenStreetMap). Zoom out or move to try again.' : null);
          return;
        }
        setTrafficSafetyHint(showTrafficSafety ? 'No speed camera POIs returned in this area yet.' : null);
      })
      .catch((e) => {
        logMapDataIssue('GET /api/traffic-safety/zones', e);
        setTrafficSafetyZones([]);
        setTrafficSafetyHint(showTrafficSafety ? 'Network error loading speed cameras.' : null);
      });
  }, [trafficSafetyWanted, showTrafficSafety, Math.round(poiSearchCoord.lat * 100), Math.round(poiSearchCoord.lng * 100)]);

  // Crash detection removed — SOS endpoints (/api/family/sos, /api/concerns/submit) do not exist.
  // Will be re-implemented when family/emergency features are built with real backend support.

  // Fix 7: Supabase realtime for friend locations (INSERT + UPDATE — first share often INSERTs a row).
  useEffect(() => {
    if (!friendTrackingEnabled || !supabaseConfigured) return;
    const applyRealtimeRow = (payload: { new?: unknown }) => {
      const upd = parseLiveLocationUpdate(payload?.new);
      if (!upd) return;
      setFriendLocations((prev) => {
        const matched = prev.some((f) => String(f.id) === String(upd.friendId));
        const merged = mergeLiveLocationUpdate(prev, {
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
        });
        if (!matched) {
          queueMicrotask(() => refreshFriendLocations());
          return prev;
        }
        return merged;
      });
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
  }, [friendTrackingEnabled, supabaseConfigured, refreshFriendLocations]);

  // Fix 14: Camera tick + odometry. `navDisplayCoord` is SDK-matched when `navLogicSdkEnabled` (single engine); else JS snap.
  useEffect(() => {
    if (!Number.isFinite(navDisplayCoord.lat) || !Number.isFinite(navDisplayCoord.lng)) return;
    const moveThresholdM = nav.isNavigating ? 0.52 : 1.5;
    const moved = haversineMeters(lastCameraUpdate.current.lat, lastCameraUpdate.current.lng, navDisplayCoord.lat, navDisplayCoord.lng) > moveThresholdM;
    const turned = Math.abs(navPuckHeading - lastCameraUpdate.current.heading) > 2.75;
    if (moved || turned) {
      lastCameraUpdate.current = { lat: navDisplayCoord.lat, lng: navDisplayCoord.lng, heading: navPuckHeading };
      if (moved) nav.updatePosition(navDisplayCoord.lat, navDisplayCoord.lng);
    }
  }, [navDisplayCoord.lat, navDisplayCoord.lng, navPuckHeading, nav.isNavigating, nav.updatePosition]);

  const pubLat = nav.isNavigating ? navDisplayCoord.lat : location.lat;
  const pubLng = nav.isNavigating ? navDisplayCoord.lng : location.lng;
  const pubHeading = nav.isNavigating ? navDisplayHeading : heading;
  mapLivePublishCoordsRef.current = {
    lat: pubLat,
    lng: pubLng,
    heading: pubHeading,
    speed: displaySpeedMph,
  };
  mapLiveNavRef.current = {
    isNavigating: nav.isNavigating,
    destinationName: nav.selectedDestination?.name,
  };

  useEffect(() => {
    if (Platform.OS === 'web' || !user?.isPremium) return;
    void AsyncStorage.setItem(FRIEND_LIVE_LAST_NAV_KEY, nav.isNavigating ? '1' : '0');
  }, [user?.isPremium, nav.isNavigating]);

  useEffect(() => {
    if (!user?.isPremium || !canPublishFriendLocation) return;
    const sharingOn = storage.getString(FRIEND_LIVE_SHARE_STORAGE_KEY) === '1';
    if (!sharingOn) return;
    const sharingMode = isAlwaysFollowMode(storage.getString(FRIEND_LIVE_SHARE_MODE_KEY)) ? 'always_follow' : 'while_using';
    const rLat = Math.round(pubLat * 1000);
    const rLng = Math.round(pubLng * 1000);
    if (rLat === 0 && rLng === 0) return;
    const now = Date.now();
    if (now - lastLivePublishRef.current < FRIEND_LIVE_SHARE_PUBLISH_INTERVAL_MS) return;
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
        lat: pubLat,
        lng: pubLng,
        heading: pubHeading,
        speed_mph: displaySpeedMph,
        is_navigating: nav.isNavigating,
        destination_name: nav.selectedDestination?.name ?? undefined,
        is_sharing: true,
        sharing_mode: sharingMode,
        battery_pct,
      });
      if (!res.success && res.statusCode === 503) setLivePublishPaused503(true);
    })();
    return () => { cancelled = true; };
  }, [
    user?.isPremium,
    canPublishFriendLocation,
    shareLocEpoch,
    pubLat,
    pubLng,
    pubHeading,
    displaySpeedMph,
    nav.isNavigating,
    nav.selectedDestination?.name,
  ]);

  useEffect(() => {
    if (!user?.isPremium || !canPublishFriendLocation) return;
    let cancelled = false;
    const tick = () => {
      const sharingOn = storage.getString(FRIEND_LIVE_SHARE_STORAGE_KEY) === '1';
      if (!sharingOn) return;
      const sharingMode = isAlwaysFollowMode(storage.getString(FRIEND_LIVE_SHARE_MODE_KEY)) ? 'always_follow' : 'while_using';
      const { lat, lng, heading: h, speed: sp } = mapLivePublishCoordsRef.current;
      const { isNavigating, destinationName } = mapLiveNavRef.current;
      const rLat = Math.round(lat * 1000);
      const rLng = Math.round(lng * 1000);
      if (rLat === 0 && rLng === 0) return;
      const now = Date.now();
      if (now - lastLivePublishRef.current < FRIEND_LIVE_SHARE_PUBLISH_INTERVAL_MS) return;
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
          sharing_mode: sharingMode,
          battery_pct,
        });
        if (!res.success && res.statusCode === 503) setLivePublishPaused503(true);
      })();
    };
    const id = setInterval(tick, FRIEND_LIVE_SHARE_PUBLISH_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [user?.isPremium, canPublishFriendLocation, shareLocEpoch]);

  useEffect(() => {
    if (!user?.isPremium || !canPublishFriendLocation) {
      void stopFriendLiveShareBackgroundUpdates();
      return;
    }
    const sharingOn = storage.getString(FRIEND_LIVE_SHARE_STORAGE_KEY) === '1';
    const alwaysFollowOn = isAlwaysFollowMode(storage.getString(FRIEND_LIVE_SHARE_MODE_KEY));
    if (!sharingOn || !alwaysFollowOn) {
      void stopFriendLiveShareBackgroundUpdates();
      return;
    }
    void startFriendLiveShareBackgroundUpdates();
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

  useEffect(() => {
    if (!nav.showRoutePreview || !nav.selectedDestination) return;
    void nav.fetchDirections(nav.selectedDestination, undefined, {
      maxHeightMeters: avoidLowClearances ? vehicleHeight : undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only refetch when switching travel mode during preview
  }, [nav.travelProfile]);

  // Fix 5: Reroute when driving mode changes during active nav
  useEffect(() => {
    if (!nav.isNavigating || !nav.selectedDestination) return;
    if (navLogicEffective) return;
    void nav.fetchDirections(nav.selectedDestination).then((r) => {
      if (!r.ok && r.reason === 'route_failed') {
        Alert.alert('Could not refresh route', r.message ?? 'Driving mode changed but directions failed. Try stopping navigation and starting again.');
      }
    });
  }, [drivingMode, navLogicEffective]);

  // Animate report card timer whenever a new report card shows
  useEffect(() => {
    if (activeReportCard) {
      reportTimerProg.value = 1;
      reportTimerProg.value = withTiming(0, { duration: 8000 });
    }
  }, [activeReportCard?.id]);

  const fetchNearbyIncidents = useCallback(async () => {
    const loc = poiSearchCoordRef.current;
    if (!loc || (Math.abs(loc.lat) < 1e-5 && Math.abs(loc.lng) < 1e-5)) return;
    try {
      const res = await api.get<{ success?: boolean; data?: Incident[] }>(
        `/api/incidents/nearby?lat=${loc.lat}&lng=${loc.lng}&radius_miles=2`,
      );
      if (!res.success || res.data == null) return;
      const payload = res.data as { success?: boolean; data?: Incident[] };
      const d = payload.data;
      let merged: Incident[] = Array.isArray(d) ? [...d] : [];
      try {
        const osm = await api.get<{ success?: boolean; data?: Incident[] }>(
          `/api/incidents/osm-nearby?lat=${loc.lat}&lng=${loc.lng}&radius_miles=2`,
        );
        const op = osm.success && osm.data != null ? (osm.data as { success?: boolean; data?: Incident[] }) : null;
        const raw = op?.data;
        if (Array.isArray(raw)) {
          const seen = new Set(merged.map((x) => String(x.id)));
          for (const row of raw) {
            const id = String((row as Incident).id);
            if (!seen.has(id)) {
              seen.add(id);
              merged.push(row as Incident);
            }
          }
        }
      } catch {
        /* OSM optional */
      }
      setNearbyIncidents(merged);
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
      // Advisory rate source: during an SDK-authoritative trip, voice.ts defers this line
      // for a few seconds after a native turn cue so the two TTS streams don't overlap.
      speak(`Orion: SnapRoad offer nearby — ${name}.`, 'normal', drivingMode, { rateSource: 'advisory' });
      break;
    }
  }, [nav.isNavigating, recommendedNearbyOffers, location.lat, location.lng, drivingMode]);

  // Police-only navigation alerts: ahead on route (or forward cone without geometry); ~2 mi then ~0.05 mi.
  const navHeadingForIncidents = Number.isFinite(navPuckHeading) ? navPuckHeading : heading;
  useEffect(() => {
    if (!nav.isNavigating || !nearbyIncidents.length) {
      setActiveReportCard((c) => (c && String(c.type).toLowerCase() === 'police' ? null : c));
      return;
    }
    const poly = nav.navigationData?.polyline;
    const user: Coordinate = { lat: location.lat, lng: location.lng };
    const MI_2_MIN = 1.75 * 1609.34;
    const MI_2_MAX = 2.25 * 1609.34;
    const MI_NEAR = 0.055 * 1609.34;

    let bestNear: { inc: Incident; meters: number } | null = null;
    let best2: { inc: Incident; meters: number } | null = null;

    for (const inc of nearbyIncidents) {
      if (String(inc.type).toLowerCase() !== 'police') continue;
      const meters = distanceAheadEffectiveMeters(poly, user, { lat: inc.lat, lng: inc.lng }, navHeadingForIncidents);
      if (meters == null) continue;
      if (meters > 0 && meters <= MI_NEAR) {
        if (!bestNear || meters < bestNear.meters) bestNear = { inc, meters };
      } else if (meters >= MI_2_MIN && meters <= MI_2_MAX) {
        if (!best2 || meters < best2.meters) best2 = { inc, meters };
      }
    }

    const pick = bestNear ?? best2;
    if (!pick) return;

    const keyNear = `police_near:${pick.inc.id}`;
    const key2 = `police_2mi:${pick.inc.id}`;
    const isNearBand = bestNear != null && pick === bestNear;
    const annKey = isNearBand ? keyNear : key2;
    if (announcedRef.current.has(annKey)) return;
    announcedRef.current.add(annKey);

    if (isNearBand) {
      speak('Police reported ahead.', 'high', drivingMode, { rateSource: 'advisory' });
    } else {
      speak('Police reported about two miles ahead.', 'high', drivingMode, { rateSource: 'advisory' });
    }
    setActiveReportCard(pick.inc);
    if (reportCardTimeoutRef.current) clearTimeout(reportCardTimeoutRef.current);
    reportCardTimeoutRef.current = setTimeout(() => setActiveReportCard(null), isNearBand ? 8000 : 10000);
  }, [
    nav.isNavigating,
    nearbyIncidents,
    location.lat,
    location.lng,
    drivingMode,
    nav.navigationData?.polyline,
    navHeadingForIncidents,
  ]);

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
        // Advisory rate source: held around native turn cues, otherwise spoken at driving-mode rate.
        speak(
          `There's a ${offer.discount_percent}% off offer at ${name}, about ${distance.toFixed(1)} miles ahead. Would you like me to add a stop?`,
          'normal',
          drivingMode,
          { rateSource: 'advisory' },
        );
      })
      .catch((e) => logMapDataIssue('GET /api/navigation/nearby-offers', e));
  }, [nav.isNavigating, location.lat, location.lng, drivingMode]);

  // Fix 13: Ambient mode with direction-based filtering (forward cone; ignore behind)
  useEffect(() => {
    if (!isAmbient || !nearbyIncidents.length) return;
    const user: Coordinate = { lat: location.lat, lng: location.lng };
    const hp = nearbyIncidents.filter((inc) => {
      if (inc.type !== 'accident' && inc.type !== 'police') return false;
      if (announcedRef.current.has(`amb:${inc.id}`)) return false;
      return isIncidentAheadSnapshot(undefined, user, { lat: inc.lat, lng: inc.lng }, heading);
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

  /**
   * Distance-aware sort that prefers haversine when row coords are usable
   * and falls back to server-supplied `distance_meters` (Google
   * autocomplete returns this even when omitting lat/lng) — fixes the
   * "closest result not surfaced" bug where (0, 0) rows landed in the
   * infinite-distance bucket and were re-sorted behind farther local
   * matches. See `placeSearchRanking.ts` for the full contract.
   */
  const sortGeocodeByProximity = useCallback(
    (rows: GeocodeResult[], loc: { lat: number; lng: number }) =>
      sortGeocodeByEffectiveDistance(rows, loc),
    [],
  );

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
              distance_meters:
                typeof p.distance_meters === 'number' && Number.isFinite(p.distance_meters)
                  ? p.distance_meters
                  : undefined,
              rating: typeof p.rating === 'number' && Number.isFinite(p.rating) ? p.rating : undefined,
              user_ratings_total:
                typeof p.user_ratings_total === 'number' ? p.user_ratings_total : undefined,
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
        distance_meters:
          typeof p.distance_meters === 'number' && Number.isFinite(p.distance_meters)
            ? p.distance_meters
            : undefined,
        rating: typeof p.rating === 'number' && Number.isFinite(p.rating) ? p.rating : undefined,
        user_ratings_total:
          typeof p.user_ratings_total === 'number' ? p.user_ratings_total : undefined,
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
      let detailRecord: Record<string, unknown> | null = null;
      try {
        const details = await api.get<any>(`/api/places/details/${result.place_id}`);
        const d = details.data?.data ?? details.data;
        if (d && typeof d === 'object') detailRecord = d as Record<string, unknown>;
      } catch {
        detailRecord = null;
      }

      const detailLat = detailRecord
        ? Number(
            detailRecord.lat ??
              (detailRecord.geometry as { location?: { lat?: number } })?.location?.lat,
          )
        : NaN;
      const detailLng = detailRecord
        ? Number(
            detailRecord.lng ??
              (detailRecord.geometry as { location?: { lng?: number } })?.location?.lng,
          )
        : NaN;

      /**
       * Resolve the canonical map coordinate. `pickBestPlaceLocation` always
       * prefers details geometry when valid — this fixes the
       * "tap pulls up wrong things" bug where row coords (potentially stale
       * or duplicated from another provider) used to override authoritative
       * details geometry whenever `hasCoords()` was true on the row.
       */
      const best = pickBestPlaceLocation(
        Number(result.lat),
        Number(result.lng),
        Number.isFinite(detailLat) ? detailLat : null,
        Number.isFinite(detailLng) ? detailLng : null,
      );

      const observedAt = Date.now();
      const recentRow = buildRecentRow(result, detailRecord, observedAt);
      // Functional updater so concurrent recent updates can't pin a stale snapshot.
      setRecentSearches((prev) => {
        const updated = [recentRow, ...prev.filter((r) => r.name !== result.name)].slice(0, 10);
        storage.set('snaproad_recent_searches', JSON.stringify(updated));
        return updated;
      });

      if (best) {
        cameraRef.current?.setCamera({
          centerCoordinate: [best.lng, best.lat],
          zoomLevel: 16,
          pitch: 45,
          animationDuration: 800,
        });
      } else {
        Alert.alert(
          'Location unavailable',
          'Could not load coordinates for this place. Try another search result or open the listing again in a moment.',
        );
      }

      const summaryOpen = detailRecord ? parseOpenNowBooleanFromDetailsPayload(detailRecord) : null;
      // When the upstream search row already has a Google `photo_reference`
      // (text-search / category explore), keep it on the selected place so the
      // detail sheet renders an instant hero before /api/places/details lands.
      const carriedPhotoRef = (result as { photo_reference?: unknown }).photo_reference;
      setSelectedPlace({
        name: result.name,
        address: result.address,
        lat: best ? best.lat : 0,
        lng: best ? best.lng : 0,
        placeType: result.placeType,
        category: result.placeType ?? result.category,
        price_level: result.price_level,
        open_now: summaryOpen === null ? undefined : summaryOpen,
        rating: typeof (result as { rating?: number }).rating === 'number'
          ? (result as { rating?: number }).rating
          : undefined,
        photo_reference: typeof carriedPhotoRef === 'string' ? carriedPhotoRef : undefined,
      });
      setSelectedPlaceId(result.place_id);
      return;
    }

    const recentRowNoPid: GeocodeResult = {
      ...result,
      open_now: undefined,
      open_now_last_updated_at: undefined,
    };
    setRecentSearches((prev) => {
      const updated = [recentRowNoPid, ...prev.filter((r) => r.name !== result.name)].slice(0, 10);
      storage.set('snaproad_recent_searches', JSON.stringify(updated));
      return updated;
    });

    {
      const carriedPhotoRef = (result as { photo_reference?: unknown }).photo_reference;
      setSelectedPlace({
        name: result.name,
        address: result.address,
        category: result.category,
        maki: result.maki,
        placeType: result.placeType,
        price_level: result.price_level,
        open_now: undefined,
        rating: typeof (result as { rating?: number }).rating === 'number'
          ? (result as { rating?: number }).rating
          : undefined,
        photo_reference: typeof carriedPhotoRef === 'string' ? carriedPhotoRef : undefined,
        lat: result.lat,
        lng: result.lng,
      });
    }
    cameraRef.current?.setCamera({
      centerCoordinate: [result.lng, result.lat],
      zoomLevel: 16,
      pitch: 45,
      animationDuration: 800,
    });
  }, []);

  const openCategoryExplore = useCallback((chipKey: string) => {
    if (nav.showRoutePreview) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      nav.cancelRoutePreview();
    }
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
      nearbyGas: {
        title: 'Nearby Gas',
        subtitle:
          'Stations near you. Tap a row for details; chip price is from CollectAPI (nearby snapshot or state index when needed).',
        type: 'gas_station',
        radius: 15000,
        limit: 20,
      },
      /** Legacy alias if anything still passes `gas` — kept in sync with `nearbyGas`. */
      gas: {
        title: 'Nearby Gas',
        subtitle:
          'Stations near you. Tap a row for details; chip price is from CollectAPI (nearby snapshot or state index when needed).',
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

    if (chipKey === 'nearbyGas' || chipKey === 'gas') {
      void Promise.allSettled([
        api.get<any>(
          `/api/places/nearby?lat=${lat0}&lng=${lng0}&radius=${cfg.radius}${typeQs}&limit=${cfg.limit}`,
        ),
        api.get<Record<string, unknown>>(`/api/fuel/prices?lat=${lat0}&lng=${lng0}`),
        api.get<Record<string, unknown>>('/api/map/gas-prices'),
      ]).then(([placesResult, fuelResult, stateGasResult]) => {
        const r =
          placesResult.status === 'fulfilled'
            ? placesResult.value
            : { success: false as const, error: 'Could not load places.' };
        const rFuel =
          fuelResult.status === 'fulfilled'
            ? fuelResult.value
            : { success: false as const, error: String(fuelResult.reason ?? 'Request failed') };
        const rGas =
          stateGasResult.status === 'fulfilled'
            ? stateGasResult.value
            : { success: false as const, error: String(stateGasResult.reason ?? 'Request failed') };
        let fuelSnapshots: GasPriceMapPoint[] = [];
        if (rFuel.success && rFuel.data != null) {
          fuelSnapshots = gasPricePointsFromApiEnvelope(rFuel.data).filter(isLocalStationGasRow);
        } else if (!rFuel.success) {
          logMapDataIssue('GET /api/fuel/prices', rFuel.error);
        }
        let subtitleExpl = cfg.subtitle ?? '';
        const localLine = exploreGasFuelPricesSubtitle(lat0, lng0, fuelSnapshots);
        if (localLine) {
          subtitleExpl = `${cfg.subtitle ? `${cfg.subtitle}\n` : ''}${localLine}`;
        } else if (rGas.success && rGas.data != null) {
          const pts = gasPricePointsFromApiEnvelope(rGas.data);
          const nearest = nearestGasPricePointByLocation(lat0, lng0, pts);
          if (nearest) {
            subtitleExpl = `${cfg.subtitle ? `${cfg.subtitle}\n` : ''}${formatStateGasRegularSummary(nearest)}`;
          }
          const gasEnvelope =
            rGas.data && typeof rGas.data === 'object' && !Array.isArray(rGas.data)
              ? (rGas.data as Record<string, unknown>)
              : {};
          if (pts.length === 0 && typeof gasEnvelope.detail === 'string') {
            logMapDataIssue('GET /api/map/gas-prices empty', gasEnvelope.detail);
          }
        } else if (!rGas.success) {
          logMapDataIssue('GET /api/map/gas-prices', rGas.error);
        }
        if (!r.success) {
          setCategoryExplore((prev) =>
            prev
              ? { ...prev, loading: false, error: r.error || 'Could not load places.', results: [], subtitle: subtitleExpl }
              : null,
          );
          return;
        }
        const root = r.data as Record<string, unknown> | undefined;
        if (root && root.success === false) {
          const err = String((root as { error?: string }).error || 'Could not load places.');
          setCategoryExplore((prev) =>
            prev ? { ...prev, loading: false, error: err, results: [], subtitle: subtitleExpl } : null,
          );
          return;
        }
        const payload = root?.data ?? root;
        const arr = Array.isArray(payload) ? payload : [];
        const mapped = arr.map((p: Record<string, unknown>) => {
          const row = {
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
          };
          const ptLower = (row.placeType || '').toLowerCase();
          if (ptLower.includes('gas')) {
            const snap = matchGasStationNearPlace(row.lat, row.lng, fuelSnapshots, 400);
            const chip = snap?.regular ? formatUsdPerGalChip(snap.regular) : null;
            if (chip) {
              return { ...row, gasRegularDisplay: `${chip}/gal regular` };
            }
          }
          return row;
        });
        mapped.sort(
          (a, b) => haversineMeters(lat0, lng0, a.lat, a.lng) - haversineMeters(lat0, lng0, b.lat, b.lng),
        );
        setCategoryExplore((prev) =>
          prev ? { ...prev, loading: false, error: null, results: mapped, subtitle: subtitleExpl } : null,
        );
      });
      return;
    }

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
  }, [location.lat, location.lng, nav, savedPlaces]);

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
      const origin = await getFreshNavigationOrigin(locationRef.current);
      locationRef.current = origin;
      const originOk = isUsableCoordinate(origin);
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
        await new Promise<void>((r) => setTimeout(r, 400));
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
      setFriendFollowSession({
        friendId: p.friendId,
        name: p.name,
        mode: p.isLiveFresh ? 'live' : 'last_known',
        startedLive: p.isLiveFresh,
      });
      friendFollowLastDestRef.current = { lat: p.lat, lng: p.lng };
      friendFollowLastRerouteRef.current = Date.now();
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
      const mode: 'live' | 'last_known' = fresh && fl.isSharing ? 'live' : 'last_known';
      return prev.mode === mode ? prev : { ...prev, mode };
    });
  }, [friendLocations, nav.isNavigating]);

  useEffect(() => {
    const sess = friendFollowSessionRef.current;
    if (!nav.isNavigating || !sess) return;
    const fl = friendLocations.find((x) => String(x.id) === String(sess.friendId));
    if (!fl) return;
    const fresh = isLiveShareFresh(fl.isSharing, fl.lastUpdated || undefined, fl.lat, fl.lng);
    if (!fresh || !fl.isSharing) return;

    const last = friendFollowLastDestRef.current;
    if (!last) return;
    const moved = haversineMeters(last.lat, last.lng, fl.lat, fl.lng);
    const now = Date.now();
    const sinceLastReroute = now - friendFollowLastRerouteRef.current;
    if (moved < FRIEND_FOLLOW_REROUTE_MIN_MOVE_M) return;
    const longJump = moved >= FRIEND_FOLLOW_REROUTE_LONG_JUMP_M;
    if (longJump) {
      if (sinceLastReroute < FRIEND_FOLLOW_REROUTE_LONG_JUMP_MIN_INTERVAL_MS) return;
    } else if (sinceLastReroute < FRIEND_FOLLOW_REROUTE_MIN_INTERVAL_MS) {
      return;
    }
    if (friendFollowRerouteBusyRef.current) return;

    friendFollowRerouteBusyRef.current = true;
    friendFollowLastRerouteRef.current = now;
    friendFollowLastDestRef.current = { lat: fl.lat, lng: fl.lng };

    const place = { name: sess.name, address: `Meet ${sess.name}`, lat: fl.lat, lng: fl.lng };
    navSetDestRef.current({ name: place.name, address: place.address, lat: place.lat, lng: place.lng });

    // SDK mode: `fetchDirections` is a no-op during the trip; push the new destination into
    // `navigationData` so `navLogicCoords` rebuilds and the native SDK fires its own reroute.
    // JS mode: call the JS Directions fetcher as before.
    if (navLogicEffective) {
      nav.updateNavigationDestination(place);
      friendFollowRerouteBusyRef.current = false;
    } else {
      void navFetchRef
        .current(place, locationRef.current, {
          maxHeightMeters: avoidLowClearances ? vehicleHeight : undefined,
        })
        .finally(() => {
          friendFollowRerouteBusyRef.current = false;
        });
    }
  }, [friendLocations, nav.isNavigating, avoidLowClearances, vehicleHeight, navLogicEffective]);

  /** Copy for live friend follow; trips do not earn gems (`dynamicDestination` on route). */
  const friendFollowContextLine = useMemo(() => {
    if (!nav.isNavigating || !friendFollowSession) return null;
    const fl = friendLocations.find((x) => String(x.id) === String(friendFollowSession.friendId));
    const fresh = fl
      ? isLiveShareFresh(fl.isSharing, fl.lastUpdated || undefined, fl.lat, fl.lng)
      : false;
    const name = friendFollowSession.name;
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

  const handleMapCameraChanged = useCallback((state: { properties?: { zoom?: number; heading?: number } }) => {
    const h = state?.properties?.heading;
    if (typeof h === 'number' && Number.isFinite(h)) {
      const headingDeg = ((h % 360) + 360) % 360;
      const last = lastMapCameraHeadingRef.current;
      const now = Date.now();
      const delta = Math.abs(((headingDeg - last.value + 540) % 360) - 180);
      const minDelta = nav.isNavigating ? 1.5 : 0.4;
      const minIntervalMs = nav.isNavigating ? 220 : 80;
      if (delta >= minDelta || now - last.at >= minIntervalMs) {
        lastMapCameraHeadingRef.current = { value: headingDeg, at: now };
        setMapCameraHeadingDeg(headingDeg);
      }
    }
    const z = state?.properties?.zoom;
    if (typeof z !== 'number' || !isFinite(z)) return;
    if (mapZoomDebounceRef.current) clearTimeout(mapZoomDebounceRef.current);
    mapZoomDebounceRef.current = setTimeout(() => {
      mapZoomDebounceRef.current = null;
      setMapZoomLevel(z);
    }, 120);
  }, [nav.isNavigating]);

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
    if (autoRelockTimer.current) {
      clearTimeout(autoRelockTimer.current);
      autoRelockTimer.current = null;
    }
    if (nav.isNavigating) {
      try {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        /* optional */
      }
      lastNavCameraCommandRef.current = null;
      setNavFollowKick((k) => k + 1);
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

  const handleRouteOverview = useCallback(() => {
    if (!nav.isNavigating) return;

    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      /* optional */
    }

    const route = firstPolylineUsableForOverview([
      nav.navigationData?.polyline,
      polylineToRender ?? undefined,
      stickyRoutePolyline ?? undefined,
      nav.sdkRoutePolyline?.length ? nav.sdkRoutePolyline : undefined,
      nav.navigationProgress?.routePolyline,
      navLogicCoords.length >= 2 ? navLogicCoords : undefined,
    ]);

    if (!route || route.length < 2) {
      Alert.alert(
        'Route overview',
        'The full route shape is still loading. Try again in a few seconds.',
      );
      return;
    }

    const dest = nav.navigationData?.destination;
    const lngs = [
      ...route.map((c) => c.lng),
      navDisplayCoord.lng,
      dest && Number.isFinite(dest.lng) ? dest.lng : NaN,
    ].filter(Number.isFinite) as number[];
    const lats = [
      ...route.map((c) => c.lat),
      navDisplayCoord.lat,
      dest && Number.isFinite(dest.lat) ? dest.lat : NaN,
    ].filter(Number.isFinite) as number[];
    if (lngs.length < 2 || lats.length < 2) {
      Alert.alert('Route overview', 'Could not frame this route right now.');
      return;
    }

    let maxLng = Math.max(...lngs);
    let minLng = Math.min(...lngs);
    let maxLat = Math.max(...lats);
    let minLat = Math.min(...lats);
    const spanLng = Math.max(maxLng - minLng, 0.00035);
    const spanLat = Math.max(maxLat - minLat, 0.00035);
    const padLng = Math.max(spanLng * 0.12, 0.001);
    const padLat = Math.max(spanLat * 0.12, 0.001);
    maxLng += padLng;
    minLng -= padLng;
    maxLat += padLat;
    minLat -= padLat;

    if (autoRelockTimer.current) clearTimeout(autoRelockTimer.current);
    userInteracting.current = true;
    setCameraLocked(false);
    setFollowMode('free');

    const winH = Dimensions.get('window').height;
    const topPad = insets.top + 170;
    const sidePad = 40;
    const bottomPad = Math.min(
      Math.round(winH * 0.48),
      MAP_NAV_BOTTOM_INSET + insets.bottom + 56,
    );

    const ne: [number, number] = [maxLng, maxLat];
    const sw: [number, number] = [minLng, minLat];
    const padding = {
      paddingTop: topPad,
      paddingRight: sidePad,
      paddingBottom: bottomPad,
      paddingLeft: sidePad,
    };

    const runOverviewCamera = () => {
      const cam = cameraRef.current;
      if (!cam) return;
      try {
        if (typeof cam.setCamera === 'function') {
          cam.setCamera({
            type: 'CameraStop',
            bounds: { ne, sw },
            padding,
            animationDuration: 520,
            animationMode: 'easeTo',
            pitch: 28,
          });
        } else if (typeof cam.fitBounds === 'function') {
          cam.fitBounds(ne, sw, [topPad, sidePad, bottomPad, sidePad], 520);
        }
      } catch (err) {
        if (__DEV__) console.warn('[MapScreen] route overview camera failed', err);
      }
    };

    InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => requestAnimationFrame(runOverviewCamera));
    });

    autoRelockTimer.current = setTimeout(() => {
      if (nav.isNavigating) {
        lastNavCameraCommandRef.current = null;
        setNavFollowKick((k) => k + 1);
        setCameraLocked(true);
        userInteracting.current = false;
        setFollowMode('follow');
      }
    }, 9000);
  }, [
    insets.bottom,
    insets.top,
    nav.isNavigating,
    nav.navigationData?.polyline,
    nav.navigationData?.destination?.lat,
    nav.navigationData?.destination?.lng,
    nav.sdkRoutePolyline,
    nav.navigationProgress?.routePolyline,
    navDisplayCoord.lat,
    navDisplayCoord.lng,
    polylineToRender,
    stickyRoutePolyline,
    navLogicCoords,
  ]);

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
          /**
           * Pick the candidate **closest to the tap point** (was: first within
           * 60m — which in dense areas often grabbed an adjacent business).
           */
          const candidates = nearby.map((p: any) => ({
            name: String(p.name ?? ''),
            address: p.address ?? p.vicinity ?? '',
            lat: typeof p.lat === 'number' ? p.lat : Number(p.lat),
            lng: typeof p.lng === 'number' ? p.lng : Number(p.lng),
            place_id: typeof p.place_id === 'string' ? p.place_id : undefined,
            placeType: Array.isArray(p.types) && p.types[0] ? String(p.types[0]) : undefined,
            price_level: typeof p.price_level === 'number' ? p.price_level : undefined,
            open_now: typeof p.open_now === 'boolean' ? p.open_now : undefined,
            rating: typeof p.rating === 'number' ? p.rating : undefined,
            photo_reference: typeof p.photo_reference === 'string' ? p.photo_reference : undefined,
          }));
          const best = pickNearestNearby(candidates, { lat: tapLat, lng: tapLng }, 60);
          if (best) {
            const p = best.row;
            setSelectedPlace({
              name: p.name,
              address: p.address ?? '',
              lat: p.lat,
              lng: p.lng,
              placeType: p.placeType,
              price_level: p.price_level ?? undefined,
              open_now: typeof p.open_now === 'boolean' ? p.open_now : undefined,
              rating: p.rating ?? undefined,
              photo_reference: p.photo_reference ?? undefined,
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
      {isSearchFocused && !nav.isNavigating && (
        <Pressable
          style={[StyleSheet.absoluteFillObject, { zIndex: 14, backgroundColor: 'transparent' }]}
          onPress={() => { Keyboard.dismiss(); setIsSearchFocused(false); }}
        />
      )}

      {navLogicEffective && nav.isNavigating && mapTabFocused && navLogicCoords.length >= 2 ? (
        // Headless native session: this module has no separate "createSession" API — the hidden view
        // drives logic + voice. IMPORTANT: `mapTabFocused` prevents a second nav session from spawning
        // when the user opts into `NativeNavigationScreen` (full-screen), which would otherwise fight
        // this hidden session for GPS / routing.
        <MapboxNavigationView
          ref={navLogicRef}
          style={{ position: 'absolute', width: 2, height: 2, opacity: 0, bottom: 0, right: 0, zIndex: -1 }}
          pointerEvents="none"
          navigationLogicOnly
          coordinates={navLogicCoords}
          mute={navVoiceMuted}
          locale="en-US"
          routeProfile={routeProfileForPlatform()}
          drivingMode={drivingMode}
          followingZoom={navLogicFollowingZoom}
          followingPitch={navLogicFollowingPitch}
          disableAlternativeRoutes
          {...(navLogicVehicleMaxHeight != null ? { vehicleMaxHeight: navLogicVehicleMaxHeight } : {})}
          onRoutesLoaded={handleSdkRoutesLoaded}
          onRouteFailedToLoad={(e: { nativeEvent: { errorMessage?: string } }) =>
            handleNavLogicFailure(e.nativeEvent?.errorMessage)
          }
          onNavigatorError={(e: { nativeEvent: { message?: string } }) =>
            handleNavLogicFailure(e.nativeEvent?.message)
          }
          onRouteProgressChanged={(e: { nativeEvent: SdkProgressPayload }) => ingestSdkProgress(e.nativeEvent)}
          onCameraStateChanged={(e: { nativeEvent: SdkCameraPayload }) => ingestSdkCameraState(e.nativeEvent)}
          onLaneVisualsChanged={(e: { nativeEvent: { lanes?: NativeLaneAsset[] } }) =>
            ingestSdkLaneAssets(e.nativeEvent?.lanes ?? null)
          }
          onVoiceInstruction={(e: { nativeEvent: { text?: string } }) =>
            handleSdkVoiceInstruction(e.nativeEvent.text)
          }
          onNavigationLocationUpdate={(e: { nativeEvent: SdkLocationPayload }) =>
            ingestSdkLocation(e.nativeEvent)
          }
          onRouteChanged={handleSdkRouteChanged}
          onFinalDestinationArrival={handleSdkFinalDestinationArrival}
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
          {/*
            Location provider — single **display** coordinate while navigating:

            `useDriveNavigation.navigationProgressCoord` is fused matcher / snap
            truth; `navDisplayCoord` is the stabilized point (fraction ease + leash
            + `stabilizeDisplayPosition`) fed here, to `NavSdkPuck`, and to the JS
            nav camera anchor so puck, provider, split, and camera stay aligned.

            Explore: smoothed `useLocation` via browse `CustomLocationProvider` below.

            Mount as soon as `nav.isNavigating` with a finite `navDisplayCoord`.
          */}
          {nav.isNavigating &&
          Number.isFinite(navDisplayCoord.lat) &&
          Number.isFinite(navDisplayCoord.lng) ? (
            <>
              <MapboxGL.CustomLocationProvider
                coordinate={[navDisplayCoord.lng, navDisplayCoord.lat]}
                heading={
                  navLogicEffective && nav.isNavigating && (!Number.isFinite(navPuckHeading) || navPuckHeading < 0)
                    ? 0
                    : Number.isFinite(navPuckHeading) && navPuckHeading >= 0
                      ? navPuckHeading
                      : heading
                }
              />
              {navLogicDebugEnabled()
                ? (() => {
                    logNavVerify('provider.mount', {
                      mounted: true,
                      sdkPuckOwns,
                      navDisplayHeadingValid: Number.isFinite(navPuckHeading),
                      fallbackHeading: !Number.isFinite(navPuckHeading),
                      lat: navDisplayCoord.lat,
                      lng: navDisplayCoord.lng,
                    });
                    return null;
                  })()
                : null}
            </>
          ) : Number.isFinite(location.lat) && Number.isFinite(location.lng) ? (
            /**
             * Browse-mode `CustomLocationProvider`. The default Mapbox
             * `LocationPuck` subscribes to the OS location manager directly
             * and draws whatever raw GPS fix it gets every tick — that's
             * the "puck ticks / moves around when browsing" symptom: raw
             * GPS wanders 2–5 m at standstill and the puck jitters with
             * every sample. `useLocation` already produces a heavily-
             * smoothed fix (dead-zone + EWMA + outlier gate, see
             * `smoothPosition`) that the rest of the app uses; by feeding
             * that same smoothed coord into `CustomLocationProvider` the
             * default `LocationPuck` now reads a stable, low-pass-filtered
             * point instead of raw GPS, so it sits still when the user is
             * still and slides smoothly when they move.
             *
             * Heading uses the smoothed `heading` from `useLocation`
             * (compass + course-over-ground blend). When the fix is
             * invalid we simply don't mount and Mapbox falls back to its
             * built-in provider — existing behaviour for the "no GPS yet"
             * edge.
             */
            <MapboxGL.CustomLocationProvider
              coordinate={[location.lng, location.lat]}
              heading={Number.isFinite(heading) ? heading : 0}
            />
          ) : null}
          {standardStyleImportsEnabled && MapboxGL.StyleImport ? (
            <MapboxGL.StyleImport
              key={`basemap-${mapLightPreset}-${drivingMode}-${isSatelliteStyle ? 'sat' : 'std'}`}
              id="basemap"
              existing
              config={standardBasemapImportConfig}
            />
          ) : null}
          {/* Camera: Mapbox follow + useCameraController (single owner — no parallel setCamera nav hook). */}
          <MapboxGL.Camera
            key={nav.isNavigating ? `nav-follow-${navCameraSessionKey}` : 'map-camera-explore'}
            ref={cameraRef}
            defaultSettings={{
              centerCoordinate: stableCenter,
              zoomLevel: modeConfig.exploreZoom,
              pitch: modeConfig.explorePitch,
            }}
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
              (camCtrlForNav ? camCtrlForNav.animationDuration : animDuration) +
              (nav.isNavigating && cameraLocked ? 90 : 0)
            }
            followUserLocation={cameraFollowsDeviceGps}
            followUserMode={
              cameraFollowsDeviceGps
                ? compassMode || followMode === 'heading'
                  ? MapboxGL.UserTrackingMode.FollowWithHeading
                  : exploreTracksUser && followMode === 'follow'
                    ? MapboxGL.UserTrackingMode.Follow
                    : undefined
                : undefined
            }
            followPitch={
              nav.isNavigating
                ? undefined
                : camCtrlForNav
                  ? camCtrlForNav.followPitch
                  : exploreTracksUser
                    ? modeConfig.explorePitch
                    : compassMode
                      ? 45
                      : undefined
            }
            followZoomLevel={
              nav.isNavigating
                ? undefined
                : camCtrlForNav
                  ? camCtrlForNav.followZoomLevel
                  : exploreTracksUser
                    ? modeConfig.exploreZoom
                    : compassMode
                      ? 15
                      : undefined
            }
            followPadding={
              nav.isNavigating
                ? undefined
                : camCtrlForNav
                  ? camCtrlForNav.followPadding
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
          {showTraffic && <TrafficLayer />}
          <IncidentHeatmap incidents={nearbyIncidents} visible={showIncidents} />
          {showPhotoReports && (
            <PhotoReportMarkers reports={photoReports} onReportTap={(r) => setSelectedPhotoReport(r)} />
          )}
          {trafficSafetyWanted && isTrafficSafetyLayerEnabled(poiSearchCoord.lat, poiSearchCoord.lng) && !nav.showRoutePreview && mapZoomLevel >= TRAFFIC_CAM_MIN_ZOOM && (
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
              const lineOpacity = Math.min(
                0.78,
                isSatelliteStyle || mapLightPreset === 'night' ? 0.52 : 0.44,
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
                      lineColor: '#0A84FF',
                      lineWidth: 7,
                      lineOpacity,
                      lineCap: 'round',
                      lineJoin: 'round',
                    }}
                  />
                </MGL.ShapeSource>
              );
            });
          })()}

          {/*
            Route-line authority: `polylineToRender` (useMemo + sticky state) —
            native `navigationProgress.routePolyline` when present; else REST;
            else last-known-good during transient handoffs. See `sdkRouteOwns`.
          */}
          {polylineToRender && polylineToRender.length >= 2
            ? (() => {
                const sdkLen = nav.navigationProgress?.routePolyline?.length ?? 0;
                const restLen = nav.navigationData?.polyline?.length ?? 0;
                const source =
                  sdkLen >= 2 && polylineToRender === nav.navigationProgress?.routePolyline
                    ? 'sdk'
                    : restLen >= 2 && polylineToRender === nav.navigationData?.polyline
                      ? 'rest'
                      : 'sticky';
                logNavVerify('render.polyline', {
                  sdkRouteOwns,
                  sdkPolylineLen: sdkLen,
                  navDataPolylineLen: restLen,
                  stickyLen: stickyRoutePolyline?.length ?? 0,
                  source,
                  renderedLen: polylineToRender.length,
                });
                return (
                  <RouteOverlay
                    key={routeOverlayLineKey}
                    polyline={polylineToRender}
                    isNavigating={nav.isNavigating}
                    routeSplit={navigationRouteSplit}
                    fractionTraveled={null}
                    routeColor={navRouteColors.routeColor}
                    casingColor={navRouteColors.routeCasing}
                    passedColor={navRouteColors.passedColor}
                    routeWidth={modeConfig.routeWidth}
                    glowColor={navRouteColors.routeGlowColor}
                    glowOpacity={navRouteColors.routeGlowOpacity}
                    congestion={nav.navigationData?.congestion}
                    showCongestion={
                      modeConfig.showCongestion &&
                      (nav.isNavigating || nav.showRoutePreview)
                    }
                    isRerouting={nav.isRerouting || sdkRouteHandoffUi}
                    belowLayerID={buildingsBelowLayerId}
                  />
                );
              })()
            : (() => {
                logNavVerify('render.polyline', {
                  sdkRouteOwns,
                  sdkPolylineLen: nav.navigationProgress?.routePolyline?.length ?? 0,
                  navDataPolylineLen: nav.navigationData?.polyline?.length ?? 0,
                  stickyLen: stickyRoutePolyline?.length ?? 0,
                  source: 'none',
                });
                return null;
              })()}

          <OfferMarkers offers={recommendedNearbyOffers} zoomLevel={mapZoomLevel} onOfferTap={setSelectedOffer} />
          {showIncidents && <ReportMarkers incidents={nearbyIncidents.filter((inc) => {
            if ((inc.upvotes ?? 0) < 0) return false;
            if (inc.type === 'construction') return showConstruction;
            return true;
          })} onIncidentTap={setActiveReportCard} zoomLevel={mapZoomLevel} />}
          {cameraPoisWanted && (
            <CameraMarkers
              cameras={cameraLocations}
              onCameraTap={(cam) => setSelectedTrafficCamera(cam)}
              zoomLevel={mapZoomLevel}
              isNavigating={nav.isNavigating}
              referenceCoordinate={nav.isNavigating ? navDisplayCoord : null}
            />
          )}
          <FriendMarkers
            zoomLevel={mapZoomLevel}
            friends={friendLocationsVisible}
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
          {!nav.isNavigating && !nav.showRoutePreview && localStationGasMarkers.length > 0 && (
            <GasPriceMarkers
              points={localStationGasMarkers}
              zoomLevel={mapZoomLevel}
              referenceCoordinate={
                Number.isFinite(location.lat) && Number.isFinite(location.lng)
                  ? { lat: location.lat, lng: location.lng }
                  : null
              }
            />
          )}

          {(nav.selectedDestination || selectedPlace) && (
            <MapboxGL.MarkerView
              id="dest-pin"
              coordinate={[
                (nav.selectedDestination?.lng ?? selectedPlace?.lng ?? 0),
                (nav.selectedDestination?.lat ?? selectedPlace?.lat ?? 0),
              ]}
              anchor={{ x: 0.5, y: 1 }}
              allowOverlap
              // Keep the destination pin visible above Standard 3D buildings
              // and landmarks at pitched nav camera angles (same workaround
              // as POI markers — Mapbox view annotations otherwise cull near
              // the puck's collision region on v11).
              allowOverlapWithPuck
            >
              <View style={s.destPinWrap}>
                <View style={s.destPin}><Ionicons name="location-sharp" size={20} color="#fff" /></View>
                <View style={s.destPinTail} />
              </View>
            </MapboxGL.MarkerView>
          )}

          {/*
            Two pucks must never be on screen at once. Rule:
              - Explore (not navigating): show the default `LocationPuck`
                (raw device GPS + compass, with pulsing).
              - Navigating: hide `LocationPuck` entirely and show
                `NavSdkPuck` fed from `navDisplayCoord` / `navPuckHeading` (course-first, tangent only on fork).
                This is the on-polyline snapped coord with the same smoothed
                bearing that `CustomLocationProvider` feeds to the camera, so
                puck + camera + route split all sit on a single point from
                the very first frame of the trip — no "raw-GPS chevron visible
                for 500 ms while the SDK warms up" seam.
            The hidden `MapboxNavigationView` still provides matched points; a
            single RAF-smoothed route fraction above feeds the provider,
            route split, camera anchor, and `NavSdkPuck`. `NavSdkPuck` eases
            MarkerView coords lightly so small upstream ticks do not pop the chevron.
          */}
          <MapboxGL.LocationPuck
            visible={!nav.isNavigating}
            androidRenderMode="normal"
            puckBearingEnabled
            puckBearing={locationPuckBearing}
            pulsing={{ isEnabled: !nav.isNavigating }}
            scale={1.76}
          />
          {nav.isNavigating &&
          Number.isFinite(navDisplayCoord.lat) &&
          Number.isFinite(navDisplayCoord.lng) ? (
            <NavSdkPuck
              lng={navDisplayCoord.lng}
              lat={navDisplayCoord.lat}
              course={Number.isFinite(navPuckHeading) ? navPuckHeading : -1}
              mapBearingDeg={navPuckMapBearingDeg}
              color={navRouteColors.routeColor}
              accuracy={nav.sdkNavLocation?.horizontalAccuracy ?? null}
              speedMps={
                nav.sdkNavLocation?.speed ??
                nav.navigationProgress?.displayCoord?.speedMps ??
                0
              }
              mirrorNativePosition
            />
          ) : null}
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
          detailHint={placeCardFuelHint(selectedPlace, selectedPlaceGasSnap)}
          distanceMeters={placeCardDistanceMeters}
          photoRef={selectedPlace.photo_reference ?? null}
          rating={selectedPlace.rating ?? null}
          priceLevel={selectedPlace.price_level ?? null}
          openNow={selectedPlace.open_now ?? null}
          isLight={isLight}
          accent={{
            primary: colors.primary,
            gradientStart: colors.ctaGradientStart,
            gradientEnd: colors.ctaGradientEnd,
          }}
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
          accent={{
            primary: colors.primary,
            gradientStart: colors.ctaGradientStart,
            gradientEnd: colors.ctaGradientEnd,
          }}
          initialPhotoRef={selectedPlace?.photo_reference ?? null}
          travelProfile={nav.travelProfile}
          onTravelProfileChange={nav.setTravelProfile}
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
        visible={!nav.isNavigating}
        topInset={insets.top}
        colors={colors}
        styles={s}
        showMenu={showMenu}
        setShowMenu={setShowMenu}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        isSearchFocused={isSearchFocused}
        setIsSearchFocused={(v) => {
          setIsSearchFocused(v);
          if (v && nav.showRoutePreview) {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            nav.cancelRoutePreview();
          }
        }}
        onSubmitSearch={() => {
          void commitSearch();
        }}
        onClearSearch={handleClearSearch}
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
        gasChipAvgRegular={gasChipAvgRegularShort}
        gasChipPriceSource={gasChipPriceSource}
        bottomChromeReserve={tabBarHeight + 8}
        floatingMapTools={
          !nav.showRoutePreview ? (
            <View style={s.mapToolStack} pointerEvents="box-none">
              <TouchableOpacity
                style={[
                  s.mapHudTile,
                  {
                    backgroundColor: hudChromeGlass.tileFill,
                    borderColor: hudChromeGlass.tileBorder,
                  },
                ]}
                activeOpacity={0.82}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowStylePicker(true);
                }}
                accessibilityLabel="Map layers and style"
              >
                <Ionicons name="layers-outline" size={20} color="#F8FAFC" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  s.mapHudTile,
                  {
                    backgroundColor:
                      followMode === 'heading'
                        ? 'rgba(59,130,246,0.82)'
                        : followMode === 'follow'
                          ? 'rgba(16,185,129,0.82)'
                          : hudChromeGlass.tileFill,
                    borderColor:
                      followMode !== 'free' ? 'rgba(255,255,255,0.42)' : hudChromeGlass.tileBorder,
                  },
                ]}
                activeOpacity={0.82}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setFollowMode((prev) => {
                    const next = prev === 'free' ? 'follow' : prev === 'follow' ? 'heading' : 'free';
                    if (next === 'follow') {
                      setIsExploring(false);
                      setCompassMode(false);
                      setCameraLocked(true);
                    } else if (next === 'heading') {
                      setIsExploring(false);
                      setCompassMode(true);
                      setCameraLocked(true);
                    } else {
                      setCompassMode(false);
                    }
                    return next;
                  });
                }}
                accessibilityLabel="Map orientation: free map, follow, or heading"
              >
                <Ionicons
                  name={followMode === 'heading' ? 'navigate' : followMode === 'follow' ? 'locate' : 'compass-outline'}
                  size={20}
                  color="#F8FAFC"
                />
              </TouchableOpacity>
              {!activeTripSummary && !selectedPlace && !selectedPlaceId && (
                <SpotlightTarget id="map.orionFab" style={{ alignItems: 'center' }}>
                  <OrionQuickMic
                    visible={!showOrion}
                    compactHudFab
                    hudGlassTile={{
                      backgroundColor: hudChromeGlass.tileFill,
                      borderColor: hudChromeGlass.tileBorder,
                    }}
                    interactionMode="explore"
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
                      } else if (action.type === 'mute_voice') {
                        setNavVoiceMuted(true);
                        stopSpeaking();
                      } else if (action.type === 'unmute_voice') {
                        setNavVoiceMuted(false);
                      }
                    }}
                  />
                </SpotlightTarget>
              )}
            </View>
          ) : null
        }
      />

      {/* ═══ TURN CARD — 3-state model (preview / active / confirm + cruise); same gradients per mode ═ */}
      {nav.isNavigating && nav.navigationProgress && (() => {
        const prog = nav.navigationProgress!;
        const instructionSrc = prog.instructionSource;

        if (instructionSrc === 'sdk_waiting') {
          return (
            <View style={[s.turnWrap, { top: insets.top }]} key="nav-turn-hybrid">
              <TurnInstructionCard
                mode={drivingMode}
                modeConfig={modeConfig}
                state="active"
                distanceValue="—"
                distanceUnit=""
                primaryInstruction={prog.banner?.primaryInstruction ?? 'Syncing route with your location…'}
                secondaryInstruction={undefined}
                navSdkDrivesContent
                textStabilityKey="sdk-waiting"
                maneuverForIcon="straight"
                maneuverKind="straight"
                isMuted={navVoiceMuted}
                onMutePress={handleNavVoiceToggle}
                lanesJson={undefined}
                step={undefined}
                roadDisambiguationLabel={null}
                isSportBorder={useModeHudBorder}
                speedMph={displaySpeedMph}
              />
            </View>
          );
        }

        /**
         * Headless Navigation SDK: maneuver copy from native banner + step (with gap hold for
         * empty-tick glitches). **Distance always** from the latest `onRouteProgressChanged`
         * payload via `sdkManeuverDisplayDistanceFromProgress` (same as `navSdkStore` + minimal
         * adapter) — do not use `navigationProgressGuidance.banner` or gap snapshots here; that
         * object is intentionally stable for text identity and can lag by a bucket or a frame.
         */
        if (instructionSrc === 'sdk') {
          const live = prog;
          const g = sdkStepGap;
          const cardProg = nav.navigationProgressGuidance ?? live;
          const b = cardProg.banner ?? null;
          const primary = (g?.holdPrimary ?? (b?.primaryInstruction ?? '')).replace(/\s+/g, ' ').trim();
          const secondary =
            (g?.holdSecondary ?? b?.secondaryInstruction?.replace(/\s+/g, ' ').trim()) || undefined;
          const liveNs = live.nextStep;
          const maneuverIconKey = g
            ? g.holdManeuverIcon
            : liveNs?.kind === 'unknown' || liveNs?.kind == null
              ? 'straight'
              : String(liveNs.kind);
          const manKind = g ? g.holdManKind : (liveNs?.kind ?? b?.maneuverKind ?? 'straight');
          const textStabKey = sdkGuidanceStabilityKey(liveNs, live.nativeStepIdentity?.legIndex);
          const p = nav.sdkNavProgress;
          const nativeTurnDistance: NativeFormattedDistance | null = p
            ? sdkManeuverDisplayDistanceFromProgress(p)
            : (() => {
                const m = live.nextStepDistanceMeters;
                if (typeof m === 'number' && Number.isFinite(m) && m >= 0) {
                  return formatImperialManeuverDistance(m, { omitNowLabel: true });
                }
                return null;
              })();
          const useNativeTurnDistance = !!nativeTurnDistance?.value;
          const sdkNS = liveNs;
          const gapContinuing = g?.holdPrimary === 'Continuing…';
          const sdkTurnSignal = (() => {
            if (!g) return sdkNS?.signal;
            if (gapContinuing) return undefined;
            if (g.holdSignal) return g.holdSignal;
            return sdkNS?.signal;
          })();
          const sdkTurnLanes = (() => {
            if (!g) return sdkNS?.lanes?.length ? sdkNS.lanes : live.nextStep?.lanes ?? [];
            if (gapContinuing) return [];
            if (g.holdLanes.length) return g.holdLanes;
            return sdkNS?.lanes?.length ? sdkNS.lanes : live.nextStep?.lanes ?? [];
          })();
          const sdkTurnShields = (() => {
            if (!g) return sdkNS?.shields?.length ? sdkNS.shields : live.nextStep?.shields ?? [];
            if (gapContinuing) return [];
            if (g.holdShields.length) return g.holdShields;
            return sdkNS?.shields?.length ? sdkNS.shields : live.nextStep?.shields ?? [];
          })();
          const sdkTurnRbExit = (() => {
            if (!g) return sdkNS?.roundaboutExitNumber ?? live.nextStep?.roundaboutExitNumber ?? null;
            if (gapContinuing) return null;
            if (g.holdRoundaboutExit != null) return g.holdRoundaboutExit;
            return sdkNS?.roundaboutExitNumber ?? live.nextStep?.roundaboutExitNumber ?? null;
          })();

          return (
            <View style={[s.turnWrap, { top: insets.top }]} key="nav-turn-hybrid">
              <TurnInstructionCard
                mode={drivingMode}
                modeConfig={modeConfig}
                state="active"
                distanceValue="—"
                distanceUnit=""
                primaryInstruction={primary}
                secondaryInstruction={secondary}
                textStabilityKey={textStabKey}
                navSdkDrivesContent
                nativeFormattedDistance={useNativeTurnDistance ? nativeTurnDistance : undefined}
                isNativeMirror={useNativeTurnDistance}
                nativeLaneAssets={nav.sdkNativeLaneAssets}
                maneuverForIcon={maneuverIconKey}
                maneuverKind={manKind}
                maneuverType={g ? g.holdRawType : sdkNS?.rawType ?? ''}
                maneuverModifier={g ? g.holdRawMod : sdkNS?.rawModifier ?? ''}
                signal={sdkTurnSignal}
                lanes={sdkTurnLanes}
                shields={sdkTurnShields}
                roundaboutExitNumber={sdkTurnRbExit}
                chainInstruction={null}
                isMuted={navVoiceMuted}
                onMutePress={handleNavVoiceToggle}
                lanesJson={undefined}
                step={undefined}
                roadDisambiguationLabel={null}
                isSportBorder={useModeHudBorder}
                speedMph={displaySpeedMph}
              />
            </View>
          );
        }

        const banner = prog.banner ?? null;
        const nextIdx = prog?.nextStep?.index;
        const nextStepIsCurrentStep =
          nextIdx != null && nextIdx <= nav.currentStepIndex;

        const nextManeuverCoord =
          nextIdx != null && !nextStepIsCurrentStep && nav.navigationData?.steps
            ? nav.navigationData.steps[nextIdx] ?? upcomingGuidanceStep
            : upcomingGuidanceStep;

        const turnCardManeuverFields = resolveManeuverFieldsForTurnCard({
          nextManeuverCoord: nextManeuverCoord ?? undefined,
          progNext: prog.nextStep ?? null,
          sdkAuthoritative: false,
        });

        const turnCurrentStep = currentStep;

        const poly = nav.navigationData?.polyline;

        const liveDistMeters = sdkBannerOwns
          ? Math.max(
              0,
              Number.isFinite(prog.nextStepDistanceMeters) ? prog.nextStepDistanceMeters : 0,
            )
          : prog != null && Number.isFinite(prog.nextStepDistanceMeters) && !nextStepIsCurrentStep
            ? prog.nextStepDistanceMeters
            : poly && poly.length >= 2 && nextManeuverCoord && isFinite(nextManeuverCoord.lat) && isFinite(nextManeuverCoord.lng)
              ? alongRouteDistanceMeters(poly, navDisplayCoord, { lat: nextManeuverCoord.lat, lng: nextManeuverCoord.lng })
              : nextManeuverCoord && isFinite(nextManeuverCoord.lat) && isFinite(nextManeuverCoord.lng)
                ? haversineMeters(navDisplayCoord.lat, navDisplayCoord.lng, nextManeuverCoord.lat, nextManeuverCoord.lng)
                : (turnCurrentStep?.distanceMeters ?? 0);

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

        /**
         * Turn-card distance presentation.
         *
         * @see formatImperialManeuverDistance — at cruise with no real maneuver, use "—" so
         * we never show a false countdown; otherwise meters → mi/ft/Now.
         */
        const hasActionableMeters =
          Number.isFinite(liveDistMeters) &&
          liveDistMeters > 5 &&
          nextManeuverCoord != null &&
          nextManeuverCoord.maneuver !== 'depart';
        const distPartsBase = (() => {
          if (cardState === 'cruise' && !hasActionableMeters) return { value: '—', unit: '' };
          return formatImperialManeuverDistance(liveDistMeters, { omitNowLabel: true });
        })();
        const destinationName = nav.navigationData?.destination?.name ?? null;

        const useBannerCopy =
          !!banner &&
          (sdkBannerOwns || !!nextManeuverCoord);

        let primary: string;
        let secondary: string | undefined;

        if (useBannerCopy) {
          switch (cardState) {
            case 'cruise':
              primary = sdkBannerOwns
                ? banner!.primaryInstruction
                : nextManeuverCoord
                  ? buildCruisePrimary(nextManeuverCoord, destinationName)
                  : banner!.primaryInstruction;
              secondary = undefined;
              break;
            case 'confirm':
              primary = sdkBannerOwns
                ? banner!.primaryInstruction
                : turnCurrentStep
                  ? buildConfirmPrimary(turnCurrentStep)
                  : banner!.primaryInstruction;
              secondary = banner!.secondaryInstruction ?? undefined;
              if (drivingMode === 'sport' && displaySpeedMph > 50) secondary = undefined;
              break;
            case 'preview':
            case 'active':
            default:
              primary = banner!.primaryInstruction;
              secondary = banner!.secondaryInstruction ?? undefined;
              if (drivingMode === 'sport' && displaySpeedMph > 50) secondary = undefined;
              break;
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
        const chainInstruction = buildChainInstruction(prog.nextStep);
        const maneuverKindResolved = banner?.maneuverKind ?? iconManeuverKindForState(cardState, prog.nextStep);
        const maneuverKindForCard = turnCardManeuverFields.rawType.trim() || turnCardManeuverFields.rawModifier.trim()
          ? turnCardManeuverFields.kind
          : maneuverKindResolved;
        const signalResolved = banner?.signal ?? prog.nextStep?.signal;
        const lanesResolved = banner?.lanes?.length
          ? banner.lanes
          : prog.nextStep?.lanes?.length
            ? prog.nextStep.lanes
            : undefined;
        const shieldsResolved = banner?.shields?.length
          ? banner.shields
          : prog.nextStep?.shields?.length
            ? prog.nextStep.shields
            : undefined;
        const roundaboutExitResolved = banner?.roundaboutExitNumber ?? prog.nextStep?.roundaboutExitNumber ?? null;
        const disambigName =
          shouldShowRoadDisambiguation(turnCurrentStep?.name) ? (turnCurrentStep?.name ?? null) :
          shouldShowRoadDisambiguation(nextManeuverCoord?.name) ? (nextManeuverCoord?.name ?? null) :
          null;

        /** Align banner/lanes/icons with Mapbox step geometry (see `currentStepIndexAlongRoute`). */
        const guidanceStep = pickGuidanceStep(cardState, turnCurrentStep, nextManeuverCoord);
        const actionableGuidanceStep =
          isActionableGuidanceStep(guidanceStep, true) ? guidanceStep : (isActionableGuidanceStep(nextManeuverCoord, true) ? nextManeuverCoord : undefined);

        const turnTextStabilityKey = null;

        return (
          <View style={[s.turnWrap, { top: insets.top }]} key="turn-card-stable">
            <TurnInstructionCard
              mode={drivingMode}
              modeConfig={modeConfig}
              state={cardState}
              distanceValue={distPartsBase.value}
              distanceUnit={distPartsBase.unit}
              primaryInstruction={primary}
              textStabilityKey={turnTextStabilityKey}
              nativeLaneAssets={nav.sdkNativeLaneAssets}
              secondaryInstruction={secondary}
              maneuverForIcon={maneuverIconKey}
              maneuverKind={maneuverKindForCard}
              maneuverType={turnCardManeuverFields.rawType}
              maneuverModifier={turnCardManeuverFields.rawModifier}
              signal={signalResolved}
              lanes={lanesResolved}
              shields={shieldsResolved}
              roundaboutExitNumber={roundaboutExitResolved}
              chainInstruction={chainInstruction}
              isMuted={navVoiceMuted}
              onMutePress={handleNavVoiceToggle}
              lanesJson={mergeLaneSources(
                actionableGuidanceStep,
                nextManeuverCoord,
                cardState === 'confirm' ? turnCurrentStep : undefined,
              )}
              step={
                actionableGuidanceStep ?? nextManeuverCoord ?? (cardState === 'confirm' ? turnCurrentStep : undefined)
              }
              roadDisambiguationLabel={disambigName}
              isSportBorder={useModeHudBorder}
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

      <TrafficCongestionBanner
        visible={modeConfig.showTrafficBar && nav.isNavigating && !nav.isRerouting && !trafficBannerDismissed}
        topInset={insets.top + (nav.isNavigating ? 150 : 100)}
        congestion={nav.navigationData?.congestion}
        analyzeCongestion={analyzeCongestion}
        setDismissed={setTrafficBannerDismissed}
        fetchReroute={async () => {
          if (navLogicEffective) return { ok: false, message: 'Reroute is handled by Navigation SDK.' };
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
          isRerouting={nav.isRerouting || sdkRouteHandoffUi}
          onEndNavigation={nav.stopNavigation}
          bottomInset={insets.bottom}
          voiceMuted={navVoiceMuted}
          onVoiceToggle={handleNavVoiceToggle}
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
        travelProfile={nav.travelProfile}
        onTravelProfileChange={nav.setTravelProfile}
        modeConfig={modeConfig}
        currentAddress={currentAddress}
        selectedDestinationAddress={nav.selectedDestination?.address}
        hasTallVehicle={hasTallVehicle}
        vehicleHeight={vehicleHeight}
        avoidLowClearances={avoidLowClearances}
        setAvoidLowClearances={setAvoidLowClearances}
        analyzeCongestion={analyzeCongestion}
        onStartNavigationPress={async () => {
          setSelectedPlaceId(null);
          setSelectedPlace(null);
          if (nav.navigationData) {
            const freshOrigin = await getFreshNavigationOrigin(locationRef.current);
            locationRef.current = freshOrigin;
            const previewOrigin = nav.navigationData.origin;
            const originDriftMeters =
              isUsableCoordinate(previewOrigin) && isUsableCoordinate(freshOrigin)
                ? haversineMeters(previewOrigin.lat, previewOrigin.lng, freshOrigin.lat, freshOrigin.lng)
                : 0;
            if (originDriftMeters >= NAV_ORIGIN_REROUTE_DISTANCE_M) {
              const reroute = await nav.fetchDirections(
                nav.navigationData.destination,
                freshOrigin,
                {
                  maxHeightMeters: avoidLowClearances ? vehicleHeight : undefined,
                  fastSingleRoute: true,
                },
              );
              if (!reroute.ok) {
                Alert.alert('Updating route', reroute.message ?? 'Could not refresh the route from your current position.');
                return;
              }
            }
          }
          if (
            navNativeFullScreenEnabled() &&
            nav.navigationData &&
            location &&
            nav.travelProfile !== 'walking'
          ) {
            const nearestIncident = nearbyIncidents.reduce<Incident | null>((best, inc) => {
              const liveOrigin = locationRef.current;
              const incDist = haversineMeters(liveOrigin.lat, liveOrigin.lng, inc.lat, inc.lng);
              if (!best) return inc;
              const bestDist = haversineMeters(liveOrigin.lat, liveOrigin.lng, best.lat, best.lng);
              return incDist < bestDist ? inc : best;
            }, null);
            const nativeOrigin = locationRef.current;
            const nearestIncidentMiles = nearestIncident
              ? haversineMeters(nativeOrigin.lat, nativeOrigin.lng, nearestIncident.lat, nearestIncident.lng) / 1609.34
              : null;
            const reportHint =
              nearestIncident && nearestIncidentMiles != null && nearestIncidentMiles <= 2.5
                ? `${nearestIncident.title || nearestIncident.type} reported about ${nearestIncidentMiles.toFixed(1)} mi away.`
                : undefined;
            const nativeParams = normalizeNativeNavParams({
              origin: { lat: nativeOrigin.lat, lng: nativeOrigin.lng },
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
              {([
                { l: 'Miles logged', v: `${(activeTripSummary.distance ?? 0).toFixed(2)} mi`, c: colors.text, i: 'navigate-outline' as const },
                { l: 'Drive time', v: formatDuration(activeTripSummary.duration), c: colors.text, i: 'time-outline' as const },
                { l: 'Avg speed', v: `${Math.round(activeTripSummary.avg_speed_mph ?? 0)} mph`, c: colors.primary, i: 'speedometer-outline' as const },
                { l: 'Safety score', v: `${Math.round(activeTripSummary.safety_score ?? 0)}/100`, c: colors.success, i: 'shield-checkmark-outline' as const },
                ...(activeTripSummary.max_speed_mph != null && activeTripSummary.max_speed_mph > 0
                  ? [{ l: 'Top speed', v: `${Math.round(activeTripSummary.max_speed_mph)} mph`, c: colors.danger, i: 'flash-off-outline' as const }]
                  : []),
                {
                  l: 'Fuel cost',
                  v:
                    typeof activeTripSummary.fuel_cost_estimate === 'number' &&
                    Number.isFinite(activeTripSummary.fuel_cost_estimate)
                      ? formatUsd(activeTripSummary.fuel_cost_estimate)
                      : '—',
                  c: colors.text,
                  i: 'card-outline' as const,
                },
                { l: 'Rewards', v: `+${activeTripSummary.gems_earned} gems`, c: colors.warning, i: 'diamond-outline' as const },
                ...(activeTripSummary.xp_earned != null && activeTripSummary.xp_earned > 0
                  ? [{ l: 'XP', v: `+${activeTripSummary.xp_earned} xp`, c: colors.primary, i: 'trending-up-outline' as const }]
                  : []),
              ]).map((stat) => (
                <View key={stat.l} style={[s.tripStat, { backgroundColor: colors.surfaceSecondary }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name={stat.i} size={14} color={stat.c} />
                    <Text style={[s.tripStatL, { color: colors.textTertiary }]}>{stat.l}</Text>
                  </View>
                  <Text style={[s.tripStatV, { color: stat.c }]}>{stat.v}</Text>
                </View>
              ))}
            </View>
            {(activeTripSummary.hard_braking_events ?? 0) > 0 ||
            (activeTripSummary.speeding_events ?? 0) > 0 ||
            (activeTripSummary.hard_acceleration_events ?? 0) > 0 ? (
              <View
                style={{
                  flexDirection: 'row',
                  gap: 8,
                  marginBottom: 12,
                  flexWrap: 'wrap',
                }}
              >
                {(activeTripSummary.hard_braking_events ?? 0) > 0 ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 999,
                      backgroundColor: `${colors.warning}1A`,
                      borderWidth: StyleSheet.hairlineWidth,
                      borderColor: `${colors.warning}55`,
                    }}
                  >
                    <Ionicons name="warning-outline" size={12} color={colors.warning} />
                    <Text style={{ color: colors.warning, fontSize: 11, fontWeight: '700' }}>
                      {activeTripSummary.hard_braking_events} hard brake{(activeTripSummary.hard_braking_events ?? 0) === 1 ? '' : 's'}
                    </Text>
                  </View>
                ) : null}
                {(activeTripSummary.speeding_events ?? 0) > 0 ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 999,
                      backgroundColor: `${colors.danger}1A`,
                      borderWidth: StyleSheet.hairlineWidth,
                      borderColor: `${colors.danger}55`,
                    }}
                  >
                    <Ionicons name="speedometer-outline" size={12} color={colors.danger} />
                    <Text style={{ color: colors.danger, fontSize: 11, fontWeight: '700' }}>
                      {activeTripSummary.speeding_events} speeding event{(activeTripSummary.speeding_events ?? 0) === 1 ? '' : 's'}
                    </Text>
                  </View>
                ) : null}
                {(activeTripSummary.hard_acceleration_events ?? 0) > 0 ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 999,
                      backgroundColor: `${colors.warning}1A`,
                      borderWidth: StyleSheet.hairlineWidth,
                      borderColor: `${colors.warning}55`,
                    }}
                  >
                    <Ionicons name="trending-up-outline" size={12} color={colors.warning} />
                    <Text style={{ color: colors.warning, fontSize: 11, fontWeight: '700' }}>
                      {activeTripSummary.hard_acceleration_events} hard accel{(activeTripSummary.hard_acceleration_events ?? 0) === 1 ? '' : 's'}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
            <View style={[s.tripServiceCard, { backgroundColor: isLight ? 'rgba(37,99,235,0.08)' : 'rgba(96,165,250,0.12)', borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[s.tripServiceTitle, { color: colors.text }]}>Service-driver log</Text>
                <Text style={[s.tripServiceSub, { color: colors.textSecondary }]}>
                  Miles, drive time, safety, rewards, speeds, fuel cost, and route names were saved to Insights from this trip.
                </Text>
              </View>
              <Ionicons name="briefcase-outline" size={22} color={colors.primary} />
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
              <TouchableOpacity style={[s.tripDone, { backgroundColor: 'rgba(59,130,246,0.12)', flex: 1 }]} onPress={openTripShare}>
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
        <View
          style={[
            s.navHudCluster,
            {
              bottom: MAP_NAV_BOTTOM_INSET + insets.bottom + 10,
              backgroundColor: hudChromeGlass.clusterFill,
              borderColor: hudChromeGlass.clusterBorder,
            },
          ]}
        >
          <View style={{ position: 'relative', alignItems: 'center' }}>
            <OrionQuickMic
              visible={!showOrion}
              interactionMode="navigation"
              compactHudFab
              hudGlassTile={{
                backgroundColor: hudChromeGlass.tileFill,
                borderColor: hudChromeGlass.tileBorder,
              }}
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
                } else if (action.type === 'mute_voice') {
                  setNavVoiceMuted(true);
                  stopSpeaking();
                } else if (action.type === 'unmute_voice') {
                  setNavVoiceMuted(false);
                }
              }}
            />
            {!user?.isPremium && (
              <View
                style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  backgroundColor: '#3B82F6',
                  borderRadius: 8,
                  width: 16,
                  height: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="navigate" size={8} color="#fff" />
              </View>
            )}
          </View>
          <TouchableOpacity
            style={[
              s.navHudBtn,
              {
                backgroundColor: 'rgba(37,99,235,0.9)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.42)',
              },
            ]}
            onPress={handleRecenter}
            accessibilityLabel="Recenter and lock camera"
          >
            <Ionicons name="navigate" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              s.navHudBtn,
              {
                backgroundColor: hudChromeGlass.tileFill,
                borderWidth: 1,
                borderColor: hudChromeGlass.tileBorder,
              },
            ]}
            onPress={handleRouteOverview}
            accessibilityLabel="Show route overview"
          >
            <Ionicons name="map-outline" size={20} color="#F1F5F9" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              s.navHudBtn,
              {
                backgroundColor: hudChromeGlass.tileFill,
                borderWidth: 1,
                borderColor: hudChromeGlass.tileBorder,
              },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowReportPicker(true);
            }}
            accessibilityLabel="Report incident"
          >
            <Ionicons name="warning-outline" size={20} color="#F59E0B" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              s.navHudBtn,
              {
                backgroundColor: hudChromeGlass.tileFill,
                borderWidth: 1,
                borderColor: hudChromeGlass.tileBorder,
              },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowPhotoReport(true);
            }}
            accessibilityLabel="Photo report"
          >
            <Ionicons name="camera-outline" size={20} color="#F1F5F9" />
          </TouchableOpacity>
        </View>
      )}

      {!nav.isNavigating && !nav.showRoutePreview && !activeTripSummary && !selectedPlace && !selectedPlaceId && (
        <TouchableOpacity style={[s.reportFab, {
          bottom: tabBarHeight + 12,
          left: 14,
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
            bottom: tabBarHeight + 88,
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

      {!nav.isNavigating && !nav.showRoutePreview && !activeTripSummary && !selectedPlace && !selectedPlaceId && recommendedNearbyOffers.length > 0 && (
        <TouchableOpacity
          style={[s.offerPill, { bottom: tabBarHeight + 38, backgroundColor: isLight ? 'rgba(255,255,255,0.92)' : 'rgba(30,30,46,0.92)', borderColor: colors.border }]}
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
        <View style={[s.modeRow, { bottom: tabBarHeight + 4 }]}>
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

      {(nav.isNavigating || speed > 1) && !selectedPlace && !selectedPlaceId && (() => {
        // Prefer the native SDK speed limit when the logic SDK is authoritative — it
        // reflects matched-location truth and updates continuously. Fall back to the
        // Directions `maxspeeds[step]` array when the SDK value is unavailable (warmup,
        // JS-only mode, or unsupported segment).
        const sdkLimitMph =
          typeof nav.sdkSpeedLimitMps === 'number' && Number.isFinite(nav.sdkSpeedLimitMps)
            ? Math.round(nav.sdkSpeedLimitMps * 2.236936)
            : null;
        const stepLimit =
          nav.isNavigating && nav.navigationData?.maxspeeds
            ? nav.navigationData.maxspeeds[Math.min(nav.currentStepIndex, nav.navigationData.maxspeeds.length - 1)]
            : null;
        const currentSpeedLimit =
          sdkLimitMph != null
            ? sdkLimitMph
            : typeof stepLimit === 'number' && Number.isFinite(stepLimit)
              ? stepLimit
              : null;
        const hasLimit = nav.isNavigating && currentSpeedLimit != null;
        const isOverSpeed = hasLimit && speed > (currentSpeedLimit as number);
        return (
          <View
            style={{
              position: 'absolute',
              left: 14,
              bottom: (nav.isNavigating ? MAP_NAV_BOTTOM_INSET : tabBarHeight + 14),
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
                <View style={[s.speedLimitPlate, { borderColor: isOverSpeed ? '#FF3B30' : 'rgba(15,23,42,0.22)' }]}>
                  <Text style={[s.speedLimitPlateTop, { color: isOverSpeed ? '#FF3B30' : '#111827' }]}>SPEED</Text>
                  <Text style={[s.speedLimitPlateMid, { color: isOverSpeed ? '#FF3B30' : '#111827' }]}>LIMIT</Text>
                  <Text style={[s.speedLimitPlateNum, { color: isOverSpeed ? '#FF3B30' : '#111827' }]}>{currentSpeedLimit}</Text>
                </View>
              ) : null}
            </View>
          </View>
        );
      })()}

      {isLocating && <View style={[s.locBanner, { top: insets.top + 84 }]}><Text style={s.locT}>Finding your location...</Text></View>}

      {showTrafficSafety &&
        isTrafficSafetyLayerEnabled(location.lat, location.lng) &&
        trafficSafetyHint &&
        !nav.isNavigating && (
          <View
            style={[
              s.mapLayerHint,
              {
                bottom: tabBarHeight + 112,
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
        onOfflineMaps={promptOfflineMapDownload}
        onNavigate={(screen) => {
          /* Menu already closed by HamburgerMenu before this runs (deferred). */
          if (screen === 'Map') {
            return;
          } else if (screen === 'Offers') {
            rnNav.navigate('Offers', { screen: 'OffersMain' });
          } else if (screen === 'Wallet') {
            rnNav.navigate('Wallet', { screen: 'RewardsMain' });
          } else if (screen === 'Premium') {
            (rnNav as { navigate: (name: string, params?: object) => void }).navigate('Profile', {
              screen: 'ProfileMain',
              params: { openBilling: true },
            });
          } else if (screen === 'Profile') {
            rnNav.navigate('Profile', { screen: 'ProfileMain' });
          } else if (screen === 'Help') {
            (rnNav as { navigate: (name: string, params?: object) => void }).navigate('Profile', {
              screen: 'ProfileMain',
              params: { openSupport: true },
            });
          } else if (screen === 'CommuteAlerts') {
            (rnNav as { navigate: (name: string, params?: object) => void }).navigate('Profile', {
              screen: 'ProfileMain',
              params: { openCommuteReminders: true },
            });
          } else if (screen === 'Social') {
            if (!user?.isPremium) {
              Alert.alert('Premium feature', 'Friends and live location require SnapRoad Premium.', [
                { text: 'Not now', style: 'cancel' },
                { text: 'Upgrade', onPress: () => rnNav.navigate('Profile', { screen: 'ProfileMain' }) },
              ]);
              return;
            }
            rnNav.navigate('Dashboards', { screen: 'DashboardMain' });
          } else if (screen === 'FamilySoon') {
            rnNav.navigate('Dashboards', { screen: 'DashboardMain' });
          }
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
          surfaceSecondary: colors.surfaceSecondary,
          text: colors.text,
          textSecondary: colors.textSecondary,
          textTertiary: colors.textTertiary,
          border: colors.border,
          primary: colors.primary,
          rewardsGradientStart: colors.rewardsGradientStart,
          rewardsGradientEnd: colors.rewardsGradientEnd,
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
      <TripShare
        visible={showTripShare}
        onClose={() => {
          setShowTripShare(false);
          setTripSharePayload(null);
        }}
        trip={tripSharePayload ?? activeTripSummary ?? null}
      />

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
  topBar: { position: 'absolute', left: 16, right: 16, zIndex: 26 },
  searchRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  menuBtn: { width: 44, height: 44, borderRadius: 13, justifyContent: 'center', alignItems: 'center', borderWidth: 1, ...shadow(8) },
  searchPill: { flex: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, ...shadow(12, 0.15) },
  searchInput: { flex: 1, fontSize: 16 },
  chipRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1, flexDirection: 'row' as const, alignItems: 'center' as const, ...shadow(6, 0.1) },
  quickPlace: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginRight: 8, minWidth: 110, borderWidth: 1, ...shadow(6, 0.1) },
  qpTitle: { fontSize: 14, fontWeight: '600' },
  qpSub: { fontSize: 11, maxWidth: 100 },
  results: { marginTop: 6, borderRadius: 16, overflow: 'hidden', borderWidth: 1, ...shadow(16, 0.18) },
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
  tripGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  tripStat: { width: '47%' as any, borderRadius: 14, padding: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(148,163,184,0.22)' },
  tripStatL: { fontSize: 13, fontWeight: '600' },
  tripStatV: { fontSize: 20, fontWeight: '900', marginTop: 6 },
  tripServiceCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 14, marginBottom: 12 },
  tripServiceTitle: { fontSize: 14, fontWeight: '900' },
  tripServiceSub: { fontSize: 12, lineHeight: 17, marginTop: 3, fontWeight: '600' },
  tripDone: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', ...shadow(12, 0.3) },
  tripDoneT: { color: '#fff', fontSize: 16, fontWeight: '800' },

  // Floating navigation HUD cluster (Orion mic + controls)
  navHudCluster: {
    position: 'absolute',
    right: 11,
    zIndex: 12,
    gap: 10,
    alignItems: 'center' as const,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#020617',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.14,
        shadowRadius: 12,
      },
      android: { elevation: 10 },
      default: {},
    }),
  },
  navHudBtn: {
    width: 44,
    height: 44,
    borderRadius: 11,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  reportFab: { position: 'absolute', width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.94)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', ...shadow(8, 0.12) },
  communityBtn: { position: 'absolute', minHeight: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.94)', paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', ...shadow(8, 0.12) },
  communityT: { fontSize: 12, fontWeight: '700' },
  recenter: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)', paddingHorizontal: 22, paddingVertical: 10, borderRadius: 22, zIndex: 12 },
  recenterT: { color: '#fff', fontSize: 13, fontWeight: '700' },
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
  speedBadgeWithLimit: { minWidth: 66, minHeight: 106, borderRadius: 22, paddingVertical: 8, paddingHorizontal: 7 },
  speedVal: { fontSize: 17, fontWeight: '800' },
  speedValCompact: { fontSize: 16 },
  speedUnit: { fontSize: 9, fontWeight: '600', marginTop: -1 },
  speedLimitInline: { fontSize: 8, fontWeight: '800', letterSpacing: 0.4, marginTop: 4, textTransform: 'uppercase' as const },
  speedLimitPlate: {
    width: 44,
    marginTop: 7,
    borderWidth: 1.5,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingVertical: 3,
  },
  speedLimitPlateTop: { fontSize: 5.5, fontWeight: '900', letterSpacing: 0.2, lineHeight: 7 },
  speedLimitPlateMid: { fontSize: 6.5, fontWeight: '900', letterSpacing: 0.2, lineHeight: 8 },
  speedLimitPlateNum: { fontSize: 16, fontWeight: '900', lineHeight: 18, marginTop: 1 },
  /** Under search chips (right): layers → compass/follow → Orion. */
  mapToolStack: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
  },
  /** Rounded-square map HUD control (shows map through translucent slate). */
  mapHudTile: {
    width: 48,
    height: 48,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    overflow: 'hidden' as const,
    ...Platform.select({
      ios: {
        shadowColor: '#020617',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: { elevation: 5 },
      default: {},
    }),
  },
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
