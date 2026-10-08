import { useEffect, useRef, useState } from 'react';
import { Image, Platform } from 'react-native';
import { SoundKey } from '@/lib/store/focus.store';
import { captureError } from '@/lib/sentry';

const SOUND_FILES: Record<SoundKey, any> = {
  rain: require('../../assets/sounds/rain.mp3'),
  cafe: require('../../assets/sounds/cafe.mp3'),
  ocean: require('../../assets/sounds/ocean.mp3'),
  lofi: require('../../assets/sounds/lofi.mp3'),
  brown_noise: require('../../assets/sounds/brown_noise.mp3'),
};

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
  const soundInstanceRef = useRef<any>(null);
  const soundTypeRef = useRef<'expo-audio' | 'web' | null>(null);

  const stopInternal = async () => {
    if (!soundInstanceRef.current) return;
    try {
      if (soundTypeRef.current === 'expo-audio') {
        soundInstanceRef.current.pause?.();
        if (typeof soundInstanceRef.current.remove === 'function') {
          soundInstanceRef.current.remove();
        } else if (typeof soundInstanceRef.current.release === 'function') {
          soundInstanceRef.current.release();
        }
      } else if (soundTypeRef.current === 'web') {
        soundInstanceRef.current.pause?.();
        soundInstanceRef.current.currentTime = 0;
      }
    } catch (e) {
    } finally {
      soundInstanceRef.current = null;
      soundTypeRef.current = null;
    }
  };

  const play = async (key: SoundKey, volume: number) => {
    setIsLoading(true);
    try {
      await stopInternal();

      const source = SOUND_FILES[key];
      if (!source) {
        setActiveSound(null);
        setIsLoading(false);
        return;
      }

      // 1. Web / HTML5 Audio fallback
      if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).Audio) {
        try {
          const resolved = Image.resolveAssetSource(source);
          const uri = resolved?.uri;
          if (uri) {
            const webAudio = new (window as any).Audio(uri);
            webAudio.loop = true;
            webAudio.volume = Math.min(1, Math.max(0, volume));
            await webAudio.play();
            soundInstanceRef.current = webAudio;
            soundTypeRef.current = 'web';
            setActiveSound(key);
            setIsLoading(false);
            return;
          }
        } catch (webErr) {
          if (__DEV__) console.warn('[useAmbientSound] Web Audio failed:', webErr);
        }
      }

      // 2. Native Expo 57 Audio (expo-audio)
      try {
        const { createAudioPlayer, setAudioModeAsync } = require('expo-audio');
        if (typeof setAudioModeAsync === 'function') {
          await setAudioModeAsync({
            playsInSilentMode: true,
            shouldPlayInBackground: true,
          }).catch(() => {});
        }

        if (typeof createAudioPlayer === 'function') {
          const player = createAudioPlayer(source);
          if (player) {
            player.loop = true;
            player.volume = Math.min(1, Math.max(0, volume));
            player.play?.();
            soundInstanceRef.current = player;
            soundTypeRef.current = 'expo-audio';
            setActiveSound(key);
            setIsLoading(false);
            return;
          }
        }
      } catch (audioErr: any) {
        // Safe silent catch when expo-audio native binary module is not present in dev client binary
      }

      setActiveSound(null);
    } catch (err) {
      setActiveSound(null);
    } finally {
      setIsLoading(false);
    }
  };

  const stop = async () => {
    try {
      await stopInternal();
    } catch (err) {
      captureError(err, { context: 'ambient_stop' });
    } finally {
      setActiveSound(null);
    }
  };

  const setVolume = async (vol: number) => {
    try {
      if (!soundInstanceRef.current) return;
      const safeVol = Math.min(1, Math.max(0, vol));

      if (soundTypeRef.current === 'expo-audio') {
        soundInstanceRef.current.volume = safeVol;
      } else if (soundTypeRef.current === 'web') {
        soundInstanceRef.current.volume = safeVol;
      }
    } catch (err) {
      captureError(err, { context: 'ambient_volume' });
    }
  };

  useEffect(() => {
    return () => {
      stopInternal().catch(() => {});
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
