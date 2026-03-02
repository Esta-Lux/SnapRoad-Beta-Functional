// Platform Analytics Tab
// =============================================

import { useState } from 'react'
import { BarChart3, TrendingUp, Users, Building2, Gift, Activity, Download, Calendar } from 'lucide-react'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

interface AnalyticsTabProps {
  theme: 'dark' | 'light'
}

export default function AnalyticsTab({ theme }: AnalyticsTabProps) {
  const [dateRange, setDateRange] = useState('7d')

  // Mock analytics data
  const userGrowthData = [
    { date: 'Jan 1', users: 12000, newUsers: 120, activeUsers: 8500 },
    { date: 'Jan 8', users: 12120, newUsers: 135, activeUsers: 8620 },
    { date: 'Jan 15', users: 12255, newUsers: 142, activeUsers: 8740 },
    { date: 'Jan 22', users: 12390, newUsers: 128, activeUsers: 8860 },
    { date: 'Jan 29', users: 12520, newUsers: 156, activeUsers: 8980 },
    { date: 'Feb 5', users: 12650, newUsers: 168, activeUsers: 9100 },
    { date: 'Feb 12', users: 12780, newUsers: 145, activeUsers: 9220 },
  ]

  const revenueData = [
    { month: 'Jan', revenue: 45000, offers: 847, redemptions: 2340 },
    { month: 'Feb', revenue: 52000, offers: 923, redemptions: 2650 },
    { month: 'Mar', revenue: 58000, offers: 1012, redemptions: 2980 },
    { month: 'Apr', revenue: 64000, offers: 1105, redemptions: 3320 },
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

  const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444']

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
              <div className="text-2xl font-bold text-white">12,780</div>
              <div className="text-xs text-slate-400">Total Users</div>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs text-green-400">
            <TrendingUp size={12} />
            <span>+6.5%</span>
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <Building2 className="text-emerald-400" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">156</div>
              <div className="text-xs text-slate-400">Active Partners</div>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs text-green-400">
            <TrendingUp size={12} />
            <span>+12%</span>
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Gift className="text-purple-400" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">1,105</div>
              <div className="text-xs text-slate-400">Active Offers</div>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs text-green-400">
            <TrendingUp size={12} />
            <span>+8.3%</span>
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <Activity className="text-amber-400" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">3,320</div>
              <div className="text-xs text-slate-400">Total Redemptions</div>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs text-green-400">
            <TrendingUp size={12} />
            <span>+15.2%</span>
          </div>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className={`p-4 rounded-xl border ${card}`}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="text-slate-400" size={18} />
            <span className="text-white font-medium">Date Range</span>
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
        {/* User Growth Chart */}
        <div className={`p-5 rounded-xl border ${card}`}>
          <h3 className="text-lg font-semibold text-white mb-4">User Growth</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={userGrowthData}>
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
              <Line type="monotone" dataKey="users" stroke="#8b5cf6" strokeWidth={2} />
              <Line type="monotone" dataKey="newUsers" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="activeUsers" stroke="#f59e0b" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Chart */}
        <div className={`p-5 rounded-xl border ${card}`}>
          <h3 className="text-lg font-semibold text-white mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
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

      {/* Partner Distribution */}
      <div className="grid grid-cols-2 gap-6">
        <div className={`p-5 rounded-xl border ${card}`}>
          <h3 className="text-lg font-semibold text-white mb-4">Partner Distribution</h3>
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

        {/* Top Metrics */}
        <div className={`p-5 rounded-xl border ${card}`}>
          <h3 className="text-lg font-semibold text-white mb-4">Key Metrics</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Avg. Session Duration</span>
              <span className="text-white font-medium">12m 34s</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Conversion Rate</span>
              <span className="text-white font-medium">3.2%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Daily Active Users</span>
              <span className="text-white font-medium">9,220</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Avg. Order Value</span>
              <span className="text-white font-medium">$47.50</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Customer Satisfaction</span>
              <span className="text-white font-medium">4.6/5.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
