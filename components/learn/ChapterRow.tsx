import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Alert,
} from 'react-native';
import { ChevronRight, ChevronDown } from 'lucide-react-native';
import { SyllabusTopic, SyllabusStatus } from '@/types/app.types';

interface ChapterRowProps {
  chapter: string;
  topics: SyllabusTopic[];
  isExpanded: boolean;
  onToggle: () => void;
  onTopicStatusChange: (topicId: string, status: SyllabusStatus) => void;
  selectedTopicIds: string[];
  isMultiSelectMode: boolean;
  onToggleSelectTopic: (topicId: string) => void;
  onLongPressTopic: (topicId: string) => void;
  searchQuery?: string;
}

// Simple escape regex helper
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Highlight matched text helper
const HighlightText = ({ text, query, style }: { text: string; query: string; style: any }) => {
  if (!query.trim()) return <Text style={style}>{text}</Text>;

  const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
  const parts = text.split(regex);

  return (
    <Text style={style}>
      {parts.map((part, i) => {
        const isMatch = part.toLowerCase() === query.trim().toLowerCase();
        return (
          <Text key={i} style={isMatch ? [style, styles.highlightTextMatched] : style}>
            {part}
          </Text>
        );
      })}
    </Text>
  );
};

// Map status to abbreviation indicators
export const getStatusSymbol = (status: SyllabusStatus): string => {
  switch (status) {
    case 'not_started':
      return '—';
    case 'in_progress':
      return '📖';
    case 'done':
      return '✓';
    case 'needs_revision':
      return '↺';
    default:
      return '—';
  }
};

// Map status to color dots
export const getStatusColor = (status: SyllabusStatus): string => {
  switch (status) {
    case 'not_started':
      return '#E8E7E3';
    case 'in_progress':
      return '#5B4FE8';
    case 'done':
      return '#00B894';
    case 'needs_revision':
      return '#E8A020';
    default:
      return '#E8E7E3';
  }
};

export const ChapterRow: React.FC<ChapterRowProps> = ({
  chapter,
  topics,
  isExpanded,
  onToggle,
  onTopicStatusChange,
  selectedTopicIds,
  isMultiSelectMode,
  onToggleSelectTopic,
  onLongPressTopic,
  searchQuery = '',
}) => {
  const doneCount = topics.filter((t) => t.status === 'done').length;
  const totalCount = topics.length;

  const handleTogglePress = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggle();
  };

  const handleStatusSelectorPress = (topic: SyllabusTopic) => {
    if (isMultiSelectMode) {
      onToggleSelectTopic(topic.id);
      return;
    }

    Alert.alert(
      'Update Status',
      `Set progress status for "${topic.topic}":`,
      [
        { text: 'Not Started (—)', onPress: () => onTopicStatusChange(topic.id, 'not_started') },
        { text: 'In Progress (📖)', onPress: () => onTopicStatusChange(topic.id, 'in_progress') },
        { text: 'Done (✓)', onPress: () => onTopicStatusChange(topic.id, 'done') },
        { text: 'Needs Revision (↺)', onPress: () => onTopicStatusChange(topic.id, 'needs_revision') },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={styles.container}>
      {/* Chapter Header */}
      <TouchableOpacity
        onPress={handleTogglePress}
        style={styles.chapterHeader}
        activeOpacity={0.7}
      >
        <View style={styles.leftRow}>
          {isExpanded ? (
            <ChevronDown size={14} color="#5C5C70" style={styles.chevron} />
          ) : (
            <ChevronRight size={14} color="#5C5C70" style={styles.chevron} />
          )}
          <HighlightText text={chapter} query={searchQuery} style={styles.chapterText} />
        </View>

        <Text style={styles.countText}>{`${doneCount}/${totalCount}`}</Text>
      </TouchableOpacity>

      {/* Topics list */}
      {isExpanded && (
        <View style={styles.topicsList}>
          {topics.map((topic) => {
            const isSelected = selectedTopicIds.includes(topic.id);
            const statusColor = getStatusColor(topic.status as SyllabusStatus);

            return (
              <TouchableOpacity
                key={topic.id}
                style={[styles.topicRow, isSelected && styles.topicRowSelected]}
                onPress={() => {
                  if (isMultiSelectMode) {
                    onToggleSelectTopic(topic.id);
                  } else {
                    // Normal tap selects status
                    handleStatusSelectorPress(topic);
                  }
                }}
                onLongPress={() => onLongPressTopic(topic.id)}
                delayLongPress={500}
                activeOpacity={0.7}
              >
                <View style={styles.topicLeft}>
                  {/* Selection Checkbox */}
                  {isMultiSelectMode ? (
                    <View
                      style={[
                        styles.checkbox,
                        isSelected && styles.checkboxSelected,
                      ]}
                    >
                      {isSelected && <Text style={styles.checkmarkText}>✓</Text>}
                    </View>
                  ) : (
                    /* Normal status dot */
                    <View
                      style={[styles.statusDot, { backgroundColor: statusColor }]}
                    />
                  )}
                  <HighlightText
                    text={topic.topic}
                    query={searchQuery}
                    style={[styles.topicText, isSelected && styles.topicTextSelected]}
                  />
                </View>

                {/* Status indicator pill */}
                {!isMultiSelectMode && (
                  <TouchableOpacity
                    style={styles.statusPill}
                    onPress={() => handleStatusSelectorPress(topic)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.statusSymbolText}>
                      {getStatusSymbol(topic.status as SyllabusStatus)}
                    </Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
  },
  chapterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#F2F1EE',
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  chevron: {
    marginRight: 6,
  },
  chapterText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#5C5C70',
    fontWeight: '500',
  },
  countText: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#9B9BAF',
  },
  topicsList: {
    backgroundColor: '#FAF9F6',
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingLeft: 32,
    paddingRight: 16,
    borderTopWidth: 1,
    borderTopColor: '#F7F6F3',
    minHeight: 44,
  },
  topicRowSelected: {
    backgroundColor: 'rgba(91, 79, 232, 0.05)',
  },
  topicLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    marginRight: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#5B4FE8',
    borderColor: '#5B4FE8',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  topicText: {
    fontFamily: 'DMSans',
    fontSize: 13,
    color: '#17172A',
    flex: 1,
  },
  topicTextSelected: {
    fontWeight: '500',
  },
  statusPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E7E3',
    borderRadius: 12,
    minWidth: 28,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  statusSymbolText: {
    fontSize: 11,
    color: '#5C5C70',
    fontWeight: '500',
  },
  highlightTextMatched: {
    backgroundColor: '#FFEB3B',
    color: '#17172A',
    fontWeight: 'bold',
  },
});
export default ChapterRow;
