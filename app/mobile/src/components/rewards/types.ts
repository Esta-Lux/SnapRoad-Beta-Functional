import type { Badge, Offer } from '../../types';

/** Primary Wallet sections (UI: former "Rewards"). */
export type WalletTab = 'balance' | 'activity' | 'offers' | 'redemptions' | 'badges';

/** @deprecated Use WalletTab */
export type RewardsTab = WalletTab;

/** Driver redemption ledger (GET /api/offers/my-redemptions). */
export type UserOfferRedemption = {
  redemption_id: string;
  offer_id: string;
  redeemed_at: string | null;
  status: string;
  /** Staff scanned QR in store — completed checkout with partner. */
  used_in_store: boolean;
  gem_cost: number;
  discount_applied: number;
  business_name: string;
  title?: string | null;
  description?: string | null;
  image_url?: string | null;
  address?: string | null;
  discount_percent: number;
  lat?: number | null;
  lng?: number | null;
  is_free_item?: boolean;
  business_type?: string;
  category_label?: string;
};

export type OffersRewardsView = 'nearby' | 'my_redemptions';

export type GemTx = {
  id: string;
  type: 'earned' | 'spent' | 'unknown';
  amount: number;
  source: string;
  date: string;
  /** From wallet_transactions when migrated. */
  tx_type?: string;
  reference_type?: string | null;
  reference_id?: string | null;
  balance_after?: number | null;
  /** Server ledger metadata (trip formula, etc.). */
  metadata?: Record<string, unknown>;
};

export type BadgePressHandler = (badge: Badge) => void;
export type OfferPressHandler = (offer: Offer) => void;
