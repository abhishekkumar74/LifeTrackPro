import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';

// Constants
const LABEL_FOCUS = "Focus today";
const LABEL_TASKS = "Tasks done";
const LABEL_STREAK = "Day streak";
const ICON_FOCUS = "⏱️";
const ICON_TASKS = "✅";
const ICON_STREAK = "🔥";
const SHADOW_COLOR = '#000000';
const BORDER_COLOR = '#E8E7E3';

interface QuickStatsProps {
  focusMinutes: number;
  tasksTotal: number;
  tasksDone: number;
  streakDays: number;
  isLoading: boolean;
}

export const QuickStats: React.FC<QuickStatsProps> = ({
  focusMinutes,
  tasksTotal,
  tasksDone,
  streakDays,
  isLoading,
}) => {
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
        {[1, 2, 3].map((key) => (
          <View key={key} style={styles.card}>
            <Animated.View style={[styles.skeletonIcon, pulseStyle]} />
            <Animated.View style={[styles.skeletonNumber, pulseStyle]} />
            <Animated.View style={[styles.skeletonLabel, pulseStyle]} />
          </View>
        ))}
      </View>
    );
  }

  // Format focus time based on spec
  const getFocusDisplay = (mins: number) => {
    const hours = mins / 60;
    if (hours === 0) return '0h';
    if (hours < 1) return `${mins}m`;
    if (hours % 1 === 0) return `${hours}h`;
    return `${hours.toFixed(1)}h`;
  };

  const focusDisplay = getFocusDisplay(focusMinutes);
  const tasksRatio = `${tasksDone}/${tasksTotal}`;

  return (
    <View style={styles.container}>
      {/* Card 1 - Focus */}
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push('/(tabs)/focus')}
        activeOpacity={0.7}
      >
        <Text style={styles.icon}>{ICON_FOCUS}</Text>
        <Text style={styles.number}>{focusDisplay}</Text>
        <Text style={styles.label}>{LABEL_FOCUS}</Text>
      </TouchableOpacity>

      {/* Card 2 - Tasks */}
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push('/(tabs)/goals')}
        activeOpacity={0.7}
      >
        <Text style={styles.icon}>{ICON_TASKS}</Text>
        <Text style={styles.number}>{tasksRatio}</Text>
        <Text style={styles.label}>{LABEL_TASKS}</Text>
      </TouchableOpacity>

      {/* Card 3 - Streak */}
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push('/habits')}
        activeOpacity={0.7}
      >
        <Text style={styles.icon}>{ICON_STREAK}</Text>
        <Text style={styles.number}>{streakDays}</Text>
        <Text style={styles.label}>{LABEL_STREAK}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginHorizontal: 4, // creates uniform spacing with gap-like feel
    alignItems: 'flex-start',
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  icon: {
    fontSize: 18,
    marginBottom: 4,
  },
  number: {
    fontFamily: 'DMMono',
    fontSize: 22,
    color: '#17172A',
    fontWeight: '600',
    marginBottom: 2,
  },
  label: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#9B9BAF',
  },
  // Skeleton styles
  skeletonIcon: {
    width: 20,
    height: 20,
    backgroundColor: '#E8E7E3',
    borderRadius: 4,
    marginBottom: 6,
  },
  skeletonNumber: {
    width: 45,
    height: 22,
    backgroundColor: '#E8E7E3',
    borderRadius: 4,
    marginBottom: 6,
  },
  skeletonLabel: {
    width: 60,
    height: 10,
    backgroundColor: '#E8E7E3',
    borderRadius: 2,
  },
});
