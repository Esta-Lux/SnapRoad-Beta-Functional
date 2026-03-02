/**
 * Navigation core context: VehicleState + prediction.
 * Feeds the map layer (MapKit-ready: camera, vehicle position, heading, route, ghost).
 */

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { SensorFusion, predictPosition, predictionConfidence } from '@/core'
import type { VehicleState, MapCameraState, PredictedPosition, Coordinate2D } from '@/core'

interface NavigationCoreState {
  vehicle: VehicleState | null
  predicted: PredictedPosition | null
  camera: MapCameraState | null
  isLive: boolean
  error: string | null
}

interface NavigationCoreContextValue extends NavigationCoreState {
  recenter: () => void
  setCamera: (camera: MapCameraState | null) => void
}

const defaultCamera = (center: Coordinate2D): MapCameraState => ({
  center,
  zoom: 15,
  bearing: 0,
})

const initialState: NavigationCoreState = {
  vehicle: null,
  predicted: null,
  camera: null,
  isLive: false,
  error: null,
}

const NavigationCoreContext = createContext<NavigationCoreContextValue | null>(null)

const PREDICTION_SECONDS = 2

export function NavigationCoreProvider({
  children,
  fallbackCenter = { lat: 39.9612, lng: -82.9988 },
  enableGps = true,
}: {
  children: ReactNode
  fallbackCenter?: Coordinate2D
  enableGps?: boolean
}) {
  const [state, setState] = useState<NavigationCoreState>({
    ...initialState,
    camera: defaultCamera(fallbackCenter),
  })
  const fusionRef = useRef<SensorFusion | null>(null)
  const watchIdRef = useRef<number | null>(null)

  const getFusion = useCallback(() => {
    if (!fusionRef.current) fusionRef.current = new SensorFusion({ processNoise: 0.01, measurementNoise: 2.0 })
    return fusionRef.current
  }, [])

  const updateVehicle = useCallback(
    (reading: { lat: number; lng: number; speed?: number | null; heading?: number | null; accuracy?: number | null; timestamp?: number }) => {
      const fusion = getFusion()
      const vehicle = fusion.update(reading)
      const predicted = {
        coordinate: predictPosition(vehicle, PREDICTION_SECONDS),
        confidence: predictionConfidence(PREDICTION_SECONDS),
        inSeconds: PREDICTION_SECONDS,
      }
      setState((prev) => ({
        ...prev,
        vehicle,
        predicted,
        camera: { center: vehicle.coordinate, zoom: 15, bearing: vehicle.heading },
        isLive: true,
        error: null,
      }))
    },
    [getFusion]
  )

  useEffect(() => {
    if (!enableGps || typeof navigator === 'undefined' || !navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        vehicle: {
          coordinate: fallbackCenter,
          velocity: 0,
          acceleration: 0,
          heading: 0,
          turnRate: 0,
          confidence: 0,
          timestamp: Date.now(),
        },
        predicted: null,
        camera: defaultCamera(fallbackCenter),
        isLive: false,
      }))
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        updateVehicle({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          speed: pos.coords.speed != null ? pos.coords.speed : null,
          heading: pos.coords.heading != null && !isNaN(pos.coords.heading) ? pos.coords.heading : null,
          accuracy: pos.coords.accuracy ?? null,
          timestamp: pos.timestamp ?? Date.now(),
        })
      },
      (err) => {
        setState((prev) => ({
          ...prev,
          error: err.message,
          vehicle: prev.vehicle ?? {
            coordinate: fallbackCenter,
            velocity: 0,
            acceleration: 0,
            heading: 0,
            turnRate: 0,
            confidence: 0,
            timestamp: Date.now(),
          },
          camera: prev.camera ?? defaultCamera(fallbackCenter),
        }))
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
    )
    watchIdRef.current = watchId
    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current)
    }
  }, [enableGps, fallbackCenter, updateVehicle])

  const recenter = useCallback(() => {
    setState((prev) => {
      const center = prev.vehicle?.coordinate ?? fallbackCenter
      const cam = defaultCamera(center)
      if (prev.vehicle) cam.bearing = prev.vehicle.heading
      return { ...prev, camera: cam }
    })
  }, [fallbackCenter])

  const setCamera = useCallback((camera: MapCameraState | null) => {
    setState((prev) => ({ ...prev, camera: camera ?? prev.camera }))
  }, [])

  const value: NavigationCoreContextValue = {
    ...state,
    recenter,
    setCamera,
  }

  return (
    <NavigationCoreContext.Provider value={value}>
      {children}
    </NavigationCoreContext.Provider>
  )
}

export function useNavigationCore(): NavigationCoreContextValue {
  const ctx = useContext(NavigationCoreContext)
  if (!ctx) throw new Error('useNavigationCore must be used within NavigationCoreProvider')
  return ctx
}

export function useVehicleState(): VehicleState | null {
  return useContext(NavigationCoreContext)?.vehicle ?? null
}
