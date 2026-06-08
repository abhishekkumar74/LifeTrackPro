import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Habit } from '@/types/app.types';

// Constants
const HEADER_TITLE = "Habits";
const EDIT_LABEL = "Edit";
const CHECK_MARK = "✓";
const EMPTY_TEXT = "Add your first habit →";
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {[1, 2, 3].map((key) => (
            <Animated.View key={key} style={[styles.skeletonPill, pulseStyle]} />
          ))}
        </ScrollView>
      </View>
    );
  }

  const total = habits.length;
  const completed = habits.filter(h => h.completedToday).length;
  const allDone = total > 0 && completed === total;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{HEADER_TITLE}</Text>
          {total > 0 && (
            <Text style={[styles.headerCount, allDone ? styles.countMint : styles.countViolet]}>
              {completed}/{total} done
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={onEdit} activeOpacity={0.6}>
          <Text style={styles.editText}>{EDIT_LABEL}</Text>
        </TouchableOpacity>
      </View>

      {habits.length === 0 ? (
        <TouchableOpacity style={styles.emptyButton} onPress={onEdit} activeOpacity={0.6}>
          <Text style={styles.emptyText}>{EMPTY_TEXT}</Text>
        </TouchableOpacity>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {habits.map((habit) => {
            const isDone = habit.completedToday;
            return (
              <TouchableOpacity
                key={habit.id}
                style={[
                  styles.pill,
                  isDone ? styles.pillComplete : styles.pillIncomplete,
                ]}
                onPress={() => onToggle(habit.id)}
                onLongPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                  router.push(`/habit/${habit.id}`);
                }}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {isDone ? (
                  <>
                    <Text style={styles.checkMark}>{CHECK_MARK}</Text>
                    <Text
                      style={[styles.habitName, styles.habitNameComplete]}
                      numberOfLines={1}
                    >
                      {habit.title}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.emoji}>{habit.emoji || '🔥'}</Text>
                    <Text
                      style={[styles.habitName, styles.habitNameIncomplete]}
                      numberOfLines={1}
                    >
                      {habit.title}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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
    marginBottom: 10,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#17172A',
    fontWeight: '600',
    marginRight: 6,
  },
  headerCount: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    fontWeight: '600',
  },
  countMint: {
    color: '#00B894',
  },
  countViolet: {
    color: '#5B4FE8',
  },
  editText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: '#5B4FE8',
    fontWeight: '500',
  },
  scrollContent: {
    paddingRight: 20, // allows sliding off-screen gracefully
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    height: 34,
  },
  pillIncomplete: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  pillComplete: {
    backgroundColor: '#D4F5EE',
    borderWidth: 1,
    borderColor: '#D4F5EE',
  },
  emoji: {
    fontSize: 14,
    marginRight: 6,
  },
  checkMark: {
    fontSize: 11,
    color: '#00B894',
    marginRight: 6,
    fontWeight: 'bold',
  },
  habitName: {
    fontFamily: 'DMSans',
    fontSize: 12,
  },
  habitNameIncomplete: {
    color: '#5C5C70',
  },
  habitNameComplete: {
    color: '#00B894',
    textDecorationLine: 'line-through',
  },
  emptyButton: {
    alignSelf: 'flex-start',
  },
  emptyText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#5B4FE8',
    fontWeight: '600',
  },
  // Skeleton Layouts
  skeletonPill: {
    width: 80,
    height: 34,
    borderRadius: 20,
    backgroundColor: '#E8E7E3',
    marginRight: 8,
  },
});
