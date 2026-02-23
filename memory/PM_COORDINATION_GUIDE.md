# SnapRoad PM Coordination Guide
## Supporting Andrew, Brian & Kathir

> **Your Role**: Unblock your team by providing credentials, coordinating dependencies, and tracking progress.
> **Updated**: February 2026

---

## Team Overview

| Team Member | Role | Focus Area | Guide |
|-------------|------|------------|-------|
| **Andrew** | Backend Lead | Supabase migration, API routes, Apple Maps token, Stripe backend | `ANDREW_BACKEND_GUIDE.md` |
| **Brian** | Web Lead | Admin Dashboard, Partner Dashboard, Driver App, Stripe frontend | `BRIAN_WEB_GUIDE.md` |
| **Kathir** | Mobile Lead | React Native app, Apple Maps native, EAS Build, push notifications | `KATHIR_MOBILE_GUIDE.md` |

---

## Current Application Status

### What's LIVE (Real Data)
| Feature | Details |
|---------|---------|
| **Orion AI Coach (GPT-5.2)** | Real AI responses at `/api/orion/chat` |
| **Photo Privacy Analysis** | Real OpenAI Vision at `/api/photo/analyze` |
| **Supabase Auth** | Real login/signup — users created in Supabase |
| **Admin AI Moderation** | Real-time WebSocket incident feed |

### What's MOCKED (Pending Supabase Migration)
Everything else — offers, trips, gems, partners, leaderboard, analytics, gamification. All endpoints exist and work, just returning in-memory demo data.

### The ONE Blocker for Everything
**Run the Supabase database migration** (5 minutes, no code changes):
1. Open Supabase Dashboard → SQL Editor
2. Paste `/app/backend/sql/supabase_migration.sql`
3. Click Run → 12 tables created → all mock data automatically replaced

---

## Recent Completions (February 2026)

| Feature | Who | Status |
|---------|-----|--------|
| Backend refactored into 11 modular route files (60+ endpoints) | Andrew | ✅ Done |
| Supabase Auth connected | Andrew | ✅ Done |
| Admin Dashboard rebuilt — 6 tabs, AI Moderation | Brian | ✅ Done |
| Partner Dashboard rebuilt — 8 tabs, Finance, Referrals | Brian | ✅ Done |
| Phone Preview Page (`/preview`) | Brian | ✅ Done |
| 42-screen mobile app built | Kathir | ✅ Done |
| Mobile animation crash fixed (`useNativeDriver` web compat) | Kathir | ✅ Done |
| Mobile app exports cleanly for web | Kathir | ✅ Done |

---

## Credentials PM Needs to Provide

### 1. Apple Developer Account (For Kathir — Builds & Maps)
**Purpose**: App Store distribution + MapKit JS credentials  
**URL**: https://developer.apple.com  
**Action**:
1. Enroll in Apple Developer Program ($99/year)
2. Go to **Certificates, Identifiers & Profiles** → **Keys**
3. Create a key with **MapKit JS** enabled
4. Download the .p8 key file (one-time download!)
5. Note: **Team ID** (Membership page), **Key ID** (key details), **Private Key** (.p8 contents)
6. Give Team ID + Key ID + Private Key to **Andrew** (for `/api/maps/token` endpoint)
7. **Kathir does NOT need MapKit credentials** — backend generates tokens

**Cost**: $99/year (includes App Store + MapKit JS)

---

### 2. Stripe (For Andrew + Brian)
**URL**: https://dashboard.stripe.com  
**Action**:
1. Create account, go to **Developers → API Keys**
2. Give `Secret key` (sk_test_...) → **Andrew** as `STRIPE_SECRET_KEY`
3. Give `Publishable key` (pk_test_...) → **Brian** as `VITE_STRIPE_PUBLISHABLE_KEY`
4. Create Products/Prices:

| Product | Price | Type |
|---------|-------|------|
| Driver Premium | $4.99/month | Recurring |
| Partner Starter | $29/month | Recurring |
| Partner Growth | $79/month | Recurring |
| Partner Enterprise | Custom | Custom |
| Basic Boost | $9.99 | One-time |
| Standard Boost | $19.99 | One-time |
| Premium Boost | $39.99 | One-time |

5. Set up Webhook → `https://your-domain.com/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`
   - Give Signing Secret → **Andrew** as `STRIPE_WEBHOOK_SECRET`

**Cost**: 2.9% + $0.30 per transaction

---

### 3. Expo (For Kathir — Push Notifications + EAS)
**URL**: https://expo.dev  
**Action**:
1. Create account at expo.dev
2. Create a new project
3. Give `Project ID` → **Kathir** as `EXPO_PUBLIC_PUSH_NOTIFICATION_PROJECT_ID`

**Note**: EAS Build project ID is already configured in `/app/snaproad-mobile/app.json`  
```json
"extra": { "eas": { "projectId": "367755bb-8925-4849-9958-1ad5bd0d0567" } }
```

**Cost**: Free for development

---

### 4. Google Play Console (For Kathir — Android)
**URL**: https://play.google.com/console  
**Cost**: $25 one-time

---

## Credential Distribution Summary

```
=== ANDREW (Backend .env) ===
APPLE_MAPKIT_TEAM_ID=XXXXXXXXXX
APPLE_MAPKIT_KEY_ID=XXXXXXXXXX
APPLE_MAPKIT_PRIVATE_KEY=[.p8 contents]
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
# Already configured: SUPABASE_URL, SUPABASE_SECRET_KEY, EMERGENT_LLM_KEY, JWT_SECRET

=== BRIAN (Frontend .env) ===
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
VITE_STRIPE_PRICE_DRIVER_PREMIUM=price_xxxxx
VITE_STRIPE_PRICE_PARTNER_STARTER=price_xxxxx
VITE_STRIPE_PRICE_PARTNER_GROWTH=price_xxxxx
# Already configured: REACT_APP_BACKEND_URL, VITE_API_URL

=== KATHIR (Mobile .env) ===
EXPO_PUBLIC_API_URL=https://your-backend-url.com
EXPO_PUBLIC_PUSH_NOTIFICATION_PROJECT_ID=xxxxx
# NO MapKit credentials needed — backend handles tokens
```

---

## Coordination Flow

```
PM
├── Runs Supabase SQL migration → UNBLOCKS everything
│
├── Provides Stripe keys to Andrew + Brian
│   └── Andrew wires Stripe backend
│       └── Brian connects Partner boost/subscription UI
│
└── Provides Apple credentials to Andrew
    └── Andrew creates /api/maps/token
        ├── Brian adds Apple Maps to web driver app
        └── Kathir adds real MapView to mobile app
```

### Sync Points

| Week | Event | Participants |
|------|-------|-------------|
| Now | **Run Supabase migration** | PM |
| Week 1 | Andrew adds `/api/maps/token` | Andrew → unblocks Kathir + Brian |
| Week 1 | Andrew wires Stripe backend | Andrew → unblocks Brian |
| Week 2 | Brian connects Stripe checkout UI | Brian |
| Week 2 | Kathir adds real MapView + directions | Kathir |
| Week 3 | EAS Build for iOS TestFlight | Kathir + PM |

---

## Feature Status Matrix

| Feature | Backend | Web | Mobile | Live Data |
|---------|:-------:|:---:|:------:|:---------:|
| Auth (login/signup) | ✅ | ✅ | ✅ | ✅ Supabase |
| Driver onboarding | ✅ | ✅ | ✅ | ❌ Mock |
| Map + offers | ✅ | ✅ | ✅ | ❌ Mock |
| Gem collection | ✅ | ✅ | ✅ | ❌ Mock |
| Trips + fuel | ✅ | ✅ | ✅ | ❌ Mock |
| Safety score | ✅ | ✅ | ✅ | ❌ Mock |
| Leaderboard | ✅ | ✅ | ✅ | ❌ Mock |
| Challenges | ✅ | ✅ | ✅ | ❌ Mock |
| Orion AI Coach | ✅ | ✅ | ✅ | ✅ **LIVE** |
| Photo blur AI | ✅ | ✅ | ✅ | ✅ **LIVE** |
| Admin AI Moderation | ✅ | ✅ | ✅ | ✅ **LIVE** |
| Partner boosts | ✅ | ✅ | — | ❌ Needs Stripe |
| Stripe payments | Skeleton | Skeleton | — | ❌ Needs keys |
| Apple Maps | ❌ | ❌ | ❌ | ❌ Needs creds |
| Push notifications | — | — | ❌ | ❌ Needs Expo |

---

## Cost Summary

| Service | Free Tier | Est. Monthly |
|---------|-----------|-------------|
| Supabase | 500MB + 50K MAU | $0 (dev) |
| Emergent LLM Key (OpenAI) | N/A | Per-usage |
| Apple Developer | N/A | $99/year |
| Stripe | None | 2.9% + $0.30/txn |
| Expo / EAS | Limited builds | $0 (dev) / ~$30 (prod) |
| Google Play | N/A | $25 one-time |

---

*Document owner: PM | Last updated: February 2026*
