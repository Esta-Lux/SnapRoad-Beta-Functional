import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import type { Analytics } from '@/types/partner'

interface Props {
  analytics: Analytics
}

export default function AnalyticsTab({ analytics }: Props) {
  const stats = [
    { label: 'Total Views', value: (analytics.summary?.total_views || 0).toLocaleString(), color: 'text-blue-400' },
    { label: 'Total Clicks', value: (analytics.summary?.total_clicks || 0).toLocaleString(), color: 'text-purple-400' },
    { label: 'Redemptions', value: (analytics.summary?.total_redemptions || 0).toLocaleString(), color: 'text-emerald-400' },
    { label: 'Revenue', value: `$${(analytics.summary?.total_revenue || 0).toLocaleString()}`, color: 'text-amber-400' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map((s, i) => (
          <div key={i} className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-white/5 p-5">
            <p className="text-slate-400 text-sm">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color} mt-1`}>{s.value}</p>
          </div>
        ))}
      </div>
      {analytics.chart_data?.length > 0 && (
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 p-6">
          <h2 className="text-white font-semibold text-lg mb-4">Revenue Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.chart_data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
              <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
