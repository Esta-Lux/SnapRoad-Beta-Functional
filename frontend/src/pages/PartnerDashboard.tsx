import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2, Plus, Gift, TrendingUp, Users, DollarSign,
  MapPin, Calendar, Clock, ChevronRight, Edit2, Trash2,
  BarChart3, Eye, Zap, Bell, Settings, LogOut, Search,
  Check, X, Filter, Download, Gem, Sparkles, ArrowRight,
  ChevronLeft, HelpCircle, Target, Award
} from 'lucide-react'

const API_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || ''

interface Offer {
  id: number
  title: string
  description: string
  discount_percent: number
  gems_reward: number
  redemption_count: number
  views: number
  status: 'active' | 'paused' | 'expired'
  created_at: string
  expires_at: string
}

interface Stats {
  total_offers: number
  active_offers: number
  total_redemptions: number
  total_views: number
  revenue_generated: number
  new_customers: number
}

// Onboarding Walkthrough Component
function OnboardingWalkthrough({ onComplete, onSkip }: { onComplete: () => void; onSkip: () => void }) {
  const [step, setStep] = useState(0)
  
  const steps = [
    {
      title: 'Welcome to Partner Portal',
      description: 'Manage your offers, track performance, and grow your business with SnapRoad drivers.',
      icon: Building2,
      color: 'from-emerald-500 to-teal-500',
    },
    {
      title: 'Create Compelling Offers',
      description: 'Create discounts and promotions that attract SnapRoad drivers. Set gem rewards to incentivize redemptions.',
      icon: Gift,
      color: 'from-purple-500 to-pink-500',
    },
    {
      title: 'Track Your Performance',
      description: 'Monitor views, redemptions, and revenue in real-time. See which offers drive the most customers.',
      icon: BarChart3,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'Reach Premium Drivers',
      description: 'Premium SnapRoad users get better discounts on your offers, creating loyal repeat customers.',
      icon: Award,
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
            data-testid="skip-tour-btn"
            className="absolute top-4 right-4 z-10 text-slate-400 hover:text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
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
                    i === step ? 'w-8 bg-emerald-400' : 'w-2 bg-slate-600'
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
                    Get Started
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

export default function PartnerDashboard() {
  const navigate = useNavigate()
  const [offers, setOffers] = useState<Offer[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'offers' | 'analytics'>('overview')
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    // Check if first visit
    const hasSeenOnboarding = localStorage.getItem('partner_onboarding_complete')
    if (!hasSeenOnboarding) {
      setShowOnboarding(true)
    }
    loadData()
  }, [])

  const handleOnboardingComplete = () => {
    localStorage.setItem('partner_onboarding_complete', 'true')
    setShowOnboarding(false)
  }

  const loadData = async () => {
    setLoading(true)
    // Mock data
    setStats({
      total_offers: 5,
      active_offers: 3,
      total_redemptions: 847,
      total_views: 12450,
      revenue_generated: 15680,
      new_customers: 234,
    })
    setOffers([
      {
        id: 1,
        title: '15% Off First Visit',
        description: 'Welcome offer for new customers',
        discount_percent: 15,
        gems_reward: 50,
        redemption_count: 234,
        views: 4500,
        status: 'active',
        created_at: '2025-02-01',
        expires_at: '2025-02-28',
      },
      {
        id: 2,
        title: 'Weekend Special',
        description: 'Extra discount on weekends',
        discount_percent: 20,
        gems_reward: 75,
        redemption_count: 156,
        views: 3200,
        status: 'active',
        created_at: '2025-02-05',
        expires_at: '2025-02-15',
      },
      {
        id: 3,
        title: 'Loyalty Bonus',
        description: 'For returning customers',
        discount_percent: 10,
        gems_reward: 30,
        redemption_count: 457,
        views: 4750,
        status: 'paused',
        created_at: '2025-01-15',
        expires_at: '2025-03-15',
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
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
      </div>

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-72 bg-slate-900/50 backdrop-blur-xl border-r border-white/5 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <Building2 className="text-white" size={24} />
            </div>
            <div>
              <span className="text-white font-bold text-lg">SnapRoad</span>
              <span className="text-emerald-400 text-xs block font-medium">Partner Portal</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {[
              { id: 'overview', icon: BarChart3, label: 'Overview', badge: null },
              { id: 'offers', icon: Gift, label: 'My Offers', badge: '3' },
              { id: 'analytics', icon: TrendingUp, label: 'Analytics', badge: null },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                data-testid={`nav-${item.id}`}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${
                  activeTab === item.id
                    ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon size={20} />
                <span className="font-medium flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
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

        {/* User Card */}
        <div className="p-4 border-t border-white/5">
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-4 border border-white/5 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center text-white font-bold">
                SC
              </div>
              <div className="flex-1">
                <p className="text-white font-medium text-sm">Shell Columbus</p>
                <p className="text-emerald-400 text-xs">Premium Partner</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Target size={14} className="text-emerald-400" />
              <span>847 total redemptions</span>
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
              {activeTab === 'overview' && 'Dashboard Overview'}
              {activeTab === 'offers' && 'My Offers'}
              {activeTab === 'analytics' && 'Analytics'}
            </h1>
            <p className="text-slate-400">
              Manage your SnapRoad offers and track performance
            </p>
          </div>
          {activeTab === 'offers' && (
            <button
              onClick={() => setShowCreateModal(true)}
              data-testid="create-offer-btn"
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-semibold px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all"
            >
              <Plus size={20} />
              Create Offer
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && stats && (
              <div className="space-y-8">
                {/* Premium Stats Grid */}
                <div className="grid grid-cols-4 gap-6">
                  {[
                    { label: 'Total Redemptions', value: stats.total_redemptions.toLocaleString(), icon: Gift, color: 'emerald', trend: '+12%' },
                    { label: 'Total Views', value: stats.total_views.toLocaleString(), icon: Eye, color: 'blue', trend: '+8%' },
                    { label: 'New Customers', value: stats.new_customers.toLocaleString(), icon: Users, color: 'purple', trend: '+24%' },
                    { label: 'Revenue Generated', value: `$${stats.revenue_generated.toLocaleString()}`, icon: DollarSign, color: 'amber', trend: '+18%' },
                  ].map((stat, i) => (
                    <div 
                      key={i} 
                      className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-white/5 overflow-hidden group hover:border-white/10 transition-all"
                    >
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
                      </div>
                    </div>
                  ))}
                </div>

                {/* Recent Activity */}
                <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-white font-semibold text-lg flex items-center gap-2">
                      <Sparkles className="text-emerald-400" size={20} />
                      Recent Redemptions
                    </h2>
                    <button className="text-emerald-400 text-sm hover:text-emerald-300">View All</button>
                  </div>
                  <div className="space-y-3">
                    {[
                      { offer: '15% Off First Visit', time: '2 minutes ago', gems: 50 },
                      { offer: 'Weekend Special', time: '15 minutes ago', gems: 75 },
                      { offer: '15% Off First Visit', time: '32 minutes ago', gems: 50 },
                      { offer: 'Loyalty Bonus', time: '1 hour ago', gems: 30 },
                      { offer: 'Weekend Special', time: '2 hours ago', gems: 75 },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                            <Gift className="text-emerald-400" size={18} />
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">{item.offer}</p>
                            <p className="text-slate-500 text-xs">{item.time}</p>
                          </div>
                        </div>
                        <span className="text-cyan-400 text-sm font-medium flex items-center gap-1">
                          <Gem size={14} />
                          +{item.gems}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Offers Tab */}
            {activeTab === 'offers' && (
              <div className="space-y-6">
                {/* Filters */}
                <div className="flex items-center gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                      type="text"
                      placeholder="Search offers..."
                      className="w-full bg-slate-800/50 backdrop-blur-xl border border-white/5 rounded-xl pl-12 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <button className="bg-slate-800/50 border border-white/5 px-5 py-3 rounded-xl flex items-center gap-2 text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all">
                    <Filter size={18} />
                    Filter
                  </button>
                </div>

                {/* Offers List */}
                <div className="grid gap-4">
                  {offers.map(offer => (
                    <div key={offer.id} className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 p-6 hover:border-white/10 transition-all">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-white font-semibold text-lg">{offer.title}</h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              offer.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' :
                              offer.status === 'paused' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20' :
                              'bg-red-500/20 text-red-400 border border-red-500/20'
                            }`}>
                              {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
                            </span>
                          </div>
                          <p className="text-slate-400 text-sm mb-4">{offer.description}</p>
                          <div className="flex items-center gap-6 text-sm">
                            <div className="flex items-center gap-2 bg-slate-700/30 px-3 py-1.5 rounded-lg">
                              <Gift className="text-purple-400" size={16} />
                              <span className="text-slate-300">{offer.discount_percent}% off</span>
                            </div>
                            <div className="flex items-center gap-2 bg-slate-700/30 px-3 py-1.5 rounded-lg">
                              <Gem className="text-cyan-400" size={16} />
                              <span className="text-slate-300">+{offer.gems_reward} gems</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Eye className="text-slate-500" size={16} />
                              <span className="text-slate-400">{offer.views.toLocaleString()} views</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Check className="text-emerald-400" size={16} />
                              <span className="text-slate-400">{offer.redemption_count} redeemed</span>
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

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 p-6">
                  <h2 className="text-white font-semibold text-lg mb-6">Performance Overview</h2>
                  <div className="h-64 flex items-center justify-center border border-dashed border-white/10 rounded-xl bg-slate-900/30">
                    <div className="text-center">
                      <BarChart3 className="text-slate-600 mx-auto mb-3" size={48} />
                      <p className="text-slate-500">Analytics charts coming soon</p>
                      <p className="text-slate-600 text-sm mt-1">Track redemption trends and customer insights</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Create Offer Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-white/10 shadow-2xl">
              {/* Glow effect */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl" />
              
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-white font-bold text-xl">Create New Offer</h2>
                  <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                    <X size={20} />
                  </button>
                </div>
                <form className="space-y-4">
                  <div>
                    <label className="text-slate-400 text-sm mb-1 block">Offer Title</label>
                    <input
                      type="text"
                      placeholder="e.g., 20% Off Weekend Special"
                      className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-sm mb-1 block">Description</label>
                    <textarea
                      placeholder="Describe your offer..."
                      rows={3}
                      className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-slate-400 text-sm mb-1 block">Discount %</label>
                      <input
                        type="number"
                        placeholder="15"
                        className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 text-sm mb-1 block">Gems Reward</label>
                      <input
                        type="number"
                        placeholder="50"
                        className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="flex-1 bg-slate-700/50 text-white py-3 rounded-xl hover:bg-slate-700 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 rounded-xl hover:from-emerald-400 hover:to-teal-400 transition-all font-semibold"
                    >
                      Create Offer
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
