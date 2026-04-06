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
