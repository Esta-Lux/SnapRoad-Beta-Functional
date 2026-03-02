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
  const data = await res.json()
  if (!data.success || !data.token) {
    throw new Error(data.error || 'Failed to get MapKit token')
  }
  return data.token
}

let initPromise: Promise<boolean> | null = null

/**
 * Load MapKit JS script and initialize with token from our backend.
 * Call once before using mapkit. Returns true if ready, false if token/config missing.
 */
export function initMapKit(): Promise<boolean> {
  if (initPromise) return initPromise
  initPromise = (async () => {
    try {
      await loadMapKitScript()
      const mapkit = (window as unknown as { mapkit: { init: (opts: { authorizationCallback: (done: (token: string) => void) => void }) => void } }).mapkit
      if (!mapkit || !mapkit.init) return false
      await new Promise<void>((resolve, reject) => {
        mapkit.init({
          authorizationCallback: (done: (token: string) => void) => {
            fetchMapKitToken()
              .then((token) => {
                done(token)
                resolve()
              })
              .catch((err) => {
                console.warn('MapKit token not available:', err?.message || err)
                reject(err)
              })
          },
        })
      })
      return true
    } catch {
      return false
    }
  })()
  return initPromise
}

declare global {
  interface Window {
    mapkit?: unknown
  }
}
