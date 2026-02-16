# SnapRoad - Privacy-First Gamified Navigation App

## Product Overview
SnapRoad is a privacy-first navigation app with gamified safety rewards. The project consists of a web preview/prototype with plans for native iOS migration, plus React Native mobile app scaffolding.

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
├── snaproad-mobile/    # React Native (Expo) - UI scaffolding
├── snaproad-beta/      # Reference code (Flutter, Node.js)
└── memory/             # Documentation
```

## Tech Stack
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + Recharts
- **Backend:** FastAPI (Python) with in-memory mock data
- **Mobile:** React Native (Expo) - UI only with Zustand stores
- **Maps:** OpenStreetMap/Carto dark tiles

## App Routes
- `/` - Welcome page with auth
- `/driver` - Full Driver App experience
- `/portal/partner` - Partner dashboard
- `/portal/admin-sr2025secure` - Admin console (secret)

## Completed Features

### Driver App (Web)
- ✅ Plan Selection (Basic/Premium)
- ✅ Interactive Map with gems/offers
- ✅ Car customization (Car Studio, 3D cars)
- ✅ Orion Voice Assistant
- ✅ Leaderboard with rankings
- ✅ Badges & Challenges system
- ✅ Road Reports & Status overlay
- ✅ Fuel Tracker with gas prices
- ✅ Weekly Recap & Trip History
- ✅ QR Redemption popup
- ✅ Friends Hub
- ✅ Notification Settings
- ✅ Help & Support

### Partner Dashboard
- ✅ Real-time analytics
- ✅ Boost system with pricing
- ✅ AI image generation for offers
- ✅ Location management (multi-store)

### Admin Dashboard
- ✅ Platform analytics
- ✅ Export/Import (JSON/CSV)
- ✅ Create offers for businesses

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
1. Database Integration (Supabase/PostgreSQL)
2. Real Authentication (JWT)
3. Stripe Payment Integration
4. Real Maps/Navigation (Mapbox)

### Medium Priority
5. Push Notifications (Firebase)
6. Email Service (SendGrid)
7. Real Analytics

### Low Priority
8. Native iOS Migration
9. Android Build
10. Performance optimization

## Sync History
- **Feb 16, 2026:** Synced 27 components + 13 test files from `SnapRoad/SnapRoad-Functional`

## Test Credentials
- No real auth - any email/password works for mock login
