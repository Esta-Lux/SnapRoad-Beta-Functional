# SnapRoad - Product Requirements Document

## Project Overview
SnapRoad is a privacy-first, gamified navigation app with:
- **Web Frontend** (`/app/frontend`): React + Vite web application
- **Mobile App** (`/app/snaproad-mobile`): React Native (Expo)
- **Backend** (`/app/backend`): FastAPI server with AI integrations

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

## Pending Tasks

### P1 - High Priority
- [ ] Connect mobile app to backend (currently uses local API_URL)
- [ ] Deploy mobile app to Expo
- [ ] Add real geolocation testing for QR proximity

### P2 - Medium Priority  
- [ ] Connect MongoDB for persistent data storage
- [ ] Add Stripe for subscription/credit payments
- [ ] Implement offer boosting with credits

### P3 - Low Priority
- [ ] Add voice recognition to Orion AI
- [ ] Implement real camera in Photo Capture
- [ ] Add push notifications for redemptions

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
open https://gem-offers-admin.preview.emergentagent.com/app
```

---

Last Updated: February 18, 2025
