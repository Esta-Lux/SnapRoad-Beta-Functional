import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'
import {
  MapPin, Gift, Trophy, Users, Search, Home, Briefcase, Bell, Menu, Mic,
  Navigation, ChevronRight, ChevronDown, ChevronUp, Settings, Camera,
  Gem, Heart, Award, X, Plus, Check, Star, Clock, Car, Fuel,
  Coffee, AlertTriangle, Volume2, Route, Gauge, LogOut, Play, Pause,
  Trash2, Timer, RefreshCw, EyeOff, School, ShoppingCart, Dumbbell, 
  Building, Compass, Layers, GripVertical, Minimize2, Maximize2,
  Phone, MessageCircle, Battery, ChevronLeft, Shield, Zap, TrendingUp,
  History, Download, BarChart3, HelpCircle, Lock, Edit2, UserPlus, Share2, Swords,
  DollarSign, Droplets, Leaf, Target, Map
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
import CommunityBadges from './components/CommunityBadges'
import LevelProgress from './components/LevelProgress'
import OrionVoice from './components/OrionVoice'
import QuickPhotoReport from './components/QuickPhotoReport'
import RoadStatusOverlay, { RoadStatusMarkers, MOCK_ROAD_SEGMENTS } from './components/RoadStatusOverlay'
import OffersModal, { OfferMarker } from './components/OffersModal'
import ShareTripScore from './components/ShareTripScore'
import DrivingScore from './components/DrivingScore'
import ChallengeHistory from './components/ChallengeHistory'
import RedemptionPopup from './components/RedemptionPopup'
import WeeklyRecap from './components/WeeklyRecap'
import OrionOfferAlerts from './components/OrionOfferAlerts'
import InteractiveMap from './components/InteractiveMap'
import { NavMarker, ProfileCar, CAR_COLORS } from './components/Car3D'
// New enhanced components
import TripAnalytics from './components/TripAnalytics'
import RouteHistory3D from './components/RouteHistory3D'
import CollapsibleOffersPanel from './components/CollapsibleOffersPanel'

const API_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || ''

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

// API Helper
const api = {
  async get(endpoint: string) {
    const res = await fetch(`${API_URL}${endpoint}`)
    return res.json()
  },
  async post(endpoint: string, data?: object) {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined
    })
    return res.json()
  },
  async put(endpoint: string, data?: object) {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined
    })
    return res.json()
  },
  async delete(endpoint: string) {
    const res = await fetch(`${API_URL}${endpoint}`, { method: 'DELETE' })
    return res.json()
  }
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
  const [showWidgetSettings, setShowWidgetSettings] = useState(false)
  const [showOfferDetail, setShowOfferDetail] = useState<any>(null)
  const [showFamilyMember, setShowFamilyMember] = useState<any>(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [draggingWidget, setDraggingWidget] = useState<string | null>(null)
  
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
  const [showCommunityBadges, setShowCommunityBadges] = useState(false)
  const [showLevelProgress, setShowLevelProgress] = useState(false)
  const [showOrionVoice, setShowOrionVoice] = useState(false)
  const [showQuickPhotoReport, setShowQuickPhotoReport] = useState(false)
  const [selectedRoadStatus, setSelectedRoadStatus] = useState<any>(null)
  const [showOffersModal, setShowOffersModal] = useState(false)
  const [showShareTrip, setShowShareTrip] = useState(false)
  const [lastTripData, setLastTripData] = useState<any>(null)
  const [selectedOfferId, setSelectedOfferId] = useState<number | null>(null)
  const [showDrivingScore, setShowDrivingScore] = useState(false)
  const [showChallengeHistory, setShowChallengeHistory] = useState(false)
  const [showRedemptionPopup, setShowRedemptionPopup] = useState(false)
  const [selectedOfferForRedemption, setSelectedOfferForRedemption] = useState<any>(null)
  const [showWeeklyRecap, setShowWeeklyRecap] = useState(false)
  
  // New feature states
  const [showTripAnalytics, setShowTripAnalytics] = useState(false)
  const [showRouteHistory3D, setShowRouteHistory3D] = useState(false)
  const [showOffersPanel, setShowOffersPanel] = useState(true)
  
  // Search and navigation states
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedDestination, setSelectedDestination] = useState<any>(null)
  const [navigationData, setNavigationData] = useState<any>(null)
  const [showTurnByTurn, setShowTurnByTurn] = useState(false)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // User location (mock - Columbus, OH)
  const [userLocation, setUserLocation] = useState({ lat: 39.9612, lng: -82.9988 })
  
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
  const [offers, setOffers] = useState<any[]>([])
  const [challenges, setChallenges] = useState<any[]>([])
  const [badges, setBadges] = useState<any[]>([])
  const [skins, setSkins] = useState<any[]>([])
  const [family, setFamily] = useState<any[]>([])
  
  // Fresh user state - starts empty
  const [userData, setUserData] = useState<any>({
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
  const [isMuted, setIsMuted] = useState(false)
  const [currentSpeed, setCurrentSpeed] = useState(0)
  const [offerFilter, setOfferFilter] = useState<'all' | 'gas' | 'cafe'>('all')
  const [badgeFilter, setBadgeFilter] = useState<'all' | 'earned' | 'locked'>('all')
  const [equippedSkin, setEquippedSkin] = useState(1)
  const [favorites, setFavorites] = useState<number[]>([])
  
  // Form states
  const [newLocation, setNewLocation] = useState({ name: '', address: '', category: 'favorite' })
  const [newRoute, setNewRoute] = useState({ name: '', origin: '', destination: '', departure_time: '08:00', days_active: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], notifications: true })
  
  // Swipe state for locations
  const [swipeOffset, setSwipeOffset] = useState(0)
  const swipeRef = useRef<HTMLDivElement>(null)
  const startX = useRef(0)

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [])

  // Speed simulation when navigating
  useEffect(() => {
    if (isNavigating) {
      const interval = setInterval(() => {
        setCurrentSpeed(Math.floor(Math.random() * 20) + 55)
        // Simulate car direction changes while navigating
        setCarHeading(prev => prev + (Math.random() > 0.5 ? 5 : -5))
      }, 3000)
      return () => clearInterval(interval)
    } else {
      setCurrentSpeed(0)
    }
  }, [isNavigating])

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
      if (locRes.success) setLocations(locRes.data)
      if (routeRes.success) setRoutes(routeRes.data)
      if (offerRes.success) setOffers(offerRes.data)
      if (badgeRes.success) setBadges(badgeRes.data)
      if (skinRes.success) setSkins(skinRes.data)
      if (famRes.success) setFamily(famRes.data)
      if (userRes.success) {
        setUserData(userRes.data)
        setUserPlan(userRes.data.plan || 'basic')
        setGemMultiplier(userRes.data.gem_multiplier || 1)
      }
      if (challengeRes.success) setChallenges(challengeRes.data)
      if (carRes.success) {
        setUserCar({
          category: carRes.data.category || 'sedan',
          variant: carRes.data.variant || 'sedan-classic',
          color: carRes.data.color || 'midnight-black',
        })
        setOwnedColors(carRes.data.owned_colors || [])
      }
      
      // Check onboarding status - show plan selection first, then car onboarding
      if (onboardingRes.success) {
        if (!onboardingRes.data.onboarding_complete) {
          if (!onboardingRes.data.plan_selected) {
            setShowPlanSelection(true)
          } else if (!onboardingRes.data.car_selected) {
            setShowCarOnboarding(true)
          }
        }
      }
    } catch (e) {
      console.log('Using mock data')
    }
  }

  // Handle car customization
  const handleCarChange = async (car: { category: string; variant: string; color: string }) => {
    try {
      const res = await api.post('/api/user/car', car)
      if (res.success) {
        setUserCar(car)
        toast.success('Car updated!')
      }
    } catch (e) {
      setUserCar(car)
      toast.success('Car updated!')
    }
  }

  const handlePurchaseColor = async (colorKey: string, price: number) => {
    try {
      const res = await api.post(`/api/user/car/color/${colorKey}/purchase`)
      if (res.success) {
        setOwnedColors(prev => [...prev, colorKey])
        setUserData((prev: any) => ({ ...prev, gems: res.new_gems }))
        toast.success(`Color purchased for ${price} gems!`)
      } else {
        toast.error(res.message)
      }
    } catch (e) {
      // Mock success
      setOwnedColors(prev => [...prev, colorKey])
      setUserData((prev: any) => ({ ...prev, gems: prev.gems - price }))
      toast.success(`Color purchased for ${price} gems!`)
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
        // Show car onboarding next
        setShowCarOnboarding(true)
        toast.success(plan === 'premium' ? '🎉 Welcome to Premium!' : 'Plan selected!')
      }
    } catch (e) {
      // Mock success
      setUserPlan(plan)
      setGemMultiplier(plan === 'premium' ? 2 : 1)
      setUserData((prev: any) => ({ 
        ...prev, 
        plan, 
        is_premium: plan === 'premium',
        gem_multiplier: plan === 'premium' ? 2 : 1
      }))
      setShowPlanSelection(false)
      setShowCarOnboarding(true)
      toast.success(plan === 'premium' ? '🎉 Welcome to Premium!' : 'Plan selected!')
    }
  }

  const handleCarOnboardingComplete = async (selection: { category: string; variant: string; color: string }) => {
    setUserCar(selection)
    setShowCarOnboarding(false)
    try {
      await api.post('/api/user/car', selection)
      toast.success('Welcome to SnapRoad! 🚗')
      // Show app tour for new users
      setShowAppTour(true)
    } catch (e) {
      toast.success('Welcome to SnapRoad! 🚗')
      setShowAppTour(true)
    }
  }

  // Road Reports handlers
  const handleCreateReport = async (report: { type: string; title: string; description: string; lat: number; lng: number }) => {
    try {
      const res = await api.post('/api/reports', report)
      if (res.success) {
        toast.success(res.message)
        // Refresh user data to update XP
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
        toast.success(res.message)
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
        loadData() // Refresh to update XP
      }
    } catch (e) {
      // Mock success
      toast.success(`${report.type} reported ${report.direction}! +500 XP`)
    }
  }

  // Quick photo report handler
  const handleQuickPhotoReport = async (report: { type: string; photo_url: string; lat: number; lng: number }) => {
    try {
      const res = await api.post('/api/reports', {
        type: report.type,
        title: `Photo report: ${report.type}`,
        description: 'Photo report submitted',
        lat: report.lat,
        lng: report.lng,
        photo_url: report.photo_url,
      })
      if (res.success) {
        toast.success('Photo report posted! +500 XP')
        loadData()
      }
      return res
    } catch (e) {
      toast.success('Photo report posted! +500 XP')
      return { success: true }
    }
  }

  // Redeem offer handler
  const handleRedeemOffer = async (offerId: number) => {
    try {
      const res = await api.post(`/api/offers/${offerId}/redeem`)
      if (res.success) {
        toast.success(res.message)
        // Update gems
        setUserData((prev: any) => ({ 
          ...prev, 
          gems: prev.gems + (res.data?.gems_earned || 0),
          xp: prev.xp + (res.data?.xp_earned || 700)
        }))
        loadData()
      } else {
        toast.error(res.message)
      }
      return res
    } catch (e) {
      toast.error('Could not redeem offer')
      return { success: false }
    }
  }

  // Claim challenge reward
  const handleClaimChallenge = async (challengeId: number) => {
    try {
      const res = await api.post(`/api/challenges/${challengeId}/claim`)
      if (res.success) {
        toast.success(res.message)
        // Update local state
        setChallenges(challenges.map(c => c.id === challengeId ? { ...c, claimed: true } : c))
        // Update gems
        setUserData((prev: any) => ({ ...prev, gems: prev.gems + res.gems_earned }))
      } else {
        toast.error(res.message)
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
      } catch (e) {}
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
    } catch (e) {}
  }

  // Toggle widget visibility
  const toggleWidgetVisibility = async (widgetId: string) => {
    setWidgets(prev => ({
      ...prev,
      [widgetId]: { ...prev[widgetId], visible: !prev[widgetId].visible }
    }))
    try {
      await api.put(`/api/widgets/${widgetId}/toggle`)
    } catch (e) {}
  }

  // Navigation handlers
  const handleStartNavigation = async (dest?: string) => {
    setIsNavigating(true)
    setShowMenu(false)
    setShowSearch(false)
    toast.loading('Calculating route...', { duration: 1500 })
    try {
      const res = await api.post('/api/navigation/start', { destination: dest || 'Unknown', origin: 'current_location' })
      setTimeout(() => {
        toast.success(res.message || `Navigating to ${dest || 'destination'}`)
      }, 1500)
    } catch (e) {
      setTimeout(() => toast.success(`Navigating to ${dest || 'destination'}`), 1500)
    }
  }

  const handleStopNavigation = async () => {
    setIsNavigating(false)
    setShowTurnByTurn(false)
    setNavigationData(null)
    setSelectedDestination(null)
    setCurrentStepIndex(0)
    try {
      await api.post('/api/navigation/stop')
      toast.success('Navigation stopped')
    } catch (e) {
      toast.success('Navigation stopped')
    }
  }

  // Search location with API
  const handleSearchLocations = async (query: string) => {
    if (query.length < 1) {
      setSearchResults([])
      return
    }
    setIsSearching(true)
    try {
      const params = new URLSearchParams({
        q: query,
        lat: userLocation.lat.toString(),
        lng: userLocation.lng.toString(),
        limit: '8'
      })
      const res = await fetch(`${API_URL}/api/map/search?${params}`)
      const data = await res.json()
      if (data.success) {
        setSearchResults(data.data)
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
    if (query.length > 0) {
      searchTimeoutRef.current = setTimeout(() => handleSearchLocations(query), 300)
    } else {
      setSearchResults([])
    }
  }

  // Fetch directions from API
  const fetchDirections = async (destination: any) => {
    try {
      const params = new URLSearchParams({
        origin_lat: userLocation.lat.toString(),
        origin_lng: userLocation.lng.toString(),
        dest_lat: destination.lat.toString(),
        dest_lng: destination.lng.toString(),
        dest_name: destination.name
      })
      const res = await fetch(`${API_URL}/api/map/directions?${params}`)
      const data = await res.json()
      if (data.success) {
        setNavigationData(data.data)
        setShowTurnByTurn(true)
        setCurrentStepIndex(0)
      }
    } catch (e) {
      console.error('Directions error:', e)
    }
  }

  // Handle destination selection from search
  const handleSelectDestination = async (location: any) => {
    setSelectedDestination(location)
    setSearchQuery(location.name)
    setSearchResults([])
    setShowSearch(false)
    
    // Start navigation with turn-by-turn
    setIsNavigating(true)
    toast.loading('Calculating route...', { duration: 1500 })
    await fetchDirections(location)
    setTimeout(() => {
      toast.success(`Navigating to ${location.name}`)
    }, 1500)
  }

  const handleVoiceCommand = async () => {
    // Open Orion voice assistant
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
      toast.success(res.message || 'Location added!')
      if (res.data) setLocations([...locations, res.data])
      setNewLocation({ name: '', address: '', category: 'favorite' })
      setShowAddLocation(false)
    } catch (e) {
      toast.success('Location added!')
      setShowAddLocation(false)
    }
  }

  const handleDeleteLocation = async (id: number) => {
    try {
      await api.delete(`/api/locations/${id}`)
      setLocations(locations.filter(l => l.id !== id))
      toast.success('Location removed')
    } catch (e) {
      setLocations(locations.filter(l => l.id !== id))
      toast.success('Location removed')
    }
  }

  // Route handlers
  const handleAddRoute = async () => {
    if (!newRoute.name || !newRoute.origin || !newRoute.destination) {
      toast.error('Please fill all fields')
      return
    }
    try {
      const res = await api.post('/api/routes', newRoute)
      toast.success(res.message || 'Route saved!')
      if (res.data) setRoutes([...routes, res.data])
      setNewRoute({ name: '', origin: '', destination: '', departure_time: '08:00', days_active: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], notifications: true })
      setShowAddRoute(false)
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
      setRoutes(routes.filter(r => r.id !== id))
      toast.success('Route deleted')
    }
  }

  const handleToggleRoute = async (id: number) => {
    try {
      const res = await api.put(`/api/routes/${id}/toggle`)
      setRoutes(routes.map(r => r.id === id ? { ...r, is_active: !r.is_active } : r))
      toast.success(res.message || 'Route updated')
    } catch (e) {
      setRoutes(routes.map(r => r.id === id ? { ...r, is_active: !r.is_active } : r))
    }
  }

  const handleToggleRouteNotifications = async (id: number) => {
    try {
      const res = await api.put(`/api/routes/${id}/notifications`)
      setRoutes(routes.map(r => r.id === id ? { ...r, notifications: !r.notifications } : r))
      toast.success(res.message || 'Notifications updated')
    } catch (e) {
      setRoutes(routes.map(r => r.id === id ? { ...r, notifications: !r.notifications } : r))
    }
  }

  const handleFavoriteOffer = async (id: number) => {
    const newFavs = favorites.includes(id) ? favorites.filter(f => f !== id) : [...favorites, id]
    setFavorites(newFavs)
    try {
      await api.post(`/api/offers/${id}/favorite`)
      toast.success(favorites.includes(id) ? 'Removed from favorites' : 'Added to favorites!')
    } catch (e) {
      toast.success(favorites.includes(id) ? 'Removed from favorites' : 'Added to favorites!')
    }
  }

  // Report incident
  const handleReportIncident = async (type: string, gems: number) => {
    try {
      const res = await api.post('/api/incidents/report', { incident_type: type, location: 'Current location' })
      toast.success(res.message || `Reported ${type}! +${gems} gems`)
      setShowReportModal(false)
    } catch (e) {
      toast.success(`Reported ${type}! +${gems} gems`)
      setShowReportModal(false)
    }
  }

  // Family handlers
  const handleCallMember = async (member: any) => {
    try {
      await api.post(`/api/family/${member.id}/call`)
      toast.success(`Calling ${member.name}...`)
    } catch (e) {
      toast.success(`Calling ${member.name}...`)
    }
  }

  const handleMessageMember = async (member: any) => {
    try {
      await api.post(`/api/family/${member.id}/message`)
      toast.success(`Opening chat with ${member.name}`)
    } catch (e) {
      toast.success(`Opening chat with ${member.name}`)
    }
  }

  // Skin handlers
  const handleEquipSkin = async (skinId: number, skin: any) => {
    if (skin.owned) {
      setEquippedSkin(skinId)
      try {
        await api.post(`/api/skins/${skinId}/equip`)
        toast.success(`${skin.name} equipped!`)
      } catch (e) {
        toast.success(`${skin.name} equipped!`)
      }
    } else {
      if (userData.gems >= skin.price) {
        try {
          await api.post(`/api/skins/${skinId}/purchase`)
          toast.success(`Purchased ${skin.name} for ${skin.price} gems!`)
        } catch (e) {
          toast.success(`Purchased ${skin.name} for ${skin.price} gems!`)
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
      await api.put(`/api/settings/voice?muted=${newMuted}`)
      toast.success(newMuted ? 'Voice muted' : 'Voice unmuted')
    } catch (e) {
      toast.success(newMuted ? 'Voice muted' : 'Voice unmuted')
    }
  }

  // ==================== RENDER FUNCTIONS ====================

  // Hamburger Menu
  const renderMenu = () => (
    <div className="fixed inset-0 bg-black/80 z-50 flex" onClick={() => setShowMenu(false)}>
      <div className="w-72 bg-slate-900 h-full animate-slide-right" onClick={e => e.stopPropagation()}>
        <div className="p-4 bg-gradient-to-r from-blue-600 to-blue-500">
          <div className="flex items-center gap-3">
            {/* Show user's car if selected, otherwise show initials */}
            <button 
              onClick={() => setShowCarStudio(true)}
              className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden hover:bg-white/20 transition-colors"
            >
              {userCar.category ? (
                <ProfileCar 
                  category={userCar.category as any}
                  color={userCar.color as any}
                  size={48}
                />
              ) : (
                <span className="text-white font-bold text-lg">
                  {userData.name?.split(' ').map((n: string) => n[0]).join('')}
                </span>
              )}
            </button>
            <div>
              <h3 className="text-white font-semibold text-sm">{userData.name}</h3>
              <p className="text-blue-200 text-xs">Level {userData.level} • {userData.is_premium ? '⚡ PRO' : 'Free'}</p>
            </div>
          </div>
          
          {/* User ID Card */}
          <div className="mt-3 bg-white/10 rounded-xl px-3 py-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-[10px]">Your ID</p>
                <p className="text-white font-bold text-lg tracking-wider">{userData.id || '123456'}</p>
              </div>
              <div className="text-right">
                <p className="text-blue-200 text-[10px]">Friends</p>
                <p className="text-white font-bold">{userData.friends_count || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-4 mt-3">
            <div className="text-center">
              <p className="text-white font-bold text-sm">{(userData.gems/1000).toFixed(1)}K</p>
              <p className="text-blue-200 text-[10px]">Gems</p>
            </div>
            <div className="text-center">
              <p className="text-white font-bold text-sm">{userData.safety_score}</p>
              <p className="text-blue-200 text-[10px]">Score</p>
            </div>
            <div className="text-center">
              <p className="text-white font-bold text-sm">#{userData.rank}</p>
              <p className="text-blue-200 text-[10px]">Rank</p>
            </div>
          </div>
        </div>

        <div className="p-2 overflow-auto" style={{ maxHeight: 'calc(100% - 240px)' }}>
          <p className="text-slate-500 text-[10px] font-medium px-3 py-2">SOCIAL</p>
          {[
            { icon: Users, label: 'Friends Hub', badge: userData.friends_count, action: () => { setShowFriendsHub(true); setShowMenu(false) } },
            { icon: BarChart3, label: 'Leaderboard', action: () => { setShowLeaderboard(true); setShowMenu(false) } },
          ].map((item, i) => (
            <button key={i} onClick={item.action} data-testid={`menu-${item.label.toLowerCase().replace(' ', '-')}`}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white">
              <item.icon size={16} />
              <span className="flex-1 text-left text-sm">{item.label}</span>
              {item.badge !== undefined && <span className="text-xs bg-slate-700 px-2 py-0.5 rounded-full">{item.badge}</span>}
            </button>
          ))}

          <p className="text-slate-500 text-[10px] font-medium px-3 py-2 mt-2">NAVIGATION</p>
          {[
            { icon: MapPin, label: 'Map', action: () => { setActiveTab('map'); setShowMenu(false) } },
            { icon: Route, label: 'My Routes', badge: `${routes.length}/20`, action: () => { setActiveTab('routes'); setShowMenu(false) } },
            { icon: Star, label: 'Favorites', badge: locations.filter(l => !['home','work'].includes(l.category)).length, action: () => { setActiveTab('map'); setLocationCategory('favorites'); setShowMenu(false) } },
            { icon: Layers, label: 'Map Widgets', action: () => { setShowWidgetSettings(true); setShowMenu(false) } },
          ].map((item, i) => (
            <button key={i} onClick={item.action} data-testid={`menu-${item.label.toLowerCase().replace(' ', '-')}`}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white">
              <item.icon size={16} />
              <span className="flex-1 text-left text-sm">{item.label}</span>
              {item.badge !== undefined && <span className="text-xs bg-slate-700 px-2 py-0.5 rounded-full">{item.badge}</span>}
            </button>
          ))}

          <p className="text-slate-500 text-[10px] font-medium px-3 py-2 mt-2">REWARDS</p>
          {[
            { icon: Gift, label: 'Offers', badge: offers.length, action: () => { setActiveTab('rewards'); setRewardsTab('offers'); setShowMenu(false) } },
            { icon: Award, label: 'All Badges', badge: `${badges.filter(b => b.earned).length}/160`, action: () => { setShowBadgesGrid(true); setShowMenu(false) } },
            { icon: Car, label: 'Car Studio', action: () => { setShowCarStudio(true); setShowMenu(false) } },
          ].map((item, i) => (
            <button key={i} onClick={item.action} data-testid={`menu-${item.label.toLowerCase().replace(' ', '-')}`}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white">
              <item.icon size={16} />
              <span className="flex-1 text-left text-sm">{item.label}</span>
              {item.badge && <span className="text-xs bg-slate-700 px-2 py-0.5 rounded-full">{item.badge}</span>}
            </button>
          ))}

          <p className="text-slate-500 text-[10px] font-medium px-3 py-2 mt-2">ANALYTICS</p>
          {[
            { icon: Fuel, label: 'Fuel Tracker', action: () => { setShowFuelDashboard(true); setShowMenu(false) } },
            { icon: Shield, label: 'Driver Score', action: () => { setActiveTab('profile'); setProfileTab('score'); setShowMenu(false) } },
            { icon: BarChart3, label: 'Trip Analytics', action: () => { setShowTripAnalytics(true); setShowMenu(false) } },
            { icon: Map, label: 'Route History', action: () => { setShowRouteHistory3D(true); setShowMenu(false) } },
          ].map((item, i) => (
            <button key={i} onClick={item.action} data-testid={`menu-${item.label.toLowerCase().replace(' ', '-')}`}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white">
              <item.icon size={16} />
              <span className="flex-1 text-left text-sm">{item.label}</span>
            </button>
          ))}

          <p className="text-slate-500 text-[10px] font-medium px-3 py-2 mt-2">SETTINGS</p>
          {[
            { icon: Volume2, label: isMuted ? 'Unmute' : 'Mute', action: handleToggleVoice },
            { icon: Settings, label: 'Settings', action: () => { setActiveTab('profile'); setProfileTab('settings'); setShowMenu(false) } },
            { icon: HelpCircle, label: 'Help', action: () => { setShowHelpSupport(true); setShowMenu(false) } },
          ].map((item, i) => (
            <button key={i} onClick={item.action} data-testid={`menu-${item.label.toLowerCase()}`}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white">
              <item.icon size={16} />
              <span className="flex-1 text-left text-sm">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-slate-800">
          <button onClick={() => { logout(); navigate('/login') }} data-testid="logout-btn"
            className="w-full flex items-center justify-center gap-2 py-2 text-red-400 hover:bg-red-500/10 rounded-xl">
            <LogOut size={16} /> Log Out
          </button>
        </div>
      </div>
    </div>
  )

  // Get home location
  const getHomeLocation = () => locations.find(l => l.category === 'home')
  const getWorkLocation = () => locations.find(l => l.category === 'work')
  const getFavoriteLocations = () => locations.filter(l => !['home', 'work'].includes(l.category))

  // Clean Map Tab - Google Maps Style
  const renderMap = () => (
    <div id="map-container" className="flex-1 relative bg-slate-800 overflow-hidden"
      onMouseMove={draggingWidget ? handleWidgetDrag : undefined}
      onMouseUp={handleWidgetDragEnd}
      onTouchMove={draggingWidget ? handleWidgetDrag : undefined}
      onTouchEnd={handleWidgetDragEnd}>
      
      {/* Interactive Map - Real OpenStreetMap */}
      <InteractiveMap
        userLocation={userLocation}
        offers={offers}
        isNavigating={isNavigating}
        onOfferClick={(offer) => {
          setSelectedOfferForRedemption(offer)
          setShowRedemptionPopup(true)
        }}
        carColor={userCar.color.includes('blue') ? '#3b82f6' : 
                  userCar.color.includes('red') ? '#ef4444' : 
                  userCar.color.includes('green') ? '#22c55e' :
                  userCar.color.includes('white') ? '#f8fafc' :
                  userCar.color.includes('gold') ? '#fbbf24' : '#1e293b'}
        userCar={userCar}
        onOrionClick={() => setShowOrionVoice(true)}
        onRecenter={() => toast.success('Centered on your location')}
      />

      {/* Collapsible Offers Panel - On Map */}
      {activeTab === 'map' && showOffersPanel && (
        <CollapsibleOffersPanel
          offers={offers}
          userLocation={userLocation}
          onOfferSelect={(offer) => {
            setSelectedOfferForRedemption(offer)
            setShowRedemptionPopup(true)
          }}
          onNavigateToOffer={(offer) => {
            setSelectedDestination({
              name: offer.business_name,
              lat: offer.lat,
              lng: offer.lng
            })
            toast.success(`Navigating to ${offer.business_name}`)
          }}
          isPremium={userPlan === 'premium'}
        />
      )}

      {/* Turn-by-Turn Navigation Panel */}
      {showTurnByTurn && navigationData && (
        <div className="absolute top-0 left-0 right-0 z-30">
          {/* Current Step */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-4 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                {navigationData.steps[currentStepIndex]?.maneuver === 'turn-right' ? (
                  <ChevronRight className="text-white" size={28} />
                ) : navigationData.steps[currentStepIndex]?.maneuver === 'turn-left' ? (
                  <ChevronLeft className="text-white" size={28} />
                ) : navigationData.steps[currentStepIndex]?.maneuver === 'arrive' ? (
                  <MapPin className="text-white" size={24} />
                ) : (
                  <Navigation className="text-white" size={24} />
                )}
              </div>
              <div className="flex-1">
                <p className="text-white font-bold text-lg">
                  {navigationData.steps[currentStepIndex]?.instruction || 'Continue'}
                </p>
                <p className="text-blue-100 text-sm">
                  {navigationData.steps[currentStepIndex]?.distance} • {navigationData.steps[currentStepIndex]?.duration}
                </p>
              </div>
              <button 
                onClick={handleStopNavigation}
                className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30"
                data-testid="end-navigation-btn"
              >
                <X className="text-white" size={20} />
              </button>
            </div>
          </div>

          {/* ETA Bar */}
          <div className="bg-slate-900/95 backdrop-blur px-4 py-3 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock className="text-emerald-400" size={16} />
                <span className="text-white font-semibold">{navigationData.duration?.text || '-- min'}</span>
              </div>
              <div className="text-slate-400">•</div>
              <span className="text-slate-300">{navigationData.distance?.text || '-- mi'}</span>
              <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                navigationData.traffic === 'light' ? 'bg-emerald-500/20 text-emerald-400' :
                navigationData.traffic === 'moderate' ? 'bg-amber-500/20 text-amber-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {navigationData.traffic || 'normal'} traffic
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}
                disabled={currentStepIndex === 0}
                className="w-8 h-8 bg-slate-700/50 rounded-full flex items-center justify-center disabled:opacity-30"
              >
                <ChevronUp className="text-white" size={16} />
              </button>
              <button 
                onClick={() => setCurrentStepIndex(Math.min((navigationData.steps?.length || 1) - 1, currentStepIndex + 1))}
                disabled={currentStepIndex === (navigationData.steps?.length || 1) - 1}
                className="w-8 h-8 bg-slate-700/50 rounded-full flex items-center justify-center disabled:opacity-30"
              >
                <ChevronDown className="text-white" size={16} />
              </button>
              <button className="w-8 h-8 bg-slate-700/50 rounded-full flex items-center justify-center">
                <Volume2 className="text-white" size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Bar - Google Maps Style (Hidden during turn-by-turn) */}
      {!showTurnByTurn && (
      <div className="absolute top-3 left-3 right-3 z-10">
        {/* Search Bar with Menu */}
        <div className="flex gap-2">
          <button onClick={() => setShowMenu(true)} data-testid="menu-btn"
            className="w-12 h-12 bg-slate-900/95 backdrop-blur rounded-full flex items-center justify-center shadow-lg">
            <Menu className="text-white" size={20} />
          </button>
          <button onClick={() => setShowSearch(true)} data-testid="search-btn" 
            className="flex-1 bg-slate-900/95 backdrop-blur rounded-full px-4 h-12 flex items-center gap-3 shadow-lg">
            <Search className="text-slate-400" size={18} />
            <span className="flex-1 text-slate-400 text-sm text-left">{isNavigating ? 'Navigating...' : 'Search here'}</span>
            <button 
              onClick={(e) => { e.stopPropagation(); handleVoiceCommand() }}
              className="p-1 hover:bg-slate-700 rounded-full transition-colors"
              data-testid="orion-btn"
            >
              <Mic className="text-slate-400" size={18} />
            </button>
          </button>
        </div>

        {/* Quick Action Pills - Google Maps Style */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {/* Favorites Tab */}
          <button onClick={() => setLocationCategory('favorites')} data-testid="tab-favorites"
            className={`flex-shrink-0 px-4 py-2 rounded-full flex items-center gap-2 transition-all ${
              locationCategory === 'favorites' 
                ? 'bg-blue-500 text-white' 
                : 'bg-slate-900/90 text-white backdrop-blur'
            }`}>
            <Star size={16} className={locationCategory === 'favorites' ? 'text-white' : 'text-yellow-400'} />
            <span className="text-sm font-medium">Favorites</span>
          </button>

          {/* Nearby Tab */}
          <button onClick={() => setLocationCategory('nearby')} data-testid="tab-nearby"
            className={`flex-shrink-0 px-4 py-2 rounded-full flex items-center gap-2 transition-all ${
              locationCategory === 'nearby' 
                ? 'bg-blue-500 text-white' 
                : 'bg-slate-900/90 text-white backdrop-blur'
            }`}>
            <MapPin size={16} />
            <span className="text-sm font-medium">Nearby</span>
          </button>

          {/* Report Hazard Button */}
          <button onClick={() => setShowRoadReports(true)} data-testid="report-hazard-btn"
            className="flex-shrink-0 px-4 py-2 rounded-full flex items-center gap-2 bg-amber-500/90 text-white backdrop-blur hover:bg-amber-500 transition-all">
            <AlertTriangle size={16} />
            <span className="text-sm font-medium">Report</span>
          </button>

          {/* Quick Photo Button */}
          <button onClick={() => setShowQuickPhotoReport(true)} data-testid="quick-photo-btn"
            className="flex-shrink-0 px-4 py-2 rounded-full flex items-center gap-2 bg-blue-500/90 text-white backdrop-blur hover:bg-blue-500 transition-all">
            <Camera size={16} />
            <span className="text-sm font-medium">Photo</span>
          </button>
        </div>

        {/* Favorites Content - Shows when Favorites is selected */}
        {locationCategory === 'favorites' && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {/* Home Button */}
            {getHomeLocation() ? (
              <button onClick={() => handleStartNavigation(getHomeLocation()!.name)} data-testid="quick-home"
                className="flex-shrink-0 bg-slate-900/90 backdrop-blur rounded-full pl-3 pr-4 py-2 flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center">
                  <Home size={16} className="text-slate-300" />
                </div>
                <div className="text-left">
                  <p className="text-white text-sm font-medium">Home</p>
                  <p className="text-slate-400 text-[11px] truncate max-w-[80px]">{getHomeLocation()!.address}</p>
                </div>
              </button>
            ) : (
              <button onClick={() => { setNewLocation({ ...newLocation, category: 'home' }); setShowAddLocation(true) }} data-testid="add-home"
                className="flex-shrink-0 bg-slate-900/90 backdrop-blur rounded-full pl-3 pr-4 py-2 flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center">
                  <Home size={16} className="text-slate-300" />
                </div>
                <div className="text-left">
                  <p className="text-white text-sm font-medium">Home</p>
                  <p className="text-blue-400 text-[11px]">Set location</p>
                </div>
              </button>
            )}

            {/* Work Button */}
            {getWorkLocation() ? (
              <button onClick={() => handleStartNavigation(getWorkLocation()!.name)} data-testid="quick-work"
                className="flex-shrink-0 bg-slate-900/90 backdrop-blur rounded-full pl-3 pr-4 py-2 flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center">
                  <Briefcase size={16} className="text-slate-300" />
                </div>
                <div className="text-left">
                  <p className="text-white text-sm font-medium">Work</p>
                  <p className="text-slate-400 text-[11px] truncate max-w-[80px]">{getWorkLocation()!.address}</p>
                </div>
              </button>
            ) : (
              <button onClick={() => { setNewLocation({ ...newLocation, category: 'work' }); setShowAddLocation(true) }} data-testid="add-work"
                className="flex-shrink-0 bg-slate-900/90 backdrop-blur rounded-full pl-3 pr-4 py-2 flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center">
                  <Briefcase size={16} className="text-slate-300" />
                </div>
                <div className="text-left">
                  <p className="text-white text-sm font-medium">Work</p>
                  <p className="text-blue-400 text-[11px]">Set location</p>
                </div>
              </button>
            )}

            {/* Other Favorites */}
            {getFavoriteLocations().map(loc => (
              <button key={loc.id} onClick={() => handleStartNavigation(loc.name)} data-testid={`fav-${loc.id}`}
                className="flex-shrink-0 bg-slate-900/90 backdrop-blur rounded-full pl-3 pr-4 py-2 flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center">
                  <Star size={16} className="text-yellow-400" />
                </div>
                <div className="text-left">
                  <p className="text-white text-sm font-medium truncate max-w-[60px]">{loc.name}</p>
                  <p className="text-slate-400 text-[11px] truncate max-w-[80px]">{loc.address}</p>
                </div>
              </button>
            ))}

            {/* More / Add Button */}
            <button onClick={() => setShowAddLocation(true)} data-testid="add-favorite"
              className="flex-shrink-0 bg-slate-900/90 backdrop-blur rounded-full px-4 py-2 flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center">
                <Plus size={16} className="text-slate-300" />
              </div>
              <span className="text-white text-sm font-medium">More</span>
            </button>
          </div>
        )}

        {/* Nearby Content - Shows when Nearby is selected */}
        {locationCategory === 'nearby' && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {[
              { icon: Fuel, label: 'Gas', color: 'blue' },
              { icon: Coffee, label: 'Coffee', color: 'orange' },
              { icon: ShoppingCart, label: 'Shopping', color: 'pink' },
              { icon: Dumbbell, label: 'Gym', color: 'purple' },
            ].map((item, i) => (
              <button key={i} onClick={() => { setActiveTab('rewards'); setRewardsTab('offers'); setOfferFilter(item.label.toLowerCase() === 'gas' ? 'gas' : item.label.toLowerCase() === 'coffee' ? 'cafe' : 'all') }}
                data-testid={`nearby-${item.label.toLowerCase()}`}
                className="flex-shrink-0 bg-slate-900/90 backdrop-blur rounded-full px-4 py-2 flex items-center gap-2">
                <item.icon size={16} className={`text-${item.color}-400`} />
                <span className="text-white text-sm">{item.label}</span>
              </button>
            ))}
          </div>
        )}
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
                <span className="text-white font-bold">{(userData.gems / 1000).toFixed(1)}K</span>
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

      {/* Road Status Markers - Hidden by default for cleaner map */}
      {/* <RoadStatusMarkers 
        roads={MOCK_ROAD_SEGMENTS} 
        onSelectRoad={setSelectedRoadStatus} 
      /> */}

      {/* Road Status Overlay (when road selected) */}
      <RoadStatusOverlay 
        selectedRoad={selectedRoadStatus}
        onClose={() => setSelectedRoadStatus(null)}
      />

      {/* Note: Offer gems and user marker are rendered in InteractiveMap component */}

      {/* Floating Action Button - Bottom Right (Camera only, cleaner look) */}
      <div className="absolute right-3 bottom-24 flex flex-col gap-2 z-20">
        <button onClick={() => setShowQuickPhotoReport(true)} data-testid="report-btn"
          className="w-11 h-11 bg-slate-900/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg">
          <Camera className="text-white" size={18} />
        </button>
      </div>

      {/* Speed Display (when navigating) */}
      {isNavigating && (
        <div className="absolute left-3 bottom-24 bg-slate-900/95 backdrop-blur rounded-xl p-3 text-center z-20">
          <p className="text-2xl font-bold text-white">{currentSpeed}</p>
          <p className="text-[10px] text-slate-400">MPH</p>
          <div className="flex items-center justify-center gap-1 mt-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] text-emerald-400">Safe</span>
          </div>
        </div>
      )}
    </div>
  )

  // Rewards Tab - Combines Offers, Challenges, Badges, Skins
  const renderRewards = () => (
    <div className="flex-1 bg-slate-100 overflow-auto">
      {/* Header with Gems */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-4 pt-3 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-white text-lg font-bold">Rewards</h1>
          <button onClick={() => setShowGemHistory(true)} data-testid="gem-balance-btn"
            className="bg-white/20 rounded-full px-3 py-1.5 flex items-center gap-1.5">
            <Gem className="text-white" size={16} />
            <span className="text-white font-bold">{(userData.gems / 1000).toFixed(1)}K</span>
          </button>
        </div>
        
        {/* Rewards Sub-tabs */}
        <div className="flex gap-1 bg-white/10 rounded-xl p-1">
          {(['offers', 'challenges', 'badges', 'carstudio'] as const).map(tab => (
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
              <p className="text-slate-500 text-xs">{challenges.filter(c => c.completed).length}/{challenges.length} completed</p>
            </div>
            <button onClick={loadData} className="text-blue-500 text-xs">Refresh</button>
          </div>

          <div className="space-y-3">
            {challenges.map(challenge => (
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
                <p className="text-2xl font-bold">{badges.filter(b => b.earned).length}/160</p>
              </div>
              <div className="flex items-center gap-2">
                <Award className="text-yellow-300" size={24} />
                <span className="text-sm">View All →</span>
              </div>
            </div>
          </button>

          <h3 className="text-slate-900 font-semibold mb-3">Recent Badges</h3>
          <div className="grid grid-cols-4 gap-2">
            {badges.filter(b => b.earned).slice(0, 8).map(badge => (
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
            {badges.filter(b => !b.earned && b.progress > 50).slice(0, 3).map(badge => (
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

      {/* Car Studio Sub-tab */}
      {rewardsTab === 'carstudio' && (
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

  // Routes Tab - More Detailed
  const renderRoutes = () => (
    <div className="flex-1 bg-slate-100 overflow-auto">
      <div className="bg-white px-4 pt-3 pb-3 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900">My Routes</h1>
            <p className="text-xs text-slate-500">{routes.length} of 20 routes saved</p>
          </div>
          <button onClick={() => setShowAddRoute(true)} disabled={routes.length >= 20} data-testid="add-route-btn"
            className="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 disabled:opacity-50">
            <Plus size={14} /> Add Route
          </button>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-3">
          <div className="w-full bg-slate-200 rounded-full h-1.5">
            <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${(routes.length / 20) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {routes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <Route className="mx-auto text-slate-300 mb-3" size={48} />
            <p className="text-slate-900 font-medium">No saved routes</p>
            <p className="text-slate-400 text-sm mt-1">Add your frequent destinations</p>
            <button onClick={() => setShowAddRoute(true)} data-testid="add-first-route-btn"
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
              Add First Route
            </button>
          </div>
        ) : (
          routes.map(route => (
            <div key={route.id} data-testid={`route-${route.id}`}
              className={`bg-white rounded-xl p-4 shadow-sm ${!route.is_active && 'opacity-60'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{route.name}</h3>
                    {route.notifications && <Bell size={12} className="text-blue-500" />}
                    {!route.is_active && <span className="text-[10px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded">Paused</span>}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">{route.origin} → {route.destination}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleToggleRoute(route.id)} data-testid={`toggle-route-${route.id}`}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${route.is_active ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                    {route.is_active ? <Play className="text-emerald-500" size={14} /> : <Pause className="text-slate-400" size={14} />}
                  </button>
                  <button onClick={() => handleDeleteRoute(route.id)} data-testid={`delete-route-${route.id}`}
                    className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <Trash2 className="text-red-500" size={14} />
                  </button>
                </div>
              </div>
              
              {/* Route Details */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-slate-50 rounded-lg p-2 text-center">
                  <Clock className="mx-auto text-blue-500 mb-1" size={14} />
                  <p className="text-xs font-medium text-slate-900">{route.departure_time}</p>
                  <p className="text-[10px] text-slate-500">Depart</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2 text-center">
                  <Timer className="mx-auto text-emerald-500 mb-1" size={14} />
                  <p className="text-xs font-medium text-slate-900">{route.estimated_time} min</p>
                  <p className="text-[10px] text-slate-500">Duration</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2 text-center">
                  <Route className="mx-auto text-purple-500 mb-1" size={14} />
                  <p className="text-xs font-medium text-slate-900">{route.distance} mi</p>
                  <p className="text-[10px] text-slate-500">Distance</p>
                </div>
              </div>

              {/* Days */}
              <div className="flex items-center gap-1 mb-3">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <span key={day} className={`text-[10px] px-2 py-1 rounded ${route.days_active.includes(day) ? 'bg-blue-100 text-blue-600 font-medium' : 'bg-slate-100 text-slate-400'}`}>
                    {day}
                  </span>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button onClick={() => handleToggleRouteNotifications(route.id)} data-testid={`toggle-notif-${route.id}`}
                  className="text-xs text-slate-500 flex items-center gap-1 hover:text-blue-500">
                  {route.notifications ? <Bell size={12} className="text-blue-500" /> : <EyeOff size={12} />}
                  {route.notifications ? 'Alerts on' : 'Alerts off'}
                </button>
                <button onClick={() => handleStartNavigation(route.destination)} data-testid={`start-route-${route.id}`}
                  className="bg-blue-500 text-white px-4 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1">
                  <Navigation size={12} /> Start
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )

  // Profile Tab
  const renderProfile = () => (
    <div className="flex-1 bg-slate-100 overflow-auto">
      {/* Header with Car */}
      <div className="bg-gradient-to-b from-blue-500 to-blue-600 px-4 pt-4 pb-6">
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
            { value: `${(userData.gems / 1000).toFixed(1)}K`, label: 'Gems', icon: '💎' },
            { value: `#${userData.rank}`, label: 'Rank', icon: '🏆' },
            { value: userData.total_trips, label: 'Trips', icon: '🚗' },
            { value: `${(userData.total_miles / 1000).toFixed(1)}K`, label: 'Miles', icon: '📍' },
          ].map((s, i) => (
            <div key={i} className="bg-white/10 rounded-xl p-2 text-center">
              <span className="text-sm">{s.icon}</span>
              <p className="text-white font-bold text-sm">{s.value}</p>
              <p className="text-blue-200 text-[10px]">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white px-4 py-2 flex border-b border-slate-200 sticky top-0 z-10">
        {(['overview', 'score', 'fuel', 'settings'] as const).map(tab => (
          <button key={tab} onClick={() => setProfileTab(tab)} data-testid={`profile-tab-${tab}`}
            className={`flex-1 py-2 text-xs font-medium capitalize ${profileTab === tab ? 'text-blue-500 border-b-2 border-blue-500' : 'text-slate-400'}`}>
            {tab}
          </button>
        ))}
      </div>

      {profileTab === 'overview' && (
        <div className="p-4 space-y-2">
          {/* Level/XP Card */}
          <button 
            onClick={() => setShowLevelProgress(true)}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-4 flex items-center gap-4 shadow-lg"
            data-testid="profile-level"
          >
            <div className="w-14 h-14 rounded-full bg-white/20 flex flex-col items-center justify-center">
              <span className="text-white text-xs font-medium">LVL</span>
              <span className="text-white text-xl font-bold">{userData.level}</span>
            </div>
            <div className="flex-1 text-left">
              <p className="text-white font-semibold">Level {userData.level}</p>
              <p className="text-blue-200 text-xs">
                {userData.xp?.toLocaleString() || 0} XP total
              </p>
            </div>
            <div className="text-right">
              <span className="text-blue-200 text-xs">View Progress →</span>
            </div>
          </button>

          {/* Driving Score Card */}
          <button 
            onClick={() => setShowDrivingScore(true)}
            className={`w-full rounded-xl p-4 flex items-center gap-4 shadow-lg ${
              userPlan === 'premium' 
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500' 
                : 'bg-gradient-to-r from-slate-600 to-slate-700'
            }`}
            data-testid="profile-driving-score"
          >
            <div className={`w-14 h-14 rounded-full flex flex-col items-center justify-center ${
              userPlan === 'premium' ? 'bg-white/20' : 'bg-amber-500/30'
            }`}>
              <Shield className="text-white" size={24} />
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <p className="text-white font-semibold">Driving Score</p>
                {userPlan !== 'premium' && (
                  <span className="bg-amber-500 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    PREMIUM
                  </span>
                )}
              </div>
              <p className={`text-xs ${userPlan === 'premium' ? 'text-emerald-200' : 'text-slate-400'}`}>
                {userPlan === 'premium' ? 'View detailed insights & Orion tips' : 'Unlock with Premium'}
              </p>
            </div>
            <div className="text-right">
              <span className={`text-xs ${userPlan === 'premium' ? 'text-emerald-200' : 'text-amber-400'}`}>
                {userPlan === 'premium' ? 'View →' : 'Upgrade →'}
              </span>
            </div>
          </button>

          {/* Weekly Recap Card (Premium) */}
          <button 
            onClick={() => setShowWeeklyRecap(true)}
            className={`w-full rounded-xl p-4 flex items-center gap-4 shadow-lg ${
              userPlan === 'premium' 
                ? 'bg-gradient-to-r from-purple-500 to-pink-500' 
                : 'bg-gradient-to-r from-slate-600 to-slate-700'
            }`}
            data-testid="profile-weekly-recap"
          >
            <div className={`w-14 h-14 rounded-full flex flex-col items-center justify-center ${
              userPlan === 'premium' ? 'bg-white/20' : 'bg-amber-500/30'
            }`}>
              <Trophy className="text-yellow-300" size={24} />
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <p className="text-white font-semibold">Weekly Recap</p>
                {userPlan !== 'premium' && (
                  <span className="bg-amber-500 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    PREMIUM
                  </span>
                )}
              </div>
              <p className={`text-xs ${userPlan === 'premium' ? 'text-purple-200' : 'text-slate-400'}`}>
                {userPlan === 'premium' ? 'View your week in review' : 'Unlock with Premium'}
              </p>
            </div>
            <div className="text-right">
              <span className={`text-xs ${userPlan === 'premium' ? 'text-purple-200' : 'text-amber-400'}`}>
                {userPlan === 'premium' ? 'View →' : 'Upgrade →'}
              </span>
            </div>
          </button>

          {/* My Car Card */}
          <button 
            onClick={() => setShowCarStudio(true)}
            className="w-full bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-4 flex items-center gap-4 shadow-lg"
            data-testid="profile-my-car"
          >
            <div className="w-16 h-12 flex items-center justify-center">
              <ProfileCar 
                category={userCar.category as any}
                color={userCar.color as any}
                size={64}
              />
            </div>
            <div className="flex-1 text-left">
              <p className="text-white font-semibold">My Car</p>
              <p className="text-slate-400 text-xs">
                {CAR_COLORS[userCar.color as keyof typeof CAR_COLORS]?.name || 'Custom'} {userCar.category}
              </p>
            </div>
            <div className="text-right">
              <span className="text-amber-400 text-xs">Customize →</span>
            </div>
          </button>

          {[
            { icon: Trophy, label: 'Achievements', value: `${badges.filter(b => b.earned).length}/160 badges`, action: () => setShowBadgesGrid(true), color: 'bg-amber-100', iconColor: 'text-amber-500' },
            { icon: Award, label: 'Community Badges', value: 'Help other drivers', action: () => setShowCommunityBadges(true), color: 'bg-purple-100', iconColor: 'text-purple-500' },
            { icon: AlertTriangle, label: 'Road Reports', value: 'Report hazards', action: () => setShowRoadReports(true), color: 'bg-orange-100', iconColor: 'text-orange-500' },
            { icon: Route, label: 'My Routes', value: `${routes.length} saved`, action: () => setActiveTab('routes'), color: 'bg-blue-100', iconColor: 'text-blue-500' },
            { icon: History, label: 'Trip History', value: `${userData.total_trips} trips`, action: () => setShowTripHistory(true), color: 'bg-slate-100', iconColor: 'text-slate-500' },
            { icon: Gem, label: 'Gem History', value: '+2,450 this month', action: () => setShowGemHistory(true), color: 'bg-cyan-100', iconColor: 'text-cyan-500' },
            { icon: Users, label: 'Friends', value: `${userData.friends_count || 0} friends`, action: () => setShowFriendsHub(true), color: 'bg-green-100', iconColor: 'text-green-500' },
          ].map((item, i) => (
            <button key={i} onClick={item.action} data-testid={`profile-${item.label.toLowerCase().replace(' ', '-')}`}
              className="w-full bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md">
              <div className={`w-10 h-10 ${item.color} rounded-xl flex items-center justify-center`}>
                <item.icon className={item.iconColor} size={18} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-slate-900">{item.label}</p>
                <p className="text-xs text-slate-500">{item.value}</p>
              </div>
              <ChevronRight className="text-slate-400" size={16} />
            </button>
          ))}
          
          {/* Share Last Trip Card */}
          <button 
            onClick={handleShareTrip} 
            data-testid="share-trip-score-btn"
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl p-4 flex items-center gap-3 shadow-lg hover:shadow-xl mt-3"
          >
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Share2 className="text-white" size={18} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-white">Share Trip Score</p>
              <p className="text-xs text-blue-200">Show off your safe driving!</p>
            </div>
            <ChevronRight className="text-white/80" size={16} />
          </button>
        </div>
      )}

      {profileTab === 'score' && (
        <div className="p-4">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex justify-center mb-6">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full -rotate-90">
                  <circle cx="64" cy="64" r="56" stroke="#e2e8f0" strokeWidth="10" fill="none" />
                  <circle cx="64" cy="64" r="56" 
                    stroke={userData.safety_score >= 90 ? '#22c55e' : userData.safety_score >= 70 ? '#eab308' : '#ef4444'}
                    strokeWidth="10" fill="none" strokeDasharray={`${(userData.safety_score / 100) * 352} 352`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold text-slate-900">{userData.safety_score}</span>
                  <span className="text-xs text-slate-500">Safety Score</span>
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
                    <span className="text-sm text-slate-600">{cat.label}</span>
                    <span className="text-sm font-medium text-slate-900">{cat.score}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className={`h-2 rounded-full ${cat.score >= 90 ? 'bg-emerald-500' : cat.score >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
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
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">This Week</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-slate-900">12.4</p>
                  <p className="text-xs text-slate-500">Gallons</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-500">$43.20</p>
                  <p className="text-xs text-slate-500">Spent</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-500">28.4</p>
                  <p className="text-xs text-slate-500">MPG</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl p-6 text-center">
              <Lock className="mx-auto text-slate-400 mb-3" size={40} />
              <h3 className="text-lg font-bold text-slate-900">Premium Feature</h3>
              <p className="text-sm text-slate-500 mt-1">Upgrade to track fuel usage</p>
              <button data-testid="upgrade-btn" onClick={() => toast('Upgrading...')}
                className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-lg text-sm font-medium">
                Upgrade Now
              </button>
            </div>
          )}
        </div>
      )}

      {profileTab === 'settings' && (
        <div className="p-4 space-y-2">
          {/* Plan Management Card */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-4 mb-2">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-white font-semibold text-sm">Your Plan</p>
                <div className="flex items-center gap-2 mt-1">
                  {userData.is_premium ? (
                    <span className="text-xs bg-gradient-to-r from-amber-400 to-orange-400 text-amber-900 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <Zap size={10} /> PREMIUM
                    </span>
                  ) : (
                    <span className="text-xs bg-slate-600 text-slate-300 px-2 py-0.5 rounded-full font-medium">
                      BASIC
                    </span>
                  )}
                  <span className="text-slate-400 text-xs">
                    {userData.is_premium ? '2× gems' : '1× gems'}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setShowPlanSelection(true)}
                data-testid="change-plan-btn"
                className="bg-blue-500 hover:bg-blue-400 text-white text-xs font-medium px-3 py-1.5 rounded-lg"
              >
                {userData.is_premium ? 'Manage' : 'Upgrade'}
              </button>
            </div>
          </div>
          
          {[
            { icon: Bell, label: 'Notifications', id: 'notifications', desc: 'Manage alerts', action: () => setShowNotificationSettings(true) },
            { icon: Volume2, label: 'Voice Settings', id: 'voice', desc: isMuted ? 'Muted' : 'Active', action: handleToggleVoice },
            { icon: Layers, label: 'Map Widgets', id: 'widgets', desc: 'Customize display', action: () => setShowWidgetSettings(true) },
            { icon: Fuel, label: 'Fuel Tracker', id: 'fuel', desc: 'Log fill-ups', action: () => setShowFuelTracker(true) },
            { icon: HelpCircle, label: 'Help & Support', id: 'help', desc: 'Get assistance', action: () => setShowHelpSupport(true) },
          ].map((item, i) => (
            <button key={i} onClick={item.action} data-testid={`settings-${item.id}`}
              className="w-full bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm">
              <item.icon className="text-slate-600" size={20} />
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-slate-900">{item.label}</p>
                <p className="text-xs text-slate-500">{item.desc}</p>
              </div>
              <ChevronRight className="text-slate-400" size={16} />
            </button>
          ))}
        </div>
      )}
    </div>
  )

  // ==================== MODALS ====================

  // Search Modal - Enhanced with backend API integration
  const renderSearchModal = () => showSearch && (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center pt-4" onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]) }}>
      <div className="w-[95%] max-w-md bg-slate-900 rounded-2xl p-4 animate-scale-in" onClick={e => e.stopPropagation()}>
        {/* Search Input */}
        <div className="flex items-center gap-2 bg-slate-800 rounded-xl px-3 py-3 mb-3">
          <Search className="text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search destination..." 
            autoFocus
            value={searchQuery}
            onChange={e => handleSearchChange(e.target.value)}
            data-testid="search-modal-input"
            className="flex-1 bg-transparent text-white text-sm outline-none" 
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setSearchResults([]) }}>
              <X className="text-slate-400" size={16} />
            </button>
          )}
        </div>

        {/* Loading Indicator */}
        {isSearching && (
          <div className="flex items-center justify-center py-4">
            <div className="w-5 h-5 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
            <span className="text-slate-400 text-sm ml-2">Searching...</span>
          </div>
        )}

        {/* Search Results */}
        {!isSearching && searchResults.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto mb-3">
            {searchResults.map(result => (
              <button 
                key={result.id} 
                onClick={() => handleSelectDestination(result)} 
                data-testid={`search-result-${result.id}`}
                className="w-full p-3 bg-slate-800 rounded-xl text-left hover:bg-slate-700 flex items-start gap-3 transition-colors"
              >
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin className="text-blue-400" size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{result.name}</p>
                  <p className="text-slate-400 text-xs truncate">{result.address}</p>
                </div>
                {result.distance_km && (
                  <span className="text-slate-500 text-xs flex-shrink-0">{result.distance_km} km</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Quick Places (shown when no search query) */}
        {!searchQuery && (
          <>
            <p className="text-slate-400 text-xs mb-2 px-1">Quick Places</p>
            <div className="space-y-2">
              {['Home', 'Work', 'Gym', 'School'].map(place => (
                <button key={place} onClick={() => { handleStartNavigation(place); setShowSearch(false) }} data-testid={`search-${place.toLowerCase()}`}
                  className="w-full p-3 bg-slate-800 rounded-xl text-left hover:bg-slate-700 flex items-center gap-3 transition-colors">
                  <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center">
                    {place === 'Home' ? <Home className="text-blue-400" size={14} /> : 
                     place === 'Work' ? <Briefcase className="text-green-400" size={14} /> :
                     place === 'Gym' ? <Dumbbell className="text-purple-400" size={14} /> :
                     <School className="text-amber-400" size={14} />}
                  </div>
                  <span className="text-white text-sm">{place}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* No Results */}
        {!isSearching && searchQuery && searchResults.length === 0 && (
          <div className="text-center py-4">
            <p className="text-slate-400 text-sm">No locations found</p>
            <p className="text-slate-500 text-xs mt-1">Try a different search term</p>
          </div>
        )}
      </div>
    </div>
  )

  // Notifications Modal
  const renderNotificationsModal = () => showNotifications && (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center pt-20" onClick={() => setShowNotifications(false)}>
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

  // Add Location Modal
  const renderAddLocationModal = () => showAddLocation && (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowAddLocation(false)}>
      <div className="w-full max-w-sm bg-slate-900 rounded-2xl p-4 animate-scale-in" onClick={e => e.stopPropagation()}>
        <h3 className="text-white font-semibold mb-4">Add Location</h3>
        <div className="space-y-3">
          <input type="text" placeholder="Location name" value={newLocation.name}
            onChange={e => setNewLocation({ ...newLocation, name: e.target.value })}
            className="w-full bg-slate-800 rounded-xl px-3 py-2 text-white text-sm outline-none" />
          <input type="text" placeholder="Address" value={newLocation.address}
            onChange={e => setNewLocation({ ...newLocation, address: e.target.value })}
            className="w-full bg-slate-800 rounded-xl px-3 py-2 text-white text-sm outline-none" />
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
          <button onClick={() => setShowAddLocation(false)} className="flex-1 bg-slate-700 text-white py-2 rounded-xl text-sm">Cancel</button>
          <button onClick={handleAddLocation} data-testid="save-location-btn" className="flex-1 bg-blue-500 text-white py-2 rounded-xl text-sm">Save</button>
        </div>
      </div>
    </div>
  )

  // Add Route Modal
  const renderAddRouteModal = () => showAddRoute && (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowAddRoute(false)}>
      <div className="w-full max-w-sm bg-slate-900 rounded-2xl p-4 animate-scale-in" onClick={e => e.stopPropagation()}>
        <h3 className="text-white font-semibold mb-4">Add Route</h3>
        <div className="space-y-3">
          <input type="text" placeholder="Route name" value={newRoute.name}
            onChange={e => setNewRoute({ ...newRoute, name: e.target.value })}
            className="w-full bg-slate-800 rounded-xl px-3 py-2 text-white text-sm outline-none" />
          <input type="text" placeholder="Origin" value={newRoute.origin}
            onChange={e => setNewRoute({ ...newRoute, origin: e.target.value })}
            className="w-full bg-slate-800 rounded-xl px-3 py-2 text-white text-sm outline-none" />
          <input type="text" placeholder="Destination" value={newRoute.destination}
            onChange={e => setNewRoute({ ...newRoute, destination: e.target.value })}
            className="w-full bg-slate-800 rounded-xl px-3 py-2 text-white text-sm outline-none" />
          <input type="time" value={newRoute.departure_time}
            onChange={e => setNewRoute({ ...newRoute, departure_time: e.target.value })}
            className="w-full bg-slate-800 rounded-xl px-3 py-2 text-white text-sm outline-none" />
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={() => setShowAddRoute(false)} className="flex-1 bg-slate-700 text-white py-2 rounded-xl text-sm">Cancel</button>
          <button onClick={handleAddRoute} data-testid="save-route-btn" className="flex-1 bg-blue-500 text-white py-2 rounded-xl text-sm">Save</button>
        </div>
      </div>
    </div>
  )

  // Widget Settings Modal
  const renderWidgetSettingsModal = () => showWidgetSettings && (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowWidgetSettings(false)}>
      <div className="w-full max-w-sm bg-slate-900 rounded-2xl p-4 animate-scale-in" onClick={e => e.stopPropagation()}>
        <h3 className="text-white font-semibold mb-4">Map Widgets</h3>
        <div className="space-y-3">
          {Object.entries(widgets).map(([key, widget]) => (
            <div key={key} className="flex items-center justify-between bg-slate-800 rounded-xl p-3">
              <span className="text-white text-sm capitalize">{key} Widget</span>
              <button onClick={() => toggleWidgetVisibility(key)} data-testid={`toggle-widget-${key}`}
                className={`w-12 h-6 rounded-full transition-colors ${widget.visible ? 'bg-blue-500' : 'bg-slate-600'}`}>
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${widget.visible ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
          ))}
        </div>
        <p className="text-slate-400 text-xs mt-3">💡 Tip: Drag widgets on the map to reposition them</p>
        <button onClick={() => setShowWidgetSettings(false)} className="w-full bg-blue-500 text-white py-2 rounded-xl text-sm mt-4">Done</button>
      </div>
    </div>
  )

  // Offer Detail Modal
  const renderOfferDetailModal = () => showOfferDetail && (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center" onClick={() => setShowOfferDetail(null)}>
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
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center" onClick={() => setShowReportModal(false)}>
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
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowFamilyMember(null)}>
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
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      {/* iPhone Frame */}
      <div className="w-full max-w-[390px] h-[844px] bg-black rounded-[55px] p-3 shadow-2xl relative overflow-hidden">
        {/* Dynamic Island */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-32 h-8 bg-black rounded-full z-50" />
        
        {/* Screen */}
        <div className="w-full h-full bg-slate-900 rounded-[45px] overflow-hidden flex flex-col relative">
          {/* Status Bar */}
          <div className="h-12 bg-slate-900 flex items-end justify-between px-6 pb-1 text-white text-xs font-medium">
            <span>9:41</span>
            <div className="flex items-center gap-1">
              <span>5G</span>
              <Battery size={16} />
            </div>
          </div>

          {/* Content */}
          {activeTab === 'map' && renderMap()}
          {activeTab === 'routes' && renderRoutes()}
          {activeTab === 'rewards' && renderRewards()}
          {activeTab === 'profile' && renderProfile()}

          {/* Bottom Navigation - 4 Tabs */}
          <div className="h-20 bg-white border-t border-slate-200 flex items-start pt-2 px-4">
            {[
              { id: 'map', icon: MapPin, label: 'Map' },
              { id: 'routes', icon: Route, label: 'Routes' },
              { id: 'rewards', icon: Gift, label: 'Rewards' },
              { id: 'profile', icon: Settings, label: 'Profile' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as TabType)} data-testid={`nav-${tab.id}`}
                className={`flex-1 flex flex-col items-center py-1 ${activeTab === tab.id ? 'text-blue-500' : 'text-slate-400'}`}>
                <tab.icon size={22} />
                <span className="text-[11px] mt-0.5 font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showMenu && renderMenu()}
      {renderSearchModal()}
      {renderNotificationsModal()}
      {renderAddLocationModal()}
      {renderAddRouteModal()}
      {renderWidgetSettingsModal()}
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

      {/* Comprehensive Analytics Dashboard */}
      {showFuelDashboard && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setShowFuelDashboard(false)}>
          <div className="w-full max-w-md max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden animate-scale-in flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header - Fixed */}
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

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Nearby Gas Prices */}
              <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-xl p-4 mb-4 border border-amber-500/20">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Fuel className="text-amber-400" size={18} />
                  Nearby Gas Prices
                </h3>
                <div className="space-y-2">
                  {[
                    { name: 'Shell - Polaris', price: 3.29, distance: '0.3 mi', isFavorite: true },
                    { name: 'BP - Downtown', price: 3.35, distance: '0.8 mi', isFavorite: false },
                    { name: 'Speedway - Campus', price: 3.19, distance: '1.2 mi', isFavorite: true },
                  ].map((station, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-800/50 rounded-lg p-2">
                      <div className="flex items-center gap-2">
                        {station.isFavorite && <Star className="text-amber-400" size={12} fill="#fbbf24" />}
                        <div>
                          <p className="text-white text-sm font-medium">{station.name}</p>
                          <p className="text-slate-400 text-xs">{station.distance}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-emerald-400">${station.price.toFixed(2)}</p>
                        <p className="text-slate-500 text-[10px]">/gal</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-slate-500 text-[10px] mt-2 text-center">⭐ Prices from your frequent stations</p>
              </div>

              {/* Main Stats Grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl p-3 border border-blue-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="text-blue-400" size={18} />
                    <span className="text-slate-400 text-xs">Driver Score</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{userData.safety_score || 85}</p>
                  <p className="text-blue-400 text-xs">{(userData.safety_score || 85) >= 90 ? 'Excellent' : (userData.safety_score || 85) >= 70 ? 'Good' : 'Needs Work'}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 rounded-xl p-3 border border-emerald-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="text-emerald-400" size={18} />
                    <span className="text-slate-400 text-xs">Money Saved</span>
                  </div>
                  <p className="text-2xl font-bold text-white">${(((userData.total_miles || 0) / 28.5) * 3.29 * 0.15).toFixed(0)}</p>
                  <p className="text-emerald-400 text-xs">Eco driving @ $3.29/gal</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/20 rounded-xl p-3 border border-amber-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Droplets className="text-amber-400" size={18} />
                    <span className="text-slate-400 text-xs">Gallons Saved</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{((userData.total_miles || 0) / 28.5 * 0.15).toFixed(1)}</p>
                  <p className="text-amber-400 text-xs">15% eco bonus</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl p-3 border border-purple-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Leaf className="text-purple-400" size={18} />
                    <span className="text-slate-400 text-xs">CO₂ Reduced</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{((userData.total_miles || 0) * 0.41 * 0.15).toFixed(0)} lb</p>
                  <p className="text-purple-400 text-xs">Environmental impact</p>
                </div>
              </div>

              {/* Driving Habits */}
              <div className="bg-slate-800 rounded-xl p-4 mb-4">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Target className="text-blue-400" size={18} />
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
                        <span className="text-slate-400 text-sm">{habit.label}</span>
                        <span className="text-white text-sm font-medium">{habit.score}%</span>
                      </div>
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div className={`h-full ${habit.color} rounded-full transition-all`} style={{ width: `${habit.score}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trip Summary */}
              <div className="bg-slate-800 rounded-xl p-4 mb-4">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Route className="text-emerald-400" size={18} />
                  Trip Summary
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{userData.total_trips || 0}</p>
                    <p className="text-slate-400 text-xs">Total Trips</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{userData.total_miles || 0}</p>
                    <p className="text-slate-400 text-xs">Miles Driven</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{((userData.total_miles || 0) / Math.max(userData.total_trips || 1, 1)).toFixed(1)}</p>
                    <p className="text-slate-400 text-xs">Avg Distance</p>
                  </div>
                </div>
              </div>

              {/* Fuel Stats */}
              <div className="bg-slate-800 rounded-xl p-4">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Fuel className="text-amber-400" size={18} />
                  Fuel Efficiency
                </h3>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-3xl font-bold text-white">28.5</p>
                    <p className="text-slate-400 text-xs">Avg MPG</p>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-400 text-sm font-medium">+15% better</p>
                    <p className="text-slate-500 text-xs">than avg driver</p>
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
      <CommunityBadges
        isOpen={showCommunityBadges}
        onClose={() => setShowCommunityBadges(false)}
      />
      <LevelProgress
        isOpen={showLevelProgress}
        onClose={() => setShowLevelProgress(false)}
      />
      
      {/* Orion Voice & Quick Photo */}
      <OrionVoice
        isOpen={showOrionVoice}
        onClose={() => setShowOrionVoice(false)}
        onReportCreated={handleOrionReport}
        isNavigating={isNavigating}
        currentLocation={userLocation}
        onNavigateToOffer={(offer) => {
          setSelectedDestination({
            name: offer.business_name,
            lat: offer.lat,
            lng: offer.lng
          })
          setShowOrionVoice(false)
          toast.success(`Navigating to ${offer.business_name}`)
        }}
      />
      <QuickPhotoReport
        isOpen={showQuickPhotoReport}
        onClose={() => setShowQuickPhotoReport(false)}
        onSubmit={handleQuickPhotoReport}
        currentLocation={userLocation}
        isMoving={isNavigating}
        currentSpeed={currentSpeed}
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
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4" onClick={() => setShowAppTour(false)}>
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
      
      {/* Orion Offer Alerts (during navigation) */}
      <OrionOfferAlerts
        isNavigating={isNavigating}
        userLocation={userLocation}
        offers={offers}
        onOfferSelect={handleDirectRedemption}
        isPremium={userPlan === 'premium'}
      />
      
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
