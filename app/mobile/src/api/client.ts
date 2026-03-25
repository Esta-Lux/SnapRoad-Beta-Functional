import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { ApiResponse, AuthResponse, LoginRequest, SignupRequest } from '../types';

const TOKEN_KEY = 'snaproad_token';

function resolveApiUrl(): string {
  // 1. Explicit env var (highest priority)
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.length > 5) {
    console.log('[API] Using EXPO_PUBLIC_API_URL:', envUrl);
    return envUrl;
  }

  // 2. Auto-detect from Expo's debugger host (the IP Metro is running on)
  // This keeps working when Wi-Fi DHCP changes your laptop LAN IP.
  const hostUri = Constants.expoConfig?.hostUri ?? '';
  const expoGoHost = (Constants as any).expoGoConfig?.debuggerHost ?? '';
  const hostStr = hostUri || expoGoHost;
  const lanIp = hostStr.split(':')[0];
  if (lanIp && lanIp.length > 3 && lanIp !== 'localhost' && lanIp !== '127.0.0.1') {
    const url = `http://${lanIp}:8001`;
    console.log('[API] Auto-detected from Metro host:', url);
    return url;
  }

  // 3. app.json extra fallback (for non-Expo production-style builds)
  const extra = Constants.expoConfig?.extra ?? {};
  const extraUrl = extra.apiUrl as string | undefined;
  if (extraUrl && extraUrl.length > 5) {
    console.log('[API] Using app.json extra.apiUrl fallback:', extraUrl);
    return extraUrl;
  }

  // 4. Android emulator special IP
  if (Platform.OS === 'android') {
    console.log('[API] Using Android emulator IP');
    return 'http://10.0.2.2:8001';
  }

  console.log('[API] Falling back to localhost:8001');
  return 'http://localhost:8001';
}

const apiBaseUrl: string = resolveApiUrl();
console.log('[API] Final API base URL:', apiBaseUrl);

/** Tunnels and HTTPS edge URLs are slower; LAN HTTP is usually fast. */
function resolveRequestTimeoutMs(baseUrl: string): number {
  const u = baseUrl.toLowerCase();
  if (u.includes('loca.lt') || u.includes('ngrok') || u.includes('trycloudflare') || u.includes('tunnel')) {
    return 45000;
  }
  return 15000;
}

class ApiService {
  private cachedToken: string | null = null;

  private shouldAttachAuth(endpoint: string): boolean {
    // Auth entry points must remain public, even if we still have a stale token cached.
    if (endpoint.startsWith('/api/auth/login')) return false;
    if (endpoint.startsWith('/api/auth/signup')) return false;
    if (endpoint.startsWith('/api/auth/forgot-password')) return false;
    if (endpoint.startsWith('/api/auth/resend-verification')) return false;
    if (endpoint.startsWith('/api/auth/oauth/supabase')) return false;
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

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
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
    console.log(`[API] ${options.method ?? 'GET'} ${url}`);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const response = await fetch(url, {
        ...options,
        headers,
        signal: options.signal ?? controller.signal,
      }).finally(() => clearTimeout(timeout));

      let data: unknown;
      try {
        data = await response.json();
      } catch {
        console.error('[API] Failed to parse JSON from', url);
        return { success: false, error: 'Invalid response from server' };
      }

      if (response.status === 401) {
        // Expired/invalid sessions should not keep stale tokens around.
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
          console.error('[API] Error:', response.status, err);
          return { success: false, error: err };
        }

        const detail =
          detailRaw != null
            ? typeof detailRaw === 'string'
              ? detailRaw
              : JSON.stringify(detailRaw)
            : 'Request failed';
        const normalized = response.status === 401 ? 'Session expired. Please sign in again.' : detail;
        console.error('[API] Error:', response.status, normalized);
        return { success: false, error: normalized };
      }

      console.log(`[API] OK ${response.status} ${endpoint}`);
      return { success: true, data: data as T };
    } catch (error) {
      const isAbort = (error as { name?: string })?.name === 'AbortError';
      const timeoutMs = resolveRequestTimeoutMs(apiBaseUrl);
      const isTunnel = /loca\.lt|ngrok|trycloudflare/i.test(apiBaseUrl);
      const msg = isAbort
        ? isTunnel
          ? `Request timed out (${timeoutMs}ms). Tunnel may be down or slow — run localtunnel on your PC, or remove EXPO_PUBLIC_API_URL and use same Wi‑Fi so the app talks to your PC on port 8001.`
          : `Request timed out (${timeoutMs}ms). Backend at ${apiBaseUrl} unreachable — is uvicorn running on port 8001 and is Windows Firewall allowing LAN access?`
        : `Network error: Cannot reach ${apiBaseUrl}. Is the backend running?`;
      console.error('[API] Catch:', msg, error);
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
      console.log('[API] Token stored after login');
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
      console.log('[API] Token stored after signup');
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
}

export const api = new ApiService();
export default api;
