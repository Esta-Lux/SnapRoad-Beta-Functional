import { useState, useEffect, useRef } from 'react'
import type { OHGOCamera } from '@/lib/ohgo'

interface Props {
  camera: OHGOCamera
  onClose: () => void
}

export default function OHGOCameraPopup({ camera, onClose }: Props) {
  const [viewIndex, setViewIndex] = useState(0)
  const [imgTimestamp, setImgTimestamp] = useState(Date.now())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [thumbErrors, setThumbErrors] = useState<Set<number>>(new Set())
  const [fullscreen, setFullscreen] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  const view = camera.cameraViews?.[viewIndex]
  const hasValidView = view && (view.largeUrl || view.smallUrl)

  // Reset error when switching view or when we force refresh
  useEffect(() => {
    setImgError(false)
  }, [viewIndex, imgTimestamp])

  const handleManualRefresh = () => {
    setImgError(false)
    setThumbErrors(new Set())
    setIsRefreshing(true)
    setImgTimestamp(Date.now())
    setTimeout(() => setIsRefreshing(false), 500)
  }

  // Auto-refresh every 5 seconds (force new request so feed doesn't appear stuck)
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setImgError(false)
      setThumbErrors(new Set())
      setIsRefreshing(true)
      setImgTimestamp(Date.now())
      setTimeout(() => setIsRefreshing(false), 500)
    }, 5000)
    return () => clearInterval(intervalRef.current)
  }, [])

  const imageUrl = hasValidView
    ? `${view!.largeUrl || view!.smallUrl}?t=${imgTimestamp}`
    : null

  return (
    <>
      {/* Backdrop */}
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

      {/* Main popup */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 2001,
        background: '#1C1C1E',
        borderRadius: fullscreen ? 0 : '24px 24px 0 0',
        paddingBottom: 'env(safe-area-inset-bottom, 24px)',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
        maxHeight: fullscreen ? '100vh' : '75vh',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
      }}>

        {/* Handle */}
        {!fullscreen && (
          <div style={{
            width: 36, height: 4,
            background: 'rgba(255,255,255,0.2)',
            borderRadius: 2,
            margin: '12px auto 0',
          }} />
        )}

        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px 8px',
        }}>
          <div>
            <div style={{
              fontSize: 16,
              fontWeight: 700,
              color: 'white',
            }}>
              {camera.mainRoute || 'Traffic Camera'}
            </div>
            <div style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.5)',
              marginTop: 2,
            }}>
              {camera.location}
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            {/* Live indicator */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              background: 'rgba(52,199,89,0.2)',
              borderRadius: 8,
              padding: '4px 8px',
            }}>
              <div style={{
                width: 6, height: 6,
                borderRadius: 3,
                background: '#34C759',
                animation: 'sr-pulse-green 1.5s infinite',
              }} />
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#34C759',
              }}>
                LIVE
              </span>
            </div>

            {/* Fullscreen toggle */}
            <button
              type="button"
              onClick={() => setFullscreen(v => !v)}
              style={{
                width: 32, height: 32,
                borderRadius: 8,
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: 'white',
                fontSize: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {fullscreen ? '⊡' : '⊞'}
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              style={{
                width: 32, height: 32,
                borderRadius: 8,
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: 'white',
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
        </div>

        {/* Camera feed */}
        <div style={{
          position: 'relative',
          background: '#000',
          margin: '0 0',
        }}>
          {imageUrl && !imgError ? (
            <img
              key={imageUrl}
              src={imageUrl}
              alt={camera.location}
              style={{
                width: '100%',
                height: fullscreen ? '50vh' : 220,
                objectFit: 'cover',
                display: 'block',
                opacity: isRefreshing ? 0.85 : 1,
                transition: 'opacity 0.3s ease',
              }}
              onError={() => setImgError(true)}
              onLoad={() => setImgError(false)}
            />
          ) : (
            <div style={{
              width: '100%',
              height: fullscreen ? '50vh' : 220,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.3)',
              fontSize: 14,
              flexDirection: 'column',
              gap: 8,
            }}>
              <span style={{ fontSize: 32 }}>📷</span>
              <span>{imgError ? 'Feed failed to load — tap refresh below' : 'Feed unavailable'}</span>
            </div>
          )}

          {/* Refresh indicator */}
          {isRefreshing && (
            <div style={{
              position: 'absolute',
              top: 8, right: 8,
              background: 'rgba(0,0,0,0.6)',
              borderRadius: 6,
              padding: '3px 8px',
              fontSize: 10,
              color: 'rgba(255,255,255,0.7)',
            }}>
              Refreshing...
            </div>
          )}

          {/* Direction badge */}
          {view?.direction && (
            <div style={{
              position: 'absolute',
              bottom: 8, left: 8,
              background: 'rgba(0,0,0,0.7)',
              borderRadius: 8,
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: 600,
              color: 'white',
              backdropFilter: 'blur(4px)',
            }}>
              {view.direction}
            </div>
          )}

          {/* Timestamp */}
          <div style={{
            position: 'absolute',
            bottom: 8, right: 8,
            background: 'rgba(0,0,0,0.7)',
            borderRadius: 8,
            padding: '4px 10px',
            fontSize: 11,
            color: 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(4px)',
          }}>
            {new Date().toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              second: '2-digit',
              hour12: true,
            })}
          </div>
        </div>

        {/* Camera angle switcher */}
        {camera.cameraViews?.length > 1 && (
          <div style={{
            display: 'flex',
            gap: 8,
            padding: '10px 16px',
            overflowX: 'auto',
            scrollbarWidth: 'none',
          }}>
            {camera.cameraViews.map((v, i) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setViewIndex(i)}
                style={{
                  flexShrink: 0,
                  padding: '6px 14px',
                  borderRadius: 10,
                  border: '1.5px solid',
                  borderColor: i === viewIndex
                    ? '#007AFF'
                    : 'rgba(255,255,255,0.15)',
                  background: i === viewIndex
                    ? 'rgba(0,122,255,0.2)'
                    : 'transparent',
                  color: i === viewIndex
                    ? '#007AFF'
                    : 'rgba(255,255,255,0.5)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {v.direction || `View ${i + 1}`}
              </button>
            ))}
          </div>
        )}

        {/* Multi-view grid if multiple angles */}
        {camera.cameraViews?.length > 1 && (
          <div style={{ padding: '0 16px 8px' }}>
            <div style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.4)',
              marginBottom: 8,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}>
              All Views
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 6,
            }}>
              {camera.cameraViews.map((v, i) => {
                const thumbUrl = v.smallUrl || v.largeUrl
                const thumbFailed = thumbErrors.has(i)
                return (
                  <div
                    key={v.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => { setViewIndex(i); setImgError(false) }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setViewIndex(i) }}
                    style={{
                      borderRadius: 10,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: '2px solid',
                      borderColor: i === viewIndex
                        ? '#007AFF'
                        : 'transparent',
                      position: 'relative',
                      background: '#111',
                    }}
                  >
                    {thumbUrl && !thumbFailed ? (
                      <img
                        key={`${v.id}-${imgTimestamp}`}
                        src={`${thumbUrl}?t=${imgTimestamp}`}
                        alt={v.direction}
                        style={{
                          width: '100%',
                          height: 80,
                          objectFit: 'cover',
                          display: 'block',
                        }}
                        onError={() => setThumbErrors((prev) => new Set(prev).add(i))}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: 80,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'rgba(255,255,255,0.3)',
                        fontSize: 12,
                      }}>
                        No image
                      </div>
                    )}
                    {v.direction && (
                      <div style={{
                        position: 'absolute',
                        bottom: 4, left: 4,
                        background: 'rgba(0,0,0,0.7)',
                        borderRadius: 4,
                        padding: '2px 6px',
                        fontSize: 9,
                        color: 'white',
                        fontWeight: 600,
                      }}>
                        {v.direction}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{
          padding: '8px 16px 4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}>
          <span style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.3)',
          }}>
            Source: ODOT OHGO • Updates every 5s
          </span>
          <button
            type="button"
            onClick={handleManualRefresh}
            style={{
              padding: '4px 10px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.8)',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Refresh feed
          </button>
          <span style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.3)',
          }}>
            Ohio only
          </span>
        </div>
      </div>

      <style>{`
        @keyframes sr-pulse-green {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </>
  )
}
