import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Eye, Check, X, Building2 } from 'lucide-react'

// Mock data
const mockPartners = [
  { id: '1', name: 'Downtown Coffee', type: 'restaurant', status: 'active', plan: 'growth', offers: 2, redemptions: 45 },
  { id: '2', name: 'Auto Plus Service', type: 'service', status: 'pending', plan: 'local', offers: 0, redemptions: 0 },
  { id: '3', name: 'City Gas Station', type: 'fuel', status: 'active', plan: 'enterprise', offers: 5, redemptions: 120 },
]

export default function Partners() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState('all')

  return (
    <div className="space-y-6" data-testid="partners-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Business Partners</h1>
          <p className="text-slate-400 mt-1">Manage partner applications and offers</p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-700/50">
            <tr>
              <th className="text-left text-sm font-medium text-slate-400 uppercase px-6 py-4">Business</th>
              <th className="text-left text-sm font-medium text-slate-400 uppercase px-6 py-4">Plan</th>
              <th className="text-left text-sm font-medium text-slate-400 uppercase px-6 py-4">Status</th>
              <th className="text-left text-sm font-medium text-slate-400 uppercase px-6 py-4">Offers</th>
              <th className="text-left text-sm font-medium text-slate-400 uppercase px-6 py-4">Redemptions</th>
              <th className="text-right text-sm font-medium text-slate-400 uppercase px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {mockPartners.map((partner) => (
              <tr key={partner.id} className="hover:bg-slate-700/30">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <Building2 className="text-purple-400" size={20} />
                    </div>
                    <div>
                      <p className="text-white font-medium">{partner.name}</p>
                      <p className="text-slate-400 text-sm capitalize">{partner.type}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="capitalize text-white">{partner.plan}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    partner.status === 'active' ? 'bg-green-500/20 text-green-400' :
                    partner.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {partner.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-white">{partner.offers}</td>
                <td className="px-6 py-4 text-white">{partner.redemptions}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    {partner.status === 'pending' && (
                      <>
                        <button className="p-2 text-green-400 hover:bg-green-500/20 rounded-lg" title="Approve">
                          <Check size={18} />
                        </button>
                        <button className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg" title="Reject">
                          <X size={18} />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => navigate(`/partners/${partner.id}`)}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
                    >
                      <Eye size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
