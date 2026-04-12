# Mobile navigation architecture — phased roadmap

Layer 1 is React Navigation (tabs + stacks). Layer 2 is turn-by-turn / Mapbox (`useDriveNavigation`, `navSdkStore`, etc.). They are intentionally separate.

## Phase 1 (done)

- Rename custom hook: `useDriveNavigation` (was `useNavigation`).
- Rename tab-bar driving flag hook: `useNavigationMode` (was `useNavigatingState`).
- Add `src/navigation/types.ts` for param lists and composite navigation props.

## Phase 1b — SDK vs JS single engine (ongoing)

**Default (since 2026):** `EXPO_PUBLIC_NAV_LOGIC_SDK` defaults to **off** in [`navFeatureFlags.ts`](../src/navigation/navFeatureFlags.ts) and in [`eas.json`](../eas.json) production env. Production uses the **JavaScript** Directions + `useNavigationProgress` pipeline unless you set `EXPO_PUBLIC_NAV_LOGIC_SDK=1`.

While navigating with a route on the map, the user position is drawn as a **GPU `SymbolLayer`** arrow ([`NavigationUserSymbolLayers.tsx`](../src/components/map/NavigationUserSymbolLayers.tsx)) above the route line; `LocationPuck` is hidden for that case. If the route is temporarily missing, the puck remains visible.

Opt-in headless SDK path when `EXPO_PUBLIC_NAV_LOGIC_SDK=1`:

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
