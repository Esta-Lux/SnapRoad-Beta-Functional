import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Map as MapboxMapClass, LngLatBoundsLike } from 'mapbox-gl'
import { subscribeFriendLocations, type FriendLocation } from '@/lib/friendLocation'
import { api } from '@/services/api'

export function useFriendTracking(params: {
  activeTab: string
  userLocation: { lat: number; lng: number }
  isNavigating: boolean
  mapInstanceRef: { current: MapboxMapClass | null }
  cameraLockedRef: { current: boolean }
  isNavigatingRef: { current: boolean }
  isSharingLocationRef: { current: boolean }
  latRef: { current: number }
  lngRef: { current: number }
  carHeadingRef: { current: number }
  navigationData: { steps?: any[] } | null
  navigationDataRef: { current: { destination?: { lat: number; lng: number } } | null }
  haversineMetersRef: { current: ((lat1: number, lng1: number, lat2: number, lng2: number) => number) | null }
  fetchDirectionsRef: { current: ((destination: any) => Promise<void>) | null }
  handleSelectDestinationRef: { current: ((location: any) => Promise<void>) | null }
  ALERT_COOLDOWN: number
  NEAR_ROUTE_THRESHOLD: number
}) {
  const {
    activeTab,
    userLocation: _userLocation,
    isNavigating,
    mapInstanceRef,
    cameraLockedRef,
    isNavigatingRef,
    isSharingLocationRef,
    latRef,
    lngRef,
    carHeadingRef,
    navigationData,
    navigationDataRef,
    haversineMetersRef,
    fetchDirectionsRef,
    handleSelectDestinationRef,
    ALERT_COOLDOWN,
    NEAR_ROUTE_THRESHOLD,
  } = params
  const unsubscribeFriendsRef = useRef<(() => void) | null>(null)
  const followingFriendIdRef = useRef<string | null>(null)
  const followIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const cameraReturnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastCameraOverrideRef = useRef(0)
  const lastAlertedFriendRef = useRef<Record<string, number>>({})
  const friendCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const friendLocationsRef = useRef<FriendLocation[]>([])

  const [focusedFamilyMember, setFocusedFamilyMember] = useState<FriendLocation | null>(null)
  const [tappedFriend, setTappedFriend] = useState<FriendLocation | null>(null)
  const [followingMode, setFollowingMode] = useState<'none' | 'navigating' | 'camera-follow'>('none')
  const [nearbyFriendAlert, setNearbyFriendAlert] = useState<{
    friend: FriendLocation
    distanceMeters: number
    message: string
  } | null>(null)
  const [friendLocations, setFriendLocations] = useState<FriendLocation[]>([])
  const [friendIdsForRealtime, setFriendIdsForRealtime] = useState<string[]>([])
  const [selectedFriend, setSelectedFriend] = useState<FriendLocation | null>(null)
  const [followingFriendId, setFollowingFriendId] = useState<string | null>(null)
  const [isSharingLocation, setIsSharingLocation] = useState(true)

  useEffect(() => {
    // Keep navigation's broadcasting gate in sync with the UI toggle.
    isSharingLocationRef.current = isSharingLocation
  }, [isSharingLocation, isSharingLocationRef])

  useEffect(() => {
    const needsRealtime = activeTab === 'map' || activeTab === 'dashboards'
    if (!needsRealtime) {
      unsubscribeFriendsRef.current?.()
      unsubscribeFriendsRef.current = null
      return
    }
    if (!friendIdsForRealtime.length) return
    if (unsubscribeFriendsRef.current) return
    unsubscribeFriendsRef.current = subscribeFriendLocations(friendIdsForRealtime, (updated) => {
      setFriendLocations((prev) => {
        const idx = prev.findIndex((f) => f.id === updated.id)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = updated
          return next
        }
        return [...prev, updated]
      })
    })
    return () => {
      unsubscribeFriendsRef.current?.()
      unsubscribeFriendsRef.current = null
    }
  }, [activeTab, friendIdsForRealtime.join(',')])

  const returnToNavigation = useCallback(() => {
    if (!mapInstanceRef.current || !isNavigatingRef.current) return
    cameraLockedRef.current = true
    const lat = latRef.current
    const lng = lngRef.current
    mapInstanceRef.current.easeTo({
      center: [lng, lat],
      zoom: 16,
      pitch: 55,
      bearing: carHeadingRef.current ?? 0,
      duration: 1200,
    })
  }, [])

  const stopAllFollowModes = useCallback(() => {
    setFollowingFriendId(null)
    setFollowingMode('none')
    followingFriendIdRef.current = null
    if (followIntervalRef.current) clearInterval(followIntervalRef.current)
    followIntervalRef.current = null
    if (cameraReturnTimerRef.current) clearTimeout(cameraReturnTimerRef.current)
    cameraReturnTimerRef.current = null
    if (isNavigatingRef.current) cameraLockedRef.current = true
  }, [])

  const startLiveNavigation = useCallback(async (friend: FriendLocation) => {
    stopAllFollowModes()
    followingFriendIdRef.current = friend.id
    setFollowingFriendId(friend.id)
    setFollowingMode('navigating')
    setTappedFriend(null)

    await handleSelectDestinationRef.current?.({
      name: `${friend.name.split(' ')[0]}'s location`,
      lat: friend.lat,
      lng: friend.lng,
    } as any)

    followIntervalRef.current = setInterval(() => {
      const fid = followingFriendIdRef.current
      if (!fid) return
      const currentFriend = friendLocationsRef.current.find((f) => f.id === fid)
      if (!currentFriend) {
        stopAllFollowModes()
        return
      }
      const currentDest = navigationDataRef.current?.destination
      if (!currentDest) return
      const haversineMeters = haversineMetersRef.current
      if (!haversineMeters) return
      const dist = haversineMeters(currentFriend.lat, currentFriend.lng, currentDest.lat, currentDest.lng)
      if (dist > 150) {
        fetchDirectionsRef.current?.({
          name: `${currentFriend.name.split(' ')[0]}'s location`,
          lat: currentFriend.lat,
          lng: currentFriend.lng,
        }).catch(() => {})
      }
    }, 15000)
  }, [stopAllFollowModes])

  const startCameraFollow = useCallback((friend: FriendLocation) => {
    stopAllFollowModes()
    followingFriendIdRef.current = friend.id
    setFollowingFriendId(friend.id)
    setFollowingMode('camera-follow')
    setTappedFriend(null)
    cameraLockedRef.current = false
    mapInstanceRef.current?.flyTo({
      center: [friend.lng, friend.lat],
      zoom: 15,
      pitch: 30,
      duration: 800,
    })
  }, [stopAllFollowModes])

  const peekAtFriend = useCallback((friend: FriendLocation) => {
    if (!mapInstanceRef.current || !isNavigatingRef.current) return
    if (Date.now() - lastCameraOverrideRef.current < 3000) return
    lastCameraOverrideRef.current = Date.now()
    cameraLockedRef.current = false
    const userLat = latRef.current
    const userLng = lngRef.current
    const bounds: LngLatBoundsLike = [
      [Math.min(userLng, friend.lng) - 0.005, Math.min(userLat, friend.lat) - 0.005],
      [Math.max(userLng, friend.lng) + 0.005, Math.max(userLat, friend.lat) + 0.005],
    ]
    mapInstanceRef.current.fitBounds(bounds, {
      padding: { top: 120, bottom: 200, left: 40, right: 40 },
      pitch: 0,
      duration: 800,
      maxZoom: 16,
    })
    if (cameraReturnTimerRef.current) clearTimeout(cameraReturnTimerRef.current)
    cameraReturnTimerRef.current = setTimeout(() => {
      returnToNavigation()
    }, 8000)
  }, [returnToNavigation])

  const meetInMiddle = useCallback((friend: FriendLocation) => {
    const userLat = latRef.current
    const userLng = lngRef.current
    const midLat = (userLat + friend.lat) / 2
    const midLng = (userLng + friend.lng) / 2
    setTappedFriend(null)
    stopAllFollowModes()
    handleSelectDestinationRef.current?.({
      name: `Meet ${friend.name.split(' ')[0]} halfway`,
      lat: midLat,
      lng: midLng,
    } as any).catch(() => {})
    api.post('/api/family/checkin', {
      preset_id: 'meet_middle',
      recipient_ids: [friend.id],
      custom_message: `Let's meet in the middle! I've set a midpoint destination.`,
    }).catch(() => {})
  }, [stopAllFollowModes])

  useEffect(() => {
    if (followingMode !== 'camera-follow') return
    const fid = followingFriendIdRef.current
    if (!fid) return
    const friend = friendLocations.find((f) => f.id === fid)
    if (!friend) return
    mapInstanceRef.current?.easeTo({
      center: [friend.lng, friend.lat],
      duration: 1500,
      easing: (t) => t * (2 - t),
    })
  }, [friendLocations, followingMode])

  const friendsOnRoute = useMemo(() => {
    if (!isNavigating || !navigationData?.steps) return []
    return friendLocations.filter((friend) => {
      if (!friend.isSharing) return false
      return navigationData.steps!.some((step: any) => {
        if (!step?.startLocation) return false
        const haversineMeters = haversineMetersRef.current
        if (!haversineMeters) return false
        const dist = haversineMeters(
          friend.lat, friend.lng,
          step.startLocation.lat, step.startLocation.lng
        )
        return dist < 300
      })
    })
  }, [friendLocations, navigationData?.steps, isNavigating])

  const onFriendMarkerTap = useCallback((memberId: string) => {
    const member = friendLocations.find((f) => f.id === memberId)
    if (member) {
      setTappedFriend(member)
    }
  }, [friendLocations])

  const checkNearbyFriendAlerts = useCallback(() => {
    if (!isNavigatingRef.current) return
    if (friendCheckTimerRef.current) clearTimeout(friendCheckTimerRef.current)
    friendCheckTimerRef.current = setTimeout(() => {
      const userLat = latRef.current
      const userLng = lngRef.current
      for (const friend of friendLocationsRef.current) {
        if (!friend.isSharing) continue
        const haversineMeters = haversineMetersRef.current
        if (!haversineMeters) continue
        const dist = haversineMeters(userLat, userLng, friend.lat, friend.lng)
        if (dist > NEAR_ROUTE_THRESHOLD) continue
        const lastAlert = lastAlertedFriendRef.current[friend.id] ?? 0
        if (Date.now() - lastAlert < ALERT_COOLDOWN) continue
        lastAlertedFriendRef.current[friend.id] = Date.now()
        const distText = dist < 100
          ? 'right near you'
          : dist < 300
            ? `${Math.round(dist)} meters away`
            : `${(dist / 1609).toFixed(1)} miles away`
        const firstName = friend.name.split(' ')[0]
        const message = friend.isFamilyMember
          ? `${firstName} is ${distText}`
          : `Your friend ${firstName} is ${distText}`
        setNearbyFriendAlert({ friend, distanceMeters: dist, message })
        setTimeout(() => setNearbyFriendAlert(null), 6000)
        break
      }
    }, 15000)
  }, [ALERT_COOLDOWN, NEAR_ROUTE_THRESHOLD])

  return {
    unsubscribeFriendsRef,
    isSharingLocationRef,
    followingFriendIdRef,
    followIntervalRef,
    cameraReturnTimerRef,
    lastCameraOverrideRef,
    lastAlertedFriendRef,
    friendCheckTimerRef,
    friendLocationsRef,
    focusedFamilyMember,
    setFocusedFamilyMember,
    tappedFriend,
    setTappedFriend,
    followingMode,
    setFollowingMode,
    nearbyFriendAlert,
    setNearbyFriendAlert,
    friendLocations,
    setFriendLocations,
    friendIdsForRealtime,
    setFriendIdsForRealtime,
    selectedFriend,
    setSelectedFriend,
    followingFriendId,
    setFollowingFriendId,
    isSharingLocation,
    setIsSharingLocation,
    returnToNavigation,
    stopAllFollowModes,
    startLiveNavigation,
    startCameraFollow,
    peekAtFriend,
    meetInMiddle,
    friendsOnRoute,
    onFriendMarkerTap,
    checkNearbyFriendAlerts,
  }
}
