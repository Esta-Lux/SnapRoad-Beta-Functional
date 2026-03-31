import React from 'react';
import MapboxGL, { isMapAvailable } from '../../utils/mapbox';
import type { DrivingMode } from '../../types';

interface Props {
  drivingMode?: DrivingMode;
  isLight?: boolean;
  isNavigating?: boolean;
  activeStyleURL?: string;
}

// Building extrusion colour palettes per mode
const CALM_COLORS = {
  explore:  { low: '#f0ead8', mid: '#e4d9c0', high: '#d8ccaa', opacity: 0.45 },
  navigate: { low: '#eee7d5', mid: '#dfd3bc', high: '#cec4a4', opacity: 0.55 },
};

const SPORT_COLORS = {
  explore:  { low: '#1e2650', mid: '#252f66', high: '#2c387a', opacity: 0.65 },
  navigate: { low: '#1a2248', mid: '#20295e', high: '#273075', opacity: 0.75 },
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

export default React.memo(function BuildingsLayer({
  drivingMode = 'adaptive',
  isLight = true,
  isNavigating = false,
  activeStyleURL = '',
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

  const opacity = isClassic ? Math.min(colors.opacity, 0.40) : colors.opacity;

  const aoIntensity = isClassic ? 0 : isCalm ? (isNavigating ? 0.40 : 0.25) : 0.18;
  const aoRadius    = isClassic ? 0 : isCalm ? 3.5 : 2.5;

  try {
    return (
      <MapboxGL.FillExtrusionLayer
        id="sr-3d-buildings"
        existing={false}
        sourceID="composite"
        sourceLayerID="building"
        filter={['==', ['get', 'extrude'], 'true']}
        minZoomLevel={14.5}
        maxZoomLevel={22}
        style={{
          fillExtrusionColor: [
            'interpolate', ['linear'], ['get', 'height'],
            0,   colors.low,
            50,  colors.mid,
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
          fillExtrusionOpacity: Math.min(opacity, 0.5),
          fillExtrusionVerticalGradient: true,
        }}
      />
    );
  } catch {
    return null;
  }
});
