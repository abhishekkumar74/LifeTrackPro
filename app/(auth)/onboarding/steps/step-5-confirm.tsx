import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase/client';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@/constants/theme';
import { UserCategory } from '@/types/app.types';

interface OnboardingData {
  name: string;
  category: UserCategory | null;
  subcategories: string[];
  goalText: string;
  timeline: string | null;
  hours: number;
  peakTime: 'morning' | 'afternoon' | 'night' | null;
}

interface StepProps {
  state: OnboardingData;
  onSubmit: () => Promise<void>;
  isLoading: boolean;
  errorMessage: string | null;
}

// Map timeline display text to database enum values
const TIMELINE_MAP: Record<string, '3M' | '6M' | '1Y' | '2Y' | '5Y'> = {
  '3 Months': '3M',
  '6 Months': '6M',
  '1 Year': '1Y',
  '2 Years': '2Y',
  '5 Years': '5Y',
};

// Calculate timeline days
const TIMELINE_DAYS: Record<string, number> = {
  '3 Months': 90,
  '6 Months': 180,
  '1 Year': 365,
  '2 Years': 730,
  '5 Years': 1825,
};

export default function Step5Confirm({ state, errorMessage }: StepProps): React.JSX.Element {
  const { name, category, subcategories, goalText, timeline, hours, peakTime } = state;

  // Calculate deadline date representation for summary card
  const getDeadlineDisplay = (): string => {
    if (!timeline) return '';
    const daysToAdd = TIMELINE_DAYS[timeline] || 180;
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysToAdd);
    
    // Format: "by June 2027"
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${timeline} — by ${months[targetDate.getMonth()]} ${targetDate.getFullYear()}`;
  };

  const getFocusDisplay = (): string => {
    if (subcategories && subcategories.length > 0) {
      return subcategories.join(', ');
    }
    // Fallback if step 2 was skipped
    if (category) {
      return category.charAt(0).toUpperCase() + category.slice(1);
    }
    return '';
  };

  const getPeakTimeDisplay = (): string => {
    if (peakTime === 'morning') return 'Morning person';
    if (peakTime === 'afternoon') return 'Afternoon person';
    if (peakTime === 'night') return 'Night owl';
    return '';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>You're all set, {name.split(' ')[0]}! 🎉</Text>
      <Text style={styles.subtext}>Here's what we'll build together.</Text>

      {/* Summary visual card */}
      <View style={styles.card}>
        <View style={styles.accentBar} />
        
        <View style={styles.cardContent}>
          {/* Row 1: Goal */}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>GOAL</Text>
            <Text style={styles.rowValue} numberOfLines={2}>{goalText}</Text>
          </View>
          <View style={styles.divider} />

          {/* Row 2: Timeline */}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>TIMELINE</Text>
            <Text style={styles.rowValue}>{getDeadlineDisplay()}</Text>
          </View>
          <View style={styles.divider} />

          {/* Row 3: Daily Time */}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>DAILY TIME</Text>
            <Text style={styles.rowValue}>{hours} hours · {getPeakTimeDisplay()}</Text>
          </View>
          <View style={styles.divider} />

          {/* Row 4: Focus */}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>FOCUS ON</Text>
            <Text style={styles.rowValue} numberOfLines={1}>{getFocusDisplay()}</Text>
          </View>
        </View>
      </View>

      {errorMessage && (
        <Text style={styles.errorText}>{errorMessage}</Text>
      )}
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
    fontSize: 32,
    color: COLORS.navy,
    marginTop: 32,
  },
  subtext: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 15,
    color: COLORS.t3,
    marginTop: 6,
    marginBottom: SPACING.xl,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    minHeight: 240,
    // Soft shadow
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  accentBar: {
    width: 4,
    backgroundColor: COLORS.violet,
    height: '100%',
  },
  cardContent: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  row: {
    flexDirection: 'column',
    gap: 4,
  },
  rowLabel: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.t3,
    letterSpacing: 0.88, // 0.08em equivalent
  },
  rowValue: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.t1,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  errorText: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 12,
    color: COLORS.coral,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
});
