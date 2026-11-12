import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { CheckSquare, Flame, HeartCrack, Clock } from 'lucide-react-native';

// Custom Count-Up Animation Hook for 60fps smooth page load animation
function useCountUp(target: number, duration: number = 850) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target <= 0) {
      setValue(0);
      return;
    }
    let startTime: number | null = null;
    let animId: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // easeOutCubic curve for delightful snappy landing
      const ease = 1 - Math.pow(1 - progress, 3);
      setValue(target * ease);

      if (progress < 1) {
        animId = requestAnimationFrame(animate);
      } else {
        setValue(target);
      }
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [target, duration]);

  return value;
}

// 7-Day Sparkline Bar Chart Sub-component
const MiniSparkline: React.FC<{
  bars: number[];
  color: string;
}> = React.memo(({ bars, color }) => {
  const maxVal = Math.max(...bars, 1);
  return (
    <View style={styles.sparklineContainer} pointerEvents="none">
      {bars.map((val, idx) => {
        const isToday = idx === bars.length - 1;
        const normalizedHeight = Math.max(3, Math.min(12, Math.round((val / maxVal) * 12)));
        const opacity = val > 0 ? (isToday ? 1 : 0.65) : 0.22;
        return (
          <View
            key={idx}
            style={[
              styles.sparklineBar,
              {
                height: normalizedHeight,
                backgroundColor: color,
                opacity,
              },
            ]}
          />
        );
      })}
    </View>
  );
});

interface QuickStatsProps {
  focusMinutes: number;
  tasksTotal: number;
  tasksDone: number;
  streakDays: number;
  isStreakBroken?: boolean;
  isLoading: boolean;
  onPressStreak?: () => void;
  weeklyActivity?: boolean[];
  sparklines?: {
    focus: number[];
    tasks: number[];
    streak: number[];
    focusMinutes7d?: number[];
    tasksDone7d?: number[];
  };
}

export const QuickStats = React.memo<QuickStatsProps>(({
  focusMinutes,
  tasksTotal,
  tasksDone,
  streakDays,
  isStreakBroken = false,
  isLoading,
  onPressStreak,
  sparklines,
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

  // Target values with real data support
  const targetMinutes = Math.max(0, Math.round(focusMinutes));
  const targetTasksDone = tasksDone || 0;
  const targetTasksTotal = tasksTotal || 0;
  const targetStreak = Math.max(0, streakDays);

  // Animated Count-Up values on page load
  const animatedMinutes = useCountUp(targetMinutes, 900);
  const animatedTasksDone = useCountUp(targetTasksDone, 750);
  const animatedStreak = useCountUp(targetStreak, 950);

  // Real 7-day sparkline bar profiles with graceful fallbacks
  const focusSparklines = useMemo(() => {
    if (sparklines?.focus && sparklines.focus.length === 7) {
      return sparklines.focus;
    }
    return [3, 8, 5, 12, 16, 9, 17];
  }, [sparklines?.focus]);

  const tasksSparklines = useMemo(() => {
    if (sparklines?.tasks && sparklines.tasks.length === 7) {
      return sparklines.tasks;
    }
    return [4, 9, 6, 14, 10, 12, 16];
  }, [sparklines?.tasks]);

  const streakSparklines = useMemo(() => {
    if (sparklines?.streak && sparklines.streak.length === 7) {
      return sparklines.streak;
    }
    return [5, 7, 8, 10, 13, 14, 17];
  }, [sparklines?.streak]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        {[1, 2, 3].map((key) => (
          <View key={key} style={styles.card}>
            <View style={styles.cardHeader}>
              <Animated.View style={[styles.skeletonIcon, pulseStyle]} />
              <Animated.View style={[styles.skeletonSparkline, pulseStyle]} />
            </View>
            <Animated.View style={[styles.skeletonNumber, pulseStyle]} />
            <Animated.View style={[styles.skeletonLabel, pulseStyle]} />
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tile 1 — Focus time */}
      <TouchableOpacity
        style={[styles.card, styles.focusCardBorder]}
        onPress={() => router.push('/(tabs)/focus')}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <Clock size={16} color="#6355F6" />
          {/* 7-Day Sparkline Bar Chart (Violet) */}
          <MiniSparkline bars={focusSparklines} color="#6355F6" />
        </View>
        <Text
          style={styles.number}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {`${Math.round(animatedMinutes)} min`}
        </Text>
        <Text style={styles.label} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          Focus time
        </Text>
      </TouchableOpacity>

      {/* Tile 2 — Tasks done */}
      <TouchableOpacity
        style={[styles.card, styles.tasksCardBorder]}
        onPress={() => router.push('/(tabs)/goals')}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <CheckSquare size={16} color="#10B981" />
          {/* 7-Day Sparkline Bar Chart (Emerald/Mint) */}
          <MiniSparkline bars={tasksSparklines} color="#10B981" />
        </View>
        <Text
          style={styles.number}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {targetTasksTotal > 0
            ? `${Math.round(animatedTasksDone)}/${targetTasksTotal}`
            : `${Math.round(animatedTasksDone)}`}
        </Text>
        <Text style={styles.label} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          Tasks done
        </Text>
      </TouchableOpacity>

      {/* Tile 3 — Day streak */}
      <TouchableOpacity
        style={[
          styles.card,
          styles.streakCardBorder,
          isStreakBroken && styles.brokenStreakCardBorder,
        ]}
        onPress={onPressStreak ? onPressStreak : () => router.push('/habits')}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          {isStreakBroken ? (
            <HeartCrack size={16} color="#EF4444" />
          ) : (
            <Flame size={16} color="#F59E0B" />
          )}
          {/* 7-Day Sparkline Bar Chart (Amber/Gold or Red if broken) */}
          <MiniSparkline bars={streakSparklines} color={isStreakBroken ? '#EF4444' : '#F59E0B'} />
        </View>
        <Text
          style={[styles.number, isStreakBroken && { color: '#EF4444' }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {Math.round(animatedStreak)}
        </Text>
        <Text
          style={[styles.label, isStreakBroken && { color: '#EF4444' }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {isStreakBroken ? 'Broken' : 'Day streak'}
        </Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 8,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    borderBottomWidth: 2.5,
    paddingTop: 10,
    paddingBottom: 9,
    paddingHorizontal: 10,
    minHeight: 82,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 6,
  },
  focusCardBorder: {
    borderBottomColor: '#6355F6',
  },
  tasksCardBorder: {
    borderBottomColor: '#10B981',
  },
  streakCardBorder: {
    borderBottomColor: '#F59E0B',
  },
  brokenStreakCardBorder: {
    borderColor: '#FCA5A5',
    borderBottomColor: '#EF4444',
    backgroundColor: '#FFF5F5',
  },
  iconEmoji: {
    fontSize: 15,
    lineHeight: 18,
    marginBottom: 3,
  },
  number: {
    fontFamily: 'DMSans-Bold',
    fontSize: 19,
    color: '#151624',
    letterSpacing: -0.3,
    marginBottom: 1,
  },
  label: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10.5,
    color: '#8E8EA0',
  },
  // Mini Sparkline Styles
  sparklineContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 14,
    gap: 2,
    paddingHorizontal: 3,
    paddingVertical: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.025)',
    borderRadius: 4,
  },
  sparklineBar: {
    width: 2.5,
    borderRadius: 1.25,
  },
  // Skeleton Styles
  skeletonIcon: {
    width: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: '#ECECEF',
  },
  skeletonSparkline: {
    width: 28,
    height: 12,
    borderRadius: 3,
    backgroundColor: '#ECECEF',
  },
  skeletonNumber: {
    width: 44,
    height: 18,
    borderRadius: 4,
    backgroundColor: '#ECECEF',
    marginBottom: 4,
  },
  skeletonLabel: {
    width: 50,
    height: 10,
    borderRadius: 3,
    backgroundColor: '#ECECEF',
  },
});
