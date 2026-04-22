/**
 * Live friend location: publish interval and OS background delivery.
 * Keep in sync across MapScreen, Dashboard, and `friendLiveShareBackgroundTask`.
 */
export const FRIEND_LIVE_SHARE_PUBLISH_INTERVAL_MS = 2_000;

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
