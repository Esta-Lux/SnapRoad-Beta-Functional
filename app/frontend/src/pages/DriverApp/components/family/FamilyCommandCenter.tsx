import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Map as MapboxMap, Marker as MapboxMarker } from 'mapbox-gl'
import api from '@/services/api'
import { Settings, Battery, Car, Home, Building2, MapPin } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { updateMyLocation } from '@/lib/friendLocation'

type FamilyLive = {
  lat?: number
  lng?: number
  speed_mph?: number
  heading?: number
  battery_level?: number
  is_sharing?: boolean
  sos_active?: boolean
  last_updated?: string
}

type FamilyMember = {
  id: string
  user_id: string
  role: 'admin' | 'member' | 'teen'
  max_speed_mph?: number
  curfew_time?: string | null
  focus_mode?: boolean
  profiles?: { full_name?: string; name?: string; avatar_url?: string | null }
  live?: FamilyLive
}

type FamilyPlace = {
  id?: string
  name: string
  lat: number
  lng: number
  radius_meters?: number
  watch_user_id?: string
  alert_on?: 'arrive' | 'depart' | 'both'
}

type FamilyEvent = {
  id: string
  member_id: string
  type: string
  place_id?: string
  place_name?: string
  message?: string
  created_at?: string
}

interface Props {
  readonly groupId: string
  readonly groupName: string
  readonly inviteCode: string
  readonly currentUserId: string
  readonly isAdmin: boolean
  readonly onRenameGroup: (name: string) => Promise<void>
  readonly onSendSOS: () => Promise<void>
  readonly onOpenFullMap?: (memberId?: string) => void
}

const STATUS_COLORS = ['#2563eb', '#16a34a', '#7c3aed', '#f59e0b', '#e11d48', '#0ea5e9', '#9333ea']

function relTime(iso?: string): string {
  if (!iso) return 'just now'
  const delta = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (delta < 60) return 'just now'
  if (delta < 3600) return `${Math.floor(delta / 60)} min ago`
  if (delta < 86400) return `${Math.floor(delta / 3600)} hr ago`
  return `${Math.floor(delta / 86400)} d ago`
}

function dashboardTitleForRole(myRole: string): string {
  if (myRole === 'admin') return 'Admin Dashboard'
  if (myRole === 'teen') return 'Teen Safety Dashboard'
  return 'Member Dashboard'
}

function dashboardBlurbForRole(myRole: string): string {
  if (myRole === 'admin') return 'Manage roles, places, and family-wide safety notifications.'
  if (myRole === 'teen') return 'View your trips, alerts, and shared location safety settings.'
  return 'Track family activity and keep your location sharing preferences updated.'
}

function formatFamilyEventMessage(e: FamilyEvent): string {
  const place = e.place_name ? ` · ${e.place_name}` : ''
  return e.message ?? `${e.type}${place}`
}

function memberRoleLabel(role: string): string {
  if (role === 'admin') return 'Admin'
  if (role === 'teen') return 'Teen'
  return 'Member'
}

function memberSheetLiveSubtitle(m: FamilyMember, statusLabel: string): string {
  if (!m.live?.is_sharing) return 'Location off'
  const mph = m.live?.speed_mph
  if (typeof mph === 'number' && mph > 5) return `Driving · ${Math.round(mph)} mph`
  return statusLabel
}

function distMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000
  const delta_lat = ((b.lat - a.lat) * Math.PI) / 180
  const delta_lng = ((b.lng - a.lng) * Math.PI) / 180
  const la = (a.lat * Math.PI) / 180
  const lb = (b.lat * Math.PI) / 180
  const x = Math.sin(delta_lat / 2) ** 2 + Math.cos(la) * Math.cos(lb) * Math.sin(delta_lng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

export default function FamilyCommandCenter({
  groupId,
  groupName,
  inviteCode,
  currentUserId,
  isAdmin,
  onRenameGroup,
  onSendSOS,
  onOpenFullMap,
}: Props) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [events, setEvents] = useState<FamilyEvent[]>([])
  const [places, setPlaces] = useState<FamilyPlace[]>([])
  const [loading, setLoading] = useState(true)
  const [renaming, setRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState(groupName)
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null)
  const [memberTrips, setMemberTrips] = useState<any[]>([])
  const [memberStats, setMemberStats] = useState<any>(null)
  const [showAdmin, setShowAdmin] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean | number>>({
    notify_arrival_home: true,
    notify_departure_school: true,
    notify_start_driving: true,
    notify_speed_exceeded: true,
    speed_threshold_mph: 70,
  })
  const [placeDrafts, setPlaceDrafts] = useState<FamilyPlace[]>([])
  const [miniMapAvailable, setMiniMapAvailable] = useState(true)
  const miniMapEl = useRef<HTMLDivElement | null>(null)
  const miniMapRef = useRef<MapboxMap | null>(null)
  const markersRef = useRef<MapboxMarker[]>([])
  const mapboxRef = useRef<typeof import('mapbox-gl') | null>(null)
  const geofenceStateRef = useRef<Record<string, boolean>>({})

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const [mRes, eRes] = await Promise.all([
        api.get<{ group?: any; members?: FamilyMember[] }>(`/api/family/group/${groupId}/members`),
        api.get<{ events?: FamilyEvent[] }>(`/api/family/group/${groupId}/events?limit=20`),
      ])
      setMembers((mRes.data as any)?.members ?? [])
      setEvents((eRes.data as any)?.events ?? [])
      const p = await api.get<{ places?: FamilyPlace[] }>(`/api/family/group/${groupId}/places`)
      setPlaces((p.data as any)?.places ?? [])
      setPlaceDrafts((p.data as any)?.places ?? [])
    } finally {
      setLoading(false)
    }
  }, [groupId])

  useEffect(() => {
    setNameDraft(groupName)
  }, [groupName])

  useEffect(() => {
    loadDashboard().catch(() => {})
  }, [loadDashboard])

  // Geolocation is required for the family feature: push the signed-in user’s position while this screen is open
  // so the live map and server-side geofence logic stay accurate (browser permission prompt applies).
  useEffect(() => {
    let watchId: number | null = null
    if (typeof navigator === 'undefined' || !navigator.geolocation || !currentUserId) return
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        void updateMyLocation(
          currentUserId,
          pos.coords.latitude,
          pos.coords.longitude,
          0,
          typeof pos.coords.speed === 'number' && pos.coords.speed >= 0 ? pos.coords.speed * 2.237 : 0,
          false
        )
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 }
    )
    return () => {
      if (watchId != null) navigator.geolocation.clearWatch(watchId)
    }
  }, [currentUserId])

  // Lightweight family geofence detection while dashboard is open.
  useEffect(() => {
    const me = members.find((m) => String(m.user_id) === String(currentUserId))
    const live = me?.live
    if (!live || !live.is_sharing || typeof live.lat !== 'number' || typeof live.lng !== 'number') return
    for (const place of places) {
      if (typeof place.lat !== 'number' || typeof place.lng !== 'number') continue
      const key = `${currentUserId}:${place.id ?? place.name}`
      const inside = distMeters({ lat: live.lat, lng: live.lng }, { lat: place.lat, lng: place.lng }) <= (place.radius_meters ?? 200)
      const prev = geofenceStateRef.current[key]
      if (prev === undefined) {
        geofenceStateRef.current[key] = inside
        continue
      }
      if (inside !== prev) {
        geofenceStateRef.current[key] = inside
        void api.post('/api/family/event', {
          group_id: groupId,
          member_id: currentUserId,
          type: inside ? 'arrival' : 'departure',
          place_id: place.id,
          place_name: place.name,
          message: `${me?.profiles?.full_name ?? me?.profiles?.name ?? 'Member'} ${inside ? 'arrived at' : 'left'} ${place.name}`,
        })
      }
    }
  }, [members, currentUserId, places, groupId])

  const memberColor = useCallback((id: string) => {
    let h = 0
    for (const ch of id) {
      const cp = ch.codePointAt(0) ?? 0
      h = (h * 31 + cp) >>> 0
    }
    return STATUS_COLORS[h % STATUS_COLORS.length]
  }, [])

  const statusFor = useCallback(
    (m: FamilyMember) => {
      const name = m.profiles?.full_name ?? m.profiles?.name ?? 'Member'
      const live = m.live
      if (!live?.is_sharing) return { label: 'Location off', color: '#6b7280' }
      if (typeof live.speed_mph === 'number' && live.speed_mph > 5) return { label: `Moving · ${Math.round(live.speed_mph)} mph`, color: '#2563eb' }
      if (typeof live.lat === 'number' && typeof live.lng === 'number') {
        for (const p of places) {
          if (typeof p.lat !== 'number' || typeof p.lng !== 'number') continue
          if (distMeters({ lat: live.lat, lng: live.lng }, { lat: p.lat, lng: p.lng }) <= (p.radius_meters ?? 200)) {
            return { label: `At ${p.name}`, color: '#16a34a' }
          }
        }
      }
      return { label: 'Stationary', color: '#6b7280', name }
    },
    [places]
  )

  const refreshMiniMap = useCallback(() => {
    const map = miniMapRef.current
    const mapbox = mapboxRef.current
    if (!map || !mapbox || !map.isStyleLoaded()) return
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []
    const bounds = new mapbox.LngLatBounds()
    let plotted = 0
    for (const m of members) {
      const live = m.live
      if (!live?.is_sharing || typeof live.lat !== 'number' || typeof live.lng !== 'number') continue
      const c = memberColor(m.user_id)
      const el = document.createElement('div')
      el.style.width = '26px'
      el.style.height = '26px'
      el.style.borderRadius = '999px'
      el.style.background = c
      el.style.border = '3px solid #fff'
      el.style.boxShadow = '0 2px 10px rgba(0,0,0,0.28)'
      const marker = new mapbox.Marker({ element: el }).setLngLat([live.lng, live.lat]).addTo(map)
      marker.setPopup(new mapbox.Popup({ offset: 12 }).setHTML(`<b>${m.profiles?.full_name ?? m.profiles?.name ?? 'Member'}</b><br/>${relTime(live.last_updated)}`))
      marker.getElement().addEventListener('click', () => setSelectedMember(m))
      markersRef.current.push(marker)
      bounds.extend([live.lng, live.lat])
      plotted += 1
    }
    if (plotted > 0) map.fitBounds(bounds, { padding: 42, maxZoom: 13, duration: 350 })
  }, [members, memberColor])

  useEffect(() => {
    const envToken = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined
    const runtimeToken = (globalThis as any)?.mapboxgl?.accessToken as string | undefined
    const token = (envToken && envToken.trim()) || (runtimeToken && runtimeToken.trim()) || ''
    if (!token || !miniMapEl.current) {
      setMiniMapAvailable(false)
      return
    }
    setMiniMapAvailable(true)
    let cancelled = false
    const init = async () => {
      const mapbox = mapboxRef.current ?? await import('mapbox-gl')
      if (cancelled) return
      mapboxRef.current = mapbox
      mapbox.default.accessToken = token
      if (!miniMapRef.current) {
        miniMapRef.current = new mapbox.default.Map({
          container: miniMapEl.current!,
          style: isLight ? 'mapbox://styles/mapbox/light-v11' : 'mapbox://styles/mapbox/dark-v11',
          center: [-82.9988, 39.9612],
          zoom: 11,
          attributionControl: false,
          logoPosition: 'bottom-right',
          interactive: true,
        })
        miniMapRef.current.addControl(new mapbox.default.AttributionControl({ compact: true }), 'bottom-right')
        miniMapRef.current.addControl(new mapbox.default.NavigationControl({ showCompass: false }), 'top-right')
        miniMapRef.current.on('load', refreshMiniMap)
      } else {
        try {
          miniMapRef.current.setStyle(isLight ? 'mapbox://styles/mapbox/light-v11' : 'mapbox://styles/mapbox/dark-v11')
          miniMapRef.current.once('style.load', refreshMiniMap)
        } catch {
          refreshMiniMap()
        }
      }
    }
    init().catch(() => {})
    return () => {
      cancelled = true
    }
  }, [refreshMiniMap, isLight])

  useEffect(() => {
    refreshMiniMap()
  }, [refreshMiniMap])

  const memberCountLabel = `${groupName || 'Family'} · ${members.length} members`
  const myRole = useMemo(() => {
    const me = members.find((m) => String(m.user_id) === String(currentUserId))
    return (me?.role || (isAdmin ? 'admin' : 'member')).toLowerCase()
  }, [members, currentUserId, isAdmin])
  const essentialMembers = useMemo(() => {
    if (members.length > 0) return members
    // Keep layout informative while backend membership rows are recovering.
    return [
      {
        id: 'self-fallback',
        user_id: currentUserId,
        role: isAdmin ? 'admin' : 'member',
        profiles: { full_name: 'You', name: 'You' },
        live: { is_sharing: false },
      } as FamilyMember,
    ]
  }, [members, currentUserId, isAdmin])

  const activityIcon = (t: string) => {
    if (t.includes('arrival')) return <Home size={14} />
    if (t.includes('departure')) return <Building2 size={14} />
    if (t.includes('driving')) return <Car size={14} />
    return <MapPin size={14} />
  }

  const handleMemberSelect = useCallback(async (m: FamilyMember) => {
    setSelectedMember(m)
    const [tripsRes, statsRes] = await Promise.all([
      api.get<{ trips?: any[] }>(`/api/family/member/${m.user_id}/trips`),
      api.get<{ stats?: any }>(`/api/family/member/${m.user_id}/stats`),
    ])
    setMemberTrips((tripsRes.data as any)?.trips ?? [])
    setMemberStats((statsRes.data as any)?.stats ?? null)
  }, [])

  const openGearMenu = useCallback(() => {
    if (myRole === 'admin') {
      setShowAdmin(true)
      return
    }
    const self = essentialMembers.find((x) => String(x.user_id) === String(currentUserId)) ?? essentialMembers[0]
    handleMemberSelect(self).catch(() => {})
  }, [myRole, essentialMembers, currentUserId, handleMemberSelect])

  const saveNotificationPrefs = async () => {
    if (!selectedMember) return
    await api.put(`/api/family/member/${selectedMember.user_id}/notifications`, notifPrefs)
  }

  const refreshNow = async () => {
    setIsRefreshing(true)
    try {
      await loadDashboard()
    } finally {
      setIsRefreshing(false)
    }
  }

  const removeMember = async (uid: string) => {
    await api.post(`/api/family/group/${groupId}/member/${uid}/remove`)
    await loadDashboard()
  }

  const toggleMemberLocationSharing = useCallback(
    async (m: FamilyMember) => {
      await api.put(`/api/family/group/${groupId}/member/${m.user_id}/sharing`, { is_sharing: !m.live?.is_sharing })
      await loadDashboard()
    },
    [groupId, loadDashboard]
  )

  const savePlaces = async () => {
    await api.put(`/api/family/group/${groupId}/places`, { places: placeDrafts })
    await loadDashboard()
  }

  if (loading) {
    return (
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ height: 68, borderRadius: 14, background: 'rgba(148,163,184,0.2)' }} />
        <div style={{ height: 220, borderRadius: 14, background: 'rgba(148,163,184,0.2)' }} />
        <div style={{ height: 120, borderRadius: 14, background: 'rgba(148,163,184,0.2)' }} />
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ borderRadius: 12, padding: '10px 12px', border: '1px solid rgba(37,99,235,0.25)', background: isLight ? 'rgba(239,246,255,0.9)' : 'rgba(29,78,216,0.18)' }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: isLight ? '#1d4ed8' : '#bfdbfe' }}>{dashboardTitleForRole(myRole)}</div>
        <div style={{ fontSize: 11, color: isLight ? '#475569' : 'rgba(255,255,255,0.72)', marginTop: 4 }}>
          {dashboardBlurbForRole(myRole)}
        </div>
      </div>

      <div style={{ borderRadius: 16, padding: 14, background: isLight ? 'rgba(255,255,255,0.92)' : 'rgba(15,23,42,0.65)', border: isLight ? '1px solid rgba(15,23,42,0.08)' : '1px solid rgba(255,255,255,0.12)', boxShadow: isLight ? '0 4px 18px rgba(15,23,42,0.08)' : '0 6px 24px rgba(0,0,0,0.35)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} style={{ fontSize: 18, fontWeight: 800, border: 'none', outline: 'none', background: 'transparent', maxWidth: 200, color: isLight ? '#0f172a' : '#fff' }} />
              {isAdmin && (
                <button
                  onClick={async () => {
                    setRenaming(true)
                    try { await onRenameGroup(nameDraft) } finally { setRenaming(false) }
                  }}
                  style={{ border: 'none', borderRadius: 10, padding: '6px 10px', cursor: 'pointer', background: '#eef2ff', color: '#1d4ed8', fontWeight: 700 }}
                >
                  {renaming ? 'Saving...' : 'Save'}
                </button>
              )}
            </div>
            <div style={{ fontSize: 12, color: isLight ? '#64748b' : 'rgba(255,255,255,0.65)', marginTop: 2 }}>{memberCountLabel}</div>
            <div style={{ fontSize: 11, color: isLight ? '#64748b' : 'rgba(255,255,255,0.6)', marginTop: 4 }}>
              Group ID: <b>{groupId}</b> · Invite: <b>{inviteCode || '—'}</b>
            </div>
            <div style={{ fontSize: 11, color: '#1d4ed8', fontWeight: 700, marginTop: 4 }}>{memberRoleLabel(myRole)}</div>
          </div>
          <button type="button" onClick={openGearMenu} style={{ border: 'none', width: 36, height: 36, borderRadius: 12, background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.14)', color: isLight ? '#0f172a' : '#fff', cursor: 'pointer' }}><Settings size={16} /></button>
        </div>
      </div>

      <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(15,23,42,0.08)', boxShadow: '0 4px 18px rgba(15,23,42,0.08)', background: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px' }}>
          <div style={{ fontWeight: 800 }}>SnapRoad Map</div>
          <button onClick={() => onOpenFullMap?.()} style={{ border: 'none', borderRadius: 10, padding: '6px 10px', background: '#eff6ff', color: '#2563eb', fontWeight: 700, cursor: 'pointer' }}>Full Map</button>
        </div>
        {miniMapAvailable ? (
          <div ref={miniMapEl} style={{ height: 220, width: '100%' }} />
        ) : (
          <div style={{ height: 220, display: 'grid', placeItems: 'center', color: '#64748b', fontSize: 12 }}>
            Map is unavailable until a valid Mapbox token is loaded.
          </div>
        )}
        <div style={{ padding: '6px 12px 10px', fontSize: 11, color: '#64748b' }}>
          Live family preview. Mapbox attribution remains visible per provider terms.
        </div>
      </div>

      <div style={{ marginTop: -2, fontSize: 13, fontWeight: 800 }}>Members</div>
      <div style={{ overflowX: 'auto', display: 'flex', gap: 10, paddingBottom: 4 }}>
        {essentialMembers.map((m) => {
          const name = m.profiles?.full_name ?? m.profiles?.name ?? 'Member'
          const status = statusFor(m)
          return (
            <button type="button" key={m.user_id} onClick={() => handleMemberSelect(m).catch(() => {})} style={{ minWidth: 190, textAlign: 'left', border: '1px solid rgba(15,23,42,0.08)', borderRadius: 14, padding: 12, background: '#fff', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 18, display: 'grid', placeItems: 'center', color: 'white', fontWeight: 800, background: memberColor(m.user_id) }}>
                    {name.slice(0, 1).toUpperCase()}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{name}</div>
                </div>
                {typeof m.live?.battery_level === 'number' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748b', fontSize: 11 }}>
                    <Battery size={13} /> {Math.round(m.live.battery_level)}%
                  </div>
                )}
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: status.color, fontWeight: 700 }}>{status.label}</div>
              <div style={{ marginTop: 6, fontSize: 11, color: '#64748b' }}>{name.split(' ')[0]} · {relTime(m.live?.last_updated)}</div>
              <div style={{ marginTop: 6, fontSize: 11, color: '#64748b' }}>
                {m.live?.is_sharing ? 'Location sharing on' : 'Location sharing off'}
                {typeof m.live?.heading === 'number' ? ` · Heading ${Math.round(m.live.heading)}°` : ''}
              </div>
            </button>
          )
        })}
      </div>

      <div style={{ borderRadius: 16, padding: 12, border: '1px solid rgba(15,23,42,0.08)', background: '#fff', boxShadow: '0 4px 18px rgba(15,23,42,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontWeight: 800 }}>Recent Activity</div>
          <button type="button" onClick={() => refreshNow().catch(() => {})} style={{ border: 'none', borderRadius: 10, padding: '6px 10px', background: '#f1f5f9', cursor: 'pointer', fontWeight: 700 }}>{isRefreshing ? 'Refreshing...' : 'Refresh'}</button>
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          {events.slice(0, 20).map((e) => (
            <button key={e.id} onClick={() => onOpenFullMap?.(e.member_id)} style={{ border: '1px solid rgba(15,23,42,0.06)', borderRadius: 12, padding: 10, background: 'white', cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#475569' }}>{activityIcon(e.type)}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{formatFamilyEventMessage(e)}</span>
              </div>
              <div style={{ marginTop: 4, fontSize: 11, color: '#64748b' }}>{relTime(e.created_at)}</div>
            </button>
          ))}
          {events.length === 0 && <div style={{ fontSize: 12, color: '#64748b' }}>No recent family activity yet.</div>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button type="button" onClick={() => onSendSOS().catch(() => {})} style={{ height: 44, border: 'none', borderRadius: 12, background: '#dc2626', color: 'white', fontWeight: 800, cursor: 'pointer' }}>
          Send SOS
        </button>
        <button
          type="button"
          onClick={() =>
            api
              .post('/api/family/event', { group_id: groupId, member_id: currentUserId, type: 'request_location', message: 'Location requested' })
              .catch(() => {})
          }
          style={{ height: 44, border: '1px solid rgba(15,23,42,0.15)', borderRadius: 12, background: '#fff', color: '#0f172a', fontWeight: 700, cursor: 'pointer' }}
        >
          Request Location
        </button>
      </div>

      {myRole === 'admin' && (
        <button onClick={() => setShowAdmin(true)} style={{ border: '1px solid rgba(15,23,42,0.15)', borderRadius: 12, height: 42, background: '#fff', fontWeight: 700, cursor: 'pointer' }}>
          Open Admin Controls
        </button>
      )}

      {selectedMember && (
        <>
          <div
            role="button"
            tabIndex={0}
            aria-label="Close member details"
            onClick={() => setSelectedMember(null)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setSelectedMember(null)
              }
            }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 2600 }}
          />
          <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 2601, borderRadius: '22px 22px 0 0', background: '#fff', padding: '14px 16px 20px', maxHeight: '82vh', overflow: 'auto' }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>
              {selectedMember.profiles?.full_name ?? selectedMember.profiles?.name ?? 'Member'} · {memberRoleLabel(selectedMember.role)}
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: '#64748b' }}>
              {memberSheetLiveSubtitle(selectedMember, statusFor(selectedMember).label)}
            </div>
            <div style={{ marginTop: 14, fontSize: 13, fontWeight: 700 }}>Today's Trips</div>
            <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
              {memberTrips.slice(0, 8).map((t, idx) => (
                <button key={t.id ?? idx} onClick={() => onOpenFullMap?.(selectedMember.user_id)} style={{ border: '1px solid rgba(15,23,42,0.1)', borderRadius: 10, padding: 10, textAlign: 'left', background: 'white', cursor: 'pointer' }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{t.start_location ?? 'Start'} → {t.end_location ?? 'End'}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                    {t.started_at ? new Date(t.started_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '--'} - {t.ended_at ? new Date(t.ended_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '--'} · {Math.round((Number(t.distance_meters ?? t.distance ?? 0) / 1609.34) * 10) / 10} mi
                  </div>
                </button>
              ))}
              {memberTrips.length === 0 && <div style={{ fontSize: 12, color: '#64748b' }}>No trips today.</div>}
            </div>
            <div style={{ marginTop: 14, fontSize: 13, fontWeight: 700 }}>Favorite Places</div>
            <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
              {places.slice(0, 6).map((p, idx) => (
                <div key={`${p.name}-${idx}`} style={{ border: '1px solid rgba(15,23,42,0.1)', borderRadius: 10, padding: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Geofence: {p.radius_meters ?? 200}m</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, fontSize: 13, fontWeight: 700 }}>Driving Stats (7 days)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
              <div style={{ border: '1px solid rgba(15,23,42,0.1)', borderRadius: 10, padding: 10, fontSize: 12 }}>Miles: <b>{memberStats?.total_miles ?? 0}</b></div>
              <div style={{ border: '1px solid rgba(15,23,42,0.1)', borderRadius: 10, padding: 10, fontSize: 12 }}>Trips: <b>{memberStats?.total_trips ?? 0}</b></div>
              <div style={{ border: '1px solid rgba(15,23,42,0.1)', borderRadius: 10, padding: 10, fontSize: 12 }}>Avg speed: <b>{memberStats?.average_speed_mph ?? 0} mph</b></div>
              <div style={{ border: '1px solid rgba(15,23,42,0.1)', borderRadius: 10, padding: 10, fontSize: 12 }}>Score: <b>{memberStats?.driving_score ?? 0}</b></div>
            </div>
            <div style={{ marginTop: 14, fontSize: 13, fontWeight: 700 }}>Notifications for this member</div>
            <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
              {[
                ['notify_arrival_home', `Notify on arrival at Home`],
                ['notify_departure_school', `Notify on departure from School`],
                ['notify_start_driving', `Notify when driving starts`],
                ['notify_speed_exceeded', `Notify when speed exceeds threshold`],
              ].map(([key, label]) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <input type="checkbox" checked={Boolean(notifPrefs[key])} onChange={(e) => setNotifPrefs((p) => ({ ...p, [key]: e.target.checked }))} />
                  {label}
                </label>
              ))}
              <label htmlFor="fcc-speed-threshold-member" style={{ fontSize: 12, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                <span>Speed threshold</span>
                <input
                  id="fcc-speed-threshold-member"
                  type="number"
                  value={Number(notifPrefs.speed_threshold_mph)}
                  min={40}
                  max={120}
                  onChange={(e) => setNotifPrefs((p) => ({ ...p, speed_threshold_mph: Number(e.target.value) }))}
                  style={{ width: 90 }}
                />
                <span>mph</span>
              </label>
              <button type="button" onClick={() => saveNotificationPrefs().catch(() => {})} style={{ border: 'none', borderRadius: 10, padding: '8px 10px', background: '#e0f2fe', color: '#0369a1', fontWeight: 700, cursor: 'pointer' }}>
                Save member notifications
              </button>
            </div>
          </div>
        </>
      )}

      {showAdmin && (
        <>
          <div
            role="button"
            tabIndex={0}
            aria-label="Close admin controls"
            onClick={() => setShowAdmin(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setShowAdmin(false)
              }
            }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 2600 }}
          />
          <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 2601, borderRadius: '22px 22px 0 0', background: '#fff', padding: '14px 16px 22px', maxHeight: '82vh', overflow: 'auto' }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>Admin Controls</div>
            <div style={{ marginTop: 6, fontSize: 12, color: '#64748b' }}>Invite code: <b>{inviteCode}</b></div>
            <div style={{ marginTop: 14, fontSize: 13, fontWeight: 700 }}>Group Safety Notification Policy</div>
            <div style={{ marginTop: 8, border: '1px solid rgba(15,23,42,0.1)', borderRadius: 10, padding: 10 }}>
              <div style={{ fontSize: 12, color: '#334155', marginBottom: 8 }}>
                Arrival/departure alerts are sent to all members by default, including the member who triggered the event.
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                {[
                  ['notify_arrival_home', 'Notify on arrivals'],
                  ['notify_departure_school', 'Notify on departures'],
                  ['notify_start_driving', 'Notify on driving start'],
                  ['notify_speed_exceeded', 'Notify on speed exceeded'],
                ].map(([key, label]) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <input type="checkbox" checked={Boolean(notifPrefs[key])} onChange={(e) => setNotifPrefs((p) => ({ ...p, [key]: e.target.checked }))} />
                    {label}
                  </label>
                ))}
                <label htmlFor="fcc-speed-threshold-admin" style={{ fontSize: 12, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                  <span>Teen speed threshold</span>
                  <input
                    id="fcc-speed-threshold-admin"
                    type="number"
                    value={Number(notifPrefs.speed_threshold_mph)}
                    min={40}
                    max={120}
                    onChange={(e) => setNotifPrefs((p) => ({ ...p, speed_threshold_mph: Number(e.target.value) }))}
                    style={{ width: 90 }}
                  />
                  <span>mph</span>
                </label>
                <button
                  type="button"
                  onClick={() => api.put(`/api/family/member/${currentUserId}/notifications`, notifPrefs).catch(() => {})}
                  style={{ border: 'none', borderRadius: 10, padding: '8px 10px', background: '#e0f2fe', color: '#075985', fontWeight: 700, cursor: 'pointer', marginTop: 6 }}
                >
                  Save Admin Notification Settings
                </button>
              </div>
            </div>
            <div style={{ marginTop: 14, fontSize: 13, fontWeight: 700 }}>Member Management</div>
            <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
              {members.map((m) => (
                <div key={m.user_id} style={{ border: '1px solid rgba(15,23,42,0.1)', borderRadius: 10, padding: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{m.profiles?.full_name ?? m.profiles?.name ?? 'Member'}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{m.live?.is_sharing ? 'Sharing ON' : 'Sharing OFF'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <select
                      value={m.role}
                      onChange={(e) => api.put('/api/family/settings', { user_id: m.user_id, role: e.target.value }).catch(() => {})}
                      style={{ borderRadius: 8, border: '1px solid rgba(15,23,42,0.2)', padding: '4px 8px' }}
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                      <option value="teen">Teen</option>
                    </select>
                    <button type="button" onClick={() => removeMember(m.user_id).catch(() => {})} style={{ border: 'none', borderRadius: 8, padding: '6px 8px', background: '#fee2e2', color: '#b91c1c', cursor: 'pointer', fontWeight: 700 }}>
                      Remove
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleMemberLocationSharing(m).catch(() => {})}
                      style={{ border: 'none', borderRadius: 8, padding: '6px 8px', background: m.live?.is_sharing ? '#e2e8f0' : '#dcfce7', color: '#0f172a', cursor: 'pointer', fontWeight: 700 }}
                    >
                      {m.live?.is_sharing ? 'Disable location' : 'Enable location'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 14, fontSize: 13, fontWeight: 700 }}>Group Stats</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
              <div style={{ border: '1px solid rgba(15,23,42,0.1)', borderRadius: 10, padding: 10, fontSize: 12 }}>Family miles: <b>{memberStats?.total_miles ?? 0}</b></div>
              <div style={{ border: '1px solid rgba(15,23,42,0.1)', borderRadius: 10, padding: 10, fontSize: 12 }}>Avg score: <b>{memberStats?.driving_score ?? 0}</b></div>
            </div>

            <div style={{ marginTop: 14, fontSize: 13, fontWeight: 700 }}>Place Management</div>
            <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
              {placeDrafts.map((p, idx) => (
                <div key={`${p.name}-${idx}`} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 40px', gap: 8 }}>
                  <input value={p.name} onChange={(e) => setPlaceDrafts((old) => old.map((v, i) => (i === idx ? { ...v, name: e.target.value } : v)))} style={{ borderRadius: 8, border: '1px solid rgba(15,23,42,0.2)', padding: '6px 8px' }} />
                  <input type="number" value={p.radius_meters ?? 200} onChange={(e) => setPlaceDrafts((old) => old.map((v, i) => (i === idx ? { ...v, radius_meters: Number(e.target.value) } : v)))} style={{ borderRadius: 8, border: '1px solid rgba(15,23,42,0.2)', padding: '6px 8px' }} />
                  <button onClick={() => setPlaceDrafts((old) => old.filter((_, i) => i !== idx))} style={{ border: 'none', borderRadius: 8, background: '#fee2e2', cursor: 'pointer' }}>✕</button>
                </div>
              ))}
              <button onClick={() => setPlaceDrafts((old) => [...old, { name: 'New Place', lat: 39.9612, lng: -82.9988, radius_meters: 200, alert_on: 'both' }])} style={{ border: '1px dashed rgba(15,23,42,0.3)', borderRadius: 10, background: 'white', height: 36, cursor: 'pointer' }}>
                Add Place
              </button>
              <button onClick={() => void savePlaces()} style={{ border: 'none', borderRadius: 10, padding: '8px 10px', background: '#ecfeff', color: '#155e75', fontWeight: 700, cursor: 'pointer' }}>
                Save Places
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

