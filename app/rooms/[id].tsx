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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Href } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { StudyRoom } from '@/types/app.types';
import { useRoomPresence, useRoomChat, RoomMember, ChatMessage } from '@/lib/hooks/use-study-rooms';
import { useAuthStore } from '@/lib/store/auth.store';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useAndroidBackHandler } from '@/lib/hooks/use-android-back';
import { Skeleton } from '@/components/shared/Skeleton';

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

export default function ActiveRoomScreen(): React.JSX.Element {
  useAndroidBackHandler();
  const { id } = useLocalSearchParams<{ id: string }>();

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

  // Hooks for Presence & Chat
  const { members, memberCount } = useRoomPresence(id || '');
  const { messages, sendMessage } = useRoomChat(id || '');

  // Local State
  const [userJoinedTime] = useState<number>(Date.now());
  const [timerText, setTimerText] = useState('00:00');
  const [messageInput, setMessageInput] = useState('');

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
    router.push({
      pathname: '/focus',
      params: { subject: room?.subject || '' },
    } as Href);
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

  const showChat = room.room_type === 'discussion';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#17172A" translucent={false} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* TOP BAR */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.leaveTopButton} onPress={handleLeave} activeOpacity={0.7}>
            <Text style={styles.leaveTopButtonText}>← Leave</Text>
          </TouchableOpacity>

          <Text style={styles.roomTitle} numberOfLines={1}>
            {room.name}
          </Text>

          <View style={styles.memberBadge}>
            <Text style={styles.memberBadgeText}>{memberCount} studying</Text>
          </View>
        </View>

        {/* SHARED TIMER */}
        <View style={styles.timerSection}>
          <Text style={styles.timerDisplay}>{timerText}</Text>
          <Text style={styles.timerSub}>studying together</Text>
        </View>

        {/* MEMBERS GRID */}
        <View style={styles.membersSection}>
          <Text style={styles.sectionLabel}>IN THIS ROOM</Text>
          <FlatList
            data={members}
            keyExtractor={(item) => item.userId}
            numColumns={4}
            columnWrapperStyle={styles.membersGridRow}
            removeClippedSubviews={Platform.OS === 'android'}
            renderItem={({ item }) => (
              <MemberBubble member={item} formatTimeAgo={formatTimeAgo} />
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
              <Text style={styles.sectionLabel}>CHAT</Text>
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
                placeholder="Message..."
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

        {/* START FOCUS BUTTON */}
        <View style={[styles.bottomContainer, !showChat && styles.bottomContainerNoChat]}>
          <TouchableOpacity style={styles.focusButton} onPress={handleStartFocus} activeOpacity={0.8}>
            <Text style={styles.focusButtonText}>▶ Start My Focus Session</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Helper components for local renders to avoid unnecessary re-renders
const MemberBubble = React.memo<{ member: RoomMember; formatTimeAgo: (t: string) => string }>(({
  member,
  formatTimeAgo,
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
  focusButtonText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    fontWeight: '600',
  },
});
