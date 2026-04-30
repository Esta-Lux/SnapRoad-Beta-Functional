/**
 * Live friend location: publish interval and OS background delivery.
 * Keep in sync across MapScreen, Dashboard, and `friendLiveShareBackgroundTask`.
 */
export const FRIEND_LIVE_SHARE_PUBLISH_INTERVAL_MS = 2_000;

export type FriendLiveShareMode = 'off' | 'while_using' | 'always_follow';

export const FRIEND_LIVE_SHARE_STORAGE_KEY = 'snaproad_share_location';
export const FRIEND_LIVE_SHARE_MODE_KEY = 'snaproad_share_location_mode';

export function normalizeFriendLiveShareMode(value: unknown, sharingEnabled = true): FriendLiveShareMode {
  if (!sharingEnabled) return 'off';
  if (value === 'always_follow') return 'always_follow';
  if (value === 'while_using') return 'while_using';
  return 'while_using';
}

export function isAlwaysFollowMode(value: unknown): boolean {
  return normalizeFriendLiveShareMode(value, true) === 'always_follow';
}

export function isFriendLiveShareEnabled(mode: FriendLiveShareMode): boolean {
  return mode === 'while_using' || mode === 'always_follow';
}

/**
 * Min horizontal movement (meters) before a background `expo-location` update on Android.
 * iOS also considers `timeInterval`; pair with 2s for moving vehicles.
 */
export const FRIEND_LIVE_SHARE_DISTANCE_INTERVAL_M = 5;

/**
 * Best-effort flag for background `POST /friends/location/update` when MapScreen
 * is not in JS context (read from AsyncStorage, written on nav toggle).
 */
export const FRIEND_LIVE_LAST_NAV_KEY = 'snaproad_last_nav';
