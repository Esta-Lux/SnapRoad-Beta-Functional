import { haversineMeters } from '../utils/distance';
import type { Friend } from '../types';

/** Normalize `/api/friends/list` row (handles `avatar_url`). */
export function normalizeFriendFromApi(row: Record<string, unknown>): Friend {
  const fid = String(row.friend_id ?? row.id ?? '');
  const rawCats = Array.isArray(row.categories) ? row.categories : [];
  const categories = rawCats
    .map((c) => {
      if (!c || typeof c !== 'object') return null;
      const cat = c as { id?: unknown; name?: unknown; color?: unknown; friend_count?: unknown };
      const id = String(cat.id ?? '').trim();
      const name = String(cat.name ?? '').trim();
      if (!id || !name) return null;
      return {
        id,
        name,
        color: typeof cat.color === 'string' ? cat.color : undefined,
        friend_count: cat.friend_count != null && Number.isFinite(Number(cat.friend_count)) ? Number(cat.friend_count) : undefined,
      };
    })
    .filter((c): c is NonNullable<typeof c> => Boolean(c));
  return {
    id: fid,
    friend_id: fid,
    name: String(row.name ?? 'Friend'),
    email: typeof row.email === 'string' ? row.email : undefined,
    avatar:
      typeof row.avatar_url === 'string'
        ? row.avatar_url
        : typeof row.avatar === 'string'
          ? row.avatar
          : undefined,
    status: String(row.status ?? 'accepted'),
    lat: row.lat != null && row.lat !== '' ? Number(row.lat) : undefined,
    lng: row.lng != null && row.lng !== '' ? Number(row.lng) : undefined,
    speed_mph: row.speed_mph != null && row.speed_mph !== '' ? Number(row.speed_mph) : undefined,
    heading: row.heading != null && row.heading !== '' ? Number(row.heading) : undefined,
    is_sharing: Boolean(row.is_sharing),
    last_updated: typeof row.last_updated === 'string' ? row.last_updated : undefined,
    is_navigating: Boolean(row.is_navigating),
    destination_name: typeof row.destination_name === 'string' ? row.destination_name : undefined,
    battery_pct: row.battery_pct != null && row.battery_pct !== '' ? Number(row.battery_pct) : null,
    categories,
  };
}

/**
 * Max age of `last_updated` (ms) for a still-sharing friend to count as "fresh" for LIVE UI.
 * 5m matches iOS background delivery gaps (Always location) and batched network without
 * marking everyone stale after ~1.5m of quiet GPS.
 */
export const FRIEND_LOC_STALE_MS = 300_000;

/** Speed above this (mph) counts as driving / moving for UI. */
export const FRIEND_SPEED_DRIVING_MPH = 3;

export type FriendPresenceBadge = 'LIVE' | 'DRIVING' | 'PARKED' | 'STALE' | 'OFFLINE';

export interface FriendPresence {
  isSharing: boolean;
  isStale: boolean;
  isLiveFresh: boolean;
  isMoving: boolean;
  distanceFromMeM: number | null;
  statusLabel: string;
  sublabel: string;
  badge: FriendPresenceBadge;
  /** True only when we may show a LIVE pill (fresh share + coords). */
  showLivePill: boolean;
}

function hasValidCoords(lat?: number, lng?: number): boolean {
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (Math.abs(lat) < 1e-6 && Math.abs(lng) < 1e-6) return false;
  return true;
}

/** Exported for Social UI (distance / battery rows) — same rules as presence coords. */
export function hasValidFriendCoords(lat?: number, lng?: number): boolean {
  return hasValidCoords(lat, lng);
}

function locationAgeMs(iso?: string): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Date.now() - t);
}

export function headingToCardinal(deg?: number): string | null {
  if (deg == null || !Number.isFinite(deg)) return null;
  const x = ((deg % 360) + 360) % 360;
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const idx = Math.round(x / 45) % 8;
  return dirs[idx] ?? null;
}

export function formatLastUpdatedShort(iso?: string): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const sec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (sec < 45) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

/**
 * Fresh live share: toggled on, valid coords, and recent `last_updated`.
 */
export function isLiveShareFresh(
  isSharing: boolean,
  lastUpdated: string | undefined,
  lat?: number,
  lng?: number,
): boolean {
  if (!isSharing || !hasValidCoords(lat, lng)) return false;
  const age = locationAgeMs(lastUpdated);
  if (age == null) return false;
  return age <= FRIEND_LOC_STALE_MS;
}

export function isLiveShareStale(
  isSharing: boolean,
  lastUpdated: string | undefined,
  lat?: number,
  lng?: number,
): boolean {
  if (!isSharing || !hasValidCoords(lat, lng)) return false;
  const age = locationAgeMs(lastUpdated);
  if (age == null) return true;
  return age > FRIEND_LOC_STALE_MS;
}

export function deriveFriendPresence(
  friend: Friend,
  me?: { lat: number; lng: number } | null,
): FriendPresence {
  const valid = hasValidCoords(friend.lat, friend.lng);
  const sharing = friend.status === 'accepted' && friend.is_sharing === true;
  const stale = sharing && valid && isLiveShareStale(sharing, friend.last_updated, friend.lat, friend.lng);
  const liveFresh = sharing && valid && !stale && isLiveShareFresh(sharing, friend.last_updated, friend.lat, friend.lng);
  const speed = friend.speed_mph ?? 0;
  const moving = liveFresh && speed > FRIEND_SPEED_DRIVING_MPH;

  let distanceFromMeM: number | null = null;
  if (
    me &&
    Number.isFinite(me.lat) &&
    Number.isFinite(me.lng) &&
    !(me.lat === 0 && me.lng === 0) &&
    valid
  ) {
    distanceFromMeM = haversineMeters(me.lat, me.lng, friend.lat!, friend.lng!);
  }

  const cardinal = headingToCardinal(friend.heading);
  const lastFmt = formatLastUpdatedShort(friend.last_updated);

  let statusLabel = 'Offline';
  let sublabel = 'Not sharing location';
  let badge: FriendPresenceBadge = 'OFFLINE';

  if (friend.status === 'pending') {
    statusLabel = 'Pending';
    sublabel = 'Waiting for acceptance';
    badge = 'OFFLINE';
  } else if (!sharing) {
    statusLabel = 'Not sharing';
    sublabel = friend.last_updated ? `Last update ${lastFmt}` : 'Location off';
    badge = 'OFFLINE';
  } else if (!valid) {
    statusLabel = 'Sharing';
    sublabel = 'Waiting for location…';
    badge = 'OFFLINE';
  } else if (stale) {
    statusLabel = 'Stale location';
    sublabel = lastFmt ? `Last seen ${lastFmt}` : 'Location may be outdated';
    badge = 'STALE';
  } else if (friend.is_navigating && friend.destination_name) {
    statusLabel = 'Driving';
    sublabel = `Navigating to ${friend.destination_name}`;
    badge = 'DRIVING';
  } else if (moving) {
    statusLabel = 'Driving';
    sublabel = cardinal ? `Heading ${cardinal} · ${Math.round(speed)} mph` : `${Math.round(speed)} mph`;
    badge = 'DRIVING';
  } else {
    statusLabel = 'Parked / idle';
    sublabel = cardinal ? `Facing ${cardinal} · Stationary` : 'Stationary';
    badge = 'PARKED';
  }

  const showLivePill = liveFresh;

  return {
    isSharing: sharing,
    isStale: stale,
    isLiveFresh: liveFresh,
    isMoving: moving,
    distanceFromMeM,
    statusLabel,
    sublabel,
    badge,
    showLivePill,
  };
}

/** For map `FriendLocation` rows (Supabase realtime). */
export function isFriendLocationFreshForFollow(
  isSharing: boolean,
  lastUpdated: string,
  lat: number,
  lng: number,
): boolean {
  return isLiveShareFresh(isSharing, lastUpdated || undefined, lat, lng);
}

export function formatDistanceMeters(m: number | null): string {
  if (m == null || !Number.isFinite(m)) return '';
  if (m < 1609.34) {
    if (m < 100) return `${Math.round(m)} m`;
    return `${Math.round(m / 10) * 10} m`;
  }
  const mi = m / 1609.34;
  return `${mi < 10 ? mi.toFixed(1) : Math.round(mi)} mi`;
}
