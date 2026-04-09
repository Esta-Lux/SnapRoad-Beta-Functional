import { useMemo } from 'react';

import type { Offer } from '../types';

type Loc = { lat: number; lng: number };

export function useNearbyOffersOnMap(
  nearbyOffers: Offer[],
  location: Loc,
  maxMeters: number,
  haversineMeters: (lat1: number, lng1: number, lat2: number, lng2: number) => number,
) {
  return useMemo(() => {
    return nearbyOffers.filter((o) => {
      const la = Number(o.lat);
      const lo = Number(o.lng);
      if (!Number.isFinite(la) || !Number.isFinite(lo)) return false;
      return haversineMeters(location.lat, location.lng, la, lo) <= maxMeters;
    });
  }, [nearbyOffers, location.lat, location.lng, maxMeters, haversineMeters]);
}
