/**
 * SnapRoad Admin API Service
 * Centralized API calls for the Admin Portal
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- transitional: replace `any` with typed generics per endpoint incrementally */

import type {
  AdminStats,
  AdminAnalytics,
  AdminUser,
  AdminIncident,
  AdminApiResponse,
  Partner,
  Campaign,
  Reward,
  Notification,
  AuditEntry,
  LegalDocument,
  FinanceData,
  ReferralAnalyticsData,
  Boost,
  PlatformSettings,
  AdminFeeSummaryItem,
  AdminOfferAnalyticsRow,
  AdminRealtimeSummary,
  AdminRealtimeFeedItem,
} from '@/types/admin'
import { getApiBaseUrl } from '@/services/api'
import { messageFromHttpJson } from '@/lib/httpErrorMessage'
import { useAuthStore } from '@/store/authStore'

// ==================== PASTE-LINK OFFER TYPES ====================

/** Server response from POST /api/admin/offers/unfurl. */
export interface UnfurlPreview {
  source_url: string
  final_url: string
  title: string | null
  description: string | null
  image_url: string | null
  merchant_name: string | null
  merchant_domain: string | null
  regular_price: number | null
  sale_price: number | null
  currency: string | null
  asin: string | null
  extractor: 'jsonld_product' | 'open_graph' | 'html_fallback' | 'amazon_paapi' | 'none'
  notes: string[]
  amazon_paapi_configured: boolean
  raw_metadata: Record<string, unknown>
}

export interface OnlineOfferUpsertPayload {
  source_url: string
  affiliate_url?: string | null
  asin?: string | null
  title: string
  description?: string | null
  merchant_name?: string | null
  merchant_domain?: string | null
  image_url?: string | null
  regular_price?: number | null
  sale_price?: number | null
  currency?: string | null
  discount_label?: string | null
  category_slug?: string | null
  category_label?: string | null
  featured?: boolean
  status?: 'active' | 'inactive' | 'draft'
  expires_at?: string | null
}

export interface OnlineOfferRow extends OnlineOfferUpsertPayload {
  id: string
  created_by?: string | null
  created_at?: string | null
  updated_at?: string | null
}

/** Body of POST /api/admin/offers/from-link — destination picks the table. */
export type OfferFromLinkPayload =
  | { destination: 'online'; online: OnlineOfferUpsertPayload }
  | {
      destination: 'local'
      local: {
        business_name: string
        business_type: string
        description: string
        title?: string | null
        discount_percent?: number
        is_free_item?: boolean
        base_gems?: number | null
        lat?: number
        lng?: number
        expires_hours?: number
        image_url?: string | null
        offer_url?: string | null
        affiliate_tracking_url?: string | null
        external_id?: string | null
        original_price?: number | null
        sale_price?: number | null
        source_url?: string | null
        offer_source?: string
      }
    }

class AdminApiService {
  private token: string | null = null

  /**
   * Admin JWT is stored in localStorage for SPA compatibility; any XSS in this origin could exfiltrate it.
   * Mitigations: strict CSP (see app/frontend/vercel.json), trusted dependencies only, short-lived tokens.
   * Longer term: move admin session to an httpOnly, Secure, SameSite cookie issued by the API.
   */
  setToken(token: string | null) {
    this.token = token
    if (token) {
      localStorage.setItem('snaproad_admin_token', token)
    } else {
      localStorage.removeItem('snaproad_admin_token')
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('snaproad_admin_token')
    }
    return this.token
  }

  private async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<AdminApiResponse<T>> {
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
      if (!response.ok) {
        let msg = ''
        try {
          const payload = await response.clone().json()
          msg = messageFromHttpJson(payload, response.status)
        } catch {
          msg = messageFromHttpJson(null, response.status)
        }
        if (response.status === 401) {
          this.setToken(null)
          try {
            useAuthStore.getState().logout()
          } catch {
            /* store unavailable in rare bootstrap cases */
          }
        }
        throw new Error(msg)
      }
      return await response.json()
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }

  // ==================== STATS & ANALYTICS ====================

  async getStats(): Promise<AdminApiResponse<AdminStats>> {
    return this.request('/api/admin/stats')
  }

  /** Cross-user gem ledger (`wallet_transactions`) for admin review; optional `userId` / `txType` filter. */
  async getWalletLedger(userId?: string, limit = 200, txType?: string): Promise<AdminApiResponse<any[]>> {
    const qs = new URLSearchParams({ limit: String(limit) })
    if (userId) qs.set('user_id', userId)
    if (txType) qs.set('tx_type', txType)
    return this.request(`/api/admin/wallet-ledger?${qs.toString()}`)
  }

  async getRedemptions(params?: {
    user_id?: string
    status?: string
    limit?: number
  }): Promise<AdminApiResponse<any[]>> {
    const qs = new URLSearchParams()
    if (params?.user_id) qs.set('user_id', params.user_id)
    if (params?.status) qs.set('status', params.status)
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const suffix = qs.toString() ? `?${qs.toString()}` : ''
    return this.request(`/api/admin/redemptions${suffix}`)
  }

  async setOfferStatus(offerId: string, status: 'active' | 'inactive' | 'paused' | 'rejected'): Promise<AdminApiResponse<any>> {
    return this.request(`/api/admin/offers/${offerId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    })
  }

  async getAnalytics(): Promise<AdminApiResponse<AdminAnalytics>> {
    return this.request('/api/admin/analytics')
  }

  // ==================== USERS ====================

  async getUsers(limit: number = 100): Promise<AdminApiResponse<AdminUser[]>> {
    return this.request(`/api/admin/users?limit=${limit}`)
  }

  async updateUser(id: string, userData: Partial<AdminUser>): Promise<AdminApiResponse<AdminUser>> {
    return this.request(`/api/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    })
  }

  async deleteUser(id: string): Promise<AdminApiResponse<void>> {
    return this.request(`/api/admin/users/${id}`, { method: 'DELETE' })
  }

  async suspendUser(id: string): Promise<AdminApiResponse<void>> {
    return this.request(`/api/admin/users/${id}/suspend`, { method: 'POST' })
  }

  async activateUser(id: string): Promise<AdminApiResponse<void>> {
    return this.request(`/api/admin/users/${id}/activate`, { method: 'POST' })
  }

  async exportUsers(format: string = 'json'): Promise<AdminApiResponse<any>> {
    return this.request(`/api/admin/export/users?format=${format}`)
  }

  async grantPromotions(payload: {
    user_ids?: string[]
    partner_ids?: string[]
    days: number
    plan: string
    send_email?: boolean
  }): Promise<
    AdminApiResponse<{
      reference: string
      updated_users: number
      updated_partners: number
      emails_sent: number
      email_errors: string[]
    }>
  > {
    return this.request('/api/admin/promotions/grant', {
      method: 'POST',
      body: JSON.stringify({
        user_ids: payload.user_ids ?? [],
        partner_ids: payload.partner_ids ?? [],
        days: payload.days,
        plan: payload.plan,
        send_email: Boolean(payload.send_email),
      }),
    })
  }

  // ==================== INCIDENTS ====================

  async getIncidents(status?: string): Promise<AdminApiResponse<AdminIncident[]>> {
    const qs = status ? `?status=${status}` : ''
    return this.request(`/api/admin/incidents${qs}`)
  }

  async moderateIncident(id: string, outcome: string): Promise<AdminApiResponse<void>> {
    return this.request(`/api/admin/incidents/${id}/moderate`, {
      method: 'POST',
      body: JSON.stringify({ outcome }),
    })
  }

  async getModeratedIncidents(): Promise<AdminApiResponse<AdminIncident[]>> {
    return this.request('/api/admin/incidents/moderated')
  }

  // ==================== NOTIFICATIONS ====================

  async getNotifications(): Promise<AdminApiResponse<Notification[]>> {
    return this.request('/api/admin/notifications')
  }

  async createNotification(data: Partial<Notification>): Promise<AdminApiResponse<Notification>> {
    return this.request('/api/admin/notifications', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async markNotificationRead(id: string): Promise<AdminApiResponse<void>> {
    return this.request(`/api/admin/notifications/${id}/read`, { method: 'PATCH' })
  }

  // ==================== PARTNERS ====================

  async getPartners(): Promise<AdminApiResponse<Partner[]>> {
    return this.request('/api/admin/partners')
  }

  async createPartner(data: Partial<Partner>): Promise<AdminApiResponse<Partner>> {
    return this.request('/api/admin/partners', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updatePartner(id: string, data: Partial<Partner>): Promise<AdminApiResponse<Partner>> {
    return this.request(`/api/admin/partners/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deletePartner(id: string): Promise<AdminApiResponse<void>> {
    return this.request(`/api/admin/partners/${id}`, { method: 'DELETE' })
  }

  async approvePartner(id: string): Promise<AdminApiResponse<void>> {
    return this.request(`/api/admin/partners/${id}/approve`, { method: 'POST' })
  }

  async suspendPartner(id: string): Promise<AdminApiResponse<void>> {
    return this.request(`/api/admin/partners/${id}/suspend`, { method: 'POST' })
  }

  // ==================== CAMPAIGNS ====================

  async getCampaigns(): Promise<AdminApiResponse<Campaign[]>> {
    return this.request('/api/admin/campaigns')
  }

  async createCampaign(data: Partial<Campaign>): Promise<AdminApiResponse<Campaign>> {
    return this.request('/api/admin/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateCampaign(id: string, data: Partial<Campaign>): Promise<AdminApiResponse<Campaign>> {
    return this.request(`/api/admin/campaigns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteCampaign(id: string): Promise<AdminApiResponse<void>> {
    return this.request(`/api/admin/campaigns/${id}`, { method: 'DELETE' })
  }

  async activateCampaign(id: string): Promise<AdminApiResponse<void>> {
    return this.request(`/api/admin/campaigns/${id}/activate`, { method: 'POST' })
  }

  // ==================== REWARDS ====================

  async getRewards(): Promise<AdminApiResponse<Reward[]>> {
    return this.request('/api/admin/rewards')
  }

  async createReward(data: Partial<Reward>): Promise<AdminApiResponse<Reward>> {
    return this.request('/api/admin/rewards', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateReward(id: string, data: Partial<Reward>): Promise<AdminApiResponse<Reward>> {
    return this.request(`/api/admin/rewards/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteReward(id: string): Promise<AdminApiResponse<void>> {
    return this.request(`/api/admin/rewards/${id}`, { method: 'DELETE' })
  }

  async claimReward(id: string, userId: string): Promise<AdminApiResponse<void>> {
    return this.request(`/api/admin/rewards/${id}/claim`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    })
  }

  // ==================== OFFERS ====================

  async getOffers(status: string = 'all'): Promise<AdminApiResponse<any[]>> {
    return this.request(`/api/admin/offers?status=${status}`)
  }

  async createOffer(data: any): Promise<AdminApiResponse<any>> {
    return this.request('/api/admin/offers', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateOffer(id: string, data: any): Promise<AdminApiResponse<any>> {
    return this.request(`/api/admin/offers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteOffer(id: string): Promise<AdminApiResponse<void>> {
    return this.request(`/api/admin/offers/${id}`, { method: 'DELETE' })
  }

  async exportOffers(format: string = 'json'): Promise<AdminApiResponse<any>> {
    return this.request(`/api/admin/export/offers?format=${format}`)
  }

  // ==================== PASTE-LINK OFFERS (URL unfurler) ====================

  /**
   * Server-side fetches the URL and returns a metadata preview
   * (title, image, regular_price, sale_price, currency, merchant). No DB write.
   */
  async unfurlOfferLink(url: string): Promise<AdminApiResponse<UnfurlPreview>> {
    return this.request('/api/admin/offers/unfurl', {
      method: 'POST',
      body: JSON.stringify({ url }),
    })
  }

  /** Publish an admin-edited preview as either an online or local offer. */
  async createOfferFromLink(payload: OfferFromLinkPayload): Promise<AdminApiResponse<any>> {
    return this.request('/api/admin/offers/from-link', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  async getOnlineOffers(status: string = 'all', limit = 200): Promise<AdminApiResponse<OnlineOfferRow[]>> {
    return this.request(`/api/admin/online-offers?status=${encodeURIComponent(status)}&limit=${limit}`)
  }

  async createOnlineOffer(data: OnlineOfferUpsertPayload): Promise<AdminApiResponse<OnlineOfferRow>> {
    return this.request('/api/admin/online-offers', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateOnlineOffer(id: string, patch: Partial<OnlineOfferUpsertPayload>): Promise<AdminApiResponse<OnlineOfferRow>> {
    return this.request(`/api/admin/online-offers/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    })
  }

  async deleteOnlineOffer(id: string): Promise<AdminApiResponse<void>> {
    return this.request(`/api/admin/online-offers/${encodeURIComponent(id)}`, { method: 'DELETE' })
  }

  async importGrouponDeals(area: string = 'Columbus, OH', category?: string, limit: number = 20): Promise<AdminApiResponse<any>> {
    const params = new URLSearchParams({ area, limit: String(limit) })
    if (category) params.set('category', category)
    return this.request(`/api/admin/offers/import-groupon?${params}`, { method: 'POST' })
  }

  async approveImports(deals: any[]): Promise<AdminApiResponse<any>> {
    return this.request('/api/admin/offers/approve-imports', {
      method: 'POST',
      body: JSON.stringify(deals),
    })
  }

  async enrichOfferWithYelp(offerId: string): Promise<AdminApiResponse<any>> {
    return this.request(`/api/admin/offers/${offerId}/enrich-yelp`, { method: 'POST' })
  }

  async uploadExcel(file: File): Promise<AdminApiResponse<any>> {
    const url = `${getApiBaseUrl()}/api/admin/offers/upload-excel`
    const token = this.getToken()
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(url, {
      method: 'POST',
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
      body: formData,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return {
        success: false,
        message: (data as { message?: string })?.message || `Upload failed (${res.status})`,
        ...(typeof data === 'object' && data !== null ? data : {}),
      }
    }
    return data
  }

  getTemplateUrl(): string {
    return `${getApiBaseUrl()}/api/admin/offers/upload-template`
  }

  /** Authenticated .xlsx download (plain URL alone returns 401 for admin routes). */
  async downloadOfferUploadTemplate(): Promise<Blob> {
    const url = `${getApiBaseUrl()}/api/admin/offers/upload-template`
    const token = this.getToken()
    const res = await fetch(url, {
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    })
    if (!res.ok) {
      throw new Error(`Template download failed (${res.status})`)
    }
    return res.blob()
  }

  // ==================== FINANCE ====================

  async getFinance(): Promise<AdminApiResponse<FinanceData>> {
    return this.request('/api/admin/finance')
  }

  async getFeeSummary(monthYear?: string): Promise<AdminApiResponse<AdminFeeSummaryItem[]>> {
    const qs = monthYear ? `?month_year=${encodeURIComponent(monthYear)}` : ''
    return this.request(`/api/admin/fees/summary${qs}`)
  }

  async getPartnerFeeHistory(partnerId: string, limit: number = 12): Promise<AdminApiResponse<any[]>> {
    return this.request(`/api/admin/fees/partner/${partnerId}?limit=${limit}`)
  }

  async getOfferAnalytics(limit: number = 200): Promise<AdminApiResponse<AdminOfferAnalyticsRow[]>> {
    return this.request(`/api/admin/offers/analytics?limit=${limit}`)
  }

  async getRealtimeSummary(): Promise<AdminApiResponse<AdminRealtimeSummary>> {
    return this.request('/api/admin/realtime/summary')
  }

  async getRealtimeFeed(limit: number = 50): Promise<AdminApiResponse<AdminRealtimeFeedItem[]>> {
    return this.request(`/api/admin/realtime/feed?limit=${limit}`)
  }

  async getRealtimeMapData(): Promise<AdminApiResponse<any[]>> {
    return this.request('/api/admin/realtime/map-data')
  }

  // ==================== REFERRAL ANALYTICS ====================

  async getReferralAnalytics(): Promise<AdminApiResponse<ReferralAnalyticsData>> {
    return this.request('/api/admin/referral-analytics')
  }

  // ==================== LEGAL DOCUMENTS ====================

  async getLegalDocuments(): Promise<AdminApiResponse<LegalDocument[]>> {
    return this.request('/api/admin/legal-documents')
  }

  async createLegalDocument(data: Partial<LegalDocument>): Promise<AdminApiResponse<LegalDocument>> {
    return this.request('/api/admin/legal-documents', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateLegalDocument(id: string, data: Partial<LegalDocument>): Promise<AdminApiResponse<LegalDocument>> {
    return this.request(`/api/admin/legal-documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  // ==================== AUDIT LOG ====================

  async getAuditLog(limit: number = 50): Promise<AdminApiResponse<AuditEntry[]>> {
    return this.request(`/api/admin/audit-log?limit=${limit}`)
  }

  // ==================== SETTINGS ====================

  async getSettings(): Promise<AdminApiResponse<PlatformSettings>> {
    return this.request('/api/admin/settings')
  }

  async updateSettings(data: Record<string, any>): Promise<AdminApiResponse<any>> {
    return this.request('/api/admin/settings', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // ==================== BOOSTS ====================

  async getBoosts(partnerId?: string): Promise<AdminApiResponse<Boost[]>> {
    const qs = partnerId ? `?partner_id=${partnerId}` : ''
    return this.request(`/api/boosts${qs}`)
  }

  async createBoost(data: any): Promise<AdminApiResponse<Boost>> {
    return this.request('/api/boosts/create', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async cancelBoost(id: string): Promise<AdminApiResponse<void>> {
    return this.request(`/api/boosts/${id}`, { method: 'DELETE' })
  }

  async calculateBoostCost(data: { duration_days: number; reach_target: number }): Promise<AdminApiResponse<any>> {
    return this.request('/api/boosts/calculate', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // ==================== CONCERNS (admin intelligence) ====================

  async getConcerns(params?: { limit?: number; severity?: string; status?: string }): Promise<AdminApiResponse<{ concerns: any[]; total: number }>> {
    const sp = new URLSearchParams()
    if (params?.limit != null) sp.set('limit', String(params.limit))
    if (params?.severity) sp.set('severity', params.severity)
    if (params?.status) sp.set('status', params.status)
    const qs = sp.toString() ? `?${sp.toString()}` : ''
    return this.request(`/api/admin/concerns${qs}`)
  }

  async updateConcernStatus(id: string, status: string): Promise<AdminApiResponse<void>> {
    return this.request(`/api/admin/concerns/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    })
  }

  async getLiveUsers(): Promise<AdminApiResponse<{ users: any[] }>> {
    return this.request('/api/admin/live-users')
  }

  async getHealth(): Promise<AdminApiResponse<any>> {
    return this.request('/api/admin/health')
  }

  async getConfig(): Promise<AdminApiResponse<Record<string, any>>> {
    return this.request('/api/admin/config')
  }

  /** Config values plus per-key updated_at / updated_by for audit display in Operations UI. */
  async getConfigDetailed(): Promise<
    AdminApiResponse<{
      config: Record<string, any>
      meta: Record<string, { updated_at?: string | null; updated_by?: string | null }>
    }>
  > {
    return this.request('/api/admin/config/detailed')
  }

  async updateConfig(
    config: Record<string, unknown>,
    opts?: { reason?: string },
  ): Promise<AdminApiResponse<Record<string, unknown>>> {
    const body: Record<string, unknown> = { ...config }
    const r = opts?.reason?.trim()
    if (r) body._reason = r
    return this.request('/api/admin/config', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  /** Active road reports for admin live map overlay. */
  async getAdminRoadReports(limit: number = 400): Promise<AdminApiResponse<{ reports: any[] }>> {
    return this.request(`/api/admin/map/road-reports?limit=${limit}`)
  }

  /** Partner store locations for admin live map (hotspots). */
  async getAdminPartnerMapLocations(limit: number = 500): Promise<AdminApiResponse<{ locations: any[] }>> {
    return this.request(`/api/admin/map/partner-locations?limit=${limit}`)
  }

  // ==================== SUPABASE STATUS ====================

  async getSupabaseStatus(): Promise<AdminApiResponse<any>> {
    return this.request('/api/admin/supabase/status')
  }

  /** Aggregate API traffic by route prefix (recent in-memory buffer on API). */
  async getAppUsageTelemetry(limit: number = 500): Promise<
    AdminApiResponse<{
      events_in_buffer: number
      api_events_counted: number
      top_prefixes: { prefix: string; count: number }[]
      top_paths: { path: string; count: number }[]
    }>
  > {
    return this.request(`/api/admin/telemetry/app-usage?limit=${limit}`)
  }

  /** High-level KPI roll-up for the System Health panel. Aggregate counts only — no PII. */
  async getMetricsOverview(): Promise<
    AdminApiResponse<{
      total_users: number
      active_users_today: number
      routes_started: number
      routes_completed: number
      rewards_issued: number
      rewards_redeemed: number
    }>
  > {
    return this.request('/api/admin/metrics/overview')
  }

  /**
   * SLO rates + per-signal status badges.
   * Rates can be `null` when there are no samples yet (cold start, empty
   * tables); render those as "—" and trust the `status` field, which already
   * defaults to "ok" in that case.
   */
  async getMetricsSlo(): Promise<
    AdminApiResponse<{
      api_success_rate: number | null
      error_rate: number | null
      reward_success_rate: number | null
      route_completion_rate: number | null
      crash_free_sessions: number | null
      samples: {
        api_total: number
        api_errors: number
        rewards_total: number
        rewards_verified: number
        trips_total: number
        trips_completed: number
      }
      thresholds: Record<string, Record<string, number>>
      status: {
        api: 'ok' | 'warning' | 'critical'
        rewards: 'ok' | 'warning' | 'critical'
        routes: 'ok' | 'warning' | 'critical'
        crash_free: 'ok' | 'warning' | 'critical'
        overall: 'ok' | 'warning' | 'critical'
      }
    }>
  > {
    return this.request('/api/admin/metrics/slo')
  }
}

export const adminApi = new AdminApiService()
export { AdminApiService }
export default adminApi
