import { navLogicSdkEnabled } from './navFeatureFlags';
import { getNavSdkState } from './navSdkStore';

/**
 * Native Mapbox Navigation SDK owns turn-by-turn truth: progress events have started
 * (`sdkGuidancePhase === 'active'`). Until then UI shows "Starting navigation…".
 */
export function isSdkTripAuthoritative(): boolean {
  if (!navLogicSdkEnabled()) return false;
  return getNavSdkState().sdkGuidancePhase === 'active';
}
