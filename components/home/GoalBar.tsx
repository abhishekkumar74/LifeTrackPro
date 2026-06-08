import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { Goal } from '@/types/app.types';
import { calculateOnTrackStatus } from '@/lib/utils/on-track';
import { getTodayLocal } from '@/lib/utils/date';

// Constants
const EMPTY_STATE = "Set your big goal 🎯";
const NO_TASKS_SUBTEXT = "Add milestones to track progress";
const STATUS_LABELS = {
  on_track: 'On track',
  at_risk: 'At risk',
  behind: 'Behind',
};
const SHADOW_COLOR = '#000000';
const BORDER_COLOR = '#E8E7E3';

// SVG constants
const CIRCLE_RADIUS = 18;
const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS; // ~113.1

interface GoalBarProps {
  goal: (Goal & { totalTasks: number; doneTasks: number }) | null;
  isLoading: boolean;
}

export const GoalBar = React.memo<GoalBarProps>(({ goal, isLoading }) => {
  const router = useRouter();
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

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

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

  const handlePress = () => {
    router.push('/(tabs)/goals');
  };

  if (!goal) {
    return (
      <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.7}>
        <Text style={styles.emptyText}>{EMPTY_STATE}</Text>
      </TouchableOpacity>
    );
  }

  const progress = goal.totalTasks > 0 ? goal.doneTasks / goal.totalTasks : 0;
  const progressPercent = Math.round(progress * 100);
  const strokeOffset = CIRCUMFERENCE * (1 - progress);

  // Calculate days left using getTodayLocal()
  const todayStr = getTodayLocal();
  const today = new Date(todayStr);
  today.setHours(0, 0, 0, 0);

  const deadline = new Date(goal.deadline);
  deadline.setHours(0, 0, 0, 0);

  const timeDiff = deadline.getTime() - today.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

  let daysLeftText = '';
  let daysTextColor = '#9B9BAF';
  if (daysDiff > 0) {
    daysLeftText = `${daysDiff} days left`;
  } else if (daysDiff === 0) {
    daysLeftText = `Due today`;
  } else {
    daysLeftText = `Overdue`;
    daysTextColor = '#E85858'; // coral
  }

  // Track status
  const status = calculateOnTrackStatus(
    goal.created_at || new Date().toISOString(),
    goal.deadline,
    goal.doneTasks,
    goal.totalTasks
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
    <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.7}>
      {/* SVG Progress Ring */}
      <View style={styles.ringContainer}>
        <Svg width="44" height="44" viewBox="0 0 44 44">
          {/* Track */}
          <Circle
            cx="22"
            cy="22"
            r={CIRCLE_RADIUS}
            stroke="#E8E7E3"
            strokeWidth="3.5"
            fill="transparent"
          />
          {/* Progress Arc */}
          <Circle
            cx="22"
            cy="22"
            r={CIRCLE_RADIUS}
            stroke="#5B4FE8"
            strokeWidth="3.5"
            fill="transparent"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeOffset}
            strokeLinecap="round"
            transform="rotate(-90 22 22)"
          />
          {/* Percentage text */}
          <SvgText
            x="22"
            y="25"
            textAnchor="middle"
            fontSize="10"
            fontFamily="DMMono"
            fontWeight="600"
            fill="#17172A"
          >
            {`${progressPercent}%`}
          </SvgText>
        </Svg>
      </View>

      {/* Goal Details */}
      <View style={styles.middleArea}>
        <Text style={styles.goalName} numberOfLines={1}>
          {goal.title}
        </Text>
        {goal.totalTasks === 0 ? (
          <Text style={styles.noTasksText}>{NO_TASKS_SUBTEXT}</Text>
        ) : (
          <Text style={[styles.daysText, { color: daysTextColor }]}>{daysLeftText}</Text>
        )}
      </View>

      {/* Status Badge */}
      {goal.totalTasks > 0 && (
        <View style={[styles.statusBadge, { backgroundColor: statusTheme.bg }]}>
          <Text style={[styles.statusBadgeText, { color: statusTheme.text }]}>
            {STATUS_LABELS[status]}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  ringContainer: {
    marginRight: 12,
  },
  middleArea: {
    flex: 1,
    justifyContent: 'center',
  },
  goalName: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#17172A',
    fontWeight: '600',
  },
  daysText: {
    fontFamily: 'DMSans',
    fontSize: 11,
    marginTop: 2,
  },
  noTasksText: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#9B9BAF',
    marginTop: 2,
  },
  statusBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgeText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    fontWeight: '600',
  },
  emptyText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 15,
    color: '#9B9BAF',
    textAlign: 'center',
    width: '100%',
    paddingVertical: 4,
  },
  // Skeleton Layouts
  skeletonRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8E7E3',
    marginRight: 12,
  },
  skeletonTitle: {
    width: 120,
    height: 13,
    backgroundColor: '#E8E7E3',
    borderRadius: 4,
    marginBottom: 6,
  },
  skeletonDays: {
    width: 70,
    height: 11,
    backgroundColor: '#E8E7E3',
    borderRadius: 2,
  },
  skeletonBadge: {
    width: 60,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E8E7E3',
  },
});
