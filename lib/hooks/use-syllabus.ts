import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { SyllabusTopic, SyllabusStatus } from '@/types/app.types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/lib/store/auth.store';
import { fetchExamSyllabusTopics } from '@/lib/hooks/use-exams';

export interface GroupedSubject {
  subject: string;
  examSlugs: string[];
  examSlug?: string | null;
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
  const { user, profile } = useAuthStore();
  const activeUserId = user?.id || profile?.id;
  const cacheKey = `syllabus_grouped_v5_${activeUserId || 'guest'}`;

  return useQuery<GroupedSyllabus>({
    queryKey: ['syllabus', activeUserId],
    queryFn: async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id || activeUserId || useAuthStore.getState().profile?.id;
        if (!userId) return {};

        // 1. Fetch user's custom / legacy syllabus_topics
        let customTopics: SyllabusTopic[] = [];
        try {
          const { data, error } = await supabase
            .from('syllabus_topics')
            .select('*')
            .eq('user_id', userId)
            .order('subject', { ascending: true })
            .order('chapter', { ascending: true })
            .order('order_index', { ascending: true });
          if (!error && data) customTopics = data as SyllabusTopic[];
        } catch {
          // ignore
        }

        // 2. Fetch user's chapter progress delta (only tracks in_progress & done)
        const progressMap = new Map<string, { status: SyllabusStatus; completed_at?: string | null }>();
        try {
          const { data: progressRows, error: pErr } = await supabase
            .from('user_chapter_progress')
            .select('*')
            .eq('user_id', userId);
          if (!pErr && progressRows) {
            progressRows.forEach((p: any) => {
              progressMap.set(p.chapter_id, {
                status: p.status as SyllabusStatus,
                completed_at: p.completed_at,
              });
            });
          }
        } catch {
          // ignore if table not created yet in current environment
        }

        // 3. Find active exams for this user
        const activeSlugs = new Set<string>();
        try {
          const { data: enrollments } = await supabase
            .from('user_exam_enrollments')
            .select('exam_slug')
            .eq('user_id', userId);
          if (enrollments && enrollments.length > 0) {
            enrollments.forEach((e: any) => {
              if (e.exam_slug) activeSlugs.add(e.exam_slug);
            });
          }
        } catch {
          // ignore
        }

        // Also check profile's sub_category
        const profile = useAuthStore.getState().profile;
        if (profile?.sub_category && Array.isArray(profile.sub_category)) {
          profile.sub_category.forEach((cat) => {
            if (cat && cat !== 'cse_student') activeSlugs.add(cat);
          });
        }

        // 4. Fetch master curriculum for each active exam and synthesize topics
        const combinedTopics: SyllabusTopic[] = [...customTopics];
        const existingKeys = new Set(
          customTopics.map((t) => `${t.subject.toLowerCase().trim()}:::${t.chapter.toLowerCase().trim()}`)
        );

        for (const slug of Array.from(activeSlugs)) {
          try {
            const masterExam = await fetchExamSyllabusTopics(slug);
            if (masterExam && masterExam.topics.length > 0) {
              masterExam.topics.forEach((mt) => {
                const key = `${mt.subject.toLowerCase().trim()}:::${mt.chapter.toLowerCase().trim()}`;
                if (!existingKeys.has(key)) {
                  existingKeys.add(key);
                  const progress = mt.chapter_id ? progressMap.get(mt.chapter_id) : undefined;
                  const status: SyllabusStatus = progress ? progress.status : 'not_started';
                  combinedTopics.push({
                    id: mt.id || `master-ch-${mt.chapter_id || mt.chapter}`,
                    user_id: userId,
                    subject: mt.subject,
                    chapter: mt.chapter,
                    topic: mt.topic,
                    status,
                    order_index: mt.order_index,
                    exam_slug: mt.exam_slug || slug,
                    chapter_id: mt.chapter_id,
                    created_at: new Date().toISOString(),
                  });
                }
              });
            }
          } catch {
            // ignore network/seed lookup failure
          }
        }

        // 5. Group into GroupedSyllabus structure
        const grouped: GroupedSyllabus = {};

        combinedTopics.forEach((topic) => {
          const { subject, chapter, exam_slug } = topic;
          const groupKey = subject.trim();

          if (!grouped[groupKey]) {
            grouped[groupKey] = {
              subject: groupKey,
              examSlugs: [],
              examSlug: exam_slug || null,
              chapters: {},
              completionPercent: 0,
              totalCount: 0,
              doneCount: 0,
            };
          }

          if (exam_slug) {
            const slugs = exam_slug.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
            slugs.forEach((slug) => {
              if (!grouped[groupKey].examSlugs.includes(slug)) {
                grouped[groupKey].examSlugs.push(slug);
              }
            });
          }

          if (!grouped[groupKey].chapters[chapter]) {
            grouped[groupKey].chapters[chapter] = [];
          }

          grouped[groupKey].chapters[chapter].push(topic);
          grouped[groupKey].totalCount++;
          if (topic.status === 'done') {
            grouped[groupKey].doneCount++;
          }
        });

        // Calculate completion percentages
        Object.keys(grouped).forEach((groupKey) => {
          const sub = grouped[groupKey];
          sub.completionPercent =
            sub.totalCount > 0 ? Math.round((sub.doneCount / sub.totalCount) * 100) : 0;
        });

        AsyncStorage.setItem(cacheKey, JSON.stringify(grouped)).catch(() => {});
        return grouped;
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

export function useUpdateTopicStatus() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuthStore();
  const userId = user?.id || profile?.id;

  return useMutation<
    SyllabusTopic,
    Error,
    { topicId: string; newStatus: SyllabusStatus },
    { previousSyllabus: GroupedSyllabus | undefined }
  >({
    mutationFn: async ({ topicId, newStatus }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id || userId || useAuthStore.getState().profile?.id;
      if (!currentUserId) throw new Error('Not authenticated');

      // 1. Locate topic details from current cache
      const previousSyllabus =
        queryClient.getQueryData<GroupedSyllabus>(['syllabus', currentUserId]) ||
        queryClient.getQueryData<GroupedSyllabus>(['syllabus']);

      let matchedTopic: SyllabusTopic | null = null;
      if (previousSyllabus) {
        for (const subKey of Object.keys(previousSyllabus)) {
          const sub = previousSyllabus[subKey];
          for (const chKey of Object.keys(sub.chapters)) {
            const found = sub.chapters[chKey].find((t) => t.id === topicId);
            if (found) {
              matchedTopic = found;
              break;
            }
          }
          if (matchedTopic) break;
        }
      }

      const chapterId =
        matchedTopic?.chapter_id ||
        (topicId.startsWith('master-ch-') ? topicId.replace('master-ch-', '') : null);

      const isChapterUuid = Boolean(
        chapterId &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chapterId)
      );

      // 2. Storage-Optimized Progress update:
      // If chapterId is a valid UUID, update user_chapter_progress table
      if (isChapterUuid && chapterId) {
        try {
          if (newStatus === 'done' || newStatus === 'in_progress' || newStatus === 'needs_revision') {
            const { error: progErr } = await supabase.from('user_chapter_progress').upsert(
              {
                user_id: currentUserId,
                chapter_id: chapterId,
                status: newStatus,
                completed_at: newStatus === 'done' ? new Date().toISOString() : null,
              },
              { onConflict: 'user_id,chapter_id' }
            );
            if (progErr) console.warn('user_chapter_progress upsert warning:', progErr);
          } else {
            // 'not_started' -> delete to keep zero storage overhead on Supabase!
            await supabase
              .from('user_chapter_progress')
              .delete()
              .eq('user_id', currentUserId)
              .eq('chapter_id', chapterId);
          }
        } catch (e) {
          console.warn('user_chapter_progress update error:', e);
        }
      }

      // 3. If it's a legacy or custom topic in syllabus_topics, update it as well
      const isTopicUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(topicId);
      if (isTopicUuid && !topicId.startsWith('master-ch-') && !topicId.startsWith('seed-')) {
        try {
          let query = supabase
            .from('syllabus_topics')
            .update({ status: newStatus })
            .eq('id', topicId);

          if (currentUserId) {
            query = query.eq('user_id', currentUserId);
          }

          const { error: topErr } = await query;
          if (topErr) console.warn('syllabus_topics update warning:', topErr);
        } catch (e) {
          console.warn('syllabus_topics update error:', e);
        }
      }

      return (
        matchedTopic
          ? { ...matchedTopic, status: newStatus }
          : { id: topicId, status: newStatus }
      ) as SyllabusTopic;
    },
    onMutate: async ({ topicId, newStatus }) => {
      const targetKey = ['syllabus', userId];
      await queryClient.cancelQueries({ queryKey: targetKey });

      // Snapshot previous state from targetKey
      const previousSyllabus = queryClient.getQueryData<GroupedSyllabus>(targetKey);

      if (previousSyllabus) {
        const nextSyllabus = JSON.parse(JSON.stringify(previousSyllabus)) as GroupedSyllabus;
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

        if (updated) {
          queryClient.setQueryData<GroupedSyllabus>(targetKey, nextSyllabus);
          AsyncStorage.setItem(
            `syllabus_grouped_v5_${userId || 'guest'}`,
            JSON.stringify(nextSyllabus)
          ).catch(() => {});
        }
      }

      return { previousSyllabus };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousSyllabus) {
        queryClient.setQueryData(['syllabus', userId], context.previousSyllabus);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['syllabus'] });
    },
  });
}

export function useBulkUpdateTopics() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuthStore();
  const userId = user?.id || profile?.id;

  return useMutation<
    SyllabusTopic[],
    Error,
    { topicIds: string[]; newStatus: SyllabusStatus }
  >({
    mutationFn: async ({ topicIds, newStatus }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id || userId || useAuthStore.getState().profile?.id;
      if (!currentUserId) throw new Error('Not authenticated');

      const masterChapterIds: string[] = [];
      const legacyTopicIds: string[] = [];

      topicIds.forEach((id) => {
        if (id.startsWith('master-ch-')) {
          const rawId = id.replace('master-ch-', '');
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId)) {
            masterChapterIds.push(rawId);
          }
        } else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
          legacyTopicIds.push(id);
        }
      });

      if (masterChapterIds.length > 0) {
        try {
          if (newStatus === 'done' || newStatus === 'in_progress' || newStatus === 'needs_revision') {
            const rows = masterChapterIds.map((chId) => ({
              user_id: currentUserId,
              chapter_id: chId,
              status: newStatus,
              completed_at: newStatus === 'done' ? new Date().toISOString() : null,
            }));
            await supabase.from('user_chapter_progress').upsert(rows, { onConflict: 'user_id,chapter_id' });
          } else {
            await supabase
              .from('user_chapter_progress')
              .delete()
              .eq('user_id', currentUserId)
              .in('chapter_id', masterChapterIds);
          }
        } catch (e) {
          console.warn('bulk progress error:', e);
        }
      }

      if (legacyTopicIds.length > 0) {
        try {
          await supabase
            .from('syllabus_topics')
            .update({ status: newStatus })
            .in('id', legacyTopicIds)
            .eq('user_id', currentUserId);
        } catch (e) {
          console.warn('bulk syllabus_topics error:', e);
        }
      }

      return [];
    },
    onMutate: async ({ topicIds, newStatus }) => {
      const targetKey = ['syllabus', userId];
      await queryClient.cancelQueries({ queryKey: targetKey });

      const prevData = queryClient.getQueryData<GroupedSyllabus>(targetKey);

      if (prevData) {
        const nextData = JSON.parse(JSON.stringify(prevData)) as GroupedSyllabus;
        const idSet = new Set(topicIds);

        Object.keys(nextData).forEach((subName) => {
          const sub = nextData[subName];
          Object.keys(sub.chapters).forEach((chapName) => {
            const list = sub.chapters[chapName];
            list.forEach((t) => {
              if (idSet.has(t.id)) {
                const oldStatus = t.status;
                t.status = newStatus;
                if (oldStatus === 'done' && newStatus !== 'done') {
                  sub.doneCount = Math.max(0, sub.doneCount - 1);
                } else if (oldStatus !== 'done' && newStatus === 'done') {
                  sub.doneCount++;
                }
              }
            });
          });
          sub.completionPercent =
            sub.totalCount > 0 ? Math.round((sub.doneCount / sub.totalCount) * 100) : 0;
        });

        queryClient.setQueryData(targetKey, nextData);
        AsyncStorage.setItem(
          `syllabus_grouped_v5_${userId || 'guest'}`,
          JSON.stringify(nextData)
        ).catch(() => {});
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['syllabus'] });
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
    { subject: string; chapter: string; topic: string; order_index: number; exam_slug?: string | null }[]
  >({
    mutationFn: async (topics) => {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || useAuthStore.getState().user?.id || useAuthStore.getState().profile?.id;
      if (!userId) throw new Error('Not authenticated. Please log in again.');

      // 1. Storage-Optimized Enrollment: Register user into user_exam_enrollments
      // Does NOT clone duplicate chapter text rows into database, saving 95%+ storage!
      const examSlugs = Array.from(new Set(topics.map((t) => t.exam_slug).filter(Boolean))) as string[];
      for (const slug of examSlugs) {
        try {
          const { data: ex } = await supabase.from('exams').select('id').eq('slug', slug).maybeSingle();
          if (ex?.id) {
            await supabase.from('user_exam_enrollments').upsert(
              {
                user_id: userId,
                exam_id: ex.id,
                exam_slug: slug,
                is_primary: true,
              },
              { onConflict: 'user_id,exam_id' }
            );
          }
        } catch {
          // ignore if table not yet created
        }
      }

      // 2. Invalidate local AsyncStorage cache so fresh master curriculum renders instantly
      try {
        await AsyncStorage.multiRemove([
          `syllabus_grouped_${userId}`,
          `syllabus_grouped_v3_${userId}`,
          `syllabus_grouped_v4_${userId}`,
          `syllabus_grouped_v5_${userId}`,
        ]);
      } catch {
        // ignore
      }

      return [];
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['syllabus'] });
      await queryClient.invalidateQueries({ queryKey: ['profile_subjects'] });
      await queryClient.invalidateQueries({ queryKey: ['subjects'] });
    },
  });
}

