# SnapRoad - Privacy-First Navigation App

## Product Overview
SnapRoad is a privacy-first navigation app with gamified safety rewards. Features an iPhone 16-optimized driver interface with Forza-style premium car customization, Orion voice assistant, tiered offers system, and comprehensive XP/leveling system.

## Tech Stack
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + Recharts
- **Backend:** FastAPI (Python) with in-memory mock data
- **AI Integration:** Gemini Nano Banana (via Emergent LLM Key)
- **Planned:** iOS native (Swift/SwiftUI), Mapbox integration

## App Routes & URLs

### Public Routes
- `/` - Welcome/Landing page with auth modal
- `/driver` - Driver mobile app experience

### Business Portal (Separate URL for Custom Domain)
- `/portal/partner` - Partner business dashboard with real-time analytics

### Admin Console (SECRET - Only Accessible via Direct Link)
- `/portal/admin-sr2025secure` - Admin console with full platform control
- **NOTE:** `/admin` redirects to home - admin is NOT searchable

## Completed Features

### Premium Partner Dashboard ✅ NEW (Dec 2025)
- ✅ Glassmorphism UI with ambient background effects
- ✅ **4-Step Onboarding Walkthrough** (Skip/Continue)
- ✅ **Real-Time Analytics Dashboard**:
  - Stats Cards: Total Views, Clicks, Redemptions, Revenue with trends
  - Performance Trend Chart (Area chart with views/redemptions)
  - Geographic Distribution (Pie chart with top locations)
  - CTR, Conversion Rate, Avg Order Value metrics
- ✅ **Boost Center** with customizable:
  - Duration slider (1-30 days): $25 base + $20 per extra day
  - Reach slider (100-2,000 people): $5 for 100 + $10 per 100 increment
  - Real-time cost calculation
- ✅ **AI Image Generator** for offers (Gemini Nano Banana)
- ✅ Create/Edit/Delete offers with premium UI

### Premium Admin Dashboard ✅ NEW (Dec 2025)
- ✅ Purple/pink gradient branding with glassmorphism
- ✅ **4-Step Onboarding Walkthrough** (Skip/Continue)
- ✅ **Platform Analytics**:
  - Stats: Total Users, Partners, Avg Safety Score
  - Platform Growth Chart (new users over time)
  - Revenue Trend Chart
- ✅ **Quick Actions**: Create Offer, Export, Import, Create Event
- ✅ **Create Offers on Behalf of Businesses**:
  - Partner selector dropdown
  - AI Image Generator integration
  - All standard offer fields
- ✅ **Export Data**:
  - Export Offers (JSON/CSV)
  - Export Users (JSON/CSV)
  - Download functionality
- ✅ **Import Data**:
  - Import offers from JSON
  - Bulk offer creation
- ✅ User Management with filters
- ✅ Partner Management with quick offer creation
- ✅ Events System (daily/weekly/special)

### Boost System ✅ NEW (Dec 2025)
**Pricing Structure:**
- **Duration**: $25/day base, +$20 for each additional day
  - 1 day = $25
  - 2 days = $45
  - 3 days = $65
  - etc.
- **Reach**: $5 for 100 people, +$10 per additional 100
  - 100 reach = $5
  - 200 reach = $15
  - 300 reach = $25
  - etc.

### AI Image Generation ✅ NEW (Dec 2025)
- ✅ Uses Gemini Nano Banana via Emergent LLM Key
- ✅ Offer type-specific prompts (gas, cafe, restaurant, carwash, retail)
- ✅ Available in both Partner and Admin dashboards
- ✅ Generated images can be attached to offers

### Session Management & User State Reset ✅
- ✅ `/api/auth/login?role=driver` resets driver state
- ✅ Fresh user starts with 0 gems, Level 1, 0 XP
- ✅ Onboarding flow triggers correctly for new users

### Driver App Features ✅
- ✅ XP/Leveling system (Levels 1-99)
- ✅ Tiered Offers (Basic 6% vs Premium 18%)
- ✅ Glowing gem markers on map
- ✅ Geofenced QR Code redemption
- ✅ Weekly Recap (Premium)
- ✅ Driving Score (Premium)
- ✅ Orion Voice Assistant
- ✅ Challenge Friend system
- ✅ Road Reports with upvotes

## API Endpoints

### Boost System
- `POST /api/boosts/calculate` - Calculate boost cost
- `POST /api/boosts/create` - Create a new boost
- `GET /api/boosts` - Get all boosts
- `DELETE /api/boosts/{boost_id}` - Cancel boost

### AI Image Generation
- `POST /api/images/generate` - Generate promotional image
- `GET /api/images/{image_id}` - Get generated image

### Business Analytics
- `POST /api/analytics/track` - Track analytics event
- `GET /api/analytics/dashboard` - Get business analytics

### Admin Features
- `POST /api/admin/offers/create` - Create offer for business
- `GET /api/admin/export/offers` - Export offers (JSON/CSV)
- `GET /api/admin/export/users` - Export users (JSON/CSV)
- `POST /api/admin/import/offers` - Import offers from JSON
- `GET /api/admin/analytics` - Platform-wide analytics

## Testing Status
- **Latest Report:** `/app/test_reports/iteration_15.json`
- **Backend:** 100% (17/17 tests pass)
- **Frontend:** 100% (all features working)

## ⚠️ MOCKED DATA
- All backend data is in-memory (users_db, offers_db, boosts_db, analytics_db)
- AI image generation uses real Gemini Nano Banana API
- Boost payments are simulated (no real Stripe integration)

## Upcoming Tasks

### P2 - Full Button Audit
- Wire up Settings, Notifications buttons on dashboards
- Ensure all interactive elements function

### P3 - Enhanced Features
- Real-time WebSocket updates for analytics
- More granular boost targeting options

## Future/Backlog
- Native iOS App Migration (Swift/SwiftUI)
- Live Mapbox Integration
- Real Stripe Payment Integration for boosts
- Real Authentication (Firebase/Auth0)
- Push Notifications System
