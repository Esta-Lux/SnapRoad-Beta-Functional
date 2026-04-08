import type { Coordinate } from '../types';
import { haversineMeters } from './distance';
import { projectAhead } from '../navigation/navigationCamera';

export function coordinateSeparationMeters(a: Coordinate, b: Coordinate): number {
  return haversineMeters(a.lat, a.lng, b.lat, b.lng);
}

/** 0.28–1.0 scale from horizontal accuracy (meters). Null → neutral. */
export function accuracyQualityFactor(accuracyM: number | null): number {
  if (accuracyM == null || !Number.isFinite(accuracyM)) return 1;
  if (accuracyM <= 12) return 1;
  if (accuracyM <= 28) return 0.92;
  if (accuracyM <= 42) return 0.78;
  if (accuracyM <= 65) return 0.62;
  if (accuracyM <= 95) return 0.45;
  return 0.28;
}

/**
 * Upper bound on how far we should accept the device moving between consecutive raw fixes.
 */
export function plausibleMaxStepMeters(
  speedMph: number,
  dtSec: number,
  isNavigating: boolean,
  accuracyM: number | null,
): number {
  const speedMps = Math.max(0, speedMph) / 2.237;
  const base = speedMps * dtSec * (isNavigating ? 1.92 : 2.35);
  const slack = isNavigating ? 14 : 22;
  const acc = typeof accuracyM === 'number' && Number.isFinite(accuracyM) ? Math.min(90, accuracyM) : 18;
  return Math.min(isNavigating ? 195 : 240, base + slack + acc * 0.38);
}

/** Heading delta 0–180 */
export function headingDeltaDeg(a: number, b: number): number {
  let d = Math.abs(a - b) % 360;
  if (d > 180) d = 360 - d;
  return d;
}

/**
 * Display-only: nudge the filtered fix along `headingDeg` so UI/camera feels less laggy.
 * Disabled during sharp turns or low speed.
 */
export function extrapolateForDisplay(
  coord: Coordinate,
  headingDeg: number,
  speedMph: number,
  dtSec: number,
  isNavigating: boolean,
  previousHeadingDeg: number | null,
): Coordinate {
  if (speedMph < 18) return coord;
  const headDelta =
    previousHeadingDeg != null ? headingDeltaDeg(headingDeg, previousHeadingDeg) : 0;
  if (headDelta > 11) return coord;
  const mps = Math.max(0, speedMph) / 2.237;
  const cap = isNavigating
    ? Math.min(34, 5.5 + mps * Math.min(0.55, dtSec) * 0.42)
    : Math.min(16, mps * Math.min(0.45, dtSec) * 0.28);
  if (cap < 2.5) return coord;
  const p = projectAhead(coord.lat, coord.lng, headingDeg, cap);
  return { lat: p.latitude, lng: p.longitude };
}

/**
 * Raw step is implausible vs speed — do not pull the blend toward this fix this tick.
 */
export function shouldHoldBlendForOutlierStep(
  stepFromPreviousRawM: number,
  speedMph: number,
  maxStepM: number,
): boolean {
  if (!Number.isFinite(stepFromPreviousRawM) || !Number.isFinite(maxStepM) || maxStepM <= 0) return false;
  if (stepFromPreviousRawM > maxStepM * 4.8 && speedMph < 9) return true;
  if (stepFromPreviousRawM > maxStepM * 2.55 && speedMph < 5.5) return true;
  return false;
}
