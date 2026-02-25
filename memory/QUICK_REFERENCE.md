# SnapRoad Quick Reference
> **Last Updated:** December 2025

---

## Services

| Service | Port | Status Check |
|---------|------|--------------|
| Frontend | 3000 | `sudo supervisorctl status frontend` |
| Backend | 8001 | `sudo supervisorctl status backend` |
| MongoDB | 27017 | `sudo supervisorctl status mongodb` |

```bash
# Restart services
sudo supervisorctl restart frontend
sudo supervisorctl restart backend

# View logs
tail -f /var/log/supervisor/backend.out.log
tail -f /var/log/supervisor/frontend.out.log
```

---

## Test Credentials

| Role | Email | Password | URL |
|------|-------|----------|-----|
| Driver | driver@snaproad.com | password123 | /driver |
| Partner | partner@snaproad.com | password123 | /portal/partner |
| Admin | admin@snaproad.com | password123 | /portal/admin-sr2025secure |

---

## API Quick Tests

```bash
# Get API URL
API_URL=$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d '=' -f2)

# Health check
curl $API_URL/api/health

# Login
curl -X POST $API_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"driver@snaproad.com","password":"password123"}'

# Get offers
curl $API_URL/api/offers

# Get badges
curl $API_URL/api/badges

# Get payment plans
curl $API_URL/api/payments/plans
```

---

## Key Files

### Mobile App
| What | Where |
|------|-------|
| Navigation | `/app/snaproad-mobile/src/navigation/index.tsx` |
| All Screens | `/app/snaproad-mobile/src/screens/` |
| Components | `/app/snaproad-mobile/src/components/` |
| API Service | `/app/snaproad-mobile/src/services/api.ts` |
| Theme | `/app/snaproad-mobile/src/utils/theme.ts` |
| Config | `/app/snaproad-mobile/src/config.ts` |

### Backend
| What | Where |
|------|-------|
| Entry Point | `/app/backend/server.py` |
| App Factory | `/app/backend/main.py` |
| Routes | `/app/backend/routes/` |
| Payments | `/app/backend/routes/payments.py` |
| AI Services | `/app/backend/services/orion_coach.py` |
| Migration SQL | `/app/backend/sql/supabase_migration.sql` |
| Environment | `/app/backend/.env` |

### Documentation
| What | Where |
|------|-------|
| PRD | `/app/memory/PRD.md` |
| Feature Audit | `/app/memory/FEATURE_AUDIT.md` |
| API Guide | `/app/memory/API_INTEGRATION_GUIDE.md` |
| PM Guide | `/app/memory/PM_COORDINATION_GUIDE.md` |
| Mobile Guide | `/app/memory/KATHIR_MOBILE_GUIDE.md` |
| Backend Guide | `/app/memory/ANDREW_BACKEND_GUIDE.md` |
| Web Guide | `/app/memory/BRIAN_WEB_GUIDE.md` |

---

## Feature Status

| Feature | Mobile | Backend | Database |
|---------|--------|---------|----------|
| Auth | DONE | DONE | SUPABASE |
| Offers | DONE | DONE | MOCK |
| Badges | DONE | DONE | MOCK |
| Challenges | DONE | DONE | MOCK |
| Trips | DONE | DONE | MOCK |
| Payments | DONE | DONE | IN-MEMORY |
| AI Chat | DONE | LIVE | N/A |
| Photo | DONE | LIVE | N/A |

---

## Blocked Items

### Supabase Migration
```
STATUS: BLOCKED
ACTION: User must run SQL manually

1. Open Supabase Dashboard → SQL Editor
2. Paste /app/backend/sql/supabase_migration.sql
3. Click "Run"
```

---

## Screen Count

| Category | Count |
|----------|-------|
| Onboarding | 4 |
| Core Tabs | 5 |
| Analytics | 6 |
| Gamification | 7 |
| Navigation | 6 |
| Social | 4 |
| Offers/Payments | 4 |
| AI/Camera | 2 |
| Settings | 7 |
| Admin/Partner | 2 |
| **TOTAL** | **47** |

---

## Team Contacts

| Role | Name | Focus |
|------|------|-------|
| Engineering Lead | Andrew | Backend, API, Supabase |
| Frontend Developer | Brian | Web, Design System |
| Mobile Developer | Kathir | React Native, Navigation |
| Product Manager | PM | Roadmap, MapKit, Stakeholders |

---

*Quick reference for SnapRoad development team*
