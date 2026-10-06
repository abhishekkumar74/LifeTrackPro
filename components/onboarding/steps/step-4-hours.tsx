import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@/constants/theme';

interface StepProps {
  state: {
    hours: number;
    peakTime: 'morning' | 'afternoon' | 'night' | null;
  };
  onChange: (updates: { hours?: number; peakTime?: 'morning' | 'afternoon' | 'night' | null }) => void;
}

interface PeakTimeOption {
  key: 'morning' | 'afternoon' | 'night';
  label: string;
  emoji: string;
  timeRange: string;
}

const PEAK_TIME_OPTIONS: PeakTimeOption[] = [
  { key: 'morning', label: 'Morning', emoji: '☀️', timeRange: '5 AM – 12 PM' },
  { key: 'afternoon', label: 'Afternoon', emoji: '☀️', timeRange: '12 PM – 6 PM' },
  { key: 'night', label: 'Night', emoji: '🌙', timeRange: '6 PM – 2 AM' },
];

export default function Step4Hours({ state, onChange }: StepProps): React.JSX.Element {
  const { hours, peakTime } = state;

  const handleDecrement = async () => {
    if (hours > 1) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange({ hours: hours - 1 });
    }
  };

  const handleIncrement = async () => {
    if (hours < 16) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange({ hours: hours + 1 });
    }
  };

  const handlePeakTimeSelect = async (key: 'morning' | 'afternoon' | 'night') => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange({ peakTime: key });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>How much time daily?</Text>
      <Text style={styles.subtext}>Be realistic — consistency beats intensity.</Text>

      <View style={styles.selectorRow}>
        <Pressable
          style={[styles.circleBtn, hours <= 1 && styles.circleBtnDisabled]}
          onPress={handleDecrement}
          disabled={hours <= 1}
          accessibilityRole="button"
          accessibilityLabel="Decrease hours"
        >
          <Text style={styles.btnText}>−</Text>
        </Pressable>

        <View style={styles.numberContainer}>
          <Text style={styles.largeNumber}>{hours}</Text>
          <Text style={styles.hoursLabel}>hours per day</Text>
        </View>

        <Pressable
          style={[styles.circleBtn, hours >= 16 && styles.circleBtnDisabled]}
          onPress={handleIncrement}
          disabled={hours >= 16}
          accessibilityRole="button"
          accessibilityLabel="Increase hours"
        >
          <Text style={styles.btnText}>+</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionLabel}>When are you most productive?</Text>

      <View style={styles.cardsStack}>
        {PEAK_TIME_OPTIONS.map((option) => {
          const isSelected = peakTime === option.key;
          return (
            <Pressable
              key={option.key}
              style={[
                styles.card,
                isSelected ? styles.cardSelected : styles.cardUnselected,
              ]}
              onPress={() => handlePeakTimeSelect(option.key)}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={`${option.label} productivity slot`}
            >
              <View style={styles.cardLeft}>
                <Text style={styles.cardEmoji}>{option.emoji}</Text>
                <View>
                  <Text style={styles.cardLabel}>{option.label}</Text>
                  <Text style={styles.cardTime}>{option.timeRange}</Text>
                </View>
              </View>

              <View style={[styles.radio, isSelected && styles.radioSelected]}>
                {isSelected && <View style={styles.radioInner} />}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: SPACING.xxl,
  },
  heading: {
    fontFamily: TYPOGRAPHY.fonts.display,
    fontSize: 30,
    color: COLORS.navy,
    marginTop: 32,
  },
  subtext: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 14,
    color: COLORS.t3,
    marginTop: 6,
    marginBottom: SPACING.huge,
  },
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    marginBottom: SPACING.xl,
  },
  circleBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleBtnDisabled: {
    opacity: 0.4,
  },
  btnText: {
    fontSize: 24,
    fontFamily: TYPOGRAPHY.fonts.sans,
    color: COLORS.t1,
    textAlign: 'center',
    lineHeight: 28,
  },
  numberContainer: {
    alignItems: 'center',
    width: 120,
  },
  largeNumber: {
    fontFamily: TYPOGRAPHY.fonts.mono,
    fontSize: 72,
    color: COLORS.t1,
    lineHeight: 76,
  },
  hoursLabel: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 13,
    color: COLORS.t3,
  },
  sectionLabel: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.t2,
    marginTop: 12,
    marginBottom: SPACING.md,
  },
  cardsStack: {
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    height: 60,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
  },
  cardUnselected: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardSelected: {
    backgroundColor: COLORS.violetSoft,
    borderWidth: 1.5,
    borderColor: COLORS.violet,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  cardEmoji: {
    fontSize: 20,
  },
  cardLabel: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.t1,
  },
  cardTime: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 12,
    color: COLORS.t3,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: COLORS.violet,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.violet,
  },
});
