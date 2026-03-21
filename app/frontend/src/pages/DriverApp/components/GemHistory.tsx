import { useState, useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { X, Gem, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react'

const API_URL = import.meta.env.VITE_BACKEND_URL || ''

interface Transaction {
  id: number
  date: string
  time: string
  description: string
  amount: number
  type: 'earn' | 'spend'
  balance: number
}

interface GemHistoryProps {
  isOpen: boolean
  onClose: () => void
}

export default function GemHistory({ isOpen, onClose }: GemHistoryProps) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [monthStats, setMonthStats] = useState<any>(null)
  const [filter, setFilter] = useState<'all' | 'earn' | 'spend'>('all')
  const [loading, setLoading] = useState(false)

  const modalBg = isLight ? 'bg-white' : 'bg-slate-900'
  const cardBg = isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800'
  const textPrimary = isLight ? 'text-slate-900' : 'text-white'
  const textMuted = isLight ? 'text-slate-500' : 'text-slate-400'
  const backdrop = isLight ? 'bg-black/50' : 'bg-black/80'
  const filterInactive = isLight ? 'bg-slate-200 text-slate-600' : 'bg-slate-800 text-slate-400'
  const contentBg = isLight ? 'bg-slate-50' : 'bg-slate-900'

  useEffect(() => {
    if (isOpen) loadHistory()
  }, [isOpen])

  const loadHistory = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/gems/history`)
      const data = await res.json()
      if (data.success && data.data != null) {
        const raw = data.data
        // API returns { current_balance, total_earned, total_spent, recent_transactions }
        const list = Array.isArray(raw) ? raw : (raw.recent_transactions ?? [])
        const normalized = Array.isArray(list) ? list.map((t: any, i: number) => ({
          id: t.id ?? i,
          date: t.date ? new Date(t.date).toLocaleDateString() : '',
          time: t.date ? new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
          description: t.source ?? t.description ?? 'Transaction',
          amount: typeof t.amount === 'number' ? t.amount : 0,
          type: (t.type === 'spent' || t.type === 'spend' ? 'spend' : 'earn') as 'earn' | 'spend',
          balance: 0,
        })) : []
        setTransactions(normalized)
        setMonthStats(data.this_month ?? (raw.this_month ?? null))
      }
    } catch (e) {
    }
    setLoading(false)
  }

  const txList = Array.isArray(transactions) ? transactions : []
  const filteredTransactions = filter === 'all' ? txList : txList.filter(t => t.type === filter)

  if (!isOpen) return null

  return (
    <div className={`fixed inset-0 ${backdrop} z-50 flex items-center justify-center p-2`} onClick={onClose}>
      <div className={`w-full max-w-md h-[85vh] ${modalBg} rounded-2xl overflow-hidden flex flex-col shadow-xl border ${isLight ? 'border-slate-200' : 'border-slate-700'}`} onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Gem className="text-white" size={20} />
              <h2 className="text-white font-bold text-lg">Gem History</h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30">
              <X className="text-white" size={16} />
            </button>
          </div>

          {monthStats && typeof monthStats === 'object' && (
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <ArrowUpRight className="text-emerald-200" size={14} />
                  <span className="text-white font-bold">+{monthStats.earned ?? 0}</span>
                </div>
                <p className="text-white/80 text-[10px]">Earned</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <ArrowDownRight className="text-red-200" size={14} />
                  <span className="text-white font-bold">-{monthStats.spent ?? 0}</span>
                </div>
                <p className="text-white/80 text-[10px]">Spent</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  {(monthStats.net ?? 0) >= 0 ? <TrendingUp className="text-emerald-200" size={14} /> : <TrendingDown className="text-red-200" size={14} />}
                  <span className={`font-bold ${(monthStats.net ?? 0) >= 0 ? 'text-emerald-200' : 'text-red-200'}`}>
                    {(monthStats.net ?? 0) >= 0 ? '+' : ''}{monthStats.net ?? 0}
                  </span>
                </div>
                <p className="text-white/80 text-[10px]">Net</p>
              </div>
            </div>
          )}
        </div>

        <div className={`px-4 py-3 flex gap-2 border-b ${isLight ? 'bg-slate-50 border-slate-200' : 'border-slate-800'}`}>
          {(['all', 'earn', 'spend'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize ${filter === f ? 'bg-emerald-500 text-white' : filterInactive}`}>
              {f === 'all' ? 'All' : f === 'earn' ? '↑ Earned' : '↓ Spent'}
            </button>
          ))}
        </div>

        <div className={`flex-1 overflow-auto p-4 space-y-3 ${contentBg}`}>
          {loading ? (
            <div className={`text-center py-8 ${textMuted}`}>Loading...</div>
          ) : filteredTransactions.length === 0 ? (
            <div className={`text-center py-8 ${textMuted}`}>No transactions found</div>
          ) : (
            filteredTransactions.map(tx => (
              <div key={tx.id} className={`${cardBg} rounded-xl p-3 flex items-center gap-3 border ${isLight ? 'border-slate-200' : 'border-slate-700'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'earn' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                  {tx.type === 'earn' ? (
                    <ArrowUpRight className="text-emerald-500" size={18} />
                  ) : (
                    <ArrowDownRight className="text-red-500" size={18} />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${textPrimary}`}>{tx.description}</p>
                  <p className={`text-xs ${textMuted}`}>{tx.date} • {tx.time}</p>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${tx.type === 'earn' ? 'text-emerald-500' : 'text-red-500'}`}>
                    {tx.type === 'earn' ? '+' : ''}{tx.amount}
                  </p>
                  <p className={`text-[10px] ${textMuted}`}>Bal: {(tx.balance ?? 0).toLocaleString()}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
