import type { ManeuverKind } from './navModel';
import { hudPhraseForManeuverKind } from './spokenManeuver';

export type NavigationVoiceCueBucket = 'advance' | 'imminent';

export const NAV_VOICE_ADVANCE_MAX_M = 322; // 0.2 mi
export const NAV_VOICE_IMMINENT_MAX_M = 88;

function firstName(userName?: string | null): string {
  const name = (userName ?? '').trim().split(/\s+/)[0] ?? '';
  return name.length > 0 && name.length <= 16 ? name : '';
}

function cleanSentence(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t) return '';
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

function deterministicIndex(seed: string, length: number): number {
  if (length <= 1) return 0;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % length;
}

function orionTail(seed: string, bucket: NavigationVoiceCueBucket, userName?: string | null): string {
  const name = firstName(userName);
  const tag = name ? `, ${name}` : '';
  const advance = [
    `Clean setup${tag}. Let's not give this turn a villain arc.`,
    'I have one job, and it is aggressively pointing at this turn.',
    'Road drama avoided. Beautiful little plot twist.',
    'This is the turn we want. I checked with the tiny robot council.',
  ];
  const imminent = [
    `Don't miss it now${tag}. The road is not doing refunds.`,
    "Don't miss it now. I already did the paperwork emotionally.",
    'Right here. Blink responsibly.',
    'This is the one. Main character lane, please.',
  ];
  const pool = bucket === 'imminent' ? imminent : advance;
  return pool[deterministicIndex(`${seed}:${bucket}`, pool.length)] ?? '';
}

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

export function formatSdkNavigationVoiceCue(args: {
  text: string;
  bucket: NavigationVoiceCueBucket;
  kind?: ManeuverKind | null;
  seed: string;
  userName?: string | null;
}): string {
  const base = cleanSentence(args.text);
  if (!base) return '';
  const tail = orionTail(args.seed, args.bucket, args.userName);
  if (args.bucket === 'advance') {
    return tail ? `${base} ${tail}` : base;
  }

  const kindPhrase =
    args.kind && args.kind !== 'unknown'
      ? cleanSentence(hudPhraseForManeuverKind(args.kind))
      : base;
  return tail ? `${kindPhrase} ${tail}` : kindPhrase;
}
