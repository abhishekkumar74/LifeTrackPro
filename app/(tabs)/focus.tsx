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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
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
import { scheduleRevisionAlert, triggerLocalFocusCompleteNotification } from '@/lib/notifications';
import { useNotificationStore } from '@/lib/store/notification.store';
import {
  Settings,
  Maximize2,
  Trophy,
  Zap,
  Shield,
  Clock,
  X,
  Target,
  Check,
  Lock,
  Award,
  Power,
  FileText,
  Volume2,
  VolumeX,
  Volume1,
  Sparkles,
  CloudRain,
  Coffee,
  Waves,
  Music,
  Radio,
  Play,
  Pause,
  Square,
  Headphones,
  Tag,
} from 'lucide-react-native';
import { useAndroidBackHandler } from '@/lib/hooks/use-android-back';
import { trackEvent } from '@/lib/posthog';
import { FocusLiveActivity } from '@/lib/native/live-activity';
import * as ScreenOrientation from 'expo-screen-orientation';

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

import {
  calculateFocusLevel,
  calculateSessionXP,
  isSoundUnlocked,
  SOUND_REWARD_LEVELS,
  getStreakShieldCount,
  setStreakShieldCount,
  STREAK_SHIELD_XP_COST,
  MAX_STREAK_SHIELDS,
} from '@/lib/utils/focus-rewards';
export { calculateFocusLevel };

const REWARD_THEMES = [
  { id: 'default', name: 'Indigo Core', color: '#5B4FE8', requiredLevel: 1, requiredXp: 0, desc: 'Clean default indigo focus theme' },
  { id: 'mint', name: 'Emerald Calm', color: '#00B894', requiredLevel: 2, requiredXp: 300, desc: 'Soothing mint green for calm focus' },
  { id: 'sunset', name: 'Warm Ember', color: '#FF5E62', requiredLevel: 3, requiredXp: 750, desc: 'Energizing sunset gradient vibe' },
  { id: 'rose_gold', name: 'Rose Elegance', color: '#FDA4AF', requiredLevel: 4, requiredXp: 1500, desc: 'Sophisticated aesthetic rose-gold hue' },
  { id: 'gold', name: 'Golden Prestige', color: '#E8A020', requiredLevel: 5, requiredXp: 3000, desc: 'Elite gold theme for master focusers' },
  { id: 'nebula', name: 'Cosmic Nebula', color: '#D946EF', requiredLevel: 6, requiredXp: 6000, desc: 'Deep ultraviolet nebula glow' },
  { id: 'obsidian', name: 'Stealth Obsidian', color: '#475569', requiredLevel: 7, requiredXp: 12000, desc: 'Ultimate monochrome deep focus theme' },
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
  const insets = useSafeAreaInsets();
  const androidTopExtra = Platform.OS === 'android' && insets.top === 0 ? (StatusBar.currentHeight || 28) : 0;
  const isPhysicalLandscape = width > height;
  const [isManualLandscape, setIsManualLandscape] = useState(false);
  const [isDismissedInLandscape, setIsDismissedInLandscape] = useState(false);

  // When device returns to physical portrait, reset dismissed flag, manual lock, and unlock orientation
  useEffect(() => {
    if (!isPhysicalLandscape) {
      setIsDismissedInLandscape(false);
      setIsManualLandscape(false);
      ScreenOrientation.unlockAsync().catch(() => {});
    }
  }, [isPhysicalLandscape]);

  // StandBy is visible if physically horizontal (unless dismissed), or forced manually
  const isLandscape = (isPhysicalLandscape && !isDismissedInLandscape) || isManualLandscape;

  const handleOpenStandBy = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setIsDismissedInLandscape(false);
      setIsManualLandscape(true);
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    } catch {
      setIsManualLandscape(true);
    }
  }, []);

  const handleCloseStandBy = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setIsManualLandscape(false);
      setIsDismissedInLandscape(true);
      if (Platform.OS === 'android') {
        StatusBar.setBarStyle('light-content', true);
        StatusBar.setBackgroundColor('#111013', true);
        StatusBar.setTranslucent(false);
      }
      try {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      } catch {}
      try {
        await ScreenOrientation.unlockAsync();
      } catch {}
    } catch {
      setIsManualLandscape(false);
      setIsDismissedInLandscape(true);
      if (Platform.OS === 'android') {
        StatusBar.setBarStyle('light-content', true);
        StatusBar.setBackgroundColor('#111013', true);
        StatusBar.setTranslucent(false);
      }
      ScreenOrientation.unlockAsync().catch(() => {});
    }
  }, []);

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

  useEffect(() => {
    if (params.standby === 'true') {
      handleOpenStandBy();
    }
  }, [params.standby, handleOpenStandBy]);

  // Keep screen orientation unlocked so sensor auto-rotate works naturally and freely
  useEffect(() => {
    ScreenOrientation.unlockAsync().catch(() => {});
    return () => {
      ScreenOrientation.unlockAsync().catch(() => {});
    };
  }, []);

  // Ensure status bar is ALWAYS light-content (crisp white icons & text) when Focus tab is active, and restores smoothly on exit
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle('light-content', true);
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('#111013', true);
        StatusBar.setTranslucent(false);
      }
      return () => {
        StatusBar.setBarStyle('dark-content', true);
        if (Platform.OS === 'android') {
          StatusBar.setBackgroundColor('#F7F6F3', true);
          StatusBar.setTranslucent(false);
        }
      };
    }, [])
  );

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
  const [streakShields, setStreakShields] = useState<number>(1);
  const [isForgingShield, setIsForgingShield] = useState(false);
  const lastActiveSoundRef = useRef<SoundKey>('rain');
  const backgroundStartTimestampRef = useRef<number | null>(null);

  // Android back button closes open sheets first
  useAndroidBackHandler(() => {
    if (rewardsModalOpen) {
      setRewardsModalOpen(false);
      return true;
    }
    if (settingsOpen) {
      setSettingsOpen(false);
      return true;
    }
    if (soundSheetOpen) {
      setSoundSheetOpen(false);
      return true;
    }
    if (historySheetOpen) {
      setHistorySheetOpen(false);
      return true;
    }
    return false;
  });

  // Load streak shields from storage
  useEffect(() => {
    getStreakShieldCount().then((count) => setStreakShields(count));
  }, []);

  const handleBuyStreakShield = async () => {
    if (isForgingShield) return;
    if (streakShields >= MAX_STREAK_SHIELDS) {
      useUiStore.getState().showToast('Shield Vault Full! You have maximum 3/3 shields.', 'info');
      return;
    }
    const currentXp = profile?.xp_points || 0;
    if (currentXp < STREAK_SHIELD_XP_COST) {
      Alert.alert(
        'Need More Focus XP ⚡',
        `Forging a Streak Shield requires ${STREAK_SHIELD_XP_COST} XP.\nYou currently have ${currentXp} XP.\n\nComplete focus sessions to earn XP!`,
        [{ text: 'Got It' }]
      );
      return;
    }

    setIsForgingShield(true);
    try {
      const success = useAuthStore.getState().deductXp(STREAK_SHIELD_XP_COST);
      if (success) {
        const newShields = streakShields + 1;
        setStreakShields(newShields);
        await setStreakShieldCount(newShields);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Sync deducted XP to Supabase in background
        const session = (await supabase.auth.getSession()).data.session;
        if (session) {
          const newXp = currentXp - STREAK_SHIELD_XP_COST;
          supabase
            .from('profiles')
            .update({ xp_points: newXp, focus_seeds: newXp })
            .eq('id', session.user.id)
            .then(() => {}, () => {});
        }

        useUiStore.getState().showToast('🛡️ Streak Shield Forged! Streak is protected.', 'success');
      }
    } catch {
      useUiStore.getState().showToast('Failed to forge shield. Please try again.', 'error');
    } finally {
      setIsForgingShield(false);
    }
  };

  const handleAdFreeShield = async () => {
    if (isForgingShield) return;
    if (streakShields >= MAX_STREAK_SHIELDS) {
      useUiStore.getState().showToast('Shield Vault Full! You have maximum 3/3 shields.', 'info');
      return;
    }

    AdRewarded.showRewardAd(async () => {
      const newShields = streakShields + 1;
      setStreakShields(newShields);
      await setStreakShieldCount(newShields);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      useUiStore.getState().showToast('🛡️ Streak Shield Claimed via Ad! Streak is safe.', 'success');
    });
  };

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
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" />
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

      // Award Focus XP for completed focus session or saved session
      if (status === 'completed' || (status === 'interrupted' && dbDuration >= 1)) {
        const earned = seedsEarned && seedsEarned > 0
          ? seedsEarned
          : calculateSessionXP({
              durationMinutes: dbDuration,
              isStrictMode: isStrictModeActive,
              hasViolation: isStrictViolated,
              accuracy: focusAccuracy || (mood && mood >= 4 ? 'fully_focused' : null),
            });

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

        // Trigger local push notification & record in notification center
        triggerLocalFocusCompleteNotification(dbDuration, earned).catch(() => {});
        useNotificationStore.getState().addNotification({
          type: 'milestone',
          title: 'Focus Session Completed! 🏆',
          body: `You logged ${dbDuration}m of deep work${subjectTag ? ` on "${subjectTag}"` : ''} (+${earned} XP earned).`,
          time: 'Just now',
          targetScreen: '/(tabs)/focus',
          actionText: 'View Focus Stats',
        });

        if (subjectTag) {
          scheduleRevisionAlert(subjectTag, 1).catch(() => {});
          scheduleRevisionAlert(subjectTag, 3).catch(() => {});
        }
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
          if (status === 'completed' || (status === 'interrupted' && dbDuration >= 1)) {
            const earned = seedsEarned && seedsEarned > 0
              ? seedsEarned
              : calculateSessionXP({
                  durationMinutes: dbDuration,
                  isStrictMode: isStrictModeActive,
                  hasViolation: isStrictViolated,
                  accuracy: focusAccuracy || (mood && mood >= 4 ? 'fully_focused' : null),
                });
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
          FocusLiveActivity.endSession().catch(() => {});

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
      setShowSummary(false);
      await ambient.stop().catch(() => {});
      resetSession();
      FocusLiveActivity.endSession().catch(() => {});
      Alert.alert(
        'Session Ended',
        'Could not sync session to cloud, but timer and audio have been reset.'
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
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const wasRunning = isRunning;
    if (isRunning) {
      pause();
    }

    const minutesFocused = Math.max(1, Math.floor(elapsedSeconds / 60));

    if (elapsedSeconds >= 60) {
      Alert.alert(
        'End Focus Session?',
        `You have focused for ${minutesFocused} minute${minutesFocused > 1 ? 's' : ''}. What would you like to do?`,
        [
          {
            text: 'Save & Finish',
            onPress: async () => {
              try {
                await handleSaveSession(3, '', 'interrupted');
              } catch (saveErr) {
                if (__DEV__) console.warn('Error saving interrupted session:', saveErr);
              } finally {
                await ambient.stop().catch(() => {});
                resetSession();
                FocusLiveActivity.endSession().catch(() => {});
              }
            },
          },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: async () => {
              await ambient.stop().catch(() => {});
              resetSession();
              FocusLiveActivity.endSession().catch(() => {});
            },
          },
          {
            text: 'Keep Focusing',
            style: 'cancel',
            onPress: () => {
              if (wasRunning) {
                resume();
              }
            },
          },
        ]
      );
    } else {
      Alert.alert(
        'End Focus Session?',
        'Session duration is under 1 minute and will not be saved.',
        [
          {
            text: 'Discard & Reset',
            style: 'destructive',
            onPress: async () => {
              await ambient.stop().catch(() => {});
              resetSession();
              FocusLiveActivity.endSession().catch(() => {});
            },
          },
          {
            text: 'Keep Focusing',
            style: 'cancel',
            onPress: () => {
              if (wasRunning) {
                resume();
              }
            },
          },
        ]
      );
    }
  }, [elapsedSeconds, isRunning, pause, resume, handleSaveSession, ambient, resetSession]);

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
    
    // Check if user has unlocked this sound via Level/XP or Premium
    const userLevel = profile?.level || 1;
    const userXp = profile?.xp_points || 0;
    const unlocked = isSoundUnlocked(key, isPremium, userLevel, userXp);

    if (!unlocked && key) {
      const reqConfig = SOUND_REWARD_LEVELS.find((s) => s.key === key);
      Alert.alert(
        `Unlock ${reqConfig?.label || 'Soundscape'} 🎧`,
        `Earn ${reqConfig?.requiredXp || 250} XP (Reach Level ${reqConfig?.requiredLevel || 3}) to unlock permanently for FREE, or watch a quick ad to use for this session!`,
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
  }, [isPremium, profile?.level, profile?.xp_points, setSound, ambient, soundVolume]);

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
        <SafeAreaView style={[styles.safeArea, { paddingTop: Math.max(0, androidTopExtra) }]} edges={['top']}>
          {/* Top bar with back button, centered TODAY 0 min, and action buttons */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.circleGlassBtn}
              onPress={() => router.replace('/')}
              activeOpacity={0.7}
              accessibilityLabel="Back to Home"
            >
              <X size={15} color="rgba(255, 255, 255, 0.85)" strokeWidth={2.2} />
            </TouchableOpacity>

            <View style={styles.topCenterContainer}>
              <View style={styles.todayFocusCapsule}>
                <Clock size={11} color="#A78BFA" strokeWidth={2.4} />
                <Text style={styles.todayFocusLabel}>TODAY</Text>
                <Text style={styles.todayFocusValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                  {todayMinutes >= 60
                    ? todayMinutes % 60 === 0
                      ? `${Math.floor(todayMinutes / 60)}h`
                      : `${Math.floor(todayMinutes / 60)}h ${todayMinutes % 60}m`
                    : `${todayMinutes}m`}
                </Text>
              </View>
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
                onPress={handleOpenStandBy}
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

          <ScrollView
            scrollEnabled={scrollEnabled}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
          >
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
                    <Tag size={11} color="#A89EF8" />
                    <Text style={styles.activeSubjectText} numberOfLines={1}>
                      {subjectTag}
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
                        <Tag size={12} color="rgba(255, 255, 255, 0.75)" />
                        <Text style={styles.optionGlassPillText} numberOfLines={1}>
                          {subjectTag || 'General'}
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
                    <Headphones size={13} color={activeSound ? '#A89EF8' : 'rgba(255, 255, 255, 0.75)'} />
                    <Text style={[styles.optionGlassPillText, activeSound ? styles.optionGlassPillTextActive : null]}>
                      {activeSound ? activeSound.replace('_', ' ') : 'Sound off'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* PRIMARY & SECONDARY TIMER ACTIONS */}
            {!isRunning && !isPaused ? (
              <View style={styles.primaryActionWrapper}>
                <TouchableOpacity
                  style={styles.prominentLiquidGlassBtn}
                  onPress={handlePlayPause}
                  activeOpacity={0.85}
                  accessibilityLabel="Start Focus"
                >
                  <View style={styles.prominentActionContent}>
                    <Play size={20} color="#FFFFFF" fill="#FFFFFF" />
                    <Text style={styles.prominentActionText}>Start Focus</Text>
                  </View>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.runningActionWrapper}>
                {/* Pause / Resume Button */}
                <TouchableOpacity
                  style={[
                    styles.runningPauseBtn,
                    isPaused && styles.runningResumeBtnActive,
                  ]}
                  onPress={handlePlayPause}
                  activeOpacity={0.85}
                  accessibilityLabel={isRunning ? 'Pause Focus' : 'Resume Focus'}
                >
                  {isRunning ? (
                    <Pause size={18} color="#FFFFFF" strokeWidth={2.8} />
                  ) : (
                    <Play size={18} color="#FFFFFF" fill="#FFFFFF" />
                  )}
                  <Text style={styles.runningActionText}>
                    {isRunning ? 'Pause' : 'Resume'}
                  </Text>
                </TouchableOpacity>

                {/* End Session Button */}
                <TouchableOpacity
                  style={styles.runningEndBtn}
                  onPress={handleReset}
                  activeOpacity={0.8}
                  accessibilityLabel="End Session"
                >
                  <Square size={16} color="#FF7070" fill="#FF7070" />
                  <Text style={styles.runningEndText}>End Session</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* Floating Bottom Segmented Pill Bar: [ Focus | History ] */}
          <View style={styles.bottomFloatingNav} pointerEvents="box-none">
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
      {rewardsModalOpen && (
        <BottomSheet
          ref={rewardsSheetRef}
          index={0}
          snapPoints={['75%', '92%']}
          enableDynamicSizing={false}
          enablePanDownToClose={true}
          backdropComponent={renderTopicBackdrop}
          backgroundStyle={styles.bottomSheetDarkBackground}
          handleIndicatorStyle={styles.bottomSheetDarkIndicator}
          onClose={() => setRewardsModalOpen(false)}
          onChange={(idx) => {
            if (idx === -1) setRewardsModalOpen(false);
          }}
        >
          <BottomSheetScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.rewardsContentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Header pill & Title */}
            <View style={styles.rewardsHeaderSection}>
              <View style={styles.rewardsHeaderBadge}>
                <Trophy size={13} color="#FBBF24" />
                <Text style={styles.rewardsHeaderBadgeText}>FOCUS MASTERY & REWARDS</Text>
              </View>
              <Text style={styles.rewardsTitle}>Focus Rewards</Text>
              <Text style={styles.rewardsSubtitle}>
                Earn XP for every minute of deep work. Level up your rank and unlock custom timer ring themes.
              </Text>
            </View>

          {/* Level & XP Hero Card (VIP Cyber Rank Pass) */}
          {(() => {
            const currentXp = profile?.xp_points || 0;
            const levelInfo = calculateFocusLevel(currentXp);
            const prev = levelInfo.prevXp;
            const next = levelInfo.nextXp;
            const progressRatio = next
              ? Math.min(1, Math.max(0, (currentXp - prev) / (next - prev)))
              : 1;
            const progressPercent = Math.round(progressRatio * 100);
            const unlockedCount = REWARD_THEMES.filter(
              (t) => isPremium || currentXp >= t.requiredXp
            ).length;

            return (
              <View style={styles.rewardsHeroWrapper}>
                <View style={styles.levelProgressCard}>
                  {/* Card Top: Level Pill + Title + Rank Trophy */}
                  <View style={styles.levelHeaderRow}>
                    <View style={styles.levelHeaderLeft}>
                      <View style={styles.levelBadge}>
                        <Sparkles size={11} color="#FFFFFF" />
                        <Text style={styles.levelBadgeText}>LEVEL {levelInfo.level}</Text>
                      </View>
                      <Text style={styles.levelTitleText}>{levelInfo.title}</Text>
                    </View>
                    <View style={styles.rankIconCircle}>
                      <Award size={20} color="#FBBF24" />
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.xpProgressTrack}>
                    <View
                      style={[
                        styles.xpProgressFill,
                        { width: `${progressPercent}%` },
                      ]}
                    />
                  </View>

                  {/* Card Footer: Big XP + Next Target */}
                  <View style={styles.xpInfoRow}>
                    <View style={styles.xpTotalRow}>
                      <Text style={styles.xpBigNumber}>{currentXp}</Text>
                      <Text style={styles.xpTotalLabel}>TOTAL XP</Text>
                    </View>
                    <View style={styles.nextLevelPill}>
                      <Zap size={11} color="#F59E0B" />
                      <Text style={styles.nextLevelPillText}>
                        {next
                          ? `${next - currentXp} XP to Level ${levelInfo.level + 1}`
                          : 'Grandmaster Rank'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* 3 Micro Stats Badges */}
                <View style={styles.microStatsRow}>
                  <View style={styles.microStatCard}>
                    <Text style={styles.microStatVal}>{currentXp}</Text>
                    <Text style={styles.microStatLabel}>XP EARNED</Text>
                  </View>
                  <View style={styles.microStatCard}>
                    <Text style={styles.microStatVal}>Tier {levelInfo.level}</Text>
                    <Text style={styles.microStatLabel}>CURRENT RANK</Text>
                  </View>
                  <View style={styles.microStatCard}>
                    <Text style={styles.microStatVal}>
                      {unlockedCount} / {REWARD_THEMES.length}
                    </Text>
                    <Text style={styles.microStatLabel}>THEMES UNLOCKED</Text>
                  </View>
                </View>
              </View>
            );
          })()}

          {/* Section: Streak Shield Protection Vault */}
          <View style={[styles.sectionHeaderRow, { marginTop: 10 }]}>
            <Text style={styles.rewardsSectionHeading}>STREAK SHIELD VAULT</Text>
            <Text style={styles.sectionHeaderSub}>
              {streakShields} of {MAX_STREAK_SHIELDS} Active
            </Text>
          </View>

          <View style={styles.vaultCard}>
            <View style={styles.vaultHeaderRow}>
              <View style={styles.vaultIconContainer}>
                <Shield size={20} color="#38BDF8" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.vaultTitle}>Focus Streak Protection</Text>
                <Text style={styles.vaultSubtitle}>
                  Forged with XP to save your daily streak if you miss a study day.
                </Text>
              </View>
            </View>

            {/* Visual 3 Shield Slots */}
            <View style={styles.shieldVisualRow}>
              {[0, 1, 2].map((idx) => {
                const isFilled = idx < streakShields;
                return (
                  <View
                    key={idx}
                    style={[
                      styles.shieldSlot,
                      isFilled ? styles.shieldSlotFilled : styles.shieldSlotEmpty,
                    ]}
                  >
                    <Shield
                      size={20}
                      color={isFilled ? '#38BDF8' : '#475569'}
                      fill={isFilled ? 'rgba(56, 189, 248, 0.25)' : 'transparent'}
                    />
                    <Text style={[styles.shieldSlotText, isFilled && styles.shieldSlotTextFilled]}>
                      {isFilled ? 'Protected' : 'Empty Slot'}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Action Bar */}
            <View style={styles.vaultFooterRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Zap size={14} color="#F59E0B" />
                <Text style={styles.vaultCostText}>{STREAK_SHIELD_XP_COST} XP</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {/* Rewarded Ad Free Shield Button */}
                {!isPremium && streakShields < MAX_STREAK_SHIELDS && (
                  <TouchableOpacity
                    style={styles.adShieldBtn}
                    onPress={handleAdFreeShield}
                    disabled={isForgingShield}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.adShieldBtnText}>Free with Ad 🎬</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[
                    styles.forgeShieldBtn,
                    (streakShields >= MAX_STREAK_SHIELDS || (profile?.xp_points || 0) < STREAK_SHIELD_XP_COST) &&
                      styles.forgeShieldBtnDisabled,
                  ]}
                  onPress={handleBuyStreakShield}
                  disabled={isForgingShield || streakShields >= MAX_STREAK_SHIELDS}
                  activeOpacity={0.8}
                >
                  {isForgingShield ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.forgeShieldBtnText}>
                      {streakShields >= MAX_STREAK_SHIELDS ? 'Full' : 'Forge 🛡️'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Section: Unlockable Soundscapes */}
          <View style={[styles.sectionHeaderRow, { marginTop: 18 }]}>
            <Text style={styles.rewardsSectionHeading}>AMBIENT SOUNDSCAPES</Text>
            <Text style={styles.sectionHeaderSub}>Free XP Level Unlocks</Text>
          </View>

          {SOUND_REWARD_LEVELS.map((sound) => {
            const currentXp = profile?.xp_points || 0;
            const currentLevel = profile?.level || 1;
            const isUnlocked = isSoundUnlocked(sound.key, isPremium, currentLevel, currentXp);
            const isCurrent = activeSound === sound.key;
            
            const IconComp = sound.key === 'rain'
              ? CloudRain
              : sound.key === 'ocean'
              ? Waves
              : sound.key === 'cafe'
              ? Coffee
              : sound.key === 'lofi'
              ? Music
              : Radio;

            return (
              <View
                key={sound.key}
                style={[
                  styles.soundRewardCard,
                  isCurrent && styles.soundRewardCardActive,
                ]}
              >
                <View style={[styles.soundRewardIconWrap, isUnlocked && styles.soundRewardIconWrapUnlocked]}>
                  <IconComp size={18} color={isUnlocked ? '#60A5FA' : '#64748B'} />
                </View>

                <View style={styles.soundRewardInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.soundRewardTitle}>{sound.label}</Text>
                    {isCurrent && <View style={styles.activeMiniDot} />}
                  </View>
                  <Text style={[styles.soundRewardSub, !isUnlocked && styles.soundRewardSubLocked]}>
                    {sound.isFree
                      ? 'Available to all focusers'
                      : isUnlocked
                      ? isPremium ? 'Gold Member Benefit' : `Unlocked at Level ${sound.requiredLevel}`
                      : `Unlocks at ${sound.requiredXp} XP (Level ${sound.requiredLevel})`}
                  </Text>
                </View>

                {isUnlocked ? (
                  <TouchableOpacity
                    style={[styles.soundActionBtn, isCurrent && styles.soundActionBtnActive]}
                    onPress={() => handleSoundSelect(sound.key as any)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.soundActionBtnText, isCurrent && styles.soundActionBtnTextActive]}>
                      {isCurrent ? 'Playing' : 'Play'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.lockedThemeBadge}>
                    <Lock size={11} color="#6B7280" />
                    <Text style={styles.lockedThemeText}>Lv {sound.requiredLevel}</Text>
                  </View>
                )}
              </View>
            );
          })}

          {/* Section: Unlockable Themes */}
          <View style={[styles.sectionHeaderRow, { marginTop: 18 }]}>
            <Text style={styles.rewardsSectionHeading}>TIMER RING THEMES</Text>
            <Text style={styles.sectionHeaderSub}>
              {REWARD_THEMES.filter(t => isPremium || (profile?.xp_points || 0) >= t.requiredXp).length} of {REWARD_THEMES.length} Unlocked
            </Text>
          </View>

          {REWARD_THEMES.map((t) => {
            const currentXp = profile?.xp_points || 0;
            const isUnlocked = isPremium || currentXp >= t.requiredXp;
            const isEquipped = activeTheme === t.id;

            return (
              <View
                key={t.id}
                style={[
                  styles.rewardThemeCard,
                  isEquipped && styles.rewardThemeCardActive,
                ]}
              >
                {/* Theme Disc (mini timer ring preview) */}
                <View style={[styles.rewardThemeOuterRing, { borderColor: t.color }]}>
                  <View style={[styles.rewardThemeInnerGlow, { backgroundColor: t.color + '25' }]}>
                    <View style={[styles.rewardThemeCenterDot, { backgroundColor: t.color }]} />
                  </View>
                </View>

                {/* Name & Desc */}
                <View style={styles.rewardThemeInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.rewardThemeName}>{t.name}</Text>
                    {isEquipped && <View style={styles.activeMiniDot} />}
                  </View>
                  <Text
                    style={[
                      styles.rewardThemeDesc,
                      !isUnlocked && styles.rewardThemeDescLocked,
                    ]}
                  >
                    {isUnlocked
                      ? t.desc
                      : `Unlocks at ${t.requiredXp} XP (Level ${t.requiredLevel})`}
                  </Text>
                </View>

                {/* Action CTA */}
                {isEquipped ? (
                  <View style={styles.equippedBadge}>
                    <Check size={12} color="#A78BFA" strokeWidth={3} />
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
                    <Lock size={11} color="#6B7280" />
                    <Text style={styles.lockedThemeText}>{t.requiredXp} XP</Text>
                  </View>
                )}
              </View>
            );
          })}

          {/* Section: Focus Milestones & Fair XP Rules */}
          <View style={[styles.sectionHeaderRow, { marginTop: 18 }]}>
            <Text style={styles.rewardsSectionHeading}>HOW TO EARN XP</Text>
            <Text style={styles.sectionHeaderSub}>Balanced & Fair Economy</Text>
          </View>

          <View style={styles.milestoneCard}>
            <View style={[styles.milestoneIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Zap size={16} color="#10B981" />
            </View>
            <View style={styles.milestoneInfo}>
              <Text style={styles.milestoneTitle}>Focus Time Duration</Text>
              <Text style={styles.milestoneDesc}>Earn +1 XP for every 2 focused minutes (0.5 XP / min)</Text>
            </View>
            <View style={[styles.milestoneTag, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
              <Text style={[styles.milestoneTagText, { color: '#34D399' }]}>Base XP</Text>
            </View>
          </View>

          <View style={styles.milestoneCard}>
            <View style={[styles.milestoneIconWrap, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
              <Award size={16} color="#38BDF8" />
            </View>
            <View style={styles.milestoneInfo}>
              <Text style={styles.milestoneTitle}>Completion Milestones</Text>
              <Text style={styles.milestoneDesc}>10m: +2 XP · 25m: +4 XP · 45m+: +8 XP bonus</Text>
            </View>
            <View style={[styles.milestoneTag, { backgroundColor: 'rgba(56, 189, 248, 0.15)', borderColor: 'rgba(56, 189, 248, 0.3)' }]}>
              <Text style={[styles.milestoneTagText, { color: '#38BDF8' }]}>Up to +8 XP</Text>
            </View>
          </View>

          <View style={styles.milestoneCard}>
            <View style={[styles.milestoneIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <Shield size={16} color="#F59E0B" />
            </View>
            <View style={styles.milestoneInfo}>
              <Text style={styles.milestoneTitle}>Strict Focus Mode Bonus</Text>
              <Text style={styles.milestoneDesc}>Accountability bonus when completed without app switches</Text>
            </View>
            <View style={[styles.milestoneTag, { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.3)' }]}>
              <Text style={[styles.milestoneTagText, { color: '#FBBF24' }]}>Up to +5 XP</Text>
            </View>
          </View>

          <View style={styles.milestoneCard}>
            <View style={[styles.milestoneIconWrap, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
              <Target size={16} color="#A78BFA" />
            </View>
            <View style={styles.milestoneInfo}>
              <Text style={styles.milestoneTitle}>Mindfulness Reflection</Text>
              <Text style={styles.milestoneDesc}>Reflect honestly as "Fully Focused" in session summary</Text>
            </View>
            <View style={[styles.milestoneTag, { backgroundColor: 'rgba(139, 92, 246, 0.15)', borderColor: 'rgba(139, 92, 246, 0.3)' }]}>
              <Text style={[styles.milestoneTagText, { color: '#C4B5FD' }]}>Up to +2 XP</Text>
            </View>
          </View>

          <View style={[styles.milestoneCard, { borderColor: 'rgba(234, 179, 8, 0.4)', backgroundColor: 'rgba(234, 179, 8, 0.08)' }]}>
            <View style={[styles.milestoneIconWrap, { backgroundColor: 'rgba(234, 179, 8, 0.2)' }]}>
              <Sparkles size={16} color="#FACC15" />
            </View>
            <View style={styles.milestoneInfo}>
              <Text style={[styles.milestoneTitle, { color: '#FEF08A' }]}>2x XP Video Boost 🎬</Text>
              <Text style={styles.milestoneDesc}>Watch a quick video ad after any session to DOUBLE your XP</Text>
            </View>
            <View style={[styles.milestoneTag, { backgroundColor: 'rgba(234, 179, 8, 0.2)', borderColor: 'rgba(234, 179, 8, 0.5)' }]}>
              <Text style={[styles.milestoneTagText, { color: '#FACC15' }]}>2x XP</Text>
            </View>
          </View>
        </BottomSheetScrollView>
      </BottomSheet>
      )}

      {/* TIMER SETTINGS SHEET */}
      {settingsOpen && (
        <BottomSheet
          ref={settingsSheetRef}
          index={0}
          snapPoints={['35%']}
          enableDynamicSizing={false}
          enablePanDownToClose={true}
          backdropComponent={renderTopicBackdrop}
          backgroundStyle={styles.bottomSheetDarkBackground}
          handleIndicatorStyle={styles.bottomSheetDarkIndicator}
          onClose={() => setSettingsOpen(false)}
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
      )}

      {/* CSE Topic Selection Bottom Sheet */}
      {topicSelectionActive && (
        <BottomSheet
          ref={topicSheetRef}
          index={0}
          snapPoints={['50%']}
          enableDynamicSizing={false}
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
        onStop={handleReset}
        onToggleSound={() => {
          if (activeSound) {
            handleSoundSelect(null);
          } else {
            handleSoundSelect(lastActiveSoundRef.current || 'rain');
          }
        }}
        onClose={handleCloseStandBy}
      />

      {/* FOCUS HISTORY BOTTOM SHEET */}
      {historySheetOpen && (
        <BottomSheet
          ref={historySheetRef}
          index={0}
          snapPoints={['75%', '92%']}
          enableDynamicSizing={false}
          enablePanDownToClose={true}
          backdropComponent={renderTopicBackdrop}
          backgroundStyle={styles.bottomSheetDarkBackground}
          handleIndicatorStyle={styles.bottomSheetDarkIndicator}
          onClose={() => setHistorySheetOpen(false)}
          onChange={(idx) => {
            if (idx === -1) setHistorySheetOpen(false);
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
      )}

      {/* AMBIENT SOUNDSCAPES & MUSIC BOTTOM SHEET */}
      {soundSheetOpen && (
        <BottomSheet
          ref={soundSheetRef}
          index={0}
          snapPoints={['55%']}
          enableDynamicSizing={false}
          enablePanDownToClose={true}
          backdropComponent={renderTopicBackdrop}
          backgroundStyle={styles.bottomSheetDarkBackground}
          handleIndicatorStyle={styles.bottomSheetDarkIndicator}
          onClose={() => setSoundSheetOpen(false)}
          onChange={(idx) => {
            if (idx === -1) setSoundSheetOpen(false);
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
              userLevel={profile?.level || 1}
              userXp={profile?.xp_points || 0}
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
      )}
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
    paddingBottom: 170,
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
    width: 34,
    height: 34,
    borderRadius: 17,
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
    paddingHorizontal: 4,
  },
  todayFocusCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 14,
  },
  todayFocusLabel: {
    fontFamily: 'DMSans-Bold',
    fontSize: 9,
    color: '#8E8EA8',
    letterSpacing: 0.8,
    fontWeight: '700',
    includeFontPadding: false,
  },
  todayFocusValue: {
    fontFamily: 'DMSans-Bold',
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
    includeFontPadding: false,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    backgroundColor: 'transparent',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
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
  prominentActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  prominentActionText: {
    fontFamily: 'InstrumentSerif',
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  runningActionWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
    marginBottom: 12,
    width: '100%',
    paddingHorizontal: 16,
  },
  runningPauseBtn: {
    flex: 1,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.40)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  runningResumeBtnActive: {
    backgroundColor: 'rgba(91, 79, 232, 0.35)',
    borderColor: 'rgba(168, 158, 248, 0.6)',
  },
  runningActionText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  runningEndBtn: {
    flex: 1,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(232, 88, 88, 0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(232, 88, 88, 0.45)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#E85858',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  runningEndText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 16,
    color: '#FF8A8A',
    fontWeight: '700',
    letterSpacing: 0.3,
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
  endSessionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
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
    backgroundColor: 'rgba(91, 79, 232, 0.22)',
    borderColor: 'rgba(91, 79, 232, 0.6)',
    borderWidth: 1.2,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 8,
    marginBottom: 10,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  routineLinkText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 13,
    color: '#C4B5FD',
    fontWeight: '700',
    textAlign: 'center',
  },
  routineLinkSubtext: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 3,
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
    borderColor: '#FFFFFF',
    borderWidth: 2,
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
    fontSize: 26,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.10)',
  },
  settingsLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  settingsDesc: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.70)',
    marginTop: 3,
  },
  settingsThemeSection: {
    marginTop: 20,
    alignItems: 'center',
    width: '100%',
  },
  settingsThemeLabel: {
    fontFamily: 'DMSans-Bold',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.65)',
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  rewardsContentContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 60,
  },
  rewardsHeaderSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  rewardsHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 10,
  },
  rewardsHeaderBadgeText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    fontWeight: '800',
    color: '#FBBF24',
    letterSpacing: 1.2,
  },
  rewardsTitle: {
    fontFamily: 'InstrumentSerif',
    fontSize: 28,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  rewardsSubtitle: {
    fontFamily: 'DMSans',
    fontSize: 13,
    color: '#9494A8',
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 16,
  },
  rewardsHeroWrapper: {
    marginBottom: 22,
  },
  levelProgressCard: {
    backgroundColor: '#1E1B2E',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(124, 58, 237, 0.35)',
    shadowColor: '#5B4FE8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  levelHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  levelHeaderLeft: {
    flexDirection: 'column',
    gap: 4,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#5B4FE8',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  levelBadgeText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  levelTitleText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
    letterSpacing: 0.2,
  },
  rankIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  xpProgressTrack: {
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 5,
    overflow: 'hidden',
    marginVertical: 14,
  },
  xpProgressFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 5,
  },
  xpInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  xpTotalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  xpBigNumber: {
    fontFamily: 'DMSans-Medium',
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  xpTotalLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8D9F',
    letterSpacing: 0.8,
  },
  nextLevelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  nextLevelPillText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    fontWeight: '700',
    color: '#FBBF24',
  },
  microStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  microStatCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  microStatVal: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  microStatLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 9,
    fontWeight: '700',
    color: '#7E7C8F',
    letterSpacing: 0.5,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 12,
  },
  rewardsSectionHeading: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    fontWeight: '800',
    color: '#8E8D9F',
    letterSpacing: 1.2,
  },
  sectionHeaderSub: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  rewardThemeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 9,
  },
  rewardThemeCardActive: {
    backgroundColor: 'rgba(91, 79, 232, 0.14)',
    borderColor: '#635BFF',
  },
  rewardThemeOuterRing: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  rewardThemeInnerGlow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardThemeCenterDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  rewardThemeInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  rewardThemeName: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  activeMiniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#A78BFA',
  },
  rewardThemeDesc: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#9494A8',
    marginTop: 2,
    lineHeight: 15,
  },
  rewardThemeDescLocked: {
    color: '#D97706',
    fontWeight: '500',
  },
  equippedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(91, 79, 232, 0.25)',
    borderColor: '#7C3AED',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  equippedBadgeText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    fontWeight: '800',
    color: '#C4B5FD',
  },
  equipThemeBtn: {
    backgroundColor: '#5B4FE8',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 10,
    shadowColor: '#5B4FE8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  equipThemeBtnText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  lockedThemeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  lockedThemeText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    color: '#7E7C8F',
    fontWeight: '700',
  },
  milestoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 16,
    padding: 13,
    marginBottom: 9,
  },
  milestoneIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  milestoneTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  milestoneDesc: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#9494A8',
    marginTop: 2,
    lineHeight: 15,
  },
  milestoneTag: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  milestoneTagText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    fontWeight: '800',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  // Streak Shield Vault Styles
  vaultCard: {
    backgroundColor: '#16192E',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  vaultHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  vaultIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  vaultTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  vaultSubtitle: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    lineHeight: 15,
  },
  shieldVisualRow: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 4,
  },
  shieldSlot: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  shieldSlotFilled: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  shieldSlotEmpty: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  shieldSlotText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  shieldSlotTextFilled: {
    color: '#38BDF8',
  },
  vaultFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  vaultCostText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    fontWeight: '700',
    color: '#FBBF24',
  },
  adShieldBtn: {
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    borderColor: 'rgba(234, 179, 8, 0.4)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  adShieldBtnText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    fontWeight: '800',
    color: '#FACC15',
  },
  forgeShieldBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  forgeShieldBtnDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    shadowOpacity: 0,
    elevation: 0,
  },
  forgeShieldBtnText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  // Soundscape Reward Roadmap Styles
  soundRewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 9,
  },
  soundRewardCardActive: {
    backgroundColor: 'rgba(96, 165, 250, 0.12)',
    borderColor: '#3B82F6',
  },
  soundRewardIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  soundRewardIconWrapUnlocked: {
    backgroundColor: 'rgba(96, 165, 250, 0.15)',
  },
  soundRewardInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  soundRewardTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  soundRewardSub: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#9494A8',
    marginTop: 2,
    lineHeight: 15,
  },
  soundRewardSubLocked: {
    color: '#F59E0B',
    fontWeight: '500',
  },
  soundActionBtn: {
    backgroundColor: 'rgba(96, 165, 250, 0.18)',
    borderColor: 'rgba(96, 165, 250, 0.4)',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  soundActionBtnActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#60A5FA',
  },
  soundActionBtnText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    fontWeight: '700',
    color: '#93C5FD',
  },
  soundActionBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
