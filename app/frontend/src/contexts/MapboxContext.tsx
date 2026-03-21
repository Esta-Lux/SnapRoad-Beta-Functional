import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

interface MapboxContextValue {
  ready: boolean
  error: string | null
  reportError: (msg: string) => void
  token: string
}

const MapboxContext = createContext<MapboxContextValue>({
  ready: false,
  error: null,
  reportError: () => {},
  token: '',
})

export function MapboxProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const token = import.meta.env.VITE_MAPBOX_TOKEN || ''

  useEffect(() => {
    if (!token) {
      setError('VITE_MAPBOX_TOKEN is not set in .env')
      return
    }
    import('mapbox-gl')
      .then((mapboxgl) => {
        mapboxgl.default.accessToken = token
        setReady(true)
      })
      .catch((err) => setError(`Failed to load mapbox-gl: ${err.message}`))
  }, [token])

  const reportError = (msg: string) => {
    setError(msg)
    console.error('[MapboxContext]', msg)
  }

  return (
    <MapboxContext.Provider value={{ ready, error, reportError, token }}>
      {children}
    </MapboxContext.Provider>
  )
}

export function useMapbox() {
  return useContext(MapboxContext)
}

export default MapboxContext
