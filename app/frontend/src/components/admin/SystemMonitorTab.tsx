import { useEffect, useMemo, useRef, useState } from 'react'
import { Activity, AlertTriangle, Download, Filter, RefreshCw } from 'lucide-react'
import type { TelemetryEvent, WSMessage } from '@/types/admin'

interface Props {
  theme: 'dark' | 'light'
}

const WS_BASE = (() => {
  const apiUrl = (import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || import.meta.env.VITE_API_URL || '')
  const httpBase = apiUrl || 'http://localhost:8001'
  return httpBase.replace(/^https/, 'wss').replace(/^http:\/\//, 'ws://')
})()

const API_BASE = import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || ''

export default function SystemMonitorTab({ theme }: Props) {
  const [events, setEvents] = useState<TelemetryEvent[]>([])
  const [status, setStatus] = useState<'live' | 'offline' | 'connecting'>('connecting')
  const [severity, setSeverity] = useState<'all' | 'info' | 'warn' | 'error'>('all')
  const [search, setSearch] = useState('')
  const [onlyFailures, setOnlyFailures] = useState(false)
  const [subsystemFilter, setSubsystemFilter] = useState<'all' | 'admin' | 'partner' | 'websocket' | 'auth' | 'other'>('all')
  const wsRef = useRef<WebSocket | null>(null)

  const toSubsystem = (path: string): 'admin' | 'partner' | 'websocket' | 'auth' | 'other' => {
    if (path.startsWith('/api/admin')) return 'admin'
    if (path.startsWith('/api/partner')) return 'partner'
    if (path.startsWith('/api/ws')) return 'websocket'
    if (path.startsWith('/api/auth')) return 'auth'
    return 'other'
  }

  const loadSnapshot = async () => {
    try {
      const token = localStorage.getItem('snaproad_admin_token')
      const res = await fetch(`${API_BASE}/api/admin/monitor/events?limit=200`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (!res.ok) return
      const data = await res.json()
      if (data?.success && Array.isArray(data.data)) {
        setEvents(data.data)
      }
    } catch {
      // no-op
    }
  }

  useEffect(() => {
    loadSnapshot()
    const token = localStorage.getItem('snaproad_admin_token')
    if (!token) {
      setStatus('offline')
      return
    }
    const ws = new WebSocket(`${WS_BASE}/api/ws/admin/monitor?token=${encodeURIComponent(token)}`)
    wsRef.current = ws

    ws.onopen = () => setStatus('live')
    ws.onclose = () => setStatus('offline')
    ws.onerror = () => setStatus('offline')
    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data) as WSMessage
        if (msg.type === 'telemetry_snapshot' && Array.isArray(msg.events)) {
          setEvents(msg.events)
        } else if (msg.type === 'telemetry_event' && msg.event) {
          setEvents((prev) => [msg.event!, ...prev].slice(0, 500))
        }
      } catch {
        // no-op
      }
    }
    return () => ws.close()
  }, [])

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (subsystemFilter !== 'all' && toSubsystem(e.path) !== subsystemFilter) return false
      if (onlyFailures && e.status_code < 400) return false
      if (severity !== 'all' && e.severity !== severity) return false
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return e.path.toLowerCase().includes(q) || e.method.toLowerCase().includes(q) || String(e.status_code).includes(q)
    })
  }, [events, severity, search, onlyFailures, subsystemFilter])

  const summary = useMemo(() => {
    const errorEvents = events.filter((e) => e.status_code >= 500 || e.severity === 'error')
    const warnEvents = events.filter((e) => e.status_code >= 400 && e.status_code < 500)
    const latencySorted = [...events].map((e) => e.duration_ms).sort((a, b) => a - b)
    const p95 = latencySorted.length ? latencySorted[Math.floor(latencySorted.length * 0.95)] : 0
    const routeErrors: Record<string, number> = {}
    for (const e of errorEvents) {
      const key = `${e.method} ${e.path}`
      routeErrors[key] = (routeErrors[key] || 0) + 1
    }
    const topFailing = Object.entries(routeErrors)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([route, count]) => ({ route, count }))
    return {
      total: events.length,
      errors: errorEvents.length,
      warns: warnEvents.length,
      p95,
      topFailing,
    }
  }, [events])

  const subsystemSummary = useMemo(() => {
    const groups: Record<string, { total: number; failures: number; p95: number; latencies: number[] }> = {}
    for (const e of events) {
      const key = toSubsystem(e.path)
      if (!groups[key]) groups[key] = { total: 0, failures: 0, p95: 0, latencies: [] }
      groups[key].total += 1
      if (e.status_code >= 400) groups[key].failures += 1
      groups[key].latencies.push(e.duration_ms)
    }
    for (const key of Object.keys(groups)) {
      const sorted = groups[key].latencies.sort((a, b) => a - b)
      groups[key].p95 = sorted.length ? sorted[Math.floor(sorted.length * 0.95)] : 0
    }
    return Object.entries(groups)
      .map(([name, data]) => ({ name, total: data.total, failures: data.failures, p95: data.p95 }))
      .sort((a, b) => b.failures - a.failures || b.total - a.total)
  }, [events])

  const exportEvents = async (format: 'json' | 'csv') => {
    try {
      const token = localStorage.getItem('snaproad_admin_token')
      const res = await fetch(`${API_BASE}/api/admin/monitor/events/export?limit=500&format=${format}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (!res.ok) return
      if (format === 'json') {
        const data = await res.json()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'monitor-events.json'
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'monitor-events.csv'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      // no-op
    }
  }

  const isDark = theme === 'dark'
  const card = isDark ? 'bg-slate-800/50 border-white/[0.08]' : 'bg-white border-[#E6ECF5]'

  return (
    <div className="space-y-6">
      <div className={`p-4 rounded-xl border ${card} flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <Activity className="text-cyan-400" size={20} />
          <div>
            <div className="text-white font-semibold">System Live Monitor</div>
            <div className="text-slate-400 text-sm">Real-time request and failure stream</div>
          </div>
        </div>
        <div className={`text-xs px-2 py-1 rounded-full ${status === 'live' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
          {status === 'live' ? 'Live' : status === 'connecting' ? 'Connecting' : 'Offline'}
        </div>
      </div>

      <div className={`p-4 rounded-xl border ${card} flex flex-wrap items-center gap-3`}>
        <div className="flex items-center gap-2 text-slate-300 text-sm"><Filter size={14} />Filter</div>
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value as any)}
          className="px-3 py-2 rounded-lg bg-slate-700/50 border border-white/10 text-white text-sm"
        >
          <option value="all">All severities</option>
          <option value="info">Info</option>
          <option value="warn">Warn</option>
          <option value="error">Error</option>
        </select>
        <button
          onClick={() => setOnlyFailures((v) => !v)}
          className={`px-3 py-2 rounded-lg text-sm border ${onlyFailures ? 'bg-red-500/20 text-red-300 border-red-500/40' : 'bg-slate-700/50 text-slate-300 border-white/10'}`}
        >
          Only Failures
        </button>
        <select
          value={subsystemFilter}
          onChange={(e) => setSubsystemFilter(e.target.value as any)}
          className="px-3 py-2 rounded-lg bg-slate-700/50 border border-white/10 text-white text-sm"
        >
          <option value="all">All subsystems</option>
          <option value="admin">Admin</option>
          <option value="partner">Partner</option>
          <option value="websocket">WebSocket</option>
          <option value="auth">Auth</option>
          <option value="other">Other</option>
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search path/method/status..."
          className="flex-1 min-w-[220px] px-3 py-2 rounded-lg bg-slate-700/50 border border-white/10 text-white text-sm"
        />
        <button onClick={loadSnapshot} className="px-3 py-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 text-sm flex items-center gap-1.5">
          <RefreshCw size={14} />
          Refresh
        </button>
        <button onClick={() => exportEvents('json')} className="px-3 py-2 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 text-sm flex items-center gap-1.5">
          <Download size={14} />
          Export JSON
        </button>
        <button onClick={() => exportEvents('csv')} className="px-3 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-sm flex items-center gap-1.5">
          <Download size={14} />
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="text-slate-400 text-xs">Events</div>
          <div className="text-white text-2xl font-bold">{summary.total}</div>
        </div>
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="text-slate-400 text-xs">Errors (5xx)</div>
          <div className="text-red-400 text-2xl font-bold">{summary.errors}</div>
        </div>
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="text-slate-400 text-xs">Warnings (4xx)</div>
          <div className="text-amber-400 text-2xl font-bold">{summary.warns}</div>
        </div>
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="text-slate-400 text-xs">p95 Latency</div>
          <div className="text-cyan-400 text-2xl font-bold">{summary.p95}ms</div>
        </div>
      </div>

      {summary.topFailing.length > 0 && (
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="text-white font-semibold mb-2">Top failing routes</div>
          <div className="space-y-1">
            {summary.topFailing.map((r) => (
              <div key={r.route} className="text-sm text-slate-300 flex items-center justify-between">
                <span>{r.route}</span>
                <span className="text-red-400">{r.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {subsystemSummary.length > 0 && (
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="text-white font-semibold mb-3">Subsystem Health</div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {subsystemSummary.map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => setSubsystemFilter((prev) => (prev === s.name ? 'all' : (s.name as any)))}
                className={`p-3 rounded-lg border text-left ${
                  subsystemFilter === s.name
                    ? 'bg-blue-500/20 border-blue-500/40'
                    : 'bg-slate-700/30 border-white/10 hover:bg-slate-700/50'
                }`}
              >
                <div className="text-slate-300 text-xs uppercase">{s.name}</div>
                <div className="text-white text-lg font-bold">{s.total}</div>
                <div className="text-red-300 text-xs">failures: {s.failures}</div>
                <div className="text-cyan-300 text-xs">p95: {s.p95}ms</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={`rounded-xl border ${card} overflow-hidden`}>
        <div className="max-h-[60vh] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No telemetry events yet.</div>
          ) : (
            filtered.map((e) => (
              <div key={e.id} className="px-4 py-3 border-b border-white/5 flex items-start gap-3">
                <div className={`mt-1 w-2 h-2 rounded-full ${e.severity === 'error' ? 'bg-red-400' : e.severity === 'warn' ? 'bg-amber-400' : 'bg-cyan-400'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-300">{new Date(e.timestamp).toLocaleTimeString()}</span>
                    <span className="text-cyan-300 font-semibold">{e.method}</span>
                    <span className="text-white truncate">{e.path}</span>
                    <span className={`px-1.5 py-0.5 rounded text-xs ${e.status_code >= 500 ? 'bg-red-500/20 text-red-400' : e.status_code >= 400 ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{e.status_code}</span>
                    <span className="text-slate-400 text-xs">{e.duration_ms}ms</span>
                  </div>
                  {e.error && (
                    <div className="mt-1 text-xs text-red-300 flex items-center gap-1">
                      <AlertTriangle size={12} />
                      {e.error}
                    </div>
                  )}
                  {e.error_stack && (
                    <pre className="mt-2 text-[11px] text-slate-400 whitespace-pre-wrap bg-black/20 rounded p-2 overflow-x-auto">
                      {e.error_stack}
                    </pre>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
