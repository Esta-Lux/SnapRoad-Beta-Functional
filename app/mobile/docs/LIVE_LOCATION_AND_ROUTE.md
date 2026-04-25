# Route line, puck alignment, and live friend location

## Navigation route polyline (Mapbox)

- **`RouteOverlay`** draws the active route with either GPU `lineTrimOffset` (single full-route GeoJSON, no per-tick re-slice) or a legacy split when congestion shading is on or the traveled fraction is below `TRIM_OFFSET_MIN_FRACTION` (~`5e-4`). The low-fraction guard avoids an iOS Maps SDK quirk where `[0,0]` trim can hide the entire line right after **Navigate**.
- **Native headless SDK**: `fractionTraveled` for the trim must match the **arc-length ratio** `routeSplitSnap.cumulativeMeters / polylineLengthMeters` so the gray/colored seam sits where the geometry was split. MapScreen passes this as `routeOverlayFraction` (see `routeOverlayFraction` in `MapScreen.tsx`).
- **Minimal SDK adapter** (`navSdkMinimalAdapter.ts`): Map puck **lat/lng** use the point on the JS polyline at `fractionTraveled`, while **heading / speed / accuracy** still come from the native matched sample. That keeps the puck on the same line the overlay trims.

## Friend locations

- **REST**: `GET /api/friends/list` on an interval while the app is foregrounded and the user is Premium with friend tracking enabled — not only when the Map tab is focused — so switching tabs does not freeze friend markers until the next manual refresh.
- **Supabase realtime**: `postgres_changes` on `live_locations` still applies INSERT/UPDATE rows; on return to `active`, the channel is re-subscribed and **AppState** also triggers a REST refresh to cover websocket gaps.
- **Sharing your own location**: Interval and options are centralized in `friendLiveShareConfig.ts` (currently **2s** foreground + background publish cadence). `MapScreen` publishes `navDisplayCoord` / `displaySpeedMph` while navigating so friends see the same smoothed position as the puck; raw GPS when not navigating. **Background**: `friendLiveShareBackgroundTask` (`expo-task-manager` + `expo-location`, `Accuracy.High`, `timeInterval` + `distanceInterval` from config) posts while sharing is on and `syncFriendLiveShareBackgroundFromPolicy` agrees with server flags — **Dashboard** and **MapScreen** use the same rule as `canPublishFriendLocation` (Premium + `friend_tracking_enabled` + `live_location_publishing_enabled` + not `paused_by_admin`). MapScreen’s effect also calls `startFriendLiveShareBackgroundUpdates` when sharing is on. `snaproad_last_nav` in AsyncStorage mirrors `nav.isNavigating` for best-effort `is_navigating` on background posts. After enabling share from Map or Social, `nudgeBackgroundLocationAfterEnablingShare` (see `friendLocationPermissionUx.ts`) may prompt the user to choose **Always** in iOS Settings if background permission is still denied. iOS needs **Always** for updates while backgrounded; **When In Use** still gets foreground updates.
- **Viewer “LIVE” vs stale**: `FRIEND_LOC_STALE_MS` in `friendPresence.ts` (currently **5 minutes**) defines how old a friend’s `last_updated` can be while they still have sharing on before we show a stale/last-seen state instead of a live driving/parked badge.
- **Entry point**: `./index.ts` imports `./src/location/friendLiveShareBackgroundTask` so `TaskManager.defineTask` runs at startup.

## Tests

- `src/navigation/navRouteArcPosition.unit.test.ts` — arc-length puck / trim invariants (pure `distance` helpers; avoids pulling `navSdkProgressAdapter` into Node so `tsx` tests stay green).

**Stable smoke matrix (native nav + share plumbing, no full `npm test` RN graph):** from `app/mobile`, run `npm run test:smoke` — navigation `*.smoke.test.ts`, arc position, and `locationSharing.unit.test.ts`. Device QA still covers headless SDK pass-through and `expo-location` background share (permissions, OS throttling).

**Friends (viewer):** `useFocusEffect` refreshes `/api/friends/list` when the Map tab gains focus; polling is ~12s while Map is focused and ~45s otherwise; Supabase updates merge with `String(id)` equality and trigger a full list refresh if the row’s user id was not yet in the list (INSERT / id mismatch).

**Navigate to friend:** Tapping a friend and choosing *Navigate* starts a route to their coordinates at that moment. If their share is **fresh** (see `isLiveShareFresh` in `friendPresence.ts`), a **friend follow session** keeps the destination in sync: while you’re navigating, if their live point moves enough (`friendFollowConfig` thresholds) and the share is still fresh, the app updates the route (SDK: `updateNavigationDestination` + native reroute; JS: `fetchDirections`). It is not a single “frozen” last-known point for the whole trip when live; stale/off share stops the mid-trip follow updates. Large jumps (e.g. bad prior sample) can reroute a bit sooner than the default interval; see `friendFollowConfig.ts`.

**Nav chevron:** `navPuckHeading` blends SDK course with `tangentBearingAlongPolyline` at the current arc length so the arrow follows the drawn route, not device compass when panning the map. `NavSdkPuck` predictive lead-ahead is disabled (`PREDICTIVE_MS = 0`) to reduce “floating” ahead of the snapped point.

**POIs:** Offers, traffic-safety zones, cameras, incidents, and photo reports use `poiSearchCoord` (snapped nav position while navigating, else GPS) so markers stay populated along the corridor during trips.
