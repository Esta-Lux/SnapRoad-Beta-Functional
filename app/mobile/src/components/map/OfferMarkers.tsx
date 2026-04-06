import React, { useMemo } from 'react';
import { TouchableOpacity, View, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MapboxGL, { isMapAvailable } from '../../utils/mapbox';
import type { Offer } from '../../types';
import MapPinMarker from './MapPinMarker';

interface Props { offers: Offer[]; onOfferTap?: (offer: Offer) => void; }

function tierFill(d: number): string {
  if (d >= 20) return '#B45309';
  if (d >= 10) return '#6D28D9';
  if (d >= 5) return '#1D4ED8';
  return '#166534';
}

function tierGradient(d: number): [string, string] {
  if (d >= 20) return ['#F59E0B', '#B45309'];
  if (d >= 10) return ['#8B5CF6', '#6D28D9'];
  if (d >= 5) return ['#3B82F6', '#1D4ED8'];
  return ['#22C55E', '#166534'];
}

function markerSize(offer: Offer): { disc: number; glow: number; icon: number } {
  const boost = Math.max(1, Number(offer.boost_multiplier || 1))
  const locationScale = Array.isArray(offer.allocated_locations) ? Math.min(3, offer.allocated_locations.length) : 1
  const redemptionScale = offer.redemption_count ? Math.min(4, Math.floor(offer.redemption_count / 25)) : 0
  const disc = Math.min(38, 22 + (boost - 1) * 2 + locationScale * 2 + redemptionScale)
  return {
    disc,
    glow: disc + 8,
    icon: Math.max(11, Math.round(disc * 0.48)),
  }
}

export default React.memo(function OfferMarkers({ offers, onOfferTap }: Props) {
  const markers = useMemo(
    () =>
      offers
        .filter((o) => {
          const la = Number(o.lat);
          const lo = Number(o.lng);
          return Number.isFinite(la) && Number.isFinite(lo) && !(Math.abs(la) < 1e-7 && Math.abs(lo) < 1e-7);
        })
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
            allowOverlap
          >
            <MapPinMarker
              compact
              onPress={() => onOfferTap?.(offer)}
              gradientColors={tierGradient(offer.discount_percent)}
              glowColor={`${fill}55`}
            >
              <MaterialCommunityIcons name="storefront-outline" size={size.icon} color="#fff" />
            </MapPinMarker>
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
});
