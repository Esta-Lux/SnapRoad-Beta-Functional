import type { Offer } from '../../types';

export type OfferCategoryChip = {
  slug: string;
  label: string;
};

export type OnlineOfferItem = {
  id: string;
  title: string;
  description?: string;
  merchant_name?: string;
  merchant_domain?: string;
  category_slug?: string;
  category_label?: string;
  discount_label?: string;
  image_url?: string;
  expires_at?: string;
  affiliate_url?: string;
  featured?: boolean;
};

export type OnlineOffersCatalog = {
  items: OnlineOfferItem[];
  categories: OfferCategoryChip[];
  next_cursor: string | null;
  provider?: string;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(v: unknown): UnknownRecord | null {
  return v && typeof v === 'object' ? (v as UnknownRecord) : null;
}

export function unwrapApiData(payload: unknown): unknown {
  const root = asRecord(payload);
  if (!root) return payload;
  const data = root.data;
  const nested = asRecord(data);
  if (nested && 'data' in nested) return nested.data;
  return data ?? payload;
}

/**
 * Parse `GET /api/offers/nearby` into an `Offer[]`. Tolerates three real server
 * shapes observed in the wild so a minor backend refactor doesn't silently blank
 * nearby / map / Offers tab lists:
 *   - `{ success, data: Offer[] }`              (current shape)
 *   - `{ success, data: { offers: Offer[] } }`  (nested wrapper)
 *   - `{ success, data: { data: Offer[] } }`    (double-wrapped envelope)
 */
export function parseNearbyOffers(payload: unknown): Offer[] {
  const v = unwrapApiData(payload);
  if (Array.isArray(v)) return v as Offer[];
  const nested = asRecord(v);
  if (nested) {
    if (Array.isArray(nested.offers)) return nested.offers as Offer[];
    if (Array.isArray(nested.data)) return nested.data as Offer[];
    if (Array.isArray(nested.items)) return nested.items as Offer[];
  }
  return [];
}

/** `GET /api/offers/categories` — `{ success, data: { slug, label }[] }`. */
export function parseOfferCategories(payload: unknown): OfferCategoryChip[] {
  const v = unwrapApiData(payload);
  if (!Array.isArray(v)) return [];
  const out: OfferCategoryChip[] = [];
  for (const row of v) {
    if (!row || typeof row !== 'object') continue;
    const o = row as UnknownRecord;
    const slug = o.slug != null ? String(o.slug).trim() : '';
    const label = o.label != null ? String(o.label).trim() : '';
    if (slug && label) out.push({ slug, label });
  }
  return out;
}

/** `GET /api/offers/online` — `{ success, data: { items, categories, next_cursor } }`. */
export function parseOnlineOffersCatalog(payload: unknown): OnlineOffersCatalog {
  const empty: OnlineOffersCatalog = { items: [], categories: [], next_cursor: null };
  const root = unwrapApiData(payload);
  const rec = asRecord(root);
  if (!rec) return empty;

  const itemsRaw = rec.items;
  const items: OnlineOfferItem[] = [];
  if (Array.isArray(itemsRaw)) {
    for (const row of itemsRaw) {
      if (!row || typeof row !== 'object') continue;
      const o = row as UnknownRecord;
      const id = o.id != null ? String(o.id) : '';
      if (!id) continue;
      items.push({
        id,
        title: o.title != null ? String(o.title) : 'Offer',
        description: o.description != null ? String(o.description) : undefined,
        merchant_name: o.merchant_name != null ? String(o.merchant_name) : undefined,
        merchant_domain: o.merchant_domain != null ? String(o.merchant_domain) : undefined,
        category_slug: o.category_slug != null ? String(o.category_slug) : undefined,
        category_label: o.category_label != null ? String(o.category_label) : undefined,
        discount_label: o.discount_label != null ? String(o.discount_label) : undefined,
        image_url: o.image_url != null ? String(o.image_url) : undefined,
        expires_at: o.expires_at != null ? String(o.expires_at) : undefined,
        affiliate_url: o.affiliate_url != null ? String(o.affiliate_url) : undefined,
        featured: Boolean(o.featured),
      });
    }
  }

  const catRaw = rec.categories;
  const categories: OfferCategoryChip[] = [];
  if (Array.isArray(catRaw)) {
    for (const row of catRaw) {
      if (!row || typeof row !== 'object') continue;
      const o = row as UnknownRecord;
      const slug = o.slug != null ? String(o.slug).trim() : '';
      const label = o.label != null ? String(o.label).trim() : '';
      if (slug && label) categories.push({ slug, label });
    }
  }

  const nc = rec.next_cursor;
  const next_cursor = nc != null && String(nc).length > 0 ? String(nc) : null;

  return {
    items,
    categories,
    next_cursor,
    provider: rec.provider != null ? String(rec.provider) : undefined,
  };
}

export type RedeemOfferPayload = {
  gem_cost?: number;
  new_gem_total?: number;
  redemption_id?: string;
  redeemed_at?: string;
  qr_token?: string;
  claim_code?: string;
  expires_at?: string;
};

export function parseRedeemOfferPayload(payload: unknown): RedeemOfferPayload {
  const root = asRecord(unwrapApiData(payload));
  if (!root) return {};
  return {
    gem_cost: Number(root.gem_cost ?? NaN),
    new_gem_total: Number(root.new_gem_total ?? NaN),
    redemption_id:
      root.redemption_id != null ? String(root.redemption_id) : undefined,
    redeemed_at:
      root.redeemed_at != null ? String(root.redeemed_at) : undefined,
    qr_token: root.qr_token != null ? String(root.qr_token) : undefined,
    claim_code: root.claim_code != null ? String(root.claim_code) : undefined,
    expires_at: root.expires_at != null ? String(root.expires_at) : undefined,
  };
}
