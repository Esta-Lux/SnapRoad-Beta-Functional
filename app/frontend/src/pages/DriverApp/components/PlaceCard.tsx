/**
 * Compact place card: image (Google Places photo), name, address, rating, actions.
 * Used for search results and map-click nearby places.
 */

import { MapPin, Navigation, ChevronRight, Star } from 'lucide-react'
import { getApiBaseUrl } from '@/services/api'

export interface PlaceCardData {
  place_id?: string
  name: string
  address?: string
  lat?: number
  lng?: number
  photo_reference?: string | null
  rating?: number | null
}

interface PlaceCardProps {
  place: PlaceCardData
  onDirections?: (place: PlaceCardData) => void
  onViewDetails?: (place: PlaceCardData) => void
  onClose?: () => void
  compact?: boolean
  /** When set, the whole card is clickable (e.g. for search result list). */
  onClick?: () => void
}

export default function PlaceCard({
  place,
  onDirections,
  onViewDetails,
  compact = false,
  onClick,
}: PlaceCardProps) {
  const photoUrl = place.photo_reference
    ? `${getApiBaseUrl()}/api/places/photo?ref=${encodeURIComponent(place.photo_reference)}&maxwidth=320`
    : null

  return (
    <div
      className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-slate-200/80 overflow-hidden hover:shadow-[0_8px_28px_rgba(0,0,0,0.1)] transition-shadow"
      onClick={e => {
        e.stopPropagation()
        onClick?.()
      }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } } : undefined}
    >
      {/* Image or placeholder */}
      <div className="relative aspect-[2/1] bg-slate-100">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
            <MapPin className="text-slate-400" size={40} />
          </div>
        )}
        {place.rating != null && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/60 text-white text-xs font-medium">
            <Star size={12} className="fill-amber-400 text-amber-400" />
            {place.rating.toFixed(1)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="text-slate-900 font-semibold text-sm line-clamp-1">{place.name}</h3>
        {place.address && (
          <p className="text-slate-500 text-xs mt-0.5 line-clamp-2 flex items-start gap-1">
            <MapPin size={12} className="shrink-0 mt-0.5" />
            {place.address}
          </p>
        )}

        {!compact && (onDirections || onViewDetails) && (
          <div className="flex gap-2 mt-3">
            {onDirections && Number.isFinite(place.lat) && Number.isFinite(place.lng) && (
              <button
                onClick={() => onDirections(place)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-500 text-white text-xs font-medium rounded-xl active:bg-blue-600"
              >
                <Navigation size={14} />
                Directions
              </button>
            )}
            {onViewDetails && place.place_id && (
              <button
                onClick={() => onViewDetails(place)}
                className="flex items-center justify-center gap-1 px-4 py-2.5 bg-slate-100 text-slate-700 text-xs font-medium rounded-xl active:bg-slate-200"
              >
                Details
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
