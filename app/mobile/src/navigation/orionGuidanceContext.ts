import type { DirectionsStep } from '../lib/directions';
import type { NavigationProgress } from './navModel';
import { NAV_VOICE_ADVANCE_MAX_M } from './navVoiceCuePolicy';

export type OrionGuidanceRouteSnapshot = {
  currentRoad: string;
  nextManeuver: string;
  nextStepDistanceMeters: number | null;
  guidanceInstructionSource: 'sdk' | 'sdk_waiting' | 'js' | 'unknown';
  guidanceStepIdentity: string | null;
  criticalTurnTransition: boolean;
};

function cleanText(value?: string | null): string {
  return value?.replace(/\s+/g, ' ').trim() ?? '';
}

function finiteDistance(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function stepInstruction(step?: DirectionsStep | null): string {
  return cleanText(step?.instruction);
}

function navStepInstruction(step: NavigationProgress['nextStep'] | undefined): string {
  return cleanText(step?.displayInstruction || step?.instruction || step?.streetName);
}

function identityFromProgress(progress: NavigationProgress): string | null {
  const native = progress.nativeStepIdentity;
  if (native) return `${native.legIndex}:${native.stepIndex}`;
  const idx = progress.nextStep?.index;
  return typeof idx === 'number' && Number.isFinite(idx) ? `0:${idx}` : null;
}

export function buildOrionGuidanceRouteSnapshot(args: {
  progress?: NavigationProgress | null;
  fallbackSteps?: DirectionsStep[] | null;
  currentStepIndex?: number | null;
  previousGuidanceStepIdentity?: string | null;
  nativeVoiceRecent?: boolean;
  turnCardState?: 'preview' | 'active' | 'confirm' | 'cruise' | null;
}): OrionGuidanceRouteSnapshot {
  const {
    progress,
    fallbackSteps,
    currentStepIndex = 0,
    previousGuidanceStepIdentity = null,
    nativeVoiceRecent = false,
    turnCardState = null,
  } = args;
  const source = progress?.instructionSource ?? 'unknown';
  const distance = finiteDistance(progress?.nextStepDistanceMeters);
  const guidanceStepIdentity = progress ? identityFromProgress(progress) : null;
  const stepJustChanged =
    !!guidanceStepIdentity &&
    !!previousGuidanceStepIdentity &&
    guidanceStepIdentity !== previousGuidanceStepIdentity;

  if (source === 'sdk') {
    const primary = cleanText(progress?.banner?.primaryInstruction) || navStepInstruction(progress?.nextStep);
    const secondary =
      cleanText(progress?.banner?.secondaryInstruction) ||
      navStepInstruction(progress?.followingStep) ||
      cleanText(progress?.nextStep?.nextManeuverStreet);
    return {
      currentRoad: primary,
      nextManeuver: secondary,
      nextStepDistanceMeters: distance,
      guidanceInstructionSource: 'sdk',
      guidanceStepIdentity,
      criticalTurnTransition:
        stepJustChanged ||
        nativeVoiceRecent ||
        turnCardState === 'active' ||
        turnCardState === 'confirm' ||
        (distance != null && distance <= NAV_VOICE_ADVANCE_MAX_M),
    };
  }

  const idx = Math.max(0, Number.isFinite(currentStepIndex ?? NaN) ? Number(currentStepIndex) : 0);
  const currentStep = fallbackSteps?.[idx] ?? null;
  const nextStep = fallbackSteps?.[idx + 1] ?? null;
  const fallbackDistance =
    source === 'sdk_waiting'
      ? finiteDistance(nextStep?.distanceMeters)
      : distance ?? finiteDistance(nextStep?.distanceMeters);

  return {
    currentRoad: stepInstruction(currentStep),
    nextManeuver: stepInstruction(nextStep),
    nextStepDistanceMeters: fallbackDistance,
    guidanceInstructionSource: source === 'sdk_waiting' || source === 'js' ? source : 'unknown',
    guidanceStepIdentity,
    criticalTurnTransition:
      stepJustChanged ||
      nativeVoiceRecent ||
      turnCardState === 'active' ||
      turnCardState === 'confirm' ||
      (fallbackDistance != null && fallbackDistance <= NAV_VOICE_ADVANCE_MAX_M),
  };
}
