# SnapRoad Mobile - React Native Driver App

A complete React Native (Expo) implementation of the SnapRoad Driver App, matching the web UI design and features.

## 📱 Features

### Onboarding Flow
- **Plan Selection** - Basic (free) vs Premium ($10.99/mo with 35% discount)
- **Car Setup** - Choose vehicle type (Sedan/SUV/Truck) and color

### Main App (4 Tabs)
1. **Map Tab**
   - Interactive map with offer markers
   - Favorites/Nearby/Report location buttons
   - Quick access to Home & Work locations
   - Orion Voice Assistant button
   - Quick Photo Report button

2. **Routes Tab**
   - Saved routes list
   - Add new routes

3. **Rewards Tab**
   - **Offers** - Local business discounts (gas, cafe, restaurant)
   - **Challenges** - Weekly goals with XP/gem rewards
   - **Badges** - Achievement collection
   - **Car Studio** - Vehicle customization

4. **Profile Tab**
   - **Overview** - Stats (gems, safety, miles, trips)
   - **Score** - Driving score details
   - **Fuel** - Gas prices tracker
   - **Settings** - App preferences

### UI Components
- Custom gradient tab bar
- Side menu with navigation
- Offer cards with discount badges
- Challenge progress bars
- Badge grid with earned/locked states

## 🎨 Design System

### Colors (matching web app)
```typescript
primary: '#0EA5E9'     // Sky blue
accent: '#D946EF'      // Fuchsia
success: '#22C55E'     // Green
warning: '#F59E0B'     // Amber
error: '#EF4444'       // Red
background: '#0F172A'  // Dark slate
surface: '#1E293B'     // Lighter slate
```

### Typography
- Headers: Bold, 22-26px
- Body: Regular, 13-14px
- Labels: Medium, 11-12px

## 🚀 Quick Start

```bash
cd snaproad-mobile
yarn install
yarn start
```

Scan QR code with **Expo Go** app on your phone.

## 📁 Project Structure

```
snaproad-mobile/
├── App.tsx                    # Entry point
├── src/
│   ├── screens/
│   │   └── DriverApp.tsx      # Complete app (all screens)
│   ├── components/
│   │   └── ui.tsx             # Reusable components
│   ├── store/
│   │   └── index.ts           # Zustand stores (mock data)
│   ├── types/
│   │   └── index.ts           # TypeScript interfaces
│   └── utils/
│       └── theme.ts           # Design tokens
└── package.json
```

## 🔄 Navigation Flow

```
Plan Selection → Car Setup → Main App (4 Tabs)
                              ├── Map
                              ├── Routes  
                              ├── Rewards (4 sub-tabs)
                              │   ├── Offers
                              │   ├── Challenges
                              │   ├── Badges
                              │   └── Car Studio
                              └── Profile (4 sub-tabs)
                                  ├── Overview
                                  ├── Score
                                  ├── Fuel
                                  └── Settings
```

## 📝 Data (Mock)

All data is currently mocked in `DriverApp.tsx`:
- `mockUserData` - User profile, gems, level, stats
- `mockOffers` - Local business offers
- `mockChallenges` - Weekly challenges

## 🔌 API Integration

To connect to real backend:

1. Replace mock data with API calls:
```typescript
const API_URL = process.env.EXPO_PUBLIC_API_URL;

// Fetch offers
const response = await fetch(`${API_URL}/api/offers`);
const offers = await response.json();
```

2. Create `.env` file:
```
EXPO_PUBLIC_API_URL=https://your-api.com
```

## 📲 Building for Production

### EAS Build
```bash
# Install EAS CLI
npm install -g eas-cli

# Configure
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android --profile preview
```

## ⚠️ Known Limitations

1. **Map** - Uses placeholder (real maps require development build)
2. **Data** - All mock data (no API connection)
3. **Auth** - No real authentication

## 📋 TODO

- [ ] Connect to real backend APIs
- [ ] Add real maps (Mapbox/Google Maps via EAS)
- [ ] Implement push notifications
- [ ] Add offline mode
- [ ] Write unit tests

---

**Built with ❤️ for SnapRoad**

Last Updated: December 2025
