/** Mirror of backend `services/offer_categories` for display when `category_label` is missing. */

export function displayOfferCategory(offer: {
  category_label?: string | null;
  business_type?: string | null;
}): string {
  const lbl = offer.category_label?.trim();
  if (lbl) return lbl;
  const raw = (offer.business_type || 'other').replace(/_/g, ' ').trim();
  if (!raw) return 'Other';
  return raw.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Stable key + human label for filtering nearby offers (prefers API `business_type`, else text heuristics). */
export type OfferCategoryFilter = { key: string; label: string };

const BUSINESS_TYPE_LABEL: Record<string, string> = {
  gas: 'Gas',
  fuel: 'Gas',
  cafe: 'Coffee',
  coffee: 'Coffee',
  coffee_shop: 'Coffee',
  restaurant: 'Restaurants',
  food: 'Restaurants',
  dining: 'Restaurants',
  carwash: 'Car wash',
  car_wash: 'Car wash',
  retail: 'Retail',
  grocery: 'Grocery',
  hotel: 'Hotel',
  convenience: 'Convenience',
  pharmacy: 'Pharmacy',
  other: 'Other',
};

function titleCaseWords(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function offerCategoryFilter(offer: {
  category_label?: string | null;
  business_type?: string | null;
}): OfferCategoryFilter {
  const btRaw = (offer.business_type || '').trim().toLowerCase();
  if (btRaw && BUSINESS_TYPE_LABEL[btRaw]) {
    return { key: btRaw, label: BUSINESS_TYPE_LABEL[btRaw] };
  }
  if (btRaw && btRaw !== 'other') {
    return { key: btRaw, label: titleCaseWords(btRaw.replace(/_/g, ' ')) };
  }

  const display = displayOfferCategory(offer);
  const d = display.toLowerCase();
  if (/\bgas\b|fuel|shell|exxon|chevron|mobil/.test(d)) return { key: 'gas', label: 'Gas' };
  if (/coffee|espresso|café|cafe|starbucks|dunkin/.test(d)) return { key: 'cafe', label: 'Coffee' };
  if (/restaurant|dining|pizza|burger|grill|kitchen|taco|bistro|bbq/.test(d)) {
    return { key: 'restaurant', label: 'Restaurants' };
  }
  if (/car\s*wash|carwash/.test(d)) return { key: 'carwash', label: 'Car wash' };
  if (/grocery|market|foods/.test(d)) return { key: 'grocery', label: 'Grocery' };
  if (/hotel|inn|lodging|motel/.test(d)) return { key: 'hotel', label: 'Hotel' };
  if (/retail|boutique|store|shop\b/.test(d)) return { key: 'retail', label: 'Retail' };

  const slug = d.replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 48) || 'other';
  return { key: slug, label: display };
}

export function uniqueOfferCategoryFilters(
  offers: { category_label?: string | null; business_type?: string | null }[],
): OfferCategoryFilter[] {
  const map = new Map<string, string>();
  for (const o of offers) {
    const f = offerCategoryFilter(o);
    if (!map.has(f.key)) map.set(f.key, f.label);
  }
  return Array.from(map.entries())
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
