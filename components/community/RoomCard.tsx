import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { RoomWithHost, RoomMember } from '@/lib/hooks/use-study-rooms';
import { AvatarStack } from './AvatarStack';
import { getSubjectColor } from '@/lib/utils/subject-colors';
import { Lock, Globe, Users } from 'lucide-react-native';
import { parseRoomSubject } from '@/lib/utils/room-visibility';

interface RoomCardProps {
  room: RoomWithHost;
  currentUserId: string;
  onJoin: (roomId: string) => void;
  onEnd?: (roomId: string) => void;
}

const getTimerString = (createdAtStr: string, timerMinutes?: number, isActive?: boolean): string => {
  if (!isActive) return '';
  const createdAt = new Date(createdAtStr).getTime();
  const durationMs = (timerMinutes || 25) * 60 * 1000;
  const expiresAt = createdAt + durationMs;
  const now = Date.now();
  const remainingSecs = Math.max(0, Math.floor((expiresAt - now) / 1000));

  if (remainingSecs <= 0) return 'Ended';

  const hrs = Math.floor(remainingSecs / 3600);
  const mins = Math.floor((remainingSecs % 3600) / 60);
  const secs = remainingSecs % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  if (hrs > 0) {
    return `${hrs}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
};

export const RoomCard = React.memo(({
  room,
  currentUserId,
  onJoin,
  onEnd,
}: RoomCardProps) => {
  const [timerText, setTimerText] = useState(() =>
    getTimerString(room.created_at, room.timer_minutes, room.is_active)
  );

  useEffect(() => {
    if (!room.is_active) {
      setTimerText('');
      return;
    }

    const updateTimer = () => {
      setTimerText(getTimerString(room.created_at, room.timer_minutes, room.is_active));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [room.created_at, room.timer_minutes, room.is_active]);

  const isHost = room.host_id === currentUserId;

  const { displaySubject, visibility } = useMemo(() => {
    return parseRoomSubject(room.subject, room.is_public);
  }, [room.subject, room.is_public]);

  const subjectColor = displaySubject ? getSubjectColor(displaySubject) : '#9B9BAF';

  const visibilityConfig = useMemo(() => {
    switch (visibility) {
      case 'private':
        return {
          label: 'Private',
          color: '#B45309',
          bg: 'rgba(217, 119, 6, 0.08)',
          border: 'rgba(217, 119, 6, 0.22)',
          Icon: Lock,
        };
      case 'friends':
        return {
          label: 'Friends',
          color: '#0284C7',
          bg: 'rgba(2, 132, 199, 0.08)',
          border: 'rgba(2, 132, 199, 0.22)',
          Icon: Users,
        };
      case 'public':
      default:
        return {
          label: 'Public',
          color: '#5B4FE8',
          bg: 'rgba(91, 79, 232, 0.08)',
          border: 'rgba(91, 79, 232, 0.22)',
          Icon: Globe,
        };
    }
  }, [visibility]);

  // Construct a list of members for AvatarStack
  const membersForStack: RoomMember[] = [];
  if (room.host_name) {
    membersForStack.push({
      userId: room.host_id,
      name: room.host_name,
      initials: room.host_name[0] ? room.host_name[0].toUpperCase() : 'H',
      joinedAt: room.created_at,
      currentSubject: displaySubject,
    });
  }
  const mockInitials = ['JS', 'MD', 'RK', 'AL', 'SM'];
  for (let i = 1; i < room.member_count; i++) {
    if (membersForStack.length >= 4) break;
    membersForStack.push({
      userId: `mock-${i}-${room.id}`,
      name: 'Student',
      initials: mockInitials[i % mockInitials.length],
      joinedAt: room.created_at,
      currentSubject: null,
    });
  }

  const getRoomTypeLabel = () => {
    switch (room.room_type) {
      case 'silent':
        return 'Silent';
      case 'music':
        return 'Music';
      case 'discussion':
        return 'Discussion';
      default:
        return 'Focus';
    }
  };

  return (
    <View style={styles.container}>
      {/* TOP ROW */}
      <View style={styles.topRow}>
        <View style={styles.leftColumn}>
          <Text style={styles.roomName} numberOfLines={1}>
            {room.name}
          </Text>
          <View style={styles.badgesRow}>
            {displaySubject && (
              <View style={[styles.subjectChip, { backgroundColor: `${subjectColor}15`, borderColor: `${subjectColor}35` }]}>
                <Text style={[styles.subjectText, { color: subjectColor }]}>
                  {displaySubject}
                </Text>
              </View>
            )}

            <View
              style={[
                styles.visibilityChip,
                {
                  backgroundColor: visibilityConfig.bg,
                  borderColor: visibilityConfig.border,
                },
              ]}
              accessibilityLabel={visibilityConfig.label}
            >
              <visibilityConfig.Icon
                size={11}
                color={visibilityConfig.color}
                strokeWidth={2.3}
              />
            </View>
          </View>
        </View>

        <View style={styles.rightColumn}>
          {!room.is_active || timerText === 'Ended' ? (
            <View style={styles.endedBadge}>
              <Text style={styles.endedBadgeText}>Ended</Text>
            </View>
          ) : isHost ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <TouchableOpacity
                style={styles.joinButton}
                onPress={() => onJoin(room.id)}
                activeOpacity={0.8}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <Text style={styles.joinButtonText}>Join</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.endButton, { paddingHorizontal: 10 }]}
                onPress={() => onEnd && onEnd(room.id)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <Text style={styles.endButtonText}>End</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.joinButton}
              onPress={() => onJoin(room.id)}
              activeOpacity={0.8}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.joinButtonText}>Join</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* MIDDLE ROW */}
      <View style={styles.middleRow}>
        <AvatarStack members={membersForStack} />
        <Text style={styles.studyingCountText}>
          {room.member_count} studying
        </Text>
      </View>

      {/* BOTTOM ROW */}
      <View style={styles.bottomRow}>
        <Text style={styles.roomTypeIndicator}>{getRoomTypeLabel()}</Text>
        {room.is_active && <Text style={styles.timerText}>{timerText}</Text>}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E6E4DF',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#17172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftColumn: {
    flex: 1,
    marginRight: 12,
  },
  roomName: {
    fontFamily: 'DMSans-Bold',
    fontSize: 16,
    color: '#17172A',
    fontWeight: 'bold',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  subjectChip: {
    alignSelf: 'flex-start',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderWidth: 1,
    borderColor: 'rgba(91, 79, 232, 0.2)',
    backgroundColor: 'rgba(91, 79, 232, 0.08)',
  },
  subjectText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 11,
    fontWeight: 'bold',
    color: '#5B4FE8',
  },
  visibilityChip: {
    width: 22,
    height: 22,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  rightColumn: {
    justifyContent: 'center',
  },
  endButton: {
    borderWidth: 1,
    borderColor: '#E85858',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(232, 88, 88, 0.06)',
  },
  endButtonText: {
    color: '#E85858',
    fontFamily: 'DMSans-Bold',
    fontSize: 12,
    fontWeight: 'bold',
  },
  joinButton: {
    backgroundColor: '#5B4FE8',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 18,
    shadowColor: '#5B4FE8',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Bold',
    fontSize: 13,
    fontWeight: 'bold',
  },
  middleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  studyingCountText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: '#4A4A68',
    fontWeight: '600',
    marginLeft: 10,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F4F3F0',
  },
  roomTypeIndicator: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11.5,
    color: '#6C6C80',
    fontWeight: '500',
  },
  timerText: {
    fontFamily: 'DMMono',
    fontSize: 12,
    fontWeight: 'bold',
    color: '#5B4FE8',
  },
  endedBadge: {
    backgroundColor: '#F1F0EC',
    borderWidth: 1,
    borderColor: '#E2E0D8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  endedBadgeText: {
    color: '#6C6C80',
    fontFamily: 'DMSans-Bold',
    fontSize: 11.5,
    fontWeight: 'bold',
  },
});
