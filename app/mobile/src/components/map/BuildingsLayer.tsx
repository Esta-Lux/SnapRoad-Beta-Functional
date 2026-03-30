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

export default React.memo(function BuildingsLayer({
  drivingMode = 'adaptive',
  isLight = true,
  isNavigating = false,
  activeStyleURL = '',
}: Props) {
  if (!isMapAvailable() || !MapboxGL) return null;

  const isCalm  = drivingMode === 'calm';
  const isSport = drivingMode === 'sport';

  // Whether we're on a classic Mapbox style (streets-v12, navigation-night-v1, etc.)
  // Classic styles render their own label layers internally; we use a very low layerIndex
  // and reduced opacity so building-name labels still show through our extrusion.
  const isClassic = (
    activeStyleURL.includes('streets-v') ||
    activeStyleURL.includes('navigation-') ||
    activeStyleURL.includes('dark-v') ||
    activeStyleURL.includes('light-v') ||
    activeStyleURL.includes('outdoors-v')
  );

  let colors: { low: string; mid: string; high: string; opacity: number };
  if (isCalm) {
    colors = isNavigating ? CALM_COLORS.navigate : CALM_COLORS.explore;
  } else if (isSport) {
    colors = isNavigating ? SPORT_COLORS.navigate : SPORT_COLORS.explore;
  } else {
    colors = isLight ? ADAPTIVE_COLORS : SPORT_COLORS.explore;
  }

  // On classic styles keep opacity low so building labels remain readable
  const opacity = isClassic ? Math.min(colors.opacity, 0.40) : colors.opacity;

  // Ambient occlusion: off for classic styles (labels already compete for space)
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
        minZoomLevel={14}
        maxZoomLevel={24}
        // Avoid hardcoded layer indexes; some styles have fewer layers and Android crashes.
        style={{
          fillExtrusionColor: [
            'interpolate', ['linear'], ['get', 'height'],
            0,   colors.low,
            50,  colors.mid,
            200, colors.high,
          ],
          fillExtrusionHeight: [
            'interpolate', ['linear'], ['zoom'],
            14, 0,
            14.5, ['get', 'height'],
          ],
          fillExtrusionBase: [
            'interpolate', ['linear'], ['zoom'],
            14, 0,
            14.5, ['get', 'min_height'],
          ],
          fillExtrusionOpacity: opacity,
          fillExtrusionVerticalGradient: true,
          fillExtrusionAmbientOcclusionIntensity: aoIntensity,
          fillExtrusionAmbientOcclusionRadius: aoRadius,
        }}
      />
    );
  } catch {
    return null;
  }
});
