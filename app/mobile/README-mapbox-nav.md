# Mapbox Maps + native navigation (SnapRoad)

## Versions

- **Mapbox Maps iOS/Android** are pinned once in `app.config.ts` as `MAPBOX_MAPS_SDK_VERSION` (**11.11.0**).
- **`@rnmapbox/maps`** and **`@badatgil/expo-mapbox-navigation`** both use that constant so CocoaPods / Gradle resolve the same Maps line as the vendored iOS Navigation xcframeworks.

## Production: native Mapbox Navigation SDK

Set in **`eas.json`** → `build.production.env` → **`EXPO_PUBLIC_NAV_NATIVE_SDK": "1"`** (already in repo).  
Runtime flag is read in `src/navigation/navFeatureFlags.ts`.

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

Use the **`production`** profile so `EXPO_PUBLIC_NAV_NATIVE_SDK=1` is applied.

## Podfile ENV dedupe

`patches/@badatgil+expo-mapbox-navigation+1.6.2.patch` strips any existing `ENV['ExpoNavigationMapboxMapsVersion']` lines before re-injecting, so repeated prebuilds do not stack duplicate assignments.
