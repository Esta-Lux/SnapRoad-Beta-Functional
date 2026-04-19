import { useEffect, useState } from 'react'
import { api } from '@/services/api'

interface InsightData {
  summary: string
  fuel_saved: number
  incidents_avoided: number
  best_day: string
  safety_trend: 'improving' | 'declining' | 'steady'
  gems_earned_week: number
  miles_this_week: number
  trips_this_week: number
  ai_tip: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  userId: string
}

const fallbackInsights: InsightData = {
  summary: 'Great week on the road! Your safety score improved by 8 points compared to last week.',
  fuel_saved: 2.4,
  incidents_avoided: 3,
  best_day: 'Tuesday',
  safety_trend: 'improving',
  gems_earned_week: 240,
  miles_this_week: 87,
  trips_this_week: 12,
  ai_tip:
    'You tend to brake hard near the I-270 interchange on your morning commute. Try leaving 2 minutes earlier to reduce speed variance.',
}

export default function WeeklyInsights({ isOpen, onClose, userId }: Props) {
  const [insights, setInsights] = useState<InsightData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isOpen) return
    const loadInsights = async () => {
      setLoading(true)
      try {
        const res = await api.get<InsightData>('/api/trips/weekly-insights')
        const data = (res.data as InsightData | undefined) ?? fallbackInsights
        setInsights(data)
      } catch {
        setInsights(fallbackInsights)
      } finally {
        setLoading(false)
      }
    }
    loadInsights()
  }, [isOpen, userId])

  if (!isOpen) return null

  const trendColor =
    insights?.safety_trend === 'improving'
      ? '#30D158'
      : insights?.safety_trend === 'declining'
        ? '#FF3B30'
        : '#FF9500'
  const trendIcon =
    insights?.safety_trend === 'improving'
      ? '📈'
      : insights?.safety_trend === 'declining'
        ? '📉'
        : '➡️'

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
        <div
          style={{
            width: 36,
            height: 4,
            background: 'rgba(255,255,255,0.18)',
            borderRadius: 2,
            margin: '12px auto 0',
          }}
        />

        <div style={{ padding: '16px 20px 24px' }}>
          <div
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}
          >
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'white' }}>Weekly Recap</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                Your driving summary powered by Orion
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontSize: 16,
              }}
            >
              ✕
            </button>
          </div>

          {loading && (
            <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.3)' }}>
              Orion is analyzing your week...
            </div>
          )}

          {!loading && insights && (
            <>
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(0,122,255,0.15))',
                  border: '1px solid rgba(124,58,237,0.25)',
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 20,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: 'rgba(124,58,237,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                    }}
                  >
                    🤖
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#A78BFA' }}>ORION WEEKLY SUMMARY</span>
                </div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>
                  {insights.summary}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                {[
                  { label: 'Trips', value: insights.trips_this_week, icon: '🚗', color: '#007AFF' },
                  { label: 'Miles', value: insights.miles_this_week, icon: '🛣️', color: '#30D158' },
                  { label: 'Gems earned', value: insights.gems_earned_week, icon: '💎', color: '#A78BFA' },
                  {
                    label: 'Fuel saved (gal)',
                    value: insights.fuel_saved.toFixed(1),
                    icon: '⛽',
                    color: '#FF9500',
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: 14,
                      padding: '14px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: 24, marginBottom: 4 }}>{stat.icon}</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: `${trendColor}15`,
                  border: `1px solid ${trendColor}30`,
                  borderRadius: 14,
                  padding: '14px 16px',
                  marginBottom: 16,
                }}
              >
                <span style={{ fontSize: 28 }}>{trendIcon}</span>
                <div>
                  <div style={{ color: trendColor, fontWeight: 700, fontSize: 14 }}>
                    Safety {insights.safety_trend}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 }}>
                    Best driving day: {insights.best_day} · {insights.incidents_avoided} incidents avoided
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(255,149,0,0.08)',
                  border: '1px solid rgba(255,149,0,0.2)',
                  borderRadius: 14,
                  padding: '14px 16px',
                  marginBottom: 20,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: '#FF9500', marginBottom: 6 }}>
                  💡 ORION TIP FOR NEXT WEEK
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
                  {insights.ai_tip}
                </div>
              </div>

              <button
                onClick={onClose}
                style={{
                  width: '100%',
                  height: 50,
                  background: 'rgba(255,255,255,0.08)',
                  border: 'none',
                  borderRadius: 14,
                  color: 'white',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}
