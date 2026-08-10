import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDefaultSubjectsForProfile } from '@/lib/utils/profile-subjects';
import { useAuthStore } from '@/lib/store/auth.store';
import { captureError } from '../sentry';

// Always show these even for new users:
export const DEFAULT_SUBJECTS = [
  'Physics',
  'Chemistry',
  'Biology',
  'Mathematics',
  'English',
  'History',
  'Geography',
  'Economics',
  'Computer Science',
  'General Studies',
  'Reasoning / Aptitude',
  'Current Affairs',
  'Polity',
  'Science & Technology',
  'Environment',
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

  return useQuery<string[]>({
    queryKey: ['subjects', userId, profileSubjects.join(',')],
    enabled: !!userId,
    staleTime: 1000 * 60 * 10,
    placeholderData: profileSubjects,
    queryFn: async () => {
      try {
        if (!userId) return profileSubjects;

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
            // Format as title-cased
            const formatted = trimmed
              .split(/\s+/)
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ');
            result.push(formatted);
          }
        };

        // Add profile-based defaults first
        profileSubjects.forEach(addUniqueSubject);

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

        // Return sorted alphabetically
        return result.sort((a, b) => a.localeCompare(b));
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
