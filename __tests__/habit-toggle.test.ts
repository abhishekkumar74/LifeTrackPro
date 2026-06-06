import { toggleHabit } from '../lib/hooks/use-toggle-habit';

// Mock Supabase and Haptics
jest.mock('../lib/supabase/client', () => {
  const mockUpsert = jest.fn().mockResolvedValue({ error: null });
  const mockFrom = jest.fn(() => ({
    upsert: mockUpsert,
  }));
  return {
    supabase: {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
        }),
      },
      from: mockFrom,
    },
  };
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: {
    Light: 0,
    Medium: 1,
    Heavy: 2,
  },
}));

describe('Habit Toggle', () => {
  test('Toggle calls upsert with correct params', async () => {
    const { supabase } = require('../lib/supabase/client');
    const mockUpsert = jest.fn().mockResolvedValue({ error: null });
    supabase.from.mockImplementation(() => ({
      upsert: mockUpsert,
    }));

    await toggleHabit('habit-1', false, jest.fn());

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        habit_id: 'habit-1',
        done: true, // flipped from false
        user_id: 'user-123',
      }),
      { onConflict: 'habit_id,date' }
    );
  });

  test('Optimistic update fires before DB call', async () => {
    const onOptimisticUpdate = jest.fn();
    const { supabase } = require('../lib/supabase/client');

    const mockUpsert = jest.fn().mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ error: null }), 100)
        )
    );
    supabase.from.mockImplementation(() => ({
      upsert: mockUpsert,
    }));

    const togglePromise = toggleHabit('habit-1', false, onOptimisticUpdate);

    // Optimistic update fires immediately
    expect(onOptimisticUpdate).toHaveBeenCalledWith(true);

    await togglePromise;
  });

  test('Rolls back on DB error', async () => {
    const onOptimisticUpdate = jest.fn();
    const { supabase } = require('../lib/supabase/client');

    const mockUpsert = jest.fn().mockResolvedValue({
      error: { message: 'DB error' },
    });
    supabase.from.mockImplementation(() => ({
      upsert: mockUpsert,
    }));

    await toggleHabit('habit-1', false, onOptimisticUpdate);

    // First call: optimistic (true)
    expect(onOptimisticUpdate).toHaveBeenNthCalledWith(1, true);
    // Second call: rollback (false)
    expect(onOptimisticUpdate).toHaveBeenNthCalledWith(2, false);
  });
});
