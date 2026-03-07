# Andrew - Backend Engineering Guide
> **Role:** Engineering Lead  
> **Last Updated:** December 2025  
> **Focus:** FastAPI backend, 60+ API endpoints, Supabase migration, integrations

---

## Quick Start

```bash
# Navigate to backend
cd /app/backend

# Check service status
sudo supervisorctl status backend

# View logs
tail -f /var/log/supervisor/backend.out.log

# Restart service
sudo supervisorctl restart backend
```

---

## 1. Architecture Overview

```
/app/backend/
├── server.py              # Supervisor entry (imports app from main.py)
├── main.py                # FastAPI app factory + CORS + routers
├── config.py              # Environment variable loading
├── database.py            # Supabase client singleton
├── data.py                # Mock data (fallback when DB empty)
├── requirements.txt       # Python dependencies
├── .env                   # Environment variables
├── sql/
│   └── supabase_migration.sql  # Database schema + seed data
├── routes/                # 11 route modules
│   ├── __init__.py
│   ├── auth.py            # Authentication
│   ├── users.py           # User profile, cars, skins
│   ├── offers.py          # Offers CRUD
│   ├── partners.py        # Partner portal
│   ├── gamification.py    # XP, badges, challenges, gems
│   ├── trips.py           # Trips, fuel, incidents
│   ├── admin.py           # Admin console
│   ├── social.py          # Friends, family, reports
│   ├── navigation.py      # Locations, routes, map
│   ├── ai.py              # Orion AI, photo analysis
│   ├── payments.py        # Stripe integration
│   └── webhooks.py        # Stripe webhooks, WebSocket
├── services/
│   ├── mock_data.py       # In-memory mock data
│   ├── supabase_service.py # Supabase CRUD
│   ├── orion_coach.py     # GPT-5.2 integration
│   ├── photo_analysis.py  # OpenAI Vision
│   ├── partner_service.py # Partner business logic
│   └── websocket_manager.py # WebSocket management
├── models/
│   └── schemas.py         # Pydantic models (40+)
├── middleware/
│   └── auth.py            # JWT encode/decode
└── tests/                 # pytest test files
```

---

## 2. Complete API Reference (60+ Endpoints)

### Health & System
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Root info |
| GET | `/api/health` | Health check |
| GET | `/api/admin/migrate` | Run Supabase migration |
| GET | `/api/admin/db-status` | DB connectivity |
| GET | `/api/admin/supabase/status` | Supabase status |

### Authentication (`routes/auth.py`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register user |
| POST | `/api/auth/login` | Authenticate user |

### Users (`routes/users.py`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user/profile` | Get current user |
| GET | `/api/user/stats` | Driving stats |
| POST | `/api/user/plan` | Update subscription |
| POST | `/api/user/car` | Save car customization |
| GET | `/api/user/car` | Get car customization |
| GET | `/api/user/car/colors` | Available colors |
| POST | `/api/user/car/color/{key}/purchase` | Buy color |
| GET | `/api/user/onboarding-status` | Onboarding flags |
| GET | `/api/session/reset` | Reset onboarding |
| GET | `/api/cars` | List car models |
| POST | `/api/cars/{id}/purchase` | Buy car |
| POST | `/api/cars/{id}/equip` | Equip car |
| GET | `/api/skins` | List skins |
| POST | `/api/skins/{id}/purchase` | Buy skin |
| POST | `/api/skins/{id}/equip` | Equip skin |
| GET | `/api/pricing` | Subscription pricing |
| GET | `/api/settings/notifications` | Notification settings |
| POST | `/api/settings/notifications` | Update notifications |
| GET | `/api/help/faq` | FAQ data |
| POST | `/api/help/contact` | Submit contact form |

### Offers (`routes/offers.py`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/offers` | All active offers |
| POST | `/api/offers` | Create offer |
| POST | `/api/offers/{id}/redeem` | Redeem offer |
| POST | `/api/offers/{id}/favorite` | Toggle favorite |
| GET | `/api/offers/nearby` | Offers by location |
| GET | `/api/offers/on-route` | Offers on route |
| GET | `/api/offers/personalized` | AI personalized |
| POST | `/api/offers/{id}/accept-voice` | Voice accept |
| POST | `/api/driver/location-visit` | Record visit |
| POST | `/api/images/generate` | Generate image |

### Partners (`routes/partners.py`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/partner/plans` | Partner plans |
| GET | `/api/partner/profile` | Partner profile |
| POST | `/api/partner/plan` | Change plan |
| GET | `/api/partner/locations` | List locations |
| POST | `/api/partner/locations` | Add location |
| PUT | `/api/partner/locations/{id}` | Update location |
| DELETE | `/api/partner/locations/{id}` | Delete location |
| POST | `/api/partner/locations/{id}/set-primary` | Set primary |
| POST | `/api/partner/offers` | Create offer |
| GET | `/api/partner/offers` | List offers |
| PUT | `/api/partner/profile` | Update profile |
| GET | `/api/partner/boosts/pricing` | Boost pricing |
| POST | `/api/partner/boosts/create` | Create boost |
| GET | `/api/partner/boosts/active` | Active boosts |
| DELETE | `/api/partner/boosts/{id}` | Cancel boost |
| GET | `/api/partner/credits` | Credit balance |
| POST | `/api/partner/credits/add` | Add credits |
| POST | `/api/partner/v2/login` | Partner login |
| GET | `/api/partner/v2/profile/{id}` | Full profile |
| GET | `/api/partner/v2/team/{id}` | Team members |
| POST | `/api/partner/v2/team/{id}/invite` | Invite member |
| PUT | `/api/partner/v2/team/{id}/role` | Change role |
| DELETE | `/api/partner/v2/team/{id}` | Remove member |
| GET | `/api/partner/v2/referrals/{id}` | Referrals |
| POST | `/api/partner/v2/referrals/{id}` | Send referral |
| POST | `/api/partner/v2/credits/{id}/use` | Use credits |
| POST | `/api/partner/v2/redeem` | QR redemption |
| GET | `/api/partner/v2/redemptions/{id}` | Recent redemptions |
| GET | `/api/partner/v2/analytics/{id}` | Analytics |

### Gamification (`routes/gamification.py`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/xp/add` | Add XP |
| GET | `/api/xp/status` | Level + XP |
| GET | `/api/xp/config` | XP config |
| GET | `/api/badges` | All badges |
| GET | `/api/badges/categories` | By category |
| GET | `/api/badges/community` | Community badges |
| GET | `/api/leaderboard` | Leaderboard |
| GET | `/api/challenges` | Active challenges |
| POST | `/api/challenges` | Create challenge |
| POST | `/api/challenges/{id}/accept` | Accept |
| POST | `/api/challenges/{id}/claim` | Claim reward |
| GET | `/api/challenges/history` | History |
| POST | `/api/gems/generate-route` | Spawn gems |
| POST | `/api/gems/collect` | Collect gem |
| GET | `/api/gems/trip-summary/{id}` | Trip gems |
| GET | `/api/gems/history` | Gem history |
| GET | `/api/driving-score` | Score breakdown |
| GET | `/api/weekly-recap` | Weekly recap |

### Trips & Fuel (`routes/trips.py`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/trips/history` | Recent trips |
| POST | `/api/trips/complete` | Complete trip |
| POST | `/api/trips/complete-with-safety` | With safety metrics |
| GET | `/api/trips/history/detailed` | Detailed history |
| POST | `/api/trips/{id}/share` | Share trip |
| GET | `/api/fuel/history` | Fuel log |
| POST | `/api/fuel/log` | Add fuel entry |
| GET | `/api/fuel/trends` | Fuel trends |
| GET | `/api/fuel/prices` | Current prices |
| GET | `/api/fuel/analytics` | Monthly breakdown |
| POST | `/api/incidents/report` | Report incident |
| GET | `/api/routes/history-3d` | 3D route data |

### Navigation (`routes/navigation.py`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/locations` | Saved locations |
| POST | `/api/locations` | Save location |
| DELETE | `/api/locations/{id}` | Delete location |
| GET | `/api/routes` | Saved routes |
| POST | `/api/routes` | Save route |
| DELETE | `/api/routes/{id}` | Delete route |
| POST | `/api/routes/{id}/toggle` | Toggle active |
| POST | `/api/routes/{id}/notifications` | Toggle notifications |
| POST | `/api/navigation/start` | Start nav |
| POST | `/api/navigation/stop` | Stop nav |
| POST | `/api/navigation/voice-command` | Voice command |
| GET | `/api/map/search` | Location search |
| GET | `/api/map/directions` | Get directions |
| GET | `/api/widgets` | Widget settings |
| POST | `/api/widgets/{id}/toggle` | Toggle widget |
| POST | `/api/widgets/{id}/collapse` | Collapse widget |

### Admin (`routes/admin.py`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/offers/create` | Create offer |
| POST | `/api/admin/offers/bulk` | Bulk create |
| POST | `/api/admin/offers/bulk-csv` | CSV import |
| GET | `/api/admin/export/offers` | Export offers |
| GET | `/api/admin/export/users` | Export users |
| POST | `/api/admin/import/offers` | Import offers |
| GET | `/api/admin/analytics` | Platform analytics |
| GET | `/api/admin/pricing` | Get pricing |
| POST | `/api/admin/pricing` | Update pricing |
| POST | `/api/analytics/track` | Track event |
| GET | `/api/analytics/dashboard` | Analytics dashboard |
| POST | `/api/admin/boosts/create` | Admin boost |
| POST | `/api/boosts/calculate` | Calculate cost |
| POST | `/api/boosts/create` | Create boost |
| GET | `/api/boosts` | List boosts |
| GET | `/api/boosts/{id}` | Get boost |
| DELETE | `/api/boosts/{id}` | Cancel boost |
| GET | `/api/admin/users` | List users |
| GET | `/api/admin/stats` | Platform stats |
| GET | `/api/admin/events` | Platform events |
| POST | `/api/admin/supabase/migrate` | Run migration |

### AI (`routes/ai.py`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/orion/chat` | AI chat (GPT-5.2) |
| GET | `/api/orion/history/{session}` | Chat history |
| DELETE | `/api/orion/session/{session}` | Clear session |
| GET | `/api/orion/tips` | Quick tips |
| POST | `/api/photo/analyze` | Photo analysis |

### Social (`routes/social.py`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/friends` | Friends list |
| GET | `/api/friends/search` | Search users |
| POST | `/api/friends/add` | Add friend |
| DELETE | `/api/friends/{id}` | Remove friend |
| GET | `/api/family/members` | Family members |
| GET | `/api/reports` | Road reports |
| POST | `/api/reports` | Create report |
| POST | `/api/reports/{id}/upvote` | Upvote |
| DELETE | `/api/reports/{id}` | Delete report |
| GET | `/api/reports/my` | Own reports |

### Payments (`routes/payments.py`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/payments/plans` | Subscription plans |
| POST | `/api/payments/checkout/session` | Create checkout |
| GET | `/api/payments/checkout/status/{id}` | Check status |
| POST | `/api/payments/webhook/stripe` | Stripe webhook |
| GET | `/api/payments/transactions` | All transactions |
| GET | `/api/payments/transaction/{id}` | Get transaction |

### WebSockets (`routes/webhooks.py`)
| Type | Endpoint | Description |
|------|----------|-------------|
| WS | `/api/ws/partner/{id}` | Partner notifications |
| WS | `/api/ws/customer/{id}` | Customer notifications |
| GET | `/api/ws/status/{id}` | Connection count |
| WS | `/api/ws/admin/moderation` | AI moderation feed |
| POST | `/api/admin/moderation/simulate` | Simulate incident |
| GET | `/api/admin/moderation/status` | Queue status |

---

## 3. Supabase Integration

### What's Implemented
| Component | Status | File |
|-----------|--------|------|
| Client | CONNECTED | `/app/backend/database.py` |
| Auth | ACTIVE | Uses Supabase Auth |
| Migration Script | READY | `/app/backend/sql/supabase_migration.sql` |
| Fallback | WORKING | Uses mock data when DB empty |

### What's Blocked
```
ACTION REQUIRED: Manual SQL execution in Supabase dashboard

Network firewall blocks outbound PostgreSQL connections.
User must manually run the migration script.
```

### Tables Created by Migration
| Table | Columns | Purpose |
|-------|---------|---------|
| users | id, email, name, gems, level, xp, safety_score, etc. | Driver accounts |
| partners | id, email, name, plan, credits, etc. | Business accounts |
| partner_locations | id, partner_id, name, address, lat, lng, etc. | Store locations |
| offers | id, partner_id, title, gems_reward, etc. | Available offers |
| trips | id, user_id, distance, duration, safety_score, etc. | Trip history |
| trip_gems | id, trip_id, lat, lng, value, collected | Gems on route |
| road_reports | id, user_id, type, title, lat, lng, upvotes | Hazard reports |
| events | id, title, date, partner_id | Platform events |
| challenges | id, challenger_id, opponent_id, stake | Driver challenges |
| notifications | id, user_id, type, message, read | User notifications |
| boosts | id, offer_id, multiplier, expires_at | Offer boosts |
| analytics_events | id, event_type, offer_id, timestamp | Analytics tracking |

---

## 4. Stripe Integration

### What's Implemented
| Feature | Status | File |
|---------|--------|------|
| Checkout Session | COMPLETE | `routes/payments.py` |
| Webhook Handler | COMPLETE | `routes/payments.py` |
| Status Check | COMPLETE | `routes/payments.py` |
| Transaction Records | COMPLETE | In-memory (move to Supabase) |

### Subscription Plans
```python
SUBSCRIPTION_PLANS = {
    "basic": { "price": 0.00, "period": "forever" },
    "premium": { "price": 10.99, "period": "month" },
    "family": { "price": 14.99, "period": "month" }
}
```

### Test Keys (in .env)
```
STRIPE_API_KEY=sk_test_51T1HkrDq0wX3q3xg...
STRIPE_PUBLISHABLE_KEY=pk_test_51T1HkrDq0wX3q3xg...
```

### What's NOT Implemented
- [ ] Live Stripe keys
- [ ] Subscription management
- [ ] Invoice generation
- [ ] Webhook signature verification

---

## 5. AI Integration

### Orion AI Coach (GPT-5.2)
```python
# services/orion_coach.py
# Uses Emergent LLM Key via emergentintegrations

from emergentintegrations.llm.openai import chat_completion

# Multi-turn conversation support
# Session management with history
```

### Photo Analysis (OpenAI Vision)
```python
# services/photo_analysis.py
# Detects faces and license plates for privacy blur

from emergentintegrations.llm.openai import vision_analysis
```

---

## 6. Environment Variables

```bash
# /app/backend/.env

# Database (Legacy - required by platform)
MONGO_URL=mongodb://localhost:27017
DB_NAME=snaproad

# Supabase
SUPABASE_URL=https://cuseezsdaqlbwlxnjsyr.supabase.co
SUPABASE_SECRET_KEY=eyJhbGci...
SUPABASE_PUBLISHABLE_KEY=eyJhbGci...
SUPABASE_DB_PASSWORD=***

# Auth
JWT_SECRET=snaproad-jwt-secret-2025

# AI
EMERGENT_LLM_KEY=sk-emergent-...

# Payments
STRIPE_API_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## 7. Testing

### Run All Tests
```bash
cd /app/backend
python -m pytest tests/ -v
```

### Test Specific Module
```bash
python -m pytest tests/test_payments.py -v
```

### curl Examples
```bash
# Get API URL
API_URL=$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d '=' -f2)

# Health check
curl $API_URL/api/health

# Login
curl -X POST $API_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"driver@snaproad.com","password":"password123"}'

# Get offers
curl $API_URL/api/offers

# Create Stripe checkout
curl -X POST $API_URL/api/payments/checkout/session \
  -H "Content-Type: application/json" \
  -d '{"plan_id":"premium","origin_url":"https://example.com"}'
```

---

## 8. Next Steps

### P0 - Critical
1. **Run Supabase migration** (manual action required)
2. **Connect routes to live DB** (replace mock data)

### P1 - Important
1. **Gas price API integration**
2. **Push notification backend**
3. **Stripe webhook signature verification**

### P2 - Future
1. **Rate limiting**
2. **Caching layer (Redis)**
3. **Background jobs (Celery)**

---

## 9. File Reference

| What | Where |
|------|-------|
| Entry Point | `/app/backend/server.py` |
| App Factory | `/app/backend/main.py` |
| Routes | `/app/backend/routes/` |
| Services | `/app/backend/services/` |
| Models | `/app/backend/models/schemas.py` |
| Database | `/app/backend/database.py` |
| Config | `/app/backend/config.py` |
| Migration | `/app/backend/sql/supabase_migration.sql` |
| Tests | `/app/backend/tests/` |
| Logs | `/var/log/supervisor/backend.*.log` |

---

*Document owner: Engineering Lead (Andrew) | Last updated: December 2025*
