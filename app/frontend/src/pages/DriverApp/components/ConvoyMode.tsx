import { useEffect, useRef, useState } from 'react'
import { startConvoy, endConvoy, subscribeToConvoy, type Convoy } from '@/lib/convoy'
import type { FriendLocation } from '@/lib/friendLocation'

interface Props {
  isOpen: boolean
  onClose: () => void
  currentUserId: string
  familyMembers: FriendLocation[]
  onConvoyStarted: (destination: { lat: number; lng: number; name: string }) => void
  groupId: string
}

export default function ConvoyMode({
  isOpen,
  onClose,
  currentUserId,
  familyMembers,
  onConvoyStarted,
  groupId,
}: Props) {
  const [step, setStep] = useState<'setup' | 'active' | 'following'>('setup')
  const [destination, setDestination] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [activeConvoy, setActiveConvoy] = useState<Convoy | null>(null)
  const convoyCleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    return () => {
      convoyCleanupRef.current?.()
      convoyCleanupRef.current = null
    }
  }, [])

  if (!isOpen) return null

  const launchConvoy = async () => {
    const dest = { lat: 39.9612, lng: -82.9988, name: destination || 'Family destination' }
    try {
      const convoy = await startConvoy(currentUserId, groupId, dest, selectedMembers)
      setActiveConvoy(convoy)
      setStep('active')
      onConvoyStarted(dest)
      convoyCleanupRef.current?.()
      convoyCleanupRef.current = subscribeToConvoy(convoy.id, (updated) => setActiveConvoy(updated))
    } catch {
      // Keep flow stable in mock/dev environments.
      setActiveConvoy({
        id: `mock-${Date.now()}`,
        leader_id: currentUserId,
        group_id: groupId,
        destination: dest,
        member_ids: selectedMembers,
        status: 'active',
        created_at: new Date().toISOString(),
      })
      setStep('active')
      onConvoyStarted(dest)
    }
  }

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]))
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 2000 }} />
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 2001,
          background: '#1C1C1E',
          borderRadius: '24px 24px 0 0',
          paddingBottom: 'env(safe-area-inset-bottom, 24px)',
          maxHeight: '85vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.18)', borderRadius: 2, margin: '12px auto 0' }} />
        <div style={{ padding: '16px 20px 24px' }}>
          {step === 'setup' && (
            <>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'white', marginBottom: 4 }}>Convoy Mode</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 20 }}>
                Lead your family to the same destination. Everyone follows your route automatically.
              </div>

              <input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Where are you all going?"
                style={{
                  width: '100%',
                  height: 48,
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 12,
                  padding: '0 16px',
                  color: 'white',
                  fontSize: 15,
                  fontFamily: 'inherit',
                  marginBottom: 16,
                  outline: 'none',
                }}
              />

              <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Who&apos;s joining the convoy?
              </div>

              {familyMembers.map((member) => (
                <div
                  key={member.id}
                  onClick={() => toggleMember(member.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 12,
                    marginBottom: 8,
                    background: selectedMembers.includes(member.id) ? 'rgba(255,149,0,0.15)' : 'rgba(255,255,255,0.06)',
                    border: `1.5px solid ${selectedMembers.includes(member.id) ? '#FF9500' : 'transparent'}`,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 18, background: 'linear-gradient(135deg,#FF9500,#FF6B00)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 16 }}>
                    {member.name[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>{member.name}</div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                      {member.isNavigating ? 'Currently driving' : 'Online'}
                    </div>
                  </div>
                  <div style={{ width: 22, height: 22, borderRadius: 11, background: selectedMembers.includes(member.id) ? '#FF9500' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 13 }}>
                    {selectedMembers.includes(member.id) ? '✓' : ''}
                  </div>
                </div>
              ))}

              <button
                onClick={launchConvoy}
                disabled={selectedMembers.length === 0 || !destination}
                style={{
                  width: '100%',
                  height: 52,
                  marginTop: 16,
                  background: selectedMembers.length > 0 && destination ? '#FF9500' : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: 14,
                  color: 'white',
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Start Convoy ({selectedMembers.length} follower{selectedMembers.length !== 1 ? 's' : ''})
              </button>
            </>
          )}

          {step === 'active' && (
            <>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'white', marginBottom: 4 }}>Convoy Active</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 20 }}>
                You&apos;re the leader. Family members are following your route.
              </div>
              <div style={{ background: 'rgba(255,149,0,0.1)', border: '1px solid rgba(255,149,0,0.25)', borderRadius: 14, padding: '14px 16px', marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Destination</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>{activeConvoy?.destination?.name ?? destination}</div>
              </div>
              {familyMembers.filter((m) => selectedMembers.includes(m.id)).map((member) => (
                <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(255,255,255,0.06)', borderRadius: 12, marginBottom: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 16, background: 'linear-gradient(135deg,#FF9500,#FF6B00)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700 }}>
                    {member.name[0]}
                  </div>
                  <div style={{ flex: 1, color: 'white', fontSize: 14, fontWeight: 600 }}>{member.name}</div>
                  <div style={{ fontSize: 11, color: '#30D158', background: 'rgba(48,209,88,0.1)', borderRadius: 6, padding: '2px 8px' }}>
                    Following
                  </div>
                </div>
              ))}
              <button
                onClick={async () => {
                  if (activeConvoy) {
                    try {
                      await endConvoy(activeConvoy.id)
                    } catch {
                      // ignore in mock/dev
                    }
                  }
                  convoyCleanupRef.current?.()
                  convoyCleanupRef.current = null
                  setStep('setup')
                  onClose()
                }}
                style={{ width: '100%', height: 50, marginTop: 16, background: '#FF3B30', border: 'none', borderRadius: 14, color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}
              >
                End Convoy
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}
