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
        <p className="text-slate-400">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Audit Log</h2>
          <p className="text-slate-400">Track all administrative actions and system events</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30">
          <Download size={18} />
          Export Logs
        </button>
      </div>

      {/* Filters */}
      <div className={`p-4 rounded-xl border ${card}`}>
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search audit logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'
              } placeholder-slate-500`}
            />
          </div>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className={`px-4 py-2 rounded-lg border ${
              isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'
            }`}
          >
            <option value="all">All Actions</option>
            <option value="USER_CREATED">User Created</option>
            <option value="USER_SUSPENDED">User Suspended</option>
            <option value="PARTNER_APPROVED">Partner Approved</option>
            <option value="SETTINGS_UPDATED">Settings Updated</option>
            <option value="LOGIN_FAILED">Login Failed</option>
          </select>
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className={`px-4 py-2 rounded-lg border ${
              isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'
            }`}
          >
            <option value="all">All Users</option>
            {uniqueActors.map(actor => (
              <option key={actor} value={actor}>{actor}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className={`rounded-xl border overflow-hidden ${card}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={isDark ? 'bg-slate-800/50' : 'bg-[#F8FAFC]'}>
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Action</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Target</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">IP</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filteredLogs.map((log) => (
                <tr key={log.id} className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-[#F8FAFC]'}>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-400">{log.created_at}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getActionIcon(log.action)}
                      <span className="text-sm font-medium text-white">{log.action}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-white">{log.actor}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-white">{log.target}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-400 font-mono">{log.ip_address}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(log.status)}
                      <span className="text-sm capitalize">{log.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-400">{log.details}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(filteredLogs.length === 0 || logs.length === 0) && (
        <div className={`text-center py-12 rounded-xl border ${card}`}>
          <FileText className="mx-auto text-slate-400 mb-4" size={48} />
          <p className="text-slate-400">
            {logs.length === 0 ? 'No audit logs found' : 'No audit logs found matching your filters'}
          </p>
        </div>
      )}
    </div>
  )
}
