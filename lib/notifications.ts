import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform, Alert, Linking } from 'react-native';
import { useEffect } from 'react';
import { router, Href } from 'expo-router';

// Safely load expo-notifications module on supported platforms/environments
let Notifications: typeof import('expo-notifications') | null = null;

// Expo Go on Android explicitly disabled expo-notifications in SDK 53+
const isExpoGoAndroid =
  Platform.OS === 'android' &&
  (Constants.executionEnvironment === ExecutionEnvironment.StoreClient || Constants.appOwnership === 'expo');

if (!isExpoGoAndroid) {
  try {
    Notifications = require('expo-notifications');
    Notifications?.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (e) {
    if (__DEV__) console.warn('Could not load expo-notifications module:', e);
    Notifications = null;
  }
}

// Helper to cancel a specific scheduled notification safely
export async function cancelScheduledNotification(identifier: string): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});
  } catch (err) {
    if (__DEV__) console.warn('cancelScheduledNotification failed:', err);
  }
}

// 1. requestNotificationPermission
export async function requestNotificationPermission(): Promise<boolean> {
  if (!Notifications) return false;
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      if (existingStatus === 'denied') {
        Alert.alert(
          'Allow Notifications',
          'To receive study reminders, habit tracking alerts, and streak notifications, please enable Notifications for LifeTrack Pro in Settings.',
          [
            { text: 'Not Now', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      }
      return false;
    }

    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('focus_channel', {
          name: 'Focus Reminders',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250, 250, 250],
        });
        await Notifications.setNotificationChannelAsync('habit_channel', {
          name: 'Habit Reminders',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
        await Notifications.setNotificationChannelAsync('streak_channel', {
          name: 'Streak Alerts',
          importance: Notifications.AndroidImportance.HIGH,
        });
      } catch (channelErr) {
        if (__DEV__) console.warn('Notification channels could not be registered:', channelErr);
      }
    }

    return true;
  } catch (err) {
    if (__DEV__) console.warn('requestNotificationPermission failed:', err);
    return false;
  }
}

// 2. scheduleMorningBrief
export async function scheduleMorningBrief(topTaskTitle: string): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync('morning_brief').catch(() => {});

    await Notifications.scheduleNotificationAsync({
      identifier: 'morning_brief',
      content: {
        title: 'Good morning! ☀️',
        body: `Today's focus: ${topTaskTitle}`,
        data: { screen: 'home' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 8,
        minute: 0,
      },
    }).catch(() => {});
  } catch (err) {
    if (__DEV__) console.warn('scheduleMorningBrief failed:', err);
  }
}

// 3. scheduleStreakAlert
export async function scheduleStreakAlert(): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync('streak_alert').catch(() => {});

    await Notifications.scheduleNotificationAsync({
      identifier: 'streak_alert',
      content: {
        title: "Don't break your streak! 🔥",
        body: 'Complete at least one habit today.',
        data: { screen: 'home' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 21,
        minute: 0,
      },
    }).catch(() => {});
  } catch (err) {
    if (__DEV__) console.warn('scheduleStreakAlert failed:', err);
  }
}

// 3.5 scheduleRevisionAlert
export async function scheduleRevisionAlert(topicTitle: string, delayDays: number): Promise<void> {
  if (!Notifications) return;
  try {
    const triggerDate = new Date();
    triggerDate.setDate(triggerDate.getDate() + delayDays);
    triggerDate.setHours(9, 0, 0, 0);

    const cleanTitle = topicTitle.trim();
    const seconds = Math.max(1, Math.floor((triggerDate.getTime() - Date.now()) / 1000));
    await Notifications.scheduleNotificationAsync({
      identifier: `revision_${cleanTitle.replace(/\s+/g, '_')}_${delayDays}`,
      content: {
        title: 'Time to Revise! 🧠',
        body: `It's time to revise "${cleanTitle}" to boost memory retention! Spaced repetition is active.`,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
      },
    }).catch(() => {});
  } catch (err) {
    if (__DEV__) console.warn('scheduleRevisionAlert failed:', err);
  }
}

// 4. cancelAllNotifications
export async function cancelAllNotifications(): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
  } catch (err) {
    if (__DEV__) console.warn('cancelAllNotifications failed:', err);
  }
}

// 5. useNotificationResponse custom hook
export function useNotificationResponse() {
  useEffect(() => {
    if (!Notifications) return;
    let subscription: any = null;
    try {
      subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        const screen = data?.screen;
        if (screen) {
          if (screen === 'home') {
            router.push('/' as Href);
          } else {
            router.push(screen as Href);
          }
        }
      });
    } catch (err) {
      if (__DEV__) console.warn('Notification listener setup failed:', err);
    }

    return () => {
      if (subscription && typeof subscription.remove === 'function') {
        subscription.remove();
      }
    };
  }, []);
}
