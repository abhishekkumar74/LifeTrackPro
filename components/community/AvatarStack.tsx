import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { RoomMember } from '@/lib/hooks/use-study-rooms';

interface AvatarStackProps {
  members: RoomMember[];
  maxShown?: number;
}

const GRADIENT_PAIRS = [
  { start: '#6C5CE7', end: '#A29BFE' },
  { start: '#FF7675', end: '#FD79A8' },
  { start: '#00B894', end: '#55EFC4' },
  { start: '#E17055', end: '#FDCB6E' },
  { start: '#0984E3', end: '#74B9FF' },
  { start: '#8B6FE8', end: '#E84393' },
];

function getGradForUser(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % GRADIENT_PAIRS.length;
  return GRADIENT_PAIRS[index];
}

export const AvatarStack = React.memo<AvatarStackProps>(({ members, maxShown = 4 }) => {
  const shownMembers = members.slice(0, maxShown);
  const overflowCount = members.length - maxShown;

  return (
    <View style={styles.container}>
      {shownMembers.map((m, index) => {
        const grad = getGradForUser(m.userId);
        return (
          <View
            key={m.userId}
            style={[
              styles.avatar,
              {
                marginLeft: index === 0 ? 0 : -8,
                zIndex: maxShown - index,
              },
            ]}
          >
            {m.avatarUrl ? (
              <Image source={{ uri: m.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <>
                <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
                  <Defs>
                    <LinearGradient id={`stack-grad-${m.userId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                      <Stop offset="0%" stopColor={grad.start} />
                      <Stop offset="100%" stopColor={grad.end} />
                    </LinearGradient>
                  </Defs>
                  <Rect width="100%" height="100%" fill={`url(#stack-grad-${m.userId})`} rx={14} ry={14} />
                </Svg>
                <Text style={styles.initials}>{m.initials}</Text>
              </>
            )}
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
  avatarImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
