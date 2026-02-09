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
**Last Updated:** December 2025
