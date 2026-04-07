import { useEffect, useRef } from 'react';
import * as Speech from 'expo-speech';
import { NavigationProgress } from '../navigation/navModel';
import { phraseForManeuverKind } from '../navigation/spokenManeuver';

type Args = {
  progress: NavigationProgress | null;
  enabled: boolean;
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

export function useNavigationSpeech({ progress, enabled }: Args) {
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

    Speech.stop();
    Speech.speak(phrase, {
      language: 'en-US',
      pitch: 1.0,
      rate: 0.96,
    });
    lastKey.current = key;
  }, [progress, enabled]);

  useEffect(() => {
    if (!enabled) lastKey.current = null;
  }, [enabled]);
}
