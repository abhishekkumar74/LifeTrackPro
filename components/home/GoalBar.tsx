import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { Clock, Zap } from 'lucide-react-native';
import { Goal } from '@/types/app.types';
import { calculateOnTrackStatus } from '@/lib/utils/on-track';
import { getTodayLocal } from '@/lib/utils/date';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// SVG constants
const CIRCLE_RADIUS = 20;
const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS; // ~125.66

const STATUS_LABELS = {
  on_track: 'On track',
  at_risk: 'At risk',
  behind: 'Behind',
};

interface GoalBarProps {
  goal: (Goal & { totalTasks: number; doneTasks: number }) | null;
  isLoading: boolean;
  isCse?: boolean;
  subCategory?: string;
  totalTopics?: number;
  completedTopics?: number;
}

export const GoalBar = React.memo<GoalBarProps>(({
  goal,
  isLoading,
  isCse,
  subCategory,
  totalTopics,
  completedTopics,
}) => {
  const router = useRouter();
  const opacity = useSharedValue(0.4);
  const animatedProgress = useSharedValue(0);

  // Compute progress ratio (0 to 1)
  const targetProgress = isCse
    ? (totalTopics && totalTopics > 0 ? (completedTopics || 0) / totalTopics : 0.38)
    : goal && goal.totalTasks > 0
    ? goal.doneTasks / goal.totalTasks
    : 0.38;

  const progressPercent = Math.round(targetProgress * 100);

  // Draw the SVG ring smoothly on load
  useEffect(() => {
    animatedProgress.value = 0;
    animatedProgress.value = withTiming(targetProgress, {
      duration: 1100,
      easing: Easing.out(Easing.cubic),
    });
  }, [targetProgress]);

  const animatedCircleProps = useAnimatedProps(() => {
    const strokeOffset = CIRCUMFERENCE * (1 - animatedProgress.value);
    return {
      strokeDashoffset: strokeOffset,
    };
  });

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

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handlePress = () => {
    router.push('/(tabs)/goals');
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Animated.View style={[styles.skeletonRing, pulseStyle]} />
        <View style={styles.middleArea}>
          <Animated.View style={[styles.skeletonTitle, pulseStyle]} />
          <Animated.View style={[styles.skeletonDays, pulseStyle]} />
        </View>
        <Animated.View style={[styles.skeletonBadge, pulseStyle]} />
      </View>
    );
  }

  // Calculate days left
  let daysDiff = 487; // default high-urgency exam countdown as requested by user
  let goalTitle = goal?.title || (isCse ? 'B.Tech Placement & Core Exam' : 'Target Exam 2027 (JEE / NEET)');

  if (goal?.deadline) {
    const todayStr = getTodayLocal();
    const today = new Date(todayStr);
    today.setHours(0, 0, 0, 0);

    const deadline = new Date(goal.deadline);
    deadline.setHours(0, 0, 0, 0);

    const timeDiff = deadline.getTime() - today.getTime();
    const calculatedDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    if (calculatedDays > 0) {
      daysDiff = calculatedDays;
    }
  }

  // Track status
  const status = calculateOnTrackStatus(
    goal?.created_at || new Date().toISOString(),
    goal?.deadline || new Date(Date.now() + 487 * 86400000).toISOString(),
    isCse ? (completedTopics || 0) : (goal?.doneTasks || 5),
    isCse ? (totalTopics || 0) : (goal?.totalTasks || 12)
  );

  const getStatusStyles = (statusType: 'on_track' | 'at_risk' | 'behind') => {
    switch (statusType) {
      case 'on_track':
        return { bg: '#D4F5EE', text: '#00B894' };
      case 'at_risk':
        return { bg: '#FEF3DC', text: '#E8A020' };
      case 'behind':
      default:
        return { bg: '#FDE8E8', text: '#E85858' };
    }
  };

  const statusTheme = getStatusStyles(status);

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.88}>
      {/* SVG Animated Progress Ring (Draws on page load) */}
      <View style={styles.ringContainer}>
        <Svg width="52" height="52" viewBox="0 0 52 52">
          {/* Background Track Circle */}
          <Circle
            cx="26"
            cy="26"
            r={CIRCLE_RADIUS}
            stroke="#EAE8E4"
            strokeWidth="4"
            fill="transparent"
          />
          {/* Animated Progress Arc Circle */}
          <AnimatedCircle
            cx="26"
            cy="26"
            r={CIRCLE_RADIUS}
            stroke="#5B4FE8"
            strokeWidth="4"
            fill="transparent"
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            animatedProps={animatedCircleProps}
            strokeLinecap="round"
            transform="rotate(-90 26 26)"
          />
          {/* Percentage Text in Center */}
          <SvgText
            x="26"
            y="30"
            textAnchor="middle"
            fontSize="11"
            fontFamily="DMSans-Bold"
            fill="#17172A"
          >
            {`${progressPercent}%`}
          </SvgText>
        </Svg>
      </View>

      {/* Goal Details & Urgency Info */}
      <View style={styles.middleArea}>
        <Text style={styles.goalName} numberOfLines={1}>
          {goalTitle}
        </Text>
        <Text style={styles.mottoText} numberOfLines={1}>
          Every day counts · Stay on track
        </Text>

        {/* Days Left Countdown Pill positioned neatly below the motto */}
        <View style={styles.countdownRow}>
          <View style={styles.daysLeftPill}>
            <Clock size={10.5} color="#DC2626" strokeWidth={2.4} />
            <Text style={styles.daysLeftText}>{`${daysDiff} days left`}</Text>
          </View>
          <View style={styles.urgencyDot} />
          <Text style={styles.countdownSub}>Exam countdown</Text>
        </View>
      </View>

      {/* On-Track Status Badge */}
      <View style={[styles.statusBadge, { backgroundColor: statusTheme.bg }]}>
        <Text style={[styles.statusBadgeText, { color: statusTheme.text }]}>
          {STATUS_LABELS[status]}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ECEAE5',
    paddingVertical: 13,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  ringContainer: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 13,
  },
  middleArea: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 8,
  },
  goalName: {
    fontFamily: 'DMSans-Bold',
    fontSize: 14.5,
    color: '#151624',
    letterSpacing: -0.2,
    marginBottom: 2.5,
  },
  mottoText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11.5,
    color: '#7E8098',
    marginBottom: 5,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  daysLeftPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    borderRadius: 6,
    paddingHorizontal: 6.5,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  daysLeftText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 11,
    color: '#DC2626',
    letterSpacing: -0.1,
  },
  urgencyDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#C4C4D0',
  },
  countdownSub: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10.5,
    color: '#9B9BAF',
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    alignSelf: 'center',
    marginLeft: 4,
  },
  statusBadgeText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 11,
  },
  // Skeleton styles
  skeletonRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ECEAE5',
    marginRight: 14,
  },
  skeletonTitle: {
    width: 140,
    height: 14,
    borderRadius: 4,
    backgroundColor: '#ECEAE5',
    marginBottom: 6,
  },
  skeletonDays: {
    width: 90,
    height: 11,
    borderRadius: 4,
    backgroundColor: '#ECEAE5',
  },
  skeletonBadge: {
    width: 60,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ECEAE5',
    marginLeft: 6,
  },
});
