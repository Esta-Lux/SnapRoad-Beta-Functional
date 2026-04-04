// Users & Families Management Tab
// =============================================

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Search, Users, Edit2, Trash2, Shield, TrendingUp, Download, Gift } from 'lucide-react'
import { adminApi } from '@/services/adminApi'
import type { AdminUser } from '@/types/admin'
import GrantPromotionModal from '@/components/admin/GrantPromotionModal'

interface UsersTabProps {
  theme: 'dark' | 'light'
}

export default function UsersTab({ theme }: UsersTabProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [planFilter, setPlanFilter] = useState('All Plans')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [promoOpen, setPromoOpen] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const res = await adminApi.getUsers()
      if (res.success && res.data) {
        setUsers(res.data)
      }
    } catch (error) {
      console.error('Failed to load users:', error)
    } finally {
      setLoading(false)
    }
  }

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message })
    setTimeout(() => setFeedback(null), 3000)
  }

  const handleSuspendUser = async (userId: string) => {
    try {
      const res = await adminApi.suspendUser(userId)
      if (res.success) {
        showFeedback('success', 'User suspended')
        loadUsers()
      }
    } catch (error) {
      showFeedback('error', 'Failed to suspend user')
    }
  }

  const handleActivateUser = async (userId: string) => {
    try {
      const res = await adminApi.activateUser(userId)
      if (res.success) {
        showFeedback('success', 'User activated')
        loadUsers()
      }
    } catch (error) {
      showFeedback('error', 'Failed to activate user')
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return
    try {
      const res = await adminApi.deleteUser(userId)
      if (res.success) {
        showFeedback('success', 'User deleted')
        loadUsers()
      }
    } catch (error) {
      showFeedback('error', 'Failed to delete user')
    }
  }

  const handleSetPlan = async (userId: string, plan: 'basic' | 'premium' | 'family') => {
    try {
      const res = await adminApi.updateUser(userId, {
        plan,
        is_premium: plan !== 'basic',
      })
      if (res.success) {
        showFeedback('success', `User plan updated to ${plan}`)
        loadUsers()
      }
    } catch {
      showFeedback('error', 'Failed to update user plan')
    }
  }

  const handleExport = async () => {
    try {
      const res = await adminApi.exportUsers('csv')
      if (res.success && res.data) {
        const blob = new Blob([res.data as string], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'snaproad_users.csv'
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      showFeedback('error', 'Failed to export users')
    }
  }

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = (user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (user.email || '').toLowerCase().includes(searchTerm.toLowerCase())
      const matchesPlan = planFilter === 'All Plans' || user.plan === planFilter
      const matchesStatus = statusFilter === 'All Status' || user.status === statusFilter
      return matchesSearch && matchesPlan && matchesStatus
    })
  }, [users, searchTerm, planFilter, statusFilter])

  const toggleSelectAllFiltered = useCallback(() => {
    setSelectedIds((prev) => {
      const ids = filteredUsers.map((u) => u.id)
      const allOn = ids.length > 0 && ids.every((id) => prev.has(id))
      if (allOn) {
        const next = new Set(prev)
        ids.forEach((id) => next.delete(id))
        return next
      }
      return new Set([...prev, ...ids])
    })
  }, [filteredUsers])

  const isDark = theme === 'dark'
  const card = isDark ? 'bg-slate-800/50 border-white/[0.08]' : 'bg-white border-[#E6ECF5]'
  const textPrimary = isDark ? 'text-white' : 'text-[#0B1220]'
  const textSecondary = isDark ? 'text-slate-400' : 'text-[#4B5C74]'

  const avgSafety = users.length > 0
    ? Math.round(users.reduce((acc, u) => acc + (u.safety_score || 0), 0) / users.length)
    : 0

  const filteredIds = useMemo(() => filteredUsers.map((u) => u.id), [filteredUsers])
  const allFilteredSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id))

  return (
    <div className="space-y-6">
      {feedback && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg border ${
          feedback.type === 'success'
            ? 'bg-green-500/20 border-green-500/30 text-green-400'
            : 'bg-red-500/20 border-red-500/30 text-red-400'
        }`}>
          {feedback.message}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className={`text-2xl font-bold ${textPrimary}`}>{users.length}</div>
          <div className={`text-xs ${textSecondary}`}>Total Users</div>
        </div>
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className={`text-2xl font-bold ${textPrimary}`}>{users.filter(u => u.is_premium).length}</div>
          <div className={`text-xs ${textSecondary}`}>Premium Users</div>
        </div>
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className={`text-2xl font-bold ${textPrimary}`}>{avgSafety}</div>
          <div className={`text-xs ${textSecondary}`}>Avg Safety Score</div>
        </div>
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className={`text-2xl font-bold ${textPrimary}`}>{users.filter(u => u.status === 'suspended').length}</div>
          <div className={`text-xs ${textSecondary}`}>Suspended</div>
        </div>
      </div>

      {/* Filters */}
      <div className={`p-4 rounded-xl border ${card}`}>
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'
              } placeholder-slate-500`}
            />
          </div>
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className={`px-4 py-2 rounded-lg border ${
              isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'
            }`}
          >
            <option value="All Plans">All Plans</option>
            <option value="basic">Basic</option>
            <option value="premium">Premium</option>
            <option value="family">Family</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`px-4 py-2 rounded-lg border ${
              isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'
            }`}
          >
            <option value="All Status">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30"
          >
            <Download size={18} />
            Export
          </button>
          <button
            type="button"
            onClick={() => setPromoOpen(true)}
            disabled={selectedIds.size === 0}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 disabled:opacity-40"
          >
            <Gift size={18} />
            Grant promotion ({selectedIds.size})
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className={`rounded-xl border overflow-hidden ${card}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={isDark ? 'bg-slate-800/50' : 'bg-[#F8FAFC]'}>
              <tr>
                <th className="px-3 py-4 w-10">
                  <input
                    type="checkbox"
                    aria-label="Select all visible"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAllFiltered}
                    className="rounded border-slate-500"
                  />
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Plan</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Safety Score</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Gems</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Level</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filteredUsers.map((user) => (
                <tr key={user.id} className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-[#F8FAFC]'}>
                  <td className="px-3 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(user.id)}
                      onChange={() => toggleSelect(user.id)}
                      className="rounded border-slate-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className={`text-sm font-medium ${textPrimary}`}>{user.name}</div>
                      <div className={`text-xs ${textSecondary}`}>{user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      user.plan === 'premium' ? 'bg-purple-500/20 text-purple-400' :
                      user.plan === 'family' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-slate-500/20 text-slate-400'
                    }`}>
                      {user.plan ? user.plan.charAt(0).toUpperCase() + user.plan.slice(1) : 'Basic'}
                    </span>
                    {user.promotion_access_until && (
                      <div className={`text-[10px] mt-1 ${textSecondary}`}>
                        Promo until {String(user.promotion_access_until).slice(0, 10)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-16 rounded-full h-2 ${isDark ? 'bg-slate-700/50' : 'bg-slate-200'}`}>
                        <div
                          className={`h-2 rounded-full ${
                            (user.safety_score || 0) >= 90 ? 'bg-green-500' :
                            (user.safety_score || 0) >= 80 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${user.safety_score || 0}%` }}
                        />
                      </div>
                      <span className={`text-sm ${textPrimary}`}>{user.safety_score || 0}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <span className="text-amber-400">💎</span>
                      <span className={`text-sm ${textPrimary}`}>{(user.gems || 0).toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm ${textPrimary}`}>Level {user.level || 1}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      user.status === 'active' ? 'bg-green-500/20 text-green-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {user.status ? user.status.charAt(0).toUpperCase() + user.status.slice(1) : 'Active'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white">
                        <Edit2 size={16} />
                      </button>
                      {user.status === 'active' ? (
                        <button
                          onClick={() => handleSuspendUser(user.id)}
                          className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-orange-400"
                          title="Suspend user"
                        >
                          <Shield size={16} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActivateUser(user.id)}
                          className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-green-400"
                          title="Activate user"
                        >
                          <TrendingUp size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-red-400"
                        title="Delete user"
                      >
                        <Trash2 size={16} />
                      </button>
                      {user.plan !== 'premium' && (
                        <button
                          onClick={() => handleSetPlan(user.id, 'premium')}
                          className="px-2 py-1 rounded hover:bg-white/10 text-xs text-purple-300"
                          title="Make premium"
                        >
                          Premium
                        </button>
                      )}
                      {user.plan !== 'basic' && (
                        <button
                          onClick={() => handleSetPlan(user.id, 'basic')}
                          className="px-2 py-1 rounded hover:bg-white/10 text-xs text-slate-300"
                          title="Set basic"
                        >
                          Basic
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredUsers.length === 0 && !loading && (
        <div className={`text-center py-12 rounded-xl border ${card}`}>
          <Users className="mx-auto text-slate-400 mb-4" size={48} />
          <p className="text-slate-400">No users found matching your filters</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
        </div>
      )}

      <GrantPromotionModal
        open={promoOpen}
        target="users"
        selectedIds={[...selectedIds]}
        theme={theme}
        onClose={() => setPromoOpen(false)}
        onSuccess={() => {
          showFeedback('success', 'Promotion applied')
          void loadUsers()
          setSelectedIds(new Set())
        }}
      />
    </div>
  )
}
