import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Map,
  Gift,
  Trophy,
  User,
  Search,
  Home,
  Briefcase,
  Bell,
  Menu,
  Mic,
  Volume2,
  AlertTriangle,
  Navigation,
  ChevronRight,
  ChevronDown,
  Camera,
  Share2,
  Shield,
  Target,
  Users,
  Settings,
  CreditCard,
  MapPin,
  Zap,
  Award,
  Gem,
  TrendingUp,
  Filter,
  Grid,
  Heart
} from 'lucide-react'

type TabType = 'map' | 'offers' | 'engagement' | 'live' | 'profile'

export default function UserDashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabType>('map')
  const [profileSubTab, setProfileSubTab] = useState<'overview' | 'settings'>('overview')
  const [engagementTab, setEngagementTab] = useState<'badges' | 'skins' | 'reports' | 'progress'>('badges')
  const [badgeFilter, setBadgeFilter] = useState<'all' | 'safety' | 'distance' | 'community'>('all')
  const [offerFilter, setOfferFilter] = useState<'all' | 'gas' | 'cafe'>('all')

  // Mock data
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
    { id: 1, name: 'Gas Station #1', category: 'gas', gems: 50, isTrending: true, distance: '0.5 mi' },
    { id: 2, name: 'Downtown Coffee', category: 'cafe', gems: 30, isTrending: false, distance: '0.8 mi' },
    { id: 3, name: 'Quick Mart', category: 'gas', gems: 45, isTrending: true, distance: '1.2 mi' },
  ]

  const badges = [
    { id: 1, name: 'Safe Driver I', category: 'safety', achieved: true },
    { id: 2, name: 'Safe Driver II', category: 'safety', achieved: true },
    { id: 3, name: 'Road Explorer', category: 'distance', achieved: true },
    { id: 4, name: 'Community Helper', category: 'community', achieved: false },
    { id: 5, name: 'Night Owl', category: 'distance', achieved: true },
    { id: 6, name: 'Weekend Warrior', category: 'community', achieved: false },
  ]

  const renderMapTab = () => (
    <div className="relative h-full bg-slate-800 rounded-3xl overflow-hidden">
      {/* Map Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-700 to-slate-900 opacity-90">
        <div className="absolute inset-0" style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%234a5568" fill-opacity="0.15"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
        }} />
      </div>

      {/* Top Bar */}
      <div className="relative z-10 p-4">
        <div className="flex items-center gap-3">
          <button className="w-12 h-12 bg-slate-800/90 rounded-full flex items-center justify-center">
            <Menu className="text-white" size={20} />
          </button>
          <div className="flex-1 bg-slate-800/90 rounded-full px-4 py-3 flex items-center gap-3">
            <Search className="text-slate-400" size={20} />
            <span className="text-slate-400">Where to?</span>
          </div>
          <button className="w-12 h-12 bg-slate-800/90 rounded-full flex items-center justify-center relative">
            <Bell className="text-green-400" size={20} />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">×</span>
            </span>
          </button>
        </div>

        {/* Favorites & Offers Toggle */}
        <div className="flex gap-2 mt-4">
          <button className="flex-1 bg-blue-500 text-white rounded-full py-3 px-4 flex items-center justify-center gap-2 font-medium">
            Favorites <ChevronDown size={16} />
          </button>
          <button className="flex-1 bg-slate-800/90 text-white rounded-full py-3 px-4 flex items-center justify-center gap-2">
            Offers Nearby <ChevronDown size={16} />
          </button>
        </div>

        {/* Quick Locations */}
        <div className="flex gap-2 mt-3">
          <button className="bg-slate-800/90 rounded-full py-2 px-4 flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center">
              <Home className="text-emerald-400" size={16} />
            </div>
            <span className="text-white">Home</span>
          </button>
          <button className="bg-slate-800/90 rounded-full py-2 px-4 flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center">
              <Briefcase className="text-slate-300" size={16} />
            </div>
            <span className="text-white">Work</span>
          </button>
          <button className="w-12 h-12 bg-slate-800/90 rounded-full flex items-center justify-center">
            <Gem className="text-emerald-400" size={20} />
          </button>
        </div>
      </div>

      {/* Score Widget */}
      <div className="absolute left-4 top-56 bg-slate-800/95 rounded-2xl p-4 w-36 backdrop-blur-sm border border-slate-700">
        <div className="flex justify-between mb-2">
          <button className="text-slate-400">
            <Grid size={16} />
          </button>
          <button className="text-slate-400">×</button>
        </div>
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
        <button className="w-full bg-blue-500 text-white text-xs font-medium py-2 rounded-full">
          DETAILS {'>'}
        </button>
        <p className="text-center text-slate-400 text-xs mt-2">SCORE</p>
      </div>

      {/* ECO Widget */}
      <div className="absolute left-4 bottom-32 bg-slate-800/95 rounded-2xl p-4 w-36 backdrop-blur-sm border border-slate-700">
        <div className="flex justify-between mb-2">
          <button className="text-slate-400">
            <Grid size={16} />
          </button>
          <button className="text-slate-400">×</button>
        </div>
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
        <button className="w-full bg-blue-500 text-white text-xs font-medium py-2 rounded-full">
          DETAILS {'>'}
        </button>
        <p className="text-center text-slate-400 text-xs mt-2">ECO</p>
      </div>

      {/* Map Markers */}
      <div className="absolute right-24 top-72">
        <div className="relative">
          <div className="w-10 h-10 bg-emerald-400 rotate-45 rounded-lg" />
          <span className="absolute -top-1 -right-1 bg-yellow-500 text-xs font-bold px-1.5 py-0.5 rounded-full">8</span>
        </div>
      </div>
      <div className="absolute right-32 bottom-48">
        <div className="relative">
          <div className="w-10 h-10 bg-emerald-400 rotate-45 rounded-lg" />
          <span className="absolute -top-1 -right-1 bg-yellow-500 text-xs font-bold px-1.5 py-0.5 rounded-full">17</span>
        </div>
      </div>
      <div className="absolute right-16 bottom-36">
        <div className="relative">
          <div className="w-10 h-10 bg-emerald-400 rotate-45 rounded-lg" />
          <span className="absolute -top-1 -right-1 bg-yellow-500 text-xs font-bold px-1.5 py-0.5 rounded-full">16</span>
        </div>
      </div>

      {/* Hazard Marker */}
      <div className="absolute right-8 bottom-52">
        <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
          <AlertTriangle className="text-white" size={24} />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="absolute right-4 top-72 flex flex-col gap-3">
        <button className="w-14 h-14 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
          <Mic className="text-white" size={24} />
        </button>
        <button className="w-14 h-14 bg-slate-800 rounded-full flex items-center justify-center border border-slate-600">
          <Volume2 className="text-white" size={24} />
        </button>
      </div>

      {/* Navigation Button */}
      <div className="absolute right-4 bottom-36">
        <button className="w-14 h-14 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
          <Navigation className="text-white" size={24} />
        </button>
      </div>

      {/* Expired Tags */}
      <div className="absolute right-4 top-44 bg-red-600 text-white text-xs px-2 py-1 rounded">EXPIRED</div>
      <div className="absolute right-24 top-48 bg-red-600 text-white text-xs px-2 py-1 rounded">EXPIRED</div>
    </div>
  )

  const renderOffersTab = () => (
    <div className="h-full bg-gradient-to-b from-slate-100 to-white rounded-3xl overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
              <ChevronRight className="text-slate-600 rotate-180" size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Offers Nearby</h1>
              <p className="text-blue-500 text-sm font-medium">8 ACTIVE DEALS</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
              <Grid className="text-slate-600" size={20} />
            </button>
            <button className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
              <Filter className="text-slate-600" size={20} />
            </button>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex gap-2">
          {['all', 'gas', 'cafe'].map((filter) => (
            <button
              key={filter}
              onClick={() => setOfferFilter(filter as any)}
              className={`px-4 py-2 rounded-full flex items-center gap-2 border transition-all ${
                offerFilter === filter
                  ? 'bg-white border-slate-300 shadow-sm'
                  : 'bg-transparent border-slate-200'
              }`}
            >
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                filter === 'all' ? 'bg-slate-800' : filter === 'gas' ? 'bg-blue-100' : 'bg-orange-100'
              }`}>
                {filter === 'all' && <Grid className="text-white" size={14} />}
                {filter === 'gas' && <span className="text-blue-500">💧</span>}
                {filter === 'cafe' && <span className="text-orange-500">☕</span>}
              </div>
              <span className="capitalize text-slate-700 font-medium">{filter === 'all' ? 'All' : filter === 'gas' ? 'Gas' : 'Cafe'}</span>
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
            <p className="text-4xl font-bold">${userData.potentialSavings.toFixed(2)} <span className="text-lg font-normal">today</span></p>
          </div>
          <div className="bg-white/20 backdrop-blur rounded-xl p-3">
            <p className="text-xs text-blue-100">MY WALLET</p>
            <p className="flex items-center gap-1 font-bold">
              <Gem size={14} /> {userData.wallet.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 bg-white/20 backdrop-blur rounded-xl p-3">
            <p className="text-xs text-blue-100">TOP REWARD</p>
            <p className="flex items-center gap-1 font-bold">
              <TrendingUp size={14} /> +{userData.topReward} 💎
            </p>
          </div>
          <button className="bg-white/30 backdrop-blur rounded-xl px-4 py-3 font-medium flex items-center gap-2">
            <Zap size={16} /> Marketplace
          </button>
        </div>
      </div>

      {/* Recommended Offers */}
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-900">Recommended for You</h2>
          <button className="text-blue-500 text-sm flex items-center gap-1">
            SORT BY: Distance <ChevronDown size={14} />
          </button>
        </div>

        <div className="space-y-3">
          {nearbyOffers.map((offer) => (
            <div key={offer.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                offer.category === 'gas' ? 'bg-blue-500' : 'bg-orange-500'
              }`}>
                {offer.category === 'gas' ? (
                  <span className="text-2xl">💧</span>
                ) : (
                  <span className="text-2xl">☕</span>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900">{offer.name}</h3>
                  {offer.isTrending && (
                    <span className="text-xs text-red-500 font-medium flex items-center gap-1">
                      📈 TRENDING
                    </span>
                  )}
                </div>
                <p className="text-slate-500 text-sm">{offer.distance}</p>
              </div>
              <button className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                <Heart className="text-slate-400" size={20} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderEngagementTab = () => (
    <div className="h-full bg-gradient-to-b from-slate-100 to-white rounded-3xl overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-white">
        <div className="flex items-center gap-3 mb-4">
          <button className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
            <ChevronRight className="text-slate-600 rotate-180" size={20} />
          </button>
          <Award className="text-emerald-500" size={24} />
          <h1 className="text-xl font-bold text-slate-900">Engagement</h1>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          {['badges', 'skins', 'reports', 'progress'].map((tab) => (
            <button
              key={tab}
              onClick={() => setEngagementTab(tab as any)}
              className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${
                engagementTab === tab
                  ? 'text-slate-900 border-b-2 border-emerald-500'
                  : 'text-slate-400'
              }`}
            >
              {tab === 'reports' ? 'My Reports' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Collection Card */}
      <div className="mx-4 mt-4 p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl text-white">
        <div className="flex items-center gap-2 mb-2">
          <Award className="text-emerald-300" size={20} />
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
        {[
          { key: 'all', icon: Grid, label: 'ALL' },
          { key: 'safety', icon: Shield, label: 'SAFETY' },
          { key: 'distance', icon: Target, label: 'DISTANCE' },
          { key: 'community', icon: Users, label: 'COMMUNITY' },
        ].map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setBadgeFilter(key as any)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl transition-all ${
              badgeFilter === key
                ? 'bg-blue-500 text-white'
                : 'bg-white text-slate-600 border border-slate-200'
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
          <div key={badge.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-3 ${
              badge.achieved ? 'bg-blue-500' : 'bg-slate-200'
            }`}>
              <Shield className={badge.achieved ? 'text-white' : 'text-slate-400'} size={32} />
              {badge.achieved && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </span>
              )}
            </div>
            <p className="text-center font-bold text-slate-900">{badge.name}</p>
            <p className={`text-center text-xs font-medium ${
              badge.achieved ? 'text-emerald-500' : 'text-slate-400'
            }`}>
              {badge.achieved ? 'ACHIEVED' : 'LOCKED'}
            </p>
          </div>
        ))}
      </div>
    </div>
  )

  const renderProfileTab = () => (
    <div className="h-full bg-gradient-to-b from-blue-50 via-white to-white rounded-3xl overflow-hidden">
      {profileSubTab === 'overview' ? (
        <>
          {/* Close Button */}
          <div className="flex justify-end p-4">
            <button className="text-slate-400">×</button>
          </div>

          {/* Avatar */}
          <div className="flex flex-col items-center px-4 pb-6">
            <div className="relative mb-4">
              <div className="w-28 h-28 bg-white rounded-3xl border-4 border-blue-500 flex items-center justify-center shadow-lg">
                <span className="text-4xl font-bold text-blue-500">{userData.avatar}</span>
              </div>
              <button className="absolute -top-2 -right-2 w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <Camera className="text-white" size={16} />
              </button>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                <Trophy size={12} /> {userData.rank}
              </div>
            </div>

            <h1 className="text-2xl font-bold text-slate-900">{userData.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-slate-500">{userData.username}</span>
              <span className="text-slate-300">•</span>
              {userData.isPremium && (
                <span className="bg-blue-100 text-blue-600 text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
                  <Zap size={12} /> PREMIUM
                </span>
              )}
            </div>

            <button className="mt-4 flex items-center gap-2 text-blue-500 border border-blue-200 rounded-full px-4 py-2">
              <Share2 size={16} /> Share Profile
            </button>

            {/* Stats */}
            <div className="w-full grid grid-cols-4 gap-2 mt-6">
              {[
                { value: '12.4K', label: 'GEMS', icon: '💎', color: 'text-emerald-500' },
                { value: '42', label: 'LEVEL', icon: '🏆', color: 'text-blue-500' },
                { value: '148', label: 'REPORTS', icon: '📷', color: 'text-blue-500' },
                { value: '2.8K', label: 'MILES', icon: '✈️', color: 'text-purple-500' },
              ].map((stat, i) => (
                <div key={i} className="bg-white rounded-2xl p-3 text-center shadow-sm border border-slate-100">
                  <span className="text-lg">{stat.icon}</span>
                  <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-slate-400">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Recent Achievements */}
            <div className="w-full mt-6">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h2 className="font-bold text-slate-900">Recent Achievements</h2>
                  <p className="text-sm text-slate-500">{userData.badges.earned} of {userData.badges.total} badges unlocked</p>
                </div>
                <button className="text-blue-500 text-sm flex items-center gap-1">
                  View All <ChevronRight size={14} />
                </button>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`flex-1 h-20 rounded-2xl ${
                    i === 1 ? 'bg-blue-500' : i === 2 ? 'bg-red-400' : 'bg-gradient-to-br from-emerald-400 to-blue-500'
                  }`} />
                ))}
              </div>
            </div>

            <button 
              onClick={() => setProfileSubTab('settings')}
              className="mt-6 text-blue-500 flex items-center gap-2"
            >
              <Settings size={16} /> View Settings
            </button>
          </div>
        </>
      ) : (
        /* Settings View */
        <div className="p-4">
          <button 
            onClick={() => setProfileSubTab('overview')}
            className="mb-4 text-slate-600 flex items-center gap-2"
          >
            <ChevronRight className="rotate-180" size={20} /> Back
          </button>

          <div className="mb-6">
            <p className="text-blue-500 text-xs font-medium tracking-wider mb-3 flex items-center gap-2">
              <span className="w-8 h-0.5 bg-blue-500" /> MANAGEMENT
            </p>
            <div className="space-y-2">
              {[
                { icon: User, title: 'Account Information', desc: 'Personal details, priva...' },
                { icon: CreditCard, title: 'Subscription & Billing', desc: 'Premium Plan active u...' },
                { icon: Shield, title: 'Privacy Center', desc: 'Data control & trackin...' },
                { icon: Bell, title: 'Notification Settings', desc: 'Alerts, push & email pr...' },
              ].map((item, i) => (
                <button key={i} className="w-full bg-white rounded-2xl p-4 flex items-center gap-4 border border-slate-100 shadow-sm">
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
                { icon: Trophy, title: 'Mastery & Leaderboard', desc: `Your global rank: #${userData.globalRank.toLocaleString()}` },
                { icon: Navigation, title: 'Manual Reroute', desc: 'Navigation preferences' },
              ].map((item, i) => (
                <button key={i} className="w-full bg-white rounded-2xl p-4 flex items-center gap-4 border border-slate-100 shadow-sm">
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
        </div>
      )}
    </div>
  )

  const renderLiveTab = () => (
    <div className="h-full bg-gradient-to-b from-slate-100 to-white rounded-3xl overflow-hidden flex items-center justify-center">
      <div className="text-center">
        <Users className="text-blue-500 mx-auto mb-4" size={48} />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Live Community</h2>
        <p className="text-slate-500">See other drivers and incidents in real-time</p>
        <p className="text-blue-500 text-sm mt-4">Coming Soon</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="https://customer-assets.emergentagent.com/job_navigate-app-1/artifacts/nn7pu72r_BiggerLogoSR.png"
            alt="SnapRoad"
            className="h-6"
          />
          <span className="text-white font-medium text-sm">Mobile Preview</span>
        </div>
        <button 
          onClick={() => navigate('/login')}
          className="text-slate-400 hover:text-white text-sm"
        >
          Exit Preview
        </button>
      </header>

      {/* Phone Frame */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-black rounded-[3rem] p-3 shadow-2xl">
          {/* Notch */}
          <div className="bg-black h-6 flex items-center justify-center mb-1">
            <div className="w-24 h-5 bg-black rounded-full" />
          </div>
          
          {/* Screen Content */}
          <div className="h-[600px] overflow-hidden">
            {activeTab === 'map' && renderMapTab()}
            {activeTab === 'offers' && renderOffersTab()}
            {activeTab === 'engagement' && renderEngagementTab()}
            {activeTab === 'live' && renderLiveTab()}
            {activeTab === 'profile' && renderProfileTab()}
          </div>

          {/* Bottom Navigation */}
          <div className="bg-white rounded-b-[2.5rem] px-4 py-3">
            <div className="flex justify-around">
              {[
                { key: 'map', icon: MapPin, label: 'Map' },
                { key: 'offers', icon: Gift, label: 'Offers' },
                { key: 'engagement', icon: Trophy, label: 'Engagement' },
                { key: 'live', icon: Users, label: 'Live' },
                { key: 'profile', icon: User, label: 'Profile' },
              ].map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as TabType)}
                  className={`flex flex-col items-center gap-1 ${
                    activeTab === key ? 'text-blue-500' : 'text-slate-400'
                  }`}
                >
                  <div className={`p-2 rounded-full ${activeTab === key ? 'bg-blue-100' : ''}`}>
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
