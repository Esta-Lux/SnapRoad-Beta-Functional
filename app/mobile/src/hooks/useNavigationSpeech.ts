import { useEffect, useMemo, useRef } from 'react';
import type { DrivingMode } from '../types';
import { speakGuidance } from '../utils/voice';
import { NavigationProgress } from '../navigation/navModel';
import { phraseForManeuverKind } from '../navigation/spokenManeuver';
import {
  setLastTurnByTurnPhrase,
  isNavigationGuidanceSuppressed,
} from '../navigation/navigationGuidanceMemory';
import {
  distanceClauseForTurnSpeech,
  speechLocaleTag,
  usesMetricForSpeech,
} from '../utils/distanceSpeech';
import { navLogicSdkEnabled } from '../navigation/navFeatureFlags';

type Args = {
  progress: NavigationProgress | null;
  enabled: boolean;
  drivingMode: DrivingMode;
};

/**
 * Two spoken cues per maneuver: farther (~≤400m) and imminent (≤95m).
 * Avoids stacking 3–4 distance buckets on every turn.
 */
const ADVANCE_MAX_M = 400;
const ADVANCE_MIN_M = 95;
const IMMINENT_M = 95;

function buildUtterance(progress: NavigationProgress, metric: boolean): string | null {
  const step = progress.nextStep;
  if (!step || step.kind === 'arrive') return null;
  const d = progress.nextStepDistanceMeters;
  const distancePart = distanceClauseForTurnSpeech(d, metric);
  const line =
    step.displayInstruction?.trim() ||
    step.instruction?.trim() ||
    phraseForManeuverKind(step.kind);
  const usedGenericPhrase =
    !step.displayInstruction?.trim() && !step.instruction?.trim();
  const street =
    usedGenericPhrase && step.streetName?.trim()
      ? ` onto ${step.streetName.trim()}`
      : '';
  return `${distancePart}, ${line}${street}`;
}

export function useNavigationSpeech({ progress, enabled, drivingMode }: Args) {
  const lastKey = useRef<string | null>(null);
  const metric = useMemo(() => usesMetricForSpeech(), []);
  const localeTag = useMemo(() => speechLocaleTag(), []);

  useEffect(() => {
    if (navLogicSdkEnabled()) return;
    if (!enabled || !progress?.nextStep) return;
    if (progress.nextStep.kind === 'arrive') return;
    if (isNavigationGuidanceSuppressed()) return;

    const d = progress.nextStepDistanceMeters;

    let bucket: 'advance' | 'imminent' | null = null;
    if (d <= IMMINENT_M) bucket = 'imminent';
    else if (d <= ADVANCE_MAX_M && d > ADVANCE_MIN_M) bucket = 'advance';

    if (!bucket) return;

    const key = `${progress.nextStep.index}:${bucket}`;
    if (lastKey.current === key) return;

    const phrase = buildUtterance(progress, metric);
    if (!phrase) return;

    setLastTurnByTurnPhrase(phrase);
    speakGuidance(phrase, drivingMode, localeTag);
    lastKey.current = key;
  }, [progress, enabled, drivingMode, metric, localeTag]);

  useEffect(() => {
    if (!enabled) {
      lastKey.current = null;
      setLastTurnByTurnPhrase(null);
    }
  }, [enabled]);
}
