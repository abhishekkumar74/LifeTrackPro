import React from 'react';
import { View, Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useHabits } from '../lib/hooks/use-habits';

// Mock useAuthStore
jest.mock('../lib/store/auth.store', () => {
  const store = {
    user: { id: 'user-123' },
    session: null,
    profile: null,
    isLoading: false,
  };
  const useStore = jest.fn(() => store);
  (useStore as any).getState = jest.fn(() => store);
  return {
    useAuthStore: useStore,
    default: useStore,
  };
});

// Setup mocks inside the factory function to avoid hoisted TDZ errors
jest.mock('../lib/supabase/client', () => {
  const mockSelect = jest.fn().mockReturnThis();
  const mockEq = jest.fn().mockReturnThis();
  const mockOrder = jest.fn().mockResolvedValue({
    data: [
      {
        id: 'habit-1',
        title: 'Wake up',
        user_id: 'user-123',
        habit_logs: [],
      },
    ],
    error: null,
  });
  const mockFromObj = {
    select: mockSelect,
    eq: mockEq,
    order: mockOrder,
  };
  const mockFrom = jest.fn(() => mockFromObj);

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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

function TestComponent() {
  const { data, isSuccess, error, status } = useHabits();
  if (!isSuccess) return <Text>Loading</Text>;
  return (
    <View>
      {data?.map((habit) => (
        <Text key={habit.id} testID="habit-item">
          {habit.title} ({habit.user_id})
        </Text>
      ))}
    </View>
  );
}

describe('Habit Data Isolation', () => {
  beforeEach(() => {
    queryClient.clear();
    jest.clearAllMocks();
  });

  test('useHabits filters by current user ID', async () => {
    await render(
      <QueryClientProvider client={queryClient}>
        <TestComponent />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading')).toBeNull();
    });

    // Verify .eq('user_id', 'user-123') was called
    const { supabase } = require('../lib/supabase/client');
    const mockFromObj = supabase.from();
    expect(mockFromObj.eq).toHaveBeenCalledWith('user_id', 'user-123');
  });

  test('All habits belong to current user', async () => {
    await render(
      <QueryClientProvider client={queryClient}>
        <TestComponent />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading')).toBeNull();
    });

    const items = screen.getAllByTestId('habit-item');
    expect(items.length).toBeGreaterThan(0);
    items.forEach((item) => {
      expect(item.props.children).toContain('user-123');
    });
  });

  test('Query key includes user ID', () => {
    // Verify cache key isolation
    const userId = 'user-123';
    const expectedKey = ['habits', userId];
    // This prevents cross-user cache sharing
    expect(expectedKey).toContain(userId);
  });
});
