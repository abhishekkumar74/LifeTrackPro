import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@/constants/theme';
import { UserCategory, ExamType, Exam } from '@/types/app.types';
import { useExams } from '@/lib/hooks/use-exams';

interface StepProps {
  state: {
    category: UserCategory | null;
    subcategories: string[];
    customSubcategory?: string;
  };
  onChange: (updates: { subcategories: string[]; customSubcategory?: string }) => void;
}

const EXAM_TYPE_TABS: { label: string; value: ExamType | 'all' }[] = [
  { label: 'All Exams', value: 'all' },
  { label: 'Entrance', value: 'entrance' },
  { label: 'Sarkari / Govt', value: 'sarkari' },
  { label: 'Boards', value: 'board' },
  { label: 'Professional', value: 'professional' },
];

const SUBCATEGORY_OPTIONS = {
  student: [],
  cse_student: [
    'B.Tech Computer Science (CSE)',
    'Campus Placement',
    'Amazon SDE',
    'Google SWE', 
    'Microsoft SWE',
    'Meta/Facebook',
    'Startup (Product)',
    'FAANG (General)',
    'GATE Exam',
    'Higher Studies (MS/MBA)',
    'Backend Development',
    'Full Stack Development',
    'DevOps / Cloud',
    'System Design',
    'Competitive Programming',
    'Open Source',
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
  const isExamCandidate = category === 'student' || category === 'aspirant';
  const isMultiSelect = isExamCandidate || category === 'cse_student';

  const defaultExamType: ExamType | 'all' =
    category === 'aspirant' ? 'sarkari' : category === 'student' ? 'entrance' : 'all';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExamType, setSelectedExamType] = useState<ExamType | 'all'>(defaultExamType);
  const [customCategory, setCustomCategory] = useState(customSubcategory || '');
  const [showCustomInput, setShowCustomInput] = useState(subcategories.includes('Other'));

  useEffect(() => {
    if (category === 'aspirant') {
      setSelectedExamType('sarkari');
    } else if (category === 'student') {
      setSelectedExamType('entrance');
    } else {
      setSelectedExamType('all');
    }
  }, [category]);

  const examsQuery = useExams({
    category: isExamCandidate ? 'student' : undefined,
    examType: selectedExamType,
    search: searchQuery,
  });

  const examTypeTabs = useMemo(() => {
    if (category === 'aspirant') {
      return [
        { label: 'Sarkari / Govt', value: 'sarkari' as const },
        { label: 'All Exams', value: 'all' as const },
        { label: 'Entrance', value: 'entrance' as const },
        { label: 'Professional', value: 'professional' as const },
        { label: 'Boards', value: 'board' as const },
      ];
    }
    return [
      { label: 'Entrance', value: 'entrance' as const },
      { label: 'All Exams', value: 'all' as const },
      { label: 'Sarkari / Govt', value: 'sarkari' as const },
      { label: 'Boards', value: 'board' as const },
      { label: 'Professional', value: 'professional' as const },
    ];
  }, [category]);

  useEffect(() => {
    setShowCustomInput(subcategories.includes('Other'));
  }, [subcategories]);

  const staticPills = category ? SUBCATEGORY_OPTIONS[category] || [] : [];

  const getHeading = (): string => {
    switch (category) {
      case 'aspirant':
        return 'Select Your Govt Exam Target';
      case 'student':
        return 'Select Your Target Exam';
      case 'cse_student':
        return 'Select Your College Focus & Target';
      case 'employee':
        return "What's your work setup?";
      case 'creator':
        return 'What do you create?';
      case 'entrepreneur':
        return 'Tell us about your business';
      case 'educator':
        return 'What is your teaching focus?';
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

  const handleExamPress = (exam: Exam) => {
    const isSelected =
      subcategories.includes(exam.slug) ||
      subcategories.includes(exam.name) ||
      subcategories.includes(exam.id);

    let nextSubcategories: string[];
    if (isMultiSelect) {
      if (isSelected) {
        nextSubcategories = subcategories.filter(
          (x) => x !== exam.slug && x !== exam.name && x !== exam.id
        );
      } else {
        if (subcategories.length >= 2) {
          // Replace the oldest exam to maintain maximum 2 active selections
          nextSubcategories = [subcategories[subcategories.length - 1], exam.slug];
        } else {
          nextSubcategories = [...subcategories, exam.slug];
        }
      }
    } else {
      if (isSelected) {
        nextSubcategories = [];
      } else {
        nextSubcategories = [exam.slug];
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

  // Render for Student Category with Exam Types & Popularity Ranking
  const renderStudentExamSection = () => {
    const exams = examsQuery.data || [];

    return (
      <View style={styles.examSectionContainer}>
        {/* Exam Type Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.typeTabsScroll}
          style={styles.typeTabsWrapper}
        >
          {examTypeTabs.map((tab) => {
            const isActive = selectedExamType === tab.value;
            return (
              <TouchableOpacity
                key={tab.value}
                style={[styles.typeTabPill, isActive && styles.typeTabPillActive]}
                onPress={() => setSelectedExamType(tab.value)}
                activeOpacity={0.7}
              >
                <Text style={[styles.typeTabText, isActive && styles.typeTabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Exams Grid / Pills */}
        <View style={styles.pillsContainer}>
          {exams.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No exams found matching your filter.</Text>
            </View>
          )}
          {exams.map((exam) => {
            const isSelected =
              subcategories.includes(exam.name) ||
              subcategories.includes(exam.slug) ||
              subcategories.includes(exam.id);

            const typeLabel =
              exam.exam_type === 'entrance'
                ? 'Entrance'
                : exam.exam_type === 'sarkari'
                ? 'Govt'
                : exam.exam_type === 'board'
                ? 'Board'
                : exam.exam_type === 'professional'
                ? 'Professional'
                : 'Exam';

            return (
              <Pressable
                key={exam.id}
                style={[
                  styles.examCardPill,
                  isSelected ? styles.examCardSelected : styles.pillUnselected,
                ]}
                onPress={() => handleExamPress(exam)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={exam.name}
              >
                <View style={[styles.examColorDot, { backgroundColor: exam.color || '#5B4FE8' }]} />
                <View style={styles.examTextCol}>
                  <Text
                    style={[
                      styles.examTitleText,
                      isSelected ? styles.pillTextSelected : styles.pillTextUnselected,
                    ]}
                  >
                    {exam.name}
                  </Text>
                  <Text
                    style={[
                      styles.examTypeBadgeText,
                      isSelected ? styles.examTypeBadgeSelected : styles.examTypeBadgeUnselected,
                    ]}
                  >
                    {typeLabel}
                  </Text>
                </View>
              </Pressable>
            );
          })}

          {/* "Other" Option */}
          <Pressable
            key="Other"
            style={[
              styles.pill,
              subcategories.includes('Other') ? styles.pillSelected : styles.pillUnselected,
            ]}
            onPress={() => handlePillPress('Other')}
          >
            <Text
              style={[
                styles.pillText,
                subcategories.includes('Other') ? styles.pillTextSelected : styles.pillTextUnselected,
              ]}
            >
              + Other Exam
            </Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const filteredStaticPills = staticPills.filter((pill) =>
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
        {isExamCandidate
          ? 'Select up to 2 exams to unlock curated syllabus & progress tracking.'
          : `Select ${isMultiSelect ? 'all that apply' : 'your primary focus'}.`}
      </Text>

      {(isExamCandidate || category === 'cse_student') && (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder={
              category === 'aspirant'
                ? 'Search Sarkari exams (UPSC, SSC, Banking, Railways)...'
                : 'Search exams (NEET, JEE, CAT, GATE, Boards)...'
            }
            placeholderTextColor={COLORS.t3}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
        </View>
      )}

      {isExamCandidate ? (
        renderStudentExamSection()
      ) : (
        <View style={styles.pillsContainer}>
          {filteredStaticPills.map((pill) => {
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
      )}

      {showCustomInput && (
        <View style={styles.customInputContainer}>
          <Text style={styles.customLabel}>Tell us your exam or focus area:</Text>
          <TextInput
            style={styles.customInput}
            placeholder="e.g. State PSC, B.Com, MCA..."
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
    borderRadius: RADIUS.lg + 4,
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
  examSectionContainer: {
    width: '100%',
  },
  typeTabsWrapper: {
    marginBottom: SPACING.lg,
  },
  typeTabsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: SPACING.lg,
  },
  typeTabPill: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E7E3',
  },
  typeTabPillActive: {
    backgroundColor: '#1E1B4B',
    borderColor: '#1E1B4B',
  },
  typeTabText: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  typeTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  examCardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: RADIUS.lg,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E7E3',
  },
  examCardSelected: {
    backgroundColor: COLORS.violet,
    borderColor: COLORS.violet,
  },
  examColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  examTextCol: {
    flexDirection: 'column',
  },
  examTitleText: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 14,
    fontWeight: '600',
  },
  examTypeBadgeText: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.fonts.sans,
    marginTop: 1,
  },
  examTypeBadgeUnselected: {
    color: '#9CA3AF',
  },
  examTypeBadgeSelected: {
    color: '#E0E7FF',
  },
  emptyContainer: {
    width: '100%',
    paddingVertical: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 14,
    color: COLORS.t3,
    textAlign: 'center',
  },
});
