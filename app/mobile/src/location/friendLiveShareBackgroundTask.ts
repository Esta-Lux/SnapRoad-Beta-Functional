/**
 * Background location updates for Premium “share with friends” so last-known position
 * advances while the app is backgrounded or the screen is locked (OS permitting).
 *
 * Registered at module load — import from `index.ts` before `App` so `defineTask` runs.
 */

import { Platform } from 'react-native';
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import * as Battery from 'expo-battery';
import { API_BASE_URL } from '../api/client';
import {
  FRIEND_LIVE_LAST_NAV_KEY,
  FRIEND_LIVE_SHARE_DISTANCE_INTERVAL_M,
  FRIEND_LIVE_SHARE_PUBLISH_INTERVAL_MS,
} from './friendLiveShareConfig';

export const FRIEND_LIVE_SHARE_TASK_NAME = 'snaproad-friend-live-share';

/** Must match `SHARE_LOC_STORAGE_KEY` in MapScreen / Dashboard. */
const SHARE_LOC_STORAGE_KEY = 'snaproad_share_location';
const TOKEN_KEY = 'snaproad_token';

const MIN_PUBLISH_INTERVAL_MS = FRIEND_LIVE_SHARE_PUBLISH_INTERVAL_MS;
let lastPublishAtMs = 0;

if (Platform.OS !== 'web') {
  TaskManager.defineTask(FRIEND_LIVE_SHARE_TASK_NAME, async ({ data, error }) => {
    if (error) return;
    const locations = (data as { locations?: Location.LocationObject[] })?.locations;
    const loc = locations?.[0];
    if (!loc) return;

    const now = Date.now();
    if (now - lastPublishAtMs < MIN_PUBLISH_INTERVAL_MS) return;

    let isNavigating = false;
    try {
      const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
      const sharing = await AsyncStorage.getItem(SHARE_LOC_STORAGE_KEY);
      if (sharing !== '1') return;
      isNavigating = (await AsyncStorage.getItem(FRIEND_LIVE_LAST_NAV_KEY)) === '1';
    } catch {
      return;
    }

    let token: string | null = null;
    try {
      token = await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      return;
    }
    if (!token) return;

    lastPublishAtMs = now;

    let battery_pct: number | undefined;
    try {
      const lvl = await Battery.getBatteryLevelAsync();
      battery_pct = Math.round(Math.max(0, Math.min(1, lvl)) * 100);
    } catch {
      /* optional */
    }

    const { latitude, longitude, heading, speed } = loc.coords;
    const speed_mph =
      typeof speed === 'number' && Number.isFinite(speed) ? Math.max(0, speed * 2.236936) : 0;
    const headingDeg =
      typeof heading === 'number' && Number.isFinite(heading) && heading >= 0 ? heading : 0;

    try {
      const res = await fetch(`${API_BASE_URL}/api/friends/location/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Bypass-Tunnel-Reminder': 'true',
        },
        body: JSON.stringify({
          lat: latitude,
          lng: longitude,
          heading: headingDeg,
          speed_mph,
          is_navigating: isNavigating,
          is_sharing: true,
          battery_pct,
        }),
      });
      if (!res.ok && res.status === 503) {
        /* server may pause live writes — foreground UI handles banner */
      }
    } catch {
      /* offline / suspended */
    }
  });
}

export async function isFriendLiveShareBackgroundRunning(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    return await Location.hasStartedLocationUpdatesAsync(FRIEND_LIVE_SHARE_TASK_NAME);
  } catch {
    return false;
  }
}

/**
 * Starts OS background location delivery for the live-share task.
 * No-op if foreground permission is denied. Background (“Always”) is requested when
 * available; if the user only grants When-In-Use, updates continue while the app is active.
 */
export async function startFriendLiveShareBackgroundUpdates(): Promise<void> {
  if (Platform.OS === 'web') return;
  const fg = await Location.requestForegroundPermissionsAsync();
  if (!fg.granted) return;

  try {
    await Location.requestBackgroundPermissionsAsync();
  } catch {
    /* older SDK / simulator */
  }

  const running = await isFriendLiveShareBackgroundRunning();
  if (running) {
    try {
      await Location.stopLocationUpdatesAsync(FRIEND_LIVE_SHARE_TASK_NAME);
    } catch {
      /* apply new interval/accuracy on code updates */
    }
  }

  await Location.startLocationUpdatesAsync(FRIEND_LIVE_SHARE_TASK_NAME, {
    accuracy: Location.Accuracy.High,
    timeInterval: FRIEND_LIVE_SHARE_PUBLISH_INTERVAL_MS,
    distanceInterval: FRIEND_LIVE_SHARE_DISTANCE_INTERVAL_M,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Sharing location',
      notificationBody: 'Friends see your updated position on the map.',
      notificationColor: '#FF6B2B',
    },
  });
}

export async function stopFriendLiveShareBackgroundUpdates(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const running = await Location.hasStartedLocationUpdatesAsync(FRIEND_LIVE_SHARE_TASK_NAME);
    if (running) {
      await Location.stopLocationUpdatesAsync(FRIEND_LIVE_SHARE_TASK_NAME);
    }
  } catch {
    /* safe */
  }
}

/**
 * Start/stop OS background location for live share. `canPublish` must match MapScreen
 * `canPublishFriendLocation` (Premium + public config + not admin-paused) so the task
 * is not left running when the server rejects updates.
 */
export async function syncFriendLiveShareBackgroundFromPolicy(opts: {
  sharingEnabled: boolean;
  canPublish: boolean;
}): Promise<void> {
  if (!opts.sharingEnabled || !opts.canPublish) {
    await stopFriendLiveShareBackgroundUpdates();
    return;
  }
  await startFriendLiveShareBackgroundUpdates();
}
