import React from 'react';
import MapboxGL, { isMapAvailable } from '../../utils/mapbox';
import { TRAFFIC_CLOSED_ROAD_HEX, TRAFFIC_CONGESTION_HEX } from '../../constants/trafficCongestion';

export default function TrafficLayer() {
  if (!isMapAvailable() || !MapboxGL) return null;

  return (
    <MapboxGL.VectorSource id="sr-traffic-source" url="mapbox://mapbox.mapbox-traffic-v1">
      <MapboxGL.LineLayer
        id="sr-traffic-low"
        sourceLayerID="traffic"
        filter={['==', ['get', 'congestion'], 'low']}
        style={{
          lineColor: TRAFFIC_CONGESTION_HEX.low,
          lineWidth: ['interpolate', ['linear'], ['zoom'], 10, 1, 14, 2, 18, 4],
          lineOpacity: 0.55,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
      <MapboxGL.LineLayer
        id="sr-traffic-moderate"
        sourceLayerID="traffic"
        filter={['==', ['get', 'congestion'], 'moderate']}
        style={{
          lineColor: TRAFFIC_CONGESTION_HEX.moderate,
          lineWidth: ['interpolate', ['linear'], ['zoom'], 10, 1.5, 14, 3, 18, 5],
          lineOpacity: 0.65,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
      <MapboxGL.LineLayer
        id="sr-traffic-heavy"
        sourceLayerID="traffic"
        filter={['==', ['get', 'congestion'], 'heavy']}
        style={{
          lineColor: TRAFFIC_CONGESTION_HEX.heavy,
          lineWidth: ['interpolate', ['linear'], ['zoom'], 10, 1.5, 14, 3, 18, 5],
          lineOpacity: 0.7,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
      <MapboxGL.LineLayer
        id="sr-traffic-severe"
        sourceLayerID="traffic"
        filter={['==', ['get', 'congestion'], 'severe']}
        style={{
          lineColor: TRAFFIC_CONGESTION_HEX.severe,
          lineWidth: ['interpolate', ['linear'], ['zoom'], 10, 2, 14, 4, 18, 6],
          lineOpacity: 0.75,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
      <MapboxGL.LineLayer
        id="sr-traffic-closed"
        sourceLayerID="traffic"
        filter={[
          'any',
          ['==', ['get', 'closed'], 'yes'],
          ['==', ['get', 'closed'], true],
        ]}
        style={{
          lineColor: TRAFFIC_CLOSED_ROAD_HEX,
          lineWidth: ['interpolate', ['linear'], ['zoom'], 10, 2, 14, 4, 18, 7],
          lineOpacity: 0.92,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
    </MapboxGL.VectorSource>
  );
}
