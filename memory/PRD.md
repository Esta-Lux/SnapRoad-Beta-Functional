# SnapRoad - Product Requirements Document

## Problem Statement
Build "SnapRoad," a privacy-first, gamified navigation app with three parts:
1. **Driver App** - Mobile/web for safe driving with rewards
2. **Partner Portal** - Business dashboard for offers and analytics
3. **Admin Dashboard** - System management and oversight

## Tech Stack
- **Frontend**: React + TypeScript + Vite + Tailwind + Shadcn/UI
- **Backend**: FastAPI + Python + MongoDB (via MONGO_URL)
- **Mobile**: React Native (Expo) + TypeScript
- **AI**: GPT-5.2 (Orion Coach) + OpenAI Vision (Photo Analysis) via Emergent LLM Key
- **Maps**: Apple Maps MapKit JS (NOT Mapbox) - backend generates JWT tokens

## Core Architecture
```
/app/backend/server.py          # Main FastAPI server
/app/backend/services/          # Service layer (orion, photo, partner)
/app/frontend/src/              # React web app
/app/snaproad-mobile/src/       # React Native mobile app
/app/memory/                    # Team guides and documentation
```

## What's Implemented

### Driver App (Web + Mobile)
- Onboarding flow (welcome, plan selection, car setup)
- Map screen with dark theme tiles
- AI Orion Coach (LIVE - GPT-5.2)
- Photo capture with face/plate blurring (LIVE - OpenAI Vision)
- Trip Analytics modal (3 tabs: Trips, Savings, Stats)
- Route History 3D visualization
- Collapsible offers panel on map
- Safety scoring, XP, gems, leaderboards
- Fuel dashboard

### Partner Portal
- Dashboard overview with analytics
- Offer CRUD management
- Location management
- Plan-based RBAC (Starter/Growth/Enterprise)
- Boost Center (Basic $9.99/24h, Standard $19.99/3d, Premium $39.99/7d)
- Credits system
- Welcome tour

### Admin Dashboard
- User management, offer moderation
- System analytics

### Mobile App (React Native)
- All core driver screens implemented
- TripAnalyticsScreen with 3 tabs
- RouteHistory3DScreen with interactive SVG map
- Connected to backend mocked APIs

## Maps Decision: Apple Maps MapKit JS
- Backend generates JWT tokens for MapKit JS API
- Mobile uses `react-native-maps` with `PROVIDER_DEFAULT` (Apple Maps on iOS)
- No Mapbox dependency anywhere in the project
- Free with Apple Developer Program ($99/year, 250K calls/day included)

## API Status

| Endpoint | Status | Notes |
|----------|--------|-------|
| POST /api/orion/chat | LIVE | GPT-5.2 via Emergent |
| POST /api/photos/analyze | LIVE | OpenAI Vision |
| GET /api/trips/history/detailed | MOCKED | Needs MongoDB |
| GET /api/routes/history-3d | MOCKED | Needs MongoDB |
| GET /api/partner/boosts/pricing | MOCKED | Static data |
| POST /api/partner/boosts/create | MOCKED | Needs Stripe |
| GET /api/partner/boosts/active | MOCKED | Needs MongoDB |

## Team Guide Files (Updated Feb 18, 2026)
- `/app/memory/ANDREW_BACKEND_GUIDE.md` - Backend: DB migration, Apple MapKit token API, Stripe
- `/app/memory/BRIAN_WEB_GUIDE.md` - Web: API integration, Stripe UI, Apple Maps
- `/app/memory/KATHIR_MOBILE_GUIDE.md` - Mobile: Apple Maps, TripAnalytics, RouteHistory3D
- `/app/memory/PM_COORDINATION_GUIDE.md` - PM: Credentials, team coordination, cost estimates

## Credentials
- Driver: driver@snaproad.com / password
- Partner: partner@snaproad.com / password
- Admin: admin@snaproad.com / password

---
Last Updated: February 18, 2026
