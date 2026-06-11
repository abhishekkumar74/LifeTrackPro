import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Task } from '@/types/app.types';
import { getSubjectColor, getSubjectBgColor } from '@/lib/utils/subject-colors';

// Constants
const LABEL_TODAYS_FOCUS = "TODAY'S FOCUS";
const LABEL_NO_TASKS = "What will you focus on today?";
const BTN_ADD_TASK = "+ Add today's task";
const BTN_START = "▶ Start";
const SHADOW_COLOR = '#000000';
const BORDER_COLOR = '#E8E7E3';

interface TodayFocusCardProps {
  task: Task | null;
  isLoading: boolean;
  onStartFocus: () => void;
  onAddTask?: () => void;
  onPressCard?: () => void;
  isCse?: boolean;
  userGoal?: string;
  firstIncompleteTopic?: { subject: string; topic: string } | null;
}

export const TodayFocusCard = React.memo<TodayFocusCardProps>(({
  task,
  isLoading,
  onStartFocus,
  onAddTask,
  onPressCard,
  isCse,
  userGoal,
  firstIncompleteTopic,
}) => {
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
        <View style={styles.leftAccentBarSkeleton} />
        <View style={styles.contentArea}>
          <Animated.View style={[styles.skeletonLabel, pulseStyle]} />
          <Animated.View style={[styles.skeletonTitle, pulseStyle]} />
          <Animated.View style={[styles.skeletonChip, pulseStyle]} />
        </View>
        <View style={styles.rightAreaSkeleton}>
          <Animated.View style={[styles.skeletonButton, pulseStyle]} />
        </View>
      </View>
    );
  }

  const isInterviewPrep = !userGoal || 
    userGoal.includes('Amazon') || 
    userGoal.includes('Google') || 
    userGoal.includes('Microsoft') || 
    userGoal.includes('Meta') || 
    userGoal.includes('FAANG') || 
    userGoal.includes('SDE') || 
    userGoal.includes('SWE') || 
    userGoal.includes('Placement') ||
    userGoal.includes('GATE');

  const cardLabel = isCse 
    ? (isInterviewPrep ? "INTERVIEW PREP" : "TODAY'S CODING")
    : LABEL_TODAYS_FOCUS;

  // Determine display title and subject
  let displayTitle = '';
  let displaySubject = '';

  if (task) {
    displayTitle = task.title;
    displaySubject = task.subject || '';
  } else if (isCse) {
    if (isInterviewPrep) {
      displayTitle = "2hr DSA practice";
      displaySubject = "Data Structures & Algorithms";
    } else {
      displayTitle = firstIncompleteTopic 
        ? `Practice: ${firstIncompleteTopic.topic}` 
        : "2hr Backend practice";
      displaySubject = firstIncompleteTopic 
        ? firstIncompleteTopic.subject 
        : "Backend Development";
    }
  }

  const subjectTheme = displaySubject
    ? { text: getSubjectColor(displaySubject), bg: getSubjectBgColor(getSubjectColor(displaySubject)) }
    : { text: '#5C5C70', bg: '#F5F5F7' };

  const showTaskContent = !!task || isCse;
  const showStartButton = !!task || isCse;

  return (
    <View style={styles.container}>
      {/* Left accent bar */}
      <View style={styles.leftAccentBar} />

      {/* Content Touch Target */}
      <TouchableOpacity
        style={styles.contentArea}
        onPress={task ? onPressCard : (isCse ? onStartFocus : onAddTask)}
        activeOpacity={0.7}
      >
        <Text style={styles.topLabel}>{cardLabel}</Text>
        {showTaskContent ? (
          <>
            <Text style={styles.taskTitle} numberOfLines={2} ellipsizeMode="tail">
              {displayTitle}
            </Text>
            {displaySubject ? (
              <View style={[styles.subjectChip, { backgroundColor: subjectTheme.bg }]}>
                <Text style={[styles.subjectText, { color: subjectTheme.text }]}>
                  {displaySubject}
                </Text>
              </View>
            ) : null}
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{LABEL_NO_TASKS}</Text>
            <TouchableOpacity onPress={onAddTask} activeOpacity={0.6} style={styles.emptyAddBtn}>
              <Text style={styles.emptyAddText}>{BTN_ADD_TASK}</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>

      {/* Right start button */}
      {showStartButton && (
        <View style={styles.rightArea}>
          <TouchableOpacity
            style={styles.startButton}
            onPress={onStartFocus}
            activeOpacity={0.8}
          >
            <Text style={styles.startButtonText}>{BTN_START}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    marginTop: 16,
    overflow: 'hidden',
    flexDirection: 'row',
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 2,
  },
  leftAccentBar: {
    width: 4,
    backgroundColor: '#5B4FE8',
  },
  contentArea: {
    flex: 1,
    padding: 16,
  },
  topLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    color: '#9B9BAF',
    letterSpacing: 1.2,
  },
  taskTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    color: '#17172A',
    fontWeight: '600',
    marginTop: 4,
  },
  emptyContainer: {
    marginTop: 4,
  },
  emptyText: {
    fontFamily: 'DMSans',
    fontSize: 15,
    color: '#9B9BAF',
  },
  emptyAddBtn: {
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  emptyAddText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: '#5B4FE8',
    fontWeight: '600',
  },
  subjectChip: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  subjectText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    fontWeight: '500',
  },
  rightArea: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#5B4FE8',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#5B4FE8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    fontWeight: '600',
  },
  // Skeleton styling
  leftAccentBarSkeleton: {
    width: 4,
    backgroundColor: '#E8E7E3',
  },
  skeletonLabel: {
    width: 80,
    height: 10,
    backgroundColor: '#E8E7E3',
    borderRadius: 2,
    marginBottom: 6,
  },
  skeletonTitle: {
    width: 160,
    height: 16,
    backgroundColor: '#E8E7E3',
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonChip: {
    width: 60,
    height: 18,
    backgroundColor: '#E8E7E3',
    borderRadius: 10,
  },
  rightAreaSkeleton: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skeletonButton: {
    width: 70,
    height: 32,
    backgroundColor: '#E8E7E3',
    borderRadius: 10,
  },
});
