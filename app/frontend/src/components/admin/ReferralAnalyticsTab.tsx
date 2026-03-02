// Partner Referral Analytics Tab
// =============================================

import { useState, useEffect } from 'react'
import { TrendingUp, Users, Building2, Calendar, Download, Filter, Search } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

interface ReferralAnalyticsTabProps {
  theme: 'dark' | 'light'
}

export default function ReferralAnalyticsTab({ theme }: ReferralAnalyticsTabProps) {
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30d')
  const [partnerFilter, setPartnerFilter] = useState('all')

  useEffect(() => {
    loadReferralAnalytics()
  }, [dateRange, partnerFilter])

  const loadReferralAnalytics = async () => {
    setLoading(true)
    try {
      // Mock data - in real app, this would call backend API
      const mockData = {
        summary: {
          total_referrals: 1247,
          active_partners: 156,
          conversion_rate: 23.5,
          total_revenue: 45680,
          avg_referral_value: 36.60
        },
        chart_data: [
          { date: 'Jan 1', referrals: 45, conversions: 12, revenue: 1800 },
          { date: 'Jan 8', referrals: 52, conversions: 15, revenue: 2250 },
          { date: 'Jan 15', referrals: 48, conversions: 11, revenue: 1650 },
          { date: 'Jan 22', referrals: 61, conversions: 18, revenue: 2700 },
          { date: 'Jan 29', referrals: 58, conversions: 14, revenue: 2100 },
          { date: 'Feb 5', referrals: 67, conversions: 16, revenue: 2400 },
          { date: 'Feb 12', referrals: 72, conversions: 17, revenue: 2550 },
        ],
        top_partners: [
          { name: 'Shell Gas Station', referrals: 156, conversions: 45, revenue: 6750 },
          { name: 'Starbucks Coffee', referrals: 134, conversions: 38, revenue: 5700 },
          { name: 'McDonald\'s', referrals: 98, conversions: 28, revenue: 4200 },
          { name: 'Walmart', referrals: 87, conversions: 25, revenue: 3750 },
          { name: 'Quick Lube', referrals: 76, conversions: 22, revenue: 3300 },
        ],
        partner_types: [
          { name: 'Fuel Stations', value: 35, color: '#8b5cf6' },
          { name: 'Restaurants', value: 28, color: '#3b82f6' },
          { name: 'Retail', value: 20, color: '#10b981' },
          { name: 'Services', value: 12, color: '#f59e0b' },
          { name: 'Entertainment', value: 5, color: '#ef4444' },
        ]
      }
      setAnalytics(mockData)
    } catch (error) {
      console.error('Failed to load referral analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const isDark = theme === 'dark'
  const card = isDark ? 'bg-slate-800/50 border-white/[0.08]' : 'bg-white border-[#E6ECF5]'

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
      <div className="grid grid-cols-5 gap-4">
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Users className="text-blue-400" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{analytics.summary.total_referrals.toLocaleString()}</div>
              <div className="text-xs text-slate-400">Total Referrals</div>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs text-green-400">
            <TrendingUp size={12} />
            <span>+18%</span>
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <Building2 className="text-emerald-400" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{analytics.summary.active_partners}</div>
              <div className="text-xs text-slate-400">Active Partners</div>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-purple-400" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{analytics.summary.conversion_rate}%</div>
              <div className="text-xs text-slate-400">Conversion Rate</div>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <Calendar className="text-amber-400" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">${analytics.summary.total_revenue.toLocaleString()}</div>
              <div className="text-xs text-slate-400">Total Revenue</div>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-green-400" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">${analytics.summary.avg_referral_value}</div>
              <div className="text-xs text-slate-400">Avg Value</div>
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
              placeholder="Search partners..."
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'
              } placeholder-slate-500`}
            />
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
          <select
            value={partnerFilter}
            onChange={(e) => setPartnerFilter(e.target.value)}
            className={`px-4 py-2 rounded-lg border ${
              isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'
            }`}
          >
            <option value="all">All Partners</option>
            <option value="active">Active Only</option>
            <option value="top">Top Performers</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30">
            <Download size={18} />
            Export Report
          </button>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* Referral Trend */}
        <div className={`p-5 rounded-xl border ${card}`}>
          <h3 className="text-lg font-semibold text-white mb-4">Referral Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.chart_data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #334155',
                  borderRadius: '8px'
                }}
              />
              <Line type="monotone" dataKey="referrals" stroke="#8b5cf6" strokeWidth={2} />
              <Line type="monotone" dataKey="conversions" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by Referrals */}
        <div className={`p-5 rounded-xl border ${card}`}>
          <h3 className="text-lg font-semibold text-white mb-4">Revenue by Referrals</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.chart_data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #334155',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Partners & Partner Types */}
      <div className="grid grid-cols-2 gap-6">
        {/* Top Partners */}
        <div className={`p-5 rounded-xl border ${card}`}>
          <h3 className="text-lg font-semibold text-white mb-4">Top Performing Partners</h3>
          <div className="space-y-3">
            {analytics.top_partners.map((partner, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30">
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">{partner.name}</div>
                  <div className="text-xs text-slate-400">{partner.referrals} referrals</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-white">{partner.conversions} conversions</div>
                  <div className="text-xs text-green-400">${partner.revenue.toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Partner Types Distribution */}
        <div className={`p-5 rounded-xl border ${card}`}>
          <h3 className="text-lg font-semibold text-white mb-4">Partner Types Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics.partner_types}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {analytics.partner_types.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
