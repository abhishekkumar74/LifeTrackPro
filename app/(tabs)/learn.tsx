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
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { tabScrollRefs } from '@/lib/utils/tab-scroll';
import Svg, { Circle } from 'react-native-svg';
import { useAuthStore } from '@/lib/store/auth.store';
import { getSubjectColor } from '@/lib/utils/subject-colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
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
  Sparkles,
  Clock,
  Flame,
  Check,
  RotateCcw,
  Smile,
  ChevronRight,
  ChevronDown,
  FileText,
  Pin,
  Calendar,
  Search,
  Layers,
  Zap,
  Play,
  CheckCircle2,
  Trash2,
  X,
  Target,
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
import { useFlashcards, ParsedFlashcard } from '@/lib/hooks/use-flashcards';
import {
  useSyllabus,
  useUpdateTopicStatus,
  useBulkUpdateTopics,
  useCreateTopic,
  useSetupSyllabus,
  GroupedSyllabus,
  GroupedSubject,
} from '@/lib/hooks/use-syllabus';
import { Note, SyllabusTopic, SyllabusStatus } from '@/types/app.types';
import { supabase } from '@/lib/supabase/client';

// Custom Components
import { SubjectCard } from '@/components/learn/SubjectCard';
import { ChapterRow } from '@/components/learn/ChapterRow';
import { NoteCard } from '@/components/learn/NoteCard';
import { FlashCard } from '@/components/learn/FlashCard';
import { FlashcardRow } from '@/components/learn/FlashcardRow';
import { CreateFlashcardModal } from '@/components/learn/CreateFlashcardModal';
import { QuickCaptureButton } from '@/components/learn/QuickCaptureButton';
import { QuickCaptureSheet, QuickCaptureSheetRef } from '@/components/learn/QuickCaptureSheet';
import { Skeleton } from '@/components/shared/Skeleton';
import { ErrorState } from '@/components/shared/ErrorState';

// Syllabus Templates
import { SYLLABUS_TEMPLATES, getTemplateForExam } from '@/lib/utils/syllabus-templates';
import { CSE_SYLLABUS } from '@/lib/utils/cse-syllabus-templates';
import { useExams, fetchExamSyllabusTopics } from '@/lib/hooks/use-exams';

type TabType = 'syllabus' | 'notes' | 'flashcards';
type FilterType = string;
type StudySessionState = 'idle' | 'active' | 'complete';

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

const getExamIcon = (slugOrName: string = ''): string => {
  const s = slugOrName.toLowerCase();
  if (s.includes('btech') || s.includes('cse') || s.includes('computer')) return '💻';
  if (s.includes('ssc') || s.includes('cgl') || s.includes('chsl') || s.includes('mts')) return '🏛️';
  if (s.includes('rrb') || s.includes('railway') || s.includes('rpf') || s.includes('ntpc') || s.includes('alp')) return '🚆';
  if (s.includes('neet') || s.includes('medical') || s.includes('aiims')) return '🩺';
  if (s.includes('jee') || s.includes('engineering') || s.includes('iit')) return '⚡';
  if (s.includes('upsc') || s.includes('ias') || s.includes('ips') || s.includes('civil')) return '🇮🇳';
  if (s.includes('gate')) return '🎯';
  if (s.includes('cat') || s.includes('mba') || s.includes('mat')) return '📈';
  if (s.includes('bank') || s.includes('ibps') || s.includes('sbi') || s.includes('po')) return '🏦';
  if (s.includes('board') || s.includes('12') || s.includes('10') || s.includes('cbse') || s.includes('icse')) return '📚';
  return '🎯';
};

export default function LearnScreen(): React.JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [selectedTab, setSelectedTab] = useState<TabType>(
    params.tab === 'flashcards' || params.tab === 'notes' || params.tab === 'syllabus'
      ? (params.tab as TabType)
      : 'syllabus'
  );

  // Sync selected tab with navigation params (e.g. from Review banner on Home)
  useEffect(() => {
    if (params.tab === 'flashcards') {
      setSelectedTab('flashcards');
    } else if (params.tab === 'notes') {
      setSelectedTab('notes');
    } else if (params.tab === 'syllabus') {
      setSelectedTab('syllabus');
    }
  }, [params.tab]);
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeExamFilter, setActiveExamFilter] = useState<string>('all');
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);

  // Sheet visibility states to prevent auto-opening on tab mount
  const [isAddTopicOpen, setIsAddTopicOpen] = useState(false);
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);
  const [isCreateFlashcardOpen, setIsCreateFlashcardOpen] = useState(false);
  const [flashcardFilter, setFlashcardFilter] = useState<string>('All');

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

  useAndroidBackHandler(() => {
    if (isGoalModalOpen) {
      setIsGoalModalOpen(false);
      return true;
    }
    if (isCreateFlashcardOpen) {
      setIsCreateFlashcardOpen(false);
      return true;
    }
    if (isQuickCaptureOpen) {
      setIsQuickCaptureOpen(false);
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
    if (studySessionState === 'active') {
      setStudySessionState('idle');
      return true;
    }
    return false;
  });

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

  const sectionsRef = useRef<any[]>([]);

  useEffect(() => {
    tabScrollRefs['learn'] = {
      current: {
        scrollTo: () => {
          try {
            if (selectedTabRef.current === 'syllabus') {
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
            } else if (selectedTabRef.current === 'notes') {
              notesListRef.current?.scrollToOffset({ offset: 0, animated: true });
            }
          } catch {
            // Guard against SectionList unmounted / out-of-range errors
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

  // Flashcards Hook
  const {
    parsedCards,
    dueCards,
    cardsBySubject,
    isLoading: isFlashcardsLoading,
    createFlashcard,
    isCreating: isCreatingFlashcard,
    seedStarterFlashcards,
    isSeeding: isSeedingFlashcards,
    deleteFlashcard,
    refetch: refetchFlashcards,
  } = useFlashcards();

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
    } else if (selectedTab === 'notes') {
      await notesQuery.refetch();
      await dueRevisionsQuery.refetch();
    } else {
      await refetchFlashcards();
    }
    setIsRefreshing(false);
  }, [selectedTab, syllabusQuery, notesQuery, dueRevisionsQuery, refetchFlashcards]);

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
    reviewNoteMutation.mutate(
      { noteId, quality: 4 },
      {
        onSuccess: () => {
          refetchFlashcards();
        },
      }
    );

    setGotItCount((prev) => prev + 1);
    moveToNextCard();
  }, [reviewNoteMutation, moveToNextCard, refetchFlashcards]);

  const handleFlashcardReviewAgain = useCallback((noteId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    reviewNoteMutation.mutate(
      { noteId, quality: 1 },
      {
        onSuccess: () => {
          refetchFlashcards();
        },
      }
    );

    setReviewAgainCount((prev) => prev + 1);
    setFailedCardIds((prev) => [...prev, noteId]);
    moveToNextCard();
  }, [reviewNoteMutation, moveToNextCard, refetchFlashcards]);

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

    // Exclude flashcards from the regular Notes list so notes stay clean
    list = list.filter(
      (n) =>
        !n.tags?.includes('flashcard') &&
        !n.tags?.some((t) => t.startsWith('parent:')) &&
        !n.content?.startsWith('{"front":')
    );

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

  const masteredFlashcardsCount = useMemo(() => {
    return parsedCards.filter((c) => c.review_count >= 3).length;
  }, [parsedCards]);

  const filteredFlashcards = useMemo(() => {
    let list = parsedCards;
    if (flashcardFilter === 'Due Today') {
      list = dueCards;
    } else if (flashcardFilter !== 'All') {
      list = list.filter((c) => c.subject === flashcardFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.front.toLowerCase().includes(q) ||
          c.back.toLowerCase().includes(q) ||
          c.subject.toLowerCase().includes(q)
      );
    }
    return list;
  }, [parsedCards, dueCards, flashcardFilter, searchQuery]);

  const activeCard = currentSessionDeck[currentCardIndex];

  const handleTabPress = useCallback((tab: TabType) => {
    setSelectedTab(tab);
    setSearchQuery(''); // Clear search on tab switch
    if (tab !== 'flashcards') {
      setStudySessionState('idle'); // Reset flashcard session if user leaves tab
    }
  }, []);

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
            getTemplateForExam('JEE Main') ||
            SYLLABUS_TEMPLATES[key.toUpperCase().replace(/-/g, '_')];
          if (template && template.topics.length > 0) {
            templateName = template.name;
            topics = template.topics.map((t) => ({
              ...t,
              exam_slug: key,
            }));
          }
        }

        if (!topics || topics.length === 0) {
          Alert.alert('No syllabus found', `Could not find syllabus topics for ${key}.`);
          return;
        }

        // 3. Directly load syllabus into DB & update state
        await setupSyllabusMutation.mutateAsync(topics);
        setActiveExamFilter('all');
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

  // Dynamic exams list from database / curriculum
  const examsQuery = useExams({ category: 'student' });
  const studentExams = examsQuery.data || [];

  const userSelectedExams = useMemo(() => {
    // 1. Clean out category markers like 'cse_student'
    const rawSubCats = (profile?.sub_category || []).filter((s) => s !== 'cse_student');
    if (rawSubCats.length === 0 && (profile?.category === 'cse_student' || (profile?.category as string) === 'student')) {
      rawSubCats.push('btech-cse');
    }
    if (rawSubCats.length === 0) return [];

    // Deduplicate normalized slugs
    const seen = new Set<string>();
    const uniqueSubCats: string[] = [];
    for (const s of rawSubCats) {
      const lower = s.toLowerCase().trim();
      const normKey = lower === 'cse' || lower.includes('btech') ? 'btech-cse' : lower;
      if (!seen.has(normKey)) {
        seen.add(normKey);
        uniqueSubCats.push(s);
      }
      if (uniqueSubCats.length >= 2) break;
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
      const displayName = subCat.replace(/^cse_student$/i, 'B.Tech CSE');
      return { id: subCat, slug: subCat, name: displayName, short_name: displayName, color: '#5B4FE8' };
    });
  }, [profile?.sub_category, profile?.category, studentExams]);

  const getExamsForSubjectGroup = useCallback(
    (subjectName: string, groupedSub: GroupedSubject) => {
      const slugs = groupedSub.examSlugs || [];
      if (slugs.length > 0) {
        const matches = userSelectedExams.filter((e) =>
          slugs.includes((e.slug || '').toLowerCase()) ||
          slugs.includes((e.id || '').toLowerCase()) ||
          ((e.slug === 'btech-cse' || e.id === 'btech-cse') && slugs.includes('btech-cse'))
        );
        if (matches.length > 0) return matches;
      }

      // Keyword fallback for Many-to-Many matching
      const subLower = (groupedSub.subject || subjectName).toLowerCase();
      const matched: typeof userSelectedExams = [];
      for (const exam of userSelectedExams) {
        const slug = (exam.slug || '').toLowerCase();
        const name = (exam.name || '').toLowerCase();

        // NEET subjects: Bio, Phys, Chem
        if (slug.includes('neet') || name.includes('neet')) {
          if (subLower.includes('bio') || subLower.includes('phys') || subLower.includes('chem')) {
            matched.push(exam);
          }
        }
        // JEE Main & Advanced subjects: Math, Phys, Chem
        else if (slug.includes('jee') || name.includes('jee')) {
          if (subLower.includes('math') || subLower.includes('phys') || subLower.includes('chem')) {
            matched.push(exam);
          }
        }
        // B.Tech CSE: ONLY match Computer Science subjects
        else if (slug.includes('cse') || slug.includes('btech') || name.includes('cse')) {
          if (isComputerScienceSubject(subLower)) {
            matched.push(exam);
          }
        }
        // SSC CGL
        else if (slug.includes('ssc') || name.includes('ssc') || slug.includes('cgl')) {
          if (['quant', 'arithmetic', 'reasoning', 'english', 'general awareness', 'gk'].some((k) => subLower.includes(k))) {
            matched.push(exam);
          }
        }
        // Railways / RPF / RRB
        else if (slug.includes('rrb') || slug.includes('rpf') || name.includes('railway') || name.includes('rrb') || name.includes('rpf')) {
          if (['math', 'arithmetic', 'reasoning', 'general science', 'general awareness', 'technical', 'traffic', 'operating'].some((k) => subLower.includes(k))) {
            matched.push(exam);
          }
        }
      }
      return matched;
    },
    [userSelectedExams]
  );

  const unimportedExams = useMemo(() => {
    const data = syllabusQuery.data || {};
    const groupKeys = Object.keys(data);
    if (groupKeys.length === 0) return [];

    return userSelectedExams.filter((exam) => {
      const slug = (exam.slug || '').toLowerCase();
      return !groupKeys.some((k) => {
        const sub = data[k];
        const slugs = sub.examSlugs || [];
        if (slugs.includes(slug) || slugs.includes(exam.id)) return true;
        const kLower = k.toLowerCase();
        if (slug.includes('neet') && kLower.includes('bio')) return true;
        if (slug.includes('jee') && kLower.includes('math')) return true;
        if (slug.includes('cse') && kLower.includes('data structure')) return true;
        if (slug.includes('ssc') && kLower.includes('quant')) return true;
        return false;
      });
    });
  }, [syllabusQuery.data, userSelectedExams]);

  const examName = useMemo(() => {
    if (userSelectedExams.length > 0) {
      return userSelectedExams.map((e) => e.name).join(' • ');
    }
    if (profile?.category) {
      return profile.category.charAt(0).toUpperCase() + profile.category.slice(1);
    }
    return 'General';
  }, [userSelectedExams, profile]);

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

  // Exam-by-Exam M:N breakdown metrics (shared subjects boost both exams!)
  const examMetrics = useMemo(() => {
    const data = syllabusQuery.data || {};
    return userSelectedExams.map((exam) => {
      let total = 0;
      let completed = 0;
      const slug = (exam.slug || '').toLowerCase();
      const name = (exam.name || '').toLowerCase();

      Object.keys(data).forEach((subName) => {
        const sub = data[subName];
        const subLower = subName.toLowerCase();
        const slugs = sub.examSlugs || [];

        const isApplicable =
          slugs.includes(slug) ||
          slugs.includes(exam.id) ||
          ((slug.includes('neet') || name.includes('neet')) && ['physics', 'chemistry', 'biology'].some((k) => subLower.includes(k))) ||
          ((slug.includes('jee') || name.includes('jee')) && ['physics', 'chemistry', 'mathematics'].some((k) => subLower.includes(k))) ||
          ((slug.includes('cse') || slug.includes('btech')) && isComputerScienceSubject(subLower)) ||
          ((slug.includes('ssc') || name.includes('ssc')) && ['quant', 'reason', 'english', 'gk'].some((k) => subLower.includes(k))) ||
          ((slug.includes('rrb') || slug.includes('rpf')) && ['math', 'arithmetic', 'reason', 'general science', 'awareness', 'technical'].some((k) => subLower.includes(k)));

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
  }, [syllabusQuery.data, userSelectedExams]);

  // Auto-select user's primary target exam on mount to prevent mixed-syllabus confusion
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

    // 1. Filter: If activeExamFilter !== 'all', only include subjects that match that specific exam
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

    // 2. Sort: GROUP BY EXAM! All subjects of Exam A together, then all subjects of Exam B together!
    activeSubjects.sort((a, b) => {
      const subA = filteredSyllabus[a];
      const subB = filteredSyllabus[b];
      const examsA = getExamsForSubjectGroup(a, subA);
      const examsB = getExamsForSubjectGroup(b, subB);

      // Shared subjects first if any
      if (examsA.length !== examsB.length) {
        return examsB.length - examsA.length;
      }

      // Group by exam primary name/slug so all subjects of the same exam stay contiguous!
      const examNameA = examsA[0]?.name || examsA[0]?.slug || 'General';
      const examNameB = examsB[0]?.name || examsB[0]?.slug || 'General';

      if (examNameA !== examNameB) {
        return examNameA.localeCompare(examNameB);
      }

      // Within the same exam, sort alphabetically
      return a.localeCompare(b);
    });

    let lastExamKey = '';
    return activeSubjects.map((subjectName) => {
      const groupedSub = filteredSyllabus[subjectName];
      const isExpanded = expandedSubjects.includes(subjectName);
      const chapters = Object.keys(groupedSub.chapters);

      // Calculate complete chapters count
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
  }, [filteredSyllabus, expandedSubjects, getExamsForSubjectGroup, userSelectedExams, activeExamFilter]);

  useEffect(() => {
    sectionsRef.current = sections;
  }, [sections]);

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
      { key: 'Pinned', label: 'Pinned' },
      { key: 'Due', label: 'Due for Review' },
    ];
    const subjectChips = availableSubjects.map((sub) => ({
      key: sub,
      label: sub,
    }));
    return [...baseChips, ...subjectChips];
  }, [availableSubjects]);

  const subjectsList = useMemo(() => {
    const list = new Set<string>();
    availableSubjects.forEach((sub) => list.add(sub));
    Object.keys(syllabusQuery.data || {}).forEach((sub) => list.add(sub));
    if (list.size === 0) {
      list.add('General');
    }
    list.add('Other');
    return Array.from(list);
  }, [availableSubjects, syllabusQuery.data]);

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
          setIsQuickCaptureOpen(false);
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

  const handleStartReview = useCallback((customDeck?: Note[]) => {
    let deck = customDeck;
    if (!deck || deck.length === 0) {
      deck = dueCards.length > 0
        ? dueCards.map((c) => c.rawNote)
        : parsedCards.map((c) => c.rawNote);
    }

    if (!deck || deck.length === 0) {
      Alert.alert('No Flashcards', 'Please create flashcards or load starter cards first.');
      return;
    }

    setCurrentSessionDeck([...deck]);
    setCurrentCardIndex(0);
    setGotItCount(0);
    setReviewAgainCount(0);
    setFailedCardIds([]);
    setSessionStartTime(Date.now());
    setStudySessionState('active');
  }, [dueCards, parsedCards]);

  const handleSeedStarterCards = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const activeSubjects = userSelectedExams.length > 0
        ? userSelectedExams.map((e) => e.name)
        : availableSubjects;
      await seedStarterFlashcards(activeSubjects);
      Alert.alert('Success', 'High-yield starter flashcards loaded successfully for your subjects!');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to seed starter cards.');
    }
  }, [userSelectedExams, availableSubjects, seedStarterFlashcards]);

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
              onPress={() => {
                if (selectedTab === 'flashcards') {
                  setIsCreateFlashcardOpen(true);
                } else {
                  router.push('/note/new');
                }
              }}
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
                        {/* Active Goal Dropdown Trigger Card */}
                        <View style={styles.goalActiveMainCard}>
                          <View style={styles.goalActiveTopRow}>
                            <TouchableOpacity
                              style={styles.goalDropdownTrigger}
                              onPress={() => setIsGoalModalOpen(true)}
                              activeOpacity={0.7}
                            >
                              <View style={[styles.goalEmojiBadge, { backgroundColor: `${activeGoalColor}15` }]}>
                                <Text style={{ fontSize: 18 }}>
                                  {activeExamObj ? getExamIcon(activeExamObj.slug || activeExamObj.name) : '🌐'}
                                </Text>
                              </View>
                              <View style={styles.goalDropdownTextContainer}>
                                <Text style={styles.goalDropdownSmallLabel}>ACTIVE GOAL</Text>
                                <View style={styles.goalDropdownNameRow}>
                                  <Text style={styles.goalDropdownNameText} numberOfLines={1}>
                                    {activeExamObj ? activeExamObj.name : 'All Goals & Subjects'}
                                  </Text>
                                  <ChevronDown size={15} color="#5C5C70" style={{ marginLeft: 4 }} />
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
                              {userSelectedExams.map((exam) => {
                                const isActive =
                                  activeExamFilter === (exam.slug || exam.id || exam.name);
                                const color = exam.color || '#5B4FE8';
                                const examEmoji = getExamIcon(exam.slug || exam.name);
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
                                    <Text style={styles.goalQuickChipEmoji}>{examEmoji}</Text>
                                    <Text
                                      style={[
                                        styles.goalQuickChipText,
                                        isActive && styles.goalQuickChipTextActive,
                                      ]}
                                    >
                                      {shortLabel}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}

                              <TouchableOpacity
                                style={[
                                  styles.goalQuickChip,
                                  activeExamFilter === 'all' && styles.goalQuickChipActiveAll,
                                ]}
                                onPress={() => setActiveExamFilter('all')}
                                activeOpacity={0.7}
                              >
                                <Text style={styles.goalQuickChipEmoji}>🌐</Text>
                                <Text
                                  style={[
                                    styles.goalQuickChipText,
                                    activeExamFilter === 'all' && styles.goalQuickChipTextActiveAll,
                                  ]}
                                >
                                  All Subjects
                                </Text>
                              </TouchableOpacity>
                            </ScrollView>
                          )}
                        </View>
                      </View>
                    );
                  }}
                  renderSectionHeader={({ section }: any) => {
                    const isExpandedWithChapters = section.isExpanded && section.data.length > 0;
                    const accentColor = getSubjectColor(section.title);
                    
                    // Get CSE icon if applicable
                    const cseIcon = userCategory === 'cse_student' ? (CSE_SYLLABUS[section.title]?.icon || null) : null;

                    return (
                      <View>
                        {/* Exam Group Header Divider when viewing All Subjects */}
                        {section.isFirstInExamGroup && userSelectedExams.length > 1 && activeExamFilter === 'all' && (
                          <View style={styles.examGroupSectionHeader}>
                            <View style={[styles.examGroupDot, { backgroundColor: section.groupExamColor }]} />
                            <Text style={styles.examGroupTitle}>
                              {section.groupExamName}
                            </Text>
                            <View style={[styles.examGroupBadge, { backgroundColor: `${section.groupExamColor}18` }]}>
                              <Text style={[styles.examGroupBadgeText, { color: section.groupExamColor }]}>
                                TARGET
                              </Text>
                            </View>
                          </View>
                        )}

                        <View style={[
                          styles.subjectHeaderStickyContainer,
                          isExpandedWithChapters ? styles.subjectHeaderExpanded : styles.subjectHeaderCollapsed
                        ]}>
                        <TouchableOpacity
                          onPress={() => toggleSubjectExpanded(section.key)}
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
                              <View style={styles.subjectTitleRow}>
                                <Text style={styles.subjectText}>{section.title}</Text>
                                {section.exams && section.exams.length > 0 && (
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    {section.exams.map((exam: any) => {
                                      const label = exam.short_name || (exam.slug === 'btech-cse' ? 'B.Tech CSE' : (exam.name.length > 15 ? exam.name.substring(0, 14) + '…' : exam.name));
                                      return (
                                        <View
                                          key={exam.id || exam.slug}
                                          style={[
                                            styles.subjectExamTag,
                                            { backgroundColor: `${exam.color || '#5B4FE8'}18` },
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
                    </View>
                  );
                }}
                  renderItem={({ item: chapterName, index, section }: any) => {
                    const groupedSub = section.groupedSub || filteredSyllabus[section.key] || filteredSyllabus[section.title];
                    const topicsList = groupedSub?.chapters[chapterName] || [];
                    const chapterKey = `${section.key}-${chapterName}`;
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
                  ) : userCategory === 'student' ? (
                    <>
                      <Text style={styles.setupWelcomeTitle}>Set up your syllabus</Text>
                      <Text style={styles.setupWelcomeSubtitle}>
                        Choose your exam to load recommended template or add manually
                      </Text>

                      <View style={styles.templateCardsContainer}>
                        {/* Dynamic Exams loaded from Database / Master Curriculum */}
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
                              onPress={() => handleLoadSyllabusTemplate(exam.id || exam.slug || exam.name)}
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
                      <Text style={styles.setupWelcomeTitle}>Add your subjects manually</Text>
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
                    {`${filteredNotes.length} note${
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
                      <View style={{ marginBottom: 12 }}>
                        <FileText size={40} color="#5B4FE8" />
                      </View>
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
              {isFlashcardsLoading ? (
                <View style={{ padding: 20 }}>
                  <Skeleton width="100%" height={160} borderRadius={20} style={{ marginBottom: 16 }} />
                  <Skeleton width="100%" height={70} borderRadius={16} style={{ marginBottom: 12 }} />
                  <Skeleton width="100%" height={70} borderRadius={16} style={{ marginBottom: 12 }} />
                </View>
              ) : (
                <>
                  {/* IDLE STATE: Flashcards Hub & Library */}
                  {studySessionState === 'idle' && (
                    <ScrollView
                      style={styles.flashcardsHubScroll}
                      contentContainerStyle={styles.flashcardsHubContent}
                      showsVerticalScrollIndicator={false}
                      keyboardShouldPersistTaps="handled"
                    >
                      {/* Hero Hub Card */}
                      <View style={styles.flashcardHeroCard}>
                        <View style={styles.flashcardHeroTop}>
                          <View style={styles.flashcardHeroLeft}>
                            <View style={styles.flashcardSparkleCircle}>
                              <Zap size={16} color="#5B4FE8" />
                            </View>
                            <View>
                              <Text style={styles.flashcardHeroTitle}>Active Recall</Text>
                              <Text style={styles.flashcardHeroSubtitle}>
                                Test memory & reinforce spaced repetition
                              </Text>
                            </View>
                          </View>
                          <TouchableOpacity
                            style={styles.heroAddCardBtn}
                            onPress={() => setIsCreateFlashcardOpen(true)}
                            activeOpacity={0.8}
                          >
                            <Plus size={14} color="#5B4FE8" />
                            <Text style={styles.heroAddCardBtnText}>New Card</Text>
                          </TouchableOpacity>
                        </View>

                        {/* Metric Row */}
                        <View style={styles.heroMetricsRow}>
                          <View style={styles.heroMetricBox}>
                            <Text style={styles.heroMetricNum}>{parsedCards.length}</Text>
                            <Text style={styles.heroMetricLabel}>Total Cards</Text>
                          </View>

                          <View style={[styles.heroMetricBox, dueCards.length > 0 && styles.heroMetricBoxDue]}>
                            <Text style={[styles.heroMetricNum, dueCards.length > 0 && { color: '#E8A020' }]}>
                              {dueCards.length}
                            </Text>
                            <Text style={styles.heroMetricLabel}>Due Today</Text>
                          </View>

                          <View style={styles.heroMetricBox}>
                            <Text style={[styles.heroMetricNum, { color: '#00B894' }]}>
                              {masteredFlashcardsCount}
                            </Text>
                            <Text style={styles.heroMetricLabel}>Mastered</Text>
                          </View>
                        </View>

                        {/* Action Buttons inside Hero */}
                        <View style={styles.heroActionsWrap}>
                          {dueCards.length > 0 ? (
                            <>
                              <TouchableOpacity
                                style={styles.heroStartDueBtn}
                                onPress={() => handleStartReview(dueCards.map((c) => c.rawNote))}
                                activeOpacity={0.8}
                              >
                                <Zap size={16} color="#FFFFFF" />
                                <Text style={styles.heroStartDueBtnText}>
                                  Start Daily Review ({dueCards.length} Due)
                                </Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={styles.heroPracticeAllBtn}
                                onPress={() => handleStartReview(parsedCards.map((c) => c.rawNote))}
                                activeOpacity={0.7}
                              >
                                <RotateCw size={14} color="#5C5C70" />
                                <Text style={styles.heroPracticeAllBtnText}>
                                  Practice All Cards ({parsedCards.length})
                                </Text>
                              </TouchableOpacity>
                            </>
                          ) : parsedCards.length > 0 ? (
                            <TouchableOpacity
                              style={styles.heroStartDueBtn}
                              onPress={() => handleStartReview(parsedCards.map((c) => c.rawNote))}
                              activeOpacity={0.8}
                            >
                              <RotateCw size={16} color="#FFFFFF" />
                              <Text style={styles.heroStartDueBtnText}>
                                Practice All Cards ({parsedCards.length})
                              </Text>
                            </TouchableOpacity>
                          ) : (
                            <View style={styles.zeroCardsActions}>
                              <TouchableOpacity
                                style={styles.heroSeedBtn}
                                onPress={handleSeedStarterCards}
                                activeOpacity={0.8}
                                disabled={isSeedingFlashcards}
                              >
                                {isSeedingFlashcards ? (
                                  <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                  <>
                                    <Sparkles size={16} color="#FFFFFF" />
                                    <Text style={styles.heroSeedBtnText}>
                                      Load High-Yield Exam Cards
                                    </Text>
                                  </>
                                )}
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={styles.heroCreateFirstBtn}
                                onPress={() => setIsCreateFlashcardOpen(true)}
                                activeOpacity={0.8}
                              >
                                <Plus size={16} color="#5B4FE8" />
                                <Text style={styles.heroCreateFirstBtnText}>
                                  Create Custom Card
                                </Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      </View>

                      {/* Subject Filter Chips */}
                      {parsedCards.length > 0 && (
                        <View style={styles.flashcardFilterRow}>
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.flashcardFiltersScroll}
                          >
                            <TouchableOpacity
                              style={[
                                styles.flashcardFilterChip,
                                flashcardFilter === 'All' && styles.flashcardFilterChipActive,
                              ]}
                              onPress={() => setFlashcardFilter('All')}
                              activeOpacity={0.7}
                            >
                              <Text
                                style={[
                                  styles.flashcardFilterChipText,
                                  flashcardFilter === 'All' && styles.flashcardFilterChipTextActive,
                                ]}
                              >
                                All ({parsedCards.length})
                              </Text>
                            </TouchableOpacity>

                            {dueCards.length > 0 && (
                              <TouchableOpacity
                                style={[
                                  styles.flashcardFilterChip,
                                  flashcardFilter === 'Due Today' && styles.flashcardFilterChipActiveDue,
                                ]}
                                onPress={() => setFlashcardFilter('Due Today')}
                                activeOpacity={0.7}
                              >
                                <Clock size={11} color={flashcardFilter === 'Due Today' ? '#FFFFFF' : '#E8A020'} />
                                <Text
                                  style={[
                                    styles.flashcardFilterChipText,
                                    flashcardFilter === 'Due Today' && styles.flashcardFilterChipTextActiveDue,
                                  ]}
                                >
                                  Due Today ({dueCards.length})
                                </Text>
                              </TouchableOpacity>
                            )}

                            {Object.keys(cardsBySubject).map((sub) => {
                              const count = cardsBySubject[sub].length;
                              const isSelected = flashcardFilter === sub;
                              const color = getSubjectColor(sub);
                              return (
                                <TouchableOpacity
                                  key={sub}
                                  style={[
                                    styles.flashcardFilterChip,
                                    isSelected && { borderColor: color, backgroundColor: `${color}15` },
                                  ]}
                                  onPress={() => setFlashcardFilter(sub)}
                                  activeOpacity={0.7}
                                >
                                  <Text
                                    style={[
                                      styles.flashcardFilterChipText,
                                      isSelected && { color: color, fontWeight: '700' },
                                    ]}
                                  >
                                    {sub} ({count})
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>
                        </View>
                      )}

                      {/* Search Bar when cards exist */}
                      {parsedCards.length > 0 && (
                        <View style={styles.flashcardSearchWrap}>
                          <Search size={15} color="#9B9BAF" />
                          <TextInput
                            style={styles.flashcardSearchInput}
                            placeholder="Search questions or answers..."
                            placeholderTextColor="#9B9BAF"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            clearButtonMode="while-editing"
                          />
                        </View>
                      )}

                      {/* Cards Library List */}
                      <View style={styles.cardsLibrarySection}>
                        <View style={styles.cardsLibraryHeader}>
                          <Text style={styles.cardsLibraryTitle}>
                            CARDS LIBRARY ({filteredFlashcards.length})
                          </Text>
                          {filteredFlashcards.length > 0 && (
                            <TouchableOpacity
                              onPress={() => handleStartReview(filteredFlashcards.map((c) => c.rawNote))}
                              style={styles.practiceFilteredBtn}
                              activeOpacity={0.7}
                            >
                              <Play size={12} color="#5B4FE8" fill="#5B4FE8" />
                              <Text style={styles.practiceFilteredBtnText}>Practice Filtered</Text>
                            </TouchableOpacity>
                          )}
                        </View>

                        {filteredFlashcards.length > 0 ? (
                          filteredFlashcards.map((card) => (
                            <FlashcardRow
                              key={card.id}
                              card={card}
                              onDelete={deleteFlashcard}
                            />
                          ))
                        ) : parsedCards.length > 0 ? (
                          <View style={styles.emptyFilteredCards}>
                            <Text style={styles.emptyFilteredTitle}>No cards match your filter</Text>
                            <Text style={styles.emptyFilteredSub}>
                              Try selecting "All" or modifying your search terms.
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.emptyDeckState}>
                            <View style={styles.emptyDeckIconCircle}>
                              <Layers size={36} color="#5B4FE8" />
                            </View>
                            <Text style={styles.emptyDeckTitle}>No Flashcards Yet</Text>
                            <Text style={styles.emptyDeckSubtitle}>
                              Flashcards help you master key formulas, reactions, and concepts through active recall.
                            </Text>
                            <View style={styles.emptyDeckButtons}>
                              <TouchableOpacity
                                style={styles.emptyDeckPrimaryBtn}
                                onPress={handleSeedStarterCards}
                                activeOpacity={0.8}
                                disabled={isSeedingFlashcards}
                              >
                                <Sparkles size={16} color="#FFFFFF" />
                                <Text style={styles.emptyDeckPrimaryBtnText}>
                                  Load High-Yield Starter Deck
                                </Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={styles.emptyDeckSecondaryBtn}
                                onPress={() => setIsCreateFlashcardOpen(true)}
                                activeOpacity={0.8}
                              >
                                <Plus size={16} color="#5B4FE8" />
                                <Text style={styles.emptyDeckSecondaryBtnText}>
                                  + Create Custom Card
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}
                      </View>
                    </ScrollView>
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
                            {Math.round(((currentCardIndex + 1) / currentSessionDeck.length) * 100)}%
                          </Text>
                        </View>
                        <View style={styles.progressBarOuter}>
                          <View
                            style={[
                              styles.progressBarInner,
                              {
                                width: `${((currentCardIndex + 1) / currentSessionDeck.length) * 100}%`,
                              },
                            ]}
                          />
                        </View>
                      </View>

                      {/* Card Deck Render */}
                      <View style={styles.cardsVisualStack}>
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
                            onPress={() => {
                              refetchFlashcards();
                              setStudySessionState('idle');
                            }}
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
        onPress={() => {
          if (selectedTab === 'flashcards') {
            setIsCreateFlashcardOpen(true);
          } else {
            setIsQuickCaptureOpen(true);
          }
        }}
        style={selectedTab === 'flashcards' && studySessionState === 'active' ? { display: 'none' } : undefined}
      />

      {/* Goal Switcher Modal */}
      <Modal
        visible={isGoalModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsGoalModalOpen(false)}
      >
        <View style={styles.goalModalBackdrop}>
          <TouchableWithoutFeedback onPress={() => setIsGoalModalOpen(false)}>
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
                    <Text style={{ fontSize: 20 }}>🌐</Text>
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

              {/* Individual Target Exams */}
              {userSelectedExams.map((exam) => {
                const isSelected =
                  activeExamFilter === (exam.slug || exam.id || exam.name);
                const metric = examMetrics.find(
                  (m) =>
                    (m.exam.slug || '').toLowerCase() === (exam.slug || '').toLowerCase() ||
                    m.exam.id === exam.id ||
                    m.exam.name.toLowerCase() === exam.name.toLowerCase()
                ) || { total: 0, completed: 0, percent: 0 };
                const hasCurriculum = metric.total > 0;
                const examEmoji = getExamIcon(exam.slug || exam.name);
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
                        <Text style={{ fontSize: 20 }}>{examEmoji}</Text>
                      </View>
                      <View style={styles.goalOptionTextWrap}>
                        <View style={styles.goalOptionTitleRow}>
                          <Text style={styles.goalOptionTitle}>{exam.name}</Text>
                          {isSelected && (
                            <View style={[styles.goalActiveIndicator, { backgroundColor: color }]}>
                              <Check size={12} color="#FFFFFF" />
                            </View>
                          )}
                        </View>
                        <Text style={styles.goalOptionSubtitle}>
                          {hasCurriculum
                            ? `${metric.completed} of ${metric.total} topics completed`
                            : 'Curriculum not imported yet'}
                        </Text>
                      </View>
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
        </View>
      </Modal>

      {/* Create Flashcard Modal */}
      <CreateFlashcardModal
        visible={isCreateFlashcardOpen}
        onClose={() => setIsCreateFlashcardOpen(false)}
        subjects={subjectsList}
        initialSubject={flashcardFilter !== 'All' && flashcardFilter !== 'Due Today' ? flashcardFilter : undefined}
        onSave={async (payload) => {
          await createFlashcard(payload);
        }}
      />

      {/* Quick Capture Bottom Sheet Modal */}
      <QuickCaptureSheet
        ref={quickCaptureSheetRef}
        isVisible={isQuickCaptureOpen}
        onClose={() => setIsQuickCaptureOpen(false)}
        subjects={subjectsList}
        lastUsedSubject={lastUsedSubject}
        onSave={handleQuickCaptureSave}
        isSaving={createNoteMutation.isPending}
      />

      {/* Add Topic bottom sheet form (guarded so it never auto-opens on mount) */}
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
  flashcardsHubScroll: {
    flex: 1,
  },
  flashcardsHubContent: {
    paddingBottom: 40,
    gap: 14,
  },
  flashcardHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    padding: 16,
    shadowColor: '#17172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 14,
  },
  flashcardHeroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flashcardHeroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  flashcardSparkleCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F0EFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flashcardHeroTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 16,
    color: '#17172A',
    fontWeight: '700',
  },
  flashcardHeroSubtitle: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#9B9BAF',
    marginTop: 1,
  },
  heroAddCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#F0EFFF',
    borderWidth: 1,
    borderColor: '#ECE9FD',
  },
  heroAddCardBtnText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    color: '#5B4FE8',
    fontWeight: '700',
  },
  heroMetricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  heroMetricBox: {
    flex: 1,
    backgroundColor: '#FAF9F6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F2F1EE',
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  heroMetricBoxDue: {
    backgroundColor: '#FFFBF0',
    borderColor: '#FCE8C3',
  },
  heroMetricNum: {
    fontFamily: 'DMMono-Medium',
    fontSize: 20,
    fontWeight: '700',
    color: '#17172A',
  },
  heroMetricLabel: {
    fontFamily: 'DMSans',
    fontSize: 10,
    color: '#5C5C70',
    marginTop: 2,
  },
  heroActionsWrap: {
    gap: 8,
  },
  heroStartDueBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#5B4FE8',
    paddingVertical: 13,
    borderRadius: 14,
    shadowColor: '#5B4FE8',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  heroStartDueBtnText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  heroPracticeAllBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FAF9F6',
    borderWidth: 1,
    borderColor: '#E8E7E3',
    paddingVertical: 11,
    borderRadius: 14,
  },
  heroPracticeAllBtnText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#5C5C70',
    fontWeight: '600',
  },
  zeroCardsActions: {
    gap: 8,
  },
  heroSeedBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#5B4FE8',
    paddingVertical: 13,
    borderRadius: 14,
    shadowColor: '#5B4FE8',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  heroSeedBtnText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  heroCreateFirstBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FAF9F6',
    borderWidth: 1,
    borderColor: '#ECE9FD',
    paddingVertical: 11,
    borderRadius: 14,
  },
  heroCreateFirstBtnText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#5B4FE8',
    fontWeight: '600',
  },
  flashcardFilterRow: {
    paddingVertical: 2,
  },
  flashcardFiltersScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  flashcardFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E7E3',
  },
  flashcardFilterChipActive: {
    backgroundColor: '#17172A',
    borderColor: '#17172A',
  },
  flashcardFilterChipActiveDue: {
    backgroundColor: '#E8A020',
    borderColor: '#E8A020',
  },
  flashcardFilterChipText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: '#5C5C70',
    fontWeight: '500',
  },
  flashcardFilterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  flashcardFilterChipTextActiveDue: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  flashcardSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  flashcardSearchInput: {
    flex: 1,
    fontFamily: 'DMSans',
    fontSize: 13,
    color: '#17172A',
    padding: 0,
  },
  cardsLibrarySection: {
    gap: 10,
  },
  cardsLibraryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  cardsLibraryTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 11,
    color: '#9B9BAF',
    letterSpacing: 1,
    fontWeight: '700',
  },
  practiceFilteredBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  practiceFilteredBtnText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    color: '#5B4FE8',
    fontWeight: '600',
  },
  emptyFilteredCards: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    gap: 4,
  },
  emptyFilteredTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: '#17172A',
    fontWeight: '600',
  },
  emptyFilteredSub: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#9B9BAF',
    textAlign: 'center',
  },
  emptyDeckState: {
    padding: 28,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    gap: 10,
    marginVertical: 4,
  },
  emptyDeckIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0EFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyDeckTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 17,
    color: '#17172A',
    fontWeight: '700',
  },
  emptyDeckSubtitle: {
    fontFamily: 'DMSans',
    fontSize: 13,
    color: '#5C5C70',
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 280,
    marginBottom: 8,
  },
  emptyDeckButtons: {
    width: '100%',
    gap: 10,
  },
  emptyDeckPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#5B4FE8',
    paddingVertical: 13,
    borderRadius: 14,
    shadowColor: '#5B4FE8',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  emptyDeckPrimaryBtnText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  emptyDeckSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FAF9F6',
    borderWidth: 1,
    borderColor: '#E8E7E3',
    paddingVertical: 12,
    borderRadius: 14,
  },
  emptyDeckSecondaryBtnText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
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
  goalSelectorHeaderContainer: {
    marginBottom: 16,
  },
  goalActiveMainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    padding: 14,
    shadowColor: '#17172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
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
    gap: 10,
    backgroundColor: '#F9F8F6',
    borderWidth: 1,
    borderColor: '#EFEFEA',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  goalEmojiBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalDropdownTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  goalDropdownSmallLabel: {
    fontFamily: 'DMMono-Medium',
    fontSize: 9,
    fontWeight: '700',
    color: '#9B9BAF',
    letterSpacing: 0.6,
  },
  goalDropdownNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  goalDropdownNameText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: '#17172A',
    maxWidth: '85%',
  },
  goalProgressBadge: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 70,
  },
  goalProgressBadgePercent: {
    fontFamily: 'DMMono-Medium',
    fontSize: 16,
    fontWeight: '800',
    color: '#5B4FE8',
  },
  goalProgressBadgeSub: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#9B9BAF',
    marginTop: 1,
  },
  goalLinearProgressBarTrack: {
    height: 6,
    backgroundColor: '#F2F1ED',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 12,
    marginBottom: 6,
  },
  goalLinearProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  goalQuickChipsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingTop: 4,
  },
  goalQuickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F6F3',
    borderWidth: 1,
    borderColor: '#E8E7E3',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    gap: 5,
  },
  goalQuickChipActive: {
    backgroundColor: '#5B4FE8',
    borderColor: '#5B4FE8',
  },
  goalQuickChipActiveAll: {
    backgroundColor: '#1E1B4B',
    borderColor: '#1E1B4B',
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

  // Modal Styles
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
  examColorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
