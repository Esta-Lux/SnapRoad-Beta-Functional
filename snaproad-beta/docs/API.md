# SnapRoad API Documentation

## Base URL

```
Production: https://api.snaproad.co/api/v1
Development: http://localhost:3000/api/v1
```

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

## Endpoints

### Authentication

#### Register User
```
POST /auth/register

Body:
{
  "email": "user@example.com",
  "password": "securepassword",
  "fullName": "John Doe",
  "phone": "+1234567890" // optional
}

Response:
{
  "success": true,
  "data": {
    "user": { ... },
    "accessToken": "...",
    "refreshToken": "..."
  },
  "message": "User registered successfully"
}
```

#### Login
```
POST /auth/login

Body:
{
  "email": "user@example.com",
  "password": "securepassword"
}

Response:
{
  "success": true,
  "data": {
    "user": { ... },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

#### Get Current User
```
GET /auth/me

Headers: Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "John Doe",
    "subscriptionTier": "premium",
    ...
  }
}
```

### Trips

#### Start Trip
```
POST /trips/start

Body:
{
  "vehicleId": "uuid",
  "startLocation": { "lat": 39.9612, "lng": -82.9988 },
  "destination": { "lat": 40.0580, "lng": -82.4013 }
}

Response:
{
  "success": true,
  "data": {
    "id": "trip-uuid",
    "route": { ... }, // Mapbox route data
    "estimatedDuration": 45,
    "estimatedDistance": 65.5
  }
}
```

#### End Trip
```
POST /trips/:id/end

Body:
{
  "endLocation": { "lat": 40.0580, "lng": -82.4013 },
  "routeGeometry": { ... } // GeoJSON of actual route
}

Response:
{
  "success": true,
  "data": {
    "id": "trip-uuid",
    "distanceKm": 67.2,
    "durationMinutes": 52,
    "drivingScore": 92,
    "gemsEarned": 18,
    "fuelSavedPercent": 12.5,
    "events": [ ... ]
  }
}
```

#### Log Driving Event
```
POST /trips/:id/events

Body:
{
  "eventType": "speeding", // speeding, hard_brake, rapid_acceleration
  "severity": "low", // low, medium, high
  "location": { "lat": 39.98, "lng": -82.87 },
  "speedKmh": 78.5
}
```

#### Get Trip History
```
GET /trips?page=1&limit=20

Response:
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

### Incidents

#### Report Incident
```
POST /incidents

Body:
{
  "incidentType": "hazard", // accident, hazard, violation, construction, other
  "description": "Large pothole in right lane",
  "location": { "lat": 39.9612, "lng": -82.9988 }
}
```

#### Upload Incident Photos
```
POST /incidents/:id/photos
Content-Type: multipart/form-data

Body:
- photos: [file1, file2, ...] (max 5 files, 10MB each)

Response:
{
  "success": true,
  "data": [
    {
      "id": "photo-uuid",
      "blurredUrl": "https://...",
      "blurStatus": "completed",
      "detectedFaces": 2,
      "detectedPlates": 1
    }
  ]
}
```

#### Get Nearby Incidents
```
GET /incidents/nearby?lat=39.9612&lng=-82.9988&radiusKm=10
```

### Rewards

#### Get Rewards Summary
```
GET /rewards

Response:
{
  "success": true,
  "data": {
    "gemsBalance": 1300,
    "gemsEarned": 1500,
    "gemsSpent": 200,
    "currentStreak": 15,
    "averageScore": 92.5,
    "seasonRank": 42
  }
}
```

#### Get Leaderboard
```
GET /rewards/leaderboard?period=weekly&limit=50

Response:
{
  "success": true,
  "data": {
    "leaderboard": [ ... ],
    "userRank": 42,
    "userEntry": { ... }
  }
}
```

### Offers

#### Get Nearby Offers
```
GET /offers/nearby?lat=39.9612&lng=-82.9988&radiusKm=25
```

#### Redeem Offer
```
POST /offers/:id/redeem

Response:
{
  "success": true,
  "data": {
    "redemptionCode": "ABC12XYZ",
    "gemsSpent": 50,
    "expiresAt": "2025-01-20T23:59:59Z",
    "offer": { ... }
  }
}
```

### Vehicles

#### Add Vehicle
```
POST /vehicles

Body:
{
  "make": "Toyota",
  "model": "Camry",
  "year": 2022,
  "fuelType": "gas", // gas, diesel, electric, hybrid
  "isPrimary": true
}
```

#### List Vehicles
```
GET /vehicles
```

### Business Partners

#### Register as Partner
```
POST /partners/register

Body:
{
  "businessName": "Downtown Coffee",
  "contactEmail": "owner@coffee.com",
  "contactPhone": "+1234567890",
  "subscriptionPlan": "growth" // local, growth, enterprise
}
```

#### Create Offer (Partner)
```
POST /partners/offers

Body:
{
  "title": "20% Off Any Coffee",
  "description": "Valid for any size coffee drink",
  "discountPercent": 20,
  "gemsRequired": 50,
  "location": { "lat": 39.9612, "lng": -82.9988 },
  "radiusKm": 10,
  "startDate": "2025-01-15",
  "endDate": "2025-02-15"
}
```

## Error Responses

```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "details": [
      { "field": "email", "message": "Invalid email address" }
    ]
  }
}
```

## Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 429 | Too Many Requests |
| 500 | Internal Server Error |
