/**
 * Orion turn-by-turn script engine — one personality layer per maneuver.
 *
 * Advance / preparatory cues: optional Orion wrapper + clear instruction.
 * Imminent cues: instruction only (no repeated jokes or sass).
 */
import type { DrivingMode } from '../types';
import type { ManeuverKind } from './navModel';
import { hudPhraseForManeuverKind } from './spokenManeuver';
import { orionCompanionV1Enabled } from '../orion/companion/orionCompanionFlags';

export type OrionTurnCueBucket = 'preparatory' | 'advance' | 'imminent';

export type OrionTurnCueContext = {
  bucket: OrionTurnCueBucket;
  instruction: string;
  seed: string;
  kind?: ManeuverKind | null;
  userName?: string | null;
  drivingMode?: DrivingMode;
};

function cleanSentence(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t) return '';
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

function firstName(userName?: string | null): string {
  const name = (userName ?? '').trim().split(/\s+/)[0] ?? '';
  return name.length > 0 && name.length <= 16 ? name : '';
}

function deterministicIndex(seed: string, length: number): number {
  if (length <= 1) return 0;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % length;
}

export function orionNavBuddyEnabled(): boolean {
  if (orionCompanionV1Enabled()) return false;
  const raw = String(process.env.EXPO_PUBLIC_ORION_NAV_BUDDY ?? '1').trim().toLowerCase();
  return raw !== '0' && raw !== 'false' && raw !== 'off';
}

/** Personality wrapper once per turn — advance / preparatory only. */
function orionPersonalityWrapper(ctx: OrionTurnCueContext): string {
  const name = firstName(ctx.userName);
  const tag = name ? `, ${name}` : '';
  const sport = ctx.drivingMode === 'sport';
  const calm = ctx.drivingMode === 'calm';

  const advance = [
    `Clean setup${tag}. Let's not give this turn a villain arc.`,
    'I have one job, and it is aggressively pointing at this turn.',
    'Road drama avoided. Beautiful little plot twist.',
    'This is the turn we want. I checked with the tiny robot council.',
    'Heads up — main character lane coming up.',
    'Tiny road win loading. Collecting those like gems.',
  ];

  const preparatory = [
    `Stay with me on this one${tag}.`,
    'No sequel to the missed-exit saga today.',
    'This is the one we want. Plot twist: we take it.',
    'Smooth line, no drama. My favorite genre.',
  ];

  let pool = ctx.bucket === 'preparatory' ? preparatory : advance;
  if (sport) {
    pool = [...pool, 'Sport mode approves. Responsibly, obviously.', 'Crisp move. Very premium, very legal.'];
  } else if (calm) {
    pool = [...pool, 'Calm mode: smooth like butter, but with seatbelts.', 'Easy does it. The road loves emotional maturity.'];
  }

  return pool[deterministicIndex(`${ctx.seed}:${ctx.bucket}`, pool.length)] ?? '';
}

/** Short imminent instruction from maneuver kind (matches turn card phrasing). */
export function imminentInstructionFromKind(kind?: ManeuverKind | null, fallbackText?: string): string {
  if (kind && kind !== 'unknown') {
    return cleanSentence(hudPhraseForManeuverKind(kind));
  }
  const base = cleanSentence(fallbackText ?? '');
  if (!base) return '';
  return base
    .replace(/^in\s+[\d.]+\s+(feet|foot|meters|metres|miles|mi|km|kilometers|kilometres),?\s+/i, '')
    .replace(/^[\d.]+\s+(feet|foot|meters|metres|miles|mi|km|kilometers|kilometres),?\s+/i, '')
    .trim();
}

/**
 * Compose the single Orion turn cue for this bucket.
 * Imminent returns instruction-only; advance/preparatory may prepend personality once.
 */
export function composeOrionTurnCue(ctx: OrionTurnCueContext): string {
  if (ctx.bucket === 'imminent') {
    const core = imminentInstructionFromKind(ctx.kind, ctx.instruction);
    return core || cleanSentence(ctx.instruction);
  }

  const instruction = cleanSentence(ctx.instruction);
  if (!instruction) return '';

  if (!orionNavBuddyEnabled()) return instruction;

  const wrapper = orionPersonalityWrapper(ctx);
  if (!wrapper) return instruction;
  return `${wrapper} ${instruction}`;
}
