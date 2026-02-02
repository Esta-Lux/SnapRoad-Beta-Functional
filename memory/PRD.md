# SnapRoad Phase 1 Lean Beta - PRD

## Original Problem Statement
Build the structure and essentials for SnapRoad Phase 1 Lean Beta - a privacy-first navigation app with gamified safety rewards for Ohio pilot launch.

**Key Requirements:**
- Create Flutter project structure with placeholder files
- Create React Admin Panel with clean dashboard matching website design
- Create PostgreSQL schema files for Supabase setup
- Driver mobile app with full UI flow optimized for iPhone 16

## Architecture

### Tech Stack
- **Mobile**: Flutter 3.16+ with Riverpod, GoRouter
- **Admin/Preview**: React 18 + TypeScript + Vite + Tailwind CSS + Zustand
- **API**: Node.js 20 + Express + TypeScript
- **Database**: PostgreSQL 15 with PostGIS (via Supabase)
- **Maps**: Mapbox Navigation SDK
- **Image Processing**: AWS Rekognition + Sharp.js
- **Payments**: Stripe
- **Auth**: Supabase Auth

### Repository Structure
```
snaproad-beta/
├── api/         # Node.js backend (placeholder structure)
├── admin/       # React Admin panel (fully implemented)
├── mobile/      # Flutter app (placeholder structure)
├── database/    # PostgreSQL schema files
└── docs/        # Documentation
```

## What's Been Implemented (as of Feb 2, 2025)

### ✅ Complete Driver App Flow (iPhone 16 Optimized)

#### Authentication & Onboarding
- **Welcome Screen**: SnapRoad branding, value props, Get Started/Login CTAs
- **Login Screen**: Email/password, show/hide toggle, forgot password, social login (Google/Apple)
- **Signup Screen**: Name, email, password with strength meter, confirm password, T&C checkbox
- **Forgot Password**: Email input, verification code entry (6-digit), reset flow
- **Auth Context**: User state management, login/signup/logout functions

#### Map Tab (Main Navigation)
- Interactive map view with grid pattern background
- Search bar with "Where to?" placeholder
- Menu, notifications (with badge count), quick actions
- Home/Work shortcuts for quick navigation
- Safety Score widget (circular progress, 0-100)
- Gems counter with daily earnings
- Map markers for gas stations, cafes, hazards
- Voice command button, camera for reports, navigation button
- Current location marker with pulse animation

#### Offers Tab
- Header with "Offers Nearby" count
- Category filters: All, Gas, Cafe
- Potential Savings card ($127.50 display)
- Wallet showing gem balance
- Offer cards with:
  - Brand icon (fuel/coffee)
  - Name + trending badge
  - Discount value (10¢/gal off, 20% off, etc.)
  - Distance + expiration time
  - Favorite heart button
- Offer detail modal with QR code redemption

#### Engagement Tab (4 Sub-tabs)
**Badges Tab:**
- Collection card (11/160 badges, progress bar)
- Filter buttons: All, Earned, Locked
- Badge grid with progress bars
- Badge detail modal with description, progress, gem reward

**Skins Tab:**
- Car Studio hero card
- Skin collection grid with rarities
- Equipped skin indicator
- Purchase/equip functionality

**Progress Tab:**
- Level progress card (Level 42, XP bar)
- Weekly challenges with progress
- Streak counter (14 days)

**My Reports Tab:**
- Total reports + gems earned stats
- Report new hazard button
- Reports list with status (verified/active/resolved)
- Upvote counts

#### Live Tab (Family Tracking)
- "Live Locations" header with online count
- Family member cards showing:
  - Avatar + name
  - Status (driving/parked/offline)
  - Speed indicator (65 mph)
  - Current location
  - Battery level with low warning
  - Distance away
- Member detail modal with call/navigate actions
- Family Plan upsell for non-subscribers

#### Profile Tab (4 Sub-tabs)
**Overview:**
- Profile header with avatar, name, level, PRO badge
- Stats grid: Gems, Rank, Trips, Miles
- Quick links: Achievements, Leaderboard, Trip History, Gem History

**Score Tab:**
- Large circular safety score display
- Category breakdown (Speed, Braking, Acceleration, Phone Use)

**Fuel Tab (Premium):**
- Weekly usage stats (gallons, cost, MPG)
- Log fill-up button
- Premium upsell for non-subscribers

**Settings Tab:**
- Account, Subscription, My Vehicles
- Notifications, Privacy, Help & Support
- Log Out button

### UI/UX Features
- iPhone 16 frame (390x844px viewport)
- Notch with status bar (time, 5G, battery)
- Home indicator bar
- Rounded corners (44px frame, 36px content)
- Smooth animations (slide-up modals, fade-in)
- Toast notifications via react-hot-toast
- Dark theme optimized for driving

### Modals & Interactions
- Search modal with recent destinations
- Notifications panel
- Offer detail with redemption
- Badge detail with progress
- Family member detail with actions
- Incident report type selector

## Data Models

### User
```typescript
{
  id: string
  name: string
  email: string
  avatar: string
  isPremium: boolean
  isFamilyPlan: boolean
  gems: number
  level: number
  safetyScore: number
  streak: number
  totalMiles: number
  totalTrips: number
  badges: number
  rank: number
}
```

### Offer
```typescript
{
  id: number
  name: string
  type: 'gas' | 'cafe'
  gems: number
  discount: string
  distance: string
  trending: boolean
  expires: string
}
```

### Badge
```typescript
{
  id: number
  name: string
  desc: string
  progress: number
  earned: boolean
  gems: number
  category: 'distance' | 'safety' | 'community' | 'eco'
}
```

### Family Member
```typescript
{
  id: number
  name: string
  avatar: string
  status: 'driving' | 'parked' | 'offline'
  location: string
  battery: number
  distance: string
  speed: number
  lastSeen?: string
}
```

## Prioritized Backlog

### P0 - Critical
- [x] Complete Driver UI flow (all tabs functional)
- [ ] Backend API implementation (Node.js/Express)
- [ ] Supabase integration for auth and database
- [ ] Real trip tracking functionality

### P1 - High Priority
- [ ] Mapbox integration for actual navigation
- [ ] Incident photo upload with auto-blur
- [ ] Gems earning/spending logic (backend)
- [ ] Stripe subscriptions for Premium/Family

### P2 - Medium Priority
- [ ] Leaderboard with Redis caching
- [ ] Real-time trip monitoring in admin
- [ ] Partner analytics dashboard
- [ ] Push notifications (FCM)

### P3 - Future/Backlog
- [ ] Flutter mobile app implementation
- [ ] Family tracking with real GPS
- [ ] AI coaching features
- [ ] Multi-region support

## Access URLs

- **Driver App**: `/driver` (iPhone 16 preview)
- **Driver Auth**: `/driver/auth` (Standalone auth flow)
- **Business Portal**: `/business`
- **Admin Dashboard**: `/dashboard` (after login at `/login`)

### Test Credentials (Admin)
- Email: `admin@snaproad.co`
- Password: `admin123`

## Success Metrics (Phase 1)
- 500+ registered users in Ohio within 4 weeks
- 60%+ users complete at least 5 trips
- 10,000+ total Gems earned
- 200+ incident reports
- 5+ local business partners
- 99%+ uptime, <200ms API response times

## Files Reference

### Driver App Files
- `/app/frontend/src/pages/DriverApp/index.tsx` - Main driver app (700+ lines)
- `/app/frontend/src/pages/Auth/AuthFlow.tsx` - Auth screens
- `/app/frontend/src/contexts/AuthContext.tsx` - Auth state management

### Admin Panel Files
- `/app/frontend/src/pages/Dashboard/index.tsx` - Admin dashboard
- `/app/frontend/src/pages/BusinessDashboard/index.tsx` - Partner portal

### Styling
- `/app/frontend/src/index.css` - Global styles with animations

## Contact
PM: Riyan Ahmed - teams@snaproad.co
