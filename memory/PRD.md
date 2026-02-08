# SnapRoad - Privacy-First Navigation App

## Product Overview
SnapRoad is a privacy-first navigation app with gamified safety rewards. Features an iPhone 16-optimized driver interface inspired by Google Maps' clean design with Forza-style car customization.

## Tech Stack
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Backend:** FastAPI (Python) with in-memory mock data
- **Database Schema:** PostgreSQL (documented, not connected)

## Completed Features (Feb 8, 2025)

### 🚗 Premium Car Customization System (NEW!)
- ✅ **3D CSS Car Renders** with transforms, shadows, gradients
- ✅ **7 Car Categories** each with 3 style variants:
  - Sedan (Classic, Sport, Executive)
  - SUV (Compact, Midsize, Full-Size)
  - Sports Car (Coupe, Convertible, Supercar)
  - Truck (Standard, Crew Cab, Off-Road)
  - Hatchback (City, Hot Hatch, Sport Wagon)
  - Luxury (Sedan, Grand Tourer, Executive)
  - Electric (Sedan, Crossover, Sports)
- ✅ **24 Color Options** organized by type:
  - Standard (8): Midnight Black, Arctic White, Racing Red, Ocean Blue, Forest Green, Sunset Orange, Royal Purple, Canary Yellow
  - Metallic (6): Pearl White, Gunmetal, Chrome Silver, Copper Bronze, Rose Gold, Champagne
  - Matte (4): Matte Black, Matte Grey, Matte Army, Matte Navy
  - Premium (6): Carbon Fiber, Neon Cyan, Neon Pink, Neon Lime, Galaxy Purple, Inferno (require gems)
- ✅ **Car Selection Onboarding** - mandatory on first login with 3-step flow
- ✅ **Car Studio** - Forza-style showroom with dark background, spotlight, rotation controls
- ✅ **3D Car as Navigation Marker** - user's car shows on map instead of blue dot
- ✅ **Profile Car Display** - car shown in profile header and My Car card

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

### Profile Detail Screens
- ✅ **Trip History** - all trips with stats, filtering by month
- ✅ **Gem History** - transaction log of gems earned/spent
- ✅ **Notification Settings** - push and email notification toggles
- ✅ **Help & Support** - FAQ with expandable sections
- ✅ **Fuel Tracker** - log fill-ups with stats

### 4-Tab Navigation
- ✅ Map, Routes, Rewards, Profile
- ✅ Rewards tab combines: Offers, Challenges, Badges, Skins

### Map UI (Google Maps Style)
- ✅ Clean search bar with separate hamburger menu button
- ✅ Two tabs: Favorites (Home, Work, saved places) and Nearby
- ✅ Moveable and collapsible widgets

### Backend API (100% Working)
- 80+ API endpoints for all features
- User, Friends, Leaderboard, Badges, Cars, Skins, Navigation, etc.

## Testing Status
- **Backend:** 100%
- **Frontend:** 100% (all features working)
- **Latest Test Report:** `/app/test_reports/iteration_5.json`

## ⚠️ MOCKED DATA
All data is in-memory mock data. No database or external services connected.

## Upcoming Tasks
1. 🔴 P0: Connect PostgreSQL database
2. 🔴 P0: Integrate real map (Mapbox)
3. 🟡 P1: Add authentication (Supabase)
4. 🟡 P1: Implement "Share Trip Score" feature
5. 🟢 P2: Add rims, spoilers, decals to car customization

## Future/Backlog
- Build Flutter mobile app from React prototype
- Integrate Stripe for gem purchases
- Add engine sound feedback for car types
- Post-trip "garage" animation with score overlay
- Family tracking, AI coaching
- Multi-region support, analytics
