import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import BottomSheet, {
  BottomSheetTextInput,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { COLORS, TYPOGRAPHY } from '@/constants/theme';
import { useCreateTask } from '@/lib/hooks/use-tasks';
import { getTodayLocal } from '@/lib/utils/date';
import * as Haptics from 'expo-haptics';
import { TaskPriority } from '@/types/app.types';
import { SubjectPicker } from '@/components/shared/SubjectPicker';

interface QuickAddTaskSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const SUBJECT_OPTIONS = [
  { label: '📚 Study', value: 'Study' },
  { label: '💼 Work', value: 'Work' },
  { label: '🏃 Personal', value: 'Personal' },
  { label: '🎯 Goal', value: 'Goal' },
  { label: 'Other', value: 'Other' },
];

const PRIORITY_OPTIONS = [
  { label: 'Urgent 🔴', value: 'urgent' },
  { label: 'Important 🟡', value: 'important' },
  { label: 'Normal', value: 'normal' },
];

export const QuickAddTaskSheet: React.FC<QuickAddTaskSheetProps> = ({
  isVisible,
  onClose,
  onSuccess,
}) => {
  const sheetRef = useRef<BottomSheet>(null);
  const createTaskMutation = useCreateTask();

  const [title, setTitle] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<'urgent' | 'important' | 'normal'>('normal');

  useEffect(() => {
    if (isVisible) {
      sheetRef.current?.expand();
      setTitle('');
      setSelectedSubject(null);
      setSelectedPriority('normal');
    } else {
      sheetRef.current?.close();
    }
  }, [isVisible]);

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
      }
    },
    [onClose]
  );

  const handleAddTask = () => {
    if (!title.trim()) return;

    createTaskMutation.mutate(
      {
        title: title.trim(),
        subject: selectedSubject,
        priority: selectedPriority,
        due_date: getTodayLocal(),
        completed_at: null,
        is_recurring: false,
        recur_days: null,
        milestone_id: null,
      },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          Keyboard.dismiss();
          onClose();
          if (onSuccess) {
            onSuccess();
          }
        },
      }
    );
  };

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    []
  );

  const isSaving = createTaskMutation.isPending;

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={['50%']}
      enablePanDownToClose={true}
      backdropComponent={renderBackdrop}
      onChange={handleSheetChange}
      keyboardBehavior="interactive"
    >
      <BottomSheetScrollView contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.sheetHeader}>Quick Add Task</Text>

        {/* Task Title */}
        <BottomSheetTextInput
          style={styles.textInput}
          placeholder="What do you need to do?"
          placeholderTextColor="#9B9BAF"
          value={title}
          onChangeText={setTitle}
          maxLength={100}
          autoFocus={isVisible}
        />

        {/* Subject Select */}
        <Text style={styles.sectionLabel}>Subject (Optional)</Text>
        <SubjectPicker
          selectedSubject={selectedSubject}
          onSelect={(s) => {
            setSelectedSubject(s);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          }}
          placeholder="Select subject..."
        />

        {/* Priority Select */}
        <Text style={styles.sectionLabel}>Priority</Text>
        <View style={styles.pillsRow}>
          {PRIORITY_OPTIONS.map((opt) => {
            const isSelected = selectedPriority === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.pill, isSelected && styles.pillSelected]}
                onPress={() => {
                  setSelectedPriority(opt.value as TaskPriority);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.addButton, (!title.trim() || isSaving) && styles.addButtonDisabled]}
          onPress={handleAddTask}
          disabled={!title.trim() || isSaving}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.addButtonText}>Add Task</Text>
          )}
        </TouchableOpacity>
      </BottomSheetScrollView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  sheetContent: {
    flex: 1,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sheetHeader: {
    fontFamily: TYPOGRAPHY.fonts.display,
    fontSize: 22,
    color: COLORS.navy,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  textInput: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 16,
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    backgroundColor: COLORS.surface,
    color: COLORS.t1,
    marginBottom: 16,
  },
  sectionLabel: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 13,
    color: COLORS.t2,
    fontWeight: '600',
    marginBottom: 8,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F5F5F7',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pillSelected: {
    backgroundColor: COLORS.violetSoft,
    borderColor: COLORS.violet,
  },
  pillText: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 12,
    color: COLORS.t2,
  },
  pillTextSelected: {
    color: COLORS.violet,
    fontWeight: '600',
  },
  addButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.violet,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  addButtonDisabled: {
    backgroundColor: COLORS.border,
    opacity: 0.5,
  },
  addButtonText: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
