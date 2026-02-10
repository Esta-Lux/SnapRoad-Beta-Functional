# SnapRoad - Privacy-First Navigation App

## Product Overview
SnapRoad is a privacy-first navigation app with gamified safety rewards. Currently a web preview/prototype with plans for native iOS migration.

## Tech Stack
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + Recharts
- **Backend:** FastAPI (Python) with in-memory mock data
- **AI Integration:** Gemini Nano Banana (via Emergent LLM Key)
- **Maps:** Custom tile-based map using OpenStreetMap/Carto dark tiles
- **Target:** Native iOS (Swift/SwiftUI) - not yet migrated

## App Routes & URLs

### Driver App
- `/` - Welcome page (Driver only - Start Driving button)
- `/driver` - Driver mobile app experience with interactive map

### Business Portal (For Custom Domain)
- `/portal/partner` - Partner business dashboard

### Admin Console (SECRET)
- `/portal/admin-sr2025secure` - Admin console (direct link only)
- `/admin` → Redirects to home (not searchable)

## ✅ Completed Features (This Session)

### Interactive Map (NEW)
- Real OpenStreetMap tiles (Carto dark theme)
- Draggable/pannable map
- Zoom in/out controls
- User location marker (blue car icon)
- Glowing gem markers with discount percentages
- Click gem → Opens RedemptionPopup directly (FIXED)
- Recenter button

### Simplified Welcome Page (NEW)
- Driver-only authentication (no Partner/Admin in auth modal)
- "Business Portal" link moved to footer
- Clean, focused onboarding for drivers

### Improved RedemptionPopup (NEW)
- Cleaner two-step flow: Details → QR Code
- Clear discount and gems display
- In-range indicator
- 2-minute QR expiry countdown
- Navigate button
- No confusion with offers tab (FIXED)

### Premium Partner Dashboard
- Real-time analytics charts (Recharts)
- Boost system with pricing calculator
- AI image generation for offers
- 4-step onboarding walkthrough

### Premium Admin Dashboard
- Platform-wide analytics
- Create offers on behalf of businesses
- Export/Import functionality (JSON/CSV)
- AI image generation
- 4-step onboarding walkthrough

### Boost System
- Duration: $25/day base + $20/extra day
- Reach: $5 for 100 + $10 per 100 increment
- Full customization sliders

## 📋 API Endpoints

### Working (Real)
- `POST /api/boosts/calculate` - Calculate boost cost
- `POST /api/images/generate` - AI image generation
- `GET /api/admin/export/offers` - Export offers
- `GET /api/admin/export/users` - Export users
- `POST /api/admin/import/offers` - Import offers
- `GET /api/analytics/dashboard` - Business analytics

### Working (Mock Data)
- `GET /api/offers` - Mock offers
- `POST /api/offers/{id}/redeem` - Mock redemption
- `GET /api/user/profile` - Mock user data
- `POST /api/auth/login` - Session reset (mock auth)

## ⚠️ MOCKED DATA
- All user data (gems, XP, level, safety score)
- Navigation (no real routing)
- Offers (hardcoded mock data)
- Analytics (random generated data)
- Authentication (no real auth)
- Payments (no real transactions)

## 📄 Full Remaining Work
See `/app/memory/REMAINING_WORK.md` for comprehensive list of:
- Native iOS migration tasks
- All backend APIs needed
- Third-party integrations required
- Database schema
- Security requirements
- Testing requirements
- DevOps & deployment checklist

## Summary of What's NOT Functioning Yet

### Navigation
- No real turn-by-turn navigation
- No real routing (Mapbox/Google Maps needed)
- No real traffic data
- No ETA calculations

### Safety/Driving
- No real driving telemetry
- Safety score is mock (always 100)
- No hard brake detection
- No speeding detection

### Payments
- No Stripe integration
- Premium subscriptions are mock
- Boost payments are mock

### Authentication  
- No real JWT authentication
- No password hashing
- No email verification
- No 2FA

### Database
- All data is in-memory
- Lost on server restart
- No PostgreSQL/Redis setup

### Push Notifications
- No Firebase/APNs integration
- No real-time alerts

## Portal URLs
- **Partner Portal:** `yourdomain.com/portal/partner`
- **Admin Console:** `yourdomain.com/portal/admin-sr2025secure`

---

## ✅ Latest Updates (December 2025)

### UI Fixes & Improvements (LATEST)
- **Car Studio Unified:** Fixed inconsistency where hamburger menu and profile page opened different Car Studio components. Both now use the premium CarStudioNew component with 3D car preview, Paint Shop, and color selection.
- **App Tour:** Fixed scroll and close button (X), 7 tour steps now scrollable
- **Fuel Dashboard:** Added nearby gas prices from favorite stations (Shell $3.29, BP $3.35, Speedway $3.19 - MOCKED)
- **Car Studio:** Renamed "Skins" to "Car Studio" in Rewards tab, shows current vehicle and colors
- **Leaderboard:** Premium podium display for top 3 (gold/silver/bronze), time filters (All Time/Week/Month), state filter
- **Challenge Modal:** Fixed scrolling and close button

### UI Improvements - Premium Feel
- **Scrollable modals:** Car onboarding and Challenge modal now have proper scrolling
- **3D Car markers:** SVG-based 3D cars (sedan/SUV/truck) without white background circles
- **Improved onboarding:** 2-step flow: 1) Vehicle type, 2) Color selection
- **Hamburger menu:** Profile shows user's car icon instead of initials
- **Badge count:** Consistent X/160 format across all views
- **Map controls:** Pinch-to-zoom, drag-to-pan, Orion button, recenter button

### Map UI Cleanup
- **Fixed map tile rendering** - Tiles now display correctly with proper positioning
- **Map is draggable** - Mouse and touch drag support for panning
- **Gems spread out** - Only 5 gems shown, spread in a wider circle around user
- **Hidden scrollbars** - Global CSS to hide scrollbars for premium feel
- **3D car marker** - Shows actual car type (sedan/SUV/truck) without white background

### Map Search & Navigation
- **Backend endpoints:**
  - `GET /api/map/search?q=<query>&lat=<lat>&lng=<lng>` - Search locations with relevance scoring
  - `GET /api/map/directions` - Get mock turn-by-turn directions
- **Frontend features:**
  - Enhanced search modal with API integration
  - Turn-by-turn navigation UI panel

---
**Last Updated:** February 2026 (Car Studio Unification)

