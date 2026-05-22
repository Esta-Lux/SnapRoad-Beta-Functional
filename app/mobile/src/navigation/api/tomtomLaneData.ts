import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../api/client';
import type { LaneInfo } from '../navModel';

const CACHE_PREFIX = 'snaproad_tomtom_lanes_v1:';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type CacheRow = { createdAt: number; lanes: LaneInfo[] };

function cacheKey(routeId: string, stepIndex: number): string {
  return `${CACHE_PREFIX}${routeId}:${stepIndex}`;
}

export async function fetchTomTomLaneFallback(args: {
  routeId: string;
  stepIndex: number;
  lat: number;
  lng: number;
}): Promise<LaneInfo[]> {
  const key = cacheKey(args.routeId, args.stepIndex);
  try {
    const cached = await AsyncStorage.getItem(key);
    if (cached) {
      const row = JSON.parse(cached) as CacheRow;
      if (Date.now() - row.createdAt < CACHE_TTL_MS && Array.isArray(row.lanes)) {
        return row.lanes;
      }
    }
  } catch {
    /* cache miss */
  }

  const res = await api.get<{ data?: { lanes?: LaneInfo[] } }>(
    `/api/navigation/tomtom-lanes?lat=${args.lat}&lng=${args.lng}&step_index=${args.stepIndex}`,
    { timeoutMs: 5000 },
  );
  const lanes = res.success && Array.isArray(res.data?.data?.lanes) ? res.data.data.lanes : [];
  try {
    await AsyncStorage.setItem(key, JSON.stringify({ createdAt: Date.now(), lanes } satisfies CacheRow));
  } catch {
    /* cache best-effort */
  }
  return lanes;
}
