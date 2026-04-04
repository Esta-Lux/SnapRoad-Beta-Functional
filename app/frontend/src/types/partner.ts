export interface Offer {
  id: number
  title: string
  description: string
  discount_percent: number
  gems_reward: number
  redemption_count: number
  views: number
  visits?: number
  status: 'active' | 'paused' | 'expired'
  created_at: string
  expires_at: string
  image_url?: string
  location_id?: string
  location_name?: string
  is_boosted?: boolean
  boost_multiplier?: number
  boost_expires?: string
}

export interface PartnerRedemption {
  id?: string
  offer_id: string | number
  offer_name?: string
  business_name?: string
  fee_amount?: number
  fee_cents?: number
  fee_tier?: number
  discount_applied?: number
  user_name?: string
  customer_id?: string
  scanned_by_user_id?: string
  redeemed_at?: string
  created_at?: string
}

export interface PartnerFeeHistoryEntry {
  partner_id: string
  month_year: string
  redemption_count: number
  total_fees_cents: number
  total_fees: number
  last_redemption_at?: string
}

export interface PartnerFeeSummary {
  current_fee: number
  current_tier: number
  tier_range: string
  total_redemptions: number
  total_owed: number
  total_paid: number
  balance_due: number
  month_year?: string
  total_fees_cents?: number
  redemptions_until_next_tier?: number
  next_threshold?: number
  history?: PartnerFeeHistoryEntry[]
}

export interface PartnerLocation {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  is_primary: boolean
  created_at: string
}

export interface PartnerProfile {
  id: string
  business_name: string
  plan: string
  /** From Supabase partners.subscription_status — pending until Stripe checkout completes */
  subscription_status?: string
  /** Admin-granted $0 access (see sql/034_partner_internal_complimentary.sql) */
  is_internal_complimentary?: boolean
  /** Server-computed: false when billing incomplete and not internal */
  has_full_portal_access?: boolean
  plan_info: {
    name: string
    max_locations: number
    features: string[]
  }
  locations: PartnerLocation[]
  location_count: number
  max_locations: number
  can_add_location: boolean
  /** Admin time-boxed plan boost */
  promotion_access_until?: string
  promotion_plan?: string
  promotion_active?: boolean
}

export interface BoostConfig {
  duration_days: number
  reach_target: number
  total_cost: number
}

export interface Analytics {
  summary: {
    total_views: number
    total_clicks: number
    total_redemptions: number
    total_revenue: number
    ctr: number
    conversion_rate: number
  }
  chart_data: Array<{
    date: string
    views: number
    clicks: number
    redemptions: number
    revenue: number
    visits?: number
  }>
  geo_data: Array<{
    city: string
    redemptions: number
  }>
}
