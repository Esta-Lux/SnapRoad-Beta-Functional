import { useState } from 'react'
import { X, MapPin, Plus, Check, Image, Gem, Gift, Loader2 } from 'lucide-react'
import type { PartnerProfile } from '@/types/partner'
import { calculateAutoGems, calculateFreeDiscount } from '@/lib/offer-pricing'

interface NewOfferData {
  title: string
  description: string
  discount_percent: number
  gems_reward: number
  is_free_item: boolean
  location_id: string
  expires_days: number
}

interface Props {
  partnerProfile: PartnerProfile | null
  newOfferImage: string | null
  onClose: () => void
  onCreate: (data: NewOfferData, image: string | null) => Promise<void>
  onOpenImageGenerator: () => void
  onClearImage: () => void
  onSwitchToLocations: () => void
}

export default function CreateOfferModal({
  partnerProfile, newOfferImage, onClose, onCreate,
  onOpenImageGenerator, onClearImage, onSwitchToLocations,
}: Props) {
  const [data, setData] = useState<NewOfferData>({
    title: '',
    description: '',
    discount_percent: 15,
    gems_reward: 0,
    is_free_item: false,
    location_id: partnerProfile?.locations[0]?.id || '',
    expires_days: 7,
  })
  const [submitting, setSubmitting] = useState(false)

  const autoGems = calculateAutoGems(data.discount_percent, data.is_free_item)
  const freeDiscount = calculateFreeDiscount(data.discount_percent)

  const handleCreate = async () => {
    setSubmitting(true)
    try {
      await onCreate({ ...data, gems_reward: autoGems }, newOfferImage)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-white/10 shadow-2xl">
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-bold text-xl">Create New Offer</h2>
              <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              {newOfferImage && (
                <div className="relative mb-4">
                  <img src={newOfferImage} alt="Offer" className="w-full h-32 object-cover rounded-xl" />
                  <button onClick={onClearImage} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"><X size={14} /></button>
                </div>
              )}
              <button type="button" onClick={onOpenImageGenerator} className="w-full border-2 border-dashed border-purple-500/30 rounded-xl p-4 text-purple-400 hover:border-purple-500/50 hover:bg-purple-500/5 flex items-center justify-center gap-2">
                <Image size={20} />
                {newOfferImage ? 'Change Image' : 'Generate AI Image'}
              </button>

              <div>
                <label className="text-slate-400 text-sm mb-1 block flex items-center gap-2">
                  <MapPin size={14} /> Select Location <span className="text-red-400">*</span>
                </label>
                {partnerProfile && partnerProfile.locations.length > 0 ? (
                  <select
                    value={data.location_id}
                    onChange={(e) => setData(prev => ({ ...prev, location_id: e.target.value }))}
                    className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white appearance-none cursor-pointer"
                    data-testid="offer-location-select"
                  >
                    <option value="" disabled>-- Choose a store location --</option>
                    {partnerProfile.locations.map(loc => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} {loc.is_primary ? '(Primary)' : ''} - {loc.address.substring(0, 40)}...
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-amber-400 text-sm">
                    <p className="font-medium mb-2">No locations added yet</p>
                    <p className="text-amber-400/70 mb-3">You need to add at least one store location before creating offers.</p>
                    <button type="button" onClick={() => { onClose(); onSwitchToLocations() }}
                      className="px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-400 inline-flex items-center gap-2">
                      <Plus size={16} /> Add Location
                    </button>
                  </div>
                )}
                {data.location_id && partnerProfile && (
                  <div className="mt-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <p className="text-emerald-400 text-xs flex items-center gap-2">
                      <Check size={12} /> Offer will appear on map at this location
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-slate-400 text-sm mb-1 block">Offer Title <span className="text-red-400">*</span></label>
                <input type="text" placeholder="e.g., 20% Off Weekend Special"
                  value={data.title} onChange={(e) => setData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500" />
              </div>
              <div>
                <label className="text-slate-400 text-sm mb-1 block">Description</label>
                <textarea placeholder="Describe your offer..." rows={3}
                  value={data.description} onChange={(e) => setData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none" />
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={data.is_free_item}
                      onChange={(e) => setData(prev => ({ ...prev, is_free_item: e.target.checked, discount_percent: e.target.checked ? 100 : prev.discount_percent }))}
                      className="w-4 h-4 rounded border-white/20 bg-slate-700 text-emerald-500 focus:ring-emerald-500/30" />
                    <span className="text-slate-300 text-sm flex items-center gap-1"><Gift size={14} className="text-emerald-400" /> Free Item</span>
                  </label>
                </div>
                {!data.is_free_item && (
                  <div>
                    <label className="text-slate-400 text-sm mb-1 block">Discount % (Premium Users)</label>
                    <input type="number" placeholder="15" min="1" max="100"
                      value={data.discount_percent} onChange={(e) => setData(prev => ({ ...prev, discount_percent: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white" />
                    <p className="text-slate-500 text-xs mt-1">Free users will see {freeDiscount}% discount</p>
                  </div>
                )}
                <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-slate-300 text-sm flex items-center gap-2">
                    <Gem size={16} className="text-cyan-400" /> Auto Gem Reward
                  </span>
                  <span className="text-cyan-400 font-bold text-lg">{autoGems} gems</span>
                </div>
              </div>
              <div>
                <label className="text-slate-400 text-sm mb-1 block">Expires In (Days)</label>
                <select value={data.expires_days} onChange={(e) => setData(prev => ({ ...prev, expires_days: parseInt(e.target.value) }))}
                  className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white appearance-none cursor-pointer">
                  <option value={1}>1 Day</option>
                  <option value={3}>3 Days</option>
                  <option value={7}>7 Days (Recommended)</option>
                  <option value={14}>14 Days</option>
                  <option value={30}>30 Days</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={onClose} disabled={submitting} className="flex-1 bg-slate-700/50 text-white py-3 rounded-xl hover:bg-slate-700 disabled:opacity-50">Cancel</button>
                <button type="button" onClick={handleCreate} disabled={!data.title || !data.location_id || submitting}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 rounded-xl hover:from-emerald-400 hover:to-teal-400 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {submitting ? <><Loader2 size={18} className="animate-spin" /> Creating...</> : 'Create Offer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
