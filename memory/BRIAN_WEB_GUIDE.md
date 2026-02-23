# Brian - Frontend Developer Guide
> **Role:** Frontend Developer  
> **Last Updated:** December 2025  
> **Focus:** React web app (reference), component library, design system

---

## Important Note

**The `/driver` route is now a REFERENCE IMPLEMENTATION only.**

All active development has moved to `snaproad-mobile` (React Native/Expo). The web frontend at `/driver` is maintained as:
1. A visual reference for feature parity
2. A stakeholder preview tool
3. Documentation of intended UX flows

---

## Quick Start

```bash
# Navigate to frontend
cd /app/frontend

# Start dev server
yarn dev

# Build for production
yarn build
```

---

## 1. Architecture Overview

```
/app/frontend/
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── .env                    # REACT_APP_BACKEND_URL, VITE_API_URL
└── src/
    ├── App.tsx             # Root router
    ├── main.tsx            # ReactDOM entry
    ├── index.css           # Global styles
    ├── pages/
    │   ├── DriverApp/      # Main driver app (REFERENCE)
    │   │   ├── index.tsx   # 3,012 lines
    │   │   └── components/ # 34 sub-components
    │   ├── AdminDashboard.tsx
    │   ├── PartnerDashboard.tsx
    │   ├── WelcomePage.tsx
    │   ├── PhonePreviewPage.tsx
    │   └── Auth/
    ├── components/
    │   ├── figma-ui/       # Design system components
    │   ├── HelpModal.tsx
    │   ├── NotificationSystem.tsx
    │   └── SettingsModal.tsx
    ├── contexts/
    │   ├── AuthContext.tsx
    │   ├── ThemeContext.tsx
    │   └── SnaproadThemeContext.tsx
    ├── services/
    │   ├── api.ts          # ApiService class
    │   └── partnerApi.ts   # Partner API + WebSocket
    ├── lib/
    │   ├── offer-pricing.ts
    │   ├── partner-plans.ts
    │   └── utils.ts
    └── types/
        └── api.ts
```

---

## 2. Route Map

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | WelcomePage | Public landing |
| `/driver` | DriverApp | Driver app REFERENCE |
| `/driver/auth` | AuthFlow | Driver onboarding |
| `/preview` | PhonePreviewPage | iPhone frame preview |
| `/portal/partner` | PartnerDashboard | Partner portal |
| `/portal/admin-sr2025secure` | AdminDashboard | Admin console |
| `/app/*` | SnapRoadApp | Figma prototype |
| `/business` | BusinessDashboard | Legacy |

---

## 3. Driver App Reference (`/driver`)

### Location
`/app/frontend/src/pages/DriverApp/index.tsx` (3,012 lines)

### Purpose
This is the **reference implementation** that shows the complete feature set. Mobile developers should replicate this UX in `snaproad-mobile`.

### Features Implemented
- 4-tab navigation (Map, Routes, Rewards, Profile)
- Hamburger menu with all sections
- Map with offer pins and gem markers
- Offer redemption flow
- Challenge creation and acceptance
- Badge collection
- Leaderboard
- Car customization studio
- Orion AI voice assistant
- Photo report with AI blur
- Turn-by-turn navigation UI
- Weekly recap
- Level progress
- Settings

### Sub-Components (34)
| Component | File | Purpose |
|-----------|------|---------|
| BadgesGrid | `BadgesGrid.tsx` | Badge collection display |
| Car3D | `Car3D.tsx` | Three.js 3D car preview |
| CarOnboarding | `CarOnboarding.tsx` | Car selection flow |
| CarStudioNew | `CarStudioNew.tsx` | Car customization |
| ChallengeHistory | `ChallengeHistory.tsx` | Past challenges |
| ChallengeModal | `ChallengeModal.tsx` | Create/view challenge |
| CollapsibleOffersPanel | `CollapsibleOffersPanel.tsx` | Map offers panel |
| CommunityBadges | `CommunityBadges.tsx` | Community badge display |
| DrivingScore | `DrivingScore.tsx` | 6-metric breakdown |
| FriendsHub | `FriendsHub.tsx` | Friends list |
| FuelTracker | `FuelTracker.tsx` | Fuel log |
| GemHistory | `GemHistory.tsx` | Gem transactions |
| GemOverlay | `GemOverlay.tsx` | AR gem collection |
| HelpSupport | `HelpSupport.tsx` | FAQ + contact |
| InAppBrowser | `InAppBrowser.tsx` | Embedded browser |
| InteractiveMap | `InteractiveMap.tsx` | Main map |
| Leaderboard | `Leaderboard.tsx` | Rankings |
| LevelProgress | `LevelProgress.tsx` | XP progress |
| NotificationSettings | `NotificationSettings.tsx` | Push prefs |
| OffersModal | `OffersModal.tsx` | Offer detail |
| OrionOfferAlerts | `OrionOfferAlerts.tsx` | Voice alerts |
| OrionVoice | `OrionVoice.tsx` | AI voice interface |
| PlanSelection | `PlanSelection.tsx` | Basic/Premium |
| QuickPhotoReport | `QuickPhotoReport.tsx` | Photo incident |
| RedemptionPopup | `RedemptionPopup.tsx` | Redeem confirm |
| RoadReports | `RoadReports.tsx` | Community reports |
| RoadStatusOverlay | `RoadStatusOverlay.tsx` | Road conditions |
| RouteHistory3D | `RouteHistory3D.tsx` | 3D route viz |
| ShareTripScore | `ShareTripScore.tsx` | Trip share card |
| TripAnalytics | `TripAnalytics.tsx` | Trip breakdown |
| TripHistory | `TripHistory.tsx` | Trip list |
| WeeklyRecap | `WeeklyRecap.tsx` | Weekly summary |

---

## 4. Admin Dashboard

### Location
`/app/frontend/src/pages/AdminDashboard.tsx` (1,538 lines)

### URL
`/portal/admin-sr2025secure`

### Tabs
| Tab | Purpose |
|-----|---------|
| Overview | Metrics, 30-day chart, top partners |
| Users | User table with search/filter |
| Partners | Partner management |
| Events | Platform events |
| Offers | Create/edit/export/import offers |
| AI Moderation | Real-time WebSocket incident feed |

### Key Features
- Theme toggle (dark/light)
- Supabase migration banner
- Bulk offer upload (CSV)
- Export to JSON/CSV
- Real-time AI moderation queue

---

## 5. Partner Dashboard

### Location
`/app/frontend/src/pages/PartnerDashboard.tsx` (1,748 lines)

### URL
`/portal/partner`

### Tabs
| Tab | Purpose |
|-----|---------|
| Overview | Revenue chart, today's stats |
| Offers | Create/manage offers |
| Locations | Store locations CRUD |
| Analytics | Views/clicks/redemptions |
| Boosts | Boost packages |
| Finance | Credit balance, earnings |
| Referrals | Referral program |
| Plans | Subscription plans |

---

## 6. figma-ui Component Library

### Location
`/app/frontend/src/components/figma-ui/`

### Purpose
Figma-accurate design system components for prototype routes.

### Mobile Components (`mobile/`)
| Component | Purpose |
|-----------|---------|
| MapScreen | Main map |
| Profile | User profile |
| Gems | Gems wallet |
| Family | Family tracking |
| BottomNav | Bottom navigation |
| FuelDashboard | Fuel stats |
| TripLogs | Trip history |
| Leaderboard | Rankings |
| Settings | App settings |
| LiveLocations | Location sharing |
| Onboarding | Onboarding flow |
| OrionCoach | AI chat |
| PhotoCapture | Photo report |
| DriverAnalytics | Analytics |

### Admin Components (`admin/`)
- AdminDashboard, AdminLayout, AdminLogin, AdminOfferManagement, AdminUsers

### Partner Components (`partner/`)
- PartnerDashboard, PartnerLayout, PartnerOffers, PartnerAnalyticsDetailed, PartnerTeam, PartnerReferrals, QRScanner, CustomerOfferQR

---

## 7. API Layer

### ApiService (`services/api.ts`)
```typescript
class ApiService {
  private baseUrl = import.meta.env.VITE_API_URL || '/api';
  
  async get(endpoint: string) { /* ... */ }
  async post(endpoint: string, data: any) { /* ... */ }
  async put(endpoint: string, data: any) { /* ... */ }
  async delete(endpoint: string) { /* ... */ }
}

export const apiService = new ApiService();
```

### PartnerApiService (`services/partnerApi.ts`)
```typescript
class PartnerApiService extends ApiService {
  // Partner-specific methods
  async getLocations() { /* ... */ }
  async createOffer(data: any) { /* ... */ }
  
  // WebSocket connection
  connectWebSocket(partnerId: string) {
    return new WebSocket(`${wsUrl}/api/ws/partner/${partnerId}`);
  }
}
```

---

## 8. Design System

### Colors (CSS Variables)
```css
:root {
  --sr-primary: #2563eb;
  --sr-secondary: #10b981;
  --sr-background: #0f172a;
  --sr-surface: #1e293b;
  --sr-text: #f8fafc;
  --sr-text-muted: #94a3b8;
}
```

### Typography
- Font: System fonts (Inter, SF Pro, Roboto)
- Scale: text-sm, text-base, text-lg, text-xl, text-2xl

### Icons
- Primary: Lucide React (`lucide-react`)
- Secondary: Heroicons (`@heroicons/react`)

### Utilities
```typescript
// lib/utils.ts
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## 9. Environment Variables

```bash
# /app/frontend/.env
REACT_APP_BACKEND_URL=https://feature-stitch.preview.emergentagent.com
VITE_API_URL=/api
VITE_BACKEND_URL=https://feature-stitch.preview.emergentagent.com
```

---

## 10. Legacy Cleanup Candidates

The following pages are legacy and can be removed after final verification:

| Path | File | Status |
|------|------|--------|
| `/dashboard/*` | `pages/Dashboard/` | UNUSED |
| `/dashboard/incidents` | `pages/Incidents/` | UNUSED |
| `/dashboard/partners` | `pages/Partners/` | UNUSED |
| `/dashboard/rewards` | `pages/Rewards/` | UNUSED |
| `/dashboard/settings` | `pages/Settings/` | UNUSED |
| `/dashboard/trips` | `pages/Trips/` | UNUSED |
| `/dashboard/users` | `pages/Users/` | UNUSED |
| `/business` | `pages/BusinessDashboard/` | UNUSED |

These can be removed once the PM confirms they are not needed.

---

## 11. What's NOT Your Responsibility

Since all active development moved to `snaproad-mobile`:

| Task | Owner |
|------|-------|
| New mobile screens | Kathir (Mobile) |
| API endpoints | Andrew (Backend) |
| Database migration | PM (Coordination) |
| Apple MapKit | PM + Kathir |

Your role is now:
1. Maintain the `/driver` reference
2. Update Admin/Partner dashboards if needed
3. Design system documentation

---

## 12. Testing

### Manual Testing
```bash
# Start frontend
cd /app/frontend && yarn dev

# Open in browser
open https://feature-stitch.preview.emergentagent.com
```

### Test Credentials
| Role | Email | Password | URL |
|------|-------|----------|-----|
| Driver | driver@snaproad.com | password123 | /driver |
| Partner | partner@snaproad.com | password123 | /portal/partner |
| Admin | admin@snaproad.com | password123 | /portal/admin-sr2025secure |

---

## 13. File Reference

| What | Where |
|------|-------|
| App Router | `/app/frontend/src/App.tsx` |
| Driver Reference | `/app/frontend/src/pages/DriverApp/` |
| Admin Dashboard | `/app/frontend/src/pages/AdminDashboard.tsx` |
| Partner Dashboard | `/app/frontend/src/pages/PartnerDashboard.tsx` |
| API Service | `/app/frontend/src/services/api.ts` |
| Design System | `/app/frontend/src/components/figma-ui/` |
| Contexts | `/app/frontend/src/contexts/` |
| Types | `/app/frontend/src/types/` |

---

*Document owner: Frontend Developer (Brian) | Last updated: December 2025*
