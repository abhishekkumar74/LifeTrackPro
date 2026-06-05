export interface SpacedRepResult {
  nextReviewDate: string; // YYYY-MM-DD
  newEaseFactor: number;
  newIntervalDays: number;
  newRepetitions: number;
}

/**
 * Calculates next review schedules using the SM-2 algorithm.
 *
 * @param quality User study performance rating (0-5)
 * @param repetitions Number of times this item was consecutively reviewed successfully
 * @param easeFactor Previous ease factor modifier (defaults to 2.5)
 * @param intervalDays Previous interval duration (defaults to 1 day)
 */
export function calculateNextReview(
  quality: number,
  repetitions: number,
  easeFactor: number = 2.5,
  intervalDays: number = 1
): SpacedRepResult {
  let newRepetitions = repetitions;
  let newIntervalDays = intervalDays;

  if (quality < 3) {
    newRepetitions = 0;
    newIntervalDays = 1;
  } else {
    if (newRepetitions === 0) {
      newIntervalDays = 1;
    } else if (newRepetitions === 1) {
      newIntervalDays = 6;
    } else {
      newIntervalDays = Math.round(intervalDays * easeFactor);
    }
    newRepetitions++;
  }

  let newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  newEaseFactor = Math.max(1.3, newEaseFactor);

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + newIntervalDays);
  const yyyy = nextDate.getFullYear();
  const mm = String(nextDate.getMonth() + 1).padStart(2, '0');
  const dd = String(nextDate.getDate()).padStart(2, '0');
  const nextReviewDate = `${yyyy}-${mm}-${dd}`;

  return {
    nextReviewDate,
    newEaseFactor,
    newIntervalDays,
    newRepetitions,
  };
}
