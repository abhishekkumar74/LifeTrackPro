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

// Custom Hooks & Stores
import { useFocusStore, SoundKey, FocusPreset } from '@/lib/store/focus.store';
import { useAmbientSound } from '@/lib/hooks/use-ambient-sound';
import { useFocusSessions } from '@/lib/hooks/use-focus-sessions';
import { getSubjectColor } from '@/lib/utils/subject-colors';

// Custom Components
import { TimerCircle } from '@/components/focus/TimerCircle';
import { SoundPicker } from '@/components/focus/SoundPicker';
import { BlockerToggle } from '@/components/focus/BlockerToggle';
import { SessionSummary } from '@/components/focus/SessionSummary';
import { SubjectPicker } from '@/components/shared/SubjectPicker';

export default function FocusScreen(): React.JSX.Element {
  const queryClient = useQueryClient();
  const { data: history = [], isLoading: isLoadingHistory, refetch: refetchHistory } = useFocusSessions();
  const [showSummary, setShowSummary] = useState(false);
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
  const { profile } = useAuthStore();
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
  } = useFocusStore();

  // Ambient sound hook
  const ambient = useAmbientSound();

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
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRunning, tick]);

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
        console.error('Failed to update topic status:', err);
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
  const handleSaveSession = useCallback(async (mood: number, _note: string, status: 'completed' | 'interrupted' = 'completed') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const endedAt = new Date().toISOString();
      const startedAt = new Date(Date.now() - elapsedSeconds * 1000).toISOString();

      const focusMinutes =
        selectedPreset === 'custom'
          ? customMinutes
          : parseInt(selectedPreset.split('/')[0], 10);

      const dbDuration = status === 'interrupted' 
        ? Math.max(1, Math.floor(elapsedSeconds / 60)) 
        : focusMinutes;

      const { error } = await supabase.from('focus_sessions').insert({
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

      if (error) throw error;

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
            console.error('Failed to log routine completion in database:', logError);
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
    } catch (err) {
      if (__DEV__) {
        console.error('Failed to save focus session:', err);
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

              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>
                  {selectedPreset === 'custom' ? 'CUSTOM' : 'POMODORO'}
                </Text>
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
            <View style={styles.goalContainer}>
              <Text style={styles.goalHeaderLabel}>SESSION GOAL</Text>
              {isEditingGoal ? (
                <TextInput
                  style={styles.goalInput}
                  value={tempGoal}
                  onChangeText={setTempGoal}
                  placeholder="What are we focusing on?"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  onSubmitEditing={handleSaveGoal}
                  onBlur={handleSaveGoal}
                  autoFocus
                  maxLength={80}
                />
              ) : (
                <TouchableOpacity
                  onPress={() => setIsEditingGoal(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.goalText} numberOfLines={1}>
                    {sessionGoal.trim() || 'Tap to set your session goal...'}
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
        duration={focusMinutes}
        subject={subjectTag}
        pomodoroCount={pomodoroCount}
        onSave={handleSaveSession}
        onDiscard={handleDiscardSession}
      />

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
});
