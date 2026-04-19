/**
 * Map search bar using Google Places (via backend) and backend /api/map/search fallback.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, X, MapPin, Navigation, Fuel, ParkingCircle, Coffee, ShoppingBag, Utensils, Zap } from 'lucide-react'
import { api, getApiBaseUrl } from '@/services/api'

/** POI categories for quick-search pills (no MapKit dependency). */
type POICategory = 'gasStation' | 'parking' | 'restaurant' | 'cafe' | 'evCharger' | 'grocery'

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms))
  ])
}

interface SearchResult {
  id: number | string
  name: string
  address: string
  lat: number
  lng: number
  type?: string
  place_id?: string
}

interface MapSearchBarProps {
  onSelect: (result: SearchResult) => void
  onNavigate?: (result: SearchResult) => void
  userLocation?: { lat: number; lng: number }
}

/** Google Places autocomplete via backend; returns predictions (place_id, name, address). */
async function placesAutocomplete(q: string, loc?: { lat: number; lng: number }): Promise<SearchResult[]> {
  const params = new URLSearchParams({ q })
  if (loc) {
    params.set('lat', String(loc.lat))
    params.set('lng', String(loc.lng))
  }
  const res = await api.get<{ success?: boolean; data?: Array<{ place_id?: string; name?: string; address?: string; description?: string }> }>(`/api/places/autocomplete?${params}`)
  const data = res.data as { success?: boolean; data?: Array<{ place_id?: string; name?: string; address?: string; description?: string }> } | undefined
  if (!data?.success || !Array.isArray(data.data)) return []
  return (data.data as Array<{ place_id?: string; name?: string; address?: string; description?: string }>).map((p, i) => ({
    id: p.place_id ?? `ac-${i}`,
    name: p.name ?? p.description ?? '',
    address: p.address ?? '',
    lat: 0,
    lng: 0,
    place_id: p.place_id,
  }))
}

/** Resolve place_id to lat/lng via backend details. */
async function placeDetails(place_id: string): Promise<{ lat: number; lng: number; name?: string; address?: string } | null> {
  const res = await api.get<{ success?: boolean; data?: { lat?: number; lng?: number; name?: string; address?: string } }>(`/api/places/details/${encodeURIComponent(place_id)}`)
  const data = res.data as { success?: boolean; data?: { lat?: number; lng?: number; name?: string; address?: string } } | undefined
  if (!data?.success || !data.data?.lat || !data.data?.lng) return null
  return { lat: data.data.lat, lng: data.data.lng, name: data.data.name, address: data.data.address }
}

const POI_PILLS: { key: POICategory; label: string; icon: typeof Fuel }[] = [
  { key: 'gasStation', label: 'Gas', icon: Fuel },
  { key: 'parking', label: 'Parking', icon: ParkingCircle },
  { key: 'restaurant', label: 'Food', icon: Utensils },
  { key: 'cafe', label: 'Coffee', icon: Coffee },
  { key: 'evCharger', label: 'EV', icon: Zap },
  { key: 'grocery', label: 'Grocery', icon: ShoppingBag },
]

export default function MapSearchBar({ onSelect, onNavigate, userLocation }: MapSearchBarProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [activePOI, setActivePOI] = useState<POICategory | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchGenRef = useRef(0)

  const search = useCallback(async (q: string, gen: number) => {
    if (q.length < 2) { setResults([]); return }
    setLoading(true)

    try {
      const res = await withTimeout(placesAutocomplete(q, userLocation), 5000)
      if (searchGenRef.current !== gen) return
      if (res.length > 0) { setResults(res); setLoading(false); return }
    } catch { /* fall through */ }

    if (searchGenRef.current !== gen) return

    try {
      const fallback = await fetch(`${getApiBaseUrl()}/api/map/search?q=${encodeURIComponent(q)}`, { credentials: 'include' })
      if (searchGenRef.current !== gen) return
      if (fallback.ok) {
        const data = await fallback.json()
        const list = Array.isArray(data.data) ? data.data : data.results ?? []
        setResults(list.map((r: SearchResult, i: number) => ({ ...r, id: r.id ?? `sb-${i}` })))
      }
    } catch { /* exhausted */ }

    if (searchGenRef.current === gen) setLoading(false)
  }, [userLocation])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.length >= 2) {
      const gen = ++searchGenRef.current
      debounceRef.current = setTimeout(() => search(query, gen), 300)
    } else {
      searchGenRef.current++
      setResults([])
    }
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, search])

  const handleSelect = async (r: SearchResult) => {
    setQuery(r.name)
    setOpen(false)
    if ((!r.lat || !r.lng) && r.place_id) {
      try {
        const details = await placeDetails(r.place_id)
        if (details) {
          onSelect({ ...r, lat: details.lat, lng: details.lng, name: details.name ?? r.name, address: details.address ?? r.address })
          return
        }
      } catch { /* use as-is */ }
    }
    onSelect(r)
  }

  const POI_QUERIES: Record<POICategory, string> = {
    gasStation: 'gas station',
    parking: 'parking',
    restaurant: 'restaurant',
    cafe: 'coffee shop',
    evCharger: 'ev charger',
    grocery: 'grocery store',
  }

  const handlePOISearch = useCallback(async (category: POICategory) => {
    if (activePOI === category) { setActivePOI(null); setResults([]); setOpen(false); return }
    setActivePOI(category)
    setLoading(true)
    setOpen(true)
    setQuery('')
    try {
      const q = POI_QUERIES[category] ?? category
      const res = await withTimeout(placesAutocomplete(q, userLocation ?? undefined), 5000)
      setResults(res.length > 0 ? res.map((r, i) => ({ ...r, id: `poi-${i}` })) : [])
      if (res.length === 0) {
        const fallback = await fetch(`${getApiBaseUrl()}/api/map/search?q=${encodeURIComponent(q)}`, { credentials: 'include' })
        if (fallback.ok) {
          const data = await fallback.json()
          setResults(Array.isArray(data.data) ? data.data.map((r: SearchResult, i: number) => ({ ...r, id: `poi-${i}` })) : [])
        }
      }
    } catch {
      setResults([])
    }
    setLoading(false)
  }, [activePOI, userLocation])

  const handleNavigate = async (r: SearchResult) => {
    if ((!r.lat || !r.lng) && r.place_id) {
      try {
        const details = await placeDetails(r.place_id)
        if (details) {
          onNavigate?.({ ...r, lat: details.lat, lng: details.lng, name: details.name ?? r.name, address: details.address ?? r.address })
          setOpen(false)
          return
        }
      } catch { /* use as-is */ }
    }
    onNavigate?.(r)
    setOpen(false)
  }

  return (
    <div className="absolute top-2 left-2 right-28 z-30">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setActivePOI(null) }}
          onFocus={() => setOpen(true)}
          placeholder="Search places..."
          className="w-full border border-gray-200 rounded-xl pl-9 pr-8 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500/50 shadow-[0_1px_4px_rgba(0,0,0,0.08)]"
          style={{ background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults([]); setOpen(false) }} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
            <X size={16} />
          </button>
        )}
      </div>

      {/* POI category quick-filter pills */}
      <div className="flex gap-1.5 mt-1.5 overflow-x-auto no-scrollbar">
        {POI_PILLS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => handlePOISearch(key)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors border ${
              activePOI === key
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white/90 text-slate-600 border-gray-200 active:bg-gray-100'
            }`}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {open && (results.length > 0 || loading) && (
        <div className="mt-1 border border-gray-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto shadow-lg" style={{ background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
          {loading && results.length === 0 && (
            <div className="px-4 py-3 text-sm text-slate-400">Searching...</div>
          )}
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => handleSelect(r)}
              className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-slate-800 transition-colors text-left"
            >
              <MapPin size={16} className="text-blue-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{r.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{r.address}</p>
              </div>
              {onNavigate && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleNavigate(r) }}
                  className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-blue-500/20 hover:bg-blue-500/40 transition-colors"
                >
                  <Navigation size={14} className="text-blue-400" />
                </button>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
