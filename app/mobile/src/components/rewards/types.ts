import type { Badge, Challenge, Offer } from '../../types';

export type RewardsTab = 'offers' | 'challenges' | 'badges';

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
export type ChallengeModalTab = 'history' | 'badges';

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

export type ChallengeHistoryItem = {
  id: string;
  opponent_name: string;
  status: 'pending' | 'active' | 'won' | 'lost' | 'draw' | string;
  your_score: number;
  opponent_score: number;
  stake: number;
  duration_hours: number;
};

export type ChallengeHistoryStats = {
  wins: number;
  losses: number;
  win_rate: number;
  total_gems_won: number;
  total_gems_lost: number;
  current_streak: number;
  best_streak: number;
};

export type BadgePressHandler = (badge: Badge) => void;
export type OfferPressHandler = (offer: Offer) => void;
export type ChallengeClaimHandler = (challenge: Challenge) => void;
