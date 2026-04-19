/**
 * Mapbox lane indication strings → canonical glyphs for {@link LaneInfo}.
 * Keep banner + intersection parsing aligned so turn-card arrows match Mapbox intent.
 */

import type { LaneIndication, LaneInfo } from './navModel';

/** Normalize Mapbox / OSRM-style lane strings to our finite glyph set. */
export function parseLaneIndication(raw: string): LaneIndication {
  const s = (raw ?? '').toLowerCase().trim().replace(/-/g, ' ');
  if (s === 'left' || s === 'merge left' || s === 'sharp left') return 'left';
  if (s === 'slight left') return 'slight_left';
  if (s === 'right' || s === 'merge right' || s === 'sharp right') return 'right';
  if (s === 'slight right') return 'slight_right';
  if (s === 'uturn' || s === 'u-turn' || s === 'u turn') return 'uturn';
  return 'straight';
}

/**
 * Primary arrow for a lane: prefer Mapbox `valid_indication` when present (banner + intersections),
 * otherwise first parsed indication.
 */
export function primaryLaneGlyph(lane: LaneInfo): LaneIndication {
  if (lane.displayIndication) return lane.displayIndication;
  const first = lane.indications[0];
  if (first) return first;
  return 'straight';
}
