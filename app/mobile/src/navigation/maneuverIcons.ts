/**
 * Map simplified maneuver strings (see `mapboxManeuverToSimple`) to sprite keys for `Images`.
 * Extend with multiple PNGs and SymbolLayer `match` when needed.
 */
export function getManeuverArrowAsset(maneuver?: string): string {
  const m = (maneuver ?? 'straight').toLowerCase();
  if (m.includes('left') && m.includes('sharp')) return 'maneuverArrow';
  if (m.includes('right') && m.includes('sharp')) return 'maneuverArrow';
  if (m.includes('left')) return 'maneuverArrow';
  if (m.includes('right')) return 'maneuverArrow';
  if (m === 'u-turn' || m === 'uturn') return 'maneuverArrow';
  if (m === 'roundabout') return 'maneuverArrow';
  if (m === 'merge') return 'maneuverArrow';
  return 'maneuverArrow';
}
