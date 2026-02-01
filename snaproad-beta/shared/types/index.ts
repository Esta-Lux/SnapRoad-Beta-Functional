// Shared TypeScript types used across API and Admin

// User types
export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
  subscriptionTier: 'free' | 'premium' | 'family';
  subscriptionStatus: 'active' | 'cancelled' | 'past_due';
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

// Vehicle types
export interface Vehicle {
  id: string;
  userId: string;
  make: string;
  model: string;
  year: number;
  fuelType: 'gas' | 'diesel' | 'electric' | 'hybrid';
  licensePlate?: string;
  isPrimary: boolean;
  createdAt: string;
}

// Trip types
export interface Trip {
  id: string;
  userId: string;
  vehicleId?: string;
  startTime: string;
  endTime?: string;
  startLocation: GeoPoint;
  endLocation?: GeoPoint;
  startAddress?: string;
  endAddress?: string;
  distanceKm?: number;
  durationMinutes?: number;
  routeGeometry?: GeoJSON.LineString;
  drivingScore?: number;
  gemsEarned?: number;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface TripEvent {
  id: string;
  tripId: string;
  eventType: 'speeding' | 'hard_brake' | 'rapid_acceleration' | 'phone_usage';
  severity: 'low' | 'medium' | 'high';
  location: GeoPoint;
  speedKmh?: number;
  timestamp: string;
}

// Incident types
export interface Incident {
  id: string;
  userId: string;
  incidentType: 'accident' | 'hazard' | 'violation' | 'construction' | 'other';
  description?: string;
  location: GeoPoint;
  address?: string;
  status: 'pending' | 'approved' | 'rejected' | 'flagged' | 'expired';
  severity: 'low' | 'medium' | 'high' | 'critical';
  photos?: IncidentPhoto[];
  createdAt: string;
}

export interface IncidentPhoto {
  id: string;
  incidentId: string;
  originalUrl: string;
  blurredUrl?: string;
  blurStatus: 'pending' | 'processing' | 'completed' | 'failed';
  detectedFaces: number;
  detectedPlates: number;
}

// Rewards types
export interface Rewards {
  id: string;
  userId: string;
  gemsEarned: number;
  gemsSpent: number;
  gemsBalance: number;
  lifetimeGemsEarned: number;
  currentStreakDays: number;
  longestStreakDays: number;
  averageDrivingScore?: number;
  totalTrips: number;
  totalDistanceKm: number;
  season?: string;
  seasonGems: number;
  seasonRank?: number;
}

export interface RewardTransaction {
  id: string;
  userId: string;
  transactionType: 'earned' | 'redeemed' | 'adjusted' | 'expired';
  gemsAmount: number;
  balanceAfter: number;
  source: string;
  referenceId?: string;
  referenceType?: string;
  createdAt: string;
}

// Business Partner types
export interface BusinessPartner {
  id: string;
  userId?: string;
  businessName: string;
  businessType?: string;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  location?: GeoPoint;
  logoUrl?: string;
  subscriptionPlan: 'local' | 'growth' | 'enterprise';
  status: 'pending' | 'active' | 'suspended' | 'cancelled';
  totalRedemptions: number;
  createdAt: string;
}

export interface Offer {
  id: string;
  partnerId: string;
  title: string;
  description?: string;
  termsConditions?: string;
  discountPercent?: number;
  discountAmount?: number;
  gemsRequired: number;
  location?: GeoPoint;
  radiusKm: number;
  bannerUrl?: string;
  category?: string;
  status: 'active' | 'paused' | 'expired' | 'deleted';
  startDate?: string;
  endDate?: string;
  maxRedemptions?: number;
  currentRedemptions: number;
}

export interface OfferRedemption {
  id: string;
  offerId: string;
  userId: string;
  partnerId: string;
  gemsSpent: number;
  platformFee: number;
  redemptionCode: string;
  status: 'pending' | 'used' | 'expired' | 'cancelled';
  usedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

// Common types
export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
}
