import Constants from 'expo-constants';

/**
 * App-wide configuration parameters and feature toggle controls.
 * Integrates directly with Expo Constants for secure environment variable parsing.
 */

export const CONFIG = {
  app: {
    name: 'LifeTrack Pro',
    version: '1.0.0',
    buildNumber: '1',
    bundleId: 'com.lifetrackpro.app',
    environment: (__DEV__ ? 'development' : 'production') as 'development' | 'production',
  },

  // Toggle features dynamically for A/B testing or gradual releases
  featureFlags: {
    enableAppBlocker: true,
    enableGroupStudyRooms: true,
    enableAiCoach: true,
    enableNotesSpacedRepetition: true,
    enableLofiAmbientPlayer: true,
  },

  // Supabase keys - parsed securely via Expo environment variables
  supabase: {
    url: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  },

  // Default fallbacks for application layouts
  defaults: {
    pomodoroTime: 25, // minutes
    shortBreakTime: 5, // minutes
    longBreakTime: 15, // minutes
    weeklyTargetHours: 40,
  },
} as const;

// Self-check during development to ensure environment keys are loaded properly
if (__DEV__) {
  if (!CONFIG.supabase.url || !CONFIG.supabase.anonKey) {
    console.warn(
      'WARNING: Supabase URL or Anon Key is empty. Ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are specified in your .env file.'
    );
  }
}

export type AppConfig = typeof CONFIG;
export default CONFIG;
