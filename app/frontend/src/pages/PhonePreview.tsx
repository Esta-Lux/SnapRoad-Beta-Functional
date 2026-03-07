import { useNavigate } from 'react-router-dom'

export default function PhonePreview() {
  const navigate = useNavigate()

  const features = [
    { icon: '⬡', label: 'Earn Gems', sub: 'Every safe mile', color: '#f59e0b', side: 'left', top: '22%' },
    { icon: '◈', label: 'Safety Score', sub: 'Real-time feedback', color: '#3b82f6', side: 'left', top: '42%' },
    { icon: '⊕', label: 'Local Offers', sub: 'Redeem rewards', color: '#10b981', side: 'left', top: '62%' },
    { icon: '◉', label: 'AI Coach', sub: 'Orion guides you', color: '#8b5cf6', side: 'right', top: '28%' },
    { icon: '◈', label: 'Leaderboards', sub: 'Compete locally', color: '#ec4899', side: 'right', top: '48%' },
    { icon: '⊛', label: 'Privacy First', sub: 'Auto photo blur', color: '#14b8a6', side: 'right', top: '66%' },
  ]

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080b14',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif',
    }}>

      {/* Background grid */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.035,
        backgroundImage: `linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)`,
        backgroundSize: '48px 48px',
      }} />

      {/* Ambient glow — blue */}
      <div style={{
        position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)',
        width: 700, height: 700, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)',
        filter: 'blur(40px)', pointerEvents: 'none',
      }} />
      {/* Ambient glow — purple */}
      <div style={{
        position: 'absolute', bottom: '5%', left: '30%',
        width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
        filter: 'blur(60px)', pointerEvents: 'none',
      }} />

      {/* Top Nav */}
      <nav style={{
        position: 'relative', zIndex: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 40px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
             onClick={() => navigate('/')}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700, color: '#fff',
          }}>S</div>
          <span style={{ color: '#fff', fontSize: 18, fontWeight: 600, letterSpacing: '-0.3px' }}>SnapRoad</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/driver')}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.7)', padding: '8px 18px',
              borderRadius: 100, fontSize: 13, cursor: 'pointer',
              backdropFilter: 'blur(12px)', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; (e.target as HTMLElement).style.color = '#fff' }}
            onMouseLeave={e => { (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.7)' }}
          >
            Open Full Screen
          </button>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              border: 'none', color: '#fff', padding: '8px 20px',
              borderRadius: 100, fontSize: 13, cursor: 'pointer',
              fontWeight: 600, transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => { (e.target as HTMLElement).style.opacity = '0.85' }}
            onMouseLeave={e => { (e.target as HTMLElement).style.opacity = '1' }}
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero text */}
      <div style={{
        textAlign: 'center', padding: '12px 20px 0',
        position: 'relative', zIndex: 10,
        animation: 'fadeUp 0.6s ease both',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)',
          borderRadius: 100, padding: '5px 14px', marginBottom: 18,
        }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#3b82f6', animation: 'pulse 2s infinite' }} />
          <span style={{ color: '#93c5fd', fontSize: 12, fontWeight: 500, letterSpacing: '0.4px' }}>INTERACTIVE PREVIEW</span>
        </div>
        <h1 style={{
          color: '#fff', fontSize: 'clamp(28px, 4vw, 44px)',
          fontWeight: 700, letterSpacing: '-1px', margin: '0 0 10px',
          lineHeight: 1.15,
        }}>
          Drive smarter.<br />
          <span style={{ backgroundImage: 'linear-gradient(90deg, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Earn every mile.
          </span>
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, margin: 0 }}>
          Tap, scroll and explore — fully interactive demo below
        </p>
      </div>

      {/* Main stage */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', padding: '20px 40px 10px',
        minHeight: 0,
      }}>

        {/* Left feature badges */}
        {features.filter(f => f.side === 'left').map((f, i) => (
          <FeatureBadge key={f.label} feature={f} index={i} />
        ))}

        {/* Phone mockup */}
        <div style={{
          position: 'relative', flexShrink: 0,
          animation: 'phoneIn 0.8s cubic-bezier(0.16,1,0.3,1) both',
          animationDelay: '0.15s',
          zIndex: 10,
        }}>
          {/* Glow under phone */}
          <div style={{
            position: 'absolute', bottom: -40, left: '50%', transform: 'translateX(-50%)',
            width: 280, height: 80,
            background: 'radial-gradient(ellipse, rgba(99,102,241,0.4) 0%, transparent 70%)',
            filter: 'blur(20px)',
            borderRadius: '50%', zIndex: -1,
          }} />

          {/* Phone shell */}
          <div style={{
            width: 340,
            height: 720,
            background: 'linear-gradient(160deg, #1e2030 0%, #13151f 50%, #0e0f19 100%)',
            borderRadius: 52,
            border: '1.5px solid rgba(255,255,255,0.13)',
            boxShadow: `
              0 0 0 1px rgba(0,0,0,0.6),
              0 2px 0 1px rgba(255,255,255,0.07),
              0 50px 120px rgba(0,0,0,0.7),
              0 20px 60px rgba(0,0,0,0.5),
              inset 0 1px 0 rgba(255,255,255,0.08),
              inset 0 -1px 0 rgba(0,0,0,0.4)
            `,
            position: 'relative',
            overflow: 'hidden',
            transform: 'perspective(1200px) rotateY(0deg)',
            transition: 'transform 0.4s ease',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'perspective(1200px) rotateY(-3deg)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'perspective(1200px) rotateY(0deg)' }}
          >
            {/* Side reflection */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              background: 'linear-gradient(105deg, rgba(255,255,255,0.04) 0%, transparent 30%, transparent 70%, rgba(255,255,255,0.02) 100%)',
              borderRadius: 52, pointerEvents: 'none', zIndex: 20,
            }} />

            {/* Volume buttons (left side) */}
            {[100, 156].map((top, i) => (
              <div key={i} style={{
                position: 'absolute', left: -2.5, top,
                width: 3, height: 32,
                background: 'linear-gradient(to right, #2a2d3e, #1a1c28)',
                borderRadius: '2px 0 0 2px',
                boxShadow: '-1px 0 0 rgba(255,255,255,0.06)',
              }} />
            ))}
            {/* Power button (right side) */}
            <div style={{
              position: 'absolute', right: -2.5, top: 130,
              width: 3, height: 54,
              background: 'linear-gradient(to left, #2a2d3e, #1a1c28)',
              borderRadius: '0 2px 2px 0',
              boxShadow: '1px 0 0 rgba(255,255,255,0.06)',
            }} />

            {/* Screen bezel */}
            <div style={{
              margin: '12px 10px',
              height: 'calc(100% - 24px)',
              borderRadius: 44,
              overflow: 'hidden',
              background: '#000',
              position: 'relative',
            }}>
              {/* Dynamic Island */}
              <div style={{
                position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
                width: 110, height: 30,
                background: '#000',
                borderRadius: 20,
                zIndex: 30,
                boxShadow: '0 0 0 1px rgba(255,255,255,0.06)',
              }}>
                {/* Camera dot */}
                <div style={{
                  position: 'absolute', right: 18, top: '50%', transform: 'translateY(-50%)',
                  width: 9, height: 9, borderRadius: '50%',
                  background: '#0f1520',
                  boxShadow: '0 0 0 1.5px rgba(255,255,255,0.04), inset 0 0 0 2px #1a2030',
                }} />
              </div>

              {/* Status bar */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 54,
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)',
                zIndex: 25, pointerEvents: 'none',
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                padding: '10px 20px 0',
              }}>
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: 600 }}>9:41</span>
                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                  <StatusBars />
                  <WifiIcon />
                  <BatteryIcon />
                </div>
              </div>

              {/* Home indicator */}
              <div style={{
                position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)',
                width: 100, height: 4, borderRadius: 3,
                background: 'rgba(255,255,255,0.25)',
                zIndex: 30,
              }} />

              {/* App iframe */}
              <iframe
                src="/driver"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  display: 'block',
                  background: '#0f172a',
                }}
                title="SnapRoad Driver App Preview"
              />
            </div>
          </div>
        </div>

        {/* Right feature badges */}
        {features.filter(f => f.side === 'right').map((f, i) => (
          <FeatureBadge key={f.label} feature={f} index={i} />
        ))}
      </div>

      {/* Bottom bar */}
      <div style={{
        position: 'relative', zIndex: 10,
        borderTop: '1px solid rgba(255,255,255,0.04)',
        padding: '16px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
        animation: 'fadeUp 0.6s ease 0.4s both',
      }}>
        <div style={{ display: 'flex', gap: 28 }}>
          {[
            { label: '50K+', sub: 'Active Drivers' },
            { label: '4.9★', sub: 'App Rating' },
            { label: '$2.4M', sub: 'Saved by Users' },
          ].map(stat => (
            <div key={stat.label}>
              <div style={{ color: '#fff', fontSize: 18, fontWeight: 700, letterSpacing: '-0.5px' }}>{stat.label}</div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>{stat.sub}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => navigate('/portal/partner')}
            style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.5)', padding: '8px 16px',
              borderRadius: 8, fontSize: 12, cursor: 'pointer',
            }}
          >
            Partner Portal
          </button>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              border: 'none', color: '#fff', padding: '8px 20px',
              borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 600,
            }}
          >
            Start Driving Free →
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes phoneIn {
          from { opacity: 0; transform: perspective(1200px) rotateY(-8deg) translateY(30px); }
          to   { opacity: 1; transform: perspective(1200px) rotateY(0deg) translateY(0); }
        }
        @keyframes badgeIn {
          from { opacity: 0; transform: translateX(var(--dir)) scale(0.92); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}

/* ─── Mini Components ─────────────────────────────────────── */

function FeatureBadge({ feature, index }: { feature: any; index: number }) {
  const isLeft = feature.side === 'left'
  return (
    <div style={{
      position: 'absolute',
      [feature.side]: 'clamp(20px, 5vw, 80px)',
      top: feature.top,
      transform: 'translateY(-50%)',
      animation: `badgeIn 0.5s cubic-bezier(0.16,1,0.3,1) ${0.3 + index * 0.1}s both`,
      '--dir': isLeft ? '-20px' : '20px',
      zIndex: 5,
    } as any}>
      <div style={{
        display: 'flex', alignItems: 'center',
        gap: 10,
        flexDirection: isLeft ? 'row' : 'row-reverse',
        maxWidth: 180,
      }}>
        {/* Connector line */}
        <div style={{
          flex: 1, height: 1,
          background: `linear-gradient(${isLeft ? 'to right' : 'to left'}, transparent, rgba(255,255,255,0.12))`,
          minWidth: 24,
          display: 'none',
        }} />
        <div style={{
          background: 'rgba(15,17,30,0.85)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
          padding: '10px 14px',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
          whiteSpace: 'nowrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: `${feature.color}18`,
              border: `1px solid ${feature.color}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: feature.color, fontSize: 13,
            }}>
              {feature.icon}
            </div>
            <div>
              <div style={{ color: '#fff', fontSize: 12, fontWeight: 600, lineHeight: 1.2 }}>{feature.label}</div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>{feature.sub}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusBars() {
  return (
    <div style={{ display: 'flex', gap: 1.5, alignItems: 'flex-end', height: 10 }}>
      {[5, 7, 9, 11].map((h, i) => (
        <div key={i} style={{
          width: 3, height: h,
          background: i < 3 ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.25)',
          borderRadius: 1,
        }} />
      ))}
    </div>
  )
}

function WifiIcon() {
  return (
    <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
      <path d="M7 8.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" fill="rgba(255,255,255,0.8)" />
      <path d="M4.2 6.8a4 4 0 0 1 5.6 0" stroke="rgba(255,255,255,0.8)" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <path d="M1.8 4.5a7 7 0 0 1 10.4 0" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" strokeLinecap="round" fill="none" />
    </svg>
  )
}

function BatteryIcon() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <div style={{
        width: 22, height: 11, borderRadius: 3,
        border: '1px solid rgba(255,255,255,0.5)',
        padding: 2, position: 'relative',
      }}>
        <div style={{
          width: '75%', height: '100%',
          background: 'rgba(255,255,255,0.8)', borderRadius: 1.5,
        }} />
      </div>
      <div style={{
        width: 2, height: 5, borderRadius: '0 1px 1px 0',
        background: 'rgba(255,255,255,0.4)',
      }} />
    </div>
  )
}
