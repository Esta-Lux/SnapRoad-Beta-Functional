# SnapRoad — Code Cleanup Candidates

> Generated: February 2026  
> Purpose: Identify dead code, unused files, legacy artifacts, and redundancy for safe removal.  
> **Review each item before deleting.** Priority levels: 🔴 High (safe to delete now), 🟡 Medium (review first), 🟢 Low (consider consolidating)

---

## Summary

| Priority | Count | Category |
|----------|-------|----------|
| 🔴 High — Safe to delete | 15 items | Legacy pages, backup files, orphaned routes |
| 🟡 Medium — Review first | 8 items | Duplicate abstractions, stale test files |
| 🟢 Low — Consider consolidating | 6 items | Redundant env vars, duplicate utilities |

---

## 🔴 HIGH PRIORITY — Safe to Delete

### 1. Backup File
**File:** `/app/frontend/src/pages/DriverApp/index.tsx.backup`  
**Why:** This is an explicit `.backup` file of the active `index.tsx`. It is 51KB of stale code and serves no purpose in a version-controlled repo.  
**Action:** Delete the file.

---

### 2. Legacy Protected Admin Dashboard (unused shell)
**Files:**
- `/app/frontend/src/pages/Dashboard/index.tsx`
- `/app/frontend/src/components/Layout.tsx`

**Why:** The `/dashboard` protected route uses `Layout.tsx` as a shell that renders old sub-pages. The entire `/dashboard/*` route tree has been superseded by the new `/portal/admin-sr2025secure` (AdminDashboard). The old dashboard contains mock admin data tables and is no longer shown to users.  
**Action:** Remove these two files, and remove the `/dashboard` route block from `App.tsx`.

---

### 3. Legacy Protected Sub-pages (unreachable without /dashboard route)
**Files:**
- `/app/frontend/src/pages/Users/index.tsx`
- `/app/frontend/src/pages/Users/UserDetail.tsx`
- `/app/frontend/src/pages/Trips/index.tsx`
- `/app/frontend/src/pages/Trips/TripDetail.tsx`
- `/app/frontend/src/pages/Incidents/index.tsx`
- `/app/frontend/src/pages/Incidents/IncidentDetail.tsx`
- `/app/frontend/src/pages/Rewards/index.tsx`
- `/app/frontend/src/pages/Partners/index.tsx`
- `/app/frontend/src/pages/Partners/PartnerDetail.tsx`
- `/app/frontend/src/pages/Settings/index.tsx`

**Why:** These pages are only reachable via the `/dashboard/*` protected routes (e.g., `/dashboard/users`, `/dashboard/trips`). All their functionality has been superseded by the new Admin Dashboard at `/portal/admin-sr2025secure`. None of these pages are linked from the main navigation.  
**Action:** Delete all 10 files. Remove their imports from `App.tsx` and the `/dashboard` route block.

---

### 4. Orphaned UserDashboard Page
**File:** `/app/frontend/src/pages/UserDashboard/index.tsx`  
**Why:** This page is **not registered in any route** in `App.tsx`. It exists but is completely unreachable. The user-facing dashboard for drivers is the `/driver` route (DriverApp), not this file.  
**Action:** Delete the file.

---

### 5. Legacy Business Dashboard
**File:** `/app/frontend/src/pages/BusinessDashboard/index.tsx`  
**Why:** Accessible only at `/business` (a legacy, undocumented path). The Partner Dashboard at `/portal/partner` is the active replacement. There are no links pointing to `/business` in any current UI.  
**Action:** Delete the file and remove the `/business` route from `App.tsx`. Optionally add a redirect from `/business` → `/portal/partner`.

---

### 6. Legacy Auth Login Page
**File:** `/app/frontend/src/pages/Auth/Login.tsx`  
**Why:** This is the old `/login` route. The active authentication flow for drivers is `/driver/auth` (AuthFlow). The `/login` path is not linked from the current WelcomePage or any modern UI.  
**Caution:** Verify no external links point to `/login` before deleting.  
**Action:** After verification, delete the file and remove the `/login` route from `App.tsx`.

---

## 🟡 MEDIUM PRIORITY — Review Before Removing

### 7. Duplicate Authentication Abstractions
**Files:**
- `/app/frontend/src/contexts/AuthContext.tsx` — Context with mock user, used by legacy `/dashboard` routes
- `/app/frontend/src/store/authStore.ts` — Zustand store used by `ProtectedRoute` guard

**Why:** Two separate auth abstractions exist for the same purpose. `AuthContext` was the original; `authStore` was added for the new setup. `AuthContext` includes a hardcoded `mockUser` object.  
**Action:** Once the legacy `/dashboard` routes are removed (see items #2–3 above), `AuthContext.tsx` becomes fully unused and can be deleted. Keep `authStore.ts`.

---

### 8. Duplicate `cn()` Utility
**Files:**
- `/app/frontend/src/lib/utils.ts` — Exports only `cn()` (Tailwind class merge)
- `/app/frontend/src/lib/snaproad-utils.ts` — Also exports `cn()` plus `formatDate`, `formatDistance`

**Why:** Both files export a `cn()` function. `utils.ts` serves no purpose beyond what `snaproad-utils.ts` already provides.  
**Action:** Migrate any imports of `../lib/utils` to `../lib/snaproad-utils`. Delete `utils.ts`.

---

### 9. Duplicate GradientButton Component
**Files:**
- `/app/frontend/src/components/figma-ui/primitives/GradientButton.tsx` — Used in figma-ui components
- `/app/frontend/src/components/ui/GradientButton.tsx` — In the shadcn/ui folder

**Why:** Two gradient button components exist. The figma-ui one is actively used by figma-ui components. The `/ui/` version may be unused.  
**Action:** Check if `/app/frontend/src/components/ui/GradientButton.tsx` is imported anywhere. If not, delete it.

---

### 10. ThemeContext vs SnaproadThemeContext
**Files:**
- `/app/frontend/src/contexts/ThemeContext.tsx` — General dark/light theme context
- `/app/frontend/src/contexts/SnaproadThemeContext.tsx` — Theme for figma-ui components (exports `SnaproadThemeProvider`, `useSnaproadTheme`)

**Why:** Two separate theme contexts serve overlapping purposes. The main dashboards (AdminDashboard, PartnerDashboard) manage their own `theme` state locally and don't use either context.  
**Action:** Audit which components import `ThemeContext`. If none do after legacy route removal, delete `ThemeContext.tsx`.

---

### 11. Stale/Superseded Test Files
**Directory:** `/app/backend/tests/`

Several test files were created during iterative development and may test code that has since been refactored or superseded:

| File | Likely Status |
|------|--------------|
| `test_new_features.py` | May overlap with `test_new_features_iter28.py` |
| `test_welcome_onboarding_iter29.py` | Iteration-specific — verify still relevant |
| `test_modular_backend.py` | Basic modular structure test — superseded by comprehensive tests |

**Action:** Run all tests (`pytest /app/backend/tests/`) and delete files with 100% overlap or zero unique assertions.

---

### 12. `server.py` Duplicate Routes
**File:** `/app/backend/server.py` (lines 27–39)

Two endpoints are defined directly in `server.py` instead of being organized under `routes/admin.py`:
- `GET /api/admin/migrate` — calls `run_migration`  
- `GET /api/admin/db-status` — calls `test_connection`

**Why this is a problem:** All other admin routes live in `routes/admin.py`. Having two routes in `server.py` breaks the modular architecture and makes the API harder to discover.  
**Action:** Move these two endpoints into `routes/admin.py` (or `routes/webhooks.py`). Remove them from `server.py`.

---

### 13. `psycopg2-binary` Dependency (unusable)
**File:** `/app/backend/requirements.txt`

`psycopg2-binary` was added to attempt a direct PostgreSQL connection to Supabase. This has been proven impossible from the Kubernetes container due to port firewall restrictions on 5432 and 6543.  
**Why:** This dependency adds weight to the Docker image and is never successfully used.  
**Action:** Remove `psycopg2-binary` from `requirements.txt`. Keep the migration endpoint in `routes/admin.py` for future use when the network allows it, but remove the library.

---

## 🟢 LOW PRIORITY — Consolidation Suggestions

### 14. Redundant Frontend Environment Variables
**File:** `/app/frontend/.env`

Currently three variables serve similar purposes:
```
REACT_APP_BACKEND_URL=https://...   # Used by some components
VITE_BACKEND_URL=https://...        # Used by AdminDashboard, PartnerDashboard
VITE_API_URL=/api                   # Used by legacy api.ts
```

**Why:** Frontend components inconsistently read from different env vars for the same backend URL. `AdminDashboard.tsx` and `PartnerDashboard.tsx` use `VITE_BACKEND_URL || REACT_APP_BACKEND_URL`. `services/api.ts` uses `VITE_API_URL`.  
**Action:** Standardize on `VITE_BACKEND_URL` across all components. Update `services/api.ts` to use `VITE_BACKEND_URL`. Remove `VITE_API_URL` (set to `/api`) which causes API calls to go to relative paths instead of the actual backend URL.

---

### 15. `services/api.ts` — Legacy API Client with Wrong Base URL
**File:** `/app/frontend/src/services/api.ts`

This service uses `const API_URL = import.meta.env.VITE_API_URL || ''` which resolves to `/api` (relative path). However, since all API calls should go to the external Kubernetes URL (for proper routing), using a relative path only works by accident through the Vite proxy in development. Many API methods in this file point to endpoints that don't exist in the current backend (e.g., `/api/family/group`, `/api/user/vehicles`, `/api/fuel/entries`, `/api/notifications`).

**Why:** This service was written before the backend was modularized and before the actual endpoint structure was finalized. The active dashboards (`AdminDashboard`, `PartnerDashboard`, `DriverApp`) make API calls **directly** (not through this service), so this class is largely dormant.  
**Action:** Either (a) update this file to use `VITE_BACKEND_URL` and prune methods to only include endpoints that actually exist, or (b) delete it if all components have migrated to direct fetch calls.

---

### 16. `DriverApp` Component — Inline Sub-components
**File:** `/app/frontend/src/pages/DriverApp/index.tsx` (3,012 lines)

The DriverApp page is a monolithic 3,012-line file. While 32 sub-components exist in the `components/` subdirectory, several large UI sections are defined inline in `index.tsx`.  
**Action (low priority):** Extract major inline sections (e.g., the main map UI, the plan selection UI) into their own component files to improve maintainability. Not urgent since the file works correctly.

---

### 17. `partner_service.py` — Hardcoded Password
**File:** `/app/backend/services/partner_service.py` (line 30)

```python
"password": "password",  # In production, use hashed passwords
```

The sample partner has a plaintext password stored in the in-memory dict. While this is acceptable for mock data, it should be replaced with a hashed value or removed entirely when migrating to Supabase Auth.  
**Action:** When migrating partner authentication to Supabase, delete this hardcoded entry and use Supabase Auth for all partner login.

---

### 18. `figma-ui/SnapRoadApp.tsx` Duplication with Main Dashboards
**File:** `/app/frontend/src/components/figma-ui/SnapRoadApp.tsx`

The figma-ui system has its own `AdminDashboard` component (`figma-ui/admin/AdminDashboard.tsx`) and `PartnerDashboard` component (`figma-ui/partner/PartnerDashboard.tsx`) which are simpler, older versions. The production dashboards at `/portal/admin-sr2025secure` and `/portal/partner` use the newer, more feature-rich versions in `src/pages/`.

**Why this matters:** The figma-ui admin/partner components are rendered at `/app/*` routes, creating a parallel set of dashboards. This doubles the surface area for bugs and UI inconsistency.  
**Action (long-term):** Decide whether to (a) remove the `/app/admin` and `/app/partner` routes from SnapRoadApp.tsx and redirect to the production portal paths, or (b) keep them as lightweight Figma reference prototypes. Document the intended purpose clearly.

---

### 19. `CarSkinShowcase` Feature Component
**File:** `/app/frontend/src/components/features/CarSkinShowcase.tsx`  
**Why:** Check if this component is imported anywhere. If not, it is an orphaned feature component.  
**Action:** Run `grep -r "CarSkinShowcase" /app/frontend/src/` — if no results, delete it.

---

## Removal Checklist

Use this checklist when proceeding with cleanup:

```
Frontend Legacy Pages (Items #1–6):
[ ] Delete: src/pages/DriverApp/index.tsx.backup
[ ] Delete: src/pages/Dashboard/ (entire folder)
[ ] Delete: src/components/Layout.tsx
[ ] Delete: src/pages/Users/ (entire folder)
[ ] Delete: src/pages/Trips/ (entire folder)
[ ] Delete: src/pages/Incidents/ (entire folder)
[ ] Delete: src/pages/Rewards/ (entire folder)
[ ] Delete: src/pages/Partners/ (entire folder)
[ ] Delete: src/pages/Settings/ (entire folder)
[ ] Delete: src/pages/UserDashboard/ (entire folder)
[ ] Delete: src/pages/BusinessDashboard/ (entire folder)
[ ] Verify then delete: src/pages/Auth/Login.tsx
[ ] Update: Remove all related imports + routes from App.tsx

Auth & Utilities (Items #7–9):
[ ] Delete: src/contexts/AuthContext.tsx (after removing legacy routes)
[ ] Delete: src/lib/utils.ts (migrate imports to snaproad-utils.ts)
[ ] Check and delete: src/components/ui/GradientButton.tsx if unused

Backend (Items #11–13):
[ ] Audit and prune: backend/tests/ stale test files
[ ] Move: server.py admin routes → routes/admin.py
[ ] Remove: psycopg2-binary from requirements.txt

Consolidation (Items #14–19):
[ ] Standardize frontend env vars on VITE_BACKEND_URL
[ ] Update or delete: services/api.ts
[ ] Extract inline components from DriverApp/index.tsx (low priority)
[ ] Remove hardcoded password from partner_service.py
[ ] Decide strategy for figma-ui admin/partner duplicate dashboards
[ ] Check and delete: components/features/CarSkinShowcase.tsx if unused
```

---

## Estimated Impact

| Action | Approx. Lines Removed | Risk |
|--------|----------------------|------|
| Delete legacy pages (Items #1–6) | ~3,000 lines | Low |
| Remove legacy routes from App.tsx | ~20 lines | Low |
| Delete AuthContext + duplicate utils | ~100 lines | Low |
| Prune backend tests | ~500 lines | Low |
| Move server.py routes | ~15 lines (restructure) | Very Low |
| Remove psycopg2-binary | 1 requirement | None |
| **Total** | **~3,600+ lines** | **Low–None** |

---

*Last updated: February 2026*
