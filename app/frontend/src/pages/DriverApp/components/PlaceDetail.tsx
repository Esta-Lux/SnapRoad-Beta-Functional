/**
 * Apple Maps-style place detail bottom sheet.
 * Fetches full place details from Google Places API via our backend proxy.
 */

import { useEffect, useState, useRef } from 'react'
import {
  X, Star, MapPin, Phone, Globe, Clock,
  Navigation, Share2, Bookmark, ChevronRight, ChevronDown, ChevronUp,
  Loader2,
} from 'lucide-react'

const API_URL = import.meta.env.VITE_BACKEND_URL || ''

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Photo {
  reference: string
  width: number
  height: number
}

interface Review {
  author: string
  rating: number
  text: string
  time: string
  profile_photo: string
}

export interface PlaceData {
  place_id: string
  name: string
  address: string
  phone: string
  website: string
  maps_url: string
  lat: number | null
  lng: number | null
  rating: number | null
  total_reviews: number
  price_level: number | null
  types: string[]
  business_status: string
  open_now: boolean | null
  hours: string[]
  photos: Photo[]
  reviews: Review[]
}

interface PlaceDetailProps {
  placeId: string
  summary?: { name?: string; lat?: number; lng?: number }
  onClose: () => void
  onDirections: (place: PlaceData) => void
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function priceDollars(level: number | null): string {
  if (level == null) return ''
  return '$'.repeat(Math.max(1, Math.min(4, level)))
}

function typeLabel(types: string[]): string {
  const map: Record<string, string> = {
    restaurant: 'Restaurant', cafe: 'Cafe', bar: 'Bar',
    gas_station: 'Gas Station', grocery_or_supermarket: 'Grocery',
    shopping_mall: 'Shopping Mall', store: 'Store',
    hospital: 'Hospital', pharmacy: 'Pharmacy',
    park: 'Park', gym: 'Gym', school: 'School',
    university: 'University', church: 'Church',
    bank: 'Bank', atm: 'ATM', lodging: 'Hotel',
    movie_theater: 'Cinema', museum: 'Museum',
  }
  for (const t of types) {
    if (map[t]) return map[t]
  }
  return 'Place'
}

function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating)
  const half = rating - full >= 0.25
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={14}
          className={i < full ? 'text-amber-400 fill-amber-400' : (i === full && half) ? 'text-amber-400 fill-amber-400/50' : 'text-slate-600'}
        />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PlaceDetail({ placeId, summary, onClose, onDirections }: PlaceDetailProps) {
  const [data, setData] = useState<PlaceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showHours, setShowHours] = useState(false)
  const [showAllReviews, setShowAllReviews] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`${API_URL}/api/places/details/${placeId}`)
      .then(r => r.json())
      .then(json => {
        if (cancelled) return
        if (json.success && json.data) {
          setData(json.data)
        } else {
          setError('Could not load place details')
        }
      })
      .catch(() => {
        if (!cancelled) setError('Network error')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [placeId])

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <div className="relative w-full max-w-md bg-slate-900 rounded-t-3xl p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
          <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-6" />
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 size={32} className="text-blue-400 animate-spin" />
            <p className="text-slate-400 text-sm">Loading {summary?.name || 'place'}...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <div className="relative w-full max-w-md bg-slate-900 rounded-t-3xl p-6" onClick={e => e.stopPropagation()}>
          <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-4" />
          <p className="text-slate-400 text-center py-8">{error || 'Unknown error'}</p>
          <button onClick={onClose} className="w-full py-3 bg-slate-800 rounded-xl text-white text-sm">Close</button>
        </div>
      </div>
    )
  }

  const visibleReviews = showAllReviews ? data.reviews : data.reviews.slice(0, 2)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        ref={scrollRef}
        className="relative w-full max-w-md bg-slate-900 rounded-t-3xl overflow-y-auto animate-slide-up"
        style={{ maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="sticky top-0 z-10 bg-slate-900 pt-3 pb-2 px-4">
          <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto" />
        </div>

        {/* Close button */}
        <button onClick={onClose} className="absolute top-4 right-4 z-10 w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center">
          <X size={16} className="text-slate-400" />
        </button>

        {/* Photo carousel */}
        {data.photos.length > 0 && (
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
            {data.photos.slice(0, 6).map((ph, i) => (
              <img
                key={i}
                src={`${API_URL}/api/places/photo?ref=${ph.reference}&maxwidth=400`}
                alt=""
                className="h-36 w-auto rounded-xl object-cover flex-shrink-0 bg-slate-800"
                loading="lazy"
              />
            ))}
          </div>
        )}

        {/* Header */}
        <div className="px-4 pb-3">
          <h2 className="text-xl font-bold text-white mb-1">{data.name}</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs px-2 py-0.5 bg-slate-800 rounded-full text-slate-300">{typeLabel(data.types)}</span>
            {data.price_level != null && (
              <span className="text-xs text-emerald-400 font-medium">{priceDollars(data.price_level)}</span>
            )}
            {data.open_now !== null && (
              <span className={`text-xs font-medium ${data.open_now ? 'text-emerald-400' : 'text-red-400'}`}>
                {data.open_now ? 'Open' : 'Closed'}
              </span>
            )}
          </div>
        </div>

        {/* Rating */}
        {data.rating != null && (
          <div className="px-4 pb-3 flex items-center gap-2">
            <span className="text-white font-semibold text-lg">{data.rating.toFixed(1)}</span>
            <Stars rating={data.rating} />
            <span className="text-slate-400 text-xs">({data.total_reviews.toLocaleString()} reviews)</span>
          </div>
        )}

        {/* Action buttons */}
        <div className="px-4 pb-4 grid grid-cols-4 gap-2">
          <button
            onClick={() => onDirections(data)}
            className="flex flex-col items-center gap-1.5 py-3 bg-blue-500 rounded-xl active:bg-blue-600 transition-colors"
          >
            <Navigation size={20} className="text-white" />
            <span className="text-[11px] font-medium text-white">Directions</span>
          </button>
          {data.phone && (
            <a href={`tel:${data.phone}`} className="flex flex-col items-center gap-1.5 py-3 bg-slate-800 rounded-xl active:bg-slate-700 transition-colors">
              <Phone size={20} className="text-blue-400" />
              <span className="text-[11px] font-medium text-slate-300">Call</span>
            </a>
          )}
          <button className="flex flex-col items-center gap-1.5 py-3 bg-slate-800 rounded-xl active:bg-slate-700 transition-colors">
            <Share2 size={20} className="text-blue-400" />
            <span className="text-[11px] font-medium text-slate-300">Share</span>
          </button>
          <button className="flex flex-col items-center gap-1.5 py-3 bg-slate-800 rounded-xl active:bg-slate-700 transition-colors">
            <Bookmark size={20} className="text-blue-400" />
            <span className="text-[11px] font-medium text-slate-300">Save</span>
          </button>
        </div>

        {/* Info rows */}
        <div className="px-4 pb-3 space-y-0">
          {data.address && (
            <div className="flex items-start gap-3 py-3 border-t border-slate-800">
              <MapPin size={16} className="text-slate-500 mt-0.5 shrink-0" />
              <p className="text-sm text-slate-300 flex-1">{data.address}</p>
              <ChevronRight size={14} className="text-slate-600 mt-0.5" />
            </div>
          )}
          {data.phone && (
            <div className="flex items-center gap-3 py-3 border-t border-slate-800">
              <Phone size={16} className="text-slate-500 shrink-0" />
              <p className="text-sm text-blue-400 flex-1">{data.phone}</p>
            </div>
          )}
          {data.website && (
            <a href={data.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 py-3 border-t border-slate-800">
              <Globe size={16} className="text-slate-500 shrink-0" />
              <p className="text-sm text-blue-400 flex-1 truncate">{data.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</p>
              <ChevronRight size={14} className="text-slate-600" />
            </a>
          )}

          {/* Hours */}
          {data.hours.length > 0 && (
            <div className="border-t border-slate-800">
              <button onClick={() => setShowHours(!showHours)} className="w-full flex items-center gap-3 py-3">
                <Clock size={16} className="text-slate-500 shrink-0" />
                <span className="text-sm text-slate-300 flex-1 text-left">Hours</span>
                {showHours ? <ChevronUp size={14} className="text-slate-600" /> : <ChevronDown size={14} className="text-slate-600" />}
              </button>
              {showHours && (
                <div className="pl-9 pb-3 space-y-1">
                  {data.hours.map((h, i) => (
                    <p key={i} className="text-xs text-slate-400">{h}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Reviews */}
        {data.reviews.length > 0 && (
          <div className="px-4 pb-6">
            <h3 className="text-white font-semibold text-sm mb-3">Reviews</h3>
            <div className="space-y-3">
              {visibleReviews.map((rv, i) => (
                <div key={i} className="bg-slate-800/60 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    {rv.profile_photo ? (
                      <img src={rv.profile_photo} alt="" className="w-6 h-6 rounded-full bg-slate-700" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-slate-400">{rv.author?.[0]}</div>
                    )}
                    <span className="text-xs text-white font-medium flex-1 truncate">{rv.author}</span>
                    <span className="text-[10px] text-slate-500">{rv.time}</span>
                  </div>
                  {rv.rating != null && (
                    <div className="mb-1.5">
                      <Stars rating={rv.rating} />
                    </div>
                  )}
                  {rv.text && (
                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-4">{rv.text}</p>
                  )}
                </div>
              ))}
            </div>
            {data.reviews.length > 2 && !showAllReviews && (
              <button onClick={() => setShowAllReviews(true)} className="mt-2 text-blue-400 text-xs font-medium">
                Show all {data.reviews.length} reviews
              </button>
            )}
          </div>
        )}

        {/* Bottom safe area */}
        <div className="h-6" />
      </div>
    </div>
  )
}
