import { useMemo, useState } from 'react'
import api from '@/services/api'

interface Offer {
  id: number
  business_name: string
  description?: string
  discount_percent?: number
  gems_reward?: number
  logo_url?: string
  lat?: number
  lng?: number
}

interface Props {
  offer: Offer | null
  onClose: () => void
  onRedeemed: (gemsEarned: number) => void
}

function unwrap<T>(res: { success?: boolean; data?: { data?: T } & Record<string, unknown> }): T | undefined {
  return res.data?.data !== undefined ? (res.data.data as T) : (res.data as unknown as T)
}

export default function OfferRedemptionCard({ offer, onClose, onRedeemed }: Props) {
  const [step, setStep] = useState<'detail' | 'qr' | 'success'>('detail')
  const [loading, setLoading] = useState(false)
  const [qrValue, setQrValue] = useState('')
  const [discountApplied, setDiscountApplied] = useState<number | null>(null)
  const [gemsEarned, setGemsEarned] = useState<number | null>(null)

  const effectiveDiscount = useMemo(() => {
    if (discountApplied != null) return discountApplied
    if (typeof offer?.discount_percent === 'number') return offer.discount_percent
    return null
  }, [discountApplied, offer?.discount_percent])

  if (!offer) return null

  const generateQR = async () => {
    setLoading(true)
    try {
      const res = await api.post<{ discount_percent?: number; gems_earned?: number }>(`/api/offers/${offer.id}/redeem`)
      const data = unwrap<{ discount_percent?: number; gems_earned?: number }>(res)
      setQrValue(`snaproad:redeem:${offer.id}:${Date.now()}`)
      if (typeof data?.discount_percent === 'number') setDiscountApplied(data.discount_percent)
      if (typeof data?.gems_earned === 'number') setGemsEarned(data.gems_earned)
      setStep('qr')

      const earned = typeof data?.gems_earned === 'number' ? data.gems_earned : 0
      window.setTimeout(() => {
        setStep('success')
        if (earned > 0) onRedeemed(earned)
      }, 2200)
    } catch {
      alert('Failed to generate redemption code')
    } finally {
      setLoading(false)
    }
  }

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
          background: '#1C1C1E',
          borderRadius: '24px 24px 0 0',
          paddingBottom: 'env(safe-area-inset-bottom, 24px)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.18)', borderRadius: 2, margin: '12px auto 0' }} />

        {step === 'detail' && (
          <div style={{ padding: '16px 20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, #c89048, #a06820)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 28,
                  flexShrink: 0,
                  overflow: 'hidden',
                }}
              >
                {offer.logo_url ? (
                  <img src={offer.logo_url} style={{ width: 60, height: 60, borderRadius: 16, objectFit: 'cover' }} />
                ) : (
                  '🏪'
                )}
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'white' }}>{offer.business_name}</div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{offer.description ?? ''}</div>
              </div>
            </div>

            <div
              style={{
                background: 'linear-gradient(135deg, rgba(200,144,72,0.2), rgba(200,144,72,0.1))',
                border: '1px solid rgba(200,144,72,0.4)',
                borderRadius: 16,
                padding: '20px',
                textAlign: 'center',
                marginBottom: 20,
              }}
            >
              <div style={{ fontSize: 52, fontWeight: 900, color: '#c89048' }}>{effectiveDiscount != null ? `${effectiveDiscount}% OFF` : 'Offer'}</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>Show QR code at counter to redeem</div>
            </div>

            {(offer.gems_reward ?? 0) > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: 'rgba(52,211,153,0.1)',
                  border: '1px solid rgba(52,211,153,0.2)',
                  borderRadius: 12,
                  padding: '10px 14px',
                  marginBottom: 20,
                }}
              >
                <span style={{ fontSize: 20 }}>💎</span>
                <div style={{ color: '#34D399', fontSize: 14, fontWeight: 600 }}>Earn +{offer.gems_reward} gems when you redeem this offer</div>
              </div>
            )}

            <button
              onClick={generateQR}
              disabled={loading}
              style={{
                width: '100%',
                height: 54,
                background: '#c89048',
                border: 'none',
                borderRadius: 14,
                color: 'white',
                fontSize: 17,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {loading ? 'Generating...' : 'Get QR Code'}
            </button>

            <button
              onClick={onClose}
              style={{
                width: '100%',
                height: 44,
                marginTop: 10,
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.4)',
                fontSize: 15,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        )}

        {step === 'qr' && (
          <div style={{ padding: '24px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'white', marginBottom: 6 }}>Show this to the cashier</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>Valid for this visit only</div>

            <div
              style={{
                width: 200,
                height: 200,
                margin: '0 auto 24px',
                background: 'white',
                borderRadius: 16,
                padding: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                color: '#333',
                fontFamily: 'monospace',
                wordBreak: 'break-all',
                textAlign: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: 40, marginBottom: 8 }}>▓▓▓▓▓</div>
                <div style={{ fontSize: 9, color: '#666' }}>{qrValue.slice(-24)}</div>
              </div>
            </div>

            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Confirming redemption...</div>
          </div>
        )}

        {step === 'success' && (
          <div style={{ padding: '32px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'white', marginBottom: 8 }}>Offer Redeemed!</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 24 }}>
              {effectiveDiscount != null ? `${effectiveDiscount}% off` : 'Discount'} applied at {offer.business_name}
            </div>
            {(gemsEarned ?? 0) > 0 && (
              <div style={{ background: 'rgba(52,211,153,0.15)', borderRadius: 14, padding: '14px', marginBottom: 24 }}>
                <div style={{ fontSize: 32, fontWeight: 900, color: '#34D399' }}>+{gemsEarned} 💎</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>added to your gems</div>
              </div>
            )}
            <button
              onClick={onClose}
              style={{
                width: '100%',
                height: 50,
                background: '#34D399',
                border: 'none',
                borderRadius: 14,
                color: 'white',
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

