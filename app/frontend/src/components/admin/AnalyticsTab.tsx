// Platform Analytics Tab
// =============================================

import { useState, useEffect, useCallback } from 'react'
import { Users, Building2, Gift, Activity, Download, Calendar, RadioTower, MapPinned } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { adminApi } from '@/services/adminApi'
import type { AdminStats, AdminOfferAnalyticsRow, AdminRealtimeFeedItem, AdminRealtimeSummary } from '@/types/admin'
import { useSupabaseRealtimeRefresh } from '@/hooks/useSupabaseRealtimeRefresh'

interface AnalyticsTabProps {
  theme: 'dark' | 'light'
}

export default function AnalyticsTab({ theme }: AnalyticsTabProps) {
  const [dateRange, setDateRange] = useState('7d')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [offerAnalytics, setOfferAnalytics] = useState<AdminOfferAnalyticsRow[]>([])
  const [realtimeSummary, setRealtimeSummary] = useState<AdminRealtimeSummary | null>(null)
  const [realtimeFeed, setRealtimeFeed] = useState<AdminRealtimeFeedItem[]>([])
  const [mapPoints, setMapPoints] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = useCallback(async () => {
    setLoading(true)
    try {
      const [statsRes, analyticsRes, realtimeRes, feedRes, mapRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.getOfferAnalytics(),
        adminApi.getRealtimeSummary(),
        adminApi.getRealtimeFeed(),
        adminApi.getRealtimeMapData(),
      ])
      if (statsRes.success && statsRes.data) setStats(statsRes.data)
      if (analyticsRes.success && analyticsRes.data) setOfferAnalytics(analyticsRes.data)
      if (realtimeRes.success && realtimeRes.data) setRealtimeSummary(realtimeRes.data)
      if (feedRes.success && feedRes.data) setRealtimeFeed(feedRes.data)
      if (mapRes.success && mapRes.data) setMapPoints(mapRes.data)
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useSupabaseRealtimeRefresh(
    'admin-analytics-realtime',
    [
      { table: 'offer_analytics' },
      { table: 'redemption_fees' },
      { table: 'redemptions' },
      { table: 'partners' },
    ],
    () => {
      loadStats()
    },
  )

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
    ...offerAnalytics.slice(0, 6).map((row, idx) => ({
      month: `Offer ${idx + 1}`,
      revenue: row.redemptions,
      redemptions: row.redemptions,
    })),
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
    <div className="space-y-4 sm:space-y-6 min-w-0 max-w-full overflow-x-hidden">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4 md:gap-4">
        <div className={`p-3 sm:p-4 rounded-xl border ${card} min-w-0`}>
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Users className="text-blue-400" size={18} />
            </div>
            <div className="min-w-0">
              <div className={`text-lg sm:text-2xl font-bold tabular-nums truncate ${textPrimary}`}>{(stats?.total_users || 0).toLocaleString()}</div>
              <div className={`text-[10px] sm:text-xs ${textSecondary}`}>Total Users</div>
            </div>
          </div>
          <div className={`mt-2 text-xs ${textSecondary}`}>{(stats?.total_users || 0).toLocaleString()} total</div>
        </div>
        <div className={`p-3 sm:p-4 rounded-xl border ${card} min-w-0`}>
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <Building2 className="text-emerald-400" size={18} />
            </div>
            <div className="min-w-0">
              <div className={`text-lg sm:text-2xl font-bold tabular-nums truncate ${textPrimary}`}>{(stats?.active_partners || 0).toLocaleString()}</div>
              <div className={`text-[10px] sm:text-xs ${textSecondary}`}>Active Partners</div>
            </div>
          </div>
          <div className={`mt-2 text-xs ${textSecondary}`}>{(stats?.total_partners || 0).toLocaleString()} total</div>
        </div>
        <div className={`p-3 sm:p-4 rounded-xl border ${card} min-w-0`}>
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Gift className="text-purple-400" size={18} />
            </div>
            <div className="min-w-0">
              <div className={`text-lg sm:text-2xl font-bold tabular-nums truncate ${textPrimary}`}>{(stats?.total_offers || 0).toLocaleString()}</div>
              <div className={`text-[10px] sm:text-xs ${textSecondary}`}>Active Offers</div>
            </div>
          </div>
          <div className={`mt-2 text-xs ${textSecondary}`}>Across all partners</div>
        </div>
        <div className={`p-3 sm:p-4 rounded-xl border ${card} min-w-0`}>
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <Activity className="text-amber-400" size={18} />
            </div>
            <div className="min-w-0">
              <div className={`text-lg sm:text-2xl font-bold tabular-nums truncate ${textPrimary}`}>{(realtimeSummary?.today_redemptions ?? stats?.total_redemptions ?? 0).toLocaleString()}</div>
              <div className={`text-[10px] sm:text-xs ${textSecondary}`}>Redemptions</div>
            </div>
          </div>
          <div className={`mt-2 text-xs ${textSecondary}`}>today {realtimeSummary?.today_redemptions ?? 0} · total {(stats?.total_redemptions || 0).toLocaleString()}</div>
        </div>
      </div>

      {realtimeSummary && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6 min-w-0">
          <div className={`p-4 sm:p-5 rounded-xl border ${card} min-w-0`}>
            <h3 className={`text-base sm:text-lg font-semibold ${textPrimary} mb-3 flex items-center gap-2`}>
              <RadioTower size={18} className="text-cyan-400 shrink-0" /> Live Feed
            </h3>
            <div className="space-y-2 sm:space-y-3 max-h-60 sm:max-h-72 overflow-y-auto overscroll-contain -mx-1 px-1">
              {realtimeFeed.slice(0, 8).map((item, idx) => (
                <div
                  key={`${item.event_type}-${item.created_at || idx}`}
                  className={`rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 ${isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}
                >
                  <p className={`text-sm font-medium capitalize break-words ${textPrimary}`}>{item.event_type}</p>
                  <p className={`text-xs mt-1 break-all ${textSecondary}`}>
                    Offer #{item.offer_id || '—'} · Partner {item.partner_id || '—'}
                  </p>
                  <p className="text-xs mt-1 text-slate-500">
                    {item.created_at ? new Date(item.created_at).toLocaleString() : 'Just now'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className={`p-4 sm:p-5 rounded-xl border ${card} min-w-0`}>
            <h3 className={`text-base sm:text-lg font-semibold ${textPrimary} mb-3`}>Top Offers Today</h3>
            <div className="space-y-2 sm:space-y-3">
              {realtimeSummary.top_offers_today.slice(0, 6).map((row) => (
                <div
                  key={row.offer_id}
                  className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 min-w-0 ${isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}
                >
                  <span className={`text-sm truncate min-w-0 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Offer #{row.offer_id}</span>
                  <span className="text-emerald-500 dark:text-emerald-300 font-semibold tabular-nums shrink-0">{row.redemptions}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={`p-4 sm:p-5 rounded-xl border ${card} min-w-0`}>
            <h3 className={`text-base sm:text-lg font-semibold ${textPrimary} mb-3 flex items-center gap-2`}>
              <MapPinned size={18} className="text-amber-400 shrink-0" /> Redemption Heat
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className={`rounded-xl px-3 py-3 sm:px-4 sm:py-4 min-w-0 ${isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
                <p className={`text-xs ${textSecondary}`}>Map points today</p>
                <p className={`text-xl sm:text-2xl font-bold mt-1 tabular-nums ${textPrimary}`}>{mapPoints.length}</p>
              </div>
              <div className={`rounded-xl px-3 py-3 sm:px-4 sm:py-4 min-w-0 ${isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
                <p className={`text-xs ${textSecondary}`}>Offer views today</p>
                <p className={`text-xl sm:text-2xl font-bold mt-1 tabular-nums ${textPrimary}`}>{realtimeSummary.today_views}</p>
              </div>
              <div className={`rounded-xl px-3 py-3 sm:px-4 sm:py-4 col-span-2 min-w-0 ${isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
                <p className={`text-xs ${textSecondary}`}>Offer visits today</p>
                <p className={`text-xl sm:text-2xl font-bold mt-1 tabular-nums ${textPrimary}`}>{realtimeSummary.today_visits}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Date Range Selector */}
      <div className={`p-3 sm:p-4 rounded-xl border ${card} min-w-0`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <Calendar className={textSecondary} size={18} />
            <span className={`${textPrimary} font-medium text-sm sm:text-base`}>Date Range</span>
          </div>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className={`w-full sm:w-auto min-w-0 flex-1 sm:flex-none max-w-full px-3 sm:px-4 py-2 rounded-lg border text-sm ${
              isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'
            }`}
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </select>
          <button
            type="button"
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-2.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 text-sm shrink-0"
          >
            <Download size={18} className="shrink-0" />
            Export Report
          </button>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6 min-w-0">
        <div className={`p-4 sm:p-5 rounded-xl border ${card} min-w-0`}>
          <h3 className={`text-base sm:text-lg font-semibold ${textPrimary} mb-3 sm:mb-4`}>User Growth</h3>
          <div className="w-full h-[220px] sm:h-[280px] lg:h-[300px] min-h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
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
        </div>

        <div className={`p-4 sm:p-5 rounded-xl border ${card} min-w-0`}>
          <h3 className={`text-base sm:text-lg font-semibold ${textPrimary} mb-3 sm:mb-4`}>Revenue Trend</h3>
          <div className="w-full h-[220px] sm:h-[280px] lg:h-[300px] min-h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
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
      </div>

      {/* Partner Distribution & Key Metrics */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6 min-w-0">
        <div className={`p-4 sm:p-5 rounded-xl border ${card} min-w-0`}>
          <h3 className={`text-base sm:text-lg font-semibold ${textPrimary} mb-3 sm:mb-4`}>Partner Distribution</h3>
          <div className="w-full h-[240px] sm:h-[280px] lg:h-[300px] min-h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={partnerDistribution}
                cx="50%"
                cy="50%"
                outerRadius="72%"
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              >
                {partnerDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          </div>
        </div>

        <div className={`p-4 sm:p-5 rounded-xl border ${card} min-w-0`}>
          <h3 className={`text-base sm:text-lg font-semibold ${textPrimary} mb-3 sm:mb-4`}>Key Metrics</h3>
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

      {offerAnalytics.length > 0 && (
        <div className={`p-4 sm:p-5 rounded-xl border ${card} min-w-0`}>
          <h3 className={`text-base sm:text-lg font-semibold ${textPrimary} mb-2 sm:mb-4`}>Offer Analytics Table</h3>
          <p className={`text-xs ${textSecondary} mb-3 sm:hidden`}>Swipe horizontally to see all columns.</p>
          <div className="overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0 overscroll-x-contain touch-pan-x">
            <table className="w-full text-xs sm:text-sm min-w-[36rem]">
              <thead className={textSecondary}>
                <tr>
                  <th className="text-left py-3">Offer</th>
                  <th className="text-left py-3">Partner</th>
                  <th className="text-left py-3">Views</th>
                  <th className="text-left py-3">Visits</th>
                  <th className="text-left py-3">Redemptions</th>
                  <th className="text-left py-3">Latest Event</th>
                </tr>
              </thead>
              <tbody>
                {offerAnalytics.slice(0, 20).map((row) => (
                  <tr key={`${row.offer_id}-${row.partner_id || 'none'}`} className="border-t border-white/5">
                    <td className={`py-3 ${textPrimary}`}>#{row.offer_id}</td>
                    <td className={`py-3 ${textSecondary}`}>{row.partner_id || 'admin-offer'}</td>
                    <td className={`py-3 ${textPrimary}`}>{row.views}</td>
                    <td className={`py-3 ${textPrimary}`}>{row.visits}</td>
                    <td className="py-3 text-emerald-400 font-medium">{row.redemptions}</td>
                    <td className={`py-3 ${textSecondary}`}>{row.latest_at ? new Date(row.latest_at).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
