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
import { SEED_EXAMS } from '@/lib/constants/exams-seed';

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
  const [isManageCurriculumOpen, setIsManageCurriculumOpen] = useState(false);
  const [manageSearchQuery, setManageSearchQuery] = useState('');
  const [isDropdownMenuOpen, setIsDropdownMenuOpen] = useState(false);
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
    if (isDropdownMenuOpen) {
      setIsDropdownMenuOpen(false);
      return true;
    }
    if (isManageCurriculumOpen) {
      setIsManageCurriculumOpen(false);
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

  const availableExamsFiltered = useMemo(() => {
    const list: typeof SEED_EXAMS = [...SEED_EXAMS];
    studentExams.forEach((se) => {
      if (!list.some((item) => (item.slug && item.slug === se.slug) || item.id === se.id)) {
        list.push(se as any);
      }
    });

    if (!manageSearchQuery.trim()) return list;
    const q = manageSearchQuery.toLowerCase().trim();
    return list.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.slug || '').toLowerCase().includes(q) ||
        (e.description || '').toLowerCase().includes(q)
    );
  }, [studentExams, manageSearchQuery]);

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
    const sectionList: any[] = [];

    activeSubjects.forEach((subjectName) => {
      const groupedSub = filteredSyllabus[subjectName];
      const isExpanded = expandedSubjects.includes(subjectName);
      const allChapters = Object.keys(groupedSub.chapters);

      // Filter chapters for this specific exam if not 'all'
      const chapters = allChapters.filter((chapterName) => {
        if (activeExamFilter === 'all') return true;
        const topics = groupedSub.chapters[chapterName] || [];
        return topics.some((t) => {
          if (!t.exam_slug) return true;
          const slugs = t.exam_slug.toLowerCase().split(',').map((s: string) => s.trim());
          const target = activeExamFilter.toLowerCase();
          return slugs.includes(target) || slugs.some((s: string) => target.includes(s) || s.includes(target));
        });
      });

      if (activeExamFilter !== 'all' && chapters.length === 0) return;

      const completeChaptersCount = chapters.filter((chapterName) => {
        const topics = (groupedSub.chapters[chapterName] || []).filter((t) => {
          if (activeExamFilter === 'all') return true;
          if (!t.exam_slug) return true;
          const slugs = t.exam_slug.toLowerCase().split(',').map((s: string) => s.trim());
          const target = activeExamFilter.toLowerCase();
          return slugs.includes(target) || slugs.some((s: string) => target.includes(s) || s.includes(target));
        });
        return topics.length > 0 && topics.every((t) => t.status === 'done');
      }).length;

      let filteredDone = 0;
      let filteredTotal = 0;
      chapters.forEach((ch) => {
        const topics = (groupedSub.chapters[ch] || []).filter((t) => {
          if (activeExamFilter === 'all') return true;
          if (!t.exam_slug) return true;
          const slugs = t.exam_slug.toLowerCase().split(',').map((s: string) => s.trim());
          const target = activeExamFilter.toLowerCase();
          return slugs.includes(target) || slugs.some((s: string) => target.includes(s) || s.includes(target));
        });
        filteredTotal += topics.length;
        filteredDone += topics.filter((t) => t.status === 'done').length;
      });

      const completionPercent =
        filteredTotal > 0
          ? Math.round((filteredDone / filteredTotal) * 100)
          : groupedSub.completionPercent;

      const matchedExams = getExamsForSubjectGroup(subjectName, groupedSub);
      const primaryExam = matchedExams[0];
      const primaryExamKey = primaryExam?.name || primaryExam?.slug || 'General';
      const isFirstInExamGroup = primaryExamKey !== lastExamKey;
      lastExamKey = primaryExamKey;

      sectionList.push({
        key: subjectName,
        title: subjectName,
        completionPercent,
        chapterCount: chapters.length,
        completeChaptersCount,
        isExpanded,
        data: isExpanded ? chapters.map((ch) => `${subjectName}:::${ch}`) : [],
        exams: matchedExams,
        groupedSub,
        isFirstInExamGroup,
        groupExamName: primaryExam?.name || primaryExamKey,
        groupExamColor: primaryExam?.color || '#5B4FE8',
      });
    });

    return sectionList;
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
              extraData={{
                expandedSubjects,
                expandedChapters,
                selectedTopicIds,
                isMultiSelectMode,
                activeExamFilter,
              }}
              keyExtractor={(item: any) => (typeof item === 'string' ? item : `${item}`)}
              stickySectionHeadersEnabled={false}
              keyboardDismissMode="on-drag"
              removeClippedSubviews={false}
              maxToRenderPerBatch={10}
              windowSize={11}
              initialNumToRender={10}
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
                  <View style={styles.selectFieldContainer}>
                    {/* Standard Form Select Label Row */}
                    <View style={styles.selectLabelRow}>
                      <Text style={styles.selectFieldLabel}>Curriculum / Target Goal</Text>
                      <TouchableOpacity
                        onPress={() => {
                          setIsDropdownMenuOpen(false);
                          setIsManageCurriculumOpen(true);
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={styles.manageGoalsLinkText}>+ Add / Manage</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Standard Form Select Box (Jaise State / District select field) */}
                    <TouchableOpacity
                      style={[
                        styles.selectBox,
                        isDropdownMenuOpen && styles.selectBoxOpen,
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        setIsDropdownMenuOpen((prev) => !prev);
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={styles.selectBoxLeft}>
                        <View style={[styles.selectIconWrap, { backgroundColor: `${activeGoalColor}16` }]}>
                          {renderExamIcon(activeExamObj ? activeExamObj.slug || activeExamObj.name : 'all', 15, activeGoalColor)}
                        </View>
                        <Text style={styles.selectBoxValueText} numberOfLines={1}>
                          {activeExamObj ? activeExamObj.name : 'All Curricula & Subjects'}
                        </Text>
                      </View>

                      <View style={styles.selectBoxRight}>
                        {activeGoalMetrics.total > 0 && (
                          <View style={[styles.selectPercentPill, { backgroundColor: `${activeGoalColor}14` }]}>
                            <Text style={[styles.selectPercentText, { color: activeGoalColor }]}>
                              {activeGoalMetrics.percent}%
                            </Text>
                          </View>
                        )}
                        <ChevronDown
                          size={16}
                          color="#5C5C70"
                          style={isDropdownMenuOpen ? styles.selectChevronRotated : styles.selectChevron}
                        />
                      </View>
                    </TouchableOpacity>

                    {/* Standard Native-Style Dropdown Options List */}
                    {isDropdownMenuOpen && (
                      <View style={styles.selectDropdownList}>
                        {/* Option: All Curricula */}
                        <TouchableOpacity
                          style={[
                            styles.selectOptionRow,
                            activeExamFilter === 'all' && styles.selectOptionRowActive,
                          ]}
                          onPress={() => {
                            setActiveExamFilter('all');
                            setIsDropdownMenuOpen(false);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={styles.selectOptionLeft}>
                            <View style={[styles.selectOptionIconWrap, { backgroundColor: '#F1F0FA' }]}>
                              <Globe size={14} color="#5B4FE8" />
                            </View>
                            <Text style={[styles.selectOptionText, activeExamFilter === 'all' && styles.selectOptionTextActive]}>
                              All Curricula & Subjects
                            </Text>
                          </View>
                          <View style={styles.selectOptionRight}>
                            <Text style={styles.selectOptionMetric}>
                              {overallMetrics.completed}/{overallMetrics.total} ({overallMetrics.percent}%)
                            </Text>
                            {activeExamFilter === 'all' && <Check size={14} color="#5B4FE8" strokeWidth={2.5} />}
                          </View>
                        </TouchableOpacity>

                        {/* Individual Enrolled Exams */}
                        {userSelectedExams.map((exam) => {
                          const isSelected = activeExamFilter === (exam.slug || exam.id || exam.name);
                          const metric = examMetrics.find(
                            (m) =>
                              (m.exam.slug || '').toLowerCase() === (exam.slug || '').toLowerCase() ||
                              m.exam.id === exam.id ||
                              m.exam.name.toLowerCase() === exam.name.toLowerCase()
                          ) || { total: 0, completed: 0, percent: 0 };
                          const color = exam.color || '#5B4FE8';

                          return (
                            <TouchableOpacity
                              key={exam.id || exam.slug}
                              style={[
                                styles.selectOptionRow,
                                isSelected && styles.selectOptionRowActive,
                              ]}
                              onPress={() => {
                                setActiveExamFilter(exam.slug || exam.id || exam.name);
                                setIsDropdownMenuOpen(false);
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                              }}
                              activeOpacity={0.7}
                            >
                              <View style={styles.selectOptionLeft}>
                                <View style={[styles.selectOptionIconWrap, { backgroundColor: `${color}14` }]}>
                                  {renderExamIcon(exam.slug || exam.name, 14, color)}
                                </View>
                                <Text
                                  style={[
                                    styles.selectOptionText,
                                    isSelected && styles.selectOptionTextActive,
                                    isSelected && { color },
                                  ]}
                                  numberOfLines={1}
                                >
                                  {exam.name}
                                </Text>
                              </View>
                              <View style={styles.selectOptionRight}>
                                <Text style={styles.selectOptionMetric}>
                                  {metric.completed}/{metric.total} ({metric.percent}%)
                                </Text>
                                {isSelected && <Check size={14} color={color} strokeWidth={2.5} />}
                              </View>
                            </TouchableOpacity>
                          );
                        })}

                        {/* Action row inside dropdown: Add / Manage Goals right here */}
                        <TouchableOpacity
                          style={styles.selectActionRow}
                          onPress={() => {
                            setIsDropdownMenuOpen(false);
                            setIsManageCurriculumOpen(true);
                          }}
                          activeOpacity={0.8}
                        >
                          <Plus size={14} color="#5B4FE8" strokeWidth={2.5} />
                          <Text style={styles.selectActionText}>Add or Manage Target Goals</Text>
                          <ChevronRight size={13} color="#5B4FE8" />
                        </TouchableOpacity>
                      </View>
                    )}
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
                      key={`subject-card-${section.key}-${isExpandedWithChapters ? 'exp' : 'col'}`}
                      style={[
                        styles.subjectCardContainer,
                        isExpandedWithChapters ? styles.subjectCardExpanded : styles.subjectCardCollapsed,
                      ]}
                    >
                      <TouchableOpacity
                        onPress={() => toggleSubjectExpanded(section.key)}
                        style={styles.subjectCardClickable}
                        activeOpacity={0.75}
                      >
                        <View style={styles.subjectCardLeft}>
                          <View style={[styles.subjectIconBox, { backgroundColor: `${accentColor}12` }]}>
                            <BookOpen size={18} color={accentColor} strokeWidth={2.2} />
                          </View>
                          <View style={styles.subjectTitleContainer}>
                            <Text style={styles.subjectTitleText} numberOfLines={2}>
                              {section.title}
                            </Text>
                            <View style={styles.subjectSubtitleRow}>
                              <Text style={styles.subjectChaptersCount}>
                                {`${section.completeChaptersCount}/${section.chapterCount} chapters`}
                              </Text>
                              {section.completeChaptersCount === section.chapterCount && section.chapterCount > 0 && (
                                <View style={styles.subjectCompletedBadge}>
                                  <Check size={9} color="#00B894" strokeWidth={3} style={{ marginRight: 2 }} />
                                  <Text style={styles.subjectCompletedBadgeText}>Completed</Text>
                                </View>
                              )}
                              {section.exams && section.exams.length > 0 && activeExamFilter === 'all' && (
                                <View style={styles.subjectTagsRow}>
                                  {section.exams.map((exam: any) => {
                                    const label =
                                      exam.short_name ||
                                      (exam.slug === 'btech-cse'
                                        ? 'B.Tech CSE'
                                        : exam.name.length > 14
                                        ? exam.name.substring(0, 13) + '…'
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

                        <View style={styles.subjectCardRight}>
                          <View style={[styles.subjectPercentPill, { backgroundColor: `${accentColor}12` }]}>
                            <Text style={[styles.subjectPercentText, { color: accentColor }]}>
                              {`${section.completionPercent}%`}
                            </Text>
                          </View>
                          <View style={[styles.subjectChevronCircle, section.isExpanded && styles.subjectChevronCircleRotated]}>
                            <ChevronRight size={13} color="#686882" />
                          </View>
                        </View>
                      </TouchableOpacity>

                      <View style={styles.subjectProgressTrack}>
                        <View
                          style={[
                            styles.subjectProgressFill,
                            {
                              backgroundColor: accentColor,
                              width: `${section.completionPercent}%`,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                );
              }}
              renderItem={({ item, index, section }: any) => {
                const chapterName =
                  typeof item === 'string' && item.includes(':::') ? item.split(':::')[1] : item;
                const groupedSub =
                  section.groupedSub || filteredSyllabus[section.key] || filteredSyllabus[section.title];
                const rawTopics = groupedSub?.chapters[chapterName] || [];
                const topicsList = rawTopics.filter((t: any) => {
                  if (activeExamFilter === 'all') return true;
                  if (!t.exam_slug) return true;
                  const slugs = t.exam_slug.toLowerCase().split(',').map((s: string) => s.trim());
                  const target = activeExamFilter.toLowerCase();
                  return slugs.includes(target) || slugs.some((s: string) => target.includes(s) || s.includes(target));
                });
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

      {/* Manage & Add Target Goals Modal (Directly inside Syllabus) */}
      <Modal
        visible={isManageCurriculumOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          if (examToDelete) {
            setExamToDelete(null);
          } else {
            setIsManageCurriculumOpen(false);
          }
        }}
      >
        <View style={styles.manageModalBackdrop}>
          <TouchableWithoutFeedback onPress={() => !examToDelete && setIsManageCurriculumOpen(false)}>
            <View style={styles.manageModalBackdropPressable} />
          </TouchableWithoutFeedback>
          <View style={styles.manageModalContent}>
            {/* Header */}
            <View style={styles.manageModalHeader}>
              <View style={styles.manageModalHeaderLeft}>
                <View style={styles.manageModalIconCircle}>
                  <Target size={18} color="#5B4FE8" />
                </View>
                <View>
                  <Text style={styles.manageModalTitle}>Manage Target Goals</Text>
                  <Text style={styles.manageModalSubtitle}>Add or remove curriculum tracks</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setIsManageCurriculumOpen(false)}
                style={styles.manageModalCloseBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={18} color="#5C5C70" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.manageModalBody} showsVerticalScrollIndicator={false}>
              {/* SECTION 1: Currently Enrolled */}
              <Text style={styles.manageSectionTitle}>
                CURRENTLY ENROLLED ({userSelectedExams.length})
              </Text>

              {userSelectedExams.length === 0 ? (
                <View style={styles.manageEmptyBox}>
                  <Text style={styles.manageEmptyText}>No target goals enrolled yet.</Text>
                </View>
              ) : (
                userSelectedExams.map((exam) => {
                  const metric = examMetrics.find(
                    (m) =>
                      (m.exam.slug || '').toLowerCase() === (exam.slug || '').toLowerCase() ||
                      m.exam.id === exam.id ||
                      m.exam.name.toLowerCase() === exam.name.toLowerCase()
                  ) || { total: 0, completed: 0, percent: 0 };
                  const color = exam.color || '#5B4FE8';

                  return (
                    <View key={exam.id || exam.slug} style={styles.enrolledItemRow}>
                      <View style={styles.enrolledItemLeft}>
                        <View style={[styles.enrolledItemIcon, { backgroundColor: `${color}15` }]}>
                          {renderExamIcon(exam.slug || exam.name, 16, color)}
                        </View>
                        <View style={styles.enrolledItemTextWrap}>
                          <Text style={styles.enrolledItemName} numberOfLines={1}>{exam.name}</Text>
                          <Text style={styles.enrolledItemProgress}>
                            {metric.total > 0
                              ? `${metric.completed}/${metric.total} topics completed (${metric.percent}%)`
                              : 'Curriculum imported'}
                          </Text>
                        </View>
                      </View>

                      {/* Remove Button */}
                      <TouchableOpacity
                        style={styles.enrolledRemoveBtn}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                          setExamToDelete({ id: exam.id, slug: exam.slug, name: exam.name });
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Trash2 size={16} color="#E05666" />
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}

              {/* SECTION 2: Add New Exam / Curriculum */}
              <View style={styles.manageAddSectionHeader}>
                <Text style={styles.manageSectionTitle}>ADD NEW CURRICULUM</Text>
              </View>

              {/* Search Available Exams */}
              <View style={styles.manageSearchWrapper}>
                <Search size={14} color="#9B9BAF" />
                <TextInput
                  style={styles.manageSearchInput}
                  value={manageSearchQuery}
                  onChangeText={setManageSearchQuery}
                  placeholder="Search 28+ government, engineering & board exams..."
                  placeholderTextColor="#9B9BAF"
                />
                {manageSearchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setManageSearchQuery('')}>
                    <X size={14} color="#9B9BAF" />
                  </TouchableOpacity>
                )}
              </View>

              {/* List of Available Seed Exams */}
              {availableExamsFiltered.map((exam) => {
                const isEnrolled = userSelectedExams.some(
                  (e) =>
                    (e.slug || '').toLowerCase() === (exam.slug || '').toLowerCase() ||
                    e.id === exam.id ||
                    (e.name || '').toLowerCase() === (exam.name || '').toLowerCase()
                );
                const isLoadingThis = loadingExamKey === (exam.slug || exam.id);
                const color = exam.color || '#5B4FE8';

                return (
                  <View key={exam.id || exam.slug} style={styles.availableExamCard}>
                    <View style={styles.availableExamLeft}>
                      <View style={[styles.enrolledItemIcon, { backgroundColor: `${color}15` }]}>
                        {renderExamIcon(exam.slug || exam.name, 16, color)}
                      </View>
                      <View style={styles.availableExamTextWrap}>
                        <Text style={styles.availableExamName} numberOfLines={1}>{exam.name}</Text>
                        <Text style={styles.availableExamSubjects} numberOfLines={1}>
                          {exam.description || (exam.subjects ? `${exam.subjects.length} subjects` : 'Complete Curriculum')}
                        </Text>
                      </View>
                    </View>

                    {isEnrolled ? (
                      <View style={styles.enrolledBadgePill}>
                        <Check size={11} color="#00B894" strokeWidth={2.5} style={{ marginRight: 3 }} />
                        <Text style={styles.enrolledBadgeText}>Enrolled</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[styles.addCurriculumBtn, isLoadingThis && { opacity: 0.7 }]}
                        disabled={isLoadingThis || setupSyllabusMutation.isPending}
                        onPress={async () => {
                          try {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                            await handleLoadSyllabusTemplate(exam.slug || exam.id);
                            setActiveExamFilter(exam.slug || exam.id);
                            useUiStore.getState().showToast(`${exam.name} added to syllabus!`, 'success');
                          } catch (err: any) {
                            Alert.alert('Error', err?.message || 'Failed to add curriculum');
                          }
                        }}
                        activeOpacity={0.8}
                      >
                        {isLoadingThis ? (
                          <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 4 }} />
                        ) : (
                          <Plus size={13} color="#FFFFFF" strokeWidth={2.5} style={{ marginRight: 4 }} />
                        )}
                        <Text style={styles.addCurriculumBtnText}>
                          {isLoadingThis ? 'Adding...' : 'Add'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>

          {/* Delete Confirmation Modal */}
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
    fontFamily: 'Outfit-Bold',
    fontSize: 26,
    color: '#17172A',
    letterSpacing: -0.4,
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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ECEBE6',
    paddingHorizontal: 14,
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
    fontFamily: 'Outfit-Bold',
    fontSize: 20,
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
  // Standard Form Select Field (State / District style dropdown)
  selectFieldContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
    zIndex: 10,
  },
  selectLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  selectFieldLabel: {
    fontFamily: 'DMSans-Bold',
    fontSize: 12,
    color: '#5C5C70',
    fontWeight: '700',
  },
  manageGoalsLinkText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 12,
    color: '#5B4FE8',
    fontWeight: '700',
  },
  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E1DA',
    height: 48,
    paddingHorizontal: 12,
  },
  selectBoxOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderColor: '#5B4FE8',
    borderBottomColor: '#ECEBE6',
  },
  selectBoxLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  selectIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  selectBoxValueText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 13.5,
    color: '#17172A',
    fontWeight: '700',
    flexShrink: 1,
  },
  selectBoxRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectPercentPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  selectPercentText: {
    fontFamily: 'DMMono-Medium',
    fontSize: 11.5,
    fontWeight: '700',
  },
  selectChevron: {
    transform: [{ rotate: '0deg' }],
  },
  selectChevronRotated: {
    transform: [{ rotate: '180deg' }],
  },
  selectDropdownList: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderColor: '#5B4FE8',
    shadowColor: '#17172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  selectOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F7F6F3',
  },
  selectOptionRowActive: {
    backgroundColor: '#F7F6FF',
  },
  selectOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  selectOptionIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  selectOptionText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#3C3C4E',
    flexShrink: 1,
  },
  selectOptionTextActive: {
    fontFamily: 'DMSans-Bold',
    fontWeight: '700',
    color: '#17172A',
  },
  selectOptionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectOptionMetric: {
    fontFamily: 'DMMono-Medium',
    fontSize: 11,
    color: '#9B9BAF',
  },
  selectActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 6,
    backgroundColor: '#FAF9F6',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  selectActionText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 12.5,
    color: '#5B4FE8',
    fontWeight: '700',
  },

  // Manage Target Goals Modal
  manageModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  manageModalBackdropPressable: {
    flex: 1,
  },
  manageModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 24,
  },
  manageModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EFEA',
  },
  manageModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  manageModalIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEEDFA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  manageModalTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 16,
    color: '#17172A',
    fontWeight: '700',
  },
  manageModalSubtitle: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#717188',
    marginTop: 1,
  },
  manageModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F2EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  manageModalBody: {
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  manageSectionTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 11,
    color: '#8E8EA0',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontWeight: '700',
    marginBottom: 10,
  },
  manageEmptyBox: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FAF9F6',
    borderWidth: 1,
    borderColor: '#ECEBE6',
    alignItems: 'center',
    marginBottom: 16,
  },
  manageEmptyText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#8E8EA0',
  },
  enrolledItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#ECEBE5',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  enrolledItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  enrolledItemIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  enrolledItemTextWrap: {
    flex: 1,
  },
  enrolledItemName: {
    fontFamily: 'DMSans-Bold',
    fontSize: 14,
    color: '#17172A',
    fontWeight: '700',
  },
  enrolledItemProgress: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11.5,
    color: '#717188',
    marginTop: 2,
  },
  enrolledRemoveBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FDF0F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  manageAddSectionHeader: {
    marginTop: 16,
    marginBottom: 8,
  },
  manageSearchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF9F6',
    borderWidth: 1,
    borderColor: '#ECEBE5',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
    marginBottom: 12,
  },
  manageSearchInput: {
    flex: 1,
    fontFamily: 'DMSans',
    fontSize: 13,
    color: '#17172A',
  },
  availableExamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0EFEA',
    marginBottom: 8,
  },
  availableExamLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  availableExamTextWrap: {
    flex: 1,
  },
  availableExamName: {
    fontFamily: 'DMSans-Bold',
    fontSize: 13.5,
    color: '#17172A',
    fontWeight: '700',
  },
  availableExamSubjects: {
    fontFamily: 'DMSans',
    fontSize: 11.5,
    color: '#8E8EA0',
    marginTop: 1,
  },
  enrolledBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E2F9F3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  enrolledBadgeText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 11,
    color: '#00B894',
    fontWeight: '700',
  },
  addCurriculumBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5B4FE8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addCurriculumBtnText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
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
  subjectCardContainer: {
    backgroundColor: 'transparent',
  },
  subjectCardCollapsed: {
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#ECEBE5',
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    shadowColor: '#17172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
    marginHorizontal: 16,
  },
  subjectCardExpanded: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderColor: '#ECEBE5',
    backgroundColor: '#FFFFFF',
    shadowColor: '#17172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
    marginHorizontal: 16,
  },
  subjectCardClickable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 68,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
  },
  subjectCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  subjectIconBox: {
    width: 44,
    height: 44,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  subjectTitleContainer: {
    flex: 1,
  },
  subjectTitleText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 15,
    color: '#13132B',
    fontWeight: '700',
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  subjectSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
    flexWrap: 'wrap',
  },
  subjectTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  subjectChaptersCount: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: '#87879D',
    fontWeight: '500',
  },
  subjectCompletedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E2F9F3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  subjectCompletedBadgeText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 10,
    color: '#00B894',
    fontWeight: '700',
  },
  subjectCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subjectPercentPill: {
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 12,
  },
  subjectPercentText: {
    fontFamily: 'DMMono-Medium',
    fontSize: 12.5,
    fontWeight: '700',
  },
  subjectChevronCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F5F4EF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  subjectChevronCircleRotated: {
    transform: [{ rotate: '90deg' }],
  },
  subjectProgressTrack: {
    height: 3.5,
    backgroundColor: '#F3F2EB',
    width: '100%',
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    overflow: 'hidden',
  },
  subjectProgressFill: {
    height: '100%',
  },
  chapterRowCardWrapper: {
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: '#ECEBE5',
    marginHorizontal: 16,
  },
  chapterRowCardWrapperLast: {
    borderBottomWidth: 1.5,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    marginBottom: 10,
    shadowColor: '#17172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
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
    fontFamily: 'Outfit-Bold',
    fontSize: 22,
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
    fontFamily: 'Outfit-Bold',
    fontSize: 20,
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
