/**
 * Push notification registration.
 *
 * Call registerPushToken() once after auth succeeds (in _layout.tsx).
 * Silently no-ops on simulators and when permissions are denied.
 */

import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from '@/lib/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerPushToken(): Promise<void> {
  if (!Device.isDevice) return; // simulators don't get push tokens

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return; // user denied — silently skip

  // Android requires a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Sinalytix',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { data: token } = await Notifications.getExpoPushTokenAsync();

  await api.post('/api/v1/notifications/push-token', {
    token,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
  });
}
