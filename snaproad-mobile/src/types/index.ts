// SnapRoad Mobile - Type Definitions

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  plan: 'basic' | 'premium';
  
  // Gamification
  xp: number;
  level: number;
  gems: number;
  safetyScore: number;
  
  // Car
  carCategory: 'sedan' | 'suv' | 'truck';
  carVariant: string;
  carColor: string;
  
  // Stats
  totalMiles: number;
  totalTrips: number;
  totalSavings: number;
  
  // Location
  state: string;
  city: string;
  
  // Flags
  onboardingComplete: boolean;
  isPremium: boolean;
}

export interface Offer {
  id: number;
  businessName: string;
  businessType: 'gas' | 'cafe' | 'restaurant' | 'carwash' | 'retail';
  description: string;
  discountPercent: number;
  baseGems: number;
  premiumGems?: number;
  lat: number;
  lng: number;
  distance?: string;
  expiresAt: string;
  imageUrl?: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'driving' | 'social' | 'exploration' | 'safety';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  earned: boolean;
  earnedAt?: string;
  progress?: number;
  requirement?: number;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'weekly' | 'head_to_head' | 'community';
  goalType: 'miles' | 'trips' | 'score';
  goalValue: number;
  currentProgress: number;
  rewardXp: number;
  rewardGems: number;
  startsAt: string;
  endsAt: string;
  participants?: number;
  joined: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatar?: string;
  score: number;
  level: number;
  state: string;
  isCurrentUser?: boolean;
}

export interface Trip {
  id: string;
  startLocation: string;
  endLocation: string;
  distance: number;
  duration: number;
  safetyScore: number;
  xpEarned: number;
  gemsEarned: number;
  date: string;
}

export interface CarOption {
  id: string;
  category: 'sedan' | 'suv' | 'truck';
  name: string;
  colors: CarColor[];
}

export interface CarColor {
  id: string;
  name: string;
  hex: string;
  tier: 'standard' | 'metallic' | 'premium';
  gemsRequired: number;
  owned: boolean;
}

export interface GasStation {
  id: string;
  name: string;
  address: string;
  price: number;
  distance: string;
  lat: number;
  lng: number;
}

export interface RoadReport {
  id: string;
  type: 'pothole' | 'construction' | 'accident' | 'hazard' | 'police';
  description: string;
  lat: number;
  lng: number;
  reportedAt: string;
  confirmedCount: number;
}

// Navigation Types
export type RootStackParamList = {
  Onboarding: undefined;
  MainApp: undefined;
  OfferDetail: { offer: Offer };
  BadgeDetail: { badge: Badge };
  ChallengeDetail: { challenge: Challenge };
  TripDetail: { trip: Trip };
  Settings: undefined;
  CarStudio: undefined;
  Leaderboard: undefined;
};

export type MainTabParamList = {
  Map: undefined;
  Offers: undefined;
  Rewards: undefined;
  Profile: undefined;
};
