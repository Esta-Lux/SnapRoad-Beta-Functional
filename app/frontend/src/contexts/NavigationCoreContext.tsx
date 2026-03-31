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
      const smoothed = interpolateExperience(smoothedExperienceRef.current, targetExperience, SMOOTHING * 3)
      smoothedExperienceRef.current = smoothed
      setState((prev) => ({
        ...prev,
        vehicle,
        predicted,
        drivingStyle: style,
        experience: smoothed,
        camera: {
          center: vehicle.coordinate,
          zoom: smoothed.zoom,
          bearing: vehicle.heading,
        },
        isLive: true,
        error: null,
      }))
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

    const LAST_LOC_KEY = 'sr_last_location_v1'
    const persistLast = (lat: number, lng: number) => {
      try {
        localStorage.setItem(LAST_LOC_KEY, JSON.stringify({ lat, lng, t: Date.now() }))
      } catch {
        // ignore
      }
    }
    const readLast = (): { lat: number; lng: number } | null => {
      try {
        const raw = localStorage.getItem(LAST_LOC_KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw) as { lat?: unknown; lng?: unknown }
        const lat = Number(parsed.lat)
        const lng = Number(parsed.lng)
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
        return { lat, lng }
      } catch {
        return null
      }
    }

    // Instant paint: last-known location (improves time-to-first-location).
    const last = readLast()
    if (last) {
      setState((prev) => ({
        ...prev,
        vehicle: {
          coordinate: { lat: last.lat, lng: last.lng },
          velocity: prev.vehicle?.velocity ?? 0,
          acceleration: prev.vehicle?.acceleration ?? 0,
          heading: prev.vehicle?.heading ?? 0,
          turnRate: prev.vehicle?.turnRate ?? 0,
          confidence: prev.vehicle?.confidence ?? 0,
          timestamp: Date.now(),
        },
        camera: prev.camera ?? defaultCamera({ lat: last.lat, lng: last.lng }),
      }))
    }

    const isMobileWeb =
      typeof navigator !== 'undefined' &&
      /iphone|ipad|ipod|android/i.test(navigator.userAgent || '')

    // Request permission early so the browser prompt shows on driver page load.
    navigator.geolocation.getCurrentPosition(
      () => {},
      () => {},
      {
        enableHighAccuracy: isMobileWeb,
        maximumAge: isMobileWeb ? 5_000 : 30_000,
        timeout: isMobileWeb ? 5_000 : 1_500,
      }
    )

    const onPos = (pos: GeolocationPosition) => {
      persistLast(pos.coords.latitude, pos.coords.longitude)
      updateVehicle({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        speed: pos.coords.speed != null ? pos.coords.speed : null,
        heading: pos.coords.heading != null && !isNaN(pos.coords.heading) ? pos.coords.heading : null,
        accuracy: pos.coords.accuracy ?? null,
        timestamp: pos.timestamp ?? Date.now(),
      })
    }

    const onError = (err: GeolocationPositionError) => {
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
    }

    // Mobile web often locks faster when high-accuracy is requested from the start.
    const LOW: PositionOptions = {
      enableHighAccuracy: isMobileWeb,
      maximumAge: isMobileWeb ? 5_000 : 5 * 60_000,
      timeout: isMobileWeb ? 8_000 : 12_000,
    }
    const HIGH: PositionOptions = { enableHighAccuracy: true, maximumAge: 3_000, timeout: 12_000 }

    if (isMobileWeb) {
      const highWatchId = navigator.geolocation.watchPosition(onPos, onError, HIGH)
      watchIdRef.current = highWatchId
    } else {
      let upgraded = false
      const lowWatchId = navigator.geolocation.watchPosition(
        (pos) => {
          onPos(pos)
          if (!upgraded) {
            upgraded = true
            try {
              navigator.geolocation.clearWatch(lowWatchId)
            } catch {}
            const highWatchId = navigator.geolocation.watchPosition(onPos, onError, HIGH)
            watchIdRef.current = highWatchId
          }
        },
        onError,
        LOW
      )
      watchIdRef.current = lowWatchId
    }

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
