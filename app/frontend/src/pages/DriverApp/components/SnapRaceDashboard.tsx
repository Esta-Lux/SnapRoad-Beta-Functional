import { useEffect, useMemo, useState } from 'react'
import { listFinishedRacesForUser, type Race } from '@/lib/snaprace'
import { useTheme } from '@/contexts/ThemeContext'

interface Props {
  isOpen: boolean
  onClose: () => void
  currentUserId: string
  onStartNewRace: () => void
}

export default function SnapRaceDashboard({ isOpen, onClose, currentUserId, onStartNewRace }: Props) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const [races, setRaces] = useState<Race[]>([])
  const [tab, setTab] = useState<'history' | 'leaderboard'>('history')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isOpen) return
    if (!currentUserId) {
      setRaces([])
      setLoading(false)
      return
    }
    let cancelled = false
    const run = async () => {
      setLoading(true)
      const data = await listFinishedRacesForUser(currentUserId, 20)
      if (!cancelled) setRaces(Array.isArray(data) ? data : [])
      if (!cancelled) setLoading(false)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [isOpen, currentUserId])

  const formatTime = (secs?: number) => {
    if (!secs || !Number.isFinite(secs)) return '--:--'
    const m = Math.floor(secs / 60)
    const s = Math.round(secs % 60)
    return `${m}:${String(s).padStart(2, '0')}`
  }

  const wins = useMemo(() => {
    return races.filter((r) => {
      const c = Number(r.creator_score ?? 0)
      const ch = Number(r.challenger_score ?? 0)
      if (!Number.isFinite(c) || !Number.isFinite(ch)) return false
      const winnerId = c >= ch ? r.creator_id : r.challenger_id
      return String(winnerId) === String(currentUserId)
    }).length
  }, [races, currentUserId])

  const losses = races.length - wins

  const avgScore = useMemo(() => {
    if (!races.length) return 0
    const sum = races.reduce((acc, r) => {
      const isCreator = String(r.creator_id) === String(currentUserId)
      const myScore = isCreator ? Number(r.creator_score ?? 0) : Number(r.challenger_score ?? 0)
      return acc + (Number.isFinite(myScore) ? myScore : 0)
    }, 0)
    return Math.round(sum / races.length)
  }, [races, currentUserId])

  /** Head-to-head record vs each opponent (from finished races) */
  const headToHead = useMemo(() => {
    const uid = String(currentUserId)
    const map = new Map<string, { wins: number; losses: number; races: number; avgMyScore: number; scoreSum: number }>()
    races.forEach((r) => {
      const opp = String(r.creator_id) === uid ? String(r.challenger_id) : String(r.creator_id)
      const c = Number(r.creator_score ?? 0)
      const ch = Number(r.challenger_score ?? 0)
      if (!Number.isFinite(c) || !Number.isFinite(ch)) return
      const winnerId = c >= ch ? String(r.creator_id) : String(r.challenger_id)
      const isCreator = String(r.creator_id) === uid
      const myScore = isCreator ? c : ch
      const rec = map.get(opp) ?? { wins: 0, losses: 0, races: 0, avgMyScore: 0, scoreSum: 0 }
      rec.races += 1
      rec.scoreSum += myScore
      if (winnerId === uid) rec.wins += 1
      else rec.losses += 1
      map.set(opp, rec)
    })
    return Array.from(map.entries())
      .map(([opponentId, v]) => ({
        opponentId,
        wins: v.wins,
        losses: v.losses,
        races: v.races,
        avgMyScore: v.races ? Math.round(v.scoreSum / v.races) : 0,
        winRate: v.races ? Math.round((v.wins / v.races) * 100) : 0,
      }))
      .sort((a, b) => b.wins - a.wins || b.winRate - a.winRate)
  }, [races, currentUserId])

  if (!isOpen) return null

  const sheetBg = isLight ? '#ffffff' : '#1C1C1E'
  const sheetText = isLight ? '#0f172a' : '#ffffff'
  const muted = isLight ? 'rgba(15,23,42,0.55)' : 'rgba(255,255,255,0.5)'
  const cardBg = isLight ? 'rgba(2,6,23,0.03)' : 'rgba(255,255,255,0.06)'
  const borderSubtle = isLight ? '1px solid rgba(2,6,23,0.08)' : '1px solid rgba(255,255,255,0.08)'

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: isLight ? 'rgba(15,23,42,0.35)' : 'rgba(0,0,0,0.55)',
          zIndex: 2000,
          backdropFilter: 'blur(2px)',
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
          boxShadow: isLight ? '0 -8px 40px rgba(15,23,42,0.12)' : '0 -8px 40px rgba(0,0,0,0.45)',
          borderTop: borderSubtle,
        }}
      >
        <div style={{ width: 36, height: 4, background: isLight ? 'rgba(15,23,42,0.12)' : 'rgba(255,255,255,0.18)', borderRadius: 2, margin: '12px auto 0' }} />

        <div style={{ padding: '16px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: sheetText }}>SnapRace</div>
            <button
              type="button"
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: isLight ? 'rgba(2,6,23,0.06)' : 'rgba(255,255,255,0.1)',
                border: borderSubtle,
                color: sheetText,
                fontSize: 16,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✕
            </button>
          </div>

          <p style={{ fontSize: 12, color: muted, marginTop: -8, marginBottom: 16, lineHeight: 1.45 }}>
            Race friends on the same route — fastest safe run wins gems.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Wins', value: wins, color: '#30D158' },
              { label: 'Losses', value: losses, color: '#FF3B30' },
              { label: 'Avg score', value: avgScore, color: '#FF9500' },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  background: isLight ? '#ffffff' : cardBg,
                  border: borderSubtle,
                  borderRadius: 12,
                  padding: '12px 8px',
                  textAlign: 'center',
                  boxShadow: isLight ? '0 1px 2px rgba(15,23,42,0.04)' : 'none',
                }}
              >
                <div style={{ fontSize: 26, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              onClose()
              onStartNewRace()
            }}
            style={{
              width: '100%',
              height: 52,
              background: '#FF3B30',
              border: 'none',
              borderRadius: 14,
              color: 'white',
              fontSize: 16,
              fontWeight: 700,
              cursor: 'pointer',
              marginBottom: 20,
            }}
          >
            🏁 Start New Race
          </button>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {(['history', 'leaderboard'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1,
                  height: 36,
                  borderRadius: 10,
                  background: tab === t ? '#FF3B30' : (isLight ? 'rgba(2,6,23,0.06)' : 'rgba(255,255,255,0.07)'),
                  border: 'none',
                  color: tab === t ? 'white' : muted,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'history' && (
            <div>
              {loading && (
                <div style={{ textAlign: 'center', color: muted, padding: 32 }}>
                  Loading races...
                </div>
              )}
              {!loading && races.length === 0 && (
                <div style={{ textAlign: 'center', padding: '32px 20px', color: muted, fontSize: 14 }}>
                  No races yet. Challenge a friend to your first race!
                </div>
              )}
              {races.map((race) => {
                const c = Number(race.creator_score ?? 0)
                const ch = Number(race.challenger_score ?? 0)
                const winnerId = c >= ch ? race.creator_id : race.challenger_id
                const won = String(winnerId) === String(currentUserId)
                const isCreator = String(race.creator_id) === String(currentUserId)
                const myScore = isCreator ? c : ch
                const theirScore = isCreator ? ch : c
                const myTime = isCreator ? race.creator_time_seconds : race.challenger_time_seconds

                return (
                  <div
                    key={race.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 14px',
                      background: isLight ? '#ffffff' : cardBg,
                      borderRadius: 14,
                      marginBottom: 10,
                      border: borderSubtle,
                      borderLeft: `3px solid ${won ? '#30D158' : '#FF3B30'}`,
                      boxShadow: isLight ? '0 1px 2px rgba(15,23,42,0.04)' : 'none',
                    }}
                  >
                    <div style={{ fontSize: 28 }}>{won ? '🏆' : '😅'}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: won ? '#30D158' : '#FF3B30', fontWeight: 700, fontSize: 14 }}>
                        {won ? 'Victory' : 'Defeat'}
                      </div>
                      <div style={{ color: muted, fontSize: 12, marginTop: 2 }}>
                        Score: {myScore} vs {theirScore}
                        {race.gems_wagered > 0 ? ` · ${won ? '+' : '-'}${race.gems_wagered} 💎` : ''}
                      </div>
                      <div style={{ color: isLight ? 'rgba(15,23,42,0.35)' : 'rgba(255,255,255,0.25)', fontSize: 11, marginTop: 2 }}>
                        {new Date(race.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: sheetText, fontFamily: 'monospace' }}>
                        {formatTime(myTime)}
                      </div>
                      <div style={{ fontSize: 11, color: muted }}>your time</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {tab === 'leaderboard' && (
            <div style={{ paddingBottom: 16 }}>
              {loading && (
                <div style={{ textAlign: 'center', color: muted, padding: 24 }}>Loading…</div>
              )}
              {!loading && headToHead.length === 0 && (
                <div style={{ textAlign: 'center', padding: '28px 16px', color: muted, fontSize: 14, lineHeight: 1.5 }}>
                  Finish races against friends to see your head-to-head record here.
                </div>
              )}
              {headToHead.map((row, idx) => (
                <div
                  key={row.opponentId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    background: isLight ? '#ffffff' : cardBg,
                    borderRadius: 14,
                    marginBottom: 10,
                    border: borderSubtle,
                    boxShadow: isLight ? '0 1px 2px rgba(15,23,42,0.04)' : 'none',
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: isLight ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.2)',
                      color: '#FF3B30',
                      fontWeight: 900,
                      fontSize: 15,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {idx + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: sheetText }}>Opponent</div>
                    <div style={{ fontSize: 11, color: muted, fontFamily: 'monospace', marginTop: 2 }}>
                      {row.opponentId.slice(0, 8)}…
                    </div>
                    <div style={{ fontSize: 12, color: muted, marginTop: 6 }}>
                      <span style={{ color: '#30D158', fontWeight: 700 }}>{row.wins}W</span>
                      {' · '}
                      <span style={{ color: '#FF3B30', fontWeight: 700 }}>{row.losses}L</span>
                      {' · '}
                      {row.winRate}% win rate
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: sheetText }}>{row.avgMyScore}</div>
                    <div style={{ fontSize: 10, color: muted }}>avg score</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

