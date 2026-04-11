import type { ManeuverKind } from './navModel';

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
