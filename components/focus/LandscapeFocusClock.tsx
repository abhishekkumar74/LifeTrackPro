import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { Play, Pause, Square, Volume2, VolumeX, Sparkles, Minimize2 } from 'lucide-react-native';
import { SoundKey } from '@/lib/store/focus.store';
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
  onPlayPause,
  onStop,
  onToggleSound,
  onClose,
}) => {
  const { width, height } = useWindowDimensions();

  if (!isVisible) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  const progress = totalSeconds > 0 ? (totalSeconds - secondsLeft) / totalSeconds : 0;
  const progressPercent = Math.min(100, Math.max(0, Math.round(progress * 100)));

  return (
    <Modal
      visible={isVisible}
      animationType="fade"
      supportedOrientations={['landscape', 'landscape-left', 'landscape-right']}
    >
      <StatusBar hidden />
      <View style={styles.container}>
        {/* Top Meta Bar */}
        <View style={styles.topRow}>
          <View style={styles.badgeContainer}>
            {subjectTag ? (
              <View style={[styles.subjectBadge, { borderColor: activeThemeColor }]}>
                <Text style={[styles.subjectText, { color: activeThemeColor }]}>
                  {subjectTag}
                </Text>
              </View>
            ) : (
              <View style={styles.standbyBadge}>
                <Sparkles size={14} color={activeThemeColor} />
                <Text style={[styles.standbyBadgeText, { color: activeThemeColor }]}>
                  StandBy Focus
                </Text>
              </View>
            )}
          </View>

          {sessionGoal ? (
            <Text style={styles.goalText} numberOfLines={1}>
              {sessionGoal}
            </Text>
          ) : null}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {onToggleSound && (
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  onToggleSound();
                }}
              >
                {activeSound ? (
                  <Volume2 size={20} color="#FFFFFF" />
                ) : (
                  <VolumeX size={20} color="#64748B" />
                )}
              </TouchableOpacity>
            )}

            {onClose && (
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  onClose();
                }}
              >
                <Minimize2 size={20} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Big StandBy Clock Display */}
        <View style={styles.clockContainer}>
          <View style={styles.timeRow}>
            <Text style={[styles.timeDigits, { fontSize: height * 0.42 }]}>
              {pad(minutes)}
            </Text>
            <Text style={[styles.timeColon, { fontSize: height * 0.38, color: activeThemeColor }]}>
              :
            </Text>
            <Text style={[styles.timeDigits, { fontSize: height * 0.42 }]}>
              {pad(seconds)}
            </Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${progressPercent}%`, backgroundColor: activeThemeColor },
              ]}
            />
          </View>
        </View>

        {/* Bottom Floating Control Bar */}
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[styles.controlBtn, styles.stopBtn]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
              onStop();
            }}
          >
            <Square size={20} color="#FF5858" fill="#FF5858" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlBtn, styles.playBtn, { backgroundColor: activeThemeColor }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
              onPlayPause();
            }}
          >
            {isRunning && !isPaused ? (
              <Pause size={28} color="#FFFFFF" fill="#FFFFFF" />
            ) : (
              <Play size={28} color="#FFFFFF" fill="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05050A',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingVertical: 20,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  standbyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  standbyBadgeText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    fontWeight: '600',
  },
  subjectBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  subjectText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    fontWeight: '600',
  },
  goalText: {
    fontFamily: 'DMSans',
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
    maxWidth: '50%',
    textAlign: 'center',
  },
  iconBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  clockContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 'auto',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeDigits: {
    fontFamily: 'InstrumentSerif',
    color: '#FFFFFF',
    fontWeight: '400',
    letterSpacing: -2,
    includeFontPadding: false,
  },
  timeColon: {
    fontFamily: 'InstrumentSerif',
    fontWeight: '400',
    marginHorizontal: 4,
    includeFontPadding: false,
  },
  progressTrack: {
    height: 4,
    width: '60%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    width: '100%',
  },
  controlBtn: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 88, 88, 0.15)',
  },
  playBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
});
