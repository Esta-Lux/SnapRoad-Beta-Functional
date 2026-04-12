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
