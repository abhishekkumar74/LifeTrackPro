import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SectionList,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Keyboard,
  Dimensions,
  Platform,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { tabScrollRefs } from '@/lib/utils/tab-scroll';
import Svg, { Circle } from 'react-native-svg';
import { useAuthStore } from '@/lib/store/auth.store';
import { getSubjectColor } from '@/lib/utils/subject-colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
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
  Sparkles,
  Clock,
  Flame,
  Check,
  RotateCcw,
  Smile,
  ChevronRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// Custom Hooks
import {
  useNotes,
  useDueRevisions,
  useUpdateNote,
  useReviewNote,
  useCreateNote,
} from '@/lib/hooks/use-notes';
import {
  useSyllabus,
  useUpdateTopicStatus,
  useBulkUpdateTopics,
  useCreateTopic,
  useSetupSyllabus,
  GroupedSyllabus,
} from '@/lib/hooks/use-syllabus';
import { Note, SyllabusTopic, SyllabusStatus } from '@/types/app.types';
import { supabase } from '@/lib/supabase/client';

// Custom Components
import { SubjectCard } from '@/components/learn/SubjectCard';
import { ChapterRow } from '@/components/learn/ChapterRow';
import { NoteCard } from '@/components/learn/NoteCard';
import { FlashCard } from '@/components/learn/FlashCard';
import { QuickCaptureButton } from '@/components/learn/QuickCaptureButton';
import { QuickCaptureSheet, QuickCaptureSheetRef } from '@/components/learn/QuickCaptureSheet';
import { Skeleton } from '@/components/shared/Skeleton';
import { ErrorState } from '@/components/shared/ErrorState';

// Syllabus Templates
import { SYLLABUS_TEMPLATES } from '@/lib/utils/syllabus-templates';
import { CSE_SYLLABUS } from '@/lib/utils/cse-syllabus-templates';

type TabType = 'syllabus' | 'notes' | 'flashcards';
type FilterType = string;
type StudySessionState = 'idle' | 'active' | 'complete';

export default function LearnScreen(): React.JSX.Element {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState<TabType>('syllabus');
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Custom review mode for flashcards (reviewing all notes vs only due ones)
  const [reviewAllFlashcards, setReviewAllFlashcards] = useState(false);

  // Flashcard Study Session State Machine
  const [studySessionState, setStudySessionState] = useState<StudySessionState>('idle');
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [sessionDuration, setSessionDuration] = useState<number>(0); // in seconds
  const [gotItCount, setGotItCount] = useState(0);
  const [reviewAgainCount, setReviewAgainCount] = useState(0);
  const [failedCardIds, setFailedCardIds] = useState<string[]>([]);
  const [currentSessionDeck, setCurrentSessionDeck] = useState<Note[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

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

  // Note sorting state
  const [sortOption, setSortOption] = useState<'recent' | 'oldest' | 'subject' | 'due'>('recent');

  const sortOptionLabel = useMemo(() => {
    switch (sortOption) {
      case 'recent': return 'Recent';
      case 'oldest': return 'Oldest';
      case 'subject': return 'Subject A-Z';
      case 'due': return 'Due Review';
      default: return 'Recent';
    }
  }, [sortOption]);

  const handleShowSortOptions = useCallback(() => {
    Alert.alert(
      'Sort Notes',
      'Select a sorting option:',
      [
        { text: 'Recent', onPress: () => setSortOption('recent') },
        { text: 'Oldest', onPress: () => setSortOption('oldest') },
        { text: 'Subject A-Z', onPress: () => setSortOption('subject') },
        { text: 'Due Review', onPress: () => setSortOption('due') },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  }, []);

  // Expanded card tracking
  const [expandedSubjects, setExpandedSubjects] = useState<string[]>([]);
  const [expandedChapters, setExpandedChapters] = useState<string[]>([]);

  // Refs
  const addTopicSheetRef = useRef<BottomSheet>(null);
  const quickCaptureSheetRef = useRef<QuickCaptureSheetRef>(null);

  // Tab scroll registration
  const syllabusListRef = useRef<any>(null);
  const notesListRef = useRef<any>(null);

  const selectedTabRef = useRef(selectedTab);
  useEffect(() => {
    selectedTabRef.current = selectedTab;
  }, [selectedTab]);

  useEffect(() => {
    tabScrollRefs['learn'] = {
      current: {
        scrollTo: () => {
          if (selectedTabRef.current === 'syllabus') {
            syllabusListRef.current?.scrollToLocation({
              sectionIndex: 0,
              itemIndex: 0,
              animated: true,
              viewPosition: 0,
            });
          } else if (selectedTabRef.current === 'notes') {
            notesListRef.current?.scrollToOffset({ offset: 0, animated: true });
          }
        }
      }
    } as any;
    return () => {
      delete tabScrollRefs['learn'];
    };
  }, []);

  // Add Topic Sheet Form State
  const [newSubject, setNewSubject] = useState('');
  const [newChapter, setNewChapter] = useState('');
  const [newTopic, setNewTopic] = useState('');

  // Queries
  const syllabusQuery = useSyllabus();
  const notesQuery = useNotes();
  const dueRevisionsQuery = useDueRevisions();

  // Mutations
  const updateTopicStatusMutation = useUpdateTopicStatus();
  const bulkUpdateTopicsMutation = useBulkUpdateTopics();
  const createTopicMutation = useCreateTopic();
  const setupSyllabusMutation = useSetupSyllabus();
  const updateNoteMutation = useUpdateNote();
  const reviewNoteMutation = useReviewNote();
  const createNoteMutation = useCreateNote();

  // Pull to refresh handlers
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    if (selectedTab === 'syllabus') {
      await syllabusQuery.refetch();
    } else {
      await notesQuery.refetch();
      await dueRevisionsQuery.refetch();
    }
    setIsRefreshing(false);
  }, [selectedTab, syllabusQuery, notesQuery, dueRevisionsQuery]);

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
  const handleTopicStatusChange = useCallback((topicId: string, newStatus: SyllabusStatus) => {
    updateTopicStatusMutation.mutate({ topicId, newStatus });
  }, [updateTopicStatusMutation]);

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

  const handleLongPressTopic = useCallback((topicId: string) => {
    if (!isMultiSelectMode) {
      setIsMultiSelectMode(true);
      setSelectedTopicIds([topicId]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, [isMultiSelectMode]);

  const handleCancelMultiSelect = useCallback(() => {
    setSelectedTopicIds([]);
    setIsMultiSelectMode(false);
  }, []);

  const handleBulkStatusUpdate = useCallback(async (status: SyllabusStatus) => {
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
  }, [selectedTopicIds, bulkUpdateTopicsMutation, handleCancelMultiSelect]);

  // Add Syllabus Topic
  const handleOpenAddTopic = useCallback(() => {
    setNewSubject('');
    setNewChapter('');
    setNewTopic('');
    addTopicSheetRef.current?.expand();
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

  // Notes tab pin toggle
  const handlePinNote = useCallback((noteId: string) => {
    const list = notesQuery.data || [];
    const target = list.find((n) => n.id === noteId);
    if (target) {
      updateNoteMutation.mutate({
        id: noteId,
        updates: { is_pinned: !target.is_pinned },
      });
    }
  }, [notesQuery.data, updateNoteMutation]);

  // Flashcards Review Mutation triggers
  const moveToNextCard = useCallback(() => {
    if (currentCardIndex + 1 < currentSessionDeck.length) {
      setCurrentCardIndex((prev) => prev + 1);
    } else {
      // Session Finished
      if (sessionStartTime) {
        setSessionDuration((Date.now() - sessionStartTime) / 1000);
      }
      setStudySessionState('complete');
    }
  }, [currentCardIndex, currentSessionDeck.length, sessionStartTime]);

  const handleFlashcardGotIt = useCallback((noteId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    reviewNoteMutation.mutate({ noteId, quality: 4 });

    setGotItCount((prev) => prev + 1);
    moveToNextCard();
  }, [reviewNoteMutation, moveToNextCard]);

  const handleFlashcardReviewAgain = useCallback((noteId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    reviewNoteMutation.mutate({ noteId, quality: 1 });

    setReviewAgainCount((prev) => prev + 1);
    setFailedCardIds((prev) => [...prev, noteId]);
    moveToNextCard();
  }, [reviewNoteMutation, moveToNextCard]);

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

  const filteredNotes = useMemo((): Note[] => {
    let list: Note[] = [];
    if (activeFilter === 'Due') {
      list = dueRevisionsQuery.data || [];
    } else {
      list = notesQuery.data || [];
      if (activeFilter === 'Pinned') {
        list = list.filter((n) => n.is_pinned);
      } else if (activeFilter !== 'All') {
        list = list.filter((n) => n.subject === activeFilter);
      }
    }

    // Exclude custom quick flashcards from the notes list if desired,
    // or keep them as normal notes. We will filter out tag parent links for cleanliness
    list = list.filter((n) => !n.tags.some((t) => t.startsWith('parent:')));

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      list = list.filter(
        (n) =>
          (n.title && n.title.toLowerCase().includes(query)) ||
          (n.content && n.content.toLowerCase().includes(query)) ||
          (n.subject && n.subject.toLowerCase().includes(query)) ||
          n.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Apply local sorting
    return [...list].sort((a, b) => {
      if (sortOption === 'recent') {
        const dateA = new Date(a.updated_at || a.created_at).getTime();
        const dateB = new Date(b.updated_at || b.created_at).getTime();
        return dateB - dateA;
      }
      if (sortOption === 'oldest') {
        const dateA = new Date(a.updated_at || a.created_at).getTime();
        const dateB = new Date(b.updated_at || b.created_at).getTime();
        return dateA - dateB;
      }
      if (sortOption === 'subject') {
        const subA = a.subject || 'General';
        const subB = b.subject || 'General';
        return subA.localeCompare(subB);
      }
      if (sortOption === 'due') {
        const dueA = a.next_review || '9999-12-31';
        const dueB = b.next_review || '9999-12-31';
        return dueA.localeCompare(dueB);
      }
      return 0;
    });
  }, [notesQuery.data, dueRevisionsQuery.data, activeFilter, searchQuery, sortOption]);

  // Compiled Flashcards Deck list from cache
  const flashcardDeck = useMemo((): Note[] => {
    let deck: Note[] = [];
    if (reviewAllFlashcards) {
      deck = notesQuery.data || [];
    } else {
      deck = dueRevisionsQuery.data || [];
    }

    // Filter by searchQuery if present
    if (!searchQuery.trim()) return deck;
    const query = searchQuery.trim().toLowerCase();

    return deck.filter((n) => {
      const isFlashcard = n.tags && n.tags.includes('flashcard');
      if (isFlashcard && n.content) {
        try {
          const parsed = JSON.parse(n.content);
          return (
            (parsed.front && parsed.front.toLowerCase().includes(query)) ||
            (parsed.back && parsed.back.toLowerCase().includes(query))
          );
        } catch (e) {
          // fallback
        }
      }
      return (
        (n.title && n.title.toLowerCase().includes(query)) ||
        (n.content && n.content.toLowerCase().includes(query)) ||
        (n.subject && n.subject.toLowerCase().includes(query))
      );
    });
  }, [dueRevisionsQuery.data, notesQuery.data, reviewAllFlashcards, searchQuery]);

  const activeCard = currentSessionDeck[currentCardIndex];

  const handleTabPress = useCallback((tab: TabType) => {
    setSelectedTab(tab);
    setSearchQuery(''); // Clear search on tab switch
    if (tab !== 'flashcards') {
      setStudySessionState('idle'); // Reset flashcard session if user leaves tab
    }
  }, []);

  const handleLoadSyllabusTemplate = useCallback((key: string) => {
    const template = SYLLABUS_TEMPLATES[key];
    if (!template) return;

    Alert.alert(
      'Set Up Syllabus',
      `Are you sure you want to load the ${template.name} syllabus? This will add ${template.topics.length} chapters to your syllabus list.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Load Syllabus',
          onPress: () => {
            setupSyllabusMutation.mutate(template.topics, {
              onSuccess: () => {
                Alert.alert('Success', `${template.name} syllabus loaded successfully!`);
              },
              onError: (error) => {
                if (__DEV__) {
                  console.error('Syllabus template error:', error);
                }
                Alert.alert('Error', 'Failed to load template topics.');
              },
            });
          },
        },
      ]
    );
  }, [setupSyllabusMutation]);

  const handleLoadCseSyllabus = useCallback(async (categoriesToLoad: string[], goalLabel: string) => {
    if (categoriesToLoad.length === 0) {
      Alert.alert('No subjects selected', 'Please select at least one subject to load.');
      return;
    }

    // Calculate total topics
    let totalTopicsCount = 0;
    categoriesToLoad.forEach(cat => {
      const categoryObj = CSE_SYLLABUS[cat];
      if (categoryObj && categoryObj.subjects) {
        Object.values(categoryObj.subjects).forEach(sub => {
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

            // Fetch user session
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
              setIsAddingSyllabus(false);
              Alert.alert('Authentication Error', 'Not authenticated.');
              return;
            }

            // Simulate progress increment
            const interval = setInterval(() => {
              setAddingProgress(prev => {
                if (prev >= totalTopicsCount - 10) {
                  clearInterval(interval);
                  return prev;
                }
                return prev + Math.max(15, Math.ceil((totalTopicsCount - prev) * 0.15));
              });
            }, 80);

            try {
              // Construct the allTopics array
              const allTopics: any[] = [];
              let orderIdx = 0;

              categoriesToLoad.forEach(cat => {
                const categoryObj = CSE_SYLLABUS[cat];
                if (categoryObj && categoryObj.subjects) {
                  Object.keys(categoryObj.subjects).forEach(subName => {
                    const subjectObj = categoryObj.subjects[subName];
                    subjectObj.topics.forEach(topicName => {
                      allTopics.push({
                        user_id: session.user.id,
                        subject: cat, // Category maps to subject field in DB
                        chapter: subName, // Subject maps to chapter field in DB
                        topic: topicName, // Topic maps to topic field in DB
                        status: 'not_started',
                        order_index: orderIdx++
                      });
                    });
                  });
                }
              });

              // Perform single Supabase batch insert call
              const { error } = await supabase
                .from('syllabus_topics')
                .insert(allTopics);

              if (error) throw error;

              // Complete progress
              clearInterval(interval);
              setAddingProgress(totalTopicsCount);

              // Wait 500ms for visual satisfaction, then refetch
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
          }
        }
      ]
    );
  }, [syllabusQuery]);

  const getCategoryTopicCount = (categoryName: string): number => {
    const categoryObj = CSE_SYLLABUS[categoryName];
    if (!categoryObj || !categoryObj.subjects) return 0;
    let count = 0;
    Object.values(categoryObj.subjects).forEach(sub => {
      count += sub.topics.length;
    });
    return count;
  };

  const handleToggleCseCategory = (cat: string) => {
    setSelectedCseCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const renderCseSetupScreen = () => {
    if (isAddingSyllabus) {
      const progressPercent = addingTotal > 0 ? Math.round((addingProgress / addingTotal) * 100) : 0;
      return (
        <View style={styles.cseProgressOverlay}>
          <Text style={styles.cseProgressTitle}>Loading CSE Roadmap 📚</Text>
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
      selectedCseCategories.forEach(cat => {
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
                  {isChecked && <Text style={styles.cseCheckboxCheck}>✓</Text>}
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
        emoji: '🏆',
        categories: ['Data Structures & Algorithms', 'System Design', 'Object Oriented Design (OOD)', 'Interview Preparation'],
        displaySubjects: 'DSA • System Design • Java/OOD • Interview Prep',
        description: 'Best for FAANG / product company placement preparation.',
        topicCount: 427,
        subjectCount: 4,
      },
      {
        key: 'backend',
        title: 'Backend Developer',
        emoji: '⚙️',
        categories: ['Data Structures & Algorithms', 'Backend Development', 'Cloud & DevOps'],
        displaySubjects: 'DSA • Backend Dev • Databases • Cloud & DevOps',
        description: 'Focuses on databases, server architectures, and DevOps.',
        topicCount: 313,
        subjectCount: 3,
      },
      {
        key: 'fullstack',
        title: 'Full Stack Dev',
        emoji: '🌐',
        categories: ['Data Structures & Algorithms', 'Web Development', 'Backend Development'],
        displaySubjects: 'DSA • Web Dev • Backend Dev • Databases',
        description: 'Covers frontend, backend, and database structures.',
        topicCount: 312,
        subjectCount: 3,
      },
      {
        key: 'all',
        title: 'All Subjects (Complete)',
        emoji: '🎓',
        categories: Object.keys(CSE_SYLLABUS),
        displaySubjects: 'All 9 CSE Syllabus Categories',
        description: 'Includes complete computer science subjects & roadmap.',
        topicCount: 753,
        subjectCount: 9,
      }
    ];

    return (
      <>
        <Text style={styles.setupWelcomeTitle}>Set up your CS roadmap 📚</Text>
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
                  <Text style={{ fontSize: 18 }}>{map.emoji}</Text>
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

  // Remember active subject from last note
  const lastUsedSubject = useMemo(() => {
    const list = notesQuery.data || [];
    const sorted = [...list].sort(
      (a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
    );
    return sorted.length > 0 ? sorted[0].subject : null;
  }, [notesQuery.data]);

  const { profile } = useAuthStore();
  const userCategory = profile?.category || '';
  const userSubCategory = profile?.sub_category || [];

  const isNeet = userSubCategory.some(s => s.toLowerCase().includes('neet'));
  const isJee = userSubCategory.some(s => s.toLowerCase().includes('jee'));
  const isUpsc = userSubCategory.some(s => s.toLowerCase().includes('upsc'));
  const isSsc = userSubCategory.some(s => s.toLowerCase().includes('ssc'));

  const examName = useMemo(() => {
    if (profile?.sub_category && profile.sub_category.length > 0) {
      return profile.sub_category[0];
    }
    if (profile?.category) {
      return profile.category.charAt(0).toUpperCase() + profile.category.slice(1);
    }
    return 'General';
  }, [profile]);

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

  const sections = useMemo(() => {
    return Object.keys(filteredSyllabus).map((subjectName) => {
      const groupedSub = filteredSyllabus[subjectName];
      const isExpanded = expandedSubjects.includes(subjectName);
      
      const chapters = Object.keys(groupedSub.chapters);
      
      // Calculate complete chapters count
      const completeChaptersCount = chapters.filter((chapterName) => {
        const topics = groupedSub.chapters[chapterName];
        return topics.every((t) => t.status === 'done');
      }).length;

      return {
        title: subjectName,
        completionPercent: groupedSub.completionPercent,
        chapterCount: chapters.length,
        completeChaptersCount,
        isExpanded,
        data: isExpanded ? chapters : [],
      };
    });
  }, [filteredSyllabus, expandedSubjects]);

  const availableSubjects = useMemo(() => {
    const list = notesQuery.data || [];
    const subjects = new Set(
      list.map((n) => n.subject).filter(Boolean) as string[]
    );
    return Array.from(subjects).sort();
  }, [notesQuery.data]);

  const filterChips = useMemo(() => {
    const baseChips = [
      { key: 'All', label: 'All' },
      { key: 'Pinned', label: '📌 Pinned' },
      { key: 'Due', label: '📅 Due for Review' },
    ];
    const subjectChips = availableSubjects.map((sub) => ({
      key: sub,
      label: sub,
    }));
    return [...baseChips, ...subjectChips];
  }, [availableSubjects]);

  const subjectsList = useMemo(() => {
    const list = new Set<string>(['Physics', 'Chemistry', 'Biology', 'Math', 'Other']);
    Object.keys(syllabusQuery.data || {}).forEach((sub) => list.add(sub));
    return Array.from(list);
  }, [syllabusQuery.data]);

  const handleQuickCaptureSave = useCallback((content: string, subject: string) => {
    createNoteMutation.mutate(
      {
        title: content.substring(0, 50),
        content: content,
        subject: subject === 'Other' ? null : subject,
        tags: [],
      },
      {
        onSuccess: (newNote) => {
          quickCaptureSheetRef.current?.close();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          router.push(`/note/${newNote.id}`);
        },
        onError: () => {
          Alert.alert('Error', 'Failed to save quick note.');
        },
      }
    );
  }, [createNoteMutation, router]);

  const handleStartReview = useCallback(() => {
    if (flashcardDeck.length === 0) return;
    setCurrentSessionDeck([...flashcardDeck]);
    setCurrentCardIndex(0);
    setGotItCount(0);
    setReviewAgainCount(0);
    setFailedCardIds([]);
    setSessionStartTime(Date.now());
    setStudySessionState('active');
  }, [flashcardDeck]);

  const handleStudyAgain = useCallback(() => {
    const failedCards = currentSessionDeck.filter((c) => failedCardIds.includes(c.id));
    if (failedCards.length === 0) return;

    setCurrentSessionDeck(failedCards);
    setCurrentCardIndex(0);
    setGotItCount(0);
    setReviewAgainCount(0);
    setFailedCardIds([]);
    setSessionStartTime(Date.now());
    setStudySessionState('active');
  }, [currentSessionDeck, failedCardIds]);

  const handleNotePress = useCallback((noteId: string) => {
    router.push(`/note/${noteId}`);
  }, [router]);

  const renderNoteItem = useCallback(({ item }: { item: Note }) => (
    <NoteCard
      note={item}
      onPress={() => handleNotePress(item.id)}
      onPin={handlePinNote}
      searchQuery={searchQuery}
    />
  ), [handleNotePress, handlePinNote, searchQuery]);

  // Flashcards subject breakdown
  const flashcardSubjectBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    flashcardDeck.forEach((card) => {
      const sub = card.subject || 'General';
      counts[sub] = (counts[sub] || 0) + 1;
    });
    return counts;
  }, [flashcardDeck]);

  // Next scheduled review calculation
  const nextReviewText = useMemo(() => {
    if (currentSessionDeck.length === 0) return 'Come back later for next review';
    const dates = currentSessionDeck
      .map((c) => c.next_review)
      .filter(Boolean) as string[];
    if (dates.length === 0) return 'Come back later for next review';
    
    const sorted = dates.sort();
    const minDateStr = sorted[0];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextDate = new Date(minDateStr);
    nextDate.setHours(0, 0, 0, 0);

    const diffMs = nextDate.getTime() - today.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return 'Next review is due today!';
    if (diffDays === 1) return 'Come back tomorrow for next review';
    return `Come back in ${diffDays} days for next review`;
  }, [currentSessionDeck]);

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
          <Text style={styles.headerTitle}>Learn</Text>
          <View style={styles.headerRight}>
            {selectedTab === 'syllabus' && syllabusExists && (
              <TouchableOpacity
                onPress={handleOpenAddTopic}
                style={styles.headerBtn}
                activeOpacity={0.7}
              >
                <Plus size={20} color="#5C5C70" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => router.push('/note/new')}
              style={styles.headerBtnPlus}
              activeOpacity={0.8}
            >
              <Plus size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Selection pills */}
        <View style={styles.tabsRow}>
          {(['syllabus', 'notes', 'flashcards'] as TabType[]).map((tab) => {
            const active = selectedTab === tab;
            let displayLabel = tab.toUpperCase();

            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tabPill, active && styles.tabPillActive]}
                onPress={() => handleTabPress(tab)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {displayLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Keyword Search bar (ALWAYS shown for filtering) */}
        <View style={styles.searchBarContainer}>
          <TextInput
            style={styles.searchTextInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={`Search ${
              selectedTab === 'syllabus'
                ? 'topics'
                : selectedTab === 'notes'
                ? 'notes'
                : 'flashcards'
            }...`}
            placeholderTextColor="#9B9BAF"
            clearButtonMode="while-editing"
          />
        </View>

        {/* SUB-TAB CONTENTS */}
        <View style={styles.tabContent}>
          {/* ==========================================
              1. SYLLABUS TAB
              ========================================== */}
          {selectedTab === 'syllabus' && (
            <View style={{ flex: 1 }}>
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
                  stickySectionHeadersEnabled={true}
                  keyboardDismissMode="on-drag"
                  removeClippedSubviews={Platform.OS === 'android'}
                  maxToRenderPerBatch={10}
                  windowSize={5}
                  initialNumToRender={8}
                  onRefresh={handleRefresh}
                  refreshing={isRefreshing}
                  contentContainerStyle={styles.listScroll}
                  ListHeaderComponent={() => {
                    if (!syllabusExists) return null;
                    return (
                      <View style={styles.overallHeaderContainer}>
                        <View style={styles.overallHeaderRow}>
                          <View style={styles.ringWrapper}>
                            <View style={styles.ringInner}>
                              <Svg width={60} height={60} viewBox="0 0 60 60">
                                <Circle
                                  cx={30}
                                  cy={30}
                                  r={26}
                                  stroke="#E8E7E3"
                                  strokeWidth={5}
                                  fill="transparent"
                                />
                                <Circle
                                  cx={30}
                                  cy={30}
                                  r={26}
                                  stroke="#5B4FE8"
                                  strokeWidth={5}
                                  fill="transparent"
                                  strokeDasharray={2 * Math.PI * 26}
                                  strokeDashoffset={2 * Math.PI * 26 * (1 - overallMetrics.percent / 100)}
                                  strokeLinecap="round"
                                  transform="rotate(-90 30 30)"
                                />
                              </Svg>
                              <View style={styles.ringPercentTextContainer}>
                                <Text style={styles.ringPercentText}>{overallMetrics.percent}%</Text>
                              </View>
                            </View>
                          </View>
                          
                          <View style={styles.overallHeaderTextContainer}>
                            <Text style={styles.overallCompletedText}>
                              {`${overallMetrics.completed} of ${overallMetrics.total} topics completed`}
                            </Text>
                            <View style={styles.examPill}>
                              <Text style={styles.examPillText}>Exam: {examName}</Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  }}
                  renderSectionHeader={({ section }) => {
                    const isExpandedWithChapters = section.isExpanded && section.data.length > 0;
                    const accentColor = getSubjectColor(section.title);
                    
                    // Get CSE icon if applicable
                    const cseIcon = userCategory === 'cse_student' ? (CSE_SYLLABUS[section.title]?.icon || null) : null;

                    return (
                      <View style={[
                        styles.subjectHeaderStickyContainer,
                        isExpandedWithChapters ? styles.subjectHeaderExpanded : styles.subjectHeaderCollapsed
                      ]}>
                        <TouchableOpacity
                          onPress={() => toggleSubjectExpanded(section.title)}
                          style={styles.subjectHeaderClickable}
                          activeOpacity={0.7}
                        >
                          <View style={styles.leftRow}>
                            {cseIcon ? (
                              <Text style={styles.iconText}>{cseIcon}</Text>
                            ) : (
                              <View style={[styles.accentDot, { backgroundColor: accentColor }]} />
                            )}
                            <View style={styles.textContainer}>
                              <Text style={styles.subjectText}>{section.title}</Text>
                              <Text style={styles.chaptersCountText}>
                                {`${section.completeChaptersCount} / ${section.chapterCount} chapters complete`}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.rightRow}>
                            <Text style={styles.percentText}>{`${section.completionPercent}%`}</Text>
                            <View style={[styles.chevronWrapper, section.isExpanded && styles.chevronRotated]}>
                              <ChevronRight size={16} color="#9B9BAF" />
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
                    );
                  }}
                  renderItem={({ item: chapterName, index, section }) => {
                    const groupedSub = filteredSyllabus[section.title];
                    const topicsList = groupedSub.chapters[chapterName];
                    const chapterKey = `${section.title}-${chapterName}`;
                    const isChapExpanded = expandedChapters.includes(chapterKey);
                    const isLast = index === section.data.length - 1;

                    return (
                      <View style={[
                        styles.chapterRowCardWrapper,
                        isLast && styles.chapterRowCardWrapperLast
                      ]}>
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
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyTitle}>No matching topics found 🔍</Text>
                      <Text style={styles.emptySubtitle}>
                        Try modifying your search filter keywords.
                      </Text>
                    </View>
                  }
                />
              ) : (
                /* Syllabus Setup Welcome Screen Flow (Syllabus empty) */
                <ScrollView contentContainerStyle={styles.setupWelcomeContainer}>
                  {userCategory === 'cse_student' ? (
                    renderCseSetupScreen()
                  ) : userCategory === 'student' ? (
                    <>
                      <Text style={styles.setupWelcomeTitle}>Set up your syllabus 📚</Text>
                      <Text style={styles.setupWelcomeSubtitle}>
                        Choose your exam to load recommended template or add manually
                      </Text>

                      <View style={styles.templateCardsContainer}>
                        {/* Setup Card: NEET */}
                        <TouchableOpacity
                          style={[
                            styles.templateCard,
                            isNeet && styles.templateCardHighlighted,
                          ]}
                          onPress={() => handleLoadSyllabusTemplate('NEET')}
                          activeOpacity={0.85}
                        >
                          <View style={styles.templateCardHeader}>
                            <Text style={styles.templateExamName}>NEET 2026</Text>
                            {isNeet ? (
                              <View style={styles.recommendedBadge}>
                                <Text style={styles.recommendedText}>Recommended</Text>
                              </View>
                            ) : (
                              <Award size={16} color="#00B894" />
                            )}
                          </View>
                          <Text style={styles.templateExamSubjects}>Physics • Chemistry • Biology</Text>
                          <Text style={styles.templateExamChapters}>
                            96 standard chapters mapped to log medical prep.
                          </Text>
                        </TouchableOpacity>

                        {/* Setup Card: JEE */}
                        <TouchableOpacity
                          style={[
                            styles.templateCard,
                            isJee && styles.templateCardHighlighted,
                          ]}
                          onPress={() => handleLoadSyllabusTemplate('JEE')}
                          activeOpacity={0.85}
                        >
                          <View style={styles.templateCardHeader}>
                            <Text style={styles.templateExamName}>JEE</Text>
                            {isJee ? (
                              <View style={styles.recommendedBadge}>
                                <Text style={styles.recommendedText}>Recommended</Text>
                              </View>
                            ) : (
                              <Award size={16} color="#5B4FE8" />
                            )}
                          </View>
                          <Text style={styles.templateExamSubjects}>Physics • Chemistry • Math</Text>
                          <Text style={styles.templateExamChapters}>
                            74 core chapters for engineering entrance prep.
                          </Text>
                        </TouchableOpacity>

                        {/* Setup Card: UPSC */}
                        <TouchableOpacity
                          style={[
                            styles.templateCard,
                            isUpsc && styles.templateCardHighlighted,
                          ]}
                          onPress={() => handleLoadSyllabusTemplate('UPSC')}
                          activeOpacity={0.85}
                        >
                          <View style={styles.templateCardHeader}>
                            <Text style={styles.templateExamName}>UPSC Civil Services</Text>
                            {isUpsc ? (
                              <View style={styles.recommendedBadge}>
                                <Text style={styles.recommendedText}>Recommended</Text>
                              </View>
                            ) : (
                              <Award size={16} color="#FFB800" />
                            )}
                          </View>
                          <Text style={styles.templateExamSubjects}>GS Paper 1-4 • CSAT</Text>
                          <Text style={styles.templateExamChapters}>
                            24 subjects covering ethics, polity, history, and reasoning.
                          </Text>
                        </TouchableOpacity>

                        {/* Setup Card: SSC CGL */}
                        <TouchableOpacity
                          style={[
                            styles.templateCard,
                            isSsc && styles.templateCardHighlighted,
                          ]}
                          onPress={() => handleLoadSyllabusTemplate('SSC_CGL')}
                          activeOpacity={0.85}
                        >
                          <View style={styles.templateCardHeader}>
                            <Text style={styles.templateExamName}>SSC CGL</Text>
                            {isSsc ? (
                              <View style={styles.recommendedBadge}>
                                <Text style={styles.recommendedText}>Recommended</Text>
                              </View>
                            ) : (
                              <Award size={16} color="#E85858" />
                            )}
                          </View>
                          <Text style={styles.templateExamSubjects}>Quant • English • GK • Reasoning</Text>
                          <Text style={styles.templateExamChapters}>
                            30 chapters mapping syllabus topics.
                          </Text>
                        </TouchableOpacity>

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
                      <Text style={styles.setupWelcomeTitle}>Set up your skill subjects 💼</Text>
                      <Text style={styles.setupWelcomeSubtitle}>
                        Load the work skills template or build your professional development topics manually
                      </Text>

                      <View style={styles.templateCardsContainer}>
                        {/* Setup Card: Work Skills Template */}
                        <TouchableOpacity
                          style={[
                            styles.templateCard,
                            styles.templateCardHighlighted,
                          ]}
                          onPress={() => handleLoadSyllabusTemplate('WORK_SKILLS')}
                          activeOpacity={0.85}
                        >
                          <View style={styles.templateCardHeader}>
                            <Text style={styles.templateExamName}>Work Skills Development</Text>
                            <View style={styles.recommendedBadge}>
                              <Text style={styles.recommendedText}>Recommended</Text>
                            </View>
                          </View>
                          <Text style={styles.templateExamSubjects}>Technical • Soft Skills • Industry Knowledge • Leadership</Text>
                          <Text style={styles.templateExamChapters}>
                            Core subjects to log and track your professional learning.
                          </Text>
                        </TouchableOpacity>

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
                  ) : (
                    <>
                      <Text style={styles.setupWelcomeTitle}>Add your subjects manually 📚</Text>
                      <Text style={styles.setupWelcomeSubtitle}>
                        Type in your custom subjects, chapters, and topics to start tracking your learning
                      </Text>

                      <View style={styles.templateCardsContainer}>
                        {/* Custom Setup Option */}
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
          )}

          {/* ==========================================
              2. NOTES TAB
              ========================================== */}
          {selectedTab === 'notes' && (
            <View style={{ flex: 1 }}>
              {/* Horizontal filter chips and Sort row */}
              <View style={styles.filterAndSortRow}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filtersScroll}
                  style={styles.filtersScrollView}
                >
                  {filterChips.map((f) => {
                    const active = activeFilter === f.key;
                    return (
                      <TouchableOpacity
                        key={f.key}
                        style={[styles.filterChip, active && styles.filterChipActive]}
                        onPress={() => setActiveFilter(f.key)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            active && styles.filterChipTextActive,
                          ]}
                        >
                          {f.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                
                <TouchableOpacity
                  style={styles.sortButton}
                  onPress={handleShowSortOptions}
                  activeOpacity={0.7}
                >
                  <Text style={styles.sortButtonText}>
                    Sort: {sortOptionLabel} ▾
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Amber header notice when Due for Review is active */}
              {activeFilter === 'Due' && filteredNotes.length > 0 && (
                <View style={styles.dueNoticeContainer}>
                  <Text style={styles.dueNoticeText}>
                    {`📅 ${filteredNotes.length} note${
                      filteredNotes.length === 1 ? '' : 's'
                    } due for revision today`}
                  </Text>
                </View>
              )}

              {notesQuery.isLoading || dueRevisionsQuery.isLoading ? (
                <View style={styles.listScroll}>
                  <Skeleton width="100%" height={120} borderRadius={16} style={{ marginBottom: 12, marginTop: 12 }} />
                  <Skeleton width="100%" height={120} borderRadius={16} style={{ marginBottom: 12 }} />
                  <Skeleton width="100%" height={120} borderRadius={16} style={{ marginBottom: 12 }} />
                </View>
              ) : (
                <FlatList
                  ref={notesListRef}
                  data={filteredNotes}
                  keyExtractor={(item) => item.id}
                  removeClippedSubviews={Platform.OS === 'android'}
                  maxToRenderPerBatch={10}
                  windowSize={5}
                  initialNumToRender={8}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  refreshControl={
                    <RefreshControl
                      refreshing={isRefreshing}
                      onRefresh={handleRefresh}
                      colors={['#5B4FE8']}
                      tintColor="#5B4FE8"
                    />
                  }
                  contentContainerStyle={styles.listScroll}
                  keyboardDismissMode="on-drag"
                  renderItem={renderNoteItem}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <Text style={{ fontSize: 40, marginBottom: 12 }}>📝</Text>
                      <Text style={styles.emptyTitle}>No notes yet</Text>
                      <Text style={styles.emptySubtitle}>
                        Capture ideas, formulas, and concepts from your studies
                      </Text>
                      <TouchableOpacity
                        style={styles.emptyActionBtn}
                        onPress={() => router.push('/note/new')}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.emptyActionText}>+ Create Note</Text>
                      </TouchableOpacity>
                    </View>
                  }
                />
              )}
            </View>
          )}

          {/* ==========================================
              3. FLASHCARDS TAB
              ========================================== */}
          {selectedTab === 'flashcards' && (
            <View style={styles.flashcardsTabContainer}>
              {dueRevisionsQuery.isLoading || notesQuery.isLoading ? (
                <View style={{ padding: 20 }}>
                  <Skeleton width="100%" height={200} borderRadius={20} style={{ marginBottom: 16 }} />
                </View>
              ) : (
                /* Spaced Repetition Session Flow States */
                <>
                  {/* IDLE STATE: Study Session Setup Info */}
                  {studySessionState === 'idle' && (
                    <View style={styles.deckContainer}>
                      <Text style={styles.sessionHeadingTitle}>Flashcard Deck</Text>
                      
                      {flashcardDeck.length > 0 ? (
                        <View style={styles.setupDashboard}>
                          <View style={styles.dashboardMetric}>
                            <Text style={styles.dashboardMetricNumber}>
                              {flashcardDeck.length}
                            </Text>
                            <Text style={styles.dashboardMetricLabel}>
                              {reviewAllFlashcards ? 'Total Cards' : 'Cards Due Today'}
                            </Text>
                          </View>

                          {/* Subject Breakdown List */}
                          <View style={styles.breakdownBox}>
                            <Text style={styles.breakdownTitle}>SUBJECT BREAKDOWN</Text>
                            <ScrollView style={styles.breakdownScroll} showsVerticalScrollIndicator={false}>
                              {Object.keys(flashcardSubjectBreakdown).map((sub) => (
                                <View key={sub} style={styles.breakdownRow}>
                                  <Text style={styles.breakdownSubjectName}>{sub}</Text>
                                  <Text style={styles.breakdownSubjectCount}>
                                    {flashcardSubjectBreakdown[sub]}
                                  </Text>
                                </View>
                              ))}
                            </ScrollView>
                          </View>

                          <TouchableOpacity
                            style={styles.startSessionBtn}
                            onPress={handleStartReview}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.startSessionBtnText}>Start Review</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.toggleReviewModeBtn}
                            onPress={() => setReviewAllFlashcards(!reviewAllFlashcards)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.toggleReviewModeBtnText}>
                              {reviewAllFlashcards ? 'Switch to Due Revisions' : 'Switch to Review All Cards'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        /* Empty deck state */
                        <View style={styles.emptyContainer}>
                          <Text style={styles.emptyTitle}>All caught up! 🎉</Text>
                          <Text style={styles.emptySubtitle}>
                            {reviewAllFlashcards
                              ? 'No notes exist in your library. Create notes to generate flashcards.'
                              : 'You have completed all pending spaced repetition cards due for today!'}
                          </Text>

                          {!reviewAllFlashcards && (notesQuery.data || []).length > 0 ? (
                            <TouchableOpacity
                              style={styles.emptyActionBtn}
                              onPress={() => setReviewAllFlashcards(true)}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.emptyActionText}>Review All Notes</Text>
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity
                              style={styles.emptyActionBtn}
                              onPress={() => router.push('/note/new')}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.emptyActionText}>+ Create Note</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>
                  )}

                  {/* ACTIVE STATE: Study review cards */}
                  {studySessionState === 'active' && activeCard && (
                    <View style={styles.activeSessionContainer}>
                      {/* Top progress bar indicator */}
                      <View style={styles.progressBarWrapper}>
                        <View style={styles.progressBarInfo}>
                          <Text style={styles.progressBarText}>
                            {`Card ${currentCardIndex + 1} of ${currentSessionDeck.length}`}
                          </Text>
                          <Text style={styles.progressPercentText}>
                            {Math.round((currentCardIndex / currentSessionDeck.length) * 100)}%
                          </Text>
                        </View>
                        <View style={styles.progressBarOuter}>
                          <View
                            style={[
                              styles.progressBarInner,
                              {
                                width: `${(currentCardIndex / currentSessionDeck.length) * 100}%`,
                              },
                            ]}
                          />
                        </View>
                      </View>

                      {/* Card Deck Render */}
                      <View style={styles.cardsVisualStack}>
                        {/* Visual stack card 3 (back) */}
                        {currentSessionDeck.length - currentCardIndex > 2 && (
                          <View style={[styles.visualStackCard, styles.stackCard3]} />
                        )}

                        {/* Visual stack card 2 (middle) */}
                        {currentSessionDeck.length - currentCardIndex > 1 && (
                          <View style={[styles.visualStackCard, styles.stackCard2]} />
                        )}

                        {/* Active swipe card */}
                        <FlashCard
                          key={activeCard.id}
                          note={activeCard}
                          onGotIt={() => handleFlashcardGotIt(activeCard.id)}
                          onReviewAgain={() => handleFlashcardReviewAgain(activeCard.id)}
                          totalRemaining={currentSessionDeck.length - currentCardIndex}
                        />
                      </View>

                      {/* Cancel Session Button */}
                      <TouchableOpacity
                        style={styles.cancelSessionBtn}
                        onPress={() => setStudySessionState('idle')}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.cancelSessionBtnText}>End Review Session</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* COMPLETE STATE: Study Summary statistics */}
                  {studySessionState === 'complete' && (
                    <View style={styles.completeContainer}>
                      <View style={styles.completeCard}>
                        <Award size={48} color="#FFB800" style={styles.completeIcon} />
                        <Text style={styles.completeTitle}>Review Complete!</Text>
                        <Text style={styles.completeSub}>
                          Spaced repetition deck updated for this cycle.
                        </Text>

                        {/* Summary metrics box */}
                        <View style={styles.metricsBox}>
                          <View style={styles.metricRow}>
                            <View style={styles.metricLabelLeft}>
                              <CheckCircle size={16} color="#00B894" />
                              <Text style={styles.metricLabelName}>Got It</Text>
                            </View>
                            <Text style={[styles.metricValue, { color: '#00B894' }]}>
                              {gotItCount}
                            </Text>
                          </View>

                          <View style={styles.metricRow}>
                            <View style={styles.metricLabelLeft}>
                              <RotateCw size={16} color="#E85858" />
                              <Text style={styles.metricLabelName}>Review Again</Text>
                            </View>
                            <Text style={[styles.metricValue, { color: '#E85858' }]}>
                              {reviewAgainCount}
                            </Text>
                          </View>

                          <View style={styles.metricRow}>
                            <View style={styles.metricLabelLeft}>
                              <Clock size={16} color="#5B4FE8" />
                              <Text style={styles.metricLabelName}>Time Elapsed</Text>
                            </View>
                            <Text style={styles.metricValue}>
                              {sessionDuration < 60
                                ? `${Math.round(sessionDuration)}s`
                                : `${Math.floor(sessionDuration / 60)}m ${Math.round(
                                    sessionDuration % 60
                                  )}s`}
                            </Text>
                          </View>
                        </View>

                        {/* Next review recommendation text */}
                        <View style={styles.nextReviewContainer}>
                          <Clock size={14} color="#9B9BAF" />
                          <Text style={styles.nextReviewText}>{nextReviewText}</Text>
                        </View>

                        {/* Action buttons */}
                        <View style={styles.completeActions}>
                          {failedCardIds.length > 0 && (
                            <TouchableOpacity
                              style={[styles.completeBtn, styles.studyAgainBtn]}
                              onPress={handleStudyAgain}
                              activeOpacity={0.8}
                            >
                              <RotateCcw size={16} color="#FFFFFF" />
                              <Text style={styles.completeBtnText}>Study Failed Only</Text>
                            </TouchableOpacity>
                          )}

                          <TouchableOpacity
                            style={[styles.completeBtn, styles.doneBtn]}
                            onPress={() => setStudySessionState('idle')}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.doneBtnText}>Done</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  )}
                </>
              )}
            </View>
          )}
        </View>
      </SafeAreaView>

      {/* Floating Action Button (Always Visible across tabs) */}
      <QuickCaptureButton
        onPress={() => quickCaptureSheetRef.current?.expand()}
        style={selectedTab === 'flashcards' && studySessionState === 'active' ? { display: 'none' } : undefined}
      />

      {/* Quick Capture Bottom Sheet Modal */}
      <QuickCaptureSheet
        ref={quickCaptureSheetRef}
        subjects={subjectsList}
        lastUsedSubject={lastUsedSubject}
        onSave={handleQuickCaptureSave}
        isSaving={createNoteMutation.isPending}
      />

      {/* Add Topic bottom sheet form */}
      <BottomSheet
        ref={addTopicSheetRef}
        index={-1}
        snapPoints={['55%']}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        keyboardBehavior="interactive"
      >
        <BottomSheetView style={styles.addSheetContent}>
          <Text style={styles.addSheetTitle}>Add Syllabus Topic</Text>

          <Text style={styles.sheetInputLabel}>SUBJECT</Text>
          <BottomSheetTextInput
            style={styles.sheetInput}
            value={newSubject}
            onChangeText={setNewSubject}
            placeholder="e.g. Physics"
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

      {/* Loading Overlay spinner when syllabus is being loaded in batch */}
      {setupSyllabusMutation.isPending && (
        <View style={styles.setupOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.setupOverlayText}>
            {`Adding topics...`}
          </Text>
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
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E7E3',
    justifyContent: 'center',
    alignItems: 'center',
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
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginVertical: 12,
    gap: 8,
  },
  tabPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: 'transparent',
  },
  tabPillActive: {
    backgroundColor: '#5B4FE8',
  },
  tabText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#9B9BAF',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  searchBarContainer: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  searchTextInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: 'DMSans',
    fontSize: 14,
    color: '#17172A',
    height: 42,
  },
  tabContent: {
    flex: 1,
  },
  listScroll: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 100,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  emptyActionBtn: {
    backgroundColor: '#5B4FE8',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#5B4FE8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    fontWeight: '600',
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
  filtersScrollContainer: {
    height: 48,
    marginBottom: 8,
  },
  filtersScroll: {
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E7E3',
  },
  filterChipActive: {
    backgroundColor: '#EAE8FD',
    borderColor: '#5B4FE8',
  },
  filterChipText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: '#5C5C70',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#5B4FE8',
    fontWeight: '600',
  },
  dueNoticeContainer: {
    marginHorizontal: 20,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FEF3DC',
    borderColor: '#F5E0C0',
    borderWidth: 1,
    borderRadius: 10,
  },
  dueNoticeText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: '#E8A020',
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
    backgroundColor: '#F7F6FF', // soft violet tint
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
  // Flashcard Deck
  deckContainer: {
    flex: 1,
    paddingTop: 10,
    alignItems: 'center',
  },
  sessionHeadingTitle: {
    fontFamily: 'InstrumentSerif',
    fontSize: 24,
    color: '#17172A',
    marginBottom: 16,
    textAlign: 'center',
  },
  setupDashboard: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  dashboardMetric: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#17172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  dashboardMetricNumber: {
    fontFamily: 'DMMono',
    fontSize: 48,
    color: '#17172A',
    fontWeight: 'bold',
  },
  dashboardMetricLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: '#9B9BAF',
    fontWeight: '600',
    marginTop: 4,
  },
  breakdownBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    padding: 16,
    width: '100%',
    height: 180,
    shadowColor: '#17172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  breakdownTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    color: '#9B9BAF',
    fontWeight: '600',
    letterSpacing: 1.2,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F1EE',
    paddingBottom: 6,
  },
  breakdownScroll: {
    flex: 1,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F7F6F3',
  },
  breakdownSubjectName: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#17172A',
    fontWeight: '500',
  },
  breakdownSubjectCount: {
    fontFamily: 'DMMono',
    fontSize: 13,
    color: '#5B4FE8',
    fontWeight: '700',
  },
  startSessionBtn: {
    backgroundColor: '#5B4FE8',
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    shadowColor: '#5B4FE8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 10,
  },
  startSessionBtnText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleReviewModeBtn: {
    paddingVertical: 10,
  },
  toggleReviewModeBtnText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: '#5B4FE8',
    fontWeight: '600',
  },
  // Active Flashcard Session
  activeSessionContainer: {
    flex: 1,
    alignItems: 'center',
  },
  progressBarWrapper: {
    width: '100%',
    paddingHorizontal: 4,
    marginBottom: 20,
  },
  progressBarInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressBarText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: '#5C5C70',
    fontWeight: '500',
  },
  progressPercentText: {
    fontFamily: 'DMMono',
    fontSize: 12,
    color: '#5B4FE8',
    fontWeight: '700',
  },
  progressBarOuter: {
    height: 6,
    width: '100%',
    backgroundColor: '#E8E7E3',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarInner: {
    height: '100%',
    backgroundColor: '#5B4FE8',
    borderRadius: 3,
  },
  cardsVisualStack: {
    width: '100%',
    position: 'relative',
    height: 380,
    alignItems: 'center',
  },
  visualStackCard: {
    position: 'absolute',
    width: '100%',
    height: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    shadowColor: '#17172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  stackCard2: {
    transform: [{ scale: 0.96 }, { translateY: -8 }],
    opacity: 0.7,
    zIndex: 0,
  },
  stackCard3: {
    transform: [{ scale: 0.92 }, { translateY: -16 }],
    opacity: 0.4,
    zIndex: -1,
  },
  cancelSessionBtn: {
    paddingVertical: 12,
  },
  cancelSessionBtnText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: '#E85858',
    fontWeight: '600',
  },
  // Complete Flashcard Session
  completeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 10,
  },
  completeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    padding: 24,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#17172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  completeIcon: {
    marginBottom: 16,
  },
  completeTitle: {
    fontFamily: 'InstrumentSerif',
    fontSize: 26,
    color: '#17172A',
    marginBottom: 6,
  },
  completeSub: {
    fontFamily: 'DMSans',
    fontSize: 13,
    color: '#9B9BAF',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  metricsBox: {
    backgroundColor: '#F7F6F3',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    padding: 14,
    width: '100%',
    gap: 10,
    marginBottom: 16,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricLabelName: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#5C5C70',
    fontWeight: '500',
  },
  metricValue: {
    fontFamily: 'DMMono',
    fontSize: 14,
    color: '#17172A',
    fontWeight: 'bold',
  },
  nextReviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 24,
  },
  nextReviewText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: '#9B9BAF',
    fontWeight: '600',
  },
  completeActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  completeBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  studyAgainBtn: {
    backgroundColor: '#5B4FE8',
  },
  completeBtnText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    fontWeight: '600',
  },
  doneBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E7E3',
  },
  doneBtnText: {
    color: '#5C5C70',
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
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
    ...StyleSheet.absoluteFillObject,
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
  highlightTextMatched: {
    backgroundColor: '#FFEB3B',
    color: '#17172A',
    fontWeight: 'bold',
  },
  flashcardsTabContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  filterAndSortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
    gap: 8,
  },
  filtersScrollView: {
    flex: 1,
  },
  sortButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E7E3',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortButtonText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: '#5C5C70',
    fontWeight: '600',
  },
  overallHeaderContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#17172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  overallHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  ringWrapper: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringInner: {
    position: 'relative',
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringPercentTextContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringPercentText: {
    fontFamily: 'DMMono-Medium',
    fontSize: 12,
    fontWeight: '700',
    color: '#17172A',
  },
  overallHeaderTextContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  overallCompletedText: {
    fontFamily: 'DMSans',
    fontSize: 13,
    color: '#5C5C70',
  },
  examPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#EAE8FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  examPillText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    color: '#5B4FE8',
    fontWeight: '600',
  },
  subjectHeaderStickyContainer: {
    backgroundColor: '#F7F6F3',
    borderColor: '#E8E7E3',
  },
  subjectHeaderCollapsed: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    shadowColor: '#17172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginHorizontal: 20,
  },
  subjectHeaderExpanded: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderTopWidth: 1,
    shadowColor: '#17172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
    marginHorizontal: 20,
  },
  subjectHeaderClickable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderRadius: 16,
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
    fontFamily: 'DMSans-Medium',
    fontSize: 15,
    color: '#17172A',
    fontWeight: '600',
  },
  chaptersCountText: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#9B9BAF',
    marginTop: 2,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  percentText: {
    fontFamily: 'DMMono',
    fontSize: 13,
    color: '#17172A',
    fontWeight: '600',
  },
  chevronWrapper: {
    transform: [{ rotate: '0deg' }],
  },
  chevronRotated: {
    transform: [{ rotate: '90deg' }],
  },
  progressContainer: {
    height: 4,
    backgroundColor: '#E8E7E3',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
  },
  chapterRowCardWrapper: {
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E8E7E3',
    marginHorizontal: 20,
  },
  chapterRowCardWrapperLast: {
    borderBottomWidth: 1,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    marginBottom: 10,
    shadowColor: '#17172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
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
});
