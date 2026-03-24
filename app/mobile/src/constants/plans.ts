import type { PlanTier } from '../types';

export interface PlanConfig {
  name: string;
  price: string;
  routeLimit: number;
  features: string[];
}

export const PLANS: Record<PlanTier, PlanConfig> = {
  basic: {
    name: 'Basic',
    price: 'Free',
    routeLimit: 5,
    features: [
      'Turn-by-turn navigation',
      'Road reports',
      'Up to 5 saved routes',
      'Basic driving score',
    ],
  },
  premium: {
    name: 'Premium',
    price: '$4.99/mo',
    routeLimit: 20,
    features: [
      'Everything in Basic',
      'Orion voice assistant',
      'Share location & track friends',
      'Route notifications & push alerts',
      'Up to 20 saved routes',
      'Car customization studio',
    ],
  },
  family: {
    name: 'Family',
    price: '$9.99/mo',
    routeLimit: 20,
    features: [
      'Everything in Premium',
      'Up to 6 family members',
      'Family dashboard & leaderboard',
      'Teen driving reports',
      'SOS alerts',
      'Geofence notifications',
    ],
  },
};
