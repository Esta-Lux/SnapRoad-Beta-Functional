# SnapRoad Mobile - React Native Driver App

A React Native (Expo) implementation of the SnapRoad Driver App. This is a **UI-only implementation** with mock data stores - no API connections. Your team will need to implement the API integration.

## 📱 Features Implemented

### Screens
- ✅ **Onboarding Flow** - Welcome, Plan Selection, Car Type, Car Color, Complete
- ✅ **Map Screen** - Interactive map with offer markers, search bar, stats bar
- ✅ **Offers Screen** - Category filters, offer list with discounts and gems
- ✅ **Rewards Screen** - Badges (earned/in-progress), Challenges, Car Studio link
- ✅ **Profile Screen** - User stats, savings, gas prices, trips, quick actions

### Components
- ✅ **Button** - Primary, outline, ghost variants with loading state
- ✅ **Card** - Touchable card component
- ✅ **Badge** - Status badges with variants
- ✅ **ProgressBar** - Animated progress with gradient
- ✅ **StatCard** - Stats display with icon
- ✅ **GemDisplay** - Gem count display
- ✅ **Avatar** - User avatar with level badge

### State Management (Zustand)
- ✅ **UserStore** - User profile, XP, gems, car, plan
- ✅ **OffersStore** - Offers list, selection
- ✅ **BadgesStore** - Badge collection, claiming
- ✅ **ChallengesStore** - Challenges, joining, progress
- ✅ **LeaderboardStore** - Rankings, filters
- ✅ **TripsStore** - Trip history
- ✅ **GasStationsStore** - Nearby gas prices

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Yarn or npm
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (Mac) or Android Emulator

### Installation
```bash
cd snaproad-mobile
yarn install
```

### Run the App
```bash
# Start Expo development server
yarn start

# Or run directly on platform
yarn ios     # iOS Simulator (Mac only)
yarn android # Android Emulator
```

### Scan QR Code
Use the Expo Go app on your phone to scan the QR code from the terminal.

## 📁 Project Structure

```
snaproad-mobile/
├── App.tsx                 # App entry point
├── index.js                # Expo entry
├── app.json                # Expo config
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript config
│
└── src/
    ├── components/
    │   └── ui.tsx          # Reusable UI components
    │
    ├── navigation/
    │   └── index.tsx       # React Navigation setup
    │
    ├── screens/
    │   ├── OnboardingScreen.tsx
    │   ├── MapScreen.tsx
    │   ├── OffersScreen.tsx
    │   ├── RewardsScreen.tsx
    │   └── ProfileScreen.tsx
    │
    ├── store/
    │   └── index.ts        # Zustand stores (MOCK DATA)
    │
    ├── types/
    │   └── index.ts        # TypeScript interfaces
    │
    └── utils/
        └── theme.ts        # Colors, spacing, constants
```

## 🔌 API Integration Guide

All mock data is in `/src/store/index.ts`. To connect APIs:

### 1. Create API Service
```typescript
// src/services/api.ts
const API_URL = 'https://your-api.com/api';

export const api = {
  // User
  getUser: () => fetch(`${API_URL}/user`).then(r => r.json()),
  updatePlan: (plan: string) => fetch(`${API_URL}/user/plan`, {
    method: 'POST',
    body: JSON.stringify({ plan })
  }),
  
  // Offers
  getOffers: () => fetch(`${API_URL}/offers`).then(r => r.json()),
  redeemOffer: (id: number) => fetch(`${API_URL}/offers/${id}/redeem`, {
    method: 'POST'
  }),
  
  // etc...
};
```

### 2. Update Store to Use API
```typescript
// In store/index.ts
export const useUserStore = create<UserState>((set, get) => ({
  user: initialUser,
  isLoading: false,
  
  fetchUser: async () => {
    set({ isLoading: true });
    try {
      const response = await api.getUser();
      set({ user: response.data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      // Handle error
    }
  },
  
  // ... other actions
}));
```

### 3. API Endpoints to Implement

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/user` | GET | Get current user |
| `/api/user/plan` | POST | Update user plan |
| `/api/user/car` | POST | Update car selection |
| `/api/offers` | GET | List offers |
| `/api/offers/:id/redeem` | POST | Redeem offer |
| `/api/badges` | GET | List badges |
| `/api/badges/:id/claim` | POST | Claim badge |
| `/api/challenges` | GET | List challenges |
| `/api/challenges/:id/join` | POST | Join challenge |
| `/api/leaderboard` | GET | Get leaderboard |
| `/api/trips` | GET | Get trip history |

## 🎨 Customization

### Colors
Edit `/src/utils/theme.ts`:
```typescript
export const Colors = {
  primary: '#10b981',     // Change primary color
  background: '#0f172a',  // Dark background
  // ...
};
```

### Car Options
Edit `/src/utils/theme.ts`:
```typescript
export const CarCategories = [
  { id: 'sedan', name: 'Sedan', icon: '🚗' },
  // Add more...
];

export const CarColors = [
  { id: 'ocean-blue', name: 'Ocean Blue', hex: '#3b82f6', tier: 'standard', gems: 0 },
  // Add more...
];
```

## 📲 Building for Production

### iOS (requires Mac + Apple Developer account)
```bash
# Build for iOS
eas build --platform ios

# Submit to App Store
eas submit --platform ios
```

### Android
```bash
# Build APK
eas build --platform android --profile preview

# Build for Play Store
eas build --platform android
```

### Configure EAS
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure
```

## 📝 TODO for Your Team

1. **[ ] Implement API Service** - Create `/src/services/api.ts`
2. **[ ] Update Stores** - Replace mock data with API calls
3. **[ ] Add Authentication** - Implement login/register screens
4. **[ ] Add Loading States** - Show spinners during API calls
5. **[ ] Add Error Handling** - Toast/alert for API errors
6. **[ ] Implement Detail Screens** - OfferDetail, BadgeDetail, etc.
7. **[ ] Add Push Notifications** - Firebase Cloud Messaging
8. **[ ] Add Real Maps** - Replace mock map markers with real locations
9. **[ ] Testing** - Add Jest/React Native Testing Library tests
10. **[ ] App Icons & Splash** - Replace placeholder assets

## 🔗 Web Dashboard Links

The web dashboards remain at:
- **Partner Dashboard:** `/partner`
- **Admin Console:** `/portal/admin-sr2025secure`

---

**Built with ❤️ for SnapRoad**
