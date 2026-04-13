import React, { useMemo } from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapboxGL, { isMapAvailable } from '../../utils/mapbox';
import type { Offer } from '../../types';
import { sortAndCapMarkers, type MarkerCoordinate } from './markerDensity';

/**
 * Hide offer gems when zoomed out — keeps the map calm (traffic cameras stay visible at all zooms).
 */
const OFFER_MARKERS_MIN_ZOOM = 13.25;

interface Props {
  offers: Offer[];
  onOfferTap?: (offer: Offer) => void;
  zoomLevel: number;
  referenceCoordinate?: MarkerCoordinate | null;
}

function tierColors(d: number): { inner: string; outer: string; border: string } {
  if (d >= 20) return { inner: '#B45309', outer: 'rgba(245, 158, 11, 0.24)', border: 'rgba(255,255,255,0.85)' };
  if (d >= 10) return { inner: '#6D28D9', outer: 'rgba(139, 92, 246, 0.22)', border: 'rgba(255,255,255,0.85)' };
  if (d >= 5) return { inner: '#1D4ED8', outer: 'rgba(59, 130, 246, 0.22)', border: 'rgba(255,255,255,0.85)' };
  return { inner: '#166534', outer: 'rgba(34, 197, 94, 0.2)', border: 'rgba(255,255,255,0.85)' };
}

/**
 * Partner offers as compact MarkerView + Ionicons diamond (same footprint as traffic cameras).
 */
export default React.memo(function OfferMarkers({ offers, onOfferTap, zoomLevel, referenceCoordinate = null }: Props) {
  const markers = useMemo(() => {
    return sortAndCapMarkers(
      offers.map((o) => ({ ...o, lat: Number(o.lat), lng: Number(o.lng) })),
      referenceCoordinate,
      zoomLevel,
      'offer',
    );
  }, [offers, referenceCoordinate, zoomLevel]);

  if (!isMapAvailable() || !MapboxGL || !markers.length || zoomLevel < OFFER_MARKERS_MIN_ZOOM) return null;
  const MB = MapboxGL;

  return (
    <>
      {markers.map((offer) => {
        const { inner, outer, border } = tierColors(Number(offer.discount_percent ?? 0));
        return (
          <MB.MarkerView
            key={String(offer.id)}
            id={`sr-offer-${offer.id}`}
            coordinate={[offer.lng!, offer.lat!]}
            anchor={{ x: 0.5, y: 0.5 }}
            allowOverlap
          >
            <Pressable
              onPress={() => onOfferTap?.(offer)}
              style={({ pressed }) => [styles.hit, pressed && styles.hitPressed]}
              hitSlop={6}
            >
              <View style={[styles.puck, { backgroundColor: outer, borderColor: border }]}>
                <View style={[styles.puckInner, { backgroundColor: inner }]}>
                  <Ionicons name="diamond" size={11} color="#FFFFFF" />
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
  puck: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#1e3a8a',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  puckInner: {
    width: 22,
    height: 22,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
