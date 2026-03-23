// SnapRoad - Partner Plan Configuration
// Defines features and limits for each subscription tier

export type PlanTier = 'starter' | 'growth' | 'enterprise';

export interface PlanConfig {
  id: PlanTier;
  name: string;
  price: number;
  foundersPrice: number;
  publicPrice: number;
  maxLocations: number;
  features: string[];
  limits: {
    locations: number;
    teamMembers: number;
    boostsPerMonth: number;
    analyticsLevel: 'basic' | 'advanced' | 'full';
    apiAccess: boolean;
    featuredPlacement: boolean;
    quarterlyReviews: boolean;
    dedicatedManager: boolean;
  };
}

export const PLANS: Record<PlanTier, PlanConfig> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 20.99,
    foundersPrice: 34.99,
    publicPrice: 34.99,
    maxLocations: 5,
    features: [
      'Up to 5 locations',
      'Gem placement on map',
      'Offer creation & tracking',
      'Foot traffic insights',
      'Business support',
    ],
    limits: {
      locations: 5,
      teamMembers: 3,
      boostsPerMonth: 5,
      analyticsLevel: 'basic',
      apiAccess: false,
      featuredPlacement: false,
      quarterlyReviews: false,
      dedicatedManager: false,
    },
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    price: 49.99,
    foundersPrice: 79.99,
    publicPrice: 79.99,
    maxLocations: 25,
    features: [
      'Everything in Starter',
      'Up to 25 locations',
      'Advanced analytics',
      'Featured placement',
      'Team access',
    ],
    limits: {
      locations: 25,
      teamMembers: 10,
      boostsPerMonth: 25,
      analyticsLevel: 'advanced',
      apiAccess: false,
      featuredPlacement: true,
      quarterlyReviews: false,
      dedicatedManager: false,
    },
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 0, // Custom pricing
    foundersPrice: 0,
    publicPrice: 0,
    maxLocations: -1, // Unlimited
    features: [
      'Unlimited locations',
      'Everything in Growth',
      'Quarterly reviews',
      'Full API access',
      'Dedicated account manager',
    ],
    limits: {
      locations: -1, // Unlimited
      teamMembers: -1, // Unlimited
      boostsPerMonth: -1, // Unlimited
      analyticsLevel: 'full',
      apiAccess: true,
      featuredPlacement: true,
      quarterlyReviews: true,
      dedicatedManager: true,
    },
  },
};

// Redemption fee per verified customer
export const REDEMPTION_FEE = 0.20;

// Founders get 90 days free boost
export const FOUNDERS_FREE_BOOST_DAYS = 90;
export const BOOST_VALUE_RANGE = { min: 100, max: 300 };

// Check if a feature is available for a plan
export function hasFeature(plan: PlanTier, feature: keyof PlanConfig['limits']): boolean {
  const planConfig = PLANS[plan];
  const value = planConfig.limits[feature];
  
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  return value !== 'basic';
}

// Check if location limit is reached
export function canAddLocation(plan: PlanTier, currentLocations: number): boolean {
  const limit = PLANS[plan].limits.locations;
  if (limit === -1) return true; // Unlimited
  return currentLocations < limit;
}

// Get remaining locations
export function getRemainingLocations(plan: PlanTier, currentLocations: number): number {
  const limit = PLANS[plan].limits.locations;
  if (limit === -1) return -1; // Unlimited
  return Math.max(0, limit - currentLocations);
}

// Check if team member limit is reached
export function canAddTeamMember(plan: PlanTier, currentMembers: number): boolean {
  const limit = PLANS[plan].limits.teamMembers;
  if (limit === -1) return true;
  return currentMembers < limit;
}

// Check if boost limit is reached
export function canBoostOffer(plan: PlanTier, currentBoosts: number): boolean {
  const limit = PLANS[plan].limits.boostsPerMonth;
  if (limit === -1) return true;
  return currentBoosts < limit;
}

export default PLANS;
