import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

interface Props {
  lat: number | null
  lng: number | null
  onChange: (lat: number, lng: number) => void
}

export default function OfferLocationPicker({ lat, lng, onChange }: Readonly<Props>) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)
  const hasCoords = typeof lat === 'number' && typeof lng === 'number'
  const coordText = hasCoords ? `${lat},${lng}` : ''
  const token = (import.meta.env.VITE_MAPBOX_TOKEN as string | undefined)?.trim()
  const mapsHref = hasCoords
    ? `https://www.google.com/maps?q=${encodeURIComponent(coordText)}`
    : 'https://www.google.com/maps'

  useEffect(() => {
    if (!token || !containerRef.current || mapRef.current) return
    mapboxgl.accessToken = token
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-82.9988, 39.9612],
      zoom: 11,
    })
    mapRef.current = map
    map.addControl(new mapboxgl.NavigationControl(), 'top-right')
    map.on('click', (e) => {
      onChange(e.lngLat.lat, e.lngLat.lng)
    })
    return () => {
      try {
        markerRef.current?.remove()
      } catch {
        /* ignore */
      }
      markerRef.current = null
      try {
        map.remove()
      } catch {
        /* ignore */
      }
      mapRef.current = null
    }
  }, [token, onChange])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !hasCoords || typeof lat !== 'number' || typeof lng !== 'number') return
    const point: [number, number] = [lng, lat]
    const marker = markerRef.current
    if (marker) marker.setLngLat(point)
    else markerRef.current = new mapboxgl.Marker({ color: '#10b981' }).setLngLat(point).addTo(map)
    map.easeTo({ center: point, duration: 350 })
  }, [hasCoords, lat, lng])

  if (token === '') {
    return (
      <div className="rounded-2xl overflow-hidden border border-white/10">
        <div className="h-[260px] w-full bg-slate-900/50 flex flex-col items-center justify-center gap-3 px-4 text-center">
          <p className="text-xs text-slate-300">
            Mapbox token missing. Set <code className="text-[11px]">VITE_MAPBOX_TOKEN</code> for live map allocation.
          </p>
          <a
            href={mapsHref}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-lg text-xs bg-white/10 hover:bg-white/20 text-slate-200"
          >
            Open in Google Maps
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-white/10">
      <div ref={containerRef} className="h-[260px] w-full" />
      <div className="px-4 py-3 text-xs text-slate-300 bg-slate-900/60 flex items-center justify-between gap-2">
        {hasCoords ? (
          <span className="text-emerald-300">
            Current pin: {Number(lat).toFixed(6)}, {Number(lng).toFixed(6)}
          </span>
        ) : (
          <span className="text-slate-400">Click map to set coordinates.</span>
        )}
        <a
          href={mapsHref}
          target="_blank"
          rel="noreferrer"
          className="px-3 py-1 rounded-lg text-xs bg-white/10 hover:bg-white/20 text-slate-200 shrink-0"
        >
          Open in Google Maps
        </a>
      </div>
    </div>
  )
}
