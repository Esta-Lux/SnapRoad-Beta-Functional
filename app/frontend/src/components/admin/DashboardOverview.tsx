// Dashboard Overview Tab
// =============================================

import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Users, Building2, Gift, AlertTriangle, Activity, Shield } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

const API_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || ''

interface DashboardOverviewProps {
  theme: 'dark' | 'light'
}

export default function DashboardOverview({ theme }: DashboardOverviewProps) {
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load admin analytics from backend
    const loadAnalytics = async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/analytics`)
        const data = await res.json()
        if (data.success) {
          setAnalytics(data.data)
        }
      } catch (e) {
        console.error('Failed to load analytics:', e)
        // Fallback to mock data
        setTimeout(() => {
          setAnalytics({
            summary: {
              total_users: 12450,
              premium_users: 3240,
              total_partners: 156,
              active_offers: 847,
              total_trips: 89420,
              avg_safety_score: 87,
              total_redemptions: 12450,
              total_gems: 156780
            },
            chart_data: [
              { date: 'Jan 1', users: 12000, revenue: 45000, trips: 85000 },
              { date: 'Jan 8', users: 12100, revenue: 47000, trips: 86000 },
              { date: 'Jan 15', users: 12200, revenue: 49000, trips: 87000 },
              { date: 'Jan 22', users: 12300, revenue: 51000, trips: 88000 },
              { date: 'Jan 29', users: 12400, revenue: 53000, trips: 89000 },
              { date: 'Feb 5', users: 12450, revenue: 55000, trips: 89420 },
            ]
          })
        }, 1000)
      }
      setLoading(false)
    }
    
    loadAnalytics()
  }, [])

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
      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Users className="text-blue-400" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{analytics.summary.total_users.toLocaleString()}</div>
              <div className="text-xs text-slate-400">{analytics.summary.premium_users.toLocaleString()} premium</div>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs text-green-400">
            <TrendingUp size={12} />
            <span>+8%</span>
          </div>
        </div>

        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <Building2 className="text-emerald-400" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{analytics.summary.total_partners.toLocaleString()}</div>
              <div className="text-xs text-slate-400">{analytics.summary.active_offers} active offers</div>
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
              <Shield className="text-purple-400" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{analytics.summary.avg_safety_score}</div>
              <div className="text-xs text-slate-400">{analytics.summary.total_redemptions.toLocaleString()} redemptions</div>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs text-green-400">
            <TrendingUp size={12} />
            <span>+3%</span>
          </div>
        </div>

        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <Gift className="text-amber-400" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{analytics.summary.total_gems.toLocaleString()}</div>
              <div className="text-xs text-slate-400">Total gems earned</div>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs text-green-400">
            <TrendingUp size={12} />
            <span>+15%</span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <div className={`p-5 rounded-xl border ${card}`}>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="text-purple-400" size={20} />
            <h2 className="text-lg font-semibold text-white">User Growth</h2>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={analytics.chart_data.slice(-14)}>
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
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
              <Area 
                type="monotone" 
                dataKey="users" 
                stroke="#8b5cf6" 
                fillOpacity={1} 
                fill="url(#colorUsers)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Trend */}
        <div className={`p-5 rounded-xl border ${card}`}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="text-emerald-400" size={20} />
            <h2 className="text-lg font-semibold text-white">Revenue Trend</h2>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={analytics.chart_data.slice(-14)}>
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

      {/* Recent Activity */}
      <div className={`p-5 rounded-xl border ${card}`}>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="text-blue-400" size={20} />
          <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
        </div>
        <div className="space-y-3">
          {[
            { type: 'user_join', user: 'John Smith', time: '2 hours ago', detail: 'Premium user joined' },
            { type: 'partner_created', user: 'Shell Gas Station', time: '4 hours ago', detail: 'New partner registered' },
            { type: 'offer_redeemed', user: 'Sarah Wilson', time: '6 hours ago', detail: 'Redeemed 20% off gas offer' },
            { type: 'incident_reported', user: 'Mike Johnson', time: '8 hours ago', detail: 'Speeding incident reported' },
            { type: 'user_upgrade', user: 'Emily Davis', time: '12 hours ago', detail: 'Upgraded to premium' },
          ].map((activity, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/30">
              <div className={`w-2 h-2 rounded-full ${
                activity.type === 'user_join' ? 'bg-green-400' :
                activity.type === 'partner_created' ? 'bg-blue-400' :
                activity.type === 'offer_redeemed' ? 'bg-purple-400' :
                activity.type === 'incident_reported' ? 'bg-red-400' :
                'bg-amber-400'
              }`} />
              <div className="flex-1">
                <div className="text-sm text-white">{activity.user}</div>
                <div className="text-xs text-slate-400">{activity.detail}</div>
              </div>
              <div className="text-xs text-slate-500">{activity.time}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-4">
        <button className={`p-4 rounded-xl border ${card} hover:shadow-lg transition-all text-left`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Users className="text-blue-400" size={16} />
            </div>
            <span className="text-white font-medium">Manage Users</span>
          </div>
          <p className="text-xs text-slate-400">View and manage all user accounts</p>
        </button>

        <button className={`p-4 rounded-xl border ${card} hover:shadow-lg transition-all text-left`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <Building2 className="text-emerald-400" size={16} />
            </div>
            <span className="text-white font-medium">Partner Portal</span>
          </div>
          <p className="text-xs text-slate-400">Manage business partners</p>
        </button>

        <button className={`p-4 rounded-xl border ${card} hover:shadow-lg transition-all text-left`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <AlertTriangle className="text-purple-400" size={16} />
            </div>
            <span className="text-white font-medium">View Incidents</span>
          </div>
          <p className="text-xs text-slate-400">Review reported incidents</p>
        </button>
      </div>
    </div>
  )
}
