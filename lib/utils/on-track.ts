/**
 * Utility to calculate the on-track status of a goal.
 * Based on expected completion pace versus actual completed tasks ratio.
 */

export type OnTrackStatus = 'on_track' | 'at_risk' | 'behind';

export function calculateOnTrackStatus(
  createdAtStr: string,
  deadlineStr: string,
  doneTasks: number,
  totalTasks: number
): OnTrackStatus {
  if (totalTasks === 0) {
    return 'on_track';
  }

  const createdAt = new Date(createdAtStr).getTime();
  const deadline = new Date(deadlineStr).getTime();
  const today = new Date().getTime();

  const daysTotal = deadline - createdAt;
  const daysElapsed = today - createdAt;

  // Edge cases: deadline already passed, or invalid dates
  if (daysTotal <= 0) {
    return doneTasks === totalTasks ? 'on_track' : 'behind';
  }

  // Bound the expected completion ratio between 0 and 1
  const expectedCompletionRatio = Math.max(0, Math.min(1, daysElapsed / daysTotal));
  const actualCompletionRatio = doneTasks / totalTasks;

  const thresholdOnTrack = expectedCompletionRatio * 0.90;
  const thresholdAtRisk = expectedCompletionRatio * 0.70;

  if (actualCompletionRatio >= thresholdOnTrack) {
    return 'on_track';
  } else if (actualCompletionRatio >= thresholdAtRisk) {
    return 'at_risk';
  } else {
    return 'behind';
  }
}
