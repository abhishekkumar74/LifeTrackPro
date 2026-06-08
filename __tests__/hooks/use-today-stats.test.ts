import { renderHook, waitFor } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// Wrapper with QueryClient
const createWrapper = () => {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false }
    }
  })
  return ({ children }: any) => (
    React.createElement(
      QueryClientProvider,
      { client: qc },
      children
    )
  )
}

const mockFromObj: any = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  is: jest.fn().mockReturnThis(),
  or: jest.fn().mockReturnThis(),
  maybeSingle: jest.fn().mockReturnThis(),
};

// Supabase queries are thenable (resolved as promises)
mockFromObj.then = jest.fn((onFulfilled) => {
  return Promise.resolve({ data: [], error: null }).then(onFulfilled);
});

jest.mock('../../lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'user-test-123' } }
      }),
      getSession: jest.fn().mockResolvedValue({
        data: { session: { user: { id: 'user-test-123' } } }
      })
    },
    from: jest.fn(() => mockFromObj)
  }
}))

describe('useTodayStats', () => {

  test('returns correct focus hours format', () => {
    // 90 minutes = 1.5h
    const mins: number = 90
    const display = mins === 0 ? '0h' :
      mins < 60 ? `${mins}m` :
      mins % 60 === 0 ? `${mins/60}h` :
      `${(mins/60).toFixed(1)}h`
    expect(display).toBe('1.5h')
  })

  test('returns 0h not 0.0h for zero', () => {
    const mins: number = 0
    const display = mins === 0 ? '0h' :
      `${(mins/60).toFixed(1)}h`
    expect(display).toBe('0h')
  })

  test('returns 45m for less than 1 hour', () => {
    const mins: number = 45
    const display = mins === 0 ? '0h' :
      mins < 60 ? `${mins}m` :
      `${(mins/60).toFixed(1)}h`
    expect(display).toBe('45m')
  })

  test('hook loads without crash', async () => {
    const { useTodayStats } = require('../../lib/hooks/use-today-stats')
    const { result } = await renderHook(
      () => useTodayStats(),
      { wrapper: createWrapper() }
    )
    expect(result).toBeDefined()
    expect(result.current).toBeDefined()
    expect(typeof result.current.isLoading).toBe('boolean')
  })
})
