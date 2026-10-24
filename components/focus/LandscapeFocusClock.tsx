import React, { useState } from 'react';
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

  if (!isVisible) return null;

  const isLandscape = rawWidth >= rawHeight;
  const effectiveThemeColor = nightMode ? '#FF3B30' : activeThemeColor;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  const timeStr = `${pad(minutes)}:${pad(seconds)}`;

  const progress = totalSeconds > 0 ? (totalSeconds - secondsLeft) / totalSeconds : 0;
  const progressPercent = Math.min(100, Math.max(0, Math.round(progress * 100)));

  // On Android, insets.top inside translucent modals is often 0 or less than the physical status bar.
  // We guarantee effectiveTopInset is at least the physical Android status bar height.
  const androidStatusBar = Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0;
  const effectiveTopInset = Math.max(insets.top, androidStatusBar);

  const safeLeft = isLandscape
    ? Math.max(32, insets.left, androidStatusBar)
    : Math.max(20, insets.left);
  const safeRight = isLandscape
    ? Math.max(32, insets.right, androidStatusBar)
    : Math.max(20, insets.right);
  const safeTop = isLandscape
    ? Math.max(16, insets.top)
    : Math.max(effectiveTopInset + 8, 24);
  const safeBottom = Math.max(isLandscape ? 16 : 24, insets.bottom);

  // Responsive dial size:
  // In landscape: height is constrained, dial fits in left section.
  // In portrait: width is constrained, dial fits comfortably centered.
  const dialSize = isLandscape
    ? Math.min(
        Math.floor((rawHeight - safeTop - safeBottom) * 0.88),
        Math.floor((rawWidth - safeLeft - safeRight) * 0.42),
        320
      )
    : Math.min(
        Math.floor((rawWidth - safeLeft - safeRight) * 0.68),
        Math.floor((rawHeight - safeTop - safeBottom) * 0.35),
        260
      );

  const renderTopRow = () => (
    <View style={[styles.hudTopRow, !isLandscape && styles.portraitTopRow]}>
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
            !isLandscape && styles.subjectTagPillPortrait,
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
    <View style={[styles.hudCenterContent, !isLandscape && styles.portraitCenterContent]}>
      <Text
        style={[
          styles.sessionNameText,
          !isLandscape && styles.sessionNameTextPortrait,
          nightMode && { color: '#FF8880' },
        ]}
        numberOfLines={1}
      >
        {sessionGoal.trim() || 'Deep Focus Session'}
      </Text>

      {/* Giant Monospace Digits - guaranteed single-line via adjustsFontSizeToFit */}
      <Text
        style={[
          styles.giantTimeDigits,
          !isLandscape && styles.giantTimeDigitsPortrait,
          nightMode && { color: '#FF3B30' },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.65}
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
  );

  const renderBottomControls = () => (
    <View style={[styles.hudBottomControls, !isLandscape && styles.portraitBottomControls]}>
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
        'portrait',
        'portrait-upside-down',
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
        style={[
          styles.container,
          isLandscape ? styles.containerLandscape : styles.containerPortrait,
          nightMode && styles.containerNight,
          {
            paddingLeft: safeLeft,
            paddingRight: safeRight,
            paddingTop: safeTop,
            paddingBottom: safeBottom,
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

        {isLandscape ? (
          <>
            {/* Left Section: Retro Chronometer Dial */}
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

            {/* Right Section: StandBy HUD, Controls & Progress */}
            <View style={styles.rightSection}>
              {renderTopRow()}
              {renderCenterContent()}
              {renderBottomControls()}
            </View>
          </>
        ) : (
          <>
            {/* Portrait Layout: Top HUD -> Centered Dial -> Center Info -> Bottom Controls */}
            {renderTopRow()}

            <View style={styles.portraitDialSection}>
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

            {renderCenterContent()}
            {renderBottomControls()}
          </>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#09080D',
  },
  containerLandscape: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  containerPortrait: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    flex: 0.44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightSection: {
    flex: 0.56,
    height: '100%',
    justifyContent: 'space-between',
    paddingLeft: 20,
    paddingVertical: 6,
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
    includeFontPadding: false,
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
    fontFamily: 'InstrumentSerif',
    fontSize: 19,
    color: '#FFFFFF',
    fontWeight: '700',
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
