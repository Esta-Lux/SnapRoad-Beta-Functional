import React, { useMemo } from 'react';
import MapboxGL from '../../utils/mapbox';
import type { Coordinate } from '../../types';
import { coordinateAtCumulativeMeters, polylineLengthMeters } from '../../utils/distance';

type Props = {
  polyline: Coordinate[];
  cumFromStartMeters: number;
  /** Stroke color — use mode route color for alignment with ahead line. */
  lineColor: string;
  /** Segment length along route (meters). */
  segmentMeters?: number;
};

/**
 * Short ahead segment on the route polyline (vector line, not a rasterized point).
 * Renders above `sr-route-ahead` so it reads as a clean “route arrow” cue.
 */
export default React.memo(function RouteAheadArrowLayer({
  polyline,
  cumFromStartMeters,
  lineColor,
  segmentMeters = 48,
}: Props) {
  const shape = useMemo((): GeoJSON.FeatureCollection => {
    if (polyline.length < 2) return { type: 'FeatureCollection', features: [] };
    const total = polylineLengthMeters(polyline);
    const endCum = Math.min(cumFromStartMeters + segmentMeters, Math.max(cumFromStartMeters + 2, total - 0.3));
    const a = coordinateAtCumulativeMeters(polyline, cumFromStartMeters);
    const b = coordinateAtCumulativeMeters(polyline, endCum);
    if (!a || !b) return { type: 'FeatureCollection', features: [] };
    const d =
      (a.lat - b.lat) ** 2 + (a.lng - b.lng) ** 2 < 1e-14
        ? null
        : {
            type: 'Feature' as const,
            properties: {},
            geometry: {
              type: 'LineString' as const,
              coordinates: [
                [a.lng, a.lat],
                [b.lng, b.lat],
              ],
            },
          };
    return {
      type: 'FeatureCollection',
      features: d ? [d] : [],
    };
  }, [polyline, cumFromStartMeters, segmentMeters]);

  if (!MapboxGL || shape.features.length === 0) return null;

  return (
    <MapboxGL.ShapeSource id="sr-route-ahead-arrow" shape={shape}>
      <MapboxGL.LineLayer
        id="sr-route-ahead-arrow-line"
        aboveLayerID="sr-route-ahead"
        style={{
          lineColor,
          lineWidth: 5,
          lineOpacity: 0.98,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
    </MapboxGL.ShapeSource>
  );
});
