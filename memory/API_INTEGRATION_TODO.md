# SnapRoad - Complete API Integration TODO List

> **Status**: UI Complete, Backend Mocked - Ready for Production API Integration
> **Last Updated**: February 2026

---

## 📊 Current State Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Web Frontend (React) | ✅ Complete | Partner & Admin dashboards functional |
| Mobile App (React Native) | ✅ Complete | All screens with mock data |
| Backend (FastAPI) | ⚠️ Mock | In-memory data, no persistence |
| Database | ❌ Not Connected | Need PostgreSQL/MongoDB |
| Authentication | ❌ Not Implemented | Using mock user |
| Payments | ❌ Not Implemented | Stripe integration needed |
| Maps API | ⚠️ Partial | Using OpenStreetMap tiles, no geocoding |
| Push Notifications | ❌ Not Implemented | Need FCM/APNs |

---

## 🔴 P0 - Critical (Must Have for Launch)

### 1. Database Integration
- [x] Choose database (PostgreSQL)
- [x] Set up database server (Supabase)
- [x] Create database schema (see `/app/memory/DEPLOYMENT_SCOPE.md`)
- [ ] Implement connection pooling
- [ ] Migrate mock data structures to database models
- [ ] Add database migrations system (Alembic for Python)

**Files to modify:**
- `/app/backend/server.py` - Replace in-memory dicts with DB queries
- `/app/backend/.env` - Add DATABASE_URL

**Tables needed:**
```
users, partners, partner_locations, offers, redemptions, 
badges, user_badges, challenges, challenge_participants, 
trips, boosts, analytics_events
```

---

### 2. User Authentication
- [ ] Choose auth provider (custom JWT)
- [ ] Implement user registration endpoint
- [ ] Implement user login endpoint
- [ ] Implement password reset flow
- [ ] Add JWT token generation and validation
- [ ] Implement refresh token rotation
- [ ] Add OAuth social login (Google, Apple for iOS)
- [ ] Protect all API endpoints with auth middleware
- [ ] Add role-based access (user, partner, admin)

**Files to modify:**
- `/app/backend/server.py` - Add auth middleware, login/register endpoints
- `/app/frontend/src/pages/WelcomePage.tsx` - Real login form
- `/app/snaproad-mobile/src/screens/` - Add LoginScreen.tsx

**New endpoints needed:**
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
POST /api/auth/forgot-password
POST /api/auth/reset-password
GET  /api/auth/me
```

---

### 3. Maps & Geocoding API (Apple Maps MapKit JS)
- [ ] Get Apple MapKit JS credentials from PM (Team ID, Key ID, .p8 private key)
- [ ] Create backend `/api/maps/token` endpoint to generate signed JWTs
- [ ] Implement address geocoding via Apple Maps Server API (address → lat/lng)
- [ ] Implement reverse geocoding via Apple Maps Server API (lat/lng → address)
- [ ] Implement place search via Apple Maps Server API
- [ ] Implement directions/routing via Apple Maps Server API
- [ ] Mobile app uses `react-native-maps` with `PROVIDER_DEFAULT` (Apple Maps on iOS)

**Files to modify:**
- `/app/backend/server.py` - Add `/api/maps/token` endpoint, proxy Apple Maps API
- `/app/backend/.env` - Add APPLE_MAPKIT_TEAM_ID, APPLE_MAPKIT_KEY_ID, APPLE_MAPKIT_PRIVATE_KEY
- `/app/snaproad-mobile/src/screens/MapScreen.tsx` - Use real MapView with Apple Maps

**Endpoints to create/update:**
```
GET /api/maps/token                     → Generate Apple MapKit JWT
GET /api/map/search?q={query}           → Proxy Apple Maps search
GET /api/map/directions?from=&to=       → Proxy Apple Maps directions
GET /api/map/reverse?lat=&lng=          → Proxy Apple Maps reverse geocode
```

---

### 4. Payment Processing (Stripe)
- [ ] Create Stripe account and get API keys
- [ ] Set up Stripe products for subscriptions:
  - Driver Premium: $4.99/month
  - Partner Starter: $20.99/month (founders) / $34.99/month
  - Partner Growth: $49.99/month (founders) / $79.99/month
  - Partner Enterprise: Custom
- [ ] Implement Stripe Customer creation
- [ ] Implement subscription management
- [ ] Implement one-time payments (boosts)
- [ ] Set up Stripe webhooks for payment events
- [ ] Add payment history/invoices endpoint
- [ ] Handle subscription cancellation/upgrade

**Files to modify:**
- `/app/backend/server.py` - Add Stripe integration
- `/app/backend/.env` - Add STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
- `/app/frontend/src/pages/PartnerDashboard.tsx` - Real payment flow

**New endpoints needed:**
```
POST /api/payments/create-checkout-session
POST /api/payments/create-portal-session
POST /api/payments/webhook  (Stripe webhook handler)
GET  /api/payments/subscription
POST /api/payments/cancel-subscription
```

---

## 🟠 P1 - Important (Should Have)

### 5. Real Offers System
- [ ] Replace mock offers with database-driven offers
- [ ] Implement offer CRUD with validation
- [ ] Add offer expiration handling (cron job or scheduled task)
- [ ] Implement geofenced offer discovery
- [ ] Add offer view/click tracking
- [ ] Implement QR code generation for redemptions
- [ ] Add QR verification with geofencing check

**Files to modify:**
- `/app/backend/server.py` - Update all `/api/offers/*` endpoints
- `/app/frontend/src/pages/DriverApp/` - Real offer redemption flow

**Endpoints to update:**
```
GET    /api/offers              → Query from DB with filters
GET    /api/offers/nearby       → Geospatial query
POST   /api/offers              → Insert to DB
POST   /api/offers/{id}/redeem  → Generate real QR, track
POST   /api/offers/{id}/verify  → Verify with geofence check
```

---

### 6. Gamification System
- [ ] Implement real XP calculation based on trips
- [ ] Calculate safety score from actual driving data
- [ ] Implement badge earning logic with triggers
- [ ] Add challenge creation and progress tracking
- [ ] Implement leaderboard with real rankings
- [ ] Add gems earning/spending with transaction log

**Files to modify:**
- `/app/backend/server.py` - Update gamification endpoints
- `/app/snaproad-mobile/src/store/index.ts` - Replace mock stores with API calls

**Endpoints to update:**
```
POST /api/xp/add                → Real XP calculation
GET  /api/badges                → From DB
POST /api/badges/{id}/claim     → With validation
GET  /api/challenges            → Active challenges from DB
POST /api/challenges/{id}/join  → Real participation
GET  /api/leaderboard           → Real rankings query
```

---

### 7. Trip Tracking & Analytics
- [ ] Implement trip start/end tracking
- [ ] Calculate trip distance and duration
- [ ] Compute safety score per trip
- [ ] Store trip history in database
- [ ] Calculate fuel savings based on actual gas prices
- [ ] Generate weekly/monthly recap data
- [ ] Implement analytics event tracking

**New endpoints needed:**
```
POST /api/trips/start           → Start tracking
POST /api/trips/end             → End and calculate stats
GET  /api/trips                 → Trip history
GET  /api/trips/{id}            → Trip details
GET  /api/analytics/recap       → Weekly/monthly stats
POST /api/analytics/event       → Track events
```

---

### 8. AI Image Generation
- [ ] Choose AI provider (OpenAI DALL-E, Stability AI, or Replicate)
- [ ] Get API keys and set up billing
- [ ] Implement image generation endpoint
- [ ] Add image storage (S3, Cloudinary, or local)
- [ ] Implement image caching to reduce costs

**Files to modify:**
- `/app/backend/server.py` - Update `/api/images/generate` (currently a stub)
- `/app/backend/.env` - Add OPENAI_API_KEY or STABILITY_API_KEY

---

## 🟡 P2 - Nice to Have

### 9. Push Notifications
- [ ] Set up Firebase Cloud Messaging (FCM)
- [ ] Implement device token registration
- [ ] Create notification types (offer alerts, challenge updates, etc.)
- [ ] Implement scheduled notifications
- [ ] Add notification preferences per user

**New endpoints:**
```
POST /api/notifications/register-device
POST /api/notifications/send
GET  /api/notifications/preferences
PUT  /api/notifications/preferences
```

---

### 10. Email Service
- [ ] Set up email provider (SendGrid, Postmark, or SES)
- [ ] Create email templates (welcome, password reset, receipts)
- [ ] Implement transactional emails
- [ ] Add email preferences

**New endpoints:**
```
POST /api/email/send
GET  /api/email/preferences
PUT  /api/email/preferences
```

---

### 11. Gas Price API
- [ ] Find gas price data provider (GasBuddy API, CollectAPI, or scraping)
- [ ] Implement real-time gas price fetching
- [ ] Cache prices with TTL
- [ ] Calculate actual fuel savings

**Files to modify:**
- `/app/backend/server.py` - Add real gas price endpoint
- `/app/snaproad-mobile/src/store/index.ts` - Update GasStationsStore

---

### 12. Real-time Features
- [ ] Implement WebSocket for live updates
- [ ] Add real-time leaderboard updates
- [ ] Implement live offer notifications
- [ ] Add real-time challenge progress

---

## 🔵 P3 - Future Enhancements

### 13. Advanced Features
- [ ] Implement friend system
- [ ] Add head-to-head challenges
- [ ] Create community events
- [ ] Add voice assistant integration (ElevenLabs)
- [ ] Implement road hazard reporting
- [ ] Add passenger mode

### 14. Admin Features
- [ ] Implement admin analytics dashboard
- [ ] Add user management tools
- [ ] Create offer moderation system
- [ ] Add partner verification flow

### 15. Partner Features
- [ ] Implement team management for partners
- [ ] Add advanced analytics
- [ ] Create offer performance insights
- [ ] Add competitor analysis tools

---

## 📁 Files Reference

### Backend Files to Modify
| File | What to Change |
|------|----------------|
| `/app/backend/server.py` | Replace all mock data with DB queries |
| `/app/backend/.env` | Add all API keys and DB connection |
| `/app/backend/requirements.txt` | Add new dependencies |

### Frontend Files to Modify (Web)
| File | What to Change |
|------|----------------|
| `/app/frontend/src/pages/WelcomePage.tsx` | Real auth flow |
| `/app/frontend/src/pages/DriverApp/index.tsx` | Real API calls |
| `/app/frontend/src/pages/PartnerDashboard.tsx` | Real payment flow |
| `/app/frontend/.env` | Update API URL for production |

### Mobile Files to Modify
| File | What to Change |
|------|----------------|
| `/app/snaproad-mobile/src/store/index.ts` | Replace mock stores with API |
| `/app/snaproad-mobile/src/screens/*.tsx` | Add loading states, error handling |
| Create: `/app/snaproad-mobile/src/services/api.ts` | API service layer |
| Create: `/app/snaproad-mobile/src/screens/LoginScreen.tsx` | Auth screens |

---

## 🔐 Required API Keys & Credentials

| Service | Purpose | Where to Get |
|---------|---------|--------------|
| Database | Data persistence | AWS RDS, Supabase, DigitalOcean |
| Auth0/Firebase | Authentication | auth0.com, firebase.google.com |
| Apple Maps MapKit JS | Maps & Navigation | developer.apple.com |
| Stripe | Payments | stripe.com |
| OpenAI/Stability | AI Images | platform.openai.com, stability.ai |
| SendGrid | Emails | sendgrid.com |
| Firebase | Push Notifications | firebase.google.com |

---

## 🧪 Testing Checklist

Before launching, ensure:
- [ ] All API endpoints have unit tests
- [ ] Integration tests for critical flows (auth, payments, redemptions)
- [ ] E2E tests for web dashboards
- [ ] Mobile app tested on iOS and Android devices
- [ ] Load testing for expected traffic
- [ ] Security audit (OWASP guidelines)
- [ ] Payment flow tested with Stripe test mode

---

## 📞 Support Resources

- **Deployment Guide**: `/app/memory/DEPLOYMENT_SCOPE.md`
- **Quick Reference**: `/app/memory/QUICK_REFERENCE.md`
- **Mobile README**: `/app/snaproad-mobile/README.md`
- **PRD**: `/app/memory/PRD.md`

---

## ⚡ Quick Start Commands

```bash
# Web Backend
cd /app/backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Web Frontend
cd /app/frontend
yarn install
yarn dev

# Mobile App
cd /app/snaproad-mobile
yarn install
yarn start
```

---

**Good luck with the integration! 🚀**
