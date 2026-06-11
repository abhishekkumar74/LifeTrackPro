import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, StatusBar, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { tabScrollRefs } from '@/lib/utils/tab-scroll';
import { markEnd } from '../../lib/utils/startup-perf';

import { useAuthStore } from '@/lib/store/auth.store';
import { useTodayStats } from '@/lib/hooks/use-today-stats';
import { toggleHabit } from '@/lib/hooks/use-toggle-habit';
import { queryClient } from '@/lib/query-client';
import { useSyllabus } from '@/lib/hooks/use-syllabus';
import { useCompleteTask } from '@/lib/hooks/use-tasks';
import { getSubjectColor } from '@/lib/utils/subject-colors';

// Import Home Dashboard Components
import { HomeHeader } from '@/components/home/HomeHeader';
import { TodayFocusCard } from '@/components/home/TodayFocusCard';
import { QuickStats } from '@/components/home/QuickStats';
import { ScheduleStrip } from '@/components/home/ScheduleStrip';
import { HabitRow } from '@/components/home/HabitRow';
import { GoalBar } from '@/components/home/GoalBar';
import { DailyCheckinCard } from '@/components/home/DailyCheckinCard';

// Quick Add Sheets
import { QuickAddTaskSheet } from '@/components/home/QuickAddTaskSheet';
import { QuickAddScheduleSheet } from '@/components/home/QuickAddScheduleSheet';

// Constants
const BG_COLOR = '#F7F6F3';
const STATUS_BAR_STYLE = 'dark';

export default function HomeDashboardScreen(): React.JSX.Element {
  const router = useRouter();
  const { profile, user } = useAuthStore();
  const stats = useTodayStats();
  const syllabusQuery = useSyllabus();

  const [taskSheetVisible, setTaskSheetVisible] = useState(false);
  const [scheduleSheetVisible, setScheduleSheetVisible] = useState(false);
  const completeTaskMutation = useCompleteTask();

  const handleRefreshStats = useCallback(() => {
    stats.refetch();
    syllabusQuery.refetch();
  }, [stats, syllabusQuery]);

  const handleToggleTask = useCallback(async (taskId: string, isCompleted: boolean, milestoneId: string | null) => {
    completeTaskMutation.mutate({
      id: taskId,
      completed: !isCompleted,
      milestoneId: milestoneId,
    }, {
      onSuccess: () => {
        handleRefreshStats();
      }
    });
  }, [completeTaskMutation, handleRefreshStats]);

  // Tab scroll registration
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    tabScrollRefs['home'] = scrollRef;
    return () => {
      delete tabScrollRefs['home'];
    };
  }, []);

  useEffect(() => {
    markEnd('app_boot');
  }, []);

  // Combine auth profile name and default fallback
  const userName = profile?.name || 'Achiever';

  const isCse = profile?.category === 'cse_student';
  const subCategory = profile?.sub_category && profile.sub_category.length > 0
    ? profile.sub_category[0]
    : '';

  // Extract syllabus stats for CSE students
  const syllabusStats = useMemo(() => {
    if (!syllabusQuery.data) {
      return { totalTopics: 0, completedTopics: 0, firstIncompleteTopic: null };
    }
    let total = 0;
    let completed = 0;
    let firstIncomplete: any = null;

    const subjects = Object.keys(syllabusQuery.data).sort();
    for (const subject of subjects) {
      const subData = syllabusQuery.data[subject];
      total += subData.totalCount;
      completed += subData.doneCount;

      if (!firstIncomplete) {
        const chapters = Object.keys(subData.chapters).sort();
        for (const chapter of chapters) {
          const topics = subData.chapters[chapter];
          const incomplete = topics.find(t => t.status !== 'done');
          if (incomplete) {
            firstIncomplete = incomplete;
          }
        }
      }
    }

    return { totalTopics: total, completedTopics: completed, firstIncompleteTopic: firstIncomplete };
  }, [syllabusQuery.data]);

  const handleToggleHabit = useCallback(async (habitId: string) => {
    const habit = stats.habits.find((h) => h.id === habitId);
    if (!habit) return;

    await toggleHabit(
      habitId,
      habit.completedToday,
      (newDone) => {
        stats.updateHabitCompletedToday(habitId, newDone);
        // Update React Query cache optimistically
        queryClient.setQueryData(
          ['todayStats', user?.id],
          (old: any) => ({
            ...old,
            habits: old?.habits?.map((h: any) =>
              h.id === habitId 
                ? { ...h, completedToday: newDone }
                : h
            ) ?? []
          })
        );
      }
    );
  }, [stats.habits, user?.id]);

  const handleStartFocus = useCallback(() => {
    if (isCse) {
      const isInterviewPrep = !subCategory || 
        subCategory.includes('Amazon') || 
        subCategory.includes('Google') || 
        subCategory.includes('Microsoft') || 
        subCategory.includes('Meta') || 
        subCategory.includes('FAANG') || 
        subCategory.includes('SDE') || 
        subCategory.includes('SWE') || 
        subCategory.includes('Placement') ||
        subCategory.includes('GATE');

      let sub = 'Data Structures & Algorithms';
      let goalText = '2hr DSA practice';

      if (!isInterviewPrep) {
        sub = syllabusStats.firstIncompleteTopic?.subject || 'Backend Development';
        goalText = syllabusStats.firstIncompleteTopic 
          ? `Practice: ${syllabusStats.firstIncompleteTopic.topic}` 
          : '2hr Backend practice';
      }

      router.push({
        pathname: '/focus',
        params: {
          suggestedSubject: sub,
          suggestedGoal: goalText,
        }
      });
    } else {
      router.push('/focus');
    }
  }, [router, isCse, subCategory, syllabusStats]);

  const handleSeeAllSchedule = useCallback(() => {
    router.push('/focus');
  }, [router]);

  const handleEditHabits = useCallback(() => {
    router.push('/habits');
  }, [router]);

  const handlePressFocusCard = useCallback(() => {
    router.push('/(tabs)/goals');
  }, [router]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Sticky Home Header */}
      <HomeHeader
        name={userName}
        streakCount={stats.habitStreak}
        isLoading={stats.isLoading}
        avatarUrl={profile?.avatar_url}
      />

      {/* Scrollable Dashboard zones */}
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={stats.isLoading || syllabusQuery.isFetching}
            onRefresh={handleRefreshStats}
            tintColor="#5B4FE8"
            colors={['#5B4FE8']}
          />
        }
      >
        {/* Zone B — Today's Focus Card */}
        <TodayFocusCard
          task={stats.topTask}
          isLoading={stats.isLoading}
          onStartFocus={handleStartFocus}
          onAddTask={() => setTaskSheetVisible(true)}
          onPressCard={handlePressFocusCard}
          isCse={isCse}
          userGoal={subCategory}
          firstIncompleteTopic={syllabusStats.firstIncompleteTopic}
        />

        {/* Zone C — Quick Stats Row */}
        <View style={styles.statsWrapper}>
          <QuickStats
            focusMinutes={stats.focusMinutesToday}
            tasksTotal={stats.tasksTotal}
            tasksDone={stats.tasksDone}
            streakDays={stats.habitStreak}
            isLoading={stats.isLoading}
          />
        </View>

        {/* Today's Tasks Section */}
        <View style={styles.sectionWrapper}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderTitle}>Today's Tasks</Text>
            <TouchableOpacity onPress={() => setTaskSheetVisible(true)} activeOpacity={0.6}>
              <Text style={styles.seeAllText}>+ Add task</Text>
            </TouchableOpacity>
          </View>
          {stats.todayTasks && stats.todayTasks.length > 0 ? (
            <View style={styles.tasksContainer}>
              {stats.todayTasks.map((t) => {
                const isCompleted = t.completed_at !== null;
                const accentColor = t.subject ? getSubjectColor(t.subject) : '#9B9BAF';
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.taskItem, isCompleted && styles.taskItemCompleted]}
                    onPress={() => handleToggleTask(t.id, isCompleted, t.milestone_id)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.checkbox, isCompleted && styles.checkboxChecked]}>
                      {isCompleted && <Text style={styles.checkboxCheck}>✓</Text>}
                    </View>
                    <View style={styles.taskTextContent}>
                      <Text
                        style={[styles.taskTitleText, isCompleted && styles.taskTitleTextCompleted]}
                        numberOfLines={1}
                      >
                        {t.title}
                      </Text>
                      {t.subject && (
                        <View style={styles.taskSubjectBadge}>
                          <View style={[styles.subjectDot, { backgroundColor: accentColor }]} />
                          <Text style={styles.taskSubjectText}>{t.subject}</Text>
                        </View>
                      )}
                    </View>
                    {t.priority === 'urgent' && <Text style={styles.priorityEmoji}>🔴</Text>}
                    {t.priority === 'important' && <Text style={styles.priorityEmoji}>🟡</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyTasksCard}>
              <Text style={styles.emptyTasksText}>No tasks added for today</Text>
              <TouchableOpacity onPress={() => setTaskSheetVisible(true)} activeOpacity={0.6}>
                <Text style={styles.emptyTasksLink}>Add a task to stay focused</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Zone D — Schedule Strip */}
        <View style={styles.sectionWrapper}>
          <ScheduleStrip
            blocks={stats.nextBlocks}
            isLoading={stats.isLoading}
            onSeeAll={handleSeeAllSchedule}
            onAddSchedule={() => setScheduleSheetVisible(true)}
          />
        </View>

        {/* Zone E — Habit Row */}
        <View style={styles.sectionWrapper}>
          <HabitRow
            habits={stats.habits}
            isLoading={stats.isLoading}
            onToggle={handleToggleHabit}
            onEdit={handleEditHabits}
          />
        </View>

        {/* Daily Check-in Card */}
        <View style={styles.sectionWrapper}>
          <DailyCheckinCard />
        </View>

        {/* Zone F — Goal Bar */}
        <View style={styles.goalWrapper}>
          <GoalBar
            goal={stats.primaryGoal}
            isLoading={stats.isLoading}
            isCse={isCse}
            subCategory={subCategory}
            totalTopics={syllabusStats.totalTopics}
            completedTopics={syllabusStats.completedTopics}
          />
        </View>
      </ScrollView>

      {/* Quick Add Task Bottom Sheet */}
      <QuickAddTaskSheet
        isVisible={taskSheetVisible}
        onClose={() => setTaskSheetVisible(false)}
        onSuccess={handleRefreshStats}
      />

      {/* Quick Add Schedule Block Bottom Sheet */}
      <QuickAddScheduleSheet
        isVisible={scheduleSheetVisible}
        onClose={() => setScheduleSheetVisible(false)}
        onSuccess={handleRefreshStats}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100, // extra padding to avoid overlapping the bottom tab bar
  },
  statsWrapper: {
    marginTop: 16,
    width: '100%',
  },
  sectionWrapper: {
    marginTop: 24,
    width: '100%',
  },
  goalWrapper: {
    marginTop: 16,
    width: '100%',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionHeaderTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#17172A',
    fontWeight: '600',
  },
  seeAllText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: '#5B4FE8',
    fontWeight: '500',
  },
  tasksContainer: {
    width: '100%',
  },
  taskItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  taskItemCompleted: {
    opacity: 0.65,
    backgroundColor: '#F8F8F7',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#9B9BAF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#5B4FE8',
    borderColor: '#5B4FE8',
  },
  checkboxCheck: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  taskTextContent: {
    flex: 1,
  },
  taskTitleText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#17172A',
    fontWeight: '600',
  },
  taskTitleTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#9B9BAF',
  },
  taskSubjectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  subjectDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  taskSubjectText: {
    fontFamily: 'DMSans',
    fontSize: 10,
    color: '#9B9BAF',
  },
  priorityEmoji: {
    fontSize: 12,
    marginLeft: 8,
  },
  emptyTasksCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTasksText: {
    fontFamily: 'DMSans',
    fontSize: 13,
    color: '#9B9BAF',
    marginBottom: 4,
  },
  emptyTasksLink: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#5B4FE8',
    fontWeight: '600',
  },
});
