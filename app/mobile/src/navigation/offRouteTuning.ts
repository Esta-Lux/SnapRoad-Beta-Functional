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

/** Wider tolerance — default for trust (fewer false reroutes in canyons). */
export const OFF_ROUTE_CONSERVATIVE: OffRouteTuning = {
  maxSnapMeters: 55,
  minConfidence: 0.52,
  streakRequired: 4,
};

/** Tighter corridor — closer to previous hard-coded behavior. */
export const OFF_ROUTE_AGGRESSIVE: OffRouteTuning = {
  maxSnapMeters: 40,
  minConfidence: 0.65,
  streakRequired: 3,
};

export function offRouteTuningForMode(mode: DrivingMode): OffRouteTuning {
  if (mode === 'sport') return OFF_ROUTE_AGGRESSIVE;
  return OFF_ROUTE_CONSERVATIVE;
}
