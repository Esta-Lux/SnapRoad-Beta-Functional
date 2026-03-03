// Dashboard Overview Tab — Figma-aligned
// =============================================

import { useState, useEffect } from 'react'
import { Users, Navigation, Fuel, Building2, TrendingUp, AlertTriangle, Clock, UserPlus, CheckCircle } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { adminApi } from '@/services/adminApi'
import type { AdminAnalytics } from '@/types/admin'

interface DashboardOverviewProps {
  theme: 'dark' | 'light'
}

export default function DashboardOverview({ theme }: DashboardOverviewProps) {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string>('Just now')

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    try {
      const res = await adminApi.getAnalytics()
      if (res.success && res.data) {
        setAnalytics(res.data)
        setLastUpdated('Just now')
      }
    } catch (e) {
      console.error('Failed to load analytics:', e)
    } finally {
      setLoading(false)
    }
  }

  const isDark = theme === 'dark'
  const card = isDark ? 'bg-slate-800/50 border-white/[0.08]' : 'bg-white border-[#E6ECF5]'
  const textPrimary = isDark ? 'text-white' : 'text-[#0B1220]'
  const textSecondary = isDark ? 'text-slate-400' : 'text-[#4B5C74]'
  const chartGrid = isDark ? '#334155' : '#E6ECF5'
  const chartText = isDark ? '#64748b' : '#94a3b8'

  const revenueData = [
    { week: 'W1', revenue: 12000 }, { week: 'W2', revenue: 14200 },
    { week: 'W3', revenue: 15800 }, { week: 'W4', revenue: 16400 },
    { week: 'W5', revenue: 17200 }, { week: 'W6', revenue: 18500 },
    { week: 'W7', revenue: 19100 }, { week: 'W8', revenue: 20800 },
    { week: 'W9', revenue: 22000 }, { week: 'W10', revenue: 23500 },
    { week: 'W11', revenue: 25200 }, { week: 'W12', revenue: 27800 },
  ]

  const heatmapData = [
    { day: 'Mon', redemptions: 42 }, { day: 'Tue', redemptions: 38 },
    { day: 'Wed', redemptions: 55 }, { day: 'Thu', redemptions: 48 },
    { day: 'Fri', redemptions: 65 }, { day: 'Sat', redemptions: 58 },
    { day: 'Sun', redemptions: 39 },
  ]

  const totalRedemptions = heatmapData.reduce((acc, d) => acc + d.redemptions, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
      </div>
    )
  }

  const summary = analytics?.summary
  const queues = analytics?.queues

  return (
    <div className="space-y-6">
      {/* Header with Last Updated */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${textPrimary}`}>Dashboard</h2>
          <p className={textSecondary}>Real-time overview of key metrics and activity</p>
        </div>
        <div className={`text-right text-sm ${textSecondary}`}>
          <div>Last updated</div>
          <div className={`font-medium ${textPrimary}`}>{lastUpdated}</div>
        </div>
      </div>

      {/* 4 Stat Cards — Figma: Daily/Monthly Users, Trips Today, Fuel Saved, Active Partners */}
      <div className="grid grid-cols-4 gap-4">
        <div className={`p-5 rounded-xl border ${card}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <Users className="text-blue-500" size={24} />
            </div>
            <span className="flex items-center gap-1 text-xs font-medium text-green-500 bg-green-500/10 px-2 py-1 rounded-full">
              <TrendingUp size={10} /> +12%
            </span>
          </div>
          <div className={`text-xs ${textSecondary} mb-1`}>Daily / Monthly Users</div>
          <div className={`text-2xl font-bold ${textPrimary}`}>
            {((summary?.total_users || 0) * 0.36).toFixed(1).replace(/\.0$/, '')}K / {((summary?.total_users || 0) / 1000).toFixed(1)}K
          </div>
        </div>

        <div className={`p-5 rounded-xl border ${card}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <Navigation className="text-emerald-500" size={24} />
            </div>
            <span className="flex items-center gap-1 text-xs font-medium text-green-500 bg-green-500/10 px-2 py-1 rounded-full">
              <TrendingUp size={10} /> +8%
            </span>
          </div>
          <div className={`text-xs ${textSecondary} mb-1`}>Trips Today</div>
          <div className={`text-2xl font-bold ${textPrimary}`}>
            {(summary?.total_trips || 0).toLocaleString()}
          </div>
        </div>

        <div className={`p-5 rounded-xl border ${card}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
              <Fuel className="text-amber-500" size={24} />
            </div>
            <span className="flex items-center gap-1 text-xs font-medium text-green-500 bg-green-500/10 px-2 py-1 rounded-full">
              <TrendingUp size={10} /> +15%
            </span>
          </div>
          <div className={`text-xs ${textSecondary} mb-1`}>Fuel Saved (est)</div>
          <div className={`text-2xl font-bold ${textPrimary}`}>~14%</div>
        </div>

        <div className={`p-5 rounded-xl border ${card}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
              <Building2 className="text-purple-500" size={24} />
            </div>
            <span className={`text-xs font-medium ${textSecondary} bg-slate-500/10 px-2 py-1 rounded-full`}>
              stable
            </span>
          </div>
          <div className={`text-xs ${textSecondary} mb-1`}>Active Partners</div>
          <div className={`text-2xl font-bold ${textPrimary}`}>
            {summary?.active_partners || 0}
          </div>
        </div>
      </div>

      {/* Charts Row — Net Revenue + Redemption Heatmap */}
      <div className="grid grid-cols-2 gap-6">
        <div className={`p-5 rounded-xl border ${card}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className={`text-lg font-semibold ${textPrimary}`}>Net Revenue</h3>
              <p className={`text-xs ${textSecondary}`}>Last 12 weeks performance</p>
            </div>
            <span className="text-xs font-medium text-green-500 bg-green-500/10 px-2 py-1 rounded-full">
              +18.2%
            </span>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
              <XAxis dataKey="week" stroke={chartText} fontSize={12} />
              <YAxis stroke={chartText} fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? '#1e293b' : '#fff',
                  border: `1px solid ${isDark ? '#334155' : '#E6ECF5'}`,
                  borderRadius: '8px',
                  color: isDark ? '#fff' : '#0B1220',
                }}
              />
              <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4, fill: '#3B82F6' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className={`p-5 rounded-xl border ${card}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className={`text-lg font-semibold ${textPrimary}`}>Redemption Heatmap</h3>
              <p className={`text-xs ${textSecondary}`}>Weekly redemption patterns</p>
            </div>
            <span className="text-xs font-medium text-green-500 bg-green-500/10 px-2 py-1 rounded-full">
              {totalRedemptions} total
            </span>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={heatmapData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
              <XAxis dataKey="day" stroke={chartText} fontSize={12} />
              <YAxis stroke={chartText} fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? '#1e293b' : '#fff',
                  border: `1px solid ${isDark ? '#334155' : '#E6ECF5'}`,
                  borderRadius: '8px',
                  color: isDark ? '#fff' : '#0B1220',
                }}
              />
              <Bar dataKey="redemptions" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Queues — Needs Attention */}
      <div className={`p-5 rounded-xl border ${card}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className={`text-lg font-semibold ${textPrimary}`}>Queues - Needs Attention</h3>
            <p className={`text-xs ${textSecondary}`}>Critical items requiring review</p>
          </div>
          <div className="w-8 h-8 rounded-full border border-red-300 flex items-center justify-center">
            <AlertTriangle className="text-red-400" size={14} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className={`p-4 rounded-xl border ${isDark ? 'border-white/[0.06]' : 'border-[#E6ECF5]'}`}>
            <div className="flex items-center justify-between mb-2">
              <h4 className={`font-medium ${textPrimary}`}>Incident Review</h4>
              <span className="text-xs font-medium text-white bg-red-500 px-2 py-0.5 rounded-full">
                {queues?.incident_review || 0} urgent
              </span>
            </div>
            <div className="text-2xl font-bold text-blue-500 mb-3">{queues?.incident_review || 0}</div>
            <button className="w-full py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors">
              Review Now
            </button>
          </div>

          <div className={`p-4 rounded-xl border ${isDark ? 'border-white/[0.06]' : 'border-[#E6ECF5]'}`}>
            <div className="flex items-center justify-between mb-2">
              <h4 className={`font-medium ${textPrimary}`}>Consent Pending</h4>
              <span className="text-xs font-medium text-white bg-orange-500 px-2 py-0.5 rounded-full">
                {queues?.consent_pending || 0} urgent
              </span>
            </div>
            <div className="text-2xl font-bold text-blue-500 mb-3">{queues?.consent_pending || 0}</div>
            <button className="w-full py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors">
              Review Now
            </button>
          </div>

          <div className={`p-4 rounded-xl border ${isDark ? 'border-white/[0.06]' : 'border-[#E6ECF5]'}`}>
            <div className="flex items-center justify-between mb-2">
              <h4 className={`font-medium ${textPrimary}`}>Fraud Flags</h4>
              <span className="text-xs font-medium text-white bg-red-500 px-2 py-0.5 rounded-full">
                {queues?.fraud_flags || 0} urgent
              </span>
            </div>
            <div className="text-2xl font-bold text-blue-500 mb-3">{queues?.fraud_flags || 0}</div>
            <button className="w-full py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors">
              Review Now
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className={`p-5 rounded-xl border ${card}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className={`text-lg font-semibold ${textPrimary}`}>Recent Activity</h3>
            <p className={`text-xs ${textSecondary}`}>Latest platform events</p>
          </div>
          <button className="text-sm text-blue-500 hover:text-blue-400 font-medium">View All</button>
        </div>
        <div className="space-y-3">
          {[
            { icon: UserPlus, color: 'text-blue-400 bg-blue-500/20', title: 'New user signup', detail: 'john.doe@email.com', time: '2 minutes ago' },
            { icon: CheckCircle, color: 'text-green-400 bg-green-500/20', title: 'Incident approved', detail: 'Admin Sarah', time: '8 minutes ago' },
            { icon: Building2, color: 'text-purple-400 bg-purple-500/20', title: 'New partner registered', detail: 'Shell Gas Station', time: '15 minutes ago' },
            { icon: Navigation, color: 'text-emerald-400 bg-emerald-500/20', title: 'Trip milestone', detail: '10,000th trip completed', time: '1 hour ago' },
          ].map((activity, i) => (
            <div key={i} className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? 'bg-slate-700/30' : 'bg-[#F8FAFC]'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activity.color}`}>
                <activity.icon size={18} />
              </div>
              <div className="flex-1">
                <div className={`text-sm font-medium ${textPrimary}`}>{activity.title}</div>
                <div className={`text-xs ${textSecondary}`}>{activity.detail}</div>
              </div>
              <div className={`text-xs ${textSecondary}`}>{activity.time}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
