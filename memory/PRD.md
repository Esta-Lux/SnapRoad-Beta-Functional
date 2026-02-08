# SnapRoad - Privacy-First Navigation App

## Product Overview
SnapRoad is a privacy-first navigation app with gamified safety rewards. Features an iPhone 16-optimized driver interface with Forza-style premium car customization, subscription-based plans, and comprehensive XP/leveling system.

## Tech Stack
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Backend:** FastAPI (Python) with in-memory mock data
- **Planned:** iOS native (Swift/SwiftUI), Mapbox integration

## Completed Features

### Phase 2A: XP/Leveling & Road Reports (Feb 8, 2025) ✅ NEW

#### XP & Leveling System (Levels 1-99)
- ✅ Photo/Hazard report: +500 XP
- ✅ Offer redemption: +700 XP
- ✅ Safe drive: +1000 XP
- ✅ 3 consecutive safe drives bonus: +500 XP
- ✅ Safety score drops: -500 XP (can level down)
- ✅ Level progression: 2500 XP for level 1→2, +500 per level
- ✅ Max level: 99
- ✅ Level Progress UI with progress bar, XP earning methods, requirements

#### Road Reports System
- ✅ Create reports (Hazard, Accident, Construction, Police, Weather)
- ✅ Upvote system: 10 gems per upvote to reporter
- ✅ User stats: Reports posted, upvotes received, gems earned
- ✅ Report list with type icons, verified badges, time ago
- ✅ "My Reports" tab to view own submissions
- ✅ Report button on Map quick actions

#### Community Badges (20 Total)
- ✅ Clean grid layout with emoji icons
- ✅ Earned badges: green checkmark, purple gradient
- ✅ Locked badges: grayed out with lock icon
- ✅ NO progress bars (as per requirements)
- ✅ Badge detail modal with description

#### Trip Completion with Safety Metrics
- ✅ Tracks hard brakes, speeding, phone usage
- ✅ Awards/penalizes XP based on driving behavior
- ✅ Updates safe drive streak (bonus every 3 safe drives)
- ✅ Gem rewards with plan multiplier (1× basic, 2× premium)

### Phase 1: Plan Selection System (Feb 8, 2025) ✅
- ✅ Basic ($0/mo, 1× gems) and Premium ($10.99/mo founders, 2× gems)
- ✅ Admin pricing control with founders toggle
- ✅ 35% discount display, "Lock in price for life!" callout
- ✅ Profile PREMIUM badge and gem multiplier indicator
- ✅ Settings "Your Plan" card with Manage button
- ✅ Onboarding flow: Plan Selection → Car Color Selection → Main App

### Premium Car Studio (Previous) ✅
- ✅ Realistic 3D CSS car models with 7 distinct body shapes
- ✅ 24 color paint shop (Standard, Metallic, Matte, Premium)
- ✅ Premium showroom UI with horizontal rotation
- ✅ Car as navigation marker and profile avatar
- ✅ MVP simplified: Color changes only (Garage/Upgrades coming soon)

### Core Features ✅
- ✅ 4-Tab Navigation: Map, Routes, Rewards, Profile
- ✅ Friends System with 6-digit IDs
- ✅ State Leaderboard (focused on Ohio)
- ✅ 160 Achievements Badges across 6 categories
- ✅ Trip/Gem History screens
- ✅ Weekly Challenges with gem rewards

## API Endpoints

### XP & Leveling
- `GET /api/xp/status` - User's level, XP, progress
- `GET /api/xp/config` - XP configuration values
- `POST /api/xp/add` - Add XP for events

### Road Reports
- `GET /api/reports` - All road reports
- `POST /api/reports` - Create report (+500 XP)
- `POST /api/reports/{id}/upvote` - Upvote (+10 gems to reporter)
- `GET /api/reports/my` - User's reports with stats
- `DELETE /api/reports/{id}` - Delete own report

### Community Badges
- `GET /api/badges/community` - All badges with earned status

### Trip Completion
- `POST /api/trips/complete-with-safety` - Complete trip with safety metrics

### Pricing & Plans
- `GET /api/pricing` - Pricing configuration
- `PUT /api/admin/pricing` - Admin update pricing
- `POST /api/user/plan` - Update user's plan
- `GET /api/user/plan` - Get user's plan

## Testing Status
- **Latest Report:** `/app/test_reports/iteration_8.json`
- **Phase 2A Backend:** 100% (21/21 tests passed)
- **Phase 2A Frontend:** 100% verified

## ⚠️ MOCKED DATA
All data is in-memory. No database connected.

## Upcoming Tasks

### P2B - Offers & Premium Tiers
- Tiered offer system (Free: 6% / Premium: 18% discounts)
- Glowing gem markers on map
- Business voucher/offer system
- Offer redemption flow with gems

### P2.5 - Share Trip Score
- Shareable trip summary after completion
- Social media integration

### P3 - Enhanced Leaderboard
- Top 10 per state (focus on Ohio)
- Primary ranking by Safety Score
- Weekly/monthly filtering

### P3.5 - Route Reminders
- Free: In-app popup when opening app
- Premium: Push notifications

## Future/Backlog

### Orion AI Assistant
- Voice-driven offer announcements
- Voice customization (gender, accent, name)
- "Take me there" voice commands
- Audio ducking for music

### Business & Admin
- Business Offer Dashboard (web only)
- Admin Panel with pricing controls (web only)

### Mobile App
- iOS native with Swift/SwiftUI
- Mapbox integration
- Real-time traffic overlay
- CarPlay support

### Integrations
- Supabase (database/auth)
- Mapbox (maps/traffic)
- Stripe (payments)
- ElevenLabs (voice - optional)
