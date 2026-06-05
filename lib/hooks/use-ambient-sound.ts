import { useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import { SoundKey } from '@/lib/store/focus.store';

const SOUND_FILES = {
  rain: require('../../assets/sounds/rain.mp3'),
  cafe: require('../../assets/sounds/cafe.mp3'),
  ocean: require('../../assets/sounds/ocean.mp3'),
  lofi: require('../../assets/sounds/lofi.mp3'),
  brown_noise: require('../../assets/sounds/brown_noise.mp3'),
} as const;

export interface AmbientSoundHook {
  activeSound: SoundKey | null;
  isLoading: boolean;
  play: (key: SoundKey, volume: number) => Promise<void>;
  stop: () => Promise<void>;
  setVolume: (vol: number) => Promise<void>;
}

export function useAmbientSound(): AmbientSoundHook {
  const [activeSound, setActiveSound] = useState<SoundKey | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  const play = async (key: SoundKey, volume: number) => {
    setIsLoading(true);
    try {
      // 1. Unload any existing sound
      if (soundRef.current) {
        try {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
        } catch (e) {
          // Ignore issues with unloading current track
        }
        soundRef.current = null;
      }

      // 2. Configure audio session to run in the background
      await Audio.setAudioModeAsync({
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // 3. Load and play the new sound asset
      const source = SOUND_FILES[key];
      const { sound } = await Audio.Sound.createAsync(
        source,
        {
          shouldPlay: true,
          isLooping: true,
          volume: volume,
        }
      );

      soundRef.current = sound;
      setActiveSound(key);
    } catch (err) {
      if (__DEV__) {
        console.error(`Failed to load or play ambient sound "${key}":`, err);
      }
      setActiveSound(null);
    } finally {
      setIsLoading(false);
    }
  };

  const stop = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    } catch (err) {
      if (__DEV__) {
        console.error('Failed to stop ambient sound:', err);
      }
    } finally {
      setActiveSound(null);
    }
  };

  const setVolume = async (vol: number) => {
    try {
      if (soundRef.current) {
        await soundRef.current.setVolumeAsync(vol);
      }
    } catch (err) {
      if (__DEV__) {
        console.error('Failed to adjust volume:', err);
      }
    }
  };

  // Perform automatic resource cleanup on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.stopAsync().catch((err: unknown) => {
          if (__DEV__) console.error('Cleanup stop failed:', err);
        });
        soundRef.current.unloadAsync().catch((err: unknown) => {
          if (__DEV__) console.error('Cleanup unload failed:', err);
        });
      }
    };
  }, []);

  return {
    activeSound,
    isLoading,
    play,
    stop,
    setVolume,
  };
}
