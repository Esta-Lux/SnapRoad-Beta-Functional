import React, { useMemo } from 'react';
import MapboxGL from '../../utils/mapbox';
import type { Incident } from '../../types';

function incidentWeight(type: string): number {
  if (type === 'accident') return 2;
  if (type === 'police') return 1.5;
  return 1;
}

interface Props {
  incidents: Incident[];
  visible: boolean;
}

const IncidentHeatmap = React.memo(function IncidentHeatmap({ incidents, visible }: Props) {
  const geoJSON = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: incidents
        .filter((inc) => inc.lat != null && inc.lng != null && isFinite(inc.lat) && isFinite(inc.lng))
        .map((inc) => ({
          type: 'Feature' as const,
          properties: { weight: incidentWeight(inc.type) },
          geometry: { type: 'Point' as const, coordinates: [inc.lng, inc.lat] },
        })),
    }),
    [incidents],
  );

  if (!visible || !incidents.length || !MapboxGL) return null;

  return (
    <MapboxGL.ShapeSource id="incident-heat" shape={geoJSON as GeoJSON.FeatureCollection}>
      <MapboxGL.HeatmapLayer
        id="incident-heatmap"
        style={{
          heatmapWeight: ['get', 'weight'],
          heatmapIntensity: ['interpolate', ['linear'], ['zoom'], 0, 1, 13, 3],
          heatmapColor: [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0,
            'rgba(33, 102, 172, 0)',
            0.15,
            'rgb(65, 105, 225)',
            0.35,
            'rgb(135, 206, 250)',
            0.55,
            'rgb(255, 255, 0)',
            0.75,
            'rgb(255, 140, 0)',
            1,
            'rgb(220, 20, 60)',
          ],
          heatmapRadius: ['interpolate', ['linear'], ['zoom'], 0, 2, 13, 20],
          heatmapOpacity: ['interpolate', ['linear'], ['zoom'], 13, 0.8, 16, 0],
        }}
        minZoomLevel={8}
        maxZoomLevel={15}
      />
    </MapboxGL.ShapeSource>
  );
});

export default IncidentHeatmap;
