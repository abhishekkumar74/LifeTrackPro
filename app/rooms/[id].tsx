import React, { useEffect, useState, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Href } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { StudyRoom } from '@/types/app.types';
import { useRoomPresence, useRoomChat, RoomMember, ChatMessage } from '@/lib/hooks/use-study-rooms';
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
import { Share2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

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
        [{ text: 'OK', onPress: () => router.back() }],
        { cancelable: false }
      );
    }
  }, [isRoomLoading, room, isHost, hostIsPremium, memberCount]);

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
      .subscribe();

    reactionChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
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

  // Timer Count Up
  useEffect(() => {
    const updateTimer = () => {
      const diffMs = Date.now() - userJoinedTime;
      const diffSecs = Math.max(0, Math.floor(diffMs / 1000));
      const hrs = Math.floor(diffSecs / 3600);
      const mins = Math.floor((diffSecs % 3600) / 60);
      const secs = diffSecs % 60;
      const pad = (n: number) => String(n).padStart(2, '0');

      if (hrs > 0) {
        setTimerText(`${hrs}:${pad(mins)}:${pad(secs)}`);
      } else {
        setTimerText(`${pad(mins)}:${pad(secs)}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [userJoinedTime]);

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
              [{ text: 'OK', onPress: () => router.back() }],
              { cancelable: false }
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomSubscription);
    };
  }, [id]);

  const handleLeave = () => {
    router.back();
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity style={styles.leaveTopButton} onPress={handleLeave} activeOpacity={0.7}>
              <Text style={styles.leaveTopButtonText}>← Leave</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shareTopButton} onPress={handleShare} activeOpacity={0.7}>
              <Share2 size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <Text style={styles.roomTitle} numberOfLines={1}>
            {room.name}
          </Text>

          <View style={styles.memberBadge}>
            <Text style={styles.memberBadgeText}>{memberCount} studying</Text>
          </View>
        </View>

        {/* SHARED TIMER */}
        <View style={styles.timerSection}>
          <Text style={styles.timerDisplay}>
            {focusActive ? formatFocusTime(focusTimeLeft) : timerText}
          </Text>
          <Text style={styles.timerSub}>
            {focusActive ? 'personal focus session' : 'studying together'}
          </Text>
        </View>

        {/* MEMBERS GRID */}
        <View style={styles.membersSection}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <Text style={styles.sectionLabel}>IN THIS ROOM</Text>
            <Text style={styles.interactionSubtitle}>Tap friend to Cheer/Nudge ✨</Text>
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
            style={{ maxHeight: COLUMN_WIDTH * 2 + 30 }}
            scrollEnabled={members.length > 8}
          />
        </View>

        {/* CHAT SECTION */}
        {showChat ? (
          <View style={styles.chatSection}>
            <View style={styles.chatHeader}>
              <View style={styles.chatDivider} />
              <Text style={styles.sectionLabel}>{getChatHeaderLabel()}</Text>
            </View>

            <FlatList
              data={[...messages].reverse()}
              keyExtractor={(item) => item.id}
              inverted
              removeClippedSubviews={Platform.OS === 'android'}
              renderItem={({ item }) => (
                <MessageRow message={item} />
              )}
              contentContainerStyle={styles.chatListContent}
            />

            <View style={styles.inputRow}>
              <TextInput
                style={styles.chatInput}
                placeholder={getChatPlaceholder()}
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={messageInput}
                onChangeText={setMessageInput}
                maxLength={200}
              />
              <TouchableOpacity style={styles.sendButton} onPress={handleSend} activeOpacity={0.8}>
                <Text style={styles.sendButtonText}>→</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        {/* EMOJI REACTIONS BAR */}
        <View style={styles.reactionsContainer}>
          {['👍', '🔥', '👏', '🎯', '🚀', '💡'].map((emoji) => (
            <TouchableOpacity
              key={emoji}
              style={styles.reactionButton}
              onPress={() => sendReaction(emoji)}
              activeOpacity={0.7}
            >
              <Text style={styles.reactionText}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* START FOCUS BUTTON */}
        <View style={[styles.bottomContainer, !showChat && styles.bottomContainerNoChat]}>
          <TouchableOpacity
            style={[styles.focusButton, focusActive && styles.stopFocusButton]}
            onPress={handleStartFocus}
            activeOpacity={0.8}
          >
            <Text style={styles.focusButtonText}>
              {focusActive ? '⏹ Stop Focus Session' : '▶ Start My Focus Session'}
            </Text>
          </TouchableOpacity>
        </View>
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

  return (
    <View style={[styles.messageRow, isMe && styles.messageRowOwn]}>
      {!isMe && (
        <View style={[styles.msgAvatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.msgAvatarText}>{message.userInitials}</Text>
        </View>
      )}

      <View style={styles.messageBubbleColumn}>
        {!isMe && <Text style={styles.messageSenderName}>{message.userName}</Text>}
        <View style={[styles.messageBubble, isMe ? styles.messageBubbleOwn : styles.messageBubbleOther]}>
          <Text style={styles.messageText}>{message.text}</Text>
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
    paddingVertical: 12,
  },
  leaveTopButton: {
    paddingVertical: 6,
  },
  leaveTopButtonText: {
    fontFamily: 'DMSans',
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  roomTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginHorizontal: 12,
  },
  memberBadge: {
    backgroundColor: '#D4F5EE',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  memberBadgeText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    fontWeight: '600',
    color: '#00B894',
  },
  timerSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  timerDisplay: {
    fontFamily: 'DMMono',
    fontSize: 48,
    color: '#FFFFFF',
    letterSpacing: -2,
  },
  timerSub: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
  },
  membersSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionLabel: {
    fontFamily: 'DMSans',
    fontSize: 10,
    color: '#9B9BAF',
    letterSpacing: 1,
    marginBottom: 12,
  },
  interactionSubtitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 9,
    color: '#E8A020',
    marginBottom: 12,
  },
  membersGridContent: {
    paddingBottom: 8,
  },
  membersGridRow: {
    gap: 8,
    justifyContent: 'flex-start',
    marginBottom: 12,
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
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#FFFFFF',
    marginTop: 6,
    textAlign: 'center',
    width: '100%',
  },
  memberJoinedTime: {
    fontFamily: 'DMMono',
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 2,
    textAlign: 'center',
  },
  chatSection: {
    flex: 1,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingTop: 16,
  },
  chatHeader: {
    paddingHorizontal: 20,
  },
  chatDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: 12,
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
  messageSenderName: {
    fontFamily: 'DMSans',
    fontSize: 10,
    color: '#9B9BAF',
  },
  messageBubble: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  messageBubbleOwn: {
    backgroundColor: '#5B4FE8',
    borderBottomRightRadius: 2,
  },
  messageBubbleOther: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderBottomLeftRadius: 2,
  },
  messageText: {
    fontFamily: 'DMSans',
    fontSize: 13,
    color: '#FFFFFF',
  },
  inputRow: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    gap: 8,
    alignItems: 'center',
  },
  chatInput: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontFamily: 'DMSans',
    fontSize: 14,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#5B4FE8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#17172A',
  },
  bottomContainerNoChat: {
    marginTop: 'auto',
  },
  focusButton: {
    backgroundColor: '#5B4FE8',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5B4FE8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  stopFocusButton: {
    backgroundColor: '#E85858',
    shadowColor: '#E85858',
  },
  focusButtonText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    fontWeight: '600',
  },
  shareTopButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  reactionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginVertical: 12,
    paddingHorizontal: 20,
  },
  reactionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  reactionText: {
    fontSize: 20,
  },
});
