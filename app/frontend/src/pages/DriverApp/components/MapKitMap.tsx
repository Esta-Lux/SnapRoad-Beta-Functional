/**
 * Apple MapKit JS map component.
 * Stable lifecycle: map created once on mount, props update via separate effects.
 * Supports driving modes (route glow, bearing, ghost prediction).
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { Locate, Mic, Navigation2, Plus, Minus, Layers } from 'lucide-react'
import type { DrivingMode } from '@/core/types'

/* ------------------------------------------------------------------ */
/*  MapKit JS type declarations                                        */
/* ------------------------------------------------------------------ */

interface MKCoordinate { latitude: number; longitude: number }
interface MKCoordinateSpan { latitudeDelta: number; longitudeDelta: number }
interface MKAnnotation { coordinate: MKCoordinate }

interface MKMap {
  center: MKCoordinate
  region: unknown
  rotation: number
  setCenterAnimated(coord: MKCoordinate, animate?: boolean): void
  setRegionAnimated(region: unknown, animate?: boolean): void
  addAnnotation(a: unknown): void
  removeAnnotation(a: unknown): void
  addOverlay(o: unknown): void
  removeOverlay(o: unknown): void
  destroy(): void
}

interface MKStyle {
  strokeColor: string
  lineWidth: number
  strokeOpacity: number
  lineCap: string
  lineJoin: string
}

interface MKMapKit {
  Map: new (el: HTMLElement, opts?: Record<string, unknown>) => MKMap
  Coordinate: new (lat: number, lng: number) => MKCoordinate
  CoordinateSpan: new (latD: number, lngD: number) => MKCoordinateSpan
  CoordinateRegion: new (center: MKCoordinate, span: MKCoordinateSpan) => unknown
  MarkerAnnotation: new (coord: MKCoordinate, opts?: Record<string, unknown>) => MKAnnotation
  PolylineOverlay: new (coords: MKCoordinate[], opts?: Record<string, unknown>) => unknown
  Annotation: new (coord: MKCoordinate, factory: () => HTMLElement, opts?: Record<string, unknown>) => MKAnnotation
  Style: new (opts: Record<string, unknown>) => MKStyle
}

function mk(): MKMapKit | null {
  return (window as unknown as { mapkit?: MKMapKit }).mapkit ?? null
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface Offer {
  id: number
  business_name: string
  discount_percent: number
  gems_reward: number
  lat?: number
  lng?: number
  redeemed?: boolean
}

interface RoadReport {
  id: number
  type: string
  lat: number
  lng: number
  title?: string
  severity?: string
}

export interface MapKitMapProps {
  center: { lat: number; lng: number }
  zoom: number
  bearing?: number
  userLocation: { lat: number; lng: number }
  vehicleHeading?: number
  carColor?: string
  routePolyline?: { lat: number; lng: number }[]
  predictedPosition?: { coordinate: { lat: number; lng: number }; confidence: number } | null
  routeGlow?: number
  mode?: DrivingMode
  onRecenter?: () => void
  onOrionClick?: () => void
  isLiveGps?: boolean
  onMapError?: (msg: string) => void
  offers?: Offer[]
  onOfferClick?: (offer: Offer) => void
  roadReports?: RoadReport[]
  isNavigating?: boolean
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const DELTA_FOR_ZOOM = (z: number) => 0.01 * Math.pow(2, 17 - Math.min(18, Math.max(10, z)))

function modeColors(mode: DrivingMode, glow: number) {
  if (mode === 'sport') return { stroke: '#22d3ee', width: 6, opacity: 1 }
  if (mode === 'calm') return { stroke: '#60a5fa', width: 3, opacity: 0.6 }
  return { stroke: '#3b82f6', width: 3 + glow * 3, opacity: 0.5 + glow * 0.5 }
}

function bearingToCardinal(deg: number): string {
  const norm = ((deg % 360) + 360) % 360
  if (norm < 22.5 || norm >= 337.5) return 'N'
  if (norm < 67.5) return 'NE'
  if (norm < 112.5) return 'E'
  if (norm < 157.5) return 'SE'
  if (norm < 202.5) return 'S'
  if (norm < 247.5) return 'SW'
  if (norm < 292.5) return 'W'
  return 'NW'
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function MapKitMap({
  center,
  zoom,
  bearing = 0,
  userLocation,
  vehicleHeading = 0,
  carColor = '#3b82f6',
  routePolyline,
  predictedPosition,
  routeGlow = 0.7,
  mode = 'adaptive',
  onRecenter,
  onOrionClick,
  isLiveGps,
  onMapError,
  offers = [],
  onOfferClick,
  roadReports = [],
  isNavigating,
}: MapKitMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MKMap | null>(null)
  const userAnnRef = useRef<MKAnnotation | null>(null)
  const ghostAnnRef = useRef<MKAnnotation | null>(null)
  const overlayRef = useRef<unknown>(null)
  const offerAnnsRef = useRef<MKAnnotation[]>([])
  const reportAnnsRef = useRef<MKAnnotation[]>([])
  const [mapFailed, setMapFailed] = useState(false)
  const [mapReady, setMapReady] = useState(false)

  /* ---------- Effect 1: Create map once on mount ---------- */
  useEffect(() => {
    const mapkit = mk()
    if (!mapkit || !containerRef.current) {
      setMapFailed(true)
      onMapError?.('MapKit not available')
      return
    }

    const el = containerRef.current
    let cancelled = false
    let attempts = 0
    const maxAttempts = 60

    const tryCreate = () => {
      if (cancelled || !el) return
      const w = el.offsetWidth ?? 0
      const h = el.offsetHeight ?? 0
      if ((w < 1 || h < 1) && attempts < maxAttempts) {
        attempts++
        requestAnimationFrame(tryCreate)
        return
      }

      let map: MKMap
      try {
        map = new mapkit.Map(el, {
          isScrollEnabled: true,
          isZoomEnabled: true,
          isRotationEnabled: true,
          showsCompass: 0,
          showsZoomControl: false,
          showsMapTypeControl: false,
          showsUserLocation: false,
          tracksUserLocation: false,
        } as Record<string, unknown>)
      } catch (e) {
        console.warn('MapKit Map creation failed:', e)
        setMapFailed(true)
        onMapError?.(`MapKit map creation failed: ${(e as Error)?.message || e}`)
        return
      }

      try {
        const delta = DELTA_FOR_ZOOM(zoom)
        const coord = new mapkit.Coordinate(center.lat, center.lng)
        const span = new mapkit.CoordinateSpan(delta, delta * 1.2)
        const region = new mapkit.CoordinateRegion(coord, span)
        map.setRegionAnimated(region, false)
      } catch { /* initial region non-critical */ }

      mapRef.current = map
      setMapReady(true)
    }

    requestAnimationFrame(tryCreate)

    return () => {
      cancelled = true
      setMapReady(false)
      const map = mapRef.current
      if (map) {
        try { map.destroy() } catch { /* already gone */ }
        mapRef.current = null
      }
      userAnnRef.current = null
      ghostAnnRef.current = null
      overlayRef.current = null
    }
    // mount-only: we update region/annotations via separate effects
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---------- Effect 2: Update region (center + zoom + bearing) ---------- */
  const setRegion = useCallback(() => {
    const mapkit = mk()
    const map = mapRef.current
    if (!mapkit || !map) return
    try {
      const delta = DELTA_FOR_ZOOM(zoom)
      const coord = new mapkit.Coordinate(center.lat, center.lng)
      const span = new mapkit.CoordinateSpan(delta, delta * 1.2)
      const region = new mapkit.CoordinateRegion(coord, span)
      map.setRegionAnimated(region, true)
      if (typeof bearing === 'number') {
        map.rotation = -bearing
      }
    } catch (e) {
      console.warn('MapKit setRegion failed:', e)
    }
  }, [center.lat, center.lng, zoom, bearing])

  useEffect(() => { setRegion() }, [setRegion])

  /* ---------- Effect 3: User location annotation ---------- */
  useEffect(() => {
    const mapkit = mk()
    const map = mapRef.current
    if (!mapkit || !map) return

    if (userAnnRef.current) {
      try { map.removeAnnotation(userAnnRef.current) } catch { /* noop */ }
    }

    try {
      const coord = new mapkit.Coordinate(userLocation.lat, userLocation.lng)

      const factory = () => {
        const el = document.createElement('div')
        el.style.cssText = 'width:48px;height:48px;position:relative;'
        const pulse = document.createElement('div')
        pulse.style.cssText = 'position:absolute;inset:2px;border-radius:50%;background:rgba(59,130,246,0.18);animation:pulse 2s infinite;'
        el.appendChild(pulse)
        const car = document.createElement('div')
        const c = carColor
        car.innerHTML = `<svg width="22" height="36" viewBox="0 0 22 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="3" width="18" height="30" rx="5" fill="${c}"/>
          <rect x="0" y="9" width="2.5" height="5" rx="1.2" fill="${c}" opacity="0.7"/>
          <rect x="19.5" y="9" width="2.5" height="5" rx="1.2" fill="${c}" opacity="0.7"/>
          <rect x="0" y="22" width="2.5" height="5" rx="1.2" fill="${c}" opacity="0.7"/>
          <rect x="19.5" y="22" width="2.5" height="5" rx="1.2" fill="${c}" opacity="0.7"/>
          <rect x="4" y="10" width="14" height="12" rx="2.5" fill="rgba(0,0,0,0.18)"/>
          <rect x="5" y="11" width="12" height="5.5" rx="1.5" fill="rgba(180,220,255,0.45)"/>
          <rect x="5.5" y="19" width="11" height="2.5" rx="1.2" fill="rgba(180,220,255,0.3)"/>
          <rect x="3.5" y="4.5" width="4" height="1.5" rx="0.75" fill="rgba(255,255,255,0.9)"/>
          <rect x="14.5" y="4.5" width="4" height="1.5" rx="0.75" fill="rgba(255,255,255,0.9)"/>
          <rect x="3.5" y="30" width="3.5" height="1.5" rx="0.75" fill="#ef4444"/>
          <rect x="15" y="30" width="3.5" height="1.5" rx="0.75" fill="#ef4444"/>
        </svg>`
        car.style.cssText = `position:absolute;left:13px;top:6px;transform:rotate(${vehicleHeading}deg);transition:transform .3s ease;transform-origin:center center;`
        el.appendChild(car)
        return el
      }

      const ann = new mapkit.Annotation(coord, factory, {
        anchorOffset: new DOMPoint(0, 0),
        animates: false,
      })
      map.addAnnotation(ann)
      userAnnRef.current = ann
    } catch (e) {
      console.warn('MapKit user annotation failed:', e)
    }
  }, [userLocation.lat, userLocation.lng, vehicleHeading, carColor, mapReady])

  /* ---------- Effect 4: Ghost prediction annotation ---------- */
  useEffect(() => {
    const mapkit = mk()
    const map = mapRef.current
    if (!mapkit || !map) return

    if (ghostAnnRef.current) {
      try { map.removeAnnotation(ghostAnnRef.current) } catch { /* noop */ }
      ghostAnnRef.current = null
    }

    if (!predictedPosition || predictedPosition.confidence <= 0) return

    try {
      const coord = new mapkit.Coordinate(
        predictedPosition.coordinate.lat,
        predictedPosition.coordinate.lng
      )
      const opacity = Math.max(0.15, Math.min(0.6, predictedPosition.confidence))

      const factory = () => {
        const el = document.createElement('div')
        el.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L4 20l8-5 8 5L12 2z" fill="#60a5fa" stroke="white" stroke-width="1"/>
        </svg>`
        el.style.cssText = `opacity:${opacity};transform:rotate(${vehicleHeading}deg);transition:opacity .3s;`
        return el
      }

      const ann = new mapkit.Annotation(coord, factory, {
        anchorOffset: new DOMPoint(0, 0),
        animates: false,
      })
      map.addAnnotation(ann)
      ghostAnnRef.current = ann
    } catch (e) {
      console.warn('MapKit ghost annotation failed:', e)
    }
  }, [predictedPosition, vehicleHeading, mapReady])

  /* ---------- Effect 5: Route polyline overlay ---------- */
  useEffect(() => {
    const mapkit = mk()
    const map = mapRef.current
    if (!mapkit || !map) return

    if (overlayRef.current) {
      try { map.removeOverlay(overlayRef.current) } catch { /* noop */ }
      overlayRef.current = null
    }

    if (!routePolyline || routePolyline.length < 2) return

    try {
      const coords = routePolyline.map(p => new mapkit.Coordinate(p.lat, p.lng))
      const mc = modeColors(mode, routeGlow)
      const style = new mapkit.Style({
        strokeColor: mc.stroke,
        lineWidth: mc.width,
        strokeOpacity: mc.opacity,
        lineCap: 'round',
        lineJoin: 'round',
      })
      const overlay = new mapkit.PolylineOverlay(coords, { style })
      map.addOverlay(overlay)
      overlayRef.current = overlay
    } catch (e) {
      console.warn('MapKit polyline overlay failed:', e)
    }
  }, [routePolyline, mode, routeGlow, mapReady])

  /* ---------- Effect 6: Offer markers ---------- */
  useEffect(() => {
    const mapkit = mk()
    const map = mapRef.current
    if (!mapkit || !map) return

    offerAnnsRef.current.forEach((a) => { try { map.removeAnnotation(a) } catch { /* noop */ } })
    offerAnnsRef.current = []

    const visible = offers.filter((o) => !o.redeemed && o.lat && o.lng).slice(0, 8)
    visible.forEach((offer) => {
      try {
        const coord = new mapkit.Coordinate(offer.lat!, offer.lng!)
        const factory = () => {
          const el = document.createElement('div')
          el.style.cssText = 'cursor:pointer;'
          const bg = offer.discount_percent >= 15 ? '#10b981' : '#3b82f6'
          el.innerHTML = `<div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,${bg},${bg}cc);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px ${bg}66;border:2px solid white;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M6 3h12l-1.5 5H7.5L6 3zm0 0l-2 7h16l-2-7M5 10v11a1 1 0 001 1h12a1 1 0 001-1V10"/></svg>
          </div><div style="position:absolute;top:100%;left:50%;transform:translateX(-50%);margin-top:2px;background:#0f172acc;color:white;font-size:9px;font-weight:700;padding:1px 5px;border-radius:8px;white-space:nowrap;">${offer.discount_percent}%</div>`
          el.onclick = (e) => { e.stopPropagation(); onOfferClick?.(offer) }
          return el
        }
        const ann = new mapkit.Annotation(coord, factory, { anchorOffset: new DOMPoint(0, 0), animates: false })
        map.addAnnotation(ann)
        offerAnnsRef.current.push(ann)
      } catch (e) {
        console.warn('MapKit offer annotation failed:', e)
      }
    })
  }, [offers, onOfferClick, mapReady])

  /* ---------- Effect 7: Road report markers ---------- */
  useEffect(() => {
    const mapkit = mk()
    const map = mapRef.current
    if (!mapkit || !map) return

    reportAnnsRef.current.forEach((a) => { try { map.removeAnnotation(a) } catch { /* noop */ } })
    reportAnnsRef.current = []

    roadReports.forEach((r) => {
      if (!r.lat || !r.lng) return
      try {
        const coord = new mapkit.Coordinate(r.lat, r.lng)
        const bg = r.severity === 'high' ? '#ef4444' : r.severity === 'medium' ? '#f59e0b' : '#3b82f6'
        const label = r.type === 'accident' ? '!' : r.type === 'police' ? 'P' : r.type === 'construction' ? 'C' : '\u26A0'
        const factory = () => {
          const el = document.createElement('div')
          el.innerHTML = `<div style="width:20px;height:20px;border-radius:50%;background:${bg};border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:white;box-shadow:0 1px 4px rgba(0,0,0,.3);">${label}</div>`
          return el
        }
        const ann = new mapkit.Annotation(coord, factory, { anchorOffset: new DOMPoint(0, 0), animates: false })
        map.addAnnotation(ann)
        reportAnnsRef.current.push(ann)
      } catch (e) {
        console.warn('MapKit report annotation failed:', e)
      }
    })
  }, [roadReports, mapReady])

  /* ---------- Mode edge tint ---------- */
  const edgeTint =
    mode === 'sport'
      ? 'linear-gradient(180deg, rgba(239,68,68,0.12) 0%, transparent 30%, transparent 70%, rgba(239,68,68,0.08) 100%)'
      : mode === 'calm'
        ? 'linear-gradient(180deg, rgba(96,165,250,0.1) 0%, transparent 30%, transparent 70%, rgba(96,165,250,0.06) 100%)'
        : 'none'

  if (mapFailed) return (
    <div className="absolute inset-0 z-0 bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
          <Navigation2 className="text-blue-400 animate-pulse" size={28} />
        </div>
        <p className="text-slate-400 text-sm mb-2">Initializing Apple Maps...</p>
        <button
          onClick={() => { setMapFailed(false); window.location.reload() }}
          className="text-blue-400 text-xs hover:text-blue-300 underline"
        >
          Tap to retry
        </button>
      </div>
    </div>
  )

  const cardinal = bearingToCardinal(bearing)

  return (
    <div className="absolute inset-0 z-0 bg-slate-900">
      {/* MapKit container -- hide built-in attribution/legal */}
      <div ref={containerRef} className="absolute inset-0 mapkit-clean" />

      {/* Mode edge tint overlay */}
      <div className="absolute inset-0 pointer-events-none z-[5]" style={{ background: edgeTint }} />

      {/* Navigation indicator */}
      {isNavigating && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-blue-500 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
          <Navigation2 className="animate-pulse" size={16} />
          <span className="text-sm font-medium">Navigating...</span>
        </div>
      )}

      {/* Live GPS badge */}
      {isLiveGps && (
        <div className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded-full bg-emerald-500/90 text-white text-[10px] font-medium flex items-center gap-1">
          <Navigation2 size={10} className="animate-pulse" /> Live GPS
        </div>
      )}

      {/* ── Baidu-style floating control card (right side) ── */}
      <div className="absolute right-3 bottom-28 z-30 flex flex-col items-center gap-2.5">

        {/* Orion voice -- stays as SnapRoad branded */}
        <button
          type="button"
          onClick={onOrionClick}
          className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          style={{ boxShadow: '0 4px 12px rgba(139,92,246,0.35)' }}
        >
          <Mic className="text-white" size={18} />
        </button>

        {/* Grouped controls card - Baidu panel: light gray bg, subtle border, padding */}
        <div className="bg-gray-50/98 backdrop-blur-md rounded-xl border border-gray-200/90 shadow-[0_1px_4px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col items-center w-11 py-1">
          {/* Cardinal direction */}
          <button
            type="button"
            onClick={() => {
              const m = mapRef.current
              if (m) { m.rotation = 0 }
              onRecenter?.()
            }}
            className="w-11 h-10 flex items-center justify-center active:bg-gray-200/80 transition-colors rounded-t-lg"
          >
            <span className="text-[13px] font-bold text-slate-700 select-none">{cardinal}</span>
          </button>
          <div className="w-7 h-px bg-gray-200" />
          {/* Layers / map type toggle */}
          <button
            type="button"
            onClick={() => {
              const m = mapRef.current
              if (!m) return
              const types = ['mutedStandard', 'satellite', 'standard'] as const
              const cur = (m as unknown as { mapType: string }).mapType || 'mutedStandard'
              const idx = types.indexOf(cur as typeof types[number])
              const next = types[(idx + 1) % types.length]
              ;(m as unknown as { mapType: string }).mapType = next
            }}
            className="w-11 h-10 flex items-center justify-center active:bg-gray-200/80 transition-colors"
          >
            <Layers className="text-slate-600" size={17} />
          </button>
          <div className="w-7 h-px bg-gray-200" />
          {/* Zoom in */}
          <button
            type="button"
            onClick={() => {
              const m = mapRef.current
              const mapkit = mk()
              if (!m || !mapkit) return
              try {
                const delta = DELTA_FOR_ZOOM(zoom + 1)
                const coord = new mapkit.Coordinate(center.lat, center.lng)
                const span = new mapkit.CoordinateSpan(delta, delta * 1.2)
                m.setRegionAnimated(new mapkit.CoordinateRegion(coord, span), true)
              } catch { /* non-critical */ }
            }}
            className="w-11 h-10 flex items-center justify-center active:bg-gray-200/80 transition-colors"
          >
            <Plus className="text-slate-600" size={18} />
          </button>
          <div className="w-7 h-px bg-gray-200" />
          {/* Zoom out */}
          <button
            type="button"
            onClick={() => {
              const m = mapRef.current
              const mapkit = mk()
              if (!m || !mapkit) return
              try {
                const delta = DELTA_FOR_ZOOM(zoom - 1)
                const coord = new mapkit.Coordinate(center.lat, center.lng)
                const span = new mapkit.CoordinateSpan(delta, delta * 1.2)
                m.setRegionAnimated(new mapkit.CoordinateRegion(coord, span), true)
              } catch { /* non-critical */ }
            }}
            className="w-11 h-10 flex items-center justify-center active:bg-gray-200/80 transition-colors rounded-b-lg"
          >
            <Minus className="text-slate-600" size={18} />
          </button>
        </div>

        {/* Recenter / location button */}
        <button
          type="button"
          onClick={onRecenter}
          className="w-11 h-10 bg-gray-50/98 backdrop-blur-md rounded-xl border border-gray-200/90 shadow-[0_1px_4px_rgba(0,0,0,0.08)] flex items-center justify-center active:bg-gray-200/80 transition-colors"
        >
          <Locate className="text-blue-500" size={19} />
        </button>
      </div>
    </div>
  )
}
