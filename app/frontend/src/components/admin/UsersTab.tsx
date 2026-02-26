// Users & Families Management Tab
// =============================================

import { useState, useEffect, useMemo } from 'react'
import { Search, Users, Filter, Edit2, Trash2, Shield, AlertTriangle, TrendingUp } from 'lucide-react'
import { User } from '@/types/admin'

interface UsersTabProps {
  theme: 'dark' | 'light'
}

const API_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || ''

export default function UsersTab({ theme }: UsersTabProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [planFilter, setPlanFilter] = useState('All Plans')
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/admin/users`)
      const data = await res.json()
      if (data.success) {
        setUsers(data.data)
      }
    } catch (error) {
      console.error('Failed to load users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSuspendUser = async (userId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${userId}/suspend`, {
        method: 'POST'
      })
      const data = await res.json()
      if (data.success) {
        loadUsers() // Refresh the list
      }
    } catch (error) {
      console.error('Failed to suspend user:', error)
    }
  }

  const handleActivateUser = async (userId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${userId}/activate`, {
        method: 'POST'
      })
      const data = await res.json()
      if (data.success) {
        loadUsers() // Refresh the list
      }
    } catch (error) {
      console.error('Failed to activate user:', error)
    }
  }

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.email.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesPlan = planFilter === 'All Plans' || user.plan === planFilter
      const matchesStatus = statusFilter === 'All Status' || user.status === statusFilter
      return matchesSearch && matchesPlan && matchesStatus
    })
  }, [users, searchTerm, planFilter, statusFilter])

  const isDark = theme === 'dark'
  const card = isDark ? 'bg-slate-800/50 border-white/[0.08]' : 'bg-white border-[#E6ECF5]'

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Users className="text-blue-400" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{users.length}</div>
              <div className="text-xs text-slate-400">Total Users</div>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Shield className="text-green-400" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{users.filter(u => u.plan === 'premium').length}</div>
              <div className="text-xs text-slate-400">Premium Users</div>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Shield className="text-purple-400" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{Math.round(users.reduce((acc, u) => acc + u.safety_score, 0) / users.length)}</div>
              <div className="text-xs text-slate-400">Avg Safety Score</div>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <Shield className="text-amber-400" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{users.filter(u => u.status === 'suspended').length}</div>
              <div className="text-xs text-slate-400">Suspended</div>
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
        </div>
      </div>

      {/* Users Table */}
      <div className={`rounded-xl border overflow-hidden ${card}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={isDark ? 'bg-slate-800/50' : 'bg-[#F8FAFC]'}>
              <tr>
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
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-white">{user.name}</div>
                      <div className="text-xs text-slate-400">{user.email}</div>
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
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-700/50 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            user.safety_score >= 90 ? 'bg-green-500' :
                            user.safety_score >= 80 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${user.safety_score}%` }}
                        />
                      </div>
                      <span className="text-sm text-white">{user.safety_score}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <span className="text-amber-400">💎</span>
                      <span className="text-sm text-white">{user.gems.toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-white">Level {user.level}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      user.status === 'active' ? 'bg-green-500/20 text-green-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {user.status ? user.status.charAt(0).toUpperCase() + user.status.slice(1) : 'Unknown'}
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
                        >
                          <Shield size={16} />
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleActivateUser(user.id)}
                          className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-green-400"
                        >
                          <TrendingUp size={16} />
                        </button>
                      )}
                      <button className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-red-400">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredUsers.length === 0 && (
        <div className={`text-center py-12 rounded-xl border ${card}`}>
          <Users className="mx-auto text-slate-400 mb-4" size={48} />
          <p className="text-slate-400">No users found matching your filters</p>
        </div>
      )}
    </div>
  )
}
