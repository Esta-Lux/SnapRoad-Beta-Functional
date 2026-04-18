# Native Mapbox Navigation (full-screen)

SnapRoad uses `@badatgil/expo-mapbox-navigation` with a **patch-package** overlay (`app/mobile/patches/@badatgil+expo-mapbox-navigation+*.patch`). This document describes behavior that is easy to misconfigure across JS ↔ native.

## Theme (day / night)

- **JS** passes `appTheme="light" | "dark"` from `ThemeContext` (`NativeNavigationScreen` → `MapboxNavigationView`). It must **not** follow only `useColorScheme()`: users can set light/dark in-app while the system stays unchanged.
- **iOS** aligns the embedded `NavigationViewController` with `overrideUserInterfaceStyle`, `usesNightStyleInDarkMode`, and `styleManager?.applyStyle(type:)` (optional — `styleManager` may be nil before the nav UI finishes loading) so Mapbox’s day/night styles match SnapRoad. Mapbox Standard basemap lighting still uses `lightPreset` (`day` / `night`) via `setStyleImportConfigProperty` on the `basemap` import.
- **Android** applies the same `lightPreset` through `Style.setStyleImportConfigProperties("basemap", …)` after mode/theme changes.

## Traffic cameras (OHGO + API)

- **Data**: `GET /api/map/cameras` → `extractCameraList` → `camerasForNativeMapOverlay` → JSON string on the `trafficCameras` prop.
- **Map**: Native **SymbolLayer** (GeoJSON) with a custom icon; **not** a React overlay. Icons are added **above** the main route line so they remain visible during navigation.
- **Tap**: `onTrafficCameraTap` fires from native `queryRenderedFeatures` (not a view floating over the turn banner).
- **SDK duplicate banners**: Mapbox Directions often emits extra maneuver/banner rows for speed/traffic cameras. Those duplicate the map POIs and can cover the primary turn card. The patch **suppresses** those lines on non-primary instruction labels (iOS `NavigationViewControllerDelegate.label`) and filters extra **Android** `Maneuver` rows after the first maneuver.

## Related JS helper

`shouldSuppressSdkCameraInstructionLine` in `src/lib/nativeNavHelpers.ts` documents the same policy for tests and any future JS-side filtering.

## Pre-release checks

From `app/mobile`: `npm run postinstall` (patches), `npx tsc --noEmit`, `npm test`, `npx expo-doctor`. The Expo app `package.json` configures `expo.doctor.reactNativeDirectoryCheck` so forked / vendored native deps (`@badatgil/expo-mapbox-navigation`, voice, vector icons) do not fail `expo-doctor` while remaining intentional dependencies.
