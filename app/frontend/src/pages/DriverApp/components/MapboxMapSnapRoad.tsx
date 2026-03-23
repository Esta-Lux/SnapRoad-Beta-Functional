import { memo, useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { DrivingMode } from '@/core/types'
import type { FriendLocation } from '@/lib/friendLocation'
import { DRIVING_MODES } from './DrivingModeStyles'

type IconSpec = { id: string; svg: string }

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

interface PhotoReportPin {
  id: string
  lat: number
  lng: number
  category: string
  photo_url: string
  upvotes: number
}

const FRIEND_ANIMATION_DURATION = 2000

export interface MapboxMapSnapRoadProps {
  center: { lat: number; lng: number }
  zoom: number
  bearing?: number
  pitch?: number
  userLocation: { lat: number; lng: number }
  gpsAccuracyMeters?: number
  vehicleHeading?: number
  isMoving?: boolean
  speedMps?: number
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
  gasStations?: Array<{ name: string; price: number; lat: number; lng: number; brand: string }>
  onOfferClick?: (offer: Offer) => void
  roadReports?: RoadReport[]
  isNavigating?: boolean
  showLookAround?: boolean
  onDestinationDrag?: (coord: { lat: number; lng: number }) => void
  offerZoneRadiusMeters?: number
  colorScheme?: 'light' | 'dark'
  onMapReady?: (
    map: mapboxgl.Map,
    zoomToUser: (lat: number, lng: number, isNavigating: boolean, zoomOverride?: number) => void,
    actions?: { resetHeading: () => void; clearUserInteracting: () => void }
  ) => void
  onPlaceSelected?: (place: { name: string; lat: number; lng: number; address?: string; type?: string }) => void
  onMapClick?: (lat: number, lng: number) => void
  fitToRoutePolyline?: { lat: number; lng: number }[] | null
  navigationSteps?: Array<{ instruction?: string; distanceMeters?: number; maneuver?: string }>
  currentStepIndex?: number
  mapType?: 'standard' | 'satellite' | 'hybrid' | 'dark'
  showTraffic?: boolean
  showCameras?: boolean
  showIncidents?: boolean
  showConstruction?: boolean
  showFuelPrices?: boolean
  onOpenLayerPicker?: () => void
  onReportClick?: (report: RoadReport) => void
  photoReports?: PhotoReportPin[]
  onPhotoReportTap?: (reportId: string) => void
  friendLocations?: FriendLocation[]
  friendsOnRoute?: FriendLocation[]
  onFriendMarkerTap?: (friendId: string) => void
  onMapMoved?: (lat: number, lng: number) => void
  onCameraClick?: (cameraId: string) => void
  signals?: Array<{ id: string; type: string; lat: number; lng: number }>
  sidewalksGeojson?: GeoJSON.FeatureCollection<GeoJSON.LineString>
  drivingMode?: 'calm' | 'adaptive' | 'sport'
  cameraLocations?: Array<{ id: string; lat: number; lng: number; name?: string }>
  constructionZones?: Array<{ id: string; lat: number; lng: number; title?: string }>
  /** Pin dropped at tap; shown as pin marker */
  droppedPin?: { lat: number; lng: number; label?: string } | null
  /** Route start point; shown as a pin when navigating */
  routeStartCoordinate?: { lat: number; lng: number } | null
  cameraLockedRef?: { current: boolean }
  navFollowEnabled?: boolean
  navFollowZoom?: number
  onNavCameraUnlock?: () => void
}

function hazardTypeToEmoji(type: string): string {
  const t = (type || '').toLowerCase()
  if (t.includes('crash') || t.includes('accident')) return '🚗'
  if (t.includes('construction') || t.includes('work')) return '🚧'
  if (t.includes('pothole')) return '🕳️'
  if (t.includes('weather') || t.includes('ice') || t.includes('snow')) return '❄️'
  if (t.includes('police')) return '🚔'
  if (t.includes('closure') || t.includes('closed')) return '🚫'
  return '⚠️'
}

function schemeFromUi(colorScheme?: 'light' | 'dark'): 'light' | 'dark' {
  return colorScheme === 'dark' ? 'dark' : 'light'
}

function reportTypeToIconBaseId(type: string): string {
  const t = (type || '').toLowerCase()
  if (t.includes('police')) return 'sr-icon-police'
  if (t.includes('construction') || t.includes('work')) return 'sr-icon-construction'
  if (t.includes('closure') || t.includes('closed')) return 'sr-icon-closure'
  if (t.includes('pothole')) return 'sr-icon-pothole'
  if (t.includes('weather') || t.includes('ice') || t.includes('snow')) return 'sr-icon-weather'
  if (t.includes('camera')) return 'sr-icon-camera'
  if (t.includes('crash') || t.includes('accident')) return 'sr-icon-accident'
  return 'sr-icon-hazard'
}

function reportTypeToIconId(type: string, scheme: 'light' | 'dark'): string {
  const V = 'v4'
  return `${reportTypeToIconBaseId(type)}-${V}-${scheme}`
}

function signalTypeToIconId(type: string, scheme: 'light' | 'dark'): string {
  const V = 'v4'
  const t = (type || '').toLowerCase()
  if (t.includes('stop-sign') || t === 'stop-sign') return `sr-icon-stop-${V}-${scheme}`
  if (t.includes('speed-camera') || t === 'speed-camera') return `sr-icon-speed-camera-${V}-${scheme}`
  return `sr-icon-traffic-light-${V}-${scheme}`
}

function svgToDataUrl(svg: string): string {
  // Keep it deterministic; Mapbox images are per-style and must be same size/pixelRatio each time.
  const encoded = encodeURIComponent(svg)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22')
  return `data:image/svg+xml;charset=utf-8,${encoded}`
}

function normalizeHeadingDegrees(value: number | null | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0
  return ((value % 360) + 360) % 360
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function registerSvgIcons(map: mapboxgl.Map) {
  const V = 'v4'
  const mkBadge = (bg: string, _fg: string, stroke: string) =>
    `<circle cx="32" cy="32" r="26" fill="${bg}" stroke="${stroke}" stroke-width="2" />` +
    `<circle cx="32" cy="32" r="26" fill="${bg}" opacity="0.92" />` // subtle depth

  const ICONS: IconSpec[] = [
    // Reports (hazard/police/accident/...)
    {
      id: `sr-icon-hazard-${V}-dark`,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  ${mkBadge('#0B1220', '#ffffff', 'rgba(255,255,255,0.18)')}
  <path d="M32 16 L48 46 H16 Z" fill="#F59E0B"/>
  <rect x="30.6" y="26" width="2.8" height="12" rx="1.4" fill="#0B1220"/>
  <circle cx="32" cy="42" r="2" fill="#0B1220"/>
</svg>`,
    },
    {
      id: `sr-icon-hazard-${V}-light`,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  ${mkBadge('#ffffff', '#0B1220', 'rgba(11,18,32,0.18)')}
  <path d="M32 16 L48 46 H16 Z" fill="#D97706"/>
  <rect x="30.6" y="26" width="2.8" height="12" rx="1.4" fill="#111827"/>
  <circle cx="32" cy="42" r="2" fill="#111827"/>
</svg>`,
    },
    {
      id: `sr-icon-police-${V}-dark`,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  ${mkBadge('#0B1220', '#ffffff', 'rgba(255,255,255,0.18)')}
  <path d="M32 16c8 5 14 5 14 5v14c0 10-7 16-14 18c-7-2-14-8-14-18V21s6 0 14-5z" fill="#60A5FA"/>
  <path d="M32 24l3 6l7 1l-5 5l1 7l-6-3l-6 3l1-7l-5-5l7-1z" fill="#0B1220" opacity="0.95"/>
</svg>`,
    },
    {
      id: `sr-icon-police-${V}-light`,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  ${mkBadge('#ffffff', '#0B1220', 'rgba(11,18,32,0.18)')}
  <path d="M32 16c8 5 14 5 14 5v14c0 10-7 16-14 18c-7-2-14-8-14-18V21s6 0 14-5z" fill="#2563EB"/>
  <path d="M32 24l3 6l7 1l-5 5l1 7l-6-3l-6 3l1-7l-5-5l7-1z" fill="#111827" opacity="0.95"/>
</svg>`,
    },
    {
      id: `sr-icon-accident-${V}-dark`,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  ${mkBadge('#0B1220', '#ffffff', 'rgba(255,255,255,0.18)')}
  <path d="M20 36c0-6 5-12 12-12h6c3 0 6 2 8 5l3 7v6H20v-6z" fill="#F87171"/>
  <circle cx="26" cy="44" r="4" fill="#0B1220"/>
  <circle cx="44" cy="44" r="4" fill="#0B1220"/>
  <rect x="26" y="28" width="10" height="6" rx="2" fill="#0B1220" opacity="0.55"/>
</svg>`,
    },
    {
      id: `sr-icon-accident-${V}-light`,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  ${mkBadge('#ffffff', '#0B1220', 'rgba(11,18,32,0.18)')}
  <path d="M20 36c0-6 5-12 12-12h6c3 0 6 2 8 5l3 7v6H20v-6z" fill="#EF4444"/>
  <circle cx="26" cy="44" r="4" fill="#111827"/>
  <circle cx="44" cy="44" r="4" fill="#111827"/>
  <rect x="26" y="28" width="10" height="6" rx="2" fill="#111827" opacity="0.55"/>
</svg>`,
    },
    {
      id: `sr-icon-construction-${V}-dark`,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  ${mkBadge('#0B1220', '#ffffff', 'rgba(255,255,255,0.18)')}
  <path d="M32 18c6 8 10 17 10 23c0 6-4 11-10 11s-10-5-10-11c0-6 4-15 10-23z" fill="#F59E0B"/>
  <path d="M26 36h12v4H26z" fill="#0B1220" opacity="0.95"/>
  <path d="M26 44h12v4H26z" fill="#0B1220" opacity="0.95"/>
</svg>`,
    },
    {
      id: `sr-icon-construction-${V}-light`,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  ${mkBadge('#ffffff', '#0B1220', 'rgba(11,18,32,0.18)')}
  <path d="M32 18c6 8 10 17 10 23c0 6-4 11-10 11s-10-5-10-11c0-6 4-15 10-23z" fill="#D97706"/>
  <path d="M26 36h12v4H26z" fill="#111827" opacity="0.95"/>
  <path d="M26 44h12v4H26z" fill="#111827" opacity="0.95"/>
</svg>`,
    },
    {
      id: `sr-icon-weather-${V}-dark`,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  ${mkBadge('#0B1220', '#ffffff', 'rgba(255,255,255,0.18)')}
  <path d="M22 36c0-6 5-11 11-11c4 0 8 2 10 6c5 0 9 3 9 8c0 5-4 9-9 9H26c-5 0-9-4-9-9c0-4 2-7 5-8z" fill="#93C5FD"/>
  <path d="M26 50l2-4m6 4l2-4m6 4l2-4" stroke="#E0F2FE" stroke-width="3" stroke-linecap="round"/>
</svg>`,
    },
    {
      id: `sr-icon-weather-${V}-light`,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  ${mkBadge('#ffffff', '#0B1220', 'rgba(11,18,32,0.18)')}
  <path d="M22 36c0-6 5-11 11-11c4 0 8 2 10 6c5 0 9 3 9 8c0 5-4 9-9 9H26c-5 0-9-4-9-9c0-4 2-7 5-8z" fill="#3B82F6"/>
  <path d="M26 50l2-4m6 4l2-4m6 4l2-4" stroke="#0B1220" stroke-width="3" stroke-linecap="round" opacity="0.7"/>
</svg>`,
    },
    {
      id: `sr-icon-pothole-${V}-dark`,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  ${mkBadge('#0B1220', '#ffffff', 'rgba(255,255,255,0.18)')}
  <ellipse cx="32" cy="36" rx="16" ry="10" fill="#111827"/>
  <ellipse cx="32" cy="35" rx="12" ry="7" fill="#0B1220"/>
  <path d="M22 34l6-4l4 3l6-5l4 4" stroke="#64748B" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`,
    },
    {
      id: `sr-icon-pothole-${V}-light`,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  ${mkBadge('#ffffff', '#0B1220', 'rgba(11,18,32,0.18)')}
  <ellipse cx="32" cy="36" rx="16" ry="10" fill="#111827"/>
  <ellipse cx="32" cy="35" rx="12" ry="7" fill="#0B1220"/>
  <path d="M22 34l6-4l4 3l6-5l4 4" stroke="#94A3B8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`,
    },
    {
      id: `sr-icon-closure-${V}-dark`,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  ${mkBadge('#0B1220', '#ffffff', 'rgba(255,255,255,0.18)')}
  <circle cx="32" cy="32" r="16" fill="#EF4444"/>
  <path d="M24 24l16 16M40 24L24 40" stroke="#0B1220" stroke-width="4" stroke-linecap="round"/>
</svg>`,
    },
    {
      id: `sr-icon-closure-${V}-light`,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  ${mkBadge('#ffffff', '#0B1220', 'rgba(11,18,32,0.18)')}
  <circle cx="32" cy="32" r="16" fill="#EF4444"/>
  <path d="M24 24l16 16M40 24L24 40" stroke="#111827" stroke-width="4" stroke-linecap="round"/>
</svg>`,
    },
    {
      id: `sr-icon-camera-${V}-dark`,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  ${mkBadge('#0B1220', '#ffffff', 'rgba(255,255,255,0.18)')}
  <rect x="18" y="26" width="28" height="20" rx="5" fill="#A78BFA"/>
  <rect x="22" y="22" width="10" height="6" rx="2" fill="#A78BFA"/>
  <circle cx="32" cy="36" r="6" fill="#0B1220" opacity="0.95"/>
  <circle cx="32" cy="36" r="3" fill="#E9D5FF"/>
</svg>`,
    },
    {
      id: `sr-icon-camera-${V}-light`,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  ${mkBadge('#ffffff', '#0B1220', 'rgba(11,18,32,0.18)')}
  <rect x="18" y="26" width="28" height="20" rx="5" fill="#7C3AED"/>
  <rect x="22" y="22" width="10" height="6" rx="2" fill="#7C3AED"/>
  <circle cx="32" cy="36" r="6" fill="#111827" opacity="0.95"/>
  <circle cx="32" cy="36" r="3" fill="#F5F3FF"/>
</svg>`,
    },
    // Signals
    {
      id: `sr-icon-traffic-light-${V}-dark`,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  ${mkBadge('#0B1220', '#ffffff', 'rgba(255,255,255,0.18)')}
  <rect x="25" y="18" width="14" height="28" rx="6" fill="#111827" stroke="#334155" stroke-width="2"/>
  <circle cx="32" cy="26" r="4" fill="#EF4444"/>
  <circle cx="32" cy="32" r="4" fill="#F59E0B"/>
  <circle cx="32" cy="38" r="4" fill="#22C55E"/>
  <rect x="30.5" y="46" width="3" height="8" rx="1.5" fill="#334155"/>
</svg>`,
    },
    {
      id: `sr-icon-traffic-light-${V}-light`,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  ${mkBadge('#ffffff', '#0B1220', 'rgba(11,18,32,0.18)')}
  <rect x="25" y="18" width="14" height="28" rx="6" fill="#111827" stroke="#111827" stroke-width="2"/>
  <circle cx="32" cy="26" r="4" fill="#EF4444"/>
  <circle cx="32" cy="32" r="4" fill="#F59E0B"/>
  <circle cx="32" cy="38" r="4" fill="#22C55E"/>
  <rect x="30.5" y="46" width="3" height="8" rx="1.5" fill="#111827"/>
</svg>`,
    },
    {
      id: `sr-icon-stop-${V}-dark`,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  ${mkBadge('#0B1220', '#ffffff', 'rgba(255,255,255,0.18)')}
  <path d="M25.5 18.5h13l7 7v13l-7 7h-13l-7-7v-13z" fill="#DC2626" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round"/>
  <text x="32" y="37" text-anchor="middle" font-size="13" font-weight="800" font-family="ui-sans-serif, system-ui, -apple-system" fill="#ffffff" letter-spacing="1">STOP</text>
</svg>`,
    },
    {
      id: `sr-icon-stop-${V}-light`,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  ${mkBadge('#ffffff', '#0B1220', 'rgba(11,18,32,0.18)')}
  <path d="M25.5 18.5h13l7 7v13l-7 7h-13l-7-7v-13z" fill="#DC2626" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round"/>
  <text x="32" y="37" text-anchor="middle" font-size="13" font-weight="800" font-family="ui-sans-serif, system-ui, -apple-system" fill="#ffffff" letter-spacing="1">STOP</text>
</svg>`,
    },
    {
      id: `sr-icon-speed-camera-${V}-dark`,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  ${mkBadge('#0B1220', '#ffffff', 'rgba(255,255,255,0.18)')}
  <rect x="18" y="26" width="28" height="20" rx="5" fill="#8B5CF6"/>
  <circle cx="32" cy="36" r="7" fill="#0B1220" opacity="0.95"/>
  <circle cx="32" cy="36" r="3" fill="#E9D5FF"/>
</svg>`,
    },
    {
      id: `sr-icon-speed-camera-${V}-light`,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  ${mkBadge('#ffffff', '#0B1220', 'rgba(11,18,32,0.18)')}
  <rect x="18" y="26" width="28" height="20" rx="5" fill="#7C3AED"/>
  <circle cx="32" cy="36" r="7" fill="#111827" opacity="0.95"/>
  <circle cx="32" cy="36" r="3" fill="#F5F3FF"/>
</svg>`,
    },
    // User location: directional blue navigation arrow (rotates with heading).
    {
      id: 'sr-icon-user-location-dark',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <path d="M32 7 L49 45 L32 38 L15 45 Z" fill="#3B82F6" stroke="#ffffff" stroke-width="4" stroke-linejoin="round"/>
  <path d="M32 17 L40 35 L32 31 L24 35 Z" fill="#93C5FD" opacity="0.95"/>
</svg>`,
    },
    {
      id: 'sr-icon-user-location-light',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <path d="M32 7 L49 45 L32 38 L15 45 Z" fill="#2563EB" stroke="#ffffff" stroke-width="4" stroke-linejoin="round"/>
  <path d="M32 17 L40 35 L32 31 L24 35 Z" fill="#93C5FD" opacity="0.95"/>
</svg>`,
    },
    {
      id: 'sr-icon-nav-cone',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="96" viewBox="0 0 64 96">
  <defs>
    <linearGradient id="srConeFade" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="rgba(66,133,244,0.24)"/>
      <stop offset="100%" stop-color="rgba(66,133,244,0.0)"/>
    </linearGradient>
  </defs>
  <path d="M32 90 L10 20 Q32 2 54 20 Z" fill="url(#srConeFade)"/>
</svg>`,
    },
    // Dropped pin: premium map pin (anchor bottom)
    {
      id: 'sr-icon-pin',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <path d="M32 4 C14 4 4 16 4 32 C4 50 32 64 32 64 C32 64 60 50 60 32 C60 16 50 4 32 4 Z" fill="#2563EB" stroke="#ffffff" stroke-width="3" stroke-linejoin="round"/>
  <circle cx="32" cy="22" r="6" fill="#ffffff" opacity="0.98"/>
</svg>`,
    },
    // Route start pin: premium green pin when navigation starts
    {
      id: 'sr-icon-pin-start',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <path d="M32 4 C14 4 4 16 4 32 C4 50 32 64 32 64 C32 64 60 50 60 32 C60 16 50 4 32 4 Z" fill="#059669" stroke="#ffffff" stroke-width="3" stroke-linejoin="round"/>
  <circle cx="32" cy="22" r="6" fill="#ffffff" opacity="0.98"/>
</svg>`,
    },
    // Destination pin: premium red pin (replaces red dot when navigating)
    {
      id: 'sr-icon-pin-dest',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <path d="M32 4 C14 4 4 16 4 32 C4 50 32 64 32 64 C32 64 60 50 60 32 C60 16 50 4 32 4 Z" fill="#DC2626" stroke="#ffffff" stroke-width="3" stroke-linejoin="round"/>
  <circle cx="32" cy="22" r="6" fill="#ffffff" opacity="0.98"/>
</svg>`,
    },
  ]

  const ICON_SIZE = 32
  const PIXEL_RATIO = 2

  // #region agent log
  const registerStartTs = Date.now()
  const trafficIconIds = [
    'sr-icon-traffic-light-v4-light',
    'sr-icon-traffic-light-v4-dark',
    'sr-icon-stop-v4-light',
    'sr-icon-stop-v4-dark',
    'sr-icon-speed-camera-v4-light',
    'sr-icon-speed-camera-v4-dark',
  ]
  const trafficIconIdSet = new Set(trafficIconIds)
  const trafficIconAddLogged = new Set<string>()

  void 0// #endregion

  const registerIconSpecs = (specs: IconSpec[]) => {
    specs.forEach((spec) => {
      if (map.hasImage(spec.id)) return
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        try {
          if (map.hasImage(spec.id)) return
          const canvas = document.createElement('canvas')
          canvas.width = ICON_SIZE * PIXEL_RATIO
          canvas.height = ICON_SIZE * PIXEL_RATIO
          const ctx = canvas.getContext('2d')
          if (!ctx) return
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
          map.addImage(spec.id, data, { pixelRatio: PIXEL_RATIO } as any)

          // #region agent log
          if (trafficIconIdSet.has(spec.id) && !trafficIconAddLogged.has(spec.id)) {
            trafficIconAddLogged.add(spec.id)
            void 0}
          // #endregion
        } catch (e) {
          console.warn('[MapboxMapSnapRoad] Failed to add svg icon:', spec.id, e)
        }
      }
      img.src = svgToDataUrl(spec.svg)
    })
  }

  // Prioritize traffic/stop/speed-camera icons so they appear sooner.
  const trafficSpecs = ICONS.filter((s) => trafficIconIdSet.has(s.id))
  const otherSpecs = ICONS.filter((s) => !trafficIconIdSet.has(s.id))

  registerIconSpecs(trafficSpecs)

  // Register remaining icons when the browser is idle to reduce decode contention.
  const scheduleOtherIcons = () => {
    const w = window as any
    if (typeof w.requestIdleCallback === 'function') {
      w.requestIdleCallback(() => registerIconSpecs(otherSpecs), { timeout: 2000 })
    } else {
      setTimeout(() => registerIconSpecs(otherSpecs), 0)
    }
  }
  scheduleOtherIcons()
}

function ensure3dBuildings(map: mapboxgl.Map) {
  try {
    if (map.getLayer('sr-3d-buildings')) return
    // Most Mapbox styles expose a "composite" vector source with a "building" layer.
    if (!map.getSource('composite')) return
    const beforeId =
      map
        .getStyle()
        ?.layers?.find((l) => l.type === 'symbol' && typeof l.id === 'string' && l.id.includes('label'))?.id ??
      undefined

    map.addLayer(
      {
        id: 'sr-3d-buildings',
        type: 'fill-extrusion',
        source: 'composite',
        'source-layer': 'building',
        filter: ['==', 'extrude', 'true'],
        minzoom: 15,
        paint: {
          'fill-extrusion-color': '#d1d5db',
          'fill-extrusion-opacity': 0.72,
          'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 15, 0, 15.05, ['get', 'height']],
          'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 15, 0, 15.05, ['get', 'min_height']],
          'fill-extrusion-vertical-gradient': true,
        },
      },
      // Place beneath our overlays but above basemap.
      beforeId
    )
  } catch {
    // ignore
  }
}

type GeoJSONFC = GeoJSON.FeatureCollection
const emptyFC: GeoJSONFC = { type: 'FeatureCollection', features: [] }

function toCoord(p: { lat: number; lng: number }): [number, number] {
  return [p.lng, p.lat]
}

function splitRouteByNearestPoint(
  pts: { lat: number; lng: number }[],
  user: { lat: number; lng: number }
): { passed: [number, number][]; ahead: [number, number][]; splitIndex: number } {
  if (pts.length < 2) {
    return { passed: [], ahead: pts.map(toCoord), splitIndex: 0 }
  }
  let bestIdx = 0
  let bestDist = Number.POSITIVE_INFINITY
  for (let i = 0; i < pts.length; i++) {
    const d = haversineMeters(user.lat, user.lng, pts[i].lat, pts[i].lng)
    if (d < bestDist) {
      bestDist = d
      bestIdx = i
    }
  }
  const passed = pts.slice(0, bestIdx + 1).map(toCoord)
  const ahead = pts.slice(Math.max(0, bestIdx)).map(toCoord)
  return { passed, ahead, splitIndex: bestIdx }
}

const C = {
  routeAhead: '#4A90D9',
  routeTransition: '#5AAA7A',
  routePassed: '#999999',
  routeGlow: '#1a4a7a',
  routeCasing: '#1e4878',
  transCasing: '#2a6a4a',
  car: '#78b0a0',
  destination: '#D85050',
  offer: '#c89048',
  offerGas: '#FF5A5A',
  hazard: '#E07830',
  stepMarker: '#4A90D9',
}

// Dark map theme: route lines and user dot tuned for dark backgrounds
const C_DARK = {
  routeAhead: '#5BA3FF',
  routeTransition: '#6BC48A',
  routePassed: '#999999',
  routeGlow: '#1e5a9a',
  routeCasing: '#2563eb',
  transCasing: '#16a34a',
  userDot: '#00E5A0',
  userStroke: '#0f172a',
  userPulse: '#00E5A0',
  userAccuracy: '#00E5A0',
}

function MapboxMapSnapRoad(props: MapboxMapSnapRoadProps) {
  const {
    center, zoom, bearing, pitch,
    userLocation, vehicleHeading, isMoving, speedMps, routePolyline,
    tripHistoryPolylines, destinationCoordinate, traveledDistanceMeters,
    onMapError,
    offers, gasStations, onOfferClick, roadReports, onReportClick,
    isNavigating, navigationSteps, currentStepIndex,
    mapType, showTraffic, showCameras, showIncidents, showConstruction, showFuelPrices,
    photoReports, onPhotoReportTap,
    friendLocations, friendsOnRoute, onFriendMarkerTap,
    onMapMoved,
    signals, drivingMode, cameraLocations, constructionZones,
    colorScheme, onPlaceSelected, onMapClick,
    onMapReady, fitToRoutePolyline,
    contentInsets,
    onCameraClick,
    droppedPin,
    routeStartCoordinate,
    sidewalksGeojson,
    cameraLockedRef,
    navFollowEnabled = true,
    navFollowZoom = 17,
    onNavCameraUnlock,
  } = props

  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const userInteracting = useRef(false)
  const initializedRef = useRef(false)
  const sourcesReady = useRef(false)
  const reportPopupRef = useRef<mapboxgl.Popup | null>(null)
  const cameraRafRef = useRef<number | null>(null)
  const prevFriendPositionsRef = useRef<Map<string, [number, number]>>(new Map())
  const friendAnimationFramesRef = useRef<Map<string, number>>(new Map())
  const lastCameraApplyMsRef = useRef(0)
  const modeFxRafRef = useRef<number | null>(null)
  const userSourceRafRef = useRef<number | null>(null)
  const pendingUserFeatureRef = useRef<GeoJSON.Feature | null>(null)
  const lastRouteSplitAtRef = useRef<{ lat: number; lng: number; splitIndex: number } | null>(null)
  const fetchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastFetchCenterRef = useRef<{ lat: number; lng: number }>({ lat: 0, lng: 0 })
  const latestPropsRef = useRef({
    routePolyline, traveledDistanceMeters, isNavigating, isMoving, speedMps, userLocation, vehicleHeading,
    destinationCoordinate, offers, roadReports, navigationSteps, currentStepIndex,
    tripHistoryPolylines, signals, showTraffic, showCameras, showIncidents, showConstruction, showFuelPrices,
    photoReports,
    friendLocations,
    cameraLocations, constructionZones, colorScheme, gasStations,
    droppedPin,
    routeStartCoordinate,
    sidewalksGeojson,
  })
  latestPropsRef.current = {
    routePolyline, traveledDistanceMeters, isNavigating, isMoving, speedMps, userLocation, vehicleHeading,
    destinationCoordinate, offers, roadReports, navigationSteps, currentStepIndex,
    tripHistoryPolylines, signals, showTraffic, showCameras, showIncidents, showConstruction, showFuelPrices,
    photoReports,
    friendLocations,
    cameraLocations, constructionZones, colorScheme, gasStations,
    droppedPin,
    routeStartCoordinate,
    sidewalksGeojson,
  }

  const buildUserFeature = (
    lat: number,
    lng: number,
    heading: number | null | undefined,
    navigating: boolean | undefined,
    moving: boolean | undefined,
    speed: number | undefined,
    scheme: 'light' | 'dark'
  ): GeoJSON.Feature => ({
    type: 'Feature',
    properties: {
      heading: normalizeHeadingDegrees(heading),
      isNavigating: Boolean(navigating),
      isMoving: Boolean(moving),
      speedMps: Number.isFinite(speed) ? Number(speed) : 0,
      iconId: `sr-icon-user-location-${scheme}`,
    },
    geometry: { type: 'Point', coordinates: [lng, lat] },
  })

  const queueUserSourceUpdate = (feature: GeoJSON.Feature, targetMap?: mapboxgl.Map) => {
    pendingUserFeatureRef.current = feature
    const map = targetMap ?? mapRef.current
    if (!map || !sourcesReady.current) return
    if (userSourceRafRef.current != null) return
    userSourceRafRef.current = requestAnimationFrame(() => {
      userSourceRafRef.current = null
      const m = mapRef.current
      const pending = pendingUserFeatureRef.current
      if (!m || !sourcesReady.current || !pending) return
      const src = m.getSource('sr-user') as mapboxgl.GeoJSONSource | undefined
      src?.setData({ type: 'FeatureCollection', features: [pending] })
    })
  }

  const buildRouteSegments = (
    polyline: { lat: number; lng: number }[] | undefined,
    navActive: boolean | undefined,
    user: { lat: number; lng: number },
    userSpeed: number | undefined
  ): GeoJSON.Feature[] => {
    const features: GeoJSON.Feature[] = []
    if (!polyline || polyline.length < 2) return features
    if (!navActive) {
      features.push({ type: 'Feature', properties: { segment: 'ahead' }, geometry: { type: 'LineString', coordinates: polyline.map(toCoord) } })
      return features
    }
    const prevSplit = lastRouteSplitAtRef.current
    const isStationary = !Number.isFinite(userSpeed) || Number(userSpeed) < 0.5
    const movedSinceSplit = prevSplit
      ? haversineMeters(prevSplit.lat, prevSplit.lng, user.lat, user.lng)
      : Number.POSITIVE_INFINITY
    let splitIndex: number
    if (isStationary && prevSplit && movedSinceSplit < 10) {
      splitIndex = prevSplit.splitIndex
    } else {
      splitIndex = splitRouteByNearestPoint(polyline, user).splitIndex
      lastRouteSplitAtRef.current = { lat: user.lat, lng: user.lng, splitIndex }
    }
    const passed = polyline.slice(0, splitIndex + 1).map(toCoord)
    const ahead = polyline.slice(Math.max(0, splitIndex)).map(toCoord)
    if (passed.length >= 2) features.push({ type: 'Feature', properties: { segment: 'passed' }, geometry: { type: 'LineString', coordinates: passed } })
    if (ahead.length >= 2) features.push({ type: 'Feature', properties: { segment: 'ahead' }, geometry: { type: 'LineString', coordinates: ahead } })
    return features
  }

  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return
    if (!mapboxgl.accessToken) {
      onMapError?.('Mapbox access token not set')
      return
    }
    initializedRef.current = true
    try {
      const isNavInit = Boolean(latestPropsRef.current.isNavigating)
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [center.lng, center.lat],
        zoom,
        pitch: pitch ?? (isNavInit ? 50 : 0),
        bearing: bearing ?? 0,
        antialias: false,
        projection: 'mercator',
        attributionControl: false,
        logoPosition: 'bottom-right',
      })
      mapRef.current = map
      map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right')
      map.getCanvas().style.cursor = 'default'
      map.on('dragstart', () => {
        map.getCanvas().style.cursor = 'grabbing'
        userInteracting.current = true
        if (latestPropsRef.current.isNavigating) onNavCameraUnlock?.()
      })
      map.on('dragend', () => {
        map.getCanvas().style.cursor = 'default'
        userInteracting.current = false
      })
      map.on('pitchstart', () => {
        userInteracting.current = true
        if (latestPropsRef.current.isNavigating) onNavCameraUnlock?.()
      })
      map.on('pitchend', () => { userInteracting.current = false })
      map.on('rotatestart', () => {
        userInteracting.current = true
        if (latestPropsRef.current.isNavigating) onNavCameraUnlock?.()
      })
      map.on('rotateend', () => { userInteracting.current = false })
      map.on('zoomstart', () => {
        userInteracting.current = true
        if (latestPropsRef.current.isNavigating) onNavCameraUnlock?.()
      })
      map.on('zoomend', () => { userInteracting.current = false })
      map.on('click', (e) => {
        // During style switches, Mapbox may not be fully loaded; avoid calling getStyle() in that state.
        if (typeof map.isStyleLoaded === 'function' && !map.isStyleLoaded()) {
          onMapClick?.(e.lngLat.lat, e.lngLat.lng)
          return
        }
        const interactiveLayerIds = ['sr-offers', 'sr-reports', 'sr-photo-reports-circle', 'sr-friends-circle', 'sr-cameras', 'sr-construction'].filter(
          (id) => map.getLayer(id)
        )
        const interactiveFeatures = map.queryRenderedFeatures(e.point, { layers: interactiveLayerIds })
        if (interactiveFeatures.length > 0) return

        const labelLayerIds =
          map.getStyle()?.layers?.filter((l) => l.type === 'symbol' && l.id?.includes('label')).map((l) => l.id) ?? []
        const placeFeatures = labelLayerIds.length > 0 ? map.queryRenderedFeatures(e.point, { layers: labelLayerIds }) : []
        if (placeFeatures.length > 0) {
          const f = placeFeatures[0]
          const props = f.properties as { name?: string; name_en?: string; type?: string } | undefined
          const name = props?.name ?? props?.name_en ?? ''
          if (name) {
            onPlaceSelected?.({ name, lat: e.lngLat.lat, lng: e.lngLat.lng, type: props?.type })
            return
          }
        }
        onMapClick?.(e.lngLat.lat, e.lngLat.lng)
      })

      const setupLayers = () => {
        try {
          const p = latestPropsRef.current
          // Some environments end up with an empty style (no glyphs). Symbol layers with `text-field`
          // require `style.glyphs` to be set, otherwise Mapbox GL throws and the map appears "broken".
          try {
            const styleAny = map.getStyle?.() as any
            const hasGlyphs = typeof styleAny?.glyphs === 'string' && styleAny.glyphs.length > 0
            if (!hasGlyphs) {
              const token = (mapboxgl as any).accessToken as string | undefined
              if (token) {
                map.setStyle(
                  {
                    version: 8,
                    name: 'SnapRoad Fallback',
                    glyphs: `https://api.mapbox.com/fonts/v1/mapbox/{fontstack}/{range}.pbf?access_token=${token}`,
                    sources: styleAny?.sources ?? {},
                    layers: styleAny?.layers ?? [],
                  } as any,
                  { diff: false } as any
                )
              }
            }
          } catch { /* ignore */ }

          // Remove any existing user layers (e.g. from cached style) so only the arrow marker shows — no green dot.
          const style = map.getStyle()
          if (style?.layers) {
            for (const layer of style.layers) {
              const src = (layer as { source?: string }).source
              if (src === 'sr-user' && layer.id !== 'sr-user-marker' && layer.id !== 'sr-user-cone') {
                try { map.removeLayer(layer.id) } catch { /* ignore */ }
              }
            }
          }
          // Ensure our flat SVG sprite icons exist for this style.
          registerSvgIcons(map)
          ensure3dBuildings(map)

          // Add our SVG sprite icons for report/signal markers.
          // (registerSvgIcons already called above; safe/idempotent)
          // Terrain DEM is expensive; only enable while navigating.
          if (p.isNavigating) {
            if (!map.getSource('mapbox-dem')) {
              map.addSource('mapbox-dem', {
                type: 'raster-dem',
                url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
                tileSize: 512,
              })
            }
            try {
              map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.15 })
            } catch { /* terrain may not be supported */ }
          } else {
            try { map.setTerrain(null as any) } catch { /* ignore */ }
          }

          // Traffic — Standard can use setConfigProperty; else add vector source + layers
          try {
            if (typeof map.setConfigProperty === 'function') {
              map.setConfigProperty('basemap', 'showTraffic', p.showTraffic ?? false)
            }
          } catch { /* not Standard */ }
          try {
            if (!map.getSource('mapbox-traffic')) {
              map.addSource('mapbox-traffic', {
                type: 'vector',
                url: 'mapbox://mapbox.mapbox-traffic-v1',
              })
            }
            const trafficColors: Record<string, string> = { low: '#5AAA7A', moderate: '#E8C44A', heavy: '#E07830', severe: '#D04040' }
            ;['low', 'moderate', 'heavy', 'severe'].forEach((level) => {
              if (map.getLayer(`sr-traffic-${level}`)) return
              map.addLayer({
                id: `sr-traffic-${level}`,
                type: 'line',
                source: 'mapbox-traffic',
                'source-layer': 'traffic',
                slot: 'middle',
                filter: ['==', ['get', 'congestion'], level],
                paint: {
                  'line-color': trafficColors[level] ?? '#5AAA7A',
                  'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1, 14, 3, 18, 6],
                  'line-opacity': 0.65,
                },
                layout: { 'line-cap': 'round', 'line-join': 'round', visibility: (p.showTraffic ? 'visible' : 'none') as 'visible' | 'none' },
              })
            })
          } catch { /* traffic source may not be available */ }

          const sourceIds = ['sr-gas', 'sr-reports', 'sr-friends', 'sr-friend-overlaps', 'sr-steps', 'sr-user', 'sr-destination', 'sr-dropped-pin', 'sr-route-start', 'sr-trip-history', 'sr-signals', 'sr-sidewalks', 'sr-cameras', 'sr-construction']
          sourceIds.forEach((id) => {
            if (!map.getSource(id)) map.addSource(id, { type: 'geojson', data: emptyFC })
          })
          if (!map.getSource('sr-route')) {
            map.addSource('sr-route', { type: 'geojson', data: emptyFC, lineMetrics: true } as any)
          }
          if (!map.getSource('sr-offers')) {
            map.addSource('sr-offers', {
              type: 'geojson',
              data: emptyFC,
              cluster: true,
              clusterMaxZoom: 13,
              clusterRadius: 50,
            } as any)
          }
          if (!map.getSource('sr-photo-reports')) {
            map.addSource('sr-photo-reports', {
              type: 'geojson',
              data: emptyFC,
              cluster: true,
              clusterMaxZoom: 13,
              clusterRadius: 50,
            } as any)
          }

          map.addLayer({ id: 'sr-route-glow', type: 'line', source: 'sr-route', slot: 'middle', filter: ['==', ['get', 'segment'], 'ahead'], paint: { 'line-color': C.routeGlow, 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 14, 18, 30], 'line-blur': ['interpolate', ['linear'], ['zoom'], 12, 8, 18, 15], 'line-opacity': 0.18 }, layout: { 'line-cap': 'round', 'line-join': 'round' } })
        map.addLayer({ id: 'sr-route-ahead-casing', type: 'line', source: 'sr-route', slot: 'middle', filter: ['==', ['get', 'segment'], 'ahead'], paint: { 'line-color': C.routeCasing, 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 7, 18, 16], 'line-opacity': 0.55 }, layout: { 'line-cap': 'round', 'line-join': 'round' } })
        map.addLayer({ id: 'sr-route-ahead', type: 'line', source: 'sr-route', slot: 'middle', filter: ['==', ['get', 'segment'], 'ahead'], paint: { 'line-color': C.routeAhead, 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 4.5, 18, 11], 'line-opacity': 0.92 }, layout: { 'line-cap': 'round', 'line-join': 'round' } })
        map.addLayer({ id: 'sr-route-passed', type: 'line', source: 'sr-route', slot: 'middle', filter: ['==', ['get', 'segment'], 'passed'], paint: { 'line-color': C.routePassed, 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 3, 18, 8], 'line-opacity': 0.4 }, layout: { 'line-cap': 'round', 'line-join': 'round' } })
        map.addLayer({
          id: 'sr-route-arrows',
          type: 'symbol',
          source: 'sr-route',
          slot: 'top',
          filter: ['==', ['get', 'segment'], 'ahead'],
          layout: {
            'symbol-placement': 'line',
            'symbol-spacing': 100,
            'text-field': '›',
            'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
            'text-size': 14,
            'text-allow-overlap': true,
            'text-ignore-placement': true,
            'text-rotation-alignment': 'map',
          },
          paint: {
            'text-color': '#ffffff',
            'text-opacity': 0.7,
          },
        })
        map.addLayer({ id: 'sr-trip-history', type: 'line', source: 'sr-trip-history', slot: 'middle', paint: { 'line-color': '#8888aa', 'line-width': 2, 'line-opacity': 0.3, 'line-dasharray': [2, 4] }, layout: { 'line-cap': 'round', 'line-join': 'round' } })
        map.addLayer({ id: 'sr-offers-cluster', type: 'circle', source: 'sr-offers', slot: 'top', filter: ['has', 'point_count'], paint: { 'circle-color': '#c89048', 'circle-radius': ['step', ['get', 'point_count'], 16, 5, 20, 10, 26], 'circle-opacity': 0.85, 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' } })
        map.addLayer({ id: 'sr-offers-cluster-count', type: 'symbol', source: 'sr-offers', slot: 'top', filter: ['has', 'point_count'], layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'], 'text-size': 12 }, paint: { 'text-color': '#ffffff' } })
        map.addLayer({ id: 'sr-offers', type: 'circle', source: 'sr-offers', slot: 'top', filter: ['!', ['has', 'point_count']], paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 5, 18, 12], 'circle-color': ['match', ['get', 'category'], 'gas', C.offerGas, C.offer], 'circle-stroke-width': 2.5, 'circle-stroke-color': '#ffffff', 'circle-opacity': 0.95 } })
        map.addLayer({
          id: 'sr-offer-zones',
          type: 'circle',
          source: 'sr-offers',
          slot: 'middle',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-radius': { stops: [[10, 20], [14, 60], [16, 120]], base: 2 },
            'circle-color': '#c89048',
            'circle-opacity': 0.08,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#c89048',
            'circle-stroke-opacity': 0.2,
          },
          layout: { visibility: 'visible' },
        })
        map.addLayer({
          id: 'sr-offers-label',
          type: 'symbol',
          source: 'sr-offers',
          slot: 'top',
          filter: ['!', ['has', 'point_count']],
          layout: {
            'text-field': ['concat', ['get', 'business'], '\n', ['get', 'label']],
            'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
            'text-size': 11,
            'text-anchor': 'top',
            'text-offset': [0, 1.4],
            'text-max-width': 10,
            'text-line-height': 1.3,
          },
          paint: {
            'text-color': '#1a1a1a',
            'text-halo-color': '#ffffff',
            'text-halo-width': 2,
          },
        })
        map.addLayer({
          id: 'sr-gas-price',
          type: 'symbol',
          source: 'sr-gas',
          slot: 'top',
          minzoom: 13,
          layout: {
            'text-field': ['concat', '$', ['to-string', ['get', 'price']]],
            'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
            'text-size': 13,
            'text-anchor': 'center',
            'text-offset': [0, 0],
            'text-allow-overlap': false,
            visibility: p.showFuelPrices ? 'visible' : 'none',
          },
          paint: {
            'text-color': '#1a6b1a',
            'text-halo-color': '#ffffff',
            'text-halo-width': 2,
          },
        })
        map.addLayer({
          id: 'sr-reports-glow',
          type: 'circle',
          source: 'sr-reports',
          slot: 'top',
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 12, 18, 24],
            'circle-color': [
              'match',
              ['get', 'type'],
              'police', '#4A90D9',
              'accident', '#D04040',
              'crash', '#D04040',
              'construction', '#F59E0B',
              'weather', '#6BA5D7',
              'pothole', '#E07830',
              'closure', '#D04040',
              'camera', '#7A6A9A',
              '#E07830',
            ],
            'circle-blur': 0.7,
            'circle-opacity': 0.15,
          },
          layout: { visibility: 'visible' },
        })
        map.addLayer({
          id: 'sr-photo-reports-circle',
          type: 'circle',
          source: 'sr-photo-reports',
          slot: 'top',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-radius': 14,
            'circle-color': [
              'match', ['get', 'category'],
              'crash', '#FF3B30',
              'construction', '#FF9500',
              'flooding', '#007AFF',
              'police', '#5856D6',
              '#FF6B00',
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': 'white',
            'circle-opacity': 0.9,
          },
        })
        map.addLayer({
          id: 'sr-photo-reports-label',
          type: 'symbol',
          source: 'sr-photo-reports',
          slot: 'top',
          filter: ['!', ['has', 'point_count']],
          layout: {
            'text-field': ['get', 'icon'],
            'text-size': 14,
            'text-anchor': 'center',
            'text-allow-overlap': true,
          },
          paint: {
            'text-color': '#ffffff',
            'text-halo-color': 'rgba(0,0,0,0.5)',
            'text-halo-width': 1.2,
          },
        })
        map.addLayer({
          id: 'sr-photo-reports-cluster',
          type: 'circle',
          source: 'sr-photo-reports',
          slot: 'top',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': '#FF6B00',
            'circle-radius': ['step', ['get', 'point_count'], 16, 5, 20, 10, 26],
            'circle-opacity': 0.85,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          },
        })
        map.addLayer({
          id: 'sr-photo-reports-cluster-count',
          type: 'symbol',
          source: 'sr-photo-reports',
          slot: 'top',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': ['get', 'point_count_abbreviated'],
            'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
            'text-size': 12,
          },
          paint: { 'text-color': '#ffffff' },
        })
        ;['sr-friends-circle', 'sr-friends-label', 'sr-friends-nav'].forEach((id) => {
          if (map.getLayer(id)) map.removeLayer(id)
        })
        map.addLayer({
          id: 'sr-friends-sos-ring',
          type: 'circle',
          source: 'sr-friends',
          filter: ['==', ['get', 'sosActive'], true],
          paint: {
            'circle-radius': 28,
            'circle-color': '#FF3B30',
            'circle-opacity': 0.25,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#FF3B30',
            'circle-stroke-opacity': 0.6,
          },
        })
        map.addLayer({
          id: 'sr-friends-outer',
          type: 'circle',
          source: 'sr-friends',
          paint: {
            'circle-radius': 20,
            'circle-color': [
              'case',
              ['==', ['get', 'sosActive'], true], '#FF3B30',
              ['==', ['get', 'isFamilyMember'], true], '#FF9500',
              '#007AFF',
            ],
            'circle-opacity': 0.2,
            'circle-stroke-width': 0,
          },
        })
        map.addLayer({
          id: 'sr-friends-circle',
          type: 'circle',
          source: 'sr-friends',
          paint: {
            'circle-radius': 14,
            'circle-color': [
              'case',
              ['==', ['get', 'sosActive'], true], '#FF3B30',
              ['==', ['get', 'isFamilyMember'], true], '#FF9500',
              '#007AFF',
            ],
            'circle-stroke-width': 2.5,
            'circle-stroke-color': 'white',
          },
        })
        map.addLayer({
          id: 'sr-friends-name',
          type: 'symbol',
          source: 'sr-friends',
          layout: {
            'text-field': ['get', 'name'],
            'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
            'text-size': 12,
            'text-anchor': 'bottom',
            'text-offset': [0, -1.8],
            'text-allow-overlap': false,
            'text-ignore-placement': false,
          },
          paint: {
            'text-color': ['case', ['==', ['get', 'isFamilyMember'], true], '#FF9500', '#007AFF'],
            'text-halo-color': 'white',
            'text-halo-width': 2,
          },
        })
        map.addLayer({
          id: 'sr-friends-speed',
          type: 'symbol',
          source: 'sr-friends',
          filter: ['>', ['get', 'speedMph'], 5],
          layout: {
            'text-field': ['concat', ['to-string', ['round', ['get', 'speedMph']]], ' mph'],
            'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
            'text-size': 10,
            'text-anchor': 'top',
            'text-offset': [0, 1.6],
            'text-allow-overlap': false,
          },
          paint: {
            'text-color': 'rgba(0,0,0,0.6)',
            'text-halo-color': 'white',
            'text-halo-width': 1.5,
          },
        })
        map.addLayer({
          id: 'sr-friends-heading',
          type: 'symbol',
          source: 'sr-friends',
          filter: ['==', ['get', 'isNavigating'], true],
          layout: {
            'icon-image': 'triangle-stroked-11',
            'icon-rotate': ['get', 'heading'],
            'icon-rotation-alignment': 'map',
            'icon-size': 1.2,
            'icon-offset': [0, -20],
            'icon-allow-overlap': true,
          },
          paint: {
            'icon-color': ['case', ['==', ['get', 'isFamilyMember'], true], '#FF9500', '#007AFF'],
            'icon-opacity': 0.9,
          },
        })
        map.addLayer({
          id: 'sr-friends-destination',
          type: 'symbol',
          source: 'sr-friends',
          filter: ['all', ['==', ['get', 'isNavigating'], true], ['!=', ['get', 'destinationName'], '']],
          minzoom: 13,
          layout: {
            'text-field': ['concat', '→ ', ['get', 'destinationName']],
            'text-font': ['DIN Pro Italic', 'Arial Unicode MS Regular'],
            'text-size': 10,
            'text-anchor': 'top',
            'text-offset': [0, 2.8],
            'text-max-width': 12,
            'text-allow-overlap': false,
          },
          paint: {
            'text-color': 'rgba(0,0,0,0.5)',
            'text-halo-color': 'white',
            'text-halo-width': 1.5,
          },
        })
        if (!map.getLayer('sr-friend-overlap-ring')) {
          map.addLayer({
            id: 'sr-friend-overlap-ring',
            type: 'circle',
            source: 'sr-friend-overlaps',
            paint: {
              'circle-radius': 18,
              'circle-color': 'transparent',
              'circle-stroke-width': 2.5,
              'circle-stroke-color': [
                'case',
                ['==', ['get', 'isFamilyMember'], true], '#FF9500',
                '#007AFF',
              ],
              'circle-opacity': 0.6,
            },
          })
        }
        if (!map.getLayer('sr-friend-overlap-label')) {
          map.addLayer({
            id: 'sr-friend-overlap-label',
            type: 'symbol',
            source: 'sr-friend-overlaps',
            layout: {
              'text-field': ['concat', ['get', 'name'], ' is on your route'],
              'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
              'text-size': 11,
              'text-anchor': 'left',
              'text-offset': [1.5, 0],
              'text-allow-overlap': false,
            },
            paint: {
              'text-color': [
                'case',
                ['==', ['get', 'isFamilyMember'], true], '#FF9500',
                '#007AFF',
              ],
              'text-halo-color': 'white',
              'text-halo-width': 2,
            },
          })
        }
        map.addLayer({
          id: 'sr-reports',
          type: 'circle',
          source: 'sr-reports',
          slot: 'top',
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 4, 14, 8, 18, 14],
            'circle-color': [
              'match',
              ['get', 'type'],
              'police', '#4A90D9',
              'accident', '#D04040',
              'crash', '#D04040',
              'construction', '#F59E0B',
              'weather', '#6BA5D7',
              'pothole', '#E07830',
              'closure', '#D04040',
              'camera', '#7A6A9A',
              '#E07830',
            ],
            // Hitbox only; actual marker is the icon layer.
            'circle-stroke-width': 0,
            'circle-opacity': 0,
          },
          layout: { visibility: 'visible' },
        })
        map.addLayer({
          id: 'sr-reports-icon',
          type: 'symbol',
          source: 'sr-reports',
          slot: 'top',
          layout: {
            'icon-image': ['get', 'iconId'],
            'icon-size': ['interpolate', ['linear'], ['zoom'], 10, 0.55, 14, 0.75, 18, 1.0],
            'icon-anchor': 'center',
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
            visibility: 'visible',
          },
        })
        if (!map.getLayer('sr-cameras')) {
          map.addLayer({
            id: 'sr-cameras',
            type: 'circle',
            source: 'sr-cameras',
            slot: 'top',
            paint: {
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 5, 14, 8, 18, 14],
              'circle-color': '#4A90D9',
              'circle-stroke-width': 3,
              'circle-stroke-color': '#ffffff',
              'circle-opacity': 0.95,
            },
            layout: { visibility: 'none' },
          })
          map.addLayer({
            id: 'sr-cameras-icon',
            type: 'symbol',
            source: 'sr-cameras',
            slot: 'top',
            layout: {
              'icon-image': ['get', 'iconId'],
              'icon-size': ['interpolate', ['linear'], ['zoom'], 10, 0.55, 14, 0.75, 18, 1.0],
              'icon-anchor': 'center',
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
              visibility: 'none',
            },
          })
        }
        if (!map.getLayer('sr-construction')) {
          map.addLayer({
            id: 'sr-construction',
            type: 'circle',
            source: 'sr-construction',
            slot: 'top',
            paint: {
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 5, 18, 11],
              'circle-color': '#F59E0B',
              'circle-stroke-width': 2.5,
              'circle-stroke-color': '#ffffff',
              'circle-opacity': 0.9,
            },
            layout: { visibility: 'visible' },
          })
          map.addLayer({
            id: 'sr-construction-icon',
            type: 'symbol',
            source: 'sr-construction',
            slot: 'top',
            layout: {
              'icon-image': ['get', 'iconId'],
              'icon-size': ['interpolate', ['linear'], ['zoom'], 10, 0.55, 14, 0.75, 18, 1.0],
              'icon-anchor': 'center',
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
              visibility: 'visible',
            },
          })
        }
        map.addLayer({ id: 'sr-steps', type: 'circle', source: 'sr-steps', slot: 'top', paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 3, 18, 7], 'circle-color': C.stepMarker, 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff', 'circle-opacity': 0.8 } })
        if (map.getLayer('sr-dest')) map.removeLayer('sr-dest')
        if (!map.getLayer('sr-destination-pin')) {
          map.addLayer({
            id: 'sr-destination-pin',
            type: 'symbol',
            source: 'sr-destination',
            slot: 'top',
            layout: {
              'icon-image': 'sr-icon-pin-dest',
              'icon-size': ['interpolate', ['linear'], ['zoom'], 10, 0.9, 14, 1.05, 18, 1.35],
              'icon-anchor': 'bottom',
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
            },
          })
        }
        if (map.getLayer('sr-dropped-pin')) map.removeLayer('sr-dropped-pin')
        if (!map.getLayer('sr-dropped-pin')) {
          map.addLayer({
            id: 'sr-dropped-pin',
            type: 'symbol',
            source: 'sr-dropped-pin',
            slot: 'top',
            layout: {
              'icon-image': 'sr-icon-pin',
              'icon-size': ['interpolate', ['linear'], ['zoom'], 10, 0.9, 14, 1.05, 18, 1.35],
              'icon-anchor': 'bottom',
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
            },
          })
        }
        if (!map.getLayer('sr-route-start')) {
          map.addLayer({
            id: 'sr-route-start',
            type: 'symbol',
            source: 'sr-route-start',
            slot: 'top',
            layout: {
              'icon-image': 'sr-icon-pin-start',
              'icon-size': ['interpolate', ['linear'], ['zoom'], 10, 0.9, 14, 1.05, 18, 1.35],
              'icon-anchor': 'bottom',
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
            },
          })
        }
        if (!map.getLayer('sr-signals')) {
          map.addLayer({ id: 'sr-signals-glow', type: 'circle', source: 'sr-signals', slot: 'top', paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 10, 18, 22], 'circle-color': ['match', ['get', 'signalType'], 'traffic-light', '#22C55E', 'stop-sign', '#EF4444', 'speed-camera', '#8B5CF6', '#22C55E'], 'circle-blur': 0.6, 'circle-opacity': 0.25 } })
          map.addLayer({ id: 'sr-signals', type: 'circle', source: 'sr-signals', slot: 'top', paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 6, 16, 10, 18, 14], 'circle-color': ['match', ['get', 'signalType'], 'traffic-light', '#22C55E', 'stop-sign', '#EF4444', 'speed-camera', '#8B5CF6', '#22C55E'], 'circle-stroke-width': 3, 'circle-stroke-color': '#ffffff', 'circle-opacity': 0.95 } })
          map.addLayer({
            id: 'sr-signals-icon',
            type: 'symbol',
            source: 'sr-signals',
            slot: 'top',
            layout: {
              'icon-image': ['get', 'iconId'],
              // Slightly larger stop-sign markers for "premium" legibility.
              'icon-size': [
                'interpolate',
                ['linear'],
                ['zoom'],
                10, ['case', ['==', ['get', 'signalType'], 'stop-sign'], 0.62, 0.5],
                14, ['case', ['==', ['get', 'signalType'], 'stop-sign'], 0.88, 0.7],
                18, ['case', ['==', ['get', 'signalType'], 'stop-sign'], 1.12, 0.95],
              ],
              'icon-anchor': 'center',
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
            },
          })
        }

        if (!map.getLayer('sr-sidewalks')) {
          map.addLayer({
            id: 'sr-sidewalks',
            type: 'line',
            source: 'sr-sidewalks',
            slot: 'bottom',
            minzoom: 15,
            paint: {
              'line-color': schemeFromUi(latestPropsRef.current.colorScheme) === 'dark' ? 'rgba(255,255,255,0.35)' : 'rgba(15,23,42,0.25)',
              'line-width': ['interpolate', ['linear'], ['zoom'], 15, 1.2, 17, 2.2, 19, 3.0],
              'line-opacity': 0.9,
            },
            layout: { 'line-cap': 'round', 'line-join': 'round' },
          })
        }
        if (map.getLayer('sr-user-accuracy')) map.removeLayer('sr-user-accuracy')
        if (map.getLayer('sr-user-pulse')) map.removeLayer('sr-user-pulse')
        if (map.getLayer('sr-user')) map.removeLayer('sr-user')
        if (map.getLayer('sr-user-arrow')) map.removeLayer('sr-user-arrow')
        if (!map.getLayer('sr-user-cone')) {
          map.addLayer({
            id: 'sr-user-cone',
            type: 'symbol',
            source: 'sr-user',
            slot: 'top',
            filter: ['any', ['==', ['get', 'isNavigating'], true], ['>', ['coalesce', ['get', 'speedMps'], 0], 1.0]],
            layout: {
              'icon-image': 'sr-icon-nav-cone',
              'icon-size': ['interpolate', ['linear'], ['zoom'], 12, 0.95, 15, 1.2, 17, 1.45, 19, 1.7],
              'icon-rotate': ['get', 'heading'],
              'icon-rotation-alignment': 'map',
              'icon-anchor': 'bottom',
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
            },
            paint: {
              'icon-opacity': [
                'case',
                ['==', ['get', 'isNavigating'], true], 0.6,
                ['>', ['coalesce', ['get', 'speedMps'], 0], 1.0], 0.3,
                0,
              ],
            },
          })
        }
        if (!map.getLayer('sr-user-marker')) {
          map.addLayer({
            id: 'sr-user-marker',
            type: 'symbol',
            source: 'sr-user',
            slot: 'top',
            layout: {
              'icon-image': ['get', 'iconId'],
              'icon-size': ['interpolate', ['linear'], ['zoom'], 10, 0.9, 14, 1.05, 18, 1.35],
              'icon-rotate': ['get', 'heading'],
              'icon-rotation-alignment': 'map',
              'icon-anchor': 'center',
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
            },
          })
        }

        // Ensure incident markers render above the user dot (reporting at current location would otherwise be hidden).
        try {
          if (map.getLayer('sr-reports')) map.moveLayer('sr-reports')
          if (map.getLayer('sr-reports-glow')) map.moveLayer('sr-reports-glow')
          if (map.getLayer('sr-reports-icon')) map.moveLayer('sr-reports-icon')
        } catch { /* ignore */ }

        function applyDataFromRefs(m: mapboxgl.Map) {
          const r = latestPropsRef.current
          const routeFeatures = buildRouteSegments(
            r.routePolyline as { lat: number; lng: number }[] | undefined,
            r.isNavigating as boolean | undefined,
            r.userLocation as { lat: number; lng: number },
            r.speedMps as number | undefined
          )
          const routeSrc = m.getSource('sr-route') as mapboxgl.GeoJSONSource | undefined
          routeSrc?.setData({ type: 'FeatureCollection', features: routeFeatures })
          const userScheme = schemeFromUi(r.colorScheme)
          const userFeature = buildUserFeature(
            r.userLocation.lat,
            r.userLocation.lng,
            r.vehicleHeading,
            r.isNavigating as boolean | undefined,
            r.isMoving as boolean | undefined,
            r.speedMps as number | undefined,
            userScheme
          )
          queueUserSourceUpdate(userFeature, m)
          const destSrc = m.getSource('sr-destination') as mapboxgl.GeoJSONSource | undefined
          destSrc?.setData(r.destinationCoordinate ? { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { label: 'Destination' }, geometry: { type: 'Point', coordinates: toCoord(r.destinationCoordinate!) } }] } : emptyFC)
          const droppedPinSrc = m.getSource('sr-dropped-pin') as mapboxgl.GeoJSONSource | undefined
          droppedPinSrc?.setData(r.droppedPin ? { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { label: r.droppedPin.label ?? 'Dropped pin' }, geometry: { type: 'Point', coordinates: [r.droppedPin.lng, r.droppedPin.lat] } }] } : emptyFC)
          const routeStartSrc = m.getSource('sr-route-start') as mapboxgl.GeoJSONSource | undefined
          routeStartSrc?.setData(r.routeStartCoordinate ? { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { label: 'Start' }, geometry: { type: 'Point', coordinates: [r.routeStartCoordinate.lng, r.routeStartCoordinate.lat] } }] } : emptyFC)
          const offerFeatures: GeoJSON.Feature[] = (r.offers || [])
            .filter((o) => o.lat && o.lng && !o.redeemed)
            .map((o) => ({
              type: 'Feature' as const,
              properties: {
                id: o.id,
                label: `${o.discount_percent}% off`,
                business: (o as any).business_name ?? (o as any).title ?? 'Offer',
                gems: (o as any).gems_reward ?? (o as any).base_gems ?? 0,
                logo_url: (o as any).logo_url ?? (o as any).image_url ?? null,
                category: (o as any).business_name?.toLowerCase().includes('gas') ? 'gas' : 'food',
              },
              geometry: { type: 'Point' as const, coordinates: [o.lng!, o.lat!] },
            }))
          const offerSrc = m.getSource('sr-offers') as mapboxgl.GeoJSONSource | undefined
          offerSrc?.setData({ type: 'FeatureCollection', features: offerFeatures })
          const gasFeatures: GeoJSON.Feature[] = (r.gasStations || [])
            .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng) && Number.isFinite(s.price) && s.price > 0)
            .map((s) => ({
              type: 'Feature' as const,
              properties: { name: s.name, brand: s.brand, price: s.price.toFixed(2) },
              geometry: { type: 'Point' as const, coordinates: [s.lng, s.lat] },
            }))
          const gasSrc = m.getSource('sr-gas') as mapboxgl.GeoJSONSource | undefined
          gasSrc?.setData({ type: 'FeatureCollection', features: gasFeatures })
          const reportFeatures: GeoJSON.Feature[] = (r.roadReports || []).map((rep) => ({
            type: 'Feature' as const,
            properties: { id: rep.id, type: rep.type, title: rep.title, iconId: reportTypeToIconId(rep.type, schemeFromUi(r.colorScheme)) },
            geometry: { type: 'Point' as const, coordinates: [rep.lng, rep.lat] },
          }))
          const reportSrc = m.getSource('sr-reports') as mapboxgl.GeoJSONSource | undefined
          reportSrc?.setData({ type: 'FeatureCollection', features: reportFeatures })
          const photoFeatures: GeoJSON.Feature[] = (r.photoReports || []).map((rep) => {
            const cat = String(rep.category ?? 'hazard').toLowerCase()
            const icon =
              cat === 'crash' ? '💥' :
              cat === 'construction' ? '🚧' :
              cat === 'flooding' ? '🌊' :
              cat === 'police' ? '🚔' : '⚠️'
            return {
              type: 'Feature' as const,
              properties: { id: rep.id, category: cat, upvotes: rep.upvotes ?? 0, icon },
              geometry: { type: 'Point' as const, coordinates: [rep.lng, rep.lat] },
            }
          })
          const photoSrc = m.getSource('sr-photo-reports') as mapboxgl.GeoJSONSource | undefined
          photoSrc?.setData({ type: 'FeatureCollection', features: photoFeatures })
          const friendFeatures: GeoJSON.Feature[] = (r.friendLocations || []).map((f) => ({
            type: 'Feature' as const,
            properties: {
              id: f.id,
              name: f.name,
              isNavigating: f.isNavigating ?? false,
              isFamilyMember: f.isFamilyMember ?? false,
              speedMph: f.speedMph ?? 0,
              heading: f.heading ?? 0,
              destinationName: f.destinationName ?? '',
              sosActive: f.sosActive ?? false,
              avatarInitial: (f.name ?? '?')[0].toUpperCase(),
            },
            geometry: { type: 'Point' as const, coordinates: [f.lng, f.lat] },
          }))
          const friendSrc = m.getSource('sr-friends') as mapboxgl.GeoJSONSource | undefined
          friendSrc?.setData({ type: 'FeatureCollection', features: friendFeatures })
          const stepFeatures: GeoJSON.Feature[] = (r.navigationSteps || []).filter((_, i) => i >= (r.currentStepIndex ?? 0)).map((step, i) => ({ type: 'Feature' as const, properties: { instruction: step.instruction, index: i }, geometry: { type: 'Point' as const, coordinates: [0, 0] } })).filter((f) => f.geometry.coordinates[0] !== 0)
          const stepSrc = m.getSource('sr-steps') as mapboxgl.GeoJSONSource | undefined
          stepSrc?.setData({ type: 'FeatureCollection', features: stepFeatures })
          const tripFeatures: GeoJSON.Feature[] = (r.tripHistoryPolylines || []).map((poly) => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: poly.map(toCoord) } }))
          const tripSrc = m.getSource('sr-trip-history') as mapboxgl.GeoJSONSource | undefined
          tripSrc?.setData({ type: 'FeatureCollection', features: tripFeatures })
          const signalFeatures: GeoJSON.Feature[] = (r.signals || []).map((s) => ({
            type: 'Feature' as const,
            properties: { id: s.id, signalType: s.type, iconId: signalTypeToIconId(s.type, schemeFromUi(r.colorScheme)) },
            geometry: { type: 'Point' as const, coordinates: [s.lng, s.lat] },
          }))
          const signalSrc = m.getSource('sr-signals') as mapboxgl.GeoJSONSource | undefined
          signalSrc?.setData({ type: 'FeatureCollection', features: signalFeatures })
          const camScheme = schemeFromUi(r.colorScheme)
          const cameraFeatures: GeoJSON.Feature[] = (r.cameraLocations || []).map((c) => ({
            type: 'Feature' as const,
            properties: { id: c.id, name: c.name, iconId: `sr-icon-camera-v4-${camScheme}` },
            geometry: { type: 'Point' as const, coordinates: [c.lng, c.lat] },
          }))
          const cameraSrc = m.getSource('sr-cameras') as mapboxgl.GeoJSONSource | undefined
          cameraSrc?.setData({ type: 'FeatureCollection', features: cameraFeatures })
          const constructionFeatures: GeoJSON.Feature[] = (r.constructionZones || []).map((c) => ({
            type: 'Feature' as const,
            properties: { id: c.id, title: c.title, iconId: `sr-icon-construction-v4-${camScheme}` },
            geometry: { type: 'Point' as const, coordinates: [c.lng, c.lat] },
          }))
          const constructionSrc = m.getSource('sr-construction') as mapboxgl.GeoJSONSource | undefined
          constructionSrc?.setData({ type: 'FeatureCollection', features: constructionFeatures })
          const visT = r.showTraffic ? 'visible' : 'none'
          ;['low', 'moderate', 'heavy', 'severe'].forEach((level) => { if (m.getLayer(`sr-traffic-${level}`)) m.setLayoutProperty(`sr-traffic-${level}`, 'visibility', visT) })
          try { if (typeof m.setConfigProperty === 'function') m.setConfigProperty('basemap', 'showTraffic', r.showTraffic ?? false) } catch { /* not Standard */ }
          const visC = r.showCameras ? 'visible' : 'none'
          if (m.getLayer('sr-cameras')) m.setLayoutProperty('sr-cameras', 'visibility', visC)
          if (m.getLayer('sr-cameras-icon')) m.setLayoutProperty('sr-cameras-icon', 'visibility', visC)
          // Default to visible if showIncidents is undefined
          const visI = r.showIncidents === false ? 'none' : 'visible'
          ;['sr-reports', 'sr-reports-glow', 'sr-reports-icon'].forEach((id) => { if (m.getLayer(id)) m.setLayoutProperty(id, 'visibility', visI) })
          // Default to visible if showConstruction is undefined
          const visCo = r.showConstruction === false ? 'none' : 'visible'
          if (m.getLayer('sr-construction')) m.setLayoutProperty('sr-construction', 'visibility', visCo)
          if (m.getLayer('sr-construction-icon')) m.setLayoutProperty('sr-construction-icon', 'visibility', visCo)
          const visFuel = r.showFuelPrices ? 'visible' : 'none'
          if (m.getLayer('sr-gas-price')) m.setLayoutProperty('sr-gas-price', 'visibility', visFuel)
        }
        applyDataFromRefs(map)

        sourcesReady.current = true
        const haversineMeters = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
          const R = 6371000
          const dLat = (lat2 - lat1) * Math.PI / 180
          const dLng = (lng2 - lng1) * Math.PI / 180
          const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
          return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        }
        map.on('moveend', () => {
          if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current)
          fetchDebounceRef.current = setTimeout(() => {
            const centerNow = map.getCenter()
            const last = lastFetchCenterRef.current
            const dist = haversineMeters(last.lat, last.lng, centerNow.lat, centerNow.lng)
            if (dist > 1600 || last.lat === 0) {
              lastFetchCenterRef.current = { lat: centerNow.lat, lng: centerNow.lng }
              onMapMoved?.(centerNow.lat, centerNow.lng)
            }
          }, 600)
        })
        map.on('click', 'sr-offers-cluster', (e: any) => {
          const features = map.queryRenderedFeatures(e.point, { layers: ['sr-offers-cluster'] })
          const clusterId = features[0]?.properties?.cluster_id
          if (!clusterId) return
          const src = map.getSource('sr-offers') as mapboxgl.GeoJSONSource
          src.getClusterExpansionZoom(clusterId, (err: any, z: number | null | undefined) => {
            if (!err && typeof z === 'number') map.easeTo({ center: (features[0].geometry as any).coordinates, zoom: z })
          })
        })
        map.on('click', 'sr-photo-reports-cluster', (e: any) => {
          const features = map.queryRenderedFeatures(e.point, { layers: ['sr-photo-reports-cluster'] })
          const clusterId = features[0]?.properties?.cluster_id
          if (!clusterId) return
          const src = map.getSource('sr-photo-reports') as mapboxgl.GeoJSONSource
          src.getClusterExpansionZoom(clusterId, (err: any, z: number | null | undefined) => {
            if (!err && typeof z === 'number') map.easeTo({ center: (features[0].geometry as any).coordinates, zoom: z })
          })
        })
        map.on('click', 'sr-offers', (e) => {
          if (!e.features?.[0]?.properties) return
          const p = e.features[0].properties
          const offer = (offers || []).find((o) => o.id === Number(p.id))
          if (offer) onOfferClick?.(offer)
        })
        map.on('mouseenter', 'sr-offers', () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', 'sr-offers', () => { map.getCanvas().style.cursor = 'default' })
        map.on('mouseenter', 'sr-reports', () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', 'sr-reports', () => { map.getCanvas().style.cursor = 'default' })
        ;['sr-cameras', 'sr-cameras-icon', 'sr-construction'].forEach((layerId) => {
          if (map.getLayer(layerId)) {
            map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer' })
            map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = 'default' })
          }
        })
        ;['sr-cameras', 'sr-cameras-icon'].forEach((layerId) => {
          if (!map.getLayer(layerId)) return
          map.on('click', layerId, (e) => {
            const f = e.features?.[0]
            const idRaw = f?.properties?.id
            if (idRaw == null) return
            onCameraClick?.(String(idRaw))
          })
        })
        map.on('click', 'sr-reports', (e) => {
          if (!e.features?.[0]?.properties || !onReportClick) return
          const f = e.features[0]
          const id = Number(f.properties?.id)
          const report = (roadReports || []).find((r) => r.id === id)
          if (report) onReportClick(report)
        })
        map.on('click', 'sr-photo-reports-circle', (e: any) => {
          const id = e.features?.[0]?.properties?.id
          if (id && onPhotoReportTap) onPhotoReportTap(String(id))
        })
        map.on('click', 'sr-friends-circle', (e: any) => {
          const id = e.features?.[0]?.properties?.id
          if (id && onFriendMarkerTap) onFriendMarkerTap(String(id))
        })
        map.on('mouseenter', 'sr-friends-circle', () => {
          map.getCanvas().style.cursor = 'pointer'
        })
        map.on('mouseleave', 'sr-friends-circle', () => {
          map.getCanvas().style.cursor = ''
        })

          const zoomToUser = (lat: number, lng: number, isNav: boolean, zoomOverride?: number) => {
            map.easeTo({
              center: [lng, lat],
              zoom: typeof zoomOverride === 'number' ? zoomOverride : (isNav ? navFollowZoom : 15),
              pitch: isNav ? 60 : 0,
              bearing: isNav ? (vehicleHeading ?? 0) : 0,
              padding: isNav ? { top: 0, bottom: Math.max(260, contentInsets?.bottom ?? 0), left: 0, right: 0 } : { top: 0, bottom: 0, left: 0, right: 0 },
              duration: 800,
            })
          }
          const actions = { resetHeading: () => map.easeTo({ bearing: 0, pitch: 50, duration: 500 }), clearUserInteracting: () => { userInteracting.current = false } }
          onMapReady?.(map, zoomToUser, actions)
        } catch (styleErr) {
          const msg = styleErr instanceof Error ? styleErr.message : String(styleErr)
          onMapError?.(msg)
          sourcesReady.current = true
          const zoomToUser = (lat: number, lng: number, isNav: boolean, zoomOverride?: number) => {
            map.easeTo({
              center: [lng, lat],
              zoom: typeof zoomOverride === 'number' ? zoomOverride : (isNav ? navFollowZoom : 15),
              pitch: isNav ? 60 : 0,
              bearing: isNav ? (vehicleHeading ?? 0) : 0,
              padding: isNav ? { top: 0, bottom: Math.max(260, contentInsets?.bottom ?? 0), left: 0, right: 0 } : { top: 0, bottom: 0, left: 0, right: 0 },
              duration: 800,
            })
          }
          const actions = { resetHeading: () => map.easeTo({ bearing: 0, pitch: 50, duration: 500 }), clearUserInteracting: () => { userInteracting.current = false } }
          onMapReady?.(map, zoomToUser, actions)
        }
      }
      map.on('style.load', () => {
        if (typeof map.isStyleLoaded === 'function' && !map.isStyleLoaded()) {
          map.once('idle', setupLayers)
          return
        }
        setupLayers()
      })
      // After first render, ensure 3D buildings and restore pitch for a "real map" feel.
      map.once('idle', () => {
        ensure3dBuildings(map)
        try {
          const targetPitch = pitch ?? 50
          if (map.getPitch() < 5 && targetPitch > 0) map.easeTo({ pitch: targetPitch, duration: 650 })
        } catch { /* ignore */ }
      })
      map.on('error', (e) => { onMapError?.(e.error?.message || 'Map error') })
    } catch (err) {
      onMapError?.(`Failed to initialize SnapRoad Maps: ${String(err)}`)
    }
    return () => {
      try { reportPopupRef.current?.remove() } catch { /* ignore */ }
      reportPopupRef.current = null
      if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current)
      if (userSourceRafRef.current != null) cancelAnimationFrame(userSourceRafRef.current)
      userSourceRafRef.current = null
      mapRef.current?.remove()
      mapRef.current = null
      initializedRef.current = false
      sourcesReady.current = false
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    try {
      switch (mapType) {
        case 'satellite':
        case 'hybrid':
          map.setStyle('mapbox://styles/mapbox/satellite-streets-v12', { diff: false } as any)
          break
        case 'dark':
          map.setStyle('mapbox://styles/mapbox/dark-v11', { diff: false } as any)
          break
        case 'standard':
        default:
          map.setStyle('mapbox://styles/mapbox/streets-v12', { diff: false } as any)
          break
      }
    } catch (err) {
      console.warn('[MapboxMapSnapRoad] Map type switch error:', err)
    }
  }, [mapType])

  useEffect(() => {
    const map = mapRef.current
    if (!map || userInteracting.current) return
    // Keep map fully free while not navigating; only explicit user recenter/first-load may move camera.
    if (!isNavigating || !navFollowEnabled) return
    if (cameraLockedRef && !cameraLockedRef.current) return
    if (typeof map.isStyleLoaded === 'function' && !map.isStyleLoaded()) return
    // Throttle camera updates; keep navigation mode near real-time.
    const now = Date.now()
    if (now - lastCameraApplyMsRef.current < 50) return

    if (cameraRafRef.current != null) cancelAnimationFrame(cameraRafRef.current)
    cameraRafRef.current = requestAnimationFrame(() => {
      cameraRafRef.current = null
      const cur = map.getCenter()
      const movedMeters = haversineMeters(cur.lat, cur.lng, center.lat, center.lng)
      const currentBearing = map.getBearing()
      const targetBearing = bearing ?? currentBearing
      const bearingDelta = Math.abs((((targetBearing - currentBearing) % 360) + 540) % 360 - 180)
      // Ignore micro updates to avoid camera jitter while keeping heading responsive.
      if (movedMeters <= 1.5 && bearingDelta <= 1) return
      lastCameraApplyMsRef.current = Date.now()
      const speed = Math.max(0, Number(speedMps ?? 0))
      const duration = speed > 15 ? 300 : speed > 5 ? 500 : 800
      map.easeTo({
        center: [center.lng, center.lat],
        zoom: navFollowZoom,
        bearing: targetBearing,
        pitch: 60,
        padding: { top: 0, bottom: Math.max(280, contentInsets?.bottom ?? 0), left: 0, right: 0 },
        duration,
        easing: (t) => t,
      })
    })
  }, [center.lat, center.lng, bearing, isNavigating, speedMps, contentInsets?.bottom, cameraLockedRef, navFollowEnabled, navFollowZoom])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !sourcesReady.current) return
    const features = buildRouteSegments(routePolyline, isNavigating, userLocation, speedMps)
    const src = map.getSource('sr-route') as mapboxgl.GeoJSONSource | undefined
    src?.setData({ type: 'FeatureCollection', features })
  }, [routePolyline, traveledDistanceMeters, isNavigating, userLocation.lat, userLocation.lng, speedMps])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !sourcesReady.current) return
    const scheme = schemeFromUi(colorScheme)
    const userFeature = buildUserFeature(
      userLocation.lat,
      userLocation.lng,
      vehicleHeading,
      isNavigating,
      isMoving,
      speedMps,
      scheme
    )
    queueUserSourceUpdate(userFeature, map)
    // Remove any stray user circle layers (green dot) so only the arrow marker shows.
    const style = map.getStyle()
    if (style?.layers) {
      for (const layer of style.layers) {
        const srcId = (layer as { source?: string }).source
        if (srcId === 'sr-user' && layer.id !== 'sr-user-marker' && layer.id !== 'sr-user-cone') {
          try { map.removeLayer(layer.id) } catch { /* ignore */ }
        }
      }
    }
  }, [userLocation.lat, userLocation.lng, vehicleHeading, colorScheme, isNavigating, isMoving, speedMps])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !sourcesReady.current) return
    try {
      if (typeof map.setConfigProperty === 'function') map.setConfigProperty('basemap', 'showTraffic', showTraffic ?? false)
    } catch { /* not Standard */ }
    ;['low', 'moderate', 'heavy', 'severe'].forEach((level) => {
      if (map.getLayer(`sr-traffic-${level}`)) map.setLayoutProperty(`sr-traffic-${level}`, 'visibility', showTraffic ? 'visible' : 'none')
    })
  }, [showTraffic])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !sourcesReady.current) return
    if (showFuelPrices) {
      if (!map.getSource('sr-gas')) {
        map.addSource('sr-gas', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      }
      if (!map.getLayer('sr-gas-price')) {
        map.addLayer({
          id: 'sr-gas-price',
          type: 'symbol',
          source: 'sr-gas',
          slot: 'top',
          minzoom: 13,
          layout: {
            'text-field': ['concat', '$', ['to-string', ['get', 'price']]],
            'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
            'text-size': 13,
            'text-anchor': 'center',
            'text-offset': [0, 0],
            'text-allow-overlap': false,
            visibility: 'visible',
          },
          paint: {
            'text-color': '#1a6b1a',
            'text-halo-color': '#ffffff',
            'text-halo-width': 2,
          },
        } as any)
      }
    } else {
      if (map.getLayer('sr-gas-price')) map.removeLayer('sr-gas-price')
      if (map.getSource('sr-gas')) map.removeSource('sr-gas')
    }
  }, [showFuelPrices])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !sourcesReady.current) return
    if (showCameras) {
      if (!map.getSource('sr-cameras')) {
        map.addSource('sr-cameras', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      }
      if (!map.getLayer('sr-cameras')) {
        map.addLayer({
          id: 'sr-cameras',
          type: 'circle',
          source: 'sr-cameras',
          slot: 'top',
          paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 5, 16, 10], 'circle-color': '#7A6A9A', 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff', 'circle-opacity': 0.0 },
        } as any)
      }
      if (!map.getLayer('sr-cameras-icon')) {
        map.addLayer({
          id: 'sr-cameras-icon',
          type: 'symbol',
          source: 'sr-cameras',
          slot: 'top',
          layout: { 'icon-image': ['coalesce', ['get', 'iconId'], ''], 'icon-size': ['interpolate', ['linear'], ['zoom'], 10, 0.75, 16, 1.15], 'icon-allow-overlap': true, 'icon-ignore-placement': true },
        } as any)
      }
    } else {
      if (map.getLayer('sr-cameras-icon')) map.removeLayer('sr-cameras-icon')
      if (map.getLayer('sr-cameras')) map.removeLayer('sr-cameras')
      if (map.getSource('sr-cameras')) map.removeSource('sr-cameras')
      return
    }
    const scheme = schemeFromUi(colorScheme)
    const features: GeoJSON.Feature[] = (cameraLocations || []).map((c) => ({
      type: 'Feature' as const,
      properties: { id: c.id, name: c.name, iconId: `sr-icon-camera-v4-${scheme}` },
      geometry: { type: 'Point' as const, coordinates: [c.lng, c.lat] },
    }))
    const src = map.getSource('sr-cameras') as mapboxgl.GeoJSONSource | undefined
    src?.setData({ type: 'FeatureCollection', features })
  }, [cameraLocations, showCameras, colorScheme])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !sourcesReady.current) return
    // Default visible unless explicitly toggled off
    const vis = showIncidents === false ? 'none' : 'visible'
    ;['sr-reports', 'sr-reports-glow', 'sr-reports-icon'].forEach((id) => {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vis)
    })

    // Ensure updated styling applies even if layers were created before HMR (Mapbox won't re-run addLayer).
    const colorExpr: any = [
      'match',
      ['get', 'type'],
      'police', '#4A90D9',
      'accident', '#D04040',
      'crash', '#D04040',
      'construction', '#F59E0B',
      'weather', '#6BA5D7',
      'pothole', '#E07830',
      'closure', '#D04040',
      'camera', '#7A6A9A',
      '#E07830',
    ]
    if (map.getLayer('sr-reports')) {
      map.setPaintProperty('sr-reports', 'circle-color', colorExpr)
      map.setPaintProperty('sr-reports', 'circle-radius', ['interpolate', ['linear'], ['zoom'], 10, 4, 14, 8, 18, 14])
      // Use circle layer as an invisible hitbox; the SVG icon layer is the marker.
      map.setPaintProperty('sr-reports', 'circle-opacity', 0.0)
      map.setPaintProperty('sr-reports', 'circle-stroke-width', 0)
    }
    if (map.getLayer('sr-reports-glow')) {
      map.setPaintProperty('sr-reports-glow', 'circle-color', colorExpr)
    }
    if (map.getLayer('sr-reports-icon')) {
      map.setLayoutProperty('sr-reports-icon', 'icon-image', ['get', 'iconId'])
      map.setLayoutProperty('sr-reports-icon', 'icon-size', ['interpolate', ['linear'], ['zoom'], 10, 0.55, 14, 0.75, 18, 1.0])
      map.setLayoutProperty('sr-reports-icon', 'icon-allow-overlap', true)
      map.setLayoutProperty('sr-reports-icon', 'icon-ignore-placement', true)
    }

    // Keep incidents above user dot in case style/layers were recreated.
    try {
      if (map.getLayer('sr-reports')) map.moveLayer('sr-reports')
      if (map.getLayer('sr-reports-glow')) map.moveLayer('sr-reports-glow')
      if (map.getLayer('sr-reports-icon')) map.moveLayer('sr-reports-icon')
    } catch { /* ignore */ }
  }, [showIncidents, colorScheme])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !sourcesReady.current) return
    if (!map.getLayer('sr-reports')) return

    const showPopup = (lngLat: mapboxgl.LngLatLike, props?: Record<string, any>) => {
      const t = String(props?.type ?? props?.title ?? 'Incident')
      const emoji = hazardTypeToEmoji(t)
      const title = String(props?.title ?? t)
      const html = `<div style="font-family: ui-sans-serif, system-ui; font-size: 12px;">
        <div style="font-weight:700; margin-bottom:2px;">${emoji} ${title}</div>
        <div style="opacity:0.8;">${t}</div>
      </div>`
      try { reportPopupRef.current?.remove() } catch { /* ignore */ }
      reportPopupRef.current = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 12 })
        .setLngLat(lngLat)
        .setHTML(html)
        .addTo(map)
    }

    const onMove = (e: any) => {
      const f = e.features?.[0]
      if (!f?.properties) return
      showPopup(e.lngLat, f.properties as any)
    }
    const onLeave = () => {
      try { reportPopupRef.current?.remove() } catch { /* ignore */ }
      reportPopupRef.current = null
    }
    const onClick = (e: any) => {
      const f = e.features?.[0]
      if (!f?.properties) return
      showPopup(e.lngLat, f.properties as any)
    }

    map.on('mousemove', 'sr-reports', onMove)
    map.on('mouseleave', 'sr-reports', onLeave)
    map.on('click', 'sr-reports', onClick)

    return () => {
      try { map.off('mousemove', 'sr-reports', onMove) } catch { /* ignore */ }
      try { map.off('mouseleave', 'sr-reports', onLeave) } catch { /* ignore */ }
      try { map.off('click', 'sr-reports', onClick) } catch { /* ignore */ }
      onLeave()
    }
  }, [roadReports])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !sourcesReady.current) return
    const features: GeoJSON.Feature[] = (photoReports || []).map((r) => {
      const cat = String(r.category ?? 'hazard').toLowerCase()
      const icon =
        cat === 'crash' ? '💥' :
        cat === 'construction' ? '🚧' :
        cat === 'flooding' ? '🌊' :
        cat === 'police' ? '🚔' : '⚠️'
      return {
        type: 'Feature' as const,
        properties: {
          id: r.id,
          category: cat,
          upvotes: r.upvotes ?? 0,
          icon,
        },
        geometry: { type: 'Point' as const, coordinates: [r.lng, r.lat] },
      }
    })
    const src = map.getSource('sr-photo-reports') as mapboxgl.GeoJSONSource | undefined
    src?.setData({ type: 'FeatureCollection', features })
  }, [photoReports])

  useEffect(() => {
    return () => {
      friendAnimationFramesRef.current.forEach((frameId) => cancelAnimationFrame(frameId))
      friendAnimationFramesRef.current.clear()
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !sourcesReady.current) return
    const friendFeatures: GeoJSON.Feature[] = (friendLocations || []).map((f) => ({
      type: 'Feature' as const,
      properties: {
        id: f.id,
        name: f.name,
        isNavigating: f.isNavigating ?? false,
        isFamilyMember: f.isFamilyMember ?? false,
        speedMph: f.speedMph ?? 0,
        heading: f.heading ?? 0,
        destinationName: f.destinationName ?? '',
        sosActive: f.sosActive ?? false,
        avatarInitial: (f.name ?? '?')[0].toUpperCase(),
      },
      geometry: { type: 'Point' as const, coordinates: [f.lng, f.lat] },
    }))
    const src = map.getSource('sr-friends') as mapboxgl.GeoJSONSource | undefined
    if (!src) return

    const featuresById = new Map<string, GeoJSON.Feature>(
      friendFeatures.map((feature) => [String(feature.properties?.id ?? ''), feature])
    )

    ;(friendLocations || []).forEach((friend) => {
      const friendId = friend.id
      const prev = prevFriendPositionsRef.current.get(friendId)
      const existingFrame = friendAnimationFramesRef.current.get(friendId)
      if (existingFrame != null) cancelAnimationFrame(existingFrame)

      if (!prev || (prev[0] === friend.lng && prev[1] === friend.lat)) {
        prevFriendPositionsRef.current.set(friendId, [friend.lng, friend.lat])
        return
      }

      const startTime = Date.now()
      const fromLng = prev[0]
      const fromLat = prev[1]
      const toLng = friend.lng
      const toLat = friend.lat

      const step = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / FRIEND_ANIMATION_DURATION, 1)
        const ease = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2
        const currentLng = fromLng + (toLng - fromLng) * ease
        const currentLat = fromLat + (toLat - fromLat) * ease

        const friendFeature = featuresById.get(friendId)
        if (friendFeature) {
          friendFeature.geometry = {
            type: 'Point',
            coordinates: [currentLng, currentLat],
          }
        }

        src.setData({ type: 'FeatureCollection', features: Array.from(featuresById.values()) })

        if (progress < 1) {
          const frameId = requestAnimationFrame(step)
          friendAnimationFramesRef.current.set(friendId, frameId)
        } else {
          prevFriendPositionsRef.current.set(friendId, [toLng, toLat])
          friendAnimationFramesRef.current.delete(friendId)
        }
      }

      const frameId = requestAnimationFrame(step)
      friendAnimationFramesRef.current.set(friendId, frameId)
    })

    src.setData({ type: 'FeatureCollection', features: Array.from(featuresById.values()) })
  }, [friendLocations])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !sourcesReady.current) return
    const src = map.getSource('sr-friend-overlaps') as mapboxgl.GeoJSONSource | undefined
    if (!src) return

    const features: GeoJSON.Feature[] = (friendsOnRoute || []).map((f) => ({
      type: 'Feature' as const,
      properties: {
        id: f.id,
        name: f.name.split(' ')[0],
        isFamilyMember: f.isFamilyMember ?? false,
      },
      geometry: { type: 'Point' as const, coordinates: [f.lng, f.lat] },
    }))

    src.setData({ type: 'FeatureCollection', features })
  }, [friendsOnRoute])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !sourcesReady.current) return
    const scheme = schemeFromUi(colorScheme)
    const features: GeoJSON.Feature[] = (constructionZones || []).map((c) => ({
      type: 'Feature' as const,
      properties: { id: c.id, title: c.title, iconId: `sr-icon-construction-v4-${scheme}` },
      geometry: { type: 'Point' as const, coordinates: [c.lng, c.lat] },
    }))
    const src = map.getSource('sr-construction') as mapboxgl.GeoJSONSource | undefined
    src?.setData({ type: 'FeatureCollection', features })
    // Default visible unless explicitly toggled off
    const vis = showConstruction === false ? 'none' : 'visible'
    if (map.getLayer('sr-construction')) map.setLayoutProperty('sr-construction', 'visibility', vis)
    if (map.getLayer('sr-construction-icon')) map.setLayoutProperty('sr-construction-icon', 'visibility', vis)
  }, [constructionZones, showConstruction, colorScheme])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !sourcesReady.current) return
    const features: GeoJSON.Feature[] = (signals || []).map((s) => ({
      type: 'Feature' as const,
      properties: { id: s.id, signalType: s.type, iconId: signalTypeToIconId(s.type, schemeFromUi(colorScheme)) },
      geometry: { type: 'Point' as const, coordinates: [s.lng, s.lat] },
    }))
    const src = map.getSource('sr-signals') as mapboxgl.GeoJSONSource | undefined
    src?.setData({ type: 'FeatureCollection', features })
  }, [signals])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !sourcesReady.current) return
    const src = map.getSource('sr-sidewalks') as mapboxgl.GeoJSONSource | undefined
    if (!src) return
    if (sidewalksGeojson && sidewalksGeojson.type === 'FeatureCollection') {
      src.setData(sidewalksGeojson as any)
    } else {
      src.setData(emptyFC as any)
    }
  }, [sidewalksGeojson])

  // User marker (clean area + compass) is always shown and rotates with heading; no toggle for navigating
  useEffect(() => {
    const map = mapRef.current
    if (!map || !sourcesReady.current) return
    // Optionally scale user marker slightly when navigating
    if (map.getLayer('sr-user-marker')) {
      const size: mapboxgl.Expression = isNavigating ? ['interpolate', ['linear'], ['zoom'], 10, 0.82, 14, 1.0, 18, 1.25] : ['interpolate', ['linear'], ['zoom'], 10, 0.9, 14, 1.05, 18, 1.35]
      map.setLayoutProperty('sr-user-marker', 'icon-size', size)
    }
  }, [isNavigating])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !sourcesReady.current) return
    const src = map.getSource('sr-destination') as mapboxgl.GeoJSONSource | undefined
    src?.setData(destinationCoordinate ? { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { label: 'Destination' }, geometry: { type: 'Point', coordinates: toCoord(destinationCoordinate) } }] } : emptyFC)
  }, [destinationCoordinate?.lat, destinationCoordinate?.lng])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !sourcesReady.current) return
    const src = map.getSource('sr-dropped-pin') as mapboxgl.GeoJSONSource | undefined
    if (!src) return
    src.setData(droppedPin ? { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { label: droppedPin.label ?? 'Dropped pin' }, geometry: { type: 'Point', coordinates: [droppedPin.lng, droppedPin.lat] } }] } : emptyFC)
  }, [droppedPin?.lat, droppedPin?.lng, droppedPin?.label])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !sourcesReady.current) return
    const src = map.getSource('sr-route-start') as mapboxgl.GeoJSONSource | undefined
    if (!src) return
    src.setData(routeStartCoordinate ? { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { label: 'Start' }, geometry: { type: 'Point', coordinates: [routeStartCoordinate.lng, routeStartCoordinate.lat] } }] } : emptyFC)
  }, [routeStartCoordinate?.lat, routeStartCoordinate?.lng])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !sourcesReady.current) return
    const features: GeoJSON.Feature[] = (offers || []).filter((o) => o.lat && o.lng && !o.redeemed).map((o) => ({ type: 'Feature' as const, properties: { id: o.id, label: `${o.discount_percent}% off`, category: o.business_name?.toLowerCase().includes('gas') ? 'gas' : 'food' }, geometry: { type: 'Point' as const, coordinates: [o.lng!, o.lat!] } }))
    const src = map.getSource('sr-offers') as mapboxgl.GeoJSONSource | undefined
    src?.setData({ type: 'FeatureCollection', features })
  }, [offers])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !sourcesReady.current) return
    const features: GeoJSON.Feature[] = (roadReports || []).map((r) => ({
      type: 'Feature' as const,
      properties: { id: r.id, type: r.type, title: r.title, iconId: reportTypeToIconId(r.type, schemeFromUi(colorScheme)) },
      geometry: { type: 'Point' as const, coordinates: [r.lng, r.lat] },
    }))
    const src = map.getSource('sr-reports') as mapboxgl.GeoJSONSource | undefined
    if (!src) {
      console.warn('[MapboxMapSnapRoad] sr-reports source missing; cannot render reports', { count: roadReports?.length ?? 0 })
      return
    }
    src?.setData({ type: 'FeatureCollection', features })
  }, [roadReports])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !sourcesReady.current) return
    const features: GeoJSON.Feature[] = (navigationSteps || []).filter((_, i) => i >= (currentStepIndex ?? 0)).map((step, i) => ({ type: 'Feature' as const, properties: { instruction: step.instruction, index: i }, geometry: { type: 'Point' as const, coordinates: [0, 0] } })).filter((f) => f.geometry.coordinates[0] !== 0)
    const src = map.getSource('sr-steps') as mapboxgl.GeoJSONSource | undefined
    src?.setData({ type: 'FeatureCollection', features })
  }, [navigationSteps, currentStepIndex])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !sourcesReady.current) return
    const features: GeoJSON.Feature[] = (tripHistoryPolylines || []).map((poly) => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: poly.map(toCoord) } }))
    const src = map.getSource('sr-trip-history') as mapboxgl.GeoJSONSource | undefined
    src?.setData({ type: 'FeatureCollection', features })
  }, [tripHistoryPolylines])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !fitToRoutePolyline?.length) return
    if (typeof map.isStyleLoaded === 'function' && !map.isStyleLoaded()) return
    const bounds = new mapboxgl.LngLatBounds()
    fitToRoutePolyline.forEach((p) => bounds.extend([p.lng, p.lat]))
    map.fitBounds(bounds, { padding: { top: (contentInsets?.top ?? 100) + 40, bottom: (contentInsets?.bottom ?? 200) + 40, left: (contentInsets?.left ?? 40) + 20, right: (contentInsets?.right ?? 40) + 20 }, duration: 600 })
  }, [fitToRoutePolyline])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (typeof map.isStyleLoaded === 'function' && !map.isStyleLoaded()) return
    try {
      const mapIsDark = mapType === 'dark'
      if (typeof map.setConfigProperty === 'function') {
        map.setConfigProperty('basemap', 'theme', mapIsDark ? 'faded' : 'default')
        map.setConfigProperty('basemap', 'lightPreset', mapIsDark ? 'night' : 'day')
      }
      const fogDark = mapIsDark || colorScheme === 'dark'
      map.setFog({ range: [1.0, 12.0], color: fogDark ? '#1a1a2a' : '#eae6de', 'high-color': fogDark ? '#0a0a1a' : '#c8dae8', 'space-color': fogDark ? '#0a0a15' : '#d0dce8', 'horizon-blend': 0.08, 'star-intensity': fogDark ? 0.5 : 0.0 })
    } catch { /* style not ready */ }
  }, [colorScheme, mapType])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !sourcesReady.current) return
    const modeConfig = DRIVING_MODES[drivingMode ?? 'adaptive']
    try {
      if (typeof map.setConfigProperty === 'function') {
        const lightPreset = drivingMode === 'calm' ? 'day' : drivingMode === 'sport' ? 'night' : 'dusk'
        map.setConfigProperty('basemap', 'lightPreset', lightPreset)
      }
    } catch { /* ignore */ }
    try {
      map.setFog({
        range: modeConfig.fogRange,
        color: mapType === 'dark' || colorScheme === 'dark' ? '#1a1a2a' : modeConfig.fogColor,
        'high-color': mapType === 'dark' || colorScheme === 'dark' ? '#0a0a1a' : '#c8dae8',
        'horizon-blend': 0.08,
      })
    } catch { /* style not ready */ }

    // Terrain: don't allow missing DEM source to break the map.
    try {
      const wantTerrain = (modeConfig.terrainExaggeration ?? 0) > 0.01 && (isNavigating ?? false)
      if (!wantTerrain) {
        try { map.setTerrain(null as any) } catch { /* ignore */ }
      } else {
        if (!map.getSource('mapbox-dem')) {
          try {
            map.addSource('mapbox-dem', {
              type: 'raster-dem',
              url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
              tileSize: 512,
            } as any)
          } catch { /* ignore */ }
        }
        if (map.getSource('mapbox-dem')) {
          map.setTerrain({ source: 'mapbox-dem', exaggeration: modeConfig.terrainExaggeration })
        }
      }
    } catch { /* ignore */ }

    // Mode signature: Calm "breathing" glow, Sport pulse. Adaptive stays steady.
    if (modeFxRafRef.current != null) cancelAnimationFrame(modeFxRafRef.current)
    const start = performance.now()
    const tick = () => {
      if (!mapRef.current || mapRef.current !== map) return
      if (!map.getLayer('sr-route-glow')) return
      const t = (performance.now() - start) / 1000
      let mult = 1
      if (drivingMode === 'calm') mult = 0.85 + 0.15 * (0.5 + 0.5 * Math.sin(t * 0.9))
      if (drivingMode === 'sport') mult = 0.7 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2.2))
      const base = (mapType === 'dark' ? 0.28 : modeConfig.routeGlowOpacity) ?? 0.18
      try { map.setPaintProperty('sr-route-glow', 'line-opacity', Math.max(0.02, Math.min(0.35, base * mult))) } catch { /* ignore */ }
      modeFxRafRef.current = requestAnimationFrame(tick)
    }
    modeFxRafRef.current = requestAnimationFrame(tick)
    const isDarkMap = mapType === 'dark'
    const routeAhead = isDarkMap ? C_DARK.routeAhead : modeConfig.routeAheadColor
    const routeGlowOpacity = isDarkMap ? 0.28 : modeConfig.routeGlowOpacity
    if (map.getLayer('sr-route-ahead')) map.setPaintProperty('sr-route-ahead', 'line-color', routeAhead)
    if (map.getLayer('sr-route-ahead')) {
      if (drivingMode === 'adaptive') {
        map.setPaintProperty('sr-route-ahead', 'line-gradient', ['interpolate', ['linear'], ['line-progress'], 0, '#4A90D9', 1, '#34C759'] as any)
      } else {
        map.setPaintProperty('sr-route-ahead', 'line-gradient', routeAhead as any)
      }
    }
    if (map.getLayer('sr-route-glow')) {
      map.setPaintProperty('sr-route-glow', 'line-opacity', routeGlowOpacity)
      if (isDarkMap) map.setPaintProperty('sr-route-glow', 'line-color', C_DARK.routeGlow)
    }

    // Apply mode-dependent thickness for route layers (visible even without animation).
    const widthMult = modeConfig.routeWidth ?? 1
    try {
      if (map.getLayer('sr-route-ahead')) map.setPaintProperty('sr-route-ahead', 'line-width', ['interpolate', ['linear'], ['zoom'], 12, 4.5 * widthMult, 18, 11 * widthMult])
      if (map.getLayer('sr-route-passed')) map.setPaintProperty('sr-route-passed', 'line-width', ['interpolate', ['linear'], ['zoom'], 12, 3 * widthMult, 18, 8 * widthMult])
      if (map.getLayer('sr-route-ahead-casing')) map.setPaintProperty('sr-route-ahead-casing', 'line-width', ['interpolate', ['linear'], ['zoom'], 12, 7 * widthMult, 18, 16 * widthMult])
      if (map.getLayer('sr-route-glow')) map.setPaintProperty('sr-route-glow', 'line-width', ['interpolate', ['linear'], ['zoom'], 12, 14 * widthMult, 18, 30 * widthMult])
    } catch { /* ignore */ }

    // Mode-dependent 3D building intensity.
    try {
      if (map.getLayer('sr-3d-buildings')) {
        map.setPaintProperty('sr-3d-buildings', 'fill-extrusion-opacity', modeConfig.buildingOpacity ?? 0.75)
      }
    } catch { /* ignore */ }

    // Mode-dependent icon scale: Calm smaller, Sport larger.
    const iconMult = drivingMode === 'calm' ? 0.9 : drivingMode === 'sport' ? 1.12 : 1.0
    try {
      ;['sr-reports-icon', 'sr-signals-icon', 'sr-cameras-icon', 'sr-construction-icon'].forEach((id) => {
        if (!map.getLayer(id)) return
        map.setLayoutProperty(id, 'icon-size', ['interpolate', ['linear'], ['zoom'], 10, 0.55 * iconMult, 14, 0.75 * iconMult, 18, 1.0 * iconMult])
      })
    } catch { /* ignore */ }

    if (map.getLayer('sr-route-ahead-casing')) map.setPaintProperty('sr-route-ahead-casing', 'line-color', isDarkMap ? C_DARK.routeCasing : C.routeCasing)
    if (map.getLayer('sr-route-passed')) map.setPaintProperty('sr-route-passed', 'line-color', isDarkMap ? C_DARK.routePassed : C.routePassed)
    // sr-user-marker only (no accuracy/pulse circles); iconId from data
    return () => {
      if (modeFxRafRef.current != null) cancelAnimationFrame(modeFxRafRef.current)
      modeFxRafRef.current = null
      if (userSourceRafRef.current != null) cancelAnimationFrame(userSourceRafRef.current)
      userSourceRafRef.current = null
    }
  }, [drivingMode, colorScheme, mapType, isNavigating])

  return (
    <div
      className="w-full h-full relative"
      style={{ position: 'absolute', inset: 0 }}
    >
      <div ref={containerRef} className="w-full h-full absolute inset-0" />
    </div>
  )
}

export default memo(MapboxMapSnapRoad, (prev, next) => {
  const prevLat = prev.userLocation?.lat ?? 0
  const prevLng = prev.userLocation?.lng ?? 0
  const nextLat = next.userLocation?.lat ?? 0
  const nextLng = next.userLocation?.lng ?? 0
  const prevCenterLat = prev.center?.lat ?? 0
  const prevCenterLng = prev.center?.lng ?? 0
  const nextCenterLat = next.center?.lat ?? 0
  const nextCenterLng = next.center?.lng ?? 0
  const prevHeading = prev.vehicleHeading ?? 0
  const nextHeading = next.vehicleHeading ?? 0
  const prevBearing = prev.bearing ?? 0
  const nextBearing = next.bearing ?? 0
  const prevSpeed = prev.speedMps ?? 0
  const nextSpeed = next.speedMps ?? 0
  const headingDelta = Math.abs((((nextHeading - prevHeading) % 360) + 540) % 360 - 180)
  const bearingDelta = Math.abs((((nextBearing - prevBearing) % 360) + 540) % 360 - 180)
  return (
    prev.isNavigating === next.isNavigating &&
    prev.isMoving === next.isMoving &&
    prev.showCameras === next.showCameras &&
    prev.showFuelPrices === next.showFuelPrices &&
    prev.mapType === next.mapType &&
    prev.navFollowEnabled === next.navFollowEnabled &&
    Math.abs((prev.navFollowZoom ?? 17) - (next.navFollowZoom ?? 17)) < 0.01 &&
    prev.offers === next.offers &&
    prev.friendLocations === next.friendLocations &&
    prev.photoReports === next.photoReports &&
    // Keep map responsive for low-speed motion and turn-by-turn heading changes.
    Math.abs(prevLat - nextLat) < 0.000001 &&
    Math.abs(prevLng - nextLng) < 0.000001 &&
    Math.abs(prevCenterLat - nextCenterLat) < 0.000001 &&
    Math.abs(prevCenterLng - nextCenterLng) < 0.000001 &&
    headingDelta < 0.5 &&
    bearingDelta < 0.5 &&
    Math.abs(prevSpeed - nextSpeed) < 0.05 &&
    Math.abs((prev.zoom ?? 0) - (next.zoom ?? 0)) < 0.01 &&
    Math.abs((prev.pitch ?? 0) - (next.pitch ?? 0)) < 0.5
  )
})
