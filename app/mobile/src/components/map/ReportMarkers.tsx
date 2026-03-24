import React, { useMemo } from 'react';
import MapboxGL, { isMapAvailable } from '../../utils/mapbox';
import type { Incident } from '../../types';

interface Props {
  incidents: Incident[];
  onIncidentTap?: (incident: Incident) => void;
}

const COLORS: Record<string, string> = {
  police: '#3B82F6',
  accident: '#EF4444',
  hazard: '#F59E0B',
  construction: '#F59E0B',
  closure: '#EF4444',
  pothole: '#F97316',
  camera: '#8B5CF6',
};

export default function ReportMarkers({ incidents, onIncidentTap }: Props) {
  const geoJSON = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: incidents.map((inc) => ({
      type: 'Feature' as const,
      properties: { id: inc.id, type: inc.type, color: COLORS[inc.type] ?? '#F59E0B' },
      geometry: { type: 'Point' as const, coordinates: [inc.lng, inc.lat] },
    })),
  }), [incidents]);

  if (!isMapAvailable() || !MapboxGL || !incidents.length) return null;

  return (
    <MapboxGL.ShapeSource
      id="sr-reports"
      shape={geoJSON as GeoJSON.FeatureCollection}
      onPress={(e: any) => {
        const id = e.features?.[0]?.properties?.id;
        const inc = incidents.find((i) => i.id === id);
        if (inc && onIncidentTap) onIncidentTap(inc);
      }}
    >
      <MapboxGL.CircleLayer
        id="sr-reports-circle"
        style={{
          circleColor: ['get', 'color'],
          circleRadius: ['interpolate', ['linear'], ['zoom'], 10, 5, 14, 8, 18, 12],
          circleStrokeWidth: 2,
          circleStrokeColor: '#ffffff',
          circleOpacity: 0.9,
        }}
        minZoomLevel={10}
      />
    </MapboxGL.ShapeSource>
  );
}
