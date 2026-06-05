import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { DailyCheckin } from '@/types/app.types';

interface MoodPickerProps {
  todayCheckin: DailyCheckin | null;
  onLog: (mood: number, energy: number) => void;
  isLoading: boolean;
}

const EMOJIS = ['😫', '😕', '😐', '🙂', '🔥'];

// Custom Single Emoji Button Component with Reanimated spring scaling
interface EmojiBtnProps {
  emoji: string;
  index: number;
  isSelected: boolean;
  onPress: () => void;
}

const EmojiButton: React.FC<EmojiBtnProps> = ({ emoji, isSelected, onPress }) => {
  const scale = useSharedValue(1);
  const dotOpacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(isSelected ? 1.25 : 1, { damping: 12 });
    dotOpacity.value = withTiming(isSelected ? 1 : 0, { duration: 150 });
  }, [isSelected]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const dotAnimatedStyle = useAnimatedStyle(() => ({
    opacity: dotOpacity.value,
  }));

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.emojiContainer}>
      <Animated.Text style={[styles.emojiText, animatedStyle]}>
        {emoji}
      </Animated.Text>
      <Animated.View style={[styles.activeDot, dotAnimatedStyle]} />
    </TouchableOpacity>
  );
};

export const MoodPicker: React.FC<MoodPickerProps> = ({
  todayCheckin,
  onLog,
  isLoading,
}) => {
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [selectedEnergy, setSelectedEnergy] = useState<number | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [justLogged, setJustLogged] = useState(false);

  // Animation opacity for energy selection row
  const energyOpacity = useSharedValue(0);

  useEffect(() => {
    if (selectedMood !== null) {
      energyOpacity.value = withTiming(1, { duration: 250 });
    } else {
      energyOpacity.value = 0;
    }
  }, [selectedMood]);

  const energyAnimatedStyle = useAnimatedStyle(() => ({
    opacity: energyOpacity.value,
  }));

  // Reset local inputs when checkin changes
  useEffect(() => {
    if (todayCheckin) {
      setSelectedMood(todayCheckin.mood);
      setSelectedEnergy(todayCheckin.energy);
      setIsUpdating(false);
    } else {
      setSelectedMood(null);
      setSelectedEnergy(null);
      setJustLogged(false);
    }
  }, [todayCheckin]);

  const handleMoodSelect = (mood: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSelectedMood(mood);
    setJustLogged(false);
  };

  const handleEnergySelect = (energy: number) => {
    if (selectedMood === null) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setSelectedEnergy(energy);
    onLog(selectedMood, energy);
    setJustLogged(true);
    setIsUpdating(false);
  };

  const handleResetUpdate = () => {
    setIsUpdating(true);
    setSelectedMood(null);
    setSelectedEnergy(null);
    setJustLogged(false);
  };

  const getMoodEmoji = (val: number) => {
    if (val >= 1 && val <= 5) {
      return EMOJIS[val - 1];
    }
    return '😐';
  };

  const renderEnergyPillBar = (energyVal: number) => {
    return (
      <View style={styles.energyIndicatorRow}>
        {Array.from({ length: 5 }).map((_, idx) => (
          <View
            key={idx}
            style={[
              styles.indicatorBar,
              {
                height: 4 + idx * 3,
                backgroundColor: idx < energyVal ? '#5B4FE8' : '#E8E7E3',
              },
            ]}
          />
        ))}
      </View>
    );
  };

  // Render state if already logged (and not currently clicking Update)
  if (todayCheckin && !isUpdating) {
    return (
      <View style={styles.loggedContainer}>
        <View style={styles.loggedLeft}>
          <Text style={styles.loggedHeader}>DAILY CHECK-IN</Text>
          <View style={styles.loggedStats}>
            <Text style={styles.loggedEmoji}>{getMoodEmoji(todayCheckin.mood)}</Text>
            <View style={styles.dividerDot} />
            <Text style={styles.loggedText}>Energy</Text>
            {renderEnergyPillBar(todayCheckin.energy)}
          </View>
        </View>

        <TouchableOpacity onPress={handleResetUpdate} activeOpacity={0.7}>
          <Text style={styles.updateBtnText}>Update</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>
        {justLogged ? 'Logged! ✓' : 'How was today?'}
      </Text>

      {/* Mood Selector Row */}
      <View style={styles.emojisRow}>
        {EMOJIS.map((emoji, idx) => {
          const moodValue = idx + 1;
          return (
            <EmojiButton
              key={idx}
              emoji={emoji}
              index={idx}
              isSelected={selectedMood === moodValue}
              onPress={() => handleMoodSelect(moodValue)}
            />
          );
        })}
      </View>

      {/* Energy Level Selector Row (Fades in after mood selected) */}
      {selectedMood !== null && (
        <Animated.View style={[styles.energyRow, energyAnimatedStyle]}>
          <Text style={styles.energyLabel}>Energy level</Text>
          <View style={styles.signalBarsRow}>
            {Array.from({ length: 5 }).map((_, idx) => {
              const energyVal = idx + 1;
              const isSelected = selectedEnergy !== null && energyVal <= selectedEnergy;

              return (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.7}
                  onPress={() => handleEnergySelect(energyVal)}
                  style={styles.signalBarTouch}
                >
                  <View
                    style={[
                      styles.signalBar,
                      {
                        height: 10 + idx * 4,
                        backgroundColor: isSelected ? '#5B4FE8' : '#E8E7E3',
                      },
                    ]}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    width: '100%',
  },
  heading: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#5C5C70',
    fontWeight: '500',
    marginBottom: 12,
  },
  emojisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 6,
  },
  emojiContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 42,
    height: 42,
  },
  emojiText: {
    fontSize: 26,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#5B4FE8',
    marginTop: 4,
  },
  energyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#F2F1EE',
    paddingTop: 14,
  },
  energyLabel: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#9B9BAF',
  },
  signalBarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingRight: 6,
  },
  signalBarTouch: {
    paddingHorizontal: 2,
    paddingVertical: 4,
    justifyContent: 'flex-end',
  },
  signalBar: {
    width: 10,
    borderRadius: 2,
  },
  loggedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 4,
  },
  loggedLeft: {
    flexDirection: 'column',
    gap: 6,
  },
  loggedHeader: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    color: '#9B9BAF',
    letterSpacing: 1.2,
  },
  loggedStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loggedEmoji: {
    fontSize: 22,
  },
  dividerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E8E7E3',
  },
  loggedText: {
    fontFamily: 'DMSans',
    fontSize: 13,
    color: '#5C5C70',
  },
  energyIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  indicatorBar: {
    width: 4,
    borderRadius: 1,
  },
  updateBtnText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: '#5B4FE8',
    fontWeight: '600',
  },
});
