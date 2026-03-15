/**
 * MapKit JS loader and token-based init.
 * Token is fetched from our backend (never stored in frontend).
 */

const MAPKIT_SCRIPT = 'https://cdn.apple-mapkit.com/mk/5.69.0/mapkit.js'

function getApiBase(): string {
  return (
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    import.meta.env.REACT_APP_BACKEND_URL ||
    ''
  ).replace(/\/$/, '')
}

export function loadMapKitScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if ((window as unknown as { mapkit?: unknown }).mapkit) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = MAPKIT_SCRIPT
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('MapKit JS script failed to load'))
    document.head.appendChild(script)
  })
}

export async function fetchMapKitToken(): Promise<string> {
  const base = (getApiBase() || '').replace(/\/$/, '')
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
  const path = `/api/mapkit/token?origin=${encodeURIComponent(origin)}`
  const url = base ? `${base}${path}` : path
  const res = await fetch(url)
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const body = await res.json()
      detail = body.error || body.detail || detail
    } catch { /* non-JSON response */ }
    throw new Error(`MapKit token request failed: ${detail}`)
  }
  const data = await res.json()
  if (!data.success || !data.token) {
    throw new Error(data.error || 'Failed to get MapKit token')
  }
  return data.token
}

export interface MapKitInitResult {
  ok: boolean
  error?: string
}

let initPromise: Promise<MapKitInitResult> | null = null

/** Normalize MapKit maneuverType to app's turn-left / turn-right / arrive. */
function normalizeManeuver(raw: string): string {
  const lower = raw.toLowerCase().replace(/\s+/g, '-')
  if (lower.includes('right') || lower === 'turn-right') return 'turn-right'
  if (lower.includes('left') || lower === 'turn-left') return 'turn-left'
  if (lower.includes('arrive') || lower === 'destination') return 'arrive'
  if (lower.includes('u-turn')) return 'u-turn'
  if (lower.includes('merge')) return 'merge'
  return raw || 'straight'
}

/** Single step from MapKit Directions. */
export interface DirectionsStep {
  instructions: string
  distance: number
  maneuver: string
}

/** Directions result from MapKit (first/primary route). */
export interface DirectionsResult {
  polyline: { lat: number; lng: number }[]
  steps: DirectionsStep[]
  distanceMeters: number
  expectedTravelTimeSeconds: number
  name: string
}

/**
 * Get directions from MapKit JS (real road geometry). Call after initMapKit().
 * Returns up to 3 routes (alternates). Empty array if no routes found.
 */
export type TransportType = 'automobile' | 'walking' | 'transit'

export function getMapKitDirections(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  transport: TransportType = 'automobile'
): Promise<DirectionsResult[]> {
  return new Promise((resolve, reject) => {
    const w = typeof window !== 'undefined' ? window : null
    const mapkit = w ? (w as unknown as { mapkit?: unknown }).mapkit : null
    const MK = mapkit as {
      Directions: new () => { route: (req: unknown, cb: (err: unknown, data: unknown) => void) => void }
      Coordinate: new (lat: number, lng: number) => { latitude: number; longitude: number }
    } & { Directions?: { Transport?: { Automobile?: unknown } } }
    if (!mapkit || typeof MK.Directions !== 'function') {
      reject(new Error('MapKit not loaded'))
      return
    }
    const TransportMap: Record<TransportType, unknown> = {
      automobile: MK.Directions?.Transport?.Automobile ?? 'Automobile',
      walking: MK.Directions?.Transport?.Walking ?? 'Walking',
      transit: MK.Directions?.Transport?.Transit ?? 'Transit',
    }
    const Transport = TransportMap[transport] ?? TransportMap.automobile
    const directions = new MK.Directions()
    const originCoord = new MK.Coordinate(origin.lat, origin.lng)
    const destCoord = new MK.Coordinate(destination.lat, destination.lng)

    directions.route(
      {
        origin: originCoord,
        destination: destCoord,
        transportType: Transport,
        requestsAlternateRoutes: true,
      },
      (err: unknown, data: unknown) => {
        if (err) {
          reject(err instanceof Error ? err : new Error(String(err)))
          return
        }
        const res = data as { routes?: Array<{ polyline?: unknown; path?: unknown[]; _path?: unknown[]; steps?: unknown[]; distance?: number; expectedTravelTime?: number; name?: string }> }
        const routes = res?.routes ?? []
        if (routes.length === 0) {
          resolve([])
          return
        }
        const out: DirectionsResult[] = []
        for (let i = 0; i < Math.min(3, routes.length); i++) {
          const route = routes[i]
          const r = route as Record<string, unknown>
          const polyObj = r.polyline
          let rawCoords: unknown[] = []
          if (polyObj && typeof polyObj === 'object') {
            const po = polyObj as Record<string, unknown>
            if (Array.isArray(po.points)) {
              rawCoords = po.points
            } else if (Array.isArray(po)) {
              rawCoords = po as unknown[]
            } else {
              const keys = Object.keys(po)
              const numericKeys = keys.filter(k => !isNaN(Number(k)))
              if (numericKeys.length > 0) {
                rawCoords = numericKeys.sort((a, b) => Number(a) - Number(b)).map(k => po[k])
              }
            }
          }
          if (rawCoords.length === 0 && Array.isArray(r.path)) {
            rawCoords = r.path
          }
          const rawCoordsIsArray = Array.isArray(rawCoords)
          const flatCoords = rawCoordsIsArray
            ? (rawCoords as unknown[]).flatMap((seg) => (Array.isArray(seg) ? seg : [seg]))
            : []
          const polyline = flatCoords
            .map((p) => {
              const pt = p as { latitude?: number; longitude?: number; lat?: number; lng?: number }
              return { lat: Number(pt?.latitude ?? pt?.lat ?? 0), lng: Number(pt?.longitude ?? pt?.lng ?? 0) }
            })
            .filter((p) => p.lat !== 0 || p.lng !== 0)
          const stepsRaw = (route?.steps ?? []) as Array<{ instructions?: string; distance?: number; expectedTravelTime?: number; maneuverType?: string }>
          const steps: DirectionsStep[] = stepsRaw.map((s) => {
            const rawManeuver = s.maneuverType ?? ''
            const maneuver = normalizeManeuver(rawManeuver)
            return {
              instructions: s.instructions ?? 'Continue',
              distance: typeof s.distance === 'number' ? s.distance : 0,
              maneuver,
            }
          })
          const distMeters = typeof route?.distance === 'number' ? route.distance : 0
          const timeSec = typeof route?.expectedTravelTime === 'number' ? route.expectedTravelTime : 0
          out.push({
            polyline: polyline.length >= 2 ? polyline : [{ lat: origin.lat, lng: origin.lng }, { lat: destination.lat, lng: destination.lng }],
            steps,
            distanceMeters: distMeters,
            expectedTravelTimeSeconds: timeSec,
            name: `Route ${i + 1}`,
          })
        }
        // Sort so index 0 = fastest (min time), 1 = shortest (min distance), 2 = eco (fewest steps) for pill ordering
        const fastest = out.reduce((best, r) => (r.expectedTravelTimeSeconds < best.expectedTravelTimeSeconds ? r : best))
        const sorted: DirectionsResult[] = [fastest]
        const withoutFastest = out.filter((r) => r !== fastest)
        if (withoutFastest.length > 0) {
          const shortest = withoutFastest.reduce((best, r) => (r.distanceMeters < best.distanceMeters ? r : best))
          sorted.push(shortest)
          const withoutShortest = withoutFastest.filter((r) => r !== shortest)
          if (withoutShortest.length > 0) {
            const eco = withoutShortest.reduce((best, r) => (r.steps.length < best.steps.length ? r : best))
            sorted.push(eco)
          } else {
            sorted.push(shortest)
          }
        }
        resolve(sorted)
      }
    )
  })
}

/** MapKit Search autocomplete result (normalized for MapSearchBar). */
export interface MapKitSearchResult {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  /** Raw autocomplete result for passing to search() if needed. */
  _autocomplete?: unknown
}

/**
 * MapKit Search autocomplete — query real places as user types.
 * Call after initMapKit(). Uses region from userLocation or default (Columbus).
 */
export function mapkitSearchAutocomplete(
  query: string,
  region?: { center: { lat: number; lng: number }; span: { latDelta: number; lngDelta: number } }
): Promise<MapKitSearchResult[]> {
  return new Promise((resolve, reject) => {
    const w = typeof window !== 'undefined' ? window : null
    const mapkit = w ? (w as unknown as { mapkit?: unknown }).mapkit : null
    const MK = mapkit as {
      Search?: new (opts?: { region?: unknown }) => { autocomplete: (q: string, cb: (err: unknown, data: unknown) => void) => void; search: (q: unknown, cb: (err: unknown, data: unknown) => void) => void }
      Coordinate?: new (lat: number, lng: number) => { latitude: number; longitude: number }
      CoordinateSpan?: new (latDelta: number, lngDelta: number) => unknown
      CoordinateRegion?: new (center: unknown, span: unknown) => unknown
    }
    if (!mapkit || typeof MK.Search !== 'function') {
      reject(new Error('MapKit not loaded'))
      return
    }
    const center = region?.center ?? { lat: 39.9612, lng: -82.9988 }
    const span = region?.span ?? { latDelta: 0.15, lngDelta: 0.15 }
    const coord = MK.Coordinate ? new MK.Coordinate(center.lat, center.lng) : center
    const coordSpan = MK.CoordinateSpan ? new MK.CoordinateSpan(span.latDelta, span.lngDelta) : span
    const coordRegion = MK.CoordinateRegion ? new MK.CoordinateRegion(coord, coordSpan) : { center: coord, span: coordSpan }
    const search = new MK.Search!({ region: coordRegion })
    search.autocomplete(query, (err: unknown, data: unknown) => {
      if (err) {
        reject(err instanceof Error ? err : new Error(String(err)))
        return
      }
      const res = data as { results?: Array<{ displayLines?: string[]; coordinate?: { latitude: number; longitude: number } }> }
      const results = res?.results ?? []
      const out: MapKitSearchResult[] = results.map((r, i) => {
        const lines = r.displayLines ?? []
        const name = lines[0] ?? ''
        const address = lines.slice(1).join(', ') ?? ''
        const coord = r.coordinate
        return {
          id: `mk-${i}-${name}`,
          name,
          address,
          lat: coord?.latitude ?? 0,
          lng: coord?.longitude ?? 0,
          _autocomplete: r,
        }
      })
      resolve(out)
    })
  })
}

/**
 * MapKit Search — full search for a place (use when autocomplete returns no coordinate).
 * Pass autocomplete result as query to get coordinates.
 */
export function mapkitSearch(
  query: string | unknown,
  region?: { center: { lat: number; lng: number }; span: { latDelta: number; lngDelta: number } }
): Promise<MapKitSearchResult[]> {
  return new Promise((resolve, reject) => {
    const w = typeof window !== 'undefined' ? window : null
    const mapkit = w ? (w as unknown as { mapkit?: unknown }).mapkit : null
    const MK = mapkit as {
      Search?: new (opts?: { region?: unknown }) => { search: (q: unknown, cb: (err: unknown, data: unknown) => void) => void }
      Coordinate?: new (lat: number, lng: number) => { latitude: number; longitude: number }
      CoordinateSpan?: new (latDelta: number, lngDelta: number) => unknown
      CoordinateRegion?: new (center: unknown, span: unknown) => unknown
    }
    if (!mapkit || typeof MK.Search !== 'function') {
      reject(new Error('MapKit not loaded'))
      return
    }
    const center = region?.center ?? { lat: 39.9612, lng: -82.9988 }
    const span = region?.span ?? { latDelta: 0.15, lngDelta: 0.15 }
    const coord = MK.Coordinate ? new MK.Coordinate(center.lat, center.lng) : center
    const coordSpan = MK.CoordinateSpan ? new MK.CoordinateSpan(span.latDelta, span.lngDelta) : span
    const coordRegion = MK.CoordinateRegion ? new MK.CoordinateRegion(coord, coordSpan) : { center: coord, span: coordSpan }
    const search = new MK.Search!({ region: coordRegion })
    search.search(query, (err: unknown, data: unknown) => {
      if (err) {
        reject(err instanceof Error ? err : new Error(String(err)))
        return
      }
      const res = data as { places?: Array<{ name?: string; formattedAddress?: string; coordinate?: { latitude: number; longitude: number }; displayLines?: string[] }> }
      const places = res?.places ?? []
      const out: MapKitSearchResult[] = places.map((p, i) => {
        const name = p.name ?? (p.displayLines?.[0] ?? '')
        const address = p.formattedAddress ?? (p.displayLines?.slice(1).join(', ') ?? '')
        const coord = p.coordinate
        return {
          id: `mk-${i}-${name}`,
          name,
          address,
          lat: coord?.latitude ?? 0,
          lng: coord?.longitude ?? 0,
        }
      })
      resolve(out)
    })
  })
}

/**
 * Load MapKit JS script and initialize with token from our backend.
 * Returns { ok: true } on success, or { ok: false, error: "..." } with the real reason.
 */
export function initMapKit(): Promise<MapKitInitResult> {
  if (initPromise) return initPromise
  initPromise = (async (): Promise<MapKitInitResult> => {
    try {
      await loadMapKitScript()
      const mapkit = (window as unknown as {
        mapkit: {
          init: (opts: { authorizationCallback: (done: (token: string) => void) => void }) => void
          addEventListener?: (type: string, cb: (e: unknown) => void) => void
        }
      }).mapkit
      if (!mapkit || !mapkit.init) return { ok: false, error: 'MapKit JS script loaded but mapkit.init not available' }

      const token = await fetchMapKitToken()

      const result = await new Promise<MapKitInitResult>((resolve) => {
        let settled = false
        const settle = (r: MapKitInitResult) => { if (!settled) { settled = true; resolve(r) } }

        if (mapkit.addEventListener) {
          mapkit.addEventListener('configuration-change', () => settle({ ok: true }))
          mapkit.addEventListener('error', (e: unknown) => {
            const msg = (e && typeof e === 'object' && 'message' in e) ? String((e as { message: unknown }).message) : 'Apple rejected the MapKit token (check domain restrictions in Apple Developer portal)'
            console.warn('MapKit error event during init:', e)
            settle({ ok: false, error: msg })
          })
        }

        mapkit.init({
          authorizationCallback: (done: (t: string) => void) => done(token),
        })

        setTimeout(() => settle({ ok: true }), 5000)
      })

      return result
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'MapKit init failed'
      console.warn('MapKit init failed:', err)
      initPromise = null
      return { ok: false, error: msg }
    }
  })()
  return initPromise
}

/* ------------------------------------------------------------------ */
/*  Geocoding                                                          */
/* ------------------------------------------------------------------ */

export interface GeocoderResult {
  name: string
  formattedAddress: string
  lat: number
  lng: number
  locality?: string
  administrativeArea?: string
  country?: string
}

export function mapkitGeocode(address: string): Promise<GeocoderResult[]> {
  return new Promise((resolve, reject) => {
    const mapkit = typeof window !== 'undefined' ? (window as unknown as { mapkit?: unknown }).mapkit : null
    const MK = mapkit as {
      Geocoder?: new (opts?: Record<string, unknown>) => { lookup: (addr: string, cb: (err: unknown, data: unknown) => void) => void }
    }
    if (!mapkit || !MK.Geocoder) { reject(new Error('MapKit not loaded')); return }
    const geocoder = new MK.Geocoder!({ language: 'en' })
    geocoder.lookup(address, (err: unknown, data: unknown) => {
      if (err) { reject(err instanceof Error ? err : new Error(String(err))); return }
      const res = data as { results?: Array<{ name?: string; formattedAddress?: string; coordinate?: { latitude: number; longitude: number }; locality?: string; administrativeArea?: string; country?: string }> }
      resolve((res?.results ?? []).map(r => ({
        name: r.name ?? '',
        formattedAddress: r.formattedAddress ?? '',
        lat: r.coordinate?.latitude ?? 0,
        lng: r.coordinate?.longitude ?? 0,
        locality: r.locality,
        administrativeArea: r.administrativeArea,
        country: r.country,
      })))
    })
  })
}

export function mapkitReverseGeocode(lat: number, lng: number): Promise<GeocoderResult | null> {
  return new Promise((resolve, reject) => {
    const mapkit = typeof window !== 'undefined' ? (window as unknown as { mapkit?: unknown }).mapkit : null
    const MK = mapkit as {
      Geocoder?: new (opts?: Record<string, unknown>) => { reverseLookup: (coord: unknown, cb: (err: unknown, data: unknown) => void) => void }
      Coordinate?: new (lat: number, lng: number) => unknown
    }
    if (!mapkit || !MK.Geocoder || !MK.Coordinate) { reject(new Error('MapKit not loaded')); return }
    const geocoder = new MK.Geocoder!({ language: 'en' })
    const coord = new MK.Coordinate!(lat, lng)
    geocoder.reverseLookup(coord, (err: unknown, data: unknown) => {
      if (err) { reject(err instanceof Error ? err : new Error(String(err))); return }
      const res = data as { results?: Array<{ name?: string; formattedAddress?: string; coordinate?: { latitude: number; longitude: number }; locality?: string; administrativeArea?: string; country?: string }> }
      const first = res?.results?.[0]
      if (!first) { resolve(null); return }
      resolve({
        name: first.name ?? '',
        formattedAddress: first.formattedAddress ?? '',
        lat: first.coordinate?.latitude ?? lat,
        lng: first.coordinate?.longitude ?? lng,
        locality: first.locality,
        administrativeArea: first.administrativeArea,
        country: first.country,
      })
    })
  })
}

/* ------------------------------------------------------------------ */
/*  POI Category Search                                                */
/* ------------------------------------------------------------------ */

export const POI_CATEGORIES = {
  restaurant: 'Restaurant',
  gasStation: 'GasStation',
  parking: 'Parking',
  evCharger: 'EVCharger',
  hotel: 'Hotel',
  hospital: 'Hospital',
  pharmacy: 'Pharmacy',
  grocery: 'Grocery',
  cafe: 'Cafe',
  bank: 'Bank',
  atm: 'ATM',
} as const

export type POICategory = keyof typeof POI_CATEGORIES

export function mapkitPOISearch(
  category: POICategory,
  region: { center: { lat: number; lng: number }; span?: { latDelta: number; lngDelta: number } }
): Promise<MapKitSearchResult[]> {
  return new Promise((resolve, reject) => {
    const mapkit = typeof window !== 'undefined' ? (window as unknown as { mapkit?: unknown }).mapkit : null
    const MK = mapkit as {
      Search?: new (opts?: Record<string, unknown>) => { search: (q: unknown, cb: (err: unknown, data: unknown) => void) => void }
      Coordinate?: new (lat: number, lng: number) => unknown
      CoordinateSpan?: new (latDelta: number, lngDelta: number) => unknown
      CoordinateRegion?: new (center: unknown, span: unknown) => unknown
      PointOfInterestCategory?: Record<string, unknown>
      PointOfInterestFilter?: { including?: (cats: unknown[]) => unknown }
    }
    if (!mapkit || !MK.Search) { reject(new Error('MapKit not loaded')); return }

    const center = region.center
    const span = region.span ?? { latDelta: 0.05, lngDelta: 0.05 }
    const coord = MK.Coordinate ? new MK.Coordinate(center.lat, center.lng) : center
    const coordSpan = MK.CoordinateSpan ? new MK.CoordinateSpan(span.latDelta, span.lngDelta) : span
    const coordRegion = MK.CoordinateRegion ? new MK.CoordinateRegion(coord, coordSpan) : { center: coord, span: coordSpan }

    const opts: Record<string, unknown> = { region: coordRegion }
    const poiCat = MK.PointOfInterestCategory?.[POI_CATEGORIES[category]]
    if (poiCat && MK.PointOfInterestFilter?.including) {
      opts.pointOfInterestFilter = MK.PointOfInterestFilter.including([poiCat])
    }

    const search = new MK.Search!(opts)
    search.search(POI_CATEGORIES[category], (err: unknown, data: unknown) => {
      if (err) { reject(err instanceof Error ? err : new Error(String(err))); return }
      const res = data as { places?: Array<{ name?: string; formattedAddress?: string; coordinate?: { latitude: number; longitude: number } }> }
      resolve((res?.places ?? []).map((p, i) => ({
        id: `poi-${i}-${p.name}`,
        name: p.name ?? '',
        address: p.formattedAddress ?? '',
        lat: p.coordinate?.latitude ?? 0,
        lng: p.coordinate?.longitude ?? 0,
      })))
    })
  })
}

/* ------------------------------------------------------------------ */
/*  Look Around                                                        */
/* ------------------------------------------------------------------ */

export interface LookAroundAvailability {
  available: boolean
}

export function checkLookAroundAvailability(lat: number, lng: number): Promise<LookAroundAvailability> {
  return new Promise((resolve) => {
    const mapkit = typeof window !== 'undefined' ? (window as unknown as { mapkit?: unknown }).mapkit : null
    const MK = mapkit as {
      Coordinate?: new (lat: number, lng: number) => unknown
      LookAroundCamera?: new (coord: unknown) => unknown
    }
    if (!mapkit || !MK.Coordinate || !MK.LookAroundCamera) {
      resolve({ available: false })
      return
    }
    try {
      const coord = new MK.Coordinate!(lat, lng)
      new MK.LookAroundCamera!(coord)
      resolve({ available: true })
    } catch {
      resolve({ available: false })
    }
  })
}

export function createLookAroundScene(
  container: HTMLElement,
  lat: number,
  lng: number
): { destroy: () => void } | null {
  const mapkit = typeof window !== 'undefined' ? (window as unknown as { mapkit?: unknown }).mapkit : null
  const MK = mapkit as {
    Coordinate?: new (lat: number, lng: number) => unknown
    LookAroundCamera?: new (coord: unknown) => unknown
    LookAroundViewer?: new (el: HTMLElement, camera: unknown) => { destroy?: () => void }
  }
  if (!mapkit || !MK.Coordinate || !MK.LookAroundCamera || !MK.LookAroundViewer) return null
  try {
    const coord = new MK.Coordinate!(lat, lng)
    const camera = new MK.LookAroundCamera!(coord)
    const viewer = new MK.LookAroundViewer!(container, camera)
    return { destroy: () => { try { viewer.destroy?.() } catch { /* noop */ } } }
  } catch {
    return null
  }
}

/* ------------------------------------------------------------------ */
/*  ETA (client-side via MapKit Directions)                            */
/* ------------------------------------------------------------------ */

export interface ETAResult {
  distanceMeters: number
  expectedTravelTimeSeconds: number
  transportType: TransportType
}

export function getMapKitETA(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  transport: TransportType = 'automobile'
): Promise<ETAResult> {
  return new Promise((resolve, reject) => {
    const mapkit = typeof window !== 'undefined' ? (window as unknown as { mapkit?: unknown }).mapkit : null
    const MK = mapkit as {
      Directions: new () => { route: (req: unknown, cb: (err: unknown, data: unknown) => void) => void }
      Coordinate: new (lat: number, lng: number) => unknown
    } & { Directions?: { Transport?: Record<string, unknown> } }
    if (!mapkit || typeof MK.Directions !== 'function') { reject(new Error('MapKit not loaded')); return }

    const TransportMap: Record<string, unknown> = {
      automobile: MK.Directions?.Transport?.Automobile ?? 'Automobile',
      walking: MK.Directions?.Transport?.Walking ?? 'Walking',
      transit: MK.Directions?.Transport?.Transit ?? 'Transit',
    }

    const directions = new MK.Directions()
    directions.route({
      origin: new MK.Coordinate(origin.lat, origin.lng),
      destination: new MK.Coordinate(destination.lat, destination.lng),
      transportType: TransportMap[transport],
    }, (err: unknown, data: unknown) => {
      if (err) { reject(err instanceof Error ? err : new Error(String(err))); return }
      const res = data as { routes?: Array<{ distance?: number; expectedTravelTime?: number }> }
      const route = res?.routes?.[0]
      if (!route) { reject(new Error('No route found')); return }
      resolve({
        distanceMeters: route.distance ?? 0,
        expectedTravelTimeSeconds: route.expectedTravelTime ?? 0,
        transportType: transport,
      })
    })
  })
}

declare global {
  interface Window {
    mapkit?: unknown
  }
}
