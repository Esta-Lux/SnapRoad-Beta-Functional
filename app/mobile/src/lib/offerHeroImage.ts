import type { Offer } from '../types';
import { API_BASE_URL } from '../api/client';

/** Hero image for nearby / partner cards: Proxied Places photo first, then host-provided artwork. */
export function offerHeroUri(offer: Pick<Offer, 'image_url' | 'place_photo_reference'> | null | undefined): string | undefined {
  if (!offer) return undefined;
  const ref = offer.place_photo_reference?.trim();
  if (ref) {
    return `${API_BASE_URL}/api/places/photo?ref=${encodeURIComponent(ref)}&maxwidth=800`;
  }
  const img = offer.image_url?.trim();
  return img || undefined;
}
