/**
 * Mapbox Directions helper — replaces getGoogleDirections
 * Returns the same DirectionsResult shape your DriverApp already consumes:
 *   { polyline, steps, distance, duration }
 */

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''

/** Result of reverse geocoding a point (address / place name for map tap). */
export interface ReverseGeocodeResult {
  name: string
  address?: string
  placeType?: string
}

/**
 * Reverse geocode coordinates using Mapbox Geocoding API.
 * Returns a display name (place or address) for the tapped point.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
  if (!MAPBOX_TOKEN) return null
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&types=address,place,poi&limit=1`
    )
    if (!res.ok) return null
    const data = await res.json()
    const f = data.features?.[0]
    if (!f?.place_name) return null
    const placeName = f.text ?? f.place_name
    const address = typeof f.place_name === 'string' ? f.place_name : placeName
    const placeType = f.place_type?.[0]
    return { name: placeName, address, placeType }
  } catch {
    return null
  }
}
const DIRECTIONS_BASE = 'https://api.mapbox.com/directions/v5/mapbox'

export type DirectionsProfile = 'driving' | 'driving-traffic'

export interface DirectionsStep {
  instruction: string
  distance: string
  distanceMeters: number
  duration: string
  maneuver: string
  lanes?: string
  lat: number
  lng: number
}

export interface DirectionsResult {
  polyline: { lat: number; lng: number }[]
  steps: DirectionsStep[]
  distance: number       // total meters
  duration: number       // total seconds
  distanceText: string   // e.g. "12.4 mi"
  durationText: string   // e.g. "28 min"
  /** For route picker: best uses live traffic, eco favors shorter distance. */
  routeType?: 'best' | 'eco'
  notifications?: Array<{ type?: string; message?: string; code?: string }>
}

function formatDistance(meters: number): string {
  const miles = meters / 1609.344
  return miles < 0.1 ? `${Math.round(meters)} ft` : `${miles.toFixed(1)} mi`
}

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60)
  if (mins < 60) return `${mins} min`
  const hrs = Math.floor(mins / 60)
  const rem = mins % 60
  return rem > 0 ? `${hrs} hr ${rem} min` : `${hrs} hr`
}

function mapboxManeuverToSimple(modifier?: string, type?: string): string {
  if (type === 'arrive') return 'arrive'
  if (type === 'depart') return 'depart'
  if (type === 'roundabout' || type === 'rotary') return 'roundabout'
  if (type === 'merge') return 'merge'
  if (modifier === 'uturn') return 'u-turn'
  if (modifier === 'sharp left') return 'sharp-left'
  if (modifier === 'left') return 'left'
  if (modifier === 'slight left') return 'slight-left'
  if (modifier === 'sharp right') return 'sharp-right'
  if (modifier === 'right') return 'right'
  if (modifier === 'slight right') return 'slight-right'
  if (modifier === 'straight') return 'straight'
  return type || 'straight'
}

/** One leg from Mapbox Directions API (GeoJSON with steps). */
type MapboxRouteLeg = {
  steps: Array<{
    maneuver?: { instruction?: string; modifier?: string; type?: string; location?: [number, number] }
    distance: number
    duration: number
    intersections?: Array<{ lanes?: unknown }>
  }>
}

type MapboxRouteBody = {
  geometry: { coordinates: [number, number][] }
  legs: MapboxRouteLeg[]
  distance: number
  duration: number
  notifications?: Array<{ type?: string; message?: string; code?: string }>
}

function parseRoute(route: MapboxRouteBody, routeType?: DirectionsResult['routeType']): DirectionsResult {
  const polyline: { lat: number; lng: number }[] = route.geometry.coordinates.map(
    (coord: [number, number]) => ({ lat: coord[1], lng: coord[0] })
  )
  const steps: DirectionsStep[] = []
  for (const leg of route.legs) {
    for (const step of leg.steps) {
      steps.push({
        instruction: step.maneuver?.instruction || '',
        distance: formatDistance(step.distance),
        distanceMeters: step.distance,
        duration: formatDuration(step.duration),
        maneuver: mapboxManeuverToSimple(step.maneuver?.modifier, step.maneuver?.type),
        lanes: step.intersections?.[0]?.lanes
          ? JSON.stringify(step.intersections[0].lanes)
          : undefined,
        lat: step.maneuver?.location?.[1] ?? 0,
        lng: step.maneuver?.location?.[0] ?? 0,
      })
    }
  }
  return {
    polyline,
    steps,
    distance: route.distance,
    duration: route.duration,
    distanceText: formatDistance(route.distance),
    durationText: formatDuration(route.duration),
    routeType,
    notifications: Array.isArray(route.notifications) ? route.notifications : [],
  }
}

/**
 * Get driving directions from Mapbox Directions API.
 * Drop-in replacement for getGoogleDirections.
 */
export async function getMapboxDirections(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  options?: {
    alternatives?: boolean
    overview?: 'full' | 'simplified' | 'false'
    steps?: boolean
    annotations?: string[]
    profile?: DirectionsProfile
    maxHeightMeters?: number
  }
): Promise<DirectionsResult> {
  const profile = options?.profile ?? 'driving'
  const opts = {
    alternatives: options?.alternatives ?? false,
    overview: options?.overview ?? 'full',
    steps: options?.steps ?? true,
    ...options,
  }

  const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`
  const params = new URLSearchParams({
    access_token: MAPBOX_TOKEN,
    geometries: 'geojson',
    overview: opts.overview,
    steps: String(opts.steps),
    alternatives: String(opts.alternatives),
    banner_instructions: 'true',
    voice_instructions: 'true',
    language: 'en',
  })

  if (opts.annotations?.length) {
    params.set('annotations', opts.annotations.join(','))
  }
  if (typeof opts.maxHeightMeters === 'number' && Number.isFinite(opts.maxHeightMeters)) {
    const clamped = Math.max(0, Math.min(10, opts.maxHeightMeters))
    params.set('max_height', String(clamped))
  }

  const url = `${DIRECTIONS_BASE}/${profile}/${coords}?${params}`
  const response = await fetch(url)

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Mapbox Directions API error ${response.status}: ${errText}`)
  }

  const data = await response.json()

  if (!data.routes || data.routes.length === 0) {
    throw new Error('No routes found')
  }

  return parseRoute(data.routes[0])
}

/**
 * Fetch route options: best route (traffic-aware) and eco route.
 */
export async function getMapboxRouteOptions(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  options?: { maxHeightMeters?: number }
): Promise<DirectionsResult[]> {
  const results: DirectionsResult[] = []
  try {
    const maxHeightParam =
      typeof options?.maxHeightMeters === 'number' && Number.isFinite(options.maxHeightMeters)
        ? `&max_height=${Math.max(0, Math.min(10, options.maxHeightMeters))}`
        : ''
    const [drivingRes, trafficRes] = await Promise.all([
      fetch(
        `${DIRECTIONS_BASE}/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?access_token=${MAPBOX_TOKEN}&geometries=geojson&overview=full&steps=true&alternatives=true&language=en${maxHeightParam}`
      ).then((r) => (r.ok ? r.json() : { routes: [] })),
      fetch(
        `${DIRECTIONS_BASE}/driving-traffic/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?access_token=${MAPBOX_TOKEN}&geometries=geojson&overview=full&steps=true&alternatives=false&language=en${maxHeightParam}`
      ).then((r) => (r.ok ? r.json() : { routes: [] })),
    ])

    const drivingRoutes = (drivingRes.routes ?? []) as MapboxRouteBody[]
    const trafficRoutes = (trafficRes.routes ?? []) as MapboxRouteBody[]

    if (trafficRoutes.length > 0) {
      results.push(parseRoute(trafficRoutes[0], 'best'))
    }
    if (drivingRoutes.length > 0) {
      const byDist = [...drivingRoutes].sort((a, b) => a.distance - b.distance)
      const candidate = byDist[0]
      const existing = results.find((r) => r.duration === candidate.duration && r.distance === candidate.distance)
      if (!existing) {
        results.push(parseRoute(candidate, 'eco'))
      }
    }
  } catch {
    // Fallback: single route
    const single = await getMapboxDirections(origin, destination, { profile: 'driving-traffic', maxHeightMeters: options?.maxHeightMeters })
    single.routeType = 'best'
    return [single]
  }
  if (results.length === 0) {
    const single = await getMapboxDirections(origin, destination, { profile: 'driving-traffic', maxHeightMeters: options?.maxHeightMeters })
    single.routeType = 'best'
    return [single]
  }
  return results.slice(0, 2)
}

/**
 * Get multiple alternative routes.
 */
export async function getMapboxAlternatives(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<DirectionsResult[]> {
  const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`
  const params = new URLSearchParams({
    access_token: MAPBOX_TOKEN,
    geometries: 'geojson',
    overview: 'full',
    steps: 'true',
    alternatives: 'true',
    language: 'en',
  })

  const response = await fetch(`${DIRECTIONS_BASE}/driving/${coords}?${params}`)
  if (!response.ok) throw new Error(`Mapbox error: ${response.status}`)

  const data = await response.json()
  if (!data.routes?.length) throw new Error('No routes found')

  return (data.routes as MapboxRouteBody[]).map((route) => parseRoute(route))
}

/**
 * Snap GPS coordinates to roads (Map Matching API).
 * Replaces Google Roads snap-to-road.
 */
export async function snapToRoads(
  coordinates: { lat: number; lng: number }[]
): Promise<{ lat: number; lng: number }[]> {
  if (coordinates.length < 2) return coordinates

  const coords = coordinates
    .slice(0, 100)
    .map((c) => `${c.lng},${c.lat}`)
    .join(';')

  const params = new URLSearchParams({
    access_token: MAPBOX_TOKEN,
    geometries: 'geojson',
    overview: 'full',
    tidy: 'true',
  })

  const response = await fetch(
    `https://api.mapbox.com/matching/v5/mapbox/driving/${coords}?${params}`
  )

  if (!response.ok) return coordinates

  const data = await response.json()
  if (!data.matchings?.[0]?.geometry?.coordinates) return coordinates

  return data.matchings[0].geometry.coordinates.map((c: [number, number]) => ({
    lat: c[1],
    lng: c[0],
  }))
}
