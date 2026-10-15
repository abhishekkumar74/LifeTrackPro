import { NativeModules, Platform } from 'react-native';

const { FocusLiveActivityModule } = NativeModules;

export interface LiveActivityOptions {
  sessionName?: string;
  durationSeconds: number;
  sessionGoal?: string;
  accentHex?: string;
}

export const FocusLiveActivity = {
  /**
   * Starts an ActivityKit Live Activity on Dynamic Island and Lock Screen
   */
  startSession: async (options: LiveActivityOptions): Promise<boolean> => {
    if (Platform.OS !== 'ios' || !FocusLiveActivityModule?.startLiveActivity) {
      return false;
    }
    try {
      const res = await FocusLiveActivityModule.startLiveActivity(
        options.sessionName || 'Deep Focus',
        options.durationSeconds,
        options.sessionGoal || 'Focus Session',
        options.accentHex || '#5B4FE8'
      );
      return res?.success ?? true;
    } catch (e) {
      if (__DEV__) console.warn('FocusLiveActivity.startSession error:', e);
      return false;
    }
  },

  /**
   * Updates state (pause/resume or remaining seconds)
   */
  updateSession: async (isPaused: boolean, secondsLeft: number, sessionGoal?: string): Promise<boolean> => {
    if (Platform.OS !== 'ios' || !FocusLiveActivityModule?.updateLiveActivity) {
      return false;
    }
    try {
      const res = await FocusLiveActivityModule.updateLiveActivity(
        isPaused,
        secondsLeft,
        sessionGoal || 'Focus Session'
      );
      return res?.success ?? true;
    } catch (e) {
      if (__DEV__) console.warn('FocusLiveActivity.updateSession error:', e);
      return false;
    }
  },

  /**
   * Ends and dismisses the Live Activity
   */
  endSession: async (): Promise<boolean> => {
    if (Platform.OS !== 'ios' || !FocusLiveActivityModule?.endLiveActivity) {
      return false;
    }
    try {
      const res = await FocusLiveActivityModule.endLiveActivity();
      return res?.success ?? true;
    } catch (e) {
      if (__DEV__) console.warn('FocusLiveActivity.endSession error:', e);
      return false;
    }
  },

  /**
   * Updates WidgetKit Home Screen widget statistics
   */
  updateWidgetData: async (todayMinutes: number, xpPoints: number, streakDays: number = 1): Promise<boolean> => {
    if (Platform.OS !== 'ios' || !FocusLiveActivityModule?.updateWidgetData) {
      return false;
    }
    try {
      const res = await FocusLiveActivityModule.updateWidgetData(todayMinutes, xpPoints, streakDays);
      return res?.success ?? true;
    } catch (e) {
      if (__DEV__) console.warn('FocusLiveActivity.updateWidgetData error:', e);
      return false;
    }
  },
};
