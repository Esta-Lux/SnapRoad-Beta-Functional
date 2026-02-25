# PM Coordination Guide - SnapRoad
> **Role:** Product Manager  
> **Last Updated:** December 2025  
> **Focus:** Feature matrix, roadmap, Apple MapKit scope, integration status

---

## Quick Links
- [Feature Audit](/app/memory/FEATURE_AUDIT.md) - Complete feature comparison
- [API Guide](/app/memory/API_INTEGRATION_GUIDE.md) - All 60+ endpoints
- [PRD](/app/memory/PRD.md) - Product requirements

---

## 1. Product Health Dashboard

### Current State
| Component | Status | Notes |
|-----------|--------|-------|
| Mobile App (snaproad-mobile) | PRODUCTION READY | 42+ screens, full feature parity |
| Web Reference (/driver) | COMPLETE | Reference only, not deployed |
| Backend API | FUNCTIONAL | 60+ endpoints, mock data |
| Database | BLOCKED | Supabase tables not created |
| Payments | INTEGRATED | Stripe test mode active |

### Feature Completion
```
[████████████████████] 100% - Mobile App Screens
[████████████████████] 100% - API Endpoints
[████████████████████] 100% - Web Reference
[░░░░░░░░░░░░░░░░░░░░]   0% - Database Migration
[████████░░░░░░░░░░░░]  40% - Apple MapKit (scoping phase)
```

---

## 2. Apple MapKit Integration Scope

### Assigned To: PM (Coordination)
**Purpose:** Replace mock/OpenStreetMap with native Apple Maps

### What Exists Currently
| Platform | Current Implementation | Location |
|----------|----------------------|----------|
| Web | OpenStreetMap/Leaflet via InteractiveMap.tsx | `/app/frontend/src/pages/DriverApp/components/InteractiveMap.tsx` |
| Mobile (iOS) | expo-location for coordinates | `/app/snaproad-mobile/src/screens/MapScreen.tsx` |
| Mobile (Web) | OpenStreetMap/Leaflet via WebMap.tsx | `/app/snaproad-mobile/src/components/WebMap.tsx` |

### What Needs to be Implemented

#### Phase 1: iOS Native Maps
| Feature | Description | API Cost |
|---------|-------------|----------|
| Basic Map Display | Replace placeholder with MapKit MKMapView | Free (included with Apple dev account) |
| User Location | Blue dot with accuracy circle | Free |
| Custom Annotations | Offer pins, gem markers | Free |
| Polyline Routes | Turn-by-turn route display | MapKit Directions API quota |

#### Phase 2: Turn-by-Turn Navigation
| Feature | Description | API Cost |
|---------|-------------|----------|
| Route Calculation | Origin → Destination routing | MapKit Directions API |
| ETA Updates | Real-time arrival estimates | Included |
| Traffic Conditions | Live traffic overlay | MapKit Traffic API |
| Voice Guidance | Spoken directions | iOS native TTS |

#### Phase 3: Enhanced Features
| Feature | Description | API Cost |
|---------|-------------|----------|
| Offline Maps | Download regions for offline use | MapKit Offline API |
| AR Navigation | Camera-based directions | ARKit integration |
| 3D Buildings | 3D city rendering | MapKit 3D |

### Technical Requirements
```
Dependencies to add (iOS):
- react-native-maps (with Apple Maps provider)
- OR @react-native-community/maps

Dependencies to add (Web fallback):
- Keep Leaflet/OpenStreetMap as fallback

Backend endpoints ready:
- GET /api/map/search - Location search
- GET /api/map/directions - Route calculation
- GET /api/offers/nearby - Nearby offer pins
```

### Cost Estimation
| Tier | Monthly Active Users | Estimated Cost |
|------|---------------------|----------------|
| Free | < 25,000 | $0 (Apple quota) |
| Basic | 25K - 100K | ~$200/month |
| Growth | 100K - 500K | ~$1,000/month |
| Scale | 500K+ | Contact Apple |

### Scalability Note
MapKit is highly cost-effective for iOS users. For Android, consider:
- Google Maps Platform ($200/month credit, then ~$7/1000 requests)
- Mapbox (~$0.50/1000 requests)

---

## 3. Supabase Integration Status

### What's Implemented
| Component | Status | Details |
|-----------|--------|---------|
| Supabase Client | CONNECTED | `/app/backend/database.py` |
| Auth Integration | ACTIVE | Login/signup work with Supabase Auth |
| Migration Script | READY | `/app/backend/sql/supabase_migration.sql` |
| Backend Fallback | WORKING | Uses mock data when DB empty |

### What's Blocked
```
ACTION REQUIRED: Manual SQL execution

The migration script cannot be run programmatically due to 
network restrictions. The PM or a team member with Supabase 
access must:

1. Open Supabase Dashboard → SQL Editor
2. Paste contents of /app/backend/sql/supabase_migration.sql
3. Click "Run"
4. Tables will be created + seed data loaded
```

### Tables Created by Migration
| Table | Purpose | Records Seeded |
|-------|---------|----------------|
| users | Driver accounts | 3 test users |
| partners | Business accounts | 2 test partners |
| partner_locations | Store locations | 5 locations |
| offers | Available offers | 10 sample offers |
| trips | Trip history | 5 sample trips |
| trip_gems | Gems collected | 20 samples |
| road_reports | Hazard reports | 8 samples |
| events | Platform events | 3 samples |
| challenges | Driver challenges | 5 samples |
| notifications | User notifications | 0 |
| boosts | Offer boosts | 0 |
| analytics_events | Analytics tracking | 0 |

---

## 4. Stripe Integration Status

### What's Implemented
| Component | Status | File Location |
|-----------|--------|---------------|
| Backend Endpoints | COMPLETE | `/app/backend/routes/payments.py` |
| Mobile Payment Screen | COMPLETE | `/app/snaproad-mobile/src/screens/PaymentScreen.tsx` |
| Webhook Handler | COMPLETE | `POST /api/payments/webhook/stripe` |
| Test Keys | CONFIGURED | `/app/backend/.env` |

### API Endpoints
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/payments/plans` | List subscription plans |
| POST | `/api/payments/checkout/session` | Create Stripe checkout |
| GET | `/api/payments/checkout/status/{session_id}` | Check payment status |
| POST | `/api/payments/webhook/stripe` | Handle Stripe events |
| GET | `/api/payments/transactions` | List all transactions |

### Subscription Plans
| Plan | Price | Features |
|------|-------|----------|
| Basic | $0.00/forever | Privacy-first navigation, 1x gems, Safety score, Community reports |
| Premium | $10.99/month | 2x gems, Premium offers, Advanced analytics, Fuel tracking, Ad-free |
| Family | $14.99/month | Up to 6 members, Real-time location sharing, Teen monitoring, Emergency SOS |

### What's NOT Implemented
- [ ] Live Stripe keys (currently using test keys)
- [ ] Subscription management UI (cancel/upgrade)
- [ ] Invoice/receipt generation
- [ ] Revenue analytics dashboard

---

## 5. Test Credentials

| Role | Email | Password | Access |
|------|-------|----------|--------|
| Driver | `driver@snaproad.com` | `password123` | Mobile app, `/driver` |
| Partner | `partner@snaproad.com` | `password123` | Partner portal |
| Admin | `admin@snaproad.com` | `password123` | Admin console |

---

## 6. Priority Backlog

### P0 - Critical (Blocking Launch)
| Task | Owner | Status | Blocker |
|------|-------|--------|---------|
| Run Supabase migration | PM/Ops | BLOCKED | Manual action required |
| Connect endpoints to live DB | Backend | WAITING | Needs P0.1 |

### P1 - Important (Next Sprint)
| Task | Owner | Status | Notes |
|------|-------|--------|-------|
| Apple MapKit integration | Mobile + PM | SCOPING | See section 2 |
| Live Stripe keys | PM/Ops | NOT STARTED | Needs Stripe account |
| Push notifications | Backend + Mobile | NOT STARTED | Expo + FCM/APNs |
| Gas price API | Backend | NOT STARTED | GasBuddy/OPIS API |

### P2 - Nice to Have
| Task | Owner | Status | Notes |
|------|-------|--------|-------|
| Android release | Mobile | NOT STARTED | EAS Build setup |
| iOS TestFlight | Mobile | NOT STARTED | Apple Developer account |
| E2E test suite | QA | NOT STARTED | Playwright/Detox |
| Legacy code cleanup | All | NOT STARTED | Remove /dashboard/* |

---

## 7. Team Assignments

| Team Member | Role | Current Focus |
|-------------|------|---------------|
| Andrew | Engineering Lead | Backend modularization, Supabase migration |
| Brian | Frontend | Web components, DriverApp reference |
| Kathir | Mobile | React Native screens, navigation |
| PM | Coordination | Apple MapKit scope, stakeholder docs |

---

## 8. Key Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| Feb 2026 | Focus all work on snaproad-mobile | Single codebase, faster iteration |
| Feb 2026 | Keep /driver as reference only | Web preview for stakeholders |
| Feb 2026 | Use Supabase over MongoDB | Better auth, PostgreSQL, free tier |
| Feb 2026 | Stripe for payments | Industry standard, good docs |
| Dec 2025 | Apple MapKit over Google Maps | Better iOS native experience, cost-effective |

---

## 9. Weekly Sync Agenda Template

```markdown
## SnapRoad Weekly Sync - [DATE]

### Wins
- 

### Blockers
- Supabase migration still blocked

### This Week
- [ ] Apple MapKit scoping complete
- [ ] 

### Next Week
- [ ] 

### Action Items
| Owner | Task | Due |
|-------|------|-----|
```

---

*Document owner: Product Manager | Last updated: December 2025*
