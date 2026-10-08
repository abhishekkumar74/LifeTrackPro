import { renderHook, act } from '@testing-library/react-native';
import { useAmbientSound } from '../../lib/hooks/use-ambient-sound';

const mockPlayer = {
  loop: false,
  volume: 1,
  play: jest.fn(),
  pause: jest.fn(),
  remove: jest.fn(),
};

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => mockPlayer),
  setAudioModeAsync: jest.fn().mockResolvedValue({}),
}));

describe('useAmbientSound', () => {
  test('plays and stops ambient sound correctly', async () => {
    const { result, unmount } = await renderHook(() => useAmbientSound());

    expect(result.current.activeSound).toBeNull();

    await act(async () => {
      await result.current.play('rain', 0.5);
    });

    expect(result.current.activeSound).toBe('rain');

    await act(async () => {
      await result.current.setVolume(0.8);
    });

    await act(async () => {
      await result.current.stop();
    });

    expect(result.current.activeSound).toBeNull();

    unmount();
  });
});
