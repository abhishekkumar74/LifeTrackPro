import { useEffect, useState } from 'react';
import { requestNotificationPermission } from '@/lib/notifications';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform, Linking, Alert } from 'react-native';

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

let Notifications: typeof import('expo-notifications') | null = null;
const isExpoGoAndroid =
  Platform.OS === 'android' &&
  (Constants.executionEnvironment === ExecutionEnvironment.StoreClient || Constants.appOwnership === 'expo');

if (!isExpoGoAndroid) {
  try {
    Notifications = require('expo-notifications');
  } catch (e) {
    Notifications = null;
  }
}

export function useNotificationPermission() {
  const [status, setStatus] = useState<PermissionStatus>('undetermined');

  const check = async () => {
    if (!Notifications) {
      setStatus('denied');
      return 'denied';
    }
    try {
      const { status: current } = await Notifications.getPermissionsAsync();
      const mapped =
        current === 'granted'
          ? 'granted'
          : current === 'denied'
            ? 'denied'
            : 'undetermined';
      setStatus(mapped);
      return current;
    } catch (e) {
      setStatus('denied');
      return 'denied';
    }
  };

  const request = async (): Promise<boolean> => {
    return await requestNotificationPermission();
  };

  useEffect(() => {
    check();
  }, []);

  return { status, request, check };
}
