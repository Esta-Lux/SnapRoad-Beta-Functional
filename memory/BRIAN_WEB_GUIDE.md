# SnapRoad Web/Integration Developer Guide
## For Brian (Web/Integration Lead)

> **Tech Stack**: React + TypeScript + Vite + Tailwind CSS + Shadcn/UI
> **Focus Areas**: Partner Dashboard, Stripe Flow, Offer CRUD, QR Scanning, Driver App
> **Maps**: Apple Maps MapKit JS via backend token (no Mapbox)
> **Current State**: UI complete with mock data - needs API integration

---

## Current Architecture

```
/app/frontend/src/
├── pages/
│   ├── WelcomePage.tsx            # Landing page
│   ├── PartnerDashboard.tsx       # Partner portal
│   ├── AdminDashboard.tsx         # Admin panel
│   └── DriverApp/
│       ├── index.tsx              # Driver app entry
│       └── components/
│           ├── TripAnalytics.tsx   # NEW: Trip analytics modal (3 tabs)
│           ├── RouteHistory3D.tsx  # NEW: 3D route visualization
│           ├── CollapsibleOffersPanel.tsx  # NEW: Map offers panel
│           ├── ShareTripScore.tsx
│           └── ...
├── features/snaproad/
│   └── components/
│       ├── driver/                # Driver-specific components
│       └── partner/               # Partner-specific components
├── components/
│   └── ui/                        # Shadcn/UI components
├── services/
│   └── partnerApi.ts              # Partner API service
└── App.tsx
```

---

## New Features Implemented (Review & Integrate)

### 1. Trip Analytics Modal (`TripAnalytics.tsx`)
- **3 tabs**: Trips, Savings, Stats
- **Date range filters**: 7/30/90 days
- **Backend**: `GET /api/trips/history/detailed?days=30` (mocked)
- **Your task**: Wire up to real API once Andrew migrates to MongoDB

### 2. Route History 3D (`RouteHistory3D.tsx`)
- Pseudo-3D interactive route map with drag rotation
- Color-coded routes by frequency
- **Backend**: `GET /api/routes/history-3d?days=90` (mocked)

### 3. Partner Offer Boosting
- Boost packages UI in Partner Dashboard
- **Backend endpoints** (all mocked, ready for Stripe):
  - `GET /api/partner/boosts/pricing` - Packages & prices
  - `POST /api/partner/boosts/create` - Purchase a boost
  - `GET /api/partner/boosts/active` - View active boosts
  - `POST /api/partner/credits/add` - Add credits

### 4. Collapsible Offers Panel
- Integrated into the driver map screen
- Expand/collapse/minimize modes
- Filter by business type

---

## Maps: Apple Maps MapKit (NOT Mapbox)

The web frontend currently uses **OpenStreetMap tiles via CartoDB** for the dark map. When we move to production:

**Option A (Current)**: Keep OpenStreetMap/CartoDB tiles for the web map display. Free, no API key needed.

**Option B (Future)**: Use Apple MapKit JS for the web map. Requires:
1. Backend generates a JWT token via `GET /api/maps/token`
2. Load MapKit JS: `<script src="https://cdn.apple.com/mapkitjs/5.x.x/mapkit.js">`
3. Initialize: `mapkit.init({ authorizationCallback: (done) => done(token) })`

**Important**: Do NOT use Mapbox. SnapRoad uses Apple Maps MapKit for all mapping.

---

## API Integration Checklist

When Andrew completes the MongoDB migration, update these frontend calls:

### Driver App
- [ ] `TripAnalytics.tsx` → Replace mock fetch with real API service
- [ ] `RouteHistory3D.tsx` → Replace mock fetch with real API service
- [ ] `CollapsibleOffersPanel.tsx` → Wire to real offers endpoint

### Partner Dashboard
- [ ] Boost creation → Connect to Stripe checkout
- [ ] Active boosts → Poll for status updates
- [ ] Credits → Connect to Stripe one-time payment

### Auth Flow
- [ ] Replace mock login with JWT auth
- [ ] Add token refresh logic
- [ ] Protect routes with auth guards

---

## Environment Variables

```env
VITE_API_URL=/api
REACT_APP_BACKEND_URL=https://your-domain.com
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx   # From PM
```

---

## Testing Credentials

- **Driver**: `driver@snaproad.com` / `password123`
- **Admin**: `admin@snaproad.com` / `admin123`
- **Partner**: `partner@snaproad.com` / `password`

---

## Quick API Test

```bash
# Test boost pricing
curl https://gamified-drive.preview.emergentagent.com/api/partner/boosts/pricing

# Test trip analytics
curl "https://gamified-drive.preview.emergentagent.com/api/trips/history/detailed?days=30"

# Test route history
curl "https://gamified-drive.preview.emergentagent.com/api/routes/history-3d?days=90"
```

---

**Questions? Coordinate with Andrew on API contracts.**
