# SnapRoad — Complete Application Overview

> Generated: February 2026 | Status: Active Development | Data Layer: Mock (Supabase pending migration)

---

## Table of Contents
1. [Project Summary](#1-project-summary)
2. [Repository Structure](#2-repository-structure)
3. [Backend — FastAPI](#3-backend--fastapi)
   - [Entry Points & Configuration](#entry-points--configuration)
   - [Routes (API Endpoints)](#routes-api-endpoints)
   - [Services](#services)
   - [Models / Schemas](#models--schemas)
   - [Database Layer](#database-layer)
4. [Web Frontend — React/Vite](#4-web-frontend--reactvite)
   - [Routing / Pages](#routing--pages)
   - [Admin Dashboard](#admin-dashboard)
   - [Partner Dashboard](#partner-dashboard)
   - [Driver App](#driver-app)
   - [figma-ui Component Library](#figma-ui-component-library)
   - [Contexts, Store & Services](#contexts-store--services)
5. [Mobile App — React Native/Expo](#5-mobile-app--react-nativeexpo)
   - [Navigation Structure](#navigation-structure)
   - [All Screens](#all-screens)
   - [Services & Config](#services--config)
6. [Real-Time System (WebSockets)](#6-real-time-system-websockets)
7. [Third-Party Integrations](#7-third-party-integrations)
8. [Environment Variables](#8-environment-variables)
9. [Test Suite](#9-test-suite)
10. [Database Schema (Supabase)](#10-database-schema-supabase)

---

## 1. Project Summary

**SnapRoad** is a privacy-first, gamified navigation platform with three user-facing surfaces:

| Surface | Tech | URL / Entry Point | Status |
|---------|------|-------------------|--------|
| **Driver App** (mobile web preview) | React + Vite | `/driver` | Active |
| **Partner Dashboard** (web portal) | React + Vite | `/portal/partner` | Active |
| **Admin Console** (web portal) | React + Vite | `/portal/admin-sr2025secure` | Active |
| **figma-ui Prototype** | React + Vite | `/app/*` | Active (Figma reference) |
| **Mobile App** | React Native / Expo | Expo Go / EAS Build | Active (in development) |

**Backend:** Modular FastAPI with 11 route modules. Currently uses in-memory mock data; Supabase is the target database.

---

## 2. Repository Structure

```
/app
├── backend/                     # FastAPI backend
│   ├── server.py                # Supervisor entry point (imports main.py)
│   ├── main.py                  # App factory: assembles all routers
│   ├── config.py                # Env var loading (Supabase, JWT, Stripe, LLM keys)
│   ├── database.py              # Supabase client singleton
│   ├── middleware/
│   │   └── auth.py              # JWT creation + verification
│   ├── models/
│   │   └── schemas.py           # All Pydantic request/response models
│   ├── routes/                  # One file per feature domain
│   │   ├── admin.py
│   │   ├── ai.py
│   │   ├── auth.py
│   │   ├── gamification.py
│   │   ├── navigation.py
│   │   ├── offers.py
│   │   ├── partners.py
│   │   ├── social.py
│   │   ├── trips.py
│   │   ├── users.py
│   │   └── webhooks.py          # Also contains WebSocket endpoints
│   ├── services/
│   │   ├── mock_data.py         # In-memory data store (all feature data)
│   │   ├── orion_coach.py       # OpenAI GPT-5.2 AI driving coach
│   │   ├── partner_service.py   # Partner business logic (team, referrals, QR)
│   │   ├── photo_analysis.py    # OpenAI Vision for photo privacy blurring
│   │   ├── supabase_service.py  # Supabase DB operations (fallback to mock)
│   │   └── websocket_manager.py # WebSocket connection manager (partners + admin)
│   ├── sql/
│   │   └── supabase_migration.sql  # Full DB schema (12 tables) — NOT YET RUN
│   ├── tests/                   # pytest test files (17 test files)
│   ├── .env                     # Supabase, JWT, Stripe, LLM keys
│   └── requirements.txt
│
├── frontend/                    # React + Vite web app
│   └── src/
│       ├── App.tsx              # Root router
│       ├── main.tsx             # ReactDOM entry
│       ├── index.css            # Global styles
│       ├── pages/               # Route-level page components
│       │   ├── AdminDashboard.tsx        # Main admin console (1538 lines)
│       │   ├── PartnerDashboard.tsx      # Main partner portal (1748 lines)
│       │   ├── DriverApp/index.tsx       # Driver mobile-web preview (3012 lines)
│       │   ├── WelcomePage.tsx           # Landing page (/)
│       │   ├── Auth/AuthFlow.tsx         # Driver onboarding auth
│       │   ├── Auth/Login.tsx            # Legacy login page
│       │   ├── BusinessDashboard/        # Legacy (accessible at /business)
│       │   ├── Dashboard/                # Old protected admin dashboard
│       │   ├── Incidents/                # Old protected incidents pages
│       │   ├── Partners/                 # Old protected partner pages
│       │   ├── Rewards/                  # Old protected rewards page
│       │   ├── Settings/                 # Old protected settings page
│       │   ├── Trips/                    # Old protected trips pages
│       │   ├── UserDashboard/            # Not in any route (unused)
│       │   └── Users/                    # Old protected user pages
│       ├── components/
│       │   ├── figma-ui/        # Figma design system components
│       │   │   ├── SnapRoadApp.tsx       # Master router for /app/* route
│       │   │   ├── admin/                # Admin-specific components
│       │   │   ├── mobile/               # Mobile screen components
│       │   │   ├── partner/              # Partner-specific components
│       │   │   └── primitives/           # Shared UI primitives
│       │   ├── HelpModal.tsx
│       │   ├── Layout.tsx               # Old dashboard layout wrapper
│       │   ├── NotificationSystem.tsx   # Toast/notification system
│       │   ├── SettingsModal.tsx
│       │   └── features/
│       │       └── CarSkinShowcase.tsx
│       ├── contexts/
│       │   ├── AuthContext.tsx          # Auth context (mock user + JWT)
│       │   ├── SnaproadThemeContext.tsx  # Theme for figma-ui components
│       │   └── ThemeContext.tsx         # General theme context
│       ├── store/
│       │   └── authStore.ts             # Zustand auth state store
│       ├── services/
│       │   ├── api.ts                   # Legacy API service class
│       │   └── partnerApi.ts            # Partner API + WebSocket service
│       ├── lib/
│       │   ├── offer-pricing.ts         # Gem pricing tiers & offer categories
│       │   ├── partner-plans.ts         # Partner subscription plan definitions
│       │   ├── snaproad-utils.ts        # cn() and shared utilities
│       │   └── utils.ts                 # Tailwind cn() utility
│       ├── types/
│       │   └── api.ts                   # TypeScript types for all API responses
│       └── styles/
│           ├── snaproad-globals.css
│           └── snaproad-index.css
│
└── snaproad-mobile/              # React Native + Expo mobile app
    ├── App.tsx                   # Expo root with navigation providers
    ├── src/
    │   ├── navigation/index.tsx  # Stack + Tab navigator config
    │   ├── screens/              # 50 screen components
    │   ├── components/           # Shared mobile components
    │   ├── services/api.ts       # Mobile API service
    │   ├── store/index.ts        # Mobile state store (Zustand)
    │   ├── types/index.ts        # Mobile TypeScript types
    │   ├── utils/theme.ts        # Color palette, spacing, fonts
    │   └── config.ts             # API_URL config
    └── .env                      # Mobile environment variables
```

---

## 3. Backend — FastAPI

### Entry Points & Configuration

| File | Purpose |
|------|---------|
| `server.py` | Supervisor entry point. Imports `create_app()` from `main.py` and adds health + migration routes directly. |
| `main.py` | App factory. Attaches CORS middleware and all 11 route routers. |
| `config.py` | Loads `.env` — exposes `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `JWT_SECRET`, `EMERGENT_LLM_KEY`, `STRIPE_SECRET_KEY`. |
| `database.py` | Lazy Supabase client singleton via `get_supabase()`. |
| `middleware/auth.py` | JWT encode/decode helpers using `python-jose`. |

---

### Routes (API Endpoints)

#### Health & Root (`server.py`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Root info (app name, version, status) |
| GET | `/api/health` | Health check |
| GET | `/api/admin/migrate` | Trigger Supabase migration (calls `run_migration`) |
| GET | `/api/admin/db-status` | Check Supabase connection status |

---

#### Authentication (`routes/auth.py`) — prefix: `/api/auth`
| Method | Path | Description | Data Source |
|--------|------|-------------|-------------|
| POST | `/api/auth/signup` | Create new account | Supabase Auth → Mock fallback |
| POST | `/api/auth/login` | Authenticate user | Supabase Auth → Mock fallback |

**Request Models:** `SignupRequest` (name, email, password), `LoginRequest` (email, password)  
**Response:** `{ success, data: { user, token } }`

---

#### Users (`routes/users.py`) — prefix: `/api`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/user/profile` | Get current user profile |
| GET | `/api/user/stats` | Get driving stats (miles, trips, safety score, gems, level) |
| POST | `/api/user/plan` | Update subscription plan (basic/premium) |
| POST | `/api/user/car` | Save car customization (category, variant, color) |
| GET | `/api/user/car/colors` | Get available car colors (free + premium gem-purchasable) |
| POST | `/api/user/car/color/{color_key}/purchase` | Purchase a premium car color with gems |
| GET | `/api/user/onboarding-status` | Check onboarding completion flags |
| GET | `/api/session/reset` | Reset onboarding flags (dev/testing) |
| GET | `/api/cars` | List all car models (with owned/equipped status) |
| POST | `/api/cars/{car_id}/purchase` | Buy a new car with gems |
| POST | `/api/cars/{car_id}/equip` | Equip a car |
| GET | `/api/skins` | List all car skins |
| POST | `/api/skins/{skin_id}/purchase` | Buy a skin with gems |
| POST | `/api/skins/{skin_id}/equip` | Equip a skin |
| GET | `/api/pricing` | Get subscription pricing config |
| GET | `/api/settings/notifications` | Get notification settings |
| POST | `/api/settings/notifications` | Update notification settings |
| GET | `/api/help/faq` | Get FAQ data |
| POST | `/api/help/contact` | Submit contact form |

---

#### Offers (`routes/offers.py`) — prefix: `/api`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/offers` | List all active offers |
| POST | `/api/offers` | Create a new offer |
| POST | `/api/offers/{offer_id}/redeem` | Redeem an offer (awards gems) |
| GET | `/api/offers/nearby` | Get offers within radius (lat/lng/radius params) |
| GET | `/api/offers/on-route` | Get offers along a route corridor |
| GET | `/api/offers/personalized` | Get personalized offers based on user history |
| POST | `/api/offers/{offer_id}/accept-voice` | Voice-accept an offer (adds as navigation waypoint) |
| POST | `/api/driver/location-visit` | Record a location visit for personalization |
| POST | `/api/images/generate` | Generate offer image (placeholder endpoint) |

---

#### Partners (`routes/partners.py`) — prefix: `/api`

**V1 Partner Endpoints (plan/location management):**
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/partner/plans` | Get available partner subscription plans |
| GET | `/api/partner/profile` | Get partner profile + plan info |
| POST | `/api/partner/plan` | Upgrade/change partner plan |
| GET | `/api/partner/locations` | List partner's store locations |
| POST | `/api/partner/locations` | Add a new store location |
| PUT | `/api/partner/locations/{location_id}` | Update a location |
| DELETE | `/api/partner/locations/{location_id}` | Delete a location |
| POST | `/api/partner/locations/{location_id}/set-primary` | Set location as primary |
| POST | `/api/partner/offers` | Create a partner offer at a location |
| GET | `/api/partner/offers` | List this partner's offers |
| PUT | `/api/partner/profile` | Update partner business name / email |
| GET | `/api/partner/boosts/pricing` | Get boost package pricing |
| POST | `/api/partner/boosts/create` | Create an offer boost |
| GET | `/api/partner/boosts/active` | List active boosts |
| DELETE | `/api/partner/boosts/{offer_id}` | Cancel an active boost |
| GET | `/api/partner/credits` | Get partner credit balance |
| POST | `/api/partner/credits/add` | Add credits to account |

**V2 Partner Endpoints (team, referrals, QR redemption):**
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/partner/v2/login` | Authenticate partner user |
| GET | `/api/partner/v2/profile/{partner_id}` | Get full partner profile |
| GET | `/api/partner/v2/team/{partner_id}` | List team members |
| POST | `/api/partner/v2/team/{partner_id}/invite` | Invite team member (email or code) |
| PUT | `/api/partner/v2/team/{member_id}/role` | Change team member role |
| DELETE | `/api/partner/v2/team/{member_id}` | Revoke team member access |
| GET | `/api/partner/v2/referrals/{partner_id}` | Get referrals + stats |
| POST | `/api/partner/v2/referrals/{partner_id}` | Send a referral invitation |
| POST | `/api/partner/v2/credits/{partner_id}/use` | Use credits (subscription / boosting) |
| POST | `/api/partner/v2/redeem` | Validate and process QR code redemption |
| GET | `/api/partner/v2/redemptions/{partner_id}` | Get recent redemptions |
| GET | `/api/partner/v2/analytics/{partner_id}` | Get partner analytics |

---

#### Gamification (`routes/gamification.py`) — prefix: `/api`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/xp/add` | Add/subtract XP (photo_report, offer_redemption, safe_drive, etc.) |
| GET | `/api/xp/status` | Get level, XP progress, XP to next level |
| GET | `/api/xp/config` | Get XP configuration values |
| GET | `/api/badges` | List all badges with earned status |
| GET | `/api/badges/categories` | Badges grouped by category |
| GET | `/api/badges/community` | Community-specific badges |
| GET | `/api/leaderboard` | Driver leaderboard (filterable by state) |
| GET | `/api/challenges` | List active challenges |
| POST | `/api/challenges` | Create a new challenge (stake gems vs. opponent) |
| POST | `/api/challenges/{challenge_id}/accept` | Accept an incoming challenge |
| POST | `/api/challenges/{challenge_id}/claim` | Claim completed challenge reward |
| GET | `/api/challenges/history` | Challenge history + win/loss stats |
| POST | `/api/gems/generate-route` | Spawn gems along a route for collection |
| POST | `/api/gems/collect` | Collect a gem (awards gems to user) |
| GET | `/api/gems/trip-summary/{trip_id}` | Gem collection summary for a trip |
| GET | `/api/gems/history` | Gem balance + transaction history |
| GET | `/api/driving-score` | Get detailed driving score breakdown (6 metrics) |
| GET | `/api/weekly-recap` | Weekly stats summary |

---

#### Trips (`routes/trips.py`) — prefix: `/api`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/trips/history` | Get recent trips (last 10) |
| POST | `/api/trips/complete` | Mark trip complete (distance/duration, awards gems) |
| POST | `/api/trips/complete-with-safety` | Complete trip with safety metrics (updates safety score + XP) |
| GET | `/api/trips/history/detailed` | Detailed trip history with analytics (filterable by days) |
| POST | `/api/trips/{trip_id}/share` | Generate trip share URL |
| GET | `/api/fuel/history` | Fuel log entries |
| POST | `/api/fuel/log` | Add fuel log entry |
| GET | `/api/fuel/trends` | Fuel trend analytics |
| GET | `/api/fuel/prices` | Current fuel prices + nearby stations |
| GET | `/api/fuel/analytics` | Monthly fuel breakdown |
| POST | `/api/incidents/report` | Report a road incident |
| GET | `/api/routes/history-3d` | Route history grouped for 3D visualization |

---

#### Navigation (`routes/navigation.py`) — prefix: `/api`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/locations` | List saved locations |
| POST | `/api/locations` | Save a new location |
| DELETE | `/api/locations/{location_id}` | Delete a saved location |
| GET | `/api/routes` | List saved routes |
| POST | `/api/routes` | Save a new commute route |
| POST | `/api/routes/{route_id}/toggle` | Toggle route active/inactive |
| POST | `/api/routes/{route_id}/notifications` | Toggle route notifications |
| POST | `/api/navigation/start` | Start navigation to destination |
| POST | `/api/navigation/stop` | Stop active navigation |
| POST | `/api/navigation/voice-command` | Process a voice navigation command |
| GET | `/api/map/search` | Search map locations by query (+ optional lat/lng) |
| GET | `/api/map/directions` | Get mock turn-by-turn directions |
| GET | `/api/widgets` | Get dashboard widget settings |
| POST | `/api/widgets/{widget_id}/toggle` | Toggle widget visibility |
| POST | `/api/widgets/{widget_id}/collapse` | Toggle widget collapsed state |

---

#### Admin (`routes/admin.py`) — prefix: `/api`

**Offer Management:**
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/admin/offers/create` | Create an admin-side offer |
| POST | `/api/admin/offers/bulk` | Bulk create offers from list |
| POST | `/api/admin/offers/bulk-csv` | CSV offer import (format reference) |
| GET | `/api/admin/export/offers` | Export all offers as JSON or CSV |
| GET | `/api/admin/export/users` | Export all users as JSON or CSV |
| POST | `/api/admin/import/offers` | Import offers from JSON array |

**Analytics:**
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/analytics` | Platform analytics (30-day chart, top partners) |
| GET | `/api/admin/pricing` | Get current pricing config |
| POST | `/api/admin/pricing` | Update subscription pricing |
| POST | `/api/analytics/track` | Track a view/click/redemption event |
| GET | `/api/analytics/dashboard` | Per-business analytics dashboard |

**Boost System:**
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/admin/boosts/create` | Admin-apply a boost to any offer |
| POST | `/api/boosts/calculate` | Calculate boost cost (duration + reach) |
| POST | `/api/boosts/create` | Create a paid boost |
| GET | `/api/boosts` | List all boosts (filterable by business_id) |
| GET | `/api/boosts/{boost_id}` | Get a single boost |
| DELETE | `/api/boosts/{boost_id}` | Cancel a boost |

**Supabase & User Management:**
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/users` | List users (Supabase Auth → Mock fallback) |
| GET | `/api/admin/stats` | Platform stats (Supabase → Mock fallback) |
| GET | `/api/admin/supabase/status` | Test Supabase connectivity + migration status |
| GET | `/api/admin/events` | List events (Supabase → Mock fallback) |
| POST | `/api/admin/supabase/migrate` | Run migration SQL (blocked by firewall — use Supabase SQL Editor) |

---

#### AI (`routes/ai.py`) — prefix: `/api`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/orion/chat` | Send message to Orion AI coach (GPT-5.2) |
| GET | `/api/orion/history/{session_id}` | Get conversation history |
| DELETE | `/api/orion/session/{session_id}` | Clear a chat session |
| GET | `/api/orion/tips` | Get quick tip suggestions for UI |
| POST | `/api/photo/analyze` | Analyze photo for privacy (faces/plates) + blur regions |

---

#### Social (`routes/social.py`) — prefix: `/api`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/friends` | List current user's friends |
| GET | `/api/friends/search` | Search for users by name or ID |
| POST | `/api/friends/add` | Add a friend (bidirectional) |
| DELETE | `/api/friends/{friend_id}` | Remove a friend |
| GET | `/api/family/members` | List family members (mock data) |
| GET | `/api/reports` | Get road reports (filterable by lat/lng radius) |
| POST | `/api/reports` | Create a road report (+XP awarded) |
| POST | `/api/reports/{report_id}/upvote` | Upvote a road report (+10 gems to reporter) |
| DELETE | `/api/reports/{report_id}` | Delete your own report |
| GET | `/api/reports/my` | Get current user's reports + stats |

---

#### Webhooks & WebSocket (`routes/webhooks.py`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/webhooks/stripe` | Stripe webhook handler (ready, not wired) |
| WS | `/api/ws/partner/{partner_id}` | Partner real-time notifications (redemptions, nearby customers) |
| WS | `/api/ws/customer/{customer_id}` | Customer real-time notifications |
| GET | `/api/ws/status/{partner_id}` | Check partner WebSocket connection count |
| WS | `/api/ws/admin/moderation` | Admin real-time AI moderation feed |
| POST | `/api/admin/moderation/simulate` | Simulate a new incident (demo/testing) |
| GET | `/api/admin/moderation/status` | Admin moderation queue status |

---

### Services

| Service File | Purpose | Key Classes/Functions |
|-------------|---------|----------------------|
| `services/mock_data.py` | In-memory data store for all features | `users_db`, `offers_db`, `trips_db`, `partners_db`, `challenges_data`, `road_reports_db`, `fuel_history`, `route_gems_db`, `collected_gems_db`, `analytics_db`, `XP_CONFIG`, `PARTNER_PLANS`, `BOOST_PRICING`, `ALL_BADGES`, `CAR_MODELS`, `CAR_SKINS`, `MAP_LOCATIONS` |
| `services/orion_coach.py` | Orion AI Coach (OpenAI GPT-5.2) | `OrionCoachService`, `orion_service` singleton. Manages multi-turn sessions via `LlmChat`. |
| `services/partner_service.py` | Partner business logic | `PartnerService`, `partner_service` singleton. Handles team management, referrals, QR redemption validation, analytics. |
| `services/photo_analysis.py` | Privacy photo blurring | `PhotoAnalysisService`. Calls OpenAI Vision API to detect faces/plates and generate blur masks. |
| `services/supabase_service.py` | Supabase DB operations | CRUD functions for `users`, `partners`, `offers`, `trips`, `road_reports`, `events`, `notifications`. Has Auth admin operations. Falls back gracefully when tables don't exist. |
| `services/websocket_manager.py` | WebSocket connection manager | `ConnectionManager`, `ws_manager` singleton. Manages partner, customer, and admin connections. Broadcasts incidents and redemption events. |

---

### Models / Schemas

**File:** `models/schemas.py`

| Category | Models |
|----------|--------|
| Auth | `SignupRequest`, `LoginRequest` |
| User | `PlanUpdate`, `CarCustomization` |
| Offers | `OfferCreate`, `BulkOfferItem`, `BulkOfferUpload`, `OfferImport`, `ImageGenerateRequest`, `LocationVisit` |
| Navigation | `NavigationRequest`, `Location`, `Route`, `Widget` |
| Social | `FriendRequest`, `RoadReport`, `ReportIncident` |
| Gamification | `XPEvent`, `ChallengeCreate`, `GemGenerateRequest`, `GemCollectRequest` |
| Trips | `TripResult`, `FuelLog` |
| Partners | `PartnerLocation`, `PartnerPlanUpdate`, `PartnerOfferCreate`, `PartnerLoginRequest`, `TeamInviteRequest`, `ReferralRequest`, `CreditUseRequest`, `QRRedemptionRequest`, `BoostRequest`, `BoostCreditsRequest`, `BoostCalculate`, `BoostCreate` |
| Admin | `PricingUpdate`, `AdminOfferCreate`, `AnalyticsEvent` |
| AI | `OrionMessageRequest`, `PhotoAnalysisRequest`, `ContactForm` |

---

### Database Layer

| Component | Status | Notes |
|-----------|--------|-------|
| Supabase Auth | **Connected** | Used for signup/login, admin user lists |
| Supabase DB Tables | **Not Created** | Migration SQL exists at `/app/backend/sql/supabase_migration.sql` but has NOT been run. All data is mock. |
| Mock Data | **Active** | All routes fall back to `services/mock_data.py` |

**To enable live data:** Run `/app/backend/sql/supabase_migration.sql` in your Supabase SQL Editor.  
**Schema covers:** `users`, `partners`, `partner_locations`, `offers`, `trips`, `trip_gems`, `road_reports`, `events`, `challenges`, `notifications`, `boosts`, `analytics_events`

---

## 4. Web Frontend — React/Vite

### Routing / Pages

**File:** `src/App.tsx`

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `WelcomePage` | Public landing page |
| `/login` | `Login` | Legacy login page |
| `/driver` | `DriverApp` | Full driver mobile-web preview |
| `/driver/auth` | `AuthFlow` | Driver onboarding auth flow |
| `/portal/partner` | `PartnerDashboard` | Partner portal |
| `/portal/admin-sr2025secure` | `AdminDashboard` | Admin console (secret path) |
| `/app/*` | `SnapRoadApp` | figma-ui prototype routes |
| `/business` | `BusinessDashboard` | Legacy business dashboard |
| `/partner` | Redirect → `/portal/partner` | |
| `/admin` | Redirect → `/` | |
| `/dashboard/*` | Protected `Layout` | Legacy protected admin routes |

---

### Admin Dashboard

**File:** `src/pages/AdminDashboard.tsx` (1,538 lines)  
**URL:** `/portal/admin-sr2025secure`  
**Theme:** Dark/Light toggle

**Tabs:**
| Tab ID | Label | Content |
|--------|-------|---------|
| `overview` | Platform Overview | Key metrics cards, 30-day charts, top partners, user growth |
| `users` | User Management | User table with search/filter (via `FigmaUsersTab`) |
| `partners` | Partner Management | Partner table with status, plan, redemptions |
| `events` | Events & Promotions | Events list (Supabase → Mock) |
| `offers` | All Offers | Offer list with create/export/import controls |
| `aiModeration` | AI Moderation Queue | Real-time WebSocket-powered incident feed |

**Sub-components (defined inline):**
| Component | Purpose |
|-----------|---------|
| `OnboardingWalkthrough` | First-time admin onboarding guide |
| `ImageGeneratorModal` | AI image generation for offers |
| `CreateOfferModal` | Create new offer form |
| `ExportModal` | Export users/offers as JSON or CSV |
| `ImportModal` | Import offers from CSV/JSON |
| `AdminOffersList` | Offer list with filter |
| `SupabaseMigrationBanner` | UI to trigger Supabase migration (currently blocked by firewall) |
| `AIModerationTab` | Live WebSocket moderation panel with 5 filter tabs |
| `FigmaUsersTab` | Styled users management table |
| `BulkUploadModal` | CSV bulk offer upload |

**WebSocket:** Connects to `ws://<host>/api/ws/admin/moderation` for real-time incident feed.

---

### Partner Dashboard

**File:** `src/pages/PartnerDashboard.tsx` (1,748 lines)  
**URL:** `/portal/partner`  
**Theme:** Dark/Light toggle

**Tabs:**
| Tab ID | Label | Content |
|--------|-------|---------|
| `overview` | Dashboard Overview | Revenue chart, today's stats, active offers summary |
| `offers` | My Offers | Create/manage offers, boost control |
| `locations` | Store Locations | Map + location list (add/edit/delete/set-primary) |
| `analytics` | Real-Time Analytics | Views, clicks, redemptions chart |
| `boosts` | Boost Center | Boost packages + active boost management |
| `finance` | Credits & Earnings | Credit balance, earnings history (`PartnerFinanceTab`) |
| `referrals` | Referral Analytics | Referral list + send invites (`PartnerReferralsTab`) |
| `pricing` | Plans & Pricing | Partner subscription plan selector |

**Sub-components (defined inline / external):**
| Component | Purpose |
|-----------|---------|
| `OnboardingWalkthrough` | First-time partner onboarding |
| `BoostModal` | Boost offer selection modal |
| `ImageGeneratorModal` | AI image generation |
| `PartnerFinanceTab` | Credits & earnings UI (calls `/api/partner/v2/*`) |
| `PartnerReferralsTab` | Referral send + tracking UI |

---

### Driver App

**File:** `src/pages/DriverApp/index.tsx` (3,012 lines)  
**URL:** `/driver`

A full mobile-style UI built for web browsers. Contains all driver-facing features.

**Sub-components** (`src/pages/DriverApp/components/`):
| Component | Description |
|-----------|-------------|
| `BadgesGrid` | Display earned/unearned badges |
| `Car3D` | 3D car preview with Three.js |
| `CarOnboarding` | Car selection onboarding flow |
| `CarStudioNew` | Car customization studio |
| `ChallengeHistory` | Past challenge results |
| `ChallengeModal` | Create/view challenge modal |
| `CollapsibleOffersPanel` | Offers panel on map screen |
| `CommunityBadges` | Community-earned badge display |
| `DrivingScore` | Detailed driving score breakdown |
| `FriendsHub` | Friends list + challenge initiation |
| `FuelTracker` | Fuel log + cost tracker |
| `GemHistory` | Gem transaction history |
| `GemOverlay` | AR-style gem collection overlay |
| `HelpSupport` | In-app help & FAQ |
| `InAppBrowser` | Embedded web browser for offers |
| `InteractiveMap` | Main map with offers/gems |
| `Leaderboard` | Driver leaderboard |
| `LevelProgress` | XP level progress bar |
| `NotificationSettings` | Notification preferences |
| `OffersModal` | Offer detail + redemption |
| `OrionOfferAlerts` | AI-powered offer alert pop-ups |
| `OrionVoice` | Voice interface for Orion AI |
| `PlanSelection` | Basic vs. Premium plan selector |
| `QuickPhotoReport` | Quick photo incident report |
| `RedemptionPopup` | Offer redemption success popup |
| `RoadReports` | Community road reports feed |
| `RoadStatusOverlay` | Map overlay for road conditions |
| `RouteHistory3D` | 3D route history visualization |
| `ShareTripScore` | Trip score sharing card |
| `TripAnalytics` | Detailed trip analytics |
| `TripHistory` | Trip history list |
| `WeeklyRecap` | Weekly driving summary |

---

### figma-ui Component Library

**Directory:** `src/components/figma-ui/`  
**Access:** Via `/app/*` route (SnapRoadApp.tsx handles routing)

**SnapRoadApp.tsx** — Master router that handles three modes:
- `admin` — renders admin components
- `partner` — renders partner components  
- `mobile` (default) — renders mobile driver screens

**Mobile Components** (`mobile/`):
| Component | Description |
|-----------|-------------|
| `auth/Welcome.tsx` | Welcome/splash screen |
| `auth/Login.tsx` | Login screen |
| `auth/SignUp.tsx` | Sign up screen |
| `MapScreen.tsx` | Main map with offers |
| `Profile.tsx` | User profile screen |
| `Gems.tsx` | Gems wallet screen |
| `Family.tsx` | Family tracking screen |
| `BottomNav.tsx` | Bottom tab navigation |
| `FuelDashboard.tsx` | Fuel stats dashboard |
| `TripLogs.tsx` | Trip history |
| `Leaderboard.tsx` | Leaderboard screen |
| `Settings.tsx` | App settings |
| `LiveLocations.tsx` | Live location sharing |
| `AccountInfo.tsx` | Account details |
| `PrivacyCenter.tsx` | Privacy settings |
| `NotificationSettings.tsx` | Notification preferences |
| `Onboarding.tsx` | Onboarding flow |
| `OrionCoach.tsx` | AI coach chat interface |
| `PhotoCapture.tsx` | Photo report capture |
| `DriverAnalytics.tsx` | Driver analytics screen |
| `DriverMapScreen.tsx` | Alternative map screen |

**Admin Components** (`admin/`):
| Component | Description |
|-----------|-------------|
| `AdminDashboard.tsx` | Admin overview (used inside SnapRoadApp) |
| `AdminLayout.tsx` | Admin shell layout |
| `AdminLogin.tsx` | Admin login form |
| `AdminOfferManagement.tsx` | Offer creation + management |
| `AdminUsers.tsx` | User management table |

**Partner Components** (`partner/`):
| Component | Description |
|-----------|-------------|
| `PartnerDashboard.tsx` | Partner overview (used inside SnapRoadApp) |
| `PartnerLayout.tsx` | Partner shell layout |
| `PartnerOffers.tsx` | Offer management |
| `PartnerAnalyticsDetailed.tsx` | Detailed analytics |
| `PartnerTeam.tsx` | Team management |
| `PartnerReferrals.tsx` | Referral management |
| `QRScanner.tsx` | QR code scanner for redemptions |
| `CustomerOfferQR.tsx` | Customer-facing QR display |

**Primitives** (`primitives/`):
| Component | Description |
|-----------|-------------|
| `GemIcon.tsx` | SnapRoad gem icon |
| `GradientButton.tsx` | Gradient CTA button |
| `ImageWithFallback.tsx` | Image with error fallback |

---

### Contexts, Store & Services

| File | Type | Purpose |
|------|------|---------|
| `contexts/AuthContext.tsx` | Context | Auth state with mock user fallback. Used by `/dashboard` legacy routes. |
| `contexts/SnaproadThemeContext.tsx` | Context | Theme provider for figma-ui components |
| `contexts/ThemeContext.tsx` | Context | General dark/light theme context |
| `store/authStore.ts` | Zustand store | Auth state for `ProtectedRoute` guard on `/dashboard` routes |
| `services/api.ts` | Class | Legacy `ApiService` class covering all REST endpoints. Uses `VITE_API_URL`. |
| `services/partnerApi.ts` | Class | `PartnerApiService` for Partner Portal. Includes WebSocket connection management. Uses `VITE_API_URL`. |
| `lib/offer-pricing.ts` | Utility | Gem pricing tiers, offer categories, `calculateGemCost()` |
| `lib/partner-plans.ts` | Utility | Partner subscription plan definitions |
| `lib/snaproad-utils.ts` | Utility | `cn()` Tailwind utility, shared helpers |
| `lib/utils.ts` | Utility | `cn()` Tailwind utility (secondary) |
| `types/api.ts` | Types | TypeScript interfaces for all API response shapes |

---

## 5. Mobile App — React Native/Expo

**Directory:** `/app/snaproad-mobile/`  
**Framework:** React Native + Expo SDK  
**Entry:** `App.tsx` → `src/navigation/index.tsx`

### Navigation Structure

```
Root Stack Navigator
├── Splash Screen
├── Onboarding Stack
│   ├── WelcomeScreen
│   ├── PlanSelectionScreen
│   └── CarSetupScreen
├── Main Tab Navigator (Bottom Tabs)
│   ├── Map         → MapScreen
│   ├── Routes      → RoutesScreen
│   ├── Rewards     → RewardsScreen
│   └── Profile     → ProfileScreen
└── Full Stack Screens (modal/push overlays)
    ├── OfferDetailScreen
    ├── LeaderboardScreen
    ├── SettingsScreen
    ├── FuelDashboardScreen
    ├── TripLogsScreen
    ├── FamilyScreen
    ├── TripAnalyticsScreen
    ├── RouteHistory3DScreen
    ├── OrionCoachScreen
    ├── MyOffersScreen
    ├── DriverAnalyticsScreen
    ├── GemsScreen
    ├── PhotoCaptureScreen
    ├── PrivacyCenterScreen
    ├── NotificationSettingsScreen
    ├── ActiveNavigationScreen
    ├── SearchDestinationScreen
    ├── RoutePreviewScreen
    ├── HazardFeedScreen
    ├── CommuteSchedulerScreen
    ├── InsuranceReportScreen
    ├── HelpScreen
    ├── FriendsHubScreen
    ├── BadgesScreen
    ├── GemHistoryScreen
    ├── CarStudioScreen
    ├── ChallengesScreen
    ├── LevelProgressScreen
    ├── WeeklyRecapScreen
    ├── AdminDashboardScreen  ← Full admin portal (5 tabs: Overview, Users, Partners, Offers, Events)
    └── PartnerDashboardScreen ← Full partner portal (5 tabs: Overview, Offers, Locations, Boosts, Analytics)
```

### All Screens

| Screen | File | Tab Count | Description |
|--------|------|-----------|-------------|
| SplashScreen | `SplashScreen.tsx` | - | App loading splash |
| WelcomeScreen | `WelcomeScreen.tsx` | - | Onboarding welcome |
| PlanSelectionScreen | `PlanSelectionScreen.tsx` | - | Basic/Premium plan choice |
| CarSetupScreen | `CarSetupScreen.tsx` | - | Car customization setup |
| MapScreen | `MapScreen.tsx` | Main Tab | Interactive map with offers |
| RoutesScreen | `RoutesScreen.tsx` | Main Tab | Saved routes + scheduler |
| RewardsScreen | `RewardsScreen.tsx` | Main Tab | Offers + gems wallet |
| ProfileScreen | `ProfileScreen.tsx` | Main Tab | User profile + stats |
| OfferDetailScreen | `OfferDetailScreen.tsx` | - | Offer detail + redeem |
| LeaderboardScreen | `LeaderboardScreen.tsx` | - | Driver leaderboard |
| SettingsScreen | `SettingsScreen.tsx` | - | App settings |
| FuelDashboardScreen | `FuelDashboardScreen.tsx` | - | Fuel tracking |
| TripLogsScreen | `TripLogsScreen.tsx` | - | Trip history |
| FamilyScreen | `FamilyScreen.tsx` | - | Family tracking |
| TripAnalyticsScreen | `TripAnalyticsScreen.tsx` | - | Trip analytics |
| RouteHistory3DScreen | `RouteHistory3DScreen.tsx` | - | 3D route history |
| OrionCoachScreen | `OrionCoachScreen.tsx` | - | AI coach chat |
| MyOffersScreen | `MyOffersScreen.tsx` | - | Redeemed/saved offers |
| DriverAnalyticsScreen | `DriverAnalyticsScreen.tsx` | - | Driving score breakdown |
| GemsScreen | `GemsScreen.tsx` | - | Gems balance + history |
| PhotoCaptureScreen | `PhotoCaptureScreen.tsx` | - | Photo incident capture |
| PrivacyCenterScreen | `PrivacyCenterScreen.tsx` | - | Privacy settings |
| NotificationSettingsScreen | `NotificationSettingsScreen.tsx` | - | Notification prefs |
| ActiveNavigationScreen | `ActiveNavigationScreen.tsx` | - | Turn-by-turn navigation |
| SearchDestinationScreen | `SearchDestinationScreen.tsx` | - | Destination search |
| RoutePreviewScreen | `RoutePreviewScreen.tsx` | - | Route preview before start |
| HazardFeedScreen | `HazardFeedScreen.tsx` | - | Community hazard feed |
| CommuteSchedulerScreen | `CommuteSchedulerScreen.tsx` | - | Recurring commute setup |
| InsuranceReportScreen | `InsuranceReportScreen.tsx` | - | Insurance report generator |
| HelpScreen | `HelpScreen.tsx` | - | Help & FAQ |
| FriendsHubScreen | `FriendsHubScreen.tsx` | - | Friends list + challenges |
| BadgesScreen | `BadgesScreen.tsx` | - | Badge collection |
| GemHistoryScreen | `GemHistoryScreen.tsx` | - | Gem transaction history |
| CarStudioScreen | `CarStudioScreen.tsx` | - | Car customization studio |
| ChallengesScreen | `ChallengesScreen.tsx` | - | Active/pending challenges |
| LevelProgressScreen | `LevelProgressScreen.tsx` | - | XP and level progress |
| WeeklyRecapScreen | `WeeklyRecapScreen.tsx` | - | Weekly driving recap |
| AdminDashboardScreen | `AdminDashboardScreen.tsx` | 5 | Full admin dashboard (mobile) |
| PartnerDashboardScreen | `PartnerDashboardScreen.tsx` | 5 | Full partner portal (mobile) |

### Services & Config

| File | Purpose |
|------|---------|
| `src/services/api.ts` | Mobile API service (calls backend) |
| `src/store/index.ts` | Zustand state store |
| `src/types/index.ts` | TypeScript type definitions |
| `src/utils/theme.ts` | Color palette, spacing, fonts, border radii |
| `src/config.ts` | `API_URL` export from `.env` |
| `src/components/DrawerMenu.tsx` | Side drawer navigation menu |
| `src/components/Modals.tsx` | Reusable modal components |
| `src/components/ui.tsx` | Shared UI primitives |

---

## 6. Real-Time System (WebSockets)

**Backend:** `services/websocket_manager.py` — `ConnectionManager` singleton (`ws_manager`)

| Channel | Path | Direction | Payload Types |
|---------|------|-----------|---------------|
| Partner | `/api/ws/partner/{partner_id}` | Bi-directional | `connection`, `redemption`, `customer_nearby`, `ping/pong` |
| Customer | `/api/ws/customer/{customer_id}` | Server → Client | `connection`, `offer_redeemed` |
| Admin Moderation | `/api/ws/admin/moderation` | Bi-directional | `connection`, `backlog`, `new_incident`, `moderation_update`, `ping/pong` |

**Frontend WebSocket clients:**
- **Admin Dashboard:** Connects to `/api/ws/admin/moderation` on the AI Moderation tab. Receives real-time incidents; sends moderation decisions.
- **Partner API Service:** `partnerApi.connectWebSocket()` in `services/partnerApi.ts`. Connects to `/api/ws/partner/{partner_id}`.

**Simulating incidents (testing):**
```bash
curl -X POST /api/admin/moderation/simulate
```

---

## 7. Third-Party Integrations

| Integration | Status | Used In | Key |
|-------------|--------|---------|-----|
| **OpenAI GPT-5.2** | Active | `services/orion_coach.py` → `/api/orion/chat` | `EMERGENT_LLM_KEY` |
| **OpenAI Vision** | Active | `services/photo_analysis.py` → `/api/photo/analyze` | `EMERGENT_LLM_KEY` |
| **Supabase Auth** | Active | `services/supabase_service.py`, `routes/auth.py` | `SUPABASE_URL`, `SUPABASE_SECRET_KEY` |
| **Supabase DB** | Pending | `services/supabase_service.py` | Migration SQL not run |
| **Stripe** | Skeleton | `routes/webhooks.py` (handler exists, not wired) | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| **Apple Maps MapKit** | Planned | Frontend maps (currently mock) | — |
| **Gas Buddy** | Planned | Fuel price data | — |

---

## 8. Environment Variables

### Backend (`/app/backend/.env`)
| Variable | Purpose |
|----------|---------|
| `MONGO_URL` | MongoDB connection (legacy — not used, system requirement) |
| `DB_NAME` | Database name (legacy — not used, system requirement) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SECRET_KEY` | Supabase service role key (admin access) |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key |
| `SUPABASE_DB_PASSWORD` | DB password for direct PostgreSQL (blocked by firewall) |
| `JWT_SECRET` | JWT signing secret |
| `EMERGENT_LLM_KEY` | Universal LLM key (OpenAI + Anthropic + Gemini) |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |

### Frontend (`/app/frontend/.env`)
| Variable | Purpose |
|----------|---------|
| `REACT_APP_BACKEND_URL` | External backend URL (Kubernetes ingress) |
| `VITE_API_URL` | Internal API prefix (set to `/api`) |
| `VITE_BACKEND_URL` | External backend URL (used in AdminDashboard/PartnerDashboard) |

### Mobile (`/app/snaproad-mobile/.env`)
| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_API_URL` | Backend API URL for Expo |

---

## 9. Test Suite

**Location:** `/app/backend/tests/` (17 test files, pytest)

| Test File | Coverage Area |
|-----------|--------------|
| `test_snaproad_api.py` | Core API endpoints |
| `test_comprehensive_api.py` | Comprehensive endpoint tests |
| `test_modular_backend.py` | Modular route structure |
| `test_new_features.py` | New feature additions |
| `test_new_features_iter28.py` | Features from iteration 28 |
| `test_websocket_moderation.py` | WebSocket admin moderation |
| `test_orion_partner_v2.py` | Orion AI + Partner V2 endpoints |
| `test_partner_admin_features.py` | Partner admin functionality |
| `test_partner_locations.py` | Partner location management |
| `test_offer_boosts.py` | Boost system |
| `test_tiered_offers_share_trip.py` | Tiered offers + trip sharing |
| `test_map_search_navigation.py` | Map search + navigation |
| `test_driving_score_challenges.py` | Driving score + challenges |
| `test_plan_selection.py` | Plan selection flow |
| `test_trip_route_analytics.py` | Trip + route analytics |
| `test_phase2a_xp_reports_badges.py` | XP, road reports, badges |
| `test_redemption_weekly_recap.py` | Gem redemption + weekly recap |
| `test_session_reset.py` | Session reset |
| `test_welcome_onboarding_iter29.py` | Welcome + onboarding |
| `test_snaproad_mobile_api.py` | Mobile-specific API tests |

---

## 10. Database Schema (Supabase)

**Migration file:** `/app/backend/sql/supabase_migration.sql`  
**Status:** Schema written, NOT YET executed. Run this in your Supabase SQL Editor.

| Table | Key Columns | Purpose |
|-------|------------|---------|
| `users` | id (UUID), email, name, role, gems, level, xp, safety_score, plan | Driver user records |
| `partners` | id (UUID), business_name, email, plan, status, is_approved | Partner business records |
| `partner_locations` | id, partner_id, name, address, lat, lng, is_primary | Partner store locations |
| `offers` | id, partner_id, title, description, base_gems, discount_percent, lat, lng, status, expires_at | Business offers |
| `trips` | id, user_id, distance_miles, duration_minutes, safety_score, gems_earned, started_at | Trip records |
| `trip_gems` | id, trip_id, gem_id, collected, value | Gems spawned on routes |
| `road_reports` | id, user_id, type, description, lat, lng, upvotes, status | Community road reports |
| `events` | id, title, description, start_date, end_date, type | Platform events/promotions |
| `challenges` | id, challenger_id, opponent_id, stake, status, ends_at | Driver vs. driver challenges |
| `notifications` | id, user_id, type, title, message, read, created_at | User notifications |
| `boosts` | id, offer_id, partner_id, boost_type, multiplier, expires_at | Offer boost records |
| `analytics_events` | id, offer_id, business_id, event_type, timestamp | Analytics tracking events |

---

*Last updated: February 2026*
