import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  StatusBar,
  useWindowDimensions,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  Sparkles,
  Minimize2,
  Moon,
  Sun,
  Zap,
  X,
} from 'lucide-react-native';
import { SoundKey } from '@/lib/store/focus.store';
import { TimerCircle } from '@/components/focus/TimerCircle';
import * as Haptics from 'expo-haptics';

interface LandscapeFocusClockProps {
  isVisible: boolean;
  secondsLeft: number;
  totalSeconds: number;
  isRunning: boolean;
  isPaused: boolean;
  sessionGoal: string;
  subjectTag: string | null;
  activeThemeColor?: string;
  activeSound: SoundKey | null;
  currentMode?: 'focus' | 'short_break' | 'long_break';
  todayMinutes?: number;
  onPlayPause: () => void;
  onStop: () => void;
  onToggleSound?: () => void;
  onClose?: () => void;
}

export const LandscapeFocusClock: React.FC<LandscapeFocusClockProps> = ({
  isVisible,
  secondsLeft,
  totalSeconds,
  isRunning,
  isPaused,
  sessionGoal,
  subjectTag,
  activeThemeColor = '#5B4FE8',
  activeSound,
  currentMode = 'focus',
  todayMinutes = 0,
  onPlayPause,
  onStop,
  onToggleSound,
  onClose,
}) => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Optional Apple StandBy Night Mode (crimson red phosphor tint for dark rooms)
  const [nightMode, setNightMode] = useState(false);

  // Android hardware back button handler
  useEffect(() => {
    if (!isVisible || width < height) return;
    const backAction = () => {
      if (onClose) {
        onClose();
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [isVisible, width, height, onClose]);

  if (!isVisible || width < height) return null;

  const effectiveThemeColor = nightMode ? '#FF3B30' : activeThemeColor;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  const timeStr = `${pad(minutes)}:${pad(seconds)}`;

  const progress = totalSeconds > 0 ? (totalSeconds - secondsLeft) / totalSeconds : 0;
  const progressPercent = Math.min(100, Math.max(0, Math.round(progress * 100)));

  // Responsive dial size for landscape orientation (fits vertically with padding)
  const dialSize = Math.min(Math.floor(height * 0.82), Math.floor(width * 0.44), 320);

  return (
    <Modal
      visible={isVisible}
      animationType="fade"
      supportedOrientations={['landscape', 'landscape-left', 'landscape-right']}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar hidden />
      <View
        style={[
          styles.container,
          nightMode && styles.containerNight,
          {
            paddingLeft: Math.max(24, insets.left),
            paddingRight: Math.max(24, insets.right),
            paddingTop: Math.max(12, insets.top),
            paddingBottom: Math.max(12, insets.bottom),
          },
        ]}
      >
        {/* Ambient background glow circles */}
        <View
          style={[
            styles.ambientGlowLeft,
            { backgroundColor: nightMode ? 'rgba(255, 59, 48, 0.08)' : 'rgba(91, 79, 232, 0.12)' },
          ]}
          pointerEvents="none"
        />
        <View
          style={[
            styles.ambientGlowRight,
            { backgroundColor: nightMode ? 'rgba(255, 59, 48, 0.06)' : 'rgba(91, 79, 232, 0.08)' },
          ]}
          pointerEvents="none"
        />

        {/* Left Section: Retro Chronometer Dial */}
        <View style={styles.leftSection}>
          <TimerCircle
            size={dialSize}
            secondsLeft={secondsLeft}
            totalSeconds={totalSeconds}
            isRunning={isRunning}
            currentMode={currentMode}
            accentColorOverride={effectiveThemeColor}
            isNightMode={nightMode}
          />
        </View>

        {/* Right Section: StandBy HUD, Controls & Progress */}
        <View style={styles.rightSection}>
          {/* Top Row: StandBy Status Badge & Utility Buttons */}
          <View style={styles.hudTopRow}>
            <View style={styles.standbyPill}>
              <View
                style={[
                  styles.standbyDot,
                  { backgroundColor: isRunning ? '#10B981' : effectiveThemeColor },
                ]}
              />
              <Sparkles size={13} color={effectiveThemeColor} />
              <Text style={[styles.standbyPillText, { color: effectiveThemeColor }]}>
                STANDBY FOCUS
              </Text>
            </View>

            {subjectTag && (
              <View style={[styles.subjectTagPill, { borderColor: effectiveThemeColor }]}>
                <Text style={[styles.subjectTagText, { color: effectiveThemeColor }]} numberOfLines={1}>
                  🏷 {subjectTag}
                </Text>
              </View>
            )}

            <View style={styles.hudActions}>
              {/* Apple-style StandBy Night Mode Toggle */}
              <TouchableOpacity
                style={[styles.hudCircleBtn, nightMode && styles.hudCircleBtnActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  setNightMode(!nightMode);
                }}
                accessibilityLabel="Toggle StandBy Night Mode"
              >
                {nightMode ? <Sun size={17} color="#FF3B30" /> : <Moon size={17} color="rgba(255, 255, 255, 0.85)" />}
              </TouchableOpacity>

              {/* Sound Toggle */}
              {onToggleSound && (
                <TouchableOpacity
                  style={[styles.hudCircleBtn, activeSound ? styles.hudCircleBtnSoundOn : null]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    onToggleSound();
                  }}
                  accessibilityLabel="Toggle Ambient Sound"
                >
                  {activeSound ? (
                    <Volume2 size={17} color={effectiveThemeColor} />
                  ) : (
                    <VolumeX size={17} color="rgba(255, 255, 255, 0.45)" />
                  )}
                </TouchableOpacity>
              )}

              {/* Exit StandBy */}
              {onClose && (
                <TouchableOpacity
                  style={[styles.hudCircleBtn, { backgroundColor: 'rgba(255, 255, 255, 0.15)' }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    onClose();
                  }}
                  accessibilityLabel="Exit StandBy"
                >
                  <X size={17} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Center Info: Session Name & Large Digital Time */}
          <View style={styles.hudCenterContent}>
            <Text
              style={[
                styles.sessionNameText,
                nightMode && { color: '#FF8880' },
              ]}
              numberOfLines={1}
            >
              {sessionGoal.trim() || 'Deep Focus Session'}
            </Text>

            {/* Giant Monospace Digits */}
            <Text
              style={[
                styles.giantTimeDigits,
                nightMode && { color: '#FF3B30' },
              ]}
            >
              {timeStr}
            </Text>

            {/* Progress Capsule Track */}
            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${progressPercent}%`,
                      backgroundColor: effectiveThemeColor,
                    },
                  ]}
                />
              </View>
              <View style={styles.progressMetaRow}>
                <Text style={styles.progressMetaText}>
                  {progressPercent}% COMPLETED
                </Text>
                <Text style={styles.progressMetaText}>
                  TODAY: {todayMinutes}m FOCUSED
                </Text>
              </View>
            </View>
          </View>

          {/* Bottom Action Controls */}
          <View style={styles.hudBottomControls}>
            {/* Primary Action Button */}
            <TouchableOpacity
              style={[
                styles.primaryStandbyBtn,
                {
                  backgroundColor: nightMode ? 'rgba(255, 59, 48, 0.28)' : 'rgba(91, 79, 232, 0.28)',
                  borderColor: nightMode ? 'rgba(255, 59, 48, 0.55)' : 'rgba(91, 79, 232, 0.55)',
                },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                onPlayPause();
              }}
              activeOpacity={0.8}
            >
              {isRunning && !isPaused ? (
                <Pause size={20} color="#FFFFFF" fill="#FFFFFF" />
              ) : (
                <Play size={20} color="#FFFFFF" fill="#FFFFFF" />
              )}
              <Text style={styles.primaryStandbyBtnText}>
                {isRunning && !isPaused ? 'Pause Focus' : isPaused ? 'Resume Focus' : 'Start Focus'}
              </Text>
            </TouchableOpacity>

            {/* End / Reset Session Button */}
            <TouchableOpacity
              style={styles.stopStandbyBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                onStop();
              }}
              activeOpacity={0.8}
              accessibilityLabel="End Session"
            >
              <Square size={16} color="#FF6B6B" fill="#FF6B6B" />
              <Text style={styles.stopStandbyBtnText}>End</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#09080D',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingVertical: 18,
  },
  containerNight: {
    backgroundColor: '#050002',
  },
  ambientGlowLeft: {
    position: 'absolute',
    left: -80,
    top: -60,
    width: 320,
    height: 320,
    borderRadius: 160,
  },
  ambientGlowRight: {
    position: 'absolute',
    right: -60,
    bottom: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
  },
  leftSection: {
    flex: 0.46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightSection: {
    flex: 0.54,
    height: '100%',
    justifyContent: 'space-between',
    paddingLeft: 20,
    paddingVertical: 6,
  },
  hudTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  standbyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  standbyDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  standbyPillText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  subjectTagPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
  },
  subjectTagText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    fontWeight: '600',
  },
  hudActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hudCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hudCircleBtnActive: {
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
    borderColor: 'rgba(255, 59, 48, 0.4)',
  },
  hudCircleBtnSoundOn: {
    backgroundColor: 'rgba(91, 79, 232, 0.22)',
    borderColor: '#5B4FE8',
  },
  hudCenterContent: {
    justifyContent: 'center',
    marginVertical: 4,
  },
  sessionNameText: {
    fontFamily: 'InstrumentSerif',
    fontSize: 26,
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  giantTimeDigits: {
    fontFamily: 'DMMono',
    fontSize: 54,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -1.5,
    marginVertical: 2,
  },
  progressContainer: {
    width: '100%',
    marginTop: 6,
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  progressMetaText: {
    fontFamily: 'DMMono',
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.55)',
    letterSpacing: 1.0,
  },
  hudBottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  primaryStandbyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  primaryStandbyBtnText: {
    fontFamily: 'InstrumentSerif',
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  stopStandbyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 88, 88, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 88, 88, 0.35)',
  },
  stopStandbyBtnText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 13,
    color: '#FF6B6B',
    fontWeight: '700',
  },
});
