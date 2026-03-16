/**
 * Google Maps JavaScript API loader.
 * Loads the script with key and optional mapId; resolves when google.maps is available.
 */

const MAPS_SCRIPT_ID = "google-maps-script"

function getMapsKey(): string {
  return (
    (typeof import.meta !== "undefined" && (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_GOOGLE_MAPS_API_KEY) ||
    (typeof import.meta !== "undefined" && (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_GOOGLE_PLACES_API_KEY) ||
    ""
  ).trim()
}

export function loadGoogleMapsScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve()
  const g = (window as unknown as { google?: { maps?: unknown } }).google
  if (g?.maps) return Promise.resolve()

  const key = getMapsKey()
  if (!key) return Promise.reject(new Error("Google Maps API key not set (VITE_GOOGLE_MAPS_API_KEY or VITE_GOOGLE_PLACES_API_KEY)"))

  const existing = document.getElementById(MAPS_SCRIPT_ID)
  if (existing) {
    return new Promise((resolve, reject) => {
      const check = () => {
        if ((window as unknown as { google?: { maps?: unknown } }).google?.maps) resolve()
        else setTimeout(check, 50)
      }
      check()
      setTimeout(() => reject(new Error("Google Maps script load timeout")), 15000)
    })
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.id = MAPS_SCRIPT_ID
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&libraries=marker`
    script.async = true
    script.defer = true
    script.onload = () => {
      const poll = () => {
        if ((window as unknown as { google?: { maps?: unknown } }).google?.maps) resolve()
        else requestAnimationFrame(poll)
      }
      poll()
    }
    script.onerror = () => reject(new Error("Google Maps script failed to load"))
    document.head.appendChild(script)
  })
}

/** Default Map IDs for SnapRoad cloud style (iOS / web and Android). */
export const DEFAULT_MAP_ID_IOS_WEB = "6bbf6b84600029b09c78e318"
export const DEFAULT_MAP_ID_ANDROID = "6bbf6b84600029b0a54ca702"

/** Returns custom Map ID only when explicitly set. If unset, returns undefined so the map uses default styling (avoids blank map when key has no access to the default Map ID). */
export function getGoogleMapId(): string | undefined {
  const env = typeof import.meta !== "undefined" ? (import.meta as unknown as { env?: Record<string, string> }).env : undefined
  const id = (env?.VITE_GOOGLE_MAP_ID ?? "").trim()
  return id || undefined
}

/** Directions step shape (matches backend DirectionsResult). */
export interface DirectionsStep {
  instructions: string
  distance: number
  maneuver: string
  lanes?: string
}

/** Single route from backend /api/directions. */
export interface DirectionsResult {
  polyline: { lat: number; lng: number }[]
  steps: DirectionsStep[]
  distanceMeters: number
  expectedTravelTimeSeconds: number
  name?: string
}

function getApiBase(): string {
  return (
    (typeof import.meta !== "undefined" && (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL) ||
    (typeof import.meta !== "undefined" && (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_BACKEND_URL) ||
    ""
  ).toString().replace(/\/$/, "")
}

/** Fetch directions from backend Google Directions proxy. Returns up to 3 routes. */
export async function getGoogleDirections(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<DirectionsResult[]> {
  const base = getApiBase()
  const url = `${base}/api/directions?origin_lat=${origin.lat}&origin_lng=${origin.lng}&dest_lat=${destination.lat}&dest_lng=${destination.lng}`
  const token = typeof localStorage !== "undefined" ? localStorage.getItem("snaproad_token") : null
  const headers: HeadersInit = { "Content-Type": "application/json" }
  if (token) (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`
  const res = await fetch(url, { credentials: "include", headers })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json?.error ?? `Directions failed: ${res.status}`)
  if (!json.success || !Array.isArray(json.data)) return []
  return json.data as DirectionsResult[]
}
