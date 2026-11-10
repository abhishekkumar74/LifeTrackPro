import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, AlertButton } from 'react-native';
import { Goal, Milestone } from '@/types/app.types';
import { ProgressRing } from './ProgressRing';
import { calculateOnTrackStatus } from '@/lib/utils/on-track';
import { formatDeadline } from '@/lib/utils/date';
import { MoreVertical, Plus, Check, ChevronDown, ChevronUp } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// Constants
const LABEL_BIG_GOAL = 'BIG GOAL';
const SHADOW_COLOR = '#000000';
const BORDER_COLOR = '#E8E7E3';

interface GoalCardProps {
  goal: Goal & {
    totalTasks: number;
    doneTasks: number;
    milestones: Milestone[];
  };
  onPress?: () => void;
  isPrimary: boolean;
  onAddMilestone?: (goalId: string) => void;
  onQuickAddMilestone?: (goalId: string, title: string) => void;
  onToggleMilestoneStatus?: (
    milestoneId: string,
    goalId: string,
    currentStatus: 'pending' | 'completed'
  ) => void;
  onToggleStatus?: (
    goalId: string,
    currentStatus: 'active' | 'achieved',
    title: string,
    remainingItems: number
  ) => void;
  onDeleteGoal?: (goalId: string, title: string) => void;
}

// Smart Milestone Suggestions based on Goal Title & Category
const getMilestoneSuggestions = (
  goalTitle: string,
  category?: string,
  existingMilestoneTitles: string[] = []
): string[] => {
  const lowerTitle = `${goalTitle} ${category || ''}`.toLowerCase();
  let pool: string[] = [];

  if (
    lowerTitle.includes('placement') ||
    lowerTitle.includes('job') ||
    lowerTitle.includes('intern') ||
    lowerTitle.includes('career') ||
    lowerTitle.includes('dsa') ||
    lowerTitle.includes('cse')
  ) {
    pool = [
      'Complete DSA Patterns',
      'System Design & OS',
      '2 Fullstack Projects',
      'Resume & Mock Interview',
    ];
  } else if (
    lowerTitle.includes('exam') ||
    lowerTitle.includes('gate') ||
    lowerTitle.includes('upsc') ||
    lowerTitle.includes('cat') ||
    lowerTitle.includes('jee') ||
    lowerTitle.includes('study')
  ) {
    pool = [
      'Syllabus First Pass',
      'PYQ Practice (5 Years)',
      'Short Notes Revision',
      '5 Full-length Mocks',
    ];
  } else if (
    lowerTitle.includes('fit') ||
    lowerTitle.includes('health') ||
    lowerTitle.includes('gym') ||
    lowerTitle.includes('weight')
  ) {
    pool = [
      'Calorie Deficit Routine',
      '4x Weekly Workouts',
      '10k Daily Steps',
      'Body Composition Check',
    ];
  } else if (
    lowerTitle.includes('app') ||
    lowerTitle.includes('code') ||
    lowerTitle.includes('software') ||
    lowerTitle.includes('dev') ||
    lowerTitle.includes('build')
  ) {
    pool = [
      'Architecture & DB Schema',
      'MVP Core Features',
      'Beta Testing & Feedback',
      'Production Launch',
    ];
  } else {
    pool = [
      'Phase 1: Foundations',
      'Phase 2: Core Sprint',
      'Phase 3: Review & Polish',
      'Final Milestone',
    ];
  }

  // Filter out already existing milestones
  const existingSet = new Set(existingMilestoneTitles.map((t) => t.toLowerCase().trim()));
  return pool.filter((p) => !existingSet.has(p.toLowerCase().trim()));
};

export const GoalCard = React.memo<GoalCardProps>(({
  goal,
  onPress,
  isPrimary,
  onAddMilestone,
  onQuickAddMilestone,
  onToggleMilestoneStatus,
  onToggleStatus,
  onDeleteGoal,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const deadlineFormatted = formatDeadline(goal.deadline);

  // Raw Days Left Calculation
  const getRawDaysLeft = (deadlineStr: string): number => {
    if (!deadlineStr) return 0;
    const target = new Date(deadlineStr);
    target.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const rawDaysLeft = getRawDaysLeft(goal.deadline);

  const getTimelineLabel = (timeline: string) => {
    switch (timeline) {
      case '3M': return '3 Months';
      case '6M': return '6 Months';
      case '1Y': return '1 Year';
      case '2Y': return '2 Years';
      case '5Y': return '5 Years';
      default: return timeline;
    }
  };

  const timelineLabel = getTimelineLabel(goal.timeline);
  const metaText = `${timelineLabel} · Due ${deadlineFormatted}`;

  // Combined Progress Calculation (Tasks + Milestones)
  const totalMilestones = goal.milestones.length;
  const doneMilestones = goal.milestones.filter((m) => m.status === 'completed').length;
  const totalItems = goal.totalTasks + totalMilestones;
  const doneItems = goal.doneTasks + doneMilestones;

  const progressRatio =
    goal.status === 'achieved'
      ? 1
      : totalItems > 0
      ? doneItems / totalItems
      : 0;

  const remainingItems = totalItems - doneItems;

  // Dynamic Status Badge Calculation with dark mode variants for Primary Card
  const getDynamicStatusTheme = () => {
    if (goal.status === 'achieved') {
      return {
        bg: 'rgba(0, 184, 148, 0.15)',
        text: '#00B894',
        bgPrimary: 'rgba(16, 185, 129, 0.20)',
        borderPrimary: 'rgba(16, 185, 129, 0.40)',
        textPrimary: '#34D399',
        label: 'Achieved',
      };
    }

    if (rawDaysLeft < 0) {
      const absDays = Math.abs(rawDaysLeft);
      return {
        bg: 'rgba(232, 88, 88, 0.15)',
        text: '#E85858',
        bgPrimary: 'rgba(239, 68, 68, 0.18)',
        borderPrimary: 'rgba(239, 68, 68, 0.35)',
        textPrimary: '#F87171',
        label: `Expired (${absDays}d overdue)`,
      };
    }

    if (rawDaysLeft === 0) {
      return {
        bg: 'rgba(232, 160, 32, 0.18)',
        text: '#E8A020',
        bgPrimary: 'rgba(245, 158, 11, 0.18)',
        borderPrimary: 'rgba(245, 158, 11, 0.35)',
        textPrimary: '#FBBF24',
        label: 'Due Today',
      };
    }

    const statusType = calculateOnTrackStatus(
      goal.created_at || new Date().toISOString(),
      goal.deadline,
      goal.doneTasks,
      goal.totalTasks
    );

    switch (statusType) {
      case 'on_track':
        return {
          bg: '#D4F5EE',
          text: '#00B894',
          bgPrimary: 'rgba(16, 185, 129, 0.18)',
          borderPrimary: 'rgba(16, 185, 129, 0.35)',
          textPrimary: '#34D399',
          label: 'On track',
        };
      case 'at_risk':
        return {
          bg: '#FEF3DC',
          text: '#E8A020',
          bgPrimary: 'rgba(245, 158, 11, 0.18)',
          borderPrimary: 'rgba(245, 158, 11, 0.35)',
          textPrimary: '#FBBF24',
          label: 'At risk',
        };
      case 'behind':
      default:
        return {
          bg: '#FDE8E8',
          text: '#E85858',
          bgPrimary: 'rgba(239, 68, 68, 0.18)',
          borderPrimary: 'rgba(239, 68, 68, 0.35)',
          textPrimary: '#F87171',
          label: 'Behind',
        };
    }
  };

  const statusTheme = getDynamicStatusTheme();

  const renderDaysLeftText = () => {
    if (goal.status === 'achieved') return 'Achieved';
    if (rawDaysLeft < 0) return `${Math.abs(rawDaysLeft)}d overdue`;
    if (rawDaysLeft === 0) return 'Due Today';
    return `${rawDaysLeft}d`;
  };

  const handlePress = () => {
    setIsExpanded(!isExpanded);
    if (onPress) {
      onPress();
    }
  };

  const handleOpenOptions = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const buttons: AlertButton[] = [];

    if (onToggleStatus) {
      if (goal.status === 'achieved') {
        buttons.push({
          text: 'Re-activate Goal',
          onPress: () => {
            setTimeout(() => {
              onToggleStatus(goal.id, 'achieved', goal.title, remainingItems);
            }, 100);
          },
        });
      } else {
        buttons.push({
          text: 'Mark as Achieved',
          onPress: () => {
            setTimeout(() => {
              onToggleStatus(goal.id, 'active', goal.title, remainingItems);
            }, 100);
          },
        });
      }
    }

    if (onDeleteGoal) {
      buttons.push({
        text: 'Delete Goal',
        style: 'destructive',
        onPress: () => {
          setTimeout(() => {
            onDeleteGoal(goal.id, goal.title);
          }, 100);
        },
      });
    }

    buttons.push({
      text: 'Cancel',
      style: 'cancel',
    });

    Alert.alert(goal.title, 'Goal actions', buttons);
  };

  const existingMilestoneTitles = goal.milestones.map((m) => m.title);
  const suggestions = getMilestoneSuggestions(goal.title, goal.description || '', existingMilestoneTitles);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isPrimary ? styles.containerPrimary : styles.containerNormal,
      ]}
      onPress={handlePress}
      activeOpacity={0.92}
      accessibilityLabel={`Goal: ${goal.title}`}
      accessibilityRole="button"
      accessibilityState={{ expanded: isExpanded }}
      accessibilityHint="Double tap to expand or collapse milestones"
    >
      {/* Decorative ambient circular shapes for primary goal (matching TodayFocusCard) */}
      {isPrimary && (
        <>
          <View style={styles.decorativeCircleOuter} pointerEvents="none" />
          <View style={styles.decorativeCircleInner} pointerEvents="none" />
        </>
      )}

      {/* Top Header Row */}
      <View style={styles.topRow}>
        <View style={styles.topBadgeRow}>
          {isPrimary && <View style={styles.livePulseDot} />}
          <Text
            style={[
              styles.bigGoalLabel,
              isPrimary ? styles.bigGoalLabelPrimary : styles.bigGoalLabelNormal,
            ]}
          >
            {isPrimary ? 'PRIMARY GOAL' : LABEL_BIG_GOAL}
          </Text>
        </View>

        {(onDeleteGoal || onToggleStatus) && (
          <TouchableOpacity
            style={styles.moreOptionsButton}
            onPress={(e) => {
              e.stopPropagation();
              handleOpenOptions();
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Goal Options"
          >
            <MoreVertical size={16} color={isPrimary ? 'rgba(255, 255, 255, 0.7)' : '#7E8098'} />
          </TouchableOpacity>
        )}
      </View>

      {/* Goal Title */}
      <Text
        style={[
          styles.goalTitle,
          isPrimary ? styles.titlePrimary : styles.titleNormal,
        ]}
        numberOfLines={2}
      >
        {goal.title}
      </Text>

      {/* Goal Meta Subtitle */}
      <Text
        style={[
          styles.goalMeta,
          isPrimary ? styles.metaPrimary : styles.metaNormal,
        ]}
      >
        {metaText}
      </Text>

      {/* Center Metrics Row: Ring + Human Readable Stats */}
      <View style={styles.bottomRow}>
        <ProgressRing
          size={70}
          progress={progressRatio}
          strokeWidth={4.5}
          color="#5B4FE8"
          showLabel={true}
          labelFontSize={13}
          textColor={isPrimary ? '#FFFFFF' : '#17172A'}
        />

        <View style={styles.statsColumn}>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, isPrimary && styles.statLabelPrimary]}>Tasks done</Text>
            <Text style={[styles.statValue, isPrimary ? styles.statValPrimary : styles.statValNormal]}>
              {`${doneItems}/${totalItems}`}
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, isPrimary && styles.statLabelPrimary]}>Pending</Text>
            <Text style={[styles.statValue, isPrimary ? styles.statValPrimary : styles.statValNormal]}>
              {`${remainingItems} items pending`}
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, isPrimary && styles.statLabelPrimary]}>Days left</Text>
            <Text
              style={[
                styles.statValue,
                isPrimary ? styles.statValPrimary : styles.statValNormal,
                rawDaysLeft < 0 && goal.status !== 'achieved' && { color: '#E85858' },
              ]}
            >
              {renderDaysLeftText()}
            </Text>
          </View>
        </View>
      </View>

      {/* Expanded Collapsible Section */}
      {isExpanded && (
        <View style={styles.expandedSection}>
          <View style={[styles.divider, isPrimary && styles.dividerPrimary]} />
          
          <View style={styles.milestonesHeaderRow}>
            <Text style={[styles.expandedTitle, isPrimary ? styles.expandedTitlePrimary : styles.expandedTitleNormal]}>
              Milestones
            </Text>
            <Text style={[styles.milestonesCounter, isPrimary ? styles.textMutedPrimary : styles.textMutedNormal]}>
              {`${doneMilestones}/${totalMilestones}`}
            </Text>
          </View>

          {goal.milestones.length === 0 ? (
            <Text style={[styles.emptyMilestonesText, isPrimary ? styles.emptyTextPrimary : styles.emptyTextNormal]}>
              No milestones created yet. Tap a suggestion below to start!
            </Text>
          ) : (
            goal.milestones.map((milestone) => (
              <TouchableOpacity
                key={milestone.id}
                style={styles.milestoneInteractiveRow}
                onPress={(e) => {
                  e.stopPropagation();
                  onToggleMilestoneStatus?.(milestone.id, goal.id, milestone.status);
                }}
                activeOpacity={0.7}
                accessibilityLabel={`Milestone: ${milestone.title}, ${milestone.status === 'completed' ? 'completed' : 'pending'}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: milestone.status === 'completed' }}
              >
                <View
                  style={[
                    styles.milestoneCheckbox,
                    milestone.status === 'completed'
                      ? styles.milestoneCheckboxCompleted
                      : isPrimary
                      ? styles.milestoneCheckboxPrimary
                      : styles.milestoneCheckboxNormal,
                  ]}
                >
                  {milestone.status === 'completed' && (
                    <Check size={11} color="#FFFFFF" strokeWidth={3} />
                  )}
                </View>
                <Text
                  style={[
                    styles.milestoneText,
                    isPrimary ? styles.milestoneTextPrimary : styles.milestoneTextNormal,
                    milestone.status === 'completed' && styles.milestoneTextCompleted,
                  ]}
                  numberOfLines={1}
                >
                  {milestone.title}
                </Text>
              </TouchableOpacity>
            ))
          )}

          {/* 1-Tap Suggested Milestones Chips */}
          {suggestions.length > 0 && onQuickAddMilestone && (
            <View style={styles.suggestionsContainer}>
              <Text
                style={[
                  styles.suggestionsHeader,
                  isPrimary ? styles.suggestionsHeaderPrimary : styles.suggestionsHeaderNormal,
                ]}
              >
                Suggested Milestones (1-Tap Add):
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.suggestionsScroll}
                keyboardShouldPersistTaps="handled"
              >
                {suggestions.map((suggestion) => (
                  <TouchableOpacity
                    key={suggestion}
                    style={[
                      styles.suggestionChip,
                      isPrimary ? styles.suggestionChipPrimary : styles.suggestionChipNormal,
                    ]}
                    onPress={(e) => {
                      e.stopPropagation();
                      onQuickAddMilestone(goal.id, suggestion);
                    }}
                    activeOpacity={0.7}
                  >
                    <Plus
                      size={11}
                      color={isPrimary ? '#A89EF8' : '#5B4FE8'}
                      strokeWidth={2.6}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.suggestionChipText,
                        isPrimary ? styles.suggestionChipTextPrimary : styles.suggestionChipTextNormal,
                      ]}
                    >
                      {suggestion}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Action Row */}
          <View style={styles.expandedActionsRow}>
            {onAddMilestone && (
              <TouchableOpacity
                style={styles.addMilestoneRow}
                onPress={(e) => {
                  e.stopPropagation();
                  onAddMilestone(goal.id);
                }}
                activeOpacity={0.7}
                accessibilityLabel="Add Custom Milestone"
                accessibilityRole="button"
              >
                <Text style={[styles.addMilestoneText, isPrimary && styles.addMilestoneTextPrimary]}>
                  + Add Custom Milestone
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Bottom Status Badge Row with Expand/Collapse indicator */}
      <View style={styles.statusActionRow}>
        <View
          style={[
            styles.statusBadge,
            isPrimary
              ? {
                  backgroundColor: statusTheme.bgPrimary,
                  borderColor: statusTheme.borderPrimary,
                  borderWidth: 1,
                }
              : { backgroundColor: statusTheme.bg },
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              { color: isPrimary ? statusTheme.textPrimary : statusTheme.text },
            ]}
          >
            {statusTheme.label}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.expandToggleIndicator}
          onPress={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.expandToggleText, isPrimary && styles.expandToggleTextPrimary]}>
            {isExpanded
              ? 'Hide Milestones'
              : totalMilestones > 0
              ? `View Milestones (${doneMilestones}/${totalMilestones})`
              : 'Add Milestones'}
          </Text>
          {isExpanded ? (
            <ChevronUp size={14} color={isPrimary ? '#9D9AA8' : '#7E8098'} strokeWidth={2.4} />
          ) : (
            <ChevronDown size={14} color={isPrimary ? '#9D9AA8' : '#7E8098'} strokeWidth={2.4} />
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  containerPrimary: {
    backgroundColor: '#131422',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 8,
  },
  containerNormal: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  topBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#6366F1',
  },
  bigGoalLabel: {
    fontFamily: 'DMSans-Bold',
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  bigGoalLabelPrimary: {
    color: '#8E8EA8',
  },
  bigGoalLabelNormal: {
    color: '#9B9BAF',
  },
  moreOptionsButton: {
    padding: 4,
  },
  goalTitle: {
    marginTop: 6,
    zIndex: 2,
  },
  titlePrimary: {
    fontFamily: 'DMSans-Bold',
    fontSize: 20,
    color: '#FFFFFF',
    lineHeight: 26,
  },
  titleNormal: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    lineHeight: 24,
    color: '#17172A',
  },
  goalMeta: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12.5,
    marginTop: 4,
    marginBottom: 16,
    zIndex: 2,
  },
  metaPrimary: {
    color: '#7E8098',
  },
  metaNormal: {
    color: '#5C5C70',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
  },
  statsColumn: {
    flex: 1,
    marginLeft: 16,
    gap: 4,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#9B9BAF',
  },
  statLabelPrimary: {
    color: '#8E8EA8',
  },
  statValue: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    fontWeight: '600',
  },
  statValPrimary: {
    color: '#FFFFFF',
  },
  statValNormal: {
    color: '#17172A',
  },
  statusActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    zIndex: 2,
  },
  expandToggleIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  expandToggleText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11.5,
    color: '#7E8098',
  },
  expandToggleTextPrimary: {
    color: '#9D9AA8',
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadgeText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    fontWeight: '600',
  },
  expandedSection: {
    marginTop: 16,
    width: '100%',
    zIndex: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(155, 155, 175, 0.2)',
    marginBottom: 12,
  },
  dividerPrimary: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  milestonesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  expandedTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    fontWeight: '600',
  },
  milestonesCounter: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
  },
  textMutedPrimary: {
    color: '#8E8EA8',
  },
  textMutedNormal: {
    color: '#9B9BAF',
  },
  expandedTitlePrimary: {
    color: '#FFFFFF',
  },
  expandedTitleNormal: {
    color: '#17172A',
  },
  emptyMilestonesText: {
    fontFamily: 'DMSans',
    fontSize: 12,
    marginBottom: 10,
    lineHeight: 18,
  },
  emptyTextPrimary: {
    color: 'rgba(255, 255, 255, 0.55)',
  },
  emptyTextNormal: {
    color: '#7E8098',
  },
  milestoneInteractiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 2,
  },
  milestoneCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  milestoneCheckboxNormal: {
    borderColor: '#C4C2D6',
    backgroundColor: 'transparent',
  },
  milestoneCheckboxPrimary: {
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  milestoneCheckboxCompleted: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  milestoneText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    flex: 1,
  },
  milestoneTextPrimary: {
    color: '#E0E0F0',
  },
  milestoneTextNormal: {
    color: '#151628',
  },
  milestoneTextCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  suggestionsContainer: {
    marginTop: 10,
    marginBottom: 6,
  },
  suggestionsHeader: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  suggestionsHeaderPrimary: {
    color: 'rgba(255, 255, 255, 0.55)',
  },
  suggestionsHeaderNormal: {
    color: '#7E8098',
  },
  suggestionsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  suggestionChipPrimary: {
    backgroundColor: 'rgba(91, 79, 232, 0.22)',
    borderColor: 'rgba(168, 158, 248, 0.35)',
  },
  suggestionChipNormal: {
    backgroundColor: 'rgba(91, 79, 232, 0.08)',
    borderColor: 'rgba(91, 79, 232, 0.2)',
  },
  suggestionChipText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11.5,
  },
  suggestionChipTextPrimary: {
    color: '#D8D4FC',
  },
  suggestionChipTextNormal: {
    color: '#5B4FE8',
  },
  expandedActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  addMilestoneRow: {
    paddingVertical: 4,
    alignItems: 'flex-start',
  },
  addMilestoneText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12.5,
    fontWeight: '600',
    color: '#5B4FE8',
  },
  addMilestoneTextPrimary: {
    color: '#818CF8',
  },
});
