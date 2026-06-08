import { calculateOnTrackStatus } from '../../lib/utils/on-track'

const makeGoal = (
  daysAgo: number,
  daysLeft: number,
  done: number,
  total: number
) => {
  const now = Date.now()
  return {
    createdAt: new Date(
      now - daysAgo * 86400000
    ).toISOString(),
    deadline: new Date(
      now + daysLeft * 86400000
    ).toISOString(),
    doneTasks: done,
    totalTasks: total,
  }
}

describe('Goal on-track calculation', () => {

  test('on_track: ahead of expected pace', () => {
    // 30 days into 90-day goal
    // Expected 33%, actual 50%
    const result = calculateOnTrackStatus(
      makeGoal(30, 60, 50, 100)
    )
    expect(result).toBe('on_track')
  })

  test('at_risk: slightly behind pace', () => {
    // 30 days in, expected 33%, actual 22%
    const result = calculateOnTrackStatus(
      makeGoal(30, 60, 22, 100)
    )
    expect(result).toBe('at_risk')
  })

  test('behind: far behind pace', () => {
    const result = calculateOnTrackStatus(
      makeGoal(60, 30, 5, 100)
    )
    expect(result).toBe('behind')
  })

  test('no tasks: returns on_track by default', () => {
    const result = calculateOnTrackStatus(
      makeGoal(10, 80, 0, 0)
    )
    // Empty goal = on_track (nothing to fail)
    expect(result).toBe('on_track')
  })

  test('past deadline: returns behind', () => {
    // Deadline was 10 days ago
    const result = calculateOnTrackStatus(
      makeGoal(90, -10, 50, 100)
    )
    expect(result).toBe('behind')
  })
})
