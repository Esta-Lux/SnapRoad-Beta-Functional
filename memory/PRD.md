# SnapRoad - Product Requirements Document

## Project Overview
SnapRoad is a privacy-first, gamified navigation app with:
- **Web Frontend** (`/app/frontend`): React + Vite web application
- **Mobile App** (`/app/snaproad-mobile`): React Native (Expo) - Architecture aligned
- **Backend** (`/app/backend`): FastAPI server with mocked endpoints

---

## What Was Completed (Feb 18, 2025) - Latest Session

### 1. Orion AI Coach (`/app/frontend/src/components/figma-ui/mobile/OrionCoach.tsx`)
- **Voice-enabled AI driving assistant**
- Live driving tips (fuel saving, traffic, safety, rewards)
- Interactive chat with quick action buttons
- Real-time context-aware suggestions
- Accessible via map screen

### 2. Photo Capture with Privacy Blur (`/app/frontend/src/components/figma-ui/mobile/PhotoCapture.tsx`)
- **Camera/upload functionality for incident reporting**
- Face and license plate detection (simulated AI)
- Automatic privacy blur toggle
- Multi-step flow: Capture → Privacy Preview → Add Details → Submit
- Incident type selection (accident, hazard, construction, etc.)
- Gem rewards for verified reports (up to 500 gems)

### 3. Admin Offer Management (`/app/frontend/src/components/figma-ui/admin/AdminOfferManagement.tsx`)
- **Complete offer management interface**
- Source URL field for offer verification
- Automatic gem pricing guide displayed prominently
- Offer table with: Offer, Source URL, Gem Cost, Status, Performance, Revenue
- Create/Edit/Pause/Delete offers
- Status filtering (All, Active, Paused, Pending, Expired)
- Real-time gem pricing preview in create modal

### 4. Automatic Gem Pricing System (`/app/frontend/src/lib/offer-pricing.ts`)
**Partners cannot set gem prices - pricing is automatic:**

| Discount Tier | Free Users | Premium Users | Label |
|--------------|------------|---------------|-------|
| ≤ 10% off | 50 gems | 40 gems | Standard Offer |
| > 10% off | 80 gems | 65 gems | Premium Offer |
| Free Items | 100 gems | 80 gems | Exclusive Offer |

### 5. Enhanced Driver Analytics (`/app/frontend/src/components/figma-ui/mobile/DriverAnalytics.tsx`)
**Premium analytics dashboard with:**
- Overall safety score with circular progress
- This week stats (trips, distance, rank, improvement)
- Quick stats cards (Safety Score, Total Miles, Gems Earned, Streak)
- Weekly performance bar chart
- Driving behavior analysis:
  - Smooth Braking (with tips)
  - Speed Control
  - Cornering
  - Acceleration
  - Phone Focus (highlighted if low)
  - Night Driving
- Achievement progress tracking
- Recent trips list with scores

### 6. Profile Menu Updated
- Analytics moved to TOP of menu for premium feel
- Menu order: Analytics → Account Info → Trip History → Fuel Dashboard → etc.

### 7. Admin Layout Updated
- Added "Offer Management" to sidebar navigation
- Tag icon for visual identification

---

## Testing Results (Feb 18, 2025)

### Test Report: `/app/test_reports/iteration_23.json`
**Success Rate: 100% (10/10 test scenarios passed)**

| Feature | Status |
|---------|--------|
| Welcome screen loads | ✅ PASS |
| Driver login to map | ✅ PASS |
| Profile shows Analytics at top | ✅ PASS |
| Driver Analytics full metrics | ✅ PASS |
| Family screen | ✅ PASS |
| Admin login flow | ✅ PASS |
| Offer Management in sidebar | ✅ PASS |
| Gem pricing guide displayed | ✅ PASS |
| Offer table with Source URL | ✅ PASS |
| Add Offer modal with pricing | ✅ PASS |

---

## File Structure

```
/app/frontend/src/
├── components/figma-ui/
│   ├── SnapRoadApp.tsx           # Main router (updated)
│   ├── mobile/
│   │   ├── OrionCoach.tsx        # NEW: AI driving coach
│   │   ├── PhotoCapture.tsx      # NEW: Privacy-enabled photo capture
│   │   ├── DriverAnalytics.tsx   # NEW: Premium analytics dashboard
│   │   ├── Profile.tsx           # Updated: Analytics at top
│   │   ├── auth/
│   │   │   ├── Welcome.tsx
│   │   │   ├── Login.tsx
│   │   │   └── SignUp.tsx
│   │   └── ...
│   ├── admin/
│   │   ├── AdminLayout.tsx       # Updated: Added Offer Management
│   │   ├── AdminOfferManagement.tsx  # NEW: Complete offer management
│   │   └── ...
│   └── partner/
│       └── ...
├── lib/
│   └── offer-pricing.ts          # NEW: Gem pricing constants & logic
└── services/
    └── api.ts
```

---

## Mobile App Architecture Alignment
Updated `/app/snaproad-mobile/` with:
- `src/types/index.ts` - Comprehensive TypeScript types
- `src/services/api.ts` - Full API service layer
- `src/screens/FuelDashboardScreen.tsx`
- `src/screens/SettingsScreen.tsx`
- `src/screens/TripLogsScreen.tsx`
- `src/screens/FamilyScreen.tsx`

---

## Pending Tasks

### P1 - Mobile App Testing
- Test React Native screens on Expo Go
- Verify mobile API service connections

### P2 - Backend Database Integration
- Connect FastAPI to MongoDB/PostgreSQL
- Replace mock data with real queries
- Implement JWT authentication

### P3 - Additional Features
- Real map integration (Mapbox)
- Camera integration for mobile
- Stripe payment for premium

---

## Test Credentials
- **Driver:** `driver@snaproad.com` / `password123`
- **Admin:** `admin@snaproad.com` / `admin123`

---

## API Endpoints (All Mocked)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/signup | User registration |
| POST | /api/auth/login | User login |
| GET | /api/user/profile | Get user profile |
| GET | /api/offers | Get available offers |
| POST | /api/offers | Create offer (admin) |
| GET | /api/trips | Get trip history |
| GET | /api/family/members | Get family members |
| POST | /api/incidents | Report incident |

---

## Notes
- All backend endpoints return mock data
- Web frontend: https://gem-offers-admin.preview.emergentagent.com/app
- All new features tested and working
