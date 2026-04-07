/**
 * Admin: cross-user wallet_transactions table (GET /api/admin/wallet-ledger).
 */
import { useState, useEffect, useMemo } from 'react'
import { Search, RefreshCw, Wallet } from 'lucide-react'
import { adminApi } from '@/services/adminApi'
import { adminApiErrorMessage } from '@/lib/adminApiError'

interface LedgerRow {
  id: string
  user_id: string
  tx_type: string
  direction: string
  amount: number
  reference_type?: string | null
  reference_id?: string | null
  created_at?: string
  metadata?: Record<string, unknown>
}

function displaySource(row: LedgerRow): string {
  const t = String(row.tx_type || '')
  const d = String(row.direction || '')
  if (t === 'trip_drive' && d === 'credit') return 'Trip reward'
  if (t === 'offer_redeem' && d === 'debit') return 'Offer redemption'
  if (t === 'challenge_reward') return 'Challenge reward'
  if (t === 'referral' || t === 'referral_bonus') return 'Referral bonus'
  return t.replace(/_/g, ' ').trim() || '—'
}

function displayType(row: LedgerRow): string {
  const d = String(row.direction || '')
  if (d === 'credit') return 'Credit'
  if (d === 'debit') return 'Debit'
  return d || '—'
}

interface Props {
  theme: 'dark' | 'light'
}

export default function AdminWalletLedgerTab({ theme }: Props) {
  const [rows, setRows] = useState<LedgerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userFilter, setUserFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [limit] = useState(200)

  const isDark = theme === 'dark'

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminApi.getWalletLedger(userFilter.trim() || undefined, limit, typeFilter.trim() || undefined)
      if (res.success && Array.isArray(res.data)) setRows(res.data as LedgerRow[])
      else {
        setRows([])
        setError(res.message || 'No data')
      }
    } catch (e) {
      setRows([])
      setError(adminApiErrorMessage(e, 'Failed to load ledger'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const filtered = useMemo(() => rows, [rows])

  const card = isDark ? 'bg-slate-800/50 border-white/[0.08]' : 'bg-white border-[#E6ECF5]'
  const heading = isDark ? 'text-white' : 'text-[#0B1220]'
  const muted = isDark ? 'text-slate-400' : 'text-slate-600'

  return (
    <div className={isDark ? 'text-gray-200' : 'text-gray-900'}>
      <div className="flex flex-wrap items-end gap-4 mb-6">
        <div className="flex items-center gap-2 min-w-0">
          <Wallet className={`shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} size={22} />
          <div>
            <h1 className={`text-xl font-bold ${heading}`}>Wallet ledger</h1>
            <p className={`text-sm ${muted}`}>Append-only gem movements (`wallet_transactions`)</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 flex-1 justify-end">
          <div className="relative min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              placeholder="user_id (UUID)"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className={`w-full pl-9 pr-3 py-2 rounded-xl border text-sm ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}
            />
          </div>
          <input
            placeholder="tx_type filter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className={`min-w-[140px] px-3 py-2 rounded-xl border text-sm ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}
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
                <th className="text-left px-3 py-3 font-medium sm:px-4">user_id</th>
                <th className="text-left px-3 py-3 font-medium sm:px-4">amount</th>
                <th className="text-left px-3 py-3 font-medium sm:px-4">type</th>
                <th className="text-left px-3 py-3 font-medium sm:px-4">source</th>
                <th className="text-left px-3 py-3 font-medium sm:px-4">date</th>
                <th className="text-left px-3 py-3 font-medium sm:px-4">reference_id</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className={`px-4 py-10 text-center ${muted}`}>
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className={`px-4 py-10 text-center ${muted}`}>
                    No rows
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id} className={`border-t ${isDark ? 'border-white/5 text-slate-200' : 'border-slate-100'}`}>
                    <td className="px-3 py-2 sm:px-4 font-mono text-xs max-w-[120px] truncate" title={row.user_id}>
                      {row.user_id}
                    </td>
                    <td className="px-3 py-2 sm:px-4 whitespace-nowrap font-semibold">
                      {row.direction === 'debit' ? '−' : '+'}
                      {row.amount}
                    </td>
                    <td className="px-3 py-2 sm:px-4">{displayType(row)}</td>
                    <td className="px-3 py-2 sm:px-4">{displaySource(row)}</td>
                    <td className="px-3 py-2 sm:px-4 whitespace-nowrap text-xs">
                      {row.created_at ? new Date(row.created_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-3 py-2 sm:px-4 font-mono text-xs max-w-[140px] truncate" title={row.reference_id ?? ''}>
                      {row.reference_id ?? '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
