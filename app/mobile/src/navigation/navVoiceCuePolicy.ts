import type { ManeuverKind } from './navModel';
import {
  composeOrionTurnCue,
  imminentInstructionFromKind,
  type OrionTurnCueBucket,
} from './orionNavScript';

export type NavigationVoiceCueBucket = 'advance' | 'imminent';

export const NAV_VOICE_ADVANCE_MAX_M = 322; // 0.2 mi
export const NAV_VOICE_IMMINENT_MAX_M = 88;

export function navigationVoiceCueBucket(distanceMeters?: number | null): NavigationVoiceCueBucket | null {
  if (typeof distanceMeters !== 'number' || !Number.isFinite(distanceMeters) || distanceMeters < 0) {
    return null;
  }
  if (distanceMeters <= NAV_VOICE_IMMINENT_MAX_M) return 'imminent';
  if (distanceMeters <= NAV_VOICE_ADVANCE_MAX_M) return 'advance';
  return null;
}

export function navigationVoiceCueKey(args: {
  legIndex?: number | null;
  stepIndex?: number | null;
  bucket: NavigationVoiceCueBucket;
}): string {
  return [
    args.legIndex ?? 0,
    args.stepIndex ?? 0,
    args.bucket,
  ].join('|');
}

/** SDK native text → single Orion turn cue (personality once on advance; imminent is clean). */
export function formatSdkNavigationVoiceCue(args: {
  text: string;
  bucket: NavigationVoiceCueBucket;
  kind?: ManeuverKind | null;
  seed: string;
  userName?: string | null;
}): string {
  const bucket: OrionTurnCueBucket = args.bucket;
  const instruction =
    args.bucket === 'imminent'
      ? imminentInstructionFromKind(args.kind, args.text)
      : args.text.trim();

  return composeOrionTurnCue({
    bucket,
    instruction,
    seed: args.seed,
    kind: args.kind,
    userName: args.userName,
  });
}
