import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapboxGL, { isMapAvailable } from '../../utils/mapbox';
import { sortAndCapMarkers, type MarkerCoordinate } from './markerDensity';

export type BusinessPoi = {
  id: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
  place_id?: string;
  types?: string[];
  rating?: number;
  photo_reference?: string;
  open_now?: boolean;
  price_level?: number;
};

interface Props {
  pois: BusinessPoi[];
  zoomLevel: number;
  referenceCoordinate?: MarkerCoordinate | null;
  onPoiTap?: (poi: BusinessPoi) => void;
}

function iconForPoi(types?: string[]): keyof typeof Ionicons.glyphMap {
  const t = (types || []).join(' ').toLowerCase();
  if (t.includes('gas')) return 'car';
  if (t.includes('restaurant') || t.includes('meal') || t.includes('food')) return 'restaurant';
  if (t.includes('cafe') || t.includes('coffee') || t.includes('bakery')) return 'cafe';
  if (t.includes('parking')) return 'car';
  if (t.includes('charging')) return 'flash';
  if (t.includes('store') || t.includes('supermarket')) return 'storefront';
  return 'business';
}

function colorForPoi(types?: string[]): string {
  const t = (types || []).join(' ').toLowerCase();
  if (t.includes('gas') || t.includes('charging')) return '#0F766E';
  if (t.includes('restaurant') || t.includes('cafe') || t.includes('food')) return '#C2410C';
  if (t.includes('parking')) return '#2563EB';
  if (t.includes('store') || t.includes('supermarket')) return '#7C3AED';
  return '#334155';
}

export default React.memo(function BusinessPoiMarkers({
  pois,
  zoomLevel,
  referenceCoordinate = null,
  onPoiTap,
}: Props) {
  const markers = useMemo(
    () => sortAndCapMarkers(pois, referenceCoordinate, zoomLevel, 'businessPoi'),
    [pois, referenceCoordinate, zoomLevel],
  );

  if (!isMapAvailable() || !MapboxGL || markers.length === 0) return null;
  const MB = MapboxGL;

  return (
    <>
      {markers.map((poi) => {
        const fill = colorForPoi(poi.types);
        return (
          <MB.MarkerView
            key={poi.id}
            id={`sr-business-poi-${poi.id}`}
            coordinate={[poi.lng, poi.lat]}
            anchor={{ x: 0.5, y: 0.5 }}
            allowOverlap
            allowOverlapWithPuck
          >
            <Pressable
              onPress={() => onPoiTap?.(poi)}
              style={({ pressed }) => [styles.hit, pressed && styles.hitPressed]}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={`Business point of interest: ${poi.name}`}
            >
              <View style={[styles.outer, { backgroundColor: `${fill}28`, borderColor: 'rgba(255,255,255,0.86)' }]}>
                <View style={[styles.inner, { backgroundColor: fill }]}>
                  <Ionicons name={iconForPoi(poi.types)} size={12} color="#FFFFFF" />
                </View>
              </View>
            </Pressable>
          </MB.MarkerView>
        );
      })}
    </>
  );
});

const styles = StyleSheet.create({
  hit: { alignItems: 'center', justifyContent: 'center' },
  hitPressed: { opacity: 0.88, transform: [{ scale: 0.96 }] },
  outer: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.26,
        shadowRadius: 3,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  inner: {
    width: 23,
    height: 23,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
