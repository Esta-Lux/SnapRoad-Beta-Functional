import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Phone, ChevronRight } from 'lucide-react'
import api from '@/services/api'
import { useTheme } from '@/contexts/ThemeContext'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { updateMyLocation } from '@/lib/friendLocation'
import FamilyPrivacyControls from './FamilyPrivacyControls'
import TeenReportCard from './TeenReportCard'
import FamilyLeaderboard from './FamilyLeaderboard'
import FamilyCommandCenter from './family/FamilyCommandCenter'

interface FamilyMember {
  id: string
  user_id: string
  role: string
  max_speed_mph: number
  curfew_time: string | null
  focus_mode: boolean
  profiles?: {
    full_name?: string
    name?: string
    avatar_url?: string | null
  }
}

interface Props {
  isOpen: boolean
  onClose: () => void
  currentUserId: string
}

function unwrap<T>(res: { success?: boolean; data?: { data?: T } & Record<string, unknown> }): T | undefined {
  return res.data?.data !== undefined ? (res.data.data as T) : (res.data as unknown as T)
}

function formatRelativeTime(iso?: string): string {
  if (!iso) return '—'
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return '—'
  const sec = Math.max(0, Math.floor((Date.now() - t) / 1000))
  if (sec < 60) return 'just now'
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`
  if (sec < 86400) return `${Math.floor(sec / 3600)} hr ago`
  return `${Math.floor(sec / 86400)} d ago`
}

type LiveStatus = 'driving' | 'arrived' | 'idle'

function deriveStatus(live?: { speedMph?: number; lastUpdated?: string }): LiveStatus {
  if (!live?.lastUpdated) return 'idle'
  const age = Date.now() - new Date(live.lastUpdated).getTime()
  if (!Number.isFinite(age) || age > 30 * 60_000) return 'idle'
  const mph = live.speedMph ?? 0
  if (mph > 8) return 'driving'
  if (mph <= 2 && age < 10 * 60_000) return 'arrived'
  return 'idle'
}

export default function FamilyDashboard({ isOpen, onClose, currentUserId }: Props) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const [screen, setScreen] = useState<'home' | 'create' | 'join' | 'consent' | 'members' | 'settings'>('home')
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [groupId, setGroupId] = useState<string | null>(null)
  const [inviteCode, setInviteCode] = useState('')
  const [groupName, setGroupName] = useState('')
  const [loading, setLoading] = useState(false)
  const [sosActive, setSosActive] = useState(false)
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null)
  const [liveTab, setLiveTab] = useState<'list' | 'map'>('list')
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [showReportCard, setShowReportCard] = useState(false)
  const [reportCardMember, setReportCardMember] = useState<FamilyMember | null>(null)
  const [showFamilyLeaderboard, setShowFamilyLeaderboard] = useState(false)
  const [locationConsent, setLocationConsent] = useState(true)
  const [shareLocation, setShareLocation] = useState(true)
  const [needsOnboardingFinish, setNeedsOnboardingFinish] = useState(false)
  const [liveByUserId, setLiveByUserId] = useState<Record<string, { lat: number; lng: number; speedMph?: number; lastUpdated?: string }>>({})
  const familyMapElRef = useRef<HTMLDivElement | null>(null)
  const familyMapRef = useRef<mapboxgl.Map | null>(null)
  const familyMarkersRef = useRef<mapboxgl.Marker[]>([])
  const mapboxRef = useRef<typeof import('mapbox-gl') | null>(null)

  useEffect(() => {
    if (isOpen) void loadMembers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const myMembership = useMemo(() => {
    if (!currentUserId) return null
    return members.find((m) => String(m.user_id) === String(currentUserId)) ?? null
  }, [members, currentUserId])

  const isAdmin = myMembership?.role === 'admin'

  const sheetBg = isLight ? '#ffffff' : '#1C1C1E'
  const sheetText = isLight ? '#0f172a' : '#ffffff'
  const muted = isLight ? 'rgba(15,23,42,0.55)' : 'rgba(255,255,255,0.6)'
  const cardBg = isLight ? 'rgba(2,6,23,0.03)' : 'rgba(255,255,255,0.06)'

  const haversineMiles = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
    const R = 3958.8
    const dLat = ((b.lat - a.lat) * Math.PI) / 180
    const dLng = ((b.lng - a.lng) * Math.PI) / 180
    const lat1 = (a.lat * Math.PI) / 180
    const lat2 = (b.lat * Math.PI) / 180
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
    return 2 * R * Math.asin(Math.sqrt(x))
  }

  // Realtime family live locations (best-effort, requires Supabase tables + RLS)
  useEffect(() => {
    if (!isOpen || !groupId) return
    const sb = getSupabaseClient()
    if (!sb) return
    const ids = members.map((m) => String(m.user_id)).filter(Boolean)
    if (ids.length === 0) return

    let cancelled = false

    const loadInitial = async () => {
      try {
        const { data } = await sb
          .from('live_locations')
          .select('user_id,lat,lng,speed_mph,last_updated')
          .in('user_id', ids)
        if (cancelled) return
        const next: Record<string, { lat: number; lng: number; speedMph?: number; lastUpdated?: string }> = {}
        ;(data ?? []).forEach((row: any) => {
          if (!row?.user_id) return
          next[String(row.user_id)] = {
            lat: Number(row.lat),
            lng: Number(row.lng),
            speedMph: row.speed_mph != null ? Number(row.speed_mph) : undefined,
            lastUpdated: row.last_updated ? String(row.last_updated) : undefined,
          }
        })
        setLiveByUserId(next)
      } catch {
        // ignore
      }
    }

    void loadInitial()

    const channel = sb
      .channel(`family-live-${groupId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_locations', filter: `user_id=in.(${ids.join(',')})` },
        (payload) => {
          const row: any = (payload as any).new
          if (!row?.user_id) return
          setLiveByUserId((prev) => ({
            ...prev,
            [String(row.user_id)]: {
              lat: Number(row.lat),
              lng: Number(row.lng),
              speedMph: row.speed_mph != null ? Number(row.speed_mph) : undefined,
              lastUpdated: row.last_updated ? String(row.last_updated) : undefined,
            },
          }))
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      try {
        sb.removeChannel(channel)
      } catch {
        // ignore
      }
    }
  }, [isOpen, groupId, members])

  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined

  const refreshFamilyMapMarkers = useCallback(() => {
    const map = familyMapRef.current
    const mapbox = mapboxRef.current
    if (!map || !mapbox || !map.isStyleLoaded()) return
    familyMarkersRef.current.forEach((m) => m.remove())
    familyMarkersRef.current = []
    const bounds = new mapbox.LngLatBounds()
    let any = false
    members.forEach((m) => {
      const uid = String(m.user_id)
      const live = liveByUserId[uid]
      if (!live || !Number.isFinite(live.lat) || !Number.isFinite(live.lng)) return
      any = true
      bounds.extend([live.lng, live.lat])
      const el = document.createElement('div')
      el.style.width = '28px'
      el.style.height = '28px'
      el.style.borderRadius = '50%'
      el.style.background = isLight ? '#2563eb' : '#60a5fa'
      el.style.border = '3px solid white'
      el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.25)'
      const marker = new mapbox.Marker({ element: el }).setLngLat([live.lng, live.lat]).addTo(map)
      const name = m.profiles?.full_name ?? m.profiles?.name ?? 'Member'
      marker.setPopup(new mapbox.Popup({ offset: 12 }).setHTML(`<div style="font-weight:700">${name}</div>`))
      familyMarkersRef.current.push(marker)
    })
    if (any) {
      try {
        map.fitBounds(bounds, { padding: 48, maxZoom: 14, duration: 500 })
      } catch {
        /* ignore */
      }
    }
  }, [members, liveByUserId, isLight])

  const refreshFamilyMarkersRef = useRef(refreshFamilyMapMarkers)
  refreshFamilyMarkersRef.current = refreshFamilyMapMarkers

  // Init / style for family mini-map (do not depend on members — avoids recreating map)
  useEffect(() => {
    if (!isOpen || liveTab !== 'map' || !mapboxToken || !familyMapElRef.current) return
    let cancelled = false
    const styleUrl = isLight ? 'mapbox://styles/mapbox/light-v11' : 'mapbox://styles/mapbox/dark-v11'

    const initMap = async () => {
      const mapbox = mapboxRef.current ?? await import('mapbox-gl')
      if (cancelled) return
      mapboxRef.current = mapbox
      mapbox.default.accessToken = mapboxToken
      if (!familyMapRef.current) {
        familyMapRef.current = new mapbox.default.Map({
          container: familyMapElRef.current!,
          style: styleUrl,
          center: [-82.9988, 39.9612],
          zoom: 11,
          attributionControl: false,
        })
        familyMapRef.current.addControl(new mapbox.default.NavigationControl({ showCompass: false }), 'top-right')
        familyMapRef.current.on('load', () => refreshFamilyMarkersRef.current())
      } else {
        try {
          familyMapRef.current.setStyle(styleUrl)
          familyMapRef.current.once('style.load', () => refreshFamilyMarkersRef.current())
        } catch {
          /* ignore */
        }
      }
    }
    void initMap()
    return () => {
      cancelled = true
    }
  }, [isOpen, liveTab, mapboxToken, isLight])

  // Live location updates → refresh markers
  useEffect(() => {
    if (!isOpen || liveTab !== 'map' || !familyMapRef.current) return
    refreshFamilyMapMarkers()
  }, [isOpen, liveTab, refreshFamilyMapMarkers])

  useEffect(() => {
    if (!isOpen) {
      familyMarkersRef.current.forEach((m) => m.remove())
      familyMarkersRef.current = []
      try {
        familyMapRef.current?.remove()
      } catch {
        /* ignore */
      }
      familyMapRef.current = null
    }
  }, [isOpen])

  const loadMembers = async () => {
    try {
      const res = await api.get<{ group_id?: string; group_name?: string; members?: FamilyMember[]; invite_code?: string }>(
        '/api/family/members'
      )
      const data = unwrap<{ group_id?: string; group_name?: string; members?: FamilyMember[]; invite_code?: string }>(res)
      const nextMembers = (data?.members ?? []).filter(Boolean)

      if (nextMembers.length > 0 && data?.group_id) {
        setMembers(nextMembers)
        setGroupId(String(data.group_id))
        if (typeof data.group_name === 'string' && data.group_name.trim()) {
          setGroupName(data.group_name.trim())
        }
        try {
          const details = await api.get<{ group?: { name?: string; invite_code?: string } }>(`/api/family/group/${String(data.group_id)}/members`)
          const g = (details.data as any)?.group
          if (g?.name) setGroupName(String(g.name))
          if (g?.invite_code) setInviteCode(String(g.invite_code))
        } catch {
          // ignore details fetch errors and keep core members payload
        }
        if (typeof data.invite_code === 'string' && data.invite_code.trim()) {
          setInviteCode(data.invite_code.trim())
        }
        setScreen('members')
      } else {
        setMembers([])
        setGroupId(null)
        setInviteCode('')
        setSelectedMember(null)
        setScreen('home')
      }
    } catch {
      setMembers([])
      setGroupId(null)
      setInviteCode('')
      setSelectedMember(null)
      setScreen('home')
    }
  }

  const createGroup = async () => {
    if (!groupName.trim()) return
    setLoading(true)
    try {
      const res = await api.post<{ id?: string; invite_code?: string }>('/api/family/create', { name: groupName.trim() })
      if (!res.success) {
        alert((res as { error?: string }).error ?? 'Failed to create group')
        return
      }
      const group = unwrap<{ id?: string; invite_code?: string }>(res)
      if (group?.id) setGroupId(String(group.id))
      if (group?.invite_code) setInviteCode(String(group.invite_code))
      setNeedsOnboardingFinish(true)
      setScreen('consent')
    } catch {
      alert('Failed to create group')
    } finally {
      setLoading(false)
    }
  }

  const joinGroup = async () => {
    if (!inviteCode.trim()) return
    setLoading(true)
    try {
      const res = await api.post<{ id?: string; invite_code?: string }>('/api/family/join', {
        invite_code: inviteCode.trim(),
      })
      if (!res.success) {
        alert((res as { error?: string }).error ?? 'Invalid invite code')
        return
      }
      const group = unwrap<{ id?: string; invite_code?: string }>(res)
      if (group?.id) setGroupId(String(group.id))
      if (group?.invite_code) setInviteCode(String(group.invite_code))
      setNeedsOnboardingFinish(true)
      setScreen('consent')
    } catch {
      alert('Invalid invite code')
    } finally {
      setLoading(false)
    }
  }

  const sendSOS = async () => {
    setSosActive(true)
    try {
      const meLive = liveByUserId[String(currentUserId)]
      await api.post('/api/family/sos', {
        type: 'manual',
        lat: meLive?.lat,
        lng: meLive?.lng,
        message: meLive?.lat && meLive?.lng ? `Emergency SOS at ${meLive.lat.toFixed(5)}, ${meLive.lng.toFixed(5)}` : undefined,
      })
      alert('SOS sent to all family members!')
    } catch {
      alert('Failed to send SOS')
    }
    window.setTimeout(() => setSosActive(false), 5000)
  }

  const updateMemberSettings = async (member: FamilyMember, updates: Record<string, unknown>) => {
    try {
      await api.put('/api/family/settings', { user_id: member.user_id, ...updates })
      await loadMembers()
    } catch {
      alert('Failed to update settings')
    }
  }

  if (!isOpen) return null

  const headerTitle =
    screen === 'home'
      ? 'Family Mode'
      : screen === 'create'
        ? 'Create Family Group'
        : screen === 'join'
          ? 'Join Family Group'
          : screen === 'consent'
            ? 'Location & Safety Setup'
          : screen === 'settings'
            ? `${selectedMember?.profiles?.full_name ?? selectedMember?.profiles?.name ?? 'Member'}'s Settings`
            : 'Your Family'

  const showBack = screen !== 'home' && screen !== 'members'

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          zIndex: 2000,
          backdropFilter: 'blur(4px)',
        }}
      />
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 2001,
          background: sheetBg,
          borderRadius: '24px 24px 0 0',
          paddingBottom: 'env(safe-area-inset-bottom, 24px)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            width: 36,
            height: 4,
            background: isLight ? 'rgba(15,23,42,0.12)' : 'rgba(255,255,255,0.18)',
            borderRadius: 2,
            margin: '12px auto 0',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {showBack && (
              <button
                onClick={() => setScreen(groupId ? 'members' : 'home')}
                style={{ background: 'none', border: 'none', color: isLight ? '#2563eb' : '#007AFF', fontSize: 16, cursor: 'pointer' }}
              >
                ←
              </button>
            )}
            <div style={{ fontSize: 20, fontWeight: 800, color: sheetText }}>{headerTitle}</div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              background: isLight ? 'rgba(2,6,23,0.06)' : 'rgba(255,255,255,0.1)',
              border: 'none',
              color: sheetText,
              cursor: 'pointer',
              fontSize: 16,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '16px 20px 24px' }}>
          {screen === 'home' && (
            <div>
              <div
                style={{
                  background: isLight ? 'rgba(245,158,11,0.10)' : 'rgba(255,149,0,0.1)',
                  border: isLight ? '1px solid rgba(245,158,11,0.25)' : '1px solid rgba(255,149,0,0.2)',
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 20,
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>👨‍👩‍👧‍👦</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: sheetText, marginBottom: 6 }}>Better than Life360</div>
                <div style={{ fontSize: 13, color: muted, lineHeight: 1.5 }}>
                  Real-time location sharing, SOS alerts, teen driving reports, curfew mode, speed alerts, and family leaderboards —
                  all in one place.
                </div>
              </div>

              <button
                onClick={() => setScreen('create')}
                style={{
                  width: '100%',
                  height: 52,
                  background: '#FF9500',
                  border: 'none',
                  borderRadius: 14,
                  color: 'white',
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginBottom: 12,
                }}
              >
                Create Family Group
              </button>

              <button
                onClick={() => setScreen('join')}
                style={{
                  width: '100%',
                  height: 52,
                  background: isLight ? 'rgba(2,6,23,0.04)' : 'rgba(255,255,255,0.1)',
                  border: isLight ? '1px solid rgba(2,6,23,0.12)' : '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 14,
                  color: sheetText,
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Join with Invite Code
              </button>
            </div>
          )}

          {screen === 'members' && (
            <FamilyCommandCenter
              groupId={groupId ?? ''}
              groupName={groupName || 'Family Group'}
              inviteCode={inviteCode}
              currentUserId={currentUserId}
              isAdmin={Boolean(isAdmin)}
              onRenameGroup={async (name) => {
                await api.put('/api/family/group/name', { group_id: groupId, name })
                setGroupName(name)
              }}
              onSendSOS={async () => {
                await sendSOS()
              }}
              onOpenFullMap={() => {
                onClose()
                window.dispatchEvent(new CustomEvent('snaproad:open-map-from-family'))
              }}
            />
          )}

          {screen === 'members' && false && (
            <div>
              <button
                onClick={sendSOS}
                style={{
                  width: '100%',
                  height: 60,
                  marginBottom: 14,
                  background: sosActive ? 'rgba(255,59,48,0.3)' : '#FF3B30',
                  border: sosActive ? '2px solid #FF3B30' : 'none',
                  borderRadius: 16,
                  color: 'white',
                  fontSize: 18,
                  fontWeight: 800,
                  cursor: 'pointer',
                  letterSpacing: 1,
                  animation: sosActive ? 'pulse 1s infinite' : 'none',
                }}
              >
                {sosActive ? '🚨 SOS SENT TO FAMILY' : '🆘 SOS — Emergency Alert'}
              </button>

              {/* Live Locations — matches driver “Live” dashboard pattern */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: sheetText, letterSpacing: -0.3 }}>Live Locations</div>
                <div style={{ fontSize: 12, color: muted, marginTop: 4, lineHeight: 1.4 }}>Track your family members in real-time</div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <button
                  onClick={() => setLiveTab('list')}
                  style={{
                    flex: 1,
                    height: 40,
                    borderRadius: 12,
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 700,
                    background: liveTab === 'list' ? (isLight ? '#2563eb' : '#0A84FF') : cardBg,
                    color: liveTab === 'list' ? 'white' : muted,
                  }}
                >
                  List View
                </button>
                <button
                  onClick={() => setLiveTab('map')}
                  style={{
                    flex: 1,
                    height: 40,
                    borderRadius: 12,
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 700,
                    background: liveTab === 'map' ? (isLight ? '#2563eb' : '#0A84FF') : cardBg,
                    color: liveTab === 'map' ? 'white' : muted,
                  }}
                >
                  Map View
                </button>
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <button
                  onClick={() => setShowCheckIn(true)}
                  style={{
                    flex: 1,
                    padding: '8px 16px',
                    borderRadius: 10,
                    background: 'rgba(0,122,255,0.15)',
                    border: '1px solid rgba(0,122,255,0.25)',
                    color: '#007AFF',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Check-in
                </button>
                <button
                  onClick={() => setShowFamilyLeaderboard(true)}
                  style={{
                    flex: 1,
                    padding: '8px 16px',
                    borderRadius: 10,
                    background: 'rgba(167,139,250,0.12)',
                    border: '1px solid rgba(167,139,250,0.25)',
                    color: '#A78BFA',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Leaderboard
                </button>
              </div>

              {liveTab === 'map' ? (
                <div
                  style={{
                    borderRadius: 16,
                    overflow: 'hidden',
                    background: cardBg,
                    border: `1px solid ${isLight ? 'rgba(2,6,23,0.08)' : 'rgba(255,255,255,0.10)'}`,
                    minHeight: 280,
                  }}
                >
                  {mapboxToken ? (
                    <div ref={familyMapElRef} style={{ width: '100%', height: 280 }} />
                  ) : (
                    <div style={{ padding: 20, color: muted, fontSize: 13 }}>
                      Add <code style={{ fontSize: 11 }}>VITE_MAPBOX_TOKEN</code> to show the family map.
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {members.map((m) => {
                    const uid = String(m.user_id)
                    const live = liveByUserId[uid]
                    const name = m.profiles?.full_name ?? m.profiles?.name ?? 'Family member'
                    const me = String(currentUserId) === uid
                    const myLive = liveByUserId[String(currentUserId)]
                    const dist =
                      myLive && live ? haversineMiles({ lat: myLive.lat, lng: myLive.lng }, { lat: live.lat, lng: live.lng }) : null
                    const status = deriveStatus(live)
                    const statusLabel = status === 'driving' ? 'Driving' : status === 'arrived' ? 'Arrived' : 'Idle'
                    const statusBg =
                      status === 'driving'
                        ? isLight
                          ? 'rgba(37,99,235,0.12)'
                          : 'rgba(96,165,250,0.18)'
                        : status === 'arrived'
                          ? isLight
                            ? 'rgba(34,197,94,0.15)'
                            : 'rgba(52,199,89,0.22)'
                          : isLight
                            ? 'rgba(100,116,139,0.15)'
                            : 'rgba(148,163,184,0.18)'
                    const statusFg =
                      status === 'driving' ? (isLight ? '#1d4ed8' : '#93c5fd') : status === 'arrived' ? (isLight ? '#15803d' : '#86efac') : (isLight ? '#64748b' : '#94a3b8')
                    const mph = live?.speedMph != null && Number.isFinite(live.speedMph) ? Math.round(live.speedMph) : null
                    return (
                      <div
                        key={m.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          if (isAdmin) {
                            setReportCardMember(m)
                            setShowReportCard(true)
                          } else {
                            setSelectedMember(m)
                            setScreen('settings')
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (isAdmin) {
                              setReportCardMember(m)
                              setShowReportCard(true)
                            } else {
                              setSelectedMember(m)
                              setScreen('settings')
                            }
                          }
                        }}
                        style={{
                          borderRadius: 16,
                          padding: '14px 14px',
                          background: isLight ? '#ffffff' : cardBg,
                          border: `1px solid ${isLight ? 'rgba(2,6,23,0.08)' : 'rgba(255,255,255,0.10)'}`,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          boxShadow: isLight ? '0 1px 3px rgba(15,23,42,0.06)' : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 22,
                              background: isLight ? 'linear-gradient(135deg, #e0e7ff, #c7d2fe)' : 'linear-gradient(135deg, rgba(96,165,250,0.35), rgba(37,99,235,0.25))',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: 16,
                              color: isLight ? '#3730a3' : '#e0e7ff',
                              flexShrink: 0,
                            }}
                          >
                            {(name || 'F').slice(0, 1).toUpperCase()}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <div
                                style={{
                                  fontSize: 15,
                                  fontWeight: 800,
                                  color: sheetText,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  maxWidth: '100%',
                                }}
                              >
                                {name}
                                {me ? ' (You)' : ''}
                              </div>
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 800,
                                  textTransform: 'uppercase',
                                  letterSpacing: 0.4,
                                  color: statusFg,
                                  background: statusBg,
                                  padding: '4px 8px',
                                  borderRadius: 999,
                                }}
                              >
                                {statusLabel}
                              </span>
                            </div>
                            <div style={{ fontSize: 12, color: muted, marginTop: 6, lineHeight: 1.45 }}>
                              {live
                                ? `Live location${dist != null && Number.isFinite(dist) ? ` • ${dist.toFixed(dist < 10 ? 1 : 0)} mi away` : ''}`
                                : 'Waiting for location…'}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8, fontSize: 11, color: muted }}>
                              {mph != null && status === 'driving' && <span>{mph} mph</span>}
                              <span>Battery —</span>
                              <span>Updated {formatRelativeTime(live?.lastUpdated)}</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                          <button
                            type="button"
                            aria-label="Call"
                            onClick={(e) => {
                              e.stopPropagation()
                              /* Phone numbers not on family profile yet */
                            }}
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 10,
                              border: `1px solid ${isLight ? 'rgba(2,6,23,0.08)' : 'rgba(255,255,255,0.12)'}`,
                              background: isLight ? 'rgba(2,6,23,0.03)' : 'rgba(255,255,255,0.06)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: muted,
                              cursor: 'pointer',
                            }}
                          >
                            <Phone size={16} />
                          </button>
                          <ChevronRight size={20} style={{ opacity: 0.55, color: isLight ? '#94a3b8' : '#94a3b8' }} />
                        </div>
                      </div>
                    )
                  })}

                  <button
                    onClick={() => { navigator.clipboard?.writeText(inviteCode || '').catch(() => {}); alert(inviteCode ? `Invite code copied: ${inviteCode}` : 'Invite code not available yet') }}
                    style={{
                      marginTop: 4,
                      width: '100%',
                      height: 48,
                      borderRadius: 14,
                      background: isLight ? 'rgba(2,6,23,0.04)' : 'rgba(255,255,255,0.08)',
                      border: `1px dashed ${isLight ? 'rgba(2,6,23,0.18)' : 'rgba(255,255,255,0.18)'}`,
                      color: sheetText,
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    Add Family Member (copy invite code)
                  </button>

                  <div
                    style={{
                      borderRadius: 16,
                      padding: 14,
                      background: isLight ? 'rgba(14,165,233,0.08)' : 'rgba(10,132,255,0.12)',
                      border: `1px solid ${isLight ? 'rgba(14,165,233,0.2)' : 'rgba(96,165,250,0.22)'}`,
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 800, color: sheetText, marginBottom: 4 }}>Privacy First</div>
                    <div style={{ fontSize: 12, color: muted, lineHeight: 1.45 }}>
                      All family members can enable privacy controls at any time. Locations are only visible within your family group.
                    </div>
                  </div>

                  <button
                    onClick={() => setShowPrivacy(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      width: '100%',
                      padding: '12px 14px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 12,
                      cursor: 'pointer',
                      marginTop: 8,
                    }}
                  >
                    <span style={{ fontSize: 20 }}>🔒</span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ color: sheetText, fontWeight: 600, fontSize: 14 }}>Privacy &amp; Trust</div>
                      <div style={{ color: muted, fontSize: 12 }}>Privacy windows · Independence level</div>
                    </div>
                    <div style={{ marginLeft: 'auto', color: muted, fontSize: 18 }}>›</div>
                  </button>

                  {inviteCode.trim().length === 8 && (
                    <div
                      style={{
                        background: isLight ? 'rgba(245,158,11,0.10)' : 'rgba(255,149,0,0.08)',
                        border: isLight ? '1px solid rgba(245,158,11,0.25)' : '1px solid rgba(255,149,0,0.2)',
                        borderRadius: 14,
                        padding: '14px 16px',
                        marginTop: 6,
                      }}
                    >
                      <div style={{ fontSize: 12, color: muted, marginBottom: 6 }}>Share invite code to add family members</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#FF9500', letterSpacing: 6, fontFamily: 'monospace' }}>
                        {inviteCode.trim()}
                      </div>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard?.writeText(inviteCode.trim())}
                        style={{ marginTop: 8, background: 'none', border: 'none', color: '#FF9500', fontSize: 13, cursor: 'pointer', padding: 0 }}
                      >
                        Copy code
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {screen === 'create' && (
            <div>
              <div style={{ fontSize: 13, color: muted, marginBottom: 16, lineHeight: 1.5 }}>
                Give your family group a name. You&apos;ll get an invite code to share with family members.
              </div>
              <input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. The Ahmed Family"
                style={{
                  width: '100%',
                  height: 48,
                  background: isLight ? '#f8fafc' : 'rgba(255,255,255,0.08)',
                  border: `1px solid ${isLight ? 'rgba(2,6,23,0.12)' : 'rgba(255,255,255,0.15)'}`,
                  borderRadius: 12,
                  padding: '0 16px',
                  color: sheetText,
                  fontSize: 15,
                  fontFamily: 'inherit',
                  marginBottom: 16,
                  outline: 'none',
                }}
              />
              <button
                onClick={createGroup}
                disabled={loading || !groupName.trim()}
                style={{
                  width: '100%',
                  height: 52,
                  background: groupName.trim() ? '#FF9500' : (isLight ? 'rgba(2,6,23,0.08)' : 'rgba(255,255,255,0.1)'),
                  border: 'none',
                  borderRadius: 14,
                  color: 'white',
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: groupName.trim() ? 'pointer' : 'not-allowed',
                  opacity: groupName.trim() ? 1 : 0.6,
                }}
              >
                {loading ? 'Creating...' : 'Create Group'}
              </button>
            </div>
          )}

          {screen === 'join' && (
            <div>
              <div style={{ fontSize: 13, color: muted, marginBottom: 16, lineHeight: 1.5 }}>
                Enter the 8-character invite code your family admin shared with you.
              </div>
              <input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="e.g. A1B2C3D4"
                maxLength={8}
                style={{
                  width: '100%',
                  height: 56,
                  background: isLight ? '#f8fafc' : 'rgba(255,255,255,0.08)',
                  border: `1px solid ${isLight ? 'rgba(2,6,23,0.12)' : 'rgba(255,255,255,0.15)'}`,
                  borderRadius: 12,
                  padding: '0 16px',
                  color: sheetText,
                  fontSize: 22,
                  fontWeight: 700,
                  letterSpacing: 6,
                  fontFamily: 'monospace',
                  marginBottom: 16,
                  outline: 'none',
                  textAlign: 'center',
                }}
              />
              <button
                onClick={joinGroup}
                disabled={loading || inviteCode.trim().length !== 8}
                style={{
                  width: '100%',
                  height: 52,
                  background: inviteCode.trim().length === 8 ? '#FF9500' : (isLight ? 'rgba(2,6,23,0.08)' : 'rgba(255,255,255,0.1)'),
                  border: 'none',
                  borderRadius: 14,
                  color: 'white',
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: inviteCode.trim().length === 8 ? 'pointer' : 'not-allowed',
                  opacity: inviteCode.trim().length === 8 ? 1 : 0.6,
                }}
              >
                {loading ? 'Joining...' : 'Join Family'}
              </button>
            </div>
          )}

          {screen === 'consent' && (
            <div>
              <div style={{ fontSize: 13, color: muted, marginBottom: 16, lineHeight: 1.5 }}>
                Finish setup so your family can see live safety updates. You can change this later in settings.
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, border: isLight ? '1px solid rgba(2,6,23,0.12)' : '1px solid rgba(255,255,255,0.2)', marginBottom: 10 }}>
                <input type="checkbox" checked={locationConsent} onChange={(e) => setLocationConsent(e.target.checked)} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: sheetText }}>Allow location permission</div>
                  <div style={{ fontSize: 12, color: muted }}>Required for live map and place alerts.</div>
                </div>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, border: isLight ? '1px solid rgba(2,6,23,0.12)' : '1px solid rgba(255,255,255,0.2)', marginBottom: 16 }}>
                <input type="checkbox" checked={shareLocation} onChange={(e) => setShareLocation(e.target.checked)} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: sheetText }}>Share live location with family</div>
                  <div style={{ fontSize: 12, color: muted }}>Lets all members and admins receive safety updates.</div>
                </div>
              </label>
              <button
                onClick={async () => {
                  setLoading(true)
                  try {
                    if (locationConsent && shareLocation && navigator.geolocation) {
                      await new Promise<void>((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(
                          async (pos) => {
                            await updateMyLocation(currentUserId, pos.coords.latitude, pos.coords.longitude, 0, typeof pos.coords.speed === 'number' ? pos.coords.speed * 2.237 : 0, false)
                            resolve()
                          },
                          () => reject(new Error('location denied')),
                          { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 }
                        )
                      })
                    }
                    if (needsOnboardingFinish) await loadMembers()
                    else setScreen('members')
                  } catch {
                    if (locationConsent && shareLocation) {
                      alert('Please allow location permission to continue with live safety sharing.')
                      return
                    }
                    await loadMembers()
                  } finally {
                    setLoading(false)
                    setNeedsOnboardingFinish(false)
                  }
                }}
                disabled={loading}
                style={{ width: '100%', height: 50, border: 'none', borderRadius: 14, background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Finishing setup...' : 'Continue to Family Dashboard'}
              </button>
            </div>
          )}

          {screen === 'settings' && selectedMember && (
            <div>
              <div style={{ fontSize: 13, color: muted, marginBottom: 20, lineHeight: 1.5 }}>
                Configure safety settings for this family member.
              </div>

              {!isAdmin && String(selectedMember.user_id) !== String(currentUserId) && (
                <div
                  style={{
                    background: isLight ? 'rgba(245,158,11,0.10)' : 'rgba(255,149,0,0.1)',
                    border: isLight ? '1px solid rgba(245,158,11,0.25)' : '1px solid rgba(255,149,0,0.2)',
                    borderRadius: 14,
                    padding: 12,
                    color: sheetText,
                    fontSize: 13,
                    marginBottom: 14,
                  }}
                >
                  Only the family admin can edit other members&apos; settings.
                </div>
              )}

              <div style={{ marginBottom: 20, opacity: isAdmin || String(selectedMember.user_id) === String(currentUserId) ? 1 : 0.5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 14, color: sheetText, fontWeight: 600 }}>Max speed alert</span>
                  <span style={{ fontSize: 14, color: '#FF9500', fontWeight: 700 }}>{selectedMember.max_speed_mph} mph</span>
                </div>
                <input
                  type="range"
                  min={45}
                  max={90}
                  step={5}
                  value={selectedMember.max_speed_mph}
                  disabled={!isAdmin && String(selectedMember.user_id) !== String(currentUserId)}
                  onChange={(e) => {
                    const val = Number(e.target.value)
                    const next = { ...selectedMember, max_speed_mph: val }
                    setSelectedMember(next)
                    void updateMemberSettings(next, { max_speed_mph: val })
                  }}
                  style={{ width: '100%' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: muted, marginTop: 4 }}>
                  <span>45 mph</span>
                  <span>90 mph</span>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 0',
                  borderTop: `1px solid ${isLight ? 'rgba(2,6,23,0.08)' : 'rgba(255,255,255,0.08)'}`,
                  opacity: isAdmin || String(selectedMember.user_id) === String(currentUserId) ? 1 : 0.5,
                }}
              >
                <div>
                  <div style={{ color: sheetText, fontWeight: 600, fontSize: 14 }}>📵 Focus mode</div>
                  <div style={{ color: muted, fontSize: 12, marginTop: 2 }}>
                    Locks phone to navigation only while driving
                  </div>
                </div>
                <div
                  onClick={() => {
                    if (!isAdmin && String(selectedMember.user_id) !== String(currentUserId)) return
                    const val = !selectedMember.focus_mode
                    const next = { ...selectedMember, focus_mode: val }
                    setSelectedMember(next)
                    void updateMemberSettings(next, { focus_mode: val })
                  }}
                  style={{
                    width: 50,
                    height: 28,
                    borderRadius: 14,
                    background: selectedMember.focus_mode ? '#FF9500' : (isLight ? 'rgba(2,6,23,0.12)' : 'rgba(255,255,255,0.15)'),
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 3,
                      left: selectedMember.focus_mode ? 25 : 3,
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      background: isLight ? '#ffffff' : 'white',
                      transition: 'left 0.2s',
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 0',
                  borderTop: `1px solid ${isLight ? 'rgba(2,6,23,0.08)' : 'rgba(255,255,255,0.08)'}`,
                  opacity: isAdmin || String(selectedMember.user_id) === String(currentUserId) ? 1 : 0.5,
                }}
              >
                <div>
                  <div style={{ color: sheetText, fontWeight: 600, fontSize: 14 }}>🌙 Curfew time</div>
                  <div style={{ color: muted, fontSize: 12, marginTop: 2 }}>
                    Alert if still driving after this time
                  </div>
                </div>
                <input
                  type="time"
                  value={selectedMember.curfew_time ?? '22:00'}
                  disabled={!isAdmin && String(selectedMember.user_id) !== String(currentUserId)}
                  onChange={(e) => {
                    const next = { ...selectedMember, curfew_time: e.target.value }
                    setSelectedMember(next)
                    void updateMemberSettings(next, { curfew_time: e.target.value })
                  }}
                  style={{
                    background: isLight ? '#f8fafc' : 'rgba(255,255,255,0.08)',
                    border: `1px solid ${isLight ? 'rgba(2,6,23,0.12)' : 'rgba(255,255,255,0.15)'}`,
                    borderRadius: 8,
                    padding: '6px 10px',
                    color: sheetText,
                    fontSize: 14,
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <FamilyPrivacyControls
        isOpen={showPrivacy}
        onClose={() => setShowPrivacy(false)}
        currentUserId={currentUserId}
        isAdmin={Boolean(isAdmin)}
        safetyRecord={{ totalTrips: 0, avgSafetyScore: 0, cleanDays: 14 }}
      />
      <TeenReportCard
        isOpen={showReportCard}
        onClose={() => setShowReportCard(false)}
        memberId={reportCardMember?.user_id ?? ''}
        memberName={reportCardMember?.profiles?.full_name ?? reportCardMember?.profiles?.name ?? 'Member'}
        isAdmin={Boolean(isAdmin)}
      />
      <FamilyLeaderboard
        isOpen={showFamilyLeaderboard}
        onClose={() => setShowFamilyLeaderboard(false)}
        currentUserId={currentUserId}
        groupId={groupId ?? ''}
      />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </>
  )
}

