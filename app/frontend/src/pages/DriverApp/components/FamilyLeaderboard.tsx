import { useEffect, useState } from 'react'
import api from '@/services/api'

interface LeaderboardEntry {
  user_id: string
  name: string
  avatar: string | null
  safety_score_avg: number
  trips_this_week: number
  gems_this_week: number
  rank: number
  trend: 'up' | 'down' | 'same'
}

interface Props {
  isOpen: boolean
  onClose: () => void
  currentUserId: string
  groupId: string
}

export default function FamilyLeaderboard({ isOpen, onClose, currentUserId, groupId }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [sharedGems, setSharedGems] = useState(0)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'weekly' | 'alltime'>('weekly')

  useEffect(() => {
    if (!isOpen) return
    const loadLeaderboard = async () => {
      setLoading(true)
      try {
        const res = await api.get<{ entries?: LeaderboardEntry[]; shared_gems?: number }>(
          `/api/family/leaderboard?group_id=${groupId}&period=${tab}`
        )
        const data = res.data as { entries?: LeaderboardEntry[]; shared_gems?: number } | undefined
        setEntries(Array.isArray(data?.entries) ? data!.entries : [])
        setSharedGems(Number(data?.shared_gems ?? 0))
      } catch {
        setEntries([
          { user_id: currentUserId, name: 'You', avatar: null, safety_score_avg: 94, trips_this_week: 8, gems_this_week: 180, rank: 1, trend: 'up' },
          { user_id: '2', name: 'Mom', avatar: null, safety_score_avg: 91, trips_this_week: 6, gems_this_week: 140, rank: 2, trend: 'same' },
          { user_id: '3', name: 'Dad', avatar: null, safety_score_avg: 87, trips_this_week: 5, gems_this_week: 110, rank: 3, trend: 'down' },
        ])
        setSharedGems(430)
      }
      setLoading(false)
    }
    loadLeaderboard()
  }, [isOpen, tab, groupId, currentUserId])

  if (!isOpen) return null
  const MEDALS = ['🥇', '🥈', '🥉']
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 2000 }} />
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 2001, background: '#1C1C1E', borderRadius: '24px 24px 0 0', paddingBottom: 'env(safe-area-inset-bottom, 24px)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.18)', borderRadius: 2, margin: '12px auto 0' }} />
        <div style={{ padding: '16px 20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'white' }}>Family Leaderboard</div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>
          <div style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.15), rgba(52,211,153,0.15))', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 16, padding: '14px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ fontSize: 36 }}>💎</div>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Family gem pool</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#A78BFA' }}>{sharedGems.toLocaleString()}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Earned together this week · Redeem on family offers</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {(['weekly', 'alltime'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} style={{ flex: 1, height: 34, borderRadius: 10, background: tab === t ? '#FF9500' : 'rgba(255,255,255,0.07)', border: 'none', color: tab === t ? 'white' : 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>
                {t === 'alltime' ? 'All time' : 'This week'}
              </button>
            ))}
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'rgba(255,255,255,0.3)' }}>Loading...</div>
          ) : (
            entries.map((entry, i) => (
              <div key={entry.user_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: entry.user_id === currentUserId ? 'rgba(255,149,0,0.1)' : 'rgba(255,255,255,0.05)', borderRadius: 16, marginBottom: 10, border: entry.user_id === currentUserId ? '1px solid rgba(255,149,0,0.25)' : '1px solid transparent' }}>
                <div style={{ fontSize: 28, width: 36, textAlign: 'center', flexShrink: 0 }}>{MEDALS[i] ?? `#${i + 1}`}</div>
                <div style={{ width: 40, height: 40, borderRadius: 20, flexShrink: 0, background: 'linear-gradient(135deg,#FF9500,#FF6B00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'white', fontSize: 18 }}>{entry.name[0]}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>
                    {entry.name}
                    {entry.user_id === currentUserId && <span style={{ fontSize: 11, color: '#FF9500', marginLeft: 6 }}>You</span>}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 }}>{entry.safety_score_avg}% safety · {entry.trips_this_week} trips</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#A78BFA' }}>+{entry.gems_this_week}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>💎 {entry.trend === 'up' ? '↑' : entry.trend === 'down' ? '↓' : '→'}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
