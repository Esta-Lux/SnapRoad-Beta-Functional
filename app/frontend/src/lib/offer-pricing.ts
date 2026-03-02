// SnapRoad - Offer Gem Pricing Constants
// Automatic pricing based on discount percentage
// These constants sync across driver, partner, and admin sides

export const GEM_PRICING_TIERS = {
  // 10% or less discount = 50 gems
  LOW_DISCOUNT: {
    threshold: 10,
    freeUserGems: 50,
    premiumUserGems: 40, // Premium users get 20% discount on gem costs
    label: 'Standard Offer',
    color: '#0084FF',
  },
  // Above 10% discount = 80 gems
  MEDIUM_DISCOUNT: {
    threshold: 25,
    freeUserGems: 80,
    premiumUserGems: 65,
    label: 'Premium Offer',
    color: '#9D4EDD',
  },
  // Free items = 100 gems
  FREE_ITEM: {
    threshold: 100,
    freeUserGems: 100,
    premiumUserGems: 80,
    label: 'Exclusive Offer',
    color: '#00DFA2',
  },
};

// Calculate gem cost based on discount percentage and user plan
export function calculateGemCost(
  discountPercent: number,
  isFreeItem: boolean,
  isPremiumUser: boolean
): number {
  if (isFreeItem) {
    return isPremiumUser 
      ? GEM_PRICING_TIERS.FREE_ITEM.premiumUserGems 
      : GEM_PRICING_TIERS.FREE_ITEM.freeUserGems;
  }
  
  if (discountPercent <= GEM_PRICING_TIERS.LOW_DISCOUNT.threshold) {
    return isPremiumUser 
      ? GEM_PRICING_TIERS.LOW_DISCOUNT.premiumUserGems 
      : GEM_PRICING_TIERS.LOW_DISCOUNT.freeUserGems;
  }
  
  return isPremiumUser 
    ? GEM_PRICING_TIERS.MEDIUM_DISCOUNT.premiumUserGems 
    : GEM_PRICING_TIERS.MEDIUM_DISCOUNT.freeUserGems;
}

// Get pricing tier info for display
export function getOfferTier(discountPercent: number, isFreeItem: boolean) {
  if (isFreeItem) {
    return {
      tier: 'FREE_ITEM',
      ...GEM_PRICING_TIERS.FREE_ITEM,
    };
  }
  
  if (discountPercent <= GEM_PRICING_TIERS.LOW_DISCOUNT.threshold) {
    return {
      tier: 'LOW_DISCOUNT',
      ...GEM_PRICING_TIERS.LOW_DISCOUNT,
    };
  }
  
  return {
    tier: 'MEDIUM_DISCOUNT',
    ...GEM_PRICING_TIERS.MEDIUM_DISCOUNT,
  };
}

// Partner pricing (what we charge partners)
export const PARTNER_PRICING = {
  PER_REDEMPTION_FEE: 0.50, // $0.50 per redemption
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
