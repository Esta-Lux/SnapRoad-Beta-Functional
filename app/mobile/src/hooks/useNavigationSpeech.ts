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

type Args = {
  progress: NavigationProgress | null;
  enabled: boolean;
  drivingMode: DrivingMode;
};

function buildUtterance(progress: NavigationProgress, metric: boolean): string | null {
  const step = progress.nextStep;
  if (!step || step.kind === 'arrive') return null;
  const d = progress.nextStepDistanceMeters;
  const distancePart = distanceClauseForTurnSpeech(d, metric);
  const street = step.streetName ? ` onto ${step.streetName}` : '';
  const instruction = step.instruction?.trim() || phraseForManeuverKind(step.kind);
  return `${distancePart}, ${instruction}${street}`;
}

export function useNavigationSpeech({ progress, enabled, drivingMode }: Args) {
  const lastKey = useRef<string | null>(null);
  const metric = useMemo(() => usesMetricForSpeech(), []);
  const localeTag = useMemo(() => speechLocaleTag(), []);

  useEffect(() => {
    if (!enabled || !progress?.nextStep) return;
    if (progress.nextStep.kind === 'arrive') return;
    if (isNavigationGuidanceSuppressed()) return;

    const d = progress.nextStepDistanceMeters;

    /** Extra early cue on multi-step legs (e.g. motorway before an exit). */
    const longLeg = progress.followingStep != null;
    const bucket =
      d <= 60
        ? 'final'
        : d <= 150
          ? 'near'
          : d <= 400
            ? 'prep'
            : longLeg && d >= 800 && d <= 1400
              ? 'early_prep'
              : null;
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
