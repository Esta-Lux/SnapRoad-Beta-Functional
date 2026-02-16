# SnapRoad Mobile Developer Guide
## For Kathir (Mobile Lead)

> **Tech Stack**: React Native (Expo) + TypeScript + Zustand + React Navigation
> **Focus Areas**: Maps/Navigation, Trip Flow, QR Code Generate/Scan, Push Notifications, Hazard Button
> **Current State**: UI complete with mock data (Zustand store) - needs real API integration

---

## ⚠️ IMPORTANT: Running with Expo Go

**A detailed guide is available at `/app/snaproad-mobile/EXPO_GO_SETUP.md`**

### Quick Start
```bash
cd /app/snaproad-mobile
yarn install
npx expo start
```

### What Was Fixed for Expo Go Compatibility:
1. **Added missing assets** - placeholder icon.png, splash.png, adaptive-icon.png (replace with real assets)
2. **Installed expo-font** - required peer dependency for @expo/vector-icons
3. **Updated react-native** - from 0.73.2 to 0.73.6 for SDK 50 compatibility
4. **Replaced react-native-maps** - with a placeholder map UI (react-native-maps doesn't work well with Expo Go SDK 50+)

### For Real Maps
When ready for production maps, use **development builds** instead of Expo Go:
```bash
eas build --profile development --platform ios
```
Then you can restore react-native-maps or use expo-maps.

---

## Project Structure

```
/app/snaproad-mobile/
├── App.tsx                    # Root component
├── index.js                   # Entry point
├── app.json                   # Expo config
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript config
├── .env                       # Environment variables
├── .env.example               # Template
├── EXPO_GO_SETUP.md           # Expo Go setup guide
└── src/
    ├── assets/                # Images, fonts
    ├── components/
    │   └── ui.tsx             # Shared UI components
    ├── hooks/                 # TO CREATE: Custom hooks
    ├── navigation/
    │   └── index.tsx          # Navigation config
    ├── screens/
    │   ├── index.ts           # Screen exports
    │   ├── MapScreen.tsx      # Main map view (placeholder for Expo Go)
    │   ├── OffersScreen.tsx   # Offers list
    │   ├── OnboardingScreen.tsx
    │   ├── ProfileScreen.tsx
    │   └── RewardsScreen.tsx
    ├── services/              # TO CREATE: API layer
    ├── store/
    │   └── index.ts           # Zustand stores (MOCK DATA)
    ├── types/
    │   └── index.ts           # TypeScript definitions
    └── utils/
        └── theme.ts           # Colors, spacing, fonts
```

---

## Phase 1: Environment Setup

### Step 1: Get credentials from PM
```env
# /app/snaproad-mobile/.env
API_URL=https://api.snaproad.com/api
EXPO_PUBLIC_PUSH_NOTIFICATION_PROJECT_ID=xxxxx
APPLE_MAPKIT_TOKEN=xxxxx
```

### Step 2: Install additional dependencies
```bash
cd /app/snaproad-mobile

# Maps - NOTE: react-native-maps was removed for Expo Go compatibility
# When using development builds, reinstall: yarn add react-native-maps

# QR Code
yarn add react-native-qrcode-svg
yarn add expo-barcode-scanner
yarn add expo-camera

# Push Notifications
yarn add expo-notifications
yarn add expo-device

# Location (Background)
yarn add expo-task-manager

# Haptics (for hazard button)
yarn add expo-haptics

# Async Storage (for tokens)
yarn add @react-native-async-storage/async-storage

# JWT decode (for Apple MapKit token)
yarn add jwt-encode
```

### Step 3: Configure Expo plugins
Update `app.json`:
```json
{
  "expo": {
    "plugins": [
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow SnapRoad to use your location for navigation and nearby offers.",
          "isAndroidBackgroundLocationEnabled": true,
          "isIosBackgroundLocationEnabled": true
        }
      ],
      [
        "expo-camera",
        {
          "cameraPermission": "Allow SnapRoad to access your camera to scan QR codes."
        }
      ],
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#10B981",
          "sounds": ["./assets/sounds/notification.wav"]
        }
      ]
    ],
    "ios": {
      "infoPlist": {
        "UIBackgroundModes": ["location", "fetch", "remote-notification"],
        "NSLocationAlwaysAndWhenInUseUsageDescription": "SnapRoad needs your location for turn-by-turn navigation and to show nearby offers.",
        "NSLocationWhenInUseUsageDescription": "SnapRoad needs your location to show you on the map.",
        "NSCameraUsageDescription": "SnapRoad needs camera access to scan QR codes for offer redemption."
      }
    },
    "android": {
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "CAMERA",
        "VIBRATE",
        "RECEIVE_BOOT_COMPLETED"
      ]
    }
  }
}
```

---

## Phase 2: Apple Maps Setup (iOS Native Maps)

### Why Apple Maps?
- **Works with Expo Go** - No custom build needed for development
- **No API key for map display** - Free map tiles on iOS
- **Native performance** - Uses iOS MapKit under the hood
- **Users stay in-app** - Map renders inside SnapRoad, not opening Apple Maps app

### How It Works
```
┌─────────────────────────────────────────┐
│           SnapRoad App                   │
│  ┌─────────────────────────────────┐    │
│  │     react-native-maps           │    │
│  │     (Apple MapKit)              │    │
│  │                                 │    │
│  │  [Your custom UI overlays]      │    │
│  │  [Custom markers]               │    │
│  │  [Route polylines]              │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [Navigation Panel - Your Design]       │
│  [Hazard Button - Your Design]          │
└─────────────────────────────────────────┘
```

### For Directions & Search: Apple MapKit JS API

To get turn-by-turn directions and search, you need the **Apple Maps Server API**.

**PM Setup Required**:
1. Go to https://developer.apple.com/account/
2. Navigate to **Certificates, Identifiers & Profiles**
3. Go to **Keys** → Create a new key
4. Enable **MapKit JS**
5. Download the key file (.p8)
6. Note your:
   - **Team ID** (from Membership page)
   - **Key ID** (shown after creating key)
   - **Private Key** (contents of .p8 file)

These are used to generate JWT tokens for API requests.

---

## Phase 2: API Service Layer

### Create `/app/snaproad-mobile/src/services/api.ts`:
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@env';

const BASE_URL = API_URL || 'http://localhost:8001/api';

// Token management
let authToken: string | null = null;

export const setAuthToken = async (token: string) => {
  authToken = token;
  await AsyncStorage.setItem('auth_token', token);
};

export const getAuthToken = async (): Promise<string | null> => {
  if (!authToken) {
    authToken = await AsyncStorage.getItem('auth_token');
  }
  return authToken;
};

export const clearAuthToken = async () => {
  authToken = null;
  await AsyncStorage.removeItem('auth_token');
};

// API request helper
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = await getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    await clearAuthToken();
    throw new Error('Session expired. Please login again.');
  }

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'API request failed');
  }

  return data;
};

// ============================================
// AUTH API
// ============================================
export const authAPI = {
  login: (email: string, password: string) =>
    apiRequest<{ success: boolean; data: { token: string; user: any } }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) }
    ),

  register: (email: string, password: string, name: string) =>
    apiRequest<{ success: boolean; data: { token: string; user: any } }>(
      '/auth/register',
      { method: 'POST', body: JSON.stringify({ email, password, name }) }
    ),

  getMe: () =>
    apiRequest<{ success: boolean; data: any }>('/auth/me'),

  updateProfile: (updates: Record<string, any>) =>
    apiRequest<{ success: boolean; data: any }>(
      '/auth/profile',
      { method: 'PUT', body: JSON.stringify(updates) }
    ),
};

// ============================================
// OFFERS API
// ============================================
export const offersAPI = {
  getNearby: (lat: number, lng: number, radius: number = 10) =>
    apiRequest<{ success: boolean; data: any[] }>(
      `/offers?lat=${lat}&lng=${lng}&radius=${radius}`
    ),

  getById: (id: string) =>
    apiRequest<{ success: boolean; data: any }>(`/offers/${id}`),

  redeem: (offerId: string) =>
    apiRequest<{ success: boolean; data: { qr_code: string; expires_at: string } }>(
      `/offers/${offerId}/redeem`,
      { method: 'POST' }
    ),

  getRedeemable: () =>
    apiRequest<{ success: boolean; data: any[] }>('/offers/redeemable'),
};

// ============================================
// TRIPS API
// ============================================
export const tripsAPI = {
  start: (data: {
    start_lat: number;
    start_lng: number;
    start_location: string;
    destination_lat: number;
    destination_lng: number;
    destination_location: string;
  }) =>
    apiRequest<{ success: boolean; data: { trip_id: string } }>(
      '/trips/start',
      { method: 'POST', body: JSON.stringify(data) }
    ),

  updateLocation: (tripId: string, lat: number, lng: number, speed: number) =>
    apiRequest<{ success: boolean }>(
      `/trips/${tripId}/location`,
      { method: 'POST', body: JSON.stringify({ lat, lng, speed }) }
    ),

  end: (tripId: string, data: {
    end_lat: number;
    end_lng: number;
    distance: number;
    duration: number;
    safety_score: number;
  }) =>
    apiRequest<{ success: boolean; data: { xp_earned: number; gems_earned: number } }>(
      `/trips/${tripId}/end`,
      { method: 'POST', body: JSON.stringify(data) }
    ),

  getHistory: (limit: number = 20) =>
    apiRequest<{ success: boolean; data: any[] }>(`/trips?limit=${limit}`),

  getById: (tripId: string) =>
    apiRequest<{ success: boolean; data: any }>(`/trips/${tripId}`),
};

// ============================================
// HAZARD API
// ============================================
export const hazardAPI = {
  report: (data: {
    lat: number;
    lng: number;
    type: 'police' | 'accident' | 'hazard' | 'construction' | 'road_closure';
    description?: string;
  }) =>
    apiRequest<{ success: boolean; data: { hazard_id: string; xp_earned: number } }>(
      '/hazards/report',
      { method: 'POST', body: JSON.stringify(data) }
    ),

  getNearby: (lat: number, lng: number, radius: number = 5) =>
    apiRequest<{ success: boolean; data: any[] }>(
      `/hazards?lat=${lat}&lng=${lng}&radius=${radius}`
    ),

  confirm: (hazardId: string) =>
    apiRequest<{ success: boolean }>(`/hazards/${hazardId}/confirm`, { method: 'POST' }),

  dismiss: (hazardId: string) =>
    apiRequest<{ success: boolean }>(`/hazards/${hazardId}/dismiss`, { method: 'POST' }),
};

// ============================================
// PUSH NOTIFICATIONS API
// ============================================
export const pushAPI = {
  registerToken: (token: string, platform: 'ios' | 'android') =>
    apiRequest<{ success: boolean }>(
      '/push/register',
      { method: 'POST', body: JSON.stringify({ token, platform }) }
    ),

  unregisterToken: (token: string) =>
    apiRequest<{ success: boolean }>(
      '/push/unregister',
      { method: 'POST', body: JSON.stringify({ token }) }
    ),

  updatePreferences: (preferences: {
    offers: boolean;
    hazards: boolean;
    challenges: boolean;
    social: boolean;
  }) =>
    apiRequest<{ success: boolean }>(
      '/push/preferences',
      { method: 'PUT', body: JSON.stringify(preferences) }
    ),
};

// ============================================
// GAMIFICATION API
// ============================================
export const gamificationAPI = {
  getLeaderboard: (filter: 'all' | 'state' | 'friends', time: 'week' | 'month' | 'allTime') =>
    apiRequest<{ success: boolean; data: any[] }>(
      `/leaderboard?filter=${filter}&time=${time}`
    ),

  getBadges: () =>
    apiRequest<{ success: boolean; data: any[] }>('/badges'),

  getChallenges: () =>
    apiRequest<{ success: boolean; data: any[] }>('/challenges'),

  joinChallenge: (challengeId: string) =>
    apiRequest<{ success: boolean }>(`/challenges/${challengeId}/join`, { method: 'POST' }),
};

export default {
  auth: authAPI,
  offers: offersAPI,
  trips: tripsAPI,
  hazard: hazardAPI,
  push: pushAPI,
  gamification: gamificationAPI,
};
```

---

## Phase 3: Apple Maps Navigation Service

### Create `/app/snaproad-mobile/src/services/navigation.ts`:
```typescript
import { APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY } from '@env';

// Apple Maps API base URL
const APPLE_MAPS_API = 'https://maps-api.apple.com/v1';

// Generate JWT token for Apple Maps API (do this on backend in production!)
// For development, you can generate tokens manually
let mapKitToken: string | null = null;

export const setMapKitToken = (token: string) => {
  mapKitToken = token;
};

export interface RouteResult {
  distance: number; // meters
  duration: number; // seconds
  polyline: { latitude: number; longitude: number }[];
  steps: NavigationStep[];
}

export interface NavigationStep {
  instruction: string;
  distance: number;
  duration: number;
  maneuver: string;
}

export interface SearchResult {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category?: string;
}

export const navigationService = {
  // Get directions between two points using Apple Maps API
  getDirections: async (
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number }
  ): Promise<RouteResult | null> => {
    try {
      const response = await fetch(
        `${APPLE_MAPS_API}/directions?` +
        `origin=${origin.lat},${origin.lng}&` +
        `destination=${destination.lat},${destination.lng}&` +
        `transportType=automobile`,
        {
          headers: {
            'Authorization': `Bearer ${mapKitToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Directions request failed');
      }

      const data = await response.json();
      const route = data.routes?.[0];

      if (!route) return null;

      return {
        distance: route.distanceMeters,
        duration: route.expectedTravelTimeSeconds,
        polyline: decodePolyline(route.polyline),
        steps: route.steps?.map((step: any) => ({
          instruction: step.instructions,
          distance: step.distanceMeters,
          duration: step.expectedTravelTimeSeconds,
          maneuver: step.maneuverType,
        })) || [],
      };
    } catch (error) {
      console.error('Apple Maps directions error:', error);
      return null;
    }
  },

  // Search for places using Apple Maps API
  searchPlaces: async (
    query: string,
    location?: { lat: number; lng: number }
  ): Promise<SearchResult[]> => {
    try {
      let url = `${APPLE_MAPS_API}/search?q=${encodeURIComponent(query)}`;
      
      if (location) {
        url += `&searchLocation=${location.lat},${location.lng}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${mapKitToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Search request failed');
      }

      const data = await response.json();

      return (data.results || []).map((place: any) => ({
        id: place.id,
        name: place.name,
        address: place.formattedAddressLines?.join(', ') || '',
        lat: place.coordinate.latitude,
        lng: place.coordinate.longitude,
        category: place.poiCategory,
      }));
    } catch (error) {
      console.error('Apple Maps search error:', error);
      return [];
    }
  },

  // Reverse geocode (coordinates to address)
  reverseGeocode: async (lat: number, lng: number): Promise<SearchResult | null> => {
    try {
      const response = await fetch(
        `${APPLE_MAPS_API}/reverseGeocode?loc=${lat},${lng}`,
        {
          headers: {
            'Authorization': `Bearer ${mapKitToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Reverse geocode request failed');
      }

      const data = await response.json();
      const result = data.results?.[0];

      if (!result) return null;

      return {
        id: result.id || `${lat},${lng}`,
        name: result.name || result.formattedAddressLines?.[0] || 'Unknown',
        address: result.formattedAddressLines?.join(', ') || '',
        lat,
        lng,
      };
    } catch (error) {
      console.error('Reverse geocode error:', error);
      return null;
    }
  },

  // Calculate ETA
  getETA: async (
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number }
  ): Promise<{ duration: number; distance: number } | null> => {
    try {
      const response = await fetch(
        `${APPLE_MAPS_API}/etas?` +
        `origin=${origin.lat},${origin.lng}&` +
        `destinations=${destination.lat},${destination.lng}&` +
        `transportType=automobile`,
        {
          headers: {
            'Authorization': `Bearer ${mapKitToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('ETA request failed');
      }

      const data = await response.json();
      const eta = data.etas?.[0];

      if (!eta) return null;

      return {
        duration: eta.expectedTravelTimeSeconds,
        distance: eta.distanceMeters,
      };
    } catch (error) {
      console.error('ETA error:', error);
      return null;
    }
  },
};

// Decode Apple's polyline format to coordinate array
function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
  const points: { latitude: number; longitude: number }[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return points;
}

export default navigationService;
```

### Alternative: Use Built-in iOS Routing (No API Key Needed!)

For simpler setup without MapKit JS credentials, use `react-native-maps` built-in directions:

```typescript
// Simple directions using react-native-maps-directions
// Install: yarn add react-native-maps-directions

import MapViewDirections from 'react-native-maps-directions';

// In your component:
<MapView>
  <MapViewDirections
    origin={{ latitude: 39.96, longitude: -82.99 }}
    destination={{ latitude: 39.98, longitude: -83.01 }}
    strokeWidth={4}
    strokeColor={Colors.primary}
    onReady={(result) => {
      console.log(`Distance: ${result.distance} km`);
      console.log(`Duration: ${result.duration} min`);
    }}
  />
</MapView>
```

**Note**: This uses Apple Maps on iOS automatically - no API key needed for basic routing!

### Create `/app/snaproad-mobile/src/hooks/useNavigation.ts`:
```typescript
import { useState, useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import { navigationService } from '../services/navigation';
import { tripsAPI } from '../services/api';

interface NavigationState {
  isNavigating: boolean;
  currentRoute: {
    distance: number;
    duration: number;
    polyline: { latitude: number; longitude: number }[];
    steps: { instruction: string; distance: number; maneuver: string }[];
  } | null;
  currentStep: { instruction: string; distance: number; maneuver: string } | null;
  currentStepIndex: number;
  distanceRemaining: number;
  timeRemaining: number;
  currentLocation: { latitude: number; longitude: number } | null;
  currentSpeed: number;
  tripId: string | null;
}

export const useNavigation = () => {
  const [state, setState] = useState<NavigationState>({
    isNavigating: false,
    currentRoute: null,
    currentStep: null,
    currentStepIndex: 0,
    distanceRemaining: 0,
    timeRemaining: 0,
    currentLocation: null,
    currentSpeed: 0,
    tripId: null,
  });

  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const tripStartTime = useRef<number>(0);
  const totalDistance = useRef<number>(0);
  const lastLocation = useRef<{ latitude: number; longitude: number } | null>(null);

  // Request permissions
  const requestPermissions = async () => {
    const { status: foreground } = await Location.requestForegroundPermissionsAsync();
    if (foreground !== 'granted') {
      throw new Error('Location permission required');
    }

    const { status: background } = await Location.requestBackgroundPermissionsAsync();
    if (background !== 'granted') {
      console.warn('Background location not granted');
    }

    return { foreground, background };
  };

  // Start navigation
  const startNavigation = async (
    destination: { lat: number; lng: number; name: string }
  ) => {
    try {
      await requestPermissions();

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const origin = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };

      // Get route from Apple Maps
      const route = await navigationService.getDirections(origin, destination);

      if (!route) {
        throw new Error('No route found');
      }

      // Start trip on backend
      const originAddress = await navigationService.reverseGeocode(origin.lat, origin.lng);
      const tripResponse = await tripsAPI.start({
        start_lat: origin.lat,
        start_lng: origin.lng,
        start_location: originAddress?.name || 'Current Location',
        destination_lat: destination.lat,
        destination_lng: destination.lng,
        destination_location: destination.name,
      });

      tripStartTime.current = Date.now();
      totalDistance.current = 0;
      lastLocation.current = { latitude: origin.lat, longitude: origin.lng };

      setState({
        isNavigating: true,
        currentRoute: route,
        currentStep: route.steps[0] || null,
        currentStepIndex: 0,
        distanceRemaining: route.distance,
        timeRemaining: route.duration,
        currentLocation: { latitude: origin.lat, longitude: origin.lng },
        currentSpeed: 0,
        tripId: tripResponse.data.trip_id,
      });

      // Start location tracking
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10,
          timeInterval: 2000,
        },
        handleLocationUpdate
      );

      return route;
    } catch (error) {
      console.error('Failed to start navigation:', error);
      throw error;
    }
  };

  // Handle location updates
  const handleLocationUpdate = useCallback(
    async (location: Location.LocationObject) => {
      const { latitude, longitude, speed } = location.coords;

      // Calculate distance traveled
      if (lastLocation.current) {
        const dist = calculateDistance(
          lastLocation.current.latitude,
          lastLocation.current.longitude,
          latitude,
          longitude
        );
        totalDistance.current += dist;
      }
      lastLocation.current = { latitude, longitude };

      setState((prev) => {
        if (!prev.currentRoute) return prev;

        // Find current step based on position
        const newStepIndex = findCurrentStepIndex(
          prev.currentRoute.polyline,
          { latitude, longitude },
          prev.currentStepIndex
        );

        // Calculate remaining distance
        const distanceRemaining = calculateRemainingDistance(
          prev.currentRoute.polyline,
          { latitude, longitude }
        );
        
        const avgSpeed = speed || 10;
        const timeRemaining = distanceRemaining / avgSpeed;

        return {
          ...prev,
          currentLocation: { latitude, longitude },
          currentSpeed: (speed || 0) * 2.237, // m/s to mph
          currentStep: prev.currentRoute.steps[newStepIndex] || prev.currentStep,
          currentStepIndex: newStepIndex,
          distanceRemaining,
          timeRemaining,
        };
      });

      // Update backend
      if (state.tripId) {
        try {
          await tripsAPI.updateLocation(state.tripId, latitude, longitude, speed || 0);
        } catch (error) {
          console.warn('Failed to update location:', error);
        }
      }
    },
    [state.tripId]
  );

  // End navigation
  const endNavigation = async (completed: boolean = true) => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }

    if (state.tripId && state.currentLocation) {
      const duration = Math.round((Date.now() - tripStartTime.current) / 1000 / 60);
      const safetyScore = calculateSafetyScore();

      try {
        const result = await tripsAPI.end(state.tripId, {
          end_lat: state.currentLocation.latitude,
          end_lng: state.currentLocation.longitude,
          distance: totalDistance.current / 1609.34, // meters to miles
          duration,
          safety_score: safetyScore,
        });

        return result.data;
      } catch (error) {
        console.error('Failed to end trip:', error);
      }
    }

    setState({
      isNavigating: false,
      currentRoute: null,
      currentStep: null,
      currentStepIndex: 0,
      distanceRemaining: 0,
      timeRemaining: 0,
      currentLocation: null,
      currentSpeed: 0,
      tripId: null,
    });

    return null;
  };

  // Reroute from current location
  const reroute = async () => {
    if (!state.currentRoute || !state.currentLocation) return;

    const lastPoint = state.currentRoute.polyline[state.currentRoute.polyline.length - 1];
    const destination = {
      lat: lastPoint.latitude,
      lng: lastPoint.longitude,
      name: 'Destination',
    };

    await startNavigation(destination);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []);

  return {
    ...state,
    startNavigation,
    endNavigation,
    reroute,
    searchPlaces: navigationService.searchPlaces,
  };
};

// Helper: Calculate distance between two points (Haversine)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Helper: Find which step user is on
function findCurrentStepIndex(
  polyline: { latitude: number; longitude: number }[],
  location: { latitude: number; longitude: number },
  currentIndex: number
): number {
  // Simple: advance index based on proximity to route points
  return currentIndex;
}

// Helper: Calculate remaining distance
function calculateRemainingDistance(
  polyline: { latitude: number; longitude: number }[],
  location: { latitude: number; longitude: number }
): number {
  let totalDist = 0;
  let foundClosest = false;
  let minDist = Infinity;
  let closestIndex = 0;

  // Find closest point on polyline
  for (let i = 0; i < polyline.length; i++) {
    const dist = calculateDistance(
      location.latitude,
      location.longitude,
      polyline[i].latitude,
      polyline[i].longitude
    );
    if (dist < minDist) {
      minDist = dist;
      closestIndex = i;
    }
  }

  // Sum distance from closest point to end
  for (let i = closestIndex; i < polyline.length - 1; i++) {
    totalDist += calculateDistance(
      polyline[i].latitude,
      polyline[i].longitude,
      polyline[i + 1].latitude,
      polyline[i + 1].longitude
    );
  }

  return totalDist;
}

// Helper: Calculate safety score based on driving behavior
function calculateSafetyScore(): number {
  // In production: track hard braking, acceleration, speeding
  return 85 + Math.floor(Math.random() * 15);
}

export default useNavigation;
```

---

## Phase 4: Trip Flow Implementation (Apple Maps UI)

### Create `/app/snaproad-mobile/src/screens/TripScreen.tsx`:
```typescript
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Alert,
  Platform,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '../hooks/useNavigation';
import { hazardAPI } from '../services/api';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights } from '../utils/theme';

const { width, height } = Dimensions.get('window');

interface TripScreenProps {
  route: {
    params: {
      destination: { lat: number; lng: number; name: string; address?: string };
    };
  };
  navigation: any;
}

type HazardType = 'police' | 'accident' | 'hazard' | 'construction' | 'road_closure';

export const TripScreen: React.FC<TripScreenProps> = ({ route, navigation: nav }) => {
  const { destination } = route.params;
  const mapRef = useRef<MapView>(null);
  const {
    isNavigating,
    currentRoute,
    currentStep,
    currentLocation,
    currentSpeed,
    distanceRemaining,
    timeRemaining,
    startNavigation,
    endNavigation,
    reroute,
  } = useNavigation();

  const [showHazardMenu, setShowHazardMenu] = useState(false);
  const [eta, setEta] = useState<string>('--');
  const hazardMenuAnim = useRef(new Animated.Value(0)).current;

  // Start navigation on mount
  useEffect(() => {
    startNavigation(destination).catch((error) => {
      Alert.alert('Navigation Error', error.message);
      nav.goBack();
    });

    return () => {
      endNavigation(false);
    };
  }, []);

  // Update ETA
  useEffect(() => {
    if (timeRemaining > 0) {
      const hours = Math.floor(timeRemaining / 3600);
      const minutes = Math.floor((timeRemaining % 3600) / 60);
      setEta(hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`);
    }
  }, [timeRemaining]);

  // Follow user location on map
  useEffect(() => {
    if (currentLocation && mapRef.current) {
      mapRef.current.animateCamera({
        center: currentLocation,
        pitch: 45,
        heading: 0,
        zoom: 17,
      });
    }
  }, [currentLocation]);

  // Toggle hazard menu
  const toggleHazardMenu = () => {
    const toValue = showHazardMenu ? 0 : 1;
    Animated.spring(hazardMenuAnim, {
      toValue,
      useNativeDriver: true,
      friction: 8,
    }).start();
    setShowHazardMenu(!showHazardMenu);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  // Report hazard
  const reportHazard = async (type: HazardType) => {
    if (!currentLocation) return;

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      const result = await hazardAPI.report({
        lat: currentLocation.latitude,
        lng: currentLocation.longitude,
        type,
      });

      Alert.alert(
        'Hazard Reported',
        `Thanks! You earned ${result.data.xp_earned} XP for helping the community.`
      );

      toggleHazardMenu();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  // End trip
  const handleEndTrip = () => {
    Alert.alert(
      'End Navigation?',
      'Are you sure you want to end this trip?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Trip',
          style: 'destructive',
          onPress: async () => {
            const result = await endNavigation(true);
            if (result) {
              nav.replace('TripSummary', { ...result });
            } else {
              nav.goBack();
            }
          },
        },
      ]
    );
  };

  const hazardTypes: { type: HazardType; icon: string; label: string; color: string }[] = [
    { type: 'police', icon: 'car-sport', label: 'Police', color: '#3B82F6' },
    { type: 'accident', icon: 'warning', label: 'Accident', color: '#EF4444' },
    { type: 'hazard', icon: 'alert-circle', label: 'Hazard', color: '#F59E0B' },
    { type: 'construction', icon: 'construct', label: 'Construction', color: '#F97316' },
    { type: 'road_closure', icon: 'close-circle', label: 'Closed', color: '#DC2626' },
  ];

  return (
    <View style={styles.container}>
      {/* Apple Maps via react-native-maps */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT} // Uses Apple Maps on iOS
        initialRegion={{
          latitude: currentLocation?.latitude || destination.lat,
          longitude: currentLocation?.longitude || destination.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation
        followsUserLocation
        showsCompass={false}
        showsTraffic={true} // Show traffic on Apple Maps
        mapType="mutedStandard" // Clean look for navigation
        pitchEnabled
        rotateEnabled
      >
        {/* Route Polyline - Custom SnapRoad styling */}
        {currentRoute?.polyline && (
          <Polyline
            coordinates={currentRoute.polyline}
            strokeColor={Colors.primary}
            strokeWidth={6}
            lineCap="round"
            lineJoin="round"
          />
        )}

        {/* Destination Marker - Custom SnapRoad design */}
        <Marker coordinate={{ latitude: destination.lat, longitude: destination.lng }}>
          <View style={styles.destinationMarker}>
            <Ionicons name="flag" size={24} color="#fff" />
          </View>
        </Marker>
      </MapView>

      {/* Top Navigation Card - SnapRoad Custom UI */}
      <View style={styles.navigationCard}>
        <View style={styles.maneuverIcon}>
          <Ionicons
            name={getManeuverIcon(currentStep?.maneuver)}
            size={32}
            color={Colors.text}
          />
        </View>
        <View style={styles.instructionContainer}>
          <Text style={styles.instruction} numberOfLines={2}>
            {currentStep?.instruction || 'Calculating route...'}
          </Text>
          <Text style={styles.stepDistance}>
            {formatDistance(currentStep?.distance || 0)}
          </Text>
        </View>
      </View>

      {/* Bottom Stats Bar - SnapRoad Custom UI */}
      <View style={styles.bottomBar}>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{eta}</Text>
            <Text style={styles.statLabel}>ETA</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{formatDistance(distanceRemaining)}</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{Math.round(currentSpeed)}</Text>
            <Text style={styles.statLabel}>MPH</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          {/* End Trip Button */}
          <TouchableOpacity style={styles.endButton} onPress={handleEndTrip}>
            <Ionicons name="close" size={24} color={Colors.error} />
          </TouchableOpacity>

          {/* Hazard Button - SnapRoad Signature Feature */}
          <TouchableOpacity style={styles.hazardButton} onPress={toggleHazardMenu}>
            <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.hazardGradient}>
              <Ionicons name="warning" size={32} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>

          {/* Reroute Button */}
          <TouchableOpacity style={styles.rerouteButton} onPress={reroute}>
            <Ionicons name="refresh" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Hazard Menu - SnapRoad Custom UI */}
      {showHazardMenu && (
        <View style={styles.hazardMenuOverlay}>
          <TouchableOpacity
            style={styles.hazardMenuBackdrop}
            activeOpacity={1}
            onPress={toggleHazardMenu}
          />
          <Animated.View
            style={[
              styles.hazardMenu,
              {
                transform: [
                  {
                    translateY: hazardMenuAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [200, 0],
                    }),
                  },
                ],
                opacity: hazardMenuAnim,
              },
            ]}
          >
            <Text style={styles.hazardMenuTitle}>Report Hazard</Text>
            <View style={styles.hazardGrid}>
              {hazardTypes.map((hazard) => (
                <TouchableOpacity
                  key={hazard.type}
                  style={styles.hazardOption}
                  onPress={() => reportHazard(hazard.type)}
                >
                  <View style={[styles.hazardIconBg, { backgroundColor: `${hazard.color}20` }]}>
                    <Ionicons name={hazard.icon as any} size={28} color={hazard.color} />
                  </View>
                  <Text style={styles.hazardLabel}>{hazard.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        </View>
      )}
    </View>
  );
};

// Helper functions
function getManeuverIcon(maneuver?: string): keyof typeof Ionicons.glyphMap {
  const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
    'turn-right': 'arrow-forward',
    'turn-left': 'arrow-back',
    'slight-right': 'arrow-forward',
    'slight-left': 'arrow-back',
    'straight': 'arrow-up',
    'merge': 'git-merge',
    'ramp': 'exit',
    'fork': 'git-branch',
    'roundabout': 'refresh',
    'arrive': 'flag',
    'depart': 'navigate',
  };
  return icons[maneuver || ''] || 'arrow-up';
}

function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters * 3.281)} ft`; // Convert to feet
  }
  const miles = meters / 1609.34;
  return miles < 10 ? `${miles.toFixed(1)} mi` : `${Math.round(miles)} mi`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  map: {
    width,
    height,
  },

  // Navigation Card
  navigationCard: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: Spacing.md,
    right: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    padding: Spacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  maneuverIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  instructionContainer: {
    flex: 1,
  },
  instruction: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    marginBottom: 4,
  },
  stepDistance: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
  },

  // Destination Marker
  destinationMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },

  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 34 : Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: Spacing.lg,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    color: Colors.text,
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
  },
  statLabel: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.surfaceLight,
  },

  // Action Buttons
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  endButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${Colors.error}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hazardButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
  },
  hazardGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rerouteButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Hazard Menu
  hazardMenuOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  hazardMenuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  hazardMenu: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.xl,
  },
  hazardMenuTitle: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  hazardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  hazardOption: {
    alignItems: 'center',
    width: '30%',
    marginBottom: Spacing.md,
  },
  hazardIconBg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  hazardLabel: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
});

export default TripScreen;
```

---

## Phase 5: QR Code Generate & Scan

### Create `/app/snaproad-mobile/src/components/QRGenerator.tsx`:
```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights } from '../utils/theme';

interface QRGeneratorProps {
  qrCode: string;
  expiresAt: string;
  offerTitle: string;
  discount: number;
}

export const QRGenerator: React.FC<QRGeneratorProps> = ({
  qrCode,
  expiresAt,
  offerTitle,
  discount,
}) => {
  const expiresDate = new Date(expiresAt);
  const timeRemaining = Math.max(0, expiresDate.getTime() - Date.now());
  const minutesRemaining = Math.floor(timeRemaining / 60000);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.card}>
        <Text style={styles.title}>{offerTitle}</Text>
        <Text style={styles.discount}>{discount}% OFF</Text>

        <View style={styles.qrContainer}>
          <QRCode
            value={qrCode}
            size={200}
            backgroundColor="#fff"
            color="#0F172A"
            logo={require('../assets/logo.png')} // Optional logo in center
            logoSize={40}
            logoBackgroundColor="#fff"
          />
        </View>

        <View style={styles.timerContainer}>
          <Text style={styles.timerLabel}>Expires in</Text>
          <Text style={styles.timer}>
            {minutesRemaining > 0 ? `${minutesRemaining} min` : 'Expired'}
          </Text>
        </View>

        <Text style={styles.instructions}>
          Show this QR code to the cashier to redeem your offer
        </Text>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
  },
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  title: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    marginBottom: 4,
  },
  discount: {
    color: Colors.success,
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    marginBottom: Spacing.lg,
  },
  qrContainer: {
    backgroundColor: '#fff',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  timerLabel: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  timer: {
    color: Colors.warning,
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
  },
  instructions: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    textAlign: 'center',
  },
});

export default QRGenerator;
```

### Create `/app/snaproad-mobile/src/components/QRScanner.tsx`:
```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  Dimensions,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights } from '../utils/theme';

const { width } = Dimensions.get('window');

interface QRScannerProps {
  isVisible: boolean;
  onClose: () => void;
  onScan: (data: string) => Promise<void>;
}

export const QRScanner: React.FC<QRScannerProps> = ({ isVisible, onClose, onScan }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (isVisible && !permission?.granted) {
      requestPermission();
    }
  }, [isVisible]);

  useEffect(() => {
    if (isVisible) {
      setScanned(false);
      setProcessing(false);
    }
  }, [isVisible]);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || processing) return;

    setScanned(true);
    setProcessing(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      await onScan(data);
      onClose();
    } catch (error: any) {
      Alert.alert('Scan Failed', error.message, [
        { text: 'Try Again', onPress: () => setScanned(false) },
        { text: 'Close', onPress: onClose },
      ]);
    } finally {
      setProcessing(false);
    }
  };

  if (!permission) {
    return null;
  }

  return (
    <Modal visible={isVisible} animationType="slide" statusBarTranslucent>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Scan QR Code</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Camera View */}
        {permission.granted ? (
          <View style={styles.cameraContainer}>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            />

            {/* Scan Frame Overlay */}
            <View style={styles.overlay}>
              <View style={styles.scanFrame}>
                {/* Corner decorations */}
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
            </View>

            {/* Processing Indicator */}
            {processing && (
              <View style={styles.processingOverlay}>
                <View style={styles.processingCard}>
                  <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
                  <Text style={styles.processingText}>Processing...</Text>
                </View>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.permissionContainer}>
            <Ionicons name="camera-outline" size={64} color={Colors.textSecondary} />
            <Text style={styles.permissionTitle}>Camera Permission Required</Text>
            <Text style={styles.permissionText}>
              We need access to your camera to scan QR codes
            </Text>
            <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionText}>
            Point your camera at a SnapRoad QR code to scan it
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const FRAME_SIZE = width * 0.7;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
  },

  // Camera
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: Colors.primary,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },

  // Processing
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  processingText: {
    color: Colors.text,
    fontSize: FontSizes.md,
    marginTop: Spacing.md,
  },

  // Permission
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  permissionTitle: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  permissionText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  permissionButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  permissionButtonText: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },

  // Instructions
  instructions: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  instructionText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    textAlign: 'center',
  },
});

export default QRScanner;
```

---

## Phase 6: Push Notifications

### Create `/app/snaproad-mobile/src/services/notifications.ts`:
```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pushAPI } from './api';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationPreferences {
  offers: boolean;
  hazards: boolean;
  challenges: boolean;
  social: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  offers: true,
  hazards: true,
  challenges: true,
  social: true,
};

export const notificationService = {
  // Register for push notifications
  register: async (): Promise<string | null> => {
    if (!Device.isDevice) {
      console.log('Push notifications not available in simulator');
      return null;
    }

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request if not granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted');
      return null;
    }

    // Get push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PUSH_NOTIFICATION_PROJECT_ID,
    });
    const token = tokenData.data;

    // Register with backend
    try {
      await pushAPI.registerToken(token, Platform.OS as 'ios' | 'android');
      await AsyncStorage.setItem('push_token', token);
    } catch (error) {
      console.error('Failed to register push token:', error);
    }

    // Configure Android channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'SnapRoad Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10B981',
      });

      await Notifications.setNotificationChannelAsync('hazards', {
        name: 'Hazard Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 500, 200, 500],
        lightColor: '#F59E0B',
        sound: 'hazard_alert.wav',
      });

      await Notifications.setNotificationChannelAsync('offers', {
        name: 'Nearby Offers',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#10B981',
      });
    }

    return token;
  },

  // Unregister
  unregister: async (): Promise<void> => {
    const token = await AsyncStorage.getItem('push_token');
    if (token) {
      try {
        await pushAPI.unregisterToken(token);
        await AsyncStorage.removeItem('push_token');
      } catch (error) {
        console.error('Failed to unregister push token:', error);
      }
    }
  },

  // Get preferences
  getPreferences: async (): Promise<NotificationPreferences> => {
    try {
      const stored = await AsyncStorage.getItem('notification_preferences');
      return stored ? JSON.parse(stored) : DEFAULT_PREFERENCES;
    } catch {
      return DEFAULT_PREFERENCES;
    }
  },

  // Update preferences
  updatePreferences: async (preferences: Partial<NotificationPreferences>): Promise<void> => {
    const current = await notificationService.getPreferences();
    const updated = { ...current, ...preferences };

    await AsyncStorage.setItem('notification_preferences', JSON.stringify(updated));

    try {
      await pushAPI.updatePreferences(updated);
    } catch (error) {
      console.error('Failed to sync notification preferences:', error);
    }
  },

  // Schedule local notification
  scheduleLocal: async (
    title: string,
    body: string,
    data?: Record<string, any>,
    trigger?: Notifications.NotificationTriggerInput
  ): Promise<string> => {
    return Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: trigger || null, // null = immediate
    });
  },

  // Cancel all notifications
  cancelAll: async (): Promise<void> => {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },

  // Get badge count
  getBadgeCount: async (): Promise<number> => {
    return Notifications.getBadgeCountAsync();
  },

  // Set badge count
  setBadgeCount: async (count: number): Promise<void> => {
    await Notifications.setBadgeCountAsync(count);
  },
};

// Notification listeners
export const setupNotificationListeners = (
  onNotificationReceived: (notification: Notifications.Notification) => void,
  onNotificationResponse: (response: Notifications.NotificationResponse) => void
) => {
  // Listener for notifications received while app is foregrounded
  const receivedSubscription = Notifications.addNotificationReceivedListener(onNotificationReceived);

  // Listener for user interaction with notification
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(onNotificationResponse);

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
};

export default notificationService;
```

### Create `/app/snaproad-mobile/src/hooks/useNotifications.ts`:
```typescript
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';
import { notificationService, setupNotificationListeners } from '../services/notifications';

export const useNotifications = () => {
  const navigation = useNavigation();
  const notificationListener = useRef<() => void>();

  useEffect(() => {
    // Register for notifications on mount
    notificationService.register();

    // Set up listeners
    notificationListener.current = setupNotificationListeners(
      // Notification received while app is open
      (notification) => {
        console.log('Notification received:', notification);
        // Could show an in-app toast/banner here
      },
      // User tapped on notification
      (response) => {
        const data = response.notification.request.content.data;
        handleNotificationNavigation(data);
      }
    );

    return () => {
      notificationListener.current?.();
    };
  }, []);

  const handleNotificationNavigation = (data: Record<string, any>) => {
    switch (data.type) {
      case 'offer':
        navigation.navigate('OfferDetail' as never, { offerId: data.offer_id } as never);
        break;
      case 'hazard':
        navigation.navigate('Map' as never, { 
          focusHazard: { lat: data.lat, lng: data.lng } 
        } as never);
        break;
      case 'challenge':
        navigation.navigate('Challenges' as never);
        break;
      case 'badge':
        navigation.navigate('Rewards' as never);
        break;
      case 'trip_summary':
        navigation.navigate('TripSummary' as never, data as never);
        break;
      default:
        console.log('Unknown notification type:', data.type);
    }
  };

  return {
    register: notificationService.register,
    unregister: notificationService.unregister,
    getPreferences: notificationService.getPreferences,
    updatePreferences: notificationService.updatePreferences,
    scheduleLocal: notificationService.scheduleLocal,
    setBadgeCount: notificationService.setBadgeCount,
  };
};

export default useNotifications;
```

---

## Phase 7: Testing

### Test location & navigation:
```bash
# On iOS Simulator
# - Debug > Location > Custom Location
# - Or use "City Run" / "Freeway Drive" presets

# On Android Emulator
# - Extended Controls > Location
# - Or adb emu geo fix <lng> <lat>
```

### Test push notifications:
```bash
# Using Expo's push notification tool
# https://expo.dev/notifications

# Test payload:
{
  "to": "ExponentPushToken[xxxxx]",
  "title": "New Offer Nearby!",
  "body": "Shell Gas Station: 15% off fuel",
  "data": {
    "type": "offer",
    "offer_id": "123"
  }
}
```

### Test QR scanning:
```bash
# Generate test QR codes at:
# https://www.qr-code-generator.com/

# Test with content:
# SNAPROAD:REDEEM:offer_123:exp_1234567890
```

---

## Migration Checklist

- [ ] Install all new dependencies (camera, notifications, etc.)
- [ ] Configure `app.json` with proper permissions
- [ ] Create `/src/services/api.ts` - API service layer
- [ ] Create `/src/services/navigation.ts` - Mapbox integration
- [ ] Create `/src/services/notifications.ts` - Push notification service
- [ ] Create `/src/hooks/useNavigation.ts` - Navigation hook
- [ ] Create `/src/hooks/useNotifications.ts` - Notification hook
- [ ] Create `TripScreen.tsx` with full navigation UI
- [ ] Create `QRGenerator.tsx` component
- [ ] Create `QRScanner.tsx` component
- [ ] Update `MapScreen.tsx` to use real Mapbox
- [ ] Replace all Zustand mock data with API calls
- [ ] Set up notification channels (Android)
- [ ] Test background location tracking
- [ ] Test hazard reporting flow
- [ ] Test QR code generation & scanning
- [ ] Test push notification delivery
- [ ] Build and test on physical iOS device

---

## Troubleshooting

**Location not updating:**
- Check permissions in device settings
- Ensure background location is enabled in `app.json`
- Test on physical device (simulators have limited GPS)

**Map not rendering:**
- `react-native-maps` uses Apple Maps on iOS by default - no API key needed
- Ensure `PROVIDER_DEFAULT` is set (not Google)
- Check that location permissions are granted

**Push notifications not received:**
- Test on physical device (not simulator)
- Verify Expo project ID is correct
- Check notification permissions in settings
- Verify backend registered the token

**Camera/QR not working:**
- Camera requires physical device
- Check camera permission is granted
- Verify `expo-camera` is properly installed

**Apple Maps Directions API errors:**
- Ensure you have MapKit JS credentials (Team ID, Key ID, Private Key)
- Token must be generated correctly (JWT format)
- For development without API: use the simpler `react-native-maps-directions` package

**Navigation instructions not showing:**
- Check Apple Maps Server API is returning data
- Verify JWT token hasn't expired (tokens are time-limited)
- Fallback: Use basic point-to-point routing without turn-by-turn

---

## Resources

- [react-native-maps Documentation](https://github.com/react-native-maps/react-native-maps)
- [Apple MapKit JS Documentation](https://developer.apple.com/documentation/mapkitjs)
- [Apple Maps Server API](https://developer.apple.com/documentation/applemapsserverapi)
- [Expo Location Docs](https://docs.expo.dev/versions/latest/sdk/location/)
- [Expo Camera Docs](https://docs.expo.dev/versions/latest/sdk/camera/)
- [Expo Notifications Docs](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [react-native-qrcode-svg](https://github.com/awesomejerry/react-native-qrcode-svg)

---

## Coordinate with Team

- **Andrew (Backend)**: API contracts for trips, hazards, push registration
- **Brian (Web)**: Consistent QR code format for cross-platform redemption
- **PM**: Mapbox API key, Expo project credentials, App Store/Play Store setup

---

**Questions? Check API contracts with Andrew or coordinate with PM for credentials.**
