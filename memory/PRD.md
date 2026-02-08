# SnapRoad - Privacy-First Navigation App

## Product Overview
SnapRoad is a privacy-first navigation app with gamified safety rewards. Features an iPhone 16-optimized driver interface with Forza-style premium car customization, Orion voice assistant, and comprehensive XP/leveling system.

## Tech Stack
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Backend:** FastAPI (Python) with in-memory mock data
- **Planned:** iOS native (Swift/SwiftUI), Mapbox integration

## Completed Features

### Phase 2B+: Orion Voice & Quick Reporting (Feb 8, 2025) ✅ NEW

#### Orion Voice Assistant
- ✅ Voice-activated reporting: "cop on my left", "hazard ahead"
- ✅ Web Speech API with fallback to quick action buttons
- ✅ Quick action buttons: Hazard, Accident, Construction, Police, Weather
- ✅ Direction support: left, right, ahead, behind
- ✅ Auto-submits report with location after voice command
- ✅ iOS implementation notes included in code comments

#### Quick Photo Report (Safety-First)
- ✅ One-tap photo posting - no typing required
- ✅ **Safety guardrails:**
  - Can't use camera while car in motion (>10 mph)
  - Orion voice warning: "Using phone while driving isn't safe"
  - Passenger Mode toggle for passengers
  - Gallery/camera roll always allowed
- ✅ Auto-location tracking from photo
- ✅ Report type selection after photo taken
- ✅ iOS implementation notes for motion detection

#### Road Status Overlay
- ✅ Mock traffic data for Columbus, OH area
- ✅ Color-coded markers:
  - ⬛ Black = Road closed
  - 🟡 Yellow = Moderate traffic
  - 🔴 Red = Heavy traffic/congestion
  - Clear = No indicator needed
- ✅ Tap marker for details (road name, reason, delay)
- ✅ Ready for Mapbox integration

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

## Map Quick Actions
```
[Favorites] [Nearby] [Report] [Photo]
```
- **Report** → Opens Road Reports screen
- **Photo** → Opens Quick Photo Report

## API Endpoints

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
- **Latest Report:** `/app/test_reports/iteration_9.json`
- **All Features:** 100% pass rate

## ⚠️ MOCKED DATA
- All backend data is in-memory
- Road status uses `MOCK_ROAD_SEGMENTS` constant
- User location mock: Columbus, OH (39.9612, -82.9988)

## iOS Implementation Notes
Each component includes detailed Swift/SwiftUI implementation notes:
- **OrionVoice.tsx**: Apple Speech framework, AVSpeechSynthesizer for TTS
- **QuickPhotoReport.tsx**: CMMotionActivityManager, CLLocationManager for speed
- **RoadStatusOverlay.tsx**: Mapbox traffic layer integration

## Upcoming Tasks

### P2C - Tiered Offers System
- Free: 6% discount / Premium: 18% discount
- Glowing gem markers on map
- Offer redemption with gems

### P3 - Enhanced Leaderboard
- Weekly/monthly filtering
- Top 10 per state (Ohio focus)

### P3.5 - Route Reminders
- Free: In-app popup
- Premium: Push notifications

## Future/Backlog
- Orion "Is it still there?" prompts for other drivers
- Business Offer Dashboard (web only)
- Admin Panel (web only)
- iOS native app with Mapbox
- Stripe payments integration
