/**
 * Admin: all redemptions (GET /api/admin/redemptions).
 */
import { useState, useEffect } from 'react'
import { RefreshCw, Receipt } from 'lucide-react'
import { adminApi } from '@/services/adminApi'
import { adminApiErrorMessage } from '@/lib/adminApiError'

interface RedemptionRow {
  id?: string
  user_id?: string
  offer_id?: string
  partner_id?: string
  status?: string
  gems_earned?: number
  redeemed_at?: string
  created_at?: string
  scanned_by_user_id?: string | null
}

interface Props {
  theme: 'dark' | 'light'
}

export default function AdminRedemptionsMonitorTab({ theme }: Props) {
  const [rows, setRows] = useState<RedemptionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userFilter, setUserFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const isDark = theme === 'dark'

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminApi.getRedemptions({
        user_id: userFilter.trim() || undefined,
        status: statusFilter.trim() || undefined,
        limit: 200,
      })
      if (res.success && Array.isArray(res.data)) setRows(res.data as RedemptionRow[])
      else {
        setRows([])
        setError(res.message || 'No data')
      }
    } catch (e) {
      setRows([])
      setError(adminApiErrorMessage(e, 'Failed to load redemptions'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial fetch; filter changes use Refresh
  }, [])

  const card = isDark ? 'bg-slate-800/50 border-white/[0.08]' : 'bg-white border-[#E6ECF5]'
  const heading = isDark ? 'text-white' : 'text-[#0B1220]'
  const muted = isDark ? 'text-slate-400' : 'text-slate-600'

  const formatWhen = (r: RedemptionRow) => {
    const raw = r.redeemed_at || r.created_at
    if (!raw) return '—'
    try {
      return new Date(raw).toLocaleString()
    } catch {
      return String(raw)
    }
  }

  return (
    <div className={isDark ? 'text-gray-200' : 'text-gray-900'}>
      <div className="flex flex-wrap items-end gap-4 mb-6">
        <div className="flex items-center gap-2 min-w-0">
          <Receipt className={`shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} size={22} />
          <div>
            <h1 className={`text-xl font-bold ${heading}`}>Redemptions monitor</h1>
            <p className={`text-sm ${muted}`}>Offer redemptions across the platform</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 flex-1 justify-end">
          <input
            placeholder="user_id"
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className={`min-w-[160px] px-3 py-2 rounded-xl border text-sm ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}
          />
          <input
            placeholder="status (e.g. verified)"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`min-w-[120px] px-3 py-2 rounded-xl border text-sm ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}
          />
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${isDark ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-emerald-600 text-white hover:bg-emerald-700'} disabled:opacity-50`}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Apply
          </button>
        </div>
      </div>

      {error && (
        <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${isDark ? 'border-red-500/40 bg-red-500/10 text-red-200' : 'border-red-200 bg-red-50 text-red-800'}`}>
          {error}
        </div>
      )}

      <div className={`rounded-2xl border overflow-hidden ${card}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={isDark ? 'bg-white/[0.04] text-slate-400' : 'bg-slate-50 text-slate-600'}>
              <tr>
                <th className="text-left px-3 py-3 font-medium sm:px-4">When</th>
                <th className="text-left px-3 py-3 font-medium sm:px-4">user_id</th>
                <th className="text-left px-3 py-3 font-medium sm:px-4">offer_id</th>
                <th className="text-left px-3 py-3 font-medium sm:px-4">partner_id</th>
                <th className="text-left px-3 py-3 font-medium sm:px-4">status</th>
                <th className="text-left px-3 py-3 font-medium sm:px-4">gems</th>
                <th className="text-left px-3 py-3 font-medium sm:px-4">scanned in store</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className={`px-4 py-10 text-center ${muted}`}>
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className={`px-4 py-10 text-center ${muted}`}>
                    No redemptions
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => {
                  const id = String(row.id ?? idx)
                  const scanned = row.scanned_by_user_id != null && String(row.scanned_by_user_id).trim() !== ''
                  return (
                    <tr key={id} className={`border-t ${isDark ? 'border-white/5 text-slate-200' : 'border-slate-100'}`}>
                      <td className="px-3 py-2 sm:px-4 whitespace-nowrap text-xs">{formatWhen(row)}</td>
                      <td className="px-3 py-2 sm:px-4 font-mono text-xs max-w-[100px] truncate" title={row.user_id}>
                        {row.user_id ?? '—'}
                      </td>
                      <td className="px-3 py-2 sm:px-4 font-mono text-xs">{row.offer_id ?? '—'}</td>
                      <td className="px-3 py-2 sm:px-4 font-mono text-xs max-w-[100px] truncate" title={row.partner_id}>
                        {row.partner_id ?? '—'}
                      </td>
                      <td className="px-3 py-2 sm:px-4">{row.status ?? '—'}</td>
                      <td className="px-3 py-2 sm:px-4">{row.gems_earned ?? '—'}</td>
                      <td className="px-3 py-2 sm:px-4">{scanned ? 'Yes' : 'No'}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
