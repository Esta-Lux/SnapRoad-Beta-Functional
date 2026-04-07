import { useEffect, useRef } from 'react';
import type { DrivingMode } from '../types';
import { speakGuidance } from '../utils/voice';
import { NavigationProgress } from '../navigation/navModel';
import { phraseForManeuverKind } from '../navigation/spokenManeuver';
import { setLastTurnByTurnPhrase } from '../navigation/navigationGuidanceMemory';

type Args = {
  progress: NavigationProgress | null;
  enabled: boolean;
  drivingMode: DrivingMode;
};

function buildUtterance(progress: NavigationProgress): string | null {
  const step = progress.nextStep;
  if (!step) return null;
  const d = progress.nextStepDistanceMeters;
  const feet = Math.round(d * 3.28084);
  const distancePart =
    feet >= 1000 ? `In ${Math.round(feet / 5280)} miles` : `In ${feet} feet`;
  const street = step.streetName ? ` onto ${step.streetName}` : '';
  const instruction = step.instruction?.trim() || phraseForManeuverKind(step.kind);
  return `${distancePart}, ${instruction}${street}`;
}

export function useNavigationSpeech({ progress, enabled, drivingMode }: Args) {
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !progress?.nextStep) return;
    const d = progress.nextStepDistanceMeters;
    const bucket = d <= 60 ? 'final' : d <= 150 ? 'near' : d <= 400 ? 'prep' : null;
    if (!bucket) return;

    const key = `${progress.nextStep.index}:${bucket}`;
    if (lastKey.current === key) return;

    const phrase = buildUtterance(progress);
    if (!phrase) return;

    setLastTurnByTurnPhrase(phrase);
    speakGuidance(phrase, drivingMode);
    lastKey.current = key;
  }, [progress, enabled, drivingMode]);

  useEffect(() => {
    if (!enabled) {
      lastKey.current = null;
      setLastTurnByTurnPhrase(null);
    }
  }, [enabled]);
}
