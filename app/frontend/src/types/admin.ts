// Admin Dashboard Types

export interface AdminStats {
  total_users: number
  premium_users: number
  total_offers: number
  total_redemptions: number
  total_partners: number
  active_partners: number
  total_trips: number
  total_gems: number
  avg_safety_score?: number
  incidents_today?: number
  revenue?: number
  total_mrr?: number
}

export interface AdminAnalytics {
  summary: {
    total_users: number
    premium_users: number
    total_partners: number
    active_partners: number
    total_offers: number
    total_trips: number
    total_redemptions: number
    total_gems: number
    total_mrr: number
  }
  queues: {
    incident_review: number
    consent_pending: number
    fraud_flags: number
  }
}

export interface ChartDataPoint {
  date: string
  new_users: number
  active_users: number
  redemptions: number
  revenue: number
}

export interface AdminUser {
  id: string
  email: string
  name: string
  plan: string
  gems: number
  level: number
  xp: number
  safety_score: number
  total_trips: number
  total_miles: number
  is_premium: boolean
  status: string
  role: string
  state: string
  city: string
  created_at: string
}

export interface AdminIncident {
  id: string
  type: string
  description: string
  location: string
  lat: number
  lng: number
  severity: string
  confidence: number
  status: 'pending' | 'approved' | 'rejected'
  image_url: string
  is_blurred: boolean
  reported_by: string
  moderated_by: string
  moderated_at: string
  created_at: string
}

export interface RoadReport {
  id: string
  type: string
  location: string
  severity: string
  reported_at: string
  status: string
}

export interface Partner {
  id: string
  business_name: string
  email: string
  business_type: string
  plan: string
  status: string
  is_approved: boolean
  is_founders: boolean
  subscription_status: string
  total_redemptions: number
  phone: string
  address: string
  created_at: string
}

export interface Campaign {
  id: string
  partner_id: string
  name: string
  description: string
  type: string
  budget: number
  start_date: string
  end_date: string
  status: string
  impressions: number
  clicks: number
  conversions: number
  revenue: number
  created_at: string
}

export interface Reward {
  id: string
  name: string
  type: string
  value: number
  gems_cost: number
  description: string
  claimed: number
  total: number
  status: string
  expires_at: string
  created_at: string
}

export interface Notification {
  id: string
  profile_id: string
  type: string
  title: string
  message: string
  priority: string
  status: string
  recipients: string
  is_read: boolean
  created_at: string
}

export interface AuditEntry {
  id: string
  action: string
  actor: string
  target: string
  ip_address: string
  status: string
  details: string
  created_at: string
}

export interface LegalDocument {
  id: string
  name: string
  type: string
  status: string
  version: string
  description: string
  content: string
  is_required: boolean
  last_updated: string
  created_at: string
}

export interface FinanceData {
  summary: {
    mrr_user_plans: number
    mrr_partners: number
    redemption_fees: number
    total_mrr: number
  }
}

export interface ReferralAnalyticsData {
  summary: {
    total_signups: number
    verified_30d: number
    cost_per_signup: number
    credits_issued: number
  }
  top_referrers: Array<{
    email: string
    signups: number
    credits: number
    tier: string
  }>
}

export interface Boost {
  id: string
  offer_id: string
  partner_id: string
  budget: number
  duration_days: number
  target_radius_miles: number
  status: string
  impressions: number
  clicks: number
  started_at: string
  ends_at: string
}

export interface PlatformSettings {
  [key: string]: Record<string, any>
}

export interface AdminApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
  source?: string
  total?: number
}

// AI Moderation Types
export type IncidentTab = 'new' | 'blurred' | 'review' | 'approved' | 'rejected'

export interface Incident {
  id: string | number
  type: string
  confidence: number
  status: 'new' | 'review' | 'approved' | 'rejected'
  blurred: boolean
  location: string
  reportedAt: string
}

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

export interface AIModerationTabProps {
  theme: 'dark' | 'light'
}

export interface FigmaUsersTabProps {
  theme: 'dark' | 'light'
  onExport: () => void
}

// WebSocket types
export type WebSocketStatus = 'live' | 'connecting' | 'offline'

export interface WSMessage {
  type: 'pong' | 'backlog' | 'new_incident' | 'moderation_update' | 'admin_count' | 'telemetry_snapshot' | 'telemetry_event' | 'monitor_connected'
  admin_count?: number
  incidents?: AdminIncident[]
  incident?: AdminIncident
  incident_id?: number
  outcome?: 'approved' | 'rejected'
  count?: number
  events?: TelemetryEvent[]
  event?: TelemetryEvent
}

export interface TelemetryEvent {
  id: string
  timestamp: string
  method: string
  path: string
  status_code: number
  duration_ms: number
  severity: 'info' | 'warn' | 'error'
  error?: string | null
  error_stack?: string | null
}

