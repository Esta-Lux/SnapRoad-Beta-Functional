# SnapRoad - Privacy-First Navigation App

## Product Overview
SnapRoad is a privacy-first navigation app with gamified safety rewards. Features an iPhone 16-optimized driver interface with Forza-style premium car customization, Orion voice assistant, tiered offers system, and comprehensive XP/leveling system.

## Tech Stack
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Backend:** FastAPI (Python) with in-memory mock data
- **Planned:** iOS native (Swift/SwiftUI), Mapbox integration

## App Routes
- `/` - Welcome/Landing page with auth modal
- `/driver` - Driver mobile app experience
- `/partner` - Partner business dashboard (Premium UI)
- `/admin` - Admin console with full control (Premium UI)

## Completed Features

### Session Management & User State Reset ✅ NEW (Dec 2025)
- ✅ `/api/auth/login?role=driver` resets driver state for fresh testing experience
- ✅ `/api/session/reset` endpoint for manual state reset
- ✅ Driver login automatically clears gems, XP, level, redeemed offers
- ✅ Fresh user starts with 0 gems, Level 1, 0 XP, no redeemed offers
- ✅ Onboarding flow triggers correctly for new users

### Premium Partner Dashboard ✅ NEW (Dec 2025)
- ✅ Glassmorphism UI with ambient background effects
- ✅ Premium gradient cards with hover glow effects
- ✅ **Onboarding Walkthrough** (4 steps with Skip/Continue)
  - Welcome to Partner Portal
  - Create Compelling Offers
  - Track Your Performance
  - Reach Premium Drivers
- ✅ Overview: Total Redemptions, Views, New Customers, Revenue with trends
- ✅ My Offers: Create, edit, pause, delete offers
- ✅ Analytics placeholder for performance tracking
- ✅ Recent redemptions list with timestamps and gem rewards
- ✅ Help & Tour button to re-trigger onboarding
- ✅ Business card with partner stats

### Premium Admin Dashboard ✅ NEW (Dec 2025)
- ✅ Purple/pink gradient branding with glassmorphism
- ✅ Premium ambient background effects
- ✅ **Onboarding Walkthrough** (4 steps with Skip/Continue)
  - Welcome, Administrator
  - User Management
  - Partner Oversight
  - Create Platform Events
- ✅ **Stats**: Total Users, Partners, Avg Safety Score with trends
- ✅ **User Management**: View, edit, suspend users with filters
- ✅ **Partner Management**: Approve, view, manage partners
- ✅ **Events System**: Create daily/weekly/special events
  - Gems multiplier and XP bonus settings
  - Start/end date configuration
  - Active/scheduled/ended status
- ✅ **Quick Actions**: Create Event, View Reports, Send Broadcast, Export Data
- ✅ **Platform Health**: API, Database, Payment, Push status
- ✅ Help & Tour button to re-trigger onboarding
- ✅ Super Admin card with full access indicator

### Welcome Page & Auth System ✅
- ✅ Beautiful landing page with city background
- ✅ "Safe journeys, smart rewards" tagline
- ✅ Feature strip: Safety Score, Earn Gems, Leaderboards, Premium Perks
- ✅ Glassmorphism auth modal with role selector (Driver/Partner/Admin)
- ✅ Email/password form with visibility toggle
- ✅ Sign in/Sign up mode toggle
- ✅ **Auto-resets driver state** on login for fresh experience

### Orion Offer Alerts (During Drives) ✅
- ✅ Pushes 2 offers during active navigation
- ✅ Voice announcement: "Hey! There's a [business] nearby..."
- ✅ Shows distance, discount, and gems reward
- ✅ Mute/unmute button
- ✅ "View Offer" button opens redemption popup
- ✅ Auto-dismiss after 15 seconds

### Phase 2C: Tiered Offers & Share Trip ✅
- ✅ Tiered discounts: Basic (6%) vs Premium (18%)
- ✅ Admin offers give 18% to all users
- ✅ 5 seed offers with redemption tracking
- ✅ Glowing gem markers on map for nearby offers
- ✅ Enhanced Leaderboard with state filtering
- ✅ Challenge Friend system with gems at stake
- ✅ Challenge History & Badges modal
- ✅ Geofenced QR Code system with screenshot blocking
- ✅ Weekly Recap (Premium feature)
- ✅ Driving Score & Orion Tips (Premium feature)

### Phase 2A-B: Core Features ✅
- ✅ XP/Leveling system (Levels 1-99)
- ✅ Road Reports with upvotes
- ✅ Community Badges (20 total)
- ✅ Orion Voice Assistant
- ✅ Quick Photo Report with safety guardrails
- ✅ Road Status Overlay

### Phase 1: Plan Selection System ✅
- ✅ Basic ($0/mo, 1× gems) and Premium ($10.99/mo, 2× gems)
- ✅ Admin pricing control with founders toggle
- ✅ Onboarding flow: Plan Selection → Car Color Selection → Main App

### Premium Car Studio ✅
- ✅ Realistic 3D CSS car models with 7 body shapes
- ✅ 24 color paint shop
- ✅ Car as navigation marker and profile avatar

### Core Features ✅
- ✅ 4-Tab Navigation: Map, Routes, Rewards, Profile
- ✅ Friends System, State Leaderboard (Ohio focus)
- ✅ 160 Achievement Badges, Weekly Challenges

## API Endpoints

### Session Management (NEW)
- `POST /api/auth/login?role=driver` - Mock login with state reset for drivers
- `POST /api/session/reset` - Manual state reset

### Offers System
- `GET /api/offers` - Get all offers with tiered discounts
- `POST /api/offers` - Create new offer (business/admin)
- `POST /api/offers/{id}/redeem` - Redeem an offer
- `GET /api/offers/nearby` - Get offers within radius

### XP & Leveling
- `GET /api/xp/status`, `GET /api/xp/config`, `POST /api/xp/add`

### Road Reports
- `GET /api/reports`, `POST /api/reports`, `POST /api/reports/{id}/upvote`

### Pricing & Plans
- `GET /api/pricing`, `PUT /api/admin/pricing`
- `POST /api/user/plan`, `GET /api/user/plan`

## Testing Status
- **Latest Report:** `/app/test_reports/iteration_14.json`
- **Backend:** 100% pass rate (all session reset tests pass)
- **Frontend:** 100% pass rate (Skip Tour button fixed)

## ⚠️ MOCKED DATA
- All backend data is in-memory (users_db, offers_db, etc.)
- Session resets are instant but don't persist across server restarts
- Road status uses mock Columbus, OH area data

## Upcoming Tasks

### P2 - Full Button Audit
- Ensure all interactive elements are wired to backend endpoints
- Wire up Settings, Notifications buttons on dashboards

### P3 - Orion Proactive Offer Alerts
- Push offers during drives even without destination set

## Future/Backlog
- Native iOS App Migration (Swift/SwiftUI)
- Live Mapbox Integration (placeholder for API key)
- Real Orion Voice with native iOS libs
- Stripe payments integration
- Real authentication (Firebase/Auth0)
