// Audit Log Tab
// =============================================

import { useState, useEffect } from 'react'
import { FileText, Search, Download, Shield, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { adminApi } from '@/services/adminApi'

interface AuditLogTabProps {
  theme: 'dark' | 'light'
}

interface AuditLogEntry {
  id: string
  action: string
  actor: string
  target: string
  ip_address: string
  status: string
  details: string
  created_at: string
}

export default function AuditLogTab({ theme }: AuditLogTabProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [userFilter, setUserFilter] = useState('all')

  useEffect(() => {
    loadAuditLogs()
  }, [actionFilter, userFilter])

  const loadAuditLogs = async () => {
    setLoading(true)
    setError(null)
    try {
      let limit = 50
      try {
        const stored = sessionStorage.getItem('snaproad_audit_log_limit')
        if (stored) {
          const n = parseInt(stored, 10)
          if (!Number.isNaN(n) && n > 0) limit = Math.min(n, 500)
          sessionStorage.removeItem('snaproad_audit_log_limit')
        }
      } catch {
        /* ignore */
      }
      const res = await adminApi.getAuditLog(limit)
      if (res.success && res.data) {
        setLogs(res.data)
      } else {
        setLogs([])
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err)
      setError('Failed to load audit logs')
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.target.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (log.details || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (log.actor || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesAction = actionFilter === 'all' || log.action === actionFilter
    const matchesUser = userFilter === 'all' || log.actor === userFilter
    return matchesSearch && matchesAction && matchesUser
  })

  const uniqueActors = [...new Set(logs.map(l => l.actor).filter(Boolean))]

  const isDark = theme === 'dark'
  const card = isDark ? 'bg-slate-800/50 border-white/[0.08]' : 'bg-white border-[#E6ECF5]'
  const heading = isDark ? 'text-white' : 'text-[#0B1220]'
  const muted = isDark ? 'text-slate-400' : 'text-slate-600'
  const cellText = isDark ? 'text-white' : 'text-[#0B1220]'

  const getActionIcon = (action: string) => {
    if (action.includes('USER')) return <Shield className="text-blue-400" size={16} />
    if (action.includes('PARTNER')) return <Shield className="text-emerald-400" size={16} />
    if (action.includes('SETTINGS')) return <FileText className="text-purple-400" size={16} />
    if (action.includes('LOGIN')) return <AlertTriangle className="text-red-400" size={16} />
    return <FileText className="text-slate-400" size={16} />
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="text-green-400" size={16} />
      case 'error': return <XCircle className="text-red-400" size={16} />
      case 'warning': return <AlertTriangle className="text-amber-400" size={16} />
      default: return <FileText className="text-slate-400" size={16} />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertTriangle className="text-red-400 mb-4" size={48} />
        <p className={muted}>{error}</p>
      </div>
    )
  }

  const selectCls = `w-full min-w-0 rounded-lg border px-3 py-2 text-sm ${
    isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'
  }`
  const tbodyDivide = isDark ? 'divide-y divide-slate-700/50' : 'divide-y divide-slate-200'

  return (
    <div className="max-w-full min-w-0 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className={`text-xl font-bold sm:text-2xl ${heading}`}>Audit Log</h2>
          <p className={`mt-1 text-sm ${muted}`}>Track all administrative actions and system events</p>
        </div>
        <button
          type="button"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-500/20 px-4 py-2.5 text-sm text-blue-400 hover:bg-blue-500/30 sm:self-center"
        >
          <Download size={18} className="shrink-0" />
          Export Logs
        </button>
      </div>

      {/* Filters */}
      <div className={`rounded-xl border p-4 sm:p-5 ${card}`}>
        <p className={`mb-3 text-xs sm:hidden ${muted}`}>Search and filter — scroll horizontally on small screens if needed.</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_minmax(0,11rem)_minmax(0,11rem)] md:items-center md:gap-4">
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search audit logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full rounded-lg border py-2 pl-10 pr-4 text-sm ${
                isDark ? 'border-white/10 bg-slate-700/50 text-white' : 'border-[#E6ECF5] bg-white text-[#0B1220]'
              } placeholder-slate-500`}
            />
          </div>
          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className={selectCls}>
            <option value="all">All Actions</option>
            <option value="USER_CREATED">User Created</option>
            <option value="USER_SUSPENDED">User Suspended</option>
            <option value="PARTNER_APPROVED">Partner Approved</option>
            <option value="SETTINGS_UPDATED">Settings Updated</option>
            <option value="LOGIN_FAILED">Login Failed</option>
          </select>
          <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} className={selectCls}>
            <option value="all">All Users</option>
            {uniqueActors.map((actor) => (
              <option key={actor} value={actor}>
                {actor}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mobile: card list */}
      {filteredLogs.length > 0 && (
        <div className={`space-y-3 md:hidden ${card} rounded-xl border p-4`}>
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className={`rounded-lg border p-4 ${isDark ? 'border-white/[0.08] bg-slate-900/30' : 'border-[#E6ECF5] bg-[#F8FAFC]'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  {getActionIcon(log.action)}
                  <span className={`break-words text-sm font-medium ${cellText}`}>{log.action}</span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {getStatusIcon(log.status)}
                  <span className={`text-xs capitalize ${muted}`}>{log.status}</span>
                </div>
              </div>
              <p className={`mt-2 break-all font-mono text-xs ${muted}`}>{log.created_at}</p>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex flex-col gap-0.5">
                  <dt className={`text-xs font-medium uppercase tracking-wide ${muted}`}>User</dt>
                  <dd className={`break-words ${cellText}`}>{log.actor || '—'}</dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className={`text-xs font-medium uppercase tracking-wide ${muted}`}>Target</dt>
                  <dd className={`break-words ${cellText}`}>{log.target || '—'}</dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className={`text-xs font-medium uppercase tracking-wide ${muted}`}>IP</dt>
                  <dd className={`break-all font-mono text-xs ${muted}`}>{log.ip_address || '—'}</dd>
                </div>
                {log.details ? (
                  <div className="flex flex-col gap-0.5 pt-1">
                    <dt className={`text-xs font-medium uppercase tracking-wide ${muted}`}>Details</dt>
                    <dd className={`break-words text-xs ${muted}`}>{log.details}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ))}
        </div>
      )}

      {/* Desktop: table */}
      {filteredLogs.length > 0 ? (
      <div className={`hidden overflow-hidden rounded-xl border md:block ${card}`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className={isDark ? 'bg-slate-800/50' : 'bg-[#F8FAFC]'}>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400 lg:px-6 lg:py-4">
                  Timestamp
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400 lg:px-6 lg:py-4">
                  Action
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400 lg:px-6 lg:py-4">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400 lg:px-6 lg:py-4">
                  Target
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400 lg:px-6 lg:py-4">
                  IP
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400 lg:px-6 lg:py-4">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400 lg:px-6 lg:py-4">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className={tbodyDivide}>
              {filteredLogs.map((log) => (
                <tr key={log.id} className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-[#F8FAFC]'}>
                  <td className="px-4 py-3 lg:px-6 lg:py-4">
                    <div className={`text-sm ${muted}`}>{log.created_at}</div>
                  </td>
                  <td className="px-4 py-3 lg:px-6 lg:py-4">
                    <div className="flex items-center gap-2">
                      {getActionIcon(log.action)}
                      <span className={`text-sm font-medium ${cellText}`}>{log.action}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 lg:px-6 lg:py-4">
                    <div className={`text-sm ${cellText}`}>{log.actor}</div>
                  </td>
                  <td className="px-4 py-3 lg:px-6 lg:py-4">
                    <div className={`max-w-[12rem] truncate text-sm ${cellText}`} title={log.target}>
                      {log.target}
                    </div>
                  </td>
                  <td className="px-4 py-3 lg:px-6 lg:py-4">
                    <div className={`font-mono text-sm ${muted}`}>{log.ip_address}</div>
                  </td>
                  <td className="px-4 py-3 lg:px-6 lg:py-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(log.status)}
                      <span className={`text-sm capitalize ${cellText}`}>{log.status}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 lg:px-6 lg:py-4">
                    <div className={`max-w-xs text-sm ${muted}`}>{log.details}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      ) : null}

      {(filteredLogs.length === 0 || logs.length === 0) && (
        <div className={`rounded-xl border py-12 text-center ${card}`}>
          <FileText className="mx-auto mb-4 text-slate-400" size={48} />
          <p className={muted}>
            {logs.length === 0 ? 'No audit logs found' : 'No audit logs found matching your filters'}
          </p>
        </div>
      )}
    </div>
  )
}
