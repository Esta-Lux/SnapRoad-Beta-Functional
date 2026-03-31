import type { PlanTier } from '../types';

export interface PlanConfig {
  name: string;
  price: string;
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
    price: '$10.99/mo',
    routeLimit: 20,
    popular: true,
    foundersNote: 'Lock in founders pricing for life',
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
