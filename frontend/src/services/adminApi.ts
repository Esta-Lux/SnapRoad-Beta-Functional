/**
 * SnapRoad Admin API Service
 * Centralized API calls for Admin Portal
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

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<AdminApiResponse<T>> {
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

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.detail || data.message || 'Request failed' };
      }

      // Handle both direct data and wrapped responses
      if (data.success !== undefined) {
        return data;
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('API Error:', error);
      return { success: false, error: 'Network error - please try again' };
    }
  }

  // ==================== STATS & ANALYTICS ====================
  
  /**
   * GET /api/admin/stats - Platform statistics
   */
  async getStats(): Promise<AdminApiResponse<AdminStats>> {
    return this.request<AdminStats>('/api/admin/stats');
  }

  /**
   * GET /api/admin/analytics - Full analytics data
   */
  async getAnalytics(): Promise<AdminApiResponse<AdminAnalytics>> {
    return this.request<AdminAnalytics>('/api/admin/analytics');
  }

  // ==================== USER MANAGEMENT ====================

  /**
   * GET /api/admin/users - User list
   */
  async getUsers(limit = 100): Promise<AdminApiResponse<AdminUser[]>> {
    return this.request<AdminUser[]>(`/api/admin/users?limit=${limit}`);
  }

  /**
   * Update user status (suspend/activate)
   */
  async updateUserStatus(userId: string, status: 'active' | 'suspended'): Promise<AdminApiResponse<AdminUser>> {
    return this.request<AdminUser>(`/api/admin/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  // ==================== INCIDENTS / REPORTS ====================

  /**
   * GET /api/reports - Get all road reports/incidents
   */
  async getIncidents(params?: { lat?: number; lng?: number; radius?: number }): Promise<AdminApiResponse<RoadReport[]>> {
    const query = params
      ? `?${new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
        ).toString()}`
      : '';
    return this.request<RoadReport[]>(`/api/reports${query}`);
  }

  /**
   * POST /api/admin/incidents/{id}/moderate - Approve/reject incident
   */
  async moderateIncident(
    incidentId: number,
    outcome: 'approved' | 'rejected'
  ): Promise<AdminApiResponse<{ success: boolean }>> {
    return this.request<{ success: boolean }>(`/api/admin/incidents/${incidentId}/moderate`, {
      method: 'POST',
      body: JSON.stringify({ outcome }),
    });
  }

  /**
   * POST /api/admin/moderation/simulate - Generate test incident
   */
  async simulateIncident(): Promise<AdminApiResponse<AdminIncident>> {
    return this.request<AdminIncident>('/api/admin/moderation/simulate', {
      method: 'POST',
    });
  }

  /**
   * GET /api/admin/moderation/status - Get moderation queue status
   */
  async getModerationStatus(): Promise<AdminApiResponse<{
    live: boolean;
    admin_count: number;
    queue_size: number;
  }>> {
    return this.request('/api/admin/moderation/status');
  }

  // ==================== OFFERS ====================

  /**
   * GET /api/offers - Get all offers
   */
  async getOffers(): Promise<AdminApiResponse<any[]>> {
    return this.request<any[]>('/api/offers');
  }

  /**
   * POST /api/admin/offers/create - Create offer for business
   */
  async createOffer(offer: {
    business_name: string;
    business_id?: string;
    business_type: string;
    description: string;
    discount_percent: number;
    base_gems: number;
    lat?: number;
    lng?: number;
    expires_hours?: number;
    image_id?: string;
  }): Promise<AdminApiResponse<any>> {
    return this.request('/api/admin/offers/create', {
      method: 'POST',
      body: JSON.stringify(offer),
    });
  }

  // ==================== EXPORT / IMPORT ====================

  /**
   * GET /api/admin/export/offers - Export offers
   */
  async exportOffers(format: 'json' | 'csv' = 'json'): Promise<AdminApiResponse<any>> {
    return this.request(`/api/admin/export/offers?format=${format}`);
  }

  /**
   * GET /api/admin/export/users - Export users
   */
  async exportUsers(format: 'json' | 'csv' = 'json'): Promise<AdminApiResponse<any>> {
    return this.request(`/api/admin/export/users?format=${format}`);
  }

  /**
   * POST /api/admin/import/offers - Import offers
   */
  async importOffers(offers: any[]): Promise<AdminApiResponse<{ imported: number; errors: string[] }>> {
    return this.request('/api/admin/import/offers', {
      method: 'POST',
      body: JSON.stringify({ offers }),
    });
  }

  // ==================== EVENTS ====================

  /**
   * GET /api/admin/events - Get events
   */
  async getEvents(): Promise<AdminApiResponse<any[]>> {
    return this.request<any[]>('/api/admin/events');
  }

  // ==================== PARTNERS ====================

  /**
   * GET /api/partners - Get all partners
   */
  async getPartners(): Promise<AdminApiResponse<any[]>> {
    return this.request<any[]>('/api/partners');
  }
}

export const adminApi = new AdminApiService();
export default adminApi;
