import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useAndroidBackHandler } from '@/lib/hooks/use-android-back';
import { Skeleton } from '@/components/shared/Skeleton';

import { ArrowLeft, Flame, Star } from 'lucide-react-native';
import { supabase } from '@/lib/supabase/client';
import { COLORS, TYPOGRAPHY, SHADOWS } from '@/constants/theme';
import { getTodayLocal } from '@/lib/utils/date';
import {
  useHabitHistory,
  useHabitStreak,
  useUpdateHabit,
  useArchiveHabit,
  HabitWithStatus,
} from '@/lib/hooks/use-habits';
import { useToggleHabit } from '@/lib/hooks/use-toggle-habit';
import { CreateHabitSheet } from '@/components/habits/CreateHabitSheet';
import { Habit } from '@/types/app.types';

export default function HabitDetailScreen() {
  useAndroidBackHandler();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toggleHabit } = useToggleHabit();

  const [editSheetVisible, setEditSheetVisible] = useState(false);

  // Fetch the specific habit details
  const { data: habit, isLoading: isHabitLoading } = useQuery<Habit>({
    queryKey: ['habit', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Habit;
    },
  });

  // Fetch 60-day history logs
  const historyQuery = useHabitHistory(id, 60);
  const history = historyQuery.data || [];

  // Streak calculations
  const streak = useHabitStreak(id);

  // Mutations
  const updateHabit = useUpdateHabit();
  const archiveHabit = useArchiveHabit();

  // Calendar Helpers
  const generateMonthGrid = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay(); // 0 = Sunday
    const totalDays = new Date(year, month + 1, 0).getDate();

    const cells: {
      dateStr: string | null;
      isToday: boolean;
      isFuture: boolean;
      dayNum: number | null;
    }[] = [];

    // Weekday padding
    for (let i = 0; i < startDayOfWeek; i++) {
      cells.push({ dateStr: null, isToday: false, isFuture: false, dayNum: null });
    }

    const todayStr = getTodayLocal();

    for (let d = 1; d <= totalDays; d++) {
      const dateObj = new Date(year, month, d);
      const dateStr = dateObj.toLocaleDateString('en-CA');
      const isToday = dateStr === todayStr;
      const isFuture = dateStr > todayStr;
      cells.push({
        dateStr,
        isToday,
        isFuture,
        dayNum: d,
      });
    }

    return cells;
  };

  const isDateWithin7Days = (dateStr: string): boolean => {
    const todayStr = getTodayLocal();
    if (dateStr > todayStr) return false;

    const today = new Date(todayStr);
    const target = new Date(dateStr);
    const diffTime = today.getTime() - target.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays <= 7;
  };

  const handleCellPress = async (cell: { dateStr: string | null; isFuture: boolean }) => {
    if (!cell.dateStr || cell.isFuture) return;

    if (!isDateWithin7Days(cell.dateStr)) {
      Alert.alert(
        'Read-only Date',
        'You can only toggle completion status for today and the last 7 days.'
      );
      return;
    }

    // Determine current completion state from history
    const historyEntry = history.find((h) => h.date === cell.dateStr);
    const isCurrentlyDone = historyEntry?.done ?? false;

    // Trigger toggle
    await toggleHabit({
      habitId: id,
      date: cell.dateStr,
      completedToday: isCurrentlyDone,
      onOptimisticUpdate: (newValue) => {
        // Optimistic query data updates
        queryClient.setQueryData(['habitHistory', id, 60], (old: any) => {
          if (!old) return [];
          return old.map((item: any) =>
            item.date === cell.dateStr ? { ...item, done: newValue } : item
          );
        });

        // Trigger refetches to align UI state
        queryClient.invalidateQueries({ queryKey: ['habitHistory', id] });
        queryClient.invalidateQueries({ queryKey: ['habits'] });
        queryClient.invalidateQueries({ queryKey: ['todayStats'] });
        queryClient.invalidateQueries({ queryKey: ['stats'] });
      },
    });
  };

  // Best Time Preference Handler
  const handleSelectBestTime = (time: 'morning' | 'afternoon' | 'evening') => {
    if (!habit) return;
    const newTime = habit.best_time === time ? null : time;
    updateHabit.mutate(
      {
        id: habit.id,
        updates: { best_time: newTime },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['habit', id] });
        },
      }
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  // Archive Trigger
  const handleArchive = () => {
    if (!habit) return;
    Alert.alert(
      'Archive Habit',
      'Are you sure you want to archive this habit? Your streak history will be preserved forever, but it will be hidden from the home screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: () => {
            archiveHabit.mutate(habit.id, {
              onSuccess: () => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                queryClient.invalidateQueries({ queryKey: ['habits'] });
                router.back();
              },
            });
          },
        },
      ]
    );
  };

  // Bar Chart calculations (Last 8 weeks)
  const renderWeeklyChart = () => {
    const weeksData = [];
    for (let w = 0; w < 8; w++) {
      const startIdx = w * 7;
      const endIdx = startIdx + 7;
      const weekEntries = history.slice(startIdx, endIdx);
      const completedCount = weekEntries.filter((e) => e.done).length;
      const rate = weekEntries.length > 0 ? (completedCount / weekEntries.length) * 100 : 0;

      weeksData.push({
        label: `W${8 - w}`,
        rate,
        isCurrentWeek: w === 0,
      });
    }
    weeksData.reverse();

    const chartWidth = 320;
    const chartHeight = 120;
    const paddingLeft = 30;
    const paddingRight = 10;
    const paddingTop = 15;
    const paddingBottom = 25;

    const graphWidth = chartWidth - paddingLeft - paddingRight;
    const graphHeight = chartHeight - paddingTop - paddingBottom;
    const barWidth = 20;
    const spacing = (graphWidth - barWidth * 8) / 7;

    return (
      <View style={styles.chartWrapper}>
        <Svg width={chartWidth} height={chartHeight}>
          {/* Y Axis line labels */}
          <SvgText
            x={paddingLeft - 8}
            y={paddingTop + 5}
            fill="#9B9BAF"
            fontSize="10"
            textAnchor="end"
            fontFamily={TYPOGRAPHY.fonts.sans}
          >
            100%
          </SvgText>
          <SvgText
            x={paddingLeft - 8}
            y={paddingTop + graphHeight / 2 + 3}
            fill="#9B9BAF"
            fontSize="10"
            textAnchor="end"
            fontFamily={TYPOGRAPHY.fonts.sans}
          >
            50%
          </SvgText>
          <SvgText
            x={paddingLeft - 8}
            y={paddingTop + graphHeight + 3}
            fill="#9B9BAF"
            fontSize="10"
            textAnchor="end"
            fontFamily={TYPOGRAPHY.fonts.sans}
          >
            0%
          </SvgText>

          {/* Grid lines */}
          <Rect
            x={paddingLeft}
            y={paddingTop}
            width={graphWidth}
            height={1}
            fill="#E8E7E3"
          />
          <Rect
            x={paddingLeft}
            y={paddingTop + graphHeight / 2}
            width={graphWidth}
            height={1}
            fill="#E8E7E3"
          />
          <Rect
            x={paddingLeft}
            y={paddingTop + graphHeight}
            width={graphWidth}
            height={1}
            fill="#9B9BAF"
          />

          {weeksData.map((week, idx) => {
            const x = paddingLeft + idx * (barWidth + spacing);
            const barValHeight = (week.rate / 100) * graphHeight;
            const y = paddingTop + graphHeight - barValHeight;

            let barColor = '#E8E7E3';
            if (week.rate >= 70) {
              barColor = '#5B4FE8';
            } else if (week.rate >= 40) {
              barColor = '#EAE8FD';
            }

            return (
              <React.Fragment key={week.label}>
                {/* Bar */}
                <Rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(barValHeight, 2)}
                  rx={4}
                  fill={barColor}
                  stroke={week.isCurrentWeek ? '#5B4FE8' : 'transparent'}
                  strokeWidth={week.isCurrentWeek ? 1.5 : 0}
                />
                {/* X Axis Label */}
                <SvgText
                  x={x + barWidth / 2}
                  y={chartHeight - 8}
                  fill={week.isCurrentWeek ? '#5B4FE8' : '#9B9BAF'}
                  fontSize="10"
                  textAnchor="middle"
                  fontFamily={TYPOGRAPHY.fonts.sans}
                  fontWeight={week.isCurrentWeek ? 'bold' : 'normal'}
                >
                  {week.label}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      </View>
    );
  };

  const isDataLoading = isHabitLoading || historyQuery.isLoading || streak.isLoading;

  if (isDataLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={{ padding: 20 }}>
          {/* Header Skeleton */}
          <Skeleton width="60%" height={30} borderRadius={8} style={{ marginBottom: 20 }} />
          {/* Streak Card Skeletons */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
            <Skeleton width="48%" height={100} borderRadius={16} />
            <Skeleton width="48%" height={100} borderRadius={16} />
          </View>
          {/* Calendar Grid Skeleton */}
          <Skeleton width="100%" height={240} borderRadius={16} style={{ marginBottom: 20 }} />
          {/* History List Skeleton */}
          <Skeleton width="100%" height={60} borderRadius={12} style={{ marginBottom: 12 }} />
        </View>
      </SafeAreaView>
    );
  }

  if (!habit) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Habit not found.</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const monthGrid = generateMonthGrid();
  const weekdayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBack}
          onPress={() => router.back()}
          activeOpacity={0.6}
        >
          <ArrowLeft size={20} color="#17172A" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {habit.title}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.headerEdit}
          onPress={() => setEditSheetVisible(true)}
          activeOpacity={0.6}
        >
          <Text style={styles.headerEditText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {/* Streak Stats Cards */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, SHADOWS.card.ios]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.statVal}>{streak.currentStreak}</Text>
              <Flame size={18} color="#E8A020" fill="#E8A020" style={{ marginLeft: 3 }} />
            </View>
            <Text style={styles.statLabel}>Current streak</Text>
          </View>
          <View style={[styles.statCard, SHADOWS.card.ios]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.statVal}>{streak.longestStreak}</Text>
              <Star size={18} color="#E8A020" fill="#E8A020" style={{ marginLeft: 3 }} />
            </View>
            <Text style={styles.statLabel}>Best streak</Text>
          </View>
          <View style={[styles.statCard, SHADOWS.card.ios]}>
            <Text style={styles.statVal}>
              {Math.round(streak.completionRate)}
              <Text style={styles.statUnit}>%</Text>
            </Text>
            <Text style={styles.statLabel}>Last 60 days</Text>
          </View>
        </View>

        {/* Monthly Calendar View */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>This Month</Text>

          {/* Calendar Headers */}
          <View style={styles.calendarHeaders}>
            {weekdayLabels.map((lbl, idx) => (
              <Text key={lbl + idx} style={styles.calendarHeaderCell}>
                {lbl}
              </Text>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarGrid}>
            {monthGrid.map((cell, idx) => {
              if (cell.dayNum === null) {
                return <View key={`pad-${idx}`} style={styles.calendarCell} />;
              }

              // Find completed status from history
              const isFuture = cell.isFuture;
              const logEntry = history.find((h) => h.date === cell.dateStr);
              const isDone = logEntry?.done ?? false;
              const isToday = cell.isToday;

              let cellStyle = styles.cellEmpty;
              let textStyle = styles.cellTextEmpty;

              if (isFuture) {
                cellStyle = styles.cellFuture;
                textStyle = styles.cellTextFuture;
              } else {
                if (isDone) {
                  if (isToday) {
                    cellStyle = styles.cellTodayDone;
                  } else {
                    cellStyle = styles.cellPastDone;
                  }
                  textStyle = styles.cellTextWhite;
                } else {
                  if (isToday) {
                    cellStyle = styles.cellTodayNotDone;
                    textStyle = styles.cellTextTodayNotDone;
                  } else {
                    // Past missed
                    cellStyle = styles.cellPastMissed;
                    textStyle = styles.cellTextPastMissed;
                  }
                }
              }

              return (
                <TouchableOpacity
                  key={`day-${cell.dayNum}`}
                  style={styles.calendarCell}
                  onPress={() => handleCellPress(cell)}
                  disabled={isFuture}
                  activeOpacity={0.6}
                >
                  <View style={[styles.cellCircle, cellStyle]}>
                    <Text style={[styles.cellText, textStyle]}>{cell.dayNum}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Weekly Completion Chart */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Last 8 Weeks</Text>
          {renderWeeklyChart()}
        </View>

        {/* Best Time preference */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Best Time to Do This</Text>
          <View style={styles.timeRow}>
            {(
              [
                { label: 'Morning', value: 'morning' },
                { label: 'Afternoon', value: 'afternoon' },
                { label: 'Evening', value: 'evening' },
              ] as const
            ).map((opt) => {
              const isSelected = habit.best_time === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.timePill,
                    isSelected && styles.timePillSelected,
                  ]}
                  onPress={() => handleSelectBestTime(opt.value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.timePillText,
                      isSelected && styles.timePillTextSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.dangerZone}>
          <Text style={styles.dangerZoneTitle}>Danger Zone</Text>
          <TouchableOpacity
            style={styles.archiveRow}
            onPress={handleArchive}
            activeOpacity={0.7}
          >
            <Text style={styles.archiveText}>Archive habit</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit bottom sheet modal */}
      <CreateHabitSheet
        isVisible={editSheetVisible}
        onClose={() => {
          setEditSheetVisible(false);
          // Refetch to sync state
          queryClient.invalidateQueries({ queryKey: ['habit', id] });
        }}
        editHabit={habit as HabitWithStatus}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F6F3',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 16,
    color: COLORS.t2,
    marginBottom: 16,
  },
  backBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: COLORS.violet,
    borderRadius: 20,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#E8E7E3',
    backgroundColor: '#FFFFFF',
  },
  headerBack: {
    padding: 6,
  },
  backIcon: {
    fontSize: 22,
    color: '#17172A',
    fontWeight: 'bold',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 12,
  },
  headerEmoji: {
    fontSize: 20,
    marginRight: 6,
  },
  headerTitle: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 18,
    fontWeight: '600',
    color: '#17172A',
  },
  headerEdit: {
    padding: 6,
  },
  headerEditText: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 14,
    color: '#5B4FE8',
    fontWeight: '600',
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E8E7E3',
  },
  statVal: {
    fontFamily: TYPOGRAPHY.fonts.mono,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#17172A',
  },
  statUnit: {
    fontSize: 16,
    fontWeight: 'normal',
  },
  statLabel: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 10,
    color: '#9B9BAF',
    marginTop: 4,
    textAlign: 'center',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8E7E3',
  },
  sectionTitle: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 14,
    color: '#17172A',
    fontWeight: '600',
    marginBottom: 16,
  },
  calendarHeaders: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  calendarHeaderCell: {
    width: '14.28%',
    textAlign: 'center',
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 11,
    color: '#9B9BAF',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
  },
  cellCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellText: {
    fontFamily: TYPOGRAPHY.fonts.mono,
    fontSize: 12,
    fontWeight: '500',
  },
  cellEmpty: {
    backgroundColor: '#FFFFFF',
  },
  cellTextEmpty: {
    color: '#17172A',
  },
  cellFuture: {
    backgroundColor: 'transparent',
  },
  cellTextFuture: {
    color: '#D1D1D6',
  },
  cellPastDone: {
    backgroundColor: '#00B894',
  },
  cellTodayDone: {
    backgroundColor: '#00B894',
    borderWidth: 2,
    borderColor: '#5B4FE8',
  },
  cellTextWhite: {
    color: '#FFFFFF',
  },
  cellPastMissed: {
    backgroundColor: '#FDE8E8',
  },
  cellTextPastMissed: {
    color: '#E85858',
  },
  cellTodayNotDone: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#5B4FE8',
  },
  cellTextTodayNotDone: {
    color: '#5B4FE8',
    fontWeight: 'bold',
  },
  chartWrapper: {
    alignItems: 'center',
    marginTop: 4,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timePill: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  timePillSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#5B4FE8',
  },
  timePillText: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 12,
    color: '#5C5C70',
    fontWeight: '500',
  },
  timePillTextSelected: {
    color: '#5B4FE8',
    fontWeight: 'bold',
  },
  dangerZone: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  dangerZoneTitle: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 14,
    color: COLORS.t1,
    fontWeight: '600',
    marginBottom: 12,
  },
  archiveRow: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.amber,
    borderRadius: 10,
  },
  archiveText: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 14,
    color: COLORS.amber,
    fontWeight: '600',
  },
});
