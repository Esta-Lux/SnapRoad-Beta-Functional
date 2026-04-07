import { formatDuration } from './format';
import { formatDistance } from './distance';

/**
 * Single source for route distance/duration/arrival used by place preview, route chips, and nav ETA
 * (all use rounded minutes for clock time so labels stay consistent across driving modes).
 */
export function routeSummaryFromMapboxMetersSeconds(distanceMeters: number, durationSeconds: number) {
  const etaMinutes = Math.max(0, Math.round(durationSeconds / 60));
  const distanceMiles = Math.max(0, distanceMeters / 1609.344);
  return {
    etaMinutes,
    distanceMiles,
    durationText: formatDuration(etaMinutes),
    distanceText: formatDistance(distanceMiles),
    /** Clock arrival aligned with `etaMinutes` (same as NavigationStatusStrip). */
    arrivalDate: new Date(Date.now() + etaMinutes * 60_000),
  };
}
