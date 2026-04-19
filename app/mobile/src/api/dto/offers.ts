import type { Offer } from '../../types';

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
 * the Wallet offers grid:
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
