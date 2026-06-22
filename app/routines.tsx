import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { ScheduleBlock, ScheduleSkipEntry } from '@/types/app.types';
import { ArrowLeft, Plus, AlertCircle } from 'lucide-react-native';
import { QuickAddScheduleSheet } from '@/components/home/QuickAddScheduleSheet';
import { getSubjectColor } from '@/lib/utils/subject-colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ManageRoutinesScreen() {
  const router = useRouter();
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [skipsLog, setSkipsLog] = useState<ScheduleSkipEntry[]>([]);
  const [doneBlockIds, setDoneBlockIds] = useState<string[]>([]);
  const [skippedBlockIds, setSkippedBlockIds] = useState<string[]>([]);

  const { data: blocks = [], isLoading, refetch } = useQuery<ScheduleBlock[]>({
    queryKey: ['manageRoutinesList'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('schedule_blocks')
        .select('*')
        .eq('user_id', session.user.id)
        .order('start_time', { ascending: true });

      if (error) throw error;
      return data as ScheduleBlock[];
    },
  });

  useEffect(() => {
    const loadState = async () => {
      try {
        const today = new Date();
        const todayStr = today.toLocaleDateString('en-CA');

        // 1. Load done blocks
        const storedDone = await AsyncStorage.getItem(`done_blocks_${todayStr}`);
        if (storedDone) {
          setDoneBlockIds(JSON.parse(storedDone));
        }

        // 2. Load skipped blocks
        const storedSkipped = await AsyncStorage.getItem(`skipped_blocks_${todayStr}`);
        if (storedSkipped) {
          setSkippedBlockIds(JSON.parse(storedSkipped));
        }

        // 3. Load global skips log
        const storedSkipsLog = await AsyncStorage.getItem('schedule_skips_log');
        if (storedSkipsLog) {
          setSkipsLog(JSON.parse(storedSkipsLog));
        }
      } catch (err) {
        console.error('Failed to load skips/done state inside Settings', err);
      }
    };
    loadState();
  }, []);

  const formatTimeString = (timeStr: string) => {
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

  const performSkip = useCallback(async (blockId: string, reason: 'Sick' | 'Travelling' | 'Other') => {
    try {
      const today = new Date();
      const todayStr = today.toLocaleDateString('en-CA');

      // 1. Add block ID to skipped list for today
      const newSkipped = [...skippedBlockIds, blockId];
      setSkippedBlockIds(newSkipped);
      await AsyncStorage.setItem(`skipped_blocks_${todayStr}`, JSON.stringify(newSkipped));

      // 2. Add entry to global skips log
      const newEntry: ScheduleSkipEntry = {
        blockId,
        date: todayStr,
        reason,
      };
      const newSkipsLog = [...skipsLog, newEntry];
      setSkipsLog(newSkipsLog);
      await AsyncStorage.setItem('schedule_skips_log', JSON.stringify(newSkipsLog));

      Alert.alert('Success', 'Routine skipped for today.');
    } catch (err) {
      console.error('Failed to perform skip today inside Settings', err);
    }
  }, [skippedBlockIds, skipsLog]);

  const handleSkipBlockToday = useCallback((blockId: string) => {
    const today = new Date();
    const todayStr = today.toLocaleDateString('en-CA');
    const sevenDaysAgo = today.getTime() - 7 * 24 * 60 * 60 * 1000;

    // Rolling 7-day anti-abuse limit check
    const skipsThisWeek = skipsLog.filter((entry) => {
      if (entry.blockId !== blockId) return false;
      const entryTime = new Date(entry.date).getTime();
      return entryTime >= sevenDaysAgo && entry.date !== todayStr;
    });

    if (skipsThisWeek.length > 0) {
      Alert.alert(
        'Skip Limit Reached',
        'To prevent procrastination, you can only skip this schedule once in a rolling 7-day period. (Used this week)'
      );
      return;
    }

    Alert.alert(
      'Skip Routine Today',
      'Select a reason to skip this routine block. Skipped days do not break your streak.',
      [
        {
          text: 'Sick',
          onPress: () => performSkip(blockId, 'Sick'),
        },
        {
          text: 'Travelling',
          onPress: () => performSkip(blockId, 'Travelling'),
        },
        {
          text: 'Other',
          onPress: () => performSkip(blockId, 'Other'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  }, [skipsLog, performSkip]);

  const isBlockActiveToday = (block: ScheduleBlock) => {
    const today = new Date();
    const todayStr = today.toLocaleDateString('en-CA');
    if (block.specific_date) {
      return block.specific_date === todayStr;
    }
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    return !!(block.days && block.days.includes(currentDay));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#17172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Routines</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setEditingBlock(null);
            setSheetVisible(true);
          }}
          activeOpacity={0.7}
        >
          <Plus size={20} color="#5B4FE8" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.introText}>
          Add, edit, or delete your recurring study blocks. Edits made here permanently update the schedule series (changes apply starting tomorrow).
        </Text>

        {isLoading ? (
          <ActivityIndicator color="#5B4FE8" style={{ marginTop: 40 }} />
        ) : blocks.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No routine schedules set.</Text>
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => {
                setEditingBlock(null);
                setSheetVisible(true);
              }}
            >
              <Text style={styles.createBtnText}>+ Create routine</Text>
            </TouchableOpacity>
          </View>
        ) : (
          blocks.map((block) => {
            const accentColor = getSubjectColor(block.subject);
            // Calculate rolling 30-day skip count
            const thirtyDaysAgo = new Date().getTime() - 30 * 24 * 60 * 60 * 1000;
            const skipsThisMonth = skipsLog.filter((entry) => {
              if (entry.blockId !== block.id) return false;
              const entryTime = new Date(entry.date).getTime();
              return entryTime >= thirtyDaysAgo;
            });
            const skipCount = skipsThisMonth.length;
            const showNudge = skipCount >= 3;

            return (
              <TouchableOpacity
                key={block.id}
                style={styles.blockCard}
                onPress={() => {
                  setEditingBlock(block);
                  setSheetVisible(true);
                }}
                activeOpacity={0.8}
              >
                <View style={styles.cardMainContainer}>
                  <View style={[styles.colorBar, { backgroundColor: accentColor }]} />
                  <View style={styles.cardInfo}>
                    <Text style={styles.blockTitle}>{block.title}</Text>
                    <Text style={styles.blockTime}>
                      {formatTimeString(block.start_time)} • {getRepeatDisplay(block)}
                    </Text>
                  </View>
                  {block.subject && (
                    <View style={[styles.subjectBadge, { marginRight: 8 }]}>
                      <Text style={[styles.subjectBadgeText, { color: accentColor }]}>
                        {block.subject}
                      </Text>
                    </View>
                  )}
                  {isBlockActiveToday(block) && (
                    <View style={styles.todayActionArea}>
                      {doneBlockIds.includes(block.id) ? (
                        <View style={styles.statusDoneBadge}>
                          <Text style={styles.statusDoneText}>Done</Text>
                        </View>
                      ) : skippedBlockIds.includes(block.id) ? (
                        <View style={styles.statusSkippedBadge}>
                          <Text style={styles.statusSkippedText}>Skipped</Text>
                        </View>
                      ) : skipsLog.some(entry => {
                        const today = new Date();
                        const todayStr = today.toLocaleDateString('en-CA');
                        const sevenDaysAgo = today.getTime() - 7 * 24 * 60 * 60 * 1000;
                        return entry.blockId === block.id && new Date(entry.date).getTime() >= sevenDaysAgo && entry.date !== todayStr;
                      }) ? (
                        <View style={styles.skipLimitLabelContainer}>
                          <Text style={styles.skipLimitLabelText}>Used skip</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.skipTodayBtn}
                          onPress={() => handleSkipBlockToday(block.id)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.skipTodayBtnText}>Skip Today</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
                {showNudge && (
                  <View style={styles.nudgeContainer}>
                    <AlertCircle size={14} color="#D97706" style={styles.nudgeIcon} />
                    <Text style={styles.nudgeText}>
                      Skipped {skipCount} times this month — want to update the schedule?
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <QuickAddScheduleSheet
        isVisible={sheetVisible}
        onClose={() => {
          setSheetVisible(false);
          setEditingBlock(null);
        }}
        onSuccess={refetch}
        editingBlock={editingBlock}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F6F3',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E7E3',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    color: '#17172A',
    fontWeight: '600',
  },
  addButton: {
    padding: 4,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  introText: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#9B9BAF',
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  emptyText: {
    fontFamily: 'DMSans',
    fontSize: 14,
    color: '#9B9BAF',
    marginBottom: 12,
  },
  createBtn: {
    backgroundColor: '#5B4FE8',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  createBtnText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  blockCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    padding: 16,
    flexDirection: 'column',
    alignItems: 'stretch',
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  cardMainContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  nudgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 10,
    gap: 6,
  },
  nudgeIcon: {
    marginRight: 2,
  },
  nudgeText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10.5,
    color: '#B45309',
    fontWeight: '500',
    flex: 1,
  },
  colorBar: {
    width: 4,
    height: 38,
    borderRadius: 2,
    marginRight: 14,
  },
  cardInfo: {
    flex: 1,
  },
  blockTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: '#17172A',
    fontWeight: '600',
  },
  blockTime: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#9B9BAF',
    marginTop: 4,
  },
  subjectBadge: {
    backgroundColor: 'rgba(91, 79, 232, 0.08)',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  subjectBadgeText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    fontWeight: '600',
  },
  todayActionArea: {
    marginLeft: 8,
  },
  statusDoneBadge: {
    backgroundColor: '#D1FAE5',
    borderColor: '#34D399',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusDoneText: {
    color: '#065F46',
    fontFamily: 'DMSans-Bold',
    fontSize: 10,
    fontWeight: '700',
  },
  statusSkippedBadge: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusSkippedText: {
    color: '#374151',
    fontFamily: 'DMSans-Bold',
    fontSize: 10,
    fontWeight: '700',
  },
  skipLimitLabelContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  skipLimitLabelText: {
    color: '#9CA3AF',
    fontFamily: 'DMSans-Medium',
    fontSize: 9.5,
    fontWeight: '500',
  },
  skipTodayBtn: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  skipTodayBtnText: {
    color: '#374151',
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    fontWeight: '600',
  },
});
