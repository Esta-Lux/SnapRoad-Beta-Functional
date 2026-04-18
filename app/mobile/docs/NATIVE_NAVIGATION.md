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

## iOS build notes (MapboxMaps + Navigation UIKit)

Newer Xcode / Mapbox SDKs on this project:

- `mapView.mapboxMap` is **optional** — always unwrap before calling `addLayer` / `addSource` / `setStyleImportConfigProperty` / `setLayerProperty`.
- `SymbolLayer.iconImage` expects **`ResolvedImage`**, not a raw `String` — use `.constant(.name("image-id"))`.
- Turf **`JSONValue`** uses the **`.boolean(Bool)`** case (not `.bool`). Reading `feature.properties["key"]` is double-optional (`JSONValue??`) because `JSONObject = [String: JSONValue?]`; unwrap both layers before use.
- **`MapboxMaps.Style`** and **`MapboxNavigationUIKit.Style`** are different types. **`MapboxNavigationUIKit.Style` in 3.x no longer exposes** `routeCasingColor`, `routeAlternateCasingColor`, or `maneuverArrowColor`. Route theming now flows through `NavigationViewControllerDelegate.navigationViewController(_:routeLineLayerWithIdentifier:sourceIdentifier:)` and the corresponding `…routeCasingLineLayerWithIdentifier…` callback, plus belt-and-suspenders direct `setLayerProperty` calls on the casing layer id.

The patch in `patches/@badatgil+expo-mapbox-navigation+*.patch` carries these fixes. To regenerate: edit the file inside `node_modules/@badatgil/expo-mapbox-navigation`, then run `npx patch-package @badatgil/expo-mapbox-navigation` from `app/mobile`.

## Pre-release checks

From `app/mobile`: `npm run postinstall` (patches), `npx tsc --noEmit`, `npm test`, `npx expo-doctor`. The Expo app `package.json` configures `expo.doctor.reactNativeDirectoryCheck` so forked / vendored native deps (`@badatgil/expo-mapbox-navigation`, voice, vector icons) do not fail `expo-doctor` while remaining intentional dependencies.
