export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  /** Present when `success` is false and the HTTP status is known. */
  statusCode?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  isPremium: boolean;
  isFamilyPlan: boolean;
  gems: number;
  level: number;
  safetyScore: number;
  streak: number;
  totalMiles: number;
  totalTrips: number;
  badges: number;
  /** Total XP from profile API */
  xp?: number;
  plan?: string;
  gem_multiplier?: number;
  vehicle_height_meters?: number;
  /** car | motorcycle — from profiles.vehicle_type */
  vehicle_type?: 'car' | 'motorcycle';
  /** From GET /api/user/profile — server-computed gamification score */
  snapRoadScore?: number;
  snapRoadTier?: string;
  snapRoadBreakdown?: {
    safetyPts: number;
    streakPts: number;
    milesPts: number;
    gemsPts: number;
  };
  /** Admin-granted time-boxed access (see GET /api/user/profile) */
  promotion_access_until?: string;
  promotion_plan?: string;
  promotion_active?: boolean;
  /** When `admin`, in-app downgrade to basic is blocked (admin-set tier). */
  plan_entitlement_source?: string;
}

export interface ApiUser {
  id?: string;
  email?: string;
  name?: string;
  full_name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  date_of_birth: string;
  referral_code?: string;
}

export interface AuthResponse {
  user?: Record<string, unknown>;
  token?: string;
}

export interface Trip {
  id: string;
  date: string;
  time?: string;
  origin: string;
  destination: string;
  distance_miles: number;
  duration_minutes: number;
  safety_score: number;
  gems_earned: number;
  xp_earned: number;
  fuel_used_gallons?: number;
  avg_speed_mph?: number;
  route_coordinates?: { lat: number; lng: number }[];
}

export interface FamilyMember {
  id: string;
  name: string;
  email?: string;
  role: string;
  avatar?: string;
  is_sharing?: boolean;
  lat?: number;
  lng?: number;
  speed_mph?: number;
  last_updated?: string;
  sos_active?: boolean;
}

export interface FamilyGroup {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  members: FamilyMember[];
}

export interface FamilyEvent {
  id: string;
  group_id: string;
  member_id: string;
  member_name?: string;
  type: string;
  place_name?: string;
  message: string;
  created_at: string;
}

export interface Friend {
  id: string;
  friend_id: string;
  name: string;
  email?: string;
  /** Resolved from `avatar_url` on the API. */
  avatar?: string;
  status: string;
  lat?: number;
  lng?: number;
  speed_mph?: number;
  heading?: number;
  is_sharing?: boolean;
  last_updated?: string;
  is_navigating?: boolean;
  destination_name?: string;
  battery_pct?: number | null;
  categories?: FriendCategory[];
}

export interface FriendCategory {
  id: string;
  name: string;
  color?: string;
  friend_count?: number;
}

/** Map tab: navigate with live-follow when `isLiveFresh` and updates remain fresh. */
export interface NavigateToFriendParams {
  friendId: string;
  name: string;
  lat: number;
  lng: number;
  nonce: number;
  isLiveFresh: boolean;
  lastUpdated?: string;
}

/** Map tab: fly to friend's marker. Optional coords when list is fresher than map state. */
export interface MapFocusFriendParams {
  friendId: string;
  nonce: number;
  lat?: number;
  lng?: number;
}

export interface Offer {
  id: number | string;
  business_name: string;
  /** Promo / offer headline when set (partner dashboard). */
  title?: string;
  description?: string;
  discount_percent: number;
  gem_cost?: number;
  gems_reward: number;
  address?: string;
  image_url?: string;
  lat?: number;
  lng?: number;
  business_type?: string;
  /** Normalized category title from API (`attach_offer_category_fields`). */
  category_label?: string;
  redeemed?: boolean;
  /** User's redemption row id when redeemed (driver app). */
  redemption_id?: string | null;
  redemption?: {
    status?: string;
    redeemed_at?: string;
    gems_spent?: number;
  } | null;
  expires_at?: string;
  distance_km?: number;
  is_admin_offer?: boolean;
  offer_type?: 'partner' | 'admin';
  view_count?: number;
  visit_count?: number;
  redemption_count?: number;
  boost_multiplier?: number;
  allocated_locations?: string[];
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  progress: number;
  goal: number;
  target?: number;
  gems: number;
  completed: boolean;
  claimed?: boolean;
  type?: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  /** Backend / ALL_BADGES icon slug (Ionicons name where valid). */
  icon?: string;
  category: string;
  earned: boolean;
  progress: number;
}

export interface WeeklyInsights {
  total_trips: number;
  total_miles: number;
  total_duration_minutes: number;
  gems_earned_week: number;
  safety_score_avg: number;
  safety_score_change: number;
  ai_tip?: string;
}

export interface SavedRoute {
  id: number;
  name: string;
  origin: string;
  destination: string;
  departure_time: string;
  days_active: string[];
  estimated_time: number;
  distance: number;
  is_active: boolean;
  notifications: boolean;
}

/** Supabase-backed commute alerts (A→B, leave-by, push). */
export interface CommuteRoute {
  id: string;
  name: string;
  origin_lat: number;
  origin_lng: number;
  origin_label: string;
  dest_lat: number;
  dest_lng: number;
  dest_label: string;
  leave_by_time: string;
  tz: string;
  alert_minutes_before: number;
  days_of_week: string[];
  notifications_enabled: boolean;
  created_at?: string;
}

export interface SavedLocation {
  id: number;
  name: string;
  address: string;
  category: string;
  lat?: number;
  lng?: number;
}

export interface FriendLocation {
  id: string;
  name: string;
  avatar?: string;
  lat: number;
  lng: number;
  heading: number;
  speedMph: number;
  isNavigating: boolean;
  destinationName?: string;
  lastUpdated: string;
  isSharing: boolean;
  batteryPct?: number | null;
  isFamilyMember?: boolean;
  sosActive?: boolean;
}

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface Incident {
  id: string | number;
  type: string;
  lat: number;
  lng: number;
  title: string;
  severity: string;
  description?: string;
  upvotes: number;
  /** Peer downvotes; backend removes when downvotes > upvotes. */
  downvotes?: number;
  created_at: string;
  expires_at: string;
  distance_miles?: number;
}

export type DrivingMode = 'calm' | 'adaptive' | 'sport';
export type PlanTier = 'basic' | 'premium' | 'family';
