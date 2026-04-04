import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import type { ApiResponse, AuthResponse, LoginRequest, SignupRequest } from '../types';
import { supabase } from '../lib/supabase';

const TOKEN_KEY = 'snaproad_token';
const IS_PRODUCTION = String(process.env.APP_ENV || process.env.ENVIRONMENT || process.env.NODE_ENV || '').toLowerCase() === 'production';

/** Metro host is only a usable API host when it is a private LAN IPv4 (same Wi‑Fi). */
function isPrivateLanIPv4(host: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host.trim());
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function isLoopbackApiUrl(url: string): boolean {
  return /127\.0\.0\.1|localhost/i.test(url);
}

function isPhysicalPhoneOrTablet(): boolean {
  try {
    return Device.isDevice === true;
  } catch {
    return true;
  }
}

let apiMisconfigurationMessage: string | null = null;

/** Call from App when the bundle resolves an API base that cannot work on a real device without EXPO_PUBLIC_API_URL. */
export function getApiMisconfigurationMessage(): string | null {
  return apiMisconfigurationMessage;
}

function resolveApiUrl(): string {
  apiMisconfigurationMessage = null;

  // 1. Explicit env var (highest priority) — required for off‑Wi‑Fi / Expo tunnel + cloudflared API
  // Backward compatibility: support older API_URL env while preferring EXPO_PUBLIC_API_URL.
  const envUrl = process.env.EXPO_PUBLIC_API_URL || process.env.API_URL;
  if (envUrl && envUrl.trim().length > 5) {
    const u = envUrl.trim();
    if (IS_PRODUCTION && !/^https:\/\//i.test(u)) {
      throw new Error('EXPO_PUBLIC_API_URL must be HTTPS in production builds');
    }
    return u;
  }

  // 2. iOS Simulator / web: local FastAPI on the Mac (ignore baked-in extra until explicit env above)
  if (!IS_PRODUCTION && !isPhysicalPhoneOrTablet()) {
    return 'http://localhost:8001';
  }

  // 3. Same Wi‑Fi only: private LAN IP from Metro’s host (never use *.exp.direct / tunnel hostnames as :8001)
  const hostUri = Constants.expoConfig?.hostUri ?? '';
  const expoGoHost = (Constants as unknown as { expoGoConfig?: { debuggerHost?: string } }).expoGoConfig
    ?.debuggerHost ?? '';
  const hostStr = hostUri || expoGoHost;
  const hostOnly = hostStr.split(':')[0];
  if (!IS_PRODUCTION && hostOnly && isPrivateLanIPv4(hostOnly)) {
    return `http://${hostOnly}:8001`;
  }

  // 4. app.json extra fallback — default https://api.snaproad.app when unset (real device + tunnel / off-LAN)
  const extra = Constants.expoConfig?.extra ?? {};
  const extraUrl = (extra.apiUrl as string | undefined)?.trim();
  if (extraUrl && extraUrl.length > 5) {
    if (IS_PRODUCTION && !/^https:\/\//i.test(extraUrl)) {
      throw new Error('Expo extra.apiUrl must be HTTPS in production builds');
    }
    if (!(isPhysicalPhoneOrTablet() && isLoopbackApiUrl(extraUrl))) {
      return extraUrl;
    }
  }

  // 5. Android emulator only (not physical devices — 10.0.2.2 is the host loopback from the AVD)
  if (!IS_PRODUCTION && Platform.OS === 'android' && !isPhysicalPhoneOrTablet()) {
    return 'http://10.0.2.2:8001';
  }

  if (IS_PRODUCTION) {
    throw new Error('Missing production API URL. Set EXPO_PUBLIC_API_URL to an HTTPS endpoint.');
  }

  // 6. Physical device, no env, not on private LAN: use production API (override with EXPO_PUBLIC_API_URL for local/tunnel)
  apiMisconfigurationMessage =
    'Using cloud API (https://api.snaproad.app). For a Mac backend: same Wi‑Fi → set EXPO_PUBLIC_API_URL to http://YOUR_LAN_IP:8001; or run `npm run tunnel:api` and paste the https URL into app/mobile/.env.';
  return 'https://api.snaproad.app';
}

const apiBaseUrl: string = resolveApiUrl();

if (IS_PRODUCTION) {
  const missing: string[] = [];
  if (!process.env.EXPO_PUBLIC_MAPBOX_TOKEN) missing.push('EXPO_PUBLIC_MAPBOX_TOKEN');
  if (!process.env.EXPO_PUBLIC_SUPABASE_URL) missing.push('EXPO_PUBLIC_SUPABASE_URL');
  if (!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) missing.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  if (!process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY) missing.push('EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY');
  if (missing.length > 0) {
    console.error(`[SnapRoad] Production build missing critical env vars: ${missing.join(', ')}`);
  }
}

/** Tunnels and HTTPS edge URLs are slower; LAN HTTP is usually fast. */
function resolveRequestTimeoutMs(baseUrl: string): number {
  const u = baseUrl.toLowerCase();
  if (u.includes('loca.lt') || u.includes('ngrok') || u.includes('trycloudflare') || u.includes('tunnel')) {
    return 60000;
  }
  return 30000;
}

/** FastAPI returns JSON; tunnels and proxies often return HTML or empty bodies. */
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
      error: `Empty response (HTTP ${status}). Start the API on port 8001, fix EXPO_PUBLIC_API_URL / tunnel, and ensure uvicorn uses --host 0.0.0.0.`,
    };
  }
  try {
    return { ok: true, data: JSON.parse(text) as unknown };
  } catch {
    // Cloudflare quick tunnel / edge: origin unreachable, tunnel stopped, or hostname reused after tunnel died.
    if ([530, 524, 502, 521, 522, 523].includes(status)) {
      return {
        ok: false,
        error: `HTTP ${status} — Cloudflare could not reach your API. Fix: (1) Run the FastAPI backend on :8001. (2) Run cloudflared: cloudflared tunnel --url http://127.0.0.1:8001 (or npm run dev:mobile). (3) Put the NEW https://….trycloudflare.com URL in app/mobile/.env as EXPO_PUBLIC_API_URL and restart Metro. Same Wi‑Fi: npm run dev:mobile:lan and remove/comment the tunnel URL in .env.`,
      };
    }
    const htmlish = ct.includes('text/html') || /<\s*html/i.test(text);
    const snippet = trimmed.slice(0, 140).replace(/\s+/g, ' ');
    if (htmlish) {
      return {
        ok: false,
        error: `Server returned HTML (HTTP ${status}), not JSON — wrong API URL, expired Cloudflare tunnel, or the request hit a web page instead of FastAPI.`,
      };
    }
    return {
      ok: false,
      error: `Not JSON (HTTP ${status}): ${snippet}${trimmed.length > 140 ? '…' : ''}`,
    };
  }
}

class ApiService {
  private cachedToken: string | null = null;
  private refreshInFlight: Promise<string | null> | null = null;

  private shouldAttachAuth(endpoint: string): boolean {
    // Auth entry points must remain public, even if we still have a stale token cached.
    if (endpoint.startsWith('/api/auth/login')) return false;
    if (endpoint.startsWith('/api/auth/signup')) return false;
    if (endpoint.startsWith('/api/auth/forgot-password')) return false;
    if (endpoint.startsWith('/api/auth/resend-verification')) return false;
    if (endpoint.startsWith('/api/auth/oauth/supabase')) return false;
    if (endpoint.startsWith('/api/weather/')) return false;
    return true;
  }

  getBaseUrl(): string {
    return apiBaseUrl;
  }

  async setToken(token: string | null): Promise<void> {
    this.cachedToken = token;
    try {
      if (token) {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
      } else {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      }
    } catch (e) {
      console.warn('[API] SecureStore error:', e);
    }
  }

  async getToken(): Promise<string | null> {
    if (!this.cachedToken) {
      try {
        this.cachedToken = await SecureStore.getItemAsync(TOKEN_KEY);
      } catch (e) {
        console.warn('[API] SecureStore read error:', e);
      }
    }
    return this.cachedToken;
  }

  async exchangeSupabaseAccessToken(accessToken: string): Promise<ApiResponse<AuthResponse>> {
    const token = accessToken.trim();
    if (!token) {
      return { success: false, error: 'Missing Supabase access token.' };
    }
    const result = await this.request<{ success?: boolean; data?: { user?: unknown; token?: string } }>(
      '/api/auth/oauth/supabase',
      {
        method: 'POST',
        body: JSON.stringify({ access_token: token }),
      },
    );
    if (!result.success) return { success: false, error: result.error };
    const payload = (result.data as { data?: { user?: unknown; token?: string } })?.data ?? result.data;
    const authData = payload as { user?: unknown; token?: string } | undefined;
    if (authData?.token) {
      await this.setToken(authData.token);
    }
    return { success: true, data: authData as AuthResponse };
  }

  private async refreshTokenFromSupabase(): Promise<string | null> {
    if (this.refreshInFlight) return this.refreshInFlight;
    this.refreshInFlight = (async () => {
      try {
        const refreshed = await supabase.auth.refreshSession();
        const accessToken = refreshed.data.session?.access_token;
        if (!accessToken) return null;
        const exchange = await this.exchangeSupabaseAccessToken(accessToken);
        if (!exchange.success || !exchange.data?.token) return null;
        const appToken = exchange.data.token;
        if (typeof appToken === 'string' && appToken.length > 10) {
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
    options: RequestInit = {},
    retryCount = 0,
  ): Promise<ApiResponse<T>> {
    const token = await this.getToken();
    const url = `${apiBaseUrl}${endpoint}`;
    const attachAuth = this.shouldAttachAuth(endpoint);
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Bypass-Tunnel-Reminder': 'true',
      ...(attachAuth && token && { Authorization: `Bearer ${token}` }),
      ...(options.headers as Record<string, string>),
    };

    const timeoutMs = resolveRequestTimeoutMs(apiBaseUrl);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const response = await fetch(url, {
        ...options,
        headers,
        signal: options.signal ?? controller.signal,
      }).finally(() => clearTimeout(timeout));

      const parsed = await parseApiResponseBody(response);
      if (!parsed.ok) {
        return { success: false, error: parsed.error };
      }
      const data = parsed.data;

      if (response.status === 401 && attachAuth) {
        const refreshedToken = await this.refreshTokenFromSupabase();
        if (refreshedToken) {
          const retryResponse = await fetch(url, {
            ...options,
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
        await this.setToken(null);
      }

      if (!response.ok) {
        const detailRaw =
          typeof data === 'object' && data !== null && 'detail' in data
            ? (data as { detail?: unknown }).detail
            : null;

        if (Array.isArray(detailRaw)) {
          const msgs = detailRaw
            .map((d: { loc?: unknown[]; msg?: string }) => {
              const loc = Array.isArray(d?.loc) ? d.loc.join('.') : undefined;
              const msg = typeof d?.msg === 'string' ? d.msg : undefined;
              return loc && msg ? `${loc}: ${msg}` : msg || null;
            })
            .filter(Boolean);
          const err = msgs.length ? msgs.join(' | ') : 'Request failed';
          return { success: false, error: err };
        }

        const detail =
          detailRaw != null
            ? typeof detailRaw === 'string'
              ? detailRaw
              : JSON.stringify(detailRaw)
            : 'Request failed';
        let normalized = detail;
        if (response.status === 401) normalized = 'Session expired. Please sign in again.';
        else if (response.status === 403) normalized = 'You don\'t have permission to access this feature.';
        else if (response.status === 404) normalized = 'This feature is not available yet.';
        else if (response.status === 422) normalized = detail || 'Invalid input. Please check your data and try again.';
        else if (response.status === 429) normalized = 'Too many requests. Please wait a moment and try again.';
        else if (response.status >= 500) {
          // Never surface internal server messages to end users.
          normalized = 'Something went wrong on our side. Please try again later.';
        }
        return { success: false, error: normalized };
      }

      return { success: true, data: data as T };
    } catch (error) {
      const isAbort = (error as { name?: string })?.name === 'AbortError';
      const timeoutMs = resolveRequestTimeoutMs(apiBaseUrl);
      const method = (options.method ?? 'GET').toUpperCase();
      if (isAbort && method === 'GET' && retryCount < 1) {
        return this.request<T>(endpoint, options, retryCount + 1);
      }
      const msg = isAbort
        ? `Request timed out (${timeoutMs}ms). Please try again.`
        : 'Network error. Please check your connection and try again.';
      return { success: false, error: msg };
    }
  }

  async login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    const result = await this.request<{ success?: boolean; data?: { user?: unknown; token?: string } }>(
      '/api/auth/login',
      { method: 'POST', body: JSON.stringify(credentials) },
    );
    if (!result.success) return { success: false, error: result.error };
    const payload = (result.data as { data?: { user?: unknown; token?: string } })?.data ?? result.data;
    const authData = payload as { user?: unknown; token?: string } | undefined;
    if (authData?.token) {
      await this.setToken(authData.token);
    }
    return { success: true, data: authData as AuthResponse };
  }

  async signup(data: SignupRequest): Promise<ApiResponse<AuthResponse>> {
    const result = await this.request<{ success?: boolean; data?: { user?: unknown; token?: string } }>(
      '/api/auth/signup',
      { method: 'POST', body: JSON.stringify(data) },
    );
    if (!result.success) return { success: false, error: result.error };
    const payload = (result.data as { data?: { user?: unknown; token?: string } })?.data ?? result.data;
    const authData = payload as { user?: unknown; token?: string } | undefined;
    if (authData?.token) {
      await this.setToken(authData.token);
    }
    return { success: true, data: authData as AuthResponse };
  }

  async logout(): Promise<void> {
    await this.setToken(null);
  }

  async forgotPassword(email: string): Promise<ApiResponse<{ message: string }>> {
    return this.request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim() }),
    });
  }

  async resendVerification(email: string): Promise<ApiResponse<{ message: string }>> {
    return this.request('/api/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim() }),
    });
  }

  async getProfile(): Promise<ApiResponse<Record<string, unknown>>> {
    return this.request('/api/user/profile');
  }

  async get<T = unknown>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint);
  }

  async post<T = unknown>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
  }

  async put<T = unknown>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
  }

  async delete<T = unknown>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async upload<T = unknown>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    const token = await this.getToken();
    const url = `${apiBaseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Bypass-Tunnel-Reminder': 'true',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const timeoutMs = resolveRequestTimeoutMs(apiBaseUrl);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      const parsed = await parseApiResponseBody(response);
      if (!parsed.ok) return { success: false, error: parsed.error };
      if (!response.ok) {
        const data = parsed.data as { detail?: string } | null;
        return { success: false, error: data?.detail ?? 'Upload failed' };
      }
      return { success: true, data: parsed.data as T };
    } catch (error) {
      const isAbort = (error as { name?: string })?.name === 'AbortError';
      return { success: false, error: isAbort ? 'Upload timed out' : 'Network error during upload' };
    }
  }
}

export const api = new ApiService();
export default api;
