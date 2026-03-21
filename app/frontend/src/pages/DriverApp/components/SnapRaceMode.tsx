import { useEffect, useRef, useState } from 'react'
import { createRace, subscribeToRace, type Race } from '@/lib/snaprace'
import type { FriendLocation } from '@/lib/friendLocation'

interface Props {
  isOpen: boolean
  onClose: () => void
  currentUserId: string
  friends: FriendLocation[]
  currentRoute?: { lat: number; lng: number }[]
  userLocation: { lat: number; lng: number }
  onStartRaceNavigation: (race: Race) => void
}

export default function SnapRaceMode({
  isOpen,
  onClose,
  currentUserId,
  friends,
  currentRoute,
  userLocation,
  onStartRaceNavigation,
}: Props) {
  const [step, setStep] = useState<'setup' | 'waiting' | 'racing' | 'finished'>('setup')
  const [selectedFriend, setSelectedFriend] = useState<FriendLocation | null>(null)
  const [gemsWager, setGemsWager] = useState(50)
  const [activeRace, setActiveRace] = useState<Race | null>(null)
  const [raceTimer, setRaceTimer] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const subRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setStep('setup')
    setSelectedFriend(null)
    setActiveRace(null)
    setRaceTimer(0)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = null
      subRef.current?.()
      subRef.current = null
    }
  }, [isOpen])

  if (!isOpen) return null

  const startRace = async () => {
    if (!selectedFriend || !currentRoute || currentRoute.length < 2) return
    const race = await createRace(
      currentUserId,
      selectedFriend.id,
      currentRoute,
      userLocation,
      currentRoute[currentRoute.length - 1],
      gemsWager
    )
    setActiveRace(race)
    setStep('waiting')

    subRef.current?.()
    subRef.current = subscribeToRace(race.id, (updated) => {
      setActiveRace(updated)
      if (updated.status === 'active') {
        setStep('racing')
        if (timerRef.current) clearInterval(timerRef.current)
        timerRef.current = setInterval(() => setRaceTimer((t) => t + 1), 1000)
        onStartRaceNavigation(updated)
      }
      if (updated.status === 'finished') {
        if (timerRef.current) clearInterval(timerRef.current)
        timerRef.current = null
        setStep('finished')
      }
    })
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const sharingFriends = friends.filter((f) => f.isSharing)

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 2000 }} />
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 2001,
          background: '#1C1C1E',
          borderRadius: '24px 24px 0 0',
          paddingBottom: 'env(safe-area-inset-bottom,24px)',
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.18)', borderRadius: 2, margin: '12px auto 0' }} />

        {step === 'setup' && (
          <div style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'white', marginBottom: 4 }}>SnapRace</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 20 }}>
              Race friends on the same route. Winner scores highest on safety + efficiency — not raw speed.
            </div>

            <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Challenge a friend
            </div>
            {sharingFriends.map((friend) => (
              <div
                key={friend.id}
                onClick={() => setSelectedFriend(friend)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px',
                  background: selectedFriend?.id === friend.id ? 'rgba(255,59,48,0.15)' : 'rgba(255,255,255,0.06)',
                  borderRadius: 12,
                  marginBottom: 8,
                  cursor: 'pointer',
                  border: `1.5px solid ${selectedFriend?.id === friend.id ? '#FF3B30' : 'transparent'}`,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    background: 'linear-gradient(135deg,#FF3B30,#FF6B30)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    color: 'white',
                    fontSize: 16,
                  }}
                >
                  {friend.name?.[0] ?? 'F'}
                </div>
                <div>
                  <div style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>{friend.name}</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{friend.isNavigating ? 'Currently driving' : 'Online'}</div>
                </div>
              </div>
            ))}

            <div style={{ marginTop: 16, marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Gems wager: {gemsWager}</div>
              <input type="range" min={0} max={500} step={25} value={gemsWager} onChange={(e) => setGemsWager(Number(e.target.value))} style={{ width: '100%' }} />
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>Winner takes all. 0 gems = friendly race.</div>
            </div>

            <button
              onClick={startRace}
              disabled={!selectedFriend || !currentRoute}
              style={{
                width: '100%',
                height: 50,
                marginTop: 16,
                background: selectedFriend && currentRoute ? '#FF3B30' : 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: 14,
                color: 'white',
                fontSize: 16,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Send Race Challenge
            </button>
          </div>
        )}

        {step === 'waiting' && (
          <div style={{ padding: '32px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
            <div style={{ color: 'white', fontSize: 18, fontWeight: 700 }}>Waiting for {selectedFriend?.name}...</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 8 }}>They need to accept the challenge</div>
          </div>
        )}

        {step === 'racing' && (
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Your time</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#FF3B30', fontFamily: 'monospace' }}>{formatTime(raceTimer)}</div>
              </div>
              <div style={{ width: 40, height: 40, borderRadius: 20, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                VS
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{selectedFriend?.name}</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
                  {activeRace?.challenger_time_seconds ? formatTime(activeRace.challenger_time_seconds) : '--:--'}
                </div>
              </div>
            </div>
            <div style={{ background: 'rgba(255,59,48,0.1)', border: '1px solid rgba(255,59,48,0.3)', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
              Score = safety + fuel efficiency. Driving fast but unsafely loses points.
            </div>
          </div>
        )}

        {step === 'finished' && activeRace && (
          <div style={{ padding: '24px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>{(activeRace.creator_score ?? 0) >= (activeRace.challenger_score ?? 0) ? '🏆' : '😅'}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'white', marginBottom: 8 }}>
              {(activeRace.creator_score ?? 0) >= (activeRace.challenger_score ?? 0) ? 'You won!' : `${selectedFriend?.name} won`}
            </div>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'white' }}>{activeRace.creator_score ?? '--'}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Your score</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'white' }}>{activeRace.challenger_score ?? '--'}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Their score</div>
              </div>
            </div>
            <button onClick={onClose} style={{ width: '100%', height: 48, marginTop: 24, background: '#007AFF', border: 'none', borderRadius: 14, color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
              Done
            </button>
          </div>
        )}
      </div>
    </>
  )
}

