import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, X, Flag } from 'lucide-react'

export default function IncidentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  return (
    <div className="space-y-6" data-testid="incident-detail-page">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/incidents')}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-white">Incident #{id}</h1>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30">
            <Check size={18} /> Approve
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30">
            <X size={18} /> Reject
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30">
            <Flag size={18} /> Flag
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Incident Details</h2>
          <p className="text-slate-400">Incident detail view with photos, location map, and moderation controls coming soon...</p>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Photos (with blur toggle)</h2>
          <p className="text-slate-400">Photo viewer with blurred/unblurred toggle coming soon...</p>
        </div>
      </div>
    </div>
  )
}
