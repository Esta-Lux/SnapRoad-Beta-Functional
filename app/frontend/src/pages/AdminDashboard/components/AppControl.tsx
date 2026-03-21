import { useState, useEffect } from 'react'
import { adminApi } from '@/services/adminApi'

type AppControlTab = 'overview' | 'concerns' | 'users' | 'map' | 'architecture' | 'health' | 'controls'

export default function AppControl() {
  const [activeTab, setActiveTab] = useState<AppControlTab>('overview')
  const [stats, setStats] = useState<any>(null)
  const [concerns, setConcerns] = useState<any[]>([])
  const [liveUsers, setLiveUsers] = useState<any[]>([])
  const [systemHealth, setSystemHealth] = useState<any>(null)
  const [appConfig, setAppConfig] = useState<any>(null)
  const [, setLoading] = useState(true)

  useEffect(() => {
    loadAll()
    const interval = setInterval(loadAll, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadAll = async () => {
    try {
      const [statsRes, concernsRes, usersRes, healthRes, configRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.getConcerns({ limit: 50 }),
        adminApi.getLiveUsers(),
        adminApi.getHealth(),
        adminApi.getConfig(),
      ])
      setStats((statsRes as any).data?.data ?? (statsRes as any).data ?? null)
      setConcerns((concernsRes as any).data?.concerns ?? (concernsRes as any).data ?? [])
      setLiveUsers((usersRes as any).data?.users ?? (usersRes as any).data ?? [])
      setSystemHealth((healthRes as any).data ?? null)
      setAppConfig((configRes as any).data ?? null)
    } catch (e) {
      console.error('Admin load failed:', e)
    } finally {
      setLoading(false)
    }
  }

  const TABS: { id: AppControlTab; label: string }[] = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'concerns', label: '🚨 Concerns' },
    { id: 'users', label: '👥 Users' },
    { id: 'map', label: '🗺️ Live Map' },
    { id: 'architecture', label: '🏗️ Architecture' },
    { id: 'health', label: '💚 Health' },
    { id: 'controls', label: '⚙️ Controls' },
  ]

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0F0F10',
      color: 'white',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.03)',
      }}>
        <div style={{
          fontSize: 18,
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <span style={{
            width: 32, height: 32,
            borderRadius: 8,
            background: '#007AFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
          }}>S</span>
          SnapRoad Admin
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: '#34C759',
          }}>
            <div style={{
              width: 6, height: 6,
              borderRadius: 3,
              background: '#34C759',
              animation: 'pulse 1.5s infinite',
            }} />
            {liveUsers.length} live now
          </div>
          <button
            onClick={loadAll}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              color: 'white',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      <div style={{
        display: 'flex',
        gap: 2,
        padding: '12px 24px 0',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        overflowX: 'auto',
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px 8px 0 0',
              border: 'none',
              background: activeTab === tab.id ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: activeTab === tab.id ? 'white' : 'rgba(255,255,255,0.4)',
              fontSize: 13,
              fontWeight: activeTab === tab.id ? 600 : 400,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              borderBottom: activeTab === tab.id ? '2px solid #007AFF' : '2px solid transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ padding: 24 }}>
        {activeTab === 'overview' && <OverviewTab stats={stats} liveUsers={liveUsers} />}
        {activeTab === 'concerns' && <ConcernsTab concerns={concerns} onRefresh={loadAll} />}
        {activeTab === 'users' && <UsersTab users={liveUsers} />}
        {activeTab === 'map' && <LiveMapTab users={liveUsers} />}
        {activeTab === 'architecture' && <ArchitectureTab />}
        {activeTab === 'health' && <HealthTab health={systemHealth} />}
        {activeTab === 'controls' && <ControlsTab config={appConfig} onUpdate={loadAll} />}
      </div>
    </div>
  )
}

function OverviewTab({ stats, liveUsers }: { stats: any; liveUsers: any[] }) {
  const metrics = [
    { label: 'Total Drivers', value: stats?.total_users ?? 0, icon: '👥', color: '#007AFF', change: stats?.user_growth ?? '+0%' },
    { label: 'Active Today', value: stats?.active_today ?? 0, icon: '🚗', color: '#34C759', change: '' },
    { label: 'Trips Today', value: stats?.trips_today ?? 0, icon: '🛣️', color: '#FF9500', change: '' },
    { label: 'Miles Driven', value: stats?.total_miles ?? 0, icon: '📍', color: '#7C3AED', change: '' },
    { label: 'Open Concerns', value: stats?.open_concerns ?? 0, icon: '🚨', color: '#FF3B30', change: '' },
    { label: 'Gems Awarded', value: stats?.total_gems ?? 0, icon: '💎', color: '#34C759', change: '' },
    { label: 'Offers Redeemed', value: stats?.offers_redeemed ?? stats?.total_redemptions ?? 0, icon: '🎁', color: '#FF9500', change: '' },
    { label: 'Revenue', value: `$${stats?.revenue ?? 0}`, icon: '💰', color: '#34C759', change: '' },
  ]
  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Platform Overview</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {metrics.map(m => (
          <div key={m.label} style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 14,
            padding: 16,
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>{m.icon}</span>
              {m.change && <span style={{ fontSize: 11, color: '#34C759', fontWeight: 600 }}>{m.change}</span>}
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: m.color }}>
              {typeof m.value === 'number' ? m.value.toLocaleString() : m.value}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{m.label}</div>
          </div>
        ))}
      </div>
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        borderRadius: 14,
        padding: 16,
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: 4, background: '#34C759' }} />
          Live Users Right Now ({liveUsers.length})
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {liveUsers.slice(0, 12).map((u: any) => (
            <div key={u.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 10px',
              background: 'rgba(255,255,255,0.04)',
              borderRadius: 10,
            }}>
              <div style={{
                width: 28, height: 28,
                borderRadius: 14,
                background: u.is_navigating ? '#007AFF' : '#34C759',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                flexShrink: 0,
              }}>
                {(u.name ?? 'U')[0]}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {u.name ?? 'Driver'}
                </div>
                <div style={{ fontSize: 10, color: u.is_navigating ? '#007AFF' : '#34C759' }}>
                  {u.is_navigating ? `🧭 ${Math.round(u.speed_mph ?? 0)} mph` : '● Online'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ConcernsTab({ concerns, onRefresh }: { concerns: any[]; onRefresh: () => void }) {
  const [selectedConcern, setSelectedConcern] = useState<any>(null)
  const [filter, setFilter] = useState('all')
  const filtered = concerns.filter(c => filter === 'all' ? true : c.severity === filter)

  const updateStatus = async (id: string, status: string) => {
    await adminApi.updateConcernStatus(id, status)
    onRefresh()
  }

  const SEVERITY_COLORS: Record<string, string> = {
    critical: '#FF3B30',
    high: '#FF9500',
    medium: '#007AFF',
    low: '#34C759',
  }
  const STATUS_COLORS: Record<string, string> = {
    open: '#FF3B30',
    in_progress: '#FF9500',
    resolved: '#34C759',
    closed: '#8E8E93',
  }

  return (
    <div style={{ display: 'flex', gap: 16 }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {['all', 'critical', 'high', 'medium', 'low'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: 'none',
                background: filter === f ? (SEVERITY_COLORS[f] ?? '#007AFF') : 'rgba(255,255,255,0.08)',
                color: 'white',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {f} {f !== 'all' ? `(${concerns.filter(c => c.severity === f).length})` : `(${concerns.length})`}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(concern => (
            <div
              key={concern.id}
              onClick={() => setSelectedConcern(concern)}
              style={{
                background: selectedConcern?.id === concern.id ? 'rgba(0,122,255,0.15)' : 'rgba(255,255,255,0.04)',
                borderRadius: 12,
                padding: '12px 14px',
                cursor: 'pointer',
                border: '1px solid',
                borderColor: selectedConcern?.id === concern.id ? '#007AFF' : 'rgba(255,255,255,0.08)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {concern.title || concern.category}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: 5,
                    background: `${SEVERITY_COLORS[concern.severity] ?? '#007AFF'}20`,
                    color: SEVERITY_COLORS[concern.severity] ?? '#007AFF',
                    textTransform: 'uppercase',
                  }}>{concern.severity}</span>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: 5,
                    background: `${STATUS_COLORS[concern.status] ?? '#8E8E93'}20`,
                    color: STATUS_COLORS[concern.status] ?? '#8E8E93',
                  }}>{concern.status?.replace('_', ' ')}</span>
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'flex', gap: 8 }}>
                <span>{concern.category}</span>
                <span>•</span>
                <span>{new Date(concern.created_at).toLocaleDateString()}</span>
                <span>•</span>
                <span>{concern.user_name ?? 'Anonymous'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      {selectedConcern && (
        <div style={{
          width: 360,
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 14,
          padding: 16,
          border: '1px solid rgba(255,255,255,0.08)',
          height: 'fit-content',
          position: 'sticky',
          top: 0,
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{selectedConcern.title || 'Concern Detail'}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 14 }}>
            {selectedConcern.category} • {new Date(selectedConcern.created_at).toLocaleString()}
          </div>
          <div style={{
            fontSize: 13,
            color: 'rgba(255,255,255,0.8)',
            lineHeight: 1.5,
            marginBottom: 14,
            padding: '10px 12px',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 10,
          }}>
            {selectedConcern.description}
          </div>
          {selectedConcern.context && (
            <div style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.3)',
              marginBottom: 14,
              padding: '8px 10px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 8,
            }}>
              <div style={{ marginBottom: 4, fontWeight: 600 }}>Device Context</div>
              {Object.entries(selectedConcern.context).slice(0, 6).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span>{k}:</span>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>{String(v).slice(0, 40)}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Update Status</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { status: 'in_progress', label: '🔄 In Progress', color: '#FF9500' },
              { status: 'resolved', label: '✅ Resolved', color: '#34C759' },
              { status: 'closed', label: '🔒 Close', color: '#8E8E93' },
              { status: 'open', label: '🔓 Reopen', color: '#FF3B30' },
            ].map(action => (
              <button
                key={action.status}
                onClick={() => updateStatus(selectedConcern.id, action.status)}
                style={{
                  padding: 8,
                  borderRadius: 10,
                  border: `1px solid ${action.color}40`,
                  background: `${action.color}15`,
                  color: action.color,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ArchitectureTab() {
  const components = [
    { layer: 'Frontend', color: '#007AFF', items: [
      { name: 'DriverApp', file: 'pages/DriverApp/index.tsx', lines: '3850+', status: 'active', deps: ['MapKitMap', 'GoogleMaps', 'Supabase'] },
      { name: 'MapKitMap', file: 'components/MapKitMap.tsx', lines: '1000+', status: 'active', deps: ['MapKit JS', 'Google Maps API'] },
      { name: 'OrionIntelligence', file: 'lib/orionIntelligence.ts', lines: '400+', status: 'active', deps: ['localStorage', 'Backend API'] },
      { name: 'FriendLocation', file: 'lib/friendLocation.ts', lines: '150+', status: 'active', deps: ['Supabase Realtime'] },
    ]},
    { layer: 'Backend API', color: '#34C759', items: [
      { name: 'Directions', file: 'routes/directions.py', lines: '200+', status: 'active', deps: ['Google Maps API'] },
      { name: 'Auth', file: 'routes/auth.py', lines: '150+', status: 'active', deps: ['Supabase Auth'] },
      { name: 'Offers', file: 'routes/offers.py', lines: '200+', status: 'active', deps: ['Supabase DB'] },
      { name: 'OHGO Integration', file: 'lib/ohgo.ts', lines: '100+', status: 'active', deps: ['OHGO API'] },
      { name: 'Orion Segments', file: 'routes/orion.py', lines: '300+', status: 'active', deps: ['Supabase DB', 'ML Engine'] },
    ]},
    { layer: 'Data Layer', color: '#FF9500', items: [
      { name: 'Users', file: 'supabase/users', lines: 'Table', status: 'active', deps: ['Supabase Auth'] },
      { name: 'Live Locations', file: 'supabase/live_locations', lines: 'Table + Realtime', status: 'active', deps: ['Supabase Realtime'] },
      { name: 'Route Segments', file: 'supabase/route_segments', lines: 'Table', status: 'active', deps: ['Orion Engine'] },
      { name: 'Concerns', file: 'supabase/concerns', lines: 'Table', status: 'active', deps: ['Admin Dashboard'] },
    ]},
    { layer: 'External APIs', color: '#7C3AED', items: [
      { name: 'Google Maps', file: 'Maps JS API', lines: 'Directions, Places', status: 'active', deps: ['$200/mo free credit'] },
      { name: 'OHGO', file: 'publicapi.ohgo.com', lines: 'Cameras, Incidents', status: 'active', deps: ['Ohio only'] },
      { name: 'Supabase', file: 'supabase.com', lines: 'DB + Auth + Realtime', status: 'active', deps: ['Free tier'] },
      { name: 'OpenAI', file: 'api.openai.com', lines: 'Orion coach + photo analysis', status: 'active', deps: ['gpt-4o', 'OPENAI_API_KEY'] },
    ]},
  ]
  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>App Architecture</div>
      {components.map(layer => (
        <div key={layer.layer} style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: 13,
            fontWeight: 700,
            color: layer.color,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            marginBottom: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: layer.color }} />
            {layer.layer}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {layer.items.map(item => (
              <div key={item.name} style={{
                background: 'rgba(255,255,255,0.04)',
                borderRadius: 12,
                padding: '12px 14px',
                border: `1px solid ${layer.color}30`,
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 4 }}>{item.name}</div>
                <div style={{ fontSize: 10, color: layer.color, marginBottom: 6, fontFamily: 'monospace' }}>{item.file}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>{item.lines}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {item.deps.map(dep => (
                    <span key={dep} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>{dep}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function HealthTab({ health }: { health: any }) {
  const checks = [
    { name: 'API Server', status: health?.api ?? 'unknown', latency: health?.api_latency ?? '--' },
    { name: 'Supabase DB', status: health?.database ?? 'unknown', latency: health?.db_latency ?? '--' },
    { name: 'Supabase Realtime', status: health?.realtime ?? 'unknown', latency: '--' },
    { name: 'Google Maps API', status: health?.google_maps ?? 'unknown', latency: health?.maps_latency ?? '--' },
    { name: 'OHGO API', status: health?.ohgo ?? 'unknown', latency: '--' },
    { name: 'OpenAI API', status: health?.openai ?? 'unknown', latency: health?.openai_latency ?? '--' },
  ]
  const statusColor = (s: string) =>
    s === 'healthy' ? '#34C759' : s === 'degraded' ? '#FF9500' : s === 'down' ? '#FF3B30' : '#8E8E93'
  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>System Health</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {checks.map(check => (
          <div key={check.name} style={{
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 14,
            padding: 16,
            border: `1px solid ${statusColor(check.status)}30`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{check.name}</div>
              <div style={{ width: 10, height: 10, borderRadius: 5, background: statusColor(check.status) }} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: statusColor(check.status), textTransform: 'capitalize' }}>{check.status}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
              Latency: {check.latency}{typeof check.latency === 'number' ? 'ms' : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ControlsTab({ config, onUpdate }: { config: any; onUpdate: () => void }) {
  const [saving, setSaving] = useState(false)
  const [localConfig, setLocalConfig] = useState<Record<string, any>>(config ?? {})

  useEffect(() => {
    if (config) setLocalConfig(config)
  }, [config])

  const saveConfig = async () => {
    setSaving(true)
    try {
      await adminApi.updateConfig(localConfig)
      onUpdate()
      alert('Config saved!')
    } catch {
      alert('Failed to save config')
    } finally {
      setSaving(false)
    }
  }

  const controls = [
    { key: 'maintenance_mode', label: 'Maintenance Mode', description: 'Shows maintenance screen to all users', type: 'toggle' as const, danger: true },
    { key: 'force_update_required', label: 'Force App Update', description: 'Blocks users until they refresh', type: 'toggle' as const, danger: true },
    { key: 'orion_enabled', label: 'Orion Intelligence', description: 'Enable/disable AI routing brain', type: 'toggle' as const },
    { key: 'friend_tracking_enabled', label: 'Friend Tracking', description: 'Enable/disable friend location sharing', type: 'toggle' as const },
    { key: 'ohgo_cameras_enabled', label: 'OHGO Cameras', description: 'Show traffic cameras on map', type: 'toggle' as const },
    { key: 'gems_multiplier', label: 'Global Gems Multiplier', description: 'Multiply all gem earnings (1x = normal)', type: 'number' as const, min: 0.5, max: 10, step: 0.5 },
    { key: 'max_offer_distance_miles', label: 'Max Offer Distance (miles)', description: 'How far offers show from user', type: 'number' as const, min: 0.5, max: 25, step: 0.5 },
    { key: 'announcement_banner', label: 'Announcement Banner', description: 'Shows a banner to all users in app', type: 'text' as const, placeholder: 'Leave empty to hide banner' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>App Controls</div>
        <button
          onClick={saveConfig}
          disabled={saving}
          style={{
            padding: '10px 24px',
            borderRadius: 10,
            background: '#007AFF',
            color: 'white',
            border: 'none',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {saving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {controls.map(ctrl => (
          <div
            key={ctrl.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              background: ctrl.danger ? 'rgba(255,59,48,0.06)' : 'rgba(255,255,255,0.04)',
              borderRadius: 12,
              border: `1px solid ${ctrl.danger ? 'rgba(255,59,48,0.2)' : 'rgba(255,255,255,0.08)'}`,
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: ctrl.danger ? '#FF3B30' : 'white', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                {ctrl.danger && '⚠️ '}{ctrl.label}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{ctrl.description}</div>
            </div>
            {ctrl.type === 'toggle' && (
              <div
                onClick={() => setLocalConfig(prev => ({ ...prev, [ctrl.key]: !prev[ctrl.key] }))}
                style={{
                  width: 48,
                  height: 28,
                  borderRadius: 14,
                  background: localConfig[ctrl.key] ? (ctrl.danger ? '#FF3B30' : '#34C759') : '#3A3A3C',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  flexShrink: 0,
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: 4,
                  left: localConfig[ctrl.key] ? 24 : 4,
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  background: 'white',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                }} />
              </div>
            )}
            {ctrl.type === 'number' && (
              <input
                type="number"
                value={localConfig[ctrl.key] ?? 1}
                min={ctrl.min}
                max={ctrl.max}
                step={ctrl.step}
                onChange={e => setLocalConfig(prev => ({ ...prev, [ctrl.key]: parseFloat(e.target.value) }))}
                style={{
                  width: 80,
                  padding: '6px 10px',
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 600,
                  textAlign: 'center',
                }}
              />
            )}
            {ctrl.type === 'text' && (
              <input
                type="text"
                value={localConfig[ctrl.key] ?? ''}
                placeholder={ctrl.placeholder}
                onChange={e => setLocalConfig(prev => ({ ...prev, [ctrl.key]: e.target.value }))}
                style={{
                  width: 280,
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'white',
                  fontSize: 13,
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function UsersTab({ users }: { users: any[] }) {
  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>User Management</div>
      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.06)' }}>
              {['Name', 'Email', 'Plan', 'Trips', 'Gems', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u: any) => (
              <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '10px 14px', fontSize: 13 }}>{u.name ?? 'Unknown'}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{u.email ?? '--'}</td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 5, background: u.plan === 'premium' ? '#FF950020' : '#34C75920', color: u.plan === 'premium' ? '#FF9500' : '#34C759', fontWeight: 600 }}>{u.plan ?? 'basic'}</span>
                </td>
                <td style={{ padding: '10px 14px', fontSize: 13 }}>{u.trip_count ?? 0}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, color: '#34C759' }}>{u.gems ?? 0}</td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 5, background: u.is_active ? '#34C75920' : '#FF3B3020', color: u.is_active ? '#34C759' : '#FF3B30' }}>{u.is_active ? 'Active' : 'Inactive'}</span>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <button style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.08)', border: 'none', color: 'white', fontSize: 11, cursor: 'pointer' }}>View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function LiveMapTab({ users }: { users: any[] }) {
  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Live Driver Map</div>
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        borderRadius: 14,
        height: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid rgba(255,255,255,0.08)',
        flexDirection: 'column',
        gap: 12,
      }}>
        <span style={{ fontSize: 48 }}>🗺️</span>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>
          Embed Google Maps here showing all {users.length} live drivers
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
          Use the same Google Maps instance with admin markers
        </div>
      </div>
    </div>
  )
}
