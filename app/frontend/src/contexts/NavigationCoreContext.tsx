/**
 * Navigation core context: VehicleState, prediction, behavior, modes, experience, camera.
 * Feeds the map layer (MapKit-ready). Phase 2+3: driving style, cognitive load, experience engine, camera director.
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
import {
  SensorFusion,
  predictPosition,
  predictionConfidence,
  snapToRoute,
  segmentFromPolyline,
  DrivingBehaviorEngine,
  computeCognitiveLoad,
  computeExperience,
  interpolateExperience,
} from '@/core'
import type {
  VehicleState,
  MapCameraState,
  PredictedPosition,
  Coordinate2D,
  DrivingMode,
  DrivingStyle,
  ExperienceState,
  RouteSegment,
} from '@/core'

interface NavigationCoreState {
  vehicle: VehicleState | null
  predicted: PredictedPosition | null
  camera: MapCameraState | null
  isLive: boolean
  error: string | null
  mode: DrivingMode
  drivingStyle: DrivingStyle
  experience: ExperienceState | null
}

interface NavigationCoreContextValue extends NavigationCoreState {
  recenter: () => void
  setCamera: (camera: MapCameraState | null) => void
  setMode: (mode: DrivingMode) => void
  setRoutePolyline: (polyline: Coordinate2D[] | null) => void
  getDrivingMetrics: () => { vehicle: VehicleState | null; style: DrivingStyle; mode: DrivingMode; experience: ExperienceState | null }
}

const defaultCamera = (center: Coordinate2D, zoom = 15, bearing = 0): MapCameraState => ({
  center,
  zoom,
  bearing,
})

const defaultExperience: ExperienceState = {
  zoom: 15,
  pitch: 60,
  routeGlow: 0.6,
  laneHighlight: 0,
  instructionLeadTime: 2,
}

const initialState: NavigationCoreState = {
  vehicle: null,
  predicted: null,
  camera: null,
  isLive: false,
  error: null,
  mode: 'adaptive',
  drivingStyle: { aggression: 0, smoothness: 1, hesitation: 0 },
  experience: defaultExperience,
}

const NavigationCoreContext = createContext<NavigationCoreContextValue | null>(null)

const PREDICTION_SECONDS = 2
const SMOOTHING = 0.08

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
  const behaviorRef = useRef<DrivingBehaviorEngine | null>(null)
  const routeSegmentsRef = useRef<RouteSegment[]>([])
  const modeRef = useRef<DrivingMode>(state.mode)
  const watchIdRef = useRef<number | null>(null)
  const smoothedExperienceRef = useRef<ExperienceState>(defaultExperience)
  modeRef.current = state.mode

  const getFusion = useCallback(() => {
    if (!fusionRef.current) fusionRef.current = new SensorFusion({ processNoise: 0.01, measurementNoise: 2.0 })
    return fusionRef.current
  }, [])

  const getBehavior = useCallback(() => {
    if (!behaviorRef.current) behaviorRef.current = new DrivingBehaviorEngine()
    return behaviorRef.current
  }, [])

  const updateVehicle = useCallback(
    (reading: { lat: number; lng: number; speed?: number | null; heading?: number | null; accuracy?: number | null; timestamp?: number }) => {
      const fusion = getFusion()
      let vehicle = fusion.update(reading)
      const segments = routeSegmentsRef.current
      if (segments.length > 0) {
        const snapped = snapToRoute(vehicle.coordinate, vehicle.heading, segments)
        if (snapped) vehicle = { ...vehicle, coordinate: snapped.coordinate }
      }
      getBehavior().push(vehicle)
      const style = getBehavior().getStyle()
      const cognitiveLoad = computeCognitiveLoad(vehicle, style)
      const mode = modeRef.current
      const targetExperience = computeExperience(vehicle, style, cognitiveLoad, mode)
      const predicted = {
        coordinate: predictPosition(vehicle, PREDICTION_SECONDS),
        confidence: predictionConfidence(PREDICTION_SECONDS),
        inSeconds: PREDICTION_SECONDS,
      }
      setState((prev) => ({
        ...prev,
        vehicle,
        predicted,
        drivingStyle: style,
        experience: targetExperience,
        camera: {
          center: vehicle.coordinate,
          zoom: targetExperience.zoom,
          bearing: vehicle.heading,
        },
        isLive: true,
        error: null,
      }))
      smoothedExperienceRef.current = interpolateExperience(smoothedExperienceRef.current, targetExperience, 0.3)
    },
    [getFusion, getBehavior]
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
        experience: defaultExperience,
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
      const zoom = prev.experience?.zoom ?? 15
      const bearing = prev.vehicle?.heading ?? 0
      return { ...prev, camera: defaultCamera(center, zoom, bearing) }
    })
  }, [fallbackCenter])

  const setCamera = useCallback((camera: MapCameraState | null) => {
    setState((prev) => ({ ...prev, camera: camera ?? prev.camera }))
  }, [])

  const setMode = useCallback((mode: DrivingMode) => {
    setState((prev) => ({ ...prev, mode }))
  }, [])

  const setRoutePolyline = useCallback((polyline: Coordinate2D[] | null) => {
    routeSegmentsRef.current = polyline && polyline.length >= 2 ? [segmentFromPolyline(polyline)] : []
  }, [])

  const getDrivingMetrics = useCallback(() => ({
    vehicle: state.vehicle,
    style: state.drivingStyle,
    mode: state.mode,
    experience: state.experience,
  }), [state.vehicle, state.drivingStyle, state.mode, state.experience])

  const value: NavigationCoreContextValue = {
    ...state,
    recenter,
    setCamera,
    setMode,
    setRoutePolyline,
    getDrivingMetrics,
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
