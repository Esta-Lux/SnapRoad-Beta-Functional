// SnapRoad Mobile - API Service
// This shows how to properly use environment variables in Expo

// ============================================
// EXPO ENVIRONMENT VARIABLE USAGE
// ============================================
// 
// In Expo, you MUST prefix env vars with EXPO_PUBLIC_ to access them in code.
// 
// 1. Create a .env file (copy from .env.example)
// 2. Add: EXPO_PUBLIC_API_URL=http://your-ip:8001/api
// 3. Restart metro: npx expo start --clear
// 4. Access: process.env.EXPO_PUBLIC_API_URL
//
// NOTE: On physical devices, use your computer's IP, not "localhost"
// Find IP: ifconfig (Mac) or ipconfig (Windows)
// ============================================

// Get API URL from environment, with fallback for development
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8001/api';

// Debug: Log the API URL (remove in production)
if (__DEV__) {
  console.log('🔗 API URL:', API_URL);
}

// Types
interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  detail?: string;
}

interface AuthData {
  user_id: string;
  name: string;
  email: string;
  token: string;
  is_premium?: boolean;
}

interface SignupPayload {
  name: string;
  email: string;
  password: string;
}

interface LoginPayload {
  email: string;
  password: string;
}

// Store token in memory (use AsyncStorage for persistence)
let authToken: string | null = null;

/**
 * Make API request with proper error handling
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_URL}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  
  // Add auth token if available
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  try {
    if (__DEV__) {
      console.log(`📡 ${options.method || 'GET'} ${url}`);
    }
    
    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        message: data.detail || data.message || 'Request failed',
      };
    }
    
    return data;
  } catch (error) {
    console.error('API Error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Network error - check your connection',
    };
  }
}

// ============================================
// AUTH API
// ============================================

export const AuthAPI = {
  /**
   * Register a new user
   */
  async signup(payload: SignupPayload): Promise<ApiResponse<AuthData>> {
    const result = await apiRequest<AuthData>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    
    if (result.success && result.data?.token) {
      authToken = result.data.token;
    }
    
    return result;
  },
  
  /**
   * Login with email/password
   */
  async login(payload: LoginPayload): Promise<ApiResponse<AuthData>> {
    const result = await apiRequest<AuthData>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    
    if (result.success && result.data?.token) {
      authToken = result.data.token;
    }
    
    return result;
  },
  
  /**
   * Logout - clear stored token
   */
  logout(): void {
    authToken = null;
  },
  
  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return authToken !== null;
  },
};

// ============================================
// USER API
// ============================================

export const UserAPI = {
  /**
   * Get current user profile
   */
  async getProfile() {
    return apiRequest('/user/profile');
  },
  
  /**
   * Get user stats
   */
  async getStats() {
    return apiRequest('/user/stats');
  },
  
  /**
   * Update profile
   */
  async updateProfile(data: { name?: string; email?: string }) {
    const params = new URLSearchParams();
    if (data.name) params.append('name', data.name);
    if (data.email) params.append('email', data.email);
    
    return apiRequest(`/user/profile?${params.toString()}`, {
      method: 'PUT',
    });
  },
};

// ============================================
// OFFERS API
// ============================================

export const OffersAPI = {
  /**
   * Get all available offers
   */
  async getOffers() {
    return apiRequest('/offers');
  },
  
  /**
   * Get nearby offers
   */
  async getNearby(lat: number, lng: number, radius: number = 10) {
    return apiRequest(`/offers/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
  },
  
  /**
   * Redeem an offer
   */
  async redeem(offerId: number) {
    return apiRequest(`/offers/${offerId}/redeem`, { method: 'POST' });
  },
};

// ============================================
// UTILITY: Health check
// ============================================

export async function checkApiHealth(): Promise<boolean> {
  try {
    const result = await apiRequest<{ status: string }>('/health');
    return result.success || (result as any).status === 'ok';
  } catch {
    return false;
  }
}

// Export API URL for debugging
export { API_URL };
