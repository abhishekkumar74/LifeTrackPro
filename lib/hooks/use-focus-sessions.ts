import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store/auth.store';
import { FocusSessionRow } from '@/lib/supabase/client';

export function useFocusSessions() {
  const { user } = useAuthStore();

  return useQuery<FocusSessionRow[]>({
    queryKey: ['focus_sessions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('focus_sessions')
        .select('*')
        .order('started_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });
}
