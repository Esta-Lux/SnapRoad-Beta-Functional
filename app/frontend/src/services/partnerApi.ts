/**
 * SnapRoad Partner API Service
 * Centralized API calls for the Partner Portal
 */

const API_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || ''

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

  private async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<{ success: boolean; data?: T; message?: string }> {
    const url = `${API_URL}${endpoint}`
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

  async updateLocation(locationId: number, data: any): Promise<any> {
    return this.request(`/api/partner/locations/${locationId}?partner_id=${this.partnerId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteLocation(locationId: number): Promise<any> {
    return this.request(`/api/partner/locations/${locationId}?partner_id=${this.partnerId}`, {
      method: 'DELETE',
    })
  }

  async setPrimaryLocation(locationId: number): Promise<any> {
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
            chart_data: d.chart_data || [],
            geo_data: d.geo_data || [],
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
}

export const partnerApi = new PartnerApiService()
export { PartnerApiService }
export default partnerApi
