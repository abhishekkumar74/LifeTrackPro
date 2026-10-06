import { useEffect, useRef, useState } from 'react';
import { SoundKey } from '@/lib/store/focus.store';
import { captureError } from '@/lib/sentry';

let AudioModule: any = null;
let isAudioAvailable: boolean | null = null;

function getAudioModule() {
  if (isAudioAvailable === false) return null;
  if (AudioModule) return AudioModule;

  try {
    const { NativeModules } = require('react-native');
    const { NativeModulesProxy } = require('expo-modules-core') || {};

    const hasExpoAudioNative = !!(
      NativeModules?.ExpoAudio ||
      (NativeModulesProxy && NativeModulesProxy.ExpoAudio)
    );

    if (!hasExpoAudioNative) {
      isAudioAvailable = false;
      return null;
    }

    AudioModule = require('expo-audio');
    isAudioAvailable = !!AudioModule;
  } catch (e) {
    isAudioAvailable = false;
    AudioModule = null;
  }
  return AudioModule;
}

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
  const playerRef = useRef<any>(null);

  const play = async (key: SoundKey, volume: number) => {
    setIsLoading(true);
    try {
      // 1. Release existing player
      if (playerRef.current) {
        try {
          playerRef.current.pause();
          playerRef.current.release?.();
        } catch (e) {}
        playerRef.current = null;
      }

      const audioMod = getAudioModule();
      if (!audioMod || !audioMod.createAudioPlayer) {
        setIsLoading(false);
        setActiveSound(null);
        return;
      }

      // 2. Load and play sound asset via expo-audio
      try {
        const source = SOUND_FILES[key];
        const player = audioMod.createAudioPlayer(source);
        player.loop = true;
        player.volume = volume;
        player.play();

        playerRef.current = player;
        setActiveSound(key);
      } catch (e) {
        console.warn('[Audio] Failed to play ambient sound:', e);
        setActiveSound(null);
      }
    } catch (err) {
      setActiveSound(null);
    } finally {
      setIsLoading(false);
    }
  };

  const stop = async () => {
    try {
      if (playerRef.current) {
        playerRef.current.pause();
        playerRef.current.release?.();
        playerRef.current = null;
      }
    } catch (err) {
      captureError(err, { context: 'ambient_stop' });
    } finally {
      setActiveSound(null);
    }
  };

  const setVolume = async (vol: number) => {
    try {
      if (playerRef.current) {
        playerRef.current.volume = vol;
      }
    } catch (err) {
      captureError(err, { context: 'ambient_volume' });
    }
  };

  // Perform automatic resource cleanup on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.pause();
          playerRef.current.release?.();
        } catch (e) {}
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
