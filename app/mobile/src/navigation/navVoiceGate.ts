import { navLogicSdkEnabled } from './navFeatureFlags';

/**
 * While a headless Mapbox Navigation trip is active, turn-by-turn must be SDK voice only.
 * Updated from {@link useNavigation} — do not import that hook here.
 */
let logicSdkTripActive = false;

export function setNavLogicSdkTripActive(active: boolean) {
  logicSdkTripActive = active;
}

/** True when Logic SDK nav is active and env flag is on — suppress JS turn guidance only. */
export function shouldSuppressJsTurnGuidance(): boolean {
  return logicSdkTripActive && navLogicSdkEnabled();
}
