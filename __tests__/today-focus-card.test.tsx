import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('react-native-reanimated', () => {
  const View = require('react-native').View;
  return {
    __esModule: true,
    default: {
      View,
    },
    useSharedValue: jest.fn(() => ({ value: 0 })),
    useAnimatedStyle: jest.fn(() => ({})),
    withRepeat: jest.fn(),
    withSequence: jest.fn(),
    withTiming: jest.fn(),
  };
});

import { TodayFocusCard } from '../components/home/TodayFocusCard';

describe('TodayFocusCard - Long Subject Layout Stability', () => {
  test('renders with very long subject without throwing errors', async () => {
    const longSubject = 'B.Tech Computer Science and Engineering - Advanced Distributed Systems & Cloud Infrastructure';
    const activeBlock = {
      id: 'block-1',
      user_id: 'user-1',
      title: 'Full Stack Microservices Architecture Sprint',
      subject: longSubject,
      start_time: '10:00',
      end_time: '12:00',
      day_of_week: 1,
      days: [1],
      specific_date: null,
      is_active: true,
      color: '#6366F1',
      icon: 'code',
      is_completed: false,
      created_at: new Date().toISOString(),
    };

    const { getByText } = await render(
      <TodayFocusCard
        task={null}
        activeBlock={activeBlock}
        isLoading={false}
        onStartFocus={() => {}}
      />
    );

    expect(getByText('Start')).toBeTruthy();
    expect(getByText(longSubject)).toBeTruthy();
  });
});
