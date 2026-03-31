import React, { useMemo } from 'react';
import { TouchableOpacity, View, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MapboxGL, { isMapAvailable } from '../../utils/mapbox';
import type { Offer } from '../../types';

interface Props { offers: Offer[]; onOfferTap?: (offer: Offer) => void; }

function tierFill(d: number): string {
  if (d >= 20) return '#B45309';
  if (d >= 10) return '#6D28D9';
  if (d >= 5) return '#1D4ED8';
  return '#166534';
}

const DISC = 32;
const ICON = 16;

export default React.memo(function OfferMarkers({ offers, onOfferTap }: Props) {
  const markers = useMemo(
    () => offers
      .filter((o) => o.lat != null && o.lng != null)
      .slice(0, 120),
    [offers],
  );

  if (!isMapAvailable() || !MapboxGL || !markers.length) return null;
  const MB = MapboxGL;

  return (
    <>
      {markers.map((offer) => {
        const fill = tierFill(offer.discount_percent);
        return (
          <MB.MarkerView
            key={String(offer.id)}
            id={`sr-offer-${offer.id}`}
            coordinate={[offer.lng!, offer.lat!]}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => onOfferTap?.(offer)}
              style={styles.hit}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <View style={[styles.glow, { backgroundColor: fill, opacity: 0.22 }]} />
              <View style={[styles.disc, { backgroundColor: fill }]}>
                <MaterialCommunityIcons name="diamond-stone" size={ICON} color="#fff" />
              </View>
            </TouchableOpacity>
          </MB.MarkerView>
        );
      })}
    </>
  );
});

const styles = StyleSheet.create({
  hit: {
    alignItems: 'center',
    justifyContent: 'center',
    width: DISC + 14,
    height: DISC + 14,
  },
  glow: {
    position: 'absolute',
    width: DISC + 8,
    height: DISC + 8,
    borderRadius: (DISC + 8) / 2,
  },
  disc: {
    width: DISC,
    height: DISC,
    borderRadius: DISC / 2,
    borderWidth: 2.5,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.22,
        shadowRadius: 2.5,
        shadowOffset: { width: 0, height: 1 },
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
});
