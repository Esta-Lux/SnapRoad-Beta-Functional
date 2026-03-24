/**
 * SnapRoad Partner API Service
 * Centralized API calls for the Partner Portal
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- transitional: partner v2 responses vary; narrow types as contracts stabilize */

import { getApiBaseUrl } from '@/services/api'

class PartnerApiService {
  private partnerId: string = 'default_partner'
  private token: string | null = null

  setPartnerId(id: string) {
    this.partnerId = id
  }

  setToken(token: string | null) {
    this.token = token
    if (token) localStorage.setItem('snaproad_partner_token', token)
    else localStorage.removeItem('snaproad_partner_token')
  }

  getToken(): string | null {
    if (!this.token) this.token = localStorage.getItem('snaproad_partner_token')
    return this.token
  }

  private async request<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<{ success: boolean; data?: T; message?: string; token?: string; partner_id?: string }> {
    const url = `${getApiBaseUrl()}${endpoint}`
    const token = this.getToken()
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    }
    try {
      const response = await fetch(url, config)
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      return await response.json()
    } catch (error) {
      console.error('Partner API request failed:', error)
      throw error
    }
  }

  // Auth
  async login(email: string, password: string): Promise<{ success: boolean; data?: unknown; message?: string; token?: string; partner_id?: string }> {
    const result = await this.request('/api/partner/v2/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    if (result.success && result.token) {
      this.setToken(result.token)
      this.setPartnerId(result.partner_id)
      localStorage.setItem('snaproad_partner_id', result.partner_id)
    }
    return result
  }

  async register(data: { first_name: string; last_name: string; business_name: string; business_address: string; email: string; password: string; referral_code?: string }): Promise<{ success: boolean; data?: unknown; message?: string; token?: string; partner_id?: string }> {
    const result = await this.request('/api/partner/v2/register', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    if (result.success && result.token) {
      this.setToken(result.token)
      this.setPartnerId(result.partner_id)
      localStorage.setItem('snaproad_partner_id', result.partner_id)
    }
    return result
  }

  async validateScan(token: string, qr_data: string): Promise<any> {
    const result = await this.request('/partner/v2/scan/validate', {
      method: 'POST',
      body: JSON.stringify({ token, qr_data })
    })

    if (result.success) {
      // Do something on successful validation
    }
    else {
      // Report to user unsuccessful validation
    }

    return result;
  }

  logout() {
    this.setToken(null)
    this.partnerId = 'default_partner'
    localStorage.removeItem('snaproad_partner_id')
  }

  isAuthenticated(): boolean {
    return !!this.getToken()
  }

  restoreSession(): boolean {
    const token = this.getToken()
    const pid = localStorage.getItem('snaproad_partner_id')
    if (token && pid) {
      this.partnerId = pid
      return true
    }
    return false
  }

  // Profile
  async getProfile(): Promise<any> {
    return this.request(`/api/partner/profile?partner_id=${this.partnerId}`)
  }

  async updateProfile(data: { business_name?: string; email?: string }): Promise<any> {
    const params = new URLSearchParams({ partner_id: this.partnerId })
    if (data.business_name) params.set('business_name', data.business_name)
    if (data.email) params.set('email', data.email)
    return this.request(`/api/partner/profile?${params}`, { method: 'PUT' })
  }

  // Plans
  async getPlans(): Promise<any> {
    return this.request('/api/partner/plans')
  }

  async updatePlan(plan: string): Promise<any> {
    return this.request(`/api/partner/plan?partner_id=${this.partnerId}`, {
      method: 'POST',
      body: JSON.stringify({ plan }),
    })
  }

  // Locations
  async getLocations(): Promise<any> {
    return this.request(`/api/partner/locations?partner_id=${this.partnerId}`)
  }

  async addLocation(data: { name: string; address: string; lat: number; lng: number; is_primary: boolean }): Promise<any> {
    return this.request(`/api/partner/locations?partner_id=${this.partnerId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateLocation(locationId: string, data: any): Promise<any> {
    return this.request(`/api/partner/locations/${locationId}?partner_id=${this.partnerId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteLocation(locationId: string): Promise<any> {
    return this.request(`/api/partner/locations/${locationId}?partner_id=${this.partnerId}`, {
      method: 'DELETE',
    })
  }

  async setPrimaryLocation(locationId: string): Promise<any> {
    return this.request(`/api/partner/locations/${locationId}/set-primary?partner_id=${this.partnerId}`, {
      method: 'POST',
    })
  }

  // Offers
  async getOffers(): Promise<any> {
    return this.request(`/api/partner/offers?partner_id=${this.partnerId}`)
  }

  async createOffer(data: any): Promise<any> {
    return this.request(`/api/partner/offers?partner_id=${this.partnerId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateOffer(offerId: string, data: any): Promise<any> {
    return this.request(`/api/partner/offers/${offerId}?partner_id=${this.partnerId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteOffer(offerId: string): Promise<any> {
    return this.request(`/api/partner/offers/${offerId}?partner_id=${this.partnerId}`, {
      method: 'DELETE',
    })
  }

  // Boosts
  async getBoostPricing(): Promise<any> {
    return this.request('/api/partner/boosts/pricing')
  }

  async createBoost(data: { offer_id: number; boost_type: string; use_credits: boolean }): Promise<any> {
    return this.request(`/api/partner/boosts/create?partner_id=${this.partnerId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getActiveBoosts(): Promise<any> {
    return this.request(`/api/partner/boosts/active?partner_id=${this.partnerId}`)
  }

  async cancelBoost(offerId: number): Promise<any> {
    return this.request(`/api/partner/boosts/${offerId}?partner_id=${this.partnerId}`, {
      method: 'DELETE',
    })
  }

  // Credits
  async getCredits(): Promise<any> {
    return this.request(`/api/partner/credits?partner_id=${this.partnerId}`)
  }

  async addCredits(amount: number): Promise<any> {
    return this.request(`/api/partner/credits/add?partner_id=${this.partnerId}`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    })
  }

  async getCreditHistory(): Promise<any> {
    return this.request(`/api/partner/v2/credits/history/${this.partnerId}`)
  }

  async getFees(): Promise<any> {
    return this.request(`/api/partner/v2/fees/${this.partnerId}`)
  }

  async getReferralLeaderboard(): Promise<any> {
    return this.request('/api/partner/v2/referrals/leaderboard')
  }

  /** Stripe return URLs must match the running app origin (see PARTNER_PORTAL_ORIGIN / vite port). */
  private portalOriginQuery(): string {
    try {
      return `&portal_origin=${encodeURIComponent(window.location.origin)}`
    } catch {
      return ''
    }
  }

  // Stripe payments
  async subscribeToplan(plan: string): Promise<any> {
    return this.request(
      `/api/partner/v2/subscribe?partner_id=${this.partnerId}&plan=${plan}${this.portalOriginQuery()}`,
      { method: 'POST' }
    )
  }

  async purchaseBoost(offerId: string, boostType: string): Promise<any> {
    return this.request(
      `/api/partner/v2/boosts/purchase?partner_id=${this.partnerId}&offer_id=${encodeURIComponent(offerId)}&boost_type=${boostType}${this.portalOriginQuery()}`,
      { method: 'POST' }
    )
  }

  async purchaseCredits(amount: number): Promise<any> {
    return this.request(
      `/api/partner/v2/credits/purchase?partner_id=${this.partnerId}&amount=${amount}${this.portalOriginQuery()}`,
      { method: 'POST' }
    )
  }

  // Analytics (v2 partner-specific)
  async getAnalytics(): Promise<any> {
    try {
      const result = await this.request(`/api/partner/v2/analytics/${this.partnerId}`)
      if (result.success && result.data) {
        const d = result.data
        return {
          success: true,
          data: {
            summary: {
              total_views: d.total_views || 0,
              total_clicks: d.total_clicks || 0,
              total_redemptions: d.total_redemptions || 0,
              total_revenue: d.revenue || 0,
              ctr: d.conversion_rate || 0,
              conversion_rate: d.conversion_rate || 0,
            },
            chart_data: [],
            geo_data: [],
          },
        }
      }
      return result
    } catch {
      return { success: false, data: null }
    }
  }

  // Referrals
  async getReferrals(): Promise<any> {
    return this.request(`/api/partner/v2/referrals/${this.partnerId}`)
  }

  // Redemptions
  async getRedemptions(limit: number = 10): Promise<any> {
    return this.request(`/api/partner/v2/redemptions/${this.partnerId}?limit=${limit}`)
  }

  // Team Links
  async generateTeamLink(label: string = 'Team Link'): Promise<any> {
    return this.request(`/api/partner/v2/team-link/generate?partner_id=${this.partnerId}&label=${encodeURIComponent(label)}`, { method: 'POST' })
  }

  async getTeamLinks(): Promise<any> {
    return this.request(`/api/partner/v2/team-links/${this.partnerId}`)
  }

  async revokeTeamLink(linkId: string): Promise<any> {
    return this.request(`/api/partner/v2/team-link/${linkId}`, { method: 'DELETE' })
  }
}

export const partnerApi = new PartnerApiService()
export { PartnerApiService }
export default partnerApi
