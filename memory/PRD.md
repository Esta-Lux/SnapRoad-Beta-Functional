# SnapRoad - Product Requirements Document

## Project Overview
SnapRoad is a privacy-first, gamified navigation app with:
- **Web Frontend** (`/app/frontend`): React + Vite web application
- **Mobile App** (`/app/snaproad-mobile`): React Native (Expo) - Architecture aligned
- **Backend** (`/app/backend`): FastAPI server with mocked endpoints

---

## What Was Completed (Feb 18, 2025) - Latest Session

### Complete Partner Portal with QR Redemption System

#### 1. QR Code Redemption System (`/app/frontend/src/components/figma-ui/partner/QRScanner.tsx`)
- **Browser-based QR scanner** for staff to validate customer offers
- Start Scanner / Upload Image controls
- Staff info bar showing logged-in user, role, and daily stats
- Real-time redemption feedback (success/error states)
- Recent redemptions list
- How to Scan instructions
- Important notice about customer proximity validation

#### 2. Multi-User Team Management with RBAC (`/app/frontend/src/components/figma-ui/partner/PartnerTeam.tsx`)
- **Three role types**: Owner, Manager, Staff
  - **Owner**: Full access - create offers, view analytics, manage team, billing access, scan & redeem
  - **Manager**: Can manage offers, view analytics, and redeem codes
  - **Staff**: Can only scan and redeem customer QR codes
- Team members table with role badges, status, last active, redemptions count
- Invite team member modal with two methods:
  - Email-based invitation (magic link)
  - Code-based invitation (shareable code)
- Roles Guide expandable section
- Quick action to open QR Scanner
- Revoke access and change role actions

#### 3. Business Referral System (`/app/frontend/src/components/figma-ui/partner/PartnerReferrals.tsx`)
- **$5 credit for every business referred** when they become active
- **Credit usage options**:
  - Subscription Discount - Apply credits to monthly bill
  - Offer Boosting - Get featured placement for more visibility
- Referral code and shareable link with copy functionality
- Referrals tracking table (Business, Email, Status, Credit Earned)
- Invite Business modal with email and personal message

#### 4. Customer Offer QR Flow (`/app/frontend/src/components/figma-ui/partner/CustomerOfferQR.tsx`)
- Customer purchases offer with gems
- QR code **unlocks only when near store** (geolocation check)
- Shows QR code for staff to scan when in proximity
- Proximity status: Checking, Near (shows QR), Far (shows directions)
- **Repeat purchase**: Same offer costs 50% less gems
- Purchase info (gems spent, date)

#### 5. Updated Partner Layout (`/app/frontend/src/components/figma-ui/partner/PartnerLayout.tsx`)
- **Removed Payouts** from navigation (no funds flowing through app)
- **Added new navigation items**:
  - Scan QR Code
  - Team Management
  - Referrals & Credits

---

## Previous Session Completions

### Orion AI Coach (`/app/frontend/src/components/figma-ui/mobile/OrionCoach.tsx`)
- Voice-enabled AI driving assistant
- Live driving tips (fuel saving, traffic, safety, rewards)
- Interactive chat with quick action buttons

### Photo Capture with Privacy Blur (`/app/frontend/src/components/figma-ui/mobile/PhotoCapture.tsx`)
- Camera/upload functionality for incident reporting
- Face and license plate detection (simulated AI)
- Automatic privacy blur toggle

### Admin Offer Management (`/app/frontend/src/components/figma-ui/admin/AdminOfferManagement.tsx`)
- Complete offer management interface
- Source URL field for offer verification
- Automatic gem pricing guide

### Automatic Gem Pricing System (`/app/frontend/src/lib/offer-pricing.ts`)
| Discount Tier | Free Users | Premium Users | Label |
|--------------|------------|---------------|-------|
| ≤ 10% off | 50 gems | 40 gems | Standard Offer |
| > 10% off | 80 gems | 65 gems | Premium Offer |
| Free Items | 100 gems | 80 gems | Exclusive Offer |

### Enhanced Driver Analytics (`/app/frontend/src/components/figma-ui/mobile/DriverAnalytics.tsx`)
- Premium analytics dashboard with safety score, driving behavior analysis

---

## File Structure

```
/app/frontend/src/
├── components/figma-ui/
│   ├── SnapRoadApp.tsx           # Main router (updated with Partner pages)
│   ├── mobile/
│   │   ├── OrionCoach.tsx
│   │   ├── PhotoCapture.tsx
│   │   ├── DriverAnalytics.tsx
│   │   └── ...
│   ├── admin/
│   │   ├── AdminLayout.tsx
│   │   ├── AdminOfferManagement.tsx
│   │   └── ...
│   └── partner/
│       ├── PartnerLayout.tsx         # Updated navigation
│       ├── PartnerDashboard.tsx
│       ├── PartnerOffers.tsx
│       ├── PartnerAnalyticsDetailed.tsx
│       ├── PartnerTeam.tsx           # NEW: Team management with RBAC
│       ├── PartnerReferrals.tsx      # NEW: Business referral system
│       ├── QRScanner.tsx             # NEW: Browser-based QR scanner
│       └── CustomerOfferQR.tsx       # NEW: Customer QR display component
├── lib/
│   └── offer-pricing.ts
└── services/
    └── api.ts
```

---

## Testing Results (Feb 18, 2025)

### Test Report: `/app/test_reports/iteration_24.json`
**Success Rate: 100% (All 11 features passed)**

| Feature | Status |
|---------|--------|
| Partner login flow | ✅ PASS |
| Partner Dashboard | ✅ PASS |
| QR Scanner page | ✅ PASS |
| Team Management with RBAC | ✅ PASS |
| Referrals & Credits | ✅ PASS |
| Sidebar navigation | ✅ PASS |
| Invite Business modal | ✅ PASS |
| Invite Team Member modal | ✅ PASS |
| Roles Guide | ✅ PASS |
| Partner Offers with gem pricing | ✅ PASS |
| Partner Analytics | ✅ PASS |

---

## Test Credentials
- **Driver:** `driver@snaproad.com` / `password123`
- **Admin:** `admin@snaproad.com` / `admin123`
- **Partner:** `partner@snaproad.com` / `password`

---

## Pending Tasks

### P1 - Mobile App Alignment
- Port Partner Portal features to React Native app
- Implement customer QR code display in mobile app

### P1 - Backend Integration
- Connect Partner Portal to real backend APIs
- Implement authentication and data persistence
- Store team members, referrals, redemptions in database

### P2 - Orion AI Coach & Photo Capture
- Build out placeholder components with real functionality
- Integrate camera access for mobile

### P2 - Backend Database Integration
- Connect FastAPI to MongoDB/PostgreSQL
- Replace mock data with real queries

### P3 - 3rd Party Integrations
- Stripe for payments/subscriptions
- Mapbox for real maps
- Geolocation API for proximity detection

---

## API Endpoints (All Mocked)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/signup | User registration |
| POST | /api/auth/login | User login |
| GET | /api/user/profile | Get user profile |
| GET | /api/offers | Get available offers |
| POST | /api/offers | Create offer (admin) |
| GET | /api/partner/offers | Partner's offers |
| POST | /api/partner/team | Invite team member |
| POST | /api/partner/redeem | Validate & redeem QR |
| GET | /api/partner/referrals | Get referrals |
| POST | /api/partner/referrals | Send referral invite |

---

## Notes
- **All backend endpoints return mock data**
- **Partner Portal data is client-side mocked**
- Web frontend: https://gem-offers-admin.preview.emergentagent.com/app
- All new features tested and working
