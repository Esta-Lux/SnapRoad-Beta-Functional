# SnapRoad Web/Integration Developer Guide
## For Brian (Web/Integration Lead)

> **Tech Stack**: React + TypeScript + Vite + Tailwind CSS
> **Focus Areas**: Partner Dashboard, Stripe Flow, Offer CRUD, QR Scanning, Leaderboard
> **Current State**: UI complete with mock data - needs API integration

---

## 📁 Project Structure

```
/app/frontend/
├── src/
│   ├── pages/
│   │   ├── WelcomePage.tsx           # Landing page
│   │   ├── PartnerDashboard.tsx      # YOUR MAIN FOCUS
│   │   ├── AdminDashboard.tsx        # Admin panel
│   │   └── DriverApp/
│   │       ├── index.tsx             # Driver app (large file)
│   │       └── components/           # Driver components
│   ├── components/
│   │   └── ui/                       # Shadcn components
│   ├── services/                     # TO CREATE: API services
│   ├── hooks/                        # TO CREATE: Custom hooks
│   ├── contexts/                     # TO CREATE: Auth context
│   └── types/                        # TO CREATE: TypeScript types
├── .env                              # Environment variables
├── .env.example                      # Template
└── package.json                      # Dependencies
```

---

## 🚀 Phase 1: Environment Setup

### Step 1: Get credentials from PM
```env
VITE_API_URL=/api
REACT_APP_BACKEND_URL=http://localhost:8001
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
VITE_MAPBOX_TOKEN=pk.xxxxx
```

### Step 2: Install new dependencies
```bash
cd /app/frontend
yarn add html5-qrcode @stripe/stripe-js @stripe/react-stripe-js axios
yarn add -D @types/node
```

---

## 📁 Phase 2: Create API Service Layer

### Create `/app/frontend/src/services/api.ts`:
```typescript
import axios, { AxiosInstance, AxiosError } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// ============================================
// AUTH API
// ============================================
export const authAPI = {
  register: (data: { email: string; password: string; name: string }) =>
    api.post('/auth/register', data),
  
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  
  logout: () => {
    localStorage.removeItem('auth_token');
    window.location.href = '/';
  },
  
  getMe: () => api.get('/auth/me'),
};

// ============================================
// PARTNER AUTH API
// ============================================
export const partnerAuthAPI = {
  register: (data: { email: string; password: string; business_name: string }) =>
    api.post('/partner/auth/register', data),
  
  login: (data: { email: string; password: string }) =>
    api.post('/partner/auth/login', data),
  
  getProfile: () => api.get('/partner/profile'),
};

// ============================================
// OFFERS API
// ============================================
export const offersAPI = {
  // Get all offers (with optional filters)
  getAll: (params?: { type?: string; status?: string }) =>
    api.get('/offers', { params }),
  
  // Get single offer
  getById: (id: string) =>
    api.get(`/offers/${id}`),
  
  // Create offer (partner)
  create: (data: {
    title: string;
    description: string;
    discount_percent: number;
    gems_reward: number;
    location_id: number;
    expires_hours?: number;
    image_url?: string;
  }) => api.post('/partner/offers', data),
  
  // Update offer
  update: (id: string, data: Partial<{
    title: string;
    description: string;
    discount_percent: number;
    status: string;
  }>) => api.put(`/partner/offers/${id}`, data),
  
  // Delete offer
  delete: (id: string) =>
    api.delete(`/partner/offers/${id}`),
  
  // Get partner's offers
  getPartnerOffers: () =>
    api.get('/partner/offers'),
  
  // Redeem offer (driver)
  redeem: (offerId: string) =>
    api.post(`/offers/${offerId}/redeem`),
  
  // Verify QR code (partner scanning)
  verifyQR: (qrCode: string, lat?: number, lng?: number) =>
    api.post('/offers/verify-qr', { qr_code: qrCode, lat, lng }),
};

// ============================================
// LOCATIONS API
// ============================================
export const locationsAPI = {
  getAll: () => api.get('/partner/locations'),
  
  create: (data: {
    name: string;
    address: string;
    lat: number;
    lng: number;
    is_primary?: boolean;
  }) => api.post('/partner/locations', data),
  
  update: (id: number, data: {
    name: string;
    address: string;
    lat: number;
    lng: number;
    is_primary?: boolean;
  }) => api.put(`/partner/locations/${id}`, data),
  
  delete: (id: number) =>
    api.delete(`/partner/locations/${id}`),
  
  setPrimary: (id: number) =>
    api.post(`/partner/locations/${id}/set-primary`),
};

// ============================================
// PAYMENTS API (Stripe)
// ============================================
export const paymentsAPI = {
  createCheckout: (data: {
    plan: string;
    success_url: string;
    cancel_url: string;
  }) => api.post('/payments/create-checkout', data),
  
  createPortal: (return_url: string) =>
    api.post('/payments/create-portal', { return_url }),
  
  getSubscription: () =>
    api.get('/payments/subscription'),
};

// ============================================
// BOOSTS API
// ============================================
export const boostsAPI = {
  create: (data: {
    offer_id: string;
    budget: number;
    duration_days: number;
    target_radius_miles?: number;
  }) => api.post('/boosts', data),
  
  getAll: () => api.get('/boosts'),
  
  cancel: (id: string) =>
    api.post(`/boosts/${id}/cancel`),
};

// ============================================
// ANALYTICS API
// ============================================
export const analyticsAPI = {
  getDashboard: () =>
    api.get('/analytics/dashboard'),
  
  getOfferStats: (offerId: string) =>
    api.get(`/analytics/offers/${offerId}`),
  
  trackEvent: (event: string, data?: Record<string, any>) =>
    api.post('/analytics/event', { event, data }),
};

// ============================================
// LEADERBOARD API
// ============================================
export const leaderboardAPI = {
  getAll: (params?: {
    filter?: 'all' | 'state' | 'friends';
    time?: 'week' | 'month' | 'allTime';
    state?: string;
    limit?: number;
  }) => api.get('/leaderboard', { params }),
  
  getUserRank: (userId: string) =>
    api.get(`/leaderboard/user/${userId}`),
};

// ============================================
// GAMIFICATION API
// ============================================
export const gamificationAPI = {
  getBadges: () => api.get('/badges'),
  getEarnedBadges: () => api.get('/badges/earned'),
  claimBadge: (badgeId: string) => api.post(`/badges/${badgeId}/claim`),
  
  getChallenges: () => api.get('/challenges'),
  joinChallenge: (challengeId: string) => api.post(`/challenges/${challengeId}/join`),
  
  addXP: (amount: number, reason: string) => 
    api.post('/xp/add', { amount, reason }),
};
```

---

## 🔐 Phase 3: Authentication Context

### Create `/app/frontend/src/contexts/AuthContext.tsx`:
```typescript
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, partnerAuthAPI } from '../services/api';

interface User {
  id: string;
  email: string;
  name: string;
  plan?: string;
  role: 'user' | 'partner' | 'admin';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginPartner: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing token on mount
    const token = localStorage.getItem('auth_token');
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await authAPI.getMe();
      setUser(response.data.data);
    } catch (error) {
      localStorage.removeItem('auth_token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await authAPI.login({ email, password });
    const { token, user } = response.data.data;
    localStorage.setItem('auth_token', token);
    setUser({ ...user, role: 'user' });
  };

  const loginPartner = async (email: string, password: string) => {
    const response = await partnerAuthAPI.login({ email, password });
    const { token, partner } = response.data.data;
    localStorage.setItem('auth_token', token);
    setUser({ ...partner, role: 'partner' });
  };

  const register = async (email: string, password: string, name: string) => {
    const response = await authAPI.register({ email, password, name });
    const { token, user } = response.data.data;
    localStorage.setItem('auth_token', token);
    setUser({ ...user, role: 'user' });
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        loginPartner,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

---

## 💳 Phase 4: Stripe Integration

### Create `/app/frontend/src/components/StripeCheckout.tsx`:
```typescript
import React from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { paymentsAPI } from '../services/api';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface StripeCheckoutProps {
  plan: 'driver_premium' | 'partner_starter' | 'partner_growth';
  buttonText?: string;
  className?: string;
}

export const StripeCheckout: React.FC<StripeCheckoutProps> = ({
  plan,
  buttonText = 'Subscribe',
  className = '',
}) => {
  const [loading, setLoading] = React.useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const response = await paymentsAPI.createCheckout({
        plan,
        success_url: `${window.location.origin}/payment-success`,
        cancel_url: `${window.location.origin}/payment-cancelled`,
      });

      const { checkout_url } = response.data.data;
      window.location.href = checkout_url;
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCheckout}
      disabled={loading}
      className={className}
    >
      {loading ? 'Loading...' : buttonText}
    </button>
  );
};

// Manage Subscription Button
export const ManageSubscription: React.FC<{ className?: string }> = ({ className }) => {
  const [loading, setLoading] = React.useState(false);

  const handlePortal = async () => {
    setLoading(true);
    try {
      const response = await paymentsAPI.createPortal(window.location.href);
      const { portal_url } = response.data.data;
      window.location.href = portal_url;
    } catch (error) {
      console.error('Portal error:', error);
      alert('Failed to open subscription portal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handlePortal} disabled={loading} className={className}>
      {loading ? 'Loading...' : 'Manage Subscription'}
    </button>
  );
};
```

### Update Partner Dashboard with Stripe:
Add to `/app/frontend/src/pages/PartnerDashboard.tsx`:
```typescript
import { StripeCheckout, ManageSubscription } from '../components/StripeCheckout';

// In the plan upgrade section:
<StripeCheckout
  plan="partner_growth"
  buttonText="Upgrade to Growth"
  className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl"
/>

// For existing subscribers:
<ManageSubscription
  className="px-4 py-2 bg-slate-700 text-white rounded-lg"
/>
```

---

## 📱 Phase 5: QR Code Scanner (html5-qrcode)

### Create `/app/frontend/src/components/QRScanner.tsx`:
```typescript
import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeScanner } from 'html5-qrcode';
import { offersAPI } from '../services/api';
import { X, CheckCircle, XCircle, Camera, Loader2 } from 'lucide-react';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (result: any) => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ isOpen, onClose, onSuccess }) => {
  const [scanning, setScanning] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  const [resultMessage, setResultMessage] = useState('');
  const [scannedData, setScannedData] = useState<any>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && !scanning) {
      startScanner();
    }
    
    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const startScanner = async () => {
    if (!containerRef.current) return;

    try {
      scannerRef.current = new Html5Qrcode('qr-reader');
      
      await scannerRef.current.start(
        { facingMode: 'environment' }, // Use back camera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        onScanSuccess,
        onScanFailure
      );
      
      setScanning(true);
    } catch (err) {
      console.error('Failed to start scanner:', err);
      setResult('error');
      setResultMessage('Failed to access camera. Please allow camera permissions.');
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && scanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
        setScanning(false);
      } catch (err) {
        console.error('Failed to stop scanner:', err);
      }
    }
  };

  const onScanSuccess = async (decodedText: string) => {
    // Stop scanning while verifying
    await stopScanner();
    setVerifying(true);

    try {
      // Get current location for geofence verification
      let lat: number | undefined;
      let lng: number | undefined;
      
      if (navigator.geolocation) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
          });
        });
        lat = position.coords.latitude;
        lng = position.coords.longitude;
      }

      // Verify QR code with backend
      const response = await offersAPI.verifyQR(decodedText, lat, lng);
      
      if (response.data.success) {
        setResult('success');
        setResultMessage('Offer redeemed successfully!');
        setScannedData(response.data.data);
        onSuccess?.(response.data.data);
      } else {
        setResult('error');
        setResultMessage(response.data.message || 'Verification failed');
      }
    } catch (error: any) {
      setResult('error');
      setResultMessage(
        error.response?.data?.message || 
        'Failed to verify QR code. Please try again.'
      );
    } finally {
      setVerifying(false);
    }
  };

  const onScanFailure = (error: string) => {
    // Ignore scan failures (no QR detected yet)
    // console.log('Scan failure:', error);
  };

  const handleRetry = () => {
    setResult(null);
    setResultMessage('');
    setScannedData(null);
    startScanner();
  };

  const handleClose = () => {
    stopScanner();
    setResult(null);
    setResultMessage('');
    setScannedData(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <Camera size={24} className="text-emerald-400" />
            Scan QR Code
          </h2>
          <button onClick={handleClose} className="text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Scanner Area */}
        <div className="p-4">
          {!result && (
            <>
              <div 
                id="qr-reader" 
                ref={containerRef}
                className="w-full rounded-xl overflow-hidden bg-black"
                style={{ minHeight: 300 }}
              />
              
              {verifying && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="animate-spin text-emerald-400 mx-auto mb-2" size={48} />
                    <p className="text-white">Verifying...</p>
                  </div>
                </div>
              )}
              
              <p className="text-slate-400 text-sm text-center mt-4">
                Point your camera at the customer's QR code
              </p>
            </>
          )}

          {/* Success State */}
          {result === 'success' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="text-emerald-400" size={48} />
              </div>
              <h3 className="text-white text-xl font-bold mb-2">Success!</h3>
              <p className="text-slate-400 mb-4">{resultMessage}</p>
              
              {scannedData && (
                <div className="bg-slate-800 rounded-xl p-4 text-left mb-4">
                  <div className="flex justify-between py-2 border-b border-slate-700">
                    <span className="text-slate-400">Offer</span>
                    <span className="text-white font-medium">{scannedData.offer_title}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-700">
                    <span className="text-slate-400">Discount</span>
                    <span className="text-emerald-400 font-medium">{scannedData.discount_percent}% OFF</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-400">Customer Gems</span>
                    <span className="text-purple-400 font-medium">+{scannedData.gems_earned}</span>
                  </div>
                </div>
              )}
              
              <button
                onClick={handleClose}
                className="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl"
              >
                Done
              </button>
            </div>
          )}

          {/* Error State */}
          {result === 'error' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <XCircle className="text-red-400" size={48} />
              </div>
              <h3 className="text-white text-xl font-bold mb-2">Verification Failed</h3>
              <p className="text-slate-400 mb-6">{resultMessage}</p>
              
              <div className="flex gap-3">
                <button
                  onClick={handleRetry}
                  className="flex-1 py-3 bg-slate-700 text-white font-medium rounded-xl"
                >
                  Try Again
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 py-3 bg-slate-800 text-slate-400 font-medium rounded-xl"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
```

### Add QR Scanner to Partner Dashboard:
```typescript
import { QRScanner } from '../components/QRScanner';

// In PartnerDashboard component:
const [showQRScanner, setShowQRScanner] = useState(false);

// Add button to open scanner
<button
  onClick={() => setShowQRScanner(true)}
  className="px-4 py-2 bg-emerald-500 text-white rounded-lg flex items-center gap-2"
>
  <Camera size={20} />
  Scan QR Code
</button>

// Add scanner modal
<QRScanner
  isOpen={showQRScanner}
  onClose={() => setShowQRScanner(false)}
  onSuccess={(data) => {
    console.log('Redemption successful:', data);
    // Refresh offer stats
    loadOfferData();
  }}
/>
```

---

## 🏆 Phase 6: Leaderboard Component

### Create `/app/frontend/src/components/Leaderboard.tsx`:
```typescript
import React, { useState, useEffect } from 'react';
import { leaderboardAPI } from '../services/api';
import { Trophy, Medal, Crown, ChevronDown, Users, Globe, UserCheck } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  name: string;
  avatar?: string;
  score: number;
  level: number;
  state: string;
  is_current_user?: boolean;
}

interface LeaderboardProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ isOpen, onClose, currentUserId }) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'state' | 'friends'>('all');
  const [timeFilter, setTimeFilter] = useState<'week' | 'month' | 'allTime'>('week');
  const [userRank, setUserRank] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchLeaderboard();
    }
  }, [isOpen, filter, timeFilter]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const response = await leaderboardAPI.getAll({
        filter,
        time: timeFilter,
        limit: 100,
      });
      
      const data = response.data.data;
      setEntries(data.entries || []);
      setUserRank(data.user_rank || null);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="text-yellow-400" size={24} />;
    if (rank === 2) return <Medal className="text-gray-300" size={24} />;
    if (rank === 3) return <Medal className="text-amber-600" size={24} />;
    return <span className="text-slate-400 font-bold w-6 text-center">{rank}</span>;
  };

  const getRankBg = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/30';
    if (rank === 2) return 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-gray-400/30';
    if (rank === 3) return 'bg-gradient-to-r from-amber-600/20 to-orange-500/20 border-amber-600/30';
    return 'bg-slate-800/50 border-transparent';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold text-xl flex items-center gap-2">
              <Trophy className="text-yellow-400" size={24} />
              Leaderboard
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">
              ×
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-3">
            {[
              { id: 'all', label: 'Global', icon: Globe },
              { id: 'state', label: 'State', icon: Users },
              { id: 'friends', label: 'Friends', icon: UserCheck },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as any)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === f.id
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                <f.icon size={16} />
                {f.label}
              </button>
            ))}
          </div>

          {/* Time Filter */}
          <div className="flex gap-2">
            {[
              { id: 'week', label: 'This Week' },
              { id: 'month', label: 'This Month' },
              { id: 'allTime', label: 'All Time' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTimeFilter(t.id as any)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  timeFilter === t.id
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-800/50 text-slate-500 hover:text-slate-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Podium (Top 3) */}
        {!loading && entries.length >= 3 && (
          <div className="p-4 bg-gradient-to-b from-slate-800/50 to-transparent">
            <div className="flex items-end justify-center gap-2">
              {/* 2nd Place */}
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-2xl font-bold text-white mb-2">
                  {entries[1]?.name?.charAt(0) || '?'}
                </div>
                <div className="bg-gray-400/20 rounded-lg px-3 py-1 text-center">
                  <p className="text-white text-sm font-medium truncate max-w-[80px]">
                    {entries[1]?.name}
                  </p>
                  <p className="text-gray-400 text-xs">{entries[1]?.score?.toLocaleString()}</p>
                </div>
                <div className="w-16 h-16 bg-gray-400/30 rounded-t-lg mt-2 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-300">2</span>
                </div>
              </div>

              {/* 1st Place */}
              <div className="flex flex-col items-center -mt-4">
                <Crown className="text-yellow-400 mb-1" size={28} />
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-3xl font-bold text-white mb-2 ring-4 ring-yellow-400/30">
                  {entries[0]?.name?.charAt(0) || '?'}
                </div>
                <div className="bg-yellow-500/20 rounded-lg px-4 py-1 text-center">
                  <p className="text-white text-sm font-bold truncate max-w-[100px]">
                    {entries[0]?.name}
                  </p>
                  <p className="text-yellow-400 text-xs font-medium">
                    {entries[0]?.score?.toLocaleString()}
                  </p>
                </div>
                <div className="w-20 h-24 bg-yellow-500/30 rounded-t-lg mt-2 flex items-center justify-center">
                  <span className="text-3xl font-bold text-yellow-400">1</span>
                </div>
              </div>

              {/* 3rd Place */}
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-600 to-orange-500 flex items-center justify-center text-2xl font-bold text-white mb-2">
                  {entries[2]?.name?.charAt(0) || '?'}
                </div>
                <div className="bg-amber-600/20 rounded-lg px-3 py-1 text-center">
                  <p className="text-white text-sm font-medium truncate max-w-[80px]">
                    {entries[2]?.name}
                  </p>
                  <p className="text-amber-400 text-xs">{entries[2]?.score?.toLocaleString()}</p>
                </div>
                <div className="w-16 h-12 bg-amber-600/30 rounded-t-lg mt-2 flex items-center justify-center">
                  <span className="text-2xl font-bold text-amber-500">3</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rankings List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
            </div>
          ) : (
            <div className="space-y-2">
              {entries.slice(3).map((entry) => (
                <div
                  key={entry.user_id}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${getRankBg(entry.rank)} ${
                    entry.is_current_user ? 'ring-2 ring-emerald-500' : ''
                  }`}
                >
                  <div className="w-8 flex justify-center">
                    {getRankIcon(entry.rank)}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold">
                    {entry.name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">
                      {entry.name}
                      {entry.is_current_user && (
                        <span className="text-emerald-400 text-xs ml-2">(You)</span>
                      )}
                    </p>
                    <p className="text-slate-400 text-xs">Level {entry.level} • {entry.state}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">{entry.score?.toLocaleString()}</p>
                    <p className="text-slate-500 text-xs">points</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User's Rank Footer */}
        {userRank && (
          <div className="p-4 border-t border-slate-700 bg-slate-800/50">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Your Rank</span>
              <span className="text-emerald-400 font-bold text-lg">#{userRank}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
```

---

## 📝 Phase 7: Offer CRUD in Partner Dashboard

### Create `/app/frontend/src/hooks/useOffers.ts`:
```typescript
import { useState, useEffect, useCallback } from 'react';
import { offersAPI, locationsAPI } from '../services/api';

interface Offer {
  id: string;
  title: string;
  description: string;
  discount_percent: number;
  base_gems: number;
  status: 'active' | 'paused' | 'expired';
  redemption_count: number;
  views: number;
  location_id?: string;
  location_name?: string;
  created_at: string;
  expires_at: string;
}

interface Location {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  is_primary: boolean;
}

export const useOffers = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOffers = useCallback(async () => {
    try {
      const response = await offersAPI.getPartnerOffers();
      setOffers(response.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch offers');
    }
  }, []);

  const fetchLocations = useCallback(async () => {
    try {
      const response = await locationsAPI.getAll();
      setLocations(response.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch locations');
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchOffers(), fetchLocations()]);
    setLoading(false);
  }, [fetchOffers, fetchLocations]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const createOffer = async (data: {
    title: string;
    description: string;
    discount_percent: number;
    gems_reward: number;
    location_id: number;
    expires_hours?: number;
    image_url?: string;
  }) => {
    const response = await offersAPI.create(data);
    if (response.data.success) {
      await fetchOffers();
    }
    return response.data;
  };

  const updateOffer = async (id: string, data: Partial<Offer>) => {
    const response = await offersAPI.update(id, data);
    if (response.data.success) {
      await fetchOffers();
    }
    return response.data;
  };

  const deleteOffer = async (id: string) => {
    const response = await offersAPI.delete(id);
    if (response.data.success) {
      await fetchOffers();
    }
    return response.data;
  };

  const pauseOffer = async (id: string) => {
    return updateOffer(id, { status: 'paused' });
  };

  const activateOffer = async (id: string) => {
    return updateOffer(id, { status: 'active' });
  };

  return {
    offers,
    locations,
    loading,
    error,
    createOffer,
    updateOffer,
    deleteOffer,
    pauseOffer,
    activateOffer,
    refresh: loadData,
  };
};
```

---

## 🧪 Phase 8: Testing

### Test API calls manually:
```bash
# Test partner login
curl -X POST http://localhost:8001/api/partner/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"partner@test.com","password":"Test123!"}'

# Test create offer (use token from login)
curl -X POST http://localhost:8001/api/partner/offers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Test Offer",
    "description": "Test description",
    "discount_percent": 20,
    "gems_reward": 50,
    "location_id": 1,
    "expires_hours": 168
  }'

# Test QR verification
curl -X POST http://localhost:8001/api/offers/verify-qr \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"qr_code": "QR_CODE_HERE", "lat": 39.9612, "lng": -82.9988}'
```

### Test Stripe locally:
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Listen for webhooks
stripe listen --forward-to localhost:8001/api/webhooks/stripe

# Trigger test events
stripe trigger checkout.session.completed
```

---

## 📋 Brian's Migration Checklist

- [ ] Install new dependencies (`html5-qrcode`, `@stripe/stripe-js`, `axios`)
- [ ] Create API service layer (`/src/services/api.ts`)
- [ ] Create Auth context (`/src/contexts/AuthContext.tsx`)
- [ ] Wrap App with `AuthProvider`
- [ ] Create Stripe components (`StripeCheckout`, `ManageSubscription`)
- [ ] Create QR Scanner component
- [ ] Create Leaderboard component
- [ ] Create `useOffers` hook
- [ ] Update Partner Dashboard to use real API calls
- [ ] Replace mock data with API responses
- [ ] Add loading states and error handling
- [ ] Test Stripe checkout flow
- [ ] Test QR scanning and verification
- [ ] Test leaderboard with filters

---

## 🆘 Troubleshooting

**CORS errors:**
- Ensure backend has correct CORS origins
- Check `VITE_API_URL` is set correctly

**QR Scanner not working:**
- Check camera permissions in browser
- Use HTTPS in production (required for camera access)
- Test on mobile for best camera experience

**Stripe checkout not redirecting:**
- Verify `VITE_STRIPE_PUBLISHABLE_KEY` is set
- Check success/cancel URLs are correct
- Look for errors in browser console

**Auth token issues:**
- Check token is being stored in localStorage
- Verify token format in Authorization header
- Check token expiry

---

## 📚 Resources

- [html5-qrcode Docs](https://github.com/mebjas/html5-qrcode)
- [Stripe React Docs](https://stripe.com/docs/stripe-js/react)
- [Axios Docs](https://axios-http.com/docs/intro)
- [React Query](https://tanstack.com/query/latest) (optional upgrade)

---

**Questions? Coordinate with Andrew on API contracts.**
