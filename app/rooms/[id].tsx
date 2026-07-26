import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  StatusBar,
  Alert,
  Share,
  Image,
  ScrollView,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Href } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { StudyRoom } from '@/types/app.types';
import { useRoomPresence, useRoomChat, useEndRoom, RoomMember, ChatMessage } from '@/lib/hooks/use-study-rooms';
import { useAuthStore } from '@/lib/store/auth.store';
import { useUiStore } from '@/lib/store/ui.store';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useAndroidBackHandler } from '@/lib/hooks/use-android-back';
import { Skeleton } from '@/components/shared/Skeleton';
import { Share2, ArrowLeft, Headphones, Play, Pause, Volume2, VolumeX, Send, Music, Smile, Maximize2, Minimize2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';

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
  const { id } = useLocalSearchParams<{ id: string }>();
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
  const { members, memberCount } = useRoomPresence(id || '');
  const { messages, sendMessage } = useRoomChat(id || '');
  const endRoomMutation = useEndRoom();
  const hasExpiredRef = useRef(false);

  // Music State
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [currentStation, setCurrentStation] = useState<MusicStation>(STATIONS[0]);
  const soundInstanceRef = useRef<Audio.Sound | null>(null);
  const loadingSoundIdRef = useRef<string | null>(null);
  const [musicVolume, setMusicVolume] = useState(0.5);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isChatExpanded, setIsChatExpanded] = useState(false);

  const safeGoBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/rooms' as Href);
    }
  }, []);

  const playStation = useCallback(async (station: MusicStation, volume: number) => {
    const loadId = Math.random().toString();
    loadingSoundIdRef.current = loadId;

    try {
      // 1. Unload any existing fully loaded sound
      if (soundInstanceRef.current) {
        try {
          await soundInstanceRef.current.stopAsync();
          await soundInstanceRef.current.unloadAsync();
        } catch (e) {}
        soundInstanceRef.current = null;
      }

      await Audio.setAudioModeAsync({
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // 2. Load the sound asset asynchronously
      const { sound } = await Audio.Sound.createAsync(
        station.asset,
        {
          shouldPlay: true,
          isLooping: true,
          volume: volume,
        }
      );

      // 3. Check if a newer play request has been initiated while we were loading
      if (loadingSoundIdRef.current !== loadId) {
        // Newer sound is loading, discard this one to prevent parallel playback leaks!
        try {
          await sound.stopAsync();
          await sound.unloadAsync();
        } catch (e) {}
        return;
      }

      soundInstanceRef.current = sound;
      setIsPlayingMusic(true);
    } catch (err) {
      if (__DEV__) console.warn('Failed to play station stream:', err);
      // Only reset state if this is still the active request
      if (loadingSoundIdRef.current === loadId) {
        setIsPlayingMusic(false);
      }
    }
  }, []);

  const stopMusic = useCallback(async () => {
    loadingSoundIdRef.current = null; // cancel any pending loads
    try {
      if (soundInstanceRef.current) {
        await soundInstanceRef.current.stopAsync();
        await soundInstanceRef.current.unloadAsync();
        soundInstanceRef.current = null;
      }
    } catch (e) {}
    setIsPlayingMusic(false);
  }, []);

  const changeVolume = useCallback(async (vol: number) => {
    setMusicVolume(vol);
    try {
      if (soundInstanceRef.current) {
        await soundInstanceRef.current.setVolumeAsync(vol);
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
        soundInstanceRef.current.stopAsync().catch(() => {});
        soundInstanceRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  // Local State
  const [userJoinedTime] = useState<number>(Date.now());
  const [timerText, setTimerText] = useState('00:00');
  const [messageInput, setMessageInput] = useState('');
  const [activeReactions, setActiveReactions] = useState<FloatingEmojiData[]>([]);
  const reactionChannelRef = useRef<any>(null);

  // Local Focus Timer State inside Room
  const [focusActive, setFocusActive] = useState(false);
  const [focusTimeLeft, setFocusTimeLeft] = useState(0);
  const [focusDuration, setFocusDuration] = useState(0);
  const [focusStartedAt, setFocusStartedAt] = useState('');

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
          } catch (e) {}
          
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
      .subscribe();

    reactionChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, currentUserId, playStation, stopMusic, musicVolume]);

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
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (e) {}
      const roomUrl = `lifetrackpro://rooms/${id}`;
      await Share.share({
        message: `Join my live study session "${room.name}" on LifeTrack Pro! Click here to join: ${roomUrl}`,
        url: roomUrl,
      });
    } catch (error) {
      if (__DEV__) console.warn('Share error:', error);
    }
  };

  const handleRoomExpired = useCallback(async () => {
    if (hasExpiredRef.current) return;
    hasExpiredRef.current = true;

    try {
      if (isHost) {
        await endRoomMutation.mutateAsync(id || '');
      }
    } catch (e) {}

    Alert.alert(
      'Session Finished ⏱',
      'This study room group session time limit has been reached.',
      [{ text: 'OK', onPress: () => safeGoBack() }],
      { cancelable: false }
    );
  }, [id, isHost, endRoomMutation, safeGoBack]);

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

  const formatFocusTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleFocusComplete = async (durationSecs: number, startedAt: string) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      
      const endedAt = new Date().toISOString();
      const durationMin = Math.max(1, Math.round(durationSecs / 60));

      // 1. Insert focus session to Supabase
      const { error } = await supabase.from('focus_sessions').insert({
        user_id: currentUserId,
        session_goal: `Study Room: ${room?.name || 'Group Focus'}`,
        duration_min: durationMin,
        subject: room?.subject || null,
        sound_used: null,
        mood: null,
        started_at: startedAt,
        ended_at: endedAt,
        status: 'completed',
      });

      if (error) throw error;

      // 2. Award seeds to user profile
      const currentSeeds = profile?.focus_seeds || 0;
      await supabase
        .from('profiles')
        .update({ focus_seeds: currentSeeds + 5 })
        .eq('id', currentUserId);

      Alert.alert(
        'Congratulations! 🎉',
        `You focused for ${durationMin}m in the study room! You earned 5 Focus Seeds. ✨`,
        [{ text: 'Great!' }]
      );
    } catch (e) {
      if (__DEV__) console.warn('Failed to save in-room focus session:', e);
    }
  };

  useEffect(() => {
    if (!focusActive) return;

    const interval = setInterval(() => {
      setFocusTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setFocusActive(false);
          handleFocusComplete(focusDuration, focusStartedAt);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [focusActive, focusDuration, focusStartedAt]);

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

  const handleStartFocus = () => {
    if (focusActive) {
      Alert.alert(
        'Stop Focus Session?',
        'Do you want to stop this focus session? Progress won\'t be logged.',
        [
          {
            text: 'Stop',
            style: 'destructive',
            onPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
              setFocusActive(false);
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } else {
      Alert.alert(
        'Start Focus Session ⏱',
        'Select focus duration:',
        [
          {
            text: '25 Minutes',
            onPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
              setFocusTimeLeft(25 * 60);
              setFocusDuration(25 * 60);
              setFocusStartedAt(new Date().toISOString());
              setFocusActive(true);
            },
          },
          {
            text: '50 Minutes',
            onPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
              setFocusTimeLeft(50 * 60);
              setFocusDuration(50 * 60);
              setFocusStartedAt(new Date().toISOString());
              setFocusActive(true);
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
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
    switch (room?.room_type) {
      case 'silent':
        return 'Leave a quiet cheer or study update...';
      case 'music':
        return 'Share music vibes or cheer updates...';
      default:
        return 'Message...';
    }
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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#17172A" translucent={false} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* TOP BAR */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backIconButton} onPress={handleLeave} activeOpacity={0.7}>
            <ArrowLeft size={20} color="#9B9BAF" />
          </TouchableOpacity>

          <View style={styles.titleContainer}>
            <Text style={styles.roomTitle} numberOfLines={1}>
              {room.name}
            </Text>
            <View style={styles.subjectBadge}>
              <Text style={styles.subjectBadgeText}>
                {room.subject || 'General Focus'}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity style={styles.shareTopButton} onPress={handleShare} activeOpacity={0.7}>
              <Share2 size={16} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.memberBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.memberBadgeText}>{memberCount} online</Text>
            </View>
          </View>
        </View>

        {!isChatExpanded ? (
          <>
            {/* SHARED TIMER */}
            <View style={styles.timerCard}>
              <Text style={styles.timerDisplay}>
                {focusActive ? formatFocusTime(focusTimeLeft) : timerText}
              </Text>
              <View style={styles.timerLabelRow}>
                <View style={styles.pulseActiveIndicator} />
                <Text style={styles.timerSub}>
                  {focusActive ? 'Personal Focus Session' : 'Group Session Timer'}
                </Text>
              </View>
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

            {/* MEMBERS GRID */}
            <View style={styles.membersSection}>
              <View style={styles.membersHeaderRow}>
                <Text style={styles.sectionLabel}>STUDENTS STUDYING</Text>
                <Text style={styles.interactionSubtitle}>Tap avatar to Cheer or Nudge ✨</Text>
              </View>
              <FlatList
                data={members}
                keyExtractor={(item) => item.userId}
                numColumns={4}
                columnWrapperStyle={styles.membersGridRow}
                removeClippedSubviews={Platform.OS === 'android'}
                renderItem={({ item }) => (
                  <MemberBubble member={item} formatTimeAgo={formatTimeAgo} onPress={handleMemberPress} />
                )}
                contentContainerStyle={styles.membersGridContent}
                style={{ flexGrow: 0 }}
                scrollEnabled={members.length > 8}
              />
            </View>
          </>
        ) : null}

        {/* CHAT SECTION */}
        {showChat ? (
          <View style={[styles.chatSection, isChatExpanded && styles.chatSectionExpanded]}>
            <View style={styles.chatHeader}>
              <View style={styles.chatDivider} />
              <Text style={styles.sectionLabel}>{getChatHeaderLabel()}</Text>
            </View>

            <FlatList
              data={[...messages].reverse()}
              keyExtractor={(item, index) => `${item.id}_${index}`}
              inverted
              removeClippedSubviews={Platform.OS === 'android'}
              onScrollBeginDrag={() => {
                if (isChatExpanded) {
                  Keyboard.dismiss();
                  setIsChatExpanded(false);
                }
              }}
              renderItem={({ item }) => (
                <MessageRow message={item} />
              )}
              contentContainerStyle={styles.chatListContent}
              style={{ flex: 1 }}
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
                onFocus={() => {
                  setIsChatExpanded(true);
                }}
              />
              <TouchableOpacity style={styles.sendButton} onPress={handleSend} activeOpacity={0.8}>
                <Send size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        {/* START FOCUS BUTTON (Only in normal view) */}
        {!isChatExpanded && (
          <View style={[styles.bottomContainer, !showChat && styles.bottomContainerNoChat]}>
            <TouchableOpacity
              style={[styles.focusButton, focusActive && styles.stopFocusButton]}
              onPress={handleStartFocus}
              activeOpacity={0.8}
            >
              <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                <Defs>
                  <LinearGradient id="btnGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <Stop offset="0%" stopColor={focusActive ? '#FF5E7E' : '#5B4FE8'} />
                    <Stop offset="100%" stopColor={focusActive ? '#E85858' : '#8B6FE8'} />
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height="100%" rx={12} fill="url(#btnGrad)" />
              </Svg>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {focusActive ? (
                  <Pause size={16} color="#FFFFFF" fill="#FFFFFF" />
                ) : (
                  <Play size={16} color="#FFFFFF" fill="#FFFFFF" />
                )}
                <Text style={styles.focusButtonText}>
                  {focusActive ? 'Stop Focus Session' : 'Start My Focus Session'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

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
    borderColor: '#00B894',
    borderWidth: 2,
    opacity: borderOpacity.value,
  }));

  const avatarColor = getColorForUser(member.userId);

  return (
    <View style={styles.memberBubbleContainer}>
      <TouchableOpacity
        onPress={() => onPress(member)}
        activeOpacity={0.8}
      >
        <Animated.View style={[styles.avatarCircle, pulseStyle]}>
          <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id={`grad-${member.userId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={avatarColor} />
                <Stop offset="100%" stopColor={`${avatarColor}CC`} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill={`url(#grad-${member.userId})`} rx={26} ry={26} />
          </Svg>
          <Text style={styles.avatarInitials}>{member.initials}</Text>
        </Animated.View>
      </TouchableOpacity>

      <Text style={styles.memberName} numberOfLines={1}>
        {member.name}
      </Text>
      <Text style={styles.memberJoinedTime}>
        {formatTimeAgo(member.joinedAt)}
      </Text>
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
    backgroundColor: '#17172A',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#17172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#E85858',
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  backIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 12,
  },
  roomTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subjectBadge: {
    backgroundColor: 'rgba(91, 79, 232, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 3,
  },
  subjectBadgeText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 9,
    color: '#8B6FE8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  shareTopButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 184, 148, 0.12)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00B894',
  },
  memberBadgeText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 10,
    fontWeight: 'bold',
    color: '#00B894',
  },
  timerCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 20,
    marginHorizontal: 20,
    marginVertical: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
    shadowColor: '#5B4FE8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  timerDisplay: {
    fontFamily: 'DMMono',
    fontSize: 42,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: -1,
  },
  timerLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  pulseActiveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#5B4FE8',
  },
  timerSub: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  membersSection: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  membersHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionLabel: {
    fontFamily: 'DMSans-Bold',
    fontSize: 10,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: 0.8,
  },
  interactionSubtitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    color: '#E8A020',
  },
  membersGridContent: {
    paddingBottom: 4,
  },
  membersGridRow: {
    gap: 8,
    justifyContent: 'flex-start',
    marginBottom: 8,
  },
  memberBubbleContainer: {
    width: COLUMN_WIDTH,
    alignItems: 'center',
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarInitials: {
    fontFamily: 'DMSans-Bold',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    zIndex: 1,
  },
  memberName: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    color: '#EDEDEF',
    marginTop: 6,
    textAlign: 'center',
    width: '100%',
  },
  memberJoinedTime: {
    fontFamily: 'DMSans',
    fontSize: 9,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
    textAlign: 'center',
  },
  chatSection: {
    flex: 1,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    paddingTop: 10,
  },
  chatSectionExpanded: {
    flex: 1,
    paddingTop: 4,
    backgroundColor: '#17172A',
  },
  chatHeader: {
    paddingHorizontal: 20,
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
    backgroundColor: 'rgba(91,79,232,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(91,79,232,0.3)',
  },
  expandChatButtonText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 11,
    color: '#8B6FE8',
    fontWeight: '700',
  },
  expandedChatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#1E1E36',
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
    color: '#9B9BAF',
    marginTop: 2,
  },
  minimizeChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#5B4FE8',
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
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: 10,
  },
  chatListContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    alignSelf: 'flex-start',
    maxWidth: '80%',
  },
  messageRowOwn: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  msgAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  msgAvatarImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  msgAvatarText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 9,
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
    fontFamily: 'DMSans',
    fontSize: 10,
    color: '#9B9BAF',
  },
  messageBubble: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 60,
  },
  messageBubbleOwn: {
    backgroundColor: '#5B4FE8',
    borderTopRightRadius: 4,
  },
  messageBubbleOther: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderTopLeftRadius: 4,
  },
  messageText: {
    fontFamily: 'DMSans',
    fontSize: 13,
    color: '#FFFFFF',
  },
  messageTimeText: {
    fontSize: 9,
    fontFamily: 'DMSans',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  messageTimeTextOwn: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  messageTimeTextOther: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
  inputRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    gap: 10,
    alignItems: 'center',
  },
  chatInput: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontFamily: 'DMSans',
    fontSize: 13,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#5B4FE8',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5B4FE8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  bottomContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#17172A',
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  bottomContainerNoChat: {
    marginTop: 'auto',
  },
  focusButton: {
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#5B4FE8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  stopFocusButton: {
    shadowColor: '#E85858',
  },
  focusButtonText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Bold',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  reactionsContainer: {
    display: 'none',
  },
  emojiPickerPopup: {
    position: 'absolute',
    bottom: 56,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#1E1E30',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 10,
  },
  emojiPickerButton: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiPickerText: {
    fontSize: 22,
  },
  emojiTriggerButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  musicBar: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    marginHorizontal: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
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
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(91, 79, 232, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  musicStationName: {
    fontFamily: 'DMSans-Bold',
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  musicStationGenre: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.35)',
    marginTop: 1,
  },
  musicControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  musicPlayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#5B4FE8',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5B4FE8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  musicPlayButtonActive: {
    backgroundColor: '#3B36B3',
  },
  musicMuteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stationSelectorContainer: {
    marginTop: 8,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 8,
  },
  hostControlTag: {
    fontFamily: 'DMSans-Bold',
    fontSize: 8,
    fontWeight: 'bold',
    color: '#E8A020',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  stationSelector: {
    flexGrow: 0,
  },
  stationSelectorContent: {
    gap: 6,
    paddingRight: 10,
  },
  stationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  stationChipActive: {
    backgroundColor: 'rgba(91, 79, 232, 0.15)',
    borderColor: '#5B4FE8',
  },
  stationEmoji: {
    fontSize: 12,
  },
  stationChipText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  stationChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  memberMusicTag: {
    marginTop: 8,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 8,
  },
  memberMusicTagText: {
    fontFamily: 'DMSans',
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.3)',
    lineHeight: 14,
  },
});
