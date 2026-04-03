import {
  Eye, Target, Gift, DollarSign, Activity, Globe,
} from 'lucide-react'
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import type { Analytics } from '@/types/partner'

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444']

interface Props {
  analytics: Analytics
}

export default function OverviewTab({ analytics }: Props) {
  const computeTrend = (val: number) => {
    if (val === 0) return 'No data'
    return `${val.toLocaleString()} total`
  }

  const stats = [
    { label: 'Total Views', value: analytics.summary.total_views.toLocaleString(), icon: Eye, color: 'blue', trend: computeTrend(analytics.summary.total_views) },
    { label: 'Total Clicks', value: analytics.summary.total_clicks.toLocaleString(), icon: Target, color: 'purple', trend: computeTrend(analytics.summary.total_clicks) },
    { label: 'Redemptions', value: analytics.summary.total_redemptions.toLocaleString(), icon: Gift, color: 'emerald', trend: computeTrend(analytics.summary.total_redemptions) },
    { label: 'Revenue', value: `$${analytics.summary.total_revenue.toLocaleString()}`, icon: DollarSign, color: 'amber', trend: computeTrend(analytics.summary.total_revenue) },
  ]

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-800/40 px-5 py-4">
        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-slate-950">
          <img src="/snaproad-logo.svg" alt="" className="h-full w-full object-cover" width={44} height={44} />
        </div>
        <div>
          <p className="text-white font-semibold">SnapRoad for partners</p>
          <p className="text-slate-400 text-sm">Performance at a glance</p>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-white/5 overflow-hidden group hover:border-white/10">
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 bg-${stat.color}-500/20 rounded-xl flex items-center justify-center`}>
                  <stat.icon className={`text-${stat.color}-400`} size={24} />
                </div>
                <span className="text-emerald-400 text-sm font-medium bg-emerald-500/10 px-2 py-1 rounded-full">{stat.trend}</span>
              </div>
              <p className="text-slate-400 text-sm">{stat.label}</p>
              <p className="text-white text-3xl font-bold mt-1">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {(analytics.chart_data?.length > 0 || analytics.geo_data?.length > 0) && (
        <div className="grid grid-cols-2 gap-6">
          {analytics.chart_data?.length > 0 && (
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 p-6">
              <h2 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                <Activity className="text-emerald-400" size={20} />Performance Trend
              </h2>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={analytics.chart_data}>
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorRedemptions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="views" stroke="#10b981" fillOpacity={1} fill="url(#colorViews)" />
                  <Area type="monotone" dataKey="redemptions" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRedemptions)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {analytics.geo_data?.length > 0 && (
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 p-6">
              <h2 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                <Globe className="text-cyan-400" size={20} />Top Locations
              </h2>
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie data={analytics.geo_data} dataKey="redemptions" nameKey="city" cx="50%" cy="50%" outerRadius={80}>
                      {analytics.geo_data.map((_: any, index: number) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {analytics.geo_data.map((geo: any, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-slate-300 text-sm">{geo.city}</span>
                      </div>
                      <span className="text-white font-medium">{geo.redemptions}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 p-6">
          <p className="text-slate-400 text-sm mb-2">Click-Through Rate</p>
          <p className="text-3xl font-bold text-white">{analytics.summary.ctr}%</p>
          <div className="w-full bg-slate-700 rounded-full h-2 mt-3">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full" style={{ width: `${Math.min(analytics.summary.ctr * 10, 100)}%` }} />
          </div>
        </div>
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 p-6">
          <p className="text-slate-400 text-sm mb-2">Conversion Rate</p>
          <p className="text-3xl font-bold text-white">{analytics.summary.conversion_rate}%</p>
          <div className="w-full bg-slate-700 rounded-full h-2 mt-3">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full" style={{ width: `${Math.min(analytics.summary.conversion_rate * 5, 100)}%` }} />
          </div>
        </div>
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 p-6">
          <p className="text-slate-400 text-sm mb-2">Avg Order Value</p>
          <p className="text-3xl font-bold text-white">${(analytics.summary.total_redemptions > 0 ? analytics.summary.total_revenue / analytics.summary.total_redemptions : 0).toFixed(2)}</p>
          <p className="text-slate-500 text-sm mt-2">per redemption</p>
        </div>
      </div>
    </div>
  )
}
