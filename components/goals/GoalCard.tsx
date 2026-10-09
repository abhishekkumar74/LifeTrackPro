import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Goal, Milestone } from '@/types/app.types';
import { ProgressRing } from './ProgressRing';
import { calculateOnTrackStatus } from '@/lib/utils/on-track';
import { formatDeadline } from '@/lib/utils/date';
import { CheckCircle2, RotateCcw, Trash2 } from 'lucide-react-native';

// Constants
const LABEL_BIG_GOAL = "BIG GOAL";
const BADGE_PRIMARY = "Primary";
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
  onToggleStatus?: (
    goalId: string,
    currentStatus: 'active' | 'achieved',
    title: string,
    remainingItems: number
  ) => void;
  onDeleteGoal?: (goalId: string, title: string) => void;
}

export const GoalCard = React.memo<GoalCardProps>(({
  goal,
  onPress,
  isPrimary,
  onAddMilestone,
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

  // Pace calculation: remaining items / remaining days
  const remainingItems = totalItems - doneItems;
  const dailyNeeded =
    remainingItems > 0 && rawDaysLeft > 0
      ? (remainingItems / rawDaysLeft).toFixed(2)
      : '0.00';

  // Dynamic Status Badge Calculation
  const getDynamicStatusTheme = () => {
    if (goal.status === 'achieved') {
      return { bg: 'rgba(0, 184, 148, 0.15)', text: '#00B894', label: 'Achieved' };
    }

    if (rawDaysLeft < 0) {
      const absDays = Math.abs(rawDaysLeft);
      return { bg: 'rgba(232, 88, 88, 0.15)', text: '#E85858', label: `Expired (${absDays}d overdue)` };
    }

    if (rawDaysLeft === 0) {
      return { bg: 'rgba(232, 160, 32, 0.18)', text: '#E8A020', label: 'Due Today' };
    }

    const statusType = calculateOnTrackStatus(
      goal.created_at || new Date().toISOString(),
      goal.deadline,
      goal.doneTasks,
      goal.totalTasks
    );

    switch (statusType) {
      case 'on_track':
        return { bg: '#D4F5EE', text: '#00B894', label: 'On track' };
      case 'at_risk':
        return { bg: '#FEF3DC', text: '#E8A020', label: 'At risk' };
      case 'behind':
      default:
        return { bg: '#FDE8E8', text: '#E85858', label: 'Behind' };
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

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isPrimary ? styles.containerPrimary : styles.containerNormal,
      ]}
      onPress={handlePress}
      activeOpacity={0.9}
      accessibilityLabel={`Goal: ${goal.title}`}
      accessibilityRole="button"
      accessibilityState={{ expanded: isExpanded }}
      accessibilityHint="Double tap to expand or collapse milestones"
    >
      {/* Top Row */}
      <View style={styles.topRow}>
        <Text style={[styles.bigGoalLabel, isPrimary ? styles.textMutedPrimary : styles.textMutedNormal]}>
          {LABEL_BIG_GOAL}
        </Text>
        {isPrimary && (
          <View style={styles.primaryBadge}>
            <Text style={styles.primaryBadgeText}>{BADGE_PRIMARY}</Text>
          </View>
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

      {/* Goal Meta */}
      <Text
        style={[
          styles.goalMeta,
          isPrimary ? styles.metaPrimary : styles.metaNormal,
        ]}
      >
        {metaText}
      </Text>

      {/* Bottom Area: Ring + Stats */}
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
            <Text style={styles.statLabel}>Tasks done</Text>
            <Text style={[styles.statValue, isPrimary ? styles.statValPrimary : styles.statValNormal]}>
              {`${doneItems}/${totalItems}`}
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Days left</Text>
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
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Daily needed</Text>
            <Text style={[styles.statValue, isPrimary ? styles.statValPrimary : styles.statValNormal]}>
              {`${dailyNeeded}/d`}
            </Text>
          </View>
        </View>
      </View>

      {/* Expanded Collapsible Section */}
      {isExpanded && (
        <View style={styles.expandedSection}>
          <View style={styles.divider} />
          <Text style={[styles.expandedTitle, isPrimary ? styles.expandedTitlePrimary : styles.expandedTitleNormal]}>
            Milestones
          </Text>
          {goal.milestones.length === 0 ? (
            <Text style={[styles.emptyMilestonesText, isPrimary ? styles.emptyTextPrimary : styles.emptyTextNormal]}>
              No milestones created yet
            </Text>
          ) : (
            goal.milestones.map((milestone) => (
              <View key={milestone.id} style={styles.milestoneRow}>
                <View style={[styles.milestoneDot, milestone.status === 'completed' ? styles.milestoneDotCompleted : styles.milestoneDotPending]} />
                <Text
                  style={[
                    styles.milestoneText,
                    isPrimary ? styles.milestoneTextPrimary : styles.milestoneTextNormal,
                    milestone.status === 'completed' && styles.milestoneTextCompleted
                  ]}
                  numberOfLines={1}
                >
                  {milestone.title}
                </Text>
              </View>
            ))
          )}

          <View style={styles.expandedActionsRow}>
            {onAddMilestone && (
              <TouchableOpacity
                style={styles.addMilestoneRow}
                onPress={() => onAddMilestone(goal.id)}
                activeOpacity={0.7}
                accessibilityLabel="Add Milestone"
                accessibilityRole="button"
                accessibilityHint="Add a new milestone to this goal"
              >
                <Text style={styles.addMilestoneText}>+ Add Milestone</Text>
              </TouchableOpacity>
            )}

            {onDeleteGoal && (
              <TouchableOpacity
                style={styles.deleteGoalRow}
                onPress={() => onDeleteGoal(goal.id, goal.title)}
                activeOpacity={0.7}
                accessibilityLabel="Delete Goal"
                accessibilityRole="button"
              >
                <Trash2 size={13} color="#E85858" />
                <Text style={styles.deleteGoalText}>Delete Goal</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Status Badge & Actions Row */}
      <View style={styles.statusActionRow}>
        <View style={[styles.statusBadge, { backgroundColor: statusTheme.bg }]}>
          <Text style={[styles.statusBadgeText, { color: statusTheme.text }]}>
            {statusTheme.label}
          </Text>
        </View>

        {onToggleStatus && (
          <TouchableOpacity
            style={[
              styles.achieveActionBtn,
              goal.status === 'achieved' && styles.achieveActionBtnActive,
            ]}
            onPress={(e) => {
              e.stopPropagation();
              onToggleStatus(goal.id, goal.status as 'active' | 'achieved', goal.title, remainingItems);
            }}
            activeOpacity={0.8}
          >
            {goal.status === 'achieved' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <RotateCcw size={12} color="#5B4FE8" />
                <Text style={[styles.achieveActionText, { color: '#5B4FE8' }]}>Re-activate</Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <CheckCircle2 size={12} color="#00B894" />
                <Text style={styles.achieveActionText}>Mark Achieved</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  containerPrimary: {
    backgroundColor: '#17172A',
    borderWidth: 0,
  },
  containerNormal: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bigGoalLabel: {
    fontFamily: 'DMSans',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.2,
  },
  textMutedPrimary: {
    color: '#9B9BAF',
  },
  textMutedNormal: {
    color: '#9B9BAF',
  },
  primaryBadge: {
    backgroundColor: '#FEF3DC',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  primaryBadgeText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    color: '#E8A020',
    fontWeight: '600',
  },
  goalTitle: {
    fontFamily: 'InstrumentSerif',
    fontSize: 22,
    lineHeight: 26,
    marginTop: 8,
  },
  titlePrimary: {
    color: '#FFFFFF',
  },
  titleNormal: {
    color: '#17172A',
  },
  goalMeta: {
    fontFamily: 'DMSans',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 16,
  },
  metaPrimary: {
    color: 'rgba(255, 255, 255, 0.45)',
  },
  metaNormal: {
    color: '#5C5C70',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  statValue: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    fontWeight: '600',
  },
  statValPrimary: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  statValNormal: {
    color: '#17172A',
  },
  deleteIconBtn: {
    padding: 4,
  },
  statusActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadgeText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    fontWeight: '600',
  },
  achieveActionBtn: {
    backgroundColor: 'rgba(0, 184, 148, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 184, 148, 0.3)',
  },
  achieveActionBtnActive: {
    backgroundColor: 'rgba(91, 79, 232, 0.12)',
    borderColor: 'rgba(91, 79, 232, 0.3)',
  },
  achieveActionText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    color: '#00B894',
    fontWeight: '600',
  },
  expandedSection: {
    marginTop: 16,
    width: '100%',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(155, 155, 175, 0.2)',
    marginBottom: 12,
  },
  expandedTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
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
    marginBottom: 8,
  },
  emptyTextPrimary: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  emptyTextNormal: {
    color: '#9B9BAF',
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  milestoneDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  milestoneDotPending: {
    backgroundColor: '#E8A020',
  },
  milestoneDotCompleted: {
    backgroundColor: '#00B894',
  },
  milestoneText: {
    fontFamily: 'DMSans',
    fontSize: 13,
    flex: 1,
  },
  milestoneTextPrimary: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  milestoneTextNormal: {
    color: '#5C5C70',
  },
  milestoneTextCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  addMilestoneRow: {
    paddingVertical: 6,
    alignItems: 'flex-start',
  },
  addMilestoneText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    fontWeight: '600',
    color: '#5B4FE8',
  },
  expandedActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  deleteGoalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(232, 88, 88, 0.08)',
  },
  deleteGoalText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    fontWeight: '600',
    color: '#E85858',
  },
});
