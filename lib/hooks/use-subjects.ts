import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDefaultSubjectsForProfile } from '@/lib/utils/profile-subjects';
import { useAuthStore } from '@/lib/store/auth.store';
import { captureError } from '../sentry';

// Generic fallback when profile is not set yet
export const DEFAULT_SUBJECTS = [
  'General',
  'Other',
];

const CUSTOM_SUBJECTS_KEY = 'custom_subjects';

/**
 * Hook to retrieve unique, sorted, dynamic subjects.
 * Combines:
 * 1. Default subjects list based on user's profile category & subcategory
 * 2. Locally stored custom subjects in AsyncStorage
 */
export function useSubjects() {
  const profile = useAuthStore((state) => state.profile);
  const userId = profile?.id ?? null;

  // Compute profile-specific subjects based on active category & subcategories
  const profileSubjects = useMemo(() => {
    if (!profile) return DEFAULT_SUBJECTS;
    return getDefaultSubjectsForProfile(
      profile.category ?? '',
      profile.sub_category ?? []
    );
  }, [profile]);

  const subCats = useMemo(() => profile?.sub_category || [], [profile?.sub_category]);

  return useQuery<string[]>({
    queryKey: ['subjects', userId, profileSubjects.join(','), subCats.join(',')],
    enabled: !!userId,
    staleTime: Infinity, // Action-only: Never refetch on screen focus or mount
    gcTime: 1000 * 60 * 60 * 24 * 7,
    placeholderData: profileSubjects,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async () => {
      try {
        if (!userId) return profileSubjects;

        const cacheKey = `cached_user_subjects_v4_${userId}_${subCats.sort().join('_')}`;

        // 1. Check local AsyncStorage cache first for instant 0ms offline load
        try {
          const cachedRaw = await AsyncStorage.getItem(cacheKey);
          if (cachedRaw) {
            const cachedList: string[] = JSON.parse(cachedRaw);
            if (Array.isArray(cachedList) && cachedList.length > 0) {
              return cachedList;
            }
          }
        } catch {
          // Fall through
        }

        const seen = new Set<string>();
        const result: string[] = [];

        // Helper to add unique subjects case-insensitively and title-case them
        const addUniqueSubject = (sub: string | null | undefined) => {
          if (!sub) return;
          const trimmed = sub.trim();
          if (!trimmed) return;
          const lower = trimmed.toLowerCase();
          if (!seen.has(lower)) {
            seen.add(lower);
            // Format clean title-cased
            const formatted = trimmed
              .split(/\s+/)
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ');
            result.push(formatted);
          }
        };

        let hasDynamicExamSubjects = false;
        const activeSubCats = (subCats || []).slice(0, 2);

        // 1. Fetch dynamic subjects from Supabase ONLY when cache was missing
        for (const subCat of activeSubCats) {
          try {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(subCat);
            let examId = isUuid ? subCat : null;

            if (!examId) {
              const { data: examData } = await supabase
                .from('exams')
                .select('id')
                .or(`slug.eq.${subCat},name.ilike.%${subCat}%`)
                .maybeSingle();
              if (examData?.id) {
                examId = examData.id;
              }
            }

            if (examId) {
              const { data: dbSubjects } = await supabase
                .from('exam_subjects')
                .select('display_name, subjects (name)')
                .eq('exam_id', examId)
                .order('order_index', { ascending: true });

              if (dbSubjects && dbSubjects.length > 0) {
                dbSubjects.forEach((s: any) => {
                  const subjectName = s.display_name || s.subjects?.name;
                  if (subjectName) {
                    addUniqueSubject(subjectName);
                  }
                });
                hasDynamicExamSubjects = true;
              }
            }
          } catch (e) {
            // Silently fall back to profile subjects
          }
        }

        // 2. Only add profile-based defaults if no dynamic DB subjects were found
        if (!hasDynamicExamSubjects) {
          profileSubjects.forEach(addUniqueSubject);
        }

        // Add custom offline subjects from AsyncStorage
        try {
          const storedStr = await AsyncStorage.getItem(CUSTOM_SUBJECTS_KEY);
          if (storedStr) {
            const storedList: string[] = JSON.parse(storedStr);
            if (Array.isArray(storedList)) {
              storedList.forEach(addUniqueSubject);
            }
          }
        } catch (err) {
          captureError(err, { context: 'parse_custom_subjects' });
        }

        const sorted = result.sort((a, b) => a.localeCompare(b));

        // Persist to local storage so subsequent loads make 0 network requests
        AsyncStorage.setItem(cacheKey, JSON.stringify(sorted)).catch(() => {});

        return sorted;
      } catch (err) {
        captureError(err, { context: 'useSubjects_queryFn' });
        if (__DEV__) console.warn('Error in useSubjects queryFn:', err);
        return profileSubjects;
      }
    },
  });
}

/**
 * Hook to append a new custom subject to local storage.
 * Invalidates the react-query 'subjects' key on success.
 */
export function useAddCustomSubject() {
  const queryClient = useQueryClient();

  return async (subject: string) => {
    if (!subject.trim()) return;

    // Helper to format as title-case
    const formatted = subject.trim()
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    const storedStr = await AsyncStorage.getItem(CUSTOM_SUBJECTS_KEY);
    let storedList: string[] = [];
    if (storedStr) {
      storedList = JSON.parse(storedStr);
    }

    // Add only if not already present (case-insensitive check)
    const exists = storedList.some((s) => s.toLowerCase() === formatted.toLowerCase());
    if (!exists) {
      storedList.push(formatted);
      await AsyncStorage.setItem(CUSTOM_SUBJECTS_KEY, JSON.stringify(storedList));
    }

    // Invalidate subjects cache
    queryClient.invalidateQueries({
      queryKey: ['subjects'],
    });
  };
}

/**
 * Backward-compatible React Mutation hook for useAddCustomSubject.
 */
export function useAddSubject() {
  const addCustomSubject = useAddCustomSubject();

  return useMutation({
    mutationFn: async (newSubject: string) => {
      await addCustomSubject(newSubject);
      return newSubject.trim();
    },
  });
}
