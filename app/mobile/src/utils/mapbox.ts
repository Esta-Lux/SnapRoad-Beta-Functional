/**
 * Safe Mapbox loader. Returns null when native module is unavailable (Expo Go).
 * Components should check `MapboxGL !== null` before rendering map elements.
 */

let MapboxGL: typeof import('@rnmapbox/maps').default | null = null;

try {
  MapboxGL = require('@rnmapbox/maps').default;
} catch {
  // Native module not available (Expo Go). Map features will show a placeholder.
}

export default MapboxGL;

export function isMapAvailable(): boolean {
  return MapboxGL !== null;
}
