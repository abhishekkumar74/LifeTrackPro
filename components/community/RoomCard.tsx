import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { RoomWithHost, RoomMember } from '@/lib/hooks/use-study-rooms';
import { AvatarStack } from './AvatarStack';
import { getSubjectColor } from '@/components/learn/SubjectCard';

interface RoomCardProps {
  room: RoomWithHost;
  currentUserId: string;
  onJoin: (roomId: string) => void;
  onEnd?: (roomId: string) => void;
}

export const RoomCard = React.memo<RoomCardProps>(({
  room,
  currentUserId,
  onJoin,
  onEnd,
}) => {
  const [timerText, setTimerText] = useState('');

  useEffect(() => {
    const updateTimer = () => {
      const diffMs = Date.now() - new Date(room.created_at).getTime();
      const diffSecs = Math.max(0, Math.floor(diffMs / 1000));
      const hrs = Math.floor(diffSecs / 3600);
      const mins = Math.floor((diffSecs % 3600) / 60);
      const secs = diffSecs % 60;
      const pad = (n: number) => String(n).padStart(2, '0');

      if (hrs > 0) {
        setTimerText(`⏱ ${hrs}:${pad(mins)}:${pad(secs)}`);
      } else {
        setTimerText(`⏱ ${pad(mins)}:${pad(secs)}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [room.created_at]);

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
        return '🔇 Silent';
      case 'music':
        return '🎵 Music';
      case 'discussion':
        return '💬 Discussion';
      default:
        return '🔇 Focus';
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
          {isHost ? (
            <TouchableOpacity
              style={styles.endButton}
              onPress={() => onEnd && onEnd(room.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.endButtonText}>End</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.joinButton}
              onPress={() => onJoin(room.id)}
              activeOpacity={0.8}
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
        <Text style={styles.timerText}>{timerText}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    padding: 16,
    marginBottom: 10,
    shadowColor: '#17172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
    fontFamily: 'DMSans-Medium',
    fontSize: 15,
    color: '#17172A',
    fontWeight: '600',
  },
  subjectChip: {
    alignSelf: 'flex-start',
    marginTop: 4,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  subjectText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    fontWeight: '500',
  },
  rightColumn: {
    justifyContent: 'center',
  },
  endButton: {
    borderWidth: 1,
    borderColor: '#E85858',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  endButtonText: {
    color: '#E85858',
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    fontWeight: '600',
  },
  joinButton: {
    backgroundColor: '#5B4FE8',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
    shadowColor: '#5B4FE8',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 2,
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    fontWeight: '600',
  },
  middleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  studyingCountText: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#9B9BAF',
    marginLeft: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  roomTypeIndicator: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#9B9BAF',
  },
  timerText: {
    fontFamily: 'DMMono',
    fontSize: 12,
    color: '#5B4FE8',
  },
});
