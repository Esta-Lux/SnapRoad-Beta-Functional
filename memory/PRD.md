# SnapRoad - Product Requirements Document

## Project Overview
SnapRoad is a privacy-first, gamified navigation app. The project consists of:
- **Web Frontend** (`/app/frontend`): React + Vite web application with full Driver App UI
- **New Figma UI** (`/app/frontend/src/components/figma-ui`): **COMPLETE** - Design system with 18+ screens for mobile, admin, and partner
- **Mobile App** (`/app/snaproad-mobile`): React Native (Expo) mobile application - **COMPLETE UI REPLICA**
- **Backend** (`/app/backend`): FastAPI server with comprehensive mocked endpoints
- **Reference Code** (`/app/snaproad-beta`): PostgreSQL schema and Flutter specs
- **UI Source** (`/app/snaproad-figma-ui`): Cloned Figma design system repository

## What Was Completed (Feb 18, 2025)

### Figma UI Integration Phase 2 - COMPLETE
Extended the design system integration with additional screens. All screens responsive for iPhone 16, tablet (1024px), and desktop (1920px).

#### New Mobile Screens Added:
- **FuelDashboard**: Eco score with circular progress, savings stats, performance charts, trip efficiency logs
- **TripLogs**: Journey history with safety scores, shared trips tab, route timeline visualization
- **Leaderboard**: Hall of Fame with podium (top 3), expandable driver cards, global/ohio/friends filters
- **Settings**: System preferences with theme toggle, navigation/map settings, storage info
- **LiveLocations**: Family member tracking with status indicators, privacy controls (Coming Soon feature)

#### Testing Results (100% Pass Rate):
- All 21 test cases passed
- Navigation flows verified
- Responsive design confirmed across all viewport sizes
- Theme toggle (dark/light) working with localStorage persistence
- All data-testid attributes properly implemented

## What Was Completed (Feb 2025) - Phase 1

### Initial Figma UI Integration
Successfully integrated the Snaproad-UI-Figma design system into the frontend. Available at `/app` route.

#### Components Created:
- **Primitives**: GradientButton, GemIcon, ImageWithFallback
- **Mobile Screens**: Welcome, Login, SignUp, MapScreen, Profile, Gems, Family, BottomNav
- **Admin Components**: AdminLayout, AdminLogin, AdminDashboard, AdminUsers
- **Context Providers**: SnaproadThemeProvider (dark/light theme support)

#### Features:
- Glassmorphic card design with blur effects
- Brand gradient colors (#004A93 → #0084FF → #00FFD7)
- 8pt spacing grid system
- iPhone 16 UI standards
- Dark/Light theme toggle
- Interactive charts (Recharts)
- Motion animations (Framer Motion)

#### Routes:
- `/app` - New SnapRoad App with Figma design system
- `/app` → Click "Admin Portal" → Admin Dashboard

## What Was Completed (Dec 2025)

### Mobile App Complete UI Conversion
All screens and modals from the web Driver App have been replicated in React Native:

#### Onboarding Flow
1. **Welcome Screen** - Landing page with Golden Gate Bridge background, "Safe journeys, smart rewards" headline, feature highlights (Safety Score, Earn Gems, Leaderboards, Premium Perks), "Start Driving" CTA
2. **Auth Modal** - Sign In/Sign Up form with email, password, name fields, password visibility toggle, error handling
3. **Plan Selection Screen** - Basic/Premium plan selection with pricing, features
4. **Car Onboarding Screen** - Vehicle type and color selection with progress indicators

#### Core Screens
5. **Main App** - 4-tab navigation (Map, Routes, Rewards, Profile)

#### Modals Implemented (`/app/snaproad-mobile/src/components/Modals.tsx`)
1. **Road Reports Modal** - Create/view road hazard reports with upvoting
2. **Quick Photo Modal** - Safety-aware photo reporting with passenger mode
3. **Offers Full Modal** - Complete offers list with redemption flow
4. **Trip History Modal** - Past trips with stats and filtering
5. **Leaderboard Modal** - Rankings with podium, filters, and challenge buttons
6. **Friends Hub Modal** - Friend list and search by 6-digit ID

#### Sub-Screens
- **Map Tab**: Search bar, favorites/nearby pills, gem markers, Orion voice FAB
- **Routes Tab**: Saved routes with day-of-week scheduling
- **Rewards Tab**: Offers, Challenges, Badges, Car Studio sub-tabs
- **Profile Tab**: Overview, Score, Fuel, Settings sub-tabs
- **Side Menu**: Full navigation menu with user stats

### Backend Endpoints (All Functional - Mocked Data)
The backend has 80+ endpoints covering:
- Authentication: `/api/auth/signup`, `/api/auth/login`
- User: `/api/user/profile`, `/api/user/stats`, `/api/user/car`
- Social: `/api/friends`, `/api/friends/search`, `/api/friends/add`
- Rewards: `/api/badges`, `/api/offers`, `/api/challenges`
- Navigation: `/api/routes`, `/api/locations`, `/api/navigation/*`
- Reports: `/api/reports`, `/api/reports/my`, `/api/reports/{id}/upvote`
- Leaderboard: `/api/leaderboard`
- Analytics: `/api/analytics/*`
- Partner Portal: `/api/partner/*`
- Admin: `/api/admin/*`

## Technical Stack

### Mobile (React Native - Expo)
- Expo SDK 50
- React Navigation 6
- Expo Linear Gradient
- Ionicons
- React Native Safe Area Context
- Zustand state management

### Frontend (Web)
- React 18 with TypeScript
- Vite build tool
- TailwindCSS styling
- Lucide React icons

### Backend
- FastAPI (Python)
- MongoDB ready (currently mocked)
- 160 badges, 100+ mock users
- Comprehensive offer system

## File Structure
```
/app
├── backend/
│   ├── server.py          # FastAPI with 80+ endpoints
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── components/
│       │   └── figma-ui/      # NEW: Figma design system integration
│       │       ├── mobile/    # Welcome, Login, SignUp, MapScreen, Profile, Gems, Family
│       │       ├── admin/     # AdminLayout, AdminLogin, AdminDashboard, AdminUsers
│       │       ├── partner/   # (Placeholder for partner components)
│       │       └── primitives/ # GradientButton, GemIcon, ImageWithFallback
│       ├── contexts/
│       │   └── SnaproadThemeContext.tsx  # Theme provider
│       ├── assets/images/     # Design system images
│       └── pages/DriverApp/   # Original web UI source
├── snaproad-mobile/
│   ├── App.tsx
│   └── src/
│       ├── screens/
│       │   └── DriverApp.tsx  # Main app (1300+ lines)
│       └── components/
│           ├── Modals.tsx     # All modal components (1200+ lines)
│           └── ui.tsx
├── snaproad-figma-ui/         # Cloned Figma UI repository
│   ├── *.tsx                  # 100+ component files
│   ├── *.md                   # Design documentation
│   └── *.png                  # Design assets
└── snaproad-beta/
    └── database/schema.sql    # PostgreSQL reference schema
```

## Database Schema (Reference: `/app/snaproad-beta/database/schema.sql`)
Key tables:
- `users` - User accounts with subscription info
- `vehicles` - User vehicle information
- `trips` - Trip history with safety scores
- `trip_events` - Driving events (speeding, braking, etc.)
- `incidents` - Road reports with photos
- `rewards` - User gems and streaks
- `reward_transactions` - Gem earning/spending history
- `business_partners` - Local business accounts
- `offers` - Partner offers with redemption tracking
- `offer_redemptions` - User redemption history

## Test Credentials
- Email: `driver@snaproad.com`
- Password: `password123`
- User ID: `123456`

## Pending Tasks

### P0 - Continue Partner Portal (Next Priority)
- [ ] Partner Dashboard with analytics
- [ ] Partner Offer Management
- [ ] Partner Business Profile screens

### P0 - Remaining Mobile Screens
- [ ] CarSkinShowcase (Car customization)
- [ ] Onboarding flow screens
- [ ] Support/Help screens
- [ ] Account Info / Privacy Center

### P1 - Backend Database Integration
- Connect FastAPI to MongoDB/PostgreSQL
- Migrate from mock data to real database queries
- Implement proper JWT authentication

### P2 - Mobile ↔ Backend Connection
- Create API service layer in React Native
- Connect all modals to live endpoints
- Add offline support/caching

### P3 - Additional Features
- Real map integration (Mapbox/Google Maps)
- Camera integration for photo reports
- Push notifications

## Future / Backlog

### Integrations (Planned)
- Supabase for auth and database
- Stripe for premium subscriptions
- Mapbox for real maps
- OpenAI for Orion voice assistant
- Push notification service

### Features
- Real-time navigation with turn-by-turn
- Driver safety scoring algorithm
- Live road condition updates
- Fuel price tracking
- Community moderation tools

## API Endpoints Summary

### Core User APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/signup | User registration |
| POST | /api/auth/login | User login |
| GET | /api/user/profile | Get user profile |
| PUT | /api/user/profile | Update profile |
| GET | /api/user/car | Get car config |
| POST | /api/user/car | Update car |

### Social APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/friends | List friends |
| GET | /api/friends/search | Search by ID |
| POST | /api/friends/add | Add friend |
| DELETE | /api/friends/{id} | Remove friend |
| GET | /api/leaderboard | Rankings |

### Rewards APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/badges | All badges |
| GET | /api/offers | Nearby offers |
| GET | /api/challenges | Active challenges |
| POST | /api/challenges/{id}/accept | Join challenge |

### Navigation APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/routes | Saved routes |
| POST | /api/routes | Create route |
| GET | /api/locations | Saved locations |
| POST | /api/locations | Save location |

### Reports APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/reports | Nearby reports |
| POST | /api/reports | Create report |
| POST | /api/reports/{id}/upvote | Upvote report |
| GET | /api/reports/my | My reports |

## Notes
- All backend endpoints return mock data but follow real API structure
- Premium discount is 18%, Basic is 6%
- 160 badges across 8 categories
- Leaderboard supports state and time filtering
- Road reports expire after 24-48 hours
