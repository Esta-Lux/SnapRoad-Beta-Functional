import { useState, useEffect } from 'react'
import { 
  X, ChevronLeft, Gift, Gem, Fuel, Coffee, Car, ShoppingCart, 
  MapPin, Clock, Check, Sparkles, Zap, Star, Lock
} from 'lucide-react'

interface Offer {
  id: number
  business_name: string
  business_type: string
  description: string
  discount_percent: number
  gems_reward: number
  lat: number
  lng: number
  expires_at: string
  is_admin_offer: boolean
  is_premium_offer: boolean
  redeemed: boolean
}

interface OffersModalProps {
  isOpen: boolean
  onClose: () => void
  userPlan: 'basic' | 'premium' | null
  onRedeem: (offerId: number) => Promise<any>
  selectedOfferId?: number | null
}

const API_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || ''

const BUSINESS_ICONS: Record<string, any> = {
  gas: Fuel,
  cafe: Coffee,
  carwash: Car,
  restaurant: ShoppingCart,
  default: Gift,
}

export default function OffersModal({ isOpen, onClose, userPlan, onRedeem, selectedOfferId }: OffersModalProps) {
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null)
  const [redeeming, setRedeeming] = useState(false)
  const [discountInfo, setDiscountInfo] = useState({ free_discount: 6, premium_discount: 18 })

  useEffect(() => {
    if (isOpen) {
      loadOffers()
    }
  }, [isOpen])

  // Auto-select offer when selectedOfferId changes
  useEffect(() => {
    if (selectedOfferId && offers.length > 0) {
      const offer = offers.find(o => o.id === selectedOfferId)
      if (offer && !offer.redeemed) {
        setSelectedOffer(offer)
      }
    }
  }, [selectedOfferId, offers])

  const loadOffers = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/offers`)
      const data = await res.json()
      if (data.success) {
        setOffers(data.data)
        if (data.discount_info) {
          setDiscountInfo(data.discount_info)
        }
      }
    } catch (e) {
      console.log('Error loading offers')
    } finally {
      setLoading(false)
    }
  }

  const handleRedeem = async () => {
    if (!selectedOffer || selectedOffer.redeemed) return
    
    setRedeeming(true)
    try {
      const result = await onRedeem(selectedOffer.id)
      if (result?.success) {
        // Update local state
        setOffers(prev => prev.map(o => 
          o.id === selectedOffer.id ? { ...o, redeemed: true } : o
        ))
        setSelectedOffer(null)
      }
    } catch (e) {
      console.log('Error redeeming')
    } finally {
      setRedeeming(false)
    }
  }

  const getTimeRemaining = (expiresAt: string) => {
    const expires = new Date(expiresAt)
    const now = new Date()
    const diffMs = expires.getTime() - now.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    
    if (diffHours < 0) return 'Expired'
    if (diffHours < 24) return `${diffHours}h left`
    return `${Math.floor(diffHours / 24)}d left`
  }

  const isPremium = userPlan === 'premium'

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-4 flex items-center gap-3">
        <button onClick={onClose} className="text-white" data-testid="offers-close">
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1">
          <h1 className="text-white font-bold text-lg">Local Offers</h1>
          <p className="text-emerald-100 text-xs">
            {isPremium ? `Premium: ${discountInfo.premium_discount}% off` : `Basic: ${discountInfo.free_discount}% off`}
          </p>
        </div>
        {!isPremium && (
          <div className="bg-amber-500 text-amber-900 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
            <Zap size={12} />
            Upgrade for {discountInfo.premium_discount}%
          </div>
        )}
      </div>

      {/* Discount Info Banner */}
      <div className="bg-emerald-500/10 px-4 py-3 border-b border-emerald-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${
              isPremium 
                ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-amber-900' 
                : 'bg-slate-700 text-slate-300'
            }`}>
              {isPremium ? (
                <span className="flex items-center gap-1">
                  <Zap size={14} /> {discountInfo.premium_discount}% Premium
                </span>
              ) : (
                <span>{discountInfo.free_discount}% Basic</span>
              )}
            </div>
          </div>
          <p className="text-emerald-400 text-xs">
            {offers.filter(o => !o.redeemed).length} offers available
          </p>
        </div>
      </div>

      {/* Offers List */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full" />
          </div>
        ) : offers.length === 0 ? (
          <div className="text-center py-12">
            <Gift className="text-slate-600 mx-auto mb-3" size={48} />
            <h3 className="text-slate-400 font-medium mb-1">No offers yet</h3>
            <p className="text-slate-500 text-sm">Check back soon for local deals!</p>
          </div>
        ) : (
          offers.map(offer => {
            const Icon = BUSINESS_ICONS[offer.business_type] || BUSINESS_ICONS.default
            
            return (
              <button
                key={offer.id}
                onClick={() => !offer.redeemed && setSelectedOffer(offer)}
                disabled={offer.redeemed}
                className={`w-full text-left rounded-2xl p-4 transition-all border ${
                  offer.redeemed 
                    ? 'bg-slate-800/50 border-slate-700 opacity-60' 
                    : 'bg-gradient-to-r from-slate-800 to-slate-800/80 border-emerald-500/30 hover:border-emerald-500/50'
                }`}
                data-testid={`offer-${offer.id}`}
              >
                <div className="flex items-start gap-3">
                  {/* Icon with glow effect */}
                  <div className={`relative p-3 rounded-xl ${
                    offer.redeemed ? 'bg-slate-700' : 'bg-emerald-500/20'
                  }`}>
                    <Icon size={24} className={offer.redeemed ? 'text-slate-500' : 'text-emerald-400'} />
                    {!offer.redeemed && (
                      <div className="absolute inset-0 bg-emerald-400/20 rounded-xl animate-pulse" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-semibold truncate">{offer.business_name}</h3>
                      {offer.is_premium_offer && !isPremium && (
                        <span className="text-amber-400 text-xs flex items-center gap-0.5">
                          <Lock size={10} />
                          +{discountInfo.premium_discount - discountInfo.free_discount}%
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400 text-sm truncate">{offer.description}</p>
                    
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`font-bold ${offer.redeemed ? 'text-slate-500' : 'text-emerald-400'}`}>
                        {offer.discount_percent}% OFF
                      </span>
                      <span className="text-slate-500 text-xs flex items-center gap-1">
                        <Gem size={12} className="text-cyan-400" />
                        +{offer.gems_reward}
                      </span>
                      <span className="text-slate-500 text-xs flex items-center gap-1">
                        <Clock size={12} />
                        {getTimeRemaining(offer.expires_at)}
                      </span>
                    </div>
                  </div>

                  {offer.redeemed ? (
                    <div className="bg-emerald-500/20 text-emerald-400 p-2 rounded-full">
                      <Check size={16} />
                    </div>
                  ) : (
                    <div className="bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-full text-xs font-medium">
                      Redeem
                    </div>
                  )}
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* Offer Detail Modal */}
      {selectedOffer && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6">
          <div className="bg-slate-800 rounded-2xl w-full max-w-sm overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-center relative">
              <button 
                onClick={() => setSelectedOffer(null)} 
                className="absolute top-4 right-4 text-white/60 hover:text-white"
              >
                <X size={20} />
              </button>
              
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                {(() => {
                  const Icon = BUSINESS_ICONS[selectedOffer.business_type] || BUSINESS_ICONS.default
                  return <Icon size={32} className="text-white" />
                })()}
              </div>
              
              <h2 className="text-white font-bold text-xl">{selectedOffer.business_name}</h2>
              <p className="text-emerald-100 text-sm">{selectedOffer.description}</p>
            </div>

            {/* Discount Display */}
            <div className="p-6 space-y-4">
              {/* Gems Reward */}
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Gem className="text-cyan-400" size={24} />
                  <span className="text-cyan-400 text-2xl font-bold">+{selectedOffer.gems_reward}</span>
                </div>
                <p className="text-cyan-300/70 text-xs">Gems reward</p>
              </div>

              {/* Discount Tiers */}
              <div className="grid grid-cols-2 gap-3">
                <div className={`rounded-xl p-4 text-center border ${
                  !isPremium 
                    ? 'bg-emerald-500/20 border-emerald-500/50' 
                    : 'bg-slate-700/50 border-slate-600'
                }`}>
                  <p className="text-slate-400 text-xs mb-1">Free</p>
                  <p className={`text-2xl font-bold ${!isPremium ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {discountInfo.free_discount}%
                  </p>
                </div>
                
                <div className={`rounded-xl p-4 text-center border ${
                  isPremium 
                    ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/50' 
                    : 'bg-slate-700/50 border-slate-600'
                }`}>
                  <p className="text-slate-400 text-xs mb-1 flex items-center justify-center gap-1">
                    <Zap size={10} className="text-amber-400" /> Premium
                  </p>
                  <p className={`text-2xl font-bold ${isPremium ? 'text-amber-400' : 'text-slate-500'}`}>
                    {discountInfo.premium_discount}%
                  </p>
                </div>
              </div>

              {/* Your Discount */}
              <div className="bg-slate-700/50 rounded-xl p-4 text-center">
                <p className="text-slate-400 text-sm mb-1">Your discount</p>
                <p className="text-3xl font-bold text-white">{selectedOffer.discount_percent}% OFF</p>
              </div>

              {/* Redeem Button */}
              <button
                onClick={handleRedeem}
                disabled={redeeming || selectedOffer.redeemed}
                className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 ${
                  selectedOffer.redeemed
                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-400 hover:to-teal-400'
                }`}
                data-testid="redeem-offer-btn"
              >
                {redeeming ? (
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                ) : selectedOffer.redeemed ? (
                  <>
                    <Check size={20} />
                    Already Redeemed
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    Redeem Offer
                  </>
                )}
              </button>

              {!isPremium && !selectedOffer.is_admin_offer && (
                <p className="text-center text-amber-400 text-xs">
                  Upgrade to Premium for {discountInfo.premium_discount - discountInfo.free_discount}% more off!
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Glowing Gem Marker Component for Map
export function OfferMarker({ 
  offer, 
  onClick 
}: { 
  offer: { id: number; lat: number; lng: number; business_name: string; discount_percent: number }
  onClick: () => void 
}) {
  return (
    <button
      onClick={onClick}
      className="absolute z-10 group animate-pulse"
      data-testid={`offer-marker-${offer.id}`}
    >
      <div className="relative">
        {/* Glow effect */}
        <div className="absolute -inset-2 bg-emerald-400/30 rounded-full blur-md animate-pulse" />
        
        {/* Gem icon */}
        <div className="relative w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/50">
          <Gem size={16} className="text-white" />
        </div>
        
        {/* Discount badge */}
        <div className="absolute -top-1 -right-1 bg-amber-500 text-amber-900 text-[8px] font-bold px-1 py-0.5 rounded-full">
          {offer.discount_percent}%
        </div>
      </div>
      
      {/* Hover tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg">
          {offer.business_name}
        </div>
      </div>
    </button>
  )
}
