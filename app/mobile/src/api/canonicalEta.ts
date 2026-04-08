import { api } from './client';
import { navServerEtaEnabled } from '../navigation/navFeatureFlags';

export type CanonicalEtaSnapshot = {
  routeVersion: number;
  remainingSeconds: number;
  etaEpochMs: number;
  source: string;
  ttlSec: number;
};

/**
 * Optional server snapshot (EXPO_PUBLIC_NAV_SERVER_ETA=1). Not wired into the main nav path yet;
 * call when product enables central ETA authority.
 */
export async function fetchCanonicalEtaSnapshotIfEnabled(args: {
  routeVersion: number;
  remainingSecondsHint: number;
  polylineHash?: string;
}): Promise<CanonicalEtaSnapshot | null> {
  if (!navServerEtaEnabled()) return null;
  const res = await api.post<{ success?: boolean; data?: CanonicalEtaSnapshot }>(
    '/api/navigation/canonical-eta',
    {
      route_version: args.routeVersion,
      remaining_seconds_hint: args.remainingSecondsHint,
      polyline_hash: args.polylineHash,
    },
  );
  if (!res.success || !res.data) return null;
  const body = res.data;
  const inner = body.data;
  if (!inner || typeof inner.remainingSeconds !== 'number') return null;
  return inner;
}
