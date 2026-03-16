import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'
import {
  MapPin, Gift, Trophy, Users, Search, Home, Briefcase, Bell, Menu, Mic,
  Navigation, ChevronRight, ChevronDown, ChevronUp, Settings, Camera,
  Gem, Award, X, Plus, Check, Star, Clock, Car, Fuel,
  Coffee, AlertTriangle, Volume2, VolumeX, Route, LogOut, Play, Pause, Map,
  Trash2, Timer, RefreshCw, EyeOff, School, ShoppingCart, Dumbbell, 
  Building, Compass, Layers, GripVertical, Minimize2, Maximize2,
  Phone, MessageCircle, Battery, ChevronLeft, Shield, Zap,
  History, BarChart3, HelpCircle, Lock, Edit2, Share2, Swords,
  DollarSign, Droplets, Leaf, Target, Sun, Moon
} from 'lucide-react'
import FriendsHub from './components/FriendsHub'
import Leaderboard from './components/Leaderboard'
import BadgesGrid from './components/BadgesGrid'
import TripHistory from './components/TripHistory'
import GemHistory from './components/GemHistory'
import NotificationSettings from './components/NotificationSettings'
import HelpSupport from './components/HelpSupport'
import FuelTracker from './components/FuelTracker'
import CarOnboarding from './components/CarOnboarding'
import CarStudio from './components/CarStudioNew'
import PlanSelection from './components/PlanSelection'
import RoadReports from './components/RoadReports'
import LevelProgress from './components/LevelProgress'
import OrionVoice from './components/OrionVoice'
import QuickPhotoReport from './components/QuickPhotoReport'
import RoadStatusOverlay, { RoadStatusMarkers } from './components/RoadStatusOverlay'
import OffersModal from './components/OffersModal'
import ShareTripScore from './components/ShareTripScore'
import DrivingScore from './components/DrivingScore'
import ChallengeHistory from './components/ChallengeHistory'
import RedemptionPopup from './components/RedemptionPopup'
import WeeklyRecap from './components/WeeklyRecap'
import OrionOfferAlerts from './components/OrionOfferAlerts'
import GoogleMapSnapRoad from './components/GoogleMapSnapRoad'
import { NavigationCamera } from './components/NavigationCamera'
import LaneGuide, { parseLanes, type Lane } from './components/LaneGuide'
import MapLayerPicker from './components/MapLayerPicker'
import { useGoogleMaps } from '@/contexts/GoogleMapsContext'
import { getGoogleDirections, type DirectionsResult } from '@/lib/googleMaps'
import { ProfileCar, CAR_COLORS } from './components/Car3D'
// New enhanced components
import TripAnalytics from './components/TripAnalytics'
import RouteHistory3D from './components/RouteHistory3D'
import InAppBrowser from './components/InAppBrowser'
import GemOverlay from './components/GemOverlay'
import SpeedIndicator from './components/SpeedIndicator'
import PlaceDetail from './components/PlaceDetail'
import PlaceCard, { type PlaceCardData } from './components/PlaceCard'
import PlaceDetailCard from './components/PlaceDetailCard'
import type { OHGOCamera } from '@/lib/ohgo'
import OHGOCameraPopup from './components/OHGOCameraPopup'
import { api } from '@/services/api'
import { useNavigationCore } from '@/contexts/NavigationCoreContext'
import { useTheme } from '@/contexts/ThemeContext'
import {
  updateMyLocation,
  subscribeFriendLocations,
  getFriendLocations,
  sendLocationTag,
  stopSharingLocation,
  type FriendLocation,
} from '@/lib/friendLocation'
import { chatWithOrion, orionSpeak, startListening, type OrionContext } from '@/lib/orion'
import FriendMarkers from './components/FriendMarkers'
import FriendCard from './components/FriendCard'

const OHGO_API_KEY = import.meta.env.VITE_OHGO_API_KEY ?? '3f0f254b-b6fc-4b56-b76a-00a109e9ef22'

// Shared api returns { success, data: backendBody }. Backend often returns { data: payload }. Unwrap for payload.
function payload<T>(res: { success?: boolean; data?: { data?: T } & Record<string, unknown> }): T | undefined {
  return res.data?.data !== undefined ? (res.data.data as T) : (res.data as unknown as T)
}

// Types - Changed to 4 tabs: Map, Routes, Rewards, Profile
type TabType = 'map' | 'routes' | 'rewards' | 'profile'
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

interface Offer {
  id: number
  business_name: string
  discount_percent: number
  gems_reward: number
  lat?: number
  lng?: number
  business_type?: string
  redeemed?: boolean
  name?: string
  [key: string]: unknown
}

interface FamilyMember {
  id: string
  name: string
  role: string
  safety_score: number
  last_trip?: string
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
const categoryIcons: Record<string, { icon: typeof Home; color: string }> = {
  home: { icon: Home, color: 'emerald' },
  work: { icon: Briefcase, color: 'blue' },
  gym: { icon: Dumbbell, color: 'purple' },
  school: { icon: School, color: 'yellow' },
  shopping: { icon: ShoppingCart, color: 'pink' },
  favorite: { icon: Star, color: 'amber' },
}

export default function DriverApp() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { vehicle, camera, predicted, isLive, recenter, setRoutePolyline, setMode, mode, experience, getDrivingMetrics } = useNavigationCore()
  const { ready: mapReady, error: mapError, reportError: reportMapError } = useGoogleMaps()
  const isLight = theme === 'light'
  const [mapFailed, setMapFailed] = useState(false)
  const [fallbackBannerDismissed, setFallbackBannerDismissed] = useState(false)
  const useMap = mapReady && !mapError && !mapFailed
  const tripStartTimeRef = useRef<number | null>(null)
  const isNavigatingRef = useRef(false)
  const carHeadingRef = useRef(0)
  const prevLocationRef = useRef<{ lat: number; lng: number } | null>(null)
  const hasZoomedToUser = useRef(false)
  const zoomToUserRef = useRef<((lat: number, lng: number, isNav: boolean) => void) | null>(null)
  const traveledDistanceRef = useRef(0)
  const navCameraRef = useRef<NavigationCamera | null>(null)
  const distanceToNextStepRef = useRef<number | null>(null)
  const mapActionsRef = useRef<{ resetHeading: () => void; clearUserInteracting: () => void } | null>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null)
  const incidentMarkersRef = useRef<google.maps.Marker[]>([])
  const constructionMarkersRef = useRef<google.maps.Marker[]>([])
  const cameraMarkersRef = useRef<google.maps.Marker[]>([])
  const [mapReadyForLayers, setMapReadyForLayers] = useState(false)
  const [ohgoCameras, setOhgoCameras] = useState<OHGOCamera[]>([])
  const [selectedCamera, setSelectedCamera] = useState<OHGOCamera | null>(null)

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
  const [showOfferDetail, setShowOfferDetail] = useState<Offer | null>(null)
  const [showFamilyMember, setShowFamilyMember] = useState<FamilyMember | null>(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [draggingWidget, setDraggingWidget] = useState<string | null>(null)
  const [showLayerPicker, setShowLayerPicker] = useState(false)
  const [activeMapLayer, setActiveMapLayer] = useState<'standard' | 'satellite' | 'hybrid' | 'dark'>('standard')
  const [showTrafficLayer, setShowTrafficLayer] = useState(false)
  const [showCameraLayer, setShowCameraLayer] = useState(false)
  const [showIncidentsLayer, setShowIncidentsLayer] = useState(false)
  const [showConstructionLayer, setShowConstructionLayer] = useState(false)

  // New modal states
  const [showFriendsHub, setShowFriendsHub] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [showBadgesGrid, setShowBadgesGrid] = useState(false)
  const [showTripHistory, setShowTripHistory] = useState(false)
  const [showGemHistory, setShowGemHistory] = useState(false)
  const [showNotificationSettings, setShowNotificationSettings] = useState(false)
  const [showHelpSupport, setShowHelpSupport] = useState(false)
  const [showFuelTracker, setShowFuelTracker] = useState(false)
  const [showFuelDashboard, setShowFuelDashboard] = useState(false)
  const [showAppTour, setShowAppTour] = useState(false)
  const [showCarOnboarding, setShowCarOnboarding] = useState(false)
  const [showCarStudio, setShowCarStudio] = useState(false)
  const [showPlanSelection, setShowPlanSelection] = useState(false)
  const [showRoadReports, setShowRoadReports] = useState(false)
  const [showLevelProgress, setShowLevelProgress] = useState(false)
  const [showOrionVoice, setShowOrionVoice] = useState(false)
  const [showQuickPhotoReport, setShowQuickPhotoReport] = useState(false)
  const [showQuickReportIconsOnly, setShowQuickReportIconsOnly] = useState(false)
  const [selectedRoadStatus, setSelectedRoadStatus] = useState<{ id: string; name: string; status: 'clear' | 'moderate' | 'heavy' | 'closed'; reason?: string; estimatedDelay?: number; startLat: number; startLng: number; endLat: number; endLng: number } | null>(null)
  const [showOffersModal, setShowOffersModal] = useState(false)
  const [showShareTrip, setShowShareTrip] = useState(false)
  const [lastTripData, setLastTripData] = useState<Record<string, unknown> | null>(null)
  const [selectedOfferId, setSelectedOfferId] = useState<number | null>(null)
  const [showDrivingScore, setShowDrivingScore] = useState(false)
  const [showChallengeHistory, setShowChallengeHistory] = useState(false)
  const [showRedemptionPopup, setShowRedemptionPopup] = useState(false)
  const [selectedOfferForRedemption, setSelectedOfferForRedemption] = useState<Offer | null>(null)
  const [showWeeklyRecap, setShowWeeklyRecap] = useState(false)
  
  // New feature states
  const [showTripAnalytics, setShowTripAnalytics] = useState(false)
  const [showRouteHistory3D, setShowRouteHistory3D] = useState(false)
  const [showOffersPanel, setShowOffersPanel] = useState(true)
  const [routeNotifications, setRouteNotifications] = useState<Array<{ id: string; type: string; route_id?: number; route_name?: string; destination?: string; message: string; leave_by?: string; eta_minutes?: number; saved_minutes?: number; saved_dollars?: number }>>([])
  const [dismissedRouteNotifIds, setDismissedRouteNotifIds] = useState<Set<string>>(new Set())
  const [leaveEarlyForRoute, setLeaveEarlyForRoute] = useState<{ routeId: number; leaveBy: string; etaMinutes: number; destination: string } | null>(null)
  
  // In-app browser state
  const [browserUrl, setBrowserUrl] = useState('')
  const [browserTitle, setBrowserTitle] = useState('')
  const [showBrowser, setShowBrowser] = useState(false)
  
  // Gem overlay state
  const [activeTripId, setActiveTripId] = useState<string | null>(null)
  
  // Search and navigation states
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedDestination, setSelectedDestination] = useState<NavigationDestination | null>(null)
  const [selectedPlace, setSelectedPlace] = useState<{
    name: string
    lat: number
    lng: number
    address?: string
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
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const [searchResultPhotos, setSearchResultPhotos] = useState<Record<string, string>>({})
  const [navigationData, setNavigationData] = useState<NavigationState | null>(null)
  const [liveEta, setLiveEta] = useState<{ distanceMiles: number; etaMinutes: number } | null>(null)
  const [showTurnByTurn, setShowTurnByTurn] = useState(false)
  const [isOverviewMode, setIsOverviewMode] = useState(false)
  const [showRoutePreview, setShowRoutePreview] = useState(false)
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [showTripSummary, setShowTripSummary] = useState(false)
  const [selectedRouteId, setSelectedRouteId] = useState('fastest')
  const [availableRoutes, setAvailableRoutes] = useState<DirectionsResult[]>([])
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0)
  /** Polylines from trip/route history for map layer (same source as Trip Analytics & Route History) */
  const [tripHistoryPolylines, setTripHistoryPolylines] = useState<{ lat: number; lng: number }[][]>([])
  /** Driver Analytics modal: real trip analytics + nearby gas from API */
  const [driverAnalyticsData, setDriverAnalyticsData] = useState<{
    analytics: { total_trips?: number; avg_safety_score: number; money_saved_dollars: number; fuel_saved_gallons: number; co2_saved_lbs: number } | null
    gasStations: Array<{ name: string; address?: string; regular: number; distance_miles: number }>
    fuelPricePerGal: number
  }>({ analytics: null, gasStations: [], fuelPricePerGal: 3.29 })
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [currentLanes, setCurrentLanes] = useState<Lane[]>([])
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const unsubscribeFriendsRef = useRef<(() => void) | null>(null)
  const isSharingLocationRef = useRef(true)
  const followingFriendIdRef = useRef<string | null>(null)
  const friendLocationsRef = useRef<FriendLocation[]>([])
  const userRef = useRef<{ id?: string } | null>(null)
  const navigationDataRef = useRef<NavigationState | null>(null)

  // User location (mock - Columbus, OH)
  const [userLocation, setUserLocation] = useState({ lat: 39.9612, lng: -82.9988 })

  // Friend location sharing
  const [friendLocations, setFriendLocations] = useState<FriendLocation[]>([])
  const [selectedFriend, setSelectedFriend] = useState<FriendLocation | null>(null)
  const [followingFriendId, setFollowingFriendId] = useState<string | null>(null)
  const [isSharingLocation, setIsSharingLocation] = useState(true)
  
  // User plan state
  const [userPlan, setUserPlan] = useState<'basic' | 'premium' | null>(null)
  const [gemMultiplier, setGemMultiplier] = useState(1)
  
  // Car customization state
  const [userCar, setUserCar] = useState({
    category: 'sedan',
    variant: 'sedan-classic',
    color: 'midnight-black',
  })
  const [ownedColors, setOwnedColors] = useState<string[]>([])
  const [carHeading, setCarHeading] = useState(0) // Direction for nav marker
  
  // Data states
  const [locations, setLocations] = useState<SavedLocation[]>([])
  const [routes, setRoutes] = useState<SavedRoute[]>([])
  const [offers, setOffers] = useState<Offer[]>([])
  const [challenges, setChallenges] = useState<Record<string, unknown>[]>([])
  const [badges, setBadges] = useState<Record<string, unknown>[]>([])
  const [skins, setSkins] = useState<Record<string, unknown>[]>([])
  const [family, setFamily] = useState<FamilyMember[]>([])
  const [roadReports, setRoadReports] = useState<RoadReport[]>([])
  
  // Fresh user state - starts empty
  const [userData, setUserData] = useState<Record<string, unknown>>({
    id: '123456',
    name: user?.name || 'Driver',
    gems: 0, level: 1, xp: 0, safety_score: 100, streak: 0,
    total_miles: 0, total_trips: 0, badges_earned_count: 0, rank: 0,
    is_premium: false, member_since: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), 
    friends_count: 0, state: 'OH',
    plan: null, gem_multiplier: 1, safe_drive_streak: 0,
    reports_posted: 0, reports_upvotes_received: 0
  })
  
  // Widget states - positioned below location panel (which ends around y=280)
  const [widgets, setWidgets] = useState<Record<string, WidgetState>>({
    score: { visible: false, collapsed: true, position: { x: 12, y: 290 } },
    gems: { visible: false, collapsed: true, position: { x: 260, y: 290 } },
  })
  
  // Navigation & settings states
  const [isNavigating, setIsNavigating] = useState(false)
  const [traveledDistanceMeters, setTraveledDistanceMeters] = useState(0)
  const [needsCompassPermission, setNeedsCompassPermission] = useState(
    typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function'
  )
  const [isMuted, setIsMuted] = useState(false)
  const [isNavOrionListening, setIsNavOrionListening] = useState(false)
  const [currentSpeed, setCurrentSpeed] = useState(0)
  const [offerFilter, setOfferFilter] = useState<'all' | 'gas' | 'cafe'>('all')
  const [badgeFilter, setBadgeFilter] = useState<'all' | 'earned' | 'locked'>('all')
  const [equippedSkin, setEquippedSkin] = useState(1)
  const [favorites, setFavorites] = useState<number[]>([])
  
  // Form states
  const [newLocation, setNewLocation] = useState({ name: '', address: '', category: 'favorite' })
  const [newRoute, setNewRoute] = useState({ name: '', origin: '', destination: '', departure_time: '08:00', days_active: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], notifications: true })
  const [routeLimit, setRouteLimit] = useState(5) // 5 free, 20 premium
  const [originSuggestions, setOriginSuggestions] = useState<{ name: string; address: string; lat?: number; lng?: number }[]>([])
  const [destinationSuggestions, setDestinationSuggestions] = useState<{ name: string; address: string; lat?: number; lng?: number }[]>([])
  const routeAddrDebounceRef = useRef<Record<'origin' | 'destination', ReturnType<typeof setTimeout> | null>>({ origin: null, destination: null })
  
  // Swipe state for locations
  const [swipeOffset, setSwipeOffset] = useState(0)
  const swipeRef = useRef<HTMLDivElement>(null)
  const startX = useRef(0)

  const loadRoadReports = async () => {
    try {
      const res = await api.get<{ success?: boolean; data?: any[]; total?: number }>(
        `/api/map/traffic?lat=${userLocation.lat}&lng=${userLocation.lng}&radius=15`
      )
      if (!res.success) return
      const raw = res.data as { data?: any[] }
      const list = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : []
      setRoadReports(list)
    } catch { /* traffic reports unavailable */ }
  }

  /** Load trip history polylines for map (same API as Trip Analytics & Route History). */
  const loadTripHistoryForMap = async () => {
    try {
      const res = await api.get<{ success?: boolean; data?: { trips?: Array<{ route_coordinates?: { lat: number; lng: number }[] }> } }>(
        '/api/trips/history/detailed?days=30&limit=50'
      )
      if (!res.success || !res.data) return
      const trips = (res.data as { trips?: Array<{ route_coordinates?: { lat: number; lng: number }[] }> }).trips ?? []
      const polylines = trips
        .filter((t: { route_coordinates?: { lat: number; lng: number }[] }) => t.route_coordinates && t.route_coordinates.length >= 2)
        .map((t: { route_coordinates: { lat: number; lng: number }[] }) => t.route_coordinates)
      setTripHistoryPolylines(polylines)
    } catch { /* trip history for map unavailable */ }
  }

  // Load data on mount
  useEffect(() => {
    loadData()
    loadRoadReports()
    loadTripHistoryForMap()
  }, [])

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
      if (searchResultPhotos[result.place_id]) return
      api.get<{ success?: boolean; data?: { photos?: { reference: string }[] } }>(`/api/places/details/${encodeURIComponent(result.place_id)}`)
        .then((res) => {
          if (cancelled) return
          const data = (res.data as { data?: { photos?: { reference: string }[] } })?.data
          const ref = data?.photos?.[0]?.reference
          if (ref) setSearchResultPhotos((prev) => ({ ...prev, [result.place_id]: ref }))
        })
        .catch(() => {})
    })
    return () => { cancelled = true }
  }, [searchResults])

  // Refetch cameras/road reports when user location changes (e.g. after GPS fix)
  useEffect(() => {
    if (userLocation.lat !== 0 || userLocation.lng !== 0) loadRoadReports()
  }, [userLocation.lat, userLocation.lng])

  // Load nearby offers by user location (skip default Columbus placeholder)
  const loadNearbyOffers = useCallback(async () => {
    try {
      const res = await api.get<{ success?: boolean; data?: Offer[] }>(
        `/api/offers/nearby?lat=${userLocation.lat}&lng=${userLocation.lng}&radius=5`
      )
      const data = payload<Offer[]>(res) ?? (res?.data as { data?: Offer[] })?.data
      if (Array.isArray(data)) setOffers(data)
    } catch (e) {
      console.warn('Offers fetch failed:', e)
    }
  }, [userLocation.lat, userLocation.lng])
  useEffect(() => {
    if (userLocation.lat === 39.9612 && userLocation.lng === -82.9988) return
    loadNearbyOffers()
  }, [userLocation.lat, userLocation.lng, loadNearbyOffers])

  // ---------- Map layer picker: apply to Google Maps instance ----------
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !mapReadyForLayers) return
    switch (activeMapLayer) {
      case 'dark':
        map.setOptions({
          styles: [
            { elementType: 'geometry', stylers: [{ color: '#212121' }] },
            { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
            { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
            { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
            { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#383838' }] },
            { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212121' }] },
            { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
            { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] },
            { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f2835' }] },
            { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f3d19c' }] },
            { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
            { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
            { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#2c2c2c' }] },
            { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#263c3f' }] },
            { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
            { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#757575' }] },
            { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#212121' }] },
          ],
          mapTypeId: 'roadmap',
        })
        break
      case 'satellite':
        map.setOptions({ styles: [], mapTypeId: 'satellite' })
        break
      case 'hybrid':
        map.setOptions({ styles: [], mapTypeId: 'hybrid' })
        break
      case 'standard':
      default:
        map.setOptions({ styles: [], mapTypeId: 'roadmap' })
        break
    }
  }, [activeMapLayer, mapReadyForLayers])

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return
    if (showTrafficLayer) {
      if (!trafficLayerRef.current) {
        trafficLayerRef.current = new google.maps.TrafficLayer()
      }
      trafficLayerRef.current.setMap(map)
    } else {
      if (trafficLayerRef.current) {
        trafficLayerRef.current.setMap(null)
      }
    }
  }, [showTrafficLayer, mapReadyForLayers])

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return
    incidentMarkersRef.current.forEach((m) => m.setMap(null))
    incidentMarkersRef.current = []
    if (!showIncidentsLayer) return
    fetch(
      `https://publicapi.ohgo.com/api/v1/incidents?api-key=${OHGO_API_KEY}&radius=${userLocation.lat},${userLocation.lng},25`
    )
      .then((r) => r.json())
      .then((data: { results?: Array<{ latitude?: number; longitude?: number; description?: string; type?: string; location?: string }> }) => {
        (data.results ?? []).forEach((incident) => {
          if (incident.latitude == null || incident.longitude == null) return
          const marker = new google.maps.Marker({
            position: { lat: incident.latitude, lng: incident.longitude },
            map,
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="14" cy="14" r="13" fill="#FF9500" stroke="white" stroke-width="2"/>
                  <text x="14" y="19" text-anchor="middle" fill="white" font-size="14" font-weight="bold">!</text>
                </svg>
              `),
              scaledSize: new google.maps.Size(28, 28),
              anchor: new google.maps.Point(14, 14),
            },
            title: incident.description ?? 'Incident',
            zIndex: 100,
          })
          marker.addListener('click', () => {
            new google.maps.InfoWindow({
              content: `
                <div style="padding:8px;max-width:200px">
                  <strong style="font-size:13px">${(incident.type ?? 'Incident').replace(/</g, '&lt;')}</strong>
                  <p style="font-size:12px;margin:4px 0;color:#666">${(incident.description ?? '').replace(/</g, '&lt;')}</p>
                  <p style="font-size:11px;color:#999">${(incident.location ?? '').replace(/</g, '&lt;')}</p>
                </div>
              `,
            }).open(map, marker)
          })
          incidentMarkersRef.current.push(marker)
        })
      })
      .catch(() => {})
  }, [showIncidentsLayer, userLocation.lat, userLocation.lng, mapReadyForLayers])

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return
    constructionMarkersRef.current.forEach((m) => m.setMap(null))
    constructionMarkersRef.current = []
    if (!showConstructionLayer) return
    fetch(
      `https://publicapi.ohgo.com/api/v1/construction?api-key=${OHGO_API_KEY}&radius=${userLocation.lat},${userLocation.lng},25`
    )
      .then((r) => r.json())
      .then((data: { results?: Array<{ latitude?: number; longitude?: number; description?: string; location?: string; status?: string }> }) => {
        (data.results ?? []).forEach((item) => {
          if (item.latitude == null || item.longitude == null) return
          const marker = new google.maps.Marker({
            position: { lat: item.latitude, lng: item.longitude },
            map,
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="14" cy="14" r="13" fill="#FF6B00" stroke="white" stroke-width="2"/>
                  <text x="14" y="19" text-anchor="middle" fill="white" font-size="12">🚧</text>
                </svg>
              `),
              scaledSize: new google.maps.Size(28, 28),
              anchor: new google.maps.Point(14, 14),
            },
            title: item.description ?? 'Construction',
            zIndex: 100,
          })
          marker.addListener('click', () => {
            new google.maps.InfoWindow({
              content: `
                <div style="padding:8px;max-width:200px">
                  <strong style="font-size:13px">🚧 Construction</strong>
                  <p style="font-size:12px;margin:4px 0;color:#666">${(item.description ?? '').replace(/</g, '&lt;')}</p>
                  <p style="font-size:11px;color:#999">${(item.location ?? '').replace(/</g, '&lt;')}${item.status ? ` • ${item.status}` : ''}</p>
                </div>
              `,
            }).open(map, marker)
          })
          constructionMarkersRef.current.push(marker)
        })
      })
      .catch(() => {})
  }, [showConstructionLayer, userLocation.lat, userLocation.lng, mapReadyForLayers])

  // Fetch OHGO cameras when cameras layer is on (Premium only)
  useEffect(() => {
    if (!userData.is_premium || !showCameraLayer || (userLocation.lat === 0 && userLocation.lng === 0)) return
    fetch(
      `https://publicapi.ohgo.com/api/v1/cameras?api-key=${OHGO_API_KEY}&radius=${userLocation.lat},${userLocation.lng},25`
    )
      .then((r) => r.json())
      .then((data: { results?: Array<{ id: string | number; latitude: number; longitude: number; mainRoute?: string; location?: string; cameraViews?: Array<{ id: string | number; smallUrl?: string; largeUrl?: string; small_url?: string; large_url?: string; direction?: string }> }> }) => {
        const list: OHGOCamera[] = (data.results ?? []).map((cam) => ({
          id: String(cam.id),
          latitude: cam.latitude,
          longitude: cam.longitude,
          mainRoute: cam.mainRoute ?? '',
          location: cam.location ?? '',
          cameraViews: (cam.cameraViews ?? []).map((v) => ({
            id: String(v.id),
            smallUrl: (v.smallUrl ?? (v as { small_url?: string }).small_url ?? '').trim(),
            largeUrl: (v.largeUrl ?? (v as { large_url?: string }).large_url ?? '').trim(),
            direction: v.direction ?? '',
          })),
        }))
        setOhgoCameras(list)
      })
      .catch(() => setOhgoCameras([]))
  }, [userData.is_premium, showCameraLayer, userLocation.lat, userLocation.lng])

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return
    cameraMarkersRef.current.forEach((m) => m.setMap(null))
    cameraMarkersRef.current = []
    if (!showCameraLayer || ohgoCameras.length === 0) return
    ohgoCameras.forEach((cam) => {
      const marker = new google.maps.Marker({
        position: { lat: cam.latitude, lng: cam.longitude },
        map,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
              <circle cx="14" cy="14" r="13" fill="#1C1C1E" stroke="white" stroke-width="2"/>
              <text x="14" y="19" text-anchor="middle" fill="white" font-size="13">📷</text>
            </svg>
          `),
          scaledSize: new google.maps.Size(28, 28),
          anchor: new google.maps.Point(14, 14),
        },
        title: cam.mainRoute || 'Traffic Camera',
        zIndex: 90,
      })
      marker.addListener('click', () => setSelectedCamera(cam))
      cameraMarkersRef.current.push(marker)
    })
  }, [showCameraLayer, ohgoCameras, mapReadyForLayers])

  // Driver Analytics modal: pull actual trip analytics + fuel prices when opened
  useEffect(() => {
    if (!showFuelDashboard) return
    let cancelled = false
    const load = async () => {
      try {
        const [tripRes, fuelRes] = await Promise.all([
          api.get<{ success?: boolean; data?: { analytics?: { avg_safety_score: number; money_saved_dollars: number; fuel_saved_gallons: number; co2_saved_lbs: number } } }>('/api/trips/history/detailed?days=30&limit=50'),
          api.get<{ success?: boolean; data?: { nearby_stations?: Array<{ name: string; address?: string; regular: number; distance_miles: number }>; prices?: { regular?: number } } }>(`/api/fuel/prices?lat=${userLocation.lat}&lng=${userLocation.lng}`),
        ])
        if (cancelled) return
        const analytics = tripRes?.data && (tripRes.data as { analytics?: typeof driverAnalyticsData.analytics }).analytics ? (tripRes.data as { analytics: typeof driverAnalyticsData.analytics }).analytics : null
        const fuelData = fuelRes?.data as { nearby_stations?: Array<{ name: string; address?: string; regular: number; distance_miles: number }>; prices?: { regular?: number } } | undefined
        const stations = fuelData?.nearby_stations ?? []
        const pricePerGal = fuelData?.prices?.regular ?? (stations[0]?.regular) ?? 3.29
        setDriverAnalyticsData({ analytics: analytics ?? null, gasStations: stations, fuelPricePerGal: pricePerGal })
      } catch {
        if (!cancelled) setDriverAnalyticsData(prev => ({ ...prev, analytics: null, gasStations: [], fuelPricePerGal: prev.fuelPricePerGal }))
      }
    }
    load()
    return () => { cancelled = true }
  }, [showFuelDashboard, userLocation.lat, userLocation.lng])

  // Sync userLocation from VehicleState when live (for search/directions)
  useEffect(() => {
    if (isLive && vehicle?.coordinate) {
      setUserLocation({ lat: vehicle.coordinate.lat, lng: vehicle.coordinate.lng })
    }
  }, [isLive, vehicle?.coordinate?.lat, vehicle?.coordinate?.lng])

  // GPS watcher: high accuracy, real position/heading/speed (runs on mount)
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      (err) => console.warn('Initial position failed:', err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )

    const onWatch = (pos: GeolocationPosition) => {
      const lat = pos.coords.latitude
      const lng = pos.coords.longitude
      const heading = pos.coords.heading
      const speed = pos.coords.speed

      const newLoc = { lat, lng }
      setUserLocation(newLoc)

      // Traveled distance tracking
      const prev = prevLocationRef.current
      if (prev && isNavigatingRef.current) {
        const R = 6371000
        const dLat = ((lat - prev.lat) * Math.PI) / 180
        const dLng = ((lng - prev.lng) * Math.PI) / 180
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((prev.lat * Math.PI) / 180) * Math.cos((lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
        const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        if (dist > 0 && dist < 100) {
          traveledDistanceRef.current += dist
          setTraveledDistanceMeters(traveledDistanceRef.current)
        }
      }
      prevLocationRef.current = newLoc

      // Heading calculation
      if (typeof heading === 'number' && heading >= 0 && (speed ?? 0) > 0.5) {
        setCarHeading(heading)
        carHeadingRef.current = heading
      } else if (prev) {
        const dLng = ((lng - prev.lng) * Math.PI) / 180
        const lat1 = (prev.lat * Math.PI) / 180
        const lat2 = (lat * Math.PI) / 180
        const y = Math.sin(dLng) * Math.cos(lat2)
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
        const h = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
        setCarHeading(h)
        carHeadingRef.current = h
      }

      // Speed
      const speedMph = typeof speed === 'number' && speed >= 0 ? Math.round(speed * 2.237) : 0
      setCurrentSpeed(speedMph)

      // First zoom
      if (!hasZoomedToUser.current && zoomToUserRef.current) {
        hasZoomedToUser.current = true
        zoomToUserRef.current(lat, lng, false)
      }

      // Follow during navigation
      if (isNavigatingRef.current && zoomToUserRef.current) {
        zoomToUserRef.current(lat, lng, true)
      }

      // Broadcast my location to Supabase for friends (when sharing)
      const uid = userRef.current?.id
      if (isSharingLocationRef.current && uid) {
        const speedMph = typeof speed === 'number' && speed >= 0 ? speed * 2.237 : 0
        updateMyLocation(
          uid,
          lat,
          lng,
          carHeadingRef.current ?? 0,
          speedMph,
          isNavigatingRef.current,
          isNavigatingRef.current ? navigationDataRef.current?.destination?.name : undefined
        ).catch(() => {})
      }

      // Auto-follow friend on map when following mode is on
      const fid = followingFriendIdRef.current
      if (fid && mapInstanceRef.current) {
        const followed = friendLocationsRef.current.find((f) => f.id === fid)
        if (followed) {
          mapInstanceRef.current.panTo({ lat: followed.lat, lng: followed.lng })
        }
      }
    }

    const watchId = navigator.geolocation.watchPosition(
      onWatch,
      (err) => console.warn('Watch position failed:', err.message),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  // Free users: disable camera layer and location sharing
  useEffect(() => {
    if (!userData.is_premium) {
      setShowCameraLayer(false)
      setIsSharingLocation(false)
    }
  }, [userData.is_premium])

  // Car Studio is premium-only: reset Rewards sub-tab if free user had carstudio selected
  useEffect(() => {
    if (!userData.is_premium && rewardsTab === 'carstudio') setRewardsTab('offers')
  }, [userData.is_premium, rewardsTab])

  const hasAnnouncedArrivalRef = useRef(false)
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
      userName: user?.user_metadata?.full_name?.split(' ')[0],
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

  // Friend location sync: load friends list, initial positions, subscribe to real-time updates
  useEffect(() => {
    const uid = (user as { id?: string } | undefined)?.id
    if (!uid) return

    const initFriends = async () => {
      try {
        const res = await api.get<{ data?: Array<{ friend_id?: string; id?: string; status?: string }> }>('/api/friends/list')
        const friendsList = payload<Array<{ friend_id?: string; id?: string; status?: string }>>(res) ?? []
        const friendIds = friendsList
          .filter((f) => f.status === 'accepted')
          .map((f) => f.friend_id ?? f.id)
          .filter(Boolean) as string[]

        if (friendIds.length === 0) return

        const initial = await getFriendLocations(friendIds)
        setFriendLocations(initial)

        unsubscribeFriendsRef.current = subscribeFriendLocations(friendIds, (updated) => {
          setFriendLocations((prev) => {
            const idx = prev.findIndex((f) => f.id === updated.id)
            if (idx >= 0) {
              const next = [...prev]
              next[idx] = updated
              return next
            }
            return [...prev, updated]
          })
        })
      } catch (e) {
        console.warn('Friend locations init failed:', e)
      }
    }

    initFriends()
    return () => {
      unsubscribeFriendsRef.current?.()
    }
  }, [(user as { id?: string } | undefined)?.id])

  // Device orientation (compass): auto-add when requestPermission not required; on iOS 13+ add only after user grants via banner
  useEffect(() => {
    const reqPerm = (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission
    if (typeof reqPerm === 'function' && needsCompassPermission) return

    let lastCompassUpdate = 0
    const handler = (e: DeviceOrientationEvent) => {
      const now = Date.now()
      if (now - lastCompassUpdate < 500) return
      lastCompassUpdate = now
      const h = (e as unknown as { webkitCompassHeading?: number }).webkitCompassHeading
      if (typeof h === 'number' && !Number.isNaN(h)) {
        setCarHeading(h)
        carHeadingRef.current = h
      }
    }
    window.addEventListener('deviceorientation', handler)
    return () => window.removeEventListener('deviceorientation', handler)
  }, [needsCompassPermission])

  // Poll backend ETA endpoint during navigation
  useEffect(() => {
    if (!isNavigating || !navigationData?.destination) { setLiveEta(null); return }
    let cancelled = false
    const poll = async () => {
      try {
        const v = vehicle?.coordinate ?? userLocation
        const d = navigationData.destination
        const rawSpd = vehicle?.velocity ? Math.round(vehicle.velocity * 2.237) : 30
        const spd = Math.max(rawSpd, 15)
        const res = await api.get<{ data?: { distance_miles: number; eta_minutes: number } }>(
          `/api/navigation/eta?origin_lat=${v.lat}&origin_lng=${v.lng}&dest_lat=${d.lat}&dest_lng=${d.lng}&speed_mph=${spd}`
        )
        if (!cancelled && res.success && (res.data as any)?.data) {
          const d2 = (res.data as any).data
          // Use real route distance when available so miles and minutes stay consistent
          const routeMiles = (navigationData.distance as { miles?: number })?.miles
          const remainingMiles =
            typeof routeMiles === 'number'
              ? Math.max(0, routeMiles - traveledDistanceMeters / 1609.34)
              : d2.distance_miles

          // Recompute ETA from remaining distance and current speed so "Distance" and "Time"
          // always match. Backend returns the speed it used in d2.speed_mph.
          const speedForEta = typeof d2.speed_mph === 'number' && d2.speed_mph > 0 ? d2.speed_mph : spd
          const etaMinutes = Math.round((remainingMiles / speedForEta) * 60)

          setLiveEta({ distanceMiles: remainingMiles, etaMinutes })
        }
      } catch { /* silent */ }
    }
    poll()
    const id = setInterval(poll, 60000)
    return () => { cancelled = true; clearInterval(id) }
  }, [isNavigating, navigationData?.destination?.lat, navigationData?.destination?.lng, navigationData?.distance, traveledDistanceMeters, vehicle?.coordinate, userLocation])

  // Poll route notifications (reminders, leave-by, faster route) when user has routes with notifications on
  const hasRouteNotificationsOn = routes.some((r: SavedRoute) => r.notifications && (r as { is_active?: boolean; active?: boolean }).is_active !== false && (r as { active?: boolean }).active !== false)
  useEffect(() => {
    if (!hasRouteNotificationsOn || isNavigating) return
    const fetchNotifications = async () => {
      try {
        const res = await api.get<{ success?: boolean; data?: typeof routeNotifications }>(
          `/api/routes/notifications?lat=${userLocation.lat}&lng=${userLocation.lng}&window_minutes=60`
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
      const [locRes, routeRes, offerRes, badgeRes, skinRes, famRes, userRes, challengeRes, carRes, onboardingRes] = await Promise.all([
        api.get('/api/locations'),
        api.get('/api/routes'),
        api.get('/api/offers'),
        api.get('/api/badges'),
        api.get('/api/skins'),
        api.get('/api/family/members'),
        api.get('/api/user/profile'),
        api.get('/api/challenges'),
        api.get('/api/user/car'),
        api.get('/api/user/onboarding-status')
      ])
      const loc = payload(locRes) ?? locRes.data
      const route = payload(routeRes) ?? routeRes.data
      const offer = payload(offerRes) ?? offerRes.data
      const badge = payload(badgeRes) ?? badgeRes.data
      const skin = payload(skinRes) ?? skinRes.data
      const fam = payload(famRes) ?? famRes.data
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
      if (famRes.success && fam != null) setFamily(Array.isArray(fam) ? fam : [])
      if (userRes.success && user != null && typeof user === 'object') {
        setUserData(user as typeof userData)
        setUserPlan((user as { plan?: string }).plan || 'basic')
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
    } catch (e) {
      console.log('Using mock data')
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
  const handlePlanSelect = async (plan: 'basic' | 'premium') => {
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
        toast.success(plan === 'premium' ? '🎉 Welcome to Premium!' : 'Plan selected!')
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

  // Road Reports handlers
  const handleCreateReport = async (report: { type: string; title: string; description: string; lat: number; lng: number }) => {
    try {
      const res = await api.post('/api/reports', report)
      if (res.success) {
        toast.success((res.data as { message?: string })?.message ?? 'Report created')
        loadData()
      }
      return res
    } catch (e) {
      toast.error('Failed to create report')
      return { success: false }
    }
  }

  const handleUpvoteReport = async (reportId: number) => {
    try {
      const res = await api.post(`/api/reports/${reportId}/upvote`)
      if (res.success) {
        toast.success((res.data as { message?: string })?.message ?? 'Upvoted')
      } else {
        toast.error((res.data as { message?: string })?.message ?? 'Failed to upvote')
      }
      return res
    } catch (e) {
      toast.error('Failed to upvote')
      return { success: false }
    }
  }

  // Orion voice report handler
  const handleOrionReport = async (report: { type: string; direction: string; lat: number; lng: number }) => {
    try {
      const res = await api.post('/api/reports', {
        type: report.type,
        title: `${report.type.charAt(0).toUpperCase() + report.type.slice(1)} ${report.direction}`,
        description: `Reported via Orion voice command`,
        lat: report.lat,
        lng: report.lng,
      })
      if (res.success) {
        toast.success(`${report.type} reported ${report.direction}! +500 XP`)
        loadData()
      } else {
        toast.error((res.data as { message?: string })?.message ?? 'Could not submit report')
      }
    } catch (e) {
      toast.error('Could not submit report')
    }
  }

  const handleQuickPhotoReport = async (report: { type: string; photo_url: string; lat: number; lng: number }) => {
    try {
      const isIconOnly = !report.photo_url || report.photo_url.length === 0
      const res = await api.post('/api/reports', {
        type: report.type,
        title: isIconOnly ? `Report: ${report.type}` : `Photo report: ${report.type}`,
        description: isIconOnly ? `Reported via quick report` : 'Photo report submitted',
        lat: report.lat,
        lng: report.lng,
        photo_url: report.photo_url || undefined,
      })
      if (res.success) {
        toast.success(isIconOnly ? 'Report posted! +500 XP' : 'Photo report posted! +500 XP')
        loadData()
        loadRoadReports()
        setRoadReports((prev) => [...prev, { id: Date.now(), type: report.type, lat: report.lat, lng: report.lng, title: `Report: ${report.type}` }])
        return res
      }
      toast.error((res.data as { message?: string })?.message ?? 'Could not post report')
      return { success: false, data: res.data }
    } catch (e) {
      toast.error('Could not post photo report')
      return { success: false }
    }
  }

  // When set, the next tap on the map will place a lightweight incident report at that location.
  const [pendingIncidentPlacement, setPendingIncidentPlacement] = useState<{ type: string } | null>(null)

  // Redeem offer handler (shared api: res.data = backend body; backend returns { data: { gems_earned, xp_earned } })
  const handleRedeemOffer = async (offerId: number) => {
    try {
      const res = await api.post<{ success?: boolean; message?: string; data?: { gems_earned?: number; xp_earned?: number } }>(`/api/offers/${offerId}/redeem`)
      const body = res.data
      if (res.success && body) {
        const inner = body.data ?? body
        toast.success((body as { message?: string }).message ?? 'Offer redeemed!')
        setUserData((prev: any) => ({ 
          ...prev, 
          gems: prev.gems + ((inner as { gems_earned?: number }).gems_earned ?? 0),
          xp: prev.xp + ((inner as { xp_earned?: number }).xp_earned ?? 0)
        }))
        api.post('/api/analytics/track', { event: 'offer_redeemed', properties: { offer_id: offerId } }).catch(() => {})
        loadData()
      } else {
        toast.error((body as { message?: string })?.message ?? 'Could not redeem offer')
      }
      return res
    } catch (e) {
      toast.error('Could not redeem offer')
      return { success: false }
    }
  }

  // Claim challenge reward (shared api: res.data = backend body; backend returns { message, data: { gems_earned } })
  const handleClaimChallenge = async (challengeId: number) => {
    try {
      const res = await api.post<{ success?: boolean; message?: string; data?: { gems_earned?: number } }>(`/api/challenges/${challengeId}/claim`)
      const body = res.data
      if (res.success && body) {
        const inner = body.data ?? body
        toast.success((body as { message?: string }).message ?? 'Reward claimed!')
        setChallenges(challenges.map(c => c.id === challengeId ? { ...c, claimed: true } : c))
        setUserData((prev: any) => ({ ...prev, gems: prev.gems + ((inner as { gems_earned?: number }).gems_earned ?? 0) }))
      } else {
        toast.error((body as { message?: string })?.message ?? 'Could not claim reward')
      }
    } catch (e) {
      toast.error('Could not claim reward')
    }
  }

  // Share trip score - opens the share modal with trip data
  const handleShareTrip = async () => {
    // Create sample trip data (in real app, this would come from completed trip)
    const tripData = {
      distance: 12.5,
      duration: 25,
      safety_score: userData.safety_score,
      gems_earned: 5 * userData.gem_multiplier,
      xp_earned: 1000,
      origin: 'Current Location',
      destination: 'Destination',
      date: new Date().toLocaleDateString(),
      is_safe_drive: true
    }
    setLastTripData(tripData)
    setShowShareTrip(true)
  }

  // Open share modal after trip completion
  const handleTripComplete = (tripResult: any) => {
    if (tripResult) {
      setLastTripData({
        distance: tripResult.distance || 10,
        duration: tripResult.duration || 20,
        safety_score: tripResult.safety_score?.new || userData.safety_score,
        gems_earned: tripResult.gems?.earned || 5,
        xp_earned: tripResult.xp?.total_earned || 1000,
        origin: 'Start',
        destination: 'End',
        date: new Date().toLocaleDateString(),
        is_safe_drive: tripResult.is_safe_drive || false
      })
      setShowShareTrip(true)
    }
  }

  // Handle direct offer redemption (opens compact popup)
  const handleDirectRedemption = (offer: any) => {
    setSelectedOfferForRedemption(offer)
    setShowRedemptionPopup(true)
  }

  // Old share trip function for backwards compatibility
  const handleShareTripLegacy = async () => {
    try {
      const res = await api.post('/api/trips/1/share')
      if (res.success) {
        toast.success('Share content generated! Copy to clipboard.')
        // In a real app, this would open native share sheet
      }
    } catch (e) {
      toast.success('🚗 Just completed a trip with 92 safety score! #SnapRoad')
    }
  }

  // Swipe handlers for locations
  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
  }
  
  const handleTouchMove = (e: React.TouchEvent) => {
    const diff = e.touches[0].clientX - startX.current
    setSwipeOffset(diff)
  }
  
  const handleTouchEnd = () => {
    if (swipeOffset > 50) {
      // Swipe right - previous category
      const cats: LocationCategory[] = ['home', 'work', 'favorites']
      const idx = cats.indexOf(locationCategory)
      if (idx > 0) setLocationCategory(cats[idx - 1])
    } else if (swipeOffset < -50) {
      // Swipe left - next category
      const cats: LocationCategory[] = ['home', 'work', 'favorites']
      const idx = cats.indexOf(locationCategory)
      if (idx < cats.length - 1) setLocationCategory(cats[idx + 1])
    }
    setSwipeOffset(0)
  }

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

  // Toggle widget visibility
  const toggleWidgetVisibility = async (widgetId: string) => {
    setWidgets(prev => ({
      ...prev,
      [widgetId]: { ...prev[widgetId], visible: !prev[widgetId].visible }
    }))
    try {
      await api.put(`/api/widgets/${widgetId}/toggle`)
    } catch (_e) { /* silently ignore */ }
  }

  // Navigation handlers
  const handleStartNavigation = async (dest?: string) => {
    const tripId = `trip_${Date.now()}`
    setActiveTripId(tripId)
    tripStartTimeRef.current = Date.now()
    traveledDistanceRef.current = 0
    setTraveledDistanceMeters(0)
    setIsNavigating(true)
    isNavigatingRef.current = true
    setShowMenu(false)
    setShowSearch(false)
    if (mode === 'adaptive') {
      toast('Driving mode: Adaptive', { icon: '🟢', duration: 2000 })
    }
    toast.loading('Calculating route...', { duration: 1500 })
    try {
      const res = await api.post('/api/navigation/start', { destination: dest || 'Unknown', origin: 'current_location' })
      api.post('/api/analytics/track', { event: 'navigation_started', properties: { destination: dest, mode } }).catch(() => {})
      if (res.success) {
      setTimeout(() => {
          toast.success((res.data as { message?: string })?.message ?? `Navigating to ${dest || 'destination'}`)
      }, 1500)
      } else {
        toast.error((res.data as { message?: string })?.message ?? 'Could not start navigation')
      }
    } catch (_e) {
      toast.error('Could not start navigation')
    }
  }

  const handleLeaveEarlyForRoute = async (routeId: number) => {
    try {
      const res = await api.post<{ success?: boolean; data?: { leave_by: string; eta_minutes: number; destination: string } }>(
        `/api/routes/${routeId}/notify-leave-early`,
        { origin_lat: userLocation.lat, origin_lng: userLocation.lng }
      )
      if (res.success && (res.data as any)?.data) {
        const d = (res.data as any).data
        setLeaveEarlyForRoute({ routeId, leaveBy: d.leave_by, etaMinutes: d.eta_minutes, destination: d.destination })
      }
    } catch {
      toast.error('Could not get leave-by time')
    }
  }

  const handleRequestEndNavigation = () => {
    setShowEndConfirm(true)
  }

  const handleConfirmEndNavigation = async () => {
    setShowEndConfirm(false)
    const tripIdToEnd = activeTripId
    const tripStart = tripStartTimeRef.current
    const durationMin = tripStart ? Math.round((Date.now() - tripStart) / 60000) : 5
    const safetyScore = vehicle ? Math.max(60, Math.round(100 - (getDrivingMetrics().style.aggression * 30))) : 85
    const distMeters = (navigationData?.distance as { meters?: number })?.meters
    const distMiles = distMeters ? distMeters / 1609.34 : durationMin * 0.5
    const gemsEarned = Math.round(5 * (userData.gem_multiplier || 1))

    const originName = navigationData?.origin?.name ?? 'Start'
    const destName = navigationData?.destination?.name ?? 'End'
    const polyline = navigationData?.polyline && navigationData.polyline.length >= 2 ? navigationData.polyline : []

    try {
      await api.post('/api/navigation/stop')
      await api.post('/api/trips/complete-with-safety', {
        trip_id: tripIdToEnd,
        distance: distMiles,
        duration: durationMin,
        safety_score: safetyScore,
        safety_metrics: { hard_brakes: 0, speeding_incidents: 0, phone_usage: 0 },
        origin: originName,
        destination: destName,
        route_coordinates: polyline.map(p => ({ lat: p.lat, lng: p.lng })),
      })
      await api.post('/api/analytics/track', { event: 'trip_completed', properties: { trip_id: tripIdToEnd, duration: durationMin, mode } })
    } catch (_e) {
      toast.error('Could not stop navigation')
    }

    setShowTripSummary(true)
    setLastTripData({
      distance: distMiles,
      duration: durationMin,
      safety_score: safetyScore,
      gems_earned: gemsEarned,
      xp_earned: 1000,
      origin: 'Start',
      destination: navigationData?.destination?.name ?? 'End',
      date: new Date().toLocaleDateString(),
      is_safe_drive: safetyScore >= 80,
    })
    setIsNavigating(false)
    isNavigatingRef.current = false
    setShowTurnByTurn(false)
    setNavigationData(null)
    setSelectedDestination(null)
    setCurrentStepIndex(0)
    setRoutePolyline(null)
  }

  const handleDismissTripSummary = () => {
    setShowTripSummary(false)
    setLastTripData(null)
    loadTripHistoryForMap() // refresh map history layer so new trip appears
    toast.success('Trip completed!')
  }

  // Search location: Google Places (via backend) first, then backend /api/map/search fallback
  const handleSearchLocations = async (query: string) => {
    if (query.length < 1) {
      setSearchResults([])
      return
    }
    setIsSearching(true)
    setSearchResults([])
    try {
      // 1) Google Places autocomplete via backend
      try {
        const placeRes = await api.get<{ success?: boolean; data?: Array<{ place_id?: string; name?: string; address?: string; description?: string }> }>(
          `/api/places/autocomplete?q=${encodeURIComponent(query)}&lat=${userLocation.lat}&lng=${userLocation.lng}`
        )
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
      // 2) Backend /api/map/search fallback
      const params = new URLSearchParams({
        q: query,
        lat: userLocation.lat.toString(),
        lng: userLocation.lng.toString(),
        limit: '8'
      })
      const res = await api.get<{ success?: boolean; data?: unknown[] }>(`/api/map/search?${params}`)
      if (res.success && res.data) {
        const list = (res.data as { data?: unknown[] })?.data ?? res.data
        setSearchResults(Array.isArray(list) ? list : [])
      }
    } catch (e) {
      console.error('Search error:', e)
    }
    setIsSearching(false)
  }

  // Handle search input change with debounce
  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    if (query.length === 0) setSearchResultPhotos({})
    if (query.length > 0) {
      searchTimeoutRef.current = setTimeout(() => handleSearchLocations(query), 300)
    } else {
      setSearchResults([])
    }
  }

  const fetchDirections = async (destination: any) => {
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
      const routes = await getGoogleDirections({ lat: oLat, lng: oLng }, { lat: dLat, lng: dLng })

      if (!routes?.length || !routes[0].polyline?.length) {
        console.warn('Directions API returned no route')
        toast.error('Could not get directions. Try another destination.')
        return
      }

      setAvailableRoutes(routes)
      setSelectedRouteIndex(0)
      setSelectedRouteId('fastest')

      const first = routes[0]
      const distMiles = (first.distanceMeters / 1609.34).toFixed(1)
      const etaMin = Math.round(first.expectedTravelTimeSeconds / 60)

      const nav: NavigationState = {
        origin: { lat: oLat, lng: oLng, name: 'Current Location' },
        destination: { lat: dLat, lng: dLng, name: destination?.name ?? 'Destination' },
        steps: first.steps.map(s => ({
          instruction: s.instructions,
          distance: s.distance > 1609 ? `${(s.distance / 1609.34).toFixed(1)} mi` : `${Math.round(s.distance)} ft`,
          distanceMeters: s.distance,
          maneuver: s.maneuver,
          lanes: (s as { lanes?: string }).lanes,
        })),
        polyline: first.polyline,
        duration: { text: etaMin < 60 ? `${etaMin} min` : `${Math.floor(etaMin / 60)}h ${etaMin % 60}m`, seconds: first.expectedTravelTimeSeconds },
        distance: { text: `${distMiles} mi`, meters: first.distanceMeters },
        traffic: 'normal',
      }

      setNavigationData(nav)
      setRoutePolyline(first.polyline)
      setShowRoutePreview(true)
      setCurrentStepIndex(0)
      // Allow map to re-zoom to show full route
      if (zoomToUserRef.current) hasZoomedToUser.current = false
    } catch (e) {
      console.error('Directions error:', e)
      toast.error('Could not get route')
    }
  }

  // Map click: either place a quick incident on the road (when requested), or fetch place details as before.
  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    if (pendingIncidentPlacement) {
      const { type } = pendingIncidentPlacement
      setPendingIncidentPlacement(null)
      await handleQuickPhotoReport({
        type,
        photo_url: '',
        lat,
        lng,
      })
      return
    }

    setIsMuted(true)
    setMapClickedPlace(null)
    setSelectedPlace(null)
    setNearbyLoading(true)

    const map = mapInstanceRef.current
    const g = window.google
    if (map && g?.maps?.places) {
      try {
        const service = new g.maps.places.PlacesService(map)
        service.nearbySearch(
          { location: { lat, lng }, radius: 80 },
          (results, status) => {
            if (status === g.maps.places.PlacesServiceStatus.OK && results?.[0]) {
              const placeId = results[0].place_id
              service.getDetails(
                {
                  placeId,
                  fields: ['name', 'formatted_address', 'geometry', 'rating', 'user_ratings_total', 'opening_hours', 'formatted_phone_number', 'website', 'photos', 'types', 'price_level'],
                },
                (place, status2) => {
                  setNearbyLoading(false)
                  if (status2 !== g.maps.places.PlacesServiceStatus.OK || !place) {
                    fetchNearbyFallback(lat, lng)
                    return
                  }
                  const loc = place.geometry?.location
                  const matchingOffer = offers?.find(
                    (o: Offer) =>
                      (o as { business_name?: string }).business_name?.toLowerCase() === place.name?.toLowerCase() ||
                      (o as { place_id?: string }).place_id === placeId
                  )
                  setSelectedPlace({
                    name: place.name ?? 'Unknown',
                    lat: typeof loc?.lat === 'function' ? loc.lat() : lat,
                    lng: typeof loc?.lng === 'function' ? loc.lng() : lng,
                    address: place.formatted_address,
                    rating: place.rating,
                    totalRatings: place.user_ratings_total ?? undefined,
                    isOpen: place.opening_hours?.isOpen?.(),
                    phone: place.formatted_phone_number ?? undefined,
                    website: place.website ?? undefined,
                    hours: place.opening_hours?.weekday_text,
                    photos: place.photos?.slice(0, 3).map((p: { getUrl?: (opts: { maxWidth: number }) => string }) => p.getUrl?.({ maxWidth: 600 }) ?? ''),
                    types: place.types ?? undefined,
                    priceLevel: place.price_level ?? undefined,
                    matchingOffer: matchingOffer ?? undefined,
                  })
                }
              )
            } else {
              setNearbyLoading(false)
              fetchNearbyFallback(lat, lng)
            }
          }
        )
      } catch {
        setNearbyLoading(false)
        fetchNearbyFallback(lat, lng)
      }
    } else {
      fetchNearbyFallback(lat, lng)
    }

    async function fetchNearbyFallback(lat: number, lng: number) {
      setNearbyLoading(true)
      try {
        const res = await api.get<{ success?: boolean; data?: PlaceCardData[] }>(
          `/api/places/nearby?lat=${lat}&lng=${lng}&radius=80`
        )
        const data = (res.data as { data?: PlaceCardData[] })?.data ?? (res.data as PlaceCardData[] | undefined)
        const list = Array.isArray(data) ? data : []
        const first = list[0]
        if (first) setMapClickedPlace(first)
        else toast.info('No places found at this spot')
      } catch {
        toast.error('Could not load places')
      } finally {
        setNearbyLoading(false)
      }
    }
  }, [offers])

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
    const offer = offers?.find((o) => (o.business_name?.toLowerCase().includes(name) || (o.title ?? '').toLowerCase().includes(name)))
    if (!offer) {
      toast.error(`Couldn't find "${offerName}" in nearby offers.`)
      return
    }
    const lat = offer.lat ?? (offer as { lat?: number }).lat
    const lng = offer.lng ?? (offer as { lng?: number }).lng
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      handleOrionStartNavigation(offer.business_name || offer.title || offerName)
      return
    }
    handleSelectDestination({
      id: 'offer-' + (offer.id ?? 0),
      name: offer.business_name || offer.title || offerName,
      address: (offer as { address?: string }).address ?? '',
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

  const handleGoFromRoutePreview = () => {
    traveledDistanceRef.current = 0
    setTraveledDistanceMeters(0)
    setIsNavigating(true)
    isNavigatingRef.current = true
    hasZoomedToUser.current = false // reset so zoomToUser fires again when nav starts
    setShowTurnByTurn(true)
    setShowRoutePreview(false)
    toast.success(`Navigating to ${navigationData?.destination?.name ?? 'destination'}`)
    const dest = navigationData?.destination?.name ?? 'destination'
    setTimeout(() => {
      const ctx = buildOrionContext()
      chatWithOrion(
        [
          {
            role: 'user',
            content: 'navigation just started, give me a brief encouraging start message',
          },
        ],
        { ...ctx, isNavigating: true, currentRoute: ctx.currentRoute ?? { destination: dest, distanceMiles: 0, remainingMinutes: 0 } }
      )
        .then((startMsg) => {
          if (startMsg && typeof startMsg === 'string') orionSpeak(startMsg, 'high', isMuted)
          else orionSpeak(`Starting navigation to ${dest}. Drive safe!`, 'high', isMuted)
        })
        .catch(() => {
          orionSpeak(`Starting navigation to ${dest}. Drive safe!`, 'high', isMuted)
        })
    }, 500)
    const lat = vehicle?.coordinate?.lat ?? userLocation.lat
    const lng = vehicle?.coordinate?.lng ?? userLocation.lng
    setTimeout(() => {
      if (zoomToUserRef.current) {
        zoomToUserRef.current(lat, lng, true)
      }
    }, 300)
  }

  const handleCancelRoutePreview = () => {
    setShowRoutePreview(false)
    setNavigationData(null)
    setRoutePolyline(null)
    setAvailableRoutes([])
    setSelectedDestination(null)
  }

  // Map route option id to index: fastest = min time, eco = min distance (saves fuel)
  const handleRouteSelect = (id: string) => {
    setSelectedRouteId(id)
    if (!availableRoutes.length || !navigationData?.origin || !navigationData?.destination) return
    let index = 0
    if (id === 'fastest') {
      index = availableRoutes.reduce((best, r, i) => (r.expectedTravelTimeSeconds < availableRoutes[best].expectedTravelTimeSeconds ? i : best), 0)
    } else if (id === 'eco') {
      index = availableRoutes.reduce((best, r, i) => (r.distanceMeters < availableRoutes[best].distanceMeters ? i : best), 0)
    }
    setSelectedRouteIndex(index)
    const r = availableRoutes[index]
    if (!r?.polyline?.length) return
    const distMiles = (r.distanceMeters / 1609.34).toFixed(1)
    const etaMin = Math.round(r.expectedTravelTimeSeconds / 60)
    const nav: NavigationState = {
      origin: navigationData.origin,
      destination: navigationData.destination,
      steps: r.steps.map(s => ({
        instruction: s.instructions,
        distance: s.distance > 1609 ? `${(s.distance / 1609.34).toFixed(1)} mi` : `${Math.round(s.distance)} ft`,
        distanceMeters: s.distance,
        maneuver: s.maneuver,
        lanes: s.lanes,
      })),
      polyline: r.polyline,
      duration: { text: etaMin < 60 ? `${etaMin} min` : `${Math.floor(etaMin / 60)}h ${etaMin % 60}m`, seconds: r.expectedTravelTimeSeconds },
      distance: { text: `${distMiles} mi`, meters: r.distanceMeters },
      traffic: 'normal',
    }
    setNavigationData(nav)
    setRoutePolyline(r.polyline)
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

  const handleDeleteLocation = async (id: number) => {
    try {
      await api.delete(`/api/locations/${id}`)
      setLocations(locations.filter(l => l.id !== id))
      toast.success('Location removed')
    } catch (e) {
      toast.error('Could not remove location')
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

  const handleFavoriteOffer = async (id: number) => {
    const newFavs = favorites.includes(id) ? favorites.filter(f => f !== id) : [...favorites, id]
    setFavorites(newFavs)
    try {
      const res = await api.post(`/api/offers/${id}/favorite`)
      if (res.success) {
      toast.success(favorites.includes(id) ? 'Removed from favorites' : 'Added to favorites!')
      } else {
        setFavorites(favorites)
        toast.error((res.data as { message?: string })?.message ?? 'Could not update favorite')
      }
    } catch (e) {
      setFavorites(favorites)
      toast.error('Could not update favorite')
    }
  }

  // Report incident
  const handleReportIncident = async (type: string, gems: number) => {
    try {
      const res = await api.post('/api/incidents/report', { incident_type: type, location: 'Current location' })
      if (res.success) {
        toast.success((res.data as { message?: string })?.message ?? `Reported ${type}! +${gems} gems`)
      setShowReportModal(false)
      } else {
        toast.error((res.data as { message?: string })?.message ?? 'Could not report incident')
      }
    } catch (e) {
      toast.error('Could not report incident')
    }
  }

  // Family handlers
  const handleCallMember = async (member: any) => {
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

  const handleMessageMember = async (member: any) => {
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
  const handleEquipSkin = async (skinId: number, skin: any) => {
    if (skin.owned) {
      try {
        const res = await api.post(`/api/skins/${skinId}/equip`)
        if (res.success) {
          setEquippedSkin(skinId)
        toast.success(`${skin.name} equipped!`)
        } else {
          toast.error((res.data as { message?: string })?.message ?? 'Could not equip skin')
        }
      } catch (e) {
        toast.error('Could not equip skin')
      }
    } else {
      if (userData.gems >= skin.price) {
        try {
          const res = await api.post(`/api/skins/${skinId}/purchase`)
          if (res.success) {
          toast.success(`Purchased ${skin.name} for ${skin.price} gems!`)
            setEquippedSkin(skinId)
          } else {
            toast.error((res.data as { message?: string })?.message ?? 'Could not purchase skin')
          }
        } catch (e) {
          toast.error('Could not purchase skin')
        }
      } else {
        toast.error(`Need ${skin.price - userData.gems} more gems`)
      }
    }
  }

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
            { icon: BarChart3, label: 'Leaderboard', action: () => { setShowLeaderboard(true); setShowMenu(false) } },
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
            { icon: Route, label: 'My Routes', badge: `${routes.length}/20`, action: () => { setActiveTab('routes'); setShowMenu(false) } },
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

  // Effective map center/zoom/bearing during navigation: follow user at street level (zoom 18 for clarity)
  const navCenter = vehicle?.coordinate ?? userLocation
  const navZoom = 18
  const navBearing = vehicle?.heading ?? carHeading ?? 0

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
  const nearbyNavOffers = useMemo(() => {
    if (!isNavigating || !offers.length) return []
    return offers.filter((offer) => {
      const lat = (offer as { lat?: number; latitude?: number }).lat ?? (offer as { latitude?: number }).latitude
      const lng = (offer as { lng?: number; longitude?: number }).lng ?? (offer as { longitude?: number }).longitude
      if (lat == null || lng == null) return false
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
    const mins = liveEta?.etaMinutes ?? (navigationData?.duration && typeof (navigationData.duration as { seconds?: number }).seconds === 'number'
      ? Math.round(((navigationData.duration as { seconds: number }).seconds) / 60)
      : null)
    if (mins == null || !Number.isFinite(mins)) return '--'
    const arrival = new Date(Date.now() + mins * 60 * 1000)
    return arrival.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }, [liveEta?.etaMinutes, navigationData?.duration])
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
  const currentStepProgress = useMemo(() => {
    if (!navigationData?.steps?.length || !navigationData?.distance?.meters) return 0
    const totalMeters = Number((navigationData.distance as { meters?: number }).meters) || 0
    if (totalMeters <= 0) return 0
    const traveledM =
      typeof liveEta?.distanceMiles === 'number'
        ? Math.max(0, totalMeters - liveEta.distanceMiles * 1609.34)
        : 0
    const progress = Math.min(1, traveledM / totalMeters)
    if (progress >= 1 - 1e-6) return 1
    const stepIndex = progress * navigationData.steps.length
    const currentStep = Math.min(Math.floor(stepIndex), navigationData.steps.length - 1)
    const fractionInStep = stepIndex - currentStep
    return Math.max(0, Math.min(1, fractionInStep))
  }, [navigationData?.steps?.length, navigationData?.distance, liveEta?.distanceMiles])

  // Keep distanceToNextStepRef in sync for camera and lane guide
  const distanceToNextStepMeters = distanceToNextStep * 1609.34
  distanceToNextStepRef.current = distanceToNextStepMeters

  // 3D navigation camera: drive from state when navigating
  useEffect(() => {
    const cam = navCameraRef.current
    if (!cam) return
    const lat = vehicle?.coordinate?.lat ?? userLocation.lat
    const lng = vehicle?.coordinate?.lng ?? userLocation.lng
    const heading = vehicle?.heading ?? carHeading ?? 0
    cam.animate({
      isNavigating: !!isNavigating,
      userHeading: heading,
      userLat: lat,
      userLng: lng,
      speedMph: currentSpeed,
      distanceToNextTurn: distanceToNextStepRef.current ?? distanceToNextStepMeters,
    })
  }, [isNavigating, vehicle?.coordinate?.lat, vehicle?.coordinate?.lng, vehicle?.heading, userLocation.lat, userLocation.lng, carHeading, currentSpeed, distanceToNextStepMeters])

  // Cleanup navigation camera on unmount
  useEffect(() => {
    return () => {
      navCameraRef.current?.destroy()
      navCameraRef.current = null
    }
  }, [])

  // Update lane guide from current step during navigation
  useEffect(() => {
    if (!isNavigating || !navigationData?.steps?.length) {
      setCurrentLanes([])
      return
    }
    const step = navigationData.steps[currentStepIndex]
    if (step) {
      setCurrentLanes(parseLanes(step.maneuver ?? '', step.instruction ?? ''))
    } else {
      setCurrentLanes([])
    }
  }, [isNavigating, navigationData?.steps, currentStepIndex])

  const speak = useCallback(
    (text: string, priority: 'high' | 'normal' = 'normal') => {
      orionSpeak(text, priority, isMuted)
    },
    [isMuted]
  )

  useEffect(() => {
    if (!isNavigating || !navigationData?.destination) {
      hasAnnouncedArrivalRef.current = false
      return
    }
    const remaining =
      typeof liveEta?.distanceMiles === 'number'
        ? liveEta.distanceMiles
        : 0
    if (remaining > 0.05) return
    if (hasAnnouncedArrivalRef.current) return
    hasAnnouncedArrivalRef.current = true
    const dest = navigationData.destination?.name ?? 'your destination'
    chatWithOrion(
      [
        {
          role: 'user',
          content: `we just arrived at the destination, brief congrats. Destination: ${dest}`,
        },
      ],
      buildOrionContext()
    )
      .then((arriveMsg) => orionSpeak(arriveMsg, 'high', isMuted))
      .catch(() => {})
  }, [
    isNavigating,
    navigationData?.destination?.name,
    liveEta?.distanceMiles,
    buildOrionContext,
    isMuted,
  ])

  // Clean Map Tab - theme from Settings > Appearance (isLight)
  const mapContainerBg = isLight ? 'bg-slate-200' : 'bg-slate-800'
  const renderMap = () => (
    <div id="map-container" className={`flex-1 min-h-0 relative overflow-hidden ${mapContainerBg}`}
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
              const reqPerm = (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission
              if (typeof reqPerm !== 'function') return
              const perm = await reqPerm.call(DeviceOrientationEvent)
              if (perm === 'granted') {
                window.addEventListener('deviceorientation', (e: DeviceOrientationEvent) => {
                  const c = (e as unknown as { webkitCompassHeading?: number }).webkitCompassHeading
                  if (typeof c === 'number' && c >= 0) {
                    setCarHeading(c)
                    carHeadingRef.current = c
                  }
                }, true)
                setNeedsCompassPermission(false)
              }
            } catch { /* user denied or error */ }
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
          {routeNotifications.filter((n) => !dismissedRouteNotifIds.has(n.id)).slice(0, 3).map((n) => (
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

      {/* Map: Google Maps (when ready) or loading/error state */}
      {useMap && (
        <>
        <GoogleMapSnapRoad
          center={isNavigating ? navCenter : (camera?.center ?? vehicle?.coordinate ?? userLocation)}
          zoom={isNavigating ? navZoom : (camera?.zoom ?? 15)}
          bearing={isNavigating ? navBearing : camera?.bearing}
          userLocation={vehicle?.coordinate ?? userLocation}
          vehicleHeading={vehicle?.heading ?? carHeading}
          routePolyline={routePolylineForMap}
          fitToRoutePolyline={showRoutePreview && routePolylineForMap?.length ? routePolylineForMap : null}
          tripHistoryPolylines={tripHistoryPolylines}
          destinationCoordinate={(showRoutePreview || isNavigating) && navigationData?.destination ? { lat: navigationData.destination.lat, lng: navigationData.destination.lng } : undefined}
          traveledDistanceMeters={isNavigating ? traveledDistanceMeters : undefined}
          predictedPosition={predicted ? { coordinate: predicted.coordinate, confidence: predicted.confidence } : null}
          routeGlow={experience?.routeGlow}
          mode={mode}
          onRecenter={() => { recenter(); toast.success('Centered on your location') }}
          onOrionClick={() => { if (userData.is_premium) setShowOrionVoice(true); else toast('Upgrade to Premium for Orion', { icon: '🔒' }) }}
          isLiveGps={isLive}
          onMapError={(msg) => { setMapFailed(true); reportMapError(msg) }}
          offers={offers}
          onOfferClick={(offer) => { setSelectedOfferForRedemption(offer); setShowRedemptionPopup(true) }}
          roadReports={roadReports}
          isNavigating={isNavigating}
          navigationSteps={isNavigating && navigationData?.steps ? navigationData.steps : undefined}
          currentStepIndex={currentStepIndex}
          mapType={activeMapLayer}
          showTraffic={showTrafficLayer}
          onOpenLayerPicker={() => setShowLayerPicker(true)}
          contentInsets={mapContentInsets}
          colorScheme={theme}
          onPlaceSelected={(p) => setSelectedPlace(p)}
          onMapClick={handleMapClick}
          onMapReady={(map, zoomToUser, actions) => {
            zoomToUserRef.current = zoomToUser
            mapActionsRef.current = actions ?? null
            if (map && typeof (map as google.maps.Map).moveCamera === 'function') {
              const gMap = map as google.maps.Map
              mapInstanceRef.current = gMap
              setMapReadyForLayers(true)
              navCameraRef.current = new NavigationCamera(gMap)
            }
          }}
        />

        {/* Friend markers on map */}
        <FriendMarkers
          friends={friendLocations}
          map={mapInstanceRef.current}
          onFriendClick={(friend) => setSelectedFriend(friend)}
        />

      {/* Right side controls - only show when not navigating (browse mode) */}
      {!isNavigating && activeTab === 'map' && (
        <div style={{
          position: 'fixed',
          right: 16,
          bottom: 'calc(80px + env(safe-area-inset-bottom, 20px))',
          zIndex: 490,
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
            onClick={() => {
              hasZoomedToUser.current = false
              mapActionsRef.current?.clearUserInteracting?.()
              if (zoomToUserRef.current && userLocation) {
                zoomToUserRef.current(userLocation.lat, userLocation.lng, false)
              }
              recenter()
              toast.success('Centered on your location')
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
            onClick={() => setIsOverviewMode((v) => !v)}
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
      {mapClickedPlace && !nearbyLoading && !isNavigating && (
        <div
          className="fixed left-4 right-4 z-[600] animate-in slide-in-from-bottom duration-200 relative"
          style={{ bottom: 'calc(60px + env(safe-area-inset-bottom, 20px) + 8px)' }}
        >
          <PlaceCard
            place={mapClickedPlace}
            onDirections={(place) => {
              if (place.lat != null && place.lng != null) {
                handleSelectDestination({ name: place.name, lat: place.lat, lng: place.lng, address: place.address })
              }
              setMapClickedPlace(null)
            }}
            onViewDetails={(place) => {
              if (place.place_id) {
                setSelectedPlaceId(place.place_id)
                setSelectedPlace({ name: place.name, lat: place.lat ?? 0, lng: place.lng ?? 0 })
              }
              setMapClickedPlace(null)
            }}
            onClose={() => setMapClickedPlace(null)}
          />
          <button
            onClick={() => setMapClickedPlace(null)}
            className="absolute -top-2 right-0 w-8 h-8 bg-slate-700 text-white rounded-full flex items-center justify-center shadow-lg"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Premium place detail card (replaces basic POI bar) */}
      {selectedPlace && !selectedPlaceId && !mapClickedPlace && !isNavigating && (
        <PlaceDetailCard
          place={selectedPlace}
          onClose={() => setSelectedPlace(null)}
          onNavigate={(place) => {
            handleSelectDestination({ name: place.name, lat: place.lat, lng: place.lng, address: place.address })
            setSelectedPlace(null)
          }}
          snaproadOffer={(selectedPlace as { matchingOffer?: unknown }).matchingOffer}
          onRedeemOffer={(offer) => {
            if (offer) {
              setShowOfferDetail(offer as Offer)
              setSelectedOfferForRedemption(offer as Offer)
              setShowRedemptionPopup(true)
            }
            setSelectedPlace(null)
          }}
        />
      )}

      {/* Driving mode selector: Calm / Adaptive / Sport -- positioned below top bar */}
      {/* Driving mode selector - hidden during navigation (clean nav mode) */}
      {!isNavigating && (
        <div className="absolute top-[72px] right-3 z-20 flex rounded-full bg-white/95 backdrop-blur border border-gray-200 overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
          {(['calm', 'adaptive', 'sport'] as const).map((m) => {
            const active = mode === m
            const colors: Record<string, string> = { calm: 'bg-blue-500', adaptive: 'bg-emerald-500', sport: 'bg-red-500' }
            return (
              <button
                key={m}
                onClick={() => { setMode(m); api.post('/api/analytics/track', { event: 'mode_switch', properties: { mode: m } }).catch(() => {}) }}
                className={`relative px-3 py-1.5 text-[10px] font-semibold capitalize transition-all duration-300 ${active ? `${colors[m]} text-white` : 'text-slate-500 hover:text-slate-700'}`}
              >
                {active && <span className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: m === 'sport' ? '#ef4444' : m === 'calm' ? '#3b82f6' : '#10b981' }} />}
                {m}
              </button>
            )
          })}
        </div>
      )}

      {/* Speed HUD -- replaced by SpeedIndicator component in bottom-left */}

      {/* Route Preview - pre-navigation bottom sheet (Fastest / Eco only) */}
      {showRoutePreview && navigationData && (
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
            {(availableRoutes.length > 0 ? availableRoutes.slice(0, 2) : []).map((route, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setSelectedRouteIndex(i)
                  handleRouteSelect(i === 0 ? 'fastest' : 'eco')
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
                {i === 0 ? 'Fastest' : 'Eco'}
                {i === 1 && <span style={{ fontSize: 10, display: 'block', opacity: 0.8 }}>saves fuel</span>}
              </button>
            ))}
          </div>
          {availableRoutes[selectedRouteIndex] && (
            <div style={{ display: 'flex', gap: 0, paddingLeft: 20, paddingRight: 20, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#1a1a1a' }}>
                  {formatDuration(Math.round((availableRoutes[selectedRouteIndex].expectedTravelTimeSeconds ?? 0) / 60))}
                </div>
                <div style={{ fontSize: 12, color: '#999' }}>
                  {`${((availableRoutes[selectedRouteIndex].distanceMeters ?? 0) / 1609.34).toFixed(1)} mi`} • Arrive {arrivalTime}
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

      {/* Nearby Offers - centered pill; hidden when place card open so it never floats on top */}
      {activeTab === 'map' && !isNavigating && !showRoutePreview && !showSearch && !selectedPlace && !mapClickedPlace && (
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
                (offers ?? []).slice(0, 2).map((offer: Offer, i: number) => (
                  <div
                    key={offer.id ?? i}
                    onClick={() => {
                      setSelectedOfferForRedemption(offer)
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
                        {(offer as { title?: string; discount_text?: string }).title
                          ?? (offer as { discount_text?: string }).discount_text
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
                        <span>+{(offer as { gems_reward?: number }).gems_reward
                          ?? offer.gems
                          ?? 25} gems</span>
                        {(offer as { distance_km?: number }).distance_km != null && (
                          <>
                            <span style={{ color: '#ddd' }}>•</span>
                            <span style={{ color: '#999' }}>
                              {(offer as { distance_km: number }).distance_km} km
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
          style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000 }}
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
              onClick={() => setIsOverviewMode(v => !v)}
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
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-slate-500 text-[13px]">Distance</p>
                <p className="text-slate-800 font-bold text-lg">{(lastTripData.distance as number)?.toFixed(1) ?? '--'} mi</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-slate-500 text-[13px]">Time</p>
                <p className="text-slate-800 font-bold text-lg">{formatDuration(Number(lastTripData.duration) ?? 0)}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-slate-500 text-[13px]">Safety Score</p>
                <p className="text-emerald-600 font-bold text-lg">{lastTripData.safety_score ?? '--'}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-slate-500 text-[13px]">Gems Earned</p>
                <p className="text-amber-600 font-bold text-lg">{lastTripData.gems_earned ?? '--'}</p>
              </div>
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

      {/* Top Bar - theme-aware (Settings > Appearance) */}
      {!isNavigating && !showSearch && activeTab === 'map' && (
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
                    stroke={userData.safety_score >= 90 ? '#22c55e' : userData.safety_score >= 70 ? '#3b82f6' : '#ef4444'}
                    strokeWidth="4" fill="none" strokeDasharray={`${(userData.safety_score / 100) * 151} 151`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold text-white">{userData.safety_score}</span>
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

      {/* Road Status Markers -- wired to live road reports */}
      {roadReports.length > 0 && (
        <RoadStatusMarkers
          roads={roadReports.map((r: any) => ({
            id: String(r.id ?? Math.random()),
            name: r.title ?? r.road ?? r.name ?? 'Unknown',
            status: r.severity === 'high' ? 'heavy' : r.severity === 'medium' ? 'moderate' : r.type === 'closure' ? 'closed' : 'clear',
            reason: r.description ?? r.reason,
            estimatedDelay: r.delay ?? r.estimatedDelay ?? 0,
            startLat: r.lat ?? r.startLat ?? 0,
            startLng: r.lng ?? r.startLng ?? 0,
            endLat: r.endLat ?? (r.lat ?? 0) + 0.002,
            endLng: r.endLng ?? (r.lng ?? 0) + 0.002,
          }))}
        onSelectRoad={setSelectedRoadStatus} 
        />
      )}

      {/* Road Status Overlay (when road selected) */}
      <RoadStatusOverlay 
        selectedRoad={selectedRoadStatus}
        onClose={() => setSelectedRoadStatus(null)}
      />

      {/* Note: Offer gems and user marker are rendered in GoogleMapSnapRoad component */}

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
          if (!userData.is_premium) {
            setShowPlanSelection(true)
            toast('Upgrade to Premium for traffic cameras')
            return
          }
          setShowCameraLayer((v) => !v)
        }}
        showIncidents={showIncidentsLayer}
        onToggleIncidents={() => setShowIncidentsLayer((v) => !v)}
        showConstruction={showConstructionLayer}
        onToggleConstruction={() => setShowConstructionLayer((v) => !v)}
      />

      {/* OHGO camera popup - live feed when a camera marker is tapped */}
      {selectedCamera && (
        <OHGOCameraPopup
          camera={selectedCamera}
          onClose={() => setSelectedCamera(null)}
        />
      )}

      {/* Camera report FAB - bottom left above speed indicator (hidden during nav) */}
      {!isNavigating && (
        <button onClick={() => setShowQuickPhotoReport(true)} data-testid="report-btn"
          className="absolute left-3 bottom-44 z-20 w-11 h-11 bg-white/95 backdrop-blur rounded-full flex items-center justify-center shadow-[0_1px_4px_rgba(0,0,0,0.08)] border border-gray-200 active:scale-95 transition-transform">
          <Camera className="text-slate-600" size={18} />
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
          {/* Leaderboard Preview */}
          <button onClick={() => setShowLeaderboard(true)} data-testid="leaderboard-preview"
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-4 mb-4 text-left">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-xs">Your Rank</p>
                <p className="text-white text-2xl font-bold">#{userData.rank || 42}</p>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="text-yellow-300" size={24} />
                <ChevronRight className="text-white" size={20} />
              </div>
            </div>
          </button>

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
              offers.slice(0, 4).map(offer => (
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
                    <p className="text-emerald-600 text-xs">{offer.discount_percent || offer.discount}% off</p>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <div>
                      <p className="text-emerald-500 font-bold text-sm">+{offer.gems_reward || offer.gems}💎</p>
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
              <div key={challenge.id} className={`bg-white rounded-xl p-4 shadow-sm ${challenge.claimed ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="text-slate-900 font-medium">{challenge.title}</h4>
                    <p className="text-slate-500 text-xs">{challenge.description}</p>
                  </div>
                  <span className="text-emerald-500 font-bold">+{challenge.gems}💎</span>
                </div>
                
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">{challenge.progress}/{challenge.target}</span>
                    <span className="text-slate-400">{challenge.expires} left</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className={`h-2 rounded-full transition-all ${challenge.completed ? 'bg-emerald-500' : 'bg-blue-500'}`}
                      style={{ width: `${Math.min((challenge.progress / challenge.target) * 100, 100)}%` }} />
                  </div>
                </div>

                {challenge.completed && !challenge.claimed ? (
                  <button onClick={() => handleClaimChallenge(challenge.id)} data-testid={`claim-${challenge.id}`}
                    className="w-full bg-emerald-500 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                    <Gem size={14} /> Claim Reward
                  </button>
                ) : challenge.claimed ? (
                  <div className="text-center text-slate-400 text-sm py-2">
                    <Check size={14} className="inline mr-1" /> Claimed
                  </div>
                ) : (
                  <div className="text-center text-slate-400 text-sm py-2">
                    {Math.round((challenge.progress / challenge.target) * 100)}% complete
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
            {(Array.isArray(badges) ? badges : []).filter((b: Record<string, unknown>) => b.earned).slice(0, 8).map(badge => (
              <div key={badge.id} className="bg-white rounded-xl p-2 text-center">
                <div className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-lg mb-1">
                  {badge.icon}
                </div>
                <p className="text-[9px] text-slate-600 line-clamp-1">{badge.name}</p>
              </div>
            ))}
          </div>

          <h3 className="text-slate-900 font-semibold mb-3 mt-4">Almost There!</h3>
          <div className="space-y-2">
            {(Array.isArray(badges) ? badges : []).filter((b: Record<string, unknown>) => !b.earned && (b.progress as number) > 50).slice(0, 3).map(badge => (
              <div key={badge.id} className="bg-white rounded-xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center">
                  <Lock size={16} className="text-slate-400" />
                </div>
                <div className="flex-1">
                  <p className="text-slate-900 text-sm font-medium">{badge.name}</p>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${badge.progress}%` }} />
                  </div>
                </div>
                <span className="text-slate-400 text-xs">{badge.progress}%</span>
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

  const renderRoutes = () => (
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
                  {!userData.is_premium && (
                    <p className={`text-[10px] mt-0.5 ${routesSubtextCls}`}>Real-time alerts (leave early, faster route) require Premium</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleLeaveEarlyForRoute(route.id)} data-testid={`leave-early-route-${route.id}`}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 ${userData.is_premium ? (isLight ? 'text-slate-600 bg-slate-100 hover:bg-slate-200' : 'text-slate-300 bg-slate-700 hover:bg-slate-600') : 'text-slate-400 bg-slate-50 cursor-not-allowed'}`}
                    title={!userData.is_premium ? 'Upgrade to Premium for leave-early alerts' : undefined}>
                    <Clock size={12} /> Leave early
                  </button>
                  <button onClick={() => handleStartNavigation(route.destination)} data-testid={`start-route-${route.id}`}
                    className="bg-blue-500 text-white px-4 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1">
                    <Navigation size={12} /> Start
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )

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
  const profileIconBg = isLight ? 'bg-slate-100' : 'bg-slate-700/50'

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
            { value: `#${userData.rank}`, label: 'Rank', icon: '🏆' },
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
            { icon: AlertTriangle, label: 'Road Reports', value: 'Report hazards', action: () => setShowRoadReports(true), color: isLight ? 'bg-orange-100 border-orange-200' : 'bg-orange-500/20 border-orange-500/30', iconColor: isLight ? 'text-orange-600' : 'text-orange-400' },
            { icon: Route, label: 'My Routes', value: `${routes.length} saved`, action: () => setActiveTab('routes'), color: isLight ? 'bg-blue-100 border-blue-200' : 'bg-blue-500/20 border-blue-500/30', iconColor: isLight ? 'text-blue-600' : 'text-blue-400' },
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
            onClick={handleShareTrip} 
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
        const res = await fetch(`${API_URL}/api/places/details/${s.place_id}`)
        if (res.ok) {
          const json = await res.json()
          if (json.success && json.data?.lat && json.data?.lng) {
            setNewLocation((prev: typeof newLocation) => ({ ...prev, lat: json.data.lat, lng: json.data.lng }))
          }
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
            <Battery size={16} className={`mx-auto ${showFamilyMember.battery < 30 ? 'text-red-500' : 'text-emerald-500'}`} />
            <p className="text-sm font-bold text-slate-900 mt-1">{showFamilyMember.battery}%</p>
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
  return (
    <div className="min-h-screen bg-slate-900">
      {/* Content */}
      {activeTab === 'map' && renderMap()}
      {activeTab === 'routes' && renderRoutes()}
      {activeTab === 'rewards' && renderRewards()}
      {activeTab === 'profile' && renderProfile()}

      {/* Bottom Navigation - 4 Tabs (below modal layer so dialogs open on top) */}
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
            { id: 'routes', icon: Route, label: 'Routes' },
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
              setFollowingFriendId(null)
              toast.success(`Stopped following ${friend.name}`)
            } else {
              setFollowingFriendId(friend.id)
              toast.success(`Now following ${friend.name} 👁`)
              mapInstanceRef.current?.panTo({ lat: friend.lat, lng: friend.lng })
            }
            setSelectedFriend(null)
          }}
          isFollowing={followingFriendId === selectedFriend.id}
        />
      )}
      <Leaderboard
        isOpen={showLeaderboard} 
        onClose={() => setShowLeaderboard(false)}
        userId={userData.id || '123456'}
        userGems={userData.gems || 0}
      />
      <BadgesGrid 
        isOpen={showBadgesGrid} 
        onClose={() => setShowBadgesGrid(false)}
      />
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
      
      {/* Road Reports & Community Features */}
      <RoadReports
        isOpen={showRoadReports}
        onClose={() => setShowRoadReports(false)}
        onCreateReport={handleCreateReport}
        onUpvote={handleUpvoteReport}
        currentUserId={userData.id || '123456'}
      />
      <LevelProgress
        isOpen={showLevelProgress}
        onClose={() => setShowLevelProgress(false)}
      />
      
      {/* Orion Voice - full AI chat; can start nav, go to offers, and add voice reports during nav */}
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
        useMapPlacement
        onRequestPlacement={(type) => {
          setPendingIncidentPlacement({ type })
          toast('Tap the road to place this report', { icon: '📍' })
        }}
      />
      
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
                { icon: Trophy, title: 'Compete & Win', desc: 'Challenge friends and climb the leaderboard' },
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
      />
      
      {/* Redemption Popup with Geofenced QR */}
      <RedemptionPopup
        isOpen={showRedemptionPopup}
        onClose={() => {
          setShowRedemptionPopup(false)
          setSelectedOfferForRedemption(null)
        }}
        offer={selectedOfferForRedemption}
        userPlan={userPlan}
        userLocation={userLocation}
        onRedeem={handleRedeemOffer}
      />
      
      {/* Weekly Recap (Premium) */}
      <WeeklyRecap
        isOpen={showWeeklyRecap}
        onClose={() => setShowWeeklyRecap(false)}
        isPremium={userPlan === 'premium'}
      />
      
      {/* Orion Offer Alerts (during navigation only) — only offers within 1 mile */}
      {isNavigating && (
        <OrionOfferAlerts
          isNavigating={isNavigating}
          userLocation={userLocation}
          offers={nearbyNavOffers}
          onOfferSelect={handleDirectRedemption}
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
