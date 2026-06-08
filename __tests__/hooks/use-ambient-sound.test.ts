import { renderHook, act } from '@testing-library/react-native';
import { useAmbientSound } from '../../lib/hooks/use-ambient-sound';
import { Audio } from 'expo-av';

jest.mock('expo-av', () => ({
  Audio: {
    Sound: {
      createAsync: jest.fn().mockResolvedValue({
        sound: {
          stopAsync: jest.fn().mockResolvedValue({}),
          unloadAsync: jest.fn().mockResolvedValue({}),
          setVolumeAsync: jest.fn().mockResolvedValue({}),
        }
      })
    },
    setAudioModeAsync: jest.fn().mockResolvedValue({}),
  }
}));

describe('useAmbientSound', () => {
  test('plays and stops ambient sound correctly', async () => {
    const { result, unmount } = await renderHook(() => useAmbientSound());

    expect(result.current.activeSound).toBeNull();

    await act(async () => {
      await result.current.play('rain', 0.5);
    });

    expect(result.current.activeSound).toBe('rain');
    expect(Audio.Sound.createAsync).toHaveBeenCalled();

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
