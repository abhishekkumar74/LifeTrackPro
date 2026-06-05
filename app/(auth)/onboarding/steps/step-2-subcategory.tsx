import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@/constants/theme';
import { UserCategory } from '@/types/app.types';

interface StepProps {
  state: {
    category: UserCategory | null;
    subcategories: string[];
  };
  onChange: (updates: { subcategories: string[] }) => void;
}

const STUDENT_PILLS = ['NEET', 'JEE', 'UPSC', 'SSC', 'CAT', 'GATE', 'CLAT', 'Other'];
const EMPLOYEE_PILLS = ['Corporate', 'Startup', 'Government', 'Remote'];
const CREATOR_PILLS = ['YouTuber', 'Blogger', 'Designer', 'Developer', 'Podcaster', 'Other'];

export default function Step2Subcategory({ state, onChange }: StepProps): React.JSX.Element {
  const { category, subcategories } = state;

  // Determine pills and selection rules based on category
  const pills = category === 'student'
    ? STUDENT_PILLS
    : category === 'employee'
    ? EMPLOYEE_PILLS
    : category === 'creator'
    ? CREATOR_PILLS
    : [];

  const isMultiSelect = category === 'student';

  const getHeading = (): string => {
    switch (category) {
      case 'student':
        return 'What are you preparing for?';
      case 'employee':
        return "What's your work setup?";
      case 'creator':
        return 'What do you create?';
      default:
        return 'Tell us more about your focus';
    }
  };

  const handlePillPress = (pill: string) => {
    if (isMultiSelect) {
      if (subcategories.includes(pill)) {
        onChange({ subcategories: subcategories.filter((x) => x !== pill) });
      } else {
        onChange({ subcategories: [...subcategories, pill] });
      }
    } else {
      // Single select
      if (subcategories.includes(pill)) {
        onChange({ subcategories: [] }); // toggle off
      } else {
        onChange({ subcategories: [pill] }); // select only this
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{getHeading()}</Text>
      <Text style={styles.subtext}>Select {isMultiSelect ? 'all that apply' : 'your primary focus'}.</Text>

      <View style={styles.pillsContainer}>
        {pills.map((pill) => {
          const isSelected = subcategories.includes(pill);
          return (
            <Pressable
              key={pill}
              style={[
                styles.pill,
                isSelected ? styles.pillSelected : styles.pillUnselected,
              ]}
              onPress={() => handlePillPress(pill)}
              accessibilityRole={isMultiSelect ? 'checkbox' : 'radio'}
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={pill}
            >
              <Text
                style={[
                  styles.pillText,
                  isSelected ? styles.pillTextSelected : styles.pillTextUnselected,
                ]}
              >
                {pill}
              </Text>
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
    marginTop: SPACING.xs,
    marginBottom: SPACING.xl,
  },
  pillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  pill: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: RADIUS.lg + 4, // ~20px
  },
  pillUnselected: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pillSelected: {
    backgroundColor: COLORS.violetSoft,
    borderWidth: 1,
    borderColor: COLORS.violet,
  },
  pillText: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 14,
  },
  pillTextUnselected: {
    color: COLORS.t2,
    fontWeight: '400',
  },
  pillTextSelected: {
    color: COLORS.violet,
    fontWeight: '600',
  },
});
