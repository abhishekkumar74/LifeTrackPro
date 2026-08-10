import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase/client';
import { queryClient } from '../query-client';
import { Alert } from 'react-native';

export type SoundKey = 'rain' | 'cafe' | 'ocean' | 'lofi' | 'brown_noise';
export type FocusPreset = '25/5' | '50/10' | '90/20' | 'custom';

export interface FocusState {
  // Timer
  isRunning: boolean;
  isPaused: boolean;
  secondsLeft: number;
  totalSeconds: number;
  elapsedSeconds: number;
  sessionStartTimestamp: number | null;

  // Session
  sessionGoal: string;
  subjectTag: string | null;
  linkedTaskId: string | null;

  // Pomodoro
  pomodoroCount: number;
  currentMode: 'focus' | 'short_break' | 'long_break';
  selectedPreset: FocusPreset;
  customMinutes: number;

  // Audio
  activeSound: SoundKey | null;
  soundVolume: number;

  // Blocker
  isBlockerActive: boolean;
  blockedAppsCount: number;

  // Theme
  activeTheme: 'default' | 'gold' | 'rose_gold' | 'sunset' | 'mint' | 'nebula' | 'obsidian';

  // Strict Mode Plant Gamification
  isStrictModeActive: boolean;
  isPlantWilted: boolean;
  selectedPlantId: string;

  // Actions
  setPreset: (preset: FocusPreset) => void;
  setCustomMinutes: (min: number) => void;
  setSessionGoal: (goal: string) => void;
  setSubjectTag: (subject: string | null) => void;
  setLinkedTaskId: (id: string | null) => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  tick: () => void;
  setSound: (key: SoundKey | null) => void;
  setVolume: (vol: number) => void;
  toggleBlocker: () => void;
  setTheme: (theme: 'default' | 'gold' | 'rose_gold' | 'sunset' | 'mint' | 'nebula' | 'obsidian') => void;
  toggleStrictMode: () => void;
  setPlantWilted: (wilted: boolean) => void;
  setSelectedPlant: (plantId: string) => void;
  resetSession: (resetCount?: boolean) => void;
}

const getFocusDuration = (preset: FocusPreset, customMinutes: number): number => {
  if (preset === 'custom') return customMinutes * 60;
  if (preset === '25/5') return 25 * 60;
  if (preset === '50/10') return 50 * 60;
  if (preset === '90/20') return 90 * 60;
  return 25 * 60;
};

const getBreakDuration = (preset: FocusPreset): number => {
  if (preset === '25/5') return 5 * 60;
  if (preset === '50/10') return 10 * 60;
  if (preset === '90/20') return 20 * 60;
  return 5 * 60; // Default break for custom
};

const DEFAULT_FOCUS_MINUTES = 25;

const resyncFocusTimer = async (state: FocusState) => {
  if (state.isRunning && state.sessionStartTimestamp) {
    const elapsedSeconds = Math.floor((Date.now() - state.sessionStartTimestamp) / 1000);

    if (elapsedSeconds >= state.totalSeconds) {
      // Scenario C: Session completed while closed/crashed
      const focusMinutes =
        state.selectedPreset === 'custom'
          ? state.customMinutes
          : parseInt(state.selectedPreset.split('/')[0], 10);

      const startedAt = new Date(state.sessionStartTimestamp).toISOString();
      const endedAt = new Date(state.sessionStartTimestamp + state.totalSeconds * 1000).toISOString();

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { error } = await supabase.from('focus_sessions').insert({
            user_id: session.user.id,
            session_goal: state.sessionGoal.trim() || 'Deep Focus Session',
            duration_min: focusMinutes,
            subject: state.subjectTag,
            sound_used: state.activeSound,
            mood: null,
            started_at: startedAt,
            ended_at: endedAt,
            status: 'completed',
          });

          if (error) throw error;

          // Invalidate cache
          queryClient.invalidateQueries({ queryKey: ['stats'] });
          queryClient.invalidateQueries({ queryKey: ['todayStats'] });

          Alert.alert(
            'Focus Session Completed',
            `Your focus session "${state.sessionGoal || 'Deep Focus'}" has been successfully logged.`
          );
        }
      } catch (err) {
        if (__DEV__) console.warn('Failed to log auto-completed focus session on startup:', err);
      }

      // Reset store state
      useFocusStore.getState().resetSession();
    } else {
      // Scenario C: Session still active, adjust drift
      useFocusStore.setState({
        secondsLeft: state.totalSeconds - elapsedSeconds,
        elapsedSeconds: elapsedSeconds,
      });
    }
  }
};

export const useFocusStore = create<FocusState>()(
  persist(
    (set, get) => ({
      // Initial Timer States
  isRunning: false,
  isPaused: false,
  secondsLeft: DEFAULT_FOCUS_MINUTES * 60,
  totalSeconds: DEFAULT_FOCUS_MINUTES * 60,
  elapsedSeconds: 0,
  sessionStartTimestamp: null,

  // Initial Session States
  sessionGoal: '',
  subjectTag: null,
  linkedTaskId: null,

  // Initial Pomodoro States
  pomodoroCount: 0,
  currentMode: 'focus',
  selectedPreset: '25/5',
  customMinutes: DEFAULT_FOCUS_MINUTES,

  // Initial Audio States
  activeSound: null,
  soundVolume: 0.5,

  // Initial Blocker States
  isBlockerActive: false,
  blockedAppsCount: 0,

  // Initial Theme States
  activeTheme: 'default',

  // Initial Strict Mode States
  isStrictModeActive: false,
  isPlantWilted: false,
  selectedPlantId: 'sprout',

  // Actions
  setPreset: (preset) => {
    const { customMinutes, isRunning } = get();
    set({ selectedPreset: preset });
    if (!isRunning) {
      const duration = getFocusDuration(preset, customMinutes);
      set({
        secondsLeft: duration,
        totalSeconds: duration,
        currentMode: 'focus',
        isPaused: false,
      });
    }
  },

  setCustomMinutes: (min) => {
    const { selectedPreset, isRunning } = get();
    set({ customMinutes: min });
    if (selectedPreset === 'custom' && !isRunning) {
      const duration = min * 60;
      set({
        secondsLeft: duration,
        totalSeconds: duration,
        currentMode: 'focus',
        isPaused: false,
      });
    }
  },

  setSessionGoal: (goal) => set({ sessionGoal: goal }),

  setSubjectTag: (subject) => set({ subjectTag: subject }),

  setLinkedTaskId: (id) => set({ linkedTaskId: id }),

  start: () => {
    set({ 
      isRunning: true, 
      isPaused: false, 
      sessionStartTimestamp: Date.now() 
    });
  },

  pause: () => {
    set({ 
      isRunning: false, 
      isPaused: true, 
      sessionStartTimestamp: null 
    });
  },

  resume: () => {
    set({ 
      isRunning: true, 
      isPaused: false, 
      sessionStartTimestamp: Date.now() - (get().elapsedSeconds * 1000) 
    });
  },

  stop: () => {
    const { selectedPreset, customMinutes, currentMode } = get();
    let duration = 0;
    if (currentMode === 'focus') {
      duration = getFocusDuration(selectedPreset, customMinutes);
    } else if (currentMode === 'short_break') {
      duration = getBreakDuration(selectedPreset);
    } else {
      duration = 15 * 60; // long break (15 mins)
    }
    set({
      isRunning: false,
      isPaused: false,
      secondsLeft: duration,
      totalSeconds: duration,
      elapsedSeconds: 0,
      sessionStartTimestamp: null,
    });
  },

  tick: () => {
    const { secondsLeft, currentMode, pomodoroCount, selectedPreset, customMinutes } = get();

    if (secondsLeft <= 1) {
      // Transitioning modes
      let nextMode: 'focus' | 'short_break' | 'long_break' = 'focus';
      let nextCount = pomodoroCount;
      let duration = 0;

      if (currentMode === 'focus') {
        nextCount = pomodoroCount + 1;
        if (nextCount > 0 && nextCount % 4 === 0) {
          nextMode = 'long_break';
          duration = 15 * 60; // Long Break: 15 minutes
        } else {
          nextMode = 'short_break';
          duration = getBreakDuration(selectedPreset);
        }
      } else {
        // From short_break or long_break back to focus
        nextMode = 'focus';
        duration = getFocusDuration(selectedPreset, customMinutes);
      }

      set({
        currentMode: nextMode,
        pomodoroCount: nextCount,
        secondsLeft: duration,
        totalSeconds: duration,
        isRunning: false, // User manually triggers the start of breaks/focus sessions
        isPaused: false,
        sessionStartTimestamp: null,
      });
    } else {
      // Normal countdown tick
      set((state) => ({
        secondsLeft: state.secondsLeft - 1,
        elapsedSeconds: state.elapsedSeconds + 1,
      }));
    }
  },

  setSound: (key) => set({ activeSound: key }),

  setVolume: (vol) => set({ soundVolume: vol }),

  toggleBlocker: () => set((state) => ({
    isBlockerActive: !state.isBlockerActive,
    blockedAppsCount: !state.isBlockerActive ? 12 : 0, // Simulate blocking 12 distraction apps
  })),

  setTheme: (theme) => set({ activeTheme: theme }),

  toggleStrictMode: () => set((state) => ({ isStrictModeActive: !state.isStrictModeActive })),
  setPlantWilted: (wilted) => set({ isPlantWilted: wilted }),
  setSelectedPlant: (plantId) => set({ selectedPlantId: plantId }),

  resetSession: (resetCount = false) => {
    const { selectedPreset, customMinutes, pomodoroCount } = get();
    const duration = getFocusDuration(selectedPreset, customMinutes);
    set({
      isRunning: false,
      isPaused: false,
      secondsLeft: duration,
      totalSeconds: duration,
      elapsedSeconds: 0,
      sessionGoal: '',
      subjectTag: null,
      linkedTaskId: null,
      pomodoroCount: resetCount ? 0 : pomodoroCount,
      currentMode: 'focus',
      isBlockerActive: false,
      blockedAppsCount: 0,
      isPlantWilted: false,
      sessionStartTimestamp: null,
    });
  },
  }),
  {
    name: 'lifetrack-focus-store',
    storage: createJSONStorage(() => AsyncStorage),
    onRehydrateStorage: () => {
      return (state, error) => {
        if (error) {
          if (__DEV__) console.warn('Error hydrating focus store:', error);
          return;
        }
        if (state) {
          resyncFocusTimer(state);
        }
      };
    },
  }
 )
);
