/**
 * Utility to calculate the on-track status of a goal.
 * Based on expected completion pace versus actual completed tasks ratio.
 */

export type OnTrackStatus = 'on_track' | 'at_risk' | 'behind';

export function calculateOnTrackStatus(
  createdAtStrOrObj: string | { createdAt: string; deadline: string; doneTasks: number; totalTasks: number },
  deadlineStr?: string,
  doneTasks?: number,
  totalTasks?: number
): OnTrackStatus {
  let cStr: string;
  let dStr: string;
  let done: number;
  let total: number;

  if (typeof createdAtStrOrObj === 'object') {
    cStr = createdAtStrOrObj.createdAt;
    dStr = createdAtStrOrObj.deadline;
    done = createdAtStrOrObj.doneTasks;
    total = createdAtStrOrObj.totalTasks;
  } else {
    cStr = createdAtStrOrObj;
    dStr = deadlineStr!;
    done = doneTasks!;
    total = totalTasks!;
  }

  if (total === 0) {
    return 'on_track';
  }

  const createdAt = new Date(cStr).getTime();
  const deadline = new Date(dStr).getTime();
  const today = new Date().getTime();

  const daysTotal = deadline - createdAt;
  const daysElapsed = today - createdAt;

  // Edge cases: deadline already passed, or invalid dates
  if (daysTotal <= 0) {
    return done === total ? 'on_track' : 'behind';
  }

  // Bound the expected completion ratio between 0 and 1, rounded to 4 decimal places to avoid millisecond differences
  const rawRatio = Math.max(0, Math.min(1, daysElapsed / daysTotal));
  const expectedCompletionRatio = Math.round(rawRatio * 10000) / 10000;
  const actualCompletionRatio = done / total;

  const thresholdOnTrack = expectedCompletionRatio * 0.90;
  const thresholdAtRisk = expectedCompletionRatio * 0.60;

  const EPSILON = 1e-9;

  if (actualCompletionRatio >= thresholdOnTrack - EPSILON) {
    return 'on_track';
  } else if (actualCompletionRatio >= thresholdAtRisk - EPSILON) {
    return 'at_risk';
  } else {
    return 'behind';
  }
}
