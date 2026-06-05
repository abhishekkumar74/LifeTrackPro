import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { Milestone } from '@/types/app.types';

export function useMilestones(goalId: string) {
  return useQuery<Milestone[]>({
    queryKey: ['milestones', goalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('milestones')
        .select('*')
        .eq('goal_id', goalId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data as Milestone[];
    },
    enabled: !!goalId,
  });
}

export function useCreateMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      milestoneData: Omit<Milestone, 'id' | 'user_id' | 'created_at'>
    ) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('milestones')
        .insert({
          ...milestoneData,
          user_id: session.user.id,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['milestones', data.goal_id] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

export function useUpdateMilestoneStatus() {
  const queryClient = useQueryClient();

  return useMutation<
    Milestone,
    Error,
    { id: string; goalId: string; status: 'pending' | 'completed' },
    { previousMilestones: Milestone[] | undefined }
  >({
    mutationFn: async ({ id, status }) => {
      const { data, error } = await supabase
        .from('milestones')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Milestone;
    },
    onMutate: async ({ id, goalId, status }) => {
      await queryClient.cancelQueries({ queryKey: ['milestones', goalId] });

      const previousMilestones = queryClient.getQueryData<Milestone[]>([
        'milestones',
        goalId,
      ]);

      queryClient.setQueryData<Milestone[]>(['milestones', goalId], (old) => {
        if (!old) return [];
        return old.map((m) =>
          m.id === id ? { ...m, status } : m
        );
      });

      return { previousMilestones };
    },
    onError: (_err, { goalId }, context) => {
      if (context?.previousMilestones) {
        queryClient.setQueryData(['milestones', goalId], context.previousMilestones);
      }
    },
    onSettled: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['milestones', data.goal_id] });
        queryClient.invalidateQueries({ queryKey: ['goals'] });
      }
    },
  });
}
