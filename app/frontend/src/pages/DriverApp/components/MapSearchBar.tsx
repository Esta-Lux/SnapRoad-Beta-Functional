/**
 * Map search bar with autocomplete dropdown.
 * Calls GET /api/map/search?q=...
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, X, MapPin, Navigation } from 'lucide-react'

const API_URL = import.meta.env.VITE_BACKEND_URL || ''

interface SearchResult {
  id: number
  name: string
  address: string
  lat: number
  lng: number
  type?: string
}

interface MapSearchBarProps {
  onSelect: (result: SearchResult) => void
  onNavigate?: (result: SearchResult) => void
}

export default function MapSearchBar({ onSelect, onNavigate }: MapSearchBarProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/map/search?q=${encodeURIComponent(q)}`)
      if (res.ok) {
        const data = await res.json()
        setResults(Array.isArray(data.data) ? data.data : data.results ?? [])
      }
    } catch { /* backend down, degrade gracefully */ }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.length >= 2) {
      debounceRef.current = setTimeout(() => search(query), 300)
    } else {
      setResults([])
    }
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, search])

  const handleSelect = (r: SearchResult) => {
    setQuery(r.name)
    setOpen(false)
    onSelect(r)
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
          className="w-full bg-slate-900/90 backdrop-blur border border-white/10 rounded-xl pl-9 pr-8 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults([]); setOpen(false) }} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
            <X size={16} />
          </button>
        )}
      </div>

      {open && (results.length > 0 || loading) && (
        <div className="mt-1 bg-slate-900/95 backdrop-blur border border-white/10 rounded-xl overflow-hidden max-h-60 overflow-y-auto shadow-2xl">
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
                <p className="text-sm text-white truncate">{r.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{r.address}</p>
              </div>
              {onNavigate && (
                <button
                  onClick={(e) => { e.stopPropagation(); onNavigate(r); setOpen(false) }}
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
