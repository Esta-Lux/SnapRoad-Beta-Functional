import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { SUPPORT_EMAIL } from '@/lib/launchFlags'
import { sanitizeHtml } from '@/lib/sanitizeHtml'
import { getApiBaseUrl } from '@/services/api'

type LegalDoc = {
  id: string
  slug?: string
  name: string
  type?: string
  version?: string
  description?: string
  content?: string
  updated_at?: string
  last_updated?: string
}

type LegalPageKey = 'privacy' | 'terms' | 'community'

const DEFAULT_COMMUNITY_GUIDELINES_HTML = `
  <h1>Community Guidelines</h1>
  <p class="updated">Last Updated: May 11, 2026</p>
  <p>SnapRoad is built to help drivers share useful, trustworthy road information. Use these guidelines to keep reports clear, respectful, and safe for everyone.</p>
  <div class="highlight">
    <strong>Quick Summary:</strong> Keep reports accurate, respect other people, avoid unsafe behavior, and never use SnapRoad for harassment, fraud, or misleading alerts.
  </div>
  <h2>1. Share only useful, truthful road information</h2>
  <ul>
    <li>Report incidents, hazards, and traffic conditions only when you reasonably believe they are real and current.</li>
    <li>Do not spam duplicate reports or post prank, deceptive, or manipulated alerts.</li>
    <li>Only upload photos or notes that relate directly to the road event you are reporting.</li>
  </ul>
  <h2>2. Put driver safety first</h2>
  <ul>
    <li>Never interact with SnapRoad in a way that distracts you from driving safely.</li>
    <li>Follow traffic laws and local regulations at all times.</li>
    <li>Do not use SnapRoad to support reckless driving, evasion, or dangerous conduct.</li>
  </ul>
  <h2>3. Respect privacy and other people</h2>
  <ul>
    <li>Do not harass, threaten, impersonate, or shame other users or businesses.</li>
    <li>Do not share private information, including addresses, phone numbers, or identifying details, without permission.</li>
    <li>Keep usernames, feedback, and shared content appropriate for a general audience.</li>
  </ul>
  <h2>4. What is not allowed</h2>
  <ul>
    <li>Fake incidents, fraud, scams, or attempts to game offers, rewards, or ranking systems.</li>
    <li>Hate speech, violent threats, graphic content, sexual content, or abusive language.</li>
    <li>Malware, scraping, reverse engineering, or attempts to disrupt the service.</li>
  </ul>
  <h2>5. Enforcement</h2>
  <p>SnapRoad may remove content, limit community features, suspend accounts, or terminate access when these guidelines or our Terms are violated.</p>
  <div class="contact-box">
    <strong>Need help or want to report abuse?</strong>
    <p>Email: <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
  </div>
`

const PAGE_META: Record<LegalPageKey, { slug: string; title: string; description: string; fallbackHtml?: string }> = {
  privacy: {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    description: 'How SnapRoad collects, uses, and protects your data across the driver app and partner experiences.',
  },
  terms: {
    slug: 'terms-of-service',
    title: 'Terms of Service',
    description: 'The rules and responsibilities for using SnapRoad products and services.',
  },
  community: {
    slug: 'community-guidelines',
    title: 'Community Guidelines',
    description: 'Standards for safe reports, respectful conduct, and acceptable use of community features.',
    fallbackHtml: DEFAULT_COMMUNITY_GUIDELINES_HTML,
  },
}

export default function PublicLegalPage({ docKey }: { docKey: LegalPageKey }) {
  const [loading, setLoading] = useState(true)
  const [doc, setDoc] = useState<LegalDoc | null>(null)
  const [error, setError] = useState<string | null>(null)
  const meta = PAGE_META[docKey]

  useEffect(() => {
    let cancelled = false
    const baseUrl = getApiBaseUrl()

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const docRes = await fetch(`${baseUrl}/api/legal/documents/by-slug/${meta.slug}`, {
          credentials: 'omit',
        })
        if (docRes.status === 404) {
          if (!cancelled) setDoc(null)
          return
        }
        if (!docRes.ok) throw new Error(`Failed to load ${meta.title.toLowerCase()}`)
        const docPayload = await docRes.json()
        const fullDoc = (docPayload?.data ?? null) as LegalDoc | null
        if (!cancelled) setDoc(fullDoc)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load this document right now.')
          setDoc(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [docKey, meta.title])

  const updatedAt = useMemo(() => {
    const raw = doc?.last_updated || doc?.updated_at
    if (!raw) return ''
    const date = new Date(raw)
    if (Number.isNaN(date.getTime())) return ''
    return date.toLocaleDateString()
  }, [doc?.last_updated, doc?.updated_at])

  const renderedHtml = useMemo(
    () => sanitizeHtml(doc?.content || meta.fallbackHtml || ''),
    [doc?.content, meta.fallbackHtml],
  )

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-6 py-10">
        <div className="mb-8 flex flex-wrap items-center gap-3 text-sm">
          <Link to="/driver/auth" className="rounded-full border border-white/10 px-4 py-2 text-slate-200 hover:bg-white/5">
            Driver app
          </Link>
          <Link to="/portal/partner/welcome" className="rounded-full border border-white/10 px-4 py-2 text-slate-200 hover:bg-white/5">
            Partner portal
          </Link>
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`SnapRoad ${meta.title}`)}`}
            className="rounded-full border border-white/10 px-4 py-2 text-slate-200 hover:bg-white/5"
          >
            Contact support
          </a>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-2xl shadow-black/30">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-blue-300">SnapRoad legal</p>
          <h1 className="text-3xl font-bold tracking-tight" data-testid={`legal-page-${docKey}`}>
            {doc?.name || meta.title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{doc?.description || meta.description}</p>
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400">
            {doc?.version ? <span className="rounded-full bg-white/5 px-3 py-1">Version {doc.version}</span> : null}
            {updatedAt ? <span className="rounded-full bg-white/5 px-3 py-1">Updated {updatedAt}</span> : null}
            {!doc && meta.fallbackHtml ? (
              <span className="rounded-full bg-blue-500/10 px-3 py-1 text-blue-200">Default launch copy</span>
            ) : null}
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-slate-950/60 p-6">
            {loading ? (
              <p className="text-sm text-slate-300">Loading published document…</p>
            ) : error ? (
              <div className="space-y-3">
                <p className="text-sm text-rose-300">{error}</p>
                <p className="text-sm text-slate-300">
                  Try again later, or contact <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
                </p>
              </div>
            ) : renderedHtml ? (
              <>
                <style>{`
                  .snaproad-legal h1 { font-size: 1.875rem; font-weight: 700; margin-bottom: 0.5rem; color: #f8fafc; }
                  .snaproad-legal h2 {
                    font-size: 1.125rem; font-weight: 700; margin-top: 2rem; margin-bottom: 0.75rem;
                    color: #f8fafc; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem;
                  }
                  .snaproad-legal h3 { font-size: 1rem; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.5rem; color: #e2e8f0; }
                  .snaproad-legal p { margin: 0.75rem 0; color: #e2e8f0; line-height: 1.75; }
                  .snaproad-legal ul, .snaproad-legal ol { margin: 0.75rem 0; padding-left: 1.5rem; color: #e2e8f0; }
                  .snaproad-legal li { margin: 0.5rem 0; }
                  .snaproad-legal a { color: #7dd3fc; text-decoration: underline; }
                  .snaproad-legal strong { color: #f8fafc; }
                  .snaproad-legal .updated { color: #94a3b8; font-size: 0.875rem; margin-bottom: 2rem; }
                  .snaproad-legal .warning {
                    background: rgba(245, 158, 11, 0.12); border-left: 4px solid #f59e0b;
                    padding: 1rem; margin: 1rem 0; border-radius: 0.5rem; color: #fde68a;
                  }
                  .snaproad-legal .warning strong { color: #fef3c7; }
                  .snaproad-legal .highlight {
                    background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 0.75rem; margin: 1rem 0;
                  }
                  .snaproad-legal .contact-box {
                    background: rgba(15, 23, 42, 0.95); color: #f8fafc; padding: 1.5rem;
                    border-radius: 1rem; margin-top: 2rem; border: 1px solid rgba(255,255,255,0.08);
                  }
                  .snaproad-legal .contact-box a { color: #93c5fd; }
                  .snaproad-legal .contact-box strong { color: #f8fafc; }
                  .snaproad-legal table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.875rem; }
                  .snaproad-legal th, .snaproad-legal td {
                    padding: 0.75rem; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.08);
                  }
                  .snaproad-legal th { background: rgba(255,255,255,0.05); font-weight: 600; color: #f8fafc; }
                `}</style>
                <article className="snaproad-legal text-sm leading-7" dangerouslySetInnerHTML={{ __html: renderedHtml }} />
              </>
            ) : (
              <div className="space-y-3 text-sm text-slate-300">
                <p>
                  SnapRoad has not published this document yet. Before launch, publish a final reviewed version in the admin portal so this public URL is populated.
                </p>
                <p>
                  If you need an immediate copy, contact <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
