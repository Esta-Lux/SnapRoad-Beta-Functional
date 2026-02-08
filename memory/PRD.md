# SnapRoad - Privacy-First Navigation App

## Product Overview
SnapRoad is a privacy-first navigation app with gamified safety rewards. Features an iPhone 16-optimized driver interface with Forza-style premium car customization and subscription-based plans.

## Tech Stack
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Backend:** FastAPI (Python) with in-memory mock data

## Completed Features

### Phase 1: Plan Selection System (Feb 8, 2025) ✅ NEW

#### Subscription Plans
- **BASIC ($0/mo)**: Manual rerouting, privacy-first navigation, auto-blur photos, local offers, 1× gem multiplier
- **PREMIUM ($10.99/mo founders, $16.99/mo public)**: All Basic features + automatic rerouting, advanced local offers, 2× gem multiplier, smart commute analytics, priority support

#### Pricing Features
- ✅ Dynamic pricing from backend (`/api/pricing`)
- ✅ Admin pricing control (`/api/admin/pricing`)
- ✅ Founders pricing toggle with automatic discount calculation
- ✅ Shows discount percentage (e.g., "35% OFF")
- ✅ "Lock in $10.99/month for life!" callout

#### Onboarding Flow
1. Plan Selection → 2. Car Color Selection → 3. Main App
- ✅ Plan selection during onboarding
- ✅ Plan management from Settings > Your Plan > Manage
- ✅ Onboarding status tracking (`/api/user/onboarding-status`)

#### Profile Integration
- ✅ PREMIUM badge with lightning icon in profile header
- ✅ "2× gem multiplier active" text for premium users
- ✅ Settings shows "Your Plan" card with plan status and Manage button

#### API Endpoints (NEW)
- `GET /api/pricing` - Get pricing configuration
- `PUT /api/admin/pricing` - Admin update pricing
- `POST /api/user/plan` - Update user's plan
- `GET /api/user/plan` - Get user's plan
- `GET /api/user/onboarding-status` - Onboarding completion status
- `POST /api/trips/complete` - Complete trip with gem multiplier

### Premium Car Studio (Previous)
- ✅ Realistic 3D CSS car models with 7 distinct body shapes
- ✅ 24 color paint shop (Standard, Metallic, Matte, Premium)
- ✅ Premium showroom UI with horizontal rotation
- ✅ Car as navigation marker and profile avatar

### Core Features
- ✅ 4-Tab Navigation: Map, Routes, Rewards, Profile
- ✅ Friends System with 6-digit IDs
- ✅ State Leaderboard (focused on Ohio)
- ✅ 160 Badges across 6 categories
- ✅ Trip/Gem History screens
- ✅ Weekly Challenges with gem rewards

## Testing Status
- **Latest Report:** `/app/test_reports/iteration_7.json`
- **Backend:** 100% (16/16 tests passed)
- **Frontend:** 100% (all UI features verified)

## ⚠️ MOCKED DATA
All data is in-memory. No database connected.

## Upcoming Tasks

### P1 - Button Endpoint Audit
- Ensure all interactive elements call backend endpoints
- Add loading states and error handling

### P2 - Gem & Voucher System
- Glowing gem markers on map
- Business voucher/offer system with tiered discounts (Free vs Premium)
- 5 gems earned per drive (multiplied by plan)

### P2.5 - Share Trip Score
- Shareable trip summary after completion

### P3 - Enhanced Leaderboard
- Top 10 per state (focus on Ohio)
- Primary ranking by Safety Score
- Weekly/monthly filtering

### P3.5 - Business Offer Logic
- Admin-added offers: Same discount for all users
- Business-added offers: Split (lower for free, higher for premium)
- Offers appear on/above business location markers

## Future/Backlog
- Flutter mobile app
- Real integrations (Supabase, Mapbox)
- Web-only Admin & Business Dashboards
- Stripe integration for payments
