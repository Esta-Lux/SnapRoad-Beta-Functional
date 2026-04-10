// @ts-nocheck — large driver shell; strict incremental cleanup tracked separately
import { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense, type ComponentProps } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'
import {
  MapPin, Gift, Trophy, Users, Search, Home, Briefcase, Bell, Menu, Mic,
  Navigation, ChevronRight, Settings, Camera,
  Gem, Award, X, Plus, Check, Star, Clock, Car, Fuel,
  Coffee, AlertTriangle, Volume2, VolumeX, Route, LogOut, Play, Pause, Map,
  Trash2, Timer, EyeOff, 
  GripVertical, Minimize2, Maximize2,
  Phone, MessageCircle, Battery, Shield, Zap,
  Truck,
  History, BarChart3, HelpCircle, Lock, Edit2, Share2, Swords,
  DollarSign, Droplets, Leaf, Target, Sun, Moon
} from 'lucide-react'
import FriendsHub from './components/FriendsHub'
import TripHistory from './components/TripHistory'
import GemHistory from './components/GemHistory'
import NotificationSettings from './components/NotificationSettings'
import HelpSupport from './components/HelpSupport'
import FuelTracker from './components/FuelTracker'
import CarOnboarding from './components/CarOnboarding'
import CarStudio from './components/CarStudioNew'
import PlanSelection from './components/PlanSelection'
import LevelProgress from './components/LevelProgress'
import QuickPhotoReport from './components/QuickPhotoReport'
import IncidentAlert from './components/IncidentAlert'
import RoadStatusOverlay from './components/RoadStatusOverlay'
import OffersModal from './components/OffersModal'
import ShareTripScore from './components/ShareTripScore'
import DrivingScore from './components/DrivingScore'
import ChallengeHistory from './components/ChallengeHistory'
import WeeklyRecap from './components/WeeklyRecap'
import OrionOfferAlerts from './components/OrionOfferAlerts'
import mapboxgl from 'mapbox-gl'
import type { Map as MapboxMap, LngLatBounds } from 'mapbox-gl'
import MapboxMapSnapRoad from './components/MapboxMapSnapRoad'
import { DRIVING_MODES } from './components/DrivingModeStyles'
import LaneGuide from './components/LaneGuide'
import MapLayerPicker from './components/MapLayerPicker'
import { useMapbox } from '@/contexts/MapboxContext'
import { getMapboxRouteOptions, reverseGeocode, type DirectionsResult } from '@/lib/mapboxDirections'
import { ProfileCar, CAR_COLORS } from './components/Car3D'
// New enhanced components
import TripAnalytics from './components/TripAnalytics'
import RouteHistory3D from './components/RouteHistory3D'
import InAppBrowser from './components/InAppBrowser'
import GemOverlay from './components/GemOverlay'
import SpeedIndicator from './components/SpeedIndicator'
import PlaceDetail from './components/PlaceDetail'
import PlaceCard, { type PlaceCardData } from './components/PlaceCard'
import { api } from '@/services/api'
import { useNavigationCore } from '@/contexts/NavigationCoreContext'
import { useTheme } from '@/contexts/ThemeContext'
import {
  getFriendLocations,
  sendLocationTag,
  stopSharingLocation,
  type FriendLocation,
} from '@/lib/friendLocation'
import { chatWithOrion, orionSpeak, startListening, type OrionContext } from '@/lib/orion'
import FriendCard from './components/FriendCard'
import SubmitConcern from './components/SubmitConcern'
import PhotoReportCapture from './components/PhotoReportCapture'
import type { PhotoReport } from './components/PhotoIncidentFeed'
import OfferRedemptionCard from './components/OfferRedemptionCard'
import DashboardsTab from './components/DashboardsTab'
import { useNavigationState } from './hooks/useNavigationState'
import { useFriendTracking } from './hooks/useFriendTracking'
import { useOffersAndRewards, type DriverUserData } from './hooks/useOffersAndRewards'
import { useMapLayers } from './hooks/useMapLayers'
import { useTripTracking } from './hooks/useTripTracking'
const WeeklyInsights = lazy(() => import('./components/WeeklyInsights'))
const FamilyDashboard = lazy(() => import('./components/FamilyDashboard'))
const ConvoyMode = lazy(() => import('./components/ConvoyMode'))
const PhotoIncidentFeed = lazy(() => import('./components/PhotoIncidentFeed'))
const SnapRoadScoreCard = lazy(() => import('./components/SnapRoadScoreCard'))
const BadgesGrid = lazy(() => import('./components/BadgesGrid'))
const OrionVoice = lazy(() => import('./components/OrionVoice'))
const OHGOCameraPopup = lazy(() => import('./components/OHGOCameraPopup'))

// Shared api returns { success, data: backendBody }. Backend often returns { data: payload }. Unwrap for payload.
function payload<T>(res: { success?: boolean; data?: unknown }): T | undefined {
  const d = res.data as { data?: T } | T | undefined
  if (d && typeof d === 'object' && 'data' in (d as Record<string, unknown>) && (d as { data?: T }).data !== undefined) {
    return (d as { data?: T }).data as T
  }
  return d as T | undefined
}

/** Narrow convoy / external callbacks that pass an unknown destination object. */
function searchResultLike(dest: unknown): SearchResult | null {
  if (!dest || typeof dest !== 'object') return null
  const o = dest as Record<string, unknown>
  const lat = Number(o.lat)
  const lng = Number(o.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  const id = o.id
  return {
    id: typeof id === 'string' || typeof id === 'number' ? String(id) : 'convoy-dest',
    name: typeof o.name === 'string' ? o.name : 'Destination',
    lat,
    lng,
    address: typeof o.address === 'string' ? o.address : undefined,
  }
}

function isLeaveEarlyPayload(v: unknown): v is { leave_by: string; eta_minutes: number; destination: string } {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return (
    typeof o.leave_by === 'string' &&
    typeof o.eta_minutes === 'number' &&
    typeof o.destination === 'string'
  )
}

// Types - Changed to 4 tabs: Map, Routes, Rewards, Profile
type TabType = 'map' | 'dashboards' | 'rewards' | 'profile'
type RewardsTab = 'offers' | 'challenges' | 'badges' | 'carstudio'
type ProfileTab = 'overview' | 'score' | 'fuel' | 'settings'
type LocationCategory = 'favorites' | 'nearby'

interface SavedLocation {
  id: number
  name: string
  address: string
  category: string
  lat?: number
  lng?: number
}

interface SavedRoute {
  id: number
  name: string
  origin: string
  destination: string
  departure_time: string
  days_active: string[]
  estimated_time: number
  distance: number
  is_active: boolean
  notifications: boolean
}

interface WidgetState {
  visible: boolean
  collapsed: boolean
  position: { x: number; y: number }
}

/** Nearby / map offer row — matches useOffersAndRewards payload; avoids clashing with other components' `Offer` types. */
interface DriverAppOffer {
  id: number
  business_name: string
  discount_percent: number
  gems_reward: number
  lat?: number
  lng?: number
  latitude?: number
  longitude?: number
  business_type?: string
  redeemed?: boolean
  name?: string
  title?: string
  discount_text?: string
  distance_km?: number
  gems?: number
  /** Optional display fields (offer detail modal / marketing cards) */
  type?: string
  discount?: string
  distance?: string
  rating?: string
  expires?: string
}

interface FamilyMember {
  id: string
  name: string
  role: string
  safety_score: number
  last_trip?: string
  location?: string
  battery?: number
  distance?: string
}

interface RoadReport {
  id: number
  type: string
  lat: number
  lng: number
  title?: string
  severity?: string
  description?: string
  upvotes?: number
}

interface NavigationDestination {
  lat: number
  lng: number
  name?: string
  address?: string
}

interface NavigationState {
  origin?: NavigationDestination
  destination?: NavigationDestination
  steps?: { instruction: string; distance: string; distanceMeters?: number; duration?: string; maneuver?: string; lanes?: string; lat?: number; lng?: number }[]
  /** Full road path from directions API; when set, route follows roads instead of straight line. */
  polyline?: { lat: number; lng: number }[]
  [key: string]: unknown
}

interface SearchResult {
  id?: number | string
  name: string
  lat: number
  lng: number
  address?: string
  type?: string
  distance_km?: number
  place_id?: string
}

// Category icons
/** Format a turn instruction for voice: "at the light" / "next light" phrasing. */
function formatTurnInstructionForVoice(
  instruction: string,
  distanceMeters?: number,
  maneuver?: string,
  controlType?: 'traffic-light' | 'stop-sign' | null
): string {
  const dist = typeof distanceMeters === 'number' && distanceMeters > 0 ? distanceMeters : 400
  const i = (instruction || '').trim()
  // Extract "onto X" / "toward X" for street name
  const ontoMatch = i.match(/\b(?:onto|toward|to)\s+(.+?)(?:\s*\.|$)/i)
  const streetName = ontoMatch ? ontoMatch[1].trim() : ''
  const dir = (maneuver || '').toLowerCase()
  const isLeft = dir.includes('left')
  const isRight = dir.includes('right')
  const turnPhrase = isLeft
    ? (dir.includes('slight') ? 'slight left' : dir.includes('sharp') ? 'sharp left' : 'left')
    : isRight
      ? (dir.includes('slight') ? 'slight right' : dir.includes('sharp') ? 'sharp right' : 'right')
      : ''

  const atControl =
    controlType === 'traffic-light'
      ? (streetName ? ` at the light onto ${streetName}` : ' at the light')
      : controlType === 'stop-sign'
        ? (streetName ? ` at the stop sign onto ${streetName}` : ' at the stop sign')
        : (streetName ? ` onto ${streetName}` : '')

  const nextControl =
    controlType === 'traffic-light'
      ? (streetName ? ` at the next light onto ${streetName}` : ' at the next light')
      : controlType === 'stop-sign'
        ? (streetName ? ` at the next stop sign onto ${streetName}` : ' at the next stop sign')
        : (streetName ? ` onto ${streetName}` : '')

  if (dist > 800) {
    const miles = (dist / 1609.34).toFixed(1)
    const mileWord = parseFloat(miles) === 1 ? 'mile' : 'miles'
    return turnPhrase
      ? `In ${miles} ${mileWord}, take a ${turnPhrase}${atControl}`
      : `In ${miles} ${mileWord}, ${i}`
  }
  if (dist > 150) {
    const feet = Math.round(dist * 3.28084)
    return turnPhrase
      ? `In ${feet} feet, take a ${turnPhrase}${atControl}`
      : `In ${feet} feet, ${i}`
  }
  return turnPhrase
    ? `At the next intersection, turn ${turnPhrase}${nextControl}`
    : i || 'Continue'
}

function metersBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLon = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2)
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

function nearestControlType(
  step: { lat?: number; lng?: number },
  signals: Array<{ type: string; lat: number; lng: number }>,
  radiusMeters: number
): 'traffic-light' | 'stop-sign' | null {
  const lat = step.lat
  const lng = step.lng
  if (typeof lat !== 'number' || typeof lng !== 'number' || lat === 0 || lng === 0) return null
  let best: { type: string; d: number } | null = null
  for (const s of signals || []) {
    if (!s || typeof s.lat !== 'number' || typeof s.lng !== 'number') continue
    const d = metersBetween({ lat, lng }, { lat: s.lat, lng: s.lng })
    if (d <= radiusMeters && (!best || d < best.d)) best = { type: String(s.type), d }
  }
  if (!best) return null
  return best.type === 'stop-sign' ? 'stop-sign' : best.type === 'traffic-light' ? 'traffic-light' : null
}

export default function DriverApp() {
  const navigate = useNavigate()
  const { user, logout, isLoading: isAuthLoading } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { vehicle, camera, predicted, isLive, recenter, setRoutePolyline, setMode, mode, experience, getDrivingMetrics } = useNavigationCore()
  const { ready: mapReady, error: mapError, reportError: reportMapError } = useMapbox()
  const isLight = theme === 'light'
  const [mapFailed, setMapFailed] = useState(false)
  const [fallbackBannerDismissed, setFallbackBannerDismissed] = useState(false)
  const useMap = mapReady && !mapError && !mapFailed
  const isNavigatingRef = useRef(false)
  const hasZoomedToUser = useRef(false)
  const zoomToUserRef = useRef<((lat: number, lng: number, isNav: boolean, zoomOverride?: number) => void) | null>(null)
  const mapActionsRef = useRef<{ resetHeading: () => void; clearUserInteracting: () => void } | null>(null)
  const mapInstanceRef = useRef<MapboxMap | null>(null)
  

  // Main state - 4 tabs now
  const [activeTab, setActiveTab] = useState<TabType>('map')
  const [rewardsTab, setRewardsTab] = useState<RewardsTab>('offers')
  const [profileTab, setProfileTab] = useState<ProfileTab>('overview')
  const [locationCategory, setLocationCategory] = useState<LocationCategory>('favorites')
  
  // UI states
  const [showMenu, setShowMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showAddLocation, setShowAddLocation] = useState(false)
  const [showAddRoute, setShowAddRoute] = useState(false)
  const [showOfferDetail, setShowOfferDetail] = useState<DriverAppOffer | null>(null)
  const [showFamilyMember, setShowFamilyMember] = useState<FamilyMember | null>(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [draggingWidget, setDraggingWidget] = useState<string | null>(null)
  const [showLayerPicker, setShowLayerPicker] = useState(false)
  

  // New modal states
  const [showFriendsHub, setShowFriendsHub] = useState(false)
  const [showBadgesGrid, setShowBadgesGrid] = useState(false)
  const [showTripHistory, setShowTripHistory] = useState(false)
  const [showGemHistory, setShowGemHistory] = useState(false)
  const [showNotificationSettings, setShowNotificationSettings] = useState(false)
  const [showHelpSupport, setShowHelpSupport] = useState(false)
  const [showSubmitConcern, setShowSubmitConcern] = useState(false)
  const [showMaintenanceMode, setShowMaintenanceMode] = useState(false)
  const [announcementBanner, setAnnouncementBanner] = useState('')
  const [showFuelTracker, setShowFuelTracker] = useState(false)
  const [showFuelDashboard, setShowFuelDashboard] = useState(false)
  const [showAppTour, setShowAppTour] = useState(false)
  const [showCarOnboarding, setShowCarOnboarding] = useState(false)
  const [showCarStudio, setShowCarStudio] = useState(false)
  const [showPlanSelection, setShowPlanSelection] = useState(false)
  const [showLevelProgress, setShowLevelProgress] = useState(false)
  const [showOrionVoice, setShowOrionVoice] = useState(false)
  const [showQuickPhotoReport, setShowQuickPhotoReport] = useState(false)
  const [showQuickReportIconsOnly, setShowQuickReportIconsOnly] = useState(false)
  const [showPhotoReport, setShowPhotoReport] = useState(false)
  const [showFamilyDashboard, setShowFamilyDashboard] = useState(false)
  const [showConvoy, setShowConvoy] = useState(false)
  const [familyPipOpen, setFamilyPipOpen] = useState(false)
  const [familyGeoContext, setFamilyGeoContext] = useState<{ groupId: string; places: Array<{ id?: string; name: string; lat: number; lng: number; radius_meters?: number }> }>({ groupId: '', places: [] })
  const familyPlaceInsideRef = useRef<Record<string, boolean>>({})
  
  const [crashDetected, setCrashDetected] = useState(false)
  const [crashCancelActive, setCrashCancelActive] = useState(false)
  
  
  
  
  
  
  
  
  
  
  
  const [showPhotoFeed, setShowPhotoFeed] = useState(false)
  
  
  // New feature states
  
  
  
  const [routeNotifications, setRouteNotifications] = useState<Array<{ id: string; type: string; route_id?: number; route_name?: string; destination?: string; message: string; leave_by?: string; desired_arrival?: string; eta_minutes?: number; saved_minutes?: number; saved_dollars?: number; delivery?: 'push_and_in_app' | 'in_app_only' }>>([])
  const [dismissedRouteNotifIds, setDismissedRouteNotifIds] = useState<Set<string>>(new Set())
  const [leaveEarlyForRoute, setLeaveEarlyForRoute] = useState<{ routeId: number; leaveBy: string; etaMinutes: number; destination: string } | null>(null)
  
  // In-app browser state
  const [browserUrl, setBrowserUrl] = useState('')
  const [browserTitle, setBrowserTitle] = useState('')
  const [showBrowser, setShowBrowser] = useState(false)
  
  // Gem overlay state
  
  // Search and navigation states
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [, setSelectedDestination] = useState<SearchResult | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [selectedPlace, setSelectedPlace] = useState<{
    name: string
    lat: number
    lng: number
    address?: string
    type?: string
    rating?: number
    totalRatings?: number
    isOpen?: boolean
    phone?: string
    website?: string
    hours?: string[]
    photos?: string[]
    types?: string[]
    priceLevel?: number
    matchingOffer?: unknown
  } | null>(null)
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
  const [mapClickedPlace, setMapClickedPlace] = useState<PlaceCardData | null>(null)
  /** Pin dropped on map tap (exact lat/lng); card shows resolved label + Directions CTA */
  const [mapDroppedPin, setMapDroppedPin] = useState<{ lat: number; lng: number; label?: string; address?: string } | null>(null)
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const [searchResultPhotos, setSearchResultPhotos] = useState<Record<string, string>>({})
  const searchPhotoInflightRef = useRef<Record<string, boolean>>({})
  const [osmSignals, setOsmSignals] = useState<Array<{ id: string; type: string; lat: number; lng: number }>>([])
  const [osmSidewalksGeojson, setOsmSidewalksGeojson] = useState<GeoJSON.FeatureCollection<GeoJSON.LineString>>({
    type: 'FeatureCollection',
    features: [],
  })
  const [osmBuildings, setOsmBuildings] = useState<Array<{ id: string; lat: number; lng: number; area_m2: number }>>([])
  const [, setShowTurnByTurn] = useState(false)
  const [, setSelectedRouteId] = useState('best')
  const [isTallVehicle, setIsTallVehicle] = useState(false)
  const [avoidLowClearances, setAvoidLowClearances] = useState(true)
  const [vehicleHeightPreset, setVehicleHeightPreset] = useState<'2.7' | '3.0' | '3.5' | '4.0' | '4.1' | 'custom'>('4.0')
  const [vehicleHeightCustom, setVehicleHeightCustom] = useState<string>('4.0')
  const [isSavingVehicleHeight, setIsSavingVehicleHeight] = useState(false)
  
  
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const searchAbortRef = useRef<AbortController | null>(null)
  
  const cameraLockedRef = useRef(true)
  const [navCameraMode, setNavCameraMode] = useState<'following' | 'free'>('following')
  const [navFollowZoom, setNavFollowZoom] = useState(17)
  
  // User location (mock - Columbus, OH) — must be declared before refs that mirror it
  const [userLocation, setUserLocation] = useState({ lat: 39.9612, lng: -82.9988 })
  // Shared refs so both navigation + friend tracking can read the latest GPS values
  // without TDZ/circular hook dependencies.
  const latRef = useRef<number>(userLocation.lat)
  const lngRef = useRef<number>(userLocation.lng)
  const checkNearbyFriendAlertsRef = useRef<(() => void) | null>(null)
  const stableCheckNearbyFriendAlerts = useCallback(() => {
    checkNearbyFriendAlertsRef.current?.()
  }, [])
  const isSharingLocationRef = useRef<boolean>(true)
  const friendTrackingEnabledRef = useRef(true)
  const [carHeading, setCarHeading] = useState(0) // Direction for nav marker
  const compassHeadingRef = useRef<number | null>(null)
  const lastCompassCommitMsRef = useRef(0)
  const userGemMultiplierRef = useRef<number>(1)
  const invalidateRewardsCachesRef = useRef<(() => void) | null>(null)
  const getUserGemMultiplier = useCallback(() => userGemMultiplierRef.current, [])
  const invalidateRewardsCachesWrapper = useCallback(() => {
    invalidateRewardsCachesRef.current?.()
  }, [])
  
  const crashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastActivityRef = useRef(Date.now())
  const haversineMetersRef = useRef<((lat1: number, lng1: number, lat2: number, lng2: number) => number) | null>(null)
  const haversineMeters = useCallback((lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLng = ((lng2 - lng1) * Math.PI) / 180
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }, [])
  haversineMetersRef.current = haversineMeters
  // #region agent log
  // Crash callback must be defined before useNavigationState(...) to avoid TDZ.
  const triggerCrashDetection = () => {
    void 0// #endregion

    setCrashDetected(true)
    setCrashCancelActive(true)
    if (crashTimeoutRef.current) clearTimeout(crashTimeoutRef.current)
    crashTimeoutRef.current = setTimeout(async () => {
      setCrashCancelActive(false)
      try {
        await api.post('/api/family/sos', {
          type: 'crash',
          lat: userLocation.lat,
          lng: userLocation.lng,
          message: `Possible crash detected at ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`,
        })
      } catch {}
      try {
        await api.post('/api/concerns/submit', {
          category: 'crash_detection',
          title: 'Crash detection triggered',
          description: 'Automatic crash detection alert',
          severity: 'critical',
          context: { lat: userLocation.lat, lng: userLocation.lng },
        })
      } catch {}
    }, 10000)
  }

  const fetchDirectionsRef = useRef<((destination: NavigationDestination) => Promise<void>) | null>(null)
  const handleSelectDestinationRef = useRef<((location: SearchResult) => Promise<void>) | null>(null)
  const offRouteSinceRef = useRef<number | null>(null)
  const rerouteInFlightRef = useRef(false)
  const lastRerouteAtRef = useRef(0)
  const BROADCAST_MIN_DISTANCE = 50
  const ALERT_COOLDOWN = 5 * 60 * 1000
  const NEAR_ROUTE_THRESHOLD = 500
  const userRef = useRef<{ id?: string } | null>(null)
  

  

  const {
    showShareTrip,
    setShowShareTrip,
    lastTripData,
    setLastTripData,
    showTripAnalytics,
    setShowTripAnalytics,
    showRouteHistory3D,
    setShowRouteHistory3D,
    activeTripId,
    setActiveTripId,
    tripHistoryPolylines,
    driverAnalyticsData,
    handleShareTrip,
    dismissTripSummary,
  } = useTripTracking({
    apiClient: api,
    userLocation,
    showFuelDashboard,
    loadOnMount: true,
  })

  // #region agent log
  void 0// #endregion

  // #region agent log
  // Try/catch to capture the next TDZ identifier inside useNavigationState argument evaluation.
  let _navigationState: ReturnType<typeof useNavigationState> | null = null
  try {
    _navigationState = useNavigationState({
      userLocation,
      setUserLocation,
      setCarHeading,
      compassHeadingRef,
      mapInstanceRef,
      isNavigatingRef,
      cameraLockedRef,
      latRef,
      lngRef,
      zoomToUserRef,
      hasZoomedToUser,
      lastActivityRef,
      userRef,
      isSharingLocationRef,
      friendTrackingEnabledRef,
      checkNearbyFriendAlerts: stableCheckNearbyFriendAlerts,
      haversineMeters,
      BROADCAST_MIN_DISTANCE,
      triggerCrashDetection,
      crashCancelActive,
      crashDetected,
      osmSignals,
      nearestControlType,
      formatTurnInstructionForVoice,
      apiClient: api,
      toastClient: toast,
      mode,
      setActiveTripId,
      setShowMenu,
      setShowSearch,
      setShowTurnByTurn,
      setSelectedDestination,
      setRoutePolyline,
      invalidateRewardsCaches: invalidateRewardsCachesWrapper,
      activeTripId,
      getUserGemMultiplier,
      getDrivingAggression: () => getDrivingMetrics().style.aggression,
      hasVehicle: Boolean(vehicle),
      setLastTripData,
      setSelectedRouteId,
      clearMapUserInteracting: () => mapActionsRef.current?.clearUserInteracting?.(),
      recenter,
    })
  } catch (e) {
    throw e
  }
  // #endregion

  const {
    carHeadingRef,
    distanceToNextStepRef,
    navigationDataRef,
    etaGuardRef,
    navigationData,
    setNavigationData,
    liveEta,
    setLiveEta,
    isOverviewMode,
    setIsOverviewMode,
    showRoutePreview,
    setShowRoutePreview,
    showEndConfirm,
    setShowEndConfirm,
    showTripSummary,
    setShowTripSummary,
    availableRoutes,
    setAvailableRoutes,
    selectedRouteIndex,
    setSelectedRouteIndex,
    currentStepIndex,
    setCurrentStepIndex,
    currentLanes,
    isNavigating,
    traveledDistanceMeters,
    setTraveledDistanceMeters,
    traveledDistanceRef,
    needsCompassPermission,
    setNeedsCompassPermission,
    isMuted,
    setIsMuted,
    isNavOrionListening,
    setIsNavOrionListening,
    currentSpeed,
    setCurrentSpeed,
    handleStartNavigation,
    handleRequestEndNavigation,
    handleConfirmEndNavigation,
    handleGoFromRoutePreview,
    handleRouteSelect,
    onRecenterNavigation,
  } = _navigationState as ReturnType<typeof useNavigationState>

  useEffect(() => {
    if (!needsCompassPermission) return
    try {
      if (sessionStorage.getItem('sr_compass_permission_denied') === '1') {
        setNeedsCompassPermission(false)
      }
    } catch {
      // ignore
    }
  }, [needsCompassPermission, setNeedsCompassPermission])

  const {
    followingFriendIdRef,
    followIntervalRef,
    cameraReturnTimerRef,
    friendLocationsRef,
    focusedFamilyMember,
    setFocusedFamilyMember,
    tappedFriend,
    setTappedFriend,
    followingMode,
    nearbyFriendAlert,
    setNearbyFriendAlert,
    friendLocations,
    setFriendLocations,
    setFriendIdsForRealtime,
    selectedFriend,
    setSelectedFriend,
    followingFriendId,
    isSharingLocation,
    setIsSharingLocation,
    returnToNavigation,
    stopAllFollowModes,
    startLiveNavigation,
    startCameraFollow,
    peekAtFriend,
    meetInMiddle,
    friendsOnRoute,
    onFriendMarkerTap,
    checkNearbyFriendAlerts,
  } = useFriendTracking({
    activeTab,
    userLocation,
    // Driven by the navigation refs/state; avoids TDZ caused by destructuring order.
    isNavigating: isNavigatingRef.current,
    mapInstanceRef,
    cameraLockedRef,
    isNavigatingRef,
    isSharingLocationRef,
    latRef,
    lngRef,
    carHeadingRef,
    navigationData,
    navigationDataRef,
    haversineMetersRef,
    fetchDirectionsRef,
    handleSelectDestinationRef,
    ALERT_COOLDOWN,
    NEAR_ROUTE_THRESHOLD,
  })

  // Bridge friend-tracking callback into navigation without creating a hook-call cycle.
  checkNearbyFriendAlertsRef.current = checkNearbyFriendAlerts

  // Admin config kill switches (from /api/config)
  // Declared here to avoid TDZ when passed into hooks below.
  const [ohgoEnabled, setOhgoEnabled] = useState(true)

  const {
    mapReadyForLayers,
    setMapReadyForLayers,
    ohgoCameras,
    selectedCamera,
    setSelectedCamera,
    activeMapLayer,
    setActiveMapLayer,
    showTrafficLayer,
    setShowTrafficLayer,
    showCameraLayer,
    setShowCameraLayer,
    showIncidentsLayer,
    setShowIncidentsLayer,
    showConstructionLayer,
    setShowConstructionLayer,
    showFuelPrices,
    setShowFuelPrices,
    gasStationsOverlay,
    roadReports,
    setRoadReports,
    photoReports,
    activeIncidentAlert,
    setActiveIncidentAlert,
    selectedRoadStatus,
    setSelectedRoadStatus,
    loadRoadReports,
    loadPhotoReports,
  } = useMapLayers(userLocation, ohgoEnabled)

  // User plan state
  
  // Admin config kill switches (from /api/config)
  const [, setFriendTrackingEnabled] = useState(true)
  const [orionEnabled, setOrionEnabled] = useState(true)
  
  // Car customization state
  const [userCar, setUserCar] = useState({
    category: 'sedan',
    variant: 'sedan-classic',
    color: 'midnight-black',
  })
  const [ownedColors, setOwnedColors] = useState<string[]>([])
  
  // Data states
  const [locations, setLocations] = useState<SavedLocation[]>([])
  const [routes, setRoutes] = useState<SavedRoute[]>([])
  
  
  
  
  const [family, setFamily] = useState<FamilyMember[]>([])
  const familyMemberIds = useMemo(
    () => family.map((m) => String((m as any).user_id ?? (m as any).id ?? '')).filter(Boolean),
    [family]
  )
  
  
  
  
  // Fresh user state - starts empty
  
  
  // Widget states - positioned below location panel (which ends around y=280)
  const [widgets, setWidgets] = useState<Record<string, WidgetState>>({
    score: { visible: false, collapsed: true, position: { x: 12, y: 290 } },
    gems: { visible: false, collapsed: true, position: { x: 260, y: 290 } },
  })
  
  // Navigation & settings states
  
  
  // Form states
  const [newLocation, setNewLocation] = useState({ name: '', address: '', category: 'favorite' })
  const [newRoute, setNewRoute] = useState({ name: '', origin: '', destination: '', departure_time: '08:00', days_active: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], notifications: true })
  const [routeLimit, setRouteLimit] = useState(5) // 5 free, 20 premium
  const [originSuggestions, setOriginSuggestions] = useState<{ name: string; address: string; lat?: number; lng?: number }[]>([])
  const [destinationSuggestions, setDestinationSuggestions] = useState<{ name: string; address: string; lat?: number; lng?: number }[]>([])
  const routeAddrDebounceRef = useRef<Record<'origin' | 'destination', ReturnType<typeof setTimeout> | null>>({ origin: null, destination: null })

  const {
    showOffersModal,
    setShowOffersModal,
    selectedOfferId,
    setSelectedOfferId,
    showDrivingScore,
    setShowDrivingScore,
    showChallengeHistory,
    setShowChallengeHistory,
    showRedemptionPopup,
    setShowRedemptionPopup,
    selectedOfferForRedemption,
    setSelectedOfferForRedemption,
    showWeeklyRecap,
    setShowWeeklyRecap,
    showWeeklyInsights,
    setShowWeeklyInsights,
    showScoreCard,
    setShowScoreCard,
    showOffersPanel,
    setShowOffersPanel,
    userPlan,
    setUserPlan,
    setGemMultiplier,
    offers,
    setOffers,
    challenges,
    setChallenges,
    badges,
    setBadges,
    setSkins,
    userData,
    setUserData,
    cachedGet,
    loadNearbyOffers,
    handleRedeemOffer,
    handleClaimChallenge,
    invalidateRewardsCaches,
  } = useOffersAndRewards({
    initialName: (user?.name as string) || 'Driver',
    userId: user?.id,
    userLocation,
    setRouteLimit,
    setFriendTrackingEnabled,
    friendTrackingEnabledRef,
    stopSharingLocation,
    setShowMaintenanceMode,
    setAnnouncementBanner,
    setOrionEnabled,
    setShowCameraLayer,
    setOhgoEnabled,
  })

  // Sync values needed by navigation with the data loaded in this hook.
  userGemMultiplierRef.current = Number(userData.gem_multiplier ?? 1)
  invalidateRewardsCachesRef.current = invalidateRewardsCaches
  
  // Swipe state for locations

  useEffect(() => {
    const record = () => { lastActivityRef.current = Date.now() }
    window.addEventListener('touchstart', record, { passive: true })
    window.addEventListener('click', record, { passive: true })
    return () => {
      window.removeEventListener('touchstart', record)
      window.removeEventListener('click', record)
    }
  }, [])

  // Load data on mount
  useEffect(() => {
    if (isAuthLoading || !api.getToken()) return
    loadData()
    loadRoadReports()
    loadPhotoReports()
  }, [isAuthLoading, (user as { id?: string } | null)?.id])

  // Refresh address book (locations) when search modal opens so Quick Places is up to date
  useEffect(() => {
    if (!showSearch) return
    let cancelled = false
    api.get('/api/locations').then((locRes) => {
      if (cancelled) return
      const loc = payload(locRes) ?? (locRes.data as { data?: SavedLocation[] })?.data ?? locRes.data
      if (locRes.success && loc != null && Array.isArray(loc)) setLocations(loc)
    })
    return () => { cancelled = true }
  }, [showSearch])

  // Load first photo for search result cards (first 5 with place_id) so images populate
  useEffect(() => {
    const withPlaceId = searchResults.filter((r): r is SearchResult & { place_id: string } => !!r.place_id).slice(0, 5)
    if (withPlaceId.length === 0) return
    let cancelled = false
    withPlaceId.forEach((result) => {
      if (searchResultPhotos[result.place_id] || searchPhotoInflightRef.current[result.place_id]) return
      searchPhotoInflightRef.current[result.place_id] = true
      api.get<{ success?: boolean; data?: { photos?: { reference: string }[] } }>(`/api/places/details/${encodeURIComponent(result.place_id)}`)
        .then((res) => {
          if (cancelled) return
          const data = (res.data as { data?: { photos?: { reference: string }[] } })?.data
          const ref = data?.photos?.[0]?.reference
          if (ref) setSearchResultPhotos((prev) => ({ ...prev, [result.place_id]: ref }))
        })
        .catch(() => {})
        .finally(() => {
          delete searchPhotoInflightRef.current[result.place_id]
        })
    })
    return () => { cancelled = true }
  }, [searchResults, searchResultPhotos])

  

  // ---------- Map layer picker: MapboxMapSnapRoad uses mapType/showTraffic props ----------
  // MapboxMapSnapRoad handles map type, traffic, and layers via props. OHGO cameras fetched below; markers handled by overlay/popup.

  // OHGO camera markers: MapboxMapSnapRoad does not add them; RoadStatusOverlay / OHGOCameraPopup can show cameras when user taps area.

  // Sync userLocation from VehicleState when live (for search/directions)
  useEffect(() => {
    if (isLive && vehicle?.coordinate) {
      setUserLocation({ lat: vehicle.coordinate.lat, lng: vehicle.coordinate.lng })
    }
  }, [isLive, vehicle?.coordinate?.lat, vehicle?.coordinate?.lng])

 

  const hasPremiumAccess = userPlan === 'premium' || userData.is_premium
  const hasFamilyAccess = userPlan === 'family'
  const hasRouteAlertsAccess = hasPremiumAccess || hasFamilyAccess
  const hasCameraAccess = hasPremiumAccess || hasFamilyAccess

  // Free users: disable premium-only layers/features
  useEffect(() => {
    if (!hasCameraAccess) setShowCameraLayer(false)
    if (!hasPremiumAccess) setIsSharingLocation(false)
  }, [hasCameraAccess, hasPremiumAccess])

  // Car Studio is premium-only: reset Rewards sub-tab if free user had carstudio selected
  useEffect(() => {
    if (!userData.is_premium && rewardsTab === 'carstudio') setRewardsTab('offers')
  }, [userData.is_premium, rewardsTab])

  useEffect(() => {
    const raw = Number((userData as { vehicle_height_meters?: number | null }).vehicle_height_meters)
    if (Number.isFinite(raw) && raw > 0) {
      setIsTallVehicle(true)
      setAvoidLowClearances(true)
      setVehicleHeightCustom(raw.toFixed(1))
      const preset = ['2.7', '3.0', '3.5', '4.0', '4.1'].find((v) => Math.abs(Number(v) - raw) < 0.05)
      setVehicleHeightPreset((preset as '2.7' | '3.0' | '3.5' | '4.0' | '4.1') ?? 'custom')
    } else {
      setIsTallVehicle(false)
      setAvoidLowClearances(false)
    }
  }, [(userData as { vehicle_height_meters?: number | null }).vehicle_height_meters])

  const buildOrionContext = useCallback((): OrionContext => {
    const remainingDistanceMiles =
      typeof liveEta?.distanceMiles === 'number'
        ? liveEta.distanceMiles
        : 0
    const remainingMinutes =
      typeof liveEta?.etaMinutes === 'number'
        ? Math.round(liveEta.etaMinutes)
        : navigationData?.duration && typeof (navigationData.duration as { seconds?: number }).seconds === 'number'
          ? Math.round((navigationData.duration as { seconds: number }).seconds / 60)
          : 0
    const currentStep = navigationData?.steps?.[currentStepIndex]
    const currentAddress =
      (currentStep && typeof (currentStep as { instruction?: string }).instruction === 'string')
        ? (currentStep as { instruction: string }).instruction
        : userLocation.lat !== 0 || userLocation.lng !== 0
          ? `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`
          : ''
    return {
      userName: user?.name?.split(' ')[0],
      currentLocation: userLocation,
      currentAddress,
      isNavigating,
      currentRoute:
        isNavigating && navigationData
          ? {
              destination: navigationData.destination?.name ?? '',
              distanceMiles: remainingDistanceMiles,
              remainingMinutes,
              currentStep: navigationData.steps?.[currentStepIndex]?.instruction,
              nextStep: navigationData.steps?.[currentStepIndex + 1]?.instruction,
            }
          : undefined,
      speedMph: currentSpeed,
      nearbyOffers: offers?.slice(0, 5).map((o: { title?: string; business_name?: string; discount_text?: string; distance_km?: number }) => ({
        title: o.title ?? o.business_name ?? o.discount_text ?? 'Offer',
        distance: o.distance_km != null ? `${o.distance_km} km` : 'nearby',
      })),
      savedPlaces: locations?.map((l: { name: string; address: string; category?: string }) => ({ name: l.name, address: l.address, category: l.category })) ?? [],
      gems: Number(userData.gems) ?? 0,
      level: Number(userData.level) ?? 1,
    }
  }, [
    user,
    userLocation,
    isNavigating,
    navigationData,
    liveEta?.distanceMiles,
    liveEta?.etaMinutes,
    currentStepIndex,
    currentSpeed,
    offers,
    locations,
    userData.gems,
    userData.level,
  ])

  // Keep refs in sync for watch callback
  useEffect(() => {
    userRef.current = user as { id?: string } | null
    navigationDataRef.current = navigationData
    isSharingLocationRef.current = isSharingLocation
    followingFriendIdRef.current = followingFriendId
    friendLocationsRef.current = friendLocations
  }, [user, navigationData, isSharingLocation, followingFriendId, friendLocations])

  useEffect(() => {
    if (!familyMemberIds.length) return
    setFriendLocations((prev) =>
      prev.map((f) => ({
        ...f,
        isFamilyMember: familyMemberIds.includes(f.id),
      }))
    )
  }, [familyMemberIds])

  // Friend location sync: load friend IDs and initial snapshot
  useEffect(() => {
    const uid = (user as { id?: string } | undefined)?.id
    if (!uid || isAuthLoading) return
    const canUseFriendsMap = userPlan === 'premium' || userPlan === 'family' || userData.is_premium
    if (!canUseFriendsMap || !api.getToken()) {
      setFriendIdsForRealtime([])
      setFriendLocations([])
      return
    }

    const initFriends = async () => {
      try {
        const res = await api.get<{ data?: Array<{ friend_id?: string; id?: string; status?: string }> }>('/api/friends/list')
        const friendsList = payload<Array<{ friend_id?: string; id?: string; status?: string }>>(res) ?? []
        const friendIds = friendsList
          .filter((f) => f.status === 'accepted')
          .map((f) => f.friend_id ?? f.id)
          .filter(Boolean) as string[]

        setFriendIdsForRealtime(friendIds)
        if (friendIds.length === 0) {
          setFriendLocations([])
          return
        }

        const initial = await getFriendLocations(friendIds)
        setFriendLocations(initial)
      } catch (e) {
        console.warn('Friend locations init failed:', e)
      }
    }

    initFriends()
  }, [(user as { id?: string } | undefined)?.id, isAuthLoading, userPlan, userData.is_premium])

  

  // Device orientation (compass): fallback heading source when GPS heading is unavailable.
  useEffect(() => {
    const reqPerm = (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission
    if (typeof reqPerm === 'function' && needsCompassPermission) return

    const normalizeCompassHeading = (e: DeviceOrientationEvent): number | null => {
      const webkitHeading = (e as unknown as { webkitCompassHeading?: number }).webkitCompassHeading
      // iOS Safari: this already reflects where the top of the phone points.
      if (typeof webkitHeading === 'number' && Number.isFinite(webkitHeading)) return (webkitHeading + 360) % 360
      // Android/others: tilt-compensated compass from alpha/beta/gamma.
      if (
        typeof e.alpha === 'number' && Number.isFinite(e.alpha) &&
        typeof e.beta === 'number' && Number.isFinite(e.beta) &&
        typeof e.gamma === 'number' && Number.isFinite(e.gamma)
      ) {
        const alphaRad = e.alpha * (Math.PI / 180)
        const betaRad = e.beta * (Math.PI / 180)
        const gammaRad = e.gamma * (Math.PI / 180)
        const cY = Math.cos(betaRad)
        const cZ = Math.cos(alphaRad)
        const sX = Math.sin(gammaRad)
        const sY = Math.sin(betaRad)
        const sZ = Math.sin(alphaRad)
        const vx = -cZ * sY - sZ * sX * cY
        const vy = -sZ * sY + cZ * sX * cY
        const heading = Math.atan2(vx, vy) * (180 / Math.PI)
        return (heading + 360) % 360
      }
      return null
    }
    const handler = (e: DeviceOrientationEvent) => {
      const now = Date.now()
      const h = normalizeCompassHeading(e)
      if (typeof h === 'number' && Number.isFinite(h)) {
        compassHeadingRef.current = h
        if (now - lastCompassCommitMsRef.current < 50) return
        lastCompassCommitMsRef.current = now
        setCarHeading(h)
        carHeadingRef.current = h
      }
    }
    window.addEventListener('deviceorientation', handler)
    return () => window.removeEventListener('deviceorientation', handler)
  }, [needsCompassPermission])

  // Route-based ETA and distance: when we have a route, derive liveEta from route + traveled (never use backend straight-line).
  useEffect(() => {
    if (!isNavigating || !navigationData?.destination) {
      if (!isNavigating) setLiveEta(null)
      return
    }
    const totalMeters = (navigationData.distance as { meters?: number })?.meters
    const durationSeconds = (navigationData.duration as { seconds?: number })?.seconds
    if (typeof totalMeters !== 'number' || totalMeters <= 0 || typeof durationSeconds !== 'number' || durationSeconds <= 0) return
    const totalMiles = totalMeters / 1609.34
    const traveledMiles = traveledDistanceMeters / 1609.34
    const remainingMiles = Math.max(0, totalMiles - traveledMiles)
    const initialDurationMin = durationSeconds / 60
    const etaMinutes = totalMiles > 0 ? (remainingMiles / totalMiles) * initialDurationMin : 0
    setLiveEta({ distanceMiles: remainingMiles, etaMinutes: Math.max(0, Math.round(etaMinutes)) })
  }, [isNavigating, navigationData?.destination, navigationData?.distance, navigationData?.duration, traveledDistanceMeters])

  // Poll backend ETA endpoint during navigation (only used when we don't have route data; route-based nav uses effect above).
  useEffect(() => {
    if (!isNavigating || !navigationData?.destination) { setLiveEta(null); return }
    const hasRouteData = typeof (navigationData.distance as { meters?: number })?.meters === 'number'
    if (hasRouteData) return // ETA/distance come from route-based effect only
    const guard = etaGuardRef.current
    // Capture a baseline ETA when navigation starts (used to prevent wild jumps).
    if (guard.baselineEtaMinutes == null) {
      const baselineSeconds =
        navigationData?.duration && typeof (navigationData.duration as { seconds?: number }).seconds === 'number'
          ? Number((navigationData.duration as { seconds: number }).seconds)
          : null
      guard.baselineEtaMinutes = baselineSeconds != null && Number.isFinite(baselineSeconds)
        ? Math.max(1, Math.round(baselineSeconds / 60))
        : null
      guard.startedAtMs = Date.now()
      guard.lastAcceptedEtaMinutes = null
      guard.lastAcceptedAtMs = 0
    }
    let cancelled = false
    const poll = async () => {
      try {
        const v = vehicle?.coordinate ?? userLocation
        const d = navigationData.destination
        if (!d || typeof d.lat !== 'number' || typeof d.lng !== 'number') return
        const rawSpd = vehicle?.velocity ? Math.round(vehicle.velocity * 2.237) : 30
        const spd = Math.max(rawSpd, 15)
        const res = await api.get<{ data?: { distance_miles: number; eta_minutes: number } }>(
          `/api/navigation/eta?origin_lat=${v.lat}&origin_lng=${v.lng}&dest_lat=${d.lat}&dest_lng=${d.lng}&speed_mph=${spd}`
        )
        if (!cancelled && res.success && (res.data as any)?.data) {
          const d2 = (res.data as any).data
          // Trust backend ETA and remaining distance when provided (prevents big ETA jumps).
          const remainingMiles =
            typeof d2.distance_miles === 'number' && Number.isFinite(d2.distance_miles)
              ? Math.max(0, d2.distance_miles)
              : (() => {
                  const routeMiles = (navigationData.distance as { miles?: number })?.miles
                  return typeof routeMiles === 'number'
                    ? Math.max(0, routeMiles - traveledDistanceMeters / 1609.34)
                    : 0
                })()

          const etaMinutes =
            typeof d2.eta_minutes === 'number' && Number.isFinite(d2.eta_minutes)
              ? Math.max(0, Math.round(d2.eta_minutes))
              : Math.round((remainingMiles / spd) * 60)

          // --- Guardrails: prevent spurious ETA inflation / oscillation ---
          let nextEta = etaMinutes
          const baseline = guard.baselineEtaMinutes
          if (typeof baseline === 'number' && Number.isFinite(baseline)) {
            // Allow some growth, but not extreme jumps unless user is far off-route/rerouted.
            const maxAllowed = Math.max(Math.round(baseline * 1.6), baseline + 15)
            const minAllowed = Math.max(1, Math.round(baseline * 0.35))
            if (nextEta > maxAllowed) {
              console.warn('[DriverApp] ETA guard: rejecting inflated ETA', { baseline, nextEta, maxAllowed })
              // Clamp instead of accept a huge spike.
              nextEta = maxAllowed
            } else if (nextEta < minAllowed) {
              nextEta = minAllowed
            }
          }

          const last = guard.lastAcceptedEtaMinutes
          const now = Date.now()
          const sinceLast = now - (guard.lastAcceptedAtMs || 0)
          if (typeof last === 'number' && Number.isFinite(last)) {
            // Within first 2 minutes of starting nav, disallow large increases (common GPS/speed noise).
            const sinceStart = now - (guard.startedAtMs || now)
            if (sinceStart < 2 * 60 * 1000 && nextEta > last + 5) {
              nextEta = last + 2
            }
            // Smooth updates to avoid jitter.
            if (sinceLast < 5 * 60 * 1000) {
              nextEta = Math.max(0, Math.round(last * 0.7 + nextEta * 0.3))
            }
          }

          guard.lastAcceptedEtaMinutes = nextEta
          guard.lastAcceptedAtMs = now

          setLiveEta({ distanceMiles: remainingMiles, etaMinutes: nextEta })
        }
      } catch { /* silent */ }
    }
    poll()
    const id = setInterval(poll, 60000)
    return () => { cancelled = true; clearInterval(id) }
  }, [isNavigating, navigationData?.destination?.lat, navigationData?.destination?.lng, navigationData?.distance, traveledDistanceMeters, vehicle?.coordinate, userLocation])

  // ETA guardrails state (kept outside render churn)

  // Poll route notifications (reminders, leave-by, faster route) when user has routes with notifications on
  const hasRouteNotificationsOn = routes.some((r: SavedRoute) => r.notifications && (r as { is_active?: boolean; active?: boolean }).is_active !== false && (r as { active?: boolean }).active !== false)
  useEffect(() => {
    if (!hasRouteNotificationsOn || isNavigating) return
    const fetchNotifications = async () => {
      try {
        const res = await api.get<{ success?: boolean; data?: typeof routeNotifications }>(
          `/api/routes/notifications?lat=${userLocation.lat}&lng=${userLocation.lng}&window_minutes=120`
        )
        if (res.success && Array.isArray((res.data as any)?.data)) setRouteNotifications((res.data as any).data)
      } catch { /* silent */ }
    }
    fetchNotifications()
    const id = setInterval(fetchNotifications, 60000)
    return () => clearInterval(id)
  }, [hasRouteNotificationsOn, isNavigating, userLocation.lat, userLocation.lng])

  // When navigating but not live GPS: don't fake speed — show 0 until real movement
  useEffect(() => {
    if (isNavigating && !isLive) {
      const interval = setInterval(() => {
        setCurrentSpeed(0) // Don't fake speed — show 0 until real GPS movement
        setCarHeading((prev) => prev) // Don't randomly rotate heading either
      }, 5000)
      return () => clearInterval(interval)
    } else if (!isLive) {
      setCurrentSpeed(0)
    }
  }, [isNavigating, isLive])

  // Load all data from API
  const loadData = async () => {
    try {
      const [locRes, routeRes, offerRes, badgeRes, skinRes, userRes, challengeRes, carRes, onboardingRes] = await Promise.all([
        api.get('/api/locations'),
        api.get('/api/routes'),
        api.get('/api/offers'),
        cachedGet('/api/badges', 10 * 60 * 1000),
        api.get('/api/skins'),
        cachedGet('/api/user/profile', 2 * 60 * 1000),
        api.get('/api/challenges'),
        api.get('/api/user/car'),
        api.get('/api/user/onboarding-status')
      ])
      const loc = payload(locRes) ?? locRes.data
      const route = payload(routeRes) ?? routeRes.data
      const offer = payload(offerRes) ?? offerRes.data
      const badge = payload(badgeRes) ?? badgeRes.data
      const skin = payload(skinRes) ?? skinRes.data
      const user = payload(userRes) ?? userRes.data
      const challenge = payload(challengeRes) ?? challengeRes.data
      const car = payload(carRes) ?? carRes.data
      const onboarding = payload(onboardingRes) ?? onboardingRes.data

      if (locRes.success && loc != null) setLocations(Array.isArray(loc) ? loc : [])
      if (routeRes.success && route != null) {
        setRoutes((Array.isArray(route) ? route : []).map((r: SavedRoute & { active?: boolean }) => ({ ...r, is_active: r.is_active ?? r.active ?? true })))
        const limit = (routeRes as { route_limit?: number }).route_limit
        if (typeof limit === 'number') setRouteLimit(limit)
      }
      if (offerRes.success && offer != null) setOffers(Array.isArray(offer) ? offer : [])
      if (badgeRes.success && badge != null) {
        const arr = Array.isArray(badge) ? badge : (typeof badge === 'object' && badge && Array.isArray((badge as { badges?: unknown[] }).badges) ? (badge as { badges: unknown[] }).badges : [])
        setBadges(Array.isArray(arr) ? arr : [])
      }
      if (skinRes.success && skin != null) setSkins(Array.isArray(skin) ? skin : [])
      if (userRes.success && user != null && typeof user === 'object') {
        setUserData((prev) => ({ ...prev, ...(user as Record<string, unknown>) } as DriverUserData))
        const p = (user as { plan?: string }).plan
        setUserPlan(p === 'premium' || p === 'family' ? p : 'basic')
        setGemMultiplier((user as { gem_multiplier?: number }).gem_multiplier || 1)
        setRouteLimit((user as { is_premium?: boolean }).is_premium ? 20 : 5)
      }
      if (challengeRes.success && challenge != null) setChallenges(Array.isArray(challenge) ? challenge : [])
      if (carRes.success && car != null && typeof car === 'object') {
        const c = car as { category?: string; variant?: string; color?: string; owned_colors?: string[] }
        setUserCar({
          category: c.category || 'sedan',
          variant: c.variant || 'sedan-classic',
          color: c.color || 'midnight-black',
        })
        setOwnedColors(c.owned_colors || [])
      }
      if (onboardingRes.success && onboarding != null && typeof onboarding === 'object') {
        const o = onboarding as { onboarding_complete?: boolean; plan_selected?: boolean; car_selected?: boolean }
        if (!o.onboarding_complete) {
          // Plan selection available in Profile > Upgrade; no car selection on login
        }
      }

      const canLoadFamilyMembers =
        api.getToken() &&
        ((user as { plan?: string | null })?.plan === 'family' || (user as { is_family_plan?: boolean | null })?.is_family_plan === true)
      if (!canLoadFamilyMembers) {
        setFamily([])
        return
      }
      const famRes = await api.get('/api/family/members')
      const fam = payload(famRes) ?? famRes.data
      if (famRes.success && fam != null) {
        const famMembers = Array.isArray(fam) ? fam : (typeof fam === 'object' && fam && Array.isArray((fam as { members?: unknown[] }).members) ? (fam as { members: FamilyMember[] }).members : [])
        setFamily(famMembers)
      }
    } catch (e) {
      toast.error('Could not load data — showing empty state')
    }
  }

  

  // Handle car customization
  const handleCarChange = async (car: { category: string; variant: string; color: string }) => {
    try {
      const res = await api.post('/api/user/car', car)
      if (res.success) {
        setUserCar(car)
        toast.success('Car updated!')
      } else {
        toast.error((res.data as { message?: string })?.message ?? 'Could not update car')
      }
    } catch (e) {
      toast.error('Could not update car')
    }
  }

  const handlePurchaseColor = async (colorKey: string, price: number) => {
    try {
      const res = await api.post(`/api/user/car/color/${colorKey}/purchase`)
      if (res.success) {
        const payload = res.data as { data?: { new_gem_total?: number }; new_gems?: number }
        const newGems = payload?.data?.new_gem_total ?? payload?.new_gems
        setOwnedColors(prev => [...prev, colorKey])
        setUserData((prev: any) => ({ ...prev, gems: newGems ?? prev.gems }))
        toast.success(`Color purchased for ${price} gems!`)
      } else {
        toast.error((res.data as { message?: string })?.message ?? 'Could not purchase color')
      }
    } catch (e) {
      toast.error('Could not purchase color')
    }
  }

  // Handle plan selection
  const handlePlanSelect = async (plan: 'basic' | 'premium' | 'family') => {
    try {
      const res = await api.post('/api/user/plan', { plan })
      if (res.success) {
        setUserPlan(plan)
        setGemMultiplier(plan === 'premium' ? 2 : 1)
        setUserData((prev: any) => ({ 
          ...prev, 
          plan, 
          is_premium: plan === 'premium',
          gem_multiplier: plan === 'premium' ? 2 : 1
        }))
        setShowPlanSelection(false)
        setShowAppTour(true)
        toast.success(plan === 'premium' ? '🎉 Welcome to Premium!' : plan === 'family' ? '👨‍👩‍👧‍👦 Family plan activated!' : 'Plan selected!')
      } else {
        toast.error((res.data as { message?: string })?.message ?? 'Could not update plan')
      }
    } catch (e) {
      toast.error('Could not update plan')
    }
  }

  const handleCarOnboardingComplete = async (selection: { category: string; variant: string; color: string }) => {
    setUserCar(selection)
    setShowCarOnboarding(false)
    try {
      await api.post('/api/user/car', selection)
      toast.success('Welcome to SnapRoad! 🚗')
      setShowAppTour(true)
    } catch (e) {
      toast.error('Could not save car — please try again')
    }
  }

  // Legacy RoadReports modal removed in favor of the Waze-style incidents system (/api/incidents/*).

  const handleQuickReport = async (type: string, coords?: { lat: number; lng: number }) => {
    let lat = coords?.lat ?? userLocation?.lat
    let lng = coords?.lng ?? userLocation?.lng
    if (!lat || !lng) {
      toast.error('Location not available')
      return
    }

    // If navigating, snap the report to the nearest point on the active route so the icon appears "on route".
    try {
      if (isNavigating && Array.isArray(routePolylineForMap) && routePolylineForMap.length > 1) {
        const R = 6371000
        let best = Infinity
        let bestPt = routePolylineForMap[0]
        for (let i = 0; i < routePolylineForMap.length; i++) {
          const p = routePolylineForMap[i]
          const dLat = ((p.lat - lat) * Math.PI) / 180
          const dLon = ((p.lng - lng) * Math.PI) / 180
          const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos((lat * Math.PI) / 180) * Math.cos((p.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
          const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
          if (d < best) { best = d; bestPt = p }
        }
        lat = bestPt.lat
        lng = bestPt.lng
      }
    } catch { /* ignore */ }

    const gemsReward: Record<string, number> = {
      hazard: 15,
      police: 25,
      accident: 50,
      construction: 10,
      weather: 20,
      pothole: 15,
      closure: 30,
      crash: 50,
      camera: 10,
    }

    try {
      const res = await api.post('/api/incidents/report', {
        type,
        lat,
        lng,
        reported_by: user?.id,
        description: `${type} reported by driver`,
      })
      if (!res.success) {
        const msg = (res as any)?.error || 'Failed to submit report'
        toast.error(String(msg))
        throw new Error(String(msg))
      }

      const created = (res.data as any)?.data ?? (res.data as any)?.data?.data ?? (res.data as any)?.data
      const createdId = typeof created?.id === 'number' ? created.id : Date.now()
      const newReport: RoadReport = {
        id: createdId,
        type,
        lat,
        lng,
        title: type.charAt(0).toUpperCase() + type.slice(1),
        severity: type === 'accident' || type === 'crash' || type === 'closure' ? 'high' : 'medium',
      }
      setRoadReports((prev) => [...(prev || []), newReport])

      setShowReportModal(false)
      setShowQuickPhotoReport(false)

      const gems = gemsReward[type] || 15
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} reported — +${gems} gems`, { duration: 3000 })
      setUserData((prev: any) => ({ ...prev, gems: (prev?.gems || 0) + gems }))

      // Sync from backend so it doesn't "disappear" on the next poll.
      setTimeout(() => { loadRoadReports() }, 500)
    } catch (err) {
      console.error('Report failed:', err)
      toast.error('Failed to submit report')
    }
  }

  const handleQuickPhotoReport = async (report: { type: string; photo_url: string; lat: number; lng: number }) => {
    try {
      const isIconOnly = !report.photo_url || report.photo_url.length === 0
      if (isIconOnly) {
        await handleQuickReport(report.type, { lat: report.lat, lng: report.lng })
        return { success: true }
      }
      // Photo-based reporting is not supported in the incidents v1 API; fallback to quick report.
      await handleQuickReport(report.type, { lat: report.lat, lng: report.lng })
      return { success: true }
    } catch (e) {
      toast.error('Could not post report')
      return { success: false }
    }
  }

  

  const handleShareTripClick = async () => {
    handleShareTrip({
      safetyScore: Number(userData.safety_score),
      gemMultiplier: Number(userData.gem_multiplier ?? 1),
    })
  }

  // Open share modal after trip completion
  // Handle direct offer redemption (opens compact popup)
  const handleDirectRedemption = (offer: DriverAppOffer) => {
    setSelectedOfferForRedemption(offer as never)
    setShowRedemptionPopup(true)
  }

  // Old share trip function for backwards compatibility
  // Widget drag handlers
  const handleWidgetDragStart = (widgetId: string, e: React.MouseEvent | React.TouchEvent) => {
    setDraggingWidget(widgetId)
    e.preventDefault()
  }

  const handleWidgetDrag = (e: React.MouseEvent | React.TouchEvent) => {
    if (!draggingWidget) return
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    const container = document.getElementById('map-container')
    if (container) {
      const rect = container.getBoundingClientRect()
      setWidgets(prev => ({
        ...prev,
        [draggingWidget]: {
          ...prev[draggingWidget],
          position: {
            x: Math.max(0, Math.min(clientX - rect.left - 50, rect.width - 120)),
            y: Math.max(120, Math.min(clientY - rect.top - 20, rect.height - 100))
          }
        }
      }))
    }
  }

  const handleWidgetDragEnd = async () => {
    if (draggingWidget) {
      try {
        const w = widgets[draggingWidget]
        await api.put(`/api/widgets/${draggingWidget}/position?x=${w.position.x}&y=${w.position.y}`)
      } catch (_e) { /* silently ignore */ }
    }
    setDraggingWidget(null)
  }

  // Toggle widget collapse
  const toggleWidgetCollapse = async (widgetId: string) => {
    setWidgets(prev => ({
      ...prev,
      [widgetId]: { ...prev[widgetId], collapsed: !prev[widgetId].collapsed }
    }))
    try {
      await api.put(`/api/widgets/${widgetId}/collapse`)
    } catch (_e) { /* silently ignore */ }
  }

  const handleLeaveEarlyForRoute = async (routeId: number) => {
    try {
      const route = routes.find((r) => r.id === routeId)
      const desiredArrival = (() => {
        if (!route?.departure_time) return undefined
        const [h, m] = route.departure_time.split(':').map((v) => Number(v))
        if (!Number.isFinite(h) || !Number.isFinite(m)) return undefined
        const baseline = Math.max(5, Number(route.estimated_time || 18))
        const total = (((h * 60 + m + baseline) % (24 * 60)) + (24 * 60)) % (24 * 60)
        const hh = Math.floor(total / 60)
        const mm = total % 60
        return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
      })()
      const res = await api.post<{ success?: boolean; data?: { leave_by: string; eta_minutes: number; destination: string } }>(
        `/api/routes/${routeId}/notify-leave-early`,
        { origin_lat: userLocation.lat, origin_lng: userLocation.lng, desired_arrival: desiredArrival }
      )
      if (res.success && res.data !== undefined) {
        const outer = res.data as unknown
        const inner =
          outer && typeof outer === 'object' && 'data' in (outer as Record<string, unknown>)
            ? (outer as { data: unknown }).data
            : outer
        if (isLeaveEarlyPayload(inner)) {
          setLeaveEarlyForRoute({
            routeId,
            leaveBy: inner.leave_by,
            etaMinutes: inner.eta_minutes,
            destination: inner.destination,
          })
        }
      }
    } catch {
      toast.error('Could not get leave-by time')
    }
  }

  const handleDismissTripSummary = async () => {
    setShowTripSummary(false)
    await dismissTripSummary()
    toast.success('Trip completed!')
  }

  const handleSearchLocations = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    searchAbortRef.current?.abort()
    const controller = new AbortController()
    searchAbortRef.current = controller

    setIsSearching(true)
    setSearchResults([])
    try {
      try {
        const placeRes = await api.get<{ success?: boolean; data?: Array<{ place_id?: string; name?: string; address?: string; description?: string }> }>(
          `/api/places/autocomplete?q=${encodeURIComponent(query)}&lat=${userLocation.lat}&lng=${userLocation.lng}`
        )
        if (controller.signal.aborted) return
        const placeData = placeRes?.data as { success?: boolean; data?: Array<{ place_id?: string; name?: string; address?: string; description?: string }> } | undefined
        if (placeRes?.success && placeData?.success && Array.isArray(placeData.data) && placeData.data.length > 0) {
          const list: SearchResult[] = placeData.data.map((p, i) => ({
            id: p.place_id ?? `ac-${i}-${p.name}`,
            name: p.name ?? p.description ?? '',
            address: p.address ?? '',
            lat: 0,
            lng: 0,
            place_id: p.place_id,
          }))
          setSearchResults(list)
          setIsSearching(false)
          return
        }
      } catch { /* fall through to backend */ }
      if (controller.signal.aborted) return
      const params = new URLSearchParams({
        q: query,
        lat: userLocation.lat.toString(),
        lng: userLocation.lng.toString(),
        limit: '8'
      })
      const res = await api.get<{ success?: boolean; data?: unknown[] }>(`/api/map/search?${params}`)
      if (controller.signal.aborted) return
      if (res.success && res.data) {
        const list = (res.data as { data?: unknown[] })?.data ?? res.data
        setSearchResults(Array.isArray(list) ? (list as SearchResult[]) : [])
      }
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return
      console.error('Search error:', e)
    }
    if (!controller.signal.aborted) setIsSearching(false)
  }

  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    if (query.length === 0) setSearchResultPhotos({})
    if (query.length >= 2) {
      searchTimeoutRef.current = setTimeout(() => handleSearchLocations(query), 300)
    } else {
      searchAbortRef.current?.abort()
      setSearchResults([])
      setIsSearching(false)
    }
  }

  const fetchDirections = async (destination: NavigationDestination) => {
    const origin = vehicle?.coordinate ?? userLocation
    const oLat = Number(origin?.lat)
    const oLng = Number(origin?.lng)
    const dLat = Number(destination?.lat)
    const dLng = Number(destination?.lng)

    if (!Number.isFinite(oLat) || !Number.isFinite(oLng) || !Number.isFinite(dLat) || !Number.isFinite(dLng)) {
      console.warn('fetchDirections: invalid coordinates')
      toast.error('Invalid location')
      return
    }

    try {
      const rawHeight = Number((userData as { vehicle_height_meters?: number | null }).vehicle_height_meters)
      const maxHeightMeters = avoidLowClearances && Number.isFinite(rawHeight) && rawHeight > 0 ? rawHeight : undefined
      const options: DirectionsResult[] = await getMapboxRouteOptions({ lat: oLat, lng: oLng }, { lat: dLat, lng: dLng }, { maxHeightMeters })

      if (!options?.length || !options[0].polyline?.length) {
        console.warn('Directions API returned no route')
        toast.error('Could not get directions. Try another destination.')
        return
      }

      setAvailableRoutes(options)
      setSelectedRouteIndex(0)
      setSelectedRouteId('best')

      const first = options[0]
      const distMiles = (first.distance / 1609.34).toFixed(1)
      const etaMin = Math.round(first.duration / 60)

      const nav: NavigationState = {
        origin: { lat: oLat, lng: oLng, name: 'Current Location' },
        destination: { lat: dLat, lng: dLng, name: destination?.name ?? 'Destination' },
        steps: first.steps.map((s) => ({
          instruction: s.instruction,
          distance: s.distanceMeters > 1609 ? `${(s.distanceMeters / 1609.34).toFixed(1)} mi` : `${Math.round(s.distanceMeters)} ft`,
          distanceMeters: s.distanceMeters,
          maneuver: s.maneuver,
          lanes: s.lanes,
          lat: s.lat,
          lng: s.lng,
        })),
        polyline: first.polyline,
        duration: { text: etaMin < 60 ? `${etaMin} min` : `${Math.floor(etaMin / 60)}h ${etaMin % 60}m`, seconds: first.duration },
        distance: { text: `${distMiles} mi`, meters: first.distance },
        traffic: 'normal',
        notifications: first.notifications,
      }

      setNavigationData(nav)
      setRoutePolyline(first.polyline)
      setCurrentStepIndex(0)
      if (isNavigatingRef.current) {
        traveledDistanceRef.current = 0
        setTraveledDistanceMeters(0)
      } else {
        setShowRoutePreview(true)
      }
      setMapDroppedPin(null)
      if (zoomToUserRef.current) hasZoomedToUser.current = false
    } catch (e) {
      console.error('Directions error:', e)
      toast.error('Could not get route')
    }
  }

  // Handle destination selection from search (resolve place_id to lat/lng if needed)
  const handleSelectDestination = async (location: SearchResult) => {
    let resolved = location
    if (location.place_id && (!Number.isFinite(location.lat) || !Number.isFinite(location.lng) || (location.lat === 0 && location.lng === 0))) {
      try {
        const detailsRes = await api.get<{ success?: boolean; data?: { lat?: number; lng?: number; name?: string; address?: string } }>(
          `/api/places/details/${encodeURIComponent(location.place_id)}`
        )
        const body = detailsRes?.data as { success?: boolean; data?: { lat?: number; lng?: number; name?: string; address?: string } } | undefined
        const d = body?.data
        if (detailsRes?.success && body?.success && d && Number.isFinite(d.lat) && Number.isFinite(d.lng)) {
          resolved = { ...location, lat: d.lat!, lng: d.lng!, name: d.name ?? location.name, address: d.address ?? location.address }
        }
      } catch { /* use as-is */ }
    }
    setSelectedDestination(resolved)
    setSearchQuery(resolved.name)
    setSearchResults([])
    setShowSearch(false)
    toast.loading('Calculating route...', { duration: 1500 })
    await fetchDirections(resolved)
    setTimeout(() => toast.success('Route ready'), 1500)
  }
  fetchDirectionsRef.current = fetchDirections
  handleSelectDestinationRef.current = handleSelectDestination

  const stopFollowingFriend = useCallback(() => {
    stopAllFollowModes()
  }, [stopAllFollowModes])

  const cancelCrashAlert = () => {
    if (crashTimeoutRef.current) clearTimeout(crashTimeoutRef.current)
    crashTimeoutRef.current = null
    setCrashDetected(false)
    setCrashCancelActive(false)
  }

  

  const startFollowingFriend = async (friend: FriendLocation) => {
    await startLiveNavigation(friend)
  }

  

  useEffect(() => {
    return () => {
      if (followIntervalRef.current) clearInterval(followIntervalRef.current)
      if (crashTimeoutRef.current) clearTimeout(crashTimeoutRef.current)
      if (cameraReturnTimerRef.current) clearTimeout(cameraReturnTimerRef.current)
    }
  }, [])

  // Map click: drop pin at exact tap, reverse-geocode for label, show place card with Directions.
  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    setIsMuted(true)
    setMapClickedPlace(null)
    setSelectedPlace(null)
    setNearbyLoading(true)
    // Pin drops exactly where user tapped
    setMapDroppedPin({ lat, lng })

    try {
      const geo = await reverseGeocode(lat, lng)
      if (geo) {
        setMapDroppedPin((prev) => (prev ? { ...prev, label: geo.name, address: geo.address } : prev))
        setSelectedPlace({
          name: geo.name,
          lat,
          lng,
          address: geo.address,
          type: geo.placeType,
        })
      } else {
        // Fallback: backend nearby POI
        const res = await api.get<{ success?: boolean; data?: PlaceCardData[] }>(
          `/api/places/nearby?lat=${lat}&lng=${lng}&radius=80`
        )
        const data = (res.data as { data?: PlaceCardData[] })?.data ?? (res.data as PlaceCardData[] | undefined)
        const list = Array.isArray(data) ? data : []
        const first = list[0]
        if (first) {
          const name = first.name ?? 'Dropped pin'
          const address = first.address
          setMapDroppedPin((prev) => (prev ? { ...prev, label: name, address } : prev))
          setSelectedPlace({
            name,
            lat: typeof first.lat === 'number' ? first.lat : lat,
            lng: typeof first.lng === 'number' ? first.lng : lng,
            address,
            rating: first.rating ?? undefined,
          })
        } else {
          setMapDroppedPin((prev) => (prev ? { ...prev, label: 'Dropped pin' } : prev))
          setSelectedPlace({ name: 'Dropped pin', lat, lng, address: undefined })
        }
      }
    } catch {
      setMapDroppedPin((prev) => (prev ? { ...prev, label: 'Dropped pin' } : prev))
      setSelectedPlace({ name: 'Dropped pin', lat, lng, address: undefined })
    } finally {
      setNearbyLoading(false)
    }
  }, [])

  // Navigate to a saved location (address book) — set destination and fetch directions in-app
  const handleNavigateToSavedLocation = useCallback(async (loc: SavedLocation) => {
    if (!Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) {
      toast.error('Location has no coordinates — try editing the address')
      return
    }
    const dest = { name: loc.name, lat: loc.lat!, lng: loc.lng!, address: loc.address }
    setSelectedDestination(dest)
    setShowSearch(false)
    toast.loading('Calculating route...', { duration: 1500 })
    try {
      await fetchDirections(dest)
      setTimeout(() => toast.success('Route ready'), 1500)
    } catch {
      toast.error('Could not get directions')
    }
  }, [])

  // Orion: resolve place name to coordinates and start navigation (address book first, then search)
  const handleOrionStartNavigation = useCallback(async (destinationName: string) => {
    if (!destinationName?.trim()) return
    const name = destinationName.trim()
    const nameLower = name.toLowerCase()
    const loc = userLocation ?? { lat: 39.99, lng: -83.0 }

    // 1) Resolve from saved places / address book (Home, Work, favorites)
    const home = locations.find((l) => l.category === 'home')
    const work = locations.find((l) => l.category === 'work')
    if (nameLower === 'home' && home && Number.isFinite(home.lat) && Number.isFinite(home.lng)) {
      await handleSelectDestination({ id: String(home.id), name: home.name, address: home.address, lat: home.lat!, lng: home.lng! })
      setShowOrionVoice(false)
      return
    }
    if (nameLower === 'work' && work && Number.isFinite(work.lat) && Number.isFinite(work.lng)) {
      await handleSelectDestination({ id: String(work.id), name: work.name, address: work.address, lat: work.lat!, lng: work.lng! })
      setShowOrionVoice(false)
      return
    }
    const saved = locations.find((l) => l.name.toLowerCase() === nameLower || l.category?.toLowerCase() === nameLower)
    if (saved && Number.isFinite(saved.lat) && Number.isFinite(saved.lng)) {
      await handleSelectDestination({ id: String(saved.id), name: saved.name, address: saved.address, lat: saved.lat!, lng: saved.lng! })
      setShowOrionVoice(false)
      return
    }
    let searchQuery = name
    if ((nameLower === 'home' && home?.address) || (nameLower === 'work' && work?.address)) {
      const place = nameLower === 'home' ? home : work
      if (place?.address) searchQuery = place.address
    }

    try {
      const placeRes = await api.get<{ success?: boolean; data?: Array<{ place_id?: string; name?: string; address?: string; description?: string }> }>(
        `/api/places/autocomplete?q=${encodeURIComponent(searchQuery)}&lat=${loc.lat}&lng=${loc.lng}`
      )
      const placeData = placeRes?.data as { success?: boolean; data?: Array<{ place_id?: string; name?: string; address?: string; description?: string }> } | undefined
      const list = placeData?.data
      const first = Array.isArray(list) && list.length > 0 ? list[0] : null
      if (!first) {
        const params = new URLSearchParams({ q: searchQuery, lat: String(loc.lat), lng: String(loc.lng), limit: '1' })
        const fallback = await api.get<{ success?: boolean; data?: Array<{ name?: string; address?: string; lat?: number; lng?: number; place_id?: string }> }>(`/api/map/search?${params}`)
        const fallbackData = (fallback?.data as { data?: unknown[] })?.data ?? (fallback?.data as unknown[])
        const fbFirst = Array.isArray(fallbackData) && fallbackData.length > 0 ? fallbackData[0] as { name?: string; address?: string; lat?: number; lng?: number } : null
        if (fbFirst && Number.isFinite(fbFirst.lat) && Number.isFinite(fbFirst.lng)) {
          await handleSelectDestination({
            id: 'orion-1',
            name: fbFirst.name ?? destinationName,
            address: fbFirst.address ?? '',
            lat: fbFirst.lat!,
            lng: fbFirst.lng!,
          })
          setShowOrionVoice(false)
          return
        }
        toast.error(`Couldn't find "${destinationName}". Try a different name or address.`)
        return
      }
      const candidate: SearchResult = {
        id: first.place_id ?? 'orion-ac',
        name: first.name ?? first.description ?? destinationName,
        address: first.address ?? '',
        lat: 0,
        lng: 0,
        place_id: first.place_id,
      }
      if (first.place_id) {
        const detailsRes = await api.get<{ success?: boolean; data?: { lat?: number; lng?: number; name?: string; address?: string } }>(
          `/api/places/details/${encodeURIComponent(first.place_id)}`
        )
        const d = (detailsRes?.data as { data?: { lat?: number; lng?: number; name?: string; address?: string } })?.data
        if (d && Number.isFinite(d.lat) && Number.isFinite(d.lng)) {
          candidate.lat = d.lat!
          candidate.lng = d.lng!
          candidate.name = d.name ?? candidate.name
          candidate.address = d.address ?? candidate.address
        }
      }
      if (Number.isFinite(candidate.lat) && Number.isFinite(candidate.lng)) {
        await handleSelectDestination(candidate)
        setShowOrionVoice(false)
      } else {
        toast.error(`Couldn't get coordinates for "${destinationName}". Try another search.`)
      }
    } catch (e) {
      console.error('Orion start navigation error:', e)
      toast.error(`Couldn't start navigation to "${destinationName}". Try searching on the map.`)
    }
  }, [userLocation, handleSelectDestination, locations])

  const handleOrionNavigateToOffer = useCallback((offerName: string) => {
    const name = offerName.trim().toLowerCase()
    const offer = offers?.find((o: DriverAppOffer) => (o.business_name?.toLowerCase().includes(name) || (o.title ?? '').toLowerCase().includes(name)))
    if (!offer) {
      toast.error(`Couldn't find "${offerName}" in nearby offers.`)
      return
    }
    const lat = offer.lat ?? (offer as { lat?: number }).lat
    const lng = offer.lng ?? (offer as { lng?: number }).lng
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      handleOrionStartNavigation(String(offer.business_name ?? offer.title ?? offerName))
      return
    }
    handleSelectDestination({
      id: 'offer-' + (offer.id ?? 0),
      name: String(offer.business_name ?? offer.title ?? offerName),
      address: String((offer as { address?: string }).address ?? ''),
      lat: Number(lat),
      lng: Number(lng),
    })
    setShowOrionVoice(false)
  }, [offers, handleSelectDestination, handleOrionStartNavigation])

  const handleOrionVoiceReport = useCallback((report: { type: string; side?: string; distance_feet?: number }) => {
    const { lat, lng } = userLocation ?? { lat: 0, lng: 0 }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
    handleQuickPhotoReport({
      type: report.type,
      photo_url: '',
      lat,
      lng,
    })
  }, [userLocation, handleQuickPhotoReport])

  const handleCancelRoutePreview = () => {
    setShowRoutePreview(false)
    setNavigationData(null)
    setRoutePolyline(null)
    setAvailableRoutes([])
    setSelectedDestination(null)
  }

  const handleVoiceCommand = async () => {
    if (!userData.is_premium) {
      toast('Upgrade to Premium for Orion', { icon: '🔒' })
      return
    }
    setShowOrionVoice(true)
  }

  // Location handlers
  const handleAddLocation = async () => {
    if (!newLocation.name || !newLocation.address) {
      toast.error('Please fill all fields')
      return
    }
    try {
      const res = await api.post('/api/locations', newLocation)
      if (res.success) {
        toast.success((res.data as { message?: string })?.message ?? 'Location added!')
        const newLoc = (res.data as { data?: typeof locations[0] })?.data ?? (res.data as typeof locations[0])
        if (newLoc && typeof newLoc === 'object') setLocations([...locations, newLoc])
      setNewLocation({ name: '', address: '', category: 'favorite' })
      setShowAddLocation(false)
      } else {
        toast.error((res.data as { message?: string })?.message ?? 'Could not add location')
      }
    } catch (e) {
      toast.error('Could not add location')
    }
  }

  // Route handlers
  const handleAddRoute = async () => {
    if (!newRoute.name || !newRoute.origin || !newRoute.destination) {
      toast.error('Please fill all fields')
      return
    }
    try {
      const res = await api.post('/api/routes', newRoute) as { success?: boolean; data?: { message?: string; data?: SavedRoute }; message?: string }
      if (res.success) {
        toast.success((res.data as { message?: string })?.message ?? 'Route saved!')
        const newRouteObj = (res.data as { data?: SavedRoute })?.data ?? (res.data as SavedRoute)
        if (newRouteObj && typeof newRouteObj === 'object') {
          const r = newRouteObj as SavedRoute & { active?: boolean }
          const normalized: SavedRoute = {
            ...r,
            is_active: r.is_active ?? r.active ?? true,
            estimated_time: r.estimated_time ?? 0,
            distance: r.distance ?? 0,
            days_active: Array.isArray(r.days_active) ? r.days_active : [],
          }
          setRoutes([...routes, normalized])
        }
        setNewRoute({ name: '', origin: '', destination: '', departure_time: '08:00', days_active: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], notifications: true })
        setOriginSuggestions([])
        setDestinationSuggestions([])
        setShowAddRoute(false)
      } else {
        const msg = (res.data as { message?: string })?.message ?? res.message ?? 'Could not add route'
        toast.error(msg)
      }
    } catch (e) {
      toast.error('Could not add route')
    }
  }

  const handleDeleteRoute = async (id: number) => {
    try {
      await api.delete(`/api/routes/${id}`)
      setRoutes(routes.filter(r => r.id !== id))
      toast.success('Route deleted')
    } catch (e) {
      toast.error('Could not delete route')
    }
  }

  const handleToggleRoute = async (id: number) => {
    try {
      const res = await api.put(`/api/routes/${id}/toggle`)
      if (res.success) {
      setRoutes(routes.map(r => r.id === id ? { ...r, is_active: !r.is_active } : r))
        toast.success((res.data as { message?: string })?.message ?? 'Route updated')
      } else {
        toast.error((res.data as { message?: string })?.message ?? 'Could not update route')
      }
    } catch (e) {
      toast.error('Could not update route')
    }
  }

  const handleToggleRouteNotifications = async (id: number) => {
    try {
      const res = await api.put(`/api/routes/${id}/notifications`)
      if (res.success) {
      setRoutes(routes.map(r => r.id === id ? { ...r, notifications: !r.notifications } : r))
        toast.success((res.data as { message?: string })?.message ?? 'Notifications updated')
      } else {
        toast.error((res.data as { message?: string })?.message ?? 'Could not update notifications')
      }
    } catch (e) {
      toast.error('Could not update notifications')
    }
  }

  // Report incident
  const handleReportIncident = async (type: string, gems: number) => {
    await handleQuickReport(type)
    // Keep the parameter for existing UI call sites; gems are awarded inside handleQuickReport.
    void gems
  }

  // Family handlers
  const handleCallMember = async (member: FamilyMember) => {
    try {
      const res = await api.post(`/api/family/${member.id}/call`)
      if (res.success) {
      toast.success(`Calling ${member.name}...`)
      } else {
        toast.error((res.data as { message?: string })?.message ?? 'Could not start call')
      }
    } catch (e) {
      toast.error('Could not start call')
    }
  }

  const handleMessageMember = async (member: FamilyMember) => {
    try {
      const res = await api.post(`/api/family/${member.id}/message`)
      if (res.success) {
      toast.success(`Opening chat with ${member.name}`)
      } else {
        toast.error((res.data as { message?: string })?.message ?? 'Could not open chat')
      }
    } catch (e) {
      toast.error('Could not open chat')
    }
  }

  // Skin handlers
  // Voice toggle
  const handleToggleVoice = async () => {
    const newMuted = !isMuted
    setIsMuted(newMuted)
    try {
      const res = await api.put(`/api/settings/voice?muted=${newMuted}`)
      if (res.success) {
        toast.success(newMuted ? 'Voice muted' : 'Voice unmuted')
      } else {
        setIsMuted(!newMuted)
        toast.error((res.data as { message?: string })?.message ?? 'Could not update voice setting')
      }
    } catch (e) {
      setIsMuted(!newMuted)
      toast.error('Could not update voice setting')
    }
  }

  const navOrionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navOrionStopRef = useRef<(() => void) | null>(null)

  // During nav: voice-only Orion (no full chat) — premium only
  const handleNavOrionMic = useCallback(() => {
    if (!userData.is_premium) {
      toast('Upgrade to Premium for Orion voice assistant', { icon: '🔒' })
      return
    }
    if (isNavOrionListening) return
    const stop = startListening(
      (text) => {
        if (!text.trim()) return
        const ctx = buildOrionContext()
        chatWithOrion([{ role: 'user', content: text }], ctx)
          .then((reply) => { if (reply && typeof reply === 'string') orionSpeak(reply, 'normal', isMuted) })
          .catch(() => toast.error('Orion unavailable'))
      },
      () => {
        setIsNavOrionListening(false)
        if (navOrionTimeoutRef.current) clearTimeout(navOrionTimeoutRef.current)
        navOrionTimeoutRef.current = null
        navOrionStopRef.current = null
      }
    )
    if (stop) {
      navOrionStopRef.current = stop
      setIsNavOrionListening(true)
      navOrionTimeoutRef.current = setTimeout(() => {
        stop()
        setIsNavOrionListening(false)
        navOrionTimeoutRef.current = null
        navOrionStopRef.current = null
      }, 12000)
    } else {
      toast.error('Voice input not supported')
    }
  }, [userData.is_premium, isNavOrionListening, buildOrionContext, isMuted])

  // ==================== RENDER FUNCTIONS ====================

  // Sidebar theme tokens (follows Settings > Appearance)
  const menuBg = isLight ? 'bg-white' : 'bg-slate-900'
  const menuCard = isLight ? 'bg-slate-100' : 'bg-white/10'
  const menuSection = isLight ? 'text-slate-500' : 'text-slate-400'
  const menuItem = isLight ? 'hover:bg-slate-100 text-slate-700 hover:text-slate-900' : 'hover:bg-slate-800 text-slate-300 hover:text-white'
  const menuBorder = isLight ? 'border-slate-200' : 'border-slate-700'
  const menuBadge = isLight ? 'bg-slate-200 text-slate-600' : 'bg-slate-700 text-slate-300'

  // Hamburger Menu — theme-aware; Log Out fixed under nav (not in bottom bar)
  const renderMenu = () => (
    <div className="fixed inset-0 bg-black/50 z-[1100] flex" onClick={() => setShowMenu(false)}>
      <div className={`w-72 ${menuBg} h-full animate-slide-right flex flex-col shadow-xl`} onClick={e => e.stopPropagation()}>
        <div className="flex-shrink-0 p-4 bg-gradient-to-r from-blue-600 to-blue-500">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowCarStudio(true)} className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center overflow-hidden hover:bg-white/30 transition-colors">
              {userCar.category ? (
                <ProfileCar category={userCar.category as any} color={userCar.color as any} size={40} />
              ) : (
                <span className="text-white font-bold text-sm">{userData.name?.split(' ').map((n: string) => n[0]).join('')}</span>
              )}
            </button>
            <div className="min-w-0 flex-1">
              <h3 className="text-white font-semibold text-sm truncate">{userData.name}</h3>
              <p className="text-blue-100 text-xs">Level {userData.level} • {userData.is_premium ? '⚡ PRO' : 'Free'}</p>
            </div>
          </div>
          <div className={`mt-3 ${menuCard} rounded-lg px-3 py-2 flex items-center justify-between`}>
            <div>
              <p className="text-blue-100/90 text-[10px]">ID</p>
              <p className="text-white font-semibold text-sm tracking-wide">{userData.id || '123456'}</p>
            </div>
            <div className="flex gap-3">
              <div className="text-center">
                <p className="text-white font-semibold text-xs">{((Number(userData.gems) ?? 0)/1000).toFixed(1)}K</p>
                <p className="text-blue-100/80 text-[10px]">Gems</p>
              </div>
              <div className="text-center">
                <p className="text-white font-semibold text-xs">{userData.safety_score}</p>
                <p className="text-blue-100/80 text-[10px]">Score</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-3">
          <p className={`text-[10px] font-medium uppercase tracking-wider px-2 py-1.5 ${menuSection}`}>Social</p>
          {[
            { icon: Users, label: 'Friends Hub', badge: userData.friends_count, action: () => { setShowFriendsHub(true); setShowMenu(false) } },
            { icon: Users, label: 'Family Mode', action: () => { setShowFamilyDashboard(true); setShowMenu(false) } },
            { icon: Users, label: 'Convoy Mode', action: () => { setShowConvoy(true); setShowMenu(false) } },
            { icon: Gem, label: 'Gem History', action: () => { setShowGemHistory(true); setShowMenu(false) } },
          ].map((item, i) => (
            <button key={i} onClick={item.action} data-testid={`menu-${item.label.toLowerCase().replace(' ', '-')}`}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${menuItem}`}>
              <item.icon size={18} className="flex-shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge !== undefined && <span className={`text-xs px-2 py-0.5 rounded-full ${menuBadge}`}>{item.badge}</span>}
            </button>
          ))}

          <p className={`text-[10px] font-medium uppercase tracking-wider px-2 py-1.5 mt-4 ${menuSection}`}>Navigate</p>
          {[
            { icon: MapPin, label: 'Map', action: () => { setActiveTab('map'); setShowMenu(false) } },
            { icon: Users, label: 'Dashboards', action: () => { setActiveTab('dashboards'); setShowMenu(false) } },
            { icon: Star, label: 'Favorites', badge: locations.filter(l => !['home','work'].includes(l.category)).length, action: () => { setActiveTab('map'); setLocationCategory('favorites'); setShowMenu(false) } },
          ].map((item, i) => (
            <button key={i} onClick={item.action} data-testid={`menu-${item.label.toLowerCase().replace(' ', '-')}`}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${menuItem}`}>
              <item.icon size={18} className="flex-shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge !== undefined && <span className={`text-xs px-2 py-0.5 rounded-full ${menuBadge}`}>{item.badge}</span>}
            </button>
          ))}

          <p className={`text-[10px] font-medium uppercase tracking-wider px-2 py-1.5 mt-4 ${menuSection}`}>Rewards & Drive</p>
          {[
            { icon: Gift, label: 'Offers', badge: offers.length, action: () => { setActiveTab('rewards'); setRewardsTab('offers'); setShowMenu(false) } },
            { icon: Award, label: 'All Badges', badge: `${(Array.isArray(badges) ? badges : []).filter((b: Record<string, unknown>) => b.earned).length}/160`, action: () => { setShowBadgesGrid(true); setShowMenu(false) } },
            ...(userData.is_premium ? [{ icon: Car, label: 'Car Studio', badge: undefined as number | undefined, action: () => { setShowCarStudio(true); setShowMenu(false) } }] : []),
            { icon: Fuel, label: 'Fuel Tracker', action: () => { setShowFuelDashboard(true); setShowMenu(false) } },
            { icon: Shield, label: 'Driver Score', action: () => { setActiveTab('profile'); setProfileTab('score'); setShowMenu(false) } },
            { icon: BarChart3, label: 'Trip Analytics', action: () => { setShowTripAnalytics(true); setShowMenu(false) } },
            { icon: Map, label: 'Route History', action: () => { setShowRouteHistory3D(true); setShowMenu(false) } },
          ].map((item, i) => (
            <button key={i} onClick={item.action} data-testid={`menu-${item.label.toLowerCase().replace(' ', '-')}`}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${menuItem}`}>
              <item.icon size={18} className="flex-shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge !== undefined && <span className={`text-xs px-2 py-0.5 rounded-full ${menuBadge}`}>{item.badge}</span>}
            </button>
          ))}

          <p className={`text-[10px] font-medium uppercase tracking-wider px-2 py-1.5 mt-4 ${menuSection}`}>Settings</p>
          {[
            { icon: Volume2, label: isMuted ? 'Unmute' : 'Mute', action: handleToggleVoice },
            { icon: Settings, label: 'Settings', action: () => { setActiveTab('profile'); setProfileTab('settings'); setShowMenu(false) } },
            { icon: HelpCircle, label: 'Help', action: () => { setShowHelpSupport(true); setShowMenu(false) } },
          ].map((item, i) => (
            <button key={i} onClick={item.action} data-testid={`menu-${item.label.toLowerCase()}`}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${menuItem}`}>
              <item.icon size={18} className="flex-shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Log Out — fixed under sidebar nav (not in bottom nav bar) */}
        <div className={`flex-shrink-0 p-3 border-t ${menuBorder}`}>
          <button
            onClick={() => { logout(); navigate('/driver/auth') }}
            data-testid="logout-btn"
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium ${isLight ? 'text-red-600 hover:bg-red-50' : 'text-red-400 hover:bg-red-500/10'}`}
          >
            <LogOut size={18} /> Log Out
          </button>
        </div>
      </div>
    </div>
  )

  // Get home location
  const getHomeLocation = () => locations.find(l => l.category === 'home')
  const getWorkLocation = () => locations.find(l => l.category === 'work')
  const getFavoriteLocations = () => locations.filter(l => !['home', 'work'].includes(l.category))

  // Memoized route polyline for map overlay. Use selected route from availableRoutes when in preview/nav.
  const routePolylineForMap = useMemo(() => {
    if (!navigationData?.origin || !navigationData?.destination) return undefined
    const poly = (showRoutePreview || isNavigating) && availableRoutes.length > 0
      ? availableRoutes[selectedRouteIndex]?.polyline
      : navigationData.polyline
    if (poly && poly.length >= 2) return poly
    return undefined
  }, [navigationData?.origin, navigationData?.destination, navigationData?.polyline, showRoutePreview, isNavigating, availableRoutes, selectedRouteIndex])

  const distanceToRouteMeters = useMemo(() => {
    if (!routePolylineForMap?.length || routePolylineForMap.length < 2) return Infinity
    const pos = vehicle?.coordinate ?? userLocation
    if (!pos) return Infinity
    const latScale = 111320
    const lngScale = 111320 * Math.cos((pos.lat * Math.PI) / 180)
    const px = pos.lng * lngScale
    const py = pos.lat * latScale
    let best = Number.POSITIVE_INFINITY
    for (let i = 0; i < routePolylineForMap.length - 1; i++) {
      const a = routePolylineForMap[i]
      const b = routePolylineForMap[i + 1]
      const ax = a.lng * lngScale
      const ay = a.lat * latScale
      const bx = b.lng * lngScale
      const by = b.lat * latScale
      const abx = bx - ax
      const aby = by - ay
      const ab2 = abx * abx + aby * aby
      const t = ab2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / ab2)) : 0
      const qx = ax + abx * t
      const qy = ay + aby * t
      const d = Math.hypot(px - qx, py - qy)
      if (d < best) best = d
    }
    return best
  }, [routePolylineForMap, vehicle?.coordinate, userLocation])

  useEffect(() => {
    if (!isNavigating || !navigationData?.destination || !routePolylineForMap?.length) {
      offRouteSinceRef.current = null
      rerouteInFlightRef.current = false
      return
    }
    const vehicleSpeedMpsNow =
      typeof vehicle?.velocity === 'number' && Number.isFinite(vehicle.velocity) ? Math.max(0, vehicle.velocity) : 0
    const speedNow = vehicleSpeedMpsNow > 0 ? vehicleSpeedMpsNow : Math.max(0, currentSpeed * 0.44704)
    const offRouteThresholdMeters = speedNow > 13 ? 85 : speedNow > 7 ? 70 : 58
    const offRoute = Number.isFinite(distanceToRouteMeters) && distanceToRouteMeters > offRouteThresholdMeters
    if (!offRoute || speedNow < 1) {
      offRouteSinceRef.current = null
      return
    }
    const now = Date.now()
    if (offRouteSinceRef.current == null) {
      offRouteSinceRef.current = now
      return
    }
    const rerouteDebounceMs = speedNow > 10 ? 1800 : 2200
    if (now - offRouteSinceRef.current < rerouteDebounceMs) return
    if (rerouteInFlightRef.current) return
    const rerouteCooldownMs = speedNow > 10 ? 7000 : 9000
    if (now - lastRerouteAtRef.current < rerouteCooldownMs) return
    const run = async () => {
      rerouteInFlightRef.current = true
      lastRerouteAtRef.current = Date.now()
      try {
        toast('Rerouting...', { icon: '🧭' })
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          try {
            window.speechSynthesis.cancel()
            const u = new SpeechSynthesisUtterance('Rerouting.')
            u.rate = 1.03
            window.speechSynthesis.speak(u)
          } catch { /* ignore */ }
        }
        const dest = navigationData.destination
        const reroutePromise = dest ? fetchDirectionsRef.current?.(dest) : undefined
        if (reroutePromise) {
          await Promise.race([
            reroutePromise,
            new Promise<void>((resolve) => setTimeout(resolve, 8000)),
          ])
        }
      } finally {
        rerouteInFlightRef.current = false
        offRouteSinceRef.current = null
      }
    }
    void run()
  }, [distanceToRouteMeters, isNavigating, navigationData?.destination, routePolylineForMap?.length, vehicle?.velocity, currentSpeed])

  const snaproadScore = useMemo(() => {
    const safety = Math.min(300, (Number((userData as any).avg_safety_score) || 0) * 3)
    const streak = Math.min(200, (Number((userData as any).current_streak) || 0) * 5)
    const miles = Math.min(200, (Number((userData as any).total_miles) || 0) * 0.1)
    const gems = Math.min(200, (Number((userData as any).total_gems_earned) || 0) * 0.02)
    const reports = Math.min(100, (Number((userData as any).hazards_reported) || 0) * 5)
    return Math.round(safety + streak + miles + gems + reports)
  }, [userData])

  // Real-world OSM signals are fetched independently and shown even when not navigating.

  // Upcoming incident alerts (Waze-style): one clean card, no toast spam.
  const announcedReportsRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (!isNavigating || !userLocation || !roadReports?.length) return

    roadReports.forEach((report) => {
      const key = `${report.id}-${report.type}`
      if (announcedReportsRef.current.has(key)) return

      // Distance from user to report (miles)
      const R = 6371000
      const dLat = ((report.lat - userLocation.lat) * Math.PI) / 180
      const dLon = ((report.lng - userLocation.lng) * Math.PI) / 180
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((userLocation.lat * Math.PI) / 180) *
          Math.cos((report.lat * Math.PI) / 180) *
          Math.sin(dLon / 2) ** 2
      const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      const distMiles = dist / 1609.344

      // Only alert if within 1 mile (ignore very near duplicates)
      if (distMiles > 0.05 && distMiles <= 1.0) {
        announcedReportsRef.current.add(key)

        setActiveIncidentAlert({
          id: report.id,
          type: report.type,
          title: report.title || report.type,
          distance: distMiles,
          lat: report.lat,
          lng: report.lng,
        })

        setTimeout(() => {
          setActiveIncidentAlert((prev) => (prev?.id === report.id ? null : prev))
        }, 8000)
      }
    })
  }, [userLocation?.lat, userLocation?.lng, roadReports, isNavigating])

  // OSM map features (signals/stops + sidewalks): fetch on viewport change + route bounds while navigating
  const osmFetchTimerRef = useRef<number | null>(null)
  const lastOsmKeyRef = useRef<string>('')
  useEffect(() => {
    if (!mapReadyForLayers || !mapInstanceRef.current) return
    const map = mapInstanceRef.current

    const r3 = (n: number) => Math.round(n * 1000) / 1000
    const bboxToString = (b: LngLatBounds) => {
      const sw = b.getSouthWest()
      const ne = b.getNorthEast()
      return `${r3(sw.lng)},${r3(sw.lat)},${r3(ne.lng)},${r3(ne.lat)}`
    }

    const expandBbox = (minLng: number, minLat: number, maxLng: number, maxLat: number, padDeg: number) => {
      return `${r3(minLng - padDeg)},${r3(minLat - padDeg)},${r3(maxLng + padDeg)},${r3(maxLat + padDeg)}`
    }

    const fetchOnce = async (bboxStr: string, zoom: number) => {
      const res = await api.get<{ success?: boolean; limited?: boolean; reason?: string; signals?: unknown; sidewalksGeojson?: unknown; buildings?: unknown }>(
        `/api/osm/features?bbox=${encodeURIComponent(bboxStr)}&zoom=${encodeURIComponent(String(zoom))}&include=signals,stops,sidewalks,buildings`
      )
      const data = (res as unknown as { data?: any }).data ?? (res as any)
      const payload = (data?.data ?? data) as any
      const limited = Boolean(payload?.limited)
      const reason = typeof payload?.reason === 'string' ? payload.reason : undefined
      const signals = Array.isArray(payload?.signals) ? payload.signals : []
      const sidewalksGeojson = payload?.sidewalksGeojson
      const buildings = Array.isArray(payload?.buildings) ? payload.buildings : []
      return { limited, reason, signals, sidewalksGeojson, buildings }
    }

    let osmRetryDelayMs = 2500
    const scheduleFetch = () => {
      const z = map.getZoom()
      const viewport = map.getBounds()
      if (!viewport) return
      const viewportBbox = bboxToString(viewport)

      let routeBbox: string | null = null
      if (isNavigating && routePolylineForMap?.length) {
        let minLat = Infinity, minLng = Infinity, maxLat = -Infinity, maxLng = -Infinity
        for (const p of routePolylineForMap) {
          minLat = Math.min(minLat, p.lat)
          minLng = Math.min(minLng, p.lng)
          maxLat = Math.max(maxLat, p.lat)
          maxLng = Math.max(maxLng, p.lng)
        }
        if (Number.isFinite(minLat) && Number.isFinite(minLng) && Number.isFinite(maxLat) && Number.isFinite(maxLng)) {
          routeBbox = expandBbox(minLng, minLat, maxLng, maxLat, 0.003)
        }
      }

      const key = JSON.stringify({ viewportBbox, routeBbox, z: Math.round(z * 10) / 10 })
      if (key === lastOsmKeyRef.current) return
      lastOsmKeyRef.current = key

      if (osmFetchTimerRef.current) window.clearTimeout(osmFetchTimerRef.current)
      osmFetchTimerRef.current = window.setTimeout(async () => {
        try {
          const zoom = map.getZoom()
          const [a, b] = await Promise.all([
            fetchOnce(viewportBbox, zoom),
            routeBbox && routeBbox !== viewportBbox ? fetchOnce(routeBbox, zoom) : Promise.resolve(null),
          ])
          let mergedSignals = a.signals as Array<{ id: string; type: string; lat: number; lng: number }>
          const sidewalks = a.sidewalksGeojson as GeoJSON.FeatureCollection<GeoJSON.LineString> | undefined
          let mergedBuildings = a.buildings as Array<{ id: string; lat: number; lng: number; area_m2: number }>
          const limitedViewport = a.limited
          const limitedRoute = Boolean(b?.limited)

          if (b) {
            const moreSignals = b.signals as Array<{ id: string; type: string; lat: number; lng: number }>
            const moreBuildings = b.buildings as Array<{ id: string; lat: number; lng: number; area_m2: number }>
            const byId = new globalThis.Map<string, { id: string; type: string; lat: number; lng: number }>()
            for (const s of mergedSignals) if (s?.id) byId.set(s.id, s)
            for (const s of moreSignals) if (s?.id && !byId.has(s.id)) byId.set(s.id, s)
            mergedSignals = Array.from(byId.values())
            const buildingsById = new globalThis.Map<string, { id: string; lat: number; lng: number; area_m2: number }>()
            for (const bld of mergedBuildings) if (bld?.id) buildingsById.set(bld.id, bld)
            for (const bld of moreBuildings) if (bld?.id && !buildingsById.has(bld.id)) buildingsById.set(bld.id, bld)
            mergedBuildings = Array.from(buildingsById.values())
          }

          // Avoid flicker: if the backend refuses a huge bbox (limited) and returns empty, keep the last stable set.
          const limitedAll = limitedViewport || limitedRoute
          const nextSignals = Array.isArray(mergedSignals) ? mergedSignals : []
          const nextBuildings = Array.isArray(mergedBuildings) ? mergedBuildings : []
          if (!(limitedAll && nextSignals.length === 0)) setOsmSignals(nextSignals)
          if (!(limitedAll && nextBuildings.length === 0)) setOsmBuildings(nextBuildings)

          if (sidewalks && sidewalks.type === 'FeatureCollection') {
            setOsmSidewalksGeojson(sidewalks as GeoJSON.FeatureCollection<GeoJSON.LineString>)
          } else {
            if (!limitedViewport) setOsmSidewalksGeojson({ type: 'FeatureCollection', features: [] })
          }

          const reason = a.reason ?? (b as any)?.reason
          if (reason === 'rate_limited' || reason === 'overpass_error') {
            const retryHint = (a as any).retry_after_seconds ?? (b as any)?.retry_after_seconds
            osmRetryDelayMs = Math.min((retryHint ?? 30) * 1000, 60_000)
            lastOsmKeyRef.current = ''
          } else {
            osmRetryDelayMs = 2500
          }
        } catch {
          osmRetryDelayMs = Math.min(osmRetryDelayMs * 2, 30_000)
          lastOsmKeyRef.current = ''
        }
      }, osmRetryDelayMs)
    }

    scheduleFetch()
    map.on('moveend', scheduleFetch)
    map.on('zoomend', scheduleFetch)
    return () => {
      try { map.off('moveend', scheduleFetch) } catch { /* ignore */ }
      try { map.off('zoomend', scheduleFetch) } catch { /* ignore */ }
      if (osmFetchTimerRef.current) window.clearTimeout(osmFetchTimerRef.current)
    }
  }, [mapReadyForLayers, isNavigating, routePolylineForMap])
  useEffect(() => {
    if (!isNavigating) {
      announcedReportsRef.current.clear()
      setActiveIncidentAlert(null)
    }
  }, [isNavigating])

  // Sync route state for map; clear when no navigation. Do not set straight-line fallback.
  useEffect(() => {
    if (!navigationData?.origin || !navigationData?.destination) {
      setRoutePolyline(null)
      return
    }
    setRoutePolyline(navigationData.polyline && navigationData.polyline.length >= 2 ? navigationData.polyline : null)
    return () => setRoutePolyline(null)
  }, [navigationData?.origin, navigationData?.destination, navigationData?.polyline, setRoutePolyline])

  // Content insets when turn-by-turn is active so the route stays visible below/above panels
  const mapContentInsets = useMemo(() => {
    if (isNavigating) return { top: 120, bottom: 88, left: 0, right: 0 }
    return { top: 180, bottom: 70, left: 0, right: 0 }
  }, [isNavigating])

  // Effective map center/zoom/bearing during navigation.
  // Prefer GPS heading while moving; fall back to fresh compass heading at low speed/stationary.
  const navCenter = vehicle?.coordinate ?? userLocation
  const navZoom = navFollowZoom
  const vehicleHeading = typeof vehicle?.heading === 'number' && Number.isFinite(vehicle.heading) ? vehicle.heading : null
  const vehicleSpeedMps = typeof vehicle?.velocity === 'number' && Number.isFinite(vehicle.velocity) ? Math.max(0, vehicle.velocity) : 0
  const gpsHeadingReliable = vehicleHeading != null && vehicleSpeedMps > 1
  const compassHeading = typeof compassHeadingRef.current === 'number' && Number.isFinite(compassHeadingRef.current)
    ? compassHeadingRef.current
    : null
  const compassFresh = compassHeading != null && (Date.now() - lastCompassCommitMsRef.current) < 1500
  const resolvedNavHeading = gpsHeadingReliable
    ? vehicleHeading
    : (compassFresh ? compassHeading : (vehicleHeading ?? carHeading ?? 0))
  const navBearing = resolvedNavHeading ?? 0
  const liveSpeedMps = vehicleSpeedMps > 0 ? vehicleSpeedMps : Math.max(0, currentSpeed * 0.44704)
  const isMoving = liveSpeedMps > 1

  useEffect(() => {
    if (!isNavigating) {
      setNavCameraMode('following')
      setNavFollowZoom(17)
    }
  }, [isNavigating])

  useEffect(() => {
    const onFamilyOpenMap = () => setActiveTab('map')
    window.addEventListener('snaproad:open-map-from-family', onFamilyOpenMap as EventListener)
    return () => window.removeEventListener('snaproad:open-map-from-family', onFamilyOpenMap as EventListener)
  }, [])

  useEffect(() => {
    cameraLockedRef.current = navCameraMode === 'following'
  }, [navCameraMode])

  useEffect(() => {
    let cancelled = false
    let familyAuthBlocked = false
    const loadFamilyGeo = async () => {
      try {
        if (familyAuthBlocked) return
        if (!hasFamilyAccess) {
          if (!cancelled) setFamilyGeoContext({ groupId: '', places: [] })
          familyAuthBlocked = true
          return
        }
        // Family endpoints require auth; skip polling when no token to avoid 401 spam.
        if (!api.getToken()) {
          if (!cancelled) setFamilyGeoContext({ groupId: '', places: [] })
          familyAuthBlocked = true
          return
        }
        const res = await api.get<{ group_id?: string }>('/api/family/members')
        if (!res.success || !res.data) {
          if (!cancelled) setFamilyGeoContext({ groupId: '', places: [] })
          familyAuthBlocked = true
          return
        }
        const raw = res.data as unknown
        const gid =
          raw && typeof raw === 'object' && 'group_id' in (raw as Record<string, unknown>)
            ? (raw as { group_id?: string }).group_id
            : undefined
        if (!gid || cancelled) return
        const placesRes = await api.get<{ places?: Array<{ id?: string; name: string; lat: number; lng: number; radius_meters?: number }> }>(`/api/family/group/${gid}/places`)
        if (cancelled) return
        const placesRaw = placesRes.data as unknown
        const places =
          placesRaw && typeof placesRaw === 'object' && 'places' in (placesRaw as Record<string, unknown>)
            ? (placesRaw as { places?: Array<{ id?: string; name: string; lat: number; lng: number; radius_meters?: number }> }).places ?? []
            : []
        setFamilyGeoContext({ groupId: String(gid), places: places.filter(Boolean) })
      } catch {
        if (!cancelled) setFamilyGeoContext({ groupId: '', places: [] })
      }
    }
    void loadFamilyGeo()
    const id = window.setInterval(loadFamilyGeo, 120000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [hasFamilyAccess])

  useEffect(() => {
    if (!familyGeoContext.groupId || !familyGeoContext.places.length) return
    const current = vehicle?.coordinate ?? userLocation
    if (!current) return
    const metersBetween = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
      const R = 6371000
      const dLat = ((b.lat - a.lat) * Math.PI) / 180
      const dLng = ((b.lng - a.lng) * Math.PI) / 180
      const la = (a.lat * Math.PI) / 180
      const lb = (b.lat * Math.PI) / 180
      const x = Math.sin(dLat / 2) ** 2 + Math.cos(la) * Math.cos(lb) * Math.sin(dLng / 2) ** 2
      return 2 * R * Math.asin(Math.sqrt(x))
    }
    for (const p of familyGeoContext.places) {
      if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue
      const key = p.id ?? p.name
      const inside = metersBetween(current, { lat: p.lat, lng: p.lng }) <= (p.radius_meters ?? 200)
      const prev = familyPlaceInsideRef.current[key]
      if (prev === undefined) {
        familyPlaceInsideRef.current[key] = inside
        continue
      }
      if (inside === prev) continue
      familyPlaceInsideRef.current[key] = inside
      void api.post('/api/family/event', {
        group_id: familyGeoContext.groupId,
        type: inside ? 'arrival' : 'departure',
        place_id: p.id,
        place_name: p.name,
        message: `${inside ? 'Arrived at' : 'Left'} ${p.name}`,
      })
    }
  }, [familyGeoContext, vehicle?.coordinate, userLocation])

  // Navigation UI — directional turn arrow SVG by maneuver
  const getTurnArrow = (instruction: string = '') => {
    const i = instruction.toLowerCase()
    if (i.includes('turn right')) {
      return (
        <svg width={28} height={28} viewBox="0 0 28 28" fill="none">
          <path d="M8 20 L8 10 Q8 6 12 6 L20 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M16 2 L20 6 L16 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      )
    }
    if (i.includes('turn left')) {
      return (
        <svg width={28} height={28} viewBox="0 0 28 28" fill="none">
          <path d="M20 20 L20 10 Q20 6 16 6 L8 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 2 L8 6 L12 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      )
    }
    if (i.includes('slight right') || i.includes('keep right')) {
      return (
        <svg width={28} height={28} viewBox="0 0 28 28" fill="none">
          <path d="M10 22 L10 14 Q10 8 16 6 L20 5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M16 2 L20 5 L17 9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      )
    }
    if (i.includes('slight left') || i.includes('keep left')) {
      return (
        <svg width={28} height={28} viewBox="0 0 28 28" fill="none">
          <path d="M18 22 L18 14 Q18 8 12 6 L8 5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 2 L8 5 L11 9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      )
    }
    if (i.includes('u-turn') || i.includes('uturn')) {
      return (
        <svg width={28} height={28} viewBox="0 0 28 28" fill="none">
          <path d="M8 22 L8 12 Q8 4 14 4 Q20 4 20 10 L20 16" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M16 20 L20 16 L24 20" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      )
    }
    if (i.includes('merge') || i.includes('ramp') || i.includes('exit')) {
      return (
        <svg width={28} height={28} viewBox="0 0 28 28" fill="none">
          <path d="M14 22 L14 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M8 14 L14 8 L20 14" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M20 8 Q24 8 24 14 L24 22" stroke="white" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 2" opacity="0.6" />
        </svg>
      )
    }
    if (i.includes('arrive') || i.includes('destination') || i.includes('your destination')) {
      return (
        <svg width={28} height={28} viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="12" r="5" stroke="white" strokeWidth="2.5" fill="none" />
          <path d="M14 17 L14 24" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="14" cy="12" r="2" fill="white" />
        </svg>
      )
    }
    return (
      <svg width={28} height={28} viewBox="0 0 28 28" fill="none">
        <path d="M14 22 L14 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M8 12 L14 6 L20 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    )
  }
  const formatDistance = (miles: number) => {
    if (miles < 0.01) return `${Math.round(miles * 5280)} ft`
    return `${miles.toFixed(1)} mi`
  }
  const formatDuration = (minutes: number): string => {
    if (!minutes || minutes <= 0 || !Number.isFinite(minutes)) return '--'
    const mins = Math.round(minutes)
    const hrs = Math.floor(mins / 60)
    const m = mins % 60
    if (hrs === 0) return `${m} min`
    if (m === 0) return `${hrs}h`
    return `${hrs}h ${m}m`
  }
  const metersToFeetInches = (meters: number) => {
    const totalInches = meters * 39.3701
    const feet = Math.floor(totalInches / 12)
    const inches = Math.round(totalInches - feet * 12)
    return `${feet}'${inches}"`
  }
  const vehicleHeightMeters = Number((userData as { vehicle_height_meters?: number | null }).vehicle_height_meters)
  const hasVehicleHeight = Number.isFinite(vehicleHeightMeters) && vehicleHeightMeters > 0
  const vehicleHeightDisplay = hasVehicleHeight ? `${vehicleHeightMeters.toFixed(1)}m / ${metersToFeetInches(vehicleHeightMeters)}` : ''
  const hasMaxHeightNotification = Boolean(
    (navigationData as { notifications?: Array<{ type?: string; message?: string; code?: string }> } | null)?.notifications?.some(
      (n) => String(n?.type ?? '').toLowerCase() === 'max_height'
    )
  )
  const saveVehicleHeight = async () => {
    const nextMeters = (() => {
      if (!isTallVehicle) return null
      if (vehicleHeightPreset !== 'custom') return Number(vehicleHeightPreset)
      const parsed = Number(vehicleHeightCustom)
      return Number.isFinite(parsed) ? parsed : null
    })()
    if (nextMeters != null && (nextMeters < 0 || nextMeters > 5.0)) {
      toast.error('Vehicle height must be between 0 and 5.0 meters')
      return
    }
    setIsSavingVehicleHeight(true)
    try {
      const payload = {
        vehicle_height_meters: nextMeters,
      }
      const res = await api.put('/api/user/profile', payload)
      if (!res.success) {
        toast.error((res.data as { message?: string } | undefined)?.message ?? 'Could not save vehicle height')
        return
      }
      setUserData((prev) => ({ ...prev, vehicle_height_meters: payload.vehicle_height_meters }))
      toast.success('Vehicle height saved — routes will avoid low clearances')
    } catch {
      toast.error('Could not save vehicle height')
    } finally {
      setIsSavingVehicleHeight(false)
    }
  }
  const nearbyNavOffers = useMemo(() => {
    if (!isNavigating || !offers.length) return []
    return offers.filter((offer) => {
      const lat = Number(offer.lat ?? offer.latitude)
      const lng = Number(offer.lng ?? offer.longitude)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
      const R = 3959
      const dLat = (lat - userLocation.lat) * Math.PI / 180
      const dLng = (lng - userLocation.lng) * Math.PI / 180
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(userLocation.lat * Math.PI / 180) *
        Math.cos(lat * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2
      const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      return dist <= 1.0
    }).slice(0, 2)
  }, [offers, userLocation.lat, userLocation.lng, isNavigating])
  const arrivalTime = useMemo(() => {
    // Keep all "Arrive" displays consistent:
    // - During route preview: use the currently selected route option (best route/eco)
    // - During navigation: prefer live ETA, otherwise fall back to navigationData.duration
    const previewSeconds =
      showRoutePreview && availableRoutes[selectedRouteIndex]?.duration != null
        ? Number(availableRoutes[selectedRouteIndex]!.duration)
        : null

    const fallbackSeconds =
      navigationData?.duration && typeof (navigationData.duration as { seconds?: number }).seconds === 'number'
        ? Number((navigationData.duration as { seconds: number }).seconds)
        : null

    const mins =
      typeof liveEta?.etaMinutes === 'number'
        ? Math.round(liveEta.etaMinutes)
        : previewSeconds != null
          ? Math.round(previewSeconds / 60)
          : fallbackSeconds != null
            ? Math.round(fallbackSeconds / 60)
            : null

    if (mins == null || !Number.isFinite(mins)) return '--'
    const arrival = new Date(Date.now() + mins * 60 * 1000)
    return arrival.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }, [
    liveEta?.etaMinutes,
    navigationData?.duration,
    showRoutePreview,
    availableRoutes,
    selectedRouteIndex,
  ])
  const distanceToNextStep = useMemo(() => {
    const d = liveEta?.distanceMiles
    if (typeof d === 'number') return d
    const v = vehicle?.coordinate ?? userLocation
    const dest = navigationData?.destination
    if (!dest) return 0
    const R = 3958.8
    const dLat = (dest.lat - v.lat) * Math.PI / 180
    const dLon = (dest.lng - v.lng) * Math.PI / 180
    const a = Math.sin(dLat/2)**2 + Math.cos(v.lat*Math.PI/180)*Math.cos(dest.lat*Math.PI/180)*Math.sin(dLon/2)**2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  }, [liveEta?.distanceMiles, vehicle?.coordinate, userLocation, navigationData?.destination])

  // Fraction through current step (0–1) for progress bar, from traveled distance
  // Keep distanceToNextStepRef in sync for camera and lane guide
  const distanceToNextStepMeters = distanceToNextStep * 1609.34
  distanceToNextStepRef.current = distanceToNextStepMeters

  // NavigationCamera (Google Maps) removed for Mapbox; MapboxMapSnapRoad follows center/bearing via props.



  // Clean Map Tab - theme from Settings > Appearance (isLight)
  const mapContainerBg = isLight ? 'bg-slate-200' : 'bg-slate-800'
  const memoizedFriendLocations = useMemo(
    () => friendLocations,
    [friendLocations.map((f) => `${f.id}:${Math.round(f.lat * 1000)}:${Math.round(f.lng * 1000)}:${f.sosActive ? 1 : 0}`).join('|')]
  )
  const memoizedOffers = useMemo(
    () => offers,
    [offers.map((o) => String(o.id)).join(',')]
  )
  const memoizedPhotoReports = useMemo(
    () => photoReports.map((r) => ({
      id: r.id,
      lat: r.lat,
      lng: r.lng,
      category: r.category || r.ai_category || 'hazard',
      photo_url: r.photo_url,
      upvotes: r.upvotes ?? 0,
    })),
    [photoReports.map((r) => String(r.id)).join(',')]
  )
  
  const handlePhotoReportTap = useCallback((id: string) => {
    const report = photoReports.find((r) => r.id === id)
    if (report && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo({ center: [report.lng, report.lat], zoom: 16 })
    }
  }, [photoReports])
  const handleMapMoved = useCallback((lat: number, lng: number) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
    setUserLocation({ lat, lng })
  }, [])
  const renderMap = () => (
    <div id="map-container" className={`flex-1 min-h-0 min-h-[50vh] relative overflow-hidden ${mapContainerBg}`}
      onMouseMove={draggingWidget ? handleWidgetDrag : undefined}
      onMouseUp={handleWidgetDragEnd}
      onTouchMove={draggingWidget ? handleWidgetDrag : undefined}
      onTouchEnd={handleWidgetDragEnd}>
      
      {/* Compass permission banner (iOS 13+): tap to enable heading beam */}
      {useMap && needsCompassPermission && !isNavigating && (
        <div
          role="button"
          tabIndex={0}
          onClick={async () => {
            try {
              const deniedThisSession = (() => {
                try { return sessionStorage.getItem('sr_compass_permission_denied') === '1' } catch { return false }
              })()
              if (deniedThisSession) return
              const reqPerm = (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission
              if (typeof reqPerm !== 'function') return
              const perm = await reqPerm.call(DeviceOrientationEvent)
              // #region agent log
              void 0// #endregion
              if (perm === 'granted') {
                try { sessionStorage.setItem('sr_compass_permission_denied', '0') } catch {}
                setNeedsCompassPermission(false)
              } else {
                try { sessionStorage.setItem('sr_compass_permission_denied', '1') } catch {}
                setNeedsCompassPermission(false)
              }
            } catch {
              try { sessionStorage.setItem('sr_compass_permission_denied', '1') } catch {}
              setNeedsCompassPermission(false)
            }
          }}
          onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLDivElement).click()}
          style={{
            position: 'fixed',
            top: 'calc(env(safe-area-inset-top, 44px) + 160px)',
            left: 16,
            right: 16,
            zIndex: 40,
            background: '#007AFF',
            borderRadius: 14,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0,122,255,0.3)',
          }}
        >
          <span style={{ fontSize: 20 }}>🧭</span>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>
              Enable Compass Heading
            </div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>
              Tap to show direction beam like Apple Maps
            </div>
          </div>
        </div>
      )}

      {/* Route notifications panel: reminders, leave-by, faster route */}
      {useMap && !isNavigating && routeNotifications.length > 0 && (
        <div className="absolute top-4 left-4 right-4 z-[40] space-y-2" style={{ top: 'calc(env(safe-area-inset-top, 44px) + 8px)' }}>
          {routeNotifications
            .filter((n) => !dismissedRouteNotifIds.has(n.id) && n.delivery !== 'in_app_only')
            .slice(0, 3)
            .map((n) => (
            <div key={n.id} className="bg-white/95 dark:bg-slate-800/95 backdrop-blur rounded-xl p-3 shadow-lg border border-slate-200/50 flex items-start justify-between gap-2">
              <p className="text-sm text-slate-800 dark:text-slate-200 flex-1">{n.message}</p>
              <div className="flex items-center gap-1 shrink-0">
                {(n.type === 'route_reminder' || n.type === 'leave_early') && n.destination && (
                  <button onClick={() => { handleStartNavigation(n.destination); setDismissedRouteNotifIds((s) => new Set([...s, n.id])) }} className="px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded-lg">
                    Start
                  </button>
                )}
                {n.type === 'faster_route' && n.route_id && (
                  <button onClick={() => { handleStartNavigation(n.destination ?? ''); setDismissedRouteNotifIds((s) => new Set([...s, n.id])) }} className="px-2 py-1 bg-emerald-500 text-white text-xs font-medium rounded-lg">
                    View
                  </button>
                )}
                <button onClick={() => setDismissedRouteNotifIds((s) => new Set([...s, n.id]))} className="p-1 text-slate-400 hover:text-slate-600" aria-label="Dismiss"> <X size={14} /> </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Leave-early bar: show when user tapped "Leave early" on a route */}
      {leaveEarlyForRoute && !isNavigating && (
        <div className="absolute left-4 right-4 z-[40] bg-blue-600 text-white rounded-xl p-4 shadow-lg flex items-center justify-between gap-3" style={{ top: 'calc(env(safe-area-inset-top, 44px) + 8px)' }}>
          <div>
            <p className="font-semibold">Leave by {leaveEarlyForRoute.leaveBy}</p>
            <p className="text-sm opacity-90">Arrive in ~{formatDuration(leaveEarlyForRoute.etaMinutes)} — {leaveEarlyForRoute.destination}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { handleStartNavigation(leaveEarlyForRoute!.destination); setLeaveEarlyForRoute(null) }} className="px-4 py-2 bg-white text-blue-600 font-medium rounded-lg text-sm">
              Start
            </button>
            <button onClick={() => setLeaveEarlyForRoute(null)} className="p-2 rounded-lg hover:bg-white/20" aria-label="Cancel"> <X size={18} /> </button>
          </div>
        </div>
      )}

      {hasMaxHeightNotification && (showRoutePreview || isNavigating) && (
        <div
          className="absolute left-4 right-4 z-[39] rounded-xl px-4 py-2.5 shadow-lg flex items-center gap-2 text-sm"
          style={{
            top: 'calc(env(safe-area-inset-top, 44px) + 8px)',
            background: 'rgba(180, 83, 9, 0.95)',
            color: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <span>⚠</span>
          <span>Low clearance ahead — route may include restricted roads</span>
        </div>
      )}

      {/* Congestion / wait-time banner when route is active and traffic layer on */}
      {(showRoutePreview || isNavigating) && showTrafficLayer && navigationData?.destination && (
        <div
          className="absolute left-4 right-4 z-[38] rounded-xl px-4 py-2.5 shadow-lg flex items-center gap-2 text-sm"
          style={{
            top: leaveEarlyForRoute && !isNavigating
              ? 'calc(env(safe-area-inset-top, 44px) + 90px)'
              : 'calc(env(safe-area-inset-top, 44px) + 8px)',
            background: 'rgba(30, 58, 138, 0.92)',
            color: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <span className="opacity-90">⏱</span>
          <span>This area may have wait times — drive safely.</span>
        </div>
      )}

      {/* Map: Mapbox (when ready) or loading/error state */}
      {useMap && (
        <>
        <MapboxMapSnapRoad
          center={isNavigating ? navCenter : (camera?.center ?? vehicle?.coordinate ?? userLocation)}
          zoom={isNavigating ? navZoom : (camera?.zoom ?? 15)}
          bearing={isNavigating ? navBearing : 0}
          userLocation={vehicle?.coordinate ?? userLocation}
          vehicleHeading={resolvedNavHeading ?? carHeading ?? 0}
          isMoving={isMoving}
          speedMps={liveSpeedMps}
          cameraLockedRef={cameraLockedRef}
          navFollowEnabled={isNavigating && navCameraMode === 'following'}
          navFollowZoom={navFollowZoom}
          onNavCameraUnlock={() => setNavCameraMode('free')}
          routePolyline={routePolylineForMap}
          fitToRoutePolyline={showRoutePreview && routePolylineForMap?.length ? routePolylineForMap : null}
          tripHistoryPolylines={tripHistoryPolylines}
          destinationCoordinate={(showRoutePreview || isNavigating) && navigationData?.destination ? { lat: navigationData.destination.lat, lng: navigationData.destination.lng } : undefined}
          traveledDistanceMeters={isNavigating ? traveledDistanceMeters : undefined}
          predictedPosition={predicted ? { coordinate: predicted.coordinate, confidence: predicted.confidence } : null}
          routeGlow={experience?.routeGlow}
          mode={mode}
          drivingMode={mode}
          signals={osmSignals}
          sidewalksGeojson={osmSidewalksGeojson}
          offerBuildings={osmBuildings}
          onRecenter={() => {
            setNavCameraMode('following')
            onRecenterNavigation()
          }}
          onOrionClick={() => { if (userData.is_premium) setShowOrionVoice(true); else toast('Upgrade to Premium for Orion', { icon: '🔒' }) }}
          isLiveGps={isLive}
          onMapError={(msg) => { setMapFailed(true); reportMapError(msg) }}
          offers={memoizedOffers}
          gasStations={gasStationsOverlay}
          onOfferClick={(offer) => {
            setSelectedOfferForRedemption(offer as never)
            setShowRedemptionPopup(true)
          }}
          roadReports={roadReports}
          onReportClick={(r) => setSelectedRoadStatus({ id: String(r.id), name: r.title ?? r.type ?? 'Road report', status: r.severity === 'high' ? 'heavy' : r.severity === 'medium' ? 'moderate' : (r.type?.toLowerCase().includes('closure') || r.type?.toLowerCase().includes('closed')) ? 'closed' : 'moderate', reason: r.title, estimatedDelay: 0, startLat: r.lat, startLng: r.lng, endLat: r.lat + 0.0001, endLng: r.lng + 0.0001 })}
          onCameraClick={(cameraId) => {
            const cam = (ohgoCameras || []).find((c) => c.id === cameraId) ?? null
            setSelectedCamera(cam)
          }}
          isNavigating={isNavigating}
          navigationSteps={isNavigating && navigationData?.steps ? navigationData.steps : undefined}
          currentStepIndex={currentStepIndex}
          mapType={activeMapLayer}
          showTraffic={showTrafficLayer}
          showCameras={showCameraLayer}
          showIncidents={showIncidentsLayer}
          showConstruction={showConstructionLayer}
          showFuelPrices={showFuelPrices}
          cameraLocations={ohgoCameras?.map((c) => ({ id: c.id, lat: c.latitude, lng: c.longitude, name: c.location })) ?? []}
          constructionZones={roadReports?.filter((r) => (r.type ?? '').toLowerCase().includes('construction')).map((r) => ({ id: String(r.id), lat: r.lat, lng: r.lng, title: r.title })) ?? []}
          photoReports={memoizedPhotoReports}
          onPhotoReportTap={handlePhotoReportTap}
          friendLocations={memoizedFriendLocations}
          friendsOnRoute={friendsOnRoute}
          onFriendMarkerTap={onFriendMarkerTap}
          onMapMoved={handleMapMoved}
          droppedPin={mapDroppedPin}
          routeStartCoordinate={(showRoutePreview || isNavigating) && routePolylineForMap?.length ? (() => {
            const start = routePolylineForMap[0]
            const pos = vehicle?.coordinate ?? userLocation
            const dLat = (start.lat - pos.lat) * 111000
            const dLng = (start.lng - pos.lng) * 111000 * Math.cos((pos.lat * Math.PI) / 180)
            if (Math.hypot(dLat, dLng) < 50) return undefined
            return { lat: start.lat, lng: start.lng }
          })() : undefined}
          onOpenLayerPicker={() => setShowLayerPicker(true)}
          contentInsets={mapContentInsets}
          colorScheme={theme}
          onPlaceSelected={(p) => {
            setMapDroppedPin({ lat: p.lat, lng: p.lng, label: p.name, address: p.address })
            setSelectedPlace({ name: p.name, lat: p.lat, lng: p.lng, address: p.address, type: p.type })
          }}
          onMapClick={handleMapClick}
          onMapReady={(map, zoomToUser, actions) => {
            zoomToUserRef.current = zoomToUser
            mapActionsRef.current = actions ?? null
            if (map) {
              mapInstanceRef.current = map as MapboxMap
              setMapReadyForLayers(true)
            }
          }}
        />

        <IncidentAlert
          incident={activeIncidentAlert}
          onDismiss={() => setActiveIncidentAlert(null)}
          onThankReporter={async () => {
            if (activeIncidentAlert) {
              try { await api.post(`/api/incidents/${activeIncidentAlert.id}/upvote`) } catch { /* ignore */ }
            }
            toast.success('👍 Confirmed — thanks!')
            setActiveIncidentAlert(null)
          }}
          onNotThere={async () => {
            if (activeIncidentAlert) {
              try { await api.post(`/api/incidents/${activeIncidentAlert.id}/downvote`) } catch { /* ignore */ }
            }
            toast('Marked as not there', { icon: '👎' })
            setActiveIncidentAlert(null)
          }}
          isLight={isLight}
        />

        {isNavigating && nearbyFriendAlert && (
          <div
            onClick={() => {
              peekAtFriend(nearbyFriendAlert.friend)
              setNearbyFriendAlert(null)
            }}
            style={{
              position: 'fixed',
              top: 'calc(env(safe-area-inset-top, 44px) + 108px)',
              left: 16,
              right: 16,
              zIndex: 940,
              background: nearbyFriendAlert.friend.isFamilyMember
                ? 'rgba(255,149,0,0.92)'
                : 'rgba(0,122,255,0.92)',
              backdropFilter: 'blur(12px)',
              borderRadius: 16,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              animation: 'slideDown 0.3s ease',
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 18,
              background: 'rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 700, color: 'white', flexShrink: 0,
            }}>
              {nearbyFriendAlert.friend.name[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>
                {nearbyFriendAlert.message}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 1 }}>
                Tap to see on map
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setNearbyFriendAlert(null) }}
              style={{
                background: 'rgba(255,255,255,0.2)', border: 'none',
                borderRadius: 10, width: 28, height: 28,
                color: 'white', fontSize: 14, cursor: 'pointer', flexShrink: 0,
              }}
            >
              x
            </button>
          </div>
        )}

        {isNavigating && navCameraMode === 'free' && (
          <button
            onClick={() => {
              setNavCameraMode('following')
              returnToNavigation()
            }}
            style={{
              position: 'fixed',
              top: 'calc(env(safe-area-inset-top, 44px) + 110px)',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 950,
              padding: '10px 20px',
              background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 20,
              color: 'white',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span style={{ fontSize: 16 }}>↩</span>
            Recenter
          </button>
        )}

        {isNavigating && (
          <div
            style={{
              position: 'fixed',
              right: 12,
              top: 'calc(env(safe-area-inset-top, 44px) + 118px)',
              zIndex: 950,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <button
              onClick={() => {
                setNavFollowZoom((z) => {
                  const next = Math.min(20, Number((z + 0.5).toFixed(1)))
                  if (mapInstanceRef.current) mapInstanceRef.current.easeTo({ zoom: next, duration: 250 })
                  return next
                })
              }}
              style={{ width: 44, height: 44, borderRadius: 12, border: 'none', background: 'rgba(0,0,0,0.72)', color: 'white', fontSize: 24, cursor: 'pointer' }}
              aria-label="Zoom in navigation"
              title="Zoom in"
            >
              +
            </button>
            <button
              onClick={() => {
                setNavFollowZoom((z) => {
                  const next = Math.max(14, Number((z - 0.5).toFixed(1)))
                  if (mapInstanceRef.current) mapInstanceRef.current.easeTo({ zoom: next, duration: 250 })
                  return next
                })
              }}
              style={{ width: 44, height: 44, borderRadius: 12, border: 'none', background: 'rgba(0,0,0,0.72)', color: 'white', fontSize: 24, cursor: 'pointer' }}
              aria-label="Zoom out navigation"
              title="Zoom out"
            >
              -
            </button>
          </div>
        )}

        {isNavigating && friendLocations.filter((f) => f.isFamilyMember && f.isSharing).length > 0 && (
          <div
            style={{
              position: 'fixed',
              bottom: 'calc(env(safe-area-inset-bottom, 24px) + 80px)',
              left: 12,
              zIndex: 900,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            {friendLocations
              .filter((f) => f.isFamilyMember && f.isSharing)
              .slice(0, 3)
              .map((member) => (
                <div
                  key={member.id}
                  onClick={() => {
                    setFocusedFamilyMember(member)
                    if (isNavigating) peekAtFriend(member)
                    setFamilyPipOpen(true)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 12px 6px 6px',
                    background: member.sosActive ? 'rgba(255,59,48,0.9)' : 'rgba(255,149,0,0.9)',
                    borderRadius: 20,
                    backdropFilter: 'blur(10px)',
                    cursor: 'pointer',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
                  }}
                >
                  <div style={{ width: 28, height: 28, borderRadius: 14, background: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                    {member.name[0]}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: 'white', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}>
                      {member.sosActive ? '🚨 SOS!' : member.name.split(' ')[0]}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10, whiteSpace: 'nowrap' }}>
                      {member.isNavigating ? `→ ${member.destinationName ?? 'Driving'}` : member.sosActive ? 'Needs help!' : `${Math.round(member.speedMph ?? 0)} mph`}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}

        {isNavigating && friendLocations.filter((f) => f.isFamilyMember && f.isSharing).length > 0 && (
          <button
            onClick={() => {
              const familyMembers = friendLocations.filter((f) => f.isFamilyMember && f.isSharing)
              const allCoords = [
                [userLocation.lng, userLocation.lat],
                ...familyMembers.map((f) => [f.lng, f.lat]),
              ]
              const lngs = allCoords.map((c) => c[0])
              const lats = allCoords.map((c) => c[1])
              const bounds = new mapboxgl.LngLatBounds(
                [Math.min(...lngs) - 0.01, Math.min(...lats) - 0.01],
                [Math.max(...lngs) + 0.01, Math.max(...lats) + 0.01]
              )
              setNavCameraMode('free')
              mapInstanceRef.current?.fitBounds(bounds, { padding: 80, duration: 1200 })
              setTimeout(() => {
                returnToNavigation()
              }, 8000)
            }}
            style={{
              position: 'fixed',
              bottom: 'calc(env(safe-area-inset-bottom, 24px) + 80px)',
              right: 12,
              zIndex: 900,
              width: 44,
              height: 44,
              borderRadius: 22,
              background: 'rgba(255,149,0,0.9)',
              border: '2px solid white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              backdropFilter: 'blur(8px)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
            }}
          >
            👨‍👩‍👧‍👦
          </button>
        )}

        {familyPipOpen && focusedFamilyMember && (
          <>
            <div onClick={() => setFamilyPipOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.5)' }} />
            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1101, background: '#1C1C1E', borderRadius: '20px 20px 0 0', paddingBottom: 'env(safe-area-inset-bottom, 24px)' }}>
              <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.18)', borderRadius: 2, margin: '10px auto 0' }} />
              <div style={{ padding: '14px 20px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 24, background: focusedFamilyMember.sosActive ? '#FF3B30' : 'linear-gradient(135deg,#FF9500,#FF6B00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: 'white' }}>
                    {focusedFamilyMember.name[0]}
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'white' }}>
                      {focusedFamilyMember.name}
                      {focusedFamilyMember.sosActive && <span style={{ fontSize: 13, color: '#FF3B30', marginLeft: 8 }}>🚨 SOS Active</span>}
                    </div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                      {focusedFamilyMember.isNavigating ? `Navigating to ${focusedFamilyMember.destinationName ?? 'destination'}` : `${Math.round(focusedFamilyMember.speedMph ?? 0)} mph · Not navigating`}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => {
                      startFollowingFriend(focusedFamilyMember)
                      setFamilyPipOpen(false)
                    }}
                    style={{ flex: 1, height: 48, borderRadius: 12, background: '#FF9500', border: 'none', color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
                  >
                    Navigate to them
                  </button>
                  <button
                    onClick={() => {
                      peekAtFriend(focusedFamilyMember)
                      setFamilyPipOpen(false)
                    }}
                    style={{ flex: 1, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
                  >
                    Show on map
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Friend markers: temporarily disabled during Mapbox migration (was Google Maps Markers) */}
        {/* <FriendMarkers friends={friendLocations} map={mapInstanceRef.current} onFriendClick={(friend) => setSelectedFriend(friend)} /> */}

      {/* Right side controls - above report overlay (z-[1100]) so Orion & layer picker stay tappable */}
      {!isNavigating && activeTab === 'map' && (
        <div style={{
          position: 'fixed',
          right: 16,
          bottom: 'calc(80px + env(safe-area-inset-bottom, 20px))',
          zIndex: 1200,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          alignItems: 'center',
        }}>
          <button
            onClick={() => { if (userData.is_premium) setShowOrionVoice(true); else toast('Upgrade to Premium for Orion', { icon: '🔒' }) }}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              background: userData.is_premium ? 'linear-gradient(135deg, #7C3AED, #5B21B6)' : 'linear-gradient(135deg, #94a3b8, #64748b)',
              border: 'none',
              cursor: userData.is_premium ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: userData.is_premium ? '0 4px 16px rgba(124,58,237,0.45)' : '0 2px 8px rgba(0,0,0,0.2)',
            }}
            title={userData.is_premium ? 'Ask Orion' : 'Upgrade to Premium for Orion'}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="7" y="2" width="6" height="10" rx="3" fill="white" />
              <path d="M4 9C4 12.31 6.69 15 10 15C13.31 15 16 12.31 16 9" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="10" y1="15" x2="10" y2="18" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="7" y1="18" x2="13" y2="18" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
          <div style={{ width: 1, height: 8, background: 'transparent' }} />
          <button
            onClick={() => mapActionsRef.current?.resetHeading?.()}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'white',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
            }}
            title="Reset North"
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <polygon points="11,3 13,11 11,9.5 9,11" fill="#FF3B30" />
              <polygon points="11,19 13,11 11,12.5 9,11" fill="#8E8E93" />
              <circle cx="11" cy="11" r="1.5" fill="#1a1a1a" />
            </svg>
          </button>
          <button
            onClick={() => setShowLayerPicker(true)}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: showLayerPicker || activeMapLayer !== 'standard' ? '#007AFF' : 'white',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
            }}
            title="Map layers"
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M11 2L2 6.5L11 11L20 6.5L11 2Z" fill={activeMapLayer !== 'standard' ? 'white' : '#1a1a1a'} />
              <path d="M2 11L11 15.5L20 11" stroke={activeMapLayer !== 'standard' ? 'white' : '#1a1a1a'} strokeWidth="1.8" strokeLinecap="round" />
              <path d="M2 15L11 19.5L20 15" stroke={activeMapLayer !== 'standard' ? 'rgba(255,255,255,0.6)' : '#8E8E93'} strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
          <button
            onClick={onRecenterNavigation}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'white',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
            }}
            title="My location"
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="11" r="4" fill="#007AFF" />
              <circle cx="11" cy="11" r="7" stroke="#007AFF" strokeWidth="1.5" fill="none" />
              <line x1="11" y1="1" x2="11" y2="4" stroke="#007AFF" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="11" y1="18" x2="11" y2="21" stroke="#007AFF" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="1" y1="11" x2="4" y2="11" stroke="#007AFF" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="18" y1="11" x2="21" y2="11" stroke="#007AFF" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}

      {/* Navigation mode right controls - minimal */}
      {isNavigating && (
        <div style={{
          position: 'fixed',
          right: 16,
          bottom: 'calc(160px + env(safe-area-inset-bottom, 20px))',
          zIndex: 990,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          <button
            onClick={() => {
              setIsOverviewMode((v) => !v)
              setNavCameraMode('free')
            }}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: isOverviewMode ? '#007AFF' : 'white',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
            }}
            title="Route overview"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="2" y="2" width="16" height="16" rx="3" stroke={isOverviewMode ? 'white' : '#1a1a1a'} strokeWidth="1.8" fill="none" />
              <path d="M5 15 L5 10 Q5 7 8 7 L12 7 Q15 7 15 10 L15 15" stroke={isOverviewMode ? 'white' : '#007AFF'} strokeWidth="1.8" strokeLinecap="round" fill="none" />
              <circle cx="10" cy="6" r="2" fill={isOverviewMode ? 'white' : '#FF3B30'} />
            </svg>
          </button>
          <button
            onClick={() => {
              mapActionsRef.current?.clearUserInteracting?.()
              hasZoomedToUser.current = false
              if (zoomToUserRef.current) {
                const loc = vehicle?.coordinate ?? userLocation
                zoomToUserRef.current(loc.lat, loc.lng, true)
              }
            }}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'white',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
            }}
            title="Re-center"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="3" fill="#007AFF" />
              <circle cx="10" cy="10" r="6.5" stroke="#007AFF" strokeWidth="1.5" fill="none" />
              <line x1="10" y1="1" x2="10" y2="3.5" stroke="#007AFF" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="10" y1="16.5" x2="10" y2="19" stroke="#007AFF" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="1" y1="10" x2="3.5" y2="10" stroke="#007AFF" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="16.5" y1="10" x2="19" y2="10" stroke="#007AFF" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}
        </>
      )}
      {!useMap && (
        <div className="absolute inset-0 z-0 bg-slate-900 flex items-center justify-center">
          {mapError ? (
            <div className="text-center px-4 max-w-sm">
              <p className="text-amber-400 text-sm font-medium mb-2">Map unavailable</p>
              <p className="text-slate-400 text-xs mb-3">{mapError}</p>
              {!fallbackBannerDismissed && (
                <button onClick={() => setFallbackBannerDismissed(true)} className="text-slate-500 text-xs underline">
                  Dismiss
                </button>
              )}
            </div>
          ) : (
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-400 text-sm">Loading map…</p>
            </div>
          )}
        </div>
      )}

      {/* Place detail (in-app) when user selected a search result with place_id */}
      {selectedPlaceId && (
        <PlaceDetail
          placeId={selectedPlaceId}
          summary={{ name: selectedPlace?.name, lat: selectedPlace?.lat, lng: selectedPlace?.lng }}
          onClose={() => { setSelectedPlaceId(null); setSelectedPlace(null) }}
          onDirections={(place) => {
            if (place.lat != null && place.lng != null) {
              handleSelectDestination({ name: place.name, lat: place.lat, lng: place.lng, address: place.address })
            }
            setSelectedPlaceId(null)
            setSelectedPlace(null)
          }}
        />
      )}

      {/* Map click: show nearby place card with image and actions */}
      {nearbyLoading && (
        <div
          className="fixed left-1/2 bottom-24 z-[600] -translate-x-1/2 px-4 py-2 bg-slate-800/95 text-white text-sm rounded-xl shadow-lg flex items-center gap-2"
          style={{ bottom: 'calc(60px + env(safe-area-inset-bottom, 20px) + 8px)' }}
        >
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Loading place…
        </div>
      )}
      {/* Premium place card — single design for map-click and place selection */}
      {(() => {
        const displayPlace = selectedPlace ?? (mapClickedPlace && typeof mapClickedPlace.lat === 'number' && typeof mapClickedPlace.lng === 'number'
          ? { name: mapClickedPlace.name, lat: mapClickedPlace.lat, lng: mapClickedPlace.lng, address: mapClickedPlace.address, rating: mapClickedPlace.rating ?? undefined, types: undefined as string[] | undefined, type: undefined as string | undefined }
          : null)
        if (!displayPlace || selectedPlaceId || nearbyLoading || isNavigating || activeTab !== 'map') return null
        const clearPlace = () => { setSelectedPlace(null); setMapClickedPlace(null); setMapDroppedPin(null) }
        return (
          <div
            className="fixed bottom-0 left-0 right-0 z-[1300] animate-slide-up"
            style={{ paddingBottom: 'calc(70px + env(safe-area-inset-bottom, 20px))' }}
          >
            <div className={`mx-4 rounded-2xl overflow-hidden shadow-2xl border ${
              isLight
                ? 'bg-white/95 backdrop-blur-xl border-slate-200/50'
                : 'bg-slate-900/95 backdrop-blur-xl border-white/10'
            }`}>
              <div className="flex items-center justify-between pt-3 pb-1 px-4 gap-2">
                <div className="flex-1 min-w-0" />
                <div className={`w-10 h-1 rounded-full flex-shrink-0 ${isLight ? 'bg-slate-300' : 'bg-white/20'}`} />
                <button
                  type="button"
                  onClick={clearPlace}
                  aria-label="Close"
                  className={`flex items-center gap-1.5 rounded-full px-3 py-2 flex-shrink-0 text-sm font-medium transition-colors ${
                    isLight
                      ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  <X size={18} />
                  Close
                </button>
              </div>
              <div className="px-4 pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {displayPlace.name}
                    </h3>
                    {displayPlace.address && (
                      <p className={`text-sm mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                        {displayPlace.address}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {userLocation?.lat != null && userLocation?.lng != null && (
                        (() => {
                          const R = 3959
                          const dLat = ((displayPlace.lat - userLocation.lat) * Math.PI) / 180
                          const dLng = ((displayPlace.lng - userLocation.lng) * Math.PI) / 180
                          const a = Math.sin(dLat / 2) ** 2 + Math.cos((userLocation.lat * Math.PI) / 180) * Math.cos((displayPlace.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
                          const distMi = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
                          const distance = distMi < 0.1 ? `${(distMi * 5280).toFixed(0)} ft` : `${distMi.toFixed(1)} mi`
                          return (
                            <span className={`text-xs px-2 py-1 rounded-full ${isLight ? 'bg-blue-50 text-blue-600' : 'bg-blue-500/20 text-blue-400'}`}>
                              📍 {distance}
                            </span>
                          )
                        })()
                      )}
                      {displayPlace.rating != null && (
                        <span className={`text-xs px-2 py-1 rounded-full ${isLight ? 'bg-amber-50 text-amber-600' : 'bg-amber-500/20 text-amber-400'}`}>
                          ⭐ {displayPlace.rating}
                        </span>
                      )}
                      {(displayPlace.types?.[0] ?? (displayPlace as { type?: string }).type) && (
                        <span className={`text-xs px-2 py-1 rounded-full ${isLight ? 'bg-slate-100 text-slate-600' : 'bg-white/10 text-slate-300'}`}>
                          {displayPlace.types?.[0]?.replace(/_/g, ' ') ?? (displayPlace as { type?: string }).type}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-4 pb-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleSelectDestination({ name: displayPlace.name, lat: displayPlace.lat, lng: displayPlace.lng, address: displayPlace.address })
                    clearPlace()
                  }}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-500/25"
                >
                  <Navigation size={16} />
                  Directions
                </button>
                <button
                  type="button"
                  onClick={() => { toast.success('📌 Saved to favorites') }}
                  className={`px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-1 transition-colors ${isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                >
                  <Star size={16} />
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof navigator.share === 'function') {
                      navigator.share({ title: displayPlace.name, text: `Check out ${displayPlace.name}`, url: window.location.href }).catch(() => {})
                    } else {
                      toast.success('Link copied!')
                    }
                  }}
                  className={`px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-1 transition-colors ${isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                >
                  <Share2 size={16} />
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Driving mode selector: Calm / Adaptive / Sport — pill style with accent colors */}
      {!isNavigating && (
        <div className="absolute top-[72px] right-3 z-20 flex rounded-full overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
          {(['calm', 'adaptive', 'sport'] as const).map((m) => {
            const active = mode === m
            const config = DRIVING_MODES[m]
            return (
              <button
                key={m}
                onClick={() => {
                  setMode(m)
                  toast.success(`${config.icon} ${config.label} mode`)
                  api.post('/api/analytics/track', { event: 'mode_switch', properties: { mode: m } }).catch(() => {})
                }}
                className={`relative px-3 py-2 text-[11px] font-semibold transition-all duration-300 flex flex-col items-center gap-0.5 min-w-[64px] ${active ? 'text-white' : 'text-slate-600 hover:text-slate-800 bg-white/80 hover:bg-white/95 backdrop-blur border border-gray-200/80'}`}
                style={active ? { backgroundColor: config.accentColor } : undefined}
                title={config.description}
              >
                <span className="leading-tight">{config.label}</span>
                {active && <span className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: config.accentColor }} />}
              </button>
            )
          })}
        </div>
      )}

      {/* Speed HUD -- replaced by SpeedIndicator component in bottom-left */}

      {/* Route Preview - pre-navigation bottom sheet (Best route / Eco) */}
      {activeTab === 'map' && showRoutePreview && navigationData && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 900,
            background: 'white',
            borderRadius: '24px 24px 0 0',
            paddingBottom: 'env(safe-area-inset-bottom, 24px)',
            boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
          }}
        >
          <div style={{ width: 36, height: 4, background: '#E0E0E0', borderRadius: 2, margin: '12px auto 0' }} />
          <div style={{ padding: '14px 20px 10px', fontSize: 18, fontWeight: 700 }}>
            {navigationData.destination?.name ?? navigationData.destination?.address ?? 'Destination'}
          </div>
          <div style={{ display: 'flex', gap: 8, paddingLeft: 20, paddingRight: 20, marginBottom: 12 }}>
            {(availableRoutes.length > 0 ? availableRoutes.slice(0, 2) : []).map((route, i) => {
              const routeType = (route as { routeType?: string }).routeType
              const id = routeType === 'eco' ? 'eco' : 'best'
              const label = routeType === 'eco' ? 'Eco' : 'Best route'
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    handleRouteSelect(id, i)
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    borderRadius: 12,
                    border: 'none',
                    background: selectedRouteIndex === i ? '#007AFF' : '#f5f5f7',
                    color: selectedRouteIndex === i ? 'white' : '#333',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {label}
                  {routeType === 'eco' && <span style={{ fontSize: 10, display: 'block', opacity: 0.8 }}>saves fuel</span>}
                  {routeType !== 'eco' && <span style={{ fontSize: 10, display: 'block', opacity: 0.8 }}>live traffic aware</span>}
                </button>
              )
            })}
          </div>
          {hasVehicleHeight && (
            <div style={{ margin: '0 20px 12px', padding: '10px 12px', borderRadius: 12, background: '#f5f8ff', border: '1px solid #dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Truck size={16} color="#1d4ed8" />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1e3a8a' }}>Avoid low clearances</div>
                  <div style={{ fontSize: 11, color: '#334155' }}>({vehicleHeightDisplay})</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !avoidLowClearances
                  setAvoidLowClearances(next)
                  if (navigationData?.destination) {
                    fetchDirections({
                      name: navigationData.destination.name ?? 'Destination',
                      lat: navigationData.destination.lat,
                      lng: navigationData.destination.lng,
                    }).catch(() => {})
                  }
                }}
                style={{
                  border: 'none',
                  borderRadius: 999,
                  padding: '4px 10px',
                  background: avoidLowClearances ? '#2563eb' : '#cbd5e1',
                  color: 'white',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {avoidLowClearances ? 'ON' : 'OFF'}
              </button>
            </div>
          )}
          {availableRoutes[selectedRouteIndex] && (
            <div style={{ display: 'flex', gap: 0, paddingLeft: 20, paddingRight: 20, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#1a1a1a' }}>
                  {formatDuration(Math.round((availableRoutes[selectedRouteIndex].duration ?? 0) / 60))}
                </div>
                <div style={{ fontSize: 12, color: '#999' }}>
                  {`${((availableRoutes[selectedRouteIndex].distance ?? 0) / 1609.34).toFixed(1)} mi`} • Arrive {arrivalTime}
                </div>
              </div>
            </div>
          )}
          <div style={{ padding: '0 20px' }}>
            <button
              type="button"
              onClick={handleGoFromRoutePreview}
              style={{
                width: '100%',
                height: 52,
                background: 'linear-gradient(135deg, #007AFF, #0055CC)',
                color: 'white',
                border: 'none',
                borderRadius: 16,
                fontSize: 17,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 4px 16px rgba(0,122,255,0.35)',
              }}
            >
              ➤ Start Navigation
            </button>
          </div>
          <div style={{ position: 'absolute', top: 12, right: 20 }}>
            <button
              type="button"
              onClick={handleCancelRoutePreview}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                background: '#f5f5f7',
                border: 'none',
                fontSize: 16,
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Nearby Offers - centered pill; hidden when place card or plan selection is open */}
      {!showPlanSelection && activeTab === 'map' && !isNavigating && !showRoutePreview && !showSearch && !selectedPlace && !mapClickedPlace && (
        <div style={{
          position: 'fixed',
          bottom: 'calc(68px + env(safe-area-inset-bottom, 20px))',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'auto',
          minWidth: 200,
          maxWidth: 320,
          zIndex: 400,
        }}>

          {!showOffersPanel ? (
            <div
              onClick={() => setShowOffersPanel(true)}
              style={{
                background: 'white',
                borderRadius: 16,
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 16 }}>🎁</span>
              <span style={{
                fontSize: 14,
                fontWeight: 600,
                color: '#1a1a1a',
                flex: 1,
              }}>
                {offers?.length ?? 0} Nearby Offers
              </span>
              {offers?.length != null && offers.length > 0 && (
                <span style={{
                  background: '#007AFF',
                  color: 'white',
                  borderRadius: 10,
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                }}>
                  {offers.length}
                </span>
              )}
              <span style={{ color: '#999', fontSize: 12 }}>▲</span>
            </div>

          ) : (
            <div style={{
              background: 'white',
              borderRadius: 16,
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
              overflow: 'hidden',
            }}>

              <div
                onClick={() => setShowOffersPanel(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 16px',
                  borderBottom: '1px solid #f0f0f0',
                  cursor: 'pointer',
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <span style={{ fontSize: 15 }}>🎁</span>
                  <span style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#1a1a1a',
                  }}>
                    Nearby Offers
                  </span>
                  {offers?.length != null && offers.length > 0 && (
                    <span style={{
                      background: '#007AFF',
                      color: 'white',
                      borderRadius: 10,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 8px',
                    }}>
                      {offers.length}
                    </span>
                  )}
                </div>
                <span style={{ color: '#999', fontSize: 12 }}>▼</span>
              </div>

              {offers?.length === 0 ? (
                <div style={{
                  padding: '14px 16px',
                  textAlign: 'center',
                  color: '#999',
                  fontSize: 13,
                }}>
                  No offers in your area yet
                </div>
              ) : (
                (offers ?? []).slice(0, 2).map((offer: DriverAppOffer, i: number) => (
                  <div
                    key={offer.id ?? i}
                    onClick={() => {
                      setSelectedOfferForRedemption(offer as never)
                      setShowRedemptionPopup(true)
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 16px',
                      borderBottom: i === 0 && (offers?.length ?? 0) > 1
                        ? '1px solid #f5f5f7'
                        : 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{
                      width: 38, height: 38,
                      borderRadius: 10,
                      background: '#34C75912',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      flexShrink: 0,
                    }}>
                      🎁
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#1a1a1a',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {offer.title
                          ?? offer.discount_text
                          ?? 'Special offer'}
                      </div>
                      <div style={{
                        fontSize: 11,
                        color: '#34C759',
                        marginTop: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}>
                        <span>+{offer.gems_reward
                          ?? offer.gems
                          ?? 25} gems</span>
                        {offer.distance_km != null && (
                          <>
                            <span style={{ color: '#ddd' }}>•</span>
                            <span style={{ color: '#999' }}>
                              {offer.distance_km} km
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 11,
                      color: '#007AFF',
                      fontWeight: 600,
                      flexShrink: 0,
                    }}>
                      View →
                    </span>
                  </div>
                ))
              )}

              {(offers?.length ?? 0) > 2 && (
                <div
                  onClick={() => {
                    setActiveTab('rewards')
                    setRewardsTab('offers')
                    setShowOffersPanel(false)
                  }}
                  style={{
                    padding: '8px 16px',
                    textAlign: 'center',
                    fontSize: 12,
                    color: '#007AFF',
                    fontWeight: 600,
                    cursor: 'pointer',
                    borderTop: '1px solid #f0f0f0',
                  }}
                >
                  +{(offers?.length ?? 0) - 2} more offers →
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Navigation mode - Premium instruction card + stats bar */}
      {isNavigating && navigationData && (() => {
        const remainingDistanceMiles = liveEta?.distanceMiles
        const remainingMinutes = typeof liveEta?.etaMinutes === 'number'
          ? Math.round(liveEta.etaMinutes)
          : (navigationData?.duration && typeof (navigationData.duration as { seconds?: number }).seconds === 'number'
            ? Math.round(((navigationData.duration as { seconds: number }).seconds) / 60)
            : undefined)
        const stepDistanceMeters = navigationData.steps?.[currentStepIndex]?.distanceMeters ?? 500
        const distanceToNextStepMeters = distanceToNextStep * 1609.34
        const progressWidthPct = Math.max(2, Math.min(100, 100 - (distanceToNextStepMeters / stepDistanceMeters) * 100))
        return (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            paddingTop: 'env(safe-area-inset-top, 44px)',
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #0066FF 0%, #0044CC 100%)',
              paddingLeft: 16,
              paddingRight: 16,
              paddingTop: 12,
              paddingBottom: 14,
              boxShadow: '0 4px 24px rgba(0,102,255,0.45)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: 'rgba(255,255,255,0.18)',
                  border: '1.5px solid rgba(255,255,255,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {getTurnArrow(navigationData.steps?.[currentStepIndex]?.instruction ?? '')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 21,
                    fontWeight: 800,
                    color: 'white',
                    letterSpacing: -0.5,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    lineHeight: 1.2,
                  }}>
                    {navigationData.steps?.[currentStepIndex]?.instruction || 'Continue'}
                  </div>
                  <div style={{
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.72)',
                    marginTop: 3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {navigationData.steps?.[currentStepIndex + 1]?.instruction
                      ? `Then: ${navigationData.steps[currentStepIndex + 1].instruction}`
                      : ''}
                  </div>
                </div>
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'white', lineHeight: 1 }}>
                    {formatDistance(distanceToNextStep)}
                  </div>
                </div>
              </div>
              <div style={{
                marginTop: 10,
                height: 3,
                background: 'rgba(255,255,255,0.2)',
                borderRadius: 2,
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  background: 'white',
                  borderRadius: 2,
                  width: `${progressWidthPct}%`,
                  transition: 'width 0.5s ease',
                }} />
              </div>
            </div>
            <div style={{
              background: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingLeft: 20,
              paddingRight: 20,
              paddingTop: 8,
              paddingBottom: 8,
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            }}>
              <div>
                <div style={{ fontSize: 10, color: '#999', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>Arrive</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', marginTop: 1 }}>{arrivalTime}</div>
              </div>
              <div style={{ width: 1, height: 28, background: '#f0f0f0' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#999', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>Distance</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', marginTop: 1 }}>{remainingDistanceMiles?.toFixed(1) ?? '--'} mi</div>
              </div>
              <div style={{ width: 1, height: 28, background: '#f0f0f0' }} />
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: '#999', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>Time</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', marginTop: 1 }}>{formatDuration(remainingMinutes ?? 0)}</div>
              </div>
            </div>
          </div>
        )
      })()}

      {isNavigating && (
        <LaneGuide
          lanes={currentLanes}
          visible={isNavigating && distanceToNextStep != null}
          distanceToTurn={distanceToNextStepMeters}
        />
      )}

      {/* Navigation mode: voice strip above main bar (premium), then Report, Photo, End, Map */}
      {isNavigating && (
        <div
          className="bg-white/98 backdrop-blur-sm border-t border-slate-200/80 shadow-[0_-2px_16px_rgba(0,0,0,0.06)] flex flex-col gap-1.5 px-3 pt-2 pb-[env(safe-area-inset-bottom,18px)]"
          style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1200 }}
        >
          {/* Voice controls above End — compact strip; Orion voice-only during nav (no full chat) */}
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={handleToggleVoice}
              aria-label={isMuted ? 'Unmute voice' : 'Mute voice'}
              className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 active:bg-slate-200"
            >
              {isMuted ? <VolumeX size={16} className="text-slate-600" /> : <Volume2 size={16} className="text-slate-600" />}
            </button>
            <button
              onClick={handleNavOrionMic}
              disabled={!userData.is_premium || isNavOrionListening}
              aria-label="Orion voice (no chat)"
              className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border ${userData.is_premium ? (isNavOrionListening ? 'bg-amber-100 border-amber-300' : 'bg-indigo-100 active:bg-indigo-200 border-indigo-200/60') : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'}`}
              title={userData.is_premium ? (isNavOrionListening ? 'Listening…' : 'Tap to talk to Orion') : 'Upgrade to Premium for Orion'}
            >
              <Mic size={16} className={userData.is_premium ? (isNavOrionListening ? 'text-amber-600 animate-pulse' : 'text-indigo-600') : 'text-slate-400'} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowQuickReportIconsOnly(true)}
              aria-label="Report incident (icon)"
              className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 active:bg-amber-200 border border-amber-200/60"
              title="Report (police, hazard, etc.)"
            >
              <AlertTriangle size={18} className="text-amber-600" />
            </button>
            <button
              onClick={() => setShowQuickPhotoReport(true)}
              aria-label="Photo report"
              className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0 active:bg-emerald-200 border border-emerald-200/60"
              title="Photo report"
            >
              <Camera size={18} className="text-emerald-600" />
            </button>
            <button
              onClick={handleRequestEndNavigation}
              data-testid="end-navigation-btn"
              className="flex-1 min-w-0 h-10 rounded-xl bg-red-500 text-white text-[13px] font-semibold active:bg-red-600 transition-colors"
            >
              End
            </button>
            <button
              onClick={() => {
                setIsOverviewMode(v => !v)
                setNavCameraMode('free')
              }}
              aria-label={isOverviewMode ? 'Follow position' : 'Overview'}
              className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 active:bg-slate-200"
            >
              <Map size={18} className="text-slate-600" />
            </button>
          </div>
        </div>
      )}

      {/* End confirmation dialog - dark backdrop, above nav UI */}
      {showEndConfirm && (
        <>
          <div
            onClick={() => setShowEndConfirm(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              zIndex: 1999,
            }}
          />
          <div
            style={{
              position: 'fixed',
              bottom: 'calc(100px + env(safe-area-inset-bottom, 20px))',
              left: 20,
              right: 20,
              zIndex: 2000,
              background: 'white',
              borderRadius: 20,
              padding: '24px 20px',
              boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ fontSize: 17, fontWeight: 700, textAlign: 'center', marginBottom: 6 }}>
              End Navigation?
            </div>
            <div style={{ fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 }}>
              Your trip will be saved and gems awarded.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowEndConfirm(false)}
                style={{
                  flex: 1,
                  height: 46,
                  borderRadius: 12,
                  background: '#f5f5f7',
                  border: 'none',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Continue
              </button>
              <button
                onClick={handleConfirmEndNavigation}
                style={{
                  flex: 1,
                  height: 46,
                  borderRadius: 12,
                  background: '#FF3B30',
                  color: 'white',
                  border: 'none',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                End Trip
              </button>
            </div>
          </div>
        </>
      )}

      {/* Trip summary bottom sheet - modal layer */}
      {showTripSummary && lastTripData && (
        <div className="fixed inset-0 z-[1100] flex items-end justify-center pointer-events-none">
          <div className="absolute inset-0 bg-black/40 pointer-events-auto" onClick={handleDismissTripSummary} />
          <div className="relative w-full max-w-md bg-white rounded-t-2xl shadow-[0_2px_8px_rgba(0,0,0,0.12)] p-4 pb-safe pointer-events-auto animate-slide-up transition-all duration-300 ease-in-out">
            <h3 className="text-slate-800 font-bold text-lg mb-4">Trip Summary</h3>
            <p className="text-slate-500 text-xs mb-3">
              {String((lastTripData.origin ?? 'Start') as string)}
              {' -> '}
              {String((lastTripData.destination ?? 'End') as string)}
            </p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-slate-500 text-[13px]">Distance</p>
                <p className="text-slate-800 font-bold text-lg">
                  {Number.isFinite(Number(lastTripData.distance)) ? Number(lastTripData.distance).toFixed(1) : '--'} mi
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-slate-500 text-[13px]">Time</p>
                <p className="text-slate-800 font-bold text-lg">{formatDuration(Number(lastTripData.duration) || 0)}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-slate-500 text-[13px]">Safety Score</p>
                <p className="text-emerald-600 font-bold text-lg">{String(lastTripData.safety_score ?? '--')}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-slate-500 text-[13px]">Gems Earned</p>
                <p className="text-amber-600 font-bold text-lg">{String(lastTripData.gems_earned ?? '--')}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-slate-500 text-[13px]">XP Earned</p>
                <p className="text-indigo-600 font-bold text-lg">{String(lastTripData.xp_earned ?? '--')}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-slate-500 text-[13px]">Safe Drive Streak</p>
                <p className="text-slate-800 font-bold text-lg">{String(lastTripData.safe_drive_streak ?? 0)}</p>
              </div>
            </div>
            <div className="mb-3">
              <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${(lastTripData.server_synced as boolean) ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {(lastTripData.server_synced as boolean) ? 'Server synced' : 'Syncing...'}
              </span>
            </div>
            <button
              onClick={handleDismissTripSummary}
              className="w-full py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Top Bar - theme-aware (Settings > Appearance); hidden when plan selection is open */}
      {!showPlanSelection && !isNavigating && !showSearch && activeTab === 'map' && (
      <div style={{
        position: 'fixed',
        top: 'env(safe-area-inset-top, 0px)',
        left: 12,
        right: 12,
        zIndex: 500,
        pointerEvents: 'none',
      }}>
        {/* Search bar - floating pill */}
        <div style={{
          marginTop: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          pointerEvents: 'all',
        }}>
          <button
            onClick={() => setShowMenu(true)}
            data-testid="menu-btn"
            className={isLight ? 'bg-white' : 'bg-slate-800 border border-white/10'}
            style={{
              width: 38, height: 38,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              cursor: 'pointer',
              boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.1)' : '0 2px 12px rgba(0,0,0,0.3)',
            }}
          >
            <Menu size={18} className={isLight ? 'text-slate-800' : 'text-white'} />
          </button>
          <div
            role="button"
            tabIndex={0}
            onClick={() => setShowSearch(true)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowSearch(true) }}
            data-testid="search-btn"
            className={isLight ? 'bg-white' : 'bg-slate-800 border border-white/10'}
            style={{
              flex: 1,
              borderRadius: 14,
              boxShadow: isLight ? '0 2px 16px rgba(0,0,0,0.14)' : '0 2px 16px rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              cursor: 'text',
            }}
          >
            <Search size={15} className={isLight ? 'text-slate-500' : 'text-slate-400'} />
            <span className={`flex-1 text-[15px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Search here</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleVoiceCommand() }}
              data-testid="orion-btn"
              style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}
            >
              <Mic size={15} className={isLight ? 'text-slate-500' : 'text-slate-400'} />
            </button>
          </div>
        </div>

        {/* Filter chips - theme-aware */}
        <div style={{
          display: 'flex',
          gap: 8,
          marginTop: 8,
          overflowX: 'auto',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
          pointerEvents: 'all',
          paddingBottom: 2,
        }}>
          {[
            { label: 'Favorites', color: '#007AFF', active: locationCategory === 'favorites' },
            { label: 'Nearby', color: '#666', active: locationCategory === 'nearby' },
          ].map(chip => (
            <button
              key={chip.label}
              onClick={() => {
                if (chip.label === 'Favorites') setLocationCategory('favorites')
                else if (chip.label === 'Nearby') setLocationCategory('nearby')
              }}
              data-testid={chip.label === 'Favorites' ? 'tab-favorites' : 'tab-nearby'}
              style={{
                flexShrink: 0,
                background: chip.active ? chip.color : (isLight ? 'white' : 'rgba(30,41,59,0.95)'),
                color: chip.active ? 'white' : (isLight ? '#333' : '#e2e8f0'),
                borderRadius: 20,
                padding: '6px 14px',
                fontSize: 13,
                fontWeight: 600,
                border: isLight ? 'none' : '1px solid rgba(255,255,255,0.1)',
                boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.3)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Quick destinations - floating */}
        <div style={{
          display: 'flex',
          gap: 8,
          marginTop: 8,
          overflowX: 'auto',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
          pointerEvents: 'all',
        }}>
          {[
            { label: 'Home', sub: getHomeLocation() ? getHomeLocation()!.address : 'Set location', icon: Home, isSet: !!getHomeLocation() },
            { label: 'Work', sub: getWorkLocation() ? getWorkLocation()!.address : 'Set location', icon: Briefcase, isSet: !!getWorkLocation() },
            { label: 'More', sub: '', icon: Plus, isSet: false },
          ].map(item => (
            <button
              key={item.label}
              onClick={() => {
                if (item.label === 'Home') {
                  if (getHomeLocation()) handleStartNavigation(getHomeLocation()!.name)
                  else { setNewLocation({ ...newLocation, category: 'home' }); setShowAddLocation(true) }
                } else if (item.label === 'Work') {
                  if (getWorkLocation()) handleStartNavigation(getWorkLocation()!.name)
                  else { setNewLocation({ ...newLocation, category: 'work' }); setShowAddLocation(true) }
                } else setShowAddLocation(true)
              }}
              data-testid={item.label === 'Home' ? (item.isSet ? 'quick-home' : 'add-home') : item.label === 'Work' ? (item.isSet ? 'quick-work' : 'add-work') : 'add-favorite'}
              style={{
                flexShrink: 0,
                background: 'white',
                borderRadius: 12,
                padding: '8px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                cursor: 'pointer',
                minWidth: 110,
                border: 'none',
              }}
            >
              <item.icon size={16} color="#666" />
              <div style={{ textAlign: 'left', minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>{item.label}</div>
                {item.sub ? (
                  <div style={{ fontSize: 11, color: item.isSet ? '#666' : '#007AFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 90 }}>{item.sub}</div>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      </div>
      )}

      {/* Moveable Score Widget */}
      {widgets.score.visible && (
        <div 
          className="absolute bg-slate-900/95 backdrop-blur rounded-xl transition-all cursor-move select-none z-[5]"
          style={{ left: widgets.score.position.x, top: widgets.score.position.y, width: widgets.score.collapsed ? 100 : 110 }}
          data-testid="widget-score"
        >
          <div 
            className="flex items-center justify-between px-2 py-1.5 border-b border-slate-700/50"
            onMouseDown={(e) => handleWidgetDragStart('score', e)}
            onTouchStart={(e) => handleWidgetDragStart('score', e)}
          >
            <GripVertical size={12} className="text-slate-500" />
            <span className="text-[10px] text-slate-400 font-medium">SCORE</span>
            <button onClick={() => toggleWidgetCollapse('score')} data-testid="collapse-score-widget">
              {widgets.score.collapsed ? <Maximize2 size={12} className="text-slate-500" /> : <Minimize2 size={12} className="text-slate-500" />}
            </button>
          </div>
          
          {!widgets.score.collapsed && (
            <div className="p-2">
              <div className="relative w-14 h-14 mx-auto mb-1">
                <svg className="w-full h-full -rotate-90">
                  <circle cx="28" cy="28" r="24" stroke="#1e293b" strokeWidth="4" fill="none" />
                  <circle cx="28" cy="28" r="24"
                    stroke={
                      Number((userData as { safety_score?: number }).safety_score ?? 0) >= 90
                        ? '#22c55e'
                        : Number((userData as { safety_score?: number }).safety_score ?? 0) >= 70
                          ? '#3b82f6'
                          : '#ef4444'
                    }
                    strokeWidth="4" fill="none" strokeDasharray={`${(Number((userData as { safety_score?: number }).safety_score ?? 0) / 100) * 151} 151`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold text-white">{Number((userData as { safety_score?: number }).safety_score ?? 0)}</span>
                </div>
              </div>
              <button onClick={() => { setActiveTab('profile'); setProfileTab('score') }} data-testid="score-details-btn"
                className="w-full bg-blue-500 text-white text-[10px] font-medium py-1 rounded-lg hover:bg-blue-600">
                Details
              </button>
            </div>
          )}
        </div>
      )}

      {/* Moveable Gems Widget */}
      {widgets.gems.visible && (
        <div 
          className="absolute bg-slate-900/95 backdrop-blur rounded-xl transition-all cursor-move select-none z-[5]"
          style={{ left: widgets.gems.position.x, top: widgets.gems.position.y, width: widgets.gems.collapsed ? 100 : 110 }}
          data-testid="widget-gems"
        >
          <div 
            className="flex items-center justify-between px-2 py-1.5 border-b border-slate-700/50"
            onMouseDown={(e) => handleWidgetDragStart('gems', e)}
            onTouchStart={(e) => handleWidgetDragStart('gems', e)}
          >
            <GripVertical size={12} className="text-slate-500" />
            <span className="text-[10px] text-slate-400 font-medium">GEMS</span>
            <button onClick={() => toggleWidgetCollapse('gems')} data-testid="collapse-gems-widget">
              {widgets.gems.collapsed ? <Maximize2 size={12} className="text-slate-500" /> : <Minimize2 size={12} className="text-slate-500" />}
            </button>
          </div>
          
          {!widgets.gems.collapsed && (
            <div className="p-2 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Gem className="text-emerald-400" size={16} />
                <span className="text-white font-bold">{((Number(userData.gems) ?? 0) / 1000).toFixed(1)}K</span>
              </div>
              <p className="text-[10px] text-emerald-400">+2,450 this month</p>
              <button onClick={() => setActiveTab('rewards')} data-testid="earn-gems-btn"
                className="w-full mt-1 bg-emerald-500/20 text-emerald-400 text-[10px] py-1 rounded-lg hover:bg-emerald-500/30">
                Earn More
              </button>
            </div>
          )}
        </div>
      )}

      {/* Road reports render as Mapbox layers (sr-reports) in MapboxMapSnapRoad; no HTML markers. */}

      {/* Road Status Overlay (when user taps a report on the map) — above map */}
      <RoadStatusOverlay
        selectedRoad={selectedRoadStatus}
        onClose={() => setSelectedRoadStatus(null)}
      />

      {/* Note: Offer gems and user marker are rendered in MapboxMapSnapRoad component */}

      <MapLayerPicker
        isOpen={showLayerPicker}
        onClose={() => setShowLayerPicker(false)}
        activeMapLayer={activeMapLayer}
        onMapLayerChange={(layer) => {
          setActiveMapLayer(layer as 'standard' | 'satellite' | 'hybrid' | 'dark')
          setShowLayerPicker(false)
        }}
        showTraffic={showTrafficLayer}
        onToggleTraffic={() => setShowTrafficLayer((v) => !v)}
        showCameras={showCameraLayer}
        onToggleCameras={() => {
          if (!hasCameraAccess) {
            setShowPlanSelection(true)
            toast('Upgrade to Premium or Family for traffic cameras', { icon: '🔒' })
            return
          }
          setShowCameraLayer((v) => !v)
        }}
        showIncidents={showIncidentsLayer}
        onToggleIncidents={() => setShowIncidentsLayer((v) => !v)}
        showConstruction={showConstructionLayer}
        onToggleConstruction={() => setShowConstructionLayer((v) => !v)}
        showFuelPrices={showFuelPrices}
        onToggleFuelPrices={() => setShowFuelPrices((v) => !v)}
      />

      {/* OHGO camera popup - live feed when a camera marker is tapped */}
      {selectedCamera && (
        <Suspense fallback={null}>
          <OHGOCameraPopup
            camera={selectedCamera}
            onClose={() => setSelectedCamera(null)}
          />
        </Suspense>
      )}

      {/* Camera report FAB - bottom left above speed indicator (hidden during nav) */}
      {!isNavigating && (
        <button onClick={() => setShowPhotoReport(true)} data-testid="report-btn"
          className="absolute left-3 bottom-44 z-20 w-11 h-11 bg-white/95 backdrop-blur rounded-full flex items-center justify-center shadow-[0_1px_4px_rgba(0,0,0,0.08)] border border-gray-200 active:scale-95 transition-transform">
          <Camera className="text-slate-600" size={18} />
        </button>
      )}

      {!isNavigating && (
        <button
          onClick={() => setShowPhotoFeed(true)}
          style={{
            position: 'absolute',
            left: 12,
            bottom: 188,
            zIndex: 20,
            padding: '8px 14px',
            borderRadius: 20,
            background: 'rgba(255,59,48,0.15)',
            border: '1px solid rgba(255,59,48,0.3)',
            color: 'white',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          📸 {photoReports.length} Reports
        </button>
      )}

      {/* Speed Display (when moving, hidden during navigation for clean nav mode) */}
      {!isNavigating && (vehicle && vehicle.velocity > 0.5) && (
        <div className="absolute left-3 bottom-20 z-20">
          <SpeedIndicator
            velocityMs={vehicle?.velocity ?? (currentSpeed * 0.447)}
            mode={mode}
            speedLimitMph={navigationData ? (() => {
              const text = (navigationData.steps?.[currentStepIndex]?.instruction || '') + ' ' + (navigationData.destination?.name || '')
              if (/\bI-\d|Interstate/i.test(text)) return 65
              if (/\bUS-\d|\bSR-\d|\bHwy\b/i.test(text)) return 55
              if (/\bAve\b|\bSt\b|\bRd\b|\bDr\b/i.test(text)) return 35
              return 45
            })() : undefined}
          />
        </div>
      )}

      {crashDetected && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(255,59,48,0.95)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 32,
          }}
        >
          <div style={{ fontSize: 72, marginBottom: 16 }}>🚨</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'white', textAlign: 'center', marginBottom: 8 }}>
            Are you okay?
          </div>
          <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: 32, lineHeight: 1.5 }}>
            {crashCancelActive
              ? 'Crash detected. Your family will be alerted in 10 seconds unless you cancel.'
              : 'Alert sent to your family with your location.'}
          </div>
          {crashCancelActive ? (
            <button
              onClick={cancelCrashAlert}
              style={{
                width: '100%',
                maxWidth: 320,
                height: 64,
                background: 'white',
                border: 'none',
                borderRadius: 20,
                color: '#FF3B30',
                fontSize: 20,
                fontWeight: 800,
                cursor: 'pointer',
                marginBottom: 16,
              }}
            >
              I&apos;m okay — Cancel Alert
            </button>
          ) : (
            <button
              onClick={() => setCrashDetected(false)}
              style={{
                width: '100%',
                maxWidth: 320,
                height: 56,
                background: 'rgba(255,255,255,0.2)',
                border: '2px solid white',
                borderRadius: 16,
                color: 'white',
                fontSize: 16,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          )}
        </div>
      )}
    </div>
  )

  // Rewards Tab - Combines Offers, Challenges, Badges, Skins
  const renderRewards = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 'calc(60px + env(safe-area-inset-bottom, 20px))',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
      background: isLight ? '#f5f5f7' : '#0f172a',
      paddingTop: 'env(safe-area-inset-top, 44px)',
    }}>
      {/* Header with Gems */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-4 pt-3 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-white text-lg font-bold">Rewards</h1>
          <button onClick={() => setShowGemHistory(true)} data-testid="gem-balance-btn"
            className="bg-white/20 rounded-full px-3 py-1.5 flex items-center gap-1.5">
            <Gem className="text-white" size={16} />
            <span className="text-white font-bold">{((Number(userData.gems) ?? 0) / 1000).toFixed(1)}K</span>
          </button>
        </div>
        
        {/* Rewards Sub-tabs — Car Studio only for premium (dashboard only, coming soon) */}
        <div className="flex gap-1 bg-white/10 rounded-xl p-1">
          {(userData.is_premium ? (['offers', 'challenges', 'badges', 'carstudio'] as const) : (['offers', 'challenges', 'badges'] as const)).map(tab => (
            <button key={tab} onClick={() => setRewardsTab(tab)} data-testid={`rewards-tab-${tab}`}
              className={`flex-1 py-2 rounded-lg text-xs font-medium ${rewardsTab === tab ? 'bg-white text-emerald-600' : 'text-white'}`}>
              {tab === 'carstudio' ? 'Car Studio' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Offers Sub-tab */}
      {rewardsTab === 'offers' && (
        <div className="p-4">
          {/* Safety snapshot */}
          <div
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-4 mb-4 text-left"
            data-testid="rewards-safety-preview"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-xs">Safety score</p>
                <p className="text-white text-2xl font-bold">{Math.round(Number(userData.safety_score ?? 0))}</p>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="text-white/90" size={24} />
              </div>
            </div>
          </div>

          {/* View All Offers Button */}
          <button onClick={() => setShowOffersModal(true)} data-testid="view-all-offers"
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-4 mb-4 text-left">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-xs">
                  {userPlan === 'premium' ? '🌟 Premium: 18% off all offers' : '📍 Basic: 6% off all offers'}
                </p>
                <p className="text-white text-lg font-bold">View All Offers</p>
              </div>
              <div className="flex items-center gap-2">
                <Gift className="text-white" size={24} />
                <ChevronRight className="text-white" size={20} />
              </div>
            </div>
          </button>

          {/* Nearby Offers Preview */}
          <h3 className="text-slate-900 font-semibold mb-3 flex items-center gap-2">
            <Gift size={16} className="text-emerald-500" /> Nearby Offers
          </h3>
          <div className="space-y-2">
            {offers.length === 0 ? (
              <div className="bg-white rounded-xl p-6 text-center shadow-sm">
                <Gift className="text-slate-300 mx-auto mb-2" size={32} />
                <p className="text-slate-500 text-sm">No offers available nearby</p>
                <p className="text-slate-400 text-xs mt-1">Check back later for deals!</p>
              </div>
            ) : (
              offers.slice(0, 4).map((offer: DriverAppOffer) => (
                <div key={offer.id} data-testid={`offer-${offer.id}`}
                  className="bg-white rounded-xl p-3 flex items-center gap-3 shadow-sm">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    offer.business_type === 'gas' ? 'bg-blue-500' : 
                    offer.business_type === 'cafe' ? 'bg-orange-500' :
                    offer.business_type === 'carwash' ? 'bg-cyan-500' : 'bg-emerald-500'
                  }`}>
                    {offer.business_type === 'gas' ? <Fuel className="text-white" size={18} /> : 
                     offer.business_type === 'cafe' ? <Coffee className="text-white" size={18} /> :
                     offer.business_type === 'carwash' ? <Car className="text-white" size={18} /> :
                     <Gift className="text-white" size={18} />}
                  </div>
                  <div className="flex-1">
                    <p className="text-slate-900 font-medium text-sm">{offer.business_name || offer.name}</p>
                    <p className="text-emerald-600 text-xs">{Number(offer.discount_percent ?? offer.discount ?? 0)}% off</p>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <div>
                      <p className="text-emerald-500 font-bold text-sm">+{Number(offer.gems_reward ?? offer.gems ?? 0)}💎</p>
                      {offer.redeemed && (
                        <span className="text-emerald-400 text-[10px] flex items-center gap-0.5">
                          <Check size={10} /> Redeemed
                        </span>
                      )}
                    </div>
                    {!offer.redeemed && (
                      <button
                        onClick={() => handleDirectRedemption(offer)}
                        className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-medium rounded-lg hover:bg-emerald-600"
                        data-testid={`redeem-${offer.id}`}
                      >
                        Redeem
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Challenges Sub-tab */}
      {rewardsTab === 'challenges' && (
        <div className="p-4">
          {/* Challenge History Button */}
          <button 
            onClick={() => setShowChallengeHistory(true)}
            className="w-full bg-gradient-to-r from-red-500 to-orange-500 rounded-xl p-4 mb-4 flex items-center gap-3 shadow-lg"
            data-testid="view-challenge-history"
          >
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Swords className="text-white" size={20} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-white font-semibold text-sm">Challenge History</p>
              <p className="text-red-100 text-xs">View past battles & badges</p>
            </div>
            <ChevronRight className="text-white/80" size={18} />
          </button>

          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-slate-900 font-semibold">Weekly Challenges</h3>
              <p className="text-slate-500 text-xs">{(Array.isArray(challenges) ? challenges : []).filter((c: Record<string, unknown>) => c.completed).length}/{(Array.isArray(challenges) ? challenges : []).length} completed</p>
            </div>
            <button onClick={loadData} className="text-blue-500 text-xs">Refresh</button>
          </div>

          <div className="space-y-3">
            {(Array.isArray(challenges) ? challenges : []).map((challenge: Record<string, unknown>) => (
              <div key={String(challenge.id ?? '')} className={`bg-white rounded-xl p-4 shadow-sm ${challenge.claimed ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="text-slate-900 font-medium">{String(challenge.title ?? '')}</h4>
                    <p className="text-slate-500 text-xs">{String(challenge.description ?? '')}</p>
                  </div>
                  <span className="text-emerald-500 font-bold">+{String(challenge.gems ?? '')}💎</span>
                </div>
                
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">{String(challenge.progress ?? '')}/{String(challenge.target ?? '')}</span>
                    <span className="text-slate-400">{String(challenge.expires ?? '')} left</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className={`h-2 rounded-full transition-all ${challenge.completed ? 'bg-emerald-500' : 'bg-blue-500'}`}
                      style={{ width: `${Math.min((Number((challenge as { progress?: number }).progress ?? 0) / Math.max(Number((challenge as { target?: number }).target ?? 1), 1)) * 100, 100)}%` }} />
                  </div>
                </div>

                {challenge.completed && !challenge.claimed ? (
                  <button onClick={() => handleClaimChallenge(Number(challenge.id))} data-testid={`claim-${String(challenge.id ?? '')}`}
                    className="w-full bg-emerald-500 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                    <Gem size={14} /> Claim Reward
                  </button>
                ) : challenge.claimed ? (
                  <div className="text-center text-slate-400 text-sm py-2">
                    <Check size={14} className="inline mr-1" /> Claimed
                  </div>
                ) : (
                  <div className="text-center text-slate-400 text-sm py-2">
                    {Math.round((Number((challenge as { progress?: number }).progress ?? 0) / Math.max(Number((challenge as { target?: number }).target ?? 1), 1)) * 100)}% complete
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Badges Sub-tab */}
      {rewardsTab === 'badges' && (
        <div className="p-4">
          <button onClick={() => setShowBadgesGrid(true)} data-testid="view-all-badges"
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl p-4 mb-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-xs">Badge Collection</p>
                <p className="text-2xl font-bold">{(Array.isArray(badges) ? badges : []).filter((b: Record<string, unknown>) => b.earned).length}/160</p>
              </div>
              <div className="flex items-center gap-2">
                <Award className="text-yellow-300" size={24} />
                <span className="text-sm">View All →</span>
              </div>
            </div>
          </button>

          <h3 className="text-slate-900 font-semibold mb-3">Recent Badges</h3>
          <div className="grid grid-cols-4 gap-2">
            {(Array.isArray(badges) ? badges : []).filter((b: Record<string, unknown>) => b.earned).slice(0, 8).map((badge: Record<string, unknown>) => (
              <div key={String(badge.id ?? '')} className="bg-white rounded-xl p-2 text-center">
                <div className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-lg mb-1">
                  {typeof badge.icon === 'string' || typeof badge.icon === 'number' ? badge.icon : String(badge.icon ?? '')}
                </div>
                <p className="text-[9px] text-slate-600 line-clamp-1">{String(badge.name ?? '')}</p>
              </div>
            ))}
          </div>

          <h3 className="text-slate-900 font-semibold mb-3 mt-4">Almost There!</h3>
          <div className="space-y-2">
            {(Array.isArray(badges) ? badges : []).filter((b: Record<string, unknown>) => !b.earned && (b.progress as number) > 50).slice(0, 3).map((badge: Record<string, unknown>) => (
              <div key={String(badge.id ?? '')} className="bg-white rounded-xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center">
                  <Lock size={16} className="text-slate-400" />
                </div>
                <div className="flex-1">
                  <p className="text-slate-900 text-sm font-medium">{String(badge.name ?? '')}</p>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Number(badge.progress ?? 0)}%` }} />
                  </div>
                </div>
                <span className="text-slate-400 text-xs">{Number(badge.progress ?? 0)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Car Studio Sub-tab — premium only, coming soon in modal */}
      {rewardsTab === 'carstudio' && userData.is_premium && (
        <div className="p-4">
          {/* Current Car Display */}
          <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-4 mb-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
            <div className="flex items-center gap-4">
              <div className="w-20 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                <Car className="text-white" size={36} />
              </div>
              <div className="flex-1">
                <p className="text-white/70 text-xs">Current Vehicle</p>
                <p className="text-white font-bold text-lg capitalize">{userCar.category || 'Sedan'}</p>
                <p className="text-white/80 text-xs">Color: {userCar.color?.replace('-', ' ') || 'Ocean Blue'}</p>
              </div>
            </div>
          </div>

          {/* Open Car Studio Button */}
          <button onClick={() => setShowCarStudio(true)} data-testid="open-car-studio"
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-4 mb-4 hover:from-amber-400 hover:to-orange-400 transition-colors shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-bold text-lg">Open Car Studio</p>
                <p className="text-amber-100 text-xs">Customize colors & unlock new styles</p>
              </div>
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <ChevronRight className="text-white" size={24} />
              </div>
            </div>
          </button>

          {/* Owned Colors */}
          <h3 className="text-slate-900 font-semibold mb-3 flex items-center gap-2">
            <Gem className="text-blue-500" size={16} />
            Owned Colors
          </h3>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {ownedColors.map((color, i) => (
              <button 
                key={i}
                onClick={() => handleCarChange({ ...userCar, color })}
                className={`relative aspect-square rounded-xl transition-all ${
                  userCar.color === color ? 'ring-2 ring-amber-500 ring-offset-2' : 'hover:scale-105'
                }`}
                style={{ 
                  background: color === 'ocean-blue' ? '#3b82f6' :
                             color === 'midnight-black' ? '#1e293b' :
                             color === 'pearl-white' ? '#f1f5f9' :
                             color === 'racing-red' ? '#ef4444' :
                             color === 'forest-green' ? '#22c55e' :
                             color === 'sunset-gold' ? '#fbbf24' : '#3b82f6'
                }}
              >
                {userCar.color === color && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl">
                    <Check className="text-white" size={20} />
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Unlock More */}
          <div className="bg-slate-100 rounded-xl p-3 text-center">
            <p className="text-slate-600 text-sm">💎 Earn gems to unlock more colors!</p>
          </div>
        </div>
      )}
    </div>
  )

  // Routes Tab - Theme-aware (white when light theme)
  const routesBg = isLight ? '#f5f5f7' : '#0f172a'
  const routesCardBg = isLight ? 'bg-white' : 'bg-slate-800'
  const routesHeaderBg = isLight ? 'bg-white' : 'bg-slate-800'
  const routesTitleCls = isLight ? 'text-slate-900' : 'text-white'
  const routesSubtextCls = isLight ? 'text-slate-500' : 'text-slate-400'
  const routesEmptyIconCls = isLight ? 'text-slate-300' : 'text-slate-500'

  const _renderRoutes = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 'calc(60px + env(safe-area-inset-bottom, 20px))',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
      background: routesBg,
      paddingTop: 'env(safe-area-inset-top, 44px)',
    }}>
      <div className={`${routesHeaderBg} px-4 pt-3 pb-3 sticky top-0 z-10 shadow-sm`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-lg font-bold ${routesTitleCls}`}>My Routes</h1>
            <p className={`text-xs ${routesSubtextCls}`}>{routes.length} of {routeLimit} routes saved</p>
          </div>
          <button onClick={() => setShowAddRoute(true)} disabled={routes.length >= routeLimit} data-testid="add-route-btn"
            className="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 disabled:opacity-50">
            <Plus size={14} /> Add Route
          </button>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-3">
          <div className={`w-full rounded-full h-1.5 ${isLight ? 'bg-slate-200' : 'bg-slate-700'}`}>
            <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${routeLimit ? (routes.length / routeLimit) * 100 : 0}%` }} />
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {routes.length === 0 ? (
          <div className={`text-center py-12 rounded-xl ${routesCardBg} ${isLight ? 'shadow-sm' : ''}`}>
            <Route className={`mx-auto mb-3 ${routesEmptyIconCls}`} size={48} />
            <p className={`font-medium ${isLight ? 'text-slate-900' : 'text-white'}`}>No saved routes</p>
            <p className={`text-sm mt-1 ${routesSubtextCls}`}>Add your frequent destinations</p>
            <button onClick={() => setShowAddRoute(true)} data-testid="add-first-route-btn"
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
              Add First Route
            </button>
          </div>
        ) : (
          routes.map(route => (
            <div key={route.id} data-testid={`route-${route.id}`}
              className={`${routesCardBg} rounded-xl p-4 shadow-sm ${!route.is_active && 'opacity-60'} ${isLight ? '' : 'border border-slate-700'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>{route.name}</h3>
                    {route.notifications && <Bell size={12} className="text-blue-500" />}
                    {!route.is_active && <span className={`text-[10px] px-1.5 py-0.5 rounded ${isLight ? 'bg-slate-200 text-slate-500' : 'bg-slate-600 text-slate-400'}`}>Paused</span>}
                  </div>
                  <p className={`text-sm mt-1 ${routesSubtextCls}`}>{route.origin} → {route.destination}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleToggleRoute(route.id)} data-testid={`toggle-route-${route.id}`}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${route.is_active ? 'bg-emerald-100' : isLight ? 'bg-slate-100' : 'bg-slate-700'}`}>
                    {route.is_active ? <Play className="text-emerald-500" size={14} /> : <Pause className={isLight ? 'text-slate-400' : 'text-slate-400'} size={14} />}
                  </button>
                  <button onClick={() => handleDeleteRoute(route.id)} data-testid={`delete-route-${route.id}`}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${isLight ? 'bg-red-100' : 'bg-red-900/30'}`}>
                    <Trash2 className="text-red-500" size={14} />
                  </button>
                </div>
              </div>
              
              {/* Route Details */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className={`rounded-lg p-2 text-center ${isLight ? 'bg-slate-50' : 'bg-slate-700/50'}`}>
                  <Clock className="mx-auto text-blue-500 mb-1" size={14} />
                  <p className={`text-xs font-medium ${isLight ? 'text-slate-900' : 'text-white'}`}>{route.departure_time}</p>
                  <p className={`text-[10px] ${routesSubtextCls}`}>Depart</p>
                </div>
                <div className={`rounded-lg p-2 text-center ${isLight ? 'bg-slate-50' : 'bg-slate-700/50'}`}>
                  <Timer className="mx-auto text-emerald-500 mb-1" size={14} />
                  <p className={`text-xs font-medium ${isLight ? 'text-slate-900' : 'text-white'}`}>{route.estimated_time} min</p>
                  <p className={`text-[10px] ${routesSubtextCls}`}>Duration</p>
                </div>
                <div className={`rounded-lg p-2 text-center ${isLight ? 'bg-slate-50' : 'bg-slate-700/50'}`}>
                  <Route className="mx-auto text-purple-500 mb-1" size={14} />
                  <p className={`text-xs font-medium ${isLight ? 'text-slate-900' : 'text-white'}`}>{route.distance} mi</p>
                  <p className={`text-[10px] ${routesSubtextCls}`}>Distance</p>
                </div>
              </div>

              {/* Days */}
              <div className="flex items-center gap-1 mb-3">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <span key={day} className={`text-[10px] px-2 py-1 rounded ${route.days_active.includes(day) ? 'bg-blue-100 text-blue-600 font-medium' : isLight ? 'bg-slate-100 text-slate-400' : 'bg-slate-700 text-slate-400'}`}>
                    {day}
                  </span>
                ))}
              </div>

              {/* Actions */}
              <div className={`flex items-center justify-between pt-3 border-t ${isLight ? 'border-slate-100' : 'border-slate-600'}`}>
                <div>
                  <button onClick={() => handleToggleRouteNotifications(route.id)} data-testid={`toggle-notif-${route.id}`}
                    className={`text-xs flex items-center gap-1 hover:text-blue-500 ${routesSubtextCls}`}>
                    {route.notifications ? <Bell size={12} className="text-blue-500" /> : <EyeOff size={12} />}
                    {route.notifications ? 'Alerts on' : 'Alerts off'}
                  </button>
                  {!hasRouteAlertsAccess && (
                    <p className={`text-[10px] mt-0.5 ${routesSubtextCls}`}>Push alerts are for Premium/Family. You still get in-app route recommendations here.</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleLeaveEarlyForRoute(route.id)} data-testid={`leave-early-route-${route.id}`}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 ${hasRouteAlertsAccess ? (isLight ? 'text-slate-600 bg-slate-100 hover:bg-slate-200' : 'text-slate-300 bg-slate-700 hover:bg-slate-600') : (isLight ? 'text-slate-700 bg-blue-50 hover:bg-blue-100' : 'text-blue-200 bg-blue-900/40 hover:bg-blue-900/55')}`}
                    title={!hasRouteAlertsAccess ? 'In-app leave-early suggestion (push is Premium/Family)' : undefined}>
                    <Clock size={12} /> Leave early
                  </button>
                  <button onClick={() => handleStartNavigation(route.destination)} data-testid={`start-route-${route.id}`}
                    className="bg-blue-500 text-white px-4 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1">
                    <Navigation size={12} /> Start
                  </button>
                </div>
              </div>

              {/* In-app route recommendations card (always visible in app; push only for Premium/Family). */}
              {route.notifications && (
                <div className={`mt-3 rounded-xl border p-3 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-700'}`}>
                  <p className={`text-xs font-semibold ${isLight ? 'text-slate-800' : 'text-slate-100'}`}>Route Recommendations</p>
                  <div className="space-y-2 mt-2">
                    {routeNotifications
                      .filter((n) => n.route_id === route.id && !dismissedRouteNotifIds.has(n.id) && (n.type === 'leave_early' || n.type === 'faster_route'))
                      .slice(0, 2)
                      .map((n) => (
                        <div key={n.id} className={`rounded-lg p-2.5 ${isLight ? 'bg-white border border-slate-200' : 'bg-slate-800 border border-slate-700'}`}>
                          <p className={`text-xs ${isLight ? 'text-slate-700' : 'text-slate-200'}`}>{n.message}</p>
                          <div className="flex gap-2 mt-2">
                            {n.type === 'leave_early' && (
                              <button
                                onClick={() => {
                                  if (n.leave_by && n.eta_minutes != null) {
                                    setLeaveEarlyForRoute({
                                      routeId: route.id,
                                      leaveBy: n.leave_by,
                                      etaMinutes: n.eta_minutes,
                                      destination: n.destination ?? route.destination,
                                    })
                                  } else {
                                    void handleLeaveEarlyForRoute(route.id)
                                  }
                                  setDismissedRouteNotifIds((s) => new Set([...s, n.id]))
                                }}
                                className="px-2.5 py-1 text-[11px] rounded-md bg-blue-500 text-white font-medium"
                              >
                                Leave early
                              </button>
                            )}
                            {n.type === 'faster_route' && (
                              <button
                                onClick={() => {
                                  handleStartNavigation(n.destination ?? route.destination)
                                  setDismissedRouteNotifIds((s) => new Set([...s, n.id]))
                                }}
                                className="px-2.5 py-1 text-[11px] rounded-md bg-emerald-500 text-white font-medium"
                              >
                                Better route
                              </button>
                            )}
                            <button
                              onClick={() => setDismissedRouteNotifIds((s) => new Set([...s, n.id]))}
                              className={`px-2.5 py-1 text-[11px] rounded-md font-medium ${isLight ? 'bg-slate-100 text-slate-600' : 'bg-slate-700 text-slate-200'}`}
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      ))}
                    {routeNotifications.filter((n) => n.route_id === route.id && !dismissedRouteNotifIds.has(n.id) && (n.type === 'leave_early' || n.type === 'faster_route')).length === 0 && (
                      <p className={`text-[11px] ${routesSubtextCls}`}>No current traffic recommendations for this route.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
  void _renderRoutes

  // Profile Tab - theme from Settings > Appearance (isLight)
  const profileBg = isLight ? '#f5f5f7' : '#0a0a0f'
  const profileHeaderBg = isLight ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gradient-to-br from-slate-800 via-indigo-900/40 to-slate-900'
  const profileHeaderBorder = isLight ? 'border-slate-200' : 'border-white/10'
  const profileTabBg = isLight ? 'bg-white border-slate-200' : 'bg-black/20 border-white/10'
  const profileTabActive = isLight ? 'text-blue-600 border-blue-600' : 'text-amber-400 border-amber-400'
  const profileTabInactive = isLight ? 'text-slate-500' : 'text-slate-400'
  const profileCardBg = isLight ? 'bg-white' : 'bg-slate-800/80'
  const profileCardBorder = isLight ? 'border-slate-200' : 'border-white/10'
  const profileCardHover = isLight ? 'hover:bg-slate-50 hover:border-slate-300' : 'hover:bg-slate-800 hover:border-white/20'
  const profileText = isLight ? 'text-slate-900' : 'text-white'
  const profileTextMuted = isLight ? 'text-slate-500' : 'text-slate-400'

  const renderProfile = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 'calc(60px + env(safe-area-inset-bottom, 20px))',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
      background: profileBg,
      paddingTop: 'env(safe-area-inset-top, 44px)',
    }}>
      {/* Header with Car - theme-aware */}
      <div className={`${profileHeaderBg} px-4 pt-4 pb-6 border-b ${profileHeaderBorder}`}>
        <div className="flex items-center gap-3">
          {/* User Avatar with Car */}
          <button 
            onClick={() => setShowCarStudio(true)}
            className="relative w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center overflow-hidden group"
          >
            <ProfileCar 
              category={userCar.category as any}
              color={userCar.color as any}
              size={56}
            />
            {/* Edit overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Edit2 className="text-white" size={16} />
            </div>
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white">{userData.name}</h1>
            <div className="flex items-center gap-2">
              <span className="text-xs text-blue-200">Level {userData.level}</span>
              {userData.is_premium ? (
                <span className="text-[10px] bg-gradient-to-r from-amber-400 to-orange-400 text-amber-900 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <Zap size={10} /> PREMIUM
                </span>
              ) : (
                <span className="text-[10px] bg-slate-600 text-slate-300 px-2 py-0.5 rounded-full font-medium">
                  BASIC
                </span>
              )}
            </div>
            {userData.is_premium && (
              <p className="text-amber-300 text-[10px] mt-0.5 flex items-center gap-1">
                <Gem size={10} /> 2× gem multiplier active
              </p>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-2 mt-4">
          {[
            { value: `${((Number(userData.gems) ?? 0) / 1000).toFixed(1)}K`, label: 'Gems', icon: '💎' },
            { value: `${Math.round(Number(userData.safety_score ?? 0))}`, label: 'Safety', icon: '🛡️' },
            { value: userData.total_trips, label: 'Trips', icon: '🚗' },
            { value: `${((Number(userData.total_miles) ?? 0) / 1000).toFixed(1)}K`, label: 'Miles', icon: '📍' },
          ].map((s, i) => (
            <div key={i} className="bg-white/10 rounded-xl p-2 text-center">
              <span className="text-sm">{s.icon}</span>
              <p className="text-white font-bold text-sm">{s.value}</p>
              <p className="text-blue-200 text-[10px]">{s.label}</p>
            </div>
          ))}
        </div>

        <div
          onClick={() => setShowScoreCard(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'linear-gradient(135deg,rgba(0,122,255,0.15),rgba(124,58,237,0.15))',
            borderRadius: 16,
            padding: '14px 16px',
            marginTop: 12,
            border: '1px solid rgba(0,122,255,0.2)',
            cursor: 'pointer',
          }}
        >
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: 36, fontWeight: 900, color: '#007AFF' }}>{snaproadScore}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>SnapRoad Score</div>
          </div>
          <div style={{ width: 1, height: 48, background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ flex: 1, paddingLeft: 12 }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
              Weekly driving trend
            </div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${snaproadScore / 10}%`, background: '#007AFF', borderRadius: 2 }} />
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>
              {Math.max(0, 1000 - snaproadScore)} points to perfect score
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowWeeklyInsights(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            width: '100%',
            padding: '14px 16px',
            background: 'rgba(124,58,237,0.1)',
            border: '1px solid rgba(124,58,237,0.2)',
            borderRadius: 14,
            cursor: 'pointer',
            marginTop: 12,
          }}
        >
          <span style={{ fontSize: 24 }}>📊</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>Weekly Recap</div>
            <div style={{ color: 'rgba(124,58,237,0.8)', fontSize: 12 }}>
              AI-powered driving insights by Orion
            </div>
          </div>
          <div style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.3)', fontSize: 18 }}>›</div>
        </button>
      </div>

      {/* Tabs - theme from Appearance */}
      <div className={`${profileTabBg} px-4 py-2 flex border-b sticky top-0 z-10 ${isLight ? 'shadow-sm' : 'backdrop-blur-sm'}`}>
        {(['overview', 'score', 'fuel', 'settings'] as const).map(tab => (
          <button key={tab} onClick={() => setProfileTab(tab)} data-testid={`profile-tab-${tab}`}
            className={`flex-1 py-2.5 text-xs font-medium capitalize transition-colors border-b-2 ${profileTab === tab ? profileTabActive : `${profileTabInactive} border-transparent ${isLight ? 'hover:text-slate-700' : 'hover:text-white'}`}`}>
            {tab}
          </button>
        ))}
      </div>

      {profileTab === 'overview' && (
        <div className="p-4 space-y-3">
          {/* Level/XP Card - theme-aware */}
          <button 
            onClick={() => setShowLevelProgress(true)}
            className={`w-full rounded-xl p-4 flex items-center gap-4 shadow-lg border transition-colors ${isLight ? 'bg-gradient-to-r from-blue-500 to-indigo-500 border-slate-200 hover:border-slate-300' : 'bg-gradient-to-r from-indigo-600/90 to-purple-600/90 border-white/10 hover:border-white/20'}`}
            data-testid="profile-level"
          >
            <div className={`w-14 h-14 rounded-full flex flex-col items-center justify-center border ${isLight ? 'bg-white/20 border-white/30' : 'bg-white/10 border-white/10'}`}>
              <span className={isLight ? 'text-white/90 text-xs font-medium' : 'text-white/80 text-xs font-medium'}>LVL</span>
              <span className="text-white text-xl font-bold">{userData.level}</span>
            </div>
            <div className="flex-1 text-left">
              <p className="text-white font-semibold">Level {userData.level}</p>
              <p className={isLight ? 'text-blue-100 text-xs' : 'text-slate-300 text-xs'}>
                {userData.xp?.toLocaleString() || 0} XP total
              </p>
            </div>
            <div className="text-right">
              <span className={isLight ? 'text-blue-100 text-xs' : 'text-amber-300 text-xs'}>View Progress →</span>
            </div>
          </button>

          {/* Driving Score Card - theme-aware */}
          <button 
            onClick={() => setShowDrivingScore(true)}
            className={`w-full rounded-xl p-4 flex items-center gap-4 border transition-colors ${
              userPlan === 'premium' 
                ? isLight ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100' : 'bg-gradient-to-r from-emerald-600/30 to-teal-600/30 border-white/10 hover:from-emerald-600/40 hover:to-teal-600/40'
                : isLight ? 'bg-slate-100 border-slate-200 hover:bg-slate-200' : 'bg-slate-800/80 border-white/10 hover:bg-slate-800'
            }`}
            data-testid="profile-driving-score"
          >
            <div className={`w-14 h-14 rounded-full flex flex-col items-center justify-center border ${
              userPlan === 'premium' ? (isLight ? 'bg-emerald-500/20 border-emerald-300' : 'bg-emerald-500/20 border-white/10') : (isLight ? 'bg-amber-500/20 border-amber-300' : 'bg-amber-500/20 border-white/10')
            }`}>
              <Shield className={isLight ? 'text-emerald-700' : 'text-white'} size={24} />
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <p className={isLight ? 'text-slate-900 font-semibold' : 'text-white font-semibold'}>Driving Score</p>
                {userPlan !== 'premium' && (
                  <span className={isLight ? 'bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-300' : 'bg-amber-500/30 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/50'}>
                    PREMIUM
                  </span>
                )}
              </div>
              <p className={`text-xs ${userPlan === 'premium' ? (isLight ? 'text-emerald-700' : 'text-emerald-300') : profileTextMuted}`}>
                {userPlan === 'premium' ? 'View detailed insights & Orion tips' : 'Unlock with Premium'}
              </p>
            </div>
            <div className="text-right">
              <span className={`text-xs ${userPlan === 'premium' ? (isLight ? 'text-emerald-600' : 'text-emerald-300') : (isLight ? 'text-amber-600' : 'text-amber-400')}`}>
                {userPlan === 'premium' ? 'View →' : 'Upgrade →'}
              </span>
            </div>
          </button>

          {/* Weekly Recap Card - theme-aware */}
          <button 
            onClick={() => setShowWeeklyRecap(true)}
            className={`w-full rounded-xl p-4 flex items-center gap-4 border transition-colors ${
              userPlan === 'premium' 
                ? isLight ? 'bg-purple-50 border-purple-200 hover:bg-purple-100' : 'bg-gradient-to-r from-purple-600/30 to-pink-600/30 border-white/10 hover:from-purple-600/40 hover:to-pink-600/40'
                : isLight ? 'bg-slate-100 border-slate-200 hover:bg-slate-200' : 'bg-slate-800/80 border-white/10 hover:bg-slate-800'
            }`}
            data-testid="profile-weekly-recap"
          >
            <div className={`w-14 h-14 rounded-full flex flex-col items-center justify-center border ${
              userPlan === 'premium' ? (isLight ? 'bg-purple-500/20 border-purple-300' : 'bg-purple-500/20 border-white/10') : (isLight ? 'bg-amber-500/20 border-amber-300' : 'bg-amber-500/20 border-white/10')
            }`}>
              <Trophy className={isLight ? 'text-purple-600' : 'text-yellow-300'} size={24} />
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <p className={isLight ? 'text-slate-900 font-semibold' : 'text-white font-semibold'}>Weekly Recap</p>
                {userPlan !== 'premium' && (
                  <span className={isLight ? 'bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-300' : 'bg-amber-500/30 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/50'}>
                    PREMIUM
                  </span>
                )}
              </div>
              <p className={`text-xs ${userPlan === 'premium' ? (isLight ? 'text-purple-600' : 'text-purple-300') : profileTextMuted}`}>
                {userPlan === 'premium' ? 'View your week in review' : 'Unlock with Premium'}
              </p>
            </div>
            <div className="text-right">
              <span className={`text-xs ${userPlan === 'premium' ? (isLight ? 'text-purple-600' : 'text-purple-300') : (isLight ? 'text-amber-600' : 'text-amber-400')}`}>
                {userPlan === 'premium' ? 'View →' : 'Upgrade →'}
              </span>
            </div>
          </button>

          {/* My Car Card - with Coming soon, theme-aware */}
          <button 
            onClick={() => setShowCarStudio(true)}
            className={`w-full rounded-xl p-4 flex items-center gap-4 border transition-colors ${profileCardBg} ${profileCardBorder} ${profileCardHover}`}
            data-testid="profile-my-car"
          >
            <div className="w-16 h-12 flex items-center justify-center relative">
              <ProfileCar 
                category={userCar.category as any}
                color={userCar.color as any}
                size={64}
              />
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <p className={`font-semibold ${profileText}`}>My Car</p>
                <span className={isLight ? 'bg-amber-100 text-amber-800 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-amber-300' : 'bg-amber-500/20 text-amber-300 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-amber-500/40'}>
                  Coming soon
                </span>
              </div>
              <p className={`text-xs ${profileTextMuted}`}>
                {CAR_COLORS[userCar.color as keyof typeof CAR_COLORS]?.name || 'Custom'} {userCar.category}
              </p>
            </div>
            <div className="text-right">
              <span className={isLight ? 'text-amber-600 text-xs' : 'text-amber-400 text-xs'}>Customize →</span>
            </div>
          </button>

          {/* Share My Location - Premium only */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              if (!userData.is_premium) {
                setShowPlanSelection(true)
                toast('Upgrade to Premium to share location with friends')
                return
              }
              const newVal = !isSharingLocation
              setIsSharingLocation(newVal)
              if (!newVal && (user as { id?: string } | undefined)?.id) {
                stopSharingLocation((user as { id: string }).id)
                toast.success('Location sharing paused')
              } else {
                toast.success('Location sharing resumed')
              }
            }}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLElement).click()}
            className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors ${profileCardBg} ${profileCardBorder} ${profileCardHover}`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${isLight ? 'bg-emerald-100 border-emerald-200' : 'bg-emerald-500/20 border-emerald-500/30'}`}>
                <MapPin className={isLight ? 'text-emerald-600' : 'text-emerald-400'} size={18} />
              </div>
              <div>
                <p className={`font-semibold text-sm ${profileText}`}>Share My Location</p>
                <p className={`text-xs ${profileTextMuted}`}>
                  {!userData.is_premium ? 'Premium — track friends on the map' : isSharingLocation ? 'Friends can see you on the map' : 'Your location is hidden from friends'}
                </p>
              </div>
            </div>
            {userData.is_premium ? (
              <div className={`w-12 h-7 rounded-full transition-colors flex items-center px-1 ${isSharingLocation ? 'bg-emerald-500 justify-end' : isLight ? 'bg-slate-300 justify-start' : 'bg-slate-600 justify-start'}`}>
                <div className="w-5 h-5 rounded-full bg-white shadow-md" />
              </div>
            ) : (
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${isLight ? 'bg-amber-100 text-amber-700' : 'bg-amber-500/30 text-amber-300'}`}>PREMIUM</span>
            )}
          </div>

          {/* Dashboard list - theme-aware */}
          {[
            { icon: Trophy, label: 'Achievements', value: `${(Array.isArray(badges) ? badges : []).filter((b: Record<string, unknown>) => b.earned).length}/160 badges`, action: () => setShowBadgesGrid(true), color: isLight ? 'bg-amber-100 border-amber-200' : 'bg-amber-500/20 border-amber-500/30', iconColor: isLight ? 'text-amber-600' : 'text-amber-400' },
            { icon: AlertTriangle, label: 'Incidents', value: 'Report & verify', action: () => setShowQuickPhotoReport(true), color: isLight ? 'bg-orange-100 border-orange-200' : 'bg-orange-500/20 border-orange-500/30', iconColor: isLight ? 'text-orange-600' : 'text-orange-400' },
            { icon: Users, label: 'Dashboards', value: 'Friends · Family', action: () => setActiveTab('dashboards'), color: isLight ? 'bg-emerald-100 border-emerald-200' : 'bg-emerald-500/20 border-emerald-500/30', iconColor: isLight ? 'text-emerald-600' : 'text-emerald-400' },
            { icon: History, label: 'Trip History', value: `${userData.total_trips} trips`, action: () => setShowTripHistory(true), color: isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-500/20 border-slate-500/30', iconColor: isLight ? 'text-slate-600' : 'text-slate-300' },
            { icon: Gem, label: 'Gem History', value: 'View transactions', action: () => setShowGemHistory(true), color: isLight ? 'bg-cyan-100 border-cyan-200' : 'bg-cyan-500/20 border-cyan-500/30', iconColor: isLight ? 'text-cyan-600' : 'text-cyan-400' },
            { icon: Users, label: 'Friends', value: `${userData.friends_count || 0} friends`, action: () => setShowFriendsHub(true), color: isLight ? 'bg-emerald-100 border-emerald-200' : 'bg-emerald-500/20 border-emerald-500/30', iconColor: isLight ? 'text-emerald-600' : 'text-emerald-400' },
          ].map((item, i) => (
            <button key={i} onClick={item.action} data-testid={`profile-${item.label.toLowerCase().replace(' ', '-')}`}
              className={`w-full rounded-xl p-4 flex items-center gap-3 border transition-all text-left ${profileCardBg} ${profileCardBorder} ${profileCardHover}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${item.color}`}>
                <item.icon className={item.iconColor} size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${profileText}`}>{item.label}</p>
                <p className={`text-xs truncate ${profileTextMuted}`}>{item.value}</p>
              </div>
              <ChevronRight className={isLight ? 'text-slate-400' : 'text-slate-500'} size={16} />
            </button>
          ))}
          
          {/* Share Trip Score - theme-aware CTA */}
          <button 
            onClick={handleShareTripClick}
            data-testid="share-trip-score-btn"
            className={`w-full rounded-xl p-4 flex items-center gap-3 shadow-lg border transition-all mt-2 ${isLight ? 'bg-gradient-to-r from-blue-500 to-indigo-500 border-blue-200 hover:from-blue-600 hover:to-indigo-600' : 'bg-gradient-to-r from-blue-600 to-indigo-600 border-blue-500/30 hover:shadow-blue-500/20'}`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${isLight ? 'bg-white/30 border-white/40' : 'bg-white/20 border-white/20'}`}>
              <Share2 className="text-white" size={18} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-white">Share Trip Score</p>
              <p className="text-xs text-blue-100">Show off your safe driving!</p>
            </div>
            <ChevronRight className="text-white/80" size={16} />
          </button>
        </div>
      )}

      {profileTab === 'score' && (
        <div className="p-4">
          <div className={`rounded-xl p-6 border shadow-xl ${profileCardBg} ${profileCardBorder}`}>
            <div className="flex justify-center mb-6">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full -rotate-90">
                  <circle cx="64" cy="64" r="56" stroke="#334155" strokeWidth="10" fill="none" />
                  <circle cx="64" cy="64" r="56" 
                    stroke={(userData.safety_score ?? 0) >= 90 ? '#22c55e' : (userData.safety_score ?? 0) >= 70 ? '#eab308' : '#ef4444'}
                    strokeWidth="10" fill="none" strokeDasharray={`${((userData.safety_score ?? 0) / 100) * 352} 352`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-4xl font-bold ${profileText}`}>{userData.safety_score ?? 0}</span>
                  <span className={`text-xs ${profileTextMuted}`}>Safety Score</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {[
                { label: 'Speed', score: 92 },
                { label: 'Braking', score: 85 },
                { label: 'Acceleration', score: 88 },
                { label: 'Phone Use', score: 78 },
              ].map((cat, i) => (
                <div key={i}>
                  <div className="flex justify-between mb-1">
                    <span className={`text-sm ${profileTextMuted}`}>{cat.label}</span>
                    <span className={`text-sm font-medium ${profileText}`}>{cat.score}</span>
                  </div>
                  <div className={`w-full rounded-full h-2 ${isLight ? 'bg-slate-200' : 'bg-slate-700'}`}>
                    <div className={`h-2 rounded-full ${cat.score >= 90 ? 'bg-emerald-500' : cat.score >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${cat.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {profileTab === 'fuel' && (
        <div className="p-4">
          {userData.is_premium ? (
            <div className={`rounded-xl p-6 border shadow-xl ${profileCardBg} ${profileCardBorder}`}>
              <h3 className={`text-sm font-semibold mb-4 ${profileText}`}>This Week</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className={`text-2xl font-bold ${profileText}`}>12.4</p>
                  <p className={`text-xs ${profileTextMuted}`}>Gallons</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-500">$43.20</p>
                  <p className={`text-xs ${profileTextMuted}`}>Spent</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-500">28.4</p>
                  <p className={`text-xs ${profileTextMuted}`}>MPG</p>
                </div>
              </div>
            </div>
          ) : (
            <div className={`rounded-xl p-6 text-center border ${profileCardBg} ${profileCardBorder}`}>
              <Lock className={`mx-auto mb-3 ${profileTextMuted}`} size={40} />
              <h3 className={`text-lg font-bold ${profileText}`}>Premium Feature</h3>
              <p className={`text-sm mt-1 ${profileTextMuted}`}>Upgrade to track fuel usage</p>
              <button data-testid="upgrade-btn" onClick={() => toast('Upgrading...')}
                className="mt-4 bg-amber-500 hover:bg-amber-400 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">
                Upgrade Now
              </button>
            </div>
          )}
        </div>
      )}

      {profileTab === 'settings' && (
        <div className="p-4 space-y-3">
          {/* Appearance - theme card (controls global theme) */}
          <button
            onClick={toggleTheme}
            data-testid="appearance-toggle"
            className={`w-full rounded-xl p-4 flex items-center gap-3 border transition-colors text-left ${profileCardBg} ${profileCardBorder} ${profileCardHover}`}
          >
            {isLight ? <Sun className="text-amber-500" size={20} /> : <Moon className="text-indigo-400" size={20} />}
            <div className="flex-1">
              <p className={`text-sm font-medium ${profileText}`}>Appearance</p>
              <p className={`text-xs ${profileTextMuted}`}>{isLight ? 'Light mode' : 'Dark mode'} — tap to switch</p>
            </div>
            <ChevronRight className={profileTextMuted} size={16} />
          </button>
          {/* Plan Management Card */}
          <div className={`rounded-xl p-4 border ${profileCardBg} ${profileCardBorder}`}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className={`font-semibold text-sm ${profileText}`}>Your Plan</p>
                <div className="flex items-center gap-2 mt-1">
                  {userData.is_premium ? (
                    <span className={isLight ? 'text-xs bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-1' : 'text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1'}>
                      <Zap size={10} /> PREMIUM
                    </span>
                  ) : (
                    <span className={isLight ? 'text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-medium' : 'text-xs bg-slate-600/80 text-slate-300 px-2 py-0.5 rounded-full font-medium'}>
                      BASIC
                    </span>
                  )}
                  <span className={`text-xs ${profileTextMuted}`}>
                    {userData.is_premium ? '2× gems' : '1× gems'}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setShowPlanSelection(true)}
                data-testid="change-plan-btn"
                className="bg-amber-500 hover:bg-amber-400 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              >
                {userData.is_premium ? 'Manage' : 'Upgrade'}
              </button>
            </div>
          </div>
          
          <div className={`rounded-xl p-4 border ${profileCardBg} ${profileCardBorder}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`font-semibold text-sm ${profileText}`}>Vehicle clearance</p>
                <p className={`text-xs mt-1 ${profileTextMuted}`}>Use height-aware routes for trucks and tall vehicles</p>
              </div>
              <button
                type="button"
                onClick={() => setIsTallVehicle((v) => !v)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${isTallVehicle ? 'bg-blue-500 text-white border-blue-500' : `${profileCardBg} ${profileCardBorder} ${profileTextMuted}`}`}
              >
                {isTallVehicle ? 'ON' : 'OFF'}
              </button>
            </div>
            <label className="mt-3 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isTallVehicle}
                onChange={(e) => setIsTallVehicle(e.target.checked)}
              />
              <span className={`text-sm ${profileText}`}>I drive a tall vehicle (box truck, trailer, RV)</span>
            </label>

            {isTallVehicle && (
              <div className="mt-3 space-y-2">
                <select
                  value={vehicleHeightPreset}
                  onChange={(e) => setVehicleHeightPreset(e.target.value as '2.7' | '3.0' | '3.5' | '4.0' | '4.1' | 'custom')}
                  className={`w-full rounded-lg px-3 py-2 text-sm border ${isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-700 text-slate-100'}`}
                >
                  <option value="2.7">Cargo van (2.7m / 8'10")</option>
                  <option value="3.0">Sprinter / high-roof van (3.0m / 9'10")</option>
                  <option value="3.5">Box truck 16ft (3.5m / 11'6")</option>
                  <option value="4.0">Box truck 26ft (4.0m / 13'1")</option>
                  <option value="4.1">Semi trailer (4.1m / 13'6")</option>
                  <option value="custom">Custom...</option>
                </select>
                {vehicleHeightPreset === 'custom' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={vehicleHeightCustom}
                      onChange={(e) => setVehicleHeightCustom(e.target.value)}
                      className={`flex-1 rounded-lg px-3 py-2 text-sm border ${isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-700 text-slate-100'}`}
                      placeholder="Height in meters"
                    />
                    <span className={`text-xs ${profileTextMuted}`}>{Number(vehicleHeightCustom) > 0 ? metersToFeetInches(Number(vehicleHeightCustom)) : '--'}</span>
                  </div>
                )}
              </div>
            )}

            <div className="mt-3 flex items-center justify-between">
              <p className={`text-xs ${profileTextMuted}`}>
                {isTallVehicle
                  ? `Saved height: ${vehicleHeightPreset === 'custom' ? `${Number(vehicleHeightCustom || 0).toFixed(1)}m / ${metersToFeetInches(Number(vehicleHeightCustom || 0))}` : `${vehicleHeightPreset}m / ${metersToFeetInches(Number(vehicleHeightPreset))}`}`
                  : 'No vehicle height set'}
              </p>
              <button
                type="button"
                onClick={saveVehicleHeight}
                disabled={isSavingVehicleHeight}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              >
                {isSavingVehicleHeight ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowSubmitConcern(true)}
            className={`w-full rounded-xl p-4 flex items-center gap-3 border transition-colors text-left ${profileCardBg} ${profileCardBorder} ${profileCardHover}`}
          >
            <span className="text-xl" aria-hidden>🚨</span>
            <div className="flex-1">
              <p className={`text-sm font-medium ${profileText}`}>Report an Issue</p>
              <p className={`text-xs ${profileTextMuted}`}>Bugs, wrong routes, account issues</p>
            </div>
            <ChevronRight className={profileTextMuted} size={16} />
          </button>
          {[
            { icon: Bell, label: 'Notifications', id: 'notifications', desc: 'Manage alerts', action: () => setShowNotificationSettings(true) },
            { icon: Volume2, label: 'Voice Settings', id: 'voice', desc: isMuted ? 'Muted' : 'Active', action: handleToggleVoice },
            { icon: Fuel, label: 'Fuel Tracker', id: 'fuel', desc: 'Log fill-ups', action: () => setShowFuelTracker(true) },
            { icon: HelpCircle, label: 'Help & Support', id: 'help', desc: 'Get assistance', action: () => setShowHelpSupport(true) },
          ].map((item, i) => (
            <button key={i} onClick={item.action} data-testid={`settings-${item.id}`}
              className={`w-full rounded-xl p-4 flex items-center gap-3 border transition-colors text-left ${profileCardBg} ${profileCardBorder} ${profileCardHover}`}>
              <item.icon className={profileTextMuted} size={20} />
              <div className="flex-1">
                <p className={`text-sm font-medium ${profileText}`}>{item.label}</p>
                <p className={`text-xs ${profileTextMuted}`}>{item.desc}</p>
              </div>
              <ChevronRight className={profileTextMuted} size={16} />
            </button>
          ))}
        </div>
      )}
    </div>
  )

  // ==================== MODALS ====================

  // Search Modal - Baidu Maps–style: light theme, aligned colors, advanced list UI
  const renderSearchModal = () => showSearch && (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1100,
        background: '#f5f6f8',
        overflowY: 'auto',
        paddingTop: 'env(safe-area-inset-top, 44px)',
      }}
      onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]) }}
    >
      <div className="w-[95%] max-w-md mx-auto p-4 animate-scale-in" onClick={e => e.stopPropagation()}>
        {/* Search Input - Baidu-style light bar */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            background: '#f5f6f8',
            padding: '10px 0 14px',
            borderBottom: '1px solid #e8eaed',
          }}
          className="flex items-center gap-3 rounded-xl mb-4"
        >
          <div className="flex-1 flex items-center gap-2 bg-white rounded-lg border border-slate-200 px-3 py-2.5 shadow-sm">
            <Search className="text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search destination..."
              autoFocus
              value={searchQuery}
              onChange={e => handleSearchChange(e.target.value)}
              data-testid="search-modal-input"
              className="flex-1 bg-transparent text-slate-800 text-sm outline-none placeholder:text-slate-400"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setSearchResults([]) }} className="p-0.5 rounded-full hover:bg-slate-100">
                <X className="text-slate-500" size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Loading Indicator */}
        {isSearching && (
          <div className="flex items-center justify-center py-6">
            <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            <span className="text-slate-500 text-sm ml-2">Searching...</span>
          </div>
        )}

        {/* Search Results - premium place cards with images */}
        {!isSearching && searchResults.length > 0 && (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto mb-3">
            <p className="text-slate-600 text-sm font-semibold mb-1 px-0.5">Results</p>
            {searchResults.map((result, idx) => (
              <div key={result.id ?? `result-${idx}-${result.name}`} data-testid={`search-result-${result.id ?? idx}`}>
                <PlaceCard
                  place={{
                    place_id: result.place_id,
                    name: result.name,
                    address: result.address,
                    lat: result.lat,
                    lng: result.lng,
                    photo_reference: (result.place_id && searchResultPhotos[result.place_id]) || undefined,
                  }}
                  compact
                  onClick={() => {
                    if (result.place_id) {
                      setSelectedPlaceId(result.place_id)
                      setSelectedPlace({ name: result.name, lat: result.lat || 0, lng: result.lng || 0 })
                      setShowSearch(false)
                      if ((!Number.isFinite(result.lat) || !Number.isFinite(result.lng) || (result.lat === 0 && result.lng === 0)) && result.place_id) {
                        api.get<{ success?: boolean; data?: { lat?: number; lng?: number; name?: string; address?: string } }>(`/api/places/details/${encodeURIComponent(result.place_id)}`)
                          .then((detailsRes) => {
                            const body = detailsRes?.data as { success?: boolean; data?: { lat?: number; lng?: number; name?: string } } | undefined
                            const d = body?.data
                            if (detailsRes?.success && body?.success && d && Number.isFinite(d.lat) && Number.isFinite(d.lng)) {
                              setSelectedPlace((prev) => prev ? { name: d.name ?? result.name, lat: d.lat!, lng: d.lng! } : null)
                            }
                          })
                          .catch(() => {})
                      }
                    } else {
                      handleSelectDestination(result)
                    }
                  }}
                />
                {result.distance_km != null && (
                  <p className="text-slate-400 text-xs mt-1 px-1">{result.distance_km} km away</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Quick Places — from address book (Home, Work, saved favorites) */}
        {!searchQuery && (
          <>
            <p className="text-slate-500 text-xs font-medium mb-2 px-1">Quick Places</p>
            <div className="space-y-1.5">
              {[
                ...(getHomeLocation() ? [{ label: 'Home', loc: getHomeLocation()!, icon: Home, iconColor: 'text-blue-500' }] : [{ label: 'Home', sub: 'Set location', icon: Home, iconColor: 'text-blue-500' }]),
                ...(getWorkLocation() ? [{ label: 'Work', loc: getWorkLocation()!, icon: Briefcase, iconColor: 'text-emerald-500' }] : [{ label: 'Work', sub: 'Set location', icon: Briefcase, iconColor: 'text-emerald-500' }]),
                ...getFavoriteLocations().slice(0, 4).map((l) => ({ label: l.name, loc: l, icon: MapPin, iconColor: 'text-slate-500' })),
              ].map((item, i) => (
                <button
                  key={`${item.label}-${i}`}
                  onClick={() => {
                    if ('loc' in item && item.loc) {
                      handleNavigateToSavedLocation(item.loc)
                    } else {
                      setNewLocation({ ...newLocation, category: item.label === 'Home' ? 'home' : 'work' })
                      setShowAddLocation(true)
                    }
                  }}
                  data-testid={item.label === 'Home' ? 'search-home' : item.label === 'Work' ? 'search-work' : `search-fav-${i}`}
                  className="w-full p-3 bg-white rounded-xl text-left hover:bg-slate-50 active:bg-slate-100 flex items-center gap-3 transition-colors border border-slate-100 shadow-sm"
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-slate-50">
                    <item.icon className={item.iconColor} size={16} />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <span className="text-slate-800 text-sm font-medium block truncate">{item.label}</span>
                    {'sub' in item && item.sub && (
                      <span className="text-slate-500 text-xs block truncate">{item.sub}</span>
                    )}
                    {'loc' in item && item.loc?.address && (
                      <span className="text-slate-500 text-xs block truncate">{item.loc.address}</span>
                    )}
                  </div>
                </button>
              ))}
              <button onClick={() => { setNewLocation({ ...newLocation, category: 'favorite' }); setShowAddLocation(true) }} data-testid="search-more"
                className="w-full p-3 bg-white rounded-xl text-left hover:bg-slate-50 active:bg-slate-100 flex items-center gap-3 transition-colors border border-slate-100 shadow-sm border-dashed">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-slate-50">
                  <Plus className="text-slate-400" size={16} />
                </div>
                <span className="text-slate-600 text-sm font-medium">Add place</span>
              </button>
            </div>
          </>
        )}

        {/* No Results */}
        {!isSearching && searchQuery && searchResults.length === 0 && (
          <div className="text-center py-8 bg-white rounded-xl border border-slate-100">
            <p className="text-slate-600 text-sm">No locations found</p>
            <p className="text-slate-400 text-xs mt-1">Try a different search term</p>
          </div>
        )}
      </div>
    </div>
  )

  // Notifications Modal
  const renderNotificationsModal = () => showNotifications && (
    <div className="fixed inset-0 bg-black/80 z-[1100] flex items-start justify-center pt-20" onClick={() => setShowNotifications(false)}>
      <div className="w-80 bg-slate-900 rounded-2xl p-4 animate-scale-in" onClick={e => e.stopPropagation()}>
        <h3 className="text-white font-semibold mb-3">Notifications</h3>
        <div className="space-y-2">
          {[
            { title: 'New offer nearby!', desc: 'Shell Gas - 10¢/gal off', time: '2m ago' },
            { title: 'Safety score up!', desc: 'You reached 87 points', time: '1h ago' },
            { title: 'Badge earned', desc: 'Night Owl unlocked!', time: '2h ago' },
          ].map((n, i) => (
            <div key={i} className="p-3 bg-slate-800 rounded-xl">
              <p className="text-white text-sm font-medium">{n.title}</p>
              <p className="text-slate-400 text-xs">{n.desc}</p>
              <p className="text-slate-500 text-[10px] mt-1">{n.time}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  // Add Location Modal (with Places autocomplete)
  const [addrSuggestions, setAddrSuggestions] = useState<{ place_id: string; name: string; address: string }[]>([])
  const addrDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const searchAddressForModal = useCallback(async (q: string) => {
    if (q.length < 2) { setAddrSuggestions([]); return }
    try {
      const locParams = userLocation ? `&lat=${userLocation.lat}&lng=${userLocation.lng}` : ''
      const res = await api.get<{ success?: boolean; data?: { place_id?: string; name?: string; address?: string; description?: string }[] }>(
        `/api/places/autocomplete?q=${encodeURIComponent(q)}${locParams}`
      )
      if (res.data?.success && Array.isArray(res.data.data)) {
        setAddrSuggestions(res.data.data.map((p) => ({
          place_id: p.place_id || '',
          name: p.name || '',
          address: p.address || p.description || '',
        })))
        return
      }
    } catch { /* degrade gracefully */ }
    setAddrSuggestions([])
  }, [userLocation])

  const handleAddrInput = useCallback((val: string) => {
    setNewLocation((prev: typeof newLocation) => ({ ...prev, address: val }))
    if (addrDebounceRef.current) clearTimeout(addrDebounceRef.current)
    addrDebounceRef.current = setTimeout(() => searchAddressForModal(val), 300)
  }, [searchAddressForModal])

  const selectAddrSuggestion = useCallback(async (s: { place_id: string; name: string; address: string }) => {
    setNewLocation((prev: typeof newLocation) => ({ ...prev, name: prev.name || s.name, address: s.address || s.name }))
    setAddrSuggestions([])
    if (s.place_id) {
      try {
        const res = await api.get<{ success?: boolean; data?: { lat?: number; lng?: number } }>(
          `/api/places/details/${encodeURIComponent(s.place_id)}`
        )
        const data = (res.data as { success?: boolean; data?: { lat?: number; lng?: number } } | undefined)
        if (data?.success && data.data?.lat && data.data?.lng) {
          setNewLocation((prev: typeof newLocation) => ({ ...prev, lat: data.data!.lat!, lng: data.data!.lng! }))
        }
      } catch { /* noop */ }
    }
  }, [])

  const renderAddLocationModal = () => showAddLocation && (
    <div className="fixed inset-0 bg-black/80 z-[1100] flex items-center justify-center p-4" onClick={() => { setShowAddLocation(false); setAddrSuggestions([]) }}>
      <div className="w-full max-w-sm bg-slate-900 rounded-2xl p-4 animate-scale-in" onClick={e => e.stopPropagation()}>
        <h3 className="text-white font-semibold mb-4">Add Location</h3>
        <div className="space-y-3">
          <input type="text" placeholder="Location name" value={newLocation.name}
            onChange={e => setNewLocation({ ...newLocation, name: e.target.value })}
            className="w-full bg-slate-800 rounded-xl px-3 py-2 text-white text-sm outline-none" />
          <div className="relative">
            <input type="text" placeholder="Address" value={newLocation.address}
              onChange={e => handleAddrInput(e.target.value)}
              className="w-full bg-slate-800 rounded-xl px-3 py-2 text-white text-sm outline-none" />
            {addrSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-slate-800 rounded-xl overflow-hidden max-h-40 overflow-y-auto z-10 border border-slate-700 shadow-xl">
                {addrSuggestions.map((s, i) => (
                  <button key={s.place_id || i} onClick={() => selectAddrSuggestion(s)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-700 transition-colors flex items-start gap-2">
                    <MapPin size={14} className="text-blue-400 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">{s.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{s.address}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <select value={newLocation.category} onChange={e => setNewLocation({ ...newLocation, category: e.target.value })}
            className="w-full bg-slate-800 rounded-xl px-3 py-2 text-white text-sm outline-none">
            <option value="home">Home</option>
            <option value="work">Work</option>
            <option value="gym">Gym</option>
            <option value="school">School</option>
            <option value="shopping">Shopping</option>
            <option value="favorite">Favorite</option>
          </select>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={() => { setShowAddLocation(false); setAddrSuggestions([]) }} className="flex-1 bg-slate-700 text-white py-2 rounded-xl text-sm">Cancel</button>
          <button onClick={handleAddLocation} data-testid="save-location-btn" className="flex-1 bg-blue-500 text-white py-2 rounded-xl text-sm">Save</button>
        </div>
      </div>
    </div>
  )

  // Route address autocomplete — Google Places (via backend) first, then /api/map/search fallback
  const searchRouteAddress = useCallback(async (field: 'origin' | 'destination', q: string) => {
    const trimmed = q.trim()
    const setSuggestions = (arr: { name: string; address: string; lat?: number; lng?: number }[]) => {
      if (field === 'origin') setOriginSuggestions(arr)
      else setDestinationSuggestions(arr)
    }
    if (trimmed.length < 1) {
      setSuggestions([])
      return
    }
    try {
      // 1) Google Places autocomplete via backend
      try {
        const locParams = userLocation?.lat != null && userLocation?.lng != null ? `&lat=${userLocation.lat}&lng=${userLocation.lng}` : ''
        const placeRes = await api.get<{ success?: boolean; data?: Array<{ place_id?: string; name?: string; address?: string; description?: string }> }>(`/api/places/autocomplete?q=${encodeURIComponent(trimmed)}${locParams}`)
        const placeBody = placeRes?.data as { success?: boolean; data?: Array<{ name?: string; address?: string; description?: string }> } | undefined
        if (placeRes?.success && placeBody?.success && Array.isArray(placeBody.data) && placeBody.data.length > 0) {
          const arr = placeBody.data.map(p => ({ name: p.name || '', address: p.address || p.description || p.name || '' }))
          setSuggestions(arr)
          return
        }
      } catch { /* fall through to backend */ }
      // 2) Backend /api/map/search fallback
      const params = new URLSearchParams({ q: trimmed, limit: '12' })
      if (userLocation?.lat != null && userLocation?.lng != null) {
        params.set('lat', String(userLocation.lat))
        params.set('lng', String(userLocation.lng))
      }
      const res = await api.get<{ success?: boolean; data?: unknown }>(`/api/map/search?${params}`)
      const raw = (res as { data?: unknown })?.data
      const list = Array.isArray(raw) ? raw : (raw as { data?: unknown[] })?.data
      const arr = Array.isArray(list) ? list.map((x: { name?: string; address?: string; lat?: number; lng?: number }) => ({ name: x.name || '', address: x.address || x.name || '', lat: x.lat, lng: x.lng })) : []
      setSuggestions(arr)
    } catch {
      setSuggestions([])
    }
  }, [userLocation])

  const handleOriginInput = useCallback((val: string) => {
    setNewRoute(prev => ({ ...prev, origin: val }))
    if (routeAddrDebounceRef.current.origin) clearTimeout(routeAddrDebounceRef.current.origin)
    routeAddrDebounceRef.current.origin = setTimeout(() => searchRouteAddress('origin', val), 300)
  }, [searchRouteAddress])

  const handleDestinationInput = useCallback((val: string) => {
    setNewRoute(prev => ({ ...prev, destination: val }))
    if (routeAddrDebounceRef.current.destination) clearTimeout(routeAddrDebounceRef.current.destination)
    routeAddrDebounceRef.current.destination = setTimeout(() => searchRouteAddress('destination', val), 300)
  }, [searchRouteAddress])

  const selectOriginSuggestion = useCallback((s: { name: string; address: string }) => {
    setNewRoute(prev => ({ ...prev, origin: s.address || s.name }))
    setOriginSuggestions([])
  }, [])

  const selectDestinationSuggestion = useCallback((s: { name: string; address: string }) => {
    setNewRoute(prev => ({ ...prev, destination: s.address || s.name }))
    setDestinationSuggestions([])
  }, [])

  // Add Route Modal — theme-aware (white when light), with address book dropdowns
  const routeModalBg = isLight ? 'bg-white' : 'bg-slate-900'
  const routeModalInputBg = isLight ? 'bg-slate-100' : 'bg-slate-800'
  const routeModalText = isLight ? 'text-slate-900' : 'text-white'
  const routeModalMuted = isLight ? 'text-slate-500' : 'text-slate-400'
  const routeModalDropdownBg = isLight ? 'bg-white border-slate-200 shadow-lg' : 'bg-slate-800 border-slate-700'
  const routeModalDropdownItem = isLight ? 'hover:bg-slate-100' : 'hover:bg-slate-700'
  const routeModalDropdownText = isLight ? 'text-slate-900' : 'text-white'
  const routeModalDropdownSub = isLight ? 'text-slate-500' : 'text-slate-400'

  const renderAddRouteModal = () => showAddRoute && (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/50" onClick={() => { setShowAddRoute(false); setOriginSuggestions([]); setDestinationSuggestions([]) }}>
      <div className={`w-full max-w-sm rounded-2xl p-4 animate-scale-in shadow-xl ${routeModalBg}`} onClick={e => e.stopPropagation()}>
        <h3 className={`font-semibold mb-1 ${routeModalText}`}>Add Route</h3>
        <p className={`text-xs mb-4 ${routeModalMuted}`}>Origin & destination use the address book — type to see suggestions.</p>
        <div className="space-y-3">
          <input type="text" placeholder="Route name" value={newRoute.name}
            onChange={e => setNewRoute({ ...newRoute, name: e.target.value })}
            className={`w-full rounded-xl px-3 py-2 text-sm outline-none border ${routeModalInputBg} ${routeModalText} ${isLight ? 'border-slate-200' : 'border-slate-700'}`} />
          <div className="relative">
            <label className={`block text-xs font-medium mb-1 ${routeModalMuted}`}>Origin — type to search</label>
            <input type="text" placeholder="e.g. Columbus, High St..." value={newRoute.origin}
              onChange={e => handleOriginInput(e.target.value)}
              className={`w-full rounded-xl px-3 py-2 text-sm outline-none border ${routeModalInputBg} ${routeModalText} ${isLight ? 'border-slate-200' : 'border-slate-700'}`} />
            {originSuggestions.length > 0 && (
              <div className={`absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden max-h-48 overflow-y-auto z-30 border ${routeModalDropdownBg}`}>
                {originSuggestions.map((s, i) => (
                  <button key={i} type="button" onClick={() => selectOriginSuggestion(s)}
                    className={`w-full text-left px-3 py-2.5 flex items-start gap-2 ${routeModalDropdownItem}`}>
                    <MapPin size={14} className="text-blue-500 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${routeModalDropdownText}`}>{s.name}</p>
                      <p className={`text-[10px] truncate ${routeModalDropdownSub}`}>{s.address}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <label className={`block text-xs font-medium mb-1 ${routeModalMuted}`}>Destination — type to search</label>
            <input type="text" placeholder="e.g. Easton, Airport..." value={newRoute.destination}
              onChange={e => handleDestinationInput(e.target.value)}
              className={`w-full rounded-xl px-3 py-2 text-sm outline-none border ${routeModalInputBg} ${routeModalText} ${isLight ? 'border-slate-200' : 'border-slate-700'}`} />
            {destinationSuggestions.length > 0 && (
              <div className={`absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden max-h-48 overflow-y-auto z-30 border ${routeModalDropdownBg}`}>
                {destinationSuggestions.map((s, i) => (
                  <button key={i} type="button" onClick={() => selectDestinationSuggestion(s)}
                    className={`w-full text-left px-3 py-2.5 flex items-start gap-2 ${routeModalDropdownItem}`}>
                    <MapPin size={14} className="text-blue-500 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${routeModalDropdownText}`}>{s.name}</p>
                      <p className={`text-[10px] truncate ${routeModalDropdownSub}`}>{s.address}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1 ${routeModalMuted}`}>Departure time</label>
            <input type="time" value={newRoute.departure_time}
              onChange={e => setNewRoute({ ...newRoute, departure_time: e.target.value })}
              className={`w-full rounded-xl px-3 py-2 text-sm outline-none border ${routeModalInputBg} ${routeModalText} ${isLight ? 'border-slate-200' : 'border-slate-700'}`} />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={() => { setShowAddRoute(false); setOriginSuggestions([]); setDestinationSuggestions([]) }} className={`flex-1 py-2 rounded-xl text-sm ${isLight ? 'bg-slate-200 text-slate-800' : 'bg-slate-700 text-white'}`}>Cancel</button>
          <button onClick={handleAddRoute} data-testid="save-route-btn" className="flex-1 bg-blue-500 text-white py-2 rounded-xl text-sm">Save</button>
        </div>
      </div>
    </div>
  )

  // Offer Detail Modal
  const renderOfferDetailModal = () => showOfferDetail && (
    <div className="fixed inset-0 bg-black/80 z-[1100] flex items-end justify-center" onClick={() => setShowOfferDetail(null)}>
      <div className="w-full max-w-md bg-white rounded-t-3xl p-4 animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-4" />
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${showOfferDetail.type === 'gas' ? 'bg-blue-500' : 'bg-orange-500'}`}>
            {showOfferDetail.type === 'gas' ? <Fuel className="text-white" size={24} /> : <Coffee className="text-white" size={24} />}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-900">{showOfferDetail.name}</h3>
            <p className="text-emerald-600 font-medium">{showOfferDetail.discount}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-slate-100 rounded-xl p-2 text-center">
            <p className="text-sm font-bold text-slate-900">{showOfferDetail.distance}</p>
            <p className="text-[10px] text-slate-500">Distance</p>
          </div>
          <div className="bg-slate-100 rounded-xl p-2 text-center">
            <p className="text-sm font-bold text-slate-900">⭐ {showOfferDetail.rating}</p>
            <p className="text-[10px] text-slate-500">Rating</p>
          </div>
          <div className="bg-slate-100 rounded-xl p-2 text-center">
            <p className="text-sm font-bold text-slate-900">{showOfferDetail.expires}</p>
            <p className="text-[10px] text-slate-500">Expires</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { handleStartNavigation(showOfferDetail.name); setShowOfferDetail(null) }} data-testid="navigate-to-offer"
            className="flex-1 bg-slate-100 text-slate-900 py-3 rounded-xl font-medium flex items-center justify-center gap-2">
            <Navigation size={16} /> Navigate
          </button>
          <button onClick={() => handleRedeemOffer(showOfferDetail.id)} data-testid="redeem-offer-btn"
            className="flex-1 bg-emerald-500 text-white py-3 rounded-xl font-medium">
            Redeem for {showOfferDetail.gems}💎
          </button>
        </div>
      </div>
    </div>
  )

  // Report Modal
  const renderReportModal = () => showReportModal && (
    <div className="fixed inset-0 bg-black/80 z-[1100] flex items-end justify-center" onClick={() => setShowReportModal(false)}>
      <div className="w-full max-w-md bg-white rounded-t-3xl p-4 animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-900 mb-4">Report Hazard</h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            { type: 'pothole', icon: '🕳️', gems: 15 },
            { type: 'accident', icon: '🚗', gems: 50 },
            { type: 'construction', icon: '🚧', gems: 10 },
            { type: 'hazard', icon: '⚠️', gems: 25 },
          ].map(r => (
            <button key={r.type} onClick={() => handleReportIncident(r.type, r.gems)} data-testid={`report-${r.type}`}
              className="bg-slate-100 rounded-xl p-4 text-center hover:bg-slate-200">
              <span className="text-2xl">{r.icon}</span>
              <p className="text-sm font-medium text-slate-900 capitalize mt-1">{r.type}</p>
              <p className="text-xs text-emerald-500">+{r.gems}💎</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  // Family Member Modal
  const renderFamilyMemberModal = () => showFamilyMember && (
    <div className="fixed inset-0 bg-black/80 z-[1100] flex items-center justify-center p-4" onClick={() => setShowFamilyMember(null)}>
      <div className="w-full max-w-sm bg-white rounded-2xl p-4 animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-4">
          <div className="w-16 h-16 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-2xl mx-auto mb-2">
            {showFamilyMember.name[0]}
          </div>
          <h3 className="text-lg font-bold text-slate-900">{showFamilyMember.name}</h3>
          <p className="text-sm text-slate-500">{showFamilyMember.location}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-slate-100 rounded-xl p-3 text-center">
            <Battery size={16} className={`mx-auto ${(showFamilyMember.battery ?? 100) < 30 ? 'text-red-500' : 'text-emerald-500'}`} />
            <p className="text-sm font-bold text-slate-900 mt-1">{showFamilyMember.battery ?? '—'}%</p>
          </div>
          <div className="bg-slate-100 rounded-xl p-3 text-center">
            <MapPin size={16} className="mx-auto text-blue-500" />
            <p className="text-sm font-bold text-slate-900 mt-1">{showFamilyMember.distance}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleCallMember(showFamilyMember)} data-testid="call-member-btn"
            className="flex-1 bg-emerald-500 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2">
            <Phone size={16} /> Call
          </button>
          <button onClick={() => handleMessageMember(showFamilyMember)} data-testid="message-member-btn"
            className="flex-1 bg-blue-500 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2">
            <MessageCircle size={16} /> Message
          </button>
        </div>
      </div>
    </div>
  )

  // ==================== MAIN RENDER ====================
  const bottomNavHeight = 'calc(60px + env(safe-area-inset-bottom, 20px))'
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {showMaintenanceMode && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900 p-6">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">🔧</div>
            <h1 className="text-xl font-bold text-white mb-2">Under Maintenance</h1>
            <p className="text-slate-400">We&apos;ll be back shortly. Please try again in a few minutes.</p>
          </div>
        </div>
      )}
      {announcementBanner && (
        <div className="bg-amber-500/90 text-white text-center py-2 px-4 text-sm font-medium" style={{ paddingTop: 'max(8px, env(safe-area-inset-top))' }}>
          {announcementBanner}
        </div>
      )}
      {/* Content - inset from bottom so it stays above the fixed nav (no overlap) */}
      <div
        className="flex-1 flex flex-col min-h-0"
        style={{
          paddingBottom: !isNavigating ? bottomNavHeight : 0,
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}
      >
        {activeTab === 'map' && renderMap()}
      {activeTab === 'dashboards' && (
        <DashboardsTab
          isLight={isLight}
          isPremium={userPlan === 'premium' || userData.is_premium}
          hasFamily={userPlan === 'family' || userPlan === 'premium' || userData.is_premium}
          onUpgrade={() => setShowPlanSelection(true)}
          onOpenFriends={() => setShowFriendsHub(true)}
          onOpenFamily={() => setShowFamilyDashboard(true)}
          onOpenFriendChallenges={() => setShowChallengeHistory(true)}
        />
      )}
        {activeTab === 'rewards' && renderRewards()}
        {activeTab === 'profile' && renderProfile()}
      </div>

      {/* Bottom Navigation - 4 Tabs (fixed; content above reserves space) */}
      {!isNavigating && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 40,
            background: isLight ? 'rgba(255,255,255,0.98)' : 'rgba(30,41,59,0.98)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderTop: isLight ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)',
            paddingBottom: 'env(safe-area-inset-bottom, 20px)',
            display: 'flex',
            justifyContent: 'space-around',
            paddingTop: 10,
            height: 'calc(60px + env(safe-area-inset-bottom, 20px))',
          }}
        >
          {[
            { id: 'map', icon: MapPin, label: 'Map' },
            { id: 'dashboards', icon: Users, label: 'Dashboards' },
            { id: 'rewards', icon: Gift, label: 'Rewards' },
            { id: 'profile', icon: Settings, label: 'Profile' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as TabType)} data-testid={`nav-${tab.id}`}
              className={`flex-1 flex flex-col items-center py-1 ${activeTab === tab.id ? 'text-blue-500' : isLight ? 'text-slate-400' : 'text-slate-400'}`}>
              <tab.icon size={22} />
              <span className="text-[11px] mt-0.5 font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Modals */}
      {showMenu && renderMenu()}
      {renderSearchModal()}
      {renderNotificationsModal()}
      {renderAddLocationModal()}
      {renderAddRouteModal()}
      {renderOfferDetailModal()}
      {renderReportModal()}
      {renderFamilyMemberModal()}
      
      {/* New Feature Modals */}
      <FriendsHub
        isOpen={showFriendsHub}
        onClose={() => setShowFriendsHub(false)}
        userId={userData.id || '123456'}
        friendsCount={userData.friends_count || 0}
      />
      {tappedFriend && (
        <>
          <div
            onClick={() => setTappedFriend(null)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1100,
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(2px)',
            }}
          />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1101,
            background: '#1C1C1E', borderRadius: '22px 22px 0 0',
            paddingBottom: 'env(safe-area-inset-bottom, 24px)',
          }}>
            <div style={{
              width: 36, height: 4, background: 'rgba(255,255,255,0.18)',
              borderRadius: 2, margin: '12px auto 0',
            }} />
            <div style={{ padding: '16px 20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 26, flexShrink: 0,
                  background: tappedFriend.isFamilyMember
                    ? 'linear-gradient(135deg,#FF9500,#FF6B00)'
                    : 'linear-gradient(135deg,#007AFF,#5856D6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, fontWeight: 800, color: 'white',
                }}>
                  {tappedFriend.name[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 19, fontWeight: 800, color: 'white' }}>
                    {tappedFriend.name}
                    {tappedFriend.isFamilyMember && (
                      <span style={{
                        fontSize: 11, color: '#FF9500', background: 'rgba(255,149,0,0.15)',
                        borderRadius: 6, padding: '2px 8px', marginLeft: 8,
                      }}>Family</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <div style={{
                      width: 7, height: 7, borderRadius: 4,
                      background: tappedFriend.isSharing ? '#30D158' : '#8E8E93',
                      animation: tappedFriend.isSharing ? 'pulse 2s infinite' : 'none',
                    }} />
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
                      {tappedFriend.isNavigating
                        ? `Driving to ${tappedFriend.destinationName ?? 'somewhere'} · ${Math.round(tappedFriend.speedMph ?? 0)} mph`
                        : tappedFriend.speedMph && tappedFriend.speedMph > 5
                          ? `Moving · ${Math.round(tappedFriend.speedMph)} mph`
                          : 'Stationary'}
                    </span>
                  </div>
                </div>
              </div>

              {tappedFriend.isNavigating && (
                <div style={{
                  background: 'rgba(0,122,255,0.1)',
                  border: '1px solid rgba(0,122,255,0.2)',
                  borderRadius: 12, padding: '10px 14px', marginBottom: 16,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ fontSize: 16 }}>📍</span>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
                    They're moving. Navigate routes to their live position and updates every 15 seconds.
                  </div>
                </div>
              )}

              <button
                onClick={() => startLiveNavigation(tappedFriend).catch(() => {})}
                style={{
                  width: '100%', height: 54, marginBottom: 10,
                  background: tappedFriend.isFamilyMember ? '#FF9500' : '#007AFF',
                  border: 'none', borderRadius: 16, color: 'white',
                  fontSize: 16, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <span style={{ fontSize: 18 }}>🗺️</span>
                Navigate to {tappedFriend.name.split(' ')[0]}
              </button>

              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <button
                  onClick={() => startCameraFollow(tappedFriend)}
                  style={{
                    flex: 1, height: 50, background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, color: 'white',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex',
                    flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                  }}
                >
                  <span style={{ fontSize: 18 }}>👁️</span>
                  Watch their journey
                </button>
                <button
                  onClick={() => meetInMiddle(tappedFriend)}
                  style={{
                    flex: 1, height: 50, background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, color: 'white',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex',
                    flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                  }}
                >
                  <span style={{ fontSize: 18 }}>🤝</span>
                  Meet halfway
                </button>
              </div>
              <button
                onClick={() => setTappedFriend(null)}
                style={{
                  width: '100%', height: 44, background: 'none', border: 'none',
                  color: 'rgba(255,255,255,0.35)', fontSize: 15, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
      {followingMode !== 'none' && (() => {
        const friend = friendLocations.find((f) => f.id === followingFriendIdRef.current)
        if (!friend) return null
        return (
          <div style={{
            position: 'fixed',
            top: 'calc(env(safe-area-inset-top, 44px) + 8px)',
            left: 16,
            right: 16,
            zIndex: 980,
            background: followingMode === 'navigating'
              ? (friend.isFamilyMember ? 'rgba(255,149,0,0.92)' : 'rgba(0,122,255,0.92)')
              : 'rgba(88,86,214,0.92)',
            backdropFilter: 'blur(12px)',
            borderRadius: 16,
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: 4, background: 'white',
              animation: 'pulse 1.5s infinite', flexShrink: 0,
            }} />
            <div style={{ flex: 1 }}>
              <div style={{ color: 'white', fontWeight: 700, fontSize: 13 }}>
                {followingMode === 'navigating'
                  ? `Navigating to ${friend.name.split(' ')[0]} · updates every 15s`
                  : `Watching ${friend.name.split(' ')[0]}'s journey`}
              </div>
            </div>
            <button
              onClick={stopAllFollowModes}
              style={{
                background: 'rgba(255,255,255,0.2)', border: 'none',
                borderRadius: 8, padding: '4px 10px', color: 'white',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Stop
            </button>
          </div>
        )
      })()}
      {selectedFriend && (
        <FriendCard
          friend={selectedFriend}
          onClose={() => setSelectedFriend(null)}
          onNavigateToFriend={(friend) => {
            handleSelectDestination({
              name: `${friend.name}'s Location`,
              lat: friend.lat,
              lng: friend.lng,
            })
            setSelectedFriend(null)
          }}
          onTagFriend={async (friend) => {
            const uid = (user as { id?: string } | undefined)?.id
            if (!uid) return
            await sendLocationTag(uid, friend.id, userLocation.lat, userLocation.lng, 'Check out where I am!')
            toast.success(`📍 Tagged location to ${friend.name}!`)
            setSelectedFriend(null)
          }}
          onFollow={(friend) => {
            if (followingFriendId === friend.id) {
              stopFollowingFriend()
              toast.success('Stopped following')
            } else {
              startFollowingFriend(friend).catch(() => {})
            }
            setSelectedFriend(null)
          }}
          isFollowing={followingFriendId === selectedFriend.id}
        />
      )}
      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes pulse {
          0% { opacity: 0.55; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1); }
          100% { opacity: 0.55; transform: scale(0.9); }
        }
      `}</style>
      <Suspense fallback={null}>
        <BadgesGrid 
          isOpen={showBadgesGrid} 
          onClose={() => setShowBadgesGrid(false)}
        />
      </Suspense>
      <TripHistory
        isOpen={showTripHistory}
        onClose={() => setShowTripHistory(false)}
      />
      <GemHistory
        isOpen={showGemHistory}
        onClose={() => setShowGemHistory(false)}
      />
      <NotificationSettings
        isOpen={showNotificationSettings}
        onClose={() => setShowNotificationSettings(false)}
      />
      <HelpSupport
        isOpen={showHelpSupport}
        onClose={() => setShowHelpSupport(false)}
      />
      <SubmitConcern
        isOpen={showSubmitConcern}
        onClose={() => setShowSubmitConcern(false)}
        userId={user?.id ?? ''}
        userLocation={userLocation}
      />
      <FuelTracker
        isOpen={showFuelTracker}
        onClose={() => setShowFuelTracker(false)}
        isPremium={userData.is_premium}
      />

      {/* Comprehensive Analytics Dashboard — theme-aware (follows Settings > Appearance) */}
      {showFuelDashboard && (
        <div className={`fixed inset-0 z-[1100] flex items-center justify-center p-4 ${isLight ? 'bg-black/50' : 'bg-black/90'}`} onClick={() => setShowFuelDashboard(false)}>
          <div
            key={`driver-analytics-${theme}`}
            data-theme={theme}
            className={`w-full max-w-md max-h-[90vh] rounded-2xl overflow-hidden animate-scale-in flex flex-col shadow-xl ${isLight ? 'bg-white' : 'bg-slate-900'}`}
            onClick={e => e.stopPropagation()}
          >
            {/* Header - Fixed (gradient works in both themes) */}
            <div className="flex-shrink-0 bg-gradient-to-r from-emerald-600 to-teal-500 p-4 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full" />
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-white font-bold text-xl">Driver Analytics</h2>
                  <p className="text-emerald-100 text-sm">Your complete driving stats</p>
                </div>
                <button onClick={() => setShowFuelDashboard(false)} className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30" data-testid="fuel-dashboard-close">
                  <X className="text-white" size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable Content — theme-aware */}
            <div className={`flex-1 overflow-y-auto p-4 ${isLight ? 'bg-slate-50' : 'bg-slate-900'}`}>
              {/* Nearby Gas Prices — from API */}
              <div className={`rounded-xl p-4 mb-4 border ${isLight ? 'bg-amber-50/80 border-amber-200' : 'bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20'}`}>
                <h3 className={`font-semibold mb-3 flex items-center gap-2 ${isLight ? 'text-slate-800' : 'text-white'}`}>
                  <Fuel className="text-amber-500" size={18} />
                  Nearby Gas Prices
                </h3>
                <div className="space-y-2">
                  {driverAnalyticsData.gasStations.length > 0 ? driverAnalyticsData.gasStations.map((station, i) => (
                    <div key={i} className={`flex items-center justify-between rounded-lg p-2 ${isLight ? 'bg-white border border-slate-200' : 'bg-slate-800/50'}`}>
                      <div className="flex items-center gap-2">
                        <div>
                          <p className={`text-sm font-medium ${isLight ? 'text-slate-800' : 'text-white'}`}>{station.name}</p>
                          <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{typeof station.distance_miles === 'number' ? `${station.distance_miles.toFixed(1)} mi` : station.address || '—'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>${Number(station.regular).toFixed(2)}</p>
                        <p className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>/gal</p>
                      </div>
                    </div>
                  )) : (
                    <p className={`text-sm py-2 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>No nearby stations loaded. Complete trips to see fuel impact below.</p>
                  )}
                </div>
                <p className={`text-[10px] mt-2 text-center ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>★ Prices from API (location-based when available)</p>
              </div>

              {/* Main Stats Grid — from trip history analytics API, theme-aware */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className={`rounded-xl p-3 border ${isLight ? 'bg-blue-50 border-blue-200' : 'bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-blue-500/20'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="text-blue-500" size={18} />
                    <span className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Driver Score</span>
                  </div>
                  {(() => {
                    const score = (driverAnalyticsData.analytics?.total_trips ?? 0) > 0 ? (driverAnalyticsData.analytics?.avg_safety_score ?? 85) : (userData.safety_score ?? 85)
                    const label = score >= 90 ? 'Excellent' : score >= 70 ? 'Good' : 'Needs Work'
                    return (<><p className={`text-2xl font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>{score}</p><p className="text-blue-500 text-xs">{label}</p></>)
                  })()}
                </div>
                <div className={`rounded-xl p-3 border ${isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border-emerald-500/20'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="text-emerald-500" size={18} />
                    <span className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Money Saved</span>
                  </div>
                  <p className={`text-2xl font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>${(driverAnalyticsData.analytics?.money_saved_dollars ?? 0).toFixed(0)}</p>
                  <p className="text-emerald-600 text-xs">Eco driving @ ${(Number(driverAnalyticsData.fuelPricePerGal) ?? 0).toFixed(2)}/gal</p>
                </div>
                <div className={`rounded-xl p-3 border ${isLight ? 'bg-amber-50 border-amber-200' : 'bg-gradient-to-br from-amber-500/20 to-amber-600/20 border-amber-500/20'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Droplets className="text-amber-500" size={18} />
                    <span className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Gallons Saved</span>
                  </div>
                  <p className={`text-2xl font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>{(driverAnalyticsData.analytics?.fuel_saved_gallons ?? 0).toFixed(1)}</p>
                  <p className="text-amber-600 text-xs">vs baseline 25 mpg</p>
                </div>
                <div className={`rounded-xl p-3 border ${isLight ? 'bg-purple-50 border-purple-200' : 'bg-gradient-to-br from-purple-500/20 to-purple-600/20 border-purple-500/20'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Leaf className="text-purple-500" size={18} />
                    <span className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>CO₂ Reduced</span>
                  </div>
                  <p className={`text-2xl font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>{(driverAnalyticsData.analytics?.co2_saved_lbs ?? 0).toFixed(0)} lb</p>
                  <p className="text-purple-600 text-xs">Environmental impact</p>
                </div>
              </div>

              {/* Driving Habits — theme-aware */}
              <div className={`rounded-xl p-4 mb-4 ${isLight ? 'bg-white border border-slate-200' : 'bg-slate-800'}`}>
                <h3 className={`font-semibold mb-3 flex items-center gap-2 ${isLight ? 'text-slate-800' : 'text-white'}`}>
                  <Target className="text-blue-500" size={18} />
                  Driving Habits
                </h3>
                <div className="space-y-3">
                  {[
                    { label: 'Smooth Braking', score: 92, color: 'bg-emerald-500' },
                    { label: 'Steady Speed', score: 88, color: 'bg-blue-500' },
                    { label: 'Safe Following', score: 95, color: 'bg-emerald-500' },
                    { label: 'Night Driving', score: 78, color: 'bg-amber-500' },
                    { label: 'Weather Driving', score: 85, color: 'bg-blue-500' },
                  ].map((habit, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{habit.label}</span>
                        <span className={`text-sm font-medium ${isLight ? 'text-slate-800' : 'text-white'}`}>{habit.score}%</span>
                      </div>
                      <div className={`h-2 rounded-full overflow-hidden ${isLight ? 'bg-slate-200' : 'bg-slate-700'}`}>
                        <div className={`h-full ${habit.color} rounded-full transition-all`} style={{ width: `${habit.score}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trip Summary — theme-aware */}
              <div className={`rounded-xl p-4 mb-4 ${isLight ? 'bg-white border border-slate-200' : 'bg-slate-800'}`}>
                <h3 className={`font-semibold mb-3 flex items-center gap-2 ${isLight ? 'text-slate-800' : 'text-white'}`}>
                  <Route className="text-emerald-500" size={18} />
                  Trip Summary
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <p className={`text-2xl font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>{userData.total_trips || 0}</p>
                    <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Total Trips</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-2xl font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>{userData.total_miles || 0}</p>
                    <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Miles Driven</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-2xl font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>{((userData.total_miles || 0) / Math.max(userData.total_trips || 1, 1)).toFixed(1)}</p>
                    <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Avg Distance</p>
                  </div>
                </div>
              </div>

              {/* Fuel Stats — theme-aware */}
              <div className={`rounded-xl p-4 ${isLight ? 'bg-white border border-slate-200' : 'bg-slate-800'}`}>
                <h3 className={`font-semibold mb-3 flex items-center gap-2 ${isLight ? 'text-slate-800' : 'text-white'}`}>
                  <Fuel className="text-amber-500" size={18} />
                  Fuel Efficiency
                </h3>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className={`text-3xl font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>28.5</p>
                    <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Avg MPG</p>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-600 text-sm font-medium">+15% better</p>
                    <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>than avg driver</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setShowFuelDashboard(false); setShowFuelTracker(true) }}
                  className="w-full bg-amber-500 text-white py-3 rounded-lg font-medium hover:bg-amber-400 transition-colors"
                >
                  Log Fuel Fill-Up
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <LevelProgress
        isOpen={showLevelProgress}
        onClose={() => setShowLevelProgress(false)}
      />
      
      {/* Orion Voice - full AI chat; can start nav, go to offers, and add voice reports during nav */}
      {orionEnabled && (
        <Suspense fallback={null}>
          <OrionVoice
            isOpen={showOrionVoice}
            onClose={() => setShowOrionVoice(false)}
            context={buildOrionContext() ?? {}}
            isMuted={isMuted}
            onMuteToggle={() => setIsMuted((v) => !v)}
            onStartNavigation={handleOrionStartNavigation}
            onNavigateToOffer={handleOrionNavigateToOffer}
            onVoiceReport={handleOrionVoiceReport}
          />
        </Suspense>
      )}
      <QuickPhotoReport
        isOpen={showQuickPhotoReport}
        onClose={() => setShowQuickPhotoReport(false)}
        onSubmit={handleQuickPhotoReport}
        currentLocation={userLocation}
        isMoving={isNavigating}
        currentSpeed={currentSpeed}
      />
      <QuickPhotoReport
        isOpen={showQuickReportIconsOnly}
        onClose={() => setShowQuickReportIconsOnly(false)}
        onSubmit={async (r) => { await handleQuickPhotoReport(r); setShowQuickReportIconsOnly(false) }}
        currentLocation={userLocation}
        isMoving={isNavigating}
        currentSpeed={currentSpeed}
        compact
        useMapPlacement={false}
      />
      <PhotoReportCapture
        isOpen={showPhotoReport}
        onClose={() => setShowPhotoReport(false)}
        userLocation={userLocation}
        onReportSubmitted={() => {
          toast.success('+25 gems! Report submitted.')
          loadNearbyOffers()
        }}
      />
      <Suspense fallback={null}>
      <FamilyDashboard
        isOpen={showFamilyDashboard}
        onClose={() => setShowFamilyDashboard(false)}
        currentUserId={(user as { id?: string } | undefined)?.id ?? String(userData.id ?? '')}
      />
      </Suspense>
      <Suspense fallback={null}>
      <ConvoyMode
        isOpen={showConvoy}
        onClose={() => setShowConvoy(false)}
        currentUserId={(user as { id?: string } | undefined)?.id ?? String(userData.id ?? '')}
        familyMembers={friendLocations.filter((f) => f.isFamilyMember)}
        groupId={familyMemberIds[0] ? 'family-group' : ''}
        onConvoyStarted={(dest) => {
          setShowConvoy(false)
          const sr = searchResultLike(dest)
          if (sr) void handleSelectDestination(sr)
        }}
      />
      </Suspense>
      
      {/* Onboarding Modals */}
      {showPlanSelection && (
        <PlanSelection
          onSelectPlan={handlePlanSelect}
        />
      )}
      
      {/* Car Customization Modals */}
      {showCarOnboarding && (
        <CarOnboarding
          onComplete={handleCarOnboardingComplete}
          onSkip={() => setShowCarOnboarding(false)}
        />
      )}

      {/* App Tour for New Users */}
      {showAppTour && (
        <div className="fixed inset-0 bg-black/90 z-[1100] flex items-center justify-center p-4" onClick={() => setShowAppTour(false)}>
          <div className="w-full max-w-sm max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden animate-scale-in flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Tour Header - Fixed */}
            <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-purple-600 p-5 relative">
              <button 
                onClick={() => setShowAppTour(false)}
                className="absolute top-3 right-3 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30"
                data-testid="tour-close-btn"
              >
                <X className="text-white" size={16} />
              </button>
              <div className="text-center">
                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Navigation className="text-white" size={28} />
                </div>
                <h2 className="text-white text-lg font-bold">Welcome to SnapRoad!</h2>
                <p className="text-white/80 text-xs mt-1">Let's take a quick tour</p>
              </div>
            </div>

            {/* Tour Steps - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {[
                { icon: MapPin, title: 'Interactive Map', desc: 'Pinch to zoom, drag to pan. Find nearby offers!' },
                { icon: Gem, title: 'Collect Gems', desc: 'Tap glowing gems on the map to redeem discounts' },
                { icon: Mic, title: 'Meet Orion', desc: 'Your voice assistant - tap the purple mic button' },
                { icon: Shield, title: 'Drive Safe', desc: 'Earn points for smooth braking and safe driving' },
                { icon: Fuel, title: 'Track Analytics', desc: 'Monitor fuel, savings, and your driver score' },
                { icon: Car, title: 'Customize Your Ride', desc: 'Unlock new colors and car styles as you level up' },
                { icon: Trophy, title: 'Compete & Win', desc: 'Challenge friends and earn bonus gems' },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3 bg-slate-800 rounded-xl p-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <step.icon className="text-blue-400" size={18} />
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">{step.title}</p>
                    <p className="text-slate-400 text-xs">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Start Button - Fixed */}
            <div className="flex-shrink-0 p-4 border-t border-slate-800 bg-slate-900/95">
              <button
                onClick={() => setShowAppTour(false)}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg"
                data-testid="tour-start-btn"
              >
                <Check size={20} />
                Start Driving!
              </button>
            </div>
          </div>
        </div>
      )}
      
      <CarStudio
        isOpen={showCarStudio}
        onClose={() => setShowCarStudio(false)}
        currentCar={userCar}
        gems={userData.gems}
        ownedColors={ownedColors}
        onPurchaseColor={handlePurchaseColor}
        onChangeCar={handleCarChange}
      />
      
      {/* Offers Modal */}
      <OffersModal
        isOpen={showOffersModal}
        onClose={() => {
          setShowOffersModal(false)
          setSelectedOfferId(null)
        }}
        userPlan={userPlan}
        onRedeem={handleRedeemOffer}
        selectedOfferId={selectedOfferId}
        onOpenUrl={(url, title) => {
          setBrowserUrl(url)
          setBrowserTitle(title)
          setShowBrowser(true)
        }}
        onUpgradeToPlans={() => {
          setShowOffersModal(false)
          setSelectedOfferId(null)
          setShowPlanSelection(true)
        }}
      />

      {/* In-App Browser for third-party offer links */}
      <InAppBrowser
        url={browserUrl}
        title={browserTitle}
        isOpen={showBrowser}
        onClose={() => setShowBrowser(false)}
      />

      {/* Gem Overlay - shows during navigation and trip summary at end */}
      <GemOverlay
        tripId={activeTripId}
        isNavigating={isNavigating}
      />
      
      {/* Share Trip Score Modal */}
      <ShareTripScore
        isOpen={showShareTrip}
        onClose={() => setShowShareTrip(false)}
        tripData={lastTripData}
        userName={userData.name || 'Driver'}
        userLevel={userData.level || 1}
      />
      
      {/* Driving Score Modal (Premium Feature) */}
      <DrivingScore
        isOpen={showDrivingScore}
        onClose={() => setShowDrivingScore(false)}
        isPremium={userPlan === 'premium'}
        onUpgrade={() => {
          setShowDrivingScore(false)
          setShowPlanSelection(true)
        }}
      />
      
      {/* Challenge History Modal */}
      <ChallengeHistory
        isOpen={showChallengeHistory}
        onClose={() => setShowChallengeHistory(false)}
        onGemsUpdated={(gems) => setUserData((prev: any) => ({ ...prev, gems }))}
      />
      
      {/* Offer redemption bottom sheet (detail → QR → success) */}
      {showRedemptionPopup && (
        <OfferRedemptionCard
          offer={selectedOfferForRedemption}
          onClose={() => {
            setShowRedemptionPopup(false)
            setSelectedOfferForRedemption(null)
          }}
          onRedeemed={(gems) => {
            if (gems > 0) toast.success(`+${gems} gems earned!`)
            loadNearbyOffers()
          }}
        />
      )}
      
      {/* Weekly Recap (Premium) */}
      <WeeklyRecap
        isOpen={showWeeklyRecap}
        onClose={() => setShowWeeklyRecap(false)}
        isPremium={userPlan === 'premium'}
      />

      <Suspense fallback={null}>
      <WeeklyInsights
        isOpen={showWeeklyInsights}
        onClose={() => setShowWeeklyInsights(false)}
        userId={user?.id ?? ''}
      />
      </Suspense>

      <Suspense fallback={null}>
      <SnapRoadScoreCard
        isOpen={showScoreCard}
        onClose={() => setShowScoreCard(false)}
        userData={userData}
      />
      </Suspense>

      <Suspense fallback={null}>
      <PhotoIncidentFeed
        isOpen={showPhotoFeed}
        onClose={() => setShowPhotoFeed(false)}
        userLocation={userLocation}
        onNavigateToReport={(report: PhotoReport) => {
          handleSelectDestination({
            name: `${report.category || report.ai_category || 'hazard'} at this location`,
            lat: report.lat,
            lng: report.lng,
          })
        }}
      />
      </Suspense>
      
      {/* Orion Offer Alerts (during navigation only) — only offers within 1 mile */}
      {orionEnabled && isNavigating && (
        <OrionOfferAlerts
          isNavigating={isNavigating}
          userLocation={userLocation}
          offers={nearbyNavOffers as unknown as ComponentProps<typeof OrionOfferAlerts>['offers']}
          onOfferSelect={(o) => handleDirectRedemption(o as unknown as DriverAppOffer)}
          isPremium={userPlan === 'premium'}
        />
      )}
      
      {/* Trip Analytics Modal */}
      <TripAnalytics
        isOpen={showTripAnalytics}
        onClose={() => setShowTripAnalytics(false)}
      />
      
      {/* Route History 3D Map Modal */}
      <RouteHistory3D
        isOpen={showRouteHistory3D}
        onClose={() => setShowRouteHistory3D(false)}
      />
    </div>
  )
}
