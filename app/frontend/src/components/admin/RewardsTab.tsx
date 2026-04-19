// Rewards & Vouchers Tab
// =============================================

import { useState, useEffect, useMemo } from 'react'
import { Search, Plus, Gift, Users, Calendar, Edit2, Trash2, Star } from 'lucide-react'
import { adminApi } from '@/services/adminApi'
import type { Reward } from '@/types/admin'
import { adminApiErrorMessage } from '@/lib/adminApiError'

interface RewardsTabProps {
  theme: 'dark' | 'light'
}

export default function RewardsTab({ theme }: RewardsTabProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('All Types')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [rewards, setRewards] = useState<Reward[]>([])
  const [newReward, setNewReward] = useState({ name: '', type: 'voucher' as string, value: 0, gems_cost: 0, description: '', total: 100 })
  const [editingReward, setEditingReward] = useState<Reward | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)

  useEffect(() => {
    loadRewards()
  }, [])

  const loadRewards = async () => {
    setLoading(true)
    setListError(null)
    try {
      const res = await adminApi.getRewards()
      if (res.success && res.data) {
        setRewards(res.data)
      } else {
        setListError(res.message || 'Failed to load rewards')
      }
    } catch (error) {
      console.error('Failed to load rewards:', error)
      setListError(adminApiErrorMessage(error, 'Failed to load rewards'))
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    try {
      const res = await adminApi.createReward(newReward)
      if (res.success) {
        setNewReward({ name: '', type: 'voucher', value: 0, gems_cost: 0, description: '', total: 100 })
        setShowCreateModal(false)
        loadRewards()
      }
    } catch (error) {
      console.error('Failed to create reward:', error)
    }
  }

  const handleEdit = async () => {
    if (!editingReward) return
    try {
      const res = await adminApi.updateReward(editingReward.id, editingReward)
      if (res.success) {
        setEditingReward(null)
        setShowEditModal(false)
        loadRewards()
      }
    } catch (error) {
      console.error('Failed to update reward:', error)
    }
  }

  const handleDelete = async (rewardId: string) => {
    if (!confirm('Are you sure you want to delete this reward?')) return
    try {
      const res = await adminApi.deleteReward(rewardId)
      if (res.success) {
        loadRewards()
      }
    } catch (error) {
      console.error('Failed to delete reward:', error)
    }
  }

  const filteredRewards = useMemo(() => {
    return rewards.filter(reward => {
      const matchesSearch = (reward.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (reward.description || '').toLowerCase().includes(searchTerm.toLowerCase())
      const matchesType = typeFilter === 'All Types' || reward.type === typeFilter
      const matchesStatus = statusFilter === 'All Status' || reward.status === statusFilter
      return matchesSearch && matchesType && matchesStatus
    })
  }, [rewards, searchTerm, typeFilter, statusFilter])

  const isDark = theme === 'dark'
  const card = isDark ? 'bg-slate-800/50 border-white/[0.08]' : 'bg-white border-[#E6ECF5]'
  const textPrimary = isDark ? 'text-white' : 'text-[#0B1220]'
  const textSecondary = isDark ? 'text-slate-400' : 'text-[#4B5C74]'

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'voucher': return 'bg-purple-500/20 text-purple-400'
      case 'discount': return 'bg-green-500/20 text-green-400'
      case 'gems': return 'bg-amber-500/20 text-amber-400'
      default: return 'bg-slate-500/20 text-slate-400'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400'
      case 'expired': return 'bg-red-500/20 text-red-400'
      case 'scheduled': return 'bg-blue-500/20 text-blue-400'
      default: return 'bg-slate-500/20 text-slate-400'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'voucher': return '🎫'
      case 'discount': return '💰'
      case 'gems': return '💎'
      default: return '🎁'
    }
  }

  return (
    <div className="space-y-6">
      {listError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{listError}</div>
      )}
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <Gift className="text-purple-400" size={20} />
            <div>
              <div className={`text-2xl font-bold ${textPrimary}`}>{rewards.length}</div>
              <div className={`text-xs ${textSecondary}`}>Gems Catalog</div>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <Star className="text-amber-400" size={20} />
            <div>
              <div className={`text-2xl font-bold ${textPrimary}`}>{rewards.filter(r => r.status === 'active' && r.type === 'voucher').length}</div>
              <div className={`text-xs ${textSecondary}`}>Active Vouchers</div>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <Users className="text-green-400" size={20} />
            <div>
              <div className={`text-2xl font-bold ${textPrimary}`}>{rewards.reduce((acc, r) => acc + (r.claimed || 0), 0)}</div>
              <div className={`text-xs ${textSecondary}`}>Redeemed 30d</div>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <Calendar className="text-blue-400" size={20} />
            <div>
              <div className={`text-2xl font-bold ${textPrimary}`}>{rewards.filter(r => r.status === 'active').length}</div>
              <div className={`text-xs ${textSecondary}`}>Active</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={`p-4 rounded-xl border ${card}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search rewards..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'
              } placeholder-slate-500`}
            />
          </div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
            className={`px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'}`}>
            <option value="All Types">All Types</option>
            <option value="voucher">Vouchers</option>
            <option value="discount">Discounts</option>
            <option value="gems">Gems</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className={`px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'}`}>
            <option value="All Status">All Status</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="scheduled">Scheduled</option>
          </select>
          <button onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-400 hover:to-pink-400">
            <Plus size={18} />
            Create Reward
          </button>
        </div>
      </div>

      {/* Rewards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRewards.map((reward) => (
          <div key={reward.id} className={`p-5 rounded-xl border ${card} hover:shadow-lg transition-all`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-2xl">
                  {getTypeIcon(reward.type)}
                </div>
                <div>
                  <h3 className={`font-semibold ${textPrimary}`}>{reward.name}</h3>
                  <p className={`text-xs ${textSecondary}`}>{reward.description}</p>
                </div>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(reward.status)}`}>
                {(reward.status || '').charAt(0).toUpperCase() + (reward.status || '').slice(1)}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className={textSecondary}>Type</span>
                <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(reward.type)}`}>
                  {(reward.type || '').charAt(0).toUpperCase() + (reward.type || '').slice(1)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className={textSecondary}>Value</span>
                <span className={textPrimary}>{reward.value}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className={textSecondary}>Claimed</span>
                <div className="flex items-center gap-2">
                  <div className={`w-16 rounded-full h-2 ${isDark ? 'bg-slate-700/50' : 'bg-slate-200'}`}>
                    <div className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                      style={{ width: `${reward.total > 0 ? ((reward.claimed || 0) / reward.total) * 100 : 0}%` }} />
                  </div>
                  <span className={textPrimary}>{reward.claimed || 0}/{reward.total}</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className={textSecondary}>Expires</span>
                <span className={textPrimary}>{reward.expires_at ? new Date(reward.expires_at).toLocaleDateString() : 'No expiry'}</span>
              </div>
            </div>

            <div className="flex gap-2 mt-4 pt-4 border-t border-slate-700/50">
              <button onClick={() => { setEditingReward(reward); setShowEditModal(true) }}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 text-sm">
                <Edit2 size={14} /> Edit
              </button>
              <button onClick={() => handleDelete(reward.id)}
                className="flex items-center justify-center gap-1 px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 text-sm">
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredRewards.length === 0 && !loading && (
        <div className={`text-center py-12 rounded-xl border ${card}`}>
          <Gift className="mx-auto text-slate-400 mb-4" size={48} />
          <p className="text-slate-400">No rewards found matching your filters</p>
        </div>
      )}

      {/* Create Reward Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`w-full max-w-md p-6 rounded-xl border ${card}`}>
            <h3 className={`text-xl font-semibold ${textPrimary} mb-4`}>Create New Reward</h3>
            <div className="space-y-4">
              <input type="text" placeholder="Reward Name" value={newReward.name}
                onChange={(e) => setNewReward({...newReward, name: e.target.value})}
                className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'}`} />
              <select value={newReward.type} onChange={(e) => setNewReward({...newReward, type: e.target.value})}
                className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'}`}>
                <option value="voucher">Voucher</option>
                <option value="discount">Discount</option>
                <option value="gems">Gems</option>
              </select>
              <input type="number" placeholder="Value" value={newReward.value}
                onChange={(e) => setNewReward({...newReward, value: parseFloat(e.target.value)})}
                className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'}`} />
              <input type="number" placeholder="Gems Cost" value={newReward.gems_cost}
                onChange={(e) => setNewReward({...newReward, gems_cost: parseInt(e.target.value)})}
                className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'}`} />
              <textarea placeholder="Description" value={newReward.description}
                onChange={(e) => setNewReward({...newReward, description: e.target.value})}
                className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'}`} rows={3} />
              <input type="number" placeholder="Total Available" value={newReward.total}
                onChange={(e) => setNewReward({...newReward, total: parseInt(e.target.value)})}
                className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'}`} />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreateModal(false)}
                className={`flex-1 px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'}`}>
                Cancel
              </button>
              <button onClick={handleCreate}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-400 hover:to-pink-400">
                Create Reward
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Reward Modal */}
      {showEditModal && editingReward && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`w-full max-w-md p-6 rounded-xl border ${card}`}>
            <h3 className={`text-xl font-semibold ${textPrimary} mb-4`}>Edit Reward</h3>
            <div className="space-y-4">
              <input type="text" value={editingReward.name}
                onChange={(e) => setEditingReward({...editingReward, name: e.target.value})}
                className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'}`} />
              <select value={editingReward.type}
                onChange={(e) => setEditingReward({...editingReward, type: e.target.value})}
                className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'}`}>
                <option value="voucher">Voucher</option>
                <option value="discount">Discount</option>
                <option value="gems">Gems</option>
              </select>
              <input type="number" value={editingReward.value}
                onChange={(e) => setEditingReward({...editingReward, value: parseFloat(e.target.value)})}
                className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'}`} />
              <textarea value={editingReward.description}
                onChange={(e) => setEditingReward({...editingReward, description: e.target.value})}
                className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'}`} rows={3} />
              <input type="number" value={editingReward.total}
                onChange={(e) => setEditingReward({...editingReward, total: parseInt(e.target.value)})}
                className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'}`} />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowEditModal(false)}
                className={`flex-1 px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'}`}>
                Cancel
              </button>
              <button onClick={handleEdit}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-400 hover:to-pink-400">
                Update Reward
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
