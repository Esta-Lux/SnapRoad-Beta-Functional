import React, { useMemo } from 'react';
import MapboxGL, { isMapAvailable } from '../../utils/mapbox';

export interface TrafficSafetyZone {
  id: string;
  lat: number;
  lng: number;
  kind?: string;
  maxspeed?: string | null;
}

interface Props {
  zones: TrafficSafetyZone[];
  onZoneTap?: (z: TrafficSafetyZone) => void;
}

export default React.memo(function TrafficSafetyLayer({ zones, onZoneTap }: Props) {
  const geoJSON = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: zones
        .filter((z) => z.lat != null && z.lng != null && isFinite(z.lat) && isFinite(z.lng))
        .map((z) => ({
          type: 'Feature' as const,
          properties: { id: z.id, maxspeed: z.maxspeed ?? '' },
          geometry: { type: 'Point' as const, coordinates: [z.lng, z.lat] },
        })),
    }),
    [zones],
  );

  if (!isMapAvailable() || !MapboxGL || !zones.length) return null;

  return (
    <MapboxGL.ShapeSource
      id="sr-traffic-safety-zones"
      shape={geoJSON as GeoJSON.FeatureCollection}
      onPress={(e: any) => {
        const id = e.features?.[0]?.properties?.id;
        const z = zones.find((x) => String(x.id) === String(id));
        if (z && onZoneTap) onZoneTap(z);
      }}
    >
      <MapboxGL.CircleLayer
        id="sr-traffic-safety-glow"
        style={{
          circleColor: '#F59E0B',
          circleRadius: ['interpolate', ['linear'], ['zoom'], 10, 7, 14, 11, 18, 15],
          circleOpacity: 0.18,
          circleBlur: 0.65,
        }}
        minZoomLevel={9}
      />
      <MapboxGL.CircleLayer
        id="sr-traffic-safety-dot"
        style={{
          circleColor: '#D97706',
          circleRadius: ['interpolate', ['linear'], ['zoom'], 10, 4, 14, 7, 18, 10],
          circleStrokeWidth: 2,
          circleStrokeColor: '#ffffff',
          circleOpacity: 0.95,
        }}
        minZoomLevel={9}
      />
    </MapboxGL.ShapeSource>
  );
});
