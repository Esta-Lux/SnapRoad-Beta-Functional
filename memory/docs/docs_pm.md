# SnapRoad — Product Manager Documentation
> **Role:** Product Manager | **Updated:** February 2026  
> **Focus:** Feature status, backlog, roadmap, user flows, credentials

---

## 1. Product Overview

**SnapRoad** is a privacy-first, gamified navigation app that rewards safe driving with gems, offers, and badges.

**Three User Types:**
| User | Portal | Access URL |
|------|--------|------------|
| Driver | Mobile App / Web Preview | `/driver` |
| Partner (Business) | Web Portal | `/portal/partner` |
| Admin (SnapRoad Team) | Web Console | `/portal/admin-sr2025secure` |

---

## 2. Feature Status Matrix

### Driver App Features

| Feature | Web (Frontend) | Mobile App | API | Live Data |
|---------|:-:|:-:|:-:|:-:|
| Onboarding (splash, welcome, plan, car) | ✅ | ✅ | ✅ | ❌ Mock |
| Interactive Map | ✅ | ✅ | ✅ | ❌ Mock |
| Offer discovery + redemption | ✅ | ✅ | ✅ | ❌ Mock |
| Gem collection + wallet | ✅ | ✅ | ✅ | ❌ Mock |
| Safety score + driving metrics | ✅ | ✅ | ✅ | ❌ Mock |
| Trip history + analytics | ✅ | ✅ | ✅ | ❌ Mock |
| Leaderboard | ✅ | ✅ | ✅ | ❌ Mock |
| Badges + achievements | ✅ | ✅ | ✅ | ❌ Mock |
| Challenges (driver vs. driver) | ✅ | ✅ | ✅ | ❌ Mock |
| Orion AI Coach (GPT-5.2) | ✅ | ✅ | ✅ | ✅ **LIVE** |
| Photo incident capture + AI blur | ✅ | ✅ | ✅ | ✅ **LIVE** |
| Fuel tracker | ✅ | ✅ | ✅ | ❌ Mock |
| Route history (3D visualization) | ✅ | ✅ | ✅ | ❌ Mock |
| Family tracking | ✅ | ✅ | ✅ | ❌ Mock |
| Friends + social | ✅ | ✅ | ✅ | ❌ Mock |
| Car Studio (customization) | ✅ | ✅ | ✅ | ❌ Mock |
| Privacy Center | ✅ | ✅ | N/A | N/A |
| Weekly Recap | ✅ | ✅ | ✅ | ❌ Mock |
| Level progress | ✅ | ✅ | ✅ | ❌ Mock |
| Insurance Report | ✅ | ✅ | — | — |
| Active Navigation | ✅ | ✅ | ✅ | ❌ Mock |
| Hazard Feed | ✅ | ✅ | ✅ | ❌ Mock |
| Commute Scheduler | ✅ | ✅ | ✅ | ❌ Mock |

### Partner Portal Features

| Feature | Status |
|---------|--------|
| Dashboard overview (revenue chart, stats) | ✅ Functional |
| Offer management (create/edit/boost) | ✅ Functional |
| Store location management | ✅ Functional |
| Real-time analytics (views/clicks/redemptions) | ✅ Functional |
| Boost Center (paid offer amplification) | ✅ Functional |
| Credits & Finance | ✅ Functional |
| Referral analytics + send invites | ✅ Functional |
| Plans & Pricing | ✅ Functional |
| Team management (invite/remove/roles) | ✅ API Ready |
| QR code redemption | ✅ API Ready |
| Payment processing (Stripe) | ❌ Planned |

### Admin Console Features

| Feature | Status |
|---------|--------|
| Platform overview (metrics, charts) | ✅ Functional |
| User management | ✅ Functional |
| Partner management | ✅ Functional |
| Events & Promotions | ✅ Functional |
| Offer management (bulk create/export/import) | ✅ Functional |
| **AI Moderation Queue (real-time WebSocket)** | ✅ **LIVE** |
| Supabase migration banner | ✅ Functional (blocked by firewall) |

---

## 3. What's 100% Live (Not Mocked)

Only two backend integrations return real, non-mock data today:

1. **Orion AI Coach** — Real GPT-5.2 responses via OpenAI (uses Emergent LLM Key)
2. **Photo Analysis** — Real AI-powered face/plate blur detection (uses Emergent LLM Key)
3. **Supabase Auth** — Real authentication (login/signup creates real users in Supabase)
4. **Admin AI Moderation** — Real-time WebSocket feed (broadcasts to all connected admins)

Everything else (offers, trips, gems, partners, leaderboard, etc.) uses mock in-memory data.

---

## 4. Roadmap & Backlog

### P0 — Critical (Blocking Launch)
| Task | Effort | Status |
|------|--------|--------|
| Run Supabase database migration | 5 min | ⏳ Blocked (manual step) |
| Connect all API routes to real Supabase data | 2-3 days | 🔴 Not started |

### P1 — Important (Next Sprint)
| Task | Effort | Status |
|------|--------|--------|
| Stripe payment integration (partner subscriptions, boosts) | 3 days | 🔴 Not started |
| Gas price API integration (GasBuddy or similar) | 1 day | 🔴 Not started |
| Push notifications setup (Expo + backend) | 2 days | 🔴 Not started |
| Code cleanup (remove legacy pages) | 0.5 day | 🔴 Not started |

### P2 — Nice to Have
| Task | Effort | Status |
|------|--------|--------|
| Apple Maps MapKit integration (replace mock map) | 3 days | 🔴 Not started |
| EAS Build setup (iOS/Android binary) | 1 day | 🔴 Not started |
| Port new Admin/Partner UI to mobile screens | 2 days | 🔴 Not started |
| End-to-end test suite (Playwright) | 2 days | 🔴 Not started |
| Real-time gem collection during navigation | 3 days | 🔴 Not started |
| Live location sharing (Family feature) | 3 days | 🔴 Not started |

---

## 5. User Flows

### Driver Flow
1. Splash screen (2.5s) → Welcome onboarding (4 slides)
2. Plan selection (Basic vs. Premium)
3. Car setup (model + color)
4. Main app: Map tab with offers + gems
5. Drive → complete trip → earn gems + XP
6. Redeem offers at partner locations
7. View driving score, badges, leaderboard rank

### Partner Flow
1. Login at `/portal/partner`
2. Dashboard overview (revenue metrics)
3. Create offers linked to store locations
4. Boost offers for extra visibility
5. Track redemptions in real-time (WebSocket)
6. Manage team members, view referrals

### Admin Flow
1. Login at `/portal/admin-sr2025secure`
2. Platform overview (all metrics)
3. Manage users + partners
4. Monitor AI Moderation queue (real-time incident feed)
5. Bulk create/import/export offers
6. Adjust platform pricing

---

## 6. Test Credentials

| Role | Email | Password | Portal |
|------|-------|----------|--------|
| Driver | `driver@snaproad.com` | `password123` | `/driver` |
| Partner | `partner@snaproad.com` | `password123` | `/portal/partner` |
| Admin | `admin@snaproad.com` | `password123` | `/portal/admin-sr2025secure` |

---

## 7. Live URLs (Staging)

| Surface | URL |
|---------|-----|
| Landing Page | `/` |
| Driver App | `/driver` |
| App Preview (iPhone frame) | `/preview` |
| Partner Portal | `/portal/partner` |
| Admin Console | `/portal/admin-sr2025secure` |
| Figma UI Prototype | `/app` |
| API Health | `/api/health` |

---

## 8. Key Integrations Status

| Integration | Status | Cost/Type |
|-------------|--------|-----------|
| OpenAI GPT-5.2 (Orion AI Coach) | **Active** | Per-token (Emergent LLM Key) |
| OpenAI Vision (Photo Blur) | **Active** | Per-image (Emergent LLM Key) |
| Supabase Auth | **Active** | Free tier |
| Supabase Database | **Pending** | Free tier |
| Stripe | **Planned** | % per transaction |
| Apple Maps MapKit | **Planned** | Usage-based |
| Gas Buddy API | **Planned** | Subscription |

---

## 9. Analytics & Metrics Tracked

The backend has a full analytics event tracking system (`POST /api/analytics/track`):

| Event Type | Description |
|------------|-------------|
| `view` | Offer viewed |
| `click` | Offer clicked |
| `redemption` | Offer redeemed |

Admin Dashboard shows:
- Daily active users
- Total redemptions (30-day chart)
- Top performing partners
- New user sign-ups trend

---

## 10. Pricing Model (Current Config)

| Plan | Monthly | Annual |
|------|---------|--------|
| Basic (Driver) | Free | Free |
| Premium (Driver) | $4.99/mo | $39.99/yr |
| Partner Starter | $29/mo | $249/yr |
| Partner Growth | $79/mo | $699/yr |
| Partner Enterprise | $199/mo | Custom |

*Pricing is configurable via `POST /api/admin/pricing`*

---

## 11. Timeline

| Milestone | Date | Status |
|-----------|------|--------|
| Core driver app built (web + mobile) | Jan 2026 | ✅ Complete |
| Admin console rebuilt with AI Moderation | Feb 2026 | ✅ Complete |
| Partner portal rebuilt (8 tabs) | Feb 2026 | ✅ Complete |
| Mobile app (42 screens) built | Feb 2026 | ✅ Complete |
| Backend modularized (11 route files, 40+ endpoints) | Feb 2026 | ✅ Complete |
| Supabase integration configured | Feb 2026 | ✅ Complete |
| Mobile web animation fix | Feb 2026 | ✅ Complete |
| **Supabase DB migration (tables + data)** | TBD | 🔴 Blocked |
| **Backend routes → live Supabase** | TBD | 🔴 Not started |
| **Stripe integration** | TBD | 🔴 Not started |

---

## 12. Blocking Issues

| Issue | Blocker | Resolution |
|-------|---------|------------|
| Database has no tables (all data is mock) | Network firewall blocks direct DB connection from server | **User action:** Run `sql/supabase_migration.sql` manually in Supabase SQL Editor |

**Step-by-step to unblock:**
1. Open Supabase dashboard → SQL Editor
2. Paste contents of `/app/backend/sql/supabase_migration.sql`
3. Click "Run"
4. Tables are created + seed data loaded
5. Backend routes will automatically use real data (fallback logic already in place)

---

*Document owner: Product Manager | Last updated: February 2026*
