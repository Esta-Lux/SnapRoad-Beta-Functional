# SnapRoad - API & Integration Guide

## Last Updated: February 23, 2026

---

## OVERVIEW

This document details all third-party integrations, their costs, and scaling capabilities for SnapRoad.

---

## CORE INTEGRATIONS

### 1. SUPABASE (Database + Auth)

**Purpose:** Primary database and authentication
**Status:** Configured but tables not yet created (migration pending)

**Configuration:**
```
SUPABASE_URL=https://cuseezsdaqlbwlxnjsyr.supabase.co
SUPABASE_SECRET_KEY=sb_secret_bDhk_11DWjQBoRlfBUb8AQ_61U7NI_F
```

**Cost Analysis:**
| Tier | Price | Storage | Auth Users | Bandwidth |
|------|-------|---------|------------|-----------|
| Free | $0/mo | 500MB | Unlimited | 2GB |
| Pro | $25/mo | 8GB | Unlimited | 50GB |
| Team | $599/mo | 100GB | Unlimited | 200GB |

**For 100 users:** Free tier sufficient
**For 1000+ users:** Pro tier ($25/mo)
**For 10,000+ users:** Team tier ($599/mo)

**Migration Script:** `/app/backend/sql/supabase_migration.sql`

---

### 2. STRIPE (Payments)

**Purpose:** Subscription payments for Premium & Family plans
**Status:** ✅ FULLY INTEGRATED (Test Mode)

**Configuration:**
```
STRIPE_PUBLISHABLE_KEY=pk_test_51T1HkrDq0wX3q3xghD68Am7Ua75DdIfq88bN4AtaKkypqg208aLU1RcWDJQlTJ8yMBYM7swkcgkSCB1WmxKeLQ1i005BVyXVSG
STRIPE_API_KEY=sk_test_51T1HkrDq0wX3q3xglz6aUZrJHSeqV8ErgkPNZSqXS5aeyT8idf5m8hRbBapmIh8RVtZEtKOS4RxeKrXSbKclXWSw00hYbFfBrR
```

**Endpoints:**
- `GET /api/payments/plans` - List subscription plans
- `POST /api/payments/checkout/session` - Create checkout
- `GET /api/payments/checkout/status/{id}` - Verify payment
- `POST /api/payments/webhook/stripe` - Handle webhooks

**Cost:**
- 2.9% + $0.30 per successful transaction
- No monthly fees
- Volume discounts available at scale

**Plans Configured:**
| Plan | Price | Billing |
|------|-------|---------|
| Basic | Free | Forever |
| Premium | $10.99/mo | Monthly |
| Family | $14.99/mo | Monthly |

---

### 3. OPENSTREETMAP / LEAFLET (Maps - Web)

**Purpose:** Interactive maps for web preview
**Status:** ✅ FULLY INTEGRATED

**Implementation:** `/app/snaproad-mobile/src/components/WebMap.tsx`

**Cost:** FREE (Open source, no API key required)

**Tile Provider:** CartoDB Dark Theme
```
https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png
```

**Features:**
- Custom markers for offers
- User location tracking
- Pan and zoom controls

---

### 4. APPLE MAPKIT (Maps - iOS)

**Purpose:** Native iOS mapping
**Status:** 🟡 PLANNED (Not yet integrated)

**Why Apple MapKit:**
- Free for apps on App Store
- Native iOS integration
- No API costs
- Privacy-focused

**Cost:** FREE (included with Apple Developer Program $99/year)

**Integration Requirements:**
1. Apple Developer Account
2. MapKit JS token for web
3. Swift integration for native iOS

---

### 5. GASBUDDY API (Fuel Prices)

**Purpose:** Real-time gas station prices
**Status:** 🟡 PLANNED

**Implementation Plan:**
- Show nearby gas stations with live prices
- Price comparison by grade
- Historical price trends

**Cost:** Contact GasBuddy for API access
- Usually free for navigation apps
- May require partnership agreement

**Alternative (Free):**
- OpenStreetMap POI data for gas station locations
- Manual price entry by users (gamified with gems)

---

### 6. OPENAI / EMERGENT LLM (AI Features)

**Purpose:** Orion AI Coach, photo analysis
**Status:** ✅ CONFIGURED

**Uses Emergent LLM Key (Universal Key):**
- GPT-5.2 for chat/coaching
- Vision API for photo blur (faces/plates)

**Endpoints:**
- `POST /api/ai/orion/chat` - AI conversation
- `POST /api/ai/analyze-photo` - Photo processing

**Cost with Emergent Key:** Included in platform
**Direct OpenAI Cost:** ~$0.01 per 1K tokens

---

## BACKEND API STRUCTURE

### Authentication Routes (`/app/backend/routes/auth.py`)
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/verify
```

### User Routes (`/app/backend/routes/users.py`)
```
GET  /api/user/profile
PUT  /api/user/profile
GET  /api/user/car
POST /api/user/car
POST /api/user/plan
GET  /api/user/onboarding-status
```

### Offers Routes (`/app/backend/routes/offers.py`)
```
GET  /api/offers
GET  /api/offers/{id}
POST /api/offers/{id}/favorite
POST /api/offers/{id}/redeem
GET  /api/offers/personalized
```

### Gamification Routes (`/app/backend/routes/gamification.py`)
```
GET  /api/badges
GET  /api/skins
POST /api/skins/{id}/equip
POST /api/skins/{id}/purchase
GET  /api/challenges
POST /api/challenges/{id}/complete
GET  /api/leaderboard
```

### Navigation Routes (`/app/backend/routes/navigation.py`)
```
GET  /api/map/search
GET  /api/map/directions
GET  /api/locations
POST /api/locations
DELETE /api/locations/{id}
GET  /api/routes
POST /api/routes
DELETE /api/routes/{id}
```

### Trips Routes (`/app/backend/routes/trips.py`)
```
GET  /api/trips/history
POST /api/trips/start
POST /api/trips/end
GET  /api/analytics/trips
GET  /api/analytics/weekly
```

### Social Routes (`/app/backend/routes/social.py`)
```
GET  /api/friends
POST /api/friends/invite
POST /api/friends/{id}/accept
GET  /api/family/members
POST /api/family/{id}/call
POST /api/family/{id}/message
```

### Reports Routes (`/app/backend/routes/*)
```
GET  /api/reports/nearby
POST /api/reports
POST /api/reports/{id}/upvote
POST /api/incidents/report
```

### Payments Routes (`/app/backend/routes/payments.py`)
```
GET  /api/payments/plans
POST /api/payments/checkout/session
GET  /api/payments/checkout/status/{id}
POST /api/payments/webhook/stripe
GET  /api/payments/transactions
```

### Admin Routes (`/app/backend/routes/admin.py`)
```
GET  /api/admin/analytics
GET  /api/admin/users
GET  /api/admin/reports
```

### Partner Routes (`/app/backend/routes/partners.py`)
```
GET  /api/partner/profile
GET  /api/partner/offers
POST /api/partner/offers
GET  /api/partner/analytics
```

---

## COST PROJECTION FOR 100 USERS

| Service | Monthly Cost | Notes |
|---------|-------------|-------|
| Supabase | $0 | Free tier covers 100 users |
| Stripe | ~$30 | Assuming 10 premium subs @ $10.99 |
| Maps (OSM) | $0 | Free, open source |
| Apple MapKit | $0 | Free with Apple Developer |
| Hosting (Emergent) | Included | Platform hosting |
| OpenAI (via Emergent) | ~$5 | Light AI usage |
| **TOTAL** | **~$35/mo** | |

## COST PROJECTION FOR 1000 USERS

| Service | Monthly Cost | Notes |
|---------|-------------|-------|
| Supabase | $25 | Pro tier |
| Stripe | ~$300 | Assuming 100 premium subs |
| Maps (OSM) | $0 | Free |
| Apple MapKit | $0 | Free |
| Hosting | ~$50 | May need scaling |
| OpenAI | ~$50 | Medium AI usage |
| **TOTAL** | **~$425/mo** | |

---

## ENVIRONMENT VARIABLES

### Backend (`/app/backend/.env`)
```bash
# Database
SUPABASE_URL=https://cuseezsdaqlbwlxnjsyr.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...

# Payments
STRIPE_API_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# AI (Emergent LLM Key)
OPENAI_API_KEY=[use emergent_integrations_manager]

# Feature Flags
ENABLE_PREMIUM=true
ENABLE_AI_FEATURES=true
```

### Mobile (`/app/snaproad-mobile/.env`)
```bash
EXPO_PUBLIC_API_URL=https://privacy-first-app-3.preview.emergentagent.com
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_ENABLE_PREMIUM=true
EXPO_PUBLIC_ENABLE_CHALLENGES=true
```

---

## NEXT STEPS FOR PRODUCTION

1. **Run Supabase Migration**
   - Execute `/app/backend/sql/supabase_migration.sql` in Supabase SQL Editor
   - Replace mock data calls with real Supabase queries

2. **Switch Stripe to Live Mode**
   - Replace `sk_test_` with `sk_live_` keys
   - Set up webhook endpoint in Stripe Dashboard

3. **Configure Apple MapKit**
   - Generate MapKit JS token
   - Integrate with iOS native build

4. **Set up GasBuddy Partnership**
   - Contact GasBuddy for API access
   - Implement fuel price endpoints

5. **Configure Push Notifications**
   - Set up Expo Push Notification service
   - Create notification triggers for offers/alerts
