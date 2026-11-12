import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Play, BookOpen, Code, Video, Briefcase, Target } from 'lucide-react-native';
import { Task, ScheduleBlock } from '@/types/app.types';

const BTN_START = "Start";

export interface FocusStartPayload {
  subject?: string;
  goal?: string;
  routineBlockId?: string;
  startTime?: string;
  endTime?: string;
}

interface TodayFocusCardProps {
  task: Task | null;
  activeBlock?: ScheduleBlock | null;
  isLoading: boolean;
  onStartFocus: (target?: FocusStartPayload) => void;
  onAddTask?: () => void;
  onPressCard?: () => void;
  isCse?: boolean;
  userGoal?: string;
  firstIncompleteTopic?: { subject: string; topic: string; chapter?: string } | null;
  category?: string;
  primaryGoalMilestone?: string | null;
}

const formatTimeString = (timeStr: string) => {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
};

const getSubjectIcon = (subject: string, cat?: string) => {
  const s = subject.toLowerCase();
  if (cat === 'creator' || s.includes('video') || s.includes('content') || s.includes('script')) {
    return <Video size={13} color="#A78BFA" />;
  }
  if (cat === 'entrepreneur' || s.includes('strategy') || s.includes('product') || s.includes('business')) {
    return <Target size={13} color="#FBBF24" />;
  }
  if (cat === 'employee' || s.includes('project') || s.includes('work') || s.includes('deliverable')) {
    return <Briefcase size={13} color="#60A5FA" />;
  }
  if (s.includes('code') || s.includes('data') || s.includes('algo') || s.includes('cse') || s.includes('dsa') || s.includes('java')) {
    return <Code size={13} color="#34D399" />;
  }
  return <BookOpen size={13} color="#A78BFA" />;
};

export const TodayFocusCard = React.memo<TodayFocusCardProps>(({
  task,
  activeBlock,
  isLoading,
  onStartFocus,
  onAddTask,
  onPressCard,
  isCse,
  userGoal,
  firstIncompleteTopic,
  category,
  primaryGoalMilestone,
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

  // Determine display values with intelligent priority:
  // 1. Live Scheduled Routine Block happening NOW
  // 2. High priority Task due today
  // 3. Next Syllabus Topic or general focus
  let displayBadge = "RECOMMENDED FOCUS";
  let displayTitle = '';
  let displaySubject = '';
  let displayEstimate = 'Estimated 2h 30m';
  let isLiveNow = false;

  if (activeBlock) {
    isLiveNow = true;
    displayBadge = "HAPPENING NOW";
    displayTitle = activeBlock.title;
    displaySubject = activeBlock.subject || (isCse ? 'Computer Science' : 'General');
    const startFormatted = formatTimeString(activeBlock.start_time);
    const endFormatted = formatTimeString(activeBlock.end_time);
    displayEstimate = `${startFormatted} – ${endFormatted}`;
  } else if (task) {
    displayBadge = "PRIORITY TASK";
    displayTitle = task.title;
    displaySubject = task.subject || 'General';
    displayEstimate = 'Due today';
  } else if (primaryGoalMilestone) {
    displayBadge = "RECOMMENDED FOCUS";
    displayTitle = primaryGoalMilestone;
    displaySubject = userGoal || (isCse ? 'Interview Prep' : 'Primary Goal');
    displayEstimate = 'Estimated 1h 30m';
  } else if (firstIncompleteTopic) {
    displayBadge = "RECOMMENDED FOCUS";
    displayTitle = `${firstIncompleteTopic.chapter ? `${firstIncompleteTopic.chapter} — ` : ''}${firstIncompleteTopic.topic}`;
    displaySubject = firstIncompleteTopic.subject || (isCse ? 'Computer Science' : 'Core Study');
    displayEstimate = 'Estimated 1h 45m';
  } else {
    displayBadge = "RECOMMENDED FOCUS";
    switch (category) {
      case 'creator':
        displayTitle = 'Script Writing & Video Editing — Next Upload';
        displaySubject = 'Content Creation';
        displayEstimate = 'Estimated 2h 00m';
        break;
      case 'entrepreneur':
        displayTitle = 'Product Development & Core Roadmap Sprint';
        displaySubject = 'Strategy & Growth';
        displayEstimate = 'Estimated 2h 00m';
        break;
      case 'employee':
        displayTitle = 'Deep Work Sprint — High Impact Deliverable';
        displaySubject = 'Project Execution';
        displayEstimate = 'Estimated 2h 00m';
        break;
      case 'aspirant':
        displayTitle = 'Comprehensive Revision & Practice Mock';
        displaySubject = 'General Studies';
        displayEstimate = 'Estimated 2h 30m';
        break;
      case 'cse_student':
        displayTitle = 'Data Structures — Trees, Graphs & BFS/DFS';
        displaySubject = 'Computer Science';
        displayEstimate = 'Estimated 2h 00m';
        break;
      case 'student':
      default:
        displayTitle = userGoal ? `${userGoal} — Core Revision` : 'Deep Focus Session — Active Recall & Practice';
        displaySubject = isCse ? 'Computer Science' : 'Core Study';
        displayEstimate = 'Estimated 2h 00m';
        break;
    }
  }

  const handleStartPress = () => {
    if (activeBlock) {
      onStartFocus({
        subject: displaySubject,
        goal: activeBlock.title,
        routineBlockId: activeBlock.id,
        startTime: activeBlock.start_time,
        endTime: activeBlock.end_time,
      });
    } else if (task) {
      onStartFocus({
        subject: displaySubject,
        goal: task.title,
      });
    } else {
      onStartFocus({
        subject: displaySubject,
        goal: displayTitle,
      });
    }
  };

  const handleCardPress = () => {
    if (activeBlock) {
      handleStartPress();
    } else if (task && onPressCard) {
      onPressCard();
    } else {
      handleStartPress();
    }
  };

  return (
    <View style={styles.container}>
      {/* Decorative curved shapes on top-right */}
      <View style={styles.decorativeCircleOuter} pointerEvents="none" />
      <View style={styles.decorativeCircleInner} pointerEvents="none" />

      {/* Main Card Content */}
      <TouchableOpacity
        style={styles.content}
        onPress={handleCardPress}
        activeOpacity={0.92}
      >
        {/* Top Header Label */}
        <View style={styles.topLabelRow}>
          {isLiveNow && <View style={styles.livePulseDot} />}
          <Text style={[styles.topLabel, isLiveNow && styles.topLabelLive]}>
            {displayBadge}
          </Text>
        </View>

        {/* Focus Task / Routine Title */}
        <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">
          {displayTitle}
        </Text>

        {/* Estimate & Time Subtitle */}
        <Text style={styles.subtitle} numberOfLines={1} ellipsizeMode="tail">
          {`${displayEstimate} · ${displaySubject}`}
        </Text>

        {/* Bottom Actions Row */}
        <View style={styles.bottomRow}>
          {/* Subject Badge Pill */}
          <View style={styles.subjectPill}>
            {getSubjectIcon(displaySubject, category)}
            <Text style={styles.subjectText} numberOfLines={1} ellipsizeMode="tail">
              {displaySubject}
            </Text>
          </View>

          {/* Start Focus Pill Button */}
          <TouchableOpacity
            style={[styles.startButton, isLiveNow && styles.startButtonLive]}
            onPress={handleStartPress}
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
  topLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  topLabel: {
    fontFamily: 'DMSans-Bold',
    fontSize: 11,
    color: '#8E8EA8',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  topLabelLive: {
    color: '#34D399',
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
    gap: 10,
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
    flexShrink: 1,
    maxWidth: '65%',
  },
  subjectEmoji: {
    fontSize: 12.5,
  },
  subjectText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 12.5,
    color: '#E0E0F0',
    flexShrink: 1,
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
    flexShrink: 0,
  },
  startButtonLive: {
    backgroundColor: '#059669',
    shadowColor: '#10B981',
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
