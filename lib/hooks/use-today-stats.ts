import { supabase } from '@/lib/supabase/client';
import { getTodayLocal } from '@/lib/utils/date';
import { handleSupabaseError } from '@/lib/utils/handle-error';
import { useAuthStore } from '@/lib/store/auth.store';
import { Goal, Habit, ScheduleBlock, ScheduleSkipEntry, Task } from '@/types/app.types';
import { useCallback, useEffect, useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface TodayStats {
  topTask: Task | null;
  focusMinutesToday: number;
  tasksTotal: number;
  tasksDone: number;
  habitStreak: number;
  focusStreak: number;
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
        thirtyDaysSkipsLogsRes
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

        // 8. All completed focus sessions (for focus streak)
        supabase
          .from('focus_sessions')
          .select('started_at')
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
          .gte('date', thirtyDaysAgoStr)
      ]);

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

      // 4. Habit streak calculation
      const doneDates = new Set((habitLogsRes.data || []).map(l => l.date));
      let habitStreak = 0;

      const formatDateStr = (d: Date) => d.toLocaleDateString('en-CA');
      const checkDate = new Date();
      const checkDateTodayStr = formatDateStr(checkDate);
      checkDate.setDate(checkDate.getDate() - 1);
      const checkDateYesterdayStr = formatDateStr(checkDate);

      if (doneDates.has(checkDateTodayStr)) {
        habitStreak = 1;
        const curr = new Date();
        while (true) {
          curr.setDate(curr.getDate() - 1);
          const dateStr = formatDateStr(curr);
          if (doneDates.has(dateStr)) {
            habitStreak++;
          } else {
            break;
          }
        }
      } else if (doneDates.has(checkDateYesterdayStr)) {
        habitStreak = 1;
        const curr = new Date();
        curr.setDate(curr.getDate() - 1);
        while (true) {
          curr.setDate(curr.getDate() - 1);
          const dateStr = formatDateStr(curr);
          if (doneDates.has(dateStr)) {
            habitStreak++;
          } else {
            break;
          }
        }
      }

      // 4b. Focus streak calculation (completed sessions only)
      const completedFocusDates = new Set(
        (focusAllSessionsRes.data || []).map(fs => {
          const d = new Date(fs.started_at);
          return formatDateStr(d);
        })
      );
      let focusStreak = 0;

      if (completedFocusDates.has(checkDateTodayStr)) {
        focusStreak = 1;
        const curr = new Date();
        while (true) {
          curr.setDate(curr.getDate() - 1);
          const dateStr = formatDateStr(curr);
          if (completedFocusDates.has(dateStr)) {
            focusStreak++;
          } else {
            break;
          }
        }
      } else if (completedFocusDates.has(checkDateYesterdayStr)) {
        focusStreak = 1;
        const curr = new Date();
        curr.setDate(curr.getDate() - 1);
        while (true) {
          curr.setDate(curr.getDate() - 1);
          const dateStr = formatDateStr(curr);
          if (completedFocusDates.has(dateStr)) {
            focusStreak++;
          } else {
            break;
          }
        }
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
        // Fetch milestones
        const { data: milestonesData, error: milestonesError } = await supabase
          .from('milestones')
          .select('id')
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
          totalTasks: totalTasksCount,
          doneTasks: doneTasksCount,
        } as Goal & { totalTasks: number; doneTasks: number };
      }

      setData({
        topTask,
        focusMinutesToday,
        tasksTotal,
        tasksDone,
        habitStreak,
        focusStreak,
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
