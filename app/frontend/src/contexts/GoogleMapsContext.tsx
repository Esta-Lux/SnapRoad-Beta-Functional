/**
 * Google Maps JS API availability. Loads script once with API key; exposes ready and error.
 */

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import { loadGoogleMapsScript } from "@/lib/googleMaps"

interface GoogleMapsContextValue {
  ready: boolean
  error: string | null
  reportError: (msg: string) => void
}

const GoogleMapsContext = createContext<GoogleMapsContextValue>({
  ready: false,
  error: null,
  reportError: () => {},
})

export function GoogleMapsProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reportError = useCallback((msg: string) => {
    setReady(false)
    setError(msg)
  }, [])

  useEffect(() => {
    let cancelled = false
    loadGoogleMapsScript()
      .then(() => {
        if (!cancelled) setReady(true)
      })
      .catch((err) => {
        if (!cancelled) {
          setReady(false)
          setError(err?.message ?? "Google Maps failed to load")
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <GoogleMapsContext.Provider value={{ ready, error, reportError }}>
      {children}
    </GoogleMapsContext.Provider>
  )
}

export function useGoogleMaps(): GoogleMapsContextValue {
  return useContext(GoogleMapsContext) ?? { ready: false, error: null, reportError: () => {} }
}
