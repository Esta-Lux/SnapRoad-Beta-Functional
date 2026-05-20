/**
 * Warm online offers catalog on app launch so the Offers tab opens instantly.
 * OffersScreen reads this cache first, then refreshes in the background.
 */
import { api } from '../api/client';
import { parseOnlineOffersCatalog, type OnlineOfferItem } from '../api/dto/offers';

export const INITIAL_ONLINE_OFFERS_LIMIT = 100;
export const ONLINE_OFFERS_LOAD_MORE_LIMIT = 100;

export type CachedOnlineCategory = { slug: string; label: string };

export type CachedOnlineCatalog = {
  items: OnlineOfferItem[];
  categories: CachedOnlineCategory[];
  next_cursor: string | null;
  fetchedAtMs: number;
};

let cache: CachedOnlineCatalog | null = null;
let inflight: Promise<CachedOnlineCatalog | null> | null = null;

export function getCachedOnlineCatalog(): CachedOnlineCatalog | null {
  return cache;
}

export function setCachedOnlineCatalog(next: CachedOnlineCatalog | null): void {
  cache = next;
}

export async function prefetchOnlineOffersCatalog(): Promise<CachedOnlineCatalog | null> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await api.get(
        `/api/offers/online?limit=${INITIAL_ONLINE_OFFERS_LIMIT}`,
      );
      if (!res.success) return cache;
      const parsed = parseOnlineOffersCatalog(res.data);
      const next: CachedOnlineCatalog = {
        items: parsed.items,
        categories: parsed.categories ?? [],
        next_cursor: parsed.next_cursor,
        fetchedAtMs: Date.now(),
      };
      cache = next;
      return next;
    } catch {
      return cache;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}
