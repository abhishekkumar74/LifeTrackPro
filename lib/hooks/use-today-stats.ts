import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Task, Habit, ScheduleBlock, Goal } from '@/types/app.types';
import { getTodayLocal } from '@/lib/utils/date';

export interface TodayStats {
  topTask: Task | null;
  focusMinutesToday: number;
  tasksTotal: number;
  tasksDone: number;
  habitStreak: number;
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
    habits: (Habit & { completedToday: boolean })[];
    nextBlocks: ScheduleBlock[];
    primaryGoal: (Goal & { totalTasks: number; doneTasks: number }) | null;
  }>({
    topTask: null,
    focusMinutesToday: 0,
    tasksTotal: 0,
    tasksDone: 0,
    habitStreak: 0,
    habits: [],
    nextBlocks: [],
    primaryGoal: null,
  });

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Verify session exists
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsLoading(false);
        return;
      }

      const today = new Date();
      const todayStr = getTodayLocal();

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
        primaryGoalRes
      ] = await Promise.all([
        // 1. Top priority task
        supabase
          .from('tasks')
          .select('*')
          .is('completed_at', null)
          .or(`due_date.lte.${todayStr},due_date.is.null`),

        // 2. Focus sessions today
        supabase
          .from('focus_sessions')
          .select('duration_min')
          .gte('started_at', startOfDay.toISOString())
          .lte('started_at', endOfDay.toISOString()),

        // 3. Today's task count (due_date = today)
        supabase
          .from('tasks')
          .select('completed_at')
          .eq('due_date', todayStr),

        // 4. All completed habit logs (for streak)
        supabase
          .from('habit_logs')
          .select('date, done')
          .eq('done', true),

        // 5a. Top active habits template
        supabase
          .from('habits')
          .select('*')
          .eq('is_active', true)
          .order('order_index', { ascending: true })
          .limit(5),

        // 5b. Today's habit logs
        supabase
          .from('habit_logs')
          .select('habit_id, done')
          .eq('date', todayStr),

        // 6. Schedule blocks (to filter in JS)
        supabase
          .from('schedule_blocks')
          .select('*')
          .eq('is_active', true),

        // 7. Primary goal
        supabase
          .from('goals')
          .select('*')
          .eq('is_primary', true)
          .eq('status', 'active')
          .limit(1)
          .maybeSingle(),
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

      // 2. Focus minutes today
      const focusMinutesToday = (focusRes.data || []).reduce(
        (sum, s) => sum + s.duration_min,
        0
      );

      // 3. Tasks count today
      const todayTasks = todayTasksRes.data || [];
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

      // 6. Schedule blocks parsing
      const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const currentHour = today.getHours();
      const currentMinute = today.getMinutes();
      const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(
        currentMinute
      ).padStart(2, '0')}:00`;

      const nextBlocks = (scheduleBlocksRes.data || [])
        .filter(block => {
          if (block.specific_date) {
            return block.specific_date === todayStr && block.start_time > currentTimeStr;
          }
          if (block.days && block.days.includes(currentDay)) {
            return block.start_time > currentTimeStr;
          }
          return false;
        })
        .sort((a, b) => a.start_time.localeCompare(b.start_time))
        .slice(0, 2) as ScheduleBlock[];

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
        habits,
        nextBlocks,
        primaryGoal,
      });
    } catch (err) {
      if (__DEV__) {
        console.error('Error fetching today stats:', err);
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
    fetchStats();
  }, [fetchStats]);

  return {
    ...data,
    isLoading,
    error,
    refetch: fetchStats,
    updateHabitCompletedToday,
  };
}
