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

### Single-authority matrix (per-surface)

Trip authority alone isn't enough — each visible nav surface has its own native dependency that must be satisfied before the JS layer can cede control, otherwise the first ~150 ms of a trip briefly renders a half-native / half-JS frame. `src/navigation/navSdkAuthority.ts` exposes four predicates and `MapScreen.tsx` uses them as render gates (`sdkPuckOwns`, `sdkRouteOwns`, `sdkBannerOwns`).

| Surface | Predicate | Native data required | JS fallback while false |
|---|---|---|---|
| Trip voice / TTS rate source | `isSdkTripAuthoritative()` | `sdkGuidancePhase === 'active'` (first `onRouteProgressChanged`) | JS voice + JS turn card |
| Location puck | `isSdkPuckAuthoritative()` | `onNavigationLocationUpdate` matched payload | `MapboxGL.LocationPuck` (raw GPS) |
| Route polyline | `isSdkRouteAuthoritative()` | `onRoutesLoaded` / `onRouteChanged` (≥ 2 points) | `navigationData.polyline` (JS Directions preview geometry) |
| Turn banner copy | `isSdkBannerAuthoritative()` | Progress carries `primaryInstruction` or `currentStepInstruction` | REST `NavStep.displayInstruction` via `navSdkProgressAdapter` |

Covered by `navSdkAuthority.unit.test.ts`. The adapter's native-first primary/secondary/then-instruction precedence is covered by `navSdkProgressAdapter.unit.test.ts` (scenarios: native-wins-over-disagreeing-REST, fallback-when-native-silent, thenInstruction-fills-secondary, native `distanceToNextManeuverMeters` wins over REST step distance).

When `sdkRouteOwns` flips true but the SDK polyline hasn't landed yet, `MapScreen` intentionally renders **nothing** for the route instead of falling back to stale JS geometry — the next native tick will paint the correct route (typically within one RAF). When `sdkBannerOwns` flips true, `TurnInstructionCard` is forced through the `useBannerCopy` path and reads `banner.primaryInstruction` / `banner.secondaryInstruction` verbatim — JS cruise / confirm copy helpers are bypassed.

### Apple-Maps single-frame rendering (puck, camera, route, card, strip)

The per-surface matrix above is a correctness gate ("don't render native UI before the native data lands"). A second layer — **pixel-level consistency** across surfaces on every frame — is required for a driver's eye to read the nav HUD as a single, stable frame instead of a hybrid that fidgets between sources. These are the rules `MapScreen.tsx`, `navSdkProgressAdapter.ts`, and the two HUD components enforce:

1. **Puck, camera anchor, and route split share one coord.** During any active trip (SDK *or* JS-only), `MapboxGL.CustomLocationProvider` and `NavSdkPuck` are both fed `nav.navigationProgressCoord` + `nav.navigationDisplayHeading`. On the SDK path these resolve to `routeSplitSnap.point` (the exact cumulative-meters-along-polyline point where `RouteOverlay` draws the traveled → remaining split) and the smoothed course. Feeding the provider with raw `navSdkStore.location` lat/lng instead would place the map-matched GPS 1–3 m off the rendered polyline (matcher vs client projection mismatch), which is visible to the user as the puck sliding along the *side* of the route and the camera "tracking from an angle". One coord, one frame.
2. **Course smoothing (shortest-angle EWMA).** `navSdkProgressAdapter.smoothCourseDeg` blends `location.course` with the previous emitted heading along the shortest angle. Alpha scales with speed (0.35 ≤ 4 m/s → 0.85 ≥ 15 m/s) so the puck doesn't twitch on stationary GPS noise yet still turns instantly on real lane changes (|Δ| ≥ 25° bypasses damping; samples > 2 s old reseed). Covered by `navSdkHeadingSmoothing.unit.test.ts`.
3. **Turn-card text stability hold.** Primary and "Then …" strings in `TurnInstructionCard` are passed through `useStableText` (pure core: `navDisplayHysteresis.resolveStableText`). A single-frame flip that doesn't dwell for at least 120 ms is treated as flicker and suppressed; a legitimate step advance (new `resetKey` from `step.instruction` / `maneuverForIcon` / `state`) flushes instantly. Empty incoming text never blanks the card. Under `sdkBannerOwns`, `primaryInstruction` is always `banner.primaryInstruction` (authoritative native copy), so the upstream value is already stable; the hold only has to defeat transient dissent between the parent string and `step.bannerInstructions[0].primary.text` during the 1–2 frames around a step transition.
4. **Stats strip — arrival-minute + speed-mph hysteresis.** The displayed hh:mm in `NavigationStatusStrip` updates only when the new arrival minute differs from displayed AND ≥ 2 s has elapsed since the last update (or the ETA jumped > 2 min, i.e. reroute/traffic). The displayed mph updates only when the delta from the currently rendered integer is ≥ 1.2 mph. Both rules are pure helpers in `navDisplayHysteresis.ts` and covered by `navDisplayHysteresis.unit.test.ts`.
5. **Continuous puck / camera / route interpolation (RAF).** Native progress ticks at ~1 Hz; raw coord updates make the puck and split re-render in visible steps. `src/hooks/useSmoothedNavFraction.ts` is a `requestAnimationFrame` loop that exponentially eases a `fractionTraveled` scalar (cumulative meters ÷ polyline length) toward its target with a ~180 ms time constant, snapping on deltas > 0.02 (reroutes / large jumps) and clamping monotonic forward motion. `MapScreen` feeds the smoothed fraction into (a) `coordinateAtCumulativeMeters(polyline, fraction × length)` to produce the puck coord, camera anchor, and `CustomLocationProvider` input and (b) `RouteOverlay`'s `fractionTraveled` prop. The overlay then uses Mapbox **`lineTrimOffset`** on the `passed` and `ahead` `LineLayer`s (`[frac, 1]` and `[0, frac]`) so the line trims on the GPU without re-uploading GeoJSON each tick. Result: the puck slides along the line, the camera slides with the puck, and the traveled/remaining split advances pixel-by-pixel on every frame rather than snapping once per native progress. Legacy congestion-shaded splits still use per-tick GeoJSON (the trim path is gated off when `congestion` is present). Covered by `useSmoothedNavFraction.unit.test.ts`.
6. **Camera bearing = route tangent when course is unreliable.** `location.course` from the Navigation SDK is −1 (unknown) at trip start, stationary, or in tunnels, and can be ±180° noisy below ~1.5 m/s. Using it verbatim as camera bearing causes the camera to flip *backwards* at pickup. `navSdkProgressAdapter` now computes a **forward-looking route tangent** via `tangentBearingAlongPolyline(polyline, cumulativeMeters, lookAhead=12m)` — the bearing from the current snapped point to a point ~12 m ahead on the polyline (covered by `tangentBearing.unit.test.ts`). Priority: (a) `location.course` *if* speed ≥ 1.5 m/s, (b) route tangent, (c) raw course as last resort. The chosen seed is then fed through `smoothCourseDeg` (see rule 2) so the camera rotation stays damped. This keeps the camera facing *where the car is going*, not where the compass momentarily thinks north is.
7. **iOS maneuver normalization (native → canonical).** Native Swift emits maneuver type / direction as Swift enum case strings (`takeOnRamp`, `straightAhead`) via `String(describing:)`, which do not match the Mapbox Directions canonical strings (`on ramp`, `straight`) that the JS `MANEUVER_MAP` / `TurnInstructionCard` icon resolver expects. `navSdkProgressAdapter.normalizeSdkManeuverType` / `normalizeSdkManeuverDirection` translate the iOS enum names into canonical form before `mapSdkToRichKind` runs, and the normalized values are also written into `nextStep.rawType` / `rawModifier` so the icon resolver and banner copy agree. Android already emits canonical strings and is idempotent under the same normalizer. Covered by `navSdkManeuverNormalization.unit.test.ts`. This kills the "default straight arrow for every turn" symptom on iOS.
8. **Turn card distance: no "10 ft ahead" in cruise.** `MapScreen` now gates the turn-card distance: in `cardState === 'cruise'` with no actionable maneuver (`liveDistMeters ≤ 5 m` or `maneuver === 'depart'`), the strip renders `—` instead of a tiny rounded "10 ft". Approach/imminent states still show precise distance. Prevents the idle card from fighting with the correct upcoming maneuver for a second or two after trip start.
9. **POIs above 3D buildings (browse + nav).** Mapbox Maps SDK v11's `ViewAnnotationManager` reserves a collision region around the location puck and *culls* any annotation whose projected footprint intersects that region. At the 50°+ pitch used during nav — especially near Standard's 3D buildings and landmarks — that culling caused cameras, offers, incidents, friends, speed cameras, photo reports, destination pin, and even the authoritative `NavSdkPuck` to flicker out / reappear as the user moved. The fix is a one-prop change across every POI `MarkerView`: **`allowOverlapWithPuck`** (alongside the existing `allowOverlap`). `@rnmapbox/maps` already sets `ignoreCameraPadding: true` natively. This keeps POIs on top of Standard's 3D geometry in both navigation (high pitch) and browse (any pitch) modes without breaking marker collision rules between POIs themselves. See `AGENTS.md > Mapbox Markers & POI icons` for the rule new POI components must follow.

**Fight prevention** (audited; see `navSingleAuthority.unit.test.ts` and `utils/voice.ts`):

- *Voice / TTS:* `speakGuidance` and `speak({ rateSource: 'navigation_fixed' })` are hard no-ops during an authoritative SDK trip (`isSdkTripAuthoritative()`). Nav-time non-turn voice — offer nearby, incident ahead — uses `rateSource: 'advisory'`, which is held off for ~3 s after a native voice cue (`msSinceLastSdkVoice()`) so JS never talks over a native turn instruction. User-initiated repeat (`repeatLastTurnByTurn`) passes `forceAllowDuringSdk: true` to bypass the guard.
- *Reroute:* JS `fetchDirections`, prefetch / drift / traffic-refresh timers, and driving-mode reroute all short-circuit when `navSdkHeadless && isNavigating`. Friend-follow mid-trip destination updates are routed through `updateNavigationDestination`, which mutates `navigationData.destination` so `navLogicCoords` rebuilds and the native SDK emits its own `onRouteChanged`.
- *Cameras / progress:* `useNavigationProgress` is called with `route: []` under SDK; the JS 1 Hz progress tick is skipped; step index follows native `progress.stepIndex`. Only one `MapboxGL.Camera` drives the RN map; the hidden native view is `navigationLogicOnly` and does not render another RN camera.
- *Screen focus:* The hidden `MapboxNavigationView` on `MapScreen` is gated on `mapTabFocused` — if the user opts into the full-screen `NativeNavigationScreen`, MapScreen blurs and the hidden session shuts down, leaving exactly one native nav instance.
- *Data:* The OHGO camera and incident fetchers on both `MapScreen` and `NativeNavigationScreen` are focus-gated (`mapTabFocused` / `useIsFocused()`) so neither screen double-fetches during brief overlap.

**Dev-only observability**: `NavigationDebugHud` (extended mode) shows `voice-guards: nav-blocked / advisory-held / advisory-spoken` from `getVoiceDevCounters()` — regressions that cause JS to speak during a native trip appear as non-zero `nav-blocked` without an advisory hold-off.

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
