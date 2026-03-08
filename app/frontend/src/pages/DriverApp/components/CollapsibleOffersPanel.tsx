import { useState, useEffect } from 'react'
import { 
  ChevronUp, ChevronDown, Gift, Gem, MapPin, Navigation, 
  Clock, Star, X, ExternalLink
} from 'lucide-react'

const API_URL = import.meta.env.VITE_BACKEND_URL || ''

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
  distance_km?: number
  redeemed?: boolean
  offer_source?: string
  original_price?: number | null
  yelp_rating?: number | null
  yelp_review_count?: number | null
}

interface CollapsibleOffersPanelProps {
  offers: Offer[]
  userLocation: { lat: number; lng: number }
  onOfferSelect: (offer: Offer) => void
  onNavigateToOffer: (offer: Offer) => void
  isPremium: boolean
}

export default function CollapsibleOffersPanel({ 
  offers, 
  userLocation, 
  onOfferSelect, 
  onNavigateToOffer,
  isPremium 
}: CollapsibleOffersPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [activeFilter, setActiveFilter] = useState<string>('all')

  // Filter non-redeemed offers and sort by distance
  const availableOffers = offers
    .filter(o => !o.redeemed)
    .map(offer => ({
      ...offer,
      distance_km: offer.distance_km || calculateDistance(userLocation, { lat: offer.lat, lng: offer.lng })
    }))
    .sort((a, b) => (a.distance_km || 999) - (b.distance_km || 999))

  const filteredOffers = activeFilter === 'all' 
    ? availableOffers 
    : availableOffers.filter(o => o.business_type === activeFilter)

  // Get unique business types for filter
  const businessTypes = [...new Set(availableOffers.map(o => o.business_type))]

  // Simple distance calculation
  function calculateDistance(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
    const dlat = Math.abs(from.lat - to.lat)
    const dlng = Math.abs(from.lng - to.lng)
    return Math.sqrt(dlat * dlat + dlng * dlng) * 111 // Rough km conversion
  }

  const getBusinessIcon = (type: string) => {
    const icons: Record<string, string> = {
      gas: '⛽',
      cafe: '☕',
      restaurant: '🍽️',
      carwash: '🚗',
      shopping: '🛒',
      default: '🎁'
    }
    return icons[type] || icons.default
  }

  const formatExpiry = (expiresAt: string) => {
    const expires = new Date(expiresAt)
    const now = new Date()
    const hours = Math.floor((expires.getTime() - now.getTime()) / (1000 * 60 * 60))
    
    if (hours < 24) return `${hours}h left`
    const days = Math.floor(hours / 24)
    return `${days}d left`
  }

  // Completely minimized state - just show a small button
  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="absolute bottom-20 left-3 right-3 bg-white/95 backdrop-blur border border-gray-200 rounded-full px-4 py-2 flex items-center justify-between shadow-[0_1px_4px_rgba(0,0,0,0.08)] z-20"
        data-testid="offers-minimized"
      >
        <div className="flex items-center gap-2">
          <Gift className="text-emerald-400" size={16} />
          <span className="text-slate-700 text-sm font-medium">{availableOffers.length} Nearby Offers</span>
        </div>
        <ChevronUp className="text-slate-400" size={16} />
      </button>
    )
  }

  return (
    <div 
      className={`absolute bottom-20 left-3 right-3 bg-white/95 backdrop-blur border border-gray-200 rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.08)] z-20 transition-all duration-300 ${
        isExpanded ? 'max-h-[40vh]' : 'max-h-48'
      }`}
      data-testid="offers-panel"
    >
      {/* Header - Always visible */}
      <div className="p-3 border-b border-gray-200/80">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2"
            data-testid="toggle-offers-expand"
          >
            <Gift className="text-emerald-400" size={18} />
            <span className="text-slate-700 font-medium">Nearby Offers</span>
            <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full">
              {availableOffers.length}
            </span>
            {isExpanded ? <ChevronDown className="text-slate-400" size={16} /> : <ChevronUp className="text-slate-400" size={16} />}
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 hover:bg-gray-100 rounded-lg"
            data-testid="minimize-offers"
          >
            <X className="text-slate-400" size={16} />
          </button>
        </div>

        {/* Premium badge */}
        {isPremium && (
          <p className="text-emerald-400 text-[10px] mt-1 flex items-center gap-1">
            <Star size={10} className="fill-emerald-400" />
            Premium: 18% off all offers
          </p>
        )}
      </div>

      {/* Filters - Show when expanded */}
      {isExpanded && businessTypes.length > 1 && (
        <div className="px-3 py-2 border-b border-gray-200/80 flex gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
              activeFilter === 'all' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-slate-600'
            }`}
          >
            All
          </button>
          {businessTypes.map(type => (
            <button
              key={type}
              onClick={() => setActiveFilter(type)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap flex items-center gap-1 ${
                activeFilter === type ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-slate-600'
              }`}
            >
              {getBusinessIcon(type)} {type}
            </button>
          ))}
        </div>
      )}

      {/* Offers list */}
      <div className={`overflow-auto ${isExpanded ? 'max-h-[45vh]' : 'max-h-32'}`}>
        {filteredOffers.length === 0 ? (
          <div className="p-4 text-center">
            <Gift className="mx-auto text-slate-600 mb-2" size={24} />
            <p className="text-slate-400 text-sm">No offers nearby</p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {filteredOffers.slice(0, isExpanded ? 10 : 3).map(offer => (
              <div 
                key={offer.id}
                className="bg-gray-50 rounded-xl p-3 flex items-center gap-3"
                data-testid={`offer-item-${offer.id}`}
              >
                {/* Business Icon */}
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">
                  {getBusinessIcon(offer.business_type)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-slate-800 font-medium text-sm truncate">{offer.business_name}</p>
                    <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-1.5 py-0.5 rounded font-medium">
                      {offer.discount_percent}% off
                    </span>
                    {offer.offer_source === 'groupon' && (
                      <span className="bg-orange-500/20 text-orange-400 text-[10px] px-1.5 py-0.5 rounded font-medium">Groupon</span>
                    )}
                    {offer.offer_source === 'affiliate' && (
                      <span className="bg-purple-500/20 text-purple-400 text-[10px] px-1.5 py-0.5 rounded font-medium">Deal</span>
                    )}
                  </div>
                  {offer.yelp_rating != null && (
                    <div className="flex items-center gap-1 mt-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={8} className={i < Math.round(offer.yelp_rating!) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'} />
                      ))}
                      <span className="text-slate-400 text-[10px]">{offer.yelp_rating}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                    <span className="flex items-center gap-0.5">
                      <MapPin size={10} />
                      {offer.distance_km?.toFixed(1)} km
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5">
                      <Clock size={10} />
                      {formatExpiry(offer.expires_at)}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5 text-emerald-400">
                      <Gem size={10} />
                      +{offer.gems_reward}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => onNavigateToOffer(offer)}
                    className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center hover:bg-blue-400 transition-colors"
                    data-testid={`navigate-offer-${offer.id}`}
                  >
                    <Navigation size={14} className="text-white" />
                  </button>
                  <button
                    onClick={() => onOfferSelect(offer)}
                    className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors"
                    data-testid={`details-offer-${offer.id}`}
                  >
                    <ExternalLink size={14} className="text-slate-500" />
                  </button>
                </div>
              </div>
            ))}

            {/* Show more indicator when collapsed */}
            {!isExpanded && filteredOffers.length > 3 && (
              <button
                onClick={() => setIsExpanded(true)}
                className="w-full py-2 text-center text-blue-400 text-xs font-medium"
              >
                + {filteredOffers.length - 3} more offers
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
