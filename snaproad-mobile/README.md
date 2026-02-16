# SnapRoad Mobile - React Native Driver App

A React Native (Expo) implementation of the SnapRoad Driver App, converted from Flutter design patterns. This is a **UI-complete implementation** with mock data stores - ready for API integration.

## 📱 Screenshots Preview

The app includes a full mobile experience matching the Flutter UI design:

- **Splash Screen** - Animated logo with pulsing effect
- **Welcome/Onboarding** - Feature carousel with 4 slides
- **Plan Selection** - Basic (free) vs Premium ($10.99/mo)
- **Car Setup** - Vehicle type and color selection
- **Map Screen** - Interactive map with offer markers
- **Offers Screen** - Categorized local offers
- **Rewards Screen** - Challenges, badges, and car studio
- **Profile Screen** - Stats, trips, settings

## 🎨 Design System (Flutter-aligned)

### Colors
```typescript
// Primary - Sky Blue
primary: '#0EA5E9'

// Accent - Fuchsia  
accent: '#D946EF'

// Background - Slate Dark
background: '#0F172A'
surface: '#1E293B'

// Status Colors
success: '#22C55E'
warning: '#F59E0B'
error: '#EF4444'
```

### Typography
- Display: 48px
- Heading (XXL): 32px
- Title (XL): 24px
- Body (MD): 14px
- Caption (SM): 12px

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Yarn (recommended) or npm
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (Mac) or Android Emulator
- Expo Go app on your phone

### Installation

```bash
cd snaproad-mobile
yarn install
```

### Run the App

```bash
# Start Expo dev server
yarn start

# Or run directly
yarn ios     # iOS Simulator (Mac only)
yarn android # Android Emulator
```

### Scan QR Code
Use the **Expo Go** app on your phone to scan the QR code from the terminal.

## 📁 Project Structure

```
snaproad-mobile/
├── App.tsx                 # App entry point
├── app.json               # Expo configuration
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
│
└── src/
    ├── components/
    │   └── ui.tsx          # Reusable UI components
    │                       # Button, Card, Badge, ProgressBar,
    │                       # StatCard, GemDisplay, Avatar
    │
    ├── navigation/
    │   └── index.tsx       # React Navigation + Custom Tab Bar
    │                       # Stack: Splash → Welcome → Plan → Car → Tabs
    │                       # Tabs: Map, Offers, Rewards, Profile
    │
    ├── screens/
    │   ├── SplashScreen.tsx       # Animated splash
    │   ├── WelcomeScreen.tsx      # Feature carousel
    │   ├── PlanSelectionScreen.tsx # Subscription selection
    │   ├── CarSetupScreen.tsx     # Vehicle customization
    │   ├── MapScreen.tsx          # Main map view
    │   ├── OffersScreen.tsx       # Browse offers
    │   ├── RewardsScreen.tsx      # Badges/Challenges/CarStudio
    │   ├── ProfileScreen.tsx      # User profile & settings
    │   ├── OfferDetailScreen.tsx  # Individual offer + redemption
    │   ├── LeaderboardScreen.tsx  # Rankings
    │   └── OnboardingScreen.tsx   # Legacy onboarding (backup)
    │
    ├── store/
    │   └── index.ts        # Zustand stores (MOCK DATA)
    │                       # UserStore, OffersStore, BadgesStore,
    │                       # ChallengesStore, LeaderboardStore,
    │                       # TripsStore, GasStationsStore
    │
    ├── types/
    │   └── index.ts        # TypeScript interfaces
    │
    └── utils/
        └── theme.ts        # Design system tokens
                            # Colors, Spacing, BorderRadius,
                            # CarCategories, CarColors, etc.
```

## 🔄 Navigation Flow

```
┌─────────────┐
│   Splash    │ (2.5s auto-advance)
└──────┬──────┘
       ▼
┌─────────────┐
│   Welcome   │ (4-slide carousel)
└──────┬──────┘
       ▼
┌─────────────┐
│    Plan     │ (Basic/Premium)
│  Selection  │
└──────┬──────┘
       ▼
┌─────────────┐
│  Car Setup  │ (Type → Color)
└──────┬──────┘
       ▼
┌─────────────────────────────────────┐
│           Main Tab Bar              │
├─────────┬─────────┬────────┬────────┤
│   Map   │ Offers  │ Rewards│ Profile│
└─────────┴─────────┴────────┴────────┘
```

## 🎮 State Management

Using **Zustand** for lightweight state management with mock data:

```typescript
// Example: Access user data
import { useUserStore } from '../store';

const { user, addGems, spendGems } = useUserStore();
```

### Available Stores:
- `useUserStore` - User profile, XP, gems, car selection
- `useOffersStore` - Nearby offers
- `useBadgesStore` - Badge collection
- `useChallengesStore` - Active challenges
- `useLeaderboardStore` - Rankings
- `useTripsStore` - Trip history
- `useGasStationsStore` - Fuel prices
- `useAppStore` - App state (loading, current tab)

## 🔌 API Integration Guide

All mock data is in `/src/store/index.ts`. To connect APIs:

### 1. Create API Service

```typescript
// src/services/api.ts
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.snaproad.com';

export const api = {
  getUser: () => fetch(`${API_URL}/api/user`).then(r => r.json()),
  getOffers: () => fetch(`${API_URL}/api/offers`).then(r => r.json()),
  redeemOffer: (id: number, gems: number) => 
    fetch(`${API_URL}/api/offers/${id}/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gems })
    }),
};
```

### 2. Update Store

```typescript
export const useOffersStore = create<OffersState>((set) => ({
  offers: [],
  isLoading: false,
  
  fetchOffers: async () => {
    set({ isLoading: true });
    const data = await api.getOffers();
    set({ offers: data, isLoading: false });
  },
}));
```

## 📲 Building for Production

### EAS Build Setup

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure
```

### Build Commands

```bash
# iOS (requires Apple Developer account)
eas build --platform ios

# Android APK (for testing)
eas build --platform android --profile preview

# Android AAB (for Play Store)
eas build --platform android --profile production
```

## 📝 TODO for Your Team

### High Priority
- [ ] Implement API service layer
- [ ] Replace mock stores with API calls
- [ ] Add real authentication (JWT)
- [ ] Integrate real maps (Mapbox/Google Maps)

### Medium Priority
- [ ] Add loading states/skeletons
- [ ] Implement error handling with toasts
- [ ] Add pull-to-refresh on list screens
- [ ] Implement push notifications

### Low Priority
- [ ] Add offline mode with caching
- [ ] Implement deep linking
- [ ] Add analytics tracking
- [ ] Write unit tests

## 🛠 Development Notes

### Map Implementation
The current MapScreen uses a placeholder. For real maps:

1. Use development builds (not Expo Go)
2. Install `react-native-maps` or Mapbox SDK
3. Run `eas build --profile development`

### Environment Variables
Create `.env` file:
```
EXPO_PUBLIC_API_URL=https://your-api.com
EXPO_PUBLIC_MAPBOX_TOKEN=pk.xxx
```

### Custom Fonts
Add custom fonts to `assets/fonts/` and configure in `app.json`.

---

**Built with ❤️ for SnapRoad**

Last Updated: December 2025
