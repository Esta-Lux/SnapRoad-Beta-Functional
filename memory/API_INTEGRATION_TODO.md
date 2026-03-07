# SnapRoad - API Integration TODO List
> **Status**: Backend modular + Supabase-ready. Auth LIVE. Data layer mock pending DB migration.
> **Last Updated**: February 2026

---

## Current State Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Web Frontend (React) | ✅ Complete | All dashboards + Driver App functional |
| Mobile App (React Native) | ✅ Complete | 42 screens, navigation wired, build working |
| Backend (FastAPI — Modular) | ✅ Complete | 11 route files, 60+ endpoints |
| Supabase Auth | ✅ LIVE | Real signup/login working |
| Supabase DB Tables | ❌ Pending | Run `sql/supabase_migration.sql` in SQL Editor |
| Mock Data (fallback) | ✅ Active | All routes fall back to `services/mock_data.py` |
| Orion AI Coach (GPT-5.2) | ✅ LIVE | Real AI responses |
| Photo Analysis (OpenAI Vision) | ✅ LIVE | Real face/plate blur detection |
| Admin WebSocket Moderation | ✅ LIVE | Real-time incident feed |
| Stripe Payments | ❌ Skeleton | Handler exists, not wired |
| Apple Maps MapKit | ❌ Pending | Needs Apple Developer credentials from PM |
| Push Notifications | ❌ Pending | Needs Expo project setup |

---

## 🔴 P0 - Critical (Must Have for Launch)

### 1. Run Supabase Database Migration
**Owner**: PM  
**Time**: 5 minutes  
**Action**: Open Supabase Dashboard → SQL Editor → paste `sql/supabase_migration.sql` → Run

**What happens after**: All 12 tables created. `supabase_service.py` automatically starts using real data. No code changes needed.

Tables: `users`, `partners`, `partner_locations`, `offers`, `trips`, `trip_gems`, `road_reports`, `events`, `challenges`, `notifications`, `boosts`, `analytics_events`

---

### 2. Connect Backend Routes to Supabase
**Owner**: Andrew  
**Depends On**: #1 (migration run)  
**Time**: 2-3 days

`supabase_service.py` already has all CRUD functions. Update each route file to call them:

```python
# routes/offers.py — example pattern
# Before (mock):
return mock_data.offers_db

# After (Supabase):
from services.supabase_service import get_offers
result = await get_offers()
return result
```

**Routes to update** (in priority order):
- [ ] `routes/auth.py` — write user to DB on signup
- [ ] `routes/users.py` — user profile, stats, cars, settings
- [ ] `routes/offers.py` — offers CRUD + geospatial nearby
- [ ] `routes/partners.py` — partner profile, locations, v2 team/referrals
- [ ] `routes/gamification.py` — XP, badges, challenges, gems
- [ ] `routes/trips.py` — trip records, fuel logs
- [ ] `routes/admin.py` — analytics events, user management
- [ ] `routes/social.py` — friends, road reports

---

### 3. Apple Maps MapKit Token Endpoint
**Owner**: Andrew (after PM provides credentials)  
**Depends On**: PM provides Apple Developer keys

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
    token = jwt.encode(payload,
        os.environ.get("APPLE_MAPKIT_PRIVATE_KEY"),
        algorithm="ES256",
        headers={"kid": os.environ.get("APPLE_MAPKIT_KEY_ID")})
    return {"success": True, "token": token}
```

**Files to modify**: `routes/navigation.py`, `backend/.env`  
**Env vars needed**: `APPLE_MAPKIT_TEAM_ID`, `APPLE_MAPKIT_KEY_ID`, `APPLE_MAPKIT_PRIVATE_KEY`

---

## 🟠 P1 - Important (Should Have)

### 4. Stripe Payment Integration
**Owner**: Andrew (backend) + Brian (frontend)  
**Depends On**: Stripe keys from PM

**Backend** (Andrew): Wire `routes/webhooks.py` Stripe handler to real events.  
New endpoints needed:
```
POST /api/payments/create-checkout-session
POST /api/payments/create-portal-session
GET  /api/payments/subscription
POST /api/payments/cancel-subscription
```

**Frontend** (Brian): Connect partner boost UI + subscription UI to checkout. Env vars: `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_STRIPE_PRICE_*`

---

### 5. Apple Maps on Web Frontend
**Owner**: Brian  
**Depends On**: Andrew's `/api/maps/token` endpoint

Replace OpenStreetMap/CartoDB tiles in `DriverApp` with Apple MapKit JS:
```javascript
// Fetch token from backend
const { token } = await fetch('/api/maps/token').then(r => r.json());
// Init MapKit JS
mapkit.init({ authorizationCallback: (done) => done(token) });
```

---

### 6. Apple Maps on Mobile
**Owner**: Kathir  
**Depends On**: Andrew's `/api/maps/token` endpoint

Add `react-native-maps` with `PROVIDER_DEFAULT` for native Apple Maps on iOS.  
Requires EAS dev build (not Expo Go).

```tsx
import MapView, { PROVIDER_DEFAULT } from 'react-native-maps';
<MapView provider={PROVIDER_DEFAULT} showsUserLocation showsTraffic />
```

---

### 7. Real-Time Trip Telemetry
**Owner**: Kathir (mobile) + Andrew (backend)

New endpoints needed:
```
POST /api/trips/telemetry   → Real-time driving data
POST /api/trips/events      → Hard brake, acceleration events
```

Mobile: Use Expo Location for GPS tracking during navigation.

---

### 8. Push Notifications
**Owner**: Kathir  
**Depends On**: Expo project ID from PM

New endpoint (Andrew):
```
POST /api/notifications/register-device
```

Mobile: Use `expo-notifications` library.

---

## 🟡 P2 - Nice to Have

### 9. Gas Price API
Replace mock fuel prices with real data.  
Options: GasBuddy API, CollectAPI, government fuel price feeds.

**Files**: `routes/trips.py` → `GET /api/fuel/prices`

---

### 10. Email Notifications
**Owner**: Andrew  
Options: SendGrid, Postmark, AWS SES

New endpoints:
```
POST /api/email/send
POST /api/notifications/register-device
```

---

### 11. Geospatial Queries for Offers
After migration, update `GET /api/offers/nearby` to use PostGIS:
```sql
SELECT *, ST_Distance(location, ST_MakePoint($lng, $lat)) as distance
FROM offers
WHERE ST_DWithin(location, ST_MakePoint($lng, $lat), $radius)
ORDER BY distance;
```

---

### 12. QR Code Redemption Flow
**Owner**: Brian (web scanner) + Andrew (verify endpoint)

`POST /api/partner/v2/redeem` endpoint already exists (mock).  
Connect to real QR verification with:
- Geofence check (customer within X meters of partner location)
- One-time use validation
- Gem award transaction

---

## 🔵 P3 - Future

- EAS Build for App Store (iOS + Android distribution)
- OpenAI Whisper for voice recognition
- ElevenLabs for Orion voice synthesis
- Sentry for error tracking
- Firebase Analytics / Mixpanel
- Friend referral system
- Head-to-head live challenges (WebSocket)
- Community events system
- A/B testing for offers

---

## What's Already Done ✅

| Item | Notes |
|------|-------|
| Database choice (Supabase) | Connected, Auth working |
| User auth (signup/login) | Supabase Auth LIVE |
| JWT auth middleware | `middleware/auth.py` |
| All API endpoints | 60+ endpoints in 11 route files |
| Admin user list | Supabase Auth API |
| Supabase migration SQL | Ready to run in SQL Editor |
| WebSocket (admin moderation) | Real-time, LIVE |
| WebSocket (partner) | Live |
| Orion AI Coach | LIVE — GPT-5.2 |
| Photo Analysis | LIVE — OpenAI Vision |
| Offer export/import | Functional |
| Boost pricing calculator | Functional |
| Partner team/referrals API | Wired (mock data) |
| QR redemption endpoint | Wired (mock data) |
| All mobile screens (42) | Built and wired |
| Admin Dashboard rebuild | 6 tabs + AI Moderation |
| Partner Dashboard rebuild | 8 tabs |
| Phone Preview Page | `/preview` route |
| Mobile animation crash fix | `useNativeDriver` web compat |

---

## Testing Credentials

| Role | Email | Password |
|------|-------|----------|
| Driver | `driver@snaproad.com` | `password123` |
| Partner | `partner@snaproad.com` | `password123` |
| Admin | `admin@snaproad.com` | `password123` |

---

*Last Updated: February 2026*
