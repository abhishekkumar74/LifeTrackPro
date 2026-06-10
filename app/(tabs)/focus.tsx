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
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
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

  // Save focus session results directly to Supabase
  const handleSaveSession = useCallback(async (mood: number, _note: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const endedAt = new Date().toISOString();
      const startedAt = new Date(Date.now() - elapsedSeconds * 1000).toISOString();

      const focusMinutes =
        selectedPreset === 'custom'
          ? customMinutes
          : parseInt(selectedPreset.split('/')[0], 10);

      const { error } = await supabase.from('focus_sessions').insert({
        user_id: session.user.id,
        session_goal: sessionGoal.trim() || 'Deep Focus Session',
        duration_min: focusMinutes,
        subject: subjectTag,
        sound_used: activeSound,
        mood: mood,
        started_at: startedAt,
        ended_at: endedAt,
      });

      if (error) throw error;

      // Refetch history list
      refetchHistory();
      queryClient.invalidateQueries({ queryKey: ['stats'] });

      // Trigger success haptics
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      useUiStore.getState().showToast('Session saved!', 'success');

      setShowSummary(false);
      resetSession();
      await ambient.stop();
    } catch (err) {
      if (__DEV__) {
        console.error('Failed to save focus session:', err);
      }
      Alert.alert(
        'Failed to save session',
        'Could not log session. Please check your network and try again.'
      );
    }
  }, [elapsedSeconds, selectedPreset, customMinutes, sessionGoal, subjectTag, activeSound, resetSession, ambient, refetchHistory, queryClient]);

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
    stop();
  }, [stop]);

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
});
