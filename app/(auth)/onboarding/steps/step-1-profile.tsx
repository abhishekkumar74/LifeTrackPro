import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Dimensions,
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@/constants/theme';
import { UserCategory } from '@/types/app.types';

interface StepProps {
  state: {
    name: string;
    category: UserCategory | null;
  };
  onChange: (updates: { name?: string; category?: UserCategory | null }) => void;
}

const { width } = Dimensions.get('window');
const TILE_WIDTH = (width - SPACING.xxl * 2 - 10) / 2; // Dynamic 2-column calculation accounting for a 10px gap

interface CategoryOption {
  type: UserCategory;
  label: string;
  emoji: string;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  { type: 'student', label: 'Student', emoji: '🎓' },
  { type: 'employee', label: 'Employee', emoji: '💼' },
  { type: 'creator', label: 'Creator', emoji: '🎨' },
  { type: 'entrepreneur', label: 'Entrepreneur', emoji: '🚀' },
  { type: 'educator', label: 'Educator', emoji: '📖' },
  { type: 'aspirant', label: 'Aspirant', emoji: '🎯' },
];

export default function Step1Profile({ state, onChange }: StepProps): React.JSX.Element {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Hey, what's your name?</Text>

      <TextInput
        ref={inputRef}
        style={[
          styles.input,
          isFocused && styles.inputFocused,
        ]}
        placeholder="Your full name"
        placeholderTextColor={COLORS.t3}
        value={state.name}
        onChangeText={(text) => onChange({ name: text })}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        autoCapitalize="words"
        autoCorrect={false}
      />

      <Text style={styles.sectionLabel}>I am a...</Text>

      <View style={styles.grid}>
        {CATEGORY_OPTIONS.map((item) => {
          const isSelected = state.category === item.type;
          return (
            <Pressable
              key={item.type}
              style={[
                styles.tile,
                isSelected ? styles.tileSelected : styles.tileUnselected,
              ]}
              onPress={() => onChange({ category: item.type })}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={`I am a ${item.label}`}
            >
              <Text style={styles.emoji}>{item.emoji}</Text>
              <Text style={styles.tileLabel}>{item.label}</Text>
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
    marginBottom: SPACING.xl,
  },
  input: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 16,
    color: COLORS.t1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    height: 52,
    paddingHorizontal: SPACING.lg,
  },
  inputFocused: {
    borderColor: COLORS.violet,
  },
  sectionLabel: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.t2,
    marginTop: 28,
    marginBottom: SPACING.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  tile: {
    width: TILE_WIDTH,
    height: 80,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  tileUnselected: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tileSelected: {
    backgroundColor: COLORS.violetSoft,
    borderWidth: 1.5,
    borderColor: COLORS.violet,
  },
  emoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  tileLabel: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.t1,
  },
});
