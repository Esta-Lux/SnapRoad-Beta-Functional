import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2, Plus, Gift, TrendingUp, Users, DollarSign,
  MapPin, Calendar, Clock, ChevronRight, Edit2, Trash2,
  BarChart3, Eye, Zap, Bell, Settings, LogOut, Search,
  Check, X, Filter, Download, Gem
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

export default function PartnerDashboard() {
  const navigate = useNavigate()
  const [offers, setOffers] = useState<Offer[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'offers' | 'analytics'>('overview')

  useEffect(() => {
    loadData()
  }, [])

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
    <div className="min-h-screen bg-slate-900">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
              <Building2 className="text-white" size={20} />
            </div>
            <div>
              <span className="text-white font-bold">SnapRoad</span>
              <span className="text-emerald-400 text-xs block">Partner Portal</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-1">
            {[
              { id: 'overview', icon: BarChart3, label: 'Overview' },
              { id: 'offers', icon: Gift, label: 'My Offers' },
              { id: 'analytics', icon: TrendingUp, label: 'Analytics' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeTab === item.id
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-8 pt-8 border-t border-slate-700 space-y-1">
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/50">
              <Settings size={20} />
              <span className="font-medium">Settings</span>
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/50">
              <Bell size={20} />
              <span className="font-medium">Notifications</span>
            </button>
          </div>
        </nav>

        {/* User */}
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10"
          >
            <LogOut size={20} />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {activeTab === 'overview' && 'Dashboard Overview'}
              {activeTab === 'offers' && 'My Offers'}
              {activeTab === 'analytics' && 'Analytics'}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Manage your SnapRoad offers and track performance
            </p>
          </div>
          {activeTab === 'offers' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-white font-medium px-6 py-3 rounded-xl flex items-center gap-2"
            >
              <Plus size={20} />
              Create Offer
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && stats && (
              <div className="space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-6">
                  {[
                    { label: 'Total Redemptions', value: stats.total_redemptions.toLocaleString(), icon: Gift, color: 'emerald' },
                    { label: 'Total Views', value: stats.total_views.toLocaleString(), icon: Eye, color: 'blue' },
                    { label: 'New Customers', value: stats.new_customers.toLocaleString(), icon: Users, color: 'purple' },
                    { label: 'Revenue Generated', value: `$${stats.revenue_generated.toLocaleString()}`, icon: DollarSign, color: 'amber' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                      <div className={`w-12 h-12 bg-${stat.color}-500/20 rounded-xl flex items-center justify-center mb-4`}>
                        <stat.icon className={`text-${stat.color}-400`} size={24} />
                      </div>
                      <p className="text-slate-400 text-sm">{stat.label}</p>
                      <p className="text-white text-2xl font-bold mt-1">{stat.value}</p>
                    </div>
                  ))}
                </div>

                {/* Recent Activity */}
                <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
                  <h2 className="text-white font-semibold text-lg mb-4">Recent Redemptions</h2>
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="flex items-center justify-between py-3 border-b border-slate-700 last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                            <Gift className="text-emerald-400" size={18} />
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">15% Off First Visit</p>
                            <p className="text-slate-500 text-xs">Redeemed {i * 2} minutes ago</p>
                          </div>
                        </div>
                        <span className="text-emerald-400 text-sm font-medium">+50 gems</span>
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
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <button className="bg-slate-800 border border-slate-700 px-4 py-3 rounded-xl flex items-center gap-2 text-slate-400 hover:text-white">
                    <Filter size={18} />
                    Filter
                  </button>
                </div>

                {/* Offers List */}
                <div className="grid gap-4">
                  {offers.map(offer => (
                    <div key={offer.id} className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-white font-semibold text-lg">{offer.title}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              offer.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                              offer.status === 'paused' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
                            </span>
                          </div>
                          <p className="text-slate-400 text-sm mb-4">{offer.description}</p>
                          <div className="flex items-center gap-6 text-sm">
                            <div className="flex items-center gap-2">
                              <Gift className="text-slate-500" size={16} />
                              <span className="text-slate-400">{offer.discount_percent}% off</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Gem className="text-cyan-400" size={16} />
                              <span className="text-slate-400">+{offer.gems_reward} gems</span>
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
                          <button className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white">
                            <Edit2 size={16} />
                          </button>
                          <button className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400">
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
                <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
                  <h2 className="text-white font-semibold text-lg mb-4">Performance Overview</h2>
                  <div className="h-64 flex items-center justify-center border border-dashed border-slate-600 rounded-xl">
                    <p className="text-slate-500">Analytics chart placeholder</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Create Offer Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-lg p-6">
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
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500"
                />
              </div>
              <div>
                <label className="text-slate-400 text-sm mb-1 block">Description</label>
                <textarea
                  placeholder="Describe your offer..."
                  rows={3}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 text-sm mb-1 block">Discount %</label>
                  <input
                    type="number"
                    placeholder="15"
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-sm mb-1 block">Gems Reward</label>
                  <input
                    type="number"
                    placeholder="50"
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-slate-700 text-white py-3 rounded-xl hover:bg-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-500 text-white py-3 rounded-xl hover:bg-emerald-400"
                >
                  Create Offer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
