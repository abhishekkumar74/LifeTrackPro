import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform, Alert, Linking } from 'react-native';
import { useEffect } from 'react';
import { router, Href } from 'expo-router';
import { useNotificationStore } from '@/lib/store/notification.store';
import { useFocusStore } from '@/lib/store/focus.store';
import { FocusLiveActivity } from '@/lib/native/live-activity';
import { supabase } from '@/lib/supabase/client';

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
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
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
          name: 'Focus & Milestones',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#5B4FE8',
          sound: 'default',
        });
        await Notifications.setNotificationChannelAsync('habit_channel', {
          name: 'Habit Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'default',
        });
        await Notifications.setNotificationChannelAsync('streak_channel', {
          name: 'Streak Alerts',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#D97706',
          sound: 'default',
        });
        await Notifications.setNotificationChannelAsync('revision_channel', {
          name: 'Spaced Repetition & Revision',
          importance: Notifications.AndroidImportance.DEFAULT,
          sound: 'default',
        });
        await Notifications.setNotificationChannelAsync('active_focus_channel', {
          name: 'Active Focus & Soundscapes',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: null,
          enableVibrate: false,
          lightColor: '#5B4FE8',
          sound: null,
          showBadge: true,
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
export async function scheduleMorningBrief(topTaskTitle: string, hour = 8, minute = 0): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync('morning_brief').catch(() => {});

    await Notifications.scheduleNotificationAsync({
      identifier: 'morning_brief',
      content: {
        title: 'Good morning!',
        body: `Today's priority: ${topTaskTitle || 'Complete your planned focus blocks'}`,
        data: { screen: '/', type: 'brief', actionText: "View Today's Plan" },
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        channelId: 'focus_channel',
        hour,
        minute,
      },
    }).catch(() => {});
  } catch (err) {
    if (__DEV__) console.warn('scheduleMorningBrief failed:', err);
  }
}

// 2.5 scheduleHabitReminder (Afternoon Check-in)
export async function scheduleHabitReminder(hour = 14, minute = 30): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync('afternoon_habit').catch(() => {});

    await Notifications.scheduleNotificationAsync({
      identifier: 'afternoon_habit',
      content: {
        title: 'Habit Check-in',
        body: 'Keep your momentum high! Check off your daily habits before the evening rush.',
        data: { screen: '/habits', type: 'streak', actionText: 'Log Habits Now' },
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        channelId: 'habit_channel',
        hour,
        minute,
      },
    }).catch(() => {});
  } catch (err) {
    if (__DEV__) console.warn('scheduleHabitReminder failed:', err);
  }
}

// 3. scheduleStreakAlert (Evening Streak Saver)
export async function scheduleStreakAlert(hour = 21, minute = 0): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync('streak_alert').catch(() => {});

    await Notifications.scheduleNotificationAsync({
      identifier: 'streak_alert',
      content: {
        title: "Don't break your streak!",
        body: 'Complete at least 1 habit before midnight to protect your active streak shield.',
        data: { screen: '/habits', type: 'streak', actionText: 'Save Streak' },
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        channelId: 'streak_channel',
        hour,
        minute,
      },
    }).catch(() => {});
  } catch (err) {
    if (__DEV__) console.warn('scheduleStreakAlert failed:', err);
  }
}

// 3.2 scheduleEveningReview (Daily Wrap-up)
export async function scheduleEveningReview(hour = 22, minute = 0): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync('evening_review').catch(() => {});

    await Notifications.scheduleNotificationAsync({
      identifier: 'evening_review',
      content: {
        title: 'Daily Wrap-up',
        body: 'Take 1 minute to reflect on today’s focus achievements and review your stats.',
        data: { screen: '/(tabs)/stats', type: 'brief', actionText: 'View Stats' },
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        channelId: 'focus_channel',
        hour,
        minute,
      },
    }).catch(() => {});
  } catch (err) {
    if (__DEV__) console.warn('scheduleEveningReview failed:', err);
  }
}

// 3.5 scheduleRevisionAlert (Spaced Repetition)
export async function scheduleRevisionAlert(topicTitle: string, delayDays: number): Promise<void> {
  if (!Notifications) return;
  try {
    const triggerDate = new Date();
    triggerDate.setDate(triggerDate.getDate() + delayDays);
    triggerDate.setHours(9, 30, 0, 0);

    const cleanTitle = topicTitle.trim();
    const seconds = Math.max(1, Math.floor((triggerDate.getTime() - Date.now()) / 1000));
    await Notifications.scheduleNotificationAsync({
      identifier: `revision_${cleanTitle.replace(/\s+/g, '_')}_${delayDays}`,
      content: {
        title: 'Time to Revise!',
        body: `It's time to review "${cleanTitle}" to boost long-term memory retention!`,
        sound: 'default',
        data: { screen: '/(tabs)/learn', type: 'revision', actionText: 'Start Review' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        channelId: 'revision_channel',
        seconds,
      },
    }).catch(() => {});
  } catch (err) {
    if (__DEV__) console.warn('scheduleRevisionAlert failed:', err);
  }
}

// 3.8 triggerLocalFocusCompleteNotification
export async function triggerLocalFocusCompleteNotification(
  durationMin: number,
  xpEarned: number
): Promise<void> {
  const title = 'Focus Session Complete';
  const body = `Phenomenal work! You completed ${durationMin}m of deep work (+${xpEarned} XP earned).`;

  if (Notifications) {
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: `focus_complete_${Date.now()}`,
        content: {
          title,
          body,
          data: { screen: '/(tabs)/focus', type: 'milestone', actionText: 'View Focus Stats' },
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          channelId: 'focus_channel',
          seconds: 1,
        },
      }).catch(() => {});
    } catch (err) {
      if (__DEV__) console.warn('triggerLocalFocusCompleteNotification failed:', err);
    }
  }

  // Record in in-app notification center immediately (like Instagram activity feed)
  useNotificationStore.getState().addNotification({
    type: 'milestone',
    title,
    body,
    time: 'Just now',
    targetScreen: '/(tabs)/focus',
    actionText: 'View Focus Stats',
  });
}

// 3.8.1 showActiveFocusNotification (Ongoing system notification for Android notification shade & Foreground Service)
export const ACTIVE_FOCUS_NOTIF_ID = 'lifetrack_active_focus_session';
export const FOCUS_CATEGORY_RUNNING = 'lifetrack_focus_running';
export const FOCUS_CATEGORY_PAUSED = 'lifetrack_focus_paused';

let areFocusCategoriesRegistered = false;

export async function registerFocusNotificationCategories(): Promise<void> {
  if (!Notifications || areFocusCategoriesRegistered) return;
  try {
    await Notifications.setNotificationCategoryAsync(FOCUS_CATEGORY_RUNNING, [
      {
        identifier: 'pause_focus',
        buttonTitle: 'Pause',
        options: {
          opensAppToForeground: false,
        },
      },
      {
        identifier: 'end_focus',
        buttonTitle: 'End Session',
        options: {
          opensAppToForeground: true,
          isDestructive: true,
        },
      },
    ]);

    await Notifications.setNotificationCategoryAsync(FOCUS_CATEGORY_PAUSED, [
      {
        identifier: 'resume_focus',
        buttonTitle: 'Resume',
        options: {
          opensAppToForeground: false,
        },
      },
      {
        identifier: 'end_focus',
        buttonTitle: 'End Session',
        options: {
          opensAppToForeground: true,
          isDestructive: true,
        },
      },
    ]);
    areFocusCategoriesRegistered = true;
  } catch (err) {
    if (__DEV__) console.warn('registerFocusNotificationCategories error:', err);
  }
}

export async function showActiveFocusNotification(params: {
  title?: string;
  goal?: string;
  subject?: string | null;
  activeSound?: string | null;
  durationMinutes?: number;
  secondsLeft?: number;
  isPaused?: boolean;
  mode?: 'focus' | 'short_break' | 'long_break';
}): Promise<void> {
  if (!Notifications) return;
  try {
    await registerFocusNotificationCategories();

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('active_focus_channel', {
        name: 'Active Focus Session',
        importance: Notifications.AndroidImportance.HIGH,
        sound: null,
        enableVibrate: false,
        vibrationPattern: null,
        lightColor: '#5B4FE8',
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: false,
      }).catch(() => {});
    }

    const isPaused = params.isPaused ?? false;
    const isBreak = params.mode === 'short_break' || params.mode === 'long_break';

    const mins = params.secondsLeft !== undefined
      ? Math.floor(params.secondsLeft / 60)
      : (params.durationMinutes || 25);
    const secs = params.secondsLeft !== undefined ? params.secondsLeft % 60 : 0;
    const formattedClock = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

    const goalText = params.goal && params.goal.trim() ? params.goal.trim() : (isBreak ? 'Break Session' : 'Deep Focus');
    const soundText = params.activeSound && params.activeSound !== 'none'
      ? ` · ${params.activeSound.replace('_', ' ').toUpperCase()}`
      : '';
    const subjectText = params.subject ? `[${params.subject}] ` : '';

    const statusTag = isPaused ? 'PAUSED' : (isBreak ? 'BREAK' : 'FOCUS');
    const notifTitle = params.title || `${subjectText}${goalText}`;
    const notifBody = `${statusTag} · ${formattedClock} remaining${soundText}`;

    await Notifications.scheduleNotificationAsync({
      identifier: ACTIVE_FOCUS_NOTIF_ID,
      content: {
        title: notifTitle,
        body: notifBody,
        categoryIdentifier: isPaused ? FOCUS_CATEGORY_PAUSED : FOCUS_CATEGORY_RUNNING,
        data: { screen: '/(tabs)/focus', type: 'focus_active' },
        sound: false,
        sticky: true,
        autoDismiss: false,
        priority: 'high',
        color: '#5B4FE8',
      },
      trigger: null,
    }).catch(() => {});
  } catch (err) {
    if (__DEV__) console.warn('showActiveFocusNotification failed:', err);
  }
}

export async function dismissActiveFocusNotification(): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.dismissNotificationAsync(ACTIVE_FOCUS_NOTIF_ID).catch(() => {});
    await Notifications.cancelScheduledNotificationAsync(ACTIVE_FOCUS_NOTIF_ID).catch(() => {});
  } catch (err) {
    if (__DEV__) console.warn('dismissActiveFocusNotification failed:', err);
  }
}

// 3.9 sendTestNotification
export async function sendTestNotification(): Promise<boolean> {
  const granted = await requestNotificationPermission();
  if (!granted) return false;

  const title = 'LifeTrack Pro Alert';
  const body = 'Notifications are working smoothly! Streak reminders, briefs, and study nudges are active.';

  // 1. Send push to device notification shade
  if (Notifications) {
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: `test_${Date.now()}`,
        content: {
          title,
          body,
          data: { screen: '/notifications', type: 'system', actionText: 'View Notification Center' },
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          channelId: 'focus_channel',
          seconds: 1,
        },
      }).catch(() => {});
    } catch (err) {
      if (__DEV__) console.warn('sendTestNotification trigger failed:', err);
    }
  }

  // 2. Add to in-app notification store immediately
  useNotificationStore.getState().addNotification({
    type: 'system',
    title,
    body,
    time: 'Just now',
    targetScreen: '/notifications',
    actionText: 'Notification Center',
  });

  return true;
}

// 3.10 syncNotificationSchedules (Centralized scheduler synced with user settings)
export async function syncNotificationSchedules(): Promise<void> {
  // Sync in-app notification center activity feed
  useNotificationStore.getState().refreshDailyNudges();

  if (!Notifications) return;

  try {
    const { settings } = useNotificationStore.getState();

    // If Do Not Disturb is enabled, cancel scheduled push alerts
    if (settings.doNotDisturb) {
      await cancelAllNotifications();
      return;
    }

    // 1. Morning Brief
    if (settings.morningBriefEnabled) {
      let topTitle = 'Complete your daily habits and focus blocks';
      try {
        const { data: tasks } = await supabase
          .from('tasks')
          .select('title')
          .is('completed_at', null)
          .limit(1);
        if (tasks && tasks[0]?.title) {
          topTitle = tasks[0].title;
        }
      } catch {}
      await scheduleMorningBrief(topTitle);
    } else {
      await cancelScheduledNotification('morning_brief');
    }

    // 2. Habit Reminders (Afternoon 2:30 PM)
    if (settings.habitRemindersEnabled) {
      await scheduleHabitReminder(14, 30);
    } else {
      await cancelScheduledNotification('afternoon_habit');
    }

    // 3. Streak Alerts (Evening 9:00 PM)
    if (settings.streakAlertsEnabled) {
      await scheduleStreakAlert(21, 0);
    } else {
      await cancelScheduledNotification('streak_alert');
    }

    // 4. Evening Wrap-up (Night 10:00 PM)
    await scheduleEveningReview(22, 0);
  } catch (err) {
    if (__DEV__) console.warn('syncNotificationSchedules failed:', err);
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
    // Refresh in-app activity nudges on mount
    useNotificationStore.getState().refreshDailyNudges();

    if (!Notifications) return;
    let responseSubscription: any = null;
    let receivedSubscription: any = null;

    try {
      // Check for notification response on cold start (when app launched from notification tap)
      Notifications.getLastNotificationResponseAsync().then((response) => {
        if (response) {
          const content = response.notification.request.content;
          const data = content.data;
          const screen = data?.screen;
          if (content.title && data?.type !== 'focus_active') {
            useNotificationStore.getState().addNotification({
              type: (data?.type as any) || 'brief',
              title: content.title,
              body: content.body || '',
              time: 'Just now',
              targetScreen: (screen as string) || '/',
              actionText: (data?.actionText as string) || 'View Details',
            });
          }
          if (screen) {
            router.push(screen === 'home' ? '/' : (screen as Href));
          }
        }
      }).catch(() => {});

      // Listener 1: When a notification arrives (foreground or background trigger)
      receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
        const { title, body, data } = notification.request.content;
        if (title && data?.type !== 'focus_active') {
          useNotificationStore.getState().addNotification({
            type: (data?.type as any) || 'brief',
            title,
            body: body || '',
            time: 'Just now',
            targetScreen: (data?.screen as string) || '/',
            actionText: (data?.actionText as string) || 'View Details',
          });
        }
      });

      // Listener 2: When user taps a notification banner or action button in system shade
      responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
        const actionIdentifier = response.actionIdentifier;
        const content = response.notification.request.content;
        const data = content.data;
        const screen = data?.screen;

        // Handle Active Focus Notification Action Buttons
        if (actionIdentifier === 'pause_focus') {
          const store = useFocusStore.getState();
          if (store.isRunning) {
            store.pause();
            FocusLiveActivity.updateSession(true, store.secondsLeft, store.sessionGoal).catch(() => {});
            showActiveFocusNotification({
              goal: store.sessionGoal,
              subject: store.subjectTag,
              activeSound: store.activeSound,
              secondsLeft: store.secondsLeft,
              isPaused: true,
              mode: store.currentMode,
            }).catch(() => {});
          }
          return;
        }

        if (actionIdentifier === 'resume_focus') {
          const store = useFocusStore.getState();
          if (store.isPaused) {
            store.resume();
            FocusLiveActivity.updateSession(false, store.secondsLeft, store.sessionGoal).catch(() => {});
            showActiveFocusNotification({
              goal: store.sessionGoal,
              subject: store.subjectTag,
              activeSound: store.activeSound,
              secondsLeft: store.secondsLeft,
              isPaused: false,
              mode: store.currentMode,
            }).catch(() => {});
          }
          return;
        }

        if (actionIdentifier === 'end_focus') {
          router.push('/(tabs)/focus' as Href);
          return;
        }

        // Add or ensure recorded in in-app store, and mark as read
        if (content.title && data?.type !== 'focus_active') {
          useNotificationStore.getState().addNotification({
            type: (data?.type as any) || 'brief',
            title: content.title,
            body: content.body || '',
            time: 'Just now',
            targetScreen: (screen as string) || '/',
            actionText: (data?.actionText as string) || 'View Details',
          });
        }

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
      if (responseSubscription && typeof responseSubscription.remove === 'function') {
        responseSubscription.remove();
      }
      if (receivedSubscription && typeof receivedSubscription.remove === 'function') {
        receivedSubscription.remove();
      }
    };
  }, []);
}
