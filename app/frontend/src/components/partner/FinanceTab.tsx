import { useState, useEffect } from 'react'
import {
  Wallet, CreditCard, Download, ArrowUpRight,
  TrendingDown, Receipt, Zap, BarChart2, Info,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { partnerApi } from '@/services/partnerApi'
import { REDEMPTION_FEE_SCHEDULE } from '@/lib/offer-pricing'

const EARN_OPPORTUNITIES = [
  { title: 'Refer a New Partner', desc: 'Earn 50 credits for every approved business you refer', credits: '+50 credits', color: '#0084FF' },
  { title: 'Monthly Active Bonus', desc: 'Maintain 10+ active offers to earn bonus credits', credits: '+25 credits/mo', color: '#00DFA2' },
  { title: 'High Redemption Reward', desc: 'Earn 1 credit for every 10 offer redemptions', credits: '+1 per 10', color: '#F59E0B' },
]

interface CreditEntry {
  id: string
  type: 'credit' | 'debit'
  description: string
  amount: number
  date: string
}

interface FeeInfo {
  current_fee: number
  current_tier: number
  tier_range: string
  total_redemptions: number
  total_owed: number
  total_paid: number
  balance_due: number
}

export default function FinanceTab() {
  const [creditBalance, setCreditBalance] = useState(0)
  const [creditHistory, setCreditHistory] = useState<CreditEntry[]>([])
  const [totalEarned, setTotalEarned] = useState(0)
  const [totalSpent, setTotalSpent] = useState(0)
  const [feeInfo, setFeeInfo] = useState<FeeInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddCreditsModal, setShowAddCreditsModal] = useState(false)
  const [creditAmount, setCreditAmount] = useState('50')

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [creditsRes, historyRes] = await Promise.all([
          partnerApi.getCredits(),
          partnerApi.getCreditHistory(),
        ])
        if (creditsRes.success) setCreditBalance(creditsRes.data?.balance || 0)
        if (historyRes.success && historyRes.data) {
          setCreditHistory(historyRes.data.history || [])
          setTotalEarned(historyRes.data.total_earned || 0)
          setTotalSpent(historyRes.data.total_spent || 0)
        }
        // Fetch fee info
        try {
          const feeRes = await partnerApi.getFees()
          if (feeRes.success && feeRes.data) setFeeInfo(feeRes.data as any)
        } catch {}
      } catch (e) { console.error(e) }
      setLoading(false)
    }
    fetchAll()
  }, [])

  const handleAddCredits = () => {
    setShowAddCreditsModal(true)
  }

  const confirmAddCredits = async () => {
    const num = parseFloat(creditAmount)
    if (isNaN(num) || num <= 0) return
    try {
      const result = await partnerApi.purchaseCredits(num)
      if (result.success && result.checkout_url) {
        window.location.href = result.checkout_url
      } else {
        alert(result.message || 'Stripe not configured yet')
      }
    } catch { alert('Failed to start checkout') }
    setShowAddCreditsModal(false)
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch { return dateStr }
  }

  const handleDownloadStatement = () => {
    if (creditHistory.length === 0) return

    const csvHeaders = ['Date', 'Type', 'Description', 'Amount']
    const csvRows = creditHistory.map(item => [
      formatDate(item.date),
      item.type === 'credit' ? 'Credit' : 'Debit',
      item.description,
      item.amount.toString()
    ])

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `snaproad-statement-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-gradient-to-br from-[#0084FF]/20 to-[#00DFA2]/10 rounded-2xl border border-[#0084FF]/20 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Credit Balance</p>
              <p className="text-5xl font-bold text-white mb-1">{loading ? '...' : creditBalance}</p>
              <p className="text-slate-400 text-sm">SnapRoad Partner Credits</p>
            </div>
            <div className="w-14 h-14 bg-[#0084FF]/20 rounded-2xl flex items-center justify-center">
              <Wallet className="text-[#0084FF]" size={28} />
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <button onClick={handleAddCredits} className="px-5 py-2.5 rounded-xl bg-[#0084FF] text-white font-semibold text-sm hover:opacity-90 flex items-center gap-2" data-testid="add-credits-btn">
              <CreditCard size={16} />Add Credits
            </button>
            <button onClick={handleDownloadStatement} className="px-5 py-2.5 rounded-xl bg-white/10 text-white font-semibold text-sm hover:bg-white/15 flex items-center gap-2">
              <Download size={16} />Statement
            </button>
          </div>
        </div>
        <div className="space-y-3">
          <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-5">
            <p className="text-slate-400 text-xs mb-1">Total Earned</p>
            <p className="text-2xl font-bold text-[#00DFA2]">+{totalEarned}</p>
            <p className="text-slate-400 text-xs flex items-center gap-1 mt-1"><ArrowUpRight size={12} className="text-[#00DFA2]" />From referrals & bonuses</p>
          </div>
          <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-5">
            <p className="text-slate-400 text-xs mb-1">Total Spent</p>
            <p className="text-2xl font-bold text-[#FF5A5A]">-{totalSpent}</p>
            <p className="text-slate-400 text-xs flex items-center gap-1 mt-1"><ArrowUpRight size={12} className="text-[#FF5A5A]" />Boosts & features</p>
          </div>
        </div>
      </div>

      {/* Redemption Fee Tier Info */}
      {feeInfo && (
        <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Info size={18} className="text-amber-400" /> Redemption Fee Summary
          </h3>
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="bg-white/[0.03] rounded-xl p-3 text-center">
              <p className="text-slate-400 text-xs">Current Rate</p>
              <p className="text-white text-xl font-bold">${feeInfo.current_fee.toFixed(2)}</p>
              <p className="text-slate-500 text-[10px]">per redemption</p>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-3 text-center">
              <p className="text-slate-400 text-xs">Total Redemptions</p>
              <p className="text-white text-xl font-bold">{feeInfo.total_redemptions.toLocaleString()}</p>
              <p className="text-slate-500 text-[10px]">Tier {feeInfo.current_tier} ({feeInfo.tier_range})</p>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-3 text-center">
              <p className="text-slate-400 text-xs">Total Owed</p>
              <p className="text-amber-400 text-xl font-bold">${feeInfo.total_owed.toFixed(2)}</p>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-3 text-center">
              <p className="text-slate-400 text-xs">Balance Due</p>
              <p className="text-red-400 text-xl font-bold">${feeInfo.balance_due.toFixed(2)}</p>
            </div>
          </div>
          <div className="bg-white/[0.02] rounded-xl p-3">
            <p className="text-slate-400 text-xs font-medium mb-2">Fee Schedule</p>
            <div className="grid grid-cols-5 gap-2">
              {REDEMPTION_FEE_SCHEDULE.map((tier, i) => (
                <div key={i} className={`text-center p-2 rounded-lg ${feeInfo.current_tier === i + 1 ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-white/[0.02]'}`}>
                  <p className="text-slate-500 text-[10px]">{tier.range}</p>
                  <p className={`font-bold text-sm ${feeInfo.current_tier === i + 1 ? 'text-amber-400' : 'text-slate-300'}`}>
                    ${typeof tier.fee === 'number' ? tier.fee.toFixed(2) : '0.50+'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Receipt size={18} className="text-[#0084FF]" />Recent Activity
          </h3>
          {creditHistory.length > 0 ? (
            <div className="space-y-3">
              {creditHistory.map(item => (
                <div key={item.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.type === 'credit' ? 'bg-[#00DFA2]/10' : 'bg-[#FF5A5A]/10'}`}>
                      {item.type === 'credit' ? <ArrowUpRight size={16} className="text-[#00DFA2]" /> : <TrendingDown size={16} className="text-[#FF5A5A]" />}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{item.description}</p>
                      <p className="text-slate-500 text-xs">{formatDate(item.date)}</p>
                    </div>
                  </div>
                  <span className={`font-bold text-sm ${item.type === 'credit' ? 'text-[#00DFA2]' : 'text-[#FF5A5A]'}`}>
                    {item.amount > 0 ? '+' : ''}{item.amount}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm text-center py-6">No credit activity yet</p>
          )}
        </div>

        <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Zap size={18} className="text-amber-400" />Ways to Earn Credits
          </h3>
          <div className="space-y-4">
            {EARN_OPPORTUNITIES.map((op, i) => (
              <div key={i} className="p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer">
                <div className="flex items-start justify-between mb-1">
                  <p className="text-white text-sm font-medium">{op.title}</p>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ color: op.color, backgroundColor: `${op.color}15` }}>{op.credits}</span>
                </div>
                <p className="text-slate-400 text-xs">{op.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showAddCreditsModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-md">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-white/10 shadow-2xl p-6">
              <h3 className="text-white font-bold text-lg mb-4">Purchase Credits</h3>
              <p className="text-slate-400 text-sm mb-4">Enter credit amount to purchase (in USD):</p>
              <input
                type="number"
                min="1"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="50"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddCreditsModal(false)}
                  className="flex-1 bg-slate-700/50 text-white py-3 rounded-xl hover:bg-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAddCredits}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-xl hover:from-blue-400 hover:to-cyan-400 font-semibold"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
