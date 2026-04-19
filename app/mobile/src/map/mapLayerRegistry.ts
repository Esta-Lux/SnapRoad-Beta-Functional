/**
 * Code-first registry of custom Mapbox layers/sources (ordering / debugging).
 * Native “inserting layer failed” usually means anchor `belowLayerID` / `aboveLayerID`
 * does not exist for the active style URL — compare with {@link labelAnchorLayerIdForStyleUrl}.
 */
export const ROUTE_SOURCE_ID = 'sr-route';
export const ROUTE_SOURCE_ID_MINIMAL = 'sr-route-fallback';

export const RouteLineLayerIds = {
  glow: 'sr-route-glow',
  casing: 'sr-route-casing',
  passed: 'sr-route-passed',
  ahead: 'sr-route-ahead',
  minimalLine: 'sr-route-fallback-line',
} as const;

export const TrafficIds = {
  source: 'sr-traffic-source',
  low: 'sr-traffic-low',
  moderate: 'sr-traffic-moderate',
  heavy: 'sr-traffic-heavy',
  severe: 'sr-traffic-severe',
  closed: 'sr-traffic-closed',
} as const;

export const BuildingLayerIds = {
  fillExtrusion: 'sr-3d-buildings',
} as const;

export const IncidentHeatmapIds = {
  source: 'incident-heat',
  layer: 'incident-heatmap',
} as const;

/** Stable label layer to insert 3D buildings / route below (matches MapScreen `buildingsBelowLayerId`). */
export function labelAnchorLayerIdForStyleUrl(activeStyleURL: string): string | undefined {
  const u = activeStyleURL;
  if (u.includes('mapbox://styles/mapbox/standard')) return 'road-label';
  if (u.includes('dark-v')) return 'road-label-simple';
  if (u.includes('streets-v')) return 'road-label';
  if (u.includes('navigation-night')) return 'road-label-navigation';
  if (u.includes('light-v')) return 'road-label';
  return undefined;
}
