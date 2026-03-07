import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2,
  Gift,
  Users,
  DollarSign,
  TrendingUp,
  Plus,
  Eye,
  Edit,
  Pause,
  Play,
  ChevronRight,
  BarChart3,
  Calendar
} from 'lucide-react'

// Mock business data
const businessData = {
  name: 'Downtown Coffee',
  email: 'owner@downtowncoffee.com',
  plan: 'growth',
  status: 'active',
  stats: {
    totalRedemptions: 156,
    monthlyRedemptions: 45,
    totalRevenue: 312.00, // Platform fees paid
    activeOffers: 3,
    totalViews: 2340,
    conversionRate: 6.7
  },
  offers: [
    { id: '1', title: '20% Off Any Coffee', gemsRequired: 50, status: 'active', redemptions: 89, views: 1250, expires: '2025-02-15' },
    { id: '2', title: 'Free Pastry with Purchase', gemsRequired: 100, status: 'active', redemptions: 45, views: 780, expires: '2025-02-28' },
    { id: '3', title: 'Buy 1 Get 1 Free', gemsRequired: 150, status: 'paused', redemptions: 22, views: 310, expires: '2025-03-15' },
  ],
  recentRedemptions: [
    { id: '1', offer: '20% Off Any Coffee', user: 'John S.', date: 'Today, 2:15 PM', code: 'ABC12XYZ', status: 'used' },
    { id: '2', offer: 'Free Pastry with Purchase', user: 'Sarah M.', date: 'Today, 11:30 AM', code: 'DEF34UVW', status: 'pending' },
    { id: '3', offer: '20% Off Any Coffee', user: 'Mike R.', date: 'Yesterday', code: 'GHI56RST', status: 'used' },
    { id: '4', offer: '20% Off Any Coffee', user: 'Emily K.', date: 'Yesterday', code: 'JKL78OPQ', status: 'expired' },
  ]
}

export default function BusinessDashboard() {
  const navigate = useNavigate()
  const [showCreateOffer, setShowCreateOffer] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400'
      case 'paused': return 'bg-yellow-500/20 text-yellow-400'
      case 'used': return 'bg-green-500/20 text-green-400'
      case 'pending': return 'bg-blue-500/20 text-blue-400'
      case 'expired': return 'bg-red-500/20 text-red-400'
      default: return 'bg-slate-500/20 text-slate-400'
    }
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="https://customer-assets.emergentagent.com/job_navigate-app-1/artifacts/nn7pu72r_BiggerLogoSR.png"
              alt="SnapRoad"
              className="h-8"
            />
            <span className="text-white font-semibold">Business Partner Portal</span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/login')}
              className="text-slate-400 hover:text-white text-sm"
            >
              Switch to Admin
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                <Building2 className="text-white" size={16} />
              </div>
              <span className="text-white text-sm">{businessData.name}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Welcome Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Welcome, {businessData.name}!</h1>
            <p className="text-slate-400">Manage your offers and track customer redemptions</p>
          </div>
          <button 
            onClick={() => setShowCreateOffer(true)}
            className="bg-primary-500 hover:bg-primary-600 text-white font-medium px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus size={20} />
            Create Offer
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Users className="text-green-400" size={20} />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{businessData.stats.totalRedemptions}</p>
            <p className="text-slate-400 text-sm">Total Redemptions</p>
            <p className="text-green-400 text-xs mt-1">+{businessData.stats.monthlyRedemptions} this month</p>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Gift className="text-purple-400" size={20} />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{businessData.stats.activeOffers}</p>
            <p className="text-slate-400 text-sm">Active Offers</p>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Eye className="text-blue-400" size={20} />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{businessData.stats.totalViews.toLocaleString()}</p>
            <p className="text-slate-400 text-sm">Total Views</p>
            <p className="text-blue-400 text-xs mt-1">{businessData.stats.conversionRate}% conversion</p>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <DollarSign className="text-yellow-400" size={20} />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">${businessData.stats.totalRevenue.toFixed(2)}</p>
            <p className="text-slate-400 text-sm">Platform Fees</p>
            <p className="text-slate-500 text-xs mt-1">$0.20 per redemption</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* My Offers */}
          <div className="lg:col-span-2 bg-slate-800 rounded-xl border border-slate-700">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Gift className="text-purple-400" size={20} />
                My Offers
              </h2>
              <button className="text-primary-400 hover:text-primary-300 text-sm flex items-center gap-1">
                Manage All <ChevronRight size={16} />
              </button>
            </div>
            <div className="divide-y divide-slate-700">
              {businessData.offers.map((offer) => (
                <div key={offer.id} className="p-4 hover:bg-slate-700/30 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h3 className="text-white font-medium">{offer.title}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(offer.status)}`}>
                        {offer.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
                        <Edit size={16} />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
                        {offer.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-slate-400">Gems Required</p>
                      <p className="text-purple-400 font-medium">{offer.gemsRequired}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Redemptions</p>
                      <p className="text-white font-medium">{offer.redemptions}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Views</p>
                      <p className="text-white font-medium">{offer.views}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Expires</p>
                      <p className="text-white font-medium">{offer.expires}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Redemptions */}
          <div className="bg-slate-800 rounded-xl border border-slate-700">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <BarChart3 className="text-green-400" size={20} />
                Recent Redemptions
              </h2>
            </div>
            <div className="divide-y divide-slate-700">
              {businessData.recentRedemptions.map((redemption) => (
                <div key={redemption.id} className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-white text-sm font-medium">{redemption.user}</p>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(redemption.status)}`}>
                      {redemption.status}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs mb-1">{redemption.offer}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-slate-500 text-xs">{redemption.date}</p>
                    <code className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">{redemption.code}</code>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Subscription Info */}
        <div className="mt-6 bg-gradient-to-r from-purple-900/50 to-purple-800/50 rounded-xl border border-purple-700/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold text-white">Growth Plan</h3>
                <span className="px-2 py-1 text-xs bg-purple-500/30 text-purple-300 rounded-full">Current</span>
              </div>
              <p className="text-purple-200 text-sm">Up to 10 active offers • Priority placement • Analytics dashboard</p>
            </div>
            <button className="bg-purple-500 hover:bg-purple-600 text-white font-medium px-4 py-2 rounded-lg transition-colors">
              Upgrade to Enterprise
            </button>
          </div>
        </div>

        {/* Quick Tips */}
        <div className="mt-6 bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Tips to Increase Redemptions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-700/50 rounded-lg p-4">
              <TrendingUp className="text-green-400 mb-2" size={20} />
              <p className="text-white text-sm font-medium">Lower Gem Requirements</p>
              <p className="text-slate-400 text-xs mt-1">Offers under 75 Gems see 40% more redemptions</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4">
              <Calendar className="text-blue-400 mb-2" size={20} />
              <p className="text-white text-sm font-medium">Time-Limited Offers</p>
              <p className="text-slate-400 text-xs mt-1">Create urgency with expiration dates</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4">
              <Gift className="text-purple-400 mb-2" size={20} />
              <p className="text-white text-sm font-medium">Bundle Deals</p>
              <p className="text-slate-400 text-xs mt-1">Combine products for higher perceived value</p>
            </div>
          </div>
        </div>
      </main>

      {/* Create Offer Modal */}
      {showCreateOffer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreateOffer(false)}>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-semibold text-white mb-6">Create New Offer</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Offer Title</label>
                <input
                  type="text"
                  placeholder="e.g., 20% Off Any Item"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                <textarea
                  placeholder="Describe your offer..."
                  rows={3}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Gems Required</label>
                  <input
                    type="number"
                    placeholder="50"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Discount %</label>
                  <input
                    type="number"
                    placeholder="20"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Expiration Date</label>
                <input
                  type="date"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setShowCreateOffer(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button className="flex-1 bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 rounded-lg transition-colors">
                Create Offer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
