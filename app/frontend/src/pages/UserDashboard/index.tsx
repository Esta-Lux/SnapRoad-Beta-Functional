import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  MapPin, Gift, Trophy, User, Search, Home, Briefcase, Bell, Menu, Mic, Volume2,
  AlertTriangle, Navigation, ChevronRight, ChevronDown, Shield, Target, Users,
  Settings, CreditCard, Camera, Share2, Gem, Filter, Grid, Heart, Zap, Award,
  X, Plus, Check, Star, Clock, MapPinned, Car, Fuel, Coffee, ShoppingBag
} from 'lucide-react'

type TabType = 'map' | 'offers' | 'engagement' | 'live' | 'profile'
type EngagementSubTab = 'badges' | 'skins' | 'reports' | 'progress'
type BadgeCategory = 'all' | 'safety' | 'distance' | 'community'

// Mock user data
const userData = {
  name: 'Sarah Johnson',
  username: '@sarah.j',
  avatar: 'SJ',
  isPremium: true,
  rank: 42,
  gems: 12400,
  level: 42,
  reports: 148,
  miles: 2800,
  score: 87,
  eco: 12.4,
  wallet: 1240,
  potentialSavings: 127.50,
  topReward: 435,
  badges: { earned: 11, total: 160 },
  masteryLevel: 12,
  masteryProgress: 7,
  globalRank: 1248
}

const nearbyOffers = [
  { id: 1, name: 'Shell Gas Station', category: 'gas', gems: 50, isTrending: true, distance: '0.5 mi', discount: '10¢/gal off' },
  { id: 2, name: 'Downtown Coffee', category: 'cafe', gems: 30, isTrending: false, distance: '0.8 mi', discount: '20% off' },
  { id: 3, name: 'Quick Mart', category: 'gas', gems: 45, isTrending: true, distance: '1.2 mi', discount: '15¢/gal off' },
  { id: 4, name: 'Starbucks Reserve', category: 'cafe', gems: 60, isTrending: false, distance: '1.5 mi', discount: 'Free upgrade' },
]

const badges = [
  { id: 1, name: 'Safe Driver I', category: 'safety', achieved: true, description: 'Complete 10 trips with score > 80', progress: 100 },
  { id: 2, name: 'Safe Driver II', category: 'safety', achieved: true, description: 'Complete 50 trips with score > 85', progress: 100 },
  { id: 3, name: 'Road Explorer', category: 'distance', achieved: true, description: 'Drive 1000 miles total', progress: 100 },
  { id: 4, name: 'Community Helper', category: 'community', achieved: false, description: 'Report 25 road hazards', progress: 68 },
  { id: 5, name: 'Night Owl', category: 'distance', achieved: true, description: 'Complete 20 night trips', progress: 100 },
  { id: 6, name: 'Weekend Warrior', category: 'community', achieved: false, description: 'Drive every weekend for a month', progress: 45 },
]

const recentReports = [
  { id: 1, type: 'pothole', location: 'Main St & 5th Ave', time: '2 hours ago', gems: 15, status: 'verified' },
  { id: 2, type: 'accident', location: 'Highway 71 N', time: '5 hours ago', gems: 25, status: 'pending' },
  { id: 3, type: 'construction', location: 'Oak Street', time: 'Yesterday', gems: 10, status: 'verified' },
]

const carSkins = [
  { id: 1, name: 'Neon Pulse', color: 'linear-gradient(135deg, #00DFA2 0%, #0084FF 100%)', owned: true, equipped: true, price: 0 },
  { id: 2, name: 'Midnight Black', color: 'linear-gradient(135deg, #1a1a1a 0%, #000 100%)', owned: true, equipped: false, price: 0 },
  { id: 3, name: 'Chrome Mirage', color: 'linear-gradient(135deg, #E8E8E8 0%, #FFF 50%, #E8E8E8 100%)', owned: false, equipped: false, price: 1500 },
  { id: 4, name: 'Fire Storm', color: 'linear-gradient(135deg, #FF6B6B 0%, #FFE66D 100%)', owned: false, equipped: false, price: 800 },
]

export default function UserDashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabType>('map')
  const [profileSubTab, setProfileSubTab] = useState<'overview' | 'settings'>('overview')
  const [engagementTab, setEngagementTab] = useState<EngagementSubTab>('badges')
  const [badgeFilter, setBadgeFilter] = useState<BadgeCategory>('all')
  const [offerFilter, setOfferFilter] = useState<'all' | 'gas' | 'cafe'>('all')
  const [favorites, setFavorites] = useState<number[]>([])
  const [isNavigating, setIsNavigating] = useState(false)
  const [selectedOffer, setSelectedOffer] = useState<typeof nearbyOffers[0] | null>(null)
  const [selectedBadge, setSelectedBadge] = useState<typeof badges[0] | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)
  const [equippedSkin, setEquippedSkin] = useState(1)

  // Action handlers
  const handleFavoriteToggle = (offerId: number) => {
    setFavorites(prev => {
      if (prev.includes(offerId)) {
        toast.success('Removed from favorites')
        return prev.filter(id => id !== offerId)
      } else {
        toast.success('Added to favorites!')
        return [...prev, offerId]
      }
    })
  }

  const handleRedeemOffer = (offer: typeof nearbyOffers[0]) => {
    if (userData.wallet >= offer.gems) {
      toast.success(`Redeemed "${offer.name}" for ${offer.gems} gems!`)
      setSelectedOffer(null)
    } else {
      toast.error('Not enough gems!')
    }
  }

  const handleStartNavigation = (destination?: string) => {
    setIsNavigating(true)
    toast.loading('Starting navigation...', { duration: 1500 })
    setTimeout(() => {
      toast.success(`Navigating to ${destination || 'destination'}`)
      setIsNavigating(false)
    }, 1500)
  }

  const handleVoiceCommand = () => {
    toast('🎤 Listening...', { duration: 2000 })
    setTimeout(() => toast.success('Voice command: "Navigate to Home"'), 2000)
  }

  const handleReportHazard = (type: string) => {
    toast.success(`Reported ${type}! +15 gems earned`)
  }

  const handleEquipSkin = (skinId: number) => {
    setEquippedSkin(skinId)
    toast.success('Skin equipped!')
  }

  const handleBuySkin = (skin: typeof carSkins[0]) => {
    if (userData.wallet >= skin.price) {
      toast.success(`Purchased "${skin.name}"!`)
    } else {
      toast.error(`Need ${skin.price - userData.wallet} more gems`)
    }
  }

  const handleShareProfile = () => {
    navigator.clipboard?.writeText(`Check out my SnapRoad profile: ${userData.name} - Rank #${userData.rank}`)
    toast.success('Profile link copied!')
  }

  // Map Tab
  const renderMapTab = () => (
    <div className="relative h-full bg-slate-800 rounded-3xl overflow-hidden">
      {/* Map Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-700 to-slate-900">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\'%3E%3Cg fill=\'%234a5568\' fill-opacity=\'0.3\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
        }} />
      </div>

      {/* Search Modal */}
      {showSearch && (
        <div className="absolute inset-0 z-50 bg-black/80 p-4">
          <div className="bg-slate-800 rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => setShowSearch(false)} className="text-white">
                <X size={24} />
              </button>
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search destination..."
                className="flex-1 bg-slate-700 text-white px-4 py-3 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              {['Home - 123 Main St', 'Work - Downtown Office', 'Gym - FitLife Center'].map((place, i) => (
                <button
                  key={i}
                  onClick={() => { setShowSearch(false); handleStartNavigation(place.split(' - ')[0]) }}
                  className="w-full flex items-center gap-3 p-3 bg-slate-700/50 rounded-xl text-white hover:bg-slate-600"
                >
                  <MapPinned size={20} className="text-emerald-400" />
                  {place}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Notifications Panel */}
      {showNotifications && (
        <div className="absolute inset-0 z-50 bg-black/80 p-4">
          <div className="bg-slate-800 rounded-2xl p-4 max-h-full overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg">Notifications</h3>
              <button onClick={() => setShowNotifications(false)} className="text-white">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-3">
              {[
                { title: 'New Badge Unlocked!', desc: 'You earned "Safe Driver II"', time: '2m ago', icon: Trophy },
                { title: 'Gems Earned', desc: '+25 gems from hazard report', time: '1h ago', icon: Gem },
                { title: 'Offer Expiring', desc: 'Shell Gas 10¢ off expires today', time: '3h ago', icon: Clock },
              ].map((notif, i) => (
                <button
                  key={i}
                  onClick={() => { toast.success(`Viewing: ${notif.title}`); setShowNotifications(false) }}
                  className="w-full flex items-start gap-3 p-3 bg-slate-700/50 rounded-xl text-left hover:bg-slate-600"
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <notif.icon size={20} className="text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{notif.title}</p>
                    <p className="text-slate-400 text-sm">{notif.desc}</p>
                    <p className="text-slate-500 text-xs mt-1">{notif.time}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="relative z-10 p-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => toast('Menu opened')}
            className="w-12 h-12 bg-slate-800/90 rounded-full flex items-center justify-center hover:bg-slate-700 transition-colors"
          >
            <Menu className="text-white" size={20} />
          </button>
          <button 
            onClick={() => setShowSearch(true)}
            className="flex-1 bg-slate-800/90 rounded-full px-4 py-3 flex items-center gap-3 hover:bg-slate-700 transition-colors"
          >
            <Search className="text-slate-400" size={20} />
            <span className="text-slate-400">Where to?</span>
          </button>
          <button 
            onClick={() => setShowNotifications(true)}
            className="w-12 h-12 bg-slate-800/90 rounded-full flex items-center justify-center relative hover:bg-slate-700 transition-colors"
          >
            <Bell className="text-green-400" size={20} />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">3</span>
          </button>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 mt-4">
          <button 
            onClick={() => toast('Showing favorite places')}
            className="flex-1 bg-blue-500 text-white rounded-full py-3 px-4 flex items-center justify-center gap-2 font-medium hover:bg-blue-600 transition-colors"
          >
            <Star size={16} /> Favorites <ChevronDown size={16} />
          </button>
          <button 
            onClick={() => setActiveTab('offers')}
            className="flex-1 bg-slate-800/90 text-white rounded-full py-3 px-4 flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors"
          >
            <Gift size={16} /> Offers <ChevronDown size={16} />
          </button>
        </div>

        {/* Quick Locations */}
        <div className="flex gap-2 mt-3">
          <button 
            onClick={() => handleStartNavigation('Home')}
            className="bg-slate-800/90 rounded-full py-2 px-4 flex items-center gap-2 hover:bg-slate-700 transition-colors"
          >
            <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center">
              <Home className="text-emerald-400" size={16} />
            </div>
            <span className="text-white">Home</span>
          </button>
          <button 
            onClick={() => handleStartNavigation('Work')}
            className="bg-slate-800/90 rounded-full py-2 px-4 flex items-center gap-2 hover:bg-slate-700 transition-colors"
          >
            <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
              <Briefcase className="text-blue-400" size={16} />
            </div>
            <span className="text-white">Work</span>
          </button>
          <button 
            onClick={() => { toast.success(`You have ${userData.wallet} gems`); setActiveTab('offers') }}
            className="w-12 h-12 bg-slate-800/90 rounded-full flex items-center justify-center hover:bg-slate-700 transition-colors"
          >
            <Gem className="text-emerald-400" size={20} />
          </button>
        </div>
      </div>

      {/* Score Widget */}
      <div className="absolute left-4 top-56 bg-slate-800/95 rounded-2xl p-4 w-36 backdrop-blur-sm border border-slate-700">
        <div className="relative w-20 h-20 mx-auto mb-2">
          <svg className="w-full h-full -rotate-90">
            <circle cx="40" cy="40" r="35" stroke="#1e293b" strokeWidth="6" fill="none" />
            <circle cx="40" cy="40" r="35" stroke="#3b82f6" strokeWidth="6" fill="none"
              strokeDasharray={`${(userData.score / 100) * 220} 220`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-white">{userData.score}</span>
            <span className="text-xs text-blue-400">PTS</span>
          </div>
        </div>
        <button 
          onClick={() => toast('Score breakdown: Braking 92, Speed 85, Turns 84')}
          className="w-full bg-blue-500 text-white text-xs font-medium py-2 rounded-full hover:bg-blue-600 transition-colors"
        >
          DETAILS &gt;
        </button>
        <p className="text-center text-slate-400 text-xs mt-2">SCORE</p>
      </div>

      {/* ECO Widget */}
      <div className="absolute left-4 bottom-32 bg-slate-800/95 rounded-2xl p-4 w-36 backdrop-blur-sm border border-slate-700">
        <div className="relative w-20 h-20 mx-auto mb-2">
          <svg className="w-full h-full -rotate-90">
            <circle cx="40" cy="40" r="35" stroke="#1e293b" strokeWidth="6" fill="none" />
            <circle cx="40" cy="40" r="35" stroke="#22c55e" strokeWidth="6" fill="none"
              strokeDasharray={`${(userData.eco / 20) * 220} 220`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-white">{userData.eco}</span>
            <span className="text-xs text-green-400">%</span>
          </div>
        </div>
        <button 
          onClick={() => toast('ECO tips: Coast more, brake less, maintain speed')}
          className="w-full bg-blue-500 text-white text-xs font-medium py-2 rounded-full hover:bg-blue-600 transition-colors"
        >
          DETAILS &gt;
        </button>
        <p className="text-center text-slate-400 text-xs mt-2">ECO</p>
      </div>

      {/* Map Markers - Clickable */}
      <button 
        onClick={() => { setSelectedOffer(nearbyOffers[0]); setActiveTab('offers') }}
        className="absolute right-24 top-64 hover:scale-110 transition-transform"
      >
        <div className="relative">
          <div className="w-10 h-10 bg-emerald-400 rotate-45 rounded-lg" />
          <Fuel className="absolute inset-0 m-auto text-white -rotate-45" size={20} />
          <span className="absolute -top-2 -right-2 bg-yellow-500 text-xs font-bold px-1.5 py-0.5 rounded-full">8</span>
        </div>
      </button>
      <button 
        onClick={() => { setSelectedOffer(nearbyOffers[1]); setActiveTab('offers') }}
        className="absolute right-32 bottom-48 hover:scale-110 transition-transform"
      >
        <div className="relative">
          <div className="w-10 h-10 bg-orange-400 rotate-45 rounded-lg" />
          <Coffee className="absolute inset-0 m-auto text-white -rotate-45" size={20} />
          <span className="absolute -top-2 -right-2 bg-yellow-500 text-xs font-bold px-1.5 py-0.5 rounded-full">17</span>
        </div>
      </button>

      {/* Hazard Marker */}
      <button 
        onClick={() => handleReportHazard('road hazard')}
        className="absolute right-8 bottom-52 hover:scale-110 transition-transform"
      >
        <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
          <AlertTriangle className="text-white" size={24} />
        </div>
      </button>

      {/* Action Buttons */}
      <div className="absolute right-4 top-56 flex flex-col gap-3">
        <button 
          onClick={handleVoiceCommand}
          className="w-14 h-14 bg-blue-500 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-600 transition-colors"
        >
          <Mic className="text-white" size={24} />
        </button>
        <button 
          onClick={() => toast('Audio guidance enabled')}
          className="w-14 h-14 bg-slate-800 rounded-full flex items-center justify-center border border-slate-600 hover:bg-slate-700 transition-colors"
        >
          <Volume2 className="text-white" size={24} />
        </button>
        <button 
          onClick={() => handleReportHazard('hazard')}
          className="w-14 h-14 bg-red-500/80 rounded-full flex items-center justify-center border border-red-400 hover:bg-red-600 transition-colors"
        >
          <AlertTriangle className="text-white" size={24} />
        </button>
      </div>

      {/* Navigation Button */}
      <div className="absolute right-4 bottom-36">
        <button 
          onClick={() => handleStartNavigation()}
          disabled={isNavigating}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-colors ${isNavigating ? 'bg-green-500' : 'bg-blue-500 hover:bg-blue-600'}`}
        >
          <Navigation className={`text-white ${isNavigating ? 'animate-pulse' : ''}`} size={24} />
        </button>
      </div>
    </div>
  )

  // Offers Tab
  const renderOffersTab = () => (
    <div className="h-full bg-gradient-to-b from-slate-100 to-white rounded-3xl overflow-hidden">
      {/* Offer Detail Modal */}
      {selectedOffer && (
        <div className="absolute inset-0 z-50 bg-black/80 flex items-end">
          <div className="bg-white rounded-t-3xl p-6 w-full animate-slide-up">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{selectedOffer.name}</h3>
                <p className="text-slate-500">{selectedOffer.distance} away</p>
              </div>
              <button onClick={() => setSelectedOffer(null)} className="p-2 hover:bg-slate-100 rounded-full">
                <X size={24} className="text-slate-600" />
              </button>
            </div>
            <div className="bg-gradient-to-r from-emerald-500 to-blue-500 rounded-2xl p-4 text-white mb-4">
              <p className="text-lg font-bold">{selectedOffer.discount}</p>
              <p className="text-sm opacity-80">Valid until midnight</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => handleRedeemOffer(selectedOffer)}
                className="flex-1 bg-emerald-500 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-emerald-600"
              >
                <Gem size={18} /> Redeem for {selectedOffer.gems} Gems
              </button>
              <button 
                onClick={() => { handleStartNavigation(selectedOffer.name); setSelectedOffer(null) }}
                className="bg-blue-500 text-white p-3 rounded-xl hover:bg-blue-600"
              >
                <Navigation size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="p-4 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Offers Nearby</h1>
            <p className="text-blue-500 text-sm font-medium">{nearbyOffers.filter(o => offerFilter === 'all' || o.category === offerFilter).length} ACTIVE DEALS</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => toast('Grid view')}
              className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center hover:bg-slate-200"
            >
              <Grid className="text-slate-600" size={20} />
            </button>
            <button 
              onClick={() => toast('Filters: Distance, Price, Category')}
              className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center hover:bg-slate-200"
            >
              <Filter className="text-slate-600" size={20} />
            </button>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex gap-2">
          {(['all', 'gas', 'cafe'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setOfferFilter(filter)}
              className={`px-4 py-2 rounded-full flex items-center gap-2 border transition-all ${
                offerFilter === filter ? 'bg-white border-slate-300 shadow-sm' : 'bg-transparent border-slate-200 hover:bg-slate-50'
              }`}
            >
              {filter === 'gas' && <Fuel size={16} className="text-blue-500" />}
              {filter === 'cafe' && <Coffee size={16} className="text-orange-500" />}
              {filter === 'all' && <Grid size={16} className="text-slate-600" />}
              <span className="capitalize text-slate-700 font-medium">
                {filter === 'all' ? 'All' : filter === 'gas' ? 'Gas' : 'Cafe'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Savings Card */}
      <div className="mx-4 p-4 bg-gradient-to-r from-blue-500 via-blue-400 to-emerald-400 rounded-2xl text-white">
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="text-blue-100 text-xs font-medium tracking-wider flex items-center gap-1">
              <Zap size={12} /> TOTAL POTENTIAL SAVINGS
            </p>
            <p className="text-4xl font-bold">${userData.potentialSavings.toFixed(2)}</p>
          </div>
          <button 
            onClick={() => toast.success(`Wallet: ${userData.wallet} gems`)}
            className="bg-white/20 backdrop-blur rounded-xl p-3 hover:bg-white/30 transition-colors"
          >
            <p className="text-xs text-blue-100">MY WALLET</p>
            <p className="flex items-center gap-1 font-bold"><Gem size={14} /> {userData.wallet.toLocaleString()}</p>
          </button>
        </div>
        <button 
          onClick={() => toast('Opening Marketplace...')}
          className="w-full bg-white/20 backdrop-blur rounded-xl p-3 font-medium flex items-center justify-center gap-2 hover:bg-white/30 transition-colors"
        >
          <ShoppingBag size={16} /> Visit Marketplace
        </button>
      </div>

      {/* Offer List */}
      <div className="p-4 space-y-3 overflow-auto" style={{ maxHeight: '280px' }}>
        {nearbyOffers
          .filter(o => offerFilter === 'all' || o.category === offerFilter)
          .map((offer) => (
          <button
            key={offer.id}
            onClick={() => setSelectedOffer(offer)}
            className="w-full bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow text-left"
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${offer.category === 'gas' ? 'bg-blue-500' : 'bg-orange-500'}`}>
              {offer.category === 'gas' ? <Fuel className="text-white" size={24} /> : <Coffee className="text-white" size={24} />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900">{offer.name}</h3>
                {offer.isTrending && (
                  <span className="text-xs text-red-500 font-medium bg-red-50 px-2 py-0.5 rounded-full">🔥 HOT</span>
                )}
              </div>
              <p className="text-emerald-600 font-medium text-sm">{offer.discount}</p>
              <p className="text-slate-500 text-xs">{offer.distance}</p>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); handleFavoriteToggle(offer.id) }}
              className={`w-10 h-10 rounded-full flex items-center justify-center ${favorites.includes(offer.id) ? 'bg-red-100' : 'bg-slate-100'}`}
            >
              <Heart className={favorites.includes(offer.id) ? 'text-red-500 fill-red-500' : 'text-slate-400'} size={20} />
            </button>
          </button>
        ))}
      </div>
    </div>
  )

  // Engagement Tab
  const renderEngagementTab = () => (
    <div className="h-full bg-gradient-to-b from-slate-100 to-white rounded-3xl overflow-hidden">
      {/* Badge Detail Modal */}
      {selectedBadge && (
        <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm">
            <div className="flex justify-end">
              <button onClick={() => setSelectedBadge(null)} className="p-2 hover:bg-slate-100 rounded-full">
                <X size={24} className="text-slate-600" />
              </button>
            </div>
            <div className={`w-24 h-24 mx-auto rounded-3xl flex items-center justify-center mb-4 ${selectedBadge.achieved ? 'bg-blue-500' : 'bg-slate-200'}`}>
              <Shield className={selectedBadge.achieved ? 'text-white' : 'text-slate-400'} size={48} />
            </div>
            <h3 className="text-xl font-bold text-center text-slate-900">{selectedBadge.name}</h3>
            <p className="text-slate-500 text-center mt-2">{selectedBadge.description}</p>
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">Progress</span>
                <span className="text-blue-500 font-medium">{selectedBadge.progress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3">
                <div className="bg-blue-500 h-3 rounded-full transition-all" style={{ width: `${selectedBadge.progress}%` }} />
              </div>
            </div>
            {!selectedBadge.achieved && (
              <button 
                onClick={() => { toast('Keep driving to unlock!'); setSelectedBadge(null) }}
                className="w-full mt-4 bg-blue-500 text-white py-3 rounded-xl font-medium hover:bg-blue-600"
              >
                View Requirements
              </button>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="p-4 bg-white">
        <div className="flex items-center gap-3 mb-4">
          <Award className="text-emerald-500" size={24} />
          <h1 className="text-xl font-bold text-slate-900">Engagement</h1>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          {(['badges', 'skins', 'reports', 'progress'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setEngagementTab(tab)}
              className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${
                engagementTab === tab ? 'text-slate-900 border-b-2 border-emerald-500' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab === 'reports' ? 'My Reports' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="overflow-auto" style={{ maxHeight: '450px' }}>
        {engagementTab === 'badges' && (
          <>
            {/* Collection Card */}
            <div className="mx-4 mt-4 p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl text-white">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="text-yellow-300" size={20} />
                <p className="text-blue-100 text-xs font-medium tracking-wider">YOUR COLLECTION</p>
              </div>
              <p className="text-4xl font-bold mb-2">
                {userData.badges.earned} <span className="text-lg font-normal text-blue-200">/{userData.badges.total} Badges</span>
              </p>
              <div className="flex items-center justify-between">
                <p className="text-sm text-blue-100">MASTERY LEVEL {userData.masteryLevel}</p>
                <p className="text-sm text-blue-100">{userData.masteryProgress}%</p>
              </div>
              <div className="w-full bg-blue-700 rounded-full h-2 mt-2">
                <div className="bg-emerald-400 h-2 rounded-full" style={{ width: `${userData.masteryProgress}%` }} />
              </div>
            </div>

            {/* Badge Filters */}
            <div className="p-4 flex gap-2">
              {([
                { key: 'all', icon: Grid, label: 'ALL' },
                { key: 'safety', icon: Shield, label: 'SAFETY' },
                { key: 'distance', icon: Target, label: 'DISTANCE' },
                { key: 'community', icon: Users, label: 'COMMUNITY' },
              ] as const).map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => setBadgeFilter(key)}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl transition-all ${
                    badgeFilter === key ? 'bg-blue-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>

            {/* Badges Grid */}
            <div className="px-4 pb-4 grid grid-cols-2 gap-3">
              {badges
                .filter(b => badgeFilter === 'all' || b.category === badgeFilter)
                .map((badge) => (
                <button
                  key={badge.id}
                  onClick={() => setSelectedBadge(badge)}
                  className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-3 relative ${badge.achieved ? 'bg-blue-500' : 'bg-slate-200'}`}>
                    <Shield className={badge.achieved ? 'text-white' : 'text-slate-400'} size={32} />
                    {badge.achieved && (
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                        <Check className="text-white" size={14} />
                      </div>
                    )}
                  </div>
                  <p className="text-center font-bold text-slate-900 text-sm">{badge.name}</p>
                  <p className={`text-center text-xs font-medium ${badge.achieved ? 'text-emerald-500' : 'text-slate-400'}`}>
                    {badge.achieved ? 'ACHIEVED' : `${badge.progress}%`}
                  </p>
                </button>
              ))}
            </div>
          </>
        )}

        {engagementTab === 'skins' && (
          <div className="p-4">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-4 text-white mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Car size={20} />
                <span className="text-xs font-medium tracking-wider">CAR CUSTOMIZATION</span>
              </div>
              <p className="text-2xl font-bold">Premium Skins</p>
              <p className="text-purple-100 text-sm">Personalize your ride</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {carSkins.map((skin) => (
                <button
                  key={skin.id}
                  onClick={() => skin.owned ? handleEquipSkin(skin.id) : handleBuySkin(skin)}
                  className={`bg-white rounded-2xl p-4 border-2 transition-all ${equippedSkin === skin.id ? 'border-emerald-500' : 'border-slate-100 hover:border-slate-300'}`}
                >
                  <div className="w-full aspect-square rounded-xl mb-3" style={{ background: skin.color }} />
                  <p className="font-bold text-slate-900 text-sm">{skin.name}</p>
                  {skin.owned ? (
                    <p className={`text-xs font-medium ${equippedSkin === skin.id ? 'text-emerald-500' : 'text-slate-400'}`}>
                      {equippedSkin === skin.id ? '✓ EQUIPPED' : 'OWNED'}
                    </p>
                  ) : (
                    <p className="text-xs font-medium text-purple-500 flex items-center gap-1">
                      <Gem size={12} /> {skin.price}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {engagementTab === 'reports' && (
          <div className="p-4">
            <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl p-4 text-white mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium tracking-wider text-red-100">TOTAL REPORTS</p>
                  <p className="text-3xl font-bold">{userData.reports}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-red-100">GEMS EARNED</p>
                  <p className="text-xl font-bold flex items-center gap-1"><Gem size={16} /> 2,450</p>
                </div>
              </div>
            </div>
            <button 
              onClick={() => handleReportHazard('new hazard')}
              className="w-full bg-red-500 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 mb-4 hover:bg-red-600"
            >
              <Plus size={20} /> Report New Hazard
            </button>
            <div className="space-y-3">
              {recentReports.map((report) => (
                <div key={report.id} className="bg-white rounded-2xl p-4 border border-slate-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-slate-900 capitalize">{report.type}</p>
                      <p className="text-slate-500 text-sm">{report.location}</p>
                      <p className="text-slate-400 text-xs mt-1">{report.time}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-medium px-2 py-1 rounded-full ${report.status === 'verified' ? 'bg-emerald-100 text-emerald-600' : 'bg-yellow-100 text-yellow-600'}`}>
                        {report.status}
                      </p>
                      <p className="text-emerald-500 font-bold text-sm mt-1">+{report.gems} 💎</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {engagementTab === 'progress' && (
          <div className="p-4">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-4 text-white mb-4">
              <p className="text-xs font-medium tracking-wider text-emerald-100">THIS MONTH</p>
              <p className="text-3xl font-bold">Level {userData.level}</p>
              <div className="mt-2">
                <div className="flex justify-between text-sm mb-1">
                  <span>Next Level</span>
                  <span>2,400 / 3,000 XP</span>
                </div>
                <div className="w-full bg-emerald-700 rounded-full h-2">
                  <div className="bg-white h-2 rounded-full" style={{ width: '80%' }} />
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Total Miles', value: `${userData.miles.toLocaleString()} mi`, progress: 75 },
                { label: 'Safe Trips', value: '156 trips', progress: 90 },
                { label: 'Hazards Reported', value: `${userData.reports} reports`, progress: 60 },
                { label: 'Gems Earned', value: `${userData.gems.toLocaleString()} 💎`, progress: 85 },
              ].map((stat, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 border border-slate-100">
                  <div className="flex justify-between mb-2">
                    <span className="text-slate-600 font-medium">{stat.label}</span>
                    <span className="text-slate-900 font-bold">{stat.value}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${stat.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )

  // Live Tab
  const renderLiveTab = () => (
    <div className="h-full bg-gradient-to-b from-slate-100 to-white rounded-3xl overflow-hidden p-4">
      <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl p-6 text-white text-center mb-4">
        <Users className="mx-auto mb-3" size={48} />
        <h2 className="text-xl font-bold mb-2">Live Community</h2>
        <p className="text-indigo-100">See other drivers and incidents in real-time</p>
      </div>
      <div className="space-y-3">
        {[
          { label: 'Drivers Online', value: '1,247', icon: Car },
          { label: 'Active Hazards', value: '23', icon: AlertTriangle },
          { label: 'Offers Redeemed Today', value: '456', icon: Gift },
        ].map((stat, i) => (
          <button 
            key={i}
            onClick={() => toast(`${stat.label}: ${stat.value}`)}
            className="w-full bg-white rounded-2xl p-4 border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <stat.icon className="text-indigo-500" size={24} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-slate-500 text-sm">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
            <ChevronRight className="text-slate-400" size={20} />
          </button>
        ))}
      </div>
      <div className="mt-4 bg-indigo-50 rounded-2xl p-4 text-center">
        <p className="text-indigo-600 font-medium">🚀 Full Live Map Coming Soon!</p>
        <p className="text-indigo-400 text-sm mt-1">Real-time driver positions & hazard alerts</p>
      </div>
    </div>
  )

  // Profile Tab
  const renderProfileTab = () => (
    <div className="h-full bg-gradient-to-b from-blue-50 via-white to-white rounded-3xl overflow-hidden">
      {profileSubTab === 'overview' ? (
        <div className="p-4 overflow-auto" style={{ maxHeight: '600px' }}>
          {/* Avatar Section */}
          <div className="flex flex-col items-center pb-4">
            <div className="relative mb-4">
              <div className="w-24 h-24 bg-white rounded-3xl border-4 border-blue-500 flex items-center justify-center shadow-lg">
                <span className="text-3xl font-bold text-blue-500">{userData.avatar}</span>
              </div>
              <button 
                onClick={() => toast('Change profile photo')}
                className="absolute -top-1 -right-1 w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center hover:bg-blue-600"
              >
                <Camera className="text-white" size={16} />
              </button>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                <Trophy size={12} /> #{userData.rank}
              </div>
            </div>

            <h1 className="text-xl font-bold text-slate-900">{userData.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-slate-500">{userData.username}</span>
              {userData.isPremium && (
                <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
                  <Zap size={12} /> PREMIUM
                </span>
              )}
            </div>

            <button 
              onClick={handleShareProfile}
              className="mt-3 flex items-center gap-2 text-blue-500 border border-blue-200 rounded-full px-4 py-2 hover:bg-blue-50"
            >
              <Share2 size={16} /> Share Profile
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              { value: '12.4K', label: 'GEMS', icon: '💎', color: 'text-emerald-500', action: () => setActiveTab('offers') },
              { value: '42', label: 'LEVEL', icon: '🏆', color: 'text-blue-500', action: () => { setActiveTab('engagement'); setEngagementTab('progress') } },
              { value: '148', label: 'REPORTS', icon: '📷', color: 'text-red-500', action: () => { setActiveTab('engagement'); setEngagementTab('reports') } },
              { value: '2.8K', label: 'MILES', icon: '🚗', color: 'text-purple-500', action: () => { setActiveTab('engagement'); setEngagementTab('progress') } },
            ].map((stat, i) => (
              <button 
                key={i}
                onClick={stat.action}
                className="bg-white rounded-2xl p-3 text-center shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
              >
                <span className="text-lg">{stat.icon}</span>
                <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-slate-400">{stat.label}</p>
              </button>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="space-y-2">
            <button 
              onClick={() => { setActiveTab('engagement'); setEngagementTab('badges') }}
              className="w-full bg-white rounded-2xl p-4 flex items-center gap-4 border border-slate-100 shadow-sm hover:shadow-md"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Trophy className="text-blue-500" size={24} />
              </div>
              <div className="flex-1 text-left">
                <p className="font-bold text-slate-900">Recent Achievements</p>
                <p className="text-sm text-slate-500">{userData.badges.earned} of {userData.badges.total} badges</p>
              </div>
              <ChevronRight className="text-slate-400" size={20} />
            </button>
            <button 
              onClick={() => setProfileSubTab('settings')}
              className="w-full bg-white rounded-2xl p-4 flex items-center gap-4 border border-slate-100 shadow-sm hover:shadow-md"
            >
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                <Settings className="text-slate-600" size={24} />
              </div>
              <div className="flex-1 text-left">
                <p className="font-bold text-slate-900">Settings</p>
                <p className="text-sm text-slate-500">Account, privacy, notifications</p>
              </div>
              <ChevronRight className="text-slate-400" size={20} />
            </button>
          </div>
        </div>
      ) : (
        /* Settings View */
        <div className="p-4 overflow-auto" style={{ maxHeight: '600px' }}>
          <button onClick={() => setProfileSubTab('overview')} className="mb-4 text-slate-600 flex items-center gap-2 hover:text-slate-900">
            <ChevronRight className="rotate-180" size={20} /> Back to Profile
          </button>

          <div className="mb-6">
            <p className="text-blue-500 text-xs font-medium tracking-wider mb-3 flex items-center gap-2">
              <span className="w-8 h-0.5 bg-blue-500" /> ACCOUNT
            </p>
            <div className="space-y-2">
              {[
                { icon: User, title: 'Account Information', desc: 'Personal details, email, phone' },
                { icon: CreditCard, title: 'Subscription & Billing', desc: 'Premium Plan active' },
                { icon: Shield, title: 'Privacy Center', desc: 'Data control & tracking' },
                { icon: Bell, title: 'Notifications', desc: 'Push, email, SMS preferences' },
              ].map((item, i) => (
                <button 
                  key={i}
                  onClick={() => toast(`Opening ${item.title}...`)}
                  className="w-full bg-white rounded-2xl p-4 flex items-center gap-4 border border-slate-100 shadow-sm hover:shadow-md"
                >
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                    <item.icon className="text-blue-500" size={24} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-bold text-slate-900">{item.title}</p>
                    <p className="text-sm text-slate-500">{item.desc}</p>
                  </div>
                  <ChevronRight className="text-slate-400" size={20} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-blue-500 text-xs font-medium tracking-wider mb-3 flex items-center gap-2">
              <span className="w-8 h-0.5 bg-blue-500" /> EXPERIENCE
            </p>
            <div className="space-y-2">
              {[
                { icon: Trophy, title: 'Leaderboard', desc: `Your rank: #${userData.globalRank.toLocaleString()}` },
                { icon: Navigation, title: 'Navigation Settings', desc: 'Voice, routes, preferences' },
                { icon: Car, title: 'Vehicle Profile', desc: 'Car details & fuel type' },
              ].map((item, i) => (
                <button 
                  key={i}
                  onClick={() => toast(`Opening ${item.title}...`)}
                  className="w-full bg-white rounded-2xl p-4 flex items-center gap-4 border border-slate-100 shadow-sm hover:shadow-md"
                >
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                    <item.icon className="text-blue-500" size={24} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-bold text-slate-900">{item.title}</p>
                    <p className="text-sm text-slate-500">{item.desc}</p>
                  </div>
                  <ChevronRight className="text-slate-400" size={20} />
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={() => { toast.success('Logged out'); navigate('/login') }}
            className="w-full mt-6 bg-red-50 text-red-500 py-3 rounded-xl font-medium hover:bg-red-100"
          >
            Log Out
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/assets/logo.png"
            alt="SnapRoad"
            className="h-6"
          />
          <span className="text-white font-medium text-sm">Driver Dashboard</span>
        </div>
        <button onClick={() => navigate('/login')} className="text-slate-400 hover:text-white text-sm">
          Exit Preview
        </button>
      </header>

      {/* Phone Frame */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-black rounded-[3rem] p-3 shadow-2xl relative">
          <div className="bg-black h-6 flex items-center justify-center mb-1">
            <div className="w-24 h-5 bg-black rounded-full" />
          </div>
          
          <div className="h-[600px] overflow-hidden relative">
            {activeTab === 'map' && renderMapTab()}
            {activeTab === 'offers' && renderOffersTab()}
            {activeTab === 'engagement' && renderEngagementTab()}
            {activeTab === 'live' && renderLiveTab()}
            {activeTab === 'profile' && renderProfileTab()}
          </div>

          {/* Bottom Navigation */}
          <div className="bg-white rounded-b-[2.5rem] px-4 py-3">
            <div className="flex justify-around">
              {([
                { key: 'map', icon: MapPin, label: 'Map' },
                { key: 'offers', icon: Gift, label: 'Offers' },
                { key: 'engagement', icon: Trophy, label: 'Engage' },
                { key: 'live', icon: Users, label: 'Live' },
                { key: 'profile', icon: User, label: 'Profile' },
              ] as const).map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => { setActiveTab(key); if (key !== 'profile') setProfileSubTab('overview') }}
                  className={`flex flex-col items-center gap-1 transition-colors ${activeTab === key ? 'text-blue-500' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <div className={`p-2 rounded-full transition-colors ${activeTab === key ? 'bg-blue-100' : ''}`}>
                    <Icon size={20} />
                  </div>
                  <span className="text-xs">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
