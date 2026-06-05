import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SectionList,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomSheet from '@gorhom/bottom-sheet';
import { Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { useGoals, AssembledGoal } from '@/lib/hooks/use-goals';
import { useUpdateMilestoneStatus } from '@/lib/hooks/use-milestones';
import {
  useTasks,
  useCompleteTask,
  useRescheduleTask,
  useDeleteTask,
} from '@/lib/hooks/use-tasks';

import { Milestone, Task } from '@/types/app.types';

// Import custom components
import { GoalCard } from '@/components/goals/GoalCard';
import { MilestoneItem } from '@/components/goals/MilestoneItem';
import { TaskItem } from '@/components/goals/TaskItem';

// Import Bottom Sheets
import { CreateGoalSheet } from '@/components/goals/CreateGoalSheet';
import { CreateTaskSheet } from '@/components/goals/CreateTaskSheet';
import { CreateMilestoneSheet } from '@/components/goals/CreateMilestoneSheet';
import { Skeleton } from '@/components/shared/Skeleton';
import { ErrorState } from '@/components/shared/ErrorState';

// Constants
const HEADER_TITLE = "Goal Vault";
const SECTION_TASKS = "Tasks";
const EMPTY_ACHIEVED = "No achieved goals yet 🎯";
const EMPTY_ACHIEVED_SUB = "Complete your first goal to see it here";
const ERR_LOAD = "Could not load goals";
const BTN_RETRY = "Retry";
const BG_COLOR = '#F7F6F3';
const BORDER_COLOR = '#E8E7E3';

type TabType = 'active' | 'milestones' | 'achieved';

type MilestoneSectionItem = (Milestone & { tasks: Task[] }) | { id: string; isPlaceholder: true; goal_id: string };

export default function GoalsScreen(): React.JSX.Element {
  const [selectedTab, setSelectedTab] = useState<TabType>('active');
  const [defaultMilestoneId, setDefaultMilestoneId] = useState<string | null>(null);
  const [isMilestoneSheetVisible, setIsMilestoneSheetVisible] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [isFabOpen, setIsFabOpen] = useState(false);
  const animValue = useSharedValue(0);

  useEffect(() => {
    animValue.value = withTiming(isFabOpen ? 1 : 0, { duration: 200 });
  }, [isFabOpen]);

  const animatedMenuStyle = useAnimatedStyle(() => {
    return {
      opacity: animValue.value,
      transform: [
        {
          translateY: (1 - animValue.value) * 20,
        },
      ],
    };
  });

  const animatedIconStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          rotate: `${animValue.value * 45}deg`,
        },
      ],
    };
  });

  const handleFabPress = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setIsFabOpen((prev) => !prev);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      activeGoalsQuery.refetch(),
      achievedGoalsQuery.refetch(),
      standaloneTasksQuery.refetch(),
    ]);
    setIsRefreshing(false);
  };

  // Bottom Sheet Refs
  const createGoalSheetRef = useRef<BottomSheet>(null);
  const createTaskSheetRef = useRef<BottomSheet>(null);

  // Query Hooks
  const activeGoalsQuery = useGoals('active');
  const achievedGoalsQuery = useGoals('achieved');
  const standaloneTasksQuery = useTasks();

  // Mutation Hooks
  const { mutate: updateMilestoneStatus } = useUpdateMilestoneStatus();
  const { mutate: completeTask } = useCompleteTask();
  const { mutate: rescheduleTask } = useRescheduleTask();
  const { mutate: deleteTask } = useDeleteTask();

  // Assemble milestones with goal metadata for grouping in Milestones tab
  const milestoneSections = useMemo(() => {
    const activeGoals = activeGoalsQuery.data || [];
    return activeGoals.map((goal) => ({
      id: goal.id,
      title: goal.title,
      data: (goal.milestones.length === 0
        ? [{ id: `empty-${goal.id}`, isPlaceholder: true, goal_id: goal.id }]
        : goal.milestones) as MilestoneSectionItem[],
    }));
  }, [activeGoalsQuery.data]);

  // Flatten active milestones for dropdown list
  const flatActiveMilestones = useMemo(() => {
    const activeGoals = activeGoalsQuery.data || [];
    return activeGoals.flatMap((goal) => goal.milestones);
  }, [activeGoalsQuery.data]);

  // Open Sheets
  const handleOpenCreateGoal = useCallback(() => {
    createGoalSheetRef.current?.expand();
  }, []);

  const handleOpenCreateTask = useCallback((milestoneId: string | null = null) => {
    setDefaultMilestoneId(milestoneId);
    createTaskSheetRef.current?.expand();
  }, []);

  const handleReschedule = useCallback((taskId: string, milestoneId?: string | null) => {
    Alert.alert(
      'Reschedule Task',
      'Choose when to schedule this task:',
      [
        {
          text: 'Today',
          onPress: () => {
            const todayStr = new Date().toISOString().split('T')[0];
            rescheduleTask({ id: taskId, newDate: todayStr, milestoneId });
          },
        },
        {
          text: 'Tomorrow',
          onPress: () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];
            rescheduleTask({ id: taskId, newDate: tomorrowStr, milestoneId });
          },
        },
        {
          text: 'Next Week',
          onPress: () => {
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            const nextWeekStr = nextWeek.toISOString().split('T')[0];
            rescheduleTask({ id: taskId, newDate: nextWeekStr, milestoneId });
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  }, [rescheduleTask]);

  const handleDelete = useCallback((taskId: string, milestoneId?: string | null) => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteTask({ id: taskId, milestoneId });
          },
        },
      ]
    );
  }, [deleteTask]);

  const handleAddMilestone = useCallback((goalId: string) => {
    setSelectedGoalId(goalId);
    setIsMilestoneSheetVisible(true);
  }, []);

  const renderActiveTab = () => {
    if (activeGoalsQuery.isLoading || standaloneTasksQuery.isLoading) {
      return (
        <View style={styles.listContainer}>
          <Skeleton width="100%" height={140} borderRadius={20} style={{ marginBottom: 12 }} />
          <Skeleton width="100%" height={140} borderRadius={20} style={{ marginBottom: 12 }} />
          <Skeleton width="100%" height={140} borderRadius={20} style={{ marginBottom: 12 }} />
        </View>
      );
    }

    if (activeGoalsQuery.isError || standaloneTasksQuery.isError) {
      return (
        <ErrorState
          message={ERR_LOAD}
          onRetry={() => {
            activeGoalsQuery.refetch();
            standaloneTasksQuery.refetch();
          }}
        />
      );
    }

    const activeGoals = activeGoalsQuery.data || [];
    const standaloneTasks = standaloneTasksQuery.data || [];

    return (
      <FlatList
        data={activeGoals}
        keyExtractor={(item) => item.id}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={8}
        renderItem={({ item }) => (
          <GoalCard
            goal={item}
            isPrimary={item.is_primary}
            onAddMilestone={handleAddMilestone}
          />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#5B4FE8']}
            tintColor="#5B4FE8"
          />
        }
        ListFooterComponent={
          standaloneTasks.length > 0 ? (
            <View style={styles.tasksSection}>
              <Text style={styles.sectionHeader}>{SECTION_TASKS}</Text>
              {standaloneTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onComplete={(id) =>
                    completeTask({
                      id,
                      completed: task.completed_at === null,
                      milestoneId: null,
                    })
                  }
                  onReschedule={(id) => handleReschedule(id, null)}
                  onDelete={(id) => handleDelete(id, null)}
                />
              ))}
            </View>
          ) : null
        }
      />
    );
  };

  const renderMilestonesTab = () => {
    if (activeGoalsQuery.isLoading) {
      return (
        <View style={styles.listContainer}>
          <Skeleton width="100%" height={60} borderRadius={12} style={{ marginBottom: 12 }} />
          <Skeleton width="100%" height={60} borderRadius={12} style={{ marginBottom: 12 }} />
          <Skeleton width="100%" height={60} borderRadius={12} style={{ marginBottom: 12 }} />
        </View>
      );
    }

    return (
      <SectionList
        sections={milestoneSections}
        keyExtractor={(item) => item.id}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={8}
        renderItem={({ item }) => {
          if ('isPlaceholder' in item && item.isPlaceholder) {
            return (
              <TouchableOpacity
                style={styles.emptyMilestoneRow}
                onPress={() => {
                  setSelectedGoalId(item.goal_id);
                  setIsMilestoneSheetVisible(true);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.emptyMilestoneText}>+ Add your first milestone</Text>
              </TouchableOpacity>
            );
          }
          return (
            <MilestoneItem
              milestone={item as Milestone & { tasks: Task[] }}
              onStatusChange={(id, status) =>
                updateMilestoneStatus({ id, status, goalId: (item as Milestone).goal_id })
              }
              onAddTask={(mid) => handleOpenCreateTask(mid)}
            />
          );
        }}
        renderSectionHeader={({ section }) => (
          <View style={styles.groupHeaderRow}>
            <Text style={styles.groupHeaderTitle}>{section.title}</Text>
            <TouchableOpacity
              style={styles.groupHeaderAddButton}
              onPress={() => {
                setSelectedGoalId(section.id);
                setIsMilestoneSheetVisible(true);
              }}
              activeOpacity={0.7}
            >
              <Plus size={16} color="#5B4FE8" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#5B4FE8']}
            tintColor="#5B4FE8"
          />
        }
      />
    );
  };

  const renderAchievedTab = () => {
    if (achievedGoalsQuery.isLoading) {
      return (
        <View style={styles.listContainer}>
          <Skeleton width="100%" height={140} borderRadius={20} style={{ marginBottom: 12 }} />
          <Skeleton width="100%" height={140} borderRadius={20} style={{ marginBottom: 12 }} />
        </View>
      );
    }

    const achievedGoals = achievedGoalsQuery.data || [];

    if (achievedGoals.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{EMPTY_ACHIEVED}</Text>
          <Text style={styles.emptySubText}>{EMPTY_ACHIEVED_SUB}</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={achievedGoals}
        keyExtractor={(item) => item.id}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={8}
        renderItem={({ item }) => (
          <GoalCard
            goal={item}
            isPrimary={item.is_primary}
            onPress={() => {}}
          />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#5B4FE8']}
            tintColor="#5B4FE8"
          />
        }
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header Row */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{HEADER_TITLE}</Text>
        <TouchableOpacity
          style={styles.plusButton}
          onPress={handleOpenCreateGoal}
          activeOpacity={0.8}
        >
          <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Tabs Row */}
      <View style={styles.tabsRow}>
        {(['active', 'milestones', 'achieved'] as TabType[]).map((tab) => {
          const active = selectedTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tabPill, active && styles.tabPillActive]}
              onPress={() => setSelectedTab(tab)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  active && styles.tabTextActive,
                  { textTransform: 'capitalize' },
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Main Tab Contents */}
      <View style={styles.tabContent}>
        {selectedTab === 'active' && renderActiveTab()}
        {selectedTab === 'milestones' && renderMilestonesTab()}
        {selectedTab === 'achieved' && renderAchievedTab()}
      </View>

      {/* Semi-transparent backdrop when FAB is open */}
      {isFabOpen && (
        <TouchableOpacity
          style={styles.backdropOverlay}
          activeOpacity={1}
          onPress={() => setIsFabOpen(false)}
        />
      )}

      {/* Floating Action Button (FAB) only visible on Active tab */}
      {selectedTab === 'active' && (
        <View style={styles.fabContainer} pointerEvents="box-none">
          {/* Action buttons (Option 1 & 2) */}
          <Animated.View style={[styles.fabMenu, animatedMenuStyle]} pointerEvents={isFabOpen ? 'auto' : 'none'}>
            {/* Option 2: New Task */}
            <TouchableOpacity
              style={styles.fabOptionRow}
              onPress={() => {
                setIsFabOpen(false);
                handleOpenCreateTask(null);
              }}
              activeOpacity={0.8}
            >
              <View style={styles.fabOptionLabelPill}>
                <Text style={styles.fabOptionLabelText}>✅ New Task</Text>
              </View>
              <View style={[styles.fabOptionCircle, { backgroundColor: '#00B894' }]}>
                <Plus size={16} color="#FFFFFF" strokeWidth={3} />
              </View>
            </TouchableOpacity>

            {/* Option 1: New Goal */}
            <TouchableOpacity
              style={styles.fabOptionRow}
              onPress={() => {
                setIsFabOpen(false);
                handleOpenCreateGoal();
              }}
              activeOpacity={0.8}
            >
              <View style={styles.fabOptionLabelPill}>
                <Text style={styles.fabOptionLabelText}>🎯 New Goal</Text>
              </View>
              <View style={[styles.fabOptionCircle, { backgroundColor: '#E8A020' }]}>
                <Plus size={16} color="#FFFFFF" strokeWidth={3} />
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Main FAB Trigger Button */}
          <TouchableOpacity
            style={[styles.fab, isFabOpen && styles.fabOpen]}
            onPress={handleFabPress}
            activeOpacity={0.8}
          >
            <Animated.View style={animatedIconStyle}>
              <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />
            </Animated.View>
          </TouchableOpacity>
        </View>
      )}

      {/* Goal Creation Bottom Sheet */}
      <CreateGoalSheet
        ref={createGoalSheetRef}
        onSuccess={() => {
          createGoalSheetRef.current?.close();
        }}
      />

      {/* Task Creation Bottom Sheet */}
      <CreateTaskSheet
        ref={createTaskSheetRef}
        milestones={flatActiveMilestones}
        defaultMilestoneId={defaultMilestoneId}
        onSuccess={() => {
          createTaskSheetRef.current?.close();
        }}
      />

      {/* Milestone Creation Bottom Sheet */}
      <CreateMilestoneSheet
        isVisible={isMilestoneSheetVisible}
        goalId={selectedGoalId || ''}
        onClose={() => setIsMilestoneSheetVisible(false)}
        onSuccess={() => {
          setIsMilestoneSheetVisible(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontFamily: 'InstrumentSerif',
    fontSize: 30,
    color: '#17172A',
  },
  plusButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#5B4FE8',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5B4FE8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  tabPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: 'transparent',
  },
  tabPillActive: {
    backgroundColor: '#5B4FE8',
  },
  tabText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#9B9BAF',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100, // safety spacing for FAB and bottom tabs
  },
  groupHeader: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: '#17172A',
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  groupHeaderTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: '#17172A',
    fontWeight: '600',
  },
  groupHeaderAddButton: {
    padding: 4,
  },
  emptyMilestoneRow: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E7E3',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyMilestoneText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: '#5B4FE8',
  },
  tasksSection: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    paddingTop: 16,
  },
  sectionHeader: {
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    color: '#17172A',
    fontWeight: '600',
    marginBottom: 12,
  },
  backdropOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(23, 23, 42, 0.4)',
    zIndex: 99,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    alignItems: 'flex-end',
    zIndex: 100,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#5B4FE8',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5B4FE8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  fabOpen: {
    backgroundColor: '#17172A',
  },
  fabMenu: {
    alignItems: 'flex-end',
    marginBottom: 16,
    gap: 12,
  },
  fabOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fabOptionLabelPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  fabOptionLabelText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: '#17172A',
    fontWeight: '600',
  },
  fabOptionCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  // Loaders & Empty states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontFamily: 'DMSans',
    fontSize: 15,
    color: '#E85858',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#5B4FE8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    color: '#17172A',
    fontWeight: '600',
    marginBottom: 6,
  },
  emptySubText: {
    fontFamily: 'DMSans',
    fontSize: 14,
    color: '#9B9BAF',
    textAlign: 'center',
  },
});
