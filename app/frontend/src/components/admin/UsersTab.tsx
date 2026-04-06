// Users & Families Management Tab
// =============================================

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Search, Users, Edit2, Trash2, Shield, TrendingUp, Download, Gift } from 'lucide-react'
import { adminApi } from '@/services/adminApi'
import type { AdminUser } from '@/types/admin'
import GrantPromotionModal from '@/components/admin/GrantPromotionModal'
import { adminApiErrorMessage } from '@/lib/adminApiError'

interface UsersTabProps {
  theme: 'dark' | 'light'
}

/** Matches backend sb_get_platform_stats premium counting (incl. admin promo merge). */
function isEffectivePremium(u: AdminUser): boolean {
  const p = (u.plan || '').toLowerCase()
  return Boolean(u.is_premium) || p === 'premium' || p === 'family'
}

function roleBadge(role: string | undefined): { label: string; pill: string } {
  const r = (role || 'driver').toLowerCase()
  if (r === 'partner') return { label: 'Partner', pill: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/25' }
  if (r === 'admin' || r === 'super_admin') return { label: 'Admin', pill: 'bg-amber-500/15 text-amber-300 border-amber-500/25' }
  return { label: 'Driver', pill: 'bg-slate-500/15 text-slate-300 border-white/10' }
}

function num(v: unknown, fallback = 0): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

export default function UsersTab({ theme }: UsersTabProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [planFilter, setPlanFilter] = useState('All Plans')
  const [roleFilter, setRoleFilter] = useState('All roles')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [promoOpen, setPromoOpen] = useState(false)
  const [editUser, setEditUser] = useState<AdminUser | null>(null)
  const [editName, setEditName] = useState('')
  const [editBusy, setEditBusy] = useState(false)
  const [planConfirm, setPlanConfirm] = useState<{
    user: AdminUser
    next: 'basic' | 'premium' | 'family'
  } | null>(null)

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
      const res = await adminApi.getUsers(500)
      if (res.success && res.data) {
        setUsers(res.data)
      }
    } catch (error) {
      console.error('Failed to load users:', error)
      showFeedback('error', adminApiErrorMessage(error, 'Failed to load users'))
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
      showFeedback('error', adminApiErrorMessage(error, 'Failed to activate user'))
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
      showFeedback('error', adminApiErrorMessage(error, 'Failed to delete user'))
    }
  }

  const applyPlanChange = async (userId: string, plan: 'basic' | 'premium' | 'family') => {
    try {
      const res = await adminApi.updateUser(userId, {
        plan,
        is_premium: plan !== 'basic',
      })
      if (res.success) {
        showFeedback('success', `User plan updated to ${plan}`)
        void loadUsers()
      }
    } catch (e) {
      showFeedback('error', adminApiErrorMessage(e, 'Failed to update user plan'))
    }
  }

  const saveEditUser = async () => {
    if (!editUser) return
    setEditBusy(true)
    try {
      const trimmed = editName.trim() || editUser.name
      const res = await adminApi.updateUser(editUser.id, { name: trimmed, full_name: trimmed })
      if (res.success) {
        showFeedback('success', 'Profile updated')
        setEditUser(null)
        void loadUsers()
      } else {
        showFeedback('error', 'Failed to update user')
      }
    } catch (e) {
      showFeedback('error', adminApiErrorMessage(e, 'Failed to update user'))
    } finally {
      setEditBusy(false)
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
      const r = (user.role || 'driver').toLowerCase()
      const matchesRole =
        roleFilter === 'All roles' ||
        (roleFilter === 'driver' && r === 'driver') ||
        (roleFilter === 'partner' && r === 'partner') ||
        (roleFilter === 'admin' && (r === 'admin' || r === 'super_admin'))
      return matchesSearch && matchesPlan && matchesStatus && matchesRole
    })
  }, [users, searchTerm, planFilter, statusFilter, roleFilter])

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

  const avgSafety =
    users.length > 0
      ? Math.round(users.reduce((acc, u) => acc + num(u.safety_score), 0) / users.length)
      : 0
  const premiumCount = users.filter(isEffectivePremium).length

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
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className={`text-2xl font-bold ${textPrimary}`}>{users.length}</div>
          <div className={`text-xs ${textSecondary}`}>Total Users</div>
        </div>
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className={`text-2xl font-bold ${textPrimary}`}>{premiumCount}</div>
          <div className={`text-xs ${textSecondary}`}>Premium / Family (effective)</div>
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

      <p className={`text-xs ${textSecondary} px-1`}>
        Plan column is the <strong className={textPrimary}>driver app</strong> subscription (Basic / Premium / Family).
        Partner billing (Starter / Growth) is managed under <strong className={textPrimary}>Partners</strong>; changing a user here also syncs an active subscription to their linked partner account when they have a partner ID.
      </p>

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
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className={`px-4 py-2 rounded-lg border ${
              isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'
            }`}
          >
            <option value="All roles">All roles</option>
            <option value="driver">Drivers only</option>
            <option value="partner">Partners only</option>
            <option value="admin">Admins only</option>
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
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Role</th>
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
                      <div className={`text-sm font-medium ${textPrimary}`}>{user.name || '—'}</div>
                      <div className={`text-xs ${textSecondary}`}>{user.email}</div>
                      {user.partner_id ? (
                        <div className={`text-[10px] mt-0.5 ${textSecondary}`}>
                          Partner login · business id <code className="opacity-80">{String(user.partner_id).slice(0, 8)}…</code>
                        </div>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-0.5 text-xs rounded-md border ${roleBadge(user.role).pill}`}
                      title={
                        (user.role || '').toLowerCase() === 'partner'
                          ? 'Uses partner portal; comp business subscription on Partners tab'
                          : 'Driver-app profile; comp Premium/Family from this tab'
                      }
                    >
                      {roleBadge(user.role).label}
                    </span>
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
                    {(user.plan_entitlement_source || '').toLowerCase() === 'admin' && (
                      <div className={`text-[10px] mt-1 text-amber-400/90`}>
                        Admin-managed tier (in-app downgrade blocked)
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-16 rounded-full h-2 ${isDark ? 'bg-slate-700/50' : 'bg-slate-200'}`}>
                        <div
                          className={`h-2 rounded-full ${
                            num(user.safety_score) >= 90 ? 'bg-green-500' :
                            num(user.safety_score) >= 80 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, num(user.safety_score)))}%` }}
                        />
                      </div>
                      <span className={`text-sm ${textPrimary}`}>{num(user.safety_score)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <span className="text-amber-400">💎</span>
                      <span className={`text-sm ${textPrimary}`}>{num(user.gems).toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm ${textPrimary}`}>Level {num(user.level, 0)}</span>
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
                      <button
                        type="button"
                        onClick={() => {
                          setEditUser(user)
                          setEditName(user.name || '')
                        }}
                        className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
                        title="Edit display name"
                      >
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
                          type="button"
                          onClick={() => setPlanConfirm({ user, next: 'premium' })}
                          className="px-2 py-1 rounded hover:bg-white/10 text-xs text-purple-300"
                          title="Make premium"
                        >
                          Premium
                        </button>
                      )}
                      {user.plan !== 'family' && (
                        <button
                          type="button"
                          onClick={() => setPlanConfirm({ user, next: 'family' })}
                          className="px-2 py-1 rounded hover:bg-white/10 text-xs text-blue-300"
                          title="Set family plan"
                        >
                          Family
                        </button>
                      )}
                      {user.plan !== 'basic' && (
                        <button
                          type="button"
                          onClick={() => setPlanConfirm({ user, next: 'basic' })}
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

      {planConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60">
          <div className={`w-full max-w-md rounded-2xl border shadow-xl p-6 ${card}`}>
            <h3 className={`text-lg font-semibold ${textPrimary}`}>Change plan?</h3>
            <p className={`text-sm mt-2 ${textSecondary}`}>
              Set <strong className={textPrimary}>{planConfirm.user.email}</strong> to{' '}
              <strong className={textPrimary}>{planConfirm.next}</strong>. This updates the driver-app subscription
              fields on their profile immediately.
            </p>
            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={() => setPlanConfirm(null)}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-medium ${
                  isDark ? 'border-white/15 text-slate-300' : 'border-[#E6ECF5] text-[#4B5C74]'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const { user, next } = planConfirm
                  setPlanConfirm(null)
                  void applyPlanChange(user.id, next)
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {editUser && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60">
          <div className={`w-full max-w-md rounded-2xl border shadow-xl p-6 ${card}`}>
            <h3 className={`text-lg font-semibold ${textPrimary}`}>Edit user</h3>
            <p className={`text-xs mt-1 ${textSecondary}`}>{editUser.email}</p>
            <label htmlFor="admin-edit-user-name" className={`block text-xs font-medium mt-4 mb-1 ${textSecondary}`}>
              Display name
            </label>
            <input
              id="admin-edit-user-name"
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${
                isDark ? 'bg-slate-800 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'
              }`}
            />
            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={() => setEditUser(null)}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-medium ${
                  isDark ? 'border-white/15 text-slate-300' : 'border-[#E6ECF5] text-[#4B5C74]'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={editBusy}
                onClick={() => void saveEditUser()}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold disabled:opacity-50"
              >
                {editBusy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
