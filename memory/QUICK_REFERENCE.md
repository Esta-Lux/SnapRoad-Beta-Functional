# SnapRoad - Quick Reference Card

## 🔗 Application URLs

### Driver App (Public)
| Route | Description |
|-------|-------------|
| `/` | Welcome/Landing Page |
| `/driver` | Main Driver App (map, offers, gamification) |

### Partner Portal (Business)
| Route | Description |
|-------|-------------|
| `/partner` | Partner Dashboard |
| `/portal/partner` | Alternative partner route |

### Admin Console (SECRET - Change before production!)
| Route | Description |
|-------|-------------|
| `/portal/admin-sr2025secure` | **Admin Dashboard** |

⚠️ **SECURITY:** The admin URL should be changed and secured before production deployment.

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Icons:** Lucide React
- **Routing:** React Router v6
- **UI Components:** Custom + Shadcn/UI

### Backend
- **Framework:** FastAPI (Python 3.10+)
- **Data:** In-memory (mock) - needs database migration
- **Maps:** OpenStreetMap tiles (custom implementation)
- **CORS:** Configured for development

### Data Storage (Current - Mock)
- All data stored in Python dictionaries
- Resets on server restart
- Ready for PostgreSQL/MongoDB migration

---

## 📁 Key Files

### Frontend
```
/app/frontend/src/
├── App.tsx                          # Main router
├── pages/
│   ├── WelcomePage.tsx              # Landing page
│   ├── DriverApp/index.tsx          # Main driver app (large file)
│   ├── PartnerDashboard.tsx         # Partner portal
│   └── AdminDashboard.tsx           # Admin console
└── public/assets/logo.png           # App logo
```

### Backend
```
/app/backend/
├── server.py                        # All API endpoints (monolithic)
├── .env                             # Environment variables
└── tests/                           # Test files
```

---

## 🔌 API Base URL

```
Development: http://localhost:8001/api
Production:  https://your-domain.com/api
```

All frontend API calls should use the `REACT_APP_BACKEND_URL` environment variable.

---

## 🚀 Quick Start

### Development
```bash
# Terminal 1 - Backend
cd /app/backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Terminal 2 - Frontend
cd /app/frontend
yarn install
yarn dev
```

### Production Build
```bash
# Frontend
cd /app/frontend
yarn build
# Output in /app/frontend/dist/

# Backend - use production server
gunicorn server:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8001
```

---

## 🔐 Partner Plans

| Plan | Price (Founders) | Price (Public) | Max Locations |
|------|-----------------|----------------|---------------|
| Starter | $20.99/mo | $34.99/mo | 5 |
| Growth | $49.99/mo | $79.99/mo | 25 |
| Enterprise | Custom | Custom | Unlimited |

---

## 🎮 Driver Plans

| Plan | Price | Features |
|------|-------|----------|
| Basic | Free | Standard offers, basic features |
| Premium | $4.99/mo | Better discounts, exclusive offers, premium features |

---

## 📊 Key Metrics (Mocked)

All analytics data is currently mocked and returns random values. Production implementation required for:
- Real-time views/clicks/redemptions
- Revenue tracking
- User engagement metrics
- Partner performance analytics

---

## ⚡ Priority Implementation Order

1. **P0 (Week 1-2):**
   - Database integration (PostgreSQL)
   - User authentication (Auth0/Firebase)
   - Real maps API (Mapbox geocoding)

2. **P1 (Week 3-4):**
   - Stripe payments integration
   - AI image generation
   - Email notifications

3. **P2 (Week 5-6):**
   - Push notifications
   - Real-time updates (WebSocket)
   - Gas price API

4. **P3 (Future):**
   - Native iOS app
   - Advanced analytics
   - Machine learning recommendations

---

## 📄 Documentation

- **Full Deployment Scope:** `/app/memory/DEPLOYMENT_SCOPE.md`
- **Product Requirements:** `/app/memory/PRD.md`
- **This Quick Reference:** `/app/memory/QUICK_REFERENCE.md`

---

**Good luck with your deployment! 🚀**
