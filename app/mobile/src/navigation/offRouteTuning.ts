import type { DrivingMode } from '../types';

/** Single source for off-route classification (urban false-positive vs real departure). */
export type OffRouteTuning = {
  /** Snap distance above this toward “off corridor” (meters). */
  maxSnapMeters: number;
  /** Confidence below this with large snap ⇒ `isOffRoute`. */
  minConfidence: number;
  /** Consecutive progress ticks with `isOffRoute` before auto-reroute. */
  streakRequired: number;
};

/** Wider tolerance — shared default / tests (legacy “non-sport”). */
export const OFF_ROUTE_CONSERVATIVE: OffRouteTuning = {
  maxSnapMeters: 55,
  minConfidence: 0.52,
  streakRequired: 4,
};

/** Fewer false positives: wait longer before auto-reroute (comfort drivers). */
export const OFF_ROUTE_CALM: OffRouteTuning = {
  maxSnapMeters: 58,
  minConfidence: 0.45,
  streakRequired: 4,
};

/** Between calm and sport: balanced urban + highway. */
export const OFF_ROUTE_ADAPTIVE: OffRouteTuning = {
  maxSnapMeters: 50,
  minConfidence: 0.52,
  streakRequired: 3,
};

/** Tighter corridor — quicker reroute when truly off the line. */
export const OFF_ROUTE_AGGRESSIVE: OffRouteTuning = {
  maxSnapMeters: 40,
  minConfidence: 0.65,
  streakRequired: 3,
};

export function offRouteTuningForMode(mode: DrivingMode): OffRouteTuning {
  switch (mode) {
    case 'sport':
      return OFF_ROUTE_AGGRESSIVE;
    case 'adaptive':
      return OFF_ROUTE_ADAPTIVE;
    case 'calm':
      return OFF_ROUTE_CALM;
    default:
      return OFF_ROUTE_CONSERVATIVE;
  }
}

/**
 * Speed-aware snap corridor: at highway speed, GPS scatter is larger,
 * so widen the distance threshold vs base tuning to reduce false off-route.
 */
export function effectiveMaxSnapMeters(
  base: OffRouteTuning,
  speedMps: number,
  accuracyM: number | null,
): number {
  let max = base.maxSnapMeters;

  if (speedMps > 22) {
    max += Math.min(20, (speedMps - 22) * 1.2);
  } else if (speedMps > 14) {
    max += Math.min(10, (speedMps - 14) * 0.8);
  }

  if (typeof accuracyM === 'number' && accuracyM > 30) {
    max += Math.min(15, (accuracyM - 30) * 0.25);
  }

  return max;
}
