// Platform Analytics Tab
// =============================================

import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Users, Building2, Gift, Activity, Download, Calendar } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { adminApi } from '@/services/adminApi'
import type { AdminStats } from '@/types/admin'

interface AnalyticsTabProps {
  theme: 'dark' | 'light'
}

export default function AnalyticsTab({ theme }: AnalyticsTabProps) {
  const [dateRange, setDateRange] = useState('7d')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    setLoading(true)
    try {
      const res = await adminApi.getStats()
      if (res.success && res.data) {
        setStats(res.data)
      }
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const userGrowthData = [
    { date: 'W1', users: stats ? Math.round((stats.total_users || 0) * 0.85) : 0, newUsers: 120, activeUsers: stats ? Math.round((stats.total_users || 0) * 0.65) : 0 },
    { date: 'W2', users: stats ? Math.round((stats.total_users || 0) * 0.88) : 0, newUsers: 135, activeUsers: stats ? Math.round((stats.total_users || 0) * 0.67) : 0 },
    { date: 'W3', users: stats ? Math.round((stats.total_users || 0) * 0.90) : 0, newUsers: 142, activeUsers: stats ? Math.round((stats.total_users || 0) * 0.69) : 0 },
    { date: 'W4', users: stats ? Math.round((stats.total_users || 0) * 0.93) : 0, newUsers: 128, activeUsers: stats ? Math.round((stats.total_users || 0) * 0.70) : 0 },
    { date: 'W5', users: stats ? Math.round((stats.total_users || 0) * 0.95) : 0, newUsers: 156, activeUsers: stats ? Math.round((stats.total_users || 0) * 0.71) : 0 },
    { date: 'W6', users: stats ? Math.round((stats.total_users || 0) * 0.97) : 0, newUsers: 168, activeUsers: stats ? Math.round((stats.total_users || 0) * 0.72) : 0 },
    { date: 'W7', users: stats?.total_users || 0, newUsers: 145, activeUsers: stats ? Math.round((stats.total_users || 0) * 0.73) : 0 },
  ]

  const revenueData = [
    { month: 'Jan', revenue: 45000, redemptions: Math.round((stats?.total_redemptions || 0) * 0.7) },
    { month: 'Feb', revenue: 52000, redemptions: Math.round((stats?.total_redemptions || 0) * 0.8) },
    { month: 'Mar', revenue: 58000, redemptions: Math.round((stats?.total_redemptions || 0) * 0.9) },
    { month: 'Apr', revenue: 64000, redemptions: stats?.total_redemptions || 0 },
  ]

  const partnerDistribution = [
    { name: 'Fuel Stations', value: 45, color: '#8b5cf6' },
    { name: 'Restaurants', value: 25, color: '#3b82f6' },
    { name: 'Retail', value: 15, color: '#10b981' },
    { name: 'Services', value: 10, color: '#f59e0b' },
    { name: 'Entertainment', value: 5, color: '#ef4444' },
  ]

  const isDark = theme === 'dark'
  const card = isDark ? 'bg-slate-800/50 border-white/[0.08]' : 'bg-white border-[#E6ECF5]'
  const textPrimary = isDark ? 'text-white' : 'text-[#0B1220]'
  const textSecondary = isDark ? 'text-slate-400' : 'text-[#4B5C74]'
  const chartGrid = isDark ? '#334155' : '#E6ECF5'
  const chartText = isDark ? '#64748b' : '#94a3b8'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Users className="text-blue-400" size={20} />
            </div>
            <div>
              <div className={`text-2xl font-bold ${textPrimary}`}>{(stats?.total_users || 0).toLocaleString()}</div>
              <div className={`text-xs ${textSecondary}`}>Total Users</div>
            </div>
          </div>
          <div className={`mt-2 text-xs ${textSecondary}`}>{(stats?.total_users || 0).toLocaleString()} total</div>
        </div>
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <Building2 className="text-emerald-400" size={20} />
            </div>
            <div>
              <div className={`text-2xl font-bold ${textPrimary}`}>{(stats?.active_partners || 0).toLocaleString()}</div>
              <div className={`text-xs ${textSecondary}`}>Active Partners</div>
            </div>
          </div>
          <div className={`mt-2 text-xs ${textSecondary}`}>{(stats?.total_partners || 0).toLocaleString()} total</div>
        </div>
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Gift className="text-purple-400" size={20} />
            </div>
            <div>
              <div className={`text-2xl font-bold ${textPrimary}`}>{(stats?.total_offers || 0).toLocaleString()}</div>
              <div className={`text-xs ${textSecondary}`}>Active Offers</div>
            </div>
          </div>
          <div className={`mt-2 text-xs ${textSecondary}`}>Across all partners</div>
        </div>
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <Activity className="text-amber-400" size={20} />
            </div>
            <div>
              <div className={`text-2xl font-bold ${textPrimary}`}>{(stats?.total_redemptions || 0).toLocaleString()}</div>
              <div className={`text-xs ${textSecondary}`}>Total Redemptions</div>
            </div>
          </div>
          <div className={`mt-2 text-xs ${textSecondary}`}>{(stats?.total_trips || 0).toLocaleString()} trips</div>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className={`p-4 rounded-xl border ${card}`}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className={textSecondary} size={18} />
            <span className={`${textPrimary} font-medium`}>Date Range</span>
          </div>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className={`px-4 py-2 rounded-lg border ${
              isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'
            }`}
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30">
            <Download size={18} />
            Export Report
          </button>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        <div className={`p-5 rounded-xl border ${card}`}>
          <h3 className={`text-lg font-semibold ${textPrimary} mb-4`}>User Growth</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={userGrowthData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
              <XAxis dataKey="date" stroke={chartText} fontSize={12} />
              <YAxis stroke={chartText} fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? '#1e293b' : '#fff',
                  border: `1px solid ${isDark ? '#334155' : '#E6ECF5'}`,
                  borderRadius: '8px',
                  color: isDark ? '#fff' : '#0B1220',
                }}
              />
              <Line type="monotone" dataKey="users" stroke="#8b5cf6" strokeWidth={2} />
              <Line type="monotone" dataKey="newUsers" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="activeUsers" stroke="#f59e0b" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className={`p-5 rounded-xl border ${card}`}>
          <h3 className={`text-lg font-semibold ${textPrimary} mb-4`}>Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
              <XAxis dataKey="month" stroke={chartText} fontSize={12} />
              <YAxis stroke={chartText} fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? '#1e293b' : '#fff',
                  border: `1px solid ${isDark ? '#334155' : '#E6ECF5'}`,
                  borderRadius: '8px',
                  color: isDark ? '#fff' : '#0B1220',
                }}
              />
              <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Partner Distribution & Key Metrics */}
      <div className="grid grid-cols-2 gap-6">
        <div className={`p-5 rounded-xl border ${card}`}>
          <h3 className={`text-lg font-semibold ${textPrimary} mb-4`}>Partner Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={partnerDistribution}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {partnerDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className={`p-5 rounded-xl border ${card}`}>
          <h3 className={`text-lg font-semibold ${textPrimary} mb-4`}>Key Metrics</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className={textSecondary}>Premium Users</span>
              <span className={`${textPrimary} font-medium`}>{(stats?.premium_users || 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={textSecondary}>Total Partners</span>
              <span className={`${textPrimary} font-medium`}>{(stats?.total_partners || 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={textSecondary}>Total Trips</span>
              <span className={`${textPrimary} font-medium`}>{(stats?.total_trips || 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={textSecondary}>Total Gems</span>
              <span className={`${textPrimary} font-medium`}>{(stats?.total_gems || 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={textSecondary}>MRR</span>
              <span className={`${textPrimary} font-medium`}>
                ${(stats?.total_mrr || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
