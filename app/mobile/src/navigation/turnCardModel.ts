import type { DrivingMode } from '../types';
import type { DirectionsStep } from '../lib/directions';
import type { ManeuverKind, NavStep } from './navModel';
import { getTurnCardNavTuning, previewDistanceMaxMeters } from './navModeProfile';
import { navManeuverFieldsFromDirectionsStep } from './navStepsFromDirections';

export type TurnCardState = 'preview' | 'active' | 'confirm' | 'cruise';

const FT_PER_M = 3.28084;
const M_PER_MI = 1609.344;
/**
 * Sub-second / static fallback when no speed is passed. Prefer
 * {@link maneuverNowThresholdMeters} for headless-SDK with live mph.
 */
const NOW_MANEUVER_METERS = 7;
/** Below this, show a dash (no false “0 ft”). */
const DIST_DASH_MAX_M = 0.5;

/**
 * “Now” replaces digits when within this *along-route* distance. Native voice
 * triggers earlier at highway speeds; a wider band keeps the label from
 * fighting Mapbox TTS.
 */
export function maneuverNowThresholdMeters(speedMph: number): number {
  if (!Number.isFinite(speedMph) || speedMph < 0) {
    return 10;
  }
  const mph = Math.min(speedMph, 88);
  return Math.min(30, Math.max(9, 7.5 + 0.2 * mph));
}

export type FormatManeuverDistanceOptions = {
  /** When set, drives speed-aware “Now” (see {@link maneuverNowThresholdMeters}). */
  speedMphForNow?: number;
  /** When set, overrides everything including {@link speedMphForNow}. */
  nowMetersOverride?: number;
};

/** Adaptive-mode default (~236 ft). Prefer {@link getTurnCardNavTuning} for mode-specific values. */
export const ACTIVE_MANEUVER_METERS = 72;

/**
 * Preview distance multiplier when heavy/severe congestion is detected near the
 * next maneuver. In congested traffic the driver approaches slowly and needs
 * more time to read the instruction, so we show the card 25% earlier.
 */
const CONGESTION_PREVIEW_BOOST = 1.25;

export { previewDistanceMaxMeters };

/**
 * US-style distance to the **next** maneuver, from authoritative meters
 * (banner / next-step) — not bridge locale strings, which can disagree with
 * along-route length.
 *
 * - ≥0.1 mi: miles (tenths under 10 mi, whole miles for longer legs)
 * - Under 0.1 mi: feet in sensible 5/10/50 ft steps (no minimum “10 ft” when nearly there)
 * - Under a speed-scaled (or static 7m) “Now” threshold: “Now”
 */
export function formatImperialManeuverDistance(
  meters: number,
  options?: FormatManeuverDistanceOptions,
): { value: string; unit: string } {
  if (!Number.isFinite(meters) || meters < 0) return { value: '—', unit: '' };
  if (meters < DIST_DASH_MAX_M) return { value: '—', unit: '' };
  const nowM =
    options?.nowMetersOverride ??
    (options?.speedMphForNow != null
      ? maneuverNowThresholdMeters(options.speedMphForNow)
      : NOW_MANEUVER_METERS);
  if (meters < nowM) return { value: 'Now', unit: '' };

  const mi = meters / M_PER_MI;
  if (mi >= 0.1) {
    if (mi >= 10) {
      return { value: String(Math.round(mi)), unit: 'MI' };
    }
    const v = Math.round(mi * 10) / 10;
    const s = v % 1 === 0 ? String(v) : v.toFixed(1);
    return { value: s, unit: 'MI' };
  }

  const ft = meters * FT_PER_M;
  if (ft >= 500) {
    return { value: String(Math.round(ft / 10) * 10), unit: 'FT' };
  }
  if (ft >= 100) {
    return { value: String(Math.round(ft / 5) * 5), unit: 'FT' };
  }
  if (ft >= 50) {
    return { value: String(Math.round(ft / 5) * 5), unit: 'FT' };
  }
  return { value: String(Math.max(25, Math.round(ft / 5) * 5)), unit: 'FT' };
}

/** @deprecated Prefer {@link formatImperialManeuverDistance} — same behavior. */
export function formatTurnDistanceForCard(meters: number): { value: string; unit: string } {
  return formatImperialManeuverDistance(meters);
}

function maneuverWords(maneuver: string): string {
  const m = (maneuver ?? 'straight').toLowerCase();
  if (m === 'u-turn' || m === 'uturn') return 'Make a U-turn';
  if (m === 'roundabout') return 'Enter the roundabout';
  if (m === 'merge') return 'Merge';
  if (m.includes('sharp-left')) return 'Turn sharp left';
  if (m.includes('sharp-right')) return 'Turn sharp right';
  if (m.includes('slight-left')) return 'Bear left';
  if (m.includes('slight-right')) return 'Bear right';
  if (m.includes('left')) return 'Turn left';
  if (m.includes('right')) return 'Turn right';
  if (m === 'straight') return 'Continue straight';
  if (m === 'depart') return 'Head out';
  if (m === 'arrive') return 'Arrive';
  return 'Continue';
}

/** Single-line turn phrase onto a named road (avoids duplicating Mapbox essay + compass noise). */
export function buildActivePrimary(
  nextStep: DirectionsStep | null | undefined,
  destinationName?: string | null,
  navStep?: NavStep | null,
): string {
  if (navStep?.displayInstruction?.trim()) {
    return navStep.displayInstruction.trim();
  }
  if (!nextStep) return '';
  const dest = destinationName?.trim() || '';
  const instr = nextStep.instruction.replace(/\s+/g, ' ').trim();
  if (instr.length > 3) {
    const cap = instr.charAt(0).toUpperCase() + instr.slice(1);
    return cap.length <= 88 ? cap : `${cap.slice(0, 86)}…`;
  }
  const onto = nextStep.name?.trim() || (nextStep.maneuver === 'arrive' ? dest : '');
  const verb = maneuverWords(nextStep.maneuver);
  if (onto) {
    if (nextStep.maneuver === 'arrive') return `Arrive at ${onto}`;
    if (verb === 'Continue straight') return `Continue on ${onto}`;
    return `${verb} onto ${onto}`;
  }
  if (nextStep.maneuver === 'arrive' && dest) return `Arrive at ${dest}`;
  return instr;
}

/** Build chain text from NavStep for the "then" row. */
export function buildChainInstruction(navStep: NavStep | null | undefined): string | null {
  if (!navStep?.nextManeuverKind) return null;
  if (
    navStep.nextManeuverDistanceMeters != null &&
    navStep.nextManeuverDistanceMeters > 240
  ) {
    return null;
  }

  const kindToPhrase: Partial<Record<ManeuverKind, string>> = {
    turn_left: 'Then turn left',
    turn_right: 'Then turn right',
    sharp_left: 'Then sharp left',
    sharp_right: 'Then sharp right',
    slight_left: 'Then bear left',
    slight_right: 'Then bear right',
    keep_left: 'Then keep left',
    keep_right: 'Then keep right',
    uturn: 'Then U-turn',
    merge_left: 'Then merge left',
    merge_right: 'Then merge right',
  };

  const phrase = kindToPhrase[navStep.nextManeuverKind];
  if (!phrase) return null;

  const road = navStep.nextManeuverStreet?.trim();
  return road ? `${phrase} onto ${road}` : phrase;
}

function stripCompassNoise(s: string): string {
  return s
    .replace(/\b(head|drive|continue)\s+(north|south|east|west|northeast|northwest|southeast|southwest)\b/gi, 'Continue')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildPreviewPrimarySecondary(
  current: DirectionsStep | null | undefined,
  next: DirectionsStep | null | undefined,
  destinationName?: string | null,
): { primary: string; secondary?: string } {
  if (!current) return { primary: '' };
  const road = current.name?.trim();
  const raw = stripCompassNoise(current.instruction.replace(/\.$/, ''));
  let primary = road ? `Continue on ${road}` : raw;
  if (primary.length > 72) primary = road ? `Continue on ${road}` : raw.slice(0, 70) + '…';

  let secondary: string | undefined;
  const dest = destinationName?.trim() || '';
  if (next && next.maneuver === 'arrive') {
    const place = next.name?.trim() || dest;
    secondary = place
      ? `Then arrive at ${place}`
      : `Then ${next.instruction.replace(/\.$/, '')}`;
  } else if (next && next.maneuver !== 'depart') {
    const nRoad = next.name?.trim();
    const mw = maneuverWords(next.maneuver);
    secondary = nRoad && mw !== 'Continue straight' ? `Then ${mw.toLowerCase()} onto ${nRoad}` : `Then ${next.instruction.replace(/\.$/, '')}`;
  }
  return { primary, secondary };
}

export function buildConfirmPrimary(current: DirectionsStep | null | undefined): string {
  if (!current?.instruction) return 'Continue';
  const road = current.name?.trim();
  if (road && !current.instruction.toLowerCase().includes(road.toLowerCase())) {
    return `Continue on ${road}`;
  }
  const t = stripCompassNoise(current.instruction).replace(/\.$/, '');
  if (t.toLowerCase().startsWith('continue')) return t;
  return road ? `Continue on ${road}` : t;
}

/** Cruise banner: distance is shown in the numeric column; keep copy short. */
export function buildCruisePrimary(
  nextStep: DirectionsStep | null | undefined,
  destinationName?: string | null,
): string {
  const dest = destinationName?.trim() || '';
  if (nextStep?.maneuver === 'arrive') {
    const t = nextStep.instruction?.replace(/\.$/, '').trim();
    if (t) return t;
    const road = nextStep.name?.trim();
    if (road) return `Arriving at ${road}`;
    if (dest) return `Arriving at ${dest}`;
    return 'Approaching destination';
  }
  if (nextStep?.name?.trim()) return `Toward ${nextStep.name.trim()}`;
  if (dest) return `Toward ${dest}`;
  return 'Continue on route';
}

/** Highway / route shield style disambiguation only */
export function shouldShowRoadDisambiguation(name: string | null | undefined): boolean {
  if (!name || name.length < 3) return false;
  if (/^(I-|US-|SR-|CA-|HWY|Route)\s*\d/i.test(name)) return true;
  return name.length >= 28;
}

export function resolveTurnCardState(args: {
  distanceToNextManeuverM: number;
  speedMph: number;
  mode: DrivingMode;
  inConfirmationWindow: boolean;
  nextStep: DirectionsStep | null | undefined;
  /**
   * When the road ahead has severe/heavy congestion near the next maneuver,
   * pass `true` to show the turn card earlier (user is approaching slowly,
   * needs more time to read the instruction).
   */
  congestionNearManeuver?: boolean;
  /**
   * Timestamp (epoch ms) when the state last transitioned to 'active'.
   * Used to enforce a minimum dwell time so the card doesn't flash by
   * at highway speed.
   */
  activeEnteredAtMs?: number;
  /** Current timestamp (epoch ms); defaults to Date.now(). */
  nowMs?: number;
}): TurnCardState {
  const {
    distanceToNextManeuverM: d,
    speedMph,
    mode,
    inConfirmationWindow,
    nextStep,
    congestionNearManeuver = false,
    activeEnteredAtMs,
    nowMs = Date.now(),
  } = args;

  const tc = getTurnCardNavTuning(mode);
  const activeM = tc.activeManeuverMeters;
  const confirmMult = tc.confirmActiveMultiplier;

  /** Minimum dwell: once 'active', hold for at least 3 s regardless of speed. */
  const MIN_ACTIVE_DWELL_MS = 3000;

  const hasUpcomingTurn = !!(
    nextStep &&
    nextStep.maneuver !== 'arrive' &&
    nextStep.maneuver !== 'depart'
  );

  /* Return 'active' when within active distance OR within the minimum dwell
   * window (prevents flash-through at highway speed). */
  const inDwellWindow =
    typeof activeEnteredAtMs === 'number' && nowMs - activeEnteredAtMs < MIN_ACTIVE_DWELL_MS;
  if (hasUpcomingTurn && (d <= activeM || inDwellWindow)) {
    return 'active';
  }

  if (inConfirmationWindow && d > activeM * confirmMult) {
    return 'confirm';
  }

  const pMax = previewDistanceMaxMeters(speedMph, mode)
    * (congestionNearManeuver ? CONGESTION_PREVIEW_BOOST : 1);

  if (hasUpcomingTurn && d > pMax) {
    return 'cruise';
  }

  if (hasUpcomingTurn && d > activeM) {
    return 'preview';
  }

  if (inConfirmationWindow) {
    return 'confirm';
  }

  if (!hasUpcomingTurn && nextStep?.maneuver === 'arrive') {
    return d > activeM ? 'cruise' : 'active';
  }

  if (!nextStep) {
    return 'cruise';
  }

  return 'active';
}

export function iconManeuverForState(
  state: TurnCardState,
  currentStep: DirectionsStep | null | undefined,
  nextStep: DirectionsStep | null | undefined,
): string {
  if (state === 'confirm' || state === 'cruise') return 'straight';
  if (state === 'active' || state === 'preview') return nextStep?.maneuver ?? currentStep?.maneuver ?? 'straight';
  return 'straight';
}

/** Returns ManeuverKind for the SVG icon — uses NavStep when available. */
export function iconManeuverKindForState(
  state: TurnCardState,
  navStep: NavStep | null | undefined,
): ManeuverKind {
  if (state === 'confirm' || state === 'cruise') return 'straight';
  if ((state === 'active' || state === 'preview') && navStep) return navStep.kind;
  return 'straight';
}

/**
 * Turn-card glyph fields from the same {@link nextManeuverCoord} the card uses for distance
 * (Mapbox `mapboxManeuver`, else `maneuver` string). {@link progNext} is only used when there
 * is no step row (e.g. waiting / no geometry).
 *
 * When **`sdkAuthoritative`** is true (native Mapbox Navigation SDK), **always** use
 * `progNext.rawType` / `rawModifier` / `kind` from the same progress tick as voice + banner.
 * The synthetic {@link DirectionsStep} can still carry a stale REST `mapboxManeuver` or a
 * weak `maneuver` string — that produced wrong icons while TTS matched the native step.
 */
export function resolveManeuverFieldsForTurnCard(args: {
  nextManeuverCoord: DirectionsStep | null | undefined;
  progNext: NavStep | null | undefined;
  /** When true, native `progNext` wins over parsed `nextManeuverCoord` (SDK path). */
  sdkAuthoritative?: boolean;
}): { rawType: string; rawModifier: string; kind: ManeuverKind } {
  const { nextManeuverCoord, progNext, sdkAuthoritative } = args;
  if (sdkAuthoritative && progNext) {
    return {
      rawType: progNext.rawType,
      rawModifier: progNext.rawModifier,
      kind: progNext.kind,
    };
  }
  if (nextManeuverCoord) {
    const fields = navManeuverFieldsFromDirectionsStep(nextManeuverCoord);
    if (fields.kind !== 'unknown') return fields;
  }
  if (progNext) {
    return {
      rawType: progNext.rawType,
      rawModifier: progNext.rawModifier,
      kind: progNext.kind,
    };
  }
  return { rawType: '', rawModifier: '', kind: 'straight' };
}
