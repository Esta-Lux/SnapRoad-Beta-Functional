// Finance & Revenue Tab
// =============================================

import { useState, useEffect, useCallback } from 'react'
import { DollarSign, Building2, CreditCard, TrendingUp, FileText, Receipt, BarChart3 } from 'lucide-react'
import { adminApi } from '@/services/adminApi'
import type { FinanceData, AdminFeeSummaryItem } from '@/types/admin'
import { useSupabaseRealtimeRefresh } from '@/hooks/useSupabaseRealtimeRefresh'

interface FinanceTabProps {
  theme: 'dark' | 'light'
}

const formatCurrency = (n: number) =>
  `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function escapeCsvCell(cell: string | number): string {
  const s = String(cell)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function downloadCsv(filename: string, rows: (string | number)[][]): void {
  const csv = rows.map((r) => r.map(escapeCsvCell).join(',')).join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function FinanceTab({ theme }: FinanceTabProps) {
  const [finance, setFinance] = useState<FinanceData | null>(null)
  const [feeSummary, setFeeSummary] = useState<AdminFeeSummaryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadFinanceData()
  }, [])

  const loadFinanceData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [res, feeRes] = await Promise.all([
        adminApi.getFinance(),
        adminApi.getFeeSummary(),
      ])
      if (res.success && res.data) {
        setFinance(res.data)
      } else {
        setError(res.message || 'Failed to load finance data')
      }
      if (feeRes.success && feeRes.data) {
        setFeeSummary(feeRes.data)
      }
    } catch (err) {
      console.error('Failed to load finance data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load finance data')
    } finally {
      setLoading(false)
    }
  }, [])

  useSupabaseRealtimeRefresh(
    'admin-finance-realtime',
    [
      { table: 'redemption_fees' },
      { table: 'redemptions' },
      { table: 'partners' },
    ],
    () => {
      loadFinanceData()
    },
  )

  const isDark = theme === 'dark'
  const card = isDark ? 'bg-slate-800/50 border-white/[0.08]' : 'bg-white border-[#E6ECF5]'
  const textPrimary = isDark ? 'text-white' : 'text-[#0B1220]'
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600'
  const greenAccent = 'text-green-500'
  const greenBg = 'bg-green-500/20'

  const handleViewStatements = () => {
    if (!finance?.summary) return
    const s = finance.summary
    const stamp = new Date().toISOString().slice(0, 10)
    downloadCsv(`snaproad-finance-statement-${stamp}.csv`, [
      ['SnapRoad finance summary (client export)', '', '', ''],
      ['Generated', new Date().toISOString(), '', ''],
      ['', '', '', ''],
      ['Line item', 'Amount (USD)', '', ''],
      ['User plans MRR', s.mrr_user_plans, '', ''],
      ['Partners MRR', s.mrr_partners, '', ''],
      ['Redemption fees (collected / owed per backend)', s.redemption_fees, '', ''],
      ['Total MRR (reported)', s.total_mrr, '', ''],
      ['', '', '', ''],
      ['Note', 'Server-side PDF/statements can replace this when accounting needs official artifacts.', '', ''],
    ])
  }

  const handleGenerateInvoice = () => {
    if (!finance?.summary) return
    const s = finance.summary
    const stamp = new Date().toISOString().slice(0, 10)
    downloadCsv(`snaproad-platform-invoice-summary-${stamp}.csv`, [
      ['Invoice-style summary (informational export)', '', ''],
      ['Date', stamp, ''],
      ['', '', ''],
      ['Description', 'Amount (USD)', ''],
      ['Recurring — user subscriptions (MRR)', s.mrr_user_plans, ''],
      ['Recurring — partner subscriptions (MRR)', s.mrr_partners, ''],
      ['Redemption / platform fees', s.redemption_fees, ''],
      ['', '', ''],
      ['Total (matches admin Total MRR field)', s.total_mrr, ''],
    ])
  }

  const handleAgingReport = () => {
    if (!finance?.summary) return
    const s = finance.summary
    const stamp = new Date().toISOString().slice(0, 10)
    // No per-invoice aging in API yet — export current buckets as "current" only.
    downloadCsv(`snaproad-finance-current-buckets-${stamp}.csv`, [
      ['Finance export (current summary buckets — no receivables aging detail in API yet)', '', '', ''],
      ['Category', 'Amount (USD)', 'Age bucket', 'Notes'],
      ['User plans MRR', s.mrr_user_plans, 'Current', 'From GET /admin/finance summary'],
      ['Partners MRR', s.mrr_partners, 'Current', ''],
      ['Redemption fees', s.redemption_fees, 'Current', ''],
      ['Total MRR', s.total_mrr, 'Current', ''],
      ['', '', '', ''],
      ['', '', '', 'Add GET /admin/finance/aging-report when partner fee lines exist.'],
    ])
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className={textPrimary}>{error}</p>
        <button
          onClick={loadFinanceData}
          className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!finance?.summary) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className={textSecondary}>No finance data available.</p>
      </div>
    )
  }

  const { summary } = finance

  return (
    <div className="space-y-6">
      {/* MRR Stat Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${greenBg} rounded-lg flex items-center justify-center`}>
              <DollarSign className={greenAccent} size={20} />
            </div>
            <div>
              <div className={`text-2xl font-bold ${textPrimary}`}>{formatCurrency(summary.mrr_user_plans)}</div>
              <div className={`text-xs ${textSecondary}`}>User Plans MRR</div>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${greenBg} rounded-lg flex items-center justify-center`}>
              <Building2 className={greenAccent} size={20} />
            </div>
            <div>
              <div className={`text-2xl font-bold ${textPrimary}`}>{formatCurrency(summary.mrr_partners)}</div>
              <div className={`text-xs ${textSecondary}`}>Partners MRR</div>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${greenBg} rounded-lg flex items-center justify-center`}>
              <CreditCard className={greenAccent} size={20} />
            </div>
            <div>
              <div className={`text-2xl font-bold ${textPrimary}`}>{formatCurrency(summary.redemption_fees)}</div>
              <div className={`text-xs ${textSecondary}`}>Redemption Fees</div>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${greenBg} rounded-lg flex items-center justify-center`}>
              <TrendingUp className={greenAccent} size={20} />
            </div>
            <div>
              <div className={`text-2xl font-bold ${greenAccent}`}>{formatCurrency(summary.total_mrr)}</div>
              <div className={`text-xs ${textSecondary}`}>Total MRR</div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Actions */}
      <div className={`p-5 rounded-xl border ${card}`}>
        <h3 className={`text-lg font-semibold ${textPrimary} mb-4`}>Financial Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleViewStatements}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
          >
            <FileText size={18} />
            View Statements
          </button>
          <button
            onClick={handleGenerateInvoice}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
          >
            <Receipt size={18} />
            Generate Invoice
          </button>
          <button
            onClick={handleAgingReport}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
          >
            <BarChart3 size={18} />
            Aging Report
          </button>
        </div>
      </div>

      {feeSummary.length > 0 && (
        <div className={`p-5 rounded-xl border ${card}`}>
          <h3 className={`text-lg font-semibold ${textPrimary} mb-4`}>Partner Redemption Fee Summary</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={textSecondary}>
                <tr>
                  <th className="text-left py-3">Partner</th>
                  <th className="text-left py-3">Month</th>
                  <th className="text-left py-3">Redemptions</th>
                  <th className="text-left py-3">Current Fee</th>
                  <th className="text-left py-3">Tier</th>
                  <th className="text-left py-3">Total Fees</th>
                  <th className="text-left py-3">Next Threshold</th>
                </tr>
              </thead>
              <tbody>
                {feeSummary.slice(0, 20).map((row) => (
                  <tr key={`${row.partner_id}-${row.month_year}`} className="border-t border-white/5">
                    <td className={`py-3 ${textPrimary}`}>{row.partner_id}</td>
                    <td className={`py-3 ${textSecondary}`}>{row.month_year}</td>
                    <td className={`py-3 ${textPrimary}`}>{row.redemption_count}</td>
                    <td className="py-3 text-amber-400 font-medium">{formatCurrency(row.current_fee)}</td>
                    <td className={`py-3 ${textPrimary}`}>Tier {row.current_tier}</td>
                    <td className="py-3 text-red-400 font-medium">{formatCurrency(row.total_fees)}</td>
                    <td className={`py-3 ${textSecondary}`}>{row.redemptions_until_next_tier} to {row.next_threshold}</td>
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
