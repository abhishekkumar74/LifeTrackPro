import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Play } from 'lucide-react-native';
import { Task } from '@/types/app.types';

// Constants
const LABEL_TODAYS_FOCUS = "TODAY'S FOCUS";
const BTN_START = "Start";

interface TodayFocusCardProps {
  task: Task | null;
  isLoading: boolean;
  onStartFocus: () => void;
  onAddTask?: () => void;
  onPressCard?: () => void;
  isCse?: boolean;
  userGoal?: string;
  firstIncompleteTopic?: { subject: string; topic: string; chapter?: string } | null;
}

const getSubjectEmoji = (subject: string): string => {
  const s = subject.toLowerCase();
  if (s.includes('physic')) return '🥼';
  if (s.includes('chem')) return '🧪';
  if (s.includes('math')) return '📐';
  if (s.includes('bio') || s.includes('botan') || s.includes('zool')) return '🧬';
  if (s.includes('comp') || s.includes('code') || s.includes('data') || s.includes('algo') || s.includes('cse')) return '💻';
  return '📚';
};

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
        <View style={styles.decorativeCircleOuter} />
        <View style={styles.decorativeCircleInner} />
        <View style={styles.content}>
          <Animated.View style={[styles.skeletonLabel, pulseStyle]} />
          <Animated.View style={[styles.skeletonTitle, pulseStyle]} />
          <Animated.View style={[styles.skeletonSub, pulseStyle]} />
          <View style={styles.bottomRow}>
            <Animated.View style={[styles.skeletonPill, pulseStyle]} />
            <Animated.View style={[styles.skeletonButton, pulseStyle]} />
          </View>
        </View>
      </View>
    );
  }

  // Determine display values
  let displayTitle = '';
  let displaySubject = '';
  let displayEstimate = 'Estimated 2h 30m';

  if (task) {
    displayTitle = task.title;
    displaySubject = task.subject || 'Physics';
    displayEstimate = 'Estimated 1h 45m';
  } else if (firstIncompleteTopic) {
    displayTitle = `${firstIncompleteTopic.chapter ? `${firstIncompleteTopic.chapter} — ` : ''}${firstIncompleteTopic.topic}`;
    displaySubject = firstIncompleteTopic.subject || (isCse ? 'Computer Science' : 'Physics');
    displayEstimate = 'Estimated 2h 30m';
  } else if (isCse) {
    displayTitle = 'Data Structures — Trees, Graphs & BFS/DFS';
    displaySubject = 'Computer Science';
    displayEstimate = 'Estimated 2h 00m';
  } else {
    // Exact default from user mock / image
    displayTitle = 'Thermodynamics — Laws 1, 2 & numericals';
    displaySubject = 'Physics';
    displayEstimate = 'Estimated 2h 30m';
  }

  const subjectEmoji = getSubjectEmoji(displaySubject);

  return (
    <View style={styles.container}>
      {/* Decorative curved shapes on top-right (as in user screenshot) */}
      <View style={styles.decorativeCircleOuter} pointerEvents="none" />
      <View style={styles.decorativeCircleInner} pointerEvents="none" />

      {/* Main Card Content */}
      <TouchableOpacity
        style={styles.content}
        onPress={task ? onPressCard : onStartFocus}
        activeOpacity={0.92}
      >
        {/* Top Header Label */}
        <Text style={styles.topLabel}>{LABEL_TODAYS_FOCUS}</Text>

        {/* Focus Task / Syllabus Title */}
        <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">
          {displayTitle}
        </Text>

        {/* Estimate & Subject Subtitle */}
        <Text style={styles.subtitle}>
          {`${displayEstimate} · ${displaySubject}`}
        </Text>

        {/* Bottom Actions Row */}
        <View style={styles.bottomRow}>
          {/* Subject Badge Pill */}
          <View style={styles.subjectPill}>
            <Text style={styles.subjectEmoji}>{subjectEmoji}</Text>
            <Text style={styles.subjectText}>{displaySubject}</Text>
          </View>

          {/* Start Focus Pill Button */}
          <TouchableOpacity
            style={styles.startButton}
            onPress={onStartFocus}
            activeOpacity={0.8}
            accessibilityLabel="Start Focus Session"
          >
            <Play size={13} color="#FFFFFF" fill="#FFFFFF" />
            <Text style={styles.startButtonText}>{BTN_START}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#131422',
    borderRadius: 24,
    marginTop: 16,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 8,
  },
  decorativeCircleOuter: {
    position: 'absolute',
    top: -55,
    right: -45,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(39, 36, 78, 0.45)',
  },
  decorativeCircleInner: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(51, 48, 102, 0.55)',
  },
  content: {
    padding: 18,
    zIndex: 2,
  },
  topLabel: {
    fontFamily: 'DMSans-Bold',
    fontSize: 11,
    color: '#8E8EA8',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    fontFamily: 'DMSans-Bold',
    fontSize: 19,
    color: '#FFFFFF',
    lineHeight: 25,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12.5,
    color: '#7E8098',
    marginBottom: 14,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subjectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  subjectEmoji: {
    fontSize: 12.5,
  },
  subjectText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 12.5,
    color: '#E0E0F0',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#5B4FE8',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
    shadowColor: '#5B4FE8',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 5,
  },
  startButtonText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  // Skeleton Styles
  skeletonLabel: {
    width: 90,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginBottom: 10,
  },
  skeletonTitle: {
    width: '85%',
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginBottom: 10,
  },
  skeletonSub: {
    width: '55%',
    height: 14,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    marginBottom: 20,
  },
  skeletonPill: {
    width: 90,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  skeletonButton: {
    width: 80,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(91, 79, 232, 0.35)',
  },
});
