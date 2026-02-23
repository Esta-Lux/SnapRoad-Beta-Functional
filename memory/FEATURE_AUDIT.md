# SnapRoad Mobile - Complete Feature Audit & Gap Analysis

## Date: February 23, 2026

---

## EXECUTIVE SUMMARY

**Total /driver Components:** 32 specialized components
**Total snaproad-mobile Screens:** 49 screens
**Feature Parity Status:** ~70% - Critical gaps identified below

---

## /DRIVER WEB FEATURES vs SNAPROAD-MOBILE

### ✅ FULLY MATCHED (Have equivalent in snaproad-mobile)

| /driver Component | snaproad-mobile Screen | Status |
|-------------------|------------------------|--------|
| PlanSelection | PlanSelectionScreen.tsx | ✅ Match |
| CarOnboarding | CarSetupScreen.tsx | ✅ Match |
| CarStudioNew | CarStudioScreen.tsx | ✅ Match |
| BadgesGrid | BadgesScreen.tsx | ✅ Match |
| Leaderboard | LeaderboardScreen.tsx | ✅ Match |
| FriendsHub | FriendsHubScreen.tsx | ✅ Match |
| FuelTracker | FuelDashboardScreen.tsx | ✅ Match |
| GemHistory | GemHistoryScreen.tsx | ✅ Match |
| HelpSupport | HelpScreen.tsx | ✅ Match |
| NotificationSettings | NotificationSettingsScreen.tsx | ✅ Match |
| LevelProgress | LevelProgressScreen.tsx | ✅ Match |
| TripAnalytics | TripAnalyticsScreen.tsx | ✅ Match |
| RouteHistory3D | RouteHistory3DScreen.tsx | ✅ Match |
| WeeklyRecap | WeeklyRecapScreen.tsx | ✅ Match |
| ChallengeHistory | ChallengesScreen.tsx | ✅ Match |

### 🔴 MISSING - Need to Port from /driver

| /driver Component | Description | Priority |
|-------------------|-------------|----------|
| **OrionVoice** | AI voice assistant modal | P0 |
| **QuickPhotoReport** | Camera-based incident reporting | P0 |
| **RoadReports** | Community road hazard reporting | P0 |
| **CommunityBadges** | Social badges from community | P1 |
| **CollapsibleOffersPanel** | Map overlay offers panel | P1 |
| **OffersModal** | Full-screen offers detail modal | P1 |
| **RedemptionPopup** | Gem redemption flow | P1 |
| **ShareTripScore** | Social sharing of trip scores | P1 |
| **DrivingScore** | Detailed driving score breakdown | P1 |
| **GemOverlay** | Active trip gem collection UI | P2 |
| **InAppBrowser** | Webview for external links | P2 |
| **RoadStatusOverlay** | Road conditions on map | P2 |
| **OrionOfferAlerts** | AI-powered offer notifications | P2 |

### 🟡 PARTIAL - Exists but Needs Enhancement

| snaproad-mobile Screen | Missing Features | Priority |
|------------------------|------------------|----------|
| MapScreen.tsx | Missing: Voice search, Incident quick-report buttons, Turn-by-turn nav | P0 |
| OffersScreen.tsx | Missing: Filter by category, Favorites, Distance sorting | P1 |
| ProfileScreen.tsx | Missing: Trip sharing, Detailed score analytics | P1 |
| RewardsScreen.tsx | Missing: Challenge completion modal, Streak bonuses | P1 |

---

## API ENDPOINTS REQUIRED

### Currently Used in /driver (All need to work in snaproad-mobile)

```
GET  /api/user/profile
GET  /api/user/car
POST /api/user/car
GET  /api/user/onboarding-status
POST /api/user/plan

GET  /api/locations
POST /api/locations
DELETE /api/locations/{id}

GET  /api/routes
POST /api/routes
DELETE /api/routes/{id}
PUT  /api/routes/{id}/toggle
PUT  /api/routes/{id}/notifications

GET  /api/offers
POST /api/offers/{id}/favorite
POST /api/offers/{id}/redeem

GET  /api/badges
GET  /api/skins
POST /api/skins/{id}/equip
POST /api/skins/{id}/purchase

GET  /api/family/members
POST /api/family/{id}/call
POST /api/family/{id}/message

GET  /api/challenges
POST /api/challenges/{id}/complete

GET  /api/map/search?q={query}&lat={lat}&lng={lng}
GET  /api/map/directions?origin_lat=&origin_lng=&dest_lat=&dest_lng=

POST /api/reports
POST /api/reports/{id}/upvote
GET  /api/reports/nearby?lat=&lng=

POST /api/incidents/report

GET  /api/payments/plans
POST /api/payments/checkout/session
GET  /api/payments/checkout/status/{session_id}
```

---

## DETAILED GAP LIST - TO BE FIXED

### P0 - Critical (Must Have)

1. **OrionVoice Component**
   - Voice-activated AI assistant
   - Quick incident reports via voice
   - Route requests via voice
   - File: `/app/snaproad-mobile/src/components/OrionVoice.tsx`

2. **QuickPhotoReport Component**
   - Camera capture for road hazards
   - AI blur for faces/plates
   - File: `/app/snaproad-mobile/src/screens/QuickPhotoReportScreen.tsx`

3. **MapScreen Enhancements**
   - Add voice search button (mic icon)
   - Add incident report quick buttons
   - Add turn-by-turn navigation overlay
   - Enhance search with autocomplete

4. **Road Reports Screen**
   - Community-submitted hazards
   - Upvote/downvote system
   - Real-time updates

### P1 - Important

5. **RedemptionPopup Component**
   - Gem redemption confirmation
   - QR code generation for offers
   - Success celebration animation

6. **CollapsibleOffersPanel**
   - Draggable bottom sheet
   - Nearby offers with distance
   - Quick redeem actions

7. **DrivingScore Component**
   - Detailed score breakdown
   - Historical trends
   - Improvement suggestions

8. **ShareTripScore Component**
   - Social sharing
   - Trip summary cards
   - Achievement badges

### P2 - Nice to Have

9. **GemOverlay** - Real-time gem collection during trips
10. **InAppBrowser** - Webview for partner sites
11. **OrionOfferAlerts** - AI-powered offer notifications
12. **RoadStatusOverlay** - Traffic conditions on map

---

## INTEGRATION REQUIREMENTS

### APIs to Integrate (Cost-Effective for 100+ Users)

| Service | Purpose | Cost | Scale |
|---------|---------|------|-------|
| **Supabase** | Database + Auth | Free tier: 500MB, $25/mo for Pro | 100K+ users |
| **Stripe** | Payments | 2.9% + $0.30 per transaction | Unlimited |
| **Apple MapKit** | Maps (iOS) | Free for apps | Unlimited |
| **OpenStreetMap** | Maps (Web/Android) | Free | Unlimited |
| **GasBuddy API** | Fuel prices | Contact for pricing | Regional |
| **OpenAI GPT-5.2** | Orion AI Coach | $0.01/1K tokens | Pay per use |
| **Emergent LLM Key** | AI Features | Universal key provided | Included |

---

## FILES TO CREATE/UPDATE

### New Files Needed:
1. `/app/snaproad-mobile/src/components/OrionVoice.tsx`
2. `/app/snaproad-mobile/src/screens/QuickPhotoReportScreen.tsx`
3. `/app/snaproad-mobile/src/screens/RoadReportsScreen.tsx`
4. `/app/snaproad-mobile/src/components/RedemptionPopup.tsx`
5. `/app/snaproad-mobile/src/components/CollapsibleOffersPanel.tsx`
6. `/app/snaproad-mobile/src/components/DrivingScoreCard.tsx`
7. `/app/snaproad-mobile/src/components/ShareTripCard.tsx`

### Files to Update:
1. `/app/snaproad-mobile/src/screens/MapScreen.tsx` - Add voice, reports, nav
2. `/app/snaproad-mobile/src/screens/OffersScreen.tsx` - Add filters, favorites
3. `/app/snaproad-mobile/src/screens/ProfileScreen.tsx` - Add sharing
4. `/app/snaproad-mobile/src/navigation/index.tsx` - Add new routes

---

## NEXT STEPS

1. Create missing P0 components (OrionVoice, QuickPhotoReport, RoadReports)
2. Enhance MapScreen with all /driver features
3. Update all memory guide documents
4. Run comprehensive testing
5. Create API documentation
