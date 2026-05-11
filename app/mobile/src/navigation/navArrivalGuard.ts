import type { Coordinate } from '../types';
import { haversineMeters } from '../utils/distance';

export const ARRIVAL_CALLBACK_CROW_METERS = 45;
export const ARRIVAL_CALLBACK_REMAINING_METERS = 45;
export const ARRIVAL_CALLBACK_REMAINING_SECONDS = 30;

type ArrivalGuardInput = {
  destination: Coordinate | null | undefined;
  matched: Coordinate | null | undefined;
  fallback: Coordinate | null | undefined;
  remainingMeters: number | null | undefined;
  remainingSeconds: number | null | undefined;
};

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function usableCoord(coord: Coordinate | null | undefined): Coordinate | null {
  if (!coord) return null;
  if (!finiteNumber(coord.lat) || !finiteNumber(coord.lng)) return null;
  return coord;
}

export function destinationCrowMeters(
  destination: Coordinate | null | undefined,
  matched: Coordinate | null | undefined,
  fallback: Coordinate | null | undefined,
): number {
  const dest = usableCoord(destination);
  const loc = usableCoord(matched) ?? usableCoord(fallback);
  if (!dest || !loc) return Number.POSITIVE_INFINITY;
  return haversineMeters(loc.lat, loc.lng, dest.lat, dest.lng);
}

/**
 * Final-destination callbacks are advisory until GPS/progress truth agrees.
 * This prevents stale SDK arrival events from ending a trip while the HUD
 * still correctly shows minutes and distance remaining.
 */
export function shouldAcceptFinalDestinationArrival(input: ArrivalGuardInput): boolean {
  const crow = destinationCrowMeters(input.destination, input.matched, input.fallback);
  if (crow <= ARRIVAL_CALLBACK_CROW_METERS) return true;

  const remainingMeters = finiteNumber(input.remainingMeters) ? input.remainingMeters : null;
  const remainingSeconds = finiteNumber(input.remainingSeconds) ? input.remainingSeconds : null;
  return (
    remainingMeters != null &&
    remainingSeconds != null &&
    remainingMeters <= ARRIVAL_CALLBACK_REMAINING_METERS &&
    remainingSeconds <= ARRIVAL_CALLBACK_REMAINING_SECONDS &&
    crow <= ARRIVAL_CALLBACK_CROW_METERS * 1.75
  );
}
