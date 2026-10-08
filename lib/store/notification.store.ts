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
  time: string;
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

  // Actions
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'isRead'>) => void;
  updateSetting: <K extends keyof NotificationSettings>(key: K, value: NotificationSettings[K]) => void;
  resetDefaults: () => void;
}

const DEFAULT_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    type: 'brief',
    title: 'Daily Morning Brief ☀️',
    body: "Today's priority: Complete your planned focus blocks and keep your momentum high!",
    time: '8:00 AM',
    timestamp: Date.now() - 1000 * 60 * 60 * 2,
    isRead: false,
    targetScreen: '/',
    actionText: 'View Today Brief',
  },
  {
    id: 'notif-2',
    type: 'streak',
    title: "Don't break your 7-day streak! 🔥",
    body: 'Complete at least 1 habit before midnight to keep your streak shield alive.',
    time: '2h ago',
    timestamp: Date.now() - 1000 * 60 * 120,
    isRead: false,
    targetScreen: '/habits',
    actionText: 'Log Habits Now',
  },
  {
    id: 'notif-3',
    type: 'revision',
    title: 'Spaced Repetition Nudge 🧠',
    body: 'Time to review "Data Structures & Algorithms" to lock memory retention.',
    time: 'Yesterday',
    timestamp: Date.now() - 1000 * 60 * 60 * 24,
    isRead: true,
    targetScreen: '/(tabs)/learn',
    actionText: 'Start Review',
  },
  {
    id: 'notif-4',
    type: 'milestone',
    title: 'Focus Goal Unlocked! 🏆',
    body: 'Congratulations! You reached over 10 cumulative hours of deep focus session.',
    time: '2 days ago',
    timestamp: Date.now() - 1000 * 60 * 60 * 48,
    isRead: true,
    targetScreen: '/(tabs)/focus',
    actionText: 'View Focus Stats',
  },
];

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
      notifications: DEFAULT_NOTIFICATIONS,
      settings: DEFAULT_SETTINGS,

      markAsRead: (id: string) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, isRead: true } : n
          ),
        }));
      },

      markAllAsRead: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        }));
      },

      deleteNotification: (id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      },

      clearAll: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        set({ notifications: [] });
      },

      addNotification: (item) => {
        const newNotif: AppNotification = {
          ...item,
          id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          timestamp: Date.now(),
          isRead: false,
        };

        set((state) => ({
          notifications: [newNotif, ...state.notifications],
        }));
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
          notifications: DEFAULT_NOTIFICATIONS,
          settings: DEFAULT_SETTINGS,
        });
      },
    }),
    {
      name: 'lifetrack_notification_storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
