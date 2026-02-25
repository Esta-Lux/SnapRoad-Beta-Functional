# SnapRoad - Complete Deployment & Implementation Scope

## 📋 Table of Contents
1. [Current State Overview](#current-state-overview)
2. [Application URLs & Routes](#application-urls--routes)
3. [API Endpoints Reference](#api-endpoints-reference)
4. [Production Requirements](#production-requirements)
5. [Database Schema](#database-schema)
6. [Third-Party Integrations](#third-party-integrations)
7. [Environment Variables](#environment-variables)
8. [Deployment Checklist](#deployment-checklist)
9. [Security Considerations](#security-considerations)
10. [Testing & QA](#testing--qa)

---

## 🎯 Current State Overview

### What's Built (Frontend - React/TypeScript)
| Component | Status | Description |
|-----------|--------|-------------|
| Welcome Page | ✅ Complete | Landing page with "Start Driving" CTA |
| Driver App | ✅ Complete | Full mobile app simulation with map, offers, gamification |
| Partner Dashboard | ✅ Complete | Business portal with analytics, offers, locations, boosts |
| Admin Dashboard | ✅ Complete | Platform management, user/partner/offer management |
| Interactive Map | ✅ Complete | OpenStreetMap tiles, pan/zoom, offer gems |
| Gamification System | ✅ Complete | XP, levels, badges, challenges, leaderboard |
| Onboarding Flow | ✅ Complete | Plan selection, car customization, app tour |

### What's Built (Backend - FastAPI/Python)
| Feature | Status | Description |
|---------|--------|-------------|
| User Management | ⚠️ Mock | In-memory user data, no persistence |
| Offers CRUD | ⚠️ Mock | In-memory offers, no database |
| Partner Locations | ⚠️ Mock | Location management with plan limits |
| Analytics | ⚠️ Mock | Random/fake analytics data |
| Gamification | ⚠️ Mock | XP, badges, challenges all mocked |
| Map Search | ⚠️ Mock | Hardcoded Columbus, OH locations |
| Image Generation | 🔧 Stub | Ready for AI provider integration |

### What Needs Production Implementation
| Feature | Priority | Effort | Description |
|---------|----------|--------|-------------|
| Database Integration | P0 | 2-3 days | PostgreSQL/MongoDB for all data |
| Authentication | P0 | 2-3 days | JWT + OAuth (Auth0/Firebase) |
| Real Maps API | P0 | 1-2 days | Apple Maps MapKit JS for geocoding, routing |
| Payment Processing | P1 | 2-3 days | Stripe for subscriptions & boosts |
| AI Image Generation | P1 | 1 day | OpenAI DALL-E or Stability AI |
| Push Notifications | P2 | 1-2 days | Firebase Cloud Messaging |
| Email Service | P2 | 1 day | SendGrid/Postmark for transactional emails |
| Real-time Updates | P2 | 2-3 days | WebSocket for live leaderboard, offers |
| Gas Price API | P2 | 1 day | GasBuddy API or similar |
| Native iOS App | P3 | 4-8 weeks | Swift/SwiftUI migration |

---

## 🌐 Application URLs & Routes

### Driver App (Public)
```
/                    → Welcome Page (Start Driving button)
/driver              → Main Driver App (map, offers, profile)
```

### Partner Portal (Business Users)
```
/partner             → Partner Dashboard (requires partner auth)
/portal/partner      → Alternative partner portal route
```

### Admin Console (Internal Only)
```
/admin                           → Redirects to home (hidden)
/portal/admin-sr2025secure       → Admin Dashboard (SECRET URL)
```

**⚠️ SECURITY NOTE:** Change the admin URL before production deployment!

---

## 🔌 API Endpoints Reference

### User & Authentication
```
POST   /api/session/reset              → Reset user to fresh state (dev only)
GET    /api/user                       → Get current user profile
POST   /api/user/plan                  → Update user plan (basic/premium)
POST   /api/user/car                   → Update user car selection
GET    /api/user/onboarding-status     → Check onboarding completion
```

### Offers & Redemption
```
GET    /api/offers                     → List all offers (with filters)
GET    /api/offers/nearby              → Get offers near location
POST   /api/offers                     → Create new offer
POST   /api/offers/{id}/redeem         → Redeem an offer (generates QR)
POST   /api/offers/{id}/verify-qr      → Verify QR code at business
```

### Gamification
```
GET    /api/leaderboard               → Get leaderboard (with filters)
GET    /api/badges                    → Get all available badges
GET    /api/badges/earned             → Get user's earned badges
POST   /api/badges/{id}/claim         → Claim a badge
GET    /api/challenges                → Get active challenges
POST   /api/challenges/{id}/join      → Join a challenge
POST   /api/xp/add                    → Add XP to user
```

### Partner APIs
```
GET    /api/partner/plans             → Get available partner plans
GET    /api/partner/profile           → Get partner profile & locations
POST   /api/partner/plan              → Update partner plan
GET    /api/partner/locations         → List partner locations
POST   /api/partner/locations         → Add new location
PUT    /api/partner/locations/{id}    → Update location
DELETE /api/partner/locations/{id}    → Delete location
POST   /api/partner/offers            → Create offer at location
GET    /api/partner/offers            → List partner's offers
```

### Analytics
```
GET    /api/analytics/dashboard       → Get analytics dashboard data
POST   /api/analytics/event           → Track analytics event
```

### Boosts
```
POST   /api/boosts                    → Create offer boost
GET    /api/boosts                    → List boosts (by business)
```

### Admin APIs
```
POST   /api/admin/offers/create       → Create offer on behalf of business
GET    /api/admin/export/offers       → Export offers (JSON/CSV)
GET    /api/admin/export/users        → Export users (JSON/CSV)
POST   /api/admin/import/offers       → Import offers from JSON
GET    /api/admin/analytics           → Platform-wide analytics
```

### Map & Navigation
```
GET    /api/map/search                → Search locations (autocomplete)
GET    /api/map/directions            → Get turn-by-turn directions
```

### Images
```
POST   /api/images/generate           → Generate AI image (stub)
GET    /api/images/{id}               → Get generated image
```

---

## 🗄️ Database Schema

### Profiles Collection/Table
```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    plan VARCHAR(20) DEFAULT 'basic', -- basic, premium
    
    -- Gamification
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    gems INTEGER DEFAULT 100,
    safety_score INTEGER DEFAULT 85,
    
    -- Car Selection
    car_category VARCHAR(50) DEFAULT 'sedan',
    car_variant VARCHAR(50) DEFAULT 'sedan-classic',
    car_color VARCHAR(50) DEFAULT 'ocean-blue',
    
    -- Stats
    total_miles DECIMAL(10,2) DEFAULT 0,
    total_trips INTEGER DEFAULT 0,
    total_savings DECIMAL(10,2) DEFAULT 0,
    
    -- Location
    state VARCHAR(50),
    city VARCHAR(100),
    
    -- Flags
    onboarding_complete BOOLEAN DEFAULT false,
    is_premium BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Partners Collection/Table
```sql
CREATE TABLE partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    business_type VARCHAR(50), -- gas, cafe, restaurant, etc.
    
    plan VARCHAR(20) DEFAULT 'starter', -- starter, growth, enterprise
    is_founders BOOLEAN DEFAULT false,
    
    stripe_customer_id VARCHAR(255),
    subscription_status VARCHAR(20),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Partner Locations
```sql
CREATE TABLE partner_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    lat DECIMAL(10,8) NOT NULL,
    lng DECIMAL(11,8) NOT NULL,
    
    is_primary BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Offers
```sql
CREATE TABLE offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES partners(id),
    location_id UUID REFERENCES partner_locations(id),
    
    title VARCHAR(255) NOT NULL,
    description TEXT,
    business_name VARCHAR(255),
    business_type VARCHAR(50),
    
    discount_percent INTEGER,
    base_gems INTEGER DEFAULT 25,
    
    lat DECIMAL(10,8) NOT NULL,
    lng DECIMAL(11,8) NOT NULL,
    
    status VARCHAR(20) DEFAULT 'active', -- active, paused, expired
    
    redemption_count INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    
    image_url TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    created_by VARCHAR(50) -- partner, admin
);
```

### Redemptions
```sql
CREATE TABLE redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id UUID REFERENCES offers(id),
    profile_id UUID REFERENCES profiles(id),
    
    qr_code VARCHAR(255) UNIQUE NOT NULL,
    qr_expires_at TIMESTAMP NOT NULL,
    
    status VARCHAR(20) DEFAULT 'pending', -- pending, verified, expired
    gems_earned INTEGER,
    discount_applied INTEGER,
    
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Badges
```sql
CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    category VARCHAR(50), -- driving, social, exploration, safety
    
    requirement_type VARCHAR(50), -- trips, miles, score, streak, etc.
    requirement_value INTEGER,
    
    xp_reward INTEGER DEFAULT 50,
    gems_reward INTEGER DEFAULT 0,
    
    rarity VARCHAR(20) DEFAULT 'common' -- common, rare, epic, legendary
);

CREATE TABLE profile_badges (
    profile_id UUID REFERENCES profiles(id),
    badge_id UUID REFERENCES badges(id),
    earned_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (profile_id, badge_id)
);
```

### Challenges
```sql
CREATE TABLE challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    type VARCHAR(50), -- weekly, head_to_head, community
    
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    
    goal_type VARCHAR(50), -- miles, trips, score, etc.
    goal_value INTEGER,
    
    reward_xp INTEGER,
    reward_gems INTEGER,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE challenge_participants (
    challenge_id UUID REFERENCES challenges(id),
    profile_id UUID REFERENCES profiles(id),
    
    progress INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT false,
    
    joined_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (challenge_id, profile_id)
);
```

### Boosts
```sql
CREATE TABLE boosts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id UUID REFERENCES offers(id),
    partner_id UUID REFERENCES partners(id),
    
    budget DECIMAL(10,2) NOT NULL,
    duration_days INTEGER NOT NULL,
    target_radius_miles INTEGER,
    
    status VARCHAR(20) DEFAULT 'active',
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    
    started_at TIMESTAMP DEFAULT NOW(),
    ends_at TIMESTAMP
);
```

---

## 🔗 Third-Party Integrations

### Required for Production

#### 1. Database
**Options:**
- PostgreSQL (recommended for relational data)
- MongoDB (if preferring document-based)
- Supabase (PostgreSQL + Auth + Realtime)

#### 2. Authentication
**Options:**
- Auth0 (recommended - easy OAuth + JWT)
- Firebase Auth
- Supabase Auth
- Custom JWT (more work, full control)

#### 3. Maps & Geocoding
**Decision: Apple Maps MapKit JS**
- Free with Apple Developer Program ($99/year)
- 250K service calls/day included
- Backend generates JWT tokens for API access

**Required APIs (via Apple Maps Server API):**
- Geocoding (address → lat/lng)
- Reverse Geocoding (lat/lng → address)
- Directions/Routing
- Place Autocomplete

#### 4. Payments
**Stripe (recommended)**
```
Products needed:
- Driver Premium: $4.99/month subscription
- Partner Starter: $20.99/month subscription
- Partner Growth: $49.99/month subscription
- Partner Enterprise: Custom pricing
- Boost payments: One-time charges
```

### Optional Integrations

#### 5. AI Image Generation
**Options:**
- OpenAI DALL-E 3 (~$0.04/image)
- Stability AI (~$0.002/image)
- Replicate (various models)

#### 6. Push Notifications
- Firebase Cloud Messaging (FCM)
- OneSignal
- Expo Push (for React Native)

#### 7. Email Service
- SendGrid
- Postmark
- Amazon SES

#### 8. Gas Prices API
- GasBuddy API
- Gas Price API (collectapi.com)
- Custom scraping solution

#### 9. Analytics
- Mixpanel
- Amplitude
- Google Analytics 4
- PostHog (open source)

#### 10. Error Monitoring
- Sentry (recommended)
- Bugsnag
- LogRocket

---

## 🔐 Environment Variables

### Backend (.env)
```bash
# Server
PORT=8001
ENVIRONMENT=production

# Database
DATABASE_URL=postgresql://user:pass@host:5432/snaproad
# OR
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/snaproad

# Authentication
JWT_SECRET=your-256-bit-secret-key-here
JWT_EXPIRY_HOURS=24

# OAuth (if using Auth0)
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_API_AUDIENCE=https://api.snaproad.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret

# Maps (Apple MapKit JS)
APPLE_MAPKIT_TEAM_ID=your-team-id
APPLE_MAPKIT_KEY_ID=your-key-id
APPLE_MAPKIT_PRIVATE_KEY=your-p8-private-key-contents

# Payments
STRIPE_SECRET_KEY=sk_live_your-stripe-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# AI Image Generation (choose one)
OPENAI_API_KEY=sk-your-openai-key
# OR
STABILITY_API_KEY=sk-your-stability-key

# Email
SENDGRID_API_KEY=SG.your-sendgrid-key
FROM_EMAIL=noreply@snaproad.com

# Push Notifications
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key

# Gas Prices
GAS_PRICE_API_KEY=your-gas-api-key
```

### Frontend (.env)
```bash
# API URL
VITE_API_URL=/api
REACT_APP_BACKEND_URL=https://api.snaproad.com

# Maps - No MapKit credentials needed in frontend
# Apple MapKit tokens are fetched from backend /api/maps/token

# Analytics
VITE_MIXPANEL_TOKEN=your-mixpanel-token
VITE_GA_ID=G-XXXXXXXXXX

# Feature Flags
VITE_ENABLE_PREMIUM=true
VITE_ENABLE_CHALLENGES=true
```

---

## ✅ Deployment Checklist

### Pre-Deployment

- [ ] Set up production database (PostgreSQL/MongoDB)
- [ ] Migrate mock data structures to database models
- [ ] Implement database connection pooling
- [ ] Set up authentication provider (Auth0/Firebase)
- [ ] Configure Stripe products and subscriptions
- [ ] Obtain Apple MapKit JS credentials (Team ID, Key ID, .p8 private key)
- [ ] Set up email service (SendGrid)
- [ ] Configure AI image generation API
- [ ] Set up error monitoring (Sentry)
- [ ] Set up logging (CloudWatch/Datadog)

### Security

- [ ] Change admin dashboard URL from `/portal/admin-sr2025secure`
- [ ] Implement rate limiting on all API endpoints
- [ ] Add CORS configuration for production domain
- [ ] Enable HTTPS only
- [ ] Implement input validation on all endpoints
- [ ] Add SQL injection protection (use parameterized queries)
- [ ] Implement password hashing (bcrypt)
- [ ] Set up WAF (Web Application Firewall)
- [ ] Configure CSP (Content Security Policy)
- [ ] Audit all environment variables (no secrets in code)

### Infrastructure

- [ ] Set up CI/CD pipeline (GitHub Actions/GitLab CI)
- [ ] Configure staging environment
- [ ] Set up database backups (daily)
- [ ] Configure auto-scaling
- [ ] Set up health check endpoints
- [ ] Configure CDN for static assets
- [ ] Set up SSL certificates (Let's Encrypt/AWS ACM)

### Testing

- [ ] Run all existing test suites
- [ ] Add integration tests for database operations
- [ ] Add E2E tests for critical user flows
- [ ] Load testing (k6/Artillery)
- [ ] Security audit (OWASP ZAP)

### Monitoring

- [ ] Set up uptime monitoring
- [ ] Configure alerting for errors
- [ ] Set up performance monitoring
- [ ] Configure database monitoring
- [ ] Set up log aggregation

---

## 🔒 Security Considerations

### Critical Security Tasks

1. **Change Admin URL**
   - Current: `/portal/admin-sr2025secure`
   - Use environment variable for admin path
   - Consider IP whitelist for admin access

2. **API Rate Limiting**
   ```python
   # Add to FastAPI
   from slowapi import Limiter
   limiter = Limiter(key_func=get_remote_address)
   
   @app.get("/api/offers")
   @limiter.limit("100/minute")
   async def get_offers():
       ...
   ```

3. **Input Validation**
   - All user inputs should be validated
   - Use Pydantic models for request validation
   - Sanitize all text inputs

4. **Authentication Tokens**
   - Use short-lived access tokens (15-60 min)
   - Implement refresh token rotation
   - Store refresh tokens securely

5. **QR Code Security**
   - QR codes expire after 2 minutes (already implemented)
   - One-time use only
   - Geofence verification before redemption

---

## 🧪 Testing & QA

### Existing Test Files
```
/app/backend/tests/
├── test_snaproad_api.py
├── test_comprehensive_api.py
├── test_new_features.py
├── test_plan_selection.py
├── test_tiered_offers_share_trip.py
├── test_partner_admin_features.py
├── test_map_search_navigation.py
├── test_session_reset.py
├── test_redemption_weekly_recap.py
├── test_driving_score_challenges.py
├── test_partner_locations.py
└── test_phase2a_xp_reports_badges.py
```

### Running Tests
```bash
# Run all tests
cd /app/backend
pytest tests/ -v

# Run specific test file
pytest tests/test_partner_locations.py -v

# Run with coverage
pytest tests/ --cov=. --cov-report=html
```

### Test Credentials (Development)
- No credentials needed for mock backend
- Default user ID: `123456`
- Default partner ID: `default_partner`

---

## 📱 Native iOS Migration Notes

The current web app is designed for eventual native iOS migration. Key considerations:

1. **UI Components** → SwiftUI equivalents
2. **State Management** → Combine/SwiftUI @State
3. **API Calls** → URLSession/Alamofire
4. **Maps** → Apple MapKit (native, included with iOS)
5. **Push Notifications** → APNs
6. **Local Storage** → CoreData/UserDefaults
7. **Animations** → SwiftUI animations

---

## 📞 Support & Resources

### Code Repository Structure
```
/app
├── frontend/          # React/TypeScript frontend
│   ├── src/
│   │   ├── pages/     # Page components
│   │   ├── components/# Reusable components
│   │   ├── contexts/  # React contexts
│   │   └── services/  # API services
│   └── public/
│       └── assets/    # Static assets (logo, etc.)
├── backend/           # FastAPI backend
│   ├── server.py      # Main server file
│   └── tests/         # Test files
└── memory/            # Documentation
    └── PRD.md         # Product requirements
```

### Quick Start Commands
```bash
# Frontend
cd /app/frontend
yarn install
yarn dev

# Backend
cd /app/backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

---

**Document Version:** 1.0
**Last Updated:** February 2026
**Status:** Ready for Production Planning
