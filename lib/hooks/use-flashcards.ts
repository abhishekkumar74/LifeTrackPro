import { useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { Note } from '@/types/app.types';
import { useAuthStore } from '@/lib/store/auth.store';
import { handleSupabaseError } from '@/lib/utils/handle-error';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ParsedFlashcard {
  id: string;
  front: string;
  back: string;
  subject: string;
  chapter: string | null;
  tags: string[];
  next_review: string | null;
  review_count: number;
  ease_factor: number;
  interval_days: number;
  isDue: boolean;
  rawNote: Note;
}

export function parseNoteToFlashcard(note: Note): ParsedFlashcard {
  let front = note.title || 'Untitled';
  let back = note.content || '';

  if (note.content && (note.tags?.includes('flashcard') || note.content.startsWith('{"front":'))) {
    try {
      const parsed = JSON.parse(note.content);
      if (parsed && typeof parsed === 'object') {
        front = parsed.front || front;
        back = parsed.back || back;
      }
    } catch {
      // fallback
    }
  }

  const todayStr = new Date().toLocaleDateString('en-CA');
  const isDue = note.next_review ? note.next_review <= todayStr : true;

  return {
    id: note.id,
    front,
    back,
    subject: note.subject || 'General',
    chapter: note.chapter || null,
    tags: note.tags || [],
    next_review: note.next_review,
    review_count: note.review_count || 0,
    ease_factor: note.ease_factor || 2.5,
    interval_days: note.interval_days || 1,
    isDue,
    rawNote: note,
  };
}

export const STARTER_FLASHCARDS_SEED = [
  // Physics
  {
    subject: 'Physics',
    front: "What is Newton's Second Law of Motion?",
    back: 'F = dp/dt = m · a\n\nForce equals rate of change of momentum, or mass times acceleration for constant mass.',
  },
  {
    subject: 'Physics',
    front: 'What is the First Law of Thermodynamics?',
    back: 'ΔU = Q - W\n\nThe change in internal energy equals heat added to system minus work done by system.',
  },
  {
    subject: 'Physics',
    front: "What is Snell's Law of Refraction?",
    back: 'n₁ · sin(θ₁) = n₂ · sin(θ₂)\n\nRelates the indices of refraction of two media to the angles of incidence and refraction.',
  },
  {
    subject: 'Physics',
    front: 'What is the Centripetal Acceleration formula?',
    back: 'a_c = v² / r = ω² · r\n\nDirected radially inward towards the center of circular motion.',
  },

  // Chemistry
  {
    subject: 'Chemistry',
    front: "What is Le Chatelier's Principle?",
    back: 'If a dynamic equilibrium is disturbed by changing conditions (concentration, temperature, or pressure), the position of equilibrium shifts to counteract the change.',
  },
  {
    subject: 'Chemistry',
    front: 'What is the Ideal Gas Equation?',
    back: 'P · V = n · R · T\n\nP: Pressure, V: Volume, n: Moles, R: Gas Constant (8.314 J/(mol·K)), T: Temperature in Kelvin.',
  },
  {
    subject: 'Chemistry',
    front: "What is Hund's Rule of Maximum Multiplicity?",
    back: 'Electrons singly occupy each degenerate orbital in a subshell with parallel spins before any orbital is doubly occupied.',
  },
  {
    subject: 'Chemistry',
    front: 'What is the Arrhenius Equation for reaction rates?',
    back: 'k = A · e^(-Ea / (R·T))\n\nRelates the reaction rate constant k to activation energy Ea and temperature T.',
  },

  // Mathematics
  {
    subject: 'Mathematics',
    front: 'What are the derivatives of sin(x), cos(x), and tan(x)?',
    back: '• d/dx[sin x] = cos x\n• d/dx[cos x] = -sin x\n• d/dx[tan x] = sec² x',
  },
  {
    subject: 'Mathematics',
    front: "What is Bayes' Theorem Formula?",
    back: 'P(A|B) = [P(B|A) · P(A)] / P(B)\n\nCalculates the posterior conditional probability of event A given evidence B.',
  },
  {
    subject: 'Mathematics',
    front: 'What is the Integration by Parts formula?',
    back: '∫ u · dv = u · v - ∫ v · du\n\nUse ILATE rule to choose u (Inverse, Log, Algebraic, Trig, Exponential).',
  },

  // Biology
  {
    subject: 'Biology',
    front: 'What are the 4 Stages of Mitosis in order?',
    back: '1. Prophase (Chromatin condenses into chromosomes)\n2. Metaphase (Chromosomes align along equatorial plate)\n3. Anaphase (Sister chromatids separate to opposite poles)\n4. Telophase (Nuclear membranes reform) [PMAT]',
  },
  {
    subject: 'Biology',
    front: 'What is the primary site of cellular ATP synthesis?',
    back: 'Mitochondria — specifically across the inner mitochondrial membrane via the Electron Transport Chain (Oxidative Phosphorylation).',
  },
  {
    subject: 'Biology',
    front: 'What is the Central Dogma of Molecular Biology?',
    back: 'DNA ➔ (Transcription) ➔ mRNA ➔ (Translation) ➔ Protein',
  },

  // Computer Science
  {
    subject: 'Computer Science',
    front: 'What is the Time Complexity of QuickSort?',
    back: '• Best & Average: O(n log n)\n• Worst: O(n²) [occurs when chosen pivot is already smallest/largest element in sorted array]',
  },
  {
    subject: 'Computer Science',
    front: 'What is the key difference between a Process and a Thread?',
    back: '• Process: Independent executing program with its own isolated address space.\n• Thread: Lightweight execution unit within a process that shares memory and code with sibling threads.',
  },
];

export function useFlashcards() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Query all notes tagged with 'flashcard' or formatted as flashcard
  const flashcardsQuery = useQuery<Note[]>({
    queryKey: ['flashcards', user?.id],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];

      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', session.user.id)
        .contains('tags', ['flashcard'])
        .order('created_at', { ascending: false });

      if (error) {
        // Fallback: fetch all notes and filter in-memory
        const { data: allNotes, error: allErr } = await supabase
          .from('notes')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        if (allErr) throw allErr;
        return (allNotes || []).filter(
          (n: Note) => n.tags?.includes('flashcard') || n.content?.startsWith('{"front":')
        );
      }

      return (data || []) as Note[];
    },
    enabled: !!user?.id,
  });

  const parsedCards = useMemo((): ParsedFlashcard[] => {
    const list = flashcardsQuery.data || [];
    return list.map(parseNoteToFlashcard);
  }, [flashcardsQuery.data]);

  const dueCards = useMemo((): ParsedFlashcard[] => {
    return parsedCards.filter((c) => c.isDue);
  }, [parsedCards]);

  const cardsBySubject = useMemo((): Record<string, ParsedFlashcard[]> => {
    const map: Record<string, ParsedFlashcard[]> = {};
    parsedCards.forEach((card) => {
      const sub = card.subject || 'General';
      if (!map[sub]) map[sub] = [];
      map[sub].push(card);
    });
    return map;
  }, [parsedCards]);

  // Create flashcard mutation
  const createFlashcardMutation = useMutation({
    mutationFn: async (payload: {
      front: string;
      back: string;
      subject: string;
      chapter?: string | null;
      tags?: string[];
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const todayStr = new Date().toLocaleDateString('en-CA');
      const allTags = Array.from(new Set(['flashcard', ...(payload.tags || [])]));

      const { data, error } = await supabase
        .from('notes')
        .insert({
          user_id: session.user.id,
          title: payload.front.trim(),
          content: JSON.stringify({
            front: payload.front.trim(),
            back: payload.back.trim(),
          }),
          subject: payload.subject.trim(),
          chapter: payload.chapter?.trim() || null,
          tags: allTags,
          next_review: todayStr, // Today: immediately ready for practice!
          review_count: 0,
          ease_factor: 2.5,
          interval_days: 1,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Note;
    },
    onSuccess: (newNote) => {
      queryClient.invalidateQueries({ queryKey: ['flashcards', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notes', user?.id] });
    },
  });

  // Seed starter flashcards mutation
  const seedStarterFlashcardsMutation = useMutation({
    mutationFn: async (targetSubjects?: string[]) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const todayStr = new Date().toLocaleDateString('en-CA');

      // Filter seeds by target subjects if provided, otherwise pick all
      let seedsToInsert = STARTER_FLASHCARDS_SEED;
      if (targetSubjects && targetSubjects.length > 0) {
        const lowerSubs = targetSubjects.map((s) => s.toLowerCase());
        seedsToInsert = STARTER_FLASHCARDS_SEED.filter((s) =>
          lowerSubs.some((sub) => s.subject.toLowerCase().includes(sub) || sub.includes(s.subject.toLowerCase()))
        );
        if (seedsToInsert.length === 0) {
          seedsToInsert = STARTER_FLASHCARDS_SEED.slice(0, 8);
        }
      }

      const rows = seedsToInsert.map((item) => ({
        user_id: session.user.id,
        title: item.front,
        content: JSON.stringify({ front: item.front, back: item.back }),
        subject: item.subject,
        tags: ['flashcard', 'starter'],
        next_review: todayStr,
        review_count: 0,
        ease_factor: 2.5,
        interval_days: 1,
      }));

      const { data, error } = await supabase
        .from('notes')
        .insert(rows)
        .select();

      if (error) throw error;
      return data as Note[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notes', user?.id] });
    },
  });

  // Delete flashcard mutation
  const deleteFlashcardMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notes', user?.id] });
    },
  });

  return {
    rawCards: flashcardsQuery.data || [],
    parsedCards,
    dueCards,
    cardsBySubject,
    isLoading: flashcardsQuery.isLoading,
    isRefetching: flashcardsQuery.isRefetching,
    refetch: flashcardsQuery.refetch,
    createFlashcard: createFlashcardMutation.mutateAsync,
    isCreating: createFlashcardMutation.isPending,
    seedStarterFlashcards: seedStarterFlashcardsMutation.mutateAsync,
    isSeeding: seedStarterFlashcardsMutation.isPending,
    deleteFlashcard: deleteFlashcardMutation.mutateAsync,
    isDeleting: deleteFlashcardMutation.isPending,
  };
}
