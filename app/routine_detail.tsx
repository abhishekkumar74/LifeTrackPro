import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react-native';

import { supabase } from '@/lib/supabase/client';
import { COLORS, TYPOGRAPHY, SHADOWS, SPACING, RADIUS } from '@/constants/theme';
import { ScheduleBlock, ScheduleLog } from '@/types/app.types';
import { getTodayLocal } from '@/lib/utils/date';

export default function RoutineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // 1. Fetch Routine Block Details
  const blockQuery = useQuery<ScheduleBlock>({
    queryKey: ['routineBlockDetail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schedule_blocks')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as ScheduleBlock;
    },
  });

  // 2. Fetch 90-Day History Logs
  const historyQuery = useQuery<ScheduleLog[]>({
    queryKey: ['routineHistoryLogs', id],
    queryFn: async () => {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const ninetyDaysAgoStr = ninetyDaysAgo.toLocaleDateString('en-CA');

      const { data, error } = await supabase
        .from('schedule_logs')
        .select('*')
        .eq('block_id', id)
        .gte('date', ninetyDaysAgoStr);
      if (error) throw error;
      return data as ScheduleLog[];
    },
  });

  const block = blockQuery.data;
  const history = historyQuery.data || [];

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  };

  const getRepeatDisplay = (blockItem: ScheduleBlock) => {
    if (blockItem.specific_date) return 'Once';
    if (blockItem.days && blockItem.days.length === 7) return 'Daily';
    if (blockItem.days && blockItem.days.length === 5 && !blockItem.days.includes(0) && !blockItem.days.includes(6)) return 'Weekdays';
    
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return blockItem.days ? blockItem.days.map(d => dayNames[d]).join(', ') : 'Once';
  };

  // Check if date is scheduled for this block
  const isDateScheduled = (dateStr: string, blockItem: ScheduleBlock): boolean => {
    if (blockItem.specific_date) {
      return blockItem.specific_date === dateStr;
    }
    if (blockItem.days) {
      const dateObj = new Date(dateStr);
      const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 1 = Monday...
      return blockItem.days.includes(dayOfWeek);
    }
    return false;
  };

  // Navigable Calendar Calculations
  const handlePrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    const now = new Date();
    if (currentMonth.getFullYear() === now.getFullYear() && currentMonth.getMonth() === now.getMonth()) {
      return;
    }
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const generateMonthGrid = (viewDate: Date) => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay(); // 0 = Sunday
    const totalDays = new Date(year, month + 1, 0).getDate();

    const cells: {
      dateStr: string | null;
      isToday: boolean;
      isFuture: boolean;
      dayNum: number | null;
    }[] = [];

    // Padding
    for (let i = 0; i < startDayOfWeek; i++) {
      cells.push({ dateStr: null, isToday: false, isFuture: false, dayNum: null });
    }

    const todayStr = getTodayLocal();

    for (let d = 1; d <= totalDays; d++) {
      const mmStr = String(month + 1).padStart(2, '0');
      const ddStr = String(d).padStart(2, '0');
      const dateStr = `${year}-${mmStr}-${ddStr}`;

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

  const isDataLoading = blockQuery.isLoading || historyQuery.isLoading;

  if (isDataLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5B4FE8" />
        </View>
      </SafeAreaView>
    );
  }

  if (!block) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.errorContainer}>
          <AlertCircle size={40} color={COLORS.coral} />
          <Text style={styles.errorText}>Routine not found.</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Calculate 90-Day Analytics Stats
  const todayStr = getTodayLocal();
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  // Generate all dates in the last 90 days up to today
  const pastScheduledDates: string[] = [];
  const curr = new Date(ninetyDaysAgo);
  const end = new Date(todayStr);

  while (curr <= end) {
    const dStr = curr.toLocaleDateString('en-CA');
    if (isDateScheduled(dStr, block)) {
      pastScheduledDates.push(dStr);
    }
    curr.setDate(curr.getDate() + 1);
  }

  // Compute status metrics based on generated past scheduled dates
  let completedCount = 0;
  let skippedCount = 0;
  let missedCount = 0;

  pastScheduledDates.forEach(dStr => {
    const log = history.find(l => l.date === dStr);
    if (log) {
      if (log.status === 'completed') completedCount++;
      else if (log.status === 'skipped') skippedCount++;
      else if (log.status === 'missed') missedCount++;
    } else {
      // No log means missed, except if it is today and end time has not passed
      if (dStr === todayStr) {
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const eParts = block.end_time.split(':');
        const endMinutes = eParts.length >= 2 ? parseInt(eParts[0], 10) * 60 + parseInt(eParts[1], 10) : 0;
        
        if (currentMinutes > endMinutes) {
          missedCount++;
        }
      } else {
        missedCount++;
      }
    }
  });

  const totalSlotsCount = completedCount + skippedCount + missedCount;
  const complianceRate = totalSlotsCount > 0 
    ? Math.round((completedCount / totalSlotsCount) * 100) 
    : 100;

  const monthGrid = generateMonthGrid(currentMonth);
  const weekdayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F6F3" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBack} onPress={() => router.back()} activeOpacity={0.6}>
          <ArrowLeft size={24} color="#17172A" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <View style={[styles.colorDotHeader, { backgroundColor: block.color }]} />
          <Text style={styles.headerTitle} numberOfLines={1}>
            {block.title}
          </Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
        
        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Time Block</Text>
            <Text style={styles.infoVal}>
              {formatTime(block.start_time)} - {formatTime(block.end_time)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Scheduled Days</Text>
            <Text style={styles.infoVal}>{getRepeatDisplay(block)}</Text>
          </View>
          {block.subject && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Subject</Text>
              <Text style={styles.infoVal}>{block.subject}</Text>
            </View>
          )}
        </View>

        {/* Read-Only Banner */}
        <View style={styles.readOnlyBanner}>
          <AlertCircle size={16} color={COLORS.t2} style={{ marginRight: 8 }} />
          <Text style={styles.readOnlyText}>
            Routine logs are verified automatically. Manual overrides are disabled.
          </Text>
        </View>

        {/* 90-Day Analytics Streaks/Rate Cards */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, SHADOWS.card.ios]}>
            <Text style={[styles.statVal, { color: COLORS.violet }]}>
              {complianceRate}%
            </Text>
            <Text style={styles.statLabel}>Compliance Rate</Text>
          </View>
          <View style={[styles.statCard, SHADOWS.card.ios]}>
            <Text style={[styles.statVal, { color: COLORS.mint }]}>
              {completedCount}
            </Text>
            <Text style={styles.statLabel}>Done</Text>
          </View>
          <View style={[styles.statCard, SHADOWS.card.ios]}>
            <Text style={[styles.statVal, { color: COLORS.coral }]}>
              {missedCount}
            </Text>
            <Text style={styles.statLabel}>Missed</Text>
          </View>
          <View style={[styles.statCard, SHADOWS.card.ios]}>
            <Text style={[styles.statVal, { color: COLORS.t2 }]}>
              {skippedCount}
            </Text>
            <Text style={styles.statLabel}>Skipped</Text>
          </View>
        </View>

        {/* Calendar Card */}
        <View style={styles.calendarCard}>
          {/* Calendar Header with Navigation */}
          <View style={styles.calendarNavigation}>
            <Text style={styles.calendarMonthName}>
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </Text>
            <View style={styles.navButtons}>
              <TouchableOpacity onPress={handlePrevMonth} style={styles.navBtn} activeOpacity={0.6}>
                <ChevronLeft size={20} color="#17172A" />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleNextMonth} 
                style={[
                  styles.navBtn, 
                  currentMonth.getFullYear() === new Date().getFullYear() && 
                  currentMonth.getMonth() === new Date().getMonth() && 
                  styles.navBtnDisabled
                ]} 
                activeOpacity={0.6}
              >
                <ChevronRight size={20} color="#17172A" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Weekday labels */}
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
              if (cell.dayNum === null || !cell.dateStr) {
                return <View key={`pad-${idx}`} style={styles.calendarCell} />;
              }

              const scheduled = isDateScheduled(cell.dateStr, block);
              const logEntry = history.find(l => l.date === cell.dateStr);

              let cellStyle: any = styles.cellEmpty;
              let textStyle: any = styles.cellTextEmpty;

              if (cell.isFuture) {
                cellStyle = styles.cellFuture;
                textStyle = styles.cellTextFuture;
              } else if (!scheduled) {
                // Not scheduled
                cellStyle = styles.cellNotScheduled;
                textStyle = styles.cellTextNotScheduled;
              } else {
                // Scheduled & in the past/today
                if (logEntry) {
                  if (logEntry.status === 'completed') {
                    cellStyle = styles.cellPastDone;
                    textStyle = styles.cellTextWhite;
                  } else if (logEntry.status === 'skipped') {
                    cellStyle = styles.cellPastSkipped;
                    textStyle = styles.cellTextWhite;
                  } else if (logEntry.status === 'missed') {
                    cellStyle = styles.cellPastMissed;
                    textStyle = styles.cellTextMissed;
                  }
                } else {
                  // No log entry in the past means missed
                  if (cell.dateStr === todayStr) {
                    const now = new Date();
                    const currentMinutes = now.getHours() * 60 + now.getMinutes();
                    const eParts = block.end_time.split(':');
                    const endMinutes = eParts.length >= 2 ? parseInt(eParts[0], 10) * 60 + parseInt(eParts[1], 10) : 0;
                    
                    if (currentMinutes > endMinutes) {
                      cellStyle = styles.cellPastMissed;
                      textStyle = styles.cellTextMissed;
                    } else {
                      cellStyle = styles.cellTodayPending;
                      textStyle = styles.cellTextPending;
                    }
                  } else {
                    cellStyle = styles.cellPastMissed;
                    textStyle = styles.cellTextMissed;
                  }
                }
              }

              return (
                <View key={`day-${cell.dayNum}`} style={styles.calendarCell}>
                  <View style={[styles.cellCircle, cellStyle]}>
                    <Text style={[styles.cellText, textStyle]}>{cell.dayNum}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Calendar Legend */}
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.mint }]} />
              <Text style={styles.legendLabel}>Done</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.coral }]} />
              <Text style={styles.legendLabel}>Missed</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.t3 }]} />
              <Text style={styles.legendLabel}>Skipped</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.legendDotPending]} />
              <Text style={styles.legendLabel}>Pending/Unscheduled</Text>
            </View>
          </View>

        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#FFFFFF',
  },
  headerBack: {
    padding: 4,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 12,
  },
  colorDotHeader: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  headerTitle: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.t1,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
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
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 15,
    color: COLORS.t2,
    marginTop: 10,
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
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 13,
    color: COLORS.t3,
  },
  infoVal: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 13,
    color: COLORS.t1,
    fontWeight: '500',
  },
  readOnlyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.violetSoft,
    padding: 12,
    borderRadius: RADIUS.md,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D4CEFC',
  },
  readOnlyText: {
    flex: 1,
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 11,
    color: COLORS.t2,
    lineHeight: 15,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.sm,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statVal: {
    fontFamily: TYPOGRAPHY.fonts.mono,
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 9,
    color: COLORS.t3,
    marginTop: 4,
    textAlign: 'center',
  },
  calendarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  calendarNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarMonthName: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.t1,
  },
  navButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnDisabled: {
    opacity: 0.35,
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
    color: COLORS.t3,
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
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellText: {
    fontFamily: TYPOGRAPHY.fonts.mono,
    fontSize: 11,
    fontWeight: '500',
  },
  cellEmpty: {
    backgroundColor: '#FFFFFF',
  },
  cellTextEmpty: {
    color: COLORS.t1,
  },
  cellFuture: {
    backgroundColor: 'transparent',
  },
  cellTextFuture: {
    color: '#D1D1D6',
  },
  cellNotScheduled: {
    backgroundColor: 'transparent',
  },
  cellTextNotScheduled: {
    color: '#D1D1D6',
  },
  cellPastDone: {
    backgroundColor: COLORS.mint,
  },
  cellPastSkipped: {
    backgroundColor: COLORS.t3,
  },
  cellPastMissed: {
    backgroundColor: COLORS.coralSoft,
  },
  cellTodayPending: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: COLORS.violet,
  },
  cellTextPending: {
    color: COLORS.violet,
    fontWeight: 'bold',
  },
  cellTextWhite: {
    color: '#FFFFFF',
  },
  cellTextMissed: {
    color: COLORS.coral,
    fontWeight: '500',
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 20,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    paddingTop: 16,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendDotPending: {
    borderWidth: 1,
    borderColor: COLORS.violet,
    backgroundColor: 'transparent',
  },
  legendLabel: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 10,
    color: COLORS.t2,
  },
});
