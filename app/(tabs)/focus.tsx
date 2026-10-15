import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import BottomSheet, {
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetScrollView,
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
import {
  Settings,
  Maximize2,
  Trophy,
  Zap,
  Shield,
  Target,
  Check,
  Lock,
  Award,
  Power,
  FileText,
  Volume2,
  VolumeX,
  Volume1,
} from 'lucide-react-native';
import { trackEvent } from '@/lib/posthog';
import { FocusLiveActivity } from '@/lib/native/live-activity';

export const playRewardingCompletionHaptics = async () => {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }, 100);
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    }, 240);
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }, 380);
  } catch {
    // fallback
  }
};

export const calculateFocusLevel = (xp: number) => {
  if (xp >= 2000) return { level: 7, title: 'Grandmaster', nextXp: null, prevXp: 2000 };
  if (xp >= 1400) return { level: 6, title: 'Focus Virtuoso', nextXp: 2000, prevXp: 1400 };
  if (xp >= 900) return { level: 5, title: 'Master of Flow', nextXp: 1400, prevXp: 900 };
  if (xp >= 500) return { level: 4, title: 'Deep Worker', nextXp: 900, prevXp: 500 };
  if (xp >= 250) return { level: 3, title: 'Flow Specialist', nextXp: 500, prevXp: 250 };
  if (xp >= 100) return { level: 2, title: 'Steady Achiever', nextXp: 250, prevXp: 100 };
  return { level: 1, title: 'Focus Novice', nextXp: 100, prevXp: 0 };
};

const REWARD_THEMES = [
  { id: 'default', name: 'Indigo Core', color: '#5B4FE8', requiredLevel: 1, requiredXp: 0, desc: 'Clean default indigo focus theme' },
  { id: 'mint', name: 'Emerald Calm', color: '#00B894', requiredLevel: 2, requiredXp: 100, desc: 'Soothing mint green for calm focus' },
  { id: 'sunset', name: 'Warm Ember', color: '#FF5E62', requiredLevel: 3, requiredXp: 250, desc: 'Energizing sunset gradient vibe' },
  { id: 'rose_gold', name: 'Rose Elegance', color: '#FDA4AF', requiredLevel: 4, requiredXp: 500, desc: 'Sophisticated aesthetic rose-gold hue' },
  { id: 'gold', name: 'Golden Prestige', color: '#E8A020', requiredLevel: 5, requiredXp: 900, desc: 'Elite gold theme for master focusers' },
  { id: 'nebula', name: 'Cosmic Nebula', color: '#D946EF', requiredLevel: 6, requiredXp: 1400, desc: 'Deep ultraviolet nebula glow' },
  { id: 'obsidian', name: 'Stealth Obsidian', color: '#475569', requiredLevel: 7, requiredXp: 2000, desc: 'Ultimate monochrome deep focus theme' },
] as const;

// Custom Components
import { TimerCircle } from '@/components/focus/TimerCircle';
import { SoundPicker } from '@/components/focus/SoundPicker';
import { BlockerToggle } from '@/components/focus/BlockerToggle';
import { SessionSummary } from '@/components/focus/SessionSummary';
import { SubjectPicker } from '@/components/shared/SubjectPicker';
import { RatingModal, shouldPromptRating } from '@/components/shared/RatingModal';
import { LandscapeFocusClock } from '@/components/focus/LandscapeFocusClock';

const TIMER_THEMES = [
  { id: 'default', label: 'Default', color: '#5B4FE8', isPremium: false },
  { id: 'gold', label: 'Gold', color: '#E8A020', isPremium: true },
  { id: 'rose_gold', label: 'Rose Gold', color: '#FDA4AF', isPremium: true },
  { id: 'sunset', label: 'Sunset', color: '#FF5E62', isPremium: true },
  { id: 'mint', label: 'Mint', color: '#00B894', isPremium: true },
  { id: 'nebula', label: 'Nebula', color: '#D946EF', isPremium: true },
  { id: 'obsidian', label: 'Obsidian', color: '#475569', isPremium: true },
] as const;

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

const HistoryItemCard = React.memo<{ session: any }>(({ session }) => {
  const accentColor = getSubjectColor(session.subject);
  return (
    <View style={styles.historyCard}>
      <View style={[styles.historyAccentBar, { backgroundColor: accentColor }]} />
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
});

export default function FocusScreen(): React.JSX.Element {
  const { width, height } = useWindowDimensions();
  const [isManualLandscape, setIsManualLandscape] = useState(false);
  const isLandscape = (width > height) || isManualLandscape;

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
    standby?: string;
  }>();
  const { profile, setProfile } = useAuthStore();
  const isCse = profile?.category === 'cse_student';

  const topicSheetRef = useRef<BottomSheet>(null);
  const historySheetRef = useRef<BottomSheet>(null);
  const [historySheetOpen, setHistorySheetOpen] = useState(false);
  const [cseIncompleteTopics, setCseIncompleteTopics] = useState<any[]>([]);
  const [topicSelectionActive, setTopicSelectionActive] = useState(false);

  const dialSize = Math.min(340, Math.max(285, Math.floor(width * 0.84)));

  const todayMinutes = useMemo(() => {
    if (!history || history.length === 0) return 0;
    const todayStr = new Date().toDateString();
    return history
      .filter((s) => s.status === 'completed' && s.started_at && new Date(s.started_at).toDateString() === todayStr)
      .reduce((acc, curr) => acc + (curr.duration_min || 0), 0);
  }, [history]);

  useEffect(() => {
    FocusLiveActivity.updateWidgetData(todayMinutes, profile?.xp_points || 0);
  }, [todayMinutes, profile?.xp_points]);

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
    isStrictViolated,
    isPlantWilted,
    toggleStrictMode,
    setStrictViolated,
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

  // Sync parameters from dashboard or StandBy deep link
  useEffect(() => {
    if (params.suggestedSubject) {
      setSubjectTag(params.suggestedSubject);
    }
    if (params.suggestedGoal) {
      setSessionGoal(params.suggestedGoal);
    }
    if (params.standby === 'true') {
      setIsManualLandscape(true);
    }
  }, [params.suggestedSubject, params.suggestedGoal, params.standby, setSubjectTag, setSessionGoal]);

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

  const rewardsSheetRef = useRef<BottomSheet>(null);
  const settingsSheetRef = useRef<BottomSheet>(null);
  const soundSheetRef = useRef<BottomSheet>(null);
  const [rewardsModalOpen, setRewardsModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [soundSheetOpen, setSoundSheetOpen] = useState(false);
  const lastActiveSoundRef = useRef<SoundKey>('rain');
  const backgroundStartTimestampRef = useRef<number | null>(null);

  // AppState listener for Strict focus mode accountability
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        backgroundStartTimestampRef.current = Date.now();
      } else if (nextAppState === 'active') {
        if (backgroundStartTimestampRef.current) {
          const secondsOut = (Date.now() - backgroundStartTimestampRef.current) / 1000;
          if (secondsOut > 10 && isStrictModeActive && isRunning) {
            setStrictViolated(true);
            useUiStore.getState().showToast('Strict mode interrupted! Bonus reward forfeited.', 'error');
          }
          backgroundStartTimestampRef.current = null;
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [isStrictModeActive, isRunning, setStrictViolated]);

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

        // Ensure the latest total XP and Level are pushed to Supabase profiles
        const curProf = useAuthStore.getState().profile;
        if (curProf) {
          await supabase
            .from('profiles')
            .update({
              xp_points: curProf.xp_points,
              level: curProf.level,
              focus_seeds: curProf.xp_points,
            })
            .eq('id', authSession.user.id);
        }

        useUiStore.getState().showToast('Offline focus sessions synced successfully! 📶', 'success');
        refetchHistory();
        queryClient.invalidateQueries({ queryKey: ['stats'] });
        queryClient.invalidateQueries({ queryKey: ['profile'] });
      }
    } catch (e) {
      if (__DEV__) console.warn('Failed to sync offline sessions:', e);
    }
  }, [refetchHistory, queryClient]);

  // Run offline sync on mount
  useEffect(() => {
    syncOfflineSessions();
  }, [syncOfflineSessions]);

  // Ensure latest profile and XP are verified on mount
  useEffect(() => {
    const refreshProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (data && !error) {
          const cached = useAuthStore.getState().profile;
          const remoteXp = Number(data.xp_points || 0);
          const cachedXp = Number(cached?.xp_points || 0);
          if (cachedXp > remoteXp) {
            // Local has higher XP (e.g. from session finished offline), sync to Supabase
            await supabase
              .from('profiles')
              .update({ xp_points: cachedXp, level: cached?.level || 1, focus_seeds: cachedXp })
              .eq('id', session.user.id);
          } else {
            setProfile(data as any);
          }
        }
      } catch (e) {
        // Safe ignore
      }
    };
    refreshProfile();
  }, [setProfile]);

  // Handle equipping timer theme rewards
  const handleEquipTheme = (themeId: any, requiredXp: number) => {
    const userXp = profile?.xp_points || 0;
    if (userXp < requiredXp && !isPremium) {
      useUiStore.getState().showToast(`Requires ${requiredXp} XP to unlock!`, 'info');
      return;
    }
    setTheme(themeId);
    useUiStore.getState().showToast('Theme equipped! ✨', 'success');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  // Detect session completion transitions (focus -> break)
  useEffect(() => {
    if (
      prevModeRef.current === 'focus' &&
      (currentMode === 'short_break' || currentMode === 'long_break')
    ) {
      // Trigger completion summary modal
      setShowSummary(true);
      playRewardingCompletionHaptics().catch(() => {});
      FocusLiveActivity.endSession().catch(() => {});
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

      // Award Focus XP for completed focus session
      if (status === 'completed') {
        const earned = seedsEarned && seedsEarned > 0
          ? seedsEarned
          : Math.max(20, 20 + dbDuration * 2 + (isStrictModeActive && !isStrictViolated ? 25 : 0));

        const currentXp = Number(profile?.xp_points || 0);
        const newXp = currentXp + earned;
        const currentLevel = Number(profile?.level || 1);
        const newLevelInfo = calculateFocusLevel(newXp);
        const newLevel = Math.max(currentLevel, newLevelInfo.level);

        // 1. Immediately update local state so rewards are saved to AsyncStorage instantly
        const optimisticProfile = profile ? { ...profile, xp_points: newXp, level: newLevel, focus_seeds: newXp } : null;
        if (optimisticProfile) {
          setProfile(optimisticProfile);
        }

        const updatePayload: Record<string, any> = {
          xp_points: newXp,
          level: newLevel,
          focus_seeds: newXp, // keep in sync as backwards-compatible fallback
        };

        // 2. Persist to Supabase
        const { data: updatedProfData, error: profError } = await supabase
          .from('profiles')
          .update(updatePayload)
          .eq('id', session.user.id)
          .select()
          .maybeSingle();

        if (updatedProfData) {
          setProfile(updatedProfData as any);
        } else if (profError && __DEV__) {
          console.warn('Profiles update error:', profError);
        }
        queryClient.invalidateQueries({ queryKey: ['profile'] });

        if (newLevel > currentLevel) {
          useUiStore.getState().showToast(`🎉 Level Up! You reached Level ${newLevel}: ${newLevelInfo.title}!`, 'success');
        } else {
          useUiStore.getState().showToast(`+${earned} Focus XP Earned! ⚡`, 'success');
        }

        trackEvent('focus_reward_earned', {
          xp_earned: earned,
          total_xp: newXp,
          level: newLevel,
          rank_title: newLevelInfo.title,
          duration_min: dbDuration,
        });
      }

      // Schedule spaced-repetition reminders
      if (status === 'completed' && subjectTag) {
        scheduleRevisionAlert(subjectTag, 1).catch(() => {});
        scheduleRevisionAlert(subjectTag, 3).catch(() => {});
      }

      // Refetch history list
      refetchHistory();
      queryClient.invalidateQueries({ queryKey: ['stats'] });

      // Trigger satisfying multi-stage completion haptics
      await playRewardingCompletionHaptics();
      FocusLiveActivity.endSession().catch(() => {});

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
          // Award XP locally so user never loses their reward even when offline
          if (status === 'completed') {
            const earned = seedsEarned && seedsEarned > 0
              ? seedsEarned
              : Math.max(20, 20 + dbDuration * 2 + (isStrictModeActive && !isStrictViolated ? 25 : 0));
            const currentXp = Number(profile?.xp_points || 0);
            const newXp = currentXp + earned;
            const currentLevel = Number(profile?.level || 1);
            const newLevelInfo = calculateFocusLevel(newXp);
            const newLevel = Math.max(currentLevel, newLevelInfo.level);

            const offlineProfile = profile
              ? { ...profile, xp_points: newXp, level: newLevel, focus_seeds: newXp }
              : null;
            if (offlineProfile) {
              setProfile(offlineProfile);
            }
            useUiStore.getState().showToast(`+${earned} Focus XP Saved! ⚡`, 'success');
          }

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
            'Focus session and rewards saved locally! They will sync with the cloud automatically when connection is restored.',
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
    FocusLiveActivity.endSession().catch(() => {});
  }, [resetSession, ambient]);

  const handlePlayPause = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isRunning) {
      pause();
      FocusLiveActivity.updateSession(true, secondsLeft, sessionGoal).catch(() => {});
    } else if (isPaused) {
      resume();
      FocusLiveActivity.updateSession(false, secondsLeft, sessionGoal).catch(() => {});
    } else {
      start();
      FocusLiveActivity.startSession({
        sessionName: sessionGoal.trim() || 'Deep Focus',
        durationSeconds: secondsLeft,
        sessionGoal: sessionGoal.trim() || 'Focus Session',
        accentHex: TIMER_THEMES.find((t) => t.id === activeTheme)?.color || '#5B4FE8',
      }).catch(() => {});
    }
  }, [isRunning, isPaused, pause, resume, start, secondsLeft, sessionGoal]);

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
              FocusLiveActivity.endSession().catch(() => {});
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
    
    // Opt-in Rewarded Video Ad for unlocking premium ambient soundscapes (ONLY for Non-Premium users)
    if (!isPremium && key && (key === 'lofi' || key === 'cafe' || key === 'brown_noise' || key === 'ocean')) {
      Alert.alert(
        'Unlock Soundscape 🎧',
        `Upgrade to Gold for unlimited access, or watch a short video ad to unlock ${key.toUpperCase().replace('_', ' ')} for this focus session.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Upgrade to Gold 👑',
            onPress: () => router.push('/paywall'),
          },
          {
            text: 'Watch Ad & Unlock 🎬',
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
      lastActiveSoundRef.current = key;
      await ambient.play(key, soundVolume);
    } else {
      await ambient.stop();
    }
  }, [isPremium, setSound, ambient, soundVolume]);

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
      <StatusBar barStyle="light-content" backgroundColor="#111013" translucent={false} />

      {/* Ambient background glows */}
      <View style={styles.circle1} pointerEvents="none" />
      <View style={styles.circle2} pointerEvents="none" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          {/* Top bar with back button, centered TODAY 0 min, and action buttons */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.circleGlassBtn}
              onPress={() => router.replace('/')}
              activeOpacity={0.7}
              accessibilityLabel="Back to Home"
            >
              <Text style={styles.closeIconText}>✕</Text>
            </TouchableOpacity>

            <View style={styles.topCenterContainer}>
              <Text style={styles.topTodayText}>TODAY  {todayMinutes} min</Text>
            </View>

            <View style={styles.topRightActions}>
              <TouchableOpacity
                style={styles.rewardsBalanceCleanChip}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  setRewardsModalOpen(true);
                  rewardsSheetRef.current?.expand();
                }}
                activeOpacity={0.7}
              >
                <Trophy size={11} color="#E8A020" />
                <Text style={styles.rewardsBalanceCleanText}>
                  {profile?.xp_points || 0} XP
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.circleGlassBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  setIsManualLandscape(true);
                }}
                activeOpacity={0.7}
                accessibilityLabel="StandBy Desk Clock"
              >
                <Maximize2 size={15} color="rgba(255, 255, 255, 0.85)" />
              </TouchableOpacity>

              {/* Ambient Sound & Music button (Accessible anytime, running or idle) */}
              <TouchableOpacity
                style={[styles.circleGlassBtn, activeSound ? styles.circleGlassBtnActiveSound : null]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  setSoundSheetOpen(true);
                  soundSheetRef.current?.expand();
                }}
                activeOpacity={0.7}
                accessibilityLabel="Ambient Sound & Music"
              >
                {activeSound ? (
                  <Volume2 size={15} color="#5B4FE8" />
                ) : (
                  <VolumeX size={15} color="rgba(255, 255, 255, 0.7)" />
                )}
              </TouchableOpacity>

              {!isRunning && (
                <TouchableOpacity
                  style={styles.circleGlassBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    setSettingsOpen(true);
                    settingsSheetRef.current?.expand();
                  }}
                  activeOpacity={0.7}
                  accessibilityLabel="Timer Settings"
                >
                  <Settings size={15} color="rgba(255, 255, 255, 0.7)" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Routine Link Banner if linked from schedule */}
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

          <ScrollView
            scrollEnabled={scrollEnabled}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContainer}
          >
            {/* Header: What are you focusing on? */}
            <Text style={styles.mainHeading}>What are you focusing on?</Text>

            {/* Frosted Liquid Glass Pill Capsule Input */}
            <View style={styles.sessionPillCapsule}>
              <TextInput
                style={styles.sessionPillInput}
                value={sessionGoal}
                onChangeText={setSessionGoal}
                placeholder="Name this session"
                placeholderTextColor="rgba(255, 255, 255, 0.45)"
                maxLength={60}
                returnKeyType="done"
                editable={!isRunning}
              />
            </View>

            {/* Retro Chronometer Dial */}
            <View style={styles.dialContainer}>
              <TimerCircle
                size={dialSize}
                secondsLeft={secondsLeft}
                totalSeconds={totalSeconds}
                isRunning={isRunning}
                currentMode={currentMode}
              />
            </View>

            {/* When Running or Paused: Active Session Music / Sound HUD */}
            {(isRunning || isPaused) && (
              <View style={styles.activeSessionControlRow}>
                {/* Sound / Music Capsule: Tap to open soundscape sheet and change sound */}
                <TouchableOpacity
                  style={[styles.activeSoundPill, activeSound ? styles.activeSoundPillPlaying : null]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    setSoundSheetOpen(true);
                    soundSheetRef.current?.expand();
                  }}
                  activeOpacity={0.8}
                  accessibilityLabel="Change ambient music"
                >
                  {activeSound ? (
                    <Volume2 size={14} color="#5B4FE8" />
                  ) : (
                    <VolumeX size={14} color="rgba(255, 255, 255, 0.5)" />
                  )}
                  <Text style={[styles.activeSoundText, activeSound ? styles.activeSoundTextPlaying : null]}>
                    {activeSound ? activeSound.replace('_', ' ').toUpperCase() : 'SOUND OFF'}
                  </Text>
                  <View style={styles.activeSoundChangeTag}>
                    <Text style={styles.activeSoundChangeTagText}>CHANGE</Text>
                  </View>
                </TouchableOpacity>

                {/* Instant Mute / Unmute Toggle Button */}
                <TouchableOpacity
                  style={[styles.activeMuteToggleBtn, activeSound ? styles.activeMuteToggleBtnPlaying : null]}
                  onPress={async () => {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    if (activeSound) {
                      handleSoundSelect(null);
                    } else {
                      handleSoundSelect(lastActiveSoundRef.current || 'rain');
                    }
                  }}
                  activeOpacity={0.7}
                  accessibilityLabel={activeSound ? 'Mute audio' : 'Play ambient audio'}
                >
                  {activeSound ? (
                    <VolumeX size={15} color="#FDA4AF" />
                  ) : (
                    <Volume2 size={15} color="#5B4FE8" />
                  )}
                </TouchableOpacity>

                {/* Subject Tag Pill if present */}
                {subjectTag && (
                  <View style={styles.activeSubjectPill}>
                    <Text style={styles.activeSubjectText} numberOfLines={1}>
                      🏷  {subjectTag}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Duration Presets & Secondary options (when idle) */}
            {!isRunning && !isPaused && (
              <View style={styles.presetsSection}>
                <View style={styles.presetsRow}>
                  {(['25/5', '50/10', '90/20', 'custom'] as FocusPreset[]).map((preset) => {
                    const active = selectedPreset === preset;
                    let displayLabel = preset === 'custom' ? 'Custom' : `${preset.split('/')[0]} min`;
                    return (
                      <TouchableOpacity
                        key={preset}
                        style={[styles.presetPill, active && styles.presetPillActive]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                          setPreset(preset);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.presetPillText, active && styles.presetPillTextActive]}>
                          {displayLabel}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Custom Stepper */}
                {selectedPreset === 'custom' && (
                  <View style={styles.stepperContainer}>
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        setCustomMinutes(Math.max(1, customMinutes - 5));
                      }}
                      style={styles.stepperButton}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.stepperButtonText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.stepperValueText}>{customMinutes} min</Text>
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        setCustomMinutes(customMinutes + 5);
                      }}
                      style={styles.stepperButton}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.stepperButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Secondary Pill row: Subject & Ambient Sound */}
                <View style={styles.secondaryPillsRow}>
                  <SubjectPicker
                    selectedSubject={subjectTag}
                    onSelect={setSubjectTag}
                    isDark
                    customTrigger={(open) => (
                      <TouchableOpacity
                        style={styles.optionGlassPill}
                        onPress={async () => {
                          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          open();
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.optionGlassPillText} numberOfLines={1}>
                          🏷  {subjectTag || 'General'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  />

                  {/* Sound Trigger Pill (Opens Soundscape sheet) */}
                  <TouchableOpacity
                    style={[styles.optionGlassPill, activeSound ? styles.optionGlassPillActive : null]}
                    onPress={async () => {
                      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSoundSheetOpen(true);
                      soundSheetRef.current?.expand();
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.optionGlassPillText, activeSound ? styles.optionGlassPillTextActive : null]}>
                      🎧  {activeSound ? activeSound.replace('_', ' ') : 'Sound off'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ONE OBVIOUS PRIMARY ACTION BUTTON */}
            <View style={styles.primaryActionWrapper}>
              <TouchableOpacity
                style={styles.prominentLiquidGlassBtn}
                onPress={handlePlayPause}
                activeOpacity={0.85}
                accessibilityLabel={
                  isRunning ? 'Pause Focus' : isPaused ? 'Resume Focus' : 'Start Focus'
                }
              >
                <Text style={styles.prominentActionText}>
                  {isRunning ? '⏸  Pause Focus' : isPaused ? '▶  Resume Focus' : '▶  Start Focus'}
                </Text>
              </TouchableOpacity>

              {/* Running/Paused secondary actions */}
              {(isRunning || isPaused) && (
                <View style={styles.activeSecondaryRow}>
                  <TouchableOpacity
                    style={styles.endSessionBtn}
                    onPress={handleReset}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.endSessionText}>⏹  End Session</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Floating Bottom Segmented Pill Bar: [ Focus | History ] */}
          <View style={styles.bottomFloatingNav}>
            <View style={styles.bottomNavCapsule}>
              {/* Focus Tab (Active) */}
              <TouchableOpacity
                style={styles.bottomNavSegmentActive}
                activeOpacity={0.9}
              >
                <Power size={16} color="#5B4FE8" strokeWidth={2.6} />
                <Text style={styles.bottomNavTextActive}>Focus</Text>
              </TouchableOpacity>

              {/* History Tab */}
              <TouchableOpacity
                style={styles.bottomNavSegmentInactive}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  setHistorySheetOpen(true);
                  historySheetRef.current?.expand();
                }}
                activeOpacity={0.7}
              >
                <FileText size={16} color="rgba(255, 255, 255, 0.7)" strokeWidth={2} />
                <Text style={styles.bottomNavTextInactive}>History</Text>
              </TouchableOpacity>
            </View>
          </View>
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
        onSave={(mood, note, accuracy, xp) => handleSaveSession(mood, note, 'completed', accuracy, xp)}
        onDiscard={handleDiscardSession}
        isStrictMode={isStrictModeActive}
        isStrictViolated={isStrictViolated}
      />

      {/* FOCUS REWARDS & ACHIEVEMENTS SHEET */}
      <BottomSheet
        ref={rewardsSheetRef}
        index={-1}
        snapPoints={['75%', '92%']}
        enablePanDownToClose={true}
        backdropComponent={renderTopicBackdrop}
        backgroundStyle={styles.bottomSheetDarkBackground}
        handleIndicatorStyle={styles.bottomSheetDarkIndicator}
        onChange={(idx) => {
          setRewardsModalOpen(idx !== -1);
        }}
      >
        <BottomSheetScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.rewardsContentContainer}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.rewardsTitle}>Focus Rewards 🏆</Text>
          <Text style={styles.rewardsSubtitle}>Complete focus sessions to earn XP, level up, and unlock sleek timer themes.</Text>
            {/* Level & XP Progress Card */}
            {(() => {
              const currentXp = profile?.xp_points || 0;
              const levelInfo = calculateFocusLevel(currentXp);
              const prev = levelInfo.prevXp;
              const next = levelInfo.nextXp;
              const progressRatio = next
                ? Math.min(1, Math.max(0, (currentXp - prev) / (next - prev)))
                : 1;

              return (
                <View style={styles.levelProgressCard}>
                  <View style={styles.levelHeaderRow}>
                    <View style={styles.levelBadge}>
                      <Text style={styles.levelBadgeText}>LEVEL {levelInfo.level}</Text>
                    </View>
                    <Text style={styles.levelTitleText}>{levelInfo.title}</Text>
                  </View>

                  <View style={styles.xpProgressTrack}>
                    <View style={[styles.xpProgressFill, { width: `${Math.round(progressRatio * 100)}%` }]} />
                  </View>

                  <View style={styles.xpInfoRow}>
                    <Text style={styles.xpCurrentText}>{currentXp} XP Total</Text>
                    <Text style={styles.xpNextText}>
                      {next ? `${next - currentXp} XP to Level ${levelInfo.level + 1}` : 'Max Rank Achieved!'}
                    </Text>
                  </View>
                </View>
              );
            })()}

            {/* Section: Unlockable Themes */}
            <Text style={styles.rewardsSectionHeading}>TIMER THEMES</Text>
            {REWARD_THEMES.map((t) => {
              const currentXp = profile?.xp_points || 0;
              const isUnlocked = isPremium || currentXp >= t.requiredXp;
              const isEquipped = activeTheme === t.id;

              return (
                <View key={t.id} style={styles.rewardThemeItem}>
                  <View style={[styles.rewardThemeColorDot, { backgroundColor: t.color }]} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.rewardThemeName}>{t.name}</Text>
                    <Text style={styles.rewardThemeDesc}>
                      {isUnlocked ? t.desc : `Unlocks at ${t.requiredXp} XP (Level ${t.requiredLevel})`}
                    </Text>
                  </View>

                  {isEquipped ? (
                    <View style={styles.equippedBadge}>
                      <Check size={12} color="#5B4FE8" />
                      <Text style={styles.equippedBadgeText}>Active</Text>
                    </View>
                  ) : isUnlocked ? (
                    <TouchableOpacity
                      style={styles.equipThemeBtn}
                      onPress={() => handleEquipTheme(t.id, t.requiredXp)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.equipThemeBtnText}>Equip</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.lockedThemeBadge}>
                      <Lock size={12} color="#9B9BAF" />
                      <Text style={styles.lockedThemeText}>{t.requiredXp} XP</Text>
                    </View>
                  )}
                </View>
              );
            })}

            {/* Section: Focus Milestones */}
            <Text style={styles.rewardsSectionHeading}>XP REWARD BREAKDOWN</Text>
            <View style={styles.milestoneItem}>
              <View style={styles.milestoneIconWrap}>
                <Zap size={16} color="#10B981" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.milestoneTitle}>Focus Session Completion</Text>
                <Text style={styles.milestoneDesc}>Base +20 XP + 2 XP for each focused minute</Text>
              </View>
              <Text style={styles.milestoneXpTag}>+20+ XP</Text>
            </View>

            <View style={styles.milestoneItem}>
              <View style={styles.milestoneIconWrap}>
                <Shield size={16} color="#E8A020" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.milestoneTitle}>Strict Focus Mode Bonus</Text>
                <Text style={styles.milestoneDesc}>Complete without leaving the app</Text>
              </View>
              <Text style={styles.milestoneXpTag}>+25 XP</Text>
            </View>

            <View style={styles.milestoneItem}>
              <View style={styles.milestoneIconWrap}>
                <Target size={16} color="#5B4FE8" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.milestoneTitle}>Deep Flow State</Text>
                <Text style={styles.milestoneDesc}>Reflect as Fully Focused in session summary</Text>
              </View>
              <Text style={styles.milestoneXpTag}>+15 XP</Text>
            </View>
          </BottomSheetScrollView>
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
          <Text style={styles.settingsSheetTitle}>Timer Options</Text>

          {/* Strict Mode Toggle inside Settings */}
          <View style={styles.settingsRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.settingsLabel}>Strict Focus Mode</Text>
              <Text style={styles.settingsDesc}>High-accountability mode. Leaving the app forfeits bonus rewards.</Text>
            </View>
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

      {/* iPhone StandBy / Desk Clock Landscape Overlay */}
      <LandscapeFocusClock
        isVisible={isLandscape}
        secondsLeft={secondsLeft}
        totalSeconds={totalSeconds}
        isRunning={isRunning}
        isPaused={isPaused}
        sessionGoal={sessionGoal}
        subjectTag={subjectTag}
        activeThemeColor={TIMER_THEMES.find((t) => t.id === activeTheme)?.color || '#5B4FE8'}
        activeSound={activeSound}
        currentMode={currentMode}
        todayMinutes={todayMinutes}
        onPlayPause={() => {
          if (isRunning && !isPaused) {
            pause();
          } else if (isPaused) {
            resume();
          } else {
            start();
          }
        }}
        onStop={() => stop()}
        onToggleSound={() => {
          if (activeSound) {
            handleSoundSelect(null);
          } else {
            handleSoundSelect(lastActiveSoundRef.current || 'rain');
          }
        }}
        onClose={() => setIsManualLandscape(false)}
      />

      {/* FOCUS HISTORY BOTTOM SHEET */}
      <BottomSheet
        ref={historySheetRef}
        index={-1}
        snapPoints={['75%', '92%']}
        enablePanDownToClose={true}
        backdropComponent={renderTopicBackdrop}
        backgroundStyle={styles.bottomSheetDarkBackground}
        handleIndicatorStyle={styles.bottomSheetDarkIndicator}
        onChange={(idx) => {
          setHistorySheetOpen(idx !== -1);
        }}
      >
        <BottomSheetScrollView
          style={styles.historySheetScrollView}
          contentContainerStyle={styles.historySheetContent}
          showsVerticalScrollIndicator={true}
        >
          <Text style={styles.historySheetTitle}>Focus History</Text>
          <Text style={styles.historySheetSubtitle}>
            Today: {todayMinutes}m focused across {history.filter(s => s.status === 'completed').length} completed sessions.
          </Text>

          {isLoadingHistory ? (
            <ActivityIndicator color="#5B4FE8" style={{ marginVertical: 32 }} />
          ) : history.length === 0 ? (
            <View style={styles.emptyHistoryCard}>
              <Text style={styles.emptyHistoryText}>No focus sessions logged yet.</Text>
            </View>
          ) : (
            history.map((session) => (
              <HistoryItemCard key={session.id} session={session} />
            ))
          )}
        </BottomSheetScrollView>
      </BottomSheet>

      {/* AMBIENT SOUNDSCAPES & MUSIC BOTTOM SHEET */}
      <BottomSheet
        ref={soundSheetRef}
        index={-1}
        snapPoints={['55%']}
        enablePanDownToClose={true}
        backdropComponent={renderTopicBackdrop}
        backgroundStyle={styles.bottomSheetDarkBackground}
        handleIndicatorStyle={styles.bottomSheetDarkIndicator}
        onChange={(idx) => {
          setSoundSheetOpen(idx !== -1);
        }}
      >
        <BottomSheetView style={styles.soundSheetContent}>
          <Text style={styles.soundSheetTitle}>Ambient Soundscapes 🎧</Text>
          <Text style={styles.soundSheetSubtitle}>
            Choose soothing background soundscapes to deepen your focus and block distractions.
          </Text>

          <SoundPicker
            activeSound={activeSound}
            onSelect={(sound) => handleSoundSelect(sound)}
            volume={soundVolume}
            onVolumeChange={handleVolumeChange}
            isPremium={isPremium}
            onPremiumTrigger={() => router.push('/paywall')}
          />

          {/* Quick Mute Action Button */}
          <TouchableOpacity
            style={[styles.muteAllButton, !activeSound && styles.muteAllButtonActive]}
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              handleSoundSelect(null);
            }}
            activeOpacity={0.7}
          >
            <VolumeX size={15} color={!activeSound ? '#5B4FE8' : 'rgba(255, 255, 255, 0.5)'} />
            <Text style={[styles.muteAllText, !activeSound && styles.muteAllTextActive]}>
              {!activeSound ? 'Audio Muted' : 'Turn Off Sound'}
            </Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111013',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContainer: {
    paddingBottom: 90,
    alignItems: 'center',
  },
  circle1: {
    position: 'absolute',
    top: -90,
    left: -70,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(91, 79, 232, 0.08)',
  },
  circle2: {
    position: 'absolute',
    bottom: 80,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(91, 79, 232, 0.05)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    marginBottom: 8,
  },
  circleGlassBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleGlassBtnActiveSound: {
    backgroundColor: 'rgba(91, 79, 232, 0.18)',
    borderColor: 'rgba(91, 79, 232, 0.5)',
  },
  closeIconText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
  },
  topCenterContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTodayText: {
    fontFamily: 'DMMono',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2.2,
    color: 'rgba(255, 255, 255, 0.75)',
    textTransform: 'uppercase',
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mainHeading: {
    fontFamily: 'InstrumentSerif',
    fontSize: 32,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 14,
    letterSpacing: -0.4,
  },
  sessionPillCapsule: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1.2,
    borderRadius: 9999,
    height: 50,
    paddingHorizontal: 20,
    width: '88%',
    maxWidth: 380,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  sessionPillInput: {
    fontFamily: 'InstrumentSerif',
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    width: '100%',
    height: '100%',
  },
  dialContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  presetsSection: {
    alignItems: 'center',
    marginVertical: 8,
    width: '100%',
  },
  presetsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  presetPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  presetPillActive: {
    backgroundColor: 'rgba(91, 79, 232, 0.20)',
    borderColor: '#5B4FE8',
  },
  presetPillText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.55)',
  },
  presetPillTextActive: {
    color: '#A89EF8',
    fontWeight: '700',
  },
  secondaryPillsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionGlassPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  optionGlassPillActive: {
    backgroundColor: 'rgba(91, 79, 232, 0.20)',
    borderColor: '#5B4FE8',
  },
  optionGlassPillText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  optionGlassPillTextActive: {
    color: '#A89EF8',
    fontWeight: '700',
  },
  primaryActionWrapper: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
    width: '100%',
  },
  prominentLiquidGlassBtn: {
    width: '88%',
    maxWidth: 380,
    height: 60,
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.26)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.42)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  prominentActionText: {
    fontFamily: 'InstrumentSerif',
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  activeSecondaryRow: {
    marginTop: 10,
    alignItems: 'center',
  },
  endSessionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(232, 88, 88, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(232, 88, 88, 0.3)',
  },
  endSessionText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: '#FF7070',
    fontWeight: '600',
  },
  bottomFloatingNav: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  bottomNavCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    padding: 4,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  bottomNavSegmentActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1F1D23',
    height: 46,
    borderRadius: 23,
    paddingHorizontal: 20,
  },
  bottomNavTextActive: {
    fontFamily: 'DMSans-Bold',
    fontSize: 12,
    color: '#5B4FE8',
    fontWeight: '800',
  },
  bottomNavSegmentInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 46,
    borderRadius: 23,
    paddingHorizontal: 20,
  },
  bottomNavTextInactive: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
  },
  bottomSheetDarkBackground: {
    backgroundColor: '#16151A',
  },
  bottomSheetDarkIndicator: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  historySheetScrollView: {
    flex: 1,
  },
  historySheetContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 60,
  },
  historySheetTitle: {
    fontFamily: 'InstrumentSerif',
    fontSize: 26,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  historySheetSubtitle: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.55)',
    textAlign: 'center',
    marginBottom: 16,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
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
  rewardsBalanceCleanChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 8,
    backgroundColor: 'rgba(232, 160, 32, 0.12)',
    borderColor: 'rgba(232, 160, 32, 0.3)',
    borderWidth: 1,
  },
  rewardsBalanceCleanText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
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
  rewardsContentContainer: {
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 60,
  },
  rewardsTitle: {
    fontFamily: 'InstrumentSerif',
    fontSize: 26,
    color: '#17172A',
    textAlign: 'center',
    marginBottom: 4,
  },
  rewardsSubtitle: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#9B9BAF',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  rewardsList: {
    flex: 1,
  },
  levelProgressCard: {
    backgroundColor: '#F8F8FC',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ECECF4',
    marginBottom: 20,
  },
  levelHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  levelBadge: {
    backgroundColor: '#5B4FE8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  levelBadgeText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  levelTitleText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 15,
    fontWeight: '700',
    color: '#17172A',
  },
  xpProgressTrack: {
    height: 8,
    backgroundColor: '#E4E4EE',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  xpProgressFill: {
    height: '100%',
    backgroundColor: '#E8A020',
    borderRadius: 4,
  },
  xpInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  xpCurrentText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    fontWeight: '600',
    color: '#5B4FE8',
  },
  xpNextText: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#9B9BAF',
  },
  rewardsSectionHeading: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    fontWeight: '700',
    color: '#9B9BAF',
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 10,
  },
  rewardThemeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EFFB',
  },
  rewardThemeColorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  rewardThemeName: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    fontWeight: '600',
    color: '#17172A',
  },
  rewardThemeDesc: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#9B9BAF',
    marginTop: 2,
  },
  equippedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(91, 79, 232, 0.1)',
    borderColor: '#5B4FE8',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  equippedBadgeText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    fontWeight: '700',
    color: '#5B4FE8',
  },
  equipThemeBtn: {
    backgroundColor: '#5B4FE8',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  equipThemeBtnText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  lockedThemeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0EFFB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  lockedThemeText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    color: '#9B9BAF',
    fontWeight: '600',
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EFFB',
  },
  milestoneIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F4F3FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    fontWeight: '600',
    color: '#17172A',
  },
  milestoneDesc: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#9B9BAF',
    marginTop: 1,
  },
  milestoneXpTag: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    fontWeight: '700',
    color: '#E8A020',
    backgroundColor: 'rgba(232, 160, 32, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeSessionControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginVertical: 14,
    width: '100%',
  },
  activeSoundPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 9999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  activeSoundPillPlaying: {
    backgroundColor: 'rgba(91, 79, 232, 0.18)',
    borderColor: 'rgba(91, 79, 232, 0.5)',
  },
  activeSoundText: {
    fontFamily: 'DMMono',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  activeSoundTextPlaying: {
    color: '#A89EF8',
  },
  activeSoundChangeTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeSoundChangeTagText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 9,
    letterSpacing: 0.8,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  activeMuteToggleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeMuteToggleBtnPlaying: {
    borderColor: 'rgba(91, 79, 232, 0.5)',
    backgroundColor: 'rgba(91, 79, 232, 0.15)',
  },
  activeSubjectPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: 140,
  },
  activeSubjectText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  soundSheetContent: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 40,
  },
  soundSheetTitle: {
    fontFamily: 'InstrumentSerif',
    fontSize: 26,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  soundSheetSubtitle: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.55)',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  muteAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  muteAllButtonActive: {
    borderColor: 'rgba(91, 79, 232, 0.4)',
    backgroundColor: 'rgba(91, 79, 232, 0.12)',
  },
  muteAllText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  muteAllTextActive: {
    color: '#A89EF8',
    fontWeight: '700',
  },
});
