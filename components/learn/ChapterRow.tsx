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
import { ChevronRight, ChevronDown, Check, BookOpen, RotateCcw, Minus, X, Clock } from 'lucide-react-native';
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

// Map status to clean label
export const getStatusLabel = (status: SyllabusStatus): string => {
  switch (status) {
    case 'not_started':
      return 'To Do';
    case 'in_progress':
      return 'Studying';
    case 'done':
      return 'Completed';
    case 'needs_revision':
      return 'Revise';
    default:
      return 'To Do';
  }
};

// Map status to abbreviation indicators (backward compatibility)
export const getStatusSymbol = (status: SyllabusStatus): string => {
  switch (status) {
    case 'not_started':
      return 'To Do';
    case 'in_progress':
      return 'Studying';
    case 'done':
      return 'Done';
    case 'needs_revision':
      return 'Revise';
    default:
      return 'To Do';
  }
};

// Map status to colors
export const getStatusBgColor = (status: SyllabusStatus): string => {
  switch (status) {
    case 'not_started':
      return '#F3F3EE';
    case 'in_progress':
      return '#EEEDFA';
    case 'done':
      return '#E2F9F3';
    case 'needs_revision':
      return '#FEF3DC';
    default:
      return '#F3F3EE';
  }
};

export const getStatusTextColor = (status: SyllabusStatus): string => {
  switch (status) {
    case 'not_started':
      return '#717188';
    case 'in_progress':
      return '#5B4FE8';
    case 'done':
      return '#00B894';
    case 'needs_revision':
      return '#E8A020';
    default:
      return '#717188';
  }
};

export const getStatusBorderColor = (status: SyllabusStatus): string => {
  switch (status) {
    case 'not_started':
      return '#ECEBE6';
    case 'in_progress':
      return '#D6D1F9';
    case 'done':
      return '#B3F2E3';
    case 'needs_revision':
      return '#FCE8C3';
    default:
      return '#ECEBE6';
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
    if (Platform.OS === 'ios') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    onToggle();
  };

  const handleToggleDone = (topic: SyllabusTopic) => {
    if (isMultiSelectMode) {
      onToggleSelectTopic(topic.id);
      return;
    }
    const nextStatus: SyllabusStatus = topic.status === 'done' ? 'not_started' : 'done';
    if (nextStatus === 'done') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onTopicStatusChange(topic.id, nextStatus);
  };

  const handleStatusSelectorPress = (topic: SyllabusTopic) => {
    if (isMultiSelectMode) {
      onToggleSelectTopic(topic.id);
      return;
    }

    const options = ['Cancel', 'Mark Completed', 'In Progress', 'Needs Revision', 'Reset to Not Started'];
    const statusValues: SyllabusStatus[] = ['done', 'in_progress', 'needs_revision', 'not_started'];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 0,
          title: 'Topic Progress',
          message: `Update status for "${topic.topic}":`,
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
        style={[
          styles.chapterHeader,
          isExpanded && styles.chapterHeaderExpanded,
        ]}
        activeOpacity={0.7}
      >
        <View style={styles.chapterHeaderTop}>
          <View style={styles.leftRow}>
            <View style={[styles.chapterChevronWrap, isExpanded && styles.chapterChevronWrapExpanded]}>
              {isExpanded ? (
                <ChevronDown size={13} color="#5B4FE8" />
              ) : (
                <ChevronRight size={13} color="#717188" />
              )}
            </View>
            <HighlightText
              text={isCse ? `${chapter} (${totalCount} topics)` : chapter}
              query={searchQuery}
              style={[styles.chapterText, isExpanded && styles.chapterTextExpanded]}
            />
          </View>

          <View style={[styles.countBadge, doneCount === totalCount && totalCount > 0 && styles.countBadgeAllDone]}>
            {doneCount === totalCount && totalCount > 0 && (
              <Check size={11} color="#00B894" style={{ marginRight: 3 }} strokeWidth={2.5} />
            )}
            <Text
              style={[
                styles.countText,
                doneCount === totalCount && totalCount > 0 && styles.countTextAllDone,
              ]}
            >
              {`${doneCount}/${totalCount}`}
            </Text>
          </View>
        </View>

        {/* Clean progress bar - only shown when completionPercent > 0 */}
        {completionPercent > 0 && (
          <View style={styles.miniProgressTrack}>
            <View
              style={[
                styles.miniProgressFill,
                {
                  backgroundColor: subjectColor || '#5B4FE8',
                  width: `${completionPercent}%`,
                },
              ]}
            />
          </View>
        )}
      </TouchableOpacity>

      {/* Topics list */}
      {isExpanded && (
        <View style={styles.topicsList}>
          {topics.map((topic) => {
            const isSelected = selectedTopicIds.includes(topic.id);
            const isDone = topic.status === 'done';
            const isInProgress = topic.status === 'in_progress';
            const isRevision = topic.status === 'needs_revision';

            return (
              <View
                key={topic.id}
                style={[styles.topicRow, isSelected && styles.topicRowSelected]}
              >
                {/* Checkbox button (1-tap toggle done/not started or selection) */}
                <TouchableOpacity
                  style={[
                    styles.checkboxCircle,
                    isMultiSelectMode
                      ? isSelected
                        ? styles.checkboxCircleSelected
                        : styles.checkboxCircleSelectModeUnselected
                      : isDone
                      ? styles.checkboxCircleDone
                      : isInProgress
                      ? styles.checkboxCircleProgress
                      : isRevision
                      ? styles.checkboxCircleRevision
                      : null,
                  ]}
                  onPress={() => (isMultiSelectMode ? onToggleSelectTopic(topic.id) : handleToggleDone(topic))}
                  onLongPress={() => onLongPressTopic(topic.id)}
                  delayLongPress={800}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.7}
                  accessibilityLabel={`Mark ${topic.topic} ${isDone ? 'incomplete' : 'complete'}`}
                >
                  {isMultiSelectMode ? (
                    isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />
                  ) : (
                    <>
                      {isDone && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                      {isInProgress && <Clock size={11} color="#5B4FE8" strokeWidth={2.5} />}
                      {isRevision && <RotateCcw size={10} color="#E8A020" strokeWidth={2.5} />}
                    </>
                  )}
                </TouchableOpacity>

                {/* Topic Title */}
                <TouchableOpacity
                  style={styles.topicCenter}
                  onPress={() => (isMultiSelectMode ? onToggleSelectTopic(topic.id) : handleToggleDone(topic))}
                  onLongPress={() => onLongPressTopic(topic.id)}
                  delayLongPress={800}
                  activeOpacity={0.7}
                >
                  <HighlightText
                    text={topic.topic}
                    query={searchQuery}
                    style={[
                      styles.topicText,
                      isDone && styles.topicTextDone,
                      isSelected && styles.topicTextSelected,
                    ]}
                  />
                </TouchableOpacity>

                {/* Status indicator capsule: tap to open status selection sheet */}
                {!isMultiSelectMode && (
                  <TouchableOpacity
                    style={[
                      styles.statusPill,
                      isDone && styles.statusPillDone,
                      isInProgress && styles.statusPillProgress,
                      isRevision && styles.statusPillRevision,
                    ]}
                    onPress={() => handleStatusSelectorPress(topic)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    {isDone && <Check size={10} color="#00B894" style={{ marginRight: 3 }} strokeWidth={2.5} />}
                    {isInProgress && <Clock size={10} color="#5B4FE8" style={{ marginRight: 3 }} strokeWidth={2.5} />}
                    {isRevision && <RotateCcw size={10} color="#E8A020" style={{ marginRight: 3 }} strokeWidth={2.5} />}
                    <Text
                      style={[
                        styles.statusPillText,
                        isDone && styles.statusPillTextDone,
                        isInProgress && styles.statusPillTextProgress,
                        isRevision && styles.statusPillTextRevision,
                      ]}
                    >
                      {getStatusLabel(topic.status as SyllabusStatus)}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Status Picker Modal for Android */}
      <Modal
        visible={!!modalTopic}
        transparent
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
                      <Text style={[styles.statusOptionTitle, { color: '#00B894' }]}>Completed</Text>
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
                    <View style={[styles.statusOptionIconCircle, { backgroundColor: '#EEEDFA' }]}>
                      <Clock size={16} color="#5B4FE8" />
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
                    <View style={[styles.statusOptionIconCircle, { backgroundColor: '#F3F3EE' }]}>
                      <Minus size={16} color="#717188" />
                    </View>
                    <View style={styles.statusOptionTextWrap}>
                      <Text style={[styles.statusOptionTitle, { color: '#717188' }]}>Not Started</Text>
                      <Text style={styles.statusOptionSub}>Reset topic progress</Text>
                    </View>
                    {modalTopic?.status === 'not_started' && <Check size={18} color="#717188" />}
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
    borderTopColor: '#F0EFEA',
    backgroundColor: '#FFFFFF',
  },
  chapterHeaderExpanded: {
    backgroundColor: '#FAF9F6',
  },
  chapterHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  chapterChevronWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F3F3EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  chapterChevronWrapExpanded: {
    backgroundColor: '#EEEDFA',
  },
  chapterText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13.5,
    color: '#17172A',
    fontWeight: '600',
    flex: 1,
  },
  chapterTextExpanded: {
    color: '#17172A',
    fontWeight: '700',
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F3EE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  countBadgeAllDone: {
    backgroundColor: '#E2F9F3',
  },
  countText: {
    fontFamily: 'DMMono-Medium',
    fontSize: 11,
    color: '#717188',
    fontWeight: '600',
  },
  countTextAllDone: {
    color: '#00B894',
    fontWeight: '700',
  },
  miniProgressTrack: {
    height: 3,
    backgroundColor: '#EAE9E4',
    borderRadius: 1.5,
    width: '100%',
    overflow: 'hidden',
    marginTop: 8,
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  topicsList: {
    backgroundColor: '#FCFCFA',
    paddingVertical: 2,
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingLeft: 18,
    paddingRight: 16,
    borderTopWidth: 1,
    borderTopColor: '#F5F4EE',
    minHeight: 46,
  },
  topicRowSelected: {
    backgroundColor: '#EEEDFA40',
  },
  checkboxCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#C7C6BF',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxCircleDone: {
    backgroundColor: '#00B894',
    borderColor: '#00B894',
  },
  checkboxCircleProgress: {
    backgroundColor: '#EEEDFA',
    borderColor: '#5B4FE8',
  },
  checkboxCircleRevision: {
    backgroundColor: '#FEF3DC',
    borderColor: '#E8A020',
  },
  checkboxCircleSelected: {
    backgroundColor: '#5B4FE8',
    borderColor: '#5B4FE8',
  },
  checkboxCircleSelectModeUnselected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#5B4FE8',
    borderWidth: 2,
  },
  topicCenter: {
    flex: 1,
    marginRight: 10,
  },
  topicText: {
    fontFamily: 'DMSans',
    fontSize: 13,
    color: '#17172A',
    lineHeight: 18,
  },
  topicTextDone: {
    color: '#9B9BAF',
    textDecorationLine: 'line-through',
  },
  topicTextSelected: {
    fontWeight: '600',
    color: '#5B4FE8',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F3EE',
    borderWidth: 1,
    borderColor: '#ECEBE6',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusPillDone: {
    backgroundColor: '#E2F9F3',
    borderColor: '#B3F2E3',
  },
  statusPillProgress: {
    backgroundColor: '#EEEDFA',
    borderColor: '#D6D1F9',
  },
  statusPillRevision: {
    backgroundColor: '#FEF3DC',
    borderColor: '#FCE8C3',
  },
  statusPillText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10.5,
    fontWeight: '600',
    color: '#717188',
  },
  statusPillTextDone: {
    color: '#00B894',
    fontWeight: '700',
  },
  statusPillTextProgress: {
    color: '#5B4FE8',
    fontWeight: '700',
  },
  statusPillTextRevision: {
    color: '#E8A020',
    fontWeight: '700',
  },
  highlightTextMatched: {
    backgroundColor: '#FFE57F',
    color: '#17172A',
    fontWeight: 'bold',
    borderRadius: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 14, 23, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#17172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#ECEBE6',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F1ED',
  },
  modalTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 15,
    fontWeight: '700',
    color: '#17172A',
    flex: 1,
    marginRight: 12,
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
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#ECEBE6',
    backgroundColor: '#FAFAF8',
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
    borderColor: '#ECEBE6',
    backgroundColor: '#F5F4EE',
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
    fontFamily: 'DMSans-Bold',
    fontSize: 13.5,
    fontWeight: '700',
  },
  statusOptionSub: {
    fontFamily: 'DMSans',
    fontSize: 11.5,
    color: '#717188',
    marginTop: 1,
  },
});

export default ChapterRow;
