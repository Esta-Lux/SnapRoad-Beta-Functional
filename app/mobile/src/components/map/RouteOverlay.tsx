import React, { useMemo } from 'react';
import MapboxGL from '../../utils/mapbox';
import type { Coordinate } from '../../types';
import { splitRouteByNearestPoint } from '../../utils/distance';

interface Props {
  polyline: Coordinate[];
  userLocation: Coordinate;
  isNavigating: boolean;
  routeColor: string;
  casingColor: string;
  passedColor: string;
}

export default function RouteOverlay({
  polyline,
  userLocation,
  isNavigating,
  routeColor,
  casingColor,
  passedColor,
}: Props) {
  const routeGeoJSON = useMemo(() => {
    if (!polyline.length || polyline.length < 2) {
      return { type: 'FeatureCollection' as const, features: [] };
    }

    if (!isNavigating) {
      return {
        type: 'FeatureCollection' as const,
        features: [
          {
            type: 'Feature' as const,
            properties: { segment: 'ahead' },
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
        properties: { segment: 'passed' },
        geometry: { type: 'LineString', coordinates: passed },
      });
    }
    if (ahead.length >= 2) {
      features.push({
        type: 'Feature',
        properties: { segment: 'ahead' },
        geometry: { type: 'LineString', coordinates: ahead },
      });
    }
    return { type: 'FeatureCollection' as const, features };
  }, [polyline, userLocation.lat, userLocation.lng, isNavigating]);

  if (!polyline.length || polyline.length < 2 || !MapboxGL) return null;

  return (
    <MapboxGL.ShapeSource id="sr-route" shape={routeGeoJSON as GeoJSON.FeatureCollection}>
      <MapboxGL.LineLayer
        id="sr-route-casing"
        filter={['==', ['get', 'segment'], 'ahead']}
        style={{
          lineColor: casingColor,
          lineWidth: 10,
          lineOpacity: 0.5,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
      <MapboxGL.LineLayer
        id="sr-route-ahead"
        filter={['==', ['get', 'segment'], 'ahead']}
        style={{
          lineColor: routeColor,
          lineWidth: 6,
          lineOpacity: 0.92,
          lineCap: 'round',
          lineJoin: 'round',
        }}
        aboveLayerID="sr-route-casing"
      />
      <MapboxGL.LineLayer
        id="sr-route-passed"
        filter={['==', ['get', 'segment'], 'passed']}
        style={{
          lineColor: passedColor,
          lineWidth: 4,
          lineOpacity: 0.4,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
    </MapboxGL.ShapeSource>
  );
}
