# SnapRoad PM Coordination Guide
## Supporting Andrew, Brian & Kathir

> **Your Role**: Unblock your team by providing credentials, coordinating dependencies, and ensuring smooth handoffs between workstreams.

---

## Team Overview

| Team Member | Role | Focus Area | Guide |
|-------------|------|------------|-------|
| **Andrew** | Backend Lead | Database, Auth, Payments, APIs | `ANDREW_BACKEND_GUIDE.md` |
| **Brian** | Web Lead | Partner Dashboard, Stripe UI, QR Scanning | `BRIAN_WEB_GUIDE.md` |
| **Kathir** | Mobile Lead | iOS App, Maps, Navigation, Push Notifications | `KATHIR_MOBILE_GUIDE.md` |

---

## Phase 1: Account Setup (PM Tasks - Do First)

### 1.1 Supabase (For Andrew)
**What**: Database & Authentication platform
**URL**: https://supabase.com
**Action**:
1. Create account at supabase.com
2. Create new project named "SnapRoad"
3. Choose region closest to your users (e.g., US East)
4. Save the project password securely
5. Once created, go to **Settings > API** and copy:
   - `Project URL` → Give to Andrew as `SUPABASE_URL`
   - `service_role` key (secret) → Give to Andrew as `SUPABASE_SERVICE_KEY`
   - `anon` key (public) → Give to Brian as `SUPABASE_ANON_KEY`
6. Go to **Settings > Database** and copy:
   - `Connection string` → Give to Andrew as `DATABASE_URL`

**Cost**: Free tier is sufficient for development. ~$25/month for production.

---

### 1.2 Stripe (For Andrew & Brian)
**What**: Payment processing
**URL**: https://dashboard.stripe.com
**Action**:
1. Create account at stripe.com
2. Complete business verification (can use test mode until ready)
3. Go to **Developers > API Keys** and copy:
   - `Publishable key` (pk_test_...) → Give to **Brian** as `VITE_STRIPE_PUBLISHABLE_KEY`
   - `Secret key` (sk_test_...) → Give to **Andrew** as `STRIPE_SECRET_KEY`
4. Create Products/Prices in Stripe Dashboard:
   - **Driver Premium**: $9.99/month subscription
   - **Partner Starter**: $49/month subscription
   - **Partner Growth**: $149/month subscription
5. Copy each Price ID (price_xxx) → Give to Andrew
6. Set up Webhook:
   - Go to **Developers > Webhooks > Add Endpoint**
   - URL: `https://api.snaproad.com/api/webhooks/stripe` (update with real domain)
   - Events: `checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_failed`
   - Copy webhook signing secret → Give to Andrew as `STRIPE_WEBHOOK_SECRET`

**Cost**: 2.9% + $0.30 per transaction (no monthly fee)

---

### 1.3 Apple MapKit JS (For Kathir - Directions & Search)
**What**: Turn-by-turn directions and place search via Apple Maps
**URL**: https://developer.apple.com/account/
**Action**:
1. You need an **Apple Developer Account** ($99/year) - you'll need this for App Store anyway
2. Go to **Certificates, Identifiers & Profiles**
3. Navigate to **Keys** → Click **+** to create a new key
4. Check **MapKit JS** and give it a name like "SnapRoad MapKit"
5. Click **Continue** → **Register**
6. **Download the key file** (.p8) - you can only download once!
7. Note these values → Give to **Kathir**:
   - **Team ID**: Found on the Membership page
   - **Key ID**: Shown on the key details page
   - **Private Key**: Contents of the .p8 file

**Note**: For basic map display (showing the map, user location, custom markers), **no API key is needed** - Apple Maps works free via `react-native-maps`. The MapKit JS credentials are only needed for directions/routing and place search APIs.

**Cost**: Part of Apple Developer Program ($99/year)

---

### 1.4 Expo (For Kathir)
**What**: React Native build & push notifications
**URL**: https://expo.dev
**Action**:
1. Create account at expo.dev
2. Create new project or link existing
3. Go to **Project Settings > Credentials**
4. Copy `Project ID` → Give to Kathir as `EXPO_PUBLIC_PUSH_NOTIFICATION_PROJECT_ID`
5. For iOS builds, you'll need:
   - Apple Developer Account ($99/year)
   - Provisioning profiles & certificates (Expo can manage these via EAS)

**Cost**: Free for development. EAS Build: $3 per iOS build, $1 per Android.

---

### 1.5 Apple Developer Account (For Kathir - iOS)
**What**: Required for App Store distribution
**URL**: https://developer.apple.com
**Action**:
1. Enroll in Apple Developer Program ($99/year)
2. Create App ID for SnapRoad
3. Create Push Notification certificates (or let Expo/EAS handle this)
4. Provide credentials to Kathir for native builds

**Cost**: $99/year

---

### 1.6 Google Play Console (For Kathir - Android)
**What**: Required for Play Store distribution
**URL**: https://play.google.com/console
**Action**:
1. Create developer account ($25 one-time)
2. Create app listing for SnapRoad
3. Generate upload key for app signing
4. Provide credentials to Kathir

**Cost**: $25 one-time

---

### 1.7 Gas Price API (For Andrew)
**What**: Real-time fuel prices
**URL**: https://collectapi.com/api/gasPrice
**Action**:
1. Create account at collectapi.com
2. Subscribe to Gas Prices API
3. Copy API key → Give to Andrew as `GAS_PRICE_API_KEY`

**Cost**: Free tier: 100 requests/day. Paid: ~$10/month for more.

---

### 1.8 SendGrid (For Andrew - Optional)
**What**: Transactional emails (welcome, receipts, etc.)
**URL**: https://sendgrid.com
**Action**:
1. Create account at sendgrid.com
2. Verify your sending domain
3. Create API key with "Mail Send" permissions
4. Copy API key → Give to Andrew as `SENDGRID_API_KEY`

**Cost**: Free for 100 emails/day. ~$15/month for more.

---

## Phase 2: Credential Distribution

### Create a Secure Credentials Document
Use a password manager (1Password, LastPass) or secure channel to share:

```
=== ANDREW (Backend) ===
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...
DATABASE_URL=postgresql://postgres:xxx@db.xxx.supabase.co:5432/postgres
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_PRICE_DRIVER_PREMIUM=price_xxxxx
STRIPE_PRICE_PARTNER_STARTER=price_xxxxx
STRIPE_PRICE_PARTNER_GROWTH=price_xxxxx
GAS_PRICE_API_KEY=xxxxx
SENDGRID_API_KEY=SG.xxxxx
JWT_SECRET=[generate a random 64-char string]

=== BRIAN (Web) ===
VITE_API_URL=/api
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
SUPABASE_ANON_KEY=eyJhbGc... (for client-side if needed)

=== KATHIR (Mobile) ===
API_URL=https://api.snaproad.com/api
EXPO_PUBLIC_PUSH_NOTIFICATION_PROJECT_ID=xxxxx
APPLE_TEAM_ID=XXXXXXXXXX (from Apple Developer Membership page)
APPLE_KEY_ID=XXXXXXXXXX (from MapKit JS key)
APPLE_PRIVATE_KEY=[contents of .p8 file - for directions API]
```

**Note on Apple Maps**: Basic map display works without any credentials. The Apple MapKit JS credentials are only needed if Kathir implements turn-by-turn directions and place search. This can be added later.

**Security Note**: Never commit these to git. Use `.env` files locally.

---

## Phase 3: Coordination & Dependencies

### Dependency Map

```
                    ┌─────────────┐
                    │   ANDREW    │
                    │  (Backend)  │
                    └──────┬──────┘
                           │
              APIs Ready   │   APIs Ready
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

### Critical Coordination Points

#### 1. API Contract Agreement (Week 1)
**Who**: Andrew + Brian + Kathir
**What**: Agree on API request/response formats
**Action**: 
- Schedule 1-hour meeting
- Review `API_INTEGRATION_TODO.md` together
- Finalize any changes to endpoints
- Document in shared Notion/Confluence

#### 2. QR Code Format (Week 1)
**Who**: Andrew + Brian + Kathir
**What**: QR codes generated on mobile must be scannable on web (and vice versa)
**Proposed Format**:
```
SNAPROAD:REDEEM:{offer_id}:{user_id}:{expiry_timestamp}:{signature}
```
**Action**: All three must agree on this format before implementation.

#### 3. Authentication Flow (Week 2)
**Who**: Andrew (implement) → Brian + Kathir (consume)
**What**: JWT tokens must work the same way across web and mobile
**Action**: Andrew implements auth first, then Brian and Kathir integrate.

#### 4. Push Notification Payloads (Week 2-3)
**Who**: Andrew (sends) + Kathir (receives)
**What**: Backend sends push via Expo, mobile handles navigation
**Proposed Payload**:
```json
{
  "to": "ExponentPushToken[xxx]",
  "title": "New Offer Nearby!",
  "body": "Shell: 15% off fuel",
  "data": {
    "type": "offer",
    "offer_id": "123",
    "lat": 39.96,
    "lng": -82.99
  }
}
```

---

## Phase 4: Recommended Timeline

### Week 1: Foundation
| Day | Andrew (Backend) | Brian (Web) | Kathir (Mobile) |
|-----|------------------|-------------|-----------------|
| 1-2 | Set up Supabase, run schema SQL | Set up API service layer | Install dependencies, configure Expo |
| 3-4 | Implement auth endpoints | Create AuthContext | Create API service layer |
| 5 | **Sync meeting**: Test auth flow across all platforms |

### Week 2: Core Features
| Day | Andrew (Backend) | Brian (Web) | Kathir (Mobile) |
|-----|------------------|-------------|-----------------|
| 1-2 | Implement offers CRUD | Wire up offers API | Implement Mapbox navigation |
| 3-4 | Implement Stripe webhooks | Add Stripe checkout | Implement trip flow |
| 5 | **Sync meeting**: Demo progress, resolve blockers |

### Week 3: Advanced Features
| Day | Andrew (Backend) | Brian (Web) | Kathir (Mobile) |
|-----|------------------|-------------|-----------------|
| 1-2 | Implement QR verification | Add QR scanner component | Add QR generation |
| 3-4 | Push notification service | Leaderboard component | Push notification handling |
| 5 | **Sync meeting**: Integration testing |

### Week 4: Polish & Testing
| Day | Andrew (Backend) | Brian (Web) | Kathir (Mobile) |
|-----|------------------|-------------|-----------------|
| 1-3 | Bug fixes, edge cases | UI polish, error handling | Hazard button, testing |
| 4-5 | **All hands**: End-to-end testing, deployment prep |

---

## Phase 5: Daily/Weekly Rituals

### Daily Standup (15 min)
- What did you complete yesterday?
- What are you working on today?
- Any blockers?

### Weekly Demo (Friday, 30 min)
- Each person demos their progress
- Identify integration issues early
- Plan next week's priorities

### Slack/Discord Channels
```
#snaproad-general     - Announcements, general chat
#snaproad-backend     - Andrew's questions, API discussions
#snaproad-web         - Brian's questions, frontend issues
#snaproad-mobile      - Kathir's questions, mobile issues
#snaproad-blockers    - Urgent issues needing PM help
```

---

## Phase 6: PM Checklist

### Before Development Starts
- [ ] Create all accounts (Supabase, Stripe, Mapbox, Expo, etc.)
- [ ] Generate and securely distribute all API keys
- [ ] Set up communication channels (Slack/Discord)
- [ ] Schedule kickoff meeting with all three developers
- [ ] Ensure everyone has access to the codebase (GitHub)

### Week 1
- [ ] Verify all developers have their credentials working
- [ ] Attend API contract meeting, document decisions
- [ ] Unblock any account/access issues
- [ ] Set up project tracking (Jira, Linear, Notion)

### Week 2
- [ ] Check in on auth integration across platforms
- [ ] Test Stripe webhooks with `stripe listen` locally
- [ ] Ensure Mapbox is rendering correctly on mobile

### Week 3
- [ ] Coordinate QR code testing (web scans mobile, mobile scans web)
- [ ] Test push notifications end-to-end
- [ ] Begin App Store / Play Store preparation

### Week 4
- [ ] Coordinate end-to-end testing
- [ ] Prepare production environment variables
- [ ] App Store submission (if ready)
- [ ] Set up production monitoring (Sentry, LogRocket)

---

## Quick Reference: Who Needs What

| Credential | Andrew | Brian | Kathir |
|------------|:------:|:-----:|:------:|
| Supabase URL | ✅ | | |
| Supabase Service Key | ✅ | | |
| Supabase Anon Key | | ✅ | |
| Database URL | ✅ | | |
| Stripe Secret Key | ✅ | | |
| Stripe Publishable Key | | ✅ | |
| Stripe Webhook Secret | ✅ | | |
| Stripe Price IDs | ✅ | | |
| Mapbox Token | | ✅ | ✅ |
| Expo Project ID | | | ✅ |
| Gas Price API Key | ✅ | | |
| SendGrid API Key | ✅ | | |
| Apple Developer Creds | | | ✅ |
| Google Play Creds | | | ✅ |

---

## Troubleshooting Common Issues

### "API returning 401"
→ Token expired or not being sent. Check with Andrew on JWT expiry settings.

### "Stripe webhook not firing"
→ Ensure webhook URL is publicly accessible. Use `stripe listen` for local testing.

### "Push notifications not received"
→ Test on physical device. Check Expo project ID is correct.

### "Map not loading"
→ Verify Mapbox token is valid and has required scopes.

### "QR code not scanning"
→ Ensure QR format matches between generator and scanner.

---

## Emergency Contacts

| Issue Type | First Contact | Escalation |
|------------|---------------|------------|
| Backend down | Andrew | PM → DevOps |
| Payment issues | Andrew | PM → Stripe Support |
| App Store rejection | Kathir | PM → Apple Developer Support |
| Map issues | Kathir/Brian | PM → Mapbox Support |

---

## Cost Summary (Monthly Estimates)

| Service | Free Tier | Expected Cost |
|---------|-----------|---------------|
| Supabase | 500MB DB, 1GB storage | $0 (dev) / $25 (prod) |
| Stripe | No monthly fee | 2.9% + $0.30 per transaction |
| Mapbox | 50K map loads | $0 (dev) / ~$50 (prod) |
| Expo/EAS | Limited builds | $0 (dev) / ~$30 (prod) |
| Apple Developer | N/A | $99/year |
| Google Play | N/A | $25 one-time |
| SendGrid | 100 emails/day | $0 (dev) / $15 (prod) |
| CollectAPI | 100 requests/day | $0 (dev) / $10 (prod) |

**Estimated Monthly (Production)**: ~$130 + transaction fees

---

**Questions? You're the coordinator - reach out to each developer based on their expertise!**
