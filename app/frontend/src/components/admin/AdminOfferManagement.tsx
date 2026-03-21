// Offer Management tab — admin offers (replaces figma-ui AdminOfferManagement)

import { useState, useEffect } from 'react'
import { Gift, Search, Trash2 } from 'lucide-react'
import { adminApi } from '@/services/adminApi'

interface AdminOfferManagementProps {
  theme: 'dark' | 'light'
  onNavigate?: (page: string) => void
}

export function AdminOfferManagement({ theme, onNavigate }: AdminOfferManagementProps) {
  const [offers, setOffers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadOffers()
  }, [statusFilter])

  const loadOffers = async () => {
    setLoading(true)
    try {
      const res = await adminApi.getOffers(statusFilter)
      if (res.success && res.data) setOffers(Array.isArray(res.data) ? res.data : [])
      else setOffers([])
    } catch {
      setOffers([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this offer?')) return
    try {
      await adminApi.deleteOffer(id)
      loadOffers()
    } catch (e) {
      console.error(e)
    }
  }

  const filtered = search.trim()
    ? offers.filter(
        (o) =>
          (o.business_name || o.name || '').toLowerCase().includes(search.toLowerCase()) ||
          (o.title || '').toLowerCase().includes(search.toLowerCase())
      )
    : offers

  const isDark = theme === 'dark'

  return (
    <div className={isDark ? 'text-gray-200' : 'text-gray-900'}>
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search offers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-xl border text-sm ${
              isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'
            }`}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={`px-4 py-2 rounded-xl border text-sm ${
            isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'
          }`}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        {onNavigate && (
          <button
            onClick={() => onNavigate('rewards')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${
              isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            <Gift size={18} />
            Rewards & Vouchers
          </button>
        )}
      </div>

      {loading ? (
        <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Loading offers...</p>
      ) : filtered.length === 0 ? (
        <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>No offers found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((offer) => (
            <div
              key={offer.id ?? offer.offer_id}
              className={`flex items-center justify-between p-4 rounded-xl border ${
                isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Gift size={20} className="text-purple-400" />
                </div>
                <div>
                  <p className="font-medium">{offer.business_name ?? offer.name ?? 'Offer'}</p>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {offer.discount_percent != null ? `${offer.discount_percent}% off` : ''}
                    {offer.gems_reward != null ? ` · ${offer.gems_reward} gems` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDelete(String(offer.id ?? offer.offer_id))}
                  className={`p-2 rounded-lg ${isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-500'}`}
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AdminOfferManagement
