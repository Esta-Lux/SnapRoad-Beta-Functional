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

/** Day / dawn Standard — crisp iOS-style blue on light roads. */
const SNAP_ROUTE_CORE = '#0A84FF';
const SNAP_ROUTE_CASING_STD = '#032C66';
const SNAP_ROUTE_PASSED = 'rgba(10,132,255,0.42)';
const SNAP_ROUTE_GLOW = '#5EBBFF';

/** Night / dusk / satellite — same SnapRoad language but higher luminance so the line “glows” on dark imagery. */
const ROUTE_CORE_HIGH_VIS = '#38BDF8';
const ROUTE_CASING_HIGH_VIS = 'rgba(125,211,252,0.48)';
const ROUTE_PASSED_HIGH_VIS = 'rgba(56,189,248,0.55)';
const ROUTE_GLOW_HIGH_VIS = '#BAE6FD';

function useHighVisibilityRouteInk(
  mapLightPreset: MapboxLightPreset,
  isSatellite: boolean,
): boolean {
  if (isSatellite) return true;
  return mapLightPreset === 'night' || mapLightPreset === 'dusk';
}

/**
 * SnapRoad-blue route everywhere; night/dusk/satellite uses a brighter core + luminous casing
 * so it matches Adaptive’s “neon” readability on lighter maps instead of muddy navy.
 */
export function effectiveNavRouteColors(
  modeConfig: ModeConfig,
  mapLightPreset: MapboxLightPreset,
  isSatellite: boolean,
  drivingMode?: DrivingMode,
  options?: { speedMphForRoute?: number },
): EffectiveRouteColors {
  void drivingMode;
  void options;

  const highVis = useHighVisibilityRouteInk(mapLightPreset, isSatellite);

  let glowOpacity = Math.max(modeConfig.routeGlowOpacity, highVis ? 0.46 : 0.3);

  if (highVis) {
    if (isSatellite) {
      glowOpacity = Math.max(glowOpacity, 0.4);
      return {
        routeColor: ROUTE_CORE_HIGH_VIS,
        routeCasing: 'rgba(56,182,246,0.42)',
        passedColor: 'rgba(45,186,246,0.48)',
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
