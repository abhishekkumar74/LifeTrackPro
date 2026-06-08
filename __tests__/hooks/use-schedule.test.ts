import { renderHook, act } from '@testing-library/react-native';
import { useCreateScheduleBlock } from '../../lib/hooks/use-schedule';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const createWrapper = () => {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  return ({ children }: any) => (
    React.createElement(
      QueryClientProvider,
      { client: qc },
      children
    )
  );
};

jest.mock('../../lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } }
      })
    },
    from: jest.fn(() => ({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'block-1', title: 'Math class' },
        error: null
      })
    }))
  }
}));

describe('useCreateScheduleBlock', () => {
  test('creates schedule block successfully', async () => {
    const { result } = await renderHook(
      () => useCreateScheduleBlock(),
      { wrapper: createWrapper() }
    );

    let mutatePromise;
    act(() => {
      mutatePromise = result.current.mutateAsync({
        title: 'Math class',
        subject: 'Math',
        color: '#FF0000',
        start_time: '09:00',
        end_time: '10:00',
        days: [1, 2],
        specific_date: null,
        is_active: true
      });
    });

    const data = await mutatePromise;
    expect(data).toEqual({ id: 'block-1', title: 'Math class' });
  });
});
