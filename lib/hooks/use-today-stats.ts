import { supabase } from '@/lib/supabase/client';
import { getTodayLocal } from '@/lib/utils/date';
import { handleSupabaseError } from '@/lib/utils/handle-error';
import { useAuthStore } from '@/lib/store/auth.store';
import { Goal, Habit, ScheduleBlock, ScheduleSkipEntry, Task } from '@/types/app.types';
import { useCallback, useEffect, useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStreakShieldCount } from '@/lib/utils/focus-rewards';

export interface SparklineData {
  focus: number[];
  tasks: number[];
  streak: number[];
  focusMinutes7d: number[];
  tasksDone7d: number[];
}

export interface TodayStats {
  topTask: Task | null;
  focusMinutesToday: number;
  tasksTotal: number;
  tasksDone: number;
  habitStreak: number;
  focusStreak: number;
  activeStreak: number;
  bestStreak: number;
  isStreakBroken: boolean;
  canRestoreYesterday: boolean;
  isTodayCompleted: boolean;
  isYesterdayCompleted: boolean;
  previousStreak: number;
  streakShields: number;
  weeklyActivity: boolean[];
  sparklines: SparklineData;
  habits: (Habit & { completedToday: boolean })[];
  nextBlocks: ScheduleBlock[];
  primaryGoal: (Goal & {
    totalTasks: number;
    doneTasks: number;
  }) | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  updateHabitCompletedToday: (habitId: string, completed: boolean) => void;
  todayTasks: Task[];
  doneBlockIds: string[];
  skippedBlockIds: string[];
  skipsLog: ScheduleSkipEntry[];
}

export function useTodayStats(): TodayStats {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    topTask: Task | null;
    focusMinutesToday: number;
    tasksTotal: number;
    tasksDone: number;
    habitStreak: number;
    focusStreak: number;
    activeStreak: number;
    bestStreak: number;
    isStreakBroken: boolean;
    canRestoreYesterday: boolean;
    isTodayCompleted: boolean;
    isYesterdayCompleted: boolean;
    previousStreak: number;
    streakShields: number;
    weeklyActivity: boolean[];
    sparklines: SparklineData;
    habits: (Habit & { completedToday: boolean })[];
    nextBlocks: ScheduleBlock[];
    primaryGoal: (Goal & { totalTasks: number; doneTasks: number }) | null;
    todayTasks: Task[];
    doneBlockIds: string[];
    skippedBlockIds: string[];
    skipsLog: ScheduleSkipEntry[];
  }>({
    topTask: null,
    focusMinutesToday: 0,
    tasksTotal: 0,
    tasksDone: 0,
    habitStreak: 0,
    focusStreak: 0,
    activeStreak: 0,
    bestStreak: 1,
    isStreakBroken: false,
    canRestoreYesterday: false,
    isTodayCompleted: false,
    isYesterdayCompleted: false,
    previousStreak: 0,
    streakShields: 1,
    weeklyActivity: [false, false, false, false, false, false, false],
    sparklines: {
      focus: [3, 6, 8, 12, 16, 8, 18],
      tasks: [4, 8, 6, 12, 16, 10, 18],
      streak: [5, 8, 10, 12, 14, 16, 18],
      focusMinutes7d: [0, 0, 0, 0, 0, 0, 0],
      tasksDone7d: [0, 0, 0, 0, 0, 0, 0],
    },
    habits: [],
    nextBlocks: [],
    primaryGoal: null,
    todayTasks: [],
    doneBlockIds: [],
    skippedBlockIds: [],
    skipsLog: [],
  });

  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(() => {
        const d = dataRef.current;
        const hasData = d.habits.length > 0 || d.todayTasks.length > 0 || d.focusMinutesToday > 0;
        return hasData ? false : true;
      });
      setError(null);

      // Verify user ID exists
      const userId = useAuthStore.getState().user?.id || (await supabase.auth.getSession()).data.session?.user?.id;
      if (!userId) {
        setIsLoading(false);
        return;
      }

      const today = new Date();
      const todayStr = getTodayLocal();

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const yyyy = thirtyDaysAgo.getFullYear();
      const mm = String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0');
      const dd = String(thirtyDaysAgo.getDate()).padStart(2, '0');
      const thirtyDaysAgoStr = `${yyyy}-${mm}-${dd}`;

      // Define start & end of today in ISO format for focus sessions
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      // Run parallel fetches
      const [
        tasksRes,
        focusRes,
        todayTasksRes,
        habitLogsRes,
        habitsRes,
        todayHabitLogsRes,
        scheduleBlocksRes,
        primaryGoalRes,
        focusAllSessionsRes,
        todayScheduleLogsRes,
        thirtyDaysSkipsLogsRes,
        allCompletedTasksRes
      ] = await Promise.all([
        // 1. Top priority task
        supabase
          .from('tasks')
          .select('*')
          .eq('user_id', userId)
          .is('completed_at', null)
          .or(`due_date.lte.${todayStr},due_date.is.null`),

        // 2. Focus sessions today (need status to exclude interrupted ones)
        supabase
          .from('focus_sessions')
          .select('duration_min, status')
          .eq('user_id', userId)
          .gte('started_at', startOfDay.toISOString())
          .lte('started_at', endOfDay.toISOString()),

        // 3. Today's task list (due_date = today)
        supabase
          .from('tasks')
          .select('*')
          .eq('user_id', userId)
          .eq('due_date', todayStr),

        // 4. All completed habit logs (for streak)
        supabase
          .from('habit_logs')
          .select('date, done')
          .eq('user_id', userId)
          .eq('done', true),

        // 5a. Top active habits template
        supabase
          .from('habits')
          .select('*')
          .eq('user_id', userId)
          .eq('is_active', true)
          .order('order_index', { ascending: true })
          .limit(5),

        // 5b. Today's habit logs
        supabase
          .from('habit_logs')
          .select('habit_id, done')
          .eq('user_id', userId)
          .eq('date', todayStr),

        // 6. Schedule blocks (to filter in JS)
        supabase
          .from('schedule_blocks')
          .select('*')
          .eq('user_id', userId)
          .eq('is_active', true),

        // 7. Primary goal
        supabase
          .from('goals')
          .select('*')
          .eq('user_id', userId)
          .eq('is_primary', true)
          .eq('status', 'active')
          .limit(1)
          .maybeSingle(),

        // 8. All completed focus sessions (for focus streak & 7-day sparkline)
        supabase
          .from('focus_sessions')
          .select('started_at, duration_min')
          .eq('user_id', userId)
          .eq('status', 'completed'),

        // 9. Today's schedule logs
        supabase
          .from('schedule_logs')
          .select('*')
          .eq('user_id', userId)
          .eq('date', todayStr),

        // 10. Skips log (status = skipped in last 30 days)
        supabase
          .from('schedule_logs')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'skipped')
          .gte('date', thirtyDaysAgoStr),

        // 11. All completed tasks (for activity streak & 7-day tasks sparkline)
        supabase
          .from('tasks')
          .select('completed_at')
          .eq('user_id', userId)
          .not('completed_at', 'is', null)
      ]);

      const streakShields = await getStreakShieldCount();

      // Check errors
      if (tasksRes.error) throw tasksRes.error;
      if (focusRes.error) throw focusRes.error;
      if (todayTasksRes.error) throw todayTasksRes.error;
      if (habitLogsRes.error) throw habitLogsRes.error;
      if (habitsRes.error) throw habitsRes.error;
      if (todayHabitLogsRes.error) throw todayHabitLogsRes.error;
      if (scheduleBlocksRes.error) throw scheduleBlocksRes.error;
      if (primaryGoalRes.error) throw primaryGoalRes.error;
      if (focusAllSessionsRes.error) throw focusAllSessionsRes.error;
      if (todayScheduleLogsRes.error) throw todayScheduleLogsRes.error;
      if (thirtyDaysSkipsLogsRes.error) throw thirtyDaysSkipsLogsRes.error;
      if (allCompletedTasksRes.error) throw allCompletedTasksRes.error;

      // Extract schedule logs details
      const doneBlockIds = (todayScheduleLogsRes.data || [])
        .filter(l => l.status === 'completed')
        .map(l => l.block_id);

      const skippedBlockIds = (todayScheduleLogsRes.data || [])
        .filter(l => l.status === 'skipped')
        .map(l => l.block_id);

      const skipsLog: ScheduleSkipEntry[] = (thirtyDaysSkipsLogsRes.data || [])
        .map(l => ({
          blockId: l.block_id,
          date: l.date,
          reason: l.skip_reason as any || 'Other'
        }));

      // 1. Top priority task parsing
      let topTask: Task | null = null;
      const tasksData = tasksRes.data || [];
      if (tasksData.length > 0) {
        const sortedTasks = [...tasksData].sort((a, b) => {
          const priorityWeight = (priority: string) => {
            switch (priority) {
              case 'urgent': return 1;
              case 'important': return 2;
              default: return 3;
            }
          };
          const wA = priorityWeight(a.priority);
          const wB = priorityWeight(b.priority);
          if (wA !== wB) return wA - wB;

          // Due date first
          if (a.due_date && b.due_date) {
            return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
          }
          if (a.due_date) return -1;
          if (b.due_date) return 1;

          // Created at
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });
        topTask = sortedTasks[0] as Task;
      }

      // 2. Focus minutes today (completed only)
      const focusMinutesToday = (focusRes.data || [])
        .filter(s => s.status !== 'interrupted')
        .reduce((sum, s) => sum + s.duration_min, 0);

      // 3. Tasks count today (sorted: incomplete first, completed last, then by priority)
      const todayTasks = ((todayTasksRes.data || []) as Task[]).sort((a, b) => {
        const aDone = a.completed_at !== null;
        const bDone = b.completed_at !== null;
        if (aDone && !bDone) return 1;
        if (!aDone && bDone) return -1;

        const priorityWeight = (p: string) => {
          switch (p) {
            case 'urgent': return 1;
            case 'important': return 2;
            default: return 3;
          }
        };
        const wA = priorityWeight(a.priority);
        const wB = priorityWeight(b.priority);
        return wA - wB;
      });
      const tasksTotal = todayTasks.length;
      const tasksDone = todayTasks.filter(t => t.completed_at !== null).length;

      // 4. Active dates aggregation across ALL pillars (Habits, Focus sessions, Tasks, Schedules)
      const formatDateStr = (d: Date) => d.toLocaleDateString('en-CA');
      const allActiveDates = new Set<string>();

      // A. Habit dates
      const doneDates = new Set((habitLogsRes.data || []).map(l => l.date));
      doneDates.forEach(d => { if (d) allActiveDates.add(d); });

      // B. Focus session dates & 7-day focus minutes aggregation
      const dailyFocusMap: Record<string, number> = {};
      const completedFocusDates = new Set<string>();
      ((focusAllSessionsRes?.data || []) as { started_at: string | null; duration_min: number }[]).forEach(fs => {
        if (fs.started_at) {
          const dStr = formatDateStr(new Date(fs.started_at));
          completedFocusDates.add(dStr);
          allActiveDates.add(dStr);
          dailyFocusMap[dStr] = (dailyFocusMap[dStr] || 0) + (Number(fs.duration_min) || 0);
        }
      });
      if (focusMinutesToday > 0) {
        dailyFocusMap[todayStr] = Math.max(dailyFocusMap[todayStr] || 0, focusMinutesToday);
        allActiveDates.add(todayStr);
      }

      // C. Completed tasks dates & 7-day tasks aggregation
      const dailyTasksMap: Record<string, number> = {};
      ((allCompletedTasksRes?.data || []) as { completed_at: string | null }[]).forEach(t => {
        if (t.completed_at) {
          const dStr = formatDateStr(new Date(t.completed_at));
          allActiveDates.add(dStr);
          dailyTasksMap[dStr] = (dailyTasksMap[dStr] || 0) + 1;
        }
      });
      if (tasksDone > 0) {
        dailyTasksMap[todayStr] = Math.max(dailyTasksMap[todayStr] || 0, tasksDone);
        allActiveDates.add(todayStr);
      }

      // D. Schedule logs
      (todayScheduleLogsRes.data || []).forEach(sl => {
        if (sl.date && sl.status === 'completed') {
          allActiveDates.add(sl.date);
        }
      });

      // 4a. Real 7-day Sparkline calculations (from 6 days ago up to today)
      const past7Dates: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        past7Dates.push(formatDateStr(d));
      }

      // Focus Sparklines (Height 3 to 18 based on real minutes)
      const focusMinutes7d = past7Dates.map(dStr => dailyFocusMap[dStr] || 0);
      const maxFocusFound = Math.max(...focusMinutes7d, 45);
      const focusSparklines = focusMinutes7d.map(m => {
        if (m <= 0) return 3;
        return Math.min(18, Math.max(4, Math.round((m / maxFocusFound) * 18)));
      });

      // Tasks Sparklines (Height 3 to 18 based on real task completions)
      const tasksDone7d = past7Dates.map(dStr => dailyTasksMap[dStr] || 0);
      const maxTasksFound = Math.max(...tasksDone7d, 3);
      const tasksSparklines = tasksDone7d.map(c => {
        if (c <= 0) return 3;
        return Math.min(18, Math.max(4, Math.round((c / maxTasksFound) * 18)));
      });

      // Streak Sparklines (Reflecting daily consistency across the 7 days)
      const streakSparklines = past7Dates.map(dStr => {
        const isActive = allActiveDates.has(dStr);
        if (!isActive) return 3;
        const fMin = dailyFocusMap[dStr] || 0;
        const tCount = dailyTasksMap[dStr] || 0;
        if (fMin >= 45 && tCount >= 2) return 18;
        if (fMin >= 25 || tCount >= 2) return 14;
        if (fMin > 0 || tCount > 0) return 10;
        return 7;
      });

      const sparklines = {
        focus: focusSparklines,
        tasks: tasksSparklines,
        streak: streakSparklines,
        focusMinutes7d,
        tasksDone7d,
      };

      // 4b. Streak Calculations (Genuine, unified across Habits, Focus sessions, Tasks, Routines)
      const checkDate = new Date();
      const checkDateTodayStr = formatDateStr(checkDate);
      checkDate.setDate(checkDate.getDate() - 1);
      const checkDateYesterdayStr = formatDateStr(checkDate);

      const isTodayCompleted = allActiveDates.has(checkDateTodayStr);
      const isYesterdayCompleted = allActiveDates.has(checkDateYesterdayStr);

      const calcConsecutiveDaysFrom = (startOffset: number) => {
        let count = 0;
        const curr = new Date();
        curr.setDate(curr.getDate() - startOffset);
        while (count < 3650) {
          const dateStr = formatDateStr(curr);
          if (allActiveDates.has(dateStr)) {
            count++;
            curr.setDate(curr.getDate() - 1);
          } else {
            break;
          }
        }
        return count;
      };

      let activeStreak = 0;
      let isStreakBroken = false;
      let canRestoreYesterday = false;
      let previousStreak = 0;

      const streakEndingYesterday = calcConsecutiveDaysFrom(1);
      const streakEnding2DaysAgo = calcConsecutiveDaysFrom(2);

      if (isTodayCompleted) {
        // Today is completed -> Streak is active!
        activeStreak = calcConsecutiveDaysFrom(0);
        isStreakBroken = false;
        // If yesterday was missed but 2 days ago had activity, user can restore yesterday to bridge and save their previous streak
        if (!isYesterdayCompleted && streakEnding2DaysAgo > 0) {
          canRestoreYesterday = true;
          previousStreak = streakEnding2DaysAgo;
        }
      } else if (isYesterdayCompleted) {
        // Today is still in progress, yesterday was completed -> Streak is alive!
        activeStreak = streakEndingYesterday;
        isStreakBroken = false;
        canRestoreYesterday = false;
        previousStreak = activeStreak;
      } else {
        // Neither today nor yesterday completed
        if (streakEnding2DaysAgo > 0) {
          // Missed yesterday! Streak broke
          isStreakBroken = true;
          canRestoreYesterday = true;
          previousStreak = streakEnding2DaysAgo;
          activeStreak = 0;
        } else {
          // No recent activity
          isStreakBroken = false;
          canRestoreYesterday = false;
          previousStreak = 0;
          activeStreak = 0;
        }
      }

      // Calculate Genuine All-time Best Streak
      const sortedDates = Array.from(allActiveDates).sort();
      let bestStreak = 0;
      let currentRun = 0;
      let prevD: Date | null = null;

      for (const dStr of sortedDates) {
        const parts = dStr.split('-').map(Number);
        if (parts.length === 3) {
          const curD = new Date(parts[0], parts[1] - 1, parts[2]);
          if (prevD) {
            const diffTime = curD.getTime() - prevD.getTime();
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays === 1) {
              currentRun++;
            } else if (diffDays > 1) {
              currentRun = 1;
            }
          } else {
            currentRun = 1;
          }
          if (currentRun > bestStreak) {
            bestStreak = currentRun;
          }
          prevD = curD;
        }
      }
      bestStreak = Math.max(bestStreak, activeStreak, previousStreak, activeStreak > 0 ? activeStreak : (allActiveDates.size > 0 ? 1 : 0));

      const unifiedStreak = activeStreak;
      const habitStreak = activeStreak;
      const focusStreak = activeStreak;

      // 4c. Weekly activity calculation (Mon=0..Sun=6 for current week)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const distToMon = (dayOfWeek + 6) % 7;
      const monDate = new Date(now);
      monDate.setDate(now.getDate() - distToMon);

      const weeklyActivity: boolean[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(monDate);
        d.setDate(monDate.getDate() + i);
        const dStr = formatDateStr(d);
        weeklyActivity.push(allActiveDates.has(dStr));
      }

      // 5. Habits template and today logs merging
      const habits = (habitsRes.data || []).map(h => {
        const isCompleted = (todayHabitLogsRes.data || []).some(
          log => log.habit_id === h.id && log.done
        );
        return {
          ...h,
          frequency: h.frequency as 'daily' | 'weekdays' | 'custom',
          completedToday: isCompleted,
        };
      });

      // 6. Schedule blocks parsing (get all schedule blocks of the day)
      const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

      const nextBlocks = (scheduleBlocksRes.data || [])
        .filter(block => {
          if (block.specific_date) {
            return block.specific_date === todayStr;
          }
          if (block.days && block.days.includes(currentDay)) {
            return true;
          }
          return false;
        })
        .sort((a, b) => a.start_time.localeCompare(b.start_time))
        .slice(0, 15) as ScheduleBlock[];

      // 7. Primary goal with tasks count
      let primaryGoal: (Goal & { totalTasks: number; doneTasks: number }) | null = null;
      const goalData = primaryGoalRes.data;

      if (goalData) {
        // Fetch milestones with status
        const { data: milestonesData, error: milestonesError } = await supabase
          .from('milestones')
          .select('id, status, title')
          .eq('goal_id', goalData.id);

        if (milestonesError) throw milestonesError;

        let totalTasksCount = 0;
        let doneTasksCount = 0;

        if (milestonesData && milestonesData.length > 0) {
          const milestoneIds = milestonesData.map(m => m.id);
          const { data: goalTasksData, error: goalTasksError } = await supabase
            .from('tasks')
            .select('completed_at')
            .in('milestone_id', milestoneIds);

          if (goalTasksError) throw goalTasksError;

          if (goalTasksData) {
            totalTasksCount = goalTasksData.length;
            doneTasksCount = goalTasksData.filter(t => t.completed_at !== null).length;
          }
        }

        primaryGoal = {
          ...goalData,
          milestones: milestonesData || [],
          totalTasks: totalTasksCount,
          doneTasks: doneTasksCount,
        } as Goal & { totalTasks: number; doneTasks: number; milestones?: any[] };
      }

      setData({
        topTask,
        focusMinutesToday,
        tasksTotal,
        tasksDone,
        habitStreak,
        focusStreak,
        activeStreak: unifiedStreak,
        bestStreak,
        isStreakBroken,
        canRestoreYesterday,
        isTodayCompleted,
        isYesterdayCompleted,
        previousStreak,
        streakShields,
        weeklyActivity,
        sparklines,
        habits,
        nextBlocks,
        primaryGoal,
        todayTasks,
        doneBlockIds,
        skippedBlockIds,
        skipsLog,
      });

      const cachedPayload = {
        topTask,
        focusMinutesToday,
        tasksTotal,
        tasksDone,
        habitStreak,
        focusStreak,
        activeStreak: unifiedStreak,
        bestStreak,
        isStreakBroken,
        canRestoreYesterday,
        isTodayCompleted,
        isYesterdayCompleted,
        previousStreak,
        streakShields,
        weeklyActivity,
        sparklines,
        habits,
        nextBlocks,
        primaryGoal,
        todayTasks,
        doneBlockIds,
        skippedBlockIds,
        skipsLog,
      };
      AsyncStorage.setItem(`today_stats_cache_${userId}`, JSON.stringify(cachedPayload)).catch(() => {});
    } catch (err: any) {
      handleSupabaseError(err, 'fetch_today_stats');
      
      const isNetError = 
        err.message?.toLowerCase().includes('network') || 
        err.message?.toLowerCase().includes('fetch') || 
        err.message?.toLowerCase().includes('timeout') ||
        err.status === 0;

      if (isNetError) {
        try {
          const userId = useAuthStore.getState().user?.id;
          if (userId) {
            const cached = await AsyncStorage.getItem(`today_stats_cache_${userId}`);
            if (cached) {
              setData(JSON.parse(cached));
              setIsLoading(false);
              return;
            }
          }
        } catch (localErr) {
          if (__DEV__) console.warn('Failed to read offline stats cache:', localErr);
        }
      }

      setError('Failed to fetch dashboard stats');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateHabitCompletedToday = useCallback((habitId: string, completed: boolean) => {
    setData((prev) => {
      const updatedHabits = prev.habits.map((h) => {
        if (h.id === habitId) {
          return { ...h, completedToday: completed };
        }
        return h;
      });
      return {
        ...prev,
        habits: updatedHabits,
      };
    });
  }, []);

  useEffect(() => {
    const loadCacheAndFetch = async () => {
      try {
        const userId = useAuthStore.getState().user?.id || (await supabase.auth.getSession()).data.session?.user?.id;
        if (userId) {
          const cached = await AsyncStorage.getItem(`today_stats_cache_${userId}`);
          if (cached) {
            setData(JSON.parse(cached));
            setIsLoading(false);
          }
        }
      } catch (e) {
        if (__DEV__) console.warn('Failed to load initial today stats cache:', e);
      } finally {
        fetchStats();
      }
    };
    loadCacheAndFetch();
  }, [fetchStats]);

  return {
    ...data,
    isLoading,
    error,
    refetch: fetchStats,
    updateHabitCompletedToday,
  };
}
