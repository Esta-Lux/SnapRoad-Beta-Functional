// Partners & Campaigns Management Tab
// =============================================

import { useState, useEffect, useMemo } from 'react'
import { Search, Building2, Plus, Edit2, Trash2, Check, X, TrendingUp, Gift } from 'lucide-react'
import { Partner } from '@/types/admin'

interface PartnersTabProps {
  theme: 'dark' | 'light'
}

const API_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || ''

export default function PartnersTab({ theme }: PartnersTabProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    loadPartners()
  }, [])

  const loadPartners = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/admin/partners`)
      const data = await res.json()
      if (data.success) {
        setPartners(data.data)
      }
    } catch (error) {
      console.error('Failed to load partners:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (partnerId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/partners/${partnerId}/approve`, {
        method: 'POST'
      })
      const data = await res.json()
      if (data.success) {
        setFeedback({ type: 'success', message: 'Partner approved successfully!' })
        loadPartners() // Refresh the list
        setTimeout(() => setFeedback(null), 3000)
      } else {
        setFeedback({ type: 'error', message: 'Failed to approve partner' })
        setTimeout(() => setFeedback(null), 3000)
      }
    } catch (error) {
      console.error('Failed to approve partner:', error)
      setFeedback({ type: 'error', message: 'Network error while approving partner' })
      setTimeout(() => setFeedback(null), 3000)
    }
  }

  const handleSuspend = async (partnerId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/partners/${partnerId}/suspend`, {
        method: 'POST'
      })
      const data = await res.json()
      if (data.success) {
        setFeedback({ type: 'success', message: 'Partner suspended successfully!' })
        loadPartners() // Refresh the list
        setTimeout(() => setFeedback(null), 3000)
      } else {
        setFeedback({ type: 'error', message: 'Failed to suspend partner' })
        setTimeout(() => setFeedback(null), 3000)
      }
    } catch (error) {
      console.error('Failed to suspend partner:', error)
      setFeedback({ type: 'error', message: 'Network error while suspending partner' })
      setTimeout(() => setFeedback(null), 3000)
    }
  }

  const handleDelete = async (partnerId: string) => {
    if (!confirm('Are you sure you want to delete this partner?')) return
    
    try {
      const res = await fetch(`${API_URL}/api/admin/partners/${partnerId}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (data.success) {
        setFeedback({ type: 'success', message: 'Partner deleted successfully!' })
        loadPartners() // Refresh the list
        setTimeout(() => setFeedback(null), 3000)
      } else {
        setFeedback({ type: 'error', message: 'Failed to delete partner' })
        setTimeout(() => setFeedback(null), 3000)
      }
    } catch (error) {
      console.error('Failed to delete partner:', error)
      setFeedback({ type: 'error', message: 'Network error while deleting partner' })
      setTimeout(() => setFeedback(null), 3000)
    }
  }

  const handleEditPartner = async (partnerId: string) => {
    try {
      // In a real app, this would open an edit modal
      console.log(`Editing partner ${partnerId}`)
    } catch (error) {
      console.error('Failed to edit partner:', error)
    }
  }

  const handleViewOffers = async (partnerId: string) => {
    try {
      // In a real app, this would navigate to offers page
      console.log(`Viewing offers for partner ${partnerId}`)
    } catch (error) {
      console.error('Failed to view partner offers:', error)
    }
  }

  const filteredPartners = useMemo(() => {
    return partners.filter(partner => {
      const matchesSearch = partner.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           partner.email.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'All Status' || partner.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [partners, searchTerm, statusFilter])

  const isDark = theme === 'dark'
  const card = isDark ? 'bg-slate-800/50 border-white/[0.08]' : 'bg-white border-[#E6ECF5]'

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400'
      case 'pending': return 'bg-yellow-500/20 text-yellow-400'
      case 'suspended': return 'bg-red-500/20 text-red-400'
      default: return 'bg-slate-500/20 text-slate-400'
    }
  }

  const getBusinessTypeIcon = (type: string) => {
    switch (type) {
      case 'fuel': return '⛽'
      case 'cafe': return '☕'
      case 'restaurant': return '🍔'
      case 'carwash': return '🚗'
      case 'retail': return '🛒'
      case 'entertainment': return '🎬'
      default: return '🏢'
    }
  }

  return (
    <div className="space-y-6">
      {/* Feedback Toast */}
      {feedback && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg border ${
          feedback.type === 'success' 
            ? 'bg-green-500/20 border-green-500/30 text-green-400' 
            : 'bg-red-500/20 border-red-500/30 text-red-400'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <Check size={16} /> : <X size={16} />}
            <span>{feedback.message}</span>
          </div>
        </div>
      )}

      {/* Header with Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <Building2 className="text-emerald-400" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{partners.length}</div>
              <div className="text-xs text-slate-400">Total Partners</div>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Check className="text-green-400" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{partners.filter(p => p.status === 'active').length}</div>
              <div className="text-xs text-slate-400">Active</div>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-yellow-400" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{partners.filter(p => p.status === 'pending').length}</div>
              <div className="text-xs text-slate-400">Pending</div>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Gift className="text-purple-400" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">247</div>
              <div className="text-xs text-slate-400">Active Offers</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={`p-4 rounded-xl border ${card}`}>
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search partners by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'
              } placeholder-slate-500`}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`px-4 py-2 rounded-lg border ${
              isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'
            }`}
          >
            <option value="All Status">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
          </select>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-400 hover:to-pink-400"
          >
            <Plus size={18} />
            Add Partner
          </button>
        </div>
      </div>

      {/* Partners Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPartners.map((partner) => (
          <div key={partner.id} className={`p-5 rounded-xl border ${card} hover:shadow-lg transition-all`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center text-2xl">
                  {getBusinessTypeIcon(partner.business_type)}
                </div>
                <div>
                  <h3 className="font-semibold text-white">{partner.business_name}</h3>
                  <p className="text-xs text-slate-400">{partner.email}</p>
                </div>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(partner.status)}`}>
                {partner.status.charAt(0).toUpperCase() + partner.status.slice(1)}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Business Type</span>
                <span className="text-white capitalize">{partner.business_type}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Member Since</span>
                <span className="text-white">{new Date(partner.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Active Offers</span>
                <span className="text-white">{Math.floor(Math.random() * 20) + 5}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Total Redemptions</span>
                <span className="text-white">{Math.floor(Math.random() * 500) + 100}</span>
              </div>
            </div>

            <div className="flex gap-2 mt-4 pt-4 border-t border-slate-700/50">
              <button 
                onClick={() => handleEditPartner(partner.id)}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 text-sm"
              >
                <Edit2 size={14} />
                Edit
              </button>
              <button 
                onClick={() => handleViewOffers(partner.id)}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 text-sm"
              >
                <Gift size={14} />
                Offers
              </button>
              {partner.status === 'active' && (
                <button 
                  onClick={() => handleSuspend(partner.id)}
                  className="flex items-center justify-center gap-1 px-3 py-2 bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30 text-sm"
                >
                  <X size={14} />
                  Suspend
                </button>
              )}
              {partner.status === 'pending' && (
                <>
                  <button 
                    onClick={() => handleApprove(partner.id)}
                    className="flex items-center justify-center gap-1 px-3 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 text-sm"
                  >
                    <Check size={14} />
                  </button>
                  <button 
                    onClick={() => handleDelete(partner.id)}
                    className="flex items-center justify-center gap-1 px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 text-sm"
                  >
                    <X size={14} />
                  </button>
                </>
              )}
              {partner.status === 'suspended' && (
                <button 
                  onClick={() => handleApprove(partner.id)}
                  className="flex items-center justify-center gap-1 px-3 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 text-sm"
                >
                  <Check size={14} />
                  Reactivate
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredPartners.length === 0 && (
        <div className={`text-center py-12 rounded-xl border ${card}`}>
          <Building2 className="mx-auto text-slate-400 mb-4" size={48} />
          <p className="text-slate-400">No partners found matching your filters</p>
        </div>
      )}

      {/* Create Partner Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`w-full max-w-md p-6 rounded-xl border ${card}`}>
            <h3 className="text-xl font-semibold text-white mb-4">Create New Partner</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Business Name"
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'
                }`}
              />
              <input
                type="email"
                placeholder="Email"
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'
                }`}
              />
              <input
                type="text"
                placeholder="Business Type"
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'
                }`}
              />
              <input
                type="text"
                placeholder="Address"
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'
                }`}
              />
              <input
                type="tel"
                placeholder="Phone"
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'
                }`}
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className={`flex-1 px-4 py-2 rounded-lg border ${
                  isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-400 hover:to-pink-400"
              >
                Create Partner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
