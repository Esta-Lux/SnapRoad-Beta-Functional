import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'
import {
  MapPin, Gift, Trophy, Users, User, Search, Home, Briefcase, Bell, Menu, Mic,
  Navigation, ChevronRight, ChevronDown, Shield, Target, Settings, Camera,
  Share2, Gem, Heart, Zap, Award, X, Plus, Check, Star, Clock, Car, Fuel,
  Coffee, AlertTriangle, Volume2, Filter, Grid, Eye, Lock, TrendingUp,
  Battery, Phone, MapPinned, Route, Gauge, Leaf, Moon, Sun, CreditCard,
  HelpCircle, LogOut, ChevronLeft, Play, Pause, BarChart3, Wallet, Percent,
  Edit2, Trash2, Save, Calendar, Timer, RefreshCw, EyeOff, School, ShoppingCart,
  Dumbbell, Building, Bookmark, ChevronUp, Info, MessageCircle, Flag, ThumbsUp,
  Layers, Compass, Maximize2, History, Download, Upload, Globe, Smartphone
} from 'lucide-react'

// Types
type TabType = 'map' | 'offers' | 'engagement' | 'live' | 'profile' | 'routes'
type EngagementTab = 'badges' | 'skins' | 'progress' | 'reports'
type ProfileTab = 'overview' | 'score' | 'fuel' | 'settings'
type FavoriteCategory = 'all' | 'places' | 'routes' | 'offers' | 'contacts'

interface SavedRoute {
  id: number
  name: string
  origin: string
  destination: string
  departureTime: string
  daysActive: string[]
  estimatedTime: number
  distance: number
  isActive: boolean
  lastUsed?: string
  notifications: boolean
}

interface WidgetSettings {
  showScoreWidget: boolean
  showGemsWidget: boolean
  showSpeedWidget: boolean
  showEtaWidget: boolean
  showTrafficLayer: boolean
  show3DBuildings: boolean
}

interface FavoriteItem {
  id: number
  type: 'place' | 'route' | 'offer' | 'contact'
  name: string
  icon: string
  detail: string
  color: string
}

// Mock Data
const mockOffers = [
  { id: 1, name: 'Shell Gas', type: 'gas', gems: 50, discount: '10¢/gal off', distance: '0.5 mi', trending: true, expires: '2h', address: '123 Main St', rating: 4.5, redemptions: 234 },
  { id: 2, name: 'Starbucks', type: 'cafe', gems: 30, discount: '20% off', distance: '0.8 mi', trending: false, expires: '1d', address: '456 Oak Ave', rating: 4.8, redemptions: 567 },
  { id: 3, name: 'QuickMart', type: 'gas', gems: 45, discount: '15¢/gal off', distance: '1.2 mi', trending: true, expires: '5h', address: '789 Pine Blvd', rating: 4.2, redemptions: 189 },
  { id: 4, name: 'Dunkin', type: 'cafe', gems: 25, discount: 'Free donut', distance: '1.5 mi', trending: false, expires: '3d', address: '321 Elm St', rating: 4.3, redemptions: 445 },
  { id: 5, name: 'BP Station', type: 'gas', gems: 55, discount: '12¢/gal off', distance: '2.0 mi', trending: true, expires: '6h', address: '555 Cedar Rd', rating: 4.1, redemptions: 312 },
]

const mockBadges = [
  { id: 1, name: 'First Mile', desc: 'Drive your first mile', progress: 100, earned: true, gems: 10, category: 'distance', date: 'Jan 15, 2025' },
  { id: 2, name: 'Century Club', desc: 'Drive 100 miles total', progress: 100, earned: true, gems: 50, category: 'distance', date: 'Jan 20, 2025' },
  { id: 3, name: 'Safety First', desc: 'Achieve 95+ safety score', progress: 92, earned: false, gems: 100, category: 'safety', required: '3 more points needed' },
  { id: 4, name: 'Road Guardian', desc: 'Report 10 incidents', progress: 70, earned: false, gems: 75, category: 'community', required: '3 more reports needed' },
  { id: 5, name: 'Eco Warrior', desc: '90%+ eco score 5 trips', progress: 60, earned: false, gems: 150, category: 'eco', required: '2 more eco trips needed' },
  { id: 6, name: 'Night Owl', desc: 'Complete 50 night trips', progress: 100, earned: true, gems: 200, category: 'distance', date: 'Jan 28, 2025' },
  { id: 7, name: 'Perfect Week', desc: '7 days with perfect safety', progress: 43, earned: false, gems: 500, category: 'safety', required: '4 more days needed' },
  { id: 8, name: 'Community Hero', desc: 'Get 100 upvotes on reports', progress: 35, earned: false, gems: 300, category: 'community', required: '65 more upvotes needed' },
]

const mockSkins = [
  { id: 1, name: 'Neon Pulse', gradient: 'from-emerald-400 to-blue-500', owned: true, equipped: true, price: 0, rarity: 'common', desc: 'Default premium skin' },
  { id: 2, name: 'Midnight', gradient: 'from-slate-700 to-slate-900', owned: true, equipped: false, price: 0, rarity: 'common', desc: 'Sleek dark finish' },
  { id: 3, name: 'Fire Storm', gradient: 'from-red-500 to-orange-400', owned: false, equipped: false, price: 800, rarity: 'rare', desc: 'Blazing hot colors' },
  { id: 4, name: 'Chrome', gradient: 'from-slate-300 to-white', owned: false, equipped: false, price: 1500, rarity: 'epic', desc: 'Mirror finish effect' },
  { id: 5, name: 'Aurora', gradient: 'from-purple-500 to-pink-500', owned: false, equipped: false, price: 2500, rarity: 'legendary', desc: 'Northern lights inspired' },
  { id: 6, name: 'Galaxy', gradient: 'from-indigo-600 via-purple-600 to-pink-600', owned: false, equipped: false, price: 5000, rarity: 'exotic', desc: 'Cosmic wonder' },
]

const mockFamily = [
  { id: 1, name: 'Mom', avatar: 'M', status: 'driving', location: 'Highway 71 N', battery: 78, distance: '12 mi', speed: 65, eta: '15 min', phone: '555-0101' },
  { id: 2, name: 'Dad', avatar: 'D', status: 'parked', location: 'Work - Downtown', battery: 45, distance: '8 mi', speed: 0, eta: '-', phone: '555-0102' },
  { id: 3, name: 'Emma', avatar: 'E', status: 'offline', location: 'Last: School', battery: 23, distance: '3 mi', speed: 0, lastSeen: '2h ago', phone: '555-0103' },
]

const mockReports = [
  { id: 1, type: 'pothole', location: 'Main St & 5th Ave', time: '2h ago', gems: 15, status: 'verified', upvotes: 12, views: 89 },
  { id: 2, type: 'accident', location: 'Highway 71 Mile 42', time: '5h ago', gems: 50, status: 'active', upvotes: 34, views: 256 },
  { id: 3, type: 'construction', location: 'Oak Street near Park', time: '1d ago', gems: 10, status: 'resolved', upvotes: 8, views: 45 },
]

const mockChallenges = [
  { id: 1, title: 'Drive 50 miles', progress: 32, target: 50, gems: 100, type: 'weekly', expires: '5 days' },
  { id: 2, title: 'Report 3 incidents', progress: 1, target: 3, gems: 75, type: 'weekly', expires: '5 days' },
  { id: 3, title: 'Maintain 95+ safety', progress: 87, target: 95, gems: 150, type: 'weekly', expires: '5 days' },
  { id: 4, title: 'Redeem 2 offers', progress: 0, target: 2, gems: 50, type: 'weekly', expires: '5 days' },
]

const defaultSavedRoutes: SavedRoute[] = [
  { id: 1, name: 'Morning Commute', origin: 'Home', destination: 'Work - Downtown', departureTime: '07:30', daysActive: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], estimatedTime: 25, distance: 12.5, isActive: true, lastUsed: 'Today', notifications: true },
  { id: 2, name: 'School Pickup', origin: 'Work', destination: 'Lincoln Elementary', departureTime: '15:00', daysActive: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], estimatedTime: 18, distance: 8.2, isActive: true, lastUsed: 'Yesterday', notifications: true },
  { id: 3, name: 'Gym Session', origin: 'Home', destination: 'FitLife Gym', departureTime: '06:00', daysActive: ['Mon', 'Wed', 'Fri'], estimatedTime: 12, distance: 5.1, isActive: false, notifications: false },
]

const defaultFavorites: FavoriteItem[] = [
  { id: 1, type: 'place', name: 'Home', icon: '🏠', detail: '123 Oak Street', color: 'emerald' },
  { id: 2, type: 'place', name: 'Work', icon: '💼', detail: 'Downtown Office', color: 'blue' },
  { id: 3, type: 'place', name: 'Gym', icon: '💪', detail: 'FitLife Center', color: 'purple' },
  { id: 4, type: 'route', name: 'Morning Commute', icon: '🚗', detail: 'Home → Work', color: 'orange' },
  { id: 5, type: 'offer', name: 'Shell Gas 10¢ off', icon: '⛽', detail: 'Saved offer', color: 'yellow' },
  { id: 6, type: 'contact', name: 'Mom', icon: '👩', detail: 'Family member', color: 'pink' },
]

const defaultWidgetSettings: WidgetSettings = {
  showScoreWidget: true,
  showGemsWidget: true,
  showSpeedWidget: true,
  showEtaWidget: true,
  showTrafficLayer: true,
  show3DBuildings: false,
}

export default function DriverApp() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  
  // Main state
  const [activeTab, setActiveTab] = useState<TabType>('map')
  const [engagementTab, setEngagementTab] = useState<EngagementTab>('badges')
  const [profileTab, setProfileTab] = useState<ProfileTab>('overview')
  const [favoriteCategory, setFavoriteCategory] = useState<FavoriteCategory>('all')
  
  // Modal states
  const [showMenu, setShowMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showOfferDetail, setShowOfferDetail] = useState<typeof mockOffers[0] | null>(null)
  const [showBadgeDetail, setShowBadgeDetail] = useState<typeof mockBadges[0] | null>(null)
  const [showFamilyMember, setShowFamilyMember] = useState<typeof mockFamily[0] | null>(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showAddRoute, setShowAddRoute] = useState(false)
  const [showEditRoute, setShowEditRoute] = useState<SavedRoute | null>(null)
  const [showFavoriteModal, setShowFavoriteModal] = useState(false)
  const [showWidgetSettings, setShowWidgetSettings] = useState(false)
  
  // Data states
  const [favorites, setFavorites] = useState<number[]>([])
  const [favoriteItems, setFavoriteItems] = useState<FavoriteItem[]>(defaultFavorites)
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>(defaultSavedRoutes)
  const [widgetSettings, setWidgetSettings] = useState<WidgetSettings>(defaultWidgetSettings)
  const [offerFilter, setOfferFilter] = useState<'all' | 'gas' | 'cafe'>('all')
  const [badgeFilter, setBadgeFilter] = useState<'all' | 'earned' | 'locked'>('all')
  const [equippedSkin, setEquippedSkin] = useState(1)
  const [isNavigating, setIsNavigating] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentSpeed, setCurrentSpeed] = useState(0)
  
  // New route form
  const [newRoute, setNewRoute] = useState({
    name: '', origin: '', destination: '', departureTime: '08:00',
    daysActive: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], notifications: true
  })

  // User data
  const userData = {
    name: user?.name || 'Sarah Johnson',
    email: 'sarah@example.com',
    gems: 12400,
    level: 42,
    safetyScore: 87,
    streak: 14,
    totalMiles: 2847,
    totalTrips: 156,
    badges: 11,
    rank: 42,
    isPremium: true,
    isFamilyPlan: true,
    memberSince: 'Jan 2025',
    ecoScore: 78,
    weeklyMiles: 127,
    monthlyGems: 2450
  }

  // Simulate speed updates when navigating
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

  // Handlers
  const handleFavorite = (id: number) => {
    setFavorites(prev => {
      const newFavs = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      toast.success(prev.includes(id) ? 'Removed from favorites' : 'Added to favorites!')
      return newFavs
    })
  }

  const handleRedeem = (offer: typeof mockOffers[0]) => {
    if (userData.gems >= offer.gems) {
      toast.success(`Redeemed "${offer.name}" for ${offer.gems} gems!`)
      setShowOfferDetail(null)
    } else {
      toast.error(`Need ${offer.gems - userData.gems} more gems!`)
    }
  }

  const handleEquipSkin = (skinId: number, skin: typeof mockSkins[0]) => {
    if (skin.owned) {
      setEquippedSkin(skinId)
      toast.success(`${skin.name} equipped!`)
    } else {
      if (userData.gems >= skin.price) {
        toast.success(`Purchased ${skin.name} for ${skin.price} gems!`)
      } else {
        toast.error(`Need ${skin.price - userData.gems} more gems`)
      }
    }
  }

  const handleStartNavigation = (dest?: string) => {
    setIsNavigating(true)
    setShowMenu(false)
    setShowSearch(false)
    toast.loading('Calculating route...', { duration: 1500 })
    setTimeout(() => {
      toast.success(`Navigating to ${dest || 'destination'}`)
    }, 1500)
  }

  const handleStopNavigation = () => {
    setIsNavigating(false)
    toast.success('Navigation ended')
  }

  const handleReport = (type: string, gems: number) => {
    toast.success(`Reported ${type}! +${gems} gems earned`)
    setShowReportModal(false)
  }

  const handleVoiceCommand = () => {
    toast('🎤 Listening for voice command...', { duration: 2000 })
    setTimeout(() => {
      toast.success('Voice: "Navigate to Work"')
      handleStartNavigation('Work')
    }, 2000)
  }

  const handleAddRoute = () => {
    if (!newRoute.name || !newRoute.origin || !newRoute.destination) {
      toast.error('Please fill in all required fields')
      return
    }
    if (savedRoutes.length >= 20) {
      toast.error('Maximum 20 routes allowed')
      return
    }
    const route: SavedRoute = {
      id: Date.now(),
      ...newRoute,
      estimatedTime: Math.floor(Math.random() * 30) + 10,
      distance: Math.floor(Math.random() * 20) + 5,
      isActive: true
    }
    setSavedRoutes([...savedRoutes, route])
    setNewRoute({ name: '', origin: '', destination: '', departureTime: '08:00', daysActive: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], notifications: true })
    setShowAddRoute(false)
    toast.success('Route saved!')
  }

  const handleDeleteRoute = (id: number) => {
    setSavedRoutes(savedRoutes.filter(r => r.id !== id))
    toast.success('Route deleted')
  }

  const handleToggleRouteActive = (id: number) => {
    setSavedRoutes(savedRoutes.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r))
  }

  const handleToggleRouteNotifications = (id: number) => {
    setSavedRoutes(savedRoutes.map(r => r.id === id ? { ...r, notifications: !r.notifications } : r))
    toast.success('Notifications updated')
  }

  const handleAddFavorite = (type: FavoriteItem['type'], name: string, detail: string) => {
    const icons: Record<string, string> = { place: '📍', route: '🛣️', offer: '🎁', contact: '👤' }
    const colors = ['emerald', 'blue', 'purple', 'orange', 'pink', 'yellow']
    const newFav: FavoriteItem = {
      id: Date.now(),
      type,
      name,
      icon: icons[type],
      detail,
      color: colors[Math.floor(Math.random() * colors.length)]
    }
    setFavoriteItems([...favoriteItems, newFav])
    toast.success(`${name} added to favorites!`)
    setShowFavoriteModal(false)
  }

  const handleRemoveFavorite = (id: number) => {
    setFavoriteItems(favoriteItems.filter(f => f.id !== id))
    toast.success('Removed from favorites')
  }

  const handleCallMember = (member: typeof mockFamily[0]) => {
    toast.success(`Calling ${member.name}...`)
  }

  const handleMessageMember = (member: typeof mockFamily[0]) => {
    toast.success(`Opening chat with ${member.name}`)
  }

  const handleShareLocation = () => {
    toast.success('Location shared!')
  }

  const handleToggleWidget = (key: keyof WidgetSettings) => {
    setWidgetSettings(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Render Hamburger Menu
  const renderMenu = () => (
    <div className="fixed inset-0 bg-black/80 z-50 flex" onClick={() => setShowMenu(false)}>
      <div className="w-72 bg-slate-900 h-full animate-slide-right" onClick={e => e.stopPropagation()}>
        {/* Profile Header */}
        <div className="p-4 bg-gradient-to-r from-blue-600 to-blue-500">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-blue-500 font-bold text-xl">
              {userData.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <h3 className="text-white font-semibold">{userData.name}</h3>
              <p className="text-blue-200 text-xs">Level {userData.level} • {userData.isPremium ? '⚡ PRO' : 'Free'}</p>
            </div>
          </div>
          <div className="flex gap-4 mt-3">
            <div className="text-center">
              <p className="text-white font-bold">{(userData.gems/1000).toFixed(1)}K</p>
              <p className="text-blue-200 text-[10px]">Gems</p>
            </div>
            <div className="text-center">
              <p className="text-white font-bold">{userData.safetyScore}</p>
              <p className="text-blue-200 text-[10px]">Score</p>
            </div>
            <div className="text-center">
              <p className="text-white font-bold">#{userData.rank}</p>
              <p className="text-blue-200 text-[10px]">Rank</p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="p-2 overflow-auto" style={{ maxHeight: 'calc(100% - 180px)' }}>
          <p className="text-slate-500 text-[10px] font-medium px-3 py-2">NAVIGATION</p>
          {[
            { icon: MapPin, label: 'Map', action: () => { setActiveTab('map'); setShowMenu(false) } },
            { icon: Route, label: 'My Routes', badge: `${savedRoutes.length}/20`, action: () => { setActiveTab('routes'); setShowMenu(false) } },
            { icon: Star, label: 'Favorites', badge: favoriteItems.length, action: () => { setActiveTab('map'); setShowMenu(false); setTimeout(() => setShowFavoriteModal(true), 300) } },
            { icon: History, label: 'Trip History', action: () => toast('Opening trip history...') },
            { icon: Download, label: 'Offline Maps', badge: userData.isPremium ? '3' : '🔒', action: () => userData.isPremium ? toast('Opening offline maps...') : toast.error('Premium feature') },
          ].map((item, i) => (
            <button key={i} onClick={item.action}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white">
              <item.icon size={18} />
              <span className="flex-1 text-left text-sm">{item.label}</span>
              {item.badge && <span className="text-xs bg-slate-700 px-2 py-0.5 rounded-full">{item.badge}</span>}
            </button>
          ))}

          <p className="text-slate-500 text-[10px] font-medium px-3 py-2 mt-2">REWARDS</p>
          {[
            { icon: Gift, label: 'Offers', badge: mockOffers.length, action: () => { setActiveTab('offers'); setShowMenu(false) } },
            { icon: Trophy, label: 'Achievements', badge: `${userData.badges}/160`, action: () => { setActiveTab('engagement'); setEngagementTab('badges'); setShowMenu(false) } },
            { icon: BarChart3, label: 'Leaderboard', action: () => toast('Opening leaderboard...') },
            { icon: Gem, label: 'Gem Store', action: () => toast('Opening gem store...') },
          ].map((item, i) => (
            <button key={i} onClick={item.action}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white">
              <item.icon size={18} />
              <span className="flex-1 text-left text-sm">{item.label}</span>
              {item.badge && <span className="text-xs bg-slate-700 px-2 py-0.5 rounded-full">{item.badge}</span>}
            </button>
          ))}

          <p className="text-slate-500 text-[10px] font-medium px-3 py-2 mt-2">TRACKING</p>
          {[
            { icon: Users, label: 'Family', badge: userData.isFamilyPlan ? `${mockFamily.length}` : '🔒', action: () => { setActiveTab('live'); setShowMenu(false) } },
            { icon: Gauge, label: 'Driver Score', action: () => { setActiveTab('profile'); setProfileTab('score'); setShowMenu(false) } },
            { icon: Fuel, label: 'Fuel Dashboard', badge: userData.isPremium ? '' : '🔒', action: () => { setActiveTab('profile'); setProfileTab('fuel'); setShowMenu(false) } },
          ].map((item, i) => (
            <button key={i} onClick={item.action}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white">
              <item.icon size={18} />
              <span className="flex-1 text-left text-sm">{item.label}</span>
              {item.badge && <span className="text-xs bg-slate-700 px-2 py-0.5 rounded-full">{item.badge}</span>}
            </button>
          ))}

          <p className="text-slate-500 text-[10px] font-medium px-3 py-2 mt-2">SETTINGS</p>
          {[
            { icon: Layers, label: 'Map Widgets', action: () => { setShowWidgetSettings(true); setShowMenu(false) } },
            { icon: Bell, label: 'Notifications', action: () => toast('Opening notification settings...') },
            { icon: Volume2, label: isMuted ? 'Unmute Voice' : 'Mute Voice', action: () => { setIsMuted(!isMuted); toast.success(isMuted ? 'Voice unmuted' : 'Voice muted') } },
            { icon: Settings, label: 'Settings', action: () => { setActiveTab('profile'); setProfileTab('settings'); setShowMenu(false) } },
            { icon: HelpCircle, label: 'Help & Support', action: () => toast('Opening help center...') },
          ].map((item, i) => (
            <button key={i} onClick={item.action}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white">
              <item.icon size={18} />
              <span className="flex-1 text-left text-sm">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-slate-800">
          <button onClick={() => { logout(); navigate('/login') }}
            className="w-full flex items-center justify-center gap-2 py-2 text-red-400 hover:bg-red-500/10 rounded-xl">
            <LogOut size={18} /> Log Out
          </button>
        </div>
      </div>
    </div>
  )

  // Render Map Tab
  const renderMap = () => (
    <div className="flex-1 relative bg-slate-800 overflow-hidden">
      {/* Map Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-700 to-slate-900">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none'%3E%3Cg fill='%234a5568' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />
      </div>

      {/* Top Bar */}
      <div className="absolute top-3 left-3 right-3 z-10">
        <div className="flex gap-2">
          <button onClick={() => setShowMenu(true)} className="w-10 h-10 bg-slate-900/90 backdrop-blur rounded-xl flex items-center justify-center">
            <Menu className="text-white" size={18} />
          </button>
          <button onClick={() => setShowSearch(true)} className="flex-1 bg-slate-900/90 backdrop-blur rounded-xl px-3 h-10 flex items-center gap-2">
            <Search className="text-slate-400" size={16} />
            <span className="text-slate-400 text-sm">{isNavigating ? 'Navigating...' : 'Where to?'}</span>
          </button>
          <button onClick={() => setShowNotifications(true)} className="w-10 h-10 bg-slate-900/90 backdrop-blur rounded-xl flex items-center justify-center relative">
            <Bell className="text-emerald-400" size={18} />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">5</span>
          </button>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 mt-2">
          <button onClick={() => handleStartNavigation('Home')} className="flex-1 bg-slate-900/90 backdrop-blur rounded-xl px-3 h-9 flex items-center gap-2">
            <Home className="text-emerald-400" size={14} />
            <span className="text-white text-xs">Home</span>
            <span className="text-slate-400 text-[10px] ml-auto">12 min</span>
          </button>
          <button onClick={() => handleStartNavigation('Work')} className="flex-1 bg-slate-900/90 backdrop-blur rounded-xl px-3 h-9 flex items-center gap-2">
            <Briefcase className="text-blue-400" size={14} />
            <span className="text-white text-xs">Work</span>
            <span className="text-slate-400 text-[10px] ml-auto">25 min</span>
          </button>
          <button onClick={() => setShowFavoriteModal(true)} className="w-9 h-9 bg-slate-900/90 backdrop-blur rounded-xl flex items-center justify-center">
            <Star className="text-yellow-400" size={16} />
          </button>
        </div>

        {/* Saved Routes Quick Access */}
        {savedRoutes.filter(r => r.isActive).length > 0 && (
          <div className="mt-2 bg-slate-900/90 backdrop-blur rounded-xl p-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-400 text-[10px]">SCHEDULED ROUTES</span>
              <button onClick={() => setActiveTab('routes')} className="text-blue-400 text-[10px]">View All</button>
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {savedRoutes.filter(r => r.isActive).slice(0, 3).map(route => (
                <button key={route.id} onClick={() => handleStartNavigation(route.destination)}
                  className="flex-shrink-0 bg-slate-800 rounded-lg px-2 py-1.5 flex items-center gap-2">
                  <Clock className="text-blue-400" size={12} />
                  <div className="text-left">
                    <p className="text-white text-[10px] font-medium">{route.name}</p>
                    <p className="text-slate-400 text-[9px]">{route.departureTime} • {route.estimatedTime} min</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Score Widget */}
      {widgetSettings.showScoreWidget && (
        <div className="absolute left-3 top-40 bg-slate-900/95 backdrop-blur rounded-xl p-3 w-28">
          <div className="relative w-16 h-16 mx-auto mb-1">
            <svg className="w-full h-full -rotate-90">
              <circle cx="32" cy="32" r="28" stroke="#1e293b" strokeWidth="5" fill="none" />
              <circle cx="32" cy="32" r="28" stroke={userData.safetyScore >= 90 ? '#22c55e' : userData.safetyScore >= 70 ? '#3b82f6' : '#ef4444'}
                strokeWidth="5" fill="none" strokeDasharray={`${(userData.safetyScore / 100) * 176} 176`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold text-white">{userData.safetyScore}</span>
              <span className="text-[10px] text-blue-400">SCORE</span>
            </div>
          </div>
          <button onClick={() => { setActiveTab('profile'); setProfileTab('score') }}
            className="w-full bg-blue-500 text-white text-[10px] font-medium py-1.5 rounded-lg hover:bg-blue-600">
            DETAILS
          </button>
        </div>
      )}

      {/* Gems Widget */}
      {widgetSettings.showGemsWidget && (
        <div className="absolute right-3 top-40 bg-slate-900/95 backdrop-blur rounded-xl p-3">
          <div className="flex items-center gap-2">
            <Gem className="text-emerald-400" size={18} />
            <span className="text-white font-bold">{(userData.gems / 1000).toFixed(1)}K</span>
          </div>
          <p className="text-[10px] text-emerald-400 mt-1">+{userData.monthlyGems} this month</p>
          <button onClick={() => setActiveTab('offers')} className="w-full mt-2 bg-emerald-500/20 text-emerald-400 text-[10px] py-1 rounded-lg">
            Earn More →
          </button>
        </div>
      )}

      {/* Speed Widget (when navigating) */}
      {widgetSettings.showSpeedWidget && isNavigating && (
        <div className="absolute left-3 bottom-36 bg-slate-900/95 backdrop-blur rounded-xl p-3 w-28">
          <div className="text-center">
            <p className="text-3xl font-bold text-white">{currentSpeed}</p>
            <p className="text-[10px] text-slate-400">MPH</p>
            <div className="mt-1 flex items-center justify-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-emerald-400">Under limit</span>
            </div>
          </div>
        </div>
      )}

      {/* ETA Widget (when navigating) */}
      {widgetSettings.showEtaWidget && isNavigating && (
        <div className="absolute right-3 bottom-36 bg-slate-900/95 backdrop-blur rounded-xl p-3">
          <div className="text-center">
            <p className="text-lg font-bold text-white">9:52 AM</p>
            <p className="text-[10px] text-slate-400">ETA</p>
            <p className="text-emerald-400 text-xs mt-1">25 min • 12.5 mi</p>
          </div>
        </div>
      )}

      {/* Map Markers */}
      <button onClick={() => setShowOfferDetail(mockOffers[0])} className="absolute right-20 top-56">
        <div className="w-8 h-8 bg-blue-500 rounded-lg rotate-45 flex items-center justify-center shadow-lg">
          <Fuel className="text-white -rotate-45" size={14} />
        </div>
        <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[9px] px-1 rounded">50💎</span>
      </button>
      <button onClick={() => setShowOfferDetail(mockOffers[1])} className="absolute left-20 bottom-52">
        <div className="w-8 h-8 bg-orange-500 rounded-lg rotate-45 flex items-center justify-center shadow-lg">
          <Coffee className="text-white -rotate-45" size={14} />
        </div>
        <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[9px] px-1 rounded">30💎</span>
      </button>
      <button onClick={() => toast.error('Road hazard ahead!')} className="absolute right-12 bottom-56">
        <div className="w-9 h-9 bg-red-500 rounded-full flex items-center justify-center animate-pulse shadow-lg">
          <AlertTriangle className="text-white" size={18} />
        </div>
      </button>

      {/* Current Location */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg" />
        <div className="absolute inset-0 w-4 h-4 bg-blue-500/30 rounded-full animate-ping" />
      </div>

      {/* Action Buttons */}
      <div className="absolute right-3 bottom-20 flex flex-col gap-2">
        <button onClick={handleVoiceCommand} className="w-11 h-11 bg-blue-500 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-600">
          <Mic className="text-white" size={20} />
        </button>
        <button onClick={() => { setIsMuted(!isMuted); toast.success(isMuted ? 'Voice unmuted' : 'Voice muted') }}
          className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg ${isMuted ? 'bg-slate-700' : 'bg-slate-800'}`}>
          {isMuted ? <Volume2 className="text-slate-400" size={20} /> : <Volume2 className="text-white" size={20} />}
        </button>
        <button onClick={() => setShowReportModal(true)} className="w-11 h-11 bg-red-500/80 rounded-full flex items-center justify-center hover:bg-red-500">
          <Camera className="text-white" size={20} />
        </button>
        {isNavigating ? (
          <button onClick={handleStopNavigation} className="w-11 h-11 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
            <X className="text-white" size={20} />
          </button>
        ) : (
          <button onClick={() => handleStartNavigation()} className="w-11 h-11 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg hover:bg-emerald-600">
            <Navigation className="text-white" size={20} />
          </button>
        )}
      </div>

      {/* Map Controls */}
      <div className="absolute left-3 bottom-20 flex flex-col gap-2">
        <button onClick={() => toast('Centering map')} className="w-10 h-10 bg-slate-900/90 backdrop-blur rounded-xl flex items-center justify-center">
          <Compass className="text-white" size={18} />
        </button>
        <button onClick={() => handleToggleWidget('showTrafficLayer')} 
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${widgetSettings.showTrafficLayer ? 'bg-blue-500' : 'bg-slate-900/90 backdrop-blur'}`}>
          <Layers className="text-white" size={18} />
        </button>
      </div>
    </div>
  )

  // Render Offers Tab
  const renderOffers = () => (
    <div className="flex-1 bg-slate-100 overflow-auto">
      <div className="bg-white px-4 pt-3 pb-2 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Offers Nearby</h1>
            <p className="text-xs text-blue-500 font-medium">{mockOffers.filter(o => offerFilter === 'all' || o.type === offerFilter).length} ACTIVE DEALS</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => toast('Refreshing offers...')} className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center">
              <RefreshCw className="text-slate-600" size={16} />
            </button>
            <button onClick={() => toast('Filter options')} className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center">
              <Filter className="text-slate-600" size={18} />
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          {(['all', 'gas', 'cafe'] as const).map(f => (
            <button key={f} onClick={() => setOfferFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 ${offerFilter === f ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {f === 'gas' && <Fuel size={12} />}
              {f === 'cafe' && <Coffee size={12} />}
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Savings Card */}
      <div className="mx-4 mt-3 p-3 bg-gradient-to-r from-blue-500 to-emerald-400 rounded-xl text-white">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[10px] text-blue-100 font-medium flex items-center gap-1"><Zap size={10} /> POTENTIAL SAVINGS</p>
            <p className="text-2xl font-bold">$127.50</p>
            <p className="text-[10px] text-blue-100">Based on {mockOffers.length} available offers</p>
          </div>
          <button onClick={() => toast.success(`Wallet: ${userData.gems.toLocaleString()} gems`)}
            className="bg-white/20 rounded-lg px-2 py-1.5 hover:bg-white/30">
            <p className="text-[10px] text-blue-100">MY WALLET</p>
            <p className="text-sm font-bold flex items-center gap-1"><Gem size={12} /> {(userData.gems / 1000).toFixed(1)}K</p>
          </button>
        </div>
      </div>

      {/* Offers List */}
      <div className="p-4 space-y-2">
        {mockOffers.filter(o => offerFilter === 'all' || o.type === offerFilter).map(offer => (
          <button key={offer.id} onClick={() => setShowOfferDetail(offer)}
            className="w-full bg-white rounded-xl p-3 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${offer.type === 'gas' ? 'bg-blue-500' : 'bg-orange-500'}`}>
              {offer.type === 'gas' ? <Fuel className="text-white" size={22} /> : <Coffee className="text-white" size={22} />}
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
              <button onClick={(e) => { e.stopPropagation(); handleFavorite(offer.id) }}
                className={`w-7 h-7 rounded-full flex items-center justify-center mt-1 ${favorites.includes(offer.id) ? 'bg-red-100' : 'bg-slate-100'}`}>
                <Heart className={favorites.includes(offer.id) ? 'text-red-500 fill-red-500' : 'text-slate-400'} size={14} />
              </button>
            </div>
          </button>
        ))}
      </div>
    </div>
  )

  // Render Routes Tab
  const renderRoutes = () => (
    <div className="flex-1 bg-slate-100 overflow-auto">
      <div className="bg-white px-4 pt-3 pb-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900">My Routes</h1>
            <p className="text-xs text-slate-500">{savedRoutes.length} of 20 routes saved</p>
          </div>
          <button onClick={() => setShowAddRoute(true)}
            disabled={savedRoutes.length >= 20}
            className="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 disabled:opacity-50">
            <Plus size={14} /> Add Route
          </button>
        </div>
        <div className="mt-2 bg-blue-50 rounded-lg p-2">
          <p className="text-[10px] text-blue-600 flex items-center gap-1">
            <Info size={12} /> Routes with notifications will alert you 15 minutes before departure time
          </p>
        </div>
      </div>

      <div className="p-4 space-y-2">
        {savedRoutes.length === 0 ? (
          <div className="text-center py-8">
            <Route className="mx-auto text-slate-300 mb-2" size={40} />
            <p className="text-slate-500 text-sm">No saved routes yet</p>
            <p className="text-slate-400 text-xs">Add your frequent destinations for quick access</p>
          </div>
        ) : (
          savedRoutes.map(route => (
            <div key={route.id} className={`bg-white rounded-xl p-3 shadow-sm ${!route.isActive && 'opacity-60'}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900 text-sm">{route.name}</h3>
                    {route.notifications && <Bell size={12} className="text-blue-500" />}
                    {!route.isActive && <span className="text-[10px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded">Paused</span>}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{route.origin} → {route.destination}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleToggleRouteActive(route.id)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${route.isActive ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                    {route.isActive ? <Play className="text-emerald-500" size={14} /> : <Pause className="text-slate-400" size={14} />}
                  </button>
                  <button onClick={() => handleDeleteRoute(route.id)}
                    className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <Trash2 className="text-red-500" size={14} />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-slate-500">
                <span className="flex items-center gap-1"><Clock size={10} /> {route.departureTime}</span>
                <span className="flex items-center gap-1"><Timer size={10} /> {route.estimatedTime} min</span>
                <span className="flex items-center gap-1"><Route size={10} /> {route.distance} mi</span>
              </div>
              <div className="flex items-center gap-1 mt-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <span key={day} className={`text-[9px] px-1.5 py-0.5 rounded ${route.daysActive.includes(day) ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                    {day}
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                <button onClick={() => handleToggleRouteNotifications(route.id)}
                  className="text-[10px] text-slate-500 flex items-center gap-1">
                  {route.notifications ? <Bell size={10} className="text-blue-500" /> : <EyeOff size={10} />}
                  {route.notifications ? 'Notifications on' : 'Notifications off'}
                </button>
                <button onClick={() => handleStartNavigation(route.destination)}
                  className="bg-blue-500 text-white px-3 py-1 rounded-lg text-[10px] font-medium flex items-center gap-1">
                  <Navigation size={10} /> Start
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )

  // Render Engagement Tab
  const renderEngagement = () => (
    <div className="flex-1 bg-slate-100 overflow-auto">
      <div className="bg-white px-4 pt-3 pb-2 sticky top-0 z-10">
        <div className="flex items-center gap-2 mb-2">
          <Award className="text-emerald-500" size={20} />
          <h1 className="text-lg font-bold text-slate-900">Engagement</h1>
        </div>
        <div className="flex border-b border-slate-200">
          {(['badges', 'skins', 'progress', 'reports'] as const).map(tab => (
            <button key={tab} onClick={() => setEngagementTab(tab)}
              className={`flex-1 py-2 text-xs font-medium capitalize ${engagementTab === tab ? 'text-slate-900 border-b-2 border-emerald-500' : 'text-slate-400'}`}>
              {tab === 'reports' ? 'My Reports' : tab}
            </button>
          ))}
        </div>
      </div>

      {engagementTab === 'badges' && (
        <>
          <div className="mx-4 mt-3 p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl text-white">
            <div className="flex items-center gap-1.5 mb-1">
              <Trophy className="text-yellow-300" size={16} />
              <span className="text-[10px] text-blue-200 font-medium">YOUR COLLECTION</span>
            </div>
            <div className="flex items-baseline gap-1">
              <p className="text-2xl font-bold">{userData.badges}</p>
              <p className="text-sm text-blue-200">/160 Badges</p>
            </div>
            <div className="mt-2 w-full bg-blue-700 rounded-full h-1.5">
              <div className="bg-emerald-400 h-1.5 rounded-full" style={{ width: `${(userData.badges / 160) * 100}%` }} />
            </div>
            <p className="text-[10px] text-blue-200 mt-1">Complete badges to earn up to 25,000 gems!</p>
          </div>
          <div className="px-4 py-3 flex gap-2">
            {(['all', 'earned', 'locked'] as const).map(f => (
              <button key={f} onClick={() => setBadgeFilter(f)}
                className={`flex-1 py-2 rounded-xl text-xs font-medium ${badgeFilter === f ? 'bg-blue-500 text-white' : 'bg-white text-slate-600'}`}>
                {f.charAt(0).toUpperCase() + f.slice(1)} {f === 'earned' && `(${mockBadges.filter(b => b.earned).length})`}
              </button>
            ))}
          </div>
          <div className="px-4 pb-4 grid grid-cols-2 gap-2">
            {mockBadges.filter(b => badgeFilter === 'all' || (badgeFilter === 'earned' ? b.earned : !b.earned)).map(badge => (
              <button key={badge.id} onClick={() => setShowBadgeDetail(badge)}
                className="bg-white rounded-xl p-3 text-left shadow-sm">
                <div className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-2 relative ${badge.earned ? 'bg-blue-500' : 'bg-slate-200'}`}>
                  <Shield className={badge.earned ? 'text-white' : 'text-slate-400'} size={24} />
                  {badge.earned && <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center"><Check size={12} className="text-white" /></div>}
                </div>
                <p className="text-center text-xs font-semibold text-slate-900">{badge.name}</p>
                <div className="mt-1.5 w-full bg-slate-100 rounded-full h-1">
                  <div className={`h-1 rounded-full ${badge.earned ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${badge.progress}%` }} />
                </div>
                <p className="text-center text-[10px] text-slate-400 mt-1">{badge.earned ? `Earned • +${badge.gems}💎` : `${badge.progress}%`}</p>
              </button>
            ))}
          </div>
        </>
      )}

      {engagementTab === 'skins' && (
        <>
          <div className="mx-4 mt-3 p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white">
            <div className="flex items-center gap-1.5 mb-1">
              <Car size={16} />
              <span className="text-[10px] font-medium">CAR STUDIO</span>
            </div>
            <p className="text-lg font-bold">Premium Skins</p>
            <p className="text-purple-200 text-xs">Personalize your navigation marker</p>
          </div>
          <div className="px-4 py-3 grid grid-cols-2 gap-2">
            {mockSkins.map(skin => (
              <button key={skin.id} onClick={() => handleEquipSkin(skin.id, skin)}
                className={`bg-white rounded-xl p-3 border-2 ${equippedSkin === skin.id ? 'border-emerald-500' : 'border-transparent'}`}>
                <div className={`w-full aspect-square rounded-lg mb-2 bg-gradient-to-br ${skin.gradient}`} />
                <p className="text-xs font-semibold text-slate-900">{skin.name}</p>
                <p className="text-[10px] text-slate-400">{skin.desc}</p>
                {skin.owned ? (
                  <p className={`text-[10px] mt-1 ${equippedSkin === skin.id ? 'text-emerald-500' : 'text-slate-400'}`}>
                    {equippedSkin === skin.id ? '✓ Equipped' : 'Owned'}
                  </p>
                ) : (
                  <p className="text-[10px] text-purple-500 flex items-center gap-0.5 mt-1">
                    <Gem size={10} /> {skin.price} • <span className="capitalize">{skin.rarity}</span>
                  </p>
                )}
              </button>
            ))}
          </div>
        </>
      )}

      {engagementTab === 'progress' && (
        <>
          <div className="mx-4 mt-3 p-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl text-white">
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
            <div className="mt-2">
              <div className="flex justify-between text-xs mb-1">
                <span>Next Level</span>
                <span>2,400 / 3,000 XP</span>
              </div>
              <div className="w-full bg-emerald-700 rounded-full h-1.5">
                <div className="bg-white h-1.5 rounded-full" style={{ width: '80%' }} />
              </div>
            </div>
          </div>
          <div className="p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Weekly Challenges</h3>
            <div className="space-y-2">
              {mockChallenges.map(c => (
                <div key={c.id} className="bg-white rounded-xl p-3 shadow-sm">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-medium text-slate-900">{c.title}</span>
                    <span className="text-xs text-emerald-500 font-medium">+{c.gems} 💎</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${c.progress >= c.target ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                      style={{ width: `${Math.min((c.progress / c.target) * 100, 100)}%` }} />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-slate-400">{c.progress}/{c.target}</span>
                    <span className="text-[10px] text-slate-400">{c.expires} left</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {engagementTab === 'reports' && (
        <>
          <div className="mx-4 mt-3 p-3 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl text-white">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-medium text-red-200">TOTAL REPORTS</p>
                <p className="text-2xl font-bold">{mockReports.length}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-red-200">GEMS EARNED</p>
                <p className="text-lg font-bold">{mockReports.reduce((a, r) => a + r.gems, 0)} 💎</p>
              </div>
            </div>
            <div className="mt-2 flex gap-4 text-[10px]">
              <span>👁️ {mockReports.reduce((a, r) => a + r.views, 0)} views</span>
              <span>👍 {mockReports.reduce((a, r) => a + r.upvotes, 0)} upvotes</span>
            </div>
          </div>
          <div className="p-4">
            <button onClick={() => setShowReportModal(true)}
              className="w-full bg-red-500 text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 mb-3 hover:bg-red-600">
              <Camera size={16} /> Report New Hazard
            </button>
            <div className="space-y-2">
              {mockReports.map(r => (
                <div key={r.id} className="bg-white rounded-xl p-3 shadow-sm">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-900 capitalize">{r.type}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${r.status === 'verified' ? 'bg-emerald-100 text-emerald-600' : r.status === 'active' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                      {r.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">{r.location}</p>
                  <div className="flex justify-between mt-2">
                    <span className="text-[10px] text-slate-400">{r.time}</span>
                    <span className="text-[10px] text-emerald-500 font-medium">+{r.gems}💎 • {r.upvotes}👍 • {r.views}👁️</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )

  // Render Live (Family) Tab
  const renderLive = () => (
    <div className="flex-1 bg-slate-100 overflow-auto">
      <div className="bg-white px-4 pt-3 pb-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="text-indigo-500" size={20} />
            <h1 className="text-lg font-bold text-slate-900">Live Locations</h1>
          </div>
          <button onClick={() => toast('Refreshing locations...')} className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
            <RefreshCw className="text-slate-600" size={16} />
          </button>
        </div>
        <p className="text-xs text-slate-500">{mockFamily.filter(f => f.status !== 'offline').length} of {mockFamily.length} online</p>
      </div>

      {userData.isFamilyPlan ? (
        <div className="p-4 space-y-2">
          {mockFamily.map(member => (
            <button key={member.id} onClick={() => setShowFamilyMember(member)}
              className="w-full bg-white rounded-xl p-3 flex items-center gap-3 shadow-sm">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-lg">
                  {member.avatar}
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white ${member.status === 'driving' ? 'bg-emerald-500' : member.status === 'parked' ? 'bg-blue-500' : 'bg-slate-400'}`} />
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-900 text-sm">{member.name}</span>
                  {member.status === 'driving' && <span className="text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full">{member.speed} mph</span>}
                </div>
                <p className="text-[10px] text-slate-500">{member.location}</p>
                {member.lastSeen && <p className="text-[10px] text-slate-400">Last seen {member.lastSeen}</p>}
                {member.eta && member.eta !== '-' && <p className="text-[10px] text-blue-500">ETA: {member.eta}</p>}
              </div>
              <div className="text-right">
                <div className="flex items-center gap-0.5 text-slate-400">
                  <Battery size={12} className={member.battery < 30 ? 'text-red-500' : ''} />
                  <span className="text-[10px]">{member.battery}%</span>
                </div>
                <p className="text-[10px] text-slate-500">{member.distance}</p>
              </div>
              <ChevronRight className="text-slate-400" size={16} />
            </button>
          ))}
          <button onClick={() => toast('Invite family member')}
            className="w-full bg-white rounded-xl p-3 flex items-center justify-center gap-2 text-indigo-500 border-2 border-dashed border-indigo-200">
            <Plus size={16} /> Add Family Member
          </button>
        </div>
      ) : (
        <div className="p-4 text-center">
          <div className="bg-indigo-100 rounded-xl p-6">
            <Users className="mx-auto text-indigo-500 mb-2" size={40} />
            <h3 className="text-lg font-bold text-slate-900 mb-1">Family Plan</h3>
            <p className="text-xs text-slate-500 mb-3">Track up to 6 family members in real-time</p>
            <button onClick={() => toast('Upgrading...')} className="bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
              Upgrade for $14.99/mo
            </button>
          </div>
        </div>
      )}
    </div>
  )

  // Render Profile Tab
  const renderProfile = () => (
    <div className="flex-1 bg-slate-100 overflow-auto">
      {/* Profile Header */}
      <div className="bg-gradient-to-b from-blue-500 to-blue-600 px-4 pt-4 pb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center text-blue-500 font-bold text-xl">
              {userData.name.split(' ').map(n => n[0]).join('')}
            </div>
            <button onClick={() => toast('Change profile photo')}
              className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-400 rounded-full flex items-center justify-center">
              <Camera className="text-white" size={12} />
            </button>
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white">{userData.name}</h1>
            <div className="flex items-center gap-2">
              <span className="text-xs text-blue-200">Level {userData.level}</span>
              {userData.isPremium && <span className="text-[10px] bg-amber-400 text-amber-900 px-1.5 py-0.5 rounded-full font-medium">⚡ PRO</span>}
            </div>
            <p className="text-[10px] text-blue-200">Member since {userData.memberSince}</p>
          </div>
          <button onClick={handleShareLocation} className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
            <Share2 className="text-white" size={16} />
          </button>
        </div>
        
        <div className="grid grid-cols-4 gap-2 mt-4">
          {[
            { value: `${(userData.gems / 1000).toFixed(1)}K`, label: 'Gems', icon: '💎', action: () => setActiveTab('offers') },
            { value: `#${userData.rank}`, label: 'Rank', icon: '🏆', action: () => toast('Leaderboard') },
            { value: userData.totalTrips, label: 'Trips', icon: '🚗', action: () => toast('Trip history') },
            { value: `${(userData.totalMiles / 1000).toFixed(1)}K`, label: 'Miles', icon: '📍', action: () => toast('Miles breakdown') },
          ].map((s, i) => (
            <button key={i} onClick={s.action} className="bg-white/10 rounded-xl p-2 text-center hover:bg-white/20">
              <span className="text-sm">{s.icon}</span>
              <p className="text-white font-bold text-sm">{s.value}</p>
              <p className="text-blue-200 text-[10px]">{s.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="bg-white px-4 py-2 flex border-b border-slate-200 sticky top-0 z-10">
        {(['overview', 'score', 'fuel', 'settings'] as const).map(tab => (
          <button key={tab} onClick={() => setProfileTab(tab)}
            className={`flex-1 py-2 text-xs font-medium capitalize ${profileTab === tab ? 'text-blue-500 border-b-2 border-blue-500' : 'text-slate-400'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Content based on tab */}
      {profileTab === 'overview' && (
        <div className="p-4 space-y-2">
          {[
            { icon: Trophy, label: 'Achievements', value: `${userData.badges}/160 badges`, action: () => { setActiveTab('engagement'); setEngagementTab('badges') } },
            { icon: Route, label: 'My Routes', value: `${savedRoutes.length} saved routes`, action: () => setActiveTab('routes') },
            { icon: TrendingUp, label: 'Leaderboard', value: `Rank #${userData.rank}`, action: () => toast('Opening leaderboard...') },
            { icon: History, label: 'Trip History', value: `${userData.totalTrips} trips`, action: () => toast('Opening trip history...') },
            { icon: Gem, label: 'Gem History', value: `+${userData.monthlyGems} this month`, action: () => toast('Opening gem history...') },
          ].map((item, i) => (
            <button key={i} onClick={item.action}
              className="w-full bg-white rounded-xl p-3 flex items-center gap-3 shadow-sm hover:shadow-md">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <item.icon className="text-blue-500" size={18} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-slate-900">{item.label}</p>
                <p className="text-[10px] text-slate-500">{item.value}</p>
              </div>
              <ChevronRight className="text-slate-400" size={16} />
            </button>
          ))}
        </div>
      )}

      {profileTab === 'score' && (
        <div className="p-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-center mb-4">
              <div className="relative w-28 h-28">
                <svg className="w-full h-full -rotate-90">
                  <circle cx="56" cy="56" r="50" stroke="#e2e8f0" strokeWidth="8" fill="none" />
                  <circle cx="56" cy="56" r="50" stroke={userData.safetyScore >= 90 ? '#22c55e' : userData.safetyScore >= 70 ? '#eab308' : '#ef4444'}
                    strokeWidth="8" fill="none" strokeDasharray={`${(userData.safetyScore / 100) * 314} 314`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-slate-900">{userData.safetyScore}</span>
                  <span className="text-xs text-slate-500">Safety Score</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {[
                { label: 'Speed', score: 92, tip: 'Excellent speed management' },
                { label: 'Braking', score: 85, tip: 'Good braking habits' },
                { label: 'Acceleration', score: 88, tip: 'Smooth acceleration' },
                { label: 'Phone Use', score: 78, tip: 'Reduce phone usage while driving' },
                { label: 'Eco Score', score: userData.ecoScore, tip: 'Room for improvement' },
              ].map((cat, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-600">{cat.label}</span>
                    <span className="text-xs font-medium text-slate-900">{cat.score}</span>
                  </div>
                  <div className="flex-1 bg-slate-100 rounded-full h-2">
                    <div className={`h-2 rounded-full ${cat.score >= 90 ? 'bg-emerald-500' : cat.score >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${cat.score}%` }} />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">{cat.tip}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {profileTab === 'fuel' && (
        <div className="p-4">
          {userData.isPremium ? (
            <>
              <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">This Week</h3>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xl font-bold text-slate-900">12.4</p>
                    <p className="text-[10px] text-slate-500">Gallons</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-emerald-500">$43.20</p>
                    <p className="text-[10px] text-slate-500">Spent</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-blue-500">28.4</p>
                    <p className="text-[10px] text-slate-500">MPG Avg</p>
                  </div>
                </div>
              </div>
              <button onClick={() => toast('Opening fuel log...')}
                className="w-full bg-blue-500 text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1 mb-4">
                <Plus size={16} /> Log Fill-Up
              </button>
            </>
          ) : (
            <div className="bg-amber-50 rounded-xl p-4 text-center">
              <Fuel className="mx-auto text-amber-500 mb-2" size={32} />
              <h3 className="font-semibold text-slate-900 mb-1">Premium Feature</h3>
              <p className="text-xs text-slate-500 mb-3">Track fuel usage & optimize routes</p>
              <button onClick={() => toast('Upgrading...')} className="bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
                Upgrade to Pro
              </button>
            </div>
          )}
        </div>
      )}

      {profileTab === 'settings' && (
        <div className="p-4 space-y-2">
          {[
            { icon: User, label: 'Account', desc: 'Personal info, email', action: () => toast('Opening account settings...') },
            { icon: CreditCard, label: 'Subscription', desc: userData.isPremium ? 'Premium Active' : 'Free Plan', action: () => toast('Opening subscription...') },
            { icon: Car, label: 'My Vehicles', desc: '2 vehicles saved', action: () => toast('Opening vehicles...') },
            { icon: Layers, label: 'Map Widgets', desc: 'Customize map display', action: () => setShowWidgetSettings(true) },
            { icon: Bell, label: 'Notifications', desc: 'Push, email settings', action: () => toast('Opening notifications...') },
            { icon: Shield, label: 'Privacy', desc: 'Location, data sharing', action: () => toast('Opening privacy...') },
            { icon: HelpCircle, label: 'Help & Support', desc: 'FAQ, contact us', action: () => toast('Opening help...') },
          ].map((item, i) => (
            <button key={i} onClick={item.action}
              className="w-full bg-white rounded-xl p-3 flex items-center gap-3 shadow-sm hover:shadow-md">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                <item.icon className="text-slate-600" size={18} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-slate-900">{item.label}</p>
                <p className="text-[10px] text-slate-500">{item.desc}</p>
              </div>
              <ChevronRight className="text-slate-400" size={16} />
            </button>
          ))}
          <button onClick={() => { logout(); navigate('/login') }}
            className="w-full bg-red-50 text-red-500 py-3 rounded-xl text-sm font-medium mt-4">
            Log Out
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div className="h-screen bg-slate-900 flex flex-col">
      {/* iPhone Frame */}
      <div className="flex-1 flex items-center justify-center p-3">
        <div className="w-full max-w-[390px] h-[calc(100vh-24px)] max-h-[844px] bg-black rounded-[44px] p-2 shadow-2xl flex flex-col">
          {/* Notch */}
          <div className="h-8 flex items-center justify-center relative">
            <div className="w-28 h-6 bg-black rounded-full" />
            <div className="absolute left-6 text-white text-[11px] font-medium">9:41</div>
            <div className="absolute right-6 flex items-center gap-1">
              <span className="text-white text-[10px]">5G</span>
              <Battery className="text-white" size={16} />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 bg-white rounded-[36px] overflow-hidden flex flex-col">
            {activeTab === 'map' && renderMap()}
            {activeTab === 'offers' && renderOffers()}
            {activeTab === 'routes' && renderRoutes()}
            {activeTab === 'engagement' && renderEngagement()}
            {activeTab === 'live' && renderLive()}
            {activeTab === 'profile' && renderProfile()}

            {/* Bottom Nav */}
            <div className="bg-white border-t border-slate-200 px-2 py-1.5 pb-5">
              <div className="flex justify-around">
                {([
                  { key: 'map', icon: MapPin, label: 'Map' },
                  { key: 'offers', icon: Gift, label: 'Offers' },
                  { key: 'routes', icon: Route, label: 'Routes' },
                  { key: 'engagement', icon: Trophy, label: 'Engage' },
                  { key: 'profile', icon: User, label: 'Profile' },
                ] as const).map(({ key, icon: Icon, label }) => (
                  <button key={key} onClick={() => setActiveTab(key)}
                    className={`flex flex-col items-center gap-0.5 min-w-[56px] ${activeTab === key ? 'text-blue-500' : 'text-slate-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${activeTab === key ? 'bg-blue-100' : ''}`}>
                      <Icon size={18} />
                    </div>
                    <span className="text-[10px]">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showMenu && renderMenu()}

      {/* Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-start pt-20" onClick={() => setShowSearch(false)}>
          <div className="mx-4 w-full max-w-[358px] mx-auto bg-slate-800 rounded-2xl p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => setShowSearch(false)}><X className="text-white" size={24} /></button>
              <input autoFocus placeholder="Search destination..." className="flex-1 bg-slate-700 text-white px-3 py-2 rounded-xl text-sm" />
            </div>
            <p className="text-slate-400 text-[10px] mb-2">RECENT</p>
            {['Home - 123 Oak Street', 'Work - Downtown Office', 'Gym - FitLife Center', 'Starbucks - Main St'].map((p, i) => (
              <button key={i} onClick={() => { setShowSearch(false); handleStartNavigation(p.split(' - ')[0]) }}
                className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-slate-700 text-white text-sm">
                <History size={14} className="text-slate-400" /> {p}
              </button>
            ))}
            <p className="text-slate-400 text-[10px] mt-3 mb-2">SUGGESTIONS</p>
            {['Gas Stations Nearby', 'Coffee Shops', 'Restaurants'].map((p, i) => (
              <button key={i} onClick={() => toast(`Searching ${p}...`)}
                className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-slate-700 text-white text-sm">
                <Search size={14} className="text-slate-400" /> {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Notifications Modal */}
      {showNotifications && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-start pt-20" onClick={() => setShowNotifications(false)}>
          <div className="mx-4 w-full max-w-[358px] mx-auto bg-slate-800 rounded-2xl p-4 max-h-96 overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Notifications</h3>
              <button onClick={() => setShowNotifications(false)}><X className="text-white" size={24} /></button>
            </div>
            {[
              { title: 'Route Reminder', desc: 'Morning Commute starts in 15 min', icon: Clock, time: 'Just now', urgent: true },
              { title: 'New Badge!', desc: 'You earned "Night Owl"', icon: Trophy, time: '2h ago', urgent: false },
              { title: '+50 Gems', desc: 'Your report was verified', icon: Gem, time: '3h ago', urgent: false },
              { title: 'Offer Expiring', desc: 'Shell 10¢ off ends today', icon: Gift, time: '5h ago', urgent: true },
              { title: 'Family Alert', desc: 'Emma\'s phone is low on battery', icon: Battery, time: '1d ago', urgent: false },
            ].map((n, i) => (
              <button key={i} onClick={() => { toast(n.title); setShowNotifications(false) }}
                className={`w-full flex items-start gap-2 p-2 rounded-xl hover:bg-slate-700 text-left mb-1 ${n.urgent ? 'bg-red-900/20' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${n.urgent ? 'bg-red-500/20' : 'bg-emerald-500/20'}`}>
                  <n.icon size={14} className={n.urgent ? 'text-red-400' : 'text-emerald-400'} />
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{n.title}</p>
                  <p className="text-slate-400 text-xs">{n.desc}</p>
                </div>
                <span className="text-slate-500 text-[10px]">{n.time}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Offer Detail Modal */}
      {showOfferDetail && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end" onClick={() => setShowOfferDetail(null)}>
          <div className="w-full max-w-[390px] mx-auto bg-white rounded-t-3xl p-4 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{showOfferDetail.name}</h3>
                <p className="text-slate-500 text-sm">{showOfferDetail.address}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-400">{showOfferDetail.distance}</span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-yellow-500">⭐ {showOfferDetail.rating}</span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-400">{showOfferDetail.redemptions} redeemed</span>
                </div>
              </div>
              <button onClick={() => setShowOfferDetail(null)}><X size={24} className="text-slate-400" /></button>
            </div>
            <div className="bg-gradient-to-r from-emerald-500 to-blue-500 rounded-xl p-3 text-white mb-4">
              <p className="font-bold text-lg">{showOfferDetail.discount}</p>
              <p className="text-xs opacity-80">Valid for {showOfferDetail.expires}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleRedeem(showOfferDetail)}
                className="flex-1 bg-emerald-500 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-1.5 hover:bg-emerald-600">
                <Gem size={16} /> Redeem for {showOfferDetail.gems}
              </button>
              <button onClick={() => { handleStartNavigation(showOfferDetail.name); setShowOfferDetail(null) }}
                className="bg-blue-500 text-white px-4 rounded-xl hover:bg-blue-600">
                <Navigation size={18} />
              </button>
              <button onClick={() => handleFavorite(showOfferDetail.id)}
                className={`px-4 rounded-xl ${favorites.includes(showOfferDetail.id) ? 'bg-red-100' : 'bg-slate-100'}`}>
                <Heart className={favorites.includes(showOfferDetail.id) ? 'text-red-500 fill-red-500' : 'text-slate-400'} size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Badge Detail Modal */}
      {showBadgeDetail && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6" onClick={() => setShowBadgeDetail(null)}>
          <div className="w-full max-w-[320px] bg-white rounded-2xl p-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-end"><button onClick={() => setShowBadgeDetail(null)}><X size={24} className="text-slate-400" /></button></div>
            <div className={`w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-3 ${showBadgeDetail.earned ? 'bg-blue-500' : 'bg-slate-200'}`}>
              <Shield className={showBadgeDetail.earned ? 'text-white' : 'text-slate-400'} size={40} />
            </div>
            <h3 className="text-lg font-bold text-center text-slate-900">{showBadgeDetail.name}</h3>
            <p className="text-sm text-slate-500 text-center mt-1">{showBadgeDetail.desc}</p>
            {showBadgeDetail.earned ? (
              <p className="text-center text-emerald-500 text-xs mt-2">Earned on {showBadgeDetail.date}</p>
            ) : (
              <p className="text-center text-slate-400 text-xs mt-2">{showBadgeDetail.required}</p>
            )}
            <div className="mt-4">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600">Progress</span>
                <span className="text-blue-500 font-medium">{showBadgeDetail.progress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className={`h-2 rounded-full ${showBadgeDetail.earned ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${showBadgeDetail.progress}%` }} />
              </div>
            </div>
            <p className="text-center text-emerald-500 text-sm font-medium mt-3">Reward: +{showBadgeDetail.gems} Gems</p>
          </div>
        </div>
      )}

      {/* Family Member Modal */}
      {showFamilyMember && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6" onClick={() => setShowFamilyMember(null)}>
          <div className="w-full max-w-[320px] bg-white rounded-2xl p-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-xl">
                  {showFamilyMember.avatar}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{showFamilyMember.name}</h3>
                  <span className={`text-xs ${showFamilyMember.status === 'driving' ? 'text-emerald-500' : showFamilyMember.status === 'parked' ? 'text-blue-500' : 'text-slate-400'}`}>
                    {showFamilyMember.status === 'driving' ? `Driving ${showFamilyMember.speed} mph` : showFamilyMember.status === 'parked' ? 'Parked' : 'Offline'}
                  </span>
                </div>
              </div>
              <button onClick={() => setShowFamilyMember(null)}><X size={24} className="text-slate-400" /></button>
            </div>
            <div className="bg-slate-100 rounded-xl p-3 mb-3">
              <p className="text-xs text-slate-500">Current Location</p>
              <p className="text-sm font-medium text-slate-900">{showFamilyMember.location}</p>
              {showFamilyMember.eta && showFamilyMember.eta !== '-' && (
                <p className="text-xs text-blue-500 mt-1">ETA to you: {showFamilyMember.eta}</p>
              )}
            </div>
            <div className="flex gap-2 mb-3">
              <div className="flex-1 bg-slate-100 rounded-xl p-2 text-center">
                <Battery size={16} className={`mx-auto ${showFamilyMember.battery < 30 ? 'text-red-500' : 'text-slate-600'}`} />
                <p className="text-xs font-medium text-slate-900">{showFamilyMember.battery}%</p>
              </div>
              <div className="flex-1 bg-slate-100 rounded-xl p-2 text-center">
                <MapPin size={16} className="mx-auto text-slate-600" />
                <p className="text-xs font-medium text-slate-900">{showFamilyMember.distance}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleCallMember(showFamilyMember)}
                className="flex-1 bg-blue-500 text-white py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-1">
                <Phone size={14} /> Call
              </button>
              <button onClick={() => handleMessageMember(showFamilyMember)}
                className="flex-1 bg-slate-200 text-slate-700 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-1">
                <MessageCircle size={14} /> Message
              </button>
              <button onClick={() => { handleStartNavigation(showFamilyMember.name + "'s location"); setShowFamilyMember(null) }}
                className="flex-1 bg-emerald-500 text-white py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-1">
                <Navigation size={14} /> Go
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end" onClick={() => setShowReportModal(false)}>
          <div className="w-full max-w-[390px] mx-auto bg-white rounded-t-3xl p-4 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900">Report Incident</h3>
              <button onClick={() => setShowReportModal(false)}><X size={24} className="text-slate-400" /></button>
            </div>
            <p className="text-xs text-slate-500 mb-3">Select the type of hazard to report. You'll earn gems based on severity!</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { type: 'Accident', icon: '🚗', gems: 50, desc: 'Vehicle collision' },
                { type: 'Pothole', icon: '🕳️', gems: 15, desc: 'Road damage' },
                { type: 'Police', icon: '👮', gems: 25, desc: 'Speed trap' },
                { type: 'Construction', icon: '🚧', gems: 20, desc: 'Road work' },
                { type: 'Hazard', icon: '⚠️', gems: 30, desc: 'General hazard' },
                { type: 'Closure', icon: '🚫', gems: 40, desc: 'Road closed' },
              ].map(r => (
                <button key={r.type} onClick={() => handleReport(r.type, r.gems)}
                  className="bg-slate-100 rounded-xl p-3 text-center hover:bg-slate-200">
                  <span className="text-2xl block mb-1">{r.icon}</span>
                  <span className="text-xs font-medium text-slate-900">{r.type}</span>
                  <span className="text-[10px] text-emerald-500 block">+{r.gems} 💎</span>
                  <span className="text-[9px] text-slate-400">{r.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Route Modal */}
      {showAddRoute && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowAddRoute(false)}>
          <div className="w-full max-w-[350px] bg-white rounded-2xl p-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900">Add New Route</h3>
              <button onClick={() => setShowAddRoute(false)}><X size={24} className="text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Route Name</label>
                <input value={newRoute.name} onChange={e => setNewRoute({ ...newRoute, name: e.target.value })}
                  placeholder="e.g., Morning Commute" className="w-full bg-slate-100 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Origin</label>
                <input value={newRoute.origin} onChange={e => setNewRoute({ ...newRoute, origin: e.target.value })}
                  placeholder="e.g., Home" className="w-full bg-slate-100 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Destination</label>
                <input value={newRoute.destination} onChange={e => setNewRoute({ ...newRoute, destination: e.target.value })}
                  placeholder="e.g., Work - Downtown" className="w-full bg-slate-100 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Departure Time</label>
                <input type="time" value={newRoute.departureTime} onChange={e => setNewRoute({ ...newRoute, departureTime: e.target.value })}
                  className="w-full bg-slate-100 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Active Days</label>
                <div className="flex gap-1">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <button key={day} onClick={() => setNewRoute({
                      ...newRoute,
                      daysActive: newRoute.daysActive.includes(day) 
                        ? newRoute.daysActive.filter(d => d !== day) 
                        : [...newRoute.daysActive, day]
                    })}
                      className={`flex-1 py-1 rounded text-[10px] font-medium ${newRoute.daysActive.includes(day) ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      {day}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={newRoute.notifications} onChange={e => setNewRoute({ ...newRoute, notifications: e.target.checked })}
                  className="w-4 h-4 rounded" />
                <span className="text-sm text-slate-700">Enable departure notifications</span>
              </label>
            </div>
            <button onClick={handleAddRoute}
              className="w-full bg-blue-500 text-white py-2.5 rounded-xl font-medium mt-4 flex items-center justify-center gap-1">
              <Save size={16} /> Save Route
            </button>
          </div>
        </div>
      )}

      {/* Favorites Modal */}
      {showFavoriteModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end" onClick={() => setShowFavoriteModal(false)}>
          <div className="w-full max-w-[390px] mx-auto bg-white rounded-t-3xl p-4 animate-slide-up max-h-[70vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">My Favorites</h3>
                <p className="text-xs text-slate-500">Save places, routes, offers & contacts</p>
              </div>
              <button onClick={() => setShowFavoriteModal(false)}><X size={24} className="text-slate-400" /></button>
            </div>
            
            {/* Category Filters */}
            <div className="flex gap-2 mb-4 overflow-x-auto">
              {(['all', 'places', 'routes', 'offers', 'contacts'] as const).map(cat => (
                <button key={cat} onClick={() => setFavoriteCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${favoriteCategory === cat ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>

            {/* Favorites List */}
            <div className="space-y-2 mb-4">
              {favoriteItems.filter(f => favoriteCategory === 'all' || f.type === favoriteCategory.slice(0, -1)).map(fav => (
                <div key={fav.id} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
                  <span className="text-xl">{fav.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{fav.name}</p>
                    <p className="text-[10px] text-slate-500">{fav.detail}</p>
                  </div>
                  <button onClick={() => {
                    if (fav.type === 'place' || fav.type === 'route') handleStartNavigation(fav.name)
                    else if (fav.type === 'offer') setActiveTab('offers')
                    else toast(`Contacting ${fav.name}...`)
                    setShowFavoriteModal(false)
                  }} className="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs">
                    {fav.type === 'place' || fav.type === 'route' ? 'Go' : fav.type === 'offer' ? 'View' : 'Call'}
                  </button>
                  <button onClick={() => handleRemoveFavorite(fav.id)} className="text-slate-400 hover:text-red-500">
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add New */}
            <div className="border-t border-slate-200 pt-4">
              <p className="text-xs text-slate-500 mb-2">Add to Favorites</p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { type: 'place', icon: '📍', label: 'Place' },
                  { type: 'route', icon: '🛣️', label: 'Route' },
                  { type: 'offer', icon: '🎁', label: 'Offer' },
                  { type: 'contact', icon: '👤', label: 'Contact' },
                ].map(item => (
                  <button key={item.type} onClick={() => {
                    const name = prompt(`Enter ${item.label} name:`)
                    if (name) handleAddFavorite(item.type as FavoriteItem['type'], name, `New ${item.label.toLowerCase()}`)
                  }}
                    className="bg-slate-100 rounded-xl p-3 text-center hover:bg-slate-200">
                    <span className="text-xl block mb-1">{item.icon}</span>
                    <span className="text-[10px] text-slate-600">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Widget Settings Modal */}
      {showWidgetSettings && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowWidgetSettings(false)}>
          <div className="w-full max-w-[350px] bg-white rounded-2xl p-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Map Widgets</h3>
                <p className="text-xs text-slate-500">Customize your map display</p>
              </div>
              <button onClick={() => setShowWidgetSettings(false)}><X size={24} className="text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              {[
                { key: 'showScoreWidget', label: 'Safety Score Widget', desc: 'Show score on map', icon: Shield },
                { key: 'showGemsWidget', label: 'Gems Counter', desc: 'Show gem balance on map', icon: Gem },
                { key: 'showSpeedWidget', label: 'Speed Display', desc: 'Show current speed while navigating', icon: Gauge },
                { key: 'showEtaWidget', label: 'ETA Display', desc: 'Show arrival time while navigating', icon: Clock },
                { key: 'showTrafficLayer', label: 'Traffic Layer', desc: 'Show real-time traffic on map', icon: Layers },
                { key: 'show3DBuildings', label: '3D Buildings', desc: 'Show 3D building models', icon: Building },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center">
                      <item.icon size={18} className="text-slate-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{item.label}</p>
                      <p className="text-[10px] text-slate-500">{item.desc}</p>
                    </div>
                  </div>
                  <button onClick={() => handleToggleWidget(item.key as keyof WidgetSettings)}
                    className={`w-11 h-6 rounded-full relative transition-colors ${widgetSettings[item.key as keyof WidgetSettings] ? 'bg-blue-500' : 'bg-slate-300'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${widgetSettings[item.key as keyof WidgetSettings] ? 'left-5' : 'left-0.5'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
