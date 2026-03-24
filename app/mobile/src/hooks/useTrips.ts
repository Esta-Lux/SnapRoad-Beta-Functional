import { useState } from 'react';
import type { Trip } from '../types';

export function useTrips() {
  const [lastTripData, setLastTripData] = useState<Record<string, unknown> | null>(null);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [tripHistory, setTripHistory] = useState<Trip[]>([]);

  return {
    lastTripData,
    setLastTripData,
    activeTripId,
    setActiveTripId,
    tripHistory,
    setTripHistory,
  };
}
