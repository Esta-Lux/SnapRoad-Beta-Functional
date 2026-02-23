// SnapRoad Mobile - API Service
// Comprehensive API layer aligned with web frontend at /app/frontend/src/services/api.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
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
} from '../types';

// Get API URL from environment
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://privacy-first-app-3.preview.emergentagent.com/api';

const TOKEN_KEY = 'snaproad_token';

class ApiService {
  private token: string | null = null;
  private initialized: boolean = false;

  // Initialize token from storage
  async init(): Promise<void> {
    if (this.initialized) return;
    try {
      this.token = await AsyncStorage.getItem(TOKEN_KEY);
      this.initialized = true;
    } catch (error) {
      console.error('Failed to load token:', error);
    }
  }

  async setToken(token: string | null): Promise<void> {
    this.token = token;
    try {
      if (token) {
        await AsyncStorage.setItem(TOKEN_KEY, token);
      } else {
        await AsyncStorage.removeItem(TOKEN_KEY);
      }
    } catch (error) {
      console.error('Failed to save token:', error);
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    await this.init();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      if (__DEV__) {
        console.log(`📡 ${options.method || 'GET'} ${API_URL}${endpoint}`);
      }

      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.detail || data.message || 'Request failed' };
      }

      return { success: true, data };
    } catch (error) {
      console.error('API Error:', error);
      return { success: false, error: 'Network error - check your connection' };
    }
  }

  // ==================== AUTH ====================
  async login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    const result = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (result.success && result.data?.token) {
      await this.setToken(result.data.token);
    }
    return result;
  }

  async signup(data: SignupRequest): Promise<ApiResponse<AuthResponse>> {
    const result = await this.request<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (result.success && result.data?.token) {
      await this.setToken(result.data.token);
    }
    return result;
  }

  async logout(): Promise<void> {
    await this.setToken(null);
  }

  isAuthenticated(): boolean {
    return this.token !== null;
  }

  // ==================== USER ====================
  async getProfile(): Promise<ApiResponse<User>> {
    return this.request<User>('/user/profile');
  }

  async updateProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    return this.request<User>('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getUserStats(): Promise<ApiResponse<UserStats>> {
    return this.request<UserStats>('/user/stats');
  }

  async getVehicles(): Promise<ApiResponse<Vehicle[]>> {
    return this.request<Vehicle[]>('/user/vehicles');
  }

  async addVehicle(vehicle: Omit<Vehicle, 'id' | 'userId'>): Promise<ApiResponse<Vehicle>> {
    return this.request<Vehicle>('/user/vehicles', {
      method: 'POST',
      body: JSON.stringify(vehicle),
    });
  }

  async updateVehicle(vehicleId: string, data: Partial<Vehicle>): Promise<ApiResponse<Vehicle>> {
    return this.request<Vehicle>(`/user/vehicles/${vehicleId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ==================== TRIPS ====================
  async getTrips(page = 1, limit = 20): Promise<ApiResponse<PaginatedResponse<Trip>>> {
    return this.request<PaginatedResponse<Trip>>(`/trips?page=${page}&limit=${limit}`);
  }

  async getTripById(id: string): Promise<ApiResponse<Trip>> {
    return this.request<Trip>(`/trips/${id}`);
  }

  async startTrip(data: { startLocation: string }): Promise<ApiResponse<Trip>> {
    return this.request<Trip>('/trips/start', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async endTrip(tripId: string, data: { endLocation: string }): Promise<ApiResponse<Trip>> {
    return this.request<Trip>(`/trips/${tripId}/end`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==================== FAMILY ====================
  async getFamilyMembers(): Promise<ApiResponse<FamilyMember[]>> {
    return this.request<FamilyMember[]>('/family/members');
  }

  async getFamilyGroup(): Promise<ApiResponse<FamilyGroup>> {
    return this.request<FamilyGroup>('/family/group');
  }

  async addFamilyMember(data: { email: string; relation: string }): Promise<ApiResponse<FamilyMember>> {
    return this.request<FamilyMember>('/family/members', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async removeFamilyMember(memberId: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request<{ success: boolean }>(`/family/members/${memberId}`, {
      method: 'DELETE',
    });
  }

  async updateMemberPrivacy(memberId: string, privacyMode: boolean): Promise<ApiResponse<FamilyMember>> {
    return this.request<FamilyMember>(`/family/members/${memberId}/privacy`, {
      method: 'PUT',
      body: JSON.stringify({ privacyMode }),
    });
  }

  // ==================== REWARDS ====================
  async getOffers(category?: string): Promise<ApiResponse<Offer[]>> {
    const query = category ? `?category=${category}` : '';
    return this.request<Offer[]>(`/offers${query}`);
  }

  async getOfferById(id: string): Promise<ApiResponse<Offer>> {
    return this.request<Offer>(`/offers/${id}`);
  }

  async getNearbyOffers(lat: number, lng: number, radius = 10): Promise<ApiResponse<Offer[]>> {
    return this.request<Offer[]>(`/offers/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
  }

  async redeemOffer(offerId: string): Promise<ApiResponse<{ success: boolean; code: string }>> {
    return this.request<{ success: boolean; code: string }>(`/offers/${offerId}/redeem`, {
      method: 'POST',
    });
  }

  async getChallenges(): Promise<ApiResponse<Challenge[]>> {
    return this.request<Challenge[]>('/challenges');
  }

  async acceptChallenge(challengeId: string): Promise<ApiResponse<Challenge>> {
    return this.request<Challenge>(`/challenges/${challengeId}/accept`, {
      method: 'POST',
    });
  }

  async getBadges(): Promise<ApiResponse<Badge[]>> {
    return this.request<Badge[]>('/badges');
  }

  // ==================== LEADERBOARD ====================
  async getLeaderboard(type: 'global' | 'regional' | 'friends' = 'global', region?: string): Promise<ApiResponse<Leaderboard>> {
    const params = new URLSearchParams({ type });
    if (region) params.append('region', region);
    return this.request<Leaderboard>(`/leaderboard?${params.toString()}`);
  }

  // ==================== FUEL ====================
  async getFuelStats(): Promise<ApiResponse<FuelStats>> {
    return this.request<FuelStats>('/fuel/stats');
  }

  async getFuelEntries(page = 1, limit = 20): Promise<ApiResponse<PaginatedResponse<FuelEntry>>> {
    return this.request<PaginatedResponse<FuelEntry>>(`/fuel/entries?page=${page}&limit=${limit}`);
  }

  async addFuelEntry(entry: Omit<FuelEntry, 'id' | 'userId'>): Promise<ApiResponse<FuelEntry>> {
    return this.request<FuelEntry>('/fuel/entries', {
      method: 'POST',
      body: JSON.stringify(entry),
    });
  }

  // ==================== NOTIFICATIONS ====================
  async getNotifications(): Promise<ApiResponse<Notification[]>> {
    return this.request<Notification[]>('/notifications');
  }

  async markNotificationRead(id: string): Promise<ApiResponse<Notification>> {
    return this.request<Notification>(`/notifications/${id}/read`, {
      method: 'PUT',
    });
  }

  async markAllNotificationsRead(): Promise<ApiResponse<{ count: number }>> {
    return this.request<{ count: number }>('/notifications/read-all', {
      method: 'PUT',
    });
  }

  // ==================== INCIDENTS ====================
  async getIncidents(bounds?: { north: number; south: number; east: number; west: number }): Promise<ApiResponse<Incident[]>> {
    if (bounds) {
      const params = new URLSearchParams({
        north: String(bounds.north),
        south: String(bounds.south),
        east: String(bounds.east),
        west: String(bounds.west),
      });
      return this.request<Incident[]>(`/incidents?${params.toString()}`);
    }
    return this.request<Incident[]>('/incidents');
  }

  async reportIncident(incident: Omit<Incident, 'id' | 'reportedBy' | 'upvotes' | 'reportedAt' | 'status'>): Promise<ApiResponse<Incident>> {
    return this.request<Incident>('/incidents', {
      method: 'POST',
      body: JSON.stringify(incident),
    });
  }

  async upvoteIncident(id: string): Promise<ApiResponse<Incident>> {
    return this.request<Incident>(`/incidents/${id}/upvote`, {
      method: 'POST',
    });
  }

  // ==================== FRIENDS ====================
  async getFriends(): Promise<ApiResponse<User[]>> {
    return this.request<User[]>('/friends');
  }

  async searchFriendById(friendId: string): Promise<ApiResponse<User>> {
    return this.request<User>(`/friends/search?id=${friendId}`);
  }

  async addFriend(friendId: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request<{ success: boolean }>('/friends/add', {
      method: 'POST',
      body: JSON.stringify({ friendId }),
    });
  }

  async removeFriend(friendId: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request<{ success: boolean }>(`/friends/${friendId}`, {
      method: 'DELETE',
    });
  }

  // ==================== ROUTES ====================
  async getSavedRoutes(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/routes');
  }

  async saveRoute(route: any): Promise<ApiResponse<any>> {
    return this.request<any>('/routes', {
      method: 'POST',
      body: JSON.stringify(route),
    });
  }

  async deleteRoute(routeId: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request<{ success: boolean }>(`/routes/${routeId}`, {
      method: 'DELETE',
    });
  }

  // ==================== LOCATIONS ====================
  async getSavedLocations(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/locations');
  }

  async saveLocation(location: any): Promise<ApiResponse<any>> {
    return this.request<any>('/locations', {
      method: 'POST',
      body: JSON.stringify(location),
    });
  }

  // ==================== HEALTH CHECK ====================
  async checkHealth(): Promise<boolean> {
    try {
      const result = await this.request<{ status: string }>('/health');
      return result.success || (result as any).status === 'ok';
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const api = new ApiService();
export default api;

// Export API URL for debugging
export { API_URL };
