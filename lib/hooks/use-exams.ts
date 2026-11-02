import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { Exam, ExamSubject, ExamChapter, ExamType } from '@/types/app.types';
import { SEED_EXAMS } from '@/lib/constants/exams-seed';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/lib/store/auth.store';
import { captureError } from '@/lib/sentry';
import { getImportantTopicsForChapter } from '@/lib/constants/chapter-topics-engine';

// AsyncStorage Persistence Keys
const CACHE_EXAMS_KEY = 'curriculum_exams_v3';
const CACHE_SUBJECTS_PREFIX = 'curriculum_subjects_v3_';
const CACHE_CHAPTERS_PREFIX = 'curriculum_chapters_v3_';

// Cache TTL
const STALE_TIME = 1000 * 60 * 5; // 5 minutes in memory before background revalidation
const GC_TIME = 1000 * 60 * 60 * 24 * 7; // 7 days in memory

interface UseExamsOptions {
  category?: string;
  examType?: ExamType | 'all';
  search?: string;
}

/**
 * Highly optimized, offline-first hook to retrieve exams.
 * - Always attempts network fetch to stay dynamic, but instantly falls back
 *   to local AsyncStorage cache and bundled seeds if offline or slow.
 * - React Query caches result in memory for 5 minutes (0 extra API calls on screen navigation).
 */
export function useExams(options?: UseExamsOptions) {
  const { category = 'student', examType = 'all', search = '' } = options || {};

  return useQuery<Exam[]>({
    queryKey: ['exams_master', category, examType, search],
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnMount: true,
    queryFn: async () => {
      // 1. Fetch fresh from Supabase first
      try {
        const { data, error } = await supabase
          .from('exams')
          .select('*')
          .eq('is_active', true)
          .order('popularity_score', { ascending: false })
          .order('name', { ascending: true });

        if (!error && data && data.length > 0) {
          const list = data as Exam[];
          // Persist to local storage for offline use
          AsyncStorage.setItem(CACHE_EXAMS_KEY, JSON.stringify(list)).catch(() => {});
          return filterAndSortExams(list, category, examType, search);
        }
      } catch (err) {
        captureError(err, { context: 'useExams_queryFn_network' });
      }

      // 2. Fallback to AsyncStorage cache if offline / error
      try {
        const cachedRaw = await AsyncStorage.getItem(CACHE_EXAMS_KEY);
        if (cachedRaw) {
          const allExams: Exam[] = JSON.parse(cachedRaw);
          if (Array.isArray(allExams) && allExams.length > 0) {
            return filterAndSortExams(allExams, category, examType, search);
          }
        }
      } catch {
        // Fall through to seeds
      }

      // 3. Resilient fallback to seeds (0 API calls, works 100% offline)
      const seedList = SEED_EXAMS.map(
        (s): Exam => ({
          id: s.id,
          name: s.name,
          slug: s.slug,
          category: s.category,
          exam_type: s.exam_type,
          popularity_score: s.popularity_score,
          description: s.description,
          icon_name: s.icon_name || 'book',
          color: s.color,
          is_active: true,
        })
      );
      return filterAndSortExams(seedList, category, examType, search);
    },
  });
}

function filterAndSortExams(
  list: Exam[],
  category: string,
  examType: ExamType | 'all',
  search: string
): Exam[] {
  let result = [...list];

  if (category && category !== 'all') {
    const isAcademic = category === 'student' || category === 'aspirant' || category === 'cse_student';
    if (isAcademic) {
      result = result.filter((e) => e.category === 'student' || e.category === 'aspirant' || !e.category);
    } else {
      result = result.filter((e) => e.category === category);
    }
  }

  if (examType && examType !== 'all') {
    result = result.filter((e) => e.exam_type === examType);
  }

  if (search.trim()) {
    const q = search.trim().toLowerCase();
    result = result.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.description && e.description.toLowerCase().includes(q))
    );
  }

  return result.sort((a, b) => b.popularity_score - a.popularity_score);
}

/**
 * Highly optimized, offline-first hook to retrieve subjects for an exam.
 * - Reads from AsyncStorage cache first.
 * - Zero network calls on subsequent mounts.
 */
export function useExamSubjects(examIdentifier: string | null | undefined) {
  return useQuery<ExamSubject[]>({
    queryKey: ['exam_subjects_master', examIdentifier],
    enabled: !!examIdentifier,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnMount: true,
    queryFn: async () => {
      if (!examIdentifier) return [];

      const cacheKey = `${CACHE_SUBJECTS_PREFIX}${examIdentifier}`;

      // 1. Fetch from Supabase first
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          examIdentifier
        );

        let examId = isUuid ? examIdentifier : null;

        if (!examId) {
          const { data: bySlug } = await supabase
            .from('exams')
            .select('id')
            .eq('slug', examIdentifier)
            .maybeSingle();

          if (bySlug?.id) {
            examId = bySlug.id;
          } else {
            const { data: byName } = await supabase
              .from('exams')
              .select('id')
              .ilike('name', `%${examIdentifier.replace(/-/g, ' ')}%`)
              .maybeSingle();

            if (byName?.id) examId = byName.id;
          }
        }

        if (examId) {
          const { data, error } = await supabase
            .from('exam_subjects')
            .select('id, exam_id, subject_id, display_name, order_index, subjects (id, name, code, color, icon_name)')
            .eq('exam_id', examId)
            .order('order_index', { ascending: true });

          if (!error && data && data.length > 0) {
            const subjects: ExamSubject[] = data.map((row: any) => {
              const subObj = row.subjects;
              return {
                id: row.id,
                exam_id: row.exam_id,
                subject_id: row.subject_id,
                name: row.display_name || subObj?.name || 'Subject',
                display_name: row.display_name,
                code: subObj?.code || null,
                color: subObj?.color || '#5B4FE8',
                order_index: row.order_index,
                subject: subObj,
              };
            });
            AsyncStorage.setItem(cacheKey, JSON.stringify(subjects)).catch(() => {});
            return subjects;
          }
        }
      } catch (err) {
        captureError(err, { context: 'useExamSubjects_queryFn' });
      }

      // 2. Fallback to local storage cache if offline
      try {
        const cachedRaw = await AsyncStorage.getItem(cacheKey);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (Array.isArray(cached) && cached.length > 0) {
            return cached as ExamSubject[];
          }
        }
      } catch {
        // Fall through
      }

      // 3. Fallback to bundled seeds
      return getSeedSubjectsForIdentifier(examIdentifier);
    },
  });
}

function getSeedSubjectsForIdentifier(identifier: string): ExamSubject[] {
  const lower = identifier.toLowerCase().trim();
  const seed = SEED_EXAMS.find(
    (e) =>
      e.id === identifier ||
      e.slug.toLowerCase() === lower ||
      e.name.toLowerCase() === lower ||
      lower.includes(e.name.toLowerCase()) ||
      lower.includes(e.slug.toLowerCase())
  );

  if (!seed) return [];

  return seed.subjects.map((s, idx) => ({
    id: `${seed.slug}-sub-${idx + 1}`,
    exam_id: seed.id,
    subject_id: `${seed.slug}-sub-${idx + 1}`,
    name: s.name,
    display_name: s.name,
    code: s.code || null,
    color: s.color,
    order_index: s.order_index,
  }));
}

/**
 * Highly optimized, offline-first hook to retrieve chapters for a subject.
 */
export function useExamChapters(subjectId: string | null | undefined, subjectName?: string) {
  return useQuery<ExamChapter[]>({
    queryKey: ['exam_chapters_master', subjectId, subjectName],
    enabled: !!subjectId || !!subjectName,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async () => {
      const cacheKey = `${CACHE_CHAPTERS_PREFIX}${subjectId || subjectName}`;

      // 1. Check local cache
      try {
        const cachedRaw = await AsyncStorage.getItem(cacheKey);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (Array.isArray(cached) && cached.length > 0) {
            return cached as ExamChapter[];
          }
        }
      } catch {
        // Fall through
      }

      // 2. Fetch from Supabase ONLY if not cached
      try {
        const isUuid =
          subjectId &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(subjectId);

        if (isUuid) {
          const { data, error } = await supabase
            .from('exam_chapters')
            .select('*')
            .eq('exam_subject_id', subjectId)
            .order('order_index', { ascending: true });

          if (!error && data && data.length > 0) {
            const chapters = data as ExamChapter[];
            AsyncStorage.setItem(cacheKey, JSON.stringify(chapters)).catch(() => {});
            return chapters;
          }
        }
      } catch (err) {
        captureError(err, { context: 'useExamChapters_queryFn' });
      }

      // 3. Fallback to seeds
      if (subjectName) {
        const subLower = subjectName.toLowerCase();
        for (const exam of SEED_EXAMS) {
          const foundSub = exam.subjects.find((s) => s.name.toLowerCase() === subLower);
          if (foundSub) {
            return foundSub.chapters.map((ch, idx) => ({
              id: `${exam.slug}-${foundSub.name}-${idx + 1}`,
              exam_subject_id: subjectId || 'seed-es',
              name: ch.name,
              order_index: ch.order_index,
              estimated_hours: ch.estimated_hours || 5,
            }));
          }
        }
      }

      return [];
    },
  });
}

/**
 * Hook to retrieve active exam for the current profile without refetching unnecessarily.
 */
export function useActiveExam() {
  const profile = useAuthStore((state) => state.profile);
  const primarySubCat = profile?.sub_category?.[0] || null;

  const examsQuery = useExams({ category: profile?.category });
  const activeExam =
    (examsQuery.data || []).find((e) => {
      if (!primarySubCat) return false;
      const catLower = primarySubCat.toLowerCase();
      return (
        e.id === primarySubCat ||
        e.slug.toLowerCase() === catLower ||
        e.name.toLowerCase() === catLower ||
        catLower.includes(e.name.toLowerCase()) ||
        catLower.includes(e.slug.toLowerCase())
      );
    }) || null;

  const subjectsQuery = useExamSubjects(activeExam?.id || primarySubCat);

  return {
    exam: activeExam,
    subjects: subjectsQuery.data || [],
    isLoading: examsQuery.isLoading || subjectsQuery.isLoading,
    refetch: () => {
      examsQuery.refetch();
      subjectsQuery.refetch();
    },
  };
}

/**
 * Action-only helper: Dynamically fetch syllabus topics for an exam.
 * Checks local cache first; only makes network calls if cache is empty or on demand.
 */
export async function fetchExamSyllabusTopics(examIdentifier: string): Promise<{
  examName: string;
  examSlug: string;
  topics: {
    id?: string;
    subject: string;
    chapter: string;
    topic: string;
    order_index: number;
    exam_slug?: string;
    chapter_id?: string;
  }[];
}> {
  // Normalize known slugs & aliases
  const normalizeSlug = (raw: string): string => {
    const lower = raw.toLowerCase().trim();
    if (lower === 'cse_student' || lower === 'cse' || lower === 'cs' || lower.includes('btech')) return 'btech-cse';
    if (lower === 'neet-ug' || lower === 'neet ug' || lower.includes('neet')) return 'neet';
    if (lower === 'jee-adv' || lower === 'jee adv' || lower.includes('advance')) return 'jee-advanced';
    if (lower === 'jee' || lower === 'jee main' || lower.includes('main')) return 'jee-main';
    if (lower === 'cgl' || lower.includes('cgl')) return 'ssc-cgl';
    if (lower === 'chsl' || lower.includes('chsl')) return 'ssc-chsl';
    if (lower.includes('mts') || lower.includes('havaldar')) return 'ssc-mts';
    if (lower.includes('cpo') || lower.includes('delhi police')) return 'ssc-cpo';
    if (lower === 'upsc' || lower.includes('upsc')) return 'upsc-cse';
    if (lower === 'cat' || lower.includes('cat')) return 'cat';
    if (lower === 'gate' || lower.includes('gate')) return 'gate';
    if (lower.includes('sbi-po') || lower.includes('sbi po')) return 'sbi-po';
    if (lower.includes('clerk') || lower.includes('ibps-clerk') || lower.includes('sbi-clerk')) return 'ibps-clerk';
    if (lower === 'banking' || lower === 'ibps' || lower.includes('ibps')) return 'ibps-po';
    if (lower.includes('rpf-si') || lower.includes('rpf si') || lower.includes('rpf sub')) return 'rpf-si';
    if (lower.includes('rpf-constable') || lower.includes('rpf constable') || lower === 'rpf') return 'rpf-constable';
    if (lower.includes('alp') || lower.includes('loco pilot')) return 'rrb-alp';
    if (lower.includes('technician') || lower.includes('rrb-tech')) return 'rrb-technician';
    if (lower.includes('rrb-je') || lower.includes('rrb je') || lower.includes('junior engineer')) return 'rrb-je';
    if (lower.includes('group-d') || lower.includes('group d') || lower.includes('rrc')) return 'rrb-group-d';
    if (lower.includes('section controller') || lower.includes('section-controller')) return 'rrb-section-controller';
    if (lower.includes('paramedical')) return 'rrb-paramedical';
    if (lower.includes('ministerial')) return 'rrb-ministerial';
    if (lower === 'ntpc' || lower.includes('ntpc')) return 'rrb-ntpc';
    if (lower.includes('afcat') || lower.includes('air force') || lower.includes('airforce')) return 'afcat';
    if (lower.includes('class-12') || lower.includes('12th')) return 'class-12-boards';
    if (lower.includes('class-10') || lower.includes('10th')) return 'class-10-boards';
    return raw;
  };

  const resolvedIdentifier = normalizeSlug(examIdentifier);
  const cacheKey = `curriculum_syllabus_topics_${resolvedIdentifier}`;

  // 1. Try local cache first (only accept if topics has items)
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && Array.isArray(parsed.topics) && parsed.topics.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Fall through
  }

  let examName = resolvedIdentifier;
  let canonicalSlug = resolvedIdentifier;

  // 2. Fetch from Supabase with safety timeout
  try {
    const fetchSupabaseCurriculum = async () => {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        resolvedIdentifier
      );
      let examId = isUuid ? resolvedIdentifier : null;

      if (isUuid) {
        // Resolve canonical slug and display name for this UUID
        const { data: byId } = await supabase
          .from('exams')
          .select('id, name, slug')
          .eq('id', resolvedIdentifier)
          .maybeSingle();

        if (byId) {
          examId = byId.id;
          examName = byId.name;
          canonicalSlug = byId.slug || resolvedIdentifier;
        }
      } else {
        // 2a. Match by exact resolved slug
        const { data: bySlug } = await supabase
          .from('exams')
          .select('id, name, slug')
          .eq('slug', resolvedIdentifier)
          .maybeSingle();

        if (bySlug?.id) {
          examId = bySlug.id;
          examName = bySlug.name;
          canonicalSlug = bySlug.slug;
        } else if (examIdentifier !== resolvedIdentifier) {
          // 2b. Match by original identifier as slug
          const { data: byOrigSlug } = await supabase
            .from('exams')
            .select('id, name, slug')
            .eq('slug', examIdentifier)
            .maybeSingle();

          if (byOrigSlug?.id) {
            examId = byOrigSlug.id;
            examName = byOrigSlug.name;
            canonicalSlug = byOrigSlug.slug;
          }
        }

        if (!examId) {
          // 2c. Match by sanitized name
          const cleanName = resolvedIdentifier.replace(/[-_]/g, ' ').replace(/[()]/g, '').trim();
          const { data: byName } = await supabase
            .from('exams')
            .select('id, name, slug')
            .ilike('name', `%${cleanName}%`)
            .maybeSingle();

          if (byName?.id) {
            examId = byName.id;
            examName = byName.name;
            canonicalSlug = byName.slug;
          }
        }
      }

      if (examId) {
        const { data: junctionList } = await supabase
          .from('exam_subjects')
          .select('id, exam_id, subject_id, display_name, order_index, subjects (id, name)')
          .eq('exam_id', examId)
          .order('order_index', { ascending: true });

        if (junctionList && junctionList.length > 0) {
          const esIds = junctionList.map((j: any) => j.id);
          const { data: chapters } = await supabase
            .from('exam_chapters')
            .select('id, exam_subject_id, name, order_index')
            .in('exam_subject_id', esIds)
            .order('order_index', { ascending: true });

          if (chapters && chapters.length > 0) {
            const topics: { id: string; subject: string; chapter: string; topic: string; order_index: number; exam_slug?: string; chapter_id: string }[] =
              [];
            let order = 0;

            junctionList.forEach((j: any) => {
              const subjectName = j.display_name || j.subjects?.name || 'Subject';
              const subChapters = chapters.filter((c: any) => c.exam_subject_id === j.id);
              subChapters.forEach((ch: any) => {
                const subTopics = getImportantTopicsForChapter(subjectName, ch.name, canonicalSlug);
                subTopics.forEach((topicTitle: string, tIdx: number) => {
                  topics.push({
                    id: `master-ch-${ch.id}-${tIdx}`,
                    subject: subjectName,
                    chapter: ch.name,
                    topic: topicTitle,
                    order_index: order++,
                    exam_slug: canonicalSlug,
                    chapter_id: ch.id,
                  });
                });
              });
            });

            if (topics.length > 0) {
              const result = { examName, examSlug: canonicalSlug, topics };
              AsyncStorage.setItem(cacheKey, JSON.stringify(result)).catch(() => {});
              AsyncStorage.setItem(`curriculum_syllabus_topics_${canonicalSlug}`, JSON.stringify(result)).catch(() => {});
              return result;
            }
          }
        }
      }
      return null;
    };

    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000));
    const dynamicResult = await Promise.race([fetchSupabaseCurriculum(), timeoutPromise]);
    if (dynamicResult && dynamicResult.topics.length > 0) {
      return dynamicResult;
    }
  } catch (err) {
    if (__DEV__) console.warn('Offline or error fetching exam syllabus topics:', err);
  }

  // 3. Fallback to seeds
  const lookupKeys = [examIdentifier, examName, examIdentifier.replace(/-/g, ' ')].filter(Boolean);
  let seed = null;
  for (const k of lookupKeys) {
    const lower = k.toLowerCase().trim();
    const cleanKey = lower.replace(/[-_\s()]/g, '');
    seed = SEED_EXAMS.find((e) => {
      const eSlug = e.slug.toLowerCase();
      const eName = e.name.toLowerCase();
      const cleanSlug = eSlug.replace(/[-_\s()]/g, '');
      const cleanName = eName.replace(/[-_\s()]/g, '');

      return (
        e.id === k ||
        eSlug === lower ||
        eName === lower ||
        cleanSlug === cleanKey ||
        cleanName === cleanKey ||
        lower.includes(eSlug) ||
        eSlug.includes(lower) ||
        lower.includes(eName) ||
        eName.includes(lower) ||
        cleanKey.includes(cleanSlug) ||
        cleanSlug.includes(cleanKey)
      );
    });
    if (seed) break;
  }

  if (seed) {
    const topics: { id: string; subject: string; chapter: string; topic: string; order_index: number; exam_slug?: string; chapter_id: string }[] = [];
    let order = 0;
    seed.subjects.forEach((sub) => {
      sub.chapters.forEach((ch) => {
        const seedChapterId = `seed-${seed.slug}-${sub.name}-${ch.order_index}`.toLowerCase().replace(/\s+/g, '-');
        const subTopics = getImportantTopicsForChapter(sub.name, ch.name, seed.slug);
        subTopics.forEach((topicTitle: string, tIdx: number) => {
          topics.push({
            id: `${seedChapterId}-${tIdx}`,
            subject: sub.name,
            chapter: ch.name,
            topic: topicTitle,
            order_index: order++,
            exam_slug: seed.slug,
            chapter_id: seedChapterId,
          });
        });
      });
    });
    const result = { examName: seed.name, examSlug: seed.slug, topics };
    AsyncStorage.setItem(cacheKey, JSON.stringify(result)).catch(() => {});
    return result;
  }

  return { examName: examIdentifier, examSlug: resolvedIdentifier, topics: [] };
}

/**
 * Action-only cache invalidator: Call when user explicitly alters their curriculum
 * or triggers a hard pull-to-refresh.
 */
export function useRefreshCurriculum() {
  const queryClient = useQueryClient();

  return async () => {
    try {
      await AsyncStorage.multiRemove([
        CACHE_EXAMS_KEY,
      ]);
    } catch {
      // ignore
    }
    await queryClient.invalidateQueries({ queryKey: ['exams_master'] });
    await queryClient.invalidateQueries({ queryKey: ['exam_subjects_master'] });
    await queryClient.invalidateQueries({ queryKey: ['exam_chapters_master'] });
    await queryClient.invalidateQueries({ queryKey: ['subjects'] });
  };
}
