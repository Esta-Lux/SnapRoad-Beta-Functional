/**
 * SnapRoad API Service
 * Centralized API calls matching backend endpoints in /app/backend/server.py
 */

import type {
  User,
  UserStats,
  Vehicle,
  LoginRequest,
  SignupRequest,
  AuthResponse,
  Trip,
  FamilyMember,
  FamilyGroup,
  Offer,
  Challenge,
  Badge,
  Leaderboard,
  Partner,
  PartnerAnalytics,
  AdminStats,
  Incident,
  FuelLog,
  FuelStats,
  Notification,
  ApiResponse,
  PaginatedResponse,
} from '@/types/api';
import { getSupabaseClient } from '@/lib/supabaseClient';

const API_URL_OVERRIDE_KEY = 'snaproad_api_url_override';
const IS_PRODUCTION = (import.meta.env.MODE === 'production');

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

function isLoopbackUrl(url: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(url.trim());
}

function isTunnelHost(): boolean {
  try {
    const h = window.location.hostname;
    return h.endsWith('.tunnelmole.net') || h.endsWith('.trycloudflare.com') || h.endsWith('.loca.lt');
  } catch {
    return false;
  }
}

function isLoopbackHostname(hostname: string): boolean {
  return /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(hostname.trim())
}

function resolveInitialBaseUrl(): string {
  const envUrl =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    import.meta.env.REACT_APP_BACKEND_URL ||
    '';

  // Allow runtime override for tunnel/dev debugging only in non-production builds.
  // - `?api=https://....tunnelmole.net` sets and persists the override.
  // - localStorage override persists across refreshes.
  try {
    if (!IS_PRODUCTION) {
      const params = new URLSearchParams(window.location.search);
      const fromQuery = params.get('api');
      if (fromQuery && /^https?:\/\//i.test(fromQuery)) {
        const normalized = normalizeBaseUrl(fromQuery);
        localStorage.setItem(API_URL_OVERRIDE_KEY, normalized);
        return normalized;
      }

      const fromStorage = localStorage.getItem(API_URL_OVERRIDE_KEY);
      if (fromStorage && /^https?:\/\//i.test(fromStorage)) {
        return normalizeBaseUrl(fromStorage);
      }
    }
  } catch {
    // ignore (SSR / private mode / blocked storage)
  }

  const normalizedEnv = normalizeBaseUrl(envUrl);
  const shouldForceSameOrigin =
    isLoopbackUrl(normalizedEnv) &&
    (() => {
      try {
        return isTunnelHost() || !isLoopbackHostname(window.location.hostname)
      } catch {
        return false
      }
    })()
  if (shouldForceSameOrigin) {
    // #region agent log
    void 0
    // #endregion
    return '';
  }
  // Local dev: avoid the browser calling the API port directly (wrong port / hung socket).
  // Use same-origin `/api` so Vite proxies to FastAPI (see vite.config.ts).
  if (import.meta.env.DEV && normalizedEnv && isLoopbackUrl(normalizedEnv)) {
    return '';
  }
  // #region agent log
  void 0
  // #endregion
  return normalizedEnv;
}

let apiBaseUrl = resolveInitialBaseUrl();

/** FastAPI returns JSON; Vite proxy errors and tunnels may return HTML or empty bodies. */
async function parseApiResponseBody(
  response: Response,
): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  const text = await response.text();
  const status = response.status;
  const ct = (response.headers.get('content-type') || '').toLowerCase();
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      ok: false,
      error: `Empty response (HTTP ${status}). Start the API (Vite proxies /api to VITE_BACKEND_PROXY_TARGET, default :8001) or check VITE_API_URL.`,
    };
  }
  try {
    return { ok: true, data: JSON.parse(text) as unknown };
  } catch {
    if ([530, 524, 502, 521, 522, 523].includes(status)) {
      return {
        ok: false,
        error: `HTTP ${status} — tunnel or edge could not reach your API. Restart cloudflared (or dev:mobile), update the tunnel URL in .env, and ensure FastAPI matches your proxy target. For web dev, use Vite proxy (empty API base) or a working VITE_API_URL.`,
      };
    }
    const htmlish = ct.includes('text/html') || /<\s*html/i.test(text);
    const snippet = trimmed.slice(0, 140).replace(/\s+/g, ' ');
    if (htmlish) {
      return {
        ok: false,
        error: `Server returned HTML (HTTP ${status}), not JSON — backend down, wrong API URL, or not proxied to FastAPI.`,
      };
    }
    return {
      ok: false,
      error: `Not JSON (HTTP ${status}): ${snippet}${trimmed.length > 140 ? '…' : ''}`,
    };
  }
}

export function getApiBaseUrl(): string {
  return apiBaseUrl;
}

export function setApiBaseUrlOverride(url: string | null): void {
  if (IS_PRODUCTION) return;
  try {
    if (!url) {
      localStorage.removeItem(API_URL_OVERRIDE_KEY);
      apiBaseUrl = resolveInitialBaseUrl();
      return;
    }
    const normalized = normalizeBaseUrl(url);
    localStorage.setItem(API_URL_OVERRIDE_KEY, normalized);
    apiBaseUrl = normalized;
  } catch {
    // ignore
  }
}

class ApiService {
  private token: string | null = null;
  private defaultTimeoutMs = 12000;
  private refreshInFlight: Promise<string | null> | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('snaproad_token', token);
    } else {
      localStorage.removeItem('snaproad_token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('snaproad_token');
    }
    return this.token;
  }

  private async refreshTokenFromSupabase(): Promise<string | null> {
    if (this.refreshInFlight) return this.refreshInFlight;
    this.refreshInFlight = (async () => {
      try {
        const sb = getSupabaseClient();
        if (!sb) return null;
        const refreshed = await sb.auth.refreshSession();
        const accessToken = refreshed.data.session?.access_token;
        if (!accessToken) return null;
        const exchange = await fetch(`${apiBaseUrl}/api/auth/oauth/supabase`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: accessToken }),
        });
        if (!exchange.ok) return null;
        const payload = await exchange.json();
        const appToken = payload?.data?.token ?? payload?.token;
        if (typeof appToken === 'string' && appToken.length > 10) {
          this.setToken(appToken);
          return appToken;
        }
        return null;
      } catch {
        return null;
      } finally {
        this.refreshInFlight = null;
      }
    })();
    return this.refreshInFlight;
  }

  private async request<T>(
    endpoint: string,
    options: (RequestInit & { timeoutMs?: number }) = {}
  ): Promise<ApiResponse<T>> {
    const { timeoutMs, ...fetchInit } = options;
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...fetchInit.headers,
    };

    const ms = timeoutMs ?? this.defaultTimeoutMs;

    try {
      // #region agent log
      void 0
      // #endregion
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), ms);
      const response = await fetch(`${apiBaseUrl}${endpoint}`, {
        ...fetchInit,
        headers,
        signal: fetchInit.signal ?? controller.signal,
      }).finally(() => clearTimeout(timeout));

      const parsed = await parseApiResponseBody(response);
      if (!parsed.ok) {
        return { success: false, error: parsed.error };
      }
      const data = parsed.data;

      if (!response.ok) {
        if (response.status === 401 && token && !endpoint.startsWith('/api/auth/')) {
          const refreshedToken = await this.refreshTokenFromSupabase();
          if (refreshedToken) {
            const retryResponse = await fetch(`${apiBaseUrl}${endpoint}`, {
              ...fetchInit,
              headers: {
                ...headers,
                Authorization: `Bearer ${refreshedToken}`,
              },
            });
            const retryParsed = await parseApiResponseBody(retryResponse);
            if (retryParsed.ok && retryResponse.ok) {
              return { success: true, data: retryParsed.data as T };
            }
          }
          this.setToken(null);
        }
        // #region agent log
        void 0
        // #endregion
        const detailRaw =
          typeof data === 'object' && data !== null && 'detail' in data ? (data as { detail?: unknown }).detail : null

        // FastAPI validation errors: { detail: [{ loc: [...], msg: "...", type: "..." }, ...] }
        if (Array.isArray(detailRaw)) {
          const msgs = detailRaw
            .map((d: any) => {
              const loc = Array.isArray(d?.loc) ? d.loc.join('.') : undefined
              const msg = typeof d?.msg === 'string' ? d.msg : undefined
              return loc && msg ? `${loc}: ${msg}` : msg || null
            })
            .filter(Boolean)
          return { success: false, error: msgs.length ? msgs.join(' | ') : 'Request failed' }
        }

        const detail =
          detailRaw != null
            ? typeof detailRaw === 'string'
              ? detailRaw
              : JSON.stringify(detailRaw)
            : 'Request failed'
        return { success: false, error: detail }
      }

      return { success: true, data: data as T };
    } catch (error) {
      // #region agent log
      void 0
      // #endregion
      const baseHint =
        apiBaseUrl ||
        '(empty base → same-origin /api, proxied by Vite; see VITE_BACKEND_PROXY_TARGET, default http://127.0.0.1:8001)'
      const msg =
        (error as any)?.name === 'AbortError'
          ? `Request timed out after ${ms}ms. Start the FastAPI backend on the port Vite proxies to (default 8001). API base: ${baseHint}. Set VITE_API_URL / VITE_BACKEND_PROXY_TARGET if needed; clear localStorage key "snaproad_api_url_override" if you used a bad ?api= URL.`
          : 'Network error';
      return { success: false, error: msg };
    }
  }

  // ==================== AUTH ====================
  async login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    const result = await this.request<{ success?: boolean; data?: { user?: unknown; token?: string } }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
      timeoutMs: 30000,
    });
    const payload = (result.data as { data?: { user?: unknown; token?: string } })?.data ?? result.data;
    const authData = payload as { user?: unknown; token?: string } | undefined;
    if (result.success && authData?.token) {
      this.setToken(authData.token);
    }
    return { success: result.success, data: authData as AuthResponse };
  }

  async signup(data: SignupRequest): Promise<ApiResponse<AuthResponse>> {
    const result = await this.request<{ success?: boolean; data?: { user?: unknown; token?: string } }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
      timeoutMs: 30000,
    });
    const payload = (result.data as { data?: { user?: unknown; token?: string } })?.data ?? result.data;
    const authData = payload as { user?: unknown; token?: string } | undefined;
    if (result.success && authData?.token) {
      this.setToken(authData.token);
    }
    return { success: result.success, data: authData as AuthResponse };
  }

  async oauthSupabase(accessToken: string): Promise<ApiResponse<AuthResponse>> {
    const result = await this.request<{ success?: boolean; data?: { user?: unknown; token?: string } }>(
      '/api/auth/oauth/supabase',
      {
        method: 'POST',
        body: JSON.stringify({ access_token: accessToken }),
        // Supabase token validation + profile upsert can exceed default 12s on slow networks
        timeoutMs: 30000,
      }
    )
    const payload = (result.data as { data?: { user?: unknown; token?: string } })?.data ?? result.data
    const authData = payload as { user?: unknown; token?: string } | undefined
    if (result.success && authData?.token) {
      this.setToken(authData.token)
    }
    return { success: result.success, data: authData as AuthResponse, error: result.error }
  }

  async logout(): Promise<void> {
    this.setToken(null);
  }

  // ==================== USER ====================
  async getProfile(): Promise<ApiResponse<User>> {
    return this.request<User>('/api/user/profile');
  }

  async updateProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    return this.request<User>('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getUserStats(): Promise<ApiResponse<UserStats>> {
    return this.request<UserStats>('/api/user/stats');
  }

  async getVehicles(): Promise<ApiResponse<Vehicle[]>> {
    return this.request<Vehicle[]>('/api/user/vehicles');
  }

  async addVehicle(vehicle: Omit<Vehicle, 'id' | 'userId'>): Promise<ApiResponse<Vehicle>> {
    return this.request<Vehicle>('/api/user/vehicles', {
      method: 'POST',
      body: JSON.stringify(vehicle),
    });
  }

  // ==================== TRIPS ====================
  async getTrips(page = 1, limit = 20): Promise<ApiResponse<PaginatedResponse<Trip>>> {
    return this.request<PaginatedResponse<Trip>>(`/api/trips?page=${page}&limit=${limit}`);
  }

  async getTripById(id: string): Promise<ApiResponse<Trip>> {
    return this.request<Trip>(`/api/trips/${id}`);
  }

  async startTrip(data: { startLocation: string }): Promise<ApiResponse<Trip>> {
    return this.request<Trip>('/api/trips/start', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async endTrip(tripId: string, data: { endLocation: string }): Promise<ApiResponse<Trip>> {
    return this.request<Trip>(`/api/trips/${tripId}/end`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==================== FAMILY ====================
  async getFamilyMembers(): Promise<ApiResponse<FamilyMember[]>> {
    return this.request<FamilyMember[]>('/api/family/members');
  }

  async getFamilyGroup(): Promise<ApiResponse<FamilyGroup>> {
    return this.request<FamilyGroup>('/api/family/group');
  }

  async addFamilyMember(data: { email: string; relation: string }): Promise<ApiResponse<FamilyMember>> {
    return this.request<FamilyMember>('/api/family/members', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMemberPrivacy(memberId: string, privacyMode: boolean): Promise<ApiResponse<FamilyMember>> {
    return this.request<FamilyMember>(`/api/family/members/${memberId}/privacy`, {
      method: 'PUT',
      body: JSON.stringify({ privacyMode }),
    });
  }

  // ==================== REWARDS ====================
  async getOffers(category?: string): Promise<ApiResponse<Offer[]>> {
    const query = category ? `?category=${category}` : '';
    return this.request<Offer[]>(`/api/offers${query}`);
  }

  async getOfferById(id: string): Promise<ApiResponse<Offer>> {
    const res = await this.request<unknown>(`/api/offers/${id}`);
    if (!res.success) {
      return { success: false, error: res.error, message: res.message };
    }
    const body = res.data as { success?: boolean; data?: Offer } | Offer | undefined;
    const offer =
      body && typeof body === 'object' && 'data' in body && (body as { data?: Offer }).data != null
        ? (body as { data: Offer }).data
        : (body as Offer);
    return { success: true, data: offer };
  }

  async redeemOffer(offerId: string): Promise<ApiResponse<{ success: boolean; code: string }>> {
    return this.request<{ success: boolean; code: string }>(`/api/offers/${offerId}/redeem`, {
      method: 'POST',
    });
  }

  async getChallenges(): Promise<ApiResponse<Challenge[]>> {
    return this.request<Challenge[]>('/api/challenges');
  }

  async getBadges(): Promise<ApiResponse<Badge[]>> {
    return this.request<Badge[]>('/api/badges');
  }

  // ==================== LEADERBOARD ====================
  async getLeaderboard(type: 'global' | 'regional' | 'friends' = 'global', region?: string): Promise<ApiResponse<Leaderboard>> {
    const query = region ? `?type=${type}&region=${region}` : `?type=${type}`;
    return this.request<Leaderboard>(`/api/leaderboard${query}`);
  }

  // ==================== FUEL ====================
  async getFuelStats(): Promise<ApiResponse<FuelStats>> {
    return this.request<FuelStats>('/api/fuel/stats');
  }

  async getFuelLogs(page = 1, limit = 20): Promise<ApiResponse<PaginatedResponse<FuelLog>>> {
    return this.request<PaginatedResponse<FuelLog>>(`/api/fuel/entries?page=${page}&limit=${limit}`);
  }

  async logFuel(entry: Omit<FuelLog, 'id' | 'userId'>): Promise<ApiResponse<FuelLog>> {
    return this.request<FuelLog>('/api/fuel/logs', {
      method: 'POST',
      body: JSON.stringify(entry),
    });
  }

  // ==================== NOTIFICATIONS ====================
  async getNotifications(): Promise<ApiResponse<Notification[]>> {
    return this.request<Notification[]>('/api/notifications');
  }

  async markNotificationRead(id: string): Promise<ApiResponse<Notification>> {
    return this.request<Notification>(`/api/notifications/${id}/read`, {
      method: 'PUT',
    });
  }

  async markAllNotificationsRead(): Promise<ApiResponse<{ count: number }>> {
    return this.request<{ count: number }>('/api/notifications/read-all', {
      method: 'PUT',
    });
  }

  // ==================== INCIDENTS ====================
  async getIncidents(params?: {
    lat?: number;
    lng?: number;
    radiusMiles?: number;
    limit?: number;
    bounds?: { north: number; south: number; east: number; west: number };
  }): Promise<ApiResponse<Incident[]>> {
    let lat = params?.lat;
    let lng = params?.lng;
    if ((lat == null || lng == null) && params?.bounds) {
      lat = (params.bounds.north + params.bounds.south) / 2;
      lng = (params.bounds.east + params.bounds.west) / 2;
    }
    if (lat == null || lng == null) {
      return { success: false, error: 'lat/lng required for /api/incidents/nearby' };
    }
    const radius = Math.max(0.1, Math.min(200, params?.radiusMiles ?? 10));
    const limit = Math.max(1, Math.min(100, params?.limit ?? 100));
    return this.request<Incident[]>(
      `/api/incidents/nearby?lat=${lat}&lng=${lng}&radius_miles=${radius}&limit=${limit}`,
    );
  }

  async reportIncident(incident: { type: string; lat: number; lng: number; description?: string }): Promise<ApiResponse<Incident>> {
    return this.request<Incident>('/api/incidents/report', {
      method: 'POST',
      body: JSON.stringify(incident),
    });
  }

  async upvoteIncident(id: string): Promise<ApiResponse<Incident>> {
    return this.request<Incident>(`/api/incidents/${id}/upvote`, {
      method: 'POST',
    });
  }

  // ==================== PARTNER ====================
  async getPartnerProfile(): Promise<ApiResponse<Partner>> {
    return this.request<Partner>('/api/partner/profile');
  }

  async getPartnerAnalytics(period: 'week' | 'month' | 'year' = 'month'): Promise<ApiResponse<PartnerAnalytics>> {
    return this.request<PartnerAnalytics>(`/api/partner/analytics?period=${period}`);
  }

  async getPartnerOffers(): Promise<ApiResponse<Offer[]>> {
    return this.request<Offer[]>('/api/partner/offers');
  }

  async createPartnerOffer(offer: Omit<Offer, 'id' | 'partnerId' | 'redemptionCount'>): Promise<ApiResponse<Offer>> {
    return this.request<Offer>('/api/partner/offers', {
      method: 'POST',
      body: JSON.stringify(offer),
    });
  }

  // ==================== ADMIN ====================
  async getAdminStats(): Promise<ApiResponse<AdminStats>> {
    return this.request<AdminStats>('/api/admin/stats');
  }

  async getAdminUsers(page = 1, limit = 20, filters?: { plan?: string; status?: string }): Promise<ApiResponse<PaginatedResponse<User>>> {
    const query = new URLSearchParams({ page: String(page), limit: String(limit), ...filters }).toString();
    return this.request<PaginatedResponse<User>>(`/api/admin/users?${query}`);
  }

  async getAdminIncidents(status?: string): Promise<ApiResponse<Incident[]>> {
    const query = status ? `?status=${status}` : '';
    return this.request<Incident[]>(`/api/admin/incidents${query}`);
  }

  async updateIncidentStatus(id: string, status: Incident['status']): Promise<ApiResponse<Incident>> {
    return this.request<Incident>(`/api/admin/incidents/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }
  // Generic methods for DriverApp and other callers (returns ApiResponse<T>; T = full backend body)
  async get<T = unknown>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint);
  }

  async post<T = unknown>(endpoint: string, body?: object): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T = unknown>(endpoint: string, body?: object): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T = unknown>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiService();
export default api;
