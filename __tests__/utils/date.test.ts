import {
  getTodayLocal,
  daysFromNow,
  formatDeadline,
  deadlineFromTimeline,
} from '../../lib/utils/date'

describe('Date utilities', () => {

  test('getTodayLocal returns YYYY-MM-DD', () => {
    const today = getTodayLocal()
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  test('getTodayLocal uses local not UTC', () => {
    const today = getTodayLocal()
    const localDate = new Date()
      .toLocaleDateString('en-CA')
    expect(today).toBe(localDate)
  })

  test('daysFromNow returns positive for future', () => {
    const future = new Date(
      Date.now() + 10 * 86400000
    ).toISOString()
    expect(daysFromNow(future)).toBeGreaterThan(0)
  })

  test('daysFromNow returns 0 for past', () => {
    const past = new Date(
      Date.now() - 5 * 86400000
    ).toISOString()
    expect(daysFromNow(past)).toBe(0)
  })

  test('deadlineFromTimeline adds correct days', () => {
    const result = deadlineFromTimeline('1 Year')
    const diff = new Date(result).getTime() -
      Date.now()
    const days = Math.round(diff / 86400000)
    expect(days).toBeGreaterThanOrEqual(364)
    expect(days).toBeLessThanOrEqual(366)
  })

  test('formatDeadline returns readable string', () => {
    const date = '2026-12-31'
    const formatted = formatDeadline(date)
    expect(formatted).toContain('2026')
    expect(typeof formatted).toBe('string')
    expect(formatted.length).toBeGreaterThan(5)
  })
})
