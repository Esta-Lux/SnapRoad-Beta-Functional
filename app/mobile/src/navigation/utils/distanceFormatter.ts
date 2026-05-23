export type ManeuverDistanceParts = { value: string; unit: string };

const METERS_PER_MILE = 1609.344;
const FEET_PER_METER = 3.28084;

export type ManeuverDistanceFormatOptions = {
  nowThresholdMeters?: number;
  omitNowLabel?: boolean;
};

/**
 * Apple/Mapbox-style turn-card distance:
 * - 10.0+ mi => whole miles
 * - 0.1-9.9 mi => one decimal mile
 * - under 0.1 mi => feet rounded to 50 ft
 * - imminent => "Now"
 */
export function formatManeuverDistanceForCard(
  meters: number,
  options?: ManeuverDistanceFormatOptions,
): ManeuverDistanceParts {
  if (!Number.isFinite(meters) || meters < 0) return { value: '—', unit: '' };
  if (meters < 0.5) return { value: '—', unit: '' };

  const nowThreshold = options?.nowThresholdMeters ?? 15.24; // 50 ft
  if (!options?.omitNowLabel && meters <= nowThreshold) {
    return { value: 'Now', unit: '' };
  }

  const miles = meters / METERS_PER_MILE;
  if (miles >= 0.1) {
    return { value: miles >= 10 ? String(Math.round(miles)) : miles.toFixed(1), unit: 'MI' };
  }

  const feet = meters * FEET_PER_METER;
  const rounded = Math.max(50, Math.round(feet / 50) * 50);
  return { value: String(rounded), unit: 'FT' };
}

export function formatManeuverDistanceBadge(
  meters: number,
  options?: ManeuverDistanceFormatOptions,
): string {
  const parts = formatManeuverDistanceForCard(meters, options);
  return parts.unit ? `${parts.value} ${parts.unit.toLowerCase()}` : parts.value;
}
