import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Users } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useActiveRooms, useMyRooms, RoomWithHost } from '@/lib/hooks/use-study-rooms';

export const LiveStudyRoomCard = React.memo(() => {
  const router = useRouter();
  const { data: activeRooms } = useActiveRooms({ refetchInterval: 15000 });
  const { data: myRooms } = useMyRooms();

  // Combine user's hosted active rooms and public active rooms
  const liveRooms = useMemo(() => {
    const roomMap = new Map<string, RoomWithHost>();

    // 1. Prioritize user's own active rooms so host always sees their running session
    if (myRooms) {
      for (const room of myRooms) {
        if (!room.is_active) continue;
        const createdAt = new Date(room.created_at).getTime();
        const durationMs = (room.timer_minutes || 60) * 60 * 1000;
        if (Date.now() <= createdAt + durationMs) {
          roomMap.set(room.id, room);
        }
      }
    }

    // 2. Add public active rooms
    if (activeRooms) {
      for (const room of activeRooms) {
        if (!room.is_active || roomMap.has(room.id)) continue;
        const createdAt = new Date(room.created_at).getTime();
        const durationMs = (room.timer_minutes || 60) * 60 * 1000;
        if (Date.now() <= createdAt + durationMs) {
          roomMap.set(room.id, room);
        }
      }
    }

    return Array.from(roomMap.values());
  }, [activeRooms, myRooms]);

  const hasLiveRooms = liveRooms.length > 0;
  const isMultipleRooms = liveRooms.length > 1;
  const topRoom = hasLiveRooms ? liveRooms[0] : null;

  // Real participant count from active rooms (no hardcoded fallback)
  const totalLiveStudents = useMemo(() => {
    if (!hasLiveRooms) return 0;
    return liveRooms.reduce((sum, r) => sum + Math.max(r.member_count || 1, 1), 0);
  }, [hasLiveRooms, liveRooms]);

  // Pulsing animation only active when rooms are genuinely live
  const pulseOpacity = useSharedValue(1);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (hasLiveRooms) {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.35, { duration: 750 }),
          withTiming(1, { duration: 750 })
        ),
        -1,
        true
      );
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 750 }),
          withTiming(1, { duration: 750 })
        ),
        -1,
        true
      );
    } else {
      pulseOpacity.value = 1;
      pulseScale.value = 1;
    }
  }, [hasLiveRooms, pulseOpacity, pulseScale]);

  const animatedPulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{ scale: pulseScale.value }],
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (hasLiveRooms && !isMultipleRooms && topRoom?.id) {
      // Direct 1-tap join into the single active room
      router.push(`/rooms/${topRoom.id}`);
    } else {
      // Multiple rooms or no room -> redirect to Study Rooms / Groups section
      router.push('/rooms');
    }
  };

  return (
    <TouchableOpacity
      style={styles.cardContainer}
      onPress={handlePress}
      activeOpacity={0.88}
      accessibilityLabel={
        hasLiveRooms
          ? `${totalLiveStudents} students currently studying live across ${liveRooms.length} rooms. Tap to view.`
          : 'Study Groups. Tap to explore study rooms.'
      }
    >
      {/* Left Icon with conditional live pulsing ring */}
      <View style={[styles.iconContainer, hasLiveRooms && styles.iconContainerLive]}>
        <Users size={18} color="#5B4FE8" strokeWidth={2.4} />
        {hasLiveRooms && (
          <View style={styles.pulseRing}>
            <Animated.View style={[styles.liveDot, animatedPulseStyle]} />
          </View>
        )}
      </View>

      {/* Middle Text Details */}
      <View style={styles.textContent}>
        <View style={styles.titleRow}>
          <Text style={styles.headline} numberOfLines={1}>
            {hasLiveRooms
              ? isMultipleRooms
                ? `${liveRooms.length} Live Study Rooms`
                : `${totalLiveStudents} ${totalLiveStudents === 1 ? 'student' : 'students'} studying live`
              : 'Study Groups'}
          </Text>
          <View style={[styles.badge, hasLiveRooms ? styles.liveBadge : styles.neutralBadge]}>
            <Text
              style={[
                styles.badgeText,
                hasLiveRooms ? styles.liveBadgeText : styles.neutralBadgeText,
              ]}
            >
              {hasLiveRooms ? 'LIVE' : 'ROOMS'}
            </Text>
          </View>
        </View>
        <Text style={styles.subtext} numberOfLines={1} ellipsizeMode="tail">
          {hasLiveRooms && topRoom
            ? isMultipleRooms
              ? `${topRoom.name} + ${liveRooms.length - 1} more · Tap to view`
              : `${topRoom.name} · 1-Tap Join`
            : 'No live rooms · Tap to explore'}
        </Text>
      </View>

      {/* Right Action Button */}
      <View style={[styles.actionButton, !hasLiveRooms && styles.actionButtonSecondary]}>
        <Text
          style={[
            styles.actionButtonText,
            !hasLiveRooms && styles.actionButtonTextSecondary,
          ]}
        >
          {hasLiveRooms ? (isMultipleRooms ? `View (${liveRooms.length}) →` : 'Join →') : 'Explore →'}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: '#E8E5F8',
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    minHeight: 56,
    shadowColor: '#5B4FE8',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(91, 79, 232, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 11,
    position: 'relative',
  },
  iconContainerLive: {
    backgroundColor: 'rgba(91, 79, 232, 0.12)',
  },
  pulseRing: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 10,
    height: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  textContent: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  headline: {
    fontFamily: 'DMSans-Bold',
    fontSize: 14.5,
    color: '#151628',
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  badge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  liveBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  neutralBadge: {
    backgroundColor: 'rgba(91, 79, 232, 0.08)',
  },
  badgeText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 8.5,
    letterSpacing: 0.5,
  },
  liveBadgeText: {
    color: '#059669',
  },
  neutralBadgeText: {
    color: '#5B4FE8',
  },
  subtext: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11.5,
    color: '#7E8098',
  },
  actionButton: {
    backgroundColor: '#5B4FE8',
    paddingHorizontal: 11,
    paddingVertical: 6.5,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5B4FE8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonSecondary: {
    backgroundColor: 'rgba(91, 79, 232, 0.09)',
    borderWidth: 1,
    borderColor: 'rgba(91, 79, 232, 0.2)',
    shadowOpacity: 0,
    elevation: 0,
  },
  actionButtonText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  actionButtonTextSecondary: {
    color: '#5B4FE8',
  },
});
