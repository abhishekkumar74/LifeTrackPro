import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { Bell, Flame, Users } from 'lucide-react-native';
import { router, Href } from 'expo-router';

// Constants
const TIME_MORNING = 'Good morning';
const TIME_AFTERNOON = 'Good afternoon';
const TIME_EVENING = 'Good evening';
const SHADOW_COLOR = '#000000';
const BORDER_COLOR = '#E8E7E3';

interface HomeHeaderProps {
  name: string;
  streakCount: number;
  isLoading: boolean;
  avatarUrl?: string | null;
  onPressStreak?: () => void;
  onPressNotification?: () => void;
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({
  name,
  streakCount,
  isLoading,
  avatarUrl,
  onPressStreak,
  onPressNotification,
}) => {
  // Reanimated shared value for loading skeleton pulse
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    if (isLoading) {
      opacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 800 }),
          withTiming(0.4, { duration: 800 })
        ),
        -1,
        true
      );
    }
  }, [isLoading]);

  const pulseStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return TIME_MORNING;
    } else if (hour < 17) {
      return TIME_AFTERNOON;
    } else {
      return TIME_EVENING;
    }
  };

  const getInitials = (fullName: string) => {
    if (!fullName) return '';
    return fullName.trim().charAt(0).toUpperCase();
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.leftSide}>
          <Animated.View style={[styles.skeletonAvatar, pulseStyle]} />
          <View style={styles.textColumn}>
            <Animated.View style={[styles.skeletonGreeting, pulseStyle]} />
            <Animated.View style={[styles.skeletonName, pulseStyle]} />
          </View>
        </View>
        <View style={styles.rightSide}>
          <Animated.View style={[styles.skeletonStreak, pulseStyle]} />
          <Animated.View style={[styles.skeletonNotification, pulseStyle]} />
        </View>
      </View>
    );
  }

  const initials = getInitials(name);
  const greeting = getGreeting();

  return (
    <View style={styles.container}>
      <View style={styles.leftSide}>
        {/* Avatar with SVG Linear Gradient or Image */}
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={() => router.push('/profile' as Href)}
          activeOpacity={0.7}
          accessibilityLabel="Profile"
          accessibilityRole="button"
          accessibilityHint="Navigate to profile settings"
        >
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <>
              <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
                <Defs>
                  <LinearGradient id="avatarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor="#5B4FE8" />
                    <Stop offset="100%" stopColor="#8B6FE8" />
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#avatarGrad)" rx={20} ry={20} />
              </Svg>
              <Text style={styles.avatarText}>{initials}</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.textColumn}>
          <Text style={styles.greetingText}>{greeting}</Text>
          <Text style={styles.nameText} numberOfLines={1}>{name}</Text>
        </View>
      </View>

      <View style={styles.rightSide}>
        <TouchableOpacity
          style={[styles.streakPill, { flexDirection: 'row', alignItems: 'center' }]}
          onPress={onPressStreak}
          activeOpacity={0.7}
          accessibilityLabel={`${streakCount} day streak`}
          accessibilityRole="button"
        >
          <Flame size={13} color="#E8A020" fill="#E8A020" style={{ marginRight: 3 }} />
          <Text style={styles.streakText}>{streakCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.roomsButton}
          onPress={() => router.push('/rooms' as Href)}
          activeOpacity={0.7}
          accessibilityLabel="Study Rooms"
          accessibilityRole="button"
          accessibilityHint="Navigate to active study rooms"
        >
          <Users size={17} color="#17172A" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.notificationButton, { position: 'relative' }]} 
          onPress={onPressNotification}
          activeOpacity={0.7}
          accessibilityLabel="Notifications"
          accessibilityRole="button"
          accessibilityHint="View notifications"
        >
          <Bell size={18} color="#17172A" />
          <View
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: '#5B4FE8',
            }}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F7F6F3',
  },
  leftSide: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Bold',
    fontSize: 16,
    fontWeight: 'bold',
  },
  textColumn: {
    marginLeft: 12,
    flex: 1,
    justifyContent: 'center',
  },
  greetingText: {
    color: '#9B9BAF',
    fontFamily: 'DMSans',
    fontSize: 13,
  },
  nameText: {
    color: '#17172A',
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
  },
  rightSide: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakPill: {
    backgroundColor: '#FEF3DC',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 8,
  },
  streakText: {
    color: '#E8A020',
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    fontWeight: '600',
  },
  notificationButton: {
    width: 40,
    height: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 2,
  },
  roomsButton: {
    width: 40,
    height: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 2,
    marginRight: 8,
  },
  // Loading Skeletons
  skeletonAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8E7E3',
  },
  skeletonGreeting: {
    width: 80,
    height: 12,
    backgroundColor: '#E8E7E3',
    borderRadius: 4,
    marginBottom: 6,
  },
  skeletonName: {
    width: 120,
    height: 16,
    backgroundColor: '#E8E7E3',
    borderRadius: 4,
  },
  skeletonStreak: {
    width: 50,
    height: 24,
    backgroundColor: '#E8E7E3',
    borderRadius: 12,
    marginRight: 8,
  },
  skeletonNotification: {
    width: 40,
    height: 40,
    backgroundColor: '#E8E7E3',
    borderRadius: 12,
  },
});
