import React, { useMemo } from 'react';
import MapboxGL from '../../utils/mapbox';
import type { Coordinate } from '../../types';
import type { CongestionLevel } from '../../lib/directions';
import {
  buildRouteSplitRingsFromProgress,
  type RouteSplitForOverlay,
} from '../../utils/distance';
import { TRAFFIC_CONGESTION_HEX } from '../../constants/trafficCongestion';

interface Props {
  polyline: Coordinate[];
  isNavigating: boolean;
  /** Authoritative split from navigation (segmentIndex + tOnSegment); no GPS / projection in this component. */
  routeSplit?: RouteSplitForOverlay | null;
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

function lngLatToCoords(ring: [number, number][]): Coordinate[] {
  return ring.map(([lng, lat]) => ({ lng, lat }));
}

export default React.memo(function RouteOverlay({
  polyline,
  isNavigating,
  routeSplit = null,
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

  const fullCoords = useMemo(
    () => polyline.map((p): [number, number] => [p.lng, p.lat]),
    [polyline],
  );

  const geoJSON = useMemo(() => {
    if (polyline.length < 2)
      return { type: 'FeatureCollection' as const, features: [] };

    // Always include the full route as a 'base' feature so glow/casing are continuous.
    const baseLine: GeoJSON.Feature = {
      type: 'Feature',
      properties: { segment: 'base', congestion: 'unknown' },
      geometry: { type: 'LineString', coordinates: fullCoords },
    };

    if (!isNavigating || !routeSplit) {
      if (hasCongestion) {
        const cf = buildCongestionFeatures(polyline, congestion!, 'ahead');
        cf.features.unshift(baseLine);
        return cf;
      }
      return {
        type: 'FeatureCollection' as const,
        features: [
          baseLine,
          {
            type: 'Feature' as const,
            properties: { segment: 'ahead', congestion: 'unknown' },
            geometry: { type: 'LineString' as const, coordinates: fullCoords },
          },
        ],
      };
    }

    const rings = buildRouteSplitRingsFromProgress(
      polyline,
      routeSplit.segmentIndex,
      routeSplit.tOnSegment,
    );
    if (!rings) {
      return { type: 'FeatureCollection' as const, features: [] };
    }

    const features: GeoJSON.Feature[] = [baseLine];

    if (rings.passedLngLat.length >= 2) {
      features.push({
        type: 'Feature',
        properties: { segment: 'passed', congestion: 'passed' },
        geometry: { type: 'LineString', coordinates: rings.passedLngLat },
      });
    }

    if (rings.aheadLngLat.length >= 2) {
      const firstEdge = rings.firstAheadEdgeIndex;
      if (hasCongestion) {
        const aheadCoords = lngLatToCoords(rings.aheadLngLat);
        const edgeCount = aheadCoords.length - 1;
        const aheadCongestion: CongestionLevel[] = [];
        for (let e = 0; e < edgeCount; e++) {
          const edgeIdx = firstEdge + e;
          aheadCongestion.push(
            edgeIdx >= 0 && edgeIdx < congestion!.length ? congestion![edgeIdx]! : 'unknown',
          );
        }
        const cf = buildCongestionFeatures(aheadCoords, aheadCongestion, 'ahead');
        features.push(...cf.features);
      } else {
        features.push({
          type: 'Feature',
          properties: { segment: 'ahead', congestion: 'unknown' },
          geometry: { type: 'LineString', coordinates: rings.aheadLngLat },
        });
      }
    }

    return { type: 'FeatureCollection' as const, features };
  }, [polyline, fullCoords, isNavigating, routeSplit, hasCongestion, congestion, showCongestion]);

  if (polyline.length < 2 || !MapboxGL) return null;

  const useCongestionColor = hasCongestion;

  const aheadLineColor: any = useCongestionColor
    ? [
        'match',
        ['get', 'congestion'],
        'moderate',
        TRAFFIC_CONGESTION_HEX.moderate,
        'heavy',
        TRAFFIC_CONGESTION_HEX.heavy,
        'severe',
        TRAFFIC_CONGESTION_HEX.severe,
        'low',
        routeColor,
        'unknown',
        routeColor,
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
      {/* Continuous glow on the full-route base feature — no split seam */}
      <MapboxGL.LineLayer
        id="sr-route-glow"
        filter={['==', ['get', 'segment'], 'base']}
        style={{
          lineColor: effectiveGlowColor,
          lineWidth: routeWidth * 2.8,
          lineOpacity: glowOpacity * (isRerouting ? 0.3 : 1),
          lineBlur: 6,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />

      {/* Continuous casing on the full-route base feature */}
      <MapboxGL.LineLayer
        id="sr-route-casing"
        filter={['==', ['get', 'segment'], 'base']}
        style={{
          lineColor: casingColor,
          lineWidth: routeWidth + 3,
          lineOpacity: 0.7 * (isRerouting ? 0.5 : 1),
          lineCap: 'round',
          lineJoin: 'round',
        }}
        aboveLayerID="sr-route-glow"
      />

      {/* Passed (gray) route on top of casing */}
      <MapboxGL.LineLayer
        id="sr-route-passed"
        filter={['==', ['get', 'segment'], 'passed']}
        style={{
          lineColor: passedColor,
          lineWidth: routeWidth,
          lineOpacity: 0.85,
          lineCap: 'round',
          lineJoin: 'round',
        }}
        aboveLayerID="sr-route-casing"
      />

      {/* Ahead (colored) route on top of passed */}
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
        aboveLayerID="sr-route-passed"
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
