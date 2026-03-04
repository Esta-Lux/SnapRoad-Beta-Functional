import { useState } from 'react'
import { X, Gift, Check, MapPin } from 'lucide-react'
import type { Offer, PartnerProfile } from '@/types/partner'

interface Props {
  offer: Offer
  partnerProfile: PartnerProfile | null
  onClose: () => void
  onUpdate: (offerId: string, offerData: {
    title: string
    description: string
    discount_percent: number
    gems_reward: number
    location_id: string
    expires_days: number
  }) => Promise<void>
}

export default function EditOfferModal({ offer, partnerProfile, onClose, onUpdate }: Props) {
  const [formData, setFormData] = useState({
    title: offer.title,
    description: offer.description,
    discount_percent: offer.discount_percent,
    gems_reward: offer.gems_reward,
    location_id: String(offer.location_id || ''),
    expires_days: 7,
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !formData.location_id) return

    setLoading(true)
    try {
      await onUpdate(String(offer.id), formData)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-white/10 shadow-2xl">
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-white font-bold text-xl flex items-center gap-2">
                  <Gift className="text-emerald-400" size={24} />
                  Edit Offer
                </h2>
                <p className="text-slate-400 text-sm mt-1">Update your offer details</p>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-slate-400 text-sm mb-1.5 block">
                  Offer Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="e.g., 20% Off All Services"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 text-sm mb-1.5 block">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                  rows={3}
                  placeholder="Describe your offer..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 text-sm mb-1.5 block">Discount %</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.discount_percent}
                    onChange={(e) => setFormData({ ...formData, discount_percent: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-sm mb-1.5 block">Gems Reward</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.gems_reward}
                    onChange={(e) => setFormData({ ...formData, gems_reward: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 text-sm mb-1.5 block">
                  Location <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <select
                    value={formData.location_id}
                    onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                    className="w-full bg-slate-700/50 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    required
                  >
                    <option value="">Select a location</option>
                    {partnerProfile?.locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} - {loc.address}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 text-sm mb-1.5 block">Expires In (Days)</label>
                <input
                  type="number"
                  min="1"
                  value={formData.expires_days}
                  onChange={(e) => setFormData({ ...formData, expires_days: parseInt(e.target.value) || 7 })}
                  className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-slate-700/50 text-white py-3 rounded-xl hover:bg-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !formData.title || !formData.location_id}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 rounded-xl hover:from-emerald-400 hover:to-teal-400 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Check size={18} />
                      Update Offer
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
