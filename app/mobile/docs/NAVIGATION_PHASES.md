# Mobile navigation architecture — phased roadmap

Layer 1 is React Navigation (tabs + stacks). Layer 2 is turn-by-turn / Mapbox (`useDriveNavigation`, `navSdkStore`, etc.). They are intentionally separate.

## Phase 1 (done)

- Rename custom hook: `useDriveNavigation` (was `useNavigation`).
- Rename tab-bar driving flag hook: `useNavigationMode` (was `useNavigatingState`).
- Add `src/navigation/types.ts` for param lists and composite navigation props.

## Phase 1b — SDK vs JS single engine (ongoing)

**Default:** `EXPO_PUBLIC_NAV_LOGIC_SDK` defaults to **on** in [`navFeatureFlags.ts`](../src/navigation/navFeatureFlags.ts) and **`eas.json`** production env. Active trips use the **headless Mapbox Navigation SDK** for matched location, progress, reroute, and native voice; RN map + turn UI **subscribe** to `navSdkStore` / `sdkBuiltNavigationProgress`. Set **`EXPO_PUBLIC_NAV_LOGIC_SDK=0`** for **JavaScript-only** Directions + `useNavigationProgress` (e.g. Expo Go, A/B tests).

During navigation, user position is the native **`LocationPuck`**: Android uses **`gps`** render mode for a clear navigation arrow while a trip is active; iOS uses the default puck with `puckBearing` from `CustomLocationProvider` / fused heading. A subtle **accuracy pulse** (route-colored) runs while navigating. `navDisplayCoord` / SDK matched location still drive map follow and turn UI when logic SDK is on.

Headless SDK path (default when logic SDK on):

- Hidden `MapboxNavigationView` (`navigationLogicOnly`) feeds `navSdkStore` (`ingestSdkProgress`, `ingestSdkLocation`, …).
- `useDriveNavigation` selects **`sdkBuiltNavigationProgress`** over JS `useNavigationProgress` while `sdkActive`.
- JS **off-route reroute**, **traffic refresh** intervals, and **JS arrival auto-end** are skipped when `navSdkHeadless` — SDK handles reroute/arrival (`onRouteChanged`, `onFinalDestinationArrival`).
- `MapScreen` uses **`CustomLocationProvider`** with `nav.sdkNavLocation` when the SDK has matched fixes.
- Expensive **`buildNavStepsFromDirections`** / edge ETA resolution are skipped during active SDK trips where they are unused.

See module comment at top of `src/hooks/useDriveNavigation.ts` and `src/navigation/navSdkAuthority.ts`.

## Phase 2 (next — optional)

**Coordinator + focus behavior** — implement only after **UX sign-off**:

- Introduce something like `useNavigationCoordinator()` to sync React Navigation focus (`useIsFocused` / `useFocusEffect`) with Mapbox SDK / `useDriveNavigation` lifecycle (pause, cleanup, or confirm exit).
- Replace or narrow the direct `useEffect` that mirrors `nav.isNavigating` → `useNavigationMode` if product rules require (e.g. allow leaving Map tab while navigating, “Exit navigation?” dialog).

## Phase 3 (later)

**Auth stack / guards refactor** — only if you need **logged-out deep links** into protected routes or a single navigable tree:

- Consider moving from conditional `MainTabs` vs `PublicStack` in `RootNavigator` to a guarded root stack + `CommonActions` / `reset` patterns.
- Requires a full QA matrix (OAuth, billing return, cold start, back button).

This sequence reduces naming collisions and type bugs without blocking feature work, and avoids a risky “rewrite everything” merge.
