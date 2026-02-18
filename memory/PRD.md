# SnapRoad - Product Requirements Document

## Project Overview
SnapRoad is a privacy-first, gamified navigation app with:
- **Web Frontend** (`/app/frontend`): React + Vite web application
- **Mobile App** (`/app/snaproad-mobile`): React Native (Expo)
- **Backend** (`/app/backend`): FastAPI server with AI integrations

---

## What Was Completed (Feb 18, 2025) - Session 3

### 1. Trip Analytics & Fuel Savings (Driver App)
- **TripAnalytics.tsx** - Full modal with 3 tabs:
  - **Trips tab**: Detailed trip list with origin/destination, distance, duration, safety score, gems earned
  - **Savings tab**: Fuel savings calculator ($X saved), gallons saved, CO2 avoided, MPG efficiency rating
  - **Stats tab**: Aggregate stats (total miles, hours driven, fuel consumed, avg MPG)
- Date range filters (7/30/90 days)
- Expandable trip details with fuel usage breakdown

### 2. Route History 3D Map (Driver App)
- **RouteHistory3D.tsx** - Interactive pseudo-3D route visualization
- Draggable map with perspective transforms
- Color-coded routes by frequency (brighter = more trips)
- Route list sorted by Most Trips, Distance, or Recent
- Stats: Unique routes, total trips, total miles
- Safety scores per route

### 3. Collapsible Offers Panel (Driver App)
- **CollapsibleOffersPanel.tsx** - Replaces static offers list on map
- Expand/collapse functionality for better map visibility
- Minimize to compact button mode
- Filter by business type (gas, cafe, restaurant, etc.)
- Navigation button per offer (adds waypoint)
- Premium badge showing 18% discount

### 4. Personalized Voice-Driven Offers (Orion AI)
- **OrionVoice.tsx** enhanced with Offers tab
- Fetches `/api/offers/personalized` based on location history
- Voice prompts: "Take me there" or "Skip"
- Accept offer adds waypoint to route
- Personalization reasons displayed (e.g., "Based on your visits to coffee shops")

### 5. New Backend APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/trips/history/detailed` | Trip history with fuel analytics |
| GET | `/api/fuel/prices` | Current fuel prices + nearby stations |
| GET | `/api/fuel/analytics` | Monthly fuel breakdown |
| POST | `/api/driver/location-visit` | Track driver visits for personalization |
| GET | `/api/offers/personalized` | AI-personalized offers based on history |
| POST | `/api/offers/{id}/accept-voice` | Accept offer via voice command |
| GET | `/api/routes/history-3d` | Route data formatted for 3D visualization |

### 6. Partner Plan-Based RBAC (Already Existed)
- Verified Locations tab in Partner Dashboard
- Plan limits enforced (Starter: 5 locations, Growth: 25, Enterprise: unlimited)
- "Upgrade Plan" CTA when at limit
- Add/Edit/Delete location management

---

## What Was Completed (Feb 18, 2025) - Session 2

### 1. Backend AI Services Connected

#### Orion AI Coach (`/app/backend/services/orion_coach.py`)
- **Real GPT-5.2 integration** via Emergent LLM key
- Conversational AI driving assistant
- Context-aware responses (safety score, gems, speed, weather)
- Session-based chat history
- Quick tips endpoint for UI suggestions

#### Photo Analysis with Privacy Blur (`/app/backend/services/photo_analysis.py`)
- **AI-powered face and license plate detection** via GPT-5.2 Vision
- Returns bounding box coordinates for blur regions
- Generates blur masks with adjustable intensity
- Fallback handling when AI unavailable

#### Partner Portal Backend (`/app/backend/services/partner_service.py`)
- Team management (invite, roles, revoke access)
- Referral tracking ($5 credit system)
- QR redemption validation
- Analytics endpoints

#### WebSocket Real-time Notifications (`/app/backend/services/websocket_manager.py`)
- Live redemption alerts for partner staff
- Customer proximity notifications
- Connection management with ping/pong keep-alive

### 2. New API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/orion/chat` | AI chat with Orion |
| GET | `/api/orion/tips` | Quick tip suggestions |
| GET | `/api/orion/history/{session_id}` | Chat history |
| POST | `/api/photo/analyze` | AI face/plate detection |
| POST | `/api/partner/v2/login` | Partner auth |
| GET | `/api/partner/v2/team/{id}` | Team members |
| POST | `/api/partner/v2/team/{id}/invite` | Invite staff |
| GET | `/api/partner/v2/referrals/{id}` | Referrals + stats |
| POST | `/api/partner/v2/redeem` | QR redemption |
| WS | `/ws/partner/{partner_id}` | Real-time notifications |

### 3. Frontend Integrations

#### Orion AI Coach (`OrionCoach.tsx`)
- Connected to real `/api/orion/chat` endpoint
- Fetches quick tips from backend
- Auto-scroll chat history
- Fallback local responses if API fails

#### Photo Capture (`PhotoCapture.tsx`)
- Connected to `/api/photo/analyze`
- Displays AI-detected blur regions with bounding boxes
- Different colors for faces (green) vs plates (purple)
- Fallback to simulated detection

#### Map Screen FAB Buttons
- Repositioned FAB buttons for visibility (top-1/3)
- Report, Camera, and Orion buttons functional
- Opens Photo Capture and Orion Coach modals

### 4. Mobile App Screens

#### My Offers Screen (`/app/snaproad-mobile/src/screens/MyOffersScreen.tsx`)
- Customer purchased offers list
- Geolocation proximity check for QR unlock
- QR code display when near store
- 50% gem discount for repeat purchases
- Get Directions integration

#### Orion Coach Screen (`/app/snaproad-mobile/src/screens/OrionCoachScreen.tsx`)
- Mobile chat interface with Orion AI
- Quick question buttons
- Connected to same backend API

---

## Test Results (Feb 18, 2025)

### Test Report: `/app/test_reports/iteration_25.json`

**Backend Tests: 100% Pass (18/18)**
- All API endpoints functional
- Orion AI chat responses working
- Partner portal APIs working

**Frontend Tests: 95% Pass**
- All major features working
- FAB buttons now visible and functional
- Modals opening correctly

---

## File Structure

```
/app/backend/
├── server.py                     # Main FastAPI server (updated with new endpoints)
└── services/
    ├── __init__.py
    ├── orion_coach.py           # NEW: AI driving coach service
    ├── photo_analysis.py        # NEW: Face/plate detection service
    ├── partner_service.py       # NEW: Partner business logic
    └── websocket_manager.py     # NEW: Real-time notifications

/app/frontend/src/
├── components/figma-ui/
│   ├── mobile/
│   │   ├── OrionCoach.tsx       # UPDATED: Real AI integration
│   │   ├── PhotoCapture.tsx     # UPDATED: Real AI blur detection
│   │   └── MapScreen.tsx        # UPDATED: FAB button positioning
│   └── partner/
│       └── ... (existing Partner Portal)
└── services/
    └── partnerApi.ts            # NEW: Partner API service

/app/snaproad-mobile/src/screens/
├── MyOffersScreen.tsx           # NEW: Customer QR offer screen
├── OrionCoachScreen.tsx         # NEW: Mobile AI coach
└── index.ts                     # UPDATED: exports
```

---

## Environment Variables

```env
# /app/backend/.env
EMERGENT_LLM_KEY=sk-emergent-xxx  # For AI services
MONGO_URL=...                     # Database
```

---

## Test Credentials
- **Driver:** `driver@snaproad.com` / `password123`
- **Admin:** `admin@snaproad.com` / `admin123`
- **Partner:** `partner@snaproad.com` / `password`

---

## Completed Features (Feb 18, 2025)

### Driver App Features ✅
- [x] Interactive OpenStreetMap with dark tiles
- [x] Collapsible Nearby Offers panel
- [x] Trip Analytics with Trips/Savings/Stats tabs
- [x] Route History 3D visualization
- [x] Orion AI Voice assistant with personalized offers
- [x] Fuel tracking and efficiency analytics
- [x] Safety score tracking per trip
- [x] Gamification (gems, badges, levels)

### Partner Dashboard Features ✅
- [x] Plan-Based RBAC (Starter/Growth/Enterprise)
- [x] Location management with plan limits
- [x] Offer creation and management
- [x] QR code scanner for redemptions
- [x] Team management with roles
- [x] Referral/credits system ($5 per referral)
- [x] Analytics dashboard

### Backend APIs ✅
- [x] Trip history with fuel analytics
- [x] Fuel prices endpoint (mock, ready for GasBuddy API)
- [x] Route history for 3D visualization
- [x] Personalized offers based on location history
- [x] Voice-based offer acceptance
- [x] Orion AI chat (GPT-5.2 via Emergent LLM)
- [x] Photo analysis for privacy blur

---

## Pending Tasks

### P1 - High Priority
- [ ] Integrate real Fuel Price API (GasBuddy or similar)
- [ ] Connect MongoDB for persistent data storage
- [ ] Port all new features to mobile app (`/app/snaproad-mobile`)

### P2 - Medium Priority  
- [ ] Add Stripe for subscription/credit payments
- [ ] Implement offer boosting with credits
- [ ] Real geolocation testing for offers

### P3 - Low Priority
- [ ] Add Web Speech API for voice input in Orion
- [ ] Implement real camera in Photo Capture
- [ ] Add push notifications for redemptions
- [ ] Configure ESLint for TypeScript parsing

---

## Known Limitations

1. **AI Timeouts**: External requests to `/api/orion/chat` may timeout via Cloudflare (60s limit). Test locally with `curl http://localhost:8001/api/orion/chat`

2. **Partner Data**: All partner data stored in memory. Resets on backend restart.

3. **Mobile App**: Not deployed. Screens created but not running in Expo.

4. **Photo Analysis**: AI detection returns simulated coordinates. Real blur requires image processing library.

---

## Quick Start

```bash
# Test Orion AI locally
curl -X POST http://localhost:8001/api/orion/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"How can I improve my safety score?","session_id":"test"}'

# Test Partner API
curl http://localhost:8001/api/partner/v2/team/partner_001

# Web App
open https://route-history-3d.preview.emergentagent.com/app
```

---

Last Updated: February 18, 2025
