import { Platform, Alert, Linking } from 'react-native';
import * as Location from 'expo-location';

/**
 * After friend sharing is turned on, check background location and explain how to
 * get updates while the app is backgrounded. `startFriendLiveShareBackgroundUpdates`
 * already called `requestBackgroundPermissionsAsync` — this runs shortly after so the
 * system dialog can complete before we read the final status.
 */
export function nudgeBackgroundLocationAfterEnablingShare(delayMs = 600): void {
  if (Platform.OS === 'web') return;

  const run = async () => {
    const fg = await Location.getForegroundPermissionsAsync();
    if (!fg.granted) return;

    const bg = await Location.getBackgroundPermissionsAsync();
    if (bg.granted) return;

    if (Platform.OS === 'ios') {
      Alert.alert(
        'Location while SnapRoad is in the background',
        'To keep updating friends when the app is not open, go to Settings → SnapRoad → Location and choose "Always".',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open Settings', onPress: () => { void Linking.openSettings(); } },
        ],
      );
    } else {
      Alert.alert(
        'Background location',
        "If friends don't see you moving, allow location in the background. On some devices, also turn off battery restrictions for SnapRoad in system settings.",
        [
          { text: 'OK' },
          { text: 'App settings', onPress: () => { void Linking.openSettings(); } },
        ],
      );
    }
  };

  if (delayMs > 0) {
    setTimeout(() => {
      void run();
    }, delayMs);
  } else {
    void run();
  }
}
