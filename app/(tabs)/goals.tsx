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
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { tabScrollRefs } from '@/lib/utils/tab-scroll';
import { useAndroidBackHandler } from '@/lib/hooks/use-android-back';
import BottomSheet from '@gorhom/bottom-sheet';
import { Plus, Mountain, Target, Trophy, CheckCircle2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useUiStore } from '@/lib/store/ui.store';

import { useGoals, useUpdateGoal, useDeleteGoal, AssembledGoal } from '@/lib/hooks/use-goals';
import {
  useUpdateMilestoneStatus,
  useDeleteMilestone,
  useCreateMilestone,
} from '@/lib/hooks/use-milestones';
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
const EMPTY_ACHIEVED = "No achieved goals yet";
const EMPTY_ACHIEVED_SUB = "Complete your first goal to see it here";
const ERR_LOAD = "Could not load goals";
const BTN_RETRY = "Retry";
const BG_COLOR = '#F7F6F3';
const BORDER_COLOR = '#E8E7E3';

type TabType = 'active' | 'milestones' | 'achieved';

type MilestoneSectionItem = (Milestone & { tasks: Task[] }) | { id: string; isPlaceholder: true; goal_id: string };

export default function GoalsScreen(): React.JSX.Element {
  // Query Hooks
  const activeGoalsQuery = useGoals('active');
  const achievedGoalsQuery = useGoals('achieved');
  const standaloneTasksQuery = useTasks();

  // Mutation Hooks
  const { mutate: updateMilestoneStatus } = useUpdateMilestoneStatus();
  const { mutate: deleteMilestone } = useDeleteMilestone();
  const createMilestoneMutation = useCreateMilestone();
  const { mutate: completeTask } = useCompleteTask();
  const { mutate: rescheduleTask } = useRescheduleTask();
  const { mutate: deleteTask } = useDeleteTask();
  const { mutate: updateGoal } = useUpdateGoal();
  const { mutate: deleteGoal } = useDeleteGoal();

  const [selectedTab, setSelectedTab] = useState<TabType>('active');
  const [defaultMilestoneId, setDefaultMilestoneId] = useState<string | null>(null);
  const [isGoalSheetVisible, setIsGoalSheetVisible] = useState(false);
  const [isTaskSheetVisible, setIsTaskSheetVisible] = useState(false);
  const [isMilestoneSheetVisible, setIsMilestoneSheetVisible] = useState(false);

  useAndroidBackHandler(() => {
    if (isGoalSheetVisible) {
      setIsGoalSheetVisible(false);
      return true;
    }
    if (isTaskSheetVisible) {
      setIsTaskSheetVisible(false);
      return true;
    }
    if (isMilestoneSheetVisible) {
      setIsMilestoneSheetVisible(false);
      return true;
    }
    return false;
  });

  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Tab scroll registration
  const activeListRef = useRef<any>(null);
  const milestonesListRef = useRef<any>(null);
  const achievedListRef = useRef<any>(null);

  const selectedTabRef = useRef(selectedTab);
  useEffect(() => {
    selectedTabRef.current = selectedTab;
  }, [selectedTab]);

  useEffect(() => {
    tabScrollRefs['goals'] = {
      current: {
        scrollTo: () => {
          if (selectedTabRef.current === 'active') {
            activeListRef.current?.scrollToOffset({ offset: 0, animated: true });
          } else if (selectedTabRef.current === 'milestones') {
            milestonesListRef.current?.scrollToLocation({
              sectionIndex: 0,
              itemIndex: 0,
              animated: true,
              viewPosition: 0,
            });
          } else if (selectedTabRef.current === 'achieved') {
            achievedListRef.current?.scrollToOffset({ offset: 0, animated: true });
          }
        }
      }
    } as any;
    return () => {
      delete tabScrollRefs['goals'];
    };
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      activeGoalsQuery.refetch(),
      achievedGoalsQuery.refetch(),
      standaloneTasksQuery.refetch(),
    ]);
    setIsRefreshing(false);
  }, [activeGoalsQuery, achievedGoalsQuery, standaloneTasksQuery]);

  // Bottom Sheet Refs
  const createGoalSheetRef = useRef<BottomSheet>(null);
  const createTaskSheetRef = useRef<BottomSheet>(null);

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
    setIsGoalSheetVisible(true);
  }, []);

  const handleOpenCreateTask = useCallback((milestoneId: string | null = null) => {
    setDefaultMilestoneId(milestoneId);
    setIsTaskSheetVisible(true);
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

  const handleRetryActiveQuery = useCallback(() => {
    activeGoalsQuery.refetch();
    standaloneTasksQuery.refetch();
  }, [activeGoalsQuery, standaloneTasksQuery]);

  const handleCompleteTask = useCallback((id: string) => {
    const allStandalone = standaloneTasksQuery.data || [];
    const foundStandalone = allStandalone.find(t => t.id === id);
    if (foundStandalone) {
      completeTask({
        id,
        completed: foundStandalone.completed_at === null,
        milestoneId: null,
      });
      return;
    }

    const allGoals = activeGoalsQuery.data || [];
    for (const goal of allGoals) {
      for (const milestone of goal.milestones) {
        const found = milestone.tasks.find(t => t.id === id);
        if (found) {
          completeTask({
            id,
            completed: found.completed_at === null,
            milestoneId: milestone.id,
          });
          return;
        }
      }
    }
  }, [completeTask, standaloneTasksQuery.data, activeGoalsQuery.data]);

  const handleMilestoneStatusChange = useCallback((id: string, status: 'pending' | 'completed') => {
    const activeGoals = activeGoalsQuery.data || [];
    for (const goal of activeGoals) {
      const found = goal.milestones.find(m => m.id === id);
      if (found) {
        updateMilestoneStatus({ id, status, goalId: goal.id });
        return;
      }
    }
  }, [updateMilestoneStatus, activeGoalsQuery.data]);

  const handleToggleGoalStatus = useCallback(
    (
      goalId: string,
      currentStatus: 'active' | 'achieved',
      title: string,
      remainingItems: number
    ) => {
      if (currentStatus === 'achieved') {
        Alert.alert(
          'Re-activate Goal',
          `Do you want to move "${title}" back to your Active Goals vault?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Re-activate',
              onPress: () => updateGoal({ id: goalId, updates: { status: 'active' } }),
            },
          ]
        );
      } else {
        if (remainingItems > 0) {
          Alert.alert(
            'Unfinished Tasks & Milestones',
            `"${title}" still has ${remainingItems} incomplete task(s)/milestone(s).\n\nAre you sure you want to mark this goal as Achieved now?`,
            [
              { text: 'Keep Working', style: 'cancel' },
              {
                text: 'Mark Achieved',
                onPress: () => updateGoal({ id: goalId, updates: { status: 'achieved' } }),
              },
            ]
          );
        } else {
          Alert.alert(
            'Goal Achievement',
            `Awesome work! Are you ready to mark "${title}" as completed?`,
            [
              { text: 'Not Yet', style: 'cancel' },
              {
                text: 'Mark Achieved',
                onPress: () => updateGoal({ id: goalId, updates: { status: 'achieved' } }),
              },
            ]
          );
        }
      }
    },
    [updateGoal]
  );

  const handleDeleteGoal = useCallback((goalId: string, title: string) => {
    Alert.alert(
      'Delete Goal',
      `Are you sure you want to delete "${title}"?\n\nThis goal will be removed from your active vault.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Goal',
          style: 'destructive',
          onPress: () => {
            deleteGoal(goalId);
          },
        },
      ]
    );
  }, [deleteGoal]);

  const handleQuickAddMilestone = useCallback((goalId: string, title: string) => {
    const goal = activeGoalsQuery.data?.find((g) => g.id === goalId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    createMilestoneMutation.mutate(
      {
        goal_id: goalId,
        title: title.trim(),
        due_date: goal?.deadline || null,
        status: 'pending',
        order_index: (goal?.milestones?.length || 0),
      },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          useUiStore.getState().showToast(`Milestone added: ${title}`, 'success');
        },
        onError: (err: any) => {
          Alert.alert('Error', err?.message || 'Could not add milestone');
        },
      }
    );
  }, [createMilestoneMutation, activeGoalsQuery.data]);

  const handleToggleMilestoneStatus = useCallback((
    milestoneId: string,
    goalId: string,
    currentStatus: 'pending' | 'completed'
  ) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    updateMilestoneStatus({ id: milestoneId, goalId, status: nextStatus });
  }, [updateMilestoneStatus]);

  const renderGoalItem = useCallback(({ item }: { item: AssembledGoal }) => (
    <GoalCard
      goal={item}
      isPrimary={item.is_primary}
      onAddMilestone={handleAddMilestone}
      onQuickAddMilestone={handleQuickAddMilestone}
      onToggleMilestoneStatus={handleToggleMilestoneStatus}
      onToggleStatus={handleToggleGoalStatus}
      onDeleteGoal={handleDeleteGoal}
    />
  ), [handleAddMilestone, handleQuickAddMilestone, handleToggleMilestoneStatus, handleToggleGoalStatus, handleDeleteGoal]);

  const renderAchievedGoalItem = useCallback(({ item }: { item: AssembledGoal }) => (
    <GoalCard
      goal={item}
      isPrimary={item.is_primary}
      onToggleMilestoneStatus={handleToggleMilestoneStatus}
      onToggleStatus={handleToggleGoalStatus}
      onDeleteGoal={handleDeleteGoal}
    />
  ), [handleToggleMilestoneStatus, handleToggleGoalStatus, handleDeleteGoal]);

  const handleDeleteMilestone = useCallback((id: string, goalId: string, title: string) => {
    Alert.alert(
      'Delete Milestone',
      `Are you sure you want to delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Milestone',
          style: 'destructive',
          onPress: () => {
            deleteMilestone({ id, goalId });
          },
        },
      ]
    );
  }, [deleteMilestone]);

  const renderMilestoneItem = useCallback(({ item }: { item: MilestoneSectionItem }) => {
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
        onStatusChange={handleMilestoneStatusChange}
        onAddTask={handleOpenCreateTask}
        onDeleteMilestone={handleDeleteMilestone}
      />
    );
  }, [handleMilestoneStatusChange, handleOpenCreateTask, handleDeleteMilestone]);

  const renderSectionHeader = useCallback(({ section }: { section: { id: string; title: string } }) => (
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
  ), []);

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
          onRetry={handleRetryActiveQuery}
        />
      );
    }

    const activeGoals = activeGoalsQuery.data || [];
    const standaloneTasks = standaloneTasksQuery.data || [];

    if (activeGoals.length === 0 && standaloneTasks.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <View style={{ marginBottom: 12 }}>
            <Mountain size={40} color="#5B4FE8" />
          </View>
          <Text style={styles.emptyText}>Your goal vault is empty</Text>
          <Text style={styles.emptySubText}>Set your first big goal and break it into daily steps</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={handleOpenCreateGoal}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Create First Goal"
          >
            <Text style={styles.emptyButtonText}>Create First Goal</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlatList
        ref={activeListRef}
        data={activeGoals}
        keyExtractor={(item) => item.id}
        removeClippedSubviews={Platform.OS === 'android'}
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={8}
        renderItem={renderGoalItem}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
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
          <View style={styles.tasksSection}>
            <View style={styles.tasksSectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.sectionHeader}>{SECTION_TASKS}</Text>
                {standaloneTasks.length > 0 && (
                  <View style={styles.tasksCountBadge}>
                    <Text style={styles.tasksCountBadgeText}>{standaloneTasks.length}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={styles.addTaskInlineBtn}
                onPress={() => handleOpenCreateTask(null)}
                activeOpacity={0.7}
                accessibilityLabel="Add Task"
              >
                <Plus size={13} color="#5B4FE8" strokeWidth={2.6} />
                <Text style={styles.addTaskInlineText}>Add task</Text>
              </TouchableOpacity>
            </View>

            {standaloneTasks.length > 0 ? (
              <View style={styles.tasksContainer}>
                {standaloneTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onComplete={handleCompleteTask}
                    onReschedule={handleReschedule}
                    onDelete={handleDelete}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.tasksEmptyContainer}>
                <Text style={styles.tasksEmptyText}>No tasks created</Text>
                <TouchableOpacity
                  style={styles.emptyAddTaskButton}
                  onPress={() => handleOpenCreateTask(null)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.emptyAddTaskText}>+ Add a task to stay organized</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
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
        ref={milestonesListRef}
        sections={milestoneSections}
        keyExtractor={(item) => item.id}
        removeClippedSubviews={Platform.OS === 'android'}
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={8}
        renderItem={renderMilestoneItem}
        renderSectionHeader={renderSectionHeader}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
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
          <View style={{ marginBottom: 12 }}>
            <Trophy size={40} color="#E8A020" />
          </View>
          <Text style={styles.emptyText}>No achieved goals yet</Text>
          <Text style={styles.emptySubText}>Complete your first goal to see it here</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => setSelectedTab('active')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="View Active Goals"
          >
            <Text style={styles.emptyButtonText}>View Active Goals</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlatList
        ref={achievedListRef}
        data={achievedGoals}
        keyExtractor={(item) => item.id}
        removeClippedSubviews={Platform.OS === 'android'}
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={8}
        renderItem={renderAchievedGoalItem}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
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
      <StatusBar barStyle="dark-content" backgroundColor="#F7F6F3" translucent={false} />
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

      {/* Goal Creation Bottom Sheet */}
      <CreateGoalSheet
        ref={createGoalSheetRef}
        isVisible={isGoalSheetVisible}
        onClose={() => setIsGoalSheetVisible(false)}
        onSuccess={() => {
          setIsGoalSheetVisible(false);
        }}
      />

      {/* Task Creation Bottom Sheet */}
      <CreateTaskSheet
        ref={createTaskSheetRef}
        isVisible={isTaskSheetVisible}
        milestones={flatActiveMilestones}
        defaultMilestoneId={defaultMilestoneId}
        onClose={() => setIsTaskSheetVisible(false)}
        onSuccess={() => {
          setIsTaskSheetVisible(false);
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
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E7E3',
  },
  tabPillActive: {
    backgroundColor: '#5B4FE8',
    borderColor: '#5B4FE8',
  },
  tabText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#7E8098',
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
  tasksContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    overflow: 'hidden',
  },
  tasksSectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeader: {
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    color: '#17172A',
    fontWeight: '600',
  },
  tasksCountBadge: {
    backgroundColor: 'rgba(91, 79, 232, 0.1)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tasksCountBadgeText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 11,
    color: '#5B4FE8',
  },
  addTaskInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(91, 79, 232, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  addTaskInlineText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 12,
    color: '#5B4FE8',
  },
  tasksEmptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tasksEmptyText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#9B9BAF',
    marginBottom: 8,
  },
  emptyAddTaskButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  emptyAddTaskText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 13,
    color: '#5B4FE8',
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
  emptyButton: {
    backgroundColor: '#5B4FE8',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 18,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    fontWeight: '600',
  },
});
