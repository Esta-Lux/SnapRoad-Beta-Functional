import { isNavigationGuidanceSuppressed } from '../../navigation/navigationGuidanceMemory';
import { msSinceLastSdkVoice } from '../../navigation/navSdkStore';
import { navigationVoiceCueBucket } from '../../navigation/navVoiceCuePolicy';
import { ADVISORY_SDK_HOLDOFF_MS, NAV_VOICE_IMMINENT_MAX_M } from './constants';
import type { NavVoiceState } from './types';

export function buildOrionNavVoiceSnapshot(
  nextStepDistanceMeters?: number | null,
): NavVoiceState {
  const bucket = navigationVoiceCueBucket(nextStepDistanceMeters ?? null);
  const imminent =
    bucket === 'imminent' ||
    (typeof nextStepDistanceMeters === 'number' &&
      Number.isFinite(nextStepDistanceMeters) &&
      nextStepDistanceMeters <= NAV_VOICE_IMMINENT_MAX_M);

  return {
    guidanceSuppressed: isNavigationGuidanceSuppressed(),
    msSinceLastSdkVoice: msSinceLastSdkVoice(),
    advisorySdkHoldoffMs: ADVISORY_SDK_HOLDOFF_MS,
    imminentManeuver: imminent,
  };
}
