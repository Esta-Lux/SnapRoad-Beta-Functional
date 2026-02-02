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
  History, Download, BarChart3, HelpCircle, Lock, Edit2
} from 'lucide-react'

const API_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || ''

// Types
type TabType = 'map' | 'offers' | 'routes' | 'engagement' | 'profile'
type EngagementTab = 'badges' | 'skins' | 'challenges' | 'reports'
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
  
  // Main state
  const [activeTab, setActiveTab] = useState<TabType>('map')
  const [engagementTab, setEngagementTab] = useState<EngagementTab>('badges')
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
  
  // Data states
  const [locations, setLocations] = useState<SavedLocation[]>([])
  const [routes, setRoutes] = useState<SavedRoute[]>([])
  const [offers, setOffers] = useState<any[]>([])
  const [badges, setBadges] = useState<any[]>([])
  const [skins, setSkins] = useState<any[]>([])
  const [family, setFamily] = useState<any[]>([])
  const [userData, setUserData] = useState<any>({
    name: user?.name || 'Sarah Johnson',
    gems: 12400, level: 42, safety_score: 87, streak: 14,
    total_miles: 2847, total_trips: 156, badges_earned: 11, rank: 42,
    is_premium: true, member_since: 'Jan 2025'
  })
  
  // Widget states - positioned below location panel (which ends around y=280)
  const [widgets, setWidgets] = useState<Record<string, WidgetState>>({
    score: { visible: true, collapsed: false, position: { x: 12, y: 290 } },
    gems: { visible: true, collapsed: false, position: { x: 260, y: 290 } },
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
      }, 3000)
      return () => clearInterval(interval)
    } else {
      setCurrentSpeed(0)
    }
  }, [isNavigating])

  // Load all data from API
  const loadData = async () => {
    try {
      const [locRes, routeRes, offerRes, badgeRes, skinRes, famRes, userRes] = await Promise.all([
        api.get('/api/locations'),
        api.get('/api/routes'),
        api.get('/api/offers'),
        api.get('/api/badges'),
        api.get('/api/skins'),
        api.get('/api/family/members'),
        api.get('/api/user/profile')
      ])
      if (locRes.success) setLocations(locRes.data)
      if (routeRes.success) setRoutes(routeRes.data)
      if (offerRes.success) setOffers(offerRes.data)
      if (badgeRes.success) setBadges(badgeRes.data)
      if (skinRes.success) setSkins(skinRes.data)
      if (famRes.success) setFamily(famRes.data)
      if (userRes.success) setUserData(userRes.data)
    } catch (e) {
      console.log('Using mock data')
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
    try {
      await api.post('/api/navigation/stop')
      toast.success('Navigation stopped')
    } catch (e) {
      toast.success('Navigation stopped')
    }
  }

  const handleVoiceCommand = async () => {
    toast('🎤 Listening...', { duration: 2000 })
    try {
      const res = await api.post('/api/navigation/voice-command')
      setTimeout(() => {
        toast.success(res.data?.command || 'Voice: "Navigate to Work"')
        handleStartNavigation('Work')
      }, 2000)
    } catch (e) {
      setTimeout(() => {
        toast.success('Voice: "Navigate to Work"')
        handleStartNavigation('Work')
      }, 2000)
    }
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

  // Offer handlers
  const handleRedeemOffer = async (offer: any) => {
    if (userData.gems >= offer.gems) {
      try {
        const res = await api.post(`/api/offers/${offer.id}/redeem`)
        toast.success(res.message || `Redeemed "${offer.name}" for ${offer.gems} gems!`)
        setShowOfferDetail(null)
      } catch (e) {
        toast.success(`Redeemed "${offer.name}" for ${offer.gems} gems!`)
        setShowOfferDetail(null)
      }
    } else {
      toast.error(`Need ${offer.gems - userData.gems} more gems!`)
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

  // Get filtered locations by category
  const getFilteredLocations = () => {
    if (locationCategory === 'home') return locations.filter(l => l.category === 'home')
    if (locationCategory === 'work') return locations.filter(l => l.category === 'work')
    return locations.filter(l => !['home', 'work'].includes(l.category))
  }

  // ==================== RENDER FUNCTIONS ====================

  // Hamburger Menu
  const renderMenu = () => (
    <div className="fixed inset-0 bg-black/80 z-50 flex" onClick={() => setShowMenu(false)}>
      <div className="w-72 bg-slate-900 h-full animate-slide-right" onClick={e => e.stopPropagation()}>
        <div className="p-4 bg-gradient-to-r from-blue-600 to-blue-500">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-blue-500 font-bold text-lg">
              {userData.name?.split(' ').map((n: string) => n[0]).join('')}
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">{userData.name}</h3>
              <p className="text-blue-200 text-xs">Level {userData.level} • {userData.is_premium ? '⚡ PRO' : 'Free'}</p>
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

        <div className="p-2 overflow-auto" style={{ maxHeight: 'calc(100% - 180px)' }}>
          <p className="text-slate-500 text-[10px] font-medium px-3 py-2">NAVIGATION</p>
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
            { icon: Gift, label: 'Offers', badge: offers.length, action: () => { setActiveTab('offers'); setShowMenu(false) } },
            { icon: Trophy, label: 'Achievements', action: () => { setActiveTab('engagement'); setEngagementTab('badges'); setShowMenu(false) } },
            { icon: BarChart3, label: 'Leaderboard', action: () => toast('Opening leaderboard...') },
          ].map((item, i) => (
            <button key={i} onClick={item.action} data-testid={`menu-${item.label.toLowerCase()}`}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white">
              <item.icon size={16} />
              <span className="flex-1 text-left text-sm">{item.label}</span>
              {item.badge && <span className="text-xs bg-slate-700 px-2 py-0.5 rounded-full">{item.badge}</span>}
            </button>
          ))}

          <p className="text-slate-500 text-[10px] font-medium px-3 py-2 mt-2">SETTINGS</p>
          {[
            { icon: Volume2, label: isMuted ? 'Unmute' : 'Mute', action: handleToggleVoice },
            { icon: Settings, label: 'Settings', action: () => { setActiveTab('profile'); setProfileTab('settings'); setShowMenu(false) } },
            { icon: HelpCircle, label: 'Help', action: () => toast('Opening help...') },
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
      
      {/* Map Background - Clean */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-700 to-slate-900">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%234a5568' fill-opacity='0.3'%3E%3Cpath d='M0 0h40v40H0z' fill='none'/%3E%3Cpath d='M20 0v40M0 20h40' stroke='%234a5568' stroke-width='0.5'/%3E%3C/g%3E%3C/svg%3E")`
        }} />
      </div>

      {/* Top Bar - Google Maps Style */}
      <div className="absolute top-3 left-3 right-3 z-10">
        {/* Search Bar */}
        <button onClick={() => setShowSearch(true)} data-testid="search-btn" 
          className="w-full bg-slate-900/95 backdrop-blur rounded-full px-4 h-12 flex items-center gap-3 shadow-lg">
          <Menu className="text-slate-400" size={20} onClick={(e) => { e.stopPropagation(); setShowMenu(true) }} />
          <span className="flex-1 text-slate-400 text-sm text-left">{isNavigating ? 'Navigating...' : 'Search here'}</span>
          <Mic className="text-slate-400" size={20} onClick={(e) => { e.stopPropagation(); handleVoiceCommand() }} />
        </button>

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
              <button key={i} onClick={() => { setActiveTab('offers'); setOfferFilter(item.label.toLowerCase() === 'gas' ? 'gas' : item.label.toLowerCase() === 'coffee' ? 'cafe' : 'all') }}
                data-testid={`nearby-${item.label.toLowerCase()}`}
                className="flex-shrink-0 bg-slate-900/90 backdrop-blur rounded-full px-4 py-2 flex items-center gap-2">
                <item.icon size={16} className={`text-${item.color}-400`} />
                <span className="text-white text-sm">{item.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

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
              <button onClick={() => setActiveTab('offers')} data-testid="earn-gems-btn"
                className="w-full mt-1 bg-emerald-500/20 text-emerald-400 text-[10px] py-1 rounded-lg hover:bg-emerald-500/30">
                Earn More
              </button>
            </div>
          )}
        </div>
      )}

      {/* Current Location Marker */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg" />
        <div className="absolute inset-0 w-4 h-4 bg-blue-500/30 rounded-full animate-ping" />
      </div>

      {/* Action Buttons - Right Side */}
      <div className="absolute right-3 bottom-20 flex flex-col gap-2">
        <button onClick={() => setShowReportModal(true)} data-testid="report-btn"
          className="w-11 h-11 bg-slate-900/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg">
          <Camera className="text-white" size={18} />
        </button>
        {isNavigating ? (
          <button onClick={handleStopNavigation} data-testid="stop-nav-btn"
            className="w-11 h-11 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
            <X className="text-white" size={18} />
          </button>
        ) : (
          <button onClick={() => handleStartNavigation()} data-testid="start-nav-btn"
            className="w-11 h-11 bg-blue-500 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-600">
            <Navigation className="text-white" size={18} />
          </button>
        )}
      </div>

      {/* Map Controls - Left Side */}
      <div className="absolute left-3 bottom-20 flex flex-col gap-2">
        <button onClick={() => toast('Centering map')} data-testid="center-map-btn"
          className="w-10 h-10 bg-slate-900/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg">
          <Compass className="text-white" size={16} />
        </button>
        <button onClick={() => setShowWidgetSettings(true)} data-testid="layers-btn"
          className="w-10 h-10 bg-slate-900/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg">
          <Layers className="text-white" size={16} />
        </button>
      </div>

      {/* Speed Display (when navigating) */}
      {isNavigating && (
        <div className="absolute left-3 bottom-40 bg-slate-900/95 backdrop-blur rounded-xl p-3 text-center">
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

  // Offers Tab - More Detailed
  const renderOffers = () => (
    <div className="flex-1 bg-slate-100 overflow-auto">
      <div className="bg-white px-4 pt-3 pb-2 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Offers Nearby</h1>
            <p className="text-xs text-emerald-600 font-medium">{offers.filter(o => offerFilter === 'all' || o.type === offerFilter).length} active deals</p>
          </div>
          <button onClick={loadData} data-testid="refresh-offers-btn" className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center">
            <RefreshCw className="text-slate-600" size={16} />
          </button>
        </div>
        <div className="flex gap-2">
          {(['all', 'gas', 'cafe'] as const).map(f => (
            <button key={f} onClick={() => setOfferFilter(f)} data-testid={`offer-filter-${f}`}
              className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 ${offerFilter === f ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {f === 'gas' && <Fuel size={12} />}
              {f === 'cafe' && <Coffee size={12} />}
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Savings Card */}
      <div className="mx-4 mt-3 p-4 bg-gradient-to-r from-blue-500 to-emerald-400 rounded-xl text-white">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[10px] text-blue-100 font-medium flex items-center gap-1"><Zap size={10} /> POTENTIAL SAVINGS</p>
            <p className="text-2xl font-bold">$127.50</p>
            <p className="text-xs text-blue-100">{offers.length} offers available</p>
          </div>
          <div className="bg-white/20 rounded-lg px-3 py-2 text-right">
            <p className="text-[10px] text-blue-100">MY GEMS</p>
            <p className="text-lg font-bold flex items-center gap-1"><Gem size={14} /> {(userData.gems / 1000).toFixed(1)}K</p>
          </div>
        </div>
      </div>

      {/* Offers List */}
      <div className="p-4 space-y-2">
        {offers.filter(o => offerFilter === 'all' || o.type === offerFilter).map(offer => (
          <div key={offer.id} onClick={() => setShowOfferDetail(offer)} data-testid={`offer-${offer.id}`}
            className="w-full bg-white rounded-xl p-3 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${offer.type === 'gas' ? 'bg-blue-500' : 'bg-orange-500'}`}>
              {offer.type === 'gas' ? <Fuel className="text-white" size={20} /> : <Coffee className="text-white" size={20} />}
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-900 text-sm">{offer.name}</span>
                {offer.trending && <span className="text-[10px] bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full">🔥 HOT</span>}
              </div>
              <p className="text-emerald-600 text-xs font-medium">{offer.discount}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-slate-400 text-[10px]">{offer.distance}</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-400 text-[10px]">⏱️ {offer.expires}</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-400 text-[10px]">⭐ {offer.rating}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-emerald-500 font-bold text-sm">{offer.gems}💎</p>
              <button onClick={(e) => { e.stopPropagation(); handleFavoriteOffer(offer.id) }} data-testid={`favorite-offer-${offer.id}`}
                className={`w-7 h-7 rounded-full flex items-center justify-center mt-1 ${favorites.includes(offer.id) ? 'bg-red-100' : 'bg-slate-100'}`}>
                <Heart className={favorites.includes(offer.id) ? 'text-red-500 fill-red-500' : 'text-slate-400'} size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
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

  // Engagement Tab
  const renderEngagement = () => (
    <div className="flex-1 bg-slate-100 overflow-auto">
      <div className="bg-white px-4 pt-3 pb-2 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Award className="text-emerald-500" size={20} />
          <h1 className="text-lg font-bold text-slate-900">Engagement</h1>
        </div>
        <div className="flex border-b border-slate-200">
          {(['badges', 'skins', 'challenges', 'reports'] as const).map(tab => (
            <button key={tab} onClick={() => setEngagementTab(tab)} data-testid={`engagement-tab-${tab}`}
              className={`flex-1 py-2 text-xs font-medium capitalize ${engagementTab === tab ? 'text-emerald-600 border-b-2 border-emerald-500' : 'text-slate-400'}`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {engagementTab === 'badges' && (
        <div className="p-4">
          {/* Badge Stats */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 text-white mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="text-yellow-300" size={18} />
              <span className="text-xs font-medium">BADGE COLLECTION</span>
            </div>
            <div className="flex items-baseline gap-1">
              <p className="text-3xl font-bold">{userData.badges_earned}</p>
              <p className="text-blue-200">/160</p>
            </div>
            <div className="mt-2 w-full bg-blue-700 rounded-full h-2">
              <div className="bg-emerald-400 h-2 rounded-full" style={{ width: `${(userData.badges_earned / 160) * 100}%` }} />
            </div>
          </div>

          {/* Filter */}
          <div className="flex gap-2 mb-4">
            {(['all', 'earned', 'locked'] as const).map(f => (
              <button key={f} onClick={() => setBadgeFilter(f)} data-testid={`badge-filter-${f}`}
                className={`flex-1 py-2 rounded-xl text-xs font-medium ${badgeFilter === f ? 'bg-blue-500 text-white' : 'bg-white text-slate-600'}`}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Badges Grid */}
          <div className="grid grid-cols-2 gap-3">
            {badges.filter(b => badgeFilter === 'all' || (badgeFilter === 'earned' ? b.earned : !b.earned)).map(badge => (
              <div key={badge.id} data-testid={`badge-${badge.id}`}
                className="bg-white rounded-xl p-4 text-center shadow-sm">
                <div className={`w-14 h-14 mx-auto rounded-xl flex items-center justify-center mb-2 relative ${badge.earned ? 'bg-blue-500' : 'bg-slate-200'}`}>
                  <Shield className={badge.earned ? 'text-white' : 'text-slate-400'} size={24} />
                  {badge.earned && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                </div>
                <p className="text-sm font-semibold text-slate-900">{badge.name}</p>
                <p className="text-[10px] text-slate-500 mt-1">{badge.desc}</p>
                <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full ${badge.earned ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${badge.progress}%` }} />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">{badge.earned ? `+${badge.gems}💎 earned` : `${badge.progress}%`}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {engagementTab === 'skins' && (
        <div className="p-4">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-4 text-white mb-4">
            <div className="flex items-center gap-2 mb-1">
              <Car size={18} />
              <span className="text-xs font-medium">CAR STUDIO</span>
            </div>
            <p className="text-lg font-bold">Premium Skins</p>
            <p className="text-purple-200 text-xs">Personalize your navigation marker</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {skins.map(skin => (
              <button key={skin.id} onClick={() => handleEquipSkin(skin.id, skin)} data-testid={`skin-${skin.id}`}
                className={`bg-white rounded-xl p-3 border-2 text-left ${equippedSkin === skin.id ? 'border-emerald-500' : 'border-transparent'}`}>
                <div className={`w-full aspect-square rounded-lg mb-2 bg-gradient-to-br ${skin.gradient}`} />
                <p className="text-sm font-semibold text-slate-900">{skin.name}</p>
                {skin.owned ? (
                  <p className={`text-xs mt-1 ${equippedSkin === skin.id ? 'text-emerald-500' : 'text-slate-400'}`}>
                    {equippedSkin === skin.id ? '✓ Equipped' : 'Owned'}
                  </p>
                ) : (
                  <p className="text-xs text-purple-500 flex items-center gap-0.5 mt-1">
                    <Gem size={10} /> {skin.price}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {engagementTab === 'challenges' && (
        <div className="p-4">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-4 text-white mb-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-medium text-emerald-200">THIS MONTH</p>
                <p className="text-2xl font-bold">Level {userData.level}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-emerald-200">STREAK</p>
                <p className="text-lg font-bold">🔥 {userData.streak} days</p>
              </div>
            </div>
          </div>

          <h3 className="text-sm font-semibold text-slate-900 mb-3">Weekly Challenges</h3>
          <div className="space-y-3">
            {[
              { title: 'Drive 50 miles', progress: 32, target: 50, gems: 100, expires: '5 days' },
              { title: 'Report 3 incidents', progress: 1, target: 3, gems: 75, expires: '5 days' },
              { title: 'Maintain 95+ safety', progress: 87, target: 95, gems: 150, expires: '5 days' },
            ].map((c, i) => (
              <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-slate-900">{c.title}</span>
                  <span className="text-sm text-emerald-500 font-medium">+{c.gems}💎</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className={`h-2 rounded-full ${c.progress >= c.target ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                    style={{ width: `${Math.min((c.progress / c.target) * 100, 100)}%` }} />
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-slate-500">{c.progress}/{c.target}</span>
                  <span className="text-xs text-slate-400">{c.expires} left</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {engagementTab === 'reports' && (
        <div className="p-4">
          <button onClick={() => setShowReportModal(true)} data-testid="report-incident-btn"
            className="w-full bg-red-500 text-white py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 mb-4">
            <Camera size={16} /> Report New Hazard
          </button>
          
          <h3 className="text-sm font-semibold text-slate-900 mb-3">My Reports</h3>
          <div className="space-y-2">
            {[
              { type: 'pothole', location: 'Main St & 5th Ave', time: '2h ago', gems: 15, status: 'verified', upvotes: 12 },
              { type: 'accident', location: 'Highway 71 Mile 42', time: '5h ago', gems: 50, status: 'active', upvotes: 34 },
            ].map((r, i) => (
              <div key={i} className="bg-white rounded-xl p-3 shadow-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-semibold text-slate-900 capitalize">{r.type}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${r.status === 'verified' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                    {r.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{r.location}</p>
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-slate-400">{r.time}</span>
                  <span className="text-xs text-emerald-500 font-medium">+{r.gems}💎 • {r.upvotes}👍</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  // Profile Tab
  const renderProfile = () => (
    <div className="flex-1 bg-slate-100 overflow-auto">
      {/* Header */}
      <div className="bg-gradient-to-b from-blue-500 to-blue-600 px-4 pt-4 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center text-blue-500 font-bold text-xl">
            {userData.name?.split(' ').map((n: string) => n[0]).join('')}
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white">{userData.name}</h1>
            <div className="flex items-center gap-2">
              <span className="text-xs text-blue-200">Level {userData.level}</span>
              {userData.is_premium && <span className="text-[10px] bg-amber-400 text-amber-900 px-1.5 py-0.5 rounded-full font-medium">⚡ PRO</span>}
            </div>
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
          {[
            { icon: Trophy, label: 'Achievements', value: `${userData.badges_earned}/160 badges`, action: () => { setActiveTab('engagement'); setEngagementTab('badges') } },
            { icon: Route, label: 'My Routes', value: `${routes.length} saved`, action: () => setActiveTab('routes') },
            { icon: History, label: 'Trip History', value: `${userData.total_trips} trips`, action: () => toast('Opening history...') },
            { icon: Gem, label: 'Gem History', value: '+2,450 this month', action: () => toast('Opening gems...') },
          ].map((item, i) => (
            <button key={i} onClick={item.action} data-testid={`profile-${item.label.toLowerCase().replace(' ', '-')}`}
              className="w-full bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <item.icon className="text-blue-500" size={18} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-slate-900">{item.label}</p>
                <p className="text-xs text-slate-500">{item.value}</p>
              </div>
              <ChevronRight className="text-slate-400" size={16} />
            </button>
          ))}
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
          {[
            { icon: Bell, label: 'Notifications', desc: 'Manage alerts', action: () => toast('Opening notifications...') },
            { icon: Volume2, label: 'Voice Settings', desc: isMuted ? 'Muted' : 'Active', action: handleToggleVoice },
            { icon: Layers, label: 'Map Widgets', desc: 'Customize display', action: () => setShowWidgetSettings(true) },
            { icon: HelpCircle, label: 'Help & Support', desc: 'Get assistance', action: () => toast('Opening help...') },
          ].map((item, i) => (
            <button key={i} onClick={item.action} data-testid={`settings-${item.label.toLowerCase().replace(' ', '-')}`}
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

  // Search Modal
  const renderSearchModal = () => showSearch && (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center pt-20" onClick={() => setShowSearch(false)}>
      <div className="w-80 bg-slate-900 rounded-2xl p-4 animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 bg-slate-800 rounded-xl px-3 py-2 mb-3">
          <Search className="text-slate-400" size={18} />
          <input type="text" placeholder="Search destination..." autoFocus
            className="flex-1 bg-transparent text-white text-sm outline-none" />
        </div>
        <div className="space-y-2">
          {['Home', 'Work', 'Gym', 'School'].map(place => (
            <button key={place} onClick={() => { handleStartNavigation(place); setShowSearch(false) }} data-testid={`search-${place.toLowerCase()}`}
              className="w-full p-3 bg-slate-800 rounded-xl text-left hover:bg-slate-700 flex items-center gap-3">
              <MapPin className="text-blue-400" size={16} />
              <span className="text-white text-sm">{place}</span>
            </button>
          ))}
        </div>
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
          <button onClick={() => handleRedeemOffer(showOfferDetail)} data-testid="redeem-offer-btn"
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
          {activeTab === 'offers' && renderOffers()}
          {activeTab === 'routes' && renderRoutes()}
          {activeTab === 'engagement' && renderEngagement()}
          {activeTab === 'profile' && renderProfile()}

          {/* Bottom Navigation */}
          <div className="h-20 bg-white border-t border-slate-200 flex items-start pt-2 px-2">
            {[
              { id: 'map', icon: MapPin, label: 'Map' },
              { id: 'offers', icon: Gift, label: 'Offers' },
              { id: 'routes', icon: Route, label: 'Routes' },
              { id: 'engagement', icon: Trophy, label: 'Engage' },
              { id: 'profile', icon: Settings, label: 'Profile' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as TabType)} data-testid={`nav-${tab.id}`}
                className={`flex-1 flex flex-col items-center py-1 ${activeTab === tab.id ? 'text-blue-500' : 'text-slate-400'}`}>
                <tab.icon size={20} />
                <span className="text-[10px] mt-0.5">{tab.label}</span>
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
    </div>
  )
}
