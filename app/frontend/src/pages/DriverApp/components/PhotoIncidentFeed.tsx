import { useEffect, useMemo, useState } from 'react'
import { api } from '@/services/api'

export interface PhotoReport {
  id: string
  lat: number
  lng: number
  photo_url: string
  category: string
  ai_category: string
  description: string
  upvotes: number
  expires_at: string
  created_at: string
  user_id: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  userLocation: { lat: number; lng: number }
  onNavigateToReport: (report: PhotoReport) => void
}

const CATEGORY_ICONS: Record<string, string> = {
  crash: '💥',
  construction: '🚧',
  pothole: '🕳️',
  flooding: '🌊',
  police: '🚔',
  debris: '⚠️',
  weather: '🌧️',
  closure: '🚫',
  hazard: '⚠️',
}

const CATEGORY_COLORS: Record<string, string> = {
  crash: '#FF3B30',
  construction: '#FF9500',
  pothole: '#8B7355',
  flooding: '#007AFF',
  police: '#5856D6',
  debris: '#FF6B00',
  weather: '#34AADC',
  closure: '#FF3B30',
  hazard: '#FF9500',
}

function formatCategory(report: PhotoReport): string {
  return (report.category || report.ai_category || 'hazard').toLowerCase()
}

export default function PhotoIncidentFeed({
  isOpen,
  onClose,
  userLocation,
  onNavigateToReport,
}: Props) {
  const [reports, setReports] = useState<PhotoReport[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState<PhotoReport | null>(null)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    if (!isOpen) return
    const loadReports = async () => {
      setLoading(true)
      try {
        const res = await api.get<{ photos?: PhotoReport[] }>(
          `/api/photo-reports/nearby?lat=${userLocation.lat}&lng=${userLocation.lng}&radius=10`
        )
        const photos = (res.data as { photos?: PhotoReport[] } | undefined)?.photos
        setReports(Array.isArray(photos) ? photos : [])
      } catch {
        setReports([])
      } finally {
        setLoading(false)
      }
    }
    loadReports()
  }, [isOpen, userLocation.lat, userLocation.lng])

  const upvoteReport = async (reportId: string) => {
    try {
      await api.post(`/api/photo-reports/${reportId}/upvote`)
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, upvotes: (r.upvotes ?? 0) + 1 } : r))
      )
    } catch {
      // Keep UI stable even when upvote call fails.
    }
  }

  const getTimeAgo = (dateStr: string) => {
    const ts = new Date(dateStr).getTime()
    if (!Number.isFinite(ts)) return 'just now'
    const diff = Date.now() - ts
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${Math.max(0, mins)}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  const getExpiresIn = (dateStr: string) => {
    const ts = new Date(dateStr).getTime()
    if (!Number.isFinite(ts)) return 'active'
    const diff = ts - Date.now()
    if (diff <= 0) return 'expiring'
    const hrs = Math.floor(diff / 3600000)
    const mins = Math.floor((diff % 3600000) / 60000)
    if (hrs > 0) return `${hrs}h ${mins}m left`
    return `${Math.max(0, mins)}m left`
  }

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(reports.map((r) => formatCategory(r))))],
    [reports]
  )

  const filtered = filter === 'all' ? reports : reports.filter((r) => formatCategory(r) === filter)

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
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            width: 36,
            height: 4,
            background: 'rgba(255,255,255,0.18)',
            borderRadius: 2,
            margin: '12px auto 0',
            flexShrink: 0,
          }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px 0',
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'white' }}>Road Reports</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              {reports.length} active reports within 10 miles
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

        <div
          style={{
            display: 'flex',
            gap: 8,
            padding: '12px 20px',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            flexShrink: 0,
          }}
        >
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={{
                flexShrink: 0,
                padding: '6px 14px',
                borderRadius: 20,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                background: filter === cat ? '#FF3B30' : 'rgba(255,255,255,0.08)',
                color: filter === cat ? 'white' : 'rgba(255,255,255,0.5)',
                whiteSpace: 'nowrap',
              }}
            >
              {cat === 'all' ? 'All' : `${CATEGORY_ICONS[cat] ?? '⚠️'} ${cat}`}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.3)' }}>
              Loading reports...
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
              <div style={{ color: 'white', fontWeight: 700, fontSize: 16, marginBottom: 6 }}>
                Roads look clear!
              </div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
                No reports in your area. Be the first to report an issue.
              </div>
            </div>
          )}

          {filtered.map((report) => {
            const cat = formatCategory(report)
            const color = CATEGORY_COLORS[cat] ?? '#FF9500'
            const icon = CATEGORY_ICONS[cat] ?? '⚠️'

            return (
              <div
                key={report.id}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 16,
                  marginBottom: 12,
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {report.photo_url && (
                  <div style={{ position: 'relative' }}>
                    <img
                      src={report.photo_url}
                      style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }}
                      onClick={() => setSelectedReport(report)}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: 10,
                        left: 10,
                        background: color,
                        borderRadius: 8,
                        padding: '4px 10px',
                        fontSize: 12,
                        fontWeight: 700,
                        color: 'white',
                      }}
                    >
                      {icon} {cat.toUpperCase()}
                    </div>
                    <div
                      style={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        background: 'rgba(0,0,0,0.6)',
                        borderRadius: 8,
                        padding: '4px 8px',
                        fontSize: 11,
                        color: 'rgba(255,255,255,0.7)',
                      }}
                    >
                      {getExpiresIn(report.expires_at)}
                    </div>
                  </div>
                )}

                <div style={{ padding: '12px 14px' }}>
                  <div style={{ fontSize: 14, color: 'white', fontWeight: 600, marginBottom: 4 }}>
                    {report.description || `${cat} reported`}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>
                    {getTimeAgo(report.created_at)}
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => upvoteReport(report.id)}
                      style={{
                        flex: 1,
                        height: 36,
                        borderRadius: 10,
                        background: 'rgba(255,255,255,0.08)',
                        border: 'none',
                        color: 'white',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      👍 Still there ({report.upvotes ?? 0})
                    </button>
                    <button
                      onClick={() => {
                        onNavigateToReport(report)
                        onClose()
                      }}
                      style={{
                        flex: 1,
                        height: 36,
                        borderRadius: 10,
                        background: color,
                        border: 'none',
                        color: 'white',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Navigate Around
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {selectedReport && (
        <div
          onClick={() => setSelectedReport(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.95)',
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={selectedReport.photo_url}
            style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 12 }}
          />
          <button
            onClick={() => setSelectedReport(null)}
            style={{
              position: 'fixed',
              top: 60,
              right: 20,
              width: 36,
              height: 36,
              borderRadius: 18,
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              color: 'white',
              fontSize: 18,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>
      )}
    </>
  )
}
