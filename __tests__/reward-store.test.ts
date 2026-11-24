import { useRewardStore, MAX_HABIT_GRACE_TOKENS, THEME_PASS_DURATION_MS, JOURNAL_EXPORT_PASS_DURATION_MS } from '../lib/store/reward.store';

describe('Reward Store - Monetization Placements', () => {
  beforeEach(() => {
    // Reset state before each test
    useRewardStore.setState({
      unlockedThemesUntil: {},
      habitGraceTokensCount: 1,
      habitGraceUsedDates: {},
      unlockedJournalExportUntil: 0,
    });
  });

  describe('Placement 1.1: 24-Hour Aesthetic Timer Theme Pass', () => {
    test('default theme is always unlocked for free and premium users', () => {
      const store = useRewardStore.getState();
      expect(store.isThemeUnlocked('default', false)).toBe(true);
      expect(store.isThemeUnlocked('default', true)).toBe(true);
    });

    test('premium themes are locked for free users without a pass', () => {
      const store = useRewardStore.getState();
      expect(store.isThemeUnlocked('gold', false)).toBe(false);
      expect(store.isThemeUnlocked('obsidian', false)).toBe(false);
    });

    test('premium themes are unlocked for gold/premium users', () => {
      const store = useRewardStore.getState();
      expect(store.isThemeUnlocked('gold', true)).toBe(true);
      expect(store.isThemeUnlocked('obsidian', true)).toBe(true);
    });

    test('granting a 24-hour theme pass unlocks the theme for free users', () => {
      const store = useRewardStore.getState();
      store.grantThemePass('gold');

      const updated = useRewardStore.getState();
      expect(updated.isThemeUnlocked('gold', false)).toBe(true);
      // Other ungranted themes remain locked
      expect(updated.isThemeUnlocked('obsidian', false)).toBe(false);

      const remainingHours = updated.getThemeRemainingHours('gold');
      expect(remainingHours).toBeGreaterThanOrEqual(23);
      expect(remainingHours).toBeLessThanOrEqual(24);
    });

    test('expired theme pass returns locked status and null remaining hours', () => {
      // Simulate expired pass
      useRewardStore.setState({
        unlockedThemesUntil: {
          gold: Date.now() - 1000,
        },
      });

      const store = useRewardStore.getState();
      expect(store.isThemeUnlocked('gold', false)).toBe(false);
      expect(store.getThemeRemainingHours('gold')).toBeNull();
    });
  });

  describe('Placement 1.2: Habit Grace Tokens', () => {
    test('starts with 1 complimentary grace token', () => {
      const store = useRewardStore.getState();
      expect(store.habitGraceTokensCount).toBe(1);
    });

    test('can claim grace tokens up to MAX_HABIT_GRACE_TOKENS (3)', () => {
      const store = useRewardStore.getState();
      // Has 1 token initially
      expect(store.claimHabitGraceToken()).toBe(true); // Now 2
      expect(store.claimHabitGraceToken()).toBe(true); // Now 3 (Max)
      expect(store.claimHabitGraceToken()).toBe(false); // Cap reached
      expect(useRewardStore.getState().habitGraceTokensCount).toBe(MAX_HABIT_GRACE_TOKENS);
    });

    test('consuming a grace token repairs missed date and decrements balance', () => {
      const store = useRewardStore.getState();
      const habitId = 'habit-exercise-101';
      const missedDate = '2026-11-23';

      expect(store.isHabitDateGraceRepaired(habitId, missedDate)).toBe(false);

      const success = store.consumeHabitGraceToken(habitId, missedDate);
      expect(success).toBe(true);

      const updated = useRewardStore.getState();
      expect(updated.habitGraceTokensCount).toBe(0);
      expect(updated.isHabitDateGraceRepaired(habitId, missedDate)).toBe(true);

      // Cannot consume again when balance is 0
      const failedConsume = updated.consumeHabitGraceToken(habitId, '2026-11-22');
      expect(failedConsume).toBe(false);
    });

    test('cannot double-consume for the exact same habit and date', () => {
      const store = useRewardStore.getState();
      store.claimHabitGraceToken(); // Now 2 tokens

      const habitId = 'habit-reading-202';
      const missedDate = '2026-11-23';

      expect(store.consumeHabitGraceToken(habitId, missedDate)).toBe(true);
      // Attempting to consume again for same date should fail
      expect(store.consumeHabitGraceToken(habitId, missedDate)).toBe(false);
      expect(useRewardStore.getState().habitGraceTokensCount).toBe(1);
    });
  });

  describe('Placement 3.2: Export Life Journal to Formatted PDF', () => {
    test('locked for free users by default', () => {
      const store = useRewardStore.getState();
      expect(store.isJournalExportUnlocked(false)).toBe(false);
    });

    test('unlocked for premium users by default', () => {
      const store = useRewardStore.getState();
      expect(store.isJournalExportUnlocked(true)).toBe(true);
    });

    test('granting journal export pass unlocks export for 24 hours', () => {
      const store = useRewardStore.getState();
      store.grantJournalExportPass();

      const updated = useRewardStore.getState();
      expect(updated.isJournalExportUnlocked(false)).toBe(true);
      expect(updated.unlockedJournalExportUntil).toBeGreaterThan(Date.now());
    });

    test('expired journal export pass locks export for free users', () => {
      useRewardStore.setState({
        unlockedJournalExportUntil: Date.now() - 5000,
      });

      const store = useRewardStore.getState();
      expect(store.isJournalExportUnlocked(false)).toBe(false);
      // Still unlocked for premium users
      expect(store.isJournalExportUnlocked(true)).toBe(true);
    });
  });
});
