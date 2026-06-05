import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@/constants/theme';
import { UserCategory } from '@/types/app.types';

interface StepProps {
  state: {
    category: UserCategory | null;
    goalText: string;
    timeline: string | null;
  };
  onChange: (updates: { goalText?: string; timeline?: string | null }) => void;
}

const TIMELINE_OPTIONS = [
  '3 Months',
  '6 Months',
  '1 Year',
  '2 Years',
  '5 Years',
];

export default function Step3Goal({ state, onChange }: StepProps): React.JSX.Element {
  const { category, goalText, timeline } = state;
  const [isFocused, setIsFocused] = useState(false);

  const getPlaceholder = (): string => {
    switch (category) {
      case 'student':
        return 'e.g. Clear NEET 2026, AIR under 3000';
      case 'employee':
        return 'e.g. Get promoted to Senior Manager';
      case 'creator':
        return 'e.g. Reach 100K YouTube subscribers';
      case 'entrepreneur':
        return 'e.g. Hit ₹10L monthly revenue';
      default:
        return 'e.g. Learn Spanish fluently';
    }
  };

  const handleTextChange = (text: string) => {
    if (text.length <= 120) {
      onChange({ goalText: text });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>What's your biggest goal?</Text>
      <Text style={styles.subtext}>Be specific. This will drive everything.</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.textInput,
            isFocused && styles.textInputFocused,
          ]}
          placeholder={getPlaceholder()}
          placeholderTextColor={COLORS.t3}
          value={goalText}
          onChangeText={handleTextChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          multiline
          maxLength={120}
          textAlignVertical="top"
        />
        <Text style={styles.charCounter}>{goalText.length}/120</Text>
      </View>

      <Text style={styles.sectionLabel}>I want to achieve this in...</Text>

      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.timelineScroll}
        >
          {TIMELINE_OPTIONS.map((option) => {
            const isSelected = timeline === option;
            return (
              <Pressable
                key={option}
                style={[
                  styles.chip,
                  isSelected ? styles.chipSelected : styles.chipUnselected,
                ]}
                onPress={() => onChange({ timeline: option })}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={`Achieve goal in ${option}`}
              >
                <Text
                  style={[
                    styles.chipText,
                    isSelected ? styles.chipTextSelected : styles.chipTextUnselected,
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
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
    marginBottom: SPACING.xl,
  },
  inputContainer: {
    position: 'relative',
    width: '100%',
  },
  textInput: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 15,
    color: COLORS.t1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    height: 100,
    paddingTop: 14,
    paddingBottom: 24, // leaves room for character counter
    paddingHorizontal: 14,
  },
  textInputFocused: {
    borderColor: COLORS.violet,
  },
  charCounter: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 11,
    color: COLORS.t3,
  },
  sectionLabel: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.t2,
    marginTop: 24,
    marginBottom: SPACING.md,
  },
  timelineScroll: {
    gap: 8,
    paddingRight: SPACING.xxl, // spacing at the end of scroll
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: RADIUS.lg + 4, // ~20px
  },
  chipUnselected: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipSelected: {
    backgroundColor: COLORS.violet,
  },
  chipText: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 13,
  },
  chipTextUnselected: {
    color: COLORS.t2,
    fontWeight: '400',
  },
  chipTextSelected: {
    color: COLORS.surface,
    fontWeight: '600',
  },
});
