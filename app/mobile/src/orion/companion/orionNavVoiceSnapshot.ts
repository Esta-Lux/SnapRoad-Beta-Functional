import { isNavigationGuidanceSuppressed } from '../../navigation/navigationGuidanceMemory';
import { msSinceLastSdkVoice } from '../../navigation/navSdkStore';
import { navigationVoiceCueBucket } from '../../navigation/navVoiceCuePolicy';
import { ADVISORY_SDK_HOLDOFF_MS } from './constants';
import type { NavVoiceState } from './types';

export function buildOrionNavVoiceSnapshot(
  nextStepDistanceMeters?: number | null,
): NavVoiceState {
  const bucket = navigationVoiceCueBucket(nextStepDistanceMeters ?? null);
  const withinTurnVoiceWindow = bucket === 'advance' || bucket === 'imminent';

  return {
    guidanceSuppressed: isNavigationGuidanceSuppressed(),
    msSinceLastSdkVoice: msSinceLastSdkVoice(),
    advisorySdkHoldoffMs: ADVISORY_SDK_HOLDOFF_MS,
    imminentManeuver: withinTurnVoiceWindow,
    withinTurnVoiceWindow,
  };
}
