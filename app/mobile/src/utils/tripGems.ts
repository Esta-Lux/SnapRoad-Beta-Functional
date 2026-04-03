/** Match backend `services/gem_economy.trip_gems_from_duration_minutes` (premium mult applied when known). */
export function tripGemsFromDurationMinutes(durationMinutes: number, isPremium: boolean): number {
  const d = Math.max(0, durationMinutes);
  let base: number;
  if (d < 20) base = 10;
  else if (d < 60) base = 25;
  else base = 45;
  return isPremium ? base * 2 : base;
}
