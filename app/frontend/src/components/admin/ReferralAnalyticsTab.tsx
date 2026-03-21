// Partner Referral Analytics Tab
// =============================================

import { useState, useEffect } from 'react'
import { Users, CheckCircle2, DollarSign, Gift } from 'lucide-react'
import { adminApi } from '@/services/adminApi'
import type { ReferralAnalyticsData } from '@/types/admin'

interface ReferralAnalyticsTabProps {
  theme: 'dark' | 'light'
}

const MEDALS = ['🥇', '🥈', '🥉'] as const

export default function ReferralAnalyticsTab({ theme }: ReferralAnalyticsTabProps) {
  const [analytics, setAnalytics] = useState<ReferralAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadReferralAnalytics()
  }, [])

  const loadReferralAnalytics = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminApi.getReferralAnalytics()
      if (res.success && res.data) {
        setAnalytics(res.data)
      } else {
        setError(res.message || 'Failed to load referral analytics')
      }
    } catch (err) {
      console.error('Failed to load referral analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load referral analytics')
    } finally {
      setLoading(false)
    }
  }

  const isDark = theme === 'dark'
  const card = isDark ? 'bg-slate-800/50 border-white/[0.08]' : 'bg-white border-[#E6ECF5]'
  const textPrimary = isDark ? 'text-white' : 'text-[#0B1220]'
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600'
  const tableRowBg = isDark ? 'bg-slate-700/30' : 'bg-slate-50'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className={textPrimary}>{error}</p>
        <button
          onClick={loadReferralAnalytics}
          className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!analytics?.summary) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className={textSecondary}>No referral analytics data available.</p>
      </div>
    )
  }

  const { summary, top_referrers } = analytics

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Users className="text-blue-400" size={20} />
            </div>
            <div>
              <div className={`text-2xl font-bold ${textPrimary}`}>{summary.total_signups.toLocaleString()}</div>
              <div className={`text-xs ${textSecondary}`}>Total Signups</div>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="text-emerald-400" size={20} />
            </div>
            <div>
              <div className={`text-2xl font-bold ${textPrimary}`}>{summary.verified_30d.toLocaleString()}</div>
              <div className={`text-xs ${textSecondary}`}>Verified 30d</div>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <DollarSign className="text-amber-400" size={20} />
            </div>
            <div>
              <div className={`text-2xl font-bold ${textPrimary}`}>
                ${Number(summary.cost_per_signup).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className={`text-xs ${textSecondary}`}>Cost per Signup</div>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Gift className="text-purple-400" size={20} />
            </div>
            <div>
              <div className={`text-2xl font-bold ${textPrimary}`}>{summary.credits_issued.toLocaleString()}</div>
              <div className={`text-xs ${textSecondary}`}>Credits Issued</div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Referrers Leaderboard */}
      <div className={`p-5 rounded-xl border ${card}`}>
        <h3 className={`text-lg font-semibold ${textPrimary} mb-4`}>Top Referrers</h3>
        {!top_referrers?.length ? (
          <p className={`text-sm ${textSecondary} py-8 text-center`}>No referrers data yet.</p>
        ) : (
          <div className="space-y-3">
            {top_referrers.map((referrer, index) => (
              <div
                key={`${referrer.email}-${index}`}
                className={`flex items-center justify-between p-3 rounded-lg ${tableRowBg}`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-xl w-8 shrink-0">
                    {index < 3 ? MEDALS[index] : <span className={`text-sm ${textSecondary}`}>#{index + 1}</span>}
                  </span>
                  <div className="min-w-0">
                    <div className={`text-sm font-medium ${textPrimary} truncate`}>{referrer.email}</div>
                    <div className={`text-xs ${textSecondary}`}>{referrer.signups} signups · {referrer.credits} credits</div>
                  </div>
                  {referrer.tier && (
                    <span className={`px-2 py-0.5 text-xs rounded-full shrink-0 ${
                      isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {referrer.tier}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
