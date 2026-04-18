# Native Mapbox Navigation (hybrid + opt-in full-screen)

SnapRoad uses `@badatgil/expo-mapbox-navigation` with a **patch-package** overlay (`app/mobile/patches/@badatgil+expo-mapbox-navigation+*.patch`). This document describes behavior that is easy to misconfigure across JS ↔ native.

## Architecture: native drives logic, JS owns presentation

The **default** experience is a hybrid: the visible map stays on SnapRoad's `@rnmapbox/maps` view (branded styles, modes, driving-mode colors, markers) while a **headless** Navigation SDK session runs as a 2×2 invisible view on `MapScreen` and feeds the JS layer with:

| Source of truth | Consumer in JS |
|---|---|
| `onRouteProgressChanged` → `ingestSdkProgress` | `NavigationProgress.nextStep`, ETA, turn card, banner, distance-to-maneuver |
| `onNavigationLocationUpdate` → `ingestSdkLocation` | `CustomLocationProvider` puck position + course, speed limit badge |
| `onRoutesLoaded` / `onRouteChanged` → `ingestSdkRoutePolyline` + `applySdkRouteGeometry` | `RouteOverlay` polyline (themed via `DRIVING_MODES[drivingMode].routeColor`), refreshes on reroute |
| `onVoiceInstruction` → `ingestSdkVoiceSubtitle` | Voice HUD |
| `onCancelNavigation` / `onFinalDestinationArrival` | `stopNavigation()` |

**Single authority**: when `navLogicSdkEnabled()` is on, `useDriveNavigation` sets `sdkActive = true` and gates the JS-only pipeline (`useNavigationProgress` gets `route: []`, `fetchDirections` is blocked mid-trip) so the two engines never fight.

**Fight prevention**:
- The hidden `MapboxNavigationView` on `MapScreen` is gated on `mapTabFocused` — if the user opts into the full-screen `NativeNavigationScreen`, MapScreen blurs and the hidden session shuts down, leaving exactly one native nav instance.
- The OHGO camera fetcher on `MapScreen` is also gated on `mapTabFocused` so it doesn't race the one inside `NativeNavigationScreen`.

## Feature flags

| Var | Default | Effect |
|---|---|---|
| `EXPO_PUBLIC_NAV_LOGIC_SDK` | **on** | Headless Navigation SDK drives logic on `MapScreen`. Set `0` for JS-only Directions + `useNavigationProgress` (Expo Go / experiments). |
| `EXPO_PUBLIC_NAV_FULLSCREEN_NATIVE` | **off** | Route `Start navigation` through the full-screen `NativeNavigationScreen` (Mapbox's default UI chrome, themed via `NavigationViewControllerDelegate`). Default keeps the branded JS map. |
| `EXPO_PUBLIC_NAV_NATIVE_SDK` | build-capable default | Gates both of the above when the dev client lacks the native Mapbox Navigation module (e.g. Expo Go). |

Both surfaces render the same `DRIVING_MODES[drivingMode]` palette — the Swift delegate (`routeLineLayerWithIdentifier` / `routeCasingLineLayerWithIdentifier`) applies the same hex values the JS `RouteOverlay` uses, so switching between hybrid and full-screen is visually coherent.

## Theme (day / night)

- **JS** passes `appTheme="light" | "dark"` from `ThemeContext` (`NativeNavigationScreen` → `MapboxNavigationView`). It must **not** follow only `useColorScheme()`: users can set light/dark in-app while the system stays unchanged.
- **iOS** aligns the embedded `NavigationViewController` with `overrideUserInterfaceStyle`, `usesNightStyleInDarkMode`, and `styleManager?.applyStyle(type:)` (optional — `styleManager` may be nil before the nav UI finishes loading) so Mapbox’s day/night styles match SnapRoad. Mapbox Standard basemap lighting still uses `lightPreset` (`day` / `night`) via `setStyleImportConfigProperty` on the `basemap` import.
- **Android** applies the same `lightPreset` through `Style.setStyleImportConfigProperties("basemap", …)` after mode/theme changes.

## Traffic cameras (OHGO + API)

- **Data**: `GET /api/map/cameras?lat=…&lng=…&radius=80` returns up to OHGO's ~50-mile (~80 km) window. Backend (`app/backend/routes/navigation.py`) double-filters via haversine, so the client sees only points inside the requested radius.
- **Browse (JS map)**: `CameraMarkers` renders each point as a `MarkerView` + Ionicon. Capping lives in `markerDensity.ts` and is deliberately generous (see below). The fetcher is focus-gated on `mapTabFocused` so opt-in full-screen nav never double-fetches.
- **During nav on JS map (hybrid)**: `CameraMarkers` is passed `isNavigating` which swaps to the `cameraNavigating` density kind — higher caps at every zoom, so the trip map never feels “half empty”. Camera reference is the fused nav coord, so points stay sorted by distance ahead of the user.
- **Full-screen native (opt-in)**: `NativeNavigationScreen` serialises the same camera list to the `trafficCameras` prop → native **SymbolLayer** (GeoJSON) with a custom icon added **above** the route line.
- **Tap**: `onTrafficCameraTap` on the native side uses `queryRenderedFeatures`; the JS side uses a `Pressable` inside `MarkerView`.
- **SDK duplicate banners**: Mapbox Directions often emits extra maneuver/banner rows for speed/traffic cameras. Those duplicate the map POIs and can cover the primary turn card. The patch **suppresses** those lines on non-primary instruction labels (iOS `NavigationViewControllerDelegate.label`) and filters extra **Android** `Maneuver` rows after the first maneuver.

### Density policy (`markerDensity.ts`)

- `'camera'` (browse): 100 at state-level zoom up to 360 at driving zoom.
- `'cameraNavigating'` (hybrid trip): 180 at state-level zoom up to 420 at driving zoom — always ≥ the browse cap.
- Visible radius for both kinds is widened (up to ~95 km at zoom 10) so no OHGO camera returned by the backend is hidden purely by client-side culling.

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
