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

function markerSize(offer: Offer): { disc: number; glow: number; icon: number } {
  const boost = Math.max(1, Number(offer.boost_multiplier || 1))
  const locationScale = Array.isArray(offer.allocated_locations) ? Math.min(3, offer.allocated_locations.length) : 1
  const redemptionScale = offer.redemption_count ? Math.min(4, Math.floor(offer.redemption_count / 25)) : 0
  const disc = Math.min(46, 28 + (boost - 1) * 3 + locationScale * 2 + redemptionScale)
  return {
    disc,
    glow: disc + 10,
    icon: Math.max(14, Math.round(disc * 0.5)),
  }
}

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
        const size = markerSize(offer);
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
              style={[styles.hit, { width: size.disc + 16, height: size.disc + 16 }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <View style={[styles.glow, { width: size.glow, height: size.glow, borderRadius: size.glow / 2, backgroundColor: fill, opacity: 0.22 }]} />
              <View style={[styles.disc, { width: size.disc, height: size.disc, borderRadius: size.disc / 2, backgroundColor: fill }]}>
                <MaterialCommunityIcons name="diamond-stone" size={size.icon} color="#fff" />
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
  },
  glow: {
    position: 'absolute',
  },
  disc: {
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
