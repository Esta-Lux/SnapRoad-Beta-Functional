# SnapRoad Backend Developer Guide
## For Andrew (Backend Lead)

> **Tech Stack**: FastAPI + MongoDB + Stripe + Python 3.10+
> **Current State**: UI complete with mock data - needs real API integration
> **Maps**: Apple Maps MapKit JS (for server-side directions/search/ETA)

---

## Current Architecture

```
/app/backend/
├── server.py                     # Main FastAPI server (monolithic, ~3700 lines)
├── .env                          # Environment variables
├── requirements.txt              # Python dependencies
├── services/
│   ├── orion_coach.py            # AI driving coach (LIVE - GPT-5.2 via Emergent LLM)
│   ├── photo_analysis.py         # AI face/plate detection (LIVE - OpenAI Vision)
│   ├── partner_service.py        # Partner operations (MOCKED)
│   └── websocket_manager.py      # Real-time WebSocket notifications
└── tests/
    └── test_server_pytest.py     # Existing tests
```

---

## New Features to Integrate (Backend Work)

### 1. Trip Analytics Service (Currently Mocked in server.py)
**Endpoints ready, data is generated at runtime:**
- `GET /api/trips/history/detailed?days=30` - Trip list with fuel analytics
- `GET /api/fuel/analytics` - Monthly fuel breakdown
- `GET /api/routes/history-3d?days=90` - Route data for 3D visualization

**TODO**: Replace `generate_sample_trips()` function in server.py with real MongoDB queries.
- Store trip data when drivers complete trips via `POST /api/trips/complete-with-safety`
- Aggregate fuel data per month
- Build route frequency from trip coordinates

### 2. Offer Boosting System (Currently Mocked in server.py)
**Endpoints ready:**
- `GET /api/partner/boosts/pricing` - Boost packages (Basic $9.99/24h, Standard $19.99/72h, Premium $39.99/7d)
- `POST /api/partner/boosts/create` - Create a boost for an offer
- `GET /api/partner/boosts/active` - Get active boosts for a partner
- `DELETE /api/partner/boosts/{offer_id}` - Cancel a boost
- `POST /api/partner/credits/add` - Add credits to partner account

**TODO**: Connect to Stripe for real payments, store boost records in MongoDB.

### 3. Apple Maps MapKit JS Integration (Backend Token Generation)
**Why backend?** Apple MapKit JS requires JWT tokens signed with your private key. Never expose the private key to the frontend or mobile app.

**Endpoint to create:**
```python
@app.get("/api/maps/token")
def get_mapkit_token():
    """Generate a short-lived JWT for Apple MapKit JS API calls."""
    import jwt
    import time

    team_id = os.environ.get("APPLE_MAPKIT_TEAM_ID")
    key_id = os.environ.get("APPLE_MAPKIT_KEY_ID")
    private_key = os.environ.get("APPLE_MAPKIT_PRIVATE_KEY")

    payload = {
        "iss": team_id,
        "iat": int(time.time()),
        "exp": int(time.time()) + 3600,  # 1 hour
        "origin": "*"  # Restrict in production
    }
    token = jwt.encode(payload, private_key, algorithm="ES256", headers={"kid": key_id})
    return {"success": True, "token": token}
```

**Apple Maps Server API endpoints your backend can proxy:**
- `GET https://maps-api.apple.com/v1/directions` - Turn-by-turn directions
- `GET https://maps-api.apple.com/v1/search` - Place search
- `GET https://maps-api.apple.com/v1/etas` - ETA calculations
- `GET https://maps-api.apple.com/v1/reverseGeocode` - Coordinates to address

---

## Environment Variables Needed

```env
# Already configured:
EMERGENT_LLM_KEY=sk-emergent-xxx       # For Orion AI Coach & Photo Analysis
MONGO_URL=mongodb://...                 # Database
DB_NAME=snaproad

# Needed from PM:
APPLE_MAPKIT_TEAM_ID=XXXXXXXXXX         # Apple Developer Team ID
APPLE_MAPKIT_KEY_ID=XXXXXXXXXX          # MapKit JS Key ID
APPLE_MAPKIT_PRIVATE_KEY=-----BEGIN...  # Contents of .p8 file
STRIPE_SECRET_KEY=sk_test_xxxxx         # For boost payments
STRIPE_WEBHOOK_SECRET=whsec_xxxxx       # For webhooks
```

---

## Recommended Migration Path

### Phase 1: Database Setup (MongoDB)
1. Enable MONGO_URL in .env
2. Create collections: `users`, `partners`, `trips`, `offers`, `boosts`, `redemptions`
3. Migrate the in-memory `users_db`, `offers_db`, `partners_db` to MongoDB
4. Keep mock data generators as seed scripts

### Phase 2: Trip & Fuel APIs
1. Store trip completions in `trips` collection
2. Build aggregation pipeline for fuel analytics
3. Build route frequency map from trip coordinates

### Phase 3: Partner & Boost APIs
1. Migrate partner_service.py from in-memory to MongoDB
2. Connect boost payments to Stripe (one-time charges)
3. Store boost records in `boosts` collection

### Phase 4: Apple MapKit Token API
1. Create `/api/maps/token` endpoint
2. Mobile/Web calls this to get signed JWT
3. Use JWT to call Apple Maps Server API directly from clients

---

## Testing

```bash
# Test boost pricing
curl https://YOUR_URL/api/partner/boosts/pricing

# Test creating a boost (admin offers bypass ownership check)
curl -X POST https://YOUR_URL/api/partner/boosts/create \
  -H "Content-Type: application/json" \
  -d '{"offer_id": 4, "boost_type": "basic", "use_credits": false}'

# Test trip history
curl "https://YOUR_URL/api/trips/history/detailed?days=30"

# Test route history
curl "https://YOUR_URL/api/routes/history-3d?days=90"

# Test Orion AI (live)
curl -X POST https://YOUR_URL/api/orion/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"How can I save fuel?","session_id":"test"}'
```

---

## Key API Contracts

| Method | Endpoint | Status | Notes |
|--------|----------|--------|-------|
| GET | `/api/trips/history/detailed` | Mocked | Needs MongoDB |
| GET | `/api/fuel/analytics` | Mocked | Needs MongoDB |
| GET | `/api/routes/history-3d` | Mocked | Needs MongoDB |
| GET | `/api/partner/boosts/pricing` | Mocked | Static data, ready |
| POST | `/api/partner/boosts/create` | Mocked | Needs Stripe |
| GET | `/api/partner/boosts/active` | Mocked | Needs MongoDB |
| POST | `/api/orion/chat` | **LIVE** | GPT-5.2 via Emergent |
| POST | `/api/photos/analyze` | **LIVE** | OpenAI Vision |

---

**Questions? Contact the PM for credentials or clarification.**
