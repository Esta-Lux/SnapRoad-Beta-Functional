import React from 'react';
import MapboxGL, { isMapAvailable } from '../../utils/mapbox';

export default function TrafficLayer() {
  if (!isMapAvailable() || !MapboxGL) return null;

  return (
    <MapboxGL.VectorSource id="sr-traffic-source" url="mapbox://mapbox.mapbox-traffic-v1">
      <MapboxGL.LineLayer
        id="sr-traffic-low"
        sourceLayerID="traffic"
        filter={['==', ['get', 'congestion'], 'low']}
        style={{
          lineColor: '#5AAA7A',
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
          lineColor: '#E8C44A',
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
          lineColor: '#E07830',
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
          lineColor: '#D04040',
          lineWidth: ['interpolate', ['linear'], ['zoom'], 10, 2, 14, 4, 18, 6],
          lineOpacity: 0.75,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
    </MapboxGL.VectorSource>
  );
}
