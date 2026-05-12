import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapboxGL, { isMapAvailable } from '../../utils/mapbox';
import { sortAndCapMarkers, type MarkerCoordinate } from './markerDensity';

export type BusinessPoiProminence = 'major' | 'standard' | 'minor';

export type BusinessPoi = {
  id: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
  place_id?: string;
  types?: string[];
  rating?: number;
  user_ratings_total?: number;
  prominence?: BusinessPoiProminence;
  photo_reference?: string;
  open_now?: boolean;
  price_level?: number;
};

interface Props {
  pois: BusinessPoi[];
  zoomLevel: number;
  referenceCoordinate?: MarkerCoordinate | null;
  labelTheme: 'light' | 'dark';
  onPoiTap?: (poi: BusinessPoi) => void;
}

type PoiCategory =
  | 'restaurant'
  | 'gas_station'
  | 'shopping'
  | 'cafe'
  | 'hotel'
  | 'hospital'
  | 'bank'
  | 'parking'
  | 'entertainment'
  | 'fitness'
  | 'pharmacy'
  | 'grocery'
  | 'auto'
  | 'park'
  | 'business';

const CATEGORY_CONFIG: Record<PoiCategory, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
  restaurant: { icon: 'restaurant-outline', color: '#E66A2C', label: 'Restaurant' },
  gas_station: { icon: 'car-outline', color: '#159A78', label: 'Gas' },
  shopping: { icon: 'bag-handle-outline', color: '#6D63D9', label: 'Shopping' },
  cafe: { icon: 'cafe-outline', color: '#9B6A3D', label: 'Cafe' },
  hotel: { icon: 'bed-outline', color: '#2F6FDB', label: 'Hotel' },
  hospital: { icon: 'medical-outline', color: '#D94B5A', label: 'Medical' },
  bank: { icon: 'card-outline', color: '#168A95', label: 'Bank' },
  parking: { icon: 'car-sport-outline', color: '#64748B', label: 'Parking' },
  entertainment: { icon: 'film-outline', color: '#C24F8F', label: 'Entertainment' },
  fitness: { icon: 'barbell-outline', color: '#B7791F', label: 'Fitness' },
  pharmacy: { icon: 'medkit-outline', color: '#0E99B4', label: 'Pharmacy' },
  grocery: { icon: 'cart-outline', color: '#169B62', label: 'Grocery' },
  auto: { icon: 'construct-outline', color: '#536072', label: 'Auto' },
  park: { icon: 'leaf-outline', color: '#2F8F45', label: 'Park' },
  business: { icon: 'business-outline', color: '#42526B', label: 'Place' },
};

function categoryForPoi(types?: string[]): PoiCategory {
  const t = (types || []).join(' ').toLowerCase();
  if (t.includes('gas_station') || t.includes('electric_vehicle_charging')) return 'gas_station';
  if (t.includes('restaurant') || t.includes('meal_') || t.includes('food')) return 'restaurant';
  if (t.includes('cafe') || t.includes('bakery') || t.includes('coffee')) return 'cafe';
  if (t.includes('shopping') || t.includes('store') || t.includes('department_store')) return 'shopping';
  if (t.includes('supermarket') || t.includes('grocery')) return 'grocery';
  if (t.includes('lodging') || t.includes('hotel')) return 'hotel';
  if (t.includes('hospital') || t.includes('health')) return 'hospital';
  if (t.includes('pharmacy')) return 'pharmacy';
  if (t.includes('bank') || t.includes('atm')) return 'bank';
  if (t.includes('parking')) return 'parking';
  if (t.includes('movie_theater') || t.includes('bar') || t.includes('night_club')) return 'entertainment';
  if (t.includes('gym')) return 'fitness';
  if (t.includes('car_repair') || t.includes('car_wash')) return 'auto';
  if (t.includes('park')) return 'park';
  return 'business';
}

function prominenceForPoi(poi: BusinessPoi): BusinessPoiProminence {
  if (poi.prominence === 'major' || poi.prominence === 'standard' || poi.prominence === 'minor') {
    return poi.prominence;
  }
  const reviews = Number(poi.user_ratings_total ?? 0);
  const rating = Number(poi.rating ?? 0);
  if (rating >= 4 && reviews >= 500) return 'major';
  if (rating >= 3.5 && reviews >= 50) return 'standard';
  return 'minor';
}

function visibleAtZoom(poi: BusinessPoi, zoomLevel: number): boolean {
  const prominence = prominenceForPoi(poi);
  if (prominence === 'major') return zoomLevel >= 12.5;
  if (prominence === 'standard') return zoomLevel >= 14;
  return zoomLevel >= 15.75;
}

export default React.memo(function BusinessPoiMarkers({
  pois,
  zoomLevel,
  referenceCoordinate = null,
  labelTheme,
  onPoiTap,
}: Props) {
  const markers = useMemo(() => {
    const visible = pois.filter((poi) => visibleAtZoom(poi, zoomLevel));
    return sortAndCapMarkers(visible, referenceCoordinate, zoomLevel, 'businessPoi');
  }, [pois, referenceCoordinate, zoomLevel]);

  if (!isMapAvailable() || !MapboxGL || markers.length === 0) return null;
  const MB = MapboxGL;
  const darkLabel = labelTheme === 'dark';

  return (
    <>
      {markers.map((poi) => {
        const category = categoryForPoi(poi.types);
        const config = CATEGORY_CONFIG[category];
        const prominence = prominenceForPoi(poi);
        const showLabel = prominence !== 'minor';
        const scale = prominence === 'major' ? 1.08 : prominence === 'standard' ? 0.96 : 0.82;
        return (
          <MB.MarkerView
            key={poi.id}
            id={`sr-business-poi-${poi.id}`}
            coordinate={[poi.lng, poi.lat]}
            anchor={{ x: 0.5, y: 1 }}
            allowOverlap
            allowOverlapWithPuck
          >
            <Pressable
              onPress={() => onPoiTap?.(poi)}
              style={({ pressed }) => [
                styles.hit,
                { transform: [{ scale }], opacity: prominence === 'minor' ? 0.78 : 1 },
                pressed && styles.hitPressed,
              ]}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Business point of interest: ${poi.name}`}
            >
              {showLabel ? (
                <View
                  style={[
                    styles.labelWrap,
                    {
                      backgroundColor: darkLabel ? 'rgba(15,23,42,0.88)' : 'rgba(255,255,255,0.92)',
                      borderColor: darkLabel ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.10)',
                    },
                  ]}
                >
                  <Text style={[styles.label, { color: darkLabel ? '#F8FAFC' : '#111827' }]} numberOfLines={1}>
                    {poi.name}
                  </Text>
                  <Text style={[styles.sublabel, { color: config.color }]} numberOfLines={1}>
                    {config.label}
                  </Text>
                </View>
              ) : null}
              <View style={[styles.bubble, { backgroundColor: `${config.color}1F`, borderColor: `${config.color}CC` }]}>
                <Ionicons name={config.icon} size={14} color={config.color} />
              </View>
              <View style={[styles.stem, { backgroundColor: config.color }]} />
            </Pressable>
          </MB.MarkerView>
        );
      })}
    </>
  );
});

const styles = StyleSheet.create({
  hit: { alignItems: 'center', justifyContent: 'flex-end', minWidth: 42 },
  hitPressed: { opacity: 0.9 },
  labelWrap: {
    marginBottom: 5,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    minWidth: 74,
    maxWidth: 150,
    borderWidth: 1,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.14,
        shadowRadius: 5,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  sublabel: {
    marginTop: 1,
    fontSize: 8,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  bubble: {
    width: 31,
    height: 31,
    borderRadius: 15.5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.82)',
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 4,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  stem: {
    width: 2,
    height: 8,
    opacity: 0.42,
  },
});
