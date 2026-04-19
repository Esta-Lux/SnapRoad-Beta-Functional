import type { FriendLocation } from '../types';

export function mapFriendsApiToLocations(rows: unknown): FriendLocation[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((r: Record<string, unknown>) => ({
      id: String(r.friend_id ?? r.id ?? ''),
      name: (r.name as string) ?? 'Friend',
      avatar: r.avatar_url as string | undefined,
      lat: Number(r.lat ?? 0),
      lng: Number(r.lng ?? 0),
      heading: Number(r.heading ?? 0),
      speedMph: Number(r.speed_mph ?? 0),
      isNavigating: !!r.is_navigating,
      destinationName: typeof r.destination_name === 'string' ? r.destination_name : undefined,
      lastUpdated: typeof r.last_updated === 'string' ? r.last_updated : '',
      isSharing: !!r.is_sharing,
      batteryPct: r.battery_pct != null && r.battery_pct !== '' ? Number(r.battery_pct) : undefined,
    }))
    .filter((f) => f.id.length > 0);
}

export function mergeLiveLocationUpdate(
  prev: FriendLocation[],
  payloadNew: Record<string, unknown>,
): FriendLocation[] {
  const friendId = String(payloadNew.friend_id ?? payloadNew.user_id ?? '');
  if (!friendId) return prev;
  return prev.map((f) => {
    if (f.id !== friendId) return f;
    return {
      ...f,
      lat: Number(payloadNew.lat ?? f.lat),
      lng: Number(payloadNew.lng ?? f.lng),
      heading: Number(payloadNew.heading ?? f.heading),
      speedMph: Number(payloadNew.speed_mph ?? f.speedMph ?? 0),
      destinationName:
        typeof payloadNew.destination_name === 'string'
          ? payloadNew.destination_name
          : f.destinationName,
      isNavigating:
        payloadNew.is_navigating != null
          ? Boolean(payloadNew.is_navigating)
          : f.isNavigating,
      isSharing:
        payloadNew.is_sharing != null
          ? Boolean(payloadNew.is_sharing)
          : f.isSharing,
      lastUpdated:
        typeof payloadNew.last_updated === 'string'
          ? payloadNew.last_updated
          : f.lastUpdated,
      batteryPct:
        payloadNew.battery_pct != null && payloadNew.battery_pct !== ''
          ? Number(payloadNew.battery_pct)
          : f.batteryPct,
    };
  });
}
