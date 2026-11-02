import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SectionList,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Keyboard,
  Platform,
  StatusBar,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { tabScrollRefs } from '@/lib/utils/tab-scroll';
import { useAuthStore } from '@/lib/store/auth.store';
import { getSubjectColor } from '@/lib/utils/subject-colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAndroidBackHandler } from '@/lib/hooks/use-android-back';
import BottomSheet, {
  BottomSheetView,
  BottomSheetTextInput,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import {
  Plus,
  BookOpen,
  CheckCircle,
  RotateCw,
  Award,
  ChevronRight,
  ChevronDown,
  Target,
  X,
  Check,
  Trash2,
  AlertTriangle,
  Search,
  Globe,
  Code2,
  Shield,
  Train,
  Landmark,
  HeartPulse,
  Zap,
  TrendingUp,
  GraduationCap,
  Layers,
  Cpu,
  Server,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// Custom Hooks
import {
  useSyllabus,
  useUpdateTopicStatus,
  useBulkUpdateTopics,
  useCreateTopic,
  useSetupSyllabus,
  useUserExamEnrollments,
  useRemoveExamEnrollment,
  GroupedSyllabus,
  GroupedSubject,
} from '@/lib/hooks/use-syllabus';
import { useUiStore } from '@/lib/store/ui.store';
import { SyllabusStatus } from '@/types/app.types';
import { supabase } from '@/lib/supabase/client';

// Custom Components
import { ChapterRow } from '@/components/learn/ChapterRow';
import { Skeleton } from '@/components/shared/Skeleton';

// Syllabus Templates
import { SYLLABUS_TEMPLATES, getTemplateForExam } from '@/lib/utils/syllabus-templates';
import { CSE_SYLLABUS } from '@/lib/utils/cse-syllabus-templates';
import { useExams, fetchExamSyllabusTopics } from '@/lib/hooks/use-exams';

const ADD_TOPIC_SNAP_POINTS = ['55%'];

const isComputerScienceSubject = (subName: string): boolean => {
  const s = subName.toLowerCase();
  return [
    'data structure', 'algorithm', 'dsa', 'operating system', 'dbms', 'database',
    'computer network', 'network', 'software engineering', 'programming', 'java',
    'python', 'c++', 'compiler', 'theory of computation', 'toc', 'coa', 'computer organization',
    'system design', 'web development', 'frontend', 'backend', 'full stack', 'cloud', 'devops',
    'interview prep', 'discrete math', 'machine learning', 'artificial intelligence', 'oops'
  ].some((k) => s.includes(k));
};

const renderExamIcon = (slugOrName: string = '', size: number = 18, color: string = '#5B4FE8') => {
  const s = slugOrName.toLowerCase();
  if (s.includes('btech') || s.includes('cse') || s.includes('computer')) return <Code2 size={size} color={color} />;
  if (s.includes('rpf') || s.includes('police') || s.includes('cpo')) return <Shield size={size} color={color} />;
  if (s.includes('rrb') || s.includes('railway') || s.includes('ntpc') || s.includes('alp') || s.includes('technician') || s.includes('je') || s.includes('group-d') || s.includes('group d') || s.includes('section controller')) return <Train size={size} color={color} />;
  if (s.includes('ssc') || s.includes('cgl') || s.includes('chsl') || s.includes('mts')) return <Landmark size={size} color={color} />;
  if (s.includes('neet') || s.includes('medical') || s.includes('aiims') || s.includes('paramedical')) return <HeartPulse size={size} color={color} />;
  if (s.includes('jee') || s.includes('engineering') || s.includes('iit')) return <Zap size={size} color={color} />;
  if (s.includes('upsc') || s.includes('ias') || s.includes('ips') || s.includes('civil') || s.includes('pcs')) return <Award size={size} color={color} />;
  if (s.includes('gate')) return <Target size={size} color={color} />;
  if (s.includes('cat') || s.includes('mba') || s.includes('mat')) return <TrendingUp size={size} color={color} />;
  if (s.includes('bank') || s.includes('ibps') || s.includes('sbi') || s.includes('po') || s.includes('clerk')) return <Landmark size={size} color={color} />;
  if (s.includes('defence') || s.includes('nda') || s.includes('cds') || s.includes('afcat')) return <Shield size={size} color={color} />;
  if (s.includes('board') || s.includes('12') || s.includes('10') || s.includes('cbse') || s.includes('icse')) return <GraduationCap size={size} color={color} />;
  if (s === 'all') return <Globe size={size} color={color} />;
  return <Target size={size} color={color} />;
};

const getExamIcon = (_slugOrName: string = ''): string => {
  return '';
};

export default function SyllabusScreen(): React.JSX.Element {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeExamFilter, setActiveExamFilter] = useState<string>('all');
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [examToDelete, setExamToDelete] = useState<{ id?: string; slug?: string; name: string } | null>(null);
  const [isAddTopicOpen, setIsAddTopicOpen] = useState(false);

  // CSE Syllabus setup states
  const [isAddingSyllabus, setIsAddingSyllabus] = useState(false);
  const [addingGoal, setAddingGoal] = useState('');
  const [addingProgress, setAddingProgress] = useState(0);
  const [addingTotal, setAddingTotal] = useState(0);
  const [showCseManualChecklist, setShowCseManualChecklist] = useState(false);
  const [selectedCseCategories, setSelectedCseCategories] = useState<string[]>([]);

  // Multi-select state for bulk syllabus actions
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

  // Expanded card tracking
  const [expandedSubjects, setExpandedSubjects] = useState<string[]>([]);
  const [expandedChapters, setExpandedChapters] = useState<string[]>([]);

  // Refs
  const addTopicSheetRef = useRef<BottomSheet>(null);
  const syllabusListRef = useRef<any>(null);
  const sectionsRef = useRef<any[]>([]);

  useAndroidBackHandler(() => {
    if (examToDelete) {
      setExamToDelete(null);
      return true;
    }
    if (isGoalModalOpen) {
      setIsGoalModalOpen(false);
      return true;
    }
    if (isAddTopicOpen) {
      setIsAddTopicOpen(false);
      return true;
    }
    if (isMultiSelectMode) {
      setIsMultiSelectMode(false);
      setSelectedTopicIds([]);
      return true;
    }
    return false;
  });

  // Tab scroll registration for header/bottom-tab tap to top
  useEffect(() => {
    tabScrollRefs['learn'] = {
      current: {
        scrollTo: () => {
          try {
            if (
              sectionsRef.current &&
              sectionsRef.current.length > 0 &&
              sectionsRef.current[0]?.data &&
              sectionsRef.current[0]?.data.length > 0
            ) {
              syllabusListRef.current?.scrollToLocation({
                sectionIndex: 0,
                itemIndex: 0,
                animated: true,
                viewPosition: 0,
              });
            } else {
              syllabusListRef.current?.scrollToOffset({ offset: 0, animated: true });
            }
          } catch {
            // Guard against SectionList unmounted / out-of-range errors
          }
        },
      },
    } as any;
    return () => {
      delete tabScrollRefs['learn'];
    };
  }, []);

  // Add Topic Sheet Form State
  const [newSubject, setNewSubject] = useState('');
  const [newChapter, setNewChapter] = useState('');
  const [newTopic, setNewTopic] = useState('');

  // Queries & Mutations
  const syllabusQuery = useSyllabus();
  const updateTopicStatusMutation = useUpdateTopicStatus();
  const bulkUpdateTopicsMutation = useBulkUpdateTopics();
  const createTopicMutation = useCreateTopic();
  const setupSyllabusMutation = useSetupSyllabus();
  const removeExamMutation = useRemoveExamEnrollment();

  const { profile } = useAuthStore();
  const userCategory = profile?.category || '';
  const userSubCategory = profile?.sub_category || [];

  const examsQuery = useExams({ category: userCategory || 'student' });
  const studentExams = examsQuery.data || [];
  const enrollmentsQuery = useUserExamEnrollments();

  // Remove / unenroll exam syllabus handler
  const handleConfirmDeleteExam = useCallback(async () => {
    if (!examToDelete) return;
    const toDelete = examToDelete;
    try {
      await removeExamMutation.mutateAsync({
        examSlug: toDelete.slug,
        examId: toDelete.id,
        examName: toDelete.name,
      });

      const delSlug = (toDelete.slug || '').toLowerCase();
      const delId = (toDelete.id || '').toLowerCase();
      const delName = (toDelete.name || '').toLowerCase();
      const currentActive = activeExamFilter.toLowerCase();
      if (currentActive === delSlug || currentActive === delId || currentActive === delName) {
        setActiveExamFilter('all');
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      useUiStore.getState().showToast('Syllabus removed successfully', 'info');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to remove syllabus. Please try again.');
    } finally {
      setExamToDelete(null);
    }
  }, [examToDelete, removeExamMutation, activeExamFilter]);

  // Pull to refresh handler
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await syllabusQuery.refetch();
    setIsRefreshing(false);
  }, [syllabusQuery]);

  // Toggle subject accordion expand/collapse
  const toggleSubjectExpanded = useCallback((subject: string) => {
    setExpandedSubjects((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]
    );
  }, []);

  // Toggle chapter accordion expand/collapse
  const toggleChapterExpanded = useCallback((chapterKey: string) => {
    setExpandedChapters((prev) =>
      prev.includes(chapterKey) ? prev.filter((c) => c !== chapterKey) : [...prev, chapterKey]
    );
  }, []);

  // Syllabus Status select
  const handleTopicStatusChange = useCallback(
    (topicId: string, newStatus: SyllabusStatus) => {
      updateTopicStatusMutation.mutate({ topicId, newStatus });
    },
    [updateTopicStatusMutation]
  );

  // Multi-select toggles
  const handleToggleSelectTopic = useCallback((topicId: string) => {
    setSelectedTopicIds((prev) => {
      const isSelected = prev.includes(topicId);
      const nextList = isSelected ? prev.filter((id) => id !== topicId) : [...prev, topicId];
      if (nextList.length === 0) {
        setIsMultiSelectMode(false);
      }
      return nextList;
    });
  }, []);

  const handleLongPressTopic = useCallback(
    (topicId: string) => {
      if (!isMultiSelectMode) {
        setIsMultiSelectMode(true);
        setSelectedTopicIds([topicId]);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
    },
    [isMultiSelectMode]
  );

  const handleCancelMultiSelect = useCallback(() => {
    setSelectedTopicIds([]);
    setIsMultiSelectMode(false);
  }, []);

  const handleBulkStatusUpdate = useCallback(
    async (status: SyllabusStatus) => {
      if (selectedTopicIds.length === 0) return;
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      bulkUpdateTopicsMutation.mutate(
        { topicIds: selectedTopicIds, newStatus: status },
        {
          onSuccess: () => {
            handleCancelMultiSelect();
          },
        }
      );
    },
    [selectedTopicIds, bulkUpdateTopicsMutation, handleCancelMultiSelect]
  );

  // Add Syllabus Topic
  const handleOpenAddTopic = useCallback(() => {
    setNewSubject('');
    setNewChapter('');
    setNewTopic('');
    setIsAddTopicOpen(true);
  }, []);

  const handleAddTopicSubmit = useCallback(() => {
    if (!newSubject.trim() || !newChapter.trim() || !newTopic.trim()) {
      Alert.alert('Missing fields', 'Please enter subject, chapter, and topic details.');
      return;
    }

    createTopicMutation.mutate(
      {
        subject: newSubject.trim(),
        chapter: newChapter.trim(),
        topic: newTopic.trim(),
      },
      {
        onSuccess: () => {
          setIsAddTopicOpen(false);
          addTopicSheetRef.current?.close();
          Keyboard.dismiss();
          const subName = newSubject.trim();
          if (!expandedSubjects.includes(subName)) {
            setExpandedSubjects((prev) => [...prev, subName]);
          }
        },
      }
    );
  }, [newSubject, newChapter, newTopic, createTopicMutation, expandedSubjects]);

  // Local Search Filters
  const filteredSyllabus = useMemo((): GroupedSyllabus => {
    const data = syllabusQuery.data;
    if (!data) return {};
    if (!searchQuery.trim()) return data;

    const query = searchQuery.trim().toLowerCase();
    const result: GroupedSyllabus = {};

    Object.keys(data).forEach((subName) => {
      const subject = data[subName];
      const matchChapters: typeof subject.chapters = {};
      let matchCount = 0;

      Object.keys(subject.chapters).forEach((chapName) => {
        const list = subject.chapters[chapName];
        const filteredList = list.filter(
          (t) =>
            t.topic.toLowerCase().includes(query) ||
            t.chapter.toLowerCase().includes(query) ||
            t.subject.toLowerCase().includes(query)
        );

        if (filteredList.length > 0) {
          matchChapters[chapName] = filteredList;
          matchCount += filteredList.length;
        }
      });

      if (matchCount > 0) {
        result[subName] = {
          ...subject,
          chapters: matchChapters,
        };
      }
    });

    return result;
  }, [syllabusQuery.data, searchQuery]);

  const [loadingExamKey, setLoadingExamKey] = useState<string | null>(null);

  const handleLoadSyllabusTemplate = useCallback(
    async (key: string) => {
      try {
        setLoadingExamKey(key);
        let templateName = key;
        let examSlug = key;
        let topics: { subject: string; chapter: string; topic: string; order_index: number; exam_slug?: string }[] = [];

        // 1. Dynamically fetch from live database / exam curriculum
        const dynamicExam = await fetchExamSyllabusTopics(key);
        if (dynamicExam && dynamicExam.topics.length > 0) {
          templateName = dynamicExam.examName;
          examSlug = dynamicExam.examSlug || key;
          topics = dynamicExam.topics.map((t) => ({
            ...t,
            exam_slug: t.exam_slug || examSlug,
          }));
        }

        // 2. Fallback to templates & seeds
        if (topics.length === 0) {
          const template =
            getTemplateForExam(key) ||
            getTemplateForExam(key.replace(/-/g, ' ')) ||
            SYLLABUS_TEMPLATES[key.toUpperCase().replace(/[- ]/g, '_')];
          if (template && template.topics.length > 0) {
            templateName = template.name;
            topics = template.topics.map((t) => ({
              ...t,
              exam_slug: examSlug || key,
            }));
          }
        }

        if (!topics || topics.length === 0) {
          Alert.alert('No syllabus found', `Could not find syllabus topics for ${key}.`);
          return;
        }

        // 3. Directly load syllabus into DB & update state
        await setupSyllabusMutation.mutateAsync(topics);
        setActiveExamFilter(examSlug || 'all');
        Alert.alert('Success', `${templateName} syllabus loaded successfully!`);
      } catch (err: any) {
        if (__DEV__) {
          console.error('Syllabus template error:', err);
        }
        Alert.alert('Error', err?.message || 'Failed to load template topics.');
      } finally {
        setLoadingExamKey(null);
      }
    },
    [setupSyllabusMutation]
  );

  const handleLoadCseSyllabus = useCallback(
    async (categoriesToLoad: string[], goalLabel: string) => {
      if (categoriesToLoad.length === 0) {
        Alert.alert('No subjects selected', 'Please select at least one subject to load.');
        return;
      }

      let totalTopicsCount = 0;
      categoriesToLoad.forEach((cat) => {
        const categoryObj = CSE_SYLLABUS[cat];
        if (categoryObj && categoryObj.subjects) {
          Object.values(categoryObj.subjects).forEach((sub) => {
            totalTopicsCount += sub.topics.length;
          });
        }
      });

      Alert.alert(
        'Set Up CSE Syllabus',
        `Loading ${totalTopicsCount} topics for ${goalLabel}...`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Load Roadmap',
            onPress: async () => {
              setIsAddingSyllabus(true);
              setAddingGoal(goalLabel);
              setAddingTotal(totalTopicsCount);
              setAddingProgress(0);

              const {
                data: { session },
              } = await supabase.auth.getSession();
              if (!session) {
                setIsAddingSyllabus(false);
                Alert.alert('Authentication Error', 'Not authenticated.');
                return;
              }

              const interval = setInterval(() => {
                setAddingProgress((prev) => {
                  if (prev >= totalTopicsCount - 10) {
                    clearInterval(interval);
                    return prev;
                  }
                  return prev + Math.max(15, Math.ceil((totalTopicsCount - prev) * 0.15));
                });
              }, 80);

              try {
                const allTopics: any[] = [];
                let orderIdx = 0;

                categoriesToLoad.forEach((cat) => {
                  const categoryObj = CSE_SYLLABUS[cat];
                  if (categoryObj && categoryObj.subjects) {
                    Object.keys(categoryObj.subjects).forEach((subName) => {
                      const subjectObj = categoryObj.subjects[subName];
                      subjectObj.topics.forEach((topicName) => {
                        allTopics.push({
                          user_id: session.user.id,
                          subject: cat,
                          chapter: subName,
                          topic: topicName,
                          status: 'not_started',
                          order_index: orderIdx++,
                        });
                      });
                    });
                  }
                });

                const { error } = await supabase.from('syllabus_topics').insert(allTopics);
                if (error) throw error;

                clearInterval(interval);
                setAddingProgress(totalTopicsCount);

                setTimeout(() => {
                  setIsAddingSyllabus(false);
                  syllabusQuery.refetch();
                  setShowCseManualChecklist(false);
                  Alert.alert('Success', `Roadmap loaded successfully! Added ${totalTopicsCount} topics.`);
                }, 500);
              } catch (err) {
                clearInterval(interval);
                setIsAddingSyllabus(false);
                if (__DEV__) {
                  console.error('Failed to load CSE syllabus:', err);
                }
                Alert.alert('Error', 'Failed to load CSE syllabus topics. Please try again.');
              }
            },
          },
        ]
      );
    },
    [syllabusQuery]
  );

  const getCategoryTopicCount = (categoryName: string): number => {
    const categoryObj = CSE_SYLLABUS[categoryName];
    if (!categoryObj || !categoryObj.subjects) return 0;
    let count = 0;
    Object.values(categoryObj.subjects).forEach((sub) => {
      count += sub.topics.length;
    });
    return count;
  };

  const handleToggleCseCategory = (cat: string) => {
    setSelectedCseCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const renderCseSetupScreen = () => {
    if (isAddingSyllabus) {
      const progressPercent = addingTotal > 0 ? Math.round((addingProgress / addingTotal) * 100) : 0;
      return (
        <View style={styles.cseProgressOverlay}>
          <Text style={styles.cseProgressTitle}>Loading CSE Roadmap</Text>
          <Text style={styles.cseProgressSubtitle}>
            Loading {addingTotal} topics for {addingGoal}...
          </Text>
          <View style={styles.cseProgressBarOuter}>
            <View style={[styles.cseProgressBarInner, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={[styles.cseProgressSubtitle, { marginTop: 12 }]}>
            Adding topics... ({addingProgress} / {addingTotal})
          </Text>
        </View>
      );
    }

    if (showCseManualChecklist) {
      let manualTotalTopics = 0;
      selectedCseCategories.forEach((cat) => {
        manualTotalTopics += getCategoryTopicCount(cat);
      });

      return (
        <View style={styles.cseChecklistContainer}>
          <Text style={styles.cseChecklistTitle}>Select Subjects Manually</Text>
          {Object.keys(CSE_SYLLABUS).map((cat) => {
            const isChecked = selectedCseCategories.includes(cat);
            const topicCount = getCategoryTopicCount(cat);
            return (
              <TouchableOpacity
                key={cat}
                style={styles.cseChecklistItem}
                onPress={() => handleToggleCseCategory(cat)}
                activeOpacity={0.7}
              >
                <View style={[styles.cseCheckbox, isChecked && styles.cseCheckboxChecked]}>
                  {isChecked && <Check size={12} color="#FFFFFF" strokeWidth={2.5} />}
                </View>
                <Text style={styles.cseChecklistItemText}>
                  {cat} ({topicCount} topics)
                </Text>
              </TouchableOpacity>
            );
          })}

          <View style={styles.cseChecklistButtons}>
            <TouchableOpacity
              style={styles.cseChecklistBtnBack}
              onPress={() => setShowCseManualChecklist(false)}
            >
              <Text style={styles.cseChecklistBtnBackText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.cseChecklistBtnSubmit,
                selectedCseCategories.length === 0 && styles.cseChecklistBtnSubmitDisabled,
              ]}
              onPress={() => handleLoadCseSyllabus(selectedCseCategories, 'Custom Roadmap')}
              disabled={selectedCseCategories.length === 0}
            >
              <Text style={styles.cseChecklistBtnSubmitText}>
                Load Selected ({manualTotalTopics} topics)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    const cseRoadmaps = [
      {
        key: 'amazon_google',
        title: 'Crack Amazon/Google',
        icon: <Award size={20} color="#5B4FE8" />,
        categories: [
          'Data Structures & Algorithms',
          'System Design',
          'Object Oriented Design (OOD)',
          'Interview Preparation',
        ],
        displaySubjects: 'DSA • System Design • Java/OOD • Interview Prep',
        description: 'Best for FAANG / product company placement preparation.',
        topicCount: 427,
        subjectCount: 4,
      },
      {
        key: 'backend',
        title: 'Backend Developer',
        icon: <Server size={20} color="#5B4FE8" />,
        categories: ['Data Structures & Algorithms', 'Backend Development', 'Cloud & DevOps'],
        displaySubjects: 'DSA • Backend Dev • Databases • Cloud & DevOps',
        description: 'Focuses on databases, server architectures, and DevOps.',
        topicCount: 313,
        subjectCount: 3,
      },
      {
        key: 'fullstack',
        title: 'Full Stack Dev',
        icon: <Layers size={20} color="#5B4FE8" />,
        categories: ['Data Structures & Algorithms', 'Web Development', 'Backend Development'],
        displaySubjects: 'DSA • Web Dev • Backend Dev • Databases',
        description: 'Covers frontend, backend, and database structures.',
        topicCount: 312,
        subjectCount: 3,
      },
      {
        key: 'all',
        title: 'All Subjects (Complete)',
        icon: <GraduationCap size={20} color="#5B4FE8" />,
        categories: Object.keys(CSE_SYLLABUS),
        displaySubjects: 'All 9 CSE Syllabus Categories',
        description: 'Includes complete computer science subjects & roadmap.',
        topicCount: 753,
        subjectCount: 9,
      },
    ];

    return (
      <>
        <Text style={styles.setupWelcomeTitle}>Set up your CS roadmap</Text>
        <Text style={styles.setupWelcomeSubtitle}>Choose your goal:</Text>

        <View style={styles.cseRoadmapGrid}>
          {cseRoadmaps.map((map) => {
            const daysToComplete = Math.ceil(map.topicCount / 5);
            return (
              <TouchableOpacity
                key={map.key}
                style={styles.cseCard}
                onPress={() => handleLoadCseSyllabus(map.categories, map.title)}
                activeOpacity={0.85}
              >
                <View style={styles.cseCardHeader}>
                  {map.icon}
                  <Text style={styles.cseCardTitle}>{map.title}</Text>
                </View>
                <Text style={styles.cseCardSubjects}>{map.displaySubjects}</Text>
                <Text style={styles.cseCardDesc}>{map.description}</Text>
                <View style={styles.cseCardStats}>
                  <Text style={styles.cseStatText}>{map.subjectCount} subjects</Text>
                  <Text style={styles.cseStatText}>{map.topicCount} topics</Text>
                  <Text style={styles.cseStatText}>~{daysToComplete} days (@ 5/day)</Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Manual Entry */}
          <TouchableOpacity
            style={[styles.templateCard, styles.customSetupCard, { marginTop: 8 }]}
            onPress={() => {
              setSelectedCseCategories([]);
              setShowCseManualChecklist(true);
            }}
            activeOpacity={0.85}
          >
            <Plus size={20} color="#5B4FE8" style={styles.customSetupIcon} />
            <Text style={styles.customSetupTitle}>Pick subjects manually</Text>
            <Text style={styles.customSetupDesc}>
              Select specific computer science subjects to add to your roadmap.
            </Text>
          </TouchableOpacity>
        </View>
      </>
    );
  };

  const userSelectedExams = useMemo(() => {
    const rawSubCats = (profile?.sub_category || []).filter((s) => s !== 'cse_student');

    (enrollmentsQuery.data || []).forEach((e) => {
      if (e.exam_slug && !rawSubCats.includes(e.exam_slug)) {
        rawSubCats.push(e.exam_slug);
      }
    });

    const syllabusData = syllabusQuery.data || {};
    Object.keys(syllabusData).forEach((key) => {
      const slugs = syllabusData[key]?.examSlugs || [];
      slugs.forEach((slug) => {
        if (slug && !rawSubCats.includes(slug)) {
          rawSubCats.push(slug);
        }
      });
    });

    if (rawSubCats.length === 0 && profile?.category === 'cse_student') {
      rawSubCats.push('btech-cse');
    }
    if (rawSubCats.length === 0) return [];

    const seen = new Set<string>();
    const uniqueSubCats: string[] = [];
    for (const s of rawSubCats) {
      const lower = s.toLowerCase().trim();
      const normKey = lower === 'cse' || lower.includes('btech') ? 'btech-cse' : lower;
      if (!seen.has(normKey)) {
        seen.add(normKey);
        uniqueSubCats.push(s);
      }
    }

    return uniqueSubCats.map((subCat) => {
      const subLower = subCat.toLowerCase().trim();
      const matched = studentExams.find(
        (e) =>
          e.slug.toLowerCase() === subLower ||
          e.id === subCat ||
          e.name.toLowerCase() === subLower ||
          ((subLower.includes('btech') || subLower === 'cse') && e.slug === 'btech-cse')
      );
      if (matched) return matched;
      const displayName = subCat.replace(/^cse_student$/i, 'B.Tech CSE').replace(/[-_]/g, ' ').toUpperCase();
      return { id: subCat, slug: subCat, name: displayName, short_name: displayName, color: '#5B4FE8' };
    });
  }, [profile?.sub_category, profile?.category, studentExams, enrollmentsQuery.data, syllabusQuery.data]);

  const getExamsForSubjectGroup = useCallback(
    (subjectName: string, groupedSub: GroupedSubject) => {
      const slugs = (groupedSub.examSlugs || []).map((s) => s.toLowerCase());
      if (slugs.length > 0) {
        const matches = userSelectedExams.filter((e) => {
          const eSlug = (e.slug || '').toLowerCase();
          const eId = (e.id || '').toLowerCase();
          return (
            slugs.includes(eSlug) ||
            slugs.includes(eId) ||
            ((eSlug === 'btech-cse' || eId === 'btech-cse') && slugs.includes('btech-cse'))
          );
        });
        if (matches.length > 0) return matches;
      }

      const subLower = (groupedSub.subject || subjectName).toLowerCase();
      const matched: typeof userSelectedExams = [];
      for (const exam of userSelectedExams) {
        const slug = (exam.slug || '').toLowerCase();
        const name = (exam.name || '').toLowerCase();

        if (slug.includes('neet') || name.includes('neet')) {
          if (['bio', 'botan', 'zool', 'phys', 'chem'].some((k) => subLower.includes(k))) {
            matched.push(exam);
          }
        } else if (slug.includes('jee') || name.includes('jee')) {
          if (['math', 'phys', 'chem'].some((k) => subLower.includes(k))) {
            matched.push(exam);
          }
        } else if (
          slug.includes('cse') ||
          slug.includes('btech') ||
          slug.includes('gate') ||
          name.includes('cse') ||
          name.includes('gate')
        ) {
          if (
            isComputerScienceSubject(subLower) ||
            ['algorithm', 'data structure', 'operating system', 'dbms', 'network', 'discrete', 'theory of computation', 'compiler'].some((k) =>
              subLower.includes(k)
            )
          ) {
            matched.push(exam);
          }
        } else if (slug.includes('upsc') || slug.includes('pcs') || name.includes('upsc') || name.includes('pcs')) {
          if (
            ['general studies', 'gs', 'ethics', 'csat', 'polity', 'history', 'geography', 'economy', 'current affairs', 'environment'].some((k) =>
              subLower.includes(k)
            )
          ) {
            matched.push(exam);
          }
        } else if (slug.includes('ssc') || name.includes('ssc') || slug.includes('cgl') || slug.includes('chsl') || slug.includes('mts') || slug.includes('cpo')) {
          if (['quant', 'arithmetic', 'reason', 'english', 'general awareness', 'gk', 'numerical', 'comprehension'].some((k) => subLower.includes(k))) {
            matched.push(exam);
          }
        } else if (
          slug.includes('rrb') ||
          slug.includes('rpf') ||
          name.includes('railway') ||
          name.includes('rrb') ||
          name.includes('rpf') ||
          slug.includes('alp') ||
          slug.includes('group-d')
        ) {
          if (['math', 'arithmetic', 'reason', 'general science', 'general awareness', 'technical', 'traffic', 'operating', 'physics', 'engineering'].some((k) => subLower.includes(k))) {
            matched.push(exam);
          }
        } else if (slug.includes('cat') || name.includes('cat') || slug.includes('mba') || name.includes('iim')) {
          if (['quant', 'qa', 'data interpretation', 'dilr', 'logical reasoning', 'verbal', 'varc', 'reading comprehension'].some((k) => subLower.includes(k))) {
            matched.push(exam);
          }
        } else if (slug.includes('ibps') || slug.includes('bank') || name.includes('ibps') || name.includes('bank') || slug.includes('po') || slug.includes('sbi') || slug.includes('clerk')) {
          if (['reason', 'quant', 'english', 'banking', 'financial awareness', 'computer aptitude', 'numerical', 'data analysis'].some((k) => subLower.includes(k))) {
            matched.push(exam);
          }
        } else if (slug.includes('clat') || name.includes('clat') || slug.includes('law')) {
          if (['legal', 'reason', 'english', 'current affairs', 'quant'].some((k) => subLower.includes(k))) {
            matched.push(exam);
          }
        } else if (slug.includes('ca-') || slug.includes('cs-') || name.includes('ca foundation') || name.includes('cs foundation')) {
          if (['account', 'law', 'mercantile', 'economics', 'statistics', 'mathematics', 'business'].some((k) => subLower.includes(k))) {
            matched.push(exam);
          }
        } else if (slug.includes('nda') || slug.includes('cds') || slug.includes('afcat') || name.includes('nda') || name.includes('cds') || name.includes('air force')) {
          if (['math', 'general ability', 'english', 'general knowledge', 'physics', 'military', 'verbal'].some((k) => subLower.includes(k))) {
            matched.push(exam);
          }
        } else if (slug.includes('board') || slug.includes('class-12') || slug.includes('class-10') || name.includes('board')) {
          if (['phys', 'chem', 'math', 'bio', 'english', 'hindi', 'social science', 'science', 'history', 'geography'].some((k) => subLower.includes(k))) {
            matched.push(exam);
          }
        }
      }
      return matched;
    },
    [userSelectedExams]
  );

  const overallMetrics = useMemo(() => {
    let total = 0;
    let completed = 0;
    const data = syllabusQuery.data || {};
    Object.keys(data).forEach((subName) => {
      const subject = data[subName];
      Object.keys(subject.chapters).forEach((chapName) => {
        const topics = subject.chapters[chapName];
        total += topics.length;
        completed += topics.filter((t) => t.status === 'done').length;
      });
    });

    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percent };
  }, [syllabusQuery.data]);

  const examMetrics = useMemo(() => {
    const data = syllabusQuery.data || {};
    return userSelectedExams.map((exam) => {
      let total = 0;
      let completed = 0;
      const slug = (exam.slug || '').toLowerCase();

      Object.keys(data).forEach((subName) => {
        const sub = data[subName];
        const examsForSub = getExamsForSubjectGroup(subName, sub);
        const isApplicable = examsForSub.some(
          (e) => (e.slug || '').toLowerCase() === slug || (e.id || '').toLowerCase() === (exam.id || '').toLowerCase()
        );

        if (isApplicable) {
          Object.keys(sub.chapters).forEach((chap) => {
            const topics = sub.chapters[chap];
            total += topics.length;
            completed += topics.filter((t) => t.status === 'done').length;
          });
        }
      });

      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
      return { exam, total, completed, percent };
    });
  }, [syllabusQuery.data, userSelectedExams, getExamsForSubjectGroup]);

  // Auto-select user's primary target exam on mount
  const hasAutoSelectedExamRef = useRef(false);
  useEffect(() => {
    if (!hasAutoSelectedExamRef.current && userSelectedExams.length > 0) {
      const primarySlug = userSelectedExams[0].slug || userSelectedExams[0].id;
      if (primarySlug) {
        setActiveExamFilter(primarySlug);
        hasAutoSelectedExamRef.current = true;
      }
    }
  }, [userSelectedExams]);

  const activeExamObj = useMemo(() => {
    if (activeExamFilter === 'all') return null;
    return (
      userSelectedExams.find(
        (e) =>
          (e.slug || '').toLowerCase() === activeExamFilter.toLowerCase() ||
          (e.id || '').toLowerCase() === activeExamFilter.toLowerCase() ||
          (e.name || '').toLowerCase() === activeExamFilter.toLowerCase()
      ) || null
    );
  }, [activeExamFilter, userSelectedExams]);

  const activeGoalMetrics = useMemo(() => {
    if (!activeExamObj) {
      return overallMetrics;
    }
    const match = examMetrics.find(
      (m) =>
        (m.exam.slug || '').toLowerCase() === (activeExamObj.slug || '').toLowerCase() ||
        m.exam.id === activeExamObj.id ||
        m.exam.name.toLowerCase() === activeExamObj.name.toLowerCase()
    );
    return match
      ? { total: match.total, completed: match.completed, percent: match.percent }
      : { total: 0, completed: 0, percent: 0 };
  }, [activeExamObj, overallMetrics, examMetrics]);

  const activeGoalColor = activeExamObj?.color || '#5B4FE8';

  const sections = useMemo(() => {
    const allSubjectNames = Object.keys(filteredSyllabus);

    const activeSubjects = allSubjectNames.filter((subjectName) => {
      if (activeExamFilter === 'all') return true;

      const groupedSub = filteredSyllabus[subjectName];
      const matchedExams = getExamsForSubjectGroup(subjectName, groupedSub);

      return matchedExams.some(
        (e) =>
          (e.slug || '').toLowerCase() === activeExamFilter.toLowerCase() ||
          (e.id || '').toLowerCase() === activeExamFilter.toLowerCase() ||
          (e.name || '').toLowerCase() === activeExamFilter.toLowerCase()
      );
    });

    activeSubjects.sort((a, b) => {
      const subA = filteredSyllabus[a];
      const subB = filteredSyllabus[b];
      const examsA = getExamsForSubjectGroup(a, subA);
      const examsB = getExamsForSubjectGroup(b, subB);

      if (examsA.length !== examsB.length) {
        return examsB.length - examsA.length;
      }

      const examNameA = examsA[0]?.name || examsA[0]?.slug || 'General';
      const examNameB = examsB[0]?.name || examsB[0]?.slug || 'General';

      if (examNameA !== examNameB) {
        return examNameA.localeCompare(examNameB);
      }

      return a.localeCompare(b);
    });

    let lastExamKey = '';
    return activeSubjects.map((subjectName) => {
      const groupedSub = filteredSyllabus[subjectName];
      const isExpanded = expandedSubjects.includes(subjectName);
      const chapters = Object.keys(groupedSub.chapters);

      const completeChaptersCount = chapters.filter((chapterName) => {
        const topics = groupedSub.chapters[chapterName];
        return topics.every((t) => t.status === 'done');
      }).length;

      const matchedExams = getExamsForSubjectGroup(subjectName, groupedSub);
      const primaryExam = matchedExams[0];
      const primaryExamKey = primaryExam?.name || primaryExam?.slug || 'General';
      const isFirstInExamGroup = primaryExamKey !== lastExamKey;
      lastExamKey = primaryExamKey;

      return {
        key: subjectName,
        title: subjectName,
        completionPercent: groupedSub.completionPercent,
        chapterCount: chapters.length,
        completeChaptersCount,
        isExpanded,
        data: isExpanded ? chapters : [],
        exams: matchedExams,
        groupedSub,
        isFirstInExamGroup,
        groupExamName: primaryExam?.name || primaryExamKey,
        groupExamColor: primaryExam?.color || '#5B4FE8',
      };
    });
  }, [filteredSyllabus, expandedSubjects, getExamsForSubjectGroup, activeExamFilter]);

  useEffect(() => {
    sectionsRef.current = sections;
  }, [sections]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    []
  );

  const syllabusExists = useMemo(() => {
    return Object.keys(syllabusQuery.data || {}).length > 0;
  }, [syllabusQuery.data]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F6F3" translucent={false} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Screen Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Syllabus</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={handleOpenAddTopic}
              style={styles.headerBtnPlus}
              activeOpacity={0.8}
            >
              <Plus size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Keyword Search bar */}
        <View style={styles.searchBarContainer}>
          <View style={styles.searchBarWrapper}>
            <Search size={16} color="#9B9BAF" />
            <TextInput
              style={styles.searchTextInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search subjects, chapters, topics..."
              placeholderTextColor="#9B9BAF"
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={15} color="#9B9BAF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Syllabus Contents */}
        <View style={styles.mainContent}>
          {syllabusQuery.isLoading ? (
            <View style={styles.listScroll}>
              <Skeleton width="100%" height={100} borderRadius={16} style={{ marginBottom: 12, marginTop: 12 }} />
              <Skeleton width="100%" height={100} borderRadius={16} style={{ marginBottom: 12 }} />
              <Skeleton width="100%" height={100} borderRadius={16} style={{ marginBottom: 12 }} />
            </View>
          ) : syllabusExists ? (
            <SectionList
              ref={syllabusListRef}
              sections={sections}
              keyExtractor={(item, index) => item + index}
              stickySectionHeadersEnabled={false}
              keyboardDismissMode="on-drag"
              removeClippedSubviews={Platform.OS === 'android'}
              maxToRenderPerBatch={10}
              windowSize={5}
              initialNumToRender={8}
              onScrollToIndexFailed={() => {
                try {
                  syllabusListRef.current?.scrollToOffset({ offset: 0, animated: true });
                } catch {}
              }}
              onRefresh={handleRefresh}
              refreshing={isRefreshing}
              contentContainerStyle={styles.listScroll}
              ListHeaderComponent={() => {
                if (!syllabusExists) return null;
                return (
                  <View style={styles.goalSelectorHeaderContainer}>
                    {/* Active Goal Hero Card */}
                    <View style={styles.goalActiveMainCard}>
                      <View style={styles.goalActiveTopRow}>
                        <TouchableOpacity
                          style={styles.goalDropdownTrigger}
                          onPress={() => setIsGoalModalOpen(true)}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.goalEmojiBadge, { backgroundColor: `${activeGoalColor}14` }]}>
                            {renderExamIcon(activeExamObj ? activeExamObj.slug || activeExamObj.name : 'all', 20, activeGoalColor)}
                          </View>
                          <View style={styles.goalDropdownTextContainer}>
                            <Text style={styles.goalDropdownSmallLabel}>ACTIVE CURRICULUM</Text>
                            <View style={styles.goalDropdownNameRow}>
                              <Text style={styles.goalDropdownNameText} numberOfLines={1}>
                                {activeExamObj ? activeExamObj.name : 'All Goals & Subjects'}
                              </Text>
                              <ChevronDown size={14} color="#717188" style={{ marginLeft: 4 }} />
                            </View>
                          </View>
                        </TouchableOpacity>

                        <View style={styles.goalProgressBadge}>
                          <Text style={[styles.goalProgressBadgePercent, { color: activeGoalColor }]}>
                            {activeGoalMetrics.percent}%
                          </Text>
                          <Text style={styles.goalProgressBadgeSub}>
                            {activeGoalMetrics.completed}/{activeGoalMetrics.total} done
                          </Text>
                        </View>
                      </View>

                      {/* Linear Goal Progress Bar */}
                      <View style={styles.goalLinearProgressBarTrack}>
                        <View
                          style={[
                            styles.goalLinearProgressBarFill,
                            {
                              width: `${activeGoalMetrics.percent}%`,
                              backgroundColor: activeGoalColor,
                            },
                          ]}
                        />
                      </View>

                      {/* Quick-switch pills if user has multiple exams */}
                      {userSelectedExams.length > 1 && (
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.goalQuickChipsScroll}
                        >
                          <TouchableOpacity
                            style={[
                              styles.goalQuickChip,
                              activeExamFilter === 'all' && styles.goalQuickChipActiveAll,
                            ]}
                            onPress={() => setActiveExamFilter('all')}
                            activeOpacity={0.7}
                          >
                            <Globe size={13} color={activeExamFilter === 'all' ? '#FFFFFF' : '#717188'} />
                            <Text
                              style={[
                                styles.goalQuickChipText,
                                activeExamFilter === 'all' && styles.goalQuickChipTextActiveAll,
                              ]}
                            >
                              All Subjects
                            </Text>
                          </TouchableOpacity>

                          {userSelectedExams.map((exam) => {
                            const isActive =
                              activeExamFilter === (exam.slug || exam.id || exam.name);
                            const color = exam.color || '#5B4FE8';
                            const shortLabel =
                              (exam as any).short_name ||
                              (exam.slug === 'btech-cse' ? 'B.Tech CSE' : exam.name);

                            return (
                              <TouchableOpacity
                                key={exam.id || exam.slug}
                                style={[
                                  styles.goalQuickChip,
                                  isActive && [
                                    styles.goalQuickChipActive,
                                    { backgroundColor: color, borderColor: color },
                                  ],
                                ]}
                                onPress={() =>
                                  setActiveExamFilter(exam.slug || exam.id || exam.name)
                                }
                                activeOpacity={0.7}
                              >
                                {renderExamIcon(exam.slug || exam.name, 13, isActive ? '#FFFFFF' : color)}
                                <Text
                                  style={[
                                    styles.goalQuickChipText,
                                    isActive && styles.goalQuickChipTextActive,
                                  ]}
                                  numberOfLines={1}
                                >
                                  {shortLabel}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      )}
                    </View>
                  </View>
                );
              }}
              renderSectionHeader={({ section }: any) => {
                const isExpandedWithChapters = section.isExpanded && section.data.length > 0;
                const accentColor = getSubjectColor(section.title);

                return (
                  <View>
                    {/* Exam Group Header Divider when viewing All Subjects */}
                    {section.isFirstInExamGroup && userSelectedExams.length > 1 && activeExamFilter === 'all' && (
                      <View style={styles.examGroupSectionHeader}>
                        <View style={[styles.examGroupDot, { backgroundColor: section.groupExamColor }]} />
                        <Text style={styles.examGroupTitle}>
                          {section.groupExamName}
                        </Text>
                        <View style={[styles.examGroupBadge, { backgroundColor: `${section.groupExamColor}14` }]}>
                          <Text style={[styles.examGroupBadgeText, { color: section.groupExamColor }]}>
                            TARGET
                          </Text>
                        </View>
                      </View>
                    )}

                    <View
                      style={[
                        styles.subjectHeaderStickyContainer,
                        isExpandedWithChapters ? styles.subjectHeaderExpanded : styles.subjectHeaderCollapsed,
                      ]}
                    >
                      <TouchableOpacity
                        onPress={() => toggleSubjectExpanded(section.key)}
                        style={styles.subjectHeaderClickable}
                        activeOpacity={0.7}
                      >
                        <View style={styles.leftRow}>
                          <View style={[styles.subjectIconBox, { backgroundColor: `${accentColor}14` }]}>
                            <BookOpen size={18} color={accentColor} />
                          </View>
                          <View style={styles.textContainer}>
                            <View style={styles.subjectTitleRow}>
                              <Text style={styles.subjectText} numberOfLines={1}>{section.title}</Text>
                            </View>
                            <View style={styles.subjectMetaLine}>
                              <Text style={styles.chaptersCountText}>
                                {`${section.completeChaptersCount}/${section.chapterCount} chapters`}
                              </Text>
                              {section.exams && section.exams.length > 0 && (
                                <View style={styles.subjectTagsRow}>
                                  {section.exams.map((exam: any) => {
                                    const label =
                                      exam.short_name ||
                                      (exam.slug === 'btech-cse'
                                        ? 'B.Tech CSE'
                                        : exam.name.length > 12
                                        ? exam.name.substring(0, 11) + '…'
                                        : exam.name);
                                    return (
                                      <View
                                        key={exam.id || exam.slug}
                                        style={[
                                          styles.subjectExamTag,
                                          { backgroundColor: `${exam.color || '#5B4FE8'}14` },
                                        ]}
                                      >
                                        <Text
                                          style={[
                                            styles.subjectExamTagText,
                                            { color: exam.color || '#5B4FE8' },
                                          ]}
                                          numberOfLines={1}
                                        >
                                          {label}
                                        </Text>
                                      </View>
                                    );
                                  })}
                                </View>
                              )}
                            </View>
                          </View>
                        </View>
                        <View style={styles.rightRow}>
                          <View style={[styles.percentBadgePill, { backgroundColor: `${accentColor}14` }]}>
                            <Text style={[styles.percentText, { color: accentColor }]}>{`${section.completionPercent}%`}</Text>
                          </View>
                          <View style={[styles.chevronWrapper, section.isExpanded && styles.chevronRotated]}>
                            <ChevronRight size={15} color="#717188" />
                          </View>
                        </View>
                      </TouchableOpacity>

                      <View style={styles.progressContainer}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { backgroundColor: accentColor, width: `${section.completionPercent}%` },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                );
              }}
              renderItem={({ item: chapterName, index, section }: any) => {
                const groupedSub =
                  section.groupedSub || filteredSyllabus[section.key] || filteredSyllabus[section.title];
                const topicsList = groupedSub?.chapters[chapterName] || [];
                const chapterKey = `${section.key}-${chapterName}`;
                const isChapExpanded = expandedChapters.includes(chapterKey);
                const isLast = index === section.data.length - 1;

                return (
                  <View
                    style={[
                      styles.chapterRowCardWrapper,
                      isLast && styles.chapterRowCardWrapperLast,
                    ]}
                  >
                    <ChapterRow
                      chapter={chapterName}
                      topics={topicsList}
                      isExpanded={isChapExpanded}
                      onToggle={() => toggleChapterExpanded(chapterKey)}
                      onTopicStatusChange={handleTopicStatusChange}
                      selectedTopicIds={selectedTopicIds}
                      isMultiSelectMode={isMultiSelectMode}
                      onToggleSelectTopic={handleToggleSelectTopic}
                      onLongPressTopic={handleLongPressTopic}
                      searchQuery={searchQuery}
                      subjectColor={getSubjectColor(section.title)}
                      isCse={userCategory === 'cse_student'}
                    />
                  </View>
                );
              }}
              ListEmptyComponent={
                activeExamObj && activeGoalMetrics.total === 0 ? (
                  <View style={styles.emptyGoalCurriculumCard}>
                    <View style={[styles.emptyGoalIconCircle, { backgroundColor: `${activeGoalColor}15` }]}>
                      <BookOpen size={30} color={activeGoalColor} />
                    </View>
                    <Text style={styles.emptyGoalTitle}>
                      {activeExamObj.name} Curriculum Ready
                    </Text>
                    <Text style={styles.emptyGoalSubtitle}>
                      Import the complete curriculum for {activeExamObj.name} to view subjects, chapters, and track your progress.
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.emptyGoalLoadBtn,
                        { backgroundColor: activeGoalColor },
                        loadingExamKey ? { opacity: 0.7 } : null,
                      ]}
                      disabled={!!loadingExamKey || setupSyllabusMutation.isPending}
                      onPress={() =>
                        handleLoadSyllabusTemplate(activeExamObj.slug || activeExamObj.id || activeExamObj.name)
                      }
                      activeOpacity={0.85}
                    >
                      {loadingExamKey === (activeExamObj.slug || activeExamObj.id || activeExamObj.name) ||
                      setupSyllabusMutation.isPending ? (
                        <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                      ) : (
                        <Plus size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      )}
                      <Text style={styles.emptyGoalLoadBtnText}>
                        {loadingExamKey === (activeExamObj.slug || activeExamObj.id || activeExamObj.name) ||
                        setupSyllabusMutation.isPending
                          ? 'Importing Curriculum...'
                          : `Load ${activeExamObj.name} Syllabus`}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyTitle}>No matching topics found</Text>
                    <Text style={styles.emptySubtitle}>
                      Try modifying your search filter keywords.
                    </Text>
                  </View>
                )
              }
              ListFooterComponent={<View style={{ height: 24 }} />}
            />
          ) : (
            /* Syllabus Setup Welcome Screen Flow (Syllabus empty) */
            <ScrollView contentContainerStyle={styles.setupWelcomeContainer}>
              {userCategory === 'cse_student' ? (
                renderCseSetupScreen()
              ) : userCategory === 'student' || userCategory === 'aspirant' || !userCategory ? (
                <>
                  <Text style={styles.setupWelcomeTitle}>Set up your syllabus</Text>
                  <Text style={styles.setupWelcomeSubtitle}>
                    Choose your exam to load recommended template or add manually
                  </Text>

                  <View style={styles.templateCardsContainer}>
                    {studentExams.map((exam) => {
                      const isUserTarget = userSubCategory.some(
                        (s) =>
                          s.toLowerCase() === exam.name.toLowerCase() ||
                          s.toLowerCase() === exam.slug.toLowerCase() ||
                          s === exam.id
                      );

                      return (
                        <TouchableOpacity
                          key={exam.id}
                          style={[
                            styles.templateCard,
                            isUserTarget && styles.templateCardHighlighted,
                          ]}
                          onPress={() => handleLoadSyllabusTemplate(exam.slug || exam.id || exam.name)}
                          activeOpacity={0.85}
                        >
                          <View style={styles.templateCardHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <View
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: 4,
                                  backgroundColor: exam.color || '#5B4FE8',
                                }}
                              />
                              <Text style={styles.templateExamName}>{exam.name}</Text>
                            </View>
                            {isUserTarget ? (
                              <View style={styles.recommendedBadge}>
                                <Text style={styles.recommendedText}>Your Exam</Text>
                              </View>
                            ) : (
                              <Award size={16} color={exam.color || '#5B4FE8'} />
                            )}
                          </View>
                          <Text style={styles.templateExamSubjects}>
                            {exam.exam_type.toUpperCase()} • Popularity Rank #{exam.popularity_score}
                          </Text>
                          {exam.description ? (
                            <Text style={styles.templateExamChapters}>
                              {exam.description}
                            </Text>
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}

                    {/* Custom Setup Option */}
                    <TouchableOpacity
                      style={[styles.templateCard, styles.customSetupCard]}
                      onPress={handleOpenAddTopic}
                      activeOpacity={0.85}
                    >
                      <Plus size={20} color="#5B4FE8" style={styles.customSetupIcon} />
                      <Text style={styles.customSetupTitle}>Manual Subject Entry</Text>
                      <Text style={styles.customSetupDesc}>
                        Start empty and type in your own subjects, chapters, and topics manually.
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : userCategory === 'employee' ? (
                <>
                  <Text style={styles.setupWelcomeTitle}>Set up your skill subjects</Text>
                  <Text style={styles.setupWelcomeSubtitle}>
                    Load the work skills template or build your professional development topics manually
                  </Text>

                  <View style={styles.templateCardsContainer}>
                    <TouchableOpacity
                      style={[styles.templateCard, styles.templateCardHighlighted]}
                      onPress={() => handleLoadSyllabusTemplate('WORK_SKILLS')}
                      activeOpacity={0.85}
                    >
                      <View style={styles.templateCardHeader}>
                        <Text style={styles.templateExamName}>Work Skills Development</Text>
                        <View style={styles.recommendedBadge}>
                          <Text style={styles.recommendedText}>Recommended</Text>
                        </View>
                      </View>
                      <Text style={styles.templateExamSubjects}>
                        Technical • Soft Skills • Industry Knowledge • Leadership
                      </Text>
                      <Text style={styles.templateExamChapters}>
                        Core subjects to log and track your professional learning.
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.templateCard, styles.customSetupCard]}
                      onPress={handleOpenAddTopic}
                      activeOpacity={0.85}
                    >
                      <Plus size={20} color="#5B4FE8" style={styles.customSetupIcon} />
                      <Text style={styles.customSetupTitle}>Manual Subject Entry</Text>
                      <Text style={styles.customSetupDesc}>
                        Start empty and type in your own subjects, chapters, and topics manually.
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.setupWelcomeTitle}>Add your subjects manually</Text>
                  <Text style={styles.setupWelcomeSubtitle}>
                    Type in your custom subjects, chapters, and topics to start tracking your learning
                  </Text>

                  <View style={styles.templateCardsContainer}>
                    <TouchableOpacity
                      style={[
                        styles.templateCard,
                        styles.templateCardHighlighted,
                        styles.customSetupCard,
                      ]}
                      onPress={handleOpenAddTopic}
                      activeOpacity={0.85}
                    >
                      <Plus size={24} color="#5B4FE8" style={styles.customSetupIcon} />
                      <Text style={styles.customSetupTitle}>Add Subject Topic</Text>
                      <Text style={styles.customSetupDesc}>
                        Create your own custom subject tracks and chapters manually.
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          )}

          {/* Bulk operations bottom bar */}
          {isMultiSelectMode && selectedTopicIds.length > 0 && (
            <View style={styles.bulkActionBar}>
              <Text style={styles.bulkSelectedText}>
                {`${selectedTopicIds.length} topic${
                  selectedTopicIds.length === 1 ? '' : 's'
                } selected`}
              </Text>

              <View style={styles.bulkActionsGroup}>
                <TouchableOpacity
                  onPress={() => handleBulkStatusUpdate('done')}
                  style={[styles.bulkBtn, styles.bulkBtnDone]}
                  activeOpacity={0.8}
                >
                  <CheckCircle size={14} color="#FFFFFF" />
                  <Text style={styles.bulkBtnText}>Mark Done</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleBulkStatusUpdate('needs_revision')}
                  style={[styles.bulkBtn, styles.bulkBtnRevision]}
                  activeOpacity={0.8}
                >
                  <RotateCw size={14} color="#FFFFFF" />
                  <Text style={styles.bulkBtnText}>Needs Revision</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleCancelMultiSelect}
                  style={[styles.bulkBtn, styles.bulkBtnCancel]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.bulkBtnCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </SafeAreaView>

      {/* Goal Switcher Modal */}
      <Modal
        visible={isGoalModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          if (examToDelete) {
            setExamToDelete(null);
          } else {
            setIsGoalModalOpen(false);
          }
        }}
      >
        <View style={styles.goalModalBackdrop}>
          <TouchableWithoutFeedback onPress={() => !examToDelete && setIsGoalModalOpen(false)}>
            <View style={styles.goalModalBackdropPressable} />
          </TouchableWithoutFeedback>
          <View style={styles.goalModalContent}>
            <View style={styles.goalModalHeader}>
              <View style={styles.goalModalHeaderLeft}>
                <View style={styles.goalModalIconCircle}>
                  <Target size={20} color="#5B4FE8" />
                </View>
                <View>
                  <Text style={styles.goalModalTitle}>Select Target Goal</Text>
                  <Text style={styles.goalModalSubtitle}>Switch curriculum to focus your study</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setIsGoalModalOpen(false)}
                style={styles.goalModalCloseBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color="#5C5C70" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.goalModalList} showsVerticalScrollIndicator={false}>
              {/* All Goals / Combined Option */}
              <TouchableOpacity
                style={[
                  styles.goalOptionCard,
                  activeExamFilter === 'all' && styles.goalOptionCardActive,
                ]}
                onPress={() => {
                  setActiveExamFilter('all');
                  setIsGoalModalOpen(false);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.goalOptionTopRow}>
                  <View style={styles.goalOptionIconBadge}>
                    <Globe size={20} color="#5B4FE8" />
                  </View>
                  <View style={styles.goalOptionTextWrap}>
                    <View style={styles.goalOptionTitleRow}>
                      <Text style={styles.goalOptionTitle}>All Goals & Subjects</Text>
                      {activeExamFilter === 'all' && (
                        <View style={styles.goalActiveIndicator}>
                          <Check size={12} color="#FFFFFF" />
                        </View>
                      )}
                    </View>
                    <Text style={styles.goalOptionSubtitle}>
                      Combined view of all your subjects and roadmaps
                    </Text>
                  </View>
                </View>
                <View style={styles.goalOptionProgressRow}>
                  <View style={styles.goalOptionProgressBar}>
                    <View
                      style={[
                        styles.goalOptionProgressFill,
                        { width: `${overallMetrics.percent}%`, backgroundColor: '#5B4FE8' },
                      ]}
                    />
                  </View>
                  <Text style={styles.goalOptionProgressText}>
                    {`${overallMetrics.completed}/${overallMetrics.total} (${overallMetrics.percent}%)`}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Empty state if user has no specific exams enrolled */}
              {userSelectedExams.length === 0 && (
                <View style={styles.goalEmptyWrap}>
                  <Text style={styles.goalEmptyTitle}>No Target Goals Enrolled</Text>
                  <Text style={styles.goalEmptySubtitle}>
                    Tap Manage Target Goals below to select a curriculum.
                  </Text>
                </View>
              )}

              {/* Individual Target Exams */}
              {userSelectedExams.map((exam) => {
                const isSelected = activeExamFilter === (exam.slug || exam.id || exam.name);
                const metric = examMetrics.find(
                  (m) =>
                    (m.exam.slug || '').toLowerCase() === (exam.slug || '').toLowerCase() ||
                    m.exam.id === exam.id ||
                    m.exam.name.toLowerCase() === exam.name.toLowerCase()
                ) || { total: 0, completed: 0, percent: 0 };
                const hasCurriculum = metric.total > 0;
                const color = exam.color || '#5B4FE8';

                return (
                  <TouchableOpacity
                    key={exam.id || exam.slug}
                    style={[
                      styles.goalOptionCard,
                      isSelected && styles.goalOptionCardActive,
                      isSelected && { borderColor: color },
                    ]}
                    onPress={() => {
                      setActiveExamFilter(exam.slug || exam.id || exam.name);
                      setIsGoalModalOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.goalOptionTopRow}>
                      <View style={[styles.goalOptionIconBadge, { backgroundColor: `${color}18` }]}>
                        {renderExamIcon(exam.slug || exam.name, 20, color)}
                      </View>
                      <View style={styles.goalOptionTextWrap}>
                        <View style={styles.goalOptionTitleRow}>
                          <Text style={styles.goalOptionTitle} numberOfLines={1}>{exam.name}</Text>
                          {isSelected && (
                            <View style={[styles.goalActiveIndicator, { backgroundColor: color }]}>
                              <Check size={12} color="#FFFFFF" />
                            </View>
                          )}
                        </View>
                        <Text style={styles.goalOptionSubtitle} numberOfLines={1}>
                          {hasCurriculum
                            ? `${metric.completed} of ${metric.total} topics completed`
                            : 'Curriculum not imported yet'}
                        </Text>
                      </View>

                      {/* Remove / Unenroll Syllabus Button */}
                      <TouchableOpacity
                        style={styles.goalRemoveBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                          setExamToDelete({ id: exam.id, slug: exam.slug, name: exam.name });
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        activeOpacity={0.7}
                        accessibilityLabel={`Remove ${exam.name} syllabus`}
                      >
                        <Trash2 size={15} color="#9B9BAF" />
                      </TouchableOpacity>
                    </View>

                    {hasCurriculum ? (
                      <View style={styles.goalOptionProgressRow}>
                        <View style={styles.goalOptionProgressBar}>
                          <View
                            style={[
                              styles.goalOptionProgressFill,
                              { width: `${metric.percent}%`, backgroundColor: color },
                            ]}
                          />
                        </View>
                        <Text style={[styles.goalOptionProgressText, { color }]}>
                          {`${metric.percent}%`}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.goalOptionActionRow}>
                        <TouchableOpacity
                          style={[
                            styles.goalLoadInlineBtn,
                            { backgroundColor: color },
                            loadingExamKey === (exam.slug || exam.id || exam.name) ? { opacity: 0.7 } : null,
                          ]}
                          disabled={!!loadingExamKey || setupSyllabusMutation.isPending}
                          onPress={() =>
                            handleLoadSyllabusTemplate(exam.slug || exam.id || exam.name)
                          }
                          activeOpacity={0.8}
                        >
                          {loadingExamKey === (exam.slug || exam.id || exam.name) ||
                          setupSyllabusMutation.isPending ? (
                            <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
                          ) : (
                            <Plus size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                          )}
                          <Text style={styles.goalLoadInlineBtnText}>
                            {loadingExamKey === (exam.slug || exam.id || exam.name)
                              ? 'Importing...'
                              : 'Load Curriculum'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Footer to Manage Goals */}
            <View style={styles.goalModalFooter}>
              <TouchableOpacity
                style={styles.goalManageBtn}
                onPress={() => {
                  setIsGoalModalOpen(false);
                  router.push('/profile');
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.goalManageBtnText}>+ Manage Target Goals & Exams</Text>
                <ChevronRight size={16} color="#5B4FE8" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirmation Pop-up for Removing Syllabus */}
          {examToDelete && (
            <View style={styles.deleteConfirmOverlay}>
              <View style={styles.deleteConfirmCard}>
                <View style={styles.deleteConfirmIconCircle}>
                  <AlertTriangle size={24} color="#E85858" />
                </View>
                <Text style={styles.deleteConfirmTitle}>Remove Syllabus?</Text>
                <Text style={styles.deleteConfirmMessage}>
                  Are you sure you want to remove "{examToDelete.name}" from your curriculum? All your study progress and topics for this goal will be removed.
                </Text>
                <View style={styles.deleteConfirmButtonRow}>
                  <TouchableOpacity
                    style={styles.deleteConfirmCancelBtn}
                    onPress={() => setExamToDelete(null)}
                    disabled={removeExamMutation.isPending}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.deleteConfirmCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.deleteConfirmSubmitBtn,
                      removeExamMutation.isPending && { opacity: 0.7 },
                    ]}
                    onPress={handleConfirmDeleteExam}
                    disabled={removeExamMutation.isPending}
                    activeOpacity={0.8}
                  >
                    {removeExamMutation.isPending ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.deleteConfirmSubmitText}>Remove Syllabus</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* Add Topic bottom sheet form */}
      {isAddTopicOpen && (
        <BottomSheet
          ref={addTopicSheetRef}
          index={0}
          snapPoints={ADD_TOPIC_SNAP_POINTS}
          enableDynamicSizing={false}
          enablePanDownToClose
          backdropComponent={renderBackdrop}
          keyboardBehavior="interactive"
          onChange={(idx) => {
            if (idx === -1) {
              setIsAddTopicOpen(false);
            }
          }}
        >
          <BottomSheetView style={styles.addSheetContent}>
            <Text style={styles.addSheetTitle}>Add Syllabus Topic</Text>

            <Text style={styles.sheetInputLabel}>SUBJECT</Text>
            <BottomSheetTextInput
              style={styles.sheetInput}
              value={newSubject}
              onChangeText={setNewSubject}
              placeholder="e.g. Subject name"
              placeholderTextColor="#9B9BAF"
              maxLength={40}
            />

            <Text style={styles.sheetInputLabel}>CHAPTER</Text>
            <BottomSheetTextInput
              style={styles.sheetInput}
              value={newChapter}
              onChangeText={setNewChapter}
              placeholder="e.g. Kinematics"
              placeholderTextColor="#9B9BAF"
              maxLength={50}
            />

            <Text style={styles.sheetInputLabel}>TOPIC</Text>
            <BottomSheetTextInput
              style={styles.sheetInput}
              value={newTopic}
              onChangeText={setNewTopic}
              placeholder="e.g. Projectile Motion"
              placeholderTextColor="#9B9BAF"
              maxLength={60}
            />

            <TouchableOpacity
              style={[
                styles.sheetSubmitBtn,
                createTopicMutation.isPending && styles.sheetSubmitBtnDisabled,
              ]}
              onPress={handleAddTopicSubmit}
              disabled={createTopicMutation.isPending}
              activeOpacity={0.8}
            >
              {createTopicMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.sheetSubmitBtnText}>Create Topic</Text>
              )}
            </TouchableOpacity>
          </BottomSheetView>
        </BottomSheet>
      )}

      {/* Loading Overlay spinner when syllabus is being loaded in batch */}
      {setupSyllabusMutation.isPending && (
        <View style={styles.setupOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.setupOverlayText}>Adding topics...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F6F3',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 54,
  },
  headerTitle: {
    fontFamily: 'InstrumentSerif',
    fontSize: 30,
    color: '#17172A',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerBtnPlus: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#5B4FE8',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5B4FE8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  searchBarContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
    marginTop: 4,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ECEBE6',
    paddingHorizontal: 12,
    gap: 10,
    height: 44,
    shadowColor: '#17172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  searchTextInput: {
    flex: 1,
    fontFamily: 'DMSans',
    fontSize: 13.5,
    color: '#17172A',
    height: '100%',
  },
  mainContent: {
    flex: 1,
  },
  listScroll: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 100,
  },
  emptyContainer: {
    paddingVertical: 60,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: 'InstrumentSerif',
    fontSize: 22,
    color: '#17172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: 'DMSans',
    fontSize: 13,
    color: '#9B9BAF',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  bulkActionBar: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: '#17172A',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 10,
  },
  bulkSelectedText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  bulkActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bulkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bulkBtnDone: {
    backgroundColor: '#00B894',
  },
  bulkBtnRevision: {
    backgroundColor: '#E8A020',
  },
  bulkBtnCancel: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 8,
  },
  bulkBtnCancelText: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
  },
  bulkBtnText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    fontWeight: '600',
  },
  // Goal Selector Card
  goalSelectorHeaderContainer: {
    marginBottom: 14,
  },
  goalActiveMainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ECEBE6',
    padding: 16,
    shadowColor: '#17172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  goalActiveTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  goalDropdownTrigger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  goalEmojiBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalDropdownTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  goalDropdownSmallLabel: {
    fontFamily: 'DMMono-Medium',
    fontSize: 9.5,
    fontWeight: '700',
    color: '#9B9BAF',
    letterSpacing: 0.8,
  },
  goalDropdownNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  goalDropdownNameText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 15,
    fontWeight: '700',
    color: '#17172A',
    maxWidth: '85%',
  },
  goalProgressBadge: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    backgroundColor: '#FAFAF8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ECEBE6',
  },
  goalProgressBadgePercent: {
    fontFamily: 'DMMono-Medium',
    fontSize: 15,
    fontWeight: '800',
  },
  goalProgressBadgeSub: {
    fontFamily: 'DMSans',
    fontSize: 10.5,
    color: '#9B9BAF',
    marginTop: 1,
  },
  goalLinearProgressBarTrack: {
    height: 5,
    backgroundColor: '#F0EFEA',
    borderRadius: 2.5,
    overflow: 'hidden',
    marginTop: 14,
    marginBottom: 4,
  },
  goalLinearProgressBarFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  goalQuickChipsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 2,
  },
  goalQuickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F6F3',
    borderWidth: 1,
    borderColor: '#ECEBE6',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  goalQuickChipActive: {
    backgroundColor: '#5B4FE8',
    borderColor: '#5B4FE8',
  },
  goalQuickChipActiveAll: {
    backgroundColor: '#17172A',
    borderColor: '#17172A',
  },
  goalQuickChipEmoji: {
    fontSize: 13,
  },
  goalQuickChipText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: '#5C5C70',
    fontWeight: '600',
  },
  goalQuickChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  goalQuickChipTextActiveAll: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  // Goal Modal Styles
  goalModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 14, 23, 0.55)',
    justifyContent: 'flex-end',
  },
  goalModalBackdropPressable: {
    flex: 1,
  },
  goalModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '80%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  goalModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F1ED',
  },
  goalModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  goalModalIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EEEDFA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalModalTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 16,
    fontWeight: '700',
    color: '#17172A',
  },
  goalModalSubtitle: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#9B9BAF',
    marginTop: 1,
  },
  goalModalCloseBtn: {
    padding: 6,
    borderRadius: 18,
    backgroundColor: '#F7F6F3',
  },
  goalModalList: {
    marginTop: 14,
    marginBottom: 10,
  },
  goalOptionCard: {
    backgroundColor: '#FAFAF8',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#ECEBE6',
    padding: 14,
    marginBottom: 10,
  },
  goalOptionCardActive: {
    backgroundColor: '#FDFCFA',
    borderColor: '#5B4FE8',
    borderWidth: 2,
    shadowColor: '#5B4FE8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  goalOptionTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  goalOptionIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EAE8FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalOptionTextWrap: {
    flex: 1,
  },
  goalOptionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  goalOptionTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 15,
    fontWeight: '700',
    color: '#17172A',
  },
  goalActiveIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#5B4FE8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalOptionSubtitle: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#717188',
    marginTop: 2,
  },
  goalOptionProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  goalOptionProgressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EAE9E4',
    overflow: 'hidden',
  },
  goalOptionProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  goalOptionProgressText: {
    fontFamily: 'DMMono-Medium',
    fontSize: 11,
    fontWeight: '700',
    color: '#5C5C70',
  },
  goalOptionActionRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  goalLoadInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#5B4FE8',
  },
  goalLoadInlineBtnText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  goalModalFooter: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F2F1ED',
  },
  goalManageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#F5F4FE',
    borderWidth: 1,
    borderColor: '#E6E4FA',
  },
  goalManageBtnText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#5B4FE8',
    fontWeight: '700',
  },
  goalRemoveBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F3EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  goalEmptyWrap: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalEmptyTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: '#17172A',
    marginBottom: 4,
  },
  goalEmptySubtitle: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#9B9BAF',
    textAlign: 'center',
  },
  deleteConfirmOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 15, 26, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 999,
  },
  deleteConfirmCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#ECEBE6',
  },
  deleteConfirmIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  deleteConfirmTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 17,
    fontWeight: '700',
    color: '#17172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  deleteConfirmMessage: {
    fontFamily: 'DMSans',
    fontSize: 13,
    color: '#717188',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  deleteConfirmButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  deleteConfirmCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F3EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteConfirmCancelText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    fontWeight: '600',
    color: '#5C5C70',
  },
  deleteConfirmSubmitBtn: {
    flex: 1.3,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#E85858',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteConfirmSubmitText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subjectTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  subjectExamTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  subjectExamTagText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    fontWeight: '700',
  },
  examGroupSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 22,
    marginBottom: 10,
    marginHorizontal: 20,
    paddingBottom: 8,
    borderBottomWidth: 1.5,
    borderBottomColor: '#ECEBF5',
  },
  examGroupDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  examGroupTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 14,
    color: '#17172A',
    fontWeight: '700',
    flex: 1,
    letterSpacing: 0.2,
  },
  examGroupBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  examGroupBadgeText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyGoalCurriculumCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    padding: 24,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 20,
    shadowColor: '#17172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  emptyGoalIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyGoalTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 17,
    fontWeight: '700',
    color: '#17172A',
    textAlign: 'center',
  },
  emptyGoalSubtitle: {
    fontFamily: 'DMSans',
    fontSize: 13,
    color: '#717188',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 18,
    lineHeight: 18,
  },
  emptyGoalLoadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  emptyGoalLoadBtnText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  subjectHeaderStickyContainer: {
    backgroundColor: 'transparent',
  },
  subjectHeaderCollapsed: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ECEBE6',
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#17172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginHorizontal: 20,
    overflow: 'hidden',
  },
  subjectHeaderExpanded: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: '#ECEBE6',
    backgroundColor: '#FFFFFF',
    shadowColor: '#17172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
    marginHorizontal: 20,
    overflow: 'hidden',
  },
  subjectHeaderClickable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: '#FFFFFF',
  },
  subjectIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  subjectMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 3,
    flexWrap: 'wrap',
  },
  subjectTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  percentBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  subjectChevronCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F7F6F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accentDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  subjectText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 15.5,
    color: '#17172A',
    fontWeight: '700',
  },
  chaptersCountText: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#9B9BAF',
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  percentText: {
    fontFamily: 'DMMono-Medium',
    fontSize: 12.5,
    fontWeight: '700',
  },
  chevronWrapper: {
    transform: [{ rotate: '0deg' }],
  },
  chevronRotated: {
    transform: [{ rotate: '90deg' }],
  },
  progressContainer: {
    height: 3,
    backgroundColor: '#F0EFEA',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
  },
  chapterRowCardWrapper: {
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#ECEBE6',
    marginHorizontal: 20,
  },
  chapterRowCardWrapperLast: {
    borderBottomWidth: 1,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    marginBottom: 12,
    shadowColor: '#17172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  iconText: {
    fontSize: 16,
    marginRight: 12,
  },
  // CSE welcome styles
  cseRoadmapGrid: {
    gap: 12,
    marginTop: 16,
    width: '100%',
  },
  cseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    padding: 16,
    shadowColor: '#17172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cseCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  cseCardTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 15,
    fontWeight: '600',
    color: '#17172A',
  },
  cseCardSubjects: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#5B4FE8',
    marginBottom: 6,
    fontWeight: '500',
  },
  cseCardDesc: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#5C5C70',
    lineHeight: 16,
  },
  cseCardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F2F1EE',
    paddingTop: 8,
  },
  cseStatText: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#9B9BAF',
  },
  cseProgressOverlay: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    shadowColor: '#17172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cseProgressTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    fontWeight: '600',
    color: '#17172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  cseProgressSubtitle: {
    fontFamily: 'DMSans',
    fontSize: 13,
    color: '#5C5C70',
    marginBottom: 16,
    textAlign: 'center',
  },
  cseProgressBarOuter: {
    height: 6,
    backgroundColor: '#E8E7E3',
    borderRadius: 3,
    width: '100%',
    overflow: 'hidden',
  },
  cseProgressBarInner: {
    height: '100%',
    backgroundColor: '#5B4FE8',
    borderRadius: 3,
  },
  cseChecklistContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    padding: 16,
    marginTop: 16,
  },
  cseChecklistTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    fontWeight: '600',
    color: '#17172A',
    marginBottom: 12,
  },
  cseChecklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F1EE',
  },
  cseChecklistItemText: {
    fontFamily: 'DMSans',
    fontSize: 13,
    color: '#17172A',
    marginLeft: 12,
    flex: 1,
  },
  cseCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#9B9BAF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cseCheckboxChecked: {
    backgroundColor: '#5B4FE8',
    borderColor: '#5B4FE8',
  },
  cseCheckboxCheck: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cseChecklistButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cseChecklistBtnBack: {
    flex: 1,
    backgroundColor: '#F7F6F3',
    borderWidth: 1,
    borderColor: '#E8E7E3',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cseChecklistBtnBackText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#5C5C70',
    fontWeight: '600',
  },
  cseChecklistBtnSubmit: {
    flex: 2,
    backgroundColor: '#5B4FE8',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cseChecklistBtnSubmitDisabled: {
    backgroundColor: '#9B9BAF',
  },
  cseChecklistBtnSubmitText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Syllabus Setup Welcome Screen
  setupWelcomeContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 100,
  },
  setupWelcomeTitle: {
    fontFamily: 'InstrumentSerif',
    fontSize: 26,
    color: '#17172A',
    marginBottom: 4,
  },
  setupWelcomeSubtitle: {
    fontFamily: 'DMSans',
    fontSize: 14,
    color: '#9B9BAF',
    lineHeight: 20,
    marginBottom: 24,
  },
  templateCardsContainer: {
    gap: 12,
  },
  templateCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E7E3',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#17172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  templateCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  templateExamName: {
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    color: '#17172A',
    fontWeight: '600',
  },
  templateExamSubjects: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    color: '#5B4FE8',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  templateExamChapters: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#9B9BAF',
    lineHeight: 18,
  },
  customSetupCard: {
    borderStyle: 'dashed',
    borderColor: '#5B4FE8',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  customSetupIcon: {
    marginBottom: 6,
  },
  customSetupTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: '#5B4FE8',
    fontWeight: '600',
    marginBottom: 4,
  },
  customSetupDesc: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#9B9BAF',
    textAlign: 'center',
    paddingHorizontal: 12,
    lineHeight: 16,
  },
  templateCardHighlighted: {
    borderColor: '#5B4FE8',
    borderWidth: 1.5,
    backgroundColor: '#F7F6FF',
  },
  recommendedBadge: {
    backgroundColor: '#5B4FE8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  recommendedText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Add Topic bottom sheet
  addSheetContent: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 40,
    flex: 1,
  },
  addSheetTitle: {
    fontFamily: 'InstrumentSerif',
    fontSize: 24,
    color: '#17172A',
    marginBottom: 20,
  },
  sheetInputLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    color: '#9B9BAF',
    letterSpacing: 1,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 12,
  },
  sheetInput: {
    backgroundColor: '#F7F6F3',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    paddingHorizontal: 14,
    height: 46,
    fontFamily: 'DMSans',
    fontSize: 14,
    color: '#17172A',
  },
  sheetSubmitBtn: {
    backgroundColor: '#5B4FE8',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
    shadowColor: '#5B4FE8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  sheetSubmitBtnDisabled: {
    backgroundColor: '#9B9BAF',
    shadowOpacity: 0,
    elevation: 0,
  },
  sheetSubmitBtnText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    fontWeight: '600',
  },
  // Setup Overlay
  setupOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(23, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  setupOverlayText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Medium',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 16,
  },
});
