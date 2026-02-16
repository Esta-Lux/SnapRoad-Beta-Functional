import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Toaster, toast } from 'sonner'
import {
  MapPin, Gift, Trophy, Users, User, Search, Home, Briefcase, Bell, Menu, Mic,
  Navigation, ChevronRight, ChevronDown, Shield, Target, Settings, Camera,
  Share2, Gem, Heart, Zap, Award, X, Plus, Check, Star, Clock, Car, Fuel,
  Coffee, AlertTriangle, Volume2, Filter, Grid, Eye, Lock, TrendingUp,
  Battery, Phone, MapPinned, Route, Gauge, Leaf, Moon, Sun, CreditCard,
  HelpCircle, LogOut, ChevronLeft, Play, Pause, BarChart3, Wallet, Percent
} from 'lucide-react'

// Types
type TabType = 'map' | 'offers' | 'engagement' | 'live' | 'profile'
type EngagementTab = 'badges' | 'skins' | 'progress' | 'reports'
type ProfileTab = 'overview' | 'score' | 'fuel' | 'settings'

// Mock Data
const mockOffers = [
  { id: 1, name: 'Shell Gas', type: 'gas', gems: 50, discount: '10¢/gal off', distance: '0.5 mi', trending: true, expires: '2h' },
  { id: 2, name: 'Starbucks', type: 'cafe', gems: 30, discount: '20% off', distance: '0.8 mi', trending: false, expires: '1d' },
  { id: 3, name: 'QuickMart', type: 'gas', gems: 45, discount: '15¢/gal off', distance: '1.2 mi', trending: true, expires: '5h' },
  { id: 4, name: 'Dunkin', type: 'cafe', gems: 25, discount: 'Free donut', distance: '1.5 mi', trending: false, expires: '3d' },
]

const mockBadges = [
  { id: 1, name: 'First Mile', desc: 'Drive your first mile', progress: 100, earned: true, gems: 10, category: 'distance' },
  { id: 2, name: 'Century Club', desc: 'Drive 100 miles', progress: 100, earned: true, gems: 50, category: 'distance' },
  { id: 3, name: 'Safety First', desc: '95+ safety score', progress: 92, earned: false, gems: 100, category: 'safety' },
  { id: 4, name: 'Road Guardian', desc: 'Report 10 incidents', progress: 70, earned: false, gems: 75, category: 'community' },
  { id: 5, name: 'Eco Warrior', desc: '90%+ eco score 5x', progress: 60, earned: false, gems: 150, category: 'eco' },
  { id: 6, name: 'Night Owl', desc: '50 night trips', progress: 100, earned: true, gems: 200, category: 'distance' },
  { id: 7, name: 'Perfect Week', desc: '7 days perfect safety', progress: 43, earned: false, gems: 500, category: 'safety' },
  { id: 8, name: 'Community Hero', desc: '100 upvotes on reports', progress: 35, earned: false, gems: 300, category: 'community' },
]

const mockSkins = [
  { id: 1, name: 'Neon Pulse', gradient: 'from-emerald-400 to-blue-500', owned: true, equipped: true, price: 0, rarity: 'common' },
  { id: 2, name: 'Midnight', gradient: 'from-slate-700 to-slate-900', owned: true, equipped: false, price: 0, rarity: 'common' },
  { id: 3, name: 'Fire Storm', gradient: 'from-red-500 to-orange-400', owned: false, equipped: false, price: 800, rarity: 'rare' },
  { id: 4, name: 'Chrome', gradient: 'from-slate-300 to-white', owned: false, equipped: false, price: 1500, rarity: 'epic' },
  { id: 5, name: 'Aurora', gradient: 'from-purple-500 to-pink-500', owned: false, equipped: false, price: 2500, rarity: 'legendary' },
  { id: 6, name: 'Galaxy', gradient: 'from-indigo-600 via-purple-600 to-pink-600', owned: false, equipped: false, price: 5000, rarity: 'exotic' },
]

const mockFamily = [
  { id: 1, name: 'Mom', avatar: 'M', status: 'driving', location: 'Highway 71 N', battery: 78, distance: '12 mi', speed: 65 },
  { id: 2, name: 'Dad', avatar: 'D', status: 'parked', location: 'Work - Downtown', battery: 45, distance: '8 mi', speed: 0 },
  { id: 3, name: 'Emma', avatar: 'E', status: 'offline', location: 'Last: School', battery: 23, distance: '3 mi', speed: 0, lastSeen: '2h ago' },
]

const mockReports = [
  { id: 1, type: 'pothole', location: 'Main St & 5th', time: '2h ago', gems: 15, status: 'verified', upvotes: 12 },
  { id: 2, type: 'accident', location: 'Highway 71', time: '5h ago', gems: 50, status: 'active', upvotes: 34 },
  { id: 3, type: 'construction', location: 'Oak Street', time: '1d ago', gems: 10, status: 'resolved', upvotes: 8 },
]

const mockChallenges = [
  { id: 1, title: 'Drive 50 miles', progress: 32, target: 50, gems: 100, type: 'weekly' },
  { id: 2, title: 'Report 3 incidents', progress: 1, target: 3, gems: 75, type: 'weekly' },
  { id: 3, title: 'Maintain 95+ score', progress: 87, target: 95, gems: 150, type: 'weekly' },
  { id: 4, title: 'Redeem 2 offers', progress: 0, target: 2, gems: 50, type: 'weekly' },
]

export default function DriverApp() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('map')
  const [engagementTab, setEngagementTab] = useState<EngagementTab>('badges')
  const [profileTab, setProfileTab] = useState<ProfileTab>('overview')
  const [showNotifications, setShowNotifications] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showOfferDetail, setShowOfferDetail] = useState<typeof mockOffers[0] | null>(null)
  const [showBadgeDetail, setShowBadgeDetail] = useState<typeof mockBadges[0] | null>(null)
  const [showFamilyMember, setShowFamilyMember] = useState<typeof mockFamily[0] | null>(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [favorites, setFavorites] = useState<number[]>([])
  const [offerFilter, setOfferFilter] = useState<'all' | 'gas' | 'cafe'>('all')
  const [badgeFilter, setBadgeFilter] = useState<'all' | 'earned' | 'locked'>('all')
  const [equippedSkin, setEquippedSkin] = useState(1)
  const [isNavigating, setIsNavigating] = useState(false)

  // User data
  const userData = user || {
    name: 'Sarah Johnson',
    gems: 12400,
    level: 42,
    safetyScore: 87,
    streak: 14,
    totalMiles: 2847,
    totalTrips: 156,
    badges: 11,
    rank: 42,
    isPremium: true,
    isFamilyPlan: true
  }

  // Handlers
  const handleFavorite = (id: number) => {
    setFavorites(prev => prev.includes(id) 
      ? prev.filter(x => x !== id) 
      : [...prev, id]
    )
    toast.success(favorites.includes(id) ? 'Removed from favorites' : 'Added to favorites!')
  }

  const handleRedeem = (offer: typeof mockOffers[0]) => {
    if (userData.gems >= offer.gems) {
      toast.success(`Redeemed "${offer.name}" for ${offer.gems} gems!`)
      setShowOfferDetail(null)
    } else {
      toast.error('Not enough gems!')
    }
  }

  const handleEquipSkin = (skinId: number) => {
    setEquippedSkin(skinId)
    toast.success('Skin equipped!')
  }

  const handleStartNavigation = (dest?: string) => {
    setIsNavigating(true)
    toast.loading('Starting navigation...', { duration: 1500 })
    setTimeout(() => {
      toast.success(`Navigating to ${dest || 'destination'}`)
    }, 1500)
  }

  const handleReport = (type: string) => {
    toast.success(`Reported ${type}! +25 gems`)
    setShowReportModal(false)
  }

  // Render Map Tab
  const renderMap = () => (
    <div className="flex-1 relative bg-slate-800 overflow-hidden">
      {/* Map Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-700 to-slate-900">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none'%3E%3Cg fill='%234a5568' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />
      </div>

      {/* Search Bar */}
      <div className="absolute top-3 left-3 right-3 z-10">
        <div className="flex gap-2">
          <button onClick={() => toast('Menu')} className="w-10 h-10 bg-slate-900/90 backdrop-blur rounded-xl flex items-center justify-center">
            <Menu className="text-white" size={18} />
          </button>
          <button onClick={() => setShowSearch(true)} className="flex-1 bg-slate-900/90 backdrop-blur rounded-xl px-3 h-10 flex items-center gap-2">
            <Search className="text-slate-400" size={16} />
            <span className="text-slate-400 text-sm">Where to?</span>
          </button>
          <button onClick={() => setShowNotifications(true)} className="w-10 h-10 bg-slate-900/90 backdrop-blur rounded-xl flex items-center justify-center relative">
            <Bell className="text-emerald-400" size={18} />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">3</span>
          </button>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 mt-2">
          <button onClick={() => handleStartNavigation('Home')} className="flex-1 bg-slate-900/90 backdrop-blur rounded-xl px-3 h-9 flex items-center gap-2">
            <Home className="text-emerald-400" size={14} />
            <span className="text-white text-xs">Home</span>
          </button>
          <button onClick={() => handleStartNavigation('Work')} className="flex-1 bg-slate-900/90 backdrop-blur rounded-xl px-3 h-9 flex items-center gap-2">
            <Briefcase className="text-blue-400" size={14} />
            <span className="text-white text-xs">Work</span>
          </button>
          <button onClick={() => setActiveTab('offers')} className="w-9 h-9 bg-slate-900/90 backdrop-blur rounded-xl flex items-center justify-center">
            <Gem className="text-emerald-400" size={16} />
          </button>
        </div>
      </div>

      {/* Score Widget */}
      <div className="absolute left-3 top-28 bg-slate-900/95 backdrop-blur rounded-xl p-3 w-28">
        <div className="relative w-16 h-16 mx-auto mb-1">
          <svg className="w-full h-full -rotate-90">
            <circle cx="32" cy="32" r="28" stroke="#1e293b" strokeWidth="5" fill="none" />
            <circle cx="32" cy="32" r="28" stroke="#3b82f6" strokeWidth="5" fill="none"
              strokeDasharray={`${(userData.safetyScore / 100) * 176} 176`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold text-white">{userData.safetyScore}</span>
            <span className="text-[10px] text-blue-400">SCORE</span>
          </div>
        </div>
        <button onClick={() => { setActiveTab('profile'); setProfileTab('score') }} className="w-full bg-blue-500 text-white text-[10px] font-medium py-1.5 rounded-lg">
          DETAILS
        </button>
      </div>

      {/* Gem Counter */}
      <div className="absolute right-3 top-28 bg-slate-900/95 backdrop-blur rounded-xl p-3">
        <div className="flex items-center gap-2">
          <Gem className="text-emerald-400" size={18} />
          <span className="text-white font-bold">{(userData.gems / 1000).toFixed(1)}K</span>
        </div>
        <p className="text-[10px] text-slate-400 mt-1">+125 today</p>
      </div>

      {/* Map Markers */}
      <button onClick={() => setShowOfferDetail(mockOffers[0])} className="absolute right-20 top-48">
        <div className="w-8 h-8 bg-blue-500 rounded-lg rotate-45 flex items-center justify-center">
          <Fuel className="text-white -rotate-45" size={14} />
        </div>
      </button>
      <button onClick={() => setShowOfferDetail(mockOffers[1])} className="absolute left-20 bottom-48">
        <div className="w-8 h-8 bg-orange-500 rounded-lg rotate-45 flex items-center justify-center">
          <Coffee className="text-white -rotate-45" size={14} />
        </div>
      </button>
      <button onClick={() => handleReport('hazard')} className="absolute right-12 bottom-56">
        <div className="w-9 h-9 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
          <AlertTriangle className="text-white" size={18} />
        </div>
      </button>

      {/* Action Buttons */}
      <div className="absolute right-3 bottom-20 flex flex-col gap-2">
        <button onClick={() => toast('🎤 Listening...')} className="w-11 h-11 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
          <Mic className="text-white" size={20} />
        </button>
        <button onClick={() => setShowReportModal(true)} className="w-11 h-11 bg-red-500/80 rounded-full flex items-center justify-center">
          <Camera className="text-white" size={20} />
        </button>
        <button onClick={() => handleStartNavigation()} className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg ${isNavigating ? 'bg-emerald-500' : 'bg-blue-500'}`}>
          <Navigation className={`text-white ${isNavigating ? 'animate-pulse' : ''}`} size={20} />
        </button>
      </div>

      {/* Current Location */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg" />
        <div className="absolute inset-0 w-4 h-4 bg-blue-500/30 rounded-full animate-ping" />
      </div>
    </div>
  )

  // Render Offers Tab
  const renderOffers = () => (
    <div className="flex-1 bg-slate-100 overflow-auto">
      {/* Header */}
      <div className="bg-white px-4 pt-3 pb-2 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Offers Nearby</h1>
            <p className="text-xs text-blue-500 font-medium">{mockOffers.length} ACTIVE DEALS</p>
          </div>
          <button className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center">
            <Filter className="text-slate-600" size={18} />
          </button>
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
            <p className="text-[10px] text-blue-100 font-medium">POTENTIAL SAVINGS</p>
            <p className="text-2xl font-bold">$127.50</p>
          </div>
          <div className="bg-white/20 rounded-lg px-2 py-1">
            <p className="text-[10px] text-blue-100">WALLET</p>
            <p className="text-sm font-bold flex items-center gap-1"><Gem size={12} /> {(userData.gems / 1000).toFixed(1)}K</p>
          </div>
        </div>
      </div>

      {/* Offers List */}
      <div className="p-4 space-y-2">
        {mockOffers.filter(o => offerFilter === 'all' || o.type === offerFilter).map(offer => (
          <button key={offer.id} onClick={() => setShowOfferDetail(offer)}
            className="w-full bg-white rounded-xl p-3 flex items-center gap-3 shadow-sm">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${offer.type === 'gas' ? 'bg-blue-500' : 'bg-orange-500'}`}>
              {offer.type === 'gas' ? <Fuel className="text-white" size={20} /> : <Coffee className="text-white" size={20} />}
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-900 text-sm">{offer.name}</span>
                {offer.trending && <span className="text-[10px] bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full">🔥</span>}
              </div>
              <p className="text-emerald-600 text-xs font-medium">{offer.discount}</p>
              <p className="text-slate-400 text-[10px]">{offer.distance} • Expires {offer.expires}</p>
            </div>
            <button onClick={(e) => { e.stopPropagation(); handleFavorite(offer.id) }}
              className={`w-8 h-8 rounded-full flex items-center justify-center ${favorites.includes(offer.id) ? 'bg-red-100' : 'bg-slate-100'}`}>
              <Heart className={favorites.includes(offer.id) ? 'text-red-500 fill-red-500' : 'text-slate-400'} size={16} />
            </button>
          </button>
        ))}
      </div>
    </div>
  )

  // Render Engagement Tab
  const renderEngagement = () => (
    <div className="flex-1 bg-slate-100 overflow-auto">
      {/* Header */}
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

      {/* Badges Tab */}
      {engagementTab === 'badges' && (
        <>
          <div className="mx-4 mt-3 p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl text-white">
            <div className="flex items-center gap-1.5 mb-1">
              <Trophy className="text-yellow-300" size={16} />
              <span className="text-[10px] text-blue-200 font-medium">YOUR COLLECTION</span>
            </div>
            <p className="text-2xl font-bold">{userData.badges} <span className="text-sm font-normal text-blue-200">/160 Badges</span></p>
            <div className="mt-2 w-full bg-blue-700 rounded-full h-1.5">
              <div className="bg-emerald-400 h-1.5 rounded-full" style={{ width: `${(userData.badges / 160) * 100}%` }} />
            </div>
          </div>
          <div className="px-4 py-3 flex gap-2">
            {(['all', 'earned', 'locked'] as const).map(f => (
              <button key={f} onClick={() => setBadgeFilter(f)}
                className={`flex-1 py-2 rounded-xl text-xs font-medium ${badgeFilter === f ? 'bg-blue-500 text-white' : 'bg-white text-slate-600'}`}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <div className="px-4 pb-4 grid grid-cols-2 gap-2">
            {mockBadges.filter(b => badgeFilter === 'all' || (badgeFilter === 'earned' ? b.earned : !b.earned)).map(badge => (
              <button key={badge.id} onClick={() => setShowBadgeDetail(badge)}
                className="bg-white rounded-xl p-3 text-left">
                <div className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-2 relative ${badge.earned ? 'bg-blue-500' : 'bg-slate-200'}`}>
                  <Shield className={badge.earned ? 'text-white' : 'text-slate-400'} size={24} />
                  {badge.earned && <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center"><Check size={12} className="text-white" /></div>}
                  {!badge.earned && <div className="absolute -top-1 -right-1 w-5 h-5 bg-slate-400 rounded-full flex items-center justify-center"><Lock size={10} className="text-white" /></div>}
                </div>
                <p className="text-center text-xs font-semibold text-slate-900">{badge.name}</p>
                <div className="mt-1.5 w-full bg-slate-100 rounded-full h-1">
                  <div className={`h-1 rounded-full ${badge.earned ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${badge.progress}%` }} />
                </div>
                <p className="text-center text-[10px] text-slate-400 mt-1">{badge.earned ? 'Earned' : `${badge.progress}%`}</p>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Skins Tab */}
      {engagementTab === 'skins' && (
        <>
          <div className="mx-4 mt-3 p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white">
            <div className="flex items-center gap-1.5 mb-1">
              <Car size={16} />
              <span className="text-[10px] font-medium">CAR STUDIO</span>
            </div>
            <p className="text-lg font-bold">Premium Skins</p>
            <p className="text-purple-200 text-xs">Personalize your ride</p>
          </div>
          <div className="px-4 py-3 grid grid-cols-2 gap-2">
            {mockSkins.map(skin => (
              <button key={skin.id} onClick={() => skin.owned ? handleEquipSkin(skin.id) : toast.error(`Need ${skin.price} gems`)}
                className={`bg-white rounded-xl p-3 border-2 ${equippedSkin === skin.id ? 'border-emerald-500' : 'border-transparent'}`}>
                <div className={`w-full aspect-square rounded-lg mb-2 bg-gradient-to-br ${skin.gradient}`} />
                <p className="text-xs font-semibold text-slate-900">{skin.name}</p>
                {skin.owned ? (
                  <p className={`text-[10px] ${equippedSkin === skin.id ? 'text-emerald-500' : 'text-slate-400'}`}>
                    {equippedSkin === skin.id ? '✓ Equipped' : 'Owned'}
                  </p>
                ) : (
                  <p className="text-[10px] text-purple-500 flex items-center gap-0.5"><Gem size={10} /> {skin.price}</p>
                )}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Progress Tab */}
      {engagementTab === 'progress' && (
        <>
          <div className="mx-4 mt-3 p-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl text-white">
            <p className="text-[10px] font-medium text-emerald-200">THIS WEEK</p>
            <p className="text-2xl font-bold">Level {userData.level}</p>
            <div className="flex justify-between text-xs mt-1 mb-1">
              <span>Next Level</span>
              <span>2,400 / 3,000 XP</span>
            </div>
            <div className="w-full bg-emerald-700 rounded-full h-1.5">
              <div className="bg-white h-1.5 rounded-full" style={{ width: '80%' }} />
            </div>
          </div>
          <div className="p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Weekly Challenges</h3>
            <div className="space-y-2">
              {mockChallenges.map(c => (
                <div key={c.id} className="bg-white rounded-xl p-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-medium text-slate-900">{c.title}</span>
                    <span className="text-xs text-emerald-500 font-medium">+{c.gems} 💎</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${(c.progress / c.target) * 100}%` }} />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">{c.progress}/{c.target}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 bg-amber-50 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <div className="text-2xl">🔥</div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{userData.streak} Day Streak!</p>
                  <p className="text-[10px] text-slate-500">Keep driving to maintain</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Reports Tab */}
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
                <p className="text-lg font-bold">75 💎</p>
              </div>
            </div>
          </div>
          <div className="p-4">
            <button onClick={() => setShowReportModal(true)}
              className="w-full bg-red-500 text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 mb-3">
              <Plus size={16} /> Report New Hazard
            </button>
            <div className="space-y-2">
              {mockReports.map(r => (
                <div key={r.id} className="bg-white rounded-xl p-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-900 capitalize">{r.type}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${r.status === 'verified' ? 'bg-emerald-100 text-emerald-600' : r.status === 'active' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                      {r.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">{r.location}</p>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-slate-400">{r.time}</span>
                    <span className="text-[10px] text-emerald-500 font-medium">+{r.gems} 💎 • {r.upvotes} 👍</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )

  // Render Live Tab (Family)
  const renderLive = () => (
    <div className="flex-1 bg-slate-100 overflow-auto">
      <div className="bg-white px-4 pt-3 pb-3 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Users className="text-indigo-500" size={20} />
          <h1 className="text-lg font-bold text-slate-900">Live Locations</h1>
        </div>
        <p className="text-xs text-slate-500">{mockFamily.filter(f => f.status !== 'offline').length} of {mockFamily.length} online</p>
      </div>

      {userData.isFamilyPlan ? (
        <div className="p-4 space-y-2">
          {mockFamily.map(member => (
            <button key={member.id} onClick={() => setShowFamilyMember(member)}
              className="w-full bg-white rounded-xl p-3 flex items-center gap-3">
              <div className="relative">
                <div className="w-11 h-11 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">
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
        </div>
      ) : (
        <div className="p-4 text-center">
          <div className="bg-indigo-100 rounded-xl p-6 mb-4">
            <Users className="mx-auto text-indigo-500 mb-2" size={40} />
            <h3 className="text-lg font-bold text-slate-900 mb-1">Family Plan</h3>
            <p className="text-xs text-slate-500 mb-3">Track up to 6 family members in real-time</p>
            <button className="bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
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
              {userData.name?.split(' ').map(n => n[0]).join('') || 'SJ'}
            </div>
            <button className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-400 rounded-full flex items-center justify-center">
              <Camera className="text-white" size={12} />
            </button>
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white">{userData.name || 'Sarah Johnson'}</h1>
            <div className="flex items-center gap-2">
              <span className="text-xs text-blue-200">Level {userData.level}</span>
              {userData.isPremium && <span className="text-[10px] bg-amber-400 text-amber-900 px-1.5 py-0.5 rounded-full font-medium">⚡ PRO</span>}
            </div>
          </div>
          <button onClick={() => toast('Profile shared!')} className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
            <Share2 className="text-white" size={16} />
          </button>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          {[
            { value: `${(userData.gems / 1000).toFixed(1)}K`, label: 'Gems', icon: '💎' },
            { value: userData.rank, label: 'Rank', icon: '🏆' },
            { value: userData.totalTrips, label: 'Trips', icon: '🚗' },
            { value: `${(userData.totalMiles / 1000).toFixed(1)}K`, label: 'Miles', icon: '📍' },
          ].map((s, i) => (
            <button key={i} onClick={() => setActiveTab('engagement')} className="bg-white/10 rounded-xl p-2 text-center">
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

      {/* Overview */}
      {profileTab === 'overview' && (
        <div className="p-4 space-y-2">
          {[
            { icon: Trophy, label: 'Achievements', value: `${userData.badges}/160 badges`, action: () => { setActiveTab('engagement'); setEngagementTab('badges') } },
            { icon: TrendingUp, label: 'Leaderboard', value: `Rank #${userData.rank}`, action: () => toast('Leaderboard') },
            { icon: Route, label: 'Trip History', value: `${userData.totalTrips} trips`, action: () => toast('Trip History') },
            { icon: Gem, label: 'Gem History', value: '+2,450 this month', action: () => setActiveTab('offers') },
          ].map((item, i) => (
            <button key={i} onClick={item.action}
              className="w-full bg-white rounded-xl p-3 flex items-center gap-3">
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

      {/* Score Tab */}
      {profileTab === 'score' && (
        <div className="p-4">
          <div className="bg-white rounded-xl p-4 mb-4">
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
                { label: 'Speed', score: 92, icon: Gauge },
                { label: 'Braking', score: 85, icon: AlertTriangle },
                { label: 'Acceleration', score: 88, icon: TrendingUp },
                { label: 'Phone Use', score: 78, icon: Phone },
              ].map((cat, i) => (
                <div key={i} className="flex items-center gap-2">
                  <cat.icon size={14} className="text-slate-400" />
                  <span className="text-xs text-slate-600 w-20">{cat.label}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2">
                    <div className={`h-2 rounded-full ${cat.score >= 90 ? 'bg-emerald-500' : cat.score >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${cat.score}%` }} />
                  </div>
                  <span className="text-xs font-medium text-slate-900 w-8">{cat.score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Fuel Tab */}
      {profileTab === 'fuel' && (
        <div className="p-4">
          {userData.isPremium ? (
            <>
              <div className="bg-white rounded-xl p-4 mb-4">
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
              <button className="w-full bg-blue-500 text-white py-2.5 rounded-xl text-sm font-medium mb-4">
                <Plus size={16} className="inline mr-1" /> Log Fill-Up
              </button>
            </>
          ) : (
            <div className="bg-amber-50 rounded-xl p-4 text-center">
              <Fuel className="mx-auto text-amber-500 mb-2" size={32} />
              <h3 className="font-semibold text-slate-900 mb-1">Premium Feature</h3>
              <p className="text-xs text-slate-500 mb-3">Track fuel usage & optimize routes</p>
              <button className="bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
                Upgrade to Pro
              </button>
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {profileTab === 'settings' && (
        <div className="p-4 space-y-2">
          {[
            { icon: User, label: 'Account', desc: 'Personal info, email' },
            { icon: CreditCard, label: 'Subscription', desc: userData.isPremium ? 'Premium Active' : 'Free Plan' },
            { icon: Car, label: 'My Vehicles', desc: '2 vehicles saved' },
            { icon: Bell, label: 'Notifications', desc: 'Push, email settings' },
            { icon: Shield, label: 'Privacy', desc: 'Location, data sharing' },
            { icon: HelpCircle, label: 'Help & Support', desc: 'FAQ, contact us' },
          ].map((item, i) => (
            <button key={i} onClick={() => toast(`Opening ${item.label}...`)}
              className="w-full bg-white rounded-xl p-3 flex items-center gap-3">
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
              <div className="text-white text-[10px]">5G</div>
              <Battery className="text-white" size={16} />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 bg-white rounded-[36px] overflow-hidden flex flex-col">
            {activeTab === 'map' && renderMap()}
            {activeTab === 'offers' && renderOffers()}
            {activeTab === 'engagement' && renderEngagement()}
            {activeTab === 'live' && renderLive()}
            {activeTab === 'profile' && renderProfile()}

            {/* Bottom Nav */}
            <div className="bg-white border-t border-slate-200 px-2 py-1.5 pb-5">
              <div className="flex justify-around">
                {([
                  { key: 'map', icon: MapPin, label: 'Map' },
                  { key: 'offers', icon: Gift, label: 'Offers' },
                  { key: 'engagement', icon: Trophy, label: 'Engage' },
                  { key: 'live', icon: Users, label: 'Live' },
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
      {/* Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-start pt-20">
          <div className="mx-4 w-full max-w-[358px] mx-auto bg-slate-800 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => setShowSearch(false)}><X className="text-white" size={24} /></button>
              <input autoFocus placeholder="Search destination..." className="flex-1 bg-slate-700 text-white px-3 py-2 rounded-xl text-sm" />
            </div>
            <div className="space-y-2">
              {['Home - 123 Main St', 'Work - Downtown Office', 'Gym - FitLife Center'].map((p, i) => (
                <button key={i} onClick={() => { setShowSearch(false); handleStartNavigation(p.split(' - ')[0]) }}
                  className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-slate-700 text-white text-sm">
                  <MapPinned size={16} className="text-emerald-400" /> {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Notifications Modal */}
      {showNotifications && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-start pt-20">
          <div className="mx-4 w-full max-w-[358px] mx-auto bg-slate-800 rounded-2xl p-4 max-h-96 overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Notifications</h3>
              <button onClick={() => setShowNotifications(false)}><X className="text-white" size={24} /></button>
            </div>
            <div className="space-y-2">
              {[
                { title: 'New Badge!', desc: 'You earned "Night Owl"', icon: Trophy, time: '2m' },
                { title: '+50 Gems', desc: 'Incident report verified', icon: Gem, time: '1h' },
                { title: 'Offer Expiring', desc: 'Shell 10¢ off ends today', icon: Clock, time: '3h' },
              ].map((n, i) => (
                <button key={i} onClick={() => { toast(n.title); setShowNotifications(false) }}
                  className="w-full flex items-start gap-2 p-2 rounded-xl hover:bg-slate-700 text-left">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <n.icon size={14} className="text-emerald-400" />
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
        </div>
      )}

      {/* Offer Detail Modal */}
      {showOfferDetail && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end">
          <div className="w-full max-w-[390px] mx-auto bg-white rounded-t-3xl p-4 animate-slide-up">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{showOfferDetail.name}</h3>
                <p className="text-slate-500 text-sm">{showOfferDetail.distance} away</p>
              </div>
              <button onClick={() => setShowOfferDetail(null)}><X size={24} className="text-slate-400" /></button>
            </div>
            <div className="bg-gradient-to-r from-emerald-500 to-blue-500 rounded-xl p-3 text-white mb-4">
              <p className="font-bold">{showOfferDetail.discount}</p>
              <p className="text-xs opacity-80">Valid for {showOfferDetail.expires}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleRedeem(showOfferDetail)}
                className="flex-1 bg-emerald-500 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-1.5">
                <Gem size={16} /> Redeem for {showOfferDetail.gems}
              </button>
              <button onClick={() => { handleStartNavigation(showOfferDetail.name); setShowOfferDetail(null) }}
                className="bg-blue-500 text-white px-4 rounded-xl">
                <Navigation size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Badge Detail Modal */}
      {showBadgeDetail && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-[320px] bg-white rounded-2xl p-4">
            <div className="flex justify-end"><button onClick={() => setShowBadgeDetail(null)}><X size={24} className="text-slate-400" /></button></div>
            <div className={`w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-3 ${showBadgeDetail.earned ? 'bg-blue-500' : 'bg-slate-200'}`}>
              <Shield className={showBadgeDetail.earned ? 'text-white' : 'text-slate-400'} size={40} />
            </div>
            <h3 className="text-lg font-bold text-center text-slate-900">{showBadgeDetail.name}</h3>
            <p className="text-sm text-slate-500 text-center mt-1">{showBadgeDetail.desc}</p>
            <div className="mt-4">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600">Progress</span>
                <span className="text-blue-500 font-medium">{showBadgeDetail.progress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${showBadgeDetail.progress}%` }} />
              </div>
            </div>
            <p className="text-center text-emerald-500 text-sm font-medium mt-3">+{showBadgeDetail.gems} Gems</p>
          </div>
        </div>
      )}

      {/* Family Member Modal */}
      {showFamilyMember && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-[320px] bg-white rounded-2xl p-4">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-lg">
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
            <div className="bg-slate-100 rounded-xl p-3 mb-4">
              <p className="text-xs text-slate-500">Location</p>
              <p className="text-sm font-medium text-slate-900">{showFamilyMember.location}</p>
            </div>
            <div className="flex gap-2 mb-4">
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
              <button className="flex-1 bg-blue-500 text-white py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-1">
                <Phone size={14} /> Call
              </button>
              <button onClick={() => { handleStartNavigation(showFamilyMember.name + "'s location"); setShowFamilyMember(null) }}
                className="flex-1 bg-emerald-500 text-white py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-1">
                <Navigation size={14} /> Navigate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end">
          <div className="w-full max-w-[390px] mx-auto bg-white rounded-t-3xl p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900">Report Incident</h3>
              <button onClick={() => setShowReportModal(false)}><X size={24} className="text-slate-400" /></button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { type: 'Accident', icon: '🚗', gems: 50 },
                { type: 'Pothole', icon: '🕳️', gems: 15 },
                { type: 'Police', icon: '👮', gems: 25 },
                { type: 'Construction', icon: '🚧', gems: 20 },
                { type: 'Hazard', icon: '⚠️', gems: 30 },
                { type: 'Closure', icon: '🚫', gems: 40 },
              ].map(r => (
                <button key={r.type} onClick={() => handleReport(r.type)}
                  className="bg-slate-100 rounded-xl p-3 text-center hover:bg-slate-200">
                  <span className="text-2xl block mb-1">{r.icon}</span>
                  <span className="text-xs font-medium text-slate-900">{r.type}</span>
                  <span className="text-[10px] text-emerald-500 block">+{r.gems} 💎</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
