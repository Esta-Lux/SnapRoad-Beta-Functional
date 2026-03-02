// Admin Dashboard Types
// =============================================

// Ryan's Emergent Types
export interface AdminStats {
  total_users: number;
  premium_users: number;
  total_offers: number;
  total_redemptions: number;
  total_partners: number;
  avg_safety_score?: number;
  incidents_today?: number;
  revenue?: number;
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
  top_partners: Array<{
    name: string;
    redemptions: number;
  }>;
}

export interface ChartDataPoint {
  date: string;
  new_users: number;
  active_users: number;
  redemptions: number;
  revenue: number;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  plan: string;
  gems: number;
  level: number;
  safety_score: number;
  total_trips: number;
  is_premium: boolean;
  status: string;
  family_members: number;
  created_at: string;
}

export interface AdminIncident {
  id: number;
  type: string;
  confidence: number;
  status: 'new' | 'review' | 'approved' | 'rejected';
  blurred: boolean;
  location: string;
  reportedAt: string;
}

export interface RoadReport {
  id: number;
  type: string;
  location: string;
  severity: string;
  reported_at: string;
  status: string;
}

export interface AdminApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Original Types
export interface Event {
  id: string
  title: string
  description: string
  type: 'daily' | 'weekly' | 'special'
  gems_multiplier: number
  xp_bonus: number
  start_date: string
  end_date: string
  status: 'active' | 'scheduled' | 'ended'
}

export interface User {
  id: string
  name: string
  email: string
  plan: 'basic' | 'premium' | 'family'
  safety_score: number
  gems: number
  level: number
  status: 'active' | 'suspended'
}

export interface Partner {
  id: string
  business_name: string
  email: string
  business_type: string
  status: 'active' | 'pending' | 'suspended'
  created_at: string
}

// AI Moderation Types
export type IncidentTab = 'new' | 'blurred' | 'review' | 'approved' | 'rejected'

export interface Incident {
  id: number
  type: string
  confidence: number
  status: 'new' | 'review' | 'approved' | 'rejected'
  blurred: boolean
  location: string
  reportedAt: string
}

// Modal Props Types
export interface OnboardingWalkthroughProps {
  onComplete: () => void
  onSkip: () => void
}

export interface ImageGeneratorModalProps {
  onClose: () => void
  onGenerate: (imageUrl: string) => void
}

export interface CreateOfferModalProps {
  onClose: () => void
  partners: Partner[]
}

export interface ExportModalProps {
  onClose: () => void
}

export interface ImportModalProps {
  onClose: () => void
}

export interface BulkUploadModalProps {
  onClose: () => void
}

// Tab Component Props
export interface AIModerationTabProps {
  theme: 'dark' | 'light'
}

export interface FigmaUsersTabProps {
  theme: 'dark' | 'light'
  onExport: () => void
}
