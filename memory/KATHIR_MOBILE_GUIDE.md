# Kathir - Mobile Developer Guide (snaproad-mobile)
> **Role:** Mobile Developer  
> **Last Updated:** December 2025  
> **Focus:** React Native (Expo) app, all 42+ screens, navigation, API integration

---

## Quick Start

```bash
# Navigate to mobile app
cd /app/snaproad-mobile

# Install dependencies
yarn install

# Start web preview
npx expo start --web

# Start Expo Go (mobile)
npx expo start
```

---

## 1. Architecture Overview

```
/app/snaproad-mobile/
├── App.tsx                 # Root: SafeAreaProvider + StatusBar + Navigation
├── index.js               # Expo entry point
├── app.json               # Expo config (jsEngine: jsc, web bundler: metro)
├── babel.config.js        # babel-preset-expo
├── metro.config.js        # Metro bundler config
├── .env                   # EXPO_PUBLIC_API_URL
├── package.json
└── src/
    ├── navigation/
    │   └── index.tsx      # Stack + Tab navigation (42+ screens)
    ├── screens/           # All screen components
    │   └── index.ts       # Screen exports
    ├── components/
    │   ├── DrawerMenu.tsx       # Hamburger side menu
    │   ├── OrionVoice.tsx       # AI voice assistant
    │   ├── QuickStartGuide.tsx  # First-time user guide
    │   ├── RedemptionPopup.tsx  # Offer redemption modal
    │   ├── WebMap.tsx           # OpenStreetMap for web platform
    │   ├── Modals.tsx           # Shared modal components
    │   └── ui.tsx               # UI primitives (Card, Button)
    ├── contexts/
    │   └── ThemeContext.tsx     # Dark/light mode context
    ├── services/
    │   └── api.ts         # API service (calls backend)
    ├── store/
    │   └── index.ts       # Zustand stores
    ├── utils/
    │   └── theme.ts       # Colors, fonts, spacing
    ├── types/
    │   └── index.ts       # TypeScript types
    └── config.ts          # API_URL from .env
```

---

## 2. Navigation Structure

### Bottom Tab Navigator (MainTabs)
```
MainTabs
├── Map      → MapScreen.tsx
├── Routes   → RoutesScreen.tsx
├── Rewards  → RewardsScreen.tsx
└── Profile  → ProfileScreen.tsx
```

### Full Screen Stack
```
Stack.Navigator
├── Onboarding
│   ├── Welcome
│   ├── PlanSelection
│   └── CarSetup
├── MainTabs (4 bottom tabs)
├── Feature Screens (37 screens)
│   ├── OfferDetail, Leaderboard, Settings
│   ├── FuelDashboard, TripLogs, Family
│   ├── TripAnalytics, RouteHistory3D, OrionCoach
│   ├── MyOffers, DriverAnalytics, Gems
│   ├── PhotoCapture, PrivacyCenter, NotificationSettings
│   ├── SearchDestination, RoutePreview, ActiveNavigation
│   ├── HazardFeed, CommuteScheduler, InsuranceReport
│   ├── Help, FriendsHub, Badges, GemHistory
│   ├── CarStudio, Challenges, LevelProgress
│   ├── WeeklyRecap, AdminDashboard, PartnerDashboard
│   ├── AccountInfo, PrivacyPolicy, TermsOfService
│   ├── Pricing, Payment, Live, Engagement
│   └── RoadReports
└── QuickStartGuide (Modal)
```

---

## 3. All 42+ Screens Reference

### Onboarding (4)
| Screen | File | Purpose |
|--------|------|---------|
| SplashScreen | `SplashScreen.tsx` | Logo animation (2.5s) |
| WelcomeScreen | `WelcomeScreen.tsx` | 4-slide onboarding carousel |
| PlanSelectionScreen | `PlanSelectionScreen.tsx` | Basic vs Premium |
| CarSetupScreen | `CarSetupScreen.tsx` | Car model + color |

### Core Tabs (5)
| Screen | File | Purpose |
|--------|------|---------|
| MapScreen | `MapScreen.tsx` | Main map with offers |
| RoutesScreen | `RoutesScreen.tsx` | Saved commute routes |
| RewardsScreen | `RewardsScreen.tsx` | Offers feed + gems |
| ProfileScreen | `ProfileScreen.tsx` | User stats + level |
| OffersScreen | `OffersScreen.tsx` | Full offers list |

### Analytics & Tracking (6)
| Screen | File | Purpose |
|--------|------|---------|
| TripAnalyticsScreen | `TripAnalyticsScreen.tsx` | Per-trip breakdown |
| RouteHistory3DScreen | `RouteHistory3DScreen.tsx` | SVG 3D route viz |
| DriverAnalyticsScreen | `DriverAnalyticsScreen.tsx` | 6-metric score |
| TripLogsScreen | `TripLogsScreen.tsx` | Trip history list |
| FuelDashboardScreen | `FuelDashboardScreen.tsx` | Fuel cost tracking |
| WeeklyRecapScreen | `WeeklyRecapScreen.tsx` | Weekly summary |

### Gamification (7)
| Screen | File | Purpose |
|--------|------|---------|
| LeaderboardScreen | `LeaderboardScreen.tsx` | Driver rankings |
| BadgesScreen | `BadgesScreen.tsx` | Badge collection |
| ChallengesScreen | `ChallengesScreen.tsx` | Active challenges |
| GemsScreen | `GemsScreen.tsx` | Gem balance + earn |
| GemHistoryScreen | `GemHistoryScreen.tsx` | Transaction history |
| LevelProgressScreen | `LevelProgressScreen.tsx` | XP milestones |
| CarStudioScreen | `CarStudioScreen.tsx` | Car customization |

### Navigation (6)
| Screen | File | Purpose |
|--------|------|---------|
| SearchDestinationScreen | `SearchDestinationScreen.tsx` | Destination search |
| RoutePreviewScreen | `RoutePreviewScreen.tsx` | Route preview |
| ActiveNavigationScreen | `ActiveNavigationScreen.tsx` | Turn-by-turn nav |
| HazardFeedScreen | `HazardFeedScreen.tsx` | Community reports |
| CommuteSchedulerScreen | `CommuteSchedulerScreen.tsx` | Recurring routes |
| RoadReportsScreen | `RoadReportsScreen.tsx` | Report hazards |

### Social (4)
| Screen | File | Purpose |
|--------|------|---------|
| FamilyScreen | `FamilyScreen.tsx` | Family members |
| FriendsHubScreen | `FriendsHubScreen.tsx` | Friends list |
| LiveScreen | `LiveScreen.tsx` | Real-time locations |
| EngagementScreen | `EngagementScreen.tsx` | Badges/skins/progress |

### Offers & Payments (4)
| Screen | File | Purpose |
|--------|------|---------|
| OfferDetailScreen | `OfferDetailScreen.tsx` | Offer details + redeem |
| MyOffersScreen | `MyOffersScreen.tsx` | Saved/redeemed offers |
| PaymentScreen | `PaymentScreen.tsx` | Stripe checkout |
| PricingScreen | `PricingScreen.tsx` | Plan pricing |

### AI & Camera (2)
| Screen | File | Purpose |
|--------|------|---------|
| OrionCoachScreen | `OrionCoachScreen.tsx` | AI driving coach |
| PhotoCaptureScreen | `PhotoCaptureScreen.tsx` | Photo report + blur |

### Settings & Legal (6)
| Screen | File | Purpose |
|--------|------|---------|
| SettingsScreen | `SettingsScreen.tsx` | App preferences |
| PrivacyCenterScreen | `PrivacyCenterScreen.tsx` | Privacy controls |
| NotificationSettingsScreen | `NotificationSettingsScreen.tsx` | Push preferences |
| AccountInfoScreen | `AccountInfoScreen.tsx` | Account details |
| PrivacyPolicyScreen | `PrivacyPolicyScreen.tsx` | Privacy policy |
| TermsOfServiceScreen | `TermsOfServiceScreen.tsx` | Terms of service |
| HelpScreen | `HelpScreen.tsx` | FAQ + support |

### Admin/Partner (2)
| Screen | File | Purpose |
|--------|------|---------|
| AdminDashboardScreen | `AdminDashboardScreen.tsx` | 5-tab admin console |
| PartnerDashboardScreen | `PartnerDashboardScreen.tsx` | 5-tab partner portal |

---

## 4. Key Components

### DrawerMenu.tsx
Hamburger side menu with sections:
- **Social:** Friends Hub, Family, Leaderboard, Badges
- **Navigation:** Active Navigation, Search, Hazard Feed, Commute
- **Rewards:** Gems, Gem History, My Offers
- **Analytics:** Driver Analytics, Trip Analytics, Route History, Weekly Recap
- **Premium:** Car Studio, Challenges, Insurance, Orion Coach, Photo Capture
- **Management:** Admin Dashboard, Partner Dashboard
- **Settings:** Settings, Privacy Center, Notifications, Help

### WebMap.tsx
Platform-specific map component:
- **iOS/Android:** Uses expo-location + react-native-maps
- **Web:** Falls back to Leaflet/OpenStreetMap

### OrionVoice.tsx
AI voice assistant component:
- Voice input via expo-speech
- GPT-5.2 via `/api/orion/chat`
- Voice output via expo-speech

### QuickStartGuide.tsx
First-time user walkthrough:
1. Earn Gems while driving
2. Redeem offers at partner locations
3. Track your safety score
4. Connect with family & friends
5. Meet Orion, your AI coach

### RedemptionPopup.tsx
Offer redemption confirmation modal:
- QR code display
- Gem earnings animation
- Partner location info

---

## 5. API Integration

### Config
```typescript
// src/config.ts
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8001';
```

### Service File
```typescript
// src/services/api.ts
export const api = {
  get: async (endpoint: string) => {
    const res = await fetch(`${API_URL}${endpoint}`);
    return res.json();
  },
  post: async (endpoint: string, data?: object) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined
    });
    return res.json();
  }
};
```

### Key Endpoints Used
| Endpoint | Used By | Purpose |
|----------|---------|---------|
| `/api/auth/login` | WelcomeScreen | User login |
| `/api/user/profile` | ProfileScreen | Get user data |
| `/api/offers` | OffersScreen, MapScreen | List offers |
| `/api/offers/{id}/redeem` | OfferDetailScreen | Redeem offer |
| `/api/badges` | BadgesScreen | Badge collection |
| `/api/challenges` | ChallengesScreen | Active challenges |
| `/api/gems/history` | GemHistoryScreen | Gem transactions |
| `/api/trips/history` | TripLogsScreen | Trip list |
| `/api/orion/chat` | OrionCoachScreen | AI chat |
| `/api/payments/checkout/session` | PaymentScreen | Create Stripe session |

---

## 6. Theme System

### Theme Context
```typescript
// src/contexts/ThemeContext.tsx
export const ThemeContext = createContext({
  isDark: true,
  toggleTheme: () => {},
  colors: darkColors
});
```

### Color Tokens
```typescript
// src/utils/theme.ts
export const Colors = {
  primary: '#2563eb',      // Blue
  secondary: '#10b981',    // Green (gems)
  background: '#0f172a',   // Slate 900
  surface: '#1e293b',      // Slate 800
  text: '#f8fafc',         // Slate 50
  textMuted: '#94a3b8',    // Slate 400
  // ... more colors
};
```

---

## 7. Known Issues & Fixes

### Issue: White Screen on Web
**Cause:** `useNativeDriver: true` not supported on web
**Fix:** Use platform check:
```typescript
useNativeDriver: Platform.OS !== 'web'
```

### Issue: Navigation Animation Crash on Web
**Fix:** Disable animations on web:
```typescript
animation: Platform.OS !== 'web' ? 'slide_from_right' : 'none'
```

### Issue: Hermes import.meta Error
**Fix:** Use JSC engine in `app.json`:
```json
{ "expo": { "jsEngine": "jsc" } }
```

---

## 8. Testing

### Manual Testing
```bash
# Start web preview
npx expo start --web

# Test on Expo Go
npx expo start
```

### Test Credentials
| Role | Email | Password |
|------|-------|----------|
| Driver | driver@snaproad.com | password123 |
| Partner | partner@snaproad.com | password123 |
| Admin | admin@snaproad.com | password123 |

---

## 9. Next Steps for Mobile

### P1 - High Priority
1. **Apple MapKit Integration**
   - Replace WebMap with react-native-maps
   - Use MapKit provider on iOS
   - Keep Leaflet fallback for web

2. **Push Notifications**
   - Configure expo-notifications
   - Add FCM for Android
   - Add APNs for iOS

### P2 - Medium Priority
1. **Offline Support**
   - Cache offers locally
   - Queue redemptions for sync

2. **Performance**
   - Lazy load screens
   - Optimize images

### P3 - Future
1. **EAS Build**
   - iOS TestFlight
   - Android Play Store

---

## 10. File Reference Quick Links

| What | Where |
|------|-------|
| Navigation | `/app/snaproad-mobile/src/navigation/index.tsx` |
| All Screens | `/app/snaproad-mobile/src/screens/` |
| Components | `/app/snaproad-mobile/src/components/` |
| API Service | `/app/snaproad-mobile/src/services/api.ts` |
| Theme | `/app/snaproad-mobile/src/utils/theme.ts` |
| Store | `/app/snaproad-mobile/src/store/index.ts` |
| Config | `/app/snaproad-mobile/src/config.ts` |
| Types | `/app/snaproad-mobile/src/types/index.ts` |

---

*Document owner: Mobile Developer (Kathir) | Last updated: December 2025*
