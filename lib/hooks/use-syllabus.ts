import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { SyllabusTopic, SyllabusStatus } from '@/types/app.types';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface GroupedSubject {
  chapters: {
    [chapter: string]: SyllabusTopic[];
  };
  completionPercent: number;
  totalCount: number;
  doneCount: number;
}

export type GroupedSyllabus = {
  [subject: string]: GroupedSubject;
};

export function useSyllabus() {
  return useQuery<GroupedSyllabus>({
    queryKey: ['syllabus'],
    queryFn: async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const { data, error } = await supabase
          .from('syllabus_topics')
          .select('*')
          .eq('user_id', session.user.id)
          .order('subject', { ascending: true })
          .order('chapter', { ascending: true })
          .order('order_index', { ascending: true });

        if (error) throw error;

        const topics = (data || []) as SyllabusTopic[];
        const grouped: GroupedSyllabus = {};

        topics.forEach((topic) => {
          const { subject, chapter } = topic;

          if (!grouped[subject]) {
            grouped[subject] = {
              chapters: {},
              completionPercent: 0,
              totalCount: 0,
              doneCount: 0,
            };
          }

          if (!grouped[subject].chapters[chapter]) {
            grouped[subject].chapters[chapter] = [];
          }

          grouped[subject].chapters[chapter].push(topic);
          grouped[subject].totalCount++;
          if (topic.status === 'done') {
            grouped[subject].doneCount++;
          }
        });

        // Calculate completion percentages
        Object.keys(grouped).forEach((subject) => {
          const sub = grouped[subject];
          sub.completionPercent =
            sub.totalCount > 0 ? Math.round((sub.doneCount / sub.totalCount) * 100) : 0;
        });

        AsyncStorage.setItem('syllabus_grouped_cache', JSON.stringify(grouped)).catch(() => {});
        return grouped;
      } catch (err: any) {
        const isNetError = 
          err.message?.toLowerCase().includes('network') || 
          err.message?.toLowerCase().includes('fetch') || 
          err.message?.toLowerCase().includes('timeout') ||
          err.status === 0;

        if (isNetError) {
          const cached = await AsyncStorage.getItem('syllabus_grouped_cache');
          if (cached) return JSON.parse(cached);
        }
        throw err;
      }
    },
  });
}

export function useUpdateTopicStatus() {
  const queryClient = useQueryClient();

  return useMutation<
    SyllabusTopic,
    Error,
    { topicId: string; newStatus: SyllabusStatus },
    { previousSyllabus: GroupedSyllabus | undefined }
  >({
    mutationFn: async ({ topicId, newStatus }) => {
      const { data, error } = await supabase
        .from('syllabus_topics')
        .update({ status: newStatus })
        .eq('id', topicId)
        .select()
        .single();

      if (error) throw error;
      return data as SyllabusTopic;
    },
    onMutate: async ({ topicId, newStatus }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['syllabus'] });

      // Snapshot previous state
      const previousSyllabus = queryClient.getQueryData<GroupedSyllabus>(['syllabus']);

      // Optimistically update
      if (previousSyllabus) {
        queryClient.setQueryData<GroupedSyllabus>(['syllabus'], (old) => {
          if (!old) return {};
          
          // Deep clone old grouped syllabus
          const nextSyllabus = JSON.parse(JSON.stringify(old)) as GroupedSyllabus;

          // Find and update status of the topic
          let updated = false;
          Object.keys(nextSyllabus).forEach((subject) => {
            const sub = nextSyllabus[subject];
            Object.keys(sub.chapters).forEach((chapter) => {
              const list = sub.chapters[chapter];
              const idx = list.findIndex((t) => t.id === topicId);
              if (idx !== -1) {
                const topic = list[idx];
                const oldStatus = topic.status;
                topic.status = newStatus;
                updated = true;

                // Adjust subject totals
                if (oldStatus === 'done' && newStatus !== 'done') {
                  sub.doneCount = Math.max(0, sub.doneCount - 1);
                } else if (oldStatus !== 'done' && newStatus === 'done') {
                  sub.doneCount++;
                }

                // Recalculate percent
                sub.completionPercent =
                  sub.totalCount > 0 ? Math.round((sub.doneCount / sub.totalCount) * 100) : 0;
              }
            });
          });

          return updated ? nextSyllabus : old;
        });
      }

      return { previousSyllabus };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousSyllabus) {
        queryClient.setQueryData(['syllabus'], context.previousSyllabus);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['syllabus'] });
    },
  });
}

export function useBulkUpdateTopics() {
  const queryClient = useQueryClient();

  return useMutation<
    SyllabusTopic[],
    Error,
    { topicIds: string[]; newStatus: SyllabusStatus }
  >({
    mutationFn: async ({ topicIds, newStatus }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('syllabus_topics')
        .update({ status: newStatus })
        .in('id', topicIds)
        .eq('user_id', session.user.id)
        .select();

      if (error) throw error;
      return data as SyllabusTopic[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['syllabus'] });
    },
  });
}

export function useCreateTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (topicData: { subject: string; chapter: string; topic: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Find max order_index for this subject/chapter to append it at the end
      const { data: existing } = await supabase
        .from('syllabus_topics')
        .select('order_index')
        .eq('user_id', session.user.id)
        .eq('subject', topicData.subject)
        .eq('chapter', topicData.chapter);

      const maxOrder = existing && existing.length > 0
        ? Math.max(...existing.map((e) => e.order_index || 0))
        : 0;

      const { data, error } = await supabase
        .from('syllabus_topics')
        .insert({
          subject: topicData.subject.trim(),
          chapter: topicData.chapter.trim(),
          topic: topicData.topic.trim(),
          user_id: session.user.id,
          status: 'not_started',
          order_index: maxOrder + 1,
        })
        .select()
        .single();

      if (error) throw error;
      return data as SyllabusTopic;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['syllabus'] });
    },
  });
}

export function useSetupSyllabus() {
  const queryClient = useQueryClient();

  return useMutation<
    SyllabusTopic[],
    Error,
    { subject: string; chapter: string; topic: string; order_index: number }[]
  >({
    mutationFn: async (topics) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const allTopics = topics.map((t) => ({
        subject: t.subject.trim(),
        chapter: t.chapter.trim(),
        topic: t.topic.trim(),
        order_index: t.order_index,
        user_id: session.user.id,
        status: 'not_started',
      }));

      const { data, error } = await supabase
        .from('syllabus_topics')
        .insert(allTopics)
        .select();

      if (error) throw error;
      return data as SyllabusTopic[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['syllabus'] });
    },
  });
}

