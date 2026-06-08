import { renderHook } from '@testing-library/react-native';
import { useAndroidBackHandler } from '../../lib/hooks/use-android-back';
import { BackHandler } from 'react-native';
import { router } from 'expo-router';

jest.mock('expo-router', () => ({
  router: {
    canGoBack: jest.fn().mockReturnValue(true),
    back: jest.fn(),
  },
}));

describe('useAndroidBackHandler', () => {
  test('adds hardwareBackPress listener and handles back press', async () => {
    const addListenerSpy = jest.spyOn(BackHandler, 'addEventListener');
    const { unmount } = await renderHook(() => useAndroidBackHandler());

    expect(addListenerSpy).toHaveBeenCalledWith('hardwareBackPress', expect.any(Function));

    const onBackPress = addListenerSpy.mock.calls[0][1];
    const handled = onBackPress();

    expect(router.canGoBack).toHaveBeenCalled();
    expect(router.back).toHaveBeenCalled();
    expect(handled).toBe(true);

    unmount();
  });

  test('calls custom onBackPressHandler when provided', async () => {
    const addListenerSpy = jest.spyOn(BackHandler, 'addEventListener');
    const customHandler = jest.fn().mockReturnValue(true);
    const { unmount } = await renderHook(() => useAndroidBackHandler(customHandler));

    // Get the most recent listener added
    const callCount = addListenerSpy.mock.calls.length;
    const onBackPress = addListenerSpy.mock.calls[callCount - 1][1];
    const handled = onBackPress();

    expect(customHandler).toHaveBeenCalled();
    expect(handled).toBe(true);

    unmount();
  });
});
