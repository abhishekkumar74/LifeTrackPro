import { calculateOnTrackStatus } from '../lib/utils/on-track';

describe('On-Track Calculator', () => {
  const today = new Date();
  const createdAt = new Date(
    today.getTime() - 30 * 24 * 60 * 60 * 1000
  ).toISOString(); // 30 days ago
  const deadline = new Date(
    today.getTime() + 60 * 24 * 60 * 60 * 1000
  ).toISOString(); // 60 days from now

  test('Returns on_track when ahead of pace', () => {
    // 30 days into 90-day goal, done 40%
    // Expected: ~33%, Actual: 40% → on track
    const result = calculateOnTrackStatus({
      createdAt,
      deadline,
      totalTasks: 100,
      doneTasks: 40,
    });
    expect(result).toBe('on_track');
  });

  test('Returns at_risk when slightly behind', () => {
    // 30 days in, only done 20%
    // Expected: ~33%, Actual: 20% → at risk
    const result = calculateOnTrackStatus({
      createdAt,
      deadline,
      totalTasks: 100,
      doneTasks: 20,
    });
    expect(result).toBe('at_risk');
  });

  test('Returns behind when far behind pace', () => {
    const result = calculateOnTrackStatus({
      createdAt,
      deadline,
      totalTasks: 100,
      doneTasks: 5,
    });
    expect(result).toBe('behind');
  });

  test('Handles zero tasks gracefully', () => {
    const result = calculateOnTrackStatus({
      createdAt,
      deadline,
      totalTasks: 0,
      doneTasks: 0,
    });
    expect(['on_track', 'at_risk', 'behind']).toContain(result);
    // Should not throw
  });
});
