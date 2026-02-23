# SnapRoad Backend Developer Guide
## For Andrew (Backend Lead)

> **Tech Stack**: FastAPI (modular) + Supabase (PostgreSQL) + Python 3.10+
> **Current State**: Fully modular backend with 11 route files, 60+ endpoints. Data layer is mock. Supabase Auth is LIVE. DB tables pending migration.
> **Updated**: February 2026

---

## Current Architecture

```
/app/backend/
├── server.py                     # Thin Supervisor entry point — imports app from main.py
├── main.py                       # App factory: CORS + registers all 11 routers
├── config.py                     # Env var loading (Supabase, JWT, Stripe, LLM keys)
├── database.py                   # Supabase client singleton (lazy init)
├── middleware/
│   └── auth.py                   # JWT encode/decode (python-jose)
├── models/
│   └── schemas.py                # All Pydantic request/response models (40+ models)
├── routes/                       # ONE FILE PER DOMAIN — 11 route modules
│   ├── auth.py                   # /api/auth/* (Supabase-first + mock fallback)
│   ├── users.py                  # /api/user/*, /api/cars/*, /api/skins/*, /api/settings/*
│   ├── offers.py                 # /api/offers/*
│   ├── partners.py               # /api/partner/v1/* + /api/partner/v2/*
│   ├── gamification.py           # /api/xp/*, /api/badges/*, /api/challenges/*, /api/gems/*
│   ├── trips.py                  # /api/trips/*, /api/fuel/*, /api/incidents/*
│   ├── admin.py                  # /api/admin/*, /api/boosts/*, /api/analytics/*
│   ├── social.py                 # /api/friends/*, /api/family/*, /api/reports/*
│   ├── navigation.py             # /api/locations/*, /api/routes/*, /api/map/*, /api/widgets/*
│   ├── ai.py                     # /api/orion/*, /api/photo/analyze
│   └── webhooks.py               # /api/webhooks/stripe + all WebSocket endpoints
├── services/
│   ├── mock_data.py              # In-memory data store (active fallback for all features)
│   ├── supabase_service.py       # Supabase CRUD functions (falls back to mock gracefully)
│   ├── orion_coach.py            # OpenAI GPT-5.2 AI coach (LIVE, multi-turn sessions)
│   ├── photo_analysis.py         # OpenAI Vision privacy blur (LIVE)
│   ├── partner_service.py        # Partner business logic (team, referrals, QR)
│   └── websocket_manager.py      # WebSocket connection manager (partner + admin)
├── sql/
│   └── supabase_migration.sql    # READY TO RUN — 12-table schema. NOT YET EXECUTED.
└── tests/                        # 18 pytest test files
```

**IMPORTANT**: The old monolithic `server.py` (~3700 lines) has been fully refactored. Do NOT revert to it. All routes are now in `routes/*.py`.

---

## Database Layer Status

| Component | Status | Notes |
|-----------|--------|-------|
| Supabase Auth | **LIVE** | Used for signup/login |
| Supabase DB Tables | **PENDING** | Run `sql/supabase_migration.sql` in Supabase SQL Editor |
| Mock Data | **Active (fallback)** | `services/mock_data.py` — all routes fall back here |

### To Enable Live Database (ONE-TIME SETUP)
1. Open your Supabase project → SQL Editor
2. Paste the full content of `/app/backend/sql/supabase_migration.sql`
3. Click "Run"
4. All 12 tables are created. `supabase_service.py` will automatically start using them.

**Why direct connection fails**: The Kubernetes environment's network firewall blocks outbound PostgreSQL (port 5432) connections to Supabase. The only path is the Supabase REST API (already configured) or manual SQL Editor run.

---

## Complete API Endpoint List (60+ endpoints)

### Health & Migration (`server.py`)
| Method | Path | Status |
|--------|------|--------|
| GET | `/api/health` | ✅ Live |
| GET | `/api/admin/migrate` | Blocked by firewall |
| GET | `/api/admin/db-status` | ✅ Live |

### Auth (`routes/auth.py`) — `/api/auth`
| Method | Path | Status |
|--------|------|--------|
| POST | `/api/auth/signup` | ✅ Supabase Auth + Mock fallback |
| POST | `/api/auth/login` | ✅ Supabase Auth + Mock fallback |

### Users (`routes/users.py`)
| Method | Path | Status |
|--------|------|--------|
| GET | `/api/user/profile` | Mock |
| GET | `/api/user/stats` | Mock |
| POST | `/api/user/plan` | Mock |
| POST | `/api/user/car` | Mock |
| GET | `/api/user/car/colors` | Mock |
| POST | `/api/user/car/color/{color_key}/purchase` | Mock |
| GET | `/api/user/onboarding-status` | Mock |
| GET | `/api/session/reset` | Mock (dev only) |
| GET | `/api/cars` | Mock |
| POST | `/api/cars/{car_id}/purchase` | Mock |
| POST | `/api/cars/{car_id}/equip` | Mock |
| GET | `/api/skins` | Mock |
| POST | `/api/skins/{skin_id}/purchase` | Mock |
| POST | `/api/skins/{skin_id}/equip` | Mock |
| GET | `/api/pricing` | Mock |
| GET | `/api/settings/notifications` | Mock |
| POST | `/api/settings/notifications` | Mock |
| GET | `/api/help/faq` | Mock |
| POST | `/api/help/contact` | Mock |

### Offers (`routes/offers.py`)
| Method | Path | Status |
|--------|------|--------|
| GET | `/api/offers` | Mock |
| POST | `/api/offers` | Mock |
| POST | `/api/offers/{id}/redeem` | Mock |
| GET | `/api/offers/nearby` | Mock |
| GET | `/api/offers/on-route` | Mock |
| GET | `/api/offers/personalized` | Mock |
| POST | `/api/offers/{id}/accept-voice` | Mock |
| POST | `/api/driver/location-visit` | Mock |
| POST | `/api/images/generate` | Mock (placeholder) |

### Partners (`routes/partners.py`) — V1 + V2
| Method | Path | Status |
|--------|------|--------|
| GET/POST/PUT/DELETE | `/api/partner/*` | Mock |
| GET/POST/PUT/DELETE | `/api/partner/v2/*` | Mock |
| GET | `/api/partner/boosts/pricing` | Mock |
| POST | `/api/partner/boosts/create` | Mock (needs Stripe) |
| GET/POST | `/api/partner/credits/*` | Mock |
| POST | `/api/partner/v2/redeem` | Mock |
| GET | `/api/partner/v2/analytics/{partner_id}` | Mock |

### Gamification (`routes/gamification.py`)
| Method | Path | Status |
|--------|------|--------|
| POST | `/api/xp/add` | Mock |
| GET | `/api/xp/status` | Mock |
| GET | `/api/badges` | Mock |
| GET | `/api/leaderboard` | Mock |
| POST/GET | `/api/challenges/*` | Mock |
| POST/GET | `/api/gems/*` | Mock |
| GET | `/api/driving-score` | Mock |
| GET | `/api/weekly-recap` | Mock |

### Trips (`routes/trips.py`)
| Method | Path | Status |
|--------|------|--------|
| GET | `/api/trips/history` | Mock |
| POST | `/api/trips/complete` | Mock |
| POST | `/api/trips/complete-with-safety` | Mock |
| GET | `/api/trips/history/detailed` | Mock |
| POST | `/api/trips/{id}/share` | Mock |
| GET | `/api/fuel/history` | Mock |
| POST | `/api/fuel/log` | Mock |
| GET | `/api/fuel/trends` | Mock |
| GET | `/api/fuel/prices` | Mock |
| GET | `/api/fuel/analytics` | Mock |
| POST | `/api/incidents/report` | Mock |
| GET | `/api/routes/history-3d` | Mock |

### Navigation (`routes/navigation.py`)
| Method | Path | Status |
|--------|------|--------|
| GET/POST/DELETE | `/api/locations/*` | Mock |
| GET/POST | `/api/routes/*` | Mock |
| POST | `/api/navigation/start` | Mock |
| POST | `/api/navigation/stop` | Mock |
| POST | `/api/navigation/voice-command` | Mock |
| GET | `/api/map/search` | Mock |
| GET | `/api/map/directions` | Mock |
| GET/POST | `/api/widgets/*` | Mock |

### Admin (`routes/admin.py`)
| Method | Path | Status |
|--------|------|--------|
| POST | `/api/admin/offers/create` | Mock |
| POST | `/api/admin/offers/bulk` | Mock |
| GET | `/api/admin/export/offers` | ✅ Functional |
| GET | `/api/admin/export/users` | ✅ Functional |
| POST | `/api/admin/import/offers` | ✅ Functional |
| GET | `/api/admin/analytics` | Mock |
| GET/POST | `/api/admin/pricing` | Mock |
| POST | `/api/analytics/track` | Mock |
| GET | `/api/admin/users` | ✅ Supabase Auth fallback |
| GET | `/api/admin/stats` | Mock |
| GET | `/api/admin/supabase/status` | ✅ Live |
| GET | `/api/admin/events` | Mock |

### AI (`routes/ai.py`)
| Method | Path | Status |
|--------|------|--------|
| POST | `/api/orion/chat` | **✅ LIVE — GPT-5.2** |
| GET | `/api/orion/history/{session_id}` | ✅ Live (in-memory) |
| DELETE | `/api/orion/session/{session_id}` | ✅ Live |
| GET | `/api/orion/tips` | ✅ Live |
| POST | `/api/photo/analyze` | **✅ LIVE — OpenAI Vision** |

### Social (`routes/social.py`)
| Method | Path | Status |
|--------|------|--------|
| GET/POST/DELETE | `/api/friends/*` | Mock |
| GET | `/api/family/members` | Mock |
| GET/POST/DELETE | `/api/reports/*` | Mock |

### WebSockets & Webhooks (`routes/webhooks.py`)
| Type | Path | Status |
|------|------|--------|
| POST | `/api/webhooks/stripe` | Skeleton (ready) |
| WS | `/api/ws/partner/{partner_id}` | ✅ Live |
| WS | `/api/ws/customer/{customer_id}` | ✅ Live |
| WS | `/api/ws/admin/moderation` | **✅ LIVE — Real-time AI moderation** |
| POST | `/api/admin/moderation/simulate` | ✅ Live (test helper) |
| GET | `/api/admin/moderation/status` | ✅ Live |

---

## Environment Variables

File: `/app/backend/.env`

| Variable | Purpose | Status |
|----------|---------|--------|
| `MONGO_URL` | Legacy — required by platform infra | Keep, not used by app |
| `DB_NAME` | Legacy — required by platform infra | Keep, not used by app |
| `SUPABASE_URL` | Supabase project URL | Configured |
| `SUPABASE_SECRET_KEY` | Supabase service role key | Configured |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase anon key | Configured |
| `SUPABASE_DB_PASSWORD` | Direct PostgreSQL (blocked by firewall) | Configured |
| `JWT_SECRET` | JWT signing secret | Configured |
| `EMERGENT_LLM_KEY` | Universal LLM key (OpenAI + Gemini + Anthropic) | Configured |
| `STRIPE_SECRET_KEY` | Stripe key | Configured |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | Configured |

### Credentials Still Needed (from PM)
```env
APPLE_MAPKIT_TEAM_ID=XXXXXXXXXX       # Apple Developer Team ID
APPLE_MAPKIT_KEY_ID=XXXXXXXXXX        # MapKit JS Key ID
APPLE_MAPKIT_PRIVATE_KEY=-----BEGIN   # .p8 key contents (for token endpoint)
```

---

## Priority Work for Andrew

### 1. Run Supabase Migration (5 min — UNBLOCKS EVERYTHING)
Go to Supabase Dashboard → SQL Editor → paste `sql/supabase_migration.sql` → Run.
Tables created: `users`, `partners`, `partner_locations`, `offers`, `trips`, `trip_gems`, `road_reports`, `events`, `challenges`, `notifications`, `boosts`, `analytics_events`

### 2. Connect Routes to Supabase (After migration)
`supabase_service.py` already has CRUD functions. Update routes to use them:
```python
# Example: routes/offers.py
# Before (mock):
return mock_data.offers_db

# After (Supabase):
from services.supabase_service import get_offers
result = await get_offers()
return result
```

### 3. Apple Maps Token Endpoint (For Kathir & Brian)
```python
# Add to routes/navigation.py
@router.get("/api/maps/token")
def get_mapkit_token():
    import jwt, time
    payload = {
        "iss": os.environ.get("APPLE_MAPKIT_TEAM_ID"),
        "iat": int(time.time()),
        "exp": int(time.time()) + 3600,
        "origin": "*"
    }
    token = jwt.encode(payload, os.environ.get("APPLE_MAPKIT_PRIVATE_KEY"),
                       algorithm="ES256",
                       headers={"kid": os.environ.get("APPLE_MAPKIT_KEY_ID")})
    return {"success": True, "token": token}
```

### 4. Wire Stripe Webhooks
`routes/webhooks.py` already has the handler skeleton at `POST /api/webhooks/stripe`. Connect it to real Stripe events.

---

## Running Tests

```bash
cd /app/backend
python -m pytest tests/ -v

# Test Orion AI (LIVE)
curl -X POST $BACKEND_URL/api/orion/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"How can I save fuel?","session_id":"test"}'

# Test Supabase status
curl $BACKEND_URL/api/admin/supabase/status

# Test WebSocket moderation (simulate incident)
curl -X POST $BACKEND_URL/api/admin/moderation/simulate
```

---

*Document owner: Andrew (Backend Lead) | Last updated: February 2026*
