import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { SUPPORT_EMAIL } from '@/lib/launchFlags'
import { getApiBaseUrl } from '@/services/api'

type LegalDocSummary = {
  id: string
  name: string
  type?: string
  version?: string
  description?: string
  updated_at?: string
  last_updated?: string
}

type LegalDoc = LegalDocSummary & {
  content?: string
}

type LegalPageKey = 'privacy' | 'terms' | 'community'

const PAGE_META: Record<LegalPageKey, { title: string; description: string }> = {
  privacy: {
    title: 'Privacy Policy',
    description: 'How SnapRoad collects, uses, and protects your data across the driver app and partner experiences.',
  },
  terms: {
    title: 'Terms of Service',
    description: 'The rules and responsibilities for using SnapRoad products and services.',
  },
  community: {
    title: 'Community Guidelines',
    description: 'Standards for safe reports, respectful conduct, and acceptable use of community features.',
  },
}

function matchesDoc(page: LegalPageKey, doc: LegalDocSummary): boolean {
  const name = String(doc.name || '').toLowerCase()
  const type = String(doc.type || '').toLowerCase()
  if (page === 'privacy') return type === 'privacy' || name.includes('privacy')
  if (page === 'terms') return type === 'terms' || name.includes('terms')
  return (
    type === 'compliance' ||
    name.includes('community') ||
    name.includes('guideline') ||
    name.includes('acceptable use')
  )
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
        const listRes = await fetch(`${baseUrl}/api/legal/documents`)
        if (!listRes.ok) throw new Error(`Failed to load ${meta.title.toLowerCase()}`)
        const listPayload = await listRes.json()
        const docs = Array.isArray(listPayload?.data) ? (listPayload.data as LegalDocSummary[]) : []
        const match = docs.find((item) => matchesDoc(docKey, item)) ?? null
        if (!match) {
          if (!cancelled) setDoc(null)
          return
        }
        const docRes = await fetch(`${baseUrl}/api/legal/documents/${match.id}`)
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
            ) : doc?.content ? (
              <article className="whitespace-pre-wrap text-sm leading-7 text-slate-100">{doc.content}</article>
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
