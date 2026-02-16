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
├── snaproad-mobile/    # React Native (Expo) - COMPLETE DRIVER APP ✅
│   └── src/screens/
│       └── DriverApp.tsx        # Complete app (63KB, all screens)
├── snaproad-beta/      # Reference code (Flutter, Node.js)
└── memory/             # Documentation
```

## Tech Stack
### Web
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + Recharts
- **Backend:** FastAPI (Python) with in-memory mock data
- **Maps:** OpenStreetMap/Carto dark tiles

### Mobile (React Native)
- **Framework:** Expo SDK 50
- **Entry:** `App.tsx` → `DriverApp.tsx`
- **UI:** Custom components + expo-linear-gradient
- **Icons:** @expo/vector-icons (Ionicons)

## Mobile App Screens (Complete Implementation)

### Onboarding
| Screen | Description | Status |
|--------|-------------|--------|
| PlanSelectionScreen | Basic/Premium with pricing | ✅ |
| CarOnboardingScreen | Vehicle type + color | ✅ |

### Main App (4 Tabs)
| Tab | Sub-tabs | Features |
|-----|----------|----------|
| Map | - | Location buttons, quick locations, offer markers, Orion voice |
| Routes | - | Saved routes, add new route |
| Rewards | Offers, Challenges, Badges, Car Studio | Full reward system |
| Profile | Overview, Score, Fuel, Settings | User stats & settings |

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

### Working (Mock Data)
- `GET /api/offers` - Mock offers list
- `POST /api/offers/{id}/redeem` - Mock redemption
- `GET /api/user/profile` - Mock user data

## ⚠️ MOCKED Components
- User data (gems, XP, level, safety score)
- Navigation (no real routing)
- Payments (no Stripe)
- Database (in-memory only)

## Mobile App Design System

### Colors
```typescript
primary: '#0EA5E9'     // Sky blue
accent: '#D946EF'      // Fuchsia  
success: '#22C55E'     // Green
background: '#0F172A'  // Dark slate
surface: '#1E293B'     // Lighter slate
```

### UI Components
- Custom gradient tab bar
- Side menu navigation
- Offer cards with discount badges
- Challenge progress bars
- Plan selection cards

## Remaining Work

### High Priority
1. Connect mobile app to real backend APIs
2. Real Maps integration (Mapbox via EAS builds)
3. Database Integration (Supabase/PostgreSQL)

### Medium Priority
4. Real Authentication (JWT)
5. Push Notifications (Firebase)
6. Stripe Payment Integration

### Low Priority
7. Native iOS/Android builds via EAS
8. Performance optimization
9. Offline mode

## Development Commands

### Web App
```bash
cd /app/frontend && yarn start  # Port 3000
cd /app/backend && python server.py  # Port 8001
```

### Mobile App
```bash
cd /app/snaproad-mobile
yarn install
yarn start  # Scan QR with Expo Go
```

## Changelog
- **Feb 16, 2026:** Complete rebuild of React Native app to match web UI
- **Feb 16, 2026:** Synced web driver app components from GitHub
- **Feb 2026:** Initial web driver app with Partner/Admin dashboards

## Test Credentials
- No real auth - any email/password works for mock login
