# SnapRoad Mobile Developer Guide
## For Kathir (Mobile Lead)

> **Tech Stack**: React Native (Expo SDK 54) + TypeScript + Zustand + React Navigation v7
> **Maps**: Apple Maps MapKit (via `react-native-maps` with `PROVIDER_DEFAULT` on iOS)
> **Current State**: 42 screens fully implemented and wired in navigation. Web build working. Animation crash fixed.
> **Updated**: February 2026

---

## IMPORTANT: Apple Maps MapKit (NOT Mapbox)

SnapRoad uses **Apple Maps MapKit** for all mapping functionality.

### Map Display (No API Key Needed)
- Use `react-native-maps` with `provider={PROVIDER_DEFAULT}` — on iOS, this uses native Apple MapKit
- Map display, user location, markers, polylines all work without credentials
- For Expo Go preview: use placeholder map UI (react-native-maps needs dev build)

### Directions, Search & ETA (Needs Backend Token)
- Andrew creates `GET /api/maps/token` — generates signed JWT for Apple Maps Server API
- Use token to call: directions, search, ETA, reverse geocode
- **Kathir does NOT need MapKit credentials** — backend handles tokens

```tsx
// Apple Maps in SnapRoad Mobile
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';

<MapView
  provider={PROVIDER_DEFAULT}  // Apple Maps on iOS
  showsUserLocation
  showsTraffic={true}
  mapType="mutedStandard"
>
  <Polyline coordinates={routeCoords} strokeColor="#10B981" strokeWidth={6} />
</MapView>
```

---

## Project Structure

```
/app/snaproad-mobile/
├── App.tsx                      # Root: SafeAreaProvider + StatusBar + Navigation
├── index.js                     # Expo registerRootComponent entry
├── app.json                     # Expo config — jsEngine: jsc, web bundler: metro
├── babel.config.js              # babel-preset-expo
├── metro.config.js              # transformIgnorePatterns for Expo packages
├── package.json                 # Dependencies
└── src/
    ├── navigation/
    │   └── index.tsx            # Full navigation tree — Stack + Bottom Tabs + DrawerMenu
    ├── screens/                 # 42 screen components (ALL DONE — see full list)
    ├── components/
    │   ├── DrawerMenu.tsx       # Hamburger side drawer (access to all 40+ screens)
    │   ├── Modals.tsx           # Shared modal components
    │   └── ui.tsx               # Card, Button, etc.
    ├── services/
    │   └── api.ts               # API service (calls EXPO_PUBLIC_API_URL)
    ├── store/
    │   └── index.ts             # Zustand stores (user, auth)
    ├── utils/
    │   └── theme.ts             # Colors, spacing, fonts, border radii
    ├── types/
    │   └── index.ts             # TypeScript types
    └── config.ts                # API_URL from .env
```

---

## Navigation Structure

ALL screens are already wired in `src/navigation/index.tsx`. No TODO items remain.

```
Root
├── SplashScreen (2.5s auto-dismiss)
└── NavigationContainer
    └── Stack.Navigator
        ├── Welcome
        ├── PlanSelection
        ├── CarSetup
        ├── MainTabs (Bottom Tab Navigator)
        │     ├── Map → MapScreen
        │     ├── Routes → RoutesScreen
        │     ├── Rewards → RewardsScreen
        │     └── Profile → ProfileScreen
        ├── OfferDetail, Leaderboard, Settings
        ├── FuelDashboard, TripLogs, TripHistory, Family
        ├── TripAnalytics, RouteHistory3D, OrionCoach, MyOffers
        ├── DriverAnalytics, Gems, PhotoCapture
        ├── PrivacyCenter, NotificationSettings
        ├── SearchDestination, RoutePreview, ActiveNavigation
        ├── HazardFeed, CommuteScheduler, InsuranceReport, Help
        ├── FriendsHub, Badges, GemHistory
        ├── CarStudio, Challenges, LevelProgress, WeeklyRecap
        ├── AdminDashboard (5 tabs: Overview, Users, Partners, Offers, Events)
        └── PartnerDashboard (5 tabs: Overview, Offers, Locations, Boosts, Analytics)
```

**DrawerMenu** provides access to all screens by section:
- Navigation, Social, Rewards, Analytics, Premium, Management, Settings

---

## All 42 Screens (COMPLETE)

| Screen | File | Description |
|--------|------|-------------|
| SplashScreen | `SplashScreen.tsx` | Animated logo — auto-navigates after 2.5s |
| WelcomeScreen | `WelcomeScreen.tsx` | 4-slide onboarding carousel |
| PlanSelectionScreen | `PlanSelectionScreen.tsx` | Basic vs Premium |
| CarSetupScreen | `CarSetupScreen.tsx` | Car model + color |
| MapScreen | `MapScreen.tsx` | Main map, offers, gems, drawer |
| RoutesScreen | `RoutesScreen.tsx` | Saved commute routes + scheduler |
| RewardsScreen | `RewardsScreen.tsx` | Offers + gems wallet |
| ProfileScreen | `ProfileScreen.tsx` | Stats, level, badges |
| OfferDetailScreen | `OfferDetailScreen.tsx` | Offer details + redeem |
| LeaderboardScreen | `LeaderboardScreen.tsx` | Driver rankings |
| SettingsScreen | `SettingsScreen.tsx` | App preferences |
| FuelDashboardScreen | `FuelDashboardScreen.tsx` | Fuel log + cost tracking |
| TripLogsScreen | `TripLogsScreen.tsx` | Trip history list |
| FamilyScreen | `FamilyScreen.tsx` | Family live locations |
| TripAnalyticsScreen | `TripAnalyticsScreen.tsx` | Trip + fuel analytics (3 tabs) |
| RouteHistory3DScreen | `RouteHistory3DScreen.tsx` | SVG pseudo-3D route viz |
| OrionCoachScreen | `OrionCoachScreen.tsx` | AI driving coach (GPT-5.2) |
| MyOffersScreen | `MyOffersScreen.tsx` | Saved/redeemed offers |
| DriverAnalyticsScreen | `DriverAnalyticsScreen.tsx` | 6-metric driving score |
| GemsScreen | `GemsScreen.tsx` | Gem balance + history |
| PhotoCaptureScreen | `PhotoCaptureScreen.tsx` | Photo incident + AI blur |
| PrivacyCenterScreen | `PrivacyCenterScreen.tsx` | Privacy settings |
| NotificationSettingsScreen | `NotificationSettingsScreen.tsx` | Push notification prefs |
| ActiveNavigationScreen | `ActiveNavigationScreen.tsx` | Turn-by-turn guidance |
| SearchDestinationScreen | `SearchDestinationScreen.tsx` | Destination search |
| RoutePreviewScreen | `RoutePreviewScreen.tsx` | Route preview before start |
| HazardFeedScreen | `HazardFeedScreen.tsx` | Community hazard reports |
| CommuteSchedulerScreen | `CommuteSchedulerScreen.tsx` | Recurring commute setup |
| InsuranceReportScreen | `InsuranceReportScreen.tsx` | Insurance report generator |
| HelpScreen | `HelpScreen.tsx` | FAQ + contact |
| FriendsHubScreen | `FriendsHubScreen.tsx` | Friends + challenges |
| BadgesScreen | `BadgesScreen.tsx` | Badge collection |
| GemHistoryScreen | `GemHistoryScreen.tsx` | Gem transaction history |
| CarStudioScreen | `CarStudioScreen.tsx` | Car colors + models |
| ChallengesScreen | `ChallengesScreen.tsx` | Active/pending challenges |
| LevelProgressScreen | `LevelProgressScreen.tsx` | XP level + milestones |
| WeeklyRecapScreen | `WeeklyRecapScreen.tsx` | Weekly driving summary |
| AdminDashboardScreen | `AdminDashboardScreen.tsx` | Full admin console (5 tabs) |
| PartnerDashboardScreen | `PartnerDashboardScreen.tsx` | Full partner portal (5 tabs) |

---

## Build Configuration (Current — Working)

### `app.json` — Key Settings
```json
{
  "expo": {
    "jsEngine": "jsc",     ← CRITICAL: Hermes disabled (fixes import.meta error on web)
    "web": {
      "bundler": "metro",
      "output": "single"
    }
  }
}
```

### `babel.config.js`
```js
module.exports = function (api) {
  api.cache(true);
  return { presets: ['babel-preset-expo'] };
};
```

### `metro.config.js`
```js
const { getDefaultConfig } = require('@expo/metro-config');
const config = getDefaultConfig(__dirname);
config.transformer.transformIgnorePatterns = [
  'node_modules/(?!(react-native|@react-native|expo|@expo|react-navigation|@react-navigation|react-native-web|react-native-safe-area-context|react-native-screens|@react-native-async-storage)/)',
];
module.exports = config;
```

---

## Known Issues & Fixes Applied (February 2026)

### ✅ FIXED: White Screen on Web Build
**Root cause**: `useNativeDriver: true` in React Native `Animated` API is NOT supported on React Native Web.

**Specifically**:
- `Animated.event` with `useNativeDriver: true` → crashes silently on web
- `Animated.spring` with `tension`/`friction` + native driver → unsupported on RN Web 0.19

**Fix applied**: Changed all instances to `useNativeDriver: Platform.OS !== 'web'` in:
- `SplashScreen.tsx` — spring + timing animations
- `WelcomeScreen.tsx` — Animated.event (set to `false`)
- `MapScreen.tsx` — pulse animations
- `ActiveNavigationScreen.tsx` — pulse animations
- `RouteHistory3DScreen.tsx` — spring animations
- `CarStudioScreen.tsx` — rotation animations

Navigation animation also fixed:
```tsx
// navigation/index.tsx — screenOptions
animation: Platform.OS !== 'web' ? 'slide_from_right' : 'none'
```

### ✅ FIXED: `import.meta` Error
**Root cause**: Expo SDK 54 + Hermes engine incompatibility on web
**Fix**: `"jsEngine": "jsc"` in `app.json`

### ✅ FIXED: React Version Mismatch
**Root cause**: `react-native 0.78.2` requires `react 19.0.0`
**Fix**: Updated `react`, `react-dom`, `@types/react` to `19.0.0`

---

## Running the App

```bash
cd /app/snaproad-mobile

# Install dependencies
yarn install

# Start for web (browser preview)
npx expo start --web

# Start for Expo Go (mobile device)
npx expo start

# Export for web production
npx expo export --platform web

# Native build (iOS)
eas build --profile development --platform ios
```

### Environment
File: `/app/snaproad-mobile/.env`
```
EXPO_PUBLIC_API_URL=https://your-backend-url.com
```

---

## API Endpoints Available

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/api/auth/login` | POST | ✅ Supabase Auth | Use for login |
| `/api/trips/history/detailed` | GET | Mock | Replace with real after Supabase migration |
| `/api/fuel/analytics` | GET | Mock | Replace with real after Supabase migration |
| `/api/routes/history-3d` | GET | Mock | Replace with real after Supabase migration |
| `/api/offers/personalized` | GET | Mock | Replace with real after Supabase migration |
| `/api/orion/chat` | POST | **✅ LIVE** | GPT-5.2 via Emergent LLM Key |
| `/api/maps/token` | GET | **TODO** | Andrew to build — Apple MapKit JWT |
| `/api/photo/analyze` | POST | **✅ LIVE** | OpenAI Vision |

**Test Credentials**:
- Driver: `driver@snaproad.com` / `password123`

---

## Remaining Work for Kathir

| Task | Priority | Notes |
|------|----------|-------|
| Replace mock MapScreen with real `react-native-maps` | P1 | Needs `eas build` (dev build) |
| Connect screens to live Supabase data | P1 | After Andrew runs migration |
| Add `react-native-maps-directions` for routing | P1 | After Andrew adds `/api/maps/token` |
| EAS Build setup (iOS + Android) | P1 | `eas.json` already present |
| Push notifications (Expo Notifications) | P2 | Needs Expo project ID from PM |
| Real-time trip telemetry (GPS tracking) | P2 | Core safety score feature |

---

*Document owner: Kathir (Mobile Lead) | Last updated: February 2026*
