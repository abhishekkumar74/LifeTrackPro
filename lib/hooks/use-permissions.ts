import { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform, Linking, Alert } from 'react-native';

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export function useNotificationPermission() {
  const [status, setStatus] = useState<PermissionStatus>('undetermined');

  const check = async () => {
    const { status: current } = await Notifications.getPermissionsAsync();
    setStatus(
      current === 'granted'
        ? 'granted'
        : current === 'denied'
          ? 'denied'
          : 'undetermined'
    );
    return current;
  };

  const request = async (): Promise<boolean> => {
    const current = await check();

    if (current === 'granted') return true;

    if (current === 'denied') {
      // Already denied — guide to settings
      Alert.alert(
        'Enable Notifications',
        'To receive study reminders and streak alerts, enable notifications for LifeTrack Pro in Settings.',
        [
          {
            text: 'Not now',
            style: 'cancel',
          },
          {
            text: 'Open Settings',
            onPress: () => Linking.openSettings(),
          },
        ]
      );
      return false;
    }

    // First time — request normally
    const { status: newStatus } = await Notifications.requestPermissionsAsync();

    const granted = newStatus === 'granted';
    setStatus(granted ? 'granted' : 'denied');
    return granted;
  };

  useEffect(() => {
    check();
  }, []);

  return { status, request, check };
}
