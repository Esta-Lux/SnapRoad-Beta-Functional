# SnapRoad - Product Requirements Document

## Problem Statement
Build "SnapRoad," a privacy-first, gamified navigation app with three parts:
1. **Driver App** - Mobile/web for safe driving with rewards
2. **Partner Portal** - Business dashboard for offers and analytics
3. **Admin Dashboard** - System management and oversight

## Tech Stack
- **Frontend**: React + TypeScript + Vite + Tailwind + Shadcn/UI
- **Backend**: FastAPI + Python + MongoDB (via MONGO_URL)
- **Mobile**: React Native (Expo) + TypeScript + Zustand
- **AI**: GPT-5.2 (Orion Coach) + OpenAI Vision (Photo Analysis) via Emergent LLM Key
- **Maps**: Apple Maps MapKit JS (NOT Mapbox) - backend generates JWT tokens

## Design System (Mobile - Feb 2026 Refresh)
- **Theme**: Premium neon blue glass-morphism
- **Primary**: #2563EB (neon blue), #38BDF8 (electric blue accent)
- **Background**: #070E1B (deep navy), #111D32 (surface)
- **Glass**: rgba(17,29,50,0.85) with border rgba(56,189,248,0.12)
- **Typography**: SF Pro (iOS system font), semibold/bold weights, 0.2-0.5 letter-spacing
- **iPhone 17 compatible**: Safe area insets, Dynamic Island support

## What's Implemented

### Driver Mobile App (25 screens - ALL updated with premium UI)
Core screens refreshed Feb 2026:
- **MapScreen** - Route SVG, quick locations, safety badge, FABs, nearby offers
- **ProfileScreen** - Gradient header, glass cards, grouped menus, stats row
- **DriverAnalyticsScreen** - Stats grid, weekly chart, driving breakdown metrics
- **GemsScreen** - Hero balance, offers/challenges/badges tabs
- **OrionCoachScreen** - Chat UI with quick prompts, gradient bubbles
- **PhotoCaptureScreen** - Camera frame, privacy shield banner, incident types
- **FuelDashboardScreen** - Hero stats, monthly chart, efficiency metrics, tips
- **PrivacyCenterScreen** - Protection banner, privacy toggles, data management
- **NotificationSettingsScreen** - Toggle cards per notification type
- **TripAnalyticsScreen** - 3-tab analytics (Trips, Savings, Stats)
- **RouteHistory3DScreen** - Interactive 3D route visualization
- Also: Splash, Welcome, PlanSelection, CarSetup, Offers, Rewards, Settings, Family, Leaderboard, TripLogs, MyOffers, OfferDetail

### Driver App (Web)
- Same features as mobile, connected to mocked backend
- Trip Analytics, Route History 3D, Collapsible Offers Panel

### Partner Portal (Web)
- Dashboard overview, Offer CRUD, Location management
- Plan-based RBAC, Boost Center, Credits system

### Admin Dashboard (Web)
- User management, offer moderation, system analytics

## API Status
| Endpoint | Status | Notes |
|----------|--------|-------|
| POST /api/orion/chat | LIVE | GPT-5.2 via Emergent |
| POST /api/photos/analyze | LIVE | OpenAI Vision |
| GET /api/trips/history/detailed | MOCKED | Needs MongoDB |
| GET /api/routes/history-3d | MOCKED | Needs MongoDB |
| GET /api/partner/boosts/pricing | MOCKED | Static data |
| POST /api/partner/boosts/create | MOCKED | Needs Stripe |

## Credentials
- Driver: driver@snaproad.com / password123
- Partner: partner@snaproad.com / password123
- Admin: admin@snaproad.com / password123

---
Last Updated: February 2026
