# SnapRoad Mobile Developer Guide
## For Kathir (Mobile Lead)

> **Tech Stack**: React Native (Expo) + TypeScript + Zustand + React Navigation
> **Maps**: Apple Maps MapKit (via `react-native-maps` with `PROVIDER_DEFAULT` on iOS)
> **Focus Areas**: Maps/Navigation, Trip Flow, QR Code, Push Notifications, Hazard Button
> **Current State**: Core screens implemented, analytics screens ready for testing

---

## IMPORTANT: Apple Maps MapKit (NOT Mapbox)

SnapRoad uses **Apple Maps MapKit** for all mapping functionality. Here's how it works:

### Map Display (No API Key Needed)
- Use `react-native-maps` with `provider={PROVIDER_DEFAULT}`
- On iOS, this automatically uses **Apple MapKit** (native, high-performance)
- Map display, user location, custom markers, polylines all work without credentials
- For Expo Go, use placeholder map UI (react-native-maps needs dev build)

### Directions, Search & ETA (Needs Apple MapKit JS Credentials)
- Backend generates JWT tokens: `GET /api/maps/token`
- Use token to call Apple Maps Server API:
  - `GET https://maps-api.apple.com/v1/directions` - Turn-by-turn directions
  - `GET https://maps-api.apple.com/v1/search` - Place search
  - `GET https://maps-api.apple.com/v1/etas` - ETA calculations
  - `GET https://maps-api.apple.com/v1/reverseGeocode` - Coordinates to address

### Alternative (No Credentials Needed)
- `react-native-maps-directions` uses Apple Maps routing on iOS automatically
- No API key required for basic routing!

```tsx
// Example: Apple Maps in SnapRoad
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';

<MapView
  provider={PROVIDER_DEFAULT}  // Apple Maps on iOS
  showsUserLocation
  showsTraffic={true}
  mapType="mutedStandard"      // Clean navigation look
>
  <Polyline coordinates={routeCoords} strokeColor="#10B981" strokeWidth={6} />
  <Marker coordinate={destination}>
    <View style={styles.destinationMarker}>
      <Ionicons name="flag" size={24} color="#fff" />
    </View>
  </Marker>
</MapView>
```

---

## New Screens Implemented (Ready for Testing)

### 1. TripAnalyticsScreen (`/app/snaproad-mobile/src/screens/TripAnalyticsScreen.tsx`)
- Full trip analytics with 3 tabs: Trips, Savings, Stats
- Date range filters (7/30/90 days)
- Expandable trip cards with fuel details
- Fetches from `GET /api/trips/history/detailed?days=30`

### 2. RouteHistory3DScreen (`/app/snaproad-mobile/src/screens/RouteHistory3DScreen.tsx`)
- Interactive pseudo-3D route visualization
- SVG-based route rendering with PanResponder for rotation
- Color-coded routes by safety score
- Sort by: Most Trips, Distance, Recent
- Fetches from `GET /api/routes/history-3d?days=90`

### TODO for Kathir:
- [ ] Add these screens to navigation stack in `/app/snaproad-mobile/src/navigation/index.tsx`
- [ ] Add menu items in ProfileScreen to access these new screens
- [ ] Test on physical device for performance
- [ ] Add animated transitions between screens

---

## Project Structure

```
/app/snaproad-mobile/
├── App.tsx                      # Root component
├── app.json                     # Expo config
├── package.json                 # Dependencies
└── src/
    ├── components/
    │   └── ui.tsx               # Shared UI components
    ├── navigation/
    │   └── index.tsx            # Navigation config
    ├── screens/
    │   ├── MapScreen.tsx        # Main map view
    │   ├── TripAnalyticsScreen.tsx  # NEW: Trip analytics
    │   ├── RouteHistory3DScreen.tsx # NEW: Route visualization
    │   ├── MyOffersScreen.tsx   # Customer offers
    │   ├── OrionCoachScreen.tsx # AI chat
    │   ├── FuelDashboardScreen.tsx
    │   ├── ProfileScreen.tsx
    │   ├── RewardsScreen.tsx
    │   └── ...
    ├── services/
    │   └── api.ts               # API service layer
    ├── store/
    │   └── index.ts             # Zustand stores
    ├── types/
    │   └── index.ts
    └── utils/
        └── theme.ts             # Colors, spacing, fonts
```

---

## API Endpoints Ready (Backend Complete)

| Endpoint | Method | Description | Status |
|----------|--------|-------------|--------|
| `/api/trips/history/detailed` | GET | Trip history with fuel analytics | Mocked |
| `/api/fuel/analytics` | GET | Monthly fuel breakdown | Mocked |
| `/api/routes/history-3d` | GET | Route data for 3D visualization | Mocked |
| `/api/offers/personalized` | GET | Personalized offers based on location | Mocked |
| `/api/orion/chat` | POST | AI chat with Orion | **LIVE** |
| `/api/maps/token` | GET | Apple MapKit JWT token | **TODO** (Andrew) |

---

## Environment Variables

```env
# /app/snaproad-mobile/.env
API_URL=https://api.snaproad.com/api
EXPO_PUBLIC_API_URL=https://api.snaproad.com
EXPO_PUBLIC_PUSH_NOTIFICATION_PROJECT_ID=xxxxx
```

**Note**: Apple MapKit credentials are NOT needed in the mobile app. The backend generates MapKit JWT tokens and the mobile app fetches them via `/api/maps/token`.

---

## Navigation Service (Apple Maps)

The navigation service is at `/app/snaproad-mobile/src/services/navigation.ts`:
- `getDirections(origin, destination)` - Uses Apple Maps Directions API
- `searchPlaces(query, location)` - Uses Apple Maps Search API
- `reverseGeocode(lat, lng)` - Coordinates to address
- `getETA(origin, destination)` - Travel time estimate

All calls use a JWT token fetched from the backend.

---

## Testing on Device

```bash
cd /app/snaproad-mobile
yarn install
npx expo start
```

For real Apple Maps (requires development build):
```bash
eas build --profile development --platform ios
```

---

**Questions? Contact PM for Apple Developer credentials or coordinate with Andrew on API contracts.**
