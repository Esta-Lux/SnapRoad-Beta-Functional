// Dashboard Overview — live Supabase aggregates only (no synthetic time-series).
// =============================================

import { useState, useEffect } from 'react'
import {
  Users, Navigation, Building2, AlertTriangle, UserPlus, CheckCircle,
  Activity, Gem, Receipt, Wallet,
} from 'lucide-react'
import { adminApi } from '@/services/adminApi'
import type { AdminAnalytics, AdminRecentActivityItem, AdminStats } from '@/types/admin'

interface DashboardOverviewProps {
  theme: 'dark' | 'light'
  /** Switch admin sidebar tab (e.g. incidents, legal, audit) */
  onNavigate?: (tabId: string) => void
}

function TrendChip({
  label,
  isDark,
  positive,
}: {
  label: string
  isDark: boolean
  positive?: boolean
}) {
  const tone =
    positive === true
      ? 'text-green-500 bg-green-500/10'
      : positive === false
        ? 'text-amber-500 bg-amber-500/10'
        : isDark
          ? 'text-slate-400 bg-slate-500/10'
          : 'text-[#4B5C74] bg-[#E6ECF5]'
  return <span className={`text-xs font-medium px-2 py-1 rounded-full ${tone}`}>{label}</span>
}

export default function DashboardOverview({ theme, onNavigate }: DashboardOverviewProps) {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null)
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string>('Just now')

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    try {
      const [analyticsRes, statsRes] = await Promise.all([adminApi.getAnalytics(), adminApi.getStats()])
      if (analyticsRes.success && analyticsRes.data) {
        setAnalytics(analyticsRes.data)
        setLastUpdated('Just now')
      }
      if (statsRes.success && statsRes.data) setStats(statsRes.data)
    } catch (e) {
      console.error('Failed to load dashboard data:', e)
    } finally {
      setLoading(false)
    }
  }

  const isDark = theme === 'dark'
  const card = isDark ? 'bg-slate-800/50 border-white/[0.08]' : 'bg-white border-[#E6ECF5]'
  const textPrimary = isDark ? 'text-white' : 'text-[#0B1220]'
  const textSecondary = isDark ? 'text-slate-400' : 'text-[#4B5C74]'

  const summary = analytics?.summary
  const queues = analytics?.queues
  const offerSummary = summary as ({ online_offers?: unknown; offer_catalog_provider?: unknown } | undefined)
  const onlineOfferCount = Number(offerSummary?.online_offers ?? 0)
  const offerProvider = String(offerSummary?.offer_catalog_provider ?? '').trim()

  const growthRaw = (stats?.user_growth || '').trim()
  const showUserGrowth = Boolean(growthRaw && growthRaw !== '+0%' && growthRaw !== '0%')

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between min-w-0">
        <div className="min-w-0">
          <h2 className={`text-2xl font-bold ${textPrimary}`}>Dashboard</h2>
          <p className={textSecondary}>Live platform metrics from Supabase (snapshot — no historical charts in API yet)</p>
        </div>
        <div className={`text-left sm:text-right text-sm shrink-0 ${textSecondary}`}>
          <div>Last updated</div>
          <div className={`font-medium ${textPrimary}`}>{lastUpdated}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={`p-5 rounded-xl border ${card}`}>
          <div className="flex items-center justify-between mb-3 gap-2">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center shrink-0">
              <Users className="text-blue-500" size={24} />
            </div>
            {showUserGrowth ? (
              <TrendChip label={growthRaw} isDark={isDark} positive />
            ) : (
              <TrendChip label="Snapshot" isDark={isDark} />
            )}
          </div>
          <div className={`text-xs ${textSecondary} mb-1`}>Users</div>
          <div className={`text-2xl font-bold ${textPrimary} tabular-nums`}>
            {(summary?.total_users ?? 0).toLocaleString()}
          </div>
          <div className={`text-xs mt-1 ${textSecondary}`}>
            Premium: {(summary?.premium_users ?? 0).toLocaleString()}
          </div>
        </div>

        <div className={`p-5 rounded-xl border ${card}`}>
          <div className="flex items-center justify-between mb-3 gap-2">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center shrink-0">
              <Activity className="text-emerald-500" size={24} />
            </div>
            <TrendChip label="Today" isDark={isDark} />
          </div>
          <div className={`text-xs ${textSecondary} mb-1`}>Active today</div>
          <div className={`text-2xl font-bold ${textPrimary} tabular-nums`}>
            {(stats?.active_today ?? 0).toLocaleString()}
          </div>
          <div className={`text-xs mt-1 ${textSecondary}`}>
            Trips today: {(stats?.trips_today ?? 0).toLocaleString()}
          </div>
        </div>

        <div className={`p-5 rounded-xl border ${card}`}>
          <div className="flex items-center justify-between mb-3 gap-2">
            <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center shrink-0">
              <AlertTriangle className="text-amber-500" size={24} />
            </div>
            <TrendChip label="Queues" isDark={isDark} />
          </div>
          <div className={`text-xs ${textSecondary} mb-1`}>Needs attention</div>
          <div className={`text-2xl font-bold ${textPrimary} tabular-nums`}>
            {((stats?.pending_incidents ?? 0) + (stats?.open_concerns ?? 0)).toLocaleString()}
          </div>
          <div className={`text-xs mt-1 ${textSecondary}`}>
            Incidents pending: {(stats?.pending_incidents ?? 0).toLocaleString()} · Open concerns:{' '}
            {(stats?.open_concerns ?? 0).toLocaleString()}
          </div>
        </div>

        <div className={`p-5 rounded-xl border ${card}`}>
          <div className="flex items-center justify-between mb-3 gap-2">
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center shrink-0">
              <Building2 className="text-purple-500" size={24} />
            </div>
            <TrendChip label="Snapshot" isDark={isDark} />
          </div>
          <div className={`text-xs ${textSecondary} mb-1`}>Active partners</div>
          <div className={`text-2xl font-bold ${textPrimary} tabular-nums`}>
            {(summary?.active_partners ?? 0).toLocaleString()}
          </div>
          <div className={`text-xs mt-1 ${textSecondary}`}>
            Of {(summary?.total_partners ?? 0).toLocaleString()} total partner records
          </div>
        </div>
      </div>

      <div className={`p-5 rounded-xl border ${card}`}>
        <h3 className={`text-lg font-semibold ${textPrimary} mb-1`}>Platform snapshot</h3>
        <p className={`text-xs ${textSecondary} mb-4`}>
          Totals from `/api/admin/stats` and `/api/admin/analytics`. Weekly revenue and heatmaps require dedicated time-series tables.
        </p>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className={`rounded-lg p-4 ${isDark ? 'bg-slate-700/30' : 'bg-[#F8FAFC]'}`}>
            <div className="flex items-center gap-2 text-sm font-medium text-blue-400 mb-1">
              <Wallet size={16} /> MRR
            </div>
            <div className={`text-xl font-bold tabular-nums ${textPrimary}`}>
              ${Number(stats?.total_mrr ?? summary?.total_mrr ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>
          <div className={`rounded-lg p-4 ${isDark ? 'bg-slate-700/30' : 'bg-[#F8FAFC]'}`}>
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-400 mb-1">
              <Receipt size={16} /> Redemptions
            </div>
            <div className={`text-xl font-bold tabular-nums ${textPrimary}`}>
              {(summary?.total_redemptions ?? stats?.total_redemptions ?? 0).toLocaleString()}
            </div>
          </div>
          <div className={`rounded-lg p-4 ${isDark ? 'bg-slate-700/30' : 'bg-[#F8FAFC]'}`}>
            <div className="flex items-center gap-2 text-sm font-medium text-violet-400 mb-1">
              <CheckCircle size={16} /> Active offers
            </div>
            <div className={`text-xl font-bold tabular-nums ${textPrimary}`}>
              {(summary?.total_offers ?? 0).toLocaleString()}
            </div>
            <div className={`text-xs mt-1 ${textSecondary}`}>
              Online catalog: {onlineOfferCount.toLocaleString()}
              {offerProvider && offerProvider !== 'none' ? ` · ${offerProvider}` : ''}
            </div>
          </div>
          <div className={`rounded-lg p-4 ${isDark ? 'bg-slate-700/30' : 'bg-[#F8FAFC]'}`}>
            <div className="flex items-center gap-2 text-sm font-medium text-amber-400 mb-1">
              <Gem size={16} /> Gems in circulation
            </div>
            <div className={`text-xl font-bold tabular-nums ${textPrimary}`}>
              {(summary?.total_gems ?? 0).toLocaleString()}
            </div>
          </div>
        </div>
        <div className={`mt-4 flex flex-wrap gap-4 text-sm ${textSecondary}`}>
          <span className="inline-flex items-center gap-1.5">
            <Navigation size={14} className="text-emerald-400" />
            All-time trips: {(summary?.total_trips ?? 0).toLocaleString()}
          </span>
        </div>
      </div>

      <div className={`p-5 rounded-xl border ${card}`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h3 className={`text-lg font-semibold ${textPrimary}`}>Queues — needs attention</h3>
            <p className={`text-xs ${textSecondary}`}>Critical items requiring review</p>
          </div>
          <div className="w-8 h-8 rounded-full border border-red-300 flex items-center justify-center shrink-0 self-start sm:self-auto">
            <AlertTriangle className="text-red-400" size={14} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className={`p-4 rounded-xl border ${isDark ? 'border-white/[0.06]' : 'border-[#E6ECF5]'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <h4 className={`font-medium ${textPrimary}`}>Incident review</h4>
              <span className="text-xs font-medium text-white bg-red-500 px-2 py-0.5 rounded-full">
                {queues?.incident_review || 0} pending
              </span>
            </div>
            <div className="text-2xl font-bold text-blue-500 mb-3 tabular-nums">{queues?.incident_review || 0}</div>
            <button
              type="button"
              onClick={() => {
                try {
                  sessionStorage.setItem('snaproad_admin_incidents_status', 'pending')
                } catch {
                  /* ignore */
                }
                onNavigate?.('incidents')
              }}
              className="w-full py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
            >
              Review now
            </button>
          </div>

          <div className={`p-4 rounded-xl border ${isDark ? 'border-white/[0.06]' : 'border-[#E6ECF5]'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <h4 className={`font-medium ${textPrimary}`}>Consent pending</h4>
              <span className="text-xs font-medium text-white bg-orange-500 px-2 py-0.5 rounded-full">
                {queues?.consent_pending || 0}
              </span>
            </div>
            <div className="text-2xl font-bold text-blue-500 mb-3 tabular-nums">{queues?.consent_pending || 0}</div>
            <button
              type="button"
              onClick={() => onNavigate?.('legal')}
              className="w-full py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
            >
              Open legal
            </button>
          </div>

          <div className={`p-4 rounded-xl border ${isDark ? 'border-white/[0.06]' : 'border-[#E6ECF5]'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <h4 className={`font-medium ${textPrimary}`}>Fraud flags</h4>
              <span className="text-xs font-medium text-white bg-red-500 px-2 py-0.5 rounded-full">
                {queues?.fraud_flags || 0}
              </span>
            </div>
            <div className="text-2xl font-bold text-blue-500 mb-3 tabular-nums">{queues?.fraud_flags || 0}</div>
            <button
              type="button"
              onClick={() => {
                try {
                  sessionStorage.setItem('snaproad_audit_log_limit', '200')
                } catch {
                  /* ignore */
                }
                onNavigate?.('audit')
              }}
              className="w-full py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
            >
              View audit log
            </button>
          </div>
        </div>
      </div>

      <div className={`p-5 rounded-xl border ${card}`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h3 className={`text-lg font-semibold ${textPrimary}`}>Recent activity</h3>
            <p className={`text-xs ${textSecondary}`}>Summary highlights when the API does not return a feed</p>
          </div>
          <button
            type="button"
            onClick={() => {
              try {
                sessionStorage.setItem('snaproad_audit_log_limit', '200')
              } catch {
                /* ignore */
              }
              onNavigate?.('audit')
            }}
            className="text-sm text-blue-500 hover:text-blue-400 font-medium self-start sm:self-auto"
          >
            View all
          </button>
        </div>
        <div className="space-y-3">
          {(analytics?.recent_activity || [
            { icon: 'user', title: `${stats?.total_users ?? summary?.total_users ?? 0} users registered`, detail: 'Total platform users', time: 'Overall' },
            { icon: 'partner', title: `${stats?.active_partners ?? summary?.active_partners ?? 0} active partners`, detail: 'Business partners', time: 'Current' },
            { icon: 'trip', title: `${stats?.total_trips ?? summary?.total_trips ?? 0} trips tracked`, detail: 'Total driving sessions', time: 'All time' },
            { icon: 'offer', title: `${stats?.total_offers ?? summary?.total_offers ?? 0} active offers`, detail: onlineOfferCount > 0 ? `${onlineOfferCount.toLocaleString()} online catalog deals` : 'Partner offers', time: 'Current' },
          ]).map((activity: AdminRecentActivityItem) => {
            const iconMap: Record<string, typeof UserPlus> = { user: UserPlus, partner: Building2, trip: Navigation, offer: CheckCircle }
            const colorMap: Record<string, string> = {
              user: 'text-blue-400 bg-blue-500/20',
              partner: 'text-purple-400 bg-purple-500/20',
              trip: 'text-emerald-400 bg-emerald-500/20',
              offer: 'text-green-400 bg-green-500/20',
            }
            const iconKey = activity.icon ?? 'user'
            const IconComp = iconMap[iconKey] || UserPlus
            const colorClass = colorMap[iconKey] || 'text-blue-400 bg-blue-500/20'
            return { ...activity, IconComp, color: colorClass }
          }).map((activity: AdminRecentActivityItem & { IconComp: typeof UserPlus; color: string }, i: number) => {
            const RowIcon = activity.IconComp
            return (
            <div
              key={i}
              className={`flex items-center gap-3 p-3 rounded-lg min-w-0 ${isDark ? 'bg-slate-700/30' : 'bg-[#F8FAFC]'}`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${activity.color}`}>
                <RowIcon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${textPrimary} truncate`}>{activity.title}</div>
                <div className={`text-xs ${textSecondary} truncate`}>{activity.detail}</div>
              </div>
              <div className={`text-xs shrink-0 ${textSecondary}`}>{activity.time}</div>
            </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
