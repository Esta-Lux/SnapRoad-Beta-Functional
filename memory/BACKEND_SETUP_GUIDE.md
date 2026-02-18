# SnapRoad - Backend Setup Guide for Andrew (Backend Lead)

> **PM Action Items** and **Developer Setup Instructions**

---

## 🎯 PM Checklist - Accounts to Create & Credentials to Share

As PM, you need to create these accounts and share credentials with Andrew:

### 1. Supabase (Database + Auth)
**PM Action:**
- [ ] Go to [supabase.com](https://supabase.com) → Sign up
- [ ] Create new project: "SnapRoad Production"
- [ ] Wait for project to provision (~2 mins)

**Credentials to share with Andrew:**
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc... (public key)
SUPABASE_SERVICE_KEY=eyJhbGc... (secret - server only)
DATABASE_URL=postgresql://postgres:[password]@db.xxxxx.supabase.co:5432/postgres
```

**Where to find:**
- Supabase Dashboard → Project Settings → API → Project URL & Keys
- Supabase Dashboard → Project Settings → Database → Connection String

---

### 2. Stripe (Payments)
**PM Action:**
- [ ] Go to [stripe.com](https://stripe.com) → Sign up
- [ ] Complete business verification
- [ ] Create products in Stripe Dashboard:

| Product | Price | Type |
|---------|-------|------|
| Driver Premium | $4.99/month | Subscription |
| Partner Starter (Founders) | $20.99/month | Subscription |
| Partner Starter (Public) | $34.99/month | Subscription |
| Partner Growth (Founders) | $49.99/month | Subscription |
| Partner Growth (Public) | $79.99/month | Subscription |
| Boost Credits | Variable | One-time |

**Credentials to share with Andrew:**
```
STRIPE_SECRET_KEY=sk_test_... (from Stripe Dashboard → Developers → API Keys)
STRIPE_PUBLISHABLE_KEY=pk_test_... (same location)
STRIPE_WEBHOOK_SECRET=whsec_... (created after webhook setup)
```

**Where to find:**
- Stripe Dashboard → Developers → API Keys
- Use TEST keys for development (sk_test_..., pk_test_...)
- Use LIVE keys for production (sk_live_..., pk_live_...)

---

### 3. Gas Price API
**Options (PM to choose one):**

**Option A: CollectAPI (Recommended - Easy)**
- [ ] Go to [collectapi.com](https://collectapi.com/api/gasPrice/gas-prices-api)
- [ ] Sign up → Subscribe to Gas Prices API
- [ ] Free tier: 100 requests/month

```
GAS_PRICE_API_KEY=your-collect-api-key
GAS_PRICE_API_URL=https://api.collectapi.com/gasPrice/
```

**Option B: GasBuddy (More Data)**
- [ ] Contact GasBuddy for API access: [developer.gasbuddy.com](https://developer.gasbuddy.com)
- [ ] Requires business application

**Option C: Gas Price Scraping (Free but complex)**
- No API key needed
- Andrew will implement web scraping

---

### 4. Apple Maps MapKit JS (Directions & Search)
**PM Action:**
- [ ] Go to [developer.apple.com](https://developer.apple.com) → Certificates, Identifiers & Profiles → Keys
- [ ] Create a key with MapKit JS enabled
- [ ] Download the .p8 key file (one-time download!)

**Credentials to share (to Andrew for backend token generation):**
```
APPLE_MAPKIT_TEAM_ID=XXXXXXXXXX       # From Membership page
APPLE_MAPKIT_KEY_ID=XXXXXXXXXX        # From key details
APPLE_MAPKIT_PRIVATE_KEY=[.p8 contents]  # For JWT signing
```

**Note:** Basic map display works FREE on iOS (no credentials needed). These are only for directions/search/ETA APIs.

---

### 5. SendGrid (Emails - Optional)
**PM Action:**
- [ ] Go to [sendgrid.com](https://sendgrid.com) → Sign up
- [ ] Verify sender email domain
- [ ] Create API key

**Credentials to share:**
```
SENDGRID_API_KEY=SG.xxxxx
FROM_EMAIL=noreply@snaproad.com
```

---

## 📋 Complete Credentials Template for Andrew

Create a secure document (1Password, LastPass, or encrypted file) with:

```env
# ===========================================
# SUPABASE (Database + Auth)
# ===========================================
SUPABASE_URL=https://[project-id].supabase.co
SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_KEY=[your-service-key]
DATABASE_URL=postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres

# ===========================================
# STRIPE (Payments)
# ===========================================
STRIPE_SECRET_KEY=sk_test_[your-key]
STRIPE_PUBLISHABLE_KEY=pk_test_[your-key]
STRIPE_WEBHOOK_SECRET=whsec_[will-be-created-later]

# Stripe Product IDs (Andrew will create these)
STRIPE_PRICE_DRIVER_PREMIUM=price_xxxxx
STRIPE_PRICE_PARTNER_STARTER=price_xxxxx
STRIPE_PRICE_PARTNER_GROWTH=price_xxxxx

# ===========================================
# GAS PRICE API
# ===========================================
GAS_PRICE_API_KEY=[your-api-key]
GAS_PRICE_API_URL=https://api.collectapi.com/gasPrice/

# ===========================================
# APPLE MAPS MapKit JS (Backend Token Generation)
# ===========================================
APPLE_MAPKIT_TEAM_ID=[your-team-id]
APPLE_MAPKIT_KEY_ID=[your-key-id]
APPLE_MAPKIT_PRIVATE_KEY=[your-p8-private-key-contents]

# ===========================================
# SENDGRID (Emails)
# ===========================================
SENDGRID_API_KEY=SG.[your-key]
FROM_EMAIL=noreply@snaproad.com

# ===========================================
# APP CONFIG
# ===========================================
JWT_SECRET=[generate-random-256-bit-string]
ENVIRONMENT=development
```

---

## 🔧 Andrew's Backend Tasks

### Phase 1: Database Setup (Supabase)
```
1. Connect to Supabase project
2. Create database tables (schema in /app/memory/DEPLOYMENT_SCOPE.md):
   - users
   - partners  
   - partner_locations
   - offers
   - redemptions
   - badges
   - user_badges
   - challenges
   - trips
   - boosts

3. Set up Row Level Security (RLS) policies
4. Create database functions for complex queries
```

### Phase 2: Authentication
```
1. Configure Supabase Auth
2. Set up email/password auth
3. Add Google OAuth (optional)
4. Add Apple OAuth for iOS (required for App Store)
5. Implement JWT validation in FastAPI middleware
```

### Phase 3: Stripe Integration
```
1. Install stripe package: pip install stripe
2. Create checkout sessions for subscriptions
3. Implement webhook handler for:
   - checkout.session.completed
   - customer.subscription.updated
   - customer.subscription.deleted
   - invoice.payment_failed
4. Create customer portal for subscription management
5. Implement boost payment (one-time charges)
```

### Phase 4: Webhook Setup
```
1. Create webhook endpoint: POST /api/webhooks/stripe
2. Verify webhook signatures
3. Handle events and update database
4. Set up webhook in Stripe Dashboard:
   - URL: https://api.snaproad.com/api/webhooks/stripe
   - Events: checkout.session.completed, customer.subscription.*, invoice.*
```

### Phase 5: Gas Price API
```
1. Create service for gas price fetching
2. Implement caching (Redis or in-memory) with 1-hour TTL
3. Create endpoint: GET /api/gas-prices?lat=&lng=
4. Calculate fuel savings based on trip distance
```

---

## 🗂️ Files Andrew Will Modify

| File | Changes |
|------|---------|
| `/app/backend/server.py` | Replace mock data with Supabase queries |
| `/app/backend/.env` | Add all credentials |
| `/app/backend/requirements.txt` | Add: supabase, stripe, httpx |

**New files to create:**
```
/app/backend/
├── services/
│   ├── supabase.py      # Database client
│   ├── stripe_service.py # Payment logic
│   ├── gas_prices.py     # Gas price fetching
│   └── auth.py           # JWT validation
├── routes/
│   ├── auth.py           # Auth endpoints
│   ├── payments.py       # Stripe endpoints
│   └── webhooks.py       # Webhook handlers
└── models/
    └── schemas.py        # Pydantic models
```

---

## 🔗 Useful Links for Andrew

- **Supabase Python Docs**: https://supabase.com/docs/reference/python/introduction
- **Stripe Python Docs**: https://stripe.com/docs/api?lang=python
- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **Stripe Webhooks Guide**: https://stripe.com/docs/webhooks

---

## ⚠️ Security Notes

1. **NEVER commit .env files to Git**
2. Use `.env.example` as a template (already created)
3. Store production secrets in:
   - Supabase Vault
   - AWS Secrets Manager
   - Or environment variables in hosting platform

4. **Webhook security:**
   - Always verify Stripe webhook signatures
   - Use HTTPS only
   - Implement idempotency for webhook handlers

---

## 📞 Quick Reference

| Service | Dashboard URL |
|---------|--------------|
| Supabase | https://app.supabase.com |
| Stripe | https://dashboard.stripe.com |
| Mapbox | https://account.mapbox.com |
| SendGrid | https://app.sendgrid.com |
| CollectAPI | https://collectapi.com/dashboard |

---

**Questions?** Refer to `/app/memory/DEPLOYMENT_SCOPE.md` for full API endpoint documentation.
