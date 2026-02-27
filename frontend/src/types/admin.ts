/**
 * SnapRoad Admin Types
 * Types for admin portal APIs
 */

// ==================== ADMIN STATS ====================
export interface AdminStats {
  total_users: number;
  premium_users: number;
  total_offers: number;
  total_redemptions: number;
  total_partners: number;
  avg_safety_score?: number;
}

export interface AdminAnalytics {
  summary: {
    total_users: number;
    premium_users: number;
    total_offers: number;
    total_redemptions: number;
    total_revenue: number;
    avg_safety_score: number;
  };
  chart_data: ChartDataPoint[];
  user_growth: {
    today: number;
    this_week: number;
    this_month: number;
  };
  top_partners: TopPartner[];
}

export interface ChartDataPoint {
  date: string;
  new_users: number;
  active_users: number;
  redemptions: number;
  revenue: number;
}

export interface TopPartner {
  name: string;
  redemptions: number;
}

// ==================== USER MANAGEMENT ====================
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  plan: 'free' | 'basic' | 'premium' | 'family';
  gems: number;
  safety_score: number;
  total_trips: number;
  is_premium: boolean;
  status: 'active' | 'suspended';
  created_at: string;
  last_seen?: string;
  level?: number;
}

// ==================== INCIDENTS / MODERATION ====================
export interface AdminIncident {
  id: number;
  type: string;
  confidence: number;
  status: 'new' | 'review' | 'approved' | 'rejected';
  blurred: boolean;
  location: string;
  reportedAt: string;
  lat?: number;
  lng?: number;
  user_id?: string;
  image_url?: string;
}

export interface ModerationOutcome {
  incident_id: number;
  outcome: 'approved' | 'rejected';
}

// ==================== WEBSOCKET MESSAGES ====================
export type WebSocketStatus = 'connecting' | 'live' | 'offline';

export interface WSMessage {
  type: 'connection' | 'pong' | 'backlog' | 'new_incident' | 'moderation_update';
  admin_count?: number;
  incidents?: AdminIncident[];
  incident?: AdminIncident;
  incident_id?: number;
  outcome?: 'approved' | 'rejected';
  timestamp?: string;
}

// ==================== ROAD REPORTS ====================
export interface RoadReport {
  id: number;
  type: string;
  lat: number;
  lng: number;
  address?: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  user_id: string;
  user_name?: string;
  upvotes: number;
  status: 'active' | 'resolved' | 'expired';
  created_at: string;
  expires_at?: string;
}

// ==================== API RESPONSES ====================
export interface AdminApiResponse<T> {
  success: boolean;
  data?: T;
  source?: 'supabase' | 'mock';
  total?: number;
  message?: string;
  error?: string;
}

// ==================== MODERATION TAB ====================
export type IncidentTab = 'new' | 'blurred' | 'review' | 'approved' | 'rejected';
