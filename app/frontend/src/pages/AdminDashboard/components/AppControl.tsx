import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import {
  RefreshCw,
  Users,
  Building2,
  AlertTriangle,
  FileText,
  Radio,
  LayoutGrid,
  Activity,
  MapPin,
  HeartPulse,
  Sliders,
  Layers,
  Compass,
  Copy,
  Check,
  Loader2,
  Search,
  X,
  ShieldAlert,
  Zap,
  Bell,
} from 'lucide-react'
import { adminApi } from '@/services/adminApi'
import type { Notification, AuditEntry } from '@/types/admin'
import SystemMonitorTab from '@/components/admin/SystemMonitorTab'

export type AppControlProps = {
  theme?: 'dark' | 'light'
  onNavigate?: (tabId: string) => void
}

type AppControlTab =
  | 'overview'
  | 'live_traffic'
  | 'app_flows'
  | 'live_ops'
  | 'concerns'
  | 'presence'
  | 'map'
  | 'health'
  | 'controls'
  | 'architecture'

type AppUsagePayload = {
  events_in_buffer: number
  api_events_counted: number
  top_prefixes: { prefix: string; count: number }[]
  top_paths: { path: string; count: number }[]
}

export default function AppControl({ theme = 'dark', onNavigate }: AppControlProps) {
  const isDark = theme === 'dark'
  const [activeTab, setActiveTab] = useState<AppControlTab>('overview')
  const [stats, setStats] = useState<Record<string, unknown> | null>(null)
  const [liveUsers, setLiveUsers] = useState<Record<string, unknown>[]>([])
  const [systemHealth, setSystemHealth] = useState<Record<string, unknown> | null>(null)
  const [supabaseStatus, setSupabaseStatus] = useState<Record<string, unknown> | null>(null)
  const [appConfig, setAppConfig] = useState<Record<string, unknown> | null>(null)
  const [appConfigMeta, setAppConfigMeta] = useState<
    Record<string, { updated_at?: string | null; updated_by?: string | null }>
  >({})
  const [appUsage, setAppUsage] = useState<AppUsagePayload | null>(null)
  const [healthCheckedAt, setHealthCheckedAt] = useState<Date | null>(null)
  const [mapReports, setMapReports] = useState<Record<string, unknown>[]>([])
  const [mapPartnerLocs, setMapPartnerLocs] = useState<Record<string, unknown>[]>([])
  const [, setLoading] = useState(true)

  useEffect(() => {
    loadAll()
    const interval = setInterval(loadAll, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (activeTab !== 'map') return
    let cancelled = false
    void Promise.all([adminApi.getAdminRoadReports(400), adminApi.getAdminPartnerMapLocations(500)]).then(([r, p]) => {
      if (cancelled) return
      const reps = (r.data as { reports?: Record<string, unknown>[] } | undefined)?.reports
      setMapReports(Array.isArray(reps) ? reps : [])
      const locs = (p.data as { locations?: Record<string, unknown>[] } | undefined)?.locations
      setMapPartnerLocs(Array.isArray(locs) ? locs : [])
    })
    return () => {
      cancelled = true
    }
  }, [activeTab])

  const loadAll = async () => {
    try {
      const [statsRes, usersRes, healthRes, configRes, sbRes, usageRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.getLiveUsers(),
        adminApi.getHealth(),
        adminApi.getConfigDetailed(),
        adminApi.getSupabaseStatus().catch(() => ({ success: false, data: null })),
        adminApi.getAppUsageTelemetry(500).catch(() => ({ success: false, data: null })),
      ])
      setHealthCheckedAt(new Date())
      const statsPayload =
        (statsRes as { data?: { data?: Record<string, unknown> } }).data?.data
        ?? (statsRes as { data?: Record<string, unknown> | null }).data
        ?? null
      setStats(statsPayload && typeof statsPayload === 'object' ? statsPayload : null)

      const liveList =
        (usersRes as { data?: { users?: Record<string, unknown>[] } }).data?.users
        ?? (usersRes as { data?: Record<string, unknown>[] }).data
        ?? []
      setLiveUsers(Array.isArray(liveList) ? liveList : [])

      const healthData = (healthRes as { data?: Record<string, unknown> | null }).data
      setSystemHealth(healthData && typeof healthData === 'object' ? healthData : null)
      const cd = (
        configRes as {
          success?: boolean
          data?: {
            config?: Record<string, unknown>
            meta?: Record<string, { updated_at?: string | null; updated_by?: string | null }>
          }
        }
      ).data
      if (cd && typeof cd === 'object' && cd.config && typeof cd.config === 'object') {
        setAppConfig(cd.config)
        setAppConfigMeta(cd.meta && typeof cd.meta === 'object' ? cd.meta : {})
      } else {
        setAppConfig(null)
        setAppConfigMeta({})
      }
      const sbData = (sbRes as { data?: Record<string, unknown> | null }).data
      setSupabaseStatus(sbData && typeof sbData === 'object' ? sbData : null)

      const uData = (usageRes as { success?: boolean; data?: AppUsagePayload | null }).data
      setAppUsage(uData && typeof uData === 'object' ? uData : null)
    } catch (e) {
      console.error('Operations load failed:', e)
    } finally {
      setLoading(false)
    }
  }

  const shell = isDark
    ? 'text-slate-100'
    : 'text-gray-900'

  const TABS: { id: AppControlTab; label: string; icon: typeof LayoutGrid; description: string }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid, description: 'KPIs & live pulse' },
    { id: 'live_traffic', label: 'Live traffic', icon: Activity, description: 'Requests, latency, WebSocket' },
    { id: 'app_flows', label: 'App flows', icon: Compass, description: 'Which API areas are busiest (aggregate)' },
    { id: 'live_ops', label: 'Live ops', icon: Bell, description: 'Notifications & recent audit (command view)' },
    { id: 'concerns', label: 'Concerns', icon: AlertTriangle, description: 'User-reported issues' },
    { id: 'presence', label: 'Presence', icon: Radio, description: 'Who is online now' },
    { id: 'map', label: 'Live map', icon: MapPin, description: 'Mapbox · drivers with shared location' },
    { id: 'health', label: 'Health', icon: HeartPulse, description: 'Dependencies & Supabase' },
    { id: 'controls', label: 'Runtime controls', icon: Sliders, description: 'Kill switches, presets & safety gates' },
    { id: 'architecture', label: 'Stack', icon: Layers, description: 'System map' },
  ]

  const pill = (active: boolean) =>
    `inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
      active
        ? isDark
          ? 'bg-blue-500/25 text-blue-200 ring-1 ring-blue-500/40'
          : 'bg-blue-100 text-blue-900 ring-1 ring-blue-200'
        : isDark
          ? 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
          : 'text-gray-600 hover:bg-gray-100'
    }`

  const quick = `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
    isDark
      ? 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
  }`

  return (
    <div className={`space-y-6 ${shell}`}>
      <div
        className={`rounded-2xl border p-5 ${
          isDark ? 'bg-slate-900/40 border-white/[0.08]' : 'bg-white border-gray-200 shadow-sm'
        }`}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Operations command center
            </h2>
            <p className={`text-sm mt-1 max-w-2xl ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
              Launch-day supervision: platform vitals, live API telemetry, aggregate app-flow traffic (which features
              are hitting the API), live map presence, concerns, and kill switches. This is not screen recording—you
              see traffic patterns and who is online with location when the app shares it.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-2 text-xs font-medium px-2 py-1 rounded-full ${
                isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {liveUsers.length} live sessions
            </span>
            <button
              type="button"
              onClick={loadAll}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                isDark
                  ? 'bg-white/10 text-white hover:bg-white/15'
                  : 'bg-gray-900 text-white hover:bg-gray-800'
              }`}
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>

        <div className={`mt-4 pt-4 border-t flex flex-wrap gap-2 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
          <span className={`text-xs font-semibold uppercase tracking-wide w-full mb-1 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
            Jump to workspace
          </span>
          <button type="button" className={quick} onClick={() => onNavigate?.('users')}>
            <Users size={14} />
            Users &amp; families
          </button>
          <button type="button" className={quick} onClick={() => onNavigate?.('partners')}>
            <Building2 size={14} />
            Partners
          </button>
          <button type="button" className={quick} onClick={() => onNavigate?.('incidents')}>
            <AlertTriangle size={14} />
            Incidents
          </button>
          <button type="button" className={quick} onClick={() => onNavigate?.('audit')}>
            <FileText size={14} />
            Audit log
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              title={tab.description}
              className={pill(active)}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={16} className={active ? 'opacity-100' : 'opacity-70'} />
              {tab.label}
            </button>
          )
        })}
      </div>

      <div
        className={`rounded-2xl border min-h-[320px] p-1 ${
          isDark ? 'border-white/[0.08] bg-slate-900/20' : 'border-gray-200 bg-gray-50/50'
        }`}
      >
        <div className="p-4 md:p-5">
          {activeTab === 'overview' && (
            <OverviewTab stats={stats} liveUsers={liveUsers} isDark={isDark} />
          )}
          {activeTab === 'live_traffic' && <SystemMonitorTab theme={theme} />}
          {activeTab === 'app_flows' && (
            <AppFlowsTab data={appUsage} isDark={isDark} onRefresh={loadAll} />
          )}
          {activeTab === 'live_ops' && (
            <LiveOpsTab
              isDark={isDark}
              onRefresh={() => void loadAll()}
              onOpenAudit={() => onNavigate?.('audit')}
              onOpenNotifications={() => onNavigate?.('notifications')}
            />
          )}
          {activeTab === 'concerns' && (
            <ConcernsTab
              isDark={isDark}
              onOpenControls={() => setActiveTab('controls')}
              onOpenIncidents={() => onNavigate?.('incidents')}
              onOpsRefresh={loadAll}
            />
          )}
          {activeTab === 'presence' && (
            <PresenceTab
              users={liveUsers}
              isDark={isDark}
              onOpenDirectory={() => onNavigate?.('users')}
            />
          )}
          {activeTab === 'map' && (
            <AdminLiveMapTab
              users={liveUsers}
              reports={mapReports}
              partnerLocations={mapPartnerLocs}
              isDark={isDark}
              onRefreshMap={async () => {
                await loadAll()
                try {
                  const [r, p] = await Promise.all([
                    adminApi.getAdminRoadReports(400),
                    adminApi.getAdminPartnerMapLocations(500),
                  ])
                  const reps = (r.data as { reports?: Record<string, unknown>[] } | undefined)?.reports
                  setMapReports(Array.isArray(reps) ? reps : [])
                  const locs = (p.data as { locations?: Record<string, unknown>[] } | undefined)?.locations
                  setMapPartnerLocs(Array.isArray(locs) ? locs : [])
                } catch {
                  /* keep previous */
                }
              }}
            />
          )}
          {activeTab === 'health' && (
            <HealthTab
              health={systemHealth}
              supabaseStatus={supabaseStatus}
              isDark={isDark}
              checkedAt={healthCheckedAt}
              onRefresh={() => void loadAll()}
            />
          )}
          {activeTab === 'controls' && (
            <ControlsTab
              config={appConfig}
              meta={appConfigMeta}
              onUpdate={loadAll}
              isDark={isDark}
              onGotoOpsTab={(id) => setActiveTab(id as AppControlTab)}
              onGotoPortal={onNavigate}
            />
          )}
          {activeTab === 'architecture' && <ArchitectureTab isDark={isDark} />}
        </div>
      </div>
    </div>
  )
}

function LiveOpsTab({
  isDark,
  onRefresh,
  onOpenAudit,
  onOpenNotifications,
}: {
  isDark: boolean
  onRefresh: () => void
  onOpenAudit: () => void
  onOpenNotifications: () => void
}) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const [nRes, aRes] = await Promise.all([adminApi.getNotifications(), adminApi.getAuditLog(25)])
      const rawN = nRes.data
      setNotifications(Array.isArray(rawN) ? rawN.slice(0, 14) : [])
      const rawA = aRes.data
      setAudit(Array.isArray(rawA) ? rawA.slice(0, 18) : [])
    } catch {
      setErr('Could not load live ops feeds.')
      setNotifications([])
      setAudit([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const card = isDark ? 'bg-slate-800/40 border-white/[0.08]' : 'bg-white border-gray-200 shadow-sm'
  const muted = isDark ? 'text-slate-500' : 'text-gray-500'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Live operations</h3>
          <p className={`text-sm ${muted}`}>
            Recent admin notifications and audit lines—without leaving Operations. Full history lives in the dedicated tabs.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              onRefresh()
              void load()
            }}
            disabled={loading}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${
              isDark ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-gray-900 text-white hover:bg-gray-800'
            } disabled:opacity-50`}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Refresh feeds
          </button>
          <button type="button" onClick={onOpenNotifications} className={`text-xs font-semibold px-3 py-2 rounded-lg border ${isDark ? 'border-white/15 text-white' : 'border-gray-200 text-gray-900'}`}>
            All notifications
          </button>
          <button type="button" onClick={onOpenAudit} className={`text-xs font-semibold px-3 py-2 rounded-lg border ${isDark ? 'border-white/15 text-white' : 'border-gray-200 text-gray-900'}`}>
            Full audit log
          </button>
        </div>
      </div>

      {err && (
        <div className={`text-sm rounded-lg px-3 py-2 border ${isDark ? 'bg-red-500/10 border-red-500/30 text-red-200' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {err}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <div className={`rounded-xl border p-4 ${card}`}>
          <div className="flex items-center gap-2 mb-3">
            <Bell size={18} className={isDark ? 'text-amber-400' : 'text-amber-600'} />
            <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Notifications</h4>
          </div>
          <div className="space-y-2 max-h-[min(52vh,420px)] overflow-y-auto text-sm">
            {notifications.length === 0 && !loading ? (
              <p className={muted}>No notifications in the current window.</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={String(n.id ?? Math.random())}
                  className={`rounded-lg border px-3 py-2 ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-gray-100 bg-gray-50'}`}
                >
                  <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{String(n.title ?? 'Notice')}</div>
                  <div className={`text-xs mt-0.5 ${muted}`}>{String(n.message ?? '').slice(0, 220)}</div>
                  <div className={`text-[10px] mt-1 ${muted}`}>{n.created_at ? String(n.created_at) : ''}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={`rounded-xl border p-4 ${card}`}>
          <div className="flex items-center gap-2 mb-3">
            <FileText size={18} className={isDark ? 'text-sky-400' : 'text-sky-600'} />
            <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Recent audit</h4>
          </div>
          <div className="space-y-2 max-h-[min(52vh,420px)] overflow-y-auto text-xs font-mono">
            {audit.length === 0 && !loading ? (
              <p className={muted}>No audit entries loaded.</p>
            ) : (
              audit.map((row) => (
                <div
                  key={String(row.id ?? row.created_at ?? Math.random())}
                  className={`rounded-lg border px-2 py-1.5 ${isDark ? 'border-white/10 bg-black/20' : 'border-gray-100 bg-gray-50'}`}
                >
                  <span className={isDark ? 'text-amber-200/90' : 'text-amber-800'}>{String(row.action ?? '—')}</span>
                  <span className={muted}> · </span>
                  <span className={isDark ? 'text-slate-300' : 'text-gray-700'}>{String(row.details ?? '').slice(0, 160)}</span>
                  <div className={`text-[10px] mt-0.5 ${muted}`}>{row.created_at ? String(row.created_at) : ''}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <p className={`text-xs ${muted}`}>
        Tip: runtime control changes now write <code className="text-[10px]">APP_CONFIG_UPDATED</code> rows—watch for them in audit after toggles.
      </p>
    </div>
  )
}

function OverviewTab({
  stats,
  liveUsers,
  isDark,
}: {
  stats: Record<string, unknown> | null
  liveUsers: Record<string, unknown>[]
  isDark: boolean
}) {
  const card = isDark
    ? 'bg-slate-800/40 border-white/[0.08]'
    : 'bg-white border-gray-200 shadow-sm'
  const muted = isDark ? 'text-slate-400' : 'text-gray-500'
  const val = (n: unknown) => (typeof n === 'number' ? n.toLocaleString() : String(n ?? '—'))

  const metrics = [
    { label: 'Total drivers', value: val(stats?.total_users ?? 0), accent: 'text-blue-400' },
    { label: 'Active today', value: val(stats?.active_today ?? 0), accent: 'text-emerald-400' },
    { label: 'Trips today', value: val(stats?.trips_today ?? 0), accent: 'text-amber-400' },
    { label: 'Miles driven', value: val(stats?.total_miles ?? 0), accent: 'text-violet-400' },
    { label: 'Open concerns', value: val(stats?.open_concerns ?? 0), accent: 'text-red-400' },
    { label: 'Gems awarded', value: val(stats?.total_gems ?? 0), accent: 'text-emerald-400' },
    {
      label: 'Offers redeemed',
      value: val(stats?.offers_redeemed ?? stats?.total_redemptions ?? 0),
      accent: 'text-amber-400',
    },
    { label: 'Revenue', value: typeof stats?.revenue === 'number' ? `$${stats.revenue}` : String(stats?.revenue ?? '$0'), accent: 'text-emerald-400' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h3 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Platform overview
        </h3>
        <p className={`text-sm ${muted}`}>High-level KPIs refreshed every 30s</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className={`rounded-xl border p-4 ${card}`}>
            <div className={`text-2xl font-bold tabular-nums ${m.accent}`}>{m.value}</div>
            <div className={`text-xs mt-1 ${muted}`}>{m.label}</div>
          </div>
        ))}
      </div>
      <div className={`rounded-xl border p-4 ${card}`}>
        <div className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          Live now ({liveUsers.length})
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {liveUsers.slice(0, 12).map((u) => (
            <div
              key={String(u.id)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
                isDark ? 'bg-white/[0.04]' : 'bg-gray-50'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                  u.is_navigating ? 'bg-blue-500' : 'bg-emerald-600'
                }`}
              >
                {String((u.name as string) ?? 'U').charAt(0)}
              </div>
              <div className="min-w-0">
                <div className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {(u.name as string) ?? 'Driver'}
                </div>
                <div className={`text-xs ${u.is_navigating ? 'text-blue-400' : 'text-emerald-500'}`}>
                  {u.is_navigating
                    ? `Navigating · ${Math.round(Number(u.speed_mph) || 0)} mph`
                    : 'Online'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function formatConcernContext(ctx: unknown): string {
  if (ctx == null || ctx === '') return ''
  if (typeof ctx === 'string') {
    try {
      return JSON.stringify(JSON.parse(ctx), null, 2)
    } catch {
      return ctx
    }
  }
  try {
    return JSON.stringify(ctx, null, 2)
  } catch {
    return String(ctx)
  }
}

function concernRelativeTime(iso: string | undefined): string {
  if (!iso) return '—'
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return '—'
  const sec = Math.floor((Date.now() - t) / 1000)
  if (sec < 45) return 'just now'
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`
  return new Date(iso).toLocaleDateString()
}

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-300 border-red-500/30',
  high: 'bg-amber-500/20 text-amber-200 border-amber-500/30',
  medium: 'bg-blue-500/20 text-blue-200 border-blue-500/30',
  low: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30',
}

const STATUS_STYLES_DARK: Record<string, string> = {
  open: 'bg-violet-500/20 text-violet-200 border-violet-500/35',
  in_progress: 'bg-sky-500/20 text-sky-200 border-sky-500/35',
  resolved: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/35',
  closed: 'bg-slate-500/25 text-slate-300 border-slate-500/35',
}

const STATUS_STYLES_LIGHT: Record<string, string> = {
  open: 'bg-violet-100 text-violet-900 border-violet-200',
  in_progress: 'bg-sky-100 text-sky-900 border-sky-200',
  resolved: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  closed: 'bg-gray-100 text-gray-700 border-gray-200',
}

function ConcernsTab({
  isDark,
  onOpenControls,
  onOpenIncidents,
  onOpsRefresh,
}: {
  isDark: boolean
  onOpenControls?: () => void
  onOpenIncidents?: () => void
  onOpsRefresh?: () => void | Promise<void>
}) {
  const [items, setItems] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [selectedConcern, setSelectedConcern] = useState<Record<string, unknown> | null>(null)
  const [severityFilter, setSeverityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [emergencyModal, setEmergencyModal] = useState<{
    title: string
    detail: string
    patch: Record<string, unknown>
  } | null>(null)
  const [emergencyConfirm, setEmergencyConfirm] = useState(false)
  const [emergencyBusy, setEmergencyBusy] = useState(false)

  const loadConcerns = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await adminApi.getConcerns({ limit: 200 })
      const payload = res.data as { concerns?: Record<string, unknown>[] } | undefined
      const list = Array.isArray(payload?.concerns) ? payload.concerns : []
      setItems(list)
    } catch {
      setLoadError('Could not load concerns.')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadConcerns()
  }, [loadConcerns])

  const matchesCrossFilters = useCallback(
    (c: Record<string, unknown>, ignoreSeverity: boolean, ignoreStatus: boolean) => {
      const sevOk = ignoreSeverity || severityFilter === 'all' || String(c.severity) === severityFilter
      const stOk = ignoreStatus || statusFilter === 'all' || String(c.status ?? 'open') === statusFilter
      return sevOk && stOk
    },
    [severityFilter, statusFilter],
  )

  const severityCounts = useMemo(() => {
    const keys = ['critical', 'high', 'medium', 'low'] as const
    return Object.fromEntries(keys.map((k) => [k, items.filter((c) => matchesCrossFilters(c, true, false) && String(c.severity) === k).length])) as Record<string, number>
  }, [items, matchesCrossFilters])

  const statusCounts = useMemo(() => {
    const keys = ['open', 'in_progress', 'resolved', 'closed'] as const
    return Object.fromEntries(
      keys.map((k) => [k, items.filter((c) => matchesCrossFilters(c, false, true) && String(c.status ?? 'open') === k).length]),
    ) as Record<string, number>
  }, [items, matchesCrossFilters])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((c) => {
      if (!matchesCrossFilters(c, false, false)) return false
      if (!q) return true
      const blob = [
        c.title,
        c.description,
        c.category,
        c.user_name,
        c.user_id,
        String(c.id ?? ''),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return blob.includes(q)
    })
  }, [items, search, matchesCrossFilters])

  const updateStatus = async (id: string, status: string) => {
    setActionError(null)
    setActionBusy(true)
    try {
      const res = await adminApi.updateConcernStatus(id, status)
      if (!res.success) {
        setActionError(res.message || res.error || 'Update failed')
        setActionBusy(false)
        return
      }
      await loadConcerns()
      setSelectedConcern((prev) =>
        prev && String(prev.id) === id ? { ...prev, status } : prev,
      )
    } catch {
      setActionError('Network error while updating.')
    } finally {
      setActionBusy(false)
    }
  }

  const copyText = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      window.setTimeout(() => setCopied(null), 2000)
    } catch {
      setActionError('Could not copy to clipboard.')
    }
  }

  const applyEmergencyPatch = async () => {
    if (!emergencyModal || !emergencyConfirm) return
    setEmergencyBusy(true)
    setActionError(null)
    try {
      const res = await adminApi.updateConfig(emergencyModal.patch, {
        reason: `Concerns tab shortcut: ${emergencyModal.title}`,
      })
      if (!res.success) {
        setActionError(res.message || res.error || 'Config update failed')
        return
      }
      setEmergencyModal(null)
      setEmergencyConfirm(false)
      await onOpsRefresh?.()
    } catch {
      setActionError('Network error while updating config.')
    } finally {
      setEmergencyBusy(false)
    }
  }

  const card = isDark ? 'bg-slate-800/40 border-white/[0.08]' : 'bg-white border-gray-200'
  const statusStyles = isDark ? STATUS_STYLES_DARK : STATUS_STYLES_LIGHT
  const inputCls = isDark
    ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-500'
    : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400'

  return (
    <div className="flex flex-col gap-4">
      <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
        <p className="text-sm">
          User-submitted feedback from the app (last {items.length} loaded, newest first). Use filters and search to triage;
          status updates sync to Supabase.
        </p>
        <button
          type="button"
          onClick={() => void loadConcerns()}
          disabled={loading}
          className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold shrink-0 ${
            isDark ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-gray-900 text-white hover:bg-gray-800'
          } disabled:opacity-50`}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Refresh list
        </button>
      </div>

      {(onOpenControls || onOpenIncidents) && (
        <div
          className={`flex flex-wrap items-center gap-2 p-3 rounded-xl border ${
            isDark ? 'border-amber-500/20 bg-amber-500/[0.07]' : 'border-amber-200 bg-amber-50'
          }`}
        >
          <span className={`text-[11px] font-bold uppercase tracking-wide w-full ${isDark ? 'text-amber-200/90' : 'text-amber-900'}`}>
            From a concern → act fast
          </span>
          {onOpenControls && (
            <button
              type="button"
              onClick={onOpenControls}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${
                isDark ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-white text-gray-900 border border-amber-200 shadow-sm'
              }`}
            >
              Kill switches &amp; runtime controls
            </button>
          )}
          {onOpenIncidents && (
            <button
              type="button"
              onClick={onOpenIncidents}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${
                isDark ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-white text-gray-900 border border-amber-200 shadow-sm'
              }`}
            >
              AI moderation queue
            </button>
          )}
          <span className={`text-[11px] w-full ${isDark ? 'text-slate-500' : 'text-gray-600'}`}>
            Spam or map issues? Pause incident submissions or voting under Safety controls.
          </span>
        </div>
      )}

      {onOpsRefresh && (
        <div
          className={`flex flex-wrap items-center gap-2 p-3 rounded-xl border ${
            isDark ? 'border-red-500/25 bg-red-500/[0.06]' : 'border-red-200 bg-red-50/80'
          }`}
        >
          <span className={`text-[11px] font-bold uppercase tracking-wide w-full ${isDark ? 'text-red-200/90' : 'text-red-900'}`}>
            Apply incident controls (API)
          </span>
          <button
            type="button"
            onClick={() => {
              setEmergencyConfirm(false)
              setEmergencyModal({
                title: 'Pause new incident reports',
                detail: 'Sets incident_submissions_enabled = false. Drivers cannot file new road reports until re-enabled.',
                patch: { incident_submissions_enabled: false },
              })
            }}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${
              isDark ? 'bg-red-500/20 text-red-100 hover:bg-red-500/30' : 'bg-white text-red-800 border border-red-200'
            }`}
          >
            Pause incident reports
          </button>
          <button
            type="button"
            onClick={() => {
              setEmergencyConfirm(false)
              setEmergencyModal({
                title: 'Pause incident voting',
                detail: 'Sets incident_voting_enabled = false. Upvotes, downvotes, and confirm/deny are blocked.',
                patch: { incident_voting_enabled: false },
              })
            }}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${
              isDark ? 'bg-red-500/20 text-red-100 hover:bg-red-500/30' : 'bg-white text-red-800 border border-red-200'
            }`}
          >
            Pause voting
          </button>
          <button
            type="button"
            onClick={() => {
              setEmergencyConfirm(false)
              setEmergencyModal({
                title: 'Lock down map incidents',
                detail: 'Disables both new reports and voting—fastest lever for map spam.',
                patch: { incident_submissions_enabled: false, incident_voting_enabled: false },
              })
            }}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${
              isDark ? 'bg-red-600/30 text-white hover:bg-red-600/40' : 'bg-red-600 text-white'
            }`}
          >
            Pause reports + voting
          </button>
          <span className={`text-[11px] w-full ${isDark ? 'text-slate-500' : 'text-gray-600'}`}>
            Confirms before calling the API. Re-enable from Runtime controls when stable.
          </span>
        </div>
      )}

      {loadError && (
        <div className={`text-sm rounded-lg px-3 py-2 border ${isDark ? 'bg-red-500/10 border-red-500/30 text-red-200' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {loadError}
        </div>
      )}

      <div className="relative">
        <Search
          size={16}
          className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}
        />
        <input
          type="search"
          placeholder="Search title, description, category, reporter…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`w-full rounded-xl border pl-9 pr-3 py-2.5 text-sm ${inputCls}`}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
          Severity
        </span>
        <div className="flex flex-wrap gap-2">
          {(['all', 'critical', 'high', 'medium', 'low'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setSeverityFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize border ${
                severityFilter === f
                  ? isDark
                    ? 'bg-blue-500/30 border-blue-400/50 text-white'
                    : 'bg-blue-600 text-white border-blue-600'
                  : isDark
                    ? 'bg-white/5 border-white/10 text-slate-300'
                    : 'bg-gray-100 border-gray-200 text-gray-700'
              }`}
            >
              {f}
              {f === 'all'
                ? ` (${items.filter((c) => matchesCrossFilters(c, true, false)).length})`
                : ` (${severityCounts[f] ?? 0})`}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
          Status
        </span>
        <div className="flex flex-wrap gap-2">
          {(['all', 'open', 'in_progress', 'resolved', 'closed'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                f === 'all' ? 'capitalize' : ''
              } ${
                statusFilter === f
                  ? isDark
                    ? 'bg-blue-500/30 border-blue-400/50 text-white'
                    : 'bg-blue-600 text-white border-blue-600'
                  : isDark
                    ? 'bg-white/5 border-white/10 text-slate-300'
                    : 'bg-gray-100 border-gray-200 text-gray-700'
              }`}
            >
              {f === 'all' ? 'All' : f.replace('_', ' ')}
              {f === 'all'
                ? ` (${items.filter((c) => matchesCrossFilters(c, false, true)).length})`
                : ` (${statusCounts[f] ?? 0})`}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 min-w-0 space-y-2">
          {loading && items.length === 0 ? (
            <div className={`flex items-center gap-2 text-sm py-8 justify-center ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              <Loader2 size={18} className="animate-spin" />
              Loading concerns…
            </div>
          ) : filtered.length === 0 ? (
            <div className={`text-sm py-8 text-center rounded-xl border ${card} ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              No concerns match the current filters.
            </div>
          ) : (
            filtered.map((concern) => {
              const st = String(concern.status ?? 'open')
              return (
                <button
                  key={String(concern.id)}
                  type="button"
                  onClick={() => setSelectedConcern(concern)}
                  className={`w-full text-left rounded-xl border p-3 transition-colors ${
                    selectedConcern?.id === concern.id
                      ? isDark
                        ? 'border-blue-500/50 bg-blue-500/10'
                        : 'border-blue-400 bg-blue-50'
                      : card
                  }`}
                >
                  <div className="flex justify-between gap-2 items-start">
                    <span className={`font-medium text-sm line-clamp-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {String(concern.title || concern.category || 'Concern')}
                    </span>
                    <div className="flex flex-wrap gap-1 justify-end shrink-0 max-w-[140px]">
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                          SEVERITY_STYLES[String(concern.severity)] || SEVERITY_STYLES.medium
                        }`}
                      >
                        {String(concern.severity)}
                      </span>
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                          statusStyles[st] || statusStyles.open
                        }`}
                      >
                        {st.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <div className={`text-xs mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                    <span>{String(concern.category)}</span>
                    <span>·</span>
                    <span>{concernRelativeTime(concern.created_at ? String(concern.created_at) : undefined)}</span>
                    {concern.user_name ? (
                      <>
                        <span>·</span>
                        <span className="truncate max-w-[12rem]">{String(concern.user_name)}</span>
                      </>
                    ) : null}
                  </div>
                </button>
              )
            })
          )}
        </div>

        {selectedConcern && (
          <div className={`w-full lg:w-[26rem] shrink-0 rounded-xl border p-4 space-y-3 ${card}`}>
            <div className="flex justify-between gap-2 items-start">
              <h4 className={`font-semibold text-sm leading-snug ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {String(selectedConcern.title || selectedConcern.category || 'Concern')}
              </h4>
              <button
                type="button"
                title="Copy concern id"
                onClick={() => void copyText('id', String(selectedConcern.id))}
                className={`shrink-0 p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-gray-100 text-gray-500'}`}
              >
                {copied === 'id' ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <span
                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                  SEVERITY_STYLES[String(selectedConcern.severity)] || SEVERITY_STYLES.medium
                }`}
              >
                {String(selectedConcern.severity)}
              </span>
              <span
                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                  statusStyles[String(selectedConcern.status ?? 'open')] || statusStyles.open
                }`}
              >
                {String(selectedConcern.status ?? 'open').replace('_', ' ')}
              </span>
            </div>

            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
              {selectedConcern.created_at
                ? new Date(String(selectedConcern.created_at)).toLocaleString()
                : ''}
              {selectedConcern.updated_at && selectedConcern.updated_at !== selectedConcern.created_at ? (
                <span className="block mt-0.5">
                  Updated {new Date(String(selectedConcern.updated_at)).toLocaleString()}
                </span>
              ) : null}
            </p>

            <div className={`text-xs space-y-1 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-[10px] uppercase tracking-wide">Reporter</span>
                <span>{String(selectedConcern.user_name ?? '—')}</span>
                {selectedConcern.user_id ? (
                  <button
                    type="button"
                    onClick={() => void copyText('uid', String(selectedConcern.user_id))}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono ${
                      isDark ? 'bg-white/10 hover:bg-white/15' : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {copied === 'uid' ? <Check size={12} /> : <Copy size={12} />}
                    {String(selectedConcern.user_id).slice(0, 8)}…
                  </button>
                ) : null}
              </div>
              <div>
                <span className="font-medium text-[10px] uppercase tracking-wide">Category</span>{' '}
                {String(selectedConcern.category ?? '—')}
              </div>
            </div>

            <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
              {String(selectedConcern.description ?? '')}
            </p>

            {selectedConcern.context != null && String(formatConcernContext(selectedConcern.context)).trim() !== '' ? (
              <details className={`rounded-lg border overflow-hidden ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                <summary
                  className={`cursor-pointer text-xs font-semibold px-3 py-2 ${isDark ? 'bg-white/5 text-slate-300' : 'bg-gray-50 text-gray-700'}`}
                >
                  App context (JSON)
                </summary>
                <pre
                  className={`text-[11px] leading-relaxed p-3 max-h-56 overflow-auto font-mono ${
                    isDark ? 'bg-black/30 text-slate-300' : 'bg-gray-50 text-gray-800'
                  }`}
                >
                  {formatConcernContext(selectedConcern.context)}
                </pre>
              </details>
            ) : null}

            {actionError ? (
              <div className={`text-xs rounded-lg px-2 py-1.5 ${isDark ? 'bg-red-500/15 text-red-200' : 'bg-red-50 text-red-700'}`}>
                {actionError}
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2 pt-1">
              {[
                { status: 'in_progress', label: 'In progress' },
                { status: 'resolved', label: 'Resolved' },
                { status: 'closed', label: 'Close' },
                { status: 'open', label: 'Reopen' },
              ].map((action) => (
                <button
                  key={action.status}
                  type="button"
                  disabled={actionBusy}
                  onClick={() => void updateStatus(String(selectedConcern.id), action.status)}
                  className={`py-2 rounded-lg text-xs font-semibold disabled:opacity-50 ${
                    isDark
                      ? 'bg-white/10 hover:bg-white/15 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {emergencyModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60" role="dialog" aria-modal="true">
          <div
            className={`w-full max-w-md rounded-2xl border shadow-xl p-5 ${isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
          >
            <div className="flex justify-between items-start gap-2">
              <h3 className="text-lg font-bold pr-6">{emergencyModal.title}</h3>
              <button
                type="button"
                className="p-1 rounded-lg hover:bg-white/10"
                onClick={() => {
                  setEmergencyModal(null)
                  setEmergencyConfirm(false)
                }}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <p className={`text-sm mt-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{emergencyModal.detail}</p>
            <label className={`flex items-start gap-2 mt-4 text-sm cursor-pointer ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
              <input
                type="checkbox"
                checked={emergencyConfirm}
                onChange={(e) => setEmergencyConfirm(e.target.checked)}
                className="mt-1"
              />
              <span>I understand this changes live API behavior immediately.</span>
            </label>
            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => {
                  setEmergencyModal(null)
                  setEmergencyConfirm(false)
                }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold ${isDark ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-900'}`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={emergencyBusy || !emergencyConfirm}
                onClick={() => void applyEmergencyPatch()}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-500 text-white disabled:opacity-40"
              >
                {emergencyBusy ? 'Applying…' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ArchitectureTab({ isDark }: { isDark: boolean }) {
  const layers = [
    {
      layer: 'Client apps',
      color: 'text-blue-400',
      items: ['Driver / mobile (Expo)', 'Partner portal', 'Admin console'],
    },
    {
      layer: 'API',
      color: 'text-emerald-400',
      items: ['FastAPI + uvicorn', 'Auth (JWT + Supabase)', 'Telemetry middleware'],
    },
    {
      layer: 'Data & realtime',
      color: 'text-amber-400',
      items: ['Supabase Postgres', 'Realtime', 'Storage'],
    },
    {
      layer: 'External',
      color: 'text-violet-400',
      items: ['Maps / directions', 'OpenAI (Orion)', 'Stripe / webhooks'],
    },
  ]
  const card = isDark ? 'bg-slate-800/30 border-white/[0.06]' : 'bg-gray-50 border-gray-200'

  return (
    <div className="space-y-6">
      <p className={isDark ? 'text-slate-400 text-sm' : 'text-gray-600 text-sm'}>
        High-level dependency map for launch readiness reviews.
      </p>
      {layers.map((L) => (
        <div key={L.layer}>
          <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${L.color}`}>{L.layer}</div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {L.items.map((name) => (
              <div key={name} className={`rounded-lg border px-3 py-2 text-sm ${card} ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
                {name}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

const HEALTH_IMPACT: Record<string, { affects: string; action: string }> = {
  'API server': { affects: 'All clients (driver, partner, admin)', action: 'If down: declare incident; nothing else works.' },
  'Supabase DB': { affects: 'Auth, profiles, offers, locations, config', action: 'If down: enable maintenance; avoid config changes.' },
  'Supabase Realtime': { affects: 'Live updates, friend presence streams', action: 'If degraded: app works; live features may lag.' },
  'Google Maps API': { affects: 'Routing, geocoding, map tiles in apps', action: 'If down: navigation degraded; consider banner.' },
  'OHGO API': { affects: 'Traffic camera layer on driver map', action: 'If down: turn off OHGO cameras in kill switches.' },
  'OpenAI API': { affects: 'Orion coach, AI photo moderation', action: 'If down: disable Orion / AI moderation toggles.' },
}

function HealthTab({
  health,
  supabaseStatus,
  isDark,
  checkedAt,
  onRefresh,
}: {
  health: Record<string, unknown> | null
  supabaseStatus: Record<string, unknown> | null
  isDark: boolean
  checkedAt: Date | null
  onRefresh: () => void
}) {
  const checks = [
    { name: 'API server', status: String(health?.api ?? 'unknown'), latency: health?.api_latency },
    { name: 'Supabase DB', status: String(health?.database ?? 'unknown'), latency: health?.db_latency },
    { name: 'Supabase Realtime', status: String(health?.realtime ?? 'unknown'), latency: '—' },
    { name: 'Google Maps API', status: String(health?.google_maps ?? 'unknown'), latency: health?.maps_latency },
    { name: 'OHGO API', status: String(health?.ohgo ?? 'unknown'), latency: '—' },
    { name: 'OpenAI API', status: String(health?.openai ?? 'unknown'), latency: health?.openai_latency },
  ]
  const dot = (s: string) =>
    s === 'healthy'
      ? 'bg-emerald-400'
      : s === 'degraded'
        ? 'bg-amber-400'
        : s === 'down'
          ? 'bg-red-400'
          : 'bg-slate-500'
  const card = isDark ? 'bg-slate-800/40 border-white/[0.08]' : 'bg-white border-gray-200 shadow-sm'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
          <span className="font-semibold text-inherit">Dependency checks</span>
          <span className="mx-2 opacity-50">·</span>
          Overview refresh cadence: 30s with the rest of Operations.
          {checkedAt && (
            <span className="block text-xs mt-1 opacity-90">
              Last sampled: {checkedAt.toLocaleString()}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${
            isDark ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-gray-900 text-white hover:bg-gray-800'
          }`}
        >
          <RefreshCw size={14} />
          Refresh now
        </button>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {checks.map((c) => {
          const hint = HEALTH_IMPACT[c.name]
          return (
            <div key={c.name} className={`rounded-xl border p-4 ${card}`}>
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{c.name}</span>
                <span className={`w-2.5 h-2.5 rounded-full ${dot(c.status)}`} />
              </div>
              <div className={`text-lg font-bold capitalize mt-2 ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
                {c.status}
              </div>
              <div className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                Latency: {typeof c.latency === 'number' ? `${c.latency}ms` : String(c.latency ?? '—')}
              </div>
              {hint && (
                <div className={`mt-3 pt-3 border-t space-y-1 ${isDark ? 'border-white/10 text-slate-400' : 'border-gray-100 text-gray-600'}`}>
                  <div className="text-[11px] font-semibold uppercase tracking-wide opacity-80">User impact</div>
                  <p className="text-xs leading-snug">{hint.affects}</p>
                  <div className="text-[11px] font-semibold uppercase tracking-wide opacity-80 pt-1">Ops hint</div>
                  <p className="text-xs leading-snug">{hint.action}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
      {supabaseStatus && Object.keys(supabaseStatus).length > 0 && (
        <div className={`rounded-xl border p-4 ${card}`}>
          <h4 className={`text-sm font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Supabase admin probe
          </h4>
          <pre
            className={`text-xs overflow-x-auto p-3 rounded-lg ${
              isDark ? 'bg-black/30 text-slate-300' : 'bg-gray-100 text-gray-800'
            }`}
          >
            {JSON.stringify(supabaseStatus, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

function coerceBool(v: unknown, defaultVal: boolean): boolean {
  if (v === undefined || v === null) return defaultVal
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v !== 0
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase()
    if (s === 'true' || s === '1' || s === 'yes') return true
    if (s === 'false' || s === '0' || s === 'no' || s === '') return false
  }
  return defaultVal
}

const BOOL_DEFAULT_OFF = new Set(['maintenance_mode', 'force_update_required'])

function readToggle(cfg: Record<string, unknown>, key: string): boolean {
  const d = BOOL_DEFAULT_OFF.has(key) ? false : true
  return coerceBool(cfg[key], d)
}

/** Flags contradictory or wasteful combinations so ops can fix mental model before users feel drift. */
function computeConfigCoherenceWarnings(cfg: Record<string, unknown>): string[] {
  const w: string[] = []
  const redeem = readToggle(cfg, 'offer_redemptions_enabled')
  const gemsR = readToggle(cfg, 'gems_rewards_enabled')
  const payD = readToggle(cfg, 'premium_purchases_enabled')
  const payP = readToggle(cfg, 'partner_payments_enabled')
  if (redeem && !gemsR) {
    w.push('Driver redemptions are ON but gem rewards on redeem are OFF — users may redeem without gem credit.')
  }
  if (redeem && !payD && !payP) {
    w.push('Redemptions ON while both payment rails are OFF — fine for promos; confusing if you still sell paid offers.')
  }
  const incSub = readToggle(cfg, 'incident_submissions_enabled')
  const incVote = readToggle(cfg, 'incident_voting_enabled')
  if (!incSub && incVote) {
    w.push('Incident submissions OFF but voting ON — queue can go stale with nothing new to vote on.')
  }
  const maint = readToggle(cfg, 'maintenance_mode')
  if (maint && payD && payP && redeem) {
    w.push('Maintenance ON while commerce is largely open — confirm client messaging matches this split.')
  }
  const ai = readToggle(cfg, 'ai_photo_moderation_enabled')
  if (!incSub && ai) {
    w.push('Incidents OFF but AI photo moderation ON — extra cost with no new incident photos.')
  }
  return w
}

function formatValueForPreview(key: string, v: unknown): string {
  const mini: Record<string, unknown> = { [key]: v }
  const looksToggle =
    key.endsWith('_enabled') ||
    key === 'maintenance_mode' ||
    key === 'force_update_required' ||
    key === 'orion_enabled' ||
    key === 'friend_tracking_enabled' ||
    key === 'ohgo_cameras_enabled'
  if (looksToggle) return readToggle(mini, key) ? 'ON' : 'OFF'
  if (v === undefined || v === null) return '—'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

function needsToggleConfirm(key: string, next: boolean): boolean {
  if (key === 'maintenance_mode' && next === true) return true
  if (key === 'force_update_required' && next === true) return true
  if (key.endsWith('_enabled') && next === false) return true
  if (key === 'gems_rewards_enabled' && next === false) return true
  return false
}

const TOGGLE_IMPACT: Record<string, string> = {
  maintenance_mode: 'Drivers see a maintenance state; core flows may be blocked client-side.',
  force_update_required: 'Clients can be forced to refresh before using the app.',
  driver_signups_enabled: 'Stops new driver account creation at the API.',
  partner_signups_enabled: 'Stops new partner registrations.',
  premium_purchases_enabled: 'Blocks Stripe checkout for driver premium upgrades.',
  partner_payments_enabled: 'Blocks partner Stripe checkouts (subscribe, boosts, credits).',
  offer_redemptions_enabled: 'Blocks driver offer redemptions and gem payouts on redeem.',
  partner_qr_redemption_enabled: 'Blocks partner portal QR redemption flow.',
  incident_submissions_enabled: 'Blocks new road incident reports.',
  incident_voting_enabled: 'Blocks upvotes, downvotes, and confirm/deny on incidents.',
  partner_referrals_enabled: 'Blocks creating new partner referral links.',
  push_notifications_enabled: 'Exposed to apps via /api/config; clients should respect when implemented.',
  live_location_publishing_enabled: 'Blocks live location writes to Supabase from drivers.',
  telemetry_collection_enabled: 'Stops server-side HTTP telemetry buffer (ops visibility drops).',
  ai_photo_moderation_enabled: 'Blocks /api/photo/analyze (AI moderation pipeline).',
  gems_rewards_enabled: 'Blocks gem credit on offer redemption paths.',
  orion_enabled: 'Disables Orion coach features clients read from public config.',
  friend_tracking_enabled: 'Disables friend location features in the driver app.',
  ohgo_cameras_enabled: 'Hides OHGO camera layer for clients reading public config.',
}

const OPS_PRESETS: { id: string; label: string; description: string; patch: Record<string, unknown>; panic?: boolean }[] = [
  {
    id: 'panic_stabilize',
    label: 'Stabilize (panic)',
    description:
      'Aggressive lockdown for abuse or firefight: stop incidents, commerce, live location writes, pushes, and API telemetry. Restore gradually with Normal or targeted presets.',
    panic: true,
    patch: {
      incident_submissions_enabled: false,
      incident_voting_enabled: false,
      offer_redemptions_enabled: false,
      partner_qr_redemption_enabled: false,
      gems_rewards_enabled: false,
      premium_purchases_enabled: false,
      partner_payments_enabled: false,
      live_location_publishing_enabled: false,
      push_notifications_enabled: false,
      telemetry_collection_enabled: false,
    },
  },
  {
    id: 'normal',
    label: 'Normal operations',
    description: 'All gates open; no maintenance. Use after incidents are resolved.',
    patch: {
      maintenance_mode: false,
      force_update_required: false,
      driver_signups_enabled: true,
      partner_signups_enabled: true,
      premium_purchases_enabled: true,
      partner_payments_enabled: true,
      offer_redemptions_enabled: true,
      partner_qr_redemption_enabled: true,
      incident_submissions_enabled: true,
      incident_voting_enabled: true,
      partner_referrals_enabled: true,
      push_notifications_enabled: true,
      live_location_publishing_enabled: true,
      telemetry_collection_enabled: true,
      ai_photo_moderation_enabled: true,
      gems_rewards_enabled: true,
    },
  },
  {
    id: 'soft_maint',
    label: 'Soft maintenance',
    description: 'Show maintenance in apps; keep signups/payments unless you toggle them separately.',
    patch: { maintenance_mode: true },
  },
  {
    id: 'abuse_map',
    label: 'Map / incident abuse lockdown',
    description: 'Stop new reports and voting; keep app running.',
    patch: {
      incident_submissions_enabled: false,
      incident_voting_enabled: false,
    },
  },
  {
    id: 'payments_off',
    label: 'Payments frozen',
    description: 'Disable driver premium checkout and all partner Stripe sessions.',
    patch: {
      premium_purchases_enabled: false,
      partner_payments_enabled: false,
    },
  },
  {
    id: 'commerce_pause',
    label: 'Commerce pause',
    description: 'Freeze redemptions (driver + partner QR) and gem rewards on redeem.',
    patch: {
      offer_redemptions_enabled: false,
      partner_qr_redemption_enabled: false,
      gems_rewards_enabled: false,
    },
  },
]

type CtrlToggle = { kind: 'toggle'; key: string; label: string; description: string; stress?: boolean }
type CtrlNumber = { kind: 'number'; key: string; label: string; description: string; min: number; max: number; step: number }
type CtrlText = { kind: 'text'; key: string; label: string; description: string; placeholder?: string }
type CtrlRow = CtrlToggle | CtrlNumber | CtrlText

const SECTION_RUNTIME: CtrlRow[] = [
  { kind: 'toggle', key: 'orion_enabled', label: 'Orion coach', description: 'AI routing / coach (public config).' },
  { kind: 'toggle', key: 'friend_tracking_enabled', label: 'Friend tracking', description: 'Friend location features in driver app.' },
  { kind: 'toggle', key: 'ohgo_cameras_enabled', label: 'OHGO cameras', description: 'Traffic camera layer on map.' },
  { kind: 'number', key: 'gems_multiplier', label: 'Gems multiplier', description: 'Global earnings multiplier (also set to 0 to pause accrual surfaces).', min: 0, max: 10, step: 0.5 },
  { kind: 'number', key: 'max_offer_distance_miles', label: 'Max offer distance (mi)', description: 'Nearby offers radius.', min: 0.5, max: 25, step: 0.5 },
  { kind: 'text', key: 'announcement_banner', label: 'Announcement banner', description: 'Shown to clients via public config.', placeholder: 'Empty = hidden' },
]

const SECTION_SAFETY: CtrlRow[] = [
  { kind: 'toggle', key: 'driver_signups_enabled', label: 'Driver signups', description: 'Allow new driver registration.', stress: true },
  { kind: 'toggle', key: 'partner_signups_enabled', label: 'Partner signups', description: 'Allow new partner registration.', stress: true },
  { kind: 'toggle', key: 'premium_purchases_enabled', label: 'Premium purchases (drivers)', description: 'Stripe checkout for subscriptions.', stress: true },
  { kind: 'toggle', key: 'partner_payments_enabled', label: 'Partner payments', description: 'Partner Stripe (subscribe, boosts, credits).', stress: true },
  { kind: 'toggle', key: 'offer_redemptions_enabled', label: 'Driver offer redemptions', description: 'Redeem offers in driver app.', stress: true },
  { kind: 'toggle', key: 'partner_qr_redemption_enabled', label: 'Partner QR redemption', description: 'Partner portal scan / redeem flow.', stress: true },
  { kind: 'toggle', key: 'incident_submissions_enabled', label: 'Incident submissions', description: 'New road reports.', stress: true },
  { kind: 'toggle', key: 'incident_voting_enabled', label: 'Incident voting', description: 'Upvotes, downvotes, confirm/deny.', stress: true },
  { kind: 'toggle', key: 'partner_referrals_enabled', label: 'Partner referrals', description: 'Creating referral links.', stress: true },
  { kind: 'toggle', key: 'push_notifications_enabled', label: 'Push notifications (flag)', description: 'Shipped to clients via /api/config; enforce in apps as you wire it.', stress: true },
  { kind: 'toggle', key: 'live_location_publishing_enabled', label: 'Live location publishing', description: 'Writes to live_locations from drivers.', stress: true },
  { kind: 'toggle', key: 'telemetry_collection_enabled', label: 'API telemetry buffer', description: 'In-memory request telemetry for this admin console.', stress: true },
  { kind: 'toggle', key: 'ai_photo_moderation_enabled', label: 'AI photo moderation', description: 'POST /api/photo/analyze', stress: true },
  { kind: 'toggle', key: 'gems_rewards_enabled', label: 'Gem rewards on redeem', description: 'Credit gems when redeeming offers.', stress: true },
]

const SECTION_EMERGENCY: CtrlRow[] = [
  { kind: 'toggle', key: 'maintenance_mode', label: 'Maintenance mode', description: 'Clients show maintenance (reads public config).', stress: true },
  { kind: 'toggle', key: 'force_update_required', label: 'Force app update', description: 'Hard nudge for clients to refresh.', stress: true },
]

function formatConfigMetaLine(
  meta: Record<string, { updated_at?: string | null; updated_by?: string | null }>,
  key: string,
): string | null {
  const m = meta[key]
  if (!m?.updated_at) return null
  const when = new Date(String(m.updated_at)).toLocaleString()
  const who = m.updated_by ? ` · ${String(m.updated_by).slice(0, 8)}…` : ''
  return `Last change: ${when}${who}`
}

function ControlsTab({
  config,
  meta,
  onUpdate,
  isDark,
  onGotoOpsTab,
  onGotoPortal,
}: {
  config: Record<string, unknown> | null
  meta: Record<string, { updated_at?: string | null; updated_by?: string | null }>
  onUpdate: () => void
  isDark: boolean
  onGotoOpsTab?: (tab: string) => void
  onGotoPortal?: (tabId: string) => void
}) {
  const cfg = config ?? {}
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [draftNum, setDraftNum] = useState<Record<string, string>>({})
  const [draftText, setDraftText] = useState<Record<string, string>>({})
  const lastApplyMs = useRef(0)

  const coherenceWarnings = useMemo(() => computeConfigCoherenceWarnings(cfg), [cfg])

  useEffect(() => {
    const n: Record<string, string> = {}
    const t: Record<string, string> = {}
    for (const row of [...SECTION_RUNTIME, ...SECTION_SAFETY, ...SECTION_EMERGENCY]) {
      if (row.kind === 'number') n[row.key] = String(cfg[row.key] ?? row.min)
      if (row.kind === 'text') t[row.key] = String(cfg[row.key] ?? '')
    }
    setDraftNum(n)
    setDraftText(t)
  }, [config])

  const [modal, setModal] = useState<{
    title: string
    detail: string
    patch: Record<string, unknown>
    confirmWord: boolean
    previewLines?: string[]
  } | null>(null)
  const [reason, setReason] = useState('')
  const [understand, setUnderstand] = useState(false)

  const COOLDOWN_MS = 2800

  const persist = async (patch: Record<string, unknown>, auditReason?: string) => {
    const now = Date.now()
    if (now - lastApplyMs.current < COOLDOWN_MS) {
      setErr(`Wait ${Math.ceil((COOLDOWN_MS - (now - lastApplyMs.current)) / 1000)}s between config writes (anti-misfire).`)
      return
    }
    setBusy(true)
    setErr(null)
    try {
      const res = await adminApi.updateConfig(patch, { reason: auditReason })
      if (!res.success) {
        setErr((res as { message?: string }).message || (res as { error?: string }).error || 'Update failed')
        return
      }
      lastApplyMs.current = Date.now()
      onUpdate()
    } catch {
      setErr('Network error')
    } finally {
      setBusy(false)
    }
  }

  const openConfirm = (title: string, detail: string, patch: Record<string, unknown>) => {
    setReason('')
    setUnderstand(false)
    const previewLines = Object.entries(patch).map(
      ([k, to]) => `${k}: ${formatValueForPreview(k, cfg[k])} → ${formatValueForPreview(k, to)}`,
    )
    setModal({ title, detail, patch, confirmWord: true, previewLines })
  }

  const applyModal = async () => {
    if (!modal) return
    if (modal.confirmWord && !understand) return
    const patch = { ...modal.patch }
    const auditReason = reason.trim() || undefined
    await persist(patch, auditReason)
    setModal(null)
  }

  const onToggleClick = (key: string) => {
    const prev = readToggle(cfg, key)
    const next = !prev
    const patch = { [key]: next }
    if (needsToggleConfirm(key, next)) {
      openConfirm(
        `Confirm: ${key}`,
        TOGGLE_IMPACT[key] || 'This changes live production behavior.',
        patch,
      )
    } else {
      void persist(patch)
    }
  }

  const applyPreset = (p: (typeof OPS_PRESETS)[0]) => {
    openConfirm(`Apply preset: ${p.label}`, `${p.description}\n\nKeys updated: ${Object.keys(p.patch).join(', ')}`, p.patch)
  }

  const rowShell = (stress: boolean | undefined) =>
    `flex flex-col gap-2 rounded-xl border p-4 ${
      stress && isDark
        ? 'border-amber-500/20 bg-amber-500/[0.04]'
        : stress
          ? 'border-amber-200 bg-amber-50/80'
          : isDark
            ? 'border-white/[0.08] bg-white/[0.03]'
            : 'border-gray-200 bg-white'
    }`

  const renderRow = (row: CtrlRow) => {
    const metaLine = formatConfigMetaLine(meta, row.key)
    if (row.kind === 'toggle') {
      const on = readToggle(cfg, row.key)
      return (
        <div key={row.key} className={rowShell(row.stress)}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{row.label}</div>
              <div className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-600'}`}>{row.description}</div>
              {TOGGLE_IMPACT[row.key] && (
                <div
                  className={`text-[10px] mt-1.5 leading-snug border-l-2 pl-2 ${
                    isDark ? 'border-amber-500/40 text-slate-400' : 'border-amber-300 text-gray-600'
                  }`}
                >
                  <span className="font-semibold opacity-90">Impact: </span>
                  {TOGGLE_IMPACT[row.key]}
                </div>
              )}
              {metaLine && (
                <div className={`text-[10px] mt-1 font-mono ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>{metaLine}</div>
              )}
            </div>
            <button
              type="button"
              role="switch"
              disabled={busy}
              aria-checked={on}
              onClick={() => onToggleClick(row.key)}
              className={`relative w-12 h-7 rounded-full shrink-0 transition-colors disabled:opacity-50 ${
                on
                  ? row.stress && (row.key === 'maintenance_mode' || row.key === 'force_update_required')
                    ? 'bg-red-500'
                    : 'bg-emerald-500'
                  : isDark
                    ? 'bg-slate-600'
                    : 'bg-gray-300'
              }`}
            >
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
        </div>
      )
    }
    if (row.kind === 'number') {
      return (
        <div key={row.key} className={rowShell(false)}>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <div className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{row.label}</div>
              <div className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-600'}`}>{row.description}</div>
              {metaLine && (
                <div className={`text-[10px] mt-1 font-mono ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>{metaLine}</div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={draftNum[row.key] ?? ''}
                min={row.min}
                max={row.max}
                step={row.step}
                onChange={(e) => setDraftNum((d) => ({ ...d, [row.key]: e.target.value }))}
                className={`w-28 px-2 py-1.5 rounded-lg border text-sm font-medium text-center ${
                  isDark ? 'bg-slate-800 border-white/20 text-white' : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  const v = parseFloat(draftNum[row.key] || '0')
                  if (Number.isNaN(v)) return
                  const clamped = Math.min(row.max, Math.max(row.min, v))
                  if (row.key === 'gems_multiplier' && clamped === 0) {
                    openConfirm(
                      'Gems multiplier = 0',
                      'Sets the global multiplier to zero (strong economic impact). Confirm to proceed.',
                      { [row.key]: clamped },
                    )
                  } else if (row.key === 'gems_multiplier' && clamped > 5) {
                    openConfirm(
                      'High gems multiplier',
                      `${clamped}× is aggressive for production. Confirm this is intentional.`,
                      { [row.key]: clamped },
                    )
                  } else {
                    void persist({ [row.key]: clamped })
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold disabled:opacity-50"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )
    }
    return (
      <div key={row.key} className={rowShell(false)}>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <div className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{row.label}</div>
            <div className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-600'}`}>{row.description}</div>
            {metaLine && (
              <div className={`text-[10px] mt-1 font-mono ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>{metaLine}</div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center w-full sm:w-auto">
            <input
              type="text"
              value={draftText[row.key] ?? ''}
              placeholder={row.placeholder}
              onChange={(e) => setDraftText((d) => ({ ...d, [row.key]: e.target.value }))}
              className={`flex-1 min-w-[200px] px-3 py-2 rounded-lg border text-sm ${
                isDark
                  ? 'bg-slate-800 border-white/20 text-white placeholder:text-slate-500'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void persist({ [row.key]: draftText[row.key] ?? '' })}
              className="px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold disabled:opacity-50 shrink-0"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    )
  }

  const section = (title: string, subtitle: string, icon: typeof Sliders, rows: CtrlRow[]) => {
    const Icon = icon
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <Icon size={18} className={isDark ? 'text-blue-400 mt-0.5' : 'text-blue-600 mt-0.5'} />
          <div>
            <h4 className={`text-sm font-bold uppercase tracking-wide ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</h4>
            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-600'}`}>{subtitle}</p>
          </div>
        </div>
        <div className="space-y-2">{rows.map(renderRow)}</div>
      </div>
    )
  }

  const jumpBtn =
    `text-xs font-semibold underline-offset-2 hover:underline ${isDark ? 'text-sky-400 hover:text-sky-300' : 'text-blue-700 hover:text-blue-900'}`

  return (
    <div className="space-y-8 relative">
      {err && (
        <div className={`text-sm rounded-lg px-3 py-2 border ${isDark ? 'bg-red-500/10 border-red-500/30 text-red-200' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {err}
        </div>
      )}

      <div className={`rounded-xl border p-4 ${isDark ? 'border-sky-500/20 bg-sky-500/[0.06]' : 'border-sky-200 bg-sky-50/70'}`}>
        <h4 className={`text-sm font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Incident response playbook</h4>
        <p className={`text-xs mb-3 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
          Linear flow — each step links somewhere useful. You still choose what to toggle; this reduces tab-hopping under stress.
        </p>
        <ol className={`text-xs space-y-1.5 list-decimal list-inside ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
          <li>
            Detect:{' '}
            <button type="button" className={jumpBtn} onClick={() => onGotoOpsTab?.('concerns')}>
              Concerns
            </button>
            ,{' '}
            <button type="button" className={jumpBtn} onClick={() => onGotoOpsTab?.('live_ops')}>
              Live ops
            </button>
            , or health alerts.
          </li>
          <li>
            Diagnose:{' '}
            <button type="button" className={jumpBtn} onClick={() => onGotoOpsTab?.('health')}>
              Health
            </button>
            {' · '}
            <button type="button" className={jumpBtn} onClick={() => onGotoOpsTab?.('map')}>
              Live map
            </button>{' '}
            (clusters of reports vs drivers).
          </li>
          <li>Act: presets or toggles below — confirm impact text and runbook reason (stored in audit JSON).</li>
          <li>
            Verify: refresh health / map;{' '}
            <button type="button" className={jumpBtn} onClick={() => onGotoPortal?.('audit')}>
              full audit log
            </button>
            {' '}for <code className="text-[10px]">APP_CONFIG_UPDATED</code>.
          </li>
        </ol>
      </div>

      {coherenceWarnings.length > 0 && (
        <div className={`rounded-xl border p-4 ${isDark ? 'border-amber-500/25 bg-amber-500/[0.07]' : 'border-amber-200 bg-amber-50/90'}`}>
          <div className={`text-sm font-bold mb-2 ${isDark ? 'text-amber-200' : 'text-amber-900'}`}>Config coherence</div>
          <p className={`text-xs mb-2 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
            These combinations are allowed but easy to misread — adjust toggles if the description matches a mistake.
          </p>
          <ul className={`text-xs space-y-1 list-disc list-inside ${isDark ? 'text-amber-100/90' : 'text-amber-950'}`}>
            {coherenceWarnings.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      <div className={`rounded-xl border p-4 ${isDark ? 'border-violet-500/20 bg-violet-500/[0.06]' : 'border-violet-200 bg-violet-50/60'}`}>
        <div className="flex items-center gap-2 mb-2">
          <Zap size={18} className={isDark ? 'text-violet-300' : 'text-violet-700'} />
          <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Operational presets</h3>
        </div>
        <p className={`text-xs mb-3 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
          Applies multiple config keys at once. Every preset opens a confirmation dialog.
        </p>
        <div className="flex flex-wrap gap-2">
          {OPS_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={busy}
              onClick={() => applyPreset(p)}
              className={`text-xs font-semibold px-3 py-2 rounded-lg border disabled:opacity-50 ${
                p.panic
                  ? isDark
                    ? 'bg-red-500/15 border-red-500/35 text-red-100 hover:bg-red-500/25'
                    : 'bg-red-50 border-red-200 text-red-900 hover:bg-red-100'
                  : isDark
                    ? 'bg-white/10 border-white/15 text-white hover:bg-white/15'
                    : 'bg-white border-violet-200 text-gray-900'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {section(
        'Normal runtime',
        'Product toggles and messaging — safer day-to-day adjustments.',
        Sliders,
        SECTION_RUNTIME,
      )}
      {section(
        'Safety & abuse',
        'Incident response: signups, money, map, referrals, telemetry, AI moderation.',
        ShieldAlert,
        SECTION_SAFETY,
      )}
      {section(
        'Emergency',
        'Break-glass switches. Expect user-visible impact immediately.',
        AlertTriangle,
        SECTION_EMERGENCY,
      )}

      {modal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60" role="dialog" aria-modal="true">
          <div
            className={`w-full max-w-lg rounded-2xl border shadow-xl p-5 ${isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
          >
            <div className="flex justify-between items-start gap-2">
              <h3 className="text-lg font-bold pr-6">{modal.title}</h3>
              <button type="button" className="p-1 rounded-lg hover:bg-white/10" onClick={() => setModal(null)} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <p className={`text-sm mt-2 whitespace-pre-wrap ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{modal.detail}</p>
            {modal.previewLines && modal.previewLines.length > 0 && (
              <div className={`mt-3 rounded-lg border p-3 ${isDark ? 'border-white/10 bg-black/20' : 'border-gray-200 bg-gray-50'}`}>
                <div className={`text-[10px] font-bold uppercase tracking-wide mb-1.5 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                  Value transition (before → after)
                </div>
                <ul className={`text-xs font-mono space-y-0.5 ${isDark ? 'text-slate-300' : 'text-gray-800'}`}>
                  {modal.previewLines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className={`text-[10px] mt-2 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
              Audit entries store keys, previous/new values, and optional reason as JSON — use the Audit tab to trace multi-admin changes.
            </p>
            <label className={`block text-xs font-semibold mt-4 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
              Reason (optional, appended to audit JSON)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className={`mt-1 w-full rounded-lg border text-sm px-3 py-2 ${
                isDark ? 'bg-white/5 border-white/15 text-white' : 'bg-gray-50 border-gray-200'
              }`}
            />
            {modal.confirmWord && (
              <label className={`flex items-start gap-2 mt-3 text-sm cursor-pointer ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                <input type="checkbox" checked={understand} onChange={(e) => setUnderstand(e.target.checked)} className="mt-1" />
                <span>I understand this affects live users and partners.</span>
              </label>
            )}
            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setModal(null)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold ${isDark ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-900'}`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || (modal.confirmWord && !understand)}
                onClick={() => void applyModal()}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-500 text-white disabled:opacity-40"
              >
                {busy ? 'Applying…' : 'Apply change'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PresenceTab({
  users,
  isDark,
  onOpenDirectory,
}: {
  users: Record<string, unknown>[]
  isDark: boolean
  onOpenDirectory?: () => void
}) {
  const card = isDark ? 'bg-slate-800/40 border-white/[0.08]' : 'bg-white border-gray-200 shadow-sm'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={isDark ? 'text-slate-400 text-sm' : 'text-gray-600 text-sm'}>
          Real-time presence from live location pipeline. For full accounts and moderation, open the directory.
        </p>
        {onOpenDirectory && (
          <button
            type="button"
            onClick={onOpenDirectory}
            className="text-sm font-semibold text-blue-400 hover:text-blue-300"
          >
            Open users &amp; families →
          </button>
        )}
      </div>
      <div className={`rounded-xl border overflow-hidden ${card}`}>
        <table className="w-full text-sm">
          <thead>
            <tr className={isDark ? 'bg-white/[0.06] text-slate-400' : 'bg-gray-50 text-gray-600'}>
              {['Name', 'Status', 'Speed'].map((h) => (
                <th key={h} className="text-left px-4 py-2 font-semibold text-xs uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={String(u.id)} className={isDark ? 'border-t border-white/[0.06]' : 'border-t border-gray-100'}>
                <td className={`px-4 py-2 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {String(u.name ?? 'Unknown')}
                </td>
                <td className="px-4 py-2">
                  <span className={u.is_navigating ? 'text-blue-400' : 'text-emerald-500'}>
                    {u.is_navigating ? 'Navigating' : 'Online'}
                  </span>
                </td>
                <td className={`px-4 py-2 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                  {u.is_navigating ? `${Math.round(Number(u.speed_mph) || 0)} mph` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className={`px-4 py-8 text-center text-sm ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
            No live sessions right now.
          </div>
        )}
      </div>
    </div>
  )
}

function AppFlowsTab({
  data,
  isDark,
  onRefresh,
}: {
  data: AppUsagePayload | null
  isDark: boolean
  onRefresh: () => void
}) {
  const card = isDark ? 'bg-slate-800/40 border-white/[0.08]' : 'bg-white border-gray-200 shadow-sm'
  const max =
    data?.top_prefixes?.reduce((m, x) => Math.max(m, x.count), 0) ||
    data?.top_paths?.reduce((m, x) => Math.max(m, x.count), 0) ||
    1

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>App &amp; feature traffic</h3>
          <p className={`text-sm mt-1 max-w-3xl ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
            Built from recent API requests recorded on the backend (same buffer as Live traffic). High counts on
            <code className="mx-1 text-xs opacity-80">/api/trips</code>,
            <code className="mx-1 text-xs opacity-80">/api/family</code>, etc. mean those product areas are active—it
            does <strong>not</strong> show which screen a user tapped, and it is <strong>not</strong> tied to identity
            unless you correlate timestamps manually. For named users, use <strong>Presence</strong> and{' '}
            <strong>Users &amp; families</strong>.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-500"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {!data && (
        <div className={`rounded-xl border p-6 text-sm ${card} ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
          No telemetry summary yet. Use the app and partner portals, then open this tab again (buffer holds the last
          ~500 requests per API instance).
        </div>
      )}

      {data && (
        <>
          <div className={`flex flex-wrap gap-4 text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
            <span>Events in buffer: {data.events_in_buffer}</span>
            <span>API calls counted: {data.api_events_counted}</span>
          </div>

          <div className={`rounded-xl border p-4 ${card}`}>
            <h4 className={`text-sm font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              By API area (prefix)
            </h4>
            <div className="space-y-2">
              {(data.top_prefixes || []).map((row) => (
                <div key={row.prefix} className="flex items-center gap-3">
                  <div
                    className={`text-xs font-mono truncate flex-1 min-w-0 ${isDark ? 'text-slate-300' : 'text-gray-800'}`}
                    title={row.prefix}
                  >
                    {row.prefix}
                  </div>
                  <div className="w-28 text-right text-xs tabular-nums text-slate-400">{row.count}</div>
                  <div className="hidden sm:block w-40 h-2 rounded-full bg-black/20 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-cyan-500/80"
                      style={{ width: `${Math.max(6, (row.count / max) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`rounded-xl border p-4 ${card}`}>
            <h4 className={`text-sm font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Top exact paths</h4>
            <div className="max-h-64 overflow-y-auto space-y-1 text-xs font-mono">
              {(data.top_paths || []).map((row) => (
                <div
                  key={row.path}
                  className={`flex justify-between gap-2 py-1 border-b border-white/5 ${isDark ? 'text-slate-400' : 'text-gray-600 border-gray-100'}`}
                >
                  <span className="truncate" title={row.path}>
                    {row.path}
                  </span>
                  <span className="shrink-0 tabular-nums">{row.count}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function AdminLiveMapTab({
  users,
  reports,
  partnerLocations,
  isDark,
  onRefreshMap,
}: {
  users: Record<string, unknown>[]
  reports: Record<string, unknown>[]
  partnerLocations: Record<string, unknown>[]
  isDark: boolean
  onRefreshMap?: () => void
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])

  const token = (import.meta.env.VITE_MAPBOX_TOKEN as string | undefined)?.trim()

  useEffect(() => {
    if (!token || !containerRef.current) return

    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    mapboxgl.accessToken = token

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: isDark ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12',
      center: [-82.9988, 39.9612],
      zoom: 9,
    })
    map.addControl(new mapboxgl.NavigationControl(), 'top-right')

    const allPoints: [number, number][] = []

    const valid: { lng: number; lat: number; u: Record<string, unknown> }[] = []
    for (const u of users) {
      const lat = Number(u.lat)
      const lng = Number(u.lng)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
      valid.push({ lat, lng, u })
    }

    for (const { lat, lng, u } of valid) {
      allPoints.push([lng, lat])
      const el = document.createElement('div')
      el.style.width = '14px'
      el.style.height = '14px'
      el.style.borderRadius = '50%'
      el.style.background = u.is_navigating ? '#3b82f6' : '#22c55e'
      el.style.border = '2px solid #fff'
      el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.35)'
      const name = String(u.name ?? 'Driver').replace(/</g, '&lt;').replace(/&/g, '&amp;')
      const nav = u.is_navigating ? `Navigating · ${Math.round(Number(u.speed_mph) || 0)} mph` : 'Online'
      const popup = new mapboxgl.Popup({ offset: 14 }).setHTML(
        `<div style="font-family:system-ui,sans-serif;font-size:13px"><strong>${name}</strong><br/><span style="opacity:.8">${nav}</span></div>`,
      )
      const marker = new mapboxgl.Marker({ element: el }).setLngLat([lng, lat]).setPopup(popup).addTo(map)
      markersRef.current.push(marker)
    }

    for (const r of reports) {
      const lat = Number(r.lat)
      const lng = Number(r.lng)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
      allPoints.push([lng, lat])
      const el = document.createElement('div')
      el.style.width = '0'
      el.style.height = '0'
      el.style.borderLeft = '7px solid transparent'
      el.style.borderRight = '7px solid transparent'
      el.style.borderBottom = '12px solid #f97316'
      el.style.filter = 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))'
      const typ = String(r.type ?? 'report').replace(/</g, '&lt;').replace(/&/g, '&amp;')
      const votes = String(r.upvotes ?? '0')
      const desc = String(r.description ?? '').slice(0, 120).replace(/</g, '&lt;').replace(/&/g, '&amp;')
      const popup = new mapboxgl.Popup({ offset: 12 }).setHTML(
        `<div style="font-family:system-ui,sans-serif;font-size:13px"><strong>Road report</strong> · ${typ}<br/><span style="opacity:.85">Votes ${votes}</span>${desc ? `<br/><span style="opacity:.75;font-size:12px">${desc}</span>` : ''}</div>`,
      )
      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' }).setLngLat([lng, lat]).setPopup(popup).addTo(map)
      markersRef.current.push(marker)
    }

    for (const pl of partnerLocations) {
      const lat = Number(pl.lat)
      const lng = Number(pl.lng)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
      allPoints.push([lng, lat])
      const el = document.createElement('div')
      el.style.width = '12px'
      el.style.height = '12px'
      el.style.borderRadius = '3px'
      el.style.background = '#a855f7'
      el.style.border = '2px solid #fff'
      el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.35)'
      const locName = String(pl.name ?? 'Location').replace(/</g, '&lt;').replace(/&/g, '&amp;')
      const biz = String(pl.partner_business_name ?? '').replace(/</g, '&lt;').replace(/&/g, '&amp;')
      const addr = String(pl.address ?? '').slice(0, 100).replace(/</g, '&lt;').replace(/&/g, '&amp;')
      const popup = new mapboxgl.Popup({ offset: 12 }).setHTML(
        `<div style="font-family:system-ui,sans-serif;font-size:13px"><strong>Partner</strong>${biz ? ` · ${biz}` : ''}<br/><span style="opacity:.9">${locName}</span>${addr ? `<br/><span style="opacity:.75;font-size:12px">${addr}</span>` : ''}</div>`,
      )
      const marker = new mapboxgl.Marker({ element: el }).setLngLat([lng, lat]).setPopup(popup).addTo(map)
      markersRef.current.push(marker)
    }

    if (allPoints.length >= 2) {
      const bounds = new mapboxgl.LngLatBounds()
      allPoints.forEach(([lng, lat]) => bounds.extend([lng, lat]))
      map.fitBounds(bounds, { padding: 80, maxZoom: 14, duration: 0 })
    } else if (allPoints.length === 1) {
      map.flyTo({ center: allPoints[0], zoom: 12, duration: 0 })
    }

    return () => {
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []
      map.remove()
    }
  }, [users, reports, partnerLocations, isDark, token])

  const card = isDark ? 'bg-slate-800/30 border-white/[0.08]' : 'bg-gray-100 border-gray-200'

  if (!token) {
    return (
      <div
        className={`rounded-xl border flex flex-col items-center justify-center min-h-[320px] gap-2 p-8 ${card}`}
      >
        <MapPin className={isDark ? 'text-slate-500' : 'text-gray-400'} size={40} />
        <p className={`text-sm text-center max-w-md ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
          Set <code className="text-xs">VITE_MAPBOX_TOKEN</code> in the admin frontend env to enable the live map.
        </p>
      </div>
    )
  }

  const nDrivers = users.filter((u) => Number.isFinite(Number(u.lat)) && Number.isFinite(Number(u.lng))).length
  const nReports = reports.filter((r) => Number.isFinite(Number(r.lat)) && Number.isFinite(Number(r.lng))).length
  const nPartners = partnerLocations.filter((p) => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng))).length

  return (
    <div className="space-y-3">
      <div
        className={`rounded-xl border p-3 text-xs leading-relaxed ${isDark ? 'border-cyan-500/20 bg-cyan-500/[0.06] text-slate-300' : 'border-cyan-200 bg-cyan-50/80 text-gray-700'}`}
      >
        <span className={`font-bold ${isDark ? 'text-cyan-200' : 'text-cyan-900'}`}>Ops lens — </span>
        Use this map to answer: where are drivers active right now? where are road reports clustering (possible abuse or real
        hazards)? where are partner storefronts dense? Dense orange without matching driver density may warrant{' '}
        <strong>incident controls</strong> on the Runtime tab; cross-check <strong>Concerns</strong> and{' '}
        <strong>Health</strong> before changing money rails.
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
          <span className="font-medium text-inherit">Drivers</span> — green online, blue navigating.{' '}
          <span className="font-medium">Orange</span> — <code className="text-xs opacity-90">road_reports</code>.{' '}
          <span className="font-medium text-violet-400">Purple squares</span> —{' '}
          <code className="text-xs opacity-90">partner_locations</code>.
        </p>
        {onRefreshMap && (
          <button
            type="button"
            onClick={onRefreshMap}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg ${
              isDark ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-gray-900 text-white hover:bg-gray-800'
            }`}
          >
            <RefreshCw size={14} />
            Sync data
          </button>
        )}
      </div>
      <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
        Showing {nDrivers} driver(s) · {nReports} road report(s) · {nPartners} partner location(s)
      </p>
      <div
        ref={containerRef}
        className={`w-full h-[min(70vh,560px)] rounded-xl overflow-hidden border ${card}`}
      />
      {nDrivers === 0 && nReports === 0 && nPartners === 0 && (
        <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
          No coordinates yet—default Columbus view. Open this tab after activity, or press Sync data.
        </p>
      )}
    </div>
  )
}
