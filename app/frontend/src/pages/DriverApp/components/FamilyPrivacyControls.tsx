import { useState } from 'react'
import api from '@/services/api'

interface Props {
  isOpen: boolean
  onClose: () => void
  currentUserId: string
  isAdmin: boolean
  safetyRecord: { totalTrips: number; avgSafetyScore: number; cleanDays: number }
}

export default function FamilyPrivacyControls({
  isOpen,
  onClose,
  currentUserId,
  isAdmin,
  safetyRecord,
}: Props) {
  const [privacyWindowActive, setPrivacyWindowActive] = useState(false)
  const [windowEndsAt, setWindowEndsAt] = useState<Date | null>(null)
  const [requestingWindow, setRequestingWindow] = useState(false)
  const [windowDuration, setWindowDuration] = useState(2)

  const independenceLevel = safetyRecord.cleanDays >= 90 ? 3 : safetyRecord.cleanDays >= 30 ? 2 : safetyRecord.cleanDays >= 7 ? 1 : 0
  const independenceLabels = [
    { label: 'Standard monitoring', desc: 'Location updates every 30s. All alerts active.', color: '#8E8E93' },
    { label: 'Trusted driver', desc: 'Updates every 2 min. Non-critical alerts reduced.', color: '#FF9500' },
    { label: 'Independent driver', desc: 'Updates every 10 min. Only arrival/departure alerts.', color: '#007AFF' },
    { label: 'Full independence', desc: 'Location visible but no active tracking alerts.', color: '#30D158' },
  ]

  const requestPrivacyWindow = async () => {
    setRequestingWindow(true)
    try {
      await api.post('/api/family/privacy-window', {
        duration_hours: windowDuration,
        reason: 'Personal time',
        current_user_id: currentUserId,
      })
      const end = new Date()
      end.setHours(end.getHours() + windowDuration)
      setWindowEndsAt(end)
      setPrivacyWindowActive(true)
    } catch {
      alert('Failed to request privacy window. Ask your family admin.')
    }
    setRequestingWindow(false)
  }

  if (!isOpen) return null
  const current = independenceLabels[independenceLevel]

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 2000 }} />
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 2001, background: '#1C1C1E', borderRadius: '24px 24px 0 0', paddingBottom: 'env(safe-area-inset-bottom, 24px)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.18)', borderRadius: 2, margin: '12px auto 0' }} />
        <div style={{ padding: '16px 20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'white' }}>Privacy & Trust</div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 16, cursor: 'pointer' }}>✕</button>
          </div>

          <div style={{ background: `${current.color}15`, border: `1px solid ${current.color}30`, borderRadius: 16, padding: '16px', marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Your independence level</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: current.color, marginBottom: 4 }}>{current.label}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, marginBottom: 10 }}>{current.desc}</div>
            {independenceLevel < 3 && (
              <>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{ height: '100%', borderRadius: 2, background: current.color, width: `${(safetyRecord.cleanDays / [7, 30, 90][independenceLevel]) * 100}%` }} />
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                  {safetyRecord.cleanDays} / {[7, 30, 90][independenceLevel]} clean driving days to next level
                </div>
              </>
            )}
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 6 }}>Privacy window</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 14, lineHeight: 1.5 }}>
              Request time where your exact location shows as &quot;Private&quot;. SOS still works. Your family admin approves or denies.
            </div>

            {privacyWindowActive && windowEndsAt ? (
              <div style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>🔒</span>
                <div>
                  <div style={{ color: '#34D399', fontWeight: 700, fontSize: 14 }}>Privacy window active</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 }}>
                    Ends at {windowEndsAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Duration</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{windowDuration} hour{windowDuration !== 1 ? 's' : ''}</span>
                </div>
                <input type="range" min={1} max={4} step={1} value={windowDuration} onChange={(e) => setWindowDuration(Number(e.target.value))} style={{ width: '100%', marginBottom: 12 }} />
                <button onClick={requestPrivacyWindow} disabled={requestingWindow} style={{ width: '100%', height: 48, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  {requestingWindow ? 'Requesting...' : 'Request Privacy Window'}
                </button>
              </>
            )}
          </div>

          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 10 }}>What your family can see right now</div>
            {[
              { label: 'Your exact location', value: privacyWindowActive ? 'Hidden' : 'Visible', ok: !privacyWindowActive },
              { label: 'Your speed', value: 'Visible when driving', ok: true },
              { label: 'Your trip history', value: isAdmin ? 'You are admin' : 'Admin only', ok: false },
              { label: 'Your safety score', value: 'All family', ok: true },
              { label: 'SOS alerts', value: 'Always on', ok: true },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{item.label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: item.ok ? '#30D158' : '#FF9500', background: item.ok ? 'rgba(48,209,88,0.1)' : 'rgba(255,149,0,0.1)', borderRadius: 6, padding: '2px 8px' }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
