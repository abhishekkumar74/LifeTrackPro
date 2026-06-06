import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDefaultSubjectsForProfile } from '@/lib/utils/profile-subjects';

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
 * 2. User's syllabus topics
 * 3. User's task subject fields
 * 4. User's focus session subject fields
 * 5. Locally stored custom subjects in AsyncStorage
 */
export function useSubjects() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  return useQuery<string[]>({
    queryKey: ['subjects', userId],
    enabled: !!userId,
    staleTime: 1000 * 60 * 10,
    initialData: DEFAULT_SUBJECTS,
    queryFn: async () => {
      if (!userId) return DEFAULT_SUBJECTS;

      // Get user profile first
      const { data: profile } = await supabase
        .from('profiles')
        .select('category, sub_category')
        .eq('id', userId)
        .single();

      const profileSubjects = getDefaultSubjectsForProfile(
        profile?.category ?? '',
        profile?.sub_category ?? []
      );

      // Fetch unique subjects across DB tables concurrently
      const [syllabusRes, tasksRes, focusRes] = await Promise.all([
        supabase
          .from('syllabus_topics')
          .select('subject')
          .eq('user_id', userId),
        supabase
          .from('tasks')
          .select('subject')
          .eq('user_id', userId)
          .not('subject', 'is', null),
        supabase
          .from('focus_sessions')
          .select('subject')
          .eq('user_id', userId)
          .not('subject', 'is', null),
      ]);

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

      // Add db fetched subjects
      syllabusRes.data?.forEach((row) => addUniqueSubject(row.subject));
      tasksRes.data?.forEach((row) => addUniqueSubject(row.subject));
      focusRes.data?.forEach((row) => addUniqueSubject(row.subject));

      // Add custom offline subjects from AsyncStorage
      try {
        const storedStr = await AsyncStorage.getItem(CUSTOM_SUBJECTS_KEY);
        if (storedStr) {
          const storedList: string[] = JSON.parse(storedStr);
          storedList.forEach(addUniqueSubject);
        }
      } catch (err) {
        if (__DEV__) {
          console.error('Failed to parse stored custom subjects:', err);
        }
      }

      // Return sorted alphabetically
      return result.sort((a, b) => a.localeCompare(b));
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
