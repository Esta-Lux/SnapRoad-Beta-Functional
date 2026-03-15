/**
 * Map component (SnapRoad Map).
 * Stable lifecycle: map created once on mount, props update via separate effects.
 * Supports driving modes (route glow, bearing, ghost prediction).
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { Locate, Mic, Navigation2, Layers, Compass, Eye } from 'lucide-react'
import type { DrivingMode } from '@/core/types'
import { createLookAroundScene } from '@/lib/mapkit'

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
  showsUserLocation?: boolean
  tracksUserLocation?: boolean
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
  pitch?: number
  userLocation: { lat: number; lng: number }
  gpsAccuracyMeters?: number
  vehicleHeading?: number
  routePolyline?: { lat: number; lng: number }[]
  destinationCoordinate?: { lat: number; lng: number }
  traveledDistanceMeters?: number
  contentInsets?: { top: number; bottom: number; left: number; right: number }
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
  showLookAround?: boolean
  onDestinationDrag?: (coord: { lat: number; lng: number }) => void
  offerZoneRadiusMeters?: number
  colorScheme?: 'light' | 'dark'
  onMapReady?: (map: MKMap, zoomToUser: (lat: number, lng: number, isNavigating: boolean) => void) => void
  onPlaceSelected?: (place: { name: string; lat: number; lng: number }) => void
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const DELTA_FOR_ZOOM = (z: number) => 0.01 * Math.pow(2, 17 - Math.min(18, Math.max(10, z)))

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 0, g: 0, b: 0 }
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('')
}

function interpolateColor(hex1: string, hex2: string, t: number): string {
  const a = hexToRgb(hex1)
  const b = hexToRgb(hex2)
  return rgbToHex(a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t)
}

function cumulativeDistance(pts: { lat: number; lng: number }[]): number[] {
  const out: number[] = [0]
  for (let i = 1; i < pts.length; i++) {
    const R = 6371000
    const p1 = pts[i - 1]
    const p2 = pts[i]
    const dLat = ((p2.lat - p1.lat) * Math.PI) / 180
    const dLon = ((p2.lng - p1.lng) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((p1.lat * Math.PI) / 180) * Math.cos((p2.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
    const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    out.push(out[i - 1] + d)
  }
  return out
}


function chunkPolyline(
  pts: { lat: number; lng: number }[],
  n: number
): Array<{ points: { lat: number; lng: number }[]; t: number }> {
  if (pts.length < 2 || n < 1) return []
  const chunks: Array<{ points: { lat: number; lng: number }[]; t: number }> = []
  const step = (pts.length - 1) / Math.min(n, pts.length - 1)
  for (let i = 0; i < n; i++) {
    const start = Math.floor(i * step)
    const end = Math.min(Math.floor((i + 1) * step) + 1, pts.length)
    const slice = pts.slice(start, end)
    if (slice.length >= 2) {
      const t = (i + 0.5) / n
      chunks.push({ points: slice, t })
    }
  }
  return chunks
}

function modeColors(mode: DrivingMode, glow: number) {
  if (mode === 'sport') return { stroke: '#22d3ee', width: 6, opacity: 1 }
  if (mode === 'calm') return { stroke: '#60a5fa', width: 3, opacity: 0.6 }
  return { stroke: '#3b82f6', width: 3 + glow * 3, opacity: 0.5 + glow * 0.5 }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function MapKitMap({
  center,
  zoom,
  bearing = 0,
  pitch = 0,
  userLocation,
  gpsAccuracyMeters,
  vehicleHeading = 0,
  routePolyline,
  destinationCoordinate,
  traveledDistanceMeters,
  contentInsets,
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
  showLookAround,
  onDestinationDrag,
  offerZoneRadiusMeters,
  colorScheme = 'light',
  onMapReady,
  onPlaceSelected,
}: MapKitMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MKMap | null>(null)
  const routeOverlaysRef = useRef<unknown[]>([])
  const destAnnRef = useRef<MKAnnotation | null>(null)
  const offerAnnsRef = useRef<MKAnnotation[]>([])
  const reportAnnsRef = useRef<MKAnnotation[]>([])
  const [mapFailed, setMapFailed] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const navStartRef = useRef<number>(0)
  const traveledRef = useRef<{ lat: number; lng: number }[]>([])
  const traveledOverlayRef = useRef<unknown>(null)
  const attributionObserverRef = useRef<MutationObserver | null>(null)
  const [showTraffic, setShowTraffic] = useState(false)
  const gpsCircleRef = useRef<unknown>(null)
  const offerZoneOverlaysRef = useRef<unknown[]>([])
  const lookAroundRef = useRef<{ destroy: () => void } | null>(null)
  const lookAroundContainerRef = useRef<HTMLDivElement>(null)
  const [lookAroundActive, setLookAroundActive] = useState(false)
  const userInteractingRef = useRef(false)
  const interactionTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const lastAutoZoomRef = useRef(0)
  const pinnedAnnotationRef = useRef<MKAnnotation | null>(null)
  const userAnnRef = useRef<MKAnnotation | null>(null)

  // Cardinal direction label from map rotation (bearing)
  const cardinal = (() => {
    const b = ((bearing % 360) + 360) % 360
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const
    return dirs[Math.round(b / 45) % 8]
  })()

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
          showsCompass: mapkit.FeatureVisibility.Hidden,
          showsZoomControl: false,
          showsMapTypeControl: false,
          showsScale: mapkit.FeatureVisibility.Adaptive,
          showsUserLocation: false,
          tracksUserLocation: false,
          mapType: 'standard',
          colorScheme: colorScheme,
        } as Record<string, unknown>)
      } catch (e) {
        console.warn('MapKit Map creation failed:', e)
        setMapFailed(true)
        onMapError?.(`MapKit map creation failed: ${(e as Error)?.message || e}`)
        return
      }

      try {
        const m = map as unknown as Record<string, unknown>
        m.showsCompass = mapkit.FeatureVisibility.Hidden
        m.showsZoomControl = false
        m.showsMapTypeControl = false
        m.showsScale = mapkit.FeatureVisibility.Adaptive
        // showsUserLocation/tracksUserLocation set below after mapRef assignment
        m.isScrollEnabled = true
        m.isZoomEnabled = true
        m.isRotationEnabled = true
      } catch { /* non-critical */ }

      try {
        const delta = DELTA_FOR_ZOOM(zoom)
        const coord = new mapkit.Coordinate(center.lat, center.lng)
        const span = new mapkit.CoordinateSpan(delta, delta * 1.2)
        const region = new mapkit.CoordinateRegion(coord, span)
        map.setRegionAnimated(region, false)
      } catch { /* initial region non-critical */ }

      mapRef.current = map

      // Custom user location marker with heading beam used instead of native dot
      try {
        const m = map as unknown as Record<string, unknown>
        m.showsUserLocation = false
        m.tracksUserLocation = false
      } catch { /* non-critical */ }

      // Listen for user interaction: stop following and don't overwrite zoom/pan
      const stopFollowing = () => {
        userInteractingRef.current = true
        clearTimeout(interactionTimeoutRef.current)
        interactionTimeoutRef.current = setTimeout(() => {
          userInteractingRef.current = false
        }, 8000)
        try {
          const m = map as unknown as Record<string, unknown>
          if (m.tracksUserLocation !== undefined) m.tracksUserLocation = false
        } catch { /* non-critical */ }
      }
      try {
        const m = map as unknown as { addEventListener?: (e: string, cb: () => void) => void }
        if (m.addEventListener) {
          m.addEventListener('zoom-start', stopFollowing)
          m.addEventListener('pan-start', stopFollowing)
          m.addEventListener('scroll-start', stopFollowing)
        }
      } catch { /* MapKit event API may vary */ }

      const zoomToUser = (lat: number, lng: number, isNav: boolean) => {
        if (userInteractingRef.current) return
        const now = Date.now()
        if (now - lastAutoZoomRef.current < 10000) return
        lastAutoZoomRef.current = now
        try {
          const span = isNav
            ? new mapkit.CoordinateSpan(0.004, 0.004)
            : new mapkit.CoordinateSpan(0.01, 0.01)
          map.setRegionAnimated(
            new mapkit.CoordinateRegion(new mapkit.Coordinate(lat, lng), span),
            true
          )
        } catch { /* noop */ }
      }
      onMapReady?.(map, zoomToUser)

      // Enable selectable POI annotations
      if (onPlaceSelected) {
        try {
          const m = map as unknown as Record<string, unknown>
          if (m.selectableMapFeatures !== undefined) {
            const MapFeatureType = (window as unknown as { mapkit?: { MapFeatureType?: { PointOfInterest?: unknown } } }).mapkit?.MapFeatureType
            if (MapFeatureType?.PointOfInterest) {
              m.selectableMapFeatures = [MapFeatureType.PointOfInterest]
            }
          }
          const addEvent = m.addEventListener as ((e: string, cb: (ev: { annotation?: MKAnnotation; place?: { coordinate?: MKCoordinate; name?: string }; coordinate?: MKCoordinate }) => void) => void) | undefined
          if (addEvent) {
            addEvent('select', (event) => {
              const annotation = event.annotation
              const place = event.place
              const coord = place?.coordinate ?? (annotation as MKAnnotation)?.coordinate ?? event.coordinate
              const name = place?.name ?? (annotation as { title?: string })?.title ?? 'Selected Location'
              if (coord && onPlaceSelected) {
                if (pinnedAnnotationRef.current) {
                  try { map.removeAnnotation(pinnedAnnotationRef.current) } catch { /* noop */ }
                }
                const pin = new mapkit.MarkerAnnotation(
                  new mapkit.Coordinate(coord.latitude, coord.longitude),
                  { title: name, color: '#7C3AED', glyphColor: 'white', selected: true, calloutEnabled: true } as Record<string, unknown>
                )
                map.addAnnotation(pin)
                pinnedAnnotationRef.current = pin
                onPlaceSelected({ name, lat: coord.latitude, lng: coord.longitude })
              }
            })
          }
        } catch { /* MapKit POI API may vary */ }
      }

      // Reposition Apple Maps branding (safer than hiding - respects ToS)
      const isInsideAnnotation = (node: Element): boolean => {
        let cur: Element | null = node
        while (cur && cur !== el) {
          const cls = cur.className ?? ''
          const clsStr = typeof cls === 'string' ? cls : ''
          if (
            clsStr.includes('mk-annotation') ||
            clsStr.includes('mk-user-location') ||
            clsStr.includes('mk-marker') ||
            clsStr.includes('mk-overlay') ||
            cur.getAttribute('role') === 'img'
          ) return true
          cur = cur.parentElement
        }
        return false
      }

      const repositionBranding = () => {
        if (!el) return
        const style = document.createElement('style')
        style.textContent = `
          .mk-attribution, .mk-controls-container .mk-legal,
          [aria-label="Legal"], .mapkit-legal-link {
            opacity: 0.3 !important;
            transform: scale(0.7) !important;
            bottom: 4px !important;
          }
        `
        if (!document.getElementById('mapkit-branding-style')) {
          style.id = 'mapkit-branding-style'
          document.head.appendChild(style)
        }
      }
      const removeAttribution = repositionBranding
      removeAttribution()
      setTimeout(removeAttribution, 100)
      setTimeout(removeAttribution, 500)
      setTimeout(removeAttribution, 1500)
      const observer = new MutationObserver(removeAttribution)
      observer.observe(el, { childList: true, subtree: true })
      attributionObserverRef.current = observer
      setMapReady(true)
    }

    requestAnimationFrame(tryCreate)

    return () => {
      cancelled = true
      clearTimeout(interactionTimeoutRef.current)
      attributionObserverRef.current?.disconnect()
      attributionObserverRef.current = null
      const map = mapRef.current
      if (map) {
        try { map.destroy() } catch { /* already gone */ }
        mapRef.current = null
      }
      destAnnRef.current = null
      pinnedAnnotationRef.current = null
      userAnnRef.current = null
      routeOverlaysRef.current = []
    }
    // mount-only: we update region/annotations via separate effects
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---------- Effect 2: Update region (center + zoom + bearing) — skip when user is interacting so zoom/pan aren't overwritten ---------- */
  const setRegion = useCallback(() => {
    const mapkit = mk()
    const map = mapRef.current
    if (!mapkit || !map) return
    if (userInteractingRef.current) return
    const m = map as unknown as Record<string, unknown>
    try {
      if (isNavigating) {
        m.tracksUserLocation = false
        const delta = DELTA_FOR_ZOOM(zoom)
        const span = new mapkit.CoordinateSpan(delta, delta * 1.2)
        const coord = new mapkit.Coordinate(center.lat, center.lng)
        const region = new mapkit.CoordinateRegion(coord, span)
        map.setRegionAnimated(region, true)
        map.rotation = -vehicleHeading
        return
      }
      // When not navigating: use MapKit native follow (like Apple Maps) so the map moves with you
      m.tracksUserLocation = true
      // Do not set region from props — let the map follow the user natively and preserve user's zoom/pan
      if (typeof bearing === 'number' && bearing !== 0) {
        map.rotation = -bearing
      } else {
        map.rotation = 0
      }
    } catch (e) {
      console.warn('MapKit setRegion failed:', e)
    }
  }, [center.lat, center.lng, zoom, bearing, pitch, isNavigating, vehicleHeading])

  useEffect(() => { setRegion() }, [setRegion])

  useEffect(() => {
    if (isNavigating) {
      navStartRef.current = Date.now()
      traveledRef.current = []
    }
  }, [isNavigating])

  /* ---------- Effect 3: Gradient route polyline (blue→green, shadow, traveled gray) ---------- */
  useEffect(() => {
    const mapkit = mk()
    const map = mapRef.current
    if (!mapkit || !map) return

    routeOverlaysRef.current.forEach((o) => {
      try { map.removeOverlay(o) } catch { /* noop */ }
    })
    routeOverlaysRef.current = []

    if (!routePolyline || routePolyline.length < 2) return

    try {
      const totalLen = cumulativeDistance(routePolyline)
      const totalMeters = totalLen[totalLen.length - 1] ?? 0

      let traveled: { lat: number; lng: number }[] = []
      let remaining: { lat: number; lng: number }[] = []

      if (typeof traveledDistanceMeters === 'number' && traveledDistanceMeters > 0 && totalMeters > 0) {
        const traveledM = Math.min(traveledDistanceMeters, totalMeters)
        let idx = 0
        for (; idx < totalLen.length; idx++) {
          if ((totalLen[idx] ?? 0) >= traveledM) break
        }
        idx = Math.max(1, idx)
        traveled = routePolyline.slice(0, idx)
        remaining = routePolyline.slice(idx - 1)
      } else {
        remaining = routePolyline
      }

      const baseStyle = { lineCap: 'round' as const, lineJoin: 'round' as const }

      // 1. Shadow line: full path shifted ~1px down (lat offset) for depth, 10px width, #1a365d 30% opacity
      const SHADOW_OFFSET_LAT = -0.00001
      const shadowCoords = routePolyline.map((p) => new mapkit.Coordinate(p.lat + SHADOW_OFFSET_LAT, p.lng))
      const shadowStyle = new mapkit.Style({
        ...baseStyle,
        strokeColor: '#1a365d',
        lineWidth: 10,
        strokeOpacity: 0.3,
      })
      const shadowOverlay = new mapkit.PolylineOverlay(shadowCoords, { style: shadowStyle })
      map.addOverlay(shadowOverlay)
      routeOverlaysRef.current.push(shadowOverlay)

      // 2. Traveled portion (gray #94A3B8 40% opacity)
      if (traveled.length >= 2) {
        const traveledCoords = traveled.map((p) => new mapkit.Coordinate(p.lat, p.lng))
        const grayStyle = new mapkit.Style({
          ...baseStyle,
          strokeColor: '#94A3B8',
          lineWidth: 7,
          strokeOpacity: 0.4,
        })
        const grayOverlay = new mapkit.PolylineOverlay(traveledCoords, { style: grayStyle })
        map.addOverlay(grayOverlay)
        routeOverlaysRef.current.push(grayOverlay)
      }

      // 3. Remaining portion: gradient segments (blue #4A89F3 → green #34D399)
      const nSegments = 25
      const chunks = chunkPolyline(remaining, nSegments)
      chunks.forEach(({ points, t }) => {
        const coords = points.map((p) => new mapkit.Coordinate(p.lat, p.lng))
        const color = interpolateColor('#4A89F3', '#34D399', t)
        const style = new mapkit.Style({
          ...baseStyle,
          strokeColor: color,
          lineWidth: 7,
          strokeOpacity: 1,
        })
        const overlay = new mapkit.PolylineOverlay(coords, { style })
        map.addOverlay(overlay)
        routeOverlaysRef.current.push(overlay)
      })

      // Fit map to show the full route only when not navigating (so camera can follow user during nav)
      if (!isNavigating) {
        let minLat = routePolyline[0].lat
        let maxLat = routePolyline[0].lat
        let minLng = routePolyline[0].lng
        let maxLng = routePolyline[0].lng
        for (let i = 1; i < routePolyline.length; i++) {
          const p = routePolyline[i]
          minLat = Math.min(minLat, p.lat)
          maxLat = Math.max(maxLat, p.lat)
          minLng = Math.min(minLng, p.lng)
          maxLng = Math.max(maxLng, p.lng)
        }
        const centerLat = (minLat + maxLat) / 2
        const centerLng = (minLng + maxLng) / 2
        const deltaLat = Math.max(0.01, (maxLat - minLat) * 1.4)
        const deltaLng = Math.max(0.01, (maxLng - minLng) * 1.4)
        const coord = new mapkit.Coordinate(centerLat, centerLng)
        const span = new mapkit.CoordinateSpan(deltaLat, deltaLng)
        map.setRegionAnimated(new mapkit.CoordinateRegion(coord, span), true)
      }
    } catch (e) {
      console.warn('MapKit polyline overlay failed:', e)
    }
  }, [routePolyline, traveledDistanceMeters, mapReady, isNavigating])

  /* ---------- Effect 5b: GPS-breadcrumb traveled trail ---------- */
  useEffect(() => {
    const mapkit = mk()
    const map = mapRef.current
    if (!mapkit || !map || !mapReady) return

    if (!isNavigating) {
      if (traveledOverlayRef.current) {
        try { map.removeOverlay(traveledOverlayRef.current as Parameters<typeof map.removeOverlay>[0]) } catch { /* noop */ }
        traveledOverlayRef.current = null
      }
      traveledRef.current = []
      return
    }

    const last = traveledRef.current[traveledRef.current.length - 1]
    if (!last || Math.abs(last.lat - userLocation.lat) > 0.00001 || Math.abs(last.lng - userLocation.lng) > 0.00001) {
      traveledRef.current.push({ lat: userLocation.lat, lng: userLocation.lng })
    }

    if (traveledRef.current.length < 2) return

    if (traveledOverlayRef.current) {
      try { map.removeOverlay(traveledOverlayRef.current as Parameters<typeof map.removeOverlay>[0]) } catch { /* noop */ }
    }

    try {
      const coords = traveledRef.current.map(p => new mapkit.Coordinate(p.lat, p.lng))
      const style = new mapkit.Style({
        lineWidth: 5,
        strokeColor: '#94A3B8',
        strokeOpacity: 0.5,
        lineCap: 'round',
        lineJoin: 'round',
      } as Record<string, unknown>)
      const overlay = new mapkit.PolylineOverlay(coords, { style })
      map.addOverlay(overlay)
      traveledOverlayRef.current = overlay
    } catch { /* noop */ }
  }, [userLocation.lat, userLocation.lng, isNavigating, mapReady])

  /* ---------- Effect 6: Destination marker (dark blue pin) ---------- */
  useEffect(() => {
    const mapkit = mk()
    const map = mapRef.current
    if (!mapkit || !map) return

    if (destAnnRef.current) {
      try { map.removeAnnotation(destAnnRef.current) } catch { /* noop */ }
      destAnnRef.current = null
    }

    if (!destinationCoordinate?.lat || !destinationCoordinate?.lng) return

    try {
      const coord = new mapkit.Coordinate(destinationCoordinate.lat, destinationCoordinate.lng)

      const factory = () => {
        const el = document.createElement('div')
        el.style.cssText = 'width:40px;height:52px;position:relative;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));animation:bounce-in 0.5s ease-out;'
        el.innerHTML = `<svg width="40" height="52" viewBox="0 0 40 52" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 0C8.954 0 0 8.954 0 20c0 15 20 32 20 32s20-17 20-32C40 8.954 31.046 0 20 0z" fill="#1E3A5F"/>
          <circle cx="20" cy="20" r="8" fill="white"/>
          <circle cx="20" cy="20" r="3" fill="#1E3A5F"/>
        </svg>`
        return el
      }

      const ann = new mapkit.Annotation(coord, factory, {
        anchorOffset: new DOMPoint(0, 0),
        animates: false,
        draggable: !!onDestinationDrag,
      })
      if (onDestinationDrag) {
        try {
          (ann as unknown as { addEventListener?: (type: string, cb: (e: unknown) => void) => void })
            .addEventListener?.('drag-end', (e: unknown) => {
              const evt = e as { coordinate?: { latitude: number; longitude: number } }
              if (evt.coordinate) {
                onDestinationDrag({ lat: evt.coordinate.latitude, lng: evt.coordinate.longitude })
              }
            })
        } catch { /* noop */ }
      }
      map.addAnnotation(ann)
      destAnnRef.current = ann
    } catch (e) {
      console.warn('MapKit destination annotation failed:', e)
    }
  }, [destinationCoordinate?.lat, destinationCoordinate?.lng, mapReady])

  /* ---------- Effect 6b: Custom user location marker (cone + ring + dot, heading beam) ---------- */
  useEffect(() => {
    const mapkit = mk()
    const map = mapRef.current
    if (!mapkit || !map || !mapReady) return

    if (userAnnRef.current) {
      try { map.removeAnnotation(userAnnRef.current) } catch { /* noop */ }
      userAnnRef.current = null
    }

    const factory = () => {
      const container = document.createElement('div')
      container.id = 'user-location-marker'
      container.style.cssText = `
        width: 80px;
        height: 80px;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
      `
      const cone = document.createElement('div')
      cone.id = 'user-heading-cone'
      cone.style.cssText = `
        position: absolute;
        bottom: calc(50% - 2px);
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 18px solid transparent;
        border-right: 18px solid transparent;
        border-bottom: 42px solid rgba(0,122,255,0.2);
        filter: blur(3px);
        transform-origin: 50% 100%;
      `
      const ring = document.createElement('div')
      ring.style.cssText = `
        position: absolute;
        width: 54px;
        height: 54px;
        border-radius: 50%;
        background: rgba(0,122,255,0.1);
        border: 1.5px solid rgba(0,122,255,0.25);
        animation: sr-pulse 2.5s ease-out infinite;
      `
      const dot = document.createElement('div')
      dot.style.cssText = `
        position: absolute;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #007AFF;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,122,255,0.6);
        z-index: 2;
      `
      container.appendChild(cone)
      container.appendChild(ring)
      container.appendChild(dot)
      return container
    }

    try {
      const coord = new mapkit.Coordinate(userLocation.lat, userLocation.lng)
      const ann = new mapkit.Annotation(coord, factory, {
        anchorOffset: new DOMPoint(0, 0),
        animates: false,
      } as Record<string, unknown>)
      map.addAnnotation(ann)
      userAnnRef.current = ann
    } catch (e) {
      console.warn('MapKit user location annotation failed:', e)
    }
  }, [mapReady])

  /* ---------- Effect 6c: Update user marker position and rotation ---------- */
  useEffect(() => {
    const mapkit = mk()
    if (!mapkit || !userAnnRef.current) return
    try {
      const ann = userAnnRef.current as unknown as { coordinate?: unknown }
      ann.coordinate = new mapkit.Coordinate(userLocation.lat, userLocation.lng)
      const markerEl = document.getElementById('user-location-marker')
      if (markerEl && typeof vehicleHeading === 'number') {
        markerEl.style.transform = `rotate(${vehicleHeading}deg)`
        markerEl.style.transition = 'transform 0.3s ease'
      }
    } catch { /* noop */ }
  }, [userLocation.lat, userLocation.lng, vehicleHeading])

  /* ---------- Effect 7: Offer markers with clustering ---------- */
  useEffect(() => {
    const mapkit = mk()
    const map = mapRef.current
    if (!mapkit || !map) return

    offerAnnsRef.current.forEach((a) => { try { map.removeAnnotation(a) } catch { /* noop */ } })
    offerAnnsRef.current = []

    const visible = offers.filter((o) => !o.redeemed && o.lat && o.lng).slice(0, 8)
    const annotations: MKAnnotation[] = []

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
        const ann = new mapkit.Annotation(coord, factory, {
          anchorOffset: new DOMPoint(0, 0),
          animates: false,
          clusteringIdentifier: 'offers',
        })
        annotations.push(ann)
      } catch (e) {
        console.warn('MapKit offer annotation failed:', e)
      }
    })

    const MK = mapkit as unknown as {
      AnnotationClusterFactory?: {
        create?: (anns: unknown[], opts?: Record<string, unknown>) => unknown
      }
    }

    if (annotations.length > 0) {
      try {
        const clusterFactory = () => {
          const el = document.createElement('div')
          el.style.cssText = 'width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#10b981);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(59,130,246,0.4);border:2px solid white;font-size:12px;font-weight:700;color:white;'
          el.textContent = String(annotations.length)
          return el
        }

        const mapAny = map as unknown as { annotationForCluster?: (cluster: unknown) => unknown }
        if (typeof mapAny.annotationForCluster === 'undefined') {
          try {
            (map as unknown as Record<string, unknown>).annotationForCluster = (cluster: unknown) => {
              const c = cluster as { memberAnnotations?: unknown[]; coordinate?: MKCoordinate }
              const count = c.memberAnnotations?.length ?? 0
              return new mapkit.Annotation(
                c.coordinate ?? new mapkit.Coordinate(0, 0),
                () => {
                  const el = document.createElement('div')
                  el.style.cssText = 'width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#10b981);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(59,130,246,0.4);border:2px solid white;font-size:12px;font-weight:700;color:white;'
                  el.textContent = String(count)
                  return el
                },
                { anchorOffset: new DOMPoint(0, 0), animates: false }
              )
            }
          } catch { /* noop */ }
        }
      } catch { /* clustering setup non-critical */ }

      annotations.forEach(ann => {
        map.addAnnotation(ann)
        offerAnnsRef.current.push(ann)
      })
    }
  }, [offers, onOfferClick])

  /* ---------- Effect 8: Road report markers ---------- */
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
  }, [roadReports])

  /* ---------- Effect: Apply colorScheme prop to map ---------- */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    try {
      (map as unknown as Record<string, unknown>).colorScheme = colorScheme
    } catch { /* noop */ }
  }, [colorScheme, mapReady])

  /* ---------- Effect: Rotate map to face direction of travel during navigation ---------- */
  useEffect(() => {
    const map = mapRef.current as unknown as MKMap & { rotation?: number }
    if (!map || !mapReady) return
    try {
      if (isNavigating && typeof vehicleHeading === 'number') {
        map.rotation = -vehicleHeading
      } else {
        map.rotation = 0
      }
    } catch { /* noop */ }
  }, [vehicleHeading, isNavigating, mapReady])

  /* ---------- Effect 9: Traffic overlay toggle ---------- */
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    try {
      (map as unknown as Record<string, unknown>).showsTrafficIncidents = showTraffic
    } catch { /* noop */ }
  }, [showTraffic, mapReady])

  /* ---------- Effect 10: GPS accuracy circle ---------- */
  useEffect(() => {
    const mapkit = mk()
    const map = mapRef.current
    if (!mapkit || !map || !mapReady) return

    if (gpsCircleRef.current) {
      try { map.removeOverlay(gpsCircleRef.current as Parameters<typeof map.removeOverlay>[0]) } catch { /* noop */ }
      gpsCircleRef.current = null
    }

    if (!gpsAccuracyMeters || gpsAccuracyMeters < 10) return

    try {
      const MK = mapkit as unknown as { CircleOverlay?: new (coord: unknown, radius: number, opts?: Record<string, unknown>) => unknown }
      if (!MK.CircleOverlay) return
      const coord = new mapkit.Coordinate(userLocation.lat, userLocation.lng)
      const style = new mapkit.Style({
        strokeColor: '#3b82f6',
        strokeOpacity: 0.3,
        lineWidth: 1,
        fillColor: '#3b82f6',
        fillOpacity: 0.08,
      } as Record<string, unknown>)
      const circle = new MK.CircleOverlay(coord, gpsAccuracyMeters, { style })
      map.addOverlay(circle)
      gpsCircleRef.current = circle
    } catch { /* CircleOverlay may not be available */ }
  }, [userLocation.lat, userLocation.lng, gpsAccuracyMeters, mapReady])

  /* ---------- Effect 11: Offer zone circle overlays ---------- */
  useEffect(() => {
    const mapkit = mk()
    const map = mapRef.current
    if (!mapkit || !map || !mapReady) return

    offerZoneOverlaysRef.current.forEach(o => {
      try { map.removeOverlay(o as Parameters<typeof map.removeOverlay>[0]) } catch { /* noop */ }
    })
    offerZoneOverlaysRef.current = []

    if (!offerZoneRadiusMeters || offerZoneRadiusMeters < 1) return

    const MK = mapkit as unknown as { CircleOverlay?: new (coord: unknown, radius: number, opts?: Record<string, unknown>) => unknown }
    if (!MK.CircleOverlay) return

    const visible = offers.filter(o => !o.redeemed && o.lat && o.lng).slice(0, 8)
    visible.forEach(offer => {
      try {
        const coord = new mapkit.Coordinate(offer.lat!, offer.lng!)
        const style = new mapkit.Style({
          strokeColor: '#10b981',
          strokeOpacity: 0.25,
          lineWidth: 1,
          fillColor: '#10b981',
          fillOpacity: 0.06,
        } as Record<string, unknown>)
        const circle = new MK.CircleOverlay(coord, offerZoneRadiusMeters, { style })
        map.addOverlay(circle)
        offerZoneOverlaysRef.current.push(circle)
      } catch { /* noop */ }
    })
  }, [offers, offerZoneRadiusMeters, mapReady])

  /* ---------- Effect 12: Look Around viewer ---------- */
  useEffect(() => {
    if (lookAroundRef.current) {
      lookAroundRef.current.destroy()
      lookAroundRef.current = null
    }
    setLookAroundActive(false)

    if (!showLookAround || !destinationCoordinate?.lat || !destinationCoordinate?.lng) return
    if (!lookAroundContainerRef.current) return

    const scene = createLookAroundScene(
      lookAroundContainerRef.current,
      destinationCoordinate.lat,
      destinationCoordinate.lng
    )
    if (scene) {
      lookAroundRef.current = scene
      setLookAroundActive(true)
    }

    return () => {
      lookAroundRef.current?.destroy()
      lookAroundRef.current = null
    }
  }, [showLookAround, destinationCoordinate?.lat, destinationCoordinate?.lng])

  /* ---------- Mode edge tint ---------- */
  const edgeTint =
    mode === 'sport'
      ? 'linear-gradient(180deg, rgba(239,68,68,0.12) 0%, transparent 30%, transparent 70%, rgba(239,68,68,0.08) 100%)'
      : mode === 'calm'
        ? 'linear-gradient(180deg, rgba(96,165,250,0.1) 0%, transparent 30%, transparent 70%, rgba(96,165,250,0.06) 100%)'
        : 'none'

  if (mapFailed) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
      }}
    >
      <div
        ref={containerRef}
        className="mapkit-clean"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
        }}
      />

      {/* Mode edge tint overlay */}
      <div className="absolute inset-0 pointer-events-none z-[5]" style={{ background: edgeTint }} />

      {/* Live GPS badge - hidden during navigation for clean nav mode */}
      {!isNavigating && isLiveGps && (
        <div className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded-full bg-emerald-500/90 text-white text-[10px] font-medium flex items-center gap-1">
          <Navigation2 size={10} className="animate-pulse" /> Live GPS
        </div>
      )}

      {/* Floating controls - hidden during navigation for clean nav mode */}
      {!isNavigating && (
      <div className="absolute right-3 bottom-24 z-30 flex flex-col gap-2">
        <button
          type="button"
          onClick={onOrionClick}
          className="w-11 h-11 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          style={{ boxShadow: '0 4px 15px rgba(139,92,246,0.4)' }}
        >
          <Mic className="text-white" size={20} />
        </button>
        {/* Grouped controls card - Baidu panel: light gray bg, subtle border, padding */}
        <div className="bg-gray-50/98 backdrop-blur-md rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col items-center w-11 py-1">
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
          {/* Layers / map type toggle — cycles: standard → satellite → hybrid → standard+traffic */}
          <button
            type="button"
            onClick={() => {
              const m = mapRef.current
              if (!m) return
              const mAny = m as unknown as { mapType: string }
              const cur = mAny.mapType || 'standard'
              if (cur === 'standard' && !showTraffic) {
                mAny.mapType = 'satellite'
              } else if (cur === 'satellite') {
                mAny.mapType = 'hybrid'
              } else if (cur === 'hybrid') {
                mAny.mapType = 'standard'
                setShowTraffic(true)
              } else {
                mAny.mapType = 'standard'
                setShowTraffic(false)
              }
            }}
            className="w-11 h-10 flex items-center justify-center active:bg-gray-200/80 transition-colors rounded-b-lg"
          >
            <Layers className={showTraffic ? 'text-orange-500' : 'text-slate-600'} size={17} />
          </button>
        </div>

        {/* Recenter / location button — re-enable follow mode so map moves with you like Apple Maps */}
        <button
          type="button"
          onClick={() => {
            userInteractingRef.current = false
            clearTimeout(interactionTimeoutRef.current)
            const map = mapRef.current
            if (map) {
              try {
                const m = map as unknown as Record<string, unknown>
                if (m.tracksUserLocation !== undefined) m.tracksUserLocation = true
              } catch { /* noop */ }
              if (isNavigating) {
                const mapkit = mk()
                if (mapkit) {
                  const span = new mapkit.CoordinateSpan(0.003, 0.003)
                  const region = new mapkit.CoordinateRegion(
                    new mapkit.Coordinate(userLocation.lat, userLocation.lng),
                    span
                  )
                  map.setRegionAnimated(region, true)
                }
              }
            }
            onRecenter?.()
          }}
          className="w-11 h-10 bg-gray-50/98 backdrop-blur-md rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.12)] flex items-center justify-center active:bg-gray-200/80 transition-colors"
        >
          <Locate className="text-slate-600" size={18} />
        </button>
      </div>
      )}

      {/* Compass indicator -- shown when bearing is non-zero, hidden during navigation */}
      {!isNavigating && bearing !== 0 && (
        <button
          type="button"
          onClick={onRecenter}
          className="absolute top-[72px] left-3 z-20 w-9 h-9 bg-slate-900/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg border border-white/10 active:scale-95 transition-transform"
        >
          <Compass size={18} className="text-white" style={{ transform: `rotate(${-bearing}deg)`, transition: 'transform .3s ease' }} />
        </button>
      )}

      {/* Look Around street-level viewer - hidden during navigation */}
      {!isNavigating && showLookAround && destinationCoordinate && (
        <div className={`absolute top-2 left-2 right-14 z-40 rounded-xl overflow-hidden shadow-xl border border-white/20 transition-all duration-300 ${lookAroundActive ? 'h-48 opacity-100' : 'h-0 opacity-0'}`}>
          <div ref={lookAroundContainerRef} className="w-full h-full bg-slate-800" />
          <div className="absolute top-2 right-2 flex items-center gap-1">
            <div className="px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-medium flex items-center gap-1">
              <Eye size={10} /> Look Around
            </div>
          </div>
        </div>
      )}

      {/* SnapRoad Map branding (replaces third-party attribution) */}
      <div className="absolute bottom-1 left-1 z-20 text-[10px] font-medium text-slate-500 pointer-events-none">
        SnapRoad Map
      </div>
    </div>
  )
}
