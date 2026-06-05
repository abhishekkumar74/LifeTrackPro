import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RoomMember } from '@/lib/hooks/use-study-rooms';

interface AvatarStackProps {
  members: RoomMember[];
  maxShown?: number;
}

const COLORS = ['#5B4FE8', '#00B894', '#E8A020', '#E85858', '#8B6FE8', '#0EA5E9'];

function getColorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COLORS.length;
  return COLORS[index];
}

export const AvatarStack = React.memo<AvatarStackProps>(({ members, maxShown = 4 }) => {
  const shownMembers = members.slice(0, maxShown);
  const overflowCount = members.length - maxShown;

  return (
    <View style={styles.container}>
      {shownMembers.map((m, index) => {
        const bg = getColorForUser(m.userId);
        return (
          <View
            key={m.userId}
            style={[
              styles.avatar,
              {
                backgroundColor: bg,
                marginLeft: index === 0 ? 0 : -8,
                zIndex: maxShown - index,
              },
            ]}
          >
            <Text style={styles.initials}>{m.initials}</Text>
          </View>
        );
      })}
      {overflowCount > 0 && (
        <View style={[styles.avatar, styles.overflow, { marginLeft: -8, zIndex: 0 }]}>
          <Text style={styles.overflowText}>+{overflowCount}</Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  initials: {
    fontFamily: 'DMSans-Bold',
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  overflow: {
    backgroundColor: '#E8E7E3',
  },
  overflowText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 11,
    fontWeight: 'bold',
    color: '#5C5C70',
  },
});
