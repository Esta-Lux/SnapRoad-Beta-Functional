#!/bin/bash
# SnapRoad Cleanup Script (Revised)
# KEEPS: /driver, /portal/admin, /portal/partner, /auth, /welcome, /business
# REMOVES: Only truly unused/duplicate files
#
# Run from repo root: bash cleanup.sh
# BACKUP FIRST: git add -A && git commit -m "pre-cleanup"

echo "🧹 SnapRoad Cleanup — Removing only dead files"
echo "================================================"
echo ""

# -----------------------------------------------
# 1. FIGMA UI — Duplicate prototype system
#    /app/* was a prototype. Real pages exist for
#    admin, partner, and driver already.
# -----------------------------------------------
echo "❌ Removing Figma UI prototype (duplicate of real pages)..."
rm -rf app/frontend/src/components/figma-ui

# -----------------------------------------------
# 2. OLD /dashboard/* ADMIN PAGES
#    Replaced by /portal/admin (AdminDashboard.tsx)
#    These used Layout.tsx which is also old
# -----------------------------------------------
echo "❌ Removing old /dashboard admin pages (replaced by /portal/admin)..."
rm -rf app/frontend/src/pages/Dashboard
rm -rf app/frontend/src/pages/Users
rm -rf app/frontend/src/pages/Trips
rm -rf app/frontend/src/pages/Incidents
rm -rf app/frontend/src/pages/Rewards
rm -rf app/frontend/src/pages/Partners
rm -rf app/frontend/src/pages/Settings
rm -rf app/frontend/src/pages/UserDashboard
rm -f  app/frontend/src/components/Layout.tsx
rm -f  app/frontend/src/components/HelpModal.tsx
rm -f  app/frontend/src/components/SettingsModal.tsx
rm -f  app/frontend/src/components/NotificationSystem.tsx

# -----------------------------------------------
# 3. PHONE PREVIEW — Dev tool, not for production
# -----------------------------------------------
echo "❌ Removing phone preview (dev-only)..."
rm -f  app/frontend/src/pages/PhonePreview.tsx

# -----------------------------------------------
# 4. UNUSED UI COMPONENTS
# -----------------------------------------------
echo "❌ Removing unused UI primitives..."
rm -rf app/frontend/src/components/ui
rm -rf app/frontend/src/components/features

# -----------------------------------------------
# 5. OLD ADMIN HOOKS (used by old /dashboard pages)
# -----------------------------------------------
echo "❌ Removing old admin hooks..."
rm -f  app/frontend/src/hooks/useAdminStats.ts
rm -f  app/frontend/src/hooks/useUsers.ts
rm -f  app/frontend/src/hooks/useWebSocket.ts

# -----------------------------------------------
# 6. GOOGLE MAPS (replacing with Mapbox)
# -----------------------------------------------
echo "❌ Removing Google Maps files (replaced by Mapbox)..."
rm -f  app/frontend/src/contexts/GoogleMapsContext.tsx
rm -f  app/frontend/src/lib/googleMaps.ts
rm -f  app/frontend/src/pages/DriverApp/components/GoogleMapSnapRoad.tsx

# -----------------------------------------------
# SUMMARY
# -----------------------------------------------
echo ""
echo "✅ Cleanup complete!"
echo ""
echo "KEPT — All production routes:"
echo "  /                → WelcomePage.tsx"
echo "  /auth            → AuthPage.tsx, Auth/AuthFlow.tsx"
echo "  /auth/partner-signup → PartnerSignup.tsx"
echo "  /driver          → DriverApp/ (46 components + Mapbox)"
echo "  /portal/admin    → AdminDashboard.tsx + components/admin/ (13 tabs)"
echo "  /portal/partner  → PartnerDashboard.tsx + components/partner/ (11 tabs)"
echo "  /business        → BusinessDashboard/"
echo "  /scan/:id/:token → TeamScanPage.tsx"
echo ""
echo "KEPT — Shared infrastructure:"
echo "  contexts/  Auth, Theme, SnaproadTheme, NavigationCore"
echo "  core/      Navigation engine (sensor fusion, kalman, etc)"
echo "  lib/       orion, ohgo, utils, friendLocation, offer-pricing, partner-plans"
echo "  services/  api.ts, adminApi.ts, partnerApi.ts"
echo "  store/     authStore.ts"
echo "  types/     api.ts, admin.ts, partner.ts"
echo "  guards/    AdminGuard, PartnerGuard, DriverGuard"
echo ""
echo "REMOVED:"
echo "  components/figma-ui/       (25 files — duplicate prototype)"
echo "  pages/Dashboard,Users,etc  (12 files — old admin, replaced by /portal/admin)"
echo "  components/Layout.tsx etc  (4 files — old admin layout)"
echo "  hooks/useAdmin*,useUsers   (3 files — old admin hooks)"
echo "  GoogleMapsContext.tsx       (replaced by MapboxContext)"
echo "  googleMaps.ts              (replaced by mapboxDirections.ts)"
echo "  GoogleMapSnapRoad.tsx       (replaced by MapboxMapSnapRoad.tsx)"
echo "  PhonePreview.tsx           (dev tool)"
echo ""
echo "📊 Removed ~48 files. Cursor will be much happier."
echo ""
echo "⚠️  NEXT STEPS:"
echo "  1. Replace App.tsx with the cleaned version (removes old /dashboard routes)"
echo "  2. Copy in Mapbox files from mapbox-integration/"
echo "  3. cd app/frontend && npm install mapbox-gl && npm install -D @types/mapbox-gl"
echo "  4. Add VITE_MAPBOX_TOKEN=pk.xxx to app/frontend/.env"
echo "  5. npm run dev → test /driver, /portal/admin, /portal/partner"
