/**
 * Google Maps–based SnapRoad map component.
 * Same props surface as MapKitMap: route polyline (passed/transition/ahead), trip history,
 * user/destination/offers/road-report markers, zoomToUser via onMapReady.
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { Navigation2 } from 'lucide-react'
import type { DrivingMode } from '@/core/types'
import { getGoogleMapId } from '@/lib/googleMaps'

/* ------------------------------------------------------------------ */
/*  Types (mirror MapKitMap)                                           */
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

export interface GoogleMapSnapRoadProps {
  center: { lat: number; lng: number }
  zoom: number
  bearing?: number
  pitch?: number
  userLocation: { lat: number; lng: number }
  gpsAccuracyMeters?: number
  vehicleHeading?: number
  routePolyline?: { lat: number; lng: number }[]
  tripHistoryPolylines?: { lat: number; lng: number }[][]
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
  onMapReady?: (map: unknown, zoomToUser: (lat: number, lng: number, isNavigating: boolean) => void, actions?: { resetHeading: () => void; clearUserInteracting: () => void }) => void
  onPlaceSelected?: (place: { name: string; lat: number; lng: number }) => void
  onMapClick?: (lat: number, lng: number) => void
  /** When set, map fits bounds to show the full route (e.g. when route preview is open). */
  fitToRoutePolyline?: { lat: number; lng: number }[] | null
  /** For step markers on the route during navigation. */
  navigationSteps?: Array<{ instruction?: string; distanceMeters?: number; maneuver?: string }>
  currentStepIndex?: number
  /** Map type: standard (roadmap), satellite, hybrid, dark. */
  mapType?: 'standard' | 'satellite' | 'hybrid' | 'dark'
  /** When provided, traffic layer is controlled from parent (layer picker). */
  showTraffic?: boolean
  /** When provided, Layers button opens this instead of toggling traffic. */
  onOpenLayerPicker?: () => void
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

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

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('')
}

function interpolateColor(hex1: string, hex2: string, t: number): string {
  const a = hexToRgb(hex1)
  const b = hexToRgb(hex2)
  if (!a || !b) return hex1
  const r = Math.round(a.r + (b.r - a.r) * t)
  const g = Math.round(a.g + (b.g - a.g) * t)
  const bl = Math.round(a.b + (b.b - a.b) * t)
  return rgbToHex(r, g, bl)
}

function chunkPolyline(
  points: { lat: number; lng: number }[],
  N: number
): Array<{ points: { lat: number; lng: number }[]; t: number }> {
  if (points.length < 2 || N < 1) return []
  const totalLen = cumulativeDistance(points)
  const totalM = totalLen[totalLen.length - 1] ?? 0
  if (totalM <= 0) return [{ points, t: 0.5 }]
  const chunks: Array<{ points: { lat: number; lng: number }[]; t: number }> = []
  for (let seg = 0; seg < N; seg++) {
    const t0 = seg / N
    const t1 = (seg + 1) / N
    const d0 = t0 * totalM
    const d1 = t1 * totalM
    let i0 = 0
    let i1 = totalLen.length - 1
    for (let i = 0; i < totalLen.length; i++) {
      if ((totalLen[i] ?? 0) >= d0) {
        i0 = i
        break
      }
    }
    for (let i = i0; i < totalLen.length; i++) {
      if ((totalLen[i] ?? 0) >= d1) {
        i1 = i
        break
      }
    }
    i1 = Math.min(i1 + 1, points.length)
    const segPoints = points.slice(i0, i1)
    if (segPoints.length >= 2) {
      chunks.push({ points: segPoints, t: (t0 + t1) / 2 })
    }
  }
  return chunks
}

/** Returns { lat, lng } at the given distance (meters) along the path. */
function getPointAtDistance(
  points: { lat: number; lng: number }[],
  cumulativeDistances: number[],
  distanceMeters: number
): { lat: number; lng: number } | null {
  if (points.length === 0 || cumulativeDistances.length !== points.length) return null
  const total = cumulativeDistances[cumulativeDistances.length - 1] ?? 0
  if (total <= 0) return points[0] ?? null
  const d = Math.max(0, Math.min(distanceMeters, total))
  let i = 0
  for (; i < cumulativeDistances.length; i++) {
    if ((cumulativeDistances[i] ?? 0) >= d) break
  }
  i = Math.min(i, cumulativeDistances.length - 1)
  if (i === 0) return points[0] ?? null
  const d0 = cumulativeDistances[i - 1] ?? 0
  const d1 = cumulativeDistances[i] ?? d0
  const t = d1 > d0 ? (d - d0) / (d1 - d0) : 0
  const p0 = points[i - 1]
  const p1 = points[i]
  if (!p0 || !p1) return p0 ?? p1 ?? null
  return {
    lat: p0.lat + (p1.lat - p0.lat) * t,
    lng: p0.lng + (p1.lng - p0.lng) * t,
  }
}

const ROUTE_PASSED = '#C0C0BA'
const ROUTE_TRANSITION = '#5AAA7A'
const ROUTE_AHEAD = '#2563eb'
const TRANSITION_METERS = 500

function modeColors(mode: DrivingMode): { stroke: string; width: number; opacity: number } {
  if (mode === 'sport') return { stroke: '#22d3ee', width: 10, opacity: 1 }
  if (mode === 'calm') return { stroke: '#60a5fa', width: 8, opacity: 0.85 }
  return { stroke: '#2563eb', width: 9, opacity: 0.95 }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function GoogleMapSnapRoad({
  center,
  zoom,
  bearing = 0,
  userLocation,
  gpsAccuracyMeters,
  vehicleHeading = 0,
  routePolyline,
  tripHistoryPolylines = [],
  destinationCoordinate,
  traveledDistanceMeters,
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
  colorScheme = 'light',
  onMapReady,
  onMapClick,
  fitToRoutePolyline,
  navigationSteps,
  currentStepIndex = 0,
  mapType = 'standard',
  showTraffic: showTrafficProp,
  onOpenLayerPicker,
}: GoogleMapSnapRoadProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null)
  const [trafficVisibleInternal, setTrafficVisibleInternal] = useState(false)
  const trafficVisible = typeof showTrafficProp === 'boolean' ? showTrafficProp : trafficVisibleInternal
  const onMapClickRef = useRef(onMapClick)
  onMapClickRef.current = onMapClick
  const routePolylinesRef = useRef<google.maps.Polyline[]>([])
  const routeStepMarkersRef = useRef<google.maps.Marker[]>([])
  const historyPolylinesRef = useRef<google.maps.Polyline[]>([])
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([])
  const markersLegacyRef = useRef<google.maps.Marker[]>([])
  const circleRef = useRef<google.maps.Circle | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const lastAutoZoomRef = useRef(0)
  const userInteractingRef = useRef(false)
  const interactionTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  /* ---------- Effect 1: Create map once on mount ---------- */
  useEffect(() => {
    const g = window.google
    if (!g?.maps || !containerRef.current) {
      onMapError?.('Google Maps not available')
      return
    }

    const el = containerRef.current
    const mapId = getGoogleMapId()
    const map = new g.maps.Map(el, {
      center: { lat: center.lat, lng: center.lng },
      zoom: Math.min(20, Math.max(8, zoom)),
      tilt: 45,
      heading: bearing ?? 0,
      mapId: mapId || undefined,
      disableDefaultUI: false,
      gestureHandling: 'greedy',
      zoomControl: false,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      scaleControl: false,
      myLocationButton: false,
      clickableIcons: true,
      styles: colorScheme === 'dark' ? [{ elementType: 'geometry', stylers: [{ color: '#242f3e' }] }] : undefined,
    })

    mapRef.current = map

    // Traffic layer: only create when parent does not control layers (no layer picker)
    if (!onOpenLayerPicker) {
      try {
        const trafficLayer = new g.maps.TrafficLayer()
        trafficLayerRef.current = trafficLayer
      } catch {
        trafficLayerRef.current = null
      }
    }

    const stopFollowing = () => {
      userInteractingRef.current = true
      clearTimeout(interactionTimeoutRef.current!)
      interactionTimeoutRef.current = setTimeout(() => {
        userInteractingRef.current = false
      }, 8000)
    }
    map.addListener('dragstart', stopFollowing)
    map.addListener('zoom_changed', stopFollowing)
    map.addListener('click', (e: google.maps.MapMouseEvent) => {
      const latLng = e.latLng
      if (latLng) onMapClickRef.current?.(latLng.lat(), latLng.lng())
    })

    const zoomToUser = (lat: number, lng: number, isNav: boolean) => {
      if (userInteractingRef.current && !isNav) return
      const now = Date.now()
      const throttleMs = isNav ? 2000 : 10000
      if (now - lastAutoZoomRef.current < throttleMs) return
      lastAutoZoomRef.current = now
      map.moveCamera({
        center: { lat, lng },
        zoom: isNav ? 18 : 14,
        heading: map.getHeading?.() ?? 0,
        tilt: map.getTilt?.() ?? 45,
      })
    }
    onMapReady?.(map, zoomToUser, {
      resetHeading: () => {
        map.moveCamera({ heading: 0, tilt: 0 })
      },
      clearUserInteracting: () => {
        userInteractingRef.current = false
        clearTimeout(interactionTimeoutRef.current!)
      },
    })
    setMapReady(true)

    return () => {
      trafficLayerRef.current?.setMap(null)
      trafficLayerRef.current = null
      clearTimeout(interactionTimeoutRef.current)
      routePolylinesRef.current.forEach((p) => p.setMap(null))
      routePolylinesRef.current = []
      routeStepMarkersRef.current.forEach((m) => m.setMap(null))
      routeStepMarkersRef.current = []
      historyPolylinesRef.current.forEach((p) => p.setMap(null))
      historyPolylinesRef.current = []
      markersRef.current.forEach((m) => (m.map = null))
      markersRef.current = []
      markersLegacyRef.current.forEach((m) => m.setMap(null))
      markersLegacyRef.current = []
      circleRef.current?.setMap(null)
      circleRef.current = null
      mapRef.current = null
    }
  }, [])

  /* ---------- Effect: Traffic layer off during navigation; toggle when not navigating (skip when parent controls via layer picker) ---------- */
  useEffect(() => {
    if (onOpenLayerPicker) return
    const map = mapRef.current
    const layer = trafficLayerRef.current
    if (!map || !layer) return
    if (isNavigating) {
      layer.setMap(null)
    } else {
      layer.setMap(trafficVisible ? map : null)
    }
  }, [onOpenLayerPicker, isNavigating, trafficVisible])

  /* ---------- Effect: Apply map type based on parent-provided mapType ---------- */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    try {
      switch (mapType) {
        case 'satellite':
          map.setMapTypeId?.('satellite')
          map.setOptions?.({ styles: undefined })
          break
        case 'hybrid':
          map.setMapTypeId?.('hybrid')
          map.setOptions?.({ styles: undefined })
          break
        case 'dark':
          map.setMapTypeId?.('roadmap')
          map.setOptions?.({
            styles: [
              { elementType: 'geometry', stylers: [{ color: '#1C1C1E' }] },
              { elementType: 'labels.text.stroke', stylers: [{ color: '#1C1C1E' }] },
              { elementType: 'labels.text.fill', stylers: [{ color: '#f9fafb' }] },
              { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#27272f' }] },
              { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3b82f6' }] },
              { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#e5e7eb' }] },
              { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
            ],
          })
          break
        case 'standard':
        default:
          map.setMapTypeId?.('roadmap')
          map.setOptions?.({ styles: colorScheme === 'dark' ? [{ elementType: 'geometry', stylers: [{ color: '#242f3e' }] }] : undefined })
          break
      }
    } catch {
      // ignore
    }
  }, [mapType, mapReady, colorScheme])

  /* ---------- Effect 2: Update camera (center, zoom, bearing). Skip when navigating — NavigationCamera drives 3D nav camera. ---------- */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    if (isNavigating) return // Parent (index) drives camera via NavigationCamera
    if (userInteractingRef.current) return

    const lat = center.lat
    const lng = center.lng
    const z = Math.min(20, Math.max(8, zoom))
    const heading = bearing ?? 0

    map.moveCamera({
      center: { lat, lng },
      zoom: z,
      heading,
      tilt: 45,
    })
  }, [center.lat, center.lng, zoom, bearing, isNavigating, mapReady])

  /* ---------- Effect 2c: When navigation starts, force a consistent street-level zoom immediately. ---------- */
  const hasDoneInitialNavZoomRef = useRef(false)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady || !isNavigating) return
    if (hasDoneInitialNavZoomRef.current) return
    hasDoneInitialNavZoomRef.current = true
    const lat = center.lat
    const lng = center.lng
    const heading = typeof vehicleHeading === 'number' ? vehicleHeading : 0
    map.moveCamera({
      center: { lat, lng },
      zoom: 18, // standard nav zoom
      tilt: 60,
      heading,
    })
  }, [isNavigating, mapReady, center.lat, center.lng, vehicleHeading])
  useEffect(() => {
    if (!isNavigating) hasDoneInitialNavZoomRef.current = false
  }, [isNavigating])

  /* ---------- Effect 2b: Fit map to route when preview is shown (clean view of full blue line) ---------- */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady || !fitToRoutePolyline || fitToRoutePolyline.length < 2) return
    const bounds = new google.maps.LatLngBounds()
    fitToRoutePolyline.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }))
    map.fitBounds(bounds, { top: 120, right: 24, bottom: 280, left: 24 })
  }, [mapReady, fitToRoutePolyline])

  /* ---------- Effect 3: Route polyline (shadow, traveled gray, remaining blue→green gradient, white outline) ---------- */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    routePolylinesRef.current.forEach((p) => p.setMap(null))
    routePolylinesRef.current = []
    routeStepMarkersRef.current.forEach((m) => m.setMap(null))
    routeStepMarkersRef.current = []

    if (!routePolyline || routePolyline.length < 2) return

    const totalLen = cumulativeDistance(routePolyline)
    const totalMeters = totalLen[totalLen.length - 1] ?? 0
    const traveledM = Math.min(traveledDistanceMeters ?? 0, totalMeters)

    let traveled: { lat: number; lng: number }[] = []
    let remaining: { lat: number; lng: number }[] = []

    if (traveledM > 0) {
      let splitIdx = 0
      for (let i = 0; i < totalLen.length; i++) {
        if ((totalLen[i] ?? 0) >= traveledM) {
          splitIdx = Math.max(1, i)
          break
        }
      }
      traveled = routePolyline.slice(0, splitIdx)
      remaining = routePolyline.slice(splitIdx - 1)
    } else {
      remaining = [...routePolyline]
    }

    const pathToLatLng = (p: { lat: number; lng: number }) => ({ lat: p.lat, lng: p.lng })

    // 1. Drop shadow under entire route
    const shadowPath = routePolyline.map((p) => ({ lat: p.lat - 0.00006, lng: p.lng }))
    const shadowPoly = new google.maps.Polyline({
      path: shadowPath,
      strokeColor: '#001A4D',
      strokeWeight: 12,
      strokeOpacity: 0.18,
      map,
    })
    routePolylinesRef.current.push(shadowPoly)

    // 2. Traveled portion — muted gray
    if (traveled.length >= 2) {
      const grayPoly = new google.maps.Polyline({
        path: traveled.map(pathToLatLng),
        strokeColor: '#A0AEC0',
        strokeWeight: 7,
        strokeOpacity: 0.5,
        map,
      })
      routePolylinesRef.current.push(grayPoly)
    }

    // 3. Remaining route — blue (#0066FF) to green (#00C896) gradient segments
    if (remaining.length >= 2) {
      const N_SEGMENTS = 30
      const chunks = chunkPolyline(remaining, N_SEGMENTS)
      chunks.forEach(({ points, t }) => {
        if (points.length < 2) return
        const color = interpolateColor('#0066FF', '#00C896', t)
        const segPoly = new google.maps.Polyline({
          path: points.map(pathToLatLng),
          strokeColor: color,
          strokeWeight: 7,
          strokeOpacity: 1,
          map,
        })
        routePolylinesRef.current.push(segPoly)
      })

      // 4. White outline on top of remaining route
      const outlinePoly = new google.maps.Polyline({
        path: remaining.map(pathToLatLng),
        strokeColor: 'white',
        strokeWeight: 2,
        strokeOpacity: 0.25,
        map,
      })
      routePolylinesRef.current.push(outlinePoly)
    }

    // 5. Step markers on the route (upcoming turns)
    if (navigationSteps?.length && remaining.length >= 2) {
      const totalLenFull = cumulativeDistance(routePolyline)
      navigationSteps.forEach((step, i) => {
        if (i < currentStepIndex) return
        let dist = 0
        for (let j = 0; j < i; j++) {
          dist += navigationSteps[j]?.distanceMeters ?? 0
        }
        const pos = getPointAtDistance(routePolyline, totalLenFull, dist)
        if (!pos) return
        const isNext = i === currentStepIndex
        const marker = new google.maps.Marker({
          map,
          position: pos,
          zIndex: 100,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: isNext ? 7 : 5,
            fillColor: isNext ? '#0066FF' : 'white',
            fillOpacity: 1,
            strokeColor: isNext ? 'white' : '#0066FF',
            strokeWeight: isNext ? 3 : 2,
          },
        })
        routeStepMarkersRef.current.push(marker)
      })
    }
  }, [routePolyline, traveledDistanceMeters, mapReady, navigationSteps, currentStepIndex])

  /* ---------- Effect 4: Trip history polylines ---------- */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    historyPolylinesRef.current.forEach((p) => p.setMap(null))
    historyPolylinesRef.current = []

    if (!tripHistoryPolylines?.length) return

    tripHistoryPolylines.forEach((points) => {
      if (!points || points.length < 2) return
      const p = new google.maps.Polyline({
        path: points.map((p) => ({ lat: p.lat, lng: p.lng })),
        strokeColor: '#94a3b8',
        strokeWeight: 4,
        strokeOpacity: 0.35,
        map,
      })
      historyPolylinesRef.current.push(p)
    })
  }, [tripHistoryPolylines, mapReady])

  /* ---------- Effect 5: User location marker (blue dot) ---------- */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    markersLegacyRef.current.forEach((m) => {
      if ((m as unknown as { __snapId?: string }).__snapId === 'user-marker') {
        m.setMap(null)
      }
    })
    markersLegacyRef.current = markersLegacyRef.current.filter((m) => (m as unknown as { __snapId?: string }).__snapId !== 'user-marker')

    const marker = new google.maps.Marker({
      map,
      position: { lat: userLocation.lat, lng: userLocation.lng },
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#4285F4',
        fillOpacity: 1,
        strokeColor: 'white',
        strokeWeight: 3,
      },
      zIndex: 999,
      title: 'Your location',
    })
    ;(marker as unknown as { __snapId: string }).__snapId = 'user-marker'
    markersLegacyRef.current.push(marker)
  }, [userLocation.lat, userLocation.lng, mapReady])

  /* ---------- Effect 5b: Update user marker position and heading ---------- */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    const userMarker = markersLegacyRef.current.find((m) => (m as unknown as { __snapId?: string }).__snapId === 'user-marker')
    if (userMarker) {
      userMarker.setPosition({ lat: userLocation.lat, lng: userLocation.lng })
      if (typeof vehicleHeading === 'number') {
        userMarker.setIcon({
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: '#4285F4',
          fillOpacity: 1,
          strokeColor: 'white',
          strokeWeight: 2,
          rotation: vehicleHeading,
          anchor: new google.maps.Point(0, 2.5),
        })
      } else {
        userMarker.setIcon({
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#4285F4',
          fillOpacity: 1,
          strokeColor: 'white',
          strokeWeight: 3,
        })
      }
    }
  }, [userLocation.lat, userLocation.lng, vehicleHeading, mapReady])

  /* ---------- Effect 6: Destination marker (default Google Maps pin) ---------- */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    markersLegacyRef.current.forEach((m) => {
      if ((m as unknown as { __snapId?: string }).__snapId === 'dest-marker') {
        m.setMap(null)
      }
    })
    markersLegacyRef.current = markersLegacyRef.current.filter((m) => (m as unknown as { __snapId?: string }).__snapId !== 'dest-marker')

    if (!destinationCoordinate?.lat || !destinationCoordinate?.lng) return

    const marker = new google.maps.Marker({
      map,
      position: { lat: destinationCoordinate.lat, lng: destinationCoordinate.lng },
      title: 'Destination',
    })
    ;(marker as unknown as { __snapId: string }).__snapId = 'dest-marker'
    markersLegacyRef.current.push(marker)
  }, [destinationCoordinate?.lat, destinationCoordinate?.lng, mapReady])

  /* ---------- Effect 7: Offer markers (glowing gem icons + click) ---------- */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    markersLegacyRef.current.forEach((m) => {
      if ((m as unknown as { __snapId?: string }).__snapId?.startsWith?.('offer-')) {
        m.setMap(null)
      }
    })
    markersLegacyRef.current = markersLegacyRef.current.filter((m) => !(m as unknown as { __snapId?: string }).__snapId?.startsWith?.('offer-'))

    const visible = offers.filter((o) => !o.redeemed && o.lat && o.lng).slice(0, 8)
    visible.forEach((offer) => {
      const marker = new google.maps.Marker({
        map,
        position: { lat: offer.lat!, lng: offer.lng! },
        title: offer.business_name || 'Offer',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: '#38bdf8', // gem core
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      })
      marker.addListener('click', () => onOfferClick?.(offer))
      ;(marker as unknown as { __snapId: string }).__snapId = `offer-${offer.id}`
      markersLegacyRef.current.push(marker)
    })
  }, [offers, onOfferClick, mapReady])

  /* ---------- Effect 8: Road report markers (default Google Maps pin) ---------- */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    // Clear any previous report pins
    markersLegacyRef.current.forEach((m) => {
      if ((m as unknown as { __snapId?: string }).__snapId?.startsWith?.('report-')) {
        m.setMap(null)
      }
    })
    markersLegacyRef.current = markersLegacyRef.current.filter((m) => !(m as unknown as { __snapId?: string }).__snapId?.startsWith?.('report-'))

    // We now render incident icons via `RoadStatusMarkers` instead of default Google pins
    // to match the SnapRoad design. No additional map markers are created here.
  }, [roadReports, mapReady])

  /* ---------- Effect 9: GPS accuracy circle ---------- */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    if (circleRef.current) {
      circleRef.current.setMap(null)
      circleRef.current = null
    }
    if (!gpsAccuracyMeters || gpsAccuracyMeters < 10) return

    circleRef.current = new google.maps.Circle({
      map,
      center: { lat: userLocation.lat, lng: userLocation.lng },
      radius: gpsAccuracyMeters,
      fillColor: '#3b82f6',
      fillOpacity: 0.08,
      strokeColor: '#3b82f6',
      strokeOpacity: 0.3,
      strokeWeight: 1,
    })
  }, [userLocation.lat, userLocation.lng, gpsAccuracyMeters, mapReady])

  const edgeTint =
    mode === 'sport'
      ? 'linear-gradient(180deg, rgba(239,68,68,0.12) 0%, transparent 30%, transparent 70%, rgba(239,68,68,0.08) 100%)'
      : mode === 'calm'
        ? 'linear-gradient(180deg, rgba(96,165,250,0.1) 0%, transparent 30%, transparent 70%, rgba(96,165,250,0.06) 100%)'
        : 'none'

  return (
    <div style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0 }}>
      <div ref={containerRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />

      <div className="absolute inset-0 pointer-events-none z-[5]" style={{ background: edgeTint }} />

      {!isNavigating && isLiveGps && (
        <div className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded-full bg-emerald-500/90 text-white text-[10px] font-medium flex items-center gap-1">
          <Navigation2 size={10} className="animate-pulse" /> Live GPS
        </div>
      )}

      <div className="absolute bottom-1 left-1 z-20 text-[10px] font-medium text-slate-500 pointer-events-none">
        SnapRoad Map
      </div>
    </div>
  )
}
