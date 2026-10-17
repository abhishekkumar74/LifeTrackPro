import AsyncStorage from '@react-native-async-storage/async-storage';

export const FOCUS_STREAK_SHIELDS_KEY = 'focus_streak_shields_count';
export const MAX_STREAK_SHIELDS = 3;
export const STREAK_SHIELD_XP_COST = 150;

/**
 * Focus Levels & XP thresholds
 */
export interface FocusLevelInfo {
  level: number;
  title: string;
  nextXp: number | null;
  prevXp: number;
}

export const calculateFocusLevel = (xp: number): FocusLevelInfo => {
  if (xp >= 2000) return { level: 7, title: 'Grandmaster', nextXp: null, prevXp: 2000 };
  if (xp >= 1400) return { level: 6, title: 'Focus Virtuoso', nextXp: 2000, prevXp: 1400 };
  if (xp >= 900) return { level: 5, title: 'Master of Flow', nextXp: 1400, prevXp: 900 };
  if (xp >= 500) return { level: 4, title: 'Deep Worker', nextXp: 900, prevXp: 500 };
  if (xp >= 250) return { level: 3, title: 'Flow Specialist', nextXp: 500, prevXp: 250 };
  if (xp >= 100) return { level: 2, title: 'Steady Achiever', nextXp: 250, prevXp: 100 };
  return { level: 1, title: 'Focus Novice', nextXp: 100, prevXp: 0 };
};

/**
 * Fair XP Calculation Formula
 * Scales gracefully by duration so short 1-minute tests give 2-4 XP,
 * while genuine 25+ min sessions yield 100-120+ XP.
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

  // 1. Duration XP: 2 XP per focused minute
  const durationXP = duration * 2;

  // 2. Completion Milestone Bonus (Scaled by duration)
  let milestoneBonus = 0;
  if (duration >= 45) {
    milestoneBonus = 40;
  } else if (duration >= 25) {
    milestoneBonus = 25;
  } else if (duration >= 15) {
    milestoneBonus = 15;
  } else if (duration >= 5) {
    milestoneBonus = 5;
  } else {
    milestoneBonus = 0; // 0 bonus for <5 min test sessions (prevents 1-min farming)
  }

  // 3. Strict Mode Accountability Bonus
  let strictBonus = 0;
  if (isStrictMode && !hasViolation) {
    if (duration >= 45) {
      strictBonus = 35;
    } else if (duration >= 25) {
      strictBonus = 25;
    } else if (duration >= 15) {
      strictBonus = 15;
    } else if (duration >= 5) {
      strictBonus = 5;
    } else {
      strictBonus = 1; // 1 XP token for <5 min test
    }
  }

  // 4. Mindfulness & Focus Accuracy Bonus
  let reflectionBonus = 0;
  if (accuracy === 'fully_focused') {
    if (duration >= 25) reflectionBonus = 15;
    else if (duration >= 15) reflectionBonus = 8;
    else if (duration >= 5) reflectionBonus = 3;
    else reflectionBonus = 1;
  } else if (accuracy === 'partially_distracted') {
    if (duration >= 15) reflectionBonus = 3;
    else reflectionBonus = 1;
  }

  return durationXP + milestoneBonus + strictBonus + reflectionBonus;
};

/**
 * Ambient Soundscape XP Unlock Levels
 */
export const SOUND_REWARD_LEVELS = [
  { key: 'rain', label: 'Rain Drops', requiredLevel: 1, requiredXp: 0, isFree: true },
  { key: 'ocean', label: 'Ocean Waves', requiredLevel: 2, requiredXp: 100, isFree: false },
  { key: 'cafe', label: 'Café Ambience', requiredLevel: 3, requiredXp: 250, isFree: false },
  { key: 'lofi', label: 'Lo-Fi Chill', requiredLevel: 4, requiredXp: 500, isFree: false },
  { key: 'brown_noise', label: 'Deep Noise', requiredLevel: 5, requiredXp: 900, isFree: false },
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
