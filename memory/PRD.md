# SnapRoad - Product Requirements Document

## Product Overview
SnapRoad is a privacy-first, gamified navigation app with three parts:
1. **Driver App** - Mobile/web navigation app with safety scoring, gem rewards, and local offers
2. **Partner Portal** - Business dashboard for managing offers and viewing analytics
3. **Admin Dashboard** - System management and oversight

## Tech Stack
- **Frontend**: React (Vite) web app at `/app/frontend`
- **Backend**: FastAPI at `/app/backend`
- **Mobile App**: React Native (Expo SDK 54) at `/app/snaproad-mobile`
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
- ESLint v10 configured with TypeScript support (flat config)

### Mobile App (React Native - Complete Build)
- **Expo SDK 54** with React 18.3.1, React Native 0.78.2
- **React Navigation v7** with `navigationInChildEnabled` for backward compat
- **Design System**: Neon blue premium theme (`/app/snaproad-mobile/src/utils/theme.ts`)
- **App Entry**: `App.tsx` → `Navigation` component (proper stack-based navigation)
- **Onboarding**: Splash → Welcome → Plan → Car → Main tabs
- **Core Tabs**: Map, Offers, Rewards, Profile
- **Navigation Screens**:
  - `SearchDestinationScreen` - Destination search with recent/saved locations
  - `RoutePreviewScreen` - Route preview with ETA and distance
  - `ActiveNavigationScreen` - Turn-by-turn navigation view
  - `HazardFeedScreen` - Road hazard reporting and viewing
  - `CommuteSchedulerScreen` - Scheduled route management
  - `InsuranceReportScreen` - 90-day safe driving report export
  - `HelpScreen` - FAQ, guides, and support contacts
- **Feature Screens**: DriverAnalytics, Gems, PhotoCapture, PrivacyCenter, NotificationSettings, TripAnalytics, RouteHistory3D, OrionCoach, MyOffers, FuelDashboard, TripLogs, Family, Leaderboard, Settings
- **Setup Script**: `setup.sh` for auto-configuring after GitHub clone
- **Post-install hook**: Auto-cleans problematic `Expo.fx` import

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

## Completed Fixes (Feb 21, 2026)
- React Navigation v7 migration (navigationInChildEnabled, App.tsx entry point fix)
- ESLint v10 flat config for TypeScript in frontend (0 errors)
- Expo SDK 54 upgrade (package.json, index.js cleanup)
- setup.sh auto-fix script for GitHub clones
- All empty catch blocks fixed in DriverApp/index.tsx

## Architecture
```
/app
├── backend/         # FastAPI server
│   ├── server.py
│   ├── services/    # partner_service.py, trip_service.py (mocked)
│   └── user_credentials.py
├── frontend/        # React web app (Vite)
│   ├── eslint.config.mjs  # ESLint v10 flat config
│   └── src/
├── snaproad-mobile/ # React Native (Expo SDK 54)
│   ├── setup.sh     # Auto-fix script
│   ├── App.tsx      # Entry → Navigation component
│   └── src/
│       ├── components/   # Reusable UI components
│       ├── navigation/   # Stack + Tab navigation (React Nav v7)
│       ├── screens/      # 30+ screens
│       ├── services/     # API client
│       ├── store/        # Zustand state
│       └── utils/        # Theme system
└── memory/          # Documentation files
```

## Backlog (Prioritized)

### P1 - Backend Database Integration
Replace mocked trip/partner services with real MongoDB persistence

### P2 - Future
- Apple Maps MapKit integration
- Gas Buddy / fuel price API
- Full mobile app parity with web features

---
Last Updated: February 21, 2026
