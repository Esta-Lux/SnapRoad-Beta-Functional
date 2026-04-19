// SnapRoad - Offer Gem Pricing Constants
// Automatic pricing based on discount percentage
// Synced with backend: services/offer_utils.py

export const GEM_PRICING_TIERS = {
  LOW_DISCOUNT: {
    threshold: 10,
    gems: 20,
    label: 'Light discount (≤10%)',
    color: '#0084FF',
  },
  MID_DISCOUNT: {
    threshold: 45,
    gems: 45,
    label: 'Strong discount (11–45%)',
    color: '#9D4EDD',
  },
  HIGH_DISCOUNT: {
    threshold: 100,
    gems: 50,
    label: 'Deep discount (46%+)',
    color: '#9D4EDD',
  },
  FREE_ITEM: {
    threshold: 100,
    gems: 35,
    label: 'Free item',
    color: '#00DFA2',
  },
};

/** Synced with backend `services/gem_economy.offer_gems_reward_for_discount`. */
export function calculateAutoGems(discountPercent: number, isFreeItem: boolean): number {
  if (isFreeItem) return 35;
  const disc = Math.max(0, Math.min(100, discountPercent));
  if (disc <= 10) return 20;
  if (disc <= 45) return 45;
  return 50;
}

/** @deprecated Use calculateAutoGems — kept for backward compat */
export function calculateGemCost(
  discountPercent: number,
  isFreeItem: boolean,
  _isPremiumUser: boolean
): number {
  return calculateAutoGems(discountPercent, isFreeItem);
}

export function getOfferTier(discountPercent: number, isFreeItem: boolean) {
  if (isFreeItem) {
    return { tier: 'FREE_ITEM', ...GEM_PRICING_TIERS.FREE_ITEM };
  }
  const disc = Math.max(0, Math.min(100, discountPercent));
  if (disc <= 10) return { tier: 'LOW_DISCOUNT', ...GEM_PRICING_TIERS.LOW_DISCOUNT };
  if (disc <= 45) return { tier: 'MID_DISCOUNT', ...GEM_PRICING_TIERS.MID_DISCOUNT };
  return { tier: 'HIGH_DISCOUNT', ...GEM_PRICING_TIERS.HIGH_DISCOUNT };
}

export function calculateFreeDiscount(premiumDiscount: number): number {
  if (premiumDiscount <= 0) return 0;
  return Math.max(1, Math.floor(premiumDiscount / 4));
}

// Tiered per-redemption fee (synced with backend offer_utils.py)
export function calculateRedemptionFee(totalRedemptions: number): number {
  const base = 0.20;
  const tiersPast = Math.max(0, Math.floor((totalRedemptions - 1) / 500));
  return Math.round((base + tiersPast * 0.10) * 100) / 100;
}

export const REDEMPTION_FEE_SCHEDULE = [
  { range: '1-500', fee: 0.20 },
  { range: '501-1,000', fee: 0.30 },
  { range: '1,001-1,500', fee: 0.40 },
  { range: '1,501-2,000', fee: 0.50 },
  { range: '2,001+', fee: '0.50+ ($0.10 per 500)' },
];

export const PARTNER_PRICING = {
  MONTHLY_SUBSCRIPTION: {
    BASIC: 29.99,
    PROFESSIONAL: 79.99,
    ENTERPRISE: 199.99,
  },
  FEATURED_PLACEMENT: {
    DAILY: 9.99,
    WEEKLY: 49.99,
    MONTHLY: 149.99,
  },
};

// Offer categories
export const OFFER_CATEGORIES = [
  { id: 'food', label: 'Food & Dining', icon: 'utensils' },
  { id: 'gas', label: 'Gas & Fuel', icon: 'gas-pump' },
  { id: 'retail', label: 'Retail', icon: 'shopping-bag' },
  { id: 'service', label: 'Auto Service', icon: 'wrench' },
  { id: 'entertainment', label: 'Entertainment', icon: 'film' },
  { id: 'travel', label: 'Travel', icon: 'plane' },
];

// Offer types
export const OFFER_TYPES = {
  PERCENTAGE_OFF: 'percentage',
  DOLLAR_OFF: 'dollar',
  FREE_ITEM: 'free',
  BOGO: 'bogo',
  POINTS_MULTIPLIER: 'multiplier',
};
