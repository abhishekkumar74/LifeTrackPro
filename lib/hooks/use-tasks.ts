import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase/client';
import { Task } from '@/types/app.types';
import { useAuthStore } from '@/lib/store/auth.store';
import { handleSupabaseError } from '@/lib/utils/handle-error';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useTasks(milestoneId?: string) {
  const { user } = useAuthStore();
  const cacheKey = `tasks_list_${user?.id}_${milestoneId || 'standalone'}`;

  return useQuery<Task[]>({
    queryKey: ['tasks', user?.id, milestoneId || 'standalone'],
    queryFn: async () => {
      try {
        let query = supabase.from('tasks').select('*');
        
        if (milestoneId) {
          query = query.eq('milestone_id', milestoneId);
        } else {
          query = query.is('milestone_id', null);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Sort locally: 
        // 1. Completion status (incomplete first, completed last)
        // 2. Priority (urgent -> important -> normal)
        // 3. Due date
        const result = (data || []).sort((a, b) => {
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
          if (wA !== wB) return wA - wB;

          if (a.due_date && b.due_date) {
            return a.due_date.localeCompare(b.due_date);
          }
          if (a.due_date) return -1;
          if (b.due_date) return 1;
          return 0;
        }) as Task[];

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

export function useCompleteTask() {
  const queryClient = useQueryClient();

  return useMutation<
    Task,
    Error,
    { id: string; completed: boolean; milestoneId?: string | null },
    { previousTasks: Task[] | undefined }
  >({
    mutationFn: async ({ id, completed }) => {
      const completedAt = completed ? new Date().toISOString() : null;

      const { data, error } = await supabase
        .from('tasks')
        .update({ completed_at: completedAt })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Task;
    },
    onMutate: async ({ id, completed, milestoneId }) => {
      // Trigger haptics
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (e) {
        // Silently catch in simulators
      }

      const user = useAuthStore.getState().user;
      const cacheKey = ['tasks', user?.id, milestoneId || 'standalone'];

      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: cacheKey });

      // Snapshot previous state
      const previousTasks = queryClient.getQueryData<Task[]>(cacheKey);

      // Optimistically update
      queryClient.setQueryData<Task[]>(cacheKey, (old) => {
        if (!old) return [];
        return old.map((t) =>
          t.id === id
            ? { ...t, completed_at: completed ? new Date().toISOString() : null }
            : t
        );
      });

      return { previousTasks };
    },
    onError: (err, { milestoneId }, context) => {
       const user = useAuthStore.getState().user;
       const cacheKey = ['tasks', user?.id, milestoneId || 'standalone'];
       if (context?.previousTasks) {
         queryClient.setQueryData(cacheKey, context.previousTasks);
       }
       handleSupabaseError(err, 'complete_task');
     },
    onSettled: (_, __, { milestoneId }) => {
      const user = useAuthStore.getState().user;
      queryClient.invalidateQueries({ queryKey: ['tasks', user?.id, milestoneId || 'standalone'] });
      queryClient.invalidateQueries({ queryKey: ['goals', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      taskData: Omit<Task, 'id' | 'user_id' | 'created_at'>
    ) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...taskData,
          user_id: session.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const user = useAuthStore.getState().user;
      const cacheKey = ['tasks', user?.id, data.milestone_id || 'standalone'];
      queryClient.invalidateQueries({ queryKey: cacheKey });
      queryClient.invalidateQueries({ queryKey: ['goals', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useRescheduleTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      newDate,
    }: {
      id: string;
      newDate: string | null;
      milestoneId?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({ due_date: newDate })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const user = useAuthStore.getState().user;
      const cacheKey = ['tasks', user?.id, data.milestone_id || 'standalone'];
      queryClient.invalidateQueries({ queryKey: cacheKey });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
    }: {
      id: string;
      milestoneId?: string | null;
    }) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: (_, variables) => {
      const user = useAuthStore.getState().user;
      const cacheKey = ['tasks', user?.id, variables.milestoneId || 'standalone'];
      queryClient.invalidateQueries({ queryKey: cacheKey });
      queryClient.invalidateQueries({ queryKey: ['goals', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}
