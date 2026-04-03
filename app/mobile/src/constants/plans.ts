import type { PlanTier } from '../types';

/** Match founders `price` and public list price in `/api/payments/plans` (premium). */
export const PREMIUM_FOUNDERS_MONTHLY = 4.99;
export const PREMIUM_PUBLIC_MONTHLY = 16.99;

export function premiumSavingsPercent(): number {
  if (PREMIUM_PUBLIC_MONTHLY <= 0) return 0;
  return Math.round((1 - PREMIUM_FOUNDERS_MONTHLY / PREMIUM_PUBLIC_MONTHLY) * 100);
}

export interface PlanConfig {
  name: string;
  price: string;
  /** Strikethrough list price (e.g. regular monthly before founders discount). */
  compareAtPrice?: string;
  /** Short line under price, e.g. savings vs public. */
  savingsHint?: string;
  routeLimit: number;
  features: string[];
  comingSoon?: boolean;
  popular?: boolean;
  foundersNote?: string;
}

export const PLANS: Record<PlanTier, PlanConfig> = {
  basic: {
    name: 'Basic',
    price: 'Free',
    routeLimit: 5,
    features: [
      'Privacy-first navigation',
      'Manual rerouting',
      'Local offers',
      'Earn Gems (1x)',
      'Up to 5 saved routes',
    ],
  },
  premium: {
    name: 'Premium',
    price: `$${PREMIUM_FOUNDERS_MONTHLY.toFixed(2)}/mo`,
    compareAtPrice: `$${PREMIUM_PUBLIC_MONTHLY.toFixed(2)}/mo`,
    savingsHint: `Save about ${premiumSavingsPercent()}% vs regular price ($${PREMIUM_PUBLIC_MONTHLY.toFixed(2)}/mo)`,
    routeLimit: 20,
    popular: true,
    foundersNote: 'Founders pricing — lock in this rate',
    features: [
      'Everything in Basic',
      'Share location & track friends',
      'Traffic cameras on map',
      'Delay alerts (2 hr ahead)',
      '20 saved routes',
      'Advanced local offers',
      '2x Gem multiplier',
      'Smart commute analytics',
      'Driving Score & insights',
      'Orion voice assistant',
      'Priority support',
    ],
  },
  family: {
    name: 'Family',
    price: '$19.99/mo',
    routeLimit: 20,
    comingSoon: true,
    features: [
      'Everything in Premium',
      'Up to 5 family members',
      'Opt-in live tracking (13+)',
      'Teen controls & safety settings',
      'SOS + safety alerts',
      'Family leaderboard',
    ],
  },
};
