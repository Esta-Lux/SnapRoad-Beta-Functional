# SnapRoad - Quick Reference Card
> **Updated**: February 2026

---

## Application URLs

### Driver App (Public)
| Route | Description |
|-------|-------------|
| `/` | Welcome/Landing Page |
| `/driver` | Main Driver App (map, offers, gamification) |
| `/driver/auth` | Driver onboarding auth flow |
| `/preview` | **NEW**: Premium iPhone-frame app preview |

### Partner Portal (Business)
| Route | Description |
|-------|-------------|
| `/portal/partner` | Partner Dashboard (8 tabs) |
| `/partner` | Redirects to `/portal/partner` |

### Admin Console
| Route | Description |
|-------|-------------|
| `/portal/admin-sr2025secure` | **Admin Dashboard** (6 tabs incl. AI Moderation) |

⚠️ **SECURITY**: Change the admin URL before production deployment.

### Figma Prototype
| Route | Description |
|-------|-------------|
| `/app` | figma-ui component library prototype |

---

## Tech Stack

### Frontend
- **Framework:** React 19 + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Icons:** Lucide React
- **Routing:** React Router v6
- **UI Components:** Custom + Shadcn/UI

### Backend
- **Framework:** FastAPI (Python 3.10+) — **Modular: 11 route files**
- **Auth:** Supabase Auth (LIVE)
- **Database:** Supabase PostgreSQL — tables pending migration
- **Data (current):** In-memory mock (see `services/mock_data.py`)
- **Real integrations:** OpenAI GPT-5.2 (Orion), OpenAI Vision (photo), WebSocket (moderation)

### Mobile
- **Framework:** React Native (Expo SDK 54)
- **Navigation:** React Navigation v7
- **State:** Zustand
- **Build:** EAS Build (configured)

---

## Key Files

### Frontend
```
/app/frontend/src/
├── App.tsx                          # Main router
├── pages/
│   ├── WelcomePage.tsx              # Landing page
│   ├── PhonePreviewPage.tsx         # NEW: /preview route
│   ├── DriverApp/index.tsx          # Driver app (3,012 lines)
│   ├── PartnerDashboard.tsx         # Partner portal (1,748 lines)
│   └── AdminDashboard.tsx           # Admin console (1,538 lines)
├── services/
│   ├── api.ts                       # All REST endpoint calls
│   └── partnerApi.ts                # Partner + WebSocket
└── components/figma-ui/             # Figma design system
```

### Backend
```
/app/backend/
├── server.py                        # Supervisor entry (thin wrapper)
├── main.py                          # App factory
├── routes/                          # 11 route modules (NOT monolithic!)
├── services/
│   ├── mock_data.py                 # In-memory data (fallback)
│   └── supabase_service.py          # Supabase CRUD
└── sql/supabase_migration.sql       # Run this in Supabase SQL Editor!
```

### Mobile
```
/app/snaproad-mobile/
├── app.json                         # jsEngine: jsc (critical for web build)
├── babel.config.js
├── metro.config.js
└── src/
    ├── navigation/index.tsx         # Full navigation tree (42 screens wired)
    └── screens/                     # 42 screen components
```

---

## API Base URL

```
Development (internal): http://localhost:8001/api
Production (external):  Use REACT_APP_BACKEND_URL from /app/frontend/.env
```

All frontend API calls use `REACT_APP_BACKEND_URL` or `VITE_API_URL` (set to `/api`).

---

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Driver | `driver@snaproad.com` | `password123` |
| Partner | `partner@snaproad.com` | `password123` |
| Admin | `admin@snaproad.com` | `password123` |

---

## Quick Start (Services are Supervisor-managed — just use as-is)

```bash
# Check status
sudo supervisorctl status

# Restart if needed (only after .env changes or package installs)
sudo supervisorctl restart backend
sudo supervisorctl restart frontend

# View backend logs
tail -n 100 /var/log/supervisor/backend.err.log
```

### Mobile App
```bash
cd /app/snaproad-mobile
yarn install
npx expo start --web    # Browser preview
npx expo start          # Expo Go (mobile)
npx expo export --platform web  # Production export
```

---

## Pricing Config

### Driver Plans
| Plan | Price | Features |
|------|-------|----------|
| Basic | Free | Standard offers, basic features |
| Premium | $4.99/mo | Better discounts, exclusive offers |

### Partner Plans
| Plan | Price | Max Locations |
|------|-------|---------------|
| Starter | $29/mo | 5 |
| Growth | $79/mo | 25 |
| Enterprise | Custom | Unlimited |

*Update via `POST /api/admin/pricing` or Admin Dashboard → Overview → Pricing*

---

## Priority Implementation Order

1. **P0 (NOW — 5 min):**
   - Run Supabase SQL migration (SQL Editor in Supabase dashboard)

2. **P1 (Week 1-2):**
   - Connect backend routes to Supabase data (Andrew)
   - Stripe integration (Andrew + Brian)
   - Apple Maps token endpoint (Andrew)

3. **P2 (Week 3-4):**
   - Apple Maps MapKit JS on web (Brian)
   - Real MapView on mobile (Kathir)
   - Push notifications (Kathir)

4. **P3 (Future):**
   - EAS Build for App Store
   - Gas price API
   - Advanced analytics

---

## Documentation Index

| File | Audience |
|------|----------|
| `ANDREW_BACKEND_GUIDE.md` | Backend Lead |
| `BRIAN_WEB_GUIDE.md` | Frontend Lead |
| `KATHIR_MOBILE_GUIDE.md` | Mobile Lead |
| `PM_COORDINATION_GUIDE.md` | Product Manager |
| `application_overview.md` | Full team — complete architecture reference |
| `API_INTEGRATION_TODO.md` | Full team — remaining integration work |
| `code_cleanup_candidates.md` | Full team — legacy files to remove |
| `PRD.md` | Full team — product requirements |

---

*Last Updated: February 2026*
