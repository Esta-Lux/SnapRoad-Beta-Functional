import { useEffect, useRef } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Notifications from 'expo-notifications';
import type { NavigationProgress } from '../navigation/navModel';
import { buildBackgroundTurnNotificationContent } from '../navigation/navBackgroundGuidance';

const KEEP_AWAKE_TAG = 'snaproad-active-navigation';
const NAV_CHANNEL_ID = 'navigation-guidance';
const NAV_NOTIFICATION_IDENTIFIER = 'snaproad-background-turn';

async function ensureNavigationNotificationChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(NAV_CHANNEL_ID, {
    name: 'Navigation guidance',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 120],
    lightColor: '#9CA3AF',
  });
}

async function canShowLocalNavigationNotification(): Promise<boolean> {
  const permissions = await Notifications.getPermissionsAsync();
  return permissions.status === 'granted';
}

export function useNavigationRuntimeProtection(
  isNavigating: boolean,
  navigationProgress: NavigationProgress | null | undefined,
) {
  const progressRef = useRef<NavigationProgress | null | undefined>(navigationProgress);
  const lastNotificationKeyRef = useRef<string | null>(null);

  useEffect(() => {
    progressRef.current = navigationProgress;
  }, [navigationProgress]);

  useEffect(() => {
    if (!isNavigating) {
      lastNotificationKeyRef.current = null;
      void deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => undefined);
      void Notifications.dismissNotificationAsync(NAV_NOTIFICATION_IDENTIFIER).catch(() => undefined);
      return;
    }

    void activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => undefined);
    return () => {
      void deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => undefined);
    };
  }, [isNavigating]);

  useEffect(() => {
    if (!isNavigating) return;

    const onAppStateChange = (next: AppStateStatus) => {
      if (next === 'active') {
        void Notifications.dismissNotificationAsync(NAV_NOTIFICATION_IDENTIFIER).catch(() => undefined);
        return;
      }
      if (next !== 'background' && next !== 'inactive') return;

      const content = buildBackgroundTurnNotificationContent(progressRef.current);
      if (!content || content.guidanceKey === lastNotificationKeyRef.current) return;
      lastNotificationKeyRef.current = content.guidanceKey;

      void (async () => {
        try {
          if (!(await canShowLocalNavigationNotification())) return;
          await ensureNavigationNotificationChannel();
          await Notifications.scheduleNotificationAsync({
            identifier: NAV_NOTIFICATION_IDENTIFIER,
            content: {
              title: content.title,
              body: content.body,
              sound: true,
              color: '#9CA3AF',
              data: {
                type: 'navigation_turn',
                guidanceKey: content.guidanceKey,
                distanceMeters: content.distanceMeters,
              },
            },
            trigger: null,
          });
        } catch {
          /* Notification permissions / OS state should never break active navigation. */
        }
      })();
    };

    const sub = AppState.addEventListener('change', onAppStateChange);
    return () => sub.remove();
  }, [isNavigating]);
}
