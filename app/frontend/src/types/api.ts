/**
 * SnapRoad API Types
 * Shared types between frontend and backend
 * These should match the FastAPI models in /app/backend/server.py
 */

// ==================== USER TYPES ====================
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  plan: 'free' | 'premium' | 'family';
  gems: number;
  safetyScore: number;
  streak: number;
  totalMiles: number;
  badges: number;
  createdAt: string;
}

export interface UserStats {
  totalTrips: number;
  totalMiles: number;
  totalGems: number;
  avgSafetyScore: number;
  currentStreak: number;
  longestStreak: number;
  fuelSaved: number;
  co2Reduced: number;
  timeSaved: number;
}

export interface Vehicle {
  id: string;
  userId: string;
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate?: string;
  fuelType: 'gas' | 'diesel' | 'electric' | 'hybrid';
  avgMpg?: number;
}

// ==================== AUTH TYPES ====================
export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
  plan?: 'free' | 'premium' | 'family';
}

export interface AuthResponse {
  token: string;
  user: User;
}

// ==================== TRIP TYPES ====================
export interface Trip {
  id: string;
  userId: string;
  startLocation: string;
  endLocation: string;
  startTime: string;
  endTime: string;
  distance: number;
  duration: number;
  safetyScore: number;
  gemsEarned: number;
  fuelUsed?: number;
  events: TripEvent[];
}

export interface TripEvent {
  id: string;
  type: 'hard_brake' | 'rapid_accel' | 'speeding' | 'phone_use' | 'smooth_drive';
  timestamp: string;
  location?: { lat: number; lng: number };
  severity: 'low' | 'medium' | 'high';
}

// ==================== FAMILY TYPES ====================
export interface FamilyMember {
  id: string;
  userId: string;
  name: string;
  avatar?: string;
  relation: string;
  status: 'online' | 'driving' | 'offline' | 'arrived' | 'idle';
  location?: {
    lat: number;
    lng: number;
    address: string;
    lastUpdate: string;
  };
  battery?: number;
  speed?: number;
  privacyMode: boolean;
}

export interface FamilyGroup {
  id: string;
  name: string;
  ownerId: string;
  members: FamilyMember[];
  createdAt: string;
}

// ==================== REWARDS TYPES ====================
export interface Offer {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerLogo?: string;
  title: string;
  description: string;
  discount: string;
  gemsRequired: number;
  category: 'food' | 'gas' | 'auto' | 'entertainment' | 'shopping';
  expiresAt: string;
  terms?: string;
  redemptionCount: number;
  maxRedemptions?: number;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'special';
  gemsReward: number;
  progress: number;
  target: number;
  startsAt: string;
  endsAt: string;
  isCompleted: boolean;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'safety' | 'streak' | 'social' | 'milestone' | 'special';
  isEarned: boolean;
  earnedAt?: string;
  progress?: number;
  requirement?: number;
}

// ==================== LEADERBOARD TYPES ====================
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatar?: string;
  safetyScore: number;
  gems: number;
  streak: number;
  badges: number;
  carModel?: string;
  weeklyGems?: number;
  fuelSaved?: string;
}

export interface Leaderboard {
  type: 'global' | 'regional' | 'friends';
  region?: string;
  entries: LeaderboardEntry[];
  userRank?: number;
  totalParticipants: number;
}

// ==================== PARTNER TYPES ====================
export interface Partner {
  id: string;
  businessName: string;
  logo?: string;
  category: string;
  address: string;
  phone?: string;
  email: string;
  website?: string;
  isVerified: boolean;
  rating: number;
  totalRedemptions: number;
  activeOffers: number;
}

export interface PartnerAnalytics {
  totalRedemptions: number;
  totalGemsSpent: number;
  uniqueCustomers: number;
  averageRating: number;
  topOffers: { offerId: string; redemptions: number }[];
  dailyStats: { date: string; redemptions: number; revenue: number }[];
}

// ==================== ADMIN TYPES ====================
export interface AdminStats {
  totalUsers: number;
  activeToday: number;
  totalRevenue: number;
  totalIncidents: number;
  userGrowth: number;
  revenueGrowth: number;
}

export interface Incident {
  id: string;
  type: 'road_hazard' | 'accident' | 'weather' | 'construction' | 'police';
  reportedBy: string;
  location: { lat: number; lng: number; address: string };
  description: string;
  severity: 'low' | 'medium' | 'high';
  status: 'pending' | 'verified' | 'resolved' | 'dismissed';
  upvotes: number;
  reportedAt: string;
  resolvedAt?: string;
}

// ==================== FUEL TYPES ====================
export interface FuelLog {
  id: string;
  userId: string;
  vehicleId: string;
  date: string;
  gallons: number;
  pricePerGallon: number;
  totalCost: number;
  odometer: number;
  mpg?: number;
  station?: string;
}

export interface FuelStats {
  totalSpent: number;
  totalGallons: number;
  averageMpg: number;
  fuelSaved: number;
  moneySaved: number;
  co2Reduced: number;
  weeklyData: { week: string; spent: number; gallons: number; mpg: number }[];
}

// ==================== NOTIFICATION TYPES ====================
export interface Notification {
  id: string;
  userId: string;
  type: 'alert' | 'reward' | 'social' | 'system' | 'promo';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

// ==================== API RESPONSE TYPES ====================
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
  pageSize: number;
  hasMore: boolean;
}
