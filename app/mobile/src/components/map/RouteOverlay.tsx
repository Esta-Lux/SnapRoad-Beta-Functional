import React, { useMemo } from 'react';
import MapboxGL from '../../utils/mapbox';
import type { Coordinate } from '../../types';
import type { CongestionLevel } from '../../lib/directions';
import { splitRouteByNearestPoint } from '../../utils/distance';

interface Props {
  polyline: Coordinate[];
  userLocation: Coordinate;
  isNavigating: boolean;
  /** From `DRIVING_MODES[drivingMode]` */
  routeColor: string;
  casingColor: string;
  passedColor: string;
  routeWidth?: number;
  glowColor?: string;
  glowOpacity?: number;
  congestion?: CongestionLevel[];
  showCongestion?: boolean;
  isRerouting?: boolean;
}

const CONGESTION_COLORS: Record<string, string> = {
  low: '#34C759',
  moderate: '#FFD60A',
  heavy: '#FF9500',
  severe: '#FF3B30',
  unknown: '#4A90D9',
};

export default React.memo(function RouteOverlay({
  polyline,
  userLocation,
  isNavigating,
  routeColor,
  casingColor,
  passedColor,
  routeWidth = 6,
  glowColor,
  glowOpacity = 0.15,
  congestion,
  showCongestion = false,
  isRerouting = false,
}: Props) {
  const hasCongestion = showCongestion && congestion && congestion.length > 0;

  const geoJSON = useMemo(() => {
    if (polyline.length < 2)
      return { type: 'FeatureCollection' as const, features: [] };

    if (!isNavigating) {
      if (hasCongestion) {
        return buildCongestionFeatures(polyline, congestion!, 'ahead');
      }
      return {
        type: 'FeatureCollection' as const,
        features: [
          {
            type: 'Feature' as const,
            properties: { segment: 'ahead', congestion: 'unknown' },
            geometry: {
              type: 'LineString' as const,
              coordinates: polyline.map((p) => [p.lng, p.lat]),
            },
          },
        ],
      };
    }

    const { passed, ahead } = splitRouteByNearestPoint(polyline, userLocation);
    const features: GeoJSON.Feature[] = [];

    if (passed.length >= 2) {
      features.push({
        type: 'Feature',
        properties: { segment: 'passed', congestion: 'passed' },
        geometry: { type: 'LineString', coordinates: passed },
      });
    }

    if (ahead.length >= 2) {
      if (hasCongestion) {
        const aheadCoords = ahead.map((c) =>
          typeof c[0] === 'number' ? { lng: c[0] as number, lat: c[1] as number } : c,
        ) as Coordinate[];
        const offset = polyline.length - aheadCoords.length;
        const aheadCongestion = congestion!.slice(Math.max(0, offset));
        const cf = buildCongestionFeatures(aheadCoords, aheadCongestion, 'ahead');
        features.push(...cf.features);
      } else {
        features.push({
          type: 'Feature',
          properties: { segment: 'ahead', congestion: 'unknown' },
          geometry: { type: 'LineString', coordinates: ahead },
        });
      }
    }

    return { type: 'FeatureCollection' as const, features };
  }, [polyline, userLocation.lat, userLocation.lng, isNavigating, hasCongestion, congestion]);

  if (polyline.length < 2 || !MapboxGL) return null;

  const useCongestionColor = hasCongestion;

  const aheadLineColor: any = useCongestionColor
    ? [
        'match',
        ['get', 'congestion'],
        'low', CONGESTION_COLORS.low,
        'moderate', CONGESTION_COLORS.moderate,
        'heavy', CONGESTION_COLORS.heavy,
        'severe', CONGESTION_COLORS.severe,
        routeColor,
      ]
    : routeColor;

  const lineOpacity = isRerouting ? 0.35 : 1.0;
  const effectiveGlowColor = glowColor || routeColor;

  return (
    <MapboxGL.ShapeSource
      id="sr-route"
      shape={geoJSON as GeoJSON.FeatureCollection}
      lineMetrics={false}
    >
      <MapboxGL.LineLayer
        id="sr-route-glow"
        filter={['==', ['get', 'segment'], 'ahead']}
        style={{
          lineColor: useCongestionColor ? aheadLineColor : effectiveGlowColor,
          lineWidth: routeWidth * 2.8,
          lineOpacity: glowOpacity * (isRerouting ? 0.3 : 1),
          lineBlur: 6,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />

      <MapboxGL.LineLayer
        id="sr-route-casing"
        filter={['==', ['get', 'segment'], 'ahead']}
        style={{
          lineColor: casingColor,
          lineWidth: routeWidth + 3,
          lineOpacity: 0.7 * (isRerouting ? 0.5 : 1),
          lineCap: 'round',
          lineJoin: 'round',
        }}
        aboveLayerID="sr-route-glow"
      />

      <MapboxGL.LineLayer
        id="sr-route-ahead"
        filter={['==', ['get', 'segment'], 'ahead']}
        style={{
          lineColor: aheadLineColor,
          lineWidth: routeWidth,
          lineOpacity,
          lineCap: 'round',
          lineJoin: 'round',
        }}
        aboveLayerID="sr-route-casing"
      />

      {/* ASCII chevron — more reliable on native Mapbox text than emoji / exotic Unicode */}
      <MapboxGL.SymbolLayer
        id="sr-route-chevrons"
        filter={['==', ['get', 'segment'], 'ahead']}
        style={{
          symbolPlacement: 'line',
          symbolSpacing: 55,
          textField: '>',
          textSize: [
            'interpolate', ['linear'], ['zoom'],
            13, 12,
            16, 16,
            20, 20,
          ],
          textColor: '#FFFFFF',
          textOpacity: isRerouting ? 0.2 : 0.65,
          textRotationAlignment: 'map',
          textAllowOverlap: true,
          textIgnorePlacement: true,
          textFont: ['DIN Pro Medium', 'Arial Unicode MS Regular'],
        }}
        aboveLayerID="sr-route-ahead"
      />

      <MapboxGL.LineLayer
        id="sr-route-passed"
        filter={['==', ['get', 'segment'], 'passed']}
        style={{
          lineColor: passedColor,
          lineWidth: Math.max(4, routeWidth - 1),
          lineOpacity: 0.5,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
    </MapboxGL.ShapeSource>
  );
});

function buildCongestionFeatures(
  coords: Coordinate[],
  congestion: CongestionLevel[],
  segment: string,
): { type: 'FeatureCollection'; features: GeoJSON.Feature[] } {
  const features: GeoJSON.Feature[] = [];
  if (coords.length < 2) return { type: 'FeatureCollection', features };

  let currentLevel = congestion[0] || 'unknown';
  let currentCoords: [number, number][] = [[coords[0].lng, coords[0].lat]];

  for (let i = 1; i < coords.length; i++) {
    const level = i - 1 < congestion.length ? congestion[i - 1] : 'unknown';
    const coord: [number, number] = [coords[i].lng, coords[i].lat];

    if (level !== currentLevel && currentCoords.length >= 1) {
      currentCoords.push(coord);
      features.push({
        type: 'Feature',
        properties: { segment, congestion: currentLevel },
        geometry: { type: 'LineString', coordinates: currentCoords },
      });
      currentLevel = level;
      currentCoords = [coord];
    } else {
      currentCoords.push(coord);
    }
  }

  if (currentCoords.length >= 2) {
    features.push({
      type: 'Feature',
      properties: { segment, congestion: currentLevel },
      geometry: { type: 'LineString', coordinates: currentCoords },
    });
  }

  return { type: 'FeatureCollection', features };
}
