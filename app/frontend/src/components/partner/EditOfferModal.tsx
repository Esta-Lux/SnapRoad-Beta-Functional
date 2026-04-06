import { useRef, useState, useMemo, useEffect } from 'react'
import { X, Gift as GiftIcon, Check, MapPin, Gem, Loader2, Upload } from 'lucide-react'
import type { Offer, PartnerProfile } from '@/types/partner'
import { calculateAutoGems, calculateFreeDiscount } from '@/lib/offer-pricing'
import { PARTNER_OFFER_CATEGORY_OPTIONS } from '@/lib/offer-categories'

interface Props {
  offer: Offer
  partnerProfile: PartnerProfile | null
  onClose: () => void
  onUpdate: (offerId: string, offerData: {
    title: string
    description: string
    category: string
    discount_percent: number
    gem_cost: number
    is_free_item: boolean
    location_id: string
    expires_days: number
  }, imageUrl: string | null) => Promise<void>
  offerImage: string | null
  uploadingImage?: boolean
  onUploadImage: (file: File) => Promise<void>
  onClearImage: () => void
}

function normalizeLocationId(loc: unknown): string {
  if (loc === undefined || loc === null) return ''
  return String(loc).trim()
}

export default function EditOfferModal({
  offer,
  partnerProfile,
  onClose,
  onUpdate,
  offerImage,
  uploadingImage = false,
  onUploadImage,
  onClearImage,
}: Props) {
  const [formData, setFormData] = useState({
    title: offer.title,
    description: offer.description,
    category: offer.business_type && String(offer.business_type).trim() ? String(offer.business_type) : 'retail',
    discount_percent: offer.discount_percent,
    gem_cost: offer.gem_cost || offer.gems_reward,
    is_free_item: (offer as any).is_free_item || false,
    location_id: normalizeLocationId(offer.location_id),
    expires_days: 7,
  })

  /** Match offer.location_id to profile locations when types differ (number vs string). */
  const resolvedLocationId = useMemo(() => {
    const want = normalizeLocationId(offer.location_id)
    if (!want || !partnerProfile?.locations?.length) return want
    const hit = partnerProfile.locations.find((loc) => normalizeLocationId(loc.id) === want)
    return hit ? normalizeLocationId(hit.id) : want
  }, [offer.location_id, partnerProfile?.locations])

  useEffect(() => {
    if (!resolvedLocationId) return
    setFormData((f) => (f.location_id === resolvedLocationId ? f : { ...f, location_id: resolvedLocationId }))
  }, [resolvedLocationId])

  const autoGems = calculateAutoGems(formData.discount_percent, formData.is_free_item)
  const freeDiscount = calculateFreeDiscount(formData.discount_percent)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !formData.location_id) return

    setLoading(true)
    try {
      await onUpdate(String(offer.id), { ...formData, gem_cost: autoGems }, offerImage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-white/10 shadow-2xl">
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-white font-bold text-xl flex items-center gap-2">
                  <GiftIcon className="text-emerald-400" size={24} />
                  Edit Offer
                </h2>
                <p className="text-slate-400 text-sm mt-1">Update your offer details</p>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {offerImage && (
                <div className="relative">
                  <img src={offerImage} alt="Storefront" className="w-full h-36 object-cover rounded-xl" />
                  <button type="button" onClick={onClearImage} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"><X size={14} /></button>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  await onUploadImage(file)
                  e.currentTarget.value = ''
                }}
              />
              <button type="button" onClick={() => fileRef.current?.click()} className="w-full border-2 border-dashed border-emerald-500/30 rounded-xl p-4 text-emerald-300 hover:border-emerald-500/50 hover:bg-emerald-500/5 flex items-center justify-center gap-2">
                {uploadingImage ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
                {offerImage ? 'Replace Storefront Photo' : 'Upload Storefront Photo'}
              </button>
              <p className="text-xs text-slate-400 -mt-2">Required: upload a real photo of the front of the store.</p>

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

              <div>
                <label className="text-slate-400 text-sm mb-1.5 block">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  {PARTNER_OFFER_CATEGORY_OPTIONS.map((o) => (
                    <option key={o.slug} value={o.slug}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.is_free_item}
                      onChange={(e) => setFormData({ ...formData, is_free_item: e.target.checked, discount_percent: e.target.checked ? 100 : formData.discount_percent })}
                      className="w-4 h-4 rounded border-white/20 bg-slate-700 text-emerald-500 focus:ring-emerald-500/30" />
                    <span className="text-slate-300 text-sm flex items-center gap-1"><GiftIcon size={14} className="text-emerald-400" /> Free Item</span>
                  </label>
                </div>
                {!formData.is_free_item && (
                  <div>
                    <label className="text-slate-400 text-sm mb-1.5 block">Discount % (Premium Users)</label>
                    <input
                      type="number" min="1" max="100"
                      value={formData.discount_percent}
                      onChange={(e) => setFormData({ ...formData, discount_percent: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white"
                    />
                    <p className="text-slate-500 text-xs mt-1">Free users will see {freeDiscount}% discount</p>
                  </div>
                )}
                <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-slate-300 text-sm flex items-center gap-2">
                    <Gem size={16} className="text-cyan-400" /> Redeem Cost
                  </span>
                  <span className="text-cyan-400 font-bold text-lg">{autoGems} gems</span>
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
                      <option key={String(loc.id)} value={String(loc.id)}>
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
                  disabled={loading || !formData.title || !formData.location_id || !offerImage || uploadingImage}
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
