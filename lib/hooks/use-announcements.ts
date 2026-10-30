import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store/auth.store';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AppAnnouncement {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  target_category: string | null;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
  created_by?: string | null;
}

const DISMISSED_KEY = '@lifetrack_dismissed_announcements';
const CACHE_KEY = '@lifetrack_announcements_cache';

/**
 * Hook to retrieve remote in-app announcements from Supabase.
 * Features:
 * - Targeted filtering by user profile category and sub_categories
 * - Expiration validation (now < expires_at)
 * - Persistent local dismissal via AsyncStorage
 * - Offline cache and graceful handling when table is unmigrated
 */
export function useAnnouncements() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<{ category?: string; sub_category?: string[] } | null>(null);

  // 1. Load dismissed IDs from AsyncStorage on mount
  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem(DISMISSED_KEY)
      .then((raw) => {
        if (raw && isMounted) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) setDismissedIds(parsed);
          } catch {
            // Ignore parse errors
          }
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Load user category & sub_categories from profiles
  useEffect(() => {
    let isMounted = true;
    const userId = user?.id;
    if (!userId) return;

    async function fetchProfile() {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('category, sub_category')
          .eq('id', userId)
          .maybeSingle();

        if (data && isMounted) {
          setUserProfile(data);
        }
      } catch {
        // Ignore fetch errors
      }
    }

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  // 3. Query active announcements
  const query = useQuery<AppAnnouncement[]>({
    queryKey: ['app_announcements'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('app_announcements')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (error) {
          // Graceful handling if migration has not been applied yet
          if (
            error.code === '42P01' ||
            error.message?.includes('PGRST205') ||
            error.message?.includes('schema cache') ||
            error.message?.includes('does not exist')
          ) {
            return [];
          }
          throw error;
        }

        const list = (data || []) as AppAnnouncement[];
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(list)).catch(() => {});
        return list;
      } catch (err: any) {
        // Fallback to cached announcements on offline / network failure
        const cachedRaw = await AsyncStorage.getItem(CACHE_KEY).catch(() => null);
        if (cachedRaw) {
          try {
            return JSON.parse(cachedRaw);
          } catch {
            // Ignore parse error
          }
        }
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // 4. Dismiss an announcement
  const dismissAnnouncement = useCallback(async (id: string) => {
    try {
      setDismissedIds((prev) => {
        if (prev.includes(id)) return prev;
        const updated = [...prev, id];
        AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify(updated)).catch(() => {});
        return updated;
      });
    } catch {
      // Ignore write errors
    }
  }, []);

  // 5. Filter announcements matching user and expiry
  const visibleAnnouncements = useMemo(() => {
    const rawList = query.data || [];
    const now = Date.now();

    const filtered = rawList.filter((item) => {
      // Must not be dismissed
      if (dismissedIds.includes(item.id)) return false;

      // Expiry check
      if (item.expires_at) {
        const expTime = new Date(item.expires_at).getTime();
        if (!isNaN(expTime) && expTime <= now) return false;
      }

      // Target category check
      const target = (item.target_category || 'all').toLowerCase().trim();
      if (!target || target === 'all') return true;

      // Compare with user profile
      const userCat = (userProfile?.category || '').toLowerCase().trim();
      const userSubs = (userProfile?.sub_category || []).map((s: string) => s.toLowerCase().trim());

      return userCat === target || userSubs.includes(target);
    });

    // Priority sorting: critical > warning > info, then newest
    const severityWeight: Record<string, number> = {
      critical: 3,
      warning: 2,
      info: 1,
    };

    return filtered.sort((a, b) => {
      const weightDiff = (severityWeight[b.severity] || 0) - (severityWeight[a.severity] || 0);
      if (weightDiff !== 0) return weightDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [query.data, dismissedIds, userProfile]);

  const activeAnnouncement = visibleAnnouncements[0] || null;

  return {
    announcements: visibleAnnouncements,
    activeAnnouncement,
    dismissAnnouncement,
    refresh: () => queryClient.invalidateQueries({ queryKey: ['app_announcements'] }),
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
  };
}
