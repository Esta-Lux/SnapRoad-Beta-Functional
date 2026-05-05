import type { DrivingMode } from '../types';
import type { ModeConfig } from '../constants/modes';
import { DRIVING_MODES } from '../constants/modes';

export type MapboxLightPreset = 'dawn' | 'day' | 'dusk' | 'night';

export type EffectiveRouteColors = {
  routeColor: string;
  routeCasing: string;
  passedColor: string;
  routeGlowColor: string;
  routeGlowOpacity: number;
};

/** Single SnapRoad route treatment: bright core + cyan glow; no slate/orange night variants. */
const SNAP_ROUTE_CORE = '#0A84FF';
const SNAP_ROUTE_CASING_STD = '#032C66';
const SNAP_ROUTE_PASSED = 'rgba(10,132,255,0.42)';
const SNAP_ROUTE_GLOW = '#5EBBFF';

/**
 * One consistent blue route line on Standard + dark/sport basemaps (no congestion tint on geometry).
 * Passed segment stays in the blue family instead of gray.
 */
export function effectiveNavRouteColors(
  modeConfig: ModeConfig,
  mapLightPreset: MapboxLightPreset,
  isSatellite: boolean,
  drivingMode?: DrivingMode,
  options?: { speedMphForRoute?: number },
): EffectiveRouteColors {
  void mapLightPreset;
  void drivingMode;
  void options;

  const glowOpacity = Math.max(modeConfig.routeGlowOpacity, 0.3);

  if (isSatellite) {
    return {
      routeColor: SNAP_ROUTE_CORE,
      routeCasing: '#070D18',
      passedColor: 'rgba(10,132,255,0.38)',
      routeGlowColor: SNAP_ROUTE_GLOW,
      routeGlowOpacity: Math.max(glowOpacity, 0.26),
    };
  }

  return {
    routeColor: SNAP_ROUTE_CORE,
    routeCasing: SNAP_ROUTE_CASING_STD,
    passedColor: SNAP_ROUTE_PASSED,
    routeGlowColor: SNAP_ROUTE_GLOW,
    routeGlowOpacity: glowOpacity,
  };
}

/** Alternate route preview lines — same hue family, dimmed. */
export function effectiveAlternateRouteLineColor(
  mapLightPreset: MapboxLightPreset,
  isSatellite: boolean,
): string {
  void mapLightPreset;
  void isSatellite;
  return 'rgba(10,132,255,0.55)';
}

/**
 * Maps app driving mode + app light/dark theme to Mapbox Standard `lightPreset`.
 * Dark UI theme always uses `night` on the basemap for a neutral, readable map.
 */
export function getDrivingLightPreset(
  drivingMode: DrivingMode,
  isLightAppTheme: boolean,
  options?: { sportBasemapAlwaysDark?: boolean },
): MapboxLightPreset {
  if (!isLightAppTheme) return 'night';
  if (options?.sportBasemapAlwaysDark && drivingMode === 'sport') return 'night';
  return DRIVING_MODES[drivingMode].lightPreset;
}

/** Base URLs that support Standard style configuration (`StyleImport` / basemap config). */
export function usesStandardStyleConfiguration(url: string): boolean {
  return url.includes('mapbox://styles/mapbox/standard');
}

/**
 * Satellite config — mirrors the Standard config so 3D buildings, landmarks, and POI labels
 * all render on top of aerial imagery, consistent with the Standard style experience.
 * show3dObjects enables extruded buildings on Standard-Satellite just as it does on Standard.
 *
 * @see https://docs.mapbox.com/map-styles/standard/api/ (Standard-Satellite table)
 */
function standardSatelliteBasemapConfig(
  lightPreset: MapboxLightPreset,
): Record<string, string> {
  return {
    lightPreset,
    // 3D buildings + landmarks on top of satellite imagery.
    show3dObjects: 'true',
    // POI / place / road labels sit above the 3D geometry layer in the Standard render order.
    showPointOfInterestLabels: 'true',
    showPlaceLabels: 'true',
    showRoadLabels: 'true',
    showTransitLabels: 'true',
    showPedestrianRoads: 'true',
    showAdminBoundaries: 'true',
    // Documented Standard-Satellite API (v11.11+): max POI density + landmark icons.
    densityPointOfInterestLabels: '5',
    showLandmarkIcons: 'true',
  };
}

/**
 * Basemap config for {@link usesStandardStyleConfiguration} styles (`StyleImport` id `basemap`).
 * Values are strings — required by `@rnmapbox/maps` StyleImport on the native bridge.
 *
 * Only keys from the public Standard API are included. Unknown keys can cause the
 * native bridge to reject the whole `config` object (see mapbox style docs), so
 * we avoid experimental properties.
 * `densityPointOfInterestLabels` (1–5) and `showLandmarkIcons` are documented
 * since iOS/Android SDK v11.11.0; they improve POI/landmark visibility vs defaults.
 *
 * @see https://docs.mapbox.com/map-styles/standard/api/
 */
export function standardBasemapStyleImportConfig(
  lightPreset: MapboxLightPreset,
  isSatellite: boolean,
  drivingMode: DrivingMode = 'adaptive',
  isNavigating = true,
): Record<string, string> {
  void drivingMode;
  void isNavigating;
  if (isSatellite) {
    return standardSatelliteBasemapConfig(lightPreset);
  }
  return {
    lightPreset,
    // 3D geometry (buildings, landmarks, trees) — one toggle covers all objects.
    show3dObjects: 'true',
    // Label layers — all on at max visibility.
    showPointOfInterestLabels: 'true',
    showPlaceLabels: 'true',
    showRoadLabels: 'true',
    showTransitLabels: 'true',
    showPedestrianRoads: 'true',
    showAdminBoundaries: 'true',
    densityPointOfInterestLabels: '5',
    showLandmarkIcons: 'true',
  };
}
