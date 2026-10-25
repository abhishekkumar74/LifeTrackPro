import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  ActionSheetIOS,
  Modal,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { ChevronRight, ChevronDown, Check, BookOpen, RotateCcw, Minus, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
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
  subjectColor?: string;
  isCse?: boolean;
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

// Map status to colors
export const getStatusBgColor = (status: SyllabusStatus): string => {
  switch (status) {
    case 'not_started':
      return '#F2F1EE';
    case 'in_progress':
      return '#EAE8FD';
    case 'done':
      return '#E2F9F3';
    case 'needs_revision':
      return '#FEF3DC';
    default:
      return '#F2F1EE';
  }
};

export const getStatusTextColor = (status: SyllabusStatus): string => {
  switch (status) {
    case 'not_started':
      return '#5C5C70';
    case 'in_progress':
      return '#5B4FE8';
    case 'done':
      return '#00B894';
    case 'needs_revision':
      return '#E8A020';
    default:
      return '#5C5C70';
  }
};

export const getStatusBorderColor = (status: SyllabusStatus): string => {
  switch (status) {
    case 'not_started':
      return '#E8E7E3';
    case 'in_progress':
      return '#D6D1F9';
    case 'done':
      return '#B3F2E3';
    case 'needs_revision':
      return '#FCE8C3';
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
  subjectColor = '#5B4FE8',
  isCse = false,
}) => {
  const [modalTopic, setModalTopic] = useState<SyllabusTopic | null>(null);

  const doneCount = topics.filter((t) => t.status === 'done').length;
  const totalCount = topics.length;
  const completionPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const handleTogglePress = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggle();
  };

  const handleStatusSelectorPress = (topic: SyllabusTopic) => {
    if (isMultiSelectMode) {
      onToggleSelectTopic(topic.id);
      return;
    }

    const options = ['Cancel', 'Not Started', 'In Progress', 'Done ✓', 'Needs Revision ↺'];
    const statusValues: SyllabusStatus[] = ['not_started', 'in_progress', 'done', 'needs_revision'];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 0,
          title: 'Update Status',
          message: `Set progress status for "${topic.topic}":`,
        },
        (buttonIndex) => {
          if (buttonIndex > 0) {
            const nextStatus = statusValues[buttonIndex - 1];
            if (nextStatus === 'done') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            } else {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            }
            onTopicStatusChange(topic.id, nextStatus);
          }
        }
      );
    } else {
      setModalTopic(topic);
    }
  };

  const handleSelectStatusFromModal = (newStatus: SyllabusStatus) => {
    if (!modalTopic) return;
    if (newStatus === 'done') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onTopicStatusChange(modalTopic.id, newStatus);
    setModalTopic(null);
  };

  return (
    <View style={styles.container}>
      {/* Chapter Header */}
      <TouchableOpacity
        onPress={handleTogglePress}
        style={styles.chapterHeader}
        activeOpacity={0.7}
      >
        <View style={styles.chapterHeaderTop}>
          <View style={styles.leftRow}>
            {isExpanded ? (
              <ChevronDown size={14} color="#5C5C70" style={styles.chevron} />
            ) : (
              <ChevronRight size={14} color="#5C5C70" style={styles.chevron} />
            )}
            <HighlightText
              text={isCse ? `${chapter} (${totalCount} topics)` : chapter}
              query={searchQuery}
              style={styles.chapterText}
            />
          </View>

          <Text style={styles.countText}>{`${doneCount} / ${totalCount}`}</Text>
        </View>

        {/* Mini progress bar */}
        <View style={styles.miniProgressContainer}>
          <View
            style={[
              styles.miniProgressBarFill,
              {
                backgroundColor: subjectColor,
                width: `${completionPercent}%`,
              },
            ]}
          />
        </View>
      </TouchableOpacity>

      {/* Topics list */}
      {isExpanded && (
        <View style={styles.topicsList}>
          {topics.map((topic) => {
            const isSelected = selectedTopicIds.includes(topic.id);
            const statusBgColor = getStatusBgColor(topic.status as SyllabusStatus);
            const statusTextColor = getStatusTextColor(topic.status as SyllabusStatus);
            const statusBorderColor = getStatusBorderColor(topic.status as SyllabusStatus);

            return (
              <View
                key={topic.id}
                style={[styles.topicRow, isSelected && styles.topicRowSelected]}
              >
                <TouchableOpacity
                  style={styles.topicLeft}
                  onPress={() => {
                    if (isMultiSelectMode) {
                      onToggleSelectTopic(topic.id);
                    } else {
                      handleStatusSelectorPress(topic);
                    }
                  }}
                  onLongPress={() => onLongPressTopic(topic.id)}
                  delayLongPress={500}
                  activeOpacity={0.7}
                >
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
                      style={[styles.statusDot, { backgroundColor: statusTextColor }]}
                    />
                  )}
                  <HighlightText
                    text={topic.topic}
                    query={searchQuery}
                    style={[styles.topicText, isSelected && styles.topicTextSelected]}
                  />
                </TouchableOpacity>

                {/* Status indicator pill: tap to open status selection popup */}
                {!isMultiSelectMode && (
                  <TouchableOpacity
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: statusBgColor,
                        borderColor: statusBorderColor,
                      },
                    ]}
                    onPress={() => handleStatusSelectorPress(topic)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={[styles.statusSymbolText, { color: statusTextColor }]}>
                      {getStatusSymbol(topic.status as SyllabusStatus)}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Cross-Platform Status Selector Modal */}
      <Modal
        visible={!!modalTopic}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalTopic(null)}
      >
        <TouchableWithoutFeedback onPress={() => setModalTopic(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle} numberOfLines={2}>
                    {modalTopic?.topic || 'Set Status'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setModalTopic(null)}
                    style={styles.modalCloseBtn}
                  >
                    <X size={18} color="#9B9BAF" />
                  </TouchableOpacity>
                </View>

                <View style={styles.statusOptionsList}>
                  <TouchableOpacity
                    style={[
                      styles.statusModalOption,
                      modalTopic?.status === 'done' && styles.statusModalOptionActiveDone,
                    ]}
                    onPress={() => handleSelectStatusFromModal('done')}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.statusOptionIconCircle, { backgroundColor: '#E2F9F3' }]}>
                      <Check size={16} color="#00B894" />
                    </View>
                    <View style={styles.statusOptionTextWrap}>
                      <Text style={[styles.statusOptionTitle, { color: '#00B894' }]}>Done</Text>
                      <Text style={styles.statusOptionSub}>Topic completed and mastered</Text>
                    </View>
                    {modalTopic?.status === 'done' && <Check size={18} color="#00B894" />}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.statusModalOption,
                      modalTopic?.status === 'in_progress' && styles.statusModalOptionActiveProgress,
                    ]}
                    onPress={() => handleSelectStatusFromModal('in_progress')}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.statusOptionIconCircle, { backgroundColor: '#EAE8FD' }]}>
                      <BookOpen size={16} color="#5B4FE8" />
                    </View>
                    <View style={styles.statusOptionTextWrap}>
                      <Text style={[styles.statusOptionTitle, { color: '#5B4FE8' }]}>In Progress</Text>
                      <Text style={styles.statusOptionSub}>Currently studying this topic</Text>
                    </View>
                    {modalTopic?.status === 'in_progress' && <Check size={18} color="#5B4FE8" />}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.statusModalOption,
                      modalTopic?.status === 'needs_revision' && styles.statusModalOptionActiveRevision,
                    ]}
                    onPress={() => handleSelectStatusFromModal('needs_revision')}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.statusOptionIconCircle, { backgroundColor: '#FEF3DC' }]}>
                      <RotateCcw size={16} color="#E8A020" />
                    </View>
                    <View style={styles.statusOptionTextWrap}>
                      <Text style={[styles.statusOptionTitle, { color: '#E8A020' }]}>Needs Revision</Text>
                      <Text style={styles.statusOptionSub}>Need to review concepts again</Text>
                    </View>
                    {modalTopic?.status === 'needs_revision' && <Check size={18} color="#E8A020" />}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.statusModalOption,
                      modalTopic?.status === 'not_started' && styles.statusModalOptionActiveDefault,
                    ]}
                    onPress={() => handleSelectStatusFromModal('not_started')}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.statusOptionIconCircle, { backgroundColor: '#F2F1EE' }]}>
                      <Minus size={16} color="#5C5C70" />
                    </View>
                    <View style={styles.statusOptionTextWrap}>
                      <Text style={[styles.statusOptionTitle, { color: '#5C5C70' }]}>Not Started</Text>
                      <Text style={styles.statusOptionSub}>Reset progress status</Text>
                    </View>
                    {modalTopic?.status === 'not_started' && <Check size={18} color="#5C5C70" />}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
  },
  chapterHeader: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#F2F1EE',
    backgroundColor: '#FFFFFF',
  },
  chapterHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F1EE',
    marginBottom: 12,
  },
  modalTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 15,
    color: '#17172A',
    flex: 1,
    marginRight: 12,
    fontWeight: '700',
  },
  modalCloseBtn: {
    padding: 4,
  },
  statusOptionsList: {
    gap: 8,
  },
  statusModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F2F1EE',
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  statusModalOptionActiveDone: {
    borderColor: '#B3F2E3',
    backgroundColor: '#F0FDF8',
  },
  statusModalOptionActiveProgress: {
    borderColor: '#D6D1F9',
    backgroundColor: '#F8F7FF',
  },
  statusModalOptionActiveRevision: {
    borderColor: '#FCE8C3',
    backgroundColor: '#FFFBF0',
  },
  statusModalOptionActiveDefault: {
    borderColor: '#E8E7E3',
    backgroundColor: '#F7F6F3',
  },
  statusOptionIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusOptionTextWrap: {
    flex: 1,
  },
  statusOptionTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    fontWeight: '600',
  },
  statusOptionSub: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#9B9BAF',
    marginTop: 2,
  },
  miniProgressContainer: {
    height: 3,
    backgroundColor: '#E8E7E3',
    borderRadius: 1.5,
    width: '100%',
    overflow: 'hidden',
  },
  miniProgressBarFill: {
    height: '100%',
    borderRadius: 1.5,
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
    borderWidth: 1,
    borderRadius: 12,
    minWidth: 32,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  statusSymbolText: {
    fontSize: 11,
    fontWeight: '600',
  },
  highlightTextMatched: {
    backgroundColor: '#FFEB3B',
    color: '#17172A',
    fontWeight: 'bold',
  },
});

export default ChapterRow;
