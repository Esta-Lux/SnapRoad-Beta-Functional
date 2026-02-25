# API Integration Guide - SnapRoad
> **Last Updated:** December 2025  
> **Total Endpoints:** 60+  
> **Base URL:** `${REACT_APP_BACKEND_URL}/api`

---

## Quick Reference

### Authentication
All endpoints use JWT Bearer tokens except public endpoints.

```typescript
// Get token
const loginRes = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
const { token } = await loginRes.json();

// Use token
const res = await fetch('/api/user/profile', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Test Credentials
| Role | Email | Password |
|------|-------|----------|
| Driver | driver@snaproad.com | password123 |
| Partner | partner@snaproad.com | password123 |
| Admin | admin@snaproad.com | password123 |

---

## 1. Authentication

### POST `/api/auth/signup`
Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "123",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "eyJ..."
}
```

### POST `/api/auth/login`
Authenticate existing user.

**Request:**
```json
{
  "email": "driver@snaproad.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJ...",
  "user": {
    "id": "1",
    "email": "driver@snaproad.com",
    "name": "Alex Driver",
    "role": "driver"
  }
}
```

---

## 2. User Profile

### GET `/api/user/profile`
Get current user profile.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "1",
    "name": "Alex Driver",
    "email": "driver@snaproad.com",
    "gems": 12500,
    "level": 8,
    "xp": 7850,
    "safety_score": 92,
    "streak": 12,
    "total_miles": 1234.5,
    "total_trips": 89,
    "badges_earned_count": 15,
    "rank": 42,
    "is_premium": false,
    "plan": "basic",
    "gem_multiplier": 1,
    "state": "OH"
  }
}
```

### GET `/api/user/stats`
Get driving statistics.

### POST `/api/user/plan`
Update subscription plan.

**Request:**
```json
{
  "plan": "premium"
}
```

### POST `/api/user/car`
Save car customization.

**Request:**
```json
{
  "category": "sedan",
  "variant": "sedan-classic",
  "color": "midnight-black"
}
```

### GET `/api/user/car`
Get current car customization.

### GET `/api/user/onboarding-status`
Check onboarding completion flags.

**Response:**
```json
{
  "success": true,
  "data": {
    "onboarding_complete": false,
    "plan_selected": true,
    "car_selected": false
  }
}
```

---

## 3. Offers

### GET `/api/offers`
Get all active offers.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "10% off Coffee",
      "business_name": "Starbucks Downtown",
      "gems_reward": 50,
      "expires": "2026-03-01",
      "lat": 39.9612,
      "lng": -82.9988,
      "category": "cafe",
      "is_premium": false
    }
  ]
}
```

### POST `/api/offers/{id}/redeem`
Redeem an offer.

**Response:**
```json
{
  "success": true,
  "message": "Offer redeemed! +50 gems earned",
  "data": {
    "gems_earned": 50,
    "xp_earned": 700,
    "redemption_code": "SNAP-ABC123"
  }
}
```

### GET `/api/offers/nearby`
Get offers near a location.

**Query params:** `lat`, `lng`, `radius` (miles)

### GET `/api/offers/personalized`
Get AI-personalized offers based on user preferences.

---

## 4. Gamification

### GET `/api/badges`
Get all badges with earned status.

**Response:**
```json
{
  "success": true,
  "data": {
    "badges": [
      {
        "id": 1,
        "name": "Early Bird",
        "description": "Complete 5 morning commutes",
        "icon": "sunrise",
        "category": "driving",
        "earned": true,
        "earned_date": "2026-01-15",
        "progress": 5,
        "total": 5
      }
    ]
  }
}
```

### GET `/api/challenges`
Get active challenges.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "challenger": { "id": "2", "name": "Mike" },
      "opponent": { "id": "1", "name": "You" },
      "stake": 100,
      "metric": "safety_score",
      "status": "active",
      "ends_at": "2026-02-01",
      "your_score": 92,
      "their_score": 88
    }
  ]
}
```

### POST `/api/challenges`
Create a new challenge.

**Request:**
```json
{
  "opponent_id": "2",
  "stake": 100,
  "metric": "safety_score",
  "duration_days": 7
}
```

### POST `/api/challenges/{id}/accept`
Accept a challenge invitation.

### POST `/api/challenges/{id}/claim`
Claim challenge reward after winning.

### GET `/api/leaderboard`
Get driver leaderboard.

**Query params:** `state` (filter by state)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "rank": 1,
      "user_id": "5",
      "name": "Sarah S.",
      "safety_score": 98,
      "gems": 45000,
      "state": "OH"
    }
  ]
}
```

### GET `/api/gems/history`
Get gem transaction history.

**Response:**
```json
{
  "success": true,
  "data": {
    "balance": 12500,
    "transactions": [
      {
        "id": "1",
        "type": "earned",
        "amount": 50,
        "source": "offer_redemption",
        "description": "Redeemed: 10% off Coffee",
        "timestamp": "2026-01-20T14:30:00Z"
      }
    ]
  }
}
```

### GET `/api/driving-score`
Get detailed driving score breakdown.

**Response:**
```json
{
  "success": true,
  "data": {
    "overall": 92,
    "metrics": {
      "smooth_braking": 95,
      "speed_compliance": 88,
      "phone_free": 100,
      "night_driving": 85,
      "weather_adaptation": 90,
      "route_consistency": 92
    },
    "trend": "+3 this week"
  }
}
```

### GET `/api/weekly-recap`
Get weekly driving summary.

---

## 5. Trips & Fuel

### GET `/api/trips/history`
Get recent trips.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "trip_123",
      "origin": "Home",
      "destination": "Work",
      "distance": 12.5,
      "duration": 25,
      "safety_score": 94,
      "gems_earned": 15,
      "xp_earned": 1200,
      "date": "2026-01-20"
    }
  ]
}
```

### POST `/api/trips/complete`
Complete a trip and record stats.

**Request:**
```json
{
  "origin": "Home",
  "destination": "Work",
  "distance": 12.5,
  "duration": 25
}
```

### GET `/api/fuel/history`
Get fuel log entries.

### POST `/api/fuel/log`
Add fuel entry.

**Request:**
```json
{
  "gallons": 12.5,
  "price_per_gallon": 3.29,
  "total_cost": 41.13,
  "odometer": 45678,
  "station": "Shell"
}
```

### GET `/api/fuel/prices`
Get current fuel prices nearby.

---

## 6. Navigation

### GET `/api/locations`
Get saved locations.

### POST `/api/locations`
Save a location.

**Request:**
```json
{
  "name": "Gym",
  "address": "123 Fitness Ave",
  "category": "gym",
  "lat": 39.9612,
  "lng": -82.9988
}
```

### GET `/api/routes`
Get saved commute routes.

### POST `/api/routes`
Save a commute route.

**Request:**
```json
{
  "name": "Morning Commute",
  "origin": "Home",
  "destination": "Work",
  "departure_time": "08:00",
  "days_active": ["Mon", "Tue", "Wed", "Thu", "Fri"],
  "notifications": true
}
```

### POST `/api/navigation/start`
Start navigation to destination.

### POST `/api/navigation/stop`
Stop active navigation.

### GET `/api/map/search`
Search for locations.

**Query params:** `q` (query), `lat`, `lng`, `limit`

### GET `/api/map/directions`
Get turn-by-turn directions.

**Query params:** `origin_lat`, `origin_lng`, `dest_lat`, `dest_lng`

**Response:**
```json
{
  "success": true,
  "data": {
    "distance": { "value": 12500, "text": "12.5 mi" },
    "duration": { "value": 1500, "text": "25 min" },
    "traffic": "light",
    "steps": [
      {
        "instruction": "Head north on Main St",
        "distance": "0.5 mi",
        "duration": "2 min",
        "maneuver": "straight"
      },
      {
        "instruction": "Turn right onto Oak Ave",
        "distance": "2.1 mi",
        "duration": "5 min",
        "maneuver": "turn-right"
      }
    ]
  }
}
```

---

## 7. Social

### GET `/api/friends`
Get friends list.

### POST `/api/friends/add`
Add a friend.

**Request:**
```json
{
  "user_id": "12345"
}
```

### GET `/api/family/members`
Get family members.

### GET `/api/reports`
Get road reports in area.

**Query params:** `lat`, `lng`, `radius`

### POST `/api/reports`
Create a road report.

**Request:**
```json
{
  "type": "pothole",
  "title": "Large pothole on I-70",
  "description": "Right lane, near exit 100",
  "lat": 39.9612,
  "lng": -82.9988
}
```

### POST `/api/reports/{id}/upvote`
Upvote a report (+10 gems).

---

## 8. AI

### POST `/api/orion/chat`
Chat with Orion AI coach.

**Request:**
```json
{
  "message": "How can I improve my safety score?",
  "session_id": "session_123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": "Based on your driving data, I recommend focusing on smoother braking...",
    "session_id": "session_123"
  }
}
```

### GET `/api/orion/history/{session_id}`
Get chat history for session.

### POST `/api/photo/analyze`
Analyze photo for privacy (faces/plates).

**Request:** multipart/form-data with `photo` file

**Response:**
```json
{
  "success": true,
  "data": {
    "faces_detected": 2,
    "plates_detected": 1,
    "blur_regions": [
      { "type": "face", "x": 100, "y": 50, "width": 80, "height": 80 },
      { "type": "plate", "x": 200, "y": 300, "width": 120, "height": 40 }
    ]
  }
}
```

---

## 9. Payments

### GET `/api/payments/plans`
Get subscription plans.

**Response:**
```json
{
  "success": true,
  "data": {
    "basic": {
      "name": "Basic",
      "price": 0.00,
      "period": "forever",
      "features": ["Privacy-first navigation", "1x gems", "Safety score", "Community reports"]
    },
    "premium": {
      "name": "Premium",
      "price": 10.99,
      "period": "month",
      "features": ["2x gems", "Premium offers", "Advanced analytics", "Ad-free"]
    },
    "family": {
      "name": "Family",
      "price": 14.99,
      "period": "month",
      "features": ["Up to 6 members", "Real-time location", "Emergency SOS"]
    }
  }
}
```

### POST `/api/payments/checkout/session`
Create Stripe checkout session.

**Request:**
```json
{
  "plan_id": "premium",
  "origin_url": "https://app.snaproad.com",
  "user_id": "123",
  "user_email": "user@example.com"
}
```

**Response:**
```json
{
  "url": "https://checkout.stripe.com/...",
  "session_id": "cs_test_..."
}
```

### GET `/api/payments/checkout/status/{session_id}`
Check payment status.

**Response:**
```json
{
  "success": true,
  "data": {
    "session_id": "cs_test_...",
    "status": "complete",
    "payment_status": "paid",
    "amount_total": 1099,
    "currency": "usd"
  }
}
```

---

## 10. Partner API

### GET `/api/partner/profile`
Get partner profile.

### GET `/api/partner/locations`
Get partner store locations.

### POST `/api/partner/offers`
Create a partner offer.

**Request:**
```json
{
  "title": "20% Off",
  "description": "20% off any purchase",
  "gems_reward": 100,
  "location_id": 1,
  "expires": "2026-03-01",
  "terms": "Valid Mon-Fri only"
}
```

### POST `/api/partner/boosts/create`
Boost an offer for visibility.

### GET `/api/partner/v2/analytics/{partner_id}`
Get detailed analytics.

### POST `/api/partner/v2/redeem`
Process QR code redemption.

**Request:**
```json
{
  "qr_code": "SNAP-ABC123"
}
```

---

## 11. Admin API

### GET `/api/admin/users`
List all users.

### GET `/api/admin/analytics`
Get platform analytics.

### POST `/api/admin/offers/bulk`
Bulk create offers.

### GET `/api/admin/export/offers`
Export offers (JSON/CSV).

**Query params:** `format` (json/csv)

### GET `/api/admin/supabase/status`
Check Supabase connection status.

---

## 12. WebSocket Endpoints

### `/api/ws/partner/{partner_id}`
Real-time partner notifications (new redemptions, etc.)

### `/api/ws/admin/moderation`
Real-time AI moderation feed for admins.

---

## Error Responses

All endpoints return consistent error format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "ERROR_CODE"
}
```

### Common Error Codes
| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | Missing or invalid token |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Invalid request data |
| SERVER_ERROR | 500 | Internal server error |

---

*Document owner: Engineering Team | Last updated: December 2025*
