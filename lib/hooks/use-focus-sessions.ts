import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store/auth.store';
import { FocusSessionRow } from '@/lib/supabase/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useFocusSessions() {
  const { user } = useAuthStore();
  const cacheKey = `focus_sessions_history_${user?.id}`;

  return useQuery<FocusSessionRow[]>({
    queryKey: ['focus_sessions', user?.id],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('focus_sessions')
          .select('*')
          .order('started_at', { ascending: false });

        if (error) throw error;
        const result = data || [];
        
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
