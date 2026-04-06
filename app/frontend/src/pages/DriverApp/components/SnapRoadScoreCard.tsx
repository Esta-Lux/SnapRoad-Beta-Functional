import { useMemo } from 'react'

interface UserData {
  avg_safety_score?: number
  current_streak?: number
  total_miles?: number
  total_gems_earned?: number
  hazards_reported?: number
  total_trips?: number
  best_safety_score?: number
}

interface Props {
  isOpen: boolean
  onClose: () => void
  userData: UserData
}

export default function SnapRoadScoreCard({ isOpen, onClose, userData }: Props) {
  const breakdown = useMemo(() => {
    const safety = Math.min(300, (userData.avg_safety_score ?? 0) * 3)
    const streak = Math.min(200, (userData.current_streak ?? 0) * 5)
    const miles = Math.min(200, (userData.total_miles ?? 0) * 0.1)
    const gems = Math.min(200, (userData.total_gems_earned ?? 0) * 0.02)
    const reports = Math.min(100, (userData.hazards_reported ?? 0) * 5)
    const total = Math.round(safety + streak + miles + gems + reports)

    return {
      total,
      categories: [
        {
          label: 'Safety score',
          value: Math.round(safety),
          max: 300,
          current: userData.avg_safety_score ?? 0,
          unit: 'avg',
          color: '#30D158',
          icon: '🛡️',
          tip: `${Math.round(userData.avg_safety_score ?? 0)}/100 avg safety. Drive smoother to improve.`,
        },
        {
          label: 'Streak bonus',
          value: Math.round(streak),
          max: 200,
          current: userData.current_streak ?? 0,
          unit: 'day streak',
          color: '#FF9500',
          icon: '🔥',
          tip: `${userData.current_streak ?? 0} day streak. Don't break it!`,
        },
        {
          label: 'Miles driven',
          value: Math.round(miles),
          max: 200,
          current: Math.round(userData.total_miles ?? 0),
          unit: 'miles',
          color: '#007AFF',
          icon: '🛣️',
          tip: `${Math.round(userData.total_miles ?? 0)} total miles. Keep exploring Ohio.`,
        },
        {
          label: 'Gems earned',
          value: Math.round(gems),
          max: 200,
          current: userData.total_gems_earned ?? 0,
          unit: 'gems',
          color: '#A78BFA',
          icon: '💎',
          tip: `${userData.total_gems_earned ?? 0} total gems earned. Redeem offers to earn more.`,
        },
        {
          label: 'Road reports',
          value: Math.round(reports),
          max: 100,
          current: userData.hazards_reported ?? 0,
          unit: 'reports',
          color: '#FF6B00',
          icon: '📍',
          tip: `${userData.hazards_reported ?? 0} hazards reported. Help keep Ohio roads safe.`,
        },
      ],
    }
  }, [userData])

  const getTier = (score: number) => {
    if (score >= 900) return { name: 'Legend', color: '#FFD700', icon: '👑' }
    if (score >= 700) return { name: 'Elite', color: '#A78BFA', icon: '🌟' }
    if (score >= 500) return { name: 'Pro', color: '#007AFF', icon: '⭐' }
    if (score >= 300) return { name: 'Driver', color: '#30D158', icon: '🚗' }
    return { name: 'Rookie', color: '#8E8E93', icon: '🎯' }
  }

  const tier = getTier(breakdown.total)

  if (!isOpen) return null

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

        <div
          style={{
            padding: '24px 20px 20px',
            background: 'linear-gradient(180deg, rgba(0,122,255,0.1) 0%, transparent 100%)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
            Your SnapRoad Score
          </div>
          <div style={{ fontSize: 80, fontWeight: 900, color: '#007AFF', lineHeight: 1 }}>
            {breakdown.total}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
            out of 1,000
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: `${tier.color}22`,
              border: `1px solid ${tier.color}44`,
              borderRadius: 20,
              padding: '6px 16px',
              marginTop: 12,
            }}
          >
            <span style={{ fontSize: 16 }}>{tier.icon}</span>
            <span style={{ color: tier.color, fontWeight: 700, fontSize: 14 }}>{tier.name}</span>
          </div>
          <div
            style={{
              height: 6,
              background: 'rgba(255,255,255,0.08)',
              borderRadius: 3,
              marginTop: 16,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${(breakdown.total / 1000) * 100}%`,
                background: 'linear-gradient(90deg, #007AFF, #A78BFA)',
                borderRadius: 3,
                transition: 'width 1s ease',
              }}
            />
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>
            {Math.max(0, 1000 - breakdown.total)} points to perfect score
          </div>
        </div>

        <div style={{ padding: '0 20px 24px' }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.4)',
              marginBottom: 14,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            Score breakdown
          </div>

          {breakdown.categories.map((cat) => (
            <div
              key={cat.label}
              style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 14,
                padding: '14px 16px',
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20 }}>{cat.icon}</span>
                  <div>
                    <div style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>{cat.label}</div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
                      {cat.current} {cat.unit}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 20, fontWeight: 800, color: cat.color }}>{cat.value}</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>/ {cat.max}</span>
                </div>
              </div>
              <div
                style={{
                  height: 4,
                  background: 'rgba(255,255,255,0.08)',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${(cat.value / cat.max) * 100}%`,
                    background: cat.color,
                    borderRadius: 2,
                  }}
                />
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>{cat.tip}</div>
            </div>
          ))}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
            <div
              style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 12,
                padding: '12px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 800, color: 'white' }}>{userData.total_trips ?? 0}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>total trips</div>
            </div>
            <div
              style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 12,
                padding: '12px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 800, color: '#30D158' }}>
                {userData.best_safety_score ?? 0}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                best safety score
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: '100%',
              height: 50,
              marginTop: 20,
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
        </div>
      </div>
    </>
  )
}
