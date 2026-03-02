# SnapRoad — Frontend Developer Documentation (Brian)
> **Role:** Frontend Developer | **Updated:** February 2026  
> **Focus:** Web app architecture, component library, routes, design system

---

## 1. Web App Overview

**Framework:** React + Vite + TypeScript  
**Styling:** Tailwind CSS + custom CSS variables  
**State:** Zustand (auth) + React Context (theme, auth)  
**Backend URL:** `REACT_APP_BACKEND_URL` (env var) + `VITE_API_URL` (set to `/api`)

---

## 2. Repository Structure

```
/app/frontend/
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── .env                         # REACT_APP_BACKEND_URL, VITE_API_URL, VITE_BACKEND_URL
└── src/
    ├── App.tsx                  # Root router (all routes defined here)
    ├── main.tsx                 # ReactDOM entry
    ├── index.css                # Global styles
    ├── pages/
    │   ├── AdminDashboard.tsx   # Admin console (1,538 lines)
    │   ├── PartnerDashboard.tsx # Partner portal (1,748 lines)
    │   ├── DriverApp/
    │   │   ├── index.tsx        # Driver mobile-web preview (3,012 lines)
    │   │   └── components/      # 32 sub-components
    │   ├── WelcomePage.tsx      # Public landing page
    │   ├── PhonePreviewPage.tsx # Premium phone-framed app preview at /preview
    │   ├── Auth/
    │   │   ├── AuthFlow.tsx     # Driver onboarding auth
    │   │   └── Login.tsx        # Legacy login page
    │   ├── BusinessDashboard/   # Legacy (at /business)
    │   ├── Dashboard/           # Legacy protected admin
    │   ├── Incidents/           # Legacy protected
    │   ├── Partners/            # Legacy protected
    │   ├── Rewards/             # Legacy protected
    │   ├── Settings/            # Legacy protected
    │   ├── Trips/               # Legacy protected
    │   └── Users/               # Legacy protected
    ├── components/
    │   ├── figma-ui/            # Figma design system (see section 5)
    │   ├── HelpModal.tsx
    │   ├── Layout.tsx           # Legacy dashboard layout
    │   ├── NotificationSystem.tsx
    │   └── SettingsModal.tsx
    ├── contexts/
    │   ├── AuthContext.tsx      # Auth context (mock user + JWT)
    │   ├── SnaproadThemeContext.tsx  # Theme for figma-ui
    │   └── ThemeContext.tsx     # Dark/Light theme
    ├── store/
    │   └── authStore.ts         # Zustand auth state
    ├── services/
    │   ├── api.ts               # Legacy ApiService class (all endpoints)
    │   └── partnerApi.ts        # PartnerApiService + WebSocket client
    ├── lib/
    │   ├── offer-pricing.ts     # Gem pricing tiers, calculateGemCost()
    │   ├── partner-plans.ts     # Partner subscription plan definitions
    │   ├── snaproad-utils.ts    # cn() utility + shared helpers
    │   └── utils.ts             # cn() utility (secondary copy)
    ├── types/
    │   └── api.ts               # TypeScript interfaces for all API responses
    └── styles/
        ├── snaproad-globals.css
        └── snaproad-index.css
```

---

## 3. Route Map

**File:** `src/App.tsx`

| Route | Component | Auth? | Description |
|-------|-----------|-------|-------------|
| `/` | `WelcomePage` | No | Public landing page |
| `/login` | `Login` | No | Legacy login |
| `/driver` | `DriverApp` | No | Full driver mobile-web preview |
| `/driver/auth` | `AuthFlow` | No | Driver onboarding auth flow |
| `/preview` | `PhonePreviewPage` | No | Premium phone-frame app showcase |
| `/portal/partner` | `PartnerDashboard` | No | Partner portal |
| `/portal/admin-sr2025secure` | `AdminDashboard` | No | Admin console |
| `/app/*` | `SnapRoadApp` | No | Figma prototype routes |
| `/business` | `BusinessDashboard` | No | Legacy business dashboard |
| `/partner` | Redirect → `/portal/partner` | No | Redirect |
| `/admin` | Redirect → `/` | No | Redirect |
| `/dashboard/*` | Protected `Layout` | Yes | Legacy admin routes |

---

## 4. Key Pages

### Admin Dashboard (`pages/AdminDashboard.tsx`)
**URL:** `/portal/admin-sr2025secure`  
**Size:** 1,538 lines  
**Theme:** Dark/Light toggle (uses `ThemeContext`)

**Tabs:**
| Tab | Component | Key Features |
|-----|-----------|-------------|
| Overview | Inline | Metric cards, 30-day chart, top partners, user growth |
| Users | `FigmaUsersTab` | User table with search/filter/status badges |
| Partners | Inline | Partner table with plan badges |
| Events | Inline | Event list (Supabase → Mock) |
| Offers | `AdminOffersList` | Create/edit/export/import offers |
| AI Moderation | `AIModerationTab` | **Real-time WebSocket** incident feed |

**Key inline sub-components:**
- `AIModerationTab` — WebSocket client to `/api/ws/admin/moderation`. 5 filter tabs (All, Pending, High Risk, Approved, Rejected). Simulate button calls `POST /api/admin/moderation/simulate`.
- `SupabaseMigrationBanner` — Shows DB status; triggers migration (currently blocked by firewall)
- `CreateOfferModal` — Full offer creation form
- `ExportModal` / `ImportModal` — Bulk data operations
- `BulkUploadModal` — CSV drag-and-drop upload

### Partner Dashboard (`pages/PartnerDashboard.tsx`)
**URL:** `/portal/partner`  
**Size:** 1,748 lines  
**Theme:** Dark/Light toggle

**Tabs:**
| Tab | Component | Key Features |
|-----|-----------|-------------|
| Overview | Inline | Revenue chart, today's stats |
| Offers | Inline | Create/manage offers, boost controls |
| Locations | Inline | Map + location CRUD |
| Analytics | Inline | Real-time views/clicks/redemptions chart |
| Boosts | Inline | Boost packages + active boost management |
| Finance | `PartnerFinanceTab` | Credit balance, earnings history |
| Referrals | `PartnerReferralsTab` | Referral list + send invites |
| Plans | Inline | Partner subscription plan selector |

### Driver App (`pages/DriverApp/index.tsx`)
**URL:** `/driver`  
**Size:** 3,012 lines  
**Description:** Full mobile-style UI in browser. Contains all driver features.

**Sub-components** (`pages/DriverApp/components/`):
| Component | Description |
|-----------|-------------|
| `BadgesGrid` | Earned/unearned badges display |
| `Car3D` | Three.js 3D car preview |
| `CarOnboarding` | Car selection onboarding |
| `CarStudioNew` | Car customization studio |
| `ChallengeHistory` | Past challenge results |
| `ChallengeModal` | Create/view challenge |
| `CollapsibleOffersPanel` | Offers panel on map |
| `CommunityBadges` | Community badge display |
| `DrivingScore` | 6-metric score breakdown |
| `FriendsHub` | Friends + challenge initiation |
| `FuelTracker` | Fuel log + cost tracker |
| `GemHistory` | Gem transaction history |
| `GemOverlay` | AR-style gem collection |
| `HelpSupport` | FAQ + contact |
| `InAppBrowser` | Embedded browser for offers |
| `InteractiveMap` | Main map with pins |
| `Leaderboard` | Driver leaderboard |
| `LevelProgress` | XP progress bar |
| `NotificationSettings` | Notification preferences |
| `OffersModal` | Offer detail + redeem |
| `OrionOfferAlerts` | AI-powered offer alerts |
| `OrionVoice` | Voice interface for Orion AI |
| `PlanSelection` | Basic vs Premium selector |
| `QuickPhotoReport` | Quick photo incident |
| `RedemptionPopup` | Redeem success popup |
| `RoadReports` | Community reports feed |
| `RoadStatusOverlay` | Map road conditions overlay |
| `RouteHistory3D` | Three.js 3D route history |
| `ShareTripScore` | Trip score sharing card |
| `TripAnalytics` | Detailed trip analytics |
| `TripHistory` | Trip history list |
| `WeeklyRecap` | Weekly driving summary |

### Phone Preview Page (`pages/PhonePreviewPage.tsx`)
**URL:** `/preview`  
**Description:** Premium showcase of the mobile app UI inside an iPhone-style frame
- Dynamic Island + status bar (time, wifi, battery icons)
- Side buttons, home indicator
- Live interactive DriverApp loaded inside via iframe
- Floating feature badges (Earn Gems, Safety Score, AI Coach, etc.)
- "Open Full Screen" and "Get Started" CTAs
- Ambient glow effects

---

## 5. figma-ui Component Library

**Directory:** `src/components/figma-ui/`  
**Access:** Via `/app/*` routes (handled by `SnapRoadApp.tsx`)  
**Purpose:** Figma-accurate design system components

**SnapRoadApp.tsx** routes:
- `?mode=admin` → admin components
- `?mode=partner` → partner components
- Default → mobile screen components

**Mobile Components** (`figma-ui/mobile/`):
| Component | Description |
|-----------|-------------|
| `auth/Welcome.tsx` | Welcome splash |
| `auth/Login.tsx` | Login screen |
| `auth/SignUp.tsx` | Sign up screen |
| `MapScreen.tsx` | Main map |
| `Profile.tsx` | User profile |
| `Gems.tsx` | Gems wallet |
| `Family.tsx` | Family tracking |
| `BottomNav.tsx` | Bottom navigation |
| `FuelDashboard.tsx` | Fuel stats |
| `TripLogs.tsx` | Trip history |
| `Leaderboard.tsx` | Leaderboard |
| `Settings.tsx` | App settings |
| `LiveLocations.tsx` | Live location sharing |
| `AccountInfo.tsx` | Account details |
| `PrivacyCenter.tsx` | Privacy settings |
| `NotificationSettings.tsx` | Notifications |
| `Onboarding.tsx` | Onboarding flow |
| `OrionCoach.tsx` | AI coach chat |
| `PhotoCapture.tsx` | Photo report |
| `DriverAnalytics.tsx` | Analytics screen |
| `DriverMapScreen.tsx` | Alt map screen |

**Admin Components** (`figma-ui/admin/`):
- `AdminDashboard.tsx`, `AdminLayout.tsx`, `AdminLogin.tsx`, `AdminOfferManagement.tsx`, `AdminUsers.tsx`

**Partner Components** (`figma-ui/partner/`):
- `PartnerDashboard.tsx`, `PartnerLayout.tsx`, `PartnerOffers.tsx`, `PartnerAnalyticsDetailed.tsx`, `PartnerTeam.tsx`, `PartnerReferrals.tsx`, `QRScanner.tsx`, `CustomerOfferQR.tsx`

**Primitives** (`figma-ui/primitives/`):
- `GemIcon.tsx`, `GradientButton.tsx`, `ImageWithFallback.tsx`

---

## 6. Services & API Layer

### `services/api.ts` (Legacy)
`ApiService` class — covers all 40+ REST endpoints. Uses `VITE_API_URL` (set to `/api`).  
Used by: DriverApp, legacy auth routes.

### `services/partnerApi.ts`
`PartnerApiService` class — Partner Portal REST + WebSocket.  
Used by: `PartnerDashboard.tsx`  
Key method: `connectWebSocket(partnerId)` — connects to `/api/ws/partner/{partnerId}`

---

## 7. Contexts

| Context | File | Used By |
|---------|------|---------|
| `AuthContext` | `contexts/AuthContext.tsx` | Legacy `/dashboard/*` routes |
| `SnaproadThemeContext` | `contexts/SnaproadThemeContext.tsx` | figma-ui components |
| `ThemeContext` | `contexts/ThemeContext.tsx` | AdminDashboard, PartnerDashboard |

---

## 8. Environment Variables (Frontend)

File: `/app/frontend/.env`

| Variable | Value | Used By |
|----------|-------|---------|
| `REACT_APP_BACKEND_URL` | External Kubernetes URL | Testing, curl commands |
| `VITE_API_URL` | `/api` | `services/api.ts` |
| `VITE_BACKEND_URL` | External URL | AdminDashboard, PartnerDashboard |

---

## 9. Design System Conventions

- **Colors:** CSS variables defined in `src/index.css` and `src/styles/snaproad-globals.css`
- **Theme:** Dark mode default, toggleable via `ThemeContext`
- **Typography:** Consistent scale using Tailwind (text-sm, text-base, text-lg, text-xl, etc.)
- **Components:** Tailwind utility classes + `cn()` from `lib/snaproad-utils.ts`
- **Icons:** Lucide React (`lucide-react`) and `@heroicons/react`

---

## 10. What Needs to Be Connected

| Task | Priority | Notes |
|------|----------|-------|
| Connect DriverApp to real API data | P1 | `services/api.ts` calls already wired; backend is mock |
| Connect AdminDashboard metrics to Supabase | P1 | After migration |
| Connect PartnerDashboard analytics to real data | P1 | After migration |
| Implement real map (Apple Maps MapKit) | P2 | Currently mock map UI |
| Add Stripe payment UI | P2 | Backend webhook handler exists |
| Clean up legacy pages (Dashboard, Trips, etc.) | P3 | See `code_cleanup_candidates.md` |

---

## 11. Timestamps

| Milestone | Date |
|-----------|------|
| Admin Dashboard rebuilt (6 tabs + AI Moderation) | Feb 2026 |
| Partner Dashboard rebuilt (8 tabs incl. Finance, Referrals) | Feb 2026 |
| Phone Preview Page (`/preview`) created | Feb 2026 |
| WelcomePage updated with App Preview link | Feb 2026 |
| figma-ui component library built | Feb 2026 |
| **Next:** Connect to live Supabase data | TBD |

---

## 12. Quick Dev Commands

```bash
# Start frontend dev server
cd /app/frontend && yarn dev

# Build for production
yarn build

# Type check
yarn tsc --noEmit
```

---

*Document owner: Frontend Developer (Brian) | Last updated: February 2026*
