import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { Habit } from '@/types/app.types';
import { getTodayLocal } from '@/lib/utils/date';
import { useAuthStore } from '@/lib/store/auth.store';
import { handleSupabaseError } from '@/lib/utils/handle-error';

export interface HabitWithStatus extends Habit {
  completedToday: boolean;
  logId: string | null;
}

// Generate last N days in YYYY-MM-DD local format (index 0 is today)
export function getLastNDaysLocal(n: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(d.toLocaleDateString('en-CA'));
  }
  return dates;
}

interface HabitDbRow extends Habit {
  habit_logs?: Array<{
    id: string;
    done: boolean;
    date: string;
  }>;
}

// 1. Fetch active habits for current user with today's completion status
export function useHabits() {
  const { user } = useAuthStore();
  return useQuery<HabitWithStatus[]>({
    queryKey: ['habits', user?.id],
    queryFn: async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Not authenticated');

      const today = getTodayLocal();
      const { data, error } = await supabase
        .from('habits')
        .select(`
          *,
          habit_logs!left(
            id, done, date
          )
        `)
        .eq('user_id', currentUser.id)
        .eq('is_active', true)
        .eq('habit_logs.date', today)
        .order('order_index', { ascending: true });

      if (error) throw error;

      return ((data as unknown as HabitDbRow[]) || []).map((h) => ({
        ...h,
        completedToday: h.habit_logs?.[0]?.done ?? false,
        logId: h.habit_logs?.[0]?.id ?? null,
      })) as HabitWithStatus[];
    },
    enabled: !!user?.id,
  });
}

// Extra: Fetch archived habits
export function useArchivedHabits() {
  const { user } = useAuthStore();
  return useQuery<Habit[]>({
    queryKey: ['habits', user?.id, 'archived'],
    queryFn: async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('is_active', false)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data as Habit[];
    },
    enabled: !!user?.id,
  });
}

// 2. Fetch last N days of logs for a specific habit (fills missing with done: false)
export function useHabitHistory(habitId: string, days: number) {
  const { user } = useAuthStore();
  return useQuery<{ date: string; done: boolean }[]>({
    queryKey: ['habitHistory', user?.id, habitId, days],
    queryFn: async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Not authenticated');

      const dates = getLastNDaysLocal(days);
      const oldestDate = dates[dates.length - 1];

      const { data, error } = await supabase
        .from('habit_logs')
        .select('date, done')
        .eq('habit_id', habitId)
        .eq('user_id', currentUser.id)
        .gte('date', oldestDate)
        .order('date', { ascending: false });

      if (error) throw error;

      const logMap = new Map<string, boolean>();
      (data || []).forEach((log) => {
        logMap.set(log.date, log.done);
      });

      return dates.map((date) => ({
        date,
        done: logMap.get(date) ?? false,
      }));
    },
    enabled: !!user?.id && !!habitId,
  });
}

// 3. Retrieve streak stats for a habit using the 60-day history query
export function useHabitStreak(habitId: string) {
  const historyQuery = useHabitHistory(habitId, 60);
  const history = historyQuery.data || [];

  let currentStreak = 0;
  let longestStreak = 0;
  let totalDone = 0;

  if (history.length > 0) {
    // Current streak (walking backwards starting from today/index 0)
    if (history[0].done) {
      for (const entry of history) {
        if (entry.done) {
          currentStreak++;
        } else {
          break;
        }
      }
    } else if (history.length > 1 && history[1].done) {
      for (let i = 1; i < history.length; i++) {
        if (history[i].done) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // Longest streak
    let tempStreak = 0;
    for (const entry of history) {
      if (entry.done) {
        tempStreak++;
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
      } else {
        tempStreak = 0;
      }
    }

    totalDone = history.filter((h) => h.done).length;
  }

  const completionRate = (totalDone / 60) * 100;

  return {
    currentStreak,
    longestStreak,
    totalDone,
    completionRate,
    isLoading: historyQuery.isLoading,
    error: historyQuery.error,
    refetch: historyQuery.refetch,
  };
}

// 4. Create new habit
export function useCreateHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (habitData: {
      emoji: string;
      title: string;
      frequency: 'daily' | 'weekdays' | 'custom';
      custom_days?: number[] | null;
      best_time?: 'morning' | 'afternoon' | 'evening' | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: existing, error: countError } = await supabase
        .from('habits')
        .select('order_index')
        .eq('user_id', user.id)
        .order('order_index', { ascending: false })
        .limit(1);

      if (countError) throw countError;
      const maxIndex = existing && existing.length > 0 ? existing[0].order_index : -1;

      const { data, error } = await supabase
        .from('habits')
        .insert({
          user_id: user.id,
          title: habitData.title,
          emoji: habitData.emoji,
          frequency: habitData.frequency ?? 'daily',
          custom_days: habitData.custom_days ?? null,
          best_time: habitData.best_time ?? null,
          order_index: maxIndex + 1,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Habit;
    },
    onSuccess: () => {
      const user = useAuthStore.getState().user;
      queryClient.invalidateQueries({ queryKey: ['habits', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: (err) => {
      handleSupabaseError(err, 'create_habit');
    },
  });
}

// 5. Update habit (with optimistic updates)
export function useUpdateHabit() {
  const queryClient = useQueryClient();

  return useMutation<
    Habit,
    Error,
    { id: string; updates: Partial<Omit<Habit, 'id' | 'user_id' | 'created_at' | 'updated_at'>> },
    { previousHabits: HabitWithStatus[] | undefined }
  >({
    mutationFn: async ({ id, updates }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('habits')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data as Habit;
    },
    onMutate: async ({ id, updates }) => {
      const user = useAuthStore.getState().user;
      await queryClient.cancelQueries({ queryKey: ['habits', user?.id] });
      const previousHabits = queryClient.getQueryData<HabitWithStatus[]>(['habits', user?.id]);

      if (previousHabits) {
        queryClient.setQueryData<HabitWithStatus[]>(['habits', user?.id], (old) => {
          if (!old) return [];
          return old.map((h) => (h.id === id ? { ...h, ...updates } : h));
        });
      }

      return { previousHabits };
    },
    onError: (err, _variables, context) => {
      const user = useAuthStore.getState().user;
      if (context?.previousHabits) {
        queryClient.setQueryData(['habits', user?.id], context.previousHabits);
      }
      handleSupabaseError(err, 'update_habit');
    },
    onSettled: (data) => {
      const user = useAuthStore.getState().user;
      queryClient.invalidateQueries({ queryKey: ['habits', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['habitStreak', user?.id, data.id] });
        queryClient.invalidateQueries({ queryKey: ['habitHistory', user?.id, data.id] });
      }
    },
  });
}

// 6. Archive habit (never hard delete)
export function useArchiveHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('habits')
        .update({ is_active: false })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data as Habit;
    },
    onSuccess: () => {
      const user = useAuthStore.getState().user;
      queryClient.invalidateQueries({ queryKey: ['habits', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: (err) => {
      handleSupabaseError(err, 'archive_habit');
    },
  });
}

// Extra: Restore habit
export function useRestoreHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('habits')
        .update({ is_active: true })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data as Habit;
    },
    onSuccess: () => {
      const user = useAuthStore.getState().user;
      queryClient.invalidateQueries({ queryKey: ['habits', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['habits', user?.id, 'archived'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: (err) => {
      handleSupabaseError(err, 'restore_habit');
    },
  });
}

// 7. Reorder active habits (with optimistic updates)
export function useReorderHabits() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ habitIds }: { habitIds: string[] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const promises = habitIds.map((id, index) =>
        supabase
          .from('habits')
          .update({ order_index: index })
          .eq('id', id)
          .eq('user_id', user.id)
      );

      const results = await Promise.all(promises);
      const firstError = results.find(r => r.error);
      if (firstError) throw firstError.error;

      return habitIds;
    },
    onMutate: async ({ habitIds }) => {
      const user = useAuthStore.getState().user;
      await queryClient.cancelQueries({ queryKey: ['habits', user?.id] });
      const previousHabits = queryClient.getQueryData<HabitWithStatus[]>(['habits', user?.id]);

      if (previousHabits) {
        const orderMap = new Map<string, number>();
        habitIds.forEach((id, index) => {
          orderMap.set(id, index);
        });

        queryClient.setQueryData<HabitWithStatus[]>(['habits', user?.id], (old) => {
          if (!old) return [];
          return [...old]
            .map((h) => {
              const newIdx = orderMap.get(h.id);
              return newIdx !== undefined ? { ...h, order_index: newIdx } : h;
            })
            .sort((a, b) => a.order_index - b.order_index);
        });
      }

      return { previousHabits };
    },
    onError: (err, _variables, context) => {
      const user = useAuthStore.getState().user;
      if (context?.previousHabits) {
        queryClient.setQueryData(['habits', user?.id], context.previousHabits);
      }
      handleSupabaseError(err, 'reorder_habits');
    },
    onSettled: () => {
      const user = useAuthStore.getState().user;
      queryClient.invalidateQueries({ queryKey: ['habits', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}
