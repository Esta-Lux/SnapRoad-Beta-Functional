import React, { useMemo, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, withRepeat, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import MapboxGL, { isMapAvailable } from '../../utils/mapbox';
import type { Offer, Coordinate } from '../../types';

interface Props {
  offers: Offer[];
  onOfferTap?: (offer: Offer) => void;
}

function gemColor(discount: number): string {
  if (discount >= 15) return '#8B5CF6';
  if (discount >= 5) return '#3B82F6';
  return '#22C55E';
}

export default function OfferMarkers({ offers, onOfferTap }: Props) {
  const pulseOpacity = useSharedValue(0.7);

  useEffect(() => {
    pulseOpacity.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true);
  }, []);

  const geoJSON = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: offers
      .filter((o) => o.lat != null && o.lng != null)
      .map((o) => ({
        type: 'Feature' as const,
        properties: {
          id: o.id,
          color: gemColor(o.discount_percent),
          size: o.business_type === 'chain' ? 40 : o.business_type === 'medium' ? 32 : 28,
          title: o.business_name,
          discount: `${o.discount_percent}%`,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [o.lng!, o.lat!],
        },
      })),
  }), [offers]);

  if (!isMapAvailable() || !MapboxGL || !offers.length) return null;

  return (
    <MapboxGL.ShapeSource
      id="sr-offers"
      shape={geoJSON as GeoJSON.FeatureCollection}
      cluster
      clusterMaxZoomLevel={13}
      clusterRadius={50}
      onPress={(e: any) => {
        const feature = e.features?.[0];
        if (!feature?.properties?.id) return;
        const offer = offers.find((o) => o.id === feature.properties.id);
        if (offer && onOfferTap) onOfferTap(offer);
      }}
    >
      <MapboxGL.CircleLayer
        id="sr-offers-cluster"
        filter={['has', 'point_count']}
        style={{
          circleColor: '#F59E0B',
          circleRadius: ['step', ['get', 'point_count'], 18, 5, 22, 10, 28],
          circleOpacity: 0.85,
          circleStrokeWidth: 2,
          circleStrokeColor: '#ffffff',
        }}
        minZoomLevel={11}
      />
      <MapboxGL.SymbolLayer
        id="sr-offers-cluster-count"
        filter={['has', 'point_count']}
        style={{
          textField: ['get', 'point_count_abbreviated'],
          textSize: 12,
          textColor: '#ffffff',
        }}
        minZoomLevel={11}
      />
      <MapboxGL.CircleLayer
        id="sr-offers-gems"
        filter={['!', ['has', 'point_count']]}
        style={{
          circleColor: ['get', 'color'],
          circleRadius: ['interpolate', ['linear'], ['zoom'], 11, 6, 15, 10, 18, 14],
          circleOpacity: ['interpolate', ['linear'], ['zoom'], 10, 0, 11, 0.85],
          circleStrokeWidth: 2,
          circleStrokeColor: '#ffffff',
        }}
        minZoomLevel={10}
      />
    </MapboxGL.ShapeSource>
  );
}
