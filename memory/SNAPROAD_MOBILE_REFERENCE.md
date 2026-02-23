# SnapRoad Mobile - Complete Screen & Endpoint Reference

## Last Updated: February 23, 2026

---

## APP ARCHITECTURE

```
/app/snaproad-mobile/
├── App.tsx                    # Entry point with ThemeProvider
├── .env                       # Environment variables
├── src/
│   ├── components/            # Reusable UI components
│   │   ├── DrawerMenu.tsx     # Side navigation drawer
│   │   ├── OrionVoice.tsx     # AI voice assistant modal
│   │   ├── QuickStartGuide.tsx # First-time user onboarding
│   │   ├── RedemptionPopup.tsx # Offer redemption flow
│   │   └── WebMap.tsx         # OpenStreetMap for web
│   ├── contexts/
│   │   └── ThemeContext.tsx   # Dark/light mode
│   ├── navigation/
│   │   └── index.tsx          # Stack + Tab navigation
│   ├── screens/               # All app screens (50+)
│   ├── store/
│   │   └── index.ts           # Zustand state management
│   └── utils/
│       └── theme.ts           # Colors, fonts, spacing
```

---

## ALL SCREENS & THEIR ENDPOINTS

### ONBOARDING FLOW

| Screen | File | Endpoints Used |
|--------|------|----------------|
| Splash | `SplashScreen.tsx` | None |
| Welcome | `WelcomeScreen.tsx` | None |
| Plan Selection | `PlanSelectionScreen.tsx` | `POST /api/user/plan` |
| Car Setup | `CarSetupScreen.tsx` | `POST /api/user/car` |

### MAIN TABS (Bottom Navigation)

| Tab | Screen | Endpoints Used |
|-----|--------|----------------|
| Map | `MapScreen.tsx` | `GET /api/offers`, `GET /api/map/search`, `GET /api/map/directions` |
| Routes | `RoutesScreen.tsx` | `GET /api/routes`, `POST /api/routes`, `DELETE /api/routes/{id}` |
| Rewards | `RewardsScreen.tsx` | `GET /api/offers`, `GET /api/challenges`, `GET /api/badges` |
| Profile | `ProfileScreen.tsx` | `GET /api/user/profile`, `GET /api/user/car` |

### OFFERS & REWARDS

| Screen | File | Endpoints Used |
|--------|------|----------------|
| Offers List | `OffersScreen.tsx` | `GET /api/offers` |
| Offer Detail | `OfferDetailScreen.tsx` | `GET /api/offers/{id}`, `POST /api/offers/{id}/favorite` |
| My Offers | `MyOffersScreen.tsx` | `GET /api/user/saved-offers` |
| Badges | `BadgesScreen.tsx` | `GET /api/badges` |
| Challenges | `ChallengesScreen.tsx` | `GET /api/challenges`, `POST /api/challenges/{id}/complete` |
| Car Studio | `CarStudioScreen.tsx` | `GET /api/skins`, `POST /api/skins/{id}/equip` |
| Gems | `GemsScreen.tsx` | `GET /api/user/gems` |
| Gem History | `GemHistoryScreen.tsx` | `GET /api/user/gem-history` |

### NAVIGATION & TRIPS

| Screen | File | Endpoints Used |
|--------|------|----------------|
| Search | `SearchDestinationScreen.tsx` | `GET /api/map/search?q={query}` |
| Route Preview | `RoutePreviewScreen.tsx` | `GET /api/map/directions` |
| Active Nav | `ActiveNavigationScreen.tsx` | `GET /api/map/directions`, `POST /api/trips/start` |
| Trip Logs | `TripLogsScreen.tsx` | `GET /api/trips/history` |
| Trip Analytics | `TripAnalyticsScreen.tsx` | `GET /api/analytics/trips` |
| Route History 3D | `RouteHistory3DScreen.tsx` | `GET /api/trips/routes` |

### SAFETY & REPORTING

| Screen | File | Endpoints Used |
|--------|------|----------------|
| Hazard Feed | `HazardFeedScreen.tsx` | `GET /api/reports/nearby`, `POST /api/reports/{id}/upvote` |
| Road Reports | `RoadReportsScreen.tsx` | `GET /api/reports/nearby`, `POST /api/reports` |
| Photo Capture | `PhotoCaptureScreen.tsx` | `POST /api/reports` (with image) |
| Insurance Report | `InsuranceReportScreen.tsx` | `POST /api/insurance/report` |

### SOCIAL & FAMILY

| Screen | File | Endpoints Used |
|--------|------|----------------|
| Friends Hub | `FriendsHubScreen.tsx` | `GET /api/friends`, `POST /api/friends/invite` |
| Family | `FamilyScreen.tsx` | `GET /api/family/members` |
| Live (Family Tracking) | `LiveScreen.tsx` | `GET /api/family/members`, `POST /api/family/{id}/sos` |
| Leaderboard | `LeaderboardScreen.tsx` | `GET /api/leaderboard` |

### AI & ANALYTICS

| Screen | File | Endpoints Used |
|--------|------|----------------|
| Orion Coach | `OrionCoachScreen.tsx` | `POST /api/ai/orion/chat` |
| Driver Analytics | `DriverAnalyticsScreen.tsx` | `GET /api/analytics/driver` |
| Fuel Dashboard | `FuelDashboardScreen.tsx` | `GET /api/fuel/prices`, `GET /api/fuel/history` |
| Weekly Recap | `WeeklyRecapScreen.tsx` | `GET /api/analytics/weekly` |
| Level Progress | `LevelProgressScreen.tsx` | `GET /api/user/level` |

### SETTINGS & ACCOUNT

| Screen | File | Endpoints Used |
|--------|------|----------------|
| Settings | `SettingsScreen.tsx` | `GET /api/user/settings`, `PUT /api/user/settings` |
| Privacy Center | `PrivacyCenterScreen.tsx` | `GET /api/user/privacy` |
| Notifications | `NotificationSettingsScreen.tsx` | `PUT /api/user/notifications` |
| Account Info | `AccountInfoScreen.tsx` | `GET /api/user/profile`, `PUT /api/user/profile` |
| Privacy Policy | `PrivacyPolicyScreen.tsx` | None (static content) |
| Terms of Service | `TermsOfServiceScreen.tsx` | None (static content) |
| Help | `HelpScreen.tsx` | `GET /api/help/faq` |

### PAYMENTS

| Screen | File | Endpoints Used |
|--------|------|----------------|
| Pricing | `PricingScreen.tsx` | `GET /api/payments/plans` |
| Payment | `PaymentScreen.tsx` | `POST /api/payments/checkout/session`, `GET /api/payments/checkout/status/{id}` |

### ENGAGEMENT (NEW)

| Screen | File | Endpoints Used |
|--------|------|----------------|
| Engagement | `EngagementScreen.tsx` | `GET /api/badges`, `GET /api/skins`, `GET /api/user/level` |
| Commute Scheduler | `CommuteSchedulerScreen.tsx` | `GET /api/routes`, `POST /api/routes/schedule` |

### ADMIN & PARTNER PORTALS

| Screen | File | Endpoints Used |
|--------|------|----------------|
| Admin Dashboard | `AdminDashboardScreen.tsx` | `GET /api/admin/*` |
| Partner Dashboard | `PartnerDashboardScreen.tsx` | `GET /api/partner/*` |

---

## API BASE URL

```
EXPO_PUBLIC_API_URL=https://privacy-first-app-3.preview.emergentagent.com
```

All API calls append `/api` prefix:
- Backend routes at: `https://[domain]/api/[endpoint]`
- Do NOT use double `/api/api/` - it's already included

---

## REUSABLE COMPONENTS

| Component | File | Purpose |
|-----------|------|---------|
| DrawerMenu | `components/DrawerMenu.tsx` | Side navigation menu |
| WebMap | `components/WebMap.tsx` | OpenStreetMap for web platform |
| OrionVoice | `components/OrionVoice.tsx` | Voice command modal |
| QuickStartGuide | `components/QuickStartGuide.tsx` | First-time onboarding |
| RedemptionPopup | `components/RedemptionPopup.tsx` | Offer redemption flow |

---

## NAVIGATION STRUCTURE

```
Stack.Navigator
├── Welcome
├── PlanSelection
├── CarSetup
├── MainTabs (Tab.Navigator)
│   ├── Map
│   ├── Routes
│   ├── Rewards
│   └── Profile
├── OfferDetail
├── Leaderboard
├── Settings
├── FuelDashboard
├── TripLogs
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
├── ActiveNavigation
├── SearchDestination
├── RoutePreview
├── HazardFeed
├── CommuteScheduler
├── InsuranceReport
├── Help
├── Routes (detail)
├── FriendsHub
├── Badges
├── GemHistory
├── CarStudio
├── Challenges
├── LevelProgress
├── WeeklyRecap
├── AdminDashboard
├── PartnerDashboard
├── AccountInfo
├── PrivacyPolicy
├── TermsOfService
├── Pricing
├── Payment
├── Live
├── Engagement
└── RoadReports
```

---

## TESTING CREDENTIALS

| Role | Email | Password |
|------|-------|----------|
| Driver | driver@snaproad.com | password123 |
| Partner | partner@snaproad.com | password123 |
| Admin | admin@snaproad.com | password123 |
