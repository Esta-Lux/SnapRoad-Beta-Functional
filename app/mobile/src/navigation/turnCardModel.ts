import type { DrivingMode } from '../types';
import type { DirectionsStep } from '../lib/directions';
import type { ManeuverKind, NavStep } from './navModel';
import { getTurnCardNavTuning, previewDistanceMaxMeters } from './navModeProfile';

export type TurnCardState = 'preview' | 'active' | 'confirm' | 'cruise';

const FT_PER_M = 3.28084;

/** Adaptive-mode default (~236 ft). Prefer {@link getTurnCardNavTuning} for mode-specific values. */
export const ACTIVE_MANEUVER_METERS = 72;

export { previewDistanceMaxMeters };

/**
 * Stable, legible distance: 1000+ ft → 0.2 mi steps; 300–999 ft → 50 ft; under 300 → tighter buckets.
 */
export function formatTurnDistanceForCard(meters: number): { value: string; unit: string } {
  if (!Number.isFinite(meters) || meters < 0) return { value: '0', unit: 'FT' };
  const ft = meters * FT_PER_M;
  if (ft >= 1000) {
    const mi = meters / 1609.34;
    const rounded = Math.max(0.2, Math.round(mi * 5) / 5);
    return { value: rounded.toFixed(1), unit: 'MI' };
  }
  if (ft >= 300) {
    const bucket = Math.round(ft / 50) * 50;
    return { value: String(Math.max(300, bucket)), unit: 'FT' };
  }
  if (ft >= 150) {
    const bucket = Math.round(ft / 25) * 25;
    return { value: String(Math.max(25, bucket)), unit: 'FT' };
  }
  const bucket = Math.round(ft / 10) * 10;
  return { value: String(Math.max(10, bucket)), unit: 'FT' };
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
}): TurnCardState {
  const {
    distanceToNextManeuverM: d,
    speedMph,
    mode,
    inConfirmationWindow,
    nextStep,
    congestionNearManeuver = false,
  } = args;

  const tc = getTurnCardNavTuning(mode);
  const activeM = tc.activeManeuverMeters;
  const confirmMult = tc.confirmActiveMultiplier;

  const hasUpcomingTurn = !!(
    nextStep &&
    nextStep.maneuver !== 'arrive' &&
    nextStep.maneuver !== 'depart'
  );

  if (hasUpcomingTurn && d <= activeM) {
    return 'active';
  }

  if (inConfirmationWindow && d > activeM * confirmMult) {
    return 'confirm';
  }

  const pMax = previewDistanceMaxMeters(speedMph, mode)
    // Congestion boost: when the ahead segment has heavy/severe congestion,
    // the driver approaches slower and needs the card earlier — widen preview by ~25%.
    * (congestionNearManeuver ? 1.25 : 1);

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
