import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@/constants/theme';
import { UserCategory } from '@/types/app.types';

interface StepProps {
  state: {
    category: UserCategory | null;
    subcategories: string[];
    customSubcategory?: string;
  };
  onChange: (updates: { subcategories: string[]; customSubcategory?: string }) => void;
}

const SUBCATEGORY_OPTIONS = {
  student: [
    // Competitive Exams
    'NEET',
    'JEE Main',
    'JEE Advanced',
    'UPSC CSE',
    'UPSC CAPF',
    'SSC CGL',
    'SSC CHSL',
    'SSC MTS',
    'IBPS PO',
    'IBPS Clerk',
    'SBI PO',
    'RBI Grade B',
    'SEBI',
    'CAT',
    'XAT',
    'GMAT',
    'GRE',
    'GATE',
    'ESE/IES',
    'CLAT',
    'AILET',
    'LSAT',
    'NDA',
    'CDS',
    'AFCAT',
    'CUET',
    'Class 10 Boards',
    'Class 12 Boards',
    'CA Foundation',
    'CA Intermediate',
    'CA Final',
    'CS Foundation',
    'CMA',
    'IELTS',
    'TOEFL',
    'PTE',
    'Coding / DSA',
    'Other',
  ],

  employee: [
    'Corporate / MNC',
    'Government Job',
    'PSU / Public Sector',
    'Banking & Finance',
    'IT / Software',
    'Healthcare / Medical',
    'Teaching / Education',
    'Legal / Law',
    'Defence / Military',
    'Police / CRPF / BSF',
    'Railways',
    'Remote / Work from Home',
    'Startup / Scaleup',
    'Self Employed',
    'Other',
  ],

  creator: [
    'YouTuber / Video Creator',
    'Instagram / Reels Creator',
    'Blogger / Writer',
    'Podcaster',
    'Graphic Designer',
    'UI/UX Designer',
    'Photographer / Videographer',
    'Music Artist',
    'Developer / Programmer',
    'Freelancer',
    'Digital Marketer',
    'Other',
  ],

  entrepreneur: [
    'Early Stage Startup',
    'Growing Business',
    'E-commerce / D2C',
    'SaaS / Tech Product',
    'Service Business',
    'Manufacturing',
    'Agriculture / AgriTech',
    'EdTech',
    'FinTech',
    'HealthTech',
    'Real Estate',
    'Side Business / Hustle',
    'Other',
  ],

  educator: [
    'School Teacher',
    'College Professor',
    'Online Tutor / Coach',
    'Coaching Institute',
    'Corporate Trainer',
    'Skill Trainer',
    'Other',
  ],

  aspirant: [
    'Career Change',
    'Skill Building',
    'Physical Fitness',
    'Language Learning',
    'Music / Arts',
    'Personal Development',
    'Financial Goals',
    'Health & Wellness',
    'Other',
  ],
};

export default function Step2Subcategory({ state, onChange }: StepProps): React.JSX.Element {
  const { category, subcategories, customSubcategory } = state;
  const [searchQuery, setSearchQuery] = useState('');
  const [customCategory, setCustomCategory] = useState(customSubcategory || '');
  const [showCustomInput, setShowCustomInput] = useState(subcategories.includes('Other'));

  useEffect(() => {
    setShowCustomInput(subcategories.includes('Other'));
  }, [subcategories]);

  const pills = category ? SUBCATEGORY_OPTIONS[category] || [] : [];
  const isMultiSelect = category === 'student';

  const getHeading = (): string => {
    switch (category) {
      case 'student':
        return 'What are you preparing for?';
      case 'employee':
        return "What's your work setup?";
      case 'creator':
        return 'What do you create?';
      case 'entrepreneur':
        return 'Tell us about your business';
      case 'educator':
        return 'What is your teaching focus?';
      case 'aspirant':
        return 'What are your personal goals?';
      default:
        return 'Tell us more about your focus';
    }
  };

  const handlePillPress = (pill: string) => {
    let nextSubcategories: string[];
    if (isMultiSelect) {
      if (subcategories.includes(pill)) {
        nextSubcategories = subcategories.filter((x) => x !== pill);
      } else {
        nextSubcategories = [...subcategories, pill];
      }
    } else {
      if (subcategories.includes(pill)) {
        nextSubcategories = [];
      } else {
        nextSubcategories = [pill];
      }
    }

    const hasOther = nextSubcategories.includes('Other');
    onChange({
      subcategories: nextSubcategories,
      customSubcategory: hasOther ? customCategory : '',
    });
  };

  const handleCustomCategoryChange = (text: string) => {
    setCustomCategory(text);
    onChange({
      subcategories,
      customSubcategory: text,
    });
  };

  const filteredPills = pills.filter((pill) =>
    pill.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>{getHeading()}</Text>
      <Text style={styles.subtext}>
        Select {isMultiSelect ? 'all that apply' : 'your primary focus'}.
      </Text>

      {/* Search Input for student long list */}
      {category === 'student' && (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search exam..."
            placeholderTextColor={COLORS.t3}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
        </View>
      )}

      <View style={styles.pillsContainer}>
        {filteredPills.map((pill) => {
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
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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

      {/* Custom Input for Other */}
      {showCustomInput && (
        <View style={styles.customInputContainer}>
          <Text style={styles.customLabel}>Tell us your focus area:</Text>
          <TextInput
            style={styles.customInput}
            placeholder="e.g. CA Foundation, IELTS, Coding..."
            placeholderTextColor={COLORS.t3}
            value={customCategory}
            onChangeText={handleCustomCategoryChange}
            autoFocus={true}
            maxLength={50}
            autoCorrect={false}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F6F3',
  },
  scrollContent: {
    paddingHorizontal: SPACING.xxl,
    paddingBottom: SPACING.huge,
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
  searchContainer: {
    marginBottom: SPACING.lg,
  },
  searchInput: {
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
    backgroundColor: COLORS.violet,
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
    color: '#FFFFFF',
    fontWeight: '600',
  },
  customInputContainer: {
    marginTop: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  customLabel: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.t2,
    marginBottom: SPACING.sm,
  },
  customInput: {
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
});
