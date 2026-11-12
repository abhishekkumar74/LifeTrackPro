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

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

import { QuickStats } from '../components/home/QuickStats';

describe('QuickStats - Sparkline and Text Layout Stability', () => {
  test('renders tiles and sparklines without overlapping or errors', async () => {
    const { getByText } = await render(
      <QuickStats
        focusMinutes={45}
        tasksTotal={10}
        tasksDone={7}
        streakDays={14}
        isStreakBroken={false}
        isLoading={false}
        sparklines={{
          focus: [10, 20, 30, 40, 25, 35, 45],
          tasks: [2, 4, 6, 8, 5, 7, 7],
          streak: [8, 9, 10, 11, 12, 13, 14],
        }}
      />
    );

    expect(getByText('Focus time')).toBeTruthy();
    expect(getByText('Tasks done')).toBeTruthy();
    expect(getByText('Day streak')).toBeTruthy();
  });

  test('renders broken streak correctly', async () => {
    const { getByText } = await render(
      <QuickStats
        focusMinutes={0}
        tasksTotal={5}
        tasksDone={0}
        streakDays={0}
        isStreakBroken={true}
        isLoading={false}
      />
    );

    expect(getByText('Broken')).toBeTruthy();
  });

  test('renders loading skeleton without crashing', async () => {
    const { toJSON } = await render(
      <QuickStats
        focusMinutes={0}
        tasksTotal={0}
        tasksDone={0}
        streakDays={0}
        isLoading={true}
      />
    );

    expect(toJSON()).toBeTruthy();
  });
});
