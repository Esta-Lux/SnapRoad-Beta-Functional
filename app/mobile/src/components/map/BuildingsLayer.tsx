import React from 'react';
import type { FillExtrusionLayerStyle } from '@rnmapbox/maps';
import MapboxGL, { isMapAvailable } from '../../utils/mapbox';
import type { DrivingMode } from '../../types';

interface Props {
  drivingMode?: DrivingMode;
  isLight?: boolean;
  isNavigating?: boolean;
  activeStyleURL?: string;
  /** Inserts 3D buildings below this style layer so road/POI labels and the puck read cleanly on top. */
  belowLayerID?: string;
}

// Building extrusion colour palettes per mode
const CALM_COLORS = {
  explore:  { low: '#f0ead8', mid: '#e4d9c0', high: '#d8ccaa', opacity: 0.45 },
  navigate: { low: '#eee7d5', mid: '#dfd3bc', high: '#cec4a4', opacity: 0.55 },
};

const SPORT_COLORS = {
  explore:  { low: '#2a2438', mid: '#3d3550', high: '#524668', opacity: 0.72 },
  navigate: { low: '#252038', mid: '#38304d', high: '#4c4262', opacity: 0.8 },
};

const ADAPTIVE_COLORS = { low: '#d4d4d8', mid: '#c0c0c8', high: '#b0b0b8', opacity: 0.75 };

// Only Mapbox Studio / classic styles ship a "composite" vector source that
// contains a "building" source-layer. Custom or non-Mapbox styles don't, and
// referencing a missing source causes dozens of native errors per second.
const STYLES_WITH_COMPOSITE = [
  'streets-v', 'navigation-', 'dark-v', 'light-v', 'outdoors-v',
  'satellite-streets-v',
];

const STYLES_WITHOUT_BUILDINGS = [
  '/standard', '/standard-satellite',
];

function hasCompositeSource(url: string): boolean {
  if (!url) return false;
  if (STYLES_WITHOUT_BUILDINGS.some((s) => url.includes(s))) return false;
  return STYLES_WITH_COMPOSITE.some((s) => url.includes(s));
}

/** Sport + dark / navigation-night basemaps, or profile dark theme on streets: Mapbox flat light + emissive/flood extrusions. */
export function shouldUseMapboxBuildingNightEffects(
  activeStyleURL: string,
  drivingMode: DrivingMode,
  isLight = true,
): boolean {
  if (!hasCompositeSource(activeStyleURL)) return false;
  if (drivingMode === 'sport') return true;
  if (activeStyleURL.includes('dark-v')) return true;
  if (activeStyleURL.includes('navigation-night')) return true;
  if (!isLight && activeStyleURL.includes('streets-v')) return true;
  return false;
}

export default React.memo(function BuildingsLayer({
  drivingMode = 'adaptive',
  isLight = true,
  isNavigating = false,
  activeStyleURL = '',
  belowLayerID,
}: Props) {
  if (!isMapAvailable() || !MapboxGL) return null;
  if (!hasCompositeSource(activeStyleURL)) return null;

  const isCalm  = drivingMode === 'calm';
  const isSport = drivingMode === 'sport';

  const isClassic = hasCompositeSource(activeStyleURL);

  let colors: { low: string; mid: string; high: string; opacity: number };
  if (isCalm) {
    colors = isNavigating ? CALM_COLORS.navigate : CALM_COLORS.explore;
  } else if (isSport) {
    colors = isNavigating ? SPORT_COLORS.navigate : SPORT_COLORS.explore;
  } else {
    colors = isLight ? ADAPTIVE_COLORS : SPORT_COLORS.explore;
  }

  const nightEffects = shouldUseMapboxBuildingNightEffects(activeStyleURL, drivingMode, isLight);
  const opacityCap = nightEffects ? (isSport ? 0.66 : 0.52) : 0.4;
  const opacity = isClassic ? Math.min(colors.opacity, opacityCap) : colors.opacity;

  const baseStyle = {
    fillExtrusionColor: [
      'interpolate', ['linear'], ['get', 'height'],
      0, colors.low,
      50, colors.mid,
      200, colors.high,
    ],
    fillExtrusionHeight: [
      'interpolate', ['linear'], ['zoom'],
      14.5, 0,
      15, ['get', 'height'],
    ],
    fillExtrusionBase: [
      'interpolate', ['linear'], ['zoom'],
      14.5, 0,
      15, ['get', 'min_height'],
    ],
    fillExtrusionOpacity: Math.min(opacity, 0.55),
    fillExtrusionVerticalGradient: true,
  };

  const nightStyle = nightEffects
    ? {
        // Slight edge radius unlocks wall AO when flat lights are active (Mapbox GL).
        fillExtrusionEdgeRadius: 0.9,
        fillExtrusionEmissiveStrength: isSport ? 0.58 : 0.38,
        fillExtrusionFloodLightColor: isSport ? '#FFC78A' : '#A8BCE8',
        fillExtrusionFloodLightIntensity: isSport ? 0.34 : 0.19,
        fillExtrusionFloodLightWallRadius: 34,
        fillExtrusionFloodLightGroundRadius: 48,
        fillExtrusionFloodLightGroundAttenuation: isSport ? 0.62 : 0.7,
        fillExtrusionAmbientOcclusionIntensity: isSport ? 0.38 : 0.28,
        fillExtrusionAmbientOcclusionWallRadius: 3.2,
        fillExtrusionAmbientOcclusionGroundRadius: 22,
        fillExtrusionAmbientOcclusionGroundAttenuation: 0.55,
      }
    : {};

  try {
    return (
      <MapboxGL.FillExtrusionLayer
        id="sr-3d-buildings"
        existing={false}
        sourceID="composite"
        sourceLayerID="building"
        belowLayerID={belowLayerID}
        filter={['==', ['get', 'extrude'], 'true']}
        minZoomLevel={14.5}
        maxZoomLevel={22}
        style={{ ...baseStyle, ...nightStyle } as unknown as FillExtrusionLayerStyle}
      />
    );
  } catch {
    return null;
  }
});
