import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Milestone, Task } from '@/types/app.types';
import { useCompleteTask } from '@/lib/hooks/use-tasks';
import { formatDeadline } from '@/lib/utils/date';
import { getSubjectColor, getSubjectBgColor } from '@/lib/utils/subject-colors';

// Constants
const ADD_TASK_LABEL = "+ Add task";
const BORDER_COLOR = '#E8E7E3';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

interface MilestoneItemProps {
  milestone: Milestone & { tasks: Task[] };
  onStatusChange: (id: string, status: 'pending' | 'completed') => void;
  onAddTask: (milestoneId: string) => void;
}

export const MilestoneItem = React.memo<MilestoneItemProps>(({
  milestone,
  onStatusChange,
  onAddTask,
}) => {
  const [expanded, setExpanded] = useState(false);
  const { mutate: completeTask } = useCompleteTask();

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  const handleStatusDotPress = () => {
    const nextStatus = milestone.status === 'completed' ? 'pending' : 'completed';
    onStatusChange(milestone.id, nextStatus);
  };

  // Progress metrics
  const totalTasks = milestone.tasks.length;
  const completedTasks = milestone.tasks.filter((t) => t.completed_at !== null).length;
  const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  // Determine status color theme
  const getStatusTheme = () => {
    if (milestone.status === 'completed') {
      return { fill: '#00B894', ring: 'transparent' };
    }
    // If not completed but has tasks in progress, treat as in_progress
    const hasStartedTasks = milestone.tasks.some((t) => t.completed_at !== null);
    if (hasStartedTasks || totalTasks > 0) {
      return { fill: '#5B4FE8', ring: 'rgba(91, 79, 232, 0.2)' };
    }
    return { fill: '#E8E7E3', ring: 'transparent' };
  };

  const statusTheme = getStatusTheme();

  // Overdue check
  const isOverdue = (() => {
    if (!milestone.due_date || milestone.status === 'completed') return false;
    const due = new Date(milestone.due_date);
    due.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due.getTime() < today.getTime();
  })();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#E85858';
      case 'important': return '#E8A020';
      default: return 'transparent';
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.headerRow}
        onPress={toggleExpand}
        activeOpacity={0.7}
      >
        {/* Status Dot */}
        <TouchableOpacity
          style={[styles.statusDotContainer, { backgroundColor: statusTheme.ring }]}
          onPress={handleStatusDotPress}
          activeOpacity={0.6}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View style={[styles.statusDot, { backgroundColor: statusTheme.fill }]} />
        </TouchableOpacity>

        {/* Middle Section */}
        <View style={styles.middleArea}>
          {(() => {
            const match = milestone.title.match(/^\[(.*?)\]\s*(.*)$/);
            const subjectTag = match ? match[1] : null;
            const cleanTitle = match ? match[2] : milestone.title;
            return (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                {subjectTag && (
                  <View
                    style={[
                      styles.subjectBadge,
                      { backgroundColor: getSubjectBgColor(getSubjectColor(subjectTag)) },
                    ]}
                  >
                    <Text style={[styles.subjectText, { color: getSubjectColor(subjectTag) }]}>
                      {subjectTag}
                    </Text>
                  </View>
                )}
                <Text style={styles.titleText}>{cleanTitle}</Text>
              </View>
            );
          })()}
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${progressPercent}%` },
              ]}
            />
          </View>
        </View>

        {/* Right Section */}
        {milestone.due_date && (
          <Text style={[styles.dateText, isOverdue && styles.overdueText]}>
            {formatDeadline(milestone.due_date)}
          </Text>
        )}
      </TouchableOpacity>

      {/* Expandable Tasks List */}
      {expanded && (
        <View style={styles.tasksSection}>
          <View style={styles.divider} />
          {milestone.tasks.map((task) => {
            const isTaskDone = task.completed_at !== null;
            return (
              <View key={task.id} style={styles.taskRow}>
                {/* Task Checkbox */}
                <TouchableOpacity
                  style={[
                    styles.checkboxCircle,
                    isTaskDone ? styles.checkboxChecked : styles.checkboxUnchecked,
                  ]}
                  onPress={() =>
                    completeTask({
                      id: task.id,
                      completed: !isTaskDone,
                      milestoneId: milestone.id,
                    })
                  }
                  activeOpacity={0.6}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {isTaskDone && <Text style={styles.checkIcon}>✓</Text>}
                </TouchableOpacity>

                {/* Task Title */}
                <Text
                  style={[
                    styles.taskTitle,
                    isTaskDone && styles.taskTitleCompleted,
                  ]}
                  numberOfLines={1}
                >
                  {task.title}
                </Text>

                {/* Priority Dot */}
                <View
                  style={[
                    styles.priorityDot,
                    { backgroundColor: getPriorityColor(task.priority) },
                  ]}
                />
              </View>
            );
          })}

          {/* Add Task Button */}
          <TouchableOpacity
            style={styles.addTaskButton}
            onPress={() => onAddTask(milestone.id)}
            activeOpacity={0.6}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.addTaskText}>{ADD_TASK_LABEL}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    marginBottom: 8,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  statusDotContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  middleArea: {
    flex: 1,
    marginLeft: 8,
    marginRight: 12,
  },
  titleText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    fontWeight: '600',
    color: '#17172A',
  },
  progressBarBg: {
    height: 3,
    backgroundColor: '#E8E7E3',
    borderRadius: 2,
    marginTop: 6,
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#5B4FE8',
    borderRadius: 2,
  },
  dateText: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#9B9BAF',
  },
  overdueText: {
    color: '#E85858',
    fontWeight: '600',
  },
  tasksSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#E8E7E3',
    marginBottom: 8,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkboxCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxUnchecked: {
    borderWidth: 1.5,
    borderColor: '#E8E7E3',
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: '#00B894',
  },
  checkIcon: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  taskTitle: {
    flex: 1,
    fontFamily: 'DMSans',
    fontSize: 13,
    color: '#17172A',
  },
  taskTitleCompleted: {
    color: '#9B9BAF',
    textDecorationLine: 'line-through',
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 10,
  },
  addTaskButton: {
    paddingVertical: 8,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  addTaskText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: '#5B4FE8',
    fontWeight: '600',
  },
  subjectBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  subjectText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 9,
    fontWeight: '600',
  },
});
