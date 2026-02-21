# SnapRoad - Product Requirements Document

## Product Overview
SnapRoad is a privacy-first, gamified navigation app with three parts:
1. **Driver App** - Mobile/web navigation app with safety scoring, gem rewards, and local offers
2. **Partner Portal** - Business dashboard for managing offers and viewing analytics
3. **Admin Dashboard** - System management and oversight

## Tech Stack
- **Frontend**: React (Vite) web app at `/app/frontend`
- **Backend**: FastAPI at `/app/backend`
- **Mobile App**: React Native (Expo) at `/app/snaproad-mobile`
- **Database**: MongoDB (currently using mocked data for trips/partners)

## AI Integrations
- **OpenAI GPT-5.2**: Orion AI Coach (uses Emergent LLM Key)
- **OpenAI Vision**: Photo Capture blurring (uses Emergent LLM Key)
- **Apple Maps MapKit**: Designated mapping technology (not yet implemented)

## Implemented Features

### Web Frontend (Stable)
- Landing page with premium UI
- Driver login/signup flow
- Driver dashboard with map, offers, gems, family tabs
- Onboarding flow (plan → car → color selection)
- Partner portal with dashboard, offers, analytics, boosts
- Admin portal access

### Mobile App (React Native - Complete Build)
- **Design System**: Neon blue premium theme (`/app/snaproad-mobile/src/utils/theme.ts`)
- **Onboarding**: Splash → Welcome → Plan → Car → Main tabs
- **Core Tabs**: Map, Offers, Rewards, Profile
- **Navigation Screens** (NEW Feb 2026):
  - `SearchDestinationScreen` - Destination search with recent/saved locations
  - `RoutePreviewScreen` - Route preview with ETA and distance
  - `ActiveNavigationScreen` - Turn-by-turn navigation view
  - `HazardFeedScreen` - Road hazard reporting and viewing
  - `CommuteSchedulerScreen` - Scheduled route management
  - `InsuranceReportScreen` - 90-day safe driving report export
  - `HelpScreen` - FAQ, guides, and support contacts
- **Feature Screens**: DriverAnalytics, Gems, PhotoCapture, PrivacyCenter, NotificationSettings, TripAnalytics, RouteHistory3D, OrionCoach, MyOffers, FuelDashboard, TripLogs, Family, Leaderboard, Settings
- **All screens wired into navigation stack** in `navigation/index.tsx`

### Backend (FastAPI)
- Auth endpoints (login/signup) with mock user credentials
- Trip history API (mocked - 50 trips with full analytics)
- Partner service (mocked - offers, boosts, analytics)
- Orion AI Coach (live - GPT-5.2)
- Photo analysis (live - OpenAI Vision)

## Test Credentials
- Driver: `driver@snaproad.com` / `password123`
- Partner: `partner@snaproad.com` / `password123`
- Admin: `admin@snaproad.com` / `password123`
- Partner Portal: `/portal/partner` loads without auth

## What's MOCKED
- ALL trip data (in-memory, resets on restart)
- ALL partner/offer data
- User authentication (no real DB persistence)

## Architecture
```
/app
├── backend/         # FastAPI server
│   ├── server.py
│   ├── services/    # partner_service.py, trip_service.py (mocked)
│   └── user_credentials.py
├── frontend/        # React web app (Vite)
│   └── src/
├── snaproad-mobile/ # React Native (Expo)
│   └── src/
│       ├── components/   # Reusable UI components
│       ├── navigation/   # Stack + Tab navigation
│       ├── screens/      # 30+ screens
│       ├── services/     # API client
│       ├── store/        # Zustand state
│       └── utils/        # Theme system
└── memory/          # Documentation files
```

## Backlog (Prioritized)

### P1 - Backend Database Integration
Replace mocked trip/partner services with real MongoDB persistence

### P2 - Fix Remaining Issues
- Standardize UI components in mobile app (native-base vs custom)
- Configure ESLint for TypeScript in frontend

### P3 - Future
- Apple Maps MapKit integration
- Gas Buddy / fuel price API
- Full mobile app parity with web features

---
Last Updated: February 21, 2026
