import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  StatusBar,
  useWindowDimensions,
  BackHandler,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  Minimize2,
  Moon,
  Sun,
  Sparkles,
  Tag,
  Clock,
  Target,
  Zap,
} from 'lucide-react-native';
import { TimerCircle } from './TimerCircle';

interface LandscapeFocusClockProps {
  isVisible: boolean;
  secondsLeft: number;
  totalSeconds: number;
  isRunning: boolean;
  isPaused: boolean;
  sessionGoal: string;
  subjectTag?: string | null;
  todayMinutes: number;
  activeThemeColor: string;
  activeSound: string | null;
  currentMode: 'focus' | 'short_break' | 'long_break';
  onPlayPause: () => void;
  onStop: () => void;
  onToggleSound?: () => void;
  onClose?: () => void;
}

/**
 * Adaptive Fullscreen StandBy Focus Clock
 *
 * Implements Apple StandBy / desk chronometer aesthetic.
 * Seamlessly adapts between:
 * - Horizontal / Landscape: Side-by-side retro analog dial + HUD digital readout & controls.
 * - Vertical / Portrait: Centered analog dial + digital readout & ergonomic thumb controls.
 * Prevents overlapping, text wrapping, and button clipping across all orientations.
 */
export const LandscapeFocusClock: React.FC<LandscapeFocusClockProps> = ({
  isVisible,
  secondsLeft,
  totalSeconds,
  isRunning,
  isPaused,
  sessionGoal,
  subjectTag,
  todayMinutes,
  activeThemeColor,
  activeSound,
  currentMode,
  onPlayPause,
  onStop,
  onToggleSound,
  onClose,
}) => {
  const { width: rawWidth, height: rawHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Apple StandBy Night Mode (crimson red phosphor tint for dark rooms)
  const [nightMode, setNightMode] = useState(false);

  // Guarantee true landscape dimensions even if Activity/Modal hasn't finished rotation animation
  const [layoutDims, setLayoutDims] = useState(() => ({
    width: Math.max(rawWidth, rawHeight),
    height: Math.min(rawWidth, rawHeight),
  }));

  // Hardware back button support for Android
  React.useEffect(() => {
    if (!isVisible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (onClose) {
        onClose();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [isVisible, onClose]);

  const sessionLengthMinutes = Math.max(1, Math.round(totalSeconds / 60));

  const targetFinishTime = useMemo(() => {
    const remainingMs = Math.max(0, secondsLeft) * 1000;
    const end = new Date(Date.now() + remainingMs);
    return end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }, [secondsLeft]);

  const sessionXP = useMemo(() => {
    return Math.max(15, Math.round(sessionLengthMinutes * 1.5));
  }, [sessionLengthMinutes]);

  if (!isVisible) return null;

  const effectiveWidth = Math.max(layoutDims.width, layoutDims.height);
  const effectiveHeight = Math.min(layoutDims.width, layoutDims.height);
  const effectiveThemeColor = nightMode ? '#FF3B30' : activeThemeColor;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  const timeStr = `${pad(minutes)}:${pad(seconds)}`;

  const progress = totalSeconds > 0 ? (totalSeconds - secondsLeft) / totalSeconds : 0;
  const progressPercent = Math.min(100, Math.max(0, Math.round(progress * 100)));

  // Notch & Camera Cutout Safe Area Insets (RESP-04)
  const safeLeft = Math.max(insets.left, 24);
  const safeRight = Math.max(insets.right, 24);
  const safeTop = Math.max(insets.top, 12);
  const safeBottom = Math.max(insets.bottom, 12);

  // Responsive dial size:
  // StandBy Desk Clock takes up the left 50% half of the screen.
  // Dial fills the left half elegantly (like Apple StandBy chronometer dial).
  const availHeight = effectiveHeight - safeTop - safeBottom;
  const availHalfWidth = (effectiveWidth - safeLeft - safeRight) * 0.5;
  const dialSize = Math.max(
    220,
    Math.min(
      Math.floor(availHeight * 0.94),
      Math.floor(availHalfWidth * 0.94),
      370
    )
  );

  const renderTopRow = () => (
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

      {subjectTag ? (
        <View
          style={[
            styles.subjectTagPill,
            { borderColor: effectiveThemeColor },
          ]}
        >
          <Tag size={11} color={effectiveThemeColor} />
          <Text style={[styles.subjectTagText, { color: effectiveThemeColor }]} numberOfLines={1}>
            {subjectTag}
          </Text>
        </View>
      ) : null}

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
            style={styles.hudCircleBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              onClose();
            }}
            accessibilityLabel="Exit StandBy"
          >
            <Minimize2 size={17} color="rgba(255, 255, 255, 0.85)" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderCenterContent = () => (
    <View style={styles.hudCenterContent}>
      {/* Apple StandBy Minimalist Typography (Zero boxes, Zero distraction) */}
      <View style={styles.appleHeaderBlock}>
        <View style={styles.appleSubtitleRow}>
          <View style={[styles.appleModeDot, { backgroundColor: effectiveThemeColor }]} />
          <Text style={[styles.appleSubtitle, { color: effectiveThemeColor }]}>
            {currentMode === 'focus' ? 'FOCUS' : 'BREAK'}
          </Text>
        </View>

        <Text
          style={[
            styles.appleTitle,
            nightMode && { color: '#FF8880' },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {sessionGoal.trim() || 'Deep Focus'}
        </Text>

        <Text style={styles.appleUntilText}>
          Until {targetFinishTime}
        </Text>
      </View>

      {/* Apple-style Minimalist Sleek Progress Capsule */}
      <View style={styles.appleProgressContainer}>
        <View style={styles.appleProgressTrack}>
          <View
            style={[
              styles.appleProgressFill,
              {
                width: `${progressPercent}%`,
                backgroundColor: effectiveThemeColor,
              },
            ]}
          />
        </View>
        <View style={styles.appleProgressMetaRow}>
          <Text style={[styles.appleProgressPercent, { color: effectiveThemeColor }]}>
            {progressPercent}% COMPLETED
          </Text>
          <Text style={styles.appleProgressToday}>
            TODAY {todayMinutes}M
          </Text>
        </View>
      </View>
    </View>
  );

  const renderBottomControls = () => (
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
        <Text
          style={styles.primaryStandbyBtnText}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
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
  );

  return (
    <Modal
      visible={isVisible}
      animationType="fade"
      supportedOrientations={[
        'landscape',
        'landscape-left',
        'landscape-right',
      ]}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />
      <View
        onLayout={(e) => {
          const { width: w, height: h } = e.nativeEvent.layout;
          if (w > 0 && h > 0) {
            setLayoutDims({ width: w, height: h });
          }
        }}
        style={[
          styles.container,
          nightMode && styles.containerNight,
          {
            paddingLeft: safeLeft,
            paddingRight: safeRight,
            paddingTop: safeTop,
            paddingBottom: safeBottom,
          },
        ]}
      >
        {/* Ambient background glow: corner circles as originally designed */}
        <View
          style={[
            styles.ambientGlowLeft,
            { backgroundColor: nightMode ? 'rgba(255, 59, 48, 0.12)' : 'rgba(91, 79, 232, 0.15)' },
          ]}
          pointerEvents="none"
        />
        <View
          style={[
            styles.ambientGlowRight,
            { backgroundColor: nightMode ? 'rgba(255, 59, 48, 0.08)' : 'rgba(91, 79, 232, 0.10)' },
          ]}
          pointerEvents="none"
        />

        {/* Left Section: 50% Half - Retro Chronometer Dial */}
        <View style={styles.leftSection}>
          <TimerCircle
            size={dialSize}
            secondsLeft={secondsLeft}
            totalSeconds={totalSeconds}
            isRunning={isRunning}
            currentMode={currentMode}
            themeColorOverride={effectiveThemeColor}
            isNightMode={nightMode}
          />
        </View>

        {/* Right Section: 50% Half - StandBy HUD, Controls & Progress */}
        <View style={styles.rightSection}>
          {renderTopRow()}
          {renderCenterContent()}
          {renderBottomControls()}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  containerNight: {
    backgroundColor: '#000000',
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
    flex: 0.5,
    width: '50%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightSection: {
    flex: 0.5,
    width: '50%',
    height: '100%',
    justifyContent: 'space-between',
    paddingLeft: 24,
    paddingRight: 16,
    paddingVertical: 14,
  },
  hudCenterContent: {
    justifyContent: 'center',
    marginVertical: 4,
    paddingRight: 8,
  },
  appleHeaderBlock: {
    marginBottom: 16,
  },
  appleSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  appleModeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  appleSubtitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },
  appleTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.6,
    marginBottom: 4,
  },
  appleUntilText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.55)',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  appleProgressContainer: {
    width: '100%',
    marginTop: 6,
  },
  appleProgressTrack: {
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 2.5,
    overflow: 'hidden',
    width: '100%',
  },
  appleProgressFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  appleProgressMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  appleProgressPercent: {
    fontFamily: 'DMMono',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  appleProgressToday: {
    fontFamily: 'DMSans-Bold',
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.45)',
    letterSpacing: 1.5,
  },
  portraitTopRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  portraitDialSection: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  portraitCenterContent: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  sessionNameTextPortrait: {
    textAlign: 'center',
    fontSize: 22,
    marginBottom: 2,
  },
  giantTimeDigitsPortrait: {
    fontSize: 50,
    textAlign: 'center',
    marginVertical: 2,
  },
  portraitBottomControls: {
    width: '100%',
    marginTop: 8,
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
    flexShrink: 0,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
  },
  subjectTagPillPortrait: {
    maxWidth: 100,
    flexShrink: 1,
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
    flexShrink: 0,
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
    gap: 8,
    height: 48,
    minWidth: 120,
    paddingHorizontal: 12,
    borderRadius: 24,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  primaryStandbyBtnText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.3,
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
