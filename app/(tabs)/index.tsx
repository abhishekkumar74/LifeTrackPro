import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { tabScrollRefs } from '@/lib/utils/tab-scroll';
import { markEnd } from '../../lib/utils/startup-perf';

import { useAuthStore } from '@/lib/store/auth.store';
import { useTodayStats } from '@/lib/hooks/use-today-stats';
import { toggleHabit } from '@/lib/hooks/use-toggle-habit';
import { queryClient } from '@/lib/query-client';

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

  const [taskSheetVisible, setTaskSheetVisible] = useState(false);
  const [scheduleSheetVisible, setScheduleSheetVisible] = useState(false);

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
    router.push('/focus');
  }, [router]);

  const handleSeeAllSchedule = useCallback(() => {
    router.push('/focus');
  }, [router]);

  const handleEditHabits = useCallback(() => {
    router.push('/habits');
  }, [router]);

  const handlePressFocusCard = useCallback(() => {
    router.push('/(tabs)/goals');
  }, [router]);

  const handleRefreshStats = useCallback(() => {
    stats.refetch();
  }, [stats]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Sticky Home Header */}
      <HomeHeader
        name={userName}
        streakCount={stats.habitStreak}
        isLoading={stats.isLoading}
      />

      {/* Scrollable Dashboard zones */}
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={stats.isLoading}
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
          <GoalBar goal={stats.primaryGoal} isLoading={stats.isLoading} />
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
});
