# SnapRoad Web/Integration Developer Guide
## For Brian (Web/Integration Lead)

> **Tech Stack**: React + TypeScript + Vite + Tailwind CSS
> **Focus Areas**: Admin Dashboard, Partner Dashboard, Driver App, Phone Preview, figma-ui library
> **Maps**: Apple Maps MapKit JS via backend token (no Mapbox)
> **Current State**: All web UIs fully built and functional. Data is mock — will auto-switch when Andrew runs Supabase migration.
> **Updated**: February 2026

---

## Current Architecture

```
/app/frontend/src/
├── App.tsx                          # Root router — all routes defined here
├── pages/
│   ├── WelcomePage.tsx              # Public landing page (with /preview link)
│   ├── AdminDashboard.tsx           # Admin console — 1,538 lines, 6 tabs
│   ├── PartnerDashboard.tsx         # Partner portal — 1,748 lines, 8 tabs
│   ├── PhonePreviewPage.tsx         # NEW: iPhone-framed app preview at /preview
│   └── DriverApp/
│       ├── index.tsx                # Driver mobile-web app — 3,012 lines
│       └── components/              # 32 sub-components (see list below)
├── components/
│   ├── figma-ui/                    # Figma design system (see section below)
│   └── ui/                         # Shadcn/UI components
├── contexts/
│   ├── ThemeContext.tsx             # Dark/Light theme toggle
│   ├── AuthContext.tsx             # Auth context (mock user + JWT)
│   └── SnaproadThemeContext.tsx     # Theme for figma-ui components
├── services/
│   ├── api.ts                       # Legacy ApiService (covers all endpoints)
│   └── partnerApi.ts                # PartnerApiService + WebSocket client
└── lib/
    ├── offer-pricing.ts             # Gem pricing, calculateGemCost()
    ├── partner-plans.ts             # Partner subscription plan definitions
    └── snaproad-utils.ts            # cn() utility + shared helpers
```

---

## Route Map

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `WelcomePage` | Public landing page |
| `/driver` | `DriverApp` | Full driver mobile-web preview |
| `/driver/auth` | `AuthFlow` | Driver onboarding auth |
| `/preview` | `PhonePreviewPage` | **NEW**: Premium iPhone-frame app showcase |
| `/portal/partner` | `PartnerDashboard` | Partner portal (8 tabs) |
| `/portal/admin-sr2025secure` | `AdminDashboard` | Admin console (6 tabs) |
| `/app/*` | `SnapRoadApp` | Figma prototype routes |
| `/business` | `BusinessDashboard` | Legacy (keep for now) |
| `/login` | `Login` | Legacy login page |

---

## Admin Dashboard (6 Tabs — Complete)

**File**: `pages/AdminDashboard.tsx` (1,538 lines)  
**URL**: `/portal/admin-sr2025secure`  
**Theme**: Dark/Light toggle

| Tab | Key Components | Notes |
|-----|----------------|-------|
| Overview | Metric cards, 30-day chart, top partners | Mock data |
| Users | `FigmaUsersTab` — search/filter/status | Mock data |
| Partners | Partner table with plan badges | Mock data |
| Events | Event list | Supabase → Mock |
| Offers | `AdminOffersList` — create/export/import | Export/import ✅ functional |
| AI Moderation | `AIModerationTab` — **real-time WebSocket** | **✅ LIVE** |

**AI Moderation (Live Feature)**:
- Connects WebSocket to `/api/ws/admin/moderation`
- 5 filter tabs: All, Pending, High Risk, Approved, Rejected
- Confidence threshold slider
- Simulate button → calls `POST /api/admin/moderation/simulate`
- `SupabaseMigrationBanner` — trigger migration UI (blocked by firewall currently)

---

## Partner Dashboard (8 Tabs — Complete)

**File**: `pages/PartnerDashboard.tsx` (1,748 lines)  
**URL**: `/portal/partner`  
**Theme**: Dark/Light toggle

| Tab | Key Components | Notes |
|-----|----------------|-------|
| Overview | Revenue chart, today's stats | Mock data |
| Offers | Create/manage offers, boost controls | Mock data |
| Locations | Map + location CRUD | Mock data |
| Analytics | Views/clicks/redemptions chart | Mock data |
| Boosts | Boost packages + active boosts | Mock (needs Stripe) |
| Finance | `PartnerFinanceTab` — credits + earnings | Mock |
| Referrals | `PartnerReferralsTab` — send + track | Mock |
| Plans | Plan selector | Mock |

**WebSocket**: `partnerApi.connectWebSocket(partnerId)` connects to `/api/ws/partner/{id}` via `services/partnerApi.ts`

---

## Phone Preview Page (New)

**File**: `pages/PhonePreviewPage.tsx`  
**URL**: `/preview`  

iPhone-style frame showcasing the mobile app:
- Dynamic Island, status bar (time/wifi/battery)
- Side buttons, home indicator
- Live DriverApp loaded inside via `<iframe src="/driver">`
- Feature badges floating left + right (Earn Gems, Safety Score, AI Coach, etc.)
- "Open Full Screen" + "Get Started" CTAs
- Ambient glow effects

---

## Driver App (Complete)

**File**: `pages/DriverApp/index.tsx` (3,012 lines)  
**URL**: `/driver`

32 sub-components in `pages/DriverApp/components/`:
`BadgesGrid`, `Car3D`, `CarOnboarding`, `CarStudioNew`, `ChallengeHistory`, `ChallengeModal`, `CollapsibleOffersPanel`, `CommunityBadges`, `DrivingScore`, `FriendsHub`, `FuelTracker`, `GemHistory`, `GemOverlay`, `HelpSupport`, `InAppBrowser`, `InteractiveMap`, `Leaderboard`, `LevelProgress`, `NotificationSettings`, `OffersModal`, `OrionOfferAlerts`, `OrionVoice`, `PlanSelection`, `QuickPhotoReport`, `RedemptionPopup`, `RoadReports`, `RoadStatusOverlay`, `RouteHistory3D`, `ShareTripScore`, `TripAnalytics`, `TripHistory`, `WeeklyRecap`

---

## figma-ui Component Library

**Directory**: `components/figma-ui/`  
**Access**: `/app/*` route (via `SnapRoadApp.tsx`)

| Sub-directory | Components |
|---------------|-----------|
| `mobile/` | Welcome, Login, SignUp, MapScreen, Profile, Gems, Family, BottomNav, FuelDashboard, TripLogs, Leaderboard, Settings, LiveLocations, AccountInfo, PrivacyCenter, NotificationSettings, Onboarding, OrionCoach, PhotoCapture, DriverAnalytics, DriverMapScreen |
| `admin/` | AdminDashboard, AdminLayout, AdminLogin, AdminOfferManagement, AdminUsers |
| `partner/` | PartnerDashboard, PartnerLayout, PartnerOffers, PartnerAnalyticsDetailed, PartnerTeam, PartnerReferrals, QRScanner, CustomerOfferQR |
| `primitives/` | GemIcon, GradientButton, ImageWithFallback |

---

## Maps: Apple Maps MapKit (NOT Mapbox)

Web currently uses **OpenStreetMap/CartoDB tiles** (free, no API key). For production:

1. Backend generates JWT via `GET /api/maps/token` (Andrew to build)
2. Load MapKit JS: `<script src="https://cdn.apple.com/mapkitjs/5.x.x/mapkit.js">`
3. Init: `mapkit.init({ authorizationCallback: (done) => done(token) })`

**Brian does NOT need MapKit credentials** — backend handles JWT generation.

---

## API Integration Checklist

The `services/api.ts` and `services/partnerApi.ts` already make real API calls. All endpoints are working (returning mock data). When Andrew runs the Supabase migration, the data will automatically switch to real — **no frontend changes required**.

### Additional Connection Work (After Supabase Migration)

| Component | Task | Depends On |
|-----------|------|------------|
| `DriverApp` trip analytics | Wire date range filter to API | Andrew's migration |
| `PartnerDashboard` boost flow | Add Stripe checkout | Andrew's Stripe setup |
| `AdminDashboard` user table | Connect to real user list | Migration |
| Auth flow | Replace mock JWT with real auth | Migration |
| Maps | Connect to Apple Maps token endpoint | Andrew adds `/api/maps/token` |

---

## Environment Variables

File: `/app/frontend/.env`

| Variable | Value | Purpose |
|----------|-------|---------|
| `REACT_APP_BACKEND_URL` | External Kubernetes URL | Testing / curl commands |
| `VITE_API_URL` | `/api` | All API calls in `services/api.ts` |
| `VITE_BACKEND_URL` | External URL | AdminDashboard, PartnerDashboard |

**Still needed from PM** (when Stripe is integrated):
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
VITE_STRIPE_PRICE_DRIVER_PREMIUM=price_xxxxx
VITE_STRIPE_PRICE_PARTNER_STARTER=price_xxxxx
VITE_STRIPE_PRICE_PARTNER_GROWTH=price_xxxxx
```

---

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Driver | `driver@snaproad.com` | `password123` |
| Partner | `partner@snaproad.com` | `password123` |
| Admin | `admin@snaproad.com` | `password123` |

---

## Quick Dev Commands

```bash
cd /app/frontend
yarn dev          # Start dev server
yarn build        # Production build
yarn tsc --noEmit # Type check
```

---

## API Quick Tests

```bash
export API_URL=$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d= -f2)

# Partner dashboard boosts
curl "$API_URL/api/partner/boosts/pricing"

# Trip analytics
curl "$API_URL/api/trips/history/detailed?days=30"

# Admin AI moderation status
curl "$API_URL/api/admin/moderation/status"

# Test Orion AI (live)
curl -X POST "$API_URL/api/orion/chat" \
  -H "Content-Type: application/json" \
  -d '{"message":"How can I save fuel?","session_id":"brian-test"}'
```

---

*Document owner: Brian (Web/Integration Lead) | Last updated: February 2026*
