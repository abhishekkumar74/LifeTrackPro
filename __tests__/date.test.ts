import { daysFromNow, deadlineFromTimeline, formatDeadline, getTodayLocal } from '../lib/utils/date';

describe('Date Utilities', () => {
  test('daysFromNow returns correct number of days', () => {
    expect(daysFromNow('')).toBe(0);

    const todayStr = new Date().toISOString().split('T')[0];
    expect(daysFromNow(todayStr)).toBe(0);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    expect(daysFromNow(tomorrowStr)).toBe(1);

    const past = new Date();
    past.setDate(past.getDate() - 5);
    const pastStr = past.toISOString().split('T')[0];
    expect(daysFromNow(pastStr)).toBe(0);
  });

  test('deadlineFromTimeline returns correct ISO date string', () => {
    const today = new Date();
    
    // Test default fallback (90 days)
    const expectedDefault = new Date(today);
    expectedDefault.setDate(today.getDate() + 90);
    expect(deadlineFromTimeline('')).toBe(expectedDefault.toISOString().split('T')[0]);

    // Test 3m / 3 month
    const expected3m = new Date(today);
    expected3m.setDate(today.getDate() + 90);
    expect(deadlineFromTimeline('3m')).toBe(expected3m.toISOString().split('T')[0]);
    expect(deadlineFromTimeline('3 months')).toBe(expected3m.toISOString().split('T')[0]);

    // Test 6m / 6 month
    const expected6m = new Date(today);
    expected6m.setDate(today.getDate() + 180);
    expect(deadlineFromTimeline('6m')).toBe(expected6m.toISOString().split('T')[0]);
    expect(deadlineFromTimeline('6 months')).toBe(expected6m.toISOString().split('T')[0]);

    // Test 1y / 1 year
    const expected1y = new Date(today);
    expected1y.setDate(today.getDate() + 365);
    expect(deadlineFromTimeline('1y')).toBe(expected1y.toISOString().split('T')[0]);
    expect(deadlineFromTimeline('1 year')).toBe(expected1y.toISOString().split('T')[0]);

    // Test 2y / 2 year
    const expected2y = new Date(today);
    expected2y.setDate(today.getDate() + 730);
    expect(deadlineFromTimeline('2y')).toBe(expected2y.toISOString().split('T')[0]);
    expect(deadlineFromTimeline('2 years')).toBe(expected2y.toISOString().split('T')[0]);

    // Test 5y / 5 year
    const expected5y = new Date(today);
    expected5y.setDate(today.getDate() + 1825);
    expect(deadlineFromTimeline('5y')).toBe(expected5y.toISOString().split('T')[0]);
    expect(deadlineFromTimeline('5 years')).toBe(expected5y.toISOString().split('T')[0]);
  });

  test('formatDeadline formats the date correctly', () => {
    expect(formatDeadline('')).toBe('');
    expect(formatDeadline('2026-06-06')).toContain('2026');
    expect(formatDeadline('2026-06-06')).toContain('Jun');
  });

  test('getTodayLocal returns a valid local date format', () => {
    const todayStr = getTodayLocal();
    expect(todayStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
