import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { getSubjectColor } from '@/lib/utils/subject-colors';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface SubjectCardProps {
  subject: string;
  completionPercent: number;
  chapterCount: number;
  doneCount: number;
  isExpanded: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}

export const SubjectCard: React.FC<SubjectCardProps> = ({
  subject,
  completionPercent,
  chapterCount,
  isExpanded,
  onToggle,
  children,
}) => {
  const accentColor = getSubjectColor(subject);

  const handleTogglePress = () => {
    // Configure layout animation for smooth height transition
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggle();
  };

  return (
    <View style={styles.container}>
      {/* Header pressable trigger */}
      <TouchableOpacity
        onPress={handleTogglePress}
        style={styles.headerContainer}
        activeOpacity={0.7}
      >
        <View style={styles.leftRow}>
          {/* Left subject accent dot */}
          <View style={[styles.accentDot, { backgroundColor: accentColor }]} />
          
          <View style={styles.textContainer}>
            <Text style={styles.subjectText}>{subject}</Text>
            <Text style={styles.chaptersCountText}>
              {`${chapterCount} chapter${chapterCount === 1 ? '' : 's'}`}
            </Text>
          </View>
        </View>

        <View style={styles.rightRow}>
          <Text style={styles.percentText}>{`${completionPercent}%`}</Text>
          <View style={[styles.chevronWrapper, isExpanded && styles.chevronRotated]}>
            <ChevronRight size={16} color="#9B9BAF" />
          </View>
        </View>
      </TouchableOpacity>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View
          style={[
            styles.progressBarFill,
            { backgroundColor: accentColor, width: `${completionPercent}%` },
          ]}
        />
      </View>

      {/* Expanded list drawer */}
      {isExpanded && <View style={styles.expandedDrawer}>{children}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#17172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accentDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  subjectText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 15,
    color: '#17172A',
    fontWeight: '600',
  },
  chaptersCountText: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#9B9BAF',
    marginTop: 2,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  percentText: {
    fontFamily: 'DMMono',
    fontSize: 13,
    color: '#17172A',
    fontWeight: '600',
  },
  chevronWrapper: {
    transform: [{ rotate: '0deg' }],
  },
  chevronRotated: {
    transform: [{ rotate: '90deg' }],
  },
  progressContainer: {
    height: 4,
    backgroundColor: '#E8E7E3',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
  },
  expandedDrawer: {
    backgroundColor: '#FFFFFF',
  },
});
