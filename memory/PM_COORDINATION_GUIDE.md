# SnapRoad PM Coordination Guide
## Supporting Andrew, Brian & Kathir

> **Your Role**: Unblock your team by providing credentials, coordinating dependencies, and ensuring smooth handoffs between workstreams.

---

## Team Overview

| Team Member | Role | Focus Area | Guide |
|-------------|------|------------|-------|
| **Andrew** | Backend Lead | Database, Auth, Payments, Apple Maps Token API | `ANDREW_BACKEND_GUIDE.md` |
| **Brian** | Web Lead | Partner Dashboard, Stripe UI, QR Scanning, Driver App | `BRIAN_WEB_GUIDE.md` |
| **Kathir** | Mobile Lead | iOS App, Apple Maps Navigation, Push Notifications | `KATHIR_MOBILE_GUIDE.md` |

---

## New Features Added (Latest Session)

### For All Team Members to Know:
1. **Trip Analytics** - Driver can view trip history, fuel savings, and performance stats
2. **Route History 3D** - Interactive route visualization showing most-traveled routes
3. **Offer Boosting** - Partners can pay to boost offer visibility (Basic/Standard/Premium tiers)
4. **Collapsible Offers Panel** - Map overlay showing nearby offers with filters

### Feature Status:
| Feature | Backend | Web Frontend | Mobile | Notes |
|---------|---------|-------------|--------|-------|
| Trip Analytics | Mocked | Done | Done | Needs MongoDB for real data |
| Route History 3D | Mocked | Done | Done | Needs MongoDB for real data |
| Offer Boosting | Mocked | Partial | N/A | Needs Stripe for payments |
| Orion AI Coach | **LIVE** | Done | Done | GPT-5.2 via Emergent |
| Photo Analysis | **LIVE** | Done | N/A | OpenAI Vision |

---

## Account Setup (PM Tasks)

### 1. Apple Developer Account (For Kathir - Maps & App Store)
**What**: Required for Apple Maps MapKit JS credentials AND App Store distribution
**URL**: https://developer.apple.com
**Action**:
1. Enroll in Apple Developer Program ($99/year)
2. Go to **Certificates, Identifiers & Profiles** > **Keys**
3. Create a new key with **MapKit JS** enabled
4. Download the .p8 key file (one-time download!)
5. Note these values:
   - **Team ID**: Found on the Membership page
   - **Key ID**: Shown on the key details page
   - **Private Key**: Contents of the .p8 file
6. Give Team ID, Key ID, and Private Key to **Andrew** for backend token generation
7. **Kathir does NOT need MapKit credentials** - the backend handles tokens

**Note**: Basic map display (showing the map, user location, markers) works FREE on iOS via `react-native-maps`. The MapKit JS credentials are only for directions, search, and ETA APIs.

**Cost**: $99/year (includes App Store access + MapKit JS)

---

### 2. Stripe (For Andrew & Brian)
**What**: Payment processing for boost purchases and subscriptions
**URL**: https://dashboard.stripe.com
**Action**:
1. Create account at stripe.com
2. Go to **Developers > API Keys**:
   - `Secret key` (sk_test_...) -> Give to **Andrew** as `STRIPE_SECRET_KEY`
   - `Publishable key` (pk_test_...) -> Give to **Brian** as `VITE_STRIPE_PUBLISHABLE_KEY`
3. Set up Webhook endpoint for subscription events
4. Create Products/Prices for boost packages:
   - Basic Boost: $9.99 one-time
   - Standard Boost: $19.99 one-time
   - Premium Boost: $39.99 one-time

**Cost**: 2.9% + $0.30 per transaction

---

### 3. MongoDB (For Andrew)
**What**: Database for all application data
**Action**: Already configured in the environment. Andrew needs to enable it in `.env`:
```env
MONGO_URL=mongodb://...
DB_NAME=snaproad
```

---

### 4. Expo (For Kathir)
**What**: React Native build & push notifications
**URL**: https://expo.dev
**Action**:
1. Create account at expo.dev
2. Copy `Project ID` -> Give to Kathir as `EXPO_PUBLIC_PUSH_NOTIFICATION_PROJECT_ID`

**Cost**: Free for development

---

### 5. Google Play Console (For Kathir - Android)
**What**: Required for Play Store distribution
**URL**: https://play.google.com/console
**Cost**: $25 one-time

---

## Credential Distribution

```
=== ANDREW (Backend) ===
APPLE_MAPKIT_TEAM_ID=XXXXXXXXXX        # From Apple Developer
APPLE_MAPKIT_KEY_ID=XXXXXXXXXX         # From MapKit JS key
APPLE_MAPKIT_PRIVATE_KEY=[.p8 contents] # For token generation
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
MONGO_URL=mongodb://...                 # Already available

=== BRIAN (Web) ===
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx

=== KATHIR (Mobile) ===
API_URL=https://api.snaproad.com/api
EXPO_PUBLIC_PUSH_NOTIFICATION_PROJECT_ID=xxxxx
# NO MapKit credentials needed - backend handles tokens
```

---

## Coordination Points

### Critical Dependencies

```
                    ┌─────────────┐
                    │   ANDREW    │
                    │  (Backend)  │
                    └──────┬──────┘
                           │
              APIs Ready   │   Apple Maps Token
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               │               ▼
    ┌─────────────┐        │        ┌─────────────┐
    │    BRIAN    │        │        │   KATHIR    │
    │    (Web)    │        │        │  (Mobile)   │
    └─────────────┘        │        └─────────────┘
                           │
                    QR Code Format
                    (Must Match!)
```

### Key Sync Points:
1. **Week 1**: Andrew creates `/api/maps/token` endpoint -> unblocks Kathir's directions feature
2. **Week 1**: Andrew migrates auth to MongoDB -> unblocks Brian & Kathir API integration
3. **Week 2**: Andrew connects Stripe -> unblocks Brian's boost payment UI
4. **Week 2**: QR code format agreement between all three

---

## Cost Summary (Monthly Estimates)

| Service | Free Tier | Expected Cost |
|---------|-----------|---------------|
| Apple Developer | N/A | $99/year |
| Apple MapKit JS | 250K service calls/day | $0 (included in Dev Program) |
| MongoDB | 512MB free | $0 (dev) / $25 (prod) |
| Stripe | No monthly fee | 2.9% + $0.30 per transaction |
| Expo/EAS | Limited builds | $0 (dev) / ~$30 (prod) |
| Google Play | N/A | $25 one-time |

**Estimated Monthly (Production)**: ~$55 + transaction fees
*(Apple Maps is free with Developer Program - lower cost than Mapbox!)*

---

## Quick Reference: Who Needs What

| Credential | Andrew | Brian | Kathir |
|------------|:------:|:-----:|:------:|
| Apple MapKit Creds | Yes (token gen) | | |
| Stripe Secret Key | Yes | | |
| Stripe Publishable Key | | Yes | |
| MongoDB URL | Yes | | |
| Expo Project ID | | | Yes |
| Apple Developer Creds | | | Yes (builds) |

---

**Questions? You're the coordinator - reach out to each developer based on their expertise!**
