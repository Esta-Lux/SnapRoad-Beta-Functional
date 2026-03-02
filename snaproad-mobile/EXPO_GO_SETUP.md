# SnapRoad Mobile - Expo Go Compatibility Guide

## Issues Fixed

The React Native project has been updated to work with **Expo Go**. Here's what was changed:

### 1. Missing Asset Files (FIXED)
- Created placeholder images for `icon.png`, `splash.png`, and `adaptive-icon.png`
- Located at `/src/assets/`
- **Action for team:** Replace these with your actual branded assets

### 2. Missing Peer Dependency (FIXED)
- Installed `expo-font@~11.10.3` (required by `@expo/vector-icons`)
- Added to `app.json` plugins

### 3. Outdated React Native Version (FIXED)
- Updated from `react-native@0.73.2` to `react-native@0.73.6`

### 4. react-native-maps Incompatibility (FIXED)
- **Problem:** `react-native-maps` is NOT fully compatible with Expo Go in SDK 50+
- **Solution:** Removed the dependency and replaced `MapScreen.tsx` with a placeholder map UI
- The placeholder provides:
  - Visual map-like interface with grid overlay
  - Animated offer markers
  - Full offer selection panel
  - Location indicator

## Running the App with Expo Go

```bash
cd snaproad-mobile
yarn install
npx expo start
```

Then scan the QR code with:
- **iOS:** Camera app → tap the banner
- **Android:** Expo Go app → Scan QR Code

## For Full Map Functionality

When your team is ready for real maps, you have two options:

### Option A: Development Builds (Recommended)
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Create a development build
eas build --profile development --platform ios
# or
eas build --profile development --platform android

# Or run locally (requires Xcode/Android Studio)
npx expo run:ios
npx expo run:android
```

### Option B: Use expo-maps (Apple Maps on iOS, Google Maps on Android)
```bash
npx expo install expo-maps
```
Then update MapScreen.tsx to use the expo-maps API.

## Verified Package Versions

All packages are now compatible with Expo SDK 50:

| Package | Version | Status |
|---------|---------|--------|
| expo | ~50.0.0 | ✅ |
| react-native | 0.73.6 | ✅ |
| expo-font | ~11.10.3 | ✅ |
| expo-location | ~16.5.0 | ✅ |
| expo-linear-gradient | ~12.7.0 | ✅ |
| @expo/vector-icons | ^14.0.0 | ✅ |
| react-native-safe-area-context | 4.8.2 | ✅ |
| react-native-screens | ~3.29.0 | ✅ |
| react-native-svg | 14.1.0 | ✅ |
| zustand | ^4.5.0 | ✅ |

## Troubleshooting

### "Metro bundler not starting"
```bash
rm -rf node_modules .expo
yarn install
npx expo start --clear
```

### "Unable to resolve module"
```bash
npx expo install --fix
```

### "Something went wrong" on device
- Ensure your phone is on the same WiFi network as your computer
- Try using tunnel mode: `npx expo start --tunnel`

## Contact

For questions about the mobile implementation, refer to:
- `/app/memory/KATHIR_MOBILE_GUIDE.md` - Detailed mobile lead guide
- `/app/memory/PM_SUPPORT_GUIDE.md` - Project overview
