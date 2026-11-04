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
  const cacheKey = `syllabus_grouped_v6_${activeUserId || 'guest'}`;

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
        const progressMap = new Map<
          string,
          {
            status: SyllabusStatus;
            completed_at?: string | null;
            topicStatuses?: Record<string, SyllabusStatus> | null;
          }
        >();
        try {
          const { data: progressRows, error: pErr } = await supabase
            .from('user_chapter_progress')
            .select('*')
            .eq('user_id', userId);
          if (!pErr && progressRows) {
            progressRows.forEach((p: any) => {
              let topicStatuses: Record<string, SyllabusStatus> | null = null;
              if (p.notes && typeof p.notes === 'string' && p.notes.startsWith('{')) {
                try {
                  topicStatuses = JSON.parse(p.notes);
                } catch {
                  // ignore
                }
              }
              progressMap.set(p.chapter_id, {
                status: p.status as SyllabusStatus,
                completed_at: p.completed_at,
                topicStatuses,
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
          customTopics.map(
            (t) =>
              `${t.subject.toLowerCase().trim()}:::${t.chapter.toLowerCase().trim()}:::${t.topic.toLowerCase().trim()}`
          )
        );

        for (const slug of Array.from(activeSlugs)) {
          try {
            const masterExam = await fetchExamSyllabusTopics(slug);
            if (masterExam && masterExam.topics.length > 0) {
              const examSlugToAdd = masterExam.examSlug || slug;
              masterExam.topics.forEach((mt) => {
                const key = `${mt.subject.toLowerCase().trim()}:::${mt.chapter.toLowerCase().trim()}:::${mt.topic.toLowerCase().trim()}`;
                const topicSlug = mt.exam_slug || examSlugToAdd;
                if (!existingKeys.has(key)) {
                  existingKeys.add(key);
                  const progress = mt.chapter_id ? progressMap.get(mt.chapter_id) : undefined;
                  let status: SyllabusStatus = 'not_started';
                  if (progress?.topicStatuses && mt.id && progress.topicStatuses[mt.id]) {
                    status = progress.topicStatuses[mt.id];
                  } else if (progress) {
                    status = progress.status;
                  }
                  combinedTopics.push({
                    id: mt.id || `master-ch-${mt.chapter_id || mt.chapter}`,
                    user_id: userId,
                    subject: mt.subject,
                    chapter: mt.chapter,
                    topic: mt.topic,
                    status,
                    order_index: mt.order_index,
                    exam_slug: topicSlug,
                    chapter_id: mt.chapter_id,
                    created_at: new Date().toISOString(),
                  });
                } else {
                  // Already present: append exam slug so shared subjects link to both exams
                  const existingTopic = combinedTopics.find(
                    (t) =>
                      `${t.subject.toLowerCase().trim()}:::${t.chapter.toLowerCase().trim()}:::${t.topic.toLowerCase().trim()}` ===
                      key
                  );
                  if (existingTopic && topicSlug) {
                    const currentSlugs = (existingTopic.exam_slug || '')
                      .split(',')
                      .map((s) => s.trim().toLowerCase());
                    if (!currentSlugs.includes(topicSlug.toLowerCase())) {
                      existingTopic.exam_slug = existingTopic.exam_slug
                        ? `${existingTopic.exam_slug},${topicSlug}`
                        : topicSlug;
                    }
                  }
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

      let chapterId =
        matchedTopic?.chapter_id ||
        (topicId.startsWith('master-ch-') ? topicId.replace('master-ch-', '').replace(/-[0-9]+$/, '') : null);

      let isChapterUuid = Boolean(
        chapterId &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chapterId)
      );

      // If chapterId is missing or non-UUID, resolve active chapter UUID from exam_chapters
      if (!isChapterUuid && matchedTopic?.chapter) {
        try {
          const { data: realChapter } = await supabase
            .from('exam_chapters')
            .select('id')
            .ilike('name', matchedTopic.chapter.trim())
            .limit(1)
            .maybeSingle();

          if (realChapter?.id) {
            chapterId = realChapter.id;
            isChapterUuid = true;
          }
        } catch {
          // ignore lookup error
        }
      }

      // 2. Storage-Optimized Progress update for master chapters:
      // If chapterId is a valid UUID, update user_chapter_progress table with topic-level notes
      let progSaved = false;
      if (isChapterUuid && chapterId) {
        try {
          const { data: existingProg } = await supabase
            .from('user_chapter_progress')
            .select('notes, status')
            .eq('user_id', currentUserId)
            .eq('chapter_id', chapterId)
            .maybeSingle();

          let currentTopicMap: Record<string, SyllabusStatus> = {};
          if (existingProg?.notes && existingProg.notes.startsWith('{')) {
            try {
              currentTopicMap = JSON.parse(existingProg.notes);
            } catch {
              // ignore
            }
          }

          if (newStatus === 'not_started') {
            delete currentTopicMap[topicId];
            delete currentTopicMap[`master-ch-${chapterId}`];
          } else {
            currentTopicMap[topicId] = newStatus;
          }

          const hasActiveTopics = Object.keys(currentTopicMap).length > 0;
          if (hasActiveTopics) {
            const allDone = Object.values(currentTopicMap).every((st) => st === 'done');
            const overallChapterStatus = allDone ? 'done' : 'in_progress';

            const { error: progErr } = await supabase.from('user_chapter_progress').upsert(
              {
                user_id: currentUserId,
                chapter_id: chapterId,
                status: overallChapterStatus,
                notes: JSON.stringify(currentTopicMap),
                completed_at: allDone ? new Date().toISOString() : null,
              },
              { onConflict: 'user_id,chapter_id' }
            );
            if (!progErr) {
              progSaved = true;
            } else {
              console.warn('user_chapter_progress upsert warning:', progErr);
            }
          } else {
            await supabase
              .from('user_chapter_progress')
              .delete()
              .eq('user_id', currentUserId)
              .eq('chapter_id', chapterId);
            progSaved = true;
          }
        } catch (e) {
          console.warn('user_chapter_progress update error:', e);
        }
      }

      // 3. Robust Direct Persistence in syllabus_topics:
      // Always persist topic status in syllabus_topics so it NEVER undos or reverts!
      const isTopicUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(topicId);
      if (isTopicUuid && !topicId.startsWith('master-ch-') && !topicId.startsWith('seed-')) {
        try {
          await supabase
            .from('syllabus_topics')
            .update({ status: newStatus })
            .eq('id', topicId)
            .eq('user_id', currentUserId);
        } catch (e) {
          console.warn('syllabus_topics update error:', e);
        }
      } else if (matchedTopic?.subject && matchedTopic?.chapter && matchedTopic?.topic) {
        // Master / seed / template topic persistence fallback
        try {
          const { data: existingTopic } = await supabase
            .from('syllabus_topics')
            .select('id')
            .eq('user_id', currentUserId)
            .eq('subject', matchedTopic.subject)
            .eq('chapter', matchedTopic.chapter)
            .eq('topic', matchedTopic.topic)
            .maybeSingle();

          if (existingTopic?.id) {
            if (newStatus === 'not_started') {
              await supabase.from('syllabus_topics').delete().eq('id', existingTopic.id);
            } else {
              await supabase
                .from('syllabus_topics')
                .update({ status: newStatus })
                .eq('id', existingTopic.id);
            }
          } else if (newStatus !== 'not_started') {
            await supabase
              .from('syllabus_topics')
              .insert({
                user_id: currentUserId,
                subject: matchedTopic.subject,
                chapter: matchedTopic.chapter,
                topic: matchedTopic.topic,
                status: newStatus,
                order_index: matchedTopic.order_index ?? 0,
                exam_slug: matchedTopic.exam_slug ?? null,
              });
          }
        } catch (e) {
          console.warn('syllabus_topics fallback persistence error:', e);
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
            `syllabus_grouped_v6_${userId || 'guest'}`,
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

      const previousSyllabus =
        queryClient.getQueryData<GroupedSyllabus>(['syllabus', currentUserId]) ||
        queryClient.getQueryData<GroupedSyllabus>(['syllabus']);

      const matchedTopicsMap = new Map<string, SyllabusTopic>();
      if (previousSyllabus) {
        for (const subKey of Object.keys(previousSyllabus)) {
          const sub = previousSyllabus[subKey];
          for (const chKey of Object.keys(sub.chapters)) {
            sub.chapters[chKey].forEach((t) => {
              if (topicIds.includes(t.id)) {
                matchedTopicsMap.set(t.id, t);
              }
            });
          }
        }
      }

      const masterChapterIds: string[] = [];
      const legacyTopicIds: string[] = [];

      for (const id of topicIds) {
        const matched = matchedTopicsMap.get(id);
        const isTopicUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

        if (isTopicUuid && !id.startsWith('master-ch-') && !id.startsWith('seed-')) {
          legacyTopicIds.push(id);
        } else if (id.startsWith('master-ch-')) {
          const rawId = id.replace('master-ch-', '').replace(/-[0-9]+$/, '');
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId)) {
            masterChapterIds.push(rawId);
          }
        }

        // Direct persistence fallback for all topics
        if (matched?.subject && matched?.chapter && matched?.topic) {
          try {
            const { data: existingTopic } = await supabase
              .from('syllabus_topics')
              .select('id')
              .eq('user_id', currentUserId)
              .eq('subject', matched.subject)
              .eq('chapter', matched.chapter)
              .eq('topic', matched.topic)
              .maybeSingle();

            if (existingTopic?.id) {
              if (newStatus === 'not_started') {
                await supabase.from('syllabus_topics').delete().eq('id', existingTopic.id);
              } else {
                await supabase
                  .from('syllabus_topics')
                  .update({ status: newStatus })
                  .eq('id', existingTopic.id);
              }
            } else if (newStatus !== 'not_started') {
              await supabase.from('syllabus_topics').insert({
                user_id: currentUserId,
                subject: matched.subject,
                chapter: matched.chapter,
                topic: matched.topic,
                status: newStatus,
                order_index: matched.order_index ?? 0,
                exam_slug: matched.exam_slug ?? null,
              });
            }
          } catch (e) {
            console.warn('bulk syllabus_topics fallback error:', e);
          }
        }
      }

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
          `syllabus_grouped_v6_${userId || 'guest'}`,
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

export function useUserExamEnrollments() {
  const { user } = useAuthStore();
  return useQuery<{ exam_id: string; exam_slug: string }[]>({
    queryKey: ['user_exam_enrollments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_exam_enrollments')
        .select('exam_id, exam_slug')
        .eq('user_id', user.id);
      if (error) return [];
      return data || [];
    },
    enabled: !!user?.id,
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
      const rawSlugs = Array.from(new Set(topics.map((t) => t.exam_slug).filter(Boolean))) as string[];
      for (const rawSlug of rawSlugs) {
        try {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawSlug);
          let ex: { id: string; slug: string } | null = null;

          if (isUuid) {
            const { data } = await supabase.from('exams').select('id, slug').eq('id', rawSlug).maybeSingle();
            ex = data;
          } else {
            const { data } = await supabase.from('exams').select('id, slug').eq('slug', rawSlug).maybeSingle();
            ex = data;
            if (!ex) {
              const clean = rawSlug.replace(/[-_]/g, ' ').replace(/[()]/g, '').trim();
              const { data: byName } = await supabase.from('exams').select('id, slug').ilike('name', `%${clean}%`).maybeSingle();
              ex = byName;
            }
          }

          if (ex?.id) {
            const canonicalSlug = ex.slug || rawSlug;
            await supabase.from('user_exam_enrollments').upsert(
              {
                user_id: userId,
                exam_id: ex.id,
                exam_slug: canonicalSlug,
                is_primary: true,
              },
              { onConflict: 'user_id,exam_id' }
            );

            // Sync user's sub_category in profiles table and Zustand store
            const currentSubCats = Array.isArray(useAuthStore.getState().profile?.sub_category)
              ? [...(useAuthStore.getState().profile!.sub_category || [])]
              : [];
            if (!currentSubCats.includes(canonicalSlug)) {
              const updatedSubCat = [canonicalSlug, ...currentSubCats.filter((s) => s !== canonicalSlug)];
              await supabase.from('profiles').update({ sub_category: updatedSubCat }).eq('id', userId);
              const currentProf = useAuthStore.getState().profile;
              if (currentProf) {
                useAuthStore.getState().setProfile({
                  ...currentProf,
                  sub_category: updatedSubCat,
                });
              }
            }
          }
        } catch (enrollErr) {
          console.warn('user_exam_enrollments sync warning:', enrollErr);
        }
      }

      // 2. Invalidate local AsyncStorage cache so fresh master curriculum renders instantly
      try {
        const allKeys = await AsyncStorage.getAllKeys();
        const staleKeys = allKeys.filter(
          (k) =>
            k.startsWith(`syllabus_grouped_`) ||
            k.startsWith(`curriculum_syllabus_topics_`)
        );
        if (staleKeys.length > 0) {
          await AsyncStorage.multiRemove(staleKeys);
        }
      } catch {
        // ignore
      }

      return [];
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['syllabus'] });
      await queryClient.invalidateQueries({ queryKey: ['profile_subjects'] });
      await queryClient.invalidateQueries({ queryKey: ['subjects'] });
      await queryClient.invalidateQueries({ queryKey: ['user_exam_enrollments'] });
    },
  });
}

export function useRemoveExamEnrollment() {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { examSlug?: string; examId?: string; examName?: string }
  >({
    mutationFn: async ({ examSlug, examId, examName }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const userId =
        session?.user?.id ||
        useAuthStore.getState().user?.id ||
        useAuthStore.getState().profile?.id;
      if (!userId) throw new Error('Not authenticated. Please log in again.');

      const targetSlug = (examSlug || '').trim().toLowerCase();
      const targetId = (examId || '').trim();
      const targetName = (examName || '').trim().toLowerCase();

      let resolvedId = targetId;
      let resolvedSlug = targetSlug;

      if (!resolvedSlug && targetName) {
        const clean = targetName.replace(/[-_]/g, ' ').replace(/[()]/g, '').trim();
        const { data: byName } = await supabase
          .from('exams')
          .select('id, slug')
          .ilike('name', `%${clean}%`)
          .maybeSingle();
        if (byName) {
          resolvedId = byName.id;
          resolvedSlug = byName.slug;
        }
      }

      const matchSlugs = Array.from(
        new Set(
          [targetSlug, resolvedSlug, targetId, resolvedId]
            .filter(Boolean)
            .map((s) => s.toLowerCase())
        )
      );

      // 1. Delete matching rows from user_exam_enrollments
      try {
        let deleteQuery = supabase
          .from('user_exam_enrollments')
          .delete()
          .eq('user_id', userId);

        const orConditions: string[] = [];
        matchSlugs.forEach((slug) => {
          orConditions.push(`exam_slug.eq.${slug}`);
        });
        if (resolvedId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedId)) {
          orConditions.push(`exam_id.eq.${resolvedId}`);
        }
        if (orConditions.length > 0) {
          deleteQuery = deleteQuery.or(orConditions.join(','));
        }

        const { error: delErr } = await deleteQuery;
        if (delErr) {
          console.warn('user_exam_enrollments delete warning:', delErr);
        }
      } catch (err) {
        console.warn('Error deleting user_exam_enrollment:', err);
      }

      // 2. Update profiles.sub_category and Zustand store
      try {
        const currentProfile = useAuthStore.getState().profile;
        const currentSubCats = Array.isArray(currentProfile?.sub_category)
          ? [...(currentProfile?.sub_category || [])]
          : [];

        const updatedSubCats = currentSubCats.filter((cat) => {
          const lowerCat = (cat || '').toLowerCase().trim();
          return !matchSlugs.includes(lowerCat);
        });

        const updates: Record<string, any> = { sub_category: updatedSubCats };

        if (
          (matchSlugs.includes('btech-cse') || matchSlugs.includes('cse')) &&
          currentProfile?.category === 'cse_student'
        ) {
          updates.category = 'student';
        }

        await supabase
          .from('profiles')
          .update(updates)
          .eq('id', userId);

        if (currentProfile) {
          useAuthStore.getState().setProfile({
            ...currentProfile,
            ...updates,
          });
        }
      } catch (err) {
        console.warn('Error updating profile sub_category:', err);
      }

      // 3. Delete custom syllabus_topics for this exam
      try {
        for (const slug of matchSlugs) {
          await supabase
            .from('syllabus_topics')
            .delete()
            .eq('user_id', userId)
            .ilike('exam_slug', `%${slug}%`);
        }
      } catch (err) {
        console.warn('Error deleting syllabus_topics for exam:', err);
      }

      // 4. Clean up user_chapter_progress for this exam's chapters
      try {
        for (const slug of matchSlugs) {
          const masterExam = await fetchExamSyllabusTopics(slug);
          if (masterExam?.topics?.length) {
            const chapterIds = masterExam.topics
              .map((t) => t.chapter_id)
              .filter(Boolean) as string[];
            if (chapterIds.length > 0) {
              await supabase
                .from('user_chapter_progress')
                .delete()
                .eq('user_id', userId)
                .in('chapter_id', chapterIds);
            }
          }
        }
      } catch (err) {
        console.warn('Error cleaning up user_chapter_progress:', err);
      }

      // 5. Invalidate local AsyncStorage caches
      try {
        await AsyncStorage.multiRemove([
          `syllabus_grouped_${userId}`,
          `syllabus_grouped_v3_${userId}`,
          `syllabus_grouped_v4_${userId}`,
          `syllabus_grouped_v5_${userId}`,
          `user_exams_${userId}`,
        ]);
      } catch {
        // ignore
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['syllabus'] });
      await queryClient.invalidateQueries({ queryKey: ['user_exam_enrollments'] });
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      await queryClient.invalidateQueries({ queryKey: ['profile_subjects'] });
      await queryClient.invalidateQueries({ queryKey: ['subjects'] });
    },
  });
}


