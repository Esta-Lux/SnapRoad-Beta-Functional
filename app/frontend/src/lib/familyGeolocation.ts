/**
 * SnapRoad Family: the Browser Geolocation API is required for the live member map,
 * geofence alerts, and syncing `live_locations` — not for analytics or fingerprinting.
 * Callers must obtain explicit in-app consent (checkboxes / onboarding) before invoking.
 */
export function getCurrentPositionForFamilySharing(
  success: PositionCallback,
  error: PositionErrorCallback,
  options?: PositionOptions
): void {
  navigator.geolocation.getCurrentPosition(success, error, options) // NOSONAR
}

/** Continuous updates while Family Command Center is open (live map + server geofence accuracy). */
export function watchPositionForFamilySharing(
  success: PositionCallback,
  error: PositionErrorCallback,
  options?: PositionOptions
): number {
  return navigator.geolocation.watchPosition(success, error, options) // NOSONAR
}
