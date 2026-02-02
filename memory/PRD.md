# SnapRoad - Privacy-First Navigation App

## Product Overview
SnapRoad is a privacy-first navigation app with gamified safety rewards. The app features an iPhone 16-optimized driver interface, a comprehensive backend API, and admin/business dashboards.

## Tech Stack
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Backend:** FastAPI (Python) with in-memory mock data
- **Database Schema:** PostgreSQL (documented, not connected)

## Architecture
```
/app
├── snaproad-beta/          # Main monorepo for GitHub
│   ├── api/                # Node.js backend (placeholders)
│   ├── admin/              # React admin panel (synced from /app/frontend)
│   ├── mobile/             # Flutter app (placeholders)
│   └── database/           # PostgreSQL schema
├── frontend/               # Working React app for live preview
│   └── src/pages/DriverApp/index.tsx  # Main driver app UI
└── backend/                # FastAPI backend (active)
    └── server.py           # 25+ API endpoints
```

## Completed Features (Feb 2, 2025)

### Driver App UI (iPhone 16 Simulation)
- ✅ Clean, simplified map page with minimal clutter
- ✅ Swipeable Home/Work/Favorites location tabs with dot indicators
- ✅ Draggable and collapsible map widgets (Score, Gems)
- ✅ Widget settings modal to toggle visibility
- ✅ Functional hamburger menu with navigation, rewards, and settings
- ✅ Search modal for destination input
- ✅ Notifications modal

### Backend API Endpoints (All Working)
- ✅ User: `/api/user/profile`, `/api/user/stats`
- ✅ Locations: CRUD operations for saved places
- ✅ Routes: CRUD + toggle active/notifications
- ✅ Navigation: start, stop, voice-command
- ✅ Widgets: get settings, toggle visibility, collapse, position
- ✅ Offers: filter by type, redeem, favorite
- ✅ Incidents: report, get my reports
- ✅ Family: get members, call, message, share location
- ✅ Badges & Skins: get, equip, purchase
- ✅ Settings: voice, notifications

### UI Tabs Implemented
1. **Map Tab** - Main navigation with widgets, location panel, action buttons
2. **Offers Tab** - Filter offers by type, savings card, offer detail modal
3. **Routes Tab** - My saved routes with details, add/delete/toggle
4. **Engagement Tab** - Badges, Skins, Challenges, Reports sub-tabs
5. **Profile Tab** - Overview, Score breakdown, Fuel (premium), Settings

## Testing Status
- **Backend:** 97% pass rate (37/38 tests)
- **Frontend:** 100% working (all tabs and features)
- **Test Report:** `/app/test_reports/iteration_2.json`

## MOCKED DATA NOTE
⚠️ All data is currently MOCKED using in-memory storage in the backend. No database or external services are connected yet.

## Upcoming Tasks (P0)
1. Connect PostgreSQL database for persistent storage
2. Implement real authentication (Supabase/Firebase)
3. Integrate Mapbox for real map data

## Future Tasks (P1-P2)
- Integrate Stripe for payments
- Connect Firebase Cloud Messaging (FCM) for push notifications
- Build Flutter mobile app based on React prototype
- Implement Phase 2: Family tracking/monitoring, AI coaching
- Implement Phase 3: Multi-region support, analytics dashboards

## Test Credentials
- Driver App: No login required, `/driver` route
- Admin Panel: `admin@snaproad.co` / `admin123`

## API Base URL
- Preview: `https://snaproad-preview.preview.emergentagent.com`
- Local: `http://localhost:8001`
