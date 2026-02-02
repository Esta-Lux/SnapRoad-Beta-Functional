import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MapPin, Gift, Trophy, User, Search, Home, Briefcase, Bell, Menu, Mic, Volume2,
  AlertTriangle, Navigation, ChevronRight, ChevronDown, Shield, Target, Users,
  Settings, CreditCard, Camera, Share2, Gem, TrendingUp, Filter, Grid, Heart, Zap, Award
} from 'lucide-react'
import { GradientButton } from '../../components/ui/GradientButton'
import { Badge } from '../../components/ui/Badge'
import { CarSkinShowcase } from '../../components/features/CarSkinShowcase'

type TabType = 'map' | 'offers' | 'engagement' | 'live' | 'profile'
type EngagementSubTab = 'badges' | 'skins' | 'reports' | 'progress'
type BadgeCategory = 'all' | 'safety' | 'distance' | 'community'

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

export default function UserDashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabType>('map')
  const [profileSubTab, setProfileSubTab] = useState<'overview' | 'settings'>('overview')
  const [engagementTab, setEngagementTab] = useState<EngagementSubTab>('badges')
  const [badgeFilter, setBadgeFilter] = useState<BadgeCategory>('all')
  const [offerFilter, setOfferFilter] = useState<'all' | 'gas' | 'cafe'>('all')
  const [showCarStudio, setShowCarStudio] = useState(false)

  // If Car Studio is open, render it fullscreen
  if (showCarStudio) {
    return <CarSkinShowcase onBack={() => setShowCarStudio(false)} onPreview={() => { setShowCarStudio(false); setActiveTab('map') }} />
  }

  const renderMapTab = () => (
    <div className="relative h-full bg-slate-800 rounded-3xl overflow-hidden" data-testid="map-tab">
      {/* Map Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-700 to-slate-900 opacity-90">
        <div className="absolute inset-0" style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%234a5568\' fill-opacity=\'0.15\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
        }} />
      </div>

      {/* Top Bar */}
      <div className="relative z-10 p-4">
        <div className="flex items-center gap-3">
          <button className="w-12 h-12 bg-slate-800/90 rounded-full flex items-center justify-center" data-testid="menu-btn">
            <Menu className="text-white" size={20} />
          </button>
          <div className="flex-1 bg-slate-800/90 rounded-full px-4 py-3 flex items-center gap-3">
            <Search className="text-slate-400" size={20} />
            <span className="text-slate-400">Where to?</span>
          </div>
          <button className="w-12 h-12 bg-slate-800/90 rounded-full flex items-center justify-center relative" data-testid="notifications-btn">
            <Bell className="text-green-400" size={20} />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">3</span>
          </button>
        </div>

        {/* Quick Actions */}
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
      <ScoreWidget value={userData.score} label="SCORE" color="#3b82f6" />
      
      {/* ECO Widget */}
      <div className="absolute left-4 bottom-32 bg-slate-800/95 rounded-2xl p-4 w-36 backdrop-blur-sm border border-slate-700">
        <CircularProgress value={userData.eco} max={20} color="#22c55e" label="%" sublabel="ECO" />
      </div>

      {/* Map Markers */}
      <div className="absolute right-24 top-72">
        <MapMarker count={8} />
      </div>
      <div className="absolute right-32 bottom-48">
        <MapMarker count={17} />
      </div>

      {/* Hazard Marker */}
      <div className="absolute right-8 bottom-52">
        <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
          <AlertTriangle className="text-white" size={24} />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="absolute right-4 top-72 flex flex-col gap-3">
        <button className="w-14 h-14 bg-blue-500 rounded-full flex items-center justify-center shadow-lg" data-testid="voice-btn">
          <Mic className="text-white" size={24} />
        </button>
        <button className="w-14 h-14 bg-slate-800 rounded-full flex items-center justify-center border border-slate-600">
          <Volume2 className="text-white" size={24} />
        </button>
      </div>

      {/* Navigation Button */}
      <div className="absolute right-4 bottom-36">
        <button className="w-14 h-14 bg-blue-500 rounded-full flex items-center justify-center shadow-lg" data-testid="navigation-btn">
          <Navigation className="text-white" size={24} />
        </button>
      </div>
    </div>
  )

  const renderOffersTab = () => (
    <div className="h-full bg-gradient-to-b from-slate-100 to-white rounded-3xl overflow-hidden" data-testid="offers-tab">
      {/* Header */}
      <div className="p-4 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Offers Nearby</h1>
              <p className="text-blue-500 text-sm font-medium">{nearbyOffers.length} ACTIVE DEALS</p>
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
          {(['all', 'gas', 'cafe'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setOfferFilter(filter)}
              className={`px-4 py-2 rounded-full flex items-center gap-2 border transition-all ${
                offerFilter === filter ? 'bg-white border-slate-300 shadow-sm' : 'bg-transparent border-slate-200'
              }`}
              data-testid={`filter-${filter}`}
            >
              <span className="capitalize text-slate-700 font-medium">
                {filter === 'all' ? 'All' : filter === 'gas' ? '⛽ Gas' : '☕ Cafe'}
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
          <div className="bg-white/20 backdrop-blur rounded-xl p-3">
            <p className="text-xs text-blue-100">MY WALLET</p>
            <p className="flex items-center gap-1 font-bold"><Gem size={14} /> {userData.wallet.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Offer List */}
      <div className="p-4 space-y-3">
        {nearbyOffers
          .filter(o => offerFilter === 'all' || o.category === offerFilter)
          .map((offer) => (
          <div key={offer.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-4" data-testid={`offer-${offer.id}`}>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${offer.category === 'gas' ? 'bg-blue-500' : 'bg-orange-500'}`}>
              <span className="text-2xl">{offer.category === 'gas' ? '⛽' : '☕'}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900">{offer.name}</h3>
                {offer.isTrending && <Badge variant="danger">📈 TRENDING</Badge>}
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
  )

  const renderEngagementTab = () => (
    <div className="h-full bg-gradient-to-b from-slate-100 to-white rounded-3xl overflow-hidden" data-testid="engagement-tab">
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
              onClick={() => {
                if (tab === 'skins') {
                  setShowCarStudio(true)
                } else {
                  setEngagementTab(tab)
                }
              }}
              className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${
                engagementTab === tab ? 'text-slate-900 border-b-2 border-emerald-500' : 'text-slate-400'
              }`}
              data-testid={`tab-${tab}`}
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
          <div className="bg-emerald-400 h-2 rounded-full transition-all" style={{ width: `${userData.masteryProgress}%` }} />
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
              badgeFilter === key ? 'bg-blue-500 text-white' : 'bg-white text-slate-600 border border-slate-200'
            }`}
            data-testid={`badge-filter-${key}`}
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
          <div key={badge.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm relative" data-testid={`badge-${badge.id}`}>
            <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-3 ${badge.achieved ? 'bg-blue-500' : 'bg-slate-200'}`}>
              <Shield className={badge.achieved ? 'text-white' : 'text-slate-400'} size={32} />
            </div>
            <p className="text-center font-bold text-slate-900">{badge.name}</p>
            <p className={`text-center text-xs font-medium ${badge.achieved ? 'text-emerald-500' : 'text-slate-400'}`}>
              {badge.achieved ? 'ACHIEVED' : 'LOCKED'}
            </p>
          </div>
        ))}
      </div>
    </div>
  )

  const renderLiveTab = () => (
    <div className="h-full bg-gradient-to-b from-slate-100 to-white rounded-3xl overflow-hidden flex items-center justify-center" data-testid="live-tab">
      <div className="text-center">
        <Users className="text-blue-500 mx-auto mb-4" size={48} />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Live Community</h2>
        <p className="text-slate-500">See other drivers and incidents in real-time</p>
        <Badge variant="default" className="mt-4">Coming Soon</Badge>
      </div>
    </div>
  )

  const renderProfileTab = () => (
    <div className="h-full bg-gradient-to-b from-blue-50 via-white to-white rounded-3xl overflow-hidden" data-testid="profile-tab">
      {profileSubTab === 'overview' ? (
        <>
          {/* Avatar Section */}
          <div className="flex flex-col items-center px-4 pt-6 pb-6">
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
              {userData.isPremium && <Badge variant="premium"><Zap size={12} /> PREMIUM</Badge>}
            </div>

            <button className="mt-4 flex items-center gap-2 text-blue-500 border border-blue-200 rounded-full px-4 py-2" data-testid="share-profile-btn">
              <Share2 size={16} /> Share Profile
            </button>

            {/* Stats Grid */}
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

            <button onClick={() => setProfileSubTab('settings')} className="mt-6 text-blue-500 flex items-center gap-2" data-testid="view-settings-btn">
              <Settings size={16} /> View Settings
            </button>
          </div>
        </>
      ) : (
        <div className="p-4">
          <button onClick={() => setProfileSubTab('overview')} className="mb-4 text-slate-600 flex items-center gap-2" data-testid="back-to-profile-btn">
            <ChevronRight className="rotate-180" size={20} /> Back
          </button>

          <SettingsSection title="MANAGEMENT" items={[
            { icon: User, title: 'Account Information', desc: 'Personal details, privacy...' },
            { icon: CreditCard, title: 'Subscription & Billing', desc: 'Premium Plan active...' },
            { icon: Shield, title: 'Privacy Center', desc: 'Data control & tracking...' },
            { icon: Bell, title: 'Notification Settings', desc: 'Alerts, push & email...' },
          ]} />

          <SettingsSection title="EXPERIENCE" items={[
            { icon: Trophy, title: 'Mastery & Leaderboard', desc: `Your global rank: #${userData.globalRank.toLocaleString()}` },
            { icon: Navigation, title: 'Manual Reroute', desc: 'Navigation preferences' },
          ]} />
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col" data-testid="driver-dashboard">
      {/* Header */}
      <header className="bg-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="https://customer-assets.emergentagent.com/job_navigate-app-1/artifacts/nn7pu72r_BiggerLogoSR.png"
            alt="SnapRoad"
            className="h-6"
          />
          <span className="text-white font-medium text-sm">Driver Dashboard</span>
        </div>
        <button onClick={() => navigate('/login')} className="text-slate-400 hover:text-white text-sm" data-testid="exit-preview-btn">
          Exit Preview
        </button>
      </header>

      {/* Phone Frame */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-black rounded-[3rem] p-3 shadow-2xl">
          <div className="bg-black h-6 flex items-center justify-center mb-1">
            <div className="w-24 h-5 bg-black rounded-full" />
          </div>
          
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
              {([
                { key: 'map', icon: MapPin, label: 'Map' },
                { key: 'offers', icon: Gift, label: 'Offers' },
                { key: 'engagement', icon: Trophy, label: 'Engagement' },
                { key: 'live', icon: Users, label: 'Live' },
                { key: 'profile', icon: User, label: 'Profile' },
              ] as const).map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex flex-col items-center gap-1 ${activeTab === key ? 'text-blue-500' : 'text-slate-400'}`}
                  data-testid={`nav-${key}`}
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

// Helper Components
function ScoreWidget({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="absolute left-4 top-56 bg-slate-800/95 rounded-2xl p-4 w-36 backdrop-blur-sm border border-slate-700">
      <CircularProgress value={value} max={100} color={color} label="PTS" sublabel={label} />
    </div>
  )
}

function CircularProgress({ value, max, color, label, sublabel }: { value: number; max: number; color: string; label: string; sublabel: string }) {
  const percentage = (value / max) * 100
  return (
    <>
      <div className="relative w-20 h-20 mx-auto mb-2">
        <svg className="w-full h-full -rotate-90">
          <circle cx="40" cy="40" r="35" stroke="#1e293b" strokeWidth="6" fill="none" />
          <circle cx="40" cy="40" r="35" stroke={color} strokeWidth="6" fill="none"
            strokeDasharray={`${(percentage / 100) * 220} 220`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white">{value}</span>
          <span className="text-xs" style={{ color }}>{label}</span>
        </div>
      </div>
      <button className="w-full bg-blue-500 text-white text-xs font-medium py-2 rounded-full">
        DETAILS &gt;
      </button>
      <p className="text-center text-slate-400 text-xs mt-2">{sublabel}</p>
    </>
  )
}

function MapMarker({ count }: { count: number }) {
  return (
    <div className="relative">
      <div className="w-10 h-10 bg-emerald-400 rotate-45 rounded-lg" />
      <span className="absolute -top-1 -right-1 bg-yellow-500 text-xs font-bold px-1.5 py-0.5 rounded-full">{count}</span>
    </div>
  )
}

function SettingsSection({ title, items }: { title: string; items: Array<{ icon: any; title: string; desc: string }> }) {
  return (
    <div className="mb-6">
      <p className="text-blue-500 text-xs font-medium tracking-wider mb-3 flex items-center gap-2">
        <span className="w-8 h-0.5 bg-blue-500" /> {title}
      </p>
      <div className="space-y-2">
        {items.map((item, i) => (
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
  )
}
