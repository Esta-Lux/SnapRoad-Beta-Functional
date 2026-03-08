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
export function getMapKitDirections(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
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
    const Transport = MK.Directions?.Transport?.Automobile ?? 'Automobile'
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
          const rawCoords = (Array.isArray((route as Record<string, unknown>).polyline) ? (route as Record<string, unknown>).polyline : null) ?? (route as Record<string, unknown>).path ?? (route as Record<string, unknown>)._path ?? []
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

declare global {
  interface Window {
    mapkit?: unknown
  }
}
