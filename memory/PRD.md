# SnapRoad - Product Requirements Document

## Product Overview
SnapRoad is a privacy-first, gamified navigation app with three portals:
1. **Driver App** - Mobile/web app for drivers (safety tracking, gems, offers, badges)
2. **Partner Portal** - Business dashboard for managing offers, locations, boosts
3. **Admin Dashboard** - Platform management (users, partners, events, analytics)

## Tech Stack
- **Frontend (Web):** React + Vite + TypeScript + Tailwind CSS
- **Mobile:** React Native (Expo) + TypeScript
- **Backend:** FastAPI (Python) - **Modular architecture**
- **Database:** Supabase (PostgreSQL) - configured, tables pending creation
- **Integrations:** OpenAI GPT-5.2 (Orion AI Coach), OpenAI Vision (Photo Analysis)
- **Payments:** Stripe (planned)
- **Mapping:** Apple Maps MapKit (planned)

## Backend Architecture (Restructured Feb 22, 2026)
```
/app/backend/
├── server.py              # Thin wrapper (entry point for supervisor)
├── main.py                # FastAPI app assembly
├── config.py              # Settings & env loading
├── database.py            # Supabase client
├── routes/
│   ├── auth.py            # Authentication (login, signup)
│   ├── users.py           # User profile, stats, cars, skins, settings
│   ├── offers.py          # Offers CRUD, redeem, nearby, personalized
│   ├── partners.py        # Partner profile, locations, offers, boosts, V2 API
│   ├── gamification.py    # XP, badges, challenges, leaderboard, gems, scores
│   ├── trips.py           # Trip history, completion, fuel, analytics, 3D routes
│   ├── admin.py           # Admin offers, analytics, pricing, export/import, boosts
│   ├── social.py          # Friends, family, road reports
│   ├── navigation.py      # Locations, routes, nav, map search, widgets
│   ├── ai.py              # Orion AI Coach, photo analysis
│   └── webhooks.py        # Stripe webhooks, WebSocket endpoints
├── services/
│   ├── mock_data.py       # All in-memory mock data
│   ├── supabase_service.py # DB migration & connection test
│   ├── orion_coach.py     # AI coach service
│   ├── photo_analysis.py  # Photo blur service
│   ├── partner_service.py # Partner business logic
│   └── websocket_manager.py # WebSocket management
├── models/
│   └── schemas.py         # All Pydantic request/response models
└── middleware/
    └── auth.py            # JWT auth & password hashing
```

## Mobile App Architecture
```
/app/snaproad-mobile/src/
├── config.ts              # Centralized API config
├── navigation/index.tsx   # Stack + Tab navigation (40+ screens registered)
├── components/
│   └── DrawerMenu.tsx     # Hamburger menu with all sections
├── screens/               # 42 screens total
│   ├── Onboarding:        Splash, Welcome, PlanSelection, CarSetup
│   ├── Core Tabs:         Map, Routes, Rewards, Profile, Offers
│   ├── Driver Features:   TripAnalytics, RouteHistory3D, DriverAnalytics, TripLogs, FuelDashboard
│   ├── Offers & Gems:     OfferDetail, MyOffers, Gems, GemHistory
│   ├── AI & Capture:      OrionCoach, PhotoCapture
│   ├── Social:            Leaderboard, Family, FriendsHub, Badges
│   ├── Settings:          Settings, PrivacyCenter, NotificationSettings
│   ├── Navigation:        ActiveNavigation, SearchDestination, RoutePreview, HazardFeed, CommuteScheduler
│   ├── Premium:           CarStudio, Challenges, LevelProgress, WeeklyRecap, InsuranceReport, Help
│   └── Dashboards:        AdminDashboard, PartnerDashboard   ← NEW
└── store/                 # Zustand state management
```

## Key Credentials
- **Driver:** driver@snaproad.com / password123
- **Partner:** partner@snaproad.com / password123
- **Admin:** admin@snaproad.com / password123
- **Supabase URL:** https://cuseezsdaqlbwlxnjsyr.supabase.co
- **Emergent LLM Key:** Configured in backend .env

## What's Implemented
### Web App (100% functional)
- Landing page with onboarding flow
- Full driver app at /driver route (34+ sub-components)
- Partner dashboard at /partner route
- Admin dashboard at /admin route
- All backed by mock API data

### Mobile App (Feature parity achieved)
- 42 screens registered in navigation
- DrawerMenu with all sections (Social, Navigation, Rewards, Analytics, Management, Settings)
- Admin Dashboard mobile screen (5 tabs: Overview, Users, Partners, Offers, Events)
- Partner Dashboard mobile screen (5 tabs: Overview, Offers, Locations, Boosts, Analytics)
- All premium feature screens implemented

### Backend (Modular + Supabase-ready)
- Split from 4500-line monolithic server.py into 11 route modules
- 40+ API endpoints verified working (97.6% pass rate)
- Supabase client configured, migration script ready
- Pydantic models for all request/response types
- JWT authentication middleware

## Current Status
- **Backend:** MOCKED (in-memory data). Supabase configured but tables not created.
- **Web App:** Fully functional
- **Mobile App:** All screens created with premium UI, navigation wired up

## Pending Tasks
### P0 (Critical)
- Run Supabase database migration (create tables + seed data)
- Connect endpoints to real Supabase queries (replace mock data)

### P1 (Important)
- Stripe integration for payment flows
- Gas price API integration
- Push notification setup

### P2 (Nice to have)
- Apple Maps MapKit integration
- Full E2E testing of mobile app
- Code cleanup of obsolete figma-ui/ directory

---
Last Updated: February 22, 2026
