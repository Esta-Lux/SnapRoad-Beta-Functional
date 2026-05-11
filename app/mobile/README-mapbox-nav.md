# Mapbox Maps + native navigation (SnapRoad)

## Versions

- **Mapbox Maps iOS/Android** are pinned once in `app.config.ts` as `MAPBOX_MAPS_SDK_VERSION` (**11.11.0**).
- **`@rnmapbox/maps`** and **`@badatgil/expo-mapbox-navigation`** both use that constant so CocoaPods / Gradle resolve the same Maps line as the vendored iOS Navigation xcframeworks.

## Default: JS/RNMapbox navigation (launch path)

**Default behavior** (when `EXPO_PUBLIC_NAV_LOGIC_SDK` is unset or `"0"`): active navigation uses the **JavaScript** pipeline — Mapbox **Directions API**, `useDriveNavigation` / `useNavigationProgress`, RNMapbox route rendering, and expo-speech / JS voice. This is the launch path because it keeps SnapRoad's branded HUD in one debuggable engine and avoids hidden native-session churn.

Runtime flags are read in [`src/navigation/navFeatureFlags.ts`](src/navigation/navFeatureFlags.ts). If the same key exists in Expo dashboard and `eas.json`, **`eas.json` wins** on EAS Build (see `app.config.ts` comment).

This default path does **not** require a headless native navigation session.

## Optional: headless SDK experiment

Set **`EXPO_PUBLIC_NAV_LOGIC_SDK=1`** (e.g. in `.env`, EAS env, or Expo dashboard) to use a **headless** Mapbox Navigation session (off-screen `MapboxNavigationView` with `navigationLogicOnly`). Matched location, route progress, reroute, and native voice then come from the Navigation SDK while `@rnmapbox/maps` stays the on-screen map and custom turn UI subscribes to `navSdkStore` / `sdkBuiltNavigationProgress`.

The **`production`** profile in [`eas.json`](eas.json) sets **`EXPO_PUBLIC_NAV_LOGIC_SDK": "0"`** so TestFlight / store builds use the JS launch path unless you override.

**`EXPO_PUBLIC_NAV_NATIVE_SDK`**: production sets this to `"0"` for launch. Set it to `"1"` only for internal native SDK experiments; it should not control the launch HUD unless `EXPO_PUBLIC_NAV_LOGIC_SDK=1` or full-screen native navigation is explicitly enabled. Coordinate with `navFeatureFlags.ts` when experimenting.

Do **not** commit **`MAPBOX_DOWNLOADS_TOKEN`** or Mapbox **secret** tokens. Use EAS project env or local `.env` (gitignored).

## Clean native rebuild (local sanity check)

From **`app/mobile`**:

```bash
rm -rf ios android
npx expo prebuild
cd ios && pod install
```

Verify **`ios/Podfile`** has exactly one line:

- `ENV['ExpoNavigationMapboxMapsVersion'] = '11.11.0'`
- `$RNMapboxMapsVersion = '11.11.0'`

Verify **`ios/Podfile.lock`** resolves Mapbox Maps to **11.11.0** (and consistent `MapboxCommon` / `MapboxCoreMaps`):

```bash
grep -n "MapboxMaps (" ios/Podfile.lock
grep -n "MapboxCoreMaps (" ios/Podfile.lock
grep -n "MapboxCommon (" ios/Podfile.lock
```

## EAS / TestFlight

Do **not** commit generated **`ios/`** or **`android/`** (they stay in `.gitignore`). EAS runs **`expo prebuild`** on the worker.

From the **repository root** (uses `scripts/eas-build-mobile.mjs` and clears cache):

```bash
npm run eas:ios:production
```

For **App Store upload in one step**:

```bash
npm run eas:ios:production:submit
```

Use the **`production`** profile: it applies **`EXPO_PUBLIC_NAV_NATIVE_SDK=0`** with **`EXPO_PUBLIC_NAV_LOGIC_SDK=0`** so TestFlight / App Store builds use **JS/RNMapbox** navigation on the in-app map. Set **`EXPO_PUBLIC_NAV_NATIVE_SDK=1`** and **`EXPO_PUBLIC_NAV_LOGIC_SDK=1`** only for internal headless SDK experiments.

### Logic-SDK diagnostics HUD (EAS / release)

**`EXPO_PUBLIC_NAV_LOGIC_DEBUG`**: when `"1"`, the map shows the nav diagnostics HUD during active navigation. It is inlined at **JS bundle** time (`eas update` / Metro), so you can ship it via **OTA without a native rebuild**. Production builds and production OTA publishes now force this flag to **`0`** so the diagnostics HUD stays out of store releases by default. For a short-lived investigation, enable it only on a temporary non-production build or override it briefly before a targeted OTA, then turn it back off. The overlay lists env flags (LOGIC / NATIVE), resolved mode (`HEADLESS_LOGIC` vs `JS_GUIDANCE`), SDK trip phase, instruction source, native event counters, last voice pipeline, and progress age.

## Podfile ENV dedupe

`patches/@badatgil+expo-mapbox-navigation+1.6.2.patch` strips any existing `ENV['ExpoNavigationMapboxMapsVersion']` lines before re-injecting, so repeated prebuilds do not stack duplicate assignments.

## iOS `useFrameworks`

`app.config.ts` sets **`expo-build-properties` → `ios.useFrameworks: "static"`** (required for this CocoaPods graph). **`dynamic`** has broken **`@react-native-voice/voice`** (`RCTEventEmitter` / React-Core) during archive.

## Patches (read this before changing versions)

| Patch | Why |
|-------|-----|
| `patches/@rnmapbox+maps+10.3.0.patch` | **Compile:** MapboxMaps **11.11.0** lacks layer props that 10.3.0’s `RNMBXStyle.swift` sets (`fillPatternCrossFade`, `linePatternCrossFade`, `circleElevationReference`, `fillExtrusionPatternCrossFade`, `modelAllowDensityReduction`). Stubs no-op so EAS can compile; SnapRoad does not set these from JS. |
| `patches/@react-native-voice+voice+3.2.4.patch` | **Link:** `static_framework` + modular-header flags so `react-native-voice` links **React-Core** (`RCTEventEmitter`) under Expo static frameworks and avoids flaky ld auto-link on newer Xcode SDKs (`CoreAudioTypes` / `UIUtilities` warnings). |
| `patches/@badatgil+expo-mapbox-navigation+1.6.2.patch` | Dedupes `ExpoNavigationMapboxMapsVersion` in Podfile across prebuilds (+ existing SnapRoad native tweaks). |

**Dependency pins (no `^`):** `@rnmapbox/maps` and `@react-native-voice/voice` are exact versions in `package.json` so patches stay aligned.

## Preflight before `eas build` (iOS)

From **`app/mobile`** (requires Xcode + CocoaPods locally for `pod install`):

```bash
rm -rf ios
npx expo prebuild --platform ios --no-install
grep -c "ExpoNavigationMapboxMapsVersion" ios/Podfile   # expect 1
grep "RNMapboxMapsVersion" ios/Podfile                   # expect 11.11.0
cd ios && pod install
grep -n "MapboxMaps (" Podfile.lock
# Confirm MapboxMaps resolves to 11.11.0. Optional: open workspace and build once to catch native compile errors early.
```

EAS (from **repo root**):

```bash
npm run eas:ios:production
```
