# SnapRoad - Product Requirements Document

## Project Overview
SnapRoad is a privacy-first, gamified navigation app. The project consists of:
- **Web Frontend** (`/app/frontend`): React + Vite web application with full Driver App UI
- **New Figma UI** (`/app/frontend/src/components/figma-ui`): **COMPLETE** - Design system with 18+ screens for mobile, admin, and partner
- **Mobile App** (`/app/snaproad-mobile`): React Native (Expo) mobile application - **ARCHITECTURE ALIGNED**
- **Backend** (`/app/backend`): FastAPI server with comprehensive mocked endpoints
- **Reference Code** (`/app/snaproad-beta`): PostgreSQL schema and Flutter specs
- **UI Source** (`/app/snaproad-figma-ui`): Cloned Figma design system repository

---

## What Was Completed (Feb 18, 2025) - Latest Session

### Web Frontend Import Path Fixes
Fixed critical import path issues in the Figma UI components:
- Auth components (Welcome, Login, SignUp) were incorrectly importing from `../primitives/` instead of `../../primitives/`
- Updated `SnapRoadApp.tsx` and `index.ts` to import auth components from correct path `./mobile/auth/`
- **Testing Result: 100% pass rate (11/11 test cases)**

### Mobile App Architecture Alignment
Aligned the React Native mobile app with the web frontend architecture:

#### New Files Created:
1. **`/app/snaproad-mobile/src/types/index.ts`** - Comprehensive TypeScript types matching web frontend
2. **`/app/snaproad-mobile/src/services/api.ts`** - Full API service layer matching web (`/app/frontend/src/services/api.ts`)
3. **`/app/snaproad-mobile/src/screens/FuelDashboardScreen.tsx`** - Fuel tracking with eco score, charts, tips
4. **`/app/snaproad-mobile/src/screens/SettingsScreen.tsx`** - Full settings with toggles and navigation
5. **`/app/snaproad-mobile/src/screens/TripLogsScreen.tsx`** - Trip history with expandable cards
6. **`/app/snaproad-mobile/src/screens/FamilyScreen.tsx`** - Family member tracking and management

#### API Service Features:
- AsyncStorage token persistence
- Comprehensive endpoints matching web (auth, user, trips, family, rewards, etc.)
- Proper error handling and authentication headers

#### Navigation Updates:
- Added new screens to navigation stack
- Updated screen exports in index.ts

---

## Web Frontend Testing Results (Feb 18, 2025)

### Test Cases Passed (11/11 - 100%):
| Feature | Status |
|---------|--------|
| Welcome screen loads | PASS |
| Get Started → SignUp | PASS |
| Login navigation | PASS |
| Login tabs (User/Partner/Admin) | PASS |
| Sign In → Map | PASS |
| Map screen elements | PASS |
| Bottom nav visible | PASS |
| Gems tab navigation | PASS |
| Family tab navigation | PASS |
| Profile tab navigation | PASS |
| Admin Portal access | PASS |

---

## File Structure

```
/app
├── backend/
│   ├── server.py          # FastAPI with 80+ endpoints (MOCKED)
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── components/
│       │   └── figma-ui/      # Figma design system integration
│       │       ├── SnapRoadApp.tsx  # Main router
│       │       ├── mobile/
│       │       │   ├── auth/        # Welcome, Login, SignUp
│       │       │   ├── MapScreen.tsx
│       │       │   ├── Profile.tsx
│       │       │   ├── Gems.tsx
│       │       │   ├── Family.tsx
│       │       │   ├── FuelDashboard.tsx
│       │       │   ├── TripLogs.tsx
│       │       │   ├── Settings.tsx
│       │       │   └── Leaderboard.tsx
│       │       ├── admin/       # AdminLayout, Dashboard, Users
│       │       ├── partner/     # PartnerLayout, Dashboard
│       │       └── primitives/  # GradientButton, GemIcon
│       ├── services/
│       │   └── api.ts         # Shared API service layer
│       └── types/
│           └── api.ts         # TypeScript types
├── snaproad-mobile/           # React Native (Expo) app
│   ├── App.tsx
│   └── src/
│       ├── screens/           # All screens + new aligned ones
│       ├── services/
│       │   └── api.ts         # Aligned API service
│       ├── types/
│       │   └── index.ts       # Aligned TypeScript types
│       └── navigation/
│           └── index.tsx      # Updated with new screens
└── snaproad-figma-ui/         # Source UI repository
```

---

## Pending Tasks

### P0 - In Progress
- [ ] Complete mobile app testing and verification

### P1 - Backend Database Integration
- Connect FastAPI to MongoDB/PostgreSQL
- Migrate from mock data to real database queries
- Implement proper JWT authentication

### P2 - Mobile ↔ Backend Connection
- Connect all screens to live API endpoints
- Add offline support/caching
- Implement push notifications

### P3 - Additional Features
- Real map integration (Mapbox/Google Maps)
- Camera integration for photo reports
- Stripe payment integration for premium

---

## Test Credentials
- Email: `driver@snaproad.com`
- Password: `password123`

---

## API Endpoints (All Mocked)

### Core APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/signup | User registration |
| POST | /api/auth/login | User login |
| GET | /api/user/profile | Get user profile |
| GET | /api/user/stats | Get user statistics |
| GET | /api/trips | Get trip history |
| GET | /api/offers | Get available offers |
| GET | /api/badges | Get all badges |
| GET | /api/leaderboard | Get rankings |
| GET | /api/family/members | Get family members |

---

## Notes
- All backend endpoints return mock data but follow real API structure
- Web frontend accessible at: https://snaproad-preview-2.preview.emergentagent.com/app
- Mobile app requires Expo Go for testing
