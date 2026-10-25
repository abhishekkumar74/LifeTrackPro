import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { X, Sparkles, Check, HelpCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { getSubjectColor } from '@/lib/utils/subject-colors';

interface CreateFlashcardModalProps {
  visible: boolean;
  onClose: () => void;
  subjects: string[];
  initialSubject?: string;
  onSave: (payload: { front: string; back: string; subject: string }) => Promise<any>;
}

export const CreateFlashcardModal: React.FC<CreateFlashcardModalProps> = ({
  visible,
  onClose,
  subjects,
  initialSubject,
  onSave,
}) => {
  const [selectedSubject, setSelectedSubject] = useState<string>('General');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      if (initialSubject && subjects.includes(initialSubject)) {
        setSelectedSubject(initialSubject);
      } else if (subjects.length > 0) {
        setSelectedSubject(subjects[0]);
      } else {
        setSelectedSubject('General');
      }
      setFront('');
      setBack('');
      setIsSubmitting(false);
    }
  }, [visible, initialSubject, subjects]);

  const handleSave = async () => {
    const trimmedFront = front.trim();
    const trimmedBack = back.trim();

    if (!trimmedFront) {
      Alert.alert('Missing Question', 'Please enter a question or prompt for the Front of the card.');
      return;
    }
    if (!trimmedBack) {
      Alert.alert('Missing Answer', 'Please enter the answer or explanation for the Back of the card.');
      return;
    }

    try {
      setIsSubmitting(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await onSave({
        front: trimmedFront,
        back: trimmedBack,
        subject: selectedSubject || 'General',
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save flashcard. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeColor = getSubjectColor(selectedSubject);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.modalCardWrap}
            >
              <View style={styles.modalCard}>
                {/* Header */}
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderTitleWrap}>
                    <View style={styles.sparkleIcon}>
                      <Sparkles size={18} color="#5B4FE8" />
                    </View>
                    <View>
                      <Text style={styles.modalTitle}>New Flashcard</Text>
                      <Text style={styles.modalSubtitle}>Create an active recall card</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <X size={20} color="#5C5C70" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.scrollArea}
                  contentContainerStyle={styles.scrollContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Subject selector chips */}
                  <View style={styles.sectionWrap}>
                    <Text style={styles.fieldLabel}>SUBJECT</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.subjectChipsRow}
                    >
                      {subjects.map((sub) => {
                        const isSelected = selectedSubject === sub;
                        const subColor = getSubjectColor(sub);
                        return (
                          <TouchableOpacity
                            key={sub}
                            style={[
                              styles.subjectChip,
                              isSelected && {
                                borderColor: subColor,
                                backgroundColor: `${subColor}15`,
                              },
                            ]}
                            onPress={() => setSelectedSubject(sub)}
                            activeOpacity={0.7}
                          >
                            <View
                              style={[
                                styles.chipDot,
                                { backgroundColor: subColor },
                              ]}
                            />
                            <Text
                              style={[
                                styles.chipText,
                                isSelected && { color: subColor, fontWeight: '700' },
                              ]}
                            >
                              {sub}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* Front Side Input */}
                  <View style={styles.sectionWrap}>
                    <View style={styles.labelWithBadge}>
                      <Text style={styles.fieldLabel}>FRONT (QUESTION / PROMPT)</Text>
                      <View style={[styles.sideBadge, { backgroundColor: '#F0EFFF' }]}>
                        <Text style={[styles.sideBadgeText, { color: '#5B4FE8' }]}>Card Front</Text>
                      </View>
                    </View>
                    <TextInput
                      style={styles.textArea}
                      placeholder="e.g. What is the First Law of Thermodynamics?"
                      placeholderTextColor="#9B9BAF"
                      value={front}
                      onChangeText={setFront}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>

                  {/* Back Side Input */}
                  <View style={styles.sectionWrap}>
                    <View style={styles.labelWithBadge}>
                      <Text style={styles.fieldLabel}>BACK (ANSWER / FORMULA / EXPLANATION)</Text>
                      <View style={[styles.sideBadge, { backgroundColor: '#E2F9F3' }]}>
                        <Text style={[styles.sideBadgeText, { color: '#00B894' }]}>Card Back</Text>
                      </View>
                    </View>
                    <TextInput
                      style={[styles.textArea, styles.textAreaBack]}
                      placeholder="e.g. ΔU = Q - W (Change in internal energy equals heat added minus work done by system)"
                      placeholderTextColor="#9B9BAF"
                      value={back}
                      onChangeText={setBack}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  </View>

                  {/* Pro-Tip Box */}
                  <View style={styles.proTipBox}>
                    <HelpCircle size={15} color="#5B4FE8" style={{ marginTop: 1 }} />
                    <Text style={styles.proTipText}>
                      <Text style={{ fontWeight: '600' }}>Study Tip: </Text>
                      Keep questions bite-sized and answers clear. When you test yourself, active recall strengthens memory retention up to 3x faster!
                    </Text>
                  </View>
                </ScrollView>

                {/* Footer buttons */}
                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={onClose}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.submitBtn, { backgroundColor: activeColor }]}
                    onPress={handleSave}
                    disabled={isSubmitting}
                    activeOpacity={0.8}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Check size={16} color="#FFFFFF" />
                        <Text style={styles.submitBtnText}>Save Card</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalCardWrap: {
    width: '100%',
    maxHeight: '90%',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F1EE',
  },
  modalHeaderTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sparkleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0EFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 17,
    color: '#17172A',
    fontWeight: '700',
  },
  modalSubtitle: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#9B9BAF',
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F7F6F3',
  },
  scrollArea: {
    maxHeight: 460,
  },
  scrollContent: {
    paddingVertical: 14,
    gap: 16,
  },
  sectionWrap: {
    gap: 8,
  },
  fieldLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    color: '#5C5C70',
    letterSpacing: 0.8,
    fontWeight: '600',
  },
  labelWithBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sideBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sideBadgeText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    fontWeight: '600',
  },
  subjectChipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  subjectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    backgroundColor: '#FAF9F6',
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#5C5C70',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#E8E7E3',
    borderRadius: 12,
    backgroundColor: '#FAF9F6',
    padding: 12,
    fontSize: 14,
    fontFamily: 'DMSans',
    color: '#17172A',
    minHeight: 75,
    lineHeight: 20,
  },
  textAreaBack: {
    minHeight: 95,
  },
  proTipBox: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F9F8FE',
    borderWidth: 1,
    borderColor: '#ECE9FD',
    alignItems: 'flex-start',
  },
  proTipText: {
    flex: 1,
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#5B4FE8',
    lineHeight: 18,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F2F1EE',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F7F6F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: '#5C5C70',
    fontWeight: '600',
  },
  submitBtn: {
    flex: 2,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#5B4FE8',
  },
  submitBtnText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
