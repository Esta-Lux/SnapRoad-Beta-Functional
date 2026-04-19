export type LiveLocationUpdate = {
  friendId: string;
  lat?: number;
  lng?: number;
  heading?: number;
  speedMph?: number;
  destinationName?: string;
  isNavigating?: boolean;
  isSharing?: boolean;
  lastUpdated?: string;
  batteryPct?: number;
};

export function parseLiveLocationUpdate(payloadNew: unknown): LiveLocationUpdate | null {
  if (!payloadNew || typeof payloadNew !== 'object') return null;
  const row = payloadNew as Record<string, unknown>;
  /** `live_locations` rows use `user_id` (the sharer); legacy payloads may use `friend_id`. */
  const friendId = String(row.user_id ?? row.friend_id ?? '').trim();
  if (!friendId) return null;
  return {
    friendId,
    lat: row.lat != null ? Number(row.lat) : undefined,
    lng: row.lng != null ? Number(row.lng) : undefined,
    heading: row.heading != null ? Number(row.heading) : undefined,
    speedMph: row.speed_mph != null ? Number(row.speed_mph) : undefined,
    destinationName:
      typeof row.destination_name === 'string' ? row.destination_name : undefined,
    isNavigating:
      row.is_navigating != null ? Boolean(row.is_navigating) : undefined,
    isSharing: row.is_sharing != null ? Boolean(row.is_sharing) : undefined,
    lastUpdated: typeof row.last_updated === 'string' ? row.last_updated : undefined,
    batteryPct:
      row.battery_pct != null && row.battery_pct !== ''
        ? Number(row.battery_pct)
        : undefined,
  };
}
