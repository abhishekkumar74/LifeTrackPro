import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Skeleton } from '@/components/shared/Skeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { useAndroidBackHandler } from '@/lib/hooks/use-android-back';

import { COLORS, TYPOGRAPHY, SHADOWS } from '@/constants/theme';
import { getTodayLocal } from '@/lib/utils/date';
import { ArrowLeft, Flame } from 'lucide-react-native';
import { useAuthStore } from '@/lib/store/auth.store';
import {
  useHabits,
  useArchivedHabits,
  useReorderHabits,
  useRestoreHabit,
  HabitWithStatus,
} from '@/lib/hooks/use-habits';
import { useToggleHabit } from '@/lib/hooks/use-toggle-habit';
import { CreateHabitSheet } from '@/components/habits/CreateHabitSheet';

export default function HabitsManagementScreen() {
  useAndroidBackHandler();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { toggleHabit } = useToggleHabit();

  const [createSheetVisible, setCreateSheetVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [archivedExpanded, setArchivedExpanded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['habits', user?.id] }),
      queryClient.invalidateQueries({ queryKey: ['habits', user?.id, 'archived'] }),
    ]);
    setIsRefreshing(false);
  };

  // Queries
  const { data: habits = [], isLoading: isHabitsLoading } = useHabits();
  const { data: archivedHabits = [], isLoading: isArchivedLoading } = useArchivedHabits();

  // Mutations
  const reorderMutation = useReorderHabits();
  const restoreMutation = useRestoreHabit();

  // Completion calculation
  const totalHabits = habits.length;
  const { doneHabits, completionPercent } = useMemo(() => {
    const total = habits.length;
    const done = habits.filter((h) => h.completedToday).length;
    const percent = total > 0 ? (done / total) * 100 : 0;
    return { doneHabits: done, completionPercent: percent };
  }, [habits]);

  const handleToggleHabit = useCallback(async (habit: HabitWithStatus) => {
    const todayStr = getTodayLocal();
    await toggleHabit({
      habitId: habit.id,
      date: todayStr,
      completedToday: habit.completedToday,
      onOptimisticUpdate: (newValue) => {
        // Optimistic query data updates
        queryClient.setQueryData(['habits', user?.id], (old: any) => {
          if (!old) return [];
          return old.map((h: any) =>
            h.id === habit.id ? { ...h, completedToday: newValue } : h
          );
        });

        // Trigger background sync refetches
        queryClient.invalidateQueries({ queryKey: ['habits', user?.id] });
        queryClient.invalidateQueries({ queryKey: ['todayStats'] });
        queryClient.invalidateQueries({ queryKey: ['stats'] });
      },
    });
  }, [queryClient, user?.id]);

  // Reorder by Swapping
  const handleMove = useCallback(async (index: number, direction: 'up' | 'down') => {
    const newHabits = [...habits];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newHabits.length) return;

    // Swap elements
    const temp = newHabits[index];
    newHabits[index] = newHabits[targetIndex];
    newHabits[targetIndex] = temp;

    // Map to array of ids
    const habitIds = newHabits.map((h) => h.id);

    reorderMutation.mutate(
      { habitIds },
      {
        onSuccess: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        },
      }
    );
  }, [habits, reorderMutation]);

  // Restore Habit
  const handleRestore = useCallback((id: string) => {
    restoreMutation.mutate(id, {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      },
    });
  }, [restoreMutation]);

  const renderHabitRow = useCallback(({ item: habit, index }: { item: HabitWithStatus, index: number }) => {
    const isDone = habit.completedToday;
    return (
      <View style={styles.rowWrapper}>
        {/* Left drag-handle / reorder arrow section */}
        {isEditMode && (
          <View style={styles.reorderControls}>
            <Text style={styles.dragHandle}>⠿</Text>
            <View style={styles.arrowGroup}>
              <TouchableOpacity
                style={[styles.arrowBtn, index === 0 && styles.arrowBtnDisabled]}
                disabled={index === 0}
                onPress={() => handleMove(index, 'up')}
                accessibilityLabel="Move habit up"
                accessibilityRole="button"
                accessibilityHint="Move this habit higher in the listing order"
              >
                <Text style={styles.arrowText}>▲</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.arrowBtn,
                  index === habits.length - 1 && styles.arrowBtnDisabled,
                ]}
                disabled={index === habits.length - 1}
                onPress={() => handleMove(index, 'down')}
                accessibilityLabel="Move habit down"
                accessibilityRole="button"
                accessibilityHint="Move this habit lower in the listing order"
              >
                <Text style={styles.arrowText}>▼</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.habitRow}
          onPress={() => router.push(`/habit/${habit.id}`)}
          activeOpacity={0.7}
          accessibilityLabel={`Habit: ${habit.title}`}
          accessibilityRole="button"
          accessibilityHint="Double tap to open habit calendar and streak history"
        >
          <Text style={styles.habitEmoji}>{habit.emoji}</Text>
          <View style={styles.habitDetails}>
            <Text
              style={[styles.habitTitle, isDone && styles.habitTitleDone]}
              numberOfLines={1}
            >
              {habit.title}
            </Text>
            {/* Streak count */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
              <Flame size={11} color="#E8A020" fill="#E8A020" style={{ marginRight: 3 }} />
              <Text style={styles.streakBadge}>Daily</Text>
            </View>
          </View>

          {/* Checkbox toggle (only when not in edit mode) */}
          {!isEditMode && (
            <TouchableOpacity
              style={[styles.checkbox, isDone && styles.checkboxChecked]}
              onPress={() => handleToggleHabit(habit)}
              activeOpacity={0.6}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityState={{ checked: isDone }}
              accessibilityRole="checkbox"
              accessibilityLabel={`${habit.title} habit, ${isDone ? 'completed' : 'not completed'}`}
              accessibilityHint="Double tap to toggle completion status"
            >
              {isDone && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </View>
    );
  }, [isEditMode, habits.length, router, handleMove, handleToggleHabit]);

  const isLoading = isHabitsLoading || isArchivedLoading;

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
        <Text style={styles.headerTitle}>My Habits</Text>
        <View style={styles.headerActions}>
          {habits.length > 1 && (
            <TouchableOpacity
              style={styles.reorderBtn}
              onPress={() => {
                setIsEditMode(!isEditMode);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              }}
              activeOpacity={0.6}
            >
              <Text style={styles.reorderBtnText}>
                {isEditMode ? 'Done' : 'Reorder'}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setCreateSheetVisible(true)}
            activeOpacity={0.6}
          >
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.scrollContainer}>
          <Skeleton width="100%" height={80} borderRadius={16} style={{ marginBottom: 12 }} />
          <Skeleton width="100%" height={80} borderRadius={16} style={{ marginBottom: 12 }} />
          <Skeleton width="100%" height={80} borderRadius={16} style={{ marginBottom: 12 }} />
        </View>
      ) : (
        <FlatList
          data={habits}
          keyExtractor={(item) => item.id}
          removeClippedSubviews={Platform.OS === 'android'}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={8}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.scrollContainer}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.violet]}
              tintColor={COLORS.violet}
            />
          }
          ListHeaderComponent={
            <>
              {/* Completion Summary Card */}
              {habits.length > 0 && (
                <View style={[styles.summaryCard, SHADOWS.card.ios]}>
                  <Text style={styles.summaryText}>
                    {doneHabits}/{totalHabits} habits done today
                  </Text>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[styles.progressBarFill, { width: `${completionPercent}%` }]}
                    />
                  </View>
                </View>
              )}

              {/* Empty State */}
              {habits.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyTitle}>No habits yet</Text>
                  <Text style={styles.emptySubtitle}>
                    Add daily or weekly habits to start building your streak.
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyCreateBtn}
                    onPress={() => setCreateSheetVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.emptyCreateBtnText}>Create your first habit</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          }
          renderItem={renderHabitRow}
          ListFooterComponent={
            <>
              {/* Archived section */}
              {archivedHabits.length > 0 && (
                <View style={styles.archivedWrapper}>
                  <TouchableOpacity
                    style={styles.archivedHeader}
                    onPress={() => setArchivedExpanded(!archivedExpanded)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.archivedHeaderTitle}>
                      Archived ({archivedHabits.length})
                    </Text>
                    <Text style={styles.archivedHeaderArrow}>
                      {archivedExpanded ? '▲' : '▼'}
                    </Text>
                  </TouchableOpacity>

                  {archivedExpanded && (
                    <View style={styles.archivedList}>
                      {archivedHabits.map((habit) => (
                        <View key={habit.id} style={styles.archivedRow}>
                          <Text style={styles.archivedEmoji}>{habit.emoji}</Text>
                          <Text style={styles.archivedTitle} numberOfLines={1}>
                            {habit.title}
                          </Text>
                          <TouchableOpacity
                            style={styles.restoreBtn}
                            onPress={() => handleRestore(habit.id)}
                            activeOpacity={0.6}
                          >
                            <Text style={styles.restoreBtnText}>Restore</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </>
          }
        />
      )}

      {/* Create Bottom Sheet */}
      <CreateHabitSheet
        isVisible={createSheetVisible}
        onClose={() => setCreateSheetVisible(false)}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#E8E7E3',
    backgroundColor: '#FFFFFF',
  },
  headerBack: {
    padding: 6,
    marginRight: 8,
  },
  backIcon: {
    fontSize: 22,
    color: '#17172A',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontFamily: TYPOGRAPHY.fonts.display,
    fontSize: 28,
    color: '#17172A',
    fontWeight: 'bold',
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reorderBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: COLORS.violetSoft,
    marginRight: 8,
  },
  reorderBtnText: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 12,
    color: COLORS.violet,
    fontWeight: '600',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.violet,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '500',
    marginTop: -2,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E8E7E3',
  },
  summaryText: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 14,
    color: '#17172A',
    fontWeight: '600',
    marginBottom: 10,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E8E7E3',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#5B4FE8',
    borderRadius: 3,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 18,
    color: '#17172A',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 14,
    color: '#5C5C70',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyCreateBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    backgroundColor: COLORS.violet,
  },
  emptyCreateBtnText: {
    color: '#FFFFFF',
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 15,
    fontWeight: '600',
  },
  listContainer: {
    marginBottom: 20,
  },
  rowWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  reorderControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  dragHandle: {
    fontSize: 18,
    color: '#9B9BAF',
    marginRight: 8,
  },
  arrowGroup: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  arrowBtn: {
    padding: 3,
  },
  arrowBtnDisabled: {
    opacity: 0.2,
  },
  arrowText: {
    fontSize: 10,
    color: '#5C5C70',
  },
  habitRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E8E7E3',
  },
  habitEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  habitDetails: {
    flex: 1,
  },
  habitTitle: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 15,
    color: '#17172A',
    fontWeight: '600',
  },
  habitTitleDone: {
    color: '#9B9BAF',
    textDecorationLine: 'line-through',
  },
  streakBadge: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 11,
    color: '#E8A020',
    fontWeight: '600',
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D1D1D6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#00B894',
    borderColor: '#00B894',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  archivedWrapper: {
    marginTop: 20,
    borderTopWidth: 1,
    borderColor: '#E8E7E3',
    paddingTop: 16,
  },
  archivedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  archivedHeaderTitle: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 14,
    color: '#5C5C70',
    fontWeight: '600',
  },
  archivedHeaderArrow: {
    fontSize: 12,
    color: '#5C5C70',
  },
  archivedList: {
    marginTop: 10,
  },
  archivedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    opacity: 0.6,
  },
  archivedEmoji: {
    fontSize: 20,
    marginRight: 10,
  },
  archivedTitle: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 14,
    color: '#5C5C70',
    flex: 1,
  },
  restoreBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#F5F5F7',
  },
  restoreBtnText: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 11,
    color: '#17172A',
    fontWeight: '600',
  },
});
