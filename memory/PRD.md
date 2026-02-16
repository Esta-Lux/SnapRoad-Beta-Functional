# SnapRoad - Product Requirements Document

## Project Overview
SnapRoad is a privacy-first, gamified navigation app. The project consists of:
- **Web Frontend** (`/app/frontend`): React + Vite web application with full Driver App UI
- **Mobile App** (`/app/snaproad-mobile`): React Native (Expo) mobile application
- **Backend** (`/app/backend`): FastAPI server with mocked endpoints
- **Reference Code** (`/app/snaproad-beta`): PostgreSQL schema and Flutter specs

## Core Features

### Implemented Features

#### 1. Plan Selection Screen
- Basic Plan ($0/mo): Manual rerouting, privacy navigation, auto-blur photos, local offers (6%), 1x gems
- Premium Plan ($10.99/mo): Everything in Basic + auto rerouting, premium offers (18%), 2x gems, analytics, priority support
- "Most Popular" badge on Premium
- Founders pricing with 35% discount
- Radio button selection UI

#### 2. Car Onboarding Screen
- Vehicle type selection (Sedan, SUV, Truck)
- Color selection with free/locked colors
- Progress bar (Step 1/2, Step 2/2)
- Car preview with selected color
- Gem pricing for locked colors

#### 3. Main Driver App (4 Tabs)

**Map Tab:**
- Search bar with menu button and voice (Orion) button
- Filter pills: Favorites, Nearby, Report, Photo
- Quick locations: Home, Work, Add More
- Dark themed map with street grid
- Gem markers showing discount percentages
- Car marker showing user location
- Orion voice FAB (purple)
- Camera FAB

**Routes Tab:**
- Saved routes list (max 20)
- Route cards with name, time, distance
- Day-of-week indicators
- Active route badge
- Add new route button

**Rewards Tab (4 Sub-tabs):**
- Offers: Leaderboard preview, View All Offers, nearby offers list
- Challenges: Progress bars, gem/XP rewards, join button
- Badges: Stats (earned/total), badge grid with icons
- Car Studio: Current car preview, change color/vehicle options

**Profile Tab (4 Sub-tabs):**
- Overview: Avatar, level badge, premium tag, stats grid (gems, safety, miles, trips)
- Score: Safety score circle, streak stats
- Fuel: Fuel tracker card
- Settings: Notifications, Privacy, Subscription, Help, About, Logout

#### 4. Side Menu
- User header with car icon, name, level, plan status
- User ID card with friends count
- Stats row (Gems, Score, Rank)
- Menu sections: Social, Navigation, Rewards, Settings
- Logout button

#### 5. Modals
- Search Modal: Location search
- Orion Voice Modal: Voice command interface with quick commands

### Backend Endpoints (Mocked)
- `/api/auth/signup` - User registration
- `/api/auth/login` - User login (driver@snaproad.com / password123)
- `/api/user/profile` - User profile data
- `/api/user/car` - Car customization
- `/api/user/plan` - Plan selection
- `/api/locations` - Saved locations CRUD
- `/api/routes` - Saved routes CRUD
- `/api/offers` - Nearby offers
- `/api/badges` - User badges
- `/api/challenges` - Active challenges
- `/api/reports` - Road reports

## Technical Stack

### Frontend (Web)
- React 18 with TypeScript
- Vite build tool
- TailwindCSS styling
- Lucide React icons
- React Hot Toast notifications

### Mobile (React Native)
- Expo SDK 50
- React Navigation 6
- Expo Linear Gradient
- Ionicons
- React Native Safe Area Context
- Zustand state management

### Backend
- FastAPI (Python)
- MongoDB (connection ready, currently mocked)
- JWT token authentication (mocked)

## What Was Completed (Dec 2025)

### Mobile App Complete Rewrite
- Replicated entire web Driver App UI in React Native
- Implemented Plan Selection screen matching web exactly
- Implemented Car Onboarding screen with type/color selection
- Implemented all 4 main tabs (Map, Routes, Rewards, Profile)
- Implemented all sub-tabs within Rewards and Profile
- Implemented Side Menu with full feature parity
- Implemented Search Modal and Orion Voice Modal
- Applied consistent dark theme styling
- Added all test IDs for testing

## Pending Tasks

### P1 - Backend Database Integration
- Connect FastAPI to MongoDB
- Implement real user authentication with JWT
- Migrate from mock data to database queries
- Use schema from `/app/snaproad-beta/database/schema.sql` as reference

### P2 - Mobile ↔ Backend Connection
- Wire up React Native app to live backend APIs
- Implement API service layer with proper error handling
- Add offline support / caching

### P3 - Additional Features
- Implement remaining modals (Road Reports, Quick Photo, Offers, etc.)
- Real map integration (Mapbox/Google Maps)
- Push notifications
- Trip tracking and safety scoring

## Future / Backlog

### Integrations (Planned)
- Supabase for auth and database
- Stripe for premium subscriptions
- Mapbox for real maps
- OpenAI for Orion voice assistant
- Push notification service

### Features
- Real-time navigation
- Driver safety scoring algorithm
- Social features (friends, leaderboards)
- Achievement system
- Fuel price tracking
- Community road reports

## File Structure

```
/app
├── backend/
│   ├── server.py          # FastAPI server (mocked endpoints)
│   └── requirements.txt
├── frontend/
│   └── src/
│       └── pages/
│           └── DriverApp/  # Web UI source of truth
│               ├── index.tsx
│               └── components/
│                   ├── BadgesGrid.tsx
│                   ├── Car3D.tsx
│                   ├── CarOnboarding.tsx
│                   ├── CarStudioNew.tsx
│                   ├── ChallengeHistory.tsx
│                   ├── CommunityBadges.tsx
│                   ├── DrivingScore.tsx
│                   ├── FriendsHub.tsx
│                   ├── FuelTracker.tsx
│                   ├── GemHistory.tsx
│                   ├── HelpSupport.tsx
│                   ├── InteractiveMap.tsx
│                   ├── Leaderboard.tsx
│                   ├── LevelProgress.tsx
│                   ├── NotificationSettings.tsx
│                   ├── OffersModal.tsx
│                   ├── OrionOfferAlerts.tsx
│                   ├── OrionVoice.tsx
│                   ├── PlanSelection.tsx
│                   ├── QuickPhotoReport.tsx
│                   ├── RedemptionPopup.tsx
│                   ├── RoadReports.tsx
│                   ├── RoadStatusOverlay.tsx
│                   ├── ShareTripScore.tsx
│                   ├── TripHistory.tsx
│                   └── WeeklyRecap.tsx
├── snaproad-mobile/
│   ├── App.tsx
│   ├── src/
│   │   ├── screens/
│   │   │   └── DriverApp.tsx  # Main mobile app (complete rewrite)
│   │   ├── components/
│   │   │   └── ui.tsx
│   │   └── utils/
│   │       └── theme.ts
│   └── package.json
└── snaproad-beta/
    ├── database/
    │   └── schema.sql      # PostgreSQL schema reference
    └── mobile/             # Flutter specs (reference only)
```

## Test Credentials
- Email: `driver@snaproad.com`
- Password: `password123`
- User ID: `123456`

## Notes
- All backend endpoints return mock data
- Premium discount is 18%, Basic is 6%
- Color unlock prices range from 100-500 gems
- Maximum 20 saved routes per user
