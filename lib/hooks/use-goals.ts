import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { Goal, Milestone, Task } from '@/types/app.types';
import { useAuthStore } from '@/lib/store/auth.store';
import { handleSupabaseError } from '@/lib/utils/handle-error';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AssembledGoal = Goal & {
  totalTasks: number;
  doneTasks: number;
  milestones: (Milestone & { tasks: Task[] })[];
};

export function useGoals(status: 'active' | 'achieved' = 'active') {
  const { user } = useAuthStore();
  const cacheKey = `goals_list_${user?.id}_${status}`;

  return useQuery<AssembledGoal[]>({
    queryKey: ['goals', user?.id, status],
    queryFn: async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return [];

        const [goalsRes, milestonesRes, tasksRes] = await Promise.all([
          supabase.from('goals').select('*').eq('status', status),
          supabase.from('milestones').select('*'),
          supabase.from('tasks').select('*'),
        ]);

        if (goalsRes.error) throw goalsRes.error;
        if (milestonesRes.error) throw milestonesRes.error;
        if (tasksRes.error) throw tasksRes.error;

        const goals = goalsRes.data || [];
        const milestones = milestonesRes.data || [];
        const tasks = tasksRes.data || [];

        const assembled = goals.map((g) => {
          const goalMilestones = milestones
            .filter((m) => m.goal_id === g.id)
            .map((m) => ({
              ...m,
              tasks: tasks.filter((t) => t.milestone_id === m.id) as Task[],
            }));
          const milestoneIds = goalMilestones.map((m) => m.id);
          const goalTasks = tasks.filter(
            (t) => t.milestone_id && milestoneIds.includes(t.milestone_id)
          );

          return {
            ...g,
            milestones: goalMilestones,
            totalTasks: goalTasks.length,
            doneTasks: goalTasks.filter((t) => t.completed_at !== null).length,
          };
        });

        const result = assembled.sort((a, b) => {
          if (a.is_primary && !b.is_primary) return -1;
          if (!a.is_primary && b.is_primary) return 1;
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }) as AssembledGoal[];

        AsyncStorage.setItem(cacheKey, JSON.stringify(result)).catch(() => {});
        return result;
      } catch (err: any) {
        const isNetError = 
          err.message?.toLowerCase().includes('network') || 
          err.message?.toLowerCase().includes('fetch') || 
          err.message?.toLowerCase().includes('timeout') ||
          err.status === 0;

        if (isNetError) {
          const cached = await AsyncStorage.getItem(cacheKey);
          if (cached) return JSON.parse(cached);
        }
        throw err;
      }
    },
    enabled: !!user?.id,
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      goalData: Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'status'>
    ) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // If the new goal is set as primary, we must disable other primary goals
      if (goalData.is_primary) {
        await supabase
          .from('goals')
          .update({ is_primary: false })
          .eq('user_id', session.user.id);
      }

      const { data, error } = await supabase
        .from('goals')
        .insert({
          ...goalData,
          user_id: session.user.id,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;
      return data as Goal;
    },
    onSuccess: () => {
      const user = useAuthStore.getState().user;
      queryClient.invalidateQueries({ queryKey: ['goals', user?.id] });
    },
    onError: (err) => {
      handleSupabaseError(err, 'create_goal');
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();

  return useMutation<
    Goal,
    Error,
    { id: string; updates: Partial<Goal> },
    { previousGoals: AssembledGoal[] | undefined }
  >({
    mutationFn: async ({ id, updates }) => {
      // If setting is_primary true, we must unset others
      if (updates.is_primary) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase
            .from('goals')
            .update({ is_primary: false })
            .eq('user_id', session.user.id);
        }
      }

      const { data, error } = await supabase
        .from('goals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Goal;
    },
    onMutate: async ({ id, updates }) => {
      const user = useAuthStore.getState().user;
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['goals', user?.id] });

      // Snapshot previous state
      const previousGoals = queryClient.getQueryData<AssembledGoal[]>(['goals', user?.id, 'active']);

      // Optimistically update
      queryClient.setQueryData<AssembledGoal[]>(['goals', user?.id, 'active'], (old) => {
        if (!old) return [];
        return old.map((g) =>
          g.id === id ? { ...g, ...updates } : g
        ) as AssembledGoal[];
      });

      return { previousGoals };
    },
    onError: (err, _variables, context) => {
      const user = useAuthStore.getState().user;
      if (context?.previousGoals) {
        queryClient.setQueryData(['goals', user?.id, 'active'], context.previousGoals);
      }
      handleSupabaseError(err, 'update_goal');
    },
    onSettled: () => {
      const user = useAuthStore.getState().user;
      queryClient.invalidateQueries({ queryKey: ['goals', user?.id] });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('goals')
        .update({ status: 'abandoned' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Goal;
    },
    onSuccess: () => {
      const user = useAuthStore.getState().user;
      queryClient.invalidateQueries({ queryKey: ['goals', user?.id] });
    },
    onError: (err) => {
      handleSupabaseError(err, 'delete_goal');
    },
  });
}
