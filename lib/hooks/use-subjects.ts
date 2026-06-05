import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_SUBJECTS = [
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
  'Reasoning',
  'Other',
];

const CUSTOM_SUBJECTS_KEY = 'custom_subjects';

/**
 * Hook to retrieve unique, sorted, title-cased subjects.
 * Combines:
 * 1. Default subjects list
 * 2. User's syllabus topics
 * 3. User's task subject fields
 * 4. User's focus session subject fields
 * 5. Locally stored custom subjects in AsyncStorage
 */
export function useSubjects() {
  return useQuery<string[]>({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return DEFAULT_SUBJECTS.sort((a, b) => a.localeCompare(b));
      }

      // Fetch unique subjects across DB tables concurrently
      const [syllabusRes, tasksRes, focusRes] = await Promise.all([
        supabase
          .from('syllabus_topics')
          .select('subject')
          .eq('user_id', session.user.id),
        supabase
          .from('tasks')
          .select('subject')
          .eq('user_id', session.user.id)
          .not('subject', 'is', null),
        supabase
          .from('focus_sessions')
          .select('subject')
          .eq('user_id', session.user.id)
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

      // Add default list first
      DEFAULT_SUBJECTS.forEach(addUniqueSubject);

      // Add db fetched subjects
      syllabusRes.data?.forEach((row) => addUniqueSubject(row.subject));
      tasksRes.data?.forEach((row) => addUniqueSubject(row.subject));
      focusRes.data?.forEach((row) => addUniqueSubject(row.subject));

      // Add custom offline subjects
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
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
}

/**
 * Hook to append a new custom subject to local storage.
 * Invalidates the react-query 'subjects' key on success.
 */
export function useAddSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newSubject: string) => {
      const trimmed = newSubject.trim();
      if (!trimmed) throw new Error('Subject cannot be empty');

      // Helper to format as title-case
      const formatted = trimmed
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
      return formatted;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
    },
  });
}
