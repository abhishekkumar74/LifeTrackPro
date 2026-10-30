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
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'isRead'>) => void;
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

        // Deduplication: Avoid duplicate notifications with identical title & type within 5 minutes
        const isDuplicate = currentNotifications.some(
          (n) =>
            n.title === item.title &&
            n.type === item.type &&
            Math.abs(now - n.timestamp) < 1000 * 60 * 5
        );

        if (isDuplicate) {
          return;
        }

        const newNotif: AppNotification = {
          ...item,
          id: `notif_${now}_${Math.random().toString(36).substring(2, 7)}`,
          timestamp: now,
          time: 'Just now',
          isRead: false,
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

        // If user explicitly cleared notifications recently (within last 12 hours), respect user intent
        if (state.lastClearedAt && now - state.lastClearedAt < 1000 * 60 * 60 * 12) {
          return;
        }

        if (state.settings.doNotDisturb) {
          return;
        }

        const currentHour = new Date(now).getHours();
        const hasRecentType = (type: NotificationType) =>
          currentNotifications.some(
            (n) => n.type === type && Math.abs(now - n.timestamp) < 1000 * 60 * 60 * 18
          );

        const newItems: AppNotification[] = [];

        // Morning Brief (6:00 AM - 11:59 AM)
        if (currentHour >= 6 && currentHour < 12 && !hasRecentType('brief') && state.settings.morningBriefEnabled) {
          newItems.push({
            id: `notif_brief_${now}`,
            type: 'brief',
            title: 'Daily Morning Brief',
            body: 'Your focus goals are ready. Plan your deep work sessions and maintain peak momentum today.',
            time: 'Just now',
            timestamp: now,
            isRead: false,
            targetScreen: '/',
            actionText: "View Today's Plan",
          });
        }

        // Streak saver (7:00 PM - 11:59 PM)
        if (currentHour >= 19 && !hasRecentType('streak') && state.settings.streakAlertsEnabled) {
          newItems.push({
            id: `notif_streak_${now}`,
            type: 'streak',
            title: 'Keep Your Streak Active',
            body: 'Check in on your daily habits today to keep your streak shield intact.',
            time: 'Just now',
            timestamp: now,
            isRead: false,
            targetScreen: '/habits',
            actionText: 'Log Habits Now',
          });
        }

        if (newItems.length > 0) {
          set({
            notifications: [...newItems, ...currentNotifications].slice(0, 50),
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
        // Purge legacy hardcoded mock notification IDs and emoji mocks
        const legacyDummyIds = new Set(['notif-1', 'notif-2', 'notif-3', 'notif-4']);
        const cleanedNotifications = Array.isArray(persistedState.notifications)
          ? persistedState.notifications.filter(
              (n: any) =>
                n &&
                !legacyDummyIds.has(n.id) &&
                !n.title?.includes('☀️') &&
                !n.title?.includes('🔥') &&
                !n.title?.includes('🧠') &&
                !n.title?.includes('🏆')
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
