# SnapRoad - Product Requirements Document
> **Last Updated:** December 2025  
> **Status:** Production Ready (Mobile App)

---

## Product Overview

SnapRoad is a **privacy-first, gamified navigation app** that rewards safe driving with gems, offers, and badges.

### Three User Portals
| Portal | Platform | Access |
|--------|----------|--------|
| Driver App | React Native (Expo) | `snaproad-mobile` |
| Partner Portal | React Web | `/portal/partner` |
| Admin Console | React Web | `/portal/admin-sr2025secure` |

### Tech Stack
| Layer | Technology |
|-------|------------|
| Mobile | React Native + Expo SDK 54 + TypeScript |
| Web | React + Vite + TypeScript + Tailwind CSS |
| Backend | FastAPI (Python) |
| Database | Supabase (PostgreSQL) - PENDING MIGRATION |
| AI | OpenAI GPT-5.2 (Orion Coach), OpenAI Vision |
| Payments | Stripe (test mode active) |
| Maps | Apple MapKit (planned), OpenStreetMap (current) |

---

## What's Implemented

### Mobile App (`/app/snaproad-mobile`)
| Feature | Status | Screens |
|---------|--------|---------|
| Onboarding | COMPLETE | Splash, Welcome, PlanSelection, CarSetup |
| Core Navigation | COMPLETE | Map, Routes, Rewards, Profile (4 tabs) |
| Offers | COMPLETE | OffersScreen, OfferDetail, MyOffers, Redemption |
| Gamification | COMPLETE | Badges, Challenges, Leaderboard, Gems, LevelProgress |
| Analytics | COMPLETE | TripAnalytics, RouteHistory3D, DriverAnalytics, FuelDashboard |
| Social | COMPLETE | FriendsHub, Family, Live, Engagement |
| AI Features | COMPLETE | OrionCoach, PhotoCapture |
| Settings | COMPLETE | Settings, PrivacyCenter, Notifications, Help |
| Payments | COMPLETE | PaymentScreen (Stripe) |
| Admin/Partner | COMPLETE | AdminDashboard, PartnerDashboard |

**Total Screens:** 42+

### Backend (`/app/backend`)
| Feature | Status | Notes |
|---------|--------|-------|
| API Endpoints | COMPLETE | 60+ endpoints across 11 route modules |
| Authentication | WORKING | Supabase Auth + JWT |
| Stripe | INTEGRATED | Test keys configured |
| AI Services | LIVE | GPT-5.2, OpenAI Vision |
| WebSocket | WORKING | Real-time notifications |
| Database | MOCK DATA | Supabase tables not created yet |

### Web Reference (`/app/frontend`)
| Route | Status | Purpose |
|-------|--------|---------|
| `/driver` | COMPLETE | Reference implementation (34 components) |
| `/portal/partner` | COMPLETE | Partner dashboard (8 tabs) |
| `/portal/admin-sr2025secure` | COMPLETE | Admin console (6 tabs) |

---

## Feature Parity Status

Mobile app has **100% feature parity** with web `/driver` reference.

See `/app/memory/FEATURE_AUDIT.md` for detailed comparison.

---

## Integration Status

### Stripe (INTEGRATED)
| Component | Status | Location |
|-----------|--------|----------|
| Backend Routes | COMPLETE | `/app/backend/routes/payments.py` |
| Mobile Screen | COMPLETE | `/app/snaproad-mobile/src/screens/PaymentScreen.tsx` |
| Webhook Handler | COMPLETE | `POST /api/payments/webhook/stripe` |
| Test Keys | CONFIGURED | `/app/backend/.env` |

**Plans:**
| Plan | Price | Features |
|------|-------|----------|
| Basic | Free | Privacy navigation, 1x gems, Safety score |
| Premium | $10.99/mo | 2x gems, Premium offers, Analytics, Ad-free |
| Family | $14.99/mo | 6 members, Location sharing, Emergency SOS |

**What's NOT done:**
- [ ] Live Stripe keys
- [ ] Subscription management UI
- [ ] Invoice generation

### Supabase (BLOCKED)
| Component | Status | Notes |
|-----------|--------|-------|
| Client | CONNECTED | `/app/backend/database.py` |
| Auth | ACTIVE | Login/signup work |
| Migration Script | READY | `/app/backend/sql/supabase_migration.sql` |
| Tables | NOT CREATED | Manual action required |

**ACTION REQUIRED:**
```
User must manually run the migration SQL in Supabase dashboard:
1. Open Supabase → SQL Editor
2. Paste contents of /app/backend/sql/supabase_migration.sql
3. Click "Run"
```

### Apple MapKit (SCOPING)
| Phase | Status | Scope |
|-------|--------|-------|
| Phase 1 | PLANNING | Basic map, annotations, polylines |
| Phase 2 | PLANNED | Turn-by-turn, ETA, traffic |
| Phase 3 | FUTURE | Offline maps, AR navigation |

**Currently using:** OpenStreetMap/Leaflet (web), expo-location (mobile)

---

## Test Credentials

| Role | Email | Password | Access |
|------|-------|----------|--------|
| Driver | driver@snaproad.com | password123 | Mobile app, /driver |
| Partner | partner@snaproad.com | password123 | Partner portal |
| Admin | admin@snaproad.com | password123 | Admin console |

---

## Priority Backlog

### P0 - Critical (Blocking Production)
| Task | Owner | Status | Blocker |
|------|-------|--------|---------|
| Run Supabase migration | User | BLOCKED | Manual action needed |
| Connect routes to live DB | Backend | WAITING | Needs P0.1 |

### P1 - Important (Next Sprint)
| Task | Owner | Effort |
|------|-------|--------|
| Apple MapKit Phase 1 | Mobile + PM | 3-5 days |
| Live Stripe keys | PM | 1 day |
| Push notifications | Backend + Mobile | 2 days |
| Gas price API | Backend | 1 day |

### P2 - Nice to Have
| Task | Owner | Effort |
|------|-------|--------|
| Android release (EAS) | Mobile | 1 day |
| iOS TestFlight | Mobile | 1 day |
| E2E test suite | QA | 2 days |
| Legacy code cleanup | All | 0.5 day |

---

## Architecture

### Mobile App
```
/app/snaproad-mobile/src/
├── navigation/index.tsx   # Stack + Tab navigation
├── screens/               # 42+ screens
├── components/            # Shared components
├── contexts/              # ThemeContext
├── services/api.ts        # API service
├── store/                 # Zustand stores
├── utils/theme.ts         # Design tokens
└── config.ts              # API_URL
```

### Backend
```
/app/backend/
├── main.py               # FastAPI app
├── routes/               # 11 route modules
│   ├── auth.py
│   ├── users.py
│   ├── offers.py
│   ├── partners.py
│   ├── gamification.py
│   ├── trips.py
│   ├── admin.py
│   ├── social.py
│   ├── navigation.py
│   ├── ai.py
│   ├── payments.py       # Stripe
│   └── webhooks.py
├── services/             # Business logic
├── models/schemas.py     # Pydantic models
└── sql/                  # Migration scripts
```

---

## Documentation

| Document | Location | Owner |
|----------|----------|-------|
| Feature Audit | `/app/memory/FEATURE_AUDIT.md` | All |
| API Guide | `/app/memory/API_INTEGRATION_GUIDE.md` | Backend |
| PM Guide | `/app/memory/PM_COORDINATION_GUIDE.md` | PM |
| Mobile Guide | `/app/memory/KATHIR_MOBILE_GUIDE.md` | Mobile |
| Web Guide | `/app/memory/BRIAN_WEB_GUIDE.md` | Frontend |

---

## Changelog

### December 2025
- Completed feature audit: 100% parity between mobile and web
- Updated all team documentation guides
- Added Apple MapKit scoping for PM
- Added detailed API integration guide

### February 2026
- Fixed mobile app bugs (API URLs, navigation, map)
- Added ThemeContext with dark/light mode
- Created 42+ mobile screens
- Integrated Stripe payments
- Built Admin and Partner dashboards (mobile)
- Fixed web animation crash (useNativeDriver)

### January 2026
- Initial mobile app structure
- Backend modularization (11 route files)
- Supabase integration (auth only)
- AI features (Orion Coach, Photo Analysis)

---

*Last updated: December 2025*
