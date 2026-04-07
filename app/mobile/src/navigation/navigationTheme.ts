/**
 * Central tokens for custom navigation chrome (puck, on-route maneuver arrow).
 * Route line colors remain in {@link ../constants/modes DRIVING_MODES}.
 */
export const NAV_DISPLAY_THEME = {
  /** Custom navigation puck (recenter-style arrow in ring). */
  navPuckPurple: '#7C3AED',
  navPuckRing: 'rgba(255,255,255,0.94)',
  navPuckShadow: 'rgba(76, 29, 149, 0.35)',
  /** Maneuver chevron on the route line. */
  maneuverArrow: '#7C3AED',
} as const;
