# SnapRoad - Privacy-First Navigation App

## Product Overview
SnapRoad is a privacy-first navigation app with gamified safety rewards. Features an iPhone 16-optimized driver interface with Forza-style premium car customization, Orion voice assistant, tiered offers system, and comprehensive XP/leveling system.

## Tech Stack
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Backend:** FastAPI (Python) with in-memory mock data
- **Planned:** iOS native (Swift/SwiftUI), Mapbox integration

## Completed Features

### Phase 2C: Tiered Offers & Share Trip (Feb 8, 2025) ✅ NEW

#### Tiered Offers System
- ✅ Tiered discounts: Basic (6%) vs Premium (18%)
- ✅ Admin offers give 18% to all users
- ✅ 5 seed offers: Shell Gas Station, Starbucks, Quick Shine Car Wash, SnapRoad Partner Deal (admin), BP Gas Station
- ✅ OffersModal with full offer details and redemption
- ✅ Offer redemption with gems and XP rewards
- ✅ "Upgrade for 18%" upsell for Basic users
- ✅ Redeemed offers marked with checkmark

#### Glowing Gem Markers on Map ✅ NEW
- ✅ Interactive glowing gem markers for nearby offers
- ✅ Pulsing emerald glow effect animation
- ✅ Discount percentage badge on each marker
- ✅ Business name tooltip on hover
- ✅ Click marker → Opens OffersModal with offer auto-selected
- ✅ Markers positioned based on offer lat/lng relative to user

#### Enhanced Leaderboard ✅ NEW
- ✅ State-based filtering with Ohio (OH) as default focus state
- ✅ Time filters: All Time, This Week, This Month
- ✅ User's ranking card shows position within selected state
- ✅ Gems displayed alongside Safety Score
- ✅ Premium user badges (⚡ indicator)
- ✅ Color-coded Safety Scores (green 90+, amber 70-89, red <70)
- ✅ Crown/Medal icons for top 3 positions
- ✅ "You" indicator for current user's entry
- ✅ **Challenge Friend buttons (⚔️)** on each non-user entry

#### Challenge Friend System ✅ NEW
- ✅ Head-to-head safe driving competitions
- ✅ Challenge duration options: 24 Hours, 3 Days, 1 Week
- ✅ Gems at stake options: 50 (Low), 100 (Med), 250 (High), 500 (Extreme)
- ✅ Stake options disabled when user lacks sufficient gems
- ✅ Challenge rules display: Safety Score wins, winner takes all
- ✅ Both drivers earn bonus XP regardless of outcome
- ✅ Backend endpoints: POST /api/challenges, GET /api/challenges

#### Driving Score & Orion Tips (Premium) ✅ NEW
- ✅ Premium feature with upsell modal for Basic users
- ✅ 6 driving metrics: Speed Compliance, Smooth Braking, Smooth Acceleration, Following Distance, Turn Signals, Focus Time
- ✅ Each metric shows score, trend (up/down/stable), and description
- ✅ Orion tips generated based on lowest scoring metrics
- ✅ Priority order: High, Medium, Low with color-coded borders
- ✅ Voice coaching via Web Speech API (TTS speak buttons)
- ✅ Overall score displayed in circular progress indicator

#### Share Trip Score
- ✅ Shareable trip summary card with SnapRoad branding
- ✅ Safety Score display with circular progress
- ✅ Trip stats: distance, duration, gems earned, XP earned
- ✅ "Safe Drive!" badge for scores >= 90
- ✅ Share buttons: Twitter, Instagram, Copy Text, Save as Image
- ✅ Share Trip button in Profile overview

### Phase 2B+: Orion Voice & Quick Reporting (Feb 8, 2025) ✅

#### Orion Voice Assistant
- ✅ Voice-activated reporting: "cop on my left", "hazard ahead"
- ✅ Web Speech API with fallback to quick action buttons
- ✅ Quick action buttons: Hazard, Accident, Construction, Police, Weather
- ✅ Direction support: left, right, ahead, behind
- ✅ Auto-submits report with location after voice command

#### Quick Photo Report (Safety-First)
- ✅ One-tap photo posting - no typing required
- ✅ **Safety guardrails:**
  - Can't use camera while car in motion (>10 mph)
  - Orion voice warning: "Using phone while driving isn't safe"
  - Passenger Mode toggle for passengers
  - Gallery/camera roll always allowed
- ✅ Auto-location tracking from photo
- ✅ Report type selection after photo taken

#### Road Status Overlay
- ✅ Mock traffic data for Columbus, OH area
- ✅ Color-coded markers: Black (closed), Yellow (moderate), Red (heavy)
- ✅ Tap marker for details (road name, reason, delay)

### Phase 2A: XP/Leveling & Road Reports (Feb 8, 2025) ✅
- ✅ Levels 1-99 with XP progression
- ✅ XP rewards: Photo report (+500), Safe drive (+1000), Offer redemption (+700)
- ✅ Road Reports with upvotes (10 gems per upvote)
- ✅ Community Badges (20 total, no progress bars)
- ✅ Trip completion with safety metrics

### Phase 1: Plan Selection System (Feb 8, 2025) ✅
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

### Offers System
- `GET /api/offers` - Get all offers with tiered discounts
- `POST /api/offers` - Create new offer (business/admin)
- `POST /api/offers/{id}/redeem` - Redeem an offer
- `GET /api/offers/nearby` - Get offers within radius

### XP & Leveling
- `GET /api/xp/status`, `GET /api/xp/config`, `POST /api/xp/add`

### Road Reports
- `GET /api/reports`, `POST /api/reports`, `POST /api/reports/{id}/upvote`
- `GET /api/reports/my`, `DELETE /api/reports/{id}`

### Community Badges
- `GET /api/badges/community`

### Pricing & Plans
- `GET /api/pricing`, `PUT /api/admin/pricing`
- `POST /api/user/plan`, `GET /api/user/plan`

## Testing Status
- **Latest Report:** `/app/test_reports/iteration_10.json`
- **Backend:** 100% pass rate (21/21 tests)
- **Frontend:** 100% pass rate (all UI features verified)

## ⚠️ MOCKED DATA
- All backend data is in-memory
- 5 seed offers in offers_db
- Road status uses `MOCK_ROAD_SEGMENTS` constant
- User location mock: Columbus, OH (39.9612, -82.9988)

## Upcoming Tasks

### P2 - Driving Score & Orion Tips
- UI section for Premium users to view driving score breakdown
- Contextual tips from Orion to improve score

### P3 - Full Button Audit
- Ensure all interactive elements are wired to backend endpoints

## Future/Backlog
- Native iOS App Migration (Swift/SwiftUI)
- Live Mapbox Integration (placeholder for API key)
- Real Orion Voice with native iOS libs
- Business & Admin Web Dashboards
- Stripe payments integration
