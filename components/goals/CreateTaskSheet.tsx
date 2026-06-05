import React, { useState, useCallback, useImperativeHandle, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  ScrollView,
  Platform,
} from 'react-native';
import BottomSheet, {
  BottomSheetView,
  BottomSheetTextInput,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Milestone, TaskPriority } from '@/types/app.types';
import { useCreateTask } from '@/lib/hooks/use-tasks';
import { formatDeadline } from '@/lib/utils/date';

// Constants
const LABEL_TITLE = "Task Title";
const INPUT_PLACEHOLDER = "What needs to be done?";
const LABEL_SUBJECT = "Subject";
const LABEL_PRIORITY = "Priority";
const LABEL_DUE_DATE = "Due Date";
const LABEL_MILESTONE = "Link to Milestone (Optional)";
const BTN_SUBMIT = "Add Task";

const SUBJECTS = ['Physics', 'Chemistry', 'Biology', 'Math', 'Other'];
const PRIORITIES: { val: TaskPriority; label: string; color: string }[] = [
  { val: 'urgent', label: 'Urgent', color: '#E85858' },
  { val: 'important', label: 'Important', color: '#E8A020' },
  { val: 'normal', label: 'Normal', color: '#9B9BAF' },
];

const BORDER_COLOR = '#E8E7E3';

interface CreateTaskSheetProps {
  milestones: Milestone[];
  defaultMilestoneId?: string | null;
  onSuccess: () => void;
}

export const CreateTaskSheet = React.forwardRef<BottomSheet, CreateTaskSheetProps>(
  ({ milestones, defaultMilestoneId, onSuccess }, ref) => {
    const createTaskMutation = useCreateTask();

    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState<string>('Other');
    const [priority, setPriority] = useState<TaskPriority>('normal');
    const [dueDate, setDueDate] = useState<Date | null>(null);
    const [milestoneId, setMilestoneId] = useState<string | null>(null);

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showMilestoneDropdown, setShowMilestoneDropdown] = useState(false);

    // Sync default milestone id if passed
    useEffect(() => {
      if (defaultMilestoneId) {
        setMilestoneId(defaultMilestoneId);
      } else {
        setMilestoneId(null);
      }
    }, [defaultMilestoneId]);

    // Expose ref control
    const sheetRef = React.useRef<BottomSheet>(null);
    useImperativeHandle(ref, () => sheetRef.current as BottomSheet);

    const handleCreate = () => {
      if (!title.trim()) return;

      const formattedDueDate = dueDate ? dueDate.toISOString().split('T')[0] : null;

      createTaskMutation.mutate(
        {
          title: title.trim(),
          subject: subject === 'Other' ? null : subject,
          priority,
          due_date: formattedDueDate,
          milestone_id: milestoneId,
          completed_at: null,
          is_recurring: false,
          recur_days: null,
        },
        {
          onSuccess: () => {
            // Reset state
            setTitle('');
            setSubject('Other');
            setPriority('normal');
            setDueDate(null);
            setMilestoneId(null);
            setShowMilestoneDropdown(false);
            Keyboard.dismiss();
            onSuccess();
          },
        }
      );
    };

    const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
      setShowDatePicker(false);
      if (selectedDate) {
        setDueDate(selectedDate);
      }
    };

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
        />
      ),
      []
    );

    const selectedMilestone = milestones.find((m) => m.id === milestoneId);

    return (
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={['75%']}
        enablePanDownToClose={true}
        backdropComponent={renderBackdrop}
        keyboardBehavior="interactive"
      >
        <ScrollView contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
          <Text style={styles.sheetHeader}>New Task</Text>

          {/* Title input */}
          <Text style={styles.fieldLabel}>{LABEL_TITLE}</Text>
          <BottomSheetTextInput
            style={styles.textInput}
            placeholder={INPUT_PLACEHOLDER}
            placeholderTextColor="#9B9BAF"
            value={title}
            onChangeText={setTitle}
          />

          {/* Subject Selector */}
          <Text style={styles.fieldLabel}>{LABEL_SUBJECT}</Text>
          <View style={styles.subjectsRow}>
            {SUBJECTS.map((sub) => {
              const active = subject === sub;
              return (
                <TouchableOpacity
                  key={sub}
                  style={[styles.subjectChip, active && styles.subjectChipActive]}
                  onPress={() => setSubject(sub)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.subjectChipText,
                      active && styles.subjectChipTextActive,
                    ]}
                  >
                    {sub}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Priority Selector */}
          <Text style={styles.fieldLabel}>{LABEL_PRIORITY}</Text>
          <View style={styles.prioritiesRow}>
            {PRIORITIES.map((p) => {
              const active = priority === p.val;
              return (
                <TouchableOpacity
                  key={p.val}
                  style={[
                    styles.priorityChip,
                    active && { borderColor: p.color, backgroundColor: `${p.color}15` },
                  ]}
                  onPress={() => setPriority(p.val)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.priorityDot, { backgroundColor: p.color }]} />
                  <Text
                    style={[
                      styles.priorityChipText,
                      active && { color: p.color, fontWeight: '600' },
                    ]}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Due date picker */}
          <Text style={styles.fieldLabel}>{LABEL_DUE_DATE}</Text>
          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.datePickerText}>
              {dueDate ? formatDeadline(dueDate.toISOString()) : "Select due date (Optional)"}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={dueDate || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}

          {/* Milestone dropdown */}
          <Text style={styles.fieldLabel}>{LABEL_MILESTONE}</Text>
          <TouchableOpacity
            style={styles.dropdownTrigger}
            onPress={() => setShowMilestoneDropdown(!showMilestoneDropdown)}
            activeOpacity={0.7}
          >
            <Text style={styles.dropdownTriggerText} numberOfLines={1}>
              {selectedMilestone ? selectedMilestone.title : "Not linked to milestone"}
            </Text>
            <Text style={styles.dropdownArrow}>{showMilestoneDropdown ? "▲" : "▼"}</Text>
          </TouchableOpacity>

          {showMilestoneDropdown && (
            <View style={styles.dropdownList}>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setMilestoneId(null);
                  setShowMilestoneDropdown(false);
                }}
              >
                <Text style={styles.dropdownItemText}>None (Standalone)</Text>
              </TouchableOpacity>
              {milestones.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[
                    styles.dropdownItem,
                    milestoneId === m.id && styles.dropdownItemActive,
                  ]}
                  onPress={() => {
                    setMilestoneId(m.id);
                    setShowMilestoneDropdown(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      milestoneId === m.id && styles.dropdownItemTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {m.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Submit button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!title.trim() || createTaskMutation.isPending) && styles.submitButtonDisabled,
            ]}
            onPress={handleCreate}
            disabled={!title.trim() || createTaskMutation.isPending}
            activeOpacity={0.8}
          >
            {createTaskMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>{BTN_SUBMIT}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </BottomSheet>
    );
  }
);

CreateTaskSheet.displayName = 'CreateTaskSheet';

const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 60,
  },
  sheetHeader: {
    fontFamily: 'InstrumentSerif',
    fontSize: 26,
    color: '#17172A',
    marginBottom: 20,
  },
  fieldLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    fontWeight: '600',
    color: '#9B9BAF',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    backgroundColor: '#F7F6F3',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: 14,
    fontFamily: 'DMSans',
    fontSize: 15,
    color: '#17172A',
    height: 48,
  },
  subjectsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  subjectChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    backgroundColor: '#FFFFFF',
  },
  subjectChipActive: {
    borderColor: '#5B4FE8',
    backgroundColor: '#EAE8FD',
  },
  subjectChipText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: '#5C5C70',
  },
  subjectChipTextActive: {
    color: '#5B4FE8',
    fontWeight: '600',
  },
  prioritiesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  priorityChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    backgroundColor: '#FFFFFF',
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  priorityChipText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: '#5C5C70',
  },
  datePickerButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: 14,
    height: 48,
    justifyContent: 'center',
  },
  datePickerText: {
    fontFamily: 'DMSans',
    fontSize: 14,
    color: '#17172A',
  },
  dropdownTrigger: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    paddingHorizontal: 14,
    height: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownTriggerText: {
    fontFamily: 'DMSans',
    fontSize: 14,
    color: '#17172A',
    flex: 1,
    marginRight: 10,
  },
  dropdownArrow: {
    fontSize: 10,
    color: '#9B9BAF',
  },
  dropdownList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    marginTop: 6,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F7F6F3',
  },
  dropdownItemActive: {
    backgroundColor: '#EAE8FD',
  },
  dropdownItemText: {
    fontFamily: 'DMSans',
    fontSize: 13,
    color: '#5C5C70',
  },
  dropdownItemTextActive: {
    color: '#5B4FE8',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#5B4FE8',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginTop: 32,
    shadowColor: '#5B4FE8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  submitButtonDisabled: {
    backgroundColor: '#9B9BAF',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    fontWeight: '600',
  },
});
