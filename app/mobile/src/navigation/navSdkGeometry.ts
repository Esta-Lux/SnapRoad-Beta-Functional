import type { DirectionsStep } from '../lib/directions';
import type { Coordinate } from '../types';
import { haversineMeters } from '../utils/distance';

/** Mirrors `onRoutesLoaded` native shape until package `build/` types are regenerated. */
export type SdkRoutesNative = {
  mainRoute: {
    distance: number;
    expectedTravelTime: number;
    legs: Array<{
      steps: Array<{
        shape?: { coordinates: Array<{ latitude: number; longitude: number }> };
      }>;
    }>;
  };
  alternativeRoutes: unknown[];
};

/**
 * Flatten Navigation SDK route legs/steps into a single polyline for RN Mapbox `ShapeSource`.
 */
export function polylineFromSdkRoutes(routes: SdkRoutesNative): Coordinate[] {
  const out: Coordinate[] = [];
  const legs = routes.mainRoute?.legs;
  if (!Array.isArray(legs)) return out;
  for (const leg of legs) {
    const steps = leg.steps;
    if (!Array.isArray(steps)) continue;
    for (const step of steps) {
      const coords = step.shape?.coordinates;
      if (!Array.isArray(coords) || !coords.length) continue;
      for (const c of coords) {
        if (typeof c.latitude === 'number' && typeof c.longitude === 'number') {
          out.push({ lat: c.latitude, lng: c.longitude });
        }
      }
    }
  }
  return out;
}

function polylineLengthAlongSdkShape(coords: Array<{ latitude: number; longitude: number }>): number {
  if (coords.length < 2) return 0;
  let len = 0;
  for (let i = 1; i < coords.length; i++) {
    const a = coords[i - 1]!;
    const b = coords[i]!;
    len += haversineMeters(a.latitude, a.longitude, b.latitude, b.longitude);
  }
  return len;
}

/**
 * Build minimal {@link DirectionsStep} rows from native Navigation SDK route geometry (legs/steps/shape).
 * Used after SDK reroute so turn-card indices / per-step distances stay aligned with the live polyline
 * without reusing stale REST Directions annotations.
 */
export function directionsStepsFromSdkRoutes(routes: SdkRoutesNative): DirectionsStep[] {
  const out: DirectionsStep[] = [];
  const legs = routes.mainRoute?.legs;
  if (!Array.isArray(legs)) return out;
  for (const leg of legs) {
    const steps = leg.steps;
    if (!Array.isArray(steps)) continue;
    for (const step of steps) {
      const coords = step.shape?.coordinates;
      if (!Array.isArray(coords) || !coords.length) continue;
      const lenM = polylineLengthAlongSdkShape(coords);
      const first = coords[0]!;
      const durSec = Math.max(1, Math.round(lenM / 13.89));
      const durMin = Math.max(1, Math.round(durSec / 60));
      const dm = Math.max(1, Math.round(lenM));
      out.push({
        instruction: 'Continue',
        distance: dm < 1000 ? `${dm} m` : `${(dm / 1000).toFixed(1)} km`,
        distanceMeters: dm,
        duration: `${durMin} min`,
        durationSeconds: durSec,
        maneuver: 'straight',
        mapboxManeuver: { type: 'continue', modifier: 'straight' },
        lat: first.latitude,
        lng: first.longitude,
        geometryCoordinates: coords.map((c) => [c.longitude, c.latitude] as [number, number]),
      });
    }
  }
  return out;
}
