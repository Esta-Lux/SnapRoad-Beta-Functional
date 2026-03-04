export interface Offer {
  id: number
  title: string
  description: string
  discount_percent: number
  gems_reward: number
  redemption_count: number
  views: number
  status: 'active' | 'paused' | 'expired'
  created_at: string
  expires_at: string
  image_url?: string
  location_id?: number
  location_name?: string
  is_boosted?: boolean
  boost_multiplier?: number
  boost_expires?: string
}

export interface PartnerLocation {
  id: number
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
  plan_info: {
    name: string
    max_locations: number
    features: string[]
  }
  locations: PartnerLocation[]
  location_count: number
  max_locations: number
  can_add_location: boolean
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
  }>
  geo_data: Array<{
    city: string
    redemptions: number
  }>
}
