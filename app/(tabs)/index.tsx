import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { tabScrollRefs } from '@/lib/utils/tab-scroll';

import { useAuthStore } from '@/lib/store/auth.store';
import { useTodayStats } from '@/lib/hooks/use-today-stats';
import { useToggleHabit } from '@/lib/hooks/use-toggle-habit';

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
  const profile = useAuthStore((state) => state.profile);
  const stats = useTodayStats();
  const { toggleHabit } = useToggleHabit();

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

  // Combine auth profile name and default fallback
  const userName = profile?.name || 'Achiever';

  const handleToggleHabit = async (habitId: string) => {
    const habit = stats.habits.find((h) => h.id === habitId);
    if (!habit) return;

    // Use timezone-safe local date
    const todayStr = new Date().toLocaleDateString('en-CA');

    // Optimistic UI updates are managed via useToggleHabit callback
    await toggleHabit({
      habitId,
      date: todayStr,
      completedToday: habit.completedToday,
      onOptimisticUpdate: (newValue) => {
        stats.updateHabitCompletedToday(habitId, newValue);
      },
    });
  };

  const handleStartFocus = () => {
    router.push('/focus');
  };

  const handleSeeAllSchedule = () => {
    router.push('/focus');
  };

  const handleEditHabits = () => {
    router.push('/habits');
  };

  const handlePressFocusCard = () => {
    router.push('/(tabs)/goals');
  };

  const handleRefreshStats = () => {
    stats.refetch();
  };

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
