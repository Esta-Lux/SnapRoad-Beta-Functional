import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, Check, X, Flag, AlertTriangle } from 'lucide-react'

// Mock data
const mockIncidents = [
  { id: '1', type: 'hazard', description: 'Pothole on Main Street', status: 'pending', reporter: 'John Smith', reportedAt: '2025-01-15 10:30', photos: 2 },
  { id: '2', type: 'accident', description: 'Minor fender bender', status: 'pending', reporter: 'Jane Doe', reportedAt: '2025-01-15 09:15', photos: 3 },
  { id: '3', type: 'construction', description: 'Road work ahead', status: 'approved', reporter: 'Test Driver', reportedAt: '2025-01-14 16:00', photos: 1 },
  { id: '4', type: 'violation', description: 'Running red light', status: 'rejected', reporter: 'Bob Wilson', reportedAt: '2025-01-14 14:30', photos: 1 },
]

export default function Incidents() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState('pending')

  const filteredIncidents = mockIncidents.filter(i => 
    statusFilter === 'all' || i.status === statusFilter
  )

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'accident': return 'bg-red-500/20 text-red-400'
      case 'hazard': return 'bg-yellow-500/20 text-yellow-400'
      case 'construction': return 'bg-orange-500/20 text-orange-400'
      case 'violation': return 'bg-purple-500/20 text-purple-400'
      default: return 'bg-slate-500/20 text-slate-400'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500/20 text-green-400'
      case 'rejected': return 'bg-red-500/20 text-red-400'
      case 'flagged': return 'bg-yellow-500/20 text-yellow-400'
      default: return 'bg-blue-500/20 text-blue-400'
    }
  }

  return (
    <div className="space-y-6" data-testid="incidents-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Incident Moderation</h1>
          <p className="text-slate-400 mt-1">Review and moderate user-reported incidents</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1">
          {['pending', 'approved', 'rejected', 'all'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
                statusFilter === status
                  ? 'bg-primary-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        {filteredIncidents.map((incident) => (
          <div
            key={incident.id}
            className="bg-slate-800 rounded-xl border border-slate-700 p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-slate-700 flex items-center justify-center">
                  <AlertTriangle className="text-yellow-400" size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(incident.type)}`}>
                      {incident.type}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(incident.status)}`}>
                      {incident.status}
                    </span>
                  </div>
                  <p className="text-white font-medium">{incident.description}</p>
                  <p className="text-slate-400 text-sm mt-1">
                    Reported by {incident.reporter} • {incident.reportedAt} • {incident.photos} photos
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {incident.status === 'pending' && (
                  <>
                    <button className="p-2 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors" title="Approve">
                      <Check size={20} />
                    </button>
                    <button className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors" title="Reject">
                      <X size={20} />
                    </button>
                    <button className="p-2 text-yellow-400 hover:bg-yellow-500/20 rounded-lg transition-colors" title="Flag">
                      <Flag size={20} />
                    </button>
                  </>
                )}
                <button
                  onClick={() => navigate(`/incidents/${incident.id}`)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                  title="View Details"
                >
                  <Eye size={20} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
