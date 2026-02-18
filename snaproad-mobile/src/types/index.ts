// SnapRoad Mobile - TypeScript Types
// Aligned with /app/frontend/src/types/api.ts for consistency

// ==================== AUTH ====================
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  plan: 'basic' | 'premium' | 'family';
  gems: number;
  level: number;
  xp: number;
  safetyScore: number;
  totalTrips: number;
  totalMiles: number;
  streak: number;
  createdAt: string;
  lastActive?: string;
}

export interface UserStats {
  totalTrips: number;
  totalMiles: number;
  totalGems: number;
  avgSafetyScore: number;
  streak: number;
  badgesEarned: number;
  challengesCompleted: number;
  offersRedeemed: number;
}

export interface Vehicle {
  id: string;
  userId: string;
  type: 'sedan' | 'suv' | 'truck' | 'sports' | 'electric';
  make: string;
  model: string;
  year: number;
  color: string;
  skinId?: string;
  isDefault: boolean;
}

// ==================== AUTH REQUESTS ====================
export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  plan?: 'basic' | 'premium';
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
}

// ==================== TRIPS ====================
export interface Trip {
  id: string;
  userId: string;
  startLocation: string;
  endLocation: string;
  startTime: string;
  endTime?: string;
  distance: number;
  duration: number;
  safetyScore: number;
  gemsEarned: number;
  events: DrivingEvent[];
  status: 'active' | 'completed' | 'cancelled';
}

export interface DrivingEvent {
  type: 'speeding' | 'hard_brake' | 'rapid_accel' | 'phone_use' | 'distraction';
  timestamp: string;
  severity: 'low' | 'medium' | 'high';
  location?: { lat: number; lng: number };
}

// ==================== FAMILY ====================
export interface FamilyMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  relation: 'parent' | 'spouse' | 'child' | 'other';
  avatar?: string;
  isOnline: boolean;
  lastLocation?: {
    lat: number;
    lng: number;
    timestamp: string;
  };
  privacyMode: boolean;
  safetyScore: number;
}

export interface FamilyGroup {
  id: string;
  name: string;
  ownerId: string;
  members: FamilyMember[];
  createdAt: string;
}

// ==================== REWARDS ====================
export interface Offer {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerLogo?: string;
  title: string;
  description: string;
  discount: string;
  gemCost: number;
  category: 'gas' | 'food' | 'retail' | 'service' | 'entertainment';
  expiresAt?: string;
  isExclusive: boolean;
  redemptionCount: number;
  location?: {
    address: string;
    lat: number;
    lng: number;
  };
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'special';
  goal: number;
  progress: number;
  reward: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'expired';
  icon: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt?: string;
  progress?: number;
  requirement?: number;
}

// ==================== LEADERBOARD ====================
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatar?: string;
  safetyScore: number;
  gems: number;
  streak: number;
  level: number;
}

export interface Leaderboard {
  type: 'global' | 'regional' | 'friends';
  region?: string;
  entries: LeaderboardEntry[];
  currentUserRank?: number;
  totalParticipants: number;
  updatedAt: string;
}

// ==================== FUEL ====================
export interface FuelEntry {
  id: string;
  userId: string;
  date: string;
  gallons: number;
  pricePerGallon: number;
  totalCost: number;
  odometer: number;
  mpg?: number;
  station?: string;
  notes?: string;
}

export interface FuelStats {
  totalGallons: number;
  totalSpent: number;
  avgMpg: number;
  avgPricePerGallon: number;
  monthlySpend: number;
  savingsEstimate: number;
  efficiency: 'excellent' | 'good' | 'average' | 'poor';
}

// ==================== NOTIFICATIONS ====================
export interface Notification {
  id: string;
  type: 'offer' | 'badge' | 'challenge' | 'friend' | 'system' | 'safety';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
  data?: Record<string, unknown>;
}

// ==================== INCIDENTS ====================
export interface Incident {
  id: string;
  type: 'accident' | 'hazard' | 'construction' | 'police' | 'weather' | 'other';
  description: string;
  severity: 'low' | 'medium' | 'high';
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  reportedBy: string;
  reportedAt: string;
  upvotes: number;
  status: 'active' | 'resolved' | 'expired';
  photoUrl?: string;
}

// ==================== PARTNER ====================
export interface Partner {
  id: string;
  businessName: string;
  category: string;
  logo?: string;
  description: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  rating: number;
  offerCount: number;
  totalRedemptions: number;
}

export interface PartnerAnalytics {
  totalRedemptions: number;
  totalRevenue: number;
  avgRedemptionsPerDay: number;
  topOffers: Offer[];
  recentRedemptions: {
    date: string;
    count: number;
    revenue: number;
  }[];
  demographics: {
    ageGroup: string;
    percentage: number;
  }[];
}

// ==================== ADMIN ====================
export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalTrips: number;
  totalIncidents: number;
  totalPartners: number;
  revenue: {
    thisMonth: number;
    lastMonth: number;
    growth: number;
  };
  safetyStats: {
    avgScore: number;
    improvement: number;
  };
}

// ==================== API RESPONSES ====================
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ==================== NAVIGATION ====================
export type RootStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  Login: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  Onboarding: undefined;
  PlanSelection: undefined;
  CarSetup: undefined;
  Main: undefined;
  Map: undefined;
  Gems: undefined;
  GemMarketplace: undefined;
  Family: undefined;
  LiveLocations: undefined;
  Profile: undefined;
  FuelDashboard: undefined;
  TripLogs: undefined;
  Leaderboard: undefined;
  Settings: undefined;
  AccountInfo: undefined;
  PrivacyCenter: undefined;
  NotificationSettings: undefined;
  Support: undefined;
  OfferDetail: { offerId: string };
  TripDetail: { tripId: string };
  BadgeDetail: { badgeId: string };
  ChallengeDetail: { challengeId: string };
  PartnerDetail: { partnerId: string };
};

export type BottomTabParamList = {
  MapTab: undefined;
  GemsTab: undefined;
  FamilyTab: undefined;
  ProfileTab: undefined;
};
