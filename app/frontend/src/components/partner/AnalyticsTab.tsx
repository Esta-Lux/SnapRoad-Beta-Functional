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
  const performanceRows = analytics.chart_data || []

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
          <h2 className="text-white font-semibold text-lg mb-4">Offer Performance</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.chart_data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
              <Bar dataKey="redemptions" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="views" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {performanceRows.length > 0 && (
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5">
            <h2 className="text-white font-semibold text-lg">Offer Conversion Table</h2>
            <p className="text-slate-400 text-sm mt-1">Views, visits, and redemptions for your offers.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.02] text-slate-400">
                <tr>
                  <th className="px-6 py-3 text-left font-medium">Offer</th>
                  <th className="px-6 py-3 text-left font-medium">Views</th>
                  <th className="px-6 py-3 text-left font-medium">Visits</th>
                  <th className="px-6 py-3 text-left font-medium">Redemptions</th>
                  <th className="px-6 py-3 text-left font-medium">Conversion</th>
                </tr>
              </thead>
              <tbody>
                {performanceRows.map((row, idx) => {
                  const views = Number(row.views || 0)
                  const visits = Number(row.visits || row.clicks || 0)
                  const redemptions = Number(row.redemptions || 0)
                  const conversion = views > 0 ? ((redemptions / views) * 100).toFixed(1) : '0.0'
                  return (
                    <tr key={`${row.date}-${idx}`} className="border-t border-white/5 text-slate-200">
                      <td className="px-6 py-4 text-white font-medium">{row.date}</td>
                      <td className="px-6 py-4">{views.toLocaleString()}</td>
                      <td className="px-6 py-4">{visits.toLocaleString()}</td>
                      <td className="px-6 py-4 text-emerald-300">{redemptions.toLocaleString()}</td>
                      <td className="px-6 py-4 text-cyan-300">{conversion}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
