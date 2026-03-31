// Incidents Tab
// =============================================

import { useState, useEffect, useMemo } from 'react'
import { Search, AlertTriangle, MapPin, Clock } from 'lucide-react'
import { adminApi } from '@/services/adminApi'
import type { AdminIncident } from '@/types/admin'

interface IncidentsTabProps {
  theme: 'dark' | 'light'
}

export default function IncidentsTab({ theme }: IncidentsTabProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState(() => {
    try {
      if (sessionStorage.getItem('snaproad_admin_incidents_status') === 'pending') {
        sessionStorage.removeItem('snaproad_admin_incidents_status')
        return 'pending'
      }
    } catch {
      /* ignore */
    }
    return 'All Status'
  })
  const [severityFilter, setSeverityFilter] = useState('All Severity')
  const [incidents, setIncidents] = useState<AdminIncident[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadIncidents()
  }, [])

  const loadIncidents = async () => {
    setLoading(true)
    try {
      const res = await adminApi.getIncidents()
      if (res.success && res.data) {
        setIncidents(res.data)
      }
    } catch (error) {
      console.error('Failed to load incidents:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleModerate = async (incidentId: string, outcome: 'approved' | 'rejected') => {
    try {
      const res = await adminApi.moderateIncident(incidentId, outcome)
      if (res.success) {
        loadIncidents()
      }
    } catch (error) {
      console.error('Failed to moderate incident:', error)
    }
  }

  const filteredIncidents = useMemo(() => {
    return incidents.filter(incident => {
      const matchesSearch = (incident.type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (incident.location || '').toLowerCase().includes(searchTerm.toLowerCase())
      const matchesSeverity = severityFilter === 'All Severity' || incident.severity === severityFilter
      const matchesStatus = statusFilter === 'All Status' || incident.status === statusFilter
      return matchesSearch && matchesSeverity && matchesStatus
    })
  }, [incidents, searchTerm, severityFilter, statusFilter])

  const isDark = theme === 'dark'
  const card = isDark ? 'bg-slate-800/50 border-white/[0.08]' : 'bg-white border-[#E6ECF5]'
  const textPrimary = isDark ? 'text-white' : 'text-[#0B1220]'
  const textSecondary = isDark ? 'text-slate-400' : 'text-[#4B5C74]'

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-500/20 text-red-400'
      case 'medium': return 'bg-yellow-500/20 text-yellow-400'
      case 'low': return 'bg-green-500/20 text-green-400'
      default: return 'bg-slate-500/20 text-slate-400'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-blue-500/20 text-blue-400'
      case 'approved': return 'bg-green-500/20 text-green-400'
      case 'rejected': return 'bg-red-500/20 text-red-400'
      case 'active': return 'bg-cyan-500/20 text-cyan-400'
      default: return 'bg-slate-500/20 text-slate-400'
    }
  }

  const pendingCount = incidents.filter(i => i.status === 'pending').length
  const approvedCount = incidents.filter(i => i.status === 'approved').length
  const rejectedCount = incidents.filter(i => i.status === 'rejected').length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className={`text-2xl font-bold ${textPrimary}`}>{incidents.length}</div>
          <div className={`text-xs ${textSecondary}`}>Total Reports</div>
        </div>
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className={`text-2xl font-bold ${textPrimary}`}>{pendingCount}</div>
          <div className={`text-xs ${textSecondary}`}>Pending Review</div>
        </div>
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className={`text-2xl font-bold ${textPrimary}`}>{approvedCount}</div>
          <div className={`text-xs ${textSecondary}`}>Approved</div>
        </div>
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className={`text-2xl font-bold ${textPrimary}`}>{rejectedCount}</div>
          <div className={`text-xs ${textSecondary}`}>Rejected</div>
        </div>
      </div>

      {/* Filters */}
      <div className={`p-4 rounded-xl border ${card}`}>
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search incidents by type or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'
              } placeholder-slate-500`}
            />
          </div>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className={`px-4 py-2 rounded-lg border ${
              isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'
            }`}
          >
            <option value="All Severity">All Severity</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`px-4 py-2 rounded-lg border ${
              isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'
            }`}
          >
            <option value="All Status">All Status</option>
            <option value="pending">Pending</option>
            <option value="active">Active (map)</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Incidents Card Grid */}
      {filteredIncidents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredIncidents.map((incident) => (
            <div key={incident.id} className={`p-5 rounded-xl border ${card} hover:shadow-lg transition-all`}>
              {/* Image Preview */}
              {incident.image_url && (
                <div className={`relative w-full h-36 rounded-xl mb-4 overflow-hidden ${isDark ? 'bg-slate-700/50' : 'bg-[#F5F8FA]'}`}>
                  <img
                    src={incident.image_url}
                    alt="Incident"
                    className={`w-full h-full object-cover ${incident.is_blurred ? 'blur-xl' : ''}`}
                  />
                  <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-black/60 text-white text-[11px] font-medium">
                    {incident.confidence || 0}%
                  </div>
                </div>
              )}

              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className={`text-sm font-medium ${textPrimary}`}>{incident.type}</p>
                  <p className={`text-xs ${textSecondary} mt-1`}>{incident.description}</p>
                </div>
                <div className="flex gap-1">
                  <span className={`px-2 py-0.5 text-[11px] rounded-full ${getSeverityColor(incident.severity)}`}>
                    {(incident.severity || 'unknown').charAt(0).toUpperCase() + (incident.severity || '').slice(1)}
                  </span>
                  <span className={`px-2 py-0.5 text-[11px] rounded-full ${getStatusColor(incident.status)}`}>
                    {(incident.status || 'unknown').charAt(0).toUpperCase() + (incident.status || '').slice(1)}
                  </span>
                </div>
              </div>

              <div className={`flex items-center gap-3 text-xs ${textSecondary} mb-4`}>
                {incident.location && (
                  <span className="flex items-center gap-1">
                    <MapPin size={10} />{incident.location}
                  </span>
                )}
                {incident.created_at && (
                  <span className="flex items-center gap-1">
                    <Clock size={10} />{new Date(incident.created_at).toLocaleDateString()}
                  </span>
                )}
                {incident.reported_by && (
                  <span>by {incident.reported_by}</span>
                )}
              </div>

              {incident.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleModerate(incident.id, 'approved')}
                    className="flex-1 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/30 transition-all"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleModerate(incident.id, 'rejected')}
                    className="flex-1 h-9 rounded-lg bg-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/30 transition-all"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className={`text-center py-12 rounded-xl border ${card}`}>
          <AlertTriangle className="mx-auto text-slate-400 mb-4" size={48} />
          <p className="text-slate-400">No incidents found matching your filters</p>
        </div>
      )}
    </div>
  )
}
