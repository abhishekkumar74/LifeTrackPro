import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { Note } from '@/types/app.types';
import { calculateNextReview } from '@/lib/utils/spaced-rep';
import { useAuthStore } from '@/lib/store/auth.store';

// Map to track debounce timeouts per note ID for auto-save debouncing
const debounceTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

// Debounced Supabase update function
const debouncedUpdate = (id: string, updates: Partial<Note>): Promise<Note> => {
  return new Promise<Note>((resolve, reject) => {
    // Clear any pending save for this specific note
    if (debounceTimeouts.has(id)) {
      clearTimeout(debounceTimeouts.get(id));
      debounceTimeouts.delete(id);
    }

    const timeout = setTimeout(async () => {
      debounceTimeouts.delete(id);
      try {
        const { data, error } = await supabase
          .from('notes')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          reject(error);
        } else {
          resolve(data as Note);
        }
      } catch (err) {
        reject(err);
      }
    }, 2000);

    debounceTimeouts.set(id, timeout);
  });
};

export function useNotes(subject?: string) {
  const { user } = useAuthStore();
  return useQuery<Note[]>({
    queryKey: ['notes', user?.id, subject],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      let query = supabase
        .from('notes')
        .select('*')
        .eq('user_id', session.user.id);

      if (subject) {
        query = query.eq('subject', subject);
      }

      const { data, error } = await query.order('is_pinned', { ascending: false }).order('updated_at', { ascending: false });

      if (error) throw error;
      return data as Note[];
    },
    enabled: !!user?.id,
  });
}

export function useDueRevisions() {
  const { user } = useAuthStore();
  return useQuery<Note[]>({
    queryKey: ['notes', user?.id, 'due'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;

      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', session.user.id)
        .lte('next_review', todayStr)
        .not('next_review', 'is', null)
        .order('next_review', { ascending: true });

      if (error) throw error;
      return data as Note[];
    },
    enabled: !!user?.id,
  });
}

export function useNote(id: string) {
  const { user } = useAuthStore();
  return useQuery<Note>({
    queryKey: ['note', user?.id, id],
    queryFn: async () => {
      if (id === 'new') {
        // Return a mock default note structure for new notes
        return {
          id: 'new',
          user_id: '',
          title: '',
          content: '',
          subject: null,
          chapter: null,
          tags: [],
          is_pinned: false,
          next_review: null,
          review_count: 0,
          ease_factor: 2.5,
          interval_days: 1,
          created_at: '',
          updated_at: '',
        } as Note;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Note;
    },
    enabled: !!user?.id && !!id,
  });
}

export function useCreateNote() {
  const queryClient = queryClientInstance();

  return useMutation({
    mutationFn: async (noteData: Partial<Omit<Note, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('notes')
        .insert({
          title: noteData.title || 'Untitled Note',
          content: noteData.content || '',
          subject: noteData.subject || null,
          chapter: noteData.chapter || null,
          tags: noteData.tags || [],
          is_pinned: noteData.is_pinned || false,
          ease_factor: 2.5,
          interval_days: 1,
          review_count: 0,
          next_review: tomorrowStr,
          user_id: session.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Note;
    },
    onSuccess: (newNote) => {
      const user = useAuthStore.getState().user;
      queryClient.invalidateQueries({ queryKey: ['notes', user?.id] });
      // Pre-warm the cache for this new note ID
      queryClient.setQueryData(['note', user?.id, newNote.id], newNote);
    },
  });
}

export function useUpdateNote() {
  const queryClient = queryClientInstance();

  return useMutation<Note, Error, { id: string; updates: Partial<Note> }, { previousNotes: Note[] | undefined; previousNote: Note | undefined }>({
    mutationFn: async ({ id, updates }) => {
      // Direct update call for saving immediately if needed,
      // but we wrap it in a debounce to limit Metro/network overhead during typing
      return debouncedUpdate(id, updates);
    },
    onMutate: async ({ id, updates }) => {
      const user = useAuthStore.getState().user;
      // Cancel outgoing queries to avoid overwriting optimistic updates
      await queryClient.cancelQueries({ queryKey: ['notes', user?.id] });
      await queryClient.cancelQueries({ queryKey: ['note', user?.id, id] });

      const previousNotes = queryClient.getQueryData<Note[]>(['notes', user?.id]);
      const previousNote = queryClient.getQueryData<Note>(['note', user?.id, id]);

      // Optimistically update the list queries
      queryClient.setQueryData<Note[]>(['notes', user?.id], (old) => {
        if (!old) return [];
        return old.map((n) => (n.id === id ? { ...n, ...updates } : n));
      });

      // Optimistically update the single note query cache
      if (previousNote) {
        queryClient.setQueryData<Note>(['note', user?.id, id], {
          ...previousNote,
          ...updates,
        });
      }

      return { previousNotes, previousNote };
    },
    onError: (_err, variables, context) => {
      const user = useAuthStore.getState().user;
      // Rollback cache state on error
      if (context?.previousNotes) {
        queryClient.setQueryData(['notes', user?.id], context.previousNotes);
      }
      if (context?.previousNote) {
        queryClient.setQueryData(['note', user?.id, variables.id], context.previousNote);
      }
    },
    onSuccess: (updatedNote) => {
      const user = useAuthStore.getState().user;
      queryClient.setQueryData(['note', user?.id, updatedNote.id], updatedNote);
    },
    onSettled: (updatedNote) => {
      const user = useAuthStore.getState().user;
      if (updatedNote) {
        queryClient.invalidateQueries({ queryKey: ['notes', user?.id] });
      }
    },
  });
}

export function useDeleteNote() {
  const queryClient = queryClientInstance();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: (deletedId) => {
      const user = useAuthStore.getState().user;
      queryClient.invalidateQueries({ queryKey: ['notes', user?.id] });
      queryClient.removeQueries({ queryKey: ['note', user?.id, deletedId] });
    },
  });
}

export function useReviewNote() {
  const queryClient = queryClientInstance();

  return useMutation({
    mutationFn: async ({ noteId, quality }: { noteId: string; quality: number }) => {
      // 1. Fetch current note values from database
      const { data: note, error: fetchError } = await supabase
        .from('notes')
        .select('*')
        .eq('id', noteId)
        .single();

      if (fetchError) throw fetchError;

      // 2. Perform SM-2 calculation
      const currentNote = note as Note;
      const { nextReviewDate, newEaseFactor, newIntervalDays, newRepetitions } = calculateNextReview(
        quality,
        currentNote.review_count,
        currentNote.ease_factor,
        currentNote.interval_days
      );

      // 3. Save new scheduling metrics to database
      const { data: updatedNote, error: updateError } = await supabase
        .from('notes')
        .update({
          next_review: nextReviewDate,
          ease_factor: newEaseFactor,
          interval_days: newIntervalDays,
          review_count: newRepetitions,
        })
        .eq('id', noteId)
        .select()
        .single();

      if (updateError) throw updateError;
      return updatedNote as Note;
    },
    onSuccess: (updatedNote) => {
      const user = useAuthStore.getState().user;
      queryClient.invalidateQueries({ queryKey: ['notes', user?.id] });
      queryClient.setQueryData(['note', user?.id, updatedNote.id], updatedNote);
    },
  });
}

// Helper to resolve query client instance in hooks safely
function queryClientInstance() {
  return useQueryClient();
}
