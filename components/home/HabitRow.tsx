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
import * as Haptics from 'expo-haptics';
import { Check } from 'lucide-react-native';
import { Habit } from '@/types/app.types';

// Constants
const HEADER_TITLE = "Habits";
const EDIT_LABEL = "Edit";
const EMPTY_TITLE = "No habits tracked yet";
const EMPTY_LINK = "+ Add your first habit";
const BORDER_COLOR = '#E8E7E3';

interface HabitRowProps {
  habits: (Habit & { completedToday: boolean })[];
  isLoading: boolean;
  onToggle: (habitId: string) => void;
  onEdit: () => void;
}

export const HabitRow = React.memo<HabitRowProps>(({
  habits,
  isLoading,
  onToggle,
  onEdit,
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
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>{HEADER_TITLE}</Text>
          <Text style={styles.editText}>{EDIT_LABEL}</Text>
        </View>
        <View style={styles.habitsWrapper}>
          {[1, 2, 3, 4].map((key) => (
            <Animated.View key={key} style={[styles.skeletonCard, pulseStyle]} />
          ))}
        </View>
      </View>
    );
  }

  const total = habits.length;
  const completed = habits.filter(h => h.completedToday).length;
  const allDone = total > 0 && completed === total;

  return (
    <View style={styles.container}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>{HEADER_TITLE}</Text>
          {total > 0 && (
            <View style={[styles.badge, allDone && styles.badgeAllDone]}>
              <Text style={[styles.badgeText, allDone && styles.badgeTextAllDone]}>
                {completed}/{total} done
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity 
          onPress={onEdit} 
          activeOpacity={0.6}
          accessibilityLabel="Edit habits"
          accessibilityRole="button"
          accessibilityHint="Open habit management screen"
        >
          <Text style={styles.editText}>{EDIT_LABEL}</Text>
        </TouchableOpacity>
      </View>

      {/* Habits Content */}
      {habits.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>{EMPTY_TITLE}</Text>
          <TouchableOpacity onPress={onEdit} activeOpacity={0.6}>
            <Text style={styles.emptyLink}>{EMPTY_LINK}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.habitsWrapper}>
          {habits.map((habit) => {
            const isDone = habit.completedToday;
            return (
              <TouchableOpacity
                key={habit.id}
                style={[
                  styles.habitCard,
                  isDone ? styles.habitCardComplete : styles.habitCardIncomplete,
                ]}
                onPress={() => onToggle(habit.id)}
                onLongPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                  router.push(`/habit/${habit.id}`);
                }}
                activeOpacity={0.7}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                accessibilityState={{ checked: isDone }}
                accessibilityRole="checkbox"
                accessibilityLabel={`${habit.title} habit, ${isDone ? 'completed' : 'not completed'}`}
                accessibilityHint="Tap to toggle completion status, long press to view habit history and stats"
              >
                {/* Status Indicator */}
                <View style={[styles.checkCircle, isDone && styles.checkCircleComplete]}>
                  {isDone ? (
                    <Check size={11} color="#FFFFFF" strokeWidth={3} />
                  ) : null}
                </View>

                {/* Emoji */}
                <Text style={styles.emoji}>{habit.emoji || '🔥'}</Text>

                {/* Habit Title */}
                <Text
                  style={[
                    styles.habitName,
                    isDone ? styles.habitNameComplete : styles.habitNameIncomplete,
                  ]}
                  numberOfLines={1}
                >
                  {habit.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 16,
    color: '#17172A',
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  badge: {
    backgroundColor: '#EAE8FD',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 10,
  },
  badgeAllDone: {
    backgroundColor: '#ECFDF5',
  },
  badgeText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 11,
    color: '#5B4FE8',
    fontWeight: '700',
  },
  badgeTextAllDone: {
    color: '#059669',
  },
  editText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#5B4FE8',
    fontWeight: '600',
  },
  habitsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
  },
  habitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  habitCardIncomplete: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  habitCardComplete: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  checkCircle: {
    width: 17,
    height: 17,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#C4C4D4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checkCircleComplete: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  emoji: {
    fontSize: 14,
    marginRight: 6,
  },
  habitName: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    fontWeight: '600',
  },
  habitNameIncomplete: {
    color: '#17172A',
  },
  habitNameComplete: {
    color: '#15803D',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: 'DMSans',
    fontSize: 13,
    color: '#9B9BAF',
    marginBottom: 4,
  },
  emptyLink: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#5B4FE8',
    fontWeight: '600',
  },
  // Skeleton Layouts
  skeletonCard: {
    width: '48%',
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ECECEF',
  },
});
