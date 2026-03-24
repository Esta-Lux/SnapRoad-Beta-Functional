import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/services/api'
import toast from 'react-hot-toast'

type Offer = {
  id: number
  business_name: string
  discount_percent: number
  gems_reward: number
  lat?: number
  lng?: number
  business_type?: string
  redeemed?: boolean
  name?: string
  [key: string]: unknown
}

function payload<T>(res: { success?: boolean; data?: unknown }): T | undefined {
  const d = res.data as { data?: T } | T | undefined
  if (d && typeof d === 'object' && 'data' in (d as Record<string, unknown>) && (d as { data?: T }).data !== undefined) {
    return (d as { data?: T }).data as T
  }
  return d as T | undefined
}

export function useOffersAndRewards(params: {
  initialName: string
  userId?: string
  userLocation: { lat: number; lng: number }
  setRouteLimit: (n: number) => void
  setFriendTrackingEnabled: (enabled: boolean) => void
  friendTrackingEnabledRef: { current: boolean }
  stopSharingLocation: (userId: string) => Promise<void>
  setShowMaintenanceMode: (b: boolean) => void
  setAnnouncementBanner: (s: string) => void
  setOrionEnabled: (b: boolean) => void
  setShowCameraLayer: (b: boolean) => void
  setOhgoEnabled: (b: boolean) => void
}) {
  const {
    initialName,
    userId,
    userLocation,
    setRouteLimit,
    setFriendTrackingEnabled,
    friendTrackingEnabledRef,
    stopSharingLocation,
    setShowMaintenanceMode,
    setAnnouncementBanner,
    setOrionEnabled,
    setShowCameraLayer,
    setOhgoEnabled,
  } = params
  const [showOffersModal, setShowOffersModal] = useState(false)
  const [selectedOfferId, setSelectedOfferId] = useState<number | null>(null)
  const [showDrivingScore, setShowDrivingScore] = useState(false)
  const [showChallengeHistory, setShowChallengeHistory] = useState(false)
  const [showRedemptionPopup, setShowRedemptionPopup] = useState(false)
  const [selectedOfferForRedemption, setSelectedOfferForRedemption] = useState<Offer | null>(null)
  const [showWeeklyRecap, setShowWeeklyRecap] = useState(false)
  const [showWeeklyInsights, setShowWeeklyInsights] = useState(false)
  const [showScoreCard, setShowScoreCard] = useState(false)
  const [showOffersPanel, setShowOffersPanel] = useState(true)
  const [userPlan, setUserPlan] = useState<'basic' | 'premium' | 'family' | null>(null)
  const [, setGemMultiplier] = useState(1)
  const [maxOfferDistance, setMaxOfferDistance] = useState(5)
  const [offers, setOffers] = useState<Offer[]>([])
  const [challenges, setChallenges] = useState<Record<string, unknown>[]>([])
  const [badges, setBadges] = useState<Record<string, unknown>[]>([])
  const [, setSkins] = useState<Record<string, unknown>[]>([])
  const [userData, setUserData] = useState<Record<string, unknown>>({
    id: '',
    name: initialName || 'Driver',
    gems: 0, level: 1, xp: 0, safety_score: 100, streak: 0,
    total_miles: 0, total_trips: 0, badges_earned_count: 0, rank: 0,
    is_premium: false, member_since: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    friends_count: 0, state: 'OH',
    plan: null, gem_multiplier: 1, safe_drive_streak: 0,
    reports_posted: 0, reports_upvotes_received: 0,
  })
  const apiCacheRef = useRef<Map<string, { data: unknown; ts: number }>>(new globalThis.Map())

  const cachedGet = useCallback(async (url: string, ttlMs = 5 * 60 * 1000) => {
    const cached = apiCacheRef.current.get(url)
    if (cached && Date.now() - cached.ts < ttlMs) {
      return { success: true, data: cached.data }
    }
    const res = await api.get(url)
    apiCacheRef.current.set(url, { data: res.data, ts: Date.now() })
    return res
  }, [])

  const invalidateCache = useCallback((urlPrefix: string) => {
    for (const key of apiCacheRef.current.keys()) {
      if (key.startsWith(urlPrefix)) apiCacheRef.current.delete(key)
    }
  }, [])

  const loadNearbyOffers = useCallback(async () => {
    try {
      const roundedLat = Math.round(userLocation.lat * 100) / 100
      const roundedLng = Math.round(userLocation.lng * 100) / 100
      const res = await cachedGet(
        `/api/offers/nearby?lat=${roundedLat}&lng=${roundedLng}&radius=${maxOfferDistance}`,
        5 * 60 * 1000
      ) as { success?: boolean; data?: Offer[] }
      const data = payload<Offer[]>(res) ?? (res?.data as { data?: Offer[] })?.data
      if (Array.isArray(data)) setOffers(data)
    } catch (e) {
      console.warn('Offers fetch failed:', e)
    }
  }, [userLocation.lat, userLocation.lng, maxOfferDistance, cachedGet])

  useEffect(() => {
    if (userLocation.lat === 39.9612 && userLocation.lng === -82.9988) return
    loadNearbyOffers()
  }, [userLocation.lat, userLocation.lng, loadNearbyOffers])

  // Load app config on mount (maintenance, announcement, gems multiplier, kill switches)
  useEffect(() => {
    cachedGet('/api/config', 60 * 1000).then((res) => {
      const cfg = (res.data as { data?: Record<string, unknown> })?.data ?? (res.data as Record<string, unknown>)
      if (!cfg || typeof cfg !== 'object') return
      if (cfg.maintenance_mode) setShowMaintenanceMode(true)
      if (typeof cfg.announcement_banner === 'string' && cfg.announcement_banner) setAnnouncementBanner(cfg.announcement_banner)
      if (typeof cfg.gems_multiplier === 'number' && cfg.gems_multiplier > 0) setGemMultiplier(cfg.gems_multiplier)
      if (cfg.friend_tracking_enabled === false) {
        setFriendTrackingEnabled(false)
        friendTrackingEnabledRef.current = false
        if (userId) stopSharingLocation(userId).catch(() => {})
      } else {
        setFriendTrackingEnabled(true)
        friendTrackingEnabledRef.current = true
      }
      setOrionEnabled(cfg.orion_enabled !== false)
      if (cfg.ohgo_cameras_enabled === false) {
        setShowCameraLayer(false)
        setOhgoEnabled(false)
      } else {
        setOhgoEnabled(true)
      }
      if (typeof cfg.max_offer_distance_miles === 'number') setMaxOfferDistance(cfg.max_offer_distance_miles)
    }).catch(() => {})
  }, [userId, cachedGet])

  const loadRewardsProfile = useCallback(async () => {
    try {
      const [badgeRes, userRes] = await Promise.all([
        cachedGet('/api/badges', 10 * 60 * 1000),
        cachedGet('/api/user/profile', 2 * 60 * 1000),
      ])
      const badge = payload(badgeRes) ?? (badgeRes as any).data
      const user = payload(userRes) ?? (userRes as any).data
      if ((badgeRes as any).success && badge != null) {
        const arr = Array.isArray(badge) ? badge : (typeof badge === 'object' && badge && Array.isArray((badge as { badges?: unknown[] }).badges) ? (badge as { badges: unknown[] }).badges : [])
        setBadges(Array.isArray(arr) ? arr : [])
      }
      if ((userRes as any).success && user != null && typeof user === 'object') {
        setUserData(user as Record<string, unknown>)
        setUserPlan((user as { plan?: any }).plan || 'basic')
        setGemMultiplier((user as { gem_multiplier?: number }).gem_multiplier || 1)
        setRouteLimit((user as { is_premium?: boolean }).is_premium ? 20 : 5)
      }
    } catch {
      // keep existing state
    }
  }, [cachedGet, setRouteLimit])

  useEffect(() => {
    void loadRewardsProfile()
  }, [loadRewardsProfile])

  useEffect(() => {
    // Keep profile/reward surfaces near real-time during active sessions.
    const id = setInterval(() => {
      void loadRewardsProfile()
      if (!(userLocation.lat === 39.9612 && userLocation.lng === -82.9988)) {
        void loadNearbyOffers()
      }
    }, 20000)
    return () => clearInterval(id)
  }, [loadRewardsProfile, loadNearbyOffers, userLocation.lat, userLocation.lng])

  const handleRedeemOffer = useCallback(async (offerId: number) => {
    try {
      const res = await api.post<{ success?: boolean; message?: string; data?: { gems_earned?: number; xp_earned?: number } }>(`/api/offers/${offerId}/redeem`)
      const body = res.data
      if (res.success && body) {
        const inner = body.data ?? body
        toast.success((body as { message?: string }).message ?? 'Offer redeemed!')
        setUserData((prev: any) => ({
          ...prev,
          gems: prev.gems + ((inner as { gems_earned?: number }).gems_earned ?? 0),
          xp: prev.xp + ((inner as { xp_earned?: number }).xp_earned ?? 0),
        }))
        invalidateCache('/api/offers')
        void api.post('/api/analytics/track', { event: 'offer_redeemed', properties: { offer_id: offerId } }).catch(() => {})
        await loadRewardsProfile()
      }
      else {
        toast.error((body as { message?: string })?.message ?? 'Could not redeem offer')
      }
      return res
    } catch {
      toast.error('Could not redeem offer')
      return { success: false }
    }
  }, [invalidateCache, loadRewardsProfile])

  const handleClaimChallenge = useCallback(async (challengeId: number) => {
    try {
      const res = await api.post<{ success?: boolean; message?: string; data?: { gems_earned?: number } }>(`/api/challenges/${challengeId}/claim`)
      const body = res.data
      if (res.success && body) {
        const inner = body.data ?? body
        toast.success((body as { message?: string }).message ?? 'Reward claimed!')
        setChallenges((prev) => prev.map(c => c.id === challengeId ? { ...c, claimed: true } : c))
        setUserData((prev: any) => ({ ...prev, gems: prev.gems + ((inner as { gems_earned?: number }).gems_earned ?? 0) }))
      }
      else {
        toast.error((body as { message?: string })?.message ?? 'Could not claim reward')
      }
    } catch {
      toast.error('Could not claim reward')
    }
  }, [])

  const invalidateRewardsCaches = useCallback(() => {
    invalidateCache('/api/user/profile')
    invalidateCache('/api/badges')
  }, [invalidateCache])

  return {
    showOffersModal,
    setShowOffersModal,
    selectedOfferId,
    setSelectedOfferId,
    showDrivingScore,
    setShowDrivingScore,
    showChallengeHistory,
    setShowChallengeHistory,
    showRedemptionPopup,
    setShowRedemptionPopup,
    selectedOfferForRedemption,
    setSelectedOfferForRedemption,
    showWeeklyRecap,
    setShowWeeklyRecap,
    showWeeklyInsights,
    setShowWeeklyInsights,
    showScoreCard,
    setShowScoreCard,
    showOffersPanel,
    setShowOffersPanel,
    userPlan,
    setUserPlan,
    setGemMultiplier,
    maxOfferDistance,
    setMaxOfferDistance,
    offers,
    setOffers,
    challenges,
    setChallenges,
    badges,
    setBadges,
    setSkins,
    userData,
    setUserData,
    cachedGet,
    invalidateCache,
    loadNearbyOffers,
    handleRedeemOffer,
    handleClaimChallenge,
    invalidateRewardsCaches,
    loadRewardsProfile,
  }
}
