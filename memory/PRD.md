# SnapRoad - Privacy-First Gamified Navigation App

## Product Overview
SnapRoad is a privacy-first navigation app with gamified safety rewards. The project consists of a web preview/prototype, React Native mobile app, and reference Flutter/Node.js code.

## Current Architecture
```
/app
├── backend/            # FastAPI server (Python) - Mock data
├── frontend/           # React Web App (TypeScript)
│   └── src/pages/
│       ├── WelcomePage.tsx      # Landing + Auth
│       ├── PartnerDashboard.tsx # Partner portal
│       ├── AdminDashboard.tsx   # Admin console
│       └── DriverApp/           # Full driver experience (27 components)
├── snaproad-mobile/    # React Native (Expo) - CONVERTED FROM FLUTTER ✅
│   └── src/screens/    # 10 screens matching Flutter UI
├── snaproad-beta/      # Reference code (Flutter, Node.js)
└── memory/             # Documentation
```

## Tech Stack
### Web
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + Recharts
- **Backend:** FastAPI (Python) with in-memory mock data
- **Maps:** OpenStreetMap/Carto dark tiles

### Mobile (React Native)
- **Framework:** Expo SDK 52
- **Navigation:** @react-navigation (Stack + Tabs)
- **State:** Zustand stores
- **UI:** Custom components + expo-linear-gradient
- **Icons:** @expo/vector-icons (Ionicons)

## Mobile App Screens (Flutter → React Native)
| Screen | Description | Status |
|--------|-------------|--------|
| SplashScreen | Animated logo with pulsing rings | ✅ |
| WelcomeScreen | 4-slide feature carousel | ✅ |
| PlanSelectionScreen | Basic/Premium selection | ✅ |
| CarSetupScreen | Vehicle type + color | ✅ |
| MapScreen | Placeholder map (Expo Go compatible) | ✅ |
| OffersScreen | Categorized offers with filters | ✅ |
| RewardsScreen | Challenges/Badges/Car Studio tabs | ✅ |
| ProfileScreen | Stats, trips, gas prices, settings | ✅ |
| OfferDetailScreen | Redemption flow with QR code | ✅ |
| LeaderboardScreen | Global/State/Friends rankings | ✅ |

## Web App Routes
- `/` - Welcome page with auth
- `/driver` - Full Driver App experience
- `/portal/partner` - Partner dashboard
- `/portal/admin-sr2025secure` - Admin console

## API Endpoints

### Working (Real)
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User authentication
- `POST /api/boosts/calculate` - Boost cost calculator
- `GET /api/admin/export/offers` - Export offers
- `GET /api/analytics/dashboard` - Business analytics

### Working (Mock Data)
- `GET /api/offers` - Mock offers list
- `POST /api/offers/{id}/redeem` - Mock redemption
- `GET /api/user/profile` - Mock user data

## ⚠️ MOCKED Components
- User data (gems, XP, level, safety score)
- Navigation (no real routing)
- Payments (no Stripe)
- Push notifications
- Database (in-memory only)

## Remaining Work

### High Priority
1. Connect mobile app to real backend APIs
2. Database Integration (Supabase/PostgreSQL)
3. Real Authentication (JWT)
4. Real Maps (Mapbox/Google Maps via EAS builds)

### Medium Priority
5. Stripe Payment Integration
6. Push Notifications (Firebase)
7. Email Service (SendGrid)

### Low Priority
8. Native iOS/Android builds via EAS
9. Performance optimization
10. Offline mode

## Development Commands

### Web App
```bash
# Frontend runs on port 3000
cd /app/frontend && yarn start

# Backend runs on port 8001
cd /app/backend && python server.py
```

### Mobile App
```bash
cd /app/snaproad-mobile
yarn install
yarn start  # Scan QR with Expo Go
```

## Changelog
- **Feb 16, 2026:** Converted Flutter UI to React Native (10 screens)
- **Feb 16, 2026:** Synced 27 components + 13 test files from GitHub repo
- **Feb 2026:** Initial web driver app with Partner/Admin dashboards

## Test Credentials
- No real auth - any email/password works for mock login
