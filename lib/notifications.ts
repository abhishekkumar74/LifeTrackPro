import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { useEffect } from 'react';
import { router, Href } from 'expo-router';

// Configure global notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// 1. requestNotificationPermission
export async function requestNotificationPermission(): Promise<boolean> {
  if (!Device.isDevice) {
    return false; // Simulators don't support push notifications
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return false;
  }

  if (Platform.OS === 'android') {
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
  }

  return true;
}

// 2. scheduleMorningBrief
export async function scheduleMorningBrief(topTaskTitle: string): Promise<void> {
  // Cancel existing morning brief first
  await Notifications.cancelScheduledNotificationAsync('morning_brief').catch(() => {});

  // Schedule daily at 8:00 AM
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
  });
}

// 3. scheduleStreakAlert
export async function scheduleStreakAlert(): Promise<void> {
  // Cancel existing streak alert first
  await Notifications.cancelScheduledNotificationAsync('streak_alert').catch(() => {});

  // Schedule daily at 9:00 PM
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
  });
}

// 3.5 scheduleRevisionAlert
export async function scheduleRevisionAlert(topicTitle: string, delayDays: number): Promise<void> {
  const triggerDate = new Date();
  triggerDate.setDate(triggerDate.getDate() + delayDays);
  triggerDate.setHours(9, 0, 0, 0); // 9:00 AM

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
  });
}

// 4. cancelAllNotifications
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// 5. useNotificationResponse custom hook
export function useNotificationResponse() {
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
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

    return () => {
      subscription.remove();
    };
  }, []);
}
