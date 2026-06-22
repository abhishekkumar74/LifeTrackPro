import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/utils/handle-error';
import { ScheduleBlock } from '@/types/app.types';

export function useCreateScheduleBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (blockData: {
      title: string;
      subject: string | null;
      color: string;
      start_time: string;
      end_time: string;
      days: number[];
      specific_date: string | null;
      is_active: boolean;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('schedule_blocks')
        .insert({
          ...blockData,
          user_id: session.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ScheduleBlock;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todayStats'] });
    },
    onError: (err) => {
      handleSupabaseError(err, 'create_schedule_block');
    },
  });
}

export function useUpdateScheduleBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (blockData: {
      id: string;
      title: string;
      subject: string | null;
      color: string;
      start_time: string;
      end_time: string;
      days: number[];
      specific_date: string | null;
      is_active: boolean;
    }) => {
      const { data, error } = await supabase
        .from('schedule_blocks')
        .update({
          title: blockData.title,
          subject: blockData.subject,
          color: blockData.color,
          start_time: blockData.start_time,
          end_time: blockData.end_time,
          days: blockData.days,
          specific_date: blockData.specific_date,
          is_active: blockData.is_active,
        })
        .eq('id', blockData.id)
        .select()
        .single();

      if (error) throw error;
      return data as ScheduleBlock;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todayStats'] });
    },
    onError: (err) => {
      handleSupabaseError(err, 'update_schedule_block');
    },
  });
}

export function useDeleteScheduleBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('schedule_blocks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todayStats'] });
    },
    onError: (err) => {
      handleSupabaseError(err, 'delete_schedule_block');
    },
  });
}

