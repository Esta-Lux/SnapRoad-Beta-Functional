# SnapRoad — Engineering Lead Documentation (Andrew)
> **Role:** Engineering Lead | **Updated:** February 2026  
> **Focus:** Backend architecture, API layer, Supabase migration, infrastructure

---

## 1. System Architecture Overview

```
                  ┌──────────────────────────────────┐
                  │        Kubernetes Cluster        │
                  │                                  │
  Browser ───────▶│  :3000 (React Web App)           │
                  │  :8001 (FastAPI Backend)          │
                  │  /api/* → Backend (proxy)         │
                  └─────────────┬────────────────────┘
                                │
                  ┌─────────────▼────────────────────┐
                  │     Supabase (External)          │
                  │  - Auth (ACTIVE)                  │
                  │  - PostgreSQL DB (PENDING TABLES) │
                  └──────────────────────────────────┘
```

**Supervisor-managed processes:**
- `frontend` — React app on port 3000 (hot reload enabled)
- `backend` — FastAPI (uvicorn) on port 8001 (hot reload enabled)

---

## 2. Backend Architecture

**Entry point:** `backend/server.py` → `backend/main.py`

```
/app/backend/
├── server.py               # Supervisor entry; imports app from main.py; adds /api/health, /api/admin/migrate
├── main.py                 # App factory: CORS + 11 route routers
├── config.py               # Env var loading (Supabase, JWT, Stripe, LLM keys)
├── database.py             # Supabase client singleton (lazy init)
├── middleware/
│   └── auth.py             # JWT encode/decode (python-jose)
├── models/
│   └── schemas.py          # All Pydantic request/response models (40+ models)
├── routes/                 # 11 route files — one per feature domain
│   ├── auth.py             # /api/auth/signup, /api/auth/login
│   ├── users.py            # /api/user/*, /api/cars/*, /api/skins/*, /api/settings/*
│   ├── offers.py           # /api/offers/*, /api/driver/location-visit
│   ├── partners.py         # /api/partner/*, /api/partner/v2/*
│   ├── gamification.py     # /api/xp/*, /api/badges/*, /api/challenges/*, /api/gems/*, /api/leaderboard
│   ├── trips.py            # /api/trips/*, /api/fuel/*, /api/incidents/report, /api/routes/history-3d
│   ├── admin.py            # /api/admin/*, /api/boosts/*, /api/analytics/*
│   ├── social.py           # /api/friends/*, /api/family/*, /api/reports/*
│   ├── navigation.py       # /api/locations/*, /api/routes/*, /api/navigation/*, /api/map/*, /api/widgets/*
│   ├── ai.py               # /api/orion/*, /api/photo/analyze
│   └── webhooks.py         # /api/webhooks/stripe + WebSocket endpoints
├── services/
│   ├── mock_data.py        # IN-MEMORY: all feature data (users, offers, trips, etc.)
│   ├── supabase_service.py # Supabase CRUD (falls back to mock when tables don't exist)
│   ├── orion_coach.py      # OpenAI GPT-5.2 AI coach (multi-turn sessions)
│   ├── photo_analysis.py   # OpenAI Vision (face/plate blur detection)
│   ├── partner_service.py  # Partner business logic (team, referrals, QR)
│   └── websocket_manager.py # WS connection manager (partner + admin channels)
├── sql/
│   └── supabase_migration.sql  # READY: 12-table schema (NOT YET RUN)
└── tests/                  # 18 pytest test files
```

---

## 3. Complete API Endpoint Reference

### Health & Migration (`server.py`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Root info |
| GET | `/api/health` | Health check |
| GET | `/api/admin/migrate` | Run Supabase migration (BLOCKED: firewall) |
| GET | `/api/admin/db-status` | Supabase connectivity check |

### Auth (`/api/auth`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/signup` | Register new user (Supabase → Mock fallback) |
| POST | `/api/auth/login` | Authenticate (Supabase → Mock fallback) |

### Users (`/api/user`, `/api/cars`, `/api/skins`, `/api/settings`, `/api/help`, `/api/pricing`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/user/profile` | Get current user |
| GET | `/api/user/stats` | Driving stats (miles, trips, gems, level) |
| POST | `/api/user/plan` | Update subscription plan |
| POST | `/api/user/car` | Save car customization |
| GET | `/api/user/car/colors` | Available car colors |
| POST | `/api/user/car/color/{color_key}/purchase` | Buy premium car color |
| GET | `/api/user/onboarding-status` | Check onboarding flags |
| GET | `/api/session/reset` | Reset onboarding (dev only) |
| GET | `/api/cars` | List all car models |
| POST | `/api/cars/{car_id}/purchase` | Buy car with gems |
| POST | `/api/cars/{car_id}/equip` | Equip car |
| GET | `/api/skins` | List all car skins |
| POST | `/api/skins/{skin_id}/purchase` | Buy skin |
| POST | `/api/skins/{skin_id}/equip` | Equip skin |
| GET | `/api/pricing` | Subscription pricing config |
| GET | `/api/settings/notifications` | Get notification settings |
| POST | `/api/settings/notifications` | Update notification settings |
| GET | `/api/help/faq` | FAQ data |
| POST | `/api/help/contact` | Submit contact form |

### Offers (`/api/offers`, `/api/images`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/offers` | All active offers |
| POST | `/api/offers` | Create offer |
| POST | `/api/offers/{offer_id}/redeem` | Redeem offer (awards gems) |
| GET | `/api/offers/nearby` | Offers within radius (lat/lng/radius params) |
| GET | `/api/offers/on-route` | Offers along route corridor |
| GET | `/api/offers/personalized` | AI-personalized offers |
| POST | `/api/offers/{offer_id}/accept-voice` | Voice-accept offer |
| POST | `/api/driver/location-visit` | Record location visit |
| POST | `/api/images/generate` | Generate offer image (placeholder) |

### Partners (`/api/partner`, `/api/partner/v2`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/partner/plans` | Partner subscription plans |
| GET | `/api/partner/profile` | Partner profile + plan |
| POST | `/api/partner/plan` | Change partner plan |
| GET | `/api/partner/locations` | List store locations |
| POST | `/api/partner/locations` | Add location |
| PUT | `/api/partner/locations/{id}` | Update location |
| DELETE | `/api/partner/locations/{id}` | Delete location |
| POST | `/api/partner/locations/{id}/set-primary` | Set primary location |
| POST | `/api/partner/offers` | Create partner offer |
| GET | `/api/partner/offers` | List partner's offers |
| PUT | `/api/partner/profile` | Update partner profile |
| GET | `/api/partner/boosts/pricing` | Boost package pricing |
| POST | `/api/partner/boosts/create` | Create offer boost |
| GET | `/api/partner/boosts/active` | Active boosts |
| DELETE | `/api/partner/boosts/{offer_id}` | Cancel boost |
| GET | `/api/partner/credits` | Credit balance |
| POST | `/api/partner/credits/add` | Add credits |
| POST | `/api/partner/v2/login` | Partner auth |
| GET | `/api/partner/v2/profile/{partner_id}` | Full partner profile |
| GET | `/api/partner/v2/team/{partner_id}` | Team members |
| POST | `/api/partner/v2/team/{partner_id}/invite` | Invite team member |
| PUT | `/api/partner/v2/team/{member_id}/role` | Change role |
| DELETE | `/api/partner/v2/team/{member_id}` | Remove team member |
| GET | `/api/partner/v2/referrals/{partner_id}` | Referrals + stats |
| POST | `/api/partner/v2/referrals/{partner_id}` | Send referral |
| POST | `/api/partner/v2/credits/{partner_id}/use` | Use credits |
| POST | `/api/partner/v2/redeem` | QR code redemption |
| GET | `/api/partner/v2/redemptions/{partner_id}` | Recent redemptions |
| GET | `/api/partner/v2/analytics/{partner_id}` | Partner analytics |

### Gamification
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/xp/add` | Add/subtract XP |
| GET | `/api/xp/status` | Level + XP progress |
| GET | `/api/xp/config` | XP config values |
| GET | `/api/badges` | All badges (with earned status) |
| GET | `/api/badges/categories` | Badges by category |
| GET | `/api/badges/community` | Community badges |
| GET | `/api/leaderboard` | Driver leaderboard (filter by state) |
| GET | `/api/challenges` | Active challenges |
| POST | `/api/challenges` | Create challenge (stake gems) |
| POST | `/api/challenges/{id}/accept` | Accept challenge |
| POST | `/api/challenges/{id}/claim` | Claim challenge reward |
| GET | `/api/challenges/history` | Challenge history |
| POST | `/api/gems/generate-route` | Spawn gems along route |
| POST | `/api/gems/collect` | Collect gem |
| GET | `/api/gems/trip-summary/{trip_id}` | Gem summary for trip |
| GET | `/api/gems/history` | Gem balance + history |
| GET | `/api/driving-score` | Driving score breakdown (6 metrics) |
| GET | `/api/weekly-recap` | Weekly stats |

### Trips & Fuel
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/trips/history` | Recent 10 trips |
| POST | `/api/trips/complete` | Complete trip |
| POST | `/api/trips/complete-with-safety` | Complete trip with safety metrics |
| GET | `/api/trips/history/detailed` | Detailed trip history |
| POST | `/api/trips/{trip_id}/share` | Generate trip share URL |
| GET | `/api/fuel/history` | Fuel log entries |
| POST | `/api/fuel/log` | Add fuel log entry |
| GET | `/api/fuel/trends` | Fuel trend analytics |
| GET | `/api/fuel/prices` | Current fuel prices + nearby stations |
| GET | `/api/fuel/analytics` | Monthly fuel breakdown |
| POST | `/api/incidents/report` | Report road incident |
| GET | `/api/routes/history-3d` | Route history for 3D viz |

### Navigation
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/locations` | Saved locations |
| POST | `/api/locations` | Save location |
| DELETE | `/api/locations/{id}` | Delete location |
| GET | `/api/routes` | Saved routes |
| POST | `/api/routes` | Save commute route |
| POST | `/api/routes/{id}/toggle` | Toggle route active |
| POST | `/api/routes/{id}/notifications` | Toggle route notifications |
| POST | `/api/navigation/start` | Start navigation |
| POST | `/api/navigation/stop` | Stop navigation |
| POST | `/api/navigation/voice-command` | Voice nav command |
| GET | `/api/map/search` | Map location search |
| GET | `/api/map/directions` | Turn-by-turn directions |
| GET | `/api/widgets` | Dashboard widget settings |
| POST | `/api/widgets/{id}/toggle` | Toggle widget visibility |
| POST | `/api/widgets/{id}/collapse` | Toggle widget collapse |

### Admin
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/admin/offers/create` | Create admin offer |
| POST | `/api/admin/offers/bulk` | Bulk create offers |
| POST | `/api/admin/offers/bulk-csv` | CSV offer import |
| GET | `/api/admin/export/offers` | Export offers (JSON/CSV) |
| GET | `/api/admin/export/users` | Export users (JSON/CSV) |
| POST | `/api/admin/import/offers` | Import offers from JSON |
| GET | `/api/admin/analytics` | Platform analytics (30-day chart) |
| GET | `/api/admin/pricing` | Get pricing config |
| POST | `/api/admin/pricing` | Update pricing |
| POST | `/api/analytics/track` | Track analytics event |
| GET | `/api/analytics/dashboard` | Per-business analytics |
| POST | `/api/admin/boosts/create` | Admin-apply boost |
| POST | `/api/boosts/calculate` | Calculate boost cost |
| POST | `/api/boosts/create` | Create paid boost |
| GET | `/api/boosts` | List boosts |
| GET | `/api/boosts/{id}` | Get boost |
| DELETE | `/api/boosts/{id}` | Cancel boost |
| GET | `/api/admin/users` | List users (Supabase → Mock) |
| GET | `/api/admin/stats` | Platform stats |
| GET | `/api/admin/supabase/status` | Supabase connectivity |
| GET | `/api/admin/events` | Platform events |
| POST | `/api/admin/supabase/migrate` | Run migration SQL (blocked by firewall) |

### AI
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/orion/chat` | Orion AI coach chat (GPT-5.2) |
| GET | `/api/orion/history/{session_id}` | Chat history |
| DELETE | `/api/orion/session/{session_id}` | Clear session |
| GET | `/api/orion/tips` | Quick tip suggestions |
| POST | `/api/photo/analyze` | Photo privacy analysis (faces/plates) |

### Social
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/friends` | Friends list |
| GET | `/api/friends/search` | Search users |
| POST | `/api/friends/add` | Add friend |
| DELETE | `/api/friends/{id}` | Remove friend |
| GET | `/api/family/members` | Family members |
| GET | `/api/reports` | Road reports (filter by lat/lng) |
| POST | `/api/reports` | Create road report (+XP) |
| POST | `/api/reports/{id}/upvote` | Upvote report (+10 gems) |
| DELETE | `/api/reports/{id}` | Delete own report |
| GET | `/api/reports/my` | Own reports + stats |

### WebSockets & Webhooks
| Type | Path | Description |
|------|------|-------------|
| POST | `/api/webhooks/stripe` | Stripe webhook handler |
| WS | `/api/ws/partner/{partner_id}` | Partner real-time notifications |
| WS | `/api/ws/customer/{customer_id}` | Customer real-time notifications |
| GET | `/api/ws/status/{partner_id}` | WS connection count |
| WS | `/api/ws/admin/moderation` | Admin AI moderation feed (real-time) |
| POST | `/api/admin/moderation/simulate` | Simulate incident (testing) |
| GET | `/api/admin/moderation/status` | Moderation queue status |

---

## 4. Database Layer Status

| Component | Status | Action Required |
|-----------|--------|----------------|
| Supabase Auth | **ACTIVE** | None |
| Supabase DB Tables | **PENDING** | Run `sql/supabase_migration.sql` in Supabase SQL Editor |
| Mock Data | **ACTIVE (fallback)** | Will be replaced after migration |

**To unblock:** Go to Supabase SQL Editor → paste `/app/backend/sql/supabase_migration.sql` → Run.

Tables that will be created: `users`, `partners`, `partner_locations`, `offers`, `trips`, `trip_gems`, `road_reports`, `events`, `challenges`, `notifications`, `boosts`, `analytics_events`

**Why direct connection fails:** The execution environment's network firewall blocks outbound PostgreSQL connections on port 5432 to Supabase.

---

## 5. Environment Variables (Backend)

File: `/app/backend/.env`

| Variable | Purpose | Status |
|----------|---------|--------|
| `MONGO_URL` | MongoDB (legacy, required by platform) | Ignored by app |
| `DB_NAME` | DB name (legacy, required by platform) | Ignored by app |
| `SUPABASE_URL` | Supabase project URL | Configured |
| `SUPABASE_SECRET_KEY` | Service role key (admin access) | Configured |
| `SUPABASE_PUBLISHABLE_KEY` | Anon/public key | Configured |
| `SUPABASE_DB_PASSWORD` | Direct PostgreSQL password | Configured (blocked by firewall) |
| `JWT_SECRET` | JWT signing secret | Configured |
| `EMERGENT_LLM_KEY` | Universal LLM key (OpenAI + Anthropic + Gemini) | Configured |
| `STRIPE_SECRET_KEY` | Stripe key | Configured |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing | Configured |

---

## 6. Third-Party Integrations

| Integration | Status | Key Used |
|-------------|--------|----------|
| OpenAI GPT-5.2 (Orion Coach) | **Active** | `EMERGENT_LLM_KEY` |
| OpenAI Vision (photo blur) | **Active** | `EMERGENT_LLM_KEY` |
| Supabase Auth | **Active** | `SUPABASE_URL` + `SUPABASE_SECRET_KEY` |
| Supabase DB | **Pending** | Migration SQL not run |
| Stripe | **Skeleton** | `STRIPE_SECRET_KEY` (webhook handler exists) |
| Apple Maps MapKit | **Planned** | — |
| Gas Buddy API | **Planned** | — |

---

## 7. What Needs to Be Connected (Pending Backend Work)

| Task | Priority | Effort | Notes |
|------|----------|--------|-------|
| Run Supabase migration SQL | **P0** | 5 min | Manual step: run in Supabase SQL Editor |
| Connect `routes/auth.py` to real Supabase DB | P1 | 2h | Currently: Supabase Auth only, no DB write |
| Connect `routes/users.py` to Supabase | P1 | 4h | Replace `mock_data.users_db` with `supabase_service` calls |
| Connect `routes/offers.py` to Supabase | P1 | 4h | Replace `mock_data.offers_db` |
| Connect `routes/partners.py` to Supabase | P1 | 6h | Replace `mock_data.partners_db` |
| Connect `routes/gamification.py` to Supabase | P2 | 4h | XP, badges, challenges, gems |
| Connect `routes/trips.py` to Supabase | P2 | 4h | Trip records, fuel logs |
| Connect `routes/admin.py` to Supabase | P2 | 3h | Analytics events |
| Wire Stripe webhooks | P2 | 4h | `routes/webhooks.py` handler exists |

---

## 8. Test Suite

Location: `/app/backend/tests/` — 18 pytest test files

```bash
# Run all tests
cd /app/backend && python -m pytest tests/ -v

# Run specific test
python -m pytest tests/test_snaproad_api.py -v
```

Test areas covered: auth, users, offers, partners (v1+v2), gamification, trips, navigation, social, admin, AI, WebSocket moderation, weekly recap, plan selection, mobile API.

---

## 9. Timestamps

| Milestone | Date |
|-----------|------|
| Monolithic server.py refactored into 11 modules | Feb 2026 |
| Supabase client configured + migration SQL written | Feb 2026 |
| Admin AI Moderation WebSocket built | Feb 2026 |
| Partner V2 API (team, referrals, QR) built | Feb 2026 |
| Mobile app (42 screens) built | Feb 2026 |
| Mobile web animation fix (useNativeDriver web compat) | Feb 2026 |
| **Next:** Run Supabase migration → connect routes to real DB | TBD |

---

*Document owner: Engineering Lead (Andrew) | Last updated: February 2026*
