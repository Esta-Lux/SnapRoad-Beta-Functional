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

/** Day / dawn Standard — crisp iOS-style blue on light roads with a navy casing. */
const SNAP_ROUTE_CORE = '#0A84FF';
const SNAP_ROUTE_CASING_STD = '#032C66';
const SNAP_ROUTE_PASSED = 'rgba(10,132,255,0.42)';
const SNAP_ROUTE_GLOW = '#5EBBFF';

/**
 * Night / dusk / satellite / Sport — Apple-Maps-in-dark idiom:
 *   vibrant iOS blue core (`#0A84FF`) over a bright white halo casing,
 *   with a soft cyan underglow. Solid color values; alpha is controlled by
 *   `RouteOverlay.casingPaintOpacity` so the halo can never collapse to ~0.
 */
const ROUTE_CORE_HIGH_VIS = '#0A84FF';
const ROUTE_CASING_HIGH_VIS = '#FFFFFF';
const ROUTE_PASSED_HIGH_VIS = 'rgba(180,200,225,0.62)';
const ROUTE_GLOW_HIGH_VIS = '#5EBBFF';

function useHighVisibilityRouteInk(
  mapLightPreset: MapboxLightPreset,
  isSatellite: boolean,
  drivingMode?: DrivingMode,
): boolean {
  /** Sport is always night basemap in-app — keep the neon stack even if a caller passes `day`. */
  if (drivingMode === 'sport') return true;
  if (isSatellite) return true;
  return mapLightPreset === 'night' || mapLightPreset === 'dusk';
}

/**
 * SnapRoad-blue route palette: day/dawn stays iOS `#0A84FF`; Sport + night/dusk/satellite forces
 * luminous `#5EE9FF` + casing tuned for dark imagery (Sport always uses this stack — app pins Sport to night).
 */
export function effectiveNavRouteColors(
  modeConfig: ModeConfig,
  mapLightPreset: MapboxLightPreset,
  isSatellite: boolean,
  drivingMode?: DrivingMode,
  options?: { speedMphForRoute?: number },
): EffectiveRouteColors {
  void options;

  const highVis = useHighVisibilityRouteInk(mapLightPreset, isSatellite, drivingMode);

  /**
   * Glow is the soft outer blur, not the casing. Apple-style dark uses a subdued blue glow
   * so the bright white halo and `#0A84FF` core stay the dominant read.
   */
  let glowOpacity = Math.max(modeConfig.routeGlowOpacity, highVis ? 0.36 : 0.3);
  if (highVis && drivingMode === 'sport') {
    glowOpacity = Math.max(glowOpacity, 0.42);
  }

  if (highVis) {
    if (isSatellite) {
      // White halo over satellite imagery reads even harder than over Standard night;
      // pull the underglow up slightly so the line still has a halo at altitude.
      glowOpacity = Math.max(glowOpacity, 0.4);
      return {
        routeColor: ROUTE_CORE_HIGH_VIS,
        routeCasing: ROUTE_CASING_HIGH_VIS,
        passedColor: 'rgba(220,230,245,0.6)',
        routeGlowColor: ROUTE_GLOW_HIGH_VIS,
        routeGlowOpacity: glowOpacity,
      };
    }

    return {
      routeColor: ROUTE_CORE_HIGH_VIS,
      routeCasing: ROUTE_CASING_HIGH_VIS,
      passedColor: ROUTE_PASSED_HIGH_VIS,
      routeGlowColor: ROUTE_GLOW_HIGH_VIS,
      routeGlowOpacity: glowOpacity,
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

/** Alternate route preview lines — Apple Maps idiom: dimmed iOS blue, slightly brighter on dark. */
export function effectiveAlternateRouteLineColor(
  mapLightPreset: MapboxLightPreset,
  isSatellite: boolean,
): string {
  if (isSatellite || mapLightPreset === 'night' || mapLightPreset === 'dusk') {
    return 'rgba(94,168,255,0.7)';
  }
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
 * Satellite config — mirrors the Standard config so 3D buildings and road labels
 * render on top of aerial imagery while SnapRoad owns business POI rendering.
 * show3dObjects enables extruded buildings on Standard-Satellite just as it does on Standard.
 *
 * @see https://docs.mapbox.com/map-styles/standard/api/ (Standard-Satellite table)
 */
function standardSatelliteBasemapConfig(
  lightPreset: MapboxLightPreset,
  isNavigating: boolean,
): Record<string, string> {
  return {
    lightPreset,
    // 3D buildings + landmarks on top of satellite imagery.
    show3dObjects: 'true',
    show3dBuildings: 'true',
    show3dLandmarks: 'true',
    show3dFacades: 'true',
    ...(isNavigating ? { show3dTrees: 'false' } : { show3dTrees: 'true' }),
    // SnapRoad renders business POIs through MarkerView so Mapbox labels do not double-stack underneath.
    showPointOfInterestLabels: 'false',
    showPlaceLabels: 'true',
    showRoadLabels: 'true',
    showTransitLabels: 'false',
    showPedestrianRoads: 'true',
    showAdminBoundaries: 'true',
    densityPointOfInterestLabels: '1',
    showLandmarkIcons: 'false',
    showLandmarkIconLabels: 'false',
    ...poiAndLabelBoostForDarkBasemap(lightPreset),
  };
}

/** Keep any future Standard label tuning centralized so unknown config keys do not reject the style import. */
function poiAndLabelBoostForDarkBasemap(
  lightPreset: MapboxLightPreset,
): Record<string, string> {
  void lightPreset;
  return {};
}

/**
 * Basemap config for {@link usesStandardStyleConfiguration} styles (`StyleImport` id `basemap`).
 * Values are strings — required by `@rnmapbox/maps` StyleImport on the native bridge.
 *
 * Only keys from the public Standard API are included. Unknown keys can cause the
 * native bridge to reject the whole `config` object (see mapbox style docs), so
 * we avoid experimental properties.
 * Business POIs are intentionally disabled in the basemap. The app renders a curated,
 * zoom-filtered SnapRoad POI layer so native labels do not collide with custom markers.
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
  if (isSatellite) {
    return standardSatelliteBasemapConfig(lightPreset, isNavigating);
  }
  return {
    lightPreset,
    // 3D geometry — granular flags keep building meshes readable (trees optional while navigating).
    show3dObjects: 'true',
    show3dBuildings: 'true',
    show3dLandmarks: 'true',
    show3dFacades: 'true',
    ...(isNavigating ? { show3dTrees: 'false' } : { show3dTrees: 'true' }),
    // Label layers — keep roads/places, but disable business POIs to avoid double-labeling.
    showPointOfInterestLabels: 'false',
    showPlaceLabels: 'true',
    showRoadLabels: 'true',
    showTransitLabels: 'false',
    showPedestrianRoads: 'true',
    showAdminBoundaries: 'true',
    densityPointOfInterestLabels: '1',
    showLandmarkIcons: 'false',
    showLandmarkIconLabels: 'false',
    ...poiAndLabelBoostForDarkBasemap(lightPreset),
  };
}
