import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function PartnerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  return (
    <div className="space-y-6" data-testid="partner-detail-page">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/partners')}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-white">Partner #{id}</h1>
      </div>
      
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
        <p className="text-slate-400">Partner detail view coming soon...</p>
        <p className="text-slate-500 text-sm mt-2">This will show business info, offers, redemptions, and analytics.</p>
      </div>
    </div>
  )
}
