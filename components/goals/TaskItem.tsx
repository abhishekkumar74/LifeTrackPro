import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Task } from '@/types/app.types';
import { formatDeadline } from '@/lib/utils/date';
import { getSubjectColor, getSubjectBgColor } from '@/lib/utils/subject-colors';

// Constants
const ACTION_DONE = "Done";
const ACTION_RESCHEDULE = "Reschedule";
const ACTION_DELETE = "Delete";
const BORDER_COLOR = '#E8E7E3';

interface TaskItemProps {
  task: Task;
  onComplete: (id: string) => void;
  onReschedule: (id: string) => void;
  onDelete: (id: string) => void;
}

export const TaskItem = React.memo<TaskItemProps>(({
  task,
  onComplete,
  onReschedule,
  onDelete,
}) => {
  const swipeableRef = useRef<Swipeable>(null);

  const isCompleted = task.completed_at !== null;

  // Overdue check
  const isOverdue = (() => {
    if (!task.due_date || isCompleted) return false;
    const due = new Date(task.due_date);
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

  const closeRow = () => {
    swipeableRef.current?.close();
  };

  // Render left swipe action (Swipe Right -> reveals Done)
  const renderLeftActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [0, 80],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity
        style={styles.leftAction}
        onPress={() => {
          onComplete(task.id);
          closeRow();
        }}
        activeOpacity={0.8}
      >
        <Animated.Text style={[styles.actionText, { transform: [{ scale }] }]}>
          {ACTION_DONE}
        </Animated.Text>
      </TouchableOpacity>
    );
  };

  // Render right swipe actions (Swipe Left -> reveals Reschedule & Delete)
  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-160, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.rightActionsContainer}>
        {/* Reschedule action */}
        <TouchableOpacity
          style={styles.rescheduleAction}
          onPress={() => {
            onReschedule(task.id);
            closeRow();
          }}
          activeOpacity={0.8}
        >
          <Animated.Text style={[styles.actionText, { transform: [{ scale }] }]}>
            {ACTION_RESCHEDULE}
          </Animated.Text>
        </TouchableOpacity>

        {/* Delete action */}
        <TouchableOpacity
          style={styles.deleteAction}
          onPress={() => {
            onDelete(task.id);
            closeRow();
          }}
          activeOpacity={0.8}
        >
          <Animated.Text style={[styles.actionText, { transform: [{ scale }] }]}>
            {ACTION_DELETE}
          </Animated.Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      onSwipeableOpen={(direction) => {
        if (direction === 'left') {
          // Swiped right completely -> Complete
          onComplete(task.id);
          closeRow();
        }
      }}
      friction={1.5}
      leftThreshold={80}
      rightThreshold={80}
    >
      <View style={styles.container}>
        {/* Left Checkbox */}
        <TouchableOpacity
          style={[
            styles.checkbox,
            isCompleted ? styles.checkboxChecked : styles.checkboxUnchecked,
          ]}
          onPress={() => onComplete(task.id)}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {isCompleted && <Text style={styles.checkIcon}>✓</Text>}
        </TouchableOpacity>

        {/* Middle Content */}
        <View style={styles.middleArea}>
          <Text
            style={[
              styles.taskTitle,
              isCompleted && styles.taskTitleCompleted,
            ]}
            numberOfLines={1}
          >
            {task.title}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
            {task.due_date && (
              <Text style={[styles.dateText, isOverdue && styles.overdueText, { marginTop: 0 }]}>
                {formatDeadline(task.due_date)}
              </Text>
            )}
            {task.subject && (
              <View
                style={[
                  styles.subjectBadge,
                  { backgroundColor: getSubjectBgColor(getSubjectColor(task.subject)) },
                ]}
              >
                <Text style={[styles.subjectText, { color: getSubjectColor(task.subject) }]}>
                  {task.subject}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Right Priority Dot */}
        <View
          style={[
            styles.priorityDot,
            { backgroundColor: getPriorityColor(task.priority) },
          ]}
        />
      </View>
    </Swipeable>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 12,
    fontWeight: 'bold',
  },
  middleArea: {
    flex: 1,
    marginLeft: 12,
  },
  taskTitle: {
    fontFamily: 'DMSans',
    fontSize: 14,
    color: '#17172A',
  },
  taskTitleCompleted: {
    color: '#9B9BAF',
    textDecorationLine: 'line-through',
  },
  dateText: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#9B9BAF',
    marginTop: 2,
  },
  overdueText: {
    color: '#E85858',
    fontWeight: '600',
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 12,
  },
  // Swipeable Action Styles
  leftAction: {
    backgroundColor: '#00B894',
    justifyContent: 'center',
    paddingLeft: 20,
    width: 100,
  },
  rightActionsContainer: {
    width: 180,
    flexDirection: 'row',
  },
  rescheduleAction: {
    backgroundColor: '#5B4FE8',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  deleteAction: {
    backgroundColor: '#E85858',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  actionText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
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
