import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { RoomWithHost, RoomMember } from '@/lib/hooks/use-study-rooms';
import { AvatarStack } from './AvatarStack';
import { getSubjectColor } from '@/lib/utils/subject-colors';

interface RoomCardProps {
  room: RoomWithHost;
  currentUserId: string;
  onJoin: (roomId: string) => void;
  onEnd?: (roomId: string) => void;
}

export const RoomCard = ({
  room,
  currentUserId,
  onJoin,
  onEnd,
}: RoomCardProps) => {
  const [timerText, setTimerText] = useState('');

  useEffect(() => {
    if (!room.is_active) {
      setTimerText('');
      return;
    }

    const updateTimer = () => {
      const diffMs = Date.now() - new Date(room.created_at).getTime();
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
  }, [room.created_at, room.is_active]);

  const isHost = room.host_id === currentUserId;
  const subjectColor = room.subject ? getSubjectColor(room.subject) : '#9B9BAF';

  // Construct a list of members for AvatarStack
  const membersForStack: RoomMember[] = [];
  if (room.host_name) {
    membersForStack.push({
      userId: room.host_id,
      name: room.host_name,
      initials: room.host_name[0] ? room.host_name[0].toUpperCase() : 'H',
      joinedAt: room.created_at,
      currentSubject: room.subject,
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
          {room.subject && (
            <View style={[styles.subjectChip, { backgroundColor: `${subjectColor}15` }]}>
              <Text style={[styles.subjectText, { color: subjectColor }]}>
                {room.subject}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.rightColumn}>
          {!room.is_active ? (
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
};

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
  subjectChip: {
    alignSelf: 'flex-start',
    marginTop: 6,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
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
