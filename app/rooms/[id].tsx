import { Skeleton } from '@/components/shared/Skeleton';
import { useAndroidBackHandler } from '@/lib/hooks/use-android-back';
import { ChatMessage, RoomMember, useEndRoom, useRoomChat, useRoomPresence } from '@/lib/hooks/use-study-rooms';
import { useAuthStore } from '@/lib/store/auth.store';
import { useUiStore } from '@/lib/store/ui.store';
import { supabase } from '@/lib/supabase/client';
import { StudyRoom } from '@/types/app.types';
import { CONFIG } from '@/constants/config';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Href, router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Music,
  Pause,
  Play,
  Send,
  Share2,
  Smile,
  Volume2,
  VolumeX,
  Target,
  MessageSquare,
  LayoutGrid,
  Plus,
  X,
  Lock,
  Globe,
  Users,
  Headphones,
  BookOpen,
  CloudRain,
  Coffee,
  Waves,
  Ellipsis,
  Check,
  LogOut,
  ChevronDown,
  Copy,
  UserPlus,
} from 'lucide-react-native';
import { parseRoomSubject } from '@/lib/utils/room-visibility';
import { RoomVolumeSlider } from '@/components/community/RoomVolumeSlider';
import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

const cozyHeader = require('../../assets/images/study-room-cozy-header.png');

interface MusicStation {
  id: string;
  name: string;
  asset: any;
  genre: string;
  icon: string;
}

const STATIONS: MusicStation[] = [
  { id: 'lofi', name: 'Lo-fi Beats', asset: require('../../assets/sounds/lofi.mp3'), genre: 'Chill Beats', icon: 'music' },
  { id: 'ocean', name: 'Ocean Waves', asset: require('../../assets/sounds/ocean.mp3'), genre: 'Relaxing Waves', icon: 'ocean' },
  { id: 'rain', name: 'Rainy Cafe', asset: require('../../assets/sounds/rain.mp3'), genre: 'Study Rain', icon: 'rain' },
  { id: 'cafe', name: 'Quiet Cafe', asset: require('../../assets/sounds/cafe.mp3'), genre: 'Cafe Ambience', icon: 'cafe' },
  { id: 'brown_noise', name: 'Brown Noise', asset: require('../../assets/sounds/brown_noise.mp3'), genre: 'Deep Noise', icon: 'noise' },
];

const SOUND_ICONS: Record<string, any> = {
  lofi: Music,
  ocean: Waves,
  rain: CloudRain,
  cafe: Coffee,
  brown_noise: Ellipsis,
};

const MEMBER_COLORS = ['#7C5CFC', '#00B894', '#E8A020', '#E85858', '#8B6FE8', '#0EA5E9'];

function getColorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % MEMBER_COLORS.length;
  return MEMBER_COLORS[index];
}

const { width } = Dimensions.get('window');

interface FloatingEmojiData {
  id: string;
  emoji: string;
  randomX: number;
}

const FloatingEmoji = React.memo<{ emoji: string; randomX: number; onComplete: () => void }>(({
  emoji,
  randomX,
  onComplete,
}) => {
  const animatedY = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    animatedY.value = withTiming(-350, { duration: 2500 });
    opacity.value = withTiming(0, { duration: 2500 }, () => {
      runOnJS(onComplete)();
    });
  }, [animatedY, opacity, onComplete]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: animatedY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          bottom: 100,
          left: randomX,
          zIndex: 9999,
          pointerEvents: 'none',
        },
        animatedStyle,
      ]}
    >
      <Text style={{ fontSize: 32 }}>{emoji}</Text>
    </Animated.View>
  );
});

export default function ActiveRoomScreen(): React.JSX.Element {
  useAndroidBackHandler();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const shortCode = typeof id === 'string' ? id.replace(/-/g, '').slice(0, 6).toUpperCase() : '';
  const { profile } = useAuthStore();
  const currentUserId = profile?.id || '';

  // Fetch Room Info
  const { data: room, isLoading: isRoomLoading, error: roomError } = useQuery<StudyRoom>({
    queryKey: ['room', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('study_rooms')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as StudyRoom;
    },
    enabled: !!id,
  });

  // Fetch Host Profile
  const { data: hostProfile } = useQuery({
    queryKey: ['hostProfile', room?.host_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('id', room!.host_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!room?.host_id,
  });

  // Hooks for Presence & Chat
  const { members, memberCount, updatePresenceStatus } = useRoomPresence(id || '');
  const { messages, sendMessage } = useRoomChat(id || '');
  const endRoomMutation = useEndRoom();
  const hasExpiredRef = useRef(false);

  // Room State
  const [activeTab, setActiveTab] = useState<'lounge' | 'chat'>('lounge');
  const [timerText, setTimerText] = useState('00:00');
  const [timerProgress, setTimerProgress] = useState(1);
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [checkinNoteInput, setCheckinNoteInput] = useState('');
  const [selectedCheckin, setSelectedCheckin] = useState<string>('');
  const [showMoreModal, setShowMoreModal] = useState(false);
  const [showSoundModal, setShowSoundModal] = useState(false);

  // Memoized reversed message history to prevent re-reversing on every render
  const reversedMessages = useMemo(() => [...messages].reverse(), [messages]);

  const renderMessageItem = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <MessageRow message={item} isMe={item.userId === currentUserId} />
    ),
    [currentUserId]
  );

  // Session tracking in room
  const userJoinedTimeRef = useRef<number>(Date.now());
  const hasRecordedSessionRef = useRef<boolean>(false);

  const recordRoomStudySession = useCallback(async () => {
    if (hasRecordedSessionRef.current) return;
    const durationSecs = Math.floor((Date.now() - userJoinedTimeRef.current) / 1000);
    if (durationSecs >= 60 && currentUserId) {
      hasRecordedSessionRef.current = true;
      try {
        const durationMin = Math.max(1, Math.round(durationSecs / 60));
        await supabase.from('focus_sessions').insert({
          user_id: currentUserId,
          session_goal: `Study Room: ${room?.name || 'Group Focus'}`,
          duration_min: durationMin,
          subject: room?.subject || null,
          sound_used: null,
          mood: null,
          started_at: new Date(userJoinedTimeRef.current).toISOString(),
          ended_at: new Date().toISOString(),
          status: 'completed',
        });

        const earnedXp = Math.min(150, Math.max(20, Math.floor(durationMin / 5) * 10));
        const currentXp = profile?.xp_points || 0;
        await supabase
          .from('profiles')
          .update({ xp_points: currentXp + earnedXp })
          .eq('id', currentUserId);
      } catch (e) {
        if (__DEV__) console.warn('Failed to save in-room study session:', e);
      }
    }
  }, [currentUserId, room?.name, room?.subject, profile?.xp_points]);

  // Music State
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [currentStation, setCurrentStation] = useState<MusicStation>(STATIONS[0]);
  const soundInstanceRef = useRef<any>(null);
  const loadingSoundIdRef = useRef<string | null>(null);
  const [musicVolume, setMusicVolume] = useState(0.5);
  const [activeReactions, setActiveReactions] = useState<FloatingEmojiData[]>([]);
  const reactionChannelRef = useRef<any>(null);

  const safeGoBack = useCallback(() => {
    recordRoomStudySession();
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/rooms' as Href);
      }
    } catch {
      router.replace('/rooms' as Href);
    }
  }, [recordRoomStudySession]);

  const playStation = useCallback(async (station: MusicStation, volume: number) => {
    const loadId = Math.random().toString();
    loadingSoundIdRef.current = loadId;

    try {
      if (soundInstanceRef.current) {
        try {
          soundInstanceRef.current.pause?.();
          soundInstanceRef.current.currentTime = 0;
          soundInstanceRef.current.release?.();
          soundInstanceRef.current.remove?.();
        } catch (e) {}
        soundInstanceRef.current = null;
      }

      // Web / HTML5 Audio fallback
      if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).Audio) {
        try {
          const resolved = Image.resolveAssetSource(station.asset);
          const uri = resolved?.uri;
          if (uri) {
            const webAudio = new (window as any).Audio(uri);
            webAudio.loop = true;
            webAudio.volume = Math.min(1, Math.max(0, volume));
            await webAudio.play();
            if (loadingSoundIdRef.current !== loadId) {
              webAudio.pause();
              return;
            }
            soundInstanceRef.current = webAudio;
            setIsPlayingMusic(true);
            return;
          }
        } catch (webErr) {
          if (__DEV__) console.warn('Web Audio player failed:', webErr);
        }
      }

      // Native Expo Audio
      try {
        const { createAudioPlayer, setAudioModeAsync } = require('expo-audio');
        if (typeof setAudioModeAsync === 'function') {
          await setAudioModeAsync({
            playsInSilentMode: true,
            shouldPlayInBackground: true,
          }).catch(() => {});
        }

        if (typeof createAudioPlayer === 'function') {
          const player = createAudioPlayer(station.asset);
          if (player) {
            player.loop = true;
            player.volume = Math.min(1, Math.max(0, volume));
            player.play?.();
            if (loadingSoundIdRef.current !== loadId) {
              player.pause?.();
              return;
            }
            soundInstanceRef.current = player;
            setIsPlayingMusic(true);
            return;
          }
        }
      } catch (nativeErr) {
        if (__DEV__) console.warn('Native Expo Audio failed:', nativeErr);
        setIsPlayingMusic(false);
      }
    } catch (err) {
      if (__DEV__) console.warn('Failed to play station stream:', err);
      if (loadingSoundIdRef.current === loadId) {
        setIsPlayingMusic(false);
      }
    }
  }, []);

  const stopMusic = useCallback(async () => {
    loadingSoundIdRef.current = null;
    try {
      if (soundInstanceRef.current) {
        soundInstanceRef.current.pause?.();
        soundInstanceRef.current.currentTime = 0;
        soundInstanceRef.current.release?.();
        soundInstanceRef.current.remove?.();
        soundInstanceRef.current = null;
      }
    } catch (e) {}
    setIsPlayingMusic(false);
  }, []);

  const changeVolume = useCallback(async (vol: number) => {
    setMusicVolume(vol);
    try {
      if (soundInstanceRef.current) {
        soundInstanceRef.current.volume = Math.min(1, Math.max(0, vol));
      }
    } catch (e) {}
  }, []);

  const handleHostSelectStation = useCallback((station: MusicStation) => {
    setCurrentStation(station);
    playStation(station, musicVolume);

    if (reactionChannelRef.current) {
      reactionChannelRef.current.send({
        type: 'broadcast',
        event: 'music',
        payload: {
          stationId: station.id,
          isPlaying: true,
        },
      });
    }
  }, [musicVolume, playStation]);

  const handleHostTogglePlay = useCallback(() => {
    const nextPlaying = !isPlayingMusic;
    if (nextPlaying) {
      playStation(currentStation, musicVolume);
    } else {
      stopMusic();
    }

    if (reactionChannelRef.current) {
      reactionChannelRef.current.send({
        type: 'broadcast',
        event: 'music',
        payload: {
          stationId: currentStation.id,
          isPlaying: nextPlaying,
        },
      });
    }
  }, [isPlayingMusic, currentStation, musicVolume, playStation, stopMusic]);

  const handleMemberTogglePlay = useCallback(() => {
    if (isPlayingMusic) {
      stopMusic();
    } else {
      playStation(currentStation, musicVolume);
    }
  }, [isPlayingMusic, currentStation, musicVolume, playStation, stopMusic]);

  // Clean up sound on unmount
  useEffect(() => {
    return () => {
      loadingSoundIdRef.current = null;
      if (soundInstanceRef.current) {
        try {
          soundInstanceRef.current.pause?.();
          soundInstanceRef.current.currentTime = 0;
          soundInstanceRef.current.release?.();
          soundInstanceRef.current.remove?.();
        } catch (e) {}
        soundInstanceRef.current = null;
      }
    };
  }, []);

  const hostIsPremium = hostProfile?.is_premium || false;
  const isHost = room?.host_id === currentUserId;

  useEffect(() => {
    if (isRoomLoading || !room) return;
    if (!isHost && !hostIsPremium && memberCount >= 4) {
      Alert.alert(
        'Study Room Full',
        'Free hosted study rooms are limited to maximum 4 concurrent members. Host must upgrade to Gold to unlock mega rooms!',
        [{ text: 'OK', onPress: () => safeGoBack() }],
        { cancelable: false }
      );
    }
  }, [isRoomLoading, room, isHost, hostIsPremium, memberCount, safeGoBack]);

  const handleRoomExpired = useCallback(async () => {
    if (hasExpiredRef.current) return;
    hasExpiredRef.current = true;

    recordRoomStudySession();
    stopMusic();

    try {
      await endRoomMutation.mutateAsync(id || '');
    } catch (e) {}

    if (reactionChannelRef.current) {
      try {
        reactionChannelRef.current.send({
          type: 'broadcast',
          event: 'room_ended',
          payload: {},
        });
      } catch (e) {}
    }

    useUiStore.getState().showToast('Study session ended! Great job studying together.', 'success');
    safeGoBack();
  }, [id, endRoomMutation, stopMusic, safeGoBack]);

  // Monitor room status & automatically dismiss if expired upon opening
  useEffect(() => {
    if (!room) return;
    if (room.is_active === false) {
      handleRoomExpired();
      return;
    }
    const createdAt = new Date(room.created_at).getTime();
    const durationMs = (room.timer_minutes || 25) * 60 * 1000;
    if (Date.now() >= createdAt + durationMs) {
      handleRoomExpired();
    }
  }, [room, handleRoomExpired]);

  const musicVolumeRef = useRef(musicVolume);
  musicVolumeRef.current = musicVolume;
  const playStationRef = useRef(playStation);
  playStationRef.current = playStation;
  const stopMusicRef = useRef(stopMusic);
  stopMusicRef.current = stopMusic;
  const handleRoomExpiredRef = useRef(handleRoomExpired);
  handleRoomExpiredRef.current = handleRoomExpired;

  useEffect(() => {
    if (!id) return;

    const topic = `room_reactions:${id}`;
    const existing = supabase.getChannels().find((c) => c.topic === `realtime:${topic}` || c.topic === topic);
    if (existing) {
      supabase.removeChannel(existing);
    }

    const channel = supabase.channel(topic, {
      config: { broadcast: { self: true } },
    });

    channel
      .on('broadcast', { event: 'reaction' }, ({ payload }) => {
        const randomX = Math.random() * (width - 100) + 30;
        setActiveReactions((prev) => [
          ...prev,
          { id: Math.random().toString(), emoji: payload.emoji, randomX },
        ]);
      })
      .on('broadcast', { event: 'cheer' }, ({ payload }) => {
        if (payload.targetUserId === currentUserId) {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (e) {}

          useUiStore.getState().showToast(
            `${payload.senderName} sent you a ${payload.type === 'cheer' ? 'Cheer' : 'Nudge'}!`,
            'success'
          );

          const randomX = Math.random() * (width - 100) + 30;
          setActiveReactions((prev) => [
            ...prev,
            { id: Math.random().toString(), emoji: payload.type === 'cheer' ? 'Cheer' : 'Focus', randomX },
          ]);
        }
      })
      .on('broadcast', { event: 'music' }, ({ payload }) => {
        const station = STATIONS.find((s) => s.id === payload.stationId) || STATIONS[0];
        setCurrentStation(station);
        if (payload.isPlaying) {
          playStationRef.current(station, musicVolumeRef.current);
        } else {
          stopMusicRef.current();
        }
      })
      .on('broadcast', { event: 'room_ended' }, () => {
        handleRoomExpiredRef.current();
      })
      .subscribe();

    reactionChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel).catch(() => {});
      reactionChannelRef.current = null;
    };
  }, [id, currentUserId]);

  const sendCheerOrNudge = (targetUserId: string, type: 'cheer' | 'nudge') => {
    if (reactionChannelRef.current) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (e) {}

      reactionChannelRef.current.send({
        type: 'broadcast',
        event: 'cheer',
        payload: {
          targetUserId,
          senderName: profile?.name || 'A Friend',
          type,
        },
      });

      useUiStore.getState().showToast(`Sent ${type === 'cheer' ? 'Cheer' : 'Nudge'}!`, 'success');
    }
  };

  const sendReaction = (emoji: string) => {
    if (reactionChannelRef.current) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {}
      reactionChannelRef.current.send({
        type: 'broadcast',
        event: 'reaction',
        payload: { emoji },
      });
    }
  };

  const handleShare = async () => {
    if (!room) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      const playStoreUrl = Platform.OS === 'ios' ? CONFIG.storeUrls.ios : CONFIG.storeUrls.android;
      const shareMessage = `Join my live study room on LifeTrack Pro: "${room.name}"\nDuration: ${room.timer_minutes} mins\nRoom Code: #${shortCode}\n\nDownload LifeTrack Pro:\n${playStoreUrl}\n\n(Open the app and enter the Room Code under Study Rooms!)`;
      await Share.share({
        message: shareMessage,
        title: `Study with me on LifeTrack Pro: ${room.name}`,
      });
    } catch (error) {
      if (__DEV__) console.warn('Share error:', error);
    }
  };

  // Shared Group Countdown Timer
  useEffect(() => {
    if (!room || !room.created_at) return;

    const createdAt = new Date(room.created_at).getTime();
    const durationMs = room.timer_minutes * 60 * 1000;
    const expiresAt = createdAt + durationMs;
    const totalSecs = Math.max(1, room.timer_minutes * 60);

    const updateTimer = () => {
      const now = Date.now();
      const remainingSecs = Math.max(0, Math.floor((expiresAt - now) / 1000));
      const prog = Math.min(1, Math.max(0, remainingSecs / totalSecs));
      setTimerProgress(prog);

      const hrs = Math.floor(remainingSecs / 3600);
      const mins = Math.floor((remainingSecs % 3600) / 60);
      const secs = remainingSecs % 60;
      const pad = (n: number) => String(n).padStart(2, '0');

      if (hrs > 0) {
        setTimerText(`${pad(hrs)}:${pad(mins)}:${pad(secs)}`);
      } else {
        setTimerText(`${pad(mins)}:${pad(secs)}`);
      }

      if (remainingSecs <= 0) {
        handleRoomExpired();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [room, handleRoomExpired]);

  // Sync active study presence
  useEffect(() => {
    updatePresenceStatus({ isFocusing: true });
  }, [updatePresenceStatus]);

  useEffect(() => {
    return () => {
      recordRoomStudySession();
    };
  }, [recordRoomStudySession]);

  const handleCloseCheckinModal = useCallback(() => {
    Keyboard.dismiss();
    setShowCheckinModal(false);
  }, []);

  const handleProgressCheckinSubmit = async () => {
    if (!checkinNoteInput.trim()) return;
    const note = checkinNoteInput.trim();

    Keyboard.dismiss();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    updatePresenceStatus({
      lastCheckinNote: note,
      checkinTime: new Date().toISOString(),
    });

    sendMessage(`[CHECK-IN] ${profile?.name || 'Member'}: ${note}`);
    setSelectedCheckin(note);

    if (reactionChannelRef.current) {
      reactionChannelRef.current.send({
        type: 'broadcast',
        event: 'reaction',
        payload: { emoji: 'Check' },
      });
    }

    setCheckinNoteInput('');
    setShowCheckinModal(false);
    useUiStore.getState().showToast(`Check-in updated: ${note}`, 'success');
  };

  const handleSelectCheckinChip = (preset: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setSelectedCheckin(preset);

    updatePresenceStatus({
      lastCheckinNote: preset,
      checkinTime: new Date().toISOString(),
    });

    sendMessage(`[CHECK-IN] ${profile?.name || 'Member'}: ${preset}`);

    if (reactionChannelRef.current) {
      reactionChannelRef.current.send({
        type: 'broadcast',
        event: 'reaction',
        payload: { emoji: 'Check' },
      });
    }

    useUiStore.getState().showToast(`Working on: ${preset}`, 'success');
  };

  const handleLeave = () => {
    if (isHost) {
      Alert.alert(
        'Leave Study Room',
        'You are the host. Would you like to end the session for everyone or keep it running?',
        [
          {
            text: 'End Room for Everyone',
            style: 'destructive',
            onPress: async () => {
              try {
                await endRoomMutation.mutateAsync(id || '');
                safeGoBack();
              } catch (e) {
                safeGoBack();
              }
            },
          },
          {
            text: 'Keep Room Running',
            onPress: () => safeGoBack(),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } else {
      safeGoBack();
    }
  };

  const handleMemberPress = (member: RoomMember) => {
    if (member.userId === currentUserId) return;
    Alert.alert(
      `Support ${member.name}`,
      'Send a quick cheer to boost their focus session:',
      [
        { text: 'Send Cheer', onPress: () => sendCheerOrNudge(member.userId, 'cheer') },
        { text: 'Nudge to Focus', onPress: () => sendCheerOrNudge(member.userId, 'nudge') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const formatTimeAgo = (joinedAtStr: string) => {
    const diffMs = Date.now() - new Date(joinedAtStr).getTime();
    const diffMins = Math.max(0, Math.floor(diffMs / 60000));
    if (diffMins === 0) return 'Just joined';
    return `${diffMins}m in room`;
  };

  if (isRoomLoading) {
    return (
      <SafeAreaView style={[styles.container, { paddingHorizontal: 16 }]} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" backgroundColor="#0D0C1D" translucent={false} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 }}>
          <Skeleton width={70} height={30} borderRadius={8} />
          <Skeleton width={120} height={20} borderRadius={8} />
          <Skeleton width={80} height={24} borderRadius={12} />
        </View>
        <View style={{ alignItems: 'center', marginVertical: 32 }}>
          <Skeleton width={220} height={220} borderRadius={110} />
        </View>
        <View style={{ marginVertical: 16 }}>
          <Skeleton width={100} height={16} borderRadius={6} style={{ marginBottom: 12 }} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} width={70} height={70} borderRadius={16} />
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (roomError || !room || !room.is_active) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#0D0C1D" translucent={false} />
        <Text style={styles.errorText}>
          {!room || room.is_active ? 'Room not found' : 'This study room has ended'}
        </Text>
        <TouchableOpacity style={styles.leaveButton} onPress={handleLeave}>
          <Text style={styles.leaveButtonText}>Leave Room</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const parsedSubject = parseRoomSubject(room.subject, room.is_public);
  const displaySubject = parsedSubject.displaySubject || 'General Skills';

  // Dynamic quick checkin chip list
  const quickCheckinPresets = [
    room.name.length > 16 ? room.name.slice(0, 16) + '...' : room.name,
    'Revision',
    'Practice',
  ];

  // Responsive circular timer geometry
  const circleSize = Math.min(216, Math.max(196, Math.round(windowWidth * 0.55)));
  const TIMER_VIEWBOX = 216;
  const TIMER_CENTER = TIMER_VIEWBOX / 2; // 108
  const RADIUS = 90;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const strokeDashoffset = CIRCUMFERENCE * (1 - timerProgress);
  const angle = (timerProgress * 360 - 90) * (Math.PI / 180);
  const dotX = TIMER_CENTER + RADIUS * Math.cos(angle);
  const dotY = TIMER_CENTER + RADIUS * Math.sin(angle);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0C1D" translucent={false} />

      {/* TOP HEADER BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconCircleBtn} onPress={handleLeave} activeOpacity={0.7}>
          <ArrowLeft size={18} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Room Title & Badges */}
        <View style={styles.headerTitleGroup}>
          <View style={styles.roomIconBox}>
            {room.room_type === 'music' ? (
              <Headphones size={18} color="#FFFFFF" />
            ) : room.room_type === 'silent' ? (
              <VolumeX size={18} color="#FFFFFF" />
            ) : (
              <BookOpen size={18} color="#FFFFFF" />
            )}
          </View>

          <View style={styles.titleInfoCol}>
            <Text style={styles.roomHeaderTitle} numberOfLines={1}>
              {room.name}
            </Text>
            <View style={styles.headerSubPillsRow}>
              <View style={styles.categoryPill}>
                <Text style={styles.categoryPillText} numberOfLines={1}>
                  {displaySubject}
                </Text>
              </View>
              <View style={styles.memberPill}>
                <Users size={11} color="#A78BFA" />
                <Text style={styles.memberPillText}>{members.length}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Right Actions: Share & Live Badge */}
        <View style={styles.headerRightRow}>
          <TouchableOpacity style={styles.iconCircleBtn} onPress={handleShare} activeOpacity={0.7}>
            <Share2 size={16} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.liveIndicatorBadge}>
            <View style={styles.liveIndicatorDot} />
            <Text style={styles.liveIndicatorText}>LIVE</Text>
          </View>
        </View>
      </View>

      {/* SEGMENTED TAB SWITCHER */}
      <View style={styles.tabSwitchContainer}>
        <TouchableOpacity
          style={[styles.tabSwitchBtn, activeTab === 'lounge' && styles.tabSwitchBtnActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            setActiveTab('lounge');
          }}
          activeOpacity={0.8}
        >
          <LayoutGrid size={15} color={activeTab === 'lounge' ? '#FFFFFF' : '#9D9AA8'} />
          <Text style={[styles.tabSwitchText, activeTab === 'lounge' && styles.tabSwitchTextActive]}>
            Room
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabSwitchBtn, activeTab === 'chat' && styles.tabSwitchBtnActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            setActiveTab('chat');
          }}
          activeOpacity={0.8}
        >
          <MessageSquare size={15} color={activeTab === 'chat' ? '#FFFFFF' : '#9D9AA8'} />
          <Text style={[styles.tabSwitchText, activeTab === 'chat' && styles.tabSwitchTextActive]}>
            Chat & Feed
          </Text>
          {messages.length > 0 && <View style={styles.chatUnreadDot} />}
        </TouchableOpacity>
      </View>

      {/* MAIN CONTENT AREA */}
      <View style={{ flex: 1 }}>
        {activeTab === 'lounge' ? (
          <View style={styles.fixedLoungeContainer}>
            {/* HERO ARTWORK (Full width edge-to-edge) + CIRCULAR COUNTDOWN TIMER */}
            <View style={styles.heroArtworkContainer}>
              <ImageBackground
                source={cozyHeader}
                style={styles.heroImageBg}
                resizeMode="cover"
              >
                {/* Vignette overlays for smooth edge fading into #0D0C1D */}
                <View style={StyleSheet.absoluteFill} pointerEvents="none">
                  <Svg width="100%" height="100%">
                    <Defs>
                      <LinearGradient id="heroLeftFade" x1="0%" y1="0%" x2="100%" y2="0%">
                        <Stop offset="0%" stopColor="#0D0C1D" stopOpacity="0.9" />
                        <Stop offset="100%" stopColor="#0D0C1D" stopOpacity="0" />
                      </LinearGradient>
                      <LinearGradient id="heroRightFade" x1="0%" y1="0%" x2="100%" y2="0%">
                        <Stop offset="0%" stopColor="#0D0C1D" stopOpacity="0" />
                        <Stop offset="100%" stopColor="#0D0C1D" stopOpacity="0.9" />
                      </LinearGradient>
                      <LinearGradient id="heroBottomFade" x1="0%" y1="0%" x2="0%" y2="100%">
                        <Stop offset="0%" stopColor="#0D0C1D" stopOpacity="0" />
                        <Stop offset="100%" stopColor="#0D0C1D" stopOpacity="0.95" />
                      </LinearGradient>
                    </Defs>
                    {/* Left edge fade */}
                    <Rect x="0" y="0" width="55" height="100%" fill="url(#heroLeftFade)" />
                    {/* Right edge fade */}
                    <Rect x="85%" y="0" width="15%" height="100%" fill="url(#heroRightFade)" />
                    {/* Bottom edge fade */}
                    <Rect x="0" y="65%" width="100%" height="35%" fill="url(#heroBottomFade)" />
                  </Svg>
                </View>

                {/* Dark scrim overlay for legibility */}
                <View style={styles.heroDarkOverlay}>
                  {/* Circular Timer SVG */}
                  <View style={[styles.circularTimerWrapper, { width: circleSize, height: circleSize }]}>
                    <Svg width={circleSize} height={circleSize} viewBox="0 0 216 216">
                      <Defs>
                        <LinearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <Stop offset="0%" stopColor="#C4B5FD" />
                          <Stop offset="100%" stopColor="#7C5CFC" />
                        </LinearGradient>
                      </Defs>
                      {/* Background track circle */}
                      <Circle
                        cx={TIMER_CENTER}
                        cy={TIMER_CENTER}
                        r={RADIUS}
                        stroke="rgba(255, 255, 255, 0.14)"
                        strokeWidth={6}
                        fill="rgba(13, 12, 29, 0.78)"
                      />
                      {/* Animated Progress circle */}
                      <Circle
                        cx={TIMER_CENTER}
                        cy={TIMER_CENTER}
                        r={RADIUS}
                        stroke="url(#timerGrad)"
                        strokeWidth={6}
                        strokeLinecap="round"
                        strokeDasharray={CIRCUMFERENCE}
                        strokeDashoffset={strokeDashoffset}
                        transform={`rotate(-90 ${TIMER_CENTER} ${TIMER_CENTER})`}
                      />
                      {/* Head glowing indicator dot */}
                      {timerProgress > 0 && (
                        <Circle
                          cx={dotX}
                          cy={dotY}
                          r={4.5}
                          fill="#FFFFFF"
                          stroke="#7C5CFC"
                          strokeWidth={2}
                        />
                      )}
                    </Svg>

                    {/* Inside Timer Center Details */}
                    <View style={[styles.timerCenterContent, { maxWidth: Math.round(circleSize * 0.76) }]}>
                      <Text
                        style={[
                          styles.timerDigitsText,
                          timerText.length >= 8
                            ? styles.timerDigitsLong
                            : timerText.length >= 6
                            ? styles.timerDigitsMedium
                            : styles.timerDigitsStandard,
                        ]}
                        numberOfLines={1}
                        adjustsFontSizeToFit={true}
                        minimumFontScale={0.7}
                      >
                        {timerText}
                      </Text>
                      <Text style={styles.timerMinutesSub} numberOfLines={1}>
                        {room.timer_minutes} min • Studying
                      </Text>

                      {/* Play / Pause circular button */}
                      <TouchableOpacity
                        style={styles.timerPlayPauseBtn}
                        onPress={isHost ? handleHostTogglePlay : handleMemberTogglePlay}
                        activeOpacity={0.8}
                      >
                        {isPlayingMusic ? (
                          <Pause size={15} color="#FFFFFF" fill="#FFFFFF" />
                        ) : (
                          <Play size={15} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 2 }} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </ImageBackground>
            </View>

            {/* Padded Content Section Below Full-Bleed Artwork */}
            <View style={styles.contentPadding}>
              {/* AMBIENT SOUNDSCAPE STRIP */}
              <View style={styles.soundscapeBar}>
                <View style={styles.soundscapeIconsRow}>
                  {STATIONS.map((station) => {
                    const isCurrent = currentStation.id === station.id;
                    const IconComp = SOUND_ICONS[station.id] || Music;
                    return (
                      <TouchableOpacity
                        key={station.id}
                        style={[styles.soundChipBtn, isCurrent && styles.soundChipBtnActive]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                          if (isCurrent) {
                            if (isPlayingMusic) {
                              stopMusic();
                            } else {
                              playStation(currentStation, musicVolume);
                            }
                          } else {
                            handleHostSelectStation(station);
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <IconComp
                          size={14}
                          color={isCurrent ? '#FFFFFF' : '#9D9AA8'}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Soundstation dropdown selector */}
                <TouchableOpacity
                  style={styles.soundDropdownBtn}
                  onPress={() => setShowSoundModal(true)}
                  activeOpacity={0.8}
                >
                  {isPlayingMusic ? (
                    <Volume2 size={12} color="#A78BFA" />
                  ) : (
                    <VolumeX size={12} color="#9D9AA8" />
                  )}
                  <Text style={styles.soundDropdownText} numberOfLines={1}>
                    {isPlayingMusic ? currentStation.name : 'Lo-fi Study'}
                  </Text>
                  <ChevronDown size={11} color="#9D9AA8" />
                </TouchableOpacity>
              </View>

              {/* IN-ROOM AMBIENT VOLUME SLIDER */}
              <View style={styles.inlineVolumeSliderRow}>
                <RoomVolumeSlider
                  volume={musicVolume}
                  onVolumeChange={changeVolume}
                  accentColor="#7C5CFC"
                  trackHeight={28}
                />
              </View>

              {/* STUDYING NOW SECTION (Only Profile Avatars / Pics) */}
              <View style={styles.studyingNowSection}>
                <View style={styles.studyingNowHeader}>
                  <Users size={14} color="#A78BFA" />
                  <Text style={styles.studyingNowTitle}>Studying Now ({members.length})</Text>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.studyingNowList}
                >
                  {members.map((member) => (
                    <TouchableOpacity
                      key={member.userId}
                      style={styles.memberAvatarTouch}
                      onPress={() => handleMemberPress(member)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.memberAvatarWrapper}>
                        {member.avatarUrl ? (
                          <Image source={{ uri: member.avatarUrl }} style={styles.memberAvatarImage} />
                        ) : (
                          <View style={[styles.memberAvatarFallback, { backgroundColor: getColorForUser(member.userId) }]}>
                            <Text style={styles.memberInitialsText}>{member.initials}</Text>
                          </View>
                        )}
                        {/* Active green status indicator dot */}
                        <View style={styles.memberActiveDot} />
                      </View>
                    </TouchableOpacity>
                  ))}

                  {/* + Invite Dashed Circle Button */}
                  <TouchableOpacity
                    style={styles.inviteDashedCard}
                    onPress={handleShare}
                    activeOpacity={0.75}
                  >
                    <View style={styles.inviteDashedCircle}>
                      <Plus size={16} color="#A78BFA" />
                    </View>
                    <Text style={styles.inviteDashedLabel}>Invite</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>

              {/* QUICK CHECK-IN CARD */}
              <View style={styles.checkinCard}>
                <View style={styles.checkinHeaderRow}>
                  <Target size={13} color="#A78BFA" />
                  <Text style={styles.checkinHeaderTag}>Quick Check-in</Text>
                </View>
                <Text style={styles.checkinQuestion}>What are you working on today?</Text>

                <View style={styles.checkinChipsContainer}>
                  {quickCheckinPresets.map((preset) => {
                    const isSelected = selectedCheckin === preset;
                    return (
                      <TouchableOpacity
                        key={preset}
                        style={[styles.checkinChip, isSelected && styles.checkinChipActive]}
                        onPress={() => handleSelectCheckinChip(preset)}
                        activeOpacity={0.8}
                      >
                        {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={2.5} />}
                        <Text style={[styles.checkinChipText, isSelected && styles.checkinChipTextActive]} numberOfLines={1}>
                          {preset}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}

                  {/* + Custom Chip */}
                  <TouchableOpacity
                    style={[
                      styles.checkinChip,
                      selectedCheckin && !quickCheckinPresets.includes(selectedCheckin) && styles.checkinChipActive,
                    ]}
                    onPress={() => setShowCheckinModal(true)}
                    activeOpacity={0.8}
                  >
                    {selectedCheckin && !quickCheckinPresets.includes(selectedCheckin) ? (
                      <>
                        <Check size={12} color="#FFFFFF" strokeWidth={2.5} />
                        <Text style={styles.checkinChipTextActive} numberOfLines={1}>
                          {selectedCheckin.length > 10 ? selectedCheckin.slice(0, 10) + '...' : selectedCheckin}
                        </Text>
                      </>
                    ) : (
                      <>
                        <Plus size={12} color="#A5A1B8" />
                        <Text style={styles.checkinChipText}>Custom</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        ) : (
          /* CHAT & FEED TAB */
          <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: '#0D0C1D' }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 112 : 0}
          >
            {/* Sticky Mini Bar */}
            <View style={styles.stickyMiniBar}>
              <View style={styles.stickyMiniItem}>
                <Text style={styles.stickyMiniTimerText}>{timerText}</Text>
              </View>
              <TouchableOpacity
                style={styles.stickyMiniItem}
                onPress={isHost ? handleHostTogglePlay : handleMemberTogglePlay}
                activeOpacity={0.7}
              >
                <Music size={13} color="#A78BFA" />
                <Text style={styles.stickyMiniMusicText} numberOfLines={1}>
                  {isPlayingMusic ? currentStation.name : 'Audio Paused'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.checkinMiniBtn}
                onPress={() => setShowCheckinModal(true)}
                activeOpacity={0.8}
              >
                <Target size={12} color="#00B894" />
                <Text style={styles.checkinMiniBtnText}>Check-in</Text>
              </TouchableOpacity>
            </View>

            {/* Chat Messages List */}
            <FlatList
              data={reversedMessages}
              keyExtractor={(item) => item.id}
              inverted
              removeClippedSubviews={Platform.OS === 'android'}
              renderItem={renderMessageItem}
              contentContainerStyle={styles.chatListContent}
              style={{ flex: 1 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            />

            {/* Optimized Lag-Free Chat Input Bar */}
            <ChatInputBar onSendMessage={sendMessage} insetsBottom={insets.bottom} />
          </KeyboardAvoidingView>
        )}
      </View>

      {/* BOTTOM FIXED ACTION BAR */}
      {activeTab === 'lounge' && (
        <View style={[styles.bottomActionBar, { paddingBottom: Math.max(12, insets.bottom + 4) }]}>
          <TouchableOpacity
            style={styles.bottomBarSecondaryBtn}
            onPress={handleShare}
            activeOpacity={0.8}
          >
            <UserPlus size={16} color="#FFFFFF" />
            <Text style={styles.bottomBarSecondaryText}>Invite</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bottomBarLeaveBtn}
            onPress={handleLeave}
            activeOpacity={0.8}
          >
            <LogOut size={16} color="#FFFFFF" />
            <Text style={styles.bottomBarLeaveText}>Leave Room</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bottomBarSecondaryBtn}
            onPress={() => setShowMoreModal(true)}
            activeOpacity={0.8}
          >
            <Ellipsis size={18} color="#FFFFFF" />
            <Text style={styles.bottomBarSecondaryText}>More</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* FLOATING REACTIONS CANVAS */}
      {activeReactions.map((reaction) => (
        <FloatingEmoji
          key={reaction.id}
          emoji={reaction.emoji}
          randomX={reaction.randomX}
          onComplete={() => {
            setActiveReactions((prev) => prev.filter((r) => r.id !== reaction.id));
          }}
        />
      ))}

      {/* CUSTOM CHECK-IN MODAL */}
      <Modal
        visible={showCheckinModal}
        transparent
        animationType="slide"
        onRequestClose={handleCloseCheckinModal}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={handleCloseCheckinModal}
          >
            <TouchableOpacity
              style={styles.modalContent}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Target size={18} color="#7C5CFC" />
                  <Text style={styles.modalTitle}>Set Custom Study Focus</Text>
                </View>
                <TouchableOpacity
                  onPress={handleCloseCheckinModal}
                  style={styles.modalCloseBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={18} color="#9D9AA8" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>
                Tell your study room what topic, chapter, or goal you are working on:
              </Text>

              <TextInput
                style={styles.checkinInput}
                placeholder="e.g. Chapter 4 Thermodynamics, Solving Mock 2..."
                placeholderTextColor="#64748B"
                value={checkinNoteInput}
                onChangeText={setCheckinNoteInput}
                multiline
                maxLength={120}
                textAlignVertical="top"
              />

              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={handleCloseCheckinModal}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalSubmitBtn,
                    !checkinNoteInput.trim() && styles.modalSubmitBtnDisabled,
                  ]}
                  onPress={handleProgressCheckinSubmit}
                  disabled={!checkinNoteInput.trim()}
                >
                  <Text style={styles.modalSubmitText}>Save Check-in</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* SOUND CONTROL & STATION PICKER MODAL */}
      <Modal
        visible={showSoundModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSoundModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSoundModal(false)}
        >
          <TouchableOpacity
            style={styles.soundModalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Volume2 size={18} color="#7C5CFC" />
                <Text style={styles.modalTitle}>Soundscape Stations</Text>
              </View>
              <TouchableOpacity onPress={() => setShowSoundModal(false)}>
                <X size={18} color="#9D9AA8" />
              </TouchableOpacity>
            </View>

            <View style={styles.soundStationsList}>
              {STATIONS.map((station) => {
                const isSelected = currentStation.id === station.id;
                return (
                  <TouchableOpacity
                    key={station.id}
                    style={[styles.soundStationCard, isSelected && styles.soundStationCardActive]}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      handleHostSelectStation(station);
                      setShowSoundModal(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.stationInfoLeft}>
                      <Text style={styles.stationNameText}>{station.name}</Text>
                      <Text style={styles.stationGenreText}>{station.genre}</Text>
                    </View>
                    {isSelected && (
                      <View style={styles.stationActivePill}>
                        <Text style={styles.stationActivePillText}>Playing</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Volume Control Slider */}
            <View style={styles.modalVolumeSection}>
              <View style={styles.modalVolumeHeader}>
                <Text style={styles.volumeLabel}>Volume</Text>
              </View>
              <RoomVolumeSlider
                volume={musicVolume}
                onVolumeChange={changeVolume}
                accentColor="#7C5CFC"
                trackHeight={34}
              />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* MORE OPTIONS SHEET */}
      <Modal
        visible={showMoreModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMoreModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMoreModal(false)}
        >
          <TouchableOpacity
            style={styles.moreModalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Room Options</Text>
              <TouchableOpacity onPress={() => setShowMoreModal(false)}>
                <X size={18} color="#9D9AA8" />
              </TouchableOpacity>
            </View>

            {/* Room Code Quick Copy */}
            <TouchableOpacity
              style={styles.moreActionRow}
              onPress={async () => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  const clipboard = require('expo-clipboard');
                  if (clipboard?.setStringAsync) {
                    await clipboard.setStringAsync(shortCode);
                  }
                  Alert.alert('Room Code Copied!', `Code #${shortCode} copied to clipboard.`);
                  setShowMoreModal(false);
                } catch (e) {}
              }}
              activeOpacity={0.7}
            >
              <View style={styles.moreActionIcon}>
                <Copy size={16} color="#7C5CFC" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.moreActionText}>Copy Room Code (#{shortCode})</Text>
                <Text style={styles.moreActionSub}>Share with friends to let them join</Text>
              </View>
            </TouchableOpacity>

            {/* Invite Friends */}
            <TouchableOpacity
              style={styles.moreActionRow}
              onPress={() => {
                setShowMoreModal(false);
                handleShare();
              }}
              activeOpacity={0.7}
            >
              <View style={styles.moreActionIcon}>
                <Share2 size={16} color="#00B894" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.moreActionText}>Share Invite Link</Text>
                <Text style={styles.moreActionSub}>Invite via WhatsApp, Telegram, or message</Text>
              </View>
            </TouchableOpacity>

            {/* If Host: End Room */}
            {isHost && (
              <TouchableOpacity
                style={[styles.moreActionRow, { borderBottomWidth: 0 }]}
                onPress={() => {
                  setShowMoreModal(false);
                  handleLeave();
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.moreActionIcon, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <LogOut size={16} color="#EF4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.moreActionText, { color: '#EF4444' }]}>End Room for Everyone</Text>
                  <Text style={styles.moreActionSub}>Finish the study session as host</Text>
                </View>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// Chat message bubble subcomponent
const MessageRow = React.memo<{ message: ChatMessage; isMe: boolean }>(({ message, isMe }) => {
  const avatarColor = useMemo(() => getColorForUser(message.userId), [message.userId]);

  const formattedTime = useMemo(() => {
    try {
      const date = new Date(message.sentAt);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch (e) {
      return '';
    }
  }, [message.sentAt]);

  return (
    <View style={[styles.messageRow, isMe && styles.messageRowOwn]}>
      {!isMe && (
        <View style={[styles.msgAvatar, { backgroundColor: avatarColor }]}>
          {message.userAvatar ? (
            <Image source={{ uri: message.userAvatar }} style={styles.msgAvatarImage} />
          ) : (
            <Text style={styles.msgAvatarText}>{message.userInitials}</Text>
          )}
        </View>
      )}

      <View style={[styles.messageBubbleColumn, isMe && styles.messageBubbleColumnOwn]}>
        {!isMe && <Text style={styles.messageSenderName}>{message.userName}</Text>}
        <View style={[styles.messageBubble, isMe ? styles.messageBubbleOwn : styles.messageBubbleOther]}>
          <Text style={styles.messageText}>{message.text}</Text>
          <Text style={[styles.messageTimeText, isMe ? styles.messageTimeTextOwn : styles.messageTimeTextOther]}>
            {formattedTime}
          </Text>
        </View>
      </View>
    </View>
  );
});

// Optimized Isolated Chat Input Bar (Prevents Parent Screen Re-renders on Keystrokes)
interface ChatInputBarProps {
  onSendMessage: (text: string) => void;
  insetsBottom: number;
}

const ChatInputBar = React.memo<ChatInputBarProps>(({ onSendMessage, insetsBottom }) => {
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setInputText('');
  }, [inputText, onSendMessage]);

  const sendQuickReaction = useCallback(
    (reaction: string) => {
      onSendMessage(reaction);
      setShowEmojiPicker(false);
    },
    [onSendMessage]
  );

  return (
    <View style={{ backgroundColor: '#16142E' }}>
      {/* Quick Reaction Popup */}
      {showEmojiPicker && (
        <View style={styles.emojiPickerPopup}>
          {['Focus', 'Done', 'Sprint', 'Break', 'Ready', 'Goal'].map((reactionText) => (
            <TouchableOpacity
              key={reactionText}
              style={styles.emojiPickerButton}
              onPress={() => sendQuickReaction(reactionText)}
              activeOpacity={0.7}
            >
              <Text style={styles.emojiPickerText}>{reactionText}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Chat Input Row */}
      <View
        style={[
          styles.chatInputRow,
          { paddingBottom: keyboardVisible ? 8 : Math.max(8, insetsBottom + 2) },
        ]}
      >
        <TouchableOpacity
          style={styles.emojiTriggerButton}
          onPress={() => setShowEmojiPicker((prev) => !prev)}
          activeOpacity={0.8}
        >
          <Smile size={20} color={showEmojiPicker ? '#7C5CFC' : '#9D9AA8'} />
        </TouchableOpacity>

        <TextInput
          style={styles.chatTextInput}
          placeholder="Type a message or cheering thought..."
          placeholderTextColor="rgba(255, 255, 255, 0.35)"
          value={inputText}
          onChangeText={setInputText}
          maxLength={200}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />

        <TouchableOpacity
          style={[styles.chatSendButton, !inputText.trim() && styles.chatSendButtonDisabled]}
          onPress={handleSend}
          activeOpacity={0.8}
          disabled={!inputText.trim()}
        >
          <Send size={15} color={inputText.trim() ? '#FFFFFF' : 'rgba(255, 255, 255, 0.4)'} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0C1D',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0D0C1D',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    color: '#EF4444',
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  leaveButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  leaveButtonText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Bold',
    fontSize: 14,
  },

  // TOP BAR
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: '#0D0C1D',
  },
  iconCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1E1B38',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitleGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
    gap: 10,
  },
  roomIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#6D44DC',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6D44DC',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 3,
  },
  titleInfoCol: {
    flex: 1,
  },
  roomHeaderTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  headerSubPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  categoryPill: {
    backgroundColor: '#231F44',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    maxWidth: 105,
  },
  categoryPillText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    color: '#C4B5FD',
  },
  memberPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#231F44',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  memberPillText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 10,
    color: '#A78BFA',
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveIndicatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 5,
    gap: 5,
  },
  liveIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveIndicatorText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 10.5,
    color: '#10B981',
    letterSpacing: 0.5,
  },

  // SEGMENTED SWITCHER
  tabSwitchContainer: {
    flexDirection: 'row',
    backgroundColor: '#191732',
    borderRadius: 16,
    padding: 4,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  tabSwitchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  tabSwitchBtnActive: {
    backgroundColor: '#7C5CFC',
    shadowColor: '#7C5CFC',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  tabSwitchText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12.5,
    color: '#9D9AA8',
  },
  tabSwitchTextActive: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Bold',
    fontWeight: '700',
  },
  chatUnreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },

  // FIXED LOUNGE CONTAINER
  fixedLoungeContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  contentPadding: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'space-evenly',
    paddingBottom: 4,
  },

  // HERO ARTWORK & CIRCULAR TIMER
  heroArtworkContainer: {
    width: '100%',
    height: 250,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#0D0C1D',
  },
  heroImageBg: {
    width: '100%',
    height: '100%',
  },
  heroDarkOverlay: {
    flex: 1,
    backgroundColor: 'rgba(13, 12, 29, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circularTimerWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  timerCenterContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 4,
  },
  timerDigitsText: {
    fontFamily: 'DMMono',
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  timerDigitsLong: {
    // 8+ characters: e.g. "03:19:41"
    fontSize: Platform.OS === 'android' ? 24 : 25,
    letterSpacing: Platform.OS === 'android' ? 0.1 : 0.3,
  },
  timerDigitsMedium: {
    // 6-7 characters: e.g. "1:23:45"
    fontSize: Platform.OS === 'android' ? 27 : 28,
    letterSpacing: Platform.OS === 'android' ? 0.2 : 0.4,
  },
  timerDigitsStandard: {
    // 5 characters or less: e.g. "25:00", "09:41", "Ended"
    fontSize: Platform.OS === 'android' ? 33 : 34,
    letterSpacing: Platform.OS === 'android' ? 0.3 : 0.5,
  },
  timerMinutesSub: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 2,
    marginBottom: 6,
    textAlign: 'center',
    maxWidth: 140,
    includeFontPadding: false,
  },
  timerPlayPauseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#7C5CFC',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7C5CFC',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 4,
  },

  // AMBIENT SOUNDSCAPE STRIP
  soundscapeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#191732',
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  soundscapeIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  soundChipBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#232042',
    justifyContent: 'center',
    alignItems: 'center',
  },
  soundChipBtnActive: {
    backgroundColor: '#7C5CFC',
  },
  soundDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#232042',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 5,
    maxWidth: 120,
  },
  soundDropdownText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    color: '#FFFFFF',
    flexShrink: 1,
  },

  // STUDYING NOW SECTION
  studyingNowSection: {},
  studyingNowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  studyingNowTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 12,
    color: '#A5A1B8',
    letterSpacing: 0.3,
  },
  studyingNowList: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  memberAvatarTouch: {
    position: 'relative',
  },
  memberAvatarWrapper: {
    position: 'relative',
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  memberAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  memberAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberInitialsText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  memberActiveDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#0D0C1D',
  },
  inviteDashedCard: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    marginLeft: 2,
  },
  inviteDashedCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#7C5CFC',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 92, 252, 0.08)',
  },
  inviteDashedLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 9.5,
    color: '#A5A1B8',
  },

  // QUICK CHECK-IN CARD
  checkinCard: {
    backgroundColor: '#1A1736',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(124, 92, 252, 0.22)',
  },
  checkinHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 3,
  },
  checkinHeaderTag: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10.5,
    color: '#C4B5FD',
  },
  checkinQuestion: {
    fontFamily: 'DMSans-Bold',
    fontSize: 13.5,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  checkinChipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkinChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#252147',
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  checkinChipActive: {
    backgroundColor: '#7C5CFC',
    borderColor: '#7C5CFC',
  },
  checkinChipText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    color: '#C4B5FD',
    textAlign: 'center',
  },
  checkinChipTextActive: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Bold',
  },

  // BOTTOM ACTION BAR
  bottomActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111024',
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    gap: 10,
  },
  bottomBarSecondaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F1B3C',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  bottomBarSecondaryText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 12.5,
    color: '#FFFFFF',
  },
  bottomBarLeaveBtn: {
    flex: 1.35,
    height: 44,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F43F5E',
    gap: 6,
    shadowColor: '#F43F5E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  bottomBarLeaveText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 13,
    color: '#FFFFFF',
  },

  // STICKY MINI BAR IN CHAT
  stickyMiniBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#16142E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  stickyMiniItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stickyMiniTimerText: {
    fontFamily: 'DMMono',
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  stickyMiniMusicText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    color: '#C4B5FD',
    maxWidth: 120,
  },
  checkinMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 184, 148, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  checkinMiniBtnText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 11,
    color: '#00B894',
  },

  // CHAT LIST & MESSAGES
  chatListContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 4,
    alignItems: 'flex-end',
    gap: 8,
  },
  messageRowOwn: {
    justifyContent: 'flex-end',
  },
  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  msgAvatarImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  msgAvatarText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 10,
    color: '#FFFFFF',
  },
  messageBubbleColumn: {
    maxWidth: '78%',
  },
  messageBubbleColumnOwn: {
    alignItems: 'flex-end',
  },
  messageSenderName: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10.5,
    color: '#9D9AA8',
    marginBottom: 2,
    marginLeft: 4,
  },
  messageBubble: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  messageBubbleOther: {
    backgroundColor: '#1E1B38',
    borderBottomLeftRadius: 4,
  },
  messageBubbleOwn: {
    backgroundColor: '#7C5CFC',
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontFamily: 'DMSans',
    fontSize: 13,
    color: '#FFFFFF',
    lineHeight: 18,
  },
  messageTimeText: {
    fontFamily: 'DMSans',
    fontSize: 9.5,
    marginTop: 3,
    alignSelf: 'flex-end',
  },
  messageTimeTextOther: {
    color: '#9D9AA8',
  },
  messageTimeTextOwn: {
    color: 'rgba(255, 255, 255, 0.7)',
  },

  // CHAT INPUT ROW
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16142E',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  emojiTriggerButton: {
    padding: 6,
  },
  chatTextInput: {
    flex: 1,
    backgroundColor: '#201D3D',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontFamily: 'DMSans',
    fontSize: 13,
  },
  chatSendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#7C5CFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatSendButtonDisabled: {
    opacity: 0.45,
    backgroundColor: 'rgba(124, 92, 252, 0.4)',
  },
  emojiPickerPopup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#201D3D',
    padding: 8,
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  emojiPickerButton: {
    backgroundColor: '#2B274F',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  emojiPickerText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: '#FFFFFF',
  },

  // MODAL OVERLAYS & SHEETS
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 9, 22, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#191736',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalSubtitle: {
    fontFamily: 'DMSans',
    fontSize: 13,
    color: '#9D9AA8',
    marginBottom: 14,
    lineHeight: 18,
  },
  checkinInput: {
    backgroundColor: '#231F44',
    borderRadius: 14,
    padding: 12,
    color: '#FFFFFF',
    fontFamily: 'DMSans',
    fontSize: 13,
    height: 80,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  modalCancelText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#9D9AA8',
  },
  modalSubmitBtn: {
    backgroundColor: '#7C5CFC',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  modalSubmitBtnDisabled: {
    opacity: 0.5,
  },
  modalSubmitText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 13,
    color: '#FFFFFF',
  },

  // SOUND MODAL
  soundModalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#191736',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  soundStationsList: {
    gap: 8,
    marginVertical: 12,
  },
  soundStationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#231F44',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  soundStationCardActive: {
    borderColor: '#7C5CFC',
    backgroundColor: '#2B2456',
  },
  stationInfoLeft: {
    flex: 1,
  },
  stationNameText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  stationGenreText: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#9D9AA8',
    marginTop: 2,
  },
  stationActivePill: {
    backgroundColor: '#7C5CFC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  stationActivePillText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 10,
    color: '#FFFFFF',
  },
  inlineVolumeSliderRow: {
    marginTop: 10,
    marginBottom: 6,
  },
  modalVolumeSection: {
    marginTop: 14,
    gap: 8,
  },
  modalVolumeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  volumeLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: '#9D9AA8',
  },

  // MORE MODAL
  moreModalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#191736',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  moreActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    gap: 12,
  },
  moreActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#231F44',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreActionText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  moreActionSub: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#9D9AA8',
    marginTop: 2,
  },
});
