import { navLogicSdkEnabled } from './navFeatureFlags';
import { getNavSdkState } from './navSdkStore';

/**
 * Whether the **native** Mapbox Navigation session has produced authoritative progress (voice/TTS rate,
 * duplicate suppression). Used by `voice.ts` and guidance memory — not a substitute for
 * `useDriveNavigation`’s `navigationProgress` (that comes from `navSdkStore` via `getSdkNavigationProgress`).
 *
 * - `sdkGuidancePhase === 'active'`: native `onRouteProgressChanged` is firing — SDK owns maneuver truth.
 * - Before that, UI may show waiting state from `getSdkWaitingNavigationProgress` in `useDriveNavigation`.
 */
export function isSdkTripAuthoritative(): boolean {
  if (!navLogicSdkEnabled()) return false;
  return getNavSdkState().sdkGuidancePhase === 'active';
}

/**
 * Whether the native SDK owns the **user puck** right now.
 *
 * True iff the trip is authoritative AND a matched `onNavigationLocationUpdate`
 * payload has landed. When true, the JS `LocationPuck` (which reads raw device GPS)
 * must be hidden and the puck rendered from `navSdkStore.location` — otherwise the
 * two location sources visibly fight (raw GPS jumps, matched location snaps to road).
 */
export function isSdkPuckAuthoritative(): boolean {
  if (!isSdkTripAuthoritative()) return false;
  return getNavSdkState().location != null;
}

/**
 * Whether the native SDK owns the **route polyline** right now.
 *
 * True iff the trip is authoritative AND native route geometry has been ingested
 * via `onRoutesLoaded` / `onRouteChanged`. When true, the map must render the
 * SDK-sourced polyline and **must not** fall back to the JS-Directions polyline
 * in `navigationData.polyline` (which is pre-trip preview geometry and will not
 * reflect native reroutes).
 */
export function isSdkRouteAuthoritative(): boolean {
  if (!isSdkTripAuthoritative()) return false;
  return getNavSdkState().routePolyline.length >= 2;
}

/**
 * Whether the turn-by-turn banner should be driven entirely by native text.
 *
 * True iff the trip is authoritative AND at least one progress tick has arrived
 * carrying native banner copy (primary / current step instruction). When true,
 * the JS adapter must prefer native text over REST-derived `NavStep.displayInstruction`
 * for primary + secondary copy. REST is still used as a structural fallback
 * (signal / lanes / shields) when the rows match.
 */
export function isSdkBannerAuthoritative(): boolean {
  if (!isSdkTripAuthoritative()) return false;
  const p = getNavSdkState().progress;
  if (!p) return false;
  const hasText =
    (p.primaryInstruction && p.primaryInstruction.trim().length > 0) ||
    (p.currentStepInstruction && p.currentStepInstruction.trim().length > 0);
  return Boolean(hasText);
}
