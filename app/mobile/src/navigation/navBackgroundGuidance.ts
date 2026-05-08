import type { NavigationProgress } from './navModel';
import { formatImperialManeuverDistance } from './turnCardModel';

export const NAV_BACKGROUND_TURN_THRESHOLD_M = 260;

export type BackgroundTurnNotificationContent = {
  title: string;
  body: string;
  distanceMeters: number;
  guidanceKey: string;
};

function cleanInstruction(text?: string | null): string {
  const t = String(text ?? '').replace(/\s+/g, ' ').trim();
  return t || 'Continue on route';
}

export function backgroundTurnGuidanceKey(progress: NavigationProgress | null | undefined): string | null {
  if (!progress) return null;
  const stepIndex = progress.nextStep?.index ?? progress.nativeStepIdentity?.stepIndex;
  const legIndex = progress.nativeStepIdentity?.legIndex ?? 0;
  const primary = cleanInstruction(progress.banner?.primaryInstruction ?? progress.nextStep?.instruction);
  return `${legIndex}:${stepIndex ?? primary}:${primary}`;
}

export function buildBackgroundTurnNotificationContent(
  progress: NavigationProgress | null | undefined,
  thresholdM = NAV_BACKGROUND_TURN_THRESHOLD_M,
): BackgroundTurnNotificationContent | null {
  if (!progress) return null;
  const distanceMeters = progress.nextStepDistanceMeters;
  if (!Number.isFinite(distanceMeters) || distanceMeters < 0 || distanceMeters > thresholdM) return null;

  const primary = cleanInstruction(progress.banner?.primaryInstruction ?? progress.nextStep?.instruction);
  const secondary = cleanInstruction(progress.banner?.secondaryInstruction ?? null);
  const dist = formatImperialManeuverDistance(distanceMeters, { omitNowLabel: true });
  const distanceText = dist.value ? `${dist.value}${dist.unit ? ` ${dist.unit}` : ''}` : 'Now';
  const guidanceKey = backgroundTurnGuidanceKey(progress);
  if (!guidanceKey) return null;

  return {
    title: `SnapRoad turn · ${distanceText}`,
    body: secondary === 'Continue on route' ? primary : `${primary}. ${secondary}`,
    distanceMeters,
    guidanceKey,
  };
}
