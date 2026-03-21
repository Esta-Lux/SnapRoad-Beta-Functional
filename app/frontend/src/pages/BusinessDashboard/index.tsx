import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Building2, Gift, Users, DollarSign, TrendingUp, Plus, Eye, Edit, Pause, Play,
  ChevronRight, BarChart3, Calendar, X, Check, Trash2, Copy, Download, RefreshCw,
  Settings, HelpCircle, Bell, LogOut, Star, Target, Zap
} from 'lucide-react'

// Mock business data
const initialOffers = [
  { id: '1', title: '20% Off Any Coffee', gemsRequired: 50, status: 'active', redemptions: 89, views: 1250, expires: '2025-02-15', discount: '20%' },
  { id: '2', title: 'Free Pastry with Purchase', gemsRequired: 100, status: 'active', redemptions: 45, views: 780, expires: '2025-02-28', discount: 'Free item' },
  { id: '3', title: 'Buy 1 Get 1 Free', gemsRequired: 150, status: 'paused', redemptions: 22, views: 310, expires: '2025-03-15', discount: 'BOGO' },
]

const initialRedemptions = [
  { id: '1', offer: '20% Off Any Coffee', user: 'John S.', date: 'Today, 2:15 PM', code: 'ABC12XYZ', status: 'used' },
  { id: '2', offer: 'Free Pastry with Purchase', user: 'Sarah M.', date: 'Today, 11:30 AM', code: 'DEF34UVW', status: 'pending' },
  { id: '3', offer: '20% Off Any Coffee', user: 'Mike R.', date: 'Yesterday', code: 'GHI56RST', status: 'used' },
  { id: '4', offer: '20% Off Any Coffee', user: 'Emily K.', date: 'Yesterday', code: 'JKL78OPQ', status: 'expired' },
]

const businessData = {
  name: 'Downtown Coffee',
  email: 'owner@downtowncoffee.com',
  plan: 'growth',
  status: 'active',
  stats: {
    totalRedemptions: 156,
    monthlyRedemptions: 45,
    totalRevenue: 312.00,
    activeOffers: 3,
    totalViews: 2340,
    conversionRate: 6.7
  }
}

export default function BusinessDashboard() {
  const navigate = useNavigate()
  const [showCreateOffer, setShowCreateOffer] = useState(false)
  const [offers, setOffers] = useState(initialOffers)
  const [redemptions, setRedemptions] = useState(initialRedemptions)
  const [showRedemptionDetail, setShowRedemptionDetail] = useState<typeof initialRedemptions[0] | null>(null)
  const [newOffer, setNewOffer] = useState({ title: '', description: '', gems: '', discount: '', expires: '' })
  const [showNotifications, setShowNotifications] = useState(false)

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

  const handleToggleOfferStatus = (offerId: string) => {
    setOffers(prev => prev.map(offer => {
      if (offer.id === offerId) {
        const newStatus = offer.status === 'active' ? 'paused' : 'active'
        toast.success(`Offer ${newStatus === 'active' ? 'activated' : 'paused'}`)
        return { ...offer, status: newStatus }
      }
      return offer
    }))
  }

  const handleDeleteOffer = (offerId: string) => {
    if (confirm('Are you sure you want to delete this offer?')) {
      setOffers(prev => prev.filter(o => o.id !== offerId))
      toast.success('Offer deleted')
    }
  }

  const handleCreateOffer = () => {
    if (!newOffer.title || !newOffer.gems || !newOffer.discount) {
      toast.error('Please fill in all required fields')
      return
    }
    const offer = {
      id: Date.now().toString(),
      title: newOffer.title,
      gemsRequired: parseInt(newOffer.gems),
      status: 'active',
      redemptions: 0,
      views: 0,
      expires: newOffer.expires || '2025-03-31',
      discount: newOffer.discount
    }
    setOffers(prev => [...prev, offer])
    setNewOffer({ title: '', description: '', gems: '', discount: '', expires: '' })
    setShowCreateOffer(false)
    toast.success('Offer created successfully!')
  }

  const handleValidateRedemption = (redemptionId: string) => {
    setRedemptions(prev => prev.map(r => {
      if (r.id === redemptionId && r.status === 'pending') {
        toast.success('Redemption validated!')
        return { ...r, status: 'used' }
      }
      return r
    }))
    setShowRedemptionDetail(null)
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard?.writeText(code)
    toast.success('Code copied to clipboard')
  }

  const handleExportData = () => {
    toast.success('Exporting data to CSV...')
    setTimeout(() => toast.success('Download started!'), 1000)
  }

  const handleRefreshStats = () => {
    toast.loading('Refreshing stats...', { duration: 1500 })
    setTimeout(() => toast.success('Stats updated!'), 1500)
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Create Offer Modal */}
      {showCreateOffer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateOffer(false)}>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Create New Offer</h2>
              <button onClick={() => setShowCreateOffer(false)} className="text-slate-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Offer Title *</label>
                <input
                  type="text"
                  value={newOffer.title}
                  onChange={(e) => setNewOffer({ ...newOffer, title: e.target.value })}
                  placeholder="e.g., 20% Off Any Item"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                <textarea
                  value={newOffer.description}
                  onChange={(e) => setNewOffer({ ...newOffer, description: e.target.value })}
                  placeholder="Describe your offer..."
                  rows={3}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Gems Required *</label>
                  <input
                    type="number"
                    value={newOffer.gems}
                    onChange={(e) => setNewOffer({ ...newOffer, gems: e.target.value })}
                    placeholder="50"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Discount *</label>
                  <input
                    type="text"
                    value={newOffer.discount}
                    onChange={(e) => setNewOffer({ ...newOffer, discount: e.target.value })}
                    placeholder="20% or Free item"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Expiration Date</label>
                <input
                  type="date"
                  value={newOffer.expires}
                  onChange={(e) => setNewOffer({ ...newOffer, expires: e.target.value })}
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
              <button 
                onClick={handleCreateOffer}
                className="flex-1 bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={18} /> Create Offer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Redemption Detail Modal */}
      {showRedemptionDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowRedemptionDetail(null)}>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Redemption Details</h3>
              <button onClick={() => setShowRedemptionDetail(null)} className="text-slate-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Customer</span>
                <span className="text-white font-medium">{showRedemptionDetail.user}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Offer</span>
                <span className="text-white font-medium">{showRedemptionDetail.offer}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Code</span>
                <button 
                  onClick={() => handleCopyCode(showRedemptionDetail.code)}
                  className="text-primary-400 font-mono flex items-center gap-1 hover:text-primary-300"
                >
                  {showRedemptionDetail.code} <Copy size={14} />
                </button>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status</span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(showRedemptionDetail.status)}`}>
                  {showRedemptionDetail.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date</span>
                <span className="text-white">{showRedemptionDetail.date}</span>
              </div>
            </div>
            {showRedemptionDetail.status === 'pending' && (
              <button 
                onClick={() => handleValidateRedemption(showRedemptionDetail.id)}
                className="w-full mt-4 bg-green-500 hover:bg-green-600 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Check size={18} /> Validate Redemption
              </button>
            )}
          </div>
        </div>
      )}

      {/* Notifications Panel */}
      {showNotifications && (
        <div className="fixed inset-0 bg-black/50 flex justify-end z-50" onClick={() => setShowNotifications(false)}>
          <div className="bg-slate-800 w-full max-w-sm h-full overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Notifications</h3>
              <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {[
                { title: 'New Redemption', desc: 'Sarah M. redeemed "Free Pastry"', time: '2m ago', type: 'redemption' },
                { title: 'Offer Expiring Soon', desc: '"Buy 1 Get 1 Free" expires in 3 days', time: '1h ago', type: 'warning' },
                { title: 'Weekly Report Ready', desc: 'Your analytics report is ready to view', time: '3h ago', type: 'info' },
                { title: 'Payment Processed', desc: '$31.20 platform fee charged', time: 'Yesterday', type: 'payment' },
              ].map((notif, i) => (
                <button 
                  key={i}
                  onClick={() => { toast(`Viewing: ${notif.title}`); setShowNotifications(false) }}
                  className="w-full bg-slate-700/50 rounded-lg p-3 text-left hover:bg-slate-700 transition-colors"
                >
                  <p className="text-white font-medium">{notif.title}</p>
                  <p className="text-slate-400 text-sm">{notif.desc}</p>
                  <p className="text-slate-500 text-xs mt-1">{notif.time}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/assets/logo.png"
              alt="SnapRoad"
              className="h-8"
            />
            <span className="text-white font-semibold">Business Partner Portal</span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowNotifications(true)}
              className="relative text-slate-400 hover:text-white p-2"
            >
              <Bell size={20} />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <button 
              onClick={() => toast('Opening settings...')}
              className="text-slate-400 hover:text-white p-2"
            >
              <Settings size={20} />
            </button>
            <button 
              onClick={() => navigate('/login')}
              className="text-slate-400 hover:text-white text-sm flex items-center gap-1"
            >
              <LogOut size={16} /> Switch to Admin
            </button>
            <div className="flex items-center gap-2 pl-4 border-l border-slate-700">
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
          <div className="flex items-center gap-3">
            <button 
              onClick={handleRefreshStats}
              className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <RefreshCw size={18} /> Refresh
            </button>
            <button 
              onClick={handleExportData}
              className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Download size={18} /> Export
            </button>
            <button 
              onClick={() => setShowCreateOffer(true)}
              className="bg-primary-500 hover:bg-primary-600 text-white font-medium px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus size={20} /> Create Offer
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <button 
            onClick={() => toast(`Total Redemptions: ${businessData.stats.totalRedemptions}`)}
            className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-slate-600 transition-colors text-left"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Users className="text-green-400" size={20} />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{businessData.stats.totalRedemptions}</p>
            <p className="text-slate-400 text-sm">Total Redemptions</p>
            <p className="text-green-400 text-xs mt-1">+{businessData.stats.monthlyRedemptions} this month</p>
          </button>

          <button 
            onClick={() => toast(`Active Offers: ${offers.filter(o => o.status === 'active').length}`)}
            className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-slate-600 transition-colors text-left"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Gift className="text-purple-400" size={20} />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{offers.filter(o => o.status === 'active').length}</p>
            <p className="text-slate-400 text-sm">Active Offers</p>
          </button>

          <button 
            onClick={() => toast(`Total Views: ${businessData.stats.totalViews.toLocaleString()}`)}
            className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-slate-600 transition-colors text-left"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Eye className="text-blue-400" size={20} />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{businessData.stats.totalViews.toLocaleString()}</p>
            <p className="text-slate-400 text-sm">Total Views</p>
            <p className="text-blue-400 text-xs mt-1">{businessData.stats.conversionRate}% conversion</p>
          </button>

          <button 
            onClick={() => toast(`Platform Fees: $${businessData.stats.totalRevenue.toFixed(2)}`)}
            className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-slate-600 transition-colors text-left"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <DollarSign className="text-yellow-400" size={20} />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">${businessData.stats.totalRevenue.toFixed(2)}</p>
            <p className="text-slate-400 text-sm">Platform Fees</p>
            <p className="text-slate-500 text-xs mt-1">$0.20 per redemption</p>
          </button>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* My Offers */}
          <div className="lg:col-span-2 bg-slate-800 rounded-xl border border-slate-700">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Gift className="text-purple-400" size={20} />
                My Offers ({offers.length})
              </h2>
              <button 
                onClick={() => toast('View all offers')}
                className="text-primary-400 hover:text-primary-300 text-sm flex items-center gap-1"
              >
                Manage All <ChevronRight size={16} />
              </button>
            </div>
            <div className="divide-y divide-slate-700">
              {offers.map((offer) => (
                <div key={offer.id} className="p-4 hover:bg-slate-700/30 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h3 className="text-white font-medium">{offer.title}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(offer.status)}`}>
                        {offer.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => { setShowEditOffer(offer.id); toast('Edit offer: ' + offer.title) }}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleToggleOfferStatus(offer.id)}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        {offer.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
                      </button>
                      <button 
                        onClick={() => handleDeleteOffer(offer.id)}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-slate-400">Gems Required</p>
                      <p className="text-purple-400 font-medium">{offer.gemsRequired} 💎</p>
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
              {redemptions.map((redemption) => (
                <button
                  key={redemption.id}
                  onClick={() => setShowRedemptionDetail(redemption)}
                  className="w-full p-4 text-left hover:bg-slate-700/30 transition-colors"
                >
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
                </button>
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
                <span className="px-2 py-1 text-xs bg-purple-500/30 text-purple-300 rounded-full flex items-center gap-1">
                  <Star size={12} /> Current
                </span>
              </div>
              <p className="text-purple-200 text-sm">Up to 10 active offers • Priority placement • Analytics dashboard</p>
            </div>
            <button 
              onClick={() => toast('Upgrade to Enterprise for unlimited offers!')}
              className="bg-purple-500 hover:bg-purple-600 text-white font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <Zap size={18} /> Upgrade to Enterprise
            </button>
          </div>
        </div>

        {/* Quick Tips */}
        <div className="mt-6 bg-slate-800 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Tips to Increase Redemptions</h3>
            <button 
              onClick={() => toast('Opening help center...')}
              className="text-slate-400 hover:text-white flex items-center gap-1 text-sm"
            >
              <HelpCircle size={16} /> Help Center
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10', title: 'Lower Gem Requirements', desc: 'Offers under 75 Gems see 40% more redemptions' },
              { icon: Calendar, color: 'text-blue-400', bg: 'bg-blue-500/10', title: 'Time-Limited Offers', desc: 'Create urgency with expiration dates' },
              { icon: Target, color: 'text-purple-400', bg: 'bg-purple-500/10', title: 'Bundle Deals', desc: 'Combine products for higher perceived value' },
            ].map((tip, i) => (
              <button 
                key={i}
                onClick={() => toast(`Tip: ${tip.title}`)}
                className={`${tip.bg} rounded-lg p-4 text-left hover:opacity-80 transition-opacity`}
              >
                <tip.icon className={tip.color} size={20} />
                <p className="text-white text-sm font-medium mt-2">{tip.title}</p>
                <p className="text-slate-400 text-xs mt-1">{tip.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
