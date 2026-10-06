import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  AppState,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import BottomSheet, {
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useAuthStore } from '@/lib/store/auth.store';
import { supabase } from '@/lib/supabase/client';
import { useUiStore } from '@/lib/store/ui.store';
import { useQueryClient } from '@tanstack/react-query';
import { AdManager, AdRewarded } from '@/components/ads';

// Custom Hooks & Stores
import { useFocusStore, SoundKey, FocusPreset } from '@/lib/store/focus.store';
import { useAmbientSound } from '@/lib/hooks/use-ambient-sound';
import { useFocusSessions } from '@/lib/hooks/use-focus-sessions';
import { getSubjectColor } from '@/lib/utils/subject-colors';
import { scheduleRevisionAlert } from '@/lib/notifications';
import { Settings } from 'lucide-react-native';

// Custom Components
import { TimerCircle } from '@/components/focus/TimerCircle';
import { SoundPicker } from '@/components/focus/SoundPicker';
import { BlockerToggle } from '@/components/focus/BlockerToggle';
import { SessionSummary } from '@/components/focus/SessionSummary';
import { SubjectPicker } from '@/components/shared/SubjectPicker';
import { RatingModal, shouldPromptRating } from '@/components/shared/RatingModal';

const TIMER_THEMES = [
  { id: 'default', label: 'Default', color: '#5B4FE8', isPremium: false },
  { id: 'gold', label: 'Gold', color: '#E8A020', isPremium: true },
  { id: 'rose_gold', label: 'Rose Gold', color: '#FDA4AF', isPremium: true },
  { id: 'sunset', label: 'Sunset', color: '#FF5E62', isPremium: true },
  { id: 'mint', label: 'Mint', color: '#00B894', isPremium: true },
  { id: 'nebula', label: 'Nebula', color: '#D946EF', isPremium: true },
  { id: 'obsidian', label: 'Obsidian', color: '#475569', isPremium: true },
] as const;

export default function FocusScreen(): React.JSX.Element {
  const queryClient = useQueryClient();
  const { data: history = [], isLoading: isLoadingHistory, refetch: refetchHistory } = useFocusSessions();
  const [showSummary, setShowSummary] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState('');
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const params = useLocalSearchParams<{
    suggestedSubject?: string;
    suggestedGoal?: string;
    routineBlockId?: string;
    routineStartTime?: string;
    routineEndTime?: string;
  }>();
  const { profile, setProfile } = useAuthStore();
  const isCse = profile?.category === 'cse_student';

  const topicSheetRef = useRef<BottomSheet>(null);
  const [cseIncompleteTopics, setCseIncompleteTopics] = useState<any[]>([]);
  const [topicSelectionActive, setTopicSelectionActive] = useState(false);
  
  // ... rest of the setup
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTimeRange = (startedAt: string, endedAt: string) => {
    const start = new Date(startedAt);
    const end = new Date(endedAt);
    const formatTime = (d: Date) => {
      let hours = d.getHours();
      const minutes = d.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${hours}:${minutes} ${ampm}`;
    };
    return `${formatTime(start)} - ${formatTime(end)}`;
  };

  // Store bindings
  const {
    isRunning,
    isPaused,
    secondsLeft,
    totalSeconds,
    elapsedSeconds,
    sessionGoal,
    subjectTag,
    linkedTaskId,
    pomodoroCount,
    currentMode,
    selectedPreset,
    customMinutes,
    activeSound,
    soundVolume,
    isBlockerActive,
    blockedAppsCount,
    activeTheme,
    setTheme,
    setPreset,
    setCustomMinutes,
    setSessionGoal,
    setSubjectTag,
    start,
    pause,
    resume,
    stop,
    tick,
    setSound,
    setVolume,
    toggleBlocker,
    resetSession,
    isStrictModeActive,
    isPlantWilted,
    selectedPlantId,
    toggleStrictMode,
    setPlantWilted,
    setSelectedPlant,
  } = useFocusStore();

  // Ambient sound hook
  const ambient = useAmbientSound();
  const isPremium = profile?.is_premium || false;

  // Reference to track previous mode for detecting when focus session ends
  const prevModeRef = useRef(currentMode);

  // Sync session goal editing input
  useEffect(() => {
    setTempGoal(sessionGoal);
  }, [sessionGoal]);

  // Sync parameters from dashboard
  useEffect(() => {
    if (params.suggestedSubject) {
      setSubjectTag(params.suggestedSubject);
    }
    if (params.suggestedGoal) {
      setSessionGoal(params.suggestedGoal);
    }
  }, [params.suggestedSubject, params.suggestedGoal, setSubjectTag, setSessionGoal]);

  // Timer loop interval
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isRunning) {
      interval = setInterval(() => {
        tick();
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, tick]);

  // Suppress ads during active focus sessions
  useEffect(() => {
    AdManager.setFocusSessionActive(isRunning);
  }, [isRunning]);

  const gardenShopSheetRef = useRef<BottomSheet>(null);
  const settingsSheetRef = useRef<BottomSheet>(null);
  const [gardenShopOpen, setGardenShopOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const backgroundStartTimestampRef = useRef<number | null>(null);

  // AppState listener for Strict focus mode wilting
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        backgroundStartTimestampRef.current = Date.now();
      } else if (nextAppState === 'active') {
        if (backgroundStartTimestampRef.current) {
          const secondsOut = (Date.now() - backgroundStartTimestampRef.current) / 1000;
          if (secondsOut > 10 && isStrictModeActive && isRunning) {
            setPlantWilted(true);
            useUiStore.getState().showToast('Your plant wilted! Return to study.', 'error');
          }
          backgroundStartTimestampRef.current = null;
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [isStrictModeActive, isRunning, setPlantWilted]);

  // Synchronize pomodoroCount in store based on actual database completions today
  useEffect(() => {
    if (isLoadingHistory || history.length === 0) return;

    const todayStr = new Date().toLocaleDateString('en-CA');
    const completedToday = history.filter((session) => {
      if (!session.started_at) return false;
      const sessionDate = new Date(session.started_at).toLocaleDateString('en-CA');
      return sessionDate === todayStr && session.status === 'completed';
    });

    const currentCount = useFocusStore.getState().pomodoroCount;
    // Sync if database count is different to reflect correct daily status
    if (completedToday.length !== currentCount) {
      useFocusStore.setState({ pomodoroCount: completedToday.length });
    }
  }, [history, isLoadingHistory]);

  // Synchronize any locally saved offline focus sessions to Supabase
  const syncOfflineSessions = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('offline_focus_sessions');
      if (!stored) return;

      const sessions = JSON.parse(stored);
      if (!Array.isArray(sessions) || sessions.length === 0) return;

      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) return;

      if (__DEV__) {
        console.log(`Syncing ${sessions.length} offline focus sessions...`);
      }

      // Try inserting all offline sessions at once
      const { error } = await supabase.from('focus_sessions').insert(
        sessions.map(s => ({
          ...s,
          user_id: authSession.user.id, // Enforce correct authenticated user id
        }))
      );

      if (!error) {
        // Clear queue on successful upload
        await AsyncStorage.removeItem('offline_focus_sessions');
        useUiStore.getState().showToast('Offline focus sessions synced successfully! 📶', 'success');
        refetchHistory();
        queryClient.invalidateQueries({ queryKey: ['stats'] });
      }
    } catch (e) {
      if (__DEV__) console.warn('Failed to sync offline sessions:', e);
    }
  }, [refetchHistory, queryClient]);

  // Run offline sync on mount
  useEffect(() => {
    syncOfflineSessions();
  }, [syncOfflineSessions]);

  // Handle purchases in Garden Shop
  const handleBuyPlant = async (plantId: string, cost: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const currentSeeds = profile?.focus_seeds || 0;
      const currentUnlocked = profile?.unlocked_plants || ['sprout'];

      if (currentSeeds < cost) return;

      const newSeeds = currentSeeds - cost;
      const newUnlocked = [...currentUnlocked, plantId];

      const { error } = await supabase
        .from('profiles')
        .update({
          focus_seeds: newSeeds,
          unlocked_plants: newUnlocked,
        })
        .eq('id', session.user.id);

      if (!error && profile) {
        setProfile({
          ...profile,
          focus_seeds: newSeeds,
          unlocked_plants: newUnlocked,
        });
        useUiStore.getState().showToast(`Unlocked ${plantId}! 🌻`, 'success');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    } catch (e) {
      if (__DEV__) console.warn('Failed to purchase plant:', e);
    }
  };

  const PLANT_LIST = [
    { id: 'sprout', name: 'Focus Sprout', emoji: '🌱', cost: 0, preview: '🌸', desc: 'Standard seedling flower' },
    { id: 'sunflower', name: 'Golden Sunflower', emoji: '🌻', cost: 10, preview: '🌻', desc: 'Unlocks a shiny golden sunflower' },
    { id: 'rose', name: 'Crimson Rose', emoji: '🌹', cost: 25, preview: '🌹', desc: 'Unlocks a beautiful crimson rose' },
    { id: 'cactus', name: 'Desert Cactus', emoji: '🌵', cost: 35, preview: '🌵', desc: 'Unlocks a robust desert cactus' },
    { id: 'tree', name: 'Sacred Banyan', emoji: '🌳', cost: 50, preview: '🌳', desc: 'Unlocks a massive banyan tree' },
  ] as const;

  // Detect session completion transitions (focus -> break)
  useEffect(() => {
    if (
      prevModeRef.current === 'focus' &&
      (currentMode === 'short_break' || currentMode === 'long_break')
    ) {
      // Trigger completion summary modal
      setShowSummary(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    prevModeRef.current = currentMode;
  }, [currentMode]);

  const handleSelectCseTopic = async (topicId: string) => {
    try {
      const { error } = await supabase
        .from('syllabus_topics')
        .update({ status: 'done' })
        .eq('id', topicId);

      if (error) throw error;

      useUiStore.getState().showToast('Topic marked as completed!', 'success');
      queryClient.invalidateQueries({ queryKey: ['syllabus'] });
    } catch (err) {
      if (__DEV__) {
        console.warn('Failed to update topic status:', err);
      }
    } finally {
      topicSheetRef.current?.close();
      setTopicSelectionActive(false);
      resetSession();
    }
  };

  const handleSkipTopicSelection = () => {
    topicSheetRef.current?.close();
    setTopicSelectionActive(false);
    resetSession();
  };

  const renderTopicBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    []
  );

  // Save focus session results directly to Supabase
  const handleSaveSession = useCallback(async (
    mood: number,
    _note: string,
    status: 'completed' | 'interrupted' = 'completed',
    focusAccuracy?: 'fully_focused' | 'partially_distracted' | 'off_track' | null,
    seedsEarned?: number
  ) => {
    if (elapsedSeconds <= 0) {
      if (__DEV__) {
        console.warn('Cannot save session with 0 elapsed seconds (violates check constraint).');
      }
      return;
    }

    const endedAt = new Date().toISOString();
    const startedAt = new Date(Date.now() - elapsedSeconds * 1000).toISOString();

    const focusMinutes =
      selectedPreset === 'custom'
        ? customMinutes
        : parseInt(selectedPreset.split('/')[0], 10);

    const dbDuration = status === 'interrupted' 
      ? Math.max(1, Math.floor(elapsedSeconds / 60)) 
      : focusMinutes;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      let { error } = await supabase.from('focus_sessions').insert({
        user_id: session.user.id,
        session_goal: sessionGoal.trim() || 'Deep Focus Session',
        duration_min: dbDuration,
        subject: subjectTag,
        sound_used: activeSound,
        mood: status === 'interrupted' ? null : mood,
        started_at: startedAt,
        ended_at: endedAt,
        status: status,
        focus_accuracy: focusAccuracy || null,
      });

      // DB Schema Fallback: If focus_accuracy column does not exist in target Supabase instance
      if (error && (error.code === 'PGRST204' || error.message?.includes('focus_accuracy') || error.message?.includes('column'))) {
        if (__DEV__) {
          console.warn('DB does not have focus_accuracy column. Retrying session insert without it...');
        }
        const retryResult = await supabase.from('focus_sessions').insert({
          user_id: session.user.id,
          session_goal: sessionGoal.trim() || 'Deep Focus Session',
          duration_min: dbDuration,
          subject: subjectTag,
          sound_used: activeSound,
          mood: status === 'interrupted' ? null : mood,
          started_at: startedAt,
          ended_at: endedAt,
          status: status,
        });
        error = retryResult.error;
      }

      if (error) throw error;

      // Award seeds for any completed focus session
      if (status === 'completed') {
        const earned = seedsEarned && seedsEarned > 0
          ? seedsEarned
          : Math.max(5, 5 + Math.floor(dbDuration / 5) + (isStrictModeActive ? 5 : 0));

        const currentSeeds = profile?.focus_seeds || 0;
        const newSeeds = currentSeeds + earned;
        const { error: seedError } = await supabase
          .from('profiles')
          .update({ focus_seeds: newSeeds })
          .eq('id', session.user.id);
        
        if (!seedError && profile) {
          setProfile({ ...profile, focus_seeds: newSeeds });
          queryClient.invalidateQueries({ queryKey: ['profile'] });
          useUiStore.getState().showToast(`+${earned} Focus Seeds Earned! 🌱`, 'success');
        }
      }

      // Schedule spaced-repetition reminders
      if (status === 'completed' && subjectTag) {
        scheduleRevisionAlert(subjectTag, 1).catch(() => {});
        scheduleRevisionAlert(subjectTag, 3).catch(() => {});
      }

      // Refetch history list
      refetchHistory();
      queryClient.invalidateQueries({ queryKey: ['stats'] });

      // Trigger success haptics
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Check if we should mark a linked routine block as done
      if (status === 'completed' && params.routineBlockId && params.routineStartTime && params.routineEndTime) {
        // Validation 1: must be >= 25 minutes (or >= 1 minute in development mode for easy testing)
        const isDurationValid = __DEV__ ? focusMinutes >= 1 : focusMinutes >= 25;

        // Validation 2: must be completed within the scheduled window (always valid in development)
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        const timeToMinutes = (timeStr: string) => {
          const parts = timeStr.split(':');
          if (parts.length < 2) return 0;
          return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
        };

        const startM = timeToMinutes(params.routineStartTime);
        let endM = timeToMinutes(params.routineEndTime);
        if (endM < startM) {
          endM += 1440; // crosses midnight
        }

        let isTimeWindowValid = false;
        if (__DEV__) {
          isTimeWindowValid = true;
        } else {
          const windowStart = startM - 15;
          const windowEnd = endM + 60;

          if (currentMinutes >= windowStart && currentMinutes <= windowEnd) {
            isTimeWindowValid = true;
          } else if (endM >= 1440) {
            const adjMinutes = currentMinutes + 1440;
            if (adjMinutes >= windowStart && adjMinutes <= windowEnd) {
              isTimeWindowValid = true;
            }
          }
        }

        if (isDurationValid && isTimeWindowValid) {
          const todayStr = new Date().toLocaleDateString('en-CA');
          const { error: logError } = await supabase
            .from('schedule_logs')
            .upsert(
              {
                user_id: session.user.id,
                block_id: params.routineBlockId,
                date: todayStr,
                status: 'completed',
              },
              { onConflict: 'user_id,block_id,date' }
            );

          if (logError) {
            if (__DEV__) console.warn('Failed to log routine completion in database:', logError);
          }
          useUiStore.getState().showToast('Routine block marked Done!', 'success');
        } else {
          let reason = '';
          if (!isDurationValid && !isTimeWindowValid) {
            reason = 'Session was under 25m and outside the scheduled time window.';
          } else if (!isDurationValid) {
            reason = 'Session duration was under 25 minutes.';
          } else {
            reason = 'Completed outside the routine\'s scheduled window.';
          }
          Alert.alert(
            'Routine Not Completed',
            `Focus session saved, but routine block was not marked Done. Reason: ${reason}`
          );
        }
      } else {
        useUiStore.getState().showToast('Session saved!', 'success');
      }

      setShowSummary(false);
      await ambient.stop();

      // Check if we should prompt for CSE syllabus topics
      if (status === 'completed' && isCse && subjectTag) {
        const { data: topics, error: topicsErr } = await supabase
          .from('syllabus_topics')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('subject', subjectTag)
          .not('status', 'eq', 'done')
          .order('order_index', { ascending: true })
          .limit(10);

        if (!topicsErr && topics && topics.length > 0) {
          setCseIncompleteTopics(topics);
          setTopicSelectionActive(true);
          // Expand the bottom sheet after state update
          setTimeout(() => {
            topicSheetRef.current?.expand();
          }, 100);
          return;
        }
      }

      resetSession();
      shouldPromptRating().then((prompt) => {
        if (prompt) {
          setTimeout(() => setShowRatingModal(true), 500);
        }
      });
    } catch (err: any) {
      const isNetworkError = 
        err.message?.toLowerCase().includes('network') || 
        err.message?.toLowerCase().includes('fetch') || 
        err.message?.toLowerCase().includes('timeout') ||
        err.status === 0;

      if (isNetworkError) {
        try {
          const localSession = {
            session_goal: sessionGoal.trim() || 'Deep Focus Session',
            duration_min: dbDuration,
            subject: subjectTag,
            sound_used: activeSound,
            mood: status === 'interrupted' ? null : mood,
            started_at: startedAt,
            ended_at: endedAt,
            status: status,
            focus_accuracy: focusAccuracy || null,
          };

          const stored = await AsyncStorage.getItem('offline_focus_sessions');
          const queue = stored ? JSON.parse(stored) : [];
          queue.push(localSession);
          await AsyncStorage.setItem('offline_focus_sessions', JSON.stringify(queue));

          setShowSummary(false);
          await ambient.stop();
          resetSession();

          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert(
            'Offline Mode 📶',
            'Focus session saved locally! It will sync automatically when your internet connection is restored.',
            [{ text: 'OK' }]
          );
          return;
        } catch (localErr) {
          if (__DEV__) console.warn('Failed to write offline cache:', localErr);
        }
      }

      if (__DEV__) {
        console.warn('Failed to save focus session:', err);
      }
      Alert.alert(
        'Failed to save session',
        'Could not log session. Please check your network and try again.'
      );
    }
  }, [elapsedSeconds, selectedPreset, customMinutes, sessionGoal, subjectTag, activeSound, resetSession, ambient, refetchHistory, queryClient, isCse]);

  const handleDiscardSession = useCallback(() => {
    setShowSummary(false);
    resetSession();
    ambient.stop().catch(() => {});
  }, [resetSession, ambient]);

  const handlePlayPause = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isRunning) {
      pause();
    } else if (isPaused) {
      resume();
    } else {
      start();
    }
  }, [isRunning, isPaused, pause, resume, start]);

  const handleReset = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (elapsedSeconds >= 300) {
      Alert.alert(
        'Cancel Focus Session?',
        'Do you want to end this session early? It will be logged as Interrupted.',
        [
          {
            text: 'Yes, End Session',
            style: 'destructive',
            onPress: async () => {
              await handleSaveSession(3, '', 'interrupted');
            }
          },
          {
            text: 'Keep Focusing',
            style: 'cancel'
          }
        ]
      );
    } else {
      Alert.alert(
        'Discard Focus Session?',
        'Sessions under 5 minutes are not saved.',
        [
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              stop();
            }
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
    }
  }, [elapsedSeconds, handleSaveSession, stop]);

  const handleSkipBreak = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Skips break mode and switches timer back to focus mode duration
    const focusDuration =
      selectedPreset === 'custom' ? customMinutes * 60 : parseInt(selectedPreset.split('/')[0], 10) * 60;

    useFocusStore.setState({
      currentMode: 'focus',
      secondsLeft: focusDuration,
      totalSeconds: focusDuration,
      isRunning: false,
      isPaused: false,
    });
  }, [selectedPreset, customMinutes]);

  // SubjectPicker controls the subject selection directly via bottom sheet

  const handleSoundSelect = useCallback(async (key: SoundKey | null) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Opt-in Rewarded Video Ad for unlocking premium ambient soundscapes
    if (key && (key === 'lofi' || key === 'cafe' || key === 'brown_noise')) {
      Alert.alert(
        'Unlock Soundscape 🎧',
        `Watch a short video ad to unlock ${key.toUpperCase()} ambient audio for your focus session.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Watch Ad & Unlock',
            onPress: () => {
              AdRewarded.showRewardAd(async () => {
                setSound(key);
                await ambient.play(key, soundVolume);
              });
            },
          },
        ]
      );
      return;
    }

    setSound(key);
    if (key) {
      await ambient.play(key, soundVolume);
    } else {
      await ambient.stop();
    }
  }, [setSound, ambient, soundVolume]);

  const handleVolumeChange = useCallback(async (vol: number) => {
    setVolume(vol);
    await ambient.setVolume(vol);
  }, [setVolume, ambient]);

  const handleBlockerToggle = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleBlocker();
  }, [toggleBlocker]);

  const handleSaveGoal = useCallback(() => {
    setSessionGoal(tempGoal);
    setIsEditingGoal(false);
  }, [tempGoal, setSessionGoal]);

  const focusMinutes =
    selectedPreset === 'custom'
      ? customMinutes
      : parseInt(selectedPreset.split('/')[0], 10);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#17172A" translucent={false} />

      {/* Background circles */}
      <View style={styles.circle1} pointerEvents="none" />
      <View style={styles.circle2} pointerEvents="none" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <ScrollView
            scrollEnabled={scrollEnabled}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContainer}
          >
            {/* Top bar (Section A) */}
            <View style={styles.topBar}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => router.replace('/')}
                activeOpacity={0.7}
              >
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>

              <Text style={styles.modeHeading}>
                {currentMode === 'focus' ? 'Deep Focus' : 'Break Time'}
              </Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  style={styles.seedsBalanceCleanChip}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    setGardenShopOpen(true);
                    gardenShopSheetRef.current?.expand();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.seedsBalanceCleanText}>✨ {profile?.focus_seeds || 0} Seeds</Text>
                </TouchableOpacity>

                {!isRunning && (
                  <TouchableOpacity
                    style={styles.settingsHeaderBtn}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      setSettingsOpen(true);
                      settingsSheetRef.current?.expand();
                    }}
                    activeOpacity={0.7}
                  >
                    <Settings size={16} color="rgba(255, 255, 255, 0.7)" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {params.routineBlockId && (
              <View style={styles.routineLinkBanner}>
                <Text style={styles.routineLinkText}>
                  Linked Routine: {params.suggestedGoal || 'Study Routine'}
                </Text>
                <Text style={styles.routineLinkSubtext}>
                  Requires 25m+ focus between {params.routineStartTime} and {params.routineEndTime} to mark done.
                </Text>
              </View>
            )}

            {/* Session goal (Section B) */}
            <View style={styles.goalCleanContainer}>
              {isEditingGoal ? (
                <TextInput
                  style={styles.goalCleanInput}
                  value={tempGoal}
                  onChangeText={setTempGoal}
                  placeholder="What is your focus goal today?"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  onSubmitEditing={handleSaveGoal}
                  onBlur={handleSaveGoal}
                  autoFocus
                  maxLength={80}
                />
              ) : (
                <TouchableOpacity
                  onPress={() => setIsEditingGoal(true)}
                  activeOpacity={0.8}
                  style={styles.goalTouchArea}
                >
                  <Text style={styles.goalCleanText} numberOfLines={1}>
                    {sessionGoal.trim() || 'What is your focus goal today? 🎯'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Preset Selector (Section C) */}
            <View style={styles.presetsRow}>
              {(['25/5', '50/10', '90/20', 'custom'] as FocusPreset[]).map((preset) => {
                const active = selectedPreset === preset;
                let displayLabel: string = preset;
                if (preset === 'custom') displayLabel = 'Custom';

                return (
                  <TouchableOpacity
                    key={preset}
                    style={[styles.presetChip, active && styles.presetChipActive]}
                    onPress={() => setPreset(preset)}
                    disabled={isRunning}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.presetText, active && styles.presetTextActive]}>
                      {displayLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Stepper adjustment for Custom Preset */}
            {selectedPreset === 'custom' && !isRunning && (
              <View style={styles.stepperContainer}>
                <TouchableOpacity
                  onPress={() => setCustomMinutes(Math.max(1, customMinutes - 5))}
                  style={styles.stepperButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.stepperButtonText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.stepperValueText}>{customMinutes} min</Text>
                <TouchableOpacity
                  onPress={() => setCustomMinutes(customMinutes + 5)}
                  style={styles.stepperButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.stepperButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Timer Ring (Section D) */}
            <View style={styles.timerWrapper}>
              <TimerCircle
                size={190}
                secondsLeft={secondsLeft}
                totalSeconds={totalSeconds}
                isRunning={isRunning}
                currentMode={currentMode}
              />
            </View>

            {/* Controls Row (Section E) */}
            <View style={styles.controlsRow}>
              {/* Left Reset Button */}
              <TouchableOpacity
                style={styles.controlCircleSmall}
                onPress={handleReset}
                activeOpacity={0.8}
                accessibilityLabel="Reset timer"
                accessibilityRole="button"
                accessibilityHint="Resets the focus timer duration"
              >
                <Text style={styles.controlIconSmall}>↺</Text>
              </TouchableOpacity>

              {/* Center Play/Pause Button */}
              <TouchableOpacity
                style={styles.controlCircleMain}
                onPress={handlePlayPause}
                activeOpacity={0.8}
                accessibilityLabel={isRunning ? 'Pause timer' : 'Start timer'}
                accessibilityRole="button"
                accessibilityState={{ selected: isRunning }}
                accessibilityHint="Start or pause the focus session"
              >
                <Text style={styles.controlIconMain}>
                  {isRunning ? '⏸' : '▶'}
                </Text>
              </TouchableOpacity>

              {/* Right Skip Break OR Subject Selector */}
              {currentMode !== 'focus' ? (
                <TouchableOpacity
                  style={styles.controlCircleSmall}
                  onPress={handleSkipBreak}
                  activeOpacity={0.8}
                  accessibilityLabel="Skip break"
                  accessibilityRole="button"
                  accessibilityHint="Skips the current break interval and returns to focus"
                >
                  <Text style={styles.controlIconSmall}>⏭</Text>
                </TouchableOpacity>
              ) : (
                <SubjectPicker
                  selectedSubject={subjectTag}
                  onSelect={setSubjectTag}
                  isDark
                  customTrigger={(open) => (
                    <TouchableOpacity
                      style={[styles.subjectPill, styles.controlCircleSmall]}
                      onPress={async () => {
                        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        open();
                      }}
                      activeOpacity={0.8}
                      accessibilityLabel={`Subject: ${subjectTag || 'General'}`}
                      accessibilityRole="button"
                      accessibilityHint="Double tap to open subject picker"
                    >
                      <Text style={styles.subjectTextChip} numberOfLines={1}>
                        {subjectTag || 'General'}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>

            {/* Sound Selector (Section F) - BELOW Controls */}
            <View style={styles.pickerSection}>
              <SoundPicker
                activeSound={activeSound}
                onSelect={handleSoundSelect}
                volume={soundVolume}
                onVolumeChange={handleVolumeChange}
                onScrollStateChange={setScrollEnabled}
                isPremium={isPremium}
                onPremiumTrigger={() => router.push('/paywall')}
              />
            </View>

            {/* App Blocker (Section G) */}
            <View style={styles.blockerSection}>
              <BlockerToggle
                isActive={isBlockerActive}
                onToggle={handleBlockerToggle}
                blockedCount={blockedAppsCount}
              />
            </View>

            {/* History Section (Section H) */}
            <View style={styles.historyContainer}>
              <Text style={styles.historyHeading}>Focus History</Text>
              {isLoadingHistory ? (
                <ActivityIndicator color="#5B4FE8" style={{ marginVertical: 24 }} />
              ) : history.length === 0 ? (
                <View style={styles.emptyHistoryCard}>
                  <Text style={styles.emptyHistoryText}>No focus sessions logged yet.</Text>
                </View>
              ) : (
                history.map((session) => {
                  const accentColor = getSubjectColor(session.subject);
                  return (
                    <View key={session.id} style={styles.historyCard}>
                      {/* Left Accent Bar */}
                      <View style={[styles.historyAccentBar, { backgroundColor: accentColor }]} />
                      
                      {/* Card Content */}
                      <View style={styles.historyCardBody}>
                        <View style={styles.historyCardHeader}>
                          <Text style={styles.historyCardGoal} numberOfLines={1}>
                            {session.session_goal}
                          </Text>
                          <View style={styles.historyDurationBadge}>
                            <Text style={styles.historyDurationText}>
                              {session.duration_min}m
                            </Text>
                          </View>
                        </View>

                        <View style={styles.historyCardFooter}>
                          <View style={styles.historySubjectBadge}>
                            <Text style={[styles.historySubjectText, { color: accentColor }]}>
                              {session.subject || 'General'}
                            </Text>
                          </View>
                          <Text style={styles.historyTimeText}>
                            {formatDate(session.started_at)} • {formatTimeRange(session.started_at, session.ended_at)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>

      {/* Completion Summary Sheet */}
      <SessionSummary
        isVisible={showSummary}
        duration={
          selectedPreset === 'custom'
            ? customMinutes
            : parseInt(selectedPreset.split('/')[0], 10)
        }
        subject={subjectTag}
        pomodoroCount={pomodoroCount}
        onSave={(mood, note, accuracy, seeds) => handleSaveSession(mood, note, 'completed', accuracy, seeds)}
        onDiscard={handleDiscardSession}
        isStrictMode={isStrictModeActive}
        isPlantWilted={isPlantWilted}
        selectedPlantId={selectedPlantId}
      />

      {/* GARDEN SHOP SHEET */}
      <BottomSheet
        ref={gardenShopSheetRef}
        index={-1}
        snapPoints={['65%']}
        enablePanDownToClose={true}
        backdropComponent={renderTopicBackdrop}
        onChange={(idx) => {
          if (idx === -1) setGardenShopOpen(false);
        }}
      >
        <BottomSheetView style={styles.shopContentContainer}>
          <Text style={styles.shopTitle}>Garden Shop 🌻</Text>
          <Text style={styles.shopSubtitle}>Spend earned focus seeds to unlock new plant types for strict mode.</Text>

          <ScrollView style={styles.shopList} showsVerticalScrollIndicator={false}>
            {PLANT_LIST.map((plant) => {
              const unlocked = (profile?.unlocked_plants || ['sprout']).includes(plant.id);
              const canAfford = (profile?.focus_seeds || 0) >= plant.cost;

              return (
                <View key={plant.id} style={styles.shopItem}>
                  <Text style={styles.shopItemEmoji}>{plant.emoji}</Text>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.shopItemName}>{plant.name}</Text>
                    <Text style={styles.shopItemDesc}>{plant.desc}</Text>
                  </View>
                  
                  {unlocked ? (
                    selectedPlantId === plant.id ? (
                      <View style={[styles.shopUnlockedBadge, { backgroundColor: '#5B4FE815', borderColor: '#5B4FE8' }]}>
                        <Text style={[styles.shopUnlockedText, { color: '#5B4FE8' }]}>Equipped 🌱</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[styles.shopUnlockBtn, { backgroundColor: '#5B4FE8' }]}
                        onPress={() => {
                          setSelectedPlant(plant.id);
                          useUiStore.getState().showToast(`Equipped ${plant.name}! 🌱`, 'success');
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.shopUnlockBtnText}>Equip</Text>
                      </TouchableOpacity>
                    )
                  ) : (
                    <TouchableOpacity
                      style={[styles.shopUnlockBtn, !canAfford && styles.shopUnlockBtnDisabled]}
                      disabled={!canAfford}
                      onPress={() => handleBuyPlant(plant.id, plant.cost)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.shopUnlockBtnText}>🌱 {plant.cost}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </BottomSheetView>
      </BottomSheet>

      {/* TIMER SETTINGS SHEET */}
      <BottomSheet
        ref={settingsSheetRef}
        index={-1}
        snapPoints={['35%']}
        enablePanDownToClose={true}
        backdropComponent={renderTopicBackdrop}
        onChange={(idx) => {
          if (idx === -1) setSettingsOpen(false);
        }}
      >
        <BottomSheetView style={styles.settingsSheetContent}>
          <Text style={styles.settingsSheetTitle}>Timer Options ⚙️</Text>

          {/* Strict Mode Toggle inside Settings */}
          <View style={styles.settingsRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.settingsLabel}>Strict Focus Mode</Text>
              <Text style={styles.settingsDesc}>Grow a virtual plant. Leaving the app wilts it.</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {isStrictModeActive && (
                <TouchableOpacity
                  style={styles.selectPlantCleanBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    const unlocked = profile?.unlocked_plants || ['sprout'];
                    const choices = PLANT_LIST.filter(p => unlocked.includes(p.id));
                    
                    Alert.alert(
                      'Select Sprout',
                      'Choose a seed to grow in strict mode:',
                      choices.map(c => ({
                        text: `${c.emoji} ${c.name}`,
                        onPress: () => setSelectedPlant(c.id),
                      })),
                      { cancelable: true }
                    );
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.selectPlantCleanText}>
                    {PLANT_LIST.find(p => p.id === selectedPlantId)?.emoji || '🌱'}
                  </Text>
                </TouchableOpacity>
              )}
              <Switch
                value={isStrictModeActive}
                onValueChange={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  if (!isPremium) {
                    router.push('/paywall');
                  } else {
                    toggleStrictMode();
                  }
                }}
                trackColor={{ false: '#E8E7E3', true: '#EAE8FD' }}
                thumbColor={isStrictModeActive ? '#5B4FE8' : '#F4F3F0'}
              />
            </View>
          </View>

          {/* Theme Selector inside Settings */}
          <View style={styles.settingsThemeSection}>
            <Text style={styles.settingsThemeLabel}>TIMER THEME</Text>
            <View style={styles.themeDotsRow}>
              {TIMER_THEMES.map((theme) => {
                const active = activeTheme === theme.id;
                const isLocked = theme.isPremium && !isPremium;

                return (
                  <TouchableOpacity
                    key={theme.id}
                    style={[
                      styles.themeDot,
                      { backgroundColor: theme.color },
                      active && styles.themeDotActive,
                    ]}
                    onPress={async () => {
                      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      if (isLocked) {
                        router.push('/paywall');
                      } else {
                        setTheme(theme.id);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    {isLocked && <Text style={styles.themeDotLock}>🔒</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </BottomSheetView>
      </BottomSheet>

      {/* CSE Topic Selection Bottom Sheet */}
      {topicSelectionActive && (
        <BottomSheet
          ref={topicSheetRef}
          index={0}
          snapPoints={['50%']}
          enablePanDownToClose={false}
          backdropComponent={renderTopicBackdrop}
          backgroundStyle={styles.bottomSheetBackground}
          handleIndicatorStyle={styles.bottomSheetIndicator}
        >
          <BottomSheetView style={styles.topicSheetContent}>
            <Text style={styles.topicSheetTitle}>Which topic did you cover? 🎓</Text>
            <Text style={styles.topicSheetSubtitle}>
              Select a syllabus topic from <Text style={{fontWeight: 'bold', color: '#5B4FE8'}}>{subjectTag}</Text> to mark it as done:
            </Text>
            <ScrollView
              contentContainerStyle={styles.topicChipsScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {cseIncompleteTopics.map((topic) => (
                <TouchableOpacity
                  key={topic.id}
                  style={styles.topicSelectChip}
                  onPress={() => handleSelectCseTopic(topic.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.topicSelectChipText}>{topic.topic}</Text>
                  <Text style={styles.topicSelectChipChapter}>{topic.chapter}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.topicSkipButton}
              onPress={handleSkipTopicSelection}
              activeOpacity={0.7}
            >
              <Text style={styles.topicSkipButtonText}>None / Skip</Text>
            </TouchableOpacity>
          </BottomSheetView>
        </BottomSheet>
      )}

      {/* Rating Reminder Modal */}
      <RatingModal
        isVisible={showRatingModal}
        onClose={() => setShowRatingModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#17172A',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  headerTitle: {
    fontFamily: 'InstrumentSerif',
    fontSize: 32,
    color: '#FFFFFF',
  },
  scrollContainer: {
    paddingBottom: 40,
  },
  circle1: {
    position: 'absolute',
    top: -80,
    left: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#5B4FE8',
    opacity: 0.07,
  },
  circle2: {
    position: 'absolute',
    bottom: 100,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#8B6FE8',
    opacity: 0.05,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontFamily: 'DMSans',
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  modeHeading: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
  },
  badgeContainer: {
    backgroundColor: 'rgba(91, 79, 232, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    color: '#A89EF8',
    fontWeight: '600',
  },
  goalContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginVertical: 12,
  },
  goalHeaderLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    color: '#9B9BAF',
    letterSpacing: 1.2,
    fontWeight: '600',
    marginBottom: 4,
  },
  goalText: {
    fontFamily: 'DMSans',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  goalInput: {
    fontFamily: 'DMSans',
    fontSize: 13,
    color: '#FFFFFF',
    padding: 0,
    height: 18,
  },
  presetsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 8,
  },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  presetChipActive: {
    backgroundColor: 'rgba(91, 79, 232, 0.4)',
  },
  presetText: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.3)',
  },
  presetTextActive: {
    color: '#A89EF8',
    fontWeight: '600',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 16,
  },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  stepperValueText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    fontWeight: '600',
  },
  timerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginVertical: 16,
  },
  controlCircleSmall: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlIconSmall: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 20,
  },
  controlCircleMain: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#5B4FE8',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5B4FE8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 6,
  },
  controlIconMain: {
    color: '#FFFFFF',
    fontSize: 28,
  },
  focusSubjectPicker: {
    width: 90,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  subjectPill: {
    paddingHorizontal: 8,
  },
  subjectTextChip: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600',
    textAlign: 'center',
  },
  pickerSection: {
    marginTop: 0,
    marginBottom: 12,
  },
  blockerSection: {
    marginTop: 0,
    marginBottom: 16,
  },
  historyContainer: {
    marginTop: 24,
    width: '100%',
  },
  historyHeading: {
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 12,
  },
  historyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    flexDirection: 'row',
    marginBottom: 8,
    overflow: 'hidden',
  },
  historyAccentBar: {
    width: 4,
    height: '100%',
  },
  historyCardBody: {
    flex: 1,
    padding: 12,
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyCardGoal: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  historyDurationBadge: {
    backgroundColor: 'rgba(91, 79, 232, 0.2)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  historyDurationText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 10,
    color: '#A89EF8',
  },
  historyCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  historySubjectBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  historySubjectText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    fontWeight: '600',
  },
  historyTimeText: {
    fontFamily: 'DMSans',
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  emptyHistoryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    borderStyle: 'dashed',
  },
  emptyHistoryText: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.3)',
  },
  bottomSheetBackground: {
    backgroundColor: '#FFFFFF',
  },
  bottomSheetIndicator: {
    backgroundColor: '#9B9BAF',
  },
  topicSheetContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    flex: 1,
  },
  topicSheetTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 18,
    color: '#17172A',
    fontWeight: '600',
    marginBottom: 6,
  },
  topicSheetSubtitle: {
    fontFamily: 'DMSans',
    fontSize: 13,
    color: '#5C5C70',
    marginBottom: 16,
    lineHeight: 18,
  },
  topicChipsScroll: {
    gap: 8,
    paddingBottom: 16,
  },
  topicSelectChip: {
    backgroundColor: '#F7F6F3',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'column',
    gap: 2,
  },
  topicSelectChipText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: '#17172A',
    fontWeight: '600',
  },
  topicSelectChipChapter: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#9B9BAF',
  },
  topicSkipButton: {
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#F7F6F3',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8E7E3',
  },
  topicSkipButtonText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#5C5C70',
    fontWeight: '600',
  },
  routineLinkBanner: {
    backgroundColor: 'rgba(91, 79, 232, 0.15)',
    borderColor: '#5B4FE8',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 16,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  routineLinkText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: '#FFF',
    fontWeight: '600',
  },
  routineLinkSubtext: {
    fontFamily: 'DMSans',
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
    textAlign: 'center',
  },
  pickerLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    color: '#9B9BAF',
    letterSpacing: 1.5,
    fontWeight: '600',
    marginBottom: 8,
  },
  themeScroll: {
    gap: 8,
    paddingRight: 10,
  },
  themeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  themeChipActive: {
    backgroundColor: 'rgba(91, 79, 232, 0.2)',
    borderColor: 'rgba(91, 79, 232, 0.4)',
  },
  themeChipLocked: {
    backgroundColor: 'rgba(232, 160, 32, 0.04)',
    borderColor: 'rgba(232, 160, 32, 0.15)',
  },
  themeText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '500',
  },
  themeTextActive: {
    color: '#A89EF8',
    fontWeight: '600',
  },
  seedsBalanceCleanChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(232, 160, 32, 0.1)',
    borderColor: 'rgba(232, 160, 32, 0.25)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seedsBalanceCleanText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    fontWeight: '700',
    color: '#E8A020',
  },
  goalCleanContainer: {
    alignItems: 'center',
    marginVertical: 12,
    paddingHorizontal: 20,
    width: '100%',
  },
  goalCleanInput: {
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    width: '100%',
    paddingVertical: 8,
  },
  goalTouchArea: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 8,
  },
  goalCleanText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.75)',
    textAlign: 'center',
  },
  strictModeCleanRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginVertical: 10,
    width: '100%',
  },
  strictModeCleanTextGroup: {
    flex: 1,
  },
  strictModeCleanTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  strictModeCleanDesc: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#9B9BAF',
    marginTop: 1,
  },
  selectPlantCleanBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectPlantCleanText: {
    fontSize: 16,
  },
  themeSelectorContainer: {
    marginTop: 16,
    width: '100%',
  },
  themeDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  themeDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeDotActive: {
    borderColor: '#17172A',
    transform: [{ scale: 1.25 }],
  },
  themeDotLock: {
    fontSize: 9,
    color: '#FFFFFF',
  },
  settingsHeaderBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsSheetContent: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 40,
    flex: 1,
  },
  settingsSheetTitle: {
    fontFamily: 'InstrumentSerif',
    fontSize: 24,
    color: '#17172A',
    textAlign: 'center',
    marginBottom: 16,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EFFB',
  },
  settingsLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: '#17172A',
    fontWeight: '600',
  },
  settingsDesc: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#9B9BAF',
    marginTop: 2,
  },
  settingsThemeSection: {
    marginTop: 20,
    alignItems: 'center',
    width: '100%',
  },
  settingsThemeLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    color: '#9B9BAF',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  shopContentContainer: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 40,
    flex: 1,
  },
  shopTitle: {
    fontFamily: 'InstrumentSerif',
    fontSize: 26,
    color: '#17172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  shopSubtitle: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#9B9BAF',
    textAlign: 'center',
    marginBottom: 20,
  },
  shopList: {
    flex: 1,
  },
  shopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EFFB',
  },
  shopItemEmoji: {
    fontSize: 28,
  },
  shopItemName: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    fontWeight: '600',
    color: '#17172A',
  },
  shopItemDesc: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#9B9BAF',
    marginTop: 2,
  },
  shopUnlockedBadge: {
    backgroundColor: '#EAE8FD',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  shopUnlockedText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    fontWeight: '600',
    color: '#5B4FE8',
  },
  shopUnlockBtn: {
    backgroundColor: '#E8A020',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  shopUnlockBtnDisabled: {
    backgroundColor: '#9B9BAF',
    opacity: 0.6,
  },
  shopUnlockBtnText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
