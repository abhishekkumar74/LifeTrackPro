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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, ArrowLeft, CheckCircle2, AlertCircle, CalendarRange } from 'lucide-react-native';

import { supabase } from '@/lib/supabase/client';
import { COLORS, TYPOGRAPHY, SHADOWS, SPACING, RADIUS } from '@/constants/theme';
import { ScheduleBlock, ScheduleLog } from '@/types/app.types';
import { getTodayLocal } from '@/lib/utils/date';

export default function RoutineAnalyticsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');

  const { data: routinesData, isLoading, error } = useQuery({
    queryKey: ['routineAnalyticsList'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const userId = session.user.id;

      // Get current week dates (Monday to Sunday)
      const today = new Date();
      const day = today.getDay();
      const distance = day === 0 ? 6 : day - 1; // monday is 1
      const monday = new Date(today);
      monday.setDate(today.getDate() - distance);
      const weekDates: string[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        weekDates.push(d.toLocaleDateString('en-CA'));
      }

      const todayStr = getTodayLocal();

      // Fetch all schedule blocks and logs for the current week
      const [blocksRes, logsRes] = await Promise.all([
        supabase.from('schedule_blocks').select('*').eq('user_id', userId).order('start_time', { ascending: true }),
        supabase.from('schedule_logs').select('*').eq('user_id', userId).gte('date', weekDates[0]).lte('date', weekDates[6])
      ]);

      if (blocksRes.error) throw blocksRes.error;
      if (logsRes.error) throw logsRes.error;

      const blocks = blocksRes.data as ScheduleBlock[];
      const logs = logsRes.data as ScheduleLog[];

      // Calculate compliance rates for each block this week
      const mappedRoutines = blocks.map(block => {
        const blockLogs = logs.filter(l => l.block_id === block.id);
        const statuses = weekDates.map(date => {
          let isScheduled = false;
          if (block.specific_date) {
            isScheduled = block.specific_date === date;
          } else if (block.days) {
            const dateObj = new Date(date);
            const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 1 = Monday, etc.
            isScheduled = block.days.includes(dayOfWeek);
          }

          let status: 'completed' | 'skipped' | 'missed' | 'pending' | 'none' = 'none';
          
          if (isScheduled) {
            const log = blockLogs.find(l => l.date === date);
            if (log) {
              status = log.status;
            } else if (date > todayStr) {
              status = 'pending';
            } else if (date < todayStr) {
              status = 'missed';
            } else {
              // Today: check if end_time has passed
              const now = new Date();
              const currentMinutes = now.getHours() * 60 + now.getMinutes();
              const eParts = block.end_time.split(':');
              const endMinutes = eParts.length >= 2 ? parseInt(eParts[0], 10) * 60 + parseInt(eParts[1], 10) : 0;
              
              if (currentMinutes > endMinutes) {
                status = 'missed';
              } else {
                status = 'pending';
              }
            }
          }

          return { date, isScheduled, status };
        });

        const scheduledPastCount = statuses.filter(s => s.isScheduled && s.status !== 'pending').length;
        const completedCount = statuses.filter(s => s.status === 'completed').length;
        const skippedCount = statuses.filter(s => s.status === 'skipped').length;
        const missedCount = statuses.filter(s => s.status === 'missed').length;

        const complianceRate = scheduledPastCount > 0 
          ? Math.round((completedCount / scheduledPastCount) * 100) 
          : 100;

        return {
          ...block,
          complianceRate,
          completedCount,
          skippedCount,
          missedCount,
          totalScheduled: statuses.filter(s => s.isScheduled).length,
          scheduledPastCount,
        };
      });

      return mappedRoutines;
    }
  });

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

  const getRepeatDisplay = (block: ScheduleBlock) => {
    if (block.specific_date) return 'Once';
    if (block.days && block.days.length === 7) return 'Daily';
    if (block.days && block.days.length === 5 && !block.days.includes(0) && !block.days.includes(6)) return 'Weekdays';
    
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return block.days ? block.days.map(d => dayNames[d]).join(', ') : 'Once';
  };

  const filteredRoutines = routinesData?.filter(r => 
    activeTab === 'active' ? r.is_active : !r.is_active
  ) || [];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F6F3" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBack} onPress={() => router.back()} activeOpacity={0.6}>
          <ArrowLeft size={24} color="#17172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Routine Analytics</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tab Selectors */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.tabActive]}
          onPress={() => setActiveTab('active')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>Active</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'inactive' && styles.tabActive]}
          onPress={() => setActiveTab('inactive')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'inactive' && styles.tabTextActive]}>Archived</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5B4FE8" />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <AlertCircle size={40} color={COLORS.coral} />
          <Text style={styles.errorText}>Failed to load routines.</Text>
        </View>
      ) : filteredRoutines.length === 0 ? (
        <View style={styles.emptyContainer}>
          <CalendarRange size={48} color={COLORS.t3} style={{ marginBottom: 12 }} />
          <Text style={styles.emptyText}>No {activeTab} routines found.</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContainer}
        >
          {filteredRoutines.map((routine) => {
            const hasHistory = routine.scheduledPastCount > 0;
            return (
              <TouchableOpacity
                key={routine.id}
                style={[styles.routineCard, SHADOWS.card.ios]}
                onPress={() => router.push(`/routine_detail?id=${routine.id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={[styles.colorBar, { backgroundColor: routine.color }]} />
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.routineTitle} numberOfLines={1}>{routine.title}</Text>
                      {routine.subject && (
                        <Text style={styles.subjectText}>{routine.subject}</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.cardHeaderRight}>
                    <Text style={[
                      styles.compliancePercentage,
                      routine.complianceRate >= 80 ? styles.complianceGood : 
                      routine.complianceRate >= 50 ? styles.complianceAverage : 
                      styles.compliancePoor
                    ]}>
                      {hasHistory ? `${routine.complianceRate}%` : 'N/A'}
                    </Text>
                    <ChevronRight size={18} color="#9B9BAF" />
                  </View>
                </View>

                <View style={styles.cardSeparator} />

                <View style={styles.cardFooter}>
                  <View style={styles.footerItemTime}>
                    <Text style={styles.footerLabel}>Time</Text>
                    <Text style={styles.footerValue} numberOfLines={1} ellipsizeMode="tail">
                      {formatTime(routine.start_time)} - {formatTime(routine.end_time)}
                    </Text>
                  </View>
                  <View style={styles.footerItemSchedule}>
                    <Text style={styles.footerLabel}>Schedule</Text>
                    <Text style={styles.footerValue} numberOfLines={1} ellipsizeMode="tail">
                      {getRepeatDisplay(routine)}
                    </Text>
                  </View>
                  <View style={styles.footerItemCompleted}>
                    <Text style={styles.footerLabel}>Completed</Text>
                    <Text style={styles.footerValue} numberOfLines={1} ellipsizeMode="tail">
                      {routine.completedCount}/{routine.scheduledPastCount} slots
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
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
  headerTitle: {
    fontFamily: TYPOGRAPHY.fonts.display,
    fontSize: 26,
    fontWeight: '600',
    color: COLORS.t1,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  tab: {
    paddingVertical: 12,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.violet,
  },
  tabText: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.t3,
  },
  tabTextActive: {
    color: COLORS.violet,
    fontWeight: '600',
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
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 15,
    color: COLORS.t3,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  routineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  colorBar: {
    width: 4,
    height: 32,
    borderRadius: 2,
    marginRight: 12,
  },
  routineTitle: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.t1,
  },
  subjectText: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 12,
    color: COLORS.t2,
    marginTop: 2,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compliancePercentage: {
    fontFamily: TYPOGRAPHY.fonts.mono,
    fontSize: 16,
    fontWeight: 'bold',
  },
  complianceGood: {
    color: COLORS.mint,
  },
  complianceAverage: {
    color: COLORS.amber,
  },
  compliancePoor: {
    color: COLORS.coral,
  },
  cardSeparator: {
    height: 1,
    backgroundColor: '#F2F1EE',
    marginVertical: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerItemTime: {
    flex: 1.6,
  },
  footerItemSchedule: {
    flex: 0.8,
  },
  footerItemCompleted: {
    flex: 0.8,
    alignItems: 'flex-end',
  },
  footerLabel: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 10,
    color: COLORS.t3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  footerValue: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 12,
    color: COLORS.t2,
    fontWeight: '500',
  },
});
