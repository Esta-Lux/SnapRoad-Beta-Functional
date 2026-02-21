# SnapRoad - Product Requirements Document

## Product Overview
SnapRoad is a privacy-first, gamified navigation app with three parts:
1. **Driver App** - Mobile/web navigation app with safety scoring, gem rewards, and local offers
2. **Partner Portal** - Business dashboard for managing offers and viewing analytics
3. **Admin Dashboard** - System management, third-party offer imports, and bulk CSV uploads

## Tech Stack
- **Frontend**: React (Vite) web app at `/app/frontend`
- **Backend**: FastAPI at `/app/backend`
- **Mobile App**: React Native (Expo SDK 54) at `/app/snaproad-mobile`
- **Database**: MongoDB (currently using mocked in-memory data)

## AI Integrations
- **OpenAI GPT-5.2**: Orion AI Coach (uses Emergent LLM Key)
- **OpenAI Vision**: Photo Capture blurring (uses Emergent LLM Key)
- **Apple Maps MapKit**: Designated mapping technology (not yet implemented)

## Implemented Features

### Offer System (NEW - Feb 21, 2026)
- **Business Offers**: Partners create offers with address → pinned on map at location
- **Admin Third-Party Offers**: Groupon-style offers with `offer_url` field
- **Bulk CSV Upload**: Admin can upload offers via CSV (business_name, address, offer_url, description, type, gems)
- **In-App Browser**: Third-party offer links open inside the app (iframe), not external browser
- **Offer Redemption**: Users redeem offers → earn gems + get discount
- **Auto-Push on Route**: `GET /api/offers/on-route` returns offers within proximity of driver's active route
- **Offer Fields**: id, business_name, business_type, description, base_gems, address, lat, lng, offer_url, is_admin_offer, expires_at

### Gems on Route System (NEW - Feb 21, 2026)
- `POST /api/gems/generate-route` — generates ~8 gems along a route when navigation starts
- `POST /api/gems/collect` — collects a gem by driving over it (proximity check)
- `GET /api/gems/trip-summary/{trip_id}` — shows collected gems at trip end only (simple, not distracting)
- During driving: small gem counter in top-right corner
- At trip end: summary modal with gems collected, value earned, new balance

### Web Frontend (Stable)
- Landing page with premium UI
- Driver login/signup flow with onboarding
- Driver dashboard with map, offers, gems, family tabs
- Partner portal with offer creation (address-based), analytics, boosts
- Admin dashboard with bulk upload, offer management, user/partner management
- ESLint v10 configured with TypeScript support

### Mobile App (React Native - Complete Build)
- Expo SDK 54 with React Navigation v7
- 30+ screens: Navigation, Safety, Analytics, Rewards, Settings, Help
- Premium neon-blue theme design system
- `setup.sh` script for GitHub clone auto-configuration

### Key API Endpoints
| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/login` | POST | User authentication |
| `/api/offers` | GET | Get all offers with discount/gems |
| `/api/offers` | POST | Create new offer |
| `/api/offers/{id}/redeem` | POST | Redeem an offer |
| `/api/offers/nearby` | GET | Offers near a location |
| `/api/offers/on-route` | GET | Auto-push offers along route |
| `/api/admin/offers/bulk` | POST | Admin bulk upload (JSON) |
| `/api/admin/offers/bulk-csv` | POST | Admin bulk upload (CSV text) |
| `/api/gems/generate-route` | POST | Generate gems on route |
| `/api/gems/collect` | POST | Collect a gem |
| `/api/gems/trip-summary/{id}` | GET | Trip end gem summary |
| `/api/navigation/start` | POST | Start navigation |
| `/api/navigation/stop` | POST | Stop navigation |
| `/api/trips/history/detailed` | GET | Trip history (mocked) |
| `/api/health` | GET | Health check |

## Test Credentials
- Driver: `driver@snaproad.com` / `password123`
- Partner: `partner@snaproad.com` / `password123`
- Admin: `admin@snaproad.com` / `password123`
- Partner Portal: `/portal/partner` loads without auth
- Admin Dashboard: `/portal/admin` loads without auth

## What's MOCKED
- ALL trip data (in-memory, resets on restart)
- ALL partner/offer data (in-memory)
- User authentication (no real DB persistence)
- Gems on route (in-memory per trip)
- Geocoding (mock based on address hash)

## Backlog (Prioritized)

### P1 - Backend Database Integration
Replace mocked in-memory data with real MongoDB persistence for offers, gems, trips, users

### P2 - Future
- Apple Maps MapKit integration
- Gas Buddy / fuel price API
- Real geocoding API for address → lat/lng
- Push notifications for nearby offers
- Full mobile app parity with web features

---
Last Updated: February 21, 2026
