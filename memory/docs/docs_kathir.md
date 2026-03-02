# SnapRoad — Mobile Developer Documentation (Kathir)
> **Role:** Mobile Developer | **Updated:** February 2026  
> **Focus:** React Native app, screens, navigation, build setup, known issues

---

## 1. Mobile App Overview

**Framework:** React Native + Expo SDK 54  
**Entry point:** `/app/snaproad-mobile/App.tsx` → `src/navigation/index.tsx`  
**JS Engine:** JSC (Hermes disabled for web build — see `app.json`)  
**State management:** Zustand  
**Navigation:** `@react-navigation/native-stack` v7 + `@react-navigation/bottom-tabs` v7  

---

## 2. Repository Structure

```
/app/snaproad-mobile/
├── App.tsx                        # Root: SafeAreaProvider + StatusBar + Navigation
├── index.js                       # Expo registerRootComponent entry
├── app.json                       # Expo config (jsEngine, web bundler, plugins)
├── babel.config.js                # Babel: babel-preset-expo
├── metro.config.js                # Metro: transformIgnorePatterns for Expo packages
├── tsconfig.json                  # TypeScript config (extends expo/tsconfig.base)
├── package.json                   # Dependencies
└── src/
    ├── navigation/
    │   └── index.tsx              # Full navigation tree (Stack + Bottom Tabs)
    ├── screens/                   # 42 screen components (see full list below)
    ├── components/
    │   ├── DrawerMenu.tsx         # Hamburger side drawer (all app sections)
    │   ├── Modals.tsx             # Shared modal components
    │   └── ui.tsx                 # Shared UI primitives (Card, Button, etc.)
    ├── services/
    │   └── api.ts                 # API service (calls backend at EXPO_PUBLIC_API_URL)
    ├── store/
    │   └── index.ts               # Zustand stores (user, auth)
    ├── utils/
    │   └── theme.ts               # Colors, spacing, fonts, border radii
    ├── types/
    │   └── index.ts               # TypeScript types
    ├── config.ts                  # API_URL from .env
    └── assets/
        ├── icon.png
        ├── splash.png
        └── adaptive-icon.png
```

---

## 3. Navigation Structure

```
Root (Navigation component in navigation/index.tsx)
│
├── Splash (2.5s auto-dismiss) → Welcome or MainTabs
│
└── NavigationContainer
    └── Stack.Navigator (screenOptions: headerShown: false, no animation on web)
        ├── Welcome          → WelcomeScreen (onboarding carousel)
        ├── PlanSelection    → PlanSelectionScreen
        ├── CarSetup         → CarSetupScreen
        ├── MainTabs         → Bottom Tab Navigator
        │     ├── Map        → MapScreen
        │     ├── Routes     → RoutesScreen
        │     ├── Rewards    → RewardsScreen
        │     └── Profile    → ProfileScreen
        ├── OfferDetail
        ├── Leaderboard
        ├── Settings
        ├── FuelDashboard
        ├── TripLogs / TripHistory (same component)
        ├── Family
        ├── TripAnalytics
        ├── RouteHistory3D
        ├── OrionCoach
        ├── MyOffers
        ├── DriverAnalytics
        ├── Gems
        ├── PhotoCapture
        ├── PrivacyCenter
        ├── NotificationSettings
        ├── SearchDestination
        ├── RoutePreview
        ├── ActiveNavigation
        ├── HazardFeed
        ├── CommuteScheduler
        ├── InsuranceReport
        ├── Help
        ├── FriendsHub
        ├── Badges
        ├── GemHistory
        ├── CarStudio
        ├── Challenges
        ├── LevelProgress
        ├── WeeklyRecap
        ├── AdminDashboard   (5 tabs: Overview, Users, Partners, Offers, Events)
        └── PartnerDashboard (5 tabs: Overview, Offers, Locations, Boosts, Analytics)
```

---

## 4. All Screens Reference

| Screen Name | File | Key Feature |
|-------------|------|-------------|
| SplashScreen | `SplashScreen.tsx` | Logo animation, auto-navigates after 2.5s |
| WelcomeScreen | `WelcomeScreen.tsx` | 4-slide onboarding carousel with Animated.FlatList |
| PlanSelectionScreen | `PlanSelectionScreen.tsx` | Basic vs Premium plan cards |
| CarSetupScreen | `CarSetupScreen.tsx` | Car model + color selection |
| MapScreen | `MapScreen.tsx` | Interactive map, offer pins, gem collect, drawer menu |
| RoutesScreen | `RoutesScreen.tsx` | Saved commute routes + scheduler |
| RewardsScreen | `RewardsScreen.tsx` | Offers feed + gems wallet |
| ProfileScreen | `ProfileScreen.tsx` | User stats, level progress, badges |
| OfferDetailScreen | `OfferDetailScreen.tsx` | Offer details + redeem QR |
| LeaderboardScreen | `LeaderboardScreen.tsx` | Driver leaderboard table |
| SettingsScreen | `SettingsScreen.tsx` | App preferences + theme |
| FuelDashboardScreen | `FuelDashboardScreen.tsx` | Fuel log, cost tracking, trends |
| TripLogsScreen | `TripLogsScreen.tsx` | Trip history list |
| FamilyScreen | `FamilyScreen.tsx` | Family member live locations |
| TripAnalyticsScreen | `TripAnalyticsScreen.tsx` | Per-trip analytics breakdown |
| RouteHistory3DScreen | `RouteHistory3DScreen.tsx` | SVG-based 3D route visualization |
| OrionCoachScreen | `OrionCoachScreen.tsx` | AI driving coach chat (GPT-5.2) |
| MyOffersScreen | `MyOffersScreen.tsx` | Saved/redeemed offers |
| DriverAnalyticsScreen | `DriverAnalyticsScreen.tsx` | 6-metric driving score + trends |
| GemsScreen | `GemsScreen.tsx` | Gem balance, history, earn methods |
| PhotoCaptureScreen | `PhotoCaptureScreen.tsx` | Photo incident report + AI blur |
| PrivacyCenterScreen | `PrivacyCenterScreen.tsx` | Privacy settings + GDPR |
| NotificationSettingsScreen | `NotificationSettingsScreen.tsx` | Push notification preferences |
| ActiveNavigationScreen | `ActiveNavigationScreen.tsx` | Turn-by-turn navigation UI |
| SearchDestinationScreen | `SearchDestinationScreen.tsx` | Destination search + recent |
| RoutePreviewScreen | `RoutePreviewScreen.tsx` | Route preview before start |
| HazardFeedScreen | `HazardFeedScreen.tsx` | Community hazard reports map |
| CommuteSchedulerScreen | `CommuteSchedulerScreen.tsx` | Recurring commute setup |
| InsuranceReportScreen | `InsuranceReportScreen.tsx` | Insurance report generator |
| HelpScreen | `HelpScreen.tsx` | FAQ + contact support |
| FriendsHubScreen | `FriendsHubScreen.tsx` | Friends list + challenge initiation |
| BadgesScreen | `BadgesScreen.tsx` | Badge collection grid |
| GemHistoryScreen | `GemHistoryScreen.tsx` | Gem transaction history |
| CarStudioScreen | `CarStudioScreen.tsx` | Car customization (colors, models) |
| ChallengesScreen | `ChallengesScreen.tsx` | Active + pending challenges |
| LevelProgressScreen | `LevelProgressScreen.tsx` | XP level progress + milestones |
| WeeklyRecapScreen | `WeeklyRecapScreen.tsx` | Weekly driving summary |
| AdminDashboardScreen | `AdminDashboardScreen.tsx` | Full admin console (5 tabs) |
| PartnerDashboardScreen | `PartnerDashboardScreen.tsx` | Full partner portal (5 tabs) |

---

## 5. Key Dependencies

```json
{
  "expo": "~54.0.0",
  "react": "19.0.0",
  "react-native": "0.78.2",
  "react-native-web": "~0.19.13",
  "@react-navigation/native": "^7.1.6",
  "@react-navigation/native-stack": "^7.3.10",
  "@react-navigation/bottom-tabs": "^7.3.10",
  "expo-linear-gradient": "~14.1.4",
  "expo-location": "~18.1.5",
  "react-native-svg": "15.11.2",
  "react-native-safe-area-context": "5.4.0",
  "@expo/vector-icons": "^14.0.4",
  "zustand": "^4.5.0"
}
```

**Note:** `react-native-reanimated` is NOT installed. All animations use React Native's built-in `Animated` API.

---

## 6. Build Configuration

### `app.json` — Key Settings
```json
{
  "expo": {
    "jsEngine": "jsc",           ← IMPORTANT: Hermes disabled (web build fix)
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

## 7. Known Issues & Fixes Applied

### Issue: White Screen on Web Build
**Root cause:** `useNativeDriver: true` in `Animated` API is not supported on React Native Web for:
- `Animated.event` (WelcomeScreen onScroll)
- `Animated.spring` with tension/friction (SplashScreen)

**Fix applied (Feb 2026):**
All `useNativeDriver: true` occurrences changed to `useNativeDriver: Platform.OS !== 'web'` in:
- `SplashScreen.tsx`
- `WelcomeScreen.tsx` (set to `false` for Animated.event)
- `MapScreen.tsx`
- `ActiveNavigationScreen.tsx`
- `RouteHistory3DScreen.tsx`
- `CarStudioScreen.tsx`

Navigation `animation` option set to `'none'` on web:
```tsx
animation: Platform.OS !== 'web' ? 'slide_from_right' : 'none'
```

### Issue: `import.meta` Error
**Root cause:** Expo SDK 54 with Hermes engine
**Fix:** `"jsEngine": "jsc"` in `app.json`

### Issue: React version mismatch
**Root cause:** `react-native 0.78.2` requires `react 19.0.0`
**Fix:** Updated `react`, `react-dom`, `@types/react` to `19.0.0`

---

## 8. Running the App Locally

```bash
cd /app/snaproad-mobile

# Install dependencies
yarn install

# Start for web (browser preview)
npx expo start --web

# Start for Expo Go (mobile)
npx expo start

# Export for web production
npx expo export --platform web
```

**Environment variable:** Create `.env`:
```
EXPO_PUBLIC_API_URL=https://your-backend-url.com
```

---

## 9. API Integration

**Service file:** `src/services/api.ts`  
**Config:** `src/config.ts` — exports `API_URL` from `EXPO_PUBLIC_API_URL`

All screens call the backend via `API_URL`. Currently using mock data responses. After Supabase migration, the backend will return real data with no frontend changes required.

**Test credentials:**
- Driver: `driver@snaproad.com` / `password123`
- Partner: `partner@snaproad.com` / `password123`
- Admin: `admin@snaproad.com` / `password123`

---

## 10. DrawerMenu Sections

The `DrawerMenu.tsx` provides access to all features via hamburger menu:

| Section | Screens |
|---------|---------|
| Navigation | Active Navigation, Search Destination, Route Preview, Hazard Feed, Commute Scheduler |
| Social | Friends Hub, Family, Leaderboard, Badges |
| Rewards | Gems, Gem History, My Offers |
| Analytics | Driver Analytics, Trip Analytics, Route History 3D, Weekly Recap, Level Progress |
| Premium | Car Studio, Challenges, Insurance Report, Orion Coach, Photo Capture |
| Management | Admin Dashboard, Partner Dashboard |
| Settings | Settings, Privacy Center, Notifications, Help |

---

## 11. Timestamps

| Milestone | Date |
|-----------|------|
| 42-screen mobile app created | Feb 2026 |
| Admin + Partner mobile dashboards added | Feb 2026 |
| DrawerMenu with all sections | Feb 2026 |
| Build config fixed (babel, metro, app.json) | Feb 2026 |
| Web animation crash fixed (`useNativeDriver`) | Feb 2026 |
| **Next:** Connect screens to live Supabase data | TBD |

---

*Document owner: Mobile Developer (Kathir) | Last updated: February 2026*
