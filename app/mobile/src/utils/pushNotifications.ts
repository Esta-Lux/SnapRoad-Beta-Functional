import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from '../api/client';

type RegisterResult = { ok: true; token: string } | { ok: false; reason: string };

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function expoProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const eas = extra?.eas as Record<string, unknown> | undefined;
  const fromExtra = typeof extra?.easProjectId === 'string' ? extra.easProjectId : undefined;
  const fromEas = typeof eas?.projectId === 'string' ? eas.projectId : undefined;
  return fromExtra || fromEas || Constants.easConfig?.projectId;
}

export async function registerCommutePushToken(): Promise<RegisterResult> {
  if (!Constants.isDevice) return { ok: false, reason: 'physical_device_required' };

  let permission = await Notifications.getPermissionsAsync();
  if (permission.status !== 'granted') {
    permission = await Notifications.requestPermissionsAsync();
  }
  if (permission.status !== 'granted') return { ok: false, reason: 'permission_denied' };

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('commute-alerts', {
      name: 'Commute alerts',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B2B',
    });
  }

  const projectId = expoProjectId();
  const tokenResponse = projectId
    ? await Notifications.getExpoPushTokenAsync({ projectId })
    : await Notifications.getExpoPushTokenAsync();
  const token = tokenResponse.data;
  const res = await api.post('/api/user/push-token', {
    token,
    platform: Platform.OS,
    purpose: 'commute_alerts',
  });
  if (!res.success) return { ok: false, reason: res.error || 'register_failed' };
  return { ok: true, token };
}
