import type { ManeuverKind } from './navModel';
import type { NavStep } from './navModel';

const PHRASES: Record<ManeuverKind, string> = {
  turn_left: 'turn left',
  turn_right: 'turn right',
  sharp_left: 'sharp left',
  sharp_right: 'sharp right',
  slight_left: 'bear left',
  slight_right: 'bear right',
  straight: 'continue straight',
  uturn: 'make a U-turn',
  merge_left: 'merge left',
  merge_right: 'merge right',
  merge: 'merge',
  on_ramp_left: 'take the ramp on the left',
  on_ramp_right: 'take the ramp on the right',
  off_ramp_left: 'take the exit on the left',
  off_ramp_right: 'take the exit on the right',
  fork_left: 'keep left at the fork',
  fork_right: 'keep right at the fork',
  roundabout_left: 'enter the roundabout and turn left',
  roundabout_right: 'enter the roundabout and turn right',
  roundabout_straight: 'enter the roundabout and go straight',
  rotary: 'enter the rotary',
  keep_left: 'keep left',
  keep_right: 'keep right',
  arrive: 'you will arrive soon',
  depart: 'head out',
  notification: '',
  continue: 'continue',
  unknown: 'continue on the route',
};

/** Short phrase for voice (lowercase). */
export function phraseForManeuverKind(kind: ManeuverKind): string {
  return PHRASES[kind] ?? 'continue straight';
}

/** HUD/action phrase shared by turn cards and JS voice so both speak the same maneuver. */
export function hudPhraseForManeuverKind(
  kind: ManeuverKind | null | undefined,
  exitNumber?: number | null,
): string {
  if (
    kind === 'rotary' ||
    kind === 'roundabout_left' ||
    kind === 'roundabout_right' ||
    kind === 'roundabout_straight'
  ) {
    if (exitNumber != null && Number.isFinite(exitNumber) && exitNumber > 0) {
      const ordinals: Record<number, string> = {
        1: 'first',
        2: 'second',
        3: 'third',
        4: 'fourth',
        5: 'fifth',
        6: 'sixth',
      };
      const ord = ordinals[exitNumber] ?? `${exitNumber}th`;
      return `Take the ${ord} exit`;
    }
  }
  const p = phraseForManeuverKind(kind ?? 'straight');
  return p.charAt(0).toUpperCase() + p.slice(1);
}

export function isHighwayLikeNavStep(step: Pick<NavStep, 'shields' | 'exitNumber' | 'streetName' | 'destinationRoad' | 'rawType'> | null | undefined): boolean {
  if (!step) return false;
  if (step.exitNumber) return true;
  if (step.shields?.some((shield) => {
    const ref = `${shield.displayRef ?? ''} ${shield.ref ?? ''} ${shield.network ?? ''}`;
    return /\b(I[-\s]?\d+|US[-\s]?\d+|SR[-\s]?\d+|OH[-\s]?\d+|interstate|motorway|freeway|highway)\b/i.test(ref);
  })) return true;
  const road = `${step.streetName ?? ''} ${step.destinationRoad ?? ''}`;
  if (/\b(I[-\s]?\d+|US[-\s]?\d+|SR[-\s]?\d+|OH[-\s]?\d+|interstate|freeway|highway|expressway|turnpike)\b/i.test(road)) return true;
  return /\b(ramp|fork|merge|motorway)\b/i.test(step.rawType ?? '') && !!step.shields?.length;
}

export function hudPhraseForStep(step: NavStep | null | undefined): string {
  if (!step) return hudPhraseForManeuverKind('straight');
  const highway = isHighwayLikeNavStep(step);
  if (!highway) {
    switch (step.kind) {
      case 'slight_left':
      case 'keep_left':
      case 'fork_left':
      case 'merge_left':
      case 'on_ramp_left':
      case 'off_ramp_left':
        return 'Turn left';
      case 'slight_right':
      case 'keep_right':
      case 'fork_right':
      case 'merge_right':
      case 'on_ramp_right':
      case 'off_ramp_right':
        return 'Turn right';
      case 'merge':
        return step.rawModifier === 'left' ? 'Turn left' : step.rawModifier === 'right' ? 'Turn right' : 'Continue';
      default:
        break;
    }
  }
  return hudPhraseForManeuverKind(step.kind, step.roundaboutExitNumber);
}

/** Hyphenated maneuver key for turn icons (DirectionsStep-style substrings). */
export function maneuverKeyFromKind(kind: ManeuverKind): string {
  switch (kind) {
    case 'slight_left':
      return 'slight-left';
    case 'slight_right':
      return 'slight-right';
    case 'sharp_left':
      return 'sharp-left';
    case 'sharp_right':
      return 'sharp-right';
    case 'uturn':
      return 'u-turn';
    case 'turn_left':
      return 'left';
    case 'turn_right':
      return 'right';
    case 'merge':
    case 'merge_left':
    case 'merge_right':
      return 'merge';
    case 'fork_left':
    case 'fork_right':
      return 'fork';
    case 'roundabout_left':
    case 'roundabout_right':
    case 'roundabout_straight':
    case 'rotary':
      return 'roundabout';
    case 'on_ramp_left':
    case 'on_ramp_right':
    case 'off_ramp_left':
    case 'off_ramp_right':
      return 'merge';
    case 'arrive':
      return 'arrive';
    case 'depart':
      return 'depart';
    case 'keep_left':
      return 'slight-left';
    case 'keep_right':
      return 'slight-right';
    case 'straight':
    case 'continue':
    default:
      return 'straight';
  }
}
