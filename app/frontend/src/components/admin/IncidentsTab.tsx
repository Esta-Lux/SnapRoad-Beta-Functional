// Incidents Tab
// =============================================

import { useState, useEffect, useMemo } from 'react'
import { Search, AlertTriangle, MapPin, Clock, Filter, Eye, Shield, TrendingUp } from 'lucide-react'

interface Incident {
  id: number
  type: string
  location: string
  severity: 'low' | 'medium' | 'high'
  status: 'open' | 'investigating' | 'resolved'
  confidence: number
  reportedAt: string
  description: string
}

interface IncidentsTabProps {
  theme: 'dark' | 'light'
}

const API_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || ''

export default function IncidentsTab({ theme }: IncidentsTabProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [severityFilter, setSeverityFilter] = useState('All Severity')
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadIncidents()
  }, [])

  const loadIncidents = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/admin/incidents`)
      const data = await res.json()
      if (data.success) {
        setIncidents(data.data)
      }
    } catch (error) {
      console.error('Failed to load incidents:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleResolveIncident = async (incidentId: number) => {
    try {
      // In a real app, this would call the backend
      setIncidents(prev => prev.map(incident => 
        incident.id === incidentId 
          ? { ...incident, status: 'resolved' as const }
          : incident
      ))
    } catch (error) {
      console.error('Failed to resolve incident:', error)
    }
  }

  const handleInvestigateIncident = async (incidentId: number) => {
    try {
      // In a real app, this would call the backend
      setIncidents(prev => prev.map(incident => 
        incident.id === incidentId 
          ? { ...incident, status: 'investigating' as const }
          : incident
      ))
    } catch (error) {
      console.error('Failed to investigate incident:', error)
    }
  }

  const filteredIncidents = useMemo(() => {
    return incidents.filter(incident => {
      const matchesSearch = incident.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           incident.location.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesSeverity = severityFilter === 'All Severity' || incident.severity === severityFilter
      const matchesStatus = statusFilter === 'All Status' || incident.status === statusFilter
      return matchesSearch && matchesSeverity && matchesStatus
    })
  }, [incidents, searchTerm, severityFilter, statusFilter])

  const isDark = theme === 'dark'
  const card = isDark ? 'bg-slate-800/50 border-white/[0.08]' : 'bg-white border-[#E6ECF5]'

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
      case 'open': return 'bg-blue-500/20 text-blue-400'
      case 'resolved': return 'bg-green-500/20 text-green-400'
      case 'investigating': return 'bg-purple-500/20 text-purple-400'
      default: return 'bg-slate-500/20 text-slate-400'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
              <AlertTriangle className="text-red-400" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{incidents.length}</div>
              <div className="text-xs text-slate-400">Total Incidents</div>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs text-red-400">
            <TrendingUp size={12} />
            <span>+12%</span>
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Eye className="text-blue-400" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{incidents.filter(i => i.status === 'open').length}</div>
              <div className="text-xs text-slate-400">Open Cases</div>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Shield className="text-green-400" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{incidents.filter(i => i.status === 'resolved').length}</div>
              <div className="text-xs text-slate-400">Resolved</div>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-purple-400" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{Math.round(incidents.reduce((acc, i) => acc + i.confidence, 0) / incidents.length)}%</div>
              <div className="text-xs text-slate-400">Avg Confidence</div>
            </div>
          </div>
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
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
            <option value="investigating">Investigating</option>
          </select>
        </div>
      </div>

      {/* Incidents Table */}
      <div className={`rounded-xl border overflow-hidden ${card}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={isDark ? 'bg-slate-800/50' : 'bg-[#F8FAFC]'}>
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Incident</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Severity</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Location</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Reported By</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Time</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filteredIncidents.map((incident) => (
                <tr key={incident.id} className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-[#F8FAFC]'}>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-white">{incident.type}</div>
                      <div className="text-xs text-slate-400">{incident.description}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${getSeverityColor(incident.severity)}`}>
                      {incident.severity.charAt(0).toUpperCase() + incident.severity.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(incident.status)}`}>
                      {incident.status.charAt(0).toUpperCase() + incident.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-sm text-white">
                      <MapPin size={14} />
                      {incident.location}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-white">{incident.reportedBy}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-sm text-slate-400">
                      <Clock size={14} />
                      {incident.reportedAt}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-700/50 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            incident.confidence >= 90 ? 'bg-green-500' :
                            incident.confidence >= 80 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${incident.confidence}%` }}
                        />
                      </div>
                      <span className="text-sm text-white">{incident.confidence}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredIncidents.length === 0 && (
        <div className={`text-center py-12 rounded-xl border ${card}`}>
          <AlertTriangle className="mx-auto text-slate-400 mb-4" size={48} />
          <p className="text-slate-400">No incidents found matching your filters</p>
        </div>
      )}
    </div>
  )
}
