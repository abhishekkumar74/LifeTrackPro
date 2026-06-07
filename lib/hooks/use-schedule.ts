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
