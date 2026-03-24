import { useCallback, useEffect, useMemo, useState } from 'react'
import type { OHGOCamera } from '@/lib/ohgo'
import { fetchNearbyGasPrices, type GasStation } from '@/lib/fuelPrices'
import { api } from '@/services/api'

type RoadReport = {
  id: number
  type: string
  lat: number
  lng: number
  title?: string
  severity?: string
  description?: string
  upvotes?: number
}

type PhotoReportMapItem = {
  id: string
  lat: number
  lng: number
  photo_url: string
  category: string
  ai_category: string
  description: string
  upvotes: number
  expires_at: string
  created_at: string
  user_id: string
}

export function useMapLayers(
  userLocation: { lat: number; lng: number },
  OHGO_API_KEY: string,
  ohgoEnabled: boolean
) {
  // Keep network refreshes stable while user position jitters.
  const queryLat = useMemo(() => Math.round(userLocation.lat * 1000) / 1000, [userLocation.lat])
  const queryLng = useMemo(() => Math.round(userLocation.lng * 1000) / 1000, [userLocation.lng])

  const [mapReadyForLayers, setMapReadyForLayers] = useState(false)
  const [ohgoCameras, setOhgoCameras] = useState<OHGOCamera[]>([])
  const [selectedCamera, setSelectedCamera] = useState<OHGOCamera | null>(null)
  const [activeMapLayer, setActiveMapLayer] = useState<'standard' | 'satellite' | 'hybrid' | 'dark'>('standard')
  const [showTrafficLayer, setShowTrafficLayer] = useState(false)
  const [showCameraLayer, setShowCameraLayer] = useState(false)
  const [showIncidentsLayer, setShowIncidentsLayer] = useState(true)
  const [showConstructionLayer, setShowConstructionLayer] = useState(true)
  const [showFuelPrices, setShowFuelPrices] = useState(false)
  const [gasStationsOverlay, setGasStationsOverlay] = useState<GasStation[]>([])
  const [roadReports, setRoadReports] = useState<RoadReport[]>([])
  const [photoReports, setPhotoReports] = useState<PhotoReportMapItem[]>([])
  const [activeIncidentAlert, setActiveIncidentAlert] = useState<{
    id: number
    type: string
    title: string
    distance: number
    lat: number
    lng: number
  } | null>(null)
  const [selectedRoadStatus, setSelectedRoadStatus] = useState<{ id: string; name: string; status: 'clear' | 'moderate' | 'heavy' | 'closed'; reason?: string; estimatedDelay?: number; startLat: number; startLng: number; endLat: number; endLng: number } | null>(null)

  const loadRoadReports = useCallback(async () => {
    try {
      // #region agent log
      void 0// #endregion

      const res = await api.get<{ success?: boolean; data?: any[] }>(
        `/api/incidents/nearby?lat=${queryLat}&lng=${queryLng}&radius_miles=10`
      )
      const raw = res.data as { data?: any[] } | any[]
      const list = Array.isArray((raw as { data?: any[] })?.data) ? (raw as { data: any[] }).data : Array.isArray(raw) ? raw : []

      if (list.length > 0) {
        // #region agent log
        void 0// #endregion
        setRoadReports(
          list.map((inc: any) => ({
            id: Number(inc.id),
            type: String(inc.type ?? 'hazard'),
            lat: Number(inc.lat),
            lng: Number(inc.lng),
            title: inc.title,
            severity: inc.severity,
            description: inc.description,
            upvotes: inc.upvotes,
          }))
        )
        return
      }

      const legacy = await api.get<{ success?: boolean; data?: any[]; total?: number }>(
        `/api/map/traffic?lat=${queryLat}&lng=${queryLng}&radius=15`
      )
      const raw2 = legacy.data as { data?: any[] } | any[]
      const list2 = Array.isArray((raw2 as { data?: any[] })?.data) ? (raw2 as { data: any[] }).data : Array.isArray(raw2) ? raw2 : []
      if (list2.length > 0) {
        // #region agent log
        void 0// #endregion
        setRoadReports(list2)
      }
    } catch { /* incidents unavailable */ }
  }, [queryLat, queryLng])

  const loadPhotoReports = useCallback(async () => {
    try {
      const res = await api.get<{ photos?: PhotoReportMapItem[] }>(
        `/api/photo-reports/nearby?lat=${queryLat}&lng=${queryLng}&radius=10`
      )
      const photos = (res.data as { photos?: PhotoReportMapItem[] } | undefined)?.photos
      // #region agent log
      void 0// #endregion
      setPhotoReports(Array.isArray(photos) ? photos : [])
    } catch {
      // #region agent log
      void 0// #endregion
      setPhotoReports([])
    }
  }, [queryLat, queryLng])

  useEffect(() => {
    if (!queryLat || !queryLng) return
    const refresh = () => {
      void loadRoadReports()
      void loadPhotoReports()
    }
    refresh()
    const interval = setInterval(() => {
      refresh()
    }, 30000)
    return () => clearInterval(interval)
  }, [queryLat, queryLng, loadRoadReports, loadPhotoReports])

  useEffect(() => {
    if (!queryLat || !queryLng) return
    let cancelled = false
    fetchNearbyGasPrices(queryLat, queryLng)
      .then((list) => {
        if (!cancelled) setGasStationsOverlay(list)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [queryLat, queryLng])

  useEffect(() => {
    if (!OHGO_API_KEY || !ohgoEnabled || !showCameraLayer || (queryLat === 0 && queryLng === 0)) return
    fetch(
      `https://publicapi.ohgo.com/api/v1/cameras?api-key=${OHGO_API_KEY}&radius=${queryLat},${queryLng},25`
    )
      .then((r) => r.json())
      .then((data: { results?: Array<{ id: string | number; latitude: number; longitude: number; mainRoute?: string; location?: string; cameraViews?: Array<{ id: string | number; smallUrl?: string; largeUrl?: string; small_url?: string; large_url?: string; direction?: string }> }> }) => {
        const results = data.results ?? []
        const list: OHGOCamera[] = results.map((cam) => ({
          id: String(cam.id),
          latitude: cam.latitude,
          longitude: cam.longitude,
          mainRoute: cam.mainRoute ?? '',
          location: cam.location ?? '',
          cameraViews: (cam.cameraViews ?? []).map((v) => ({
            id: String(v.id),
            smallUrl: (v.smallUrl ?? (v as { small_url?: string }).small_url ?? '').trim(),
            largeUrl: (v.largeUrl ?? (v as { large_url?: string }).large_url ?? '').trim(),
            direction: v.direction ?? '',
          })),
        }))
        setOhgoCameras(list)
      })
      .catch(() => setOhgoCameras([]))
  }, [OHGO_API_KEY, ohgoEnabled, showCameraLayer, queryLat, queryLng])

  return {
    mapReadyForLayers,
    setMapReadyForLayers,
    ohgoCameras,
    setOhgoCameras,
    selectedCamera,
    setSelectedCamera,
    activeMapLayer,
    setActiveMapLayer,
    showTrafficLayer,
    setShowTrafficLayer,
    showCameraLayer,
    setShowCameraLayer,
    showIncidentsLayer,
    setShowIncidentsLayer,
    showConstructionLayer,
    setShowConstructionLayer,
    showFuelPrices,
    setShowFuelPrices,
    gasStationsOverlay,
    setGasStationsOverlay,
    roadReports,
    setRoadReports,
    photoReports,
    setPhotoReports,
    activeIncidentAlert,
    setActiveIncidentAlert,
    selectedRoadStatus,
    setSelectedRoadStatus,
    loadRoadReports,
    loadPhotoReports,
  }
}
