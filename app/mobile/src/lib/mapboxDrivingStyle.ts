import type { DrivingMode } from '../types';
import type { ModeConfig } from '../constants/modes';
import { DRIVING_MODES } from '../constants/modes';

function passthroughRouteColors(modeConfig: ModeConfig): EffectiveRouteColors {
  const { routeColor, routeCasing, passedColor, routeGlowColor, routeGlowOpacity } = modeConfig;
  return { routeColor, routeCasing, passedColor, routeGlowColor, routeGlowOpacity };
}

export type MapboxLightPreset = 'dawn' | 'day' | 'dusk' | 'night';

export type EffectiveRouteColors = {
  routeColor: string;
  routeCasing: string;
  passedColor: string;
  routeGlowColor: string;
  routeGlowOpacity: number;
};

function isNearWhiteRouteLine(hex: string): boolean {
  const t = hex.trim().toLowerCase();
  return t === '#fff' || t === '#ffffff' || t === 'white';
}

/**
 * Keeps the driven route readable on Mapbox Standard (night / dusk) and on satellite.
 * Sport uses a dedicated high-contrast palette from {@link DRIVING_MODES.sport} — do not
 * remap it to the generic “night blue” line.
 */
export function effectiveNavRouteColors(
  modeConfig: ModeConfig,
  mapLightPreset: MapboxLightPreset,
  isSatellite: boolean,
  drivingMode?: DrivingMode,
): EffectiveRouteColors {
  const { routeColor, routeCasing, passedColor, routeGlowColor, routeGlowOpacity } = modeConfig;
  const whiteCore = isNearWhiteRouteLine(routeColor);
  const dawnOrDay = mapLightPreset === 'dawn' || mapLightPreset === 'day';
  const dusk = mapLightPreset === 'dusk';
  const night = mapLightPreset === 'night';

  if (drivingMode === 'sport') {
    return passthroughRouteColors(modeConfig);
  }

  if (isSatellite) {
    if (whiteCore) {
      return {
        routeColor: '#FBBF24',
        routeCasing: '#0C0A09',
        passedColor: 'rgba(148,163,184,0.55)',
        routeGlowColor: '#F59E0B',
        routeGlowOpacity: Math.max(routeGlowOpacity, 0.28),
      };
    }
    return {
      routeColor,
      routeCasing: '#0F172A',
      passedColor,
      routeGlowColor,
      routeGlowOpacity: Math.max(routeGlowOpacity, 0.22),
    };
  }

  if (whiteCore && dawnOrDay) {
    return {
      routeColor: '#EA580C',
      routeCasing: '#1E293B',
      passedColor: '#94A3B8',
      routeGlowColor: '#FB923C',
      routeGlowOpacity: Math.max(routeGlowOpacity, 0.22),
    };
  }

  if (whiteCore && night) {
    return {
      routeColor: '#F59E0B',
      routeCasing: '#0F0D1A',
      passedColor: 'rgba(148,163,184,0.5)',
      routeGlowColor: '#FBBF24',
      routeGlowOpacity: Math.max(routeGlowOpacity, 0.32),
    };
  }

  if (whiteCore && dusk) {
    return {
      routeColor: '#C4956A',
      routeCasing: '#1E1B4B',
      passedColor: 'rgba(148,163,184,0.6)',
      routeGlowColor: '#C4956A',
      routeGlowOpacity: Math.max(routeGlowOpacity, 0.26),
    };
  }

  if (night && !whiteCore) {
    return {
      routeColor: '#60A5FA',
      routeCasing: '#0C1A3D',
      passedColor: 'rgba(148,163,184,0.55)',
      routeGlowColor: '#93C5FD',
      routeGlowOpacity: Math.max(routeGlowOpacity, 0.28),
    };
  }

  return { routeColor, routeCasing, passedColor, routeGlowColor, routeGlowOpacity };
}

/** Unselected route preview lines on satellite / night. */
export function effectiveAlternateRouteLineColor(
  mapLightPreset: MapboxLightPreset,
  isSatellite: boolean,
): string {
  if (isSatellite) return '#E2E8F0';
  if (mapLightPreset === 'night') return '#CBD5E1';
  return '#9CA3AF';
}

/**
 * Maps app driving mode + app light/dark theme to Mapbox Standard `lightPreset`.
 * Dark UI theme always uses `night` on the basemap for a neutral, readable map.
 */
export function getDrivingLightPreset(
  drivingMode: DrivingMode,
  isLightAppTheme: boolean,
): MapboxLightPreset {
  if (!isLightAppTheme) return 'night';
  return DRIVING_MODES[drivingMode].lightPreset;
}

/** Base URLs that support Standard style configuration (`StyleImport` / basemap config). */
export function usesStandardStyleConfiguration(url: string): boolean {
  return url.includes('mapbox://styles/mapbox/standard');
}

/**
 * Mapbox range 1–5. While browsing (not in turn-by-turn) we bias to 5 so storefronts / building names read.
 * During navigation, Calm stays slightly lighter than Sport to reduce clutter near the route.
 */
function resolvePoiLabelDensity(drivingMode: DrivingMode, isNavigating: boolean): string {
  if (!isNavigating) return '5';
  if (drivingMode === 'sport') return '5';
  if (drivingMode === 'calm') return '4';
  return '4';
}

/**
 * Standard-Satellite documents a smaller property set than Mapbox Standard; avoid passing Standard-only
 * keys (e.g. show3dBuildings) so native StyleImport reliably applies label toggles.
 *
 * @see https://docs.mapbox.com/map-styles/standard/api/ (Standard vs Standard-Satellite tables)
 */
function standardSatelliteBasemapConfig(
  lightPreset: MapboxLightPreset,
  poiDensity: string,
): Record<string, string> {
  return {
    lightPreset,
    showRoadsAndTransit: 'true',
    showPedestrianRoads: 'true',
    showPlaceLabels: 'true',
    showPointOfInterestLabels: 'true',
    showRoadLabels: 'true',
    showTransitLabels: 'true',
    showAdminBoundaries: 'true',
    colorModePointOfInterestLabels: 'default',
    backgroundPointOfInterestLabels: 'circle',
    densityPointOfInterestLabels: poiDensity,
  };
}

/**
 * Basemap config for {@link usesStandardStyleConfiguration} styles (`StyleImport` id `basemap`).
 * Values are strings — required by `@rnmapbox/maps` StyleImport.
 *
 * Enables POI / place / road / transit labels, 3D buildings + landmarks (not only generic `show3dObjects`),
 * and tunes POI label density per driving mode + browse vs navigation.
 *
 * @see https://docs.mapbox.com/map-styles/standard/api/
 */
export function standardBasemapStyleImportConfig(
  lightPreset: MapboxLightPreset,
  isSatellite: boolean,
  drivingMode: DrivingMode = 'adaptive',
  /** When `false` (map explore / browse), POI density is maximized for business & building labels. */
  isNavigating = true,
): Record<string, string> {
  const poiDensity = resolvePoiLabelDensity(drivingMode, isNavigating);
  if (isSatellite) {
    return standardSatelliteBasemapConfig(lightPreset, poiDensity);
  }
  return {
    lightPreset,
    show3dObjects: 'true',
    show3dBuildings: 'true',
    show3dLandmarks: 'true',
    showPointOfInterestLabels: 'true',
    showPlaceLabels: 'true',
    showRoadLabels: 'true',
    showTransitLabels: 'true',
    showPedestrianRoads: 'true',
    showLandmarkIcons: 'true',
    showLandmarkIconLabels: 'true',
    colorModePointOfInterestLabels: 'default',
    backgroundPointOfInterestLabels: 'circle',
    densityPointOfInterestLabels: poiDensity,
  };
}
