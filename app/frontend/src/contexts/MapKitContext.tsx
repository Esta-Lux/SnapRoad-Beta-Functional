/**
 * MapKit JS availability. Tries to init once with token from backend; exposes ready state.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { initMapKit } from '@/lib/mapkit'

interface MapKitContextValue {
  ready: boolean
  error: string | null
}

const MapKitContext = createContext<MapKitContextValue>({ ready: false, error: null })

export function MapKitProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    initMapKit()
      .then((ok) => {
        if (!cancelled) {
          setReady(ok)
          if (!ok) setError('MapKit not configured (set backend .env)')
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setReady(false)
          setError(err?.message || 'MapKit init failed')
        }
      })
    return () => { cancelled = true }
  }, [])

  return (
    <MapKitContext.Provider value={{ ready, error }}>
      {children}
    </MapKitContext.Provider>
  )
}

export function useMapKit(): MapKitContextValue {
  return useContext(MapKitContext) ?? { ready: false, error: null }
}
