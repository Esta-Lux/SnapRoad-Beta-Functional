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
  const sportLowLight = drivingMode === 'sport' && (night || dusk || isSatellite);

  if (drivingMode === 'sport' && sportLowLight) {
    return {
      /** Brighter core + light casing so the line reads on Mapbox Standard dusk / night and satellite. */
      routeColor: isSatellite ? '#FFCAA3' : night ? '#FFB184' : '#FF8C52',
      routeCasing: isSatellite ? '#0A1628' : 'rgba(255,255,255,0.88)',
      passedColor: isSatellite ? 'rgba(148,163,184,0.7)' : 'rgba(203, 213, 225, 0.65)',
      routeGlowColor: isSatellite ? '#FDE68A' : night ? '#FEF3C7' : '#FDE68A',
      routeGlowOpacity: Math.max(routeGlowOpacity, isSatellite ? 0.48 : night ? 0.46 : 0.44),
    };
  }

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
  };
}

/**
 * Basemap config for {@link usesStandardStyleConfiguration} styles (`StyleImport` id `basemap`).
 * Values are strings — required by `@rnmapbox/maps` StyleImport on the native bridge.
 *
 * Only officially documented Mapbox Standard API properties are used here.
 * Custom / unverified keys (show3dBuildings, show3dLandmarks, densityPointOfInterestLabels,
 * colorModePointOfInterestLabels, backgroundPointOfInterestLabels, showLandmarkIcons, etc.)
 * have been removed. When the native StyleImport receives unrecognised keys it can silently
 * reject the entire config object, leaving showPointOfInterestLabels unapplied → no POI labels.
 *
 * @see https://docs.mapbox.com/map-styles/standard/api/
 */
export function standardBasemapStyleImportConfig(
  lightPreset: MapboxLightPreset,
  isSatellite: boolean,
  drivingMode: DrivingMode = 'adaptive',
  isNavigating = true,
): Record<string, string> {
  // drivingMode / isNavigating reserved for future per-mode tuning once Mapbox
  // officially documents a density/style API (avoids re-adding unverified keys).
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
  };
}
