# SnapRoad Phase 1 Lean Beta - PRD

## Original Problem Statement
Build the structure and essentials for SnapRoad Phase 1 Lean Beta - a privacy-first navigation app with gamified safety rewards for Ohio pilot launch. 

**Key Requirements:**
- Create Flutter project structure with placeholder files
- Create React Admin Panel with clean dashboard matching website design
- Create PostgreSQL schema files for Supabase setup
- No API connections implemented yet - structure only

## Architecture

### Tech Stack
- **Mobile**: Flutter 3.16+ with Riverpod, GoRouter
- **Admin**: React 18 + TypeScript + Vite + Tailwind CSS + Zustand
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

### ✅ Completed Features

#### Driver Dashboard (Mobile Preview)
- **Map Tab**: Interactive map view with score/ECO widgets, favorites, offers nearby, quick locations (Home/Work), map markers, hazard markers, voice/navigation controls
- **Offers Tab**: Category filters (All/Gas/Cafe), potential savings card, wallet display, offer cards with trending badges
- **Engagement Tab**: Badge collection with filters (Safety/Distance/Community), mastery level progress, achievement tracking
- **Car Skin Showcase** ("Skins" tab): 
  - Premium Car Studio with "Coming Soon" banner
  - 3D-style car preview with rotation controls (drag to rotate)
  - Layer inspector for skin structure visualization
  - Skin properties (Body Finish, Under-glow, Accent Color, Pattern)
  - Available skins selector with owned/equipped status
  - Gradient buttons for purchase/equip actions
- **Live Tab**: Community placeholder (Coming Soon)
- **Profile Tab**: User avatar, rank badge, stats grid (Gems, Level, Reports, Miles), settings navigation

#### Business Partner Portal
- Stats dashboard (Redemptions, Active Offers, Views, Platform Fees)
- Offer management with status badges (active/paused)
- Recent redemptions tracking
- Create offer modal
- Subscription plan display

#### Admin Dashboard
- Overview stats (Users, Trips, Incidents, Gems)
- Recent activity feed
- Quick actions panel
- System status indicators

### 🆕 New Components Created
- `/src/lib/utils.ts` - Tailwind merge utility (cn function)
- `/src/contexts/ThemeContext.tsx` - Theme provider for dark/light mode
- `/src/components/ui/GradientButton.tsx` - Custom gradient button component
- `/src/components/ui/Badge.tsx` - Status badge component
- `/src/components/features/CarSkinShowcase.tsx` - Full car skin customization feature

### 📦 New Dependencies Added
- `motion` (framer-motion) - For animations
- `clsx` - Class name utility
- `tailwind-merge` - Merge Tailwind classes
- `class-variance-authority` - For variant components

## UI/UX Design System

### Color Palette
- Primary Accent: `#00DFA2` (Emerald)
- Secondary Accent: `#0084FF` (Electric Blue)
- Background (Dark): `#0a0a0f`
- Surface (Dark): `#12121a`
- Text Primary: `#ffffff`
- Text Secondary: `#9ca3af`

### Component Library
- GradientButton (primary/secondary/tertiary variants)
- Badge (default/success/warning/danger/premium variants)
- CircularProgress widget
- Theme-aware styling with CSS variables

## Data Models

### Users
- id, email, full_name, subscription_tier, stripe_customer_id

### Trips
- id, user_id, start_time, end_time, distance_km, driving_score

### Incidents
- id, user_id, incident_type, location, status

### Rewards
- id, user_id, gems_balance, season

### Business Partners
- id, business_name, contact_email, status

### Offers
- id, partner_id, title, gems_required, location

## Prioritized Backlog

### P0 - Critical
- [ ] Backend API implementation (Node.js/Express)
- [ ] Supabase integration for auth and database
- [ ] Real trip tracking functionality

### P1 - High Priority
- [ ] Mapbox integration for navigation
- [ ] Incident reporting with camera
- [ ] Gems earning/spending logic
- [ ] Stripe subscriptions

### P2 - Medium Priority
- [ ] Leaderboard with Redis caching
- [ ] Real-time trip monitoring in admin
- [ ] Partner analytics dashboard
- [ ] Push notifications (FCM)

### P3 - Future/Backlog
- [ ] Flutter mobile app implementation
- [ ] Family tracking/monitoring (Phase 2)
- [ ] AI coaching features (Phase 2)
- [ ] Multi-region support (Phase 3)

## Next Tasks List

1. **Supabase Setup**: Create project, run schema.sql
2. **Auth Implementation**: Integrate Supabase Auth in API and mobile
3. **Mapbox Integration**: Add navigation SDK to Flutter app
4. **Trip Tracking**: Implement start/end trip with GPS
5. **Testing**: End-to-end testing of auth and trip flows

## Access URLs

- **Driver Dashboard**: `/driver`
- **Business Portal**: `/business`
- **Admin Dashboard**: `/dashboard` (after login)
- **Login**: `/login`

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

## Contact
PM: Riyan Ahmed - teams@snaproad.co
