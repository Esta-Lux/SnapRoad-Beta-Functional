/**
 * Match backend `services/gem_economy.trip_gems_from_duration_minutes`
 * (flat gems per counted trip; gates enforced server-side).
 * Call only when the client has already validated min distance/time.
 */

export const TRIP_GEMS_PER_COUNTED_TRIP = 5;

export function tripGemsFromDurationMinutes(durationMinutes: number, isPremium: boolean): number {
  void durationMinutes;
  void isPremium;
  return TRIP_GEMS_PER_COUNTED_TRIP;
}

/** Preview XP for the trip sheet; aligned with backend `_compute_trip_rewards` XP curve. */
export function previewXpForCountedTrip(distanceMiles: number, safetyScore: number): number {
  const d = Math.max(0, distanceMiles);
  const xpBase = Math.min(100, Math.max(5, Math.round(d * 2)));
  const bonus = safetyScore >= 85 ? 15 : safetyScore >= 70 ? 5 : 0;
  return Math.min(150, xpBase + bonus);
}
