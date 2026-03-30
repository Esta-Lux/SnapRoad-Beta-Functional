import React, { useMemo } from 'react';
import MapboxGL, { isMapAvailable } from '../../utils/mapbox';

export interface FuelStation {
  id: string | number;
  name?: string;
  lat: number;
  lng: number;
  price?: number;
}

interface Props {
  stations: FuelStation[];
  visible: boolean;
  onStationTap?: (s: FuelStation) => void;
}

export default React.memo(function FuelStationMarkers({ stations, visible, onStationTap }: Props) {
  const geoJSON = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: stations
        .filter((s) => s.lat != null && s.lng != null && isFinite(s.lat) && isFinite(s.lng))
        .map((s) => ({
          type: 'Feature' as const,
          properties: {
            id: s.id,
            name: s.name ?? 'Gas Station',
            priceLabel: s.price != null ? `$${s.price.toFixed(2)}` : '',
          },
          geometry: { type: 'Point' as const, coordinates: [s.lng, s.lat] },
        })),
    }),
    [stations],
  );

  if (!isMapAvailable() || !MapboxGL || !visible || !stations.length) return null;

  return (
    <MapboxGL.ShapeSource
      id="sr-fuel-stations"
      shape={geoJSON as GeoJSON.FeatureCollection}
      onPress={(e: any) => {
        const id = e.features?.[0]?.properties?.id;
        const s = stations.find((x) => String(x.id) === String(id));
        if (s && onStationTap) onStationTap(s);
      }}
    >
      <MapboxGL.CircleLayer
        id="sr-fuel-glow"
        style={{
          circleColor: '#22C55E',
          circleRadius: ['interpolate', ['linear'], ['zoom'], 11, 10, 14, 16, 18, 22],
          circleOpacity: 0.15,
          circleBlur: 0.6,
        }}
        minZoomLevel={11}
      />
      <MapboxGL.CircleLayer
        id="sr-fuel-dot"
        style={{
          circleColor: '#22C55E',
          circleRadius: ['interpolate', ['linear'], ['zoom'], 11, 5, 14, 7, 18, 10],
          circleStrokeWidth: 2,
          circleStrokeColor: '#ffffff',
          circleOpacity: 0.9,
        }}
        minZoomLevel={11}
      />
      <MapboxGL.SymbolLayer
        id="sr-fuel-icon"
        style={{
          textField: '⛽',
          textSize: ['interpolate', ['linear'], ['zoom'], 13, 8, 16, 12, 18, 16],
          textAllowOverlap: true,
        }}
        minZoomLevel={14}
      />
      <MapboxGL.SymbolLayer
        id="sr-fuel-price"
        style={{
          textField: ['get', 'priceLabel'],
          textSize: 11,
          textFont: ['DIN Pro Medium', 'Arial Unicode MS Regular'],
          textColor: '#ffffff',
          textHaloColor: '#000000',
          textHaloWidth: 1,
          textOffset: [0, 1.4],
          textAllowOverlap: false,
        }}
        minZoomLevel={14}
      />
    </MapboxGL.ShapeSource>
  );
});
