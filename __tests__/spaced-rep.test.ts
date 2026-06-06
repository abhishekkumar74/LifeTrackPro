import { calculateNextReview } from '../lib/utils/spaced-rep';

describe('SM-2 Spaced Repetition', () => {
  test('Failed recall resets to 1 day', () => {
    const result = calculateNextReview(2, 5, 2.5, 21); // quality 2 = failed
    expect(result.newIntervalDays).toBe(1);
    expect(result.newRepetitions).toBe(0);
  });

  test('First success = 1 day interval', () => {
    const result = calculateNextReview(4, 0, 2.5, 1);
    expect(result.newIntervalDays).toBe(1);
  });

  test('Second success = 6 day interval', () => {
    const result = calculateNextReview(4, 1, 2.5, 1);
    expect(result.newIntervalDays).toBe(6);
  });

  test('Ease factor never goes below 1.3', () => {
    // Repeatedly fail
    let ef = 2.5;
    let reps = 0;
    let interval = 1;

    for (let i = 0; i < 20; i++) {
      const r = calculateNextReview(0, reps, ef, interval);
      ef = r.newEaseFactor;
      reps = r.newRepetitions;
      interval = r.newIntervalDays;
    }

    expect(ef).toBeGreaterThanOrEqual(1.3);
  });

  test('Returns valid ISO date string', () => {
    const result = calculateNextReview(5, 3, 2.5, 10);
    expect(new Date(result.nextReviewDate)).toBeInstanceOf(Date);
    expect(isNaN(new Date(result.nextReviewDate).getTime())).toBe(false);
  });
});
