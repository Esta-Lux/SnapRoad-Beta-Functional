/**
 * Map search bar with Google Places autocomplete dropdown.
 * Calls GET /api/places/autocomplete?q=...&lat=...&lng=...
 * Falls back to /api/map/search if places API is unavailable.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, X, MapPin, Navigation } from 'lucide-react'

const API_URL = import.meta.env.VITE_BACKEND_URL || ''

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

export default function MapSearchBar({ onSelect, onNavigate, userLocation }: MapSearchBarProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resolveCoords = useCallback(async (placeId: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const res = await fetch(`${API_URL}/api/places/details/${placeId}`)
      if (!res.ok) return null
      const json = await res.json()
      if (json.success && json.data?.lat && json.data?.lng) {
        return { lat: json.data.lat, lng: json.data.lng }
      }
    } catch { /* fallback */ }
    return null
  }, [])

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    setLoading(true)
    try {
      const locParams = userLocation ? `&lat=${userLocation.lat}&lng=${userLocation.lng}` : ''
      const res = await fetch(`${API_URL}/api/places/autocomplete?q=${encodeURIComponent(q)}${locParams}`)
      if (res.ok) {
        const data = await res.json()
        if (data.success && Array.isArray(data.data)) {
          setResults(data.data.map((p: { place_id?: string; name?: string; address?: string; description?: string; distance_meters?: number }, i: number) => ({
            id: p.place_id || i,
            name: p.name || '',
            address: p.address || p.description || '',
            lat: 0,
            lng: 0,
            place_id: p.place_id,
          })))
          setLoading(false)
          return
        }
      }
      // Fallback to /api/map/search
      const fallback = await fetch(`${API_URL}/api/map/search?q=${encodeURIComponent(q)}`)
      if (fallback.ok) {
        const data = await fallback.json()
        setResults(Array.isArray(data.data) ? data.data : data.results ?? [])
      }
    } catch { /* degrade gracefully */ }
    setLoading(false)
  }, [userLocation])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.length >= 2) {
      debounceRef.current = setTimeout(() => search(query), 300)
    } else {
      setResults([])
    }
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, search])

  const handleSelect = async (r: SearchResult) => {
    setQuery(r.name)
    setOpen(false)
    if (r.place_id && (!r.lat || !r.lng)) {
      const coords = await resolveCoords(r.place_id)
      if (coords) {
        onSelect({ ...r, lat: coords.lat, lng: coords.lng })
        return
      }
    }
    onSelect(r)
  }

  const handleNavigate = async (r: SearchResult) => {
    if (r.place_id && (!r.lat || !r.lng)) {
      const coords = await resolveCoords(r.place_id)
      if (coords) {
        onNavigate?.({ ...r, lat: coords.lat, lng: coords.lng })
        setOpen(false)
        return
      }
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
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Search places..."
          className="w-full bg-white/95 backdrop-blur border border-gray-200 rounded-xl pl-9 pr-8 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500/50 shadow-[0_1px_4px_rgba(0,0,0,0.08)]"
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults([]); setOpen(false) }} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
            <X size={16} />
          </button>
        )}
      </div>

      {open && (results.length > 0 || loading) && (
        <div className="mt-1 bg-white/95 backdrop-blur border border-gray-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto shadow-lg">
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
