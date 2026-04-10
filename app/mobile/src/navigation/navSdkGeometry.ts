import type { Coordinate } from '../types';

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
