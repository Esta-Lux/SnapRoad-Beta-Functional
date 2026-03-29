import React, { useMemo } from 'react';
import MapboxGL, { isMapAvailable } from '../../utils/mapbox';

export interface PhotoReport {
  id: string | number;
  lat: number;
  lng: number;
  type: string;
  description?: string;
  created_at: string;
}

interface Props {
  reports: PhotoReport[];
  onReportTap?: (r: PhotoReport) => void;
}

export default React.memo(function PhotoReportMarkers({ reports, onReportTap }: Props) {
  const geoJSON = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: reports
        .filter((r) => r.lat != null && r.lng != null && isFinite(r.lat) && isFinite(r.lng))
        .map((r) => ({
          type: 'Feature' as const,
          properties: { id: r.id, type: r.type, description: r.description ?? '' },
          geometry: { type: 'Point' as const, coordinates: [r.lng, r.lat] },
        })),
    }),
    [reports],
  );

  if (!isMapAvailable() || !MapboxGL || !reports.length) return null;

  return (
    <MapboxGL.ShapeSource
      id="sr-photo-reports"
      shape={geoJSON as GeoJSON.FeatureCollection}
      onPress={(e: any) => {
        const id = e.features?.[0]?.properties?.id;
        const r = reports.find((x) => String(x.id) === String(id));
        if (r && onReportTap) onReportTap(r);
      }}
    >
      <MapboxGL.CircleLayer
        id="sr-photo-reports-glow"
        style={{
          circleColor: '#8B5CF6',
          circleRadius: ['interpolate', ['linear'], ['zoom'], 11, 10, 14, 16, 18, 22],
          circleOpacity: 0.15,
          circleBlur: 0.7,
        }}
        minZoomLevel={11}
      />
      <MapboxGL.CircleLayer
        id="sr-photo-reports-circle"
        style={{
          circleColor: '#8B5CF6',
          circleRadius: ['interpolate', ['linear'], ['zoom'], 11, 5, 14, 8, 18, 12],
          circleStrokeWidth: 2,
          circleStrokeColor: '#ffffff',
          circleOpacity: 0.92,
        }}
        minZoomLevel={11}
      />
      <MapboxGL.SymbolLayer
        id="sr-photo-reports-emoji"
        style={{
          textField: '📸',
          textSize: ['interpolate', ['linear'], ['zoom'], 11, 10, 15, 14, 18, 18],
          textAllowOverlap: true,
          textOffset: [0, -0.1],
        }}
        minZoomLevel={12}
      />
    </MapboxGL.ShapeSource>
  );
});
