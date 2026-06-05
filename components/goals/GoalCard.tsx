import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Goal, Milestone } from '@/types/app.types';
import { ProgressRing } from './ProgressRing';
import { calculateOnTrackStatus } from '@/lib/utils/on-track';
import { daysFromNow, formatDeadline } from '@/lib/utils/date';

// Constants
const LABEL_BIG_GOAL = "BIG GOAL";
const BADGE_PRIMARY = "⭐ Primary";
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
}

export const GoalCard = React.memo<GoalCardProps>(({
  goal,
  onPress,
  isPrimary,
  onAddMilestone,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const deadlineFormatted = formatDeadline(goal.deadline);
  const daysLeft = daysFromNow(goal.deadline);

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

  // Pace calculation: remaining tasks / remaining days
  const remainingTasks = goal.totalTasks - goal.doneTasks;
  const dailyNeeded =
    remainingTasks > 0 && daysLeft > 0
      ? (remainingTasks / daysLeft).toFixed(2)
      : '0.00';

  // Status calculation
  const status = calculateOnTrackStatus(
    goal.created_at || new Date().toISOString(),
    goal.deadline,
    goal.doneTasks,
    goal.totalTasks
  );

  const getStatusStyles = (statusType: 'on_track' | 'at_risk' | 'behind') => {
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

  const statusTheme = getStatusStyles(status);
  const progressRatio = goal.totalTasks > 0 ? goal.doneTasks / goal.totalTasks : 0;

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
            <Text style={styles.statLabel}>Topics done</Text>
            <Text style={[styles.statValue, isPrimary ? styles.statValPrimary : styles.statValNormal]}>
              {`${goal.doneTasks}/${goal.totalTasks}`}
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Days left</Text>
            <Text style={[styles.statValue, isPrimary ? styles.statValPrimary : styles.statValNormal]}>
              {`${daysLeft}d`}
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
          {onAddMilestone && (
            <TouchableOpacity
              style={styles.addMilestoneRow}
              onPress={() => onAddMilestone(goal.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.addMilestoneText}>+ Add Milestone</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Status Badge */}
      <View style={[styles.statusBadge, { backgroundColor: statusTheme.bg }]}>
        <Text style={[styles.statusBadgeText, { color: statusTheme.text }]}>
          {statusTheme.label}
        </Text>
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
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 14,
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
    marginTop: 8,
    paddingVertical: 6,
    alignItems: 'flex-start',
  },
  addMilestoneText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    fontWeight: '600',
    color: '#5B4FE8',
  },
});
