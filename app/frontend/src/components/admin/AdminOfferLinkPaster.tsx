// Paste a product link → server unfurls (JSON-LD + OG + HTML fallback) → admin
// reviews the prefilled preview, picks Online or Local destination, and publishes.

import { useEffect, useMemo, useState } from 'react'
import { Link2, Loader2, Image as ImageIcon, AlertCircle, ExternalLink, Star, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  adminApi,
  type OfferFromLinkPayload,
  type OnlineOfferUpsertPayload,
  type UnfurlPreview,
} from '@/services/adminApi'

interface Props {
  theme: 'dark' | 'light'
  open: boolean
  onClose: () => void
  onPublished?: (destination: 'online' | 'local') => void
}

type Destination = 'online' | 'local'

/** Editable form state seeded from the unfurl preview. */
interface FormState {
  source_url: string
  affiliate_url: string
  title: string
  description: string
  merchant_name: string
  merchant_domain: string
  image_url: string
  regular_price: string
  sale_price: string
  currency: string
  discount_label: string
  category_slug: string
  category_label: string
  featured: boolean
  // Local-only fields:
  business_name: string
  business_type: string
  lat: string
  lng: string
  expires_hours: string
}

const DEFAULT_FORM: FormState = {
  source_url: '',
  affiliate_url: '',
  title: '',
  description: '',
  merchant_name: '',
  merchant_domain: '',
  image_url: '',
  regular_price: '',
  sale_price: '',
  currency: 'USD',
  discount_label: '',
  category_slug: '',
  category_label: '',
  featured: false,
  business_name: '',
  business_type: 'retail',
  lat: '39.9612',
  lng: '-82.9988',
  expires_hours: '168',
}

function parseNumber(v: string): number | null {
  if (!v) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function autoDiscountLabel(regular: number | null, sale: number | null): string {
  if (regular == null || sale == null) return ''
  if (regular <= 0 || sale <= 0 || sale >= regular) return ''
  const pct = Math.round((1 - sale / regular) * 100)
  return pct > 0 ? `${pct}% off` : ''
}

export default function AdminOfferLinkPaster({ theme, open, onClose, onPublished }: Props) {
  const isDark = theme === 'dark'
  const [url, setUrl] = useState('')
  const [previewing, setPreviewing] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [preview, setPreview] = useState<UnfurlPreview | null>(null)
  const [destination, setDestination] = useState<Destination>('online')
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)

  useEffect(() => {
    if (!open) {
      setUrl('')
      setPreview(null)
      setForm(DEFAULT_FORM)
      setDestination('online')
      setPreviewing(false)
      setPublishing(false)
    }
  }, [open])

  const computedDiscountLabel = useMemo(
    () => form.discount_label || autoDiscountLabel(parseNumber(form.regular_price), parseNumber(form.sale_price)),
    [form.discount_label, form.regular_price, form.sale_price],
  )

  if (!open) return null

  const handlePreview = async () => {
    const trimmed = url.trim()
    if (!trimmed) {
      toast.error('Paste a product URL first')
      return
    }
    setPreviewing(true)
    try {
      const res = await adminApi.unfurlOfferLink(trimmed)
      if (!res.success || !res.data) {
        toast.error(res.message || 'Could not unfurl URL')
        return
      }
      const p = res.data
      setPreview(p)
      setForm((prev) => ({
        ...prev,
        source_url: p.source_url || trimmed,
        affiliate_url: p.final_url || p.source_url || trimmed,
        title: p.title || '',
        description: p.description || '',
        merchant_name: p.merchant_name || '',
        merchant_domain: p.merchant_domain || '',
        image_url: p.image_url || '',
        regular_price: p.regular_price != null ? String(p.regular_price) : '',
        sale_price: p.sale_price != null ? String(p.sale_price) : '',
        currency: p.currency || 'USD',
        business_name: p.merchant_name || prev.business_name,
      }))
      if (p.notes && p.notes.length) {
        toast(p.notes[0], { icon: '⚠️' })
      } else {
        toast.success(`Preview ready (${p.extractor.replace('_', ' ')})`)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not unfurl URL')
    } finally {
      setPreviewing(false)
    }
  }

  const buildPayload = (): OfferFromLinkPayload | null => {
    const regular = parseNumber(form.regular_price)
    const sale = parseNumber(form.sale_price)
    const currency = (form.currency || 'USD').toUpperCase()
    const titleTrim = form.title.trim()
    if (!titleTrim) {
      toast.error('Title is required')
      return null
    }
    if (!form.source_url.trim()) {
      toast.error('Source URL is required (paste a link and click Preview first)')
      return null
    }

    if (destination === 'online') {
      const online: OnlineOfferUpsertPayload = {
        source_url: form.source_url.trim(),
        affiliate_url: form.affiliate_url.trim() || form.source_url.trim(),
        asin: preview?.asin || null,
        title: titleTrim,
        description: form.description.trim() || null,
        merchant_name: form.merchant_name.trim() || null,
        merchant_domain: form.merchant_domain.trim() || null,
        image_url: form.image_url.trim() || null,
        regular_price: regular,
        sale_price: sale,
        currency,
        discount_label: computedDiscountLabel || null,
        category_slug: form.category_slug.trim() || null,
        category_label: form.category_label.trim() || null,
        featured: form.featured,
        status: 'active',
      }
      return { destination: 'online', online }
    }

    // Local: percent fallback if admin didn't set absolute prices.
    const discountPercent =
      regular != null && sale != null && regular > 0 && sale > 0 && sale < regular
        ? Math.round((1 - sale / regular) * 100)
        : 0
    const businessName = form.business_name.trim() || form.merchant_name.trim() || titleTrim
    const lat = parseNumber(form.lat) ?? 39.9612
    const lng = parseNumber(form.lng) ?? -82.9988
    const expiresHours = parseNumber(form.expires_hours) ?? 168
    return {
      destination: 'local',
      local: {
        business_name: businessName,
        business_type: form.business_type || 'retail',
        description: form.description.trim() || titleTrim,
        title: titleTrim,
        discount_percent: discountPercent,
        is_free_item: false,
        base_gems: null,
        lat,
        lng,
        expires_hours: Math.max(1, Math.round(expiresHours)),
        image_url: form.image_url.trim() || null,
        offer_url: form.source_url.trim() || null,
        original_price: regular,
        sale_price: sale,
        source_url: form.source_url.trim() || null,
        offer_source: 'direct',
      },
    }
  }

  const handlePublish = async () => {
    const payload = buildPayload()
    if (!payload) return
    setPublishing(true)
    try {
      const res = await adminApi.createOfferFromLink(payload)
      if (!res.success) {
        toast.error(res.message || 'Could not publish offer')
        return
      }
      toast.success(
        destination === 'online'
          ? 'Online offer published — visible in the mobile app Offers tab.'
          : 'Local offer published — visible to nearby drivers.',
      )
      onPublished?.(destination)
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not publish offer')
    } finally {
      setPublishing(false)
    }
  }

  const inputClass = `w-full px-3 py-2 rounded-lg border text-sm ${
    isDark
      ? 'bg-white/5 border-white/10 text-gray-100 placeholder:text-gray-500'
      : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400'
  }`
  const labelClass = `text-xs font-semibold mb-1 block ${isDark ? 'text-gray-400' : 'text-gray-600'}`

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={() => !previewing && !publishing && onClose()}
    >
      <div
        className={`max-w-3xl w-full max-h-[92vh] overflow-y-auto rounded-2xl border shadow-xl ${
          isDark ? 'bg-slate-900 border-white/10 text-gray-100' : 'bg-white border-gray-200 text-gray-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={20} className="text-purple-400" />
            <h2 className="text-lg font-semibold">Add offer from link</h2>
          </div>
          <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Paste a product page URL — title, image, and prices are pulled from the page (Open Graph / JSON-LD).
            You can edit anything before publishing. Amazon links extract title/image; live prices arrive when
            the Amazon Product Advertising API is wired (env: <code className="text-xs">AMAZON_PAAPI_*</code>).
          </p>

          {/* URL input + preview button */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="url"
                placeholder="https://amzn.to/4eDWU1K   or   https://www.walmart.com/ip/12345"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !previewing) {
                    e.preventDefault()
                    void handlePreview()
                  }
                }}
                className={`${inputClass} pl-9`}
                disabled={previewing}
              />
            </div>
            <button
              type="button"
              onClick={handlePreview}
              disabled={previewing || !url.trim()}
              className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${
                previewing || !url.trim()
                  ? 'bg-gray-400/40 text-gray-500 cursor-not-allowed'
                  : isDark
                    ? 'bg-purple-500 hover:bg-purple-400 text-white'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              {previewing ? <Loader2 size={16} className="animate-spin" /> : null}
              {previewing ? 'Fetching…' : 'Preview'}
            </button>
          </div>

          {/* Preview notes */}
          {preview && preview.notes.length > 0 && (
            <div
              className={`flex items-start gap-2 p-3 rounded-lg mb-4 text-xs ${
                isDark ? 'bg-amber-900/30 border border-amber-700/40 text-amber-200' : 'bg-amber-50 border border-amber-200 text-amber-900'
              }`}
            >
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              <ul className="space-y-1">
                {preview.notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Destination toggle */}
          <div className={`mb-5 p-3 rounded-lg ${isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-200'}`}>
            <div className={labelClass}>Destination</div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDestination('online')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold border ${
                  destination === 'online'
                    ? isDark
                      ? 'bg-purple-500/20 border-purple-400 text-purple-100'
                      : 'bg-purple-100 border-purple-500 text-purple-900'
                    : isDark
                      ? 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Online (e-commerce)
                <div className="text-[10px] font-normal opacity-70 mt-0.5">
                  Shows in app Offers tab → Online; tap opens link.
                </div>
              </button>
              <button
                type="button"
                onClick={() => setDestination('local')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold border ${
                  destination === 'local'
                    ? isDark
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-100'
                      : 'bg-emerald-100 border-emerald-500 text-emerald-900'
                    : isDark
                      ? 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Local (geo offer)
                <div className="text-[10px] font-normal opacity-70 mt-0.5">
                  Shows in app Offers → Local; needs lat/lng + business type.
                </div>
              </button>
            </div>
          </div>

          {/* Live preview card */}
          {preview && (
            <div
              className={`mb-5 rounded-xl border overflow-hidden ${
                isDark ? 'bg-slate-800 border-white/10' : 'bg-white border-gray-200'
              }`}
            >
              <div className="grid grid-cols-[140px,1fr] gap-3">
                <div className={`h-32 flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                  {form.image_url ? (
                    <img src={form.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon size={32} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
                  )}
                </div>
                <div className="py-3 pr-3">
                  <div className={`text-[10px] font-bold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {form.merchant_name || form.merchant_domain || 'Retailer'}
                  </div>
                  <div className="text-sm font-bold mt-1 line-clamp-2">{form.title || 'Untitled offer'}</div>
                  <div className="flex items-center gap-2 mt-2">
                    {form.sale_price ? (
                      <span className={`text-base font-bold ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                        {form.currency || 'USD'} {form.sale_price}
                      </span>
                    ) : null}
                    {form.regular_price && form.sale_price && parseNumber(form.regular_price)! > parseNumber(form.sale_price)! ? (
                      <span className={`text-xs line-through ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        {form.currency || 'USD'} {form.regular_price}
                      </span>
                    ) : null}
                    {computedDiscountLabel ? (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          isDark ? 'bg-rose-500/20 text-rose-200' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {computedDiscountLabel}
                      </span>
                    ) : null}
                  </div>
                  <a
                    href={form.affiliate_url || form.source_url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={`text-[11px] inline-flex items-center gap-1 mt-2 ${
                      isDark ? 'text-purple-300 hover:text-purple-200' : 'text-purple-700 hover:text-purple-900'
                    }`}
                  >
                    <ExternalLink size={12} /> Open source
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Editable form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className={labelClass}>Title *</label>
              <input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Image URL</label>
              <input
                className={inputClass}
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                placeholder="https://…/image.jpg"
              />
            </div>

            <div>
              <label className={labelClass}>Regular price</label>
              <input
                className={inputClass}
                value={form.regular_price}
                onChange={(e) => setForm({ ...form, regular_price: e.target.value })}
                placeholder="129.99"
                inputMode="decimal"
              />
            </div>
            <div>
              <label className={labelClass}>Discounted (sale) price</label>
              <input
                className={inputClass}
                value={form.sale_price}
                onChange={(e) => setForm({ ...form, sale_price: e.target.value })}
                placeholder="79.99"
                inputMode="decimal"
              />
            </div>

            <div>
              <label className={labelClass}>Currency</label>
              <input
                className={inputClass}
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase().slice(0, 6) })}
              />
            </div>
            <div>
              <label className={labelClass}>Discount label (auto if blank)</label>
              <input
                className={inputClass}
                value={form.discount_label}
                onChange={(e) => setForm({ ...form, discount_label: e.target.value })}
                placeholder={computedDiscountLabel || '25% off'}
              />
            </div>

            <div>
              <label className={labelClass}>Merchant name</label>
              <input
                className={inputClass}
                value={form.merchant_name}
                onChange={(e) => setForm({ ...form, merchant_name: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Merchant domain</label>
              <input
                className={inputClass}
                value={form.merchant_domain}
                onChange={(e) => setForm({ ...form, merchant_domain: e.target.value })}
              />
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Affiliate / outbound URL (defaults to source URL)</label>
              <input
                className={inputClass}
                value={form.affiliate_url}
                onChange={(e) => setForm({ ...form, affiliate_url: e.target.value })}
              />
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Description (optional)</label>
              <textarea
                className={`${inputClass} min-h-[68px]`}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            {destination === 'online' && (
              <>
                <div>
                  <label className={labelClass}>Category slug (optional)</label>
                  <input
                    className={inputClass}
                    value={form.category_slug}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        category_slug: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
                      })
                    }
                    placeholder="electronics"
                  />
                </div>
                <div>
                  <label className={labelClass}>Category label (optional)</label>
                  <input
                    className={inputClass}
                    value={form.category_label}
                    onChange={(e) => setForm({ ...form, category_label: e.target.value })}
                    placeholder="Electronics"
                  />
                </div>
                <div className="md:col-span-2 flex items-center gap-2 mt-1">
                  <input
                    id="online-featured"
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                    className="h-4 w-4 accent-purple-500"
                  />
                  <label htmlFor="online-featured" className="text-sm flex items-center gap-1">
                    <Star size={14} /> Mark as featured (sorted first in the Online pane)
                  </label>
                </div>
              </>
            )}

            {destination === 'local' && (
              <>
                <div className="md:col-span-2">
                  <label className={labelClass}>Business name *</label>
                  <input
                    className={inputClass}
                    value={form.business_name}
                    onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                    placeholder="Defaults to merchant or title if blank"
                  />
                </div>
                <div>
                  <label className={labelClass}>Business type</label>
                  <input
                    className={inputClass}
                    value={form.business_type}
                    onChange={(e) => setForm({ ...form, business_type: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Expires (hours from now)</label>
                  <input
                    className={inputClass}
                    inputMode="numeric"
                    value={form.expires_hours}
                    onChange={(e) => setForm({ ...form, expires_hours: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Latitude</label>
                  <input
                    className={inputClass}
                    inputMode="decimal"
                    value={form.lat}
                    onChange={(e) => setForm({ ...form, lat: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Longitude</label>
                  <input
                    className={inputClass}
                    inputMode="decimal"
                    value={form.lng}
                    onChange={(e) => setForm({ ...form, lng: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={publishing}
              className={`px-4 py-2 rounded-lg text-sm ${
                isDark ? 'bg-white/5 hover:bg-white/10 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePublish}
              disabled={publishing || !form.title.trim() || !form.source_url.trim()}
              className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${
                publishing || !form.title.trim() || !form.source_url.trim()
                  ? 'bg-gray-400/40 text-gray-500 cursor-not-allowed'
                  : destination === 'online'
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {publishing ? <Loader2 size={16} className="animate-spin" /> : null}
              {publishing ? 'Publishing…' : `Publish ${destination === 'online' ? 'online' : 'local'} offer`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
