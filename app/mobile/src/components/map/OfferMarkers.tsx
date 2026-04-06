import React, { useMemo } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MapboxGL, { isMapAvailable } from '../../utils/mapbox';
import type { Offer } from '../../types';
import MapPinMarker from './MapPinMarker';

/** Hide offer pins when zoomed out (same idea as traffic cameras). */
const OFFER_MARKERS_MIN_ZOOM = 13.25;

interface Props {
  offers: Offer[];
  onOfferTap?: (offer: Offer) => void;
  /** Current map zoom; pins hidden below OFFER_MARKERS_MIN_ZOOM. */
  zoomLevel: number;
}

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
  const locationScale = Array.isArray(offer.allocated_locations) ? Math.min(2, offer.allocated_locations.length) : 1
  const redemptionScale = offer.redemption_count ? Math.min(2, Math.floor(offer.redemption_count / 40)) : 0
  const disc = Math.min(30, 18 + (boost - 1) * 1.5 + locationScale * 1.5 + redemptionScale)
  return {
    disc,
    glow: disc + 8,
    icon: Math.max(10, Math.round(disc * 0.44)),
  }
}

export default React.memo(function OfferMarkers({ offers, onOfferTap, zoomLevel }: Props) {
  const markers = useMemo(() => {
    const filtered = offers.filter((o) => {
      const la = Number(o.lat);
      const lo = Number(o.lng);
      return Number.isFinite(la) && Number.isFinite(lo) && !(Math.abs(la) < 1e-7 && Math.abs(lo) < 1e-7);
    });
    const cap = zoomLevel >= 15.5 ? 90 : zoomLevel >= 14.25 ? 55 : 32;
    return filtered.slice(0, cap);
  }, [offers, zoomLevel]);

  if (!isMapAvailable() || !MapboxGL || !markers.length || zoomLevel < OFFER_MARKERS_MIN_ZOOM) return null;
  const MB = MapboxGL;
  const pinScale = zoomLevel >= 15 ? 0.72 : zoomLevel >= 14 ? 0.64 : 0.58;

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
            anchor={{ x: 0.5, y: 1 }}
            allowOverlap
          >
            <MapPinMarker
              compact
              sizeScale={pinScale}
              onPress={() => onOfferTap?.(offer)}
              gradientColors={tierGradient(offer.discount_percent)}
              glowColor={`${fill}44`}
            >
              <MaterialCommunityIcons name="storefront-outline" size={size.icon} color="#fff" />
            </MapPinMarker>
          </MB.MarkerView>
        );
      })}
    </>
  );
});

