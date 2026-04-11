import type { DrivingMode } from '../types';

/**
 * Mode-aware tuning for JS navigation progress frames (puck feel + snap window).
 * Calm: smoother, less lead; sport: snappier, more lookahead; adaptive matches legacy defaults.
 */

export type ProgressTuning = {
  /** Applied to `speed * 0.3` lead term */
  leadScale: number;
  /** Cap on forward lead (meters) */
  leadCapMeters: number;
  /** Forward segments searched in {@link snapToRoute} from previous segment */
  snapLookaheadSegments: number;
  /** Added to EMA alpha after speed bands (smoother if negative) */
  alphaOffset: number;
};

/** Matches pre–mode-split behavior (adaptive default). */
export const DEFAULT_PROGRESS_TUNING: ProgressTuning = {
  leadScale: 1,
  leadCapMeters: 22,
  snapLookaheadSegments: 52,
  alphaOffset: 0,
};

export function progressTuningForMode(mode: DrivingMode): ProgressTuning {
  switch (mode) {
    case 'calm':
      return {
        leadScale: 0.82,
        leadCapMeters: 18,
        snapLookaheadSegments: 52,
        alphaOffset: -0.05,
      };
    case 'sport':
      return {
        leadScale: 1.14,
        leadCapMeters: 28,
        snapLookaheadSegments: 58,
        alphaOffset: 0.06,
      };
    case 'adaptive':
    default:
      return DEFAULT_PROGRESS_TUNING;
  }
}
