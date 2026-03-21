import { useCallback, useEffect, useState } from 'react'

export function useTripTracking(params: {
  apiClient: {
    get: <T = unknown>(url: string) => Promise<{ success?: boolean; data?: T }>
  }
  userLocation: { lat: number; lng: number }
  showFuelDashboard: boolean
  loadOnMount?: boolean
}) {
  const { apiClient, userLocation, showFuelDashboard, loadOnMount = true } = params
  const [showShareTrip, setShowShareTrip] = useState(false)
  const [lastTripData, setLastTripData] = useState<Record<string, unknown> | null>(null)
  const [showTripAnalytics, setShowTripAnalytics] = useState(false)
  const [showRouteHistory3D, setShowRouteHistory3D] = useState(false)
  const [activeTripId, setActiveTripId] = useState<string | null>(null)
  const [tripHistoryPolylines, setTripHistoryPolylines] = useState<{ lat: number; lng: number }[][]>([])
  const [driverAnalyticsData, setDriverAnalyticsData] = useState<{
    analytics: { total_trips?: number; avg_safety_score: number; money_saved_dollars: number; fuel_saved_gallons: number; co2_saved_lbs: number } | null
    gasStations: Array<{ name: string; address?: string; regular: number; distance_miles: number }>
    fuelPricePerGal: number
  }>({ analytics: null, gasStations: [], fuelPricePerGal: 3.29 })

  const loadTripHistoryForMap = useCallback(async () => {
    try {
      const res = await apiClient.get<{ trips?: Array<{ route_coordinates?: { lat: number; lng: number }[] }> }>(
        '/api/trips/history/detailed?days=30&limit=50'
      )
      if (!res.success || !res.data) return
      const trips = (res.data as { trips?: Array<{ route_coordinates?: { lat: number; lng: number }[] }> }).trips ?? []
      const polylines = trips
        .filter((t: { route_coordinates?: { lat: number; lng: number }[] }) => t.route_coordinates && t.route_coordinates.length >= 2)
        .map((t: { route_coordinates: { lat: number; lng: number }[] }) => t.route_coordinates)
      setTripHistoryPolylines(polylines)
    } catch {}
  }, [apiClient])

  useEffect(() => {
    if (!loadOnMount) return
    void loadTripHistoryForMap()
  }, [loadOnMount, loadTripHistoryForMap])

  useEffect(() => {
    if (!showFuelDashboard) return
    let cancelled = false
    const load = async () => {
      try {
        const [tripRes, fuelRes] = await Promise.all([
          apiClient.get<{ analytics?: { avg_safety_score: number; money_saved_dollars: number; fuel_saved_gallons: number; co2_saved_lbs: number } }>('/api/trips/history/detailed?days=30&limit=50'),
          apiClient.get<{ nearby_stations?: Array<{ name: string; address?: string; regular: number; distance_miles: number }>; prices?: { regular?: number } }>(`/api/fuel/prices?lat=${userLocation.lat}&lng=${userLocation.lng}`),
        ])
        if (cancelled) return
        const analytics = tripRes?.data && (tripRes.data as { analytics?: typeof driverAnalyticsData.analytics }).analytics ? (tripRes.data as { analytics: typeof driverAnalyticsData.analytics }).analytics : null
        const fuelData = fuelRes?.data as { nearby_stations?: Array<{ name: string; address?: string; regular: number; distance_miles: number }>; prices?: { regular?: number } } | undefined
        const stations = fuelData?.nearby_stations ?? []
        const pricePerGal = fuelData?.prices?.regular ?? (stations[0]?.regular) ?? 3.29
        setDriverAnalyticsData({ analytics: analytics ?? null, gasStations: stations, fuelPricePerGal: pricePerGal })
      } catch {
        if (!cancelled) setDriverAnalyticsData(prev => ({ ...prev, analytics: null, gasStations: [], fuelPricePerGal: prev.fuelPricePerGal }))
      }
    }
    void load()
    return () => { cancelled = true }
  }, [apiClient, showFuelDashboard, userLocation.lat, userLocation.lng])

  const prepareShareTripData = useCallback((paramsV: { safetyScore: number; gemMultiplier: number }) => {
    return {
      distance: 12.5,
      duration: 25,
      safety_score: paramsV.safetyScore,
      gems_earned: 5 * Number(paramsV.gemMultiplier ?? 1),
      xp_earned: 1000,
      origin: 'Current Location',
      destination: 'Destination',
      date: new Date().toLocaleDateString(),
      is_safe_drive: true,
    }
  }, [])

  const handleShareTrip = useCallback((paramsV: { safetyScore: number; gemMultiplier: number }) => {
    const tripData = prepareShareTripData(paramsV)
    setLastTripData(tripData)
    setShowShareTrip(true)
  }, [prepareShareTripData])

  const dismissTripSummary = useCallback(async (onDismissed?: () => void) => {
    setLastTripData(null)
    await loadTripHistoryForMap()
    onDismissed?.()
  }, [loadTripHistoryForMap])

  return {
    showShareTrip,
    setShowShareTrip,
    lastTripData,
    setLastTripData,
    showTripAnalytics,
    setShowTripAnalytics,
    showRouteHistory3D,
    setShowRouteHistory3D,
    activeTripId,
    setActiveTripId,
    tripHistoryPolylines,
    setTripHistoryPolylines,
    driverAnalyticsData,
    setDriverAnalyticsData,
    loadTripHistoryForMap,
    handleShareTrip,
    prepareShareTripData,
    dismissTripSummary,
  }
}
