/**
 * SnapRoad Admin API Service
 * Centralized API calls for Admin Portal - Ryan's Emergent Implementation
 */

import type {
  AdminStats,
  AdminAnalytics,
  AdminUser,
  AdminIncident,
  RoadReport,
  AdminApiResponse,
} from '@/types/admin';

const API_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || '';

class AdminApiService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('snaproad_admin_token', token);
    } else {
      localStorage.removeItem('snaproad_admin_token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('snaproad_admin_token');
    }
    return this.token;
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<AdminApiResponse> {
    const url = `${API_URL}${endpoint}`;
    const token = this.getToken();
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Stats endpoints
  async getStats(): Promise<AdminApiResponse<AdminStats>> {
    return this.request('/api/admin/stats');
  }

  async getAnalytics(): Promise<AdminApiResponse<AdminAnalytics>> {
    return this.request('/api/admin/analytics');
  }

  // Users endpoints
  async getUsers(limit: number = 100): Promise<AdminApiResponse<AdminUser[]>> {
    return this.request(`/api/admin/users?limit=${limit}`);
  }

  async createUser(userData: Partial<AdminUser>): Promise<AdminApiResponse<AdminUser>> {
    return this.request('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(id: number, userData: Partial<AdminUser>): Promise<AdminApiResponse<AdminUser>> {
    return this.request(`/api/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(id: number): Promise<AdminApiResponse<void>> {
    return this.request(`/api/admin/users/${id}`, {
      method: 'DELETE',
    });
  }

  // Incidents endpoints
  async getIncidents(): Promise<AdminApiResponse<AdminIncident[]>> {
    return this.request('/api/admin/incidents');
  }

  async updateIncidentStatus(id: number, status: AdminIncident['status']): Promise<AdminApiResponse<AdminIncident>> {
    return this.request(`/api/admin/incidents/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async moderateIncident(id: number, outcome: string): Promise<AdminApiResponse<void>> {
    return this.request(`/api/admin/incidents/${id}/moderate`, {
      method: 'POST',
      body: JSON.stringify({ outcome }),
    });
  }

  // Road Reports endpoints
  async getRoadReports(): Promise<AdminApiResponse<RoadReport[]>> {
    return this.request('/api/admin/road-reports');
  }

  // Notifications endpoints
  async getNotifications(): Promise<AdminApiResponse<any[]>> {
    return this.request('/api/admin/notifications');
  }

  async createNotification(notificationData: any): Promise<AdminApiResponse<any>> {
    return this.request('/api/admin/notifications', {
      method: 'POST',
      body: JSON.stringify(notificationData),
    });
  }

  // Partners endpoints
  async getPartners(): Promise<AdminApiResponse<any[]>> {
    return this.request('/api/admin/partners');
  }

  async createPartner(partnerData: any): Promise<AdminApiResponse<any>> {
    return this.request('/api/admin/partners', {
      method: 'POST',
      body: JSON.stringify(partnerData),
    });
  }

  // Rewards endpoints
  async getRewards(): Promise<AdminApiResponse<any[]>> {
    return this.request('/api/admin/rewards');
  }

  async createReward(rewardData: any): Promise<AdminApiResponse<any>> {
    return this.request('/api/admin/rewards', {
      method: 'POST',
      body: JSON.stringify(rewardData),
    });
  }

  // Settings endpoints
  async getSettings(): Promise<AdminApiResponse<any>> {
    return this.request('/api/admin/settings');
  }

  async updateSettings(settingsData: any): Promise<AdminApiResponse<any>> {
    return this.request('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settingsData),
    });
  }
}

// Create singleton instance
export const adminApi = new AdminApiService();

// Export class for testing or custom instances
export { AdminApiService };
export default adminApi;
