// Public Terms / Privacy page. Fetches the latest published doc by `slug`
// from /api/legal/documents/by-slug/:slug and renders the admin-authored HTML
// after sanitising it. Admins can edit and republish from the Legal &
// Compliance tab in the admin portal — changes here are immediate.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Loader2 } from 'lucide-react'
import { getApiBaseUrl } from '@/services/api'
import { sanitizeHtml } from '@/lib/sanitizeHtml'

interface LegalDocResponse {
  id: string
  slug?: string | null
  name: string
  type?: string
  description?: string
  version?: string
  content?: string
  content_text?: string
  last_updated?: string
}

interface LegalDocumentPageProps {
  slug: 'terms-of-service' | 'privacy-policy'
  /** Heading shown while we fetch — keeps page from flashing empty. */
  fallbackTitle: string
}

export default function LegalDocumentPage({ slug, fallbackTitle }: LegalDocumentPageProps) {
  const [doc, setDoc] = useState<LegalDocResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/legal/documents/by-slug/${slug}`, {
          credentials: 'omit',
        })
        if (res.status === 404) {
          if (!cancelled) {
            setDoc(null)
            setError(
              'This document has not been published yet. Ask an admin to publish it from the Legal & Compliance tab in the admin portal.',
            )
          }
          return
        }
        if (!res.ok) {
          throw new Error(`Server returned ${res.status}`)
        }
        const payload = (await res.json()) as { success?: boolean; data?: LegalDocResponse }
        if (cancelled) return
        if (payload?.success && payload.data) {
          setDoc(payload.data)
        } else {
          setError('Could not load this document.')
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not load this document.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [slug])

  // CSS that scopes admin-authored doc styling to the rendered content area
  // so it can't bleed into the surrounding page chrome (header, footer).
  const containerStyle: React.CSSProperties = {
    maxWidth: 760,
    margin: '0 auto',
    padding: '32px 20px 80px',
    color: '#0B1220',
    background: '#fff',
    minHeight: '100vh',
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    lineHeight: 1.7,
  }

  if (loading) {
    return (
      <div style={containerStyle}>
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="animate-spin" size={20} />
          <span>Loading {fallbackTitle.toLowerCase()}…</span>
        </div>
      </div>
    )
  }

  if (error || !doc) {
    return (
      <div style={containerStyle}>
        <Link
          to="/welcome"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mb-6"
        >
          <ArrowLeft size={14} /> Back
        </Link>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>{fallbackTitle}</h1>
        <p style={{ color: '#666', marginTop: 12 }}>
          {error || 'No content has been published for this document yet.'}
        </p>
      </div>
    )
  }

  const safeHtml = sanitizeHtml(doc.content || '')
  const updated = doc.last_updated
    ? new Date(doc.last_updated).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  return (
    <div style={containerStyle}>
      <div className="flex items-center justify-between mb-4">
        <Link
          to="/welcome"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
        >
          <ArrowLeft size={14} /> Back
        </Link>
        <a
          href={`${getApiBaseUrl()}/api/legal/documents/by-slug/${slug}`}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
          title="Raw JSON"
        >
          API <ExternalLink size={11} />
        </a>
      </div>

      {/* The sanitiser strips <style>, so we drop the inline CSS embedded in
          the seed file and use our own scoped overrides here for table /
          warning styling. Anything else in the doc renders with its inline
          attributes. */}
      <style>{`
        .snaproad-legal h1 { font-size: 32px; margin-bottom: 8px; }
        .snaproad-legal h2 {
          font-size: 20px; margin-top: 36px; margin-bottom: 12px;
          color: #111; border-bottom: 1px solid #eee; padding-bottom: 8px;
        }
        .snaproad-legal h3 { font-size: 16px; margin-top: 24px; margin-bottom: 8px; color: #333; }
        .snaproad-legal p { margin: 10px 0; }
        .snaproad-legal ul, .snaproad-legal ol { margin: 10px 0; padding-left: 24px; }
        .snaproad-legal li { margin: 6px 0; }
        .snaproad-legal a { color: #0066cc; }
        .snaproad-legal strong { color: #111; }
        .snaproad-legal .updated { color: #666; font-size: 14px; margin-bottom: 40px; }
        .snaproad-legal .warning {
          background: #fff8e1; border-left: 4px solid #ffc107;
          padding: 16px; margin: 16px 0; border-radius: 4px;
        }
        .snaproad-legal .warning strong { color: #e65100; }
        .snaproad-legal .highlight {
          background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 16px 0;
        }
        .snaproad-legal .contact-box {
          background: #111; color: #fff; padding: 24px; border-radius: 12px; margin-top: 40px;
        }
        .snaproad-legal .contact-box a { color: #7ec8e3; }
        .snaproad-legal .contact-box strong { color: #fff; }
        .snaproad-legal table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
        .snaproad-legal th, .snaproad-legal td {
          padding: 10px 12px; text-align: left; border-bottom: 1px solid #eee;
        }
        .snaproad-legal th { background: #f8f9fa; font-weight: 600; }
      `}</style>

      <article
        className="snaproad-legal"
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />

      {updated ? (
        <p style={{ color: '#999', fontSize: 12, marginTop: 48 }}>
          Document last updated {updated} (v{doc.version || '1.0'})
        </p>
      ) : null}
    </div>
  )
}
