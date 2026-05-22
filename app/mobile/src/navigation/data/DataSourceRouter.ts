export type NavigationDataType =
  | 'routing'
  | 'speed_limits'
  | 'lane_guidance'
  | 'traffic'
  | 'road_names'
  | 'junction_views'
  | 'poi_businesses';

export type NavigationProvider = 'mapbox' | 'tomtom' | 'osrm' | 'apple_mapkit' | 'google' | 'osm' | 'custom';

export const NAVIGATION_DATA_PRIORITY: Record<NavigationDataType, NavigationProvider[]> = {
  routing: ['mapbox', 'tomtom', 'osrm'],
  speed_limits: ['tomtom', 'mapbox', 'osm'],
  lane_guidance: ['mapbox', 'tomtom', 'apple_mapkit'],
  traffic: ['mapbox', 'tomtom', 'google'],
  road_names: ['mapbox', 'tomtom', 'osm'],
  junction_views: ['tomtom', 'mapbox', 'custom'],
  poi_businesses: ['google', 'mapbox', 'osm'],
};

export function primaryProviderFor(dataType: NavigationDataType): NavigationProvider {
  return NAVIGATION_DATA_PRIORITY[dataType][0];
}

export function providerChainFor(dataType: NavigationDataType): NavigationProvider[] {
  return [...NAVIGATION_DATA_PRIORITY[dataType]];
}
