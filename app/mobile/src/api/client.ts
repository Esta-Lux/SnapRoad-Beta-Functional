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

  // 2. app.json extra (if not default localhost)
  const extra = Constants.expoConfig?.extra ?? {};
  const extraUrl = extra.apiUrl as string | undefined;
  if (extraUrl && extraUrl.length > 5 && !extraUrl.includes('localhost')) {
    console.log('[API] Using app.json extra.apiUrl:', extraUrl);
    return extraUrl;
  }

  // 3. Auto-detect from Expo's debugger host (the IP Metro is running on)
  const hostUri = Constants.expoConfig?.hostUri ?? '';
  const expoGoHost = (Constants as any).expoGoConfig?.debuggerHost ?? '';
  const hostStr = hostUri || expoGoHost;
  const lanIp = hostStr.split(':')[0];
  if (lanIp && lanIp.length > 3 && lanIp !== 'localhost' && lanIp !== '127.0.0.1') {
    const url = `http://${lanIp}:8001`;
    console.log('[API] Auto-detected from Metro host:', url);
    return url;
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

class ApiService {
  private cachedToken: string | null = null;
  private defaultTimeoutMs = 15000;

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
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Bypass-Tunnel-Reminder': 'true',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(options.headers as Record<string, string>),
    };

    console.log(`[API] ${options.method ?? 'GET'} ${url}`);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.defaultTimeoutMs);
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
        console.error('[API] Error:', response.status, detail);
        return { success: false, error: detail };
      }

      console.log(`[API] OK ${response.status} ${endpoint}`);
      return { success: true, data: data as T };
    } catch (error) {
      const isAbort = (error as { name?: string })?.name === 'AbortError';
      const msg = isAbort
        ? `Request timed out (${this.defaultTimeoutMs}ms). Backend at ${apiBaseUrl} unreachable.`
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
