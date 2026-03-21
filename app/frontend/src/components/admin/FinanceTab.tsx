// Finance & Revenue Tab
// =============================================

import { useState, useEffect } from 'react'
import { DollarSign, Building2, CreditCard, TrendingUp, FileText, Receipt, BarChart3 } from 'lucide-react'
import { adminApi } from '@/services/adminApi'
import type { FinanceData } from '@/types/admin'

interface FinanceTabProps {
  theme: 'dark' | 'light'
}

const formatCurrency = (n: number) =>
  `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function FinanceTab({ theme }: FinanceTabProps) {
  const [finance, setFinance] = useState<FinanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadFinanceData()
  }, [])

  const loadFinanceData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminApi.getFinance()
      if (res.success && res.data) {
        setFinance(res.data)
      } else {
        setError(res.message || 'Failed to load finance data')
      }
    } catch (err) {
      console.error('Failed to load finance data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load finance data')
    } finally {
      setLoading(false)
    }
  }

  const isDark = theme === 'dark'
  const card = isDark ? 'bg-slate-800/50 border-white/[0.08]' : 'bg-white border-[#E6ECF5]'
  const textPrimary = isDark ? 'text-white' : 'text-[#0B1220]'
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600'
  const greenAccent = 'text-green-500'
  const greenBg = 'bg-green-500/20'

  const handleViewStatements = () => {
  }

  const handleGenerateInvoice = () => {
  }

  const handleAgingReport = () => {
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
      <div className="grid grid-cols-4 gap-4">
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
    </div>
  )
}
