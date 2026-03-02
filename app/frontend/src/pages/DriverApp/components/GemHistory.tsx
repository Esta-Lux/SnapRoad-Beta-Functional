import { useState, useEffect } from 'react'
import { X, Gem, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Filter } from 'lucide-react'

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
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [monthStats, setMonthStats] = useState<any>(null)
  const [filter, setFilter] = useState<'all' | 'earn' | 'spend'>('all')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) loadHistory()
  }, [isOpen])

  const loadHistory = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/gems/history`)
      const data = await res.json()
      if (data.success) {
        setTransactions(data.data)
        setMonthStats(data.this_month)
      }
    } catch (e) {
      console.log('Could not load history')
    }
    setLoading(false)
  }

  const filteredTransactions = filter === 'all' 
    ? transactions 
    : transactions.filter(t => t.type === filter)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-2" onClick={onClose}>
      <div className="w-full max-w-md h-[85vh] bg-slate-900 rounded-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Gem className="text-white" size={20} />
              <h2 className="text-white font-bold text-lg">Gem History</h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <X className="text-white" size={16} />
            </button>
          </div>

          {/* This Month Stats */}
          {monthStats && (
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <ArrowUpRight className="text-emerald-300" size={14} />
                  <span className="text-white font-bold">+{monthStats.earned}</span>
                </div>
                <p className="text-emerald-200 text-[10px]">Earned</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <ArrowDownRight className="text-red-300" size={14} />
                  <span className="text-white font-bold">-{monthStats.spent}</span>
                </div>
                <p className="text-emerald-200 text-[10px]">Spent</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  {monthStats.net >= 0 ? <TrendingUp className="text-emerald-300" size={14} /> : <TrendingDown className="text-red-300" size={14} />}
                  <span className={`font-bold ${monthStats.net >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                    {monthStats.net >= 0 ? '+' : ''}{monthStats.net}
                  </span>
                </div>
                <p className="text-emerald-200 text-[10px]">Net</p>
              </div>
            </div>
          )}
        </div>

        {/* Filter */}
        <div className="px-4 py-3 flex gap-2 border-b border-slate-800">
          {(['all', 'earn', 'spend'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize ${filter === f ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
              {f === 'all' ? 'All' : f === 'earn' ? '↑ Earned' : '↓ Spent'}
            </button>
          ))}
        </div>

        {/* Transactions List */}
        <div className="flex-1 overflow-auto p-4 space-y-2">
          {loading ? (
            <div className="text-center py-8 text-slate-400">Loading...</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-slate-400">No transactions found</div>
          ) : (
            filteredTransactions.map(tx => (
              <div key={tx.id} className="bg-slate-800 rounded-xl p-3 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'earn' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                  {tx.type === 'earn' ? (
                    <ArrowUpRight className="text-emerald-400" size={18} />
                  ) : (
                    <ArrowDownRight className="text-red-400" size={18} />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{tx.description}</p>
                  <p className="text-slate-400 text-xs">{tx.date} • {tx.time}</p>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${tx.type === 'earn' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {tx.type === 'earn' ? '+' : ''}{tx.amount}
                  </p>
                  <p className="text-slate-500 text-[10px]">Bal: {tx.balance.toLocaleString()}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
