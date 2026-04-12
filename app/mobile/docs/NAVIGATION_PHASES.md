# Mobile navigation architecture — phased roadmap

Layer 1 is React Navigation (tabs + stacks). Layer 2 is turn-by-turn / Mapbox (`useDriveNavigation`, `navSdkStore`, etc.). They are intentionally separate.

## Phase 1 (done)

- Rename custom hook: `useDriveNavigation` (was `useNavigation`).
- Rename tab-bar driving flag hook: `useNavigationMode` (was `useNavigatingState`).
- Add `src/navigation/types.ts` for param lists and composite navigation props.

## Phase 2 (next — optional)

**Coordinator + focus behavior** — implement only after **UX sign-off**:

- Introduce something like `useNavigationCoordinator()` to sync React Navigation focus (`useIsFocused` / `useFocusEffect`) with Mapbox SDK / `useDriveNavigation` lifecycle (pause, cleanup, or confirm exit).
- Replace or narrow the direct `useEffect` that mirrors `nav.isNavigating` → `useNavigationMode` if product rules require (e.g. allow leaving Map tab while navigating, “Exit navigation?” dialog).

## Phase 3 (later)

**Auth stack / guards refactor** — only if you need **logged-out deep links** into protected routes or a single navigable tree:

- Consider moving from conditional `MainTabs` vs `PublicStack` in `RootNavigator` to a guarded root stack + `CommonActions` / `reset` patterns.
- Requires a full QA matrix (OAuth, billing return, cold start, back button).

This sequence reduces naming collisions and type bugs without blocking feature work, and avoids a risky “rewrite everything” merge.
