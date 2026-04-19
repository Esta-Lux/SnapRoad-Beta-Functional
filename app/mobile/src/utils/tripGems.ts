/** Match backend `services/gem_economy.trip_gems_from_duration_minutes` (premium mult in backend). */

const PER_TRIP_CAP = 200;

export function tripGemsFromDurationMinutes(durationMinutes: number, isPremium: boolean): number {
  const d = Math.max(0, durationMinutes);
  const chunks = Math.floor(d / 10);
  if (chunks < 1) return 0;
  let raw = 15 + (chunks - 1) * 5;
  raw = Math.min(raw, 100);
  let total = isPremium ? raw * 2 : raw;
  total = Math.min(total, PER_TRIP_CAP);
  return total;
}
