/**
 * MapKit JS map for Driver app. Uses token from backend; shows center, user marker, route line.
 */

import { useEffect, useRef, useCallback } from 'react'
import { Locate, Mic } from 'lucide-react'

declare global {
  interface Window {
    mapkit?: {
      Map: new (element: HTMLElement, options?: Record<string, unknown>) => {
        center: { latitude: number; longitude: number }
        span: { latitudeDelta: number; longitudeDelta: number }
        setCenterAnimated: (coord: { latitude: number; longitude: number }) => void
        setRegion: (region: unknown) => void
        addAnnotation: (a: unknown) => void
        removeAnnotation: (a: unknown) => void
        addOverlay: (o: unknown) => void
        removeOverlay: (o: unknown) => void
      }
      Coordinate: new (lat: number, lng: number) => { latitude: number; longitude: number }
      CoordinateSpan: new (latDelta: number, lngDelta: number) => { latitudeDelta: number; longitudeDelta: number }
      CoordinateRegion: new (center: unknown, span: unknown) => unknown
      MarkerAnnotation: new (coord: unknown, opts?: { title?: string; color?: string }) => unknown
      PolylineOverlay: new (coords: unknown[], opts?: Record<string, unknown>) => unknown
    }
  }
}

export interface MapKitMapProps {
  center: { lat: number; lng: number }
  zoom: number
  bearing?: number
  userLocation: { lat: number; lng: number }
  vehicleHeading?: number
  routePolyline?: { lat: number; lng: number }[]
  onRecenter?: () => void
  onOrionClick?: () => void
  isLiveGps?: boolean
}

const LAT_DELTA_FOR_ZOOM = (zoom: number) => 0.01 * Math.pow(2, 17 - Math.min(18, Math.max(10, zoom)))

export default function MapKitMap({
  center,
  zoom,
  userLocation,
  routePolyline,
  onRecenter,
  onOrionClick,
  isLiveGps,
}: MapKitMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<unknown>(null)
  const annotationRef = useRef<unknown>(null)
  const overlayRef = useRef<unknown>(null)

  const initMap = useCallback(() => {
    const mapkit = window.mapkit
    if (!mapkit || !containerRef.current) return
    const delta = LAT_DELTA_FOR_ZOOM(zoom)
    const coord = new mapkit.Coordinate(center.lat, center.lng)
    const span = new mapkit.CoordinateSpan(delta, delta * 1.2)
    const map = new mapkit.Map(containerRef.current, {
      center: coord,
      span,
      mapType: 'muted',
      showsCompass: 'hidden',
    })
    mapRef.current = map
    const userCoord = new mapkit.Coordinate(userLocation.lat, userLocation.lng)
    const ann = new mapkit.MarkerAnnotation(userCoord, { title: 'You', color: '#3b82f6' })
    map.addAnnotation(ann)
    annotationRef.current = ann
    if (routePolyline && routePolyline.length >= 2) {
      const coords = routePolyline.map((p) => new mapkit.Coordinate(p.lat, p.lng))
      const overlay = new mapkit.PolylineOverlay(coords, { strokeColor: '#3b82f6', lineWidth: 4 })
      map.addOverlay(overlay)
      overlayRef.current = overlay
    }
  }, [center.lat, center.lng, zoom, userLocation.lat, userLocation.lng, routePolyline])

  useEffect(() => {
    if (!window.mapkit) return
    initMap()
    return () => {
      if (mapRef.current && overlayRef.current) {
        try {
          (mapRef.current as { removeOverlay: (o: unknown) => void }).removeOverlay(overlayRef.current)
        } catch (_) {}
      }
      if (mapRef.current && annotationRef.current) {
        try {
          (mapRef.current as { removeAnnotation: (a: unknown) => void }).removeAnnotation(annotationRef.current)
        } catch (_) {}
      }
      mapRef.current = null
      annotationRef.current = null
      overlayRef.current = null
    }
  }, [initMap])

  useEffect(() => {
    const map = mapRef.current as { setCenterAnimated: (c: { latitude: number; longitude: number }) => void; center: unknown; span: unknown; setRegion: (r: unknown) => void } | null
    if (!map || !window.mapkit) return
    const mapkit = window.mapkit
    const coord = new mapkit.Coordinate(center.lat, center.lng)
    const delta = LAT_DELTA_FOR_ZOOM(zoom)
    const span = new mapkit.CoordinateSpan(delta, delta * 1.2)
    const region = new mapkit.CoordinateRegion(coord, span)
    map.setRegion(region)
  }, [center.lat, center.lng, zoom])

  useEffect(() => {
    const map = mapRef.current as { addAnnotation: (a: unknown) => void; removeAnnotation: (a: unknown) => void } | null
    if (!map || !window.mapkit || !annotationRef.current) return
    const mapkit = window.mapkit
    try { map.removeAnnotation(annotationRef.current) } catch (_) {}
    const userCoord = new mapkit.Coordinate(userLocation.lat, userLocation.lng)
    const ann = new mapkit.MarkerAnnotation(userCoord, { title: 'You', color: '#3b82f6' })
    map.addAnnotation(ann)
    annotationRef.current = ann
  }, [userLocation.lat, userLocation.lng])

  return (
    <div className="absolute inset-0 z-0 bg-slate-900" ref={containerRef}>
      {isLiveGps && (
        <div className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded-full bg-emerald-500/90 text-white text-[10px] font-medium">
          Live GPS
        </div>
      )}
      <div className="absolute right-3 bottom-24 z-30 flex flex-col gap-2">
        <button
          type="button"
          onClick={onOrionClick}
          className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg"
        >
          <Mic className="text-white" size={22} />
        </button>
        <button
          type="button"
          onClick={onRecenter}
          className="w-12 h-12 bg-slate-900/90 backdrop-blur rounded-full flex items-center justify-center border border-white/10"
        >
          <Locate className="text-white" size={22} />
        </button>
      </div>
      <div className="absolute bottom-1 left-1 z-20 text-[8px] text-slate-500">
        © Apple MapKit
      </div>
    </div>
  )
}
