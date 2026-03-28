import { useState, useEffect } from 'react'
import { 
  X, ChevronLeft, Gift, Gem, Fuel, Coffee, Car, ShoppingCart, 
  MapPin, Clock, Check, Sparkles, Zap, Star, Lock, ExternalLink
} from 'lucide-react'

interface Offer {
  id: number
  business_name: string
  business_type: string
  description: string
  discount_percent: number
  premium_discount_percent: number
  free_discount_percent: number
  is_free_item?: boolean
  gems_reward: number
  address?: string
  lat: number
  lng: number
  offer_url?: string | null
  expires_at: string
  is_admin_offer: boolean
  is_premium_offer: boolean
  redeemed: boolean
  offer_source?: string
  original_price?: number | null
  affiliate_tracking_url?: string | null
  external_id?: string | null
  yelp_rating?: number | null
  yelp_review_count?: number | null
  yelp_image_url?: string | null
}

interface OffersModalProps {
  isOpen: boolean
  onClose: () => void
  userPlan: 'basic' | 'premium' | 'family' | null
  onRedeem: (offerId: number) => Promise<any>
  selectedOfferId?: number | null
  onOpenUrl?: (url: string, title: string) => void
  /** Same flow as DrivingScore / other premium gates: open plan selection in parent */
  onUpgradeToPlans?: () => void
}

const API_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || ''

const BUSINESS_ICONS: Record<string, any> = {
  gas: Fuel,
  cafe: Coffee,
  carwash: Car,
  restaurant: ShoppingCart,
  default: Gift,
}

export default function OffersModal({
  isOpen,
  onClose,
  userPlan,
  onRedeem,
  selectedOfferId,
  onOpenUrl,
  onUpgradeToPlans,
}: OffersModalProps) {
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
    <div className="fixed inset-0 bg-[#f5f5f7] z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-4 flex items-center gap-3 shadow-sm">
        <button onClick={onClose} className="text-white" data-testid="offers-close">
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1">
          <h1 className="text-white font-bold text-lg">Local Offers</h1>
          <p className="text-white/90 text-xs">
            {isPremium ? `Premium: ${discountInfo.premium_discount}% off` : `Basic: ${discountInfo.free_discount}% off`}
          </p>
        </div>
        {!isPremium && (
          <button
            type="button"
            onClick={() => {
              onClose()
              onUpgradeToPlans?.()
            }}
            className="bg-amber-400 text-amber-900 text-xs font-bold px-2.5 py-1.5 rounded-full flex items-center gap-1 shadow-sm active:scale-[0.98]"
            data-testid="offers-header-upgrade"
          >
            <Zap size={12} />
            Upgrade for {discountInfo.premium_discount}%
          </button>
        )}
      </div>

      {/* Discount Info Banner */}
      <div className="bg-white px-4 py-3 border-b border-slate-200 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${
              isPremium 
                ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-amber-900' 
                : 'bg-slate-200 text-slate-700'
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
          <p className="text-emerald-600 text-xs font-medium">
            {offers.filter(o => !o.redeemed).length} offers available
          </p>
        </div>
      </div>

      {/* Offers List */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
          </div>
        ) : offers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
            <Gift className="text-slate-300 mx-auto mb-3" size={48} />
            <h3 className="text-slate-600 font-medium mb-1">No offers yet</h3>
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
                className={`w-full text-left rounded-2xl p-4 transition-all border shadow-sm ${
                  offer.redeemed 
                    ? 'bg-white border-slate-200 opacity-70' 
                    : 'bg-white border-slate-200 hover:border-emerald-400 hover:shadow-md'
                }`}
                data-testid={`offer-${offer.id}`}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`relative p-3 rounded-xl ${
                    offer.redeemed ? 'bg-slate-100' : 'bg-emerald-50'
                  }`}>
                    <Icon size={24} className={offer.redeemed ? 'text-slate-400' : 'text-emerald-600'} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-slate-900 font-semibold truncate">{offer.business_name}</h3>
                      {offer.offer_source === 'groupon' && (
                        <span className="text-orange-400 bg-orange-500/10 text-[10px] px-1.5 py-0.5 rounded-full font-medium">Groupon</span>
                      )}
                      {offer.offer_source === 'affiliate' && (
                        <span className="text-purple-400 bg-purple-500/10 text-[10px] px-1.5 py-0.5 rounded-full font-medium">Partner</span>
                      )}
                      {offer.is_free_item && (
                        <span className="text-emerald-400 bg-emerald-500/10 text-[10px] px-1.5 py-0.5 rounded-full">Free</span>
                      )}
                    </div>
                    <p className="text-slate-500 text-sm truncate">{offer.description}</p>
                    
                    {offer.yelp_rating != null && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} size={10} className={i < Math.round(offer.yelp_rating!) ? 'text-amber-400 fill-amber-400' : 'text-slate-300'} />
                          ))}
                        </div>
                        <span className="text-slate-500 text-[10px]">{offer.yelp_rating}</span>
                        {offer.yelp_review_count != null && (
                          <span className="text-slate-400 text-[10px]">({offer.yelp_review_count} reviews)</span>
                        )}
                      </div>
                    )}

                    {offer.address && (
                      <p className="text-slate-500 text-xs truncate flex items-center gap-1 mt-0.5">
                        <MapPin size={10} /> {offer.address}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {offer.original_price != null && offer.original_price > 0 && (
                        <span className="text-slate-400 text-xs line-through">${offer.original_price.toFixed(2)}</span>
                      )}
                      <span className={`font-bold ${offer.redeemed ? 'text-slate-400' : 'text-emerald-600'}`}>
                        {isPremium ? (offer.premium_discount_percent || offer.discount_percent) : (offer.free_discount_percent || offer.discount_percent)}% OFF
                      </span>
                      {!isPremium && (offer.premium_discount_percent || 0) > (offer.free_discount_percent || 0) && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation()
                            onClose()
                            onUpgradeToPlans?.()
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              e.stopPropagation()
                              onClose()
                              onUpgradeToPlans?.()
                            }
                          }}
                          className="text-amber-600 text-xs flex items-center gap-0.5 bg-amber-100 px-1.5 py-0.5 rounded-full cursor-pointer hover:bg-amber-200"
                          data-testid="offers-row-premium-lock"
                        >
                          <Lock size={10} />
                          {offer.premium_discount_percent}%
                        </span>
                      )}
                      <span className="text-slate-600 text-xs flex items-center gap-1">
                        <Gem size={12} className="text-cyan-500" />
                        +{offer.gems_reward}
                      </span>
                      <span className="text-slate-500 text-xs flex items-center gap-1">
                        <Clock size={12} />
                        {getTimeRemaining(offer.expires_at)}
                      </span>
                    </div>
                  </div>

                  {offer.redeemed ? (
                    <div className="bg-emerald-100 text-emerald-600 p-2 rounded-full">
                      <Check size={16} />
                    </div>
                  ) : offer.offer_source === 'groupon' || offer.offer_source === 'affiliate' ? (
                    <div className="bg-blue-100 text-blue-600 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1">
                      <ExternalLink size={12} /> View
                    </div>
                  ) : (
                    <div className="bg-emerald-500 text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-sm">
                      Redeem
                    </div>
                  )}
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* Offer Detail Modal - Compact Version */}
      {selectedOffer && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelectedOffer(null)}>
          <div className="bg-slate-800 rounded-xl w-full max-w-xs overflow-hidden shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            {/* Compact Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                {(() => {
                  const Icon = BUSINESS_ICONS[selectedOffer.business_type] || BUSINESS_ICONS.default
                  return <Icon size={20} className="text-white" />
                })()}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-white font-bold text-sm truncate">{selectedOffer.business_name}</h2>
                <p className="text-emerald-100 text-xs truncate">{selectedOffer.description}</p>
              </div>
              <button onClick={() => setSelectedOffer(null)} className="text-white/60 hover:text-white p-1">
                <X size={18} />
              </button>
            </div>

            {/* Compact Body */}
            <div className="p-4 space-y-3 bg-slate-50">
              {selectedOffer.yelp_rating != null && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={12} className={i < Math.round(selectedOffer.yelp_rating!) ? 'text-amber-400 fill-amber-400' : 'text-slate-300'} />
                    ))}
                  </div>
                  <span className="text-slate-700 text-xs font-medium">{selectedOffer.yelp_rating}</span>
                  {selectedOffer.yelp_review_count != null && (
                    <span className="text-slate-500 text-xs">({selectedOffer.yelp_review_count} reviews)</span>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <div className="flex-1 bg-cyan-50 border border-cyan-200 rounded-xl p-2 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Gem className="text-cyan-600" size={16} />
                    <span className="text-cyan-700 text-lg font-bold">+{selectedOffer.gems_reward}</span>
                  </div>
                  <p className="text-cyan-600/80 text-[10px]">Gems</p>
                </div>
                <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded-xl p-2 text-center">
                  {selectedOffer.original_price != null && selectedOffer.original_price > 0 && (
                    <p className="text-slate-500 text-[10px] line-through">${selectedOffer.original_price.toFixed(2)}</p>
                  )}
                  <p className="text-emerald-700 text-lg font-bold">
                    {isPremium
                      ? (selectedOffer.premium_discount_percent || selectedOffer.discount_percent)
                      : (selectedOffer.free_discount_percent || selectedOffer.discount_percent)}%
                  </p>
                  <p className="text-emerald-600/80 text-[10px]">Your Discount</p>
                </div>
              </div>

              {!isPremium && (selectedOffer.premium_discount_percent || 0) > (selectedOffer.free_discount_percent || 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOffer(null)
                    onClose()
                    onUpgradeToPlans?.()
                  }}
                  className="w-full bg-amber-50 border border-amber-200 rounded-xl p-2.5 flex items-center gap-2 text-left hover:bg-amber-100 transition-colors"
                  data-testid="offers-detail-upgrade"
                >
                  <Lock className="text-amber-600 shrink-0" size={14} />
                  <p className="text-amber-800 text-xs flex-1">
                    Upgrade to Premium for <span className="font-bold">{selectedOffer.premium_discount_percent}% off</span>
                  </p>
                  <Zap className="text-amber-600 shrink-0" size={14} />
                </button>
              )}

              {selectedOffer.address && (
                <div className="flex items-center gap-2 text-slate-500 text-xs">
                  <MapPin size={12} className="text-emerald-500 shrink-0" />
                  <span className="truncate">{selectedOffer.address}</span>
                </div>
              )}

              {/* Tier 2 (affiliate/groupon): Link-out button */}
              {(selectedOffer.offer_source === 'groupon' || selectedOffer.offer_source === 'affiliate') ? (
                <button
                  onClick={() => {
                    const url = selectedOffer.affiliate_tracking_url || selectedOffer.offer_url
                    if (url) onOpenUrl?.(url, selectedOffer.business_name)
                  }}
                  className="w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 text-sm bg-gradient-to-r from-blue-500 to-indigo-500 text-white active:scale-[0.98]"
                  data-testid="view-deal-btn"
                >
                  <ExternalLink size={16} />
                  View Deal{selectedOffer.offer_source === 'groupon' ? ' on Groupon' : ''}
                </button>
              ) : (
                <>
                  {/* Tier 1 (direct): View Deal link if has URL */}
                  {selectedOffer.offer_url && (
                    <button
                      onClick={() => onOpenUrl?.(selectedOffer.offer_url!, selectedOffer.business_name)}
                      className="w-full py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 text-sm bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 transition"
                      data-testid="view-deal-link-btn"
                    >
                      <Star size={14} />
                      View Deal
                    </button>
                  )}

                  {/* Tier 1 (direct): Redeem Button with QR */}
                  <button
                    onClick={handleRedeem}
                    disabled={redeeming || selectedOffer.redeemed}
                    className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 text-sm ${
                      selectedOffer.redeemed
                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white active:scale-[0.98]'
                    }`}
                    data-testid="redeem-offer-btn"
                  >
                    {redeeming ? (
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : selectedOffer.redeemed ? (
                      <>
                        <Check size={16} />
                        Redeemed
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        Redeem Offer
                      </>
                    )}
                  </button>
                </>
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
