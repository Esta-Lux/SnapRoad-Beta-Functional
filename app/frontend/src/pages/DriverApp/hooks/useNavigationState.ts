import { useCallback, useEffect, useRef, useState } from 'react'
import type { DirectionsResult } from '@/lib/mapboxDirections'
import type { Lane } from '../components/LaneGuide'
import { parseLanes } from '../components/LaneGuide'
import { updateMyLocation } from '@/lib/friendLocation'
import { orionSpeak } from '@/lib/orion'

type NavigationState = {
  origin?: { lat: number; lng: number; name?: string }
  destination?: { lat: number; lng: number; name?: string }
  steps?: { instruction: string; distance: string; distanceMeters?: number; duration?: string; maneuver?: string; lanes?: string; lat?: number; lng?: number }[]
  polyline?: { lat: number; lng: number }[]
  [key: string]: unknown
}

export function useNavigationState(params: {
  userLocation: { lat: number; lng: number }
  setUserLocation: (loc: { lat: number; lng: number }) => void
  setCarHeading: (h: number) => void
  compassHeadingRef: { current: number | null }
  mapInstanceRef: { current: any }
  isNavigatingRef: { current: boolean }
  cameraLockedRef: { current: boolean }
  latRef: { current: number }
  lngRef: { current: number }
  zoomToUserRef: { current: ((lat: number, lng: number, isNav: boolean, zoomOverride?: number) => void) | null }
  hasZoomedToUser: { current: boolean }
  lastActivityRef: { current: number }
  userRef: { current: { id?: string } | null }
  isSharingLocationRef: { current: boolean }
  friendTrackingEnabledRef: { current: boolean }
  checkNearbyFriendAlerts?: () => void
  haversineMeters: (lat1: number, lng1: number, lat2: number, lng2: number) => number
  BROADCAST_MIN_DISTANCE: number
  triggerCrashDetection: () => void
  crashCancelActive: boolean
  crashDetected: boolean
  osmSignals: Array<{ id: string; type: string; lat: number; lng: number }>
  nearestControlType: (step: { lat?: number; lng?: number }, signals: Array<{ type: string; lat: number; lng: number }>, radiusMeters: number) => 'traffic-light' | 'stop-sign' | null
  formatTurnInstructionForVoice: (instruction: string, distanceMeters?: number, maneuver?: string, controlType?: 'traffic-light' | 'stop-sign' | null) => string
  apiClient: { post: (url: string, body?: unknown) => Promise<{ success?: boolean; data?: unknown }> }
  toastClient: {
    loading: (message: string, opts?: { duration?: number }) => void
    success: (message: string) => void
    error: (message: string) => void
    [key: string]: unknown
  }
  mode: string
  setActiveTripId: (tripId: string) => void
  setShowMenu: (show: boolean) => void
  setShowSearch: (show: boolean) => void
  setShowTurnByTurn: (show: boolean) => void
  setSelectedDestination: (dest: { lat: number; lng: number; name?: string } | null) => void
  setRoutePolyline: (polyline: { lat: number; lng: number }[] | null) => void
  invalidateRewardsCaches: () => void
  activeTripId: string | null
  getUserGemMultiplier: () => number
  getDrivingAggression: () => number
  hasVehicle: boolean
  setLastTripData: (trip: Record<string, unknown> | null) => void
  setSelectedRouteId: (id: string) => void
  clearMapUserInteracting: () => void
  recenter: () => void
}) {
  const {
    userLocation,
    setUserLocation,
    setCarHeading,
    compassHeadingRef,
    mapInstanceRef,
    isNavigatingRef,
    cameraLockedRef,
    latRef,
    lngRef,
    zoomToUserRef,
    hasZoomedToUser,
    lastActivityRef,
    userRef,
    isSharingLocationRef,
    friendTrackingEnabledRef,
    checkNearbyFriendAlerts,
    haversineMeters,
    BROADCAST_MIN_DISTANCE,
    triggerCrashDetection,
    crashCancelActive,
    crashDetected,
    osmSignals,
    nearestControlType,
    formatTurnInstructionForVoice,
    apiClient,
    toastClient,
    mode,
    setActiveTripId,
    setShowMenu,
    setShowSearch,
    setShowTurnByTurn,
    setSelectedDestination,
    setRoutePolyline,
    invalidateRewardsCaches,
    activeTripId,
    getUserGemMultiplier,
    getDrivingAggression,
    hasVehicle,
    setLastTripData,
    setSelectedRouteId,
    clearMapUserInteracting,
    recenter,
  } = params
  const tripStartTimeRef = useRef<number | null>(null)
  const carHeadingRef = useRef(0)
  const lastHeadingCommitMsRef = useRef(0)
  const prevLocationRef = useRef<{ lat: number; lng: number } | null>(null)
  const traveledDistanceRef = useRef(0)
  const distanceToNextStepRef = useRef<number | null>(null)
  const lastSpeedRef = useRef(0)
  const watchIdRef = useRef<number | null>(null)
  const lastFixAtRef = useRef(0)
  const lastWatchRestartAtRef = useRef(0)
  const lastGpsErrorCodeRef = useRef<number | null>(null)
  const lastBroadcastLocationRef = useRef<{ lat: number; lng: number } | null>(null)
  const speedDisplayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navigationDataRef = useRef<NavigationState | null>(null)
  const hasAnnouncedArrivalRef = useRef(false)
  const lastSpokenStepIndexRef = useRef<number>(-1)
  const lastSpokenPhraseRef = useRef('')
  const lastSpokenAtRef = useRef(0)
  const etaGuardRef = useRef<{
    baselineEtaMinutes: number | null
    startedAtMs: number
    lastAcceptedEtaMinutes: number | null
    lastAcceptedAtMs: number
  }>({ baselineEtaMinutes: null, startedAtMs: 0, lastAcceptedEtaMinutes: null, lastAcceptedAtMs: 0 })

  const [navigationData, setNavigationData] = useState<NavigationState | null>(null)
  const [liveEta, setLiveEta] = useState<{ distanceMiles: number; etaMinutes: number } | null>(null)
  const [isOverviewMode, setIsOverviewMode] = useState(false)
  const [showRoutePreview, setShowRoutePreview] = useState(false)
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [showTripSummary, setShowTripSummary] = useState(false)
  const [availableRoutes, setAvailableRoutes] = useState<DirectionsResult[]>([])
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [currentLanes, setCurrentLanes] = useState<Lane[]>([])
  const [isNavigating, setIsNavigating] = useState(false)
  const [traveledDistanceMeters, setTraveledDistanceMeters] = useState(0)
  const [needsCompassPermission, setNeedsCompassPermission] = useState(
    typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function'
  )
  const [isMuted, setIsMuted] = useState(false)
  const speakNavigation = useCallback((phrase: string, delayMs = 0) => {
    if (!phrase || isMuted) return
    const run = () => {
      const now = Date.now()
      const normalized = phrase.trim().toLowerCase()
      if (!normalized) return
      if (normalized === lastSpokenPhraseRef.current && now - lastSpokenAtRef.current < 2500) return
      lastSpokenPhraseRef.current = normalized
      lastSpokenAtRef.current = now
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel()
          const utter = new SpeechSynthesisUtterance(phrase)
          utter.rate = 1.03
          utter.pitch = 1
          window.speechSynthesis.speak(utter)
          return
        } catch { /* fallback below */ }
      }
      orionSpeak(phrase, 'high', isMuted)
    }
    if (delayMs > 0) {
      const timer = setTimeout(run, delayMs)
      return () => clearTimeout(timer)
    }
    run()
  }, [isMuted])

  const [isNavOrionListening, setIsNavOrionListening] = useState(false)
  const [currentSpeed, setCurrentSpeed] = useState(0)

  useEffect(() => {
    latRef.current = userLocation.lat
    lngRef.current = userLocation.lng
  }, [userLocation.lat, userLocation.lng])

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return

    const LAST_LOC_KEY = 'sr_last_location_v1'
    const effectStart = Date.now()
    let usedLastKnown = false
    let firstWatchFixLogged = false
    let firstWatchErrorLogged = false

    try {
      const raw = localStorage.getItem(LAST_LOC_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as { lat?: unknown; lng?: unknown }
        const lat = Number(parsed.lat)
        const lng = Number(parsed.lng)
        if (Number.isFinite(lat) && Number.isFinite(lng)) setUserLocation({ lat, lng })
        if (Number.isFinite(lat) && Number.isFinite(lng)) usedLastKnown = true
      }
    } catch {}

    const isMobileWeb =
      typeof navigator !== 'undefined' &&
      /iphone|ipad|ipod|android/i.test(navigator.userAgent || '')
    // Prioritize a fresh-ish fix on mobile; infinite cache can return stale coordinates.
    const GEO_FAST: PositionOptions = {
      // Fast first fix: allow coarse/cached location immediately.
      enableHighAccuracy: false,
      maximumAge: 30_000,
      timeout: 5_000,
    }
    const getGpsOptions = (): PositionOptions => ({
      // After the first fix, keep watcher precise.
      enableHighAccuracy: true,
      timeout: 10_000,
      maximumAge: 0,
    })
    const isTimeout = (err: GeolocationPositionError) => err.code === err.TIMEOUT

    // #region agent log
    void 0// #endregion

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // #region agent log
        if (pos?.coords) {
          void 0}
        // #endregion
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      (err) => {
        // #region agent log
        if (!firstWatchErrorLogged) {
          firstWatchErrorLogged = true
          void 0}
        // #endregion
      },
      GEO_FAST
    )

    const onWatch = (pos: GeolocationPosition) => {
      lastFixAtRef.current = Date.now()
      lastGpsErrorCodeRef.current = null
      if (!firstWatchFixLogged) {
        firstWatchFixLogged = true
        // #region agent log
        void 0// #endregion
      }
      const lat = pos.coords.latitude
      const lng = pos.coords.longitude
      const heading = pos.coords.heading
      const speed = pos.coords.speed

      if (import.meta.env.DEV) {
        console.log('[GPS]', {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
          accuracy: pos.coords.accuracy,
        })
      }

      const newLoc = { lat, lng }
      setUserLocation(newLoc)

      const prev = prevLocationRef.current
      if (prev && isNavigatingRef.current) {
        const R = 6371000
        const dLat = ((lat - prev.lat) * Math.PI) / 180
        const dLng = ((lng - prev.lng) * Math.PI) / 180
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((prev.lat * Math.PI) / 180) * Math.cos((lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
        const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        if (dist > 0 && dist < 100) {
          traveledDistanceRef.current += dist
          setTraveledDistanceMeters(traveledDistanceRef.current)
        }
      }
      prevLocationRef.current = newLoc

      const nowMs = Date.now()
      let nextHeading: number | null = null

      // Primary source while driving.
      if (typeof heading === 'number' && heading >= 0 && (speed ?? 0) > 1) {
        nextHeading = heading
      } else if (typeof compassHeadingRef.current === 'number' && Number.isFinite(compassHeadingRef.current)) {
        // Fallback at low speed / stationary.
        nextHeading = compassHeadingRef.current
      } else if (prev) {
        // Last-resort fallback from movement bearing.
        const dLng = ((lng - prev.lng) * Math.PI) / 180
        const lat1 = (prev.lat * Math.PI) / 180
        const lat2 = (lat * Math.PI) / 180
        const y = Math.sin(dLng) * Math.cos(lat2)
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
        nextHeading = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
      }
      // Throttle heading commits to 20Hz for smoother rotation.
      if (typeof nextHeading === 'number' && nowMs - lastHeadingCommitMsRef.current >= 50) {
        setCarHeading(nextHeading)
        carHeadingRef.current = nextHeading
        lastHeadingCommitMsRef.current = nowMs
      }

      const speedMph = typeof speed === 'number' && speed >= 0 ? Math.round(speed * 2.237) : 0
      if (speedDisplayTimerRef.current) clearTimeout(speedDisplayTimerRef.current)
      speedDisplayTimerRef.current = setTimeout(() => {
        setCurrentSpeed(speedMph)
      }, 2000)
      const speedChange = Math.abs(speedMph - lastSpeedRef.current)
      const CRASH_THRESHOLD = 35
      if (isNavigatingRef.current && speedChange > CRASH_THRESHOLD && lastSpeedRef.current > 20) {
        if (!crashCancelActive && !crashDetected) triggerCrashDetection()
      }
      lastSpeedRef.current = speedMph

      if (!hasZoomedToUser.current && zoomToUserRef.current) {
        hasZoomedToUser.current = true
        zoomToUserRef.current(lat, lng, false)
      }
      if (isNavigatingRef.current && cameraLockedRef.current && zoomToUserRef.current) {
        zoomToUserRef.current(lat, lng, true)
      }

      const smartBroadcast = async (latV: number, lngV: number, speedMphV: number, headingV: number) => {
        const uid = userRef.current?.id
        if (!isSharingLocationRef.current || !friendTrackingEnabledRef.current || !uid) return
        const last = lastBroadcastLocationRef.current
        if (last && !isNavigatingRef.current) {
          const dist = haversineMeters(last.lat, last.lng, latV, lngV)
          if (dist < BROADCAST_MIN_DISTANCE) return
        }
        lastBroadcastLocationRef.current = { lat: latV, lng: lngV }
        try {
          await updateMyLocation(
            uid,
            latV,
            lngV,
            headingV,
            speedMphV,
            isNavigatingRef.current,
            isNavigatingRef.current ? navigationDataRef.current?.destination?.name : undefined
          )
        } catch {}
      }
      const broadcastSpeed = typeof speed === 'number' && speed >= 0 ? speed * 2.237 : 0
      void smartBroadcast(lat, lng, broadcastSpeed, carHeadingRef.current ?? 0)
      checkNearbyFriendAlerts?.()
    }

    const onGpsError = (err: GeolocationPositionError) => {
      lastGpsErrorCodeRef.current = err.code
      if (!firstWatchErrorLogged) {
        firstWatchErrorLogged = true
        // #region agent log
        void 0// #endregion
      }
      if (err.code === err.PERMISSION_DENIED) {
        toastClient.error('Location permission denied. Enable location access in your browser settings.')
        return
      }
      if (isTimeout(err) && Date.now() - lastWatchRestartAtRef.current < 5000) return
      if (watchIdRef.current != null) {
        try { navigator.geolocation.clearWatch(watchIdRef.current) } catch {}
        watchIdRef.current = null
      }
      lastWatchRestartAtRef.current = Date.now()
      watchIdRef.current = navigator.geolocation.watchPosition(onWatch, onGpsError, getGpsOptions())
    }
    const startWatch = (force = false, options?: PositionOptions) => {
      if (watchIdRef.current != null && !force) return
      if (watchIdRef.current != null && force) {
        try { navigator.geolocation.clearWatch(watchIdRef.current) } catch {}
        watchIdRef.current = null
      }
      watchIdRef.current = navigator.geolocation.watchPosition(onWatch, onGpsError, options ?? getGpsOptions())
      lastWatchRestartAtRef.current = Date.now()
    }
    startWatch(true)
    const idleCheckInterval = setInterval(() => {
      const idleSecs = (Date.now() - lastActivityRef.current) / 1000
      const staleMs = lastFixAtRef.current > 0 ? Date.now() - lastFixAtRef.current : Number.POSITIVE_INFINITY
      if (idleSecs > 300 && !isNavigatingRef.current) {
        if (watchIdRef.current != null) {
          navigator.geolocation.clearWatch(watchIdRef.current)
          watchIdRef.current = null
        }
      } else if (watchIdRef.current == null && idleSecs < 10) {
        startWatch(true)
      } else if (idleSecs < 120 && staleMs > 15000) {
        // Recover from stuck GPS stream by re-establishing the watcher and requesting a quick coarse fix.
        startWatch(true, { enableHighAccuracy: false, maximumAge: 2000, timeout: 8000 })
        navigator.geolocation.getCurrentPosition(
          onWatch,
          onGpsError,
          { enableHighAccuracy: false, maximumAge: 2000, timeout: 8000 }
        )
      }
    }, 8000)

    return () => {
      clearInterval(idleCheckInterval)
      if (speedDisplayTimerRef.current) clearTimeout(speedDisplayTimerRef.current)
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [haversineMeters])

  useEffect(() => {
    if (!isNavigating || !navigationData?.steps?.length) return
    let cumulative = 0
    const traveled = traveledDistanceMeters
    let nextIndex = 0
    for (let i = 0; i < navigationData.steps.length; i++) {
      const stepDist = navigationData.steps[i].distanceMeters ?? 0
      if (traveled < cumulative + stepDist) {
        nextIndex = i
        break
      }
      cumulative += stepDist
      nextIndex = i + 1
    }
    setCurrentStepIndex(Math.min(nextIndex, navigationData.steps.length - 1))
  }, [isNavigating, navigationData?.steps, traveledDistanceMeters])

  useEffect(() => {
    if (!isNavigating || !navigationData?.steps?.length) {
      setCurrentLanes([])
      return
    }
    const step = navigationData.steps[currentStepIndex]
    if (step) {
      setCurrentLanes(parseLanes(step.maneuver ?? '', step.instruction ?? ''))
    } else {
      setCurrentLanes([])
    }
  }, [isNavigating, navigationData?.steps, currentStepIndex])

  useEffect(() => {
    if (!isNavigating || !navigationData?.steps?.length || isMuted) {
      if (!isNavigating) lastSpokenStepIndexRef.current = -1
      return
    }
    const stepIndex = Math.min(currentStepIndex, navigationData.steps.length - 1)
    if (stepIndex < 0 || stepIndex === lastSpokenStepIndexRef.current) return
    lastSpokenStepIndexRef.current = stepIndex
    const step = navigationData.steps[stepIndex]
    if (!step?.instruction) return
    const distanceMeters = step.distanceMeters ?? 400
    const controlType = nearestControlType(step, osmSignals, 40)
    const phrase = formatTurnInstructionForVoice(step.instruction, distanceMeters, step.maneuver, controlType)
    if (stepIndex === 0) {
      return speakNavigation(phrase, 2500)
    }
    speakNavigation(phrase)
  }, [isNavigating, navigationData?.steps, currentStepIndex, isMuted, osmSignals, speakNavigation])

  useEffect(() => {
    if (!isNavigating || !navigationData?.destination) {
      hasAnnouncedArrivalRef.current = false
      return
    }
    const remaining = typeof liveEta?.distanceMiles === 'number' ? liveEta.distanceMiles : 0
    if (remaining > 0.05) return
    if (hasAnnouncedArrivalRef.current) return
    hasAnnouncedArrivalRef.current = true
    const dest = navigationData.destination?.name ?? 'your destination'
    speakNavigation(`You've arrived at ${dest}.`)
  }, [isNavigating, navigationData?.destination?.name, liveEta?.distanceMiles, speakNavigation])

  const handleStartNavigation = useCallback(async (dest?: string) => {
    const tripId = `trip_${Date.now()}`
    setActiveTripId(tripId)
    tripStartTimeRef.current = Date.now()
    traveledDistanceRef.current = 0
    setTraveledDistanceMeters(0)
    setIsNavigating(true)
    isNavigatingRef.current = true
    setShowMenu(false)
    setShowSearch(false)
    if (mode === 'adaptive') toastClient.success('Driving mode: Adaptive')
    toastClient.loading('Calculating route...', { duration: 1500 })
    try {
      const res = await apiClient.post('/api/navigation/start', { destination: dest || 'Unknown', origin: 'current_location' })
      apiClient.post('/api/analytics/track', { event: 'navigation_started', properties: { destination: dest, mode } }).catch(() => {})
      if (res.success) {
        setTimeout(() => {
          toastClient.success((res.data as { message?: string })?.message ?? `Navigating to ${dest || 'destination'}`)
        }, 1500)
      } else {
        toastClient.error((res.data as { message?: string })?.message ?? 'Could not start navigation')
      }
    } catch {
      toastClient.error('Could not start navigation')
    }
  }, [apiClient, mode, setActiveTripId, setShowMenu, setShowSearch, toastClient, isNavigatingRef])

  const handleRequestEndNavigation = useCallback(() => {
    setShowEndConfirm(true)
  }, [])

  const handleConfirmEndNavigation = useCallback(async () => {
    setShowEndConfirm(false)
    // Instant visual response first.
    setIsNavigating(false)
    isNavigatingRef.current = false
    setShowTurnByTurn(false)
    setNavigationData(null)
    setSelectedDestination(null)
    setCurrentStepIndex(0)
    setRoutePolyline(null)
    setLiveEta(null)
    clearMapUserInteracting()
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel() } catch { /* ignore */ }
    }
    if (mapInstanceRef.current) {
      try { mapInstanceRef.current.jumpTo({ pitch: 0, bearing: 0 }) } catch { /* ignore */ }
    }

    const tripIdToEnd = activeTripId
    const tripStart = tripStartTimeRef.current
    const durationMin = tripStart ? Math.round((Date.now() - tripStart) / 60000) : 5
    const safetyScore = hasVehicle ? Math.max(60, Math.round(100 - (getDrivingAggression() * 30))) : 85
    const distMeters = (navigationData?.distance as { meters?: number })?.meters
    const distMiles = distMeters ? distMeters / 1609.34 : durationMin * 0.5
    const gemsEarned = Math.round(5 * (getUserGemMultiplier() || 1))
    const originName = navigationData?.origin?.name ?? 'Start'
    const destName = navigationData?.destination?.name ?? 'End'
    const polyline = navigationData?.polyline && navigationData.polyline.length >= 2 ? navigationData.polyline : []

    setShowTripSummary(true)
    setLastTripData({
      distance: distMiles,
      duration: durationMin,
      safety_score: safetyScore,
      gems_earned: gemsEarned,
      xp_earned: 1000,
      origin: 'Start',
      destination: navigationData?.destination?.name ?? 'End',
      date: new Date().toLocaleDateString(),
      is_safe_drive: safetyScore >= 80,
    })
    invalidateRewardsCaches()
    void (async () => {
      try {
        await apiClient.post('/api/navigation/stop')
        await apiClient.post('/api/trips/complete-with-safety', {
          trip_id: tripIdToEnd,
          distance: distMiles,
          duration: durationMin,
          safety_score: safetyScore,
          safety_metrics: { hard_brakes: 0, speeding_incidents: 0, phone_usage: 0 },
          origin: originName,
          destination: destName,
          route_coordinates: polyline.map(p => ({ lat: p.lat, lng: p.lng })),
        })
        await apiClient.post('/api/analytics/track', { event: 'trip_completed', properties: { trip_id: tripIdToEnd, duration: durationMin, mode } })
      } catch {
        toastClient.error('Could not stop navigation')
      }
    })()
  }, [
    activeTripId,
    apiClient,
    getDrivingAggression,
    hasVehicle,
    invalidateRewardsCaches,
    mode,
    navigationData,
    setLastTripData,
    setRoutePolyline,
    setSelectedDestination,
    setShowTurnByTurn,
    toastClient,
    getUserGemMultiplier,
    isNavigatingRef,
    clearMapUserInteracting,
    mapInstanceRef,
    setNavigationData,
    setCurrentStepIndex,
    setLiveEta,
  ])

  const handleGoFromRoutePreview = useCallback(() => {
    traveledDistanceRef.current = 0
    setTraveledDistanceMeters(0)
    setIsNavigating(true)
    isNavigatingRef.current = true
    hasZoomedToUser.current = false
    setShowTurnByTurn(true)
    setShowRoutePreview(false)
    const dest = navigationData?.destination?.name ?? 'destination'
    toastClient.success(`Navigating to ${dest}`)
    speakNavigation(`Starting navigation to ${dest}. Drive safe!`)
    const lat = latRef.current
    const lng = lngRef.current
    setTimeout(() => {
      if (zoomToUserRef.current) zoomToUserRef.current(lat, lng, true)
    }, 300)
  }, [navigationData?.destination?.name, setShowTurnByTurn, toastClient, isNavigatingRef, hasZoomedToUser, zoomToUserRef, speakNavigation])

  const handleRouteSelect = useCallback((id: string, clickedIndex?: number) => {
    setSelectedRouteId(id)
    if (!availableRoutes.length || !navigationData?.origin || !navigationData?.destination) return
    let index = 0
    if (typeof clickedIndex === 'number' && clickedIndex >= 0 && clickedIndex < availableRoutes.length) {
      index = clickedIndex
    } else {
      const withType = availableRoutes as Array<{ expectedTravelTimeSeconds: number; distanceMeters: number; routeType?: string }>
      if (id === 'best') {
        index = withType.reduce((best, r, i) => (r.expectedTravelTimeSeconds < withType[best].expectedTravelTimeSeconds ? i : best), 0)
      } else if (id === 'eco') {
        index = withType.reduce((best, r, i) => (r.distanceMeters < withType[best].distanceMeters ? i : best), 0)
      }
    }
    setSelectedRouteIndex(index)
    const r = availableRoutes[index]
    if (!r?.polyline?.length) return
    const distMiles = (r.distanceMeters / 1609.34).toFixed(1)
    const etaMin = Math.round(r.expectedTravelTimeSeconds / 60)
    const nav: NavigationState = {
      origin: navigationData.origin,
      destination: navigationData.destination,
      steps: r.steps.map((s) => ({
        instruction: s.instruction,
        distance: s.distanceMeters > 1609 ? `${(s.distanceMeters / 1609.34).toFixed(1)} mi` : `${Math.round(s.distanceMeters)} ft`,
        distanceMeters: s.distanceMeters,
        maneuver: s.maneuver,
        lanes: s.lanes,
        lat: s.lat,
        lng: s.lng,
      })),
      polyline: r.polyline,
      duration: { text: etaMin < 60 ? `${etaMin} min` : `${Math.floor(etaMin / 60)}h ${etaMin % 60}m`, seconds: r.expectedTravelTimeSeconds },
      distance: { text: `${distMiles} mi`, meters: r.distanceMeters },
      traffic: 'normal',
      notifications: (r as { notifications?: unknown[] }).notifications ?? [],
    }
    setNavigationData(nav)
    setRoutePolyline(r.polyline)
  }, [availableRoutes, navigationData, setRoutePolyline, setSelectedRouteId])

  const handleRecenterNavigation = useCallback(() => {
    hasZoomedToUser.current = false
    clearMapUserInteracting()
    if (zoomToUserRef.current) zoomToUserRef.current(latRef.current, lngRef.current, true)
    recenter()
    toastClient.success('Centered on your location')
  }, [clearMapUserInteracting, recenter, toastClient, hasZoomedToUser, zoomToUserRef])

  return {
    tripStartTimeRef,
    carHeadingRef,
    prevLocationRef,
    traveledDistanceRef,
    distanceToNextStepRef,
    latRef,
    lngRef,
    lastSpeedRef,
    watchIdRef,
    lastBroadcastLocationRef,
    speedDisplayTimerRef,
    navigationDataRef,
    hasAnnouncedArrivalRef,
    lastSpokenStepIndexRef,
    etaGuardRef,
    navigationData,
    setNavigationData,
    liveEta,
    setLiveEta,
    isOverviewMode,
    setIsOverviewMode,
    showRoutePreview,
    setShowRoutePreview,
    showEndConfirm,
    setShowEndConfirm,
    showTripSummary,
    setShowTripSummary,
    availableRoutes,
    setAvailableRoutes,
    selectedRouteIndex,
    setSelectedRouteIndex,
    currentStepIndex,
    setCurrentStepIndex,
    currentLanes,
    setCurrentLanes,
    isNavigating,
    setIsNavigating,
    traveledDistanceMeters,
    setTraveledDistanceMeters,
    needsCompassPermission,
    setNeedsCompassPermission,
    isMuted,
    setIsMuted,
    isNavOrionListening,
    setIsNavOrionListening,
    currentSpeed,
    setCurrentSpeed,
    handleStartNavigation,
    handleRequestEndNavigation,
    handleConfirmEndNavigation,
    handleGoFromRoutePreview,
    handleRouteSelect,
    recalculateRoute: handleRouteSelect,
    reroute: handleRouteSelect,
    stopNavigation: handleConfirmEndNavigation,
    endNavigation: handleConfirmEndNavigation,
    beginNavigation: handleGoFromRoutePreview,
    startNavigation: handleStartNavigation,
    onRecenterNavigation: handleRecenterNavigation,
  }
}
