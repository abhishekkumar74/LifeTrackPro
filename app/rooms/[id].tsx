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
import { Href, router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Music, Pause, Play, Send, Share2, Smile, Volume2, VolumeX, CheckCircle, Award, Sparkles, Target, MessageSquare, LayoutGrid, Plus, Minus, X, Clock } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
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
  View
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

interface MusicStation {
  id: string;
  name: string;
  asset: any;
  genre: string;
  icon: string;
}

const STATIONS: MusicStation[] = [
  { id: 'lofi', name: 'Lofi Beats', asset: require('../../assets/sounds/lofi.mp3'), genre: 'Chill Beats', icon: '🎧' },
  { id: 'rain', name: 'Rainy Cafe', asset: require('../../assets/sounds/rain.mp3'), genre: 'Study Rain', icon: '🌧️' },
  { id: 'cafe', name: 'Quiet Cafe', asset: require('../../assets/sounds/cafe.mp3'), genre: 'Cafe Ambience', icon: '☕' },
  { id: 'ocean', name: 'Ocean Waves', asset: require('../../assets/sounds/ocean.mp3'), genre: 'Relaxing Waves', icon: '🌊' },
  { id: 'brown_noise', name: 'Brown Noise', asset: require('../../assets/sounds/brown_noise.mp3'), genre: 'Focus Noise', icon: '🔊' },
];

// Deterministic colors for member avatars
const MEMBER_COLORS = ['#5B4FE8', '#00B894', '#E8A020', '#E85858', '#8B6FE8', '#0EA5E9'];

function getColorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % MEMBER_COLORS.length;
  return MEMBER_COLORS[index];
}

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 40 - 24) / 4; // 4 columns grid with gaps

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

  // Fetch Host Profile separately
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

  // Room Goal & Progress Check-in State
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [checkinNoteInput, setCheckinNoteInput] = useState('');
  const [roomWeeklyGoalTargetMins, setRoomWeeklyGoalTargetMins] = useState(3000); // 50 Hours
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalHoursInput, setGoalHoursInput] = useState('50');

  // Load custom room target goal from local storage
  useEffect(() => {
    if (!id) return;
    AsyncStorage.getItem(`@room_target_${id}`)
      .then((stored) => {
        if (stored) {
          const h = parseFloat(stored);
          if (!isNaN(h) && h > 0) {
            setRoomWeeklyGoalTargetMins(Math.round(h * 60));
          }
        }
      })
      .catch(() => {});
  }, [id]);

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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'lounge' | 'chat'>('lounge');

  const safeGoBack = useCallback(() => {
    recordRoomStudySession();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/rooms' as Href);
    }
  }, [recordRoomStudySession]);

  const playStation = useCallback(async (station: MusicStation, volume: number) => {
    const loadId = Math.random().toString();
    loadingSoundIdRef.current = loadId;

    try {
      // 1. Release any existing player
      if (soundInstanceRef.current) {
        try {
          soundInstanceRef.current.pause?.();
          soundInstanceRef.current.currentTime = 0;
          soundInstanceRef.current.release?.();
          soundInstanceRef.current.remove?.();
        } catch (e) {}
        soundInstanceRef.current = null;
      }

      // 2. Web / HTML5 Audio fallback
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

      // 3. Native Expo 57 Audio (expo-audio)
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

  // Local State
  const [timerText, setTimerText] = useState('00:00');
  const [messageInput, setMessageInput] = useState('');
  const [activeReactions, setActiveReactions] = useState<FloatingEmojiData[]>([]);
  const reactionChannelRef = useRef<any>(null);

  // Enforce free capacity limits
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
    } catch (e) { }

    if (reactionChannelRef.current) {
      try {
        reactionChannelRef.current.send({
          type: 'broadcast',
          event: 'room_ended',
          payload: {},
        });
      } catch (e) { }
    }

    Alert.alert(
      'Session Finished',
      'This study room group session time limit has been reached. Great job studying together!',
      [{ text: 'OK', onPress: () => safeGoBack() }],
      { cancelable: false }
    );
  }, [id, endRoomMutation, stopMusic, safeGoBack]);

  // Monitor room status for all participants
  useEffect(() => {
    if (room && room.is_active === false) {
      handleRoomExpired();
    }
  }, [room, handleRoomExpired]);

  useEffect(() => {
    if (!id) return;

    const channel = supabase.channel(`room_reactions:${id}`, {
      config: {
        broadcast: { self: true },
      },
    });

    channel
      .on('broadcast', { event: 'reaction' }, ({ payload }) => {
        const randomX = Math.random() * (width - 100) + 30;
        setActiveReactions((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            emoji: payload.emoji,
            randomX,
          },
        ]);
      })
      .on('broadcast', { event: 'cheer' }, ({ payload }) => {
        if (payload.targetUserId === currentUserId) {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (e) { }

          useUiStore.getState().showToast(
            `✨ ${payload.senderName} sent you a ${payload.type === 'cheer' ? 'Cheer' : 'Nudge'}!`,
            'success'
          );

          const randomX = Math.random() * (width - 100) + 30;
          setActiveReactions((prev) => [
            ...prev,
            {
              id: Math.random().toString(),
              emoji: payload.type === 'cheer' ? '✨' : '👋',
              randomX,
            },
          ]);
        }
      })
      .on('broadcast', { event: 'music' }, ({ payload }) => {
        const station = STATIONS.find((s) => s.id === payload.stationId) || STATIONS[0];
        setCurrentStation(station);
        if (payload.isPlaying) {
          playStation(station, musicVolume);
        } else {
          stopMusic();
        }
      })
      .on('broadcast', { event: 'room_ended' }, () => {
        handleRoomExpired();
      })
      .on('broadcast', { event: 'goal_updated' }, ({ payload }) => {
        if (payload?.targetHours && typeof payload.targetHours === 'number') {
          setRoomWeeklyGoalTargetMins(Math.round(payload.targetHours * 60));
        }
      })
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'study_rooms',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          const updatedRoom = payload.new as any;
          if (updatedRoom && updatedRoom.is_active === false) {
            handleRoomExpired();
          }
        }
      )
      .subscribe();

    reactionChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, currentUserId, playStation, stopMusic, musicVolume, handleRoomExpired]);

  const sendCheerOrNudge = (targetUserId: string, type: 'cheer' | 'nudge') => {
    if (reactionChannelRef.current) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (e) { }

      reactionChannelRef.current.send({
        type: 'broadcast',
        event: 'cheer',
        payload: {
          targetUserId,
          senderName: profile?.name || 'A Friend',
          type,
        },
      });

      useUiStore.getState().showToast(
        `Sent ${type === 'cheer' ? 'Cheer' : 'Nudge'}! ✨`,
        'success'
      );
    }
  };

  const sendReaction = (emoji: string) => {
    if (reactionChannelRef.current) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) { }
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
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (e) { }
      const playStoreUrl = Platform.OS === 'ios' ? CONFIG.storeUrls.ios : CONFIG.storeUrls.android;
      const shareMessage = `🔥 Aaja bhai, sath me padhte hain!\n\nMaine LifeTrack Pro par live study session start kiya hai: "${room.name}"\n⏱️ Duration: ${room.timer_minutes} mins\n\n🔑 Room Code: ${shortCode}\n\n📲 Free App Download karo:\n${playStoreUrl}\n\n(App open karke Study Rooms me Room Code enter karo!)`;
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

    const updateTimer = () => {
      const now = Date.now();
      const remainingSecs = Math.max(0, Math.floor((expiresAt - now) / 1000));

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
    updatePresenceStatus({
      isFocusing: true,
    });
  }, [updatePresenceStatus]);

  // Record session on screen unmount
  useEffect(() => {
    return () => {
      recordRoomStudySession();
    };
  }, [recordRoomStudySession]);

  const handleCloseCheckinModal = useCallback(() => {
    Keyboard.dismiss();
    setShowCheckinModal(false);
  }, []);

  // Handle Progress Check-in Submit
  const handleProgressCheckinSubmit = async () => {
    if (!checkinNoteInput.trim()) return;
    const note = checkinNoteInput.trim();

    Keyboard.dismiss();
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    // Update presence
    updatePresenceStatus({
      lastCheckinNote: note,
      checkinTime: new Date().toISOString(),
    });

    // Broadcast check-in message to room chat
    sendMessage(`🎯 [PROGRESS CHECK-IN] ${profile?.name || 'Member'}: ${note}`);

    // Trigger visual celebration reaction
    if (reactionChannelRef.current) {
      reactionChannelRef.current.send({
        type: 'broadcast',
        event: 'reaction',
        payload: { emoji: '✨' },
      });
    }

    setCheckinNoteInput('');
    setShowCheckinModal(false);
  };

  const totalRoomFocusMinutes = useMemo(() => {
    const baseMins = members.length * 45;
    return Math.max(120, baseMins);
  }, [members.length]);

  // Synchronize DB member count from the host's client
  useEffect(() => {
    if (!room || room.host_id !== currentUserId || !room.is_active) return;

    const updateDbCount = async () => {
      try {
        await supabase
          .from('study_rooms')
          .update({ member_count: memberCount })
          .eq('id', room.id);
      } catch (e) {
        if (__DEV__) {
          console.warn('Failed to update DB member count:', e);
        }
      }
    };

    updateDbCount();
  }, [memberCount, room?.id, room?.host_id, room?.is_active, currentUserId]);

  // Listen for real-time room inactivation or deletion
  useEffect(() => {
    if (!id) return;

    const roomSubscription = supabase
      .channel(`room_status_${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'study_rooms',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          const updatedRoom = payload.new as StudyRoom | null;
          if (payload.eventType === 'DELETE' || (updatedRoom && !updatedRoom.is_active)) {
            Alert.alert(
              'Room Ended',
              'This study room has been ended by the host.',
              [{ text: 'OK', onPress: () => safeGoBack() }],
              { cancelable: false }
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomSubscription);
    };
  }, [id, safeGoBack]);

  const handleLeave = () => {
    if (isChatExpanded) {
      Keyboard.dismiss();
      setIsChatExpanded(false);
      return;
    }
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
            onPress: () => {
              safeGoBack();
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } else {
      safeGoBack();
    }
  };

  const handleSend = () => {
    if (!messageInput.trim()) return;
    sendMessage(messageInput);
    setMessageInput('');
  };

  if (isRoomLoading) {
    return (
      <SafeAreaView style={[styles.container, { paddingHorizontal: 16 }]} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" backgroundColor="#17172A" translucent={false} />
        {/* Top bar skeleton */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1E1E38', marginBottom: 20 }}>
          <Skeleton width={70} height={30} borderRadius={8} />
          <Skeleton width={120} height={20} borderRadius={8} />
          <Skeleton width={80} height={24} borderRadius={12} />
        </View>

        {/* Timer skeleton */}
        <View style={{ alignItems: 'center', marginVertical: 24 }}>
          <Skeleton width={160} height={50} borderRadius={12} style={{ marginBottom: 8 }} />
          <Skeleton width={100} height={14} borderRadius={6} />
        </View>

        {/* Members skeleton */}
        <View style={{ marginVertical: 16 }}>
          <Skeleton width={90} height={14} borderRadius={6} style={{ marginBottom: 12 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginVertical: 8 }}>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} width={50} height={50} borderRadius={25} />
            ))}
          </View>
        </View>

        {/* Chat skeleton */}
        <View style={{ flex: 1, justifyContent: 'flex-end', marginBottom: 20 }}>
          <Skeleton width={100} height={14} borderRadius={6} style={{ marginBottom: 12 }} />
          <View style={{ gap: 12 }}>
            <Skeleton width="60%" height={36} borderRadius={8} />
            <Skeleton width="75%" height={36} borderRadius={8} style={{ alignSelf: 'flex-end' }} />
            <Skeleton width="45%" height={36} borderRadius={8} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (roomError || !room || !room.is_active) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#17172A" translucent={false} />
        <Text style={styles.errorText}>
          {!room || room.is_active ? 'Room not found' : 'This study room has ended'}
        </Text>
        <TouchableOpacity style={styles.leaveButton} onPress={handleLeave}>
          <Text style={styles.leaveButtonText}>Leave Room</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Format dynamic joined text
  const formatTimeAgo = (joinedAtStr: string) => {
    const diffMs = Date.now() - new Date(joinedAtStr).getTime();
    const diffMins = Math.max(0, Math.floor(diffMs / 60000));
    if (diffMins === 0) return 'joined now';
    return `joined ${diffMins}m ago`;
  };

  const showChat = true;

  const getChatHeaderLabel = () => {
    switch (room?.room_type) {
      case 'silent':
        return 'QUIET CHEER BOARD 🤫';
      case 'music':
        return 'MUSIC ROOM CHAT 🎵';
      default:
        return 'DISCUSSION CHAT 💬';
    }
  };

  const getChatPlaceholder = () => {
    return 'Type a message...';
  };

  const handleMemberPress = (member: RoomMember) => {
    if (member.userId === currentUserId) return;

    Alert.alert(
      `Support ${member.name} 👋`,
      'Send a quick silent reaction to boost their focus:',
      [
        {
          text: 'Send Cheer ✨',
          onPress: () => sendCheerOrNudge(member.userId, 'cheer'),
        },
        {
          text: 'Nudge to Focus 👋',
          onPress: () => sendCheerOrNudge(member.userId, 'nudge'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#14142B" translucent={false} />
      <View style={{ flex: 1 }}>
        {/* TOP BAR */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backIconButton} onPress={handleLeave} activeOpacity={0.7}>
            <ArrowLeft size={18} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerGroupInfo}>
            <View style={styles.headerGroupAvatar}>
              <Text style={styles.headerGroupEmoji}>
                {room.room_type === 'music' ? '🎧' : room.room_type === 'silent' ? '🤫' : '💬'}
              </Text>
            </View>

            <View style={styles.headerTextCol}>
              <Text style={styles.roomTitle} numberOfLines={1}>
                {room.name}
              </Text>
              <View style={styles.headerSubRow}>
                <View style={styles.subjectInlineBadge}>
                  <Text style={styles.subjectInlineBadgeText} numberOfLines={1}>
                    {room.subject || 'General'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={async () => {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      const clipboard = require('expo-clipboard');
                      if (clipboard?.setStringAsync) {
                        await clipboard.setStringAsync(shortCode);
                      }
                      Alert.alert('Room Code Copied!', `Code: #${shortCode}\nShare this with friends to let them join.`);
                    } catch (e) {}
                  }}
                  activeOpacity={0.7}
                  style={styles.codeBadge}
                >
                  <Text style={styles.codeBadgeText}>#{shortCode}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.headerRightActions}>
            <TouchableOpacity style={styles.shareTopButton} onPress={handleShare} activeOpacity={0.7}>
              <Share2 size={15} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.memberBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.memberBadgeText}>{memberCount} live</Text>
            </View>
          </View>
        </View>

        {/* SEGMENTED TAB SWITCHER */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'lounge' && styles.tabButtonActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setActiveTab('lounge');
            }}
            activeOpacity={0.8}
          >
            <LayoutGrid size={15} color={activeTab === 'lounge' ? '#FFFFFF' : '#9B9BAF'} />
            <Text style={[styles.tabButtonText, activeTab === 'lounge' && styles.tabButtonTextActive]}>
              Room Lounge
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'chat' && styles.tabButtonActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setActiveTab('chat');
            }}
            activeOpacity={0.8}
          >
            <MessageSquare size={15} color={activeTab === 'chat' ? '#FFFFFF' : '#9B9BAF'} />
            <Text style={[styles.tabButtonText, activeTab === 'chat' && styles.tabButtonTextActive]}>
              Chat & Feed
            </Text>
            {messages.length > 0 && (
              <View style={styles.chatBadge}>
                <Text style={styles.chatBadgeText}>{messages.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {activeTab === 'lounge' ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingVertical: 12 }}
            showsVerticalScrollIndicator={false}
          >
            {/* SHARED LIVE ROOM TIMER CARD */}
            <View style={styles.timerCard}>
              <View style={styles.timerTopHeader}>
                <View style={styles.timerTopBadge}>
                  <Sparkles size={11} color="#A78BFA" />
                  <Text style={styles.timerTopBadgeText}>LIVE STUDY ROOM</Text>
                </View>

                <View style={styles.timerStatusBadge}>
                  <View style={[styles.pulseActiveIndicator, styles.pulseActiveIndicatorFocus]} />
                  <Text style={styles.timerStatusText}>
                    {memberCount} Studying Live
                  </Text>
                </View>
              </View>

              <Text style={styles.timerDisplay}>
                {timerText}
              </Text>

              <Text style={styles.timerSubText}>
                Scheduled group study session remaining
              </Text>
            </View>

            {/* MUSIC PLAYER BAR (only for Music Rooms) */}
            {room.room_type === 'music' && (
              <View style={styles.musicBar}>
                <View style={styles.musicRowHeader}>
                  <View style={styles.musicInfo}>
                    <View style={styles.musicIconWrapper}>
                      <Music size={18} color="#5B4FE8" />
                    </View>
                    <View>
                      <Text style={styles.musicStationName}>{currentStation.name}</Text>
                      <Text style={styles.musicStationGenre}>{currentStation.genre}</Text>
                    </View>
                  </View>

                  <View style={styles.musicControls}>
                    {/* Play/Pause */}
                    <TouchableOpacity
                      style={[styles.musicPlayButton, isPlayingMusic && styles.musicPlayButtonActive]}
                      onPress={isHost ? handleHostTogglePlay : handleMemberTogglePlay}
                      activeOpacity={0.8}
                    >
                      {isPlayingMusic ? (
                        <Pause size={14} color="#FFFFFF" fill="#FFFFFF" />
                      ) : (
                        <Play size={14} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 2 }} />
                      )}
                    </TouchableOpacity>

                    {/* Mute/Volume (Cycles 0 -> 0.5 -> 1.0) */}
                    <TouchableOpacity
                      style={styles.musicMuteButton}
                      onPress={() => {
                        const nextVol = musicVolume === 0 ? 0.5 : musicVolume === 0.5 ? 1.0 : 0;
                        changeVolume(nextVol);
                      }}
                      activeOpacity={0.8}
                    >
                      {musicVolume === 0 ? (
                        <VolumeX size={14} color="#E85858" />
                      ) : (
                        <Volume2 size={14} color={musicVolume === 1.0 ? '#00B894' : '#9B9BAF'} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Station selector (only for Host) */}
                {isHost ? (
                  <View style={styles.stationSelectorContainer}>
                    <Text style={styles.hostControlTag}>HOST STATION CONTROL</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.stationSelectorContent}
                      style={styles.stationSelector}
                    >
                      {STATIONS.map((station) => {
                        const active = currentStation.id === station.id;
                        return (
                          <TouchableOpacity
                            key={station.id}
                            style={[styles.stationChip, active && styles.stationChipActive]}
                            onPress={() => handleHostSelectStation(station)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.stationEmoji}>{station.icon}</Text>
                            <Text style={[styles.stationChipText, active && styles.stationChipTextActive]}>
                              {station.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                ) : (
                  <View style={styles.memberMusicTag}>
                    <Text style={styles.memberMusicTagText}>
                      🔊 Synced with host's audio stream. You can pause or adjust volume locally.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* ROOM WEEKLY GOAL CARD */}
            <View style={styles.roomGoalCard}>
              <View style={styles.roomGoalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Award size={14} color="#FFD700" />
                  <Text style={styles.roomGoalTitle}>Room Target: Weekly Focus</Text>
                </View>
                <TouchableOpacity
                  style={styles.roomGoalEditBtn}
                  onPress={() => {
                    setGoalHoursInput(String(Math.round(roomWeeklyGoalTargetMins / 60)));
                    setShowGoalModal(true);
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={styles.roomGoalEditBtnText}>Set Goal</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.roomGoalProgressRow}>
                <View style={styles.roomGoalTrack}>
                  <View
                    style={[
                      styles.roomGoalFill,
                      {
                        width: `${Math.min(100, Math.round((totalRoomFocusMinutes / roomWeeklyGoalTargetMins) * 100))}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.roomGoalProgressText}>
                  {(totalRoomFocusMinutes / 60).toFixed(1)}h / {(roomWeeklyGoalTargetMins / 60).toFixed(0)}h
                </Text>
              </View>
            </View>

            {/* STUDENTS STUDYING GRID */}
            <View style={styles.membersSection}>
              <View style={styles.membersHeaderRow}>
                <Text style={styles.sectionLabel}>STUDENTS STUDYING</Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-start' }}>
                {members.map((member) => (
                  <MemberBubble
                    key={member.userId}
                    member={member}
                    formatTimeAgo={formatTimeAgo}
                    onPress={handleMemberPress}
                  />
                ))}
              </View>
            </View>

            {/* CHAT PREVIEW CARD */}
            <View style={styles.chatPreviewCard}>
              <View style={styles.chatPreviewHeader}>
                <Text style={styles.chatPreviewTitle}>{getChatHeaderLabel()}</Text>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    setActiveTab('chat');
                  }}
                >
                  <Text style={styles.chatPreviewOpenText}>Open Live Chat ({messages.length}) →</Text>
                </TouchableOpacity>
              </View>
              {messages.length > 0 ? (
                <Text style={styles.chatPreviewMsgText} numberOfLines={2}>
                  💬 <Text style={{ fontWeight: 'bold' }}>{messages[messages.length - 1].userName}:</Text>{' '}
                  {messages[messages.length - 1].text}
                </Text>
              ) : (
                <Text style={[styles.chatPreviewMsgText, { color: '#9B9BAF' }]}>
                  No messages yet. Be the first to say hi! 👋
                </Text>
              )}
              <TouchableOpacity
                style={styles.checkinButton}
                onPress={() => setShowCheckinModal(true)}
                activeOpacity={0.8}
              >
                <CheckCircle size={15} color="#00B894" />
                <Text style={styles.checkinButtonText}>Post Progress Check-in ✨</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          /* CHAT TAB VIEW */
          <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: '#0C0C1A' }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 95 : 0}
          >
            {/* STICKY MINI HEADER */}
            <View style={styles.stickyMiniBar}>
              <View style={styles.stickyMiniItem}>
                <Sparkles size={14} color="#A29BFE" />
                <Text style={styles.stickyMiniTimerText}>
                  {timerText}
                </Text>
              </View>

              {room.room_type === 'music' && (
                <TouchableOpacity
                  style={styles.stickyMiniItem}
                  onPress={isHost ? handleHostTogglePlay : handleMemberTogglePlay}
                  activeOpacity={0.7}
                >
                  <Music size={13} color="#00B894" />
                  <Text style={styles.stickyMiniMusicText} numberOfLines={1}>
                    {isPlayingMusic ? `Playing: ${currentStation.name}` : `Paused: ${currentStation.name}`}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.checkinButtonMini}
                onPress={() => setShowCheckinModal(true)}
                activeOpacity={0.8}
              >
                <CheckCircle size={13} color="#00B894" />
                <Text style={styles.checkinButtonMiniText}>Check-in ✨</Text>
              </TouchableOpacity>
            </View>

            {/* CHAT MESSAGES FLATLIST */}
            <FlatList
              data={[...messages].reverse()}
              keyExtractor={(item, index) => `${item.id}_${index}`}
              inverted
              removeClippedSubviews={Platform.OS === 'android'}
              renderItem={({ item }) => <MessageRow message={item} />}
              contentContainerStyle={styles.chatListContent}
              style={{ flex: 1 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            />

            {/* EMOJI PICKER POPUP */}
            {showEmojiPicker && (
              <View style={styles.emojiPickerPopup}>
                {['👍', '🔥', '👏', '🎯', '🚀', '💡'].map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={styles.emojiPickerButton}
                    onPress={() => {
                      sendReaction(emoji);
                      setShowEmojiPicker(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.emojiPickerText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* CHAT INPUT ROW */}
            <View style={styles.inputRow}>
              <TouchableOpacity
                style={styles.emojiTriggerButton}
                onPress={() => setShowEmojiPicker((prev) => !prev)}
                activeOpacity={0.8}
              >
                <Smile size={20} color={showEmojiPicker ? '#5B4FE8' : '#9B9BAF'} />
              </TouchableOpacity>

              <TextInput
                style={styles.chatInput}
                placeholder={getChatPlaceholder()}
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={messageInput}
                onChangeText={setMessageInput}
                maxLength={200}
                returnKeyType="send"
                onSubmitEditing={handleSend}
                blurOnSubmit={false}
              />
              <TouchableOpacity style={styles.sendButton} onPress={handleSend} activeOpacity={0.8}>
                <Send size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}
      </View>

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

      {/* PROGRESS CHECK-IN MODAL */}
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
                  <CheckCircle size={18} color="#00B894" />
                  <Text style={styles.modalTitle}>Progress Check-in</Text>
                </View>
                <TouchableOpacity
                  onPress={handleCloseCheckinModal}
                  style={styles.modalCloseBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={{ color: '#9B9BAF', fontWeight: 'bold' }}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>
                Share a quick progress update with your study room members:
              </Text>

              <TextInput
                style={styles.checkinInput}
                placeholder="e.g., Finished 2 chapters, solved 10 practice questions..."
                placeholderTextColor="#9B9BAF"
                value={checkinNoteInput}
                onChangeText={setCheckinNoteInput}
                multiline
                maxLength={150}
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
                  <Text style={styles.modalSubmitText}>Post Check-in ✨</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* ROOM WEEKLY GOAL MODAL */}
      <Modal
        visible={showGoalModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGoalModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={styles.goalModalOverlay}
            activeOpacity={1}
            onPress={() => setShowGoalModal(false)}
          >
            <TouchableOpacity
              style={styles.goalModalContainer}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.goalModalHeader}>
                <View style={styles.goalModalHeaderLeft}>
                  <Award size={20} color="#FFD700" />
                  <Text style={styles.goalModalTitle}>Set Weekly Room Target</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowGoalModal(false)}
                  style={styles.goalModalCloseBtn}
                  activeOpacity={0.7}
                >
                  <X size={18} color="#9B9BAF" />
                </TouchableOpacity>
              </View>

              <Text style={styles.goalModalDesc}>
                Set the collective focus goal in hours for everyone in this study room.
              </Text>

              {/* Quick Preset Chips */}
              <View style={styles.goalPresetRow}>
                {[20, 35, 50, 75, 100].map((hours) => {
                  const isSelected = parseFloat(goalHoursInput) === hours;
                  return (
                    <TouchableOpacity
                      key={hours}
                      style={[styles.goalPresetChip, isSelected && styles.goalPresetChipActive]}
                      onPress={() => {
                        Haptics.selectionAsync().catch(() => {});
                        setGoalHoursInput(String(hours));
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.goalPresetChipText, isSelected && styles.goalPresetChipTextActive]}>
                        {hours}h
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Stepper Input Row */}
              <View style={styles.goalInputRow}>
                <TouchableOpacity
                  style={styles.goalStepperBtn}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    const curr = parseFloat(goalHoursInput) || 50;
                    const next = Math.max(5, curr - 5);
                    setGoalHoursInput(String(next));
                  }}
                  activeOpacity={0.7}
                >
                  <Minus size={18} color="#FFFFFF" />
                </TouchableOpacity>

                <View style={styles.goalValueBox}>
                  <TextInput
                    style={styles.goalTextInput}
                    value={goalHoursInput}
                    onChangeText={setGoalHoursInput}
                    keyboardType="number-pad"
                    maxLength={4}
                    selectTextOnFocus
                  />
                  <Text style={styles.goalUnitText}>hours / week</Text>
                </View>

                <TouchableOpacity
                  style={styles.goalStepperBtn}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    const curr = parseFloat(goalHoursInput) || 50;
                    const next = Math.min(500, curr + 5);
                    setGoalHoursInput(String(next));
                  }}
                  activeOpacity={0.7}
                >
                  <Plus size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.goalProgressSummary}>
                <Text style={styles.goalProgressSummaryText}>
                  Current Progress: <Text style={{ color: '#00B894', fontWeight: 'bold' }}>{(totalRoomFocusMinutes / 60).toFixed(1)}h</Text> logged
                </Text>
              </View>

              {/* Save Target Button */}
              <TouchableOpacity
                style={styles.goalSaveBtn}
                onPress={() => {
                  const hours = parseFloat(goalHoursInput);
                  if (!isNaN(hours) && hours > 0) {
                    const mins = Math.round(hours * 60);
                    setRoomWeeklyGoalTargetMins(mins);
                    if (id) {
                      AsyncStorage.setItem(`@room_target_${id}`, String(hours)).catch(() => {});
                    }
                    if (reactionChannelRef.current) {
                      try {
                        reactionChannelRef.current.send({
                          type: 'broadcast',
                          event: 'goal_updated',
                          payload: { targetHours: hours },
                        });
                      } catch (e) {}
                    }
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                    setShowGoalModal(false);
                  } else {
                    Alert.alert('Invalid Target', 'Please enter a valid target in hours.');
                  }
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.goalSaveBtnText}>Save Target</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// Helper components for local renders to avoid unnecessary re-renders
const MemberBubble = React.memo<{
  member: RoomMember;
  formatTimeAgo: (t: string) => string;
  onPress: (member: RoomMember) => void;
}>(({
  member,
  formatTimeAgo,
  onPress,
}) => {
  const borderOpacity = useSharedValue(1);

  useEffect(() => {
    borderOpacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 750 }),
        withTiming(1, { duration: 750 })
      ),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    borderColor: member.isFocusing ? '#E85858' : '#00B894',
    borderWidth: 2,
    opacity: borderOpacity.value,
  }));

  const GRADIENT_PAIRS = [
    { start: '#6C5CE7', end: '#A29BFE' },
    { start: '#FF7675', end: '#FD79A8' },
    { start: '#00B894', end: '#55EFC4' },
    { start: '#E17055', end: '#FDCB6E' },
    { start: '#0984E3', end: '#74B9FF' },
    { start: '#6C5CE7', end: '#E84393' },
  ];
  const charCodeSum = (member.userId || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const gradPair = GRADIENT_PAIRS[charCodeSum % GRADIENT_PAIRS.length];

  return (
    <View style={styles.memberBubbleContainer}>
      <TouchableOpacity
        onPress={() => onPress(member)}
        activeOpacity={0.8}
      >
        <Animated.View style={[styles.avatarCircle, pulseStyle]}>
          {member.avatarUrl ? (
            <Image source={{ uri: member.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
              <Defs>
                <LinearGradient id={`grad-${member.userId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor={gradPair.start} />
                  <Stop offset="100%" stopColor={gradPair.end} />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill={`url(#grad-${member.userId})`} rx={26} ry={26} />
            </Svg>
          )}
          {!member.avatarUrl && <Text style={styles.avatarInitials}>{member.initials}</Text>}

          {member.isFocusing && (
            <View style={styles.liveFocusBadge}>
              <Text style={styles.liveFocusBadgeText}>
                {member.focusTimeLeft && member.focusTimeLeft > 0
                  ? `${Math.ceil(member.focusTimeLeft / 60)}m`
                  : '🔥'}
              </Text>
            </View>
          )}
        </Animated.View>
      </TouchableOpacity>

      <Text style={styles.memberName} numberOfLines={1}>
        {member.name}
      </Text>
      {member.lastCheckinNote ? (
        <Text style={styles.memberCheckinNote} numberOfLines={1}>
          🎯 {member.lastCheckinNote}
        </Text>
      ) : (
        <Text style={styles.memberJoinedTime}>
          {formatTimeAgo(member.joinedAt)}
        </Text>
      )}
    </View>
  );
});

const MessageRow = React.memo<{ message: ChatMessage }>(({ message }) => {
  const { profile } = useAuthStore();
  const isMe = profile?.id === message.userId;
  const avatarColor = getColorForUser(message.userId);

  const formatMessageTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch (e) {
      return '';
    }
  };

  return (
    <View style={[styles.messageRow, isMe && styles.messageRowOwn]}>
      {!isMe && (
        <View style={[styles.msgAvatar, { backgroundColor: avatarColor }]}>
          {message.userAvatar ? (
            <Image
              source={{ uri: message.userAvatar }}
              style={styles.msgAvatarImage}
            />
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
            {formatMessageTime(message.sentAt)}
          </Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0C1A',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0C0C1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF6B6B',
    fontFamily: 'DMSans-Medium',
    fontSize: 15,
    marginBottom: 20,
  },
  leaveButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  leaveButtonText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: '#14142B',
  },
  backIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerGroupInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    gap: 8,
    overflow: 'hidden',
  },
  headerGroupAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(108, 92, 231, 0.25)',
    borderWidth: 1.5,
    borderColor: '#7D6BFB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
    flexShrink: 0,
  },
  headerGroupEmoji: {
    fontSize: 18,
  },
  headerTextCol: {
    flex: 1,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  roomTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
    overflow: 'hidden',
  },
  headerSubText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  headerSubDot: {
    fontFamily: 'DMSans-Bold',
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.35)',
  },
  subjectInlineBadge: {
    backgroundColor: 'rgba(108, 92, 231, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(125, 107, 251, 0.4)',
    maxWidth: 95,
  },
  subjectInlineBadgeText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 9.5,
    color: '#B8ADFF',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: 'bold',
  },
  codeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  codeBadgeText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 9.5,
    color: '#FFFFFF',
    letterSpacing: 0.8,
    fontWeight: 'bold',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  shareTopButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(46, 213, 115, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(46, 213, 115, 0.35)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#2ED573',
    shadowColor: '#2ED573',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
    elevation: 2,
  },
  memberBadgeText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 11,
    fontWeight: 'bold',
    color: '#2ED573',
  },
  timerCard: {
    backgroundColor: '#16142A',
    borderRadius: 22,
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(124, 58, 237, 0.28)',
    shadowColor: '#5B4FE8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 4,
  },
  timerTopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
  },
  timerTopBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(108, 92, 231, 0.16)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.3)',
  },
  timerTopBadgeText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 10,
    fontWeight: '700',
    color: '#C4B5FD',
    letterSpacing: 0.6,
  },
  timerStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timerStatusText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    color: '#D1D5DB',
    fontWeight: '600',
  },
  timerDisplay: {
    fontFamily: 'DMMono',
    fontSize: 52,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 1,
    marginVertical: 2,
  },
  timerSubText: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#9E9EB8',
    marginTop: 2,
    marginBottom: 4,
    textAlign: 'center',
  },
  presetPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    width: '100%',
    justifyContent: 'center',
  },
  presetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  presetPillActive: {
    backgroundColor: 'rgba(91, 79, 232, 0.28)',
    borderColor: '#7C3AED',
  },
  presetPillText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: '#9B9BAF',
    fontWeight: '600',
  },
  presetPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  focusBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pulseActiveIndicatorFocus: {
    backgroundColor: '#00B894',
  },
  timerLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 4,
    backgroundColor: 'rgba(108, 92, 231, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.25)',
  },
  pulseActiveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#A29BFE',
  },
  timerSub: {
    fontFamily: 'DMSans-Bold',
    fontSize: 10.5,
    color: '#D6CEFF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  membersSection: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  membersHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionLabel: {
    fontFamily: 'DMSans-Bold',
    fontSize: 11,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 1,
  },
  interactionSubtitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    color: '#FFD166',
    backgroundColor: 'rgba(255, 209, 102, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  membersGridContent: {
    paddingBottom: 4,
  },
  membersGridRow: {
    gap: 8,
    justifyContent: 'flex-start',
    marginBottom: 10,
  },
  memberBubbleContainer: {
    width: COLUMN_WIDTH,
    alignItems: 'center',
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  avatarImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  avatarInitials: {
    fontFamily: 'DMSans-Bold',
    fontSize: 19,
    fontWeight: 'bold',
    color: '#FFFFFF',
    zIndex: 1,
  },
  memberName: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    color: '#F5F5FA',
    marginTop: 6,
    textAlign: 'center',
    width: '100%',
  },
  memberJoinedTime: {
    fontFamily: 'DMSans',
    fontSize: 9.5,
    color: 'rgba(255, 255, 255, 0.45)',
    marginTop: 2,
    textAlign: 'center',
  },
  chatSection: {
    flex: 1,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 10,
  },
  chatSectionExpanded: {
    flex: 1,
    paddingTop: 4,
    backgroundColor: '#0C0C1A',
  },
  chatHeader: {
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  chatHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expandChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(108,92,231,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(108,92,231,0.35)',
  },
  expandChatButtonText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 11,
    color: '#A29BFE',
    fontWeight: '700',
  },
  expandedChatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#14142B',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  expandedTitleCol: {
    flex: 1,
    paddingRight: 10,
  },
  expandedRoomTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  expandedRoomSub: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#A0A0B8',
    marginTop: 2,
  },
  minimizeChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  minimizeChatButtonText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  chatDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 8,
  },
  chatListContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    alignSelf: 'flex-start',
    maxWidth: '84%',
  },
  messageRowOwn: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  msgAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  msgAvatarImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  msgAvatarText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  messageBubbleColumn: {
    gap: 4,
  },
  messageBubbleColumnOwn: {
    alignItems: 'flex-end',
  },
  messageSenderName: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.55)',
    marginLeft: 4,
  },
  messageBubble: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 70,
  },
  messageBubbleOwn: {
    backgroundColor: '#6C5CE7',
    borderBottomRightRadius: 4,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  messageBubbleOther: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontFamily: 'DMSans',
    fontSize: 14,
    lineHeight: 20,
    color: '#FFFFFF',
  },
  messageTimeText: {
    fontSize: 9.5,
    fontFamily: 'DMMono',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  messageTimeTextOwn: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  messageTimeTextOther: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  inputRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 14 : 10,
    backgroundColor: '#14142B',
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 10,
    alignItems: 'center',
  },
  chatInput: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 0,
    color: '#FFFFFF',
    fontFamily: 'DMSans',
    fontSize: 14,
    textAlignVertical: 'center',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  bottomContainer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#0C0C1A',
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  bottomContainerNoChat: {
    marginTop: 'auto',
  },
  focusButton: {
    width: '100%',
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#5B4FE8',
    shadowColor: '#5B4FE8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  stopFocusButton: {
    backgroundColor: '#E85858',
    shadowColor: '#E85858',
  },
  focusButtonText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Bold',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  goalModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  goalModalContainer: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#1E1A29',
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 8,
  },
  goalModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  goalModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goalModalTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  goalModalCloseBtn: {
    padding: 4,
  },
  goalModalDesc: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#9E9EB8',
    marginBottom: 16,
    lineHeight: 17,
  },
  goalPresetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  goalPresetChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  goalPresetChipActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderColor: '#FFD700',
  },
  goalPresetChipText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 12,
    color: '#9B9BAF',
    fontWeight: '600',
  },
  goalPresetChipTextActive: {
    color: '#FFD700',
    fontWeight: '700',
  },
  goalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#141221',
    borderRadius: 14,
    padding: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  goalStepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalValueBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalTextInput: {
    fontFamily: 'DMMono',
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    padding: 0,
    minWidth: 70,
  },
  goalUnitText: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#9E9EB8',
    marginTop: 2,
  },
  goalProgressSummary: {
    backgroundColor: 'rgba(0, 184, 148, 0.12)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 184, 148, 0.25)',
  },
  goalProgressSummaryText: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#D1D5DB',
  },
  goalSaveBtn: {
    backgroundColor: '#FFD700',
    borderRadius: 14,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  goalSaveBtnText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 15,
    fontWeight: '700',
    color: '#16142A',
  },
  reactionsContainer: {
    display: 'none',
  },
  emojiPickerPopup: {
    position: 'absolute',
    bottom: 60,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#1B1B36',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
    zIndex: 10,
  },
  emojiPickerButton: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiPickerText: {
    fontSize: 24,
  },
  emojiTriggerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  musicBar: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 20,
    marginHorizontal: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 10,
  },
  musicRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  musicInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  musicIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(108, 92, 231, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  musicStationName: {
    fontFamily: 'DMSans-Bold',
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  musicStationGenre: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.45)',
    marginTop: 1,
  },
  musicControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  musicPlayButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  musicPlayButtonActive: {
    backgroundColor: '#4834D4',
  },
  musicMuteButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stationSelectorContainer: {
    marginTop: 10,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 8,
  },
  hostControlTag: {
    fontFamily: 'DMSans-Bold',
    fontSize: 9,
    fontWeight: 'bold',
    color: '#FFD166',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  stationSelector: {
    flexGrow: 0,
  },
  stationSelectorContent: {
    gap: 8,
    paddingRight: 10,
  },
  stationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  stationChipActive: {
    backgroundColor: 'rgba(108, 92, 231, 0.22)',
    borderColor: '#6C5CE7',
  },
  stationEmoji: {
    fontSize: 13,
  },
  stationChipText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  stationChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  memberMusicTag: {
    marginTop: 8,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 8,
  },
  memberMusicTagText: {
    fontFamily: 'DMSans',
    fontSize: 10.5,
    color: 'rgba(255, 255, 255, 0.4)',
    lineHeight: 15,
  },
  roomGoalCard: {
    backgroundColor: '#1E1E38',
    borderRadius: 14,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A4A',
  },
  roomGoalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  roomGoalTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  roomGoalEditBtn: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roomGoalEditBtnText: {
    fontFamily: 'DMMono',
    fontSize: 10,
    color: '#FFD700',
    fontWeight: '700',
  },
  roomGoalProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roomGoalTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#14142B',
    borderRadius: 3,
    overflow: 'hidden',
  },
  roomGoalFill: {
    height: '100%',
    backgroundColor: '#00B894',
    borderRadius: 3,
  },
  roomGoalProgressText: {
    fontFamily: 'DMMono',
    fontSize: 11,
    color: '#00B894',
    fontWeight: '700',
  },
  bottomActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  checkinButton: {
    backgroundColor: '#1E1E38',
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#00B894',
  },
  checkinButtonText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: '#00B894',
    fontWeight: '600',
  },
  liveFocusBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#E85858',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderWidth: 1.5,
    borderColor: '#0C0C1A',
  },
  liveFocusBadgeText: {
    fontFamily: 'DMMono',
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  memberCheckinNote: {
    fontFamily: 'DMSans',
    fontSize: 9,
    color: '#00B894',
    textAlign: 'center',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(12, 12, 26, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E1E38',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2A2A4A',
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
    fontWeight: '700',
  },
  modalCloseBtn: {
    padding: 6,
    backgroundColor: '#14142B',
    borderRadius: 12,
  },
  modalSubtitle: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#9B9BAF',
    marginBottom: 14,
  },
  checkinInput: {
    backgroundColor: '#14142B',
    borderRadius: 12,
    padding: 12,
    fontFamily: 'DMSans',
    fontSize: 13,
    color: '#FFFFFF',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A2A4A',
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#14142B',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontFamily: 'DMSans',
    fontSize: 13,
    color: '#9B9BAF',
  },
  modalSubmitBtn: {
    flex: 2,
    height: 44,
    backgroundColor: '#00B894',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitBtnDisabled: {
    backgroundColor: '#2A2A4A',
  },
  modalSubmitText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#14142B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  tabButtonActive: {
    backgroundColor: 'rgba(108, 92, 231, 0.25)',
    borderColor: '#6C5CE7',
  },
  tabButtonText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Bold',
  },
  chatBadge: {
    backgroundColor: '#6C5CE7',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 2,
  },
  chatBadgeText: {
    fontFamily: 'DMMono',
    fontSize: 9.5,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  stickyMiniBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#14142B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  stickyMiniItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stickyMiniTimerText: {
    fontFamily: 'DMMono',
    fontSize: 13,
    fontWeight: 'bold',
    color: '#F0E6FF',
  },
  stickyMiniMusicText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    color: '#00B894',
    maxWidth: 130,
  },
  checkinButtonMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 184, 148, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 184, 148, 0.3)',
  },
  checkinButtonMiniText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    color: '#00B894',
    fontWeight: '600',
  },
  chatPreviewCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 8,
  },
  chatPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatPreviewTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  chatPreviewOpenText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 11,
    color: '#A29BFE',
  },
  chatPreviewMsgText: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#E0E0F0',
  },
});
