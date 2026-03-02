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
  FuelEntry,
  FuelStats,
  Notification,
  ApiResponse,
  PaginatedResponse,
} from '@/types/api';

const API_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || '';

class ApiService {
  private token: string | null = null;

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

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
      });

      let data: unknown;
      try {
        data = await response.json();
      } catch {
        return { success: false, error: 'Invalid response from server' };
      }

      if (!response.ok) {
        const detail = typeof data === 'object' && data !== null && 'detail' in data
          ? String((data as { detail?: unknown }).detail)
          : 'Request failed';
        return { success: false, error: detail };
      }

      return { success: true, data: data as T };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }

  // ==================== AUTH ====================
  async login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    const result = await this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (result.success && result.data?.token) {
      this.setToken(result.data.token);
    }
    return result;
  }

  async signup(data: SignupRequest): Promise<ApiResponse<AuthResponse>> {
    const result = await this.request<AuthResponse>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (result.success && result.data?.token) {
      this.setToken(result.data.token);
    }
    return result;
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
    return this.request<Offer>(`/api/offers/${id}`);
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

  async getFuelEntries(page = 1, limit = 20): Promise<ApiResponse<PaginatedResponse<FuelEntry>>> {
    return this.request<PaginatedResponse<FuelEntry>>(`/api/fuel/entries?page=${page}&limit=${limit}`);
  }

  async addFuelEntry(entry: Omit<FuelEntry, 'id' | 'userId'>): Promise<ApiResponse<FuelEntry>> {
    return this.request<FuelEntry>('/api/fuel/entries', {
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
  async getIncidents(bounds?: { north: number; south: number; east: number; west: number }): Promise<ApiResponse<Incident[]>> {
    const query = bounds ? `?north=${bounds.north}&south=${bounds.south}&east=${bounds.east}&west=${bounds.west}` : '';
    return this.request<Incident[]>(`/api/incidents${query}`);
  }

  async reportIncident(incident: Omit<Incident, 'id' | 'reportedBy' | 'upvotes' | 'reportedAt' | 'status'>): Promise<ApiResponse<Incident>> {
    return this.request<Incident>('/api/incidents', {
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
