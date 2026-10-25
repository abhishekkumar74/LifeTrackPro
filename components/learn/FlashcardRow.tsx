import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  LayoutAnimation,
} from 'react-native';
import { Trash2, ChevronDown, ChevronUp, Clock, CheckCircle2, RotateCw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { ParsedFlashcard } from '@/lib/hooks/use-flashcards';
import { getSubjectColor } from '@/lib/utils/subject-colors';

interface FlashcardRowProps {
  card: ParsedFlashcard;
  onDelete: (id: string) => Promise<any>;
}

export const FlashcardRow: React.FC<FlashcardRowProps> = ({ card, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const subjectColor = getSubjectColor(card.subject);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded((prev) => !prev);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Flashcard',
      'Are you sure you want to delete this flashcard?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            onDelete(card.id).catch((err) => {
              Alert.alert('Error', err?.message || 'Failed to delete card.');
            });
          },
        },
      ]
    );
  };

  return (
    <View style={styles.cardContainer}>
      <TouchableOpacity
        style={styles.cardHeader}
        onPress={toggleExpand}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <View style={[styles.subjectPill, { backgroundColor: `${subjectColor}15` }]}>
            <Text style={[styles.subjectText, { color: subjectColor }]}>
              {card.subject}
            </Text>
          </View>

          {card.isDue ? (
            <View style={styles.dueBadge}>
              <Clock size={10} color="#E8A020" />
              <Text style={styles.dueText}>Due Today</Text>
            </View>
          ) : card.review_count >= 3 ? (
            <View style={styles.masteredBadge}>
              <CheckCircle2 size={10} color="#00B894" />
              <Text style={styles.masteredText}>Mastered</Text>
            </View>
          ) : (
            <View style={styles.learningBadge}>
              <RotateCw size={10} color="#5B4FE8" />
              <Text style={styles.learningText}>Learning</Text>
            </View>
          )}
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={handleDelete}
            style={styles.deleteBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Trash2 size={15} color="#9B9BAF" />
          </TouchableOpacity>
          {isExpanded ? (
            <ChevronUp size={16} color="#5C5C70" />
          ) : (
            <ChevronDown size={16} color="#5C5C70" />
          )}
        </View>
      </TouchableOpacity>

      {/* Front: Question */}
      <TouchableOpacity
        onPress={toggleExpand}
        activeOpacity={0.8}
        style={styles.bodyPressable}
      >
        <Text style={styles.questionText}>
          {card.front}
        </Text>

        {/* Back: Answer (expanded or preview) */}
        {isExpanded ? (
          <View style={styles.expandedAnswerWrap}>
            <Text style={styles.answerLabel}>ANSWER</Text>
            <Text style={styles.expandedAnswerText}>
              {card.back}
            </Text>
          </View>
        ) : (
          <Text style={styles.previewAnswerText} numberOfLines={1}>
            {card.back}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    padding: 14,
    marginBottom: 10,
    shadowColor: '#17172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  subjectPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  subjectText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  dueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#FFF7E6',
  },
  dueText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    color: '#E8A020',
    fontWeight: '600',
  },
  masteredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#E2F9F3',
  },
  masteredText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    color: '#00B894',
    fontWeight: '600',
  },
  learningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#F0EFFF',
  },
  learningText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    color: '#5B4FE8',
    fontWeight: '600',
  },
  deleteBtn: {
    padding: 4,
  },
  bodyPressable: {
    gap: 4,
  },
  questionText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: '#17172A',
    fontWeight: '600',
    lineHeight: 20,
  },
  previewAnswerText: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#9B9BAF',
    marginTop: 2,
  },
  expandedAnswerWrap: {
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#FAF9F6',
    borderLeftWidth: 3,
    borderLeftColor: '#00B894',
  },
  answerLabel: {
    fontFamily: 'DMSans-Bold',
    fontSize: 9,
    color: '#00B894',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  expandedAnswerText: {
    fontFamily: 'DMSans',
    fontSize: 13,
    color: '#2C2C3E',
    lineHeight: 19,
  },
});
