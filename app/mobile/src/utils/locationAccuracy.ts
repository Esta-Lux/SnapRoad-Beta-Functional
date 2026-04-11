import type { Coordinate } from '../types';
import { haversineMeters } from './distance';
import { projectAhead } from '../navigation/navigationCamera';

export function coordinateSeparationMeters(a: Coordinate, b: Coordinate): number {
  return haversineMeters(a.lat, a.lng, b.lat, b.lng);
}

/** 0.25–1.0 scale from horizontal accuracy (meters). Null → neutral. */
export function accuracyQualityFactor(accuracyM: number | null): number {
  if (accuracyM == null || !Number.isFinite(accuracyM)) return 1;
  if (accuracyM <= 8) return 1;
  if (accuracyM <= 16) return 0.96;
  if (accuracyM <= 28) return 0.9;
  if (accuracyM <= 42) return 0.76;
  if (accuracyM <= 65) return 0.58;
  if (accuracyM <= 95) return 0.4;
  return 0.25;
}

/**
 * Upper bound on how far we should accept the device moving between consecutive raw fixes.
 * Scaled more generously at speed so highway GPS jumps aren't rejected as outliers.
 */
export function plausibleMaxStepMeters(
  speedMph: number,
  dtSec: number,
  isNavigating: boolean,
  accuracyM: number | null,
): number {
  const speedMps = Math.max(0, speedMph) / 2.237;
  const base = speedMps * dtSec * (isNavigating ? 2.2 : 2.5);
  const slack = isNavigating ? 18 : 24;
  const acc = typeof accuracyM === 'number' && Number.isFinite(accuracyM) ? Math.min(100, accuracyM) : 20;
  return Math.min(isNavigating ? 260 : 280, base + slack + acc * 0.42);
}

/** Heading delta 0–180 */
export function headingDeltaDeg(a: number, b: number): number {
  let d = Math.abs(a - b) % 360;
  if (d > 180) d = 360 - d;
  return d;
}

/**
 * Display-only forward projection along heading to compensate GPS latency.
 *
 * - Activates at 12 mph — urban speeds benefit too
 * - Cap scales with speed (up to 65m on highway when navigating)
 * - Curves reduce projection proportionally instead of killing at a single degree threshold
 * - Optional accuracy reduces projection when GPS is poor
 */
export function extrapolateForDisplay(
  coord: Coordinate,
  headingDeg: number,
  speedMph: number,
  dtSec: number,
  isNavigating: boolean,
  previousHeadingDeg: number | null,
  accuracyM?: number | null,
): Coordinate {
  if (speedMph < 12) return coord;

  const mps = Math.max(0, speedMph) / 2.237;
  const headDelta =
    previousHeadingDeg != null ? headingDeltaDeg(headingDeg, previousHeadingDeg) : 0;

  const curveScale =
    headDelta <= 5
      ? 1.0
      : headDelta <= 15
        ? 1.0 - (headDelta - 5) * 0.03
        : headDelta <= 30
          ? 0.7 - (headDelta - 15) * 0.035
          : headDelta <= 50
            ? 0.175 - (headDelta - 30) * 0.008
            : 0;

  if (curveScale <= 0.01) return coord;

  let cap: number;
  if (isNavigating) {
    const dtFactor = Math.min(0.65, dtSec);
    cap = Math.min(65, 4.5 + mps * dtFactor * 0.95 + mps * 0.35);
  } else {
    cap = Math.min(28, 2.5 + mps * Math.min(0.5, dtSec) * 0.42);
  }

  if (typeof accuracyM === 'number' && Number.isFinite(accuracyM)) {
    if (accuracyM > 50) cap *= 0.35;
    else if (accuracyM > 30) cap *= 0.6;
    else if (accuracyM > 18) cap *= 0.82;
  }

  cap *= curveScale;

  if (cap < 1.8) return coord;

  const p = projectAhead(coord.lat, coord.lng, headingDeg, cap);
  return { lat: p.latitude, lng: p.longitude };
}

/**
 * Raw step is implausible vs speed — do not pull the blend toward this fix.
 * Loosened slightly at high speed (GPS can legitimately jump further between ticks).
 */
export function shouldHoldBlendForOutlierStep(
  stepFromPreviousRawM: number,
  speedMph: number,
  maxStepM: number,
): boolean {
  if (!Number.isFinite(stepFromPreviousRawM) || !Number.isFinite(maxStepM) || maxStepM <= 0) return false;
  const speedFactor = speedMph > 45 ? 1.4 : speedMph > 25 ? 1.2 : 1.0;
  if (stepFromPreviousRawM > maxStepM * 4.8 * speedFactor && speedMph < 9) return true;
  if (stepFromPreviousRawM > maxStepM * 3.2 * speedFactor && speedMph < 5.5) return true;
  if (speedMph > 35 && stepFromPreviousRawM > maxStepM * 8) return true;
  return false;
}
