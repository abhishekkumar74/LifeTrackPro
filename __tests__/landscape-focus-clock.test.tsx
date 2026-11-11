import React, { useState } from 'react';
import { Text } from 'react-native';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

jest.mock('../components/focus/TimerCircle', () => ({
  TimerCircle: () => null,
}));

import { LandscapeFocusClock } from '../components/focus/LandscapeFocusClock';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 844, height: 390 },
  insets: { top: 0, left: 47, right: 47, bottom: 21 },
};

describe('LandscapeFocusClock Hook & Render Stability', () => {
  it('does not throw Rendered more hooks error across isVisible transitions', async () => {
    const defaultProps = {
      secondsLeft: 1500,
      totalSeconds: 1500,
      isRunning: false,
      isPaused: false,
      sessionGoal: 'Study Session',
      subjectTag: 'Physics',
      todayMinutes: 45,
      activeThemeColor: '#5B4FE8',
      activeSound: null,
      currentMode: 'focus' as const,
      onPlayPause: jest.fn(),
      onStop: jest.fn(),
      onToggleSound: jest.fn(),
      onClose: jest.fn(),
    };

    const TestHarness: React.FC = () => {
      const [isVisible, setIsVisible] = useState(false);
      return (
        <SafeAreaProvider initialMetrics={initialMetrics}>
          <LandscapeFocusClock {...defaultProps} isVisible={isVisible} />
          <Text onPress={() => setIsVisible((prev) => !prev)}>
            Toggle Visibility
          </Text>
        </SafeAreaProvider>
      );
    };

    await render(<TestHarness />);

    // Toggle 1: false -> true (this crashed with "Rendered more hooks" prior to fix)
    await act(async () => {
      fireEvent.press(screen.getByText('Toggle Visibility'));
    });

    // Toggle 2: true -> false
    await act(async () => {
      fireEvent.press(screen.getByText('Toggle Visibility'));
    });

    // Toggle 3: false -> true again
    await act(async () => {
      fireEvent.press(screen.getByText('Toggle Visibility'));
    });
  });
});
