// Audit Log Tab
// =============================================

import { useState, useEffect } from 'react'
import { FileText, Search, Filter, Calendar, Download, Shield, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

interface AuditLogTabProps {
  theme: 'dark' | 'light'
}

export default function AuditLogTab({ theme }: AuditLogTabProps) {
  const [logs, setLogs] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [userFilter, setUserFilter] = useState('all')

  useEffect(() => {
    loadAuditLogs()
  }, [actionFilter, userFilter])

  const loadAuditLogs = async () => {
    setLoading(true)
    try {
      // Mock data - in real app, this would call backend API
      const mockLogs = [
        { id: 1, action: 'USER_CREATED', user: 'admin@snaproad.com', target: 'john@example.com', ip: '192.168.1.100', timestamp: '2024-02-19 14:30:22', status: 'success', details: 'Created new user account' },
        { id: 2, action: 'PARTNER_APPROVED', user: 'admin@snaproad.com', target: 'Shell Gas Station', ip: '192.168.1.100', timestamp: '2024-02-19 13:45:10', status: 'success', details: 'Approved partner registration' },
        { id: 3, action: 'SETTINGS_UPDATED', user: 'admin@snaproad.com', target: 'System Settings', ip: '192.168.1.100', timestamp: '2024-02-19 12:20:05', status: 'success', details: 'Updated security settings' },
        { id: 4, action: 'LOGIN_FAILED', user: 'unknown', target: 'admin@snaproad.com', ip: '192.168.1.200', timestamp: '2024-02-19 11:15:33', status: 'error', details: 'Failed login attempt - invalid password' },
        { id: 5, action: 'OFFER_CREATED', user: 'admin@snaproad.com', target: 'McDonald\'s Offer', ip: '192.168.1.100', timestamp: '2024-02-19 10:30:15', status: 'success', details: 'Created new promotional offer' },
        { id: 6, action: 'USER_SUSPENDED', user: 'admin@snaproad.com', target: 'emily@example.com', ip: '192.168.1.100', timestamp: '2024-02-19 09:45:22', status: 'success', details: 'Suspended user account for policy violation' },
        { id: 7, action: 'DATA_EXPORTED', user: 'admin@snaproad.com', target: 'User Database', ip: '192.168.1.100', timestamp: '2024-02-19 08:20:10', status: 'success', details: 'Exported 1,250 user records to CSV' },
        { id: 8, action: 'SYSTEM_BACKUP', user: 'system', target: 'Database', ip: '127.0.0.1', timestamp: '2024-02-19 06:00:00', status: 'success', details: 'Automated daily backup completed' },
      ]
      setLogs(mockLogs)
    } catch (error) {
      console.error('Failed to load audit logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = logs ? logs.filter(log => {
    const matchesSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.target.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.details.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesAction = actionFilter === 'all' || log.action === actionFilter
    const matchesUser = userFilter === 'all' || log.user === userFilter
    return matchesSearch && matchesAction && matchesUser
  }) : []

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
            <option value="admin@snaproad.com">Admin</option>
            <option value="system">System</option>
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
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">IP Address</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filteredLogs.map((log) => (
                <tr key={log.id} className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-[#F8FAFC]'}>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-400">{log.timestamp}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getActionIcon(log.action)}
                      <span className="text-sm font-medium text-white">{log.action}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-white">{log.user}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-white">{log.target}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-400 font-mono">{log.ip}</div>
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

      {filteredLogs.length === 0 && (
        <div className={`text-center py-12 rounded-xl border ${card}`}>
          <FileText className="mx-auto text-slate-400 mb-4" size={48} />
          <p className="text-slate-400">No audit logs found matching your filters</p>
        </div>
      )}
    </div>
  )
}
