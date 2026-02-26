// SnapRoad Partner Portal - API Service
// Handles all API calls for the Partner Portal with real-time WebSocket support

const API_URL = import.meta.env.VITE_API_URL || '/api';

export interface PartnerProfile {
  id: string;
  business_name: string;
  email: string;
  credits: number;
  subscription_plan: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
}

export interface TeamMember {
  id: string;
  partner_id: string;
  name: string;
  email: string;
  role: 'owner' | 'manager' | 'staff';
  status: 'active' | 'pending' | 'revoked';
  invited_at: string;
  last_active: string | null;
  redemptions_today: number;
}

export interface Referral {
  id: string;
  referrer_id: string;
  business_name: string;
  email: string;
  status: 'pending' | 'signed_up' | 'active';
  credit_earned: number;
  referred_at: string;
  activated_at: string | null;
}

export interface ReferralStats {
  total: number;
  active: number;
  pending: number;
  total_earned: number;
  available_credits: number;
}

export interface PartnerAnalytics {
  total_views: number;
  total_clicks: number;
  total_redemptions: number;
  today_redemptions: number;
  revenue: number;
  active_offers: number;
  team_members: number;
  conversion_rate: number;
}

export interface Redemption {
  id: string;
  offer_id: string;
  customer_id: string;
  staff_id: string;
  redeemed_at: string;
  is_repeat: boolean;
  staff_name?: string;
  offer_title?: string;
}

class PartnerApiService {
  private partnerId: string | null = null;
  private token: string | null = null;
  private websocket: WebSocket | null = null;
  private connectionId: string | null = null;
  private onRedemptionCallback: ((data: any) => void) | null = null;
  private onCustomerNearbyCallback: ((data: any) => void) | null = null;

  // Authentication
  async login(email: string, password: string): Promise<{ success: boolean; partner_id?: string; business_name?: string; error?: string }> {
    try {
      const response = await fetch(`${API_URL}/partner/v2/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.partnerId = data.partner_id;
        this.token = data.token;
        return { success: true, partner_id: data.partner_id, business_name: data.business_name };
      }
      
      return { success: false, error: 'Invalid credentials' };
    } catch (error) {
      return { success: false, error: 'Connection failed' };
    }
  }

  // Get partner profile
  async getProfile(): Promise<PartnerProfile | null> {
    if (!this.partnerId) return null;
    
    try {
      const response = await fetch(`${API_URL}/partner/v2/profile/${this.partnerId}`);
      const data = await response.json();
      return data.success ? data.data : null;
    } catch {
      return null;
    }
  }

  // Team Management
  async getTeamMembers(): Promise<TeamMember[]> {
    if (!this.partnerId) return [];
    
    try {
      const response = await fetch(`${API_URL}/partner/v2/team/${this.partnerId}`);
      const data = await response.json();
      return data.success ? data.data : [];
    } catch {
      return [];
    }
  }

  async inviteTeamMember(email: string, role: string, method: 'email' | 'code' = 'email'): Promise<{ success: boolean; invite_code?: string; member_id?: string }> {
    if (!this.partnerId) return { success: false };
    
    try {
      const response = await fetch(`${API_URL}/partner/v2/team/${this.partnerId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role, method })
      });
      return await response.json();
    } catch {
      return { success: false };
    }
  }

  async updateMemberRole(memberId: string, role: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/partner/v2/team/${memberId}/role?role=${role}`, {
        method: 'PUT'
      });
      const data = await response.json();
      return data.success;
    } catch {
      return false;
    }
  }

  async revokeTeamAccess(memberId: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/partner/v2/team/${memberId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      return data.success;
    } catch {
      return false;
    }
  }

  // Referrals
  async getReferrals(): Promise<{ referrals: Referral[]; stats: ReferralStats }> {
    if (!this.partnerId) return { referrals: [], stats: { total: 0, active: 0, pending: 0, total_earned: 0, available_credits: 0 } };
    
    try {
      const response = await fetch(`${API_URL}/partner/v2/referrals/${this.partnerId}`);
      const data = await response.json();
      return data.success ? { referrals: data.data, stats: data.stats } : { referrals: [], stats: data.stats || {} };
    } catch {
      return { referrals: [], stats: { total: 0, active: 0, pending: 0, total_earned: 0, available_credits: 0 } };
    }
  }

  async sendReferral(email: string, message: string = ''): Promise<boolean> {
    if (!this.partnerId) return false;
    
    try {
      const response = await fetch(`${API_URL}/partner/v2/referrals/${this.partnerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, message })
      });
      const data = await response.json();
      return data.success;
    } catch {
      return false;
    }
  }

  async useCredits(amount: number, purpose: 'subscription' | 'boosting'): Promise<{ success: boolean; remaining_credits?: number }> {
    if (!this.partnerId) return { success: false };
    
    try {
      const response = await fetch(`${API_URL}/partner/v2/credits/${this.partnerId}/use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, purpose })
      });
      return await response.json();
    } catch {
      return { success: false };
    }
  }

  // QR Redemption
  async redeemOffer(qrData: any, staffId: string): Promise<{ success: boolean; redemption_id?: string; offer?: any; error?: string }> {
    try {
      const response = await fetch(`${API_URL}/partner/v2/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_data: qrData, staff_id: staffId })
      });
      return await response.json();
    } catch {
      return { success: false, error: 'Connection failed' };
    }
  }

  async getRecentRedemptions(limit: number = 10): Promise<Redemption[]> {
    if (!this.partnerId) return [];
    
    try {
      const response = await fetch(`${API_URL}/partner/v2/redemptions/${this.partnerId}?limit=${limit}`);
      const data = await response.json();
      return data.success ? data.data : [];
    } catch {
      return [];
    }
  }

  // Analytics
  async getAnalytics(): Promise<PartnerAnalytics | null> {
    if (!this.partnerId) return null;
    
    try {
      const response = await fetch(`${API_URL}/partner/v2/analytics/${this.partnerId}`);
      const data = await response.json();
      return data.success ? data.data : null;
    } catch {
      return null;
    }
  }

  // WebSocket for Real-time Notifications
  connectWebSocket(onRedemption?: (data: any) => void, onCustomerNearby?: (data: any) => void): void {
    if (!this.partnerId || this.websocket?.readyState === WebSocket.OPEN) return;

    this.onRedemptionCallback = onRedemption || null;
    this.onCustomerNearbyCallback = onCustomerNearby || null;

    // Construct WebSocket URL
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.host;
    const wsUrl = `${wsProtocol}//${wsHost}/ws/partner/${this.partnerId}`;

    try {
      this.websocket = new WebSocket(wsUrl);

      this.websocket.onopen = () => {
        console.log('Partner WebSocket connected');
        // Start keep-alive ping
        this.startPing();
      };

      this.websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'redemption' && this.onRedemptionCallback) {
            this.onRedemptionCallback(message.data);
          } else if (message.type === 'customer_nearby' && this.onCustomerNearbyCallback) {
            this.onCustomerNearbyCallback(message);
          }
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      };

      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.websocket.onclose = () => {
        console.log('WebSocket disconnected');
        // Attempt reconnect after 5 seconds
        setTimeout(() => this.connectWebSocket(onRedemption, onCustomerNearby), 5000);
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
    }
  }

  private pingInterval: number | null = null;

  private startPing(): void {
    if (this.pingInterval) return;
    
    this.pingInterval = window.setInterval(() => {
      if (this.websocket?.readyState === WebSocket.OPEN) {
        this.websocket.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Ping every 30 seconds
  }

  disconnectWebSocket(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
  }

  // Utility methods
  setPartnerId(id: string): void {
    this.partnerId = id;
  }

  getPartnerId(): string | null {
    return this.partnerId;
  }

  isAuthenticated(): boolean {
    return !!this.partnerId && !!this.token;
  }

  logout(): void {
    this.disconnectWebSocket();
    this.partnerId = null;
    this.token = null;
  }
}

// Export singleton instance
export const partnerApi = new PartnerApiService();
export default partnerApi;
