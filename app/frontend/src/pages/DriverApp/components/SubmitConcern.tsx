import { useState } from 'react'
import { api } from '@/services/api'

interface Props {
  isOpen: boolean
  onClose: () => void
  userId: string
  userLocation?: { lat: number; lng: number }
}

const CONCERN_CATEGORIES = [
  { id: 'bug', label: 'App Bug', icon: '🐛', color: '#FF3B30' },
  { id: 'navigation', label: 'Wrong Route', icon: '🗺️', color: '#FF9500' },
  { id: 'offer', label: 'Offer Issue', icon: '🎁', color: '#34C759' },
  { id: 'safety', label: 'Safety Concern', icon: '🛡️', color: '#007AFF' },
  { id: 'performance', label: 'App is Slow', icon: '⚡', color: '#FF9500' },
  { id: 'account', label: 'Account Issue', icon: '👤', color: '#7C3AED' },
  { id: 'feature', label: 'Feature Request', icon: '💡', color: '#34C759' },
  { id: 'other', label: 'Other', icon: '💬', color: '#8E8E93' },
]

export default function SubmitConcern({
  isOpen,
  onClose,
  userId,
  userLocation,
}: Props) {
  const [step, setStep] = useState<'category' | 'detail' | 'success'>('category')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (!description.trim()) return
    setIsSubmitting(true)
    try {
      const context = {
        userAgent: navigator.userAgent,
        screenSize: `${window.screen.width}x${window.screen.height}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        location: userLocation,
        connectionType: (navigator as any).connection?.effectiveType ?? 'unknown',
        memoryUsage: (performance as any).memory?.usedJSHeapSize ?? 0,
        appVersion: import.meta.env.VITE_APP_VERSION ?? '1.0.0',
        platform: navigator.platform,
      }

      const res = await api.post('/api/concerns/submit', {
        user_id: userId,
        category: selectedCategory,
        title,
        description,
        severity,
        context,
        status: 'open',
      })

      if (res.success) setStep('success')
      else alert('Failed to submit. Please try again.')
    } catch {
      alert('Failed to submit. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const reset = () => {
    setStep('category')
    setSelectedCategory('')
    setTitle('')
    setDescription('')
    setSeverity('medium')
    onClose()
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 2000,
          backdropFilter: 'blur(4px)',
        }}
      />
      <div style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        zIndex: 2001,
        background: 'white',
        borderRadius: '24px 24px 0 0',
        paddingBottom: 'env(safe-area-inset-bottom, 24px)',
        maxHeight: '85vh',
        overflowY: 'auto',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
      }}>
        <div style={{
          width: 36, height: 4,
          background: '#E0E0E0',
          borderRadius: 2,
          margin: '12px auto 0',
        }} />

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
        }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>
            {step === 'success'
              ? '✅ Submitted!'
              : 'Report a Concern'}
          </div>
          <button
            onClick={reset}
            style={{
              width: 30, height: 30,
              borderRadius: 15,
              background: '#f5f5f7',
              border: 'none',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >✕</button>
        </div>

        {step === 'category' && (
          <div style={{ padding: '0 16px 20px' }}>
            <div style={{
              fontSize: 14,
              color: '#666',
              marginBottom: 14,
            }}>
              What type of issue are you experiencing?
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
            }}>
              {CONCERN_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id)
                    setStep('detail')
                  }}
                  style={{
                    padding: '14px 12px',
                    borderRadius: 14,
                    border: '1.5px solid #f0f0f0',
                    background: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    textAlign: 'left',
                  }}
                >
                  <span style={{
                    fontSize: 22,
                    width: 32, height: 32,
                    borderRadius: 8,
                    background: `${cat.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {cat.icon}
                  </span>
                  <span style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#1a1a1a',
                  }}>
                    {cat.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'detail' && (
          <div style={{ padding: '0 16px 20px' }}>
            <button
              onClick={() => setStep('category')}
              style={{
                background: 'none',
                border: 'none',
                color: '#007AFF',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                padding: '0 0 12px',
              }}
            >
              ← Back
            </button>

            <div style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#333',
              marginBottom: 8,
            }}>
              How severe is this?
            </div>
            <div style={{
              display: 'flex',
              gap: 8,
              marginBottom: 16,
            }}>
              {(['low', 'medium', 'high', 'critical'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setSeverity(s)}
                  style={{
                    flex: 1,
                    padding: '8px 4px',
                    borderRadius: 10,
                    border: '1.5px solid',
                    borderColor: severity === s
                      ? s === 'critical' ? '#FF3B30'
                        : s === 'high' ? '#FF9500'
                        : s === 'medium' ? '#007AFF'
                        : '#34C759'
                      : '#e0e0e0',
                    background: severity === s
                      ? s === 'critical' ? '#FF3B3015'
                        : s === 'high' ? '#FF950015'
                        : s === 'medium' ? '#007AFF15'
                        : '#34C75915'
                      : 'white',
                    fontSize: 11,
                    fontWeight: 700,
                    color: severity === s
                      ? s === 'critical' ? '#FF3B30'
                        : s === 'high' ? '#FF9500'
                        : s === 'medium' ? '#007AFF'
                        : '#34C759'
                      : '#999',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>

            <div style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#333',
              marginBottom: 6,
            }}>
              Brief title
            </div>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. App crashed during navigation"
              style={{
                width: '100%',
                height: 44,
                borderRadius: 12,
                border: '1.5px solid #e0e0e0',
                padding: '0 14px',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: 14,
              }}
            />

            <div style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#333',
              marginBottom: 6,
            }}>
              Description
            </div>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Tell us exactly what happened. The more detail the better..."
              style={{
                width: '100%',
                height: 120,
                borderRadius: 12,
                border: '1.5px solid #e0e0e0',
                padding: '12px 14px',
                fontSize: 14,
                outline: 'none',
                resize: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                marginBottom: 14,
              }}
            />

            <div style={{
              padding: '10px 12px',
              background: '#f5f5f7',
              borderRadius: 10,
              fontSize: 11,
              color: '#999',
              marginBottom: 16,
            }}>
              📱 We automatically attach: device info,
              app version, location, and timestamp
              to help us fix this faster.
            </div>

            <button
              onClick={handleSubmit}
              disabled={!description.trim() || isSubmitting}
              style={{
                width: '100%',
                height: 52,
                background: description.trim()
                  ? 'linear-gradient(135deg, #007AFF, #0055CC)'
                  : '#e0e0e0',
                color: 'white',
                border: 'none',
                borderRadius: 14,
                fontSize: 16,
                fontWeight: 700,
                cursor: description.trim()
                  ? 'pointer'
                  : 'not-allowed',
              }}
            >
              {isSubmitting
                ? 'Submitting...'
                : 'Submit Report'}
            </button>
          </div>
        )}

        {step === 'success' && (
          <div style={{
            padding: '20px 16px 32px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>
              ✅
            </div>
            <div style={{
              fontSize: 20,
              fontWeight: 800,
              marginBottom: 8,
            }}>
              Report Received!
            </div>
            <div style={{
              fontSize: 14,
              color: '#666',
              lineHeight: 1.5,
              marginBottom: 24,
            }}>
              Thanks for helping improve SnapRoad.
              Our team will review your report and
              follow up if needed.
            </div>
            <button
              onClick={reset}
              style={{
                width: '100%',
                height: 52,
                background: '#007AFF',
                color: 'white',
                border: 'none',
                borderRadius: 14,
                fontSize: 16,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </>
  )
}
