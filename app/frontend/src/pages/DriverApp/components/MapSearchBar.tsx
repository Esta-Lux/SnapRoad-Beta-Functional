/**
 * Map search bar with live MapKit JS Search (when available).
 * Calls window.mapkit.Search directly for real-world address results.
 * Falls back to backend /api/map/search only if MapKit is unavailable.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, X, MapPin, Navigation, Fuel, ParkingCircle, Coffee, ShoppingBag, Utensils, Zap } from 'lucide-react'
import { useMapKit } from '@/contexts/MapKitContext'
import { mapkitPOISearch, type POICategory } from '@/lib/mapkit'

const API_URL = import.meta.env.VITE_BACKEND_URL || ''

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getMK(): any { return (window as any).mapkit }

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

/**
 * Call window.mapkit.Search.autocomplete directly (no abstraction layer).
 * Returns a promise of SearchResult[].
 */
function mkAutocomplete(q: string, loc?: { lat: number; lng: number }): Promise<SearchResult[]> {
  return new Promise((resolve, reject) => {
    const mk = getMK()
    if (!mk || !mk.Search) { reject(new Error('no mapkit.Search')); return }
    const opts: Record<string, unknown> = {}
    if (loc) {
      opts.region = new mk.CoordinateRegion(
        new mk.Coordinate(loc.lat, loc.lng),
        new mk.CoordinateSpan(0.5, 0.5)
      )
    }
    const search = new mk.Search(opts)
    search.autocomplete(q, (err: unknown, data: { results?: Array<{ displayLines?: string[]; coordinate?: { latitude: number; longitude: number } }> }) => {
      if (err) { reject(err); return }
      const out: SearchResult[] = (data?.results ?? []).map((r, i) => ({
        id: `mk-ac-${i}`,
        name: r.displayLines?.[0] ?? '',
        address: r.displayLines?.slice(1).join(', ') ?? '',
        lat: r.coordinate?.latitude ?? 0,
        lng: r.coordinate?.longitude ?? 0,
      }))
      resolve(out)
    })
  })
}

/**
 * Call window.mapkit.Search.search directly for full place results with coordinates.
 */
function mkSearch(q: string, loc?: { lat: number; lng: number }): Promise<SearchResult[]> {
  return new Promise((resolve, reject) => {
    const mk = getMK()
    if (!mk || !mk.Search) { reject(new Error('no mapkit.Search')); return }
    const opts: Record<string, unknown> = {}
    if (loc) {
      opts.region = new mk.CoordinateRegion(
        new mk.Coordinate(loc.lat, loc.lng),
        new mk.CoordinateSpan(0.5, 0.5)
      )
    }
    const search = new mk.Search(opts)
    search.search(q, (err: unknown, data: { places?: Array<{ name?: string; formattedAddress?: string; coordinate?: { latitude: number; longitude: number } }> }) => {
      if (err) { reject(err); return }
      const out: SearchResult[] = (data?.places ?? []).map((p, i) => ({
        id: `mk-s-${i}`,
        name: p.name ?? '',
        address: p.formattedAddress ?? '',
        lat: p.coordinate?.latitude ?? 0,
        lng: p.coordinate?.longitude ?? 0,
      }))
      resolve(out)
    })
  })
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
  const { ready: mapKitReady } = useMapKit()

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    setLoading(true)

    const mk = getMK()

    // 1. MapKit autocomplete (live worldwide results) — 5s timeout
    if (mapKitReady && mk?.Search) {
      try {
        const res = await withTimeout(mkAutocomplete(q, userLocation), 5000)
        if (res.length > 0) { setResults(res); setLoading(false); return }
      } catch { /* fall through */ }
    }

    // 2. MapKit full search — 5s timeout
    if (mapKitReady && mk?.Search) {
      try {
        const res = await withTimeout(mkSearch(q, userLocation), 5000)
        if (res.length > 0) { setResults(res); setLoading(false); return }
      } catch { /* fall through */ }
    }

    // 3. Backend hardcoded map search (last resort)
    try {
      const fallback = await fetch(`${API_URL}/api/map/search?q=${encodeURIComponent(q)}`)
      if (fallback.ok) {
        const data = await fallback.json()
        setResults(Array.isArray(data.data) ? data.data : data.results ?? [])
      }
    } catch { /* exhausted */ }

    setLoading(false)
  }, [userLocation, mapKitReady])

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
    if ((!r.lat || !r.lng) && mapKitReady && getMK()?.Search) {
      try {
        const resolved = await mkSearch(r.name, userLocation)
        if (resolved[0]?.lat && resolved[0]?.lng) {
          onSelect({ ...r, lat: resolved[0].lat, lng: resolved[0].lng })
          return
        }
      } catch { /* use as-is */ }
    }
    onSelect(r)
  }

  const handlePOISearch = useCallback(async (category: POICategory) => {
    if (activePOI === category) { setActivePOI(null); setResults([]); setOpen(false); return }
    setActivePOI(category)
    setLoading(true)
    setOpen(true)
    setQuery('')
    try {
      const center = userLocation ?? { lat: 39.9612, lng: -82.9988 }
      const res = await mapkitPOISearch(category, { center })
      setResults(res.map((r, i) => ({ ...r, id: `poi-${i}` })))
    } catch {
      setResults([])
    }
    setLoading(false)
  }, [activePOI, userLocation])

  const handleNavigate = async (r: SearchResult) => {
    if ((!r.lat || !r.lng) && mapKitReady && getMK()?.Search) {
      try {
        const resolved = await mkSearch(r.name, userLocation)
        if (resolved[0]?.lat && resolved[0]?.lng) {
          onNavigate?.({ ...r, lat: resolved[0].lat, lng: resolved[0].lng })
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
