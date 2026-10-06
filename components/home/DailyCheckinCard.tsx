import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { Frown, Meh, Smile, SmilePlus, Zap } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY } from '@/constants/theme';
import { useTodayCheckin, useLogCheckin } from '@/lib/hooks/use-stats';

const MOODS = [
  { val: 1, Icon: Frown, color: '#E53E3E' },
  { val: 2, Icon: Meh, color: '#DD6B20' },
  { val: 3, Icon: Smile, color: '#D69E2E' },
  { val: 4, Icon: SmilePlus, color: '#38A169' },
  { val: 5, Icon: Zap, color: '#5B4FE8' },
];

export const DailyCheckinCard: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: todayCheckin, isLoading } = useTodayCheckin();
  const logCheckinMutation = useLogCheckin();

  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [selectedEnergy, setSelectedEnergy] = useState<number | null>(null);
  const [isLogged, setIsLogged] = useState(false);

  // Animation values
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);
  const height = useSharedValue(120); // typical height

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const handleSelectMood = (val: number) => {
    setSelectedMood(val);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const handleSelectEnergy = (energyVal: number) => {
    setSelectedEnergy(energyVal);
    setIsLogged(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    // Slide up and fade out animation
    opacity.value = withTiming(0, { duration: 400 });
    translateY.value = withTiming(-40, { duration: 400 });

    setTimeout(() => {
      if (selectedMood) {
        logCheckinMutation.mutate(
          { mood: selectedMood, energy: energyVal },
          {
            onSuccess: () => {
              // Invalidate query to sync across app and cause unmounting
              queryClient.invalidateQueries({ queryKey: ['stats', 'today-checkin'] });
              queryClient.invalidateQueries({ queryKey: ['stats', 'mood-history'] });
            },
          }
        );
      }
    }, 600);
  };

  if (isLoading || todayCheckin) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      {isLogged ? (
        <View style={styles.loggedContainer}>
          <Text style={styles.loggedText}>Logged ✓</Text>
        </View>
      ) : (
        <View>
          <Text style={styles.heading}>How's your day going?</Text>

          {/* Mood Row */}
          <View style={styles.moodRow}>
            {MOODS.map((item) => {
              const isChosen = selectedMood === item.val;
              const MoodIcon = item.Icon;
              return (
                <TouchableOpacity
                  key={item.val}
                  style={[
                    styles.emojiBtn,
                    isChosen && styles.emojiBtnSelected,
                  ]}
                  onPress={() => handleSelectMood(item.val)}
                  activeOpacity={0.7}
                >
                  <MoodIcon
                    size={22}
                    color={isChosen ? '#E8A020' : '#5C5C70'}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Energy Row (only displays after mood selected) */}
          {selectedMood !== null && (
            <View style={styles.energySection}>
              <Text style={styles.energyLabel}>Energy:</Text>
              <View style={styles.energyRow}>
                {[1, 2, 3, 4, 5].map((level) => {
                  const isFilled = selectedEnergy !== null ? level <= selectedEnergy : false;
                  return (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.energyBar,
                        isFilled && styles.energyBarFilled,
                      ]}
                      onPress={() => handleSelectEnergy(level)}
                      activeOpacity={0.6}
                    />
                  );
                })}
              </View>
            </View>
          )}
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 3,
    borderColor: '#E8A020', // amber
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    width: '100%',
    shadowColor: '#17172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  heading: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 14,
    color: '#17172A',
    fontWeight: '600',
    marginBottom: 12,
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 6,
  },
  emojiBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
  },
  emojiBtnSelected: {
    backgroundColor: '#FEF3DC', // amberSoft
    borderWidth: 1.5,
    borderColor: '#E8A020',
  },
  emojiText: {
    fontSize: 26,
  },
  emojiTextSelected: {
    transform: [{ scale: 1.25 }],
  },
  energySection: {
    marginTop: 14,
    borderTopWidth: 1,
    borderColor: '#F2F1EE',
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  energyLabel: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 12,
    color: '#9B9BAF',
    marginRight: 12,
  },
  energyRow: {
    flexDirection: 'row',
  },
  energyBar: {
    width: 32,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E8E7E3',
    marginRight: 8,
  },
  energyBarFilled: {
    backgroundColor: '#5B4FE8', // violet
  },
  loggedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  loggedText: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 15,
    color: '#00B894', // mint
    fontWeight: 'bold',
  },
});
