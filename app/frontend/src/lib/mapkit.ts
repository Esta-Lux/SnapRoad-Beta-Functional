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
  const base = getApiBase()
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
  const url = `${base}/api/mapkit/token?origin=${encodeURIComponent(origin)}`
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
