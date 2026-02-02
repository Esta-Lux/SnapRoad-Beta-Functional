# SnapRoad - Privacy-First Navigation App

## Product Overview
SnapRoad is a privacy-first navigation app with gamified safety rewards. Features an iPhone 16-optimized driver interface inspired by Google Maps' clean design.

## Tech Stack
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Backend:** FastAPI (Python) with in-memory mock data
- **Database Schema:** PostgreSQL (documented, not connected)

## Completed Features (Feb 2, 2025)

### User ID & Social System
- ✅ **6-digit user IDs** starting from 123456
- ✅ **Friends Hub** - search and add friends by ID
- ✅ Friend search returns: name, safety score, level, state
- ✅ Add/remove friends functionality
- ✅ Friends count shown in hamburger menu

### Leaderboard System
- ✅ **State-by-state leaderboard** ranked by safety score
- ✅ State filter dropdown with 20 US states
- ✅ Shows: rank, name, level, state, badges count, safety score
- ✅ Crown/medal icons for top 3 positions
- ✅ User's own rank displayed

### Badge Collection (160 Badges)
- ✅ **160 unique badges** across 6 categories:
  - Distance (20): First Mile, Century Club, Globe Trotter, etc.
  - Safety (30): Safety First, Perfect Driver, Zen Master, etc.
  - Community (30): Road Guardian, Social Butterfly, Ambassador, etc.
  - Streak (20): Week Warrior, Monthly Master, Year Legend, etc.
  - Achievement (30): Badge Hunter, Gem Tycoon, Completionist, etc.
  - Special (30): Holiday badges, seasonal, landmarks, etc.
- ✅ **Earned badges** show emoji icon with checkmark
- ✅ **Locked badges** show lock icon with progress bar
- ✅ Category filters and search
- ✅ Badge detail modal with description and gem rewards

### Car Studio
- ✅ **8 car models** with different types (sedan, sports, SUV, luxury, etc.)
- ✅ **16 car skins** with rarity levels (common to legendary)
- ✅ **360° car rotation** with drag and arrow buttons
- ✅ Locked cars show gem price
- ✅ Purchase and equip functionality
- ✅ Skins render on car preview in real-time

### Map UI (Google Maps Style)
- ✅ Clean search bar with separate hamburger menu button
- ✅ Two tabs: Favorites (Home, Work, saved places) and Nearby
- ✅ Moveable and collapsible widgets

### Backend API (100% Working)
- 70+ API endpoints for all features
- User, Friends, Leaderboard, Badges, Cars, Skins, Navigation, etc.

## Testing Status
- **Backend:** 100% (22/22 tests)
- **Frontend:** 100% (all features working)
- **Test Report:** `/app/test_reports/iteration_3.json`

## ⚠️ MOCKED DATA
All data is in-memory mock data. No database or external services connected.

## Upcoming Tasks
1. 🔴 P0: Connect PostgreSQL database
2. 🔴 P0: Integrate real map (Mapbox)
3. 🟡 P1: Add authentication (Supabase)

## Future/Backlog
- Build Flutter mobile app from React prototype
- Integrate Stripe for gem purchases
- Phase 2: Family tracking, AI coaching
- Phase 3: Multi-region support, analytics
