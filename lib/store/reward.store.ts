import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const MAX_HABIT_GRACE_TOKENS = 3;
export const THEME_PASS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
export const JOURNAL_EXPORT_PASS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

interface RewardState {
  // Placement 1.1: 24-Hour Aesthetic Timer Theme Pass
  unlockedThemesUntil: Record<string, number>;
  grantThemePass: (themeId: string) => void;
  isThemeUnlocked: (themeId: string, isPremium: boolean) => boolean;
  getThemeRemainingHours: (themeId: string) => number | null;

  // Placement 1.2: Habit Grace Tokens
  habitGraceTokensCount: number;
  habitGraceUsedDates: Record<string, string[]>; // habitId -> [dateStr]
  claimHabitGraceToken: () => boolean;
  consumeHabitGraceToken: (habitId: string, date: string) => boolean;
  isHabitDateGraceRepaired: (habitId: string, date: string) => boolean;

  // Placement 3.2: Export Life Journal to Formatted PDF
  unlockedJournalExportUntil: number;
  grantJournalExportPass: () => void;
  isJournalExportUnlocked: (isPremium: boolean) => boolean;
}

export const useRewardStore = create<RewardState>()(
  persist(
    (set, get) => ({
      // Theme Pass State
      unlockedThemesUntil: {},
      grantThemePass: (themeId: string) => {
        const now = Date.now();
        const expiry = now + THEME_PASS_DURATION_MS;
        set((state) => ({
          unlockedThemesUntil: {
            ...state.unlockedThemesUntil,
            [themeId]: expiry,
          },
        }));
      },
      isThemeUnlocked: (themeId: string, isPremium: boolean) => {
        if (themeId === 'default') return true;
        if (isPremium) return true;
        const expiry = get().unlockedThemesUntil[themeId] || 0;
        return expiry > Date.now();
      },
      getThemeRemainingHours: (themeId: string) => {
        const expiry = get().unlockedThemesUntil[themeId];
        if (!expiry) return null;
        const remainingMs = expiry - Date.now();
        if (remainingMs <= 0) return null;
        return Math.max(1, Math.ceil(remainingMs / (1000 * 60 * 60)));
      },

      // Habit Grace Token State
      habitGraceTokensCount: 1, // Start with 1 complimentary grace token
      habitGraceUsedDates: {},
      claimHabitGraceToken: () => {
        const current = get().habitGraceTokensCount;
        if (current >= MAX_HABIT_GRACE_TOKENS) return false;
        set({ habitGraceTokensCount: current + 1 });
        return true;
      },
      consumeHabitGraceToken: (habitId: string, date: string) => {
        const current = get().habitGraceTokensCount;
        if (current <= 0) return false;
        const usedMap = get().habitGraceUsedDates;
        const existingDates = usedMap[habitId] || [];
        if (existingDates.includes(date)) return false;

        set({
          habitGraceTokensCount: current - 1,
          habitGraceUsedDates: {
            ...usedMap,
            [habitId]: [...existingDates, date],
          },
        });
        return true;
      },
      isHabitDateGraceRepaired: (habitId: string, date: string) => {
        const usedMap = get().habitGraceUsedDates;
        const dates = usedMap[habitId] || [];
        return dates.includes(date);
      },

      // Journal PDF Export Pass State
      unlockedJournalExportUntil: 0,
      grantJournalExportPass: () => {
        set({ unlockedJournalExportUntil: Date.now() + JOURNAL_EXPORT_PASS_DURATION_MS });
      },
      isJournalExportUnlocked: (isPremium: boolean) => {
        if (isPremium) return true;
        return get().unlockedJournalExportUntil > Date.now();
      },
    }),
    {
      name: 'lifetrack_reward_store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
