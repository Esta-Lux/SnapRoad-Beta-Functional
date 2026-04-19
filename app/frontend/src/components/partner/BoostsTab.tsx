import { useState, useEffect } from 'react'
import { Rocket, Zap, Eye, Gift, Clock, Loader2 } from 'lucide-react'
import type { Offer } from '@/types/partner'
import { partnerApi } from '@/services/partnerApi'

interface BoostPricing {
  name: string
  price: number
  duration_hours: number
  multiplier: number
  description: string
}

interface Props {
  offers: Offer[]
  onBoost: (offer: Offer) => void
}

export default function BoostsTab({ offers, onBoost }: Props) {
  const [pricing, setPricing] = useState<Record<string, BoostPricing>>({})
  const [loadingPricing, setLoadingPricing] = useState(true)

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const res = await partnerApi.getBoostPricing()
        const pricingData = res.data?.packages || res.data
        if (pricingData) setPricing(pricingData)
      } catch (e) { console.error(e) }
      setLoadingPricing(false)
    }
    fetchPricing()
  }, [])

  const boostedOffers = offers.filter(o => o.is_boosted)
  const unboostedOffers = offers.filter(o => !o.is_boosted)
  const pricingList = Object.values(pricing)
  const colorMap = ['text-blue-400', 'text-orange-400', 'text-purple-400']

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-2xl border border-orange-500/20 p-5 text-center sm:p-8">
        <Rocket className="text-orange-400 mx-auto mb-4" size={40} />
        <h2 className="text-white font-bold text-xl mb-2 sm:text-2xl">Supercharge Your Offers</h2>
        <p className="text-slate-400 mb-6 max-w-md mx-auto text-sm sm:text-base">Boost your offers to reach more drivers and get more redemptions.</p>
        {loadingPricing ? (
          <Loader2 className="animate-spin text-slate-400 mx-auto" size={20} />
        ) : (
          <div className="flex flex-col items-stretch justify-center gap-4 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-6 lg:gap-8">
            {pricingList.map((p, i) => (
              <div key={p.name} className="text-center rounded-xl bg-white/[0.04] px-4 py-3 sm:bg-transparent sm:py-0">
                <p className={`font-bold text-lg sm:text-xl ${colorMap[i] || 'text-white'}`}>{p.price.toFixed(0)} cr</p>
                <p className="text-slate-500 text-xs sm:text-sm">{p.name} ({p.duration_hours}h)</p>
              </div>
            ))}
          </div>
        )}
        <p className="text-slate-500 text-xs mt-4">1 credit equals $1. Load credits once, then spend them directly on boosts.</p>
      </div>

      <div>
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Zap size={18} className="text-yellow-400" /> Active Boosts
        </h3>
        {boostedOffers.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {boostedOffers.map(offer => (
              <div key={offer.id} className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-xl border border-yellow-500/20 p-4 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-white font-medium min-w-0 flex-1 break-words">{offer.title}</p>
                  <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full font-medium">
                    {offer.boost_multiplier}x
                  </span>
                </div>
                <p className="text-slate-400 text-xs mb-2">{offer.description}</p>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock size={12} />
                  <span>Expires: {offer.boost_expires ? new Date(offer.boost_expires).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-800/50 rounded-xl p-6 text-center">
            <p className="text-slate-400">No active boosts. Boost an offer below!</p>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-white font-semibold mb-4">Boost an Offer</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {unboostedOffers.map(offer => (
            <div key={offer.id} className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-white/5 p-5">
              <h3 className="text-white font-medium mb-2">{offer.title}</h3>
              <p className="text-slate-500 text-sm mb-4 line-clamp-2">{offer.description}</p>
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                <Eye size={12} /> {offer.views || 0} views
                <span className="mx-1">·</span>
                <Gift size={12} /> {offer.redemption_count || 0} redemptions
              </div>
              <button onClick={() => onBoost(offer)} className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium py-2.5 rounded-xl hover:from-orange-400 hover:to-red-400 flex items-center justify-center gap-2">
                <Rocket size={16} />Boost Now
              </button>
            </div>
          ))}
        </div>
        {unboostedOffers.length === 0 && (
          <div className="bg-slate-800/50 rounded-xl p-6 text-center">
            <p className="text-slate-400">All your offers are already boosted!</p>
          </div>
        )}
      </div>
    </div>
  )
}
