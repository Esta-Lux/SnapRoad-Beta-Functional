import type { ManeuverKind } from './navModel';

/** Short phrase for voice (lowercase maneuver style). */
export function phraseForManeuverKind(kind: ManeuverKind): string {
  switch (kind) {
    case 'left':
      return 'turn left';
    case 'right':
      return 'turn right';
    case 'slight_left':
      return 'bear left';
    case 'slight_right':
      return 'bear right';
    case 'sharp_left':
      return 'take a sharp left';
    case 'sharp_right':
      return 'take a sharp right';
    case 'uturn':
      return 'make a U-turn';
    case 'merge':
      return 'merge';
    case 'fork':
      return 'keep at the fork';
    case 'arrive':
      return 'you will arrive soon';
    default:
      return 'continue straight';
  }
}

/** Hyphenated maneuver key for turn icons (DirectionsStep-style). */
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
    default:
      return kind;
  }
}
