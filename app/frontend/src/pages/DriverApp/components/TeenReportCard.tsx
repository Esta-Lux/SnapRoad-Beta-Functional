import { useEffect, useState } from 'react'
import api from '@/services/api'

interface TripReport {
  id: string
  safety_score: number
  max_speed_mph: number
  hard_braking_count: number
  distance_miles: number
  duration_minutes: number
  created_at: string
  ai_feedback: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  memberId: string
  memberName: string
  isAdmin: boolean
}

export default function TeenReportCard({ isOpen, onClose, memberId, memberName, isAdmin }: Props) {
  const [trips, setTrips] = useState<TripReport[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isOpen) return
    const loadTrips = async () => {
      setLoading(true)
      try {
        const res = await api.get<{ trips?: TripReport[] }>(`/api/family/trips?member_id=${memberId}&limit=10`)
        const list = (res.data as { trips?: TripReport[] } | undefined)?.trips
        setTrips(Array.isArray(list) ? list : [])
      } catch {
        setTrips([])
      }
      setLoading(false)
    }
    loadTrips()
  }, [isOpen, memberId])

  const avgSafety = trips.length > 0 ? Math.round(trips.reduce((s, t) => s + (t.safety_score ?? 0), 0) / trips.length) : 0
  const getGrade = (score: number) => {
    if (score >= 90) return { grade: 'A', color: '#30D158' }
    if (score >= 80) return { grade: 'B', color: '#007AFF' }
    if (score >= 70) return { grade: 'C', color: '#FF9500' }
    if (score >= 60) return { grade: 'D', color: '#FF6B00' }
    return { grade: 'F', color: '#FF3B30' }
  }
  const { grade, color } = getGrade(avgSafety)
  if (!isOpen) return null

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 2000 }} />
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 2001, background: '#1C1C1E', borderRadius: '24px 24px 0 0', paddingBottom: 'env(safe-area-inset-bottom, 24px)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.18)', borderRadius: 2, margin: '12px auto 0' }} />
        <div style={{ padding: '16px 20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'white' }}>{memberName}&apos;s Report Card</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Last {trips.length} trips</div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>

          <div style={{ background: `${color}15`, border: `1px solid ${color}30`, borderRadius: 20, padding: '24px', textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 80, fontWeight: 900, color, lineHeight: 1 }}>{grade}</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>Overall driving grade</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: 'white', marginTop: 8 }}>{avgSafety}/100</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Trips', value: trips.length, color: '#007AFF' },
              { label: 'Hard brakes', value: trips.reduce((s, t) => s + (t.hard_braking_count ?? 0), 0), color: '#FF3B30' },
              { label: 'Miles', value: Math.round(trips.reduce((s, t) => s + (t.distance_miles ?? 0), 0)), color: '#30D158' },
            ].map((stat) => (
              <div key={stat.label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '12px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Recent trips</div>
          {loading && <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center', padding: 20 }}>Loading...</div>}
          {!isAdmin && <div style={{ color: '#FF9500', fontSize: 12, marginBottom: 10 }}>Admin view only.</div>}
          {trips.map((trip) => {
            const { grade: g, color: c } = getGrade(trip.safety_score)
            return (
              <div key={trip.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.05)', borderRadius: 12, marginBottom: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${c}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: c }}>{g}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>
                    {trip.safety_score}/100 safety
                    {trip.hard_braking_count > 0 && <span style={{ color: '#FF9500', fontSize: 11, marginLeft: 8 }}>{trip.hard_braking_count} hard brakes</span>}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 2 }}>
                    {Math.round(trip.distance_miles ?? 0)} mi · {new Date(trip.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{Math.round(trip.max_speed_mph ?? 0)} mph max</div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
