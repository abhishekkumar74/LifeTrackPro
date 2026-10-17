import AsyncStorage from '@react-native-async-storage/async-storage';

export const FOCUS_STREAK_SHIELDS_KEY = 'focus_streak_shields_count';
export const MAX_STREAK_SHIELDS = 3;
export const STREAK_SHIELD_XP_COST = 350; // Tuned for healthy ~3-day study discipline

/**
 * Focus Levels & XP thresholds (Calibrated for multi-month retention)
 */
export interface FocusLevelInfo {
  level: number;
  title: string;
  nextXp: number | null;
  prevXp: number;
}

export const calculateFocusLevel = (xp: number): FocusLevelInfo => {
  if (xp >= 12000) return { level: 7, title: 'Grandmaster', nextXp: null, prevXp: 12000 };
  if (xp >= 6000) return { level: 6, title: 'Focus Virtuoso', nextXp: 12000, prevXp: 6000 };
  if (xp >= 3000) return { level: 5, title: 'Master of Flow', nextXp: 6000, prevXp: 3000 };
  if (xp >= 1500) return { level: 4, title: 'Deep Worker', nextXp: 3000, prevXp: 1500 };
  if (xp >= 750) return { level: 3, title: 'Flow Specialist', nextXp: 1500, prevXp: 750 };
  if (xp >= 300) return { level: 2, title: 'Steady Achiever', nextXp: 750, prevXp: 300 };
  return { level: 1, title: 'Focus Novice', nextXp: 300, prevXp: 0 };
};

/**
 * Disciplined XP Calculation Formula
 * Prevents rapid inflation while rewarding honest study:
 * - 1 min test: 1 XP
 * - 15 min session: ~10-12 XP
 * - 25 min standard session: ~20-22 XP
 * - 45 min deep work: ~36-38 XP
 * - 60 min master session: ~48-50 XP
 */
export interface CalculateXpParams {
  durationMinutes: number;
  isStrictMode?: boolean;
  hasViolation?: boolean;
  accuracy?: 'fully_focused' | 'partially_distracted' | 'off_track' | null;
}

export const calculateSessionXP = ({
  durationMinutes,
  isStrictMode = false,
  hasViolation = false,
  accuracy = 'fully_focused',
}: CalculateXpParams): number => {
  const duration = Math.max(1, Math.floor(durationMinutes));

  // 1. Duration XP: 0.5 XP per focused minute (~12 XP for 25m, ~22 XP for 45m)
  const durationXP = Math.max(1, Math.floor(duration * 0.5));

  // 2. Completion Milestone Bonus (Scaled by duration)
  let milestoneBonus = 0;
  if (duration >= 45) {
    milestoneBonus = 8;
  } else if (duration >= 25) {
    milestoneBonus = 4;
  } else if (duration >= 10) {
    milestoneBonus = 2;
  } else {
    milestoneBonus = 0; // 0 for quick test sessions (<10m)
  }

  // 3. Strict Mode Accountability Bonus
  let strictBonus = 0;
  if (isStrictMode && !hasViolation) {
    if (duration >= 45) {
      strictBonus = 5;
    } else if (duration >= 25) {
      strictBonus = 3;
    } else if (duration >= 10) {
      strictBonus = 2;
    } else {
      strictBonus = 0;
    }
  }

  // 4. Mindfulness & Focus Accuracy Bonus
  let reflectionBonus = 0;
  if (accuracy === 'fully_focused') {
    if (duration >= 25) reflectionBonus = 2;
    else if (duration >= 10) reflectionBonus = 1;
    else reflectionBonus = 0;
  } else if (accuracy === 'partially_distracted') {
    if (duration >= 25) reflectionBonus = 1;
  }

  return durationXP + milestoneBonus + strictBonus + reflectionBonus;
};

/**
 * Ambient Soundscape XP Unlock Levels
 */
export const SOUND_REWARD_LEVELS = [
  { key: 'rain', label: 'Rain Drops', requiredLevel: 1, requiredXp: 0, isFree: true },
  { key: 'ocean', label: 'Ocean Waves', requiredLevel: 2, requiredXp: 300, isFree: false },
  { key: 'cafe', label: 'Café Ambience', requiredLevel: 3, requiredXp: 750, isFree: false },
  { key: 'lofi', label: 'Lo-Fi Chill', requiredLevel: 4, requiredXp: 1500, isFree: false },
  { key: 'brown_noise', label: 'Deep Noise', requiredLevel: 5, requiredXp: 3000, isFree: false },
] as const;

export const isSoundUnlocked = (
  soundKey: string | null,
  isPremium: boolean,
  userLevel: number = 1,
  userXp: number = 0
): boolean => {
  if (!soundKey || soundKey === 'rain') return true;
  if (isPremium) return true;
  const config = SOUND_REWARD_LEVELS.find((s) => s.key === soundKey);
  if (!config) return true;
  return userLevel >= config.requiredLevel || userXp >= config.requiredXp;
};

/**
 * Streak Shields Storage Helper
 */
export const getStreakShieldCount = async (): Promise<number> => {
  try {
    const val = await AsyncStorage.getItem(FOCUS_STREAK_SHIELDS_KEY);
    return val !== null ? Math.min(MAX_STREAK_SHIELDS, Math.max(0, parseInt(val, 10) || 0)) : 1; // 1 free starter shield
  } catch {
    return 1;
  }
};

export const setStreakShieldCount = async (count: number): Promise<void> => {
  try {
    const safeCount = Math.min(MAX_STREAK_SHIELDS, Math.max(0, count));
    await AsyncStorage.setItem(FOCUS_STREAK_SHIELDS_KEY, safeCount.toString());
  } catch {}
};
