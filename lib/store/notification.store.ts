import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

export type NotificationType = 'brief' | 'streak' | 'revision' | 'milestone' | 'habit' | 'system';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  time?: string;
  timestamp: number;
  isRead: boolean;
  targetScreen: string;
  actionText?: string;
}

export interface NotificationSettings {
  morningBriefEnabled: boolean;
  streakAlertsEnabled: boolean;
  habitRemindersEnabled: boolean;
  revisionAlertsEnabled: boolean;
  doNotDisturb: boolean;
  morningBriefTime: string;
}

interface NotificationState {
  notifications: AppNotification[];
  settings: NotificationSettings;
  lastClearedAt: number | null;

  // Actions
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
  addNotification: (
    notification: Omit<AppNotification, 'id' | 'timestamp' | 'isRead'> &
      Partial<Pick<AppNotification, 'id' | 'timestamp' | 'isRead'>>
  ) => void;
  updateSetting: <K extends keyof NotificationSettings>(key: K, value: NotificationSettings[K]) => void;
  refreshDailyNudges: () => void;
  resetDefaults: () => void;
}

export function formatNotificationTime(timestamp?: number, fallback = 'Just now'): string {
  if (!timestamp) return fallback;
  const now = Date.now();
  const diff = Math.max(0, now - timestamp);

  if (diff < 60 * 1000) return 'Just now';
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}m ago`;
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    return `${hours}h ago`;
  }
  if (diff < 48 * 60 * 60 * 1000) return 'Yesterday';

  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const DEFAULT_SETTINGS: NotificationSettings = {
  morningBriefEnabled: true,
  streakAlertsEnabled: true,
  habitRemindersEnabled: true,
  revisionAlertsEnabled: true,
  doNotDisturb: false,
  morningBriefTime: '08:00 AM',
};

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      settings: DEFAULT_SETTINGS,
      lastClearedAt: null,

      markAsRead: (id: string) => {
        set((state) => ({
          notifications: (state.notifications || []).map((n) =>
            n.id === id ? { ...n, isRead: true } : n
          ),
        }));
      },

      markAllAsRead: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        set((state) => ({
          notifications: (state.notifications || []).map((n) => ({ ...n, isRead: true })),
        }));
      },

      deleteNotification: (id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        set((state) => ({
          notifications: (state.notifications || []).filter((n) => n.id !== id),
        }));
      },

      clearAll: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        set({
          notifications: [],
          lastClearedAt: Date.now(),
        });
      },

      addNotification: (item) => {
        const now = Date.now();
        const currentNotifications = get().notifications || [];

        const targetTimestamp = item.timestamp ?? now;
        const targetId = item.id ?? `notif_${now}_${Math.random().toString(36).substring(2, 7)}`;
        const targetIsRead = item.isRead ?? false;

        // Deduplication: Avoid duplicate notifications with identical title & type within 4 hours, or matching id
        const isDuplicate = currentNotifications.some(
          (n) =>
            n.id === targetId ||
            (n.title === item.title &&
              n.type === item.type &&
              Math.abs(targetTimestamp - n.timestamp) < 1000 * 60 * 60 * 4)
        );

        if (isDuplicate) {
          return;
        }

        const newNotif: AppNotification = {
          ...item,
          id: targetId,
          timestamp: targetTimestamp,
          time: formatNotificationTime(targetTimestamp),
          isRead: targetIsRead,
        };

        // Prepend and cap at maximum 50 notifications to prevent unbounded memory growth
        set({
          notifications: [newNotif, ...currentNotifications].slice(0, 50),
        });
      },

      refreshDailyNudges: () => {
        const state = get();
        const now = Date.now();
        const currentNotifications = state.notifications || [];

        if (state.settings.doNotDisturb) {
          return;
        }

        const nowDate = new Date(now);
        const currentHour = nowDate.getHours();
        const currentMinute = nowDate.getMinutes();

        // Local date string YYYY-MM-DD
        const yyyy = nowDate.getFullYear();
        const mm = String(nowDate.getMonth() + 1).padStart(2, '0');
        const dd = String(nowDate.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;

        const newItems: AppNotification[] = [];

        const hasNotif = (id: string, title?: string) =>
          currentNotifications.some(
            (n) =>
              n.id === id ||
              (title && n.title === title && Math.abs(now - n.timestamp) < 1000 * 60 * 60 * 12)
          );

        // Helper: check if timestamp is strictly after user last cleared notifications
        const isAfterCleared = (ts: number) => {
          if (!state.lastClearedAt) return true;
          return ts > state.lastClearedAt;
        };

        // 1. Morning Brief (scheduled at 8:00 AM)
        const morningBriefTs = new Date(nowDate).setHours(8, 0, 0, 0);
        const effectiveBriefTs = currentHour < 8 ? now : morningBriefTs;

        if (
          currentHour >= 6 &&
          state.settings.morningBriefEnabled &&
          isAfterCleared(effectiveBriefTs) &&
          !hasNotif(`notif_brief_${dateStr}`, 'Daily Morning Brief')
        ) {
          newItems.push({
            id: `notif_brief_${dateStr}`,
            type: 'brief',
            title: 'Daily Morning Brief',
            body: 'Your focus goals and habits are ready. Start strong and maintain peak consistency today.',
            time: formatNotificationTime(effectiveBriefTs),
            timestamp: effectiveBriefTs,
            isRead: false,
            targetScreen: '/',
            actionText: "View Today's Plan",
          });
        }

        // 2. Afternoon Habit Check-in (scheduled at 2:30 PM / 14:30)
        const habitCheckinTs = new Date(nowDate).setHours(14, 30, 0, 0);
        if (
          (currentHour > 14 || (currentHour === 14 && currentMinute >= 30)) &&
          state.settings.habitRemindersEnabled &&
          isAfterCleared(habitCheckinTs) &&
          !hasNotif(`notif_habit_${dateStr}`, 'Habit Check-in')
        ) {
          newItems.push({
            id: `notif_habit_${dateStr}`,
            type: 'habit',
            title: 'Habit Check-in',
            body: 'Keep your momentum high! Check off your daily habits before the evening rush.',
            time: formatNotificationTime(habitCheckinTs),
            timestamp: habitCheckinTs,
            isRead: false,
            targetScreen: '/habits',
            actionText: 'Log Habits Now',
          });
        }

        // 3. Evening Streak Saver Alert (scheduled at 9:00 PM / 21:00)
        const streakAlertTs = new Date(nowDate).setHours(21, 0, 0, 0);
        if (
          currentHour >= 21 &&
          state.settings.streakAlertsEnabled &&
          isAfterCleared(streakAlertTs) &&
          !hasNotif(`notif_streak_${dateStr}`, "Don't break your streak!") &&
          !hasNotif(`notif_streak_${dateStr}`, 'Keep Your Streak Active')
        ) {
          newItems.push({
            id: `notif_streak_${dateStr}`,
            type: 'streak',
            title: 'Keep Your Streak Active',
            body: 'Don\'t break your streak! Complete at least 1 habit before midnight to protect your active streak shield.',
            time: formatNotificationTime(streakAlertTs),
            timestamp: streakAlertTs,
            isRead: false,
            targetScreen: '/habits',
            actionText: 'Save Streak',
          });
        }

        // 4. Daily Wrap-up / Evening Review (scheduled at 10:00 PM / 22:00)
        const eveningReviewTs = new Date(nowDate).setHours(22, 0, 0, 0);
        if (
          currentHour >= 22 &&
          isAfterCleared(eveningReviewTs) &&
          !hasNotif(`notif_review_${dateStr}`, 'Daily Wrap-up')
        ) {
          newItems.push({
            id: `notif_review_${dateStr}`,
            type: 'brief',
            title: 'Daily Wrap-up',
            body: 'Take 1 minute to reflect on today’s focus achievements and review your stats.',
            time: formatNotificationTime(eveningReviewTs),
            timestamp: eveningReviewTs,
            isRead: false,
            targetScreen: '/(tabs)/stats',
            actionText: 'View Stats',
          });
        }

        // Welcome card if user has completely fresh inbox and never cleared
        if (currentNotifications.length === 0 && newItems.length === 0 && state.lastClearedAt === null) {
          newItems.push({
            id: 'notif_welcome_init',
            type: 'system',
            title: 'Welcome to LifeTrack Pro',
            body: 'Your consistency hub is active. Check off daily habits, run deep work Pomodoros, and build streaks.',
            time: 'Just now',
            timestamp: now,
            isRead: false,
            targetScreen: '/',
            actionText: 'Explore Dashboard',
          });
        }

        if (newItems.length > 0) {
          const combined = [...newItems, ...currentNotifications].sort((a, b) => b.timestamp - a.timestamp);
          set({
            notifications: combined.slice(0, 50),
          });
        }
      },

      updateSetting: (key, value) => {
        Haptics.selectionAsync().catch(() => {});
        set((state) => ({
          settings: {
            ...state.settings,
            [key]: value,
          },
        }));
      },

      resetDefaults: () => {
        set({
          notifications: [],
          settings: DEFAULT_SETTINGS,
          lastClearedAt: null,
        });
      },
    }),
    {
      name: 'lifetrack_notification_storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      migrate: (persistedState: any, version: number) => {
        if (!persistedState) {
          return {
            notifications: [],
            settings: DEFAULT_SETTINGS,
            lastClearedAt: null,
          };
        }
        // Purge legacy hardcoded mock notification IDs
        const legacyDummyIds = new Set(['notif-1', 'notif-2', 'notif-3', 'notif-4']);
        const cleanedNotifications = Array.isArray(persistedState.notifications)
          ? persistedState.notifications.filter(
              (n: any) =>
                n &&
                !legacyDummyIds.has(n.id) &&
                !/[\uD800-\uDBFF][\uDC00-\uDFFF]/.test(n.title || '')
            )
          : [];

        return {
          ...persistedState,
          notifications: cleanedNotifications,
          lastClearedAt: persistedState.lastClearedAt ?? null,
          settings: {
            ...DEFAULT_SETTINGS,
            ...(persistedState.settings || {}),
          },
        };
      },
    }
  )
);
