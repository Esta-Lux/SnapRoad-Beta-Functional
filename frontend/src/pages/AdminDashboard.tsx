import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Shield, Users, Building2, Gift, Calendar, Plus, TrendingUp,
  Settings, Bell, LogOut, Search, Filter, Edit2, Trash2,
  BarChart3, Eye, Zap, Check, X, MapPin, Clock, Star,
  AlertTriangle, Gem, Car, Trophy, ChevronRight, Download,
  Sparkles, ArrowRight, ChevronLeft, HelpCircle, Crown, Activity
} from 'lucide-react'

const API_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || ''

interface Event {
  id: string
  title: string
  description: string
  type: 'daily' | 'weekly' | 'special'
  gems_multiplier: number
  xp_bonus: number
  start_date: string
  end_date: string
  status: 'active' | 'scheduled' | 'ended'
}

interface User {
  id: string
  name: string
  email: string
  plan: 'basic' | 'premium'
  safety_score: number
  gems: number
  level: number
  status: 'active' | 'suspended'
}

interface Partner {
  id: string
  business_name: string
  email: string
  offers_count: number
  total_redemptions: number
  status: 'active' | 'pending' | 'suspended'
}

// Onboarding Walkthrough Component
function OnboardingWalkthrough({ onComplete, onSkip }: { onComplete: () => void; onSkip: () => void }) {
  const [step, setStep] = useState(0)
  
  const steps = [
    {
      title: 'Welcome, Administrator',
      description: 'You have full control over the SnapRoad platform. Manage users, partners, events, and monitor platform health.',
      icon: Shield,
      color: 'from-purple-500 to-pink-500',
    },
    {
      title: 'User Management',
      description: 'View all drivers, their safety scores, gem balances, and subscription status. Suspend or manage accounts as needed.',
      icon: Users,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'Partner Oversight',
      description: 'Approve new business partners, monitor their offers, and track redemption performance across the platform.',
      icon: Building2,
      color: 'from-emerald-500 to-teal-500',
    },
    {
      title: 'Create Platform Events',
      description: 'Launch daily, weekly, or special events with gem multipliers and XP bonuses to boost engagement.',
      icon: Calendar,
      color: 'from-amber-500 to-orange-500',
    },
  ]

  const currentStep = steps[step]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg">
        {/* Premium Glass Card */}
        <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
          {/* Animated background glow */}
          <div className={`absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br ${currentStep.color} rounded-full blur-3xl opacity-30`} />
          
          {/* Skip button */}
          <button 
            onClick={onSkip}
            className="absolute top-4 right-4 text-slate-400 hover:text-white text-sm font-medium"
          >
            Skip Tour
          </button>

          <div className="relative p-8">
            {/* Icon */}
            <div className={`w-20 h-20 bg-gradient-to-br ${currentStep.color} rounded-2xl flex items-center justify-center mb-6 shadow-lg`}>
              <currentStep.icon className="text-white" size={36} />
            </div>

            {/* Content */}
            <h2 className="text-2xl font-bold text-white mb-3">{currentStep.title}</h2>
            <p className="text-slate-300 text-base leading-relaxed mb-8">{currentStep.description}</p>

            {/* Progress dots */}
            <div className="flex items-center gap-2 mb-6">
              {steps.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === step ? 'w-8 bg-purple-400' : 'w-2 bg-slate-600'
                  }`}
                />
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-3">
              {step > 0 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="px-5 py-3 rounded-xl bg-slate-700/50 text-white font-medium hover:bg-slate-700 transition-all flex items-center gap-2"
                >
                  <ChevronLeft size={18} />
                  Back
                </button>
              )}
              <button
                onClick={() => {
                  if (step < steps.length - 1) {
                    setStep(step + 1)
                  } else {
                    onComplete()
                  }
                }}
                className={`flex-1 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 bg-gradient-to-r ${currentStep.color} text-white hover:opacity-90`}
              >
                {step < steps.length - 1 ? (
                  <>
                    Next
                    <ArrowRight size={18} />
                  </>
                ) : (
                  <>
                    Start Managing
                    <Sparkles size={18} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'partners' | 'events' | 'offers'>('overview')
  const [loading, setLoading] = useState(true)
  const [showCreateEventModal, setShowCreateEventModal] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  
  // Stats
  const [stats, setStats] = useState({
    total_users: 12450,
    premium_users: 3240,
    total_partners: 156,
    active_offers: 847,
    total_trips: 89420,
    avg_safety_score: 87,
  })
  
  // Data
  const [users, setUsers] = useState<User[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [events, setEvents] = useState<Event[]>([])

  useEffect(() => {
    // Check if first visit
    const hasSeenOnboarding = localStorage.getItem('admin_onboarding_complete')
    if (!hasSeenOnboarding) {
      setShowOnboarding(true)
    }
    loadData()
  }, [])

  const handleOnboardingComplete = () => {
    localStorage.setItem('admin_onboarding_complete', 'true')
    setShowOnboarding(false)
  }

  const loadData = async () => {
    setLoading(true)
    
    // Mock users
    setUsers([
      { id: '1', name: 'John Smith', email: 'john@example.com', plan: 'premium', safety_score: 95, gems: 12450, level: 45, status: 'active' },
      { id: '2', name: 'Sarah Wilson', email: 'sarah@example.com', plan: 'basic', safety_score: 88, gems: 3420, level: 23, status: 'active' },
      { id: '3', name: 'Mike Johnson', email: 'mike@example.com', plan: 'premium', safety_score: 92, gems: 8750, level: 38, status: 'active' },
      { id: '4', name: 'Emily Davis', email: 'emily@example.com', plan: 'basic', safety_score: 78, gems: 1560, level: 12, status: 'suspended' },
    ])
    
    // Mock partners
    setPartners([
      { id: '1', business_name: 'Shell Gas Station', email: 'shell@partner.com', offers_count: 5, total_redemptions: 2340, status: 'active' },
      { id: '2', business_name: 'Starbucks Downtown', email: 'starbucks@partner.com', offers_count: 3, total_redemptions: 1567, status: 'active' },
      { id: '3', business_name: 'Quick Shine Car Wash', email: 'quickshine@partner.com', offers_count: 2, total_redemptions: 890, status: 'pending' },
    ])
    
    // Mock events
    setEvents([
      {
        id: '1',
        title: 'Safe Driver Weekend',
        description: 'Double gems for all safe trips!',
        type: 'weekly',
        gems_multiplier: 2,
        xp_bonus: 500,
        start_date: '2025-02-08',
        end_date: '2025-02-10',
        status: 'active',
      },
      {
        id: '2',
        title: 'Valentine\'s Safety Special',
        description: 'Share the road, share the love!',
        type: 'special',
        gems_multiplier: 1.5,
        xp_bonus: 1000,
        start_date: '2025-02-14',
        end_date: '2025-02-14',
        status: 'scheduled',
      },
      {
        id: '3',
        title: 'Daily Challenge',
        description: 'Complete 3 safe trips today',
        type: 'daily',
        gems_multiplier: 1,
        xp_bonus: 250,
        start_date: '2025-02-08',
        end_date: '2025-02-08',
        status: 'active',
      },
    ])
    
    setLoading(false)
  }

  const handleLogout = () => {
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Onboarding */}
      {showOnboarding && (
        <OnboardingWalkthrough 
          onComplete={handleOnboardingComplete} 
          onSkip={handleOnboardingComplete} 
        />
      )}

      {/* Ambient Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />
      </div>

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-72 bg-slate-900/50 backdrop-blur-xl border-r border-white/5 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/25">
              <Shield className="text-white" size={24} />
            </div>
            <div>
              <span className="text-white font-bold text-lg">SnapRoad</span>
              <span className="text-purple-400 text-xs block font-medium">Admin Console</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-auto">
          <div className="space-y-2">
            {[
              { id: 'overview', icon: BarChart3, label: 'Overview', badge: null },
              { id: 'users', icon: Users, label: 'Users', badge: stats.total_users.toLocaleString() },
              { id: 'partners', icon: Building2, label: 'Partners', badge: stats.total_partners.toString() },
              { id: 'events', icon: Calendar, label: 'Events', badge: '3' },
              { id: 'offers', icon: Gift, label: 'All Offers', badge: null },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                data-testid={`nav-${item.id}`}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${
                  activeTab === item.id
                    ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 border border-purple-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon size={20} />
                <span className="font-medium flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <span className="bg-slate-700/50 text-slate-300 text-xs font-medium px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="mt-8 pt-8 border-t border-white/5 space-y-2">
            <button 
              onClick={() => setShowOnboarding(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5"
            >
              <HelpCircle size={20} />
              <span className="font-medium">Help & Tour</span>
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5">
              <Settings size={20} />
              <span className="font-medium">Settings</span>
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5">
              <Bell size={20} />
              <span className="font-medium">Notifications</span>
            </button>
          </div>
        </nav>

        {/* Admin Card */}
        <div className="p-4 border-t border-white/5">
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-4 border border-white/5 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Crown className="text-white" size={18} />
              </div>
              <div className="flex-1">
                <p className="text-white font-medium text-sm">Super Admin</p>
                <p className="text-purple-400 text-xs">Full Access</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Activity size={14} className="text-emerald-400" />
              <span>All systems operational</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            data-testid="logout-btn"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut size={20} />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-72 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">
              {activeTab === 'overview' && 'Platform Overview'}
              {activeTab === 'users' && 'User Management'}
              {activeTab === 'partners' && 'Partner Management'}
              {activeTab === 'events' && 'Events & Promotions'}
              {activeTab === 'offers' && 'All Offers'}
            </h1>
            <p className="text-slate-400">
              Full control over the SnapRoad platform
            </p>
          </div>
          {activeTab === 'events' && (
            <button
              onClick={() => setShowCreateEventModal(true)}
              data-testid="create-event-btn"
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-semibold px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-purple-500/25 transition-all"
            >
              <Plus size={20} />
              Create Event
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-6">
                  {[
                    { label: 'Total Users', value: stats.total_users.toLocaleString(), icon: Users, color: 'blue', sub: `${stats.premium_users.toLocaleString()} premium`, trend: '+8%' },
                    { label: 'Partners', value: stats.total_partners.toLocaleString(), icon: Building2, color: 'emerald', sub: `${stats.active_offers} active offers`, trend: '+12%' },
                    { label: 'Avg Safety Score', value: stats.avg_safety_score.toString(), icon: Shield, color: 'purple', sub: `${stats.total_trips.toLocaleString()} total trips`, trend: '+3%' },
                  ].map((stat, i) => (
                    <div key={i} className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-white/5 overflow-hidden group hover:border-white/10 transition-all">
                      {/* Hover glow */}
                      <div className={`absolute inset-0 bg-gradient-to-br from-${stat.color}-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
                      
                      <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                          <div className={`w-12 h-12 bg-${stat.color}-500/20 rounded-xl flex items-center justify-center`}>
                            <stat.icon className={`text-${stat.color}-400`} size={24} />
                          </div>
                          <span className="text-emerald-400 text-sm font-medium bg-emerald-500/10 px-2 py-1 rounded-full">
                            {stat.trend}
                          </span>
                        </div>
                        <p className="text-slate-400 text-sm">{stat.label}</p>
                        <p className="text-white text-3xl font-bold mt-1">{stat.value}</p>
                        <p className="text-slate-500 text-xs mt-2">{stat.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { label: 'Create Event', icon: Calendar, color: 'purple', action: () => setShowCreateEventModal(true) },
                    { label: 'View Reports', icon: BarChart3, color: 'blue', action: () => {} },
                    { label: 'Send Broadcast', icon: Bell, color: 'amber', action: () => {} },
                    { label: 'Export Data', icon: Download, color: 'emerald', action: () => {} },
                  ].map((action, i) => (
                    <button
                      key={i}
                      onClick={action.action}
                      data-testid={`quick-action-${action.label.toLowerCase().replace(' ', '-')}`}
                      className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border border-white/5 rounded-xl p-5 text-center hover:border-white/10 transition-all group overflow-hidden"
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br from-${action.color}-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
                      <div className="relative">
                        <div className={`w-12 h-12 bg-${action.color}-500/20 rounded-xl flex items-center justify-center mx-auto mb-3`}>
                          <action.icon className={`text-${action.color}-400`} size={22} />
                        </div>
                        <span className="text-white text-sm font-medium">{action.label}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Two Column Grid */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Active Events */}
                  <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 p-6">
                    <h2 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                      <Calendar className="text-purple-400" size={20} />
                      Active Events
                    </h2>
                    <div className="space-y-3">
                      {events.filter(e => e.status === 'active').map(event => (
                        <div key={event.id} className="flex items-center justify-between p-4 bg-slate-700/30 rounded-xl border border-white/5">
                          <div>
                            <p className="text-white font-medium text-sm">{event.title}</p>
                            <p className="text-slate-500 text-xs flex items-center gap-2 mt-1">
                              <span className={`px-2 py-0.5 rounded-full text-xs ${
                                event.type === 'daily' ? 'bg-blue-500/20 text-blue-400' :
                                event.type === 'weekly' ? 'bg-purple-500/20 text-purple-400' :
                                'bg-amber-500/20 text-amber-400'
                              }`}>{event.type}</span>
                              <span>{event.gems_multiplier}x gems</span>
                            </p>
                          </div>
                          <span className="bg-emerald-500/20 text-emerald-400 text-xs px-3 py-1.5 rounded-full font-medium">Active</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Platform Health */}
                  <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 p-6">
                    <h2 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                      <Shield className="text-emerald-400" size={20} />
                      Platform Health
                    </h2>
                    <div className="space-y-4">
                      {[
                        { label: 'API Status', status: 'Operational', color: 'emerald' },
                        { label: 'Database', status: 'Healthy', color: 'emerald' },
                        { label: 'Payment Gateway', status: 'Connected', color: 'emerald' },
                        { label: 'Push Notifications', status: 'Active', color: 'emerald' },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-slate-700/20 rounded-xl">
                          <span className="text-slate-300 text-sm">{item.label}</span>
                          <span className={`text-${item.color}-400 text-sm font-medium flex items-center gap-1.5 bg-${item.color}-500/10 px-2.5 py-1 rounded-full`}>
                            <Check size={14} />
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="space-y-6">
                {/* Filters */}
                <div className="flex items-center gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                      type="text"
                      placeholder="Search users..."
                      className="w-full bg-slate-800/50 backdrop-blur-xl border border-white/5 rounded-xl pl-12 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
                    />
                  </div>
                  <select className="bg-slate-800/50 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50">
                    <option>All Plans</option>
                    <option>Premium</option>
                    <option>Basic</option>
                  </select>
                  <select className="bg-slate-800/50 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50">
                    <option>All Status</option>
                    <option>Active</option>
                    <option>Suspended</option>
                  </select>
                </div>

                {/* Users Table */}
                <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-700/30">
                      <tr>
                        <th className="text-left text-slate-400 text-xs font-medium px-6 py-4 uppercase tracking-wider">User</th>
                        <th className="text-left text-slate-400 text-xs font-medium px-6 py-4 uppercase tracking-wider">Plan</th>
                        <th className="text-left text-slate-400 text-xs font-medium px-6 py-4 uppercase tracking-wider">Safety</th>
                        <th className="text-left text-slate-400 text-xs font-medium px-6 py-4 uppercase tracking-wider">Gems</th>
                        <th className="text-left text-slate-400 text-xs font-medium px-6 py-4 uppercase tracking-wider">Level</th>
                        <th className="text-left text-slate-400 text-xs font-medium px-6 py-4 uppercase tracking-wider">Status</th>
                        <th className="text-right text-slate-400 text-xs font-medium px-6 py-4 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {users.map(user => (
                        <tr key={user.id} className="hover:bg-white/2 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl flex items-center justify-center text-white font-medium border border-white/10">
                                {user.name.split(' ').map(n => n[0]).join('')}
                              </div>
                              <div>
                                <p className="text-white font-medium text-sm">{user.name}</p>
                                <p className="text-slate-500 text-xs">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              user.plan === 'premium' 
                                ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/20' 
                                : 'bg-slate-600/30 text-slate-400 border border-white/5'
                            }`}>
                              {user.plan === 'premium' && <Star size={10} className="inline mr-1" />}
                              {user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`font-semibold ${
                              user.safety_score >= 90 ? 'text-emerald-400' :
                              user.safety_score >= 70 ? 'text-amber-400' : 'text-red-400'
                            }`}>
                              {user.safety_score}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-cyan-400 font-medium flex items-center gap-1">
                              <Gem size={14} />
                              {user.gems.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-white font-medium">{user.level}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              user.status === 'active' 
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' 
                                : 'bg-red-500/20 text-red-400 border border-red-500/20'
                            }`}>
                              {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
                              <Edit2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Partners Tab */}
            {activeTab === 'partners' && (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-700/30">
                      <tr>
                        <th className="text-left text-slate-400 text-xs font-medium px-6 py-4 uppercase tracking-wider">Business</th>
                        <th className="text-left text-slate-400 text-xs font-medium px-6 py-4 uppercase tracking-wider">Offers</th>
                        <th className="text-left text-slate-400 text-xs font-medium px-6 py-4 uppercase tracking-wider">Redemptions</th>
                        <th className="text-left text-slate-400 text-xs font-medium px-6 py-4 uppercase tracking-wider">Status</th>
                        <th className="text-right text-slate-400 text-xs font-medium px-6 py-4 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {partners.map(partner => (
                        <tr key={partner.id} className="hover:bg-white/2 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-xl flex items-center justify-center border border-emerald-500/20">
                                <Building2 className="text-emerald-400" size={18} />
                              </div>
                              <div>
                                <p className="text-white font-medium text-sm">{partner.business_name}</p>
                                <p className="text-slate-500 text-xs">{partner.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-white font-medium">{partner.offers_count}</td>
                          <td className="px-6 py-4">
                            <span className="text-emerald-400 font-medium">{partner.total_redemptions.toLocaleString()}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              partner.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' :
                              partner.status === 'pending' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20' :
                              'bg-red-500/20 text-red-400 border border-red-500/20'
                            }`}>
                              {partner.status.charAt(0).toUpperCase() + partner.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
                              <Edit2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Events Tab */}
            {activeTab === 'events' && (
              <div className="space-y-6">
                <div className="grid gap-4">
                  {events.map(event => (
                    <div key={event.id} className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 p-6 hover:border-white/10 transition-all">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-white font-semibold text-lg">{event.title}</h3>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              event.type === 'daily' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' :
                              event.type === 'weekly' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/20' :
                              'bg-amber-500/20 text-amber-400 border border-amber-500/20'
                            }`}>
                              {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                            </span>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              event.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' :
                              event.status === 'scheduled' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' :
                              'bg-slate-600/30 text-slate-400 border border-white/5'
                            }`}>
                              {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                            </span>
                          </div>
                          <p className="text-slate-400 text-sm mb-4">{event.description}</p>
                          <div className="flex items-center gap-6 text-sm">
                            <div className="flex items-center gap-2 bg-slate-700/30 px-3 py-1.5 rounded-lg">
                              <Gem className="text-cyan-400" size={16} />
                              <span className="text-slate-300">{event.gems_multiplier}x gems</span>
                            </div>
                            <div className="flex items-center gap-2 bg-slate-700/30 px-3 py-1.5 rounded-lg">
                              <Zap className="text-amber-400" size={16} />
                              <span className="text-slate-300">+{event.xp_bonus} XP</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="text-slate-500" size={16} />
                              <span className="text-slate-400">{event.start_date} → {event.end_date}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button className="p-2.5 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 text-white transition-all">
                            <Edit2 size={16} />
                          </button>
                          <button className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Offers Tab */}
            {activeTab === 'offers' && (
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 p-8">
                <div className="text-center py-12">
                  <Gift className="text-slate-600 mx-auto mb-4" size={56} />
                  <p className="text-slate-400 text-lg">All platform offers will be displayed here</p>
                  <p className="text-slate-600 text-sm mt-2">View and manage offers from all partners</p>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Create Event Modal */}
      {showCreateEventModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-white/10 shadow-2xl">
              {/* Glow effect */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl" />
              
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-white font-bold text-xl">Create New Event</h2>
                  <button onClick={() => setShowCreateEventModal(false)} className="text-slate-400 hover:text-white">
                    <X size={20} />
                  </button>
                </div>
                <form className="space-y-4">
                  <div>
                    <label className="text-slate-400 text-sm mb-1 block">Event Title</label>
                    <input
                      type="text"
                      placeholder="e.g., Safe Driver Weekend"
                      className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-sm mb-1 block">Description</label>
                    <textarea
                      placeholder="Describe the event..."
                      rows={3}
                      className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-purple-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-sm mb-1 block">Event Type</label>
                    <select className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50">
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="special">Special</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-slate-400 text-sm mb-1 block">Gems Multiplier</label>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="2"
                        className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 text-sm mb-1 block">XP Bonus</label>
                      <input
                        type="number"
                        placeholder="500"
                        className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-slate-400 text-sm mb-1 block">Start Date</label>
                      <input
                        type="date"
                        className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 text-sm mb-1 block">End Date</label>
                      <input
                        type="date"
                        className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowCreateEventModal(false)}
                      className="flex-1 bg-slate-700/50 text-white py-3 rounded-xl hover:bg-slate-700 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl hover:from-purple-400 hover:to-pink-400 transition-all font-semibold"
                    >
                      Create Event
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
