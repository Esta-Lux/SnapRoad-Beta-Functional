import { useState } from 'react'
import api from '@/services/api'
import type { FriendLocation } from '@/lib/friendLocation'

interface Props {
  isOpen: boolean
  onClose: () => void
  familyMembers: FriendLocation[]
  currentUserId: string
}

const PRESETS = [
  { id: 'on_way', label: 'On my way', icon: '🚗', color: '#007AFF' },
  { id: 'running_late', label: 'Running late', icon: '⏰', color: '#FF9500' },
  { id: 'arrived_safe', label: 'Arrived safe', icon: '✅', color: '#30D158' },
  { id: 'pick_me_up', label: 'Pick me up', icon: '📍', color: '#FF3B30' },
  { id: 'need_help', label: 'Need help', icon: '🆘', color: '#FF3B30' },
  { id: 'heading_home', label: 'Heading home', icon: '🏠', color: '#5856D6' },
]

export default function FamilyCheckIn({ isOpen, onClose, familyMembers, currentUserId }: Props) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([])
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  if (!isOpen) return null

  const sendCheckIn = async () => {
    if (!selectedPreset || selectedRecipients.length === 0) return
    setSending(true)
    try {
      await api.post('/api/family/checkin', {
        preset_id: selectedPreset,
        recipient_ids: selectedRecipients,
        current_user_id: currentUserId,
      })
      setSent(true)
      setTimeout(() => {
        setSent(false)
        setSelectedPreset(null)
        setSelectedRecipients([])
        onClose()
      }, 2000)
    } catch {}
    setSending(false)
  }
  const toggleRecipient = (id: string) => {
    setSelectedRecipients((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]))
  }
  const preset = PRESETS.find((p) => p.id === selectedPreset)

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 2000 }} />
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 2001, background: '#1C1C1E', borderRadius: '24px 24px 0 0', paddingBottom: 'env(safe-area-inset-bottom, 24px)' }}>
        <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.18)', borderRadius: 2, margin: '12px auto 0' }} />
        <div style={{ padding: '16px 20px 24px' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'white', marginBottom: 4 }}>Check-in</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 20 }}>Safe one-tap messages. No typing while driving.</div>

          {sent ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>Message sent!</div>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
                {PRESETS.map((p) => (
                  <button key={p.id} onClick={() => setSelectedPreset(p.id)} style={{ height: 56, borderRadius: 14, background: selectedPreset === p.id ? `${p.color}25` : 'rgba(255,255,255,0.06)', border: `1.5px solid ${selectedPreset === p.id ? p.color : 'transparent'}`, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14, fontWeight: 600 }}>
                    <span style={{ fontSize: 20 }}>{p.icon}</span>{p.label}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Send to</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                <button onClick={() => setSelectedRecipients(selectedRecipients.length === familyMembers.length ? [] : familyMembers.map((m) => m.id))} style={{ padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', background: selectedRecipients.length === familyMembers.length ? '#FF9500' : 'rgba(255,255,255,0.08)', color: 'white', fontSize: 13, fontWeight: 600 }}>
                  Everyone
                </button>
                {familyMembers.map((member) => (
                  <button key={member.id} onClick={() => toggleRecipient(member.id)} style={{ padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', background: selectedRecipients.includes(member.id) ? '#FF9500' : 'rgba(255,255,255,0.08)', color: 'white', fontSize: 13, fontWeight: 600 }}>
                    {member.name.split(' ')[0]}
                  </button>
                ))}
              </div>
              <button onClick={sendCheckIn} disabled={!selectedPreset || selectedRecipients.length === 0 || sending} style={{ width: '100%', height: 52, background: selectedPreset && selectedRecipients.length > 0 ? preset?.color ?? '#007AFF' : 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 14, color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
                {sending ? 'Sending...' : `Send "${preset?.label ?? 'Message'}"`}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}
