export const DEFAULT_FUEL_MPG = 25;
export const DEFAULT_FUEL_PRICE_PER_GALLON = 3.6;
export const IRS_2026_BUSINESS_MILE_RATE_USD = 0.67;

export function avgSpeedMph(distanceMiles: number, durationSeconds: number): number {
  if (!Number.isFinite(distanceMiles) || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return 0;
  }
  return Math.max(0, distanceMiles / (durationSeconds / 3600));
}

export function estimateFuelGallons(distanceMiles: number, mpg = DEFAULT_FUEL_MPG): number {
  if (!Number.isFinite(distanceMiles) || !Number.isFinite(mpg) || mpg <= 0) return 0;
  return Math.max(0, distanceMiles / mpg);
}

export function estimateFuelCostUsd(
  distanceMiles: number,
  mpg = DEFAULT_FUEL_MPG,
  pricePerGallon = DEFAULT_FUEL_PRICE_PER_GALLON,
): number {
  if (!Number.isFinite(pricePerGallon) || pricePerGallon < 0) return 0;
  return estimateFuelGallons(distanceMiles, mpg) * pricePerGallon;
}

export function estimateMileageDeductionUsd(
  distanceMiles: number,
  rateUsd = IRS_2026_BUSINESS_MILE_RATE_USD,
): number {
  if (!Number.isFinite(distanceMiles) || !Number.isFinite(rateUsd) || rateUsd < 0) return 0;
  return Math.max(0, distanceMiles * rateUsd);
}

export function formatUsd(value: number): string {
  const n = Number.isFinite(value) ? Math.max(0, value) : 0;
  return `$${n.toFixed(n >= 10 ? 0 : 2)}`;
}
